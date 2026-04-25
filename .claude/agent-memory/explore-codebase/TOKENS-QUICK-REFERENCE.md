# TOKENS QUICK REFERENCE — Appli-Picto

**Fast lookup guide** pour développeurs — Utiliser ceci pour importer/utiliser tokens rapidement.

---

## 🎨 QUICK IMPORTS

```scss
// TOUJOURS en haut de chaque .scss
@use '@styles/abstracts' as *;
```

Cela donne accès AUTOMATIQUE à:

```
spacing('md'), spacing('lg'), ...
radius('card'), radius('button'), ...
text('primary'), surface('bg'), semantic('error'), ...
size('modal-width-md'), size('icon-sm'), ...
font-size('lg'), font-weight('bold'), ...
timing('fast'), easing('smooth'), ...
a11y('touch-target'), ...
@include respond-to('md'), @include touch-target(), ...
```

---

## 📏 SPACING (respiration uniquement)

```scss
// PRIMITIVE SCALE (grille 4px)
spacing('xs')    // 4px
spacing('sm')    // 8px    ← utilisé 152x
spacing('md')    // 16px   ← TRÈS FRÉQUENT (174x)
spacing('lg')    // 24px   ← TRÈS FRÉQUENT (61x)
spacing('xl')    // 32px
spacing('2xl')   // 48px

// NUMERIC (grille 4px stricte)
spacing('1')     // 1px
spacing('2')     // 2px
spacing('4')     // 4px
spacing('6')     // 6px
spacing('8')     // 8px
spacing('12')    // 12px
spacing('16')    // 16px
spacing('20')    // 20px   ← utilisé 15x
spacing('24')    // 24px   ← TRÈS FRÉQUENT (18x)
spacing('32')    // 32px
spacing('44')    // 44px ← Touch target WCAG AA
spacing('48')    // 48px
spacing('56')    // 56px ← Touch target TSA preferred
spacing('64')    // 64px
spacing('80')    // 80px
spacing('96')    // 96px
spacing('100')   // 100px
spacing('120')   // 120px
spacing('160')   // 160px
spacing('200')   // 200px
spacing('260')   // 260px
spacing('280')   // 280px
spacing('300')   // 300px

// SEMANTIC (noms métier)
spacing('card-padding')         // 24px
spacing('modal-padding')        // 32px
spacing('button-padding-x')     // 24px (horizontal)
spacing('button-padding-y')     // 8px (vertical)
spacing('page-padding')         // 32px
spacing('container-padding')    // 24px
spacing('nav-padding')          // 16px
spacing('input-padding')        // 8px

// ✅ USAGE
padding: spacing('md');         // ✅
margin-bottom: spacing('lg');   // ✅
gap: spacing('sm');             // ✅

// ❌ WRONG
width: spacing('300');          // ❌ Use size() instead!
```

---

## 📐 SIZE (dimensions structurelles)

```scss
// TOUCH TARGETS (accessibilité)
size('touch-target-min')      // 44px WCAG AA
size('touch-target-optimal')  // 48px
size('touch-target-preferred')// 56px TSA

// ICONS
size('icon-xs')     // 12px
size('icon-sm')     // 16px ← TRÈS FRÉQUENT (23x)
size('icon-md')     // 24px
size('icon-lg')     // 32px
size('icon-xl')     // 48px

// BUTTONS/INPUTS
size('button-height')  // 44px
size('input-height')   // 44px

// AVATARS
size('avatar-sm')   // 32px
size('avatar-md')   // 40px ← FRÉQUENT (10x)
size('avatar-lg')   // 48px

// CARDS
size('card-min-height')  // 140px
size('card-max-width')   // 400px

// MODALS (TRÈS FRÉQUENT)
size('modal-width-sm')   // 320px
size('modal-width-md')   // 540px ← TRÈS FRÉQUENT (6x)
size('modal-width-lg')   // 720px

// SIDEBAR & CONTAINER
size('sidebar-width')    // 280px
size('container-lg')     // 1024px

// NUMERIC (legacy)
size('2')    // 2px
size('4')    // 4px
size('8')    // 8px
size('24')   // 24px
size('32')   // 32px
size('60')   // 60px
size('64')   // 64px
size('100')  // 100px
size('200')  // 200px
size('260')  // 260px
size('300')  // 300px
size('600')  // 600px
size('800')  // 800px

// ✅ USAGE
width: size('modal-width-md');
height: size('button-height');
min-height: size('touch-target-min');
max-width: size('card-max-width');

// ❌ WRONG
width: spacing('300');    // ❌ Use size() not spacing()!
height: 44px;             // ❌ Use size() not px!
```

