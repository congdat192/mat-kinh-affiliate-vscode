# CONTEXT.md - ERP System Technical Context

> **Purpose:** Quick reference for AI assistants to understand project structure, tech stack, and architecture.
> **Updated:** 2025-12-02

---

## 1. Project Overview

**Name:** ERP-FE-fresh
**Type:** Enterprise Resource Planning System
**Language:** Vietnamese UI, English code
**Dev Server:** http://localhost:8080

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI Framework |
| TypeScript | 5.5.3 | Type Safety |
| Vite | 5.4.1 | Build Tool (SWC) |
| React Router | 6.26.2 | Routing |
| TanStack Query | 5.56.2 | Server State |

### UI & Styling
| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 3.4.11 | Styling |
| shadcn/ui | - | Component Library |
| Radix UI | Various | Primitives |
| Lucide React | 0.462.0 | Icons |

### Backend & Database
| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | 2.74.0 | BaaS |
| PostgreSQL | 13.0.5 | Database |
| Deno | - | Edge Functions |

### Forms & Validation
| Technology | Version | Purpose |
|------------|---------|---------|
| React Hook Form | 7.53.0 | Form Management |
| Zod | 3.23.8 | Schema Validation |

### Utilities
| Technology | Version | Purpose |
|------------|---------|---------|
| date-fns | 3.6.0 | Date Manipulation |
| Recharts | 2.12.7 | Charts |
| ReactFlow | 11.11.4 | Workflow Visualization |
| XLSX | 0.18.5 | Excel Import/Export |
| html2canvas | 1.4.1 | Screenshot Export |
| QRCode | 1.5.3 | QR Generation |

---

## 3. Project Structure

```
d:\ERP-FE-fresh/
├── src/
│   ├── modules/              # 9 Business Modules
│   │   ├── marketing/        # Voucher, Lens, CSKH
│   │   ├── customer/         # Customer & Family
│   │   ├── hr/               # HR, Payroll, Training
│   │   ├── crm/              # Pipeline, Booking
│   │   ├── accounting/       # Cash Book, Debt
│   │   ├── sales/            # Sales Operations
│   │   ├── inventory/        # Stock Management
│   │   ├── user-management/  # Users, Roles
│   │   └── affiliate/        # F0 Partner Admin
│   ├── components/
│   │   ├── ui/               # 40+ shadcn components
│   │   ├── layout/           # ERPLayout, Sidebar
│   │   ├── auth/             # AuthContext, Guards
│   │   └── theme/            # ThemeProvider
│   ├── integrations/
│   │   └── supabase/         # Client & Types
│   ├── services/             # Global Services
│   ├── hooks/                # Custom Hooks
│   ├── types/                # Global Types
│   ├── lib/                  # Utilities
│   └── App.tsx               # Main Router
├── supabase/
│   ├── functions/            # 33 Edge Functions
│   └── migrations/           # DB Migrations
└── package.json
```

### Module Structure Pattern
```
src/modules/[module-name]/
├── pages/           # Page components
├── components/      # Module components
├── services/        # API/business logic
├── types/           # TypeScript interfaces
├── hooks/           # Module hooks
└── utils/           # Helpers
```

---

## 4. Database Schema Architecture

### Multi-Schema Design

