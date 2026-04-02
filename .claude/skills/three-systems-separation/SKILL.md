---
name: three-systems-separation
description: Prevents mixing the three core systems (Planning/Token economy/Sequencing). Use when building or modifying features involving timelines, sessions, or sequences. Triggers on mentions of timeline, slot, token, session, sequence, step, validation, or progression.
---

# Three Core Systems — Never Fuse

## 🔒 Iron Law

**NO MIXING THE THREE SYSTEMS**

Planning, Token Economy, and Sequencing are **architecturally separate** and MUST remain so.

This means:

- Separate DB tables
- Separate hooks
- Separate UI components
- Separate state management
- Separate naming conventions

Mixing these systems creates architectural collapse. They serve distinct therapeutic purposes and must be treated as independent subsystems.

**Why**: Each system has different persistence rules, validation logic, and UX patterns. Fusion creates bugs, confusion, and therapeutic misalignment.

---

## The systems

| System              | DB tables                        | Tableau (child)                   | Édition (adult)        |
| ------------------- | -------------------------------- | --------------------------------- | ---------------------- |
| **Visual planning** | `timelines`, `slots`             | Full timeline display             | CRUD timeline/slots    |
| **Token economy**   | `slots.tokens` (0..5, kind=step) | Visual count + token grid         | Modify tokens per slot |
| **Sequencing**      | `sequences`, `sequence_steps`    | Mini-timeline "done" (local-only) | CRUD sequences/steps   |

## When to use each system

- **Planning** → Adult edits the day structure (what tasks, in what order)
- **Token economy** → Child earns rewards by completing tasks
- **Sequencing** → Child follows step-by-step guidance for a single task

Each system serves a distinct therapeutic purpose — never merge their concepts or UI.

---

## 🚨 Red Flags (system boundary violations)

If you see ANY of these patterns, **STOP immediately** and refactor:

```typescript
// ❌ Mixing Planning + Token Economy
const canAddSlot = remainingTokens > 0  // Tokens don't control planning

// ❌ Mixing Planning + Sequencing
const nextSlot = getNextSequenceStep()  // Slots ≠ Steps

// ❌ Mixing Token Economy + Sequencing
const earnedTokens = completedSteps.length  // Steps don't earn tokens, slots do

// ❌ Deriving one system's state from another
const sequenceProgress = slots.filter(s => s.tokens > 0).length

// ❌ Shared components without separation
<ProgressBar items={slotsOrStepsOrSessions} />  // Which system?

// ❌ Wrong table/hook usage
useSlots() inside sequence editor  // Wrong system
useSequenceSteps() inside timeline display  // Wrong system

// ❌ Terminology mixing
"Timeline steps" (should be "slots")
"Sequence slots" (should be "steps")
"Points earned" (should be "tokens")
```

**Action**: Use correct hook/table/component for the system you're working in. Never cross boundaries.

---

## Rules

- **Distinct naming**: never call a sequence a "timeline" or tokens "points" or steps "slots"
- **Distinct screens**: each system has its own UI area — never merge them into a shared component
- **Distinct state**: planning state ≠ token state ≠ sequencing state — never derive one from another
- **Distinct persistence**: planning = DB-authoritative, tokens = DB (slot column), sequencing "done" = local-only

---

## ✅ Boundary Validation (before working on any system)

Before writing code for Planning, Token Economy, or Sequencing, ask:

1. **Which system am I modifying?**
   - Planning → work with `timelines`, `slots`, `useTimelines()`, `useSlots()`
   - Token Economy → work with `slots.tokens`, token grid UI
   - Sequencing → work with `sequences`, `sequence_steps`, `useSequences()`, `useSequenceSteps()`

2. **Am I accidentally referencing another system?**
   - Check imports — do they match the system?
   - Check state — am I deriving from the wrong tables?
   - Check UI — am I sharing components across systems?

3. **Is my terminology correct for this system?**
   - Planning: timeline, slot, position
   - Token Economy: tokens, kind (step/reward), earned
   - Sequencing: sequence, step, done (local)

4. **Am I respecting persistence rules?**
   - Planning → DB-authoritative (RLS)
   - Tokens → DB column (`slots.tokens`)
   - Sequencing "done" → Local-only (IndexedDB, no DB writes)

**Only proceed if all 4 questions confirm you're working within ONE system.**

---

## Common traps to avoid

- Mixing "slot validation" (planning) with "step done" (sequencing) — they are different
- Using token count to drive planning progression — tokens are reward, not progress
- Treating sequence steps as timeline slots — sequences are sub-steps of a single card
- Sharing components between systems without clear separation

---

## 🧠 Rationalization Table (common excuses → counter-arguments)

| Excuse                                                        | Why it's wrong                                                 | Correct approach                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| "Steps and slots are similar, I'll reuse the component"       | Different persistence, different validation, different UX.     | Create separate components. Abstract shared UI only.        |
| "Token count drives progression, makes sense to derive state" | Tokens = reward, not progress. Creates logic coupling.         | Planning progression is independent. Tokens are decorative. |
| "I'll just add a `type` prop to handle both systems"          | Type-switching = hidden coupling. Hard to maintain.            | Separate components per system. Explicit boundaries.        |
| "Sequences are just sub-timelines, same concept"              | Sequences = local-only, single task. Timelines = DB, full day. | Never treat sequences as timelines. Different rules.        |
| "I'll check `if (isSequence)` to branch behavior"             | Conditional logic = system leakage. Violates separation.       | Use correct hook/component from start. No branching.        |
| "Sharing state saves memory"                                  | Premature optimization. Creates architectural debt.            | Each system has its own state. Memory is cheap.             |

**Remember**: System separation is architectural integrity. Shortcuts create technical debt that compounds over time.

---

## Reference

Full details: see [FRONTEND_CONTRACT.md](../../../docs/refonte_front/FRONTEND_CONTRACT.md) Annexe C.
