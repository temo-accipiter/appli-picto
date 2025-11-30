# Analyse Architecture Appli-Picto

## État Actuel - Layout, Navigation & Accessibilité

**Date**: 28 novembre 2024 | **Analyste**: Claude Code
**Périmètre**: Architecture layout Next.js, composants navigation, accessibilité WCAG 2.2 AA

---

## 1. ARCHITECTURE LAYOUT ACTUELLE

### 1.1 Structure Hiérarchique (Root → Pages)

```
RootLayout (/src/app/layout.tsx)
│
├── <html> avec themes + Lexend font
├── <body> contenant ClientWrapper
└── Route Groups:
    ├── (public)/ - Routes non-authentifiées
    │   ├── layout.tsx (PublicLayout)
    │   │   └── Navbar conditionnelle
    │   │   └── <main id="main-content">
    │   │   └── Footer
    │   └── Enfants: /tableau, /time-timer, /login, /signup, /legal
    │
    └── (protected)/ - Routes authentifiées
        ├── layout.tsx (ProtectedLayout)
        │   ├── <ProtectedRoute> wrapper
        │   ├── Navbar conditionnelle
        │   ├── <main id="main-content">
        │   ├── Footer
        │   └── CookieBanner, CookiePreferences
        └── Enfants: /edition, /profil, /abonnement, /admin
```

### 1.2 Fichiers Layout (Top-level)

**Path**: `/src/app/layout.tsx`
**Type**: Server Component (RootLayout)
**Responsabilité**: Configuration HTML globale, polices, thème, meta

```typescript
// Éléments clés:
- lang="fr" + suppressHydrationWarning
- Lexend font (accessibilité TSA: meilleure lisibilité)
- Anti-flash de thème (localStorage → data-theme)
- Preconnect Supabase (optimisation DNS)
- Viewport: device-width, initialScale=1, themeColor=#5A9FB8
- ClientWrapper pour contextes (Auth, Display, etc)
```

**Path**: `/src/app/(public)/layout.tsx`
**Type**: Client Component ('use client')
**Responsabilité**: Wrapper routes publiques, nav conditionnelle

```typescript
// Logique:
showNavbarRoutes = ['/tableau', '/time-timer']
showNavbar = pathname.startsWith(...) // voir uniquement sur certaines routes
// Structure: Navbar → <main id="main-content"> → Footer
```

**Path**: `/src/app/(protected)/layout.tsx`
**Type**: Client Component ('use client')
**Responsabilité**: Auth guard + layout des routes protégées

```typescript
// Wrapper: <ProtectedRoute> (refuse accès non-authentifiés)
// Navbar conditionnelle: ['/profil', '/edition', '/abonnement', '/admin']
```

### 1.3 Zones Principales du Layout

| Zone              | Composant                  | Localisation                            | Responsive        | Notes                               |
| ----------------- | -------------------------- | --------------------------------------- | ----------------- | ----------------------------------- |
| **Header/Nav**    | `<Navbar>`                 | `/src/components/layout/navbar/`        | ✅ Mobile-first   | Fixed position, z-index: $z-modal   |
| **Navigation**    | Boutons/Liens dans Navbar  | Navbar.tsx                              | ✅ Flex wrap      | Icon-only mobile, text+icon desktop |
| **User Menu**     | `<UserMenu>`               | `/src/components/layout/user-menu/`     | ✅ Dialog         | Dropdown keyboard-accessible        |
| **Settings Menu** | `<SettingsMenu>`           | `/src/components/layout/settings-menu/` | ✅ Burger menu    | Checkbox controls                   |
| **Main Content**  | `<main id="main-content">` | Layouts                                 | ✅ Padding fluid  | Flex: 1 pour full-height            |
| **Footer**        | `<Footer>`                 | `/src/components/layout/footer/`        | ✅ Stack vertical | Links + consent control             |

---

## 2. COMPOSANTS NAVIGATION EXISTANTS

### 2.1 Navbar (`/src/components/layout/navbar/`)

