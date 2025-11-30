# Patterns Accessibilité Appli-Picto

## Guide des Bonnes Pratiques Implémentées

**Document**: Patterns & conventions existants pour référence lors de nouvelles implémentations
**Audience**: Développeurs contribuant à l'UI

---

## 1. CONVENTIONS DE NAMING CSS

### 1.1 BEM-lite Naming

**Approche**: BEM simplifié (bloc\_\_element--modifier)

```scss
// Button example:
.btn {
  // Block
  &__spinner {
    // Element
    &-dot {
      // Sub-element
      &:nth-child(2) {
      }
    }
  }

  &--loading {
    // Modifier
    opacity: 0.8;
  }

  &:disabled {
    // Pseudo-class state
    opacity: 0.5;
  }
}
```

**Pas**: `.btn-spinner`, `.btn_spinner`, `.btn-primary` (préférer `--primary`)

### 1.2 Organisation SCSS

**Structure fichier**:

```scss
@use '@styles/abstracts' as *; // Imports abstracts

// Variables/Maps si besoin locales
$local-var: value;

// Classe principale
.component-name {
  // Propriétés de base
  display: flex;
  padding: $spacing-md;

  // Éléments enfants (__element)
  &__child {
    color: var(--color-text);
  }

  // Modifieurs (--modifier)
  &--primary {
    background: var(--color-primary);
  }

  // Pseudo-classes (:hover, :focus-visible)
  &:hover {
    background: var(--color-bg-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  // Animations en bas
  @keyframes fade-in {
  }
}
```

### 1.3 Couleurs CSS Custom Properties

**Approche**: Variables CSS (pas SCSS vars) pour theming runtime

```scss
// En _variables.scss:
:root {
  --color-primary: #0077c2;
  --color-text: #333333;
  --color-bg: #ffffff;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #f0f0f0;
    --color-bg: #1a1a2e;
  }
}

[data-theme='dark'] {
  --color-text: #f0f0f0;
  --color-bg: #1a1a2e;
}

// En composant:
.component {
  color: var(--color-text); // ✅
  background: $color-primary; // ❌ (SCSS var statique)
}
```

---

## 2. RESPONSIVE DESIGN PATTERNS

### 2.1 Mobile-First avec Mixin `respond-to`

**Mixin défini**: `/src/styles/abstracts/_mixins.scss` L19

```scss
@mixin respond-to($breakpoint) {
  @if $breakpoint == sm {
    @media (min-width: 576px) {
      @content;
    }
  } @else if $breakpoint == md {
    @media (min-width: 768px) {
      @content;
    }
  }
}
```

**Usage Pattern**:

```scss
.component {
  // Mobile (320px+) - DEFAULT
  padding: $spacing-sm;
  flex-direction: column;

  // Small devices (576px+)
  @include respond-to(sm) {
    padding: $spacing-lg;
    flex-direction: row;
  }

  // Tablets (768px+)
  @include respond-to(md) {
    padding: $spacing-xl;
  }

  // Desktop (992px+)
  @include respond-to(lg) {
    max-width: 1200px;
  }
}
```

**Breakpoints**:

```scss
$breakpoint-sm:  576px
$breakpoint-md:  768px
$breakpoint-lg:  992px
$breakpoint-xl: 1200px
```

### 2.2 Flexbox Responsive Pattern

**Navbar example** (Navbar.scss L13-28):

```scss
.navbar {
  /* Mobile: 320px+ */
  flex-direction: column; // Vertical stack
  align-items: flex-start;
  height: auto;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;

  /* Desktop: 576px+ */
  @include respond-to(sm) {
    flex-direction: row; // Horizontal
    justify-content: space-between;
    height: rem(44); // Fixed height
    padding: 0 $spacing-lg;
    gap: 0; // No gap, use justify-content
  }
}
```

### 2.3 Text Responsive Pattern

**Buttons mobile hide text**:

```scss
.nav-button {
  span {
    /* Mobile: hide text, icon only */
    display: none;

    /* Desktop: show text */
    @include respond-to(sm) {
      display: inline;
    }
  }
}
```

---

## 3. ACCESSIBILITÉ - PATTERNS CLÉS

