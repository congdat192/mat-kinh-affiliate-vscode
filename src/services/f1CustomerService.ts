import type {
  F1CustomerListResponse,
  F1CustomerDetailResponse,
} from '@/types/f1Customer';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

class F1CustomerService {
  /**
   * Get list of F1 customers for F0
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
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-f0-my-customers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            f0_id,
            search_phone: options.search_phone || '',
            page: options.page || 1,
            limit: options.limit || 20,
          }),
        }
      );

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('[F1CustomerService] getMyCustomers error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get F1 customer detail with order history
   */
  async getCustomerDetail(
    f0_id: string,
    f1_phone: string
  ): Promise<F1CustomerDetailResponse> {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-f1-customer-detail`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ f0_id, f1_phone }),
        }
      );

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('[F1CustomerService] getCustomerDetail error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const f1CustomerService = new F1CustomerService();
