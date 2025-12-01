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
import { TIER_LOGOS, TIER_CONFIGS } from '@/lib/constants';
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
  avatar_url?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  bank_branch?: string;
  bank_verified?: boolean;
  bank_verified_at?: string;
}

// OTP Modal state interface
interface OtpModalState {
  isOpen: boolean;
  recordId: string;
  phoneMasked: string;
  expiresIn: number;
  otpValue: string;
  isVerifying: boolean;
  countdown: number;
}

// Default empty user data structure
const getDefaultUserData = (f0User: F0User | null) => ({
  avatar: f0User?.avatar_url || '',
  fullName: f0User?.full_name || '',
  email: f0User?.email || '',
  phone: f0User?.phone || '',
  f0Code: f0User?.f0_code || '',
  dateOfBirth: f0User?.date_of_birth || '',
  gender: f0User?.gender || '',
  address: f0User?.address || '',
  bankName: f0User?.bank_name || '',
  accountNumber: f0User?.bank_account_number || '',
  accountHolder: f0User?.bank_account_holder || '',
  branch: f0User?.bank_branch || '',
  bankVerified: f0User?.bank_verified || false,
  bankVerifiedAt: f0User?.bank_verified_at || '',
  currentTier: 'bronze', // Default tier - will be fetched from API
  currentTierName: 'Đồng', // Default tier name
  twoFactorEnabled: false,
});

