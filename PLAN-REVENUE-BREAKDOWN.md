# PLAN: Revenue/Orders Breakdown by Status

> **Mục đích**: Fix data inconsistency - F0-0004 shows Doanh thu=0 but Hoa hồng=290K vì VIEW chỉ count revenue khi status='locked'/'paid', không count 'pending'

---

## 1. Vấn Đề Hiện Tại (ROOT CAUSE)

### 1.1. VIEW `api.f1_customers_summary` - Logic Hiện Tại

```sql
-- HIỆN TẠI: total_revenue chỉ count locked + paid
sum(invoice_amount) FILTER (WHERE status IN ('locked', 'paid')) AS total_revenue

-- HIỆN TẠI: total_commission count pending + locked + paid
sum(total_commission) FILTER (WHERE status IN ('pending', 'locked', 'paid')) AS total_commission

-- HIỆN TẠI: total_orders chỉ count locked + paid
count(*) FILTER (WHERE status IN ('locked', 'paid')) AS total_orders
```

**Kết quả**: Với F0-0004 có 1 đơn pending (HD270103, 2M):
- `total_revenue` = 0 (vì pending không được count)
- `total_commission` = 290K (vì pending được count)
- `total_orders` = 0 (vì pending không được count)

### 1.2. Yêu Cầu User: Option B - Full Breakdown

User muốn hiển thị:
1. **Revenue breakdown**: pending_revenue, locked_revenue, paid_revenue, total_revenue (= sum of all)
2. **Commission breakdown**: pending_commission, locked_commission, paid_commission (đã có)
3. **Orders breakdown**: pending_orders, locked_orders, paid_orders, total_orders (= sum of all)

---

## 2. Phân Tích Component Liên Quan

### 2.1. Database (Supabase)

| Component | Schema | Type | Cần Thay Đổi |
|-----------|--------|------|--------------|
| `f1_customers_summary` | api | VIEW | **YES** - Thêm breakdown columns |
| `f1_customer_orders` | api | VIEW | NO - Đã có status_label |
| `commission_records` | affiliate | TABLE | NO - Source data OK |
| `f1_customer_assignments` | affiliate | TABLE | NO |

### 2.2. Edge Functions (F0 Portal)

| Function | File | Cần Thay Đổi |
|----------|------|--------------|
| `get-f0-my-customers` | `supabase/functions/get-f0-my-customers/index.ts` | **YES** - Map new columns |
| `get-f1-customer-detail` | `supabase/functions/get-f1-customer-detail/index.ts` | **YES** - Map new columns |
| `get-f0-dashboard-stats` | `supabase/functions/get-f0-dashboard-stats/index.ts` | **MAYBE** - Check if needs update |

### 2.3. TypeScript Types (F0 Portal)

| File | Cần Thay Đổi |
|------|--------------|
| `src/types/f1Customer.ts` | **YES** - Add new fields to interfaces |
| `src/types/index.ts` | NO |

### 2.4. UI Pages (F0 Portal)

| Page | File | Cần Thay Đổi |
|------|------|--------------|
| MyCustomersPage | `src/pages/f0/MyCustomersPage.tsx` | **YES** - Display breakdown |
| DashboardPage | `src/pages/f0/DashboardPage.tsx` | **MAYBE** - Check EXP bars |
| ReferralHistoryPage | `src/pages/f0/ReferralHistoryPage.tsx` | NO - Uses different data |

### 2.5. ERP Admin (KHÔNG cần thay đổi)

ERP Admin module (`src/modules/affiliate/`) dùng các VIEW/page riêng:
- `BatchPaymentPage.tsx` - Dùng commission_records trực tiếp
- `CustomersPage.tsx` - Dùng f1_customer_assignments trực tiếp
- Không bị ảnh hưởng bởi thay đổi này

---

## 3. Implementation Plan Chi Tiết

### Phase 1: Database - Update VIEW

**File**: Migration SQL (run in Supabase Dashboard)

