# PLAN: HỆ THỐNG CHỐT HOA HỒNG & THANH TOÁN

## Ngày tạo: 2025-12-02
## Cập nhật: 2025-12-02 (sau review)
## Phạm vi: F0 Portal + Admin ERP + Database

---

## 0. PHÁT HIỆN TỪ DATABASE HIỆN TẠI

### 0.1 Bảng đã tồn tại

| Bảng | Mục đích hiện tại | Ghi chú |
|------|-------------------|---------|
| `affiliate.commission_settings` | Cấu hình TỈ LỆ hoa hồng (basic 5%, first_order 9%) | ⚠️ KHÔNG dùng cho lock period |
| `affiliate.commission_records` | Lưu commission records | Cần thêm cột mới |
| `affiliate.f0_partners` | F0 info, có `current_tier` | OK |
| `affiliate.f0_tiers` | Tier config với requirements JSONB | OK |
| `affiliate.withdrawal_requests` | Yêu cầu rút tiền | Sẽ disable/deprecate |

### 0.2 Function đã tồn tại

| Function | Schema | Logic hiện tại |
|----------|--------|----------------|
| `calculate_and_update_f0_tier(p_f0_id)` | affiliate | Filter `status IN ('available', 'paid')` → **CẦN UPDATE thành `locked`, `paid`** |

### 0.3 Status hiện tại trong `commission_records`

```sql
-- Query result:
-- available: 6 records
-- cancelled: 2 records
-- (KHÔNG có 'pending' hiện tại)
```

**⚠️ MIGRATION REQUIRED**: `available` → `locked` (cho records cũ)

---

## 1. TÓM TẮT YÊU CẦU

### 1.1 Hai khái niệm chính

| Khái niệm | Ý nghĩa | Ai cấu hình |
|-----------|---------|-------------|
| **Thời gian chốt HH** (lock_period) | Sau X ngày từ ngày đủ ĐK → HH được "khóa cứng" | Admin Affiliate (ERP) |
| **Ngày thanh toán HH** (payment_day) | Ngày trong tháng Admin thanh toán HH của tháng trước | Admin Affiliate (ERP) |

### 1.2 Logic chi tiết

```
Hóa đơn đủ ĐK (total = totalPayment): 25/10/2025
         ↓
Status: pending (đang trong thời gian chờ chốt)
F0 thấy HH nhưng chưa tính EXP
         ↓
[Nếu hủy đơn trong giai đoạn này → HH bị hủy, không tính gì]
         ↓
Sau 15 ngày → Ngày chốt: 09/11/2025
         ↓
Status: locked (HH khóa cứng, tính vào "Tháng 11")
EXP được cộng cho F0
Dù hủy đơn sau ngày này → vẫn được HH + EXP
         ↓
Ngày 05/12/2025: Admin thanh toán HH tháng 11
         ↓
Status: paid
```

### 1.3 Status flow mới

| Status | Ý nghĩa | EXP | HH hiển thị | Bị ảnh hưởng bởi hủy đơn |
|--------|---------|-----|-------------|--------------------------|
| `pending` | Đang chờ chốt (trong X ngày) | ❌ Chưa | ✅ Có (dự kiến) | ✅ Có - bị hủy nếu đơn hủy |
| `locked` | Đã xác thực, chờ thanh toán | ✅ Đã cộng | ✅ Có (chính thức) | ❌ Không - HH + EXP giữ nguyên |
| `paid` | Đã thanh toán | ✅ Đã cộng | ✅ Có (đã nhận) | ❌ Không |
| `cancelled` | Bị hủy (đơn hủy trước khi chốt) | ❌ Không | ❌ Không | - |

---

## 2. THAY ĐỔI DATABASE

### 2.1 Bảng mới: `affiliate.lock_payment_settings`

> ⚠️ **LƯU Ý**: Bảng `commission_settings` đã tồn tại và dùng cho **tỉ lệ hoa hồng** (basic, first_order).
> Tạo bảng MỚI `lock_payment_settings` cho lock period và payment day.

