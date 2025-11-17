/**
 * External API Service for KiotViet Voucher Campaigns
 * Handles communication with Supabase Edge Functions
 */

import { tokenService } from './tokenService';

// Use proxy for both development and production to avoid CORS issues
const API_BASE_URL = '/api';

interface VoucherCampaignFilters {
  id?: number;
  code?: string;
  name?: string;
  isactive?: boolean;
  startdate?: string;
  enddate?: string;
  expiretime?: number;
  price?: number;
}

interface PaginationParams {
  pageSize?: number;
  currentItem?: number;
}

interface VoucherCampaignResponse {
  success: boolean;
  data: Array<{
    id: number;
    code: string;
    name: string;
    isactive: boolean;
    startdate: string;
    enddate: string;
    expiretime: number;
    price: number;
  }>;
  pagination: {
    total: number;
    pageSize: number;
    currentItem: number;
    totalPages: number;
    hasMore: boolean;
  };
  meta: {
    request_id: string;
    duration_ms: number;
  };
}

interface ApiErrorResponse {
  error: string;
  error_description: string;
  request_id: string;
  required_permission?: string;
}

interface IssueVoucherRequest {
  campaign_id: number;
  creator_phone: string;
  recipient_phone: string;
  customer_source: string;
  customer_type: 'new' | 'existing';
}

interface IssueVoucherResponse {
  success: boolean;
  code: string; // Voucher code
  campaign_id: number;
  campaign_code: string;
  created_at: string;
  activated_at: string;
  expired_at: string;
  activation_status: string;
  recipient_phone: string;
  creator_phone: string;
  customer_type: string;
  customer_source: string;
}

class ExternalApiService {

  /**
   * Build query string from pagination and filters
   */
  private buildQueryString(pagination: PaginationParams = {}, filters: VoucherCampaignFilters = {}): string {
    const params = new URLSearchParams();

    // Add pagination params
    if (pagination.pageSize !== undefined) {
      params.append('pageSize', pagination.pageSize.toString());
    }
    if (pagination.currentItem !== undefined) {
      params.append('currentItem', pagination.currentItem.toString());
    }

    // Add filter params
    if (filters.id !== undefined) {
      params.append('id', filters.id.toString());
    }
    if (filters.code) {
      params.append('code', filters.code);
    }
    if (filters.name) {
      params.append('name', filters.name);
    }
    if (filters.isactive !== undefined) {
      params.append('isactive', filters.isactive.toString());
    }
    if (filters.startdate) {
      params.append('startdate', filters.startdate);
    }
    if (filters.enddate) {
      params.append('enddate', filters.enddate);
    }
    if (filters.expiretime !== undefined) {
      params.append('expiretime', filters.expiretime.toString());
    }
    if (filters.price !== undefined) {
      params.append('price', filters.price.toString());
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Fetch voucher campaigns from external API
   */
  async fetchVoucherCampaigns(
    pagination: PaginationParams = { pageSize: 200, currentItem: 0 },
    filters: VoucherCampaignFilters = {}
  ): Promise<VoucherCampaignResponse> {
    try {
      console.log('📋 Fetching voucher campaigns from API...');

      // Get valid token
      let token: string;
      try {
        console.log('🔐 Getting valid token...');
        token = await tokenService.getValidToken();
        console.log('✅ Token obtained');
      } catch (error) {
        console.error('❌ Failed to get token:', error);
        return {
          success: false,
          data: [],
          pagination: {
            total: 0,
            pageSize: 0,
            currentItem: 0,
            totalPages: 0,
            hasMore: false,
          },
          meta: {
            request_id: '',
            duration_ms: 0,
          },
        };
      }

      const queryString = this.buildQueryString(pagination, filters);
      const apiUrl = `${API_BASE_URL}/list-voucher-campaigns-kiotviet${queryString}`;

      console.log('🌐 Calling campaigns API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Campaigns API response status:', response.status);

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
            const errorData: ApiErrorResponse = await retryResponse.json();
            console.error('❌ Retry failed:', errorData);
            throw new Error(`API error: ${retryResponse.status} - ${errorData.error_description}`);
          }

          const data: VoucherCampaignResponse = await retryResponse.json();
          console.log('✅ Campaigns fetched successfully:', data.data.length, 'campaigns');
          return data;
        } catch (retryError) {
          console.error('❌ Retry error:', retryError);
          return {
            success: false,
            data: [],
            pagination: {
              total: 0,
              pageSize: 0,
              currentItem: 0,
              totalPages: 0,
              hasMore: false,
            },
            meta: {
              request_id: '',
              duration_ms: 0,
            },
          };
        }
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        console.error('❌ Campaigns API error:', errorData);
        throw new Error(`API error (${response.status}): ${errorData.error_description}`);
      }

      const data: VoucherCampaignResponse = await response.json();
      console.log('✅ Campaigns fetched successfully:', data.data.length, 'campaigns');
      return data;
    } catch (error) {
      console.error('Error fetching voucher campaigns from external API:', error);
      throw error;
    }
  }

  /**
   * Fetch all active campaigns (convenience method)
   */
  async fetchActiveCampaigns(): Promise<VoucherCampaignResponse> {
    return this.fetchVoucherCampaigns(
      { pageSize: 200, currentItem: 0 },
      { isactive: true }
    );
  }

  /**
   * Issue voucher via external API
   */
  async issueVoucher(request: IssueVoucherRequest): Promise<IssueVoucherResponse> {
    try {
      console.log('🎫 Issuing voucher via API...', request);

      // Get valid token
      let token: string;
      try {
        console.log('🔐 Getting valid token...');
        token = await tokenService.getValidToken();
        console.log('✅ Token obtained');
      } catch (error) {
        console.error('❌ Failed to get token:', error);
        throw new Error('Lỗi xác thực. Vui lòng thử lại sau.');
      }

      const apiUrl = `${API_BASE_URL}/create-and-release-voucher`;

      console.log('🌐 Calling voucher issuance API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      console.log('📡 Voucher API response status:', response.status);

      // If unauthorized, try to refresh token and retry
      if (response.status === 401) {
        console.log('🔄 Token expired (401), refreshing...');
        try {
          token = await tokenService.refreshToken();
          console.log('✅ Token refreshed, retrying...');

          const retryResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          });

          console.log('📡 Retry response status:', retryResponse.status);

          if (!retryResponse.ok) {
            const errorData: ApiErrorResponse = await retryResponse.json();
            console.error('❌ Retry failed:', errorData);
            throw new Error(`API error: ${retryResponse.status} - ${errorData.error_description}`);
          }

          const data: IssueVoucherResponse = await retryResponse.json();
          console.log('✅ Voucher issued successfully:', data.code);
          return data;
        } catch (retryError) {
          console.error('❌ Retry error:', retryError);
          throw new Error('Lỗi kết nối API. Vui lòng thử lại sau.');
        }
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        console.error('❌ Voucher API error:', errorData);

        if (response.status === 403) {
          throw new Error(`Forbidden: ${errorData.error_description}. Required permission: ${errorData.required_permission}`);
        } else {
          throw new Error(`API error (${response.status}): ${errorData.error_description}`);
        }
      }

      const data: IssueVoucherResponse = await response.json();
      console.log('✅ Voucher issued successfully:', data.code);
      return data;
    } catch (error) {
      console.error('Error issuing voucher via external API:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const externalApiService = new ExternalApiService();