```sql
-- Drop and recreate VIEW với breakdown columns
DROP VIEW IF EXISTS api.f1_customers_summary;

CREATE OR REPLACE VIEW api.f1_customers_summary AS
SELECT
    a.id AS assignment_id,
    a.f1_phone,
    a.f1_customer_id,
    COALESCE((
        SELECT c.f1_name
        FROM affiliate.commission_records c
        WHERE c.f1_phone = a.f1_phone AND c.f0_id = a.f0_id
        ORDER BY c.created_at DESC
        LIMIT 1
    ), a.f1_name) AS f1_name,
    a.f0_id,
    a.f0_code,
    a.first_voucher_code,
    a.first_invoice_code,
    a.first_invoice_date,
    a.is_active,
    a.created_at AS assigned_at,

    -- ============================================
    -- ORDERS BREAKDOWN (NEW)
    -- ============================================
    COALESCE(stats.pending_orders, 0)::integer AS pending_orders,
    COALESCE(stats.locked_orders, 0)::integer AS locked_orders,
    COALESCE(stats.paid_orders, 0)::integer AS paid_orders,
    -- Total orders = pending + locked + paid (not cancelled)
    COALESCE(stats.pending_orders + stats.locked_orders + stats.paid_orders, 0)::integer AS total_orders,

    -- ============================================
    -- REVENUE BREAKDOWN (NEW)
    -- ============================================
    COALESCE(stats.pending_revenue, 0) AS pending_revenue,
    COALESCE(stats.locked_revenue, 0) AS locked_revenue,
    COALESCE(stats.paid_revenue, 0) AS paid_revenue,
    -- Total revenue = pending + locked + paid (not cancelled)
    COALESCE(stats.pending_revenue + stats.locked_revenue + stats.paid_revenue, 0) AS total_revenue,

    -- ============================================
    -- COMMISSION BREAKDOWN (EXISTING - keep same)
    -- ============================================
    COALESCE(stats.total_commission, 0) AS total_commission,
    COALESCE(stats.paid_commission, 0) AS paid_commission,
    COALESCE(stats.pending_commission, 0) AS pending_commission,
    COALESCE(stats.locked_commission, 0) AS locked_commission,
    COALESCE(stats.cancelled_commission, 0) AS cancelled_commission,

    -- ============================================
    -- OTHER FIELDS (EXISTING - keep same)
    -- ============================================
    stats.last_order_date,
    stats.last_order_code,
    -- has_valid_order = has at least 1 order (pending/locked/paid)
    COALESCE(stats.pending_orders + stats.locked_orders + stats.paid_orders, 0) > 0 AS has_valid_order

FROM affiliate.f1_customer_assignments a
LEFT JOIN LATERAL (
    SELECT
        -- Orders breakdown
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
        COUNT(*) FILTER (WHERE status = 'locked') AS locked_orders,
        COUNT(*) FILTER (WHERE status = 'paid') AS paid_orders,

        -- Revenue breakdown
        SUM(invoice_amount) FILTER (WHERE status = 'pending') AS pending_revenue,
        SUM(invoice_amount) FILTER (WHERE status = 'locked') AS locked_revenue,
        SUM(invoice_amount) FILTER (WHERE status = 'paid') AS paid_revenue,

        -- Commission breakdown (existing)
        SUM(total_commission) FILTER (WHERE status IN ('pending', 'locked', 'paid')) AS total_commission,
        SUM(total_commission) FILTER (WHERE status = 'paid') AS paid_commission,
        SUM(total_commission) FILTER (WHERE status = 'pending') AS pending_commission,
        SUM(total_commission) FILTER (WHERE status = 'locked') AS locked_commission,
        SUM(total_commission) FILTER (WHERE status = 'cancelled') AS cancelled_commission,

        -- Last order (from locked or paid only - confirmed orders)
        MAX(invoice_date) FILTER (WHERE status IN ('locked', 'paid')) AS last_order_date,
        (
            SELECT cr.invoice_code
            FROM affiliate.commission_records cr
            WHERE cr.f1_phone = a.f1_phone
              AND cr.f0_id = a.f0_id
              AND cr.status IN ('locked', 'paid')
            ORDER BY cr.invoice_date DESC
            LIMIT 1
        ) AS last_order_code

    FROM affiliate.commission_records
    WHERE f1_phone = a.f1_phone AND f0_id = a.f0_id
) stats ON true;

-- Grant permissions
GRANT SELECT ON api.f1_customers_summary TO authenticated;
GRANT SELECT ON api.f1_customers_summary TO anon;
```