```sql
CREATE TABLE affiliate.lock_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cấu hình chốt hoa hồng
  lock_period_days INTEGER NOT NULL DEFAULT 15,

  -- Cấu hình ngày thanh toán
  payment_day INTEGER NOT NULL DEFAULT 5 CHECK (payment_day BETWEEN 1 AND 28),

  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  updated_by_name VARCHAR(255)
);

-- Partial unique index: chỉ 1 record active
CREATE UNIQUE INDEX unique_active_lock_payment_setting
ON affiliate.lock_payment_settings (is_active) WHERE (is_active = true);

-- Insert default config
INSERT INTO affiliate.lock_payment_settings (lock_period_days, payment_day)
VALUES (15, 5);
```

### 2.2 Cột mới trong `affiliate.commission_records`

```sql
-- Step 1: Add new columns
ALTER TABLE affiliate.commission_records
ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ,           -- Ngày hóa đơn đủ ĐK
ADD COLUMN IF NOT EXISTS lock_date TIMESTAMPTZ,              -- Ngày chốt dự kiến (qualified_at + lock_period)
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,              -- Ngày thực tế được chốt
ADD COLUMN IF NOT EXISTS commission_month VARCHAR(7),        -- Tháng tính HH (format: '2025-11')
ADD COLUMN IF NOT EXISTS payment_batch_id UUID;              -- Link đến đợt thanh toán

-- Step 2: Migrate existing data
-- Records với status = 'available' → chuyển thành 'locked' (đã chốt rồi)
UPDATE affiliate.commission_records
SET
  status = 'locked',
  qualified_at = COALESCE(created_at, now()),
  lock_date = COALESCE(created_at, now()),
  locked_at = COALESCE(created_at, now()),
  commission_month = TO_CHAR(COALESCE(created_at, now()), 'YYYY-MM')
WHERE status = 'available';

-- Records với status = 'paid' → giữ nguyên, chỉ set các cột mới
UPDATE affiliate.commission_records
SET
  qualified_at = COALESCE(qualified_at, created_at, now()),
  lock_date = COALESCE(lock_date, created_at, now()),
  locked_at = COALESCE(locked_at, created_at, now()),
  commission_month = COALESCE(commission_month, TO_CHAR(COALESCE(created_at, now()), 'YYYY-MM'))
WHERE status = 'paid';

-- Records với status = 'cancelled' → chỉ set qualified_at (để tracking)
UPDATE affiliate.commission_records
SET qualified_at = COALESCE(qualified_at, created_at)
WHERE status = 'cancelled' AND qualified_at IS NULL;
```

### 2.3 Bảng mới: `affiliate.payment_batches`

```sql
CREATE TABLE affiliate.payment_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Thông tin đợt thanh toán
  payment_month VARCHAR(7) NOT NULL,           -- Tháng thanh toán HH (e.g., '2025-11')
  payment_date DATE NOT NULL,                  -- Ngày thanh toán thực tế

  -- Thống kê
  total_f0_count INTEGER NOT NULL DEFAULT 0,
  total_commission NUMERIC(15,2) NOT NULL DEFAULT 0,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, processing, completed, cancelled

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_by_name VARCHAR(255),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  completed_by_name VARCHAR(255),
  notes TEXT
);
```

### 2.4 VIEW mới: `api.commission_records` (cập nhật)

> ⚠️ **LƯU Ý**: VIEW `api.commission_records` có thể đã tồn tại. Dùng `CREATE OR REPLACE`.

```sql
CREATE OR REPLACE VIEW api.commission_records AS
SELECT
  cr.*,
  -- Computed fields cho FE
  CASE
    WHEN cr.status = 'pending' AND cr.lock_date <= NOW() THEN 'ready_to_lock'
    ELSE cr.status
  END AS computed_status,

  -- Status label tiếng Việt
  CASE cr.status
    WHEN 'pending' THEN 'Chờ xác thực'
    WHEN 'locked' THEN 'Đã xác thực'
    WHEN 'paid' THEN 'Đã thanh toán'
    WHEN 'cancelled' THEN 'Đã hủy'
    ELSE cr.status
  END AS status_label,

  -- Days until lock
  CASE
    WHEN cr.status = 'pending' THEN
      GREATEST(0, EXTRACT(EPOCH FROM (cr.lock_date - NOW())) / 86400)::INTEGER
    ELSE 0
  END AS days_until_lock

FROM affiliate.commission_records cr;

GRANT SELECT ON api.commission_records TO service_role, anon, authenticated;
```

