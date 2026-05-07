---
name: Audit Complet Checkboxes Appli-Picto
description: Exploration exhaustive de tous les usages checkbox, composants, styles et patterns
type: reference
---

# AUDIT COMPLET CHECKBOXES — Appli-Picto

**Date audit** : 2026-05-06
**Branche** : feature/re-design-edition
**Fichiers lus** : 13 TSX + 4 SCSS

## 1. COMPOSANT PRINCIPAL : Checkbox.tsx

**Chemin** : `/src/components/ui/checkbox/Checkbox.tsx`  
**Type** : Client Component (`'use client'`)  
**But** : Composant atomique checkbox réutilisable — wrapper sur `<input type="checkbox">` avec checkmark Lucide

### Signature TypeScript

```typescript
interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'checked' | 'type' | 'size'
  > {
  id: string // Obligatoire
  label?: string // Label optionnel
  checked: boolean // État contrôlé
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  error?: string // Message erreur
  className?: string
  size?: 'sm' | 'md' // Variantes tailles
}
```

### Rendu HTML

```
<div class="checkbox-field checkbox-field--{size}">
  <div class="checkbox-field__box">
    <input type="checkbox" ... />
    {checked && <span class="checkbox-field__checkmark"><Check /></span>}
  </div>
  {label && <label htmlFor={id} class="checkbox-field__label">{label}</label>}
  {error && <p id="{id}-error" class="checkbox-field__error">{error}</p>}
</div>
```

### Accessibilité WCAG 2.2 AA intégrée

- ✅ Wrapper `display: inline-flex; @include touch-target('min')` = 44px min
- ✅ `aria-invalid={!!error}` + `aria-describedby={error ? `${id}-error` : undefined}`
- ✅ Focus visible avec outline 2px solid var(--color-primary)
- ✅ Checkmark via `aria-hidden="true"` (purement décoratif)
- ✅ Label cliquable via `htmlFor={id}`

### Variantes

1. **sm** : 16px (icon-xs)
2. **md** : 20px (icon-sm) — défaut
3. **lg** : 28px (icon-lg) — accessibilité renforcée (défini dans SCSS mais pas exposé en TSX)

---

## 2. STYLES CHECKBOX : Checkbox.scss

**Chemin** : `/src/components/ui/checkbox/Checkbox.scss`  
**Validation** : ✅ Phase 6 complète, tokens-first

### Structure SCSS

```scss
.checkbox-field { /* Wrapper 44px min, flex layout */
  &__input { /* Reset natif, dimensions variables, transitions safe, focus visible */
    width: size('icon-sm')  // 20px mobile
    height: size('icon-sm')

    @include respond-to(sm) { /* Desktop */
      width: size('icon-md')  // 24px
      height: size('icon-md')
    }

    &:checked {
      background-color: color('base')
      border-color: color('base')
      @include safe-animation(checkbox-bounce, ...) /* ≤0.3s, pop lisse */
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary) /* WCAG AA */
      outline-offset: 2px
    }

    &:disabled {
      opacity: 0.5
      cursor: not-allowed
    }
  }

  &__box { /* Position absolue pour checkmark overlay */
    position: relative
    display: flex
  }

  &__checkmark { /* SVG Lucide Check centré sur input */
    position: absolute
    inset: 0  // Couvre exactement __box
    color: text('invert')  // Blanc sur fond sombre

    svg {
      width: size('icon-sm')  // 20px mobile
      height: size('icon-sm')

      @include respond-to(sm) {
        width: size('icon-md')  // 24px desktop
        height: size('icon-md')
      }
    }
  }

  &__label {
    margin-inline-start: spacing('sm')  // 8px (propriété logique RTL-ready)
    font-size: font-size('base')
    color: text()
    cursor: pointer

    &__input:disabled ~ &__label {
      opacity: 0.5
      cursor: not-allowed
    }
  }

  &__error {
    margin-block-start: spacing('xs')  // 4px
    margin-inline-start: calc(spacing('lg') + spacing('sm'))  // RTL-safe
    font-size: font-size('sm')
    color: semantic('error')
  }

  /* Variantes tailles */
  &--sm &__input { width: size('icon-xs'); height: size('icon-xs') } /* 16px */
  &--md &__input { width: size('icon-sm'); height: size('icon-sm') } /* 20px */
  &--lg &__input { width: size('icon-lg'); height: size('icon-lg') } /* 28px */
}

@keyframes checkbox-bounce {
  0% { transform: scale(1) }
  50% { transform: scale(1.1) }  /* Bounce doux TSA ≤0.3s */
  100% { transform: scale(1) }
}
```

