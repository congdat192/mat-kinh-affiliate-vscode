# ADMIN AFFILIATE PORTAL - IMPLEMENTATION PLAN

## Ngày: 2025-12-02
## Mục tiêu: Xây dựng Admin Portal (PROJECT RIÊNG) để quản lý hệ thống Affiliate

---

## 1. TỔNG QUAN

### 1.1 Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Database   │  │   Auth      │  │    Edge Functions       │  │
│  │  (Shared)   │  │  (Shared)   │  │    (Shared)             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ▲                                      ▲
         │                                      │
    ┌────┴────┐                           ┌────┴────┐
    │   F0    │                           │  Admin  │
    │ Portal  │                           │ Portal  │
    │ (This)  │                           │ (NEW)   │
    └─────────┘                           └─────────┘
    mat-kinh-affiliate-vscode/         admin-affiliate/ (NEW PROJECT)
```

### 1.2 Shared Resources
- **Database**: Cùng Supabase project `kcirpjxbjqagrqrjfldu`
- **Schema**: Cùng schema `api` và `affiliate`
- **Edge Functions**: Cùng functions, tạo thêm `admin-*` functions
- **Auth**: Admin dùng Supabase Auth riêng (email/password với role)

### 1.3 F0 Portal Hiện Có (Reference)
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/f0/dashboard` | Stats, tier, commission overview |
| MyCustomers | `/f0/my-customers` | F1 list + inline detail với orders |
| ReferCustomer | `/f0/refer-customer` | Create referral links, claim vouchers |
| ReferralHistory | `/f0/referral-history` | Voucher usage history |
| Withdrawal | `/f0/withdrawal` | Commission payment status (v16: readonly) |
| Profile | `/f0/profile` | F0 profile, bank info |
| Notifications | `/f0/notifications` | System notifications |

---

## 2. DATABASE SCHEMA (Đã có - Shared)

### 2.1 Tables chính cho Admin
| Table | Schema | Mục đích Admin |
|-------|--------|----------------|
| `f0_partners` | affiliate | Quản lý F0: approve, suspend, view |
| `commission_records` | affiliate | View commissions, batch payment |
| `payment_batches` | affiliate | Track payment history |
| `lock_payment_settings` | affiliate | Configure lock period, payment day |
| `commission_settings` | affiliate | Configure commission rates |
| `f0_tiers` | affiliate | Configure tier requirements & benefits |
| `affiliate_campaign_settings` | affiliate | Manage campaigns |
| `notifications` | affiliate | Send announcements |
| `voucher_affiliate_tracking` | affiliate | Track voucher usage |
| `f1_customer_assignments` | affiliate | F0-F1 relationships |

### 2.2 VIEWs hiện có (Schema `api`)
| VIEW | Description | Có thể dùng cho Admin |
|------|-------------|----------------------|
| `f0_partners` | F0 partner info | ✅ |
| `commission_records` | Commission records | ✅ |
| `f1_customers_summary` | F1 summary per F0 | ✅ |
| `f1_customer_orders` | F1 order history | ✅ |
| `notifications` | Notifications | ✅ |
| `f0_tiers` | Tier config | ✅ |

### 2.3 VIEWs cần tạo thêm cho Admin
```sql
-- api.admin_system_stats: Overall system stats
-- api.admin_f0_overview: F0 list with commission stats
-- api.admin_commission_by_month: Commission grouped by month
-- api.admin_payment_batches: Payment batch history
```

---

## 3. COMMISSION FLOW (v16 Lock System)

### 3.1 Status Flow
```
pending (15 ngày) → locked (chốt) → paid (thanh toán)
     ↓                                    ↑
 cancelled                         Admin batch pay
(nếu hủy đơn)                    (ngày 5 mỗi tháng)
```

### 3.2 Key Business Rules
- **Lock Period**: 15 ngày sau khi invoice fully paid
- **Tier Calculation**: Chỉ count `locked` + `paid` (NOT pending)
- **Payment Day**: Ngày 5 mỗi tháng
- **Cancellation**: Pending có thể cancel, Locked thì giữ commission

