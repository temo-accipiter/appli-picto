# Partie 1 - Description du Projet - Appli-Picto

## Présentation du projet :

Je développe une application web dédiée aux personnes autistes ainsi qu’aux professionnels les accompagnant. Cette plateforme propose un planning visuel fondé sur le renforcement positif, permettant de décomposer une tâche en étapes simples pour motiver l’enfant à les réaliser. Traditionnellement, cette méthode utilise des pictogrammes imprimés, plastifiés, puis placés sur un support à l’aide de scratch ; mon objectif est d’en proposer une version numérique interactive. L’utilisateur peut créer des cartes “tâche” et “récompense” personnalisées avec images et intitulés, sélectionner celles à afficher pour une activité précise puis, au fur et à mesure de l’accomplissement, cocher les étapes franchies. Une fois toutes les tâches réalisées, une récompense apparaît pour valoriser l’effort fourni.

## Contexte technique :

Stack : Next.js 16 + Pnpm + SASS + Typescript strict mode + macOS + VS Code + Supabase + Stripe + Cloudflare.

## Arborescence:

Chaque composant vit dans son propre dossier, avec deux fichiers : MonComposant.tsx + MonComposant.scss.

## Contraintes:

SCSS maintenable | BEM‑lite, variables globales, mixins, imports clairs. |Design apaisant & moderne | Palette douce à contraste élevé ; animations ≤ 150 ms. Accessibilité | WCAG 2.2 AA : focus visible, ARIA correct, aucun clignotement > 3 Hz. |

## Travail effectué :

- Le RGPD est mis en place.
- RBAC, permissions, quotas.
- Stripe est connecté.
- Les cards de tâches et de récompense sont fonctionnelles.
- Un composant de train qui avance sur une barre de progression au fur et à mesure que les tâches sont cochées.
- Page Profil avec les boutons et inputs pour créer/modifier/supprimer avatars, pseudo, mail, adresse etc.
- Composant TimeTimer
- Page Admin

## Plan complet et détaillé — Comptes & Abonnements (sans code)

1. Cadrage produit
   Rôles initiaux (RBAC minimal) :

- visitor : non connecté.
- free : compte gratuit.
- abonne : abonné payant (pas encore de Basic/Pro).
- admin : accès complet.
- staff (unique) : rôle mixte support/modérateur, à séparer plus tard si besoin.

États orthogonaux aux rôles (Les états ne remplacent pas les rôles; ils s’y superposent) :

- active : normal.
- suspended : verrouillage (fraude, abus, impayé).
- deletion_scheduled : suppression programmée RGPD.
- pending_verification : pour nouveaux comptes en attente de confirmation email.

Modèle (freemium simplifié) :

- free limité (quotas stricts).
- abonné = toutes les features, sans restriction.
- Pas d’essai gratuit.
- Objectif : abaisser la friction (inscription simple), puis orienter vers l’upgrade.
- Focus UX autiste : interfaces visuelles intuitives avec pictogrammes, transitions douces, pas de surcharges.

2. Parcours Visitor (non connecté)
   Accès : uniquement la page “tableau” avec 3 cartes de tâches prédéfinies, seulement cochables.
   Cartes prédéfinies : stockées dans une table publique distincte (Supabase).
   SessionStorage : pour mémoriser temporairement la progression → effacé à la fermeture d’onglet (nouvelle expérience à chaque visite).
   Fonctionnalités : cocher les 3 cartes débloque une récompense prédéfinie.
   Interdits : pas de création/suppression/modification, pas d’upload, pas de personnalisation.
   CTA : messages simples et rassurants → “Créer un compte (Free) pour débloquer plus de fonctionnalités”.
   Accessibilité :
   Contrastes AA, focus visibles, libellés clairs, feedback doux.
   Animations ≤150ms, douces et fluides.
   Icônes larges pour touch-friendly.
   Pas de sons agressifs ou clignotements.

