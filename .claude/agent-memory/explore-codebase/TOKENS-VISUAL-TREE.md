# TOKENS VISUAL TREE — Appli-Picto

**Diagrammes visuels de la hiérarchie des tokens.**

---

## 🏗️ ARCHITECTURE 3-NIVEAUX

```
                    ┌─────────────────────────────────┐
                    │  LEVEL 3: WRAPPERS              │
                    │  (API publique avec fallback)   │
                    │                                 │
                    │  spacing($key)                  │
                    │  ├─ $spacing-semantic (1)       │
                    │  ├─ $spacing-primitives (2)     │
                    │  └─ $spacing-tokens legacy (3)  │
                    │                                 │
                    │  color(), text(), surface()     │
                    │  semantic(), radius(), etc.     │
                    └──────────────┬──────────────────┘
                                   ↑
                    ┌─────────────────────────────────┐
                    │  LEVEL 2: SEMANTICS (Phase 6)   │
                    │  Noms métier → intentions       │
                    │                                 │
                    │  $color-semantic-text:          │
                    │  ├─ 'primary' → #1e293b         │
                    │  ├─ 'secondary' → #475569       │
                    │  └─ 'tertiary' → #94a3b8        │
                    │                                 │
                    │  $spacing-semantic:             │
                    │  ├─ 'card-padding' → 24px       │
                    │  ├─ 'modal-padding' → 32px      │
                    │  └─ 'button-padding-y' → 8px    │
                    │                                 │
                    │  $radius-semantic:              │
                    │  ├─ 'card' → 12px               │
                    │  ├─ 'button' → 6px              │
                    │  └─ 'modal' → 20px              │
                    │                                 │
                    │  Tous référencent Level 1       │
                    │  (jamais hardcodé)              │
                    └──────────────┬──────────────────┘
                                   ↑
                    ┌─────────────────────────────────┐
                    │  LEVEL 1: PRIMITIVES (Phase 6)  │
                    │  Valeurs brutes harmonisées     │
                    │                                 │
                    │  $palettes-primitives:          │
                    │  ├─ 'neutral': {                │
                    │  │  ├─ 0: #ffffff               │
                    │  │  ├─ 50: #f8fafc              │
                    │  │  ├─ 800: #1e293b             │
                    │  │  └─ 900: #0f172a             │
                    │  ├─ 'brand': {                  │
                    │  │  ├─ 500: #667eea (ADMIN)     │
                    │  │  └─ 700: #4c5ac4             │
                    │  ├─ 'success': { ... }          │
                    │  ├─ 'warning': { ... }          │
                    │  ├─ 'error': { ... }            │
                    │  └─ 'info': { ... }             │
                    │                                 │
                    │  @function palette($pal, $s)   │
                    │  → #color value                 │
                    │                                 │
                    │  $spacing-primitives:           │
                    │  ├─ 'xs': 4px                   │
                    │  ├─ 'sm': 8px                   │
                    │  ├─ 'md': 16px                  │
                    │  ├─ 'lg': 24px                  │
                    │  └─ '44': 44px (touch)          │
                    │                                 │
                    │  (+ Grille 4px stricte)         │
                    │                                 │
                    │  $radius-primitives:            │
                    │  ├─ 'sm': 6px (TSA)             │
                    │  ├─ 'md': 12px (TSA)            │
                    │  └─ 'lg': 20px (adouci)         │
                    │                                 │
                    │  (+ Font sizes, shadows, etc)   │
                    └──────────────┬──────────────────┘
                                   ↑
                    ┌─────────────────────────────────┐
                    │  LEVEL 0: CANONICAL _tokens.scss│
                    │  SOURCE DE VÉRITÉ UNIQUE        │
                    │  (Legacy + maps de base)        │
                    │                                 │
                    │  $role-color-tokens             │
                    │  $blue-palette-tokens           │
                    │  $red-palette-tokens            │
                    │  $spacing-tokens                │
                    │  $size-tokens                   │
                    │  $radius-tokens                 │
                    │  $shadow-tokens                 │
                    │  $font-size-tokens              │
                    │  $motion-tokens                 │
                    │  $z-index-tokens                │
                    │  $a11y-tokens                   │
                    └─────────────────────────────────┘

Flux: Canonical → Primitives → Semantics → Wrappers → Composants
```

