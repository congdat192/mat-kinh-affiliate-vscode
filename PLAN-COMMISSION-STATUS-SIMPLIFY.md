# PLAN: Đơn giản hóa Trạng Thái Hoa Hồng (Commission Status)

> **Purpose**: Đơn giản hóa cột "Trạng Thái Hoa Hồng" trong ReferralHistoryPage để F0 dễ hiểu hơn.

---

## 1. Problem Statement (ROOT CAUSE)

### 1.1. Current Behavior
- Trang "Lịch Sử Giới Thiệu" (`ReferralHistoryPage.tsx`) có 2 cột gây rối:
  - **Cột "Điều Kiện"**: Hiển thị đơn hàng có hợp lệ không
  - **Cột "Trạng Thái Hoa Hồng"**: Hiển thị "Chờ xác thực + Còn X ngày", "Đã xác thực", "Đã thanh toán", "Đã hủy"

- **Vấn đề**: "Còn X ngày" đang hiển thị ở cột "TT Hoa Hồng" nhưng thực chất là thông tin về điều kiện (thời gian chờ để đảm bảo đơn không bị hủy).

### 1.2. Root Cause Analysis
- Logic hiển thị phức tạp, trộn lẫn giữa:
  - Thời gian chờ lock (X ngày) - thuộc về "Điều Kiện"
  - Trạng thái thanh toán - thuộc về "TT Hoa Hồng"

- Code hiện tại trong `ReferralHistoryPage.tsx` (lines 717-752):
```typescript
{referral.commissionInfo?.paidAt ? (
  // Đã thanh toán ✅
) : referral.commissionInfo?.lockedAt ? (
  // Đã xác thực
) : referral.commissionInfo?.lockDate ? (
  // Chờ xác thực + còn X ngày  ← VẤN ĐỀ: X ngày không thuộc TT Hoa Hồng
) : referral.commissionStatus === 'invalid' ? (
  // Đã hủy ← VẤN ĐỀ: Gộp tất cả invalid = Đã hủy (sai)
) : ...
}
```

### 1.3. Expected Behavior After Fix

**Cột "Điều Kiện"** (giữ nguyên + thêm "Còn X ngày"):
- ✅ Đủ điều kiện
- ⏳ Chờ xử lý (còn X ngày) ← chuyển "Còn X ngày" sang đây
- ❌ Không hợp lệ (KH cũ/HĐ chưa xong)
- -- Chưa mua

**Cột "Trạng Thái Hoa Hồng"** (đơn giản hóa):
| Status | Điều kiện | Icon | Màu |
|--------|-----------|------|-----|
| **Chờ xác nhận** | `pending` + đang trong X ngày | ⏳ Clock | 🟡 Vàng |
| **Chờ thanh toán** | `locked` (đã qua X ngày) | 🔒 Lock | 🔵 Xanh dương |
| **Đã thanh toán** | `paid` | ✅ Check | 🟢 Xanh lá |
| **Đã hủy** | `cancelled` hoặc `INVOICE_CANCELLED` | ❌ X | 🔴 Đỏ |

**Logic code mới**:
```typescript
if (paidAt)                              → "Đã thanh toán" 🟢
else if (status === 'cancelled' ||
         invalidReasonCode === 'INVOICE_CANCELLED') → "Đã hủy" 🔴
else if (lockedAt)                       → "Chờ thanh toán" 🔵
else if (invoiceInfo)                    → "Chờ xác nhận" 🟡
else                                     → "--"
```

---

## 2. Component Analysis

### 2.1. Database
| Component | Schema | Type | Needs Change | Reason |
|-----------|--------|------|--------------|--------|
| `f1_customer_orders` | api | VIEW | **YES** | Cập nhật `status_label` CASE logic |
| `commission_records` | affiliate | TABLE | NO | Source data không đổi |

### 2.2. Edge Functions
| Function | File Path | Needs Change | Reason |
|----------|-----------|--------------|--------|
| `get-f0-referral-history` | ❌ CHƯA TỒN TẠI | **CREATE** | Page đang gọi nhưng chưa có |
| `get-f0-my-customers` | supabase/functions/.../index.ts | NO | Không dùng status_label |
| `get-f1-customer-detail` | supabase/functions/.../index.ts | NO | Dùng từ VIEW, sẽ tự update |

### 2.3. TypeScript Types
| File | Needs Change | Reason |
|------|--------------|--------|
| `src/types/f1Customer.ts` | NO | Đã có `CommissionStatus` type |

### 2.4. UI Pages
| Page | File Path | Needs Change | Reason |
|------|-----------|--------------|--------|
| `ReferralHistoryPage` | src/pages/f0/ReferralHistoryPage.tsx | **YES** | Đơn giản hóa logic hiển thị |
| `MyCustomersPage` | src/pages/f0/MyCustomersPage.tsx | **YES** | Đổi label cho consistent |

---

## 3. Implementation Phases

### Phase 1: Update Database VIEW `api.f1_customer_orders`

**File**: Database VIEW

