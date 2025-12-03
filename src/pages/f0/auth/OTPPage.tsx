import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { CheckCircle } from 'lucide-react';

interface LocationState {
  record_id: string;
  phone: string;
  phone_masked: string;
  expires_in: number;
}

export default function OTPPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  // Use expires_in from server (default 300s = 5 minutes if not provided)
  const [countdown, setCountdown] = useState(state?.expires_in || 300);
  const [canResend, setCanResend] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no state
  useEffect(() => {
    if (!state?.record_id || !state?.phone) {
      navigate('/f0/auth/signup');
    }
  }, [state, navigate]);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0 && !isSuccess) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, isSuccess]);

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take only the last character
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Clear error when user types
    if (apiError) {
      setApiError('');
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);

    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setApiError('Vui lòng nhập đầy đủ mã OTP');
      return;
    }

    setIsLoading(true);

    try {
      // Call Edge Function to verify OTP
      const { data, error } = await supabase.functions.invoke('verify-otp-affiliate', {
        body: {
          record_id: state?.record_id,
          phone: state?.phone,
          otp: otpValue
        }
      });

      if (error) {
        throw new Error(error.message || 'Có lỗi xảy ra');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Xác thực thất bại');
      }

      // Success!
      setIsSuccess(true);
      setSuccessData(data.partner);

    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setApiError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !state || isResending) return;

    setIsResending(true);
    setApiError('');

    try {
      // Call Edge Function to resend OTP
      const { data, error } = await supabase.functions.invoke('send-otp-affiliate', {
        body: {
          phone: state.phone,
          resend: true,
          previous_record_id: state.record_id
        }
      });

      if (error) {
        throw new Error(error.message || 'Có lỗi xảy ra');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Không thể gửi lại OTP');
      }

      // Reset state with new record_id and countdown
      setCanResend(false);
      setCountdown(data.expires_in || 300);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

      // Update location state with new record_id
      navigate('/f0/auth/otp', {
        state: {
          record_id: data.record_id,
          phone: state.phone,
          phone_masked: state.phone_masked,
          expires_in: data.expires_in || 300
        },
        replace: true
      });

    } catch (err: any) {
      console.error('Resend OTP error:', err);
      setApiError(err.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.');
    } finally {
      setIsResending(false);
    }
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  // If no state, show nothing (will redirect)
  if (!state) {
    return null;
  }

  // Success screen
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Đăng ký thành công!</h2>
                <p className="text-gray-600">
                  Tài khoản của bạn đã được tạo và đang chờ phê duyệt từ quản trị viên.
                </p>

                {successData && (
                  <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
                    <p className="text-sm">
                      <span className="text-gray-500">Mã đối tác:</span>{' '}
                      <span className="font-medium">{successData.f0_code}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500">Họ tên:</span>{' '}
                      <span className="font-medium">{successData.full_name}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500">Email:</span>{' '}
                      <span className="font-medium">{successData.email}</span>
                    </p>
                  </div>
                )}

                <Alert variant="info">
                  <AlertDescription>
                    Bạn sẽ nhận được email thông báo khi tài khoản được phê duyệt.
                  </AlertDescription>
                </Alert>

                <Button
                  className="w-full"
                  onClick={() => navigate('/f0/auth/login')}
                >
                  Đến trang đăng nhập
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <CardTitle>Xác thực OTP</CardTitle>
            <CardDescription>
              Mã OTP đã được gửi đến số điện thoại{' '}
              <span className="font-medium text-gray-900">{state.phone_masked}</span>
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* API Error Alert */}
              {apiError && (
                <Alert variant="error">
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              )}

              {/* OTP Input Boxes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nhập mã OTP</label>
                <div className="flex justify-between gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      disabled={isLoading}
                      className={cn(
                        'w-full h-12 text-center text-lg font-semibold rounded-md border bg-white',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                        'transition-colors disabled:opacity-50',
                        digit ? 'border-primary-500' : 'border-gray-300'
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Verify Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isOtpComplete}
              >
                {isLoading ? 'Đang xác thực...' : 'Xác thực'}
              </Button>

              {/* Resend OTP */}
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Không nhận được mã?
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend || isLoading || isResending}
                  className={cn(
                    'text-sm font-medium transition-colors',
                    canResend && !isLoading && !isResending
                      ? 'text-primary-500 hover:underline cursor-pointer'
                      : 'text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isResending ? (
                    'Đang gửi lại...'
                  ) : canResend ? (
                    'Gửi lại mã OTP'
                  ) : (
                    `Gửi lại sau ${countdown}s`
                  )}
                </button>
              </div>

              {/* Back to Signup */}
              <div className="text-center pt-4 border-t">
                <a
                  href="/f0/auth/signup"
                  className="text-sm text-gray-600 hover:text-primary-500 transition-colors"
                >
                  Quay lại đăng ký
                </a>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
