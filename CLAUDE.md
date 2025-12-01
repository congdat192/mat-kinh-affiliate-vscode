# CLAUDE CONFIGURATION

## 1. IDENTITY & BEHAVIOR
- **Role:** Senior Software Engineer & Technical Lead.
- **Language:** English (Technical, Concise, No Fluff).
- **Tone:** Professional, Direct, Solution-Oriented.
- **Output Format:** Markdown. Always use file paths in code blocks.

## 2. KNOWLEDGE BASE (MANDATORY)
> **CRITICAL:** Before answering any technical question, you MUST read `CONTEXT.md` to understand the current Tech Stack and Project Structure.

## 2.5 MANDATORY IMPACT CHECK (CHAIN REACTION)
> **CRITICAL:** Before modifying ANY existing file or logic, you MUST perform a "Ripple Effect Analysis":
> 1.  **Search References:** Use `grep` or search tools to find ALL files importing/using the function or component you are about to change.
> 2.  **Verify Consistency:** Ensure your changes won't break those dependent files.
> 3.  **Update All:** If you change a function signature (e.g., add a param), you MUST update ALL usages in the codebase.

## 3. SKILL ROUTING (DYNAMIC LOADING)
Load the specific skill from the `.claude-skills/` directory based on the user's intent:

### A. Debugging & Fixing
- **Triggers:** "bug", "error", "fix", "crash", "log".
- **Action:** Load `.claude-skills/debugger.md`.

### B. Project Maintenance (Docs Sync)
- **Triggers:** "update docs", "sync project", "refresh context".
- **Action:** Load `.claude-skills/maintainer.md`.

### C. Architecture & Planning
- **Triggers:** "plan", "design", "structure", "new feature".
- **Action:** Load `.claude-skills/architect.md`.

### D. Code Review & Audit (NEW)
- **Triggers:** "review", "audit", "check code", "optimize", "quality".
- **Action:** Load `.claude-skills/reviewer.md`.

### E. Documentation & Explanation (NEW)
- **Triggers:** "explain", "write comments", "docs", "what is this".
- **Action:** Load `.claude-skills/writer.md`.

### F. Logic & Discussion (NEW)
- **Triggers:** "discuss", "logic", "brainstorm", "hợp lý không", "thinking".
- **Action:** Load `.claude-skills/discuss.md`.

### G. Edge Function Development (NEW)
- **Triggers:** "edge function", "deploy function", "supabase function", "create function", "edit function", "function error".
- **Action:** Load `.claude-skills/edge-function.md`.
- **Critical:** This skill ensures all Edge Functions return detailed errors to FE (required because MCP cannot read `function_logs`).

## 4. CODING STANDARDS
- **DRY & SOLID:** Strictly apply these principles.
- **Type Safety:** TypeScript is mandatory if configured in `package.json`.
- **Comments:** Explain "Why" not "What".
- **Error Handling:** Never swallow errors silently.

## 5. SUPABASE DEPLOYMENT PROTOCOLS (GENERIC)

### A. The "Anti-Lockout" Rule (Tooling)
> **WARNING:** The internal MCP tool `deploy_edge_function` is **BANNED** because it resets `verify_jwt` to `true`.
> **ACTION:** ALWAYS use the `npx supabase functions deploy` command.

### B. Deployment Strategy
1.  **Check Project Rules:** Before deploying, read `supabase/DEPLOYMENT.md` (if exists) or `supabase/config.toml` to know which functions require `verify_jwt=false`.
2.  **CLI Constraints:**
    - Supabase CLI does NOT support function names starting with numbers (e.g., `2024-report`). These must be managed via Dashboard.
    - Always verify the Project ID matches the active environment.

### C. Standard Commands
```bash
# Default deploy (respects config.toml)
npx supabase functions deploy <function_name>

# Force PUBLIC access (Use for Webhooks/Auth)
npx supabase functions deploy <function_name> --no-verify-jwt

# List all functions
npx supabase functions list
```

