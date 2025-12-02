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
  Info
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

const WithdrawalPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<WithdrawalData | null>(null);
  // v16: Removed withdrawal form states - F0 no longer submits withdrawal requests
  // Admin pays directly via batch payment system

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
    } catch (err) {
      console.error('Withdrawal data fetch error:', err);
      toast.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWithdrawalData();
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
            onClick={() => fetchWithdrawalData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {/* Balance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {balanceCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{card.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        {card.value}
                      </p>
                    </div>
                    <div className={`${card.bgColor} p-3 rounded-lg`}>
                      <Icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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

        {/* v16: Commission Status - Lock System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-500" />
              Tình Trạng Hoa Hồng
            </CardTitle>
            <CardDescription>
              Hoa hồng được chốt sau 15 ngày và thanh toán tự động vào ngày 5 hàng tháng
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
                  Đang trong thời gian chờ xác nhận (15 ngày)
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
                  Sẽ được thanh toán vào ngày 5 tháng sau
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
                      <span><strong>Chờ chốt:</strong> Hoa hồng từ đơn hàng mới sẽ được chờ xác nhận trong 15 ngày</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                      <span><strong>Đã chốt:</strong> Sau 15 ngày, hoa hồng được chốt và EXP được cộng vào tài khoản</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                      <span><strong>Thanh toán:</strong> Vào ngày 5 hàng tháng, hoa hồng đã chốt sẽ được chuyển vào tài khoản ngân hàng của bạn</span>
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

        {/* Payment History - v16: Renamed from Withdrawal History */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch Sử Thanh Toán</CardTitle>
            <CardDescription>Theo dõi các khoản thanh toán hoa hồng từ hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Chưa có lịch sử thanh toán</p>
                <p className="text-sm mt-1">Hoa hồng đã chốt sẽ được thanh toán vào ngày 5 hàng tháng</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày Thanh Toán</TableHead>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WithdrawalPage;
