# 🎯 OBJECTIF

Corriger et moderniser les fichiers de base SCSS (reset, helpers) pour une application Next.js 16 + TypeScript destinée aux personnes autistes.

Le but :

- Corriger les problèmes d'accessibilité (supprimer `all: unset` dangereux)
- Enrichir les helpers avec safe-area, touch-target, transitions douces
- Centraliser les CSS variables runtime (spacing, container) dans `_colors.scss`
- Vérifier et optimiser `_reduced-motion.scss` existant
- Garantir compatibilité avec les systèmes déjà en place (breakpoints, colors)

---

# 📌 CONTEXTE ACTUEL

- Projet Next.js 16 + TypeScript
- SCSS structuré sous `/src/styles/`
- **🧩 Application destinée aux personnes autistes** : Accessibilité critique
- Mobile-first obligatoire
- **✅ Système de breakpoints unifié déjà en place** (`_breakpoints.scss` excellent)
- **✅ Fichier `_reduced-motion.scss` déjà existant** (à vérifier/optimiser)
- Refactor colors en cours ou terminé (plan séparé `plan-refactor-colors.md`)
- Fichiers actuels problématiques :
  - `base/_reset.scss` : utilise `all: unset` dangereux
  - `base/_helpers.scss` : manque safe-area, touch-target, mode apaisé
  - `vendors/_normalize.scss` : OK, ne pas toucher

---

# ⚠️ CONTRAINTES CRITIQUES

1. **Ne pas casser le build.**
2. **Ne pas supprimer un fichier sans me demander.**
3. **Ne PAS toucher à `_breakpoints.scss`** (déjà excellent).
4. **Ne PAS toucher à `_reduced-motion.scss`** (déjà existant, juste vérifier).
5. **Respecter l'ordre d'import avec `@use` (pas `@import`).**
6. **Compatibilité totale avec le plan refactor colors** (variables définies là-bas).
7. **Ne pas modifier les composants React (JSX/TSX).**
8. **Utiliser SCSS moderne (`@use`, `@forward`).**
9. **Mobile-first obligatoire (min-width breakpoints).**

---

# 🧩 CONTRAINTES SPÉCIFIQUES AUTISME (PRIORITAIRES)

## 1. Accessibilité focus obligatoire

**RÈGLE ABSOLUE** : Ne jamais supprimer les focus outlines natifs globalement

```scss
// ❌ INTERDIT
button {
  all: unset; // Supprime focus outline = inaccessible
}

// ✅ AUTORISÉ
button {
  background: none;
  border: none;
  // Focus outline GARDÉ ou re-stylé explicitement
}
```

## 2. Respecter prefers-reduced-motion

**RÈGLE** : Déjà géré dans `_reduced-motion.scss` (ne pas dupliquer)

Le fichier doit contenir :

```scss
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important; // ⚠️ 0.01ms (pas 0.001ms)
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 3. Touch targets minimum 44×44px

**RÈGLE WCAG** : Tous les éléments interactifs doivent faire minimum 44×44px

## 4. Spacing généreux pour respiration visuelle

**RÈGLE** : Espaces généreux = apaisement, cohérence = prévisibilité

---

# 💡 CONCEPT CLÉ : SPACING

## Qu'est-ce que le spacing ?

**Spacing** = **Espacement** (marges, paddings, gaps) dans l'interface.

### Pourquoi un système de spacing ?

**❌ AVANT (chaos)** :

```scss
.button {
  padding: 7px 13px;
} // Valeurs random
.card {
  margin-bottom: 22px;
} // Incohérent
.section {
  padding: 15px;
} // Différent partout
```

**✅ APRÈS (système cohérent)** :

```scss
:root {
  --spacing-xs: 0.25rem; // 4px
  --spacing-sm: 0.5rem; // 8px
  --spacing-md: 1rem; // 16px ← BASE
  --spacing-lg: 1.5rem; // 24px
  --spacing-xl: 2rem; // 32px
}