### 2.5 VIEW mới: `api.lock_payment_settings`

> ⚠️ **LƯU Ý**: Dùng tên `lock_payment_settings` để phân biệt với `commission_settings` (tỉ lệ HH).

```sql
CREATE OR REPLACE VIEW api.lock_payment_settings AS
SELECT
  id,
  lock_period_days,
  payment_day,
  is_active,
  updated_at,
  updated_by_name
FROM affiliate.lock_payment_settings
WHERE is_active = true
LIMIT 1;

GRANT SELECT ON api.lock_payment_settings TO service_role, anon, authenticated;
```

### 2.6 UPDATE Function: `calculate_and_update_f0_tier`

> ⚠️ **QUAN TRỌNG**: Hàm này đã tồn tại và filter `status IN ('available', 'paid')`.
> Cần UPDATE thành `status IN ('locked', 'paid')`.

```sql
CREATE OR REPLACE FUNCTION affiliate.calculate_and_update_f0_tier(p_f0_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_total_referrals integer;
  v_total_orders integer;
  v_total_revenue numeric;
  v_current_tier varchar(20);
  v_new_tier varchar(20);
  v_new_tier_level integer;
  v_tier_record record;
  v_result jsonb;
BEGIN
  -- Get F0's current tier
  SELECT current_tier INTO v_current_tier
  FROM affiliate.f0_partners
  WHERE id = p_f0_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'F0 not found');
  END IF;

  -- Count total valid referrals (vouchers with valid commission)
  -- ⚠️ CHANGED: 'available' → 'locked'
  SELECT COUNT(DISTINCT vat.code) INTO v_total_referrals
  FROM affiliate.voucher_affiliate_tracking vat
  WHERE vat.f0_id = p_f0_id
    AND vat.voucher_used = true
    AND vat.commission_status IN ('locked', 'paid');

  -- Count total orders and sum revenue from commission records
  -- ⚠️ CHANGED: 'available' → 'locked'
  SELECT
    COUNT(*),
    COALESCE(SUM(invoice_amount), 0)
  INTO v_total_orders, v_total_revenue
  FROM affiliate.commission_records
  WHERE f0_id = p_f0_id
    AND status IN ('locked', 'paid');

  -- Determine new tier based on requirements (must meet ALL requirements)
  -- Start from highest tier and work down
  v_new_tier := 'BRONZE';
  v_new_tier_level := 1;

  FOR v_tier_record IN
    SELECT tier_code, tier_level, requirements
    FROM affiliate.f0_tiers
    WHERE is_active = true
    ORDER BY tier_level DESC
  LOOP
    IF v_total_referrals >= (v_tier_record.requirements->>'min_referrals')::integer
       AND v_total_orders >= (v_tier_record.requirements->>'min_orders')::integer
       AND v_total_revenue >= (v_tier_record.requirements->>'min_revenue')::numeric
    THEN
      v_new_tier := v_tier_record.tier_code;
      v_new_tier_level := v_tier_record.tier_level;
      EXIT; -- Found the highest qualifying tier
    END IF;
  END LOOP;

  -- Update F0's tier if changed
  IF v_current_tier IS DISTINCT FROM v_new_tier THEN
    UPDATE affiliate.f0_partners
    SET current_tier = v_new_tier,
        updated_at = now()
    WHERE id = p_f0_id;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'f0_id', p_f0_id,
    'stats', jsonb_build_object(
      'total_referrals', v_total_referrals,
      'total_orders', v_total_orders,
      'total_revenue', v_total_revenue
    ),
    'previous_tier', v_current_tier,
    'new_tier', v_new_tier,
    'tier_changed', v_current_tier IS DISTINCT FROM v_new_tier
  );

  RETURN v_result;
END;
$function$;
```

---

## 3. EDGE FUNCTIONS

### 3.1 Cập nhật: `webhook-affiliate-check-voucher-invoice`

**Thay đổi:**
- Khi tạo commission_record mới, set:
  - `status = 'pending'` (thay vì 'available')
  - `qualified_at = NOW()`
  - `lock_date = NOW() + lock_period_days`
  - `commission_month = NULL` (chưa xác định đến khi lock)

