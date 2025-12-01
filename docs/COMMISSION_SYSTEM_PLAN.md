# Commission System Plan - Mat Kinh Tam Duc Affiliate

## Tổng quan

Hệ thống tính hoa hồng cho chương trình Affiliate của Mắt Kính Tâm Đức. F0 (Partner) giới thiệu khách hàng F1, khi F1 mua hàng sử dụng voucher, F0 nhận hoa hồng.

---

## 1. Luồng hoạt động tổng quan

```
F0 tạo voucher cho F1
       ↓
F1 kích hoạt voucher (Zalo/SMS)
       ↓
F1 đến cửa hàng mua hàng, cung cấp mã voucher
       ↓
Nhân viên nhập voucher vào KiotViet
       ↓
KiotViet gửi webhook invoice
       ↓
Edge Function xử lý webhook
       ↓
Kiểm tra điều kiện hợp lệ
       ↓
Tính toán hoa hồng (nếu hợp lệ)
       ↓
Lưu commission_records + cập nhật voucher_affiliate_tracking
       ↓
Gửi thông báo cho F0
```

---

## 2. Điều kiện hoa hồng hợp lệ

### 2.1. Điều kiện về hóa đơn (Invoice)

| Điều kiện | Giá trị yêu cầu | Xử lý nếu không đạt |
|-----------|-----------------|---------------------|
| Trạng thái hóa đơn | `statusvalue = "Hoàn thành"` | `INVOICE_NOT_COMPLETED` → invalid |
| Thanh toán đầy đủ | `total = totalpayment` | Giữ `pending`, chờ khách thanh toán đủ |
| Hóa đơn không bị hủy | `statusvalue != "Hủy"` | `INVOICE_CANCELLED` → invalid |

**QUAN TRỌNG: Logic xử lý thanh toán chưa đủ**

```
Khi total != totalpayment:
┌─────────────────────────────────────────────────────────────────┐
│ KHÔNG đánh dấu invalid ngay!                                     │
│ → Giữ commission_status = 'pending'                              │
│ → Khi khách thanh toán đủ (webhook invoice update)               │
│ → Recheck và tính commission nếu đủ điều kiện                    │
└─────────────────────────────────────────────────────────────────┘
```

**Giải thích:**
- `total`: Tổng giá trị hóa đơn (từ `kiotviet.invoices.total`)
- `totalpayment`: Số tiền khách đã thanh toán (từ `kiotviet.invoices.totalpayment`)
- Nếu `total > totalpayment` → Khách còn nợ → **Chờ thanh toán đủ** (không tính commission, không invalid)
- Nếu `total = totalpayment` → Thanh toán đủ → **Tính commission**

**Ví dụ thực tế:**
```
Voucher: E3XN86SLCO
Invoice: HD269472
  - total: 2,200,000đ
  - totalpayment: 100đ
  - statusvalue: "Hoàn thành"

→ Giữ pending, KHÔNG tính vào revenue F1
→ Khi khách trả đủ 2,200,000đ → Recheck và tính commission
```

### 2.2. Điều kiện về khách hàng (Customer)

| Điều kiện | Giá trị yêu cầu | Mã lỗi nếu không đạt |
|-----------|-----------------|----------------------|
| Loại khách hàng | `is_new_customer = true` | `CUSTOMER_NOT_NEW` |

**Logic xác định khách mới/cũ:**

```javascript
// Bước 1: Lấy SĐT người dùng thực tế từ hóa đơn
const actualPhone = invoice.customer?.contactNumber || invoice.customer?.phone;

// Bước 2: So sánh với SĐT người nhận voucher
if (actualPhone === voucher.recipient_phone) {
  // Cùng người → Dùng customer_type của voucher
  isNewCustomer = voucher.customer_type === 'new';
} else {
  // Khác người → Kiểm tra trong customers_backup
  const existingCustomer = await checkCustomerExists(actualPhone);
  isNewCustomer = !existingCustomer;
}

// Bước 3: Chỉ tính hoa hồng nếu là khách MỚI
if (!isNewCustomer) {
  return { valid: false, code: 'CUSTOMER_NOT_NEW' };
}
```

**Lý do:**
- Chỉ thưởng hoa hồng cho việc giới thiệu khách hàng MỚI
- Khách cũ đã mua hàng trước đó → Không phải do F0 giới thiệu mới
- Ngăn chặn gian lận: F0 tự tạo voucher cho khách quen của cửa hàng

### 2.3. Điều kiện về hệ thống

