# 🧠 Design System SCSS — Philosophie & Règles

**Projet** : Appli-Picto
**Contexte** : Application mobile-first pour enfants TSA (autisme)
**Type de migration** : Isométrique (aucun changement visuel)

---

## 🎯 Objectif Général

Nous utilisons un **design system SCSS strict, token-driven**, conçu pour :

- Une **application mobile-first** optimisée
- Un public **enfants TSA (autisme)** → visuel apaisant, cohérence forte, prévisibilité
- Une **maintenabilité long terme** sans dérive de styles
- Empêcher toute duplication ou valeurs hardcodées
- Permettre une évolution maîtrisée sans casser les composants

Ce système est volontairement **contraignant** pour garantir la cohérence.

---

## 🔑 Principe Fondamental — Sources de Vérité

### Hiérarchie Absolue

```text
tokens.scss        → Valeurs UI autoritatives (SOURCE DE VÉRITÉ)
a11y-tokens.scss   → Contraintes WCAG/TSA (RÈGLES NORMATIVES)
wrappers/          → Enforcement + validation
composants/        → Consommation uniquement
```

### 1️⃣ `tokens.scss` — SOURCE DE VÉRITÉ ABSOLUE (UI)

`tokens.scss` est **l'unique endroit** où sont définies :

- Les **valeurs visuelles autoritatives**
- Les **maps canoniques**
- Les **noms fonctionnels stables**
- Les **décisions UX/UI finales**

**Contenu :**

- `$spacing-tokens` — Échelle d'espacements
- `$font-size-tokens` — Tailles de police
- `$role-color-tokens` — Couleurs par rôle utilisateur
- `$semantic-tokens` — Couleurs sémantiques (success, error, warning, info)
- `$blue-palette`, `$gray-palette`, etc. — Palettes complètes
- `$radius-scale` — Border-radius
- `$elevation-shadows`, `$badge-shadows` — Ombres
- `$border-width-tokens` — Épaisseurs de bordures
- `$timing-scale`, `$easing-scale` — Animations
- `$breakpoint-tokens` — Breakpoints responsive
- `$z-index-tokens` — Stacking order

➡️ **Aucune valeur visuelle canonique ne doit être définie ailleurs.**

---

### 2️⃣ `a11y-tokens.scss` — SOURCE DE VÉRITÉ NORMATIVE (ACCESSIBILITÉ)

`a11y-tokens.scss` est **complémentaire**, jamais concurrent de `tokens.scss`.

**Il contient UNIQUEMENT :**

- Des **seuils** (contraste minimum, tailles minimales)
- Des **contraintes** (durées maximales, offsets)
- Des **règles WCAG 2.2 AA / TSA**
- Des valeurs normatives (non visuelles)

**Exemple :**

```scss
$a11y-tokens: (
  'contrast-min': 4.5,
  // WCAG AA texte
  'contrast-enhanced': 7,
  // WCAG AAA texte
  'min-touch-target': 44px,
  // WCAG AA
  'preferred-touch-target': 56px,
  // TSA préféré
  'focus-ring-width': 2px,
  'focus-ring-offset': 2px,
  'reduced-motion-duration': 0.01ms, // prefers-reduced-motion
);
```

🚫 **Il ne contient AUCUN choix visuel** (couleur, spacing UI, radius).

**Bonne pratique :**

- `tokens.scss` → **déclare** les valeurs
- `a11y-tokens.scss` → **contraint** les valeurs
- Les wrappers → **appliquent et valident**

---

### 3️⃣ Wrappers (abstracts/\*) — ENFORCEMENT

Les wrappers sont des **couches de validation** :

- Ne créent aucune valeur
- Ne décident rien
- Lisent les tokens canoniques
- Exposent des fonctions publiques sûres
- Valident les clés
- Bloquent les usages illégaux via `@error`

**Exemples de wrappers :**

- `_colors.scss` → `color()`, `surface()`, `text()`, `semantic()`
- `_spacing.scss` → `spacing()`
- `_typography.scss` → `font-size()`, `font-weight()`, `line-height()`
- `_motion.scss` → `timing()`, `easing()`, `@include safe-transition()`
- `_radius.scss` → `radius()`
- `_shadows.scss` → `shadow()`
- `_borders.scss` → `border-width()`
- `_breakpoints.scss` → `@include respond-to()`

---

### 4️⃣ Composants — CONSOMMATION UNIQUEMENT

