import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Search,
  Download,
  Eye,
  DollarSign,
  CheckCircle,
  Loader2,
  RefreshCw,
  Clock,
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

// Types
interface Referral {
  id: string;
  customerName: string;
  customerPhone: string;
  customerType: string;
  voucherCode: string;
  campaignCode: string;
  campaignId: string;
  status: string;
  createdAt: string;
  expiredAt: string | null;
  invoiceInfo: {
    invoiceId: string;
    invoiceCode: string;
    totalAmount: number;
    purchaseDate: string;
  } | null;
  reissueCount: number;
}

interface Summary {
  total: number;
  activated: number;
  used: number;
  pending: number;
  thisMonth: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ReferralHistoryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, activated: 0, used: 0, pending: 0, thisMonth: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    status: 'all',
    search: '',
  });

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

  // Fetch referral history
  const fetchReferralHistory = async (page = 1, showRefreshing = false) => {
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

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-f0-referral-history`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            f0_id: f0User.id,
            page,
            limit: 10,
            status: filters.status !== 'all' ? filters.status : undefined,
            search: filters.search || undefined,
            date_from: filters.fromDate || undefined,
            date_to: filters.toDate || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Không thể tải dữ liệu');
        return;
      }

      setReferrals(result.data.referrals);
      setSummary(result.data.summary);
      setPagination(result.data.pagination);
    } catch (err) {
      console.error('Referral history fetch error:', err);
      toast.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReferralHistory();
  }, []);

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
      case 'Đã sử dụng':
        return 'success';
      case 'Đã kích hoạt':
        return 'info';
      case 'Chờ kích hoạt':
      default:
        return 'warning';
    }
  };

  // Handle filter apply
  const handleApplyFilter = () => {
    fetchReferralHistory(1);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      status: 'all',
      search: '',
    });
    // Fetch with cleared filters
    setTimeout(() => fetchReferralHistory(1), 0);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchReferralHistory(page);
  };

  // Handle export (placeholder)
  const handleExportExcel = () => {
    toast.info('Tính năng xuất Excel đang được phát triển');
  };

  // Handle view details (placeholder)
  const handleViewDetails = (referral: Referral) => {
    toast.info(`Chi tiết voucher ${referral.voucherCode}`);
  };

  // Summary cards data
  const summaryCards = [
    {
      title: 'Tổng Giới Thiệu',
      value: summary.total,
      subValue: `${summary.thisMonth} tháng này`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Đã Kích Hoạt',
      value: summary.activated,
      subValue: 'Voucher đã kích hoạt',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Đã Sử Dụng',
      value: summary.used,
      subValue: 'Khách đã mua hàng',
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Chờ Kích Hoạt',
      value: summary.pending,
      subValue: 'Chưa sử dụng',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Lịch Sử Giới Thiệu
            </h1>
            <p className="text-gray-600 mt-1">
              Theo dõi và quản lý tất cả khách hàng được giới thiệu
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReferralHistory(pagination.page, true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{stat.subValue}</p>
                    </div>
                    <div className={`${stat.bgColor} p-2 md:p-3 rounded-lg`}>
                      <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
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
                  <option value="Chờ kích hoạt">Chờ kích hoạt</option>
                  <option value="Đã kích hoạt">Đã kích hoạt</option>
                  <option value="Đã sử dụng">Đã sử dụng</option>
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
                  placeholder="Tên, SĐT, mã voucher..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button onClick={handleApplyFilter} disabled={refreshing}>
                {refreshing ? 'Đang tải...' : 'Áp dụng lọc'}
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
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
            {referrals.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Chưa có giới thiệu nào</p>
                <p className="text-sm mt-1">Bắt đầu giới thiệu khách hàng để nhận hoa hồng</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate('/f0/refer-customer')}
                >
                  Giới thiệu khách hàng
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Khách Hàng</TableHead>
                        <TableHead>Mã Voucher</TableHead>
                        <TableHead>Chiến Dịch</TableHead>
                        <TableHead>Ngày Tạo</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                        <TableHead>Đơn Hàng</TableHead>
                        <TableHead className="text-center">Thao Tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((referral) => (
                        <TableRow key={referral.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{referral.customerName}</p>
                              <p className="text-xs text-gray-500">{referral.customerPhone}</p>
                              <Badge variant="default" className="text-xs mt-1">
                                {referral.customerType === 'new' ? 'Khách mới' : 'Khách cũ'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {referral.voucherCode}
                            {referral.reissueCount > 0 && (
                              <span className="text-xs text-orange-500 ml-1">
                                (Cấp lại: {referral.reissueCount})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {referral.campaignCode}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {formatDate(referral.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(referral.status)}>
                              {referral.status || 'Chờ kích hoạt'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {referral.invoiceInfo ? (
                              <div className="text-sm">
                                <p className="font-medium text-green-600">
                                  {formatCurrency(referral.invoiceInfo.totalAmount)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(referral.invoiceInfo.purchaseDate)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(referral)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Chi tiết
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t">
                    <div className="text-sm text-gray-600">
                      Hiển thị {((pagination.page - 1) * pagination.limit) + 1}-
                      {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số{' '}
                      {pagination.total} kết quả
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        Trước
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={pagination.page === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="w-9"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReferralHistoryPage;
