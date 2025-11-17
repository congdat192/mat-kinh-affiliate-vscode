// Campaign types - Quản lý các chiến dịch voucher

export interface Campaign {
  id: string;
  name: string; // "Voucher 200K"
  code: string; // "VOUCHER200K"
  value: number; // 200000 (VND)
  description: string;
  validity_days: number; // 30 ngày
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface F0CampaignAssignment {
  id: string;
  f0_code: string; // "F0-001"
  f0_name: string; // "Nguyễn Văn A"
  campaign_id: string;
  assignment_type: 'direct' | 'link' | 'both'; // Phát trực tiếp, qua link, hoặc cả hai
  assigned_at: string;
}

export interface VoucherIssued {
  id: string;
  voucher_code: string; // "VOUCHER-ABC123"
  campaign_id: string;
  campaign_name: string;
  f0_code: string;
  f0_name: string;
  f1_phone: string;
  f1_name?: string;
  f1_email?: string;
  issued_via: 'direct' | 'link'; // Phát trực tiếp hay qua ref link
  ref_code?: string; // Mã ref nếu phát qua link
  status: 'sent' | 'used' | 'expired';
  issued_at: string;
  used_at?: string;
  expired_at?: string;
}

export interface CreateCampaignRequest {
  name: string;
  code: string;
  value: number;
  description: string;
  validity_days: number;
}

export interface AssignCampaignRequest {
  f0_code: string;
  campaign_id: string;
  assignment_type: 'direct' | 'link' | 'both';
}

export interface IssueVoucherRequest {
  f0_code: string;
  campaign_id: string;
  f1_phone: string;
  f1_name?: string;
  f1_email?: string;
  issued_via: 'direct' | 'link';
  ref_code?: string;
}
