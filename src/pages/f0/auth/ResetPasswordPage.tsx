import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft, AlertCircle, Eye, EyeOff, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isInvalidToken, setIsInvalidToken] = useState(false);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get token from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');

    if (!tokenParam) {
      setIsInvalidToken(true);
    } else {
      setToken(tokenParam);
    }
  }, []);

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password
    if (!password) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (!validatePassword(password)) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('reset-password-affiliate', {
        body: { token, new_password: password }
      });

      if (fnError) {
        throw fnError;
      }

      if (!data.success) {
        // Handle specific error codes
        switch (data.error_code) {
          case 'INVALID_TOKEN':
            setError('Liên kết không hợp lệ hoặc đã hết hạn');
            break;
          case 'TOKEN_USED':
            setError('Liên kết này đã được sử dụng. Vui lòng yêu cầu liên kết mới');
            break;
          case 'TOKEN_EXPIRED':
            setError('Liên kết đã hết hạn. Vui lòng yêu cầu liên kết mới');
            break;
          case 'WEAK_PASSWORD':
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            break;
          default:
            setError(data.message || 'Có lỗi xảy ra');
        }
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Có lỗi xảy ra. Vui lòng thử lại sau');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    window.location.href = '/f0/auth/login';
  };

  const handleRequestNewLink = () => {
    window.location.href = '/f0/auth/forgot-password';
  };

  // Invalid/missing token screen
  if (isInvalidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-500">F0 System</h1>
            <p className="text-gray-600 mt-2">Hệ thống quản lý affiliate</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-600">Liên kết không hợp lệ</CardTitle>
                  <CardDescription className="mt-2">
                    Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Button
                type="button"
                className="w-full"
                onClick={handleRequestNewLink}
              >
                Yêu cầu liên kết mới
              </Button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-primary-500 transition-colors py-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại đăng nhập
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success screen
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-500">F0 System</h1>
            <p className="text-gray-600 mt-2">Hệ thống quản lý affiliate</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-green-600">Đặt lại mật khẩu thành công!</CardTitle>
                  <CardDescription className="mt-2">
                    Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Button
                type="button"
                className="w-full"
                onClick={handleBackToLogin}
              >
                Đăng nhập ngay
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-500">F0 System</h1>
          <p className="text-gray-600 mt-2">Hệ thống quản lý affiliate</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Đặt lại mật khẩu</CardTitle>
            <CardDescription>
              Nhập mật khẩu mới cho tài khoản của bạn
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

              {/* New Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu mới</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
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
        </Card>
      </div>
    </div>
  );
}
