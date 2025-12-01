// Affiliate Campaign Service - Query campaigns from api.affiliate_campaign_settings
import { supabase } from '@/lib/supabase';

// Interface matching api.affiliate_campaign_settings view
// This view JOINs affiliate.affiliate_campaign_settings with api.list_voucher_campaigns_kiotviet
export interface AffiliateCampaign {
  // From affiliate.affiliate_campaign_settings
  id: string;                          // UUID PK
  campaign_id: number;                 // FK to list_voucher_campaigns_kiotviet.id (bigint)
  affiliate_name: string;              // Custom name set by Affiliate Admin
  affiliate_description?: string;      // Custom description
  affiliate_is_active: boolean;        // TRUE = visible to F0 partners
  affiliate_is_default: boolean;       // TRUE = auto-select in dropdown
  affiliate_voucher_image_url?: string; // Voucher image URL
  affiliate_created_at?: string;
  affiliate_updated_at?: string;
  affiliate_created_by?: string;

  // From api.list_voucher_campaigns_kiotviet (JOIN)
  code?: string;                       // Campaign code from KiotViet
  name?: string;                       // Campaign name from KiotViet
  startdate?: string;                  // Campaign start date from KiotViet
  enddate?: string;                    // Campaign end date from KiotViet (fixed expiry)
  expiretime?: number;                 // Days until voucher expires from issue date (relative expiry)
  isactive?: boolean;                  // KiotViet campaign status
  prereqprice?: number;                // Minimum order value
  quantity?: number;                   // Voucher quantity
  price?: number;                      // Voucher value
}

// Expiry info type for UI display
export interface ExpiryInfo {
  type: 'relative' | 'fixed';
  text: string;
  color: string;
  icon: 'clock' | 'calendar';
}

// Interface for campaign item in JSONB array
export interface CampaignLinkItem {
  campaign_setting_id: string;
  campaign_code: string;
  campaign_name: string;
  click_count: number;
  conversion_count: number;
  is_active: boolean;
  created_at: string;
  last_clicked_at?: string | null;
}

// Interface for referral links record (1 row per F0)
export interface ReferralLinksRecord {
  id: string;
  f0_id?: string;
  f0_code: string;
  campaigns: CampaignLinkItem[];
  created_at: string;
  updated_at?: string;
}

// Interface for backward compatibility with UI (flattened view)
export interface ReferralLink {
  id: string;               // Combined: record_id + campaign_code
  f0_id?: string;
  f0_code: string;
  campaign_setting_id: string;
  campaign_code: string;
  campaign_name: string;
  full_url: string;
  click_count: number;
  conversion_count: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  last_clicked_at?: string | null;
}

/**
 * Format expiry info for display in UI
 * - Relative: expiretime > 0 → "Hết hạn sau X ngày kể từ ngày phát hành"
 * - Fixed: enddate có giá trị → "Hết hạn vào ngày: DD/MM/YYYY"
 */
export function formatExpiryInfo(campaign: AffiliateCampaign): ExpiryInfo | null {
  if (campaign.expiretime != null && campaign.expiretime > 0) {
    return {
      type: 'relative',
      text: `Hết hạn sau ${campaign.expiretime} ngày kể từ ngày phát hành`,
      color: 'text-blue-600',
      icon: 'clock'
    };
  } else if (campaign.enddate) {
    const endDate = new Date(campaign.enddate);
    return {
      type: 'fixed',
      text: `Hết hạn vào ngày: ${endDate.toLocaleDateString('vi-VN')}`,
      color: 'text-orange-600',
      icon: 'calendar'
    };
  }
  return null;
}

/**
 * Calculate actual voucher expiry date for an issued voucher
 * @param campaign - Campaign with expiry settings
 * @param issueDate - Date when voucher was issued
 * @returns Expiry date or null if cannot determine
 */
export function calculateVoucherExpiryDate(
  campaign: AffiliateCampaign,
  issueDate: Date
): Date | null {
  if (campaign.expiretime != null && campaign.expiretime > 0) {
    // Relative: issue date + expiretime days
    const expiryDate = new Date(issueDate);
    expiryDate.setDate(expiryDate.getDate() + campaign.expiretime);
    return expiryDate;
  } else if (campaign.enddate) {
    // Fixed: campaign end date
    return new Date(campaign.enddate);
  }
  return null;
}

