import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

console.info('Cron affiliate commission sync started - v1');

// ============================================
// HELPER FUNCTIONS
// ============================================
function getVietnamTime() {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 7 * 3600000);
}

function convertToVietnamTZ(dateString: string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toISOString();
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

function errorResponse(message: string, errorCode: string, status = 400, details: any = null) {
  const responseBody: any = {
    success: false,
    error: message,
    error_code: errorCode
  };
  if (details) {
    responseBody.error_details = details;
  }
  return new Response(JSON.stringify(responseBody), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

// ============================================
// RECALCULATE F0 TIER (copied from webhook v9)
// ============================================
async function recalculateF0Tier(supabase: any, f0Id: string, f0Code: string) {
  console.log(`[Tier] 🔄 Recalculating tier for F0: ${f0Code}`);

  try {
    const { data: tiers, error: tiersError } = await supabase
      .from('f0_tiers')
      .select('*')
      .eq('is_active', true)
      .order('tier_level', { ascending: false });

    if (tiersError || !tiers || tiers.length === 0) {
      console.error('[Tier] ❌ Error fetching tiers:', tiersError?.message);
      return null;
    }

    const { data: stats, error: statsError } = await supabase
      .from('commission_records')
      .select('id, invoice_amount, f1_customer_id')
      .eq('f0_id', f0Id)
      .in('status', ['available', 'paid'])
      .is('invoice_cancelled_at', null);

    if (statsError) {
      console.error('[Tier] ❌ Error fetching commission stats:', statsError.message);
      return null;
    }

    const totalOrders = stats?.length || 0;
    const totalRevenue = stats?.reduce((sum: number, r: any) => sum + Number(r.invoice_amount || 0), 0) || 0;
    const uniqueF1s = new Set(stats?.map((r: any) => r.f1_customer_id).filter(Boolean));
    const totalReferrals = uniqueF1s.size;

    console.log(`[Tier] 📊 F0 Stats: Orders=${totalOrders}, Revenue=${totalRevenue}, Referrals=${totalReferrals}`);

    let newTier = tiers[tiers.length - 1];

    for (const tier of tiers) {
      const req = tier.requirements || {};
      const minReferrals = req.min_referrals || 0;
      const minRevenue = req.min_revenue || 0;
      const minOrders = req.min_orders || 0;

      if (totalReferrals >= minReferrals && totalRevenue >= minRevenue && totalOrders >= minOrders) {
        newTier = tier;
        console.log(`[Tier] ✅ Qualifies for ${tier.tier_code}`);
        break;
      }
    }

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

    if (currentTier !== newTier.tier_code) {
      console.log(`[Tier] 🎉 TIER UPGRADE: ${currentTier} → ${newTier.tier_code}`);

      await supabase
        .from('f0_partners')
        .update({
          current_tier: newTier.tier_code,
          updated_at: getVietnamTime().toISOString()
        })
        .eq('id', f0Id);

      if (newTier.tier_level > (tiers.find((t: any) => t.tier_code === currentTier)?.tier_level || 1)) {
        await supabase.from('notifications').insert({
          f0_id: f0Id,
          type: 'system',
          content: {
            title: '🎉 Chúc mừng! Bạn đã lên hạng!',
            message: `Bạn đã đạt thứ hạng ${newTier.tier_name} (${newTier.tier_code})!`,
            old_tier: currentTier,
            new_tier: newTier.tier_code
          },
          is_read: false
        });
      }

      return { upgraded: true, oldTier: currentTier, newTier: newTier.tier_code };
    } else {
      return { upgraded: false, currentTier };
    }
  } catch (error: any) {
    console.error('[Tier] ❌ Error in recalculateF0Tier:', error.message);
    return null;
  }
}

// ============================================
// CREATE F1 ASSIGNMENT
// ============================================
async function createF1Assignment(supabase: any, f1Phone: string, f1CustomerId: string, f1Name: string, f0Id: string, f0Code: string, voucherCode: string, invoiceCode: string, invoiceDate: string | null) {
  console.log(`[F1 Assignment] Creating assignment for F1: ${f1Phone} -> F0: ${f0Code}`);
  const normalizedPhone = normalizePhone(f1Phone);

  const { data: existing } = await supabase
    .from('f1_customer_assignments')
    .select('id, f0_code')
    .eq('f1_phone', normalizedPhone)
    .maybeSingle();

  if (existing) {
    console.log(`[F1 Assignment] ⚠️ F1 already assigned to ${existing.f0_code}`);
    return existing;
  }

  const { data: newAssignment, error: insertError } = await supabase
    .from('f1_customer_assignments')
    .insert({
      f1_phone: normalizedPhone,
      f1_customer_id: f1CustomerId,
      f1_name: f1Name,
      f0_id: f0Id,
      f0_code: f0Code,
      first_voucher_code: voucherCode,
      first_invoice_code: invoiceCode,
      first_invoice_date: invoiceDate,
      is_active: true
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[F1 Assignment] ❌ Error:', insertError.message);
    return null;
  }

  console.log(`[F1 Assignment] ✅ Created: ${newAssignment.id}`);
  return newAssignment;
}

// ============================================
// CALCULATE FIRST ORDER COMMISSION
// ============================================
async function calculateFirstOrderCommission(supabase: any, invoiceAmount: number, actualUserPhone: string, voucherRecipientPhone: string, voucherCustomerType: string, f0Partner: any) {
  const result: any = {
    isValid: false,
    invalidReasonCode: null,
    invalidReasonText: null,
    basicCommission: null,
    firstOrderCommission: null,
    tierBonus: null,
    subtotalCommission: 0,
    totalCommission: 0
  };

  // Check if actual user is NEW customer
  const normalizedActualPhone = normalizePhone(actualUserPhone);
  const normalizedRecipientPhone = normalizePhone(voucherRecipientPhone);

  const { data: existingCustomer } = await supabase
    .from('customers_backup')
    .select('code, contactnumber, name')
    .eq('contactnumber', normalizedActualPhone)
    .maybeSingle();

  let actualCustomerType;
  if (normalizedActualPhone === normalizedRecipientPhone) {
    actualCustomerType = voucherCustomerType;
  } else {
    actualCustomerType = existingCustomer ? 'old' : 'new';
  }

  if (actualCustomerType === 'old') {
    result.invalidReasonCode = 'CUSTOMER_NOT_NEW';
    result.invalidReasonText = `Khách hàng không phải khách mới. SĐT: ${actualUserPhone}`;
    return result;
  }

  result.isValid = true;

  // Get commission settings
  const { data: commissionSettings } = await supabase
    .from('commission_settings')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (!commissionSettings) {
    result.invalidReasonCode = 'SETTINGS_NOT_FOUND';
    result.invalidReasonText = 'Không thể tải cấu hình hoa hồng';
    result.isValid = false;
    return result;
  }

  const f0TierCode = f0Partner.current_tier || 'BRONZE';
  const { data: f0Tier } = await supabase
    .from('f0_tiers')
    .select('*')
    .eq('tier_code', f0TierCode.toUpperCase())
    .eq('is_active', true)
    .single();

  // Basic commission
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
  }

  // First order commission
  const firstOrderSetting = commissionSettings.find((s: any) => s.conditions.applies_to === 'first_order');
  if (firstOrderSetting) {
    const minOrderValue = firstOrderSetting.config.min_order_value || 0;
    const maxCap = firstOrderSetting.config.max_commission;
    if (invoiceAmount >= minOrderValue) {
      const rate = firstOrderSetting.config.value / 100;
      let amount = invoiceAmount * rate;
      if (maxCap && amount > maxCap) amount = maxCap;
      result.firstOrderCommission = {
        settingId: firstOrderSetting.id,
        settingName: firstOrderSetting.name,
        rate: firstOrderSetting.config.value,
        amount: Math.round(amount),
        maxCap,
        minOrder: minOrderValue,
        applied: true
      };
      result.subtotalCommission += result.firstOrderCommission.amount;
    }
  }

  // Tier bonus
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
  }

  result.totalCommission = result.subtotalCommission + (result.tierBonus?.amount || 0);
  return result;
}

// ============================================
// PROCESS SINGLE VOUCHER
// ============================================
async function processVoucher(supabase: any, voucher: any) {
  const now = getVietnamTime().toISOString();
  console.log(`\n[Cron] Processing voucher: ${voucher.voucher_code}`);
  console.log(`[Cron]   F0: ${voucher.f0_code}`);
  console.log(`[Cron]   Invoice: ${voucher.invoice_code}`);
  console.log(`[Cron]   Previous status: ${voucher.commission_status}`);

  // Get F0 partner info
  const { data: f0Partner, error: f0Error } = await supabase
    .from('f0_partners')
    .select('id, f0_code, full_name, current_tier')
    .eq('id', voucher.f0_id)
    .single();

  if (f0Error || !f0Partner) {
    console.error(`[Cron] ❌ F0 partner not found: ${f0Error?.message}`);
    return { success: false, error: 'F0_NOT_FOUND' };
  }

  // Get customer info from invoice
  const { data: customer } = await supabase
    .from('customers_backup')
    .select('code, contactnumber, name')
    .eq('code', voucher.invoice_customer_code)
    .single();

  const customerPhone = customer?.contactnumber || '';
  const customerName = customer?.name || voucher.invoice_customer_name || '';

  // Calculate commission
  const commission = await calculateFirstOrderCommission(
    supabase,
    Number(voucher.invoice_total),
    customerPhone,
    voucher.recipient_phone,
    voucher.customer_type,
    f0Partner
  );

  // Update voucher_affiliate_tracking
  const updateFields: any = {
    actual_user_phone: customerPhone,
    actual_user_name: customerName,
    actual_user_id: voucher.invoice_customer_code,
    actual_customer_type: commission.isValid ? 'new' : (commission.invalidReasonCode === 'CUSTOMER_NOT_NEW' ? 'old' : null),
    commission_status: commission.isValid ? 'available' : 'invalid',
    invalid_reason_code: commission.isValid ? null : commission.invalidReasonCode,
    invalid_reason_text: commission.isValid ? null : commission.invalidReasonText,
    commission_calculated_at: now,
    updated_at: now,
    note: commission.isValid
      ? `[Cron Sync] Hoa hồng: ${commission.totalCommission.toLocaleString()}đ`
      : `[Cron Sync] ${commission.invalidReasonText || 'Không đủ điều kiện'}`
  };

  await supabase
    .from('voucher_affiliate_tracking')
    .update(updateFields)
    .eq('code', voucher.voucher_code);

  // If valid, create commission record
  if (commission.isValid && commission.totalCommission > 0) {
    console.log(`[Cron] ✅ Commission valid: ${commission.totalCommission.toLocaleString()}đ`);

    const commissionRecord = {
      voucher_code: voucher.voucher_code,
      f0_id: voucher.f0_id,
      f0_code: voucher.f0_code,
      invoice_id: String(voucher.invoice_id),
      invoice_code: voucher.invoice_code,
      invoice_amount: voucher.invoice_total,
      invoice_date: convertToVietnamTZ(voucher.invoice_created_date),
      invoice_status: voucher.invoice_statusvalue,
      f1_phone: customerPhone,
      f1_name: customerName,
      f1_customer_id: voucher.invoice_customer_code,
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
      tier_setting_id: commission.tierBonus?.tierId || null,
      tier_code: commission.tierBonus?.tierCode || null,
      tier_name: commission.tierBonus?.tierName || null,
      tier_bonus_rate: commission.tierBonus?.rate || null,
      tier_bonus_amount: commission.tierBonus?.amount || null,
      subtotal_commission: commission.subtotalCommission,
      total_commission: commission.totalCommission,
      status: 'available',
      is_lifetime_commission: false,
      notes: '[Cron Sync] Commission created by backup cron job'
    };

    const { data: newCommission, error: commissionError } = await supabase
      .from('commission_records')
      .insert(commissionRecord)
      .select('id')
      .single();

    if (commissionError) {
      console.error(`[Cron] ❌ Failed to create commission: ${commissionError.message}`);
      return { success: false, error: 'COMMISSION_INSERT_FAILED', details: commissionError };
    }

    // Update voucher with commission_record_id
    await supabase
      .from('voucher_affiliate_tracking')
      .update({ commission_record_id: newCommission.id })
      .eq('code', voucher.voucher_code);

    // Create F1 assignment
    await createF1Assignment(
      supabase,
      customerPhone,
      voucher.invoice_customer_code,
      customerName,
      voucher.f0_id,
      voucher.f0_code,
      voucher.voucher_code,
      voucher.invoice_code,
      convertToVietnamTZ(voucher.invoice_created_date)
    );

    // Recalculate F0 tier
    const tierResult = await recalculateF0Tier(supabase, voucher.f0_id, voucher.f0_code);
    if (tierResult?.upgraded) {
      console.log(`[Cron] 🎉 F0 tier upgraded: ${tierResult.oldTier} → ${tierResult.newTier}`);
    }

    // Create notification
    await supabase.from('notifications').insert({
      f0_id: voucher.f0_id,
      type: 'commission',
      content: {
        title: 'Hoa hồng đã được cập nhật!',
        message: `Hóa đơn ${voucher.invoice_code} đã thanh toán đủ! Bạn nhận được ${commission.totalCommission.toLocaleString()}đ hoa hồng.`,
        voucher_code: voucher.voucher_code,
        invoice_code: voucher.invoice_code,
        commission_amount: commission.totalCommission,
        source: 'cron_sync'
      },
      is_read: false
    });

    return { success: true, commission: commission.totalCommission, commissionId: newCommission.id };
  } else {
    console.log(`[Cron] ⚠️ Commission invalid: ${commission.invalidReasonCode}`);
    return { success: true, commission: 0, reason: commission.invalidReasonCode };
  }
}

// ============================================
// MAIN HANDLER
// ============================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('====================================');
  console.log('[Cron] Starting affiliate commission sync...');
  console.log(`[Cron] Time: ${getVietnamTime().toISOString()}`);
  console.log('====================================');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse('Missing Supabase config', 'CONFIG_ERROR', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'api' }
    });

    // Query vouchers that need processing (limit 50 per run)
    const { data: vouchers, error: queryError } = await supabase
      .from('vouchers_need_commission_check')
      .select('*')
      .limit(50);

    if (queryError) {
      console.error('[Cron] ❌ Query error:', queryError.message);
      return errorResponse('Failed to query vouchers', 'QUERY_ERROR', 500, queryError);
    }

    console.log(`[Cron] Found ${vouchers?.length || 0} vouchers to process`);

    if (!vouchers || vouchers.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No vouchers need processing',
        processed: 0,
        duration_ms: Date.now() - startTime
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Process each voucher
    const results = {
      total: vouchers.length,
      success: 0,
      failed: 0,
      totalCommission: 0,
      details: [] as any[]
    };

    for (const voucher of vouchers) {
      try {
        const result = await processVoucher(supabase, voucher);
        if (result.success) {
          results.success++;
          results.totalCommission += result.commission || 0;
        } else {
          results.failed++;
        }
        results.details.push({
          voucher_code: voucher.voucher_code,
          ...result
        });
      } catch (error: any) {
        console.error(`[Cron] ❌ Error processing ${voucher.voucher_code}:`, error.message);
        results.failed++;
        results.details.push({
          voucher_code: voucher.voucher_code,
          success: false,
          error: error.message
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log('====================================');
    console.log(`[Cron] ✅ Sync completed!`);
    console.log(`[Cron]    Total: ${results.total}`);
    console.log(`[Cron]    Success: ${results.success}`);
    console.log(`[Cron]    Failed: ${results.failed}`);
    console.log(`[Cron]    Commission: ${results.totalCommission.toLocaleString()}đ`);
    console.log(`[Cron]    Duration: ${duration}ms`);
    console.log('====================================');

    return new Response(JSON.stringify({
      success: true,
      message: 'Commission sync completed',
      results: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        total_commission: results.totalCommission
      },
      details: results.details,
      duration_ms: duration
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('[Cron] ❌ FATAL ERROR:', error.message);
    return errorResponse(error.message, 'INTERNAL_ERROR', 500, { stack: error.stack });
  }
});
