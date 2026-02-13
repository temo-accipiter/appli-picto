# CLAUDE.md - Composants UI

Guide organisation et conventions composants pour **Appli-Picto** - Application Next.js 16 pour enfants autistes et professionnels TSA.

## 🎯 Vue d'Ensemble

Ce dossier contient **97 composants** organisés en **4 catégories strictes** :

- **features/** (24 composants) - Domaines métier complets
- **shared/** (38 composants) - Réutilisables métier
- **ui/** (12 composants) - Primitives pures design system
- **layout/** (5 composants) - Structure application

**Principe fondamental** : Hiérarchie dépendances stricte (ui → shared → features/layout)

---

## 📂 Organisation 4 Catégories (STRICT)

### 1. features/ - Domaines Métier Complets

**Définition** : Composants fonctionnalités métier spécifiques et complexes.

**Structure** :

```
features/
├── taches/              # Gestion tâches
│   ├── taches-dnd/     # Drag & drop tâches
│   ├── taches-edition/ # Édition tâches
│   └── train-progress-bar/ # Barre progression
├── recompenses/         # Gestion récompenses
│   ├── recompenses-edition/
│   └── selected-reward-floating/
├── time-timer/          # Timer visuel TSA
│   ├── TimeTimer.tsx
│   └── FloatingTimeTimer.tsx
├── admin/               # Dashboard admin
│   ├── AccountManagement.tsx
│   ├── QuotaManagement.tsx
│   ├── MetricsDashboard.tsx
│   ├── ImageAnalytics.tsx
│   └── permissions/    # AdminPermissions (sous-dossier)
├── consent/             # Cookies RGPD
│   ├── CookieBanner.tsx
│   └── CookiePreferences.tsx
├── settings/            # Paramètres compte
│   ├── DeleteAccountGuard.tsx
│   └── DeleteAccountModal.tsx
├── subscription/        # Abonnement Stripe
│   └── SubscribeButton.tsx
└── legal/               # Documents légaux
    └── LegalMarkdown.tsx
```

**Règles** :

- ✅ **Peuvent importer** : `shared/` et `ui/`
- ❌ **JAMAIS importer** : Entre eux (pas `features/taches` → `features/admin`)
- ✅ **Contiennent** : Logique métier complexe, hooks custom, business logic
- ✅ **Responsabilité** : Feature complète end-to-end

**Exemples** :

- `features/taches/TachesDnd` - Drag & drop tâches avec persistence Supabase
- `features/time-timer/TimeTimer` - Timer visuel pour enfants TSA (reducer, localStorage)
- `features/admin/MetricsDashboard` - Dashboard métriques avec 9 queries parallèles

**Pourquoi cette catégorie** :

- Isolation domaines métier (maintenance facilitée)
- Évite couplage entre features
- Réutilisation via `shared/` si besoin commun

---

### 2. layout/ - Structure Application

**Définition** : Composants mise en page globale et navigation.

**Structure** :

```
layout/
├── navbar/          # Barre navigation principale
├── footer/          # Pied de page
├── user-menu/       # Menu utilisateur (dropdown profil)
├── settings-menu/   # Menu paramètres
└── bottom-nav/      # Navigation mobile bas écran
```

**Règles** :

- ✅ **Peuvent importer** : `shared/` et `ui/`
- ❌ **JAMAIS importer** : `features/` (pas de logique métier)
- ✅ **Utilisés dans** : Layouts Next.js (`src/app/layout.tsx`, `src/app/(protected)/layout.tsx`)
- ✅ **Responsabilité** : Structure visuelle globale, navigation

**Exemples** :

- `layout/Navbar` - Navigation avec auth status, liens principales pages
- `layout/UserMenu` - Dropdown profil (Mon profil, Paramètres, Déconnexion)
- `layout/Footer` - Pied de page avec liens légaux

**Pourquoi cette catégorie** :

- Composants structurels partagés toutes pages
- Navigation cohérente application
- Séparation layout vs business logic

---

### 3. shared/ - Réutilisables Métier

**Définition** : Composants réutilisables avec logique métier **légère**.

**Structure** (28 dossiers) :

```
shared/
├── modal/              # Système modales
│   ├── Modal.tsx              # Modale base
│   ├── modal-confirm/         # Confirmation actions
│   ├── modal-quota/           # Dépassement quotas
│   ├── modal-ajout/           # Ajout tâche/récompense
│   ├── modal-category/        # Catégories
│   ├── modal-recompense/      # Récompenses
│   └── modal-personalization/ # Personnalisation
├── card/               # Cartes métier
│   ├── base-card/     # Carte base
│   ├── edition-card/  # Carte édition
│   └── tableau-card/  # Carte tableau
├── dnd/                # Drag & drop (@dnd-kit wrappers)
│   ├── DndCard/
│   ├── DndSlot/
│   ├── DndGrid/
│   └── useDndGrid.ts
├── forms/              # Formulaires métier
│   └── ItemForm/
├── feature-gate/       # Limitation features par rôle
├── protected-route/    # Protection routes auth
├── signed-image/       # Images signées Supabase Storage
├── demo-signed-image/  # Images démo visiteurs
├── quota-indicator/    # Indicateurs quotas utilisateur
├── image-quota-indicator/
├── account-status-badge/
├── avatar-profil/
├── dropdown/
├── edition-list/
├── error-boundary/
├── global-loader/
├── initialization-loader/
├── input-with-validation/
├── lang-selector/
├── layout/             # Layout réutilisable (pas global)
├── page-transition/
├── search-input/
├── separator/
├── theme-toggle/
└── web-vitals/
```

**Règles** :

- ✅ **Peuvent importer** : `ui/` uniquement
- ❌ **JAMAIS importer** : `features/` ou `layout/`
- ✅ **Contiennent** : Logique métier **légère** (quotas, auth, storage)
- ✅ **Réutilisables** : Dans plusieurs features
- ✅ **Responsabilité** : Composants business transverses

**Exemples** :

- `shared/Modal` - Modale réutilisable avec overlay, fermeture ESC
- `shared/FeatureGate` - Limiter feature par rôle (`<FeatureGate role="abonne">`)
- `shared/SignedImage` - Image avec URL signée Supabase Storage (sécurité)
- `shared/DndCard` - Carte draggable wrapper `@dnd-kit` (réutilisable)

**Pourquoi cette catégorie** :

- Évite duplication code entre features
- Logique métier légère partagée
- Plus spécialisé que `ui/` mais moins que `features/`

---

### 4. ui/ - Primitives Pures (Design System)

**Définition** : Composants UI **sans logique métier** (purement présentationnels).

**Structure** :

```
ui/
├── button/          # Button, ButtonClose, ButtonDelete
├── input/           # Input générique
├── select/          # Select dropdown
├── select-with-image/
├── checkbox/        # Checkbox
├── loader/          # Spinner loader
├── toast/           # Notifications toast
├── image-preview/
├── floating-pencil/
├── password-checklist/
└── upload-progress/
```

**Règles** :

- ❌ **ZÉRO logique métier** (pas de hooks Supabase, contextes métier)
- ❌ **ZÉRO import** autres catégories (features/layout/shared)
- ✅ **Props génériques** : `label`, `onClick`, `disabled`, `value`, `onChange`
- ✅ **Styles tokens SCSS** : Uniquement fonctions tokens (`color()`, `spacing()`)
- ✅ **Responsabilité** : Composants UI réutilisables bruts

**Exemples** :

- `ui/Button` - Bouton générique stylé (variant, size, disabled)
- `ui/Input` - Input contrôlé React avec validation visuelle
- `ui/Loader` - Spinner loading animé

**Pourquoi cette catégorie** :

- Design system cohérent
- Composants testables isolément
- Pas de couplage logique métier

**Antipattern ❌** :

```typescript
// ❌ INTERDIT dans ui/ - Logique métier
import { useAccountStatus } from '@/hooks'

export default function Button() {
  const { canCreateTask } = useAccountStatus() // Logique métier

  return <button disabled={!canCreateTask}>Créer</button>
}
```

**Solution** : Déplacer dans `shared/` ou `features/`

---

## 🗂️ Pattern Dossier Composant

**OBLIGATOIRE** : Chaque composant = dossier avec `.tsx` + `.scss`

```
composant-exemple/
├── ComposantExemple.tsx    # Composant React
├── ComposantExemple.scss   # Styles SCSS BEM-lite
└── index.ts                # Barrel export (optionnel)
```

**Exemple concret - Modal** :

```
shared/modal/
├── Modal.tsx               # Composant principal modale
├── Modal.scss              # Styles modale base
├── modal-confirm/
│   ├── ModalConfirm.tsx
│   └── ModalConfirm.scss
├── modal-quota/
│   ├── ModalQuota.tsx
│   └── ModalQuota.scss
├── modal-ajout/
│   ├── ModalAjout.tsx
│   └── ModalAjout.scss
└── index.ts                # Export tous modales
```

**Règles** :

- ✅ Un composant = un dossier (pas fichier isolé)
- ✅ Nom fichier = Nom composant (PascalCase)
- ✅ `.scss` avec même nom que `.tsx`
- ✅ `index.ts` optionnel pour barrel exports

---

## 🎨 SCSS BEM-lite (Conventions)

**Méthodologie** : BEM simplifié (Block Element Modifier)

### Pattern Standard

```scss
.block {
  // Block (composant principal)
  &__element {
    // Element (partie du block)
    &--modifier {
      // Modifier (variante element)
    }
  }

  &--modifier {
    // Modifier (variante block)
  }
}
```

### Exemple Concret - TacheCard

```scss
// TacheCard.scss
.tache-card {
  background: surface('card');
  padding: spacing('4');
  border-radius: radius('md');
  @include safe-transition(transform box-shadow);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: spacing('2');
  }

  &__title {
    font-size: font-size('lg');
    font-weight: font-weight('semibold');
    color: text('primary');
  }

  &__description {
    font-size: font-size('sm');
    color: text('secondary');
    line-height: line-height('relaxed');
  }

  &__actions {
    display: flex;
    gap: spacing('2');
    margin-top: spacing('3');
  }

  // Modifier - Tâche complétée
  &--completed {
    opacity: 0.6;

    .tache-card__title {
      text-decoration: line-through;
      color: text('muted');
    }
  }

  // Modifier - Tâche urgente
  &--urgent {
    border-left: border-width('thick') solid semantic('error');

    .tache-card__title {
      color: semantic('error');
    }
  }

  // État hover (TSA-friendly)
  &:hover {
    transform: translateY(-2px);
    box-shadow: shadow('md');
  }

  // État focus (accessibilité clavier)
  &:focus-visible {
    @include focus-visible;
  }
}
```

### Règles CRITIQUES

**TOUJOURS utiliser tokens** :

- ✅ `color()`, `surface()`, `text()`, `semantic()` - Couleurs
- ✅ `spacing()` - Margin, padding, gap
- ✅ `size()` - Width, height, min-height
- ✅ `font-size()`, `font-weight()`, `line-height()` - Typographie
- ✅ `radius()` - Border-radius
- ✅ `shadow()` - Box-shadow
- ✅ `border-width()` - Border
- ✅ `@include safe-transition()` - Transitions
- ✅ `@include respond-to()` - Media queries

**JAMAIS valeurs hardcodées** :

- ❌ `16px`, `2rem`, `#FFB3BA`, `rgba(255, 179, 186, 0.5)`
- ❌ `var(--color-primary)` (utiliser fonctions tokens)
- ❌ `lighten()`, `darken()`, `color.adjust()` (manipulations couleurs)

**Nommage** :

- ✅ kebab-case (`.tache-card`, pas `.tacheCard` ou `.TacheCard`)
- ✅ BEM-lite : Block, Element (`__`), Modifier (`--`)
- ✅ Noms descriptifs (`.tache-card__title`, pas `.title`)

**Imbrication** :

- ✅ Max 3 niveaux (lisibilité)
- ✅ Utiliser `&` pour chaînage (`.block { &__element {} }`)

### Validation SCSS

```bash
# Détecter valeurs hardcodées
pnpm lint:hardcoded

# Compiler SCSS
pnpm build:css

# Vérification complète
pnpm verify:css  # lint:hardcoded + validate:touch-targets + build:css
```

---

## ♿ Accessibilité TSA (WCAG 2.2 AA)

**CRITIQUE** : Application pour **enfants autistes** - Design apaisant et prévisible.

### 🎬 Animations (Max 0.3s ease)

**Règles** :

- ✅ **Durée max 0.3s** (animations douces, pas brusques)
- ✅ **Easing** : `ease` ou `ease-in-out` uniquement
- ❌ **Jamais** : `linear`, `bounce`, `elastic`, effets brusques
- ✅ **Respecter** : `prefers-reduced-motion` (hook `useReducedMotion()`)

**Pattern Correct** :

```scss
// ✅ CORRECT - Animation douce TSA-friendly
.card {
  @include safe-transition(transform opacity);
  // Génère : transition: transform 0.3s ease, opacity 0.3s ease
}

// ✅ CORRECT - Respecter prefers-reduced-motion
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
```

**Antipatterns** :

```scss
// ❌ INTERDIT - Trop rapide
.card {
  transition: all 0.1s linear;
}

// ❌ INTERDIT - Easing brusque
.card {
  animation: bounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

// ❌ INTERDIT - Trop long
.card {
  transition: transform 1s ease; // > 0.3s
}
```

**Validation** :

```typescript
import { useReducedMotion } from '@/hooks'

function AnimatedCard() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
    >
      Contenu
    </motion.div>
  )
}
```

---

### 🎨 Couleurs & Contraste

**Règles WCAG 2.2 AA** :

- ✅ **Contraste minimum 4.5:1** pour texte normal
- ✅ **Contraste minimum 3:1** pour composants UI (boutons, borders)
- ✅ **Palette pastel apaisante** (tokens `color()` déjà conformes)

**Pattern Correct** :

```scss
// ✅ CORRECT - Tokens avec contrastes validés
.text {
  color: text('primary'); // Contraste 7:1 sur surface('body')
  background: surface('card'); // Contraste 1.5:1 avec surface('body')
}

.button {
  background: color('primary'); // Contraste 3.2:1 avec texte blanc
  color: color('white');
}
```

**Antipatterns** :

```scss
// ❌ INTERDIT - Hardcode + contraste faible
.text {
  color: #ffb3ba; // Contraste 2.1:1 (insuffisant)
  background: #fff5f5;
}

// ❌ INTERDIT - Couleurs non testées
.button {
  background: lighten(#ffb3ba, 20%); // Manipulation couleur = contraste inconnu
}
```

**Validation** :

- Utiliser **outils contraste** : WebAIM Contrast Checker, Chrome DevTools
- Tokens `color()` pré-validés WCAG 2.2 AA
- Commande : `pnpm validate:touch-targets` (inclut vérification contraste)

---

### 🎯 ARIA & Navigation Clavier

**Règles** :

- ✅ `aria-label` sur boutons icônes (pas de texte visible)
- ✅ `aria-hidden="true"` sur icônes décoratives
- ✅ `role` approprié (`button`, `dialog`, `alert`)
- ✅ Tab order logique (pas de `tabindex > 0`)
- ✅ Focus visible avec `@include focus-visible`

**Pattern Correct** :

```typescript
// ✅ CORRECT - ARIA complet
<button
  aria-label="Supprimer la tâche"
  aria-pressed={isActive}
  onClick={handleDelete}
>
  <TrashIcon aria-hidden="true" />
</button>

// ✅ CORRECT - Modale accessible
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <h2 id="modal-title">Confirmer la suppression</h2>
  <p>Êtes-vous sûr ?</p>
</div>

// ✅ CORRECT - Focus visible
.button {
  &:focus-visible {
    @include focus-visible; // Génère outline visible
  }
}
```

**Antipatterns** :

```typescript
// ❌ INTERDIT - Pas de label
<button onClick={handleDelete}>
  <TrashIcon />
</button>

// ❌ INTERDIT - tabindex > 0 (casse ordre naturel)
<button tabIndex={5}>Valider</button>

// ❌ INTERDIT - Pas de focus visible
.button {
  &:focus {
    outline: none; // Désactive focus clavier
  }
}
```

**Navigation clavier** :

- ✅ `Tab` : Navigation éléments interactifs
- ✅ `Enter`/`Space` : Activer bouton
- ✅ `Escape` : Fermer modales (hook `useEscapeKey`)
- ✅ Flèches : Navigation listes/menus

---

### 📏 Cibles Tactiles (44×44px min)

**Règles WCAG 2.5.5** :

- ✅ **Min 44×44px** pour tous éléments interactifs (boutons, liens, inputs)
- ✅ **Espacement 8px** entre cibles adjacentes
- ✅ Validation automatique : `pnpm validate:touch-targets`

**Pattern Correct** :

```scss
// ✅ CORRECT - Taille tactile suffisante
.button {
  min-width: size('44'); // 44px
  min-height: size('44'); // 44px
  padding: spacing('2'); // 8px
  gap: spacing('2'); // 8px entre icône et texte
}

// ✅ CORRECT - Icône cliquable
.icon-button {
  width: size('44');
  height: size('44');
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Antipatterns** :

```scss
// ❌ INTERDIT - Trop petit pour enfants
.button {
  width: 32px; // < 44px
  height: 32px;
}

// ❌ INTERDIT - Hardcode taille
.button {
  width: 40px; // Hardcode + insuffisant
  height: 40px;
}
```

**Validation** :

```bash
pnpm validate:touch-targets  # Détecte cibles < 44×44px
```

---

### 🔊 Feedback Utilisateur

**Règles TSA-friendly** :

- ✅ **Feedback visuel immédiat** : Hover, focus, active states
- ✅ **Messages clairs et courts** : Toasts, erreurs explicites
- ✅ **Pas de surprises** : Actions prévisibles, confirmations
- ✅ **Sons optionnels** : Hook `useAudioContext` (désactivable)

**Pattern Correct** :

```scss
// ✅ CORRECT - États visuels clairs
.button {
  background: color('primary');

  &:hover {
    background: color('primary-hover'); // Feedback hover
  }

  &:active {
    transform: scale(0.98); // Feedback clic
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed; // Feedback disabled
  }
}
```

---

## 🔄 Server vs Client Components

**CRITIQUE** : Ajouter `'use client'` **UNIQUEMENT** si nécessaire

### Quand utiliser `'use client'`

**3 cas obligatoires** :

1. **Hooks React** : `useState`, `useEffect`, `useContext`, `useRef`, `useReducer`
2. **Event handlers** : `onClick`, `onChange`, `onSubmit`, `onKeyDown`
3. **Browser APIs** : `window`, `localStorage`, `document`, `navigator`

**Pattern Correct** :

```typescript
// ✅ CORRECT - 'use client' nécessaire (hooks + events)
'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0) // Hook React

  return (
    <button onClick={() => setCount(c => c + 1)}> {/* Event handler */}
      Compteur : {count}
    </button>
  )
}
```

```typescript
// ✅ CORRECT - Server Component (pas 'use client')
import type { ReactNode } from 'react'

