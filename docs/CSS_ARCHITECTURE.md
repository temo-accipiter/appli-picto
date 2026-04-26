# Architecture CSS — Appli-Picto

**Version** : 1.0 — Généré le 2026-04-26
**Public cible** : LLM ou développeur qui n'a jamais vu ce projet
**Source de vérité** : Ce document synthétise `src/styles/abstracts/`, `docs/refonte_front/direction-visuelle-v1.1.md`, `docs/TOOLING_MAP.md`

---

## 1. Vue d'ensemble

Appli-Picto est une application **Next.js 16** (App Router, Turbopack) avec **React 19** et **TypeScript strict**. Le styling est géré exclusivement par **SCSS** (Sass 1.86.3). La compilation SCSS est prise en charge par Next.js nativement.

**Philosophie centrale** : zéro valeur CSS hardcodée. Toute couleur, espacement, rayon, ombre, taille ou durée doit passer par une fonction wrapper du design system. Les fonctions s'appellent dans le SCSS et retournent les valeurs correspondantes au moment de la compilation.

**Stack** :

| Couche          | Outil                   | Notes                                   |
| --------------- | ----------------------- | --------------------------------------- |
| Framework       | Next.js 16 + App Router | Turbopack, Server Components par défaut |
| Language        | TypeScript strict       | `noImplicitAny: false` temporaire       |
| Styling         | SCSS (global BEM-lite)  | Pas de CSS Modules, pas de Tailwind     |
| Package manager | pnpm 9.15.0             | Jamais yarn ni npm                      |
| Compilation     | Sass 1.86.3 via Next.js | `pnpm build:css` pour standalone        |

**Import obligatoire dans chaque fichier SCSS** :

```scss
@use '@styles/abstracts' as *;
```

Cet alias résout vers `src/styles/abstracts/_index.scss`. Il exporte **uniquement des fonctions et mixins** (aucun CSS généré).

---

## 2. Architecture des 3 couches

Le design system est organisé en 3 couches hiérarchiques. Les wrappers (fonctions publiques) font un fallback automatique de la couche la plus récente vers la plus ancienne.

```
┌──────────────────────────────────────────────────────────────────┐
│  COUCHE 1 — Primitives (src/styles/abstracts/_primitives.scss)   │
│                                                                  │
│  Valeurs brutes harmonisées. Grille 4px stricte. Radius adoucis  │
│  TSA-friendly (6px/12px/20px). Palettes cohérentes.             │
│                                                                  │
│  Exemples : palette('neutral', 800), $spacing-primitives('md')   │
│  Jamais utilisées directement dans les composants.               │
└──────────────────────────────────┬───────────────────────────────┘
                                   │ référencées par
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│  COUCHE 2 — Semantics (src/styles/abstracts/_semantics.scss)     │
│                                                                  │
│  Noms métier → Primitives. Auto-documentés par intention.        │
│                                                                  │
│  Exemples : 'card-padding' → 24px, 'touch-preferred' → 56px,    │
│             'button' (radius) → 6px, 'card' (radius) → 12px     │
│                                                                  │
│  Priorité 1 dans les wrappers (spacing, radius, color, surface)  │
└──────────────────────────────────┬───────────────────────────────┘
                                   │ fallback si absent
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│  COUCHE 3 — Legacy tokens (src/styles/abstracts/_tokens.scss)    │
│                                                                  │
│  Valeurs originales (Phase 5). Utilisées via fallback quand      │
│  aucune sémantique ou primitive n'existe.                        │
│                                                                  │
│  Exemples : $spacing-tokens('md') = 1rem (16px), $radius-tokens  │
│                                                                  │
│  Feature flag : $ENABLE_LEGACY_SUPPORT: true (Phase 6 actuel)    │
└──────────────────────────────────────────────────────────────────┘
```

**Résolution effective par wrapper** :

```
spacing('card-padding')
  → Semantics ✅ → 24px

spacing('md')
  → Semantics ❌ → Primitives ✅ → 16px

spacing('14')
  → Semantics ❌ → Primitives ❌ → Legacy ✅ → 0.875rem

spacing('7')
  → Semantics ❌ → Primitives ❌ → Legacy ❌ → ERREUR BUILD
```

**Fichiers sources** :

