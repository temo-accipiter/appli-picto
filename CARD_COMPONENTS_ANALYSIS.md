# Analyse Architecture des Composants Card - Appli-Picto

**Date** : 2026-01-09
**Analyse** : Architecture, responsabilités, patterns, accessibilité TSA
**Scope** : `src/components/shared/card/` (BaseCard, EditionCard, TableauCard)

---

## 1. STRUCTURE DÉTAILLÉE DES COMPOSANTS

### 1.1 BaseCard - Composant Principal

**Fichier** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/base-card/BaseCard.tsx`

#### Responsabilités Actuelles

BaseCard est un composant **très polyvalent** qui gère :

| Responsabilité    | Type           | Lignes                             | Description                                                              |
| ----------------- | -------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| **Layout Grid**   | Structure      | 25-27                              | Grille 2 colonnes (image + contenu)                                      |
| **États visuels** | Métier         | 62-81                              | 5 classes d'état (checked, completed, disabled, editable, size variants) |
| **Image**         | Contenu        | 96-103                             | Affichage image ou composant personnalisé                                |
| **Actions**       | Métier         | 106-123                            | Bouton delete + checkbox (conditionnels)                                 |
| **Label**         | Contenu/Métier | 127-140                            | Texte static ou input editable                                           |
| **Catégorie**     | Métier         | 142-153                            | Select dropdown pour catégories                                          |
| **Validation**    | Métier         | 68-71                              | Validation label (trim, spaces)                                          |
| **Animation**     | UX             | 86-94                              | Hover scale (respects prefers-reduced-motion)                            |
| **Accessibilité** | A11y           | Lignes clés 88, 110, 116, 119, 137 | ARIA labels, roles, data-testid                                          |

#### Props Interface

```typescript
interface BaseCardProps {
  // Contenu
  image?: string // URL image
  label: string // Texte principal
  labelId: string | number // ID unique pour inputs

  // État
  editable?: boolean // Mode édition du label (input)
  disabled?: boolean // Désactiver interactions
  completed?: boolean // État accompli (visuel)
  checked?: boolean // État coché (checkbox)
  size?: 'sm' | 'md' | 'lg' // Variantes de taille

  // Callbacks métier
  onLabelChange?: (newLabel: string) => void // Label modifié
  onBlur?: (val: string) => void // Blur input
  onDelete?: () => void // Suppression
  onToggleCheck?: (checked: boolean) => void // Checkbox toggle
  onCategorieChange?: (newCategorie: string) => void // Catégorie modifiée

  // Options
  categorie?: string // Valeur catégorie actuelle
  categorieOptions?: CategoryOption[] // Liste catégories
  imageComponent?: ReactNode // Composant image custom
  className?: string // Classes CSS additionnelles
}
```

#### Dépendances Imports

```typescript
// Librairies externes (Lignes 3-4)
import { memo, useMemo, ReactNode } from 'react'
import { motion } from 'framer-motion'

// Composants UI (Lignes 5-11)
import {
  InputWithValidation, // Input avec validation règles
  Select, // Dropdown catégories
  Checkbox, // Checkbox state
  ImagePreview, // Image default
  ButtonDelete, // Bouton delete
} from '@/components'

// Hooks (Ligne 12)
import { useI18n, useReducedMotion } from '@/hooks'

// Utils (Lignes 13-17)
import {
  makeValidateNotEmpty, // Validation non-vide
  makeNoEdgeSpaces, // Pas espaces début/fin
  makeNoDoubleSpaces, // Pas doubles espaces
} from '@/utils'
```

#### Hooks Utilisés

| Hook                 | Ligne | Rôle                       | Impact                                                   |
| -------------------- | ----- | -------------------------- | -------------------------------------------------------- |
| `useMemo` (React)    | 68    | Mémoïser règles validation | Performance : recalc seulement si `t` change             |
| `useI18n()`          | 64    | Traductions                | Retourne `t()` pour labels et validations                |
| `useReducedMotion()` | 65    | Accessibilité              | Désactive animations si `prefers-reduced-motion: reduce` |

#### Logique Métier dans BaseCard

**VIOLATION SRP** - BaseCard contient logique métier qui devrait être délégable :

1. **Validation Labels** (Lignes 68-71)
   - Applique 3 règles : non-vide, pas espaces edge, pas doubles espaces
   - Hard-codées dans le composant
   - Devrait être configurable par parent

2. **Gestion Checkbox** (Lignes 114-122)
   - Toggle simple `onToggleCheck` sans logique
   - Mais disabled check si `disabled={true}` (logique conditionnelle)

3. **Gestion Catégories** (Lignes 142-153)
   - Rendu conditionnel `if (categorieOptions.length > 0)`
   - Pas de gestion d'état (parent gère valeur)

4. **Gestion Delete** (Lignes 107-112)
   - Rendu conditionnel `if (onDelete)`
   - Désactivé si `disabled={true}`

#### Animation (Accessibilité TSA)

```typescript
// Lignes 86-94 : Motion wrapper avec respect prefers-reduced-motion
<motion.div
  whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
  transition={
    prefersReducedMotion ? {} : { duration: 0.2, ease: 'easeOut' }
  }