Les composants :

- N'importent JAMAIS directement `colors.scss`, `spacing.scss`, etc.
- Utilisent UNIQUEMENT `@use '@styles/abstracts' as *;`
- Appellent UNIQUEMENT les fonctions publiques
- Ne connaissent JAMAIS les valeurs réelles

**Schéma mental :**

```scss
// ❌ INTERDIT
.button {
  background: #4a90e2;
  padding: 12px 24px;
  border-radius: 8px;
}

// ✅ CORRECT
.button {
  background: color('base');
  padding: spacing('sm') spacing('lg');
  border-radius: radius('md');
}
```

---

## 🚨 RÈGLES ABSOLUES (NON NÉGOCIABLES)

### ❌ Interdictions Strictes dans les Composants

#### 1. Valeurs Hardcodées

- Aucune unité : `px`, `rem`, `em`, `%`, `vh`, `vw`
- Aucune couleur : `#fff`, `#000`, `rgb()`, `hsl()`, `rgba()`
- Aucune durée : `0.3s`, `300ms`

#### 2. Accès Direct

- Aucun `var(--*)` (CSS variables)
- Aucun accès aux maps : `map.get($spacing-tokens, 'md')`
- Aucun accès aux tokens : `$color-primary`

#### 3. Logique de Couleur

- Aucun `color.adjust()`, `color.change()`
- Aucun `lighten()`, `darken()`, `saturate()`
- Aucun `color.scale()`, `color.mix()`

#### 4. Logique de Thème

- Aucun `@media (prefers-color-scheme)`
- Aucun override dark/light local
- Aucune logique conditionnelle de thème

#### 5. Calculs Visuels

- Aucun calcul Sass sur des valeurs visuelles : `$size * 2`
- Aucune création de valeur dérivée locale

#### 6. Imports

- Aucun import relatif : `@use '../../styles/abstracts'`
- Aucun import direct de wrappers : `@use '@styles/abstracts/colors'`

---

### ✅ Autorisations Exclusives

#### Import Unique

```scss
@use '@styles/abstracts' as *;
```

#### Fonctions Wrappers Uniquement

**Couleurs :**

```scss
color($key, $type: 'primary')        // Couleurs principales
surface($type)                       // Surfaces (bg, border, hover)
text($type: 'default')               // Texte (default, invert, muted)
semantic($name, $variant: 'base')    // Success, warning, error, info
role-color($role, $variant: 'base')  // Admin, abonné, free, visitor
blue($shade), red($shade), etc.      // Palettes 50-900
tsa-pastel($key)                     // Couleurs TSA apaisantes
shadow($key)                         // Couleurs d'ombres
brand($key)                          // Couleurs marques (Stripe, etc.)
```

**Espacement (respiration uniquement) :**

```scss
spacing($key)  // Utilisable UNIQUEMENT pour :
               // - margin, padding
               // - gap, row-gap, column-gap
               // - inset, scroll-margin
               // ❌ INTERDIT pour : width, height, min-height, border-width
```

**Typographie :**

```scss
font-size($key)       // xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl
font-weight($key)     // light, normal, medium, semibold, bold, black
line-height($key)     // tight, normal, base, relaxed, loose
typography-token($key) // Tokens combinés (h1, h2, body, etc.)
```

**Motion & Transitions :**

```scss
timing($key)           // xs, sm, base, lg, xl, 2xl
easing($key)           // linear, smooth, ease-in, ease-out, etc.
motion-token($key)     // Tokens combinés
@include safe-transition($property, $duration, $easing)
@include safe-animation($name, $duration, $timing)
```

**Autres :**

```scss
radius($key)           // xs, sm, md, lg, xl, 2xl, full
shadow($key)           // Ombres (sm, md, lg, etc.)
border-width($key)     // Épaisseurs bordures
z-index($key)          // Stacking order
opacity($key)          // Valeurs alpha
```

**Responsive (mobile-first) :**

```scss
@include respond-to($breakpoint); // sm, md, lg, xl, xxl
                                  // Génère @media (min-width: ...)
```

**Accessibilité :**

```scss
@include focus-ring($color, $width, $offset) @include
  touch-target($size: 'preferred') // 'min' (44px) ou 'preferred' (56px)
  @include non-invasive-focus($color) @include visually-hidden;
```

---

## 📐 RÈGLES SPÉCIFIQUES PAR DOMAINE