### Pièges identifiés (CookiePreferences.scss)

**Problème** : CookiePreferences.scss contient un override manuel :

```scss
.cookie-prefs__checkbox {
  input[type='checkbox'] {
    width: var(--spacing-20)   // ⚠️ 20px hardcodé, pas token
    height: var(--spacing-20)
    accent-color: semantic('info-primary')
    cursor: pointer

    &:disabled {
      opacity: opacity('half')
      cursor: not-allowed
    }
  }
}
```

**Impact** : CookiePreferences utilise le Checkbox composant ET ajoute du CSS qui sélectionne `input[type='checkbox']` directement — peut causer conflicts.

---

## 3. USAGES CHECKBOX DANS LE PROJET

### 3.1 EditionCard.tsx — Contexte principal

**Chemin** : `/src/components/shared/card/edition-card/EditionCard.tsx`  
**Type** : Client Component  
**Usage** : Checkbox "Afficher/masquer" carte dans timeline

```typescript
<Checkbox
  id={`checkbox-${labelId}`}
  checked={checked}
  onChange={() => !disabled && !checkboxDisabled && onToggleCheck()}
  aria-label={checked ? t('card.visible') : t('card.hidden')}
  label={
    isBankCard
      ? undefined  /* Pas de label pour cartes banque */
      : checked
        ? t('card.shown')
        : t('card.show')
  }
  size="md"
  disabled={disabled || checkboxDisabled}
/>
```

**Props depuis parent (CardsEdition)** :

- `checked` : boolean — isCardInTimeline(cardId)
- `onToggleCheck()` : callback — handleToggleCheckbox(cardId)
- `disabled` : boolean — checkboxDisabled (offline, execution-only, session locked)
- `checkboxDisabled` : boolean — lockedCardIds.has(cardId)

**Spécificité CookiePreferences override** : EditionCard.scss surcharge `.checkbox-field__checkmark` :

```scss
.card-edition__footer {
  .checkbox-field__checkmark {
    left: 0
    width: size('icon-sm')  /* 20px */
    justify-content: center

    svg {
      width: size('icon-md')  /* 24px — override size={16} de Lucide Check */
      height: size('icon-md')
    }
  }
}
```

### 3.2 CardsEdition.tsx — Business logic

**Chemin** : `/src/components/features/cards/cards-edition/CardsEdition.tsx`  
**Type** : Client Component  
**Usage** : Récupère état checkbox + gère logique timeline

```typescript
// Calcul état checkbox
const isCardInTimeline = (cardId: string | number): boolean => {
  if (!timelineSlots) return false
  return timelineSlots.some(slot => slot.card_id === String(cardId))
}

// Handler checkbox
const handleToggleCheckbox = async (cardId: string | number) => {
  if (!onToggleCardInTimeline) return
  const currentlyChecked = isCardInTimeline(cardId)
  await onToggleCardInTimeline(String(cardId), currentlyChecked)
}

// Passer à EditionCard
<EditionCard
  checked={isCardInTimeline(item.id)}
  onToggleCheck={() => handleToggleCheckbox(item.id)}
  checkboxDisabled={lockedCardIds?.has(String(item.id)) ?? false}
/>
```

### 3.3 CookiePreferences.tsx — Consentement RGPD

