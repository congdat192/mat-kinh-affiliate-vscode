# ERP AFFILIATE MODULE - ENHANCEMENT PLAN

## Ngày cập nhật: 2025-12-02
## Trạng thái: 📋 KẾ HOẠCH TRIỂN KHAI

---

## 1. TỔNG QUAN

### 1.1 Mục tiêu
Hoàn thiện và nâng cấp module Affiliate trong ERP-FE-fresh để:
1. Tích hợp Commission Lock System v16 vào UI
2. Bổ sung Batch Payment Flow cho Admin
3. Kết nối real data từ database (thay mock data còn lại)

### 1.2 Architecture (2 Projects, 1 Database)
```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Database   │  │   Auth      │  │    Edge Functions       │  │
│  │  (Shared)   │  │  (Shared)   │  │  (F0 Portal project)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ▲                 ▲                      ▲
         │                 │                      │
    ┌────┴────┐       ┌────┴────┐           ┌────┴────┐
    │   ERP   │       │   F0    │           │  Edge   │
    │ Module  │       │ Portal  │           │Functions│
    │(14 pages)│      │(Separate)│          │(F0 proj)│
    └─────────┘       └─────────┘           └─────────┘
    ERP-FE-fresh/   mat-kinh-affiliate/     mat-kinh-affiliate/supabase/
```

**Lưu ý:** Edge Functions cho Affiliate nằm trong project F0 Portal, không phải ERP.

---

## 2. HIỆN TRẠNG MODULE AFFILIATE TRONG ERP

### 2.1 Các Page Đã Có (14 Pages)

| # | Page | Route | Status | Ghi chú |
|---|------|-------|--------|---------|
| 1 | Dashboard | `/ERP/Affiliate` | ⚠️ Mock | Cần kết nối real data |
| 2 | F0 Approval | `/ERP/Affiliate/f0-approval` | ✅ Real | Đã kết nối api.f0_partners |
| 3 | F0 Tiers | `/ERP/Affiliate/f0-tiers` | ⚠️ Mock | Cần kết nối RPC |
| 4 | F0 Assignments | `/ERP/Affiliate/f0-assignments` | ⚠️ Mock | Gán campaign cho F0 |
| 5 | Customers (F1) | `/ERP/Affiliate/customers` | ⚠️ Mock | Cần query real F1 data |
| 6 | Vouchers | `/ERP/Affiliate/vouchers` | ⚠️ Mock | Voucher affiliate |
| 7 | Orders | `/ERP/Affiliate/orders` | ✅ Real | Kết nối voucher_affiliate_tracking |
| 8 | Campaigns | `/ERP/Affiliate/campaign-management` | ✅ Real | RPC functions working |
| 9 | Commission | `/ERP/Affiliate/commission-settings` | ⚠️ Mock | Cần kết nối RPC |
| 10 | Withdrawals | `/ERP/Affiliate/withdrawal-management` | ⚠️ Mock | **CẦN UPGRADE → BATCH PAYMENT** |
| 11 | Activity Log | `/ERP/Affiliate/activity-log` | ⚠️ Mock | Cần real log data |
| 12 | Admins | `/ERP/Affiliate/affiliate-admins` | ⚠️ Mock | Quản lý admin |
| 13 | Settings | `/ERP/Affiliate/affiliate-settings` | ⚠️ Mock | 4 tabs cấu hình |
| 14 | Reports | `/ERP/Affiliate/reports` | ⚠️ Mock | Báo cáo/Xuất file |

**Legend:**
- ✅ Real = Đã kết nối database thực
- ⚠️ Mock = Đang dùng mock data, cần update

### 2.2 Services & Components

```
src/modules/affiliate/
├── pages/                       # 14 admin pages
├── components/
│   ├── TierBadge.tsx           # Badge hiển thị tier
│   ├── AffiliateCampaignDialog.tsx
│   ├── AffiliateModuleSidebar.tsx
│   ├── F0PartnerDetailModal.tsx
│   ├── F0DetailModal.tsx
│   ├── RejectReasonModal.tsx
│   └── WithdrawalDetailModal.tsx
├── services/
│   ├── affiliateService.ts     # General service (⚠️ Real data nhưng cần update)
│   ├── affiliateCampaignService.ts  # Campaign CRUD (✅ Real)
│   └── f0PartnerService.ts     # F0 Partner CRUD (✅ Real)
├── types/
│   └── index.ts                # F0Partner, F0Tier, Commission types
└── index.tsx
```