### 🎨 Couleurs

#### ✅ Autorisé

```scss
.button {
  background: color('base'); // Couleur principale
  color: text('invert'); // Texte inversé (blanc)
  border: 1px solid surface('border'); // Bordure surface
}

.admin-badge {
  background: role-color('admin', 'base'); // Couleur rôle admin
  box-shadow: 0 3px 10px #{role-color('admin', 'gradient-end')};
}

.success-message {
  background: semantic('success', 'bg'); // Fond success
  color: semantic('success', 'dark'); // Texte success foncé
  border: 1px solid semantic('success', 'border');
}
```

#### ❌ Interdit

```scss
.button {
  background: #4a90e2; // ❌ Hardcoded
  color: var(--foreground); // ❌ Accès direct CSS var
  background: color.adjust($primary, $lightness: -10%); // ❌ Manipulation
}
```

**Règle clé :**

> Les composants **ne connaissent jamais les couleurs réelles**.
> Ils manipulent uniquement des rôles sémantiques.

---

### 📏 Spacing — Respiration Uniquement

`spacing()` est **réservé exclusivement** à la respiration visuelle.

#### ✅ Autorisé pour :

- `margin`, `margin-top`, `margin-inline`, etc.
- `padding`, `padding-block`, etc.
- `gap`, `row-gap`, `column-gap`
- `inset`, `scroll-margin`, `scroll-padding`

```scss
.card {
  padding: spacing('lg'); // ✅ OK
  margin-bottom: spacing('xl'); // ✅ OK
  gap: spacing('md'); // ✅ OK
}
```

#### ❌ Interdit pour :

- `width`, `height`
- `min-width`, `max-width`, `min-height`, `max-height`
- `border-width` (utiliser `border-width()`)
- `top`, `left`, `right`, `bottom` (positionnement)

```scss
.card {
  min-height: spacing('200'); // ❌ INTERDIT - Utiliser size()
  border: spacing('1') solid; // ❌ INTERDIT - Utiliser border-width()
  width: spacing('300'); // ❌ INTERDIT - Utiliser size()
}
```

**Pourquoi ?**

- `spacing()` gère uniquement la **respiration** (espace entre éléments)
- Les dimensions structurelles utilisent `size()` (dédié aux largeurs/hauteurs)
- Évite le couplage dangereux (padding global ≠ largeur modale)

---

### 📐 Size — Dimensions Structurelles

`size()` est **dédié aux dimensions** (width, height, min/max).

#### ✅ Autorisé pour :

- `width`, `height`
- `min-width`, `max-width`, `min-height`, `max-height`
- Dimensions de composants (modal, sidebar, touch targets)

```scss
.button {
  min-height: size('touch-target-min'); // ✅ 44px WCAG AA
  min-width: size('touch-target-min');
}

.modal {
  width: 90vw;
  max-width: size('modal-width'); // ✅ 540px
  padding: spacing('lg'); // ✅ Respiration séparée
}

.sidebar {
  width: size('sidebar-width'); // ✅ 280px
  padding: spacing('md'); // ✅ Respiration séparée
}
```

#### ❌ Interdit pour :

- `margin`, `padding` (utiliser `spacing()`)
- `gap` (utiliser `spacing()`)

**Pourquoi deux fonctions séparées ?**

- **Responsabilités différentes** : Respiration ≠ Dimension
- **Noms sémantiques** : `size('touch-target-min')` > `spacing('44')`
- **Évolutivité** : Facile de changer tailles sans affecter espacements
- **Export facile** : JSON pour mobile native ou Storybook

**Migration Phase 5 → Phase 6 :**

- Phase 5 : Tolérance temporaire de `spacing()` pour dimensions legacy
- Phase 6 : Migration complète vers `size()` avec tokens sémantiques

---

### ✍️ Typographie

#### ✅ Autorisé

```scss
.title {
  font-size: font-size('2xl'); // 1.5rem (24px)
  font-weight: font-weight('bold'); // 700
  line-height: line-height('tight'); // 1.2
  font-family: $lexend-font-stack; // TSA-friendly
}

.body-text {
  font-size: font-size('base'); // 1rem (16px)
  font-weight: font-weight('normal'); // 400
  line-height: line-height('base'); // 1.5
}
```

#### ❌ Interdit