.button {
  padding: var(--spacing-sm) var(--spacing-md);
} // 8px 16px
.card {
  margin-bottom: var(--spacing-lg);
} // 24px
.section {
  padding: var(--spacing-xl);
} // 32px
```

### Pourquoi dans `_colors.scss` et pas `_variables.scss` ?

**3 raisons** :

**1. Mode apaisé doit changer couleurs + spacing ensemble**

```scss
// Dans _colors.scss
:root {
  --focus-ring: rgba(..., 0.15);
  --spacing-md: 1rem;
}

[data-calm-mode='true'] {
  --focus-ring: rgba(..., 0.1); // ✅ Focus plus subtil
  --spacing-md: 1.5rem; // ✅ Plus d'espace
  // Tout change ensemble au même endroit !
}
```

**2. Centralisation des CSS Variables runtime**

```scss
// _colors.scss contient déjà :
--focus-ring: ...; // CSS var
--surface-bg: ...; // CSS var
--action-primary: ...; // CSS var

// Logique d'ajouter :
--spacing-md: 1rem; // Même type (CSS var)
--container-xl: 75rem; // Même type (CSS var)
```

**3. \_variables.scss reste pour SCSS compile-time**

```scss
// _variables.scss : Valeurs SCSS uniquement (compile-time)
$font-family-base: 'Inter', sans-serif;
$z-modal: 1050;
$radius-md: 0.5rem;

// _colors.scss : CSS Variables (runtime, modifiables en JS)
:root {
  --spacing-md: 1rem;
  --focus-ring: rgba(..., 0.15);
}
```

### Pourquoi c'est critique pour l'autisme ?

**Respiration visuelle = apaisement** :

- Espaces généreux = moins d'anxiété
- Cohérence (toujours `--spacing-lg` entre cartes) = prévisibilité
- Touch targets 44×44px = accessibilité motrice

---

# ✅ 📂 ARCHITECTURE CIBLE

```
src/
  styles/
    vendors/
      _normalize.scss          # ✅ Ne pas toucher (v8.0.1)
    abstracts/
      _breakpoints.scss        # ✅ Ne pas toucher (excellent)
      _colors.scss             # ⚠️ Sera modifié (ajout spacing runtime)
      _variables.scss          # (optionnel, pour SCSS vars compile-time)
    base/
      _reset.scss              # 🔧 À corriger
      _helpers.scss            # 🔧 À corriger et enrichir
      _reduced-motion.scss     # ✅ Vérifier (0.001ms → 0.01ms)
      _typography.scss         # (future étape)
      _globals.scss
    main.scss                  # 🔧 Vérifier ordre d'import
```

---

# ✅ 📘 LES 5 ÉTAPES À EXÉCUTER (STRICT)

## Étape 0 — Préparation et vérifications

**Actions** :

```bash
# 1. Créer une branche Git dédiée
git checkout -b refactor/reset-helpers

# 2. Backup des fichiers actuels
cp src/styles/base/_reset.scss src/styles/base/_reset.scss.backup
cp src/styles/base/_helpers.scss src/styles/base/_helpers.scss.backup
cp src/styles/base/_reduced-motion.scss src/styles/base/_reduced-motion.scss.backup

# 3. Vérifier les prérequis
# ✅ _breakpoints.scss existe (système unifié mobile-first)
# ✅ _colors.scss existe avec --focus-ring défini (refactor colors terminé)
# ✅ _reduced-motion.scss existe
```

**Livrables** :

- Branche Git créée
- Backups effectués
- Vérification prérequis OK

---

## Étape 1 — Vérifier et optimiser `_reduced-motion.scss`

**Objectif** : S'assurer que le fichier utilise la bonne valeur (0.01ms) et est bien importé.

**Localisation** : `src/styles/base/_reduced-motion.scss`

**Actions** :

1. **Vérifier le contenu actuel** :

```scss
// Le fichier DOIT contenir :
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important; // ⚠️ Doit être 0.01ms (pas 0.001ms)
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

2. **Si le fichier utilise `0.001ms`, corriger en `0.01ms`** :