| Điều kiện | Giá trị yêu cầu | Mã lỗi nếu không đạt |
|-----------|-----------------|----------------------|
| Commission settings tồn tại | Có ít nhất 1 setting active | `SETTINGS_NOT_FOUND` |
| F0 partner active | `is_active = true` | `F0_NOT_ACTIVE` |
| Voucher chưa tính hoa hồng | `commission_status IS NULL` | (Skip - đã xử lý) |

---

## 3. Công thức tính hoa hồng

### 3.1. Các loại hoa hồng

| Loại | Tên | Tỷ lệ mặc định | Điều kiện | Max Cap | Min Order |
|------|-----|----------------|-----------|---------|-----------|
| Basic | Hoa hồng cơ bản | 5% | Tất cả đơn hàng | Không | 0đ |
| First Order | Hoa hồng đơn đầu tiên | 9% | Đơn đầu tiên của F1 | 500,000đ | 500,000đ |
| Tier Bonus | Thưởng cấp bậc | 0.5% - 10% | Theo tier của F0 | Không | Không |

### 3.2. Bảng Tier và Bonus

| Tier | Tên hiển thị | Min Referrals | Min Revenue | Bonus Rate |
|------|--------------|---------------|-------------|------------|
| BRONZE | Đồng | 0 | 0đ | 0.5% |
| SILVER | Bạc | 6 | 6,000,000đ | 2% |
| GOLD | Vàng | 20 | 20,000,000đ | 5% |
| DIAMOND | Kim Cương | 50 | 100,000,000đ | 10% |

### 3.3. Công thức tính

```
BASIC_COMMISSION = invoice_amount × basic_rate
                 = invoice_amount × 5%

FIRST_ORDER_COMMISSION = MIN(invoice_amount × first_order_rate, max_cap)
                       = MIN(invoice_amount × 9%, 500,000đ)
                       (Chỉ áp dụng nếu invoice_amount >= min_order_value)

TIER_BONUS = invoice_amount × tier_bonus_rate
           = invoice_amount × (0.5% | 2% | 5% | 10%)

SUBTOTAL = BASIC + FIRST_ORDER (nếu có)
TOTAL_COMMISSION = SUBTOTAL + TIER_BONUS
```

### 3.4. Ví dụ tính toán

**Scenario:** F0 tier Silver, đơn hàng 1,000,000đ, là đơn đầu tiên của F1

```
Basic:       1,000,000 × 5%   = 50,000đ
First Order: 1,000,000 × 9%   = 90,000đ (< 500,000đ cap, OK)
Subtotal:                     = 140,000đ
Tier Bonus:  1,000,000 × 2%   = 20,000đ (Silver = 2%)
─────────────────────────────────────────
TOTAL:                        = 160,000đ
```

**Scenario:** F0 tier Bronze, đơn hàng 300,000đ (< min_order 500,000đ)

```
Basic:       300,000 × 5%     = 15,000đ
First Order: N/A (đơn < 500,000đ, không đủ điều kiện)
Subtotal:                     = 15,000đ
Tier Bonus:  300,000 × 0.5%   = 1,500đ (Bronze = 0.5%)
─────────────────────────────────────────
TOTAL:                        = 16,500đ
```

---

## 4. Database Schema

### 4.1. Table: `affiliate.commission_settings`

```sql
CREATE TABLE affiliate.commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  -- config: { type: 'percentage', value: 5, max_commission: null, min_order_value: 0 }
  conditions JSONB NOT NULL,
  -- conditions: { applies_to: 'all' | 'first_order', tier_codes: null, campaign_ids: null }
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2. Table: `affiliate.f0_tiers`

```sql
CREATE TABLE affiliate.f0_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_code VARCHAR(20) UNIQUE NOT NULL, -- BRONZE, SILVER, GOLD, DIAMOND
  tier_name VARCHAR(50) NOT NULL, -- Đồng, Bạc, Vàng, Kim Cương
  tier_level INT NOT NULL, -- 1, 2, 3, 4
  requirements JSONB NOT NULL,
  -- { min_referrals: 5, min_revenue: 5000000, min_orders: 10 }
  benefits JSONB NOT NULL,
  -- { commission_bonus_percent: 2, priority_support: true, ... }
  display JSONB,
  -- { color: '#C0C0C0', icon: 'silver-badge' }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.3. Table: `affiliate.commission_records`

