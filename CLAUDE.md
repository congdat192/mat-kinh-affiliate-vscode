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
RESEND_API_KEY              # Encryption key for Resend API (Base64, AES-256-GCM) - NOT the actual API key
VIHAT_API_KEY               # Vihat SMS API key (plaintext)
VIHAT_SECRET_KEY            # Vihat SMS secret key (plaintext)
VIHAT_ENCRYPTION_KEY        # Vihat SMS decryption key (for legacy encrypted credentials)
KIOTVIET_ENCRYPTION_KEY     # KiotViet API decryption key (for legacy encrypted credentials)
```

**Note on RESEND_API_KEY:**
- This is NOT the actual Resend API key
- It's an AES-256-GCM encryption key used to decrypt the real API key stored in database
- The actual Resend API key is stored encrypted in `supabaseapi.integration_credentials` table
- Flow: `get_resend_credential()` → decrypt with `RESEND_API_KEY` → use real API key

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

#### Table: `affiliate.campaign_settings`
Stores campaign settings for F0 referral links (managed by Admin ERP).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | VARCHAR(50) | ID từ KiotViet |
| campaign_code | VARCHAR(100) | Mã campaign từ KiotViet |
| name | VARCHAR(255) | Tên chiến dịch |
| description | TEXT | Mô tả |
| is_active | BOOLEAN | TRUE = hiển thị cho F0 |
| is_default | BOOLEAN | TRUE = auto-select trong dropdown |
| voucher_image_url | TEXT | URL ảnh voucher |
| created_at | TIMESTAMPTZ | Created date |
| updated_at | TIMESTAMPTZ | Updated date |
| created_by | UUID | Admin who created |

**Usage in F0 Portal:**
- F0 chọn chiến dịch từ dropdown khi tạo link giới thiệu
- Chỉ hiển thị campaigns có `is_active = true`
- Campaign có `is_default = true` sẽ được auto-select

### Schema: `api` (IMPORTANT - Primary Access Layer)

**CRITICAL RULE:** All database access in Edge Functions MUST go through schema `api`, NOT directly to source schemas (`affiliate`, `supabaseapi`, `kiotviet`, `vouchers`, etc.).

```javascript
// ✅ CORRECT - Use schema 'api'
const supabase = createClient(url, key, { db: { schema: 'api' } });
await supabase.from('f0_partners').select('*');

// ❌ WRONG - Direct schema access will fail or return empty
await supabase.schema('affiliate').from('f0_partners').select('*');
await supabase.schema('supabaseapi').from('integration_credentials').select('*');
```

**Why?** Views in `api` schema have:
- Proper RLS policies configured
- INSTEAD OF triggers for INSERT/UPDATE/DELETE
- Controlled column exposure (sensitive columns may be hidden)

#### Available Views in `api` schema:

| View | Source | Notes |
|------|--------|-------|
| `api.f0_partners` | `affiliate.f0_partners` | Full access |
| `api.otp_verifications` | `affiliate.otp_verifications` | Full access |
| `api.affiliate_campaign_settings` | `affiliate.campaign_settings` | Campaign settings for F0 referral links |
| `api.integration_credentials` | `supabaseapi.integration_credentials` | **Excludes** `secret_key_encrypted`, `client_secret_encrypted` |
| `api.vihat_credentials` | `supabaseapi.integration_credentials` | Filtered: platform='vihat' |
| `api.kiotviet_credentials` | `supabaseapi.integration_credentials` | Filtered: platform='kiotviet' |
| `api.oauth_clients` | `supabaseapi.oauth_clients` | OAuth clients |
| `api.oauth_tokens` | `supabaseapi.oauth_tokens` | OAuth tokens |
| `api.otp_login_vihat` | `supabaseapi.otp_login_vihat` | OTP login records |

#### Handling Sensitive Credentials

For sensitive data like `secret_key_encrypted`, use **RPC functions** to retrieve encrypted values, then decrypt using ENV keys:

```javascript
// ✅ CORRECT - Use RPC to get encrypted credentials, then decrypt with ENV key
const { data: creds } = await supabase.rpc('get_vihat_credential');
const encryptedSecret = creds.secret_key_encrypted;
const decryptionKey = Deno.env.get('VIHAT_ENCRYPTION_KEY'); // Base64 encoded
const secretKey = await decrypt(encryptedSecret, decryptionKey);