```
┌──────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMAS                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌───────────────────────┐  │
│  │  public  │    │   api    │    │     supabaseapi       │  │
│  │ (tables) │    │ (views)  │    │  (sensitive data)     │  │
│  │          │    │ (RPCs)   │    │                       │  │
│  └──────────┘    └──────────┘    └───────────────────────┘  │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌───────────────────────┐  │
│  │ vouchers │    │ kiotviet │    │      affiliate        │  │
│  │(internal)│    │ (sync)   │    │  (F0 campaigns)       │  │
│  └──────────┘    └──────────┘    └───────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Schema Access Rules

| Schema | FE Access | Edge Function | Purpose |
|--------|-----------|---------------|---------|
| `public` | ✅ Yes | ✅ Yes | General tables |
| `api` | ✅ Yes (GRANT) | ✅ Yes | Views, RPCs |
| `supabaseapi` | ❌ No | ❌ (use RPC) | Encrypted credentials |
| `vouchers` | ❌ No | ❌ No | Internal voucher data |
| `kiotviet` | ❌ No | ❌ No | KiotViet sync data |
| `affiliate` | ❌ No | ❌ (use RPC) | F0 campaign data |

### Key Tables

**Public Schema:**
- `profiles`, `roles`, `user_roles`, `role_permissions`
- `employees`, `employee_payrolls`, `employee_documents`
- `training_programs`, `training_sessions`, `training_quizzes`
- `voucher_campaigns`, `voucher_templates`
- `lens_products`, `lens_product_attributes`

**API Schema (Views):**
- `voucher_tracking` - Voucher usage with invoice data
- `campaign_settings` - Marketing campaign config
- `affiliate_campaign_settings` - F0 affiliate campaigns
- `kiotviet_credentials` - KiotViet connection status
- `vihat_credentials` - Vihat connection status
- `f0_partners` - F0 partner registration

**Supabaseapi Schema (Sensitive):**
- `integration_credentials` - Encrypted API credentials
- `integration_tokens` - OAuth tokens

**Affiliate Schema:**
- `campaign_settings` - F0 campaign management

### Key RPC Functions

| Function | Schema | Purpose |
|----------|--------|---------|
| `get_user_profile_simple()` | api | User + role + features |
| `save_kiotviet_credentials()` | api | Save encrypted KiotViet creds |
| `save_vihat_credentials()` | api | Save encrypted Vihat creds |
| `get_kiotviet_credential()` | api | Get creds with secret (SECURITY DEFINER) |
| `get_cskh_users()` | api | Get CSKH users for dropdown (bypasses RLS) |
| `insert_affiliate_campaign_settings()` | api | Create F0 campaign |
| `update_affiliate_campaign_settings()` | api | Update F0 campaign |
| `delete_affiliate_campaign_settings()` | api | Delete F0 campaign |

---

## 5. Edge Functions (33 Functions)

### Authentication
- `send-employee-otp`, `verify-employee-otp`
- `send-password-reset-email`
- `create-user-account`, `delete-user`
- `send-new-user-credentials`

### Customer
- `get-customer-by-phone`
- `customer-family-members` (modular)
- `validate-customer-external`
- `check-type-customer`
- `get-invoices-by-phone`

### Voucher
- `create-and-release-voucher-internal`
- `reissue-voucher-internal`
- `claim-voucher`, `check-voucher-eligibility`
- `list-voucher-tracking`
- `voucher-history-customer`
- `cleanup-voucher-images`

### Integrations
- `save-kiotviet-token` - KiotViet OAuth
- `kiotviet-sync` - Product sync
- `save-vihat-credentials` - Vihat API credentials
- `save-resend-credentials` - Resend API key
- `send-zns-vihat` - Zalo notification

### HR
- `auto-update-competency`
- `generate-course-recommendations`
- `approve-document-request`
- `approve-change-request`
- `validate-employee-email`

### Webhooks
- `webhook-check-voucher-invoice` - KiotViet invoice webhook

---

## 6. Integrations

### KiotViet (POS System)
```
Flow: OAuth2 → Token Storage → API Sync
├── Credentials: AES-256-GCM encrypted
├── Tokens: integration_tokens table
├── Sync: Products, Categories, Inventory
└── Webhook: Invoice → voucher_tracking
```

### Vihat (eSMS.vn - ZNS)
```
Flow: API Key + Secret → Direct API
├── Credentials: AES-256-GCM encrypted
├── No OAuth (API Key/Secret only)
└── Use: Send Zalo notifications
```

### Resend (Email)
```
Flow: API Key → Send Email
├── Credentials: AES-256-GCM encrypted
├── Key in Secrets: RESEND_API_KEY (encryption key)
├── Sender: erp-admin@matkinhtamduc.com
└── Uses: Welcome email, OTP, Notifications
```

### Encryption Pattern
```typescript
// Each integration has its own encryption key in Supabase Secrets
KIOTVIET_ENCRYPTION_KEY  // For KiotViet
VIHAT_ENCRYPTION_KEY     // For Vihat
RESEND_API_KEY           // For Resend (confusing name - it's encryption key)

// Encryption: AES-256-GCM (32-byte key, base64 encoded)
```

---

## 7. Authentication & Authorization

### Auth Flow
```
Login → Supabase Auth → get_user_profile_simple() RPC
                              ↓
                     { user, role, features }
                              ↓
                     localStorage cache (24h)
