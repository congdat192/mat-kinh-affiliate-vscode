# CLAUDE.md - Project Context for AI Assistant

## Project Overview

**Mat Kinh Tam Duc - Affiliate Marketing System**

Affiliate partner management system for Mat Kinh Tam Duc eyewear company.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 7 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Routing | React Router v7 |
| Database | Supabase (PostgreSQL) |
| SMS OTP | Vihat |
| Email | Resend |
| Deployment | Vercel (planned) |

## Environment Variables

File `.env` contains environment variables:

```
VITE_SUPABASE_PROJECT_ID     # Supabase project ID
VITE_SUPABASE_PUBLISHABLE_KEY # Supabase anon key (public)
VITE_SUPABASE_URL            # Supabase API URL
KIOTVIET_ENCRYPTION_KEY      # KiotViet API encryption
RESEND_API_KEY               # Resend email service
VIHAT_ENCRYPTION_KEY         # Vihat SMS service
```

## Database Schema

### Schema: `affiliate`

#### Table: `affiliate.f0_partners`
Stores F0 partner information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| phone | VARCHAR(15) | Phone number (unique, OTP verified) |
| email | VARCHAR(255) | Email (unique) |
| full_name | VARCHAR(255) | Full name |
| password_hash | VARCHAR(255) | Hashed password |
| referral_code | VARCHAR(50) | Referral code (optional) |
| f0_code | VARCHAR(20) | Auto-generated F0 code (F0-XXXX) |
| is_active | BOOLEAN | Account status (true=active, false=locked) |
| is_approved | BOOLEAN | Approval status (true=approved, false=pending) |
| created_at | TIMESTAMPTZ | Registration date |
| updated_at | TIMESTAMPTZ | Last update date |
| approved_at | TIMESTAMPTZ | Approval date |
| approved_by | UUID | Admin who approved |
| admin_note | TEXT | Admin notes |

**Triggers:**
- `trigger_generate_f0_code`: Auto-generate f0_code on insert
- `trigger_update_updated_at`: Auto-update updated_at on update

## Authentication Flow

### F0 Partner Registration

```
1. Fill registration form (phone, email, password, full_name)
   |
2. Send OTP via SMS (Vihat)
   |
3. Verify OTP
   |
4. Save to database (is_approved = false)
   |
5. Send confirmation email (Resend)
   |
6. Wait for Admin approval
   |
7. Admin approves -> Send notification email
   |
8. User can login & use system
```

### Account Status Logic

| is_active | is_approved | Result |
|-----------|-------------|--------|
| true | true | Normal login & usage |
| true | false | Login -> Show "Pending approval" |
| false | * | Login -> "Account locked" |

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components (F0Layout, AdminLayout, LandingLayout)
│   └── features/        # Feature-specific components
├── pages/
│   ├── landing/         # Landing pages (HomePage, AffiliateProgramPage, ClaimVoucherPage)
│   ├── f0/              # F0 system pages
│   │   ├── auth/        # Auth pages (Login, Signup, OTP, ForgotPassword)
│   │   └── ...          # Dashboard, Profile, etc.
│   └── admin/           # Admin system pages
├── services/            # API services
│   ├── authService.ts   # Authentication service
│   ├── campaignService.ts
│   ├── customerService.ts
│   ├── externalApiService.ts
│   └── tokenService.ts
├── lib/
│   ├── constants.ts     # App constants
│   ├── utils.ts         # Utility functions
│   └── mock/            # Mock data
├── types/               # TypeScript types
└── hooks/               # Custom React hooks
```

## Routes

### Landing Pages
- `/` - Homepage
- `/affiliate-program` - Affiliate program info
- `/claim-voucher` - Claim voucher page

### F0 Auth (No Layout)
- `/f0/auth/login` - Login
- `/f0/auth/signup` - Registration
- `/f0/auth/otp` - OTP verification
- `/f0/auth/forgot-password` - Forgot password

### F0 System (With F0Layout)
- `/f0/dashboard` - Dashboard
- `/f0/create-link` - Create referral link
- `/f0/refer-customer` - Refer customer
- `/f0/referral-history` - Referral history
- `/f0/withdrawal` - Withdrawal request
- `/f0/profile` - Profile
- `/f0/notifications` - Notifications

### Admin System (With AdminLayout)
- `/admin/dashboard` - Admin dashboard
- `/admin/partners` - Partner management
- `/admin/customers` - Customer management
- `/admin/orders` - Order management
- `/admin/commissions` - Commission management
- `/admin/withdrawals` - Withdrawal processing
- `/admin/vouchers` - Voucher management
- `/admin/campaigns` - Campaign management
- `/admin/f0-assignments` - F0 assignments
- `/admin/reports` - Reports
- `/admin/settings` - Settings
- `/admin/admins` - Admin management

## Commission System

| Tier | Customers/Quarter | First Order | Lifetime |
|------|-------------------|-------------|----------|
| Silver | 0-10 | 10% | 0% |
| Gold | 11-30 | 10% | 5% |
| Diamond | 31-50 | 10% | 8% |

## Current Status

### Completed
- [x] Landing pages (Homepage, Affiliate Program, Voucher)
- [x] F0 Auth UI pages (Login, Signup, OTP, Forgot Password)
- [x] F0 System UI pages (Dashboard, Profile, etc.)
- [x] Admin System UI pages
- [x] Supabase project setup
- [x] Database schema `affiliate` created
- [x] Table `affiliate.f0_partners` created with triggers

### In Progress
- [ ] Connect authentication flow with Supabase
- [ ] Integrate Vihat SMS OTP
- [ ] Integrate Resend email service
- [ ] Protected routes implementation

### Pending
- [ ] Table `affiliate.otp_verifications` for OTP storage
- [ ] Row Level Security (RLS) policies
- [ ] Admin approval workflow
- [ ] Real-time notifications

## Commands

```bash
npm run dev      # Start dev server (default port 5173, use --port to change)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Notes

- Supabase project ID: `kcirpjxbjqagrqrjfldu`
- Database uses schema `affiliate` (not `public`)
- F0 code format: `F0-XXXX` (auto-generated)
- Phone number format: Vietnamese (10 digits, starts with 0)