3. Parcours Free (compte gratuit)
   Droits - Créer/éditer ses propres cartes dans des quotas stricts :
   maximum de nombre de card tâche dans la base de données = 5
   maximum de nombre de card récompense dans la base de données = 2
   maximum de nombre de card tâche créée par mois = 5
   maximum de nombre de card récompense créée par mois = 2
   Donc, si limite atteint, pour en créer une nouvelle, il faut en supprimer une ancienne.
   Pas de pubs pour l’instant : l’option pub pour monétiser les comptes Free sera envisagée plus tard, uniquement si besoin.
   Objectif produit : démontrer la valeur et inciter au passage à Abonné.
   CTA positifs : “Débloquez plus de cartes avec un abonnement Premium” au lieu de messages restrictifs.

4. Parcours Abonné
   Accès complet : toutes les fonctionnalités premium disponibles avec zéro pub.
   Pas de distinction Basic/Pro pour l’instant : un seul palier Abonné.
   Paiement Stripe : abonnement mensuel, facturé dès le départ (aucun essai gratuit).

5. États de compte
   pending_verification :accès bloqué tant que l’email n’est pas confirmé.
   active : fonctionnement normal.
   suspended : verrouillage (fraude, impayés, abus).
   Accès uniquement au profil, facturation (Stripe) et RGPD.
   Pas de lecture/écriture des cartes ni accès premium.
   deletion_scheduled : utilisateur a demandé la suppression → données effacées après 30 jours.
   Réversibilité possible pendant ce délai.
   Suppression définitive après délai (sauf traces légales minimales/anonymisées).

6. Résiliation
   Volontaire :
   abonne → free, état active.
   Données conservées.
   Garde accès premium jusqu’à la fin de la période déjà payée.
   Forcée (impayé/fraude) : passage à suspended → blocage jusqu’à régularisation.
   Suppression RGPD : bouton “Supprimer mon compte” → état deletion_scheduled → purge après délai.
   Feedback visuel : icône calendrier doux pour indiquer le délai de suppression.

7. Permissions & Feature Gating
   Pas de features pro_only maintenant : inutile tant qu’il n’y a pas de plan Pro. A l’avenir à envisager, si abonne basic et abonne pro.
   Deux paniers seulement :
   Features free → visibles pour Free et Abonné.
   Features premium → visibles uniquement pour Abonné.
   FeatureGate : contrôle affichage (fallback = message “Upgrade”).
   Accessibilité : modales explicatives, ARIA compatible pour screen readers.
   Sécurité Supabase (RLS) : protège contre les contournements (ex. interdiction de création de cartes pour Visitor).

8. Administration
   Rôle staff unique au lancement (support + modération).
   Séparation possible plus tard :
   support → aide utilisateurs (compte, abonnement).
   moderator → modération contenu public (si introduit plus tard).
   AdminPermissions : gérer rôles, features, droits via interface déjà existante.
   Logs consultables : chaque changement de rôle ou état est traçable (audit trail).

9. Sécurité & Données
   RLS owner-only : chaque utilisateur ne voit que ses propres données.
   Suspended : verrouillage → accès uniquement au profil + facturation + RGPD.
   Logs : chaque changement d’abonnement, rôle ou état est enregistré (audit trail).
   RGPD : export et suppression des données, délais de grâce respectés.

⚠️ Clarifications
Visitor : utilise la même page “tableau” que les autres, mais avec 3 cartes fixes (table publique), progression en sessionStorage, reset à chaque visite.
Essai 7 jours : supprimé totalement, aucune exception.
Free vs Abonné : seule distinction actuelle. Abonné = tout premium.
Role entreprise : à implémenter plus tard si besoin.
Pro_only : à ne pas créer maintenant, introduire seulement le jour où un palier Pro existe.
Pubs : envisagées uniquement pour Free, pas encore activées.
Staff : un seul rôle mixte au lancement ; scindable plus tard si le volume l’exige.

---

# Partie 2 - La structure du styles et les imports

## Arborescence

