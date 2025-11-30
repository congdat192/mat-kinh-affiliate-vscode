# Mat Kinh Tam Duc - Affiliate Marketing System

Affiliate partner management system for Mat Kinh Tam Duc eyewear company.

## Overview

The system consists of 2 main modules:
- **Landing Pages**: Program introduction and partner recruitment
- **F0 System**: Dashboard and management for partners

**Note:** Admin System has been moved to a separate project (shares same Supabase backend).

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

## Installation

```bash
# Clone repository
git clone https://github.com/congdat192/mat-kinh-affiliate-vscode.git
cd mat-kinh-affiliate-vscode

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create `.env` file:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=your_supabase_url
```

## Database Schema

### Schema: `affiliate`

#### Table: `f0_partners`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| phone | VARCHAR(15) | Phone (unique) |
| email | VARCHAR(255) | Email (unique) |
| full_name | VARCHAR(255) | Full name |
| password_hash | VARCHAR(255) | SHA-256 hashed password |
| f0_code | VARCHAR(20) | Auto F0 code (F0-XXXX) |
| is_active | BOOLEAN | Account active status |
| is_approved | BOOLEAN | Approval status |
| created_at | TIMESTAMPTZ | Created date |
| approved_at | TIMESTAMPTZ | Approved date |
| approved_by | UUID | Approving admin |
| bank_name | VARCHAR(255) | Bank name |
| bank_account_number | VARCHAR(50) | Bank account number |
| bank_account_name | VARCHAR(255) | Bank account holder name |
| bank_verified | BOOLEAN | Bank verification status |
| bank_verified_at | TIMESTAMPTZ | Bank verification timestamp |

#### Table: `otp_verifications`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| phone | VARCHAR(15) | Phone number |
| otp_code | VARCHAR(6) | 6-digit OTP |
| registration_data | JSONB | Temp registration data |
| expires_at | TIMESTAMPTZ | Expiration time |
| is_used | BOOLEAN | Used status |

#### Table: `campaign_settings`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | VARCHAR(50) | ID từ KiotViet |
| campaign_code | VARCHAR(100) | Mã campaign từ KiotViet |
| name | VARCHAR(255) | Tên chiến dịch |
| description | TEXT | Mô tả |
| is_active | BOOLEAN | TRUE = hiển thị cho F0 |
| is_default | BOOLEAN | TRUE = auto-select |
| voucher_image_url | TEXT | URL ảnh voucher |

#### Table: `password_resets`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| f0_id | UUID | FK to f0_partners |
| email | VARCHAR(255) | Email address |
| token | VARCHAR(255) | UUID reset token |
| expires_at | TIMESTAMPTZ | Expiration (15 min) |
| is_used | BOOLEAN | Used status |

#### Table: `referral_links` (JSONB Structure)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| f0_id | UUID | FK to f0_partners |
| f0_code | VARCHAR(20) | F0 partner code (unique) |
| campaigns | JSONB | Array of campaign links |
| created_at | TIMESTAMPTZ | Created date |
| updated_at | TIMESTAMPTZ | Updated date |

**Note:** Optimized structure - 1 row per F0, campaigns stored as JSONB array with `campaign_code`, `campaign_name`, `click_count`, `conversion_count`, etc.

#### Table: `voucher_affiliate_tracking`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| code | VARCHAR(50) | Voucher code (unique) |
| campaign_id | VARCHAR(50) | Campaign ID from KiotViet |
| campaign_code | VARCHAR(100) | Campaign code |
| f0_id | UUID | FK to f0_partners (referrer) |
| f0_code | VARCHAR(20) | F0 partner code |
| recipient_phone | VARCHAR(20) | F1 customer phone |
| recipient_name | VARCHAR(255) | F1 customer name |
| customer_type | VARCHAR(10) | 'new' or 'old' |
| activation_status | VARCHAR(50) | Status (Đã kích hoạt, Đã sử dụng) |
| expired_at | TIMESTAMPTZ | Expiration date |

#### Table: `withdrawal_requests` (JSONB)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| f0_id | UUID | FK to f0_partners |
| amount | DECIMAL(15,2) | Withdrawal amount |
| status | VARCHAR(20) | pending/approved/rejected/completed |
| bank_info | JSONB | Bank details |
| processing_info | JSONB | Processing details |
| created_at | TIMESTAMPTZ | Request date |

#### Table: `notifications` (JSONB)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| f0_id | UUID | FK to f0_partners |
| type | VARCHAR(50) | referral/commission/withdrawal/announcement/alert/system |
| content | JSONB | Notification content (title, message, etc.) |
| is_read | BOOLEAN | Read status |
| created_at | TIMESTAMPTZ | Created date |

