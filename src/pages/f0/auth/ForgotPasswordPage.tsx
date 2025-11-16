import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');

  const detectContactType = (value: string) => {
    // Simple detection: if it's all digits and starts with 0, it's a phone number
    if (/^0\d+$/.test(value)) {
      setContactType('phone');
    } else {
      setContactType('email');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmailOrPhone(value);
    if (value) {
      detectContactType(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      console.log('Reset link sent to:', emailOrPhone);
    }, 1500);
  };

  const handleBackToLogin = () => {
    window.location.href = '/f0/auth/login';
  };

  const handleTryAgain = () => {
    setIsSuccess(false);
    setEmailOrPhone('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Name */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-500">F0 System</h1>
          <p className="text-gray-600 mt-2">Hệ thống quản lý affiliate</p>
        </div>

        <Card>
          {!isSuccess ? (
            <>
              <CardHeader>
                <CardTitle>Quên mật khẩu</CardTitle>
                <CardDescription>
                  Nhập email hoặc số điện thoại của bạn để nhận liên kết đặt lại mật khẩu
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  {/* Email/Phone Input */}
                  <div className="space-y-2">
                    <Label htmlFor="emailOrPhone">Email hoặc Số điện thoại</Label>
                    <Input
                      id="emailOrPhone"
                      type="text"
                      placeholder="Nhập email hoặc số điện thoại"
                      value={emailOrPhone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
                  </Button>

                  {/* Back to Login Link */}
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-primary-500 transition-colors py-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại đăng nhập
                  </button>
                </CardContent>
              </form>
            </>
          ) : (
            <>
              <CardHeader>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-green-600">Gửi thành công!</CardTitle>
                    <CardDescription className="mt-2">
                      {contactType === 'email' ? (
                        <>
                          Chúng tôi đã gửi liên kết đặt lại mật khẩu đến email{' '}
                          <span className="font-medium text-gray-900">{emailOrPhone}</span>
                        </>
                      ) : (
                        <>
                          Chúng tôi đã gửi mã đặt lại mật khẩu đến số điện thoại{' '}
                          <span className="font-medium text-gray-900">{emailOrPhone}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Lưu ý:</strong> Vui lòng kiểm tra{' '}
                    {contactType === 'email' ? 'hộp thư đến và thư mục spam' : 'tin nhắn SMS'}{' '}
                    của bạn. Liên kết sẽ hết hạn sau 15 phút.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600 text-center">
                    Không nhận được {contactType === 'email' ? 'email' : 'tin nhắn'}?
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleTryAgain}
                  >
                    Thử lại với {contactType === 'email' ? 'email' : 'số điện thoại'} khác
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-primary-500 transition-colors py-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại đăng nhập
                </button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
