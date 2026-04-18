# Audit Structurel — `src/styles/`

**Date** : 2026-04-18
**Branche** : `refactor/db-first-init`
**Auditeur** : Claude Code (claude-sonnet-4-6)

---

## 1. CARTOGRAPHIE FICHIERS

### `src/styles/abstracts/` (système de tokens — aucun CSS généré ici sauf `:root`)

| Fichier                   | Lignes | Premier commentaire                           | Dernier commit                               |
| ------------------------- | ------ | --------------------------------------------- | -------------------------------------------- |
| `_tokens.scss`            | 1583   | `/// TOKENS SYSTEM - SOURCE DE VÉRITÉ UNIQUE` | `2026-04-18` — refactor migrate rounded-12px |
| `_primitives.scss`        | 477    | `/// PRIMITIVES - PHASE 6`                    | `2026-01-01` — feat time-timer               |
| `_semantics.scss`         | 483    | `/// SEMANTICS - PHASE 6`                     | `2026-01-01` — feat time-timer               |
| `_colors.scss`            | 504    | (wrapper pur, commentaire interne)            | `2026-04-17` — remove dead code              |
| `_spacing.scss`           | 146    | `/// SPACING SYSTEM - Wrapper Intelligent`    | `2026-01-01` — feat time-timer               |
| `_radius.scss`            | 166    | `/// BORDER RADIUS - Wrapper Intelligent`     | `2026-04-18` — migrate rounded-12px          |
| `_shadows.scss`           | 358    | `/// SHADOWS SYSTEM - Wrapper Intelligent`    | `2026-01-01` — feat time-timer               |
| `_typography.scss`        | 233    | `/// TYPOGRAPHY SYSTEM - Wrapper pur`         | `2025-12-19` — migration wrapper pur         |
| `_motion.scss`            | 205    | `/// MOTION SYSTEM - Wrapper pur`             | `2025-12-19` — migration wrapper pur         |
| `_breakpoints.scss`       | 128    | `/// BREAKPOINTS - Wrapper pur`               | `2025-12-27` — ajout breakpoint-max()        |
| `_mixins.scss`            | 563    | (mixins BEM/responsive)                       | `2025-12-26` — formatage linter              |
| `_size.scss`              | 117    | `/// SIZE SYSTEM - Dimensions structurelles`  | `2025-12-18` — infrastructure v2.1           |
| `_a11y-tokens.scss`       | 139    | `/// ACCESSIBILITY TOKENS - Wrapper pur`      | `2025-12-19` — migration Phase 5.1           |
| `_borders.scss`           | 90     | (border-width tokens)                         | `2025-12-18` — migration wrapper pur         |
| `_container-queries.scss` | 177    | (container queries)                           | `2025-12-19` — migration wrapper pur         |
| `_forms.scss`             | 386    | (forms helpers)                               | `2026-04-18` — migrer spacing numériques     |
| `_functions.scss`         | 14     | `/// Convertit une valeur px en rem`          | `2025-12-26` — suppression \_variables.scss  |
| `_index.scss`             | 43     | `// abstracts/_index.scss`                    | `2026-01-01` — feat time-timer               |

### `src/styles/base/` (CSS généré appliqué au DOM)

| Fichier                 | Lignes | Rôle                                             | Dernier commit                               |
| ----------------------- | ------ | ------------------------------------------------ | -------------------------------------------- |
| `_reset.scss`           | 93     | Reset CSS                                        | `2025-12-11` — css refactor phase 1          |
| `_accessibility.scss`   | 479    | Styles a11y globaux                              | `2026-04-18` — migrer spacing numériques     |
| `_helpers.scss`         | 107    | Classes utilitaires                              | `2026-04-18` — migrer spacing numériques     |
| `_reduced-motion.scss`  | 36     | prefers-reduced-motion                           | `2025-12-19` — migration themes tokens-first |
| `_animations.scss`      | 3      | Intentionnellement vide (keyframes = composants) | `2025-12-11`                                 |
| `_typography-base.scss` | 0      | **FICHIER VIDE**                                 | `2025-12-11`                                 |
| `_index.scss`           | 21     | Forward base/                                    | `2025-12-14`                                 |

### `src/styles/themes/`

| Fichier       | Lignes | Dernier commit                        |
| ------------- | ------ | ------------------------------------- |
| `_light.scss` | 88     | `2025-12-19` — migration tokens-first |
| `_dark.scss`  | 135    | `2025-12-19` — migration tokens-first |
| `_index.scss` | 11     | `2025-12-19` — migration tokens-first |

### `src/styles/vendors/`

| Fichier           | Lignes | Dernier commit                           |
| ----------------- | ------ | ---------------------------------------- |
| `_normalize.scss` | 351    | `2025-08-02` — supabase (premier commit) |
| `_index.scss`     | 2      | `2025-08-02` — supabase                  |

### `src/styles/` (racine)

| Fichier     | Lignes | Rôle                                                                          |
| ----------- | ------ | ----------------------------------------------------------------------------- |
| `main.scss` | 37     | Point d'entrée unique, importé par `src/app/layout.tsx`                       |
| `main.css`  | 1101   | **Artéfact obsolète** — généré par ancienne CLI Sass standalone, plus utilisé |

---