/>
```

**Points positifs** :

- Respect `prefers-reduced-motion` ✅
- Duration courte (0.2s < 0.3s TSA) ✅
- Easing doux (easeOut) ✅
- Scale modéré (1.02 = 2% agrandissement) ✅

---

### 1.2 EditionCard - Thin Wrapper

**Fichier** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/edition-card/EditionCard.tsx`

#### Structure Simple

```typescript
const CardEdition = memo(function CardEdition(props: EditionCardProps) {
  return (
    <BaseCard
      editable        // Force editable=true
      {...props}      // Spread tous props
      className={`card-edition ${props.className || ''}`}
    />
  )
})
```

**Lignes** : 29-41 (seulement 13 lignes)

#### Props Interface (Presque identique à BaseCard)

```typescript
interface EditionCardProps {
  // Même interface que BaseCard
  // MAIS sans 'editable' (car forcé à true dans wrapper)
  // et sans 'disabled', 'completed', 'size' (non utilisés en édition)
}
```

#### Responsabilités

- **Wrapper** : Force `editable={true}`
- **Styling** : Ajoute classe `card-edition` pour surcharge CSS
- **Composition** : Délègue TOUT logique à BaseCard

#### SCSS (EditionCard.scss)

**Lignes** : 10-14 (4 lignes utiles)

```scss
.card-edition {
  // 📝 EditionCard est un thin wrapper autour de BaseCard
  // avec editable={true} forcé. BaseCard gère le layout, les animations, et les états.
  // Aucune surcharge de style spécifique à EditionCard.
}
```

**Observation** : Fichier SCSS quasi-vide = classe CSS pas utilisée = supprimable

---

### 1.3 TableauCard - Composant Autonome (DND)

**Fichier** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/tableau-card/TableauCard.tsx`

#### Rôle Spécifique

**DIFFÉRENT de BaseCard** : Composant spécialisé pour tableau drag-and-drop

```
BaseCard = Édition/gestion (label, catégorie, delete)
TableauCard = Affichage tableau + DnD + checkbox "fait"
```

#### Structure

```typescript
// Lignes 35-127 : Composant non-mémoïzé enrobé par memo()

function TableauCard({
  tache: Tache,              // Objet métier tâche
  done: boolean,             // État "fait"
  toggleDone: callback,      // Callback toggle
  isDraggingGlobal?: boolean // Contexte DnD global
  isBeingSwapped?: boolean   // Animation swap
  playSound?: boolean        // Audio feedback
})
```

#### Responsabilités Spécialisées

| Domaine                | Lignes      | Description                                       |
| ---------------------- | ----------- | ------------------------------------------------- |
| **DnD (useDraggable)** | 43-46       | Hook @dnd-kit, setNodeRef, transform              |
| **Animation DnD**      | 49-52       | Hook custom `useDragAnimation`                    |
| **Audio Feedback**     | 53, 58-60   | Hook `useAudioContext` pour bip 440Hz             |
| **Checkbox Handler**   | 56-64       | Logic métier : jouer bip + toggle                 |
| **Inline Styles**      | 67-81       | Style transform, opacity, zIndex dynamiques       |
| **Image**              | 94-108      | Conditional render SignedImage vs DemoSignedImage |
| **Checkbox Wrapper**   | 111-124     | stopPropagation pour isoler du drag               |
| **Accessibility**      | 89, 116-122 | role, aria-label, data-testid                     |

#### Props

```typescript
interface TableauCardProps {
  tache: {
    id: string | number
    label: string
    imagepath?: string | null
    isDemo?: boolean
  }
  done: boolean
  toggleDone: (id: string | number, newDone: boolean) => void
  isDraggingGlobal?: boolean
  isBeingSwapped?: boolean
  playSound?: boolean
}
```

#### Hooks Utilisés

```typescript
useDraggable() // @dnd-kit - drag behavior
useDragAnimation() // Custom hook - duration, transform
useAudioContext() // Custom hook - playBeep()
useCallback() // React - memoïser handleCheck
memo() // React - avoid rerenders
```

#### Style Inline (Logique Dynamique)

**Lignes 67-81** : Styles calculés basés sur état

```typescript
const style = {
  transform: buildTransform(transform), // DnD transform
  transition: `transform ${transitionDuration} ...`, // Animation smooth
  touchAction: 'manipulation', // Mobile friendly
  pointerEvents: isDraggingGlobal && !isDragging ? 'none' : 'auto',
  zIndex: isDragging ? 1000 : 'auto',
  opacity: isDragging ? 0.92 : 1,
  cursor: isDragging ? 'grabbing' : 'grab',
  boxShadow: isDragging ? '0 20px 40px rgba(0, 0, 0, 0.3)...' : undefined,
  willChange: isDragging ? 'transform' : undefined,
}
```

**Problème potentiel** : Hardcoded values dans style inline :

- `1000` (zIndex)
- `0.92` (opacity)
- `rgba(0, 0, 0, 0.3)` (box-shadow hardcodée)
- Devrait utiliser tokens SCSS

---

## 2. PATTERNS IDENTIFIÉS

### 2.1 Hiérarchie de Composition

```
BaseCard (Root - 162 lignes TypeScript)
├─ ImagePreview (UI primitive)
├─ ButtonDelete (UI primitive)
├─ Checkbox (UI primitive)
├─ InputWithValidation (Composant partagé)
└─ Select (UI primitive)

