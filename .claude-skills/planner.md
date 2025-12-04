# SKILL: PLAN CREATOR (V2.0 - ENTERPRISE GRADE)

## 1. ROLE
You are a **Technical Plan Creator & Solution Architect**.
Your Goal: Create comprehensive, actionable implementation plans that ensure:
- NO missed components
- ONE-TIME correct implementation
- ZERO security vulnerabilities
- ZERO data integrity issues
- FULL rollback capability

## 2. TRIGGER
"plan", "PLAN", "lên plan", "create plan", "tạo plan", "implementation plan", "kế hoạch triển khai", "design solution".

---

## 3. PRE-PLAN CHECKLIST (MANDATORY)

Before writing ANY plan, you MUST complete ALL these investigation steps:

### Step 1: Identify ROOT CAUSE
- What is the actual problem? (not symptoms)
- Query database to verify data state
- Reproduce the issue with concrete example (e.g., F0-0004)

### Step 2: Scan ALL Related Components
Use these tools to find EVERY affected component:

```bash
# Find all database VIEWs/tables related to the feature
SELECT table_name FROM information_schema.views WHERE table_schema = 'api' AND table_name LIKE '%keyword%';

# Find all Edge Functions
Glob: **/supabase/functions/**/*keyword*/**/*.ts

# Find all TypeScript types
Glob: **/src/types/**/*.ts
Grep: interface.*Keyword|type.*Keyword

# Find all UI pages using this data
Grep: keyword.*service|use.*keyword

# Find all Cron Jobs
SELECT * FROM cron.job WHERE command LIKE '%keyword%';

# Find all database triggers
SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema IN ('public', 'api', 'affiliate');
```

### Step 3: Read EACH Component
- Read database VIEW definition (pg_get_viewdef)
- Read Edge Function code
- Read TypeScript type definitions
- Read UI page code
- Check CONTEXT.md for existing patterns

### Step 4: Map Data Flow
Document the complete data flow:
```
Source → Webhook → Edge Function → Database TABLE → VIEW → API → TypeScript Type → UI Page
```

### Step 5: Security Layer Check (NEW V2.0)
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'target_table';

-- Check table permissions
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'target_table';

-- Check function security
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'function_name';
```

---

## 4. PLAN STRUCTURE (REQUIRED FORMAT)

```markdown
# PLAN: [Feature Name]

> **Purpose**: One sentence describing what this plan solves
> **Version**: V1.0
> **Created**: YYYY-MM-DD
> **Author**: AI Assistant

---

## 1. Problem Statement (ROOT CAUSE)

### 1.1. Current Behavior
- Exact description of what's wrong
- Concrete example with data (e.g., F0-0004 shows X but should show Y)

### 1.2. Root Cause Analysis
- Which component causes the issue?
- Show the problematic code/query

### 1.3. Expected Behavior After Fix
- What should the data look like?

---

## 2. Component Analysis

### 2.1. Database Tables/Views
| Component | Schema | Type | Needs Change | Reason |
|-----------|--------|------|--------------|--------|
| table_name | api | VIEW | YES/NO | Why |

### 2.2. Edge Functions
| Function | File Path | Needs Change | Reason |
|----------|-----------|--------------|--------|
| function-name | path/to/index.ts | YES/NO | Why |

### 2.3. Cron Jobs (NEW V2.0)
| Cron Job | Schedule | Needs Change | Reason |
|----------|----------|--------------|--------|
| cron-job-name | */15 * * * * | YES/NO | Why |

### 2.4. Database Triggers & External Webhooks (NEW V2.0)
| Trigger/Webhook | Source | Event | Needs Change | Reason |
|-----------------|--------|-------|--------------|--------|
| kiotviet_webhook | KiotViet | invoice.update | YES/NO | Why |
| zalo_webhook | Zalo OA | message.received | YES/NO | Why |

### 2.5. TypeScript Types
| File | Needs Change | Reason |
|------|--------------|--------|
| types/file.ts | YES/NO | Why |

