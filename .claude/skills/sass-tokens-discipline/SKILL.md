---
name: sass-tokens-discipline
description: Enforces strict design system token usage in Sass/SCSS files. Use when writing or modifying any CSS, SCSS, Sass, or styled component. Triggers on any styling work including colors, spacing, typography, border-radius, z-index, shadows, or responsive breakpoints.
---

# Sass Tokens Discipline

## 🔒 Iron Law

**NO HARDCODED VALUES IN SCSS**

Every color, spacing, typography, radius, shadow, z-index MUST use a design token from `styles/`. Period.

This applies to:
- New components
- Component modifications
- Quick fixes
- Prototypes
- "Temporary" workarounds

**Why**: Design consistency, accessibility (contrast, touch targets), maintenance, and scalability depend on token discipline. One hardcoded value creates drift.

---

## Core rule

Every visual value MUST come from the existing token system in `styles/`. No exceptions.

## Prohibitions

- No hardcoded colors (`#fff`, `rgb()`, `hsl()`)
- No hardcoded spacing (`margin: 12px`, `padding: 0.75rem`)
- No hardcoded typography (`font-size: 14px`, `line-height: 1.5`)
- No hardcoded border-radius, z-index, shadows
- No "almost right" micro-variations — if a token is close, it IS the right value

---

## 🚨 Red Flags (automatic detection)

If you see ANY of these patterns in SCSS code, **STOP immediately** and refactor:

```scss
// ❌ Hardcoded colors
color: #3498db;
background: rgb(255, 255, 255);
border-color: hsl(210, 50%, 50%);

// ❌ Hardcoded spacing
margin: 16px;
padding: 0.5rem 1rem;
gap: 12px;

// ❌ Hardcoded typography
font-size: 18px;
line-height: 1.6;
letter-spacing: 0.05em;

// ❌ Hardcoded visual properties
border-radius: 8px;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
z-index: 999;

// ❌ Magic numbers
width: calc(100% - 48px);  // What is 48px?
transform: translateY(-3px);  // Why -3px?
```

**Action**: Replace with appropriate token or mixin from `styles/`. Run `pnpm lint:hardcoded` to detect violations.

---

## ✅ Gate Functions (validation before writing styles)

Before writing ANY style property, ask yourself:

1. **Is there a token for this value?**
   - Check `styles/tokens/` for the property type
   - Check existing components for similar usage

2. **Is there a mixin/function for this pattern?**
   - Responsive breakpoints → use mixin
   - Common patterns (card, button) → check `styles/mixins/`

3. **Am I trying to create a micro-variation?**
   - "16px is close to 18px" → Use 18px token
   - "This blue is slightly different" → Use existing blue

4. **Would this value need to change for accessibility?**
   - Touch targets, contrast, motion → MUST use tokens
   - These values are accessibility-critical

**Only write the style if all 4 questions pass.**

---

## When a value seems missing

If no existing token fits:

1. **Stop** — do not invent a value
2. **Signal explicitly** that a new token is needed
3. **Explain** why no existing token works
4. **Describe**: token type, exact usage, UX impact
5. **Wait** for the user to add it to the token system

Never add a token yourself. Never use a magic number as placeholder.

## Quick reference

Before writing any style, check these files in `styles/`:

- Token files (colors, spacing, typography, motion, etc.)
- Wrapper functions/mixins
- Existing component patterns for similar UI

Reuse existing patterns. Adapt components to tokens, never tokens to components.

---

## 🧠 Rationalization Table (common excuses → counter-arguments)

| Excuse | Why it's wrong | Correct approach |
|--------|----------------|------------------|
| "It's just a temporary value for prototyping" | Prototypes become production. Refactoring = technical debt. | Prototype with tokens. Same effort, zero debt. |
| "The token is close but not exact (16px vs 18px)" | Creates visual inconsistency. Breaks design system. | Use the existing token. Close = exact. |
| "I'll add the token later when I have time" | Never happens. Value spreads to other components. | Stop now. Signal needed token. Wait for user. |
| "This component is unique, doesn't need tokens" | Every "unique" component shares colors, spacing, motion. | Use tokens. Uniqueness = layout, not values. |
| "Calculating with tokens is harder (calc())" | Hardcoded calc() hides intent. Not maintainable. | Use token-based calc or request new token. |
| "Nobody will notice this one hardcoded value" | Automated lint WILL catch it. Sets bad precedent. | Use token. Discipline = every value, every time. |

**Remember**: Token discipline is binary. 99% compliant = 100% broken. One exception breaks the system.

---

## 📚 Progressive Disclosure (learning levels)

### Level 1: Débutant
- **What**: Always use tokens from `styles/tokens/`
- **How**: Search existing tokens before writing ANY value
- **Check**: Run `pnpm lint:hardcoded` before commit

### Level 2: Intermédiaire
- **What**: Understand token categories (semantic vs primitive)
- **How**: Use semantic tokens (e.g., `color-text-primary`) over primitives (e.g., `color-gray-900`)
- **Check**: Verify token usage matches UX intent (not just visual match)

### Level 3: Avancé
- **What**: Know when to request new tokens vs adapt design
- **How**: Recognize patterns → micro-variation = use existing, new use case = request token
- **Check**: Review token impact on entire design system before requesting

**Start at Level 1. Master it before moving to Level 2.**
