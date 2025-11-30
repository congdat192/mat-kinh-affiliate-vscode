import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  DollarSign,
  Wallet,
  Link as LinkIcon,
  UserPlus,
  CreditCard,
  Award,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TIER_CONFIGS, TIER_ORDER, TIER_LOGOS, TIER_PROGRESS_COLORS, TIER_ICONS, TIER_GRADIENTS } from '@/lib/constants';

// Types for dashboard data
interface DashboardStats {
  totalReferrals: number;
  activeCustomers: number;
  referralsThisQuarter: number;
  totalCommission: number;
  paidCommission: number;
  availableBalance: number;
  pendingWithdrawals: number;
  completedWithdrawals: number;
  totalF1Revenue: number; // Total revenue from F1 customers
}

interface TierInfo {
  current: string;
  currentName: string;
  next: string | null;
  nextName: string | null;
  referralsToNextTier: number;
  revenueToNextTier: number;
  currentMinReferrals: number;
  currentMinRevenue: number;
  nextMinReferrals: number;
  nextMinRevenue: number;
  tierList: Array<{
    code: string;
    name: string;
    level: number;
    minReferrals: number;
    minRevenue: number;
    benefits: Record<string, unknown>;
    display: Record<string, unknown>;
  }>;
}

interface RecentActivity {
  id: string;
  customerName: string;
  phone: string;
  voucherCode: string;
  status: string;
  date: string;
  campaignCode: string;
}

interface F0Info {
  id: string;
  fullName: string;
  f0Code: string;
  email: string;
  phone: string;
  isActive: boolean;
  isApproved: boolean;
  joinedAt: string;
}