**Verification Query** (sau khi run):
```sql
-- Test với F0-0004
SELECT
    f1_phone, f1_name,
    pending_orders, locked_orders, paid_orders, total_orders,
    pending_revenue, locked_revenue, paid_revenue, total_revenue,
    pending_commission, locked_commission, paid_commission, total_commission,
    has_valid_order
FROM api.f1_customers_summary
WHERE f0_code = 'F0-0004';
```

**Expected Result cho F0-0004**:
- `pending_orders` = 1, `locked_orders` = 0, `paid_orders` = 0, `total_orders` = 1
- `pending_revenue` = 2,000,000, `locked_revenue` = 0, `paid_revenue` = 0, `total_revenue` = 2,000,000
- `pending_commission` = 290,000, `total_commission` = 290,000
- `has_valid_order` = true

---

### Phase 2: Edge Functions - Update Response Mapping

#### 2.1. `get-f0-my-customers/index.ts`

**Changes**:
1. Add new fields to `formattedCustomers` mapping (lines 90-108)
2. Update summary calculation (lines 76-87)

```typescript
// Line 90-108: Add new breakdown fields
const formattedCustomers = (customers || []).map(c => ({
  // ... existing fields ...

  // Orders breakdown (NEW)
  pending_orders: c.pending_orders || 0,
  locked_orders: c.locked_orders || 0,
  paid_orders: c.paid_orders || 0,
  total_orders: c.total_orders || 0,

  // Revenue breakdown (NEW)
  pending_revenue: Number(c.pending_revenue || 0),
  locked_revenue: Number(c.locked_revenue || 0),
  paid_revenue: Number(c.paid_revenue || 0),
  total_revenue: Number(c.total_revenue || 0),

  // Commission breakdown (existing)
  total_commission: Number(c.total_commission || 0),
  paid_commission: Number(c.paid_commission || 0),
  pending_commission: Number(c.pending_commission || 0),
  locked_commission: Number(c.locked_commission || 0),
  cancelled_commission: Number(c.cancelled_commission || 0),

  // ... rest of existing fields ...
}));

// Line 70-87: Update summary to include all revenue (not just locked+paid)
let summary = {
  total_f1: count || 0,
  total_orders: 0,
  total_revenue: 0,        // Now includes pending
  total_commission: 0,
  // NEW: Breakdown summaries
  pending_revenue: 0,
  locked_revenue: 0,
  paid_revenue: 0,
  pending_orders: 0,
  locked_orders: 0,
  paid_orders: 0
};

if (!summaryError && summaryData) {
  summary.total_orders = summaryData.reduce((sum, c) => sum + (c.total_orders || 0), 0);
  summary.total_revenue = summaryData.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0);
  summary.total_commission = summaryData.reduce((sum, c) => sum + Number(c.total_commission || 0), 0);
  // NEW
  summary.pending_revenue = summaryData.reduce((sum, c) => sum + Number(c.pending_revenue || 0), 0);
  summary.locked_revenue = summaryData.reduce((sum, c) => sum + Number(c.locked_revenue || 0), 0);
  summary.paid_revenue = summaryData.reduce((sum, c) => sum + Number(c.paid_revenue || 0), 0);
  summary.pending_orders = summaryData.reduce((sum, c) => sum + (c.pending_orders || 0), 0);
  summary.locked_orders = summaryData.reduce((sum, c) => sum + (c.locked_orders || 0), 0);
  summary.paid_orders = summaryData.reduce((sum, c) => sum + (c.paid_orders || 0), 0);
}
```

#### 2.2. `get-f1-customer-detail/index.ts`

**Changes**: Add new fields to `formattedCustomer` mapping (lines 69-90)

```typescript
// Line 69-90: Add breakdown fields
const formattedCustomer = {
  // ... existing fields ...

  // Orders breakdown (NEW)
  pending_orders: customer.pending_orders || 0,
  locked_orders: customer.locked_orders || 0,
  paid_orders: customer.paid_orders || 0,
  total_orders: customer.total_orders || 0,

  // Revenue breakdown (NEW)
  pending_revenue: Number(customer.pending_revenue || 0),
  locked_revenue: Number(customer.locked_revenue || 0),
  paid_revenue: Number(customer.paid_revenue || 0),
  total_revenue: Number(customer.total_revenue || 0),

  // Commission breakdown (existing)
  // ...
};
```

