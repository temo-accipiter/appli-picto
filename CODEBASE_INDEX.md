# Appli-Picto - Index Codebase Complet
## Localisation fichiers clés + Références croisées

---

## 1. LAYOUT & ROUTING

### RootLayout
- **Fichier**: `/src/app/layout.tsx`
- **Type**: Server Component
- **Ligne**: 72 lignes
- **Responsabilités**:
  - Balises `<html lang="fr">` et `<body>`
  - Metadata (titre, description, PWA manifest)
  - Viewport configuration
  - Lexend font import (accessibilité TSA)
  - Anti-flash de thème script
  - ClientWrapper (contexts providers)
- **Imports clés**:
  - `ClientWrapper from './client-wrapper'`
  - `@/styles/main.scss`
- **Lire en priorité**: OUI - comprendre structure

### PublicLayout
- **Fichier**: `/src/app/(public)/layout.tsx`
- **Type**: Client Component ('use client')
- **Ligne**: 26 lignes
- **Responsabilités**:
  - Routes accessibles: /tableau, /time-timer, /login, /signup, /legal
  - Navbar conditionnelle (showNavbarRoutes)
  - Main content wrapper
  - Footer + CookieBanner + CookiePreferences
- **État**: Bon
- **Dépend de**: Navbar, Footer components

### ProtectedLayout
- **Fichier**: `/src/app/(protected)/layout.tsx`
- **Type**: Client Component ('use client')
- **Ligne**: 27 lignes
- **Responsabilités**:
  - Routes authentifiées: /edition, /profil, /abonnement, /admin
  - ProtectedRoute wrapper (auth guard)
  - Navbar conditionnelle (showNavbarRoutes)
  - Main content + Footer
- **État**: Bon
- **Dépend de**: ProtectedRoute, Navbar

### Legacy Layout Component (à vérifier si utilisé)
- **Fichier**: `/src/components/shared/layout/Layout.tsx`
- **Type**: Client Component
- **Ligne**: 40 lignes
- **Observations**:
  - Semble être legacy (Layout.scss existe aussi à `/src/components/shared/layout/Layout.scss`)
  - À vérifier si encore utilisé (remplacé par route layouts?)
  - Contient Skip link pattern

---

## 2. NAVIGATION COMPOSANTES

### Navbar
- **Dossier**: `/src/components/layout/navbar/`
- **Fichiers**:
  - `Navbar.tsx` (170 lignes) - Composant principal
  - `Navbar.scss` (256 lignes) - Styles mobile-first
- **Responsabilités**:
  - Affichage conditionnel selon route (isTableau, isEdition, isProfil, isAdminPermissions)
  - Navigation links: /edition, /tableau
  - UserMenu (si authentifié)
  - SettingsMenu (si sur /edition)
  - Visitor mode: ThemeToggle, LangSelector, Personalization button
  - Framer Motion animations
- **État**: ✅ Bon
- **Accessibilité**:
  - ✅ aria-label sur tous les boutons
  - ✅ aria-hidden sur icones
  - ✅ title attributs
  - ✅ Focus visible styling (outline 2px)
  - ✅ Min-height 44px buttons
- **Responsive**:
  - Mobile (320px+): flex-direction column, icon-only buttons
  - Desktop (576px+): flex-direction row, text+icon buttons
- **Key Constants**:
  - `showNavbarRoutes = ['/tableau', '/time-timer']` (public layout)
  - `showNavbarRoutes = ['/profil', '/edition', '/abonnement', '/admin']` (protected layout)

### UserMenu
- **Dossier**: `/src/components/layout/user-menu/`
- **Fichiers**:
  - `UserMenu.tsx` (359 lignes) - Composant principal avec focus trap
  - `UserMenu.scss` (?) - Styles
- **Responsabilités**:
  - Dropdown profil utilisateur
  - Avatar (avec SignedImage from bucket:avatars)
  - Pseudo affichage (fetchDB ou user metadata)
  - Menu items: Profil | Abonnement/Admin | Logout
  - Checkout Stripe intégré
  - Preferences: LangSelector, ThemeToggle
