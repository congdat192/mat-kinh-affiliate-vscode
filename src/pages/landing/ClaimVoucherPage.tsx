import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Gift,
  Phone,
  Mail,
  User,
  Check,
  XCircle,
  Loader2,
  Search,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { customerService, type CheckCustomerResult } from '@/services/customerService';
import { affiliateCampaignService, type AffiliateCampaign } from '@/services/affiliateCampaignService';
import { BRAND_NAME } from '@/lib/constants';

const ClaimVoucherPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get ref and campaign from URL
  const refCode = searchParams.get('ref');
  const campaignCode = searchParams.get('campaign'); // This is campaign_code, not id

  // State
  const [campaign, setCampaign] = useState<AffiliateCampaign | null>(null);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
  const [customerCheckResult, setCustomerCheckResult] = useState<CheckCustomerResult | null>(null);
  const [isClaimingVoucher, setIsClaimingVoucher] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load campaign on mount
  useEffect(() => {
    if (campaignCode) {
      loadCampaign();
    } else {
      setIsLoadingCampaign(false);
    }
  }, [campaignCode]);

  const loadCampaign = async () => {
    setIsLoadingCampaign(true);
    try {
      // Query campaign by campaign_code (not id)
      const campaignData = await affiliateCampaignService.getCampaignByCode(campaignCode!);
      setCampaign(campaignData);
    } catch (error) {
      console.error('Error loading campaign:', error);
    } finally {
      setIsLoadingCampaign(false);
    }
  };

  // Validate phone number
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^(0|\+84)[0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // Validate email
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check customer type
  const handleCheckCustomer = async () => {
    setCustomerCheckResult(null);
    setErrors({});

    if (!phoneNumber.trim()) {
      setErrors({ phoneNumber: 'Vui lòng nhập số điện thoại' });
      return;
    }

    if (!validatePhone(phoneNumber)) {
      setErrors({ phoneNumber: 'Số điện thoại không hợp lệ (VD: 0901234567)' });
      return;
    }

    setIsCheckingCustomer(true);
    try {
      const result = await customerService.checkCustomerType(phoneNumber);
      setCustomerCheckResult(result);
    } catch (error) {
      setCustomerCheckResult({
        isValid: false,
        customerType: null,
        message: 'Lỗi khi kiểm tra khách hàng. Vui lòng thử lại.',
        phone: phoneNumber,
      });
    } finally {
      setIsCheckingCustomer(false);
    }
  };

  // Claim voucher
  const handleClaimVoucher = async () => {
    const newErrors: Record<string, string> = {};

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Vui lòng nhập số điện thoại';
    } else if (!validatePhone(phoneNumber)) {
      newErrors.phoneNumber = 'Số điện thoại không hợp lệ';
    }

    if (email && !validateEmail(email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!customerCheckResult) {
      newErrors.customerCheck = 'Vui lòng kiểm tra loại khách hàng trước';
    } else if (!customerCheckResult.isValid) {
      newErrors.customerCheck = 'Bạn không đủ điều kiện nhận voucher';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0 && refCode && campaignCode && campaign) {
      setIsClaimingVoucher(true);

      try {
        // TODO: Implement claim voucher via Edge Function
        // For now, generate a mock voucher code
        const mockVoucherCode = `VC-${Date.now().toString().slice(-8)}`;
        setVoucherCode(mockVoucherCode);
        setIsSuccess(true);

        // Log for debugging
        console.log('Claim voucher params:', {
          campaign_id: campaign.id,
          campaign_code: campaignCode,
          f0_code: refCode,
          f1_phone: phoneNumber,
          f1_name: fullName,
          f1_email: email,
        });
      } catch (error) {
        console.error('Error claiming voucher:', error);
        alert('Lỗi khi nhận voucher. Vui lòng thử lại.');
      } finally {
        setIsClaimingVoucher(false);
      }
    }
  };

  // Check if URL params are valid
  if (!refCode || !campaignCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Link không hợp lệ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Link giới thiệu không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ người giới thiệu để nhận link mới.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Về trang chủ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading campaign
  if (isLoadingCampaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Đang tải thông tin...</span>
        </div>
      </div>
    );
  }

  // Campaign not found
  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Campaign không tồn tại
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Campaign này không tồn tại hoặc đã bị vô hiệu hóa.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Về trang chủ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {BRAND_NAME}
          </h1>
          <p className="text-gray-600">
            Nhận voucher ưu đãi từ người giới thiệu
          </p>
        </div>

        {/* Success State */}
        {isSuccess ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center space-y-6 py-8">
                <div className="flex justify-center">
                  <div className="bg-green-100 rounded-full p-4">
                    <Check className="w-16 h-16 text-green-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Nhận voucher thành công!
                  </h2>
                  <p className="text-gray-600">
                    Voucher đã được gửi đến số điện thoại của bạn
                  </p>
                </div>

                <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-8 max-w-md mx-auto text-white shadow-lg">
                  <div className="space-y-4">
                    <Gift className="w-16 h-16 mx-auto opacity-90" />
                    <div>
                      <p className="text-sm opacity-90 mb-1">Mã voucher của bạn</p>
                      <p className="text-3xl font-bold tracking-wider">{voucherCode}</p>
                    </div>
                    <div className="border-t border-primary-400 pt-4">
                      <p className="text-lg font-bold mb-1">{campaign.name}</p>
                      <p className="text-sm opacity-90">Chiến dịch ưu đãi</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Voucher đã được gửi thành công!
                    Hãy sử dụng ngay để được giảm giá cho đơn hàng của bạn!
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3 justify-center pt-4">
                  <Button onClick={() => navigate('/')} variant="outline">
                    Về trang chủ
                  </Button>
                  <Button onClick={() => navigate('/voucher')}>
                    Xem chi tiết voucher
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campaign Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary-500" />
                  Thông tin ưu đãi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg p-6 text-white shadow-lg mb-4">
                  <div className="text-center space-y-3">
                    <Gift className="w-12 h-12 mx-auto opacity-90" />
                    <div>
                      <p className="text-sm opacity-90">Chiến dịch</p>
                      <p className="text-2xl font-bold">{campaign.name}</p>
                    </div>
                    {campaign.voucher_image_url && (
                      <div className="border-t border-primary-400 pt-3">
                        <img
                          src={campaign.voucher_image_url}
                          alt="Voucher"
                          className="w-full rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <p className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Áp dụng cho khách hàng mới</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Dùng cho đơn hàng đầu tiên</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Không giới hạn giá trị đơn hàng</span>
                  </p>
                </div>

                {campaign.description && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">{campaign.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Claim Form */}
            <Card>
              <CardHeader>
                <CardTitle>Nhận voucher ngay</CardTitle>
                <CardDescription>
                  Nhập thông tin để nhận mã voucher ưu đãi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">
                    Số điện thoại <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phoneNumber"
                        placeholder="0901234567"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          setErrors({ ...errors, phoneNumber: '', customerCheck: '' });
                          setCustomerCheckResult(null);
                        }}
                        className={`pl-10 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                        disabled={isCheckingCustomer}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCheckCustomer}
                      disabled={isCheckingCustomer || !phoneNumber}
                      className="shrink-0"
                    >
                      {isCheckingCustomer ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Đang kiểm tra...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Kiểm tra
                        </>
                      )}
                    </Button>
                  </div>
                  {errors.phoneNumber && (
                    <p className="text-xs text-red-500">{errors.phoneNumber}</p>
                  )}

                  {/* Customer Check Result */}
                  {customerCheckResult && (
                    <Alert variant={customerCheckResult.isValid ? 'success' : 'error'}>
                      {customerCheckResult.isValid ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <AlertDescription className="ml-2">
                        <p className="font-medium">{customerCheckResult.message}</p>
                        {customerCheckResult.customerType && (
                          <p className="text-xs mt-1">
                            Loại khách hàng: <strong>{customerCheckResult.customerType === 'new' ? 'Khách hàng mới' : 'Khách hàng cũ'}</strong>
                          </p>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {errors.customerCheck && (
                    <p className="text-xs text-red-500">{errors.customerCheck}</p>
                  )}
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên (tùy chọn)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="fullName"
                      placeholder="Nhập họ tên của bạn"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email (tùy chọn)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrors({ ...errors, email: '' });
                      }}
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* Claim Button */}
                <Button
                  className="w-full"
                  onClick={handleClaimVoucher}
                  disabled={isClaimingVoucher || !customerCheckResult?.isValid}
                >
                  {isClaimingVoucher ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      Nhận voucher ngay
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimVoucherPage;
