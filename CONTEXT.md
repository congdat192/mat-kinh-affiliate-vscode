# PROJECT CONTEXT

## 1. TECH STACK

### Core
- **React** 19.2.0 - UI Framework
- **TypeScript** 5.9.3 - Type Safety
- **Vite** 7.2.2 - Build Tool

### Styling
- **Tailwind CSS** 3.4.18 - Utility-first CSS
- **clsx** + **tailwind-merge** - Class utilities

### Routing & State
- **React Router DOM** 7.9.6 - Client-side routing

### Backend
- **Supabase** 2.86.0 - Database, Auth, Edge Functions
- **Supabase CLI** 2.63.1 - Local development & deployment

### UI Components
- **Lucide React** - Icons
- **QRCode.react** - QR Code generation
- Custom shadcn/ui components

### Dev Tools
- **ESLint** 9.39.1 - Linting
- **PostCSS** + **Autoprefixer** - CSS processing

---

## 2. PROJECT STRUCTURE MAP

```
mat-kinh-affiliate-vscode/
├── .claude-skills/           # Claude AI skill definitions
│   ├── debugger.md           # Debug & fix errors
│   ├── maintainer.md         # Sync project docs
│   ├── architect.md          # Plan new features
│   ├── reviewer.md           # Code review & audit
│   ├── writer.md             # Documentation & comments
│   └── discuss.md            # Logic discussion & brainstorm
├── docs/                     # Documentation
│   └── COMMISSION_SYSTEM_PLAN.md
├── public/                   # Static assets
├── src/
│   ├── components/
│   │   ├── layout/           # Page layouts (F0Layout, LandingLayout)
│   │   └── ui/               # Reusable UI components (shadcn/ui style)
│   ├── lib/                  # Utilities & config
│   │   ├── constants.ts      # App constants, tier configs
│   │   ├── supabase.ts       # Supabase client (schema: 'api')
│   │   └── utils.ts          # Helper functions
│   ├── pages/
│   │   ├── f0/               # F0 Partner Portal
│   │   │   ├── auth/         # Auth pages (Login, Signup, OTP, Reset)
│   │   │   └── *.tsx         # Dashboard, Profile, Withdrawal, etc.
│   │   └── landing/          # Public pages (Home, ClaimVoucher)
│   ├── services/             # API service layer
│   │   ├── affiliateCampaignService.ts
│   │   ├── authService.ts
│   │   ├── customerService.ts
│   │   └── externalApiService.ts
│   ├── types/                # TypeScript type definitions
│   ├── App.tsx               # Root component with routes
│   └── main.tsx              # Entry point
├── supabase/
│   ├── functions/            # Edge Function source code (local)
│   │   ├── send-otp-affiliate/
│   │   ├── verify-otp-affiliate/
│   │   ├── login-affiliate/
│   │   └── ... (11 affiliate functions)
│   ├── config.toml           # JWT settings for all functions
│   └── DEPLOYMENT.md         # Deployment rules & restrictions
├── CLAUDE.md                 # Claude AI configuration (generic)
├── CONTEXT.md                # This file
├── TOOLKIT_MANUAL.md         # Quick command reference
├── README.md                 # Project documentation
└── package.json              # Dependencies
```

---

## 3. DEVELOPMENT RULES

### Database Access
- **ALWAYS** use schema `api` for Supabase queries
- **NEVER** query source schemas directly (`affiliate`, `kiotviet`, `supabaseapi`)
- Sensitive credentials via RPC functions + ENV decryption

### TypeScript
- Strict type enforcement enabled
- All components and services must be typed
- Types defined in `src/types/`

### Code Style
- Functional components with hooks
- Services handle API calls, components handle UI
- Toast notifications via `@/components/ui/toast`

### Commission Logic (v16 Lock System + v17 Dynamic Settings)
- Revenue counted only when `total = totalpayment` (fully paid)
- **Commission status flow**: `pending` → `locked` → `paid`
- **Lock period**: Configurable via `api.lock_payment_settings.lock_period_days` (default: 20 days)
- **Payment day**: Configurable via `api.lock_payment_settings.payment_day` (default: 5th of month)
- **Tier calculation**: Only counts `locked` + `paid` commissions (NOT pending)
- **Admin payment**: Batch payment on configured day via `admin-process-payment-batch`
- **Cancellation rules**:
  - If invoice cancelled while `pending` → commission cancelled
  - If invoice cancelled after `locked` → commission kept