### 2.4 affiliateService.ts Analysis (Verified)

**✅ Đã query real data:**
- `api.f0_partners` - F0 partner CRUD
- `api.voucher_affiliate_tracking` - Voucher tracking
- `api.referral_links` - Referral links

**⚠️ Cần update:**
- **Hardcoded 5% commission** (lines 159, 203, 526)
  - Should query từ `commission_records.total_commission` thay vì tính `invoice_amount * 0.05`
- **Không dùng Lock System fields**
  - Chưa query `commission_records` table (có qualified_at, lock_date, status)
  - Commission breakdown (pending/available/paid) chưa có
- **`getAllWithdrawalRequests()` returns empty** (line 542-545)
  - Table `withdrawal_requests` đã tồn tại nhưng chưa query
- **`getAllCommissions()` derives from voucher_tracking**
  - Should query từ `commission_records` table để có Lock System status

### 2.3 Database Schema Đầy Đủ (Verified 2025-12-02)

**Tables trong affiliate schema (17 tables):**

| Table | Rows | Description |
|-------|------|-------------|
| `f0_partners` | 1 | F0 Partner với bank info, tier_id, current_tier |
| `f0_tiers` | 4 | BRONZE, SILVER, GOLD, DIAMOND với JSONB (requirements, benefits, display) |
| `commission_settings` | 2 | Commission rules với JSONB (config, conditions) |
| `affiliate_campaign_settings` | 2 | Campaign for F0 (JOIN với KiotViet) |
| `voucher_affiliate_tracking` | 6 | Voucher tracking với Lock System fields |
| `commission_records` | 8 | **⭐ Commission với Lock System fields đầy đủ** |
| `payment_batches` | 0 | Batch payment tracking |
| `lock_payment_settings` | 1 | lock_period_days=15, payment_day=5 |
| `f1_customer_assignments` | 6 | F1 lifetime commission assignment |
| `commission_audit_log` | 0 | Audit log for commission changes |
| `f0_stats_adjustments` | 0 | Stats adjustments when invoices cancelled |
| `withdrawal_requests` | 0 | Withdrawal requests (manual) |
| `notifications` | 11 | Notifications for F0 |
| `referral_links` | 1 | Referral links with campaigns JSONB |
| `otp_verifications` | 3 | OTP for F0 registration |
| `password_resets` | 2 | Password reset tokens |
| `commission_history` | 0 | Legacy table (replaced by commission_records) |

**Key Fields trong commission_records (Lock System v16):**
```sql
-- Status fields
status: 'pending' | 'available' | 'processing' | 'paid' | 'cancelled'

-- Lock System fields
qualified_at TIMESTAMPTZ    -- When invoice fully paid
lock_date TIMESTAMPTZ       -- Expected lock date (qualified_at + 15 days)
locked_at TIMESTAMPTZ       -- Actual lock timestamp
commission_month VARCHAR    -- YYYY-MM format
payment_batch_id UUID       -- FK to payment_batches

-- Invoice cancellation fields
invoice_cancelled_at TIMESTAMPTZ
invoice_cancelled_after_paid BOOLEAN
stats_adjusted BOOLEAN
stats_adjusted_at TIMESTAMPTZ
```

**Views trong api schema (cho FE query - Verified):**

| View | Description | FE Usage |
|------|-------------|----------|
| `f0_partners` | F0 partner data (public view) | ✅ Đang dùng |
| `affiliate_f0_tiers` | Flattened JSONB tiers | Phase 2 |
| `affiliate_commission_settings` | Flattened JSONB commission | Phase 3 |
| `affiliate_campaign_settings` | JOIN với KiotViet campaigns | ✅ Đang dùng |
| `voucher_affiliate_tracking` | Voucher tracking | ✅ Đang dùng |
| `commission_records` | Commission với Lock System fields | **Phase 1, 4** |
| `payment_batches` | Batch payment history | **Phase 4** |
| `lock_payment_settings` | Lock config (15 days, day 5) | Phase 8 |
| `f1_customer_assignments` | F1 lifetime assignment | Phase 5 |
| `f1_customers_summary` | F1 summary with stats | Phase 5 |
| `f1_customer_orders` | F1 orders with commission | Phase 5, 6 |
| `commission_audit_log` | Commission event log | Phase 8 |
| `f0_stats_adjustments` | Stats adjustments | Phase 8 |

