import { useState, useMemo } from 'react';
import {
  Ticket,
  Plus,
  FileDown,
  Search,
  Eye,
  Ban,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Phone,
  ChevronLeft,
  ChevronRight,
  QrCode,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { VOUCHER_VALUE, VOUCHER_EXPIRY_DAYS } from '@/lib/constants';

// Types
type VoucherStatus = 'active' | 'used' | 'expired';

interface Voucher {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  f0Partner: string;
  value: number;
  status: VoucherStatus;
  issueDate: string;
  expiryDate: string;
  usedDate?: string;
}

// Mock Data - 100+ vouchers
const generateMockVouchers = (): Voucher[] => {
  const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi'];
  const middleNames = ['Văn', 'Thị', 'Minh', 'Thu', 'Hồng', 'Đức', 'Anh', 'Quang', 'Hữu', 'Thành'];
  const lastNames = ['An', 'Bình', 'Cường', 'Dũng', 'Hiền', 'Khánh', 'Linh', 'Mai', 'Nam', 'Phương', 'Quân', 'Sang', 'Tâm', 'Uyên', 'Vinh'];
  const f0Partners = [
    'Nguyễn Văn A',
    'Trần Thị B',
    'Lê Văn C',
    'Phạm Thị D',
    'Hoàng Văn E',
    'Phan Thị F',
    'Vũ Văn G',
    'Võ Thị H',
    'Đặng Văn I',
    'Bùi Thị K',
  ];

  const vouchers: Voucher[] = [];
  for (let i = 1; i <= 120; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const customerName = `${firstName} ${middleName} ${lastName}`;
    const customerPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const f0Partner = f0Partners[Math.floor(Math.random() * f0Partners.length)];

    // Generate issue date (random date within last 90 days)
    const issueDate = new Date();
    issueDate.setDate(issueDate.getDate() - Math.floor(Math.random() * 90));

    // Generate expiry date (30 days from issue date)
    const expiryDate = new Date(issueDate);
    expiryDate.setDate(expiryDate.getDate() + VOUCHER_EXPIRY_DAYS);

    // Determine status
    let status: VoucherStatus;
    let usedDate: string | undefined;
    const now = new Date();

    const statusRand = Math.random();
    if (statusRand < 0.4) {
      // 40% used
      status = 'used';
      // Used date is random between issue date and expiry date
      const usedDateObj = new Date(issueDate);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
      usedDateObj.setDate(usedDateObj.getDate() + Math.floor(Math.random() * daysUntilExpiry));
      usedDate = usedDateObj.toISOString();
    } else if (expiryDate < now) {
      // Expired if expiry date has passed
      status = 'expired';
    } else {
      // Active
      status = 'active';
    }

    vouchers.push({
      id: `V${String(i).padStart(4, '0')}`,
      code: `VOUCHER-${String(i).padStart(4, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      customerName,
      customerPhone,
      f0Partner,
      value: VOUCHER_VALUE,
      status,
      issueDate: issueDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      usedDate,
    });
  }

  // Sort by issue date (newest first)
  return vouchers.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
};

const VouchersPage = () => {
  const [vouchers] = useState<Voucher[]>(generateMockVouchers());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VoucherStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const itemsPerPage = 20;

  // Create voucher form state
  const [newVoucher, setNewVoucher] = useState({
    customerName: '',
    customerPhone: '',
    f0Partner: '',
    expiryDays: VOUCHER_EXPIRY_DAYS,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: vouchers.length,
      active: vouchers.filter(v => v.status === 'active').length,
      used: vouchers.filter(v => v.status === 'used').length,
      expired: vouchers.filter(v => v.status === 'expired').length,
    };
  }, [vouchers]);

  // Filter vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(voucher => {
      const matchesSearch =
        searchQuery === '' ||
        voucher.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voucher.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voucher.customerPhone.includes(searchQuery);

      const matchesStatus = statusFilter === 'all' || voucher.status === statusFilter;

      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        const issueDate = new Date(voucher.issueDate);
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        matchesDate = issueDate >= fromDate && issueDate <= toDate;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [vouchers, searchQuery, statusFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage);
  const paginatedVouchers = filteredVouchers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique F0 partners
  const uniqueF0Partners = useMemo(() => {
    return Array.from(new Set(vouchers.map(v => v.f0Partner))).sort();
  }, [vouchers]);

  // Handlers
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateRange({ from: '', to: '' });
    setCurrentPage(1);
  };

  const handleExport = () => {
    alert('Xuất dữ liệu - Chức năng đang phát triển');
  };

  const handleCreateVoucher = () => {
    if (!newVoucher.customerName || !newVoucher.customerPhone || !newVoucher.f0Partner) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }
    alert(`Tạo voucher thành công cho khách hàng: ${newVoucher.customerName}`);
    setShowCreateModal(false);
    setNewVoucher({
      customerName: '',
      customerPhone: '',
      f0Partner: '',
      expiryDays: VOUCHER_EXPIRY_DAYS,
    });
  };

  const handleViewDetails = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setShowDetailsModal(true);
  };

  const handleDeactivate = (voucher: Voucher) => {
    if (confirm(`Bạn có chắc chắn muốn vô hiệu hóa voucher ${voucher.code}?`)) {
      alert(`Đã vô hiệu hóa voucher: ${voucher.code}`);
    }
  };

  const handleExtendExpiry = (voucher: Voucher) => {
    const days = prompt('Gia hạn thêm bao nhiêu ngày?', '30');
    if (days && !isNaN(parseInt(days))) {
      alert(`Đã gia hạn voucher ${voucher.code} thêm ${days} ngày`);
    }
  };

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

  // Get status badge class
  const getStatusBadgeClass = (status: VoucherStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'used':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: VoucherStatus) => {
    switch (status) {
      case 'active':
        return 'Hoạt động';
      case 'used':
        return 'Đã sử dụng';
      case 'expired':
        return 'Hết hạn';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: VoucherStatus) => {
    switch (status) {
      case 'active':
        return CheckCircle;
      case 'used':
        return CheckCircle;
      case 'expired':
        return XCircle;
      default:
        return Clock;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Quản Lý Voucher
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý và theo dõi các voucher khuyến mãi
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="w-4 h-4 mr-2" />
              Xuất dữ liệu
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tạo Voucher
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tổng Vouchers
              </CardTitle>
              <div className="bg-blue-50 p-2 rounded-lg">
                <Ticket className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">Tổng số voucher</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Đang Hoạt Động
              </CardTitle>
              <div className="bg-green-50 p-2 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
              <p className="text-xs text-gray-500 mt-1">Voucher còn hiệu lực</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Đã Sử Dụng
              </CardTitle>
              <div className="bg-blue-50 p-2 rounded-lg">
                <CheckCircle className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.used}</div>
              <p className="text-xs text-gray-500 mt-1">Voucher đã dùng</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Hết Hạn
              </CardTitle>
              <div className="bg-red-50 p-2 rounded-lg">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.expired}</div>
              <p className="text-xs text-gray-500 mt-1">Voucher hết hạn</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle>Bộ lọc</CardTitle>
            <CardDescription>
              Tìm kiếm và lọc danh sách vouchers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Tìm kiếm
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Mã voucher, tên khách hàng, SĐT..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Trạng thái
                </label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as VoucherStatus | 'all')}
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Hoạt động</option>
                  <option value="used">Đã sử dụng</option>
                  <option value="expired">Hết hạn</option>
                </Select>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Từ ngày
                </label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Đến ngày
                </label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div className="lg:col-span-2 flex items-end gap-2">
                <Button variant="outline" onClick={handleClearFilters} className="flex-1">
                  Xóa bộ lọc
                </Button>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Hiển thị <span className="font-semibold">{filteredVouchers.length}</span> kết quả
                {filteredVouchers.length !== vouchers.length && (
                  <span> từ tổng số <span className="font-semibold">{vouchers.length}</span> vouchers</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Vouchers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Vouchers</CardTitle>
            <CardDescription>
              Trang {currentPage} / {totalPages} - {filteredVouchers.length} vouchers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã Voucher</TableHead>
                    <TableHead>Khách Hàng</TableHead>
                    <TableHead>Số Điện Thoại</TableHead>
                    <TableHead>F0 Partner</TableHead>
                    <TableHead className="text-right">Giá Trị</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead>Ngày Phát Hành</TableHead>
                    <TableHead>Ngày Hết Hạn</TableHead>
                    <TableHead>Ngày Sử Dụng</TableHead>
                    <TableHead className="text-right">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVouchers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        Không tìm thấy vouchers nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVouchers.map((voucher) => (
                      <TableRow
                        key={voucher.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleViewDetails(voucher)}
                      >
                        <TableCell className="font-medium text-gray-900 font-mono text-sm">
                          {voucher.code}
                        </TableCell>
                        <TableCell className="font-medium">
                          {voucher.customerName}
                        </TableCell>
                        <TableCell className="text-gray-600">{voucher.customerPhone}</TableCell>
                        <TableCell>
                          <Badge variant="default">{voucher.f0Partner}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(voucher.value)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(voucher.status)}>
                            {getStatusLabel(voucher.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatDate(voucher.issueDate)}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatDate(voucher.expiryDate)}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {voucher.usedDate ? formatDate(voucher.usedDate) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(voucher);
                              }}
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {voucher.status === 'active' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeactivate(voucher);
                                  }}
                                  title="Vô hiệu hóa"
                                >
                                  <Ban className="w-4 h-4 text-red-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExtendExpiry(voucher);
                                  }}
                                  title="Gia hạn"
                                >
                                  <Clock className="w-4 h-4 text-blue-600" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredVouchers.length)} trong tổng số{' '}
                  {filteredVouchers.length} kết quả
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex gap-1">
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
                          key={i}
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
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Voucher Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md" onClose={() => setShowCreateModal(false)}>
          <DialogHeader>
            <DialogTitle>Tạo Voucher Mới</DialogTitle>
            <DialogDescription>
              Tạo voucher khuyến mãi cho khách hàng
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Customer Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tên khách hàng
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Nhập tên khách hàng"
                  value={newVoucher.customerName}
                  onChange={(e) => setNewVoucher({ ...newVoucher, customerName: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Customer Phone */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="tel"
                  placeholder="Nhập số điện thoại"
                  value={newVoucher.customerPhone}
                  onChange={(e) => setNewVoucher({ ...newVoucher, customerPhone: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* F0 Partner */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                F0 Partner
              </label>
              <Select
                value={newVoucher.f0Partner}
                onChange={(e) => setNewVoucher({ ...newVoucher, f0Partner: e.target.value })}
              >
                <option value="">Chọn F0 Partner</option>
                {uniqueF0Partners.map((partner) => (
                  <option key={partner} value={partner}>
                    {partner}
                  </option>
                ))}
              </Select>
            </div>

            {/* Expiry Days */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Thời hạn (ngày)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="Số ngày hiệu lực"
                  value={newVoucher.expiryDays}
                  onChange={(e) => setNewVoucher({ ...newVoucher, expiryDays: parseInt(e.target.value) || VOUCHER_EXPIRY_DAYS })}
                  className="pl-10"
                  min={1}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mặc định: {VOUCHER_EXPIRY_DAYS} ngày
              </p>
            </div>

            {/* Value Display */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-gray-600 mb-1">Giá trị voucher</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(VOUCHER_VALUE)}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateVoucher}>
              <Plus className="w-4 h-4 mr-2" />
              Tạo Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voucher Details Modal */}
      {selectedVoucher && (
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl" onClose={() => setShowDetailsModal(false)}>
            <DialogHeader>
              <DialogTitle>Chi Tiết Voucher</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết về voucher
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Voucher Code & Status */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">Mã Voucher</div>
                  <div className="text-2xl font-bold text-gray-900 font-mono mb-3">
                    {selectedVoucher.code}
                  </div>
                  <Badge className={`${getStatusBadgeClass(selectedVoucher.status)} text-base px-4 py-2`}>
                    {getStatusLabel(selectedVoucher.status)}
                  </Badge>
                </div>
              </div>

              {/* QR Code Placeholder */}
              <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300">
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <QrCode className="w-32 h-32 mb-4" />
                  <p className="text-sm">QR Code Placeholder</p>
                  <p className="text-xs mt-1">Mã: {selectedVoucher.code}</p>
                </div>
              </div>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thông tin khách hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Tên khách hàng</div>
                      <div className="font-medium text-gray-900">{selectedVoucher.customerName}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Số điện thoại</div>
                      <div className="font-medium text-gray-900">{selectedVoucher.customerPhone}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">F0 Partner</div>
                      <div className="font-medium text-gray-900">{selectedVoucher.f0Partner}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Voucher Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thông tin voucher</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Giá trị</div>
                      <div className="font-semibold text-green-600 text-lg">
                        {formatCurrency(selectedVoucher.value)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Trạng thái</div>
                      <Badge className={getStatusBadgeClass(selectedVoucher.status)}>
                        {getStatusLabel(selectedVoucher.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    <div>
                      <div className="text-sm text-gray-600">Ngày phát hành</div>
                      <div className="font-medium">{formatDate(selectedVoucher.issueDate)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Ngày hết hạn</div>
                      <div className="font-medium">{formatDate(selectedVoucher.expiryDate)}</div>
                    </div>
                  </div>
                  {selectedVoucher.usedDate && (
                    <div className="pt-3 border-t">
                      <div className="text-sm text-gray-600">Ngày sử dụng</div>
                      <div className="font-medium text-blue-600">{formatDate(selectedVoucher.usedDate)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Usage History */}
              {selectedVoucher.status === 'used' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Lịch sử sử dụng</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Đã sử dụng voucher</div>
                          <div className="text-sm text-gray-600">
                            {selectedVoucher.usedDate && formatDate(selectedVoucher.usedDate)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Đóng
              </Button>
              {selectedVoucher.status === 'active' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleExtendExpiry(selectedVoucher);
                      setShowDetailsModal(false);
                    }}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Gia hạn
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleDeactivate(selectedVoucher);
                      setShowDetailsModal(false);
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Vô hiệu hóa
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default VouchersPage;
