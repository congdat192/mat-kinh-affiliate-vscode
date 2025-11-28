# Project Plan - Mat Kinh Tam Duc Affiliate System

## Overview

Hệ thống Affiliate Marketing cho Mắt Kính Tâm Đức - Quản lý đối tác F0 và chương trình giới thiệu khách hàng.

---

## Phase 1: Landing Pages ✅ COMPLETED

| Task | Status | Notes |
|------|--------|-------|
| Homepage | ✅ Done | Trang chủ giới thiệu |
| Affiliate Program page | ✅ Done | Thông tin chương trình affiliate |
| Claim Voucher page | ✅ Done | Trang F1 nhận voucher |

---

## Phase 2: F0 Authentication ✅ COMPLETED

### 2.1 UI Pages
| Task | Status | Notes |
|------|--------|-------|
| Login page | ✅ Done | Email/Phone + Password |
| Signup page | ✅ Done | Phone, Email, Password, Full Name |
| OTP verification page | ✅ Done | 6-digit OTP input |
| Forgot password page | ✅ Done | UI only |

### 2.2 Backend Integration
| Task | Status | Notes |
|------|--------|-------|
| Database schema `affiliate` | ✅ Done | Supabase PostgreSQL |
| Table `f0_partners` | ✅ Done | With auto-generate f0_code trigger |
| Table `otp_verifications` | ✅ Done | Temporary OTP storage |
| Views in `api` schema | ✅ Done | With INSTEAD OF triggers |
| Edge Function `send-otp-affiliate` | ✅ Done | v12 - Vihat MultiChannelMessage (Zalo + SMS) |
| Edge Function `verify-otp-affiliate` | ✅ Done | v18 - Creates account + sends email |
| Edge Function `login-affiliate` | ✅ Done | v13 - SHA-256 password, specific error codes |
| Edge Function `send-affiliate-registration-email` | ✅ Done | v1 - Pending approval notification |
| Edge Function `send-affiliate-approval-email` | ✅ Done | v1 - Account activated notification |

### 2.3 Frontend Integration
| Task | Status | Notes |
|------|--------|-------|
| SignupPage → send-otp-affiliate | ✅ Done | |
| OTPPage → verify-otp-affiliate | ✅ Done | |
| LoginPage → login-affiliate | ✅ Done | Specific error messages |
| Forgot Password flow | ⏳ Pending | Need Edge Function |

---

## Phase 3: F0 Portal ⏳ IN PROGRESS

### 3.1 UI Pages
| Task | Status | Notes |
|------|--------|-------|
| Dashboard | ✅ Done | UI only, mock data |
| Profile page | ✅ Done | Connected to localStorage |
| Create Referral Link page | ✅ Done | Client-side UTM generation |
| Refer Customer page | ✅ Done | UI only |
| Referral History page | ✅ Done | UI only |
| Withdrawal page | ✅ Done | UI only |
| Notifications page | ✅ Done | UI only |

### 3.2 Referral Link System
| Task | Status | Notes |
|------|--------|-------|
| Table `campaign_settings` | ✅ Done | Campaign config from KiotViet |
| Table `referral_links` | ✅ Done | F0 link history |
| View `api.affiliate_campaign_settings` | ✅ Done | |
| View `api.referral_links` | ✅ Done | |
| `affiliateCampaignService` | ✅ Done | Supabase queries |
| Client-side link generation | ✅ Done | UTM params: ref + campaign |
| QR Code generation | ✅ Done | qrcode.react package |
| Link history table | ✅ Done | With delete functionality |
| ClaimVoucherPage UTM validation | ✅ Done | Required ref + campaign |

### 3.3 Voucher Issuance (Next Priority)
| Task | Status | Notes |
|------|--------|-------|
| Edge Function `issue-voucher` | ⏳ Pending | Call KiotViet API |
| ClaimVoucherPage → issue-voucher | ⏳ Pending | |
| Customer check via KiotViet | ⏳ Pending | New/Existing customer |

### 3.4 Protected Routes
| Task | Status | Notes |
|------|--------|-------|
| Auth guard component | ⏳ Pending | Check localStorage |
| Redirect unauthenticated | ⏳ Pending | → /f0/auth/login |
| Redirect pending approval | ⏳ Pending | → Pending page |

