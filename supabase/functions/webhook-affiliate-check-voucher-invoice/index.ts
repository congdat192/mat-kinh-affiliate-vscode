import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
console.info('Webhook affiliate check voucher invoice started - v15 (Support lock_period_hours + lock_period_minutes)');
// ============================================
// HELPER FUNCTIONS
// ============================================
function getVietnamTime() {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 7 * 3600000);
}
function convertToVietnamTZ(kiotDateString: string | null) {
  if (!kiotDateString) return null;
  const cleanDate = kiotDateString.split('.')[0];
  return `${cleanDate}+07:00`;
}
function getVoucherFromPayments(payments: any[]) {
  if (!payments || !Array.isArray(payments)) return null;
  for (const payment of payments) {
    if (payment.voucherCode) {
      console.log(`[Affiliate] Found voucher in payment: ${payment.voucherCode}`);
      return payment.voucherCode;
    }
  }
  return null;
}
function normalizePhone(phone: string) {
  if (!phone) return '';
  let normalized = phone.replace(/[\s\-\.]/g, '');
  if (normalized.startsWith('+84')) {
    normalized = '0' + normalized.slice(3);
  } else if (normalized.startsWith('84') && normalized.length > 9) {
    normalized = '0' + normalized.slice(2);
  }
  return normalized;
}

// ============================================
// GET LOCK PERIOD SETTINGS (v15: support hours + minutes)
// ============================================
interface LockPeriodSettings {
  lock_period_days: number;
  lock_period_hours: number;
  lock_period_minutes: number;
}

async function getLockPeriodSettings(supabase: any): Promise<LockPeriodSettings> {
  try {
    const { data, error } = await supabase
      .from('lock_payment_settings')
      .select('lock_period_days, lock_period_hours, lock_period_minutes')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log('[Lock Settings] ⚠️ Using default: 0 days, 24 hours, 0 minutes');
      return { lock_period_days: 0, lock_period_hours: 24, lock_period_minutes: 0 };
    }

    // Use nullish coalescing for proper default handling
    const settings: LockPeriodSettings = {
      lock_period_days: data.lock_period_days ?? 0,
      lock_period_hours: data.lock_period_hours ?? 24,
      lock_period_minutes: data.lock_period_minutes ?? 0
    };

    console.log(`[Lock Settings] ✅ days=${settings.lock_period_days}, hours=${settings.lock_period_hours}, minutes=${settings.lock_period_minutes}`);
    return settings;
  } catch (e) {
    console.error('[Lock Settings] ❌ Error fetching settings:', e);
    return { lock_period_days: 0, lock_period_hours: 24, lock_period_minutes: 0 };
  }
}

// ============================================
// CALCULATE LOCK DATE (v15: support hours + minutes)
// ============================================
function calculateLockDate(qualifiedAt: Date, settings: LockPeriodSettings): Date {
  const lockDate = new Date(qualifiedAt);

  // Add days
  if (settings.lock_period_days > 0) {
    lockDate.setDate(lockDate.getDate() + settings.lock_period_days);
  }

  // Add hours
  if (settings.lock_period_hours > 0) {
    lockDate.setHours(lockDate.getHours() + settings.lock_period_hours);
  }

  // Add minutes
  if (settings.lock_period_minutes > 0) {
    lockDate.setMinutes(lockDate.getMinutes() + settings.lock_period_minutes);
  }

  return lockDate;
}

// Helper to format lock period for display
function formatLockPeriod(settings: LockPeriodSettings): string {
  const parts: string[] = [];
  if (settings.lock_period_days > 0) parts.push(`${settings.lock_period_days} ngày`);
  if (settings.lock_period_hours > 0) parts.push(`${settings.lock_period_hours} giờ`);
  if (settings.lock_period_minutes > 0) parts.push(`${settings.lock_period_minutes} phút`);
  return parts.length > 0 ? parts.join(' ') : '0 phút';
}
// ============================================
// RECALCULATE F0 TIER
// ============================================
async function recalculateF0Tier(supabase: any, f0Id: string, f0Code: string) {
  console.log(`[Tier] 🔄 Recalculating tier for F0: ${f0Code}`);

  try {
    // Step 1: Get all tiers ordered by level (highest first)
    const { data: tiers, error: tiersError } = await supabase
      .from('f0_tiers')
      .select('*')
      .eq('is_active', true)
      .order('tier_level', { ascending: false });

    if (tiersError || !tiers || tiers.length === 0) {
      console.error('[Tier] ❌ Error fetching tiers:', tiersError?.message);
      return null;
    }

    // Step 2: Calculate F0's current stats from commission_records
    // Only count commissions that are LOCKED or PAID (not pending - pending don't count for EXP)
    const { data: stats, error: statsError } = await supabase
      .from('commission_records')
      .select('id, invoice_amount, f1_customer_id')
      .eq('f0_id', f0Id)
      .in('status', ['locked', 'paid']);

    if (statsError) {
      console.error('[Tier] ❌ Error fetching commission stats:', statsError.message);
      return null;
    }

    // Calculate metrics
    const totalOrders = stats?.length || 0;
    const totalRevenue = stats?.reduce((sum: number, r: any) => sum + Number(r.invoice_amount || 0), 0) || 0;
    // Count unique F1 customers
    const uniqueF1s = new Set(stats?.map((r: any) => r.f1_customer_id).filter(Boolean));
    const totalReferrals = uniqueF1s.size;

    console.log(`[Tier] 📊 F0 Stats:`);
    console.log(`[Tier]    Total Orders: ${totalOrders}`);
    console.log(`[Tier]    Total Revenue: ${totalRevenue.toLocaleString()}đ`);
    console.log(`[Tier]    Total Referrals (unique F1): ${totalReferrals}`);

    // Step 3: Determine new tier (highest tier that meets all requirements)
    let newTier = tiers[tiers.length - 1]; // Default to lowest tier (BRONZE)

    for (const tier of tiers) {
      const req = tier.requirements || {};
      const minReferrals = req.min_referrals || 0;
      const minRevenue = req.min_revenue || 0;
      const minOrders = req.min_orders || 0;

      const meetsReferrals = totalReferrals >= minReferrals;
      const meetsRevenue = totalRevenue >= minRevenue;
      const meetsOrders = totalOrders >= minOrders;

      console.log(`[Tier] Checking ${tier.tier_code}: referrals(${totalReferrals}>=${minReferrals}:${meetsReferrals}), revenue(${totalRevenue}>=${minRevenue}:${meetsRevenue}), orders(${totalOrders}>=${minOrders}:${meetsOrders})`);

      if (meetsReferrals && meetsRevenue && meetsOrders) {
        newTier = tier;
        console.log(`[Tier] ✅ Qualifies for ${tier.tier_code}!`);
        break; // Found highest qualifying tier
      }
    }

    // Step 4: Get current tier
    const { data: f0Partner, error: f0Error } = await supabase
      .from('f0_partners')
      .select('current_tier')
      .eq('id', f0Id)
      .single();

    if (f0Error) {
      console.error('[Tier] ❌ Error fetching F0 partner:', f0Error.message);
      return null;
    }

    const currentTier = f0Partner?.current_tier || 'BRONZE';

    // Step 5: Update if tier changed
    if (currentTier !== newTier.tier_code) {
      console.log(`[Tier] 🎉 TIER UPGRADE: ${currentTier} → ${newTier.tier_code}`);

      const { error: updateError } = await supabase
        .from('f0_partners')
        .update({
          current_tier: newTier.tier_code,
          updated_at: getVietnamTime().toISOString()
        })
        .eq('id', f0Id);

      if (updateError) {
        console.error('[Tier] ❌ Error updating tier:', updateError.message);
        return null;
      }

      // Create notification for tier upgrade
      if (newTier.tier_level > (tiers.find((t: any) => t.tier_code === currentTier)?.tier_level || 1)) {
        await supabase.from('notifications').insert({
          f0_id: f0Id,
          type: 'system',
          content: {
            title: '🎉 Chúc mừng! Bạn đã lên hạng!',
            message: `Bạn đã đạt thứ hạng ${newTier.tier_name} (${newTier.tier_code})! Hưởng thêm ${newTier.benefits?.commission_bonus_percent || 0}% bonus hoa hồng.`,
            old_tier: currentTier,
            new_tier: newTier.tier_code,
            new_tier_name: newTier.tier_name,
            bonus_percent: newTier.benefits?.commission_bonus_percent || 0
          },
          is_read: false
        });
        console.log('[Tier] ✅ Tier upgrade notification sent!');
      }

      return { upgraded: true, oldTier: currentTier, newTier: newTier.tier_code };
    } else {
      console.log(`[Tier] ℹ️ Tier unchanged: ${currentTier}`);
      return { upgraded: false, currentTier };
    }
  } catch (error: any) {
    console.error('[Tier] ❌ Error in recalculateF0Tier:', error.message);
    return null;
  }
}

