import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

console.info('get-f0-payment-history v1 - Get payment batches and commission records for F0');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { f0_id, action, batch_id, limit = 50 } = body;

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

    // Verify F0 exists
    const { data: f0Data, error: f0Error } = await supabase
      .from('f0_partners')
      .select('id, f0_code, full_name')
      .eq('id', f0_id)
      .single();

    if (f0Error || !f0Data) {
      console.error('F0 not found:', f0Error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Không tìm thấy thông tin F0',
        code: 'F0_NOT_FOUND'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle different actions
    if (action === 'get_batch_detail' && batch_id) {
      // Get commission records for a specific batch
      const { data: commissions, error: commissionsError } = await supabase
        .from('commission_records')
        .select(`
          id,
          voucher_code,
          f1_phone,
          f1_name,
          is_new_customer,
          invoice_code,
          invoice_amount,
          invoice_date,
          basic_rate,
          basic_amount,
          first_order_applied,
          first_order_amount,
          tier_code,
          tier_name,
          tier_bonus_rate,
          tier_bonus_amount,
          subtotal_commission,
          total_commission,
          status,
          status_label,
          locked_at,
          paid_at,
          commission_month
        `)
        .eq('f0_id', f0_id)
        .eq('payment_batch_id', batch_id)
        .order('paid_at', { ascending: false });

      if (commissionsError) {
        console.error('Error fetching batch commissions:', commissionsError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Không thể tải chi tiết đợt thanh toán',
          code: 'FETCH_ERROR'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get batch summary
      const { data: batchData, error: batchError } = await supabase
        .from('payment_batches')
        .select('*')
        .eq('id', batch_id)
        .single();

      // Calculate breakdown totals
      const breakdown = {
        basic_total: commissions?.reduce((sum, c) => sum + (Number(c.basic_amount) || 0), 0) || 0,
        tier_bonus_total: commissions?.reduce((sum, c) => sum + (Number(c.tier_bonus_amount) || 0), 0) || 0,
        first_order_total: commissions?.reduce((sum, c) => sum + (Number(c.first_order_amount) || 0), 0) || 0,
        total: commissions?.reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0) || 0,
        count: commissions?.length || 0
      };

      return new Response(JSON.stringify({
        success: true,
        data: {
          batch: batchData || null,
          commissions: commissions || [],
          breakdown,
          f0: {
            id: f0Data.id,
            f0_code: f0Data.f0_code,
            full_name: f0Data.full_name
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default: Get payment history summary
    // 1. Get unique payment batch IDs for this F0
    const { data: paidCommissions, error: paidError } = await supabase
      .from('commission_records')
      .select(`
        payment_batch_id,
        total_commission,
        paid_at,
        commission_month
      `)
      .eq('f0_id', f0_id)
      .eq('status', 'paid')
      .not('payment_batch_id', 'is', null)
      .order('paid_at', { ascending: false });

    if (paidError) {
      console.error('Error fetching paid commissions:', paidError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Không thể tải lịch sử thanh toán',
        code: 'FETCH_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Group by batch_id
    const batchMap = new Map<string, {
      batch_id: string;
      total_amount: number;
      commission_count: number;
      paid_at: string | null;
      commission_months: Set<string>;
    }>();

    (paidCommissions || []).forEach(c => {
      const existing = batchMap.get(c.payment_batch_id);
      if (existing) {
        existing.total_amount += Number(c.total_commission) || 0;
        existing.commission_count++;
        if (c.commission_month) {
          existing.commission_months.add(c.commission_month);
        }
        if (!existing.paid_at || (c.paid_at && c.paid_at > existing.paid_at)) {
          existing.paid_at = c.paid_at;
        }
      } else {
        batchMap.set(c.payment_batch_id, {
          batch_id: c.payment_batch_id,
          total_amount: Number(c.total_commission) || 0,
          commission_count: 1,
          paid_at: c.paid_at,
          commission_months: new Set(c.commission_month ? [c.commission_month] : [])
        });
      }
    });

    // Get batch details
    const batchIds = Array.from(batchMap.keys());
    let batches: any[] = [];

    if (batchIds.length > 0) {
      const { data: batchData, error: batchError } = await supabase
        .from('payment_batches')
        .select('*')
        .in('id', batchIds)
        .order('payment_date', { ascending: false });

      if (!batchError && batchData) {
        batches = batchData.map(b => {
          const summary = batchMap.get(b.id);
          return {
            ...b,
            f0_amount: summary?.total_amount || 0,
            f0_commission_count: summary?.commission_count || 0,
            f0_commission_months: summary ? Array.from(summary.commission_months) : []
          };
        });
      }
    }

    // Get pending locked commissions (not yet paid)
    const { data: lockedCommissions, error: lockedError } = await supabase
      .from('commission_records')
      .select(`
        id,
        voucher_code,
        f1_phone,
        f1_name,
        invoice_code,
        invoice_amount,
        total_commission,
        status,
        status_label,
        locked_at,
        commission_month,
        days_until_lock
      `)
      .eq('f0_id', f0_id)
      .eq('status', 'locked')
      .is('payment_batch_id', null)
      .order('locked_at', { ascending: false })
      .limit(limit);

    // Get pending commissions (not yet locked)
    const { data: pendingCommissions, error: pendingError } = await supabase
      .from('commission_records')
      .select(`
        id,
        voucher_code,
        f1_phone,
        f1_name,
        invoice_code,
        invoice_amount,
        total_commission,
        status,
        status_label,
        qualified_at,
        lock_date,
        days_until_lock,
        commission_month
      `)
      .eq('f0_id', f0_id)
      .eq('status', 'pending')
      .order('qualified_at', { ascending: false })
      .limit(limit);

    // Calculate totals
    const lockedTotal = (lockedCommissions || []).reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0);
    const pendingTotal = (pendingCommissions || []).reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0);
    const paidTotal = batches.reduce((sum, b) => sum + (b.f0_amount || 0), 0);

    console.log(`=== PAYMENT HISTORY for F0: ${f0Data.f0_code} ===`);
    console.log(`Payment batches: ${batches.length}`);
    console.log(`Locked commissions: ${lockedCommissions?.length || 0} (${lockedTotal.toLocaleString()}đ)`);
    console.log(`Pending commissions: ${pendingCommissions?.length || 0} (${pendingTotal.toLocaleString()}đ)`);
    console.log(`Total paid: ${paidTotal.toLocaleString()}đ`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        f0: {
          id: f0Data.id,
          f0_code: f0Data.f0_code,
          full_name: f0Data.full_name
        },
        payment_batches: batches,
        locked_commissions: lockedCommissions || [],
        pending_commissions: pendingCommissions || [],
        summary: {
          total_batches: batches.length,
          locked_count: lockedCommissions?.length || 0,
          locked_amount: lockedTotal,
          pending_count: pendingCommissions?.length || 0,
          pending_amount: pendingTotal,
          paid_amount: paidTotal
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Payment history error:', error);
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
