import { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  FileDown,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  X,
  Calendar,
  Phone,
  Mail,
  Award,
  TrendingUp,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TIER_CONFIGS } from '@/lib/constants';
import type { Tier } from '@/types';

// Types
type PartnerStatus = 'active' | 'inactive' | 'suspended';

interface Partner {
  id: string;
  avatar: string;
  name: string;
  email: string;
  phone: string;
  tier: Tier;
  totalReferrals: number;
  totalCommission: number;
  status: PartnerStatus;
  joinedDate: string;
  lastActivity?: string;
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

// Mock Data - 30+ partners
const generateMockPartners = (): Partner[] => {
  const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ'];
  const middleNames = ['Văn', 'Thị', 'Minh', 'Hoàng', 'Thanh', 'Thu', 'Hải', 'Quốc', 'Anh', 'Phương'];
  const lastNames = ['An', 'Bình', 'Chi', 'Dũng', 'Hòa', 'Hương', 'Linh', 'Nam', 'Phương', 'Trang', 'Tuấn', 'Yến'];
  const tiers: Tier[] = ['silver', 'silver', 'silver', 'gold', 'gold', 'diamond'];
  const statuses: PartnerStatus[] = ['active', 'active', 'active', 'active', 'inactive', 'suspended'];
  const banks = ['Vietcombank', 'Techcombank', 'VietinBank', 'BIDV', 'ACB', 'MB Bank', 'TPBank'];

  return Array.from({ length: 35 }, (_, i) => {
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${middleName} ${lastName}`;

    // Generate realistic data based on tier
    let referrals = 0;
    let commission = 0;

    if (tier === 'silver') {
      referrals = Math.floor(Math.random() * 10);
      commission = referrals * (300000 + Math.random() * 200000);
    } else if (tier === 'gold') {
      referrals = 11 + Math.floor(Math.random() * 20);
      commission = referrals * (400000 + Math.random() * 300000);
    } else {
      referrals = 31 + Math.floor(Math.random() * 20);
      commission = referrals * (500000 + Math.random() * 400000);
    }

    const joinedDate = new Date(2024, Math.floor(Math.random() * 11), Math.floor(Math.random() * 28) + 1);

    return {
      id: `F0-${String(i + 1).padStart(4, '0')}`,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      name,
      email: `${lastName.toLowerCase()}${firstName.toLowerCase()}${i + 1}@email.com`,
      phone: `09${Math.floor(Math.random() * 90000000 + 10000000)}`,
      tier,
      totalReferrals: referrals,
      totalCommission: Math.floor(commission),
      status,
      joinedDate: joinedDate.toISOString(),
      lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      bankInfo: {
        bankName: banks[Math.floor(Math.random() * banks.length)],
        accountNumber: `${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
        accountHolder: name.toUpperCase(),
      },
    };
  }).sort((a, b) => b.totalCommission - a.totalCommission);
};