### Environment
- Frontend env vars prefixed with `VITE_`
- Supabase Edge Functions use `Deno.env.get()`

---

## 4. SUPABASE RULES

### Deployment
- **CLI Required**: Use `npx supabase functions deploy` (NOT MCP tool)
- **Config File**: `supabase/config.toml` manages JWT settings
- **Restrictions**: Functions starting with numbers (2018-2025) managed via Dashboard only

### JWT Configuration
Most functions require `verify_jwt = false` for public access:
- Auth: `send-otp-affiliate`, `verify-otp-affiliate`, `login-affiliate`, `forgot-password-affiliate`, `reset-password-affiliate`
- Bank: `send-otp-bank-verification`, `verify-otp-bank`
- Email: `send-affiliate-registration-email`, `send-affiliate-approval-email`
- Dashboard: `get-f0-dashboard-stats`, `get-f0-referral-history`
- Webhooks: All `webhook-*` functions

### Protected Functions (verify_jwt = true)
- `Vietnam-timezone` (backup only)
- `otp-backup-chuan` (reference only)

See `supabase/DEPLOYMENT.md` for full list and deployment commands.

---

## 5. DATABASE TABLES

### Schema: `kiotviet`
Tables synced from KiotViet POS via webhook:

| Table | Description |
|-------|-------------|
| `invoices` | Invoice/order data (id, code, total, totalpayment, status, etc.) |
| `invoice_details` | Line items for each invoice |
| `invoice_payments` | Payment transactions for each invoice |

### Schema: `vouchers`
| Table | Description |
|-------|-------------|
| `voucher_affiliate_tracking` | Tracks F0→F1 voucher claims, usage, commission status |

### Key Fields in `voucher_affiliate_tracking`
| Column | Description |
|--------|-------------|
| `f0_code` | F0 partner code |
| `f1_phone` | F1 customer phone |
| `voucher_code` | Voucher code issued |
| `status` | claimed / used |
| `invoice_id` | Linked KiotViet invoice ID |
| `commission_status` | pending / locked / paid / cancelled |
| `qualified_at` | Timestamp when commission became pending (invoice fully paid) |
| `lock_date` | Date when commission will be locked (qualified_at + 15 days) |
| `locked_at` | Timestamp when commission was actually locked |
| `paid_at` | Timestamp when commission was paid to F0 |

---

## 6. EDGE FUNCTIONS (Current Versions)

### Affiliate Flow Functions
| Function | Version | Description |
|----------|---------|-------------|
| `create-referral-link` | v3 | Creates referral link with realtime conversion count |
| `create-and-release-voucher-affiliate-internal` | v9 | Issues voucher for F1 customer claim |
| `webhook-affiliate-check-voucher-invoice` | v10 | Handles KiotViet invoice webhook for commission calculation (lock system v16) |
| `cron-affiliate-commission-sync` | v1 | Backup cron job for missed webhooks (runs every 15 min) |
| `cron-lock-commissions` | v1 | Locks pending commissions after 15-day period (runs daily at 1:00 AM) |
| `admin-process-payment-batch` | v2 | Admin batch payment with selective F0 support (monthly/selective modes) |

### Auth Functions
| Function | Description |
|----------|-------------|
| `send-otp-affiliate` | Sends OTP via Vihat SMS |
| `verify-otp-affiliate` | Verifies OTP and creates F0 account |
| `login-affiliate` | F0 login with SHA-256 password verification |

### F1 Customer Functions
| Function | Version | Description |
|----------|---------|-------------|
| `get-f0-my-customers` | v2 | Gets F1 customers list for F0 with lock system fields |
| `get-f1-customer-detail` | v2 | Gets F1 customer detail with order history + lock system |
| `get-f0-dashboard-stats` | v17 | Dashboard stats with lock system + dynamic lock settings from database |
| `get-f0-payment-history` | v1 | Payment batches, locked/pending commissions, batch details |

