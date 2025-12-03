import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Shield,
  Lock,
  Info,
  Eye,
  ChevronDown,
  ChevronUp,
  Receipt,
  Calendar,
  FileText,
  Award,
  Percent,
  Gift
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Types
interface BankInfo {
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  branch: string | null;
  verified: boolean;
}

interface Balance {
  totalCommission: number;
  availableBalance: number;
  pendingWithdrawals: number;
  completedWithdrawals: number;
  // v16: Lock system fields
  pendingCommission?: number;
  lockedCommission?: number;
  paidCommission?: number;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  bankInfo: {
    bank_name: string;
    bank_account_number: string;
    bank_account_name: string;
    bank_branch?: string;
  };
  processingInfo: {
    processed_by?: string;
    processed_at?: string;
    rejection_reason?: string;
    transfer_reference?: string;
    admin_note?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface WithdrawalData {
  balance: Balance;
  bankInfo: BankInfo;
  withdrawals: Withdrawal[];
  minWithdrawalAmount: number;
}

// v16: Lock payment settings from database
interface LockSettings {
  lockPeriodDays: number;
  paymentDay: number;
}

// v18: Payment history types
interface PaymentBatch {
  id: string;
  payment_month: string;
  payment_date: string;
  total_f0_count: number;
  total_commission: number;
  status: string;
  status_label: string;
  created_at: string;
  created_by_name: string | null;
  notes: string | null;
  // F0-specific fields (calculated)
  f0_amount: number;
  f0_commission_count: number;
  f0_commission_months: string[];
}

interface CommissionRecord {
  id: string;
  voucher_code: string;
  f1_phone: string | null;
  f1_name: string | null;
  is_new_customer: boolean | null;
  invoice_code: string | null;
  invoice_amount: number | null;
  invoice_date: string | null;
  basic_rate: number | null;
  basic_amount: number | null;
  first_order_applied: boolean | null;
  first_order_amount: number | null;
  tier_code: string | null;
  tier_name: string | null;
  tier_bonus_rate: number | null;
  tier_bonus_amount: number | null;
  total_commission: number;
  status: string;
  status_label: string;
  locked_at: string | null;
  paid_at: string | null;
  commission_month: string | null;
  qualified_at?: string | null;
  lock_date?: string | null;
  days_until_lock?: number | null;
}

interface PaymentHistoryData {
  payment_batches: PaymentBatch[];
  locked_commissions: CommissionRecord[];
  pending_commissions: CommissionRecord[];
  summary: {
    total_batches: number;
    locked_count: number;
    locked_amount: number;
    pending_count: number;
    pending_amount: number;
    paid_amount: number;
  };
}

interface BatchDetailData {
  batch: PaymentBatch | null;
  commissions: CommissionRecord[];
  breakdown: {
    basic_total: number;
    tier_bonus_total: number;
    first_order_total: number;
    total: number;
    count: number;
  };
}

const WithdrawalPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<WithdrawalData | null>(null);
  // v16: Lock settings from database (default values as fallback)
  const [lockSettings, setLockSettings] = useState<LockSettings>({
    lockPeriodDays: 15,
    paymentDay: 5,
  });
  // v16: Removed withdrawal form states - F0 no longer submits withdrawal requests
  // Admin pays directly via batch payment system

  // v18: Payment history states
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<PaymentBatch | null>(null);
  const [batchDetail, setBatchDetail] = useState<BatchDetailData | null>(null);
  const [loadingBatchDetail, setLoadingBatchDetail] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

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

  // Fetch withdrawal data - v16: Also fetch dashboard stats for lock system data
  const fetchWithdrawalData = async (showRefreshing = false) => {
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
      // Fetch both withdrawal data and dashboard stats in parallel
      const [withdrawalResponse, dashboardResponse] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-withdrawal-request`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              action: 'get',
              f0_id: f0User.id,
            }),
          }
        ),
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-f0-dashboard-stats`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              f0_id: f0User.id,
            }),
          }
        ),
      ]);

      const withdrawalResult = await withdrawalResponse.json();
      const dashboardResult = await dashboardResponse.json();

      if (!withdrawalResult.success) {
        toast.error(withdrawalResult.error || 'Không thể tải dữ liệu');
        return;
      }

      // Merge lock system data from dashboard stats into balance
      const mergedData: WithdrawalData = {
        ...withdrawalResult.data,
        balance: {
          ...withdrawalResult.data.balance,
          // v16: Lock system fields from dashboard stats
          pendingCommission: dashboardResult.success ? dashboardResult.data.stats.pendingCommission : 0,
          lockedCommission: dashboardResult.success ? dashboardResult.data.stats.lockedCommission : 0,
          paidCommission: dashboardResult.success ? dashboardResult.data.stats.paidCommission : 0,
        },
      };

      setData(mergedData);

      // v17: Update lock settings from dashboard response
      if (dashboardResult.success && dashboardResult.data.lockSettings) {
        setLockSettings({
          lockPeriodDays: dashboardResult.data.lockSettings.lockPeriodDays || 15,
          paymentDay: dashboardResult.data.lockSettings.paymentDay || 5,
        });
      }
    } catch (err) {
      console.error('Withdrawal data fetch error:', err);
      toast.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // v18: Fetch payment history from new Edge Function
  const fetchPaymentHistory = async () => {
    const f0User = getF0User();
    if (!f0User?.id) return;

    setLoadingHistory(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-f0-payment-history`,
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
      if (result.success) {
        setPaymentHistory(result.data);
      }
    } catch (err) {
      console.error('Payment history fetch error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // v18: Fetch batch detail
  const fetchBatchDetail = async (batchId: string) => {
    const f0User = getF0User();
    if (!f0User?.id) return;

    setLoadingBatchDetail(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-f0-payment-history`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            f0_id: f0User.id,
            action: 'get_batch_detail',
            batch_id: batchId,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        setBatchDetail(result.data);
      }
    } catch (err) {
      console.error('Batch detail fetch error:', err);
    } finally {
      setLoadingBatchDetail(false);
    }
  };

  // v18: Handle view batch detail
  const handleViewBatchDetail = (batch: PaymentBatch) => {
    setSelectedBatch(batch);
    setIsBatchModalOpen(true);
    fetchBatchDetail(batch.id);
  };

  useEffect(() => {
    fetchWithdrawalData();
  }, []);

  // v18: Fetch payment history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && !paymentHistory) {
      fetchPaymentHistory();
    }
  }, [activeTab]);

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'info';
      case 'pending':
        return 'warning';
      case 'rejected':
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
      case 'processing':
        return 'Đang xử lý';
      case 'pending':
        return 'Chờ duyệt';
      case 'rejected':
        return 'Từ chối';
      default:
        return status;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'processing':
        return Clock;
      case 'pending':
        return Clock;
      case 'rejected':
        return XCircle;
      default:
        return Clock;
    }
  };

  // v16: Removed handleSubmit and handleCancelWithdrawal - F0 no longer submits withdrawal requests
  // Admin pays directly via batch payment system on the 5th of each month

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

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 mb-4">Không thể tải dữ liệu</p>
            <Button onClick={() => fetchWithdrawalData()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { balance, bankInfo, withdrawals } = data;

  // v16: Updated balance cards for lock system - showing commission status instead of withdrawal balance
  const balanceCards = [
    {
      title: 'Chờ Chốt',
      value: formatCurrency(balance.pendingCommission || 0),
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Đã Chốt',
      value: formatCurrency(balance.lockedCommission || balance.availableBalance || 0),
      icon: Lock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Đã Nhận',
      value: formatCurrency(balance.paidCommission || balance.completedWithdrawals || 0),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  // v18: Render payment batches list
  const renderPaymentBatches = () => {
    if (loadingHistory) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải lịch sử thanh toán...</p>
        </div>
      );
    }

    if (!paymentHistory || paymentHistory.payment_batches.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Chưa có đợt thanh toán nào</p>
          <p className="text-sm mt-1">Hoa hồng đã chốt sẽ được thanh toán vào ngày {lockSettings.paymentDay} hàng tháng</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Tổng đợt thanh toán</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{paymentHistory.summary.total_batches}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Tổng đã nhận</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paymentHistory.summary.paid_amount)}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Đang chờ thanh toán</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(paymentHistory.summary.locked_amount)}</p>
          </div>
        </div>

        {/* Payment Batches Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày thanh toán</TableHead>
                <TableHead>Kỳ thanh toán</TableHead>
                <TableHead className="text-right">Số giao dịch</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentHistory.payment_batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(batch.payment_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {batch.payment_month}
                    </Badge>
                    {batch.f0_commission_months.length > 1 && (
                      <span className="text-xs text-gray-500 ml-2">
                        +{batch.f0_commission_months.length - 1} tháng khác
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{batch.f0_commission_count}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {formatCurrency(batch.f0_amount)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewBatchDetail(batch)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Locked Commissions Section */}
        {paymentHistory.locked_commissions.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-600" />
                Hoa hồng đã chốt - chờ thanh toán
              </CardTitle>
              <CardDescription>
                Các hoa hồng này sẽ được thanh toán vào ngày {lockSettings.paymentDay} tháng sau
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã voucher</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Mã hóa đơn</TableHead>
                      <TableHead className="text-right">Giá trị đơn</TableHead>
                      <TableHead className="text-right">Hoa hồng</TableHead>
                      <TableHead>Ngày chốt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.locked_commissions.slice(0, 10).map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell className="font-mono">{commission.voucher_code}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{commission.f1_name || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{commission.f1_phone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{commission.invoice_code || 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(commission.invoice_amount || 0)}</TableCell>
                        <TableCell className="text-right font-semibold text-purple-600">
                          {formatCurrency(commission.total_commission)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {commission.locked_at ? formatDate(commission.locked_at) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {paymentHistory.locked_commissions.length > 10 && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  Và {paymentHistory.locked_commissions.length - 10} hoa hồng khác...
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Commissions Section */}
        {paymentHistory.pending_commissions.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Hoa hồng đang chờ chốt
              </CardTitle>
              <CardDescription>
                Các hoa hồng này đang trong thời gian chờ xác nhận ({lockSettings.lockPeriodDays} ngày)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã voucher</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Mã hóa đơn</TableHead>
                      <TableHead className="text-right">Giá trị đơn</TableHead>
                      <TableHead className="text-right">Hoa hồng</TableHead>
                      <TableHead>Ngày chốt dự kiến</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.pending_commissions.slice(0, 10).map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell className="font-mono">{commission.voucher_code}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{commission.f1_name || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{commission.f1_phone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{commission.invoice_code || 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(commission.invoice_amount || 0)}</TableCell>
                        <TableCell className="text-right font-semibold text-orange-600">
                          {formatCurrency(commission.total_commission)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="text-gray-600">
                              {commission.lock_date ? new Date(commission.lock_date).toLocaleDateString('vi-VN') : 'N/A'}
                            </div>
                            {commission.days_until_lock !== null && commission.days_until_lock !== undefined && (
                              <Badge variant="outline" className="text-xs mt-1">
                                còn {commission.days_until_lock} ngày
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {paymentHistory.pending_commissions.length > 10 && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  Và {paymentHistory.pending_commissions.length - 10} hoa hồng khác...
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // v18: Render batch detail modal content
  const renderBatchDetailModal = () => {
    if (!selectedBatch) return null;

    return (
      <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Chi tiết đợt thanh toán
            </DialogTitle>
            <DialogDescription>
              Kỳ thanh toán: {selectedBatch.payment_month} | Ngày: {formatDate(selectedBatch.payment_date)}
            </DialogDescription>
          </DialogHeader>

          {loadingBatchDetail ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
              <p className="text-gray-600">Đang tải chi tiết...</p>
            </div>
          ) : batchDetail ? (
            <div className="space-y-6">
              {/* Breakdown Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Hoa hồng cơ bản</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(batchDetail.breakdown.basic_total)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">Thưởng thứ hạng</span>
                  </div>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(batchDetail.breakdown.tier_bonus_total)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">Thưởng đơn đầu</span>
                  </div>
                  <p className="text-lg font-bold text-amber-600">{formatCurrency(batchDetail.breakdown.first_order_total)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Tổng cộng</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(batchDetail.breakdown.total)}</p>
                </div>
              </div>

              {/* Commission Records */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Chi tiết {batchDetail.breakdown.count} hoa hồng
                </h4>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã voucher</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Hóa đơn</TableHead>
                        <TableHead className="text-right">Giá trị đơn</TableHead>
                        <TableHead className="text-right">Cơ bản</TableHead>
                        <TableHead className="text-right">Thứ hạng</TableHead>
                        <TableHead className="text-right">Đơn đầu</TableHead>
                        <TableHead className="text-right">Tổng HH</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchDetail.commissions.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-sm">{c.voucher_code}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{c.f1_name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{c.f1_phone}</div>
                              {c.is_new_customer && (
                                <Badge variant="outline" className="text-xs mt-1 text-green-600 border-green-300">
                                  Khách mới
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm">{c.invoice_code || 'N/A'}</div>
                            {c.invoice_date && (
                              <div className="text-xs text-gray-500">
                                {new Date(c.invoice_date).toLocaleDateString('vi-VN')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(c.invoice_amount || 0)}</TableCell>
                          <TableCell className="text-right">
                            <div className="text-sm">{formatCurrency(c.basic_amount || 0)}</div>
                            {c.basic_rate && (
                              <div className="text-xs text-gray-500">{c.basic_rate}%</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-sm text-purple-600">{formatCurrency(c.tier_bonus_amount || 0)}</div>
                            {c.tier_bonus_rate && c.tier_bonus_rate > 0 && (
                              <div className="text-xs text-gray-500">{c.tier_code}: +{c.tier_bonus_rate}%</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {c.first_order_applied && (
                              <div className="text-sm text-amber-600">{formatCurrency(c.first_order_amount || 0)}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatCurrency(c.total_commission)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Batch Notes */}
              {selectedBatch.notes && (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-700">Ghi chú</span>
                  </div>
                  <p className="text-gray-600">{selectedBatch.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Không thể tải chi tiết đợt thanh toán</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Thanh Toán Hoa Hồng</h1>
            <p className="text-gray-600 mt-1">
              Theo dõi tình trạng và lịch sử thanh toán hoa hồng
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchWithdrawalData(true);
              if (activeTab === 'history') fetchPaymentHistory();
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {/* Bank Info Warning */}
        {!bankInfo.verified && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Chưa xác minh tài khoản ngân hàng</AlertTitle>
            <AlertDescription>
              Bạn cần xác minh thông tin ngân hàng trước khi có thể rút tiền.
              <Button
                variant="link"
                className="ml-2 p-0 h-auto"
                onClick={() => navigate('/f0/profile')}
              >
                Xác minh ngay →
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* v18: Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Lịch sử thanh toán
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {/* v16: Commission Status - Lock System */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary-500" />
                  Tình Trạng Hoa Hồng
                </CardTitle>
                <CardDescription>
                  Hoa hồng được chốt sau {lockSettings.lockPeriodDays} ngày và thanh toán tự động vào ngày {lockSettings.paymentDay} hàng tháng
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Commission Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Pending Commission */}
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700">Chờ chốt</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(balance.pendingCommission || 0)}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Đang trong thời gian chờ xác nhận ({lockSettings.lockPeriodDays} ngày)
                    </p>
                  </div>

                  {/* Locked Commission */}
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">Đã chốt</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(balance.lockedCommission || balance.availableBalance || 0)}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      Sẽ được thanh toán vào ngày {lockSettings.paymentDay} tháng sau
                    </p>
                  </div>

                  {/* Paid Commission */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Đã nhận</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(balance.paidCommission || balance.completedWithdrawals || 0)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Đã được chuyển vào tài khoản của bạn
                    </p>
                  </div>
                </div>

                {/* Payment Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900">Quy trình thanh toán hoa hồng</h4>
                      <ul className="mt-2 space-y-2 text-sm text-blue-800">
                        <li className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                          <span><strong>Chờ chốt:</strong> Hoa hồng từ đơn hàng mới sẽ được chờ xác nhận trong {lockSettings.lockPeriodDays} ngày</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                          <span><strong>Đã chốt:</strong> Sau {lockSettings.lockPeriodDays} ngày, hoa hồng được chốt và EXP được cộng vào tài khoản</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                          <span><strong>Thanh toán:</strong> Vào ngày {lockSettings.paymentDay} hàng tháng, hoa hồng đã chốt sẽ được chuyển vào tài khoản ngân hàng của bạn</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Bank Info Display */}
                {bankInfo.verified ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">Tài khoản nhận tiền (đã xác minh)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Ngân hàng</p>
                        <p className="font-medium">{bankInfo.bankName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Số tài khoản</p>
                        <p className="font-medium font-mono">{bankInfo.accountNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Chủ tài khoản</p>
                        <p className="font-medium">{bankInfo.accountName}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Alert variant="warning" className="mt-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Chưa xác minh tài khoản ngân hàng</AlertTitle>
                    <AlertDescription>
                      Bạn cần xác minh thông tin ngân hàng để nhận thanh toán hoa hồng.
                      <Button
                        variant="link"
                        className="ml-2 p-0 h-auto"
                        onClick={() => navigate('/f0/profile')}
                      >
                        Xác minh ngay →
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Old Withdrawal History (from withdrawal requests - legacy) */}
            {withdrawals.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Lịch Sử Yêu Cầu Rút Tiền (Legacy)</CardTitle>
                  <CardDescription>Các yêu cầu rút tiền cũ trước khi chuyển sang hệ thống thanh toán tự động</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ngày Yêu Cầu</TableHead>
                          <TableHead className="text-right">Số Tiền</TableHead>
                          <TableHead>Thông Tin Ngân Hàng</TableHead>
                          <TableHead>Trạng Thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map((withdrawal) => {
                          const StatusIcon = getStatusIcon(withdrawal.status);
                          return (
                            <TableRow key={withdrawal.id}>
                              <TableCell className="text-gray-600">
                                {formatDate(withdrawal.createdAt)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-primary-600">
                                {formatCurrency(withdrawal.amount)}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{withdrawal.bankInfo.bank_name}</div>
                                  <div className="text-gray-600 font-mono">
                                    {withdrawal.bankInfo.bank_account_number}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    {withdrawal.bankInfo.bank_account_name}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <Badge
                                    variant={getStatusVariant(withdrawal.status)}
                                    className="flex items-center gap-1 w-fit"
                                  >
                                    <StatusIcon className="w-3 h-3" />
                                    {getStatusLabel(withdrawal.status)}
                                  </Badge>
                                  {withdrawal.status === 'rejected' && withdrawal.processingInfo?.rejection_reason && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Lý do: {withdrawal.processingInfo.rejection_reason}
                                    </p>
                                  )}
                                  {withdrawal.status === 'completed' && withdrawal.processingInfo?.transfer_reference && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Mã GD: {withdrawal.processingInfo.transfer_reference}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary-500" />
                  Lịch Sử Thanh Toán Chi Tiết
                </CardTitle>
                <CardDescription>
                  Xem chi tiết từng đợt thanh toán và các hoa hồng được thanh toán
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderPaymentBatches()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Batch Detail Modal */}
        {renderBatchDetailModal()}
      </div>
    </div>
  );
};

export default WithdrawalPage;
