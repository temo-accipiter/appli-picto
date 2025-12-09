# 🎯 OBJECTIF

Mettre en place un système de couleurs moderne, robuste et maintenable dans mon projet Next.js + TypeScript + SCSS (pas de Tailwind).

Le but :

- simplifier toute l'architecture SCSS,
- centraliser toutes les couleurs dans un seul fichier,
- supprimer progressivement les hex-codes dispersés,
- exposer des tokens CSS utilisables pour dark mode,
- garder le compat avec le code existant pendant la migration,
- utiliser des technologies modernes (CSS Variables, color-mix, éventuel OKLCH).

---

# 📌 CONTEXTE ACTUEL

- Projet Next.js 16 + TypeScript
- SCSS structuré sous `/src/styles/`
- Beaucoup de couleurs hardcodées dans les fichiers de composants
- Plusieurs fichiers SCSS se chevauchent (`_colors.scss`, `variables.scss`, `_theme-vars.scss`)
- Pas de Tailwind
- **🧩 Application destinée aux personnes autistes** : Design sensori-friendly obligatoire
- Besoin de couleurs apaisantes, contrastes modérés (pas extrêmes), accessibilité WCAG AA
- Animations très douces, pas de mouvements brusques
- Possibilité d'utiliser Turbopack (bundler moderne de Next.js 16)

---

# ⚠️ CONTRAINTES CRITIQUES

1. **Ne pas casser le build.**
2. **Ne pas supprimer un fichier sans me demander.**
3. **Faire la migration progressivement, fichier SCSS par fichier SCSS.**
4. **Laisser une compatibilité maximale avec l'existant.**
5. **Ne pas modifier les composants React (JSX/TSX), sauf si absolument nécessaire (rare).**
6. **Utiliser SCSS + CSS Variables, pas Tailwind.**
7. **Utiliser des couleurs modernes (option OKLCH autorisée avec fallback).**

---

# 🧩 CONTRAINTES SPÉCIFIQUES AUTISME (PRIORITAIRES)

Ces contraintes sont **NON-NÉGOCIABLES** car l'application est destinée aux personnes autistes :

## 1. Couleurs sensori-friendly obligatoires

**✅ À PRIVILÉGIER** :

- Couleurs douces, peu saturées (muted tones)
- Tons pastel : bleus pâles, verts doux, violets pastel
- Tons neutres : beiges, gris chauds, terres douces
- Contrastes modérés : 4.5:1 minimum, **10:1 MAXIMUM**

**❌ À ÉVITER ABSOLUMENT** :