interface CardProps {
  title: string
  children: ReactNode
}

export default function StaticCard({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  )
}
```

**Antipatterns** :

```typescript
// ❌ INTERDIT - 'use client' inutile
'use client'

export default function StaticCard({ title }: { title: string }) {
  return <div className="card">{title}</div> // Pas d'interactivité
}
```

### Règles

- ✅ **Server Component par défaut** (performance Next.js)
- ✅ `'use client'` **seulement si interactivité**
- ❌ **Jamais** `'use client'` sur composants statiques
- ✅ **Minimiser** composants Client (isoler interactivité)

**Exemple isolation interactivité** :

```typescript
// ✅ CORRECT - Isoler interactivité dans sous-composant
// Card.tsx (Server Component)
import { ClientButton } from './ClientButton'

export default function Card({ title }: { title: string }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <ClientButton /> {/* Seul ce composant est Client */}
    </div>
  )
}

// ClientButton.tsx (Client Component)
'use client'
import { useState } from 'react'

export function ClientButton() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

---

## 📦 Barrel Exports (index.ts)

**Fichier racine** : `src/components/index.ts`

**Structure** : Exports groupés par catégorie

```typescript
// ========================================
// FEATURES - Domaines métier
// ========================================

// Taches
export { default as TachesDnd } from './features/taches/taches-dnd/TachesDnd'
export { default as TachesEdition } from './features/taches/taches-edition/TachesEdition'
export { default as TrainProgressBar } from './features/taches/train-progress-bar/TrainProgressBar'

// Time Timer
export { default as TimeTimer } from './features/time-timer/TimeTimer'
export { default as FloatingTimeTimer } from './features/time-timer/FloatingTimeTimer'

// Recompenses
export { default as RecompensesEdition } from './features/recompenses/recompenses-edition/RecompensesEdition'

// Admin
export { default as MetricsDashboard } from './features/admin/MetricsDashboard'
export { default as QuotaManagement } from './features/admin/QuotaManagement'

// ========================================
// LAYOUT - Composants de structure
// ========================================

export { default as Navbar } from './layout/navbar/Navbar'
export { default as Footer } from './layout/footer/Footer'
export { default as UserMenu } from './layout/user-menu/UserMenu'
export { default as SettingsMenu } from './layout/settings-menu/SettingsMenu'

// ========================================
// SHARED - Composants réutilisables métier
// ========================================

// Modals
export { default as Modal } from './shared/modal/Modal'
export { default as ModalConfirm } from './shared/modal/modal-confirm/ModalConfirm'
export { default as ModalQuota } from './shared/modal/modal-quota/ModalQuota'

// Cards
export { default as BaseCard } from './shared/card/base-card/BaseCard'
export { default as EditionCard } from './shared/card/edition-card/EditionCard'

// DnD
export { DndCard, DndSlot, DndGrid, useDndGrid } from './shared/dnd'
export type { DndCardProps, DndSlotProps } from './shared/dnd'

// Feature Gates
export {
  FeatureGate,
  PremiumFeatureGate,
} from './shared/feature-gate/FeatureGate'

// Images
export { default as SignedImage } from './shared/signed-image/SignedImage'

// ========================================
// UI - Primitives UI pures
// ========================================

export { default as Button } from './ui/button/Button'
export { default as Input } from './ui/input/Input'
export { default as Select } from './ui/select/Select'
export { default as Checkbox } from './ui/checkbox/Checkbox'
export { default as Loader } from './ui/loader/Loader'
export { default as Toast } from './ui/toast/Toast'
```

