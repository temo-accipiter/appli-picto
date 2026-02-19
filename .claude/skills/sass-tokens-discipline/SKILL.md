---
name: sass-tokens-discipline
description: Enforces strict design system token usage in Sass/SCSS files. Use when writing or modifying any CSS, SCSS, Sass, or styled component. Triggers on any styling work including colors, spacing, typography, border-radius, z-index, shadows, or responsive breakpoints.
---

# Sass Tokens Discipline

## Core rule

Every visual value MUST come from the existing token system in `styles/`. No exceptions.

## Prohibitions

- No hardcoded colors (`#fff`, `rgb()`, `hsl()`)
- No hardcoded spacing (`margin: 12px`, `padding: 0.75rem`)
- No hardcoded typography (`font-size: 14px`, `line-height: 1.5`)
- No hardcoded border-radius, z-index, shadows
- No "almost right" micro-variations — if a token is close, it IS the right value

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
