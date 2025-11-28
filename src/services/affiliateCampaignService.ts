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
   * Create or get existing referral link (client-side generation)
   * Uses get-or-create pattern: if link exists, returns it; otherwise creates new one
   * Link is generated dynamically using current origin (localhost/vercel/production)
   */
  async createReferralLink(f0Code: string, campaign: AffiliateCampaign): Promise<{
    success: boolean;
    is_new?: boolean;
    link?: ReferralLink;
    error?: string;
    error_code?: string;
  }> {
    try {
      // Check if link already exists for this F0 + campaign
      const { data: existingLink, error: fetchError } = await supabase
        .from('referral_links')
        .select('*')
        .eq('f0_code', f0Code)
        .eq('campaign_code', campaign.campaign_code)
        .single();

      if (existingLink && !fetchError) {
        // Link already exists, return it with updated full_url (in case domain changed)
        const updatedUrl = this.generateReferralLink(f0Code, campaign.campaign_code || '');
        return {
          success: true,
          is_new: false,
          link: {
            ...existingLink,
            full_url: updatedUrl, // Always use current domain
          },
        };
      }

      // Generate link client-side
      const fullUrl = this.generateReferralLink(f0Code, campaign.campaign_code || '');

      // Insert new link record (for history tracking)
      const { data: newLink, error: insertError } = await supabase
        .from('referral_links')
        .insert({
          f0_code: f0Code,
          campaign_setting_id: campaign.id,
          campaign_code: campaign.campaign_code,
          campaign_name: campaign.name,
          full_url: fullUrl,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting referral link:', insertError);
        // If insert fails (e.g., unique constraint), still return the generated link
        return {
          success: true,
          is_new: true,
          link: {
            id: '',
            f0_code: f0Code,
            campaign_setting_id: campaign.id,
            campaign_code: campaign.campaign_code || '',
            campaign_name: campaign.name,
            full_url: fullUrl,
            is_active: true,
            created_at: new Date().toISOString(),
          },
        };
      }

      return {
        success: true,
        is_new: true,
        link: newLink,
      };
    } catch (error) {
      console.error('Error in createReferralLink:', error);
      return {
        success: false,
        error: 'Lỗi hệ thống. Vui lòng thử lại sau.',
        error_code: 'SYSTEM_ERROR',
      };
    }
  }

  /**
   * Get all referral links created by F0
   */
  async getReferralLinksByF0(f0Code: string): Promise<ReferralLink[]> {
    try {
      const { data, error } = await supabase
        .from('referral_links')
        .select('*')
        .eq('f0_code', f0Code)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching referral links:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getReferralLinksByF0:', error);
      return [];
    }
  }

  /**
   * Generate referral link for F0 (local generation - for display only)
   * Format: https://domain.com/claim-voucher?ref={f0_code}&campaign={campaign_code}
   */
  generateReferralLink(f0Code: string, campaignCode: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/claim-voucher?ref=${f0Code}&campaign=${campaignCode}`;
  }

  /**
   * Delete a referral link by ID
   * Only allows deletion if link belongs to the F0
   */
  async deleteReferralLink(linkId: string, f0Code: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // First verify the link belongs to this F0
      const { data: link, error: fetchError } = await supabase
        .from('referral_links')
        .select('id, f0_code')
        .eq('id', linkId)
        .single();

      if (fetchError || !link) {
        return {
          success: false,
          error: 'Không tìm thấy link',
        };
      }

      if (link.f0_code !== f0Code) {
        return {
          success: false,
          error: 'Bạn không có quyền xóa link này',
        };
      }

      // Delete the link
      const { error: deleteError } = await supabase
        .from('referral_links')
        .delete()
        .eq('id', linkId);

      if (deleteError) {
        console.error('Error deleting link:', deleteError);
        return {
          success: false,
          error: 'Lỗi khi xóa link',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteReferralLink:', error);
      return {
        success: false,
        error: 'Lỗi hệ thống. Vui lòng thử lại sau.',
      };
    }
  }
}

// Interface for referral link
export interface ReferralLink {
  id: string;
  f0_id?: string;           // Optional - we identify by f0_code
  f0_code: string;
  campaign_setting_id: string;
  campaign_code: string;
  campaign_name: string;
  full_url: string;
  click_count?: number;     // Default 0 in DB
  conversion_count?: number; // Default 0 in DB
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  last_clicked_at?: string;
}

// Export singleton instance
export const affiliateCampaignService = new AffiliateCampaignService();
