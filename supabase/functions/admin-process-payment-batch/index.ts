import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

console.info('Admin process payment batch started - v8 (Added approved_commission_ids filter + direct batch completion)');

// v3: Interface for rejected commissions
interface RejectedCommission {
  id: string;
  reason: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getVietnamTime() {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 7 * 3600000);
}

function toVietnamISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+07:00`;
}

// ============================================
// MAIN HANDLER
// ============================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Payment] Missing Supabase environment variables');
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Supabase client - use service role key for full access
    // Note: db.schema config may not work reliably in Edge Functions
    // We'll use explicit .schema('api') for each query instead
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const {
      // v2: Support both modes
      f0_ids,             // Optional: Array of F0 IDs to pay (selective mode)
      payment_month,      // Optional if f0_ids provided, Required otherwise: '2025-11'
      admin_user_id,      // Required: UUID of admin user
      admin_user_name,    // Required: Name of admin user
      notes,              // Optional: Notes for this payment batch
      // v3: Selective rejection
      rejected_commissions, // Optional: Array<{ id: string; reason: string }>
      // v8: Specific commission IDs to pay (filter within F0)
      approved_commission_ids // Optional: Array of commission IDs to pay (for selective approval within F0)
    } = body;

    // v3: Generate tracking ID for structured logging
    const trackingId = crypto.randomUUID();

    // Validate required fields
    if (!admin_user_id || !admin_user_name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'admin_user_id and admin_user_name are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // v2: Determine payment mode
    const isSelectiveMode = f0_ids && Array.isArray(f0_ids) && f0_ids.length > 0;

    // If not selective mode, payment_month is required
    if (!isSelectiveMode && !payment_month) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either f0_ids (array) or payment_month (YYYY-MM) is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate payment_month format if provided
    if (payment_month) {
      const monthRegex = /^\d{4}-\d{2}$/;
      if (!monthRegex.test(payment_month)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid payment_month format. Use YYYY-MM (e.g., 2025-11)'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const now = getVietnamTime();
    const nowIso = toVietnamISOString(now);
    const paymentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // v8: Check if specific commission IDs were provided
    const hasApprovedIds = approved_commission_ids && Array.isArray(approved_commission_ids) && approved_commission_ids.length > 0;

    console.log(JSON.stringify({
      tracking_id: trackingId,
      timestamp: new Date().toISOString(),
      function: 'admin-process-payment-batch',
      event: 'START',
      data: {
        mode: isSelectiveMode ? 'selective' : 'monthly',
        f0_count: isSelectiveMode ? f0_ids.length : null,
        payment_month,
        admin_user_name,
        rejected_count: rejected_commissions?.length || 0,
        approved_commission_ids_count: hasApprovedIds ? approved_commission_ids.length : 0
      }
    }));

    // v3: Process rejected commissions FIRST (before payment query)
    const rejectedIds: string[] = [];
    let rejectedCount = 0;

    if (rejected_commissions && Array.isArray(rejected_commissions) && rejected_commissions.length > 0) {
      console.log(JSON.stringify({
        tracking_id: trackingId,
        timestamp: new Date().toISOString(),
        function: 'admin-process-payment-batch',
        event: 'PROCESS_REJECTIONS_START',
        data: { rejected_count: rejected_commissions.length }
      }));

      for (const rejected of rejected_commissions as RejectedCommission[]) {
        const { error: rejectError } = await supabase
          .schema('api')
          .from('commission_records')
          .update({
            status: 'cancelled',
            cancelled_at: nowIso,
            cancelled_by: admin_user_id,
            cancelled_by_name: admin_user_name,
            cancelled_reason: rejected.reason,
            updated_at: nowIso
          })
          .eq('id', rejected.id);

        if (rejectError) {
          console.error(`[Payment] ❌ Failed to reject commission ${rejected.id}:`, rejectError.message);
        } else {
          rejectedIds.push(rejected.id);
          rejectedCount++;
          console.log(`[Payment] ✅ Rejected commission ${rejected.id}: ${rejected.reason}`);
        }
      }

      console.log(JSON.stringify({
        tracking_id: trackingId,
        timestamp: new Date().toISOString(),
        function: 'admin-process-payment-batch',
        event: 'PROCESS_REJECTIONS_END',
        data: { rejected_count: rejectedCount, rejected_ids: rejectedIds }
      }));
    }

    // Step 1: Build query based on mode - MUST use .schema('api') explicitly
    let query = supabase
      .schema('api')
      .from('commission_records')
      .select('id, f0_id, f0_code, voucher_code, invoice_code, total_commission, f1_phone, f1_name, commission_month')
      .eq('status', 'locked');

    if (isSelectiveMode) {
      // Selective mode: filter by F0 IDs
      query = query.in('f0_id', f0_ids);

      // v8: If specific commission IDs are provided, filter by them
      // This is the key fix for Bug #1 - only pay selected commissions, not all for F0
      if (hasApprovedIds) {
        query = query.in('id', approved_commission_ids);
        console.log(`[Payment] v8: Filtering by ${approved_commission_ids.length} specific commission IDs`);
      }

      // Optionally also filter by month if provided
      if (payment_month) {
        query = query.eq('commission_month', payment_month);
      }
    } else {
      // Monthly mode: filter by payment_month
      query = query.eq('commission_month', payment_month);
    }

    // v3: Exclude already-rejected commissions from this batch
    if (rejectedIds.length > 0) {
      query = query.not('id', 'in', `(${rejectedIds.join(',')})`);
    }

    const { data: lockedCommissions, error: fetchError } = await query;

    if (fetchError) {
      console.error('[Payment] ❌ Error fetching locked commissions:', fetchError.message);
      return new Response(JSON.stringify({
        success: false,
        error: fetchError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!lockedCommissions || lockedCommissions.length === 0) {
      console.log('[Payment] ℹ️ No locked commissions found');
      return new Response(JSON.stringify({
        success: true,
        message: isSelectiveMode
          ? 'No locked commissions found for selected F0s'
          : `No locked commissions found for ${payment_month}`,
        payment_batch_id: null,
        paid_count: 0,
        total_amount: 0,
        total_f0_count: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Payment] Found ${lockedCommissions.length} locked commissions`);

    // Step 2: Calculate totals and group by F0
    const f0Groups: Record<string, any[]> = {};
    let totalAmount = 0;

    // v2: Track commission months for batch naming
    const commissionMonths = new Set<string>();

    for (const commission of lockedCommissions) {
      totalAmount += Number(commission.total_commission);

      if (commission.commission_month) {
        commissionMonths.add(commission.commission_month);
      }

      if (!f0Groups[commission.f0_id]) {
        f0Groups[commission.f0_id] = [];
      }
      f0Groups[commission.f0_id].push(commission);
    }

    const f0Count = Object.keys(f0Groups).length;

    // v2: Determine batch payment_month label
    const batchPaymentMonth = payment_month ||
      (commissionMonths.size === 1 ? Array.from(commissionMonths)[0] :
       `${Array.from(commissionMonths).sort()[0]}_mixed`);

    console.log(`[Payment] Total F0s: ${f0Count}`);
    console.log(`[Payment] Total amount: ${totalAmount.toLocaleString()}đ`);
    console.log(`[Payment] Commission months: ${Array.from(commissionMonths).join(', ')}`);

    // Step 3: Create payment batch record via RPC
    const batchId = crypto.randomUUID();

    // v7: Fixed parameter order to match RPC signature
    // RPC signature: (p_id, p_payment_month, p_payment_date, p_total_f0_count, p_total_commission, p_created_by, p_created_by_name, p_status, p_notes)
    const { error: createBatchError } = await supabase.schema('api').rpc('create_payment_batch', {
      p_id: batchId,
      p_payment_month: batchPaymentMonth,
      p_payment_date: paymentDate,
      p_total_f0_count: f0Count,
      p_total_commission: totalAmount,
      p_created_by: admin_user_id,
      p_created_by_name: admin_user_name,
      p_status: 'processing',  // Optional param with default
      p_notes: notes || (isSelectiveMode ? `Selective payment for ${f0Count} F0s` : null)  // Optional param with default
    });

    if (createBatchError) {
      console.log('[Payment] ⚠️ RPC create_payment_batch failed:', createBatchError.message);
      console.log('[Payment] Continuing without batch record...');
    } else {
      console.log(`[Payment] Payment batch created: ${batchId}`);
    }

    // Step 4: Update all commissions to 'paid'
    let paidCount = 0;
    let errorCount = 0;
    const failedCommissions: string[] = [];

    for (const commission of lockedCommissions) {
      const { error: updateError } = await supabase
        .schema('api')
        .from('commission_records')
        .update({
          status: 'paid',
          paid_at: nowIso,
          paid_by: admin_user_id,
          paid_by_name: admin_user_name,
          payment_batch_id: batchId,
          updated_at: nowIso
        })
        .eq('id', commission.id);

      if (updateError) {
        console.error(`[Payment] ❌ Error updating commission ${commission.id}:`, updateError.message);
        errorCount++;
        failedCommissions.push(commission.id);
      } else {
        paidCount++;
      }
    }

    console.log(`[Payment] Updated ${paidCount} commissions to paid`);
    if (errorCount > 0) {
      console.log(`[Payment] ⚠️ ${errorCount} commissions failed to update`);
    }

    // Step 5: Send notifications to each F0
    const notificationResults: { f0_code: string; success: boolean }[] = [];

    for (const [f0Id, commissions] of Object.entries(f0Groups)) {
      const f0Total = commissions.reduce((sum, c) => sum + Number(c.total_commission), 0);
      const f0Code = commissions[0].f0_code;
      const f0CommissionMonths = [...new Set(commissions.map(c => c.commission_month))].filter(Boolean);

      const { error: notifError } = await supabase.schema('api').from('notifications').insert({
        f0_id: f0Id,
        type: 'payment',
        content: {
          title: '💰 Hoa hồng đã được thanh toán!',
          message: `Bạn đã nhận được ${f0Total.toLocaleString()}đ hoa hồng${f0CommissionMonths.length === 1 ? ` tháng ${f0CommissionMonths[0]}` : ''}. Tổng cộng ${commissions.length} đơn hàng.`,
          payment_month: f0CommissionMonths.join(', '),
          total_amount: f0Total,
          commission_count: commissions.length,
          payment_batch_id: batchId,
          paid_at: nowIso
        },
        is_read: false
      });

      notificationResults.push({ f0_code: f0Code, success: !notifError });

      if (notifError) {
        console.error(`[Payment] ⚠️ Failed to send notification to ${f0Code}:`, notifError.message);
      } else {
        console.log(`[Payment] ✅ Notification sent to F0: ${f0Code}`);
      }
    }

    // Step 6: Update batch status to completed
    // v8: Use direct UPDATE instead of RPC to ensure batch status is updated
    // This is the key fix for Bug #2 - batch must be 'completed' for Accountant tab to show it
    const finalStatus = errorCount === 0 ? 'completed' : 'completed_with_errors';

    const { error: completeBatchError } = await supabase
      .schema('api')
      .from('payment_batches')
      .update({
        status: finalStatus,
        completed_at: nowIso,
        completed_by: admin_user_id,
        completed_by_name: admin_user_name
      })
      .eq('id', batchId);

    if (completeBatchError) {
      console.error('[Payment] ⚠️ Failed to update batch status to completed:', completeBatchError.message);
      // Try RPC as fallback
      const { error: rpcError } = await supabase.schema('api').rpc('complete_payment_batch', {
        p_batch_id: batchId,
        p_completed_by: admin_user_id,
        p_completed_by_name: admin_user_name,
        p_status: finalStatus
      });
      if (rpcError) {
        console.error('[Payment] ⚠️ RPC fallback also failed:', rpcError.message);
      } else {
        console.log('[Payment] ✅ Batch status updated via RPC fallback');
      }
    } else {
      console.log(`[Payment] ✅ Batch status updated to '${finalStatus}'`);
    }

    // Step 7: Log summary
    console.log('====================================');
    console.log('[Payment] ✅ Payment batch completed!');
    console.log(`[Payment]    Batch ID: ${batchId}`);
    console.log(`[Payment]    Mode: ${isSelectiveMode ? 'Selective' : 'Monthly'}`);
    console.log(`[Payment]    Month(s): ${Array.from(commissionMonths).join(', ')}`);
    console.log(`[Payment]    F0s paid: ${f0Count}`);
    console.log(`[Payment]    Commissions paid: ${paidCount}/${lockedCommissions.length}`);
    console.log(`[Payment]    Total amount: ${totalAmount.toLocaleString()}đ`);
    console.log(`[Payment]    Errors: ${errorCount}`);
    console.log('====================================');

    // Build F0 summary for response
    const f0Summary = Object.entries(f0Groups).map(([f0Id, commissions]) => ({
      f0_id: f0Id,
      f0_code: commissions[0].f0_code,
      commission_count: commissions.length,
      commission_months: [...new Set(commissions.map(c => c.commission_month))].filter(Boolean),
      total_amount: commissions.reduce((sum, c) => sum + Number(c.total_commission), 0),
      notification_sent: notificationResults.find(n => n.f0_code === commissions[0].f0_code)?.success || false
    }));

    // v3: Log completion with structured logging
    console.log(JSON.stringify({
      tracking_id: trackingId,
      timestamp: new Date().toISOString(),
      function: 'admin-process-payment-batch',
      event: 'END',
      data: {
        success: true,
        paid_count: paidCount,
        rejected_count: rejectedCount,
        error_count: errorCount,
        total_amount: totalAmount,
        f0_count: f0Count
      }
    }));

    return new Response(JSON.stringify({
      success: true,
      message: errorCount === 0
        ? `Payment batch completed successfully`
        : `Payment batch completed with ${errorCount} errors`,
      payment_batch_id: batchId,
      payment_mode: isSelectiveMode ? 'selective' : 'monthly',
      payment_month: batchPaymentMonth,
      // Approved commissions
      paid_count: paidCount,
      total_amount: totalAmount,
      total_f0_count: f0Count,
      // v3: Rejected commissions info
      rejected_count: rejectedCount,
      rejected_commission_ids: rejectedIds,
      // Errors
      error_count: errorCount,
      failed_commission_ids: failedCommissions,
      f0_summary: f0Summary,
      processed_at: nowIso
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('====================================');
    console.error('[Payment] PROCESSING ERROR');
    console.error('Error:', error?.message || error);
    console.error('Stack:', error?.stack || 'No stack trace');
    console.error('====================================');

    return new Response(JSON.stringify({
      success: false,
      error: error?.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