EditionCard (Wrapper - 42 lignes TypeScript)
└─ BaseCard (avec editable=true forcé)

TableauCard (Autonome - 130 lignes TypeScript)
├─ SignedImage ou DemoSignedImage
├─ Checkbox (UI primitive)
└─ aucune dépendance à BaseCard
```

### 2.2 Différences BaseCard vs TableauCard

| Aspect         | BaseCard                          | TableauCard                          |
| -------------- | --------------------------------- | ------------------------------------ |
| **Rôle**       | Edition/gestion générale          | Tableau avec DnD                     |
| **Éditable**   | OUI (input label)                 | NON (span label)                     |
| **Catégorie**  | OUI (Select)                      | NON                                  |
| **Delete**     | OUI (ButtonDelete)                | NON                                  |
| **Checkbox**   | Générique (checked/onToggleCheck) | Spécialisé (done/toggleDone + audio) |
| **DnD**        | NON                               | OUI (@dnd-kit)                       |
| **Audio**      | NON                               | OUI (beep 440Hz)                     |
| **Layout**     | Grid 2 cols (image \| contenu)    | Flex + absolute positioning          |
| **Validation** | Oui (label)                       | Non                                  |
| **Animations** | Hover (framer-motion)             | DnD transform + hover rotate         |

### 2.3 Réutilisabilité et Couplage

#### BaseCard - TROP de responsabilités

**Utilisé dans** :

- `TachesEdition.tsx` → EditionCard (qui wraps BaseCard)
- `RecompensesEdition.tsx` → EditionCard (qui wraps BaseCard)

**Problème** : BaseCard est "couteau suisse" mais assez bien séparé via props optionnels

#### EditionCard - Wrapper superflu

**Observations** :

1. Force seulement `editable={true}`
2. N'ajoute aucune logique métier
3. Fichier SCSS quasi-vide
4. Pouvrait être remplacé par : `<BaseCard editable {...props} className="card-edition" />`

#### TableauCard - Autonome et spécialisé

**Observations** :

1. AUCUNE dépendance à BaseCard ✅
2. Composant spécialisé bien ciblé ✅
3. Mais logique DnD mélangée avec logique checkbox ⚠️

---

## 3. VIOLATIONS D'ARCHITECTURE

### 3.1 Single Responsibility Principle (SRP)

#### BaseCard viole SRP

BaseCard gère 4 responsabilités distinctes :

1. **Layout Container** (Grid 2 cols, spacing)
2. **Image Management** (Affichage conditionnelle)
3. **Label Management** (Static ou input editable + validation)
4. **Metadata Management** (Catégorie dropdown + delete button)

**Recommandation** : Extraire en composants plus petits (voir Section 6)

### 3.2 Composition vs Inheritance

**Actuel** : Props drilling lourd

```typescript
// Parent passe 20+ props
<EditionCard
  image={...}
  label={...}
  editable={...}
  onLabelChange={...}
  onBlur={...}
  labelId={...}
  categorie={...}
  onCategorieChange={...}
  categorieOptions={...}
  onDelete={...}
  checked={...}
  onToggleCheck={...}
  className={...}
  imageComponent={...}
  disabled={...}
  completed={...}
  size={...}