```typescript
// Lấy config từ lock_payment_settings (KHÔNG PHẢI commission_settings)
const { data: config } = await supabase
  .schema('api')
  .from('lock_payment_settings')
  .select('lock_period_days')
  .single();

const lockPeriodDays = config?.lock_period_days || 15;

// Tạo commission record
const lockDate = new Date();
lockDate.setDate(lockDate.getDate() + lockPeriodDays);

await supabase.from('commission_records').insert({
  // ... existing fields
  status: 'pending',
  qualified_at: new Date().toISOString(),
  lock_date: lockDate.toISOString(),
  commission_month: null, // Set khi lock
});
```

### 3.2 Cập nhật: Xử lý hủy đơn

**Khi đơn bị hủy (invoice_cancelled_at được set):**
- Nếu status = 'pending' → chuyển thành 'cancelled', không tính gì
- Nếu status = 'locked' hoặc 'paid' → giữ nguyên, vẫn tính HH + EXP

```typescript
// Trong webhook khi nhận invoice update với status = cancelled
if (commissionRecord.status === 'pending') {
  await supabase
    .from('commission_records')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: 'Hóa đơn bị hủy trước khi chốt hoa hồng'
    })
    .eq('id', commissionRecord.id);
} else {
  // status = locked hoặc paid → chỉ đánh dấu invoice_cancelled_at
  await supabase
    .from('commission_records')
    .update({
      invoice_cancelled_at: new Date().toISOString(),
      invoice_cancelled_after_paid: commissionRecord.status === 'paid'
    })
    .eq('id', commissionRecord.id);
}
```

### 3.3 Mới: `cron-lock-commissions`

**Mục đích:** Chạy hàng ngày, chốt các commission đã đến hạn

```typescript
// Cron: Chạy 00:05 mỗi ngày (sau nửa đêm)

// 1. Lấy các commission pending đã đến hạn lock
const { data: pendingCommissions } = await supabase
  .from('commission_records')
  .select('*')
  .eq('status', 'pending')
  .lte('lock_date', new Date().toISOString())
  .is('invoice_cancelled_at', null); // Chưa bị hủy

// 2. Chốt từng commission
for (const commission of pendingCommissions) {
  const lockedMonth = new Date().toISOString().slice(0, 7); // '2025-11'

  await supabase
    .from('commission_records')
    .update({
      status: 'locked',
      locked_at: new Date().toISOString(),
      commission_month: lockedMonth
    })
    .eq('id', commission.id);

  // 3. Cộng EXP cho F0 (gọi recalculateF0Tier)
  await recalculateF0Tier(supabase, commission.f0_id);
}

console.log(`Locked ${pendingCommissions.length} commissions`);
```

### 3.4 Cập nhật: `recalculateF0Tier` (trong Edge Functions)

**Thay đổi:**
- Chỉ đếm commission có status = 'locked' hoặc 'paid' vào EXP
- Không đếm 'pending'
- **LƯU Ý**: Hàm DB `calculate_and_update_f0_tier()` cũng cần update (đã làm ở mục 2.6)

```typescript
// TRƯỚC
const validCommissions = commissions.filter(c =>
  (c.status === 'available' || c.status === 'paid') &&
  !c.invoice_cancelled_at
);

// SAU
const validCommissions = commissions.filter(c =>
  (c.status === 'locked' || c.status === 'paid')
  // Không cần check invoice_cancelled_at vì locked = đã chốt rồi
);
```

**Các file cần update:**
- `supabase/functions/webhook-affiliate-check-voucher-invoice/index.ts` - hàm `recalculateF0Tier()`
- `supabase/functions/get-f0-dashboard-stats/index.ts` - nếu có filter status

### 3.5 Mới: `admin-process-payment-batch` (Admin ERP)

**Mục đích:** Admin chọn tháng → Thanh toán hàng loạt

