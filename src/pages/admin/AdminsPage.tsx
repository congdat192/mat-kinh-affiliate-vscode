import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Power,
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react';

interface Admin {
  id: number;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Moderator';
  status: 'active' | 'inactive';
  lastLogin: string;
  permissions: string[];
}

const mockAdmins: Admin[] = [
  { id: 1, name: 'Nguyễn Văn A', email: 'admin1@matkinh.vn', role: 'Super Admin', status: 'active', lastLogin: '2024-01-15 14:30', permissions: ['all'] },
  { id: 2, name: 'Trần Thị B', email: 'admin2@matkinh.vn', role: 'Admin', status: 'active', lastLogin: '2024-01-15 10:20', permissions: ['users', 'orders', 'products'] },
  { id: 3, name: 'Lê Văn C', email: 'admin3@matkinh.vn', role: 'Moderator', status: 'active', lastLogin: '2024-01-14 16:45', permissions: ['users', 'support'] },
  { id: 4, name: 'Phạm Thị D', email: 'admin4@matkinh.vn', role: 'Admin', status: 'active', lastLogin: '2024-01-15 09:15', permissions: ['orders', 'products', 'vouchers'] },
  { id: 5, name: 'Hoàng Văn E', email: 'admin5@matkinh.vn', role: 'Moderator', status: 'inactive', lastLogin: '2024-01-10 11:00', permissions: ['support'] },
  { id: 6, name: 'Đỗ Thị F', email: 'admin6@matkinh.vn', role: 'Admin', status: 'active', lastLogin: '2024-01-15 13:20', permissions: ['users', 'orders'] },
  { id: 7, name: 'Vũ Văn G', email: 'admin7@matkinh.vn', role: 'Super Admin', status: 'active', lastLogin: '2024-01-15 08:45', permissions: ['all'] },
  { id: 8, name: 'Bùi Thị H', email: 'admin8@matkinh.vn', role: 'Moderator', status: 'active', lastLogin: '2024-01-14 15:30', permissions: ['users', 'support'] },
  { id: 9, name: 'Đinh Văn I', email: 'admin9@matkinh.vn', role: 'Admin', status: 'active', lastLogin: '2024-01-15 12:10', permissions: ['products', 'vouchers'] },
  { id: 10, name: 'Mai Thị K', email: 'admin10@matkinh.vn', role: 'Moderator', status: 'inactive', lastLogin: '2024-01-08 14:20', permissions: ['support'] },
  { id: 11, name: 'Chu Văn L', email: 'admin11@matkinh.vn', role: 'Admin', status: 'active', lastLogin: '2024-01-15 11:30', permissions: ['users', 'orders', 'products'] },
  { id: 12, name: 'Dương Thị M', email: 'admin12@matkinh.vn', role: 'Admin', status: 'active', lastLogin: '2024-01-14 17:00', permissions: ['orders', 'vouchers'] },
  { id: 13, name: 'Lý Văn N', email: 'admin13@matkinh.vn', role: 'Moderator', status: 'active', lastLogin: '2024-01-15 10:45', permissions: ['users', 'support'] },
  { id: 14, name: 'Phan Thị O', email: 'admin14@matkinh.vn', role: 'Admin', status: 'inactive', lastLogin: '2024-01-12 09:30', permissions: ['products'] },
  { id: 15, name: 'Tô Văn P', email: 'admin15@matkinh.vn', role: 'Moderator', status: 'active', lastLogin: '2024-01-15 13:50', permissions: ['support'] },
  { id: 16, name: 'Hồ Thị Q', email: 'admin16@matkinh.vn', role: 'Admin', status: 'active', lastLogin: '2024-01-15 14:15', permissions: ['users', 'orders', 'products', 'vouchers'] },
];