## 2. INVENTAIRE MAPS ET VARIABLES — `abstracts/`

### `_tokens.scss` — Source legacy (1583 lignes)

**Maps définies** (toutes préfixées `$*-tokens`) :

| Map                                                              | Nb clés approx.               | Rôle                                                 |
| ---------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------- |
| `$role-color-tokens`                                             | 5 rôles × 5 variantes         | Couleurs admin/abonné/free/visitor/staff             |
| `$ui-gradients`                                                  | 6                             | Dégradés UI modernes                                 |
| `$badge-gradients`                                               | 4                             | Dégradés badges rôles                                |
| `$badge-shadow-tokens`                                           | 4 rôles × 2                   | Ombres badges (nested)                               |
| `$badge-shadows`                                                 | 8                             | Legacy compat (plat)                                 |
| `$opacity-tokens`                                                | ~21                           | Échelle opacité 0–1                                  |
| `$z-index-tokens`                                                | 12                            | Hiérarchie z-index                                   |
| `$brand-color-tokens`                                            | 3 marques × 3                 | Couleurs Stripe/Google/Apple                         |
| `$brand-colors`                                                  | 2                             | Legacy compat plat                                   |
| `$blue/red/green/orange/yellow/purple/slate/gray-palette-tokens` | 10 chacune                    | Palettes couleurs (8 maps)                           |
| `$primary/secondary/accent-color-tokens`                         | 2–3 chacune                   | Couleurs marque                                      |
| `$text-color-tokens`                                             | 5                             | Textes (default, invert, light, dark, muted)         |
| `$surface-color-tokens`                                          | 6                             | Surfaces (bg, surface, border, soft, hover, overlay) |
| `$warning-state-color-tokens`                                    | 10                            | Warning + Error states détaillés                     |
| `$tsa-pastel-color-tokens`                                       | 5                             | Pastels TSA                                          |
| `$shadow-color-tokens`                                           | 6                             | Couleurs d'ombres utilitaires                        |
| `$breakpoint-tokens`                                             | 6                             | Mobile/sm/md/lg/xl/xxl                               |
| `$semantic-tokens`                                               | 4 × 5 (nested)                | **Legacy** success/warning/error/info                |
| `$spacing-tokens`                                                | ~49                           | Espacement (sémantiques + numériques)                |
| `$size-tokens`                                                   | ~70+                          | Dimensions structurelles                             |
| `$font-size-tokens`                                              | 9                             | xs→5xl (Tailwind-like)                               |
| `$line-height-tokens`                                            | 6                             | none/tight/snug/normal/relaxed/loose                 |
| `$font-weight-tokens`                                            | 11                            | thin→black + aliases                                 |
| `$motion-tokens`                                                 | nested (timing/easing/preset) | Durées + courbes + presets                           |
| `$border-width-tokens`                                           | ~22                           | Largeurs bordures                                    |
| `$radius-tokens`                                                 | 14                            | Scale + aliases sémantiques UI                       |
| `$container-query-tokens`                                        | 6                             | xs→2xl                                               |
| `$a11y-tokens`                                                   | 12                            | WCAG + TSA                                           |
| `$shadow-tokens`                                                 | ~40 (nested multi-niveaux)    | Ombres (elevation + contexts)                        |

**Fonctions définies dans `_tokens.scss`** :

| Fonction            | Lit depuis                                                   |
| ------------------- | ------------------------------------------------------------ |
| `opacity($key)`     | `$opacity-tokens`                                            |
| `z-index($key)`     | `$z-index-tokens`                                            |
| `spacing($key)`     | `$spacing-tokens` (**shadowed** par wrapper `_spacing.scss`) |
| `line-height($key)` | `$line-height-tokens`                                        |

### `_primitives.scss` — Nouveau système Phase 6 (477 lignes)

**Maps définies** :

| Map                     | Nb clés                          | Rôle                                     |
| ----------------------- | -------------------------------- | ---------------------------------------- |
| `$palettes-primitives`  | 6 palettes × ~11 nuances         | neutral/brand/success/warning/error/info |
| `$spacing-primitives`   | ~16 sémantiques + ~27 numériques | Grille 4px + labels                      |
| `$size-primitives`      | ~30                              | Touch targets + icons + containers       |
| `$radius-primitives`    | 11                               | 6/12/20px TSA-friendly + 3 `rounded-Npx` |
| `$font-size-primitives` | 9                                | xs→5xl                                   |
| `$motion-primitives`    | nested (timing/easing)           | Durées + easings                         |
| `$shadow-primitives`    | 7                                | none→2xl                                 |

**Fonctions** : `palette($palette, $shade)` — accès aux palettes.

### `_semantics.scss` — Couche métier Phase 6 (483 lignes)

**Maps définies** (toutes `$*-semantic`) :

| Map                        | Nb clés | Mappe vers                             |
| -------------------------- | ------- | -------------------------------------- |
| `$color-semantic-text`     | 6       | `$palettes-primitives[neutral]`        |
| `$color-semantic-surface`  | 8       | `$palettes-primitives[neutral]`        |
| `$color-semantic-feedback` | 16      | palettes success/warning/error/info    |
| `$color-semantic-roles`    | 20      | palettes brand/success/neutral/warning |
| `$color-semantic-brand`    | 6       | palette brand                          |
| `$spacing-semantic`        | 15      | `$spacing-primitives`                  |
| `$size-semantic`           | 17      | `$size-primitives`                     |
| `$radius-semantic`         | 12      | `$radius-primitives`                   |
| `$typography-semantic`     | 13      | `$font-size-primitives`                |
| `$shadow-semantic`         | 12      | `$shadow-primitives`                   |
| `$motion-semantic`         | 9       | `$motion-primitives`                   |