```typescript
// Input: { payment_month: '2025-11' }

// 1. Lấy tất cả commission locked của tháng đó
const { data: commissions } = await supabase
  .from('commission_records')
  .select('*')
  .eq('status', 'locked')
  .eq('commission_month', payment_month);

// 2. Group by f0_id
const f0Groups = groupBy(commissions, 'f0_id');

// 3. Tạo payment batch
const { data: batch } = await supabase
  .from('payment_batches')
  .insert({
    payment_month,
    payment_date: new Date().toISOString(),
    total_f0_count: Object.keys(f0Groups).length,
    total_commission: commissions.reduce((sum, c) => sum + c.total_commission, 0),
    status: 'processing',
    created_by: adminUserId
  })
  .select()
  .single();

// 4. Cập nhật từng commission
for (const commission of commissions) {
  await supabase
    .from('commission_records')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_by: adminUserId,
      payment_batch_id: batch.id
    })
    .eq('id', commission.id);
}

// 5. Hoàn thành batch
await supabase
  .from('payment_batches')
  .update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    completed_by: adminUserId
  })
  .eq('id', batch.id);
```

---

## 4. ADMIN ERP (d:\ERP-FE-fresh)

### 4.1 Trang mới: `CommissionSettingsPage.tsx`

**Đường dẫn:** `/affiliate/settings`

**UI:**
- Form cấu hình:
  - `lock_period_days`: Input number (1-60 ngày)
  - `payment_day`: Select (1-28)
- Hiển thị ngày thanh toán kế tiếp
- Lịch sử thay đổi cấu hình

### 4.2 Trang mới: `CommissionPaymentPage.tsx`

**Đường dẫn:** `/affiliate/payments`

**UI:**
- Tabs: "Chờ thanh toán" | "Đã thanh toán"
- Filter by tháng
- Bảng danh sách F0:
  - F0 Code | Tên | SĐT | Số HH locked | Tổng tiền | Bank Info
- Button "Thanh toán tất cả" hoặc chọn từng F0
- Export Excel

### 4.3 Cập nhật: `AffiliateDashboard.tsx`

**Thêm cards:**
- Số HH pending (chờ chốt)
- Số HH locked (chờ thanh toán)
- Tổng tiền chờ thanh toán tháng này
- Ngày thanh toán kế tiếp

---

## 5. F0 PORTAL (d:\mat-kinh-affiliate-vscode)

### 5.1 Cập nhật: `DashboardPage.tsx`

**Thay đổi hiển thị HH:**
```
┌─────────────────────────────────────────┐
│ Hoa hồng tháng 12/2025                  │
├─────────────────────────────────────────┤
│ Chờ xác thực:        500,000đ (2 đơn)       │
│ Đã xác thực:       1,200,000đ (5 đơn)       │
│ ─────────────────────────────────────── │
│ Tổng tháng này: 1,700,000đ              │
├─────────────────────────────────────────┤
│ 📅 Ngày thanh toán: 05/01/2026          │
│    (HH tháng 12 sẽ được thanh toán)     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Lịch sử thanh toán                      │
├─────────────────────────────────────────┤
│ Tháng 11/2025:  2,500,000đ  ✅ Đã nhận  │
│ Tháng 10/2025:  1,800,000đ  ✅ Đã nhận  │
└─────────────────────────────────────────┘
```

### 5.2 Cập nhật: `MyCustomersPage.tsx` - Chi tiết đơn hàng

**Thêm hiển thị:**
- Badge status: "Chờ xác thực (còn 5 ngày)" | "Đã xác thực" | "Đã thanh toán"
- Tooltip giải thích status

### 5.3 Cập nhật: `get-f0-dashboard-stats`

**Thay đổi response:**
```typescript
{
  // ... existing fields

  commission: {
    // Tháng hiện tại
    current_month: '2025-12',
    pending_amount: 500000,      // Chờ xác thực
    pending_count: 2,
    locked_amount: 1200000,      // Đã xác thực
    locked_count: 5,
    total_current_month: 1700000,

    // Thanh toán kế tiếp
    next_payment_date: '2026-01-05',
    next_payment_amount: 1200000,  // = locked_amount

    // Lịch sử
    history: [
      { month: '2025-11', amount: 2500000, status: 'paid', paid_at: '2025-12-05' },
      { month: '2025-10', amount: 1800000, status: 'paid', paid_at: '2025-11-05' }
    ]
  }
}
```

### 5.4 Xóa: Trang rút tiền