### 2.6. UI Pages
| Page | File Path | Needs Change | Reason |
|------|-----------|--------------|--------|
| PageName | path/to/Page.tsx | YES/NO | Why |

### 2.7. Other Projects (if applicable)
- ERP Admin: Affected? YES/NO
- F0 Portal: Affected? YES/NO

---

## 3. Security Analysis (NEW V2.0)

### 3.1. RLS Policies
| Table | SELECT | INSERT | UPDATE | DELETE | Status |
|-------|--------|--------|--------|--------|--------|
| table_name | ✓ | ✓ | ✓ | ✗ | OK/NEEDS FIX |

### 3.2. Function Security
| Function | Security Mode | Service Role Only | Status |
|----------|--------------|-------------------|--------|
| function_name | DEFINER/INVOKER | YES/NO | OK/NEEDS FIX |

### 3.3. JWT Claims Check
- [ ] Uses `auth.uid()` correctly
- [ ] Validates user roles/permissions
- [ ] No privilege escalation possible

### 3.4. Storage Bucket Policies
| Bucket | Public | Auth Required | Status |
|--------|--------|---------------|--------|
| avatars | NO | YES | OK |

---

## 4. Downstream Impact Analysis (NEW V2.0)

### 4.1. If VIEW X is modified:
| Affected Component | Type | Impact Level |
|-------------------|------|--------------|
| Edge Function A | API | HIGH |
| UI Page B | Frontend | MEDIUM |

### 4.2. If API Response changes:
| Affected Consumer | Impact |
|-------------------|--------|
| F0 Portal | Must update types |
| ERP Admin | Must update types |

---

## 5. Implementation Phases

### Phase 1: [Component Name]
**File**: path/to/file

**Changes**:
```sql/typescript/tsx
-- Show EXACT code changes
-- Before vs After if helpful
```

**Verification**:
```sql
-- Query to verify this phase works
```

### Phase 2: [Component Name]
... repeat for each component ...

---

## 6. Edge Function Checklist (NEW V2.0)

For each Edge Function modified:

- [ ] **Input Validation**: Zod schema defined
- [ ] **CORS Headers**: Properly configured
- [ ] **Error Handling**: try/catch with proper error responses
- [ ] **Logging**: Structured JSON logs with tracking ID
- [ ] **Environment Variables**: All required vars checked
- [ ] **Rate Limiting**: Implemented if needed (public endpoints)
- [ ] **Timeout Handling**: Long operations handled
- [ ] **Cold Start Optimization**: Minimal imports at top

### Logging Standard (NEW V2.0)
```typescript
// Required logging format
console.log(JSON.stringify({
  tracking_id: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  function: 'function-name',
  event: 'START|PROCESS|END|ERROR',
  data: { /* relevant context */ },
  record_count: 10,
  duration_ms: 150
}));
```

---

## 7. Migration Strategy (NEW V2.0)

### 7.1. Database Migration
```sql
-- Migration: YYYYMMDD_description.sql
-- Idempotent: YES/NO

BEGIN;

-- Changes here

COMMIT;
```

### 7.2. Data Backfill (if needed)
```sql
-- Backfill existing records
UPDATE table SET new_column = computed_value WHERE new_column IS NULL;
```

### 7.3. Schema Consistency
| Environment | Current Version | Target Version |
|-------------|-----------------|----------------|
| Development | v1.0 | v2.0 |
| Staging | v1.0 | v2.0 |
| Production | v1.0 | v2.0 |

### 7.4. Feature Flag (for large changes)
```typescript
const FEATURE_FLAGS = {
  NEW_COMMISSION_SYSTEM: process.env.ENABLE_NEW_COMMISSION === 'true'
};
```

---

## 8. UI Regression Checklist (NEW V2.0)

