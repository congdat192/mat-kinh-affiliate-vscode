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
| bank_name | VARCHAR(255) | Bank name |
| bank_account_number | VARCHAR(50) | Bank account number |
| bank_account_name | VARCHAR(255) | Bank account holder name |
| bank_verified | BOOLEAN | Bank info verification status (default: false) |
| bank_verified_at | TIMESTAMPTZ | Bank verification timestamp |

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

#### Table: `affiliate.password_resets`
Stores password reset tokens for F0 partners.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| f0_id | UUID | FK to f0_partners |
| email | VARCHAR(255) | Email address |
| token | VARCHAR(255) | UUID reset token (unique) |
| expires_at | TIMESTAMPTZ | Token expiration (default: 15 min) |
| is_used | BOOLEAN | Whether token has been used |
| created_at | TIMESTAMPTZ | Created date |
| used_at | TIMESTAMPTZ | When token was used |

**Notes:**
- Token expires in 15 minutes (set by database default)
- Rate limit: 1 token per email per minute (enforced in Edge Function)
- View: `api.password_resets` with INSTEAD OF triggers

#### Table: `affiliate.referral_links` (JSONB Structure)
Stores referral links created by F0 partners. **Optimized**: 1 row per F0 with JSONB array for campaigns.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| f0_id | UUID | FK to f0_partners (nullable) |
| f0_code | VARCHAR(20) | F0 partner code (unique) |
| campaigns | JSONB | Array of campaign links |
| created_at | TIMESTAMPTZ | Created date |
| updated_at | TIMESTAMPTZ | Updated date |

**JSONB `campaigns` structure:**
```json
[
  {
    "campaign_setting_id": "uuid",
    "campaign_code": "CAMPAIGN_CODE",
    "campaign_name": "Campaign Name",
    "click_count": 0,
    "conversion_count": 0,
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "last_clicked_at": null
  }
]
```

**Usage:**
- Links are generated client-side with UTM params: `/claim-voucher?ref={f0_code}&campaign={campaign_code}`
- 1 row per F0, multiple campaigns stored in JSONB array
- Get-or-create pattern: if campaign exists in array, return it; otherwise add to array
- When all campaigns deleted, entire row is deleted (cleanup)

#### Table: `affiliate.voucher_affiliate_tracking`
Stores vouchers issued through affiliate F1 flow (separate from `vouchers.voucher_tracking`).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| code | VARCHAR(50) | Voucher code (unique) |
| campaign_id | VARCHAR(50) | Campaign ID from KiotViet |
| campaign_code | VARCHAR(100) | Campaign code |
| created_at | TIMESTAMPTZ | Created date |
| activated_at | TIMESTAMPTZ | Activation date |
| expired_at | TIMESTAMPTZ | Expiration date |
| activation_status | VARCHAR(50) | Status (Đã kích hoạt, Đã sử dụng, Hết hạn) |
| f0_id | UUID | FK to f0_partners (affiliate who referred) |
| f0_code | VARCHAR(20) | F0 partner code |
| recipient_phone | VARCHAR(20) | F1 customer phone |
| recipient_name | VARCHAR(255) | F1 customer name |
| recipient_email | VARCHAR(255) | F1 customer email |
| customer_type | VARCHAR(10) | 'new' or 'old' |
| original_voucher_id | UUID | FK for reissue tracking |
| reissue_reason | TEXT | Reason for reissue |
| reissued_at | TIMESTAMPTZ | Reissue timestamp |
| reissued_by | VARCHAR(100) | Who reissued |

**Views:**
- `api.voucher_affiliate_tracking` - View with INSTEAD OF triggers for INSERT/UPDATE/DELETE
- `api.all_voucher_tracking` - Unified view combining `vouchers.voucher_tracking` + `affiliate.voucher_affiliate_tracking` with `source_type` column ('regular' or 'affiliate')

#### Table: `affiliate.withdrawal_requests`
Stores F0 withdrawal requests with JSONB structure for flexible bank info and processing details.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| f0_id | UUID | FK to f0_partners |
| amount | DECIMAL(15,2) | Withdrawal amount |
| status | VARCHAR(20) | pending/approved/rejected/completed |
| bank_info | JSONB | Bank details (see structure below) |
| processing_info | JSONB | Processing details (see structure below) |
| created_at | TIMESTAMPTZ | Request date |
| updated_at | TIMESTAMPTZ | Last update |

