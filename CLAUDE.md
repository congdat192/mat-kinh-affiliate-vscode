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
| SMS OTP | Vihat (eSMS.vn) |
| Email | Resend |
| Deployment | Vercel (planned) |

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_PROJECT_ID     # Supabase project ID
VITE_SUPABASE_PUBLISHABLE_KEY # Supabase anon key (public)
VITE_SUPABASE_URL            # Supabase API URL
```

### Supabase Edge Function Secrets
```
SUPABASE_URL                 # Auto-provided
SUPABASE_ANON_KEY           # Auto-provided
SUPABASE_SERVICE_ROLE_KEY   # Auto-provided
RESEND_API_KEY              # Resend email service
VIHAT_ENCRYPTION_KEY        # Vihat SMS decryption key
KIOTVIET_ENCRYPTION_KEY     # KiotViet API decryption key
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
| password_hash | VARCHAR(255) | SHA-256 hashed password |
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

#### Table: `affiliate.otp_verifications`
Stores OTP codes for phone verification.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| phone | VARCHAR(15) | Phone number |
| otp_code | VARCHAR(6) | 6-digit OTP code |
| registration_data | JSONB | Temporary registration data |
| expires_at | TIMESTAMPTZ | OTP expiration time |
| is_used | BOOLEAN | Whether OTP has been used |
| created_at | TIMESTAMPTZ | Created date |
| verified_at | TIMESTAMPTZ | Verification date |

### Schema: `api`

Views exposing `affiliate` tables for API access:
- `api.f0_partners` → view of `affiliate.f0_partners`
- `api.otp_verifications` → view of `affiliate.otp_verifications`

Both views have INSTEAD OF triggers for INSERT/UPDATE/DELETE operations.

### Schema: `supabaseapi`

#### Table: `supabaseapi.integration_credentials`
Stores encrypted API credentials for external services.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| service_name | VARCHAR | Service identifier (e.g., 'vihat') |
| api_key | VARCHAR | API key/ID |
| secret_key_encrypted | TEXT | AES-256-GCM encrypted secret |
| is_active | BOOLEAN | Whether credential is active |

## Supabase Edge Functions

### `send-otp-affiliate`
Sends OTP via Vihat SMS during registration.

**Request:**
```json
{
  "phone": "0912345678",
  "email": "user@email.com",
  "full_name": "Nguyen Van A",
  "password": "password123",
  "referral_code": "REF123" // optional
}
```

**Response:**
```json
{
  "success": true,
  "record_id": "uuid",
  "phone_masked": "091***5678",
  "expires_in": 300
}
```

**Flow:**
1. Validate input data
2. Check for existing phone/email
3. Get Vihat credentials from `supabaseapi.integration_credentials`
4. Decrypt secret_key using AES-256-GCM
5. Generate 6-digit OTP
6. Save to `affiliate.otp_verifications` with registration_data
7. Send SMS via Vihat API

### `verify-otp-affiliate`
Verifies OTP and creates F0 partner account.

**Request:**
```json
{
  "record_id": "uuid",
  "phone": "0912345678",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng ký thành công!",
  "partner": {
    "id": "uuid",
    "f0_code": "F0-1234",
    "full_name": "Nguyen Van A",
    "email": "user@email.com",
    "phone": "0912345678",
    "is_approved": false
  }
}
```

**Flow:**
1. Find OTP record by record_id and phone
2. Validate OTP (not used, not expired, max 5 attempts)
3. Create F0 partner in `affiliate.f0_partners`
4. Mark OTP as used
5. Send confirmation email via Resend

### `login-affiliate`
Authenticates F0 partner.

**Request:**
```json
{
  "email_or_phone": "user@email.com", // or "0912345678"
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "user": {
    "id": "uuid",
    "f0_code": "F0-1234",
    "full_name": "Nguyen Van A",
    "email": "user@email.com",
    "phone": "0912345678",
    "is_active": true,
    "is_approved": false
  },
  "approval_status": "pending" // or "approved"
}
```

**Flow:**
1. Determine if input is email or phone
2. Find user in `affiliate.f0_partners`
3. Verify password (SHA-256 hash)
4. Check account status (is_active)
5. Return user data with approval_status

## Authentication Flow

### F0 Partner Registration

```
1. Fill registration form (phone, email, password, full_name)
   |
2. Call send-otp-affiliate Edge Function
   |
3. Vihat sends OTP via SMS
   |
4. User enters OTP on OTPPage
   |
5. Call verify-otp-affiliate Edge Function
   |
6. Create F0 partner (is_approved = false)
   |
7. Send confirmation email via Resend
   |
8. Show success screen with F0 code
   |
9. Wait for Admin approval
   |
10. Admin approves -> Send notification email
   |
11. User can login & use system normally
```

### F0 Partner Login

```
1. Enter email/phone + password
   |
2. Call login-affiliate Edge Function
   |
3. Check credentials
   |
4. If is_active = false -> Show "Account locked"
   |
5. If is_approved = false -> Show "Pending approval"
   |
6. If approved -> Navigate to Dashboard
```

### Account Status Logic

| is_active | is_approved | Result |
|-----------|-------------|--------|
| true | true | Normal login & usage |
| true | false | Login -> Show "Pending approval" message |
| false | * | Login -> "Account locked" error |

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
│   ├── supabase.ts      # Supabase client (uses 'api' schema)
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
- [x] Table `affiliate.otp_verifications` created
- [x] Views in `api` schema for API access
- [x] Edge Function `send-otp-affiliate` (Vihat SMS)
- [x] Edge Function `verify-otp-affiliate` (+ Resend email)
- [x] Edge Function `login-affiliate`
- [x] SignupPage connected to send-otp-affiliate
- [x] OTPPage connected to verify-otp-affiliate
- [x] LoginPage connected to login-affiliate

### In Progress
- [ ] Forgot Password flow
- [ ] Protected routes implementation
- [ ] Admin approval workflow

### Pending
- [ ] Row Level Security (RLS) policies
- [ ] Real-time notifications
- [ ] Admin approval email notification

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
- API access uses schema `api` (views to `affiliate` tables)
- F0 code format: `F0-XXXX` (auto-generated)
- Phone number format: Vietnamese (10 digits, starts with 0)
- Password hashing: SHA-256 (in Edge Functions)
- Vihat credentials: Encrypted with AES-256-GCM, stored in `supabaseapi.integration_credentials`