**Chemin** : `/src/components/features/consent/CookiePreferences.tsx`  
**Type** : Client Component  
**Usage** : 3x Checkbox (Necessary [disabled], Analytics, Marketing)

```typescript
<div className="cookie-prefs__checkbox">
  <Checkbox
    id="necessary-cookies"
    label={t('cookies.alwaysActive')}
    checked={true}
    onChange={() => {}}
    disabled  /* Toujours coché, pas d'interaction */
  />
</div>

<div className="cookie-prefs__checkbox">
  <Checkbox
    id="analytics-cookies"
    label={t('cookies.enableAnalytics')}
    checked={!!choices.analytics}
    onChange={() => toggle('analytics')}
  />
</div>

<div className="cookie-prefs__checkbox">
  <Checkbox
    id="marketing-cookies"
    label={t('cookies.enableMarketing')}
    checked={!!choices.marketing}
    onChange={() => toggle('marketing')}
  />
</div>
```

**État** : `choices` via `getConsent()` + `saveConsent()` (localStorage)

### 3.4 SlotItem.tsx — Éditeur timeline (pas de Checkbox)

**Chemin** : `/src/components/features/timeline/slot-item/SlotItem.tsx`  
**Observation** : NE contient PAS de Checkbox — seulement Select jetons + Button séquence

---

## 4. FICHIERS SCSS IMPACTÉS

### 4.1 EditionCard.scss — Override checkmark

**Chemin** : `/src/components/shared/card/edition-card/EditionCard.scss`

```scss
.card-edition__footer {
  display: flex
  align-items: center
  justify-content: space-between
  min-height: size('touch-target-min')  /* 44px WCAG 2.5.5 */

  .checkbox-field__checkmark {
    left: 0
    width: size('icon-sm')  /* 20px == input width --md */
    justify-content: center

    svg {
      width: size('icon-md')  /* 24px — enlarge Check icon */
      height: size('icon-md')
    }
  }
}
```

**Raison** : Checkbox dans EditionCard affichée en footer (horizontal layout) avec checkmark amplifié visuellement.

### 4.2 CookiePreferences.scss — Styles input[type='checkbox']

**Chemin** : `/src/components/features/consent/CookiePreferences.scss`

```scss
.cookie-prefs__checkbox {
  display: flex
  align-items: center
  gap: spacing('sm')

  input[type='checkbox'] {
    width: var(--spacing-20)  /* ⚠️ 20px — hardcodé vs token */
    height: var(--spacing-20)
    accent-color: semantic('info-primary')
    cursor: pointer

    &:disabled {
      opacity: opacity('half')
      cursor: not-allowed
    }
  }

  label {
    font-weight: font-weight('medium')
    color: text('default')
    cursor: pointer
    user-select: none
  }
}
```

**⚠️ Problème** : Cet override s'applique directement à `input[type='checkbox']` — si le Checkbox composant est utilisé, cet CSS spécificité 0.2.1 va perdre face à `.checkbox-field__input` (0.3.1).

### 4.3 SlotItem.scss — Pas de checkbox, mais tokens utilisés

Contient `select` et `button` — pas de checkbox.

### 4.4 Input.scss — Pas de checkbox

Contient styles `input[type='text']`, `input[type='password']`, `input[type='file']` — pas checkbox.

---

## 5. PATTERNS IDENTIFIÉS

### Pattern 1 : Checkbox Contrôlée (Controlled Component)

```typescript
// Parent
const [checked, setChecked] = useState(...)

// Enfant
<Checkbox
  checked={checked}
  onChange={(e) => setChecked(e.target.checked)}
/>
```

**Utilisé dans** : EditionCard, CookiePreferences

### Pattern 2 : Checkbox Conditionnelle (Affichage basé props)

```typescript
{
  isBankCard ? undefined : t('card.shown')
} // Label optionnel
```

**Utilisé dans** : EditionCard (cartes banque vs personnelles)