**Changes**:
```sql
-- BEFORE (current):
CASE
    WHEN invoice_cancelled_at IS NOT NULL THEN 'Đã hủy'::varchar
    WHEN status = 'paid' THEN 'Đã thanh toán'::varchar
    WHEN status = 'locked' THEN 'Đã xác thực'::varchar
    WHEN status = 'pending' THEN 'Chờ xác thực'::varchar
    WHEN status = 'cancelled' THEN 'Đã hủy'::varchar
    WHEN status = 'available' THEN 'Chờ xác thực'::varchar
    ELSE status
END AS status_label

-- AFTER (new):
CASE
    WHEN invoice_cancelled_at IS NOT NULL THEN 'Đã hủy'::varchar
    WHEN status = 'paid' THEN 'Đã thanh toán'::varchar
    WHEN status = 'cancelled' THEN 'Đã hủy'::varchar
    WHEN status = 'locked' THEN 'Chờ thanh toán'::varchar
    WHEN status = 'pending' THEN 'Chờ xác nhận'::varchar
    WHEN status = 'available' THEN 'Chờ xác nhận'::varchar
    ELSE status
END AS status_label
```

**Key changes**:
- `locked` → "Chờ thanh toán" (không còn "Đã xác thực")
- `pending/available` → "Chờ xác nhận" (không còn "Chờ xác thực")

**Verification**:
```sql
SELECT DISTINCT status, status_label FROM api.f1_customer_orders;
-- Expected:
-- pending → Chờ xác nhận
-- locked → Chờ thanh toán
-- paid → Đã thanh toán
-- cancelled → Đã hủy
```

---

### Phase 2: Create Edge Function `get-f0-referral-history`

**File**: `supabase/functions/get-f0-referral-history/index.ts`

**Note**: Edge Function này chưa tồn tại nhưng ReferralHistoryPage đang gọi nó. Cần kiểm tra xem page có đang hoạt động hay không, hoặc có sử dụng mock data.

**Skip phase này nếu**: Page đang dùng mock data hoặc source khác.

---

### Phase 3: Update UI `ReferralHistoryPage.tsx`

**File**: `src/pages/f0/ReferralHistoryPage.tsx`

**Changes - Cột "Trạng Thái Hoa Hồng" (lines 717-752)**:

```typescript
// BEFORE:
{referral.commissionInfo?.paidAt ? (
  <Badge variant="success">Đã thanh toán</Badge>
) : referral.commissionInfo?.lockedAt ? (
  <Badge variant="info">Đã xác thực</Badge>
) : referral.commissionInfo?.lockDate ? (
  <div>
    <Badge variant="warning">Chờ xác thực</Badge>
    {daysUntilLock && <span>Còn {daysUntilLock} ngày</span>}
  </div>
) : referral.commissionStatus === 'invalid' ? (
  <Badge variant="danger">Đã hủy</Badge>
) : referral.invoiceInfo ? (
  <Badge variant="warning">Chờ xác thực</Badge>
) : '--'}

// AFTER:
{referral.commissionInfo?.paidAt ? (
  <Badge variant="success" className="flex items-center gap-1 w-fit">
    <CheckCircle className="w-3 h-3" />
    Đã thanh toán
  </Badge>
) : (referral.commissionStatus === 'cancelled' ||
     referral.invalidReasonCode === 'INVOICE_CANCELLED' ||
     referral.commissionInfo?.invoiceCancelledAt) ? (
  <Badge variant="danger" className="flex items-center gap-1 w-fit">
    <X className="w-3 h-3" />
    Đã hủy
  </Badge>
) : referral.commissionInfo?.lockedAt ? (
  <Badge variant="info" className="flex items-center gap-1 w-fit">
    <Lock className="w-3 h-3" />
    Chờ thanh toán
  </Badge>
) : referral.invoiceInfo ? (
  <Badge variant="warning" className="flex items-center gap-1 w-fit">
    <Clock className="w-3 h-3" />
    Chờ xác nhận
  </Badge>
) : (
  <span className="text-gray-400">--</span>
)}
```

**Changes - Cột "Điều Kiện" (lines 672-696)**:
Thêm "Còn X ngày" vào đây:

```typescript
// AFTER - Cột Điều Kiện:
{referral.commissionStatus === 'invalid' ? (
  <div className="flex items-center gap-1">
    <X className="w-4 h-4 text-red-500" />
    <span className="text-xs text-red-600">
      {referral.invalidReasonCode === 'CUSTOMER_NOT_NEW' ? 'KH cũ dùng' :
       referral.invalidReasonCode === 'INVOICE_CANCELLED' ? 'HĐ đã hủy' :
       'Không hợp lệ'}
    </span>
  </div>
) : referral.commissionStatus === 'paid' || referral.commissionInfo?.lockedAt ? (
  <div className="flex items-center gap-1">
    <CheckCircle className="w-4 h-4 text-green-500" />
    <span className="text-xs text-green-600">Đủ điều kiện</span>
  </div>
) : referral.invoiceInfo ? (
  <div className="flex items-center gap-1">
    <Clock className="w-4 h-4 text-yellow-500" />
    <span className="text-xs text-yellow-600">
      Chờ xử lý
      {referral.commissionInfo?.daysUntilLock != null &&
       referral.commissionInfo.daysUntilLock >= 0 && (
        <span className="ml-1">({referral.commissionInfo.daysUntilLock} ngày)</span>
      )}
    </span>
  </div>
) : (
  <span className="text-gray-400 text-xs">Chưa mua</span>
)}
```