**Fonctions** : `semantic-text()`, `semantic-surface()`, `semantic-feedback()`, `semantic-role()`, `semantic-spacing()`, `semantic-size()`, `semantic-radius()`, `semantic-typography()`, `semantic-shadow()`, `semantic-motion()`.

### `_colors.scss` — Wrapper pur couleurs (504 lignes)

**Aucune map définie** — wrapper pur.

**Fonctions** : `color()`, `semantic()`, `gray/blue/red/green/orange/yellow/purple/slate()`, `white/black()`, `role-color()`, `text()`, `surface()`, `warning()`, `badge-gradient()`, `ui-gradient()`, `badge-shadow()`, `tsa-pastel()`, `shadow()` (**conflit de nom**), `brand()`, `gradient()`, `gradient-radial()`.

> ⚠️ **Conflit** : `_colors.scss` exporte une fonction `shadow($key)` qui lit `$shadow-color-tokens` (couleurs RGBA), tandis que `_shadows.scss` exporte une autre fonction `shadow($key)` qui lit `$shadow-tokens` (box-shadow complets). Les deux sont forwardées dans `_index.scss` — ce qui signifie que l'une shadow l'autre. Voir section 4.

### `_spacing.scss`, `_radius.scss`, `_shadows.scss` — Wrappers intelligents

Fonctions wrapper respectivement : `spacing()`, `spacing-value()` / `radius()`, `radius-value()` / `shadow()` (elevation) + `card-shadow()`, `role-shadow()`, `admin-shadow()`, `button-shadow()`, `badge-shadow()`, `input-shadow()`, `modal-shadow()`, `text-shadow()`.

### `_typography.scss` — Wrapper pur (233 lignes)

**Variables** : `$text-font-stack`, `$heading-font-stack`, `$lexend-font-stack`, `$mono-font-stack`.
**Fonctions** : `font-size($key)`, `font-weight($key)`, `line-height($key)`.
**Mixins** : `typography($variant)`, `font-tsa`, `font-text`, `font-heading`.

### `_motion.scss` — Wrapper pur (205 lignes)

**Fonctions** : `timing($key)`, `easing($key)`, `motion-preset($key)`.
**Mixins** : `transition()`, `motion-preset-transition()`.

### `_breakpoints.scss` — Wrapper pur (128 lignes)

**Variables** : `$breakpoint-sm/md/lg/xl/xxl` (legacy compat).
**Fonctions** : `breakpoint($name)`, `breakpoint-max($name)`.
**Mixins** : `respond-to($breakpoint-name)`.

---

## 3. SOURCE DE VÉRITÉ PAR CATÉGORIE

### 3.1 COLORS

Fichiers impliqués : `_tokens.scss`, `_primitives.scss`, `_semantics.scss`, `_colors.scss`.

**Architecture en 3 couches** :

- **Primitives** (`_primitives.scss`) : palettes hex brutes (neutral, brand, success, warning, error, info)
- **Semantics** (`_semantics.scss`) : intentions métier (text/surface/feedback/roles), dérivées des primitives
- **Legacy** (`_tokens.scss`) : 8 palettes couleur (blue/red/green/orange/yellow/purple/slate/gray), `$primary/secondary/accent-color-tokens`, `$text-color-tokens`, `$surface-color-tokens`, `$warning-state-color-tokens`, `$tsa-pastel-color-tokens`, `$semantic-tokens`, `$role-color-tokens`, `$shadow-color-tokens`

**Conflit détecté** : `$semantic-tokens` (legacy dans `_tokens.scss`) et `$color-semantic-feedback` (Phase 6 dans `_semantics.scss`) couvrent le même périmètre (success/warning/error/info) avec des valeurs différentes :

| Rôle         | `$semantic-tokens` (legacy) | `$color-semantic-feedback` (Phase 6) |
| ------------ | --------------------------- | ------------------------------------ |
| success base | `#4caf50`                   | `#10b981` (via palette success-500)  |
| warning base | `#ff9800`                   | `#f97316` (via palette warning-500)  |
| error base   | `#f44336`                   | `#ef4444` (via palette error-500)    |
| info base    | `#2196f3`                   | `#0ea5e9` (via palette info-500)     |

**Verdict : `CONFLIT`** — deux systèmes sémantiques parallèles actifs, valeurs différentes.

De plus, `$primary-color-tokens.base = #0077c2` (bleu) alors que la direction-visuelle-v1.md fixe le `--color-primary` à `#0077c2` pour l'adulte et que `$color-semantic-brand.primary = #667eea` (violet). Ces deux tokens "primary" cohabitent avec des identités différentes.

### 3.2 SPACING

Fichiers impliqués : `_tokens.scss` (`$spacing-tokens`), `_primitives.scss` (`$spacing-primitives`), `_semantics.scss` (`$spacing-semantic`).