**RPC Functions (api schema):**
- Tiers: `insert_f0_tier`, `update_f0_tier`, `delete_f0_tier`
- Commission: `insert_commission_setting`, `update_commission_setting`, `delete_commission_setting`
- Campaigns: `insert_affiliate_campaign_settings`, `update_affiliate_campaign_settings`, `delete_affiliate_campaign_settings`

**Lưu ý:** Tất cả views trong api schema cần GRANT SELECT to `authenticated` role.

---

## 3. COMMISSION LOCK SYSTEM v16

### 3.1 Status Flow (Verified from commission_records table)
```
pending (chờ lock) → available (khả dụng/có thể rút) → processing (đang rút) → paid (đã thanh toán)
     ↓
 cancelled
(nếu invoice hủy trước khi lock)
```

**LƯU Ý:** Database dùng `available` thay vì `locked`. Khi commission qua 15 ngày:
- Status chuyển từ `pending` → `available`
- Field `locked_at` được set timestamp
- F0 có thể yêu cầu rút tiền (status → `processing`)
- Admin batch payment → status `paid`

### 3.2 Key Business Rules
- **Lock Period**: 15 ngày sau khi invoice fully paid (`qualified_at` + 15 days)
- **Tier Calculation**: Chỉ count `available` + `paid` (NOT pending)
- **Payment Day**: Ngày 5 mỗi tháng (cấu hình trong `lock_payment_settings`)
- **Cancellation Rules**:
  - `pending` có thể cancel nếu invoice cancelled
  - `available` hoặc đã `paid` → giữ commission (`invoice_cancelled_after_paid = true`)
- **Lifetime Commission**: F1 assigned vĩnh viễn cho F0 qua `f1_customer_assignments`

### 3.3 Edge Functions (Trong F0 Portal Project)

| Function | Description |
|----------|-------------|
| `webhook-affiliate-check-voucher-invoice` | Xử lý invoice webhook, tính commission |
| `cron-lock-commissions` | Daily job: pending → available (sau 15 ngày) |
| `admin-process-payment-batch` | Batch payment: available → paid |
| `get-f0-dashboard-stats` | F0 dashboard với lock system |
| `get-f0-my-customers` | F1 list với lock fields |
| `get-f1-customer-detail` | F1 detail với order lock status |

**Lưu ý:** Edge Functions nằm trong project F0 Portal (`mat-kinh-affiliate/supabase/functions/`), không phải ERP.

### 3.4 Key Fields in commission_records (Primary table)
| Column | Type | Description |
|--------|------|-------------|
| `status` | VARCHAR | pending / available / processing / paid / cancelled |
| `qualified_at` | TIMESTAMPTZ | When invoice fully paid (total = totalpayment) |
| `lock_date` | TIMESTAMPTZ | Expected lock date (qualified_at + 15 days) |
| `locked_at` | TIMESTAMPTZ | Actual timestamp when status → available |
| `commission_month` | VARCHAR | YYYY-MM format for batch payment grouping |
| `payment_batch_id` | UUID | FK to payment_batches when paid |
| `invoice_cancelled_at` | TIMESTAMPTZ | When linked invoice was cancelled |
| `invoice_cancelled_after_paid` | BOOLEAN | TRUE = commission kept (already paid) |

### 3.5 lock_payment_settings (Config table)
```sql
-- Current config (1 row)
lock_period_days: 15    -- Days from qualified_at to available
payment_day: 5          -- Day of month for batch payment (1-28)
is_active: true
```

---

## 4. KẾ HOẠCH NÂNG CẤP

### Phase 1: Dashboard Real Data
**Mục tiêu:** Kết nối Dashboard với dữ liệu thực từ database (bao gồm Lock System)

**Current State:**
- `affiliateService.getAffiliateStats()` đã query real data nhưng dùng hardcoded 5% commission
- Chưa query từ `commission_records` table (có Lock System fields)
- Chưa hiển thị commission breakdown by status

**Tasks:**
- [ ] Update `affiliateService.getAffiliateStats()`:
  - Query `commission_records` thay vì tính từ voucher_tracking
  - Sum `total_commission` thay vì `invoice_amount * 0.05`
  - Group by `status` để có breakdown: pending / available / paid
- [ ] Update `affiliateService.getChartData()`:
  - Query `commission_records` cho commission chart
  - Group by date, sum total_commission
- [ ] Update Dashboard UI:
  - Show commission breakdown cards (Pending, Available, Paid)
  - Days until next payment (ngày 5)
  - Add "Pending Lock" count (commissions within 15-day window)

