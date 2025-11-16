import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Landing Pages
import HomePage from '@/pages/landing/HomePage';
import AffiliateProgramPage from '@/pages/landing/AffiliateProgramPage';
import VoucherPage from '@/pages/landing/VoucherPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Pages */}
        <Route path="/" element={<HomePage />} />
        <Route path="/affiliate-program" element={<AffiliateProgramPage />} />
        <Route path="/voucher" element={<VoucherPage />} />

        {/* F0 Pages - Will be added later */}
        {/* <Route path="/f0/*" element={<F0Routes />} /> */}

        {/* Admin Pages - Will be added later */}
        {/* <Route path="/admin/*" element={<AdminRoutes />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