```sql
CREATE TABLE affiliate.commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  voucher_code VARCHAR(50) NOT NULL REFERENCES affiliate.voucher_affiliate_tracking(code),
  f0_id UUID NOT NULL REFERENCES affiliate.f0_partners(id),
  f0_code VARCHAR(20) NOT NULL,

  -- Invoice snapshot (từ KiotViet)
  invoice_id VARCHAR(50) NOT NULL,
  invoice_code VARCHAR(50) NOT NULL,
  invoice_amount DECIMAL(15,2) NOT NULL,
  invoice_date TIMESTAMPTZ NOT NULL,
  invoice_status VARCHAR(50) NOT NULL,

  -- F1 Customer snapshot
  f1_phone VARCHAR(20),
  f1_name VARCHAR(255),
  f1_customer_id VARCHAR(50),
  is_new_customer BOOLEAN NOT NULL,

  -- Basic commission snapshot
  basic_setting_id UUID REFERENCES affiliate.commission_settings(id),
  basic_setting_name VARCHAR(255),
  basic_rate DECIMAL(5,2), -- 5.00 = 5%
  basic_amount DECIMAL(15,2) NOT NULL,

  -- First order commission snapshot
  first_order_setting_id UUID REFERENCES affiliate.commission_settings(id),
  first_order_setting_name VARCHAR(255),
  first_order_rate DECIMAL(5,2),
  first_order_amount DECIMAL(15,2) DEFAULT 0,
  first_order_max_cap DECIMAL(15,2),
  first_order_min_order DECIMAL(15,2),
  first_order_applied BOOLEAN DEFAULT false,
  first_order_reason TEXT, -- Lý do nếu không áp dụng

  -- Tier bonus snapshot
  tier_setting_id UUID REFERENCES affiliate.f0_tiers(id),
  tier_code VARCHAR(20),
  tier_name VARCHAR(50),
  tier_bonus_rate DECIMAL(5,2),
  tier_bonus_amount DECIMAL(15,2) DEFAULT 0,

  -- Totals
  subtotal_commission DECIMAL(15,2) NOT NULL, -- basic + first_order
  total_commission DECIMAL(15,2) NOT NULL, -- subtotal + tier_bonus

  -- Status management
  status VARCHAR(20) DEFAULT 'available',
  -- available → processing → paid
  --     ↓           ↓
  -- cancelled   cancelled

  withdrawal_request_id UUID REFERENCES affiliate.withdrawal_requests(id),

  -- Audit fields
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  paid_at TIMESTAMPTZ,
  paid_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancelled_reason TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.4. Columns in `affiliate.voucher_affiliate_tracking`

```sql
-- Commission-related columns
commission_status VARCHAR(20), -- 'pending' | 'available' | 'invalid' | 'paid'
invalid_reason_code VARCHAR(50),
invalid_reason_text TEXT,
actual_user_phone VARCHAR(20),
actual_user_name VARCHAR(255),
actual_customer_type VARCHAR(20), -- 'new' | 'existing'
commission_calculated_at TIMESTAMPTZ
```

---

## 5. Edge Function: `webhook-affiliate-check-voucher-invoice`

### 5.1. Flow diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    KiotViet Webhook                              │
│                 (Invoice Created/Updated)                        │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Parse webhook payload                                    │
│ - Extract invoiceId, voucherCode, customerId                     │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Skip if invoice cancelled                                │
│ - if status == "Đã hủy" → return early                          │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Get invoice details from KiotViet API                    │
│ - GET /invoices/{id}                                             │
│ - Extract: status, total, totalPayment, customer                 │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Check voucher in voucher_affiliate_tracking              │
│ - Find by code                                                   │
│ - Skip if commission_status already set                          │
│ - Get f0_id, recipient_phone, customer_type                      │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Validate invoice conditions                              │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ Check 1: status == "Hoàn thành"                          │    │
│ │ → If not: INVALID (INVOICE_NOT_COMPLETED)                │    │
│ └──────────────────────────────────────────────────────────┘    │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ Check 2: total == totalPayment                           │    │
│ │ → If not: INVALID (INVOICE_NOT_FULLY_PAID)               │    │
│ └──────────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Validate customer                                        │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ Get actual_user_phone from invoice                       │    │
│ │ Compare with voucher.recipient_phone                     │    │
│ │ If same → use voucher.customer_type                      │    │
│ │ If different → check customers_backup                    │    │
│ └──────────────────────────────────────────────────────────┘    │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ Check: is_new_customer == true                           │    │
│ │ → If not: INVALID (CUSTOMER_NOT_NEW)                     │    │
│ └──────────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 7: Get F0 partner and tier info                             │
│ - Get f0_partners record                                         │
│ - Get current tier from f0_tiers                                 │
│ - Get tier_bonus_rate from benefits.commission_bonus_percent     │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 8: Get commission settings                                  │
│ - Basic: applies_to = 'all', is_active = true                   │
│ - First Order: applies_to = 'first_order', is_active = true     │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 9: Calculate commission                                     │
│                                                                  │
│ basic_amount = invoice_amount × (basic_rate / 100)              │
│                                                                  │
│ if (invoice_amount >= first_order_min_order) {                  │
│   first_order_amount = MIN(                                     │
│     invoice_amount × (first_order_rate / 100),                  │
│     first_order_max_cap                                         │
│   )                                                              │
│   first_order_applied = true                                    │
│ }                                                                │
│                                                                  │
│ tier_bonus_amount = invoice_amount × (tier_bonus_rate / 100)    │
│                                                                  │
│ subtotal = basic_amount + first_order_amount                    │
│ total_commission = subtotal + tier_bonus_amount                 │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 10: Save commission_records                                 │
│ - Insert record with all snapshots                               │
│ - status = 'available'                                           │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 11: Update voucher_affiliate_tracking                       │
│ - commission_status = 'available' (or 'invalid')                │
│ - invalid_reason_code (if invalid)                               │
│ - invalid_reason_text (if invalid)                               │
│ - actual_user_phone                                              │
│ - actual_user_name                                               │
│ - actual_customer_type                                           │
│ - commission_calculated_at = now()                               │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 12: Create notification for F0                              │
│ - type = 'commission'                                            │
│ - content = { title, message, voucher_code, amount, ... }       │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2. Pseudocode

```javascript
async function handleInvoiceWebhook(payload) {
  const { invoiceId, voucherCode } = parsePayload(payload);

  // Skip cancelled invoices
  if (payload.status === 'Đã hủy') {
    return { success: true, message: 'Skipped cancelled invoice' };
  }

  // Get invoice details from KiotViet
  const invoice = await kiotVietApi.getInvoice(invoiceId);

  // Find voucher in tracking
  const voucher = await db.voucher_affiliate_tracking.findByCode(voucherCode);
  if (!voucher) {
    return { success: true, message: 'Not an affiliate voucher' };
  }

  // Skip if already processed
  if (voucher.commission_status) {
    return { success: true, message: 'Already processed' };
  }

  // ========== VALIDATION ==========

  // Check 1: Invoice status
  if (invoice.status !== 'Hoàn thành') {
    await markInvalid(voucher, 'INVOICE_NOT_COMPLETED',
      'Hóa đơn chưa hoàn thành');
    return;
  }

  // Check 2: Payment complete
  if (invoice.total !== invoice.totalPayment) {
    await markInvalid(voucher, 'INVOICE_NOT_FULLY_PAID',
      `Hóa đơn chưa thanh toán đủ (${invoice.totalPayment}/${invoice.total})`);
    return;
  }

  // Check 3: Customer type
  const actualPhone = invoice.customer?.contactNumber;
  let isNewCustomer;

  if (actualPhone === voucher.recipient_phone) {
    isNewCustomer = voucher.customer_type === 'new';
  } else {
    const existing = await db.customers_backup.findByPhone(actualPhone);
    isNewCustomer = !existing;
  }

  if (!isNewCustomer) {
    await markInvalid(voucher, 'CUSTOMER_NOT_NEW',
      'Người sử dụng voucher là khách hàng cũ',
      { actualPhone, actualName: invoice.customer?.name, actualType: 'existing' });
    return;
  }

  // ========== CALCULATE COMMISSION ==========

  // Get F0 and tier
  const f0 = await db.f0_partners.findById(voucher.f0_id);
  const tier = await db.f0_tiers.findByCode(f0.current_tier || 'BRONZE');
  const tierBonusRate = tier.benefits.commission_bonus_percent || 0;

  // Get settings
  const basicSetting = await db.commission_settings.findActive('all');
  const firstOrderSetting = await db.commission_settings.findActive('first_order');

  const invoiceAmount = invoice.total;

  // Basic commission
  const basicRate = basicSetting.config.value;
  const basicAmount = invoiceAmount * (basicRate / 100);

  // First order commission
  let firstOrderAmount = 0;
  let firstOrderApplied = false;
  const minOrder = firstOrderSetting.config.min_order_value || 0;

  if (invoiceAmount >= minOrder) {
    const rate = firstOrderSetting.config.value;
    const maxCap = firstOrderSetting.config.max_commission;
    firstOrderAmount = invoiceAmount * (rate / 100);
    if (maxCap && firstOrderAmount > maxCap) {
      firstOrderAmount = maxCap;
    }
    firstOrderApplied = true;
  }

  // Tier bonus
  const tierBonusAmount = invoiceAmount * (tierBonusRate / 100);

  // Totals
  const subtotal = basicAmount + firstOrderAmount;
  const totalCommission = subtotal + tierBonusAmount;

  // ========== SAVE RECORDS ==========

  await db.commission_records.insert({
    voucher_code: voucherCode,
    f0_id: f0.id,
    f0_code: f0.f0_code,
    invoice_id: invoice.id,
    invoice_code: invoice.code,
    invoice_amount: invoiceAmount,
    invoice_date: invoice.createdDate,
    invoice_status: invoice.status,
    f1_phone: actualPhone,
    f1_name: invoice.customer?.name,
    is_new_customer: true,
    basic_setting_id: basicSetting.id,
    basic_setting_name: basicSetting.name,
    basic_rate: basicRate,
    basic_amount: basicAmount,
    first_order_setting_id: firstOrderSetting.id,
    first_order_setting_name: firstOrderSetting.name,
    first_order_rate: firstOrderSetting.config.value,
    first_order_amount: firstOrderAmount,
    first_order_max_cap: firstOrderSetting.config.max_commission,
    first_order_min_order: minOrder,
    first_order_applied: firstOrderApplied,
    tier_setting_id: tier.id,
    tier_code: tier.tier_code,
    tier_name: tier.tier_name,
    tier_bonus_rate: tierBonusRate,
    tier_bonus_amount: tierBonusAmount,
    subtotal_commission: subtotal,
    total_commission: totalCommission,
    status: 'available'
  });

  await db.voucher_affiliate_tracking.update(voucherCode, {
    commission_status: 'available',
    actual_user_phone: actualPhone,
    actual_user_name: invoice.customer?.name,
    actual_customer_type: 'new',
    commission_calculated_at: new Date()
  });

  await createNotification(f0.id, 'commission', {
    title: 'Bạn nhận được hoa hồng mới!',
    message: `Khách hàng ${invoice.customer?.name} đã mua hàng. Hoa hồng: ${formatCurrency(totalCommission)}`,
    voucher_code: voucherCode,
    amount: totalCommission
  });
}