---

## 7. SERVICES LAYER

### `campaignService.ts`
| Method | Description |
|--------|-------------|
| `getRecentReferrals(f0_code, limit)` | Gets recent referrals from `voucher_affiliate_tracking` (v2: fixed column mapping) |
| `getAllCampaigns()` | Returns active campaigns |
| `issueVoucher(request)` | Issues voucher via external API |

### `affiliateCampaignService.ts`
| Method | Description |
|--------|-------------|
| `getAffiliateCampaigns(f0Code)` | Gets campaigns assigned to F0 with conversion counts |
| `createReferralLink(f0Code, campaignId)` | Creates shareable referral link |
| `claimVoucher(f1Phone, f1Name, refCode, campaignId)` | Claims voucher for F1 |

### `f1CustomerService.ts`
| Method | Description |
|--------|-------------|
| `getMyCustomers(f0_id, options)` | Gets list of F1 customers for F0 with pagination & search |
| `getCustomerDetail(f0_id, f1_phone)` | Gets F1 customer detail with order history |

---

## 8. COMMISSION FLOW (v16 Lock System)

```
F0 creates referral link
         ↓
F1 clicks link & claims voucher
         ↓
Voucher tracked in voucher_affiliate_tracking (status: claimed)
         ↓
F1 purchases at store with voucher
         ↓
KiotViet webhook fires on invoice create/update
         ↓
webhook-affiliate-check-voucher-invoice (v10):
  - If voucher used → status: used
  - If total ≠ totalpayment → commission stays pending (re-check on next webhook)
  - If total = totalpayment → commission_status: pending, qualified_at: now, lock_date: +15 days
         ↓
┌─────────── 15-day waiting period ───────────┐
│                                              │
│  If invoice cancelled → commission cancelled │
│  Invoice still valid → commission protected  │
│                                              │
└──────────────────────────────────────────────┘
         ↓
cron-lock-commissions (daily at 1:00 AM):
  - If lock_date <= today AND status = pending → commission_status: locked
  - Updates F0 tier based on locked + paid commissions
         ↓
admin-process-payment-batch (v2):
  - Mode 1: Selective - Pays specific F0s via f0_ids array
  - Mode 2: Monthly - Pays all locked commissions for payment_month
  - Creates payment batch record
  - Updates commission_status: locked → paid
  - Sends notification to each F0
         ↓
F0 receives payment (bank transfer / cash)
```

### Key Rules
- **EXP/Tier Calculation**: Only `locked` + `paid` count (pending does NOT count)
- **F0 Cannot Withdraw**: Admin initiates all payments via batch process
- **Cancellation Window**: 15 days for invoice corrections before commission locks
- **No Rollback**: Once locked, commission cannot be cancelled even if invoice cancelled later

---

## 9. RECENT FIXES

### 2025-12-03 (Fixes & Improvements)
- **LoginPage.tsx**: Fixed login error display
  - Problem: `supabase.functions.invoke()` doesn't properly surface HTTP error body from Edge Functions
  - Solution: Switched to direct `fetch()` call for proper error handling
  - Error messages from Edge Function (Vietnamese) now display correctly to user
- **campaignService.ts**: Fixed `getRecentReferrals()` column mapping
  - Problem: Service was querying wrong columns (`f1_phone`, `f1_name`, `claimed_at`)
  - Solution: Updated to correct columns (`recipient_phone`, `recipient_name`, `created_at`)
  - View `api.voucher_affiliate_tracking` columns: `code`, `recipient_phone`, `recipient_name`, `recipient_email`, `created_at`, `activation_status`, `voucher_used`
- **admin-process-payment-batch v2**: Upgraded to support selective F0 payment
  - Added `f0_ids` array parameter for selective mode
  - Added `payment_mode` response field (`'selective'` | `'monthly'`)
  - Added `f0_summary` with notification_sent status per F0
  - Called from ERP Admin `BatchPaymentPage` with month filter

### 2025-12-03 Session 3 (UI Cleanup)
- **WithdrawalPage.tsx**: Removed duplicate Balance Summary Cards
  - Removed lines 896-918 (3 cards: Chờ xác thực, Đã xác thực, Đã Nhận at top of page)
  - These cards duplicated content already shown in "Tổng quan" tab (Overview Tab)
  - Now page goes directly from header → bank warning → tabs