- **État**: ✅ Excellent (keyboard nav impeccable)
- **Accessibilité Avancée**:
  - ✅ Full keyboard navigation (Arrow, Home, End, Escape)
  - ✅ WCAG 2.1.1 compliant
  - ✅ Focus trap (Tab cycles)
  - ✅ Focus retour sur trigger après close
  - ✅ role="dialog", aria-modal="true"
  - ✅ aria-label personnalisé
  - ✅ aria-expanded sur trigger
- **Key Logic**:
  ```typescript
  // Refs for focus management
  const dialogRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuItemsRef = useRef<HTMLButtonElement[]>([])

  // Keyboard handlers (L63-99): Arrow, Home, End, Escape
  // Focus auto on first item (L58-61)
  // Focus retour au close (L72-73)
  ```
- **Dépend de**:
  - `SignedImage` (bucket avatars)
  - `useAuth()` hook
  - `usePermissions()` hook
  - `useSubscriptionStatus()` hook
  - `useI18n()` hook
  - Supabase client

### SettingsMenu
- **Dossier**: `/src/components/layout/settings-menu/`
- **Fichiers**:
  - `SettingsMenu.tsx` (162 lignes)
  - `SettingsMenu.scss` (?)
- **Responsabilités**:
  - Burger menu icon
  - Checkboxes: Confettis, Train, Rewards, Timer, Notifications
  - Feature gate aware (trainprogressbar)
  - Dialog overlay
