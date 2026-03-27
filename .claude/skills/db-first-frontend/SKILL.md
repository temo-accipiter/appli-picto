---
name: db-first-frontend
description: Enforces DB-first architecture rules for Supabase frontend code. Use when writing hooks, queries, or components that interact with the database. Triggers on mentions of Supabase, RLS, hooks, or database operations.
---

# DB-First Frontend Rules

## 🔒 Iron Law

**NO DIRECT SUPABASE QUERIES WITHOUT HOOKS**

Every database interaction MUST go through a custom hook from `src/hooks/`. Period.

This is not negotiable, has no exceptions, and applies to all contexts:

- Components (Server or Client)
- API routes
- Utilities
- Edge Functions client code

**Why**: Hooks encapsulate RLS expectations, error handling, and TypeScript contracts. Direct queries bypass these guarantees.

---

## Core principle

The frontend is a **strict client** of the Supabase DB. It reads what the DB authorizes, executes writes best-effort, and handles refusals gracefully. The DB is the single source of truth for all authorization and business logic.

## Absolute prohibitions

- **No `service_role`** in client code — ever
- **No RBAC** — no `user.role`, `hasPermission`, `checkAccess`, or permission matrices
- **No business logic** — quotas, status transitions, epoch management, anti-abuse timezone are all DB-enforced
- **No RLS bypass** — never filter client-side as authorization ("I'll just hide it in the UI")
- **No invented fields/tables** — if it's not in the migrations, it doesn't exist
- **No direct writes** to platform tables (`subscriptions`, `consent_events`, `admin_audit_log`) — use Edge Functions

---

## 🚨 Red Flags (automatic detection)

If you see ANY of these patterns in frontend code, **STOP immediately** and refactor:

```typescript
// ❌ Direct Supabase query without hook
const { data } = await supabase.from('tasks').select()

// ❌ Client-side authorization logic
if (user.role === 'admin') { ... }
if (account.status === 'subscriber' && canEdit) { ... }

// ❌ Business logic calculations
const remainingQuota = MAX_TASKS - userTasks.length
const canCreate = currentEpoch < maxEpoch

// ❌ service_role usage
const supabase = createClient(url, SERVICE_ROLE_KEY)

// ❌ RLS bypass attempts
.select('*, secret_field')  // "I'll just not display it"
```

**Action**: Replace with appropriate hook from `src/hooks/` or create a new one if missing.

---

## `accounts.status` usage

`accounts.status` (`free` | `subscriber` | `admin`) is read for **display only**:

- Show/hide UI elements (buttons, modals)
- Display PersonalizationModal with correct wording
- Adapt navigation

It is **never** used as authorization. If a button is visible by mistake and the user clicks, the DB refuses and the frontend handles it.

---

## ✅ Gate Functions (validation before acting)

Before writing ANY database interaction code, ask yourself:

1. **Is there already a hook for this?**
   - Check `src/hooks/` first
   - Check `src/hooks/CLAUDE.md` for inventory

2. **Does this operation require authorization?**
   - If yes → RLS policy must exist in migrations
   - If no policy exists → create migration FIRST

3. **Am I trying to enforce a rule?**
   - If yes → move logic to RLS policy or Edge Function
   - Frontend NEVER enforces, only displays outcomes

4. **Am I calculating business values?**
   - Quotas, limits, eligibility → DB-side
   - Display formatting, UI state → Frontend OK

**Only proceed if all 4 questions pass.**

---

## Error handling pattern

```
1. Client attempts Supabase operation
2. DB evaluates RLS policy
3. If authorized → operation succeeds
4. If refused → error returned to client
5. Frontend displays context-appropriate state:
   - Édition: explicit non-technical message
   - Tableau: neutral screen (NEVER technical)
```

## `validated_at` rule

`session_validations.validated_at` is **audit-only**. Never use it in any frontend logic (sorting, filtering, duration calculation, display).

## Visitor

Visitor is **local-only** — no DB row exists. No `accounts.status = 'visitor'`. Data in IndexedDB only. Only allowed DB call: read published bank cards.

---

## 🧠 Rationalization Table (common excuses → counter-arguments)

| Excuse                                          | Why it's wrong                                                 | Correct approach                                      |
| ----------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| "It's just a quick read, no need for a hook"    | Bypasses error handling, TypeScript contract, RLS expectations | Always use hook. Create one if missing (5 min)        |
| "I'll check `account.status` first, then query" | Frontend check ≠ authorization. User can bypass.               | Let RLS refuse. Handle error gracefully.              |
| "This field is read-only, safe to select"       | RLS may hide it. Direct select breaks contract.                | Use hook with explicit TypeScript return type.        |
| "I need `service_role` for admin features"      | Admin = user with `admin` status. Still uses RLS.              | Admin RLS policies grant access. Never bypass.        |
| "Calculating quota client-side is faster"       | Creates race conditions, inconsistent state.                   | DB calculates via RLS or function. Frontend displays. |
| "Just this once for prototyping"                | Prototype becomes production. Technical debt.                  | Prototype with hooks. Refactor effort = same.         |

**Remember**: Every shortcut creates a future bug, security hole, or architectural violation. DB-first is non-negotiable because it's the ONLY pattern that scales safely.

---

## Reference

For complete contract details and edge cases, see [FRONTEND_CONTRACT.md](../../FRONTEND_CONTRACT.md):

- **§0.3** : Core principles and architecture
- **§1.6, §5.1, §5.2** : Authorization patterns and RLS
- **Annexe B** : Error handling examples