### 2025-12-03 Session 2 (Payment History Enhancement)
- **WithdrawalPage.tsx**: Major extension with payment history feature
  - Added Tabs component: "Tổng quan" (Overview) and "Lịch sử thanh toán" (History)
  - **Overview Tab**: Existing commission status (pending/locked/paid), bank info, payment flow info
  - **History Tab**:
    - Payment batches list with view detail button
    - Summary cards (total batches, total paid, locked amount)
    - Locked commissions table (waiting for next payment)
    - Pending commissions table (with days_until_lock countdown)
  - **Batch Detail Modal**:
    - Commission breakdown summary (basic, tier bonus, first order, total)
    - Full commission records table with all details
    - Customer info with "Khách mới" badge
    - Invoice dates and amounts
  - New types: `PaymentBatch`, `CommissionRecord`, `PaymentHistoryData`, `BatchDetailData`
  - New state: `paymentHistory`, `loadingHistory`, `selectedBatch`, `batchDetail`, `activeTab`
  - New functions: `fetchPaymentHistory()`, `fetchBatchDetail()`, `handleViewBatchDetail()`

- **New Edge Function**: `get-f0-payment-history`
  - **Endpoint**: POST `/functions/v1/get-f0-payment-history`
  - **Parameters**:
    - `f0_id` (required): F0 partner UUID
    - `action` (optional): `'get_batch_detail'` for specific batch
    - `batch_id` (optional): Required when action is `'get_batch_detail'`
    - `limit` (optional): Max records per query (default: 50)
  - **Default Response**:
    - `payment_batches[]`: F0's payment batches with calculated amounts
    - `locked_commissions[]`: Commissions waiting for payment
    - `pending_commissions[]`: Commissions waiting for lock
    - `summary`: Totals and counts
  - **Batch Detail Response**:
    - `batch`: Payment batch info
    - `commissions[]`: All commission records in batch
    - `breakdown`: { basic_total, tier_bonus_total, first_order_total, total, count }

### 2025-12-02 (Dynamic Lock Settings v17)
- **Dynamic Lock Settings**: Lock period and payment day now fetched from database instead of hardcoded
- **Edge Functions Updated**:
  - `get-f0-dashboard-stats` v17: Added `lock_payment_settings` query, returns `lockSettings: { lockPeriodDays, paymentDay }`
- **F0 Portal Updates**:
  - `WithdrawalPage.tsx`: Replaced all hardcoded "15 ngày" → `{lockSettings.lockPeriodDays}`, "ngày 5" → `{lockSettings.paymentDay}`
  - `DashboardPage.tsx`: Same dynamic replacement for lock period displays
- **Database Table Used**: `api.lock_payment_settings` (synced with `affiliate.lock_payment_settings` from Admin Portal)
  - Current values: `lock_period_days = 20`, `payment_day = 5`

### 2025-12-02 (Commission Lock System v16 - Full Implementation)
- **Commission Lock System Implementation**: Major overhaul of commission status flow
  - Old: `pending` → `available` → `paid` (F0 requests withdrawal)
  - New: `pending` → `locked` → `paid` (Admin batch payment)
- **Edge Functions Updated/Created**:
  - `webhook-affiliate-check-voucher-invoice` v10: Added lock system fields (`qualified_at`, `lock_date`)
  - `cron-lock-commissions` v1: Daily cron job to lock pending commissions after 15 days
  - `admin-process-payment-batch` v1: Admin batch payment function for locked commissions
  - `get-f0-dashboard-stats` v16: Dashboard stats with pending/locked/paid breakdown
  - `get-f0-my-customers` v2: Added `locked_commission`, `cancelled_commission` fields
  - `get-f1-customer-detail` v2: Added lock system fields (`qualified_at`, `lock_date`, `locked_at`, `days_until_lock`)