---

## 🎨 COLORS — TEXT

```scss
// TEXT COLORS (Semantics Phase 6)
text('primary')    // #1e293b - texte principal fort
text('secondary')  // #475569 - texte secondaire
text('tertiary')   // #94a3b8 - texte hints/subtle
text('invert')     // #ffffff - texte sur fond sombre
text('muted')      // #64748b - texte désactivé
text('dark')       // #0f172a - texte très fort (headings)

// ✅ USAGE
color: text('primary');
color: text('secondary');

// ❌ WRONG
color: #1e293b;         // ❌ Hardcoded!
color: gray(800);       // ❌ Use text() not gray()!
```

---

## 🎨 COLORS — SURFACE

```scss
// SURFACE COLORS (Semantics Phase 6)
surface('bg')       // #ffffff - card/component bg
surface('page')     // #f8fafc - page background clair
surface('card')     // #ffffff - cards
surface('overlay')  // #f1f5f9 - overlay léger
surface('border')   // #e2e8f0 - bordures standard
surface('divider')  // #f1f5f9 - séparateurs
surface('hover')    // #f8fafc - background hover
surface('soft')     // #f8fafc - background doux

// ✅ USAGE
background: surface('bg');
border-color: surface('border');
border-top-color: surface('divider');

// ❌ WRONG
background: #ffffff;         // ❌ Hardcoded!
border: 1px solid gray(200); // ❌ Use surface() not gray()!
```

---

## 🎨 COLORS — SEMANTIC (Feedback)

```scss
// SUCCESS (vert émeraude)
semantic('success', 'base')     // #10b981 - vert base
semantic('success', 'light')    // #d1fae5 - fond succès
semantic('success', 'dark')     // #047857 - texte succès
semantic('success', 'border')   // #6ee7b7 - bordure

// WARNING (orange)
semantic('warning', 'base')     // #f97316 - orange base
semantic('warning', 'light')    // #ffedd5 - fond warning
semantic('warning', 'dark')     // #c2410c - texte warning
semantic('warning', 'border')   // #fdba74 - bordure

// ERROR (rouge adouci TSA-friendly)
semantic('error', 'base')       // #ef4444 - rouge base
semantic('error', 'light')      // #fee2e2 - fond erreur (PÂLE)
semantic('error', 'dark')       // #b91c1c - texte erreur
semantic('error', 'border')     // #fca5a5 - bordure

// INFO (bleu ciel)
semantic('info', 'base')        // #0ea5e9 - bleu base
semantic('info', 'light')       // #e0f2fe - fond info
semantic('info', 'dark')        // #0369a1 - texte info
semantic('info', 'border')      // #7dd3fc - bordure

// ✅ USAGE
background: semantic('error', 'light');        // Fond rouge doux
border-color: semantic('success', 'border');   // Bordure verte
color: semantic('warning', 'dark');            // Texte orange foncé

// ❌ WRONG
background: #fee2e2;                   // ❌ Hardcoded!
background: semantic('error', 'bg');   // ❌ Variante inexistante!
```

---

## 🎨 COLORS — BRAND (Rôles utilisateurs)

```scss
// ADMIN (violet #667eea)
semantic('admin', 'base')      // #667eea - violet principal
semantic('admin', 'light')     // #e0e7ff - fond admin
semantic('admin', 'dark')      // #4c5ac4 - actif/hover

// ABONNÉ (vert succès #22c55e)
semantic('abonne', 'base')     // #22c55e
semantic('abonne', 'light')    // #d1fae5
semantic('abonne', 'dark')     // #047857

// FREE (gris neutre #64748b)
semantic('free', 'base')       // #64748b
semantic('free', 'light')      // #f1f5f9
semantic('free', 'dark')       // #334155

// VISITOR (orange warning #ea580c)
semantic('visitor', 'base')    // #ea580c
semantic('visitor', 'light')   // #ffedd5
semantic('visitor', 'dark')    // #c2410c

// ✅ USAGE
background: semantic('admin', 'light');
color: semantic('visitor', 'dark');
```

---

## 🔵 COLORS — PALETTES (legacy)

```scss
// Disponibles si besoin accès direct
blue(500)      // #3b82f6
blue(600)      // #2563eb
red(500)       // #ef4444
green(500)     // #22c55e
orange(500)    // #f97316
yellow(500)    // #eab308
purple(500)    // #a855f7
gray(100)      // #f7f7f7
gray(500)      // #9e9e9e
gray(700)      // #626262
slate(500)     // #64748b (meilleur pour UI)
slate(700)     // #334155

// ⚠️ PREFER semantic() + text() + surface() instead
```