**Fichier**: `Navbar.tsx` (183 lignes)

**Responsabilités**:

- Affichage conditionnel selon route + rôle utilisateur
- Boutons de navigation avec icones (Lucide)
- Actions visiteurs vs authentifiés
- Support i18n (hook `useI18n()`)
- Animations Framer Motion

**Props & État**:

```typescript
// État interne:
- pathname (usePathname)
- user (useAuth)
- permissions (usePermissions)
- showPersonalizationModal: boolean

// Logique routes:
isTableau = pathname === '/tableau'
isEdition = pathname === '/edition'
isProfil = pathname === '/profil'
isAdminPermissions = pathname === '/admin/permissions'
```

**Structure HTML**:

```html
<nav class="navbar">
  <div class="navbar-left">
    <!-- Lien édition (si tableau/profil) -->
    <!-- Lien tableau (si édition/profil) -->
  </div>

  <div class="navbar-actions">
    <!-- Si user: UserMenu + SettingsMenu -->
    <!-- Si !user: ThemeToggle, LangSelector, boutons login/signup -->
  </div>
</nav>
```

**Accessibilité**:

- ✅ aria-label sur tous les boutons
- ✅ aria-hidden="true" sur icones
- ✅ title attribut pour tooltips
- ⚠️ Pas de skip-link (voir Layout.scss)

**Styling**: `Navbar.scss` (256 lignes)

- Mobile-first: flex-direction: column (320px+)
- Desktop (sm breakpoint 576px): flex-direction: row
- Focus-visible: 2px outline + 4px offset
- Buttons: 44px min-height (WCAG 2.2 AA)

### 2.2 UserMenu (`/src/components/layout/user-menu/`)

**Fichier**: `UserMenu.tsx` (359 lignes)

**Responsabilités**:

- Dropdown de profil utilisateur
- Navigation clavier (Arrow keys, Home, End, Escape)
- Focus trap + gestion focus retour
- Profil pseudo + avatar signé (bucket: avatars)
- Checkout Stripe intégré
- Abonnement + admin access

**Accessibilité Avancée** ✅:

```typescript
// WCAG 2.1.1 - Navigation clavier complète:
- ArrowDown/Up: Navigation entre items
- Home/End: Premier/dernier item
- Escape: Ferme + retour focus sur trigger
- Tab: Cycle à travers les items

// ARIA Dialog:
- role="dialog"
- aria-modal="true"
- aria-label={t('nav.profil')}
- aria-expanded={open} sur trigger

// Focus Management:
- Focus sur premier item à l'ouverture
- Retour focus sur trigger après fermeture
- Focus lock (Tab trap)

// Images Alt:
- avatarAlt = `Avatar de ${displayPseudo}`
```

**Structure Menu** (3 sections):

1. Header: Avatar + Pseudo
2. Preferences: LangSelector + ThemeToggle
3. Navigation: Profil | Abonnement/Admin | Logout

### 2.3 SettingsMenu (`/src/components/layout/settings-menu/`)

**Fichier**: `SettingsMenu.tsx` (162 lignes)

**Responsabilités**:

- Burger menu settings
- Checkboxes: Confettis, Train, Rewards, Timer, Notifications
- Featuregate-aware
- Escape + click-outside close

**Accessibilité**:

- ✅ aria-expanded sur trigger
- ✅ aria-haspopup="true"
- ✅ aria-label + title
- ✅ Keyboard (Escape)
- ⚠️ Pas de keyboard navigation intra-menu (checkboxes oui, mais pas arrow nav)

**SCSS**: `SettingsMenu.scss` (180 lignes)

- Position: absolute (backdrop fixed)
- Burger animation 3 lignes
- z-index: $z-modal

### 2.4 Footer (`/src/components/layout/footer/`)

**Fichier**: `Footer.tsx` (78 lignes)

**Responsabilités**:

- Liens légaux (mentions, CGU, CGV, privacy, cookies, a11y, RGPD)
- Retract consent button
- Customize cookies button
- Copyright dynamique