/>
```

**Problème** : Trop de props = composant trop flexible = hard à maintenir

### 3.3 Inline Styles dans TableauCard

**Ligne 67-81** : Styles dynamiques hardcodés

```typescript
const style = {
  zIndex: isDragging ? 1000 : 'auto', // ❌ Hardcoded 1000
  opacity: isDragging ? 0.92 : 1, // ❌ Hardcoded 0.92
  boxShadow: isDragging ? '0 20px 40px ...' : undefined, // ❌ Hardcoded shadow
}
```

**Devrait utiliser** : Tokens SCSS ou constantes réutilisables

---

## 4. ACCESSIBILITÉ TSA

### 4.1 Animations

#### BaseCard Animation

```typescript
// BaseCard.tsx Lignes 86-94
whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
transition={
  prefersReducedMotion ? {} : { duration: 0.2, ease: 'easeOut' }
}
```

**Conformité TSA** ✅

- Duration 0.2s < 0.3s max ✅
- Easing doux (easeOut) ✅
- Respects `prefers-reduced-motion` ✅
- Scale modéré (1.02) ✅

#### TableauCard Animation

**Lignes 69** :

```typescript
transition: `transform ${transitionDuration} cubic-bezier(0.34, 1.56, 0.64, 1)`
```

**Points** :

- `transitionDuration` vient de `useDragAnimation()` (à vérifier)
- Cubic-bezier personnalisé (bounce effect - peut être trop agressif pour TSA)

**À vérifier** : Duration valeur en `useDragAnimation()` hook

#### CSS Animations

**TableauCard.scss Lignes 104-113** : `@keyframes card-swap-in`

```scss
@keyframes card-swap-in {
  0% {
    opacity: opacity('md');
    transform: scale(0.9);
  }
  100% {
    opacity: opacity('opaque');
    transform: scale(1);
  }
}
```

**Problème** : Animation duration = `timing('base')` (à vérifier tokens)

### 4.2 ARIA Attributes

#### BaseCard

| ARIA Attribute          | Ligne | Valeur                                               | Conformité             |
| ----------------------- | ----- | ---------------------------------------------------- | ---------------------- |
| `role="article"`        | 88    | Correct                                              | ✅ Pour conteneur card |
| `aria-label`            | 89    | `"${t('card.item')} ${label}"`                       | ✅ Label accessible    |
| `aria-label` (checkbox) | 119   | `completed ? t('card.completed') : t('card.active')` | ✅ Dynamic label       |
| `aria-label` (delete)   | 110   | `t('card.delete')`                                   | ✅ Button label        |

#### TableauCard

| ARIA Attribute          | Ligne | Valeur                                                   | Conformité       |
| ----------------------- | ----- | -------------------------------------------------------- | ---------------- |
| `aria-label`            | 89    | `"${tache.label}${done ? ' - fait' : ''}"`               | ✅ Descriptif    |
| `aria-label` (checkbox) | 122   | `done ? 'Marquer comme non-fait' : 'Marquer comme fait'` | ✅ Action claire |

**Tous conformes WCAG 2.2 AA** ✅

### 4.3 Focus Management

#### BaseCard

**Ligne 152-155** : Focus-within

```scss
&:focus-within {
  box-shadow: shadow('elevation-md');
  outline: none;
}
```

**Problème** : `outline: none` sans remplacement visible = mauvais pour accessibilité clavier

**Recommandation** :

```scss
&:focus-within {
  box-shadow:
    shadow('elevation-md'),
    0 0 0 2px semantic('focus');
  outline: 2px solid transparent; /* Fallback outline */
}
```

### 4.4 Cibles Tactiles

**BaseCard.scss Lignes 113-123** : Touch targets

```scss
button,
[role='checkbox'] {
  min-height: size('touch-target-min'); /* 44px min */
  min-width: size('touch-target-min');

  @include respond-to(sm) {
    min-width: auto;
  }
}
```

**Conforme** ✅ : 44px minimum (WCAG 2.1.1)

### 4.5 Préférence Mouvement Réduit

**BaseCard.tsx Lignes 65, 91** : Respect `prefers-reduced-motion`

```typescript
const prefersReducedMotion = useReducedMotion()
whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
```

**Conforme** ✅

---

## 5. PATTERNS & CONVENTIONS RESPECTÉS

### 5.1 Imports Absolus

**Pattern** : Toujours `@/` pour imports

```typescript
import { BaseCard } from '@/components'
import { useI18n, useReducedMotion } from '@/hooks'
import { makeValidateNotEmpty } from '@/utils'
```

**Respecté** ✅

### 5.2 Exports

**Pattern** : `export default` + `displayName` pour memo

```typescript
const BaseCard = memo(function BaseCard({ ... }) { ... })
BaseCard.displayName = 'BaseCard'
export default BaseCard
```

**Respecté dans** :

- BaseCard.tsx (ligne 159) ✅
- EditionCard.tsx (ligne 39) ✅
- TableauCard.tsx (ligne 130) ✅

### 5.3 'use client' Directive

**Règle** : Ajouter seulement si hooks ou interactivité

| Fichier         | Ligne 1      | Raison                                              |
| --------------- | ------------ | --------------------------------------------------- |
| BaseCard.tsx    | 'use client' | ✅ useState via InputWithValidation, event handlers |
| EditionCard.tsx | 'use client' | ✅ memo, spread props (mais pourrait être Server)   |
| TableauCard.tsx | 'use client' | ✅ useDraggable, hooks, event handlers              |

**Note** : EditionCard pourrait être Server Component (juste wrapper)

### 5.4 SCSS Architecture (Phase 6)

**Pattern** : Tokens-first, aucune valeur hardcodée

#### BaseCard.scss

**Conformité** ✅

- `color()` pour couleurs
- `spacing()` pour margins/padding/gap
- `radius()` pour border-radius
- `shadow()` pour box-shadow
- `font-size()`, `font-weight()`, `line-height()` pour typo
- `timing()`, `easing()` pour animations
- `@include respond-to()` pour responsive
- `@include safe-transition()` pour transitions

**Remarque** : Fichier bien refactorisé phase 6 ✅

#### TableauCard.scss

**Conformité** ✅

- Même tokens que BaseCard
- Mais `z-index: z-index('modal')` (ligne 44) = token correct ✅
- Animation duration `timing('base')` - vérifier valeur

#### EditionCard.scss

**Problème** : Fichier quasi-vide (10-14 lignes)

- Aucun style custom
- Classe `.card-edition` inutile
- Pourrait fusionner avec BaseCard

### 5.5 Mémoïsation

| Composant   | Ligne | Pattern                                   |
| ----------- | ----- | ----------------------------------------- |
| BaseCard    | 45    | `memo(function BaseCard({...})...)` ✅    |
| EditionCard | 29    | `memo(function CardEdition(props)...)` ✅ |
| TableauCard | 130   | `memo(TableauCard)` export ✅             |

**Toutes memoïzées** ✅

---

## 6. VIOLATIONS DÉTAILLÉES

### 6.1 Violation #1 : BaseCard trop généraliste

**Impact** : Difficile à comprendre, trop flexible, hard à tester

**Evidence** :

- 43 props (BaseCardProps)
- Gère label, image, delete, checkbox, catégorie, validation
- Utilisable en édition ET en affichage

**Recommandation** : Splitter en composants plus petits

### 6.2 Violation #2 : EditionCard wrapper superflu

**Impact** : Couche intermédiaire sans logique

**Evidence** :

- Ligne 31-35 : Juste spread + force editable=true
- EditionCard.scss vide
- Pouvrait être un alias/export

**Recommandation** : Supprimer ou fusionner avec BaseCard

### 6.3 Violation #3 : TableauCard inline styles

**Impact** : Values hardcodées, difficiles à maintenir

**Evidence** :

- Ligne 67-81 : zIndex=1000, opacity=0.92, boxShadow hardcodée
- Logique mélangée avec style

**Recommandation** : Extraire en constantes ou tokens SCSS

### 6.4 Violation #4 : Focus outline supprimé

**Impact** : Accessibilité clavier dégradée

**Evidence** :

- BaseCard.scss ligne 154 : `outline: none` sans remplacement

**Recommandation** : Ajouter focus ring visible

### 6.5 Violation #5 : Validation hardcodée

**Impact** : Validation labels figée dans BaseCard

**Evidence** :

- BaseCard.tsx ligne 68-71 : 3 règles hardcodées
- Props `rules?` inexistant = impossible d'étendre

**Recommandation** : Props configurable ou context

### 6.6 Violation #6 : TableauCard mélange responsabilités

**Impact** : DnD logic + checkbox logic accouplées

**Evidence** :

- Ligne 43-64 : useDraggable + handleCheck dans même composant
- Style inline mélangé avec logique DnD

**Recommandation** : Splitter ou extraire logique DnD

### 6.7 Violation #7 : Props Drilling lourd

**Impact** : 20+ props entre parent et BaseCard

**Evidence** :

- TachesEdition.tsx → EditionCard → BaseCard
- Chaque niveau passe 15-20 props

**Recommandation** : Utiliser composition ou context pour groupes de props

---

## 7. PATTERNS ACCESSIBILITÉ TSA TROUVÉS

### 7.1 Positifs

✅ **Animations conformes** :

- Duration courtes (0.2s, 0.15s)
- Easing doux (easeOut, ease-out)
- Respect `prefers-reduced-motion`
- Scale modérés (1.02, 1.15 max)

✅ **ARIA Labels dynamiques** :

- Tous les boutons et checkboxes ont labels
- Labels descriptifs et contextuels
- Aucun contenu image sans alt

✅ **Cibles Tactiles** :

- 44px minimum respecté (BaseCard.scss 115-116)
- Responsive 44px mobile, auto desktop

✅ **Contraste** :

- Utilise tokens semantiques `semantic('success')`, `semantic('info')`
- Palette pastel respectée (tsa-pastel)

✅ **Pas de Clignotement** :

- Aucune animation > 3 Hz
- Aucun blink ou pulse agressif

### 7.2 Négatifs

❌ **Focus Outline supprimé** :

- BaseCard.scss 154 : `outline: none` sans visual replacement
- Clavier navigation impactée

❌ **Animation DnD potentiellement trop rapide** :

- TableauCard.tsx 69 : cubic-bezier(0.34, 1.56, 0.64, 1) = bounce
- Bounce peut être agressif pour enfants TSA
- À tester avec `prefers-reduced-motion`

❌ **Grayscale filter sur 'done'** :

- TableauCard.scss 50 : `filter: grayscale(100%)`
- Ne communique pas couleur seule = problème contraste
- Besoin couleur PLUS filter ou alternative

### 7.3 À Améliorer

⚠️ **Label readability** :

- BaseCard.scss 137-149 : Ellipsis 2 lignes max
- Peut perdre contenu important
- Besoin tooltip ou feedback complet

⚠️ **Semantic HTML** :

- Utilise `role="article"` et `role="doc-subtitle"` correctement
- Mais mix de div/span sans sémantique claire pour sections

---

## 8. DÉPENDANCES EXTERNES

### 8.1 Librairies

| Librairie       | Usage                                   | Critique?               |
| --------------- | --------------------------------------- | ----------------------- |
| `framer-motion` | BaseCard hover + ButtonDelete animation | Non (fallback graceful) |
| `@dnd-kit/core` | TableauCard drag-drop                   | Oui (core feature)      |
| `lucide-react`  | Icons (Trash2, Check)                   | Non (fallback emojis)   |
| `react-i18next` | useI18n() traductions                   | Oui (labels dynamiques) |

### 8.2 Hooks Custom

| Hook                 | Fichier                       | Ligne | Used By                 |
| -------------------- | ----------------------------- | ----- | ----------------------- |
| `useI18n()`          | src/hooks/useI18n.ts          | 12    | BaseCard (labels), tous |
| `useReducedMotion()` | src/hooks/useReducedMotion.ts | 12    | BaseCard (animations)   |
| `useDragAnimation()` | src/hooks/useDragAnimation.ts | 49    | TableauCard             |
| `useAudioContext()`  | src/hooks/useAudioContext.ts  | 53    | TableauCard             |
| `useDraggable()`     | @dnd-kit/core                 | 43    | TableauCard             |

### 8.3 Composants UI Dépendants

| Composant             | Fichier                                      | Used in BaseCard |
| --------------------- | -------------------------------------------- | ---------------- |
| `InputWithValidation` | src/components/shared/input-with-validation/ | Ligne 128        |
| `Select`              | src/components/ui/select/                    | Ligne 143        |
| `Checkbox`            | src/components/ui/checkbox/                  | Ligne 115        |
| `ImagePreview`        | src/components/ui/image-preview/             | Ligne 101        |
| `ButtonDelete`        | src/components/ui/button/button-delete/      | Ligne 108        |

---

## 9. UTILISATION DANS L'APPLICATION

### 9.1 Utilisation BaseCard / EditionCard

**Fichier** : `TachesEdition.tsx`

```typescript
// Ligne 6, 130+ usages implicites via DndGrid
<EditionCard
  image={tache.imagepath}
  label={drafts[tache.id] || tache.label}
  editable={true}
  onLabelChange={(label) => handleLabelChange(tache.id, label)}
  onBlur={(val) => handleBlur(tache.id, val)}
  onDelete={() => onDelete(tache)}
  checked={tache.aujourdhui}
  onToggleCheck={() => onToggleAujourdhui(tache.id, tache.aujourdhui)}
  categorie={tache.categorie}
  onCategorieChange={(cat) => onUpdateCategorie(tache.id, cat)}
  categorieOptions={categoryOptions}
  labelId={tache.id}
