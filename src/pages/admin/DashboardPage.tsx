import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  FileText,
  Gift,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconBgColor = 'bg-primary-100',
}) => {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
            {change !== undefined && (
              <div className="flex items-center mt-2 gap-1">
                {isPositive ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(change)}%
                </span>
                {changeLabel && <span className="text-sm text-gray-500">{changeLabel}</span>}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${iconBgColor}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface Activity {
  id: string;
  time: string;
  type: 'new_partner' | 'new_order' | 'commission_paid' | 'withdrawal_request' | 'voucher_created' | 'partner_verified';
  description: string;
  amount?: string;
  status: 'completed' | 'pending' | 'processing' | 'rejected';
}

const getActivityColor = (type: Activity['type']) => {
  const colors = {
    new_partner: 'bg-blue-50 text-blue-700 border-blue-200',
    new_order: 'bg-green-50 text-green-700 border-green-200',
    commission_paid: 'bg-purple-50 text-purple-700 border-purple-200',
    withdrawal_request: 'bg-orange-50 text-orange-700 border-orange-200',
    voucher_created: 'bg-pink-50 text-pink-700 border-pink-200',
    partner_verified: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };
  return colors[type];
};

const getActivityLabel = (type: Activity['type']) => {
  const labels = {
    new_partner: 'Đối tác mới',
    new_order: 'Đơn hàng',
    commission_paid: 'Trả hoa hồng',
    withdrawal_request: 'Rút tiền',
    voucher_created: 'Tạo voucher',
    partner_verified: 'Xác minh',
  };
  return labels[type];
};

const getStatusBadge = (status: Activity['status']) => {
  const variants: Record<Activity['status'], { variant: 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
    completed: { variant: 'success', label: 'Hoàn thành' },
    pending: { variant: 'warning', label: 'Chờ xử lý' },
    processing: { variant: 'info', label: 'Đang xử lý' },
    rejected: { variant: 'danger', label: 'Từ chối' },
  };
  return variants[status];
};

const DashboardPage: React.FC = () => {
  // Mock data for overview statistics
  const stats = [
    {
      title: 'Tổng đối tác (F0)',
      value: '1,284',
      change: 12.5,
      changeLabel: 'so với tháng trước',
      icon: <Users className="w-6 h-6 text-primary-600" />,
      iconBgColor: 'bg-primary-100',
    },
    {
      title: 'Tổng khách hàng (F1)',
      value: '8,742',
      change: 18.2,
      changeLabel: 'so với tháng trước',
      icon: <Users className="w-6 h-6 text-blue-600" />,
      iconBgColor: 'bg-blue-100',
    },
    {
      title: 'Tổng đơn hàng',
      value: '15,638',
      change: -3.4,
      changeLabel: '₫542,8M doanh thu',
      icon: <ShoppingCart className="w-6 h-6 text-green-600" />,
      iconBgColor: 'bg-green-100',
    },
    {
      title: 'Hoa hồng đã trả',
      value: '₫87,4M',
      icon: <DollarSign className="w-6 h-6 text-purple-600" />,
      iconBgColor: 'bg-purple-100',
    },
    {
      title: 'Yêu cầu rút tiền',
      value: '23 yêu cầu',
      changeLabel: '₫12,5M chờ xử lý',
      icon: <FileText className="w-6 h-6 text-orange-600" />,
      iconBgColor: 'bg-orange-100',
    },
    {
      title: 'Voucher hoạt động',
      value: '47',
      icon: <Gift className="w-6 h-6 text-pink-600" />,
      iconBgColor: 'bg-pink-100',
    },
  ];

  // Mock data for recent activities
  const recentActivities: Activity[] = [
    {
      id: '1',
      time: '5 phút trước',
      type: 'withdrawal_request',
      description: 'Nguyễn Văn A yêu cầu rút tiền',
      amount: '₫2,500,000',
      status: 'pending',
    },
    {
      id: '2',
      time: '12 phút trước',
      type: 'new_order',
      description: 'Đơn hàng #DH1234 từ Trần Thị B',
      amount: '₫1,850,000',
      status: 'completed',
    },
    {
      id: '3',
      time: '25 phút trước',
      type: 'commission_paid',
      description: 'Thanh toán hoa hồng cho Lê Văn C',
      amount: '₫450,000',
      status: 'completed',
    },
    {
      id: '4',
      time: '1 giờ trước',
      type: 'new_partner',
      description: 'Phạm Thị D đăng ký làm đối tác',
      status: 'processing',
    },
    {
      id: '5',
      time: '2 giờ trước',
      type: 'voucher_created',
      description: 'Tạo voucher giảm giá 15% cho Black Friday',
      status: 'completed',
    },
    {
      id: '6',
      time: '3 giờ trước',
      type: 'partner_verified',
      description: 'Xác minh tài khoản Hoàng Văn E',
      status: 'completed',
    },
    {
      id: '7',
      time: '4 giờ trước',
      type: 'new_order',
      description: 'Đơn hàng #DH1235 từ Vũ Thị F',
      amount: '₫3,200,000',
      status: 'completed',
    },
    {
      id: '8',
      time: '5 giờ trước',
      type: 'withdrawal_request',
      description: 'Đỗ Văn G yêu cầu rút tiền',
      amount: '₫1,800,000',
      status: 'rejected',
    },
    {
      id: '9',
      time: '6 giờ trước',
      type: 'commission_paid',
      description: 'Thanh toán hoa hồng cho Bùi Thị H',
      amount: '₫680,000',
      status: 'completed',
    },
    {
      id: '10',
      time: '8 giờ trước',
      type: 'new_partner',
      description: 'Đinh Văn I đăng ký làm đối tác',
      status: 'completed',
    },
  ];

  // Mock data for top performing partners
  const topPartners = [
    { name: 'Nguyễn Thị Kim Anh', tier: 'Diamond', commission: '₫8,450,000', orders: 145 },
    { name: 'Trần Văn Minh', tier: 'Platinum', commission: '₫6,230,000', orders: 112 },
    { name: 'Lê Thị Hương', tier: 'Gold', commission: '₫4,890,000', orders: 98 },
    { name: 'Phạm Văn Tùng', tier: 'Gold', commission: '₫3,670,000', orders: 76 },
    { name: 'Hoàng Thị Lan', tier: 'Silver', commission: '₫2,540,000', orders: 54 },
  ];

  // Mock data for recent orders
  const recentOrders = [
    { id: 'DH1240', customer: 'Nguyễn Văn A', amount: '₫2,450,000', status: 'completed', partner: 'Kim Anh' },
    { id: 'DH1239', customer: 'Trần Thị B', amount: '₫1,890,000', status: 'processing', partner: 'Văn Minh' },
    { id: 'DH1238', customer: 'Lê Văn C', amount: '₫3,120,000', status: 'completed', partner: 'Thị Hương' },
    { id: 'DH1237', customer: 'Phạm Thị D', amount: '₫980,000', status: 'pending', partner: 'Văn Tùng' },
    { id: 'DH1236', customer: 'Hoàng Văn E', amount: '₫1,650,000', status: 'completed', partner: 'Thị Lan' },
  ];

  // Mock data for pending actions
  const pendingActions = [
    { type: 'Yêu cầu rút tiền', count: 23, amount: '₫12,500,000' },
    { type: 'Xác minh đối tác', count: 8, amount: '-' },
    { type: 'Đơn hàng chờ xác nhận', count: 15, amount: '₫18,700,000' },
  ];

  const getTierBadgeVariant = (tier: string): 'default' | 'success' | 'warning' | 'info' => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
      Diamond: 'info',
      Platinum: 'default',
      Gold: 'warning',
      Silver: 'success',
    };
    return variants[tier] || 'default';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bảng điều khiển</h1>
          <p className="text-gray-600 mt-2">Tổng quan hoạt động hệ thống affiliate</p>
        </div>

        {/* Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Biểu đồ doanh thu</span>
                <Badge variant="info">12 tháng</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg border-2 border-dashed border-primary-200">
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 text-primary-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Biểu đồ đường doanh thu</p>
                  <p className="text-sm text-gray-500 mt-2">Theo dõi doanh thu 12 tháng qua</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Partners Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tăng trưởng đối tác</span>
                <Badge variant="success">Theo hạng</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-dashed border-green-200">
                <div className="text-center">
                  <Activity className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Biểu đồ cột theo hạng</p>
                  <p className="text-sm text-gray-500 mt-2">Phân bổ đối tác theo Diamond, Platinum, Gold, Silver</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Hoạt động gần đây</span>
              <Button variant="outline" size="sm">
                Xem tất cả
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((activity) => {
                  const statusInfo = getStatusBadge(activity.status);
                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {activity.time}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium border ${getActivityColor(activity.type)}`}
                        >
                          {getActivityLabel(activity.type)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{activity.description}</TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        {activity.amount || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Performing Partners */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                Top đối tác xuất sắc
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPartners.map((partner, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{index + 1}.</span>
                        <p className="font-medium text-gray-900">{partner.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getTierBadgeVariant(partner.tier)} className="text-xs">
                          {partner.tier}
                        </Badge>
                        <span className="text-xs text-gray-500">{partner.orders} đơn</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">{partner.commission}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                Đơn hàng gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">#{order.id}</span>
                      <Badge
                        variant={
                          order.status === 'completed'
                            ? 'success'
                            : order.status === 'processing'
                            ? 'info'
                            : 'warning'
                        }
                      >
                        {order.status === 'completed'
                          ? 'Hoàn thành'
                          : order.status === 'processing'
                          ? 'Xử lý'
                          : 'Chờ'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{order.customer}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Đối tác: {order.partner}</span>
                      <span className="font-bold text-gray-900">{order.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Cần xử lý
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingActions.map((action, index) => (
                  <div
                    key={index}
                    className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-gray-900">{action.type}</p>
                      <Badge variant="warning" className="ml-2">
                        {action.count}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-orange-700">{action.amount}</p>
                  </div>
                ))}
                <Button className="w-full bg-primary-500 hover:bg-primary-600 text-white">
                  Xem chi tiết
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
