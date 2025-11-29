import { useState } from 'react';
import {
  Users,
  Calendar,
  Search,
  Download,
  Eye,
  DollarSign,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Mock data for referrals
const mockReferrals = [
  {
    id: 'REF001',
    customerName: 'Nguyễn Văn A',
    phone: '0901234567',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-01',
    firstOrderDate: '2025-11-03',
    status: 'completed',
    commission: 450000,
  },
  {
    id: 'REF002',
    customerName: 'Trần Thị B',
    phone: '0909876543',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-02',
    firstOrderDate: '2025-11-05',
    status: 'active',
    commission: 380000,
  },
  {
    id: 'REF003',
    customerName: 'Lê Văn C',
    phone: '0912345678',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-03',
    firstOrderDate: null,
    status: 'pending',
    commission: 0,
  },
  {
    id: 'REF004',
    customerName: 'Phạm Thị D',
    phone: '0923456789',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-04',
    firstOrderDate: '2025-11-06',
    status: 'completed',
    commission: 520000,
  },
  {
    id: 'REF005',
    customerName: 'Hoàng Văn E',
    phone: '0934567890',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-05',
    firstOrderDate: '2025-11-07',
    status: 'active',
    commission: 410000,
  },
  {
    id: 'REF006',
    customerName: 'Vũ Thị F',
    phone: '0945678901',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-06',
    firstOrderDate: null,
    status: 'cancelled',
    commission: 0,
  },
  {
    id: 'REF007',
    customerName: 'Đặng Văn G',
    phone: '0956789012',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-07',
    firstOrderDate: '2025-11-09',
    status: 'completed',
    commission: 390000,
  },
  {
    id: 'REF008',
    customerName: 'Bùi Thị H',
    phone: '0967890123',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-08',
    firstOrderDate: '2025-11-10',
    status: 'active',
    commission: 425000,
  },
  {
    id: 'REF009',
    customerName: 'Ngô Văn I',
    phone: '0978901234',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-09',
    firstOrderDate: null,
    status: 'pending',
    commission: 0,
  },
  {
    id: 'REF010',
    customerName: 'Dương Thị K',
    phone: '0989012345',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-10',
    firstOrderDate: '2025-11-12',
    status: 'completed',
    commission: 460000,
  },
  {
    id: 'REF011',
    customerName: 'Trương Văn L',
    phone: '0990123456',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-11',
    firstOrderDate: '2025-11-13',
    status: 'active',
    commission: 395000,
  },
  {
    id: 'REF012',
    customerName: 'Cao Thị M',
    phone: '0901234568',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-12',
    firstOrderDate: null,
    status: 'pending',
    commission: 0,
  },
  {
    id: 'REF013',
    customerName: 'Lý Văn N',
    phone: '0912345679',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-13',
    firstOrderDate: '2025-11-15',
    status: 'completed',
    commission: 480000,
  },
  {
    id: 'REF014',
    customerName: 'Mai Thị O',
    phone: '0923456780',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-14',
    firstOrderDate: '2025-11-16',
    status: 'active',
    commission: 435000,
  },
  {
    id: 'REF015',
    customerName: 'Phan Văn P',
    phone: '0934567891',
    referralLink: 'https://matkinh.com/ref/ABC123',
    registeredDate: '2025-11-15',
    firstOrderDate: null,
    status: 'pending',
    commission: 0,
  },
];

const ReferralHistoryPage = () => {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    status: 'all',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate summary stats
  const totalReferrals = mockReferrals.length;
  const successfulConversions = mockReferrals.filter(
    (ref) => ref.status === 'completed' || ref.status === 'active'
  ).length;
  const totalEarnings = mockReferrals.reduce((sum, ref) => sum + ref.commission, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '--';
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
      case 'cancelled':
        return 'danger';
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
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  // Filter referrals
  const filteredReferrals = mockReferrals.filter((ref) => {
    if (filters.status !== 'all' && ref.status !== filters.status) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        ref.customerName.toLowerCase().includes(search) ||
        ref.phone.includes(search) ||
        ref.id.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReferrals = filteredReferrals.slice(startIndex, endIndex);

  const handleApplyFilter = () => {
    setLoading(true);
    setCurrentPage(1);
    // Simulate API call
    setTimeout(() => setLoading(false), 500);
  };

  const handleExportExcel = () => {
    toast.info('Tính năng xuất Excel đang được phát triển');
  };

  const handleViewDetails = (id: string) => {
    toast.info(`Xem chi tiết giới thiệu ${id} - Tính năng đang phát triển`);
  };

  // Summary cards data
  const summaryCards = [
    {
      title: 'Tổng Giới Thiệu',
      value: totalReferrals,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Chuyển Đổi Thành Công',
      value: successfulConversions,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Tổng Thu Nhập',
      value: formatCurrency(totalEarnings),
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Lịch Sử Giới Thiệu
          </h1>
          <p className="text-gray-600 mt-1">
            Theo dõi và quản lý tất cả khách hàng được giới thiệu
          </p>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {summaryCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`${stat.bgColor} p-3 rounded-lg`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bộ Lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="fromDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Từ ngày
                </Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) =>
                    setFilters({ ...filters, fromDate: e.target.value })
                  }
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="toDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Đến ngày
                </Label>
                <Input
                  id="toDate"
                  type="date"
                  value={filters.toDate}
                  onChange={(e) =>
                    setFilters({ ...filters, toDate: e.target.value })
                  }
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status">Trạng thái</Label>
                <Select
                  id="status"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <option value="all">Tất cả</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search" className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Tìm kiếm
                </Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Tên, SĐT, ID..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button onClick={handleApplyFilter} disabled={loading}>
                {loading ? 'Đang tải...' : 'Áp dụng lọc'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({
                    fromDate: '',
                    toDate: '',
                    status: 'all',
                    search: '',
                  });
                  setCurrentPage(1);
                }}
              >
                Xóa bộ lọc
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Danh Sách Giới Thiệu</CardTitle>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#ID</TableHead>
                    <TableHead>Tên Khách Hàng</TableHead>
                    <TableHead>Số Điện Thoại</TableHead>
                    <TableHead>Link Giới Thiệu</TableHead>
                    <TableHead>Ngày Đăng Ký</TableHead>
                    <TableHead>Đơn Đầu Tiên</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead className="text-right">Hoa Hồng</TableHead>
                    <TableHead className="text-center">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentReferrals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        Không tìm thấy kết quả
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentReferrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell className="font-medium">{referral.id}</TableCell>
                        <TableCell>{referral.customerName}</TableCell>
                        <TableCell className="text-gray-600">
                          {referral.phone}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] truncate text-blue-600">
                            {referral.referralLink}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatDate(referral.registeredDate)}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatDate(referral.firstOrderDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(referral.status)}>
                            {getStatusLabel(referral.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary-600">
                          {referral.commission > 0
                            ? formatCurrency(referral.commission)
                            : '--'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(referral.id)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Chi tiết
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {filteredReferrals.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t">
                <div className="text-sm text-gray-600">
                  Hiển thị {startIndex + 1}-
                  {Math.min(endIndex, filteredReferrals.length)} trong tổng số{' '}
                  {filteredReferrals.length} kết quả
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-9"
                        >
                          {page}
                        </Button>
                      )
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Sau
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

export default ReferralHistoryPage;
