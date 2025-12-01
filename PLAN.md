# PERFORMANCE OPTIMIZATION PLAN

## Ngày: 2025-12-01
## Mục tiêu: Tối ưu tốc độ load trang F0 Portal

---

## 1. PHÂN TÍCH HIỆN TRẠNG

### 1.1 Các Edge Functions đang gọi từ Frontend

| Page | Edge Function | Số lần gọi | Mục đích |
|------|---------------|------------|----------|
| DashboardPage | `get-f0-dashboard-stats` | 1 | Stats tổng hợp, tier, recent activity |
| ProfilePage | `get-f0-dashboard-stats` | 1 | Tier info cho profile |
| ProfilePage | `send-otp-bank-verification` | 1 | Gửi OTP xác thực bank |
| ProfilePage | `verify-otp-bank` | 1 | Verify OTP bank |
| ReferralHistoryPage | `get-f0-referral-history` | 1 | Lịch sử referral + lifetime commissions |
| MyCustomersPage | `get-f0-my-customers` | 1 | Danh sách F1 |
| MyCustomersPage | `get-f1-customer-detail` | N | Chi tiết + orders của từng F1 (lazy load) |
| NotificationsPage | `manage-notifications` | 4 | GET, mark read, mark all read, delete |
| WithdrawalPage | `manage-withdrawal-request` | 3 | GET, create, cancel |

### 1.2 VIEWs có sẵn trong schema `api`

| VIEW | Mô tả | Có thể dùng direct query |
|------|-------|--------------------------|
| `f1_customers_summary` | Danh sách F1 với stats aggregated | ✅ CÓ |
| `f1_customer_orders` | Lịch sử orders của F1 | ✅ CÓ |
| `voucher_affiliate_tracking` | Tracking vouchers | ✅ CÓ |
| `commission_records` | Commission records | ✅ CÓ |
| `notifications` | Notifications | ✅ CÓ (chỉ GET) |
| `withdrawal_requests` | Withdrawal requests | ✅ CÓ (chỉ GET) |
| `f0_partners` | F0 info | ✅ CÓ |
| `f0_tiers` | Tier config | ✅ CÓ |

---

## 2. PHÂN LOẠI OPTIMIZATION

### 2.1 CÓ THỂ thay bằng Direct Query (Supabase Client)

| Function | Lý do có thể thay | Ước tính cải thiện |
|----------|-------------------|-------------------|
| `get-f0-my-customers` | Chỉ query VIEW `f1_customers_summary` + aggregate summary | **300-800ms** |
| `get-f1-customer-detail` | Chỉ query VIEW `f1_customer_orders` | **200-500ms** |
| `manage-notifications` (GET only) | Chỉ SELECT từ `notifications` | **200-400ms** |

### 2.2 KHÔNG NÊN thay (Business logic phức tạp)

| Function | Lý do giữ Edge Function |
|----------|------------------------|
| `get-f0-dashboard-stats` | **Quá phức tạp**: Query 7 tables parallel, tính toán tier với adjustments, update F0 tier nếu thay đổi, format complex response |
| `get-f0-referral-history` | **Phức tạp**: Join 4 queries (vouchers, summary, lifetimeCommissions, f1Assignments), filter phức tạp, format nested response |
| `manage-notifications` (POST/PUT/DELETE) | **Business logic**: Mark read, mark all read, delete - cần service_role |
| `manage-withdrawal-request` | **Business logic**: Create request, validate balance, update status |
| `send-otp-bank-verification` | **External API**: Gọi Vihat SMS API |
| `verify-otp-bank` | **Security**: OTP verification + update sensitive bank info |

---

## 3. KẾ HOẠCH TRIỂN KHAI

### Phase 1: Quick Wins - Direct Query (Ưu tiên CAO)

#### 3.1 MyCustomersPage - Thay `get-f0-my-customers`

**File:** `src/services/f1CustomerService.ts`

**Before:**
```typescript
// Edge Function call - cold start 500-2000ms
const response = await fetch(`${SUPABASE_URL}/functions/v1/get-f0-my-customers`, {...});
```

**After:**
```typescript
import { supabase } from '@/lib/supabase';

async getMyCustomers(f0_id: string, options: {...}): Promise<F1CustomerListResponse> {
  // 1. Query customers with pagination
  let query = supabase
    .from('f1_customers_summary')
    .select('*', { count: 'exact' })
    .eq('f0_id', f0_id)
    .eq('is_active', true);

  if (options.search_phone?.trim()) {
    query = query.ilike('f1_phone', `%${options.search_phone.trim()}%`);
  }

  const offset = ((options.page || 1) - 1) * (options.limit || 20);
  query = query
    .order('assigned_at', { ascending: false })
    .range(offset, offset + (options.limit || 20) - 1);

  const { data: customers, error, count } = await query;

  // 2. Calculate summary (separate query for all customers)
  const { data: summaryData } = await supabase
    .from('f1_customers_summary')
    .select('total_orders, total_revenue, total_commission')
    .eq('f0_id', f0_id)
    .eq('is_active', true);

  const summary = {
    total_f1: count || 0,
    total_orders: summaryData?.reduce((sum, c) => sum + (c.total_orders || 0), 0) || 0,
    total_revenue: summaryData?.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0) || 0,
    total_commission: summaryData?.reduce((sum, c) => sum + Number(c.total_commission || 0), 0) || 0
  };

  return {
    success: true,
    data: {
      summary,
      customers: formatCustomers(customers),
      pagination: { page, limit, total: count, total_pages: Math.ceil(count / limit) }
    }
  };
}
```