// ❌ WRONG - Query will fail (column not exposed in view)
const { data } = await supabase.from('integration_credentials')
  .select('secret_key_encrypted')  // This column doesn't exist in api view!
```

#### RPC Functions for Credentials

| Function | Returns | Description |
|----------|---------|-------------|
| `api.get_vihat_credential()` | `{api_key, secret_key_encrypted}` | Get Vihat credentials including encrypted secret |
| `api.get_kiotviet_credential()` | `{client_id, client_secret_encrypted}` | Get KiotViet credentials including encrypted secret |
| `api.get_resend_credential()` | `{api_key, client_secret_encrypted}` | Get Resend credentials including encrypted API key |

#### AES-256-GCM Decryption

Credentials are encrypted with AES-256-GCM. Decrypt in Edge Functions:

```javascript
async function decrypt(encryptedBase64: string, keyBase64: string): Promise<string> {
  const encryptedBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));

  const iv = encryptedBytes.slice(0, 12);  // First 12 bytes = IV
  const ciphertextWithTag = encryptedBytes.slice(12);  // Rest = ciphertext + auth tag

  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertextWithTag);

  return new TextDecoder().decode(decrypted);
}
```

**Key Format:** Base64 encoded (44 characters) → decodes to 32 bytes for AES-256

### Schema: `supabaseapi` (Internal Only)

**DO NOT** query this schema directly from Edge Functions. Use `api` views instead.

#### Table: `supabaseapi.integration_credentials`
Stores encrypted API credentials for external services.

| Column | Type | Description | Exposed in API? |
|--------|------|-------------|-----------------|
| id | UUID | Primary key | Yes |
| platform | VARCHAR | Service identifier (e.g., 'vihat', 'kiotviet') | Yes |
| api_key | VARCHAR | API key/ID | Yes |
| secret_key_encrypted | TEXT | AES-256-GCM encrypted secret | **NO** |
| client_secret_encrypted | TEXT | AES-256-GCM encrypted client secret | **NO** |
| is_active | BOOLEAN | Whether credential is active | Yes |
| connection_status | VARCHAR | Connection status | Yes |

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
2. Check for existing phone/email (via `api.f0_partners`)
3. Get Vihat credentials:
   - `api_key` from RPC `get_vihat_credential()`
   - `secret_key_encrypted` from RPC, decrypt using `VIHAT_ENCRYPTION_KEY` (Base64, AES-256-GCM)
4. Generate 6-digit OTP
5. Save to `api.otp_verifications` with registration_data
6. Send SMS via Vihat MultiChannelMessage API (Zalo + SMS fallback)

**Vihat API Configuration:**
- Endpoint: `https://rest.esms.vn/MainService.svc/json/MultiChannelMessage/`
- Channels: `["zalo", "sms"]`
- Brandname: `MKTAMDUC`
- TempID: `478665`
- OAID: `939629380721919913`

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
5. Call `send-affiliate-registration-email` Edge Function (non-blocking)

### `send-affiliate-registration-email`
Sends registration confirmation email to new F0 partner (pending approval).

**Request:**
```json
{
  "email": "user@email.com",
  "fullName": "Nguyen Van A",
  "f0Code": "F0-1234",
  "phone": "0912345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "emailId": "resend-email-id"
}
```

**Flow:**
1. Get Resend credentials via `get_resend_credential()` RPC
2. Decrypt API key using `RESEND_API_KEY` (encryption key from ENV)
3. Send email via Resend API
4. Sender: `Mắt Kính Tâm Đức <affiliate@matkinhtamduc.com>`

### `send-affiliate-approval-email`
Sends account activation email when admin approves F0 partner.

**Request:**
```json
{
  "email": "user@email.com",
  "fullName": "Nguyen Van A",
  "f0Code": "F0-1234",
  "loginUrl": "https://matkinhtamduc.com/f0/auth/login"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "emailId": "resend-email-id"
}
```

**Flow:**
1. Get Resend credentials via `get_resend_credential()` RPC
2. Decrypt API key using `RESEND_API_KEY` (encryption key from ENV)
3. Send email via Resend API
4. Sender: `Mắt Kính Tâm Đức <affiliate@matkinhtamduc.com>`

### `login-affiliate` (v13)
Authenticates F0 partner with specific error codes.

**Request:**
```json
{
  "email_or_phone": "user@email.com", // or "0912345678"
  "password": "password123"
}
```

**Success Response:**
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