---

## 🔲 BORDER RADIUS

```scss
// SEMANTIC (noms métier) — ✅ PRÉFÉRÉ
radius('card')      // 12px (conteneurs cards)
radius('button')    // 6px (boutons, inputs)
radius('input')     // 6px (inputs)
radius('modal')     // 20px (modals doux TSA)
radius('badge')     // 50% (badges pill)
radius('avatar')    // 50% (avatars ronds)

// PRIMITIVE (valeurs brutes)
radius('none')      // 0
radius('xs')        // 4px
radius('sm')        // 6px (TSA-friendly)
radius('md')        // 12px (TSA-friendly, TRÈS FRÉQUENT)
radius('lg')        // 20px
radius('xl')        // 24px
radius('full')      // 50%

// ✅ USAGE
border-radius: radius('card');      // 12px
border-radius: radius('button');    // 6px
border-radius: radius('modal');     // 20px

// ❌ WRONG
border-radius: 8px;                 // ❌ Hardcoded!
border-radius: radius('md') * 2;    // ❌ Manipulation!
```

---

## 🌫️ SHADOWS

```scss
// ELEVATION SCALE (semantic)
shadow('none')      // none
shadow('subtle')    // xs elevation
shadow('small')     // sm elevation
shadow('medium')    // md elevation ← STANDARD
shadow('large')     // lg elevation
shadow('xlarge')    // xl elevation
shadow('2xlarge')   // 2xl elevation

// CONTEXT-SPECIFIC
shadow('card')      // card shadow sm
shadow('modal')     // modal shadow 2xl
shadow('dropdown')  // dropdown shadow xl

// ✅ USAGE
box-shadow: shadow('medium');
box-shadow: shadow('card');

// ❌ WRONG
box-shadow: 0 4px 8px rgba(...);    // ❌ Hardcoded!
```

---

## 🔤 TYPOGRAPHY

```scss
// FONT SIZE
font-size('xs')     // 12px ← utilisé 28x
font-size('sm')     // 14px ← TRÈS FRÉQUENT (61x)
font-size('base')   // 16px ← TRÈS FRÉQUENT (37x)
font-size('lg')     // 18px ← FRÉQUENT (24x)
font-size('xl')     // 20px
font-size('2xl')    // 24px ← FRÉQUENT (23x)
font-size('3xl')    // 30px
font-size('4xl')    // 36px
font-size('5xl')    // 48px

// FONT WEIGHT
font-weight('light')       // 300
font-weight('normal')      // 400
font-weight('medium')      // 500
font-weight('semibold')    // 600
font-weight('bold')        // 700

// LINE HEIGHT
line-height('tight')       // 1.25
line-height('normal')      // 1.45
line-height('relaxed')     // 1.625

// ✅ USAGE
font-size: font-size('lg');
font-weight: font-weight('bold');
line-height: line-height('relaxed');
```

---

## ⏱️ MOTION (TSA ≤ 0.3s)

```scss
// TIMING (durées)
timing('instant')   // 0.1s - feedback immédiat
timing('fast')      // 0.15s - hover, focus
timing('base')      // 0.2s - standard state changes
timing('slow')      // 0.3s - lent (max TSA-safe)
timing('reveal')    // 0.4s - reveals (exception)

// EASING
easing('linear')    // linear
easing('smooth')    // ease (défaut)
easing('smooth-out')// cubic-bezier(0.25, 0.46, 0.45, 0.94)
easing('smooth-in') // cubic-bezier(0.55, 0.055, 0.675, 0.19)

// ✅ USAGE
@include safe-transition(background-color, timing('fast'), easing('smooth'));
animation: fadeIn timing('base') easing('smooth-out') forwards;

// ❌ WRONG
transition: all 1s ease;                // ❌ Trop long!
animation: bounce 0.5s;                 // ❌ Vertigineux!
```

---

## ♿ ACCESSIBILITY

```scss
// A11Y TOKENS
a11y('min-touch-target')       // 44px (WCAG AA min)
a11y('preferred-touch-target') // 56px (TSA optimal)
a11y('focus-ring-width')       // 2px
a11y('focus-ring-offset')      // 2px

// ✅ PATTERN
&:focus-visible {
  outline: a11y('focus-ring-width') solid var(--color-primary);
  outline-offset: a11y('focus-ring-offset');
}

// MIXINS
@include touch-target('min');       // 44px WCAG AA
@include touch-target('preferred'); // 56px TSA
@include safe-transition(...);      // respect prefers-reduced-motion
@include focus-ring();              // WCAG focus visible
```