**Files cần update:**
- `src/modules/affiliate/services/affiliateService.ts`
- `src/modules/affiliate/pages/AffiliateDashboard.tsx`
- `src/modules/affiliate/types/index.ts` (add Commission status types)

---

### Phase 2: F0 Tiers Management
**Mục tiêu:** Kết nối F0 Tiers với RPC functions

**Tasks:**
- [ ] Update `F0TiersPage.tsx` để query từ `api.affiliate_f0_tiers`
- [ ] Implement CRUD với RPC: `insert_f0_tier`, `update_f0_tier`, `delete_f0_tier`
- [ ] Form validation với JSONB structure (requirements, benefits, display)
- [ ] TierBadge component với badge_color, badge_icon

**Files cần update:**
- `src/modules/affiliate/pages/F0TiersPage.tsx`
- `src/modules/affiliate/services/` (new: `f0TierService.ts`)

---

### Phase 3: Commission Settings
**Mục tiêu:** Kết nối Commission Settings với RPC functions

**Tasks:**
- [ ] Update `CommissionSettingsPage.tsx` để query từ `api.affiliate_commission_settings`
- [ ] Implement CRUD với RPC: `insert_commission_setting`, `update_commission_setting`, `delete_commission_setting`
- [ ] Form với JSONB structure (config, conditions)
- [ ] Tier-based commission rules UI

**Files cần update:**
- `src/modules/affiliate/pages/CommissionSettingsPage.tsx`
- `src/modules/affiliate/services/` (new: `commissionSettingService.ts`)

---

### Phase 4: Batch Payment System ⭐ (QUAN TRỌNG)
**Mục tiêu:** Upgrade WithdrawalManagementPage thành Batch Payment Page

**Current State:**
- Hiện tại: `WithdrawalManagementPage.tsx` sử dụng mock data
- Table `withdrawal_requests` và `payment_batches` đã có nhưng chưa query
- `commission_records` table có Lock System fields đầy đủ

**Database Tables Đã Có:**
```sql
-- payment_batches (batch payment tracking)
id UUID
payment_month VARCHAR          -- '2025-01' format
payment_date DATE              -- Actual payment date
total_f0_count INTEGER         -- Number of F0s in batch
total_commission NUMERIC       -- Total amount
status VARCHAR                 -- 'draft' | 'completed'
created_by UUID, created_by_name VARCHAR
completed_by UUID, completed_by_name VARCHAR, completed_at TIMESTAMPTZ

-- commission_records (has payment_batch_id FK)
payment_batch_id UUID → FK to payment_batches
status: 'pending' | 'available' | 'processing' | 'paid' | 'cancelled'
```

**New Flow:**
```
1. Admin vào Batch Payment Page
2. System query commission_records WHERE status = 'available'
3. Group by F0, show: F0 name, total_commission, bank_info
4. Admin preview và chọn F0s to pay
5. Admin confirm → Call Edge Function `admin-process-payment-batch`
6. Edge Function:
   - Create payment_batches record
   - Update commission_records.status → 'paid'
   - Update commission_records.payment_batch_id
   - Update commission_records.paid_at, paid_by
7. Show success và Payment History
```

**Tasks:**
- [ ] Create `batchPaymentService.ts` với queries:
  - `getAvailableCommissionsByF0()` - Group commission_records by f0_id WHERE status='available'
  - `getPaymentBatches()` - Query payment_batches history
  - `processPaymentBatch()` - Call Edge Function
- [ ] Rename route `/withdrawal-management` → `/batch-payment`
- [ ] Update `WithdrawalManagementPage.tsx` → `BatchPaymentPage.tsx`:
  - Tab 1: Payment Preview (available commissions)
  - Tab 2: Payment History (completed batches)
- [ ] Tạo Payment Confirmation Dialog
- [ ] Export payment list to Excel

**UI Components cần tạo:**
- `PaymentPreviewTable.tsx` - Group by F0, show bank info từ `f0_partners`
- `PaymentConfirmDialog.tsx` - Xác nhận với total amount
- `PaymentHistoryTable.tsx` - Query `payment_batches`
- `PaymentDetailModal.tsx` - Show commission_records by batch_id

**Files cần update:**
- `src/modules/affiliate/pages/WithdrawalManagementPage.tsx` → `BatchPaymentPage.tsx`
- `src/modules/affiliate/services/` (new: `batchPaymentService.ts`)
- Route trong `App.tsx`
- Sidebar navigation label

---

