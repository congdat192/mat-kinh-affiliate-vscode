import type { TierConfig } from '@/types';

// Data synced from f0_tiers table in database
// Tier requirements: min_referrals (F1 count) + min_revenue (F1 revenue)
export const TIER_CONFIGS: Record<string, TierConfig> = {
  bronze: {
    name: 'bronze',
    displayName: 'Đồng',
    minReferrals: 0,         // From DB: requirements.min_referrals
    maxReferrals: 4,
    minRevenue: 0,           // From DB: requirements.min_revenue
    firstOrderCommission: 0.05,
    lifetimeCommission: 0,
    color: '#CD7F32',
    benefits: [
      'Thứ hạng khởi điểm',
      'Hoa hồng cơ bản +0.5%',
      'Tạo link giới thiệu không giới hạn'
    ]
  },
  silver: {
    name: 'silver',
    displayName: 'Bạc',
    minReferrals: 5,         // From DB: requirements.min_referrals
    maxReferrals: 19,
    minRevenue: 5000000,     // From DB: requirements.min_revenue (5,000,000 VND)
    firstOrderCommission: 0.07,
    lifetimeCommission: 0.02,
    color: '#C0C0C0',
    benefits: [
      'Ưu tiên hỗ trợ',
      'Hoa hồng +2% bonus',
      'Báo cáo hàng tuần'
    ]
  },
  gold: {
    name: 'gold',
    displayName: 'Vàng',
    minReferrals: 20,        // From DB: requirements.min_referrals
    maxReferrals: 49,
    minRevenue: 20000000,    // From DB: requirements.min_revenue (20,000,000 VND)
    firstOrderCommission: 0.09,
    lifetimeCommission: 0.05,
    color: '#FFD700',
    benefits: [
      'Campaign độc quyền',
      'Hoa hồng +5% bonus',
      'Hỗ trợ ưu tiên 24/7'
    ]
  },
  diamond: {
    name: 'diamond',
    displayName: 'Kim Cương',
    minReferrals: 50,        // From DB: requirements.min_referrals
    maxReferrals: 999,
    minRevenue: 100000000,   // From DB: requirements.min_revenue (100,000,000 VND)
    firstOrderCommission: 0.10,
    lifetimeCommission: 0.10,
    color: '#B9F2FF',
    benefits: [
      'VIP Partner',
      'Hoa hồng +10% bonus',
      'Custom voucher design',
      'Thưởng đặc biệt cuối quý'
    ]
  }
};

// Tier order for progression
export const TIER_ORDER = ['bronze', 'silver', 'gold', 'diamond'] as const;

// Tier icons/badges (can be used for ranking display)
export const TIER_ICONS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎'
};

// Tier gradients for visual display
export const TIER_GRADIENTS: Record<string, string> = {
  bronze: 'from-amber-600 to-amber-800',
  silver: 'from-gray-300 to-gray-500',
  gold: 'from-yellow-400 to-yellow-600',
  diamond: 'from-cyan-300 to-blue-500'
};

// Tier logo images from Supabase Storage
const STORAGE_BASE = 'https://kcirpjxbjqagrqrjfldu.supabase.co/storage/v1/object/public/avatar_affiliate';
export const TIER_LOGOS: Record<string, string> = {
  bronze: `${STORAGE_BASE}/Bronze.png`,
  silver: `${STORAGE_BASE}/Silver.PNG`,
  gold: `${STORAGE_BASE}/Gold.PNG`,
  diamond: `${STORAGE_BASE}/Diamond.PNG`
};

// Tier progress bar colors (for circular and horizontal bars)
export const TIER_PROGRESS_COLORS: Record<string, { primary: string; secondary: string }> = {
  bronze: { primary: '#CD7F32', secondary: '#8B4513' },
  silver: { primary: '#C0C0C0', secondary: '#808080' },
  gold: { primary: '#FFD700', secondary: '#FFA500' },
  diamond: { primary: '#00CED1', secondary: '#9400D3' }
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