const PartnersPage = () => {
  const [partners] = useState<Partner[]>(generateMockPartners());
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<Tier | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PartnerStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const itemsPerPage = 20;

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: partners.length,
      silver: partners.filter(p => p.tier === 'silver').length,
      gold: partners.filter(p => p.tier === 'gold').length,
      diamond: partners.filter(p => p.tier === 'diamond').length,
    };
  }, [partners]);

  // Filter partners
  const filteredPartners = useMemo(() => {
    return partners.filter(partner => {
      const matchesSearch =
        searchQuery === '' ||
        partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        partner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        partner.phone.includes(searchQuery);

      const matchesTier = tierFilter === 'all' || partner.tier === tierFilter;
      const matchesStatus = statusFilter === 'all' || partner.status === statusFilter;

      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        const joinedDate = new Date(partner.joinedDate);
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        matchesDate = joinedDate >= fromDate && joinedDate <= toDate;
      }

      return matchesSearch && matchesTier && matchesStatus && matchesDate;
    });
  }, [partners, searchQuery, tierFilter, statusFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredPartners.length / itemsPerPage);
  const paginatedPartners = filteredPartners.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleClearFilters = () => {
    setSearchQuery('');
    setTierFilter('all');
    setStatusFilter('all');
    setDateRange({ from: '', to: '' });
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    alert('Xuất Excel - Chức năng đang phát triển');
  };

  const handleAddPartner = () => {
    alert('Thêm Partner mới - Chức năng đang phát triển');
  };

  const handleViewDetails = (partner: Partner) => {
    setSelectedPartner(partner);
  };

  const handleEdit = (partner: Partner) => {
    alert(`Chỉnh sửa thông tin: ${partner.name}`);
  };

  const handleToggleStatus = (partner: Partner) => {
    const newStatus = partner.status === 'active' ? 'suspended' : 'active';
    alert(`Thay đổi trạng thái ${partner.name} thành: ${newStatus}`);
  };

  const handleDelete = (partner: Partner) => {
    if (confirm(`Bạn có chắc chắn muốn xóa partner ${partner.name}?`)) {
      alert(`Đã xóa: ${partner.name}`);
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

  // Get tier badge color
  const getTierBadgeStyle = (tier: Tier) => {
    const config = TIER_CONFIGS[tier];
    return {
      backgroundColor: config.color,
      color: tier === 'silver' ? '#000' : tier === 'diamond' ? '#000' : '#000',
    };
  };

  // Get status badge variant
  const getStatusBadgeClass = (status: PartnerStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: PartnerStatus) => {
    switch (status) {
      case 'active':
        return 'Hoạt động';
      case 'inactive':
        return 'Không hoạt động';
      case 'suspended':
        return 'Tạm khóa';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Quản Lý F0 Partners
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý danh sách đối tác giới thiệu và theo dõi hiệu suất
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileDown className="w-4 h-4 mr-2" />
              Xuất Excel
            </Button>
            <Button onClick={handleAddPartner}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm Partner
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tổng Partners
              </CardTitle>
              <div className="bg-blue-50 p-2 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">Tổng số đối tác</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Silver Tier
              </CardTitle>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                <Award className="w-4 h-4" style={{ color: TIER_CONFIGS.silver.color }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.silver}</div>
              <p className="text-xs text-gray-500 mt-1">0-10 giới thiệu</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Gold Tier
              </CardTitle>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff9e6' }}>
                <Award className="w-4 h-4" style={{ color: TIER_CONFIGS.gold.color }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.gold}</div>
              <p className="text-xs text-gray-500 mt-1">11-30 giới thiệu</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Diamond Tier
              </CardTitle>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#e6f7ff' }}>
                <Award className="w-4 h-4" style={{ color: '#1890ff' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.diamond}</div>
              <p className="text-xs text-gray-500 mt-1">31-50 giới thiệu</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Bộ lọc
            </CardTitle>
            <CardDescription>
              Tìm kiếm và lọc danh sách partners
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
                    placeholder="Tên, email, số điện thoại..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Tier Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Hạng
                </label>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as Tier | 'all')}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Tất cả</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="diamond">Diamond</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Trạng thái
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PartnerStatus | 'all')}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Không hoạt động</option>
                  <option value="suspended">Tạm khóa</option>
                </select>
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
                Hiển thị <span className="font-semibold">{filteredPartners.length}</span> kết quả
                {filteredPartners.length !== partners.length && (
                  <span> từ tổng số <span className="font-semibold">{partners.length}</span> partners</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Partners Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Partners</CardTitle>
            <CardDescription>
              Trang {currentPage} / {totalPages} - {filteredPartners.length} partners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Số điện thoại</TableHead>
                    <TableHead>Hạng</TableHead>
                    <TableHead className="text-right">Giới thiệu</TableHead>
                    <TableHead className="text-right">Hoa hồng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tham gia</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPartners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        Không tìm thấy partners nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPartners.map((partner) => (
                      <TableRow
                        key={partner.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleViewDetails(partner)}
                      >
                        <TableCell className="font-medium text-gray-900">
                          {partner.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={partner.avatar}
                              alt={partner.name}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <div className="font-medium text-gray-900">
                                {partner.name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{partner.email}</TableCell>
                        <TableCell className="text-gray-600">{partner.phone}</TableCell>
                        <TableCell>
                          <Badge style={getTierBadgeStyle(partner.tier)}>
                            {TIER_CONFIGS[partner.tier].displayName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {partner.totalReferrals}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(partner.totalCommission)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(partner.status)}>
                            {getStatusLabel(partner.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatDate(partner.joinedDate)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(partner);
                              }}
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(partner);
                              }}
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(partner);
                              }}
                              title={partner.status === 'active' ? 'Tạm khóa' : 'Kích hoạt'}
                            >
                              {partner.status === 'active' ? (
                                <Ban className="w-4 h-4 text-red-600" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(partner);
                              }}
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
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
                  {Math.min(currentPage * itemsPerPage, filteredPartners.length)} trong tổng số{' '}
                  {filteredPartners.length} kết quả
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
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Partner Detail Modal */}
      {selectedPartner && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPartner(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={selectedPartner.avatar}
                  alt={selectedPartner.name}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedPartner.name}
                  </h2>
                  <p className="text-gray-600">{selectedPartner.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPartner(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status and Tier */}
              <div className="flex gap-4">
                <Badge style={getTierBadgeStyle(selectedPartner.tier)} className="text-base px-4 py-2">
                  {TIER_CONFIGS[selectedPartner.tier].displayName}
                </Badge>
                <Badge className={`${getStatusBadgeClass(selectedPartner.status)} text-base px-4 py-2`}>
                  {getStatusLabel(selectedPartner.status)}
                </Badge>
              </div>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thông tin liên hệ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-600">Email</div>
                      <div className="font-medium">{selectedPartner.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-600">Số điện thoại</div>
                      <div className="font-medium">{selectedPartner.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-600">Ngày tham gia</div>
                      <div className="font-medium">{formatDate(selectedPartner.joinedDate)}</div>
                    </div>
                  </div>
                  {selectedPartner.lastActivity && (
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-600">Hoạt động gần nhất</div>
                        <div className="font-medium">{formatDate(selectedPartner.lastActivity)}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Tổng giới thiệu
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <div className="text-2xl font-bold">{selectedPartner.totalReferrals}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Tổng hoa hồng
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedPartner.totalCommission)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Hoa hồng TB/KH
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-600" />
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(
                          selectedPartner.totalReferrals > 0
                            ? selectedPartner.totalCommission / selectedPartner.totalReferrals
                            : 0
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bank Information */}
              {selectedPartner.bankInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Thông tin ngân hàng</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Ngân hàng</div>
                        <div className="font-medium">{selectedPartner.bankInfo.bankName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Số tài khoản</div>
                        <div className="font-medium">{selectedPartner.bankInfo.accountNumber}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm text-gray-600">Chủ tài khoản</div>
                        <div className="font-medium">{selectedPartner.bankInfo.accountHolder}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tier Benefits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quyền lợi hiện tại</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {TIER_CONFIGS[selectedPartner.tier].benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={() => handleEdit(selectedPartner)} className="flex-1">
                  <Edit className="w-4 h-4 mr-2" />
                  Chỉnh sửa
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleToggleStatus(selectedPartner)}
                  className="flex-1"
                >
                  {selectedPartner.status === 'active' ? (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Tạm khóa
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Kích hoạt
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDelete(selectedPartner)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnersPage;