### Phase 5: F1 Customers với Lock System
**Mục tiêu:** Hiển thị F1 customers với commission lock status

**Tasks:**
- [ ] Update `CustomersPage.tsx` để query từ `api.f1_customers_summary`
- [ ] Hiển thị commission breakdown per F1: pending / locked / paid / cancelled
- [ ] Days until lock countdown
- [ ] Detail view với order history

**Files cần update:**
- `src/modules/affiliate/pages/CustomersPage.tsx`
- `src/modules/affiliate/services/` (new: `f1CustomerService.ts`)

---

### Phase 6: Orders với Commission Status
**Mục tiêu:** Hiển thị orders với commission lock status

**Tasks:**
- [ ] Update `OrdersPage.tsx` để thêm commission_status column
- [ ] Filter by commission_status: pending / locked / paid / cancelled
- [ ] Hiển thị qualified_at, lock_date, days_until_lock
- [ ] Export với commission data

**Files cần update:**
- `src/modules/affiliate/pages/OrdersPage.tsx`

---

### Phase 7: Reports & Analytics
**Mục tiêu:** Reports với real data

**Tasks:**
- [ ] Commission Report: By period, by F0, by status
- [ ] Payment Report: By batch, by period
- [ ] F0 Performance Report: Revenue, F1 count, tier
- [ ] Export to Excel

**Files cần update:**
- `src/modules/affiliate/pages/ReportsPage.tsx`

---

### Phase 8: Activity Log & Settings
**Mục tiêu:** Real activity log và settings

**Tasks:**
- [ ] Activity Log từ database (nếu có table)
- [ ] Settings: Lock period config, Payment day config
- [ ] Notification templates

**Files cần update:**
- `src/modules/affiliate/pages/ActivityLogPage.tsx`
- `src/modules/affiliate/pages/AffiliateSettingsPage.tsx`

---

## 5. JSONB STRUCTURE (Reference)

### 5.1 F0 Tiers JSONB
```typescript
// affiliate.f0_tiers
{
  tier_code: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND',
  tier_name: string,
  tier_level: number, // 1=lowest

  // JSONB: requirements
  requirements: {
    min_referrals: number,   // Số F1 tối thiểu
    min_revenue: number,     // Doanh thu tối thiểu (VND)
    min_orders: number       // Số đơn tối thiểu
  },

  // JSONB: benefits
  benefits: {
    commission_bonus_percent: number,  // % bonus
    priority_support: boolean,
    exclusive_campaigns: boolean,
    custom_voucher_design: boolean,
    description: string | null
  },

  // JSONB: display
  display: {
    badge_color: string,     // '#CD7F32' (Bronze)
    badge_icon: string | null,
    gradient: string | null
  }
}
```

### 5.2 Commission Settings JSONB
```typescript
// affiliate.commission_settings
{
  name: string,
  description: string,
  is_active: boolean,
  is_default: boolean,
  priority: number,

  // JSONB: config
  config: {
    type: 'percentage' | 'fixed',
    value: number,           // % hoặc VND
    min_order_value: number, // Đơn tối thiểu
    max_commission: number   // Giới hạn tối đa
  },

  // JSONB: conditions
  conditions: {
    applies_to: 'all_tiers' | 'specific_tiers',
    tier_codes: string[],    // ['GOLD', 'DIAMOND']
    campaign_ids: number[],
    product_categories: string[],
    date_range: {
      start_date: string,
      end_date: string
    } | null
  }
}
```

### 5.3 Default Tier Values
| Tier | Level | Bonus | Min Referrals | Min Revenue |
|------|-------|-------|---------------|-------------|
| Bronze | 1 | 0% | 0 | 0 |
| Silver | 2 | 2% | 5 | 5,000,000 |
| Gold | 3 | 5% | 20 | 20,000,000 |
| Diamond | 4 | 10% | 50 | 50,000,000 |

---

## 6. ƯU TIÊN TRIỂN KHAI

### High Priority (Phase 4)
1. **Batch Payment System** - Core feature cho Admin
   - F0 Portal đã có Lock System, ERP cần có Batch Payment

### Medium Priority (Phase 1, 5, 6)
2. **Dashboard Real Data** - Tổng quan chính xác
3. **F1 Customers với Lock Status** - Theo dõi commission
4. **Orders với Commission Status** - Tracking

### Lower Priority (Phase 2, 3, 7, 8)
5. **F0 Tiers Management** - Config tier
6. **Commission Settings** - Config commission rules
7. **Reports** - Báo cáo chi tiết
8. **Activity Log & Settings** - Logging và config

