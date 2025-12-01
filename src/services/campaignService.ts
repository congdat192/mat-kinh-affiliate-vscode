// Campaign Service - Quản lý campaigns, assignments, và vouchers
import type {
  Campaign,
  F0CampaignAssignment,
  VoucherIssued,
  CreateCampaignRequest,
  AssignCampaignRequest,
  IssueVoucherRequest,
} from '@/types/campaign';
import { externalApiService } from './externalApiService';
import { supabase } from '@/lib/supabase';

// Interface for recent referral data
export interface RecentReferral {
  id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  status: string;
  voucherCode: string;
}

// Helper function to generate voucher code
function generateVoucherCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'VOUCHER-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class CampaignService {
  // In-memory storage (will be replaced with API calls later)
  private campaigns: Campaign[] = [];
  private assignments: F0CampaignAssignment[] = [];
  private vouchers: VoucherIssued[] = [];

  /**
   * Map external API campaign to internal Campaign interface
   */
  private mapExternalCampaign(apiCampaign: any): Campaign {
    return {
      id: apiCampaign.id.toString(), // Convert number to string
      name: apiCampaign.name,
      code: apiCampaign.code,
      value: apiCampaign.price, // API uses 'price', we use 'value'
      description: apiCampaign.name, // Use name as description for now
      validity_days: apiCampaign.expiretime,
      status: apiCampaign.isactive ? 'active' : 'inactive',
      created_at: apiCampaign.startdate,
      updated_at: apiCampaign.enddate,
    };
  }

  /**
   * Get all campaigns - Returns local campaigns only
   */
  async getAllCampaigns(): Promise<Campaign[]> {
    await this.delay(300);
    return this.campaigns.filter((c) => c.status === 'active');
  }

  /**
   * Fetch external campaigns for selection in Create Campaign modal
   */
  async fetchExternalCampaignsForSelection(): Promise<Array<{
    id: number;
    code: string;
    name: string;
    price: number;
    expiretime: number;
    startdate: string;
    enddate: string;
    isactive: boolean;
  }>> {
    try {
      const response = await externalApiService.fetchActiveCampaigns();

      if (response.success && response.data.length > 0) {
        return response.data;
      } else {
        console.warn('External API returned empty data');
        return [];
      }
    } catch (error) {
      console.error('Error fetching external campaigns:', error);
      return [];
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(id: string): Promise<Campaign | null> {
    await this.delay(200);
    return this.campaigns.find((c) => c.id === id) || null;
  }

  /**
   * Create new campaign (Admin only)
   */
  async createCampaign(request: CreateCampaignRequest): Promise<Campaign> {
    await this.delay(500);

    const newCampaign: Campaign = {
      id: `camp-${Date.now()}`,
      name: request.name,
      code: request.code,
      value: request.value,
      description: request.description,
      validity_days: request.validity_days,
      external_campaign_id: request.external_campaign_id,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.campaigns.push(newCampaign);
    return newCampaign;
  }

  /**
   * Update campaign (Admin only)
   */
  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    await this.delay(500);

    const index = this.campaigns.findIndex((c) => c.id === id);
    if (index === -1) return null;

    this.campaigns[index] = {
      ...this.campaigns[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return this.campaigns[index];
  }

  /**
   * Delete campaign (Admin only)
   */
  async deleteCampaign(id: string): Promise<boolean> {
    await this.delay(500);

    const index = this.campaigns.findIndex((c) => c.id === id);
    if (index === -1) return false;

    // Soft delete by setting status to inactive
    this.campaigns[index].status = 'inactive';
    return true;
  }

  /**
   * Get campaigns assigned to F0
   */
  async getCampaignsForF0(
    f0_code: string,
    type?: 'direct' | 'link'
  ): Promise<Campaign[]> {
    await this.delay(300);

    let assignments = this.assignments.filter((a) => a.f0_code === f0_code);

    if (type) {
      assignments = assignments.filter(
        (a) => a.assignment_type === type || a.assignment_type === 'both'
      );
    }

    const campaignIds = assignments.map((a) => a.campaign_id);
    return this.campaigns.filter((c) => campaignIds.includes(c.id) && c.status === 'active');
  }

  /**
   * Get all F0 assignments
   */
  async getAllAssignments(): Promise<F0CampaignAssignment[]> {
    await this.delay(300);
    return this.assignments;
  }

  /**
   * Assign campaign to F0 (Admin only)
   */
  async assignCampaignToF0(request: AssignCampaignRequest): Promise<F0CampaignAssignment> {
    await this.delay(500);

    // Check if assignment already exists
    const existing = this.assignments.find(
      (a) =>
        a.f0_code === request.f0_code &&
        a.campaign_id === request.campaign_id &&
        a.assignment_type === request.assignment_type
    );

    if (existing) {
      throw new Error('Assignment already exists');
    }

    const newAssignment: F0CampaignAssignment = {
      id: `assign-${Date.now()}`,
      f0_code: request.f0_code,
      f0_name: `F0 ${request.f0_code}`, // In real app, fetch from F0 data
      campaign_id: request.campaign_id,
      assignment_type: request.assignment_type,
      assigned_at: new Date().toISOString(),
    };

    this.assignments.push(newAssignment);
    return newAssignment;
  }

  /**
   * Remove assignment (Admin only)
   */
  async removeAssignment(id: string): Promise<boolean> {
    await this.delay(500);

    const index = this.assignments.findIndex((a) => a.id === id);
    if (index === -1) return false;

    this.assignments.splice(index, 1);
    return true;
  }

  /**
   * Issue voucher to F1
   */
  async issueVoucher(request: IssueVoucherRequest): Promise<VoucherIssued> {
    const campaign = await this.getCampaignById(request.campaign_id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Check if F0 has access to this campaign
    const assignments = await this.getCampaignsForF0(
      request.f0_code,
      request.issued_via === 'direct' ? 'direct' : 'link'
    );

    if (!assignments.find((c) => c.id === request.campaign_id)) {
      throw new Error('F0 does not have access to this campaign');
    }

    // Issue voucher via external API if campaign has external_campaign_id
    let voucherCode: string;
    let issuedAt: Date;
    let expiresAt: Date;

    if (campaign.external_campaign_id) {
      try {
        // Get F0 phone from F0 code (in real app, fetch from F0 database)
        const f0Phone = request.f0_code.replace('F0-', '09'); // Mock conversion for now

        const externalResponse = await externalApiService.issueVoucher({
          campaign_id: campaign.external_campaign_id,
          creator_phone: f0Phone,
          recipient_phone: request.f1_phone,
          customer_source: request.issued_via === 'direct' ? 'direct' : 'link',
          customer_type: 'new', // TODO: Check customer status via customer check API
        });

        voucherCode = externalResponse.code;
        issuedAt = new Date(externalResponse.created_at);
        expiresAt = new Date(externalResponse.expired_at);
      } catch (error) {
        console.error('Error issuing voucher via external API:', error);
        throw new Error('Failed to issue voucher via external API');
      }
    } else {
      // Fallback to mock voucher generation if no external campaign ID
      voucherCode = generateVoucherCode();
      issuedAt = new Date();
      expiresAt = new Date(issuedAt);
      expiresAt.setDate(expiresAt.getDate() + campaign.validity_days);
    }

    const newVoucher: VoucherIssued = {
      id: `voucher-${Date.now()}`,
      voucher_code: voucherCode,
      campaign_id: request.campaign_id,
      campaign_name: campaign.name,
      f0_code: request.f0_code,
      f0_name: `F0 ${request.f0_code}`, // In real app, fetch from F0 data
      f1_phone: request.f1_phone,
      f1_name: request.f1_name,
      f1_email: request.f1_email,
      issued_via: request.issued_via,
      ref_code: request.ref_code,
      status: 'sent',
      issued_at: issuedAt.toISOString(),
      expired_at: expiresAt.toISOString(),
    };

    this.vouchers.push(newVoucher);
    return newVoucher;
  }

  /**
   * Get vouchers issued by F0
   */
  async getVouchersByF0(f0_code: string): Promise<VoucherIssued[]> {
    await this.delay(300);
    return this.vouchers.filter((v) => v.f0_code === f0_code);
  }

  /**
   * Get all vouchers (Admin only)
   */
  async getAllVouchers(): Promise<VoucherIssued[]> {
    await this.delay(300);
    return this.vouchers;
  }

  /**
   * Get voucher by code
   */
  async getVoucherByCode(code: string): Promise<VoucherIssued | null> {
    await this.delay(200);
    return this.vouchers.find((v) => v.voucher_code === code) || null;
  }

  /**
   * Mark voucher as used
   */
  async markVoucherAsUsed(code: string): Promise<boolean> {
    await this.delay(500);

    const voucher = this.vouchers.find((v) => v.voucher_code === code);
    if (!voucher) return false;

    voucher.status = 'used';
    voucher.used_at = new Date().toISOString();
    return true;
  }

  /**
   * Get recent referrals for F0 from voucher_affiliate_tracking
   * @param f0_code - F0 partner code
   * @param limit - Max number of referrals to return (default 5)
   */
  async getRecentReferrals(f0_code: string, limit: number = 5): Promise<RecentReferral[]> {
    try {
      const { data, error } = await supabase
        .from('voucher_affiliate_tracking')
        .select('id, f1_phone, f1_name, voucher_code, status, claimed_at, used_at')
        .eq('f0_code', f0_code)
        .order('claimed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent referrals:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Map database records to RecentReferral interface
      return data.map((record: any) => ({
        id: record.id,
        name: record.f1_name || 'Khách hàng',
        phone: record.f1_phone || '',
        email: '', // voucher_affiliate_tracking doesn't store email
        date: record.claimed_at || new Date().toISOString(),
        status: record.used_at ? 'used' : 'sent',
        voucherCode: record.voucher_code || '',
      }));
    } catch (error) {
      console.error('Error in getRecentReferrals:', error);
      return [];
    }
  }

  /**
   * Helper to simulate API delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const campaignService = new CampaignService();
