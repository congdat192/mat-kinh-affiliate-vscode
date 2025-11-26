# Mat Kinh Tam Duc - Affiliate Marketing System

Affiliate partner management system for Mat Kinh Tam Duc eyewear company.

## Overview

The system consists of 3 main modules:
- **Landing Pages**: Program introduction and partner recruitment
- **F0 System**: Dashboard and management for partners
- **Admin System**: Full system administration

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 7 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Routing | React Router v7 |
| Database | Supabase (PostgreSQL) |
| SMS OTP | Vihat |
| Email | Resend |
| Deployment | Vercel (planned) |

## Installation

```bash
# Clone repository
git clone https://github.com/congdat192/mat-kinh-affiliate-vscode.git
cd mat-kinh-affiliate-vscode

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create `.env` file:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=your_supabase_url

RESEND_API_KEY=your_resend_api_key
VIHAT_ENCRYPTION_KEY=your_vihat_key
KIOTVIET_ENCRYPTION_KEY=your_kiotviet_key
```

## Database Schema

### Schema: `affiliate`

#### Table: `f0_partners`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| phone | VARCHAR(15) | Phone (unique) |
| email | VARCHAR(255) | Email (unique) |
| full_name | VARCHAR(255) | Full name |
| password_hash | VARCHAR(255) | Hashed password |
| f0_code | VARCHAR(20) | Auto F0 code (F0-XXXX) |
| is_active | BOOLEAN | Account active status |
| is_approved | BOOLEAN | Approval status |
| created_at | TIMESTAMPTZ | Created date |
| approved_at | TIMESTAMPTZ | Approved date |
| approved_by | UUID | Approving admin |

## Authentication Flow

```
Register -> Send OTP (SMS) -> Verify OTP -> Save to DB -> Confirmation email
                                                              |
                                Login <- Notification email <- Admin approval
```

### Account Status

| is_active | is_approved | Result |
|-----------|-------------|--------|
| true | true | Normal usage |
| true | false | Pending approval |
| false | * | Account locked |

## Folder Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components
│   └── features/        # Feature components
├── pages/
│   ├── landing/         # Landing pages
│   ├── f0/              # F0 system pages
│   │   └── auth/        # Auth pages
│   └── admin/           # Admin pages
├── services/            # API services
├── lib/                 # Utils, constants
├── types/               # TypeScript types
└── hooks/               # Custom hooks
```

## Routes

### Landing
| Route | Page |
|-------|------|
| `/` | Homepage |
| `/affiliate-program` | Program info |
| `/claim-voucher` | Claim voucher |

### F0 Auth
| Route | Page |
|-------|------|
| `/f0/auth/login` | Login |
| `/f0/auth/signup` | Registration |
| `/f0/auth/otp` | OTP verification |
| `/f0/auth/forgot-password` | Forgot password |

### F0 System
| Route | Page |
|-------|------|
| `/f0/dashboard` | Dashboard |
| `/f0/create-link` | Create referral link |
| `/f0/refer-customer` | Refer customer |
| `/f0/referral-history` | Referral history |
| `/f0/withdrawal` | Withdrawal request |
| `/f0/profile` | Profile |
| `/f0/notifications` | Notifications |

### Admin System
| Route | Page |
|-------|------|
| `/admin/dashboard` | Dashboard |
| `/admin/partners` | Partner management |
| `/admin/customers` | Customer management |
| `/admin/orders` | Orders |
| `/admin/commissions` | Commissions |
| `/admin/withdrawals` | Withdrawal processing |
| `/admin/vouchers` | Vouchers |
| `/admin/campaigns` | Campaigns |
| `/admin/settings` | Settings |

## Commission System

| Tier | Customers/Quarter | First Order | Lifetime |
|------|-------------------|-------------|----------|
| Silver | 0-10 | 10% | 0% |
| Gold | 11-30 | 10% | 5% |
| Diamond | 31-50 | 10% | 8% |

## Roadmap

### Phase 1: Landing Pages ✅
- [x] Homepage
- [x] Affiliate Program page
- [x] Voucher page

### Phase 2: F0 System (In Progress)
- [x] Auth UI pages (Login, Signup, OTP, Forgot Password)
- [x] Dashboard UI
- [x] Profile, Notifications UI
- [ ] **Connect auth with Supabase**
- [ ] **Integrate Vihat SMS OTP**
- [ ] **Integrate Resend email**

### Phase 3: Admin System
- [x] Admin UI pages
- [ ] Partner approval workflow
- [ ] Commission management

### Phase 4: Backend Integration
- [x] Supabase project setup
- [x] Database schema `affiliate`
- [x] Table `f0_partners` with triggers
- [ ] Row Level Security (RLS)
- [ ] API integration

### Phase 5: Deployment
- [ ] Vercel deployment
- [ ] Domain configuration

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run preview      # Preview build
npm run lint         # ESLint
```

## Contributors

- Developer: AI-assisted development

## License

Private - Mat Kinh Tam Duc

---

**Status**: Phase 2 In Progress | Database Schema Created