### Pattern 3 : Disabled Conditional

```typescript
disabled={disabled || checkboxDisabled}  /* Double guard */
```

**Utilisé dans** : EditionCard (offline + execution-only + locked)

### Pattern 4 : Checkbox Fieldset (WCAG)

```tsx
<fieldset className="cookie-prefs__fieldset">
  <legend>{title}</legend>
  <Checkbox {...props} />
</fieldset>
```

**Utilisé dans** : CookiePreferences (sémantique formulaire)

### Pattern 5 : Checkmark SVG Overlay

Checkbox.tsx utilise une approche overlay :

```jsx
{
  checked && (
    <span className="checkbox-field__checkmark" aria-hidden="true">
      <Check size={18} strokeWidth={3} />
    </span>
  )
}
```

**Avantage** : Contrôle total de l'apparence, pas de :checked::before hack.

---

## 6. TOKENS SCSS UTILISÉS

### Sizes

- `size('icon-xs')` → 16px (mobile sm)
- `size('icon-sm')` → 20px (mobile md, desktop sm)
- `size('icon-md')` → 24px (desktop md)
- `size('icon-lg')` → 28px (desktop lg)
- `size('touch-target-min')` → 44px (WCAG AA)

### Spacing

- `spacing('xs')` → 4px (gaps, margins)
- `spacing('sm')` → 8px (label margin-inline-start)

### Colors

- `color('base')` → Base text color (état checked)
- `surface('bg')` → Background input
- `surface('border')` → Border default
- `surface('card')` → Card background
- `text('invert')` → Texte blanc checkmark
- `text()` → Texte label
- `semantic('error')` → Rouge message erreur

### Border & Radius

- `border-width('base')` → 1px
- `radius('subtle')` → 4px (border-radius input)

### Motion

- `timing('fast')` → 0.15s
- `easing('smooth')` → cubic-bezier(0.4, 0, 0.2, 1) TSA-safe
- `easing('smooth-pop')` → cubic-bezier(0.34, 1.56, 0.64, 1) bounce

### Typography

- `font-size('base')` → 16px (label)
- `font-size('xs')` → 12px (error message)

---

## 7. DÉPENDANCES & IMPORTS

### Imports externes

- `lucide-react` → `Check` icon (SVG)
- `react` → `forwardRef`, `ChangeEvent`

### Hooks internes

- `useI18n()` → Traductions (CookiePreferences.tsx)
- `useAuth()` → User context (CookiePreferences.tsx)
- `useReducedMotion()` → Respect prefers-reduced-motion (Toggle.tsx, ne concerne pas Checkbox)

### Utilitaires

- `getConsent()`, `saveConsent()` → localStorage (CookiePreferences.tsx)
- `tryLogServerConsent()` → Logging (CookiePreferences.tsx)

---

## 8. TESTS & VALIDATION

### Build validation

✅ `pnpm build` — Checkbox.scss tokens corrects, pas d'erreur Next.js

### WCAG 2.2 AA

- ✅ Touch target 44px minimum
- ✅ Focus visible outline
- ✅ aria-invalid + aria-describedby
- ✅ label htmlFor
- ✅ aria-hidden sur checkmark décoratif

### TSA (Animations)

- ✅ checkbox-bounce ≤ 0.3s (0.15s + 0.15s + 0.15s = 0.45s) — ⚠️ Légèrement au-dessus
  - smooth-pop easing + scale bounce
  - Respect prefers-reduced-motion implicite via safe-animation

### Responsive

- ✅ Mobile-first 20px (icon-sm)
- ✅ Desktop 24px (icon-md) via @include respond-to(sm)

---

## 9. PROBLÈMES IDENTIFIÉS

### 🟡 Sévérité HAUTE