| Fichier             | Rôle                                                          |
| ------------------- | ------------------------------------------------------------- |
| `_tokens.scss`      | SOURCE DE VÉRITÉ UNIQUE — toutes les maps de tokens           |
| `_primitives.scss`  | Couche 1 — palettes, grille 4px, radius adoucis               |
| `_semantics.scss`   | Couche 2 — aliases métier → primitives                        |
| `_colors.scss`      | Wrapper couleurs (fonctions d'accès, aucune map locale)       |
| `_spacing.scss`     | Wrapper spacing avec fallback 3 couches                       |
| `_radius.scss`      | Wrapper radius avec fallback 3 couches                        |
| `_a11y-tokens.scss` | Wrapper accessibilité (a11y())                                |
| `_size.scss`        | Fonction size() — dimensions structurelles                    |
| `_borders.scss`     | Fonction border-width()                                       |
| `_motion.scss`      | Fonctions timing() et easing()                                |
| `_typography.scss`  | Fonction font-size() (canonical)                              |
| `_mixins.scss`      | respond-to(), safe-transition(), touch-target(), focus-ring() |
| `_index.scss`       | Point d'entrée — forward de toutes les fonctions              |

---

## 3. Fonctions wrapper disponibles

### 3.1 `color($key, $type: 'primary')`

Retourne une couleur de marque primaire, secondaire ou accent.

**Source** : `$primary-color-tokens`, `$secondary-color-tokens`, `$accent-color-tokens` dans `_tokens.scss`

| Clé       | Type      | Valeur    |
| --------- | --------- | --------- |
| `'base'`  | primary   | `#0077c2` |
| `'light'` | primary   | `#4dabf7` |
| `'dark'`  | primary   | `#1565c0` |
| `'base'`  | secondary | `#ef5350` |
| `'dark'`  | secondary | `#d32f2f` |
| `'base'`  | accent    | `#ffb400` |
| `'light'` | accent    | `#fbbf24` |
| `'dark'`  | accent    | `#f59e0b` |

```scss
// Usage
background-color: color('base'); // #0077c2 (primary par défaut)
background-color: color('dark'); // #1565c0
background-color: color('base', 'secondary'); // #ef5350
```

---

### 3.2 `semantic($name, $variant: 'base')`

Retourne une couleur sémantique d'état (feedback). Fallback Phase 6 → Legacy.

**Noms disponibles** : `success`, `warning`, `error`, `info`

**Variantes** : `base`, `light`, `dark`, `bg`, `border`

⚠️ **`info-primary`** : clé legacy hardcodée (`#66c3f7`, bleu clair). Voir section 11.

```scss
// Usage
background-color: semantic('error', 'bg'); // #fee2e2 (fond rouge léger)
color: semantic('success', 'dark'); // #047857 (texte vert)
border-color: semantic('warning', 'border'); // #fdba74
```

---

### 3.3 `text($type: 'default')`

Retourne une couleur de texte sémantique. Fallback Phase 6 → Legacy.

| Clé (Phase 6) | Valeur    | Usage                 |
| ------------- | --------- | --------------------- |
| `'primary'`   | `#1e293b` | Texte principal       |
| `'secondary'` | `#475569` | Texte secondaire      |
| `'tertiary'`  | `#94a3b8` | Hints, métadonnées    |
| `'invert'`    | `#ffffff` | Texte sur fond sombre |
| `'muted'`     | `#64748b` | Texte désactivé       |
| `'dark'`      | `#0f172a` | Headings forts        |

```scss
color: text(); // 'default' → legacy #333333 (ou 'primary' si migrée)
color: text('invert'); // #ffffff
color: text('secondary'); // #475569
```

---

### 3.4 `surface($type)`

Retourne une couleur de surface ou fond. Fallback Phase 6 → Legacy.

| Clé (Phase 6) | Valeur    | Usage                       |
| ------------- | --------- | --------------------------- |
| `'page'`      | `#f8fafc` | Fond page principal         |
| `'bg'`        | `#ffffff` | Fond blanc pur              |
| `'card'`      | `#ffffff` | Fond cards                  |
| `'overlay'`   | `#f1f5f9` | Overlay léger               |
| `'border'`    | `#e2e8f0` | Couleur de bordure standard |
| `'divider'`   | `#f1f5f9` | Séparateurs                 |
| `'hover'`     | `#f8fafc` | État hover                  |
| `'soft'`      | `#f8fafc` | Fond doux                   |

```scss
background-color: surface('card'); // #ffffff
background-color: surface('hover'); // #f8fafc
border-color: surface('border'); // #e2e8f0
```

❌ `surface('warning-subtle')` → **ERREUR BUILD** (clé inexistante)
✅ Alternative : `surface('soft')` + `semantic('warning', 'border')`

---

### 3.5 `spacing($key)`

Retourne une valeur d'espacement. **Uniquement pour `margin`, `padding`, `gap`.**
Pour `width`, `height`, `min-height`, utiliser `size()`.

**Ordre de résolution** : Semantics → Primitives → Legacy

**Aliases sémantiques composants (priorité)** :

| Clé                   | Valeur | Usage                       |
| --------------------- | ------ | --------------------------- |
| `'card-padding'`      | 24px   | Padding interne cards       |
| `'input-padding'`     | 8px    | Padding interne inputs      |
| `'button-padding-x'`  | 24px   | Padding horizontal boutons  |
| `'button-padding-y'`  | 8px    | Padding vertical boutons    |
| `'modal-padding'`     | 32px   | Padding interne modals      |
| `'nav-padding'`       | 16px   | Padding navigation          |
| `'nav-gap'`           | 8px    | Gap items navigation        |
| `'container-padding'` | 24px   | Padding containers layout   |
| `'section-gap'`       | 48px   | Gap entre sections majeures |
| `'grid-gap'`          | 16px   | Gap grilles et listes       |
| `'heading-gap'`       | 24px   | Gap titre/contenu           |
| `'page-padding'`      | 32px   | Padding page globale        |
| `'card-gap'`          | 16px   | Gap entre cards             |

**Primitives (grille 4px stricte)** :

| Clé                                                                                                                                         | Valeur                |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `'none'`                                                                                                                                    | 0                     |
| `'xs'`                                                                                                                                      | 4px                   |
| `'sm'`                                                                                                                                      | 8px                   |
| `'md'`                                                                                                                                      | 16px                  |
| `'lg'`                                                                                                                                      | 24px                  |
| `'xl'`                                                                                                                                      | 32px                  |
| `'2xl'`                                                                                                                                     | 48px                  |
| `'3xl'`                                                                                                                                     | 64px                  |
| `'4'`, `'6'`, `'8'`, `'12'`, `'16'`, `'20'`, `'24'`, `'28'`, `'32'`, `'36'`, `'40'`, `'44'`, `'48'`, `'56'`, `'60'`, `'64'`, `'80'`, `'96'` | valeurs numériques px |

❌ `spacing('5')`, `spacing('7')` → **ERREUR BUILD** (pas dans la grille 4px, ni en primitives ni en legacy)

```scss
padding: spacing('card-padding'); // 24px (sémantique)
gap: spacing('md'); // 16px (primitive)
margin-bottom: spacing('xl'); // 32px (primitive)
```

---

### 3.6 `radius($key)`

Retourne un border-radius. Fallback : Semantics → Primitives → Legacy.

⚠️ **RÈGLE CRITIQUE** : les clés primitives brutes (`'md'`, `'lg'`, `'xl'`) ont des **valeurs différentes** entre la couche Phase 6 et la couche legacy. Toujours préférer les **aliases sémantiques composants**.

| Alias composant | Valeur Phase 6 | Usage                      |
| --------------- | -------------- | -------------------------- |
| `'button'`      | 6px            | Boutons (tous contextes)   |
| `'input'`       | 6px            | Inputs, selects, textareas |
| `'card'`        | 12px           | Cards et containers        |
| `'modal'`       | 20px           | Modals, drawers            |
| `'badge'`       | 50%            | Badges, pills              |
| `'avatar'`      | 50%            | Avatars circulaires        |

| Alias générique | Valeur Phase 6 | Usage                           |
| --------------- | -------------- | ------------------------------- |
| `'subtle'`      | 4px            | Très subtil (tooltip, checkbox) |
| `'small'`       | 6px            | Petit                           |
| `'medium'`      | 12px           | Standard                        |
| `'large'`       | 20px           | Large                           |
| `'xlarge'`      | 24px           | Extra large                     |
| `'full'`        | 50%            | Cercles parfaits                |
| `'none'`        | 0              | Aucun arrondi                   |

❌ **Jamais** `radius('md')`, `radius('lg')`, `radius('xl')` (clés primitives brutes — valeurs ambiguës entre couches)
❌ **Jamais** `radius('rounded-6px')`, `radius('rounded-12px')` (clés legacy à ne pas exposer)

```scss
border-radius: radius('card'); // 12px — correct
border-radius: radius('button'); // 6px — correct
border-radius: radius('modal'); // 20px — correct
```

---

### 3.7 `font-size($key)`

Retourne une taille de police. **Source unique** : `$font-size-tokens` dans `_tokens.scss`. Défini dans `_typography.scss` (implémentation canonique).

| Clé      | Valeur | Usage                                   |
| -------- | ------ | --------------------------------------- |
| `'xs'`   | 12px   | Très petit, exceptionnel                |
| `'sm'`   | 14px   | Labels secondaires, métadonnées         |
| `'base'` | 16px   | Texte courant (par défaut)              |
| `'lg'`   | 18px   | Texte courant contexte enfant (Tableau) |
| `'xl'`   | 20px   | Sous-titres, boutons importants         |
| `'2xl'`  | 24px   | Titres de sections                      |
| `'3xl'`  | 30px   | Titres de page (rare)                   |
| `'4xl'`  | 36px   | Grand titre (exceptionnel)              |
| `'5xl'`  | 48px   | Hero (exceptionnel)                     |

⚠️ **Aliases orphelins** : `'body'`, `'heading-md'`, `'label'`, `'button'`, `'input'` sont définis dans `$typography-semantic` mais le wrapper `font-size()` ne les lit PAS (lit uniquement `$font-size-tokens`). **Ne pas utiliser ces aliases** jusqu'à résolution T2-E.

```scss
font-size: font-size('base'); // 16px ✅
font-size: font-size('lg'); // 18px ✅
font-size: font-size('body'); // ERREUR BUILD ❌ — alias orphelin
```

---

### 3.8 `shadow($key, $variant: null)`

⚠️ **T1-B EN COURS** — Voir section 11 pour les détails du conflit.

La fonction `shadow()` exposée via `_index.scss` lit `$shadow-tokens` (legacy). Les aliases de `$shadow-semantic` (`card`, `card-hover`, `button`, `modal`) ne sont **pas accessibles** via cette fonction.

**Clés à accès direct (fonctionnent)** :

| Clé                                       | Valeur CSS                      |
| ----------------------------------------- | ------------------------------- |
| `'elevation-none'`                        | `none`                          |
| `'elevation-xs'`                          | `0 1px 3px rgba(0,0,0,0.12)`    |
| `'elevation-sm'` / `'elevation-default'`  | `0 2px 6px rgba(0,0,0,0.15)`    |
| `'elevation-md'` / `'elevation-raised'`   | `0 4px 12px rgba(0,0,0,0.15)`   |
| `'elevation-lg'` / `'elevation-floating'` | `0 8px 24px rgba(0,0,0,0.2)`    |
| `'elevation-xl'`                          | `0 8px 32px rgba(0,0,0,0.1)`    |
| `'elevation-2xl'` / `'elevation-modal'`   | `0 10px 40px rgba(0,0,0,0.3)`   |
| `'focus'`                                 | `0 0 0 3px rgba(0,119,194,0.1)` |
| `'banner'`                                | `0 10px 40px rgba(0,0,0,0.3)`   |

**Clés imbriquées (avec `$variant`)** :

```scss
box-shadow: shadow('card', 'hover'); // 0 8px 24px rgba(0,0,0,0.2)
box-shadow: shadow('button', 'default'); // 0 2px 6px rgba(0,0,0,0.15)
box-shadow: shadow('input', 'focus'); // 0 0 0 3px rgba(0,119,194,0.1)
```

❌ `shadow('card')` sans variant → retourne une Sass map, pas du CSS valide → **BUG**
❌ `shadow('card-hover')` → clé inexistante dans `$shadow-tokens` → **ERREUR BUILD**

**Règle pratique jusqu'à résolution T1-B** :

- Composants atomiques (Button, Input, Card statique) : **pas de `box-shadow`** via `shadow()`
- Pour focus/hover d'exception : utiliser `shadow('elevation-md')` ou similaire
- Composants flottants (Modal, Dropdown, Toast) : à refactorer après T1-B

---

### 3.9 `a11y($key)`

Retourne une valeur d'accessibilité WCAG 2.2 AA. Source : `$a11y-tokens` dans `_tokens.scss`.

| Clé                           | Valeur | Usage                                     |
| ----------------------------- | ------ | ----------------------------------------- |
| `'min-touch-target'`          | 44px   | WCAG AA minimum                           |
| `'preferred-touch-target'`    | 56px   | TSA (enfants)                             |
| `'optimal-touch-target'`      | 48px   | Compromis                                 |
| `'focus-ring-width'`          | 2px    | Épaisseur outline focus                   |
| `'focus-ring-offset'`         | 2px    | Offset outline focus                      |
| `'focus-ring-width-enhanced'` | 3px    | Focus renforcé (basse vision)             |
| `'reduced-motion-duration'`   | 0.01ms | Quasi-instantané (prefers-reduced-motion) |
| `'safe-animation-duration'`   | 200ms  | Max animation TSA-friendly                |
| `'safe-transition-duration'`  | 150ms  | Max transition interactive                |
| `'contrast-min'`              | 4.5    | WCAG AA texte normal                      |
| `'contrast-enhanced'`         | 7.0    | WCAG AAA (recommandé TSA)                 |
| `'line-spacing-min'`          | 1.5    | WCAG 1.4.12                               |

```scss
min-height: a11y('preferred-touch-target'); // 56px
outline-width: a11y('focus-ring-width'); // 2px
```

---

### 3.10 `opacity($key)`

Retourne une valeur d'opacité (0–1).

| Clé        | Valeur |
| ---------- | ------ |
| `'none'`   | 0      |
| `'xs'`     | 0.05   |
| `'sm'`     | 0.1    |
| `'lg'`     | 0.2    |
| `'xl'`     | 0.3    |
| `'half'`   | 0.5    |
| `'0-9'`    | 0.9    |
| `'opaque'` | 1      |

```scss
opacity: opacity('half'); // 0.5 pour états désactivés
opacity: opacity('lg'); // 0.2 pour superpositions légères
```

---

### 3.11 `border-width($key)`

Retourne une largeur de bordure standardisée.

| Clé                                | Valeur | Usage                         |
| ---------------------------------- | ------ | ----------------------------- |
| `'none'`                           | 0      |                               |
| `'hairline'` / `'thin'`            | 1px    | Bordures légères, dividers    |
| `'base'` / `'focus'`               | 2px    | Standard, focus rings WCAG AA |
| `'medium'`                         | 3px    | Accents                       |
| `'thick'`                          | 4px    | Emphase forte                 |
| `'card-subtle'` / `'card-default'` | 1px    | Cards                         |
| `'divider-light'`                  | 1px    | Séparateurs                   |
| `'input-default'`                  | 2px    | Inputs                        |
| `'button-outline'`                 | 2px    | Boutons outline               |

```scss
border: border-width('thin') solid surface('border'); // 1px #e2e8f0
outline: border-width('focus') solid var(--color-primary); // 2px focus ring
```

---

### 3.12 `size($key)`

Retourne une dimension structurelle. **Uniquement pour `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height`, positionnement absolu.**

| Clé notable                | Valeur | Usage                 |
| -------------------------- | ------ | --------------------- |
| `'touch-target-min'`       | 44px   | WCAG AA cible tactile |
| `'touch-target-preferred'` | 56px   | TSA cible tactile     |
| `'touch-target-optimal'`   | 48px   | Compromis             |
| `'modal-width-sm'`         | 320px  | Modal compact         |
| `'modal-width-md'`         | 540px  | Modal standard        |
| `'modal-width-lg'`         | 768px  | Modal large           |
| `'nav-height-mobile'`      | 56px   | Navbar mobile         |
| `'icon-sm'`                | 16px   | Icône petite          |
| `'icon-md'`                | 24px   | Icône standard        |
| `'avatar-md'`              | 40px   | Avatar standard       |
| `'card-min-height'`        | 140px  | Card minimale         |

❌ `size('44')` → **ERREUR BUILD** — clé inexistante dans `$size-tokens`
✅ `size('touch-target-min')` → 44px

```scss
width: size('modal-width-md'); // 540px
min-height: size('touch-target-min'); // 44px
width: size('icon-md'); // 24px
```

---

### 3.13 `timing($key)` et `easing($key)`

Retournent des valeurs de motion. Source : `$motion-tokens` dans `_tokens.scss`. Définis dans `_motion.scss`.

**Timing** :

| Clé                     | Valeur | Usage                          |
| ----------------------- | ------ | ------------------------------ |
| `'xs'` / `'fast'`       | 0.15s  | Hover, focus (immédiat)        |
| `'sm'`                  | 0.2s   | Transitions de couleur rapides |
| `'base'` / `'slow'`     | 0.3s   | Standard (max TSA)             |
| `'lg'` / `'slower'`     | 0.5s   | Reveals, transforms            |
| `'xl'`                  | 0.8s   | Séquences complexes            |
| `'fade'` / `'slide'`    | 0.3s   | Animations nommées             |
| `'spin'`                | 1.5s   | Rotation continue              |
| `'pulse'` / `'shimmer'` | 2s     | Effets de respiration          |

**Easing** :

| Clé             | Valeur CSS                             | Usage              |
| --------------- | -------------------------------------- | ------------------ |
| `'smooth'`      | `ease`                                 | Par défaut         |
| `'ease-out'`    | `ease-out`                             | Sorties (exits)    |
| `'ease-in'`     | `ease-in`                              | Entrées (enters)   |
| `'ease-in-out'` | `ease-in-out`                          | Les deux côtés     |
| `'linear'`      | `linear`                               | Vitesse constante  |
| `'smooth-out'`  | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Sortie naturelle   |
| `'smooth-pop'`  | `cubic-bezier(0.34, 1.56, 0.64, 1)`    | Pop avec overshoot |

⚠️ **T2-E** : `timing()` et `easing()` lisent uniquement `$motion-tokens` (legacy). Les aliases sémantiques de `$motion-semantic` ne sont pas branchés.

```scss
@include safe-transition(background color, timing('fast'), easing('smooth'));
@include safe-animation(spinner-rotate, timing('slower'), easing('linear'));
```

---

### 3.14 Palettes brutes (accès direct)

Pour les cas où les fonctions `text()`, `surface()`, `semantic()` ne couvrent pas le besoin. Utilisés principalement pour les customisations de scrollbars, SVG, badges colorés.

```scss
color: gray(500); // #9e9e9e
background: blue(100); // #dbeafe
border-color: red(200); // #fecaca
color: slate(700); // #334155
color: green(600); // #16a34a
```

Palettes disponibles : `gray()`, `blue()`, `red()`, `green()`, `orange()`, `yellow()`, `purple()`, `slate()`, `white()`, `black()`

---

### 3.15 Mixins principaux

| Mixin                                        | Usage                               | Génère                                             |
| -------------------------------------------- | ----------------------------------- | -------------------------------------------------- |
| `@include respond-to('sm')`                  | Breakpoint 576px+                   | `@media (min-width: 576px)`                        |
| `@include respond-to('md')`                  | Breakpoint 768px+                   | `@media (min-width: 768px)`                        |
| `@include respond-to('lg')`                  | Breakpoint 1024px+                  | `@media (min-width: 1024px)`                       |
| `@include respond-to('xl')`                  | Breakpoint 1200px+                  | `@media (min-width: 1200px)`                       |
| `@include safe-transition(props, dur, ease)` | Transition + prefers-reduced-motion | `transition: ...; @media (prefers-reduced-motion)` |
| `@include safe-animation(name, dur, ease)`   | Animation + prefers-reduced-motion  | `animation: ...; @media (prefers-reduced-motion)`  |
| `@include touch-target('min')`               | Cible 44px WCAG AA                  | `min-height: 44px; min-width: 44px`                |
| `@include touch-target('preferred')`         | Cible 56px TSA                      | `min-height: 56px; min-width: 56px`                |
| `@include focus-ring()`                      | Focus visible WCAG                  | `outline: 2px solid var(--color-primary)`          |
| `@include on-event`                          | Hover + Focus-visible               | `:hover, :focus-visible`                           |

---

## 4. Règles absolues

### Ce qu'il NE FAUT JAMAIS faire

**Valeurs hardcodées interdites** :

```scss
// ❌ ABSOLUMENT INTERDIT
color: #0077c2;
padding: 16px;
border-radius: 8px;
font-size: 1rem;
background: rgb(255, 255, 255);
width: 320px;
transition: 0.3s ease;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
```

```scss
// ✅ OBLIGATOIRE
color: color('base');
padding: spacing('md');
border-radius: radius('button');
font-size: font-size('base');
background: surface('bg');
width: size('modal-width-sm');
@include safe-transition(all, timing('base'), easing('smooth'));
box-shadow: shadow('elevation-sm');
```

**Clés primitives de radius interdites dans les composants** :

```scss
// ❌ INTERDIT — valeurs ambiguës entre couches
border-radius: radius('md'); // Phase 6: 12px / Legacy: 8px → imprévisible
border-radius: radius('lg'); // Phase 6: 20px / Legacy: 16px → imprévisible
border-radius: radius('xl'); // Phase 6: 24px / Legacy: 20px → imprévisible

// ❌ INTERDIT — clés legacy spécifiques
border-radius: radius('rounded-6px');
border-radius: radius('rounded-12px');

// ✅ OBLIGATOIRE — aliases sémantiques
border-radius: radius('card'); // 12px, stable
border-radius: radius('modal'); // 20px, stable
border-radius: radius('button'); // 6px, stable
```

**shadow() bloquée pour composants atomiques (T1-B)** :

```scss
// ❌ INTERDIT jusqu'à résolution T1-B
box-shadow: shadow('card'); // Retourne une Sass map → CSS invalide
box-shadow: shadow('card-hover'); // Clé inexistante → ERREUR BUILD

// ✅ Alternatives pendant T1-B
box-shadow: shadow('elevation-sm'); // Elevation directe
box-shadow: shadow('card', 'hover'); // Accès nested avec variant
// Ou hardcodée UNIQUEMENT si documentée avec TODO :
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); // TODO: migrer vers shadow('card-hover') après T1-B
```

**font-size() aliases orphelins** :

```scss
// ❌ INTERDIT jusqu'à T2-E
font-size: font-size('body'); // Alias orphelin — ERREUR BUILD
font-size: font-size('heading-md'); // Alias orphelin — ERREUR BUILD

// ✅ Utiliser l'échelle legacy
font-size: font-size('base'); // 16px
font-size: font-size('lg'); // 18px
font-size: font-size('2xl'); // 24px
```

**Frameworks CSS interdits** :

```scss
// ❌ ABSOLUMENT INTERDIT
// Tailwind, CSS Modules (.module.scss), styled-components
// @apply, additionalData Sass, css-in-js
```

---

## 5. Patterns corrects vs incorrects

### Couleurs

```scss
// ❌ INCORRECT
.mon-composant {
  color: #334155;
  background-color: #0077c2;
  border-color: rgba(14, 165, 233, 0.3);
}

// ✅ CORRECT
.mon-composant {
  color: text('secondary');
  background-color: color('base');
  border-color: semantic('info', 'border');
}
```

### Espacement

```scss
// ❌ INCORRECT
.mon-composant {
  padding: 24px 16px;
  gap: 8px;
  margin-bottom: 48px;
}

// ✅ CORRECT — aliases sémantiques en priorité
.mon-composant {
  padding: spacing('card-padding') spacing('nav-padding'); // 24px 16px
  gap: spacing('nav-gap'); // 8px
  margin-bottom: spacing('section-gap'); // 48px
}
```

### Border radius

```scss
// ❌ INCORRECT
.ma-card {
  border-radius: 12px;
  border-radius: radius('md'); // Ambigu entre couches
}

.mon-bouton {
  border-radius: 6px;
  border-radius: radius('lg'); // Ambigu (16px legacy vs 20px Phase 6)
}

// ✅ CORRECT
.ma-card {
  border-radius: radius('card'); // 12px — stable
}

.mon-bouton {
  border-radius: radius('button'); // 6px — stable
}
```

### Typographie

```scss
// ❌ INCORRECT
.mon-texte {
  font-size: 1rem;
  font-weight: 600;
  font-size: font-size('body'); // Alias orphelin — ERREUR BUILD
}

// ✅ CORRECT
.mon-texte {
  font-size: font-size('base'); // 16px
  font-weight: font-weight('semibold'); // 600
}
```

### Touch targets

```scss
// ❌ INCORRECT
.mon-bouton {
  min-height: 44px; // Hardcodé
  min-width: 44px;
  min-height: a11y('min-touch-target'); // Fonctionne mais contourné
}

// ✅ CORRECT — mixin dédié
.mon-bouton {
  @include touch-target('min'); // WCAG AA 44px adulte
  // ou pour le Tableau enfant :
  @include touch-target('preferred'); // TSA 56px enfant
}
```

### Responsive Mobile-First

```scss
// ❌ INCORRECT — desktop-first interdit
.mon-composant {
  display: flex;

  @media (max-width: 767px) {
    // max-width INTERDIT
    display: block;
  }
}

// ✅ CORRECT — mobile-first obligatoire
.mon-composant {
  display: block; // Mobile par défaut

  @include respond-to('md') {
    // 768px+ (tablette)
    display: flex;
  }
}
```

### Transitions accessibles

```scss
// ❌ INCORRECT — ignore prefers-reduced-motion
.mon-element {
  transition: background 0.2s ease;
}

// ✅ CORRECT — prefers-reduced-motion inclus
.mon-element {
  @include safe-transition(background, timing('sm'), easing('smooth'));
  // Génère automatiquement :
  // transition: background 0.2s ease;
  // @media (prefers-reduced-motion: reduce) { transition-duration: 0.01ms; }
}
```

---

## 6. Système de tokens accessibilité (a11y)

### Touch targets

| Contexte                         | Token                            | Valeur | Obligatoire    |
| -------------------------------- | -------------------------------- | ------ | -------------- |
| Tous éléments interactifs adulte | `a11y('min-touch-target')`       | 44px   | WCAG AA        |
| Tableau enfant (TSA)             | `a11y('preferred-touch-target')` | 56px   | Recommandé TSA |
| Icônes/éléments secondaires      | `a11y('optimal-touch-target')`   | 48px   | Compromis      |

```scss
// Via mixin (recommandé)
@include touch-target('min'); // 44px adulte
@include touch-target('preferred'); // 56px Tableau enfant

// Via a11y() si besoin de contrôle fin
min-height: a11y('preferred-touch-target'); // 56px
min-width: a11y('preferred-touch-target');
```

### Focus visible

Obligatoire sur **tous** les éléments interactifs. Jamais `:focus { outline: none }`.

```scss
&:focus-visible {
  outline: a11y('focus-ring-width') solid var(--color-primary); // 2px #0077c2
  outline-offset: a11y('focus-ring-offset'); // 2px
}
```

### Prefers-reduced-motion

**Obligatoire** sur toute animation ou transition.

Utiliser systématiquement `@include safe-transition()` et `@include safe-animation()`.

Pour les `@keyframes` et blocs `animation:` manuels :

```scss
@media (prefers-reduced-motion: reduce) {
  .mon-element {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

### Contraintes de durée

- Interactions (hover, focus) : ≤ 150–200ms → `timing('xs')` ou `timing('sm')`
- Changements d'état : ≤ 300ms → `timing('base')`
- Reveals, appears : ≤ 500ms → `timing('lg')` (exceptionnel)
- Animations continues (spinners) : avec `prefers-reduced-motion` obligatoire

---

## 7. Contraintes UX TSA

### Public utilisateur

- **Contexte adulte** : parents, éducateurs, thérapeutes — contextes Édition, Admin, Profil, pages publiques
- **Contexte enfant (Tableau)** : enfants TSA — règles UX renforcées

### Deux contextes séparés

| Contrainte     | Adulte                     | Enfant (Tableau)              |
| -------------- | -------------------------- | ----------------------------- |
| Touch targets  | min 44px                   | min 56px, préféré 64px        |
| Radius cards   | `radius('card')` = 12px    | `radius('large')` = 20px      |
| Radius boutons | `radius('button')` = 6px   | `radius('medium')` = 12px     |
| Gap sections   | `spacing('grid-gap')` 16px | `spacing('section-gap')` 48px |
| Font body      | `font-size('base')` 16px   | `font-size('lg')` 18px        |

### Règles visuelles non-négociables

- **Transitions** : ≤ 200ms pour interactions, ≤ 300ms pour changements d'état
- **Bounce/pulse forts** : interdits — les animations agressives désorganisent les enfants TSA
- **Messages techniques** côté enfant : interdits — pas de stack traces, codes d'erreur, messages HTTP
- **Interface calme et prévisible** : pas de mouvement intempestif, pas d'auto-focus surprise
- **Contraste texte** : ≥ 4.5:1 (WCAG AA), viser 7:1 pour le texte principal côté enfant
- **Opacité disabled** : toujours `opacity('half')` + `pointer-events: none` — jamais de couleur disabled
- **Focus visible** : `2px solid var(--color-primary)` avec `outline-offset: 2px` — jamais supprimé

### Cartes validées — principe de célébration

Une carte validée dans le Tableau enfant n'est **jamais** "désactivée" visuellement.

```scss
&--completed {
  opacity: opacity('lg'); // 85% — présente mais calme
  border-color: semantic('success');
  background-color: tsa-pastel('green-soft');
  pointer-events: none; // Non-cliquable mais visible
}
```

---

## 8. Les 3 systèmes architecturalement séparés

L'application distingue 3 systèmes métier **hermétiquement séparés** au niveau CSS, composants et base de données. Les styles NE DOIVENT PAS fusionner ces 3 systèmes.

| Système                | Périmètre CSS                                       | Composants concernés                                |
| ---------------------- | --------------------------------------------------- | --------------------------------------------------- |
| **Planning visuel**    | Gestion des timelines, slots, séquences d'activités | `SlotsEditor`, `SlotItem`, `CardPicker`, timeline   |
| **Économie de jetons** | Récompenses, tokens gagnés, tableau de motivations  | `TokensGrid`, `SelectedRewardFloating`, récompenses |
| **Séquençage**         | Séquences d'étapes dans l'exécution d'une tâche     | `SequenceEditor`, `SequenceMiniTimeline`            |

**Règles** :

- Un composant de Planning n'importe pas les styles d'un composant de Séquençage
- Les classes BEM ne se chevauchent pas entre systèmes (`slots-editor__*`, pas `sequence-editor__*`)
- Les états CSS propres à un système restent isolés dans leurs fichiers SCSS

---

## 9. Palette sémantique active

### Variables CSS globales (après T1-C résolu — commit 963fe21)

```scss
:root {
  --color-primary: #0077c2; // Bleu brand — boutons, liens, focus
  --color-primary-hover: #005a94;
  --color-primary-subtle: #e6f2fa;

  --color-success: #16a34a; // Vert — validation, carte validée
  --color-success-hover: #14803d;
  --color-success-subtle: #dcfce7;

  --color-warning: #f59e0b; // Ambre — alerte non-bloquante
  --color-warning-hover: #d97706;
  --color-warning-subtle: #fef3c7;

  --color-danger: #dc2626; // Rouge — destruction irréversible UNIQUEMENT
  --color-danger-hover: #b91c1c;
  --color-danger-subtle: #fee2e2;

  --color-info: #3b82f6; // Bleu ciel — message informatif neutre
  --color-info-hover: #2563eb;
  --color-info-subtle: #dbeafe;

  --color-accent: #ffb400; // Jaune — récompense, train, célébration (décoratif)
  --color-accent-hover: #d97706;
  --color-accent-subtle: #fef3c7;

  --color-text: #334155; // Texte principal
  --color-text-muted: #64748b;
  --color-bg: #ffffff;
  --color-surface: #f8fafc;
  --color-border: #e2e8f0;
}
```

### Règles d'usage

1. Jamais de hex direct dans un composant — toujours `var(--color-*)` ou fonctions wrapper
2. `danger` = destruction irréversible uniquement (pas "Réinitialiser mot de passe" qui est `warning`)
3. `accent` = décoratif uniquement — pas sur du texte ou bouton principal
4. `primary` ≤ 30% de la surface d'un écran
5. Un seul rôle sémantique par couleur (rouge = danger uniquement)

### `semantic('info-primary')` — Cas particulier legacy

```scss
semantic('info-primary')  // → #66c3f7 (bleu clair, ratio contraste 1.96:1)
```

Cette clé est **intentionnellement hardcodée** en tant que valeur legacy décorativ. Utilisée uniquement pour fonds et bordures décoratives dans : `TrainProgressBar`, `TachesDnd`, `TimeTimer`, `CardsEdition`.

⚠️ **NE PAS utiliser pour du texte** sur fond blanc (ratio 1.96:1 insuffisant, non-conforme WCAG AA).

### Couleurs de rôles utilisateurs (système séparé)

Non-fusionnable avec la palette sémantique d'action. Interface adulte uniquement.

| Rôle    | Variable CSS           | Valeur                       | Accès SCSS              |
| ------- | ---------------------- | ---------------------------- | ----------------------- |
| Admin   | `var(--color-admin)`   | `#667eea` (violet, immuable) | `role-color('admin')`   |
| Abonné  | `var(--color-abonne)`  | `#22c55e` (vert)             | `role-color('abonne')`  |
| Free    | `var(--color-free)`    | `#64748b` (slate)            | `role-color('free')`    |
| Visitor | `var(--color-visitor)` | `#ea580c` (orange)           | `role-color('visitor')` |
| Staff   | —                      | `#8b5cf6` (violet saturé)    | `role-color('staff')`   |

---

## 10. Tooling de protection CSS

### Deux barrières indépendantes

**Barrière 1** : Hooks Claude Code CLI (`.claude/settings.json`) — pendant les sessions Claude.

**Barrière 2** : Husky + pre-commit unifié (`.husky/pre-commit` → `.claude/scripts/pre-commit.sh`) — à chaque `git commit`, toute origine.

### Scripts de protection CSS

#### `scripts/check-hardcoded.js` (`pnpm lint:hardcoded`)

- **Détecte** : hex colors (`#fff`, `#ffffff`), RGB/RGBA hardcodés, px dans propriétés spacing
- **Exclusions** : `src/styles/abstracts/`, `src/styles/base/`, `src/styles/themes/`, `src/styles/vendors/`
- **Faux positifs filtrés** : lignes contenant `spacing(`, `a11y(`, `var(--`
- **Mode** : bloquant (`exit 1`)
- **Déclenché** : Husky pre-commit + hook Claude PostToolUse (advisory non-bloquant)

#### `scripts/check-touch-targets.js` (`pnpm validate:touch-targets`)

- **Détecte** : fichiers SCSS avec éléments interactifs sans token de touch-target
- **Patterns valides** : `@include touch-target`, `min-height: a11y(...)`, `min-height: spacing('44|48|56')`
- **Mode** : warning (`exit 0`)
- **Déclenché** : Husky pre-commit

#### `.claude/scripts/check-mobile-first.sh`

- **Détecte** : `@media max-width` (desktop-first interdit)
- **Mode** : bloquant dans pre-commit
- **Déclenché** : hook Claude PreToolUse + pre-commit

#### Hook Claude `check-hardcoded-scss.sh`

- Version advisory du check hardcoded, déclenché PostToolUse Edit(`*.scss`)
- Non-bloquant (conseil uniquement pendant la session Claude)

### Tests automatisés CSS

#### VRT Playwright (`pnpm test:visual`)

- 18 screenshots baseline versionnés
- Comparaison pixel-perfect (maxDiffPixelRatio: 0.01)
- `reducedMotion: 'reduce'` activé pour stabilité
- Mise à jour baseline : `pnpm test:visual:update`

#### Axe-core (`pnpm test:a11y`)

- Audit WCAG AA runtime sur 9 écrans clés
- Baseline : 0 violations critical, 0 serious, 1 moderate (VIO-5 landmark timing — faux positif)
- Via `@axe-core/playwright`

#### Hooks versionnés

- Husky 9.1.7 — `.husky/pre-commit` versionné dans Git
- Portable : `pnpm install` réinstalle les hooks automatiquement

---

## 11. Dette connue et documentée

### T1-B — Conflit `shadow()` (en cours)

**Nature** : la fonction `shadow()` exposée via `_index.scss` (depuis `_colors.scss`) lit `$shadow-tokens` (legacy) directement. Les aliases sémantiques de `$shadow-semantic` (`card`, `card-hover`, `button`, `modal`) ne sont pas lus par ce wrapper.

**Impact** :

- `shadow('card')` sans variant → retourne une Sass map → CSS invalide
- `shadow('card-hover')` → clé inexistante dans `$shadow-tokens` → ERREUR BUILD
- `$shadow-semantic` dans `_semantics.scss` = inaccessible via `shadow()`

**Contournement** :

- Composants atomiques : pas de `box-shadow` via `shadow()`
- Élévations : `shadow('elevation-sm')`, `shadow('elevation-md')`, etc.
- Accès nested : `shadow('card', 'hover')` avec variant explicite
- Exception documentée (hardcoded + `// TODO: migrer vers shadow('card-hover') après T1-B`)

**Résolution prévue** : renommer `shadow()` de `_colors.scss` en `shadow-color()`, exposer `shadow()` de `_shadows.scss` avec fallback semantics → primitives.

### T2-E — `font-size()`, `timing()`, `easing()` orphelins des semantics

**Nature** : les wrappers `font-size()`, `timing()`, `easing()` lisent uniquement les maps legacy (`$font-size-tokens`, `$motion-tokens`). Les aliases sémantiques (`$typography-semantic`, `$motion-semantic`) sont définis mais non branchés.

**Impact** :

- `font-size('body')`, `font-size('heading-md')` → ERREUR BUILD
- `timing('fast')` fonctionne mais via legacy, pas semantics
- Valeurs semantics non accessibles via fonctions publiques

**Contournement** : utiliser les clés de l'échelle legacy (`font-size('base')`, `font-size('lg')`, `timing('xs')`, etc.).

### `semantic('info-primary')` — Legacy décoratif

**Nature** : valeur hardcodée `#66c3f7` (bleu clair, ratio contraste 1.96:1).

**Impact** : non-conforme WCAG AA pour du texte.

**Contournement** : usage uniquement pour fonds et bordures décoratives. Ne pas utiliser pour du texte.

---

## 12. Checklist avant tout commit CSS

Reproduite depuis `docs/refonte_front/direction-visuelle-v1.1.md` (Annexe — Checklist d'acceptation).

- [ ] Utilise uniquement des `var(--color-*)` (pas de hex direct)
- [ ] Utilise les aliases sémantiques composants pour radius (`radius('button')`, `radius('card')`, `radius('modal')`) — jamais les clés primitives (`md`, `lg`, `xl`) ni legacy (`rounded-Npx`)
- [ ] Utilise les aliases sémantiques composants pour spacing (`spacing('card-padding')`, `spacing('button-padding-x')`, etc.) — jamais de valeurs hardcodées ni de clés primitives seules
- [ ] Utilise les clés de l'échelle typographique legacy (`font-size('base')`, `font-size('lg')`, etc.) — pas les aliases orphelins `body`/`heading-*` tant que T2-E n'est pas fait
- [ ] Utilise l'un des 3 poids actifs : `regular` (400), `semibold` (600), `bold` (700)
- [ ] **N'utilise pas `box-shadow` via wrapper `shadow()` sur composants atomiques** tant que T1-B n'est pas résolu — ou exception explicitement documentée avec `// TODO`
- [ ] A un focus clavier visible (`outline: 2px solid var(--color-primary)` + `outline-offset: 2px`)
- [ ] Transitions ≤ 200ms (interactions) ou ≤ 300ms (changements d'état) via `@include safe-transition()`
- [ ] Prefers-reduced-motion respecté (via `@include safe-transition()` ou bloc `@media (prefers-reduced-motion: reduce)`)
- [ ] Mobile-first : `@media (min-width: ...)` uniquement, jamais `max-width`
- [ ] Testé visuellement sur mobile (320px), tablette (768px), desktop (1200px)
- [ ] Targets tactiles ≥ 44px adulte (`@include touch-target('min')`) ou ≥ 56px enfant (`@include touch-target('preferred')`)
- [ ] Contraste texte ≥ 4.5:1 (viser 7:1 pour texte principal côté enfant)
- [ ] `pnpm lint:hardcoded` → 0 violation
- [ ] `pnpm validate:touch-targets` → 0 suspect (ou justification en commentaire)
- [ ] `pnpm check` → lint + format passent

---

_Document généré le 2026-04-26. Prochaine mise à jour après résolution T1-B et T2-E._