---

## 🌊 FLOW: COMPOSANT UTILISE TOKEN

```
.button {
  padding: spacing('button-padding-y');
}

     ↓

spacing('button-padding-y')  [WRAPPER]
     ↓
  Is 'button-padding-y' in $spacing-semantic?
     ↓ YES
  map.get($spacing-semantic, 'button-padding-y')
     ↓
  $spacing-semantic['button-padding-y']
     = map.get(p.$spacing-primitives, 'sm')
     ↓
  $spacing-primitives['sm']
     = 0.5rem
     ↓
  8px  ← Valeur finale CSS
```

---

## 🎨 COLORS HIERARCHY

```
                    COMPOSANT
                        ↓
        text('primary')  |  surface('bg')  |  semantic('error', 'light')
                ↓        |        ↓        |        ↓
        ┌───────────────────────────────────────────────┐
        │  Wrapper Functions (_colors.scss)             │
        │  ├─ text() → $color-semantic-text             │
        │  ├─ surface() → $color-semantic-surface       │
        │  └─ semantic() → $color-semantic-feedback     │
        └────────────┬────────────────────────────────┘
                     ↓
        ┌───────────────────────────────────────────────┐
        │  Semantics (_semantics.scss)                  │
        │  $color-semantic-text:                        │
        │  ├─ 'primary': palette('neutral', 800)        │
        │  ├─ 'secondary': palette('neutral', 600)      │
        │  └─ ...                                       │
        │                                               │
        │  $color-semantic-surface:                     │
        │  ├─ 'bg': palette('neutral', 0)               │
        │  ├─ 'page': palette('neutral', 50)            │
        │  └─ ...                                       │
        │                                               │
        │  $color-semantic-feedback:                    │
        │  ├─ 'error-light': palette('error', 100)      │
        │  ├─ 'success-base': palette('success', 500)   │
        │  └─ ...                                       │
        └────────────┬────────────────────────────────┘
                     ↓
        ┌───────────────────────────────────────────────┐
        │  Primitives (_primitives.scss)                │
        │  $palettes-primitives: (                      │
        │    'neutral': (                               │
        │      0: #ffffff,                              │
        │      50: #f8fafc,                             │
        │      800: #1e293b,  ← 'primary' text          │
        │      900: #0f172a   ← 'dark' text             │
        │    ),                                         │
        │    'error': (                                 │
        │      100: #fee2e2,  ← 'error-light' bg        │
        │      500: #ef4444,  ← 'error-base'            │
        │      700: #b91c1c                             │
        │    )                                          │
        │  )                                            │
        └────────────┬────────────────────────────────┘
                     ↓
        ┌───────────────────────────────────────────────┐
        │  Canonical (_tokens.scss)                     │
        │  Palettes color legacy                        │
        │  (fallback si Phase 6 manquant)               │
        └───────────────────────────────────────────────┘

Exemple: text('primary') retourne #1e293b (texte sombre)
```

---

## 📏 SPACING HIERARCHY

```
                    COMPOSANT
                        ↓
                padding: spacing('md')
                        ↓
        ┌───────────────────────────────────┐
        │  spacing() Wrapper                │
        │                                   │
        │  1. Search $spacing-semantic      │
        │     (Phase 6 - noms métier)       │
        │                                   │
        │  2. If absent → search            │
        │     $spacing-primitives           │
        │     (Phase 6 - grille 4px)        │
        │                                   │
        │  3. If absent → search            │
        │     $spacing-tokens legacy        │
        │     (Phase 5 - fallback)          │
        │                                   │
        │  4. If absent → ERROR             │
        └────────────┬────────────────────┘
                     ↓
        spacing('md') found in primitives?
                YES
                     ↓
        $spacing-primitives['md'] = 1rem = 16px
                     ↓
                   16px ← final value
```

