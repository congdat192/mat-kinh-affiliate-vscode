import { Badge, LeaderboardEntry } from '@/types/gamification';

// Mock data for Achievement Badges
export const MOCK_BADGES: Badge[] = [
  {
    id: 'first-sale',
    name: 'First Referral',
    description: 'Successfully refer your first customer.',
    icon: '🎉',
    achieved: true,
  },
  {
    id: 'five-sales',
    name: 'Referral Machine',
    description: 'Successfully refer 5 customers.',
    icon: '🚀',
    achieved: true,
  },
  {
    id: 'ten-sales',
    name: 'Super Affiliate',
    description: 'Successfully refer 10 customers and reach Silver Tier.',
    icon: '🌟',
    achieved: false,
  },
  {
    id: 'top-earner',
    name: 'Top 10% Earner',
    description: 'Be among the top 10% of earners in a month.',
    icon: '💰',
    achieved: false,
  },
    {
    id: 'gold-tier',
    name: 'Gold Tier',
    description: 'Achieve Gold Tier status by referring 11 customers in a quarter.',
    icon: '🏆',
    achieved: false,
  },
];

// Mock data for Leaderboard
export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Nguyễn Văn A', referrals: 25, avatar: '🥇' },
  { rank: 2, name: 'Trần Thị B', referrals: 22, avatar: '🥈' },
  { rank: 3, name: 'Lê Văn C', referrals: 19, avatar: '🥉' },
  { rank: 4, name: 'Phạm Thị D', referrals: 15, avatar: '🧑' },
  { rank: 5, name: 'Hoàng Văn E', referrals: 12, avatar: '🧑‍🦰' },
  { rank: 6, name: 'Vũ Thị F', referrals: 10, avatar: '👩' },
];