### 3.1 Focus Visible Mixin

**Défini**: `/src/styles/abstracts/_mixins.scss` L114

```scss
@mixin focus-ring($color: $color-accent, $width: 2px, $offset: 2px) {
  &:focus {
    outline: none; // Reset default outline
  }

  &:focus-visible {
    outline: $width solid $color;
    outline-offset: $offset;
  }
}
```

**Usage - Button**:

```scss
.btn {
  @include focus-ring; // Défaut: orange accent

  &--secondary {
    @include focus-ring(white); // Custom color
  }
}
```

**Output CSS**:

```css
.btn:focus {
  outline: none;
}
.btn:focus-visible {
  outline: 2px solid #ffb400;
  outline-offset: 2px;
}
```

### 3.2 Touch Target Mixin (44px)

**Défini**: `/src/styles/abstracts/_mixins.scss` L187

```scss
@mixin interactive-target {
  min-height: rem(44); // 2.75rem = 44px
  min-width: rem(44);
}
```

**Usage**:

```scss
.btn {
  @include interactive-target;
  padding: $spacing-xs $spacing-sm; // Extra padding OK
}
```

**Pattern**: La taille min-height/width crée le target, padding ajoute de l'espace

### 3.3 Reduced Motion Safe Animations

**Global fallback**: `/src/styles/base/_reduced-motion.scss`

```scss
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Component-level override** (Button.scss L84):

```scss
.btn__spinner {
  animation: spinner-rotate 1s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none; // Override global
    opacity: 0.6; // Fallback visual
  }
}
```

**Mixin de sécurité**:

```scss
@mixin safe-transition(
  $property: all,
  $duration: $transition-fast,
  $easing: ease
) {
  transition: $property $duration $easing;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}

@mixin safe-animation(
  $name,
  $duration: $transition-base,
  $timing: ease-in-out
) {
  animation: $name $duration $timing;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}
```

### 3.4 Form Labels ARIA Pattern

**Input.tsx Pattern** (L48-64):

```typescript
// 1. Label associée au input via htmlFor={id}
<label htmlFor={id} className="input-field__label">
  {label}
</label>

<input
  id={id}
  name={id}
  aria-invalid={!!error}
  aria-describedby={error ? `${id}-error` : undefined}
  ...
/>

// 3. Error message avec id = aria-describedby
<p id={`${id}-error`} className="input-field__error">
  {error}
</p>
```

**Résultat**: Screen reader annonce label + champ + erreur

### 3.5 Icon ARIA Pattern

**Toujours**: `aria-hidden="true"` sur icones purement décoratives

```typescript
// ✅ Bon: icon + aria-label sur conteneur
<button aria-label="Éditer">
  <Pencil size={20} aria-hidden="true" />
</button>

// ✅ Bon: SVG icon + role="img" + aria-label si not hidden
<img
  role="img"
  alt="Avatar de Sophie"  // Alt = aria-label
  src={url}
/>

// ❌ Mauvais:
<button aria-label="Éditer">
  <Pencil size={20} />  // Icon announcé 2x
</button>
```

### 3.6 Dialog/Modal Pattern

**Modal.tsx** (L109-139):

```typescript
<div className="modal-overlay" onClick={onClose}>  {/* backdrop */}
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
    tabIndex={-1}
    ref={modalRef}
  >
    {title && <h2 id="modal-title">{title}</h2>}
    <div className="modal__content">{children}</div>
    <footer className="modal__actions">
      {/* buttons */}
    </footer>
  </div>
</div>
```

**Keyboard Implementation** (L39-103):

```typescript
// Escape close
if (e.key === 'Escape') {
  e.preventDefault()
  onClose()
}

// Tab trap: Si dernier élément + Tab → focus premier
if (!e.shiftKey && document.activeElement === last) {
  e.preventDefault()
  first.focus()
}

