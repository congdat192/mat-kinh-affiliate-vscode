# TOOLKIT MANUAL - Quick Reference

## Available Skills

| Action | Command | Description |
|--------|---------|-------------|
| 🔧 Debug | `claude "fix bug in..."` | Debug errors & fix issues |
| 📐 Architect | `claude "plan feature..."` | Design new features |
| 🔄 Sync Docs | `claude "sync project"` | Update CONTEXT.md & docs |
| 📝 Review | `claude "review code..."` | Code review & audit |
| 📖 Document | `claude "explain..."` | Write docs & comments |
| 💡 Discuss | `claude "discuss logic..."` | Brainstorm & analyze |

## Common Commands

```bash
# Development
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # Run ESLint

# Supabase CLI
npx supabase login                    # Login to Supabase
npx supabase link --project-ref ID    # Link project
npx supabase functions list           # List all functions
npx supabase functions deploy NAME    # Deploy function (uses config.toml)
npx supabase functions deploy NAME --no-verify-jwt  # Force public access
```

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI configuration & routing rules |
| `CONTEXT.md` | Tech stack & project structure |
| `supabase/DEPLOYMENT.md` | Edge Function deployment rules |
| `supabase/config.toml` | JWT settings for all functions |

## Database Schema

Always use schema `api` for queries:
```typescript
const supabase = createClient(url, key, { db: { schema: 'api' } });
```