interface DashboardData {
  f0Info: F0Info;
  stats: DashboardStats;
  tier: TierInfo;
  recentActivity: RecentActivity[];
  unreadNotifications: number;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get F0 user from storage
  const getF0User = () => {
    const stored = localStorage.getItem('f0_user') || sessionStorage.getItem('f0_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  };

  // Fetch dashboard data
  const fetchDashboardData = async (showRefreshing = false) => {
    const f0User = getF0User();
    if (!f0User?.id) {
      navigate('/f0/auth/login');
      return;
    }

    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-f0-dashboard-stats`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ f0_id: f0User.id }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Không thể tải dữ liệu dashboard');
        return;
      }

      setDashboardData(result.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Đã sử dụng':
        return 'success';
      case 'Đã kích hoạt':
        return 'info';
      case 'Chờ kích hoạt':
      default:
        return 'warning';
    }
  };

  // Get tier config from tier code
  const getTierConfig = (tierCode: string) => {
    return TIER_CONFIGS[tierCode] || TIER_CONFIGS['silver'];
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 mb-4">{error || 'Không thể tải dữ liệu'}</p>
            <Button onClick={() => fetchDashboardData()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { f0Info, stats, tier, recentActivity, unreadNotifications } = dashboardData;
  const currentTierConfig = getTierConfig(tier.current);
  const nextTierConfig = tier.next ? getTierConfig(tier.next) : null;

  // Get next tier requirements from API response (dynamic from database)
  // Fallback to constants only if API doesn't provide values
  const nextTierMinReferrals = tier.nextMinReferrals || nextTierConfig?.minReferrals || 0;
  const nextTierMinRevenue = tier.nextMinRevenue || nextTierConfig?.minRevenue || 0;

  // Calculate F1 referral progress (50% of total)
  // Progress = current / target (not relative to current tier)
  const f1Progress = nextTierMinReferrals > 0
    ? Math.min(100, (stats.referralsThisQuarter / nextTierMinReferrals) * 100)
    : 100;

  // Calculate F1 revenue progress (50% of total)
  const f1RevenueProgress = nextTierMinRevenue > 0
    ? Math.min(100, ((stats.totalF1Revenue || 0) / nextTierMinRevenue) * 100)
    : 100;

  // Overall progress = 50% F1 progress + 50% Revenue progress
  // Only show 100% if at max tier (no nextTierConfig)
  const progressPercentage = nextTierConfig
    ? (f1Progress * 0.5) + (f1RevenueProgress * 0.5)
    : 100;

  // Statistics cards data
  const statsCards = [
    {
      title: 'Tổng giới thiệu',
      value: stats.totalReferrals,
      subValue: `${stats.referralsThisQuarter} quý này`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Khách hàng hoạt động',
      value: stats.activeCustomers,
      subValue: 'Đã kích hoạt voucher',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Tổng hoa hồng',
      value: formatCurrency(stats.totalCommission),
      subValue: `Đã nhận: ${formatCurrency(stats.paidCommission)}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Số dư khả dụng',
      value: formatCurrency(stats.availableBalance),
      subValue: stats.pendingWithdrawals > 0
        ? `Đang rút: ${formatCurrency(stats.pendingWithdrawals)}`
        : 'Có thể rút',
      icon: Wallet,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 md:p-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">
                  Xin chào, {f0Info.fullName}!
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={() => fetchDashboardData(true)}
                  disabled={refreshing}
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-primary-100 text-sm md:text-base">
                Mã đối tác: <span className="font-semibold">{f0Info.f0Code}</span>
              </p>
              {unreadNotifications > 0 && (
                <p className="text-primary-100 text-sm mt-1">
                  Bạn có <span className="font-semibold text-yellow-300">{unreadNotifications}</span> thông báo chưa đọc
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 md:w-10 md:h-10" />
              <div>
                <p className="text-xs text-primary-100 uppercase tracking-wide">
                  Hạng hiện tại
                </p>
                <Badge
                  className="mt-1 text-sm md:text-base px-3 py-1"
                  style={{
                    backgroundColor: currentTierConfig.color,
                    color: currentTierConfig.name === 'silver' ? '#000' : '#fff',
                  }}
                >
                  {currentTierConfig.displayName}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-primary-400">
            <div>
              <p className="text-primary-100 text-xs">Giới thiệu</p>
              <p className="text-2xl font-bold">{stats.totalReferrals}</p>
            </div>
            <div>
              <p className="text-primary-100 text-xs">Hoạt động</p>
              <p className="text-2xl font-bold">{stats.activeCustomers}</p>
            </div>
            <div className="col-span-2 md:col-span-2">
              <p className="text-primary-100 text-xs">Số dư khả dụng</p>
              <p className="text-xl md:text-2xl font-bold">
                {formatCurrency(stats.availableBalance)}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{stat.subValue}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tier Progress Section - Light Theme with 2 EXP Bars */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-500" />
              Tiến độ lên hạng
            </CardTitle>
            <CardDescription>
              Hoàn thành yêu cầu để lên hạng tiếp theo
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* Left: Circular Progress with Tier Logo */}
              <div className="flex items-center gap-6">
                {/* Current Tier Logo */}
                <div className="flex flex-col items-center">
                  <img
                    src={TIER_LOGOS[tier.current.toLowerCase()] || TIER_LOGOS.bronze}
                    alt={currentTierConfig.displayName}
                    className="w-20 h-20 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-gray-700 font-semibold mt-2 text-sm">{currentTierConfig.displayName}</span>
                </div>

                {/* Circular Progress Ring */}
                <div className="relative">
                  <svg className="w-32 h-32 transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="10"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke={TIER_PROGRESS_COLORS[tier.next || tier.current]?.primary || '#10B981'}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${progressPercentage * 3.52} 352`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  {/* Percentage text in center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">{Math.round(progressPercentage)}%</span>
                    <span className="text-xs text-gray-500">Tổng tiến độ</span>
                  </div>
                </div>

                {/* Next Tier Logo (if not max tier) */}
                {nextTierConfig && (
                  <div className="flex flex-col items-center opacity-50">
                    <img
                      src={TIER_LOGOS[tier.next?.toLowerCase() || 'silver']}
                      alt={nextTierConfig.displayName}
                      className="w-20 h-20 object-contain grayscale"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="text-gray-500 font-medium mt-2 text-sm">{nextTierConfig.displayName}</span>
                  </div>
                )}
              </div>

              {/* Right: EXP Bars */}
              <div className="flex-1 w-full space-y-4">
                {/* EXP Bar 1: F1 Count */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Số lượng F1</span>
                    </div>
                    {nextTierConfig ? (
                      <span className="text-sm text-gray-600">
                        <span className="font-semibold text-blue-600">{stats.referralsThisQuarter}</span>
                        <span className="text-gray-400"> / </span>
                        <span>{nextTierMinReferrals}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-green-600 font-medium">Đã đạt tối đa</span>
                    )}
                  </div>
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min(f1Progress, 100)}%`,
                        background: 'linear-gradient(90deg, #3B82F6, #1D4ED8)'
                      }}
                    />
                  </div>
                </div>

                {/* EXP Bar 2: F1 Revenue */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-700">Doanh thu F1</span>
                    </div>
                    {nextTierConfig ? (
                      <span className="text-sm text-gray-600">
                        <span className="font-semibold text-green-600">{formatCurrency(stats.totalF1Revenue || 0)}</span>
                        <span className="text-gray-400"> / </span>
                        <span>{formatCurrency(nextTierMinRevenue)}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-green-600 font-medium">Đã đạt tối đa</span>
                    )}
                  </div>
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min(f1RevenueProgress, 100)}%`,
                        background: 'linear-gradient(90deg, #10B981, #059669)'
                      }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Tier Progression Timeline */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                {TIER_ORDER.map((tierKey, index) => {
                  const config = TIER_CONFIGS[tierKey];
                  const isCurrentTier = tier.current.toLowerCase() === tierKey;
                  const isPastTier = TIER_ORDER.indexOf(tier.current.toLowerCase() as typeof TIER_ORDER[number]) > index;
                  const tierIndex = TIER_ORDER.indexOf(tier.current.toLowerCase() as typeof TIER_ORDER[number]);

                  return (
                    <div key={tierKey} className="flex flex-col items-center flex-1 relative">
                      {/* Connector line */}
                      {index > 0 && (
                        <div
                          className={`absolute top-5 right-1/2 w-full h-0.5 -z-0 ${
                            index <= tierIndex ? 'bg-primary-500' : 'bg-gray-300'
                          }`}
                        />
                      )}
                      {/* Tier badge */}
                      <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center bg-white ${
                        isCurrentTier
                          ? 'ring-2 ring-primary-500 ring-offset-2'
                          : ''
                      }`}>
                        <img
                          src={TIER_LOGOS[tierKey]}
                          alt={config.displayName}
                          className={`w-10 h-10 object-contain ${
                            isPastTier || isCurrentTier ? 'opacity-100' : 'opacity-40 grayscale'
                          }`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `<span class="text-xl">${TIER_ICONS[tierKey]}</span>`;
                          }}
                        />
                      </div>
                      <span className={`text-xs mt-2 font-medium ${
                        isCurrentTier ? 'text-primary-600' : isPastTier ? 'text-gray-700' : 'text-gray-400'
                      }`}>
                        {config.displayName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {config.minReferrals}+ F1
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Tier Benefits */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={TIER_LOGOS[tier.current.toLowerCase()]}
                  alt={currentTierConfig.displayName}
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <CardTitle className="text-base">Quyền lợi hiện tại</CardTitle>
                  <CardDescription>Hạng {currentTierConfig.displayName}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {currentTierConfig.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Next Tier Benefits */}
          {nextTierConfig ? (
            <Card className={`bg-gradient-to-br ${TIER_GRADIENTS[tier.next || 'silver']} text-white border-0`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={TIER_LOGOS[tier.next?.toLowerCase() || 'silver']}
                    alt={nextTierConfig.displayName}
                    className="w-10 h-10 object-contain"
                  />
                  <div>
                    <CardTitle className="text-base text-white">Hạng tiếp theo</CardTitle>
                    <CardDescription className="text-white/80">
                      Còn {tier.referralsToNextTier} GT để đạt
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {nextTierConfig.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-white/80 mt-0.5 flex-shrink-0">→</span>
                      <span className="text-white/90">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gradient-to-br from-amber-400 to-orange-500 text-white border-0">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <span className="text-5xl mb-3">👑</span>
                <h4 className="font-bold text-lg">Hạng Cao Nhất!</h4>
                <p className="text-white/80 text-sm mt-2 text-center">
                  Bạn đang tận hưởng tất cả quyền lợi tốt nhất
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity Section */}
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <CardDescription>5 giới thiệu gần nhất của bạn</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Chưa có hoạt động giới thiệu nào</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate('/f0/refer-customer')}
                >
                  Giới thiệu khách hàng đầu tiên
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Mã voucher</TableHead>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentActivity.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{activity.customerName}</p>
                              <p className="text-xs text-gray-500">{activity.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {activity.voucherCode}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {formatDate(activity.date)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(activity.status)}>
                              {activity.status || 'Chờ kích hoạt'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/f0/referral-history')}
                  >
                    Xem tất cả giới thiệu
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
            <CardDescription>
              Các tính năng thường dùng để quản lý affiliate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                className="h-auto py-4 flex-col items-start gap-2"
                variant="outline"
                onClick={() => navigate('/f0/create-link')}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="bg-primary-50 p-2 rounded-lg">
                    <LinkIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <span className="font-semibold">Tạo link giới thiệu</span>
                </div>
                <p className="text-xs text-gray-500 text-left">
                  Tạo link mới để chia sẻ với bạn bè
                </p>
              </Button>

              <Button
                className="h-auto py-4 flex-col items-start gap-2"
                variant="outline"
                onClick={() => navigate('/f0/refer-customer')}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="bg-green-50 p-2 rounded-lg">
                    <UserPlus className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-semibold">Giới thiệu khách hàng</span>
                </div>
                <p className="text-xs text-gray-500 text-left">
                  Thêm khách hàng mới vào hệ thống
                </p>
              </Button>

              <Button
                className="h-auto py-4 flex-col items-start gap-2"
                variant="outline"
                onClick={() => navigate('/f0/withdrawal')}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="bg-purple-50 p-2 rounded-lg">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-semibold">Yêu cầu rút tiền</span>
                </div>
                <p className="text-xs text-gray-500 text-left">
                  Rút hoa hồng về tài khoản ngân hàng
                </p>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
