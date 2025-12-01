// Types for F1 Customer feature

export interface F1CustomerSummary {
  assignment_id: string;
  f1_phone: string;
  f1_name: string;
  f1_customer_id: string;
  assigned_at: string;
  first_voucher_code: string;
  total_orders: number;
  total_revenue: number;
  total_commission: number;
  paid_commission: number;
  pending_commission: number;
  last_order_date: string | null;
  last_order_code: string | null;
  has_valid_order: boolean;
}

export interface F1CustomerDetail extends F1CustomerSummary {
  f0_code: string;
  first_invoice_code: string;
  first_invoice_date: string;
}

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
  commission_status: string;
  status_label: string;
  order_type: string;
  is_lifetime_commission: boolean;
  invoice_cancelled_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface F1CustomerListResponse {
  success: boolean;
  data?: {
    summary: {
      total_f1: number;
      total_orders: number;
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