**JSONB `bank_info` structure:**
```json
{
  "bank_name": "Vietcombank",
  "bank_account_number": "1234567890",
  "bank_account_name": "NGUYEN VAN A",
  "bank_branch": "Chi nhánh HCM"
}
```

**JSONB `processing_info` structure:**
```json
{
  "processed_by": "admin-uuid",
  "processed_at": "2025-01-29T10:00:00Z",
  "transaction_id": "TXN123456",
  "notes": "Đã chuyển khoản",
  "reject_reason": null
}
```

**Views:**
- `api.withdrawal_requests` - View with INSTEAD OF triggers for INSERT/UPDATE/DELETE

#### Table: `affiliate.notifications`
Stores F0 notifications with JSONB content for flexible notification types.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| f0_id | UUID | FK to f0_partners |
| type | VARCHAR(50) | Notification type (referral/commission/withdrawal/announcement/alert/system) |
| content | JSONB | Notification content (see structure below) |
| is_read | BOOLEAN | Read status (default: false) |
| created_at | TIMESTAMPTZ | Created date |
| read_at | TIMESTAMPTZ | When marked as read |

**JSONB `content` structure (varies by type):**
```json
{
  "title": "Notification title",
  "message": "Notification message",
  "customer_name": "Nguyen Van B",
  "amount": 450000,
  "voucher_code": "ABC123",
  "link": "/f0/referral-history"
}
```

**Views:**
- `api.notifications` - View with INSTEAD OF triggers for INSERT/UPDATE/DELETE

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
| `api.password_resets` | `affiliate.password_resets` | Password reset tokens |
| `api.affiliate_campaign_settings` | `affiliate.campaign_settings` | Campaign settings for F0 referral links |
| `api.referral_links` | `affiliate.referral_links` | Referral links history for F0 |
| `api.voucher_affiliate_tracking` | `affiliate.voucher_affiliate_tracking` | Affiliate voucher tracking (INSTEAD OF triggers) |
| `api.all_voucher_tracking` | UNION of `vouchers.voucher_tracking` + `affiliate.voucher_affiliate_tracking` | Unified view with `source_type` column |
| `api.withdrawal_requests` | `affiliate.withdrawal_requests` | Withdrawal requests (INSTEAD OF triggers) |
| `api.notifications` | `affiliate.notifications` | F0 notifications (INSTEAD OF triggers) |
| `api.f0_tiers` | `affiliate.f0_tiers` | Tier configuration (dynamic requirements from DB) |
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

### `forgot-password-affiliate` (v4)
Sends password reset email to F0 partner.

**Request:**
```json
{
  "email": "user@email.com",
  "baseUrl": "https://matkinhtamduc.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã gửi email đặt lại mật khẩu",
  "email_masked": "us***@email.com"
}
```

**Error Codes:**
| Code | Description | Vietnamese Message |
|------|-------------|-------------------|
| `MISSING_EMAIL` | Email empty | Vui lòng nhập email |
| `INVALID_EMAIL` | Invalid email format | Email không hợp lệ |
| `EMAIL_NOT_FOUND` | Email not registered | Email không tồn tại trong hệ thống |
| `RATE_LIMIT` | Token created < 1 min ago | Vui lòng đợi 1 phút trước khi gửi lại |

**Flow:**
1. Validate email format
2. Check if user exists in `api.f0_partners`
3. Check rate limit (1 token per minute)
4. Generate UUID token, save to `api.password_resets`
5. Get Resend credentials via `get_resend_credential()` RPC (returns array!)
6. Decrypt API key using `RESEND_API_KEY` (encryption key from ENV)
7. Send reset email with link: `{baseUrl}/f0/auth/reset-password?token={token}`
8. Token expires in 15 minutes

### `reset-password-affiliate` (v1)
Resets password using token from email link.

**Request:**
```json
{
  "token": "uuid-token-from-email",
  "new_password": "newPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đặt lại mật khẩu thành công"
}
```

**Error Codes:**
| Code | Description | Vietnamese Message |
|------|-------------|-------------------|
| `INVALID_TOKEN` | Token not found | Liên kết không hợp lệ hoặc đã hết hạn |
| `TOKEN_USED` | Token already used | Liên kết này đã được sử dụng |
| `TOKEN_EXPIRED` | Token expired (15 min) | Liên kết đã hết hạn |
| `WEAK_PASSWORD` | Password < 6 chars | Mật khẩu phải có ít nhất 6 ký tự |

**Flow:**
1. Find token in `api.password_resets`
2. Validate: not used, not expired
3. Hash new password (SHA-256)
4. Update password in `api.f0_partners`
5. Mark token as used

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

