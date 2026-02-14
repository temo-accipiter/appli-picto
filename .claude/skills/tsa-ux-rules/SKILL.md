---
name: tsa-ux-rules
description: Enforces UX rules specific to children with autism spectrum conditions (TSA). Use when building or modifying any UI component, especially Tableau (child context), animations, transitions, error states, or feedback. Triggers on mentions of Tableau, child context, animations, transitions, reduced_motion, anti-choc, or any user-facing interaction design.
---

# TSA UX Rules

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

## Anti-choc (non-negotiable)

Structural changes (timeline edits, token changes, session reset via epoch++) apply **only at the next Chargement du Contexte Tableau** — never while the child is using the screen.

What triggers a Chargement: navigating to Tableau, changing active child, relaunching app, returning to foreground, explicit refresh.

What MUST NEVER happen: timeline rearranging live, progress disappearing, steps unchecking, popup about overwritten progress.

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

## Reference

Full details: see `FRONTEND_CONTRACT.md` §1.2, §1.3, §3.1, §4.3, §6.2, §8.1 (preferences).