```scss
// ❌ AVANT
animation-duration: 0.001ms !important;

// ✅ APRÈS
animation-duration: 0.01ms !important;
```

**Pourquoi 0.01ms et pas 0.001ms ?**

- `0.001ms` peut être ignoré par certains navigateurs (trop petit)
- `0.01ms` est le standard recommandé WCAG
- Valeur imperceptible à l'œil humain mais respectée par les navigateurs

**Livrables** :

- Fichier `_reduced-motion.scss` vérifié
- Valeur corrigée si nécessaire (0.001ms → 0.01ms)
- **NE PAS déplacer ce fichier** (reste dans `base/`)

---

## Étape 2 — Corriger `_reset.scss` (accessibilité critique)

**Objectif** : Supprimer `all: unset` dangereux, ajouter safe-area-inset, garder accessibilité.

**Localisation** : `src/styles/base/_reset.scss`

**Contenu à remplacer INTÉGRALEMENT** :

```scss
// base/_reset.scss
// Reset minimal, safe, accessible, mobile-first, autism-friendly

/* ============================================
   BOX-SIZING UNIVERSEL
   ============================================ */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* ============================================
   RESET MARGES PAR DÉFAUT
   ============================================ */
body,
h1,
h2,
h3,
h4,
h5,
h6,
p,
figure,
blockquote,
dl,
dd {
  margin: 0;
}

/* ============================================
   HTML & BODY BASELINE
   ============================================ */
html {
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;

  // Smooth scroll géré par _reduced-motion.scss (ne pas dupliquer ici)
}

body {
  min-height: 100vh;
  text-rendering: optimizeSpeed;
  line-height: 1.5; // Base WCAG
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  // Safe-area pour iPhone notch
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* ============================================
   MÉDIAS RESPONSIVE
   ============================================ */
img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
  height: auto;
}

/* ============================================
   INPUTS & BUTTONS (RESET SAFE)
   ============================================ */
// ⚠️ NE PAS utiliser 'all: unset' → supprime focus outline
button,
input,
textarea,
select {
  font: inherit;
  color: inherit;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
}

button {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent; // Supprime flash bleu iOS
  user-select: none;
  -webkit-user-select: none;
}

// Focus visible gardé pour accessibilité (sera stylé dans _helpers.scss)
button:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid var(--focus-ring, #3b82f6);
  outline-offset: 2px;
}

/* ============================================
   LISTES & TABLES
   ============================================ */
ul,
ol {
  list-style: none;
  padding: 0;
  margin: 0;
}

table {
  border-collapse: collapse;
  border-spacing: 0;
}

/* ============================================
   LIENS (pas de style par défaut)
   ============================================ */
a {
  color: inherit;
  text-decoration: none;
}

/* ============================================
   TOUCH DEVICE OPTIMIZATION
   ============================================ */
@media (hover: none) {
  button,
  a {
    -webkit-tap-highlight-color: transparent;
  }
}
```

**Changements critiques** :

- ✅ `all: unset` supprimé
- ✅ Focus outline gardé et stylé
- ✅ Safe-area-inset ajouté pour iPhone
- ✅ Touch optimization pour mobile
- ✅ **PAS de smooth-scroll ici** (géré par `_reduced-motion.scss`)

**Livrables** :

- Fichier `_reset.scss` corrigé
- Build validé (aucune erreur)
- Test Tab navigation : focus visible

---

## Étape 3 — Enrichir `_helpers.scss`

**Objectif** : Ajouter helpers critiques (safe-area, touch-target, mode apaisé), utiliser `respond-to()` existant.

**Localisation** : `src/styles/base/_helpers.scss`

**Contenu à remplacer INTÉGRALEMENT** :