1. **CookiePreferences.scss Override Incomplet**
   - Le fichier contient `input[type='checkbox']` CSS selector
   - Specficité 0.2.1 < `.checkbox-field__input` (0.3.1)
   - Les styles `width: var(--spacing-20)` ne s'appliquent PAS à Checkbox composant
   - **Impact** : Apparence incohérente si styles attendus non appliqués
   - **Solution** : Utiliser `.checkbox-field__input` pour override ou ajouter styles directs à .cookie-prefs\_\_checkbox wrapper

2. **Checkbox-bounce Animation Durée TSA**
   - Animation total = 0.15s + 0.15s + 0.15s = 0.45s (dépasse 0.3s TSA recommandé)
   - **Guideline** : « feedback animations ≤ 0.3s »
   - **Solution** : Réduire à timing('fast') = 0.15s OU modifier keyframes (0-100% sans 50%)

3. **No Variant lg in TSX**
   - Checkbox.scss définit `&--lg` (28px) mais composant TSX accepte seulement `size?: 'sm' | 'md'`
   - **Impact** : Variante lg inaccessible sans refactor TSX
   - **Solution** : Ajouter `'lg'` au type CheckboxSize et tester avec lg props

### 🟠 Sévérité MOYENNE

4. **Check Icon Lucide size Hardcodé**
   - `<Check size={18} strokeWidth={3} />` — hardcodé vs token
   - **Impact** : Asymétrie mobile/desktop (size variant pas appliqué à Check)
   - **Solution** : Utiliser size token via CSS var ou refactor (Check n'accepte pas dynamic size)

5. **CookiePreferences Fieldset Legend**
   - Legend contient `<span class="cookie-prefs__category">` — correct mais verbose
   - **Impact** : Pas d'impact fonctionnel, pattern ok pour WCAG
   - **Solution** : Valider avec lecteur d'écran si structure idéale

### 🟢 Sévérité BASSE

6. **EditionCard Checkmark Override**
   - Surcharge `svg { width: size('icon-md'); height: size('icon-md') }` — logique
   - **Impact** : Intentionnel (amplifier checkmark en footer)
   - **Solution** : Documenter dans édition-card.scss

7. **Toggle.tsx ≠ Checkbox**
   - Toggle utilise `role="switch"` vs checkbox `role="checkbox"` implicite
   - **Impact** : 2 composants différents pour 2 patterns différents
   - **Solution** : Documenter quand utiliser Toggle vs Checkbox

---

## 10. RÉSUMÉ CHECKLISTE

| Aspect                  | Status | Notes                                         |
| ----------------------- | ------ | --------------------------------------------- |
| Composant Checkbox.tsx  | ✅     | Tokens-first, WCAG AA, TSA-friendly           |
| Styles Checkbox.scss    | ✅     | Phase 6 validé, responsive                    |
| EditionCard usage       | ✅     | Intégration propre, override intentionnel     |
| CookiePreferences usage | ⚠️     | Override incomplet, à vérifier                |
| Touch targets           | ✅     | 44px minimum (wrapper + input)                |
| Focus visible           | ✅     | outline 2px solid, offset 2px                 |
| Animations              | ⚠️     | checkbox-bounce 0.45s > 0.3s TSA              |
| Mobile-first            | ✅     | 20px mobile, 24px desktop                     |
| Accessibilité           | ✅     | aria-invalid, aria-describedby, label htmlFor |
| Responsive              | ✅     | @include respond-to(sm) appliqué              |

---

## 11. RECOMMANDATIONS

1. **Fix Checkbox-bounce timing** : Réduire à 0.15s ou appliquer safe-animation automatiquement
2. **Verify CookiePreferences rendering** : Tester visuellement que checkbox s'affiche correctement avec Checkbox composant
3. **Document lg variant** : Si lg n'est pas exposé, documenter pourquoi ou ajouter au TSX
4. **Extract Check icon size** : Prévoir refactor futur si Check Lucide nécessite dynamisme
5. **Consider Fieldset wrapper** : Documenter pattern fieldset/legend pour accessibility best-practices

---

**Fin d'audit** — Tous les fichiers lus, tous les patterns identifiés.
