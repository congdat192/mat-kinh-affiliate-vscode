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
  X,
  AlertCircle,
  Gift,
  Receipt,
  TrendingUp,
  Wallet,
  Repeat,
  Link2,
  Lock,
  CreditCard,
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

// Types - Updated to match Edge Function response
interface CommissionBreakdown {
  basic: {
    amount: number;
    rate: string | null;
  };
  firstOrder: {
    amount: number;
    rate: string | null;
  } | null;
  tierBonus: {
    amount: number;
    rate: string | null;
    tierName: string | null;
  } | null;
}

interface CommissionInfo {
  totalCommission: number;
  status: string;
  breakdown: CommissionBreakdown;
  // v5: Lock/payment status fields
  qualifiedAt: string | null;
  lockDate: string | null;
  lockedAt: string | null;
  paidAt: string | null;
  daysUntilLock: number | null;
  invoiceCancelledAt: string | null;
}

interface InvoiceInfo {
  invoiceId: string;
  invoiceCode: string;
  invoiceAmount: number;
  invoiceStatus: string;
  invoiceDate: string;
}

interface ReissueInfo {
  code: string;
  invoiceId: string | null;
  invoiceCode: string | null;
  invoiceAmount: number;
  invoiceStatus: string | null;
  status: string | null;
}

interface Referral {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerType: string;
  voucherCode: string;
  campaignCode: string;
  campaignId: string;
  status: string;
  createdAt: string;
  activatedAt: string | null;
  expiredAt: string | null;
  voucherUsed: boolean;
  invoiceInfo: InvoiceInfo | null;
  // Commission fields
  commissionStatus: 'pending' | 'available' | 'invalid' | 'paid';
  invalidReasonCode: string | null;
  invalidReasonText: string | null;
  actualUserPhone: string | null;
  actualUserName: string | null;
  actualCustomerType: string | null;
  commissionCalculatedAt: string | null;
  commissionInfo: CommissionInfo | null;
  // Reissue info
  reissueCount: number;
  reissue1: ReissueInfo | null;
  reissue2: ReissueInfo | null;
  note: string | null;
}

interface Summary {
  total: number;
  activated: number;
  used: number;
  pending: number;
  thisMonth: number;
  f1Assigned?: number;
  commission?: {
    pending: number;
    available: number;
    invalid: number;
    paid: number;
  };
  lifetime?: {
    count: number;
    total: number;
  };
}