// Initial OTP modal state
const initialOtpModalState: OtpModalState = {
  isOpen: false,
  recordId: '',
  phoneMasked: '',
  expiresIn: 300,
  otpValue: '',
  isVerifying: false,
  countdown: 0,
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

const ProfilePage = () => {
  const navigate = useNavigate();
  const [f0User, setF0User] = useState<F0User | null>(null);
  const [userData, setUserData] = useState(getDefaultUserData(null));
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [tierLoading, setTierLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data from storage and fetch latest from database
  useEffect(() => {
    const loadUserData = async () => {
      const storedUser = localStorage.getItem('f0_user') || sessionStorage.getItem('f0_user');
      if (!storedUser) {
        navigate('/f0/auth/login');
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser) as F0User;
        setF0User(parsedUser);

        // Fetch latest profile data from database
        const { data: profileData, error } = await supabase
          .from('f0_partners')
          .select('avatar_url, date_of_birth, gender, address, bank_name, bank_account_number, bank_account_holder, bank_branch, bank_verified, bank_verified_at')
          .eq('id', parsedUser.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          // Still use parsed user data if fetch fails
          setUserData(getDefaultUserData(parsedUser));
        } else {
          // Merge database data with stored user
          const mergedUser = { ...parsedUser, ...profileData };
          setF0User(mergedUser);
          setUserData(getDefaultUserData(mergedUser));

          // Update storage with latest data
          const storageKey = localStorage.getItem('f0_user') ? 'localStorage' : 'sessionStorage';
          if (storageKey === 'localStorage') {
            localStorage.setItem('f0_user', JSON.stringify(mergedUser));
          } else {
            sessionStorage.setItem('f0_user', JSON.stringify(mergedUser));
          }
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
        navigate('/f0/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [navigate]);

  // Fetch tier info from dashboard stats API
  useEffect(() => {
    const fetchTierInfo = async () => {
      if (!f0User?.id) return;

      setTierLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-f0-dashboard-stats`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ f0_id: f0User.id }),
          }
        );

        const result = await response.json();

        // Support both old format (result.tier) and new format (result.data.tier)
        const tierData = result.data?.tier || result.tier;
        if (result.success && tierData) {
          setUserData(prev => ({
            ...prev,
            currentTier: tierData.current,
            currentTierName: tierData.currentName,
          }));
        }
      } catch (error) {
        console.error('Error fetching tier info:', error);
        // Keep default tier on error
      } finally {
        setTierLoading(false);
      }
    };

    fetchTierInfo();
  }, [f0User?.id]);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpModal, setOtpModal] = useState<OtpModalState>(initialOtpModalState);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

      // Save avatar_url to database
      const { error: updateError } = await supabase
        .from('f0_partners')
        .update({ avatar_url: publicUrl })
        .eq('id', f0User.id);

      if (updateError) {
        console.error('Error saving avatar URL:', updateError);
        toast.error('Lỗi khi lưu ảnh đại diện. Vui lòng thử lại.');
        return;
      }

      // Update local state
      setUserData({ ...userData, avatar: publicUrl });

      // Update storage
      const updatedUser = { ...f0User, avatar_url: publicUrl };
      setF0User(updatedUser);
      if (localStorage.getItem('f0_user')) {
        localStorage.setItem('f0_user', JSON.stringify(updatedUser));
      } else {
        sessionStorage.setItem('f0_user', JSON.stringify(updatedUser));
      }

      toast.success('Tải ảnh đại diện thành công!');

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

      // Update database to remove avatar_url
      const { error: updateError } = await supabase
        .from('f0_partners')
        .update({ avatar_url: null })
        .eq('id', f0User.id);

      if (updateError) {
        console.error('Error removing avatar URL:', updateError);
        toast.error('Lỗi khi xóa ảnh đại diện. Vui lòng thử lại.');
        return;
      }

      // Update local state
      setUserData({ ...userData, avatar: '' });

      // Update storage
      const updatedUser = { ...f0User, avatar_url: undefined };
      setF0User(updatedUser);
      if (localStorage.getItem('f0_user')) {
        localStorage.setItem('f0_user', JSON.stringify(updatedUser));
      } else {
        sessionStorage.setItem('f0_user', JSON.stringify(updatedUser));
      }

      toast.success('Đã xóa ảnh đại diện');

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
    if (!f0User) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('f0_partners')
        .update({
          date_of_birth: userData.dateOfBirth || null,
          gender: userData.gender || null,
          address: userData.address || null,
        })
        .eq('id', f0User.id);

      if (error) {
        console.error('Error saving personal info:', error);
        toast.error('Lỗi khi lưu thông tin. Vui lòng thử lại.');
        return;
      }

      // Update local storage
      const updatedUser: F0User = {
        ...f0User,
        date_of_birth: userData.dateOfBirth || undefined,
        gender: userData.gender || undefined,
        address: userData.address || undefined,
      };
      setF0User(updatedUser);
      if (localStorage.getItem('f0_user')) {
        localStorage.setItem('f0_user', JSON.stringify(updatedUser));
      } else {
        sessionStorage.setItem('f0_user', JSON.stringify(updatedUser));
      }

      toast.success('Thông tin cá nhân đã được cập nhật thành công!');
    } catch (error) {
      console.error('Error saving personal info:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Handle bank info save - sends OTP for verification
  const handleSaveBankInfo = async () => {
    if (!f0User) return;

    // Check if already verified
    if (userData.bankVerified) {
      toast.error('Thông tin ngân hàng đã được xác minh. Vui lòng liên hệ Admin nếu cần thay đổi.');
      return;
    }

    // Validate required fields
    if (!userData.bankName || !userData.accountNumber || !userData.accountHolder) {
      toast.error('Vui lòng điền đầy đủ thông tin ngân hàng bắt buộc');
      return;
    }

    setLoading(true);

    try {
      // Call Edge Function to send OTP
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp-bank-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            f0_id: f0User.id,
            bank_name: userData.bankName,
            bank_account_number: userData.accountNumber,
            bank_account_holder: userData.accountHolder,
            bank_branch: userData.branch || null,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Không thể gửi mã OTP');
        return;
      }

      // Open OTP modal
      setOtpModal({
        isOpen: true,
        recordId: result.record_id,
        phoneMasked: result.phone_masked,
        expiresIn: result.expires_in,
        otpValue: '',
        isVerifying: false,
        countdown: result.expires_in,
      });

      toast.success(`Mã OTP đã được gửi đến số ${result.phone_masked}`);

    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = otpModal.otpValue.split('');
    newOtp[index] = value;
    const newOtpString = newOtp.join('').slice(0, 6);

    setOtpModal({ ...otpModal, otpValue: newOtpString });

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP input keydown (for backspace)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpModal.otpValue[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async () => {
    if (!f0User || otpModal.otpValue.length !== 6) {
      toast.error('Vui lòng nhập đầy đủ 6 số OTP');
      return;
    }

    setOtpModal({ ...otpModal, isVerifying: true });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp-bank`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            record_id: otpModal.recordId,
            phone: f0User.phone,
            otp: otpModal.otpValue,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Xác thực OTP thất bại');
        setOtpModal({ ...otpModal, isVerifying: false });
        return;
      }

      // Update local state with verified bank info
      const updatedUserData = {
        ...userData,
        bankName: result.bank_info.bank_name,
        accountNumber: result.bank_info.bank_account_number,
        accountHolder: result.bank_info.bank_account_holder,
        branch: result.bank_info.bank_branch || '',
        bankVerified: true,
        bankVerifiedAt: result.bank_info.bank_verified_at,
      };
      setUserData(updatedUserData);

      // Update f0User and storage
      const updatedUser = {
        ...f0User,
        bank_name: result.bank_info.bank_name,
        bank_account_number: result.bank_info.bank_account_number,
        bank_account_holder: result.bank_info.bank_account_holder,
        bank_branch: result.bank_info.bank_branch,
        bank_verified: true,
        bank_verified_at: result.bank_info.bank_verified_at,
      };
      setF0User(updatedUser);
      if (localStorage.getItem('f0_user')) {
        localStorage.setItem('f0_user', JSON.stringify(updatedUser));
      } else {
        sessionStorage.setItem('f0_user', JSON.stringify(updatedUser));
      }

      // Close modal and show success
      setOtpModal(initialOtpModalState);
      toast.success('Xác minh tài khoản ngân hàng thành công! Email thông báo đã được gửi.');

    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
      setOtpModal({ ...otpModal, isVerifying: false });
    }
  };

  // Close OTP modal
  const handleCloseOtpModal = () => {
    setOtpModal(initialOtpModalState);
  };

  // Countdown effect for OTP expiry
  useEffect(() => {
    if (!otpModal.isOpen || otpModal.countdown <= 0) return;

    const timer = setInterval(() => {
      setOtpModal(prev => ({
        ...prev,
        countdown: Math.max(0, prev.countdown - 1)
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [otpModal.isOpen, otpModal.countdown]);

  // Format countdown time
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  const getTierVariant = (tier: string): 'default' | 'warning' | 'info' | 'success' | 'danger' => {
    switch (tier) {
      case 'bronze':
        return 'default';
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

  // Get tier display name - use from API or fallback to constants
  const getTierDisplayName = (tier: string, tierName?: string) => {
    if (tierName) return tierName;
    return TIER_CONFIGS[tier]?.displayName || tier;
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
                <CardTitle className="flex items-center gap-2">
                  Thông tin ngân hàng
                  {userData.bankVerified && (
                    <Badge variant="success" className="ml-2">
                      <Shield className="w-3 h-3 mr-1" />
                      Đã xác minh
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {userData.bankVerified
                    ? 'Thông tin ngân hàng đã được xác minh và khóa. Liên hệ Admin nếu cần thay đổi.'
                    : 'Cập nhật thông tin tài khoản ngân hàng để nhận thanh toán hoa hồng'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Important Notice - only show if not verified */}
                {!userData.bankVerified && (
                  <Alert variant="warning">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Lưu ý quan trọng</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                        <li>Bạn chỉ được đăng ký <strong>01 tài khoản ngân hàng duy nhất</strong> để nhận hoa hồng</li>
                        <li>Tên chủ tài khoản <strong>phải trùng khớp</strong> với họ tên đăng ký tài khoản F0</li>
                        <li>Sau khi xác minh OTP, thông tin sẽ <strong>bị khóa vĩnh viễn</strong>. Vui lòng kiểm tra kỹ trước khi xác nhận</li>
                        <li>Hoa hồng sẽ được chuyển vào tài khoản này theo chu kỳ thanh toán hàng tháng</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Verified Notice - show when verified */}
                {userData.bankVerified && (
                  <Alert variant="success">
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Tài khoản đã được xác minh</AlertTitle>
                    <AlertDescription>
                      Thông tin ngân hàng đã được xác minh vào{' '}
                      {userData.bankVerifiedAt && new Date(userData.bankVerifiedAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}.
                      Nếu cần thay đổi thông tin, vui lòng liên hệ Admin.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Bank Name */}
                <div className="space-y-2">
                  <Label htmlFor="bankName">Ngân hàng</Label>
                  <div className="relative">
                    <Select
                      id="bankName"
                      value={userData.bankName}
                      onChange={(e) =>
                        setUserData({ ...userData, bankName: e.target.value })
                      }
                      disabled={userData.bankVerified}
                      className={userData.bankVerified ? 'bg-gray-50 cursor-not-allowed' : ''}
                    >
                      <option value="">Chọn ngân hàng</option>
                      {vietnamBanks.map((bank) => (
                        <option key={bank.value} value={bank.value}>
                          {bank.label}
                        </option>
                      ))}
                    </Select>
                    {userData.bankVerified && (
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Account Number */}
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Số tài khoản</Label>
                  <div className="relative">
                    <Input
                      id="accountNumber"
                      value={userData.accountNumber}
                      onChange={(e) =>
                        setUserData({ ...userData, accountNumber: e.target.value })
                      }
                      placeholder="Nhập số tài khoản"
                      readOnly={userData.bankVerified}
                      className={userData.bankVerified ? 'bg-gray-50 cursor-not-allowed' : ''}
                    />
                    {userData.bankVerified && (
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Account Holder */}
                <div className="space-y-2">
                  <Label htmlFor="accountHolder">Tên chủ tài khoản</Label>
                  <div className="relative">
                    <Input
                      id="accountHolder"
                      value={userData.accountHolder}
                      onChange={(e) =>
                        setUserData({ ...userData, accountHolder: e.target.value })
                      }
                      placeholder="NGUYEN VAN A"
                      className={`uppercase ${userData.bankVerified ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      readOnly={userData.bankVerified}
                    />
                    {userData.bankVerified && (
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  {!userData.bankVerified && (
                    <p className="text-xs text-gray-500">
                      Tên chủ tài khoản phải viết hoa, không dấu
                    </p>
                  )}
                </div>

                {/* Branch */}
                <div className="space-y-2">
                  <Label htmlFor="branch">Chi nhánh (Tùy chọn)</Label>
                  <div className="relative">
                    <Input
                      id="branch"
                      value={userData.branch}
                      onChange={(e) => setUserData({ ...userData, branch: e.target.value })}
                      placeholder="Nhập tên chi nhánh"
                      readOnly={userData.bankVerified}
                      className={userData.bankVerified ? 'bg-gray-50 cursor-not-allowed' : ''}
                    />
                    {userData.bankVerified && (
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                  </div>
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

                {/* Verification Status */}
                <div className={`border rounded-lg p-4 ${userData.bankVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`rounded-full p-2 ${userData.bankVerified ? 'bg-green-200' : 'bg-gray-200'}`}>
                      <CreditCard className={`w-4 h-4 ${userData.bankVerified ? 'text-green-600' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${userData.bankVerified ? 'text-green-900' : 'text-gray-900'}`}>
                        Trạng thái xác minh
                      </p>
                      <p className={`text-sm mt-1 ${userData.bankVerified ? 'text-green-700' : 'text-gray-600'}`}>
                        {userData.bankVerified
                          ? 'Tài khoản ngân hàng đã được xác minh qua OTP. Thông tin đã bị khóa.'
                          : 'Sau khi điền thông tin, bạn sẽ nhận mã OTP qua SMS để xác minh.'
                        }
                      </p>
                      <Badge
                        variant={userData.bankVerified ? 'success' : 'warning'}
                        className="mt-2"
                      >
                        {userData.bankVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Save Button - only show if not verified */}
                {!userData.bankVerified && (
                  <Button
                    onClick={handleSaveBankInfo}
                    disabled={loading}
                    className="w-full md:w-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang gửi OTP...
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 mr-2" />
                        Xác minh qua OTP
                      </>
                    )}
                  </Button>
                )}

                {/* Contact Admin button - show when verified */}
                {userData.bankVerified && (
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">
                      Cần thay đổi thông tin ngân hàng?
                    </p>
                    <Button variant="outline" size="sm">
                      Liên hệ Admin
                    </Button>
                  </div>
                )}
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
                    {/* Tier Logo */}
                    <div className="relative">
                      {tierLoading ? (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                        </div>
                      ) : (
                        <img
                          src={TIER_LOGOS[userData.currentTier] || TIER_LOGOS.bronze}
                          alt={`Hạng ${getTierDisplayName(userData.currentTier, userData.currentTierName)}`}
                          className="w-16 h-16 object-contain"
                          onError={(e) => {
                            // Fallback to Shield icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      )}
                      <div className="hidden bg-primary-50 p-4 rounded-lg">
                        <Shield className="w-8 h-8 text-primary-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Hạng hiện tại</p>
                      <Badge variant={getTierVariant(userData.currentTier)} className="text-base px-3 py-1">
                        {tierLoading ? 'Đang tải...' : getTierDisplayName(userData.currentTier, userData.currentTierName)}
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

      {/* OTP Verification Modal */}
      {otpModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Xác minh OTP</h3>
              <p className="text-primary-100 text-sm mt-1">
                Nhập mã OTP đã gửi đến số {otpModal.phoneMasked}
              </p>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Countdown */}
              <div className="text-center">
                {otpModal.countdown > 0 ? (
                  <p className="text-sm text-gray-600">
                    Mã OTP có hiệu lực trong{' '}
                    <span className="font-semibold text-primary-600">
                      {formatCountdown(otpModal.countdown)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-red-600 font-medium">
                    Mã OTP đã hết hạn. Vui lòng đóng và thử lại.
                  </p>
                )}
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => { otpInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpModal.otpValue[index] || ''}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    disabled={otpModal.isVerifying || otpModal.countdown <= 0}
                  />
                ))}
              </div>

              {/* Bank Info Preview */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-xs text-gray-500 font-medium uppercase">Thông tin sẽ được xác minh:</p>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Ngân hàng:</span> <span className="font-medium">{vietnamBanks.find(b => b.value === userData.bankName)?.label.split(' - ')[0] || userData.bankName}</span></p>
                  <p><span className="text-gray-500">Số TK:</span> <span className="font-medium font-mono">{userData.accountNumber}</span></p>
                  <p><span className="text-gray-500">Chủ TK:</span> <span className="font-medium">{userData.accountHolder}</span></p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseOtpModal}
                  disabled={otpModal.isVerifying}
                  className="flex-1"
                >
                  Hủy bỏ
                </Button>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={otpModal.otpValue.length !== 6 || otpModal.isVerifying || otpModal.countdown <= 0}
                  className="flex-1"
                >
                  {otpModal.isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang xác minh...
                    </>
                  ) : (
                    'Xác nhận'
                  )}
                </Button>
              </div>

              {/* Warning */}
              <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded">
                Sau khi xác minh, thông tin ngân hàng sẽ bị khóa vĩnh viễn
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