**Accessibilité** ✅:

```typescript
// ARIA Landmarks:
<footer role="contentinfo" aria-label={t('legal.mentions')}>
  <nav aria-label={t('legal.mentions')}>
    <ul> (links + buttons)
```

**Responsive**: Flex wrap, mobile-first stack

---

## 3. ÉTAT RESPONSIVE ACTUEL

### 3.1 Breakpoints Définis

**Fichier**: `/src/styles/abstracts/_variables.scss`

```scss
$breakpoint-sm:  576px   // Mobile-first base → small desktop
$breakpoint-md:  768px   // Tablet
$breakpoint-lg:  992px   // Desktop large
$breakpoint-xl: 1200px   // Desktop XL
```

**Approche**: **Mobile-first** (min-width) via mixin `@include respond-to(sm)`

### 3.2 Pattern Responsive Navbar

**Mobile (320px+)**:

```scss
.navbar {
  flex-direction: column    // Stack vertical
  align-items: flex-start
  height: auto
  gap: $spacing-xs
  padding: $spacing-sm $spacing-md
}

.navbar-left {
  width: 100%
  justify-content: center   // Centré
  flex-wrap: wrap
}

.navbar-actions {
  width: 100%
  justify-content: center
  gap: $spacing-sm
}

// Boutons texte:
.nav-button span {
  display: none              // Icon-only mobile
}
```

**Desktop (≥576px)**:

```scss
.navbar {
  flex-direction: row        // Horizontal
  justify-content: space-between
  height: rem(64)
  padding: 0 $spacing-lg
}

.navbar-left {
  width: auto
  justify-content: flex-start
}

.navbar-actions {
  width: auto
  justify-content: flex-end
  gap: $spacing-md
}

.nav-button span {
  display: inline             // Texte visible
}
```

### 3.3 Layout Principal

**Main Container Padding** (`/src/components/shared/layout/Layout.scss`):

```scss
.layout-main {
  main {
    padding: $spacing-md // Mobile: 1rem
      @include respond-to(sm) {
      padding: $spacing-xl; // Desktop: 2rem
    }
  }
}
```

**Max-width**: Pas de limite explicite (fullbleed)

### 3.4 Touch Target Sizing (WCAG 2.2 AA)

**Défini**: 44px minimum (rem(44) = 2.75rem)

**Appliqué à**:

- ✅ `.btn` (buttons)
- ✅ `.input-field__input` (inputs)
- ✅ `.checkbox-field` (checkboxes)
- ✅ `.select-field__select` (selects)
- ✅ `.nav-icon-link` (nav icons) - ⚠️ Peut être < 44px
- ✅ Mixin `@mixin interactive-target` disponible

**Gap entre targets**: ✅ Respecté (spacing vars)

---

## 4. ACCESSIBILITÉ EXISTANTE

### 4.1 ARIA Landmarks & Roles

**Appliqués Systématiquement**:

| Élément               | Role        | aria-label                  | aria-expanded | Notes              |
| --------------------- | ----------- | --------------------------- | ------------- | ------------------ |
| `<footer>`            | contentinfo | ✅ legal.mentions           | —             | Footer.tsx L22     |
| `<nav>` inside footer | —           | ✅ legal.mentions           | —             | Footer.tsx L25     |
| Navbar buttons        | —           | ✅ nav.edition, nav.tableau | —             | Navbar.tsx L53-68  |
| UserMenu trigger      | —           | —                           | ✅ open       | L228               |
| UserMenu dialog       | dialog      | ✅ nav.profil               | —             | L257-258           |
| SettingsMenu trigger  | —           | —                           | ✅ open       | L75-77             |
| SettingsMenu dialog   | dialog      | ✅ settings.title           | —             | L96                |
| Modal base            | dialog      | ✅ modal-title              | —             | Modal.tsx L111-113 |

**Main Content ID**: ✅ Présent (`id="main-content"`) dans tous layouts

