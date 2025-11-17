// Mock data for campaigns, assignments, and vouchers
import type { Campaign, F0CampaignAssignment, VoucherIssued } from '@/types/campaign';

// Mock Campaigns
export const mockCampaigns: Campaign[] = [
  {
    id: 'camp-001',
    name: 'Voucher 200K',
    code: 'VOUCHER200K',
    value: 200000,
    description: 'Voucher giảm giá 200,000 VNĐ cho khách hàng mới',
    validity_days: 30,
    status: 'active',
    created_at: '2025-11-01T00:00:00Z',
    updated_at: '2025-11-01T00:00:00Z',
  },
  {
    id: 'camp-002',
    name: 'Voucher 100K',
    code: 'VOUCHER100K',
    value: 100000,
    description: 'Voucher giảm giá 100,000 VNĐ cho khách hàng mới',
    validity_days: 30,
    status: 'active',
    created_at: '2025-11-02T00:00:00Z',
    updated_at: '2025-11-02T00:00:00Z',
  },
  {
    id: 'camp-003',
    name: 'Voucher 50K',
    code: 'VOUCHER50K',
    value: 50000,
    description: 'Voucher giảm giá 50,000 VNĐ cho khách hàng mới',
    validity_days: 15,
    status: 'active',
    created_at: '2025-11-03T00:00:00Z',
    updated_at: '2025-11-03T00:00:00Z',
  },
  {
    id: 'camp-004',
    name: 'Voucher VIP 500K',
    code: 'VOUCHERVIP500K',
    value: 500000,
    description: 'Voucher VIP giảm giá 500,000 VNĐ cho khách hàng mới (KOL)',
    validity_days: 60,
    status: 'active',
    created_at: '2025-11-04T00:00:00Z',
    updated_at: '2025-11-04T00:00:00Z',
  },
];

// Mock F0 Campaign Assignments
export const mockF0Assignments: F0CampaignAssignment[] = [
  {
    id: 'assign-001',
    f0_code: 'F0-001',
    f0_name: 'Nguyễn Văn A',
    campaign_id: 'camp-001', // Voucher 200K
    assignment_type: 'both',
    assigned_at: '2025-11-10T00:00:00Z',
  },
  {
    id: 'assign-002',
    f0_code: 'F0-002',
    f0_name: 'Trần Thị B',
    campaign_id: 'camp-002', // Voucher 100K
    assignment_type: 'direct',
    assigned_at: '2025-11-11T00:00:00Z',
  },
  {
    id: 'assign-003',
    f0_code: 'F0-002',
    f0_name: 'Trần Thị B',
    campaign_id: 'camp-003', // Voucher 50K
    assignment_type: 'link',
    assigned_at: '2025-11-11T00:00:00Z',
  },
  {
    id: 'assign-004',
    f0_code: 'F0-003',
    f0_name: 'Lê Văn C (KOL)',
    campaign_id: 'camp-004', // Voucher VIP 500K
    assignment_type: 'link',
    assigned_at: '2025-11-12T00:00:00Z',
  },
];

// Mock Vouchers Issued
export const mockVouchersIssued: VoucherIssued[] = [
  {
    id: 'voucher-001',
    voucher_code: 'VOUCHER-ABC123',
    campaign_id: 'camp-001',
    campaign_name: 'Voucher 200K',
    f0_code: 'F0-001',
    f0_name: 'Nguyễn Văn A',
    f1_phone: '0901234567',
    f1_name: 'Phạm Thị D',
    f1_email: 'phamthid@email.com',
    issued_via: 'direct',
    status: 'used',
    issued_at: '2025-11-15T10:00:00Z',
    used_at: '2025-11-16T14:30:00Z',
  },
  {
    id: 'voucher-002',
    voucher_code: 'VOUCHER-XYZ789',
    campaign_id: 'camp-002',
    campaign_name: 'Voucher 100K',
    f0_code: 'F0-002',
    f0_name: 'Trần Thị B',
    f1_phone: '0912345678',
    f1_name: 'Hoàng Văn E',
    issued_via: 'direct',
    status: 'sent',
    issued_at: '2025-11-16T09:00:00Z',
  },
  {
    id: 'voucher-003',
    voucher_code: 'VOUCHER-DEF456',
    campaign_id: 'camp-004',
    campaign_name: 'Voucher VIP 500K',
    f0_code: 'F0-003',
    f0_name: 'Lê Văn C (KOL)',
    f1_phone: '0923456789',
    issued_via: 'link',
    ref_code: 'F0-003',
    status: 'sent',
    issued_at: '2025-11-17T08:00:00Z',
  },
];

// Helper function to get campaigns by F0
export function getCampaignsByF0(f0_code: string, type?: 'direct' | 'link' | 'both'): Campaign[] {
  let assignments = mockF0Assignments.filter((a) => a.f0_code === f0_code);

  if (type) {
    assignments = assignments.filter(
      (a) => a.assignment_type === type || a.assignment_type === 'both'
    );
  }

  const campaignIds = assignments.map((a) => a.campaign_id);
  return mockCampaigns.filter((c) => campaignIds.includes(c.id) && c.status === 'active');
}

// Helper function to generate voucher code
export function generateVoucherCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'VOUCHER-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