```scss
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

# main.scss

```scss
@charset "UTF-8";

/* ============================================
  📦 1) VENDORS — normalize en tout premier (vendor immutable)
   ============================================ */
@use '@styles/vendors/normalize' as *;

/* ============================================
  💡 2) ABSTRACTS — OUTILS SCSS (tokens maps, functions, mixins, breakpoints)
  - safe to forward; ne génèrent pas de CSS runtime
   ============================================ */
@use '@styles/abstracts' as *;

/* ============================================
  💡 3) ABSTRACTS — SYSTÈMES RUNTIME (génèrent des CSS vars)
  - IMPORTS EXPLICITES, UNE SEULE FOIS, DANS CET ORDRE
   ============================================ */
@use '@styles/abstracts/colors' as *;
@use '@styles/abstracts/typography' as *;
@use '@styles/abstracts/spacing' as *;
@use '@styles/abstracts/motion' as *;
@use '@styles/abstracts/radius' as *;
@use '@styles/abstracts/shadows' as *;
@use '@styles/abstracts/forms' as *;

/* ============================================
  🧱 4) BASE — styles globaux appliqués au DOM (ordre contrôlé)
  - reset puis policies/accessibilité puis helpers puis application typo
   ============================================ */
@use '@styles/base' as *;

/* ============================================
  🎨 5) THEMES — overrides runtime (CSS vars)
  - importés après base pour que les overrides s'appliquent correctement
   ============================================ */
@use '@styles/themes/light' as *;
@use '@styles/themes/dark' as *;
```

# index.Scss - styles/abstracts

```scss
// abstracts/_index.scss
// Forward uniquement les OUTILS (aucun CSS généré)

// --- Outils SCSS (safe) ---
@forward './tokens'; // maps SCSS + opacity/z-index functions
@forward './a11y-tokens' show a11y; // a11y() function (CSS vars importées dans main.scss)
@forward './borders'; // border-width() function + mixins
@forward './functions'; // helpers
@forward './breakpoints'; // map $breakpoints + function breakpoint()
@forward './container-queries'; // container() + respond-container() mixins
@forward './mixins'; // respond-to() + autres mixins
@forward './variables'; // z-index, constants compile-time ONLY

// --- Fonctions couleurs (sans CSS généré) ---
// Forward uniquement les fonctions de _colors.scss (pas les maps ni CSS vars)
@forward './colors' show color, semantic, blue, red, green, orange, yellow,
  purple, slate, role-color, text, surface, admin-ui, warning, badge-gradient,
  ui-gradient, badge-shadow, tsa-pastel, shadow, brand;

// --- Systèmes qui génèrent du CSS (NE PAS FORWARD) ---
// Les maps et CSS vars de colors sont importés directement dans main.scss
// @forward './typography';
// @forward './spacing';
// @forward './motion';
// @forward './radius';
// @forward './shadows';
// @forward './forms';
```

# index.scss - styles/base

```scss
// =============================================================================
// BASE — styles globaux appliqués au DOM
// Génèrent du CSS runtime
// Ordre IMPORTANT : fondations → politiques → aides → rendu final
// =============================================================================

// 1) Reset — fondation du DOM
@forward './reset';

// 2) Politiques globales
@forward './reduced-motion';
@forward './accessibility';

// 3) Utilitaires globaux
@forward './helpers';

// 4) Animations globales (non conditionnelles)
@forward './animations';

// 5) Typographie appliquée au DOM
@forward './typography-base';
```

# index.scss - styles/themes

```scss
@forward './theme-vars';

// Forward UNIQUEMENT les thèmes (ils génèrent tous du CSS volontairement)
// Aucun risque de duplication car ils ne seront utilisés QU'EN UN SEUL ENDROIT : main.scss

@forward './light';
@forward './dark';
```

# index.scss - styles/vendors

```scss
@forward './normalize';
```

---

# Partie 3 - INSTRUCTIONS TECHNIQUES — Refactorisation SCSS

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