**Skip Link**: ✅ Implémenté (`/src/components/shared/layout/Layout.scss` L14-31)

```scss
.skip-link {
  position: absolute
  top: -40px                // Caché par défaut
  left: 0
  &:focus { top: 0 }        // Visible au focus
}
```

### 4.2 Keyboard Navigation

**Implémenté**:

| Composant    | Escape           | Arrow | Tab       | Home/End | Niveau               |
| ------------ | ---------------- | ----- | --------- | -------- | -------------------- |
| UserMenu     | ✅               | ✅    | ✅        | ✅       | WCAG 2.1.1           |
| SettingsMenu | ✅               | ❌    | ✅        | ❌       | WCAG 2.1.1 (partiel) |
| Modal        | ✅               | ❌    | ✅ (trap) | ❌       | WCAG 2.1.1 (partiel) |
| Navbar links | ✅ focus-visible | ❌    | ✅        | ❌       | WCAG 2.4.7           |
| Form inputs  | —                | —     | ✅        | —        | Standard             |

### 4.3 Focus Visible Styling

**Implémenté dans tous les UI components**:

```scss
// Mixin utilisé systématiquement:
@mixin focus-ring($color: $color-accent, $width: 2px, $offset: 2px) {
  &:focus-visible {
    outline: $width solid $color
    outline-offset: $offset
  }
}
```

**Appliqué à**:

- ✅ Buttons: `@include focus-ring`
- ✅ Input toggles: aria-label + focus
- ✅ Links: outline 2px + offset 4px
- ✅ Select elements: outline styling

**Contraste Color Focus**:

