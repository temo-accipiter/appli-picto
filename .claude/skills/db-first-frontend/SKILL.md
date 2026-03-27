---
name: db-first-frontend
description: Enforces DB-first architecture rules for Supabase frontend code. Use when writing hooks, queries, or components that interact with the database. Triggers on mentions of Supabase, RLS, hooks, or database operations.
---

# DB-First Frontend Rules

## Core principle

The frontend is a **strict client** of the Supabase DB. It reads what the DB authorizes, executes writes best-effort, and handles refusals gracefully. The DB is the single source of truth for all authorization and business logic.

## Absolute prohibitions

- **No `service_role`** in client code — ever
- **No RBAC** — no `user.role`, `hasPermission`, `checkAccess`, or permission matrices
- **No business logic** — quotas, status transitions, epoch management, anti-abuse timezone are all DB-enforced
- **No RLS bypass** — never filter client-side as authorization ("I'll just hide it in the UI")
- **No invented fields/tables** — if it's not in the migrations, it doesn't exist
- **No direct writes** to platform tables (`subscriptions`, `consent_events`, `admin_audit_log`) — use Edge Functions

## `accounts.status` usage

`accounts.status` (`free` | `subscriber` | `admin`) is read for **display only**:

- Show/hide UI elements (buttons, modals)
- Display PersonalizationModal with correct wording
- Adapt navigation

It is **never** used as authorization. If a button is visible by mistake and the user clicks, the DB refuses and the frontend handles it.

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

## Reference

For complete contract details and edge cases, see [FRONTEND_CONTRACT.md](../../FRONTEND_CONTRACT.md):
- **§0.3** : Core principles and architecture
- **§1.6, §5.1, §5.2** : Authorization patterns and RLS
- **Annexe B** : Error handling examples
