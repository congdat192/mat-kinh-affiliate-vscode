// Affiliate Campaign Service - Query campaigns from api.affiliate_campaign_settings
import { supabase } from '@/lib/supabase';

// Interface matching affiliate.campaign_settings table
export interface AffiliateCampaign {
  id: string;
  campaign_id: string;        // ID từ KiotViet
  campaign_code?: string;     // Mã campaign từ KiotViet
  name: string;               // Tên chiến dịch
  description?: string;       // Mô tả
  is_active: boolean;         // TRUE = hiển thị cho F0
  is_default: boolean;        // TRUE = auto-select trong dropdown
  voucher_image_url?: string; // URL ảnh voucher
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

class AffiliateCampaignService {
  /**
   * Get all active campaigns for F0 to select
   * Only returns campaigns with is_active = true
   */
  async getActiveCampaigns(): Promise<AffiliateCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('affiliate_campaign_settings')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching campaigns:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActiveCampaigns:', error);
      throw error;
    }
  }

  /**
   * Get the default campaign (is_default = true)
   */
  async getDefaultCampaign(): Promise<AffiliateCampaign | null> {
    try {
      const { data, error } = await supabase
        .from('affiliate_campaign_settings')
        .select('*')
        .eq('is_active', true)
        .eq('is_default', true)
        .single();

      if (error) {
        // No default campaign found is not an error
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching default campaign:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getDefaultCampaign:', error);
      return null;
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(id: string): Promise<AffiliateCampaign | null> {
    try {
      const { data, error } = await supabase
        .from('affiliate_campaign_settings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching campaign:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCampaignById:', error);
      return null;
    }
  }

  /**
   * Get campaign by campaign_code (KiotViet code)
   */
  async getCampaignByCode(code: string): Promise<AffiliateCampaign | null> {
    try {
      const { data, error } = await supabase
        .from('affiliate_campaign_settings')
        .select('*')
        .eq('campaign_code', code)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching campaign by code:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCampaignByCode:', error);
      return null;
    }
  }

  /**
   * Generate referral link for F0
   * Format: https://domain.com/claim-voucher?ref={f0_code}&campaign={campaign_code}
   */
  generateReferralLink(f0Code: string, campaignCode: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/claim-voucher?ref=${f0Code}&campaign=${campaignCode}`;
  }
}

// Export singleton instance
export const affiliateCampaignService = new AffiliateCampaignService();