class AffiliateCampaignService {
  /**
   * Get all active campaigns for F0 to select
   * Only returns campaigns with affiliate_is_active = true
   */
  async getActiveCampaigns(): Promise<AffiliateCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('affiliate_campaign_settings')
        .select('*')
        .eq('affiliate_is_active', true)
        .order('affiliate_name');

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
   * Get the default campaign (affiliate_is_default = true)
   */
  async getDefaultCampaign(): Promise<AffiliateCampaign | null> {
    try {
      const { data, error } = await supabase
        .from('affiliate_campaign_settings')
        .select('*')
        .eq('affiliate_is_active', true)
        .eq('affiliate_is_default', true)
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
   * Get campaign by code (KiotViet campaign code)
   */
  async getCampaignByCode(campaignCode: string): Promise<AffiliateCampaign | null> {
    try {
      const { data, error } = await supabase
        .from('affiliate_campaign_settings')
        .select('*')
        .eq('code', campaignCode)
        .eq('affiliate_is_active', true)
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
   * Create or get existing referral link (JSONB structure)
   * Uses get-or-create pattern: if campaign exists in F0's campaigns array, return it
   * Otherwise add new campaign to the array
   */
  async createReferralLink(f0Code: string, campaign: AffiliateCampaign): Promise<{
    success: boolean;
    is_new?: boolean;
    link?: ReferralLink;
    error?: string;
    error_code?: string;
  }> {
    try {
      const campaignCode = campaign.code || '';
      const displayName = campaign.affiliate_name || campaign.name || '';
      const fullUrl = this.generateReferralLink(f0Code, campaignCode);

      // Get existing record for this F0
      const { data: existingRecord, error: fetchError } = await supabase
        .from('referral_links')
        .select('*')
        .eq('f0_code', f0Code)
        .single();

      if (existingRecord && !fetchError) {
        // F0 record exists - check if campaign already in array
        const campaigns: CampaignLinkItem[] = existingRecord.campaigns || [];
        const existingCampaign = campaigns.find(c => c.campaign_code === campaignCode);

        if (existingCampaign) {
          // Campaign already exists - return it
          return {
            success: true,
            is_new: false,
            link: {
              id: `${existingRecord.id}_${campaignCode}`,
              f0_id: existingRecord.f0_id,
              f0_code: f0Code,
              campaign_setting_id: existingCampaign.campaign_setting_id,
              campaign_code: existingCampaign.campaign_code,
              campaign_name: existingCampaign.campaign_name,
              full_url: fullUrl,
              click_count: existingCampaign.click_count || 0,
              conversion_count: existingCampaign.conversion_count || 0,
              is_active: existingCampaign.is_active,
              created_at: existingCampaign.created_at,
              last_clicked_at: existingCampaign.last_clicked_at,
            },
          };
        }

        // Add new campaign to array
        const newCampaignItem: CampaignLinkItem = {
          campaign_setting_id: campaign.id,
          campaign_code: campaignCode,
          campaign_name: displayName,
          click_count: 0,
          conversion_count: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          last_clicked_at: null,
        };

        const updatedCampaigns = [...campaigns, newCampaignItem];

        const { error: updateError } = await supabase
          .from('referral_links')
          .update({ campaigns: updatedCampaigns })
          .eq('id', existingRecord.id);

        if (updateError) {
          console.error('Error updating referral links:', updateError);
        }

        return {
          success: true,
          is_new: true,
          link: {
            id: `${existingRecord.id}_${campaignCode}`,
            f0_id: existingRecord.f0_id,
            f0_code: f0Code,
            campaign_setting_id: campaign.id,
            campaign_code: campaignCode,
            campaign_name: displayName,
            full_url: fullUrl,
            click_count: 0,
            conversion_count: 0,
            is_active: true,
            created_at: newCampaignItem.created_at,
            last_clicked_at: null,
          },
        };
      }

      // No record exists for this F0 - create new one
      const newCampaignItem: CampaignLinkItem = {
        campaign_setting_id: campaign.id,
        campaign_code: campaignCode,
        campaign_name: displayName,
        click_count: 0,
        conversion_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        last_clicked_at: null,
      };

      const { data: newRecord, error: insertError } = await supabase
        .from('referral_links')
        .insert({
          f0_code: f0Code,
          campaigns: [newCampaignItem],
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting referral link:', insertError);
        // Return generated link even on error
        return {
          success: true,
          is_new: true,
          link: {
            id: `new_${campaignCode}`,
            f0_code: f0Code,
            campaign_setting_id: campaign.id,
            campaign_code: campaignCode,
            campaign_name: displayName,
            full_url: fullUrl,
            click_count: 0,
            conversion_count: 0,
            is_active: true,
            created_at: newCampaignItem.created_at,
            last_clicked_at: null,
          },
        };
      }

      return {
        success: true,
        is_new: true,
        link: {
          id: `${newRecord.id}_${campaignCode}`,
          f0_id: newRecord.f0_id,
          f0_code: f0Code,
          campaign_setting_id: campaign.id,
          campaign_code: campaignCode,
          campaign_name: displayName,
          full_url: fullUrl,
          click_count: 0,
          conversion_count: 0,
          is_active: true,
          created_at: newCampaignItem.created_at,
          last_clicked_at: null,
        },
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
   * Get all referral links created by F0 (flattened from JSONB)
   * Returns array of ReferralLink for backward compatibility with UI
   *
   * IMPORTANT: conversion_count is calculated REALTIME from voucher_affiliate_tracking
   * to ensure data consistency (not stored in JSONB anymore)
   */
  async getReferralLinksByF0(f0Code: string): Promise<ReferralLink[]> {
    try {
      // Query referral_links and voucher counts in parallel
      const [linksResult, voucherCountsResult] = await Promise.all([
        supabase
          .from('referral_links')
          .select('*')
          .eq('f0_code', f0Code)
          .single(),
        // Get conversion counts per campaign from voucher_affiliate_tracking
        supabase
          .from('voucher_affiliate_tracking')
          .select('campaign_code')
          .eq('f0_code', f0Code)
      ]);

      const { data: record, error } = linksResult;

      if (error) {
        // No record found is not an error
        if (error.code === 'PGRST116') {
          return [];
        }
        console.error('Error fetching referral links:', error);
        return [];
      }

      if (!record || !record.campaigns) {
        return [];
      }

      // Calculate conversion counts from voucher_affiliate_tracking
      const conversionCounts = new Map<string, number>();
      if (voucherCountsResult.data) {
        for (const voucher of voucherCountsResult.data) {
          const code = voucher.campaign_code;
          conversionCounts.set(code, (conversionCounts.get(code) || 0) + 1);
        }
      }

      // Flatten JSONB array to ReferralLink array for UI
      const campaigns: CampaignLinkItem[] = record.campaigns;
      return campaigns.map(c => ({
        id: `${record.id}_${c.campaign_code}`,
        f0_id: record.f0_id,
        f0_code: record.f0_code,
        campaign_setting_id: c.campaign_setting_id,
        campaign_code: c.campaign_code,
        campaign_name: c.campaign_name,
        full_url: this.generateReferralLink(f0Code, c.campaign_code),
        click_count: c.click_count || 0,
        // REALTIME: Get conversion_count from voucher_affiliate_tracking, not JSONB
        conversion_count: conversionCounts.get(c.campaign_code) || 0,
        is_active: c.is_active,
        created_at: c.created_at,
        updated_at: record.updated_at,
        last_clicked_at: c.last_clicked_at,
      })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
   * Delete a referral link (remove campaign from JSONB array)
   * linkId format: {recordId}_{campaignCode}
   */
  async deleteReferralLink(linkId: string, f0Code: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Parse linkId to get recordId and campaignCode
      const parts = linkId.split('_');
      if (parts.length < 2) {
        return {
          success: false,
          error: 'ID link không hợp lệ',
        };
      }
      const recordId = parts[0];
      const campaignCode = parts.slice(1).join('_'); // Handle campaign codes with underscores

      // Get the F0's record
      const { data: record, error: fetchError } = await supabase
        .from('referral_links')
        .select('*')
        .eq('id', recordId)
        .single();

      if (fetchError || !record) {
        return {
          success: false,
          error: 'Không tìm thấy link',
        };
      }

      if (record.f0_code !== f0Code) {
        return {
          success: false,
          error: 'Bạn không có quyền xóa link này',
        };
      }

      // Remove campaign from array
      const campaigns: CampaignLinkItem[] = record.campaigns || [];
      const updatedCampaigns = campaigns.filter(c => c.campaign_code !== campaignCode);

      if (updatedCampaigns.length === campaigns.length) {
        return {
          success: false,
          error: 'Không tìm thấy chiến dịch trong link',
        };
      }

      // If no campaigns left, delete the entire row
      if (updatedCampaigns.length === 0) {
        const { error: deleteError } = await supabase
          .from('referral_links')
          .delete()
          .eq('id', recordId);

        if (deleteError) {
          console.error('Error deleting referral record:', deleteError);
          return {
            success: false,
            error: 'Lỗi khi xóa link',
          };
        }
      } else {
        // Update record with filtered campaigns
        const { error: updateError } = await supabase
          .from('referral_links')
          .update({ campaigns: updatedCampaigns })
          .eq('id', recordId);

        if (updateError) {
          console.error('Error deleting link:', updateError);
          return {
            success: false,
            error: 'Lỗi khi xóa link',
          };
        }
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

// Export singleton instance
export const affiliateCampaignService = new AffiliateCampaignService();
