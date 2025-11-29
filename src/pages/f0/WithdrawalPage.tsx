import { useState } from 'react';
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
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MIN_WITHDRAWAL_AMOUNT } from '@/lib/constants';

// Mock data for withdrawal history
const mockWithdrawalHistory = [
  {
    id: 'WD001',
    date: '2025-11-15',
    amount: 5000000,
    bankName: 'Vietcombank',
    accountNumber: '1234567890',
    accountHolder: 'NGUYEN VAN A',
    status: 'completed',
    note: 'Rút tiền định kỳ',
  },
  {
    id: 'WD002',
    date: '2025-11-10',
    amount: 3000000,
    bankName: 'Techcombank',
    accountNumber: '0987654321',
    accountHolder: 'NGUYEN VAN A',
    status: 'processing',
    note: '',
  },
  {
    id: 'WD003',
    date: '2025-11-05',
    amount: 2500000,
    bankName: 'Vietcombank',
    accountNumber: '1234567890',
    accountHolder: 'NGUYEN VAN A',
    status: 'completed',
    note: '',
  },
  {
    id: 'WD004',
    date: '2025-11-01',
    amount: 1000000,
    bankName: 'BIDV',
    accountNumber: '5555666677',
    accountHolder: 'NGUYEN VAN A',
    status: 'pending',
    note: 'Yêu cầu khẩn cấp',
  },
  {
    id: 'WD005',
    date: '2025-10-25',
    amount: 500000,
    bankName: 'VietinBank',
    accountNumber: '8888999900',
    accountHolder: 'NGUYEN VAN A',
    status: 'rejected',
    note: 'Số dư không đủ',
  },
];

// Mock balance data
const mockBalanceData = {
  availableBalance: 8300000, // 8,300,000 VND
  pendingWithdrawals: 4000000, // 4,000,000 VND
  totalWithdrawn: 11500000, // 11,500,000 VND
};