### `send-otp-bank-verification` (v1)
Sends OTP via Vihat SMS for bank information verification in ProfilePage.

**Request:**
```json
{
  "f0_id": "uuid",
  "bank_name": "Vietcombank",
  "bank_account_number": "1234567890",
  "bank_account_name": "NGUYEN VAN A"
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

**Error Codes:**
| Code | Description | Vietnamese Message |
|------|-------------|-------------------|
| `MISSING_F0_ID` | F0 ID empty | Thiếu thông tin người dùng |
| `MISSING_BANK_INFO` | Bank info incomplete | Vui lòng điền đầy đủ thông tin ngân hàng |
| `F0_NOT_FOUND` | F0 partner not found | Không tìm thấy thông tin đối tác |
| `ALREADY_VERIFIED` | Bank already verified | Thông tin ngân hàng đã được xác minh |

**Flow:**
1. Validate F0 exists and bank not already verified
2. Get Vihat credentials via RPC `get_vihat_credential()`
3. Generate 6-digit OTP
4. Save to `api.otp_verifications` with bank data in `registration_data` JSONB
5. Send OTP via Vihat MultiChannelMessage API (Zalo + SMS fallback)

### `verify-otp-bank` (v1)
Verifies OTP and saves bank information, sends confirmation email.

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
  "message": "Xác minh thông tin ngân hàng thành công!",
  "bank_info": {
    "bank_name": "Vietcombank",
    "bank_account_number": "1234567890",
    "bank_account_name": "NGUYEN VAN A",
    "bank_verified": true,
    "bank_verified_at": "2025-01-29T10:00:00Z"
  }
}
```

**Error Codes:**
| Code | Description | Vietnamese Message |
|------|-------------|-------------------|
| `MISSING_FIELDS` | Required fields empty | Thiếu thông tin bắt buộc |
| `OTP_NOT_FOUND` | OTP record not found | Không tìm thấy mã OTP |
| `OTP_USED` | OTP already used | Mã OTP đã được sử dụng |
| `OTP_EXPIRED` | OTP expired | Mã OTP đã hết hạn |
| `INVALID_OTP` | Wrong OTP code | Mã OTP không chính xác |

**Flow:**
1. Find OTP record by record_id and phone
2. Validate OTP (not used, not expired, correct code)
3. Update `f0_partners` with bank info + `bank_verified = true`
4. Mark OTP as used
5. Send confirmation email via Resend (non-blocking)

### `get-f0-dashboard-stats` (v1)
Gets F0 dashboard statistics including referrals, commissions, tier info, and recent activity.

**Request:**
```json
{
  "f0_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalReferrals": 15,
      "activeCustomers": 12,
      "referralsThisQuarter": 5,
      "totalCommission": 5000000,
      "paidCommission": 3000000,
      "pendingCommission": 2000000,
      "availableBalance": 1500000
    },
    "tier": {
      "current": "silver",
      "nextTier": "gold",
      "customersNeeded": 6,
      "percentToNextTier": 50
    },
    "recentActivity": [...],
    "unreadNotifications": 3
  }
}
```

### `get-f0-referral-history` (v1)
Gets F0 referral history with pagination and filters.

**Request:**
```json
{
  "f0_id": "uuid",
  "page": 1,
  "limit": 10,
  "status": "all",
  "search": "",
  "dateFrom": "2025-01-01",
  "dateTo": "2025-12-31"
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalRecords": 50,
    "totalPages": 5
  },
  "stats": {
    "total": 50,
    "active": 40,
    "pending": 5,
    "expired": 5
  }
}
```

### `manage-withdrawal-request` (v1)
Manages F0 withdrawal requests (get, create, cancel).

**Request (get):**
```json
{
  "action": "get",
  "f0_id": "uuid"
}
```

**Request (create):**
```json
{
  "action": "create",
  "f0_id": "uuid",
  "amount": 1000000
}
```

**Request (cancel):**
```json
{
  "action": "cancel",
  "f0_id": "uuid",
  "request_id": "uuid"
}
```

**Response (get):**
```json
{
  "success": true,
  "data": {
    "requests": [...],
    "stats": {
      "totalWithdrawn": 5000000,
      "pendingAmount": 1000000,
      "availableBalance": 2000000
    }
  }
}
```

### `manage-notifications` (v1)
Manages F0 notifications (get, mark_read, mark_all_read, delete, get_unread_count).