---

### Phase 3: TypeScript Types - Update Interfaces

**File**: `src/types/f1Customer.ts`

```typescript
export interface F1CustomerSummary {
  assignment_id: string;
  f1_phone: string;
  f1_name: string;
  f1_customer_id: string;
  assigned_at: string;
  first_voucher_code: string;

  // Orders breakdown (NEW)
  pending_orders: number;
  locked_orders: number;
  paid_orders: number;
  total_orders: number;

  // Revenue breakdown (NEW)
  pending_revenue: number;
  locked_revenue: number;
  paid_revenue: number;
  total_revenue: number;

  // Commission breakdown (existing)
  total_commission: number;
  paid_commission: number;
  pending_commission: number;
  locked_commission: number;
  cancelled_commission: number;

  last_order_date: string | null;
  last_order_code: string | null;
  has_valid_order: boolean;
}

export interface F1CustomerListResponse {
  success: boolean;
  data?: {
    summary: {
      total_f1: number;
      total_orders: number;
      total_revenue: number;
      total_commission: number;
      // NEW: Breakdown summaries
      pending_revenue: number;
      locked_revenue: number;
      paid_revenue: number;
      pending_orders: number;
      locked_orders: number;
      paid_orders: number;
    };
    customers: F1CustomerSummary[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
  error?: string;
}
```

---

### Phase 4: UI - Update MyCustomersPage

**File**: `src/pages/f0/MyCustomersPage.tsx`

#### 4.1. Update Summary Bar (lines 528-551)

```tsx
{/* Compact Summary Bar - Updated với breakdown */}
<div className="bg-white rounded-lg border p-4">
  <div className="flex flex-wrap items-center gap-6 text-sm">
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-blue-500" />
      <span className="text-gray-500">Tổng F1:</span>
      <span className="font-semibold">{summaryStats.totalF1}</span>
    </div>

    {/* Orders breakdown */}
    <div className="flex items-center gap-2">
      <ShoppingBag className="w-4 h-4 text-green-500" />
      <span className="text-gray-500">Đơn hàng:</span>
      <span className="font-semibold">{summaryStats.totalOrders}</span>
      <span className="text-xs text-gray-400">
        ({summaryStats.pendingOrders} chờ / {summaryStats.lockedOrders} đã xác thực / {summaryStats.paidOrders} đã TT)
      </span>
    </div>

    {/* Revenue breakdown */}
    <div className="flex items-center gap-2">
      <TrendingUp className="w-4 h-4 text-purple-500" />
      <span className="text-gray-500">Doanh thu:</span>
      <span className="font-semibold text-purple-600">{formatCurrency(summaryStats.totalRevenue)}đ</span>
      <Tooltip content={`Chờ: ${formatCurrency(summaryStats.pendingRevenue)}đ | Đã xác thực: ${formatCurrency(summaryStats.lockedRevenue)}đ | Đã TT: ${formatCurrency(summaryStats.paidRevenue)}đ`}>
        <Info className="w-3 h-3 text-gray-400" />
      </Tooltip>
    </div>

    {/* Commission */}
    <div className="flex items-center gap-2">
      <DollarSign className="w-4 h-4 text-yellow-500" />
      <span className="text-gray-500">Hoa hồng:</span>
      <span className="font-semibold text-yellow-600">{formatCurrency(summaryStats.totalCommission)}đ</span>
    </div>
  </div>
</div>
```

#### 4.2. Update Customer Row Revenue Display (line 227-231)

```tsx
{/* Revenue với breakdown tooltip */}
<div className="hidden md:block md:col-span-2 text-right">
  <span className="font-semibold text-gray-900">
    {formatCurrencyFull(customer.total_revenue)}
  </span>
  {customer.pending_revenue > 0 && (
    <p className="text-xs text-orange-500">
      ({formatCurrency(customer.pending_revenue)} chờ xác thực)
    </p>
  )}
</div>
```