### 3.3 Edge Functions liên quan
| Function | Version | Description |
|----------|---------|-------------|
| `webhook-affiliate-check-voucher-invoice` | v10 | Xử lý invoice webhook, tính commission |
| `cron-lock-commissions` | v1 | Daily job lock pending → locked |
| `admin-process-payment-batch` | v1 | Batch payment locked → paid |
| `get-f0-dashboard-stats` | v16 | F0 dashboard với lock system |
| `get-f0-my-customers` | v2 | F1 list với lock fields |
| `get-f1-customer-detail` | v2 | F1 detail với order lock status |

---

## 4. ADMIN PORTAL STRUCTURE (NEW PROJECT)

### 4.1 Tech Stack (Recommend same as F0)
```
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Supabase JS Client
- React Router DOM
- Lucide React (icons)
- shadcn/ui components
```

### 4.2 Project Structure
```
admin-affiliate/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── AdminLayout.tsx      # Sidebar + Header
│   │   └── ui/                      # Copy từ F0 hoặc shadcn fresh
│   ├── lib/
│   │   ├── supabase.ts              # Same config, schema: 'api'
│   │   ├── utils.ts                 # Format currency, date...
│   │   └── constants.ts             # Tier colors, status labels
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── F0PartnersPage.tsx
│   │   ├── F0DetailPage.tsx
│   │   ├── CommissionsPage.tsx
│   │   ├── PaymentPage.tsx
│   │   ├── CampaignsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/
│   │   └── adminService.ts          # All admin API calls
│   ├── types/
│   │   └── admin.ts                 # Admin-specific types
│   ├── App.tsx
│   └── main.tsx
├── .env                             # Same Supabase credentials
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

### 4.3 Routes
```
/auth/login                → Admin login
/dashboard                 → System overview
/f0-partners               → F0 list
/f0-partners/:id           → F0 detail
/commissions               → Commission list
/commissions/payment       → Batch payment
/campaigns                 → Campaign management
/settings                  → System settings
/settings/tiers            → Tier configuration
/settings/commission       → Commission rate config
```

---

## 5. PHASE IMPLEMENTATION

### Phase 1: Project Setup & Auth (2-3 days)
**Goal:** Admin có thể login và xem dashboard cơ bản

#### Tasks:
- [ ] Init new Vite + React + TypeScript project
- [ ] Setup Tailwind CSS
- [ ] Copy/setup shadcn/ui components từ F0
- [ ] Setup Supabase client (same project ID)
- [ ] Create AdminLayout with sidebar
- [ ] Setup Supabase Auth for admin
- [ ] Create LoginPage
- [ ] Create basic DashboardPage

#### Database:
- [ ] Create admin user in Supabase Auth với `user_metadata.role = 'admin'`
- [ ] Create VIEW `api.admin_system_stats`

#### Deliverables:
- Admin login working
- Dashboard showing basic stats

---

### Phase 2: F0 Management (3-4 days)
**Goal:** Admin có thể xem và quản lý F0 partners

#### Tasks:
- [ ] Create F0PartnersPage với table + filters
- [ ] Create F0DetailPage với:
  - Profile info
  - Bank info (readonly)
  - Commission history (copy UI từ F0 MyCustomers)
  - F1 customers list
- [ ] Implement Approve/Suspend F0
- [ ] Send notification on approve/suspend

#### Edge Functions:
- [ ] `admin-list-f0-partners` - List với pagination, filters
- [ ] `admin-get-f0-detail` - Detail với commissions
- [ ] `admin-approve-f0` - Approve pending F0
- [ ] `admin-suspend-f0` - Suspend F0

#### Database:
- [ ] Create VIEW `api.admin_f0_overview`

#### Deliverables:
- F0 list với search, filter by status/tier
- F0 detail page
- Approve/Suspend functionality

---

### Phase 3: Commission & Payment (3-4 days)
**Goal:** Admin có thể xem commissions và xử lý thanh toán

#### Tasks:
- [ ] Create CommissionsPage với:
  - Summary cards (pending/locked/paid by month)
  - Table với all commissions
  - Filters: status, month, F0, F1 phone
- [ ] Create PaymentPage với:
  - Month selector
  - Preview F0 list với amounts
  - Confirm & process button
  - Result summary
- [ ] Payment history section

#### Edge Functions:
- [ ] `admin-list-commissions` - List với filters
- [ ] Fix `admin-process-payment-batch` (SQL injection vulnerability)
- [ ] `admin-list-payment-batches` - Payment history
- [ ] `admin-get-payment-preview` - Preview before payment

#### Database:
- [ ] Create VIEW `api.admin_commission_by_month`
- [ ] Create VIEW `api.admin_payment_batches`

#### Deliverables:
- Commission list với filters
- Batch payment flow
- Payment history

---

### Phase 4: Campaign Management (2-3 days)
**Goal:** Admin có thể quản lý campaigns

#### Tasks:
- [ ] Create CampaignsPage với:
  - Campaign list với voucher stats
  - Toggle active/inactive
  - Edit campaign settings
- [ ] Campaign edit modal

#### Edge Functions:
- [ ] `admin-list-campaigns`
- [ ] `admin-update-campaign`

#### Deliverables:
- Campaign list
- Campaign edit functionality

---

### Phase 5: System Settings (2-3 days)
**Goal:** Admin có thể cấu hình hệ thống

#### Tasks:
- [ ] Create SettingsPage với:
  - Lock period (days)
  - Payment day of month
- [ ] Create TierSettingsPage với:
  - Tier list với requirements & benefits
  - Edit tier modal
- [ ] Create CommissionSettingsPage với:
  - Basic rate
  - First order bonus
  - Commission rules

#### Edge Functions:
- [ ] `admin-get-settings`
- [ ] `admin-update-lock-settings`
- [ ] `admin-update-tier`
- [ ] `admin-update-commission-settings`

#### Deliverables:
- Lock & payment settings
- Tier configuration
- Commission rate configuration

---

### Phase 6: Advanced Features (3-4 days)
**Goal:** Các tính năng nâng cao

#### Tasks:
- [ ] Announcements - Send to all/selected F0s
- [ ] Export commissions to CSV
- [ ] Audit log page

#### Edge Functions:
- [ ] `admin-send-announcement`
- [ ] `admin-export-data`

#### Deliverables:
- Announcement system
- Export functionality
- Audit log

---

## 6. UI/UX REFERENCE FROM F0 PORTAL

### 6.1 Commission Status Colors (Reuse)
```typescript
// From F0 MyCustomersPage.tsx
const getStatusBadge = (status: string, label: string, daysUntilLock?: number) => {
  switch (status) {
    case 'paid':      // Green - CheckCircle2 icon
    case 'locked':    // Purple - Lock icon
    case 'pending':   // Orange - Clock icon + days countdown
    case 'cancelled': // Red - XCircle icon
  }
};
```

### 6.2 Commission Breakdown Cards (Reuse)
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Chờ chốt   │  Đã chốt    │  Đã nhận    │   Tổng      │
│  (orange)   │  (purple)   │  (green)    │  (gray)     │
│  pending    │  locked     │  paid       │  total      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### 6.3 Tier Badge Colors (From constants.ts)
```typescript
const tierConfigs = {
  BRONZE:   { color: '#CD7F32', gradient: 'from-amber-600 to-amber-800' },
  SILVER:   { color: '#C0C0C0', gradient: 'from-gray-400 to-gray-600' },
  GOLD:     { color: '#FFD700', gradient: 'from-yellow-400 to-yellow-600' },
  PLATINUM: { color: '#E5E4E2', gradient: 'from-slate-300 to-slate-500' },
  DIAMOND:  { color: '#B9F2FF', gradient: 'from-cyan-300 to-blue-500' },
};
```

### 6.4 Currency & Date Formatting (Reuse)
```typescript
// Format currency: 1,500,000đ
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