```

### Permission Checking
```typescript
const { hasFeatureAccess, hasModuleAccess, roleLevel } = usePermissions();

// Feature-level
if (hasFeatureAccess('issue_vouchers')) { ... }

// Module-level
if (hasModuleAccess('marketing')) { ... }

// Role-level bypass (Owner=1, Admin=2)
if (roleLevel <= 2) { ... }
```

### Role Levels
| Level | Role | Bypass |
|-------|------|--------|
| 1 | Owner | All |
| 2 | Admin | Most |
| null | Others | None |

---

## 8. Key Patterns

### Service Layer
```typescript
// Prefer direct Supabase queries
const { data } = await supabase
  .schema('api')
  .from('voucher_tracking')
  .select('*');

// Edge Functions only for:
// - Complex business logic
// - External API calls
// - Elevated permissions
```

### Form Validation
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Bắt buộc')
});

const form = useForm({
  resolver: zodResolver(schema)
});
```

### Error Handling
```typescript
// Frontend
try {
  await service.doSomething();
  toast({ title: 'Thành công' });
} catch (err: any) {
  toast({
    title: 'Lỗi',
    description: err.message,
    variant: 'destructive'
  });
}

// Edge Function
return new Response(
  JSON.stringify({ success: false, message: 'Lỗi nghiệp vụ' }),
  { status: 400, headers: corsHeaders }
);
```

### Timezone Handling
```typescript
// Always use Vietnam timezone (UTC+7)
import { getVietnamTime, toVietnamISOString } from './vietnam-time';

const now = getVietnamTime();
const isoString = toVietnamISOString(now);
```

---

## 9. Common Commands

```bash
# Development
npm run dev              # Start dev server (port 8080)
npm run build            # Production build

# Supabase
npx supabase login
npx supabase functions deploy <name>
npx supabase functions deploy <name> --no-verify-jwt
npx supabase db push     # Run migrations

# Git
git status
git add .
git commit -m "feat: Description"
git push origin main
```

---

## 10. File Locations Quick Reference

| Type | Location |
|------|----------|
| Module pages | `src/modules/[module]/pages/` |
| Module services | `src/modules/[module]/services/` |
| UI components | `src/components/ui/` |
| Global services | `src/services/` |
| Global hooks | `src/hooks/` |
| Supabase types | `src/integrations/supabase/types.ts` |
| Edge Functions | `supabase/functions/[name]/` |
| Migrations | `supabase/migrations/` |

---

## 11. Affiliate Module Structure

### Admin Pages (ERP)
```
src/modules/affiliate/
├── pages/
│   ├── AffiliateDashboard.tsx      # Overview stats
│   ├── F0ApprovalPage.tsx          # Approve F0 partners
│   ├── CampaignManagementPage.tsx  # Manage campaigns
│   ├── ReferralManagementPage.tsx  # View referrals
│   ├── WithdrawalManagementPage.tsx# Process withdrawals
│   ├── ActivityLogPage.tsx         # Activity history
│   └── ReportsPage.tsx             # Reports/export
├── services/
│   ├── f0PartnerService.ts         # F0 partner CRUD
│   └── affiliateCampaignService.ts # Campaign CRUD
└── types/
    └── index.ts                    # F0Partner, AffiliateCampaign
```

### F0 Portal (Separate Project)
- Dùng chung database với ERP
- Query `api.affiliate_campaign_settings` với `is_active = true`
- F0 partner login via `api.f0_partners`

---

## 12. Important Notes

### Schema Access
```typescript
// ✅ CORRECT
const { data } = await supabase
  .schema('api')
  .from('campaign_settings')
  .select('*');

// ❌ WRONG - Cannot access custom schema directly
const { data } = await supabase
  .schema('supabaseapi')  // ERROR!
  .from('integration_credentials');
```

### Edge Function Schema Restriction
```typescript
// Edge Functions can ONLY use: 'api' or 'public'
// For sensitive data, use RPC with SECURITY DEFINER

const { data } = await supabase
  .schema('api')
  .rpc('get_kiotviet_credential');
```

### Marketing vs Affiliate Campaigns
```
api.campaign_settings           → CSKH Marketing (voucher issuance)
affiliate.campaign_settings     → F0 Affiliate (partner referrals)

Completely separate! Different purposes, different tables.
```

---

**Maintainer:** Development Team
**Version:** 1.0.0