**Fallback en 3 couches dans `spacing()`** : semantics → primitives → legacy.

`$spacing-primitives` contient les clés numériques brutes (`'4'`, `'8'`, `'16'`, `'24'`, `'32'`, etc.) qui ont été **supprimées** de `$spacing-tokens` lors du commit `be2db23`. Ces mêmes clés numériques existent donc uniquement dans `$spacing-primitives` désormais — le fallback les retrouve via la couche primitive.

**Verdict : `SOURCES MULTIPLES COHÉRENTES`** — les 3 couches sont hiérarchisées et la fonction `spacing()` les traverse correctement. Le risque est surtout la confusion entre `spacing-primitives` (grille 4px stricte) et `spacing-tokens` (legacy avec des valeurs hors-grille type `'3'`, `'14'`, `'15'`, `'25'`, `'26'`, `'39'`).

### 3.3 RADIUS

Fichiers impliqués : `_tokens.scss` (`$radius-tokens`), `_primitives.scss` (`$radius-primitives`), `_semantics.scss` (`$radius-semantic`).

**Conflit de valeurs entre les deux couches de tokens** :

| Clé   | `$radius-tokens` (legacy) | `$radius-primitives` (Phase 6) |
| ----- | ------------------------- | ------------------------------ |
| `xs`  | `2px`                     | `0.25rem` (4px)                |
| `sm`  | `4px`                     | `0.375rem` (6px)               |
| `md`  | `8px`                     | `0.75rem` (12px)               |
| `lg`  | `16px`                    | `1.25rem` (20px)               |
| `xl`  | `20px`                    | `1.5rem` (24px)                |
| `2xl` | `24px`                    | `2rem` (32px)                  |

La fonction `radius()` applique la priorité : semantics → primitives → legacy. Un appel `radius('md')` renvoie donc `12px` (via `$radius-semantic` → `$radius-primitives`), **non** `8px` (legacy). Les composants non encore migrés vers les aliases sémantiques (`card`, `button`, `input`) obtiennent les nouvelles valeurs TSA-friendly sans action de leur part.

**Verdict : `SOURCES MULTIPLES COHÉRENTES (avec intention)` mais attention** — la couche legacy `$radius-tokens` reste le fallback pour les clés `'default'`, `'card'` (legacy 16px), `'button'`, `'input'`, `'avatar'`, `'badge'`, `'modal'`, `'drawer'`, `'tooltip'`. Ces clés existent aussi dans `$radius-semantic` avec des valeurs différentes (ex : `card` → 12px en semantic vs 16px en legacy). La priorité semantic l'emporte, le comportement est intentionnel.

**`$radius-primitives` contient encore `rounded-6px`, `rounded-10px`, `rounded-12px`** — voir section 5.

### 3.4 TYPOGRAPHY

Fichiers impliqués : `_tokens.scss` (`$font-size-tokens`, `$font-weight-tokens`, `$line-height-tokens`), `_primitives.scss` (`$font-size-primitives`), `_semantics.scss` (`$typography-semantic`).

`font-size()` lit uniquement `$font-size-tokens` (canonical dans `_tokens.scss`). Pas de fallback Phase 6 pour la typographie — contrairement au spacing et au radius, le wrapper `_typography.scss` ne passe pas par semantics ni primitives.

`$font-size-primitives` dans `_primitives.scss` est identique à `$font-size-tokens` (mêmes clés, mêmes valeurs). Duplication inerte pour l'instant.

**Verdict : `SOURCE UNIQUE` pour les fonctions actives** (`$font-size-tokens` dans `_tokens.scss`).

### 3.5 MOTION

Fichiers impliqués : `_tokens.scss` (`$motion-tokens`), `_primitives.scss` (`$motion-primitives`), `_semantics.scss` (`$motion-semantic`).

`timing()` et `easing()` lisent uniquement `$motion-tokens` dans `_tokens.scss`. Les `$motion-primitives` et `$motion-semantic` existent mais ne sont pas consommés par les wrappers actifs.

**Verdict : `SOURCE UNIQUE`** pour les fonctions actives. `$motion-primitives` et `$motion-semantic` sont définis mais orphelins pour l'instant.

### 3.6 SHADOWS

Fichiers impliqués : `_tokens.scss` (`$shadow-tokens`, `$shadow-color-tokens`, `$badge-shadow-tokens`), `_primitives.scss` (`$shadow-primitives`), `_semantics.scss` (`$shadow-semantic`), `_colors.scss` (fonction `shadow()` sur `$shadow-color-tokens`), `_shadows.scss` (fonction `shadow()` sur elevation).

**Conflit de nommage critique** : deux fonctions `shadow()` sont définies :

1. Dans `_colors.scss` : `shadow($key)` → lit `$shadow-color-tokens` (couleurs RGBA de type `'black-light'`, `'primary-medium'`)
2. Dans `_shadows.scss` : `shadow($key)` → lit `$shadow-semantic` → `$shadow-primitives` → `$shadow-tokens` (box-shadow complets)