```scss
.title {
  font-size: 24px; // ❌ Hardcoded
  font-size: 1.5rem; // ❌ Hardcoded
  font-size: 0.875rem; // ❌ Hardcoded
}
```

---

### 🎬 Motion & Transitions

#### ✅ Autorisé

```scss
.button {
  @include safe-transition(background color, timing('sm'), easing('smooth'));
  // Respecte automatiquement prefers-reduced-motion
}

.modal {
  animation: fadeIn timing('base') easing('ease-out'); // 0.3s max
}

.card {
  transition: transform timing('fast') easing('standard');
}
```

#### ❌ Interdit

```scss
.button {
  transition: all 0.15s ease; // ❌ Hardcoded
  animation: spin 1s linear; // ❌ Trop rapide, hardcoded
}

.card {
  transition: all 0.5s; // ❌ Trop lent pour TSA
}
```

**Règles TSA :**

- Durée maximale : **0.3s** (timing('base'))
- Animations douces uniquement (ease, ease-out)
- Toujours respecter `prefers-reduced-motion`

---

### 📐 Dimensions Structurelles

Pour les tailles qui ne sont PAS de la respiration (width, height, etc.) :

#### ✅ Utiliser des tokens dédiés

```scss
.button {
  min-height: spacing('44'); // Touch target WCAG AA
  // (Toléré temporairement car legacy)
}

.modal {
  width: 90vw; // ✅ OK (unité relative)
  max-width: 540px; // ⚠️ Toléré si legacy
}
```

**Note :** Idéalement, créer des tokens sémantiques :

```scss
$size-tokens: (
  'touch-target-min': 44px,
  'touch-target-preferred': 56px,
  'modal-width': 540px,
  'sidebar-width': 280px,
);
```

---

### 📱 Mobile-First (NON NÉGOCIABLE)

Le mobile est **la base**, le desktop est une **amélioration progressive**.

#### ✅ Autorisé (min-width uniquement)

```scss
.component {
  // Mobile par défaut (320px-575px)
  font-size: font-size('sm');
  padding: spacing('sm');

  // Tablette+ (768px+)
  @include respond-to(md) {
    font-size: font-size('base');
    padding: spacing('lg');
  }

  // Desktop+ (1024px+)
  @include respond-to(lg) {
    font-size: font-size('lg');
    padding: spacing('xl');
  }
}
```

#### ❌ Interdit (max-width)

```scss
.component {
  font-size: font-size('lg');

  @media (max-width: 767px) {
    // ❌ INTERDIT
    font-size: font-size('sm');
  }
}
```

**Pourquoi mobile-first ?**

- Charge CSS minimale sur mobile (performance)
- Progressive enhancement (amélioration naturelle)
- Évite les overrides inutiles

---

### 🌓 Thèmes & Dark Mode

#### ❌ Interdit dans les Composants

```scss
.button {
  @media (prefers-color-scheme: dark) {
    // ❌ INTERDIT
    background: #333;
  }
}

.card {
  [data-theme='dark'] & {
    // ❌ INTERDIT
    background: #1a1a1a;
  }
}
```

#### ✅ Autorisé (Thèmes Centralisés)

Les thèmes sont gérés dans `themes/light.scss` et `themes/dark.scss` :

```scss
// themes/light.scss
:root {
  --color-primary: #{color('base')};
  --color-bg: #{surface('bg')};
  --color-text: #{text('default')};
}

// themes/dark.scss
[data-theme='dark'] {
  --color-bg: #{slate(900)};
  --color-text: #{slate(100)};
}
```

**Composants consomment uniquement via wrappers :**

```scss
.button {
  background: color('base'); // ✅ OK
  // La couleur s'adapte automatiquement au thème
}
```

---

## 🧩 BEM & Structure

### BEM-lite Recommandé

- **Bloc** : `.quota-management`
- **Élément** : `.quota-management__item`
- **Modificateur** : `.quota-management--loading`

### ✅ Bonnes Pratiques

```scss
.card {
  background: surface('surface');

  &__header {
    padding: spacing('md');
    border-bottom: 1px solid surface('border');
  }

  &__title {
    font-size: font-size('lg');
    font-weight: font-weight('semibold');
  }

  &--featured {
    border: 2px solid color('base');
  }
}
```

### ❌ Anti-patterns

