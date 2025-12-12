# INSTRUCTIONS TECHNIQUES — Refactorisation SCSS

> Fichier contractuel pour Claude Code. Exécuter exactement les étapes ci‑dessous dans l'ordre. Aucune discussion, suivre strictement.

---

## Conventions générales

- Tous les changements doivent **conserver l’apparence actuelle** (aucune modification visuelle).
- Ne pas lancer d’harmonisation / réduction des tokens dans ce script : transférer les valeurs existantes dans les fichiers tokens et wrappers uniquement.
- La branche de travail doit être `refactor/styles/tokens-first`.
- Garder `theme-vars.scss` et `variables.scss` **temporairement** comme couche de compatibilité ; marquer son en‑tête `DEPRECATED`.
- Ne modifier **aucun** fichier listé dans la section "Interdits" sauf pour correction de compilation si indispensable.

## Règle maître

1. **TOKENS** (`abstracts/_tokens.scss`) = SOURCE DE VÉRITÉ pour toutes les données (couleurs, spacing, radii, shadows, breakpoints, timings, z-index, semantic tokens, brand tokens).
2. **WRAPPERS** (`abstracts/*`) = API stable (fonctions, mixins, CSS vars). Ils _ne redéfinissent pas_ les données ; ils lisent depuis `tokens`.
3. **BASE/** = styles runtime appliqués au DOM (reset, accessibility, helpers, reduced-motion, typography base).
4. **VENDORS/** = dépendances tierces immuables (normalize.scss).
5. **THEMES/** = overrides runtime (CSS variables) importés après `base/`.

---

## Arborescence attendue (si absent, créer)

```
src/styles/
├── abstracts/
│   ├── _tokens.scss
│   ├── _a11y-tokens.scss
│   ├── _functions.scss
│   ├── _spacing.scss
│   ├── _colors.scss
│   ├── _typography.scss
│   ├── _motion.scss
│   ├── _radius.scss
│   ├── _shadows.scss
│   ├── _borders.scss
│   ├── _breakpoints.scss
│   ├── _container-queries.scss
│   ├── _forms.scss
│   ├── _mixins.scss
│   ├── _variables.scss   // DEPRECATED — conserver temporairement pour compat jusqu'à validation finale
│   └── _index.scss
├── base/
│   ├── _reset.scss
│   ├── _animations.scss
│   ├── _accessibility.scss
│   ├── _reduced-motion.scss
│   ├── _helpers.scss
│   └── _typography-base.scss
│   └── _index.scss
├── vendors/
│   └── _normalize.scss
│   └── _index.scss
├── themes/
│   ├── _light.scss
│   └── _dark.scss
│   ├── _theme-vars.scss   // DEPRECATED — conserver temporairement pour compat jusqu'à validation finale
│   └── _index.scss
└── main.scss
```

---

## Étapes — exécution séquentielle (obligatoire)

Refactor (isométrique, **ne change aucune valeur**) :

1. Créer/compléter `abstracts/_tokens.scss` avec **toutes** les valeurs actuelles (même si elles sont nombreuses). Ne pas modifier le rendu.
2. Implémenter des wrappers `abstracts/*` (spacing, colors, typography, motion, radius, shadows, borders, breakpoints, forms, mixins, functions) qui _lisent_ tokens et exposent l'API existante (`spacing()`, `color()`, `font-size()`, etc.).
3. Laisser `variables.scss` comme couche de compat (DEPRECATED) — il pointera vers les wrappers/tokens.
4. Migrer composants un par un pour qu'ils utilisent les wrappers/fonctions plutôt que variables locales. (Remplacer `#efefef` par `color('surface')` etc.)
5. Garder l'apparence EXACTE (pixel-perfect). Utiliser visual regression si disponible.
6. Valider build et tests d'accessibilité.

### 0) Préparations

1. Checkout `main` et create branch `refactor/styles/tokens-first`.
2. Commit state actuel comme sauvegarde.

### 1) Créer / compléter `abstracts/_tokens.scss`

- Copier **toutes** les valeurs actuellement utilisées dans le repository (couleurs, spacing, font-sizes, radii, shadows, z-index, timings, breakpoints, semantic tokens, brand colors).
- Conserver les noms actuels pour éviter toute rupture.
- Ajouter commentaires `// TODO: harmonize later` aux sections volumineuses.
- Ne pas modifier les valeurs. Objectif : single-source-of-truth.
- **Rôle :** source de vérité (data only).
- **Contenu :** maps et constantes :
  - `$spacing-tokens` (échelle 4px)
  - `$font-size-tokens`
  - `$role-color-tokens` (rôles + variantes)
  - `$semantic-tokens` (success, warning, error, info)
  - `$blue-palette`, `$gray-palette` (si besoin pour legacy)
  - `$radius-scale`
  - `$elevation-shadows` / `$badge-shadows`
  - `$border-width-tokens`
  - `$timing-scale` / `$easing-scale`
  - `$breakpoint-tokens`
  - `--z-index-tokens`
- **Notes :** pas de mixins lourds, pas de CSS runtime. Ajouter documentation inline (commentaires) et `@error` si clé manquante.

**Exemple (conceptual)**: maps: `$spacing-tokens: ('1': 0.25rem, '2': 0.5rem, '3': 0.75rem, ...);`

### 2) Ajouter `abstracts/_a11y-tokens.scss`

- Contenu minimal requis (valeurs actuelles du projet) :
  - `$a11y-tokens: (`
  - `  'contrast-min': 4.5,`
  - `  'contrast-enhanced': 7.0,`
  - `  'min-touch-target': 44px,`
  - `  'preferred-touch-target': 56px,`
  - `  'focus-ring-width': 2px,`
  - `  'focus-ring-offset': 2px,`
  - `  'reduced-motion-duration': 0.01ms`
  - `);`
- Exporter ces tokens via CSS vars si nécessaire.

> Ces mixins doivent utiliser les tokens et être appliquées sur les composants interactifs.

### 3) Implémenter / vérifier wrappers (abstracts/\*)

Pour chaque wrapper : **ne pas** hardcoder des données — lire uniquement depuis `_tokens.scss` ou `_a11y-tokens.scss`.

---

### `abstracts/_container-queries.scss`

- add `@mixin container()` (container-type/inline-size) and `@mixin respond-container($min-width)`.

---

### `abstracts/_functions.scss`

- **Rôle :** fonctions utilitaires pures (px → rem, conversions mathématiques simples).
- **Contenu :** `rem()`, autres helpers mathématiques. Pas d'effets sur le DOM.
- **Exemple d'utilisation :** `@function rem($px)`, `@function clamp-fluid(...)` (utilities).

---

### `abstracts/_spacing.scss` (wrapper)

- **Rôle :** API `spacing($key)` et CSS vars dérivées.
- **Contenu :** fonctions qui lisent `$spacing-tokens` (depuis tokens), et publient `:root { --spacing-md: ... }` si nécessaire. Documentation sur la règle 4px.
- **Exemple d'usage :** `padding: spacing('4'); // -> 1rem`

---

### `abstracts/_colors.scss` (wrapper)

- **Rôle :** API couleurs (fonctions `color($key, $type?)`,`color()`, `role-color()`, `semantic()`, `blue()`), et publication des CSS vars runtime `--color-*`.
- **Contenu :** fonctions qui priorisent `tokens.$role-color-tokens`, `tokens.$semantic-tokens`. Garder des fallbacks locaux **uniquement** durant la migration.
- **Exemple d'usage :** `background: color('base', 'primary');` ou `background: var(--color-primary);`

---

### `abstracts/_borders.scss` (wrapper)

- **Rôle :** `border-width($key)` + mixins `border-style()`.
- **Contenu :** lire `$border-width-tokens` dans tokens, exposer mixins.
- **Exemple :** `border: border-width('focus') solid var(--color-border);`

---

### `abstracts/_radius.scss` (wrapper)

- **Rôle :** `radius($key)` et mixins `rounded`, `input-radius`.
- **Contenu :** proxie vers `$radius-scale` dans tokens.

---

### `abstracts/_shadows.scss` (wrapper)

- **Rôle :** `shadow($key)`, `card-shadow($state)`, mixins `elevated()`.
- **Contenu :** proxie vers `$elevation-shadows` & role-shadows in tokens.

---

### `abstracts/_motion.scss` (wrapper)

- **Rôle :** `timing($key)`, `easing($key)`, `motion-token()`, mixins `safe-transition`, `safe-animation`.
- **Contenu :** proxie vers `$timing-scale`, `$easing-scale`. Inclure `@media (prefers-reduced-motion)`.

---

### `abstracts/_breakpoints.scss` (wrapper)

- **Rôle :** map `$breakpoint-tokens` (définie dans tokens) + mixin `respond-to($bp)`.
- **Contenu :** mixin mobile-first (min-width). Fournir legacy aliases si nécessaire.

---

### `abstracts/_forms.scss` (wrapper)

- **Rôle :** mixins & configs pour controls (form-control, focus rings) mais en lisant tokens.
- **Contenu :** form-control-sizes (md, sm, lg) — **idéalement** déplacer sizes dans tokens sous `form-control-sizes` si tu veux les rendre themables.

---

### `abstracts/_typography.scss` (wrapper)

- **Rôle :** `font-size($key)`, `font-weight()`, `line-height()` proxant vers tokens.
- **Contenu :** CSS vars de font-families, et doc sur scale recommandée (xs..3xl).

---

### `abstracts/_mixins.scss`

- **Rôle :** mixins réutilisables (clearfix, focus-accessible, dnd-grid, role-badge, admin-card).
- **Contenu :** utiliser exclusivement `spacing()`, `color()`, `shadow()`, `radius()`. (use $a11y-tokens)

**Mixins à ajouter** :

```scss
@mixin touch-target($size: 'preferred') {
  @if $size == 'preferred' {
    min-width: map.get($a11y-tokens, 'preferred-touch-target');
    min-height: map.get($a11y-tokens, 'preferred-touch-target');
  } @else {
    min-width: map.get($a11y-tokens, 'min-touch-target');
    min-height: map.get($a11y-tokens, 'min-touch-target');
  }
}

@mixin non-invasive-focus($color: var(--focus-ring-color)) {
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 map.get($a11y-tokens, 'focus-ring-width') $color;
    outline-offset: map.get($a11y-tokens, 'focus-ring-offset');
  }
}
```

---

## `variables.scss` — note importante

- GARDER TEMPORAIREMENT comme **compat layer**.
- Marquer `DEPRECATED` en tête du fichier.
- Après refactoring : **supprimer complètement**.

---

### `abstracts/_index.scss`

- **Rôle :** `@forward` des outils SCSS (fonctions & mixins safe). **Ne pas** forwarder les fichiers qui génèrent CSS runtime (colors vars, spacing vars) — ces derniers seront importés explicitement dans `main.scss`.

---

## `base/` (runtime, DOM)

### `base/_reset.scss` — garder

- Minimal reset, box-sizing, images responsive, inputs baseline.
- **Ne pas toucher** sauf correction critique.

### `base/_reduced-motion.scss` — garder

- Policy reduced-motion + calm-mode toggle.
- **Ne pas toucher.**

### `base/_accessibility.scss` — garder mais vérifier

- Focus management, sr-only, skip links, contrast rules, touch targets.
- Assure-toi que les couleurs/focus ring utilisent CSS vars (pas valeurs hardcodées).

### `base/_helpers.scss` — garder

- Utilities `.container`, `.u-stack`, `.touch-target`, `.visually-hidden`.
- Préférer wrappers pour valeurs (spacing etc.).

### `base/_typography-base.scss` — garder (peut être vide initialement)

- Règles typographiques runtime (`body`, `h1..h6`) en utilisant `font-size()` wrappers.

---

## `vendors/` — garder

- `vendors/_normalize.scss` : **ne pas toucher**.
- `vendors/_index.scss` : forward normalize.

---

### 4) Keep variables compatibility

- Ensure `variables.scss` still works as an alias to the wrappers (it can `@use` wrappers and set legacy variables). Add `// DEPRECATED` header to `variables.scss`.

### 5) Themes — light & dark

- **Rôle :** fournir overrides runtime (CSS vars) pour `:root` et `[data-theme='dark']`.
- **Meilleure méthode :** stocker maps thématiques dans `themes/light.scss`, `themes/dark.scss` et dans `main.scss` importer explicitement **après** `base/*`.
- **Conseil pratique :** préférer fonctions wrappers (`slate()`, `blue()`) pour générer les valeurs des thèmes, éviter hardcode.
  **Exemple** :
  `:root { --color-primary: #{role-color('admin','base')}; }`
  `[data-theme='dark'] { --color-bg: #{slate(900)}; }

### 6) Scripts de détection & automatisation (obligatoire)

But : fournir des contrôles automatiques rapides pour détecter les hardcodes et vérifier des règles simples avant validation.

#### A. Scripts à ajouter (fichiers JS simples)

Les scripts doivent détecter les hardcoded hex colors, rgb(), et px avec des regex simples

1. `scripts/check-hardcoded.js`
   - Objectif : détecter hex colors (`#fff`, `#ffffff`), `rgb(...)` hardcodés et valeurs `px` pour spacing dans `src/components` et `src/styles` (exclut `abstracts/_tokens.scss` et `themes/*`).
   - Comportement : imprime la liste des fichiers/occurrences et retourne un code de sortie `1` si des hardcodes sont trouvés (fail), sinon `0`.

2. `scripts/check-touch-targets.js` (heuristique)
   - Objectif : repérer les sélecteurs interactifs (`button`, `a[role=button]`, `[role=menuitem]`, `.btn`) qui **ne** contiennent **ni** aperçu d'utilisation du mixin `.touch-target` ni annotation CSS commentée `/* touch-target */`.
   - Comportement : liste les fichiers suspects (ne casse pas la build automatiquement — usage d’avertissement pour début de migration).

3. (optionnel) `scripts/check-sass-keys.js`
   - Objectif : optionnel, grep des usages `spacing('unknown')` ou `map.get($..., 'unknown')` pour attraper `@error` potentiels.

#### B. Entrées `package.json` recommandées (collées dans l’objet `scripts`)

```json
"scripts": {
  "lint:hardcoded": "node scripts/check-hardcoded.js",
  "validate:touch-targets": "node scripts/check-touch-targets.js",
  "lint:css": "stylelint 'src/**/*.scss' --config .stylelintrc",
  "build:css": "sass src/styles/main.scss dist/styles.css --no-source-map",
  "ci:css": "pnpm lint:css && pnpm build:css"
}
```

### Custom checks utiles

- **Detect hardcoded colors**: stylelint rule or a custom script regex to fail on hex codes in component styles (allow in tokens only).
- **Detect px in spacing**: ensure spacing tokens used, not raw `px` in components.
- **Sass key check**: script that greps `map.get` calls or runs a Sass compile to catch `@error` missing token keys.

### 7) Compilation & validation

- Run `pnpm build:css` and fix any Sass compile errors.
- Run `pnpm lint:hardcoded` and inspect output (do not fix everything in this run — document the findings).
- Perform a manual visual check across critical pages and components for pixel parity.

### 8) Commit & merge

- Commit all changes on branch `refactor/styles/tokens-first`.
- Do not merge yourself.

---

## Breakpoints recommandés (valeurs standardisées)

- Utiliser des noms clairs (API simple) et valeurs réalistes pour les écrans modernes :

```scss
$breakpoint-tokens: (
  'mobile-xs': 320px,
  // very small phones
  'mobile': 480px,
  // mobile portrait
  'mobile-land': 768px,
  // mobile/tablet landscape threshold
  'tablet': 834px,
  // tablet portrait (iPad)
  'tablet-land': 1024px,
  // tablet landscape
  'laptop': 1280px,
  // small laptop
  'desktop': 1440px, // desktop / large laptop,,,
);
```

- Implémenter `@mixin respond-to($bp)` qui utilise `min-width` (mobile-first).
- Règle : ne pas utiliser `max-width`.

```scss
// mobile-first mixin
@mixin respond-to($bp) {
  @if map.has-key($breakpoint-tokens, $bp) {
    @media (min-width: map.get($breakpoint-tokens, $bp)) {
      @content;
    }
  } @else {
    @warn \"Breakpoint '#{$bp}' inconnu\";
  }
}
```

Raisons : ces valeurs couvrent la majorité des appareils actuels (petits téléphones 320–360, téléphones standard ~412–480, landscape / tablets 768–834–1024, laptops 1280–1440). Nommer les breakpoints facilite la lisibilité des composants.

---

## Fichiers **interdits** à modifier (sauf correction de build)

- `vendors/_normalize.scss` (dépendance immuable)
- `base/_reset.scss` (reset minimal)
- `base/_helpers.scss` (utilitaires globaux)
- `base/_reduced-motion.scss` (policy)
- `main.scss` (orchestrateur — **ne change pas l’ordre d’import**)
- `abstracts/_index.scss`, `base/_index.scss`, `themes/_index.scss`, `vendors/_index.scss` (forwards)

> Ces fichiers servent d’ossature. Tu peux _auditer_ pour vérifier qu’ils n’utilisent pas hardcodes, mais évite modifications fonctionnelles.

---

## Remarques techniques et attentes

- Toutes les fonctions/mixins exposées doivent être documentées par commentaire en en‑tête (usage et exemples d'appel).
- Les wrappers doivent lancer `@error` en cas de clé manquante (ex: spacing('unknown')).
- Ne pas utiliser `@import`; utiliser `@use` et `@forward`.
- Préfèrer les propriétés logiques (`margin-inline`, `padding-block`) pour l'internationalisation.
- Respecter `prefers-reduced-motion` dans les mixins de motion.

---

## Exemples d'usage (à inclure comme commentaires dans les fichiers wrappers)

- Spacing : `padding: spacing('md'); // -> map.get($spacing-tokens, 'md')`
- Colors : `background: color('base', 'primary');` ou `background: var(--color-primary);`
- Radius : `border-radius: radius('card');`
- Motion : `@include safe-transition(all, timing('base'));
- Breakpoints : `@include respond-to('tablet') { ... }

---

## Livrables attendus (sur la branche)

1. `abstracts/_tokens.scss` (contenu complet)
2. `abstracts/_a11y-tokens.scss`
3. wrappers SCSS conformes et commentés
4. `abstracts/_container-queries.scss`
5. `scripts/check-hardcoded.js` et `scripts/check-touch-targets.js`
6. `package.json` scripts mis à jour
7. Aucun changement visuel constaté après compilation