Dans `_index.scss`, les deux sont forwardées via la règle `@forward './colors' show ..., shadow, ...`. La présence des deux dans le même scope via `@use '..abstracts' as *` implique que l'une shadow l'autre (celle importée en dernier gagne). Puisque `_colors.scss` est forwardée et que `_shadows.scss` n'est **pas** forwardée dans `_index.scss` (commentée intentionnellement), `shadow()` accessible via `@use abstracts` est la version de `_colors.scss` — mais `main.scss` importe `_shadows.scss` explicitement, ce qui instancie ses CSS vars et mixins.

**Verdict : `CONFLIT`** — nommage ambigu entre `shadow()` couleur et `shadow()` elevation.

### 3.7 Z-INDEX

Fichier unique : `_tokens.scss` (`$z-index-tokens`).
Fonction : `z-index($key)` dans `_tokens.scss`.
**Verdict : `SOURCE UNIQUE`**.

### 3.8 BREAKPOINTS

Fichier unique : `_tokens.scss` (`$breakpoint-tokens`).
Fonction : `breakpoint()` / mixin `respond-to()` dans `_breakpoints.scss`.
**Verdict : `SOURCE UNIQUE`**.

---

## 4. ORPHELINS ET DEAD CODE

### 4.1 Fichiers jamais `@use`/`@forward`

- **`src/styles/main.css`** (1101 lignes) — artéfact de compilation Sass CLI standalone de l'ancienne architecture. Aucun import vers ce fichier dans `src/` ou `app/`. Peut être supprimé.
- **`src/styles/base/_typography-base.scss`** (0 lignes) — fichier vide, forwardé par `_base/_index.scss`. Inoffensif mais inutile.

### 4.2 Maps/variables jamais référencées dans les composants

**`$motion-primitives`** (`_primitives.scss`) : défini mais jamais consommé par les wrappers actifs (`timing()` et `easing()` lisent uniquement `$motion-tokens`). Usage indirect via `$motion-semantic` possible mais `_motion.scss` ne passe pas par semantics.

**`$font-size-primitives`** (`_primitives.scss`) : duplique `$font-size-tokens`. `font-size()` lit `$font-size-tokens` directement. Orphelin actif.

**`$size-semantic`** (`_semantics.scss`) : défini, mais `size()` (`_size.scss`) lit uniquement `$size-tokens` sans fallback semantics/primitives. Orphelin.

**`$typography-semantic`** (`_semantics.scss`) : défini, mais `font-size()` ne passe pas par ce niveau. Orphelin.

**`$motion-semantic`** (`_semantics.scss`) : défini, mais `timing()`/`easing()` ne passent pas par ce niveau. Orphelin.

**`$badge-shadow-tokens`** (`_tokens.scss`) : map distincte de `$shadow-tokens['badge']`. Aucun usage composant détecté.

**`$badge-shadows`** (`_tokens.scss`) : legacy flat map. `badge-shadow()` dans `_colors.scss` lit cette map. Aucun usage composant détecté.

**`admin-shadow($key)`** (`_shadows.scss`) : fonction définie, lit `$shadow-tokens['admin-ui']`. Aucun appel dans les composants SCSS. Orpheline.

**`rem($px)`** (`_functions.scss`) : aucun usage composant. Seule la définition existe.

### 4.3 Fonctions orphelines

| Fonction                                                                             | Définie dans      | Usage composants                                          |
| ------------------------------------------------------------------------------------ | ----------------- | --------------------------------------------------------- |
| `rem($px)`                                                                           | `_functions.scss` | **Aucun**                                                 |
| `admin-shadow($key)`                                                                 | `_shadows.scss`   | **Aucun**                                                 |
| `semantic-text/surface/feedback/role/spacing/size/radius/typography/shadow/motion()` | `_semantics.scss` | **Aucun direct** (consommées en interne par les wrappers) |
| `motion-preset($key)`                                                                | `_motion.scss`    | Rare, via `motion-preset-transition()` mixin              |

---

## 5. IMPACT SUR LES 5 COMMITS PRÉCÉDENTS

### Commit `a11ec3a` — clean rounded-Npx in `$radius-tokens`

Ce commit a supprimé 9 clés `rounded-Npx` de `$radius-tokens` dans `_tokens.scss` et redirigé les usages vers les aliases sémantiques (`sm`, `md`, `2xl`). Il a intentionnellement conservé `rounded-12px` (14 usages sur pages publiques critiques).

**`$radius-primitives` dans `_primitives.scss` contient encore** :

- `'rounded-6px': 0.375rem` (6px)
- `'rounded-10px': 0.625rem` (10px)
- `'rounded-12px': 0.75rem` (12px)

Ces 3 clés sont dans la couche primitive, **non** dans `$radius-tokens`. La fonction `radius()` les retrouve via le fallback primitives (étape 2). Elles ne sont plus appelées activement dans les composants SCSS (les commentaires des fichiers de composants les mentionnent encore mais les appels ont été remplacés).

### Commit `c4eeb51` — migrate rounded-12px to lg (16px)

Ce commit a :

1. Migré les 14 usages `radius('rounded-12px')` → `radius('lg')` dans les composants
2. Supprimé `'rounded-12px'` de `$radius-tokens` dans `_tokens.scss`

**État actuel confirmé** : `'rounded-12px'` n'existe **plus** dans `$radius-tokens`. La clé reste dans `$radius-primitives` (`0.75rem` = 12px). Un appel `radius('rounded-12px')` résoudrait via le fallback primitives et retournerait encore `0.75rem` (12px) — **ce qui est incohérent avec l'intention de migration vers `lg` = 20px** (valeur semantics/primitives) ou 16px (legacy).