```scss
// ❌ BEM sur-verbeux
.card__header__title__icon {
}

// ❌ Sélecteurs fragiles (dépendance DOM)
.card > div > h2 {
}

// ❌ Nesting excessif (> 3 niveaux)
.card {
  .header {
    .title {
      .icon {
        .svg {
        } // ❌ Trop profond
      }
    }
  }
}
```

**Règles :**

- Profondeur maximale : **3 niveaux**
- Noms fonctionnels, pas décoratifs
- Pas de cascade implicite au DOM

---

## 🌳 Nesting SCSS

### Profondeur Maximale : 3 Niveaux

#### ✅ Acceptable

```scss
.card {
  // Niveau 1
  padding: spacing('md');

  &__header {
    // Niveau 2
    border-bottom: 1px solid surface('border');

    &--highlighted {
      // Niveau 3
      background: semantic('info', 'bg');
    }
  }
}
```

#### ❌ Trop Profond

```scss
.card {
  .content {
    .section {
      .item {
        // ❌ Niveau 4+
        .link {
          // ❌ Niveau 5
          color: color('base');
        }
      }
    }
  }
}
```

**Solution :** Aplatir avec BEM

```scss
.card__item-link {
  // ✅ OK
  color: color('base');
}
```

---

## 🎨 Contexte TSA — Enfants Autistes

Le design doit être **apaisant, cohérent, prévisible**.

### Principes UX Fondamentaux

#### 1. Animations Douces

- **Durée maximale** : 0.3s (timing('base'))
- **Easing** : ease, ease-out (jamais linear sauf spinners)
- **Pas de mouvements brusques** : Pas de shake, bounce agressif
- **Respecter prefers-reduced-motion** : Obligatoire

```scss
.button {
  @include safe-transition(transform, timing('sm'), easing('smooth'));
  // 0.2s ease automatiquement
}
```

#### 2. Pas de Surcharge Visuelle

- **Interface épurée** : Minimalisme, focus clair
- **Pas de clignotements** : Aucun élément > 3 Hz (risque épilepsie)
- **Contraste élevé** : WCAG 2.2 AA minimum (4.5:1 texte, 3:1 UI)

#### 3. Prévisibilité

- **Actions cohérentes** : Même interaction = même résultat
- **Feedback immédiat** : Toujours visible pour les actions
- **Navigation claire** : Breadcrumbs visibles, pas de dead-ends

#### 4. Couleurs Pastel Apaisantes

- **Palette douce** : Bleus/verts pastel, pas de rouge vif
- **Contrastes WCAG** : Minimum 4.5:1 pour texte
- **Gradients doux** : Pas de transitions brusques

```scss
.card {
  background: tsa-pastel('bg-soft'); // Fond apaisant
  border: 1px solid tsa-pastel('blue-light'); // Bordure douce
}
```

#### 5. Accessibilité Stricte (WCAG 2.2 AA)

**Contraste :**

- Texte : Minimum 4.5:1
- UI composants : Minimum 3:1

**Focus visible :**

```scss
.button {
  @include focus-ring; // Outline 2px visible
}
```

**Touch targets :**

```scss
.button {
  @include touch-target('min'); // 44×44px WCAG AA
}

.card-draggable {
  @include touch-target('preferred'); // 56×56px TSA préféré
}
```

**Navigation clavier :**

- Tab order logique
- Pas de trappes clavier
- Skip links pour navigation rapide

**ARIA :**

- Labels corrects
- Roles sémantiques
- States dynamiques

---

## ⚠️ RÈGLE DE NON-CRÉATIVITÉ (CRITIQUE)

Ce projet est une **migration isométrique**, pas une refonte.

### ❌ Interdictions Absolues

- **Ne pas améliorer le design** : Même si ça semble mieux
- **Ne pas corriger des incohérences visuelles** : Même si c'est tentant
- **Ne pas ajuster des espacements** : Même pour "harmoniser"
- **Ne pas modifier des contrastes** : Sauf non-conformité WCAG critique

### ✅ Objectif Unique

**Remplacer les valeurs hardcodées par des tokens, sans changer le rendu.**

**Exemple :**

```scss
// Avant (hardcoded)
.button {
  padding: 12px 24px; // 12px = ?, 24px = ?
}

// Après (tokens)
.button {
  padding: spacing('sm') spacing('lg'); // 0.5rem 1.5rem (12px 24px)
}
```

**Même si** `spacing('md')` (16px) semble plus cohérent, on utilise `spacing('sm')` (12px) car c'est la valeur actuelle.