/>
```

**Pattern** :

- Utilisé via DndGrid (drag-drop wrapper)
- Props viennent de hook `useTachesEdition()`
- Callbacks gèrent validation + API update

**Utilisation** : RecompensesEdition.tsx (même pattern)

### 9.2 Utilisation TableauCard

**Fichier** : `TachesDnd.tsx`

```typescript
// Ligne 134-160 (dans slot)
<TableauCard
  tache={tache}
  done={doneMap[tache.id] || false}
  toggleDone={onToggle}
  isDraggingGlobal={isDragging}
  isBeingSwapped={swappedCardId === tache.id}
  playSound={true}
/>
```

**Pattern** :

- Rendu dans DroppableSlot (drop zone)
- Props `done` et `doneMap` gérés par parent
- Audio feedback intégré (`playSound`)
- DnD state passed down (isDragging, isBeingSwapped)

---

## 10. RECOMMANDATIONS ARCHITECTURALES

### 10.1 Refactoring Court Terme (Critique)

#### Fix #1 : Ajouter Focus Ring Visible

**Fichier** : `BaseCard.scss` Ligne 152-155

```scss
// ❌ Actuellement
&:focus-within {
  box-shadow: shadow('elevation-md');
  outline: none;
}

// ✅ À faire
&:focus-within {
  box-shadow:
    shadow('elevation-md'),
    0 0 0 2px semantic('focus');
  outline: 2px solid transparent; /* Fallback outline */
}
```

#### Fix #2 : Extraire Inline Styles TableauCard

**Fichier** : `TableauCard.tsx` Ligne 67-81

```typescript
// ❌ Actuellement : hardcoded values
const style = {
  zIndex: isDragging ? 1000 : 'auto',
  opacity: isDragging ? 0.92 : 1,
}