async function markInvalid(voucher, code, text, extra = {}) {
  await db.voucher_affiliate_tracking.update(voucher.code, {
    commission_status: 'invalid',
    invalid_reason_code: code,
    invalid_reason_text: text,
    actual_user_phone: extra.actualPhone || null,
    actual_user_name: extra.actualName || null,
    actual_customer_type: extra.actualType || null,
    commission_calculated_at: new Date()
  });

  await createNotification(voucher.f0_id, 'alert', {
    title: 'Hoa hồng không hợp lệ',
    message: text,
    voucher_code: voucher.code,
    reason_code: code
  });
}
```

---

## 6. Frontend Display

### 6.1. ReferralHistoryPage - Danh sách giới thiệu

**Table columns:**
| Column | Dữ liệu |
|--------|---------|
| Khách hàng | customerName, customerPhone, customerType badge |
| Mã Voucher | voucherCode, reissueCount |
| Chiến dịch | campaignCode |
| Ngày tạo | createdAt (formatted) |
| Trạng thái | status badge (Chờ kích hoạt/Đã kích hoạt/Đã sử dụng) |
| Đơn hàng | invoiceAmount, invoiceDate (nếu có) |
| Hoa hồng | commissionInfo.totalCommission, commissionStatus badge |
| Thao tác | Button "Chi tiết" |

**Commission Status Badges:**
| Status | Text | Color |
|--------|------|-------|
| pending | Chờ xử lý | Yellow/Warning |
| available | Có thể rút | Blue/Info |
| invalid | Không hợp lệ | Red/Danger |
| paid | Đã thanh toán | Green/Success |

### 6.2. Detail Modal - Chi tiết giới thiệu

**Sections:**

1. **Thông tin khách hàng** (gray background)
   - Họ tên
   - Số điện thoại
   - Email (nếu có)
   - Loại khách (badge: Khách mới/Khách cũ)

2. **Thông tin voucher** (blue background)
   - Mã voucher
   - Chiến dịch
   - Ngày tạo
   - Trạng thái
   - Ngày kích hoạt (nếu có)
   - Hạn sử dụng (nếu có)
   - Lịch sử cấp lại (nếu có)

3. **Thông tin đơn hàng** (green background, nếu có invoice)
   - Mã hóa đơn
   - Tổng tiền
   - Ngày mua
   - Trạng thái hóa đơn

4. **Thông tin hoa hồng** (dynamic background based on status)
   - Trạng thái hoa hồng (badge)
   - Lý do không hợp lệ (nếu invalid, red alert box)
     - Hiển thị invalidReasonText
     - Hiển thị actualUserPhone, actualUserName, actualCustomerType
   - Tổng hoa hồng (large, bold)
   - Chi tiết breakdown:
     - Hoa hồng cơ bản (rate%) = amount
     - Thưởng đơn đầu (rate%) = +amount (nếu có)
     - Thưởng cấp bậc TierName (rate%) = +amount (nếu có)

5. **Ghi chú** (nếu có note)

---

## 7. Commission Status Flow

```
                    ┌─────────────────┐
                    │  Voucher Used   │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │ Webhook Trigger │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │   Validation    │
                    └────────┬────────┘
                             ↓
              ┌──────────────┴──────────────┐
              ↓                              ↓
    ┌─────────────────┐            ┌─────────────────┐
    │     VALID       │            │    INVALID      │
    └────────┬────────┘            └────────┬────────┘
             ↓                              ↓
    ┌─────────────────┐            ┌─────────────────┐
    │    available    │            │     invalid     │
    │ (commission_    │            │ (reason_code,   │
    │  records.status)│            │  reason_text)   │
    └────────┬────────┘            └─────────────────┘
             ↓
    ┌─────────────────┐
    │ F0 requests     │
    │ withdrawal      │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │   processing    │
    │ (linked to      │
    │ withdrawal_req) │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │ Admin approves  │
    │ and pays        │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │      paid       │
    └─────────────────┘
