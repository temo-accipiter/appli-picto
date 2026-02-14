---
name: three-systems-separation
description: Prevents conceptual fusion between the three core therapeutic systems. Use when working on timelines, slots, tokens, sessions, sequences, or any feature that touches the planning, token economy, or sequencing systems. Triggers on mentions of timeline, slot, token, jeton, sequence, step, session, validation, or progression.
---

# Three Core Systems — Never Fuse

## The systems

| System | DB tables | Tableau (child) | Édition (adult) |
|--------|-----------|-----------------|-----------------|
| **Visual planning** | `timelines`, `slots` | Full timeline display | CRUD timeline/slots |
| **Token economy** | `slots.tokens` (0..5, kind=step) | Visual count + token grid | Modify tokens per slot |
| **Sequencing** | `sequences`, `sequence_steps` | Mini-timeline "done" (local-only) | CRUD sequences/steps |

## Rules

- **Distinct naming**: never call a sequence a "timeline" or tokens "points" or steps "slots"
- **Distinct screens**: each system has its own UI area — never merge them into a shared component
- **Distinct state**: planning state ≠ token state ≠ sequencing state — never derive one from another
- **Distinct persistence**: planning = DB-authoritative, tokens = DB (slot column), sequencing "done" = local-only

## Common traps to avoid

- Mixing "slot validation" (planning) with "step done" (sequencing) — they are different
- Using token count to drive planning progression — tokens are reward, not progress
- Treating sequence steps as timeline slots — sequences are sub-steps of a single card
- Sharing components between systems without clear separation

## Reference

Full details: see `FRONTEND_CONTRACT.md` Annexe C.