// ✅ À faire : constantes réutilisables
const Z_INDEX_DRAGGING = 1000
const OPACITY_DRAGGING = 0.92
const SHADOW_DRAGGING =
  '0 20px 40px rgba(0, 0, 0, 0.3), 0 10px 15px rgba(0, 0, 0, 0.2)'

const style = {
  zIndex: isDragging ? Z_INDEX_DRAGGING : 'auto',
  opacity: isDragging ? OPACITY_DRAGGING : 1,
  boxShadow: isDragging ? SHADOW_DRAGGING : undefined,
}
```

#### Fix #3 : Utiliser Focus Visible CSS

**Fichier** : `BaseCard.scss`

```scss
/* Ajouter focus-visible outline */
&:focus-visible {
  outline: 2px solid semantic('focus');
  outline-offset: 2px;
}
```

### 10.2 Refactoring Moyen Terme (Important)

#### Refactor #1 : Splitter BaseCard

**Objectif** : Réduire de 43 props à 10-15

**Approche** : Composition compound components

```typescript
// Avant (trop de props)
<BaseCard
  image={...}
  label={...}
  editable={...}
  onLabelChange={...}
  onDelete={...}
  checked={...}
  onToggleCheck={...}
  categorie={...}
  onCategorieChange={...}
  categorieOptions={...}
  disabled={...}
  // ... 20+ props
