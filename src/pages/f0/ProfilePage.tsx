import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Shield,
  CreditCard,
  Eye,
  EyeOff,
  AlertCircle,
  Smartphone,
  Loader2,
  Camera,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Type for F0 user from storage
interface F0User {
  id: string;
  f0_code: string;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
}

// Default empty user data structure
const getDefaultUserData = (f0User: F0User | null) => ({
  avatar: '',
  fullName: f0User?.full_name || '',
  email: f0User?.email || '',
  phone: f0User?.phone || '',
  f0Code: f0User?.f0_code || '',
  dateOfBirth: '',
  gender: '',
  address: '',
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  branch: '',
  currentTier: 'silver', // Default tier
  twoFactorEnabled: false,
});

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

const ProfilePage = () => {
  const navigate = useNavigate();
  const [f0User, setF0User] = useState<F0User | null>(null);
  const [userData, setUserData] = useState(getDefaultUserData(null));
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data from storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('f0_user') || sessionStorage.getItem('f0_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as F0User;
        setF0User(parsedUser);
        setUserData(getDefaultUserData(parsedUser));
      } catch (e) {
        console.error('Error parsing user data:', e);
        navigate('/f0/auth/login');
      }
    } else {
      navigate('/f0/auth/login');
    }
    setIsLoading(false);
  }, [navigate]);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Handle avatar upload to Supabase Storage
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !f0User) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Vui lòng chọn file ảnh (JPG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error('Kích thước file tối đa là 2MB');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Generate unique filename: f0_code_timestamp.extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${f0User.f0_code}_${Date.now()}.${fileExt}`;
      const filePath = `${f0User.id}/${fileName}`;

      // Delete old avatar if exists
      if (userData.avatar && userData.avatar.includes('avatar_affiliate')) {
        const oldPath = userData.avatar.split('avatar_affiliate/')[1]?.split('?')[0];
        if (oldPath) {
          await supabase.storage.from('avatar_affiliate').remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatar_affiliate')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Lỗi khi tải ảnh lên. Vui lòng thử lại.');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatar_affiliate')
        .getPublicUrl(filePath);

      // Update local state
      setUserData({ ...userData, avatar: publicUrl });
      toast.success('Tải ảnh đại diện thành công!');

      // TODO: Save avatar_url to database when migration is done

    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle remove avatar
  const handleRemoveAvatar = async () => {
    if (!userData.avatar || !f0User) return;

    setIsUploadingAvatar(true);

    try {
      // Delete from storage if it's a Supabase URL
      if (userData.avatar.includes('avatar_affiliate')) {
        const filePath = userData.avatar.split('avatar_affiliate/')[1]?.split('?')[0];
        if (filePath) {
          await supabase.storage.from('avatar_affiliate').remove([filePath]);
        }
      }

      setUserData({ ...userData, avatar: '' });
      toast.success('Đã xóa ảnh đại diện');

      // TODO: Update avatar_url = null in database when migration is done

    } catch (error) {
      console.error('Remove avatar error:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsUploadingAvatar(false);
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

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast.success('Thông tin cá nhân đã được cập nhật thành công!');
    }, 1000);
  };

  // Handle bank info save
  const handleSaveBankInfo = async () => {
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast.success('Thông tin ngân hàng đã được cập nhật thành công!');
    }, 1000);
  };

  // Handle password change
  const handleChangePassword = async () => {
    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast.success('Mật khẩu đã được thay đổi thành công!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }, 1000);
  };

  // Handle 2FA toggle (disabled - feature in development)
  const handleToggle2FA = () => {
    toast.info('Tính năng này đang được phát triển');
  };

  // Handle logout all sessions (disabled - feature in development)
  const handleLogoutAll = () => {
    toast.info('Tính năng này đang được phát triển');
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

  // Show loading while fetching user data
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hồ Sơ Của Tôi</h1>
          <p className="text-gray-500 mt-1">
            Mã F0: <span className="font-semibold text-primary-600">{f0User?.f0_code}</span> • Quản lý thông tin cá nhân và cài đặt bảo mật
          </p>
        </div>

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
                    {/* Upload overlay when uploading */}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="avatar" className={`cursor-pointer ${isUploadingAvatar ? 'pointer-events-none opacity-50' : ''}`}>
                        <div className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-2 rounded-lg transition-colors">
                          <Camera className="w-4 h-4" />
                          {userData.avatar ? 'Đổi ảnh' : 'Tải ảnh lên'}
                        </div>
                      </Label>
                      {userData.avatar && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveAvatar}
                          disabled={isUploadingAvatar}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Xóa
                        </Button>
                      )}
                    </div>
                    <Input
                      id="avatar"
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                    />
                    <p className="text-xs text-gray-500">
                      JPG, PNG, GIF hoặc WebP (tối đa 2MB)
                    </p>
                  </div>
                </div>

                {/* Notice about locked fields */}
                <Alert variant="info">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Họ tên, Email và Số điện thoại</strong> là thông tin đăng ký ban đầu và không thể thay đổi.
                    Nếu cần cập nhật, vui lòng liên hệ Admin để được hỗ trợ.
                  </AlertDescription>
                </Alert>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <div className="relative">
                    <Input
                      id="fullName"
                      value={userData.fullName}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                      placeholder="Nhập họ và tên"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                      placeholder="email@example.com"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      value={userData.phone}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                      placeholder="Số điện thoại"
                    />
                    <Badge
                      variant="success"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      Đã xác thực
                    </Badge>
                  </div>
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
                    id="gender"
                    value={userData.gender}
                    onChange={(e) => setUserData({ ...userData, gender: e.target.value })}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
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
                {/* Important Notice */}
                <Alert variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Lưu ý quan trọng</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                      <li>Bạn chỉ được đăng ký <strong>01 tài khoản ngân hàng duy nhất</strong> để nhận hoa hồng</li>
                      <li>Tên chủ tài khoản <strong>phải trùng khớp</strong> với họ tên đăng ký tài khoản F0</li>
                      <li>Sau khi thông tin được xác minh, bạn <strong>không thể tự thay đổi</strong>. Vui lòng liên hệ Admin nếu cần cập nhật</li>
                      <li>Hoa hồng sẽ được chuyển vào tài khoản này theo chu kỳ thanh toán hàng tháng</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                {/* Bank Name */}
                <div className="space-y-2">
                  <Label htmlFor="bankName">Ngân hàng</Label>
                  <Select
                    id="bankName"
                    value={userData.bankName}
                    onChange={(e) =>
                      setUserData({ ...userData, bankName: e.target.value })
                    }
                  >
                    <option value="">Chọn ngân hàng</option>
                    {vietnamBanks.map((bank) => (
                      <option key={bank.value} value={bank.value}>
                        {bank.label}
                      </option>
                    ))}
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

                {/* Verification Status Note */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-gray-200 rounded-full p-2">
                      <CreditCard className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Trạng thái xác minh</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Thông tin ngân hàng của bạn sẽ được Admin xác minh trong vòng 24-48 giờ làm việc sau khi cập nhật.
                      </p>
                      <Badge variant="warning" className="mt-2">Chưa xác minh</Badge>
                    </div>
                  </div>
                </div>

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
                    <Badge variant="info" className="ml-2">Đang phát triển</Badge>
                  </CardTitle>
                  <CardDescription>
                    Tăng cường bảo mật tài khoản với xác thực hai yếu tố
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-700">
                        Chưa bật xác thực hai yếu tố
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Tính năng này đang được phát triển và sẽ sớm ra mắt. Bạn sẽ nhận được thông báo khi tính năng sẵn sàng.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={true}
                      className="opacity-50 cursor-not-allowed"
                    >
                      Sắp ra mắt
                    </Button>
                  </div>
                  <Alert variant="info">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Xác thực hai yếu tố (2FA) sẽ giúp bảo vệ tài khoản của bạn bằng cách yêu cầu mã xác nhận từ ứng dụng Authenticator mỗi khi đăng nhập.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Session Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Quản lý phiên đăng nhập
                    <Badge variant="info" className="ml-2">Đang phát triển</Badge>
                  </CardTitle>
                  <CardDescription>
                    Xem và quản lý các thiết bị đang đăng nhập vào tài khoản
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Session */}
                  <div className="flex items-start justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-green-800">Phiên đăng nhập hiện tại</p>
                        <Badge variant="success">Đang hoạt động</Badge>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Mã F0: {f0User?.f0_code || 'N/A'}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Đăng nhập lúc: {new Date().toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Coming Soon Notice */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">
                      <strong>Sắp ra mắt:</strong> Tính năng quản lý phiên đăng nhập chi tiết đang được phát triển. Bạn sẽ có thể xem:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-500 mt-2 space-y-1">
                      <li>Thông tin thiết bị (trình duyệt, hệ điều hành)</li>
                      <li>Địa chỉ IP và vị trí đăng nhập</li>
                      <li>Thời gian đăng nhập cụ thể</li>
                      <li>Đăng xuất từ xa các thiết bị khác</li>
                    </ul>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleLogoutAll}
                    disabled={true}
                    className="w-full opacity-50 cursor-not-allowed"
                  >
                    Đăng xuất khỏi tất cả thiết bị khác (Sắp ra mắt)
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
