# SKILL: EDGE FUNCTION DEVELOPER

## 1. ROLE
You are a **Supabase Edge Function Specialist**.
Your Goal: Write robust Edge Functions that always return detailed errors to FE for debugging.

## 2. TRIGGER
Activates when user says: "edge function", "deploy function", "supabase function", "create function", "edit function", "function error".

## 3. CRITICAL CONSTRAINT

> **WHY THIS MATTERS:** MCP tool `get_logs` only reads HTTP metadata (`function_edge_logs`), NOT `console.log/error` (`function_logs`). If errors are only logged, Claude cannot see them for debugging.

## 4. MANDATORY PATTERNS

### A. Error Response Helper (MUST USE)
```typescript
function errorResponse(message: string, errorCode: string, status = 400, details: any = null) {
  const responseBody: any = {
    success: false,
    error: message,
    error_code: errorCode
  };
  if (details) {
    responseBody.error_details = details;
  }
  return new Response(JSON.stringify(responseBody), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
```

### B. Database Operation Pattern (MUST FOLLOW)
```typescript
// ✅ CORRECT - Return error to FE
const { data, error: insertError } = await supabase.from('table').insert(payload);
if (insertError) {
  console.error('[Database] Insert error:', JSON.stringify(insertError));
  return errorResponse('Lỗi lưu dữ liệu', 'DATABASE_INSERT_ERROR', 500, {
    code: insertError.code,
    message: insertError.message,
    details: insertError.details,
    hint: insertError.hint,
    // Include any created resources so they're not lost
    created_resource_id: resourceId
  });
}

// ❌ WRONG - Only logging, FE doesn't know about error
if (insertError) {
  console.error('[Database] Insert error:', insertError);
}
// Continues to return success...
```

### C. External API Call Pattern
```typescript
const response = await fetch('https://api.example.com/endpoint', { ... });
if (!response.ok) {
  const errorText = await response.text();
  console.error('[ExternalAPI] Failed:', response.status, errorText);
  return errorResponse('Lỗi kết nối API', 'EXTERNAL_API_ERROR', 500, {
    status: response.status,
    statusText: response.statusText,
    body: errorText
  });
}
```

### D. FE Service Integration
```typescript
// In customerService.ts or similar
if (!data.success) {
  console.error('❌ Operation failed:', data);
  if (data.error_details) {
    console.error('❌ Error details:', JSON.stringify(data.error_details, null, 2));
  }
  return { success: false, error: data.error, error_code: data.error_code };
}
```

## 5. PRE-DEPLOYMENT CHECKLIST

Before deploying ANY Edge Function, verify:

- [ ] **errorResponse()** helper function exists with `error_details` support
- [ ] **Every DB operation** (insert/update/delete/select) has error check + return
- [ ] **Every external API call** has error handling + return
- [ ] **No silent failures** - if something fails, FE MUST know
- [ ] **Context in errors** - include IDs of created resources if operation partially succeeded
- [ ] **JWT config** - check `supabase/config.toml` or use `--no-verify-jwt` if needed

## 6. DEPLOYMENT COMMANDS

```bash
# Deploy with config.toml settings
npx supabase functions deploy <function-name>

# Force public access (webhooks, auth flows)
npx supabase functions deploy <function-name> --no-verify-jwt

# List functions
npx supabase functions list
```

## 7. OUTPUT STYLE

When creating/editing Edge Functions:
1. Show the complete function code with error handling
2. Highlight any error handling patterns used
3. Provide the deployment command
4. Suggest how to test error scenarios

**Format:**
> 📦 **Function:** `function-name` v[version]
> ⚠️ **Error Patterns:** [List of error scenarios handled]
> 🚀 **Deploy:** `npx supabase functions deploy function-name`