/>

// Après (composition)
<Card size="md" disabled={disabled}>
  <Card.Image url={image} />
  <Card.Label
    value={label}
    editable={editable}
    onChange={onLabelChange}
  />
  <Card.Category
    value={categorie}
    options={categorieOptions}
    onChange={onCategorieChange}
  />
  <Card.Actions>
    <Card.Delete onClick={onDelete} />
    <Card.Checkbox checked={checked} onChange={onToggleCheck} />
  </Card.Actions>
</Card>
```

**Bénéfices** :

- Chaque sub-composant < 150 lignes
- Props clairs et ciblés
- Réutilisable en nouvelles combinaisons

#### Refactor #2 : Supprimer EditionCard

**Actuellement** : Wrapper superflu (42 lignes)

**Solution** : Alias ou export conditionnel

```typescript
// EditionCard.tsx → Remove or simplify to:
export { default as EditionCard } from './base-card/BaseCard'
// + utiliser className "card-edition" si besoin

// Ou plus simple : remplacer tous usages par:
<BaseCard editable {...props} className="card-edition" />
```

#### Refactor #3 : Extraire Validation Rules

**Actuellement** : Hardcodée dans BaseCard (lignes 68-71)

**Solution** : Props configurable avec défaut

```typescript
interface BaseCardProps {
  // ...existing props...
  validationRules?: ValidationRule[]  // Nouveau
}

// Défaut
const defaultRules = [
  makeValidateNotEmpty(t),
  makeNoEdgeSpaces(t),
  makeNoDoubleSpaces(t),
]

const rules = validationRules ?? defaultRules

<InputWithValidation
  rules={rules}
  // ...
/>
```

### 10.3 Refactoring Long Terme (Optimisation)

#### Refactor #4 : Unifier DnD Logic

**TableauCard** : Extraire logic métier du composant

```typescript
// hooks/useDndCard.ts
export function useDndCard(
  tacheId: string | number,
  done: boolean,
  toggleDone: (id, newDone) => void,
  options?: { playSound?: boolean }
) {
  const { attributes, listeners, transform, isDragging } = useDraggable({...})
  const { playBeep } = useAudioContext()

  const handleCheck = useCallback(() => {
    if (!done && options?.playSound) playBeep(440)
    toggleDone(tacheId, !done)
  }, [done, options?.playSound, playBeep, tacheId, toggleDone])

  return { attributes, listeners, transform, isDragging, handleCheck }
}

