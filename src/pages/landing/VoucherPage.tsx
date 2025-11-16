import { useState } from 'react';
import LandingLayout from '@/components/layout/LandingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VOUCHER_VALUE, VOUCHER_EXPIRY_DAYS, BRAND_NAME } from '@/lib/constants';
import { Gift, Check, AlertCircle } from 'lucide-react';

export default function VoucherPage() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate phone
    const phoneRegex = /^(0|\+84)[0-9]{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      setError('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam.');
      return;
    }

    if (!name.trim()) {
      setError('Vui lòng nhập họ tên của bạn.');
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);

      // In real app, this would call API to create voucher
      console.log('Voucher request:', { phone, name });
    }, 1500);
  };

  if (submitted) {
    return (
      <LandingLayout>
        <section className="py-20 bg-gradient-to-br from-primary-50 to-primary-100 min-h-[80vh] flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card className="text-center">
                <CardHeader>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-12 h-12 text-green-500" />
                  </div>
                  <CardTitle className="text-3xl text-green-600">Thành Công!</CardTitle>
                  <CardDescription className="text-lg">
                    Voucher đã được gửi đến số điện thoại của bạn
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white p-8 rounded-lg">
                    <div className="text-sm font-medium mb-2">MÃ GIẢM GIÁ</div>
                    <div className="text-4xl font-bold mb-2">VOUCHER{Math.random().toString(36).substr(2, 6).toUpperCase()}</div>
                    <div className="text-2xl font-semibold">{VOUCHER_VALUE.toLocaleString()}đ</div>
                    <div className="text-sm mt-4 opacity-90">
                      Hiệu lực: {VOUCHER_EXPIRY_DAYS} ngày kể từ hôm nay
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                    <div className="flex gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-semibold mb-1">Lưu ý quan trọng:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Mã voucher đã được gửi qua SMS đến số điện thoại: <strong>{phone}</strong></li>
                          <li>Voucher chỉ áp dụng cho đơn hàng đầu tiên</li>
                          <li>Không áp dụng đồng thời với chương trình khuyến mãi khác</li>
                          <li>Liên hệ hotline nếu chưa nhận được mã</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => window.location.href = 'https://matkinhonline.com'}
                    >
                      Mua Hàng Ngay
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSubmitted(false);
                        setPhone('');
                        setName('');
                      }}
                    >
                      Nhận Voucher Cho Người Khác
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </LandingLayout>
    );
  }

  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Gift className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Nhận Voucher Giảm Giá {VOUCHER_VALUE.toLocaleString()}đ
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Dành cho khách hàng mới của {BRAND_NAME}
            </p>
            <p className="text-lg text-gray-500">
              Chỉ cần nhập số điện thoại, nhận ngay mã giảm giá!
            </p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Thông Tin Nhận Voucher</CardTitle>
                <CardDescription>
                  Vui lòng điền đầy đủ thông tin để nhận mã giảm giá
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Họ và Tên <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Số Điện Thoại <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0901234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Mã voucher sẽ được gửi qua SMS đến số điện thoại này
                    </p>
                  </div>

                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Check className="w-5 h-5 text-primary-500" />
                      Bạn sẽ nhận được:
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                        <span>Voucher giảm giá <strong>{VOUCHER_VALUE.toLocaleString()}đ</strong> cho đơn hàng đầu tiên</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                        <span>Mã voucher gửi ngay qua SMS</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                        <span>Thời hạn sử dụng: {VOUCHER_EXPIRY_DAYS} ngày</span>
                      </li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Đang xử lý...' : 'Nhận Voucher Ngay'}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Bằng việc nhấn "Nhận Voucher Ngay", bạn đồng ý với{' '}
                    <a href="#" className="text-primary-500 hover:underline">Điều khoản sử dụng</a>
                    {' '}và{' '}
                    <a href="#" className="text-primary-500 hover:underline">Chính sách bảo mật</a>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Tại Sao Chọn {BRAND_NAME}?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="text-center">
                <CardHeader>
                  <div className="text-4xl mb-2">✓</div>
                  <CardTitle>Sản Phẩm Chính Hãng</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    100% sản phẩm chính hãng, bảo hành toàn quốc
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="text-4xl mb-2">🚚</div>
                  <CardTitle>Giao Hàng Nhanh</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Giao hàng toàn quốc, nhanh chóng trong 2-3 ngày
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="text-4xl mb-2">💯</div>
                  <CardTitle>Đổi Trả Dễ Dàng</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Chính sách đổi trả trong vòng 7 ngày nếu có lỗi
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Câu Hỏi Thường Gặp
            </h2>

            <div className="space-y-4">
              {[
                {
                  q: 'Voucher có thời hạn bao lâu?',
                  a: `Voucher có hiệu lực ${VOUCHER_EXPIRY_DAYS} ngày kể từ ngày nhận. Vui lòng sử dụng trong thời gian này.`
                },
                {
                  q: 'Tôi có thể sử dụng voucher cho đơn hàng nào?',
                  a: 'Voucher chỉ áp dụng cho đơn hàng đầu tiên của bạn. Không giới hạn giá trị đơn hàng.'
                },
                {
                  q: 'Tôi chưa nhận được mã voucher?',
                  a: 'Vui lòng kiểm tra tin nhắn SMS hoặc liên hệ hotline để được hỗ trợ ngay lập tức.'
                },
                {
                  q: 'Tôi có thể nhận nhiều voucher không?',
                  a: 'Mỗi số điện thoại chỉ được nhận 1 voucher duy nhất cho chương trình này.'
                }
              ].map((faq, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.q}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{faq.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}