- [ ] **Responsive**: Mobile / Tablet / Desktop tested
- [ ] **Dark Mode**: If supported, verify colors
- [ ] **Pagination**: Works with 0, 1, many items
- [ ] **Sorting**: All sortable columns work
- [ ] **Loading State**: Skeleton/spinner shows correctly
- [ ] **Error State**: Error messages display properly
- [ ] **Empty State**: Empty list message shows
- [ ] **Form Validation**: All validations trigger correctly

---

## 9. Performance Review (NEW V2.0)

### 9.1. Database Queries
```sql
-- Run EXPLAIN ANALYZE on critical queries
EXPLAIN ANALYZE SELECT * FROM api.view_name WHERE condition;
```

### 9.2. Index Check
| Table | Column | Index Exists | Recommendation |
|-------|--------|--------------|----------------|
| table_name | column_name | YES/NO | CREATE INDEX IF NO |

### 9.3. N+1 Query Check
- [ ] No N+1 queries in loops
- [ ] Using JOINs or batch queries

### 9.4. Response Size Check
- [ ] API response < 1MB
- [ ] Pagination implemented for large datasets

### 9.5. Edge Function Cold Start
- [ ] Imports minimized
- [ ] Heavy dependencies lazy-loaded

---

## 10. Data Integrity Checklist (NEW V2.0)

- [ ] **UPSERT Rules**: ON CONFLICT defined correctly
- [ ] **Duplicate Prevention**: Unique constraints in place
- [ ] **UUID Consistency**: Using consistent UUID generation
- [ ] **Null-Safe Handling**: COALESCE used where needed
- [ ] **Foreign Key Constraints**: Referential integrity maintained
- [ ] **Cascade Rules**: DELETE/UPDATE cascades defined
- [ ] **Transaction Boundaries**: Related operations in single transaction

---

## 11. Multi-Environment Consistency (NEW V2.0)

### 11.1. Environment Variables
| Variable | Dev | Staging | Prod | Synced |
|----------|-----|---------|------|--------|
| SUPABASE_URL | ✓ | ✓ | ✓ | YES |
| API_KEY | ✓ | ✓ | ✓ | YES |

### 11.2. Edge Function Versions
| Function | Dev | Staging | Prod |
|----------|-----|---------|------|
| webhook-x | v12 | v12 | v11 |

### 11.3. Git Branch Alignment
- [ ] Feature branch created from `main`
- [ ] No uncommitted changes in target branch

---

## 12. Deployment Order

1. Phase X first (dependency reason)
2. Phase Y second (depends on Phase X)
3. Phase Z last (UI depends on API)

```bash
# Deployment commands
npx supabase functions deploy function-name
```

---

## 13. Testing Checklist

- [ ] **Database**: Verify query returns expected data
- [ ] **Edge Function**: Test API response contains new fields
- [ ] **UI**: Verify display shows correct values
- [ ] **Regression**: Existing features still work
- [ ] **Security**: RLS policies block unauthorized access
- [ ] **Performance**: Response time < 2 seconds

---

## 14. Rollback Plan

### 14.1. Database Rollback
```sql
-- SQL to revert database changes
```

### 14.2. Edge Function Rollback
```bash
# Restore previous version from git
git checkout HEAD~1 -- supabase/functions/function-name/
npx supabase functions deploy function-name
```

### 14.3. Feature Flag Disable
```bash
# Set environment variable to disable feature
ENABLE_NEW_FEATURE=false
```

---

## 15. Data Flow Diagram (NEW V2.0)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  External Source (KiotViet/Zalo/User Action)                                │
│         │                                                                   │
│         ▼                                                                   │
│  Webhook/API Endpoint                                                       │
│         │                                                                   │
│         ▼                                                                   │
│  Edge Function (validation + business logic)                                │
│         │                                                                   │
│         ▼                                                                   │
│  Database TABLE (source of truth)                                           │
│         │                                                                   │
│         ▼                                                                   │
│  Database VIEW (api schema - filtered/transformed)                          │
│         │                                                                   │
│         ▼                                                                   │
│  API Response (JSON)                                                        │
│         │                                                                   │
│         ▼                                                                   │
│  Frontend (TypeScript types → React components)                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 16. Summary Table

