import { useState, useMemo } from 'react';
import {
  Gift,
  Plus,
  Search,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Tag,
  DollarSign,
  Calendar,
  FileText,
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
import { campaignService } from '@/services/campaignService';
import type { Campaign, CreateCampaignRequest, UpdateCampaignRequest } from '@/types/campaign';

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    name: '',
    code: '',
    value: 0,
    description: '',
    validity_days: 30,
  });

  // Load campaigns on mount
  useState(() => {
    loadCampaigns();
  });

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const data = await campaignService.getAllCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      alert('Lỗi khi tải danh sách campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === 'active').length,
      inactive: campaigns.filter(c => c.status === 'inactive').length,
      totalValue: campaigns
        .filter(c => c.status === 'active')
        .reduce((sum, c) => sum + c.value, 0),
    };
  }, [campaigns]);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch =
        searchQuery === '' ||
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  // Handlers
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      code: '',
      value: 0,
      description: '',
      validity_days: 30,
    });
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      code: campaign.code,
      value: campaign.value,
      description: campaign.description,
      validity_days: campaign.validity_days,
    });
    setShowEditModal(true);
  };

  const handleCreateCampaign = async () => {
    // Validate
    if (!formData.name || !formData.code || formData.value <= 0) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const newCampaign = await campaignService.createCampaign(formData);
      setCampaigns([newCampaign, ...campaigns]);
      setShowCreateModal(false);
      alert('Tạo campaign thành công!');
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Lỗi khi tạo campaign');
    }
  };

  const handleUpdateCampaign = async () => {
    if (!selectedCampaign) return;

    // Validate
    if (!formData.name || !formData.code || formData.value <= 0) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const updateRequest: UpdateCampaignRequest = {
        ...formData,
        status: selectedCampaign.status,
      };
      const updatedCampaign = await campaignService.updateCampaign(selectedCampaign.id, updateRequest);
      setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
      setShowEditModal(false);
      alert('Cập nhật campaign thành công!');
    } catch (error) {
      console.error('Error updating campaign:', error);
      alert('Lỗi khi cập nhật campaign');
    }
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa';

    if (confirm(`Bạn có chắc chắn muốn ${action} campaign "${campaign.name}"?`)) {
      try {
        const updateRequest: UpdateCampaignRequest = {
          name: campaign.name,
          code: campaign.code,
          value: campaign.value,
          description: campaign.description,
          validity_days: campaign.validity_days,
          status: newStatus,
        };
        const updatedCampaign = await campaignService.updateCampaign(campaign.id, updateRequest);
        setCampaigns(campaigns.map(c => c.id === campaign.id ? updatedCampaign : c));
        alert(`Đã ${action} campaign thành công!`);
      } catch (error) {
        console.error('Error toggling campaign status:', error);
        alert('Lỗi khi cập nhật trạng thái campaign');
      }
    }
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    if (confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN campaign "${campaign.name}"?\n\nLưu ý: Nên sử dụng tính năng "Vô hiệu hóa" thay vì xóa để giữ lại dữ liệu lịch sử.`)) {
      try {
        await campaignService.deleteCampaign(campaign.id);
        setCampaigns(campaigns.filter(c => c.id !== campaign.id));
        alert('Đã xóa campaign thành công!');
      } catch (error) {
        console.error('Error deleting campaign:', error);
        alert('Lỗi khi xóa campaign');
      }
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge class
  const getStatusBadgeClass = (status: 'active' | 'inactive') => {
    return status === 'active'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusLabel = (status: 'active' | 'inactive') => {
    return status === 'active' ? 'Hoạt động' : 'Vô hiệu hóa';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Quản Lý Campaigns
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý các chiến dịch voucher và khuyến mãi
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleOpenCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Tạo Campaign
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tổng Campaigns
              </CardTitle>
              <div className="bg-blue-50 p-2 rounded-lg">
                <Gift className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">Tổng số campaigns</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Đang Hoạt Động
              </CardTitle>
              <div className="bg-green-50 p-2 rounded-lg">
                <ToggleRight className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
              <p className="text-xs text-gray-500 mt-1">Campaigns đang chạy</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Vô Hiệu Hóa
              </CardTitle>
              <div className="bg-gray-50 p-2 rounded-lg">
                <ToggleLeft className="w-4 h-4 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.inactive}</div>
              <p className="text-xs text-gray-500 mt-1">Campaigns tạm dừng</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tổng Giá Trị
              </CardTitle>
              <div className="bg-purple-50 p-2 rounded-lg">
                <DollarSign className="w-4 h-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalValue)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Tổng giá trị đang hoạt động</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle>Bộ lọc</CardTitle>
            <CardDescription>
              Tìm kiếm và lọc danh sách campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Tìm kiếm
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Tên campaign, mã code, mô tả..."
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
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Vô hiệu hóa</option>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="md:col-span-3 flex items-end gap-2">
                <Button variant="outline" onClick={handleClearFilters} className="flex-1">
                  Xóa bộ lọc
                </Button>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Hiển thị <span className="font-semibold">{filteredCampaigns.length}</span> kết quả
                {filteredCampaigns.length !== campaigns.length && (
                  <span> từ tổng số <span className="font-semibold">{campaigns.length}</span> campaigns</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Campaigns</CardTitle>
            <CardDescription>
              {filteredCampaigns.length} campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên Campaign</TableHead>
                    <TableHead>Mã Code</TableHead>
                    <TableHead className="text-right">Giá Trị</TableHead>
                    <TableHead className="text-center">Thời Hạn</TableHead>
                    <TableHead>Mô Tả</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead>Ngày Tạo</TableHead>
                    <TableHead className="text-right">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Đang tải...
                      </TableCell>
                    </TableRow>
                  ) : filteredCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Không tìm thấy campaigns nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns.map((campaign) => (
                      <TableRow
                        key={campaign.id}
                        className="hover:bg-gray-50"
                      >
                        <TableCell className="font-medium text-gray-900">
                          {campaign.name}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-gray-600">
                          {campaign.code}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(campaign.value)}
                        </TableCell>
                        <TableCell className="text-center text-gray-600">
                          {campaign.validity_days} ngày
                        </TableCell>
                        <TableCell className="text-gray-600 max-w-xs truncate">
                          {campaign.description}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(campaign.status)}>
                            {getStatusLabel(campaign.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {formatDate(campaign.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(campaign)}
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(campaign)}
                              title={campaign.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                            >
                              {campaign.status === 'active' ? (
                                <ToggleRight className="w-4 h-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-gray-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCampaign(campaign)}
                              title="Xóa vĩnh viễn"
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
          </CardContent>
        </Card>
      </div>

      {/* Create Campaign Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md" onClose={() => setShowCreateModal(false)}>
          <DialogHeader>
            <DialogTitle>Tạo Campaign Mới</DialogTitle>
            <DialogDescription>
              Tạo chiến dịch voucher khuyến mãi mới
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tên Campaign <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="VD: Voucher 200K"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Code */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Mã Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="VD: VOUCHER200K"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="pl-10 uppercase"
                />
              </div>
            </div>

            {/* Value */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Giá Trị (VNĐ) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="VD: 200000"
                  value={formData.value || ''}
                  onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) || 0 })}
                  className="pl-10"
                  min={0}
                />
              </div>
            </div>

            {/* Validity Days */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Thời Hạn (ngày) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="VD: 30"
                  value={formData.validity_days}
                  onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) || 30 })}
                  className="pl-10"
                  min={1}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Mô Tả
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  placeholder="Mô tả chi tiết về campaign..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateCampaign}>
              <Plus className="w-4 h-4 mr-2" />
              Tạo Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md" onClose={() => setShowEditModal(false)}>
          <DialogHeader>
            <DialogTitle>Chỉnh Sửa Campaign</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin campaign
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tên Campaign <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="VD: Voucher 200K"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Code */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Mã Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="VD: VOUCHER200K"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="pl-10 uppercase"
                />
              </div>
            </div>

            {/* Value */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Giá Trị (VNĐ) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="VD: 200000"
                  value={formData.value || ''}
                  onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) || 0 })}
                  className="pl-10"
                  min={0}
                />
              </div>
            </div>

            {/* Validity Days */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Thời Hạn (ngày) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="VD: 30"
                  value={formData.validity_days}
                  onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) || 30 })}
                  className="pl-10"
                  min={1}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Mô Tả
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  placeholder="Mô tả chi tiết về campaign..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateCampaign}>
              <Edit className="w-4 h-4 mr-2" />
              Cập Nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignsPage;
