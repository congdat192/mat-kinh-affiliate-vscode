# Mắt Kính Tâm Đức - Affiliate Marketing System

Hệ thống quản lý chương trình đối tác (affiliate marketing) cho công ty Mắt Kính Tâm Đức.

## 🎯 Tổng Quan

Hệ thống bao gồm 3 modules chính:
- **Landing Pages**: Giới thiệu chương trình và thu hút đối tác
- **F0 System**: Dashboard và quản lý cho đối tác
- **Admin System**: Quản trị toàn bộ hệ thống

## 🚀 Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Routing**: React Router v6
- **State Management**: TanStack Query + Zustand (sẽ thêm)
- **Backend**: Supabase (sẽ tích hợp)
- **Deployment**: Vercel

## 📦 Cài Đặt

```bash
# Clone repository
git clone <repository-url>
cd mat-kinh-affiliate-vscode

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build cho production
npm run build

# Preview production build
npm run preview
```

## 🎨 Landing Pages (Đã Hoàn Thành)

### 1. Homepage (/)
- Hero section với CTA
- Giới thiệu chương trình đối tác
- Hệ thống tier (Silver/Gold/Diamond)
- Cách thức hoạt động
- Testimonials
- FAQ section

### 2. Affiliate Program (/affiliate-program)
- Chi tiết về chương trình
- Cơ chế hoa hồng theo tier
- Quy trình đăng ký
- Yêu cầu tham gia
- Hệ thống voucher

### 3. Voucher Page (/voucher)
- Form nhập thông tin nhận voucher
- Validation số điện thoại
- Success page với mã voucher
- FAQ về voucher

## 📋 Roadmap

### Phase 1: Landing Pages ✅ (Hoàn Thành)
- [x] Setup project (Vite + React + TypeScript)
- [x] Configure Tailwind CSS + shadcn/ui
- [x] Create layout components
- [x] Build Homepage
- [x] Build Affiliate Program page
- [x] Build Voucher page

### Phase 2: F0 System (Tiếp Theo)
- [ ] Authentication pages (Login, Signup, OTP)
- [ ] Dashboard với statistics
- [ ] Referral link generator
- [ ] Customer referral form
- [ ] Referral history table
- [ ] Withdrawal requests
- [ ] Profile management
- [ ] Notifications

### Phase 3: Admin System
- [ ] Admin dashboard
- [ ] F0 management
- [ ] Approve affiliates
- [ ] Referral management
- [ ] Voucher management
- [ ] Withdrawal processing
- [ ] Activity logs
- [ ] System settings
- [ ] Reporting & analytics

### Phase 4: Backend Integration
- [ ] Setup Supabase
- [ ] Database schema
- [ ] Row Level Security policies
- [ ] Authentication flow
- [ ] API integration
- [ ] Real-time subscriptions

### Phase 5: Deployment
- [ ] Environment variables
- [ ] Vercel deployment
- [ ] Domain configuration
- [ ] Performance optimization

## 💰 Hệ Thống Hoa Hồng

### Silver (0-10 khách/quý)
- 10% hoa hồng đơn đầu
- Không có hoa hồng dài hạn

### Gold (11-30 khách/quý)
- 10% hoa hồng đơn đầu
- 5% hoa hồng trọn đời

### Diamond (31-50 khách/quý)
- 10% hoa hồng đơn đầu
- 8% hoa hồng trọn đời

## 🎁 Voucher System

- Giá trị: **200.000đ**
- Thời hạn: **30 ngày**
- Áp dụng: Đơn hàng đầu tiên
- Mỗi khách hàng: 1 voucher duy nhất

## 🔧 Development

### Folder Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components
│   └── features/        # Feature-specific components
├── pages/
│   ├── landing/         # Landing pages
│   ├── f0/             # F0 system pages
│   └── admin/          # Admin system pages
├── lib/
│   ├── constants.ts    # App constants
│   ├── utils.ts        # Utility functions
│   └── mock/           # Mock data
├── types/              # TypeScript types
└── hooks/              # Custom React hooks
```

### Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🌐 Environment Variables

Tạo file `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📝 Notes

- Project sử dụng TypeScript strict mode
- UI components từ shadcn/ui (customizable)
- Color scheme: Green (#10B981)
- Responsive design cho mobile/tablet/desktop
- SEO-friendly với semantic HTML

## 👥 Contributors

- Developer: AI-assisted development

## 📄 License

Private - Mắt Kính Tâm Đức

---

**Status**: Phase 1 Complete ✅ | Next: F0 System Development