const WithdrawalPage = () => {
  const [loading, setLoading] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    note: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.amount) {
      errors.amount = 'Vui lòng nhập số tiền';
    } else if (parseFloat(formData.amount) < MIN_WITHDRAWAL_AMOUNT) {
      errors.amount = `Số tiền rút tối thiểu là ${formatCurrency(MIN_WITHDRAWAL_AMOUNT)}`;
    } else if (parseFloat(formData.amount) > mockBalanceData.availableBalance) {
      errors.amount = 'Số dư không đủ';
    }

    if (!formData.bankName) {
      errors.bankName = 'Vui lòng chọn ngân hàng';
    }

    if (!formData.accountNumber) {
      errors.accountNumber = 'Vui lòng nhập số tài khoản';
    } else if (!/^\d+$/.test(formData.accountNumber)) {
      errors.accountNumber = 'Số tài khoản không hợp lệ';
    }

    if (!formData.accountHolder) {
      errors.accountHolder = 'Vui lòng nhập tên chủ tài khoản';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setShowSuccessAlert(true);
      setFormData({
        amount: '',
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        note: '',
      });
      setFormErrors({});

      // Hide success alert after 5 seconds
      setTimeout(() => setShowSuccessAlert(false), 5000);
    }, 1500);
  };

  // Handle view details
  const handleViewDetails = (id: string) => {
    toast.info(`Xem chi tiết yêu cầu rút tiền ${id} - Tính năng đang phát triển`);
  };

  // Handle cancel withdrawal
  const handleCancelWithdrawal = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn hủy yêu cầu rút tiền này?')) {
      toast.success(`Đã hủy yêu cầu rút tiền ${id}`);
    }
  };

  // Balance cards data
  const balanceCards = [
    {
      title: 'Số Dư Khả Dụng',
      value: formatCurrency(mockBalanceData.availableBalance),
      icon: Wallet,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Đang Chờ Rút',
      value: formatCurrency(mockBalanceData.pendingWithdrawals),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Đã Rút',
      value: formatCurrency(mockBalanceData.totalWithdrawn),
      icon: TrendingDown,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Rút Tiền</h1>
          <p className="text-gray-600 mt-1">
            Quản lý số dư và yêu cầu rút tiền hoa hồng
          </p>
        </div>

        {/* Success Alert */}
        {showSuccessAlert && (
          <Alert variant="success">
            <AlertTitle>Yêu cầu rút tiền thành công!</AlertTitle>
            <AlertDescription>
              Yêu cầu của bạn đang được xử lý. Vui lòng kiểm tra lại sau 3-5 ngày làm
              việc.
            </AlertDescription>
          </Alert>
        )}

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

        {/* Create Withdrawal Request */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-500" />
              Tạo Yêu Cầu Rút Tiền
            </CardTitle>
            <CardDescription>
              Điền thông tin để tạo yêu cầu rút tiền về tài khoản ngân hàng
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Warning Alert */}
            <Alert variant="warning" className="mb-6">
              <AlertTitle className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Lưu ý
              </AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                  <li>Số tiền rút tối thiểu: {formatCurrency(MIN_WITHDRAWAL_AMOUNT)}</li>
                  <li>Thời gian xử lý: 3-5 ngày làm việc</li>
                  <li>Kiểm tra kỹ thông tin tài khoản trước khi gửi yêu cầu</li>
                </ul>
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Số tiền rút <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Nhập số tiền"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className={formErrors.amount ? 'border-red-500' : ''}
                  />
                  {formErrors.amount && (
                    <p className="text-sm text-red-500">{formErrors.amount}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Tối thiểu: {formatCurrency(MIN_WITHDRAWAL_AMOUNT)}
                  </p>
                </div>

                {/* Bank Name */}
                <div className="space-y-2">
                  <Label htmlFor="bankName">
                    Ngân hàng <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) =>
                      setFormData({ ...formData, bankName: e.target.value })
                    }
                    className={formErrors.bankName ? 'border-red-500' : ''}
                  >
                    <option value="">Chọn ngân hàng</option>
                    <option value="Vietcombank">Vietcombank</option>
                    <option value="Techcombank">Techcombank</option>
                    <option value="BIDV">BIDV</option>
                    <option value="VietinBank">VietinBank</option>
                    <option value="ACB">ACB</option>
                    <option value="MB Bank">MB Bank</option>
                    <option value="Sacombank">Sacombank</option>
                    <option value="VPBank">VPBank</option>
                  </Select>
                  {formErrors.bankName && (
                    <p className="text-sm text-red-500">{formErrors.bankName}</p>
                  )}
                </div>

                {/* Account Number */}
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">
                    Số tài khoản <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    placeholder="Nhập số tài khoản"
                    value={formData.accountNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, accountNumber: e.target.value })
                    }
                    className={formErrors.accountNumber ? 'border-red-500' : ''}
                  />
                  {formErrors.accountNumber && (
                    <p className="text-sm text-red-500">{formErrors.accountNumber}</p>
                  )}
                </div>

                {/* Account Holder */}
                <div className="space-y-2">
                  <Label htmlFor="accountHolder">
                    Tên chủ tài khoản <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="accountHolder"
                    type="text"
                    placeholder="NGUYEN VAN A"
                    value={formData.accountHolder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accountHolder: e.target.value.toUpperCase(),
                      })
                    }
                    className={formErrors.accountHolder ? 'border-red-500' : ''}
                  />
                  {formErrors.accountHolder && (
                    <p className="text-sm text-red-500">{formErrors.accountHolder}</p>
                  )}
                  <p className="text-xs text-gray-500">Viết hoa không dấu</p>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label htmlFor="note">Ghi chú (tùy chọn)</Label>
                <Textarea
                  id="note"
                  placeholder="Nhập ghi chú nếu có..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={loading} className="min-w-[200px]">
                  {loading ? 'Đang xử lý...' : 'Gửi Yêu Cầu Rút Tiền'}
                </Button>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã Yêu Cầu</TableHead>
                    <TableHead>Ngày Tạo</TableHead>
                    <TableHead className="text-right">Số Tiền</TableHead>
                    <TableHead>Thông Tin Ngân Hàng</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead className="text-center">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockWithdrawalHistory.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-gray-500"
                      >
                        Chưa có lịch sử rút tiền
                      </TableCell>
                    </TableRow>
                  ) : (
                    mockWithdrawalHistory.map((withdrawal) => {
                      const StatusIcon = getStatusIcon(withdrawal.status);
                      return (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="font-medium">
                            {withdrawal.id}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {formatDate(withdrawal.date)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary-600">
                            {formatCurrency(withdrawal.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{withdrawal.bankName}</div>
                              <div className="text-gray-600">
                                {withdrawal.accountNumber}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {withdrawal.accountHolder}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusVariant(withdrawal.status)}
                              className="flex items-center gap-1 w-fit"
                            >
                              <StatusIcon className="w-3 h-3" />
                              {getStatusLabel(withdrawal.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetails(withdrawal.id)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                Xem
                              </Button>
                              {withdrawal.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleCancelWithdrawal(withdrawal.id)
                                  }
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="w-3 h-3" />
                                  Hủy
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WithdrawalPage;
