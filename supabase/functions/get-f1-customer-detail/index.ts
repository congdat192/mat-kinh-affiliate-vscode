import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.info('get-f1-customer-detail v1 - Get F1 customer detail with order history');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { f0_id, f1_phone } = await req.json();

    if (!f0_id || !f1_phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'f0_id and f1_phone are required' }),
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

    // Get customer summary
    const { data: customer, error: customerError } = await supabase
      .from('f1_customers_summary')
      .select('*')
      .eq('f0_id', f0_id)
      .eq('f1_phone', f1_phone)
      .single();

    if (customerError || !customer) {
      console.error('[CustomerDetail] Customer not found:', customerError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order history
    const { data: orders, error: ordersError } = await supabase
      .from('f1_customer_orders')
      .select('*')
      .eq('f0_id', f0_id)
      .eq('f1_phone', f1_phone)
      .order('invoice_date', { ascending: false });

    if (ordersError) {
      console.error('[CustomerDetail] Error fetching orders:', ordersError.message);
    }

    // Format customer data
    const formattedCustomer = {
      assignment_id: customer.assignment_id,
      f1_phone: customer.f1_phone,
      f1_name: customer.f1_name || customer.f1_phone,
      f1_customer_id: customer.f1_customer_id,
      f0_code: customer.f0_code,
      assigned_at: customer.assigned_at,
      first_voucher_code: customer.first_voucher_code,
      first_invoice_code: customer.first_invoice_code,
      first_invoice_date: customer.first_invoice_date,
      total_orders: customer.total_orders || 0,
      total_revenue: Number(customer.total_revenue || 0),
      total_commission: Number(customer.total_commission || 0),
      paid_commission: Number(customer.paid_commission || 0),
      pending_commission: Number(customer.pending_commission || 0),
      last_order_date: customer.last_order_date,
      last_order_code: customer.last_order_code,
      has_valid_order: customer.has_valid_order || false
    };

    // Format orders data
    const formattedOrders = (orders || []).map(o => ({
      id: o.id,
      voucher_code: o.voucher_code,
      invoice_code: o.invoice_code,
      invoice_amount: Number(o.invoice_amount || 0),
      invoice_date: o.invoice_date,
      invoice_status: o.invoice_status,
      basic_amount: Number(o.basic_amount || 0),
      first_order_amount: Number(o.first_order_amount || 0),
      tier_bonus_amount: Number(o.tier_bonus_amount || 0),
      total_commission: Number(o.total_commission || 0),
      commission_status: o.commission_status,
      status_label: o.status_label,
      order_type: o.order_type,
      is_lifetime_commission: o.is_lifetime_commission,
      invoice_cancelled_at: o.invoice_cancelled_at,
      paid_at: o.paid_at,
      created_at: o.created_at
    }));

    console.log(`[CustomerDetail] Found customer ${f1_phone} with ${formattedOrders.length} orders`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          customer: formattedCustomer,
          orders: formattedOrders
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[CustomerDetail] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