### Schema: `api`
Views exposing `affiliate` tables for API access:
- `api.f0_partners` → view of `affiliate.f0_partners`
- `api.otp_verifications` → view of `affiliate.otp_verifications`
- `api.password_resets` → view of `affiliate.password_resets`
- `api.affiliate_campaign_settings` → view of `affiliate.campaign_settings`
- `api.referral_links` → view of `affiliate.referral_links`
- `api.voucher_affiliate_tracking` → view of `affiliate.voucher_affiliate_tracking`
- `api.all_voucher_tracking` → unified view (regular + affiliate vouchers)
- `api.withdrawal_requests` → view of `affiliate.withdrawal_requests`
- `api.notifications` → view of `affiliate.notifications`
- `api.f0_tiers` → view of `affiliate.f0_tiers` (tier configuration)

## Supabase Edge Functions

| Function | Version | Description |
|----------|---------|-------------|
| `send-otp-affiliate` | v12 | Send OTP via Vihat MultiChannelMessage API (Zalo + SMS fallback) |
| `verify-otp-affiliate` | v18 | Verify OTP, create F0 partner account, call registration email |
| `login-affiliate` | v13 | Authenticate F0 partner (SHA-256 password, specific error codes) |
| `forgot-password-affiliate` | v4 | Send password reset email (15 min expiry, 1 min rate limit) |
| `reset-password-affiliate` | v1 | Reset password using token from email link |
| `send-affiliate-registration-email` | v1 | Send registration confirmation email (pending approval) |
| `send-affiliate-approval-email` | v1 | Send account activation email (after admin approval) |
| `create-and-release-voucher-affiliate-internal` | v6 | Issue voucher for F1 customer via KiotViet API, saves to voucher_affiliate_tracking, updates JSONB conversion_count |
| `send-otp-bank-verification` | v1 | Send OTP for bank info verification (F0 ProfilePage) |
| `verify-otp-bank` | v1 | Verify OTP, save bank info, send confirmation email |
| `get-f0-dashboard-stats` | v9 | Get F0 dashboard stats (referrals, commissions, tier from DB, activity) |
| `get-f0-referral-history` | v1 | Get F0 referral history with pagination and filters |
| `manage-withdrawal-request` | v1 | Manage F0 withdrawal requests (get/create/cancel) |
| `manage-notifications` | v1 | Manage F0 notifications (get/mark_read/delete) |

### Vihat API Configuration

- **Endpoint:** `https://rest.esms.vn/MainService.svc/json/MultiChannelMessage/`
- **Channels:** `["zalo", "sms"]` (Zalo first, SMS fallback)
- **Brandname:** `MKTAMDUC`
- **TempID:** `478665`
- **OAID:** `939629380721919913`

## Authentication Flow

```
Register -> Send OTP (SMS) -> Verify OTP -> Save to DB -> Registration email (pending)
                                                              |
                                Login <- Approval email <- Admin approval
```

## Referral Link Flow

```
F0 selects campaign → Generate link (client-side) → Save to DB for history
                                    ↓
        Link: /claim-voucher?ref={f0_code}&campaign={campaign_code}
                                    ↓
                        QR Code + Share buttons
```

**Key Features:**
- Links generated dynamically using `window.location.origin`
- UTM params: `ref` (F0 code) + `campaign` (campaign_code)
- Get-or-create pattern: same F0 + campaign = return existing link
- F1 claim page validates UTM params (required)

### Account Status

| is_active | is_approved | Result |
|-----------|-------------|--------|
| true | true | Normal usage |
| true | false | Pending approval |
| false | * | Account locked |

### Bank Verification Flow

```
F0 Profile → Tab "Ngân hàng" → Fill bank info → Click "Xác minh qua OTP"
                                                         ↓
                                              OTP sent to F0's phone
                                                         ↓
                                              Enter OTP → Verify
                                                         ↓
                        Bank info saved + Locked form + Confirmation email
```

**Key Features:**
- OTP only for first-time verification (saves SMS costs)
- After verification: Form readonly, shows "Đã xác minh" badge
- Future changes require Admin intervention

## UI Components

### Toast Notification
- Location: `src/components/ui/toast.tsx`
- Position: Bottom-right corner, auto-dismiss after 4 seconds
- Types: success, error, info, warning
- Usage: `toast.success('Message', 'Title')`

### Voucher Claim Success
- Copy voucher code to clipboard
- Download voucher as PNG image
- Tips section for user guidance