> **Risque résiduel** : `'rounded-12px'` dans `$radius-primitives` est un vestige silencieux. Il ne casse pas le build mais contredit la migration.

**`$radius-primitives` garde encore `'rounded-12px': 0.75rem`** — **OUI, confirmé**.

### Commits `be2db23` / `ebe2ba1` — spacing numériques

`be2db23` a supprimé `'4'`, `'8'`, `'16'`, `'24'`, `'32'` de `$spacing-tokens`. Ces mêmes clés existent dans `$spacing-primitives` avec des valeurs différentes :

| Clé    | Valeur legacy (supprimée) | Valeur primitive            |
| ------ | ------------------------- | --------------------------- |
| `'4'`  | `0.25rem` (4px)           | `0.25rem` (4px) — identique |
| `'8'`  | `0.5rem` (8px)            | `0.5rem` (8px) — identique  |
| `'16'` | `1rem` (16px)             | `1rem` (16px) — identique   |
| `'24'` | `1.5rem` (24px)           | `1.5rem` (24px) — identique |
| `'32'` | `2rem` (32px)             | `2rem` (32px) — identique   |

Les valeurs sont identiques — la migration est cohérente. Tout usage résiduel de `spacing('4')` etc. résoudrait désormais via `$spacing-primitives` (étape 2 du fallback) avec la même valeur CSS. **Pas de régression visuelle.**

`$spacing-primitives` **possède bien des clés numériques brutes similaires** — c'est intentionnel : c'est la grille 4px stricte comme couche basse. Ce qui a été supprimé de `$spacing-tokens`, c'est la redondance avec ces primitives.

### Commit `e626c90` — remove dead code

Ce commit a supprimé `$admin-ui-color-tokens`, une 2ème définition de `$size-tokens` (doublon silencieux via `!default`), 6 clés deprecated dans `$font-size-tokens` et la fonction `admin-ui($key)` dans `_colors.scss`.

**Résidus potentiels détectés** :

- `'admin-ui'` existe encore dans `$shadow-tokens` (sous-map des shadows) — c'est **différent** de `$admin-ui-color-tokens` supprimé. Ce `shadow-tokens['admin-ui']` contient des box-shadow, non des couleurs.
- La fonction `admin-shadow()` dans `_shadows.scss` consomme ce `shadow-tokens['admin-ui']`. Aucun composant n'appelle `admin-shadow()` actuellement (section 4.3). Ce n'est pas du dead code issu du commit `e626c90` — c'est un orphelin différent, non encore nettoyé.
- L'entrée `admin-ui` reste dans `_index.scss` ligne 29 dans la liste `@forward './colors' show ...` — **vestige** de l'ancienne fonction `admin-ui()` supprimée dans `e626c90`. Cette entrée est maintenant invalide car la fonction n'existe plus dans `_colors.scss`.

> **Problème détecté** : `_index.scss` forward `admin-ui` dans la liste `show` de `_colors.scss`, mais cette fonction a été supprimée dans `e626c90`. Sass peut accepter silencieusement un `@forward show` sur une fonction inexistante selon la version, mais c'est techniquement incohérent.

---

## 6. IMPACT SUR `direction-visuelle-v1.md`

### 6.1 Palette sémantique (Partie B)

`direction-visuelle-v1.md` définit **7 rôles sémantiques** avec des variables CSS cibles :

| Variable cible    | Valeur doc | Source tokens actuelle                                                                                | Alignement                                                                                            |
| ----------------- | ---------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `--color-primary` | `#0077c2`  | `$primary-color-tokens.base = #0077c2`                                                                | **Cohérent** mais la couche Phase 6 définit `primary = #667eea` (violet) dans `$color-semantic-brand` |
| `--color-success` | `#16a34a`  | `$semantic-tokens.success.base = #4caf50` / `$color-semantic-feedback.success-base = #10b981`         | **Conflit double**                                                                                    |
| `--color-warning` | `#f59e0b`  | `$semantic-tokens.warning.base = #ff9800` / `$color-semantic-feedback.warning-base = #f97316`         | **Conflit double**                                                                                    |
| `--color-danger`  | `#dc2626`  | Pas de map `danger` — `$secondary-color-tokens.base = #ef5350` / `$red-palette-tokens[600] = #dc2626` | **Pas de token `danger` dédié**                                                                       |
| `--color-info`    | `#3b82f6`  | `$semantic-tokens.info.base = #2196f3` / `$color-semantic-feedback.info-base = #0ea5e9`               | **Conflit double**                                                                                    |
| `--color-accent`  | `#ffb400`  | `$accent-color-tokens.base = #ffb400`                                                                 | **Cohérent**                                                                                          |
| `--color-text`    | `#334155`  | `$color-semantic-text.primary = #1e293b` (neutral-800)                                                | **Divergence** (334155 = slate-700, 1e293b = slate-800)                                               |

**Synthèse** : les variables CSS cibles de la direction visuelle ne sont pas encore créées (`_light.scss` et `_dark.scss` existent mais utilisent des noms différents comme `--color-primary`, `--color-secondary`, etc.). La palette sémantique du document est **partiellement alignée** sur les tokens legacy mais en **conflit avec la couche Phase 6**.

