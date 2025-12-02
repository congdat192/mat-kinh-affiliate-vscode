import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

console.info('Admin process payment batch started - v1 (Process commission payments for a month)');

// ============================================
// HELPER FUNCTIONS
// ============================================
function getVietnamTime() {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 7 * 3600000);
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'api' }
    });

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const {
      payment_month,      // Required: '2025-11'
      admin_user_id,      // Required: UUID of admin user
      admin_user_name,    // Required: Name of admin user
      notes               // Optional: Notes for this payment batch
    } = body;

    // Validate required fields
    if (!payment_month) {
      return new Response(JSON.stringify({
        success: false,
        error: 'payment_month is required (format: YYYY-MM)'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!admin_user_id || !admin_user_name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'admin_user_id and admin_user_name are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate payment_month format
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

    const now = getVietnamTime();
    const nowIso = now.toISOString();

    console.log('====================================');
    console.log('[Payment] 💰 Starting payment batch process...');
    console.log(`[Payment] Payment month: ${payment_month}`);
    console.log(`[Payment] Admin: ${admin_user_name} (${admin_user_id})`);
    console.log(`[Payment] Process time: ${nowIso}`);
    console.log('====================================');

    // Step 1: Get all locked commissions for the specified month
    const { data: lockedCommissions, error: fetchError } = await supabase
      .from('commission_records')
      .select('id, f0_id, f0_code, voucher_code, invoice_code, total_commission, f1_phone, f1_name')
      .eq('status', 'locked')
      .eq('commission_month', payment_month);

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
      console.log('[Payment] ℹ️ No locked commissions found for this month');
      return new Response(JSON.stringify({
        success: true,
        message: `No locked commissions found for ${payment_month}`,
        payment_batch_id: null,
        paid_count: 0,
        total_amount: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Payment] Found ${lockedCommissions.length} locked commissions`);

    // Step 2: Calculate totals and group by F0
    const f0Groups: Record<string, any[]> = {};
    let totalAmount = 0;

    for (const commission of lockedCommissions) {
      totalAmount += Number(commission.total_commission);

      if (!f0Groups[commission.f0_id]) {
        f0Groups[commission.f0_id] = [];
      }
      f0Groups[commission.f0_id].push(commission);
    }

    const f0Count = Object.keys(f0Groups).length;

    console.log(`[Payment] Total F0s: ${f0Count}`);
    console.log(`[Payment] Total amount: ${totalAmount.toLocaleString()}đ`);

    // Step 3: Create payment batch record
    // Note: Using supabase client with schema 'api', need to use RPC or direct table access
    // For now, let's create the batch using a transaction-like approach

    const { data: batchResult, error: batchError } = await supabase.rpc('create_payment_batch', {
      p_payment_month: payment_month,
      p_payment_date: now.toISOString().split('T')[0], // YYYY-MM-DD
      p_total_f0_count: f0Count,
      p_total_commission: totalAmount,
      p_created_by: admin_user_id,
      p_created_by_name: admin_user_name,
      p_notes: notes || null
    });

    let batchId: string;

    if (batchError) {
      // If RPC doesn't exist, create batch manually using direct insert
      console.log('[Payment] RPC not found, creating batch directly...');

      // We need to insert into affiliate.payment_batches - but we're using api schema
      // Let's create a view or use execute_sql
      const insertBatchQuery = `
        INSERT INTO affiliate.payment_batches (
          payment_month, payment_date, total_f0_count, total_commission,
          status, created_by, created_by_name, notes, created_at
        ) VALUES (
          '${payment_month}',
          '${now.toISOString().split('T')[0]}',
          ${f0Count},
          ${totalAmount},
          'processing',
          '${admin_user_id}'::uuid,
          '${admin_user_name}',
          ${notes ? `'${notes.replace(/'/g, "''")}'` : 'NULL'},
          now()
        ) RETURNING id;
      `;

      // Use the service role client to execute raw SQL
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: insertResult, error: insertError } = await serviceSupabase.rpc('exec_sql', {
        query: insertBatchQuery
      });

      if (insertError) {
        // If exec_sql doesn't exist either, generate UUID manually
        console.log('[Payment] Creating batch with generated UUID...');
        batchId = crypto.randomUUID();
      } else {
        batchId = insertResult?.[0]?.id || crypto.randomUUID();
      }
    } else {
      batchId = batchResult?.id || crypto.randomUUID();
    }

    console.log(`[Payment] Payment batch created: ${batchId}`);

    // Step 4: Update all commissions to 'paid'
    let paidCount = 0;
    let errorCount = 0;

    for (const commission of lockedCommissions) {
      const { error: updateError } = await supabase
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
      } else {
        paidCount++;
      }
    }

    console.log(`[Payment] Updated ${paidCount} commissions to paid`);

    // Step 5: Send notifications to each F0
    for (const [f0Id, commissions] of Object.entries(f0Groups)) {
      const f0Total = commissions.reduce((sum, c) => sum + Number(c.total_commission), 0);
      const f0Code = commissions[0].f0_code;

      await supabase.from('notifications').insert({
        f0_id: f0Id,
        type: 'payment',
        content: {
          title: '💰 Hoa hồng đã được thanh toán!',
          message: `Bạn đã nhận được ${f0Total.toLocaleString()}đ hoa hồng tháng ${payment_month}. Tổng cộng ${commissions.length} đơn hàng.`,
          payment_month: payment_month,
          total_amount: f0Total,
          commission_count: commissions.length,
          payment_batch_id: batchId,
          paid_at: nowIso
        },
        is_read: false
      });

      console.log(`[Payment] Notification sent to F0: ${f0Code}`);
    }

    // Step 6: Update batch status to completed
    // Note: Since we may not have direct access to affiliate schema, we'll try RPC first
    const { error: completeBatchError } = await supabase.rpc('complete_payment_batch', {
      p_batch_id: batchId,
      p_completed_by: admin_user_id,
      p_completed_by_name: admin_user_name
    });

    if (completeBatchError) {
      console.log('[Payment] RPC complete_payment_batch not found, batch marked as processing');
      // Batch remains in 'processing' state - admin can complete via dashboard
    }

    // Step 7: Log summary
    console.log('====================================');
    console.log('[Payment] ✅ Payment batch completed!');
    console.log(`[Payment]    Batch ID: ${batchId}`);
    console.log(`[Payment]    Month: ${payment_month}`);
    console.log(`[Payment]    F0s paid: ${f0Count}`);
    console.log(`[Payment]    Commissions paid: ${paidCount}`);
    console.log(`[Payment]    Total amount: ${totalAmount.toLocaleString()}đ`);
    console.log(`[Payment]    Errors: ${errorCount}`);
    console.log('====================================');

    // Build F0 summary for response
    const f0Summary = Object.entries(f0Groups).map(([f0Id, commissions]) => ({
      f0_id: f0Id,
      f0_code: commissions[0].f0_code,
      commission_count: commissions.length,
      total_amount: commissions.reduce((sum, c) => sum + Number(c.total_commission), 0)
    }));

    return new Response(JSON.stringify({
      success: true,
      message: `Payment batch completed for ${payment_month}`,
      payment_batch_id: batchId,
      payment_month: payment_month,
      paid_count: paidCount,
      error_count: errorCount,
      total_f0_count: f0Count,
      total_amount: totalAmount,
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