- Xóa `WithdrawalPage.tsx` hoặc disable tính năng
- F0 không tự rút tiền, Admin thanh toán hàng loạt

---

## 6. CRON JOBS (pg_cron)

### 6.1 Lock commissions hàng ngày

```sql
-- Chạy 00:05 mỗi ngày
SELECT cron.schedule(
  'lock-pending-commissions',
  '5 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kcirpjxbjqagrqrjfldu.supabase.co/functions/v1/cron-lock-commissions',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )
  $$
);
```

### 6.2 Reminder thanh toán (optional)

```sql
-- Chạy ngày 1 mỗi tháng - nhắc Admin thanh toán
SELECT cron.schedule(
  'payment-reminder',
  '0 8 1 * *',
  $$
  -- Send notification to admin
  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT
    u.id,
    'payment_reminder',
    'Nhắc thanh toán hoa hồng',
    'Đến kỳ thanh toán hoa hồng tháng trước. Vui lòng kiểm tra và xử lý.'
  FROM auth.users u
  JOIN public.user_roles ur ON u.id = ur.user_id
  JOIN public.roles r ON ur.role_id = r.id
  WHERE r.name = 'affiliate_admin';
  $$
);
```

---

## 7. MIGRATION PLAN

### Phase 1: Database (1-2 ngày)
- [ ] Tạo bảng `affiliate.commission_settings`
- [ ] Thêm cột mới vào `affiliate.commission_records`
- [ ] Tạo bảng `affiliate.payment_batches`
- [ ] Migrate data cũ (set qualified_at, locked_at cho records existing)
- [ ] Tạo/update VIEWs

### Phase 2: Edge Functions (2-3 ngày)
- [ ] Update `webhook-affiliate-check-voucher-invoice` - tạo với status pending
- [ ] Update xử lý hủy đơn
- [ ] Tạo `cron-lock-commissions`
- [ ] Update `recalculateF0Tier` - chỉ đếm locked/paid
- [ ] Tạo `admin-process-payment-batch`
- [ ] Update `get-f0-dashboard-stats`

### Phase 3: Admin ERP (2-3 ngày)
- [ ] Trang `CommissionSettingsPage.tsx`
- [ ] Trang `CommissionPaymentPage.tsx`
- [ ] Update `AffiliateDashboard.tsx`
- [ ] Service layer

### Phase 4: F0 Portal (1-2 ngày)
- [ ] Update `DashboardPage.tsx` - hiển thị theo tháng
- [ ] Update `MyCustomersPage.tsx` - badge status
- [ ] Disable/xóa trang rút tiền
- [ ] Update types

### Phase 5: Testing & Deploy (1-2 ngày)
- [ ] Test flow hoàn chỉnh
- [ ] Test edge cases (hủy đơn trước/sau chốt)
- [ ] Test cron job
- [ ] Deploy production

---

## 8. EDGE CASES

### 8.1 Hủy đơn trước khi chốt
- Commission status: pending → cancelled
- Không tính EXP
- Không hiển thị HH

### 8.2 Hủy đơn sau khi chốt
- Commission status: giữ nguyên (locked/paid)
- EXP giữ nguyên
- HH giữ nguyên
- Đánh dấu `invoice_cancelled_at` để tracking

### 8.3 Admin thay đổi lock_period_days
- Chỉ áp dụng cho commission mới
- Commission pending giữ nguyên lock_date cũ

### 8.4 Admin thay đổi payment_day
- Áp dụng từ kỳ thanh toán tiếp theo
- Không ảnh hưởng lịch sử

### 8.5 Commission tạo cuối tháng
- Ví dụ: qualified_at = 25/11, lock_period = 15 ngày
- lock_date = 10/12
- commission_month = '2025-12' (tháng 12, không phải 11)
- Thanh toán vào 05/01/2026

---

## 9. RISK & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data migration lỗi | High | Backup trước, test trên staging |
| Cron job fail | Medium | Có cron backup, alert khi fail |
| Admin quên thanh toán | Low | Notification nhắc nhở |
| Conflict status | Medium | Transaction + optimistic locking |

---

---

## 10. CẬP NHẬT TÀI LIỆU

### 10.1 CONTEXT.md (F0 Portal)

