import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Phone,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Lock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { f1CustomerService } from '@/services/f1CustomerService';
import type { F1CustomerSummary, F1CustomerOrder } from '@/types/f1Customer';

// ============================================
// MEMOIZED HELPER FUNCTIONS (outside component)
// ============================================

// Format currency compact
const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('vi-VN').format(amount);
};

// Format currency full
const formatCurrencyFull = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

// Format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Format datetime
const formatDateTime = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get avatar color based on name
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-red-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// Get commission status badge - v7: Simplified labels per PLAN
// Values: "Chờ xác nhận", "Chờ thanh toán", "Đã thanh toán", "Đã hủy"
const getStatusBadge = (status: string, label: string, daysUntilLock?: number | null) => {
  switch (status) {
    case 'paid':
      return (
        <Badge variant="success" className="text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Đã thanh toán
        </Badge>
      );
    case 'locked':
      return (
        <Badge variant="default" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
          <Lock className="w-3 h-3 mr-1" />
          Chờ thanh toán
        </Badge>
      );
    case 'pending':
    case 'available': // Legacy support
      return (
        <Badge variant="warning" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Chờ xác nhận{daysUntilLock !== null && daysUntilLock !== undefined && daysUntilLock > 0 ? ` (${daysUntilLock} ngày)` : ''}
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="danger" className="text-xs">
          <XCircle className="w-3 h-3 mr-1" />
          Đã hủy
        </Badge>
      );
    default:
      return (
        <Badge variant="default" className="text-xs text-gray-500">
          <Clock className="w-3 h-3 mr-1" />
          Chờ xác nhận
        </Badge>
      );
  }
};

// ============================================
// MEMOIZED ORDER ROW COMPONENT
// ============================================
interface OrderRowProps {
  order: F1CustomerOrder;
}

const OrderRow = memo(({ order }: OrderRowProps) => (
  <div className="bg-white p-3 rounded-lg border text-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="font-medium">{order.invoice_code}</span>
      {getStatusBadge(order.commission_status, order.status_label, order.days_until_lock)}
    </div>
    <div className="flex items-center justify-between text-gray-500">
      <span>{formatDateTime(order.invoice_date)}</span>
      <span className="font-medium text-gray-900">
        {formatCurrencyFull(order.invoice_amount)}
      </span>
    </div>
    <div className="flex items-center justify-between mt-1">
      <span className="text-xs text-gray-400">{order.order_type}</span>
      <span className="text-xs font-medium text-primary-600">
        +{formatCurrencyFull(order.total_commission)}
      </span>
    </div>
  </div>
));
OrderRow.displayName = 'OrderRow';

// ============================================
// MEMOIZED CUSTOMER ROW COMPONENT
// ============================================
interface CustomerRowProps {
  customer: F1CustomerSummary;
  isExpanded: boolean;
  loadingOrders: boolean;
  orders: F1CustomerOrder[];
  copiedPhone: string | null;
  onToggle: (customer: F1CustomerSummary) => void;
  onCopyPhone: (phone: string, e: React.MouseEvent) => void;
}