// Format date: 02/12/2024 14:30
const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('vi-VN');
```

---

## 7. EDGE FUNCTIONS SUMMARY

### 7.1 Existing (Shared with F0)
| Function | Can Admin Use? |
|----------|---------------|
| `get-f0-dashboard-stats` | ✅ For F0 detail page |
| `get-f0-my-customers` | ✅ For F0's F1 list |
| `get-f1-customer-detail` | ✅ For F1 orders |

### 7.2 New Admin Functions
| Function | Description |
|----------|-------------|
| `admin-list-f0-partners` | List F0 với filters |
| `admin-get-f0-detail` | F0 detail với commissions |
| `admin-approve-f0` | Approve pending F0 |
| `admin-suspend-f0` | Suspend F0 |
| `admin-list-commissions` | List all commissions |
| `admin-process-payment-batch` | (Exists - fix SQL injection) |
| `admin-list-payment-batches` | Payment history |
| `admin-get-payment-preview` | Preview before pay |
| `admin-list-campaigns` | List campaigns |
| `admin-update-campaign` | Update campaign |
| `admin-get-settings` | Get all settings |
| `admin-update-lock-settings` | Update lock config |
| `admin-update-tier` | Update tier |
| `admin-update-commission-settings` | Update rates |
| `admin-send-announcement` | Send notifications |
| `admin-export-data` | Export to CSV |

---

## 8. SECURITY

### 8.1 Admin Authentication
```typescript
// Login with Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@example.com',
  password: 'secure_password'
});

