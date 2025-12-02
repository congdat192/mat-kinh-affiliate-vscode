import { supabase } from '@/lib/supabase';
import type {
  F1CustomerListResponse,
  F1CustomerDetailResponse,
  F1CustomerSummary,
  F1CustomerOrder,
} from '@/types/f1Customer';

class F1CustomerService {
  /**
   * Get list of F1 customers for F0
   * Direct query to VIEW f1_customers_summary (faster than Edge Function)
   */
  async getMyCustomers(
    f0_id: string,
    options: {
      search_phone?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<F1CustomerListResponse> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const offset = (page - 1) * limit;

      // Build query with filters
      let query = supabase
        .from('f1_customers_summary')
        .select('*', { count: 'exact' })
        .eq('f0_id', f0_id)
        .eq('is_active', true);

      // Apply phone search filter
      if (options.search_phone?.trim()) {
        query = query.ilike('f1_phone', `%${options.search_phone.trim()}%`);
      }

      // Apply pagination and ordering
      query = query
        .order('assigned_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: customers, error, count } = await query;

      if (error) {
        console.error('[F1CustomerService] Query error:', error);
        return { success: false, error: error.message };
      }

      // Get summary stats (all customers, not just current page)
      const { data: allCustomers } = await supabase
        .from('f1_customers_summary')
        .select('total_orders, total_revenue, total_commission')
        .eq('f0_id', f0_id)
        .eq('is_active', true);

      const summary = {
        total_f1: count || 0,
        total_orders: allCustomers?.reduce((sum, c) => sum + (c.total_orders || 0), 0) || 0,
        total_revenue: allCustomers?.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0) || 0,
        total_commission: allCustomers?.reduce((sum, c) => sum + Number(c.total_commission || 0), 0) || 0,
      };

      // Format customers to match expected type
      const formattedCustomers: F1CustomerSummary[] = (customers || []).map((c) => ({
        assignment_id: c.assignment_id,
        f1_phone: c.f1_phone,
        f1_name: c.f1_name || '',
        f1_customer_id: c.f1_customer_id || '',
        assigned_at: c.assigned_at,
        first_voucher_code: c.first_voucher_code || '',
        total_orders: c.total_orders || 0,
        total_revenue: Number(c.total_revenue) || 0,
        total_commission: Number(c.total_commission) || 0,
        paid_commission: Number(c.paid_commission) || 0,
        pending_commission: Number(c.pending_commission) || 0,
        // v16: Lock system fields
        locked_commission: Number(c.locked_commission) || 0,
        cancelled_commission: Number(c.cancelled_commission) || 0,
        last_order_date: c.last_order_date,
        last_order_code: c.last_order_code,
        has_valid_order: c.has_valid_order || false,
      }));

      return {
        success: true,
        data: {
          summary,
          customers: formattedCustomers,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        },
      };
    } catch (error: any) {
      console.error('[F1CustomerService] getMyCustomers error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get F1 customer detail with order history
   * Direct query to VIEW f1_customer_orders (faster than Edge Function)
   */
  async getCustomerDetail(
    f0_id: string,
    f1_phone: string
  ): Promise<F1CustomerDetailResponse> {
    try {
      // Get orders from VIEW
      const { data: orders, error: ordersError } = await supabase
        .from('f1_customer_orders')
        .select('*')
        .eq('f0_id', f0_id)
        .eq('f1_phone', f1_phone)
        .order('invoice_date', { ascending: false });

      if (ordersError) {
        console.error('[F1CustomerService] Orders query error:', ordersError);
        return { success: false, error: ordersError.message };
      }

      // Get customer info from summary VIEW
      const { data: customerData, error: customerError } = await supabase
        .from('f1_customers_summary')
        .select('*')
        .eq('f0_id', f0_id)
        .eq('f1_phone', f1_phone)
        .single();

      if (customerError) {
        console.error('[F1CustomerService] Customer query error:', customerError);
        return { success: false, error: customerError.message };
      }

      // Format orders to match expected type
      // Calculate days until lock for pending orders
      const now = new Date();
      const formattedOrders: F1CustomerOrder[] = (orders || []).map((o) => {
        let daysUntilLock: number | null = null;
        if (o.lock_date && o.commission_status === 'pending') {
          const lockDate = new Date(o.lock_date);
          const diffTime = lockDate.getTime() - now.getTime();
          daysUntilLock = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
        return {
          id: o.id,
          voucher_code: o.voucher_code || '',
          invoice_code: o.invoice_code || '',
          invoice_amount: Number(o.invoice_amount) || 0,
          invoice_date: o.invoice_date,
          invoice_status: o.invoice_status || '',
          basic_amount: Number(o.basic_amount) || 0,
          first_order_amount: Number(o.first_order_amount) || 0,
          tier_bonus_amount: Number(o.tier_bonus_amount) || 0,
          total_commission: Number(o.total_commission) || 0,
          commission_status: o.commission_status || 'pending',
          status_label: o.status_label || '',
          order_type: o.order_type || '',
          is_lifetime_commission: o.is_lifetime_commission || false,
          invoice_cancelled_at: o.invoice_cancelled_at,
          paid_at: o.paid_at,
          // v16: Lock system fields
          qualified_at: o.qualified_at || null,
          lock_date: o.lock_date || null,
          locked_at: o.locked_at || null,
          days_until_lock: daysUntilLock,
          created_at: o.created_at,
        };
      });

      return {
        success: true,
        data: {
          customer: {
            assignment_id: customerData.assignment_id,
            f1_phone: customerData.f1_phone,
            f1_name: customerData.f1_name || '',
            f1_customer_id: customerData.f1_customer_id || '',
            assigned_at: customerData.assigned_at,
            first_voucher_code: customerData.first_voucher_code || '',
            total_orders: customerData.total_orders || 0,
            total_revenue: Number(customerData.total_revenue) || 0,
            total_commission: Number(customerData.total_commission) || 0,
            paid_commission: Number(customerData.paid_commission) || 0,
            pending_commission: Number(customerData.pending_commission) || 0,
            // v16: Lock system fields
            locked_commission: Number(customerData.locked_commission) || 0,
            cancelled_commission: Number(customerData.cancelled_commission) || 0,
            last_order_date: customerData.last_order_date,
            last_order_code: customerData.last_order_code,
            has_valid_order: customerData.has_valid_order || false,
            f0_code: customerData.f0_code || '',
            first_invoice_code: customerData.first_invoice_code || '',
            first_invoice_date: customerData.first_invoice_date || '',
          },
          orders: formattedOrders,
        },
      };
    } catch (error: any) {
      console.error('[F1CustomerService] getCustomerDetail error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const f1CustomerService = new F1CustomerService();
