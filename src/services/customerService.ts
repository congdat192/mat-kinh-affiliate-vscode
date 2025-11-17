// Customer Service - Kiểm tra khách hàng cũ/mới
import { tokenService } from './tokenService';

// Use proxy in development to avoid CORS issues
const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : 'https://kcirpjxbjqagrqrjfldu.supabase.co/functions/v1';

export type CustomerType = 'old' | 'new';

export interface CheckCustomerResponse {
  success: boolean;
  phone: string;
  customer_type: CustomerType;
}

export interface CheckCustomerResult {
  isValid: boolean;
  customerType: CustomerType | null;
  message: string;
  phone: string;
}

class CustomerService {
  /**
   * Kiểm tra khách hàng cũ/mới qua API
   */
  async checkCustomerType(phone: string): Promise<CheckCustomerResult> {
    try {
      console.log('📞 Checking customer type for phone:', phone);

      // Validate phone number format
      const phoneRegex = /^0[0-9]{9}$/;
      if (!phoneRegex.test(phone)) {
        console.warn('⚠️ Invalid phone format:', phone);
        return {
          isValid: false,
          customerType: null,
          message: 'Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng (10 số, bắt đầu bằng 0).',
          phone,
        };
      }

      // Get valid token
      let token: string;
      try {
        console.log('🔐 Getting valid token...');
        token = await tokenService.getValidToken();
        console.log('✅ Token obtained');
      } catch (error) {
        console.error('❌ Failed to get token:', error);
        return {
          isValid: false,
          customerType: null,
          message: 'Lỗi xác thực. Vui lòng thử lại sau.',
          phone,
        };
      }

      // Call API to check customer
      const apiUrl = `${API_BASE_URL}/check-type-customer?phone=${encodeURIComponent(phone)}`;

      console.log('🌐 Calling customer check API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Customer API response status:', response.status);

      // If unauthorized, try to refresh token and retry
      if (response.status === 401) {
        console.log('🔄 Token expired (401), refreshing...');
        try {
          token = await tokenService.refreshToken();
          console.log('✅ Token refreshed, retrying...');

          const retryResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          console.log('📡 Retry response status:', retryResponse.status);

          if (!retryResponse.ok) {
            const errorText = await retryResponse.text();
            console.error('❌ Retry failed:', errorText);
            throw new Error(`API error: ${retryResponse.status}`);
          }

          const data: CheckCustomerResponse = await retryResponse.json();
          console.log('✅ Customer check result:', data);
          return this.processResponse(data);
        } catch (retryError) {
          console.error('❌ Retry error:', retryError);
          return {
            isValid: false,
            customerType: null,
            message: 'Lỗi kết nối API. Vui lòng thử lại sau.',
            phone,
          };
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Customer API error:', errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data: CheckCustomerResponse = await response.json();
      console.log('✅ Customer check result:', data);
      return this.processResponse(data);

    } catch (error) {
      console.error('Error checking customer:', error);
      return {
        isValid: false,
        customerType: null,
        message: 'Lỗi khi kiểm tra thông tin khách hàng. Vui lòng thử lại sau.',
        phone,
      };
    }
  }

  /**
   * Xử lý response từ API
   */
  private processResponse(data: CheckCustomerResponse): CheckCustomerResult {
    if (!data.success) {
      return {
        isValid: false,
        customerType: null,
        message: 'Không thể xác minh thông tin khách hàng.',
        phone: data.phone,
      };
    }

    const isNewCustomer = data.customer_type === 'new';

    return {
      isValid: isNewCustomer,
      customerType: data.customer_type,
      message: isNewCustomer
        ? '✓ Khách hàng mới - Hợp lệ để phát hành voucher'
        : '✗ Khách hàng cũ - Không thể phát hành voucher cho khách hàng này',
      phone: data.phone,
    };
  }
}

// Export singleton instance
export const customerService = new CustomerService();
