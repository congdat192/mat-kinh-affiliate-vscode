import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Percent,
  Calendar,
  Download,
  FileText,
  Printer,
  BarChart3,
  PieChart,
  LineChart,
  Award,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
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
  const isPositive = change >= 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
            <div className="flex items-center mt-2 gap-1">
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{change}%
              </span>
              {changeLabel && <span className="text-sm text-gray-500">{changeLabel}</span>}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${iconBgColor}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('this-month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Mock data for key metrics
  const keyMetrics = [
    {
      title: 'Tổng doanh thu',
      value: '₫542,850,000',
      change: 24.5,
      changeLabel: 'so với kỳ trước',
      icon: <DollarSign className="w-6 h-6 text-green-600" />,
      iconBgColor: 'bg-green-100',
    },
    {
      title: 'Tổng đơn hàng',
      value: '15,638',
      change: 12.8,
      changeLabel: 'so với kỳ trước',
      icon: <ShoppingCart className="w-6 h-6 text-blue-600" />,
      iconBgColor: 'bg-blue-100',
    },
    {
      title: 'Hoa hồng đã trả',
      value: '₫87,420,000',
      change: 18.3,
      changeLabel: 'so với kỳ trước',
      icon: <DollarSign className="w-6 h-6 text-purple-600" />,
      iconBgColor: 'bg-purple-100',
    },
    {
      title: 'Đối tác mới (F0)',
      value: '1,284',
      change: 32.1,
      changeLabel: 'so với kỳ trước',
      icon: <Users className="w-6 h-6 text-orange-600" />,
      iconBgColor: 'bg-orange-100',
    },
    {
      title: 'Khách hàng mới (F1)',
      value: '8,742',
      change: 15.7,
      changeLabel: 'so với kỳ trước',
      icon: <Users className="w-6 h-6 text-pink-600" />,
      iconBgColor: 'bg-pink-100',
    },
    {
      title: 'Tỷ lệ chuyển đổi',
      value: '4.8%',
      change: 8.2,
      changeLabel: 'so với kỳ trước',
      icon: <Percent className="w-6 h-6 text-cyan-600" />,
      iconBgColor: 'bg-cyan-100',
    },
  ];

  // Mock data for revenue trend (12 months)
  const revenueData = [
    { month: 'T1', revenue: 35000000 },
    { month: 'T2', revenue: 42000000 },
    { month: 'T3', revenue: 38000000 },
    { month: 'T4', revenue: 45000000 },
    { month: 'T5', revenue: 52000000 },
    { month: 'T6', revenue: 48000000 },
    { month: 'T7', revenue: 55000000 },
    { month: 'T8', revenue: 58000000 },
    { month: 'T9', revenue: 51000000 },
    { month: 'T10', revenue: 62000000 },
    { month: 'T11', revenue: 68000000 },
    { month: 'T12', revenue: 72000000 },
  ];

  // Mock data for orders by status
  const ordersByStatus = [
    { status: 'Hoàn thành', count: 12450, color: 'bg-green-500' },
    { status: 'Đang xử lý', count: 1845, color: 'bg-blue-500' },
    { status: 'Chờ xác nhận', count: 892, color: 'bg-yellow-500' },
    { status: 'Đã hủy', count: 451, color: 'bg-red-500' },
  ];

  // Mock data for commission by tier
  const commissionByTier = [
    { tier: 'Diamond', commission: 35420000, color: 'bg-cyan-500' },
    { tier: 'Platinum', commission: 28650000, color: 'bg-gray-400' },
    { tier: 'Gold', commission: 18240000, color: 'bg-yellow-500' },
    { tier: 'Silver', commission: 5110000, color: 'bg-gray-300' },
  ];

  // Mock data for top 10 partners
  const topPartners = [
    { rank: 1, name: 'Nguyễn Thị Kim Anh', tier: 'Diamond', referrals: 342, orders: 1245, commission: '₫8,450,000', growth: 28.5 },
    { rank: 2, name: 'Trần Văn Minh', tier: 'Platinum', referrals: 285, orders: 982, commission: '₫6,230,000', growth: 22.3 },
    { rank: 3, name: 'Lê Thị Hương', tier: 'Diamond', referrals: 268, orders: 876, commission: '₫5,890,000', growth: 31.2 },
    { rank: 4, name: 'Phạm Văn Tùng', tier: 'Gold', referrals: 234, orders: 745, commission: '₫4,670,000', growth: 18.7 },
    { rank: 5, name: 'Hoàng Thị Lan', tier: 'Platinum', referrals: 198, orders: 654, commission: '₫3,840,000', growth: 25.4 },
    { rank: 6, name: 'Vũ Văn Đức', tier: 'Gold', referrals: 176, orders: 589, commission: '₫3,420,000', growth: 15.8 },
    { rank: 7, name: 'Đỗ Thị Mai', tier: 'Gold', referrals: 165, orders: 542, commission: '₫3,180,000', growth: 20.1 },
    { rank: 8, name: 'Bùi Văn Hải', tier: 'Silver', referrals: 142, orders: 478, commission: '₫2,850,000', growth: 12.6 },
    { rank: 9, name: 'Ngô Thị Thu', tier: 'Silver', referrals: 128, orders: 423, commission: '₫2,540,000', growth: 17.9 },
    { rank: 10, name: 'Đinh Văn Nam', tier: 'Silver', referrals: 115, orders: 392, commission: '₫2,290,000', growth: 14.3 },
  ];

  // Mock data for top products
  const topProducts = [
    { rank: 1, name: 'Gọng kính Titan Premium TN-2024', category: 'Gọng kính', orders: 1842, revenue: '₫142,450,000', commission: '₫18,520,000' },
    { rank: 2, name: 'Kính râm UV400 Polarized KR-Pro', category: 'Kính râm', orders: 1567, revenue: '₫125,360,000', commission: '₫16,297,000' },
    { rank: 3, name: 'Tròng kính chống ánh sáng xanh', category: 'Tròng kính', orders: 1423, revenue: '₫98,740,000', commission: '₫12,836,000' },
    { rank: 4, name: 'Gọng kính Acetate Fashion AC-888', category: 'Gọng kính', orders: 1298, revenue: '₫89,560,000', commission: '₫11,643,000' },
    { rank: 5, name: 'Kính râm thời trang nam KR-2024', category: 'Kính râm', orders: 1156, revenue: '₫78,920,000', commission: '₫10,260,000' },
    { rank: 6, name: 'Tròng kính đổi màu Transitions', category: 'Tròng kính', orders: 1089, revenue: '₫72,340,000', commission: '₫9,404,000' },
    { rank: 7, name: 'Gọng kính trẻ em KTE-Kids', category: 'Gọng kính', orders: 987, revenue: '₫65,780,000', commission: '₫8,551,000' },
    { rank: 8, name: 'Kính râm thể thao Sport-X', category: 'Kính râm', orders: 892, revenue: '₫58,450,000', commission: '₫7,599,000' },
    { rank: 9, name: 'Tròng kính cận Essilor', category: 'Tròng kính', orders: 845, revenue: '₫54,230,000', commission: '₫7,050,000' },
    { rank: 10, name: 'Gọng kính kim loại Metal-Flex', category: 'Gọng kính', orders: 768, revenue: '₫48,670,000', commission: '₫6,327,000' },
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

  const handleApplyDateRange = () => {
    console.log('Applying date range:', { dateRange, fromDate, toDate });
  };

  const handleExportPDF = () => {
    console.log('Exporting full report as PDF');
  };

  const handleExportExcel = () => {
    console.log('Exporting data as Excel');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Báo Cáo & Thống Kê</h1>
          <p className="text-gray-600 mt-2">Phân tích chi tiết hiệu suất hệ thống affiliate</p>
        </div>

        {/* Date Range Selector */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Khoảng thời gian
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={dateRange === 'today' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange('today')}
                  >
                    Hôm nay
                  </Button>
                  <Button
                    variant={dateRange === 'this-week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange('this-week')}
                  >
                    Tuần này
                  </Button>
                  <Button
                    variant={dateRange === 'this-month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange('this-month')}
                  >
                    Tháng này
                  </Button>
                  <Button
                    variant={dateRange === 'last-month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange('last-month')}
                  >
                    Tháng trước
                  </Button>
                  <Button
                    variant={dateRange === 'last-3-months' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange('last-3-months')}
                  >
                    3 tháng trước
                  </Button>
                  <Button
                    variant={dateRange === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange('custom')}
                  >
                    Tùy chỉnh
                  </Button>
                </div>
              </div>

              {dateRange === 'custom' && (
                <div className="flex gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <Button onClick={handleApplyDateRange}>Áp dụng</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {keyMetrics.map((metric, index) => (
            <StatCard key={index} {...metric} />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-green-600" />
                  Biểu đồ xu hướng doanh thu
                </span>
                <Badge variant="success">12 tháng</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex flex-col justify-end bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-dashed border-green-200 p-4">
                <div className="flex items-end justify-between gap-2 h-full">
                  {revenueData.map((data, index) => {
                    const maxRevenue = Math.max(...revenueData.map((d) => d.revenue));
                    const height = (data.revenue / maxRevenue) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t hover:from-green-600 hover:to-green-500 transition-all cursor-pointer relative group"
                          style={{ height: `${height}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {(data.revenue / 1000000).toFixed(1)}M
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{data.month}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-600">Doanh thu theo tháng (triệu đồng)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders by Status (Pie Chart) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Đơn hàng theo trạng thái
                </span>
                <Badge variant="info">Tổng: {ordersByStatus.reduce((sum, item) => sum + item.count, 0).toLocaleString()}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-200">
                <div className="w-full max-w-md">
                  {ordersByStatus.map((item, index) => {
                    const total = ordersByStatus.reduce((sum, i) => sum + i.count, 0);
                    const percentage = ((item.count / total) * 100).toFixed(1);
                    return (
                      <div key={index} className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                            <span className="text-sm font-medium text-gray-700">{item.status}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">{item.count.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 ml-2">({percentage}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`${item.color} h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commission by Tier */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  Hoa hồng theo hạng
                </span>
                <Badge variant="warning">4 hạng</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex flex-col justify-end bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-purple-200 p-4">
                <div className="flex items-end justify-between gap-4 h-full">
                  {commissionByTier.map((data, index) => {
                    const maxCommission = Math.max(...commissionByTier.map((d) => d.commission));
                    const height = (data.commission / maxCommission) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className={`w-full ${data.color} rounded-t hover:opacity-80 transition-all cursor-pointer relative group`}
                          style={{ height: `${height}%` }}
                        >
                          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            ₫{(data.commission / 1000000).toFixed(1)}M
                          </div>
                        </div>
                        <span className="text-xs text-gray-700 font-medium text-center">{data.tier}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-600">Hoa hồng theo hạng đối tác (triệu đồng)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top 10 Partners by Commission */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-600" />
                  Top 10 đối tác theo hoa hồng
                </span>
                <Badge variant="danger">Top 10</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border-2 border-dashed border-orange-200 p-4 overflow-y-auto">
                <div className="space-y-3">
                  {topPartners.slice(0, 10).map((partner) => {
                    const maxCommission = parseInt(topPartners[0].commission.replace(/[₫,]/g, ''));
                    const currentCommission = parseInt(partner.commission.replace(/[₫,]/g, ''));
                    const width = (currentCommission / maxCommission) * 100;

                    return (
                      <div key={partner.rank} className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 w-6">#{partner.rank}</span>
                            <span className="text-sm font-medium text-gray-700">{partner.name}</span>
                          </div>
                          <span className="text-sm font-bold text-orange-600">{partner.commission}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full transition-all"
                            style={{ width: `${width}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Tables */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Bảng hiệu suất chi tiết</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="partners">
              <TabsList className="mb-4">
                <TabsTrigger value="partners">Top Đối Tác Xuất Sắc</TabsTrigger>
                <TabsTrigger value="products">Top Sản Phẩm Bán Chạy</TabsTrigger>
              </TabsList>

              <TabsContent value="partners">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Xếp hạng</TableHead>
                        <TableHead>Tên đối tác</TableHead>
                        <TableHead>Hạng</TableHead>
                        <TableHead className="text-right">Giới thiệu (F1)</TableHead>
                        <TableHead className="text-right">Đơn hàng</TableHead>
                        <TableHead className="text-right">Hoa hồng</TableHead>
                        <TableHead className="text-right">Tăng trưởng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPartners.map((partner) => (
                        <TableRow key={partner.rank}>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              {partner.rank <= 3 ? (
                                <Award className={`w-5 h-5 ${
                                  partner.rank === 1 ? 'text-yellow-500' :
                                  partner.rank === 2 ? 'text-gray-400' :
                                  'text-orange-600'
                                }`} />
                              ) : (
                                <span className="font-bold text-gray-600">#{partner.rank}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">{partner.name}</TableCell>
                          <TableCell>
                            <Badge variant={getTierBadgeVariant(partner.tier)}>{partner.tier}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{partner.referrals.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">{partner.orders.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-primary-600">{partner.commission}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-600">+{partner.growth}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="products">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Xếp hạng</TableHead>
                        <TableHead>Tên sản phẩm</TableHead>
                        <TableHead>Danh mục</TableHead>
                        <TableHead className="text-right">Đơn hàng</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                        <TableHead className="text-right">Hoa hồng tạo ra</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((product) => (
                        <TableRow key={product.rank}>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              {product.rank <= 3 ? (
                                <Award className={`w-5 h-5 ${
                                  product.rank === 1 ? 'text-yellow-500' :
                                  product.rank === 2 ? 'text-gray-400' :
                                  'text-orange-600'
                                }`} />
                              ) : (
                                <span className="font-bold text-gray-600">#{product.rank}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="info">{product.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{product.orders.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-green-600">{product.revenue}</TableCell>
                          <TableCell className="text-right font-bold text-purple-600">{product.commission}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Xuất báo cáo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={handleExportPDF} className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Xuất báo cáo đầy đủ (PDF)
              </Button>
              <Button onClick={handleExportExcel} variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Xuất dữ liệu (Excel)
              </Button>
              <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                In báo cáo
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Báo cáo sẽ bao gồm tất cả dữ liệu thống kê, biểu đồ và bảng hiệu suất trong khoảng thời gian đã chọn.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;
