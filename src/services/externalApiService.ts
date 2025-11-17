/**
 * External API Service for KiotViet Voucher Campaigns
 * Handles communication with Supabase Edge Functions
 */

const EXTERNAL_API_BASE_URL = 'https://kcirpjxbjqagrqrjfldu.supabase.co/functions/v1';

interface ExternalApiConfig {
  oauthToken: string;
}

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

class ExternalApiService {
  private config: ExternalApiConfig = {
    oauthToken: '', // Will be set from environment or auth service
  };

  /**
   * Set OAuth token for API calls
   */
  setOAuthToken(token: string) {
    this.config.oauthToken = token;
  }

  /**
   * Get OAuth token from environment or return empty string
   */
  private getOAuthToken(): string {
    // Try to get from environment variable first
    const envToken = import.meta.env.VITE_EXTERNAL_API_OAUTH_TOKEN;
    if (envToken) {
      return envToken;
    }

    // Otherwise use the configured token
    return this.config.oauthToken;
  }

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
    const token = this.getOAuthToken();

    if (!token) {
      console.warn('No OAuth token configured for external API');
      // Return empty response if no token
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

    try {
      const queryString = this.buildQueryString(pagination, filters);
      const url = `${EXTERNAL_API_BASE_URL}/list-voucher-campaigns-kiotviet${queryString}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();

        if (response.status === 401) {
          throw new Error(`Unauthorized: ${errorData.error_description}`);
        } else if (response.status === 403) {
          throw new Error(`Forbidden: ${errorData.error_description}. Required permission: ${errorData.required_permission}`);
        } else {
          throw new Error(`API error (${response.status}): ${errorData.error_description}`);
        }
      }

      const data: VoucherCampaignResponse = await response.json();
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
}

// Export singleton instance
export const externalApiService = new ExternalApiService();