interface LifetimeCommission {
  id: string;
  type: 'lifetime';
  f1Phone: string;
  f1Name: string;
  f1CustomerId: string;
  invoiceCode: string;
  invoiceAmount: number;
  invoiceDate: string;
  invoiceStatus: string;
  voucherCode: string;
  totalCommission: number;
  status: string;
  breakdown: CommissionBreakdown;
  notes: string | null;
  createdAt: string;
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
  const [lifetimeCommissions, setLifetimeCommissions] = useState<LifetimeCommission[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, activated: 0, used: 0, pending: 0, thisMonth: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    status: 'all',
    search: '',
  });
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [selectedLifetimeCommission, setSelectedLifetimeCommission] = useState<LifetimeCommission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'referrals' | 'lifetime'>('referrals');

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
      setLifetimeCommissions(result.data.lifetimeCommissions || []);
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

  // Get commission status badge variant
  const getCommissionStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'danger' | 'default' => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'available':
        return 'info';
      case 'invalid':
        return 'danger';
      case 'pending':
      default:
        return 'warning';
    }
  };

  // Get commission status text
  const getCommissionStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'available':
        return 'Có thể rút';
      case 'invalid':
        return 'Không hợp lệ';
      case 'pending':
      default:
        return 'Chờ xử lý';
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

  // Handle view details
  const handleViewDetails = (referral: Referral) => {
    setSelectedReferral(referral);
    setShowDetailModal(true);
  };

  // Close detail modal
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedReferral(null);
    setSelectedLifetimeCommission(null);
  };

  // Handle view lifetime commission details
  const handleViewLifetimeDetails = (commission: LifetimeCommission) => {
    setSelectedLifetimeCommission(commission);
    setShowDetailModal(true);
  };

  // Calculate total revenue from used referrals - exclude cancelled invoices
  const totalRevenue = referrals.reduce((sum, ref) => {
    // Only count if invoice exists AND invoice is not cancelled AND commission is valid
    if (ref.invoiceInfo?.invoiceAmount &&
        ref.invoiceInfo.invoiceStatus !== 'Đã hủy' &&
        ref.commissionStatus !== 'invalid') {
      return sum + ref.invoiceInfo.invoiceAmount;
    }
    return sum;
  }, 0);

  // Summary cards data - Updated labels per user feedback
  const summaryCards = [
    {
      title: 'Voucher Đã Phát',
      value: summary.total,
      subValue: `${summary.thisMonth} tháng này`,
      icon: Gift,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Đã Sử Dụng',
      value: summary.used,
      subValue: 'Voucher đã dùng',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Tổng Doanh Số',
      value: formatCurrency(totalRevenue),
      subValue: 'Doanh số từ F1',
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      isFormatted: true, // Flag to indicate value is already formatted
    },
    {
      title: 'Hoa Hồng Trọn Đời',
      value: summary.lifetime?.count || 0,
      subValue: formatCurrency(summary.lifetime?.total || 0),
      icon: Repeat,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
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
              Theo dõi voucher đã phát và doanh số từ khách hàng F1
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
            const isFormatted = 'isFormatted' in stat && stat.isFormatted;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className={`font-bold text-gray-900 mt-1 ${isFormatted ? 'text-base md:text-lg truncate' : 'text-xl md:text-2xl'}`}>
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{stat.subValue}</p>
                    </div>
                    <div className={`${stat.bgColor} p-2 md:p-3 rounded-lg flex-shrink-0`}>
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

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('referrals')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'referrals'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Gift className="w-4 h-4 inline-block mr-2" />
            Voucher Đã Phát ({summary.total})
          </button>
          <button
            onClick={() => setActiveTab('lifetime')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'lifetime'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Repeat className="w-4 h-4 inline-block mr-2" />
            Hoa Hồng Trọn Đời ({summary.lifetime?.count || 0})
          </button>
        </div>

        {/* Referral Table */}
        {activeTab === 'referrals' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Danh Sách Voucher Đã Phát</CardTitle>
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
                <Gift className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Chưa có voucher nào được phát</p>
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
                        <TableHead>Ngày Tạo</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                        <TableHead>Đơn Hàng</TableHead>
                        <TableHead>Điều Kiện</TableHead>
                        <TableHead>Hoa Hồng</TableHead>
                        <TableHead>Trạng Thái Chốt</TableHead>
                        <TableHead>Thanh Toán</TableHead>
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
                                  {formatCurrency(referral.invoiceInfo.invoiceAmount)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(referral.invoiceInfo.invoiceDate)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )}
                          </TableCell>
                          {/* Điều Kiện Column */}
                          <TableCell>
                            {referral.commissionStatus === 'invalid' ? (
                              <div className="flex items-center gap-1">
                                <X className="w-4 h-4 text-red-500" />
                                <span className="text-xs text-red-600 max-w-[120px] truncate" title={referral.invalidReasonText || ''}>
                                  {referral.invalidReasonCode === 'CUSTOMER_NOT_NEW' ? 'KH cũ dùng' :
                                   referral.invalidReasonCode === 'INVOICE_CANCELLED' ? 'HĐ đã hủy' :
                                   referral.invalidReasonCode === 'INVOICE_NOT_COMPLETED' ? 'HĐ chưa xong' :
                                   'Không hợp lệ'}
                                </span>
                              </div>
                            ) : referral.commissionStatus === 'available' || referral.commissionStatus === 'paid' ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-green-600">Đủ điều kiện</span>
                              </div>
                            ) : referral.invoiceInfo ? (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-yellow-500" />
                                <span className="text-xs text-yellow-600">Chờ xử lý</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Chưa mua</span>
                            )}
                          </TableCell>
                          {/* Hoa Hồng column - v5: Chỉ hiển thị badge "Không hợp lệ" */}
                          <TableCell>
                            {referral.commissionInfo ? (
                              <div className="text-sm">
                                <p className="font-medium text-primary-600">
                                  {formatCurrency(referral.commissionInfo.totalCommission)}
                                </p>
                                {/* Chỉ hiển thị badge nếu là "Không hợp lệ" */}
                                {referral.commissionStatus === 'invalid' && (
                                  <Badge variant="danger">Không hợp lệ</Badge>
                                )}
                              </div>
                            ) : referral.commissionStatus === 'invalid' ? (
                              <Badge variant="danger">Không hợp lệ</Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">--</span>
                            )}
                          </TableCell>
                          {/* Trạng Thái Chốt column - v5 */}
                          <TableCell>
                            {referral.commissionInfo?.lockedAt ? (
                              <Badge variant="info" className="flex items-center gap-1 w-fit">
                                <Lock className="w-3 h-3" />
                                Đã chốt
                              </Badge>
                            ) : referral.commissionInfo?.lockDate ? (
                              <div className="text-sm">
                                <Badge variant="warning" className="flex items-center gap-1 w-fit">
                                  <Clock className="w-3 h-3" />
                                  Chờ chốt
                                </Badge>
                                {referral.commissionInfo.daysUntilLock !== null && referral.commissionInfo.daysUntilLock >= 0 && (
                                  <span className="text-xs text-gray-500 mt-1 block">
                                    Còn {referral.commissionInfo.daysUntilLock} ngày
                                  </span>
                                )}
                              </div>
                            ) : referral.invoiceInfo && referral.commissionStatus !== 'invalid' ? (
                              <span className="text-xs text-gray-400">Chưa đủ ĐK</span>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )}
                          </TableCell>
                          {/* Thanh Toán column - v5 */}
                          <TableCell>
                            {referral.commissionInfo?.paidAt ? (
                              <Badge variant="success" className="flex items-center gap-1 w-fit">
                                <CreditCard className="w-3 h-3" />
                                Đã TT
                              </Badge>
                            ) : referral.commissionInfo?.lockedAt ? (
                              <Badge variant="warning" className="flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3" />
                                Chưa TT
                              </Badge>
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
        )}

        {/* Lifetime Commission Table */}
        {activeTab === 'lifetime' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-green-600" />
                Hoa Hồng Trọn Đời
              </CardTitle>
              <div className="text-sm text-gray-500">
                Tổng: {formatCurrency(summary.lifetime?.total || 0)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {lifetimeCommissions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Repeat className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Chưa có hoa hồng trọn đời</p>
                <p className="text-sm mt-1">Khi khách hàng F1 mua hàng lại, bạn sẽ nhận được hoa hồng tự động</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Khách Hàng F1</TableHead>
                      <TableHead>Mã Hóa Đơn</TableHead>
                      <TableHead>Ngày Mua</TableHead>
                      <TableHead>Giá Trị ĐH</TableHead>
                      <TableHead>Hoa Hồng</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                      <TableHead className="text-center">Chi Tiết</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lifetimeCommissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{commission.f1Name || 'Khách hàng'}</p>
                            <p className="text-xs text-gray-500">{commission.f1Phone}</p>
                            <Badge variant="info" className="text-xs mt-1">
                              <Repeat className="w-3 h-3 mr-1" />
                              Mua lại
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {commission.invoiceCode}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatDate(commission.invoiceDate)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(commission.invoiceAmount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-600">
                            {formatCurrency(commission.totalCommission)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getCommissionStatusVariant(commission.status)}>
                            {getCommissionStatusText(commission.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewLifetimeDetails(commission)}
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
            )}
          </CardContent>
        </Card>
        )}
      </div>

      {/* Detail Modal - Referral */}
      {showDetailModal && selectedReferral && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Chi Tiết Giới Thiệu</h2>
              <Button variant="ghost" size="sm" onClick={handleCloseDetailModal}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-500" />
                  Thông Tin Khách Hàng
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Họ tên</p>
                    <p className="font-medium">{selectedReferral.customerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Số điện thoại</p>
                    <p className="font-medium">{selectedReferral.customerPhone}</p>
                  </div>
                  {selectedReferral.customerEmail && (
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium">{selectedReferral.customerEmail}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Loại khách</p>
                    <Badge variant={selectedReferral.customerType === 'new' ? 'success' : 'default'}>
                      {selectedReferral.customerType === 'new' ? 'Khách mới' : 'Khách cũ'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Voucher Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-blue-500" />
                  Thông Tin Voucher
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Mã voucher</p>
                    <p className="font-mono font-bold text-blue-600">{selectedReferral.voucherCode}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Chiến dịch</p>
                    <p className="font-medium">{selectedReferral.campaignCode}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ngày tạo</p>
                    <p className="font-medium">{formatDate(selectedReferral.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Trạng thái</p>
                    <Badge variant={getStatusVariant(selectedReferral.status)}>
                      {selectedReferral.status || 'Chờ kích hoạt'}
                    </Badge>
                  </div>
                  {selectedReferral.activatedAt && (
                    <div>
                      <p className="text-gray-500">Ngày kích hoạt</p>
                      <p className="font-medium">{formatDate(selectedReferral.activatedAt)}</p>
                    </div>
                  )}
                  {selectedReferral.expiredAt && (
                    <div>
                      <p className="text-gray-500">Hạn sử dụng</p>
                      <p className="font-medium">{formatDate(selectedReferral.expiredAt)}</p>
                    </div>
                  )}
                </div>

                {/* Reissue Info */}
                {selectedReferral.reissueCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-100">
                    <p className="text-sm font-medium text-orange-600 mb-2">
                      Đã cấp lại {selectedReferral.reissueCount} lần
                    </p>
                    {selectedReferral.reissue1 && (
                      <div className="text-sm bg-white rounded p-2 mb-2">
                        <span className="font-mono">{selectedReferral.reissue1.code}</span>
                        {selectedReferral.reissue1.status && (
                          <span className="ml-2 text-gray-500">({selectedReferral.reissue1.status})</span>
                        )}
                      </div>
                    )}
                    {selectedReferral.reissue2 && (
                      <div className="text-sm bg-white rounded p-2">
                        <span className="font-mono">{selectedReferral.reissue2.code}</span>
                        {selectedReferral.reissue2.status && (
                          <span className="ml-2 text-gray-500">({selectedReferral.reissue2.status})</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Invoice Info */}
              {selectedReferral.invoiceInfo && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-green-500" />
                    Thông Tin Đơn Hàng
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Mã hóa đơn</p>
                      <p className="font-mono font-medium">{selectedReferral.invoiceInfo.invoiceCode}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tổng tiền</p>
                      <p className="font-bold text-green-600 text-lg">
                        {formatCurrency(selectedReferral.invoiceInfo.invoiceAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Ngày mua</p>
                      <p className="font-medium">{formatDate(selectedReferral.invoiceInfo.invoiceDate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Trạng thái</p>
                      <p className="font-medium">{selectedReferral.invoiceInfo.invoiceStatus}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Commission Info */}
              <div className={`rounded-lg p-4 ${
                selectedReferral.commissionStatus === 'invalid' ? 'bg-red-50' :
                selectedReferral.commissionStatus === 'available' ? 'bg-primary-50' :
                selectedReferral.commissionStatus === 'paid' ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary-500" />
                  Thông Tin Hoa Hồng
                </h3>

                <div className="mb-3">
                  <Badge variant={getCommissionStatusVariant(selectedReferral.commissionStatus)} className="text-sm">
                    {getCommissionStatusText(selectedReferral.commissionStatus)}
                  </Badge>
                </div>

                {selectedReferral.commissionStatus === 'invalid' && selectedReferral.invalidReasonText && (
                  <div className="bg-red-100 rounded p-3 mb-4">
                    <p className="text-sm text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{selectedReferral.invalidReasonText}</span>
                    </p>
                    {selectedReferral.actualUserPhone && (
                      <p className="text-xs text-red-600 mt-2">
                        Người sử dụng thực tế: {selectedReferral.actualUserName || 'N/A'} - {selectedReferral.actualUserPhone}
                        {selectedReferral.actualCustomerType && ` (${selectedReferral.actualCustomerType === 'new' ? 'Khách mới' : 'Khách cũ'})`}
                      </p>
                    )}
                  </div>
                )}

                {selectedReferral.commissionInfo && (
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-gray-500 text-sm">Tổng hoa hồng</p>
                      <p className="text-2xl font-bold text-primary-600">
                        {formatCurrency(selectedReferral.commissionInfo.totalCommission)}
                      </p>
                    </div>

                    {/* Commission Breakdown */}
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Chi tiết hoa hồng
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hoa hồng cơ bản ({selectedReferral.commissionInfo.breakdown.basic.rate || '10%'})</span>
                          <span className="font-medium">{formatCurrency(selectedReferral.commissionInfo.breakdown.basic.amount)}</span>
                        </div>
                        {selectedReferral.commissionInfo.breakdown.firstOrder && (
                          <div className="flex justify-between text-blue-600">
                            <span>Thưởng đơn đầu ({selectedReferral.commissionInfo.breakdown.firstOrder.rate || '10%'})</span>
                            <span className="font-medium">+{formatCurrency(selectedReferral.commissionInfo.breakdown.firstOrder.amount)}</span>
                          </div>
                        )}
                        {selectedReferral.commissionInfo.breakdown.tierBonus && (
                          <div className="flex justify-between text-green-600">
                            <span>Thưởng cấp bậc {selectedReferral.commissionInfo.breakdown.tierBonus.tierName} ({selectedReferral.commissionInfo.breakdown.tierBonus.rate || '0%'})</span>
                            <span className="font-medium">+{formatCurrency(selectedReferral.commissionInfo.breakdown.tierBonus.amount)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!selectedReferral.commissionInfo && selectedReferral.commissionStatus === 'pending' && (
                  <p className="text-sm text-yellow-700">
                    Hoa hồng sẽ được tính sau khi khách hàng hoàn tất mua hàng.
                  </p>
                )}
              </div>

              {/* Note */}
              {selectedReferral.note && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Ghi chú</h3>
                  <p className="text-sm text-gray-600">{selectedReferral.note}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4">
              <Button className="w-full" onClick={handleCloseDetailModal}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal - Lifetime Commission */}
      {showDetailModal && selectedLifetimeCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Repeat className="w-5 h-5 text-green-600" />
                Hoa Hồng Trọn Đời
              </h2>
              <Button variant="ghost" size="sm" onClick={handleCloseDetailModal}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* F1 Customer Info */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Khách Hàng F1
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Họ tên</p>
                    <p className="font-medium">{selectedLifetimeCommission.f1Name || 'Khách hàng'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Số điện thoại</p>
                    <p className="font-medium">{selectedLifetimeCommission.f1Phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Mã voucher gốc</p>
                    <p className="font-mono text-purple-600">{selectedLifetimeCommission.voucherCode}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Loại</p>
                    <Badge variant="info" className="text-xs">
                      <Repeat className="w-3 h-3 mr-1" />
                      Mua lại (Trọn đời)
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Invoice Info */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-green-500" />
                  Thông Tin Đơn Hàng
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Mã hóa đơn</p>
                    <p className="font-mono font-medium">{selectedLifetimeCommission.invoiceCode}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tổng tiền</p>
                    <p className="font-bold text-green-600 text-lg">
                      {formatCurrency(selectedLifetimeCommission.invoiceAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ngày mua</p>
                    <p className="font-medium">{formatDate(selectedLifetimeCommission.invoiceDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Trạng thái</p>
                    <p className="font-medium">{selectedLifetimeCommission.invoiceStatus}</p>
                  </div>
                </div>
              </div>

              {/* Commission Info */}
              <div className="bg-primary-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary-500" />
                  Thông Tin Hoa Hồng
                </h3>

                <div className="mb-3">
                  <Badge variant={getCommissionStatusVariant(selectedLifetimeCommission.status)}>
                    {getCommissionStatusText(selectedLifetimeCommission.status)}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-500 text-sm">Tổng hoa hồng trọn đời</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedLifetimeCommission.totalCommission)}
                    </p>
                  </div>

                  {/* Commission Breakdown */}
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Chi tiết hoa hồng
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Hoa hồng cơ bản ({selectedLifetimeCommission.breakdown.basic.rate || '5%'})
                        </span>
                        <span className="font-medium">
                          {formatCurrency(selectedLifetimeCommission.breakdown.basic.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-400 line-through">
                        <span>Thưởng đơn đầu</span>
                        <span>Không áp dụng</span>
                      </div>
                      {selectedLifetimeCommission.breakdown.tierBonus && (
                        <div className="flex justify-between text-green-600">
                          <span>
                            Thưởng cấp bậc {selectedLifetimeCommission.breakdown.tierBonus.tierName} ({selectedLifetimeCommission.breakdown.tierBonus.rate || '0%'})
                          </span>
                          <span className="font-medium">
                            +{formatCurrency(selectedLifetimeCommission.breakdown.tierBonus.amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info note */}
                  <div className="bg-blue-50 rounded p-3 text-sm text-blue-700">
                    <p className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Đây là hoa hồng trọn đời từ khách hàng F1 mua lại. Bạn sẽ nhận được hoa hồng mỗi khi F1 này mua hàng.
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedLifetimeCommission.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Ghi chú</h3>
                  <p className="text-sm text-gray-600">{selectedLifetimeCommission.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4">
              <Button className="w-full" onClick={handleCloseDetailModal}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralHistoryPage;