#### 4.3. Update Expanded Detail Section (lines 284-314)

```tsx
{/* Revenue Breakdown (NEW) - Above Commission Breakdown */}
<div className="grid grid-cols-4 gap-3 text-sm mb-4">
  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
    <p className="text-orange-600 text-xs flex items-center gap-1">
      <Clock className="w-3 h-3" />
      DT Chờ xác thực
    </p>
    <p className="font-semibold text-orange-600">{formatCurrencyFull(customer.pending_revenue || 0)}</p>
    <p className="text-xs text-orange-400">{customer.pending_orders || 0} đơn</p>
  </div>
  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
    <p className="text-blue-600 text-xs flex items-center gap-1">
      <Lock className="w-3 h-3" />
      DT Đã xác thực
    </p>
    <p className="font-semibold text-blue-600">{formatCurrencyFull(customer.locked_revenue || 0)}</p>
    <p className="text-xs text-blue-400">{customer.locked_orders || 0} đơn</p>
  </div>
  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
    <p className="text-green-600 text-xs flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      DT Đã thanh toán
    </p>
    <p className="font-semibold text-green-600">{formatCurrencyFull(customer.paid_revenue || 0)}</p>
    <p className="text-xs text-green-400">{customer.paid_orders || 0} đơn</p>
  </div>
  <div className="bg-gray-50 p-3 rounded-lg border">
    <p className="text-gray-500 text-xs flex items-center gap-1">
      <TrendingUp className="w-3 h-3" />
      Tổng doanh thu
    </p>
    <p className="font-semibold text-gray-900">{formatCurrencyFull(customer.total_revenue || 0)}</p>
    <p className="text-xs text-gray-400">{customer.total_orders || 0} đơn</p>
  </div>
</div>

{/* Commission Breakdown (EXISTING - keep same) */}
<div className="grid grid-cols-4 gap-3 text-sm">
  {/* ... existing commission breakdown ... */}
</div>
```

---

## 4. Deployment Order

1. **Phase 1: Database** - Run SQL migration in Supabase Dashboard
2. **Phase 2: Edge Functions** - Deploy updated functions
   ```bash
   npx supabase functions deploy get-f0-my-customers
   npx supabase functions deploy get-f1-customer-detail
   ```
3. **Phase 3: TypeScript Types** - Update types (FE will auto-rebuild)
4. **Phase 4: UI** - Update MyCustomersPage

---

## 5. Testing Checklist

- [ ] **Database**: Query `f1_customers_summary` for F0-0004, verify:
  - `pending_revenue` = 2,000,000
  - `total_revenue` = 2,000,000
  - `pending_orders` = 1
  - `total_orders` = 1
  - `has_valid_order` = true

- [ ] **Edge Functions**: Call `get-f0-my-customers` for F0-0004, verify response contains new fields

- [ ] **UI MyCustomersPage**:
  - Summary bar shows breakdown tooltip
  - Customer row shows total revenue (not 0)
  - Expanded detail shows revenue breakdown boxes
  - Expanded detail shows commission breakdown boxes

- [ ] **Regression**: Existing commission breakdown still works correctly

---

## 6. Rollback Plan

Nếu có lỗi, rollback về VIEW cũ:

```sql
-- Rollback to original VIEW
DROP VIEW IF EXISTS api.f1_customers_summary;

-- Recreate original VIEW (copy from database backup)
CREATE VIEW api.f1_customers_summary AS ...
```

---

## 7. Summary

| Component | Changes | Priority |
|-----------|---------|----------|
| `api.f1_customers_summary` VIEW | Add pending/locked/paid breakdown for revenue & orders | HIGH |
| `get-f0-my-customers` Edge Function | Map new columns | HIGH |
| `get-f1-customer-detail` Edge Function | Map new columns | HIGH |
| `F1CustomerSummary` TypeScript type | Add new fields | HIGH |
| `MyCustomersPage.tsx` UI | Display breakdown | HIGH |
| `DashboardPage.tsx` UI | No changes needed | - |
| ERP Admin module | No changes needed | - |

---

**Last Updated**: 2025-12-03
**Author**: AI Assistant