**Utilisation** :

```typescript
// ✅ CORRECT - Import groupé depuis barrel
import {
  Modal,
  Button,
  TachesDnd,
  SignedImage,
  FeatureGate,
} from '@/components'

// ❌ ÉVITER - Imports individuels multiples
import Modal from '@/components/shared/modal/Modal'
import Button from '@/components/ui/button/Button'
import TachesDnd from '@/components/features/taches/taches-dnd/TachesDnd'
```

**Avantages barrel exports** :

- ✅ Imports simplifiés et groupés
- ✅ Abstraction structure interne
- ✅ Auto-complétion IDE améliorée
- ✅ Refactoring facilité (changement paths)

---

## ⚠️ Antipatterns à Éviter

### ❌ Import Entre Features

```typescript
// ❌ INTERDIT - Feature importe autre feature
// Dans features/recompenses/RecompensesEdition.tsx
import TacheCard from '@/components/features/taches/TacheCard'
```

**Pourquoi interdit** :

- Couplage entre domaines métier
- Maintenance difficile (chaîne dépendances)
- Réutilisation impossible isolément

**Solution** : Extraire composant commun dans `shared/`

```typescript
// ✅ CORRECT - Extraire dans shared/
// shared/card/ItemCard.tsx (générique)
export default function ItemCard({ item }: { item: Tache | Recompense }) {
  return <div className="item-card">{item.titre}</div>
}

// Utiliser dans les deux features
import { ItemCard } from '@/components'
```