**Error Response (always HTTP 200 for FE parsing):**
```json
{
  "success": false,
  "error": "Mật khẩu không chính xác. Vui lòng thử lại.",
  "error_code": "WRONG_PASSWORD"
}
```

**Error Codes:**
| Code | Description | Vietnamese Message |
|------|-------------|-------------------|
| `MISSING_FIELDS` | Email/phone or password empty | Vui lòng nhập email/số điện thoại và mật khẩu |
| `INVALID_FORMAT` | Invalid email/phone format | Email hoặc số điện thoại không hợp lệ |
| `USER_NOT_FOUND` | Account doesn't exist | Tài khoản không tồn tại. Vui lòng kiểm tra lại email/số điện thoại. |
| `WRONG_PASSWORD` | Incorrect password | Mật khẩu không chính xác. Vui lòng thử lại. |
| `ACCOUNT_LOCKED` | Account is_active = false | Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên. |
| `SYSTEM_ERROR` | Unexpected server error | Lỗi hệ thống. Vui lòng thử lại sau. |

**Important:** All responses return HTTP 200 status to ensure the Supabase client puts response in `data` (not `error`), allowing frontend to parse `error_code` correctly.

**Flow:**
1. Determine if input is email or phone
2. Find user in `api.f0_partners`
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
7. Call send-affiliate-registration-email (pending approval notification)
   |
8. Show success screen with F0 code
   |
9. Wait for Admin approval
   |
10. Admin approves -> Call send-affiliate-approval-email
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
- [x] RPC function `get_vihat_credential()` for encrypted credentials
- [x] RPC function `get_resend_credential()` for encrypted Resend API key
- [x] Edge Function `send-otp-affiliate` v12 (Vihat MultiChannelMessage API)
- [x] Edge Function `verify-otp-affiliate` v18 (creates F0 partner, calls registration email)
- [x] Edge Function `login-affiliate` v13 (SHA-256 password verification, specific error codes)
- [x] Edge Function `send-affiliate-registration-email` v1 (pending approval email)
- [x] Edge Function `send-affiliate-approval-email` v1 (account activated email)
- [x] SignupPage connected to send-otp-affiliate
- [x] OTPPage connected to verify-otp-affiliate
- [x] LoginPage connected to login-affiliate
- [x] F0 Registration flow fully working (OTP via Zalo/SMS, account creation)
- [x] Database permissions for `api` schema views (f0_partners, otp_verifications)

### In Progress
- [ ] Forgot Password flow
- [ ] Protected routes implementation
- [ ] Admin approval workflow (call send-affiliate-approval-email when approving)

### Pending
- [ ] Row Level Security (RLS) policies
- [ ] Real-time notifications
- [ ] Test email flow end-to-end

## Commands

```bash
npm run dev      # Start dev server (default port 5173, use --port to change)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Notes

- Supabase project ID: `kcirpjxbjqagrqrjfldu`
- **Database access MUST use schema `api`** (views with proper RLS & triggers)
- DO NOT query source schemas directly (`affiliate`, `supabaseapi`, `kiotviet`, `vouchers`)
- F0 code format: `F0-XXXX` (auto-generated)
- Phone number format: Vietnamese (10 digits, starts with 0)
- Password hashing: SHA-256 (in Edge Functions)
- **Sensitive credentials (API keys, secrets) MUST use ENV variables**, not database queries

## Database Schema Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Schema: api                              │
│  (Views - Primary Access Layer for Edge Functions)          │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ api.f0_partners  │  │ api.otp_verifi.. │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                           │
├───────────┼─────────────────────┼───────────────────────────┤
│           ▼                     ▼                           │
│  ┌──────────────────────────────────────────┐              │
│  │           Schema: affiliate               │              │
│  │  (Source tables - DO NOT query directly)  │              │
│  │  • f0_partners                            │              │
│  │  • otp_verifications                      │              │
│  └──────────────────────────────────────────┘              │
│                                                              │
│  ┌──────────────────────────────────────────┐              │
│  │           Schema: supabaseapi             │              │
│  │  (Source tables - DO NOT query directly)  │              │
│  │  • integration_credentials                │              │
│  │  • oauth_clients, oauth_tokens            │              │
│  │  • otp_login_vihat                        │              │
│  └──────────────────────────────────────────┘              │
│                                                              │
│  ┌──────────────────────────────────────────┐              │
│  │    Other schemas: kiotviet, vouchers      │              │
│  │  (Source tables - DO NOT query directly)  │              │
│  └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```
