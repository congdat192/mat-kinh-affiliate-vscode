import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BRAND_NAME, COMPANY_INFO } from '@/lib/constants';

interface LandingLayoutProps {
  children: React.ReactNode;
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                MK
              </div>
              <span className="text-xl font-bold text-gray-900">{BRAND_NAME}</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-600 hover:text-primary-500 transition">
                Trang Chủ
              </Link>
              <Link to="/affiliate-program" className="text-gray-600 hover:text-primary-500 transition">
                Chương Trình
              </Link>
              <Link to="/voucher" className="text-gray-600 hover:text-primary-500 transition">
                Nhận Voucher
              </Link>
              <div className="flex items-center space-x-3">
                <Link to="/f0/auth/login">
                  <Button variant="outline" size="sm">
                    Đăng Nhập
                  </Button>
                </Link>
                <Link to="/f0/auth/signup">
                  <Button size="sm">
                    Đăng Ký Ngay
                  </Button>
                </Link>
              </div>
            </nav>

            {/* Mobile menu button */}
            <button className="md:hidden p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold">
                  MK
                </div>
                <span className="text-white font-bold text-lg">{BRAND_NAME}</span>
              </div>
              <p className="text-sm text-gray-400">
                Chương trình đối tác chính thức của {BRAND_NAME}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Liên Kết</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/" className="hover:text-primary-400 transition">Trang Chủ</Link>
                </li>
                <li>
                  <Link to="/affiliate-program" className="hover:text-primary-400 transition">Chương Trình</Link>
                </li>
                <li>
                  <Link to="/voucher" className="hover:text-primary-400 transition">Nhận Voucher</Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-white font-semibold mb-4">Hỗ Trợ</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-primary-400 transition">Câu Hỏi Thường Gặp</a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary-400 transition">Điều Khoản</a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary-400 transition">Chính Sách</a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-semibold mb-4">Liên Hệ</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <span>📞</span>
                  <span>{COMPANY_INFO.phone}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>📧</span>
                  <span>{COMPANY_INFO.email}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>📍</span>
                  <span>{COMPANY_INFO.address}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 {BRAND_NAME}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
