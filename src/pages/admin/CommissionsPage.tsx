import { useState } from 'react';
import {
  DollarSign,
  Clock,
  TrendingUp,
  Users,
  Download,
  Eye,
  Edit,
  CheckCircle,
  Filter,
  Search,
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

// Mock commission data generator
const generateMockCommissions = () => {
  const types = ['first_order', 'lifetime'];
  const statuses = ['paid', 'pending', 'processing'];
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
  const customers = [
    'Khách hàng A',
    'Khách hàng B',
    'Khách hàng C',
    'Khách hàng D',
    'Khách hàng E',
  ];

  const commissions = [];
  for (let i = 1; i <= 250; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const date = new Date(2025, 10, Math.floor(Math.random() * 17) + 1);

    commissions.push({
      id: `COM-${String(i).padStart(5, '0')}`,
      f0Partner: f0Partners[Math.floor(Math.random() * f0Partners.length)],
      customer: customers[Math.floor(Math.random() * customers.length)],
      orderId: `ORD-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
      type,
      amount: Math.floor(Math.random() * 1000000) + 100000,
      status,
      date: date.toISOString().split('T')[0],
      tier: ['silver', 'gold', 'diamond'][Math.floor(Math.random() * 3)],
    });
  }
  return commissions.sort((a, b) => b.date.localeCompare(a.date));
};

const CommissionsPage = () => {
  const [commissions] = useState(generateMockCommissions());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<any>(null);
  const itemsPerPage = 20;

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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Đã thanh toán</Badge>;
      case 'pending':
        return <Badge variant="warning">Chờ thanh toán</Badge>;
      case 'processing':
        return <Badge variant="info">Đang xử lý</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    if (type === 'first_order') {
      return (
        <Badge className="bg-blue-100 text-blue-800">Đơn hàng đầu tiên</Badge>
      );
    }
    return (
      <Badge className="bg-purple-100 text-purple-800">Hoa hồng trọn đời</Badge>
    );
  };

  // Calculate statistics
  const stats = {
    totalPaid: commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0),
    pendingPayment: commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.amount, 0),
    thisMonth: commissions
      .filter((c) => c.date.startsWith('2025-11'))
      .reduce((sum, c) => sum + c.amount, 0),
    averagePerF0:
      commissions.reduce((sum, c) => sum + c.amount, 0) /
      new Set(commissions.map((c) => c.f0Partner)).size,
  };

  // Filter commissions
  const filteredCommissions = commissions.filter((commission) => {
    const matchesSearch =
      commission.f0Partner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || commission.status === statusFilter;
    const matchesType = typeFilter === 'all' || commission.type === typeFilter;
    const matchesTier = tierFilter === 'all' || commission.tier === tierFilter;
    return matchesSearch && matchesStatus && matchesType && matchesTier;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCommissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCommissions = filteredCommissions.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCommissions(paginatedCommissions.map((c) => c.id));
    } else {
      setSelectedCommissions([]);
    }
  };

  // Handle select one
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCommissions([...selectedCommissions, id]);
    } else {
      setSelectedCommissions(selectedCommissions.filter((cid) => cid !== id));
    }
  };

  // Handle mark as paid
  const handleMarkAsPaid = (id: string) => {
    alert(`Đánh dấu hoa hồng ${id} đã thanh toán`);
  };

  // Handle view details
  const handleViewDetails = (commission: any) => {
    setSelectedCommission(commission);
    setShowDetailsDialog(true);
  };

  // Handle pay selected
  const handlePaySelected = () => {
    if (selectedCommissions.length === 0) {
      alert('Vui lòng chọn ít nhất một hoa hồng');
      return;
    }
    alert(`Thanh toán ${selectedCommissions.length} hoa hồng đã chọn`);
  };

  // Handle export
  const handleExport = () => {
    alert('Xuất dữ liệu hoa hồng');
  };

  const statsCards = [
    {
      title: 'Tổng đã thanh toán',
      value: formatCurrency(stats.totalPaid),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Chờ thanh toán',
      value: formatCurrency(stats.pendingPayment),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Tháng này',
      value: formatCurrency(stats.thisMonth),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Trung bình/F0',
      value: formatCurrency(stats.averagePerF0),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Quản Lý Hoa Hồng
            </h1>
            <p className="text-gray-600 mt-1">
              Theo dõi và quản lý hoa hồng cho đối tác F0
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Xuất dữ liệu
            </Button>
            <Button
              onClick={handlePaySelected}
              disabled={selectedCommissions.length === 0}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Thanh toán đã chọn ({selectedCommissions.length})
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm F0, ID..."
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
                <option value="paid">Đã thanh toán</option>
                <option value="pending">Chờ thanh toán</option>
                <option value="processing">Đang xử lý</option>
              </Select>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">Tất cả loại</option>
                <option value="first_order">Đơn hàng đầu tiên</option>
                <option value="lifetime">Hoa hồng trọn đời</option>
              </Select>
              <Select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
              >
                <option value="all">Tất cả hạng</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="diamond">Diamond</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Commissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Danh sách hoa hồng ({filteredCommissions.length})
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
                          selectedCommissions.length ===
                            paginatedCommissions.length &&
                          paginatedCommissions.length > 0
                        }
                        onChange={(e) =>
                          handleSelectAll(
                            (e.target as HTMLInputElement).checked
                          )
                        }
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Đối tác F0</TableHead>
                    <TableHead>Khách hàng/Đơn hàng</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCommissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCommissions.includes(commission.id)}
                          onChange={(e) =>
                            handleSelectOne(
                              commission.id,
                              (e.target as HTMLInputElement).checked
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {commission.id}
                      </TableCell>
                      <TableCell>{commission.f0Partner}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {commission.customer}
                          </div>
                          <div className="text-xs text-gray-500">
                            {commission.orderId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(commission.type)}</TableCell>
                      <TableCell className="font-semibold text-primary-600">
                        {formatCurrency(commission.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(commission.status)}</TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(commission.date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {commission.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsPaid(commission.id)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Đánh dấu đã trả
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(commission)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Xem
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-3 h-3 mr-1" />
                            Sửa
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
                {Math.min(startIndex + itemsPerPage, filteredCommissions.length)}{' '}
                trong tổng số {filteredCommissions.length} hoa hồng
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
          <DialogContent onClose={() => setShowDetailsDialog(false)}>
            <DialogHeader>
              <DialogTitle>Chi tiết hoa hồng</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết về hoa hồng này
              </DialogDescription>
            </DialogHeader>
            {selectedCommission && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    ID Hoa hồng
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedCommission.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Đối tác F0
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedCommission.f0Partner}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Khách hàng
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedCommission.customer}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Đơn hàng
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedCommission.orderId}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Loại
                  </label>
                  <div className="mt-1">{getTypeBadge(selectedCommission.type)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Số tiền
                  </label>
                  <p className="text-lg font-semibold text-primary-600 mt-1">
                    {formatCurrency(selectedCommission.amount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Trạng thái
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(selectedCommission.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Ngày</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatDate(selectedCommission.date)}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CommissionsPage;