---

## Phase 4: Admin Portal ⏳ PENDING

### 4.1 UI Pages (Done)
| Task | Status | Notes |
|------|--------|-------|
| Admin Dashboard | ✅ Done | UI only |
| Partner Management | ✅ Done | UI only |
| Customer Management | ✅ Done | UI only |
| Order Management | ✅ Done | UI only |
| Commission Management | ✅ Done | UI only |
| Withdrawal Processing | ✅ Done | UI only |
| Voucher Management | ✅ Done | UI only |
| Campaign Management | ✅ Done | UI only |
| Settings | ✅ Done | UI only |

### 4.2 Backend Integration
| Task | Status | Notes |
|------|--------|-------|
| Partner approval workflow | ⏳ Pending | Update is_approved + send email |
| Campaign CRUD | ⏳ Pending | Sync with KiotViet |
| Commission calculation | ⏳ Pending | Based on tier system |
| Withdrawal processing | ⏳ Pending | Approve/Reject |
| Admin authentication | ⏳ Pending | Separate from F0 |

---

## Phase 5: KiotViet Integration ⏳ PENDING

| Task | Status | Notes |
|------|--------|-------|
| OAuth token management | ✅ Done | `supabaseapi.oauth_tokens` |
| Campaign sync | ⏳ Pending | Fetch active campaigns |
| Customer check API | ⏳ Pending | New/Existing status |
| Voucher issuance API | ⏳ Pending | Create voucher in KiotViet |
| Order tracking | ⏳ Pending | Commission calculation |

---

## Phase 6: Security & Performance ⏳ PENDING

| Task | Status | Notes |
|------|--------|-------|
| Row Level Security (RLS) | ⏳ Pending | Supabase policies |
| Rate limiting | ⏳ Pending | OTP, Login attempts |
| Input validation | ✅ Done | Frontend + Edge Functions |
| Error handling | ✅ Done | Specific error codes |

---

## Phase 7: Deployment ⏳ PENDING

| Task | Status | Notes |
|------|--------|-------|
| Vercel setup | ⏳ Pending | |
| Domain configuration | ⏳ Pending | matkinhtamduc.com |
| Environment variables | ⏳ Pending | Production secrets |
| SSL certificate | ⏳ Pending | Auto via Vercel |

---

## Current Sprint Focus

### Sprint: Voucher Issuance Flow

**Goal:** F1 có thể nhận voucher thực từ link giới thiệu

**Tasks:**
1. [ ] Tạo Edge Function `issue-voucher`
   - Input: campaign_code, f0_code, f1_phone, f1_name
   - Call KiotViet API to create voucher
   - Return voucher code

2. [ ] Integrate ClaimVoucherPage với Edge Function
   - Replace mock voucher code
   - Handle errors from KiotViet API

3. [ ] Customer check trước khi issue voucher
   - Kiểm tra khách hàng mới/cũ
   - Validate eligibility

---

## Tech Debt & Improvements

| Item | Priority | Notes |
|------|----------|-------|
| Remove mock data from services | Medium | Replace with real API calls |
| Add loading states | Low | Better UX |
| Error boundary component | Low | Catch React errors |
| Unit tests | Low | Jest + React Testing Library |
| E2E tests | Low | Playwright |

---

## Database Migrations Applied

| Migration | Date | Description |
|-----------|------|-------------|
| `create_affiliate_schema` | 2024-11 | Initial schema |
| `create_f0_partners` | 2024-11 | F0 partners table |
| `create_otp_verifications` | 2024-11 | OTP storage |
| `create_campaign_settings` | 2024-11 | Campaign config |
| `create_referral_links` | 2024-11 | Referral link history |
| `make_f0_id_nullable_in_referral_links` | 2024-11 | Allow null f0_id |

---

## Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/kcirpjxbjqagrqrjfldu
- **GitHub Repo:** https://github.com/congdat192/mat-kinh-affiliate-vscode
- **Dev Server:** http://localhost:5173
- **F0 Portal:** http://localhost:5173/f0/auth/login
- **Admin Portal:** http://localhost:5173/admin/dashboard

---

*Last Updated: 2024-11-28*
