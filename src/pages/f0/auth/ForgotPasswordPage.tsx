import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }

    if (!validateEmail(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setIsLoading(true);

    try {
      const baseUrl = window.location.origin;

      console.log('Sending forgot password request:', { email: email.trim().toLowerCase(), baseUrl });

      const { data, error: fnError } = await supabase.functions.invoke('forgot-password-affiliate', {
        body: { email: email.trim().toLowerCase(), baseUrl }
      });

      console.log('Response from Edge Function:', { data, fnError });

      if (fnError) {
        console.error('Edge Function error:', fnError);
        throw fnError;
      }

      if (!data.success) {
        // Handle specific error codes
        switch (data.error_code) {
          case 'EMAIL_NOT_FOUND':
            setError('Email này chưa được đăng ký trong hệ thống');
            break;
          case 'RATE_LIMIT':
            setError('Vui lòng đợi 1 phút trước khi yêu cầu lại');
            break;
          case 'EMAIL_SEND_FAILED':
            setError('Không thể gửi email. Vui lòng thử lại sau');
            break;
          default:
            setError(data.message || 'Có lỗi xảy ra');
        }
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Có lỗi xảy ra. Vui lòng thử lại sau');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    window.location.href = '/f0/auth/login';
  };

  const handleTryAgain = () => {
    setIsSuccess(false);
    setEmail('');
    setError('');
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
                  Nhập email của bạn để nhận liên kết đặt lại mật khẩu
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Nhập email đã đăng ký"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      Chúng tôi đã gửi liên kết đặt lại mật khẩu đến email{' '}
                      <span className="font-medium text-gray-900">{email}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Lưu ý:</strong> Vui lòng kiểm tra hộp thư đến và thư mục spam của bạn. Liên kết sẽ hết hạn sau 15 phút.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600 text-center">
                    Không nhận được email?
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleTryAgain}
                  >
                    Thử lại với email khác
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