---

### ❌ Logique Métier dans ui/

```typescript
// ❌ INTERDIT - Logique métier dans ui/
// Dans ui/button/Button.tsx
import { useAccountStatus } from '@/hooks'

export default function Button({ children }: { children: ReactNode }) {
  const { canCreateTask } = useAccountStatus() // Logique métier

  return <button disabled={!canCreateTask}>{children}</button>
}
```

**Pourquoi interdit** :

- `ui/` = primitives pures (ZÉRO logique métier)
- Couplage composant UI à règles business
- Tests difficiles (besoin mock hooks métier)

**Solution** : Déplacer dans `shared/` ou `features/`

```typescript
// ✅ CORRECT - Créer composant shared/
// shared/create-task-button/CreateTaskButton.tsx
import { useAccountStatus } from '@/hooks'
import { Button } from '@/components'

export default function CreateTaskButton() {
  const { canCreateTask } = useAccountStatus()

  return (
    <Button disabled={!canCreateTask}>
      Créer tâche
    </Button>
  )
}
```

---

### ❌ Valeurs Hardcodées SCSS

```scss
// ❌ INTERDIT - Hardcodes
.card {
  margin: 16px; // Hardcode spacing
  padding: 12px 20px; // Hardcode spacing
  background: #ffb3ba; // Hardcode couleur
  border-radius: 8px; // Hardcode radius
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); // Hardcode shadow
}

// ✅ CORRECT - Tokens
.card {
  margin: spacing('4');
  padding: spacing('3') spacing('5');
  background: color('primary');
  border-radius: radius('md');
  box-shadow: shadow('md');
}
```