---

## 7. TECHNICAL NOTES

### Service Pattern
```typescript
// Prefer direct Supabase queries
const { data } = await supabase
  .schema('api')
  .from('f1_customers_summary')
  .select('*')
  .eq('f0_id', f0Id);

// Use RPC for complex operations
const { data } = await supabase
  .schema('api')
  .rpc('insert_f0_tier', {
    p_tier_code: 'GOLD',
    p_tier_name: 'Gold',
    p_requirements: { min_referrals: 20, min_revenue: 20000000, min_orders: 10 },
    p_benefits: { commission_bonus_percent: 5, priority_support: true },
    p_display: { badge_color: '#FFD700' }
  });
```

### Edge Function Integration
```typescript
// Call admin-process-payment-batch
const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-process-payment-batch`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    payment_date: '2025-01-05',
    f0_ids: ['uuid1', 'uuid2'] // Optional: specific F0s, or all if empty
  })
});
```

---

## 8. FILES REFERENCE

### ERP Affiliate Module
```
src/modules/affiliate/
├── pages/
│   ├── AffiliateDashboard.tsx      # Phase 1
│   ├── F0ApprovalPage.tsx          # ✅ Done
│   ├── F0TiersPage.tsx             # Phase 2
│   ├── F0AssignmentsPage.tsx       # Phase 2
│   ├── CustomersPage.tsx           # Phase 5
│   ├── VouchersPage.tsx            # Phase 5
│   ├── OrdersPage.tsx              # Phase 6
│   ├── CampaignManagementPage.tsx  # ✅ Done
│   ├── CommissionSettingsPage.tsx  # Phase 3
│   ├── WithdrawalManagementPage.tsx → BatchPaymentPage.tsx # Phase 4 ⭐
│   ├── ActivityLogPage.tsx         # Phase 8
│   ├── AffiliateAdminsPage.tsx     # Phase 8
│   ├── AffiliateSettingsPage.tsx   # Phase 8
│   └── ReportsPage.tsx             # Phase 7
├── services/
│   ├── affiliateService.ts         # General (update Phase 1)
│   ├── affiliateCampaignService.ts # ✅ Done
│   ├── f0PartnerService.ts         # ✅ Done
│   ├── f0TierService.ts            # New (Phase 2)
│   ├── commissionSettingService.ts # New (Phase 3)
│   ├── batchPaymentService.ts      # New (Phase 4) ⭐
│   └── f1CustomerService.ts        # New (Phase 5)
└── types/
    └── index.ts                    # Update với Lock System types
```

### F0 Portal Reference (CONTEXT-AFF.md)
- Edge Functions source: `mat-kinh-affiliate-vscode/supabase/functions/`
- VIEWs structure: `api.f1_customers_summary`, `api.f1_customer_orders`
- Lock System implementation in F0 Portal

---

---

## 9. SUMMARY

### ✅ Đã Có (Ready to use)
1. **Database schema** đầy đủ với 17 tables trong affiliate schema
2. **Lock System fields** trong `commission_records` table
3. **Views trong api schema** cho FE query (13 views verified)
4. **RPC functions** cho CRUD operations
5. **Edge Functions** trong F0 Portal project (không cần tạo mới)
6. **affiliateService.ts** đã query real data (cần update commission logic)

### ⚠️ Cần Update
1. **affiliateService.ts**:
   - Thay hardcoded 5% bằng query `commission_records.total_commission`
   - Query Lock System fields (status, qualified_at, lock_date)
   - Implement `getAllWithdrawalRequests()` từ `withdrawal_requests` table
2. **Dashboard**: Show commission breakdown by status
3. **WithdrawalManagementPage** → **BatchPaymentPage**: Query từ `commission_records` và `payment_batches`

### 🎯 Implementation Priority
1. **Phase 4: Batch Payment** - Core feature để Admin pay F0
2. **Phase 1: Dashboard** - Fix commission calculations
3. **Phase 5: F1 Customers** - Show Lock System status
4. **Phase 2-3: Tiers & Commission Settings** - Config CRUD
5. **Phase 6-8: Orders, Reports, Settings** - Enhancement

---

*Plan created: 2025-12-02*
*Last verified: 2025-12-02*
*Status: READY FOR IMPLEMENTATION*
*Database: ✅ Verified against live Supabase*
*Priority: Phase 4 (Batch Payment) → Phase 1 (Dashboard) → Phase 5 (F1 Customers)*