---

## 📱 RESPONSIVE (Mobile-First)

```scss
// BREAKPOINTS (TOUJOURS utiliser min-width)
@include respond-to('sm')  // 576px+ (tablette paysage)
@include respond-to('md')  // 768px+ (tablette portrait)
@include respond-to('lg')  // 1024px+ (desktop)
@include respond-to('xl')  // 1200px+ (large desktop)
@include respond-to('xxl') // 1536px+ (extra large)

// ✅ MOBILE-FIRST PATTERN
.component {
  padding: spacing('sm');  // Mobile: 8px

  @include respond-to('md') {
    padding: spacing('md');  // Tablet+: 16px
  }

  @include respond-to('lg') {
    padding: spacing('lg');  // Desktop+: 24px
  }
}

// ❌ WRONG
@media (max-width: 768px) { ... }  // ❌ NEVER use max-width!
```

---

## 🔗 MIXINS COURANTS

```scss
// TRANSITIONS ACCESSIBLES (respect prefers-reduced-motion)
@include safe-transition(property, duration, easing);
// Ex: @include safe-transition(background-color, timing('fast'), easing('smooth'));

// FOCUS WCAG AA
&:focus-visible {
  outline: a11y('focus-ring-width') solid var(--color-primary);
  outline-offset: a11y('focus-ring-offset');
}

// TOUCH TARGETS WCAG AA / TSA
@include touch-target('min');       // 44px × 44px
@include touch-target('preferred'); // 56px × 56px

// CENTER FLEX
@include flex-center;

// CLEARFIX
@include clearfix;

// EVENT STATES (hover, focus, active, focus-within)
@include on-event($self: false) {
  background-color: color-mix(in srgb, currentColor 10%, transparent);
}
```

---

## 🚩 CRITICAL EDGE CASES

### ⚠️ size('44') n'existe PAS

```scss
// ❌ ERREUR BUILD
min-height: size('44');  // ❌ Token inexistant!

// ✅ CORRECT
min-height: size('touch-target-min');  // 44px WCAG AA
```

### ⚠️ spacing('3'), spacing('5'), spacing('7') n'existe PAS

Grille **4px stricte UNIQUEMENT**:

```scss
// ❌ ERREUR BUILD
padding: spacing('3');   // ❌ Pas dans la grille
padding: spacing('5');   // ❌ Pas dans la grille
padding: spacing('14');  // ❌ Pas dans la grille (legacy)

// ✅ CORRECT
padding: spacing('md');  // 16px (grille 4px)
padding: spacing('4');   // 4px (grille 4px)
padding: spacing('12');  // 12px (grille 4px)
```

### ⚠️ surface('warning-subtle') n'existe PAS

```scss
// ❌ ERREUR BUILD
background: surface('warning-subtle');  // ❌ Pas de token!

// ✅ CORRECT
background: semantic('warning', 'light');   // #ffedd5
border-color: semantic('warning', 'base');  // #f97316
```

### ⚠️ Hardcoding couleurs = BUILD OK mais MAINTENANCE MAUVAISE

```scss
// ⚠️ BUILD OK mais MAUVAIS
color: #1e293b;         // Hardcoded
background: #ffffff;    // Hardcoded
border: 1px solid #ddd; // Hardcoded

// ✅ CORRECT
color: text('primary');
background: surface('bg');
border: 1px solid surface('border');
```

---

## 📊 FREQUENCY DATA (audit real usage)

Most used:

| Token | Frequency | Notes |
|-------|-----------|-------|
| `spacing('md')` | 174x | 16px — très fréquent |
| `spacing('sm')` | 152x | 8px — très fréquent |
| `spacing('lg')` | 61x | 24px — fréquent |
| `font-size('sm')` | 61x | 14px — texte principal |
| `font-size('base')` | 37x | 16px — standard |
| `radius('md')` | 58x | 12px — cards standard |
| `radius('sm')` | 33x | 6px — buttons/inputs |
| `size('icon-sm')` | 23x | 16px — icons standard |
| `semantic('error', 'light')` | ~15x | Rouge pastel bg |
| `size('modal-width-md')` | 6x | 540px — modals standard |

---

**Last updated**: 2026-04-25
**Compliance**: WCAG 2.2 AA + TSA
**Phase**: Phase 6 migration (fallback legacy)
