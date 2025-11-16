import { useState } from 'react';
import {
  User,
  Lock,
  Shield,
  CreditCard,
  Upload,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Smartphone,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock user data
const mockUserData = {
  avatar: '',
  fullName: 'Nguyễn Văn A',
  email: 'nguyenvana@example.com',
  phone: '0912345678',
  dateOfBirth: '1990-01-15',
  gender: 'male',
  address: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
  bankName: 'Vietcombank',
  accountNumber: '1234567890',
  accountHolder: 'NGUYEN VAN A',
  branch: 'Chi nhánh Sài Gòn',
  currentTier: 'gold',
  twoFactorEnabled: false,
};

// Vietnam banks list
const vietnamBanks = [
  { value: 'vietcombank', label: 'Vietcombank - Ngân hàng TMCP Ngoại thương Việt Nam' },
  { value: 'vietinbank', label: 'VietinBank - Ngân hàng TMCP Công Thương Việt Nam' },
  { value: 'bidv', label: 'BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { value: 'agribank', label: 'Agribank - Ngân hàng Nông nghiệp và Phát triển Nông thôn' },
  { value: 'techcombank', label: 'Techcombank - Ngân hàng TMCP Kỹ Thương Việt Nam' },
  { value: 'acb', label: 'ACB - Ngân hàng TMCP Á Châu' },
  { value: 'vpbank', label: 'VPBank - Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { value: 'mbbank', label: 'MBBank - Ngân hàng TMCP Quân Đội' },
  { value: 'sacombank', label: 'Sacombank - Ngân hàng TMCP Sài Gòn Thương Tín' },
  { value: 'tpbank', label: 'TPBank - Ngân hàng TMCP Tiên Phong' },
];

// Mock active sessions
const mockSessions = [
  {
    id: 1,
    device: 'Chrome on Windows',
    location: 'TP.HCM, Việt Nam',
    lastActive: '2 phút trước',
    current: true,
  },
  {
    id: 2,
    device: 'Safari on iPhone',
    location: 'Hà Nội, Việt Nam',
    lastActive: '1 ngày trước',
    current: false,
  },
];

const ProfilePage = () => {
  const [userData, setUserData] = useState(mockUserData);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserData({ ...userData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Get initials for avatar placeholder
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle personal info save
  const handleSavePersonalInfo = async () => {
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccessMessage('Thông tin cá nhân đã được cập nhật thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 1000);
  };

  // Handle bank info save
  const handleSaveBankInfo = async () => {
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccessMessage('Thông tin ngân hàng đã được cập nhật thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 1000);
  };

  // Handle password change
  const handleChangePassword = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setErrorMessage('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccessMessage('Mật khẩu đã được thay đổi thành công!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 1000);
  };

  // Handle 2FA toggle
  const handleToggle2FA = () => {
    setLoading(true);
    setTimeout(() => {
      setUserData({ ...userData, twoFactorEnabled: !userData.twoFactorEnabled });
      setLoading(false);
      setSuccessMessage(
        `Xác thực hai yếu tố đã được ${!userData.twoFactorEnabled ? 'bật' : 'tắt'}!`
      );
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 1000);
  };

  // Handle logout all sessions
  const handleLogoutAll = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccessMessage('Đã đăng xuất khỏi tất cả các thiết bị khác!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 1000);
  };

  // Get tier badge variant
  const getTierVariant = (tier: string) => {
    switch (tier) {
      case 'silver':
        return 'default';
      case 'gold':
        return 'warning';
      case 'diamond':
        return 'info';
      default:
        return 'default';
    }
  };

  // Get tier display name
  const getTierName = (tier: string) => {
    switch (tier) {
      case 'silver':
        return 'Bạc';
      case 'gold':
        return 'Vàng';
      case 'diamond':
        return 'Kim Cương';
      default:
        return tier;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hồ Sơ Của Tôi</h1>
          <p className="text-gray-500 mt-1">Quản lý thông tin cá nhân và cài đặt bảo mật</p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert variant="success">
            <Check className="h-4 w-4" />
            <AlertTitle>Thành công!</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lỗi!</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">
              <User className="w-4 h-4 mr-2" />
              Thông tin cá nhân
            </TabsTrigger>
            <TabsTrigger value="bank">
              <CreditCard className="w-4 h-4 mr-2" />
              Ngân hàng
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Bảo mật
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Personal Information */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription>
                  Cập nhật thông tin cá nhân của bạn để chúng tôi có thể liên hệ khi cần thiết
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {userData.avatar ? (
                      <img
                        src={userData.avatar}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-primary-100 border-4 border-gray-200 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary-600">
                          {getInitials(userData.fullName)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="avatar" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
                        <Upload className="w-4 h-4" />
                        Tải ảnh lên
                      </div>
                    </Label>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG hoặc GIF (tối đa 2MB)
                    </p>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <Input
                    id="fullName"
                    value={userData.fullName}
                    onChange={(e) =>
                      setUserData({ ...userData, fullName: e.target.value })
                    }
                    placeholder="Nhập họ và tên"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      value={userData.phone}
                      readOnly
                      className="bg-gray-50"
                      placeholder="Số điện thoại"
                    />
                    <Badge
                      variant="success"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      Đã xác thực
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    Số điện thoại đã được xác thực và không thể thay đổi
                  </p>
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Ngày sinh</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={userData.dateOfBirth}
                    onChange={(e) =>
                      setUserData({ ...userData, dateOfBirth: e.target.value })
                    }
                  />
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label htmlFor="gender">Giới tính</Label>
                  <Select
                    value={userData.gender}
                    onValueChange={(value) => setUserData({ ...userData, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn giới tính" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Nam</SelectItem>
                      <SelectItem value="female">Nữ</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Textarea
                    id="address"
                    value={userData.address}
                    onChange={(e) => setUserData({ ...userData, address: e.target.value })}
                    placeholder="Nhập địa chỉ đầy đủ"
                    rows={3}
                  />
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSavePersonalInfo}
                  disabled={loading}
                  className="w-full md:w-auto"
                >
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Bank Information */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin ngân hàng</CardTitle>
                <CardDescription>
                  Cập nhật thông tin tài khoản ngân hàng để nhận thanh toán hoa hồng
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bank Name */}
                <div className="space-y-2">
                  <Label htmlFor="bankName">Ngân hàng</Label>
                  <Select
                    value={userData.bankName}
                    onValueChange={(value) =>
                      setUserData({ ...userData, bankName: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn ngân hàng" />
                    </SelectTrigger>
                    <SelectContent>
                      {vietnamBanks.map((bank) => (
                        <SelectItem key={bank.value} value={bank.value}>
                          {bank.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Account Number */}
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Số tài khoản</Label>
                  <Input
                    id="accountNumber"
                    value={userData.accountNumber}
                    onChange={(e) =>
                      setUserData({ ...userData, accountNumber: e.target.value })
                    }
                    placeholder="Nhập số tài khoản"
                  />
                </div>

                {/* Account Holder */}
                <div className="space-y-2">
                  <Label htmlFor="accountHolder">Tên chủ tài khoản</Label>
                  <Input
                    id="accountHolder"
                    value={userData.accountHolder}
                    onChange={(e) =>
                      setUserData({ ...userData, accountHolder: e.target.value })
                    }
                    placeholder="NGUYEN VAN A"
                    className="uppercase"
                  />
                  <p className="text-xs text-gray-500">
                    Tên chủ tài khoản phải viết hoa, không dấu
                  </p>
                </div>

                {/* Branch */}
                <div className="space-y-2">
                  <Label htmlFor="branch">Chi nhánh (Tùy chọn)</Label>
                  <Input
                    id="branch"
                    value={userData.branch}
                    onChange={(e) => setUserData({ ...userData, branch: e.target.value })}
                    placeholder="Nhập tên chi nhánh"
                  />
                </div>

                {/* Security Note */}
                <Alert variant="info">
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Bảo mật thông tin</AlertTitle>
                  <AlertDescription>
                    Thông tin ngân hàng của bạn được mã hóa và chỉ sử dụng để thanh toán hoa
                    hồng. Chúng tôi cam kết không chia sẻ thông tin này với bên thứ ba.
                  </AlertDescription>
                </Alert>

                {/* Save Button */}
                <Button
                  onClick={handleSaveBankInfo}
                  disabled={loading}
                  className="w-full md:w-auto"
                >
                  {loading ? 'Đang lưu...' : 'Lưu thông tin ngân hàng'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Security */}
          <TabsContent value="security">
            <div className="space-y-6">
              {/* Current Tier */}
              <Card>
                <CardHeader>
                  <CardTitle>Hạng thành viên hiện tại</CardTitle>
                  <CardDescription>
                    Hạng thành viên của bạn trong hệ thống Affiliate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary-50 p-4 rounded-lg">
                      <Shield className="w-8 h-8 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Hạng hiện tại</p>
                      <Badge variant={getTierVariant(userData.currentTier)} className="text-base px-3 py-1">
                        {getTierName(userData.currentTier)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Thay đổi mật khẩu
                  </CardTitle>
                  <CardDescription>
                    Cập nhật mật khẩu của bạn để bảo vệ tài khoản
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            currentPassword: e.target.value,
                          })
                        }
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Mật khẩu mới</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder="Nhập mật khẩu mới"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Mật khẩu phải có ít nhất 8 ký tự
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Nhập lại mật khẩu mới"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Update Button */}
                  <Button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="w-full md:w-auto"
                  >
                    {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                  </Button>
                </CardContent>
              </Card>

              {/* Two-Factor Authentication */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Xác thực hai yếu tố (2FA)
                  </CardTitle>
                  <CardDescription>
                    Tăng cường bảo mật tài khoản với xác thực hai yếu tố
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {userData.twoFactorEnabled
                          ? 'Đã bật xác thực hai yếu tố'
                          : 'Chưa bật xác thực hai yếu tố'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {userData.twoFactorEnabled
                          ? 'Tài khoản của bạn được bảo vệ bởi xác thực hai yếu tố'
                          : 'Bật tính năng này để tăng cường bảo mật'}
                      </p>
                    </div>
                    <Button
                      variant={userData.twoFactorEnabled ? 'outline' : 'default'}
                      onClick={handleToggle2FA}
                      disabled={loading}
                    >
                      {userData.twoFactorEnabled ? 'Tắt' : 'Bật'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Session Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Quản lý phiên đăng nhập</CardTitle>
                  <CardDescription>
                    Xem và quản lý các thiết bị đang đăng nhập vào tài khoản
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{session.device}</p>
                          {session.current && (
                            <Badge variant="success">Phiên hiện tại</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{session.location}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Hoạt động lần cuối: {session.lastActive}
                        </p>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={handleLogoutAll}
                    disabled={loading}
                    className="w-full"
                  >
                    Đăng xuất khỏi tất cả thiết bị khác
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePage;
