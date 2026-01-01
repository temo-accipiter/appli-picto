# Phase 6 : Migration vers Design System Harmonisé (Semantic Layer)

**Date de création** : 26 décembre 2025
**Status** : Infrastructure créée ✅ | Migration composants en cours 🔄
**Objectif** : Moderniser le design system avec palettes harmonisées, grille 4px stricte, et noms sémantiques

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Objectifs Phase 6](#objectifs-phase-6)
3. [Architecture "Double Stack"](#architecture-double-stack)
4. [Changements Visuels Attendus](#changements-visuels-attendus)
5. [Nouveaux Fichiers](#nouveaux-fichiers)
6. [Logique de Fallback](#logique-de-fallback)
7. [Migration Composants](#migration-composants)
8. [Plan de Déploiement](#plan-de-déploiement)
9. [Exemples Concrets](#exemples-concrets)
10. [FAQ & Troubleshooting](#faq--troubleshooting)

---

## Vue d'Ensemble

### 🎯 Pourquoi Phase 6 ?

**Phase 5 (Finalisée Déc 2024)** a créé un système tokens-first solide :

- ✅ 70 fichiers SCSS refactorisés
- ✅ Zéro valeur hardcodée
- ✅ Build stable, tests passés

**Phase 6 (Déc 2025)** modernise ce système avec :

- 🎨 **Redesign visuel maîtrisé** : Palettes Slate, radius adoucis TSA, grille 4px stricte
- 📝 **Noms sémantiques** : `touch-min`, `card-padding` au lieu de `'44'`, `'lg'`
- ♻️ **Migration progressive** : Ancien code fonctionne toujours (fallback legacy)

### ⚠️ Changement Visuel ACCEPTÉ

**IMPORTANT** : Contrairement aux phases précédentes, Phase 6 **modifie intentionnellement l'apparence visuelle**.

**Changements attendus :**

- Couleurs : Passage à palettes Slate (gris plus doux)
- Radius : 6px/12px/20px au lieu de 4px/8px/16px (plus doux, TSA-friendly)
- Spacing : Grille 4px stricte (suppression de 14px, 18px, 22px)
- Ombres : Subtiles (Slate alpha au lieu de noir alpha)

**Résultat global** : Interface **plus apaisante, respirable et moderne**.

---

## Objectifs Phase 6

### 🎯 Objectifs Principaux

1. **Harmonisation Visuelle**
   - Palettes cohérentes (Slate, Brand, Success, Warning, Error, Info)
   - Grille 4px stricte (pas de valeurs "bâtardes" comme 14px, 18px)
   - Radius adoucis pour UX TSA (6px/12px au lieu de 4px/8px)

2. **Organisation Sémantique**
   - Noms auto-documentés (`touch-min` > `'44'`)
   - Contexte métier clair (`card-padding` > `'lg'`)
   - Maintenance facilitée (changer 1 ligne = partout)

3. **Migration Sans Risque**
   - Ancien code fonctionne toujours (fallback legacy)
   - Build jamais cassé (coexistence nouveau/ancien)
   - Migration composant par composant (optionnelle)

### 📊 Métriques de Succès

| Métrique                 | Avant (Phase 5)         | Après (Phase 6)                    |
| ------------------------ | ----------------------- | ---------------------------------- |
| **Tokens spacing**       | 60+ valeurs fragmentées | ~30 valeurs grille 4px + semantics |
| **Tokens radius**        | 10 valeurs              | 7 valeurs harmonisées              |
| **Noms auto-documentés** | 20% (technical)         | 80% (semantic)                     |
| **Build time**           | 65s                     | 65s (identique)                    |
| **Visual regression**    | 0%                      | ~10-15% (intentionnel)             |

---

## Architecture "Double Stack"

### 🏗️ Structure Hiérarchique

```
┌─────────────────────────────────────────────────────────────┐
│  COMPOSANTS SCSS                                            │
│  └─> Utilisent spacing(), color(), radius(), size(), etc.  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  WRAPPERS INTELLIGENTS (_spacing.scss, _colors.scss, etc.) │
│  └─> Logique de fallback : Semantics → Primitives → Legacy │
└─────────────────────────────────────────────────────────────┘
                            ↓
         ┌────────────────────────────────────┐
         │  1. SEMANTICS (Phase 6 - Priorité)│
         │  └─> Noms métier                   │
         │      $spacing-semantic             │
         │      $color-semantic-*             │
         │      $size-semantic                │
         └────────────────────────────────────┘
                            ↓ (si absent)
         ┌────────────────────────────────────┐
         │  2. PRIMITIVES (Phase 6 - Valeurs) │
         │  └─> Grille 4px stricte            │
         │      $spacing-primitives           │
         │      $palettes-primitives (Slate)  │
         │      $radius-primitives (6/12/20px)│
         └────────────────────────────────────┘
                            ↓ (si absent)
         ┌────────────────────────────────────┐
         │  3. LEGACY (Phase 5 - Fallback)    │
         │  └─> Ancien système                │
         │      $spacing-tokens               │
         │      $role-color-tokens            │
         │      $radius-scale                 │
         └────────────────────────────────────┘
```

### 📁 Nouveaux Fichiers

**Phase 6 ajoute 2 fichiers à côté de l'existant :**

```
src/styles/abstracts/
├── _primitives.scss     # ⭐ NOUVEAU - Valeurs brutes harmonisées
├── _semantics.scss      # ⭐ NOUVEAU - Noms métier → primitives
├── _tokens.scss         # Legacy Phase 5 (fallback)
├── _spacing.scss        # Modifié (fallback intelligent)
├── _colors.scss         # Modifié (fallback intelligent)
├── _radius.scss         # Modifié (fallback intelligent)
├── _size.scss           # Modifié (fallback intelligent)
└── _index.scss          # Modifié (imports Phase 6)
```

**⚠️ IMPORTANT** : `_tokens.scss` n'est PAS supprimé, il sert de fallback legacy.

---

## Changements Visuels Attendus

### 🎨 Comparaison Avant/Après

#### **1. Couleurs (Palettes Slate)**

| Contexte            | Avant (Phase 5)         | Après (Phase 6)       | Effet                 |
| ------------------- | ----------------------- | --------------------- | --------------------- |
| **Text primaire**   | `#333333` (Gris neutre) | `#1e293b` (Slate 800) | Plus profond, moderne |
| **Text secondaire** | `#666666`               | `#475569` (Slate 600) | Légèrement plus foncé |
| **Backgrounds**     | `#f7f7f7`               | `#f8fafc` (Slate 50)  | Plus lumineux, aéré   |
| **Borders**         | `#e1e1e1`               | `#e2e8f0` (Slate 200) | Quasi identique       |

**Impact :** Textes légèrement plus contrastés, backgrounds plus lumineux.

---

#### **2. Border-Radius (Adoucis TSA)**

| Composant   | Avant        | Après        | Différence                  |
| ----------- | ------------ | ------------ | --------------------------- |
| **Boutons** | `8px` (md)   | `6px` (sm)   | ⚠️ Légèrement moins arrondi |
| **Cards**   | `16px` (lg)  | `12px` (md)  | ⚠️ Moins arrondi            |
| **Modals**  | `16px` (lg)  | `20px` (lg)  | ⚠️ Plus arrondi             |
| **Inputs**  | `8px` (md)   | `6px` (sm)   | ⚠️ Légèrement moins arrondi |
| **Badges**  | `50%` (full) | `50%` (full) | ✅ Identique                |

**Impact :** Apparence globalement **plus douce et TSA-friendly** (moins "technique").

---

#### **3. Spacing (Grille 4px Stricte)**

| Token Legacy    | Phase 5 | Phase 6                              | Migration               |
| --------------- | ------- | ------------------------------------ | ----------------------- |
| `spacing('14')` | 14px    | ❌ Supprimé → `spacing('16')` (16px) | Arrondi à la grille 4px |
| `spacing('18')` | 18px    | ❌ Supprimé → `spacing('20')` (20px) | Arrondi à la grille 4px |
| `spacing('22')` | 22px    | ❌ Supprimé → `spacing('24')` (24px) | Arrondi à la grille 4px |
| `spacing('md')` | 16px    | 16px                                 | ✅ Identique            |
| `spacing('lg')` | 24px    | 24px                                 | ✅ Identique            |

**Impact :** Valeurs "bâtardes" supprimées, espacement légèrement ajusté (+2px en moyenne).

---

#### **4. Ombres (Subtiles Slate)**

| Contexte         | Avant (Phase 5)               | Après (Phase 6)                  | Effet          |
| ---------------- | ----------------------------- | -------------------------------- | -------------- |
| **Card default** | `0 2px 6px rgba(0,0,0,0.15)`  | `0 2px 4px rgba(15,23,42,0.08)`  | ⚠️ Plus subtil |
| **Card hover**   | `0 8px 24px rgba(0,0,0,0.2)`  | `0 8px 16px rgba(15,23,42,0.12)` | ⚠️ Plus doux   |
| **Modal**        | `0 10px 40px rgba(0,0,0,0.3)` | `0 20px 40px rgba(15,23,42,0.2)` | ⚠️ Plus subtil |

**Impact :** Ombres **moins agressives**, utilisation de Slate (bleu-gris) au lieu de noir pur.

---

### 📸 Captures Attendues (Avant/Après)

**Cards `.stat-card` (ImageAnalytics) :**

- ✅ Padding augmenté : **16px → 24px** (plus aéré)
- ✅ Radius adouci : **8px → 12px** (moins "tech", plus doux)
- ✅ Ombre subtile : Slate alpha au lieu de noir alpha

**Boutons :**

- ✅ Radius légèrement réduit : **8px → 6px** (moins arrondi, plus moderne)
- ✅ Padding inchangé : 8px vertical, 24px horizontal

**Modals :**

- ✅ Radius augmenté : **16px → 20px** (plus doux, TSA-friendly)
- ✅ Padding inchangé : 32px
- ✅ Ombre plus subtile

---

## Nouveaux Fichiers

### 1️⃣ `_primitives.scss` (466 lignes)

**Rôle :** Définit les valeurs brutes harmonisées (palettes, grille 4px, radius).

#### **Contenu Principal**

```scss
// Palettes couleurs harmonisées
$palettes-primitives: (
  'neutral': (
    0: #ffffff,
    50: #f8fafc,
    // Slate 50
    100: #f1f5f9,
    // Slate 100
    200: #e2e8f0,
    // Borders
    300: #cbd5e1,
    400: #94a3b8,
    // Text tertiaire
    500: #64748b,
    // Text secondaire (FREE base)
    600: #475569,
    // Text primaire foncé
    700: #334155,
    800: #1e293b,
    // Text très fort
    900: #0f172a,
  ),
  'brand': (
    ...,
  ),
  // Bleu-violet Admin
  'success': (
      ...,
    ),
  // Vert émeraude
  'warning': (
      ...,
    ),
  // Orange
  'error': (
      ...,
    ),
  // Rouge adouci TSA
  'info': (
      ...,
    ), // Bleu ciel
);

// Grille 4px stricte
$spacing-primitives: (
  'xs': 0.25rem,
  // 4px
  'sm': 0.5rem,
  // 8px
  'md': 1rem,
  // 16px
  'lg': 1.5rem,
  // 24px
  'xl': 2rem,
  // 32px
  '2xl': 3rem,
  // 48px
  '3xl': 4rem,

  // 64px
  // Valeurs spécifiques grille 4px
  '4': 0.25rem,
  // 4px
  '6': 0.375rem,
  // 6px (NOUVEAU)
  '8': 0.5rem,
  // 8px
  '12': 0.75rem,
  // 12px
  '16': 1rem,
  // 16px
  '20': 1.25rem,
  // 20px
  '24': 1.5rem,
  // 24px
   // ... (suite grille 4px)
);

// Radius adoucis TSA
$radius-primitives: (
  'xs': 0.25rem,
  // 4px
  'sm': 0.375rem,
  // 6px (TSA-friendly, avant: 4px)
  'md': 0.75rem,
  // 12px (TSA-friendly, avant: 8px)
  'lg': 1.25rem,
  // 20px (avant: 16px)
  'xl': 1.5rem,
  // 24px
  'full': 50%, // Circle/Pill
);
```

#### **Fonction d'Accès**

```scss
@function palette($palette, $shade) {
  // Récupère couleur depuis $palettes-primitives
  // Exemple: palette('neutral', 500) → #64748b
}
```

---

### 2️⃣ `_semantics.scss` (434 lignes)

**Rôle :** Mappe les primitives vers noms métier auto-documentés.

#### **Contenu Principal**

```scss
// Couleurs texte sémantiques
$color-semantic-text: (
  'primary': palette('neutral', 800),
  // #1e293b
  'secondary': palette('neutral', 600),
  // #475569
  'tertiary': palette('neutral', 400),
  // #94a3b8
  'invert': palette('neutral', 0),
  // #ffffff
  'muted': palette('neutral', 500),
  // #64748b
  'dark': palette('neutral', 900), // #0f172a
);

// Couleurs surfaces sémantiques
$color-semantic-surface: (
  'page': palette('neutral', 50),
  // #f8fafc
  'bg': palette('neutral', 0),
  // #ffffff
  'card': palette('neutral', 0),
  // #ffffff
  'border': palette('neutral', 200),
  // #e2e8f0
  'hover': palette('neutral', 50), // #f8fafc
);

// Spacing sémantiques (contextes métier)
$spacing-semantic: (
  'touch-min': spacing-primitive('44'),
  // 44px WCAG AA
  'touch-preferred': spacing-primitive('56'),
  // 56px TSA
  'page-padding': spacing-primitive('xl'),
  // 32px
  'section-gap': spacing-primitive('2xl'),
  // 48px
  'grid-gap': spacing-primitive('md'),
  // 16px
  'card-padding': spacing-primitive('lg'),
  // 24px
  'card-gap': spacing-primitive('md'),
  // 16px
  'button-padding-x': spacing-primitive('lg'),
  // 24px
  'button-padding-y': spacing-primitive('sm'),
  // 8px
  'text-gap-tight': spacing-primitive('xs'),
  // 4px
  'text-gap-normal': spacing-primitive('sm'),
  // 8px
  'heading-gap': spacing-primitive('lg'), // 24px
);

// Size sémantiques
$size-semantic: (
  'touch-min': size-primitive('touch-min'),
  // 44px
  'button-height': size-primitive('button-height'),
  // 44px
  'input-height': size-primitive('input-height'),
  // 44px
  'card-min-height': size-primitive('card-min-height'),
  // 140px
  'modal-width-md': size-primitive('modal-width-md'),
  // 540px
  'sidebar-width': size-primitive('sidebar-width'), // 280px
);

// Radius sémantiques
$radius-semantic: (
  'small': radius-primitive('sm'),
  // 6px
  'medium': radius-primitive('md'),
  // 12px
  'large': radius-primitive('lg'),
  // 20px
  'card': radius-primitive('md'),
  // 12px
  'button': radius-primitive('sm'),
  // 6px
  'input': radius-primitive('sm'),
  // 6px
  'modal': radius-primitive('lg'),
  // 20px
  'badge': radius-primitive('full'), // 50%
);
```

#### **Fonctions d'Accès**

```scss
@function semantic-spacing($key) // Spacing sémantique
  @function semantic-size($key) // Size sémantique
  @function semantic-radius($key) // Radius sémantique
  @function semantic-text($key) // Couleur texte sémantique
  @function semantic-surface($key) // Couleur surface sémantique
  @function semantic-feedback($key) // Couleur feedback (success, error, etc.)
  @function semantic-role($key); // Couleur rôle (admin, abonné, etc.)
```

---

## Logique de Fallback

### 🔄 Comment ça Fonctionne ?

Les **wrappers** (`_spacing.scss`, `_colors.scss`, etc.) implémentent une logique de fallback :

```scss
// Dans _spacing.scss
@function spacing($key) {
  // 1. Chercher dans Semantics (Phase 6 - priorité)
  @if map.has-key(sem.$spacing-semantic, $key) {
    @return map.get(sem.$spacing-semantic, $key);
  }

  // 2. Fallback : Primitives (Phase 6 - grille 4px)
  @else if map.has-key(prim.$spacing-primitives, $key) {
    @return map.get(prim.$spacing-primitives, $key);
  }

  // 3. Fallback : Legacy (Phase 5 - ancien système)
  @else if map.has-key($spacing-tokens, $key) {
    @return map.get($spacing-tokens, $key);
  }

  // 4. Erreur si introuvable partout
  @else {
    @error "Spacing '#{$key}' not found";
  }
}
```

### 📊 Exemples de Résolution

| Appel                     | Résolution    | Valeur Retournée | Source                  |
| ------------------------- | ------------- | ---------------- | ----------------------- |
| `spacing('card-padding')` | Semantics ✅  | `24px`           | Phase 6 Semantics       |
| `spacing('md')`           | Primitives ✅ | `16px`           | Phase 6 Primitives      |
| `spacing('14')`           | Legacy ✅     | `14px`           | Phase 5 Legacy (toléré) |
| `spacing('25')`           | Legacy ✅     | `25px`           | Phase 5 Legacy (toléré) |
| `spacing('xyz')`          | ❌ Erreur     | N/A              | Introuvable partout     |

**Résultat :** Composants NON migrés fonctionnent toujours, composants migrés utilisent nouveau design.

---

## Migration Composants

### 🎯 Stratégie de Migration

**Migration composant par composant (OPTIONNELLE)** :

1. Identifier composant pilote (simple, représentatif)
2. Remplacer tokens techniques par tokens sémantiques
3. Tester visuellement dans navigateur
4. Valider changements ou ajuster
5. Commit + continuer avec composant suivant

### 📝 Composant Pilote : `ImageAnalytics.scss`

**Pourquoi ce composant ?**

- ✅ Relativement simple (110 lignes)
- ✅ Déjà conforme tokens-first (Phase 5)
- ✅ Utilise spacing, radius, shadows → Parfait pour tester Phase 6
- ✅ Composant admin (moins critique UX utilisateur final)

#### **Changements Ligne par Ligne**

```scss
// AVANT (Phase 5 Legacy)
.image-analytics {
  padding: spacing('xl'); // 32px
  max-width: size('container-lg'); // 1024px

  &__title {
    margin-bottom: spacing('24'); // 24px
    font-size: font-size('2xl'); // 24px
  }

  &__error {
    padding: spacing('md'); // 16px
    border-radius: radius('md'); // 8px
  }

  &__grid {
    gap: spacing('md'); // 16px
  }
}

.stat-card {
  padding: spacing('lg'); // 24px
  border-radius: radius('md'); // 8px
  box-shadow: shadow('elevation-sm'); // Noir alpha 0.15
}
```

```scss
// APRÈS (Phase 6 Semantics)
.image-analytics {
  padding: spacing('page-padding'); // 32px (identique)
  max-width: size('container-lg'); // 1024px (identique)

  &__title {
    margin-bottom: spacing('heading-gap'); // 24px (identique)
    font-size: font-size('2xl'); // 24px (identique)
  }

  &__error {
    padding: spacing('card-padding'); // ⚠️ 24px (avant: 16px, +8px)
    border-radius: radius('medium'); // ⚠️ 12px (avant: 8px, +4px)
  }

  &__grid {
    gap: spacing('grid-gap'); // 16px (identique)
  }
}

.stat-card {
  padding: spacing('card-padding'); // ⚠️ 24px (avant: 24px, identique)
  border-radius: radius('card'); // ⚠️ 12px (avant: 8px, +4px)
  box-shadow: shadow('card'); // ⚠️ Slate alpha 0.08 (plus subtil)
}
```

#### **Impact Visuel Attendu**

| Élément                   | Changement                 | Effet                           |
| ------------------------- | -------------------------- | ------------------------------- |
| `.image-analytics__error` | Padding +8px, Radius +4px  | Plus aéré, coins plus doux      |
| `.stat-card`              | Radius +4px, Ombre subtile | Moins "tech", plus TSA-friendly |
| Autres                    | Identique                  | Aucun changement                |

**Résultat Global** : Interface **légèrement plus respirable et apaisante**.

---

### 🔄 Ordre de Migration Recommandé

**Phase 6.1 : Composants Simples (5-10 fichiers)**

1. `ImageAnalytics.scss` ← Pilote
2. `StatsCard.scss`
3. `EmptyState.scss`
4. `ErrorBoundary.scss`
5. `Loading.scss`

**Phase 6.2 : Composants Moyens (15-20 fichiers)**

- Cards (TaskCard, RewardCard, etc.)
- Buttons (Button, IconButton, etc.)
- Forms (Input, Select, Checkbox, etc.)

**Phase 6.3 : Composants Complexes (20+ fichiers)**

- Layout (Navbar, Footer, Sidebar)
- Pages (Login, Signup, Edition, Profil)
- Admin (Permissions, Logs, Metrics)

**Timeline Estimée** : 2-3 semaines (migration progressive, 3-5 composants/jour)

---

## Plan de Déploiement

### 📅 Timeline Globale

```
Semaine 1 (Déc 2025)
├─ Jour 1-2 : Infrastructure Phase 6 ✅ FAIT
│  ├─ Audit tokens
│  ├─ Création _primitives.scss
│  ├─ Création _semantics.scss
│  ├─ Mise à jour wrappers
│  └─ Validation build
│
├─ Jour 3-4 : Migration Pilote
│  ├─ ImageAnalytics.scss
│  ├─ Validation visuelle
│  └─ Ajustements si nécessaire
│
└─ Jour 5 : Documentation + PR
   ├─ Guide migration
   ├─ Exemples
   └─ PR Review

Semaine 2-3
├─ Migration progressive composants simples/moyens
├─ Tests visuels continus
└─ Ajustements design si besoin

Semaine 4+
├─ Migration composants complexes
├─ Tests E2E complets
└─ Release Phase 6 complète
```

### 🚀 Étapes de Déploiement

#### **Étape 1 : Infrastructure (✅ FAIT)**

- ✅ Audit tokens existants
- ✅ Création `_primitives.scss`
- ✅ Création `_semantics.scss`
- ✅ Mise à jour `_spacing.scss` avec fallback
- ✅ Build validé (65s)

#### **Étape 2 : Migration Pilote (EN COURS)**

- 🔄 Migrer `ImageAnalytics.scss`
- 🔄 Tester visuellement dans navigateur
- 🔄 Ajuster si nécessaire
- 🔄 Commit + PR

#### **Étape 3 : Migration Progressive**

- ⏳ Migrer composants par ordre (simples → complexes)
- ⏳ Tests visuels continus
- ⏳ Ajustements design au fil de l'eau

#### **Étape 4 : Cleanup & Release**

- ⏳ Documentation complète
- ⏳ Tests E2E complets
- ⏳ Release Phase 6 complète

---

## Exemples Concrets

### 🎨 Exemple 1 : Migration Card Simple

```scss
// ❌ AVANT (Phase 5 Legacy - technique)
.card {
  padding: spacing('lg'); // 24px
  margin-bottom: spacing('xl'); // 32px
  border-radius: radius('lg'); // 16px
  box-shadow: shadow('elevation-sm'); // Noir alpha 0.15
  background: surface('surface'); // #f7f7f7
  color: text('default'); // #333333
}
```

```scss
// ✅ APRÈS (Phase 6 Semantics - métier)
.card {
  padding: spacing('card-padding'); // 24px (identique)
  margin-bottom: spacing('section-gap'); // ⚠️ 48px (avant: 32px, +16px)
  border-radius: radius('card'); // ⚠️ 12px (avant: 16px, -4px)
  box-shadow: shadow('card'); // ⚠️ Slate alpha 0.08 (plus subtil)
  background: semantic-surface('card'); // #ffffff (avant: #f7f7f7, plus clair)
  color: semantic-text('primary'); // #1e293b (avant: #333333, plus foncé)
}
```

**Impact Visuel :**

- ✅ Padding identique
- ⚠️ Margin augmenté : +16px (plus aéré)
- ⚠️ Radius réduit : -4px (moins arrondi)
- ⚠️ Ombre plus subtile (Slate au lieu de noir)
- ⚠️ Background plus clair (#ffffff > #f7f7f7)
- ⚠️ Texte légèrement plus foncé (#1e293b > #333333)

---

### 🎨 Exemple 2 : Migration Button

```scss
// ❌ AVANT (Phase 5 Legacy)
.button {
  padding: spacing('sm') spacing('lg'); // 8px 24px
  min-height: spacing('44'); // 44px WCAG AA
  border-radius: radius('md'); // 8px
  font-size: font-size('base'); // 16px
  background: color('base'); // #0077c2
  color: text('invert'); // #ffffff
}
```

```scss
// ✅ APRÈS (Phase 6 Semantics)
.button {
  padding: spacing('button-padding-y') spacing('button-padding-x'); // 8px 24px (identique)
  min-height: spacing('touch-min'); // 44px (identique)
  border-radius: radius('button'); // ⚠️ 6px (avant: 8px, -2px)
  font-size: font-size('base'); // 16px (identique)
  background: semantic-brand(
    'primary'
  ); // ⚠️ #667eea (avant: #0077c2, couleur différente)
  color: semantic-text('invert'); // #ffffff (identique)
}
```

**Impact Visuel :**

- ✅ Padding identique
- ✅ Touch target identique
- ⚠️ Radius légèrement réduit : -2px (moins arrondi, plus moderne)
- ⚠️ **Couleur brand changée** : Bleu-violet (#667eea) au lieu de bleu (#0077c2)

---

### 🎨 Exemple 3 : Migration Modal

```scss
// ❌ AVANT (Phase 5 Legacy)
.modal {
  width: 90vw;
  max-width: size('modal-width'); // 540px
  padding: spacing('modal-padding'); // 32px
  border-radius: radius('modal'); // 16px
  box-shadow: shadow('elevation-2xl'); // Noir alpha 0.3
  background: surface('bg'); // #ffffff
}
```

```scss
// ✅ APRÈS (Phase 6 Semantics)
.modal {
  width: 90vw;
  max-width: semantic-size('modal-width-md'); // 540px (identique)
  padding: spacing('modal-padding'); // 32px (identique)
  border-radius: radius('modal'); // ⚠️ 20px (avant: 16px, +4px)
  box-shadow: shadow('modal'); // ⚠️ Slate alpha 0.2 (plus subtil)
  background: semantic-surface('bg'); // #ffffff (identique)
}
```

**Impact Visuel :**

- ✅ Width, padding identiques
- ⚠️ Radius augmenté : +4px (plus doux, TSA-friendly)
- ⚠️ Ombre plus subtile (Slate au lieu de noir)

---

## FAQ & Troubleshooting

### ❓ Questions Fréquentes

#### **Q1 : Est-ce que l'ancien code va casser ?**

**R :** Non. Grâce au fallback intelligent, tous les composants NON migrés continuent de fonctionner exactement comme avant.

```scss
// Ancien code (Phase 5) - Fonctionne toujours
padding: spacing('14'); // ✅ Fallback sur legacy → 14px

// Nouveau code (Phase 6) - Nouveau design
padding: spacing('card-padding'); // ✅ Semantics → 24px
```

---

#### **Q2 : Dois-je migrer tous les composants d'un coup ?**

**R :** Non. La migration est **progressive et optionnelle**. Vous pouvez :

- Migrer composant par composant
- Laisser certains composants en legacy
- Tester visuellement avant de valider

**Recommandé :** Migrer par zones fonctionnelles (Admin → Pages → Layout).

---

#### **Q3 : Que se passe-t-il si je mélange ancien et nouveau dans le même fichier ?**

**R :** C'est **parfaitement autorisé** grâce au fallback.

```scss
.component {
  // Mix ancien/nouveau - AUTORISÉ
  padding: spacing('card-padding'); // Nouveau (24px)
  margin: spacing('14'); // Legacy (14px) - Fonctionne
  border-radius: radius('medium'); // Nouveau (12px)
}
```

**Cependant**, pour la cohérence, il est **recommandé** de migrer un fichier entièrement.

---

#### **Q4 : Les changements visuels sont-ils réversibles ?**

**R :** Oui, facilement.

**Option 1 : Rollback composant** (supprimer tokens sémantiques)

```scss
// Rollback : Remettre ancien code
padding: spacing('lg'); // Au lieu de spacing('card-padding')
```

**Option 2 : Rollback complet Phase 6** (supprimer imports)

```scss
// Dans _index.scss, commenter :
// @forward './primitives';
// @forward './semantics';
```

**Option 3 : Ajuster valeurs primitives**

```scss
// Si 12px radius trop doux, ajuster dans _primitives.scss
'md':0.5rem,; // 8px au lieu de 12px
```

---

#### **Q5 : Comment savoir quels tokens sémantiques utiliser ?**

**R :** Consulter `_semantics.scss` ou utiliser noms auto-documentés.

**Exemples de noms clairs :**

- `spacing('touch-min')` → Touch target minimum (44px)
- `spacing('card-padding')` → Padding standard cards (24px)
- `spacing('heading-gap')` → Gap sous headings (24px)
- `radius('card')` → Radius cards (12px)
- `semantic-surface('page')` → Background page (#f8fafc)

**Règle :** Si le nom décrit **l'usage** (contexte métier), c'est bon.

---

### 🐛 Troubleshooting

#### **Problème 1 : Build cassé après ajout imports**

**Symptôme :**

```
Error: Can't find module '_primitives'
```

**Solution :**
Vérifier que `_primitives.scss` et `_semantics.scss` existent dans `src/styles/abstracts/`.

```bash
ls src/styles/abstracts/_primitives.scss
ls src/styles/abstracts/_semantics.scss
```

---

#### **Problème 2 : Token sémantique introuvable**

**Symptôme :**

```
Error: Semantic spacing 'xyz' not found
```

**Solution :**

- Vérifier nom token dans `_semantics.scss`
- Utiliser fallback legacy si token n'existe pas encore
- Ajouter nouveau token sémantique si besoin

---

#### **Problème 3 : Visual regression inattendu**

**Symptôme :**
Composant visuellement très différent après migration.

**Solution :**

1. Comparer valeurs avant/après :

   ```scss
   // Avant
   padding: spacing('lg'); // 24px

   // Après
   padding: spacing('card-padding'); // 24px (vérifier)
   ```

2. Si valeur différente, ajuster semantic token :

   ```scss
   // Dans _semantics.scss
   'card-padding':spacing-primitive('lg'),; // Forcer 24px si besoin
   ```

3. Si besoin, utiliser legacy temporairement :
   ```scss
   padding: spacing('lg'); // Garder legacy si nécessaire
   ```

---

## 📚 Ressources & Références

### Documentation Interne

- **`refactor-philosophy.md`** - Philosophie design system
- **`refactor-contract.md`** - Contrat refactoring phases 1-5
- **`scss-architecture.md`** - Architecture technique complète
- **`phase-6-migration-guide.md`** - Ce document

### Fichiers Sources Phase 6

- **`src/styles/abstracts/_primitives.scss`** - Primitives harmonisées
- **`src/styles/abstracts/_semantics.scss`** - Semantics métier
- **`src/styles/abstracts/_spacing.scss`** - Wrapper spacing avec fallback
- **`src/styles/abstracts/_index.scss`** - Imports Phase 6

### Best Practices Externes (2024-2025)

1. **Material Design 3** - Semantic Tokens System
   https://m3.material.io/foundations/design-tokens/overview

2. **Backbase Design System** - Migration in Code
   https://designsystem.backbase.com/latest/design-tokens/migration-in-code/

3. **Design Tokens as Infrastructure** (Murphy Trueman, Oct 2025)
   https://blog.murphytrueman.com/p/your-tokens-have-become-infrastructure

4. **Automate Design Token Migrations with Codemods** (Feb 2025)
   https://medium.com/@stevedodierlazaro/automate-design-token-migrations-with-codemods-a21cf8bbd53b

---

## ✅ Checklist Validation Phase 6

### Infrastructure (✅ FAIT)

- [x] Audit tokens existants réalisé
- [x] `_primitives.scss` créé (palettes Slate, grille 4px, radius 6/12/20px)
- [x] `_semantics.scss` créé (noms métier → primitives)
- [x] `_spacing.scss` mis à jour (fallback semantics → primitives → legacy)
- [x] Imports ajoutés dans `_index.scss`
- [x] Build validé (compilation réussie 65s)

### Migration Pilote (🔄 EN COURS)

- [ ] `ImageAnalytics.scss` migré vers tokens sémantiques
- [ ] Tests visuels navigateur (localhost:3000)
- [ ] Validation changements design (radius, padding, ombres)
- [ ] Ajustements si nécessaire
- [ ] Commit + PR migration pilote

### Migration Progressive (⏳ À VENIR)

- [ ] Migrer 5 composants simples (StatsCard, EmptyState, etc.)
- [ ] Migrer 15 composants moyens (Cards, Buttons, Forms)
- [ ] Migrer 20+ composants complexes (Layout, Pages, Admin)
- [ ] Tests E2E complets
- [ ] Validation accessibilité WCAG 2.2 AA
- [ ] Documentation finale

### Release Phase 6 (⏳ À VENIR)

- [ ] Tous composants migrés (ou migration optionnelle documentée)
- [ ] Tests E2E passés
- [ ] Visual regression acceptée (~10-15%)
- [ ] Documentation à jour
- [ ] PR Review + Merge
- [ ] Tag release `v2.0-phase-6`

---

## 🚀 Prochaines Étapes Immédiates

1. **Migrer composant pilote `ImageAnalytics.scss`**
   - Remplacer tokens techniques par tokens sémantiques
   - Tester visuellement dans navigateur
   - Valider changements design

2. **Créer exemples visuels Avant/Après**
   - Screenshots comparatifs
   - Documenter changements observés

3. **Ajuster valeurs si nécessaire**
   - Si design trop différent, ajuster primitives
   - Si besoin, créer nouveaux tokens sémantiques

4. **Commit + PR**
   - Documenter changements
   - Demander review équipe

---

**Dernière mise à jour** : 26 décembre 2025
**Version** : 1.0 (Phase 6 Infrastructure + Plan Migration)
**Auteur** : Équipe Appli-Picto

**Changelog :**

- v1.0 (26 déc 2025) : Création document complet Phase 6
- Infrastructure créée (\_primitives.scss, \_semantics.scss)
- Wrappers intelligents avec fallback
- Build validé (65s)
- Prêt pour migration composant pilote
