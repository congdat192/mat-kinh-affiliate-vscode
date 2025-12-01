import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

console.info('get-f0-dashboard-stats v14 - Include adjustments tracking for cancelled invoices');

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

    // Separate client for kiotviet schema
    const supabaseKiotviet = createClient(supabaseUrl!, supabaseServiceKey!, {
      db: { schema: 'kiotviet' },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Run queries in parallel for better performance
    const [
      f0Result,
      vouchersResult,
      commissionsResult,
      withdrawalsResult,
      tiersResult,
      notificationsResult,
      adjustmentsResult  // v14: Add adjustments query
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

      // 3. Get commission stats from commission_records (exclude cancelled invoices for active stats)
      supabase.from('commission_records')
        .select('id, total_commission, status, basic_amount, first_order_amount, tier_bonus_amount, invoice_cancelled_at, invoice_cancelled_after_paid')
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
        .eq('f0_id', f0_id)
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

    // Get invoice codes from vouchers that have invoices
    const vouchersWithInvoices = vouchers.filter(v => v.invoice_code);
    const invoiceCodes = vouchersWithInvoices.map(v => v.invoice_code);

    let totalF1Revenue = 0;
    let qualifiedF1Count = 0;
    let fullyPaidInvoiceCount = 0;
    let partialPaidInvoiceCount = 0;
    const qualifiedVoucherCodes = new Set<string>();

    if (invoiceCodes.length > 0) {
      const { data: invoices, error: invoicesError } = await supabaseKiotviet
        .from('invoices')
        .select('code, total, totalpayment, statusvalue')
        .in('code', invoiceCodes);

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
      } else if (invoices) {
        const invoiceMap = new Map(invoices.map(i => [i.code, i]));

        for (const voucher of vouchersWithInvoices) {
          const invoice = invoiceMap.get(voucher.invoice_code);
          if (invoice) {
            const total = Number(invoice.total) || 0;
            const totalPayment = Number(invoice.totalpayment) || 0;

            // v14: Also check if invoice was cancelled
            // Find if this voucher's commission was cancelled due to invoice cancellation
            const relatedCommission = commissions.find(c =>
              c.invoice_cancelled_at &&
              vouchers.some(v => v.code === voucher.code)
            );

            // Only count if FULLY PAID and NOT cancelled
            if (total > 0 && total === totalPayment && invoice.statusvalue === 'Hoàn thành' && !relatedCommission?.invoice_cancelled_at) {
              totalF1Revenue += total;
              fullyPaidInvoiceCount++;
              qualifiedVoucherCodes.add(voucher.code);
            } else if (totalPayment > 0 && totalPayment < total) {
              partialPaidInvoiceCount++;
            }
          }
        }

        qualifiedF1Count = qualifiedVoucherCodes.size;
      }
    }

    // v14: Apply F1 adjustment from cancelled invoices
    const adjustedF1Count = Math.max(0, qualifiedF1Count + totalF1Adjustment);
    // v14: Apply revenue adjustment
    const adjustedF1Revenue = Math.max(0, totalF1Revenue + totalRevenueAdjustment);

    console.log(`=== TIER CALCULATION (v14 with adjustments) ==`);
    console.log(`Raw Qualified F1: ${qualifiedF1Count}, Adjusted: ${adjustedF1Count}`);
    console.log(`Raw Revenue: ${totalF1Revenue}, Adjusted: ${adjustedF1Revenue}`);

    // Calculate commission stats - v14: exclude cancelled and handle cancelled-after-paid
    const activeCommissions = commissions.filter(c =>
      c.status !== 'cancelled' &&
      !c.invoice_cancelled_at  // Exclude any with cancelled invoice (unless paid before cancel)
    );

    // Commissions that were paid before invoice was cancelled (these are kept)
    const paidBeforeCancelledCommissions = commissions.filter(c =>
      c.status === 'paid' && c.invoice_cancelled_after_paid === true
    );

    const availableCommissions = activeCommissions.filter(c => c.status === 'available');
    const processingCommissions = activeCommissions.filter(c => c.status === 'processing');
    // Include paid-before-cancelled in paid count
    const paidCommissions = [
      ...activeCommissions.filter(c => c.status === 'paid'),
      ...paidBeforeCancelledCommissions
    ];
    const cancelledCommissions = commissions.filter(c => c.status === 'cancelled');

    const totalCommission = activeCommissions.reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0);
    const availableCommission = availableCommissions.reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0);
    const processingCommission = processingCommissions.reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0);
    const paidCommission = paidCommissions.reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0);
    const cancelledCommission = cancelledCommissions.reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0);

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

    const availableBalance = Math.max(0, availableCommission - pendingWithdrawals);

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

        // Commission stats
        totalCommission,
        availableCommission,
        processingCommission,
        paidCommission,
        cancelledCommission,  // v14: Add cancelled commission
        availableBalance,

        // Commission breakdown
        basicCommissionTotal,
        firstOrderCommissionTotal,
        tierBonusTotal,

        // Withdrawal stats
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
      unreadNotifications: notificationsResult.count || 0
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