- **F0 Portal Updates**:
  - `DashboardPage.tsx`: New commission status cards showing pending/locked/paid
  - `MyCustomersPage.tsx`: Updated status badges with `days_until_lock` countdown, commission breakdown (Chờ xác thực/Đã xác thực/Đã nhận)
  - `WithdrawalPage.tsx`: Converted to "Thanh Toán Hoa Hồng" (payment status page), fetches both `manage-withdrawal-request` + `get-f0-dashboard-stats` for lock system data
  - `src/types/f1Customer.ts`: Added `CommissionStatus` type and lock system fields
- **Database VIEWs Updated**:
  - `api.f1_customers_summary`: Added `locked_commission`, `cancelled_commission`, changed 'available' → 'locked'
  - `api.f1_customer_orders`: Added `qualified_at`, `lock_date`, `locked_at`, updated `status_label` CASE
- **Database Schema Changes**:
  - Added columns to `voucher_affiliate_tracking`: `qualified_at`, `lock_date`, `locked_at`
  - `commission_status` values: `pending`, `locked`, `paid`, `cancelled`

### 2025-12-01 (Session 2)
- **MyCustomersPage.tsx UI Redesign**: Complete rewrite with new CRM-style UI
  - Compact summary bar (thay vì 4 cards riêng lẻ)
  - Table với expandable rows (click để xem inline details)
  - Lazy load orders khi expand row
  - Removed separate CustomerDetailPage (inline display)
- **MyCustomersPage.tsx Bug Fixes**:
  - Fixed `order_type` display - API trả về Vietnamese (`"Đơn đầu tiên"` / `"Đơn quay lại"`), không phải English
  - Fixed pagination always show count (không chỉ khi > 1 page)
- **VIEW Permissions Fix**: Added GRANT SELECT cho `api.f1_customers_summary` và `api.f1_customer_orders` cho service_role, anon, authenticated
- **Performance Review**: Created optimization plan in `PLAN.md`
  - Identified 3 Edge Functions có thể thay bằng direct Supabase query
  - `get-f0-my-customers`, `get-f1-customer-detail`, `manage-notifications` (GET only)
  - Estimated improvement: 300-800ms per request (eliminate cold start)

### 2025-12-01 (Session 1)
- **ReferCustomerPage.tsx**: Removed mock data, now loads real referrals from database
- **campaignService.ts**: Added `getRecentReferrals()` method
- **webhook-affiliate-check-voucher-invoice v8**: Fixed type mismatch bug comparing `invoice_id` (string vs number)
- **webhook-affiliate-check-voucher-invoice v9**: Added `recalculateF0Tier()` function for auto tier upgrade
- **api.commission_records VIEW**: Added `invoice_cancelled_at` column
- **Cron Backup System**: Added VIEW `vouchers_need_commission_check` + Edge Function `cron-affiliate-commission-sync` + pg_cron job (every 15 min)
- **get-f0-dashboard-stats v15**: Fixed F1 stats calculation - now uses `commission_records` instead of querying `kiotviet.invoices` (cross-schema query was failing silently)
- **Supabase CLI**: Installed as dev dependency (v2.64.1), updated CLAUDE.md with deployment rules (MCP cannot disable JWT)
- **F1 Customer Feature**: New "F1 Của Bạn" tab in F0 portal
  - VIEWs: `api.f1_customers_summary`, `api.f1_customer_orders` (realtime data from commission_records)
  - Edge Functions: `get-f0-my-customers`, `get-f1-customer-detail`
  - Frontend: `MyCustomersPage.tsx` (with inline detail view)
  - Service: `f1CustomerService.ts`
  - Types: `src/types/f1Customer.ts`

---

## 10. RELATED PROJECTS

### Admin Affiliate Portal (ERP Module)
- **Location**: `d:\ERP-FE-fresh\src\modules\affiliate\` (separate repo)
- **Repo**: `https://github.com/DKHoa2509/ERP-FE.git`
- **Purpose**: Admin quản lý hệ thống Affiliate
- **Key Features**:
  - BatchPaymentPage: Thanh toán hoa hồng theo batch với filter tháng
  - AffiliateSettingsPage: Cài đặt lock period, payment day
  - F0ApprovalPage: Phê duyệt F0 partner
