import { useState } from 'react';
import {
  Wallet,
  Clock,
  CheckCircle2,
  TrendingUp,
  Download,
  Eye,
  Check,
  X,
  Filter,
  Search,
  AlertCircle,
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';

// Mock withdrawal data generator
const generateMockWithdrawals = () => {
  const statuses = ['pending', 'processing', 'completed', 'rejected'];
  const f0Partners = [
    'Nguyễn Văn A',
    'Trần Thị B',
    'Lê Văn C',
    'Phạm Thị D',
    'Hoàng Văn E',
    'Vũ Thị F',
    'Đặng Văn G',
    'Bùi Thị H',
    'Đỗ Văn I',
    'Ngô Thị K',
  ];
  const banks = ['Vietcombank', 'Techcombank', 'BIDV', 'VPBank', 'MB Bank'];

  const withdrawals = [];
  for (let i = 1; i <= 80; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const requestDate = new Date(2025, 10, Math.floor(Math.random() * 17) + 1);
    const processedDate =
      status === 'completed' || status === 'rejected'
        ? new Date(requestDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000)
        : null;

    withdrawals.push({
      id: `WD-${String(i).padStart(5, '0')}`,
      f0Partner: f0Partners[Math.floor(Math.random() * f0Partners.length)],
      amount: Math.floor(Math.random() * 10000000) + 500000,
      bankName: banks[Math.floor(Math.random() * banks.length)],
      bankAccount: `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      accountHolder: f0Partners[Math.floor(Math.random() * f0Partners.length)],
      status,
      requestDate: requestDate.toISOString().split('T')[0],
      processedDate: processedDate
        ? processedDate.toISOString().split('T')[0]
        : null,
      rejectionReason:
        status === 'rejected'
          ? 'Thông tin tài khoản không hợp lệ'
          : null,
    });
  }
  return withdrawals.sort((a, b) =>
    b.requestDate.localeCompare(a.requestDate)
  );
};

const WithdrawalsPage = () => {
  const [withdrawals] = useState(generateMockWithdrawals());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [selectedWithdrawals, setSelectedWithdrawals] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const itemsPerPage = 15;

  // Format currency
  const formatCurrency = (amount: number) => {
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

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Chờ xử lý</Badge>;
      case 'processing':
        return <Badge variant="info">Đang xử lý</Badge>;
      case 'completed':
        return <Badge variant="success">Hoàn thành</Badge>;
      case 'rejected':
        return <Badge variant="danger">Từ chối</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Calculate statistics
  const stats = {
    totalRequests: withdrawals.length,
    pending: withdrawals.filter((w) => w.status === 'pending').length,
    processing: withdrawals.filter((w) => w.status === 'processing').length,
    completedThisMonth: withdrawals.filter(
      (w) =>
        w.status === 'completed' &&
        w.processedDate &&
        w.processedDate.startsWith('2025-11')
    ).length,
  };

  // Filter withdrawals
  const filteredWithdrawals = withdrawals.filter((withdrawal) => {
    const matchesSearch =
      withdrawal.f0Partner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.bankAccount.includes(searchTerm);
    const matchesStatus =
      statusFilter === 'all' || withdrawal.status === statusFilter;
    const matchesMinAmount =
      !minAmount || withdrawal.amount >= parseFloat(minAmount);
    const matchesMaxAmount =
      !maxAmount || withdrawal.amount <= parseFloat(maxAmount);
    return (
      matchesSearch && matchesStatus && matchesMinAmount && matchesMaxAmount
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredWithdrawals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWithdrawals = filteredWithdrawals.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedWithdrawals(
        paginatedWithdrawals
          .filter((w) => w.status === 'pending' || w.status === 'processing')
          .map((w) => w.id)
      );
    } else {
      setSelectedWithdrawals([]);
    }
  };

  // Handle select one
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedWithdrawals([...selectedWithdrawals, id]);
    } else {
      setSelectedWithdrawals(selectedWithdrawals.filter((wid) => wid !== id));
    }
  };

  // Handle approve
  const handleApprove = (withdrawal: any) => {
    setSelectedWithdrawal(withdrawal);
    setShowApproveDialog(true);
  };

  const confirmApprove = () => {
    alert(`Đã phê duyệt yêu cầu rút tiền ${selectedWithdrawal.id}`);
    setShowApproveDialog(false);
    setSelectedWithdrawal(null);
  };

  // Handle reject
  const handleReject = (withdrawal: any) => {
    setSelectedWithdrawal(withdrawal);
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    alert(
      `Đã từ chối yêu cầu rút tiền ${selectedWithdrawal.id}. Lý do: ${rejectionReason}`
    );
    setShowRejectDialog(false);
    setSelectedWithdrawal(null);
    setRejectionReason('');
  };

  // Handle mark as completed
  const handleMarkCompleted = (id: string) => {
    alert(`Đánh dấu yêu cầu ${id} hoàn thành`);
  };

  // Handle view details
  const handleViewDetails = (withdrawal: any) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetailsDialog(true);
  };

  // Handle bulk approve
  const handleBulkApprove = () => {
    if (selectedWithdrawals.length === 0) {
      alert('Vui lòng chọn ít nhất một yêu cầu');
      return;
    }
    if (
      confirm(`Phê duyệt ${selectedWithdrawals.length} yêu cầu rút tiền đã chọn?`)
    ) {
      alert(`Đã phê duyệt ${selectedWithdrawals.length} yêu cầu`);
      setSelectedWithdrawals([]);
    }
  };

  // Handle bulk reject
  const handleBulkReject = () => {
    if (selectedWithdrawals.length === 0) {
      alert('Vui lòng chọn ít nhất một yêu cầu');
      return;
    }
    const reason = prompt('Nhập lý do từ chối:');
    if (reason) {
      alert(`Đã từ chối ${selectedWithdrawals.length} yêu cầu. Lý do: ${reason}`);
      setSelectedWithdrawals([]);
    }
  };

  // Handle export
  const handleExport = () => {
    alert('Xuất dữ liệu yêu cầu rút tiền');
  };

  const statsCards = [
    {
      title: 'Tổng yêu cầu',
      value: stats.totalRequests,
      icon: Wallet,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Chờ xử lý',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Đang xử lý',
      value: stats.processing,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Hoàn thành tháng này',
      value: stats.completedThisMonth,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Quản Lý Yêu Cầu Rút Tiền
            </h1>
            <p className="text-gray-600 mt-1">
              Xử lý yêu cầu rút tiền từ đối tác F0
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Xuất dữ liệu
            </Button>
            <Button
              onClick={handleBulkApprove}
              disabled={selectedWithdrawals.length === 0}
            >
              <Check className="w-4 h-4 mr-2" />
              Phê duyệt đã chọn ({selectedWithdrawals.length})
            </Button>
            <Button
              variant="outline"
              onClick={handleBulkReject}
              disabled={selectedWithdrawals.length === 0}
            >
              <X className="w-4 h-4 mr-2" />
              Từ chối đã chọn
            </Button>
          </div>
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
                  <div className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm F0, ID, STK..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xử lý</option>
                <option value="processing">Đang xử lý</option>
                <option value="completed">Hoàn thành</option>
                <option value="rejected">Từ chối</option>
              </Select>
              <Input
                type="number"
                placeholder="Số tiền tối thiểu"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Số tiền tối đa"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Withdrawals Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Danh sách yêu cầu rút tiền ({filteredWithdrawals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedWithdrawals.length > 0 &&
                          selectedWithdrawals.length ===
                            paginatedWithdrawals.filter(
                              (w) =>
                                w.status === 'pending' ||
                                w.status === 'processing'
                            ).length
                        }
                        onChange={(e) =>
                          handleSelectAll(
                            (e.target as HTMLInputElement).checked
                          )
                        }
                      />
                    </TableHead>
                    <TableHead>ID Yêu cầu</TableHead>
                    <TableHead>Đối tác F0</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Thông tin ngân hàng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày yêu cầu</TableHead>
                    <TableHead>Ngày xử lý</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedWithdrawals.includes(withdrawal.id)}
                          onChange={(e) =>
                            handleSelectOne(
                              withdrawal.id,
                              (e.target as HTMLInputElement).checked
                            )
                          }
                          disabled={
                            withdrawal.status !== 'pending' &&
                            withdrawal.status !== 'processing'
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {withdrawal.id}
                      </TableCell>
                      <TableCell>{withdrawal.f0Partner}</TableCell>
                      <TableCell className="font-semibold text-primary-600">
                        {formatCurrency(withdrawal.amount)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{withdrawal.bankName}</div>
                          <div className="text-xs text-gray-500">
                            {withdrawal.bankAccount}
                          </div>
                          <div className="text-xs text-gray-500">
                            {withdrawal.accountHolder}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(withdrawal.requestDate)}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(withdrawal.processedDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {withdrawal.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(withdrawal)}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(withdrawal)}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Từ chối
                              </Button>
                            </>
                          )}
                          {withdrawal.status === 'processing' && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkCompleted(withdrawal.id)}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Hoàn thành
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(withdrawal)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Xem
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Hiển thị {startIndex + 1} -{' '}
                {Math.min(startIndex + itemsPerPage, filteredWithdrawals.length)}{' '}
                trong tổng số {filteredWithdrawals.length} yêu cầu
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Trước
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent
            onClose={() => setShowDetailsDialog(false)}
            className="max-w-lg"
          >
            <DialogHeader>
              <DialogTitle>Chi tiết yêu cầu rút tiền</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết về yêu cầu rút tiền này
              </DialogDescription>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    ID Yêu cầu
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedWithdrawal.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Đối tác F0
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedWithdrawal.f0Partner}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Số tiền rút
                  </label>
                  <p className="text-lg font-semibold text-primary-600 mt-1">
                    {formatCurrency(selectedWithdrawal.amount)}
                  </p>
                </div>
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Thông tin ngân hàng
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-600">Ngân hàng</label>
                      <p className="text-sm text-gray-900">
                        {selectedWithdrawal.bankName}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">
                        Số tài khoản
                      </label>
                      <p className="text-sm text-gray-900 font-mono">
                        {selectedWithdrawal.bankAccount}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">
                        Tên chủ tài khoản
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedWithdrawal.accountHolder}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Trạng thái
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(selectedWithdrawal.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Ngày yêu cầu
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatDate(selectedWithdrawal.requestDate)}
                  </p>
                </div>
                {selectedWithdrawal.processedDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Ngày xử lý
                    </label>
                    <p className="text-sm text-gray-900 mt-1">
                      {formatDate(selectedWithdrawal.processedDate)}
                    </p>
                  </div>
                )}
                {selectedWithdrawal.rejectionReason && (
                  <Alert variant="danger">
                    <AlertCircle className="h-4 w-4" />
                    <div className="ml-2">
                      <h4 className="text-sm font-semibold">Lý do từ chối</h4>
                      <p className="text-sm mt-1">
                        {selectedWithdrawal.rejectionReason}
                      </p>
                    </div>
                  </Alert>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDetailsDialog(false)}
              >
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent onClose={() => setShowApproveDialog(false)}>
            <DialogHeader>
              <DialogTitle>Xác nhận phê duyệt</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn phê duyệt yêu cầu rút tiền này?
              </DialogDescription>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4">
                <Alert variant="info">
                  <AlertCircle className="h-4 w-4" />
                  <div className="ml-2">
                    <p className="text-sm">
                      Sau khi phê duyệt, yêu cầu sẽ chuyển sang trạng thái "Đang
                      xử lý" và bạn cần tiến hành chuyển khoản cho đối tác.
                    </p>
                  </div>
                </Alert>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Đối tác F0:</span>
                    <span className="text-sm font-medium">
                      {selectedWithdrawal.f0Partner}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Số tiền:</span>
                    <span className="text-sm font-semibold text-primary-600">
                      {formatCurrency(selectedWithdrawal.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Ngân hàng:</span>
                    <span className="text-sm font-medium">
                      {selectedWithdrawal.bankName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">STK:</span>
                    <span className="text-sm font-mono">
                      {selectedWithdrawal.bankAccount}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowApproveDialog(false)}
              >
                Hủy
              </Button>
              <Button onClick={confirmApprove}>
                <Check className="w-4 h-4 mr-2" />
                Phê duyệt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent onClose={() => setShowRejectDialog(false)}>
            <DialogHeader>
              <DialogTitle>Xác nhận từ chối</DialogTitle>
              <DialogDescription>
                Vui lòng nhập lý do từ chối yêu cầu rút tiền này
              </DialogDescription>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Đối tác F0:</span>
                    <span className="text-sm font-medium">
                      {selectedWithdrawal.f0Partner}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Số tiền:</span>
                    <span className="text-sm font-semibold text-primary-600">
                      {formatCurrency(selectedWithdrawal.amount)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Lý do từ chối *
                  </label>
                  <textarea
                    className="w-full min-h-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nhập lý do từ chối yêu cầu rút tiền..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
              >
                Hủy
              </Button>
              <Button
                variant="outline"
                onClick={confirmReject}
                disabled={!rejectionReason.trim()}
              >
                <X className="w-4 h-4 mr-2" />
                Từ chối
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default WithdrawalsPage;
