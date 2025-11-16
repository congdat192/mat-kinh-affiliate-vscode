import type { TierConfig } from '@/types';

export const TIER_CONFIGS: Record<string, TierConfig> = {
  silver: {
    name: 'silver',
    displayName: 'Silver',
    minReferrals: 0,
    maxReferrals: 10,
    firstOrderCommission: 0.10, // 10%
    lifetimeCommission: 0, // Không có hoa hồng dài hạn
    color: '#C0C0C0',
    benefits: [
      'Hoa hồng 10% đơn hàng đầu tiên',
      'Tạo link giới thiệu không giới hạn',
      'Hỗ trợ qua email'
    ]
  },
  gold: {
    name: 'gold',
    displayName: 'Gold',
    minReferrals: 11,
    maxReferrals: 30,
    firstOrderCommission: 0.10, // 10%
    lifetimeCommission: 0.05, // 5%
    color: '#FFD700',
    benefits: [
      'Hoa hồng 10% đơn hàng đầu tiên',
      'Hoa hồng 5% trọn đời từ khách hàng',
      'Ưu tiên hỗ trợ',
      'Báo cáo chi tiết hàng tuần'
    ]
  },
  diamond: {
    name: 'diamond',
    displayName: 'Diamond',
    minReferrals: 31,
    maxReferrals: 50,
    firstOrderCommission: 0.10, // 10%
    lifetimeCommission: 0.08, // 8%
    color: '#B9F2FF',
    benefits: [
      'Hoa hồng 10% đơn hàng đầu tiên',
      'Hoa hồng 8% trọn đời từ khách hàng',
      'Hỗ trợ VIP 24/7',
      'Thưởng đặc biệt cuối quý',
      'Buổi đào tạo riêng'
    ]
  }
};

export const VOUCHER_VALUE = 200000; // 200.000đ
export const MIN_WITHDRAWAL_AMOUNT = 500000; // 500.000đ
export const VOUCHER_EXPIRY_DAYS = 30; // 30 ngày

export const BRAND_NAME = 'Mắt Kính Tâm Đức';
export const COMPANY_INFO = {
  name: BRAND_NAME,
  phone: '0123 456 789',
  email: 'contact@matkinhonline.com',
  address: 'TP. Hồ Chí Minh, Việt Nam'
};
