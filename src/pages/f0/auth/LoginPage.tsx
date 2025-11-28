import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setPendingApproval(false);
    setIsLoading(true);

    try {
      // Call Edge Function to login
      const { data, error } = await supabase.functions.invoke('login-affiliate', {
        body: {
          email_or_phone: formData.emailOrPhone,
          password: formData.password
        }
      });

      // Network or connection error
      if (error) {
        console.error('Supabase invoke error:', error);
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      }

      // Edge Function returned error (success: false)
      if (!data?.success) {
        // Use error message directly from Edge Function (already in Vietnamese)
        const errorMessage = data?.error || 'Đăng nhập thất bại';
        console.log('Login failed:', data?.error_code, errorMessage);
        throw new Error(errorMessage);
      }

      // Check approval status
      if (data.approval_status === 'pending') {
        setPendingApproval(true);
        // Store user data temporarily for display
        localStorage.setItem('f0_pending_user', JSON.stringify(data.user));
        return;
      }

      // Login successful - store user data and navigate to dashboard
      if (rememberMe) {
        localStorage.setItem('f0_user', JSON.stringify(data.user));
      } else {
        sessionStorage.setItem('f0_user', JSON.stringify(data.user));
      }

      // Navigate to dashboard
      navigate('/f0/dashboard');

    } catch (err: any) {
      console.error('Login error:', err);
      setApiError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear errors when user types
    if (apiError) {
      setApiError('');
    }
    if (pendingApproval) {
      setPendingApproval(false);
    }
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
          <CardHeader>
            <CardTitle>Đăng nhập</CardTitle>
            <CardDescription>
              Đăng nhập vào tài khoản của bạn để tiếp tục
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* API Error Alert */}
              {apiError && (
                <Alert variant="error">
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              )}

              {/* Pending Approval Message */}
              {pendingApproval && (
                <Alert variant="warning">
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Tài khoản đang chờ phê duyệt</p>
                      <p className="text-sm">
                        Tài khoản của bạn đã được tạo thành công nhưng đang chờ phê duyệt từ quản trị viên.
                        Bạn sẽ nhận được email thông báo khi tài khoản được phê duyệt.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Email/Phone Input */}
              <div className="space-y-2">
                <Label htmlFor="emailOrPhone">Email hoặc Số điện thoại</Label>
                <Input
                  id="emailOrPhone"
                  name="emailOrPhone"
                  type="text"
                  placeholder="Nhập email hoặc số điện thoại"
                  value={formData.emailOrPhone}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Ghi nhớ đăng nhập
                  </Label>
                </div>
                <a
                  href="/f0/auth/forgot-password"
                  className="text-sm text-primary-500 hover:underline"
                >
                  Quên mật khẩu?
                </a>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </CardContent>

            <CardFooter className="flex justify-center">
              <p className="text-sm text-gray-600">
                Chưa có tài khoản?{' '}
                <a
                  href="/f0/auth/signup"
                  className="text-primary-500 hover:underline font-medium"
                >
                  Đăng ký ngay
                </a>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