**Request (get):**
```json
{
  "action": "get",
  "f0_id": "uuid",
  "filter": "unread",
  "limit": 50
}
```

**Request (mark_read):**
```json
{
  "action": "mark_read",
  "f0_id": "uuid",
  "notification_id": "uuid"
}
```

**Request (mark_all_read):**
```json
{
  "action": "mark_all_read",
  "f0_id": "uuid"
}
```

**Request (delete):**
```json
{
  "action": "delete",
  "f0_id": "uuid",
  "notification_id": "uuid"
}
```

**Request (get_unread_count):**
```json
{
  "action": "get_unread_count",
  "f0_id": "uuid"
}
```

### `create-and-release-voucher-affiliate-internal` (v6)
Creates and releases voucher for F1 customer via KiotViet API. Saves to `affiliate.voucher_affiliate_tracking` for F0 revenue tracking.

**Request:**
```json
{
  "campaign_code": "CAMPAIGN123",
  "recipient_phone": "0912345678",
  "f0_code": "F0-1234",
  "recipient_name": "Nguyen Van B",
  "recipient_email": "f1@email.com"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Phát voucher thành công!",
  "voucher_code": "ABC1234567",
  "campaign_name": "Chiến dịch mùa hè",
  "expired_at": "2025-02-28T23:59:59.999+07:00",
  "recipient_phone": "0912345678",
  "customer_type": "new",
  "f0_code": "F0-1234",
  "f0_name": "Nguyen Van A",
  "meta": {
    "request_id": "uuid",
    "duration_ms": 1500
  }
}
```

**Error Codes:**
| Code | Description | Vietnamese Message |
|------|-------------|-------------------|
| `MISSING_CAMPAIGN_CODE` | Campaign code empty | Thiếu mã chiến dịch |
| `MISSING_PHONE` | Phone empty | Thiếu số điện thoại |
| `INVALID_PHONE` | Invalid phone format | Số điện thoại không hợp lệ |
| `OLD_CUSTOMER` | Customer has totalrevenue > 0 | Số điện thoại này đã là khách hàng cũ |
| `CAMPAIGN_NOT_FOUND` | Campaign not active | Chiến dịch không tồn tại hoặc đã kết thúc |
| `DUPLICATE_VOUCHER` | Active voucher exists for same phone + campaign | Đã có voucher chưa sử dụng |
| `KIOTVIET_CREATE_ERROR` | KiotViet API create failed | Lỗi tạo voucher trên KiotViet |

**Flow:**
1. Validate phone format (10 digits, starts with 0)
2. Check customer type via `api.customers_backup` (new if totalrevenue <= 0)
3. Get campaign from `api.affiliate_campaign_settings`
4. Check for duplicate voucher in `api.voucher_affiliate_tracking`
5. Validate F0 partner if f0_code provided
6. Get KiotViet token (auto-refresh if expired)
7. Generate 10-character voucher code
8. Create voucher in KiotViet
9. Release voucher in KiotViet
10. Save to `api.voucher_affiliate_tracking` with f0_id, f0_code
11. Update `referral_links` campaigns JSONB array conversion_count

**Key Features:**
- Saves to `affiliate.voucher_affiliate_tracking` (not `vouchers.voucher_tracking`)
- Stores `f0_id` and `f0_code` for F0 revenue tracking
- Auto token refresh with KiotViet OAuth
- Vietnam timezone handling (UTC+7)
- Duplicate check: blocks if active voucher exists for same phone + campaign
- Updates conversion_count in JSONB campaigns array (v6)

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

### F0 Bank Information Verification (OTP)

```
1. F0 goes to Profile page -> Tab "Ngân hàng"
   |
2. F0 fills bank info (bank name, account number, account name)
   |
3. Click "Xác minh qua OTP" button
   |
4. Call send-otp-bank-verification Edge Function
   |
5. Vihat sends OTP via SMS to F0's registered phone
   |
6. OTP Modal opens with 6 input boxes
   |
7. F0 enters OTP -> Call verify-otp-bank Edge Function
   |
8. If OTP valid:
   |   - Update f0_partners with bank info
   |   - Set bank_verified = true, bank_verified_at = now
   |   - Send confirmation email via Resend
   |   - Lock form permanently (readonly)
   |
9. F0 sees locked form with verified bank info
   |
10. Future changes require Admin intervention
```

**Key Features:**
- OTP sent only for first-time verification (to save SMS costs)
- After verification: Form becomes readonly, shows "Đã xác minh" badge
- 5-minute countdown timer for OTP expiry
- Bank info preview shown in OTP modal before verification
- Confirmation email sent after successful verification

