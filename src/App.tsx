import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/toast';

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
import ResetPasswordPage from '@/pages/f0/auth/ResetPasswordPage';

// F0 Pages
import F0DashboardPage from '@/pages/f0/DashboardPage';
import CreateReferralLinkPage from '@/pages/f0/CreateReferralLinkPage';
import ReferCustomerPage from '@/pages/f0/ReferCustomerPage';
import ReferralHistoryPage from '@/pages/f0/ReferralHistoryPage';
import F0WithdrawalPage from '@/pages/f0/WithdrawalPage';
import ProfilePage from '@/pages/f0/ProfilePage';
import NotificationsPage from '@/pages/f0/NotificationsPage';

function App() {
  return (
    <ToastProvider>
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
        <Route path="/f0/auth/reset-password" element={<ResetPasswordPage />} />

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
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
