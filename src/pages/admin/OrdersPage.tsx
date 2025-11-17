import { useState } from 'react';
import {
  ShoppingCart,
  DollarSign,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Mock data - 100+ orders
const generateMockOrders = () => {
  const customers = [
    'Nguyễn Văn An',
    'Trần Thị Bình',
    'Lê Văn Cường',
    'Phạm Thị Dung',
    'Hoàng Văn Em',
    'Phan Thị Hoa',
    'Vũ Văn Hùng',
    'Võ Thị Lan',
    'Đặng Văn Nam',
    'Bùi Thị Phương',
    'Ngô Văn Quân',
    'Đỗ Thị Tâm',
    'Lý Văn Thành',
    'Trương Thị Uyên',
    'Đinh Văn Vinh',
  ];

  const f0Partners = [
    'Nguyễn Văn A',
    'Trần Thị B',
    'Lê Văn C',
    'Phạm Thị D',
    'Hoàng Văn E',
    'Phan Thị F',
    'Vũ Văn G',
    'Võ Thị H',
  ];

  const products = [
    { name: 'Gọng kính Titan T101', price: 1200000 },
    { name: 'Gọng kính Nhựa N202', price: 800000 },
    { name: 'Kính cận K303', price: 1500000 },
    { name: 'Kính râm R404', price: 2000000 },
    { name: 'Tròng kính Essilor E505', price: 3000000 },
    { name: 'Gọng kính Kim loại M606', price: 1800000 },
    { name: 'Kính đa tròng D707', price: 4000000 },
    { name: 'Kính chống ánh sáng xanh B808', price: 2500000 },
  ];

  const statuses = ['pending', 'processing', 'completed', 'cancelled'];

  const orders = [];
  for (let i = 1; i <= 120; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const f0Partner = f0Partners[Math.floor(Math.random() * f0Partners.length)];

    // Generate 1-3 products per order
    const numProducts = Math.floor(Math.random() * 3) + 1;
    const orderProducts = [];
    let totalAmount = 0;

    for (let j = 0; j < numProducts; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 2) + 1;
      orderProducts.push({
        name: product.name,
        quantity,
        price: product.price,
      });
      totalAmount += product.price * quantity;
    }

    const commission = totalAmount * 0.1; // 10% commission
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    // Generate order date within last 3 months
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const randomTime = threeMonthsAgo.getTime() + Math.random() * (today.getTime() - threeMonthsAgo.getTime());
    const orderDate = new Date(randomTime);

    orders.push({
      id: `ORD${String(i).padStart(5, '0')}`,
      customer,
      f0Partner,
      products: orderProducts,
      amount: totalAmount,
      commission,
      status,
      orderDate: orderDate.toISOString(),
    });
  }

  return orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
};

const mockOrders = generateMockOrders();

const OrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterF0, setFilterF0] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate statistics
  const totalOrders = mockOrders.length;
  const totalRevenue = mockOrders.reduce((sum, order) => sum + order.amount, 0);
  const pendingOrders = mockOrders.filter((o) => o.status === 'pending').length;
  const completedOrders = mockOrders.filter((o) => o.status === 'completed').length;
  const processingOrders = mockOrders.filter((o) => o.status === 'processing').length;
  const cancelledOrders = mockOrders.filter((o) => o.status === 'cancelled').length;

  // Filter orders
  const filteredOrders = mockOrders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesF0 = filterF0 === 'all' || order.f0Partner === filterF0;

    let matchesDate = true;
    if (filterDateRange !== 'all') {
      const orderDate = new Date(order.orderDate);
      const now = new Date();
      if (filterDateRange === 'today') {
        matchesDate = orderDate.toDateString() === now.toDateString();
      } else if (filterDateRange === 'thisWeek') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = orderDate >= weekAgo;
      } else if (filterDateRange === 'thisMonth') {
        matchesDate = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      } else if (filterDateRange === 'last3Months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        matchesDate = orderDate >= threeMonthsAgo;
      }
    }

    return matchesSearch && matchesStatus && matchesF0 && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Get unique F0 partners
  const uniqueF0Partners = Array.from(new Set(mockOrders.map((o) => o.f0Partner))).sort();

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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'default';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Chờ xử lý';
      case 'processing':
        return 'Đang xử lý';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  // Handle export
  const handleExport = () => {
    console.log('Exporting orders data...');
    alert('Chức năng xuất dữ liệu đang được phát triển');
  };

  // Handle actions
  const handleViewDetails = (orderId: string) => {
    console.log('View order:', orderId);
    alert(`Xem chi tiết đơn hàng ${orderId}`);
  };

  const handleUpdateStatus = (orderId: string) => {
    console.log('Update status for order:', orderId);
    alert(`Cập nhật trạng thái đơn hàng ${orderId}`);
  };

  const handleCancelOrder = (orderId: string) => {
    console.log('Cancel order:', orderId);
    if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      alert(`Đã hủy đơn hàng ${orderId}`);
    }
  };

  // Statistics cards data
  const statsCards = [
    {
      title: 'Tổng Đơn Hàng',
      value: totalOrders,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtitle: `Đang xử lý: ${processingOrders}`,
    },
    {
      title: 'Tổng Doanh Thu',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      subtitle: 'Từ tất cả đơn hàng',
    },
    {
      title: 'Chờ Xử Lý',
      value: pendingOrders,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      subtitle: 'Cần xử lý ngay',
    },
    {
      title: 'Hoàn Thành',
      value: completedOrders,
      icon: CheckCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: `Đã hủy: ${cancelledOrders}`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Quản Lý Đơn Hàng
            </h1>
            <p className="text-gray-600 mt-1">
              Theo dõi và quản lý tất cả đơn hàng từ khách hàng
            </p>
          </div>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Xuất dữ liệu
          </Button>
        </div>

        {/* Statistics Cards */}
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
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Tìm kiếm mã ĐH, khách hàng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter by Status */}
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xử lý</option>
                <option value="processing">Đang xử lý</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </Select>

              {/* Filter by Date Range */}
              <Select value={filterDateRange} onChange={(e) => setFilterDateRange(e.target.value)}>
                <option value="all">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="thisWeek">Tuần này</option>
                <option value="thisMonth">Tháng này</option>
                <option value="last3Months">3 tháng gần đây</option>
              </Select>

              {/* Filter by F0 Partner */}
              <Select value={filterF0} onChange={(e) => setFilterF0(e.target.value)}>
                <option value="all">Tất cả F0</option>
                {uniqueF0Partners.map((partner) => (
                  <option key={partner} value={partner}>
                    {partner}
                  </option>
                ))}
              </Select>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || filterStatus !== 'all' || filterDateRange !== 'all' || filterF0 !== 'all') && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Đang lọc:</span>
                {searchTerm && (
                  <Badge variant="info" className="cursor-pointer" onClick={() => setSearchTerm('')}>
                    Tìm kiếm: "{searchTerm}" ×
                  </Badge>
                )}
                {filterStatus !== 'all' && (
                  <Badge variant="info" className="cursor-pointer" onClick={() => setFilterStatus('all')}>
                    Trạng thái: {getStatusLabel(filterStatus)} ×
                  </Badge>
                )}
                {filterDateRange !== 'all' && (
                  <Badge variant="info" className="cursor-pointer" onClick={() => setFilterDateRange('all')}>
                    Thời gian: {filterDateRange} ×
                  </Badge>
                )}
                {filterF0 !== 'all' && (
                  <Badge variant="info" className="cursor-pointer" onClick={() => setFilterF0('all')}>
                    F0: {filterF0} ×
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Danh sách đơn hàng ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã ĐH</TableHead>
                    <TableHead>Khách Hàng</TableHead>
                    <TableHead>Đối Tác F0</TableHead>
                    <TableHead>Sản Phẩm</TableHead>
                    <TableHead>Tổng Tiền</TableHead>
                    <TableHead>Hoa Hồng</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead>Ngày Đặt</TableHead>
                    <TableHead className="text-right">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentOrders.length > 0 ? (
                    currentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell className="font-semibold">{order.customer}</TableCell>
                        <TableCell>
                          <Badge variant="default">{order.f0Partner}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {order.products.map((product, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="text-gray-900">{product.name}</span>
                                <span className="text-gray-500"> (x{product.quantity})</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          {formatCurrency(order.amount)}
                        </TableCell>
                        <TableCell className="font-semibold text-primary-600">
                          {formatCurrency(order.commission)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {formatDateTime(order.orderDate)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewDetails(order.id)}
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateStatus(order.id)}
                              title="Cập nhật trạng thái"
                              disabled={order.status === 'completed' || order.status === 'cancelled'}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelOrder(order.id)}
                              title="Hủy đơn"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={order.status === 'completed' || order.status === 'cancelled'}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        Không tìm thấy đơn hàng nào
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredOrders.length)} trong tổng số {filteredOrders.length} đơn hàng
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={page}
                            variant={page === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="min-w-[36px]"
                          >
                            {page}
                          </Button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrdersPage;