**UI States:**
| bank_verified | Form State | Actions Available |
|---------------|------------|-------------------|
| false | Editable | Edit fields, "Xác minh qua OTP" button |
| true | Readonly | View only, shows verification timestamp |

## Referral Link System

### Link Generation Flow (Client-Side UTM)

```
F0 selects campaign → Generate link client-side → Save to DB for history
                                                          ↓
Link format: /claim-voucher?ref={f0_code}&campaign={campaign_code}
                                                          ↓
                                              Display QR Code + Copy button
```

**Key Points:**
- Links are generated dynamically using `window.location.origin`
- UTM params: `ref` (F0 code) + `campaign` (campaign_code from KiotViet)
- Get-or-create pattern: same F0 + campaign = return existing link
- Domain auto-updates based on environment (localhost/staging/production)

### F1 Claim Voucher Flow

```
F1 opens link with UTM → Validate UTM params → Check customer status
         ↓                      ↓                       ↓
    /claim-voucher      ref + campaign required    New/Existing check
         ↓                                               ↓
    Enter phone/name → Issue voucher via KiotViet API
```

**Validation:**
- Link MUST have both `ref` and `campaign` params
- Invalid/missing params → Show "Link không hợp lệ" error
- Campaign must exist and be active in `affiliate.campaign_settings`

### Services

| Service | File | Description |
|---------|------|-------------|
| `affiliateCampaignService` | `src/services/affiliateCampaignService.ts` | Campaign & referral link operations |

**Key Methods:**
- `getActiveCampaigns()` - Get campaigns with `is_active = true`
- `getDefaultCampaign()` - Get campaign with `is_default = true`
- `getCampaignByCode(code)` - Query by `campaign_code` (not UUID)
- `createReferralLink(f0Code, campaign)` - Generate + save link
- `getReferralLinksByF0(f0Code)` - Get F0's link history
- `deleteReferralLink(linkId, f0Code)` - Delete link (ownership check)
- `generateReferralLink(f0Code, campaignCode)` - Generate URL string

## UI Components

### Toast Notification System
Global toast notifications using custom `ToastProvider` component.

**Location:** `src/components/ui/toast.tsx`

**Usage:**
```typescript
import { toast } from '@/components/ui/toast';

// Show notifications
toast.success('Operation successful!', 'Title');
toast.error('Something went wrong');
toast.info('Information message');
toast.warning('Warning message');
```

**Features:**
- Positioned at bottom-right corner
- Auto-dismiss after 4 seconds
- 4 types: success, error, info, warning
- Global event system (works anywhere in app)

**Setup in App.tsx:**
```tsx
import { ToastProvider } from '@/components/ui/toast';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>...</BrowserRouter>
    </ToastProvider>
  );
}
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components + Toast
│   ├── layout/          # Layout components (F0Layout, LandingLayout)
│   └── features/        # Feature-specific components
├── pages/
│   ├── landing/         # Landing pages (HomePage, AffiliateProgramPage, ClaimVoucherPage)
│   └── f0/              # F0 system pages
│       ├── auth/        # Auth pages (Login, Signup, OTP, ForgotPassword)
│       └── ...          # Dashboard, Profile, etc.
├── services/            # API services
│   ├── authService.ts   # Authentication service (F0 user from storage)
│   ├── affiliateCampaignService.ts  # Campaign & referral link operations (Supabase)
│   ├── campaignService.ts  # Campaign service (empty arrays, API integration ready)
│   ├── customerService.ts  # Customer check service
│   ├── externalApiService.ts  # KiotViet external API
│   └── tokenService.ts
├── lib/
│   ├── supabase.ts      # Supabase client (uses 'api' schema)
│   ├── constants.ts     # App constants
│   └── utils.ts         # Utility functions
├── types/               # TypeScript types
└── hooks/               # Custom React hooks
```

**Note:** Admin FE has been removed from this project. Admin is deployed separately at a different location but shares the same Supabase backend.

## Routes

### Landing Pages
- `/` - Homepage
- `/affiliate-program` - Affiliate program info
- `/claim-voucher` - Claim voucher page

### F0 Auth (No Layout)
- `/f0/auth/login` - Login
- `/f0/auth/signup` - Registration
- `/f0/auth/otp` - OTP verification
- `/f0/auth/forgot-password` - Forgot password (request reset email)
- `/f0/auth/reset-password` - Reset password (from email link with token)

