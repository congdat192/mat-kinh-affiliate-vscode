import { Link } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TIER_CONFIGS, BRAND_NAME } from '@/lib/constants';
import { FEATURES, HOW_IT_WORKS, FAQS, TESTIMONIALS } from '@/lib/mock/data';
import { ArrowRight, Check } from 'lucide-react';

export default function HomePage() {
  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Kiếm Thu Nhập Thụ Động Với
              <span className="text-primary-500"> {BRAND_NAME}</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Tham gia chương trình đối tác và nhận hoa hồng lên đến <strong>18%</strong> từ mỗi khách hàng bạn giới thiệu.
              Không cần vốn, không cần kinh nghiệm!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/f0/auth/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Đăng Ký Ngay <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/affiliate-program">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Tìm Hiểu Thêm
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-500">500+</div>
                <div className="text-sm text-gray-600 mt-1">Đối Tác</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-500">2000+</div>
                <div className="text-sm text-gray-600 mt-1">Khách Hàng</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-500">5 tỷ+</div>
                <div className="text-sm text-gray-600 mt-1">Hoa Hồng Đã Trả</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tại Sao Chọn Chương Trình Của Chúng Tôi?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Chúng tôi cung cấp hệ thống đối tác chuyên nghiệp nhất với lợi ích vượt trội
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition">
                <CardHeader>
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tier System Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Hệ Thống Cấp Bậc Đối Tác
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Càng giới thiệu nhiều, càng nhận được nhiều lợi ích và hoa hồng cao hơn
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {Object.values(TIER_CONFIGS).map((tier) => (
              <Card
                key={tier.name}
                className={`relative overflow-hidden hover:shadow-xl transition ${
                  tier.name === 'diamond' ? 'border-2 border-primary-500' : ''
                }`}
              >
                {tier.name === 'diamond' && (
                  <div className="absolute top-0 right-0 bg-primary-500 text-white px-3 py-1 text-xs font-semibold">
                    PHỔ BIẾN NHẤT
                  </div>
                )}
                <CardHeader className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                    style={{ backgroundColor: tier.color }}
                  >
                    {tier.displayName[0]}
                  </div>
                  <CardTitle className="text-2xl">{tier.displayName}</CardTitle>
                  <CardDescription className="text-base font-semibold">
                    {tier.minReferrals}-{tier.maxReferrals} khách/quý
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <div className="text-3xl font-bold text-primary-500">
                        {tier.firstOrderCommission * 100}%
                      </div>
                      <div className="text-sm text-gray-600">Hoa hồng đơn đầu</div>
                      {tier.lifetimeCommission > 0 && (
                        <>
                          <div className="text-2xl font-bold text-primary-500 mt-2">
                            +{tier.lifetimeCommission * 100}%
                          </div>
                          <div className="text-sm text-gray-600">Hoa hồng trọn đời</div>
                        </>
                      )}
                    </div>

                    <ul className="space-y-2">
                      {tier.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <Check className="h-5 w-5 text-primary-500 mr-2 flex-shrink-0" />
                          <span className="text-gray-700">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Cách Thức Hoạt Động
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              4 bước đơn giản để bắt đầu kiếm tiền
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {HOW_IT_WORKS.map((step) => (
                <div key={step.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Câu Chuyện Thành Công
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Nghe từ các đối tác đang kiếm thu nhập ổn định với chúng tôi
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TESTIMONIALS.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{testimonial.avatar}</div>
                    <div>
                      <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                      <CardDescription>Tier: {testimonial.tier}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 italic mb-4">"{testimonial.comment}"</p>
                  <div className="text-primary-500 font-bold">
                    Đã kiếm: {testimonial.earning}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Câu Hỏi Thường Gặp
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {FAQS.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-500 to-primary-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Sẵn Sàng Bắt Đầu Kiếm Tiền?
          </h2>
          <p className="text-xl text-primary-50 mb-8 max-w-2xl mx-auto">
            Tham gia hàng trăm đối tác đang kiếm thu nhập thụ động mỗi ngày với {BRAND_NAME}
          </p>
          <Link to="/f0/auth/signup">
            <Button size="lg" variant="outline" className="bg-white text-primary-500 hover:bg-gray-100">
              Đăng Ký Miễn Phí Ngay <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
}
