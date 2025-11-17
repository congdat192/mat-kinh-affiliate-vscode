import { useState } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Ban,
  ChevronLeft,
  ChevronRight,
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

// Mock data - 50+ customers
const generateMockCustomers = () => {
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

  const customers = [];
  for (let i = 1; i <= 55; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${middleName} ${lastName}`;
    const email = `${lastName.toLowerCase()}${i}@email.com`;
    const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const referredBy = f0Partners[Math.floor(Math.random() * f0Partners.length)];
    const totalOrders = Math.floor(Math.random() * 30);
    const totalSpent = Math.floor(Math.random() * 50000000) + 500000;
    const status = Math.random() > 0.2 ? 'active' : 'inactive';
    const joinedDate = new Date(2024, Math.floor(Math.random() * 11), Math.floor(Math.random() * 28) + 1);

    customers.push({
      id: i,
      name: fullName,
      email,
      phone,
      referredBy,
      totalOrders,
      totalSpent,
      status,
      joinedDate: joinedDate.toISOString(),
    });
  }

  return customers;
};

const mockCustomers = generateMockCustomers();

const CustomersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterF0, setFilterF0] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate statistics
  const totalCustomers = mockCustomers.length;
  const activeCustomers = mockCustomers.filter((c) => c.status === 'active').length;
  const inactiveCustomers = mockCustomers.filter((c) => c.status === 'inactive').length;
  const newThisMonth = mockCustomers.filter((c) => {
    const joinedDate = new Date(c.joinedDate);
    const now = new Date();
    return joinedDate.getMonth() === now.getMonth() && joinedDate.getFullYear() === now.getFullYear();
  }).length;

  // Filter customers
  const filteredCustomers = mockCustomers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);

    const matchesF0 = filterF0 === 'all' || customer.referredBy === filterF0;
    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus;

    let matchesDate = true;
    if (filterDate !== 'all') {
      const joinedDate = new Date(customer.joinedDate);
      const now = new Date();
      if (filterDate === 'thisMonth') {
        matchesDate = joinedDate.getMonth() === now.getMonth() && joinedDate.getFullYear() === now.getFullYear();
      } else if (filterDate === 'lastMonth') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        matchesDate = joinedDate.getMonth() === lastMonth.getMonth() && joinedDate.getFullYear() === lastMonth.getFullYear();
      } else if (filterDate === 'last3Months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        matchesDate = joinedDate >= threeMonthsAgo;
      }
    }

    return matchesSearch && matchesF0 && matchesStatus && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Get unique F0 partners
  const uniqueF0Partners = Array.from(new Set(mockCustomers.map((c) => c.referredBy))).sort();

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

  // Handle export
  const handleExport = () => {
    console.log('Exporting customers data...');
    alert('Chức năng xuất dữ liệu đang được phát triển');
  };

  // Handle actions
  const handleView = (customerId: number) => {
    console.log('View customer:', customerId);
    alert(`Xem chi tiết khách hàng #${customerId}`);
  };

  const handleEdit = (customerId: number) => {
    console.log('Edit customer:', customerId);
    alert(`Chỉnh sửa khách hàng #${customerId}`);
  };

  const handleDeactivate = (customerId: number) => {
    console.log('Deactivate customer:', customerId);
    if (confirm('Bạn có chắc chắn muốn vô hiệu hóa khách hàng này?')) {
      alert(`Đã vô hiệu hóa khách hàng #${customerId}`);
    }
  };

  // Statistics cards data
  const statsCards = [
    {
      title: 'Tổng Khách Hàng',
      value: totalCustomers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Mới Tháng Này',
      value: newThisMonth,
      icon: UserPlus,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Đang Hoạt Động',
      value: activeCustomers,
      icon: UserCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Không Hoạt Động',
      value: inactiveCustomers,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Quản Lý Khách Hàng (F1)
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý danh sách khách hàng được giới thiệu bởi đối tác F0
            </p>
          </div>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Xuất dữ liệu
          </Button>
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
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Tìm kiếm theo tên, email, SĐT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter by F0 */}
              <Select value={filterF0} onChange={(e) => setFilterF0(e.target.value)}>
                <option value="all">Tất cả F0</option>
                {uniqueF0Partners.map((partner) => (
                  <option key={partner} value={partner}>
                    {partner}
                  </option>
                ))}
              </Select>

              {/* Filter by Status */}
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </Select>

              {/* Filter by Registration Date */}
              <Select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
                <option value="all">Tất cả thời gian</option>
                <option value="thisMonth">Tháng này</option>
                <option value="lastMonth">Tháng trước</option>
                <option value="last3Months">3 tháng gần đây</option>
              </Select>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || filterF0 !== 'all' || filterStatus !== 'all' || filterDate !== 'all') && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Đang lọc:</span>
                {searchTerm && (
                  <Badge variant="info" className="cursor-pointer" onClick={() => setSearchTerm('')}>
                    Tìm kiếm: "{searchTerm}" ×
                  </Badge>
                )}
                {filterF0 !== 'all' && (
                  <Badge variant="info" className="cursor-pointer" onClick={() => setFilterF0('all')}>
                    F0: {filterF0} ×
                  </Badge>
                )}
                {filterStatus !== 'all' && (
                  <Badge variant="info" className="cursor-pointer" onClick={() => setFilterStatus('all')}>
                    Trạng thái: {filterStatus === 'active' ? 'Hoạt động' : 'Không hoạt động'} ×
                  </Badge>
                )}
                {filterDate !== 'all' && (
                  <Badge variant="info" className="cursor-pointer" onClick={() => setFilterDate('all')}>
                    Thời gian: {filterDate} ×
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Danh sách khách hàng ({filteredCustomers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tên Khách Hàng</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Số Điện Thoại</TableHead>
                    <TableHead>Giới Thiệu Bởi (F0)</TableHead>
                    <TableHead>Tổng ĐH</TableHead>
                    <TableHead>Tổng Chi Tiêu</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead>Ngày Tham Gia</TableHead>
                    <TableHead className="text-right">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentCustomers.length > 0 ? (
                    currentCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">#{customer.id}</TableCell>
                        <TableCell className="font-semibold">{customer.name}</TableCell>
                        <TableCell className="text-gray-600">{customer.email}</TableCell>
                        <TableCell className="text-gray-600">{customer.phone}</TableCell>
                        <TableCell>
                          <Badge variant="default">{customer.referredBy}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{customer.totalOrders}</TableCell>
                        <TableCell className="font-semibold text-primary-600">
                          {formatCurrency(customer.totalSpent)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={customer.status === 'active' ? 'success' : 'danger'}>
                            {customer.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatDate(customer.joinedDate)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleView(customer.id)}
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(customer.id)}
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeactivate(customer.id)}
                              title="Vô hiệu hóa"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        Không tìm thấy khách hàng nào
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredCustomers.length)} trong tổng số {filteredCustomers.length} khách hàng
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={page}
                            variant={page === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="min-w-[36px]"
                          >
                            {page}
                          </Button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return null;
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
    </div>
  );
};

export default CustomersPage;
