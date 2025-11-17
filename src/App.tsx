import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Landing Pages
import HomePage from '@/pages/landing/HomePage';
import AffiliateProgramPage from '@/pages/landing/AffiliateProgramPage';
import ClaimVoucherPage from '@/pages/landing/ClaimVoucherPage';

// F0 Layout
import F0Layout from '@/components/layout/F0Layout';

// F0 Auth Pages
import LoginPage from '@/pages/f0/auth/LoginPage';
import SignupPage from '@/pages/f0/auth/SignupPage';
import OTPPage from '@/pages/f0/auth/OTPPage';
import ForgotPasswordPage from '@/pages/f0/auth/ForgotPasswordPage';

// F0 Pages
import F0DashboardPage from '@/pages/f0/DashboardPage';
import CreateReferralLinkPage from '@/pages/f0/CreateReferralLinkPage';
import ReferCustomerPage from '@/pages/f0/ReferCustomerPage';
import ReferralHistoryPage from '@/pages/f0/ReferralHistoryPage';
import F0WithdrawalPage from '@/pages/f0/WithdrawalPage';
import ProfilePage from '@/pages/f0/ProfilePage';
import NotificationsPage from '@/pages/f0/NotificationsPage';

// Admin Layout
import AdminLayout from '@/components/layout/AdminLayout';

// Admin Pages
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import PartnersPage from '@/pages/admin/PartnersPage';
import CustomersPage from '@/pages/admin/CustomersPage';
import OrdersPage from '@/pages/admin/OrdersPage';
import CommissionsPage from '@/pages/admin/CommissionsPage';
import AdminWithdrawalsPage from '@/pages/admin/WithdrawalsPage';
import VouchersPage from '@/pages/admin/VouchersPage';
import CampaignsPage from '@/pages/admin/CampaignsPage';
import F0AssignmentsPage from '@/pages/admin/F0AssignmentsPage';
import ReportsPage from '@/pages/admin/ReportsPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import AdminsPage from '@/pages/admin/AdminsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Pages */}
        <Route path="/" element={<HomePage />} />
        <Route path="/affiliate-program" element={<AffiliateProgramPage />} />
        <Route path="/claim-voucher" element={<ClaimVoucherPage />} />

        {/* F0 Auth Pages (No Layout) */}
        <Route path="/f0/auth/login" element={<LoginPage />} />
        <Route path="/f0/auth/signup" element={<SignupPage />} />
        <Route path="/f0/auth/otp" element={<OTPPage />} />
        <Route path="/f0/auth/forgot-password" element={<ForgotPasswordPage />} />

        {/* F0 Pages (With Layout) */}
        <Route path="/f0" element={<F0Layout />}>
          <Route path="dashboard" element={<F0DashboardPage />} />
          <Route path="create-link" element={<CreateReferralLinkPage />} />
          <Route path="refer-customer" element={<ReferCustomerPage />} />
          <Route path="referral-history" element={<ReferralHistoryPage />} />
          <Route path="withdrawal" element={<F0WithdrawalPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* Admin Pages (With Layout) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="commissions" element={<CommissionsPage />} />
          <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="f0-assignments" element={<F0AssignmentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admins" element={<AdminsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