**Validation** :

```bash
pnpm lint:hardcoded  # Détecte hardcodes automatiquement
```

---

### ❌ 'use client' Inutile

```typescript
// ❌ INTERDIT - 'use client' sur composant statique
'use client'

export default function Card({ title }: { title: string }) {
  return <div className="card">{title}</div> // Aucune interactivité
}

// ✅ CORRECT - Server Component
export default function Card({ title }: { title: string }) {
  return <div className="card">{title}</div>
}
```

---

### ❌ Props Non Typées

```typescript
// ❌ INTERDIT - Props any
export default function Card({ title, children }) {
  return <div>{title}</div>
}

// ✅ CORRECT - Props typées
interface CardProps {
  title: string
  children?: ReactNode
}

export default function Card({ title, children }: CardProps) {
  return <div>{title}</div>
}
```

---

## 🧪 Testing Composants

### Tests Unitaires (Vitest)

```typescript
// TacheCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TacheCard from './TacheCard'

const mockTache = {
  id: '1',
  titre: 'Tâche test',
  completed: false,
}

describe('TacheCard', () => {
  it('doit afficher le titre de la tâche', () => {
    render(<TacheCard tache={mockTache} />)

    expect(screen.getByText('Tâche test')).toBeInTheDocument()
  })

  it('doit appliquer classe completed si tâche complétée', () => {
    render(<TacheCard tache={{ ...mockTache, completed: true }} />)

    const card = screen.getByText('Tâche test').closest('.tache-card')
    expect(card).toHaveClass('tache-card--completed')
  })
})
```