- **Shared Resources**:
  - Same Supabase project (`kcirpjxbjqagrqrjfldu`)
  - Same schema `api` và `affiliate`
  - Same Edge Functions (+ thêm `admin-*` functions)

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Shared)                        │
│  Database │ Auth │ Edge Functions │ Storage                      │
└─────────────────────────────────────────────────────────────────┘
         ▲                                      ▲
         │                                      │
    ┌────┴────┐                           ┌────┴────┐
    │   F0    │                           │  Admin  │
    │ Portal  │                           │ ERP     │
    │ (This)  │                           │(modules/│
    │         │                           │affiliate│
    └─────────┘                           └─────────┘
    mat-kinh-affiliate-vscode/         ERP-FE-fresh/
    localhost:5174                     localhost:8080
```

---

## 11. PERFORMANCE OPTIMIZATION (Completed)

### Phase 1 & 2: ✅ COMPLETED (2025-12-02)
- Direct Supabase queries thay Edge Functions cho simple reads
- React.memo cho CustomerRow, OrderRow
- useMemo cho summary calculations

### Can Replace with Direct Query
| Edge Function | Estimated Improvement |
|--------------|----------------------|
| `get-f0-my-customers` | 300-800ms |
| `get-f1-customer-detail` | 200-500ms |
| `manage-notifications` (GET) | 200-400ms |

### Must Keep as Edge Function
| Edge Function | Reason |
|--------------|--------|
| `get-f0-dashboard-stats` | Complex: 7 queries, tier calculation, adjustments |
| `get-f0-referral-history` | Complex: 4 joins, nested response |
| `manage-withdrawal-request` | Business logic validation |
| `send-otp-*`, `verify-otp-*` | External API / Security |

---

## 12. Commission Status Labels (v7 - Simplified)

### Overview
Đơn giản hóa cột "Trạng Thái Hoa Hồng" trong ReferralHistoryPage và MyCustomersPage để F0 dễ hiểu hơn.

### Label Mapping (Database VIEW + UI)

| Database Status | status_label (View) | UI Badge | Icon | Color |
|-----------------|---------------------|----------|------|-------|
| `pending` | Chờ xác nhận | 🟡 Warning | Clock | Vàng |
| `available` | Chờ xác nhận | 🟡 Warning | Clock | Vàng |
| `locked` | Chờ thanh toán | 🔵 Info | Lock | Xanh dương |
| `paid` | Đã thanh toán | 🟢 Success | CheckCircle | Xanh lá |
| `cancelled` | Đã hủy | 🔴 Danger | X | Đỏ |

### Changes from v5 → v7
- "Đã xác thực" → "Chờ thanh toán" (lockedAt cases)
- "Chờ xác thực" → "Chờ xác nhận" (pending cases)
- "Còn X ngày" moved to "Điều Kiện" column (not "TT Hoa Hồng")
- "Đã hủy" only shows for `INVOICE_CANCELLED` or `cancelled` status (not all invalid cases)

### UI Logic - Column "Trạng Thái Hoa Hồng"
```typescript
// ReferralHistoryPage.tsx - v7 simplified
if (paidAt)                              → "Đã thanh toán" 🟢
else if (cancelled || INVOICE_CANCELLED) → "Đã hủy" 🔴
else if (lockedAt)                       → "Chờ thanh toán" 🔵
else if (invoiceInfo)                    → "Chờ xác nhận" 🟡
else                                     → "--"
```

### UI Logic - Column "Điều Kiện" (with "X ngày")
```typescript
// ReferralHistoryPage.tsx - v7
if (invalid)                → "KH cũ dùng" / "HĐ đã hủy" / "Không hợp lệ" ❌
else if (paid || lockedAt)  → "Đủ điều kiện" ✅
else if (invoiceInfo)       → "Chờ xử lý (X ngày)" ⏳  // Days countdown here!
else                        → "Chưa mua" --
```

### Files Updated
- **Database VIEW**: `api.f1_customer_orders` - status_label CASE updated
- **ReferralHistoryPage.tsx**: Column "TT Hoa Hồng" (v7) + Column "Điều Kiện" (v7)
- **MyCustomersPage.tsx**: `getStatusBadge()`, Revenue/Commission Breakdown labels

---

## 13. Database Trigger Fixes (2025-12-03)

### Fix 1: VIEW Update Trigger - Missing Payment Columns
**Problem:** Trigger function `api.commission_records_update_trigger()` không cập nhật các cột payment khi UPDATE qua VIEW.

**Root Cause:** Các cột sau bị thiếu trong trigger:
- `paid_at`, `paid_by`, `paid_by_name`, `payment_batch_id`
- `locked_at`, `locked_by`, `locked_by_name`

**Solution:** Updated trigger function to include all payment/lock columns:
```sql
-- Migration: fix_commission_records_update_trigger_add_payment_columns
CREATE OR REPLACE FUNCTION api.commission_records_update_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE affiliate.commission_records SET
    -- ... existing columns ...
    -- PAYMENT COLUMNS (ADDED)
    paid_at = NEW.paid_at,
    paid_by = NEW.paid_by,
    paid_by_name = NEW.paid_by_name,
    payment_batch_id = NEW.payment_batch_id,
    -- LOCK COLUMNS (ADDED)
    locked_at = NEW.locked_at,
    locked_by = NEW.locked_by,
    locked_by_name = NEW.locked_by_name,
    updated_at = now()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$;
```

### Fix 2: Auto-Sync commission_status Between Tables
**Problem:** `commission_records.status` và `voucher_affiliate_tracking.commission_status` không đồng bộ.

**Solution:** Created new trigger to sync status changes:
```sql
-- Migration: add_trigger_sync_voucher_tracking_commission_status
CREATE FUNCTION affiliate.sync_voucher_tracking_commission_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE affiliate.voucher_affiliate_tracking
    SET commission_status = NEW.status, updated_at = now()
    WHERE code = NEW.voucher_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_voucher_tracking_on_status_change
AFTER UPDATE OF status ON affiliate.commission_records
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION affiliate.sync_voucher_tracking_commission_status();
```

### Data Sync Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA SYNC FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  admin-process-payment-batch (Edge Function)                    │
│         │                                                       │
│         ▼                                                       │
│  UPDATE api.commission_records (VIEW)                           │
│         │                                                       │
│         ▼                                                       │
│  INSTEAD OF UPDATE trigger                                      │
│         │                                                       │
│         ▼                                                       │
│  affiliate.commission_records (TABLE)                           │
│    - status = 'paid'                                            │
│    - paid_at = NOW()                                            │
│    - payment_batch_id = batchId                                 │
│         │                                                       │
│         ▼                                                       │
│  sync_voucher_tracking_on_status_change trigger                 │
│         │                                                       │
│         ▼                                                       │
│  affiliate.voucher_affiliate_tracking                           │
│    - commission_status = 'paid'                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 14. Admin Delete F0 Feature (2025-12-03)

### Overview
Admin có thể xóa hoàn toàn F0 Partner từ ERP Admin Portal. Khi F0 bị xóa, tất cả session của F0 đó trên Portal này sẽ bị invalid.

### Impact on F0 Portal
- **Auto Logout**: Khi Admin xóa F0, `auth.users` record bị xóa → F0 đang đăng nhập sẽ bị logout tự động
- **Data Loss**: Tất cả dữ liệu liên quan bị xóa vĩnh viễn (referrals, commissions, vouchers, etc.)
- **Avatar**: URL avatar có thể vẫn accessible 1-24 giờ do CDN caching

### RPC Function (Called from ERP Admin)
```sql
api.delete_f0_partner_cascade(p_f0_id UUID)
```

### Cascade Delete Tables
1. `affiliate.referral_links`
2. `affiliate.voucher_affiliate_tracking`
3. `affiliate.f1_customer_assignments`
4. `affiliate.commission_records`
5. `affiliate.commission_history`
6. `affiliate.withdrawal_requests`
7. `affiliate.notifications`
8. `affiliate.otp_verifications`
9. `affiliate.password_resets`
10. `affiliate.payment_batches`
11. `auth.users`
12. `storage.objects` (avatars)
13. `affiliate.f0_partners`

### Error Handling (F0 Portal)
Khi F0 bị xóa nhưng session chưa expired:
- Supabase queries sẽ return empty/null
- Auth context sẽ detect invalid session
- User redirected to login page
