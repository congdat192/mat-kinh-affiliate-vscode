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
  Copy,
  Download,
  Home,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { validateCustomerForAffiliate, issueVoucherForF1, type AffiliateCustomerValidationResult } from '@/services/customerService';
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
  const [customerCheckResult, setCustomerCheckResult] = useState<AffiliateCustomerValidationResult | null>(null);
  const [isClaimingVoucher, setIsClaimingVoucher] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherExpiry, setVoucherExpiry] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [claimError, setClaimError] = useState('');
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

  // Check customer type using direct Supabase query (no OAuth needed)
  const handleCheckCustomer = async () => {
    setCustomerCheckResult(null);
    setClaimError('');
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
      const result = await validateCustomerForAffiliate(phoneNumber);
      setCustomerCheckResult(result);
    } catch (error) {
      setCustomerCheckResult({
        success: false,
        error: 'Lỗi khi kiểm tra khách hàng. Vui lòng thử lại.',
        error_code: 'SYSTEM_ERROR',
      });
    } finally {
      setIsCheckingCustomer(false);
    }
  };

  // Check if customer is eligible (new customer)
  const isEligible = customerCheckResult?.success && customerCheckResult?.customer_type === 'new';

  // Claim voucher via Edge Function claim-voucher-affiliate
  const handleClaimVoucher = async () => {
    const newErrors: Record<string, string> = {};
    setClaimError('');

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
    } else if (!isEligible) {
      newErrors.customerCheck = 'Bạn không đủ điều kiện nhận voucher';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0 && refCode && campaignCode && campaign) {
      setIsClaimingVoucher(true);

      try {
        // Call Edge Function to issue voucher
        const result = await issueVoucherForF1({
          campaignCode: campaignCode,
          recipientPhone: phoneNumber,
          f0Code: refCode,
        });

        if (result.success) {
          setVoucherCode(result.voucher_code || '');
          setVoucherExpiry(result.expired_at || '');
          setIsSuccess(true);
        } else {
          // Show error from Edge Function
          setClaimError(result.error || 'Không thể nhận voucher. Vui lòng thử lại.');
        }
      } catch (error) {
        console.error('Error claiming voucher:', error);
        setClaimError('Lỗi hệ thống. Vui lòng thử lại sau.');
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
          <Card className="max-w-lg mx-auto shadow-xl">
            <CardContent className="pt-6">
              <div className="text-center space-y-5">
                {/* Success Icon */}
                <div className="flex justify-center">
                  <div className="bg-green-100 rounded-full p-3">
                    <Check className="w-10 h-10 text-green-600" />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Nhận voucher thành công!
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Voucher đã được gửi đến số điện thoại của bạn
                  </p>
                </div>

                {/* Voucher Card */}
                <div
                  id="voucher-card"
                  className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white shadow-lg"
                >
                  <div className="space-y-3">
                    <Gift className="w-10 h-10 mx-auto opacity-90" />
                    <div>
                      <p className="text-xs opacity-80">Mã voucher</p>
                      <p className="text-2xl font-bold tracking-widest mt-1">{voucherCode}</p>
                    </div>
                    <div className="border-t border-white/30 pt-3 text-sm">
                      <p className="font-semibold">{campaign.affiliate_name || campaign.name}</p>
                      {voucherExpiry && (
                        <p className="text-xs opacity-80 mt-1">
                          HSD: {new Date(voucherExpiry).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(voucherCode);
                      toast.success('Đã sao chép mã voucher!');
                    }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Sao chép mã
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Save voucher info as image using canvas
                      const canvas = document.createElement('canvas');
                      canvas.width = 400;
                      canvas.height = 250;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        // Background gradient
                        const gradient = ctx.createLinearGradient(0, 0, 400, 250);
                        gradient.addColorStop(0, '#16a34a');
                        gradient.addColorStop(1, '#15803d');
                        ctx.fillStyle = gradient;
                        ctx.fillRect(0, 0, 400, 250);

                        // Text
                        ctx.fillStyle = 'white';
                        ctx.textAlign = 'center';

                        ctx.font = 'bold 14px Arial';
                        ctx.fillText('MÃ VOUCHER', 200, 50);

                        ctx.font = 'bold 32px Arial';
                        ctx.fillText(voucherCode, 200, 100);

                        ctx.font = '16px Arial';
                        ctx.fillText(campaign.affiliate_name || campaign.name || '', 200, 150);

                        if (voucherExpiry) {
                          ctx.font = '12px Arial';
                          ctx.fillText(`HSD: ${new Date(voucherExpiry).toLocaleDateString('vi-VN')}`, 200, 180);
                        }

                        ctx.font = '11px Arial';
                        ctx.fillText(BRAND_NAME, 200, 220);

                        // Download
                        const link = document.createElement('a');
                        link.download = `voucher-${voucherCode}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                        toast.success('Đã lưu ảnh voucher!');
                      }
                    }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Lưu ảnh
                  </Button>
                </div>

                {/* Tips */}
                <div className="bg-green-50 rounded-lg p-3 text-left">
                  <p className="text-xs text-green-800 font-medium mb-1">Lưu ý:</p>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• Sao chép hoặc lưu ảnh mã voucher để sử dụng khi mua hàng</li>
                    <li>• Voucher chỉ áp dụng cho đơn hàng đầu tiên</li>
                    <li>• Liên hệ hotline nếu cần hỗ trợ</li>
                  </ul>
                </div>

                {/* Home Button */}
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Về trang chủ
                </Button>
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
                      <p className="text-2xl font-bold">{campaign.affiliate_name || campaign.name}</p>
                    </div>
                    {campaign.affiliate_voucher_image_url && (
                      <div className="border-t border-primary-400 pt-3">
                        <img
                          src={campaign.affiliate_voucher_image_url}
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

                {campaign.affiliate_description && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">{campaign.affiliate_description}</p>
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
                    <Alert variant={isEligible ? 'success' : 'error'}>
                      <AlertDescription>
                        {customerCheckResult.success ? (
                          <>
                            <p className="font-medium">
                              {customerCheckResult.customer_type === 'new'
                                ? 'Khách hàng mới - Hợp lệ nhận voucher'
                                : 'Khách hàng cũ - Không thể nhận voucher qua chương trình này'}
                            </p>
                            {customerCheckResult.customer_name && (
                              <p className="text-xs mt-1 opacity-80">Họ tên: {customerCheckResult.customer_name}</p>
                            )}
                          </>
                        ) : (
                          <p className="font-medium">{customerCheckResult.error}</p>
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

                {/* Claim Error */}
                {claimError && (
                  <Alert variant="error">
                    <AlertDescription>
                      <p className="font-medium">{claimError}</p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Claim Button */}
                <Button
                  className="w-full"
                  onClick={handleClaimVoucher}
                  disabled={isClaimingVoucher || !isEligible}
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