**Verification**:
- Load ReferralHistoryPage với F0-0004
- Kiểm tra cột "Điều Kiện" hiển thị "Còn X ngày"
- Kiểm tra cột "TT Hoa Hồng" chỉ có 4 giá trị đơn giản

---

### Phase 4: Update UI `MyCustomersPage.tsx` (Consistency)

**File**: `src/pages/f0/MyCustomersPage.tsx`

**Changes - getStatusBadge function (lines 92-131)**:

```typescript
// BEFORE:
case 'locked':
  return (
    <Badge variant="default" className="...">
      <Lock className="w-3 h-3 mr-1" />
      Đã xác thực
    </Badge>
  );
case 'pending':
  return (
    <Badge variant="warning" className="...">
      <Clock className="w-3 h-3 mr-1" />
      Chờ xác thực{daysUntilLock ? ` (${daysUntilLock} ngày)` : ''}
    </Badge>
  );

// AFTER:
case 'locked':
  return (
    <Badge variant="default" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
      <Lock className="w-3 h-3 mr-1" />
      Chờ thanh toán
    </Badge>
  );
case 'pending':
case 'available':
  return (
    <Badge variant="warning" className="text-xs">
      <Clock className="w-3 h-3 mr-1" />
      Chờ xác nhận
    </Badge>
  );
```

**Changes - Commission Breakdown labels (lines 310-340)**:

```typescript
// BEFORE:
<p className="text-orange-600 text-xs">Chờ xác thực</p>
<p className="text-blue-600 text-xs">Đã xác thực</p>

// AFTER:
<p className="text-orange-600 text-xs">Chờ xác nhận</p>
<p className="text-blue-600 text-xs">Chờ thanh toán</p>
```

---

## 4. Deployment Order

1. **Phase 1** - Database VIEW (dependency: none)
2. **Phase 3** - ReferralHistoryPage (depends on Phase 1)
3. **Phase 4** - MyCustomersPage (depends on Phase 1)

```bash
# No Edge Function deployment needed for this change
# Just database migration + UI code changes
```

---

## 5. Testing Checklist

- [ ] **Database**: Query `api.f1_customer_orders` - verify `status_label` values
- [ ] **ReferralHistoryPage**:
  - [ ] Cột "Điều Kiện" hiển thị "Còn X ngày"
  - [ ] Cột "TT Hoa Hồng" chỉ có: Chờ xác nhận / Chờ thanh toán / Đã thanh toán / Đã hủy
  - [ ] "Đã hủy" chỉ hiển thị khi HĐ bị cancel (không phải KH cũ dùng)
- [ ] **MyCustomersPage**:
  - [ ] Labels thống nhất với ReferralHistoryPage
  - [ ] Breakdown hiển thị đúng labels mới
- [ ] **Regression**: Các trang khác dùng `status_label` vẫn hoạt động

---

## 6. Rollback Plan

```sql
-- Rollback VIEW to previous version
DROP VIEW IF EXISTS api.f1_customer_orders;
CREATE VIEW api.f1_customer_orders AS
SELECT
  ...
  CASE
    WHEN invoice_cancelled_at IS NOT NULL THEN 'Đã hủy'::varchar
    WHEN status = 'paid' THEN 'Đã thanh toán'::varchar
    WHEN status = 'locked' THEN 'Đã xác thực'::varchar
    WHEN status = 'pending' THEN 'Chờ xác thực'::varchar
    WHEN status = 'cancelled' THEN 'Đã hủy'::varchar
    WHEN status = 'available' THEN 'Chờ xác thực'::varchar
    ELSE status
  END AS status_label
FROM affiliate.commission_records;
```

---

## 7. Summary Table

| Component | Changes | Priority | Status |
|-----------|---------|----------|--------|
| VIEW `api.f1_customer_orders` | Update status_label CASE logic | HIGH | PENDING |
| `ReferralHistoryPage.tsx` | Đơn giản hóa TT Hoa Hồng, chuyển "X ngày" sang Điều Kiện | HIGH | PENDING |
| `MyCustomersPage.tsx` | Đổi labels cho consistent | MEDIUM | PENDING |

---

## 8. Label Mapping (Final)

| Database Status | status_label (Vietnamese) | Ý nghĩa |
|-----------------|---------------------------|---------|
| `pending` | Chờ xác nhận | Đang trong thời gian chờ X ngày |
| `available` | Chờ xác nhận | Legacy, same as pending |
| `locked` | Chờ thanh toán | Đã qua X ngày, chờ Admin duyệt |
| `paid` | Đã thanh toán | Kế toán đã chuyển tiền |
| `cancelled` | Đã hủy | Admin Affiliate hủy hoa hồng |
| (invoice_cancelled_at) | Đã hủy | Hóa đơn KiotViet bị hủy |

---

**Last Updated**: 2025-12-04
**Author**: AI Assistant
