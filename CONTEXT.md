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

### Commission Logic
- Revenue counted only when `total = totalpayment` (fully paid)
- Commission status: pending → available → paid
- Tier calculation based on fully paid invoices only

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
| `commission_status` | invalid / pending / available / paid |
| `invalid_reason_code` | INVOICE_NOT_FULLY_PAID, VOUCHER_NOT_USED, etc. |

---

## 6. EDGE FUNCTIONS (Current Versions)

### Affiliate Flow Functions
| Function | Version | Description |
|----------|---------|-------------|
| `create-referral-link` | v3 | Creates referral link with realtime conversion count |
| `create-and-release-voucher-affiliate-internal` | v9 | Issues voucher for F1 customer claim |
| `webhook-affiliate-check-voucher-invoice` | v9 | Handles KiotViet invoice webhook for commission calculation |
| `cron-affiliate-commission-sync` | v1 | Backup cron job for missed webhooks (runs every 15 min) |

### Auth Functions
| Function | Description |
|----------|-------------|
| `send-otp-affiliate` | Sends OTP via Vihat SMS |
| `verify-otp-affiliate` | Verifies OTP and creates F0 account |
| `login-affiliate` | F0 login with SHA-256 password verification |

### F1 Customer Functions
| Function | Description |
|----------|-------------|
| `get-f0-my-customers` | Gets F1 customers list for F0 with summary stats |
| `get-f1-customer-detail` | Gets F1 customer detail with order history |

---

## 7. SERVICES LAYER

### `campaignService.ts`
| Method | Description |
|--------|-------------|
| `getRecentReferrals(f0_code, limit)` | Gets recent referrals from `voucher_affiliate_tracking` |
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

## 8. COMMISSION FLOW

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
webhook-affiliate-check-voucher-invoice:
  - If voucher used → status: used
  - If total ≠ totalpayment → commission_status: invalid (INVOICE_NOT_FULLY_PAID)
  - If total = totalpayment → commission_status: pending
         ↓
Admin reviews & approves → commission_status: available
         ↓
F0 requests withdrawal → commission_status: paid
```

---

## 9. RECENT FIXES

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

## 10. PERFORMANCE OPTIMIZATION (Pending)

See `PLAN.md` for full details. Summary:

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