### Exception : Corrections de Conformité

**Autorisé uniquement si :**

- Non-conformité WCAG bloquante (contraste < 4.5:1)
- Bug visuel critique (texte illisible)
- Touch target < 44px (WCAG AA)

**Dans ces cas :**

1. Documenter la correction
2. Expliquer pourquoi (WCAG, TSA)
3. Valider avec le product owner

---

## 🚨 MIGRATION TEMPORAIRE — Règles Legacy

### ✅ Toléré Temporairement (si déjà existant)

#### Clés numériques spacing

```scss
padding: spacing('48'); // 3rem (48px)
min-height: spacing('44'); // 2.75rem (44px) - touch target
```

**Raison :** Valeurs legacy existantes, migration progressive.

**Plan :** Remplacer par tokens sémantiques ultérieurement :

```scss
min-height: spacing('touch-target-min'); // Objectif futur
```

#### Mapping direct vers tokens existants

Si une valeur hardcodée correspond exactement à un token, mapper directement :

```scss
// Avant
padding: 16px;

// Après
padding: spacing('md'); // 1rem = 16px
```

---

### ❌ Interdit Même en Migration

#### Création de nouvelles valeurs non tokenisées

```scss
// ❌ INTERDIT
$custom-spacing: 13px; // Non tokenisé
padding: $custom-spacing;
```

#### Ajout de nouvelles couleurs hors tokens

```scss
// ❌ INTERDIT
$new-blue: #1e88e5; // Non tokenisé
background: $new-blue;
```

#### Introduction de nouveaux hardcodes

```scss
// ❌ INTERDIT (même temporairement)
margin-top: 15px; // Nouveau hardcode
border-radius: 6px; // Nouveau hardcode
```

**Règle :** Si un token n'existe pas, **signaler** et demander sa création, ne pas inventer.

---

## 🛠️ Qualité Attendue — Audit & Refactor

Lors de toute analyse ou modification, il faut :

1. **Vérifier la structure** du fichier SCSS
2. **Améliorer l'organisation** si nécessaire (BEM, nesting)
3. **Supprimer duplications** et incohérences
4. **Aligner** avec les conventions existantes
5. **Refuser** toute solution "rapide mais sale"

### Checklist Qualité

- [ ] Structure BEM claire (≤ 3 niveaux)
- [ ] Aucune duplication de styles
- [ ] Noms de classes fonctionnels, pas décoratifs
- [ ] Commentaires pour logique non évidente
- [ ] Ordre logique des propriétés (layout → visual → interaction)

---

## 🏁 Règle Finale (ABSOLUE)

> **Si une valeur n'est pas accessible via une fonction publique du design system, elle ne doit pas être utilisée.**

**Corollaire :**

- Les composants ne connaissent jamais les valeurs réelles
- Les composants ne décident jamais des valeurs
- Les composants consomment uniquement l'API du design system

---

## 📚 Imports — Stratégie Officielle

### 🧩 Dans les Composants

**Import unique autorisé :**

```scss
@use '@styles/abstracts' as *;
```

**Ce point d'entrée :**

- Centralise tous les wrappers
- Garantit la cohérence
- Permet d'évoluer l'architecture sans casser les composants

**Interdit :**

```scss
@use '@styles/abstracts/colors' as *; // ❌ INTERDIT
@use '@styles/abstracts/spacing' as *; // ❌ INTERDIT
@use '../../styles/abstracts' as *; // ❌ Import relatif
```

---

### 🧠 Dans main.scss (seul point runtime)

`main.scss` est l'**unique endroit** où le CSS global est matérialisé.

**Ordre d'import strict :**

```scss
// 1) VENDORS (normalize, immuable)
@use '@styles/vendors/normalize' as *;

// 2) ABSTRACTS - OUTILS SCSS (safe to forward, pas de CSS généré)
@use '@styles/abstracts' as *;

// 3) ABSTRACTS - SYSTÈMES RUNTIME (génèrent CSS vars, UNE FOIS SEULEMENT)
@use '@styles/abstracts/colors' as *;
@use '@styles/abstracts/typography' as *;
@use '@styles/abstracts/spacing' as *;
@use '@styles/abstracts/motion' as *;
@use '@styles/abstracts/radius' as *;
@use '@styles/abstracts/shadows' as *;
@use '@styles/abstracts/forms' as *;

// 4) BASE (styles globaux DOM)
@use '@styles/base' as *;

// 5) THEMES (overrides runtime, après base)
@use '@styles/themes/light' as *;
@use '@styles/themes/dark' as *;
```