---

#### 3.2 MyCustomersPage - Thay `get-f1-customer-detail`

**File:** `src/services/f1CustomerService.ts`

**After:**
```typescript
async getCustomerDetail(f0_id: string, f1_phone: string): Promise<F1CustomerDetailResponse> {
  // Query orders directly from VIEW
  const { data: orders, error } = await supabase
    .from('f1_customer_orders')
    .select('*')
    .eq('f0_id', f0_id)
    .eq('f1_phone', f1_phone)
    .order('invoice_date', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      orders: formatOrders(orders || [])
    }
  };
}
```

---

#### 3.3 NotificationsPage - Thay GET `manage-notifications`

**File:** `src/pages/f0/NotificationsPage.tsx`

**After:**
```typescript
const fetchNotifications = useCallback(async (showRefreshing = false) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('f0_id', f0User.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!error) {
    let filtered = data || [];
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    }
    setNotifications(filtered);
  }
}, [filter]);
```

**Note:** Giữ Edge Function cho mark_read, mark_all_read, delete vì cần service_role permission.

---

### Phase 2: Frontend Optimizations

#### 3.4 React.memo cho Customer Rows

**File:** `src/pages/f0/MyCustomersPage.tsx`

```typescript
const CustomerRow = React.memo(({ customer, expanded, onToggle, orders, loadingOrders }) => {
  // ... render logic
}, (prevProps, nextProps) => {
  return prevProps.customer.f1_phone === nextProps.customer.f1_phone
    && prevProps.expanded === nextProps.expanded
    && prevProps.orders === nextProps.orders;
});
```

#### 3.5 useMemo cho expensive calculations

```typescript
const summaryStats = useMemo(() => ({
  totalF1: summary.total_f1,
  totalRevenue: formatCurrency(summary.total_revenue),
  totalCommission: formatCurrency(summary.total_commission)
}), [summary]);
```

#### 3.6 Cache với React Query (Optional - Thêm dependency)

```typescript
// Nếu muốn cache giữa các lần navigate
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['f1-customers', f0_id, page, searchPhone],
  queryFn: () => f1CustomerService.getMyCustomers(f0_id, { page, search_phone: searchPhone }),
  staleTime: 30000, // Cache 30 giây
});
```

---

## 4. KẾT QUẢ DỰ KIẾN

| Metric | Before | After Phase 1 | After Phase 2 |
|--------|--------|---------------|---------------|
| MyCustomersPage load | 1-3s | 200-500ms | 150-400ms |
| Customer detail expand | 500-1500ms | 100-300ms | 100-300ms |
| NotificationsPage load | 500-1500ms | 100-300ms | 100-300ms |
| Cold start overhead | 500-2000ms | 0ms | 0ms |

---

## 5. CHECKLIST TRIỂN KHAI

### Phase 1 (Ưu tiên cao)
- [ ] **3.1** Update `f1CustomerService.getMyCustomers()` → Direct query
- [ ] **3.2** Update `f1CustomerService.getCustomerDetail()` → Direct query
- [ ] **3.3** Update `NotificationsPage.fetchNotifications()` → Direct query (GET only)
- [ ] Test tất cả các trang sau khi thay đổi
- [ ] Verify RLS permissions cho `anon` role

### Phase 2 (Ưu tiên trung bình)
- [ ] **3.4** Add React.memo cho CustomerRow
- [ ] **3.5** Add useMemo cho summary calculations
- [ ] **3.6** (Optional) Integrate React Query for caching

### Verification
- [ ] Test MyCustomersPage: Load, search, pagination, expand
- [ ] Test NotificationsPage: Load, mark read, delete
- [ ] Measure load time trước/sau với Chrome DevTools
- [ ] Check console không có errors

---

## 6. RỦI RO VÀ MITIGATION

| Rủi ro | Xác suất | Mitigation |
|--------|----------|------------|
| RLS block direct query | Trung bình | Verify GRANT SELECT permissions trước |
| Missing data formatting | Thấp | Copy exact format từ Edge Function |
| Breaking existing logic | Thấp | Test kỹ từng page |

---

## 7. GHI CHÚ QUAN TRỌNG

1. **Supabase Client đã config schema `api`** trong `src/lib/supabase.ts`:
   ```typescript
   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     db: { schema: 'api' }
   });
   ```

2. **Permissions đã được grant** cho các VIEWs (đã fix trước đó):
   ```sql
   GRANT SELECT ON api.f1_customers_summary TO service_role, anon, authenticated;
   GRANT SELECT ON api.f1_customer_orders TO service_role, anon, authenticated;
   ```

3. **Edge Functions KHÔNG XÓA** - Giữ lại để:
   - Backup nếu direct query gặp vấn đề
   - Dùng cho các operations cần service_role (POST/PUT/DELETE)

---

*Plan created: 2025-12-01*
*Status: Ready for implementation*