---

## 🔴 SEMANTIC vs PRIMITIVE SPACING

```
SEMANTIC (Noms métier)          PRIMITIVE (Grille 4px)
─────────────────────────       ─────────────────────
spacing('card-padding')         spacing('md')
  24px                            16px
  ↓ Contexte: card               ↓ Générique: grille
  Sémantique!                    Valeur brute!

spacing('modal-padding')        spacing('lg')
  32px                            24px
  ↓ Contexte: modal              ↓ Générique: grille
  Sémantique!                    Valeur brute!

spacing('button-padding-y')     spacing('sm')
  8px                             8px
  ↓ Contexte: button             ↓ Générique: grille
  Sémantique!                    Valeur brute!

spacing('page-padding')         spacing('1'), spacing('2'), spacing('4'), ...
  32px                            Grille 4px stricte
  ↓ Contexte: page               0.0625rem → 16.25rem

✅ Utiliser SEMANTIC quand possible (auto-documenté)
✅ Fallback PRIMITIVE si sémantique absent
✅ JAMAIS hardcoder (ex: padding: 16px)
```

---

## 🎯 COMPOSANT → TOKEN FLOW

```
Button Component (React)
├─ styles: ButtonDelete.scss
│
└─→ padding: spacing('button-padding-y');
      ↓
      spacing() function (_spacing.scss)
      ├─ Cherche 'button-padding-y' dans $spacing-semantic
      │  ✅ Trouvé = 8px (0.5rem)
      │  Retourne 0.5rem
      │
      └─→ CSS Généré:
          padding: 0.5rem;  // 8px @ 16px base
```

---

## 🌓 THEME SWITCHING

```
Light Theme (défaut)
┌──────────────────────┐
│ :root {              │
│ --color-text: #1e293b│  ← text('primary') light
│ --color-bg: #ffffff │  ← surface('bg') light
│ --color-success: ... │
│ }                    │
└──────────────────────┘

Dark Theme
┌──────────────────────┐
│ @media (prefers-color-scheme: dark) { │
│   :root {                              │
│   --color-text: #f8fafc    ← invert!  │
│   --color-bg: #0f172a      ← dark     │
│   --color-success: ...     ← adjusted │
│   }                                    │
│ }                                      │
│                                        │
│ [data-theme="dark"] {                  │
│   /* Explicit override */             │
│ }                                      │
└────────────────────────────────────────┘

CSS vars générées dans:
- _light.scss → :root + @media light + [data-theme=light]
- _dark.scss → @media dark + [data-theme=dark]
```

---

## 📱 RESPONSIVE BREAKPOINTS

```
Mobile-First Layout
═════════════════════════════════════════════════════════════

320px ─────────────────────────────────────────────→ ∞
│
BASE (Mobile)         Tablette          Desktop    Large
├─ width: 100%        ├─ width: 90%     ├─ max: ──→ ├─→ ∞
├─ padding: 8px       ├─ padding: 16px  │           │
└─ cols: 1            └─ cols: 2        └─ cols: 3  │
                                                    └→


CSS Pattern:
.component {
  /* Base (320px-575px) */
  padding: spacing('sm');  // 8px
  display: grid;
  grid-template-columns: 1fr;

  /* Tablette (576px+) */
  @include respond-to('sm') {
    padding: spacing('md');  // 16px
    grid-template-columns: repeat(2, 1fr);
  }

  /* Desktop (768px+) */
  @include respond-to('md') {
    padding: spacing('lg');  // 24px
    grid-template-columns: repeat(3, 1fr);
  }

  /* Large (1024px+) */
  @include respond-to('lg') {
    padding: spacing('xl');  // 32px
    grid-template-columns: repeat(4, 1fr);
  }
}

Breakpoints:
- sm: 576px  (Tablette paysage)
- md: 768px  (Tablette portrait)
- lg: 1024px (Desktop)
- xl: 1200px (Large desktop)
- xxl: 1536px (Extra large)

⚠️ NEVER use max-width (desktop-first)!
✅ ALWAYS use respond-to() min-width (mobile-first)!
```