```scss
// base/_helpers.scss
// Helpers utilitaires mobile-first, autism-friendly, accessible
@use '../abstracts/breakpoints' as *; // Ton système existant (sm: 576px, md: 768px, lg: 1024px, xl: 1200px, xxl: 1536px)

/* ============================================
   CONTAINER (mobile-first avec safe-area)
   ============================================ */
.container {
  max-width: 100%;
  margin-inline: auto;

  // Safe-area pour iPhone notch (critère mobile-first)
  padding-inline: max(var(--spacing-md, 1rem), env(safe-area-inset-left));
  padding-inline: max(var(--spacing-md, 1rem), env(safe-area-inset-right));

  // Utilise TES breakpoints existants
  @include respond-to('md') {
    max-width: var(--container-md, 48rem);
    padding-inline: var(--spacing-lg, 1.5rem);
  }

  @include respond-to('lg') {
    max-width: var(--container-lg, 64rem);
  }

  @include respond-to('xl') {
    max-width: var(--container-xl, 75rem); // ~1200px
  }

  @include respond-to('xxl') {
    max-width: var(--container-xxl, 96rem); // ~1536px
  }
}

/* ============================================
   VISUALLY HIDDEN (WCAG 2.1.1)
   ============================================ */
/// Cache visuellement un élément mais garde son accessibilité
.visually-hidden,
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/// Variante : garde l'espace dans le layout (prévisibilité autisme)
.visually-hidden-keep-space {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

/* ============================================
   TOUCH TARGET (WCAG 2.5.5 - 44×44px min)
   ============================================ */
/// Garantit une zone tactile minimum de 44×44px
/// Critique pour personnes autistes avec difficultés motrices fines
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm, 0.5rem);
}

/* ============================================
   FOCUS VISIBLE AMÉLIORÉ (autisme)
   ============================================ */
/// Focus outline subtil mais visible (15% opacity comme colors)
.focus-visible-enhanced {
  &:focus {
    outline: none; // Pas de outline au clic souris
  }

  &:focus-visible {
    outline: 3px solid var(--focus-ring, rgba(59, 130, 246, 0.15));
    outline-offset: 2px;
    border-radius: 4px;
  }
}

/* ============================================
   BUTTON RESET SAFE
   ============================================ */
/// Reset bouton sans supprimer l'accessibilité
/// Alternative à 'all: unset' dangereux
.btn-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm, 0.5rem);
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  color: inherit;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }
}

/* ============================================
   TRANSITIONS DOUCES (autisme - 500ms min)
   ============================================ */
/// Helper pour transitions douces (jamais < 300ms)
/// Respecte automatiquement prefers-reduced-motion via _reduced-motion.scss
.u-transition-smooth {
  transition-duration: 500ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/// Transition extra-lente pour changements majeurs
.u-transition-gentle {
  transition-duration: 800ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* ============================================
   MODE APAISÉ (optionnel - autisme)
   ============================================ */
/// Mode ultra-calme activable via data-attribute
/// Augmente spacing et réduit focus pour ultra-confort
[data-calm-mode='true'] {
  // Variables surchargées (définies dans _colors.scss)
  // --spacing-md: 1.5rem;
  // --focus-ring-opacity: 0.1;

  // Force toutes les animations à s'arrêter
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* ============================================
   VISIBILITY HELPERS (mobile-first)
   ============================================ */
/// Navbar visible seulement sur desktop (≥ 768px)
.navbar-desktop-only {
  display: none;

  @include respond-to('md') {
    display: block;
  }
}

/// Footer visible seulement sur desktop (≥ 768px)
.footer-desktop-only {
  display: none;

  @include respond-to('md') {
    display: block;
  }
}

/// Cache sur mobile uniquement
.hide-mobile {
  display: none;

  @include respond-to('md') {
    display: block;
  }
}

/// Affiche sur mobile uniquement
.show-mobile-only {
  display: block;

  @include respond-to('md') {
    display: none;
  }
}

/* ============================================
   LAYOUT HELPERS (flexbox rapide)
   ============================================ */
/// Stack vertical avec gap
.u-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 1rem);
}

/// Stack vertical avec gap custom
.u-stack--sm {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 0.5rem);
}

.u-stack--lg {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 1.5rem);
}

/// Row horizontal avec gap
.u-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-sm, 0.75rem);
}

/// Center absolu (rare, utiliser flexbox si possible)
.u-center-absolute {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* ============================================
   SPACING UTILITIES (optionnel mais utile)
   ============================================ */
// Margin top
.mt-0 {
  margin-top: 0;
}
.mt-xs {
  margin-top: var(--spacing-xs, 0.25rem);
}
.mt-sm {
  margin-top: var(--spacing-sm, 0.5rem);
}
.mt-md {
  margin-top: var(--spacing-md, 1rem);
}
.mt-lg {
  margin-top: var(--spacing-lg, 1.5rem);
}
.mt-xl {
  margin-top: var(--spacing-xl, 2rem);
}

// Margin bottom
.mb-0 {
  margin-bottom: 0;
}
.mb-xs {
  margin-bottom: var(--spacing-xs, 0.25rem);
}
.mb-sm {
  margin-bottom: var(--spacing-sm, 0.5rem);
}
.mb-md {
  margin-bottom: var(--spacing-md, 1rem);
}
.mb-lg {
  margin-bottom: var(--spacing-lg, 1.5rem);
}
.mb-xl {
  margin-bottom: var(--spacing-xl, 2rem);
}

// Padding
.p-0 {
  padding: 0;
}
.p-xs {
  padding: var(--spacing-xs, 0.25rem);
}
.p-sm {
  padding: var(--spacing-sm, 0.5rem);
}
.p-md {
  padding: var(--spacing-md, 1rem);
}
.p-lg {
  padding: var(--spacing-lg, 1.5rem);
}
.p-xl {
  padding: var(--spacing-xl, 2rem);
}

// Padding inline (horizontal) - utile mobile-first
.px-0 {
  padding-inline: 0;
}
.px-sm {
  padding-inline: var(--spacing-sm, 0.5rem);
}
.px-md {
  padding-inline: var(--spacing-md, 1rem);
}
.px-lg {
  padding-inline: var(--spacing-lg, 1.5rem);
}
```

