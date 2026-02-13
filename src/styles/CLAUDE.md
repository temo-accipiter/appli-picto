# CLAUDE.md - Design System SCSS Tokens-First

Guide design system tokens-first pour **Appli-Picto** - Application Next.js 16 pour enfants autistes et professionnels TSA.

## 🎯 Vue d'Ensemble

**Phase 6 finalisée (Déc 2024)** : Migration complète vers système tokens centralisés.

**70 fichiers SCSS refactorisés** :

- ✅ **ZÉRO valeur hardcodée** dans composants
- ✅ **18 fichiers abstracts** (tokens, functions, mixins)
- ✅ **563 lignes mixins** accessibilité et patterns
- ✅ **Build validé** : Compilation 95s, 242 tests passés

**Principe fondamental** : JAMAIS de valeurs hardcodées (`px`, `#hex`, `rgb()`), TOUJOURS via fonctions tokens.

---

## 🚨 RÈGLE ABSOLUE

**CRITIQUE** : ❌ **JAMAIS** de valeurs hardcodées en SCSS

```scss
// ❌ INTERDIT - Valeurs hardcodées
.card {
  margin: 16px; // Hardcode spacing
  padding: 12px 20px; // Hardcode spacing
  background: #ffb3ba; // Hardcode couleur
  border-radius: 8px; // Hardcode radius
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); // Hardcode shadow
  font-size: 14px; // Hardcode typographie
  transition: all 0.3s ease; // OK timing mais 'all' déconseillé
}

// ✅ CORRECT - Tokens uniquement
.card {
  margin: spacing('4'); // 16px via token
  padding: spacing('3') spacing('5'); // 12px 20px via tokens
  background: color('primary'); // Couleur primaire token
  border-radius: radius('md'); // Radius moyen token
  box-shadow: shadow('md'); // Shadow moyen token
  font-size: font-size('sm'); // Taille petite token
  @include safe-transition(transform box-shadow); // Transition sécurisée
}
```

**Pourquoi CRITIQUE** :

- ✅ **Cohérence** : Design system harmonisé (pas de valeurs arbitraires)
- ✅ **Maintenance** : Changer token = update global (pas 70 fichiers)
- ✅ **Accessibilité** : Tokens pré-validés WCAG 2.2 AA
- ✅ **Thème dark** : Tokens CSS variables (switch automatique)
- ✅ **Scalabilité** : Ajouter valeur = 1 seul endroit (\_tokens.scss)

---

## 📦 Architecture Tokens (Phase 6 Hybrid)

### Hiérarchie Tokens

```
_tokens.scss         → Source de vérité UNIQUE (canonical)
    ↓
_semantics.scss      → Noms métier (Phase 6)
    ↓
_primitives.scss     → Valeurs brutes grille 4px (Phase 6)
    ↓
_colors.scss         → Fonctions accès couleurs (wrapper)
_spacing.scss        → Fonctions accès spacing (wrapper)
_typography.scss     → Fonctions accès typo (wrapper)
_radius.scss         → Fonctions accès radius (wrapper)
_shadows.scss        → Fonctions accès shadows (wrapper)
_motion.scss         → Fonctions accès animations (wrapper)
_size.scss           → Fonctions accès tailles (wrapper)
    ↓
_mixins.scss         → Mixins réutilisables
    ↓
Composants .scss     → Utilisent fonctions/mixins
```

### Fichiers Abstracts Disponibles

**Localisation** : `src/styles/abstracts/`

```
abstracts/
├── _index.scss            # Import tous abstracts (point entrée)
├── _tokens.scss           # 🔥 SOURCE VÉRITÉ (canonical tokens)
├── _semantics.scss        # Phase 6 - Noms métier
├── _primitives.scss       # Phase 6 - Valeurs brutes
├── _colors.scss           # Wrapper accès couleurs
├── _spacing.scss          # Wrapper accès spacing
├── _size.scss             # Wrapper accès tailles
├── _typography.scss       # Wrapper accès typographie
├── _radius.scss           # Wrapper accès border-radius
├── _shadows.scss          # Wrapper accès box-shadow
├── _motion.scss           # Wrapper accès animations
├── _borders.scss          # Fonctions border-width
├── _breakpoints.scss      # Media queries responsive
├── _container-queries.scss
├── _forms.scss            # Styles formulaires
├── _functions.scss        # Fonctions helpers (rem, etc.)
├── _mixins.scss           # 🔥 Mixins accessibilité + patterns
└── _a11y-tokens.scss      # Tokens accessibilité TSA
```

