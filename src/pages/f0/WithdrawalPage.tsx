import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  DollarSign,
  TrendingDown,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  X,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<WithdrawalData | null>(null);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');

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

  // Fetch withdrawal data
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
      const response = await fetch(
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
      );

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Không thể tải dữ liệu');
        return;
      }

      setData(result.data);
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

  // Handle submit withdrawal request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!data) return;

    const f0User = getF0User();
    if (!f0User?.id) {
      navigate('/f0/auth/login');
      return;
    }

    // Validate
    const amountNum = parseInt(amount);
    if (!amount || isNaN(amountNum)) {
      setAmountError('Vui lòng nhập số tiền');
      return;
    }

    if (amountNum < data.minWithdrawalAmount) {
      setAmountError(`Số tiền rút tối thiểu là ${formatCurrency(data.minWithdrawalAmount)}`);
      return;
    }

    if (amountNum > data.balance.availableBalance) {
      setAmountError('Số dư không đủ');
      return;
    }

    setAmountError('');
    setSubmitting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-withdrawal-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'create',
            f0_id: f0User.id,
            amount: amountNum,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Không thể tạo yêu cầu rút tiền');
        return;
      }

      toast.success('Yêu cầu rút tiền đã được tạo thành công!');
      setAmount('');
      fetchWithdrawalData(true);
    } catch (err) {
      console.error('Create withdrawal error:', err);
      toast.error('Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel withdrawal
  const handleCancelWithdrawal = async (requestId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy yêu cầu rút tiền này?')) {
      return;
    }

    const f0User = getF0User();
    if (!f0User?.id) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-withdrawal-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'cancel',
            f0_id: f0User.id,
            request_id: requestId,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Không thể hủy yêu cầu');
        return;
      }

      toast.success('Đã hủy yêu cầu rút tiền');
      fetchWithdrawalData(true);
    } catch (err) {
      console.error('Cancel withdrawal error:', err);
      toast.error('Có lỗi xảy ra');
    }
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

  const { balance, bankInfo, withdrawals, minWithdrawalAmount } = data;

  // Balance cards data
  const balanceCards = [
    {
      title: 'Số Dư Khả Dụng',
      value: formatCurrency(balance.availableBalance),
      icon: Wallet,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Đang Chờ Rút',
      value: formatCurrency(balance.pendingWithdrawals),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Đã Rút',
      value: formatCurrency(balance.completedWithdrawals),
      icon: TrendingDown,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  // Check if bank is verified
  const canWithdraw = bankInfo.verified && balance.availableBalance >= minWithdrawalAmount;
  const hasPendingRequest = withdrawals.some(w => w.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Rút Tiền</h1>
            <p className="text-gray-600 mt-1">
              Quản lý số dư và yêu cầu rút tiền hoa hồng
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

        {/* Create Withdrawal Request */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-500" />
              Tạo Yêu Cầu Rút Tiền
            </CardTitle>
            <CardDescription>
              Số tiền sẽ được chuyển vào tài khoản ngân hàng đã xác minh
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Bank Info Display */}
            {bankInfo.verified && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
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
            )}

            {/* Warning Alert */}
            <Alert variant="info" className="mb-6">
              <AlertTitle>Lưu ý</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                  <li>Số tiền rút tối thiểu: {formatCurrency(minWithdrawalAmount)}</li>
                  <li>Thời gian xử lý: 1-3 ngày làm việc</li>
                  <li>Bạn chỉ có thể tạo 1 yêu cầu rút tiền tại một thời điểm</li>
                </ul>
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="max-w-md">
                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Số tiền rút <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Nhập số tiền"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setAmountError('');
                    }}
                    className={amountError ? 'border-red-500' : ''}
                    disabled={!canWithdraw || hasPendingRequest}
                  />
                  {amountError && (
                    <p className="text-sm text-red-500">{amountError}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Số dư khả dụng: {formatCurrency(balance.availableBalance)} | Tối thiểu: {formatCurrency(minWithdrawalAmount)}
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-4">
                <Button
                  type="submit"
                  disabled={!canWithdraw || submitting || hasPendingRequest}
                  className="min-w-[200px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Gửi Yêu Cầu Rút Tiền'
                  )}
                </Button>
                {hasPendingRequest && (
                  <p className="text-sm text-amber-600">
                    Bạn đang có yêu cầu chờ xử lý. Vui lòng đợi yêu cầu hoàn tất.
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch Sử Rút Tiền</CardTitle>
            <CardDescription>Theo dõi trạng thái các yêu cầu rút tiền</CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Chưa có lịch sử rút tiền</p>
                <p className="text-sm mt-1">Tạo yêu cầu rút tiền đầu tiên của bạn</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày Tạo</TableHead>
                      <TableHead className="text-right">Số Tiền</TableHead>
                      <TableHead>Thông Tin Ngân Hàng</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                      <TableHead className="text-center">Thao Tác</TableHead>
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
                          <TableCell className="text-center">
                            {withdrawal.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelWithdrawal(withdrawal.id)}
                                className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="w-3 h-3" />
                                Hủy
                              </Button>
                            )}
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