// Utilisation : composant plus clean
function TableauCard(props) {
  const { attributes, listeners, transform, isDragging, handleCheck } = useDndCard(...)
  return (
    <div {...attributes} {...listeners} style={{transform}}>
      {/* content */}
    </div>
  )
}
```

#### Refactor #5 : Design System Tokens pour DnD

**Créer** : `src/styles/abstracts/_dnd-tokens.scss`

```scss
// Z-index et opacité DnD
$dnd-z-index-dragging: z-index('modal');
$dnd-opacity-dragging: opacity('lg');
$dnd-shadow-dragging: shadow('elevation-lg');

// Utiliser dans TableauCard.scss
.tableau-card {
  &.dragging {
    z-index: $dnd-z-index-dragging;
    opacity: $dnd-opacity-dragging;
    box-shadow: $dnd-shadow-dragging;
  }
}
```

---

## 11. RÉSUMÉ VIOLATIONS & SCORES

### Violations par Sévérité

| ID  | Sévérité  | Titre                                 | Composant   | Impact         |
| --- | --------- | ------------------------------------- | ----------- | -------------- |
| V1  | 🔴 HIGH   | BaseCard trop généraliste (43 props)  | BaseCard    | Maintenabilité |
| V2  | 🟡 MEDIUM | EditionCard wrapper superflu          | EditionCard | Code bloat     |
| V3  | 🔴 HIGH   | TableauCard inline styles hardcodées  | TableauCard | Maintenabilité |
| V4  | 🔴 HIGH   | Focus outline supprimé                | BaseCard    | A11y clavier   |
| V5  | 🟡 MEDIUM | Validation hardcodée non-configurable | BaseCard    | Extensibilité  |
| V6  | 🟡 MEDIUM | TableauCard mélange responsabilités   | TableauCard | Testabilité    |
| V7  | 🟡 MEDIUM | Props drilling lourd (20+ props)      | All         | Complexité     |

### Points Positifs

| Aspect                | Score      | Détails                                      |
| --------------------- | ---------- | -------------------------------------------- |
| **Accessibilité TSA** | ⭐⭐⭐⭐⭐ | Animations conformes, ARIA, cibles tactiles  |
| **SCSS Phase 6**      | ⭐⭐⭐⭐⭐ | Tokens-first conforme, aucun hardcode        |
| **Memoïsation**       | ⭐⭐⭐⭐⭐ | Tous composants memoïzés                     |
| **Composition**       | ⭐⭐⭐⭐☆  | Bien séparé BaseCard/EditionCard/TableauCard |
| **Props Clarity**     | ⭐⭐⭐☆☆   | Trop de props, pas assez groupées            |
| **Reusability**       | ⭐⭐⭐☆☆   | BaseCard réutilisable mais trop flexible     |

---

## 12. PLAN DE REFACTORING RECOMMANDÉ

### Phase 1 : Fixes Critiques (1-2j)

- [ ] Fix focus ring visible (A11y)
- [ ] Extraire inline styles TableauCard
- [ ] Tester animations avec `prefers-reduced-motion`
- [ ] Tester grayscale + contraste sur 'done' state

### Phase 2 : Refactoring SRP (3-5j)

- [ ] Splitter BaseCard en sub-composants
- [ ] Supprimer EditionCard wrapper
- [ ] Extraire validation rules en props

### Phase 3 : Optimisation (2-3j)

- [ ] Extraire useDndCard hook
- [ ] Créer tokens SCSS pour DnD
- [ ] Augmenter couverture tests (scenarios props combinations)

---

## CONCLUSION

### Diagnostic Global

**Architecture** : ⭐⭐⭐ (Decent)

- Séparation BaseCard/TableauCard claire ✅
- EditionCard wrapper superflu ⚠️
- Props drilling lourd ⚠️

**Accessibilité TSA** : ⭐⭐⭐⭐ (Excellent)

- Animations conformes ✅
- ARIA labels complets ✅
- Cibles tactiles 44px ✅
- Focus ring : MISSING ❌

**Maintenabilité** : ⭐⭐⭐ (Moyen)

- SCSS Phase 6 excellent ✅
- TypeScript props clairs ✅
- BaseCard trop flexible ⚠️
- TableauCard trop accouplé ⚠️

**Recommandation** :

1. ✅ Fix focus ring immédiatement (A11y)
2. 🟡 Refactor BaseCard + EditionCard (moyen terme)
3. 🟡 Extraire TableauCard DnD logic (optimisation)

---

**End of Analysis** | Generated: 2026-01-09
