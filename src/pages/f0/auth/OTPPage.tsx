import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function OTPPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Contact information (can be passed via props or state management)
  const contactInfo = '0912***678'; // Example masked phone number
  const contactType = 'số điện thoại'; // or 'email'

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

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

    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      alert('Vui lòng nhập đầy đủ mã OTP');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      console.log('OTP submitted:', otpValue);
      // Handle successful verification
    }, 1500);
  };

  const handleResend = async () => {
    if (!canResend) return;

    setCanResend(false);
    setCountdown(60);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();

    // Simulate API call to resend OTP
    console.log('Resending OTP...');
    // Show success message
  };

  const isOtpComplete = otp.every(digit => digit !== '');

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
              Mã OTP đã được gửi đến {contactType} <span className="font-medium text-gray-900">{contactInfo}</span>
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* OTP Input Boxes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nhập mã OTP</label>
                <div className="flex justify-between gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className={cn(
                        'w-full h-12 text-center text-lg font-semibold rounded-md border bg-white',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                        'transition-colors',
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
                  disabled={!canResend}
                  className={cn(
                    'text-sm font-medium transition-colors',
                    canResend
                      ? 'text-primary-500 hover:underline cursor-pointer'
                      : 'text-gray-400 cursor-not-allowed'
                  )}
                >
                  {canResend ? (
                    'Gửi lại mã OTP'
                  ) : (
                    `Gửi lại sau ${countdown}s`
                  )}
                </button>
              </div>

              {/* Back to Login */}
              <div className="text-center pt-4 border-t">
                <a
                  href="/f0/auth/login"
                  className="text-sm text-gray-600 hover:text-primary-500 transition-colors"
                >
                  Quay lại đăng nhập
                </a>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
