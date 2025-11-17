import { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  Plus,
  Search,
  Trash2,
  Tag,
  Users,
  Gift,
  ArrowRight,
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
import type { Campaign, F0CampaignAssignment, AssignCampaignRequest } from '@/types/campaign';

// Mock F0 data - will be replaced with API later
interface F0 {
  f0_code: string;
  f0_name: string;
  email: string;
  phone: string;
}

const mockF0s: F0[] = [
  { f0_code: 'F0-001', f0_name: 'Nguyễn Văn A', email: 'f0001@email.com', phone: '0901234567' },
  { f0_code: 'F0-002', f0_name: 'Trần Thị B', email: 'f0002@email.com', phone: '0901234568' },
  { f0_code: 'F0-003', f0_name: 'Lê Văn C', email: 'f0003@email.com', phone: '0901234569' },
  { f0_code: 'F0-004', f0_name: 'Phạm Thị D', email: 'f0004@email.com', phone: '0901234570' },
  { f0_code: 'F0-005', f0_name: 'Hoàng Văn E', email: 'f0005@email.com', phone: '0901234571' },
];

const F0AssignmentsPage = () => {
  const [assignments, setAssignments] = useState<F0CampaignAssignment[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [f0Filter, setF0Filter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'direct' | 'link' | 'both'>('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state for assign
  const [formData, setFormData] = useState<AssignCampaignRequest>({
    f0_code: '',
    campaign_id: '',
    assignment_type: 'both',
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assignmentsData, campaignsData] = await Promise.all([
        campaignService.getAllAssignments(),
        campaignService.getAllCampaigns(),
      ]);
      setAssignments(assignmentsData);
      setCampaigns(campaignsData.filter(c => c.status === 'active')); // Only active campaigns
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Lỗi khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const uniqueF0s = new Set(assignments.map(a => a.f0_code)).size;
    const uniqueCampaigns = new Set(assignments.map(a => a.campaign_id)).size;

    return {
      total: assignments.length,
      uniqueF0s,
      uniqueCampaigns,
      directOnly: assignments.filter(a => a.assignment_type === 'direct').length,
      linkOnly: assignments.filter(a => a.assignment_type === 'link').length,
      both: assignments.filter(a => a.assignment_type === 'both').length,
    };
  }, [assignments]);

  // Get F0 name from code
  const getF0Name = (f0_code: string): string => {
    const f0 = mockF0s.find(f => f.f0_code === f0_code);
    return f0 ? f0.f0_name : f0_code;
  };

  // Get campaign name from ID
  const getCampaignName = (campaign_id: string): string => {
    const campaign = campaigns.find(c => c.id === campaign_id);
    return campaign ? campaign.name : campaign_id;
  };

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      const f0Name = getF0Name(assignment.f0_code);
      const campaignName = getCampaignName(assignment.campaign_id);

      const matchesSearch =
        searchQuery === '' ||
        assignment.f0_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f0Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaignName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesF0 = f0Filter === 'all' || assignment.f0_code === f0Filter;
      const matchesCampaign = campaignFilter === 'all' || assignment.campaign_id === campaignFilter;
      const matchesType = typeFilter === 'all' || assignment.assignment_type === typeFilter;

      return matchesSearch && matchesF0 && matchesCampaign && matchesType;
    });
  }, [assignments, searchQuery, f0Filter, campaignFilter, typeFilter, campaigns]);

  // Get unique F0s from assignments
  const uniqueAssignedF0s = useMemo(() => {
    return Array.from(new Set(assignments.map(a => a.f0_code))).sort();
  }, [assignments]);

  // Get unique campaigns from assignments
  const uniqueAssignedCampaigns = useMemo(() => {
    return Array.from(new Set(assignments.map(a => a.campaign_id))).sort();
  }, [assignments]);

  // Handlers
  const handleClearFilters = () => {
    setSearchQuery('');
    setF0Filter('all');
    setCampaignFilter('all');
    setTypeFilter('all');
  };

  const handleOpenAssignModal = () => {
    setFormData({
      f0_code: '',
      campaign_id: '',
      assignment_type: 'both',
    });
    setShowAssignModal(true);
  };

  const handleAssignCampaign = async () => {
    // Validate
    if (!formData.f0_code || !formData.campaign_id) {
      alert('Vui lòng chọn F0 và Campaign');
      return;
    }

    // Check if already assigned
    const existing = assignments.find(
      a => a.f0_code === formData.f0_code && a.campaign_id === formData.campaign_id
    );
    if (existing) {
      alert('F0 này đã được assign campaign này rồi!');
      return;
    }

    try {
      const newAssignment = await campaignService.assignCampaignToF0(formData);
      setAssignments([newAssignment, ...assignments]);
      setShowAssignModal(false);
      alert('Assign campaign thành công!');
    } catch (error) {
      console.error('Error assigning campaign:', error);
      alert('Lỗi khi assign campaign');
    }
  };

  const handleRemoveAssignment = async (assignment: F0CampaignAssignment) => {
    const f0Name = getF0Name(assignment.f0_code);
    const campaignName = getCampaignName(assignment.campaign_id);

    if (confirm(`Bạn có chắc chắn muốn xóa assignment:\n\nF0: ${f0Name}\nCampaign: ${campaignName}\nLoại: ${getTypeLabel(assignment.assignment_type)}`)) {
      try {
        await campaignService.removeAssignment(assignment.id);
        setAssignments(assignments.filter(a => a.id !== assignment.id));
        alert('Đã xóa assignment thành công!');
      } catch (error) {
        console.error('Error removing assignment:', error);
        alert('Lỗi khi xóa assignment');
      }
    }
  };

  // Get type badge class
  const getTypeBadgeClass = (type: 'direct' | 'link' | 'both') => {
    switch (type) {
      case 'direct':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'link':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'both':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: 'direct' | 'link' | 'both') => {
    switch (type) {
      case 'direct':
        return 'Trực tiếp';
      case 'link':
        return 'Link giới thiệu';
      case 'both':
        return 'Cả hai';
      default:
        return type;
    }
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Gán Campaign cho F0
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý việc gán campaigns cho các F0 partners
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleOpenAssignModal}>
              <Plus className="w-4 h-4 mr-2" />
              Gán Campaign
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tổng Assignments
              </CardTitle>
              <div className="bg-blue-50 p-2 rounded-lg">
                <UserPlus className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">Tổng số gán campaigns</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                F0 Partners
              </CardTitle>
              <div className="bg-green-50 p-2 rounded-lg">
                <Users className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.uniqueF0s}</div>
              <p className="text-xs text-gray-500 mt-1">F0 được gán campaigns</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Campaigns Đã Gán
              </CardTitle>
              <div className="bg-purple-50 p-2 rounded-lg">
                <Gift className="w-4 h-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.uniqueCampaigns}</div>
              <p className="text-xs text-gray-500 mt-1">Campaigns đang sử dụng</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Loại Gán
              </CardTitle>
              <div className="bg-orange-50 p-2 rounded-lg">
                <Tag className="w-4 h-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 text-sm">
                <div className="flex-1">
                  <div className="text-lg font-bold text-blue-600">{stats.directOnly}</div>
                  <p className="text-xs text-gray-500">Trực tiếp</p>
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-purple-600">{stats.linkOnly}</div>
                  <p className="text-xs text-gray-500">Link</p>
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-green-600">{stats.both}</div>
                  <p className="text-xs text-gray-500">Cả hai</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle>Bộ lọc</CardTitle>
            <CardDescription>
              Tìm kiếm và lọc danh sách assignments
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
                    placeholder="F0 code, tên F0, tên campaign..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* F0 Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  F0 Partner
                </label>
                <Select
                  value={f0Filter}
                  onChange={(e) => setF0Filter(e.target.value)}
                >
                  <option value="all">Tất cả F0</option>
                  {uniqueAssignedF0s.map((f0_code) => (
                    <option key={f0_code} value={f0_code}>
                      {getF0Name(f0_code)} ({f0_code})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Campaign Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Campaign
                </label>
                <Select
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                >
                  <option value="all">Tất cả Campaigns</option>
                  {uniqueAssignedCampaigns.map((campaign_id) => (
                    <option key={campaign_id} value={campaign_id}>
                      {getCampaignName(campaign_id)}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Loại gán
                </label>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | 'direct' | 'link' | 'both')}
                >
                  <option value="all">Tất cả</option>
                  <option value="direct">Trực tiếp</option>
                  <option value="link">Link giới thiệu</option>
                  <option value="both">Cả hai</option>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="lg:col-span-4 flex items-end gap-2">
                <Button variant="outline" onClick={handleClearFilters} className="flex-1">
                  Xóa bộ lọc
                </Button>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Hiển thị <span className="font-semibold">{filteredAssignments.length}</span> kết quả
                {filteredAssignments.length !== assignments.length && (
                  <span> từ tổng số <span className="font-semibold">{assignments.length}</span> assignments</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Assignments</CardTitle>
            <CardDescription>
              {filteredAssignments.length} assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>F0 Partner</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Loại Gán</TableHead>
                    <TableHead>Ngày Gán</TableHead>
                    <TableHead className="text-right">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Đang tải...
                      </TableCell>
                    </TableRow>
                  ) : filteredAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Không tìm thấy assignments nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments.map((assignment) => (
                      <TableRow
                        key={assignment.id}
                        className="hover:bg-gray-50"
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {getF0Name(assignment.f0_code)}
                            </span>
                            <span className="text-sm text-gray-500 font-mono">
                              {assignment.f0_code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {getCampaignName(assignment.campaign_id)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeBadgeClass(assignment.assignment_type)}>
                            {getTypeLabel(assignment.assignment_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {formatDate(assignment.assigned_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAssignment(assignment)}
                              title="Xóa assignment"
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

      {/* Assign Campaign Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md" onClose={() => setShowAssignModal(false)}>
          <DialogHeader>
            <DialogTitle>Gán Campaign cho F0</DialogTitle>
            <DialogDescription>
              Chọn F0 partner và campaign để gán
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* F0 Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Chọn F0 Partner <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Select
                  value={formData.f0_code}
                  onChange={(e) => setFormData({ ...formData, f0_code: e.target.value })}
                  className="pl-10"
                >
                  <option value="">-- Chọn F0 Partner --</option>
                  {mockF0s.map((f0) => (
                    <option key={f0.f0_code} value={f0.f0_code}>
                      {f0.f0_name} ({f0.f0_code})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Campaign Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Chọn Campaign <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Select
                  value={formData.campaign_id}
                  onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                  className="pl-10"
                >
                  <option value="">-- Chọn Campaign --</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} - {campaign.code}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Assignment Type */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Loại Gán <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Select
                  value={formData.assignment_type}
                  onChange={(e) => setFormData({ ...formData, assignment_type: e.target.value as 'direct' | 'link' | 'both' })}
                  className="pl-10"
                >
                  <option value="direct">Trực tiếp - F0 nhập SĐT F1</option>
                  <option value="link">Link giới thiệu - F0 tạo ref link</option>
                  <option value="both">Cả hai - Trực tiếp và Link</option>
                </Select>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <strong>Trực tiếp:</strong> F0 nhập số điện thoại F1 trên trang /f0/refer-customer<br />
                <strong>Link:</strong> F0 tạo link giới thiệu trên trang /f0/create-link<br />
                <strong>Cả hai:</strong> F0 có thể sử dụng cả hai phương thức
              </p>
            </div>

            {/* Preview */}
            {formData.f0_code && formData.campaign_id && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm font-medium text-blue-900">Xem trước:</div>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <span className="font-medium">{getF0Name(formData.f0_code)}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span className="font-medium">{getCampaignName(formData.campaign_id)}</span>
                  <Badge className={getTypeBadgeClass(formData.assignment_type)}>
                    {getTypeLabel(formData.assignment_type)}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleAssignCampaign}>
              <Plus className="w-4 h-4 mr-2" />
              Gán Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default F0AssignmentsPage;