// ============================================
// HANDLE INVOICE CANCELLATION
// ============================================
async function handleInvoiceCancellation(supabase: any, invoiceCode: string, invoiceId: number) {
  console.log(`[Cancellation] 🔄 Processing invoice cancellation: ${invoiceCode}`);
  const now = getVietnamTime().toISOString();

  // Step 1: Find commission record for this invoice
  const { data: commission, error: commError } = await supabase
    .from('commission_records')
    .select('*')
    .eq('invoice_code', invoiceCode)
    .maybeSingle();

  if (commError) {
    console.error('[Cancellation] Error finding commission:', commError.message);
    return { processed: false, error: commError.message };
  }

  if (!commission) {
    console.log('[Cancellation] ℹ️ No commission record found for this invoice');

    // Still update voucher_affiliate_tracking if exists
    const { data: voucher } = await supabase
      .from('voucher_affiliate_tracking')
      .select('code')
      .eq('invoice_id', invoiceId)
      .maybeSingle();

    if (voucher) {
      await supabase.from('voucher_affiliate_tracking').update({
        invoice_status: 'Đã hủy',
        commission_status: 'invalid',
        invalid_reason_code: 'INVOICE_CANCELLED',
        invalid_reason_text: `Hóa đơn ${invoiceCode} đã bị hủy`,
        updated_at: now
      }).eq('code', voucher.code);
      console.log('[Cancellation] ✅ Updated voucher_affiliate_tracking');
    }

    return { processed: true, action: 'NO_COMMISSION_FOUND' };
  }

  console.log(`[Cancellation] Found commission record: ${commission.id}`);
  console.log(`[Cancellation]    Status: ${commission.status}`);
  console.log(`[Cancellation]    Paid at: ${commission.paid_at}`);
  console.log(`[Cancellation]    Total: ${commission.total_commission}`);

  // Step 2: Check commission status - NEW LOCK SYSTEM
  // pending: Chưa chốt → BỊ HỦY
  // locked/paid: Đã chốt → GIỮ NGUYÊN
  const isPending = commission.status === 'pending';
  const isLockedOrPaid = commission.status === 'locked' || commission.status === 'paid';
  const wasPaid = commission.status === 'paid' && commission.paid_at != null;

  // Step 3: Check if F1 has other valid orders (for F1 count adjustment)
  const { data: otherOrders, error: otherError } = await supabase
    .from('commission_records')
    .select('id')
    .eq('f1_customer_id', commission.f1_customer_id)
    .eq('f0_id', commission.f0_id)
    .neq('id', commission.id)
    .is('invoice_cancelled_at', null)
    .neq('status', 'cancelled');

  const f1WasUnique = !otherOrders || otherOrders.length === 0;
  const f1Adjustment = f1WasUnique ? -1 : 0;

  console.log(`[Cancellation] F1 unique (no other orders): ${f1WasUnique}`);
  console.log(`[Cancellation] isPending: ${isPending}, isLockedOrPaid: ${isLockedOrPaid}`);

  // ============================================
  // NEW LOCK SYSTEM: 3 scenarios
  // A: PAID → Keep commission (already paid out)
  // B: LOCKED → Keep commission (already locked, EXP counted)
  // C: PENDING → Cancel commission (not yet locked)
  // ============================================

  if (wasPaid) {
    // ============================================
    // SCENARIO A: Commission was PAID - KEEP commission, adjust stats only
    // ============================================
    console.log('[Cancellation] 💰 Commission was PAID - Keeping commission, adjusting stats...');

    // Update commission_records (keep status as paid)
    await supabase.from('commission_records').update({
      invoice_cancelled_at: now,
      invoice_cancelled_after_paid: true,
      stats_adjusted: true,
      stats_adjusted_at: now,
      updated_at: now
    }).eq('id', commission.id);

    // Create audit log
    await supabase.from('commission_audit_log').insert({
      commission_record_id: commission.id,
      voucher_code: commission.voucher_code,
      invoice_code: commission.invoice_code,
      f0_id: commission.f0_id,
      f0_code: commission.f0_code,
      event_type: 'INVOICE_CANCELLED_AFTER_PAID',
      event_source: 'webhook',
      before_data: {
        status: 'paid',
        invoice_cancelled_at: null
      },
      after_data: {
        status: 'paid', // Kept
        invoice_cancelled_at: now,
        invoice_cancelled_after_paid: true,
        f1_adjustment: f1Adjustment,
        revenue_adjustment: -Number(commission.invoice_amount)
      },
      notes: `Hóa đơn ${invoiceCode} bị hủy. Hoa hồng ${Number(commission.total_commission).toLocaleString()}đ ĐÃ PAID - GIỮ NGUYÊN.`
    });

    // Create stats adjustment
    await supabase.from('f0_stats_adjustments').insert({
      f0_id: commission.f0_id,
      f0_code: commission.f0_code,
      commission_record_id: commission.id,
      voucher_code: commission.voucher_code,
      invoice_code: commission.invoice_code,
      adjustment_type: 'INVOICE_CANCELLED_AFTER_PAID',
      adjustment_reason: `Hóa đơn ${invoiceCode} bị hủy sau khi đã thanh toán hoa hồng`,
      f1_customer_id: commission.f1_customer_id,
      f1_phone: commission.f1_phone,
      f1_adjustment: f1Adjustment,
      f1_was_unique: f1WasUnique,
      revenue_adjustment: -Number(commission.invoice_amount),
      commission_adjustment: 0, // NOT cancelled
      commission_was_paid: true
    });

    // Update voucher tracking
    await supabase.from('voucher_affiliate_tracking').update({
      invoice_status: 'Đã hủy',
      // Keep commission_status as is (was 'available' -> now commission is 'paid')
      note: `Hóa đơn ${invoiceCode} đã hủy sau khi thanh toán hoa hồng. Hoa hồng được giữ nguyên.`,
      updated_at: now
    }).eq('code', commission.voucher_code);

    // Notify F0
    await supabase.from('notifications').insert({
      f0_id: commission.f0_id,
      type: 'info',
      content: {
        title: 'Hóa đơn đã bị hủy',
        message: `Hóa đơn ${invoiceCode} đã bị hủy. Hoa hồng ${Number(commission.total_commission).toLocaleString()}đ của bạn vẫn được giữ nguyên do đã thanh toán trước đó.`,
        invoice_code: invoiceCode,
        commission_amount: commission.total_commission,
        commission_kept: true
      },
      is_read: false
    });

    console.log('[Cancellation] ✅ Processed as PAID - commission kept');
    return {
      processed: true,
      action: 'INVOICE_CANCELLED_AFTER_PAID',
      commission_kept: true,
      f1_adjustment: f1Adjustment
    };

  } else if (isLockedOrPaid) {
    // ============================================
    // SCENARIO B: Commission is LOCKED - KEEP commission (already locked, EXP counted)
    // ============================================
    console.log('[Cancellation] 🔒 Commission is LOCKED - Keeping commission (đã chốt, không ảnh hưởng)...');

    // Update commission_records (keep status as locked, just mark invoice_cancelled_at)
    await supabase.from('commission_records').update({
      invoice_cancelled_at: now,
      invoice_cancelled_after_paid: false, // Not paid yet, but locked
      updated_at: now
    }).eq('id', commission.id);

    // Create audit log
    await supabase.from('commission_audit_log').insert({
      commission_record_id: commission.id,
      voucher_code: commission.voucher_code,
      invoice_code: commission.invoice_code,
      f0_id: commission.f0_id,
      f0_code: commission.f0_code,
      event_type: 'INVOICE_CANCELLED_AFTER_LOCKED',
      event_source: 'webhook',
      before_data: {
        status: 'locked',
        invoice_cancelled_at: null
      },
      after_data: {
        status: 'locked', // Kept
        invoice_cancelled_at: now,
        commission_kept: true
      },
      notes: `Hóa đơn ${invoiceCode} bị hủy SAU KHI ĐÃ CHỐT. Hoa hồng ${Number(commission.total_commission).toLocaleString()}đ VẪN ĐƯỢC GIỮ.`
    });

    // Update voucher tracking (just mark invoice status, keep commission_status)
    await supabase.from('voucher_affiliate_tracking').update({
      invoice_status: 'Đã hủy',
      note: `Hóa đơn ${invoiceCode} đã hủy sau khi chốt hoa hồng. Hoa hồng được giữ nguyên.`,
      updated_at: now
    }).eq('code', commission.voucher_code);

    // Notify F0
    await supabase.from('notifications').insert({
      f0_id: commission.f0_id,
      type: 'info',
      content: {
        title: 'Hóa đơn đã bị hủy (sau khi chốt)',
        message: `Hóa đơn ${invoiceCode} đã bị hủy. Tuy nhiên, hoa hồng ${Number(commission.total_commission).toLocaleString()}đ của bạn vẫn được giữ nguyên do đã được chốt trước đó.`,
        invoice_code: invoiceCode,
        commission_amount: commission.total_commission,
        commission_kept: true,
        reason: 'Đã chốt hoa hồng trước khi hóa đơn bị hủy'
      },
      is_read: false
    });

    console.log('[Cancellation] ✅ Processed as LOCKED - commission kept');
    return {
      processed: true,
      action: 'INVOICE_CANCELLED_AFTER_LOCKED',
      commission_kept: true,
      f1_adjustment: 0 // No adjustment for locked commissions
    };

  } else {
    // ============================================
    // SCENARIO C: Commission is PENDING - CANCEL commission (not yet locked)
    // ============================================
    console.log('[Cancellation] ❌ Commission is PENDING - Cancelling commission (chưa chốt)...');

    const previousStatus = commission.status;

    // Update commission_records -> cancelled
    await supabase.from('commission_records').update({
      status: 'cancelled',
      cancelled_at: now,
      cancelled_by: null,
      cancelled_by_name: 'System - Invoice Cancelled',
      cancelled_reason: `Hóa đơn ${invoiceCode} đã bị hủy trước khi chốt hoa hồng`,
      invoice_cancelled_at: now,
      stats_adjusted: true,
      stats_adjusted_at: now,
      updated_at: now
    }).eq('id', commission.id);

    // Create audit log
    await supabase.from('commission_audit_log').insert({
      commission_record_id: commission.id,
      voucher_code: commission.voucher_code,
      invoice_code: commission.invoice_code,
      f0_id: commission.f0_id,
      f0_code: commission.f0_code,
      event_type: 'INVOICE_CANCELLED_BEFORE_LOCKED',
      event_source: 'webhook',
      before_data: {
        status: previousStatus,
        total_commission: commission.total_commission
      },
      after_data: {
        status: 'cancelled',
        cancelled_reason: 'Invoice cancelled before lock period',
        f1_adjustment: f1Adjustment,
        revenue_adjustment: -Number(commission.invoice_amount),
        commission_cancelled: Number(commission.total_commission)
      },
      notes: `Hóa đơn ${invoiceCode} bị hủy TRƯỚC KHI CHỐT. Hoa hồng ${Number(commission.total_commission).toLocaleString()}đ ĐÃ BỊ HỦY.`
    });

    // Create stats adjustment
    await supabase.from('f0_stats_adjustments').insert({
      f0_id: commission.f0_id,
      f0_code: commission.f0_code,
      commission_record_id: commission.id,
      voucher_code: commission.voucher_code,
      invoice_code: commission.invoice_code,
      adjustment_type: 'INVOICE_CANCELLED_BEFORE_LOCKED',
      adjustment_reason: `Hóa đơn ${invoiceCode} bị hủy trước khi chốt hoa hồng`,
      f1_customer_id: commission.f1_customer_id,
      f1_phone: commission.f1_phone,
      f1_adjustment: f1Adjustment,
      f1_was_unique: f1WasUnique,
      revenue_adjustment: -Number(commission.invoice_amount),
      commission_adjustment: -Number(commission.total_commission), // Cancelled
      commission_was_paid: false
    });

    // Update voucher tracking
    await supabase.from('voucher_affiliate_tracking').update({
      invoice_status: 'Đã hủy',
      commission_status: 'invalid',
      invalid_reason_code: 'INVOICE_CANCELLED_BEFORE_LOCKED',
      invalid_reason_text: `Hóa đơn ${invoiceCode} đã bị hủy trước khi chốt hoa hồng`,
      updated_at: now
    }).eq('code', commission.voucher_code);

    // Notify F0
    await supabase.from('notifications').insert({
      f0_id: commission.f0_id,
      type: 'warning',
      content: {
        title: 'Hoa hồng đã bị hủy',
        message: `Hóa đơn ${invoiceCode} đã bị hủy trước khi chốt hoa hồng. Hoa hồng ${Number(commission.total_commission).toLocaleString()}đ của bạn đã bị hủy theo.`,
        invoice_code: invoiceCode,
        commission_amount: commission.total_commission,
        commission_cancelled: true,
        reason: 'Hóa đơn bị hủy trước khi hết thời gian chốt'
      },
      is_read: false
    });

    console.log('[Cancellation] ✅ Processed as PENDING - commission cancelled');
    return {
      processed: true,
      action: 'INVOICE_CANCELLED_BEFORE_LOCKED',
      commission_cancelled: true,
      cancelled_amount: commission.total_commission,
      f1_adjustment: f1Adjustment
    };
  }
}

