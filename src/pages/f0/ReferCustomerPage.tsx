import { useState } from 'react';
import {
  UserPlus,
  Phone,
  Mail,
  MessageSquare,
  Send,
  ChevronRight,
  ChevronLeft,
  Check,
  Gift,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select } from '@/components/ui/select';

// Mock data for referral links
const mockReferralLinks = [
  { id: 1, name: 'Chiến dịch Tết 2025', code: 'tet2025' },
  { id: 2, name: 'Khuyến mãi Black Friday', code: 'blackfriday' },
  { id: 3, name: 'Ưu đãi sinh viên', code: 'student' },
  { id: 4, name: 'Khám mắt miễn phí', code: 'freeeye' },
];

// Mock data for recent referrals
const mockRecentReferrals = [
  {
    id: 1,
    name: 'Nguyễn Văn A',
    phone: '0901234567',
    email: 'nguyenvana@email.com',
    date: '2025-11-16',
    status: 'sent',
    voucherCode: 'VOUCHER001',
  },
  {
    id: 2,
    name: 'Trần Thị B',
    phone: '0912345678',
    email: 'tranthib@email.com',
    date: '2025-11-15',
    status: 'used',
    voucherCode: 'VOUCHER002',
  },
  {
    id: 3,
    name: 'Lê Văn C',
    phone: '0923456789',
    email: '',
    date: '2025-11-14',
    status: 'sent',
    voucherCode: 'VOUCHER003',
  },
  {
    id: 4,
    name: 'Phạm Thị D',
    phone: '0934567890',
    email: 'phamthid@email.com',
    date: '2025-11-13',
    status: 'used',
    voucherCode: 'VOUCHER004',
  },
  {
    id: 5,
    name: 'Hoàng Văn E',
    phone: '0945678901',
    email: '',
    date: '2025-11-12',
    status: 'sent',
    voucherCode: 'VOUCHER005',
  },
];

