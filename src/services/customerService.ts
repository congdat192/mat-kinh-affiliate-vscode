// Customer Service - Kiểm tra khách hàng cũ/mới
import { tokenService } from './tokenService';
import { supabase } from '@/lib/supabase';

// Use proxy for both development and production to avoid CORS issues
const API_BASE_URL = '/api';

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

// ============================================
// NEW: Direct Supabase validation for Affiliate F1 flow
// (No OAuth token required - uses Supabase anon key)
// ============================================

// Customer validation result for affiliate flow
export interface AffiliateCustomerValidationResult {
  success: boolean;
  customer_type?: CustomerType;
  customer_name?: string;
  total_revenue?: number;
  error?: string;
  error_code?: string;
}

/**
 * Normalize phone number to standard format
 * - Remove spaces, dashes, dots
 * - Convert +84 to 0
 * - Ensure starts with 0
 */
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.]/g, '');

  // Convert +84 to 0
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  }
  // Convert 84 to 0 (if starts with 84 and length > 10)
  if (cleaned.startsWith('84') && cleaned.length > 10) {
    cleaned = '0' + cleaned.slice(2);
  }

  return cleaned;
}

/**
 * Validate if phone number is Vietnamese format
 */
function isValidVietnamesePhone(phone: string): boolean {
  const cleaned = normalizePhone(phone);
  // Vietnamese phone: 10 digits, starts with 0
  return /^0[0-9]{9}$/.test(cleaned);
}

/**
 * Validate customer type for Affiliate F1 flow
 * Query api.customers_backup directly (no OAuth needed)
 * - If not found or totalrevenue <= 0 → "new"
 * - If totalrevenue > 0 → "old"
 *
 * @param phone - Customer phone number
 * @returns AffiliateCustomerValidationResult
 */
export async function validateCustomerForAffiliate(phone: string): Promise<AffiliateCustomerValidationResult> {
  try {
    // Validate phone format
    if (!phone || !phone.trim()) {
      return {
        success: false,
        error: 'Vui lòng nhập số điện thoại',
        error_code: 'MISSING_PHONE',
      };
    }

    const cleanPhone = normalizePhone(phone.trim());

    if (!isValidVietnamesePhone(cleanPhone)) {
      return {
        success: false,
        error: 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)',
        error_code: 'INVALID_PHONE',
      };
    }

    console.log('🔍 Validating customer for affiliate:', cleanPhone);

    // Query customers_backup view directly via Supabase
    const { data, error } = await supabase
      .from('customers_backup')
      .select('contactnumber, name, totalrevenue')
      .eq('contactnumber', cleanPhone)
      .maybeSingle();

    if (error) {
      console.error('❌ Error querying customers_backup:', error);
      return {
        success: false,
        error: 'Lỗi khi kiểm tra thông tin khách hàng',
        error_code: 'QUERY_ERROR',
      };
    }

    // Customer not found → new customer
    if (!data) {
      console.log('✅ Customer not found → NEW customer');
      return {
        success: true,
        customer_type: 'new',
        customer_name: undefined,
        total_revenue: 0,
      };
    }

    // Check totalrevenue to determine customer type
    const totalRevenue = data.totalrevenue;

    if (totalRevenue === null || totalRevenue === undefined || totalRevenue <= 0) {
      // No revenue or zero revenue → new customer
      console.log('✅ Customer found but no revenue → NEW customer');
      return {
        success: true,
        customer_type: 'new',
        customer_name: data.name || undefined,
        total_revenue: totalRevenue || 0,
      };
    }

    // Has positive revenue → old customer
    console.log('⚠️ Customer has revenue:', totalRevenue, '→ OLD customer');
    return {
      success: true,
      customer_type: 'old',
      customer_name: data.name || undefined,
      total_revenue: totalRevenue,
    };

  } catch (error) {
    console.error('❌ Error in validateCustomerForAffiliate:', error);
    return {
      success: false,
      error: 'Lỗi hệ thống. Vui lòng thử lại sau.',
      error_code: 'SYSTEM_ERROR',
    };
  }
}

/**
 * Issue voucher for F1 customer via Edge Function
 * Calls create-and-release-voucher-affiliate-internal (no Supabase Auth required)
 *
 * @param params - Voucher issue parameters
 */
export async function issueVoucherForF1(params: {
  campaignCode: string;  // campaign_code from affiliate_campaign_settings
  recipientPhone: string;
  f0Code?: string;
}): Promise<{
  success: boolean;
  voucher_code?: string;
  campaign_name?: string;
  expired_at?: string;
  message?: string;
  error?: string;
  error_code?: string;
}> {
  try {
    const cleanPhone = normalizePhone(params.recipientPhone);

    console.log('🎫 Issuing voucher for F1:', {
      campaignCode: params.campaignCode,
      phone: cleanPhone,
      f0Code: params.f0Code,
    });

    const { data, error } = await supabase.functions.invoke('create-and-release-voucher-affiliate-internal', {
      body: {
        campaign_code: params.campaignCode,
        recipient_phone: cleanPhone,
        f0_code: params.f0Code,
      },
    });

    if (error) {
      console.error('❌ Error calling create-and-release-voucher-affiliate-internal:', error);
      return {
        success: false,
        error: 'Lỗi khi phát voucher. Vui lòng thử lại.',
        error_code: 'EDGE_FUNCTION_ERROR',
      };
    }

    if (!data.success) {
      console.error('❌ Voucher issue failed:', data);
      return {
        success: false,
        error: data.error || 'Không thể phát voucher',
        error_code: data.error_code || 'VOUCHER_ERROR',
      };
    }

    console.log('✅ Voucher issued successfully:', data);
    return {
      success: true,
      voucher_code: data.voucher_code,
      campaign_name: data.campaign_name,
      expired_at: data.expired_at,
      message: data.message || 'Phát voucher thành công!',
    };

  } catch (error) {
    console.error('❌ Error in issueVoucherForF1:', error);
    return {
      success: false,
      error: 'Lỗi hệ thống. Vui lòng thử lại sau.',
      error_code: 'SYSTEM_ERROR',
    };
  }
}

// Export utility functions
export { normalizePhone, isValidVietnamesePhone };