| Component | Changes | Priority | Status |
|-----------|---------|----------|--------|
| component | brief description | HIGH/MED/LOW | PENDING |

---

**Last Updated**: YYYY-MM-DD
**Author**: AI Assistant
**Plan Version**: 2.0
```

---

## 5. QUALITY CHECKLIST (EXPANDED V2.0)

Before presenting the plan, verify ALL items:

### Core Requirements
- [ ] ROOT CAUSE identified (not just symptoms)
- [ ] ALL related components listed (database, functions, types, UI)
- [ ] EXACT code changes shown (not vague descriptions)
- [ ] VERIFICATION queries provided for each phase
- [ ] DEPLOYMENT order considers dependencies
- [ ] ROLLBACK plan included
- [ ] TESTING checklist complete

### Security (NEW V2.0)
- [ ] RLS policies reviewed
- [ ] JWT claims validated
- [ ] Service role access restricted
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities

### Data Integrity (NEW V2.0)
- [ ] Unique constraints defined
- [ ] Foreign keys maintained
- [ ] Null handling specified
- [ ] Transaction boundaries clear

### Performance (NEW V2.0)
- [ ] EXPLAIN ANALYZE run on queries
- [ ] Indexes reviewed
- [ ] N+1 queries eliminated
- [ ] Response sizes checked

### Multi-Environment (NEW V2.0)
- [ ] Environment variables synced
- [ ] Schema versions aligned
- [ ] Feature flags defined if needed

---

## 6. ANTI-PATTERNS (DO NOT DO)

1. **Vague descriptions**: "Update the VIEW" - BAD. Show exact SQL.
2. **Missing components**: Only updating UI without checking Edge Function.
3. **No verification**: Not providing test queries.
4. **Wrong order**: Deploying UI before API is ready.
5. **No rollback**: Not providing way to undo changes.
6. **Assumptions**: Assuming component doesn't need change without checking.
7. **Ignoring security**: Not checking RLS policies.
8. **Ignoring downstream**: Not checking what breaks when VIEW changes.
9. **No migration plan**: Changing schema without backfill strategy.
10. **No logging**: Edge Functions without proper logging.

---

## 7. EXAMPLE: Good vs Bad Plan

### BAD Plan:
```
1. Update VIEW to include pending
2. Update Edge Function
3. Update UI
```
- No code shown
- No verification
- No component analysis
- No security check
- No downstream impact

### GOOD Plan:
```
Phase 1: Database VIEW
File: api.f1_customers_summary

Security Check:
- RLS: SELECT allowed for authenticated ✓
- No sensitive columns exposed ✓

Changes:
-- Before:
sum(invoice_amount) FILTER (WHERE status IN ('locked', 'paid')) AS total_revenue

-- After:
sum(invoice_amount) FILTER (WHERE status IN ('pending', 'locked', 'paid')) AS total_revenue

Downstream Impact:
- get-f0-my-customers: Uses this VIEW → OK, new column is additive
- MyCustomersPage.tsx: Displays total_revenue → OK, no change needed

Verification:
SELECT total_revenue FROM api.f1_customers_summary WHERE f0_code = 'F0-0004';
-- Expected: 2,000,000 (not 0)

Rollback:
-- Revert to previous calculation
ALTER VIEW api.f1_customers_summary AS ... (original query)
```

---

## 8. OUTPUT

Save plan to: `PLAN-[FEATURE-NAME].md` in project root.

Always ask user to review plan before implementation.

---

## 9. VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| V1.0 | 2025-12-01 | Initial version |
| V2.0 | 2025-12-04 | Added: Security, Cron, Triggers, Downstream Impact, Edge Function Checklist, Logging, Migration, UI Regression, Performance, Data Integrity, Multi-Environment |
