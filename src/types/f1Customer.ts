// Types for F1 Customer feature

export interface F1CustomerSummary {
  assignment_id: string;
  f1_phone: string;
  f1_name: string;
  f1_customer_id: string;
  assigned_at: string;
  first_voucher_code: string;
  // v17: Orders breakdown by status
  pending_orders: number;
  locked_orders: number;
  paid_orders: number;
  total_orders: number;
  // v17: Revenue breakdown by status
  pending_revenue: number;
  locked_revenue: number;
  paid_revenue: number;
  total_revenue: number;
  // Commission fields
  total_commission: number;
  paid_commission: number;
  pending_commission: number;
  // v16: Lock system fields
  locked_commission: number;
  cancelled_commission: number;
  last_order_date: string | null;
  last_order_code: string | null;
  has_valid_order: boolean;
}

export interface F1CustomerDetail extends F1CustomerSummary {
  f0_code: string;
  first_invoice_code: string;
  first_invoice_date: string;
}

// v16: Commission status type for lock system
export type CommissionStatus = 'pending' | 'locked' | 'paid' | 'cancelled';

export interface F1CustomerOrder {
  id: string;
  voucher_code: string;
  invoice_code: string;
  invoice_amount: number;
  invoice_date: string;
  invoice_status: string;
  basic_amount: number;
  first_order_amount: number;
  tier_bonus_amount: number;
  total_commission: number;
  commission_status: CommissionStatus;
  status_label: string;
  order_type: string;
  is_lifetime_commission: boolean;
  invoice_cancelled_at: string | null;
  paid_at: string | null;
  // v16: Lock system fields
  qualified_at: string | null;
  lock_date: string | null;
  locked_at: string | null;
  days_until_lock: number | null;
  created_at: string;
}

export interface F1CustomerListResponse {
  success: boolean;
  data?: {
    summary: {
      total_f1: number;
      // v17: Orders breakdown by status
      pending_orders: number;
      locked_orders: number;
      paid_orders: number;
      total_orders: number;
      // v17: Revenue breakdown by status
      pending_revenue: number;
      locked_revenue: number;
      paid_revenue: number;
      total_revenue: number;
      total_commission: number;
    };
    customers: F1CustomerSummary[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
  error?: string;
}

export interface F1CustomerDetailResponse {
  success: boolean;
  data?: {
    customer: F1CustomerDetail;
    orders: F1CustomerOrder[];
  };
  error?: string;
}