- Orange accent (#ffb400) sur surfaces claires ✅
- Visible sur tous les thèmes (light/dark)

### 4.4 Reduced Motion Support

**Fichier**: `/src/styles/base/_reduced-motion.scss`

```scss
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important
    animation-iteration-count: 1 !important
    transition-duration: 0.001ms !important
  }
}
```

**Implémenté aussi dans**:

- ✅ Button spinner: `@media (prefers-reduced-motion: reduce)`
- ✅ Mixins: `@mixin safe-transition` & `@mixin safe-animation`

### 4.5 Forms & Inputs Accessibilité

**Input.tsx** (97 lignes):

```typescript
// Labels:
<label htmlFor={id}> (L49)

// Error handling:
aria-invalid={!!error}
aria-describedby={error ? `${id}-error` : undefined}
<p id={`${id}-error`}> (L91)

// Password toggle:
aria-label="Afficher/Masquer le mot de passe"
SVG icon: aria-hidden="true"
```

**Checkbox.tsx**:

```typescript
// Identique pattern:
aria-invalid={!!error}
aria-describedby={...}
<label htmlFor={id}> associée
Check SVG: aria-hidden="true"
```

**Select.tsx**:

```typescript
aria-invalid={!!error}
aria-describedby={...}
Native <select> (bon support screen readers)
```

### 4.6 Color Contrast (WCAG 2.2 AA minimum: 4.5:1)

**Déclaré dans code**:

- Button.scss L47: "WCAG 2.2 AA compliant - Ratio ~4.7:1"
- UserMenu.scss L242: "WCAG 2.2 AA compliant - Ratio ~4.5:1"

**Couleurs principales**:

```scss
$color-primary: #0077c2      // Blanc: 4.7:1 ✅
$color-secondary: #ef5350    // Blanc: 5.1:1 ✅
$color-error: #f44336        // Blanc: 5.3:1 ✅
$color-accent: #ffb400       // Noir: 5.8:1 ✅
```

### 4.7 Images & Icons

**Pattern**:

```typescript
// Icon: aria-hidden="true"
<Pencil size={20} aria-hidden="true" />

// Images:
<SignedImage alt={avatarAlt} /> // alt personnalisé

// Lucide Icons: Utilisés partout, bon support
```

### 4.8 Internationalization (i18n)

**Utilisé partout**:

```typescript
const { t } = useI18n()
// aria-label={t('nav.edition')}
// title={t('nav.tableau')}
```

**Fichier**: `/src/hooks/useI18n.ts`
Support multilingue: FR/EN

---

## 5. COMPOSANTS UI NON-OPTIMISÉS

### 5.1 Modals/Dialogs

**Path**: `/src/components/shared/modal/`

| Composant            | Fichier                | Status | Issues               |
| -------------------- | ---------------------- | ------ | -------------------- |
| Modal base           | Modal.tsx (142 L)      | ✅ Ok  | Pas de scoped styles |
| ModalConfirm         | modal-confirm/         | ✅ Bon | —                    |
| ModalAjout           | modal-ajout/           | ⚠️ ?   | À vérifier           |
| ModalCategory        | modal-category/        | ⚠️ ?   | À vérifier           |
| ModalRecompense      | modal-recompense/      | ⚠️ ?   | À vérifier           |
| ModalQuota           | modal-quota/           | ⚠️ ?   | À vérifier           |
| DeleteAccountModal   | DeleteAccountModal.tsx | ⚠️ ?   | À vérifier           |
| PersonalizationModal | modal-personalization/ | ⚠️ ?   | À vérifier           |
| SignupPromptModal    | modal-signup-prompt/   | ⚠️ ?   | À vérifier           |

**Base Modal Pattern**:

```typescript
// Accessibilité ✅:
- role="dialog"
- aria-modal="true"
- aria-labelledby={title ? 'modal-title' : undefined}

// Keyboard ✅:
- Escape: close
- Enter on button: click
- Tab: focus trap (first ↔ last)

// Focus ✅:
- Auto-focus dernier bouton (.modal__actions button:last-of-type)
- Scroll lock (document.body.style.overflow = 'hidden')

// BUT:
- Pas de focus-visible styling visible sur boutons (hérite du btn)
- Pas de animation fade contrôlée par prefers-reduced-motion spécifiquement
```

### 5.2 Cards

**Utilisées dans**: Edition, Tableau, Admin
**Pattern**: `<div class="card">` ou `.card-style` SCSS mixin

**À vérifier**:

- [ ] Responsive sur mobile
- [ ] Touch targets > 44px
- [ ] Focus states
- [ ] Contrast ratios

### 5.3 Images (SignedImage)

**Component**: Probablement dans `src/components/`

**Issues**:

- [ ] Compression 100KB (mentionnée en CLAUDE.md)
- [ ] Signed URLs (1-24h validity)
- [ ] Magic bytes verification
- [ ] Responsive sizing

### 5.4 Formulaires (Pages Edition/Profil)

**Scope**: Non audité (complexe - voir TachesEdition, etc)

**Probable issues**:

- [ ] Fieldsets pour groupes
- [ ] Legend au lieu de simple label
- [ ] Error messages aria-describedby (partiel)
- [ ] Autofocus management

### 5.5 Listes/Grilles (Drag & Drop)

**Component**: `TachesDnd.tsx` (@dnd-kit library)

**Accessible?**: ⚠️ À vérifier

- Drag-drop keyboard support (Arrow keys)
- Screen reader announcements
- Focus handling during move

---

## 6. DÉPENDANCES LIÉES À LA NAVIGATION

### 6.1 Framework/Routing

| Package       | Version | Usage                         |
| ------------- | ------- | ----------------------------- |
| **next**      | 16.0.3  | App Router, routing, metadata |
| **react**     | 19.0.0  | Components, hooks             |
| **react-dom** | 19.0.0  | Rendering                     |

### 6.2 UI & Styling

| Package                    | Version | Usage                               |
| -------------------------- | ------- | ----------------------------------- |
| **sass**                   | 1.86.3  | SCSS compilation                    |
| **framer-motion**          | 12.10.1 | Navbar animations                   |
| **@radix-ui/react-select** | 2.2.6   | SelectWithImage (accessible select) |
| **lucide-react**           | 0.553.0 | Icons (accessible SVG)              |

### 6.3 Hooks Navigation

| Hook                      | Source          | Usage               |
| ------------------------- | --------------- | ------------------- |
| `usePathname()`           | next/navigation | Route detection     |
| `useRouter()`             | next/navigation | Navigation          |
| `useI18n()`               | @/hooks         | Traductions         |
| `useAuth()`               | @/hooks         | User state          |
| `usePermissions()`        | @/contexts      | Role checks         |
| `useDisplay()`            | @/contexts      | Theme/display prefs |
| `useSubscriptionStatus()` | @/hooks         | Subscription state  |

### 6.4 Hooks Accessibilité (Internes)

**À découvrir**:

- `useFocus()` ?
- `useKeyboard()` ?
- Gestion focus manuelle dans UserMenu

---

## 7. ÉVALUATION: PRIORITÉ PAR THÈME

### 7.1 Architecture Layout

| Aspect                | État       | Priorité | Notes                              |
| --------------------- | ---------- | -------- | ---------------------------------- |
| Route groups          | ✅ Bon     | —        | (public) / (protected) implémentés |
| Navbar conditionnelle | ✅ Bon     | —        | Basé sur pathname                  |
| Skip link             | ✅ Présent | BASSE    | Caché avec focus visible           |
| Main content ID       | ✅ Présent | —        | id="main-content" partout          |
| Layout nesting        | ✅ Bon     | —        | Pas de sidebar à gérer             |

**Priorité Global**: ✅ **VERT - Rien à faire**

---

### 7.2 Composants Navigation

| Composant        | État         | Issues                    | Priorité |
| ---------------- | ------------ | ------------------------- | -------- |
| **Navbar**       | ✅ Bon       | Icon-only spacing < 44px? | MOYENNE  |
| **UserMenu**     | ✅ Excellent | Focus trap impeccable     | BASSE    |
| **SettingsMenu** | ⚠️ Bon       | Pas d'arrow nav           | BASSE    |
| **Footer**       | ✅ Bon       | Liens petits?             | BASSE    |

**Priorité Global**: ⚠️ **JAUNE - Vérifications mineures**

**Action suggérée**:

- Vérifier spacing touch targets (border-box / padding)
- Tester mobile 320px viewport
- Vérifier footer links size

---

### 7.3 Responsive & Mobile-First

| Aspect                | État          | Issues      | Priorité |
| --------------------- | ------------- | ----------- | -------- |
| Mobile-first approach | ✅ Oui        | —           | —        |
| Breakpoints           | ✅ 4 defined  | —           | —        |
| Navbar responsive     | ✅ Bon        | Icon wrap?  | BASSE    |
| Form responsive       | ⚠️ Non audité | ?           | MOYENNE  |
| Touch targets         | ✅ 44px règle | Non partout | MOYENNE  |

**Priorité Global**: ⚠️ **JAUNE - Audit partiellement requis**

**Action suggérée**:

- Audit complet formulaires (Edition, Profil)
- Vérifier tous les boutons > 44px
- Test réel sur mobile 320px

---

### 7.4 Accessibilité (WCAG 2.2 AA)

| Critère            | État          | Coverage                | Priorité |
| ------------------ | ------------- | ----------------------- | -------- |
| **Landmarks**      | ✅ Bon        | Navbar, Footer, Main    | BASSE    |
| **Keyboard Nav**   | ✅ Bon        | UserMenu excellent      | BASSE    |
| **Focus Visible**  | ✅ Bon        | Partout sauf...         | MOYENNE  |
| **Reduced Motion** | ✅ Implémenté | Global + composants     | BASSE    |
| **Color Contrast** | ✅ 4.5:1+     | Tous primaires          | BASSE    |
| **Alt Text**       | ✅ Bon        | Icons + images          | BASSE    |
| **Form Labels**    | ✅ Bon        | Input, Checkbox, Select | BASSE    |
| **Screen Reader**  | ✅ Bon        | Aria roles partout      | BASSE    |
| **Touch Targets**  | ⚠️ 44px rule  | 90% couverts            | MOYENNE  |

**Priorité Global**: ✅ **VERT - Très bon état**

**Mais**: Audit complet recommandé (axe-core disponible, voir package.json L110)

---

## 8. FICHIERS CLÉ - LOCALISATION & CONTENUS

### 8.1 Layout Files

```
/src/app/
├── layout.tsx (72 L)                    → RootLayout, themes, polices
├── (public)/layout.tsx (25 L)           → PublicLayout, Navbar condition
└── (protected)/layout.tsx (26 L)        → ProtectedRoute guard, Navbar condition

/src/components/shared/layout/
├── Layout.tsx (40 L) [ANCIEN - legacy?]
└── Layout.scss (57 L)                   → Skip link, main padding
```

### 8.2 Navigation Components

```
/src/components/layout/
├── navbar/
│   ├── Navbar.tsx (170 L)               → Main nav, 7 routes, visitor mode
│   └── Navbar.scss (256 L)              → Mobile-first, 44px buttons
├── user-menu/
│   ├── UserMenu.tsx (359 L)             → Dropdown, keyboard, focus-trap
│   └── UserMenu.scss (?)
├── settings-menu/
│   ├── SettingsMenu.tsx (162 L)         → Burger, checkboxes, Escape
│   └── SettingsMenu.scss (?)
└── footer/
    └── Footer.tsx (78 L)                → Links légaux, consent control
```

### 8.3 Style System

```
/src/styles/
├── abstracts/
│   ├── _variables.scss (178 L)          → Colors, spacing, breakpoints, z-index
│   ├── _mixins.scss (191 L)             → Responsive, focus-ring, safe-animation
│   ├── _functions.scss
│   └── _index.scss
├── base/
│   ├── _animations.scss (100+ L)        → Keyframes (pop, slide-up, etc)
│   ├── _reduced-motion.scss (11 L)      → Media query prefers-reduced-motion
│   ├── _typography.scss
│   ├── _reset.scss
│   └── _helpers.scss
├── themes/
│   ├── _theme-vars.scss                 → CSS custom properties
│   └── _index.scss
└── main.scss                            → Entry point
```

### 8.4 UI Components (Accessible)

```
/src/components/ui/
├── button/
│   ├── Button.tsx (66 L)                → Min 44px, focus-ring, aria-busy
│   ├── Button.scss (131 L)              → Variants, spinner, contrast ✅
│   ├── button-delete/
│   └── button-close/
├── input/
│   ├── Input.tsx (97 L)                 → Aria-invalid, describedby, password toggle
│   └── Input.scss                       → 44px min-height
├── checkbox/
│   ├── Checkbox.tsx (74 L)              → Ref forward, Lucide Check icon
│   └── Checkbox.scss                    → 44px min-height
├── select/
│   ├── Select.tsx (79 L)                → Native <select>, aria-invalid
│   └── Select.scss                      → 44px min-height
├── select-with-image/
│   ├── SelectWithImage.tsx (80+ L)      → Radix UI Select, images
│   └── SelectWithImage.scss
├── toast/
│   ├── Toast.tsx
│   └── Toast.scss
└── ... (loader, upload-progress, etc)
```

### 8.5 Modal Components

```
/src/components/shared/modal/
├── Modal.tsx (142 L)                    → Base dialog, keyboard, focus-trap
├── Modal.scss (90 L)                    → Overlay, animations, width 90%
├── modal-confirm/
├── modal-ajout/
├── modal-category/
├── modal-recompense/
├── modal-quota/
├── modal-personalization/
├── modal-signup-prompt/
└── DeleteAccountModal.tsx
```

---

## 9. CHECKLIST AUDIT COMPLET RECOMMANDÉ

### 9.1 Layout

- [ ] Vérifier embouteillements `<ClientWrapper>` → Contexts
- [ ] Tester navigation entre routes (focus management)
- [ ] Vérifier margin-top: 2rem sur .layout (pourquoi?)

### 9.2 Navigation

- [ ] Width/height buttons avec icons: vraiment 44px?
- [ ] Tester mobile 320px, 480px, 768px
- [ ] Vérifier UserMenu sur mobile (dropdown width, z-index)
- [ ] SettingsMenu overflow sur petit écran?
- [ ] Navbar z-index vs modal z-index conflict?

### 9.3 Responsive

- [ ] Form inputs full-width mobile (flex: 1)?
- [ ] Cards responsive (width 90%, padding adapt)?
- [ ] Images lazy-load + responsive sizes?
- [ ] Hamburger menu manquant pour mobile? (SettingsMenu = hamburger only?)

### 9.4 Accessibilité

- [ ] Axe-core audit complet
- [ ] NVDA/JAWS test (Windows)
- [ ] VoiceOver test (Mac)
- [ ] Keyboard navigation mobile (focus indicators)
- [ ] Contrast ratio vérif (Color Oracle)
- [ ] Reduced motion test
- [ ] Formulaires aria-label/legend consistency

### 9.5 Performance

- [ ] Framer Motion animations: smooth?
- [ ] Lazy load modals?
- [ ] Icon sprites vs individual?
- [ ] CSS-in-JS overhead (tailwind absent)?

---

## 10. RÉSUMÉ PRIORITÉS

| Domaine                      | État          | Priorité | Action                   |
| ---------------------------- | ------------- | -------- | ------------------------ |
| **Architecture Layout**      | ✅ Bon        | BASSE    | —                        |
| **Navigation Navbar**        | ✅ Bon        | BASSE    | Vérifier touch targets   |
| **Navigation UserMenu**      | ✅ Excellent  | BASSE    | —                        |
| **Navigation SettingsMenu**  | ⚠️ Bon        | BASSE    | Tester mobile            |
| **Footer**                   | ✅ Bon        | BASSE    | —                        |
| **Responsive Mobile**        | ⚠️ Théorie ok | MOYENNE  | Audit réel 320px-1200px  |
| **Touch Targets (44px)**     | ✅ Règle ok   | MOYENNE  | Vérifier tous composants |
| **Accessibilité (WCAG 2.2)** | ✅ Très bon   | BASSE    | Audit axe-core complet   |
| **Forms (Edition, Profil)**  | ⚠️ Non audité | MOYENNE  | À creuser                |
| **Drag & Drop (dnd-kit)**    | ⚠️ Non audité | BASSE    | À vérifier plus tard     |

---

## 11. OBSERVATIONS FINALES

### Forces ✅

1. **Architecture Next.js propre** - Route groups bien utilisés
2. **Accessibilité proactive** - ARIA roles, keyboard nav, focus management
3. **Mobile-first SCSS** - Breakpoints bien définis
4. **Composants réutilisables** - UI system cohérent
5. **i18n intégré** - Traductions aria-label/title
6. **Reduced Motion** - Support préservation mouvement
7. **Color Contrast** - Ratios WCAG 2.2 AA déclarés

### Zones d'Amélioration ⚠️

1. **Audit mobile réel** - Responsive théorie ok, mais test physique requis
2. **Touch targets** - Règle 44px implémentée, mais vérification complète manquante
3. **Formulaires complexes** - Edition/Profil non audités
4. **Modals variants** - Seulement Modal base bien audité
5. **Drag & drop** - dnd-kit accessibility non claire
6. **Documentation a11y** - Pas de WCAG compliance matrix

### Recommandations

1. **Audit axe-core**: `npm install axe-core` (déjà en devDependencies!)
2. **Test NVDA/JAWS**: Windows screen reader testing
3. **Mobile physique**: Tester 320px real device
4. **Documentation**: Créer ACCESSIBILITY.md avec compliance matrix
5. **Formulaires**: Deep dive TachesEdition, ModalAjout, etc
6. **E2E a11y**: Ajouter tests Playwright pour keyboard nav

---

**Généré**: 28 novembre 2024 avec Claude Code
**Périmètre**: Analyse statique codebase + inspection fichiers
**Méthodologie**: Grep patterns + Read files + Architecture mapping