### 6.2 Poids typographiques (Partie C.3)

La direction visuelle n'autorise que 3 poids courants : `regular` (400), `semibold` (600), `bold` (700). Les autres (`thin`, `light`, `medium`, `extrabold`, `black`) sont déclarés "hors usage courant".

`$font-weight-tokens` dans `_tokens.scss` contient 11 poids dont `medium` (500), `extrabold` (800), `black` (900). **Pas de contradiction** — le document dit "gardés en token, interdits dans composants standards". Les tokens existent, leur usage est une règle de gouvernance, non un problème structurel.

### 6.3 Radius différentiels adulte/enfant (Partie D)

**Contexte adulte** selon le document :

| Composant | Token | Valeur attendue |
| --------- | ----- | --------------- |
| Button    | `md`  | 8px             |
| Input     | `md`  | 8px             |
| Card      | `lg`  | 16px            |
| Modal     | `lg`  | 16px            |
| Tooltip   | `sm`  | 4px             |

**Avec le système actuel** : `radius('md')` passe par `$radius-semantic.medium = $radius-primitives.md = 12px` — **12px, non 8px**.

**Contexte enfant** selon le document :

| Composant       | Token | Valeur attendue |
| --------------- | ----- | --------------- |
| Button enfant   | `lg`  | 16px            |
| Card mère       | `xl`  | 20px            |
| Card sous-tâche | `lg`  | 16px            |

**Avec le système actuel** : `radius('lg')` passe par `$radius-semantic.large = $radius-primitives.lg = 20px` — **20px, non 16px** pour les cas adultes.

**Désalignement critique** : la direction visuelle utilise `md`/`lg`/`xl` en référence aux valeurs **legacy** (`$radius-tokens` : md=8px, lg=16px, xl=20px), mais la couche Phase 6 a redéfini ces clés avec les valeurs TSA-friendly (`$radius-primitives` : md=12px, lg=20px, xl=24px). Le refactor composants Button et Input, s'il utilise `radius('md')`, obtiendra **12px** et non 8px comme attendu par la direction visuelle.

> **C'est le point de blocage majeur pour le refactor Button/Input.**

---

## 7. RECOMMANDATIONS

### TIER 1 — Bloquant avant refactor Button/Input

---

**T1-A — Résoudre l'ambiguïté des clés radius `md`/`lg`/`xl`** `[moyen]`

**Problème** : `direction-visuelle-v1.md` spécifie Button = `md` (8px) et Card = `lg` (16px). Mais `radius('md')` retourne actuellement 12px (Phase 6), et `radius('lg')` retourne 20px. Les deux systèmes utilisent les mêmes clés avec des valeurs différentes.

**Action** : Décider et documenter. Deux options :

- **Option A** : adopter les valeurs Phase 6 (12px/20px) et amender `direction-visuelle-v1.md` (D.2/D.3) pour refléter ces nouvelles valeurs — cohérent avec le choix TSA-friendly
- **Option B** : utiliser les aliases sémantiques dans le document (`button`, `card`, `modal`) plutôt que les primitifs `md`/`lg` — le refactor Button devra appeler `radius('button')` = 6px, pas `radius('md')` = 12px

**Option B recommandée** car `$radius-semantic` expose des aliases composants précis (`'button'` = 6px, `'card'` = 12px, `'modal'` = 20px) qui correspondent à la philosophie TSA-friendly du projet.

---

**T1-B — Résoudre le conflit `shadow()` double définition** `[facile]`

**Problème** : deux fonctions `shadow()` coexistent (`_colors.scss` pour les couleurs RGBA, `_shadows.scss` pour les box-shadow). Dans `_index.scss`, seule celle de `_colors.scss` est forwardée via `show shadow`. Les composants qui font `@use '@styles/abstracts' as *` puis appellent `shadow('black-light')` obtiennent la version couleur, mais ceux qui veulent une elevation doivent passer par `shadow()` de `_shadows.scss` importé via `main.scss`.

**Action** : Renommer la fonction dans `_colors.scss` en `shadow-color($key)` et mettre à jour `_index.scss` et tous les appels existants. Chercher les usages via `shadow('black-` etc.

---

**T1-C — Créer les CSS vars `--color-*` selon direction-visuelle-v1.md** `[moyen]`

**Problème** : `direction-visuelle-v1.md` spécifie des variables CSS (`--color-primary`, `--color-success`, `--color-danger`, etc.) qui ne correspondent pas encore aux CSS vars générées par les tokens actuels. `_light.scss` génère `--color-primary`, `--color-success`, etc. mais avec des valeurs différentes de ce que le document prescrit.

**Action** : Aligner `_light.scss` et `_dark.scss` sur les valeurs de `direction-visuelle-v1.md`, ou documenter explicitement les divergences.

---

**T1-D — Corriger le `@forward 'colors' show admin-ui`** `[facile]`

**Problème** : `_index.scss` ligne 29 forward `admin-ui` depuis `_colors.scss`, mais cette fonction a été supprimée dans le commit `e626c90`. L'entrée dans le `show` est fantôme.

