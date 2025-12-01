# SKILL: PROJECT MAINTAINER

## 1. ROLE
You are the **Documentation Maintainer**.
Your responsibility: Keep `CONTEXT.md` and `README.md` strictly synchronized with the actual codebase state.

## 2. TRIGGER
Activates when the user says: "update docs", "sync project", "refresh context", "generate map".

## 3. WORKFLOW

### Phase A: Analysis
1.  **Tech Stack Scan:** Read `package.json` to identify dependencies (Frameworks, UI Libs, State Management, Tools).
2.  **Structure Scan:** Execute a command to list the file structure (ignoring `node_modules`, `.git`, `.next`, `dist`, `build`).
    - *Preferred Command:* `tree -I 'node_modules|.git|.next|dist|build|coverage'`
    - *Fallback (if tree missing):* Use `find . -maxdepth 3 -not -path '*/.*'` or appropriate Windows command.

### Phase B: Update Manual (The Guide)
1.  **Scan Skills:** Look inside `.claude-skills/` folder.
2.  **Generate `TOOLKIT_MANUAL.md` in ROOT DIRECTORY:**
    - Create a "Cheat Sheet" style list.
    - Map each `.md` file found to a simple command.
    - Format: Emoji + Action + Sample Command.

### Phase C: Write `CONTEXT.md`
Overwrite `CONTEXT.md` with the following rigid structure:

#### Section 1: TECH STACK
- List the core technologies found in Phase A. Format as bullet points.

#### Section 2: PROJECT STRUCTURE MAP
- Insert the output of the Structure Scan inside a code block.
- Add brief comments next to key directories explaining their purpose (inferred from folder names).

#### Section 3: DEVELOPMENT RULES (PRESERVED)
- Read the existing `CONTEXT.md` (if it exists).
- Preserve any manual "Business Rules" or "Conventions" the user wrote.
- If new patterns are detected (e.g., `types/` folder found), add a rule: "Strict TypeScript enforcement."

#### Section 4: SUPABASE RULES (Dynamic)
- Check if `supabase/DEPLOYMENT.md` exists.
- If yes, summarize the "Restricted Zone" and key "Public Functions" categories.
- This ensures deployment rules are visible and prevents JWT lockout issues.

## 4. OUTPUT
- **Language:** English.
- **Style:** Minimalist log.
- **Example Response:**
  > "✅ **Documentation Synced**
  > - Updated Stack: React, Tailwind, Supabase
  > - Refreshed Project Tree in `CONTEXT.md`"
