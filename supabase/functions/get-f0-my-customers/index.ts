import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.info('get-f0-my-customers v3 - List F1 customers for F0 (v17 revenue/orders breakdown by status)');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { f0_id, search_phone, page = 1, limit = 20 } = await req.json();

    if (!f0_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'f0_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'api' }
    });

    // Build query
    let query = supabase
      .from('f1_customers_summary')
      .select('*', { count: 'exact' })
      .eq('f0_id', f0_id)
      .eq('is_active', true);

    // Search by phone if provided
    if (search_phone && search_phone.trim()) {
      const searchTerm = search_phone.trim();
      query = query.ilike('f1_phone', `%${searchTerm}%`);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query
      .order('assigned_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: customers, error: customersError, count } = await query;

    if (customersError) {
      console.error('[MyCustomers] Error fetching customers:', customersError.message);
      return new Response(
        JSON.stringify({ success: false, error: customersError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate summary stats (from all customers, not just current page)
    // v17: Include breakdown fields
    const { data: summaryData, error: summaryError } = await supabase
      .from('f1_customers_summary')
      .select('total_orders, total_revenue, total_commission, pending_orders, locked_orders, paid_orders, pending_revenue, locked_revenue, paid_revenue')
      .eq('f0_id', f0_id)
      .eq('is_active', true);

    let summary = {
      total_f1: count || 0,
      total_orders: 0,
      total_revenue: 0,
      total_commission: 0,
      // v17: Breakdown summaries
      pending_orders: 0,
      locked_orders: 0,
      paid_orders: 0,
      pending_revenue: 0,
      locked_revenue: 0,
      paid_revenue: 0
    };

    if (!summaryError && summaryData) {
      summary.total_orders = summaryData.reduce((sum, c) => sum + (c.total_orders || 0), 0);
      summary.total_revenue = summaryData.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0);
      summary.total_commission = summaryData.reduce((sum, c) => sum + Number(c.total_commission || 0), 0);
      // v17: Breakdown
      summary.pending_orders = summaryData.reduce((sum, c) => sum + (c.pending_orders || 0), 0);
      summary.locked_orders = summaryData.reduce((sum, c) => sum + (c.locked_orders || 0), 0);
      summary.paid_orders = summaryData.reduce((sum, c) => sum + (c.paid_orders || 0), 0);
      summary.pending_revenue = summaryData.reduce((sum, c) => sum + Number(c.pending_revenue || 0), 0);
      summary.locked_revenue = summaryData.reduce((sum, c) => sum + Number(c.locked_revenue || 0), 0);
      summary.paid_revenue = summaryData.reduce((sum, c) => sum + Number(c.paid_revenue || 0), 0);
    }

    // Format response - v17: Added revenue/orders breakdown
    const formattedCustomers = (customers || []).map(c => ({
      assignment_id: c.assignment_id,
      f1_phone: c.f1_phone,
      f1_name: c.f1_name || c.f1_phone,
      f1_customer_id: c.f1_customer_id,
      assigned_at: c.assigned_at,
      first_voucher_code: c.first_voucher_code,
      // v17: Orders breakdown
      pending_orders: c.pending_orders || 0,
      locked_orders: c.locked_orders || 0,
      paid_orders: c.paid_orders || 0,
      total_orders: c.total_orders || 0,
      // v17: Revenue breakdown
      pending_revenue: Number(c.pending_revenue || 0),
      locked_revenue: Number(c.locked_revenue || 0),
      paid_revenue: Number(c.paid_revenue || 0),
      total_revenue: Number(c.total_revenue || 0),
      // Commission breakdown
      total_commission: Number(c.total_commission || 0),
      paid_commission: Number(c.paid_commission || 0),
      pending_commission: Number(c.pending_commission || 0),
      locked_commission: Number(c.locked_commission || 0),
      cancelled_commission: Number(c.cancelled_commission || 0),
      last_order_date: c.last_order_date,
      last_order_code: c.last_order_code,
      has_valid_order: c.has_valid_order || false
    }));

    console.log(`[MyCustomers] Found ${formattedCustomers.length} customers for F0 ${f0_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          summary,
          customers: formattedCustomers,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit)
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[MyCustomers] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
