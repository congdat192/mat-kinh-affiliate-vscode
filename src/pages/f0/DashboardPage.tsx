import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  DollarSign,
  Wallet,
  Link as LinkIcon,
  UserPlus,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TIER_CONFIGS } from '@/lib/constants';

// Mock data for demonstration
const mockUserData = {
  name: 'Nguyễn Văn A',
  currentTier: 'gold',
  totalReferrals: 18,
  activeCustomers: 15,
  totalCommission: 12500000, // 12,500,000 VND
  availableBalance: 8300000, // 8,300,000 VND
};

const mockRecentActivity = [
  {
    id: 1,
    customerName: 'Trần Thị B',
    date: '2025-11-15',
    status: 'completed',
    commission: 450000,
  },
  {
    id: 2,
    customerName: 'Lê Văn C',
    date: '2025-11-14',
    status: 'active',
    commission: 380000,
  },
  {
    id: 3,
    customerName: 'Phạm Thị D',
    date: '2025-11-13',
    status: 'pending',
    commission: 520000,
  },
  {
    id: 4,
    customerName: 'Hoàng Văn E',
    date: '2025-11-12',
    status: 'completed',
    commission: 410000,
  },
  {
    id: 5,
    customerName: 'Vũ Thị F',
    date: '2025-11-11',
    status: 'active',
    commission: 390000,
  },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [userData] = useState(mockUserData);

  const currentTierConfig = TIER_CONFIGS[userData.currentTier];
  const nextTier = getNextTier(userData.currentTier);
  const nextTierConfig = nextTier ? TIER_CONFIGS[nextTier] : null;

  // Calculate progress to next tier
  const progressPercentage = nextTierConfig
    ? ((userData.totalReferrals - currentTierConfig.minReferrals) /
        (nextTierConfig.minReferrals - currentTierConfig.minReferrals)) *
      100
    : 100;

  const referralsToNextTier = nextTierConfig
    ? nextTierConfig.minReferrals - userData.totalReferrals
    : 0;

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
      case 'completed':
        return 'success';
      case 'active':
        return 'info';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'active':
        return 'Đang hoạt động';
      case 'pending':
        return 'Chờ xử lý';
      default:
        return status;
    }
  };

  // Statistics cards data
  const statsCards = [
    {
      title: 'Tổng giới thiệu',
      value: userData.totalReferrals,
      trend: '+12%',
      trendUp: true,
      icon: Users,
      description: 'So với tháng trước',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Khách hàng hoạt động',
      value: userData.activeCustomers,
      trend: '+8%',
      trendUp: true,
      icon: TrendingUp,
      description: 'Tăng trưởng',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Tổng hoa hồng',
      value: formatCurrency(userData.totalCommission),
      trend: '+23%',
      trendUp: true,
      icon: DollarSign,
      description: 'Tích lũy',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Số dư khả dụng',
      value: formatCurrency(userData.availableBalance),
      trend: '-5%',
      trendUp: false,
      icon: Wallet,
      description: 'Có thể rút',
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
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Xin chào, {userData.name}!
              </h1>
              <p className="text-primary-100 text-sm md:text-base">
                Chào mừng bạn quay trở lại với hệ thống Affiliate
              </p>
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
              <p className="text-2xl font-bold">{userData.totalReferrals}</p>
            </div>
            <div>
              <p className="text-primary-100 text-xs">Hoạt động</p>
              <p className="text-2xl font-bold">{userData.activeCustomers}</p>
            </div>
            <div className="col-span-2 md:col-span-2">
              <p className="text-primary-100 text-xs">Số dư khả dụng</p>
              <p className="text-xl md:text-2xl font-bold">
                {formatCurrency(userData.availableBalance)}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trendUp ? ArrowUpRight : ArrowDownRight;
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
                  <div className="flex items-center mt-2 text-xs">
                    <TrendIcon
                      className={`w-3 h-3 mr-1 ${
                        stat.trendUp ? 'text-green-600' : 'text-red-600'
                      }`}
                    />
                    <span
                      className={
                        stat.trendUp ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {stat.trend}
                    </span>
                    <span className="text-gray-500 ml-1">{stat.description}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tier Progress Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-500" />
              Tiến độ thăng hạng
            </CardTitle>
            <CardDescription>
              Theo dõi tiến trình của bạn để lên hạng tiếp theo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Tier Info */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    style={{
                      backgroundColor: currentTierConfig.color,
                      color: currentTierConfig.name === 'silver' ? '#000' : '#fff',
                    }}
                  >
                    {currentTierConfig.displayName}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    ({userData.totalReferrals} giới thiệu)
                  </span>
                </div>
                <ul className="space-y-1 text-sm text-gray-600">
                  {currentTierConfig.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Progress Bar */}
            {nextTierConfig && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Tiến độ đến hạng {nextTierConfig.displayName}
                  </span>
                  <span className="font-semibold text-primary-600">
                    {userData.totalReferrals} / {nextTierConfig.minReferrals}
                  </span>
                </div>
                <Progress
                  value={userData.totalReferrals - currentTierConfig.minReferrals}
                  max={nextTierConfig.minReferrals - currentTierConfig.minReferrals}
                  className="h-3"
                />
                <p className="text-xs text-gray-500">
                  Còn {referralsToNextTier} giới thiệu nữa để đạt hạng{' '}
                  {nextTierConfig.displayName}
                </p>
              </div>
            )}

            {/* Next Tier Preview */}
            {nextTierConfig && (
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    style={{
                      backgroundColor: nextTierConfig.color,
                      color: nextTierConfig.name === 'silver' ? '#000' : '#fff',
                    }}
                  >
                    {nextTierConfig.displayName}
                  </Badge>
                  <span className="text-sm text-gray-600 font-semibold">
                    Hạng tiếp theo
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  Quyền lợi khi đạt hạng {nextTierConfig.displayName}:
                </p>
                <ul className="space-y-1 text-xs text-gray-600">
                  {nextTierConfig.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary-500 mt-0.5">→</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Section */}
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <CardDescription>5 giới thiệu gần nhất của bạn</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Hoa hồng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRecentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">
                        {activity.customerName}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(activity.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(activity.status)}>
                          {getStatusLabel(activity.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary-600">
                        {formatCurrency(activity.commission)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => navigate('/f0/referrals')}
              >
                Xem tất cả giới thiệu
              </Button>
            </div>
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
                onClick={() => navigate('/f0/referral-links')}
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
                onClick={() => navigate('/f0/referrals/new')}
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
                onClick={() => navigate('/f0/withdrawals')}
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

// Helper function to get next tier
function getNextTier(currentTier: string): string | null {
  const tierOrder = ['silver', 'gold', 'diamond'];
  const currentIndex = tierOrder.indexOf(currentTier);
  if (currentIndex < tierOrder.length - 1) {
    return tierOrder[currentIndex + 1];
  }
  return null;
}

export default DashboardPage;
