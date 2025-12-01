# SUPABASE DEPLOYMENT RULES (PROJECT SPECIFIC)

## 1. ENVIRONMENT
- **Project ID:** `kcirpjxbjqagrqrjfldu`
- **CLI Version:** v2.63.1
- **Config File:** `supabase/config.toml`

## 2. JWT CONFIGURATION (Access Control)

The following functions MUST have `verify_jwt=false` (Public Access):

### Auth & Onboarding
- `login-affiliate`
- `send-otp-affiliate`
- `verify-otp-affiliate`
- `forgot-password-affiliate`
- `reset-password-affiliate`

### Vouchers
- `claim-voucher`
- `check-voucher-eligibility`
- `activate-voucher`
- `voucher-history-customer`

### Webhooks (All)
- `webhook-check-voucher-invoice`
- `webhook-affiliate-check-voucher-invoice`
- `kiotviet-webhook-customers`
- `kiotviet-webhook-invoices`
- `vihat-otp-webhook`
- All functions starting with `webhook-*` or `webhook_*`

### Stats & Dashboard
- `get-f0-dashboard-stats`
- `get-f0-referral-history`
- `manage-withdrawal-request`
- `manage-notifications`

### Internal Functions (All)
- All functions ending with `-internal`
- Examples: `claim-voucher-internal`, `check-voucher-eligibility-internal`

### Customer APIs
- `customer-by-phone`
- `customer-family-members`
- `invoices-history-customer`

## 3. RESTRICTED ZONE (Manual Deploy Only)

These functions have numeric names and **CANNOT** be deployed via CLI:

| Function | Status | Manage Via |
|----------|--------|------------|
| `2018` | Active | Dashboard |
| `2019` | Active | Dashboard |
| `2020` | Active | Dashboard |
| `2021` | Active | Dashboard |
| `2022` | Active | Dashboard |
| `2023` | Active | Dashboard |
| `2024` | Active | Dashboard |
| `2025` | Active | Dashboard |

## 4. DEPLOYMENT COMMANDS

```bash
# Link project (first time only)
npx supabase link --project-ref kcirpjxbjqagrqrjfldu

# Deploy single function (uses config.toml)
npx supabase functions deploy <function-name>

# Deploy with explicit no-jwt
npx supabase functions deploy <function-name> --no-verify-jwt

# List all functions
npx supabase functions list
```

## 5. NOTES

- All JWT settings are managed in `supabase/config.toml`
- After deploying via CLI, JWT settings from config.toml are applied automatically
- Functions `Vietnam-timezone` and `otp-backup-chuan` intentionally have `verify_jwt=true` (backup/reference only)

## 6. ERROR HANDLING (CRITICAL)

> **See:** `.claude-skills/edge-function.md` for detailed patterns.

**TL;DR:** Edge Functions MUST return detailed errors to FE because MCP tools cannot read `function_logs` (console.log/error).

```typescript
// Every DB/API operation must return errors, not just log them
if (insertError) {
  return errorResponse('Lỗi database', 'DATABASE_ERROR', 500, {
    code: insertError.code,
    message: insertError.message,
    details: insertError.details
  });
}
```