**Nouveautés critiques** :

- ✅ Safe-area-inset dans `.container`
- ✅ `.touch-target` 44×44px (WCAG 2.5.5)
- ✅ `.u-transition-smooth` 500ms (autisme)
- ✅ `.u-transition-gentle` 800ms (changements majeurs)
- ✅ `[data-calm-mode]` pour mode ultra-apaisé
- ✅ Utilise TON `respond-to()` avec TES breakpoints
- ✅ Spacing utilities optionnelles mais utiles

**Livrables** :

- Fichier `_helpers.scss` enrichi
- Build validé
- Test `.touch-target` sur mobile

---

## Étape 4 — Ajouter CSS variables runtime dans `_colors.scss`

**Objectif** : Ajouter les variables spacing et container dans le fichier colors existant (centralisation runtime).

**Localisation** : `src/styles/abstracts/_colors.scss`

**Action** : Ajouter cette section APRÈS la section dark mode, AVANT les helpers SCSS :

```scss
// ============================================
// SECTION 7 : CSS VARIABLES RUNTIME (spacing & container)
// ============================================
// Variables runtime pour helpers, layout et mode apaisé
// Centralisées dans _colors.scss pour cohérence avec mode apaisé
//
// POURQUOI ICI ?
// 1. Mode apaisé doit changer couleurs + spacing ensemble
// 2. Centralisation des CSS vars runtime (modifiables en JS)
// 3. _variables.scss reste pour SCSS compile-time uniquement

:root {
  // ---- Spacing system (échelle cohérente mobile-first) ----
  // Base : 1rem = 16px
  --spacing-xs: 0.25rem; // 4px   - Gap minimal, bordures fines
  --spacing-sm: 0.5rem; // 8px   - Padding boutons, gap icône/texte
  --spacing-md: 1rem; // 16px  - BASE (padding cards, gap éléments)
  --spacing-lg: 1.5rem; // 24px  - Entre sections, marges importantes
  --spacing-xl: 2rem; // 32px  - Grandes marges, padding héros
  --spacing-2xl: 3rem; // 48px  - Entre grandes sections
  --spacing-3xl: 4rem; // 64px  - Espaces majeurs (rare)

  // ---- Container max-width (responsive) ----
  --container-sm: 36rem; // 576px  - Petits mobiles
  --container-md: 48rem; // 768px  - Tablettes
  --container-lg: 64rem; // 1024px - Desktop
  --container-xl: 75rem; // 1200px - Large desktop (aligné avec breakpoint xl)
  --container-xxl: 96rem; // 1536px - Ultra-wide (aligné avec breakpoint xxl)
}

// ============================================
// Dark mode : spacing reste identique
// ============================================
// Les spacings ne changent pas en dark mode (pas de surcharge)

// ============================================
// Mode apaisé : spacing augmenté
// ============================================
[data-calm-mode='true'] {
  // Augmente les spacings pour plus de respiration
  --spacing-xs: 0.375rem; // 6px  au lieu de 4px
  --spacing-sm: 0.75rem; // 12px au lieu de 8px
  --spacing-md: 1.25rem; // 20px au lieu de 16px
  --spacing-lg: 2rem; // 32px au lieu de 24px
  --spacing-xl: 2.5rem; // 40px au lieu de 32px

  // Focus encore plus subtil (défini dans section couleurs plus haut)
  // --focus-ring: déjà surchargé dans la section 5
}
```