### Tests Interactions (userEvent)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button'

describe('Button', () => {
  it('doit appeler onClick au clic', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Cliquer</Button>)

    await user.click(screen.getByText('Cliquer'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('ne doit pas appeler onClick si disabled', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick} disabled>Cliquer</Button>)

    await user.click(screen.getByText('Cliquer'))

    expect(handleClick).not.toHaveBeenCalled()
  })
})
```

---

## 📚 Références

### Documentation Interne

- **CLAUDE.md global** : Sections "Structure Composants", "Conventions Nommage", "Design System"
- **`src/styles/CLAUDE.md`** : Tokens SCSS complets, fonctions, mixins
- **`src/hooks/CLAUDE.md`** : Hooks custom à utiliser dans composants

### Fichiers Clés

- **`src/components/index.ts`** : Barrel exports (tous composants)
- **`src/styles/abstracts/_variables.scss`** : Tokens centralisés
- **`src/styles/abstracts/_mixins.scss`** : Mixins accessibilité

### Exemples Référence

**Features** :

- `features/taches/TachesDnd` - Drag & drop complexe
- `features/time-timer/TimeTimer` - useReducer + localStorage

**Shared** :

- `shared/modal/Modal` - Système modal complet
- `shared/dnd/DndCard` - Wrapper @dnd-kit réutilisable

**UI** :

- `ui/button/Button` - Primitive pure typique
- `ui/input/Input` - Input contrôlé avec validation

---

## ✅ Checklist Création Composant

Avant de créer un nouveau composant :

- [ ] **Déterminer catégorie** : features/ ? shared/ ? ui/ ? layout/ ?
- [ ] **Vérifier dépendances** : Respecte règles imports (ui → shared → features) ?
- [ ] **Pattern dossier** : Créer dossier avec `.tsx` + `.scss`
- [ ] **Types props** : Interface `[Nom]Props` avec types stricts
- [ ] **SCSS tokens** : Utiliser fonctions tokens, ZÉRO hardcode
- [ ] **BEM-lite** : Nommage `.block__element--modifier`
- [ ] **Accessibilité** : ARIA, focus, contraste, cibles tactiles 44×44px
- [ ] **Animations TSA** : Max 0.3s ease, respecter `prefers-reduced-motion`
- [ ] **'use client'** : Ajouter SEULEMENT si hooks/events/browser APIs
- [ ] **Barrel export** : Ajouter à `src/components/index.ts`
- [ ] **Tests** : Créer fichier `.test.tsx` (render + assertions)

---

## 🎯 Commandes Utiles

```bash
# Validation SCSS
pnpm lint:hardcoded        # Détecter hardcodes
pnpm build:css             # Compiler SCSS
pnpm verify:css            # Vérification complète

# Validation Accessibilité
pnpm validate:touch-targets # Cibles tactiles < 44×44px

# Tests Composants
pnpm test                  # Mode watch
pnpm test:coverage         # Avec couverture
pnpm test ui/              # Tests ui/ uniquement

# Build & Type-check
pnpm build                 # Build production
pnpm type-check            # Vérifier TypeScript
```

---

**Dernière mise à jour** : Janvier 2026
**Version Appli-Picto** : Next.js 16, React 19, SCSS BEM-lite, WCAG 2.2 AA