```

---

## 8. API Responses

### 8.1. get-f0-referral-history Response

```json
{
  "success": true,
  "data": {
    "referrals": [
      {
        "id": "VOUCHER_CODE",
        "customerName": "Nguyễn Văn A",
        "customerPhone": "0912345678",
        "customerEmail": "a@email.com",
        "customerType": "new",
        "voucherCode": "MKTD-ABC123",
        "campaignCode": "CAMPAIGN-2025",
        "campaignId": "uuid",
        "status": "Đã sử dụng",
        "createdAt": "2025-01-15T10:00:00Z",
        "activatedAt": "2025-01-16T14:30:00Z",
        "expiredAt": "2025-02-15T23:59:59Z",
        "voucherUsed": true,
        "invoiceInfo": {
          "invoiceId": "123456",
          "invoiceCode": "HD-001",
          "invoiceAmount": 1000000,
          "invoiceStatus": "Hoàn thành",
          "invoiceDate": "2025-01-20T09:00:00Z"
        },
        "commissionStatus": "available",
        "invalidReasonCode": null,
        "invalidReasonText": null,
        "actualUserPhone": "0912345678",
        "actualUserName": "Nguyễn Văn A",
        "actualCustomerType": "new",
        "commissionCalculatedAt": "2025-01-20T09:05:00Z",
        "commissionInfo": {
          "totalCommission": 160000,
          "status": "available",
          "breakdown": {
            "basic": {
              "amount": 50000,
              "rate": "5%"
            },
            "firstOrder": {
              "amount": 90000,
              "rate": "9%"
            },
            "tierBonus": {
              "amount": 20000,
              "rate": "2%",
              "tierName": "Bạc"
            }
          }
        },
        "reissueCount": 0,
        "reissue1": null,
        "reissue2": null,
        "note": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    },
    "summary": {
      "total": 50,
      "activated": 40,
      "used": 30,
      "pending": 10,
      "thisMonth": 5,
      "commission": {
        "pending": 5,
        "available": 20,
        "invalid": 3,
        "paid": 12
      }
    }
  }
}
```

### 8.2. Invalid Commission Example

```json
{
  "id": "MKTD-XYZ789",
  "customerName": "Trần Thị B",
  "customerPhone": "0987654321",
  "status": "Đã sử dụng",
  "invoiceInfo": {
    "invoiceId": "789012",
    "invoiceCode": "HD-002",
    "invoiceAmount": 500000,
    "invoiceStatus": "Hoàn thành",
    "invoiceDate": "2025-01-21T15:00:00Z"
  },
  "commissionStatus": "invalid",
  "invalidReasonCode": "CUSTOMER_NOT_NEW",
  "invalidReasonText": "Người sử dụng voucher là khách hàng cũ",
  "actualUserPhone": "0999888777",
  "actualUserName": "Lê Văn C",
  "actualCustomerType": "existing",
  "commissionInfo": null
}
```

---

## 9. Checklist triển khai

### 9.1. Database ✅
- [x] Table `affiliate.commission_settings` với data mặc định
- [x] Table `affiliate.f0_tiers` với 4 tier (Bronze, Silver, Gold, Diamond)
- [x] Table `affiliate.commission_records`
- [x] Columns commission trong `voucher_affiliate_tracking`
- [x] Views trong schema `api`

### 9.2. Edge Functions ✅
- [x] `webhook-affiliate-check-voucher-invoice` v4
  - [x] Validate invoice status = "Hoàn thành"
  - [x] Validate total = totalPayment
  - [x] Validate is_new_customer
  - [x] Calculate commission với 3 loại
  - [x] Save commission_records với snapshot
  - [x] Update voucher_affiliate_tracking
  - [x] Create notification

- [x] `get-f0-referral-history` v3
  - [x] Return commission info
  - [x] Return invalid reason

- [x] `get-f0-dashboard-stats` v10/v11
  - [x] Commission summary from commission_records

### 9.3. Frontend ✅
- [x] ReferralHistoryPage.tsx
  - [x] Updated Referral interface
  - [x] Display commission column
  - [x] Commission status badges
  - [x] Detail modal với đầy đủ info
  - [x] Invalid reason display
  - [x] Commission breakdown display

---

## 10. Testing scenarios

### Scenario 1: Valid commission - New customer
```
Input:
- Invoice status: "Hoàn thành"
- Invoice total: 1,000,000
- Invoice totalPayment: 1,000,000
- Actual user phone: Same as voucher recipient
- Voucher customer_type: "new"
- F0 tier: Silver

Expected:
- commission_status: "available"
- total_commission: 160,000đ (50k + 90k + 20k)
```

### Scenario 2: Invalid - Not fully paid
```
Input:
- Invoice status: "Hoàn thành"
- Invoice total: 1,000,000
- Invoice totalPayment: 500,000 (khách còn nợ 500k)

Expected:
- commission_status: "invalid"
- invalid_reason_code: "INVOICE_NOT_FULLY_PAID"
- invalid_reason_text: "Hóa đơn chưa thanh toán đủ (500,000/1,000,000)"
```

### Scenario 3: Invalid - Existing customer
```
Input:
- Invoice status: "Hoàn thành"
- Invoice total = totalPayment
- Actual user phone: Different from voucher recipient
- Actual user found in customers_backup (existing customer)

Expected:
- commission_status: "invalid"
- invalid_reason_code: "CUSTOMER_NOT_NEW"
- actual_user_phone: "0999..."
- actual_customer_type: "existing"
```

### Scenario 4: Invoice not completed
```
Input:
- Invoice status: "Đang xử lý"

Expected:
- commission_status: "invalid"
- invalid_reason_code: "INVOICE_NOT_COMPLETED"
```

---

## 11. Tính doanh thu F1 (Revenue) cho Tier

### 11.1. Quy tắc quan trọng

**Revenue F1 chỉ được tính khi:**
1. `statusvalue = "Hoàn thành"` (Invoice completed)
2. `total = totalpayment` (Thanh toán đủ 100%)

**Tại sao?**
- Doanh thu F1 dùng để xác định tier của F0
- Nếu tính invoice chưa thanh toán đủ → F0 lên tier không xứng đáng
- Khi khách thanh toán đủ → Revenue được cập nhật tự động

### 11.2. Edge Function `get-f0-dashboard-stats` v12

```javascript
// Query invoice payment status from kiotviet.invoices
const { data: invoices } = await supabaseKiotviet
  .from('invoices')
  .select('code, total, totalpayment, statusvalue')
  .in('code', invoiceCodes);

// Calculate revenue only from FULLY PAID invoices
for (const voucher of vouchersWithInvoices) {
  const invoice = invoiceMap.get(voucher.invoice_code);
  const total = Number(invoice.total) || 0;
  const totalPayment = Number(invoice.totalpayment) || 0;

  // CRITICAL: Only count if FULLY PAID
  if (total > 0 && total === totalPayment && invoice.statusvalue === 'Hoàn thành') {
    totalF1Revenue += total;
    fullyPaidInvoiceCount++;
  }
}
```

### 11.3. Edge Function `sync-invoice-commission` v3

Function để sync lại trạng thái commission khi invoice payment thay đổi.

**Request:**
```json
{
  "voucher_code": "E3XN86SLCO",  // Optional: sync 1 voucher
  "f0_id": "uuid",               // Optional: sync all vouchers of F0
  "force_recalc": false          // Force recalculate even if already calculated
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã sync 1 voucher (fallback)",
  "summary": {
    "total": 1,
    "created": 0,
    "updated": 0,
    "kept_pending": 1,
    "marked_invalid": 0,
    "skipped": 0,
    "errors": 0
  },
  "results": [{
    "voucher_code": "E3XN86SLCO",
    "invoice_code": "HD269472",
    "previous_status": "pending",
    "new_status": "pending",
    "action": "KEPT_PENDING_PARTIAL_PAYMENT",
    "reason": "Partial: 100/2,200,000đ"
  }]
}
```

**Actions:**
| Action | Điều kiện | Kết quả |
|--------|-----------|---------|
| `CREATED` | Đủ điều kiện + chưa có record | Tạo commission_records mới |
| `UPDATED` | Đủ điều kiện + force_recalc | Cập nhật commission_records |
| `KEPT_PENDING` | Invoice chưa "Hoàn thành" | Giữ pending |
| `KEPT_PENDING_PARTIAL_PAYMENT` | total != totalpayment | Giữ pending, chờ thanh toán đủ |
| `MARKED_INVALID` | Invoice "Hủy" hoặc customer not new | Đánh dấu invalid |
| `SKIPPED` | Đã có record và không force | Bỏ qua |

---

## 12. Realtime Update Flow

### 12.1. Khi khách thanh toán thêm

```
┌─────────────────────────────────────────────────────────────────┐
│ KiotViet: Nhân viên nhận tiền, cập nhật invoice                  │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ KiotViet gửi webhook invoice.update                              │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ webhook_invoices_backup_kiotviet                                 │
│ → Cập nhật kiotviet.invoices (total, totalpayment, status)      │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ webhook-affiliate-check-voucher-invoice                          │
│ → Nếu voucher affiliate: gọi sync-invoice-commission             │
│ → Check total = totalpayment                                     │
│ → Nếu đủ điều kiện → Tính commission                             │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2. Dashboard Stats realtime

- Mỗi lần load Dashboard, `get-f0-dashboard-stats` v12 query trực tiếp `kiotviet.invoices`
- Revenue F1 được tính chính xác từ `total = totalpayment`
- Tier được cập nhật dựa trên revenue thực tế

---

## 13. Invoice Cancellation Handling (v7)

### 13.1. Mốc chốt hoa hồng

| Commission Status | Hóa đơn bị hủy | Kết quả |
|-------------------|----------------|---------|
| `paid` | Sau khi đã thanh toán | ✅ Giữ nguyên hoa hồng, chỉ điều chỉnh thống kê F1/doanh số |
| `available` / `approved` | Trước khi thanh toán | ❌ Hủy hoa hồng, điều chỉnh thống kê F1/doanh số |

### 13.2. Database Schema mới

```sql
-- Columns thêm vào commission_records
invoice_cancelled_at TIMESTAMPTZ
invoice_cancelled_after_paid BOOLEAN
stats_adjusted BOOLEAN
stats_adjusted_at TIMESTAMPTZ

-- Bảng mới: commission_audit_log
-- Tracking đầy đủ mọi thay đổi với before/after snapshot

-- Bảng mới: f0_stats_adjustments
-- Tracking điều chỉnh F1 count và doanh số khi hóa đơn bị hủy
```

### 13.3. Flow xử lý khi hóa đơn bị hủy

```
Webhook nhận StatusValue = "Đã hủy" / "Cancelled"
                          ↓
        Tìm commission record theo invoice_code
                          ↓
              Check commission.status + paid_at
                          ↓
    ┌────────────────────┴────────────────────┐
    │                                         │
status='paid'                          status='available'/'approved'
paid_at != null                               │
    │                                         ▼
    ▼                               ┌─────────────────┐
┌─────────────────┐                 │ CANCEL         │
│ KEEP commission │                 │ commission     │
│ + Adjust stats  │                 │ + Adjust stats │
│ + Notify F0     │                 │ + Notify F0    │
└─────────────────┘                 └─────────────────┘
```

### 13.4. Stats Adjustments

Khi hóa đơn bị hủy:
- **F1 count**: Chỉ trừ nếu F1 không có đơn hàng khác hợp lệ
- **Revenue**: Luôn trừ doanh số của hóa đơn bị hủy
- **Commission**: Trừ nếu chưa paid, giữ nguyên nếu đã paid

### 13.5. Dashboard Stats v14

- Query `f0_stats_adjustments` để lấy tổng điều chỉnh
- Áp dụng adjustments vào F1 count và revenue trước khi tính tier
- Hiển thị cả raw và adjusted values cho transparency

---

*Document version: 1.2*
*Last updated: 2025-11-30*
*Changes: Added invoice cancellation handling (v7), audit log, stats adjustments*