## Folder Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components + Toast
│   ├── layout/          # Layout components (F0Layout, LandingLayout)
│   └── features/        # Feature components
├── pages/
│   ├── landing/         # Landing pages
│   └── f0/              # F0 system pages
│       └── auth/        # Auth pages
├── services/            # API services
├── lib/
│   ├── supabase.ts      # Supabase client (uses 'api' schema)
│   ├── constants.ts     # App constants
│   └── utils.ts         # Utility functions
├── types/               # TypeScript types
└── hooks/               # Custom hooks
```

## Routes

### Landing
| Route | Page |
|-------|------|
| `/` | Homepage |
| `/affiliate-program` | Program info |
| `/claim-voucher` | Claim voucher |

### F0 Auth
| Route | Page |
|-------|------|
| `/f0/auth/login` | Login |
| `/f0/auth/signup` | Registration |
| `/f0/auth/otp` | OTP verification |
| `/f0/auth/forgot-password` | Forgot password |
| `/f0/auth/reset-password` | Reset password (token) |

### F0 System
| Route | Page |
|-------|------|
| `/f0/dashboard` | Dashboard |
| `/f0/create-link` | Create referral link |
| `/f0/refer-customer` | Refer customer |
| `/f0/referral-history` | Referral history |
| `/f0/withdrawal` | Withdrawal request |
| `/f0/profile` | Profile |
| `/f0/notifications` | Notifications |

## Commission System

| Tier | Customers/Quarter | First Order | Lifetime |
|------|-------------------|-------------|----------|
| Silver | 0-10 | 10% | 0% |
| Gold | 11-30 | 10% | 5% |
| Diamond | 31-50 | 10% | 8% |

## Roadmap

### Phase 1: Landing Pages ✅
- [x] Homepage
- [x] Affiliate Program page
- [x] Voucher page

### Phase 2: F0 System ✅
- [x] Auth UI pages (Login, Signup, OTP, Forgot Password)
- [x] Dashboard UI
- [x] Profile, Notifications UI
- [x] Connect auth with Supabase Edge Functions
- [x] Integrate Vihat SMS OTP (MultiChannelMessage API with Zalo + SMS)
- [x] F0 Registration flow fully working (OTP sent, verified, account created)
- [x] Integrate Resend email (registration + approval emails)

### Phase 3: Admin System (Moved to Separate Project)
- Admin FE has been moved to a separate project
- Shares the same Supabase backend

### Phase 4: Backend Integration ✅
- [x] Supabase project setup
- [x] Database schema `affiliate`
- [x] Table `f0_partners` with triggers
- [x] Table `otp_verifications`
- [x] Table `campaign_settings`
- [x] Table `referral_links`
- [x] Views in `api` schema (with INSTEAD OF triggers)
- [x] RPC function `get_vihat_credential()` for encrypted credentials
- [x] RPC function `get_resend_credential()` for encrypted Resend API key
- [x] Edge Function `send-otp-affiliate` v12 (Vihat MultiChannelMessage)
- [x] Edge Function `verify-otp-affiliate` v18 (calls registration email)
- [x] Edge Function `login-affiliate` v13 (specific error codes)
- [x] Edge Function `send-affiliate-registration-email` v1
- [x] Edge Function `send-affiliate-approval-email` v1
- [x] Edge Function `forgot-password-affiliate` v4
- [x] Edge Function `reset-password-affiliate` v1
- [x] Table `password_resets` with INSTEAD OF triggers
- [x] Forgot Password flow (ForgotPasswordPage + ResetPasswordPage)
- [x] Database permissions for service_role on `api` schema views
- [x] F0 Create Referral Link (client-side UTM generation)
- [x] ClaimVoucherPage with UTM validation
- [x] F1 Voucher Claim flow (customer type check + issue voucher)
- [x] Edge Function `create-and-release-voucher-affiliate-internal` v6 (KiotViet voucher API + JSONB update)
- [x] Table `voucher_affiliate_tracking` for affiliate voucher tracking
- [x] View `api.voucher_affiliate_tracking` with INSTEAD OF triggers
- [x] View `api.all_voucher_tracking` (unified view: regular + affiliate)
- [x] GRANT SELECT on `api.customers_backup` to anon role
- [x] Refactored `referral_links` to JSONB structure (1 row per F0)
- [x] Toast notification system
- [x] ClaimVoucherPage success UI (copy/save voucher)
- [x] Bank verification OTP flow (ProfilePage)
- [x] Edge Function `send-otp-bank-verification` v1
- [x] Edge Function `verify-otp-bank` v1
- [x] Database columns `bank_verified`, `bank_verified_at`
- [x] Table `withdrawal_requests` with JSONB structure
- [x] Table `notifications` with JSONB structure
- [x] Views `api.withdrawal_requests`, `api.notifications`
- [x] Edge Function `get-f0-dashboard-stats` v1
- [x] Edge Function `get-f0-referral-history` v1
- [x] Edge Function `manage-withdrawal-request` v1
- [x] Edge Function `manage-notifications` v1
- [x] F0 Pages connected to real data (Dashboard, ReferralHistory, Withdrawal, Notifications)
- [ ] Row Level Security (RLS)

### Phase 5: Deployment
- [ ] Vercel deployment
- [ ] Domain configuration

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run preview      # Preview build
npm run lint         # ESLint
```

## Contributors

- Developer: AI-assisted development

## License

Private - Mat Kinh Tam Duc

---

**Status**: Phase 4 Complete (F0 Portal fully working with real data) | Admin moved to separate project