const CustomerRow = memo(({
  customer,
  isExpanded,
  loadingOrders,
  orders,
  copiedPhone,
  onToggle,
  onCopyPhone,
}: CustomerRowProps) => (
  <div>
    {/* Row */}
    <div
      className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => onToggle(customer)}
    >
      {/* Customer info */}
      <div className="col-span-12 md:col-span-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${getAvatarColor(customer.f1_name)} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
          {customer.f1_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{customer.f1_name}</p>
          <p className="text-xs text-gray-500 md:hidden">{customer.f1_phone}</p>
        </div>
      </div>

      {/* Phone */}
      <div className="hidden md:flex md:col-span-3 items-center gap-2">
        <Phone className="w-4 h-4 text-gray-400" />
        <span className="text-gray-700">{customer.f1_phone}</span>
        <button
          onClick={(e) => onCopyPhone(customer.f1_phone, e)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {copiedPhone === customer.f1_phone ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3 text-gray-400" />
          )}
        </button>
      </div>

      {/* Status */}
      <div className="hidden md:block md:col-span-2">
        {customer.has_valid_order ? (
          <Badge variant="success" className="text-xs">Đã mua hàng</Badge>
        ) : (
          <Badge variant="warning" className="text-xs">Chưa có đơn</Badge>
        )}
      </div>

      {/* Revenue */}
      <div className="hidden md:block md:col-span-2 text-right">
        <span className="font-semibold text-gray-900">
          {formatCurrencyFull(customer.total_revenue)}
        </span>
      </div>

      {/* Expand icon */}
      <div className="hidden md:flex md:col-span-1 justify-end">
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Mobile: status & revenue */}
      <div className="col-span-12 md:hidden flex items-center justify-between">
        {customer.has_valid_order ? (
          <Badge variant="success" className="text-xs">Đã mua hàng</Badge>
        ) : (
          <Badge variant="warning" className="text-xs">Chưa có đơn</Badge>
        )}
        <span className="font-semibold text-gray-900">
          {formatCurrencyFull(customer.total_revenue)}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </div>

    {/* Expanded Detail */}
    {isExpanded && (
      <div className="bg-gray-50 border-t px-4 py-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Customer Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Thông tin</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Voucher</p>
                <p className="font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {customer.first_voucher_code}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Ngày giới thiệu</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(customer.assigned_at)}
                </p>
              </div>
            </div>

            {/* v17: Revenue Breakdown - v7: Updated labels */}
            <div className="mb-4">
              <p className="text-gray-500 text-xs mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Doanh thu theo trạng thái
              </p>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
                  <p className="text-orange-600 text-xs">Chờ xác nhận</p>
                  <p className="font-semibold text-orange-600">{formatCurrencyFull(customer.pending_revenue || 0)}</p>
                </div>
                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                  <p className="text-blue-600 text-xs">Chờ thanh toán</p>
                  <p className="font-semibold text-blue-600">{formatCurrencyFull(customer.locked_revenue || 0)}</p>
                </div>
                <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                  <p className="text-green-600 text-xs">Đã thanh toán</p>
                  <p className="font-semibold text-green-600">{formatCurrencyFull(customer.paid_revenue || 0)}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border">
                  <p className="text-gray-500 text-xs">Tổng</p>
                  <p className="font-semibold text-gray-900">{formatCurrencyFull(customer.total_revenue || 0)}</p>
                </div>
              </div>
            </div>

            {/* Commission Breakdown - v7: Updated labels per PLAN */}
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                <p className="text-orange-600 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Chờ xác nhận
                </p>
                <p className="font-semibold text-orange-600">{formatCurrencyFull(customer.pending_commission || 0)}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-blue-600 text-xs flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Chờ thanh toán
                </p>
                <p className="font-semibold text-blue-600">{formatCurrencyFull(customer.locked_commission || 0)}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <p className="text-green-600 text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã thanh toán
                </p>
                <p className="font-semibold text-green-600">{formatCurrencyFull(customer.paid_commission || 0)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border">
                <p className="text-gray-500 text-xs flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Tổng
                </p>
                <p className="font-semibold text-gray-900">{formatCurrencyFull(customer.total_commission || 0)}</p>
              </div>
            </div>
          </div>

          {/* Right: Order History */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">
              Lịch sử đơn hàng ({customer.total_orders} đơn)
            </h4>

            {loadingOrders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Chưa có đơn hàng nào
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
), (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.customer.assignment_id === nextProps.customer.assignment_id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.loadingOrders === nextProps.loadingOrders &&
    prevProps.orders === nextProps.orders &&
    prevProps.copiedPhone === nextProps.copiedPhone
  );
});
CustomerRow.displayName = 'CustomerRow';

// ============================================
// MAIN COMPONENT
// ============================================

const MyCustomersPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [customers, setCustomers] = useState<F1CustomerSummary[]>([]);
  const [summary, setSummary] = useState({
    total_f1: 0,
    // v17: Orders breakdown by status
    pending_orders: 0,
    locked_orders: 0,
    paid_orders: 0,
    total_orders: 0,
    // v17: Revenue breakdown by status
    pending_revenue: 0,
    locked_revenue: 0,
    paid_revenue: 0,
    total_revenue: 0,
    total_commission: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // Expandable row state
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<F1CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Memoized summary stats (expensive formatting)
  const summaryStats = useMemo(() => ({
    totalF1: summary.total_f1,
    totalOrders: summary.total_orders,
    totalRevenue: formatCurrency(summary.total_revenue),
    totalCommission: formatCurrency(summary.total_commission),
  }), [summary]);

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

  // Fetch customers
  const fetchCustomers = useCallback(async (showRefreshing = false, page = 1) => {
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

    const result = await f1CustomerService.getMyCustomers(f0User.id, {
      search_phone: searchPhone,
      page,
      limit: pagination.limit,
    });

    if (result.success && result.data) {
      setCustomers(result.data.customers);
      setSummary(result.data.summary);
      setPagination(result.data.pagination);
    } else {
      setError(result.error || 'Không thể tải dữ liệu');
    }

    setLoading(false);
    setRefreshing(false);
  }, [navigate, searchPhone, pagination.limit]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Handle search
  const handleSearch = () => {
    setSearchPhone(searchInput);
    setExpandedPhone(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchPhone('');
  };

  // Copy phone
  const copyPhone = async (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Toggle expand row
  const toggleExpand = async (customer: F1CustomerSummary) => {
    if (expandedPhone === customer.f1_phone) {
      setExpandedPhone(null);
      setExpandedOrders([]);
      return;
    }

    setExpandedPhone(customer.f1_phone);
    setLoadingOrders(true);

    const f0User = getF0User();
    if (f0User?.id) {
      const result = await f1CustomerService.getCustomerDetail(f0User.id, customer.f1_phone);
      if (result.success && result.data) {
        setExpandedOrders(result.data.orders.slice(0, 5)); // Max 5 orders
      } else {
        setExpandedOrders([]);
      }
    }

    setLoadingOrders(false);
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">F1 Của Bạn</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchCustomers(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Compact Summary Bar (using memoized stats) */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-gray-500">Tổng F1:</span>
            <span className="font-semibold">{summaryStats.totalF1}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-green-500" />
            <span className="text-gray-500">Đơn hàng:</span>
            <span className="font-semibold">{summaryStats.totalOrders}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-gray-500">Doanh thu:</span>
            <span className="font-semibold text-purple-600">{summaryStats.totalRevenue}đ</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-yellow-500" />
            <span className="text-gray-500">Hoa hồng:</span>
            <span className="font-semibold text-yellow-600">{summaryStats.totalCommission}đ</span>
          </div>
        </div>
        {/* v17: Revenue breakdown detail - v7: Updated labels */}
        {summary.total_revenue > 0 && (
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t text-xs">
            <span className="text-gray-400">Chi tiết doanh thu:</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-orange-500" />
              <span className="text-orange-600">Chờ xác nhận: {formatCurrency(summary.pending_revenue)}đ</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-blue-500" />
              <span className="text-blue-600">Chờ thanh toán: {formatCurrency(summary.locked_revenue)}đ</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span className="text-green-600">Đã thanh toán: {formatCurrency(summary.paid_revenue)}đ</span>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Tìm theo số điện thoại F1..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch}>Tìm kiếm</Button>
          {searchPhone && (
            <Button variant="outline" onClick={clearSearch}>
              Xóa
            </Button>
          )}
        </div>
        {searchPhone && (
          <p className="text-sm text-gray-500 mt-2">
            Kết quả tìm kiếm: <span className="font-medium">{searchPhone}</span>
          </p>
        )}
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fetchCustomers()}
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Customer Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b text-sm font-medium text-gray-600">
          <div className="col-span-4">Khách hàng</div>
          <div className="col-span-3">Số điện thoại</div>
          <div className="col-span-2">Trạng thái</div>
          <div className="col-span-2 text-right">Doanh thu</div>
          <div className="col-span-1"></div>
        </div>

        {/* Table Body */}
        {customers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchPhone ? 'Không tìm thấy khách hàng nào' : 'Chưa có khách hàng nào'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {customers.map((customer) => (
              <CustomerRow
                key={customer.assignment_id}
                customer={customer}
                isExpanded={expandedPhone === customer.f1_phone}
                loadingOrders={loadingOrders}
                orders={expandedPhone === customer.f1_phone ? expandedOrders : []}
                copiedPhone={copiedPhone}
                onToggle={toggleExpand}
                onCopyPhone={copyPhone}
              />
            ))}
          </div>
        )}

        {/* Pagination - always show */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <p className="text-sm text-gray-500">
            Hiển thị {customers.length} / {pagination.total} khách hàng
          </p>
          {pagination.total_pages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchCustomers(false, pagination.page - 1)}
              >
                Trước
              </Button>
              <span className="text-sm text-gray-600">
                {pagination.page} / {pagination.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => fetchCustomers(false, pagination.page + 1)}
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyCustomersPage;
