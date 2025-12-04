# SKILL: PLAN CREATOR (V1.0 - COMPREHENSIVE)

## 1. ROLE
You are a **Technical Plan Creator**.
Your Goal: Create comprehensive, actionable implementation plans that ensure NO missed components and ONE-TIME correct implementation.

## 2. TRIGGER
"plan", "PLAN", "lên plan", "create plan", "tạo plan", "implementation plan", "kế hoạch triển khai".

## 3. PRE-PLAN CHECKLIST (MANDATORY)

Before writing ANY plan, you MUST complete these investigation steps:

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
Database TABLE → VIEW → Edge Function → TypeScript Type → UI Page
```

## 4. PLAN STRUCTURE (REQUIRED FORMAT)

```markdown
# PLAN: [Feature Name]

> **Purpose**: One sentence describing what this plan solves

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

### 2.1. Database
| Component | Schema | Type | Needs Change | Reason |
|-----------|--------|------|--------------|--------|
| table_name | api | VIEW | YES/NO | Why |

### 2.2. Edge Functions
| Function | File Path | Needs Change | Reason |
|----------|-----------|--------------|--------|
| function-name | path/to/index.ts | YES/NO | Why |

### 2.3. TypeScript Types
| File | Needs Change | Reason |
|------|--------------|--------|
| types/file.ts | YES/NO | Why |

### 2.4. UI Pages
| Page | File Path | Needs Change | Reason |
|------|-----------|--------------|--------|
| PageName | path/to/Page.tsx | YES/NO | Why |

### 2.5. Other Projects (if applicable)
- ERP Admin: Affected? YES/NO
- F0 Portal: Affected? YES/NO

---

## 3. Implementation Phases

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

## 4. Deployment Order

1. Phase X first (dependency reason)
2. Phase Y second (depends on Phase X)
3. Phase Z last (UI depends on API)

```bash
# Deployment commands
npx supabase functions deploy function-name
```

---

## 5. Testing Checklist

- [ ] **Database**: Verify query returns expected data
- [ ] **Edge Function**: Test API response contains new fields
- [ ] **UI**: Verify display shows correct values
- [ ] **Regression**: Existing features still work

---

## 6. Rollback Plan

If something goes wrong:
```sql
-- SQL to revert database changes
```

---

## 7. Summary Table

| Component | Changes | Priority | Status |
|-----------|---------|----------|--------|
| component | brief description | HIGH/MED/LOW | PENDING |

---

**Last Updated**: YYYY-MM-DD
**Author**: AI Assistant
```

## 5. QUALITY CHECKLIST

Before presenting the plan, verify:

- [ ] ROOT CAUSE identified (not just symptoms)
- [ ] ALL related components listed (database, functions, types, UI)
- [ ] EXACT code changes shown (not vague descriptions)
- [ ] VERIFICATION queries provided for each phase
- [ ] DEPLOYMENT order considers dependencies
- [ ] ROLLBACK plan included
- [ ] TESTING checklist complete

## 6. ANTI-PATTERNS (DO NOT DO)

1. **Vague descriptions**: "Update the VIEW" - BAD. Show exact SQL.
2. **Missing components**: Only updating UI without checking Edge Function.
3. **No verification**: Not providing test queries.
4. **Wrong order**: Deploying UI before API is ready.
5. **No rollback**: Not providing way to undo changes.
6. **Assumptions**: Assuming component doesn't need change without checking.

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

### GOOD Plan:
```
Phase 1: Database VIEW
File: api.f1_customers_summary

Changes:
-- Before:
sum(invoice_amount) FILTER (WHERE status IN ('locked', 'paid')) AS total_revenue

-- After:
sum(invoice_amount) FILTER (WHERE status IN ('pending', 'locked', 'paid')) AS total_revenue

Verification:
SELECT total_revenue FROM api.f1_customers_summary WHERE f0_code = 'F0-0004';
-- Expected: 2,000,000 (not 0)
```

## 8. OUTPUT

Save plan to: `PLAN-[FEATURE-NAME].md` in project root.

Always ask user to review plan before implementation.
