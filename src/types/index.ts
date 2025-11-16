// User & Authentication Types
export type UserRole = 'f0' | 'admin';

export type Tier = 'silver' | 'gold' | 'diamond';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export interface F0Profile extends User {
  role: 'f0';
  tier: Tier;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  isActive: boolean;
  canCreateReferral: boolean;
  totalCommission: number;
  availableBalance: number;
}

// Tier Configuration
export interface TierConfig {
  name: Tier;
  displayName: string;
  minReferrals: number;
  maxReferrals: number;
  firstOrderCommission: number; // 0.10 = 10%
  lifetimeCommission: number; // 0.05 = 5%, 0.08 = 8%
  color: string;
  benefits: string[];
}

// Referral & Voucher Types
export interface ReferralLink {
  id: string;
  f0Id: string;
  code: string;
  qrCodeUrl?: string;
  isActive: boolean;
  createdAt: string;
  totalClicks: number;
  totalConversions: number;
}

export interface Voucher {
  id: string;
  code: string;
  f0Id: string;
  f0Name: string;
  f1Phone: string;
  f1Name?: string;
  value: number; // 200000
  status: 'active' | 'used' | 'expired';
  referralLinkId?: string;
  usedAt?: string;
  expiredAt: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  phone: string;
  fullName?: string;
  f0Id: string; // người giới thiệu
  f0Name: string;
  referralLinkId?: string;
  firstPurchaseAmount?: number;
  firstPurchaseDate?: string;
  totalPurchases: number;
  lifetimeValue: number;
  createdAt: string;
}

// Commission Types
export type CommissionType = 'first_order' | 'lifetime';

export interface Commission {
  id: string;
  f0Id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  type: CommissionType;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'paid';
  createdAt: string;
}

// Withdrawal Types
export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'rejected';

export interface Withdrawal {
  id: string;
  f0Id: string;
  f0Name: string;
  amount: number;
  status: WithdrawalStatus;
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  processedBy?: string;
  processedByName?: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
}

// Application Types
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface F0Application {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  status: ApplicationStatus;
  reason?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  createdAt: string;
  reviewedAt?: string;
}

// Notification Types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

// Activity Log Types
export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Dashboard Stats
export interface F0DashboardStats {
  totalReferrals: number;
  totalCommission: number;
  availableBalance: number;
  pendingCommission: number;
  currentTier: Tier;
  quarterReferrals: number;
  tierProgress: number; // 0-100
}

export interface AdminDashboardStats {
  totalF0: number;
  activeF0: number;
  totalF1: number;
  totalVouchers: number;
  usedVouchers: number;
  pendingApplications: number;
  pendingWithdrawals: number;
  totalCommissionPaid: number;
}