---

## ♿ ACCESSIBILITY TOKENS

```
WCAG AA Compliance
═══════════════════════════════════════════════════════════

Touch Targets:
│
├─ WCAG AA minimum ────→ 44px × 44px
│                        └─ size('touch-target-min')
│                        └─ @include touch-target('min')
│
├─ Optimal (compromise) ─→ 48px × 48px
│                         └─ size('touch-target-optimal')
│
└─ TSA preferred ──────→ 56px × 56px
                        └─ size('touch-target-preferred')
                        └─ @include touch-target('preferred')

Focus Indicators:
│
├─ Outline width ────→ 2px
│                      └─ a11y('focus-ring-width')
│
├─ Outline offset ───→ 2px
│                      └─ a11y('focus-ring-offset')
│
└─ Color ───────────→ var(--color-primary)
                      └─ Contraste ≥ 4.5:1

Animations (TSA):
│
├─ Instant ─────→ 0.1s (feedback immédiat)
├─ Fast ────→ 0.15s (hover, focus)
├─ Base ────→ 0.2s (state changes)
├─ Slow ────→ 0.3s (max TSA-safe)
└─ Reveal ──→ 0.4s (exceptions only)

prefers-reduced-motion:
│
├─ User preference detected?
│  ├─ YES → Aucune animation
│  └─ NO → Animations appliquées
│
└─ Automatique via @include safe-transition()
```

---

## 🎨 COLOR PALETTE OVERVIEW

```
NEUTRALS                      BRAND
(Base apaisante)              (Violet identité)
#ffffff (white)               #667eea (base)
  │                             │
  ├─ #f8fafc (page bg)          ├─ #e0e7ff (light)
  ├─ #f1f5f9 (soft)             ├─ #8b9ff4 (lighter)
  ├─ #e2e8f0 (border)           └─ #4c5ac4 (dark)
  ├─ #cbd5e1 (hover)
  ├─ #94a3b8 (tertiary text)   SUCCESS (Vert émeraude)
  ├─ #64748b (secondary text)   #10b981 (base)
  ├─ #475569 (strong text)      ├─ #d1fae5 (light)
  ├─ #334155 (strong)           └─ #047857 (dark)
  ├─ #1e293b (primary text)
  └─ #0f172a (very strong)      WARNING (Orange)
                                #f97316 (base)
                                ├─ #ffedd5 (light)
                                └─ #c2410c (dark)

ERROR (Rouge TSA-friendly)     INFO (Bleu ciel)
#ef4444 (base)                 #0ea5e9 (base)
├─ #fee2e2 (light) ← pâle!     ├─ #e0f2fe (light)
└─ #b91c1c (dark)              └─ #0369a1 (dark)

Toutes couleurs dérivées de palettes (pas de hardcodes).
Thèmes light/dark switch colors via CSS vars.
```

---

## 🔗 DEPENDENCY RESOLUTION

```
Composant appelle: color: text('primary')

                              ↓
        _colors.scss: text() function
                (cherche semantic)
                              ↓
        _semantics.scss: $color-semantic-text['primary']
                (map.get(palette('neutral', 800)))
                              ↓
        _primitives.scss: palette('neutral', 800)
                (cherche dans $palettes-primitives)
                              ↓
        _tokens.scss: $palettes-primitives['neutral'][800]
                = #1e293b
                              ↓
        CSS compilé: color: #1e293b;

FALLBACK si Phase 6 absent:
┌─ semantic recherche
├─ Si absent, @use 'tokens' as * fallback
├─ Lit depuis $color-semantic-tokens legacy
└─ Retourne valeur legacy (aucun break)

✅ Migration graceful sans breaking changes
```

---

**Visual Reference Created**: 2026-04-25
**Format**: ASCII diagrams + tree views
**Compliance**: WCAG 2.2 AA + TSA