### F0 System (With F0Layout)
- `/f0/dashboard` - Dashboard
- `/f0/create-link` - Create referral link
- `/f0/refer-customer` - Refer customer
- `/f0/referral-history` - Referral history
- `/f0/withdrawal` - Withdrawal request
- `/f0/profile` - Profile
- `/f0/notifications` - Notifications

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
- [x] Supabase project setup
- [x] Database schema `affiliate` created
- [x] Table `affiliate.f0_partners` created with triggers
- [x] Table `affiliate.otp_verifications` created
- [x] Table `affiliate.campaign_settings` created
- [x] Table `affiliate.referral_links` created
- [x] Views in `api` schema for API access
- [x] RPC function `get_vihat_credential()` for encrypted credentials
- [x] RPC function `get_resend_credential()` for encrypted Resend API key
- [x] Edge Function `send-otp-affiliate` v12 (Vihat MultiChannelMessage API)
- [x] Edge Function `verify-otp-affiliate` v18 (creates F0 partner, calls registration email)
- [x] Edge Function `login-affiliate` v13 (SHA-256 password verification, specific error codes)
- [x] Edge Function `send-affiliate-registration-email` v1 (pending approval email)
- [x] Edge Function `send-affiliate-approval-email` v1 (account activated email)
- [x] Edge Function `forgot-password-affiliate` v4 (sends reset email)
- [x] Edge Function `reset-password-affiliate` v1 (resets password with token)
- [x] Table `affiliate.password_resets` with view and INSTEAD OF triggers
- [x] ForgotPasswordPage connected to forgot-password-affiliate
- [x] ResetPasswordPage connected to reset-password-affiliate
- [x] SignupPage connected to send-otp-affiliate
- [x] OTPPage connected to verify-otp-affiliate
- [x] LoginPage connected to login-affiliate
- [x] F0 Registration flow fully working (OTP via Zalo/SMS, account creation)
- [x] Database permissions for `api` schema views (f0_partners, otp_verifications)
- [x] F0 Create Referral Link page (client-side UTM generation)
- [x] affiliateCampaignService (Supabase queries for campaigns & referral links)
- [x] ClaimVoucherPage validates UTM params (ref + campaign required)
- [x] F1 Voucher Claim flow (validateCustomerForAffiliate + issueVoucherForF1)
- [x] Edge Function `create-and-release-voucher-affiliate-internal` v6 (issue voucher via KiotViet API, save to voucher_affiliate_tracking, update JSONB conversion_count)
- [x] Table `affiliate.voucher_affiliate_tracking` for tracking affiliate vouchers
- [x] Refactored `referral_links` table to JSONB structure (1 row per F0)
- [x] Toast notification system (`src/components/ui/toast.tsx`)
- [x] ClaimVoucherPage success UI with copy/save voucher features
- [x] View `api.voucher_affiliate_tracking` with INSTEAD OF triggers
- [x] View `api.all_voucher_tracking` (unified view: regular + affiliate vouchers)
- [x] GRANT SELECT on `api.customers_backup` to anon role
- [x] Bank verification OTP flow (ProfilePage)
- [x] Edge Function `send-otp-bank-verification` v1 (send OTP for bank verification)
- [x] Edge Function `verify-otp-bank` v1 (verify OTP, save bank info, send email)
- [x] Database columns `bank_verified`, `bank_verified_at` in `f0_partners`
- [x] ProfilePage bank tab with OTP modal and form locking
- [x] Table `affiliate.withdrawal_requests` with JSONB structure
- [x] Table `affiliate.notifications` with JSONB structure
- [x] Views `api.withdrawal_requests`, `api.notifications` with INSTEAD OF triggers
- [x] Edge Function `get-f0-dashboard-stats` v1 (F0 dashboard data)
- [x] Edge Function `get-f0-referral-history` v1 (pagination, filters)
- [x] Edge Function `manage-withdrawal-request` v1 (get/create/cancel)
- [x] Edge Function `manage-notifications` v1 (get/mark_read/delete)
- [x] DashboardPage connected to real data
- [x] ReferralHistoryPage connected to real data with pagination
- [x] WithdrawalPage connected to real data
- [x] NotificationsPage connected to real data

### In Progress
- [ ] Protected routes implementation

### Pending
- [ ] Row Level Security (RLS) policies
- [ ] Real-time notifications
- [ ] Test email flow end-to-end

### Removed (Deployed Separately)
- Admin FE has been moved to a separate project (shares same Supabase backend)

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