const availablePermissions = [
  { id: 'users', label: 'Quản lý Người dùng' },
  { id: 'orders', label: 'Quản lý Đơn hàng' },
  { id: 'products', label: 'Quản lý Sản phẩm' },
  { id: 'vouchers', label: 'Quản lý Voucher' },
  { id: 'support', label: 'Hỗ trợ Khách hàng' },
  { id: 'reports', label: 'Báo cáo & Thống kê' },
  { id: 'settings', label: 'Cài đặt Hệ thống' },
];

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>(mockAdmins);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [alertMessage, setAlertMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Moderator' as 'Super Admin' | 'Admin' | 'Moderator',
    permissions: [] as string[],
  });

  const stats = {
    total: admins.length,
    superAdmin: admins.filter(a => a.role === 'Super Admin').length,
    active: admins.filter(a => a.status === 'active').length,
    inactive: admins.filter(a => a.status === 'inactive').length,
  };

  const showSuccessAlert = (message: string) => {
    setAlertType('success');
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const showErrorAlert = (message: string) => {
    setAlertType('error');
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const handleOpenDialog = (admin?: Admin) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        name: admin.name,
        email: admin.email,
        password: '',
        role: admin.role,
        permissions: admin.permissions,
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'Moderator',
        permissions: [],
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingAdmin(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Moderator',
      permissions: [],
    });
  };

  const handleSaveAdmin = () => {
    if (!formData.name || !formData.email) {
      showErrorAlert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    if (!editingAdmin && !formData.password) {
      showErrorAlert('Vui lòng nhập mật khẩu cho quản trị viên mới!');
      return;
    }

    if (formData.permissions.length === 0 && formData.role !== 'Super Admin') {
      showErrorAlert('Vui lòng chọn ít nhất một quyền!');
      return;
    }

    if (editingAdmin) {
      setAdmins(admins.map(a =>
        a.id === editingAdmin.id
          ? { ...a, ...formData, permissions: formData.role === 'Super Admin' ? ['all'] : formData.permissions }
          : a
      ));
      showSuccessAlert('Cập nhật quản trị viên thành công!');
    } else {
      const newAdmin: Admin = {
        id: Math.max(...admins.map(a => a.id)) + 1,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: 'active',
        lastLogin: 'Chưa đăng nhập',
        permissions: formData.role === 'Super Admin' ? ['all'] : formData.permissions,
      };
      setAdmins([newAdmin, ...admins]);
      showSuccessAlert('Thêm quản trị viên thành công!');
    }

    handleCloseDialog();
  };

  const handleChangeRole = (admin: Admin, newRole: 'Super Admin' | 'Admin' | 'Moderator') => {
    setAdmins(admins.map(a =>
      a.id === admin.id
        ? { ...a, role: newRole, permissions: newRole === 'Super Admin' ? ['all'] : a.permissions }
        : a
    ));
    showSuccessAlert(`Đã thay đổi vai trò thành ${newRole}!`);
  };

  const handleToggleStatus = (admin: Admin) => {
    const newStatus = admin.status === 'active' ? 'inactive' : 'active';
    setAdmins(admins.map(a =>
      a.id === admin.id ? { ...a, status: newStatus } : a
    ));
    showSuccessAlert(`Đã ${newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} quản trị viên!`);
  };

  const handleDeleteAdmin = (admin: Admin) => {
    if (confirm(`Bạn có chắc chắn muốn xóa ${admin.name}?`)) {
      setAdmins(admins.filter(a => a.id !== admin.id));
      showSuccessAlert('Đã xóa quản trị viên!');
    }
  };

  const togglePermission = (permissionId: string) => {
    if (formData.permissions.includes(permissionId)) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p !== permissionId),
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permissionId],
      });
    }
  };

  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedAdmins = filteredAdmins.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Super Admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'Admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Moderator': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">Hoạt động</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 border-gray-200">Không hoạt động</Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Quản Lý Quản Trị Viên</h1>
        <p className="text-muted-foreground">Quản lý tài khoản và quyền hạn của quản trị viên</p>
      </div>

      {showAlert && (
        <Alert className={`mb-6 ${alertType === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            {alertType === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={alertType === 'success' ? 'text-green-800' : 'text-red-800'}>
              {alertMessage}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tổng Số</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Super Admin</p>
              <p className="text-2xl font-bold">{stats.superAdmin}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Hoạt Động</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Không Hoạt Động</p>
              <p className="text-2xl font-bold">{stats.inactive}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Power className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm kiếm theo tên hoặc email..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            Thêm Quản Trị Viên
          </Button>
        </div>
      </Card>

      {/* Admins Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Họ Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai Trò</TableHead>
                <TableHead>Trạng Thái</TableHead>
                <TableHead>Đăng Nhập Cuối</TableHead>
                <TableHead className="text-right">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAdmins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">#{admin.id}</TableCell>
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(admin.role)}>
                      {admin.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(admin.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{admin.lastLogin}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(admin)}
                        title="Chỉnh sửa"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(admin)}
                        title={admin.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                      >
                        <Power className={`h-4 w-4 ${admin.status === 'active' ? 'text-green-600' : 'text-gray-400'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAdmin(admin)}
                        title="Xóa"
                        disabled={admin.role === 'Super Admin'}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredAdmins.length)} trong tổng số {filteredAdmins.length} quản trị viên
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create/Edit Admin Dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAdmin ? 'Chỉnh Sửa Quản Trị Viên' : 'Thêm Quản Trị Viên Mới'}
            </DialogTitle>
            <DialogDescription>
              {editingAdmin
                ? 'Cập nhật thông tin và quyền hạn của quản trị viên'
                : 'Nhập thông tin và phân quyền cho quản trị viên mới'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Họ Tên <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập họ tên"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            {!editingAdmin && (
              <div className="grid gap-2">
                <Label htmlFor="password">Mật Khẩu <span className="text-red-500">*</span></Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Nhập mật khẩu"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="role">Vai Trò</Label>
              <Select
                id="role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as 'Super Admin' | 'Admin' | 'Moderator', permissions: e.target.value === 'Super Admin' ? ['all'] : formData.permissions })
                }
              >
                <option value="Super Admin">Super Admin</option>
                <option value="Admin">Admin</option>
                <option value="Moderator">Moderator</option>
              </Select>
            </div>

            {formData.role !== 'Super Admin' && (
              <div className="grid gap-3">
                <Label>Quyền Hạn</Label>
                <div className="border rounded-lg p-4 space-y-3">
                  {availablePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission.id}
                        checked={formData.permissions.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                      />
                      <label
                        htmlFor={permission.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {permission.label}
                      </label>
                    </div>
                  ))}
                </div>
                {formData.permissions.length === 0 && (
                  <p className="text-xs text-red-600">* Vui lòng chọn ít nhất một quyền</p>
                )}
              </div>
            )}

            {formData.role === 'Super Admin' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Super Admin có toàn quyền truy cập tất cả các chức năng của hệ thống.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Hủy
            </Button>
            <Button onClick={handleSaveAdmin}>
              {editingAdmin ? 'Cập Nhật' : 'Thêm Mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
