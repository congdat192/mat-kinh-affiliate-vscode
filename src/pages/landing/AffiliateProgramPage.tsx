import { Link } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TIER_CONFIGS, VOUCHER_VALUE, MIN_WITHDRAWAL_AMOUNT, VOUCHER_EXPIRY_DAYS } from '@/lib/constants';
import { ArrowRight, Check, X, DollarSign, Users, Gift, TrendingUp } from 'lucide-react';

export default function AffiliateProgramPage() {
  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Chương Trình Đối Tác Affiliate
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Tìm hiểu chi tiết về cách thức hoạt động, chính sách hoa hồng và quy trình tham gia
            </p>
            <Link to="/f0/signup">
              <Button size="lg">
                Đăng Ký Ngay <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Program Overview */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Tổng Quan Chương Trình
              </h2>
              <p className="text-lg text-gray-600">
                Chương trình đối tác được thiết kế để mọi người đều có thể tham gia và kiếm thu nhập
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="text-center">
                <CardHeader>
                  <DollarSign className="w-12 h-12 mx-auto text-primary-500 mb-2" />
                  <CardTitle>Hoa Hồng Cao</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Lên đến 18% tổng giá trị đơn hàng</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <Users className="w-12 h-12 mx-auto text-primary-500 mb-2" />
                  <CardTitle>Không Giới Hạn</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Giới thiệu không giới hạn số lượng khách hàng</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <Gift className="w-12 h-12 mx-auto text-primary-500 mb-2" />
                  <CardTitle>Voucher Hấp Dẫn</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Khách hàng nhận {VOUCHER_VALUE.toLocaleString()}đ giảm giá</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <TrendingUp className="w-12 h-12 mx-auto text-primary-500 mb-2" />
                  <CardTitle>Thu Nhập Thụ Động</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Nhận hoa hồng trọn đời từ khách hàng</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Commission Structure */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Cơ Chế Hoa Hồng Chi Tiết
              </h2>
              <p className="text-lg text-gray-600">
                Hệ thống hoa hồng minh bạch, công bằng theo cấp bậc
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {Object.values(TIER_CONFIGS).map((tier) => (
                <Card key={tier.name} className={tier.name === 'diamond' ? 'border-2 border-primary-500' : ''}>
                  <CardHeader>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mb-2"
                      style={{ backgroundColor: tier.color }}
                    >
                      {tier.displayName[0]}
                    </div>
                    <CardTitle className="text-xl">{tier.displayName}</CardTitle>
                    <CardDescription>
                      {tier.minReferrals === 0 ? 'Từ ' : ''}{tier.minReferrals} - {tier.maxReferrals} khách hàng/quý
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Đơn hàng đầu tiên:</span>
                        <span className="font-bold text-primary-500">{tier.firstOrderCommission * 100}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Hoa hồng trọn đời:</span>
                        <span className="font-bold text-primary-500">
                          {tier.lifetimeCommission > 0 ? `${tier.lifetimeCommission * 100}%` : 'Không có'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Ví dụ tính hoa hồng:</p>
                      <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Đơn đầu (2tr):</span>
                          <span className="font-semibold">{(2000000 * tier.firstOrderCommission).toLocaleString()}đ</span>
                        </div>
                        {tier.lifetimeCommission > 0 && (
                          <div className="flex justify-between text-primary-600">
                            <span>Đơn sau (1tr):</span>
                            <span className="font-semibold">{(1000000 * tier.lifetimeCommission).toLocaleString()}đ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-primary-50 border-primary-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="text-primary-500" />
                  Lưu Ý Quan Trọng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-700">
                <p>• Tier được đánh giá và cập nhật <strong>mỗi quý</strong> (3 tháng)</p>
                <p>• Hoa hồng được tính ngay khi khách hàng thanh toán thành công</p>
                <p>• Hoa hồng trọn đời áp dụng cho <strong>TẤT CẢ</strong> đơn hàng sau đơn đầu tiên</p>
                <p>• Rút tiền tối thiểu: <strong>{MIN_WITHDRAWAL_AMOUNT.toLocaleString()}đ</strong></p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Registration Process */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Quy Trình Đăng Ký & Tham Gia
              </h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: 'Đăng Ký Tài Khoản',
                  description: 'Điền form đăng ký với thông tin cá nhân và tài khoản ngân hàng để nhận tiền',
                  duration: '5 phút'
                },
                {
                  step: 2,
                  title: 'Xác Thực Số Điện Thoại',
                  description: 'Nhập mã OTP được gửi qua SMS để xác thực tài khoản',
                  duration: '2 phút'
                },
                {
                  step: 3,
                  title: 'Chờ Phê Duyệt',
                  description: 'Admin sẽ xem xét và phê duyệt đơn đăng ký của bạn',
                  duration: '24-48 giờ'
                },
                {
                  step: 4,
                  title: 'Bắt Đầu Kiếm Tiền',
                  description: 'Sau khi được duyệt, tạo link giới thiệu và bắt đầu chia sẻ',
                  duration: 'Ngay lập tức'
                }
              ].map((item) => (
                <Card key={item.step} className="hover:shadow-md transition">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                          <span className="text-sm text-primary-500 font-medium">{item.duration}</span>
                        </div>
                        <p className="text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Yêu Cầu Tham Gia
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Check className="h-5 w-5" />
                    Cần Có
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {[
                      'Số điện thoại Việt Nam hợp lệ',
                      'Tài khoản ngân hàng để nhận tiền',
                      'Email để nhận thông báo',
                      'Tuổi từ 18 trở lên'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <X className="h-5 w-5" />
                    Không Cần
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {[
                      'Kinh nghiệm bán hàng',
                      'Vốn đầu tư ban đầu',
                      'Giấy phép kinh doanh',
                      'Kho hàng hoặc cửa hàng'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Voucher System */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Hệ Thống Voucher
              </h2>
              <p className="text-lg text-gray-600">
                Mỗi khách hàng mới nhận ngay voucher giảm giá hấp dẫn
              </p>
            </div>

            <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Thông Tin Voucher</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                        <span>Giá trị: <strong className="text-primary-600">{VOUCHER_VALUE.toLocaleString()}đ</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                        <span>Thời hạn: <strong>{VOUCHER_EXPIRY_DAYS} ngày</strong> kể từ khi nhận</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                        <span>Áp dụng cho <strong>đơn hàng đầu tiên</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                        <span>Mỗi khách hàng chỉ nhận <strong>1 lần</strong></span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Cách Hoạt Động</h3>
                    <ol className="space-y-3">
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                        <span>Bạn chia sẻ link giới thiệu</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                        <span>Khách hàng click vào link</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                        <span>Nhập số điện thoại nhận voucher</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                        <span>Sử dụng voucher khi mua hàng</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-500 to-primary-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Bạn Đã Sẵn Sàng Chưa?
          </h2>
          <p className="text-xl text-primary-50 mb-8 max-w-2xl mx-auto">
            Tham gia ngay hôm nay và bắt đầu hành trình kiếm thu nhập thụ động
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/f0/signup">
              <Button size="lg" variant="outline" className="bg-white text-primary-500 hover:bg-gray-100">
                Đăng Ký Ngay <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/voucher">
              <Button size="lg" className="bg-primary-700 hover:bg-primary-800 text-white">
                Nhận Voucher
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}