**⚠️ NE PAS dupliquer `--focus-ring`** : Il est déjà défini dans les sections précédentes de `_colors.scss`.

**Explications pour le développeur futur** :

```scss
/* ============================================
   📘 POURQUOI SPACING DANS _colors.scss ?
   ============================================
   
   SPACING = Espacement (marges, paddings, gaps)
   
   Exemple concret :
   
   .activity-card {
     padding: var(--spacing-lg);           // 24px intérieur
     margin-bottom: var(--spacing-md);     // 16px entre cartes
     gap: var(--spacing-sm);               // 8px entre icône/texte
   }
   
   POURQUOI ICI (et pas dans _variables.scss) ?
   
   1. Mode apaisé change ENSEMBLE :
      - Couleurs plus douces (--focus-ring: 0.1 au lieu de 0.15)
      - Espacements plus généreux (--spacing-md: 1.25rem au lieu de 1rem)
      → Tout au même endroit !
   
   2. CSS Variables = modifiables en JavaScript runtime
      [data-calm-mode="true"] change instantanément sans recompiler
   
   3. _variables.scss reste pour SCSS compile-time :
      $font-family-base, $z-modal, etc. (valeurs fixes)
   
   CRITIQUE AUTISME :
   - Espaces généreux = respiration visuelle = apaisement
   - Cohérence (toujours --spacing-lg) = prévisibilité rassurante
   - Mode apaisé = adaptation aux besoins sensoriels
   ============================================ */
```

**Livrables** :

- Section ajoutée dans `_colors.scss`
- Variables `--spacing-*` et `--container-*` disponibles
- Mode apaisé configure avec spacings augmentés
- Build validé

---

## Étape 5 — Vérifier l'ordre d'import dans `main.scss`

**Objectif** : S'assurer que tous les fichiers sont importés dans le bon ordre avec `@use`.

**Localisation** : `src/styles/main.scss`

**Ordre d'import recommandé** :

```scss
// main.scss
// Point d'entrée SCSS pour Next.js 16
// Ordre d'import critique : vendors → abstracts → base → components

/* ============================================
   1. VENDORS (normalize en premier)
   ============================================ */
@use './vendors/normalize';

/* ============================================
   2. ABSTRACTS (fondations)
   ============================================ */
@use './abstracts/breakpoints' as *; // Ton système unifié (sm, md, lg, xl, xxl)
@use './abstracts/colors' as *; // Couleurs + tokens + spacing runtime

/* ============================================
   3. BASE (reset, helpers, reduced-motion, typography future)
   ============================================ */
@use './base/reset';
@use './base/reduced-motion'; // ✅ Géré séparément (prefers-reduced-motion)
@use './base/helpers';
// @use './base/typography';          // Future étape (Priorité 1 après reset/helpers)

/* ============================================
   4. GLOBALS (styles globaux app)
   ============================================ */
@use './globals';

/* ============================================
   5. COMPONENTS (si nécessaire)
   ============================================ */
// Les composants Next.js avec CSS Modules n'ont pas besoin d'être importés ici
// Sauf si tu as des composants SCSS globaux
```