// Focus auto: dernier bouton à l'ouverture
if (isOpen) {
  const confirmBtn = modalRef.current?.querySelector(
    '.modal__actions button:last-of-type'
  )
  confirmBtn?.focus()
}
```

### 3.7 Dropdown/Menu Pattern

**UserMenu.tsx** keyboard nav (L63-99):

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  const items = menuItemsRef.current.filter(Boolean)
  const currentIndex = items.findIndex(item => item === document.activeElement)

  switch (e.key) {
    case 'Escape':
      setOpen(false)
      btnRef.current?.focus() // Retour focus trigger
      break

    case 'ArrowDown':
      e.preventDefault()
      const next =
        currentIndex < items.length - 1 ? items[currentIndex + 1] : items[0] // Loop
      next?.focus()
      break

    case 'ArrowUp':
      // Inverse
      break

    case 'Home':
      items[0]?.focus()
      break

    case 'End':
      items[items.length - 1]?.focus()
      break
  }
}
```

**Focus Auto**: Focus sur 1er élément menu à l'ouverture

### 3.8 Skip Link Pattern

**Layout.scss** (L14-31):

```scss
.skip-link {
  position: absolute;
  top: -40px; // Caché
  left: 0;
  background: var(--color-primary);
  padding: 8px 16px;
  text-decoration: none;
  z-index: 9999;

  &:focus {
    top: 0; // Visible au focus
    outline: 2px solid $color-accent;
    outline-offset: 2px;
  }
}
```

**Usage**: Ajouter en première ligne de body

```html
<a href="#main-content" class="skip-link"> Aller au contenu principal </a>
```

---

## 4. TYPESCRIPT PATTERNS

### 4.1 Component Props Interface

**Pattern - Input.tsx**:

```typescript
interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  id: string
  label?: string
  value: string | number
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  error?: string
  className?: string
}

export default function Input({
  id,
  label,
  value,
  onChange,
  placeholder = '',
  ...rest
}: InputProps) { ... }
```

**Bénéfices**:

- Extend HTML attrs (inherit all standard props)
- Omit override (custom onChange/value)
- Optional props avec defaults

### 4.2 ForwardRef Pattern

**Button.tsx**:

```typescript
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ onClick, label, variant = 'primary', ...rest }, ref) => {
    return (
      <button ref={ref} type="button" {...rest}>
        {label}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
```

**Pourquoi**: Parent peut `useRef()` le bouton

### 4.3 Union Types pour Variants

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'default' | 'danger'

interface ButtonProps {
  variant?: ButtonVariant  // Type-safe
}

// Usage:
<Button variant="primary" />  // ✅
<Button variant="unknown" />  // ❌ TypeScript error
```

---

## 5. COMPOSANTS RÉUTILISABLES - PATTERNS

### 5.1 Container/Wrapper Pattern

**Modal**:

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  actions?: ModalAction[]
}

// Usage:
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirmer"
  actions={[
    { label: 'Annuler', onClick: () => ... },
    { label: 'Confirmer', onClick: () => ..., variant: 'primary' }
  ]}
>
  <p>Êtes-vous sûr?</p>
</Modal>
```

### 5.2 State Lifting Pattern

**Navbar.tsx**:

```typescript
const [showPersonalizationModal, setShowPersonalizationModal] = useState(false)

// Passer comme prop:
<PersonalizationModal
  isOpen={showPersonalizationModal}
  onClose={() => setShowPersonalizationModal(false)}
/>
```

### 5.3 Conditional Rendering Pattern

**Navbar.tsx** (L76-160):

```typescript
{user ? (
  // Authenticated actions
  <UserMenu />
) : (
  // Visitor actions
  <ThemeToggle />
  <LangSelector />
  <button>Login</button>
)}
```

---

## 6. HOOKS PATTERNS

### 6.1 Custom Hook Pattern (useI18n)

**Usage**: `const { t } = useI18n()`

```typescript
// Partout dans les composants:
aria-label={t('nav.edition')}
title={t('nav.tableau')}
<span>{t('nav.logout')}</span>
```

### 6.2 Context Hooks (useAuth, usePermissions)

**Pattern**:

```typescript
const { user, authReady, signOut } = useAuth()
const { can, isAdmin, isVisitor, ready } = usePermissions()

// Condition rendering:
if (!authReady) return <Loader />
if (isAdmin) return <AdminPanel />
```

### 6.3 useRef for DOM Access

**UserMenu.tsx** (L34-35):

