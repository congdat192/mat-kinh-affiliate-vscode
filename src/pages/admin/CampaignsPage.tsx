import { useState, useEffect, useMemo } from 'react';
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
  Check,
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

  // External campaigns state
  const [externalCampaigns, setExternalCampaigns] = useState<Array<{
    id: number;
    code: string;
    name: string;
    price: number;
    expiretime: number;
    startdate: string;
    enddate: string;
    isactive: boolean;
  }>>([]);
  const [selectedExternalCampaign, setSelectedExternalCampaign] = useState<number | null>(null);
  const [isLoadingExternalCampaigns, setIsLoadingExternalCampaigns] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    name: '',
    code: '',
    value: 0,
    description: '',
    validity_days: 30,
  });

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns();
  }, []);

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

  const loadExternalCampaigns = async () => {
    setIsLoadingExternalCampaigns(true);
    try {
      const data = await campaignService.fetchExternalCampaignsForSelection();
      setExternalCampaigns(data);
    } catch (error) {
      console.error('Error loading external campaigns:', error);
      alert('Lỗi khi tải danh sách campaigns từ hệ thống external. Vui lòng kiểm tra cấu hình OAuth token.');
    } finally {
      setIsLoadingExternalCampaigns(false);
    }
  };

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      code: '',
      value: 0,
      description: '',
      validity_days: 30,
    });
    setSelectedExternalCampaign(null);
    setShowCreateModal(true);
    // Load external campaigns when modal opens
    loadExternalCampaigns();
  };

  const handleSelectExternalCampaign = (campaignId: number) => {
    setSelectedExternalCampaign(campaignId);
    const campaign = externalCampaigns.find(c => c.id === campaignId);
    if (campaign) {
      setFormData({
        name: campaign.name,
        code: campaign.code,
        value: campaign.price,
        description: campaign.name, // Use name as description
        validity_days: campaign.expiretime,
        external_campaign_id: campaign.id,
      });
    }
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
      if (updatedCampaign) {
        setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
        setShowEditModal(false);
        alert('Cập nhật campaign thành công!');
      } else {
        alert('Không tìm thấy campaign');
      }
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
        if (updatedCampaign) {
          setCampaigns(campaigns.map(c => c.id === campaign.id ? updatedCampaign : c));
          alert(`Đã ${action} campaign thành công!`);
        } else {
          alert('Không tìm thấy campaign');
        }
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
        <DialogContent className="max-w-2xl" onClose={() => setShowCreateModal(false)}>
          <DialogHeader className="border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Gift className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Tạo Campaign Mới</DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  Chọn campaign từ KiotViet hoặc tạo thủ công
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isLoadingExternalCampaigns ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                <p className="text-gray-700 font-medium text-base">Đang tải danh sách campaigns...</p>
                <p className="text-sm text-gray-500 mt-1">Đang kết nối với hệ thống KiotViet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-4 max-h-[70vh] overflow-y-auto">
              {/* External Campaign Selector */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-white p-2.5 rounded-lg shadow-sm">
                    <Tag className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <label className="text-base font-bold text-gray-800 mb-3 block flex items-center gap-2">
                      <span>Đồng bộ từ KiotViet</span>
                      {selectedExternalCampaign && (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          <Check className="w-3 h-3 mr-1" />
                          Đã chọn
                        </Badge>
                      )}
                    </label>
                    {externalCampaigns.length === 0 ? (
                      <div className="text-sm text-amber-800 bg-amber-50 rounded-lg px-4 py-3 border border-amber-300">
                        <p className="font-medium">Không tìm thấy campaigns từ KiotViet</p>
                        <p className="text-xs mt-1">Bạn có thể tạo campaign thủ công bên dưới</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <Select
                            value={selectedExternalCampaign?.toString() || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value) {
                                handleSelectExternalCampaign(parseInt(value));
                              } else {
                                setSelectedExternalCampaign(null);
                                setFormData({
                                  name: '',
                                  code: '',
                                  value: 0,
                                  description: '',
                                  validity_days: 30,
                                });
                              }
                            }}
                            className="bg-white shadow-sm flex-1"
                          >
                            <option value="">-- Chọn campaign từ KiotViet --</option>
                            {externalCampaigns.map((campaign) => (
                              <option key={campaign.id} value={campaign.id}>
                                {campaign.name} ({campaign.price.toLocaleString('vi-VN')} VNĐ)
                              </option>
                            ))}
                          </Select>
                          {selectedExternalCampaign && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedExternalCampaign(null);
                                setFormData({
                                  name: '',
                                  code: '',
                                  value: 0,
                                  description: '',
                                  validity_days: 30,
                                });
                              }}
                              className="shrink-0"
                            >
                              Hủy chọn
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
                          <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                          Thông tin sẽ tự động điền khi bạn chọn campaign
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider with OR */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">
                    {selectedExternalCampaign ? 'Thông tin từ KiotViet' : 'Hoặc tạo thủ công'}
                  </span>
                </div>
              </div>

              {/* Display mode when external campaign selected */}
              {selectedExternalCampaign !== null ? (
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-800">Chi tiết Campaign</h3>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                      Từ KiotViet
                    </Badge>
                  </div>

                  {/* Name */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start gap-3">
                      <Gift className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Tên Campaign</p>
                        <p className="text-sm text-gray-900 font-medium break-words">{formData.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Code */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start gap-3">
                      <Tag className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Mã đợt phát hành</p>
                        <p className="text-sm text-gray-900 font-mono font-semibold">{formData.code}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Value */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start gap-2">
                        <DollarSign className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Giá trị</p>
                          <p className="text-sm text-green-700 font-bold">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formData.value)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Validity Days */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Thời hạn</p>
                          <p className="text-sm text-gray-900 font-semibold">{formData.validity_days} ngày</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Mô tả</p>
                        <p className="text-sm text-gray-700 break-words">{formData.description || 'Không có mô tả'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Form Fields for manual creation */
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-bold text-gray-800">Tạo Campaign Thủ Công</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Gift className="w-4 h-4 text-blue-600" />
                        Tên Campaign <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="VD: Voucher 200K cho khách hàng mới"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    {/* Code */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-purple-600" />
                        Mã Campaign <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="VD: VOUCHER200K"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="uppercase bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    {/* Value */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        Giá Trị (VNĐ) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        placeholder="200000"
                        value={formData.value || ''}
                        onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) || 0 })}
                        className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        min={0}
                        step={10000}
                      />
                      <p className="text-xs text-gray-500">Nhập số tiền giảm giá (VNĐ)</p>
                    </div>

                    {/* Validity Days */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        Thời Hạn (ngày) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        placeholder="30"
                        value={formData.validity_days}
                        onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) || 30 })}
                        className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        min={1}
                        max={365}
                      />
                      <p className="text-xs text-gray-500">Số ngày voucher có hiệu lực</p>
                    </div>
                  </div>

                  {/* Description - Full Width */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-600" />
                      Mô Tả
                    </label>
                    <textarea
                      placeholder="Mô tả chi tiết về điều kiện áp dụng, quyền lợi của campaign..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-h-[100px] resize-none"
                    />
                    <p className="text-xs text-gray-500">Thông tin này sẽ hiển thị cho F0 và khách hàng</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-gray-200 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="min-w-[100px]"
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreateCampaign}
              disabled={isLoadingExternalCampaigns}
              className="min-w-[140px]"
            >
              {isLoadingExternalCampaigns ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Đang tải...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo Campaign
                </>
              )}
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