**Points de vérification** :

1. ✅ `vendors/normalize` en premier (base navigateur)
2. ✅ `abstracts/breakpoints` avant helpers (utilisé par helpers)
3. ✅ `abstracts/colors` avant helpers (variables spacing utilisées)
4. ✅ `base/reset` avant helpers (fondations)
5. ✅ `base/reduced-motion` après reset (override animations)
6. ✅ `base/helpers` utilise breakpoints + colors

**Livrables** :

- `main.scss` vérifié/mis à jour
- Ordre d'import validé
- Build Next.js réussi
- Aucune erreur SCSS

---

# 🎯 CHECKLIST FINALE

```
Préparation
□ Étape 0 : Backup effectué + branche Git créée
□ Vérification : _colors.scss existe (refactor colors terminé)
□ Vérification : _breakpoints.scss existe (déjà excellent ✅)
□ Vérification : _reduced-motion.scss existe

Corrections & Optimisations
□ Étape 1 : _reduced-motion.scss vérifié
  └─ Valeur corrigée si nécessaire (0.001ms → 0.01ms)
  └─ Fichier bien placé dans base/

□ Étape 2 : _reset.scss corrigé
  └─ all: unset supprimé
  └─ Focus outline gardé
  └─ Safe-area-inset ajouté
  └─ PAS de smooth-scroll (géré par _reduced-motion.scss)

□ Étape 3 : _helpers.scss enrichi
  └─ .touch-target ajouté (44×44px)
  └─ .u-transition-smooth ajouté (500ms)
  └─ .u-transition-gentle ajouté (800ms)
  └─ Safe-area dans .container
  └─ [data-calm-mode] ajouté
  └─ Utilise respond-to() existant
  └─ Spacing utilities optionnelles

□ Étape 4 : Variables runtime ajoutées dans _colors.scss
  └─ --spacing-* défini (xs, sm, md, lg, xl, 2xl, 3xl)
  └─ --container-* défini (sm, md, lg, xl, xxl)
  └─ Mode apaisé avec spacings augmentés
  └─ Pas de duplication --focus-ring
  └─ Documentation ajoutée (pourquoi spacing ici)

□ Étape 5 : main.scss vérifié
  └─ Ordre d'import correct
  └─ _reduced-motion.scss importé après reset
  └─ Tous les fichiers présents

Validation
□ Build Next.js réussi (npm run dev)
□ Test navigation Tab : focus visible
□ Test prefers-reduced-motion : animations stoppées
□ Test mobile : .container avec safe-area OK
□ Test breakpoints : respond-to() fonctionne (576px, 768px, 1024px, 1200px, 1536px)
□ Test spacing : variables disponibles (--spacing-md, --spacing-lg, etc.)
□ Test mode apaisé : [data-calm-mode="true"] change spacing
□ Aucune erreur SCSS
□ Aucune régression visuelle
□ Commit et merge après validation complète
```

---

# ⚠️ RÈGLES DE COMMUNICATION

- **Demander confirmation avant de supprimer un fichier**
- **Ne PAS toucher à `_breakpoints.scss`** (déjà excellent)
- **Ne PAS déplacer `_reduced-motion.scss`** (juste vérifier/optimiser)
- **Montrer le diff des modifications importantes**
- **Signaler tout conflit avec \_colors.scss**
- **Tester après chaque étape**
- **Commit après chaque fichier validé**
- **Ne jamais casser le build**

---

# 📊 RÉSUMÉ DES TECHNOLOGIES

