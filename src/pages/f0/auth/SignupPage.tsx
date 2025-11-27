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

export default function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
  });

  const validatePhoneNumber = (phone: string) => {
    // Vietnamese phone number validation: starts with 0 and has 10 digits
    const phoneRegex = /^0[0-9]{9}$/;
    return phoneRegex.test(phone);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên';
    }

    if (!validatePhoneNumber(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (!agreeToTerms) {
      newErrors.terms = 'Bạn phải đồng ý với điều khoản và điều kiện';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Call Edge Function to send OTP
      const { data, error } = await supabase.functions.invoke('send-otp-affiliate', {
        body: {
          phone: formData.phone,
          email: formData.email,
          full_name: formData.fullName,
          password: formData.password,
          referral_code: formData.referralCode || null
        }
      });

      if (error) {
        throw new Error(error.message || 'Có lỗi xảy ra');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Không thể gửi OTP');
      }

      // Navigate to OTP page with record_id and phone
      navigate('/f0/auth/otp', {
        state: {
          record_id: data.record_id,
          phone: formData.phone,
          phone_masked: data.phone_masked,
          expires_in: data.expires_in
        }
      });

    } catch (err: any) {
      console.error('Signup error:', err);
      setApiError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Clear API error when user makes changes
    if (apiError) {
      setApiError('');
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
            <CardTitle>Đăng ký tài khoản</CardTitle>
            <CardDescription>
              Tạo tài khoản mới để bắt đầu sử dụng
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

              {/* Full Name Input */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className={errors.fullName ? 'border-red-500' : ''}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-500">{errors.fullName}</p>
                )}
              </div>

              {/* Phone Number Input */}
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Nhập số điện thoại (VD: 0912345678)"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Nhập email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Referral Code Input (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="referralCode">Mã giới thiệu (nếu có)</Label>
                <Input
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  placeholder="Nhập mã giới thiệu"
                  value={formData.referralCode}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              {/* Terms & Conditions */}
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="agreeToTerms"
                    checked={agreeToTerms}
                    onChange={(e) => {
                      setAgreeToTerms(e.target.checked);
                      if (errors.terms) {
                        setErrors(prev => ({ ...prev, terms: '' }));
                      }
                    }}
                    className="mt-1"
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="agreeToTerms"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Tôi đồng ý với{' '}
                    <a
                      href="/terms"
                      className="text-primary-500 hover:underline"
                      target="_blank"
                    >
                      Điều khoản và Điều kiện
                    </a>
                  </Label>
                </div>
                {errors.terms && (
                  <p className="text-sm text-red-500">{errors.terms}</p>
                )}
              </div>

              {/* Signup Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Đang gửi OTP...' : 'Đăng ký'}
              </Button>
            </CardContent>

            <CardFooter className="flex justify-center">
              <p className="text-sm text-gray-600">
                Đã có tài khoản?{' '}
                <a
                  href="/f0/auth/login"
                  className="text-primary-500 hover:underline font-medium"
                >
                  Đăng nhập
                </a>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