---

## 🎨 Couleurs (color, surface, text, semantic)

### Fonctions Disponibles

#### **color()** - Couleurs Principales

**Usage** :

```scss
.element {
  background: color('primary'); // Rose primaire #FFB3BA
  color: color('primary', 'dark'); // Rose foncé
  border-color: color('secondary'); // Couleur secondaire
}
```

**Tokens disponibles** :

- `color('primary')` - Rose principal (#FFB3BA)
- `color('primary', 'light')` - Rose clair
- `color('primary', 'dark')` - Rose foncé
- `color('secondary')` - Bleu secondaire
- `color('accent')` - Couleur accent

---

#### **text()** - Couleurs Texte (Phase 6)

**Usage** :

```scss
.title {
  color: text('primary'); // Texte principal (contraste 7:1)
}

.subtitle {
  color: text('secondary'); // Texte secondaire (contraste 4.5:1)
}

.muted {
  color: text('muted'); // Texte atténué
}
```

**Tokens disponibles** :

- `text('primary')` - Texte principal (#1f2937, contraste WCAG AAA)
- `text('secondary')` - Texte secondaire (#6b7280, contraste AA)
- `text('muted')` - Texte atténué (#9ca3af)
- `text('disabled')` - Texte désactivé
- `text('inverse')` - Texte sur fond foncé (blanc)

**Règles Accessibilité** :

- ✅ **Contraste minimum 4.5:1** (WCAG 2.2 AA)
- ✅ `text('primary')` : Contraste 7:1 (AAA)
- ✅ Tous tokens pré-validés WebAIM Contrast Checker

---

#### **surface()** - Couleurs Surfaces/Fonds (Phase 6)

**Usage** :

```scss
.card {
  background: surface('card'); // Fond carte (#ffffff)
  border-color: surface('border'); // Bordure (#e5e7eb)
}

.page {
  background: surface('body'); // Fond page (#fafafa)
}
```

**Tokens disponibles** :

- `surface('body')` - Fond page (#fafafa)
- `surface('card')` - Fond carte (#ffffff)
- `surface('elevated')` - Surface surélevée
- `surface('border')` - Couleur bordures (#e5e7eb)
- `surface('divider')` - Séparateurs
- `surface('overlay')` - Overlay modales (rgba)

---

#### **semantic()** - Couleurs Feedback (Phase 6)

**Usage** :

```scss
.success-message {
  color: semantic('success'); // Vert #10b981
  background: semantic('success', 'light'); // Vert clair #d1fae5
}

.error-message {
  color: semantic('error'); // Rouge #ef4444
  background: semantic('error', 'light'); // Rouge clair #fee2e2
}
```

**Tokens disponibles** :

- `semantic('success')` - Vert succès (#10b981)
- `semantic('success', 'light')` - Fond succès clair
- `semantic('success', 'dark')` - Succès foncé
- `semantic('warning')` - Orange avertissement (#f59e0b)
- `semantic('warning', 'light')` - Fond warning clair
- `semantic('error')` - Rouge erreur (#ef4444)
- `semantic('error', 'light')` - Fond erreur clair
- `semantic('info')` - Bleu information (#3b82f6)
- `semantic('info', 'light')` - Fond info clair

**Usage TSA-friendly** :

```scss
// ✅ CORRECT - Feedback visuel clair enfants autistes
.toast--success {
  background: semantic('success', 'light'); // Fond vert pastel
  color: semantic('success', 'dark'); // Texte vert foncé (contraste)
  border-left: border-width('thick') solid semantic('success');
}
```

---

#### **role-color()** - Couleurs Rôles Utilisateurs

**Usage** :

```scss
.badge--admin {
  background: role-color('admin'); // Violet admin #667eea
  color: role-color('admin', 'light'); // Violet clair
}

.badge--abonne {
  background: role-color('abonne'); // Vert abonné #22c55e
}
```

**Tokens disponibles** :

- `role-color('admin')` - Violet admin (#667eea)
- `role-color('admin', 'gradient-start')` - Début gradient
- `role-color('admin', 'gradient-end')` - Fin gradient
- `role-color('abonne')` - Vert abonné (#22c55e)
- `role-color('free')` - Gris Free (#64748b)
- `role-color('visitor')` - Orange visiteur (#ea580c)
- `role-color('staff')` - Violet staff (#8b5cf6)

---

#### Palettes Couleurs (Legacy)

**Usage** :

```scss
.element {
  color: gray(500); // Gris moyen #6b7280
  background: blue(50); // Bleu très clair #eff6ff
  border-color: red(600); // Rouge moyen #dc2626
}
```

**Palettes disponibles** :

- `gray(50..900)` - Échelle gris (50=clair, 900=foncé)
- `blue(50..900)` - Échelle bleu
- `red(50..900)` - Échelle rouge
- `green(50..900)` - Échelle vert
- `yellow(50..900)` - Échelle jaune
- `purple(50..900)` - Échelle violet
- `pink(50..900)` - Échelle rose

**Note** : Préférer `text()`, `surface()`, `semantic()` quand possible (Phase 6)

---

## 📏 Spacing (margin, padding, gap)

### Fonction spacing()

**CRITIQUE** : `spacing()` est UNIQUEMENT pour `margin`, `padding`, `gap`
Pour `width`, `height`, `min-height`, utiliser `size()` (voir section Tailles)

**Usage** :

```scss
.card {
  margin: spacing('4'); // 16px
  padding: spacing('6'); // 24px
  gap: spacing('2'); // 8px

  // Spacing différents
  padding: spacing('3') spacing('5'); // 12px 20px (vertical horizontal)
  margin-bottom: spacing('8'); // 32px
}
```

**Grille 4px (Phase 6)** :

```scss
// ✅ CORRECT - Grille 4px stricte
spacing('1')   // 4px   (0.25rem)
spacing('2')   // 8px   (0.5rem)
spacing('3')   // 12px  (0.75rem)
spacing('4')   // 16px  (1rem)
spacing('5')   // 20px  (1.25rem)
spacing('6')   // 24px  (1.5rem)
spacing('8')   // 32px  (2rem)
spacing('10')  // 40px  (2.5rem)
spacing('12')  // 48px  (3rem)
spacing('16')  // 64px  (4rem)
spacing('20')  // 80px  (5rem)
spacing('24')  // 96px  (6rem)
```

**Tokens sémantiques (Phase 6)** :

```scss
spacing('card-padding')    // 24px (padding cartes standard)
spacing('section-gap')     // 32px (gap entre sections)
spacing('touch-min')       // 44px (cible tactile minimum TSA)
spacing('button-padding-y') // 12px (padding vertical boutons)
spacing('button-padding-x') // 20px (padding horizontal boutons)
```

**Règles** :

- ✅ **TOUJOURS** grille 4px (pas de 13px, 17px arbitraires)
- ❌ **JAMAIS** `spacing()` pour `width`/`height` (utiliser `size()`)
- ✅ Noms sémantiques pour patterns récurrents (card-padding, etc.)

---

## 📐 Tailles (width, height, min-height)

### Fonction size()

**Usage** :

```scss
.button {
  width: size('44'); // 44px (cible tactile min)
  height: size('44'); // 44px
  min-width: size('120'); // 120px
}

.modal {
  max-width: size('modal-width-md'); // 600px
  min-height: size('400'); // 400px
}

.icon {
  width: size('24'); // 24px (icône standard)
  height: size('24');
}
```

**Tokens disponibles** :

```scss
// Tailles fixes
size('24')   // 24px (icône small)
size('32')   // 32px (icône medium)
size('44')   // 44px (cible tactile min TSA)
size('64')   // 64px (avatar)
size('80')   // 80px
size('120')  // 120px (bouton min-width)
size('200')  // 200px
size('400')  // 400px
size('600')  // 600px

// Tailles sémantiques
size('modal-width-sm')   // 400px
size('modal-width-md')   // 600px
size('modal-width-lg')   // 800px
size('container-max')    // 1280px
size('sidebar-width')    // 280px
```

**Différence spacing() vs size()** :

```scss
// ✅ CORRECT
.card {
  padding: spacing('4'); // Espacement interne → spacing()
  width: size('400'); // Dimension → size()
  gap: spacing('2'); // Espacement éléments → spacing()
  min-height: size('200'); // Dimension → size()
}

// ❌ INTERDIT - Confusion spacing/size
.card {
  padding: size('4'); // FAUX (size pour dimensions)
  width: spacing('400'); // FAUX (spacing pour espacement)
}
```

---

## 🔤 Typographie (font-size, font-weight, line-height)

### Fonctions Typography

**Usage** :

```scss
.title {
  font-size: font-size('2xl'); // 24px (1.5rem)
  font-weight: font-weight('bold'); // 700
  line-height: line-height('tight'); // 1.25
}

.body-text {
  font-size: font-size('base'); // 16px (1rem)
  font-weight: font-weight('normal'); // 400
  line-height: line-height('relaxed'); // 1.625
}
```

### Tokens font-size()

**Échelle typographique** :

```scss
font-size('xs')    // 12px (0.75rem)  - Très petit texte
font-size('sm')    // 14px (0.875rem) - Petit texte
font-size('base')  // 16px (1rem)     - Texte corps (défaut)
font-size('lg')    // 18px (1.125rem) - Grand texte
font-size('xl')    // 20px (1.25rem)  - Très grand
font-size('2xl')   // 24px (1.5rem)   - Titre H3
font-size('3xl')   // 30px (1.875rem) - Titre H2
font-size('4xl')   // 36px (2.25rem)  - Titre H1
font-size('5xl')   // 48px (3rem)     - Hero title
```

**Règles TSA-friendly** :

- ✅ **Minimum 14px** pour texte corps (lisibilité enfants)
- ✅ Échelle harmonieuse (ratio 1.125 - Major Second)
- ✅ Pas de tailles < 12px (accessibilité)

---

### Tokens font-weight()

```scss
font-weight('thin')       // 100
font-weight('extralight') // 200
font-weight('light')      // 300
font-weight('normal')     // 400 (défaut texte corps)
font-weight('medium')     // 500
font-weight('semibold')   // 600
font-weight('bold')       // 700 (titres)
font-weight('extrabold')  // 800
font-weight('black')      // 900
```

**Usage courant** :

```scss
.title {
  font-weight: font-weight('bold'); // 700 - Titres
}

.body {
  font-weight: font-weight('normal'); // 400 - Corps texte
}

.emphasis {
  font-weight: font-weight('semibold'); // 600 - Emphase légère
}
```

---

### Tokens line-height()

```scss
line-height('none')     // 1      - Titres compacts
line-height('tight')    // 1.25   - Titres
line-height('snug')     // 1.375  - Sous-titres
line-height('normal')   // 1.5    - Texte standard
line-height('relaxed')  // 1.625  - Texte confortable (TSA)
line-height('loose')    // 2      - Texte très aéré
```

**Règles TSA-friendly** :

- ✅ **Minimum 1.5** pour texte corps (lisibilité enfants)
- ✅ Préférer `relaxed` (1.625) pour longs paragraphes
- ✅ `tight` uniquement pour titres courts

**Usage** :

```scss
h1 {
  font-size: font-size('4xl');
  line-height: line-height('tight'); // 1.25 - Titres compacts
}

p {
  font-size: font-size('base');
  line-height: line-height('relaxed'); // 1.625 - Confortable
}
```

---

## ⭕ Border Radius (border-radius)

### Fonction radius()

**Usage** :

```scss
.card {
  border-radius: radius('md'); // 8px (radius standard)
}

.button {
  border-radius: radius('lg'); // 12px (boutons arrondis)
}

.avatar {
  border-radius: radius('full'); // 9999px (cercle parfait)
}
```

**Tokens disponibles** :

```scss
radius('none')   // 0     - Aucun arrondi
radius('sm')     // 4px   - Léger arrondi
radius('md')     // 8px   - Arrondi standard cartes
radius('lg')     // 12px  - Arrondi boutons
radius('xl')     // 16px  - Très arrondi
radius('2xl')    // 24px  - Extra arrondi
radius('full')   // 9999px - Cercle/pilule parfait
```

**Règles TSA-friendly** :

- ✅ Préférer `md` (8px) pour cartes (doux, pas agressif)
- ✅ Éviter `none` (coins pointus peuvent sembler agressifs)
- ✅ `full` pour avatars circulaires

---

## 🌑 Shadows (box-shadow)

### Fonction shadow()

**Usage** :

```scss
.card {
  box-shadow: shadow('md'); // Ombre moyenne
}

.modal {
  box-shadow: shadow('xl'); // Ombre forte (élévation)
}

.button:hover {
  box-shadow: shadow('lg'); // Ombre hover
}
```

**Tokens disponibles** :

```scss
shadow('sm')   // 0 1px 2px rgba(0,0,0,0.05)  - Légère
shadow('md')   // 0 4px 6px rgba(0,0,0,0.07)  - Moyenne (cartes)
shadow('lg')   // 0 10px 15px rgba(0,0,0,0.1) - Forte
shadow('xl')   // 0 20px 25px rgba(0,0,0,0.15) - Très forte (modales)
shadow('2xl')  // 0 25px 50px rgba(0,0,0,0.25) - Extra forte
shadow('none') // none - Aucune ombre
```

**Règles TSA-friendly** :

- ✅ Ombres **douces** (opacity faible 0.05-0.15)
- ✅ Éviter ombres trop marquées (agressif visuellement)
- ✅ `md` pour cartes standard (élévation subtile)

---

## ⚡ Animations & Transitions

### Mixin safe-transition()

**CRITIQUE** : Utiliser `@include safe-transition()` pour animations TSA-friendly

**Usage** :

```scss
.button {
  @include safe-transition(transform background-color);
  // Génère : transition: transform 0.3s ease, background-color 0.3s ease
}

.card {
  @include safe-transition(box-shadow opacity);
  // Génère : transition: box-shadow 0.3s ease, opacity 0.3s ease

  &:hover {
    box-shadow: shadow('lg');
    opacity: 0.9;
  }
}
```

**Règles TSA-friendly** :

- ✅ **Durée max 0.3s** (animations douces, pas brusques)
- ✅ **Easing `ease`** uniquement (pas `linear`, `bounce`)
- ✅ **Propriétés spécifiques** (pas `all`)
- ✅ **Respecte `prefers-reduced-motion`** automatiquement

**Antipattern** :

```scss
// ❌ INTERDIT - Animation trop rapide
.button {
  transition: all 0.1s linear; // Trop rapide + easing linéaire
}

// ❌ INTERDIT - 'all' déconseillé (performance)
.card {
  transition: all 0.3s ease;
}

// ✅ CORRECT
.button {
  @include safe-transition(transform);
}
```

---

### Fonctions Timing & Easing

**Usage** :

```scss
.element {
  transition-duration: timing('fast'); // 0.15s
  transition-timing-function: easing('smooth'); // ease-in-out
}
```

**Tokens timing()** :

```scss
timing('instant')  // 0s    - Instantané
timing('fast')     // 0.15s - Rapide
timing('normal')   // 0.3s  - Normal (TSA-friendly max)
timing('slow')     // 0.5s  - Lent (éviter)
```

**Tokens easing()** :

```scss
easing('linear')      // linear (éviter)
easing('ease')        // ease (défaut TSA-friendly)
easing('ease-in')     // ease-in
easing('ease-out')    // ease-out
easing('ease-in-out') // ease-in-out
easing('smooth')      // cubic-bezier(0.4, 0, 0.2, 1)
```

**Règles** :

- ✅ **Max 0.3s** pour toutes animations (TSA)
- ✅ `ease` ou `ease-in-out` uniquement
- ❌ **Jamais** `linear`, `bounce`, `elastic`

---

### Mixin safe-animation()

**Usage** :

```scss
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal {
  @include safe-animation(fadeIn 0.3s ease);
  // Respecte prefers-reduced-motion automatiquement
}
```

---

## 📱 Responsive (Media Queries)

### Mixin respond-to()

**Usage** :

```scss
.card {
  padding: spacing('4');

  @include respond-to('tablet') {
    padding: spacing('6'); // Tablette et +
  }

  @include respond-to('desktop') {
    padding: spacing('8'); // Desktop
  }
}
```

**Breakpoints disponibles** :

```scss
respond-to('mobile')      // 0-767px     (smartphones)
respond-to('tablet')      // 768px+      (tablettes)
respond-to('desktop')     // 1024px+     (desktop)
respond-to('wide')        // 1280px+     (écrans larges)
respond-to('ultrawide')   // 1920px+     (ultra-larges)
```

**Mobile-First OBLIGATOIRE** :

```scss
// ✅ CORRECT - Mobile-first (défaut = mobile)
.card {
  padding: spacing('2'); // Mobile (défaut)

  @include respond-to('tablet') {
    padding: spacing('4'); // Tablette et +
  }
}

// ❌ INTERDIT - Desktop-first
.card {
  padding: spacing('8'); // Desktop par défaut (faux)

  @media (max-width: 768px) {
    padding: spacing('2'); // Mobile (anti-pattern)
  }
}
```

---

## 🎨 Mixins Accessibilité TSA

### @include focus-visible

**Usage** :

```scss
.button {
  &:focus-visible {
    @include focus-visible; // Génère outline accessible
  }
}

// Génère :
// outline: 2px solid color('primary');
// outline-offset: 2px;
```

**Règles** :

- ✅ **TOUJOURS** ajouter focus visible (navigation clavier)
- ✅ Outline min 2px (WCAG 2.4.7)
- ✅ Offset 2px (séparation claire)

---

### @include touch-target

**Usage** :

```scss
.button {
  @include touch-target; // Min 44×44px (TSA)
}

// Génère :
// min-width: 44px;
// min-height: 44px;
```

**Règles WCAG 2.5.5** :

- ✅ **Min 44×44px** tous éléments interactifs (TSA)
- ✅ Espacement 8px entre cibles adjacentes

---

### @include visually-hidden

**Usage** :

```scss
.sr-only {
  @include visually-hidden; // Caché visuellement, lecteur écran OK
}

// Génère :
// position: absolute;
// width: 1px;
// height: 1px;
// overflow: hidden;
// clip: rect(0, 0, 0, 0);
```

**Usage ARIA** :

```html
<button aria-label="Supprimer">
  <TrashIcon aria-hidden="true" />
  <span class="sr-only">Supprimer la tâche</span>
</button>
```

---

## 📐 Borders (border-width)

### Fonction border-width()

**Usage** :

```scss
.card {
  border: border-width('thin') solid surface('border');
}

.emphasis {
  border-left: border-width('thick') solid semantic('error');
}
```

**Tokens disponibles** :

```scss
border-width('none')   // 0
border-width('thin')   // 1px (bordure légère)
border-width('medium') // 2px (bordure standard)
border-width('thick')  // 4px (bordure emphase)
```

---

## ⚠️ Antipatterns à Éviter

### ❌ Valeurs Hardcodées

```scss
// ❌ INTERDIT
.card {
  margin: 16px;
  padding: 12px 20px;
  background: #ffb3ba;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 14px;
}

// ✅ CORRECT - Tokens
.card {
  margin: spacing('4');
  padding: spacing('3') spacing('5');
  background: color('primary');
  border-radius: radius('md');
  box-shadow: shadow('md');
  font-size: font-size('sm');
}
```

---

### ❌ var(--\*) Direct

```scss
// ❌ INTERDIT - Accès direct CSS variables
.card {
  color: var(--color-primary);
  padding: var(--spacing-md);
}

// ✅ CORRECT - Fonctions tokens
.card {
  color: color('primary');
  padding: spacing('4');
}
```

**Pourquoi** : Fonctions tokens = source vérité unique, validation stricte, fallback Phase 6

---

### ❌ Manipulations Couleurs

```scss
// ❌ INTERDIT - lighten/darken
.button {
  background: lighten(#ffb3ba, 10%);
  border-color: darken(#ffb3ba, 20%);
}

// ❌ INTERDIT - color.adjust
@use 'sass:color';
.button {
  background: color.adjust(#ffb3ba, $lightness: 10%);
}

// ✅ CORRECT - Tokens variants
.button {
  background: color('primary'); // Base
  border-color: color('primary', 'dark'); // Dark variant
}
```

**Pourquoi** : Manipulations = contraste non garanti WCAG

---

### ❌ Confusion spacing() vs size()

```scss
// ❌ INTERDIT
.card {
  padding: size('4'); // FAUX (size pour dimensions)
  width: spacing('400'); // FAUX (spacing pour espacement)
}

// ✅ CORRECT
.card {
  padding: spacing('4'); // Espacement interne
  width: size('400'); // Dimension
}
```

---

### ❌ Animations Trop Rapides

```scss
// ❌ INTERDIT - <0.3s ou linear
.button {
  transition: all 0.1s linear; // Trop rapide + easing brusque
}

// ❌ INTERDIT - Animations brusques
@keyframes bounce {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
  100% {
    transform: translateY(0);
  }
}

.element {
  animation: bounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

// ✅ CORRECT - Douces, max 0.3s
.button {
  @include safe-transition(transform);
}
```

---

## 🧪 Validation SCSS

### Commandes Disponibles

```bash
# Détecter valeurs hardcodées (px, #hex, rgb())
pnpm lint:hardcoded

# Compiler SCSS
pnpm build:css

# Valider cibles tactiles < 44×44px
pnpm validate:touch-targets

# Vérification complète
pnpm verify:css  # lint:hardcoded + validate:touch-targets + build:css
```

### Script lint:hardcoded

**Localisation** : `scripts/check-hardcoded.js`

**Détecte** :

- ✅ `16px`, `2rem` (spacing hardcodes)
- ✅ `#FFB3BA`, `rgb(255, 179, 186)` (couleurs hardcodes)
- ✅ `rgba(0,0,0,0.1)` (shadows hardcodes)
- ✅ Exceptions autorisées : `0`, `1px`, `100%`, `auto`, `inherit`

**Usage** :

```bash
pnpm lint:hardcoded

# Output si hardcode détecté :
# ❌ src/components/Card.scss:12 - Hardcoded value: 16px
# ✅ Use spacing('4') instead
```

---

### Script validate:touch-targets

**Localisation** : `scripts/check-touch-targets.js`

**Détecte** :

- ✅ Éléments interactifs < 44×44px
- ✅ Boutons, liens, inputs trop petits
- ✅ Violations WCAG 2.5.5

**Usage** :

```bash
pnpm validate:touch-targets

# Output si violation :
# ❌ Button width: 32px (min 44px required)
# ✅ Use size('44') or @include touch-target
```

---

## 📚 Références

### Documentation Interne

- **CLAUDE.md global** : Section "Design System Tokens-First"
- **`src/components/CLAUDE.md`** : Conventions SCSS BEM-lite, accessibilité
- **`refactor-css/refactor-philosophy.md`** - Règles absolues & principes
- **`refactor-css/refactor-contract.md`** - Plan exécution phase par phase
- **`refactor-css/scss-architecture.md`** - Architecture technique complète

### Fichiers Clés

- **`_tokens.scss`** : 🔥 SOURCE VÉRITÉ tokens (canonical)
- **`_semantics.scss`** : Phase 6 noms métier
- **`_primitives.scss`** : Phase 6 valeurs brutes
- **`_mixins.scss`** : 563 lignes mixins accessibilité
- **`_index.scss`** : Point entrée (import tous abstracts)

### Import dans Composants

```scss
// ✅ TOUJOURS importer abstracts en début fichier
@use '@/styles/abstracts' as *;

.my-component {
  padding: spacing('4');
  background: surface('card');
  color: text('primary');
}
```

---

## ✅ Checklist Utilisation Tokens

Avant d'écrire du SCSS :

- [ ] **Importer abstracts** : `@use '@/styles/abstracts' as *;`
- [ ] **Couleurs** : Utiliser `color()`, `text()`, `surface()`, `semantic()`
- [ ] **Spacing** : Utiliser `spacing()` pour margin/padding/gap
- [ ] **Tailles** : Utiliser `size()` pour width/height/min-max
- [ ] **Typographie** : `font-size()`, `font-weight()`, `line-height()`
- [ ] **Radius** : `radius()` pour border-radius
- [ ] **Shadows** : `shadow()` pour box-shadow
- [ ] **Animations** : `@include safe-transition()` (max 0.3s)
- [ ] **Borders** : `border-width()` pour épaisseurs
- [ ] **Responsive** : `@include respond-to()` mobile-first
- [ ] **Focus** : `@include focus-visible` sur :focus-visible
- [ ] **Cibles tactiles** : Min 44×44px via `@include touch-target`
- [ ] **Validation** : `pnpm lint:hardcoded` avant commit

---

## 🎯 Commandes Utiles

```bash
# Validation SCSS
pnpm lint:hardcoded        # Détecter hardcodes
pnpm build:css             # Compiler SCSS
pnpm build:css:watch       # Compiler mode watch
pnpm verify:css            # Vérification complète

# Validation Accessibilité
pnpm validate:touch-targets # Cibles tactiles < 44×44px

# Tests & Build
pnpm check                 # lint:fix + format (avant commit)
pnpm build                 # Build production
pnpm type-check            # Vérifier TypeScript
```

---

## 📖 Résumé Fonctions Tokens

| Fonction         | Usage                       | Exemple                  |
| ---------------- | --------------------------- | ------------------------ |
| `color()`        | Couleurs principales        | `color('primary')`       |
| `text()`         | Couleurs texte (Phase 6)    | `text('primary')`        |
| `surface()`      | Couleurs fonds (Phase 6)    | `surface('card')`        |
| `semantic()`     | Couleurs feedback (Phase 6) | `semantic('success')`    |
| `role-color()`   | Couleurs rôles              | `role-color('admin')`    |
| `spacing()`      | Margin/padding/gap          | `spacing('4')`           |
| `size()`         | Width/height/min-max        | `size('44')`             |
| `font-size()`    | Taille texte                | `font-size('lg')`        |
| `font-weight()`  | Épaisseur texte             | `font-weight('bold')`    |
| `line-height()`  | Hauteur ligne               | `line-height('relaxed')` |
| `radius()`       | Border-radius               | `radius('md')`           |
| `shadow()`       | Box-shadow                  | `shadow('md')`           |
| `border-width()` | Épaisseur bordure           | `border-width('thin')`   |
| `timing()`       | Durée animation             | `timing('normal')`       |
| `easing()`       | Easing animation            | `easing('ease')`         |

---

## 🔗 Mixins Principaux

| Mixin                        | Usage           | Description                               |
| ---------------------------- | --------------- | ----------------------------------------- |
| `@include safe-transition()` | Animations TSA  | Max 0.3s, respecte prefers-reduced-motion |
| `@include focus-visible`     | Focus clavier   | Outline 2px accessible                    |
| `@include touch-target`      | Cibles tactiles | Min 44×44px (TSA)                         |
| `@include visually-hidden`   | Lecteur écran   | Caché visuellement, lecteur OK            |
| `@include respond-to()`      | Responsive      | Media queries mobile-first                |
| `@include card-style`        | Pattern carte   | Styles cartes standard                    |

---

**Dernière mise à jour** : Janvier 2026
**Version Appli-Picto** : Phase 6 Design System, WCAG 2.2 AA, TSA-friendly