| Technologie                | Usage                                                     | Impact autisme        | Status                        |
| -------------------------- | --------------------------------------------------------- | --------------------- | ----------------------------- |
| **`@use` SCSS**            | Import moderne                                            | Namespacing propre    | ✅ À utiliser                 |
| **Breakpoints system**     | sm: 576px, md: 768px, lg: 1024px, xl: 1200px, xxl: 1536px | Mobile-first garanti  | ✅ **DÉJÀ FAIT**              |
| **Mixin respond-to()**     | Media queries cohérentes                                  | Standards modernes    | ✅ **DÉJÀ FAIT**              |
| **prefers-reduced-motion** | Respect préférence utilisateur                            | **CRITIQUE**          | ✅ **DÉJÀ FAIT** (à vérifier) |
| **CSS Variables spacing**  | Runtime modifiable                                        | Mode apaisé possible  | ⚠️ À ajouter                  |
| **focus-visible**          | Focus clavier uniquement                                  | Moins visuel/agressif | ⚠️ À corriger                 |
| **safe-area-inset**        | Support notch iPhone                                      | Pas de coupure        | ⚠️ À ajouter                  |
| **Touch target 44px**      | WCAG 2.5.5                                                | Motricité fine        | ⚠️ À ajouter                  |
| **Spacing généreux**       | Respiration visuelle                                      | Apaisement            | ⚠️ À ajouter                  |

---

# 🎨 CONCEPT CLÉ : SYSTÈME DE SPACING

## Échelle de spacing (mobile-first)

```
--spacing-xs:  4px   ━━━━━━━━━━━━━━━━━  Gap minimal
--spacing-sm:  8px   ━━━━━━━━━━━━━━━━━  Padding bouton
--spacing-md:  16px  ━━━━━━━━━━━━━━━━━  BASE (padding cards)
--spacing-lg:  24px  ━━━━━━━━━━━━━━━━━  Entre sections
--spacing-xl:  32px  ━━━━━━━━━━━━━━━━━  Grandes marges
--spacing-2xl: 48px  ━━━━━━━━━━━━━━━━━  Espaces majeurs
--spacing-3xl: 64px  ━━━━━━━━━━━━━━━━━  Héros (rare)
```

## Exemple d'usage (planning visuel)

```scss
// Card d'activité
.activity-card {
  padding: var(--spacing-lg); // 24px intérieur
  margin-bottom: var(--spacing-md); // 16px entre cartes
  gap: var(--spacing-sm); // 8px entre icône/texte
}

// Mode apaisé : spacing augmenté automatiquement
[data-calm-mode='true'] {
  // --spacing-lg devient 32px
  // --spacing-md devient 20px
  // --spacing-sm devient 12px
}
```

## Pourquoi c'est critique pour l'autisme ?

1. **Respiration visuelle = apaisement**
   - Espaces généreux réduisent anxiété
   - Moins de densité = moins de surcharge sensorielle

2. **Cohérence = prévisibilité**
   - Toujours `--spacing-lg` entre cartes
   - Pattern prévisible rassure

3. **Mode apaisé = adaptation**
   - Spacings augmentés pour ultra-confort
   - Changement instantané sans recompiler

---

# 🚀 PRÊT À EXÉCUTER

Ce plan est optimisé pour Claude Code CLI. Suis strictement les étapes dans l'ordre.

**Dépendances** :

- ✅ Refactor colors TERMINÉ (`_colors.scss` avec `--focus-ring` défini)
- ✅ Breakpoints system TERMINÉ (`_breakpoints.scss` excellent)
- ✅ Reduced-motion existant (`_reduced-motion.scss` à vérifier)
- ✅ Next.js 16 avec SCSS configuré
- ✅ Package `sass` installé

**Changements par rapport à la version originale** :

- Étape 1 : Vérification `_reduced-motion.scss` (pas création)
- Étapes adaptées pour utiliser **TES** breakpoints existants
- Spacing centralisé dans `_colors.scss` (avec explications détaillées)
- Documentation enrichie sur le concept de spacing

**Après ce refactor, tu seras prêt pour** :

- 🔜 Étape suivante : **Typographie** (priorité 1 absolue)

Bonne exécution ! 🎨
