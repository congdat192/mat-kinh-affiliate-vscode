import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ShoppingCart,
  DollarSign,
  Wallet,
  Gift,
  BarChart3,
  Settings,
  Shield,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BRAND_NAME } from '@/lib/constants';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Quản Lý F0', href: '/admin/partners', icon: Users },
  { name: 'Quản Lý F1', href: '/admin/customers', icon: UserCheck },
  { name: 'Quản Lý Đơn Hàng', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Quản Lý Hoa Hồng', href: '/admin/commissions', icon: DollarSign },
  { name: 'Yêu Cầu Rút Tiền', href: '/admin/withdrawals', icon: Wallet },
  { name: 'Quản Lý Voucher', href: '/admin/vouchers', icon: Gift },
  { name: 'Báo Cáo & Thống Kê', href: '/admin/reports', icon: BarChart3 },
  { name: 'Cài Đặt Hệ Thống', href: '/admin/settings', icon: Settings },
  { name: 'Quản Lý Admin', href: '/admin/admins', icon: Shield },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();

  // Mock admin data
  const admin = {
    name: 'Admin User',
    email: 'admin@matkinhtamduc.com',
    role: 'Super Admin',
    avatar: null
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary-500" />
              <div>
                <span className="text-lg font-bold text-white">{BRAND_NAME}</span>
                <p className="text-xs text-gray-400">Admin Panel</p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Admin section */}
          <div className="border-t border-gray-800 p-4">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                {admin.name.charAt(0)}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">{admin.name}</p>
                <p className="text-xs text-gray-400">{admin.role}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="mt-2 space-y-1">
                <Link
                  to="/admin/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Cài đặt
                </Link>
                <button
                  onClick={() => {
                    // Handle logout
                    console.log('Logout');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 mr-4"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          {/* Notifications */}
          <button className="relative p-2 text-gray-500 hover:text-gray-700">
            <Bell className="h-6 w-6" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </button>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