- **État**: ⚠️ Bon (pas d'arrow navigation intra-menu)
- **Accessibilité**:
  - ✅ aria-expanded on trigger
  - ✅ aria-haspopup="true"
  - ✅ aria-label + title
  - ✅ Escape key close
  - ✅ Click-outside close
  - ❌ Pas d'arrow nav (mais checkboxes sont Tab-accessible)
- **Key Logic**:
  ```typescript
  // Burger menu 3 lignes
  // Dialog backdrop overlay
  // Checkboxes avec onChange handlers
  // useDisplay() pour state (showTrain, showRecompense, etc)
  ```
- **Dépend de**:
  - `Checkbox` component
  - `FeatureGate` component
  - `useDisplay()` hook
  - `useParametres()` hook

### Footer
- **Dossier**: `/src/components/layout/footer/`
- **Fichiers**:
  - `Footer.tsx` (78 lignes)
  - `Footer.scss` (?)
- **Responsabilités**:
  - Navigation légale: Mentions, CGU, CGV, Privacy, Cookies, A11y, RGPD
  - Retract consent button
  - Customize cookies button
  - Copyright
- **État**: ✅ Bon
- **Accessibilité**:
  - ✅ role="contentinfo"
  - ✅ role="navigation"
  - ✅ aria-labels
  - ✅ Button-as-link pattern (linklike class)
- **Responsive**: ✅ Flex wrap, mobile-first stack
- **Dépend de**:
  - `useI18n()` hook
  - `revokeConsent()` utility

---

## 3. STYLE SYSTEM

### Variables & Design Tokens
- **Fichier**: `/src/styles/abstracts/_variables.scss` (178 lignes)
- **Contient**:
  - **Polices**: system-ui, Lexend (pour TSA)
  - **Couleurs**: primary (#0077c2), secondary, accent, semantic
  - **Spacing**: xxs (0.25rem) à xl (2rem)
  - **Typography**: font-size, font-weight, line-height
  - **Breakpoints**: sm (576px), md (768px), lg (992px), xl (1200px)
  - **Shadows**: $box-shadow, $box-shadow-hover
  - **Radius**: sm, md, lg, full
  - **Z-index**: $z-overlay (1000), $z-modal (1100), $z-tooltip (1200)
  - **Transitions**: fast (0.2s), base (0.3s), slow (0.5s)
  - **CSS Custom Properties**: Dynamic theming via :root, @media prefers-color-scheme, [data-theme]
- **Utilisation**: `@use '@styles/abstracts' as *;` en haut de tout fichier SCSS

### Mixins & Fonctions
- **Fichier**: `/src/styles/abstracts/_mixins.scss` (191 lignes)
- **Mixins clés**:
  - `respond-to($breakpoint)` - Mobile-first media query (L19)
  - `focus-ring($color, $width, $offset)` - Unified focus styling (L114)
  - `interactive-target` - 44px min-height/width (L187)
  - `safe-transition($property, $duration, $easing)` - Prefers-reduced-motion safe (L161)
  - `safe-animation($name, $duration, $timing)` - Prefers-reduced-motion safe (L174)
  - `card-style` - Standard card background + padding (L139)
  - `visually-hidden` - Screen reader only text (L148)
  - `focus-accessible($color)` - Accessible focus state (L101)
  - Aussi: `hover-darken`, `clearfix`, `flex-center`, `transition-smooth`

### Animations
- **Fichier**: `/src/styles/base/_animations.scss` (100+ lignes)
- **Keyframes définis**:
  - `fade-in` - Opacity 0→1
  - `slide-up` - TranslateY + opacity
  - `pop` - Scale 1→1.15→1 (task complete)
  - `bougeTrain` - Train animation
  - `reward-pop` - Reward celebration
  - `dash-rail` - Metro line animation
  - `station-pop` - Station marker animation
  - Etc.

### Reduced Motion
- **Fichier**: `/src/styles/base/_reduced-motion.scss` (11 lignes)
- **Contenu**: `@media (prefers-reduced-motion: reduce)` → disable animations

### Themes
- **Fichier**: `/src/styles/themes/_theme-vars.scss`
- **Contient**: CSS custom properties pour dark mode

### Base Styles
- **Dossier**: `/src/styles/base/`
- **Fichiers**:
  - `_typography.scss` - Font families, heading sizes
  - `_reset.scss` - Normalize styles
  - `_helpers.scss` - Utility classes
  - `_animations.scss` - Keyframes
  - `_reduced-motion.scss` - Prefers-reduced-motion

### Main Entry
- **Fichier**: `/src/styles/main.scss`
- **Contenu**: Imports tous les fichiers SCSS

---

## 4. UI COMPONENTS (Accessible)

### Button
- **Dossier**: `/src/components/ui/button/`
- **Fichiers**:
  - `Button.tsx` (66 lignes) - Main component
  - `Button.scss` (131 lignes) - Styles + spinner
  - `button-delete/ButtonDelete.tsx` - Variant
  - `button-close/ButtonClose.tsx` - Close button variant
- **Interface**:
  ```typescript
  interface ButtonProps {
    onClick?: () => void
    label?: string | ReactNode
    children?: ReactNode
    variant?: 'primary' | 'secondary' | 'default' | 'danger'
    disabled?: boolean
    isLoading?: boolean
    type?: 'button' | 'submit' | 'reset'
    className?: string
    'aria-expanded'?: boolean
  }
  ```
- **Accessibilité**:
  - ✅ aria-disabled={isDisabled}
  - ✅ aria-expanded={ariaExpanded}
  - ✅ aria-busy={isLoading}
  - ✅ @include focus-ring
  - ✅ min-height: rem(44)
- **Variants**: primary (blue), secondary (red), default (gray), danger (error color)

### Input
- **Dossier**: `/src/components/ui/input/`
- **Fichiers**:
  - `Input.tsx` (97 lignes)
  - `Input.scss` - Styles
  - `Input.test.tsx` - Tests
- **Interface**:
  ```typescript
  interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    id: string
    label?: string
    value: string | number
    onChange: (e: ChangeEvent<HTMLInputElement>) => void
    placeholder?: string
    type?: string
    error?: string
    className?: string
  }
  ```
- **Accessibilité**:
  - ✅ aria-invalid={!!error}
  - ✅ aria-describedby={error ? `${id}-error` : undefined}
  - ✅ <label htmlFor={id}>
  - ✅ Password toggle button aria-label
  - ✅ min-height: rem(44)
- **Special Features**:
  - Password toggle (Eye icon, aria-label)
  - Error message display
  - Date input lang attribute

### Checkbox
- **Dossier**: `/src/components/ui/checkbox/`
- **Fichiers**:
  - `Checkbox.tsx` (74 lignes)
  - `Checkbox.scss` - Styles
  - `Checkbox.test.tsx`
- **Interface**:
  ```typescript
  interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, ...> {
    id: string
    label?: string
    checked: boolean
    onChange: (e: ChangeEvent<HTMLInputElement>) => void
    error?: string
    className?: string
    size?: 'sm' | 'md'
  }
  ```
- **Accessibilité**:
  - ✅ aria-invalid, aria-describedby
  - ✅ Lucide Check icon aria-hidden
  - ✅ <label htmlFor={id}>
  - ✅ min-height: rem(44)
- **Forward Ref**: ✅ Yes

### Select
- **Dossier**: `/src/components/ui/select/`
- **Fichiers**:
  - `Select.tsx` (79 lignes) - Native <select>
  - `Select.scss` - Styles
  - `Select.test.tsx`
- **Type**: Native HTML <select> (good screen reader support)
- **Accessibilité**:
  - ✅ aria-invalid, aria-describedby
  - ✅ <label htmlFor={id}>
  - ✅ min-height: rem(44)

### SelectWithImage
- **Dossier**: `/src/components/ui/select-with-image/`
- **Fichiers**:
  - `SelectWithImage.tsx` (80+ lignes)
  - `SelectWithImage.scss`
- **Type**: Radix UI (@radix-ui/react-select)
- **Interface**:
  ```typescript
  export interface SelectWithImageOption {
    value: string | number
    label: string
    image?: string
    imageAlt?: string
  }
  ```
- **Features**: Affiche images avec labels
- **Accessibilité**:
  - ✅ Radix UI = accessible defaults
  - ✅ aria-invalid, aria-describedby
- **Usage**: Metro line selector (tableau)

### Form Components (Others)
- `Toast.tsx` / `Toast.scss` - Notifications
- `Loader.tsx` - Loading spinner
- `UploadProgress.tsx` - Progress bar
- `PasswordChecklist.tsx` - Password strength meter
- `FloatingPencil.tsx` - Edit button
- `ImagePreview.tsx` - Image preview

---

## 5. MODAL COMPONENTS

### Base Modal
- **Fichier**: `/src/components/shared/modal/Modal.tsx` (142 lignes)
- **Fichier Styles**: `/src/components/shared/modal/Modal.scss` (90 lignes)
- **Responsabilités**:
  - Dialog wrapper
  - Keyboard handlers (Escape, Enter, Tab trap)
  - Focus management (auto-focus, lock scroll)
  - Overlay/backdrop
- **Accessibilité**:
  - ✅ role="dialog"
  - ✅ aria-modal="true"
  - ✅ aria-labelledby={title ? 'modal-title' : undefined}
  - ✅ Tab trap (L81-103)
  - ✅ Escape close (L43-44)
  - ✅ Auto-focus last button (L66-70)
- **Width**: 90% max-width 500px (responsive)

### Modal Variants
- `ModalConfirm.tsx` - Confirmation dialog
- `ModalAjout.tsx` - Add item dialog
- `ModalCategory.tsx` / `ModalCategory.scss` - Category selection
- `ModalRecompense.tsx` / `ModalRecompense.scss` - Reward dialog
- `ModalQuota.tsx` - Quota limit warning
- `PersonalizationModal.tsx` / `PersonalizationModal.scss` - Visitor personalization
- `SignupPromptModal.tsx` / `SignupPromptModal.scss` - Call-to-action signup
- `DeleteAccountModal.tsx` - Account deletion confirmation

---

## 6. FEATURE COMPONENTS

### Taches (Tasks)
- **Dossier**: `/src/components/features/taches/`
- **Composants**:
  - `TachesEdition.tsx` - Task editor
  - `TachesDnd.tsx` - Drag & drop board (@dnd-kit)
  - `TrainProgressBar.tsx` - Progress visualization
- **Status**: ⚠️ Non fully audited

### Time Timer
- **Fichier**: `/src/components/features/time-timer/TimeTimer.tsx`
- **Usage**: Time tracking / countdown timer

### Settings
- **Dossier**: `/src/components/features/settings/`
- **Composants**:
  - `DeleteAccountModal.tsx` - Account deletion
  - Autres settings

### Admin
- **Dossier**: `/src/components/features/admin/`
- **Composants**:
  - `permissions/PermissionsTable.tsx` - User permissions management

### Consent (RGPD)
- **Dossier**: `/src/components/features/consent/`
- **Composants**:
  - `CookieBanner.tsx` - Cookie consent banner
  - `CookiePreferences.tsx` - Cookie preferences dialog

### Subscription
- **Dossier**: `/src/components/features/subscription/`
- **Composants**: TBD

---

## 7. UTILITY & CONTEXT HOOKS

### Hooks (Fichiers)
- **Dossier**: `/src/hooks/`
- **Principaux**:
  - `useI18n.ts` - i18next wrapper
  - `useAuth.ts` - Auth state + signOut
  - `usePermissions.ts` - Role checks
  - `useSubscriptionStatus.ts` - Subscription state
  - `useEntitlements.ts` - Feature gates
  - `useTaches.ts` - Task CRUD
  - `useTachesEdition.ts` - Task edition state
  - `useTachesDnd.ts` - Drag & drop logic
  - `useQuotas.ts` - Usage limits
  - `useParametres.ts` - Global settings
  - `useDisplay.ts` - Display preferences
  - `withAbortSafe()` - Abort controller wrapper

### Contexts (Fichiers)
- **Dossier**: `/src/contexts/`
- **Principaux**:
  - `AuthContext.tsx` - Authentication
  - `PermissionsContext.tsx` - Role-based access
  - `ToastContext.tsx` - Toast notifications
  - `DisplayContext.tsx` - Display preferences

### Utils
- **Dossier**: `/src/utils/`
- **Principaux**:
  - `supabaseClient.ts` - Single Supabase instance
  - `getDisplayPseudo.ts` - User display name
  - `consent.ts` - RGPD consent utilities
  - `compressImageIfNeeded.ts` - Image compression (100KB max)

---

## 8. KEY CONSTANTS & CONFIGURATIONS

### Breakpoints (SCSS)
```scss
$breakpoint-sm:  576px
$breakpoint-md:  768px
$breakpoint-lg:  992px
$breakpoint-xl: 1200px
```

### Colors (Primary)
```scss
$color-primary: #0077c2      // Buttons (4.7:1 ratio white)
$color-secondary: #ef5350    // Secondary (5.1:1 ratio)
$color-accent: #ffb400       // Focus ring (5.8:1 ratio black)
$color-error: #f44336        // Errors (5.3:1 ratio)
$color-success: #4caf50      // Success
```

### Spacing
```scss
$spacing-xxs: 0.25rem   // 4px
$spacing-xs:  0.5rem    // 8px
$spacing-sm:  0.75rem   // 12px
$spacing-md:  1rem      // 16px
$spacing-lg:  1.5rem    // 24px
$spacing-xl:  2rem      // 32px
```

### Z-Index Stack
```scss
$z-overlay:  1000   // Modal backdrop
$z-modal:    1100   // Modal content, Navbar
$z-tooltip:  1200   // Tooltips
```

### Routes Navbar Visibility
```typescript
// Public layout:
showNavbarRoutes = ['/tableau', '/time-timer']

// Protected layout:
showNavbarRoutes = ['/profil', '/edition', '/abonnement', '/admin']
```

---

## 9. DEPENDENCIES (Relevant to Layout/Navigation)

### Framework
- `next` 16.0.3 - App Router, metadata, images
- `react` 19.0.0 - Components
- `react-dom` 19.0.0 - Rendering

### UI & Animation
- `framer-motion` 12.10.1 - Navbar animations
- `@radix-ui/react-select` 2.2.6 - SelectWithImage (accessible)
- `lucide-react` 0.553.0 - Icons (SVG-based)

### Styling
- `sass` 1.86.3 - SCSS compilation

### Accessibility Testing (DevDependencies)
- `axe-core` 4.11.0 - WCAG audit tool
- `@testing-library/react` 16.3.0 - Component testing
- `@testing-library/dom` 10.4.1 - DOM testing utilities
- `jsdom` 27.2.0 - DOM simulation

### Backend Integration
- `@supabase/supabase-js` 2.81.1 - Supabase client
- `@dnd-kit/*` - Drag & drop

---

## 10. FILE TREE REFERENCE

```
/src
├── app/
│   ├── layout.tsx                           # Root layout
│   ├── (public)/
│   │   ├── layout.tsx                       # Public layout
│   │   ├── tableau/page.tsx                 # Task board
│   │   ├── time-timer/page.tsx
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── legal/
│   │   │   ├── mentions-legales/page.tsx
│   │   │   ├── cgu/page.tsx
│   │   │   ├── cgv/page.tsx
│   │   │   ├── politique-confidentialite/page.tsx
│   │   │   ├── politique-cookies/page.tsx
│   │   │   ├── accessibilite/page.tsx
│   │   │   └── rgpd/page.tsx
│   │   └── [slug]/page.tsx
│   │
│   └── (protected)/
│       ├── layout.tsx                       # Protected layout
│       ├── edition/page.tsx                 # Task editor
│       ├── profil/page.tsx                  # User profile
│       ├── abonnement/page.tsx              # Subscription
│       └── admin/
│           └── permissions/page.tsx
│
├── components/
│   ├── layout/
│   │   ├── navbar/
│   │   │   ├── Navbar.tsx                   ✅
│   │   │   └── Navbar.scss
│   │   ├── user-menu/
│   │   │   ├── UserMenu.tsx                 ✅
│   │   │   └── UserMenu.scss
│   │   ├── settings-menu/
│   │   │   ├── SettingsMenu.tsx             ✅
│   │   │   └── SettingsMenu.scss
│   │   └── footer/
│   │       ├── Footer.tsx                   ✅
│   │       └── Footer.scss
│   │
│   ├── ui/
│   │   ├── button/
│   │   │   ├── Button.tsx                   ✅
│   │   │   ├── Button.scss
│   │   │   ├── button-delete/
│   │   │   └── button-close/
│   │   ├── input/
│   │   │   ├── Input.tsx                    ✅
│   │   │   └── Input.scss
│   │   ├── checkbox/
│   │   │   ├── Checkbox.tsx                 ✅
│   │   │   └── Checkbox.scss
│   │   ├── select/
│   │   │   ├── Select.tsx                   ✅
│   │   │   └── Select.scss
│   │   ├── select-with-image/
│   │   │   ├── SelectWithImage.tsx          ✅
│   │   │   └── SelectWithImage.scss
│   │   ├── toast/
│   │   ├── loader/
│   │   ├── upload-progress/
│   │   ├── password-checklist/
│   │   ├── floating-pencil/
│   │   └── image-preview/
│   │
│   ├── shared/
│   │   ├── layout/
│   │   │   ├── Layout.tsx                   [Legacy?]
│   │   │   └── Layout.scss
│   │   ├── modal/
│   │   │   ├── Modal.tsx                    ✅
│   │   │   ├── Modal.scss
│   │   ├── modal-confirm/
│   │   ├── modal-ajout/
│   │   ├── modal-category/
│   │   ├── modal-recompense/
│   │   ├── modal-quota/
│   │   ├── modal-personalization/
│   │   ├── modal-signup-prompt/
│   │   ├── protected-route/
│   │   │   └── ProtectedRoute.tsx           # Auth guard
│   │   └── feature-gate/
│   │       └── FeatureGate.tsx              # Feature gating
│   │
│   └── features/
│       ├── taches/
│       │   ├── TachesEdition.tsx
│       │   ├── TachesDnd.tsx                [dnd-kit]
│       │   └── train-progress-bar/
│       ├── time-timer/
│       │   └── TimeTimer.tsx
│       ├── settings/
│       │   └── DeleteAccountModal.tsx
│       ├── admin/
│       │   └── permissions/PermissionsTable.tsx
│       ├── consent/
│       │   ├── CookieBanner.tsx
│       │   └── CookiePreferences.tsx
│       └── subscription/
│
├── styles/
│   ├── main.scss                            # Entry
│   ├── abstracts/
│   │   ├── _variables.scss                  ✅ (178 L)
│   │   ├── _mixins.scss                     ✅ (191 L)
│   │   ├── _functions.scss
│   │   └── _index.scss
│   ├── base/
│   │   ├── _animations.scss                 ✅ (100+ L)
│   │   ├── _reduced-motion.scss             ✅ (11 L)
│   │   ├── _typography.scss
│   │   ├── _reset.scss
│   │   └── _helpers.scss
│   ├── themes/
│   │   └── _theme-vars.scss
│   └── vendors/
│       └── _normalize.scss
│
├── hooks/
│   ├── useI18n.ts
│   ├── useAuth.ts
│   ├── usePermissions.ts
│   ├── useSubscriptionStatus.ts
│   ├── useEntitlements.ts
│   ├── useTaches.ts
│   ├── useTachesEdition.ts
│   ├── useTachesDnd.ts
│   ├── useQuotas.ts
│   ├── useParametres.ts
│   ├── useDisplay.ts
│   └── withAbortSafe.ts
│
├── contexts/
│   ├── AuthContext.tsx
│   ├── PermissionsContext.tsx
│   ├── ToastContext.tsx
│   └── DisplayContext.tsx
│
└── utils/
    ├── supabaseClient.ts
    ├── getDisplayPseudo.ts
    ├── consent.ts
    └── compressImageIfNeeded.ts

/supabase
├── functions/
│   ├── create-checkout-session/
│   ├── stripe-webhook/
│   ├── delete-account/
│   ├── log-consent/
│   └── cleanup-unconfirmed/
└── email-templates/
```

---

## 11. QUICK NAVIGATION

### Pour comprendre la navigation:
1. Lire: `/src/app/layout.tsx` (root)
2. Lire: `/src/app/(public)/layout.tsx` et `(protected)/layout.tsx`
3. Lire: `/src/components/layout/navbar/Navbar.tsx`
4. Lire: `/src/components/layout/user-menu/UserMenu.tsx` (keyboard nav example)

### Pour accessibilité:
1. Lire: `/src/styles/abstracts/_mixins.scss` (focus-ring, interactive-target)
2. Lire: `/src/components/ui/button/Button.tsx` (ARIA patterns)
3. Lire: `/src/components/shared/modal/Modal.tsx` (focus trap, keyboard)

### Pour responsive:
1. Lire: `/src/styles/abstracts/_variables.scss` (breakpoints)
2. Lire: `/src/styles/abstracts/_mixins.scss` (respond-to mixin)
3. Lire: `/src/components/layout/navbar/Navbar.scss` (exemple mobile-first)

### Pour animations:
1. Lire: `/src/styles/base/_animations.scss` (keyframes)
2. Lire: `/src/styles/base/_reduced-motion.scss` (prefers-reduced-motion)
3. Lire: `/src/components/layout/navbar/Navbar.tsx` (Framer Motion)

---

**Version**: 1.0 | Généré 28 novembre 2024 | Appli-Picto Architecture Analysis