```typescript
const dialogRef = useRef<HTMLDivElement>(null)
const btnRef = useRef<HTMLButtonElement>(null)
const menuItemsRef = useRef<HTMLButtonElement[]>([])

// Pour focus management:
btnRef.current?.focus()
menuItemsRef.current[0]?.focus()
```

---

## 7. ANIMATIONS PATTERNS

### 7.1 Framer Motion

**Usage - Navbar.tsx** (L45-58):

```typescript
<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
>
  <Link href="/edition" className="nav-icon-link">
    <Pencil size={20} aria-hidden="true" />
  </Link>
</motion.div>
```

**Pattern**:

- `initial`: Début (caché)
- `animate`: État final (visible)
- `transition`: Timing (respecte prefers-reduced-motion? À vérifier)

### 7.2 CSS Keyframe Animations

**animations.scss** (pop, slide-up, reward-pop, etc):

```scss
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slide-up {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

**Usage SCSS**:

```scss
.component {
  animation: fade-in 0.3s ease-out; // Sans mixin
  @include safe-animation(fade-in); // Avec mixin = prefers-reduced-motion safe
}
```

---

## 8. PATTERNS À ÉVITER (Anti-patterns)

### ❌ ARIA Misuse

```typescript
// MAUVAIS:
<button aria-label="Fermer">
  <X size={20} />              // Icon dit "fermer" aussi
</button>
// Screen reader: "Fermer Fermer" ou "Fermer X"

// BON:
<button aria-label="Fermer">
  <X size={20} aria-hidden="true" />
</button>

// ❌ MAUVAIS:
<div role="button" onClick={...}>  // Role sansd'attribs ARIA
  Cliquer
</div>

// ✅ BON:
<button onClick={...}>
  Cliquer
</button>

// ❌ MAUVAIS:
<button aria-label="Options">
  <SettingsIcon />
</button>
// Pas de tabindex ni type
```

### ❌ Focus Management

```typescript
// MAUVAIS:
document.getElementById('input').focus()  // ID hardcoded

// BON:
const inputRef = useRef<HTMLInputElement>(null)
inputRef.current?.focus()

// ❌ MAUVAIS:
// Pas de focus retour après modal close
<Modal>...</Modal>

// ✅ BON:
// Focus restore après fermeture
setOpen(false)
btnRef.current?.focus()  // Retour sur trigger
```

### ❌ Responsive Queries

```scss
// ❌ MAUVAIS - Desktop-first:
.component {
  padding: $spacing-lg;
  @media (max-width: 576px) {
    padding: $spacing-sm;
  }
}

// ✅ BON - Mobile-first:
.component {
  padding: $spacing-sm;
  @include respond-to(sm) {
    padding: $spacing-lg;
  }
}
```

### ❌ Color Contrast

```scss
// ❌ MAUVAIS:
.button {
  background: #f0f0f0; // Gray on white = bad contrast
  color: white;
}

// ✅ BON:
.button {
  background: var(--color-primary); // #0077c2
  color: white; // 4.7:1 ratio
}
```

---

## 9. CHECKLIST POUR NOUVELLES COMPOSANTES

- [ ] **Props Interface**: Extends HTML attrs avec `Omit`
- [ ] **Accessibility**: `aria-*` attribs, labels, describe-by
- [ ] **Focus Visible**: `@include focus-ring` ou custom `&:focus-visible`
- [ ] **Touch Target**: `min-height: rem(44)` via mixin
- [ ] **Responsive**: Mobile-first avec `@include respond-to(sm|md|lg)`
- [ ] **Animations**: `@include safe-animation` pour prefers-reduced-motion
- [ ] **Dark Mode**: Utiliser `var(--color-*)` pas SCSS vars
- [ ] **Icons**: `aria-hidden="true"` si décoratif
- [ ] **Error States**: `aria-invalid` + `aria-describedby`
- [ ] **Keyboard**: Escape, Enter, Arrow keys si dropdown/menu
- [ ] **Testing**: Import `@testing-library/react` pour tests
- [ ] **Documentation**: JSDoc comments si non-obvious

---

**Version**: 1.0 | Généré 28 novembre 2024