// ============================================
// COMMISSION CALCULATION - FIRST ORDER
// ============================================
async function calculateFirstOrderCommission(supabase: any, invoiceAmount: number, invoiceStatus: string, invoiceTotal: number, invoiceTotalPayment: number, actualUserPhone: string, affiliateVoucher: any, f0Partner: any) {
  const result: any = {
    isValid: false,
    invalidReasonCode: null,
    invalidReasonText: null,
    basicCommission: null,
    firstOrderCommission: null,
    tierBonus: null,
    subtotalCommission: 0,
    totalCommission: 0,
    isLifetimeCommission: false
  };
  // VALIDATION 1: Invoice must be completed
  if (invoiceStatus !== 'Hoàn thành') {
    result.invalidReasonCode = 'INVOICE_NOT_COMPLETED';
    result.invalidReasonText = `Hóa đơn chưa hoàn thành. Trạng thái: ${invoiceStatus}`;
    console.log(`[Commission] ❌ Validation failed: ${result.invalidReasonText}`);
    return result;
  }
  // VALIDATION 2: Invoice must be fully paid
  if (invoiceTotal !== invoiceTotalPayment) {
    result.invalidReasonCode = 'INVOICE_NOT_FULLY_PAID';
    result.invalidReasonText = `Hóa đơn chưa thanh toán đủ. Tổng: ${invoiceTotal.toLocaleString()}đ, Đã TT: ${invoiceTotalPayment.toLocaleString()}đ`;
    console.log(`[Commission] ❌ Validation failed: ${result.invalidReasonText}`);
    return result;
  }
  // VALIDATION 3: Check if actual user is NEW customer
  // v12: Check totalrevenue BEFORE this invoice was created
  // When webhook fires, KiotViet has already updated totalrevenue to include this invoice
  // So we need to check: totalrevenue - invoiceAmount <= 0 (was new BEFORE this invoice)
  // Phone matching is NOT required - voucher can be used by different phone
  const normalizedActualPhone = normalizePhone(actualUserPhone);
  const normalizedRecipientPhone = normalizePhone(affiliateVoucher.recipient_phone);
  console.log(`[Commission] Checking if INVOICE CUSTOMER was NEW before this invoice...`);
  console.log(`[Commission]   Recipient phone (voucher): ${normalizedRecipientPhone}`);
  console.log(`[Commission]   Actual user phone (invoice): ${normalizedActualPhone}`);
  console.log(`[Commission]   Current invoice amount: ${invoiceAmount.toLocaleString()}đ`);
  console.log(`[Commission]   Phone match NOT required in v12`);

  // Query customer from customers_backup WITH totalrevenue
  const { data: invoiceCustomer, error: customerError } = await supabase
    .from('customers_backup')
    .select('code, contactnumber, name, totalrevenue')
    .eq('contactnumber', normalizedActualPhone)
    .maybeSingle();

  if (customerError) {
    console.error('[Commission] Error checking customer:', customerError.message);
  }

  let actualCustomerType;
  if (!invoiceCustomer) {
    // Customer not found in KiotViet → considered NEW
    actualCustomerType = 'new';
    console.log(`[Commission] ✅ Customer NOT in KiotViet → NEW customer`);
  } else {
    // Customer found - check totalrevenue BEFORE this invoice
    const currentTotalRevenue = Number(invoiceCustomer.totalrevenue) || 0;
    const revenueBeforeThisInvoice = currentTotalRevenue - invoiceAmount;

    console.log(`[Commission]   Customer found: ${invoiceCustomer.name}`);
    console.log(`[Commission]   Current totalrevenue: ${currentTotalRevenue.toLocaleString()}đ`);
    console.log(`[Commission]   Revenue BEFORE this invoice: ${revenueBeforeThisInvoice.toLocaleString()}đ`);

    // NEW customer = totalrevenue BEFORE this invoice was 0 or negative (first purchase)
    if (revenueBeforeThisInvoice <= 0) {
      actualCustomerType = 'new';
      console.log(`[Commission] ✅ Revenue before invoice = ${revenueBeforeThisInvoice} <= 0 → WAS NEW customer (first purchase)`);
    } else {
      actualCustomerType = 'old';
      console.log(`[Commission] ⚠️ Revenue before invoice = ${revenueBeforeThisInvoice} > 0 → WAS OLD customer (repeat purchase)`);
    }
  }

  if (actualCustomerType === 'old') {
    result.invalidReasonCode = 'CUSTOMER_NOT_NEW';
    result.invalidReasonText = `Khách hàng đã có doanh thu trước đó (không phải đơn đầu tiên). SĐT: ${actualUserPhone}`;
    console.log(`[Commission] ❌ Validation failed: ${result.invalidReasonText}`);
    return result;
  }
  // PASSED ALL VALIDATIONS
  result.isValid = true;
  console.log(`[Commission] ✅ All validations passed! Calculating FIRST ORDER commission...`);
  // Get commission settings from database
  const { data: commissionSettings, error: settingsError } = await supabase.from('commission_settings').select('*').eq('is_active', true).order('priority', {
    ascending: true
  });
  if (settingsError || !commissionSettings) {
    console.error('[Commission] Error fetching commission settings:', settingsError?.message);
    result.invalidReasonCode = 'SETTINGS_NOT_FOUND';
    result.invalidReasonText = 'Không thể tải cấu hình hoa hồng';
    result.isValid = false;
    return result;
  }
  console.log(`[Commission] Loaded ${commissionSettings.length} commission settings`);
  // Get F0's current tier
  const f0TierCode = f0Partner.current_tier || 'BRONZE';
  console.log(`[Commission] F0 tier: ${f0TierCode}`);
  const { data: f0Tier, error: tierError } = await supabase.from('f0_tiers').select('*').eq('tier_code', f0TierCode.toUpperCase()).eq('is_active', true).single();
  if (tierError) {
    console.error('[Commission] Error fetching F0 tier:', tierError.message);
  }
  // CALCULATE BASIC COMMISSION
  const basicSetting = commissionSettings.find((s: any) => s.conditions.applies_to === 'all');
  if (basicSetting) {
    const rate = basicSetting.config.value / 100;
    let amount = invoiceAmount * rate;
    if (basicSetting.config.max_commission && amount > basicSetting.config.max_commission) {
      amount = basicSetting.config.max_commission;
    }
    result.basicCommission = {
      settingId: basicSetting.id,
      settingName: basicSetting.name,
      rate: basicSetting.config.value,
      amount: Math.round(amount)
    };
    result.subtotalCommission += result.basicCommission.amount;
    console.log(`[Commission] Basic: ${basicSetting.config.value}% = ${result.basicCommission.amount.toLocaleString()}đ`);
  }
  // CALCULATE FIRST ORDER COMMISSION
  const firstOrderSetting = commissionSettings.find((s: any) => s.conditions.applies_to === 'first_order');
  if (firstOrderSetting) {
    const minOrderValue = firstOrderSetting.config.min_order_value || 0;
    const maxCap = firstOrderSetting.config.max_commission;
    if (invoiceAmount >= minOrderValue) {
      const rate = firstOrderSetting.config.value / 100;
      let amount = invoiceAmount * rate;
      if (maxCap && amount > maxCap) {
        amount = maxCap;
      }
      result.firstOrderCommission = {
        settingId: firstOrderSetting.id,
        settingName: firstOrderSetting.name,
        rate: firstOrderSetting.config.value,
        amount: Math.round(amount),
        maxCap: maxCap,
        minOrder: minOrderValue,
        applied: true,
        reason: null
      };
      result.subtotalCommission += result.firstOrderCommission.amount;
      console.log(`[Commission] First Order: ${firstOrderSetting.config.value}% (max ${maxCap?.toLocaleString()}đ) = ${result.firstOrderCommission.amount.toLocaleString()}đ`);
    } else {
      result.firstOrderCommission = {
        settingId: firstOrderSetting.id,
        settingName: firstOrderSetting.name,
        rate: firstOrderSetting.config.value,
        amount: 0,
        maxCap: maxCap,
        minOrder: minOrderValue,
        applied: false,
        reason: `Đơn hàng ${invoiceAmount.toLocaleString()}đ < ${minOrderValue.toLocaleString()}đ tối thiểu`
      };
      console.log(`[Commission] First Order: SKIPPED - ${result.firstOrderCommission.reason}`);
    }
  }
  // CALCULATE TIER BONUS
  if (f0Tier && f0Tier.benefits?.commission_bonus_percent > 0) {
    const bonusRate = f0Tier.benefits.commission_bonus_percent / 100;
    const bonusAmount = Math.round(invoiceAmount * bonusRate);
    result.tierBonus = {
      tierId: f0Tier.id,
      tierCode: f0Tier.tier_code,
      tierName: f0Tier.tier_name,
      rate: f0Tier.benefits.commission_bonus_percent,
      amount: bonusAmount
    };
    console.log(`[Commission] Tier Bonus (${f0Tier.tier_name}): ${f0Tier.benefits.commission_bonus_percent}% = ${bonusAmount.toLocaleString()}đ`);
  }
  // Calculate total
  result.totalCommission = result.subtotalCommission + (result.tierBonus?.amount || 0);
  console.log(`[Commission] 💰 TOTAL FIRST ORDER COMMISSION: ${result.totalCommission.toLocaleString()}đ`);
  return result;
}
// ============================================
// COMMISSION CALCULATION - LIFETIME (REPEAT PURCHASE)
// ============================================
async function calculateLifetimeCommission(supabase: any, invoiceAmount: number, invoiceStatus: string, invoiceTotal: number, invoiceTotalPayment: number, f0Partner: any) {
  const result: any = {
    isValid: false,
    invalidReasonCode: null,
    invalidReasonText: null,
    basicCommission: null,
    firstOrderCommission: null,
    tierBonus: null,
    subtotalCommission: 0,
    totalCommission: 0,
    isLifetimeCommission: true
  };
  // VALIDATION 1: Invoice must be completed
  if (invoiceStatus !== 'Hoàn thành') {
    result.invalidReasonCode = 'INVOICE_NOT_COMPLETED';
    result.invalidReasonText = `Hóa đơn chưa hoàn thành. Trạng thái: ${invoiceStatus}`;
    console.log(`[Lifetime Commission] ❌ Validation failed: ${result.invalidReasonText}`);
    return result;
  }
  // VALIDATION 2: Invoice must be fully paid
  if (invoiceTotal !== invoiceTotalPayment) {
    result.invalidReasonCode = 'INVOICE_NOT_FULLY_PAID';
    result.invalidReasonText = `Hóa đơn chưa thanh toán đủ. Tổng: ${invoiceTotal.toLocaleString()}đ, Đã TT: ${invoiceTotalPayment.toLocaleString()}đ`;
    console.log(`[Lifetime Commission] ❌ Validation failed: ${result.invalidReasonText}`);
    return result;
  }
  result.isValid = true;
  console.log(`[Lifetime Commission] ✅ Validations passed! Calculating LIFETIME commission...`);
  // Get commission settings
  const { data: commissionSettings, error: settingsError } = await supabase.from('commission_settings').select('*').eq('is_active', true).order('priority', {
    ascending: true
  });
  if (settingsError || !commissionSettings) {
    console.error('[Lifetime Commission] Error fetching commission settings:', settingsError?.message);
    result.invalidReasonCode = 'SETTINGS_NOT_FOUND';
    result.invalidReasonText = 'Không thể tải cấu hình hoa hồng';
    result.isValid = false;
    return result;
  }
  // Get F0's current tier
  const f0TierCode = f0Partner.current_tier || 'BRONZE';
  console.log(`[Lifetime Commission] F0 tier: ${f0TierCode}`);
  const { data: f0Tier, error: tierError } = await supabase.from('f0_tiers').select('*').eq('tier_code', f0TierCode.toUpperCase()).eq('is_active', true).single();
  if (tierError) {
    console.error('[Lifetime Commission] Error fetching F0 tier:', tierError.message);
  }
  // CALCULATE BASIC COMMISSION ONLY (no first order bonus for repeat purchases)
  const basicSetting = commissionSettings.find((s: any) => s.conditions.applies_to === 'all');
  if (basicSetting) {
    const rate = basicSetting.config.value / 100;
    let amount = invoiceAmount * rate;
    if (basicSetting.config.max_commission && amount > basicSetting.config.max_commission) {
      amount = basicSetting.config.max_commission;
    }
    result.basicCommission = {
      settingId: basicSetting.id,
      settingName: basicSetting.name,
      rate: basicSetting.config.value,
      amount: Math.round(amount)
    };
    result.subtotalCommission += result.basicCommission.amount;
    console.log(`[Lifetime Commission] Basic: ${basicSetting.config.value}% = ${result.basicCommission.amount.toLocaleString()}đ`);
  }
  // NO FIRST ORDER COMMISSION for lifetime/repeat purchases
  console.log(`[Lifetime Commission] First Order: SKIPPED (repeat purchase)`);
  // CALCULATE TIER BONUS
  if (f0Tier && f0Tier.benefits?.commission_bonus_percent > 0) {
    const bonusRate = f0Tier.benefits.commission_bonus_percent / 100;
    const bonusAmount = Math.round(invoiceAmount * bonusRate);
    result.tierBonus = {
      tierId: f0Tier.id,
      tierCode: f0Tier.tier_code,
      tierName: f0Tier.tier_name,
      rate: f0Tier.benefits.commission_bonus_percent,
      amount: bonusAmount
    };
    console.log(`[Lifetime Commission] Tier Bonus (${f0Tier.tier_name}): ${f0Tier.benefits.commission_bonus_percent}% = ${bonusAmount.toLocaleString()}đ`);
  }
  // Calculate total
  result.totalCommission = result.subtotalCommission + (result.tierBonus?.amount || 0);
  console.log(`[Lifetime Commission] 💰 TOTAL LIFETIME COMMISSION: ${result.totalCommission.toLocaleString()}đ`);
  return result;
}
// ============================================
// CREATE F1 ASSIGNMENT
// ============================================
async function createF1Assignment(supabase: any, f1Phone: string, f1CustomerId: string, f1Name: string, f0Id: string, f0Code: string, voucherCode: string, invoiceCode: string, invoiceDate: string | null) {
  console.log(`[F1 Assignment] Creating assignment for F1: ${f1Phone} -> F0: ${f0Code}`);
  const normalizedPhone = normalizePhone(f1Phone);
  // Check if assignment already exists
  const { data: existing, error: checkError } = await supabase.from('f1_customer_assignments').select('id, f0_code').eq('f1_phone', normalizedPhone).maybeSingle();
  if (checkError) {
    console.error('[F1 Assignment] Error checking existing:', checkError.message);
    return null;
  }
  if (existing) {
    console.log(`[F1 Assignment] ⚠️ F1 already assigned to ${existing.f0_code}, skipping...`);
    return existing;
  }
  // Create new assignment
  const { data: newAssignment, error: insertError } = await supabase.from('f1_customer_assignments').insert({
    f1_phone: normalizedPhone,
    f1_customer_id: f1CustomerId,
    f1_name: f1Name,
    f0_id: f0Id,
    f0_code: f0Code,
    first_voucher_code: voucherCode,
    first_invoice_code: invoiceCode,
    first_invoice_date: invoiceDate,
    is_active: true
  }).select('id').single();
  if (insertError) {
    console.error('[F1 Assignment] ❌ Error creating assignment:', insertError.message);
    return null;
  }
  console.log(`[F1 Assignment] ✅ Created assignment: ${newAssignment.id}`);
  return newAssignment;
}
// ============================================
// CHECK FOR LIFETIME COMMISSION OPPORTUNITY
// ============================================
async function checkLifetimeCommission(supabase: any, customerPhone: string, customerName: string, customerId: string, invoiceDetail: any) {
  const normalizedPhone = normalizePhone(customerPhone);
  console.log(`[Lifetime] 🔍 Checking if ${normalizedPhone} is an assigned F1...`);
  // Check if this customer is assigned to any F0
  const { data: assignment, error: assignmentError } = await supabase.from('f1_customer_assignments').select('*, f0_partners!inner(id, f0_code, full_name, current_tier)').eq('f1_phone', normalizedPhone).eq('is_active', true).maybeSingle();
  if (assignmentError) {
    console.error('[Lifetime] Error checking assignment:', assignmentError.message);
    return null;
  }
  if (!assignment) {
    console.log('[Lifetime] ℹ️ Customer is NOT an assigned F1');
    return null;
  }
  console.log(`[Lifetime] ✅ Customer IS an assigned F1!`);
  console.log(`[Lifetime]    Assigned to F0: ${assignment.f0_code} (${assignment.f0_partners.full_name})`);
  console.log(`[Lifetime]    First voucher: ${assignment.first_voucher_code}`);
  // Check if this invoice already has a commission record
  const { data: existingCommission, error: commCheckError } = await supabase.from('commission_records').select('id').eq('invoice_code', invoiceDetail.code).maybeSingle();
  if (commCheckError) {
    console.error('[Lifetime] Error checking existing commission:', commCheckError.message);
  }
  if (existingCommission) {
    console.log(`[Lifetime] ⚠️ Commission already exists for invoice ${invoiceDetail.code}, skipping...`);
    return null;
  }
  // Calculate lifetime commission
  const commission = await calculateLifetimeCommission(supabase, invoiceDetail.total, invoiceDetail.statusValue, invoiceDetail.total, invoiceDetail.totalPayment, assignment.f0_partners);
  if (!commission.isValid || commission.totalCommission <= 0) {
    console.log(`[Lifetime] ⚠️ Commission not valid or zero`);
    return null;
  }
  // Create commission record for lifetime commission
  // NEW LOCK SYSTEM: status = 'pending', set qualified_at and lock_date
  const now = getVietnamTime();
  const nowIso = now.toISOString();

  // Get lock period settings (v15: support hours + minutes)
  const lockSettings = await getLockPeriodSettings(supabase);
  const lockDate = calculateLockDate(now, lockSettings);
  const lockPeriodText = formatLockPeriod(lockSettings);

  console.log(`[Lifetime] 📅 Lock period: ${lockPeriodText}`);
  console.log(`[Lifetime] 📅 Qualified at: ${nowIso}`);
  console.log(`[Lifetime] 📅 Lock date: ${lockDate.toISOString()}`);

  const commissionRecord = {
    voucher_code: assignment.first_voucher_code,
    f0_id: assignment.f0_id,
    f0_code: assignment.f0_code,
    invoice_id: String(invoiceDetail.id),
    invoice_code: invoiceDetail.code,
    invoice_amount: invoiceDetail.total,
    invoice_date: convertToVietnamTZ(invoiceDetail.createdDate),
    invoice_status: invoiceDetail.statusValue,
    f1_phone: normalizedPhone,
    f1_name: customerName,
    f1_customer_id: customerId,
    is_new_customer: false,
    basic_setting_id: commission.basicCommission?.settingId || null,
    basic_setting_name: commission.basicCommission?.settingName || null,
    basic_rate: commission.basicCommission?.rate || null,
    basic_amount: commission.basicCommission?.amount || null,
    // No first order commission for lifetime
    first_order_setting_id: null,
    first_order_setting_name: null,
    first_order_rate: null,
    first_order_amount: null,
    first_order_max_cap: null,
    first_order_min_order: null,
    first_order_applied: false,
    first_order_reason: 'Không áp dụng cho đơn hàng lặp lại (lifetime commission)',
    tier_setting_id: commission.tierBonus?.tierId || null,
    tier_code: commission.tierBonus?.tierCode || null,
    tier_name: commission.tierBonus?.tierName || null,
    tier_bonus_rate: commission.tierBonus?.rate || null,
    tier_bonus_amount: commission.tierBonus?.amount || null,
    subtotal_commission: commission.subtotalCommission,
    total_commission: commission.totalCommission,
    // NEW LOCK SYSTEM
    status: 'pending',  // Changed from 'available'
    qualified_at: nowIso,
    lock_date: lockDate.toISOString(),
    commission_month: null,  // Will be set when locked
    is_lifetime_commission: true,
    assignment_id: assignment.id,
    notes: `Hoa hồng trọn đời từ F1 ${customerName || normalizedPhone}. Chờ chốt sau ${lockPeriodText}.`
  };
  const { data: newCommission, error: commissionError } = await supabase.from('commission_records').insert(commissionRecord).select('id').single();
  if (commissionError) {
    console.error('[Lifetime] ❌ Failed to create commission_records:', commissionError.message);
    return null;
  }
  console.log(`[Lifetime] ✅ Lifetime commission record created: ${newCommission.id}`);
  console.log(`[Lifetime] 💰 Amount: ${commission.totalCommission.toLocaleString()}đ (pending - chờ chốt)`);

  // Create notification for F0
  const notificationContent = {
    title: 'Hoa hồng trọn đời (chờ chốt)!',
    message: `Khách hàng ${customerName || normalizedPhone} đã mua hàng lại. Bạn sẽ nhận được ${commission.totalCommission.toLocaleString()}đ hoa hồng sau ${lockPeriodText} chờ chốt.`,
    voucher_code: assignment.first_voucher_code,
    invoice_code: invoiceDetail.code,
    commission_amount: commission.totalCommission,
    is_lifetime: true,
    status: 'pending',
    lock_date: lockDate.toISOString(),
    lock_period_text: lockPeriodText,
    breakdown: {
      basic: commission.basicCommission?.amount || 0,
      firstOrder: 0,
      tierBonus: commission.tierBonus?.amount || 0
    }
  };
  await supabase.from('notifications').insert({
    f0_id: assignment.f0_id,
    type: 'commission',
    content: notificationContent,
    is_read: false
  });
  console.log('[Lifetime] ✅ Notification created for F0!');

  // ============================================
  // NOTE: DO NOT recalculate F0 tier here!
  // Tier is only recalculated when commission status = 'locked' or 'paid'
  // The cron-lock-commissions job will do this when locking the commission
  // ============================================
  console.log('[Lifetime] ℹ️ Tier will be recalculated when commission is locked (after lock period)');

  return {
    assignment,
    commission,
    commissionRecordId: newCommission.id,
    status: 'pending',
    lock_date: lockDate.toISOString()
  };
}
// ============================================
// MAIN HANDLER
// ============================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.text();
    if (!body || body.trim() === '') {
      console.error('[Affiliate] Empty request body');
      return new Response('Empty request body', {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      });
    }
    let rawData;
    try {
      rawData = JSON.parse(body);
    } catch (e) {
      console.error('[Affiliate] JSON Parse Error:', e);
      return new Response('Invalid JSON', {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      });
    }
    let data = rawData;
    if (rawData.type === 'invoice' && rawData.data) {
      console.log('[Affiliate] Detected Cloudflare wrapper, unwrapping...');
      data = rawData.data;
    }
    if (!data?.Notifications?.[0]?.Data?.[0]) {
      console.error('[Affiliate] Invalid webhook structure');
      return new Response('No invoice data', {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      });
    }
    const invoice = data.Notifications[0].Data[0];
    console.log('====================================');
    console.log(`[Affiliate] Processing Invoice: ${invoice.Code}`);
    console.log(`[Affiliate] Status: ${invoice.StatusValue}`);
    console.log('====================================');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Affiliate] Missing Supabase environment variables');
      return new Response('Server configuration error', {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'api'
      }
    });
    // ============================================
    // HANDLE CANCELLED INVOICES (v7)
    // ============================================
    if (invoice.StatusValue === 'Cancelled' || invoice.StatusValue === 'Đã hủy') {
      console.log(`[Affiliate] Invoice ${invoice.Code} is CANCELLED, processing cancellation logic...`);

      // Need to get invoice ID from KiotViet API for proper lookup
      try {
        // Get KiotViet Token first
        const { data: kiotTokenData, error: tokenError } = await supabase
          .from('kiotviet_tokens')
          .select('token')
          .eq('id', 1)
          .single();

        if (tokenError || !kiotTokenData?.token) {
          console.error('[Affiliate] ❌ KiotViet token not found for cancellation');
          return new Response('OK - Token not found', {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
          });
        }

        // Get invoice details from KiotViet
        const response = await fetch(`https://public.kiotapi.com/invoices/code/${invoice.Code}`, {
          method: 'GET',
          headers: {
            'Retailer': 'mktamduc',
            'Authorization': `Bearer ${kiotTokenData.token}`
          }
        });

        let invoiceId = 0;
        if (response.ok) {
          const invoiceDetail = await response.json();
          invoiceId = invoiceDetail.id;
        }

        // Process cancellation
        const cancellationResult = await handleInvoiceCancellation(supabase, invoice.Code, invoiceId);
        console.log('[Affiliate] Cancellation result:', JSON.stringify(cancellationResult));

        return new Response(`OK - Cancellation processed: ${cancellationResult.action}`, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
      } catch (cancelError: any) {
        console.error('[Affiliate] Error processing cancellation:', cancelError.message);
        return new Response('OK - Cancellation error', {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
      }
    }
    console.log('====================================');
    console.log('[Affiliate] Starting voucher affiliate tracking & commission calculation...');
    console.log('====================================');
    try {
      // Step 1: Get KiotViet Token
      console.log('[Affiliate] 🔑 Fetching KiotViet token...');
      const { data: kiotTokenData, error: tokenError } = await supabase.from('kiotviet_tokens').select('token').eq('id', 1).single();
      if (tokenError || !kiotTokenData?.token) {
        console.error('[Affiliate] ❌ KiotViet token not found:', tokenError?.message);
        return new Response('OK - Token not found', {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }
      const kiotToken = kiotTokenData.token;
      console.log('[Affiliate] ✅ KiotViet token retrieved');
      // Step 2: Get invoice details from KiotViet API
      const invoiceCode = invoice.Code;
      console.log(`[Affiliate] 🔍 Fetching invoice details: ${invoiceCode}`);
      const response = await fetch(`https://public.kiotapi.com/invoices/code/${invoiceCode}`, {
        method: 'GET',
        headers: {
          'Retailer': 'mktamduc',
          'Authorization': `Bearer ${kiotToken}`
        }
      });
      if (!response.ok) {
        throw new Error(`KiotViet API error: ${response.status}`);
      }
      const invoiceDetail = await response.json();
      console.log('[Affiliate] ✅ Invoice details retrieved');
      console.log(`[Affiliate]    Invoice ID: ${invoiceDetail.id}`);
      console.log(`[Affiliate]    Customer Code: ${invoiceDetail.customerCode}`);
      console.log(`[Affiliate]    Total: ${invoiceDetail.total}`);
      console.log(`[Affiliate]    TotalPayment: ${invoiceDetail.totalPayment}`);
      console.log(`[Affiliate]    StatusValue: ${invoiceDetail.statusValue}`);
      // Step 3: Get customer phone
      if (!invoiceDetail.customerCode) {
        console.log('[Affiliate] ⚠️ No customer code in invoice, skipping...');
        return new Response('OK - No customer code', {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }
      console.log(`[Affiliate] 🔍 Looking up customer: ${invoiceDetail.customerCode}`);
      const { data: customer, error: customerError } = await supabase.from('customers_backup').select('code, contactnumber, name').eq('code', invoiceDetail.customerCode).single();
      if (customerError || !customer) {
        console.error('[Affiliate] ❌ Customer not found:', customerError?.message);
        return new Response('OK - Customer not found', {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }
      const contactNumber = customer.contactnumber;
      const customerName = customer.name || '';
      console.log(`[Affiliate] ✅ Customer: ${customerName} - ${contactNumber}`);
      // Step 4: Extract VoucherCode from Payments
      console.log('[Affiliate] 🔍 Checking for voucher in payments...');
      let usedVoucherCode = null;
      if (invoiceDetail.payments && Array.isArray(invoiceDetail.payments)) {
        usedVoucherCode = getVoucherFromPayments(invoiceDetail.payments);
      }
      // ============================================
      // LIFETIME COMMISSION CHECK (for ALL invoices)
      // ============================================
      // If no voucher OR voucher not in affiliate tracking, check for lifetime commission
      console.log('[Affiliate] 🔄 Checking for lifetime commission opportunity...');
      const lifetimeResult = await checkLifetimeCommission(supabase, contactNumber, customerName, invoiceDetail.customerCode, invoiceDetail);
      if (lifetimeResult) {
        console.log('[Affiliate] ✅ Lifetime commission processed!');
      // If lifetime commission was processed, we're done
      // (unless there's also a voucher to process)
      }
      // ============================================
      // VOUCHER COMMISSION CHECK (first order)
      // ============================================
      if (!usedVoucherCode) {
        console.log('[Affiliate] ℹ️ No voucher found in payments');
        if (lifetimeResult) {
          console.log('[Affiliate] ✅ But lifetime commission was processed!');
        }
        return new Response('OK - Processed', {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }
      // Step 5: Check if voucher exists in voucher_affiliate_tracking
      console.log(`[Affiliate] 🔍 Checking if voucher ${usedVoucherCode} exists in affiliate tracking...`);
      const { data: affiliateVouchers, error: voucherError } = await supabase.from('voucher_affiliate_tracking').select('*').or(`code.eq.${usedVoucherCode},reissue_1_code.eq.${usedVoucherCode},reissue_2_code.eq.${usedVoucherCode}`).limit(1);
      const affiliateVoucher = affiliateVouchers?.[0];
      if (voucherError || !affiliateVoucher) {
        console.log('[Affiliate] ℹ️ Voucher NOT found in affiliate tracking - not an affiliate voucher');
        return new Response('OK - Not an affiliate voucher', {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }
      console.log('[Affiliate] ✅ Voucher found in affiliate tracking!');
      console.log(`[Affiliate]    F0 Code: ${affiliateVoucher.f0_code}`);
      console.log(`[Affiliate]    Recipient: ${affiliateVoucher.recipient_phone}`);
      console.log(`[Affiliate]    Actual user: ${contactNumber}`);
      console.log(`[Affiliate]    Current commission_status: ${affiliateVoucher.commission_status}`);
      console.log(`[Affiliate]    Current invalid_reason_code: ${affiliateVoucher.invalid_reason_code}`);
      console.log(`[Affiliate]    Stored invoice_id: ${affiliateVoucher.invoice_id} (type: ${typeof affiliateVoucher.invoice_id})`);
      console.log(`[Affiliate]    Current invoice_id: ${invoiceDetail.id} (type: ${typeof invoiceDetail.id})`);

      // ============================================
      // v6 FIX: RE-CHECK PARTIALLY PAID VOUCHERS
      // v8 FIX: Use String() comparison to handle type mismatch (string vs number)
      // ============================================
      // If voucher was previously marked invalid due to partial payment,
      // AND the invoice is the SAME invoice (same invoice_id),
      // AND now it's fully paid -> re-calculate commission
      const shouldRecheck =
        affiliateVoucher.commission_status === 'invalid' &&
        affiliateVoucher.invalid_reason_code === 'INVOICE_NOT_FULLY_PAID' &&
        String(affiliateVoucher.invoice_id) === String(invoiceDetail.id);

      if (shouldRecheck) {
        console.log('[Affiliate] 🔄 RE-CHECKING: Voucher was invalid due to partial payment, checking if now fully paid...');
        console.log(`[Affiliate]    Invoice Total: ${invoiceDetail.total}`);
        console.log(`[Affiliate]    Invoice TotalPayment: ${invoiceDetail.totalPayment}`);

        if (invoiceDetail.total === invoiceDetail.totalPayment && invoiceDetail.statusValue === 'Hoàn thành') {
          console.log('[Affiliate] ✅ Invoice is now FULLY PAID! Re-calculating commission...');
          // Continue to re-calculate commission (don't return early)
        } else {
          console.log('[Affiliate] ⚠️ Invoice still not fully paid, keeping invalid status');
          return new Response('OK - Still not fully paid', {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/plain'
            }
          });
        }
      } else if (affiliateVoucher.commission_record_id) {
        // Check if this voucher already has a commission record (and wasn't invalid due to partial payment)
        console.log(`[Affiliate] ⚠️ Voucher already has commission record: ${affiliateVoucher.commission_record_id}`);
        return new Response('OK - Already processed', {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      } else if (affiliateVoucher.commission_status === 'invalid' && affiliateVoucher.invalid_reason_code !== 'INVOICE_NOT_FULLY_PAID') {
        // Voucher is invalid for OTHER reasons (not partial payment), skip
        console.log(`[Affiliate] ⚠️ Voucher is invalid for reason: ${affiliateVoucher.invalid_reason_code}, skipping...`);
        return new Response('OK - Invalid for other reason', {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }

      // Step 6: Get F0 Partner info
      const { data: f0Partner, error: f0Error } = await supabase.from('f0_partners').select('id, f0_code, full_name, current_tier').eq('id', affiliateVoucher.f0_id).single();
      if (f0Error || !f0Partner) {
        console.error('[Affiliate] ❌ F0 Partner not found:', f0Error?.message);
        return new Response('OK - F0 not found', {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }
      console.log(`[Affiliate] ✅ F0 Partner: ${f0Partner.full_name} (${f0Partner.f0_code})`);
      // Step 7: Calculate first order commission
      console.log('[Affiliate] 💰 Calculating first order commission...');
      const commission = await calculateFirstOrderCommission(supabase, invoiceDetail.total, invoiceDetail.statusValue, invoiceDetail.total, invoiceDetail.totalPayment, contactNumber, affiliateVoucher, f0Partner);
      // Step 8: Prepare update fields
      const now = getVietnamTime().toISOString();
      let updateFields: any = {};
      let noteText = '';
      // v15: commission_status = 'pending' (NEW LOCK SYSTEM) instead of 'available'
      const commonFields = {
        actual_user_phone: contactNumber,
        actual_user_name: customerName,
        actual_user_id: invoiceDetail.customerCode,
        actual_customer_type: commission.isValid ? 'new' : commission.invalidReasonCode === 'CUSTOMER_NOT_NEW' ? 'old' : null,
        commission_status: commission.isValid ? 'pending' : 'invalid',  // v15: pending instead of available
        invalid_reason_code: commission.isValid ? null : commission.invalidReasonCode,
        invalid_reason_text: commission.isValid ? null : commission.invalidReasonText,
        commission_calculated_at: now,
        updated_at: now
      };
      if (usedVoucherCode === affiliateVoucher.code) {
        console.log('[Affiliate] 📌 Used ORIGINAL affiliate voucher');
        noteText = commission.isValid ? `Hoa hồng: ${commission.totalCommission.toLocaleString()}đ` : commission.invalidReasonText || 'Không đủ điều kiện nhận hoa hồng';
        updateFields = {
          ...commonFields,
          voucher_used: true,
          invoice_id: invoiceDetail.id,
          invoice_code: invoiceDetail.code,
          invoice_status: invoiceDetail.statusValue,
          invoice_amount: invoiceDetail.total,
          createddate_invoice: convertToVietnamTZ(invoiceDetail.createdDate),
          note: noteText
        };
      } else if (usedVoucherCode === affiliateVoucher.reissue_1_code) {
        console.log('[Affiliate] 📌 Used REISSUE 1 affiliate voucher');
        noteText = commission.isValid ? `Hoa hồng (reissue 1): ${commission.totalCommission.toLocaleString()}đ` : commission.invalidReasonText || 'Không đủ điều kiện nhận hoa hồng';
        updateFields = {
          ...commonFields,
          reissue_1_status: true,
          reissue_1_invoice_id: invoiceDetail.id,
          reissue_1_invoice_code: invoiceDetail.code,
          reissue_1_invoice_status: invoiceDetail.statusValue,
          reissue_1_invoice_amount: invoiceDetail.total,
          createddate_invoice_1: convertToVietnamTZ(invoiceDetail.createdDate),
          reissue_1_note: noteText
        };
      } else if (usedVoucherCode === affiliateVoucher.reissue_2_code) {
        console.log('[Affiliate] 📌 Used REISSUE 2 affiliate voucher');
        noteText = commission.isValid ? `Hoa hồng (reissue 2): ${commission.totalCommission.toLocaleString()}đ` : commission.invalidReasonText || 'Không đủ điều kiện nhận hoa hồng';
        updateFields = {
          ...commonFields,
          reissue_2_status: true,
          reissue_2_invoice_id: invoiceDetail.id,
          reissue_2_invoice_code: invoiceDetail.code,
          reissue_2_invoice_status: invoiceDetail.statusValue,
          reissue_2_invoice_amount: invoiceDetail.total,
          createddate_invoice_2: convertToVietnamTZ(invoiceDetail.createdDate),
          reissue_2_note: noteText
        };
      }
      // Step 9: Update voucher_affiliate_tracking
      const { error: updateError } = await supabase.from('voucher_affiliate_tracking').update(updateFields).eq('code', affiliateVoucher.code);
      if (updateError) {
        console.error('[Affiliate] ❌ Failed to update voucher_affiliate_tracking:', updateError.message);
        return new Response('OK - Update failed', {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }
      console.log('[Affiliate] ✅ voucher_affiliate_tracking updated!');
      // Step 10: If commission is valid, create commission_records entry AND F1 assignment
      if (commission.isValid && commission.totalCommission > 0) {
        console.log('[Affiliate] 📝 Creating commission_records entry...');

        // NEW LOCK SYSTEM: Get lock period settings (v15: support hours + minutes)
        const lockSettings = await getLockPeriodSettings(supabase);
        const qualifiedAt = getVietnamTime();
        const lockDate = calculateLockDate(qualifiedAt, lockSettings);
        const lockPeriodText = formatLockPeriod(lockSettings);

        console.log(`[Affiliate] 📅 Lock period: ${lockPeriodText}`);
        console.log(`[Affiliate] 📅 Qualified at: ${qualifiedAt.toISOString()}`);
        console.log(`[Affiliate] 📅 Lock date: ${lockDate.toISOString()}`);

        const commissionRecord = {
          voucher_code: affiliateVoucher.code,
          f0_id: affiliateVoucher.f0_id,
          f0_code: affiliateVoucher.f0_code,
          invoice_id: String(invoiceDetail.id),
          invoice_code: invoiceDetail.code,
          invoice_amount: invoiceDetail.total,
          invoice_date: convertToVietnamTZ(invoiceDetail.createdDate),
          invoice_status: invoiceDetail.statusValue,
          f1_phone: contactNumber,
          f1_name: customerName,
          f1_customer_id: invoiceDetail.customerCode,
          is_new_customer: true,
          basic_setting_id: commission.basicCommission?.settingId || null,
          basic_setting_name: commission.basicCommission?.settingName || null,
          basic_rate: commission.basicCommission?.rate || null,
          basic_amount: commission.basicCommission?.amount || null,
          first_order_setting_id: commission.firstOrderCommission?.settingId || null,
          first_order_setting_name: commission.firstOrderCommission?.settingName || null,
          first_order_rate: commission.firstOrderCommission?.rate || null,
          first_order_amount: commission.firstOrderCommission?.applied ? commission.firstOrderCommission.amount : null,
          first_order_max_cap: commission.firstOrderCommission?.maxCap || null,
          first_order_min_order: commission.firstOrderCommission?.minOrder || null,
          first_order_applied: commission.firstOrderCommission?.applied || false,
          first_order_reason: commission.firstOrderCommission?.reason || null,
          tier_setting_id: commission.tierBonus?.tierId || null,
          tier_code: commission.tierBonus?.tierCode || null,
          tier_name: commission.tierBonus?.tierName || null,
          tier_bonus_rate: commission.tierBonus?.rate || null,
          tier_bonus_amount: commission.tierBonus?.amount || null,
          subtotal_commission: commission.subtotalCommission,
          total_commission: commission.totalCommission,
          // NEW LOCK SYSTEM
          status: 'pending',  // Changed from 'available'
          qualified_at: qualifiedAt.toISOString(),
          lock_date: lockDate.toISOString(),
          commission_month: null,  // Will be set when locked
          is_lifetime_commission: false // This is a first order
        };
        const { data: newCommission, error: commissionError } = await supabase.from('commission_records').insert(commissionRecord).select('id').single();
        if (commissionError) {
          console.error('[Affiliate] ❌ Failed to create commission_records:', commissionError.message);
        } else {
          console.log(`[Affiliate] ✅ Commission record created: ${newCommission.id} (status: pending)`);
          // Update voucher_affiliate_tracking with commission_record_id
          await supabase.from('voucher_affiliate_tracking').update({
            commission_record_id: newCommission.id
          }).eq('code', affiliateVoucher.code);
          // ============================================
          // CREATE F1 ASSIGNMENT FOR LIFETIME COMMISSION
          // ============================================
          console.log('[Affiliate] 🔗 Creating F1 assignment for lifetime commission...');
          await createF1Assignment(supabase, contactNumber, invoiceDetail.customerCode, customerName, affiliateVoucher.f0_id, affiliateVoucher.f0_code, affiliateVoucher.code, invoiceDetail.code, convertToVietnamTZ(invoiceDetail.createdDate));

          // ============================================
          // NOTE: DO NOT recalculate F0 tier here!
          // Tier is only recalculated when commission status = 'locked' or 'paid'
          // The cron-lock-commissions job will do this when locking the commission
          // ============================================
          console.log('[Affiliate] ℹ️ Tier will be recalculated when commission is locked (after lock period)');
        }
        // Step 11: Create notification for F0
        console.log('[Affiliate] 🔔 Creating notification for F0...');
        const notificationContent = {
          title: shouldRecheck ? 'Hoa hồng đã được cập nhật (chờ chốt)!' : 'Hoa hồng mới (chờ chốt)!',
          message: shouldRecheck
            ? `Hóa đơn ${invoiceDetail.code} đã thanh toán đủ! Bạn sẽ nhận được ${commission.totalCommission.toLocaleString()}đ hoa hồng từ ${customerName || contactNumber} sau ${lockPeriodText} chờ chốt.`
            : `Bạn sẽ nhận được ${commission.totalCommission.toLocaleString()}đ hoa hồng từ đơn hàng của ${customerName || contactNumber} sau ${lockPeriodText} chờ chốt.`,
          voucher_code: usedVoucherCode,
          invoice_code: invoiceDetail.code,
          commission_amount: commission.totalCommission,
          was_partial_payment: shouldRecheck,
          status: 'pending',
          lock_date: lockDate.toISOString(),
          lock_period_text: lockPeriodText,
          breakdown: {
            basic: commission.basicCommission?.amount || 0,
            firstOrder: commission.firstOrderCommission?.applied ? commission.firstOrderCommission.amount : 0,
            tierBonus: commission.tierBonus?.amount || 0
          }
        };
        await supabase.from('notifications').insert({
          f0_id: affiliateVoucher.f0_id,
          type: 'commission',
          content: notificationContent,
          is_read: false
        });
        console.log('[Affiliate] ✅ Notification created!');
      }
      console.log('====================================');
      console.log('[Affiliate] ✅ Webhook processed successfully!');
      console.log(`[Affiliate]    Voucher: ${usedVoucherCode}`);
      console.log(`[Affiliate]    F0: ${affiliateVoucher.f0_code}`);
      console.log(`[Affiliate]    Invoice: ${invoiceDetail.code}`);
      console.log(`[Affiliate]    Commission Valid: ${commission.isValid}`);
      console.log(`[Affiliate]    Was Re-check (partial payment): ${shouldRecheck}`);
      if (commission.isValid) {
        console.log(`[Affiliate]    Total Commission: ${commission.totalCommission.toLocaleString()}đ`);
      } else {
        console.log(`[Affiliate]    Invalid Reason: ${commission.invalidReasonCode}`);
      }
      console.log('====================================');
    } catch (error: any) {
      console.error('[Affiliate] ❌ Error in affiliate tracking:', error.message);
      console.error('[Affiliate] Stack:', error.stack);
    }
    return new Response('OK', {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
    });
  } catch (error: any) {
    console.error('====================================');
    console.error('[Affiliate] WEBHOOK PROCESSING ERROR');
    console.error('Error:', error?.message || error);
    console.error('Stack:', error?.stack || 'No stack trace');
    console.error('====================================');
    return new Response(JSON.stringify({
      error: error?.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