**Section 3. DEVELOPMENT RULES → Commission Logic:**
```markdown
### Commission Logic
- Revenue counted only when `total = totalpayment` (fully paid)
- Commission status: pending → locked → paid (CHANGED from available → paid)
- pending: Chờ xác thực (X ngày) - chưa tính EXP
- locked: Đã xác thực - tính EXP, không bị ảnh hưởng bởi hủy đơn
- Tier calculation based on LOCKED + PAID invoices only
```

**Section 8. COMMISSION FLOW:**
```markdown
## COMMISSION FLOW (Updated)

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
  - If total ≠ totalpayment → commission_status: invalid
  - If total = totalpayment → commission_status: pending, set lock_date
         ↓
[Wait X days - lock_period from settings]
         ↓
cron-lock-commissions (daily):
  - If lock_date <= now() → status: locked
  - EXP calculated, tier updated
         ↓
Admin creates payment batch → status: paid
```

### 10.2 CONTEXT-ERP.md

**Section 4. Database Schema Architecture → Affiliate Schema:**
```markdown
**Affiliate Schema:**
- `commission_settings` - Commission rate configs (basic, first_order)
- `lock_payment_settings` - Lock period & payment day config (NEW)
- `commission_records` - Commission tracking with lock mechanism
- `payment_batches` - Payment batch tracking (NEW)
- `f0_partners`, `f0_tiers`, etc.
```

---

## 11. CHECKLIST TRIỂN KHAI CHI TIẾT

### Phase 1: Database (1-2 ngày)
- [ ] **1.1** Tạo bảng `affiliate.lock_payment_settings` với default values
- [ ] **1.2** Thêm cột mới vào `affiliate.commission_records`
- [ ] **1.3** Migrate data: `available` → `locked`
- [ ] **1.4** Tạo bảng `affiliate.payment_batches`
- [ ] **1.5** Tạo/update VIEW `api.commission_records`
- [ ] **1.6** Tạo VIEW `api.lock_payment_settings`
- [ ] **1.7** Update function `affiliate.calculate_and_update_f0_tier()`
- [ ] **1.8** GRANT permissions cho tất cả VIEWs mới

### Phase 2: Edge Functions (2-3 ngày)
- [ ] **2.1** Update `webhook-affiliate-check-voucher-invoice` - tạo với status pending
- [ ] **2.2** Update xử lý hủy đơn (pending → cancelled, locked → giữ nguyên)
- [ ] **2.3** Tạo `cron-lock-commissions` + pg_cron job
- [ ] **2.4** Update `recalculateF0Tier` trong webhook (locked/paid only)
- [ ] **2.5** Tạo `admin-process-payment-batch`
- [ ] **2.6** Update `get-f0-dashboard-stats` response format
- [ ] **2.7** Deploy tất cả với `--no-verify-jwt` (CLI only!)

### Phase 3: Admin ERP (2-3 ngày)
- [ ] **3.1** Trang `LockPaymentSettingsPage.tsx`
- [ ] **3.2** Trang `CommissionPaymentPage.tsx`
- [ ] **3.3** Update `AffiliateDashboard.tsx` với stats mới
- [ ] **3.4** Service layer cho admin functions
- [ ] **3.5** Types cho settings, payment batches

### Phase 4: F0 Portal (1-2 ngày)
- [ ] **4.1** Update `DashboardPage.tsx` - hiển thị theo tháng
- [ ] **4.2** Update `MyCustomersPage.tsx` - badge status với days_until_lock
- [ ] **4.3** Disable/hide `WithdrawalPage.tsx`
- [ ] **4.4** Update types cho commission status
- [ ] **4.5** Update `f1CustomerService.ts` nếu cần

### Phase 5: Documentation & Testing (1 ngày)
- [ ] **5.1** Update `CONTEXT.md`
- [ ] **5.2** Update `CONTEXT-ERP.md`
- [ ] **5.3** Test flow hoàn chỉnh (tạo commission → lock → pay)
- [ ] **5.4** Test edge cases (hủy đơn trước/sau lock)
- [ ] **5.5** Test cron job
- [ ] **5.6** Verify EXP/tier calculation

---

*Plan created: 2025-12-02*
*Updated: 2025-12-02 (after database review)*
*Status: Ready for Implementation*