- Couleurs vives/saturées (bleu électrique #0b74ff, rouge vif #ff0000)
- Néons et couleurs fluorescentes
- Blanc pur (#fff) sur noir pur (#000) = contraste 21:1 trop agressif
- Dégradés complexes ou motifs répétitifs
- Animations brusques ou clignotements

**Base scientifique** :
Les personnes autistes préfèrent les teintes pastel et tons atténués tout en évitant les couleurs vives et brillantes. Les couleurs vives ou intenses peuvent submerger certains enfants autistes, tandis que les couleurs plus douces tendent à être plus apaisantes.

## 2. Cohérence sémantique des couleurs

**RÈGLE ABSOLUE** : Une couleur = une signification (toujours la même)

```scss
// ✅ CORRECT
--planning-routine: violet // TOUJOURS = routine
  --planning-leisure: vert // TOUJOURS = loisir
  // ❌ INTERDIT
  .button-success {background:
  var(--planning-leisure) ;}; // ❌ Vert = confusion
```

**Pourquoi ?** Les personnes autistes peuvent créer du sens par l'utilisation appropriée des couleurs, le codage couleur aide à créer des catégories visuelles claires.

## 3. Jamais de couleur seule comme indicateur

**RÈGLE ABSOLUE** : Toujours accompagner la couleur d'icônes + texte

```html
<!-- ✅ CORRECT : Couleur + Icône + Texte -->
<div class="activity" style="background: var(--planning-routine)">
  <span class="icon">🔄</span>
  <span class="label">Routine du matin</span>
</div>

<!-- ❌ INTERDIT : Couleur seule -->
<div class="activity" style="background: var(--planning-routine)"></div>
```

**Pourquoi ?** Les utilisateurs autistes peuvent avoir une sensibilité sensorielle aux informations comme les couleurs, qui peuvent causer de l'anxiété ou de la douleur. L'ajout d'icônes/texte réduit la charge cognitive.

## 4. Test daltonisme obligatoire

**RÈGLE** : Les 6 couleurs du planning doivent rester distinguables pour les daltoniens

**Test obligatoire avec** :

- Protanopie (rouge-vert)
- Deutéranopie (rouge-vert)
- Tritanopie (bleu-jaune)
- Achromatopsie (noir et blanc)

**Outil** : Chrome DevTools > Rendering > "Emulate vision deficiencies"

## 5. Animations très douces uniquement

**RÈGLE** : Pas de mouvements brusques, transitions lentes

```scss
// ✅ CORRECT
transition: background 500ms cubic-bezier(0.4, 0, 0.2, 1);

// ❌ INTERDIT
transition: all 100ms ease; // Trop rapide
animation: bounce 0.3s; // Trop brusque
```

**Pourquoi ?** Les individus sensibles aux stimuli sensoriels peuvent être submergés par des animations excessives ou des couleurs vives.

---

# ⚡ RÈGLE TECHNIQUE CRITIQUE (Import SASS)

**ATTENTION** : En SCSS moderne (Dart Sass), les variables définies dans `_colors.scss` ne sont PAS automatiquement disponibles dans les composants juste parce qu'elles sont importées dans `main.scss`.

**SOLUTION OBLIGATOIRE** :

- Les composants doivent utiliser **uniquement CSS Variables** (`var(--token-name)`).
- Les fonctions SASS (`darken`, `lighten`, `token()`) sont utilisées **uniquement dans `_colors.scss`** pour générer les CSS vars.
- **INTERDICTION** d'utiliser `@use 'colors'` dans les fichiers de composants.
- **Privilégier `color-mix()` et relative color syntax** plutôt que des helpers SCSS custom dans les composants.

**Pattern à suivre** :

```scss
// ✅ DANS _colors.scss : génère les CSS vars
:root {
  --action-primary: #0b74ff;
  --action-primary-hover: #0a66d6; // Généré avec darken() en SCSS
}

// ✅ DANS les composants : utilise var() uniquement
.button {
  background: var(--action-primary);

  &:hover {
    background: var(--action-primary-hover);
    // OU avec color-mix :
    background: color-mix(in srgb, var(--action-primary) 80%, black);
  }
}

// ❌ INTERDIT dans les composants
.button {
  background: token('action-primary'); // ❌ token() n'existe pas ici !
}
```

---

# ✅ 📂 ARCHITECTURE FINALISÉE À METTRE EN PLACE

```
src/
  styles/
    abstracts/
      _colors.scss      # Palette + tokens + CSS vars (UNIQUE source of truth)
      _variables.scss   # Spacing, typography, shadows, z-index, radius, durations
    base/
      _normalize.scss
      _reset.scss
      _typography.scss
      _helpers.scss
    _globals.scss
    main.scss
```

**Actions sur les fichiers** :

- Fusionner `_theme-vars.scss` dans `_colors.scss` (après migration)
- Supprimer `_theme-vars.scss` une fois la fusion validée
- Garder `_variables.scss` uniquement pour les non-couleurs

---

# ✅ 📘 LES 8 ÉTAPES À EXÉCUTER (STRICT)

## Étape 0 — Préparation

**Actions** :

```bash
# 1. Créer une branche Git
git checkout -b refactor/colors

# 2. Backup du dossier styles
cp -r src/styles src/styles.backup

# 3. Vérifier la config Next.js (next.config.ts ou next.config.js)
# Vérifier que 'sass' est installé
npm list sass || npm install --save-dev sass
```

**Configuration Next.js 16** :

```ts
// next.config.ts (TypeScript - recommandé Next.js 16)
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Configuration SCSS (obligatoire)
  sassOptions: {
    includePaths: ['src/styles'],
    // Options additionnelles si nécessaire :
    // additionalData: `@use '@/styles/abstracts/colors' as *;`
  },

  // Si tu utilises Turbopack (optionnel mais recommandé pour Next.js 16)
  experimental: {
    turbopackFileSystemCacheForDev: true, // Cache pour dev rapide
  },

  // Alias pour Turbopack (si utilisé)
  turbopack: {
    resolveAlias: {
      '@styles': './src/styles',
      '@': './src',
    },
  },
}

export default nextConfig
```

**OU en JavaScript** :

```js
// next.config.js (si tu préfères JS)
/** @type {import('next').NextConfig} */
const nextConfig = {
  sassOptions: {
    includePaths: ['src/styles'],
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
}

module.exports = nextConfig
```

**Livrables** :

- Branche Git créée
- Backup effectué
- Package `sass` installé et vérifié
- Config Next.js 16 vérifiée (next.config.ts avec sassOptions)
- Cache Turbopack activé (optionnel mais recommandé pour performance)

---

## Étape 1 — Audit complet des hex-codes

**Actions** :

```bash
# Audit avec exclusions et tri
grep -r "#[0-9a-fA-F]\{3,6\}" src/ \
  --include="*.scss" \
  --include="*.css" \
  --exclude-dir=node_modules \
  | sort -u > colors-audit.txt

# Compter les occurrences par couleur
cut -d: -f2 colors-audit.txt | sort | uniq -c | sort -nr > colors-frequency.txt
```

**Livrables** :

- `colors-audit.txt` : liste complète des hex-codes
- `colors-frequency.txt` : fréquence d'usage par couleur
- **Ne refactorer AUCUN fichier pour le moment**

---

## Étape 2 — Créer le fichier `_colors.scss` moderne

**Localisation** : `src/styles/abstracts/_colors.scss`

**Structure obligatoire** :

```scss
// ============================================
// 🧩 SECTION 1 : PALETTE SENSORI-FRIENDLY (AUTISME)
// ============================================
// Recherches scientifiques : Les personnes autistes préfèrent :
// - Couleurs douces, peu saturées (muted tones)
// - Tons pastel et neutres (bleus pâles, verts doux, terres)
// - Éviter : couleurs vives/saturées, néons, contrastes extrêmes

$sensory-friendly: (
  // Couleurs primaires douces (pas de bleu électrique)
  'primary': #5b8fd6,
  // Bleu ciel doux (au lieu de #0b74ff agressif)
  'secondary': #a78bfa,
  // Violet pastel doux
  'success': #6ee7b7,
  // Vert menthe apaisant
  'warning': #fbbf24,
  // Jaune miel doux
  'danger': #fca5a5,

  // Rose saumon (au lieu de rouge vif)
  // Neutres à faible contraste (éviter blanc pur/noir pur)
  'neutral-bg': #f9fafb,
  // Fond très légèrement teinté
  'neutral-surface': #ffffff,
  'neutral-border': #e5e7eb,
  // Bordures très subtiles
  'neutral-text': #374151 // Gris foncé (au lieu de noir pur)
);

// ============================================
// SECTION 2 : PALETTE SOURCE (adaptée autisme)
// ============================================
$brand-primary: map-get($sensory-friendly, 'primary');
$brand-secondary: map-get($sensory-friendly, 'secondary');
$brand-success: map-get($sensory-friendly, 'success');
$brand-warning: map-get($sensory-friendly, 'warning');
$brand-danger: map-get($sensory-friendly, 'danger');
$neutral-base: map-get($sensory-friendly, 'neutral-text');

// ============================================
// SECTION 3 : PALETTES ÉTENDUES (si nécessaire)
// ============================================
$primary-palette: (
  50: #eff6ff,
  100: #dbeafe,
  200: #bfdbfe,
  300: #93c5fd,
  400: #60a5fa,
  500: $brand-primary,
  // #5b8fd6 (doux)
  600: #4a7ac2,
  700: #3b66a8,
  800: #2d5189,
  900: #1e3a5f,
);

// ============================================
// SECTION 4 : CSS VARIABLES (tokens sémantiques)
// ============================================
:root {
  // ---- Sources ----
  --color-primary: #{$brand-primary};
  --color-secondary: #{$brand-secondary};
  --color-success: #{$brand-success};
  --color-warning: #{$brand-warning};
  --color-danger: #{$brand-danger};

  // ---- Surfaces (tons très doux) ----
  --surface-bg: #{map-get($sensory-friendly, 'neutral-bg')};
  --surface-soft: #f3f4f6;
  --surface-elevated: #ffffff;
  --surface-border: #{map-get($sensory-friendly, 'neutral-border')};

  // ---- Textes (éviter noir pur #000) ----
  --text-primary: #1f2937; // Gris très foncé au lieu de #111827
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --text-inverse: #ffffff;

  // ---- Actions (couleurs atténuées) ----
  --action-primary: var(--color-primary);
  --action-primary-hover: #4a7ac2;
  --action-secondary: var(--color-secondary);
  --action-disabled: #d1d5db;
  --action-danger: var(--color-danger);

  // ---- États ----
  --status-success: var(--color-success);
  --status-warning: var(--color-warning);
  --status-danger: var(--color-danger);

  // ---- Focus ring TRÈS SUBTIL (15% opacity) ----
  --focus-ring: #{rgba($brand-primary, 0.15)};
  --link: var(--color-primary);
  --link-hover: #4a7ac2;

  // ---- 🧩 COULEURS PLANNING VISUEL (SECTION CRITIQUE) ----
  // Catégories d'activités (doivent être distinguables mais harmonieuses)
  --planning-routine: #a78bfa; // Violet pastel (routine)
  --planning-leisure: #6ee7b7; // Vert menthe (loisir)
  --planning-learning: #5b8fd6; // Bleu doux (apprentissage)
  --planning-selfcare: #f9a8d4; // Rose poudré (soins personnels)
  --planning-transition: #fbbf24; // Jaune miel (transition)
  --planning-break: #9ca3af; // Gris doux (pause)

  // États des activités
  --planning-completed: #6ee7b7; // Vert menthe
  --planning-inprogress: #5b8fd6; // Bleu doux
  --planning-upcoming: #d1d5db; // Gris clair
  --planning-overdue: #fca5a5; // Rose saumon (pas rouge agressif)

  // Pictogrammes
  --picto-bg: #ffffff;
  --picto-border: #e5e7eb;
  --picto-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

// ============================================
// SECTION 5 : DARK MODE (spécialisé autisme)
// ============================================
// Pour les autistes : dark mode vraiment sombre mais PAS noir pur
[data-theme='dark'] {
  // Éviter le noir pur (#000) - trop de contraste agressif
  --surface-bg: #0f172a; // Bleu nuit très foncé
  --surface-soft: #1e293b;
  --surface-elevated: #334155;
  --surface-border: #475569; // Bordures visibles mais douces

  --text-primary: #f1f5f9; // Blanc cassé (pas blanc pur)
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;

  // Réduire la saturation des couleurs en dark mode
  --action-primary: #60a5fa;
  --action-primary-hover: #3b82f6;
  --focus-ring: #{rgba(#60a5fa, 0.2)};

  // Planning visuel en dark mode (couleurs moins saturées)
  --planning-routine: #9333ea;
  --planning-leisure: #10b981;
  --planning-learning: #3b82f6;
  --planning-selfcare: #ec4899;
  --planning-transition: #f59e0b;
  --planning-break: #6b7280;
}

// Fallback auto pour prefers-color-scheme
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --surface-bg: #0f172a;
    --surface-soft: #1e293b;
    --surface-elevated: #334155;
    --surface-border: #475569;
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --text-muted: #94a3b8;
  }
}

// ============================================
// SECTION 6 : HELPERS SCSS (usage interne)
// ============================================
$tokens: (
  'surface-bg': var(--surface-bg),
  'surface-soft': var(--surface-soft),
  'text-primary': var(--text-primary),
  'action-primary': var(--action-primary),
  'planning-routine': var(--planning-routine),
  'planning-leisure': var(--planning-leisure),
  'planning-learning': var(--planning-learning),
  'planning-selfcare': var(--planning-selfcare),
  'planning-transition': var(--planning-transition),
  'planning-break': var(--planning-break), // ... compléter avec tous les tokens
);

@function token($name) {
  @if map-has-key($tokens, $name) {
    @return map-get($tokens, $name);
  }
  @warn "⚠️ Token `#{$name}` introuvable - vérifier _colors.scss";
  @return hotpink;
}

@function shade($palette-name, $shade) {
  $palette: null;
  @if $palette-name == 'primary' {
    $palette: $primary-palette;
  }
  @return map-get($palette, $shade);
}
```

**Options OKLCH (Phase 2 - après validation hex)** :

```scss
// Si migration vers OKLCH, ajouter avec @supports :
:root {
  --color-primary: #5b8fd6; // Fallback

  @supports (color: oklch(0% 0 0)) {
    --color-primary: oklch(65% 0.12 250); // OKLCH avec saturation réduite
  }
}
```

**Livrables** :

- Fichier `_colors.scss` créé avec structure complète
- Palette source basée sur les couleurs actuelles du projet
- 15-20 tokens sémantiques définis
- CSS Variables exposées en `:root`
- Dark mode configuré

---

## Étape 3 — Nettoyer et fusionner `_variables.scss` + `_theme-vars.scss`

**Objectif** : Garder `_variables.scss` uniquement pour les non-couleurs.

**Actions** :

1. **Copier le contenu de `_theme-vars.scss`** dans `_variables.scss` temporairement
2. **Migrer toutes les couleurs** de `_variables.scss` vers `_colors.scss`
3. **Supprimer les doublons**
4. **Garder dans `_variables.scss` uniquement** :
   - Spacing
   - Typography (font-family, sizes, weights, line-heights)
   - Shadows (avec `color-mix` pour les couleurs)
   - Z-index
   - Border-radius
   - Transitions/durations

**Structure finale de `_variables.scss`** :

```scss
// ============================================
// SPACING
// ============================================
$spacing-xs: 0.25rem;
$spacing-sm: 0.5rem;
$spacing-md: 1rem;
$spacing-lg: 1.5rem;
$spacing-xl: 2rem;

// ============================================
// TYPOGRAPHY
// ============================================
$font-family-base:
  'Inter',
  -apple-system,
  sans-serif;
$font-size-xs: 0.75rem;
$font-size-sm: 0.875rem;
$font-size-base: 1rem;
$font-size-lg: 1.125rem;
$font-size-xl: 1.25rem;

$font-weight-normal: 400;
$font-weight-medium: 500;
$font-weight-semibold: 600;
$font-weight-bold: 700;

$line-height-tight: 1.25;
$line-height-normal: 1.5;
$line-height-relaxed: 1.75;

// ============================================
// SHADOWS (avec color-mix pour les couleurs)
// ============================================
:root {
  --shadow-xs: 0 1px 2px 0 color-mix(in srgb, black 5%, transparent);
  --shadow-sm: 0 1px 3px 0 color-mix(in srgb, black 10%, transparent);
  --shadow-md: 0 4px 6px -1px color-mix(in srgb, black 10%, transparent);
  --shadow-lg: 0 10px 15px -3px color-mix(in srgb, black 10%, transparent);
  --shadow-xl: 0 20px 25px -5px color-mix(in srgb, black 10%, transparent);
}

// ============================================
// Z-INDEX
// ============================================
$z-dropdown: 1000;
$z-sticky: 1020;
$z-fixed: 1030;
$z-modal-backdrop: 1040;
$z-modal: 1050;
$z-popover: 1060;
$z-tooltip: 1070;

// ============================================
// BORDER RADIUS
// ============================================
$radius-none: 0;
$radius-sm: 0.125rem;
$radius-md: 0.375rem;
$radius-lg: 0.5rem;
$radius-xl: 0.75rem;
$radius-full: 9999px;

// ============================================
// TRANSITIONS
// ============================================
$duration-fast: 150ms;
$duration-normal: 300ms;
$duration-slow: 500ms;

$easing-linear: linear;
$easing-ease: ease;
$easing-smooth: cubic-bezier(0.4, 0, 0.2, 1);
$easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

**⚠️ Backward compatibility** : Ajouter des commentaires `// DEPRECATED` sur les anciennes variables couleur avant de les supprimer :

```scss
// DEPRECATED: use var(--text-primary) instead
$text-color: #111827;
```

**Livrables** :

- `_variables.scss` nettoyé (uniquement non-couleurs)
- Anciennes variables couleur commentées avec `// DEPRECATED`
- Demander validation avant de supprimer `_theme-vars.scss`

---

## Étape 4 — Import structuré dans `main.scss`

**Ordre d'import obligatoire** :

```scss
// main.scss

// 1. Abstracts (source of truth en premier)
@use './abstracts/colors' as *;
@use './abstracts/variables' as *;

// 2. Base
@use './base/normalize';
@use './base/reset';
@use './base/typography';
@use './base/helpers';

// 3. Globals
@use './globals';

// 4. Components (si nécessaire)
// Les composants avec CSS Modules n'ont PAS besoin d'être importés ici
```

**Livrables** :

- `main.scss` mis à jour avec l'ordre correct
- Build Next.js validé (aucune erreur)

---

## Étape 5 — Refactor progressif composant par composant

**Stratégie** : Commencer par les composants les plus utilisés (détectés dans `colors-frequency.txt`).

**Ordre de priorité** :

1. Globals (`_globals.scss`)
2. Composants de base (buttons, cards, inputs)
3. Composants layout (header, footer, sidebar)
4. Composants spécifiques (modals, dropdowns, etc.)

**Patterns de refactoring obligatoires** :

### Pattern 1 : Background + Text + Border

```scss
// ❌ AVANT
.card {
  background: #ffffff;
  color: #111827;
  border: 1px solid #e5e7eb;
}

// ✅ APRÈS
.card {
  background: var(--surface-bg);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
}
```

### Pattern 2 : Hover avec color-mix

```scss
// ❌ AVANT
.button {
  background: #0b74ff;
}
.button:hover {
  background: #0a66d6; // Magic number
}

// ✅ APRÈS (Option A : token dédié)
.button {
  background: var(--action-primary);

  &:hover {
    background: var(--action-primary-hover);
  }
}

// ✅ APRÈS (Option B : color-mix)
.button {
  background: var(--action-primary);

  &:hover {
    background: color-mix(in srgb, var(--action-primary) 80%, black);
  }
}
```

### Pattern 3 : Opacité / Alpha

```scss
// ❌ AVANT
.overlay {
  background: rgba(0, 0, 0, 0.5);
}

// ✅ APRÈS
.overlay {
  background: color-mix(in srgb, var(--text-primary), transparent 50%);
}
```

### Pattern 4 : Box-shadow

```scss
// ❌ AVANT
.card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

// ✅ APRÈS
.card {
  box-shadow: var(--shadow-md);
}
```

### Pattern 5 : Focus ring

```scss
// ❌ AVANT
.input:focus {
  outline: 2px solid #0b74ff;
  outline-offset: 2px;
}

// ✅ APRÈS
.input:focus {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

**Livrables après chaque composant** :

- Fichier SCSS refactorisé
- Build validé (aucune erreur)
- Test visuel effectué (comparer avant/après)
- Commit Git avec message : `refactor(colors): migrate [ComponentName] to tokens`

---

## Étape 6 — Validation WCAG AA + Critères spécifiques autisme

**Objectif** : Vérifier le contraste des couleurs pour l'accessibilité ET les besoins sensoriels des personnes autistes.

### 🧩 Critères WCAG AA standard

**Paires critiques à vérifier** :

```scss
// Minimum WCAG AA (4.5:1 pour texte normal, 3:1 pour texte large)
--text-primary (#1f2937) sur --surface-bg (#f9fafb) → min 4.5:1
--text-secondary (#6b7280) sur --surface-bg → min 4.5:1
--text-muted (#9ca3af) sur --surface-bg → min 4.5:1
--action-primary (bouton) → min 3:1 (si texte large/bold)
```

### 🧩 Critères spécifiques autisme (CRITIQUES)

**1. Contraste modéré (pas trop élevé)**

```scss
/*
✅ CONTRASTE MODÉRÉ (optimal pour autisme)
  - Texte principal: 4.5:1 minimum, 10:1 MAXIMUM
  - Éviter le blanc pur sur noir pur (21:1 = trop agressif)
  - Préférer : gris foncé (#1f2937) sur fond teinté (#f9fafb) = ~8:1

❌ À ÉVITER
  - Blanc (#fff) sur noir (#000) = 21:1 (trop violent)
  - Couleurs très saturées en aplat
  - Contrastes extrêmes qui fatiguent
*/
```

**2. Cohérence des couleurs signifiantes**

```scss
/*
✅ UNE COULEUR = UNE SIGNIFICATION (toujours)
  - Violet = routine (TOUJOURS)
  - Vert = loisir (TOUJOURS)
  - Bleu = apprentissage (TOUJOURS)
  - Rose = soins personnels (TOUJOURS)
  - Orange = transition (TOUJOURS)

❌ INTERDIT
  - Utiliser le vert pour "loisir" puis "succès" ailleurs
  - Changer la signification des couleurs selon le contexte
  - Utilisation décorative des couleurs sémantiques
*/
```

**3. Ne JAMAIS utiliser la couleur seule**

```scss
/*
✅ TOUJOURS accompagner d'icônes/texte
  - Activité "routine" : violet + 🔄 + texte "Routine"
  - État "complété" : vert + ✓ + texte "Terminé"
  - État "en retard" : rose saumon + ⚠️ + texte "En retard"

❌ ÉVITER
  - "Vert = OK, rouge = erreur" sans indication visuelle/textuelle
  - Boutons colorés sans icône ni label
  - États uniquement indiqués par couleur
*/
```

**4. Test daltonisme obligatoire**

```scss
/*
✅ VÉRIFIER avec filtres daltoniens
  - Les 6 couleurs du planning doivent rester distinguables
  - Tester avec protanopie, deutéranopie, tritanopie
  - Outils : Chrome DevTools > Rendering > Emulate vision deficiencies

❌ Paires à problème pour daltoniens :
  - Vert (#6ee7b7) vs Jaune (#fbbf24) → OK si accompagnés d'icônes
  - Rose (#f9a8d4) vs Bleu (#5b8fd6) → OK
*/
```

### Outils de validation

**Manual check (obligatoire)** :

- https://webaim.org/resources/contrastchecker/
- Chrome DevTools > Lighthouse > Accessibility audit

**Filtres daltonisme (obligatoire)** :

- Chrome DevTools > Rendering > "Emulate vision deficiencies"
- Tester : Protanopia, Deuteranopia, Tritanopia, Achromatopsia

**Automatique (optionnel)** :

```bash
npm install -D pa11y-ci

# .pa11yci.json
{
  "defaults": {
    "standard": "WCAG2AA",
    "runners": ["axe"]
  },
  "urls": [
    "http://localhost:3000",
    "http://localhost:3000/planning"
  ]
}

# Run
npx pa11y-ci
```

### Checklist de validation

```
□ Contraste texte/fond : 4.5:1 min, 10:1 max
□ Pas de blanc pur sur noir pur (éviter 21:1)
□ Chaque couleur planning = une seule signification
□ Toutes les couleurs accompagnées d'icônes/texte
□ Test daltonisme effectué (4 types)
□ Validation manuelle WebAIM
□ Rapport pa11y généré (si installé)
□ Corrections appliquées si nécessaire
```

**Livrables** :

- Liste des paires couleur/fond vérifiées avec ratios
- Screenshots tests daltonisme (4 types)
- Corrections appliquées si contraste insuffisant ou ambiguïté
- Rapport pa11y (si utilisé)
- Documentation des significations couleurs (planning visuel)

---

## Étape 7 — Installer Stylelint (blocage automatique)

**Objectif** : Empêcher les régressions (ajout de nouveaux hex-codes).

**Actions** :

```bash
npm install -D stylelint stylelint-config-sass-guidelines
```

**Config `.stylelintrc.json`** :

```json
{
  "extends": "stylelint-config-sass-guidelines",
  "rules": {
    "color-no-hex": true,
    "declaration-property-value-disallowed-list": {
      "/^background/": ["/rgba?\\(/"],
      "/^color/": ["/rgba?\\(/"],
      "/^border/": ["/rgba?\\(/"]
    }
  },
  "ignoreFiles": ["node_modules/**", "src/styles.backup/**"]
}
```

**Test** :

```bash
npx stylelint "src/**/*.{css,scss}"
```

**Livrables** :

- Stylelint installé et configuré
- Aucun warning stylelint sur les fichiers migrés
- Script ajouté dans `package.json` :
  ```json
  "scripts": {
    "lint:styles": "stylelint 'src/**/*.{css,scss}'"
  }
  ```

---

## Étape 8 — Nettoyage final et documentation

**Actions** :

1. **Supprimer les DEPRECATED** : Une fois toutes les migrations terminées, supprimer les anciennes variables commentées `// DEPRECATED`

2. **Supprimer `_theme-vars.scss`** : Après validation, supprimer le fichier (demander confirmation)

3. **Supprimer le backup** : `rm -rf src/styles.backup` (après validation complète)

4. **Documenter dans `README.md` ou `CLAUDE.md`** :

   ````markdown
   ## 🎨 Système de couleurs

   ### Tokens disponibles

   - Surfaces : `--surface-bg`, `--surface-soft`, `--surface-elevated`, `--surface-border`
   - Textes : `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`
   - Actions : `--action-primary`, `--action-primary-hover`, `--action-secondary`, `--action-disabled`
   - États : `--status-success`, `--status-warning`, `--status-danger`
   - Focus : `--focus-ring`, `--link`, `--link-hover`

   ### Utilisation

   ```scss
   .my-component {
     background: var(--surface-bg);
     color: var(--text-primary);
     border: 1px solid var(--surface-border);
   }
   ```
   ````

   ### Dark mode

   Ajouter `data-theme="dark"` sur `<html>` ou `<body>`.
   Fallback automatique avec `prefers-color-scheme`.

   ### Règles
   - ❌ **INTERDIT** : hex-codes (#abc123), rgb/rgba hardcodés
   - ✅ **AUTORISÉ** : `var(--token)`, `color-mix()`
   - 🔒 **Stylelint bloque** les régressions automatiquement

   ```

   ```

**Livrables** :

- Fichiers obsolètes supprimés
- Documentation créée/mise à jour
- Commit final : `refactor(colors): complete color system migration`

---

# 🎯 CHECKLIST FINALE

```
□ Étape 0 : Backup + branche Git + config Next.js
□ Étape 1 : Audit avec colors-audit.txt + colors-frequency.txt
□ Étape 2 : _colors.scss créé avec structure complète
□ Étape 3 : _variables.scss nettoyé, couleurs migrées
□ Étape 4 : main.scss avec imports dans le bon ordre
□ Étape 5 : Refactor tous les composants (var() only)
□ Étape 6 : Validation WCAG AA effectuée
□ Étape 7 : Stylelint installé et configuré
□ Étape 8 : Nettoyage final + documentation
□ Test visuel complet (light + dark mode)
□ Build production validé
□ Merge dans main après validation
```

---

# ⚠️ RÈGLES DE COMMUNICATION

- **Demander confirmation avant de supprimer un fichier**
- **Montrer le diff des modifications importantes**
- **Signaler toute incohérence détectée dans les couleurs actuelles**
- **Proposer des corrections si contraste WCAG insuffisant**
- **Faire un commit après chaque composant migré**
- **Ne jamais casser le build**

---

# 📊 RÉSUMÉ DES TECHNOLOGIES UTILISÉES

| Technologie         | Usage                          | Support            |
| ------------------- | ------------------------------ | ------------------ |
| **CSS Variables**   | Tokens sémantiques             | ✅ Universel       |
| **color-mix()**     | Opacité, hover, darken         | ✅ Moderne (2023+) |
| **OKLCH**           | (Phase 2) Palette perceptuelle | ✅ Avec @supports  |
| **Relative colors** | Manipuler L/C/H                | ✅ Moderne (2024+) |
| **SCSS**            | Génération CSS vars            | ✅ Build-time      |
| **Stylelint**       | Bloquer régressions            | ✅ CI/Dev          |

---

# 🚀 PRÊT À EXÉCUTER

Ce plan est optimisé pour Claude Code CLI. Suis strictement les étapes dans l'ordre, et demande confirmation avant toute action destructive.

Bonne migration ! 🎨