**Aucun autre fichier ne doit produire de CSS global.**

---

## 📋 Résumé des Principes

| Principe          | Description                                    |
| ----------------- | ---------------------------------------------- |
| **Token-first**   | TOUJOURS utiliser les tokens, JAMAIS hardcoder |
| **Mobile-first**  | Base = mobile, desktop = amélioration          |
| **TSA-friendly**  | Apaisant, prévisible, animations douces ≤ 0.3s |
| **WCAG 2.2 AA**   | Contrastes, focus, touch targets respectés     |
| **BEM propre**    | Max 3 niveaux, noms fonctionnels               |
| **Isométrie**     | Aucun changement visuel (sauf WCAG critique)   |
| **Import unique** | `@use '@styles/abstracts' as *;`               |
| **Wrappers only** | Fonctions publiques uniquement                 |

---

---

## 🗺️ Roadmap Phase 6 : Migration Tokens Sémantiques

### Actuellement (Phase 5 - Isométrique)

Nous **tolérons temporairement** des clés numériques pour compatibilité legacy :

```scss
// Toléré Phase 5 (migration isométrique)
.button {
  min-height: spacing('44'); // ⚠️ Legacy (sera déprécié Phase 6)
  padding: spacing('sm');
}

.modal {
  width: 90vw;
  max-width: spacing('540'); // ⚠️ Legacy (sera déprécié Phase 6)
}
```

**Pourquoi cette tolérance ?**

- Phase 5 = migration isométrique (remplacer hardcodes, pas redesign)
- Objectif : conformité tokens SANS changement visuel
- Phase 6 = redesign complet (modifier valeurs ET noms)

---

### Phase 6 (Redesign Complet)

Remplacer par **tokens sémantiques** :

```scss
// ✅ Phase 6 (tokens sémantiques + nouvelles valeurs)
.button {
  min-height: size('touch-target-preferred'); // ✅ 56px TSA (au lieu de 44px)
  padding: spacing('sm');
}

.modal {
  width: 90vw;
  max-width: size('modal-width-md'); // ✅ Explicite
}
```

---

### Avantages Phase 6

- ✅ **Noms explicites** : `size('touch-target-min')` > `spacing('44')`
- ✅ **Auto-documenté** : Le nom explique l'usage
- ✅ **Séparation claire** : `spacing()` = respiration, `size()` = dimensions
- ✅ **Maintenance** : Plus facile à comprendre et modifier
- ✅ **Évolutivité** : Export JSON facile pour mobile native / Storybook

---

### Migration Phase 5 → Phase 6

**Plan** :

1. **Phase 5** : Remplacer hardcodes par tokens (même si clés numériques legacy)
2. **Phase 6** : Remplacer clés numériques par tokens sémantiques
3. **Phase 6** : Modifier valeurs selon nouveau design

**Exemple complet** :

```scss
// Avant Phase 5 (hardcodé)
.button {
  min-height: 44px;
  background: #667eea;
  padding: 12px 24px;
}

// Phase 5 (tokens, valeurs identiques)
.button {
  min-height: spacing('44'); // ⚠️ Toléré temporairement
  background: color('base');
  padding: spacing('sm') spacing('lg');
}

// Phase 6 (tokens sémantiques + nouvelles valeurs)
.button {
  min-height: size('touch-target-preferred'); // ✅ 56px TSA (plus confortable)
  background: color('base'); // Nouvelle nuance violette
  padding: spacing('md') spacing('xl'); // Augmenté pour TSA
}
```

---

### Tokens Legacy à Migrer Phase 6

**Dans `$spacing-tokens` (à déplacer vers `$size-tokens`)** :

- `'44'` → `size('touch-target-min')`
- `'48'` → `size('touch-target-optimal')`
- `'56'` → `size('touch-target-preferred')`
- `'200'` → `size('card-min-height')`
- `'300'` → `size('modal-width-sm')`
- `'540'` → `size('modal-width-md')`
- `'280'` → `size('sidebar-width')`

**Bénéfice** : Code auto-documenté, maintenance simplifiée, évite débats futurs.

---

**Dernière mise à jour** : 18 décembre 2025
**Version** : 2.1 (ajout size() + roadmap Phase 6)