// Check admin role
const isAdmin = data.user?.user_metadata?.role === 'admin';
```

### 8.2 Edge Function Authorization
```typescript
// In admin-* functions
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

const { data: { user }, error } = await supabase.auth.getUser(token);
if (!user || user.user_metadata?.role !== 'admin') {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
```

### 8.3 Admin Functions Deploy
```bash
# Admin functions CẦN verify_jwt = true
npx supabase functions deploy admin-list-f0-partners
# (default is verify_jwt = true, không cần --no-verify-jwt)
```

---

## 9. ENV CONFIGURATION

### 9.1 Admin Project .env
```env
# Same as F0 Portal
VITE_SUPABASE_URL=https://kcirpjxbjqagrqrjfldu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...

# Optional: Different anon key for admin (if created)
# VITE_SUPABASE_ADMIN_KEY=eyJ...
```

### 9.2 Supabase Client Config
```typescript
// src/lib/supabase.ts (same as F0)
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    db: { schema: 'api' }  // IMPORTANT: Same schema
  }
);
```

---

## 10. TIMELINE

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Setup & Auth | 2-3 days | HIGH |
| Phase 2: F0 Management | 3-4 days | HIGH |
| Phase 3: Commission & Payment | 3-4 days | HIGH |
| Phase 4: Campaign Management | 2-3 days | MEDIUM |
| Phase 5: System Settings | 2-3 days | MEDIUM |
| Phase 6: Advanced Features | 3-4 days | LOW |

**Total Estimate:** 15-21 days

---

## 11. CHECKLIST

### Phase 1: Setup & Auth
- [ ] Init Vite + React + TS project
- [ ] Setup Tailwind + shadcn/ui
- [ ] Setup Supabase client
- [ ] Create admin user in Supabase
- [ ] AdminLayout.tsx
- [ ] LoginPage.tsx
- [ ] DashboardPage.tsx
- [ ] VIEW `api.admin_system_stats`

### Phase 2: F0 Management
- [ ] VIEW `api.admin_f0_overview`
- [ ] `admin-list-f0-partners` function
- [ ] `admin-get-f0-detail` function
- [ ] `admin-approve-f0` function
- [ ] `admin-suspend-f0` function
- [ ] F0PartnersPage.tsx
- [ ] F0DetailPage.tsx

### Phase 3: Commission & Payment
- [ ] VIEW `api.admin_commission_by_month`
- [ ] VIEW `api.admin_payment_batches`
- [ ] `admin-list-commissions` function
- [ ] Fix `admin-process-payment-batch`
- [ ] `admin-list-payment-batches` function
- [ ] CommissionsPage.tsx
- [ ] PaymentPage.tsx

### Phase 4-6: TBD

---

*Plan created: 2025-12-02*
*Status: Planning Complete - Ready for New Project Init*
*Note: This is a SEPARATE PROJECT from F0 Portal, sharing same Supabase backend*