**Action** : Retirer `admin-ui` de la liste `show` dans `@forward './colors' show ...` dans `_index.scss`.

---

### TIER 2 — Dette à traiter en parallèle

---

**T2-A — Nettoyer `rounded-6px`/`rounded-10px`/`rounded-12px` de `$radius-primitives`** `[facile]`

Les 3 clés `rounded-Npx` survivantes dans `$radius-primitives` sont des vestige du nettoyage de `$radius-tokens`. Aucun composant ne les appelle activement. La migration a été faite vers `sm`, `md`, `lg`. Ces clés devraient être supprimées pour finaliser le nettoyage amorcé dans `a11ec3a`/`c4eeb51`.

---

**T2-B — Consolider les deux systèmes sémantiques couleurs** `[complexe]`

`$semantic-tokens` (legacy) et `$color-semantic-feedback` (Phase 6) définissent des valeurs différentes pour success/warning/error/info. La fonction `semantic('success')` utilise Phase 6 en priorité, mais `$semantic-tokens` reste en mémoire et peut être lu directement. Planifier la suppression de `$semantic-tokens` après avoir vérifié qu'aucun composant ne l'accède directement.

---

**T2-C — Supprimer `main.css`** `[facile]`

Artéfact de l'ancienne compilation CLI Sass. Non référencé dans le code. Ajouter à `.gitignore` si des CI/CD le régénèrent, sinon supprimer.

---

**T2-D — Supprimer `_typography-base.scss`** `[facile]`

Fichier vide, forwardé par `base/_index.scss`. Supprimer le fichier et son forward.

---

**T2-E — Brancher `$size-semantic`, `$typography-semantic`, `$motion-semantic` sur leurs wrappers** `[moyen]`

Ces trois maps semantics sont définies dans `_semantics.scss` mais leurs wrappers respectifs (`_size.scss`, `_typography.scss`, `_motion.scss`) ne les consomment pas. Soit les brancher dans les wrappers (avec fallback), soit documenter explicitement qu'ils sont "Phase 7".

---

**T2-F — Clarifier l'identité `primary`** `[moyen]`

`$primary-color-tokens.base = #0077c2` (bleu, legacy) vs `$color-semantic-brand.primary = #667eea` (violet Phase 6). Les deux coexistent. La direction visuelle prescrit `#0077c2` comme `--color-primary` adulte. Décider laquelle est la source de vérité et supprimer l'autre.

---

**T2-G — Supprimer ou rebaptiser `admin-shadow()`** `[facile]`

Fonction dans `_shadows.scss` sans aucun appel composant. Si elle n'est pas planifiée pour usage proche, la supprimer avec `$shadow-tokens['admin-ui']`. Si gardée, retirer `admin-ui` du `@forward show` dans `_index.scss` (il réfère à une fonction de `_colors.scss` qui elle a bien été supprimée).

---

### TIER 3 — Optionnel / cosmétique

---

**T3-A — Supprimer `rem($px)` dans `_functions.scss`** `[facile]`

Fonction sans aucun usage dans la codebase. Le fichier peut être réduit à 3 lignes ou supprimé si aucun usage n'est prévu.

---

**T3-B — Consolider `$badge-shadow-tokens` et `$badge-shadows`** `[facile]`

Deux maps redondantes pour les ombres badges. La fonction `badge-shadow()` de `_colors.scss` lit `$badge-shadows` (flat). Aucun usage composant détecté pour aucune des deux. Candidat à la suppression groupée.

---

**T3-C — Nettoyer les alias numériques hors-grille 4px dans `$spacing-tokens`** `[moyen]`

`$spacing-tokens` contient encore des valeurs hors de la grille 4px stricte définie par `direction-visuelle-v1.md` et `$spacing-primitives` : `'3'` (3px), `'14'` (14px), `'15'` (15px), `'18'` (18px), `'22'` (22px), `'25'` (25px), `'26'` (26px), `'30'` (30px), `'39'` (39px), `'62'` (62px), `'70'` (70px), `'150'` (150px), `'180'` (180px), `'250'` (250px). Ces valeurs sont des legacy hardcodes. Migration progressive en Phase 2+ selon `direction-visuelle-v1.md G.1`.

---

**T3-D — Activer `$ENABLE_LEGACY_SUPPORT: false` en Phase 7** `[facile]`

Le flag est prêt dans `_index.scss`, `_colors.scss`, `_spacing.scss`, `_radius.scss`, `_shadows.scss`. Le passer à `false` forcerait les composants non migrés à produire des erreurs SCSS, permettant un inventaire exhaustif.

---

## Annexe — État post-commit `c4eeb51`

`$radius-tokens` est maintenant **entièrement sémantique** (plus aucune clé `rounded-Npx`). La grille effective est :

```
none | xs=2px | sm=4px | md=8px | lg=16px | xl=20px | 2xl=24px | full=50%
```

Mais via la priorité du fallback `radius()`, les valeurs réelles en Phase 6 sont :

```
card → 12px | button → 6px | input → 6px | modal → 20px | badge/avatar → 50%
```

Ces valeurs ne correspondent pas aux valeurs spécifiées dans `direction-visuelle-v1.md D.2` qui utilise les clés legacy comme référence. **Le T1-A est la priorité absolue avant toute session de refactor composants.**