const ReferCustomerPage = () => {
  // Current step (1 or 2)
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Customer Information
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2: Send Voucher
  const [selectedLink, setSelectedLink] = useState('');
  const [sendMethod, setSendMethod] = useState<'sms' | 'email' | 'both'>('sms');
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate phone number (Vietnamese format)
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

  // Handle Step 1 validation and proceed to Step 2
  const handleNextStep = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên khách hàng';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Vui lòng nhập số điện thoại';
    } else if (!validatePhone(phoneNumber)) {
      newErrors.phoneNumber = 'Số điện thoại không hợp lệ (VD: 0901234567)';
    }

    if (email && !validateEmail(email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setCurrentStep(2);
    }
  };

  // Handle going back to Step 1
  const handlePreviousStep = () => {
    setCurrentStep(1);
    setIsSuccess(false);
  };

  // Handle sending voucher
  const handleSendVoucher = async () => {
    const newErrors: Record<string, string> = {};

    if (!selectedLink) {
      newErrors.selectedLink = 'Vui lòng chọn link giới thiệu';
    }

    if (sendMethod === 'email' && !email) {
      newErrors.sendMethod = 'Không thể gửi email vì khách hàng chưa có địa chỉ email';
    }

    if (sendMethod === 'both' && !email) {
      newErrors.sendMethod = 'Không thể gửi email vì khách hàng chưa có địa chỉ email';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSending(true);

      // Simulate API call
      setTimeout(() => {
        const code = `VOUCHER${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        setVoucherCode(code);
        setIsSending(false);
        setIsSuccess(true);
      }, 2000);
    }
  };

  // Reset form and start over
  const handleReset = () => {
    setCurrentStep(1);
    setFullName('');
    setPhoneNumber('');
    setEmail('');
    setNotes('');
    setSelectedLink('');
    setSendMethod('sms');
    setIsSuccess(false);
    setVoucherCode('');
    setErrors({});
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    return status === 'used' ? (
      <Badge variant="success">Đã sử dụng</Badge>
    ) : (
      <Badge variant="info">Đã gửi</Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Giới Thiệu Khách Hàng Mới</h1>
          <p className="text-gray-600">
            Nhập thông tin khách hàng và gửi voucher ưu đãi 200,000 VND
          </p>
        </div>

        {/* Step Indicator */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep >= 1
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > 1 ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <span
                className={`text-sm font-medium ${
                  currentStep >= 1 ? 'text-primary-500' : 'text-gray-600'
                }`}
              >
                Thông tin khách hàng
              </span>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400" />

            <div className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep >= 2
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                2
              </div>
              <span
                className={`text-sm font-medium ${
                  currentStep >= 2 ? 'text-primary-500' : 'text-gray-600'
                }`}
              >
                Gửi voucher
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Section */}
          <div className="lg:col-span-2">
            {/* Step 1: Customer Information */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary-500" />
                    Bước 1: Thông tin khách hàng
                  </CardTitle>
                  <CardDescription>
                    Nhập đầy đủ thông tin khách hàng để gửi voucher giới thiệu
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">
                      Họ và tên <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="Nhập họ tên khách hàng"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setErrors({ ...errors, fullName: '' });
                      }}
                      className={errors.fullName ? 'border-red-500' : ''}
                    />
                    {errors.fullName && (
                      <p className="text-xs text-red-500">{errors.fullName}</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">
                      Số điện thoại <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phoneNumber"
                        placeholder="0901234567"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          setErrors({ ...errors, phoneNumber: '' });
                        }}
                        className={`pl-10 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.phoneNumber && (
                      <p className="text-xs text-red-500">{errors.phoneNumber}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Định dạng: 10 số, bắt đầu bằng 0 hoặc +84
                    </p>
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

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Textarea
                        id="notes"
                        placeholder="Ghi chú về khách hàng, nguồn giới thiệu..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="pl-10"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Next Button */}
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleNextStep} className="gap-2">
                      Tiếp theo
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Send Voucher */}
            {currentStep === 2 && !isSuccess && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-primary-500" />
                    Bước 2: Gửi voucher
                  </CardTitle>
                  <CardDescription>Xác nhận thông tin và gửi voucher cho khách hàng</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Review Customer Info */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-gray-700">Thông tin khách hàng</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Họ tên:</span>
                        <p className="font-medium">{fullName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Số điện thoại:</span>
                        <p className="font-medium">{phoneNumber}</p>
                      </div>
                      {email && (
                        <div className="md:col-span-2">
                          <span className="text-gray-500">Email:</span>
                          <p className="font-medium">{email}</p>
                        </div>
                      )}
                      {notes && (
                        <div className="md:col-span-2">
                          <span className="text-gray-500">Ghi chú:</span>
                          <p className="font-medium text-gray-700">{notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Select Referral Link */}
                  <div className="space-y-2">
                    <Label htmlFor="referralLink">
                      Chọn link giới thiệu <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      id="referralLink"
                      value={selectedLink}
                      onChange={(e) => {
                        setSelectedLink(e.target.value);
                        setErrors({ ...errors, selectedLink: '' });
                      }}
                      className={errors.selectedLink ? 'border-red-500' : ''}
                    >
                      <option value="">-- Chọn link --</option>
                      {mockReferralLinks.map((link) => (
                        <option key={link.id} value={link.code}>
                          {link.name} ({link.code})
                        </option>
                      ))}
                    </Select>
                    {errors.selectedLink && (
                      <p className="text-xs text-red-500">{errors.selectedLink}</p>
                    )}
                  </div>

                  {/* Send Method Radio Buttons */}
                  <div className="space-y-2">
                    <Label>
                      Phương thức gửi <span className="text-red-500">*</span>
                    </Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="sendMethod"
                          value="sms"
                          checked={sendMethod === 'sms'}
                          onChange={(e) => {
                            setSendMethod(e.target.value as 'sms');
                            setErrors({ ...errors, sendMethod: '' });
                          }}
                          className="w-4 h-4 text-primary-500"
                        />
                        <Phone className="w-4 h-4 text-gray-600" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">SMS</p>
                          <p className="text-xs text-gray-500">Gửi mã voucher qua tin nhắn</p>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                          !email
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sendMethod"
                          value="email"
                          checked={sendMethod === 'email'}
                          onChange={(e) => {
                            setSendMethod(e.target.value as 'email');
                            setErrors({ ...errors, sendMethod: '' });
                          }}
                          disabled={!email}
                          className="w-4 h-4 text-primary-500"
                        />
                        <Mail className="w-4 h-4 text-gray-600" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Email</p>
                          <p className="text-xs text-gray-500">Gửi voucher qua email</p>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                          !email
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sendMethod"
                          value="both"
                          checked={sendMethod === 'both'}
                          onChange={(e) => {
                            setSendMethod(e.target.value as 'both');
                            setErrors({ ...errors, sendMethod: '' });
                          }}
                          disabled={!email}
                          className="w-4 h-4 text-primary-500"
                        />
                        <div className="flex gap-1">
                          <Phone className="w-4 h-4 text-gray-600" />
                          <Mail className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Cả hai</p>
                          <p className="text-xs text-gray-500">Gửi qua cả SMS và Email</p>
                        </div>
                      </label>
                    </div>
                    {errors.sendMethod && (
                      <p className="text-xs text-red-500">{errors.sendMethod}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={handlePreviousStep} className="gap-2">
                      <ChevronLeft className="w-4 h-4" />
                      Quay lại
                    </Button>
                    <Button
                      onClick={handleSendVoucher}
                      disabled={isSending}
                      className="flex-1 gap-2"
                    >
                      {isSending ? (
                        'Đang gửi...'
                      ) : (
                        <>
                          Gửi voucher
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Success State */}
            {currentStep === 2 && isSuccess && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-6 py-8">
                    <div className="flex justify-center">
                      <div className="bg-green-100 rounded-full p-4">
                        <Check className="w-12 h-12 text-green-600" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-gray-900">Gửi voucher thành công!</h3>
                      <p className="text-gray-600">
                        Voucher đã được gửi đến khách hàng <span className="font-semibold">{fullName}</span>
                      </p>
                    </div>

                    <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-6 max-w-md mx-auto">
                      <p className="text-sm text-primary-700 mb-2">Mã voucher</p>
                      <p className="text-3xl font-bold text-primary-600 tracking-wider">{voucherCode}</p>
                      <p className="text-xs text-primary-600 mt-2">Giá trị: 200,000 VND</p>
                    </div>

                    <Alert variant="info">
                      <AlertDescription>
                        Khách hàng sẽ nhận được thông tin voucher qua{' '}
                        {sendMethod === 'sms'
                          ? 'SMS'
                          : sendMethod === 'email'
                          ? 'Email'
                          : 'SMS và Email'}
                        . Voucher có hiệu lực trong 30 ngày.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" onClick={handlePreviousStep}>
                        Xem lại thông tin
                      </Button>
                      <Button onClick={handleReset} className="gap-2">
                        Giới thiệu khách hàng khác
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Voucher Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary-500" />
                  Voucher ưu đãi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg p-6 text-white shadow-lg">
                  <div className="text-center space-y-3">
                    <Gift className="w-12 h-12 mx-auto opacity-90" />
                    <div>
                      <p className="text-sm opacity-90">Giảm giá</p>
                      <p className="text-4xl font-bold">200,000₫</p>
                    </div>
                    <div className="border-t border-primary-400 pt-3">
                      <p className="text-xs opacity-90">Cho đơn hàng đầu tiên</p>
                      <p className="text-xs opacity-75 mt-1">Áp dụng tại tất cả cửa hàng</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Áp dụng cho khách hàng mới</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Hiệu lực 30 ngày</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Không giới hạn giá trị đơn hàng</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lưu ý</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p className="flex items-start gap-2">
                  <span className="text-primary-500 font-bold">•</span>
                  <span>Đảm bảo số điện thoại khách hàng chính xác để nhận SMS</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary-500 font-bold">•</span>
                  <span>Email là tùy chọn nhưng giúp gửi thông tin chi tiết hơn</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary-500 font-bold">•</span>
                  <span>Voucher chỉ áp dụng 1 lần cho mỗi khách hàng mới</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary-500 font-bold">•</span>
                  <span>Bạn sẽ nhận hoa hồng khi khách hàng sử dụng voucher</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Referrals Section */}
        <Card>
          <CardHeader>
            <CardTitle>Khách hàng giới thiệu gần đây</CardTitle>
            <CardDescription>5 khách hàng mới nhất bạn đã giới thiệu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockRecentReferrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-primary-100 rounded-full p-3">
                      <UserPlus className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{referral.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {referral.phone}
                        </p>
                        {referral.email && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {referral.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs text-gray-500">{formatDate(referral.date)}</p>
                    {getStatusBadge(referral.status)}
                    <p className="text-xs text-gray-600 font-mono">{referral.voucherCode}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReferCustomerPage;
