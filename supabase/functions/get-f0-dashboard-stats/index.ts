import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

console.info('get-f0-dashboard-stats v17 - Added lock_payment_settings for dynamic lock period display');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { f0_id } = await req.json();

    if (!f0_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Thiếu thông tin F0 ID',
        code: 'MISSING_F0_ID'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      db: { schema: 'api' },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // NOTE: Removed kiotviet schema client - now using commission_records for F1 stats

    // Run queries in parallel for better performance
    const [
      f0Result,
      vouchersResult,
      commissionsResult,
      withdrawalsResult,
      tiersResult,
      notificationsResult,
      adjustmentsResult,  // v14: Add adjustments query
      lockSettingsResult  // v17: Add lock payment settings
    ] = await Promise.all([
      // 1. Get F0 partner info
      supabase.from('f0_partners')
        .select('id, full_name, f0_code, email, phone, is_active, is_approved, created_at, current_tier')
        .eq('id', f0_id)
        .single(),

      // 2. Get referral stats from voucher_affiliate_tracking
      supabase.from('voucher_affiliate_tracking')
        .select('code, activation_status, created_at, recipient_name, recipient_phone, campaign_code, invoice_code, invoice_amount, invoice_status, commission_status')
        .eq('f0_id', f0_id)
        .order('created_at', { ascending: false }),

      // 3. Get commission stats from commission_records (include invoice_amount and f1_customer_id for F1 stats)
      supabase.from('commission_records')
        .select('id, total_commission, status, basic_amount, first_order_amount, tier_bonus_amount, invoice_cancelled_at, invoice_cancelled_after_paid, invoice_amount, f1_customer_id')
        .eq('f0_id', f0_id),

      // 4. Get withdrawal stats
      supabase.from('withdrawal_requests')
        .select('amount, status')
        .eq('f0_id', f0_id),

      // 5. Get tier info
      supabase.from('f0_tiers')
        .select('tier_code, tier_name, tier_level, requirements, benefits, display')
        .eq('is_active', true)
        .order('tier_level', { ascending: true }),

      // 6. Get unread notifications count
      supabase.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('f0_id', f0_id)
        .eq('is_read', false),

      // 7. v14: Get stats adjustments
      supabase.from('f0_stats_adjustments')
        .select('*')
        .eq('f0_id', f0_id),

      // 8. v17: Get lock payment settings
      supabase.from('lock_payment_settings')
        .select('lock_period_days, payment_day')
        .eq('is_active', true)
        .single()
    ]);

    // Check F0 exists
    if (f0Result.error || !f0Result.data) {
      console.error('F0 query error:', f0Result.error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Không tìm thấy thông tin F0',
        code: 'F0_NOT_FOUND'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const f0Data = f0Result.data;
    const vouchers = vouchersResult.data || [];
    const commissions = commissionsResult.data || [];
    const withdrawals = withdrawalsResult.data || [];
    const tiers = tiersResult.data || [];
    const adjustments = adjustmentsResult.data || [];

    // v17: Extract lock settings with fallback defaults
    const lockSettings = lockSettingsResult.data || { lock_period_days: 15, payment_day: 5 };
    console.log(`=== LOCK SETTINGS (v17) ===`);
    console.log(`Lock period: ${lockSettings.lock_period_days} days, Payment day: ${lockSettings.payment_day}`);

    if (tiers.length === 0) {
      console.log('WARNING: Tiers query returned empty! Error:', tiersResult.error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Không thể tải thông tin tier',
        code: 'TIERS_QUERY_FAILED'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ========================================
    // v14: Calculate adjustments totals
    // ========================================
    const totalF1Adjustment = adjustments.reduce((sum, a) => sum + (a.f1_adjustment || 0), 0);
    const totalRevenueAdjustment = adjustments.reduce((sum, a) => sum + (Number(a.revenue_adjustment) || 0), 0);
    const totalCommissionAdjustment = adjustments.reduce((sum, a) => sum + (Number(a.commission_adjustment) || 0), 0);
    const invoicesCancelledAfterPaid = adjustments.filter(a => a.adjustment_type === 'INVOICE_CANCELLED_AFTER_PAID').length;
    const invoicesCancelledBeforePaid = adjustments.filter(a => a.adjustment_type === 'INVOICE_CANCELLED_BEFORE_PAID').length;

    console.log(`=== ADJUSTMENTS ===`);
    console.log(`F1 adjustment: ${totalF1Adjustment}`);
    console.log(`Revenue adjustment: ${totalRevenueAdjustment}`);
    console.log(`Commission adjustment: ${totalCommissionAdjustment}`);
    console.log(`Cancelled after paid: ${invoicesCancelledAfterPaid}, before paid: ${invoicesCancelledBeforePaid}`);

    // Calculate referral stats
    const totalReferrals = vouchers.length;
    const activeCustomers = vouchers.filter(v =>
      v.activation_status === 'Đã kích hoạt' || v.activation_status === 'Đã sử dụng'
    ).length;

    // Calculate quarter date range
    const now = new Date();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const totalReferralsThisQuarter = vouchers.filter(v => new Date(v.created_at) >= quarterStart).length;

    // ========================================
    // v16: Calculate F1 stats from commission_records with LOCK SYSTEM
    // Status flow: pending → locked → paid
    // EXP only counts when status = 'locked' or 'paid' (not pending)
    // ========================================

    // Filter valid commissions for EXP calculation (locked or paid only - NOT pending)
    const validCommissions = commissions.filter(c =>
      (c.status === 'locked' || c.status === 'paid')
      // Note: locked commissions are not affected by invoice cancellation
    );

    // Calculate total F1 revenue from valid commissions
    const totalF1Revenue = validCommissions.reduce((sum, c) => sum + (Number(c.invoice_amount) || 0), 0);

    // Count unique F1 customers from valid commissions
    const uniqueF1Customers = new Set(validCommissions.map(c => c.f1_customer_id).filter(Boolean));
    const qualifiedF1Count = uniqueF1Customers.size;

    // Invoice counts
    const fullyPaidInvoiceCount = validCommissions.length;
    const partialPaidInvoiceCount = vouchers.filter(v =>
      v.invoice_code &&
      !validCommissions.some(c => c.f1_customer_id) // Has invoice but no valid commission
    ).length;

    console.log(`=== F1 STATS (v16 LOCK SYSTEM from commission_records) ===`);
    console.log(`Valid commissions (locked+paid): ${validCommissions.length}`);
    console.log(`Total F1 Revenue: ${totalF1Revenue}`);
    console.log(`Unique F1 Customers: ${qualifiedF1Count}`);

    // v14: Apply F1 adjustment from cancelled invoices
    const adjustedF1Count = Math.max(0, qualifiedF1Count + totalF1Adjustment);
    // v14: Apply revenue adjustment
    const adjustedF1Revenue = Math.max(0, totalF1Revenue + totalRevenueAdjustment);

    console.log(`=== TIER CALCULATION (v14 with adjustments) ==`);
    console.log(`Raw Qualified F1: ${qualifiedF1Count}, Adjusted: ${adjustedF1Count}`);
    console.log(`Raw Revenue: ${totalF1Revenue}, Adjusted: ${adjustedF1Revenue}`);

    // ========================================
    // v16: Calculate commission stats with LOCK SYSTEM
    // Status: pending → locked → paid | cancelled
    // ========================================

    // Active commissions = not cancelled
    const activeCommissions = commissions.filter(c => c.status !== 'cancelled');

    // Pending: Waiting for lock period to expire
    const pendingCommissions = commissions.filter(c => c.status === 'pending');

    // Locked: Lock period expired, EXP counted, waiting for payment
    const lockedCommissions = commissions.filter(c => c.status === 'locked');

    // Paid: Already paid out
    const paidCommissions = commissions.filter(c => c.status === 'paid');

    // Cancelled: Invoice cancelled before lock period
    const cancelledCommissions = commissions.filter(c => c.status === 'cancelled');

    // Calculate amounts
    const pendingCommission = pendingCommissions.reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0);
    const lockedCommission = lockedCommissions.reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0);
    const paidCommission = paidCommissions.reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0);
    const cancelledCommission = cancelledCommissions.reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0);

    // Total = pending + locked + paid (excludes cancelled)
    const totalCommission = pendingCommission + lockedCommission + paidCommission;

    // Available = locked (ready for admin to pay) - deprecated concept in new system
    const availableCommission = lockedCommission;

    // For backward compatibility
    const processingCommission = 0;

    console.log(`=== COMMISSION STATS (v16 LOCK SYSTEM) ===`);
    console.log(`Pending: ${pendingCommissions.length} (${pendingCommission.toLocaleString()}đ)`);
    console.log(`Locked: ${lockedCommissions.length} (${lockedCommission.toLocaleString()}đ)`);
    console.log(`Paid: ${paidCommissions.length} (${paidCommission.toLocaleString()}đ)`);
    console.log(`Cancelled: ${cancelledCommissions.length} (${cancelledCommission.toLocaleString()}đ)`);

    // Commission breakdown
    const basicCommissionTotal = activeCommissions.reduce((sum, c) => sum + (Number(c.basic_amount) || 0), 0);
    const firstOrderCommissionTotal = activeCommissions.reduce((sum, c) => sum + (Number(c.first_order_amount) || 0), 0);
    const tierBonusTotal = activeCommissions.reduce((sum, c) => sum + (Number(c.tier_bonus_amount) || 0), 0);

    // Calculate withdrawal stats
    const pendingWithdrawals = withdrawals
      .filter(w => w.status === 'pending' || w.status === 'processing')
      .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    const completedWithdrawals = withdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

    // Note: availableBalance is deprecated - now using lockedCommission directly

    // Determine tier using adjusted counts
    let currentTierIndex = 0;
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const minReferrals = tier.requirements?.min_referrals || 0;
      const minRevenue = tier.requirements?.min_revenue || 0;

      if (adjustedF1Count >= minReferrals && adjustedF1Revenue >= minRevenue) {
        currentTierIndex = i;
      } else {
        break;
      }
    }

    const currentTierData = tiers[currentTierIndex];
    const nextTierData = tiers[currentTierIndex + 1] || null;

    const currentTier = (currentTierData?.tier_code || 'BRONZE').toLowerCase();
    const currentTierName = currentTierData?.tier_name || 'Đồng';
    const nextTier = nextTierData ? nextTierData.tier_code.toLowerCase() : null;
    const nextTierName = nextTierData?.tier_name || null;
    const nextTierMinReferrals = nextTierData?.requirements?.min_referrals || 0;
    const nextTierMinRevenue = nextTierData?.requirements?.min_revenue || 0;

    const referralsToNextTier = nextTierData ? Math.max(0, nextTierMinReferrals - adjustedF1Count) : 0;
    const revenueToNextTier = nextTierData ? Math.max(0, nextTierMinRevenue - adjustedF1Revenue) : 0;

    // Update F0's current_tier if changed
    const storedTier = (f0Data.current_tier || 'BRONZE').toLowerCase();
    if (storedTier !== currentTier) {
      console.log(`Updating F0 tier: ${storedTier} -> ${currentTier}`);
      await supabase.from('f0_partners')
        .update({ current_tier: currentTier.toUpperCase() })
        .eq('id', f0_id);
    }

    // Get recent activity
    const recentActivity = vouchers.slice(0, 5).map(v => ({
      id: v.code,
      customerName: v.recipient_name || 'Khách hàng',
      phone: v.recipient_phone,
      voucherCode: v.code,
      status: v.activation_status,
      commissionStatus: v.commission_status,
      date: v.created_at,
      campaignCode: v.campaign_code
    }));

    // Build response
    const dashboardData = {
      f0Info: {
        id: f0Data.id,
        fullName: f0Data.full_name,
        f0Code: f0Data.f0_code,
        email: f0Data.email,
        phone: f0Data.phone,
        isActive: f0Data.is_active,
        isApproved: f0Data.is_approved,
        joinedAt: f0Data.created_at
      },
      stats: {
        totalReferrals,
        activeCustomers,
        referralsThisQuarter: adjustedF1Count,  // v14: Use adjusted count
        totalReferralsThisQuarter,

        // v16: Commission stats with LOCK SYSTEM
        totalCommission,
        pendingCommission,      // NEW: Waiting for lock period
        lockedCommission,       // NEW: Locked, ready for payment
        paidCommission,
        cancelledCommission,

        // Backward compatibility
        availableCommission,    // = lockedCommission (deprecated name)
        processingCommission,   // = 0 (deprecated)
        availableBalance: lockedCommission,  // = lockedCommission (deprecated)

        // v16: Commission counts
        pendingCount: pendingCommissions.length,
        lockedCount: lockedCommissions.length,
        paidCount: paidCommissions.length,
        cancelledCount: cancelledCommissions.length,

        // Commission breakdown
        basicCommissionTotal,
        firstOrderCommissionTotal,
        tierBonusTotal,

        // Withdrawal stats (deprecated - admin pays directly now)
        pendingWithdrawals,
        completedWithdrawals,

        // Revenue
        totalF1Revenue: adjustedF1Revenue,  // v14: Use adjusted revenue
        rawF1Revenue: totalF1Revenue,  // v14: Also provide raw for reference

        // Invoice breakdown
        fullyPaidInvoiceCount,
        partialPaidInvoiceCount,

        // F1 counts
        qualifiedF1Count: adjustedF1Count,  // v14: Use adjusted
        rawQualifiedF1Count: qualifiedF1Count,  // v14: Raw for reference

        // v14: Adjustments summary
        adjustments: {
          f1Adjustment: totalF1Adjustment,
          revenueAdjustment: totalRevenueAdjustment,
          commissionAdjustment: totalCommissionAdjustment,
          invoicesCancelledAfterPaid,
          invoicesCancelledBeforePaid,
          totalCancelledInvoices: invoicesCancelledAfterPaid + invoicesCancelledBeforePaid
        }
      },
      tier: {
        current: currentTier,
        currentName: currentTierName,
        next: nextTier,
        nextName: nextTierName,
        referralsToNextTier,
        revenueToNextTier,
        currentMinReferrals: currentTierData?.requirements?.min_referrals || 0,
        currentMinRevenue: currentTierData?.requirements?.min_revenue || 0,
        nextMinReferrals: nextTierMinReferrals,
        nextMinRevenue: nextTierMinRevenue,
        tierList: tiers.map(t => ({
          code: t.tier_code.toLowerCase(),
          name: t.tier_name,
          level: t.tier_level,
          minReferrals: t.requirements?.min_referrals || 0,
          minRevenue: t.requirements?.min_revenue || 0,
          benefits: t.benefits,
          display: t.display
        }))
      },
      recentActivity,
      unreadNotifications: notificationsResult.count || 0,
      // v17: Lock payment settings for dynamic display
      lockSettings: {
        lockPeriodDays: lockSettings.lock_period_days,
        paymentDay: lockSettings.payment_day
      }
    };

    return new Response(JSON.stringify({
      success: true,
      data: dashboardData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Lỗi hệ thống',
      code: 'SYSTEM_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
