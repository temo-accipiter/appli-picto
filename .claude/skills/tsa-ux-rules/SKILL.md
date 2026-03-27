---
name: tsa-ux-rules
description: Enforces UX rules specific to children with autism spectrum conditions (TSA). Use when building or modifying any UI component, especially Tableau (child context), animations, transitions, error states, or feedback. Triggers on mentions of Tableau, child context, animations, transitions, reduced_motion, anti-choc, or any user-facing interaction design.
---

# TSA UX Rules

## 🔒 Iron Law

**NO TECHNICAL CONTENT IN TABLEAU CONTEXT**

The Tableau (child-facing interface) MUST NEVER display:
- Error messages (DB, network, validation)
- System state (loading, syncing, offline)
- Business logic (quotas, subscription, conflicts)
- Technical terms or developer jargon

This is non-negotiable. If something fails in Tableau, show a **neutral screen** or **no change**. Never explain why.

**Why**: Children with autism need **predictable, calm, emotionally neutral** interfaces. Technical noise creates anxiety and cognitive overload.

---

## Two contexts — never mix

- **Édition (adult)**: system messages, errors, network state, quotas allowed
- **Tableau (child)**: NOTHING technical — no errors, no network, no quotas, no loading spinners for sync

## Tableau golden rule

The Tableau context is **emotionally neutral**. If something fails, show a neutral screen. Never show:

- DB errors, SQL codes, technical messages
- Network state (offline, syncing)
- Conflict or merge messages
- Quotas, paywall, subscription
- Sync-related loading indicators

---

## 🚨 Red Flags (automatic detection in Tableau components)

If you see ANY of these in a Tableau component, **STOP immediately** and refactor:

```tsx
// ❌ Error messages in Tableau
{error && <div>Erreur: {error.message}</div>}
{!data && <p>Échec du chargement</p>}

// ❌ System state visible to child
{isLoading && <Spinner />}
{isSyncing && <p>Synchronisation...</p>}
{isOffline && <NetworkBanner />}

// ❌ Business logic visible
{remainingQuota === 0 && <PaywallModal />}
{!canEdit && <p>Abonnement requis</p>}

// ❌ Technical terms
<button>Rafraîchir les données</button>
<p>Session non validée</p>

// ❌ Negative feedback
<p>Tu n'as pas gagné de récompense</p>
<p>Essaie encore</p>
```

**Action**: Replace with neutral UI or no UI. Errors → silent fallback. Loading → show last known state or nothing.

---

## Anti-choc (non-negotiable)

Structural changes (timeline edits, token changes, session reset via epoch++) apply **only at the next Chargement du Contexte Tableau** — never while the child is using the screen.

What triggers a Chargement: navigating to Tableau, changing active child, relaunching app, returning to foreground, explicit refresh.

What MUST NEVER happen: timeline rearranging live, progress disappearing, steps unchecking, popup about overwritten progress.

---

## ✅ Checklist Pattern (validate before showing UI to child)

Before deploying ANY Tableau component, verify:

**Context Detection**
- [ ] Component correctly detects Tableau vs Édition context
- [ ] Error states render differently per context
- [ ] Loading states suppressed in Tableau (or use last known state)

**Content Validation**
- [ ] Zero technical terms visible to child
- [ ] Zero error messages, network state, quotas
- [ ] All feedback is positive or neutral (never negative)
- [ ] Text uses child-appropriate language

**Interaction Validation**
- [ ] Touch targets ≥ 44×44px
- [ ] One-hand usable on tablet/phone
- [ ] No surprise animations or visual changes
- [ ] Respects `prefers-reduced-motion`

**Anti-Choc Validation**
- [ ] Structural changes deferred to next Chargement
- [ ] No live timeline/progress changes while child viewing
- [ ] No popups about data conflicts or overwrites

**Manual Test**
- [ ] Test with `reduced_motion = true`
- [ ] Test with `confetti_enabled = false`
- [ ] Simulate error state → neutral UI shown
- [ ] Simulate slow network → no loading spinner

**Only ship to production if ALL checks pass.**

---

## Animations & motion

- All non-essential animations OFF when `reduced_motion = true`
- Confetti requires `confetti_enabled = true` AND `reduced_motion = false`
- Transitions under 0.3 seconds
- No surprise visual changes

## Feedback rules

- **No negative feedback** — ever. No "failure", no "you didn't earn your reward"
- Session completed with no reward card → neutral/positive feedback (not "no reward")
- Reinforcement is always positive or absent

## Cognitive load

- One-hand usable (Tableau and mini-timeline)
- Large touch targets, stable positions
- Short text, no jargon, no technical terms for children
- Predictable: same action → same result, always

---

## 🧠 Rationalization Table (common excuses → counter-arguments)

| Excuse | Why it's wrong | Correct approach |
|--------|----------------|------------------|
| "It's just a small error message, won't scare them" | ANY technical content creates anxiety. Non-negotiable. | Show neutral screen or no change. |
| "I'll hide it with an accordion, they won't see it" | Children explore. Hidden ≠ safe. | Remove completely from Tableau context. |
| "Parents need to see quotas, I'll add it to Tableau" | Tableau = child context. Parents use Édition. | Add quota UI to Édition only. |
| "Loading spinner is better than blank screen" | Spinner = "something is wrong". Creates anxiety. | Show last known state or static placeholder. |
| "I'll use friendly language for errors" | Friendly error = still an error. Still technical. | No errors in Tableau. Silent graceful degradation. |
| "Just this one animation, it's cute" | Cute to adults ≠ comfortable for TSA children. | Test with `prefers-reduced-motion`. Respect setting. |
| "They need feedback when validation fails" | Negative feedback = harmful for TSA motivation. | Show neutral state or positive reinforcement for attempts. |

**Remember**: TSA UX is about **removing noise, not softening it**. If you're debating whether something is "too technical", it is.

---

## Reference

Full details: see `FRONTEND_CONTRACT.md` §1.2, §1.3, §3.1, §4.3, §6.2, §8.1 (preferences).
