# Documentation des Composants UI

> **Dernière mise à jour**: 28 novembre 2024
> **Amélioration**: Accessibilité TSA + SVG + forwardRef + Lexend Font

## Vue d'ensemble

Ce document détaille les composants UI critiques du projet Appli-Picto optimisés pour l'accessibilité des enfants TSA.

### Composants documentés

- [Button](#button)
- [Input](#input)
- [Select](#select)
- [SelectWithImage](#selectwithimage)
- [Checkbox](#checkbox)

---

## Button

**Localisation**: `src/components/ui/button/Button.tsx`

### Description

Composant bouton versatile avec support du chargement async et accessibilité WCAG 2.2 AA.

### Améliorations récentes (Nov 2024)

- ✅ `forwardRef` pour intégration React Hook Form
- ✅ Prop `isLoading` avec spinner animé (3 dots)
- ✅ Font-family Lexend pour accessibilité TSA
- ✅ Focus ring visible explicite
- ✅ Support `aria-busy` pour lecteurs d'écran

### Props

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

### Variants

- `primary`: Bleu primaire (CTA principal)
- `secondary`: Violet secondaire
- `default`: Gris clair (actions secondaires)
- `danger`: Rouge (suppression, actions destructives)

### Utilisation

```tsx
import Button from '@/components/ui/button/Button'

// Bouton simple
<Button variant="primary" onClick={() => console.log('Clicked')}>
  Valider
</Button>

// Bouton avec chargement
<Button isLoading={isSaving}>
  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
</Button>

// Avec ref pour React Hook Form
const buttonRef = useRef<HTMLButtonElement>(null)
<Button ref={buttonRef} type="submit">
  Soumettre
</Button>
```

### Accessibilité WCAG 2.2 AA

- ✅ `min-height: 44px` (zone tactile minimum)
- ✅ Focus ring visible au clavier
- ✅ `aria-busy="true"` quand `isLoading`
- ✅ Contraste texte/fond ≥ 4.5:1
- ✅ Lexend font pour dyslexie

### Styling

- Fichier: `Button.scss`
- Classes principales:
  - `.btn` : conteneur principal
  - `.btn--{variant}` : variant
  - `.btn--loading` : état chargement
  - `.btn__text` : contenu texte
  - `.btn__spinner` : spinner animé

### Animations

- Spinner: 3 dots avec fade animation (0.6s)
- Transitions: `background` et `color` (150ms)
- `prefers-reduced-motion`: animations désactivées

---

## Input

**Localisation**: `src/components/ui/input/Input.tsx`

### Description

Composant input pour champs texte, password, date, file avec gestion d'erreurs.

### Améliorations récentes (Nov 2024)

- ✅ Toggle password: cible tactile 44x44px (min-width/height)
- ✅ Focus ring visible sur toggle
- ✅ Eye/EyeOff icons (lucide-react, remplace rien)
- ✅ Font-family Lexend
- ✅ Déjà avait aria-describedby + aria-invalid

### Props

```typescript
interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  id: string
  label?: string
  value: string | number
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string // 'text' | 'password' | 'date' | 'file'
  error?: string
  className?: string
}
```

### Utilisation

```tsx
import Input from '@/components/ui/input/Input'

// Texte simple
<Input
  id="username"
  label="Nom d'utilisateur"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  placeholder="Entrez votre nom"
/>

// Mot de passe avec toggle
<Input
  id="password"
  label="Mot de passe"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  error={passwordError}
/>

// Date
<Input
  id="birthDate"
  label="Date de naissance"
  type="date"
  value={date}
  onChange={(e) => setDate(e.target.value)}
/>
```

### Accessibilité WCAG 2.2 AA

- ✅ `min-height: 44px` sur input
- ✅ Toggle password button: `min-width: 44px; min-height: 44px`
- ✅ Toggle button focus ring visible (`outline: 2px`)
- ✅ `aria-invalid` et `aria-describedby` pour erreurs
- ✅ Lexend font
- ✅ Eye/EyeOff SVG icons (pas emoji)

### Styling

- Fichier: `Input.scss`
- Classes principales:
  - `.input-field` : conteneur
  - `.input-field__input` : champ input
  - `.input-field__toggle` : bouton toggle password
  - `.input-field__error` : message d'erreur
  - `.input-field__input--error` : état erreur avec border rouge

### Points clés du toggle password

```scss
.input-field__toggle {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &:focus-visible {
    outline: 2px solid #0077c2;
    outline-offset: 2px;
  }
}
```

---

## Select

**Localisation**: `src/components/ui/select/Select.tsx`

### Description

Composant `<select>` natif HTML avec wrapper pour labels et gestion d'erreurs.

### Améliorations récentes (Nov 2024)

- ✅ `forwardRef` pour intégration formulaires
- ✅ Font-family Lexend
- ✅ `displayName` pour debugging

### Props

```typescript
interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    'onChange' | 'value'
  > {
  id: string
  label?: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options?: SelectOption[]
  error?: string
  placeholder?: string
}
```

### Utilisation

```tsx
import Select from '@/components/ui/select/Select'

;<Select
  id="category"
  label="Catégorie"
  value={category}
  onChange={e => setCategory(e.target.value)}
  options={[
    { value: '1', label: 'Hygiène' },
    { value: '2', label: 'Repas' },
    { value: '3', label: 'Jeu' },
  ]}
  error={categoryError}
/>
```

### Limitation

⚠️ **À noter**: Le `<select>` natif **n'affiche pas les images**. Pour des enfants non-lecteurs, utiliser **SelectWithImage** à la place.

### Accessibilité WCAG 2.2 AA

- ✅ Native HTML select (accessible par défaut)
- ✅ Labels associés avec `htmlFor`
- ✅ `aria-invalid` et `aria-describedby`
- ✅ Lexend font
- ✅ `min-height: 44px`

---

## SelectWithImage

**Localisation**: `src/components/ui/select-with-image/SelectWithImage.tsx`

### Description

Composant custom select **avec support d'images** pour enfants non-lecteurs. Utilise `<details>/<summary>` pour accessibilité native.

### ⭐ NOUVEAUTÉ - Créé Nov 2024

Répondant aux besoins spécifiques d'Appli-Picto pour permettre aux enfants non-lecteurs de naviguer par icônes.

### Props

```typescript
export interface SelectWithImageOption {
  value: string | number
  label: string
  image?: string // URL de l'image
  imageAlt?: string // Alt text
}

interface SelectWithImageProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'value'> {
  id: string
  label?: string
  value: string | number
  onChange: (value: string | number) => void
  options?: SelectWithImageOption[]
  error?: string
  placeholder?: string
  disabled?: boolean
}
```

### Utilisation

```tsx
import { SelectWithImage } from '@/components/ui/select-with-image'

;<SelectWithImage
  id="task-category"
  label="Choisir une catégorie"
  value={categoryId}
  onChange={setCategoryId}
  options={[
    {
      value: '1',
      label: 'Se brosser les dents',
      image: '/images/tooth-brush.png',
      imageAlt: 'Brosse à dents',
    },
    {
      value: '2',
      label: 'Prendre le petit déjeuner',
      image: '/images/breakfast.png',
      imageAlt: 'Petit déjeuner',
    },
  ]}
/>
```

### Fonctionnalités

- ✅ **Images + Labels**: Chaque option affiche image ET texte
- ✅ **Dropdown Natif**: Utilise `<details>/<summary>` (pas JS personnalisé)
- ✅ **Navigation Clavier**:
  - `Enter`/`Space`: Ouvrir/Fermer
  - `Escape`: Fermer
  - `ArrowDown`: Ouvrir et focus
  - `Enter` dans option: Sélectionner
- ✅ **Fermeture automatique**: Clic dehors ferme le dropdown
- ✅ **Accessibilité WCAG 2.2 AA**:
  - `aria-expanded` sur summary
  - `aria-haspopup="listbox"`
  - `role="option"` sur items
  - `aria-selected` sur item sélectionné

### Styling

- Fichier: `SelectWithImage.scss`
- Classes principales:
  - `.select-with-image` : conteneur principal
  - `.select-with-image__summary` : trigger (bouton)
  - `.select-with-image__options` : liste déroulante
  - `.select-with-image__option` : élément de liste
  - `.select-with-image__option-image` : image 28x28px
  - `.select-with-image__option-label` : texte label

### Dimensions d'images

- **Selected preview**: 32x32px
- **Option items**: 28x28px
- **Format recommandé**: PNG/SVG
- **Max size**: 100KB (auto-compression si upload)

### Cas d'usage dans Appli-Picto

- ✅ **Sélection de catégorie de tâche** (page Édition)
- ✅ **Sélection de récompense** par pictogramme
- ✅ **Sélection de ligne de métro** (avec icônes)

---

## Checkbox

**Localisation**: `src/components/ui/checkbox/Checkbox.tsx`

### Description

Composant checkbox custom avec SVG checkmark (pas emoji) et animation rebond.

### Améliorations récentes (Nov 2024)

- ✅ `forwardRef` pour intégration formulaires
- ✅ Checkmark: `✔️` emoji → lucide-react `<Check>` SVG
- ✅ Animation rebond au clic (`scale(1.2)`)
- ✅ Font-family Lexend sur label
- ✅ `displayName` pour debugging

### Props

```typescript
interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'checked' | 'type' | 'size'
  > {
  id: string
  label?: string
  checked: boolean
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  error?: string
  className?: string
  size?: 'sm' | 'md'
}
```

### Utilisation

```tsx
import Checkbox from '@/components/ui/checkbox/Checkbox'

const [agreed, setAgreed] = useState(false)

<Checkbox
  id="terms"
  label="J'accepte les conditions d'utilisation"
  checked={agreed}
  onChange={(e) => setAgreed(e.target.checked)}
  error={agreedError}
  size="md"
/>
```

### Sizes

- `sm`: 16x16px (compact)
- `md`: 20x20px (défaut, mobile), 24x24px (desktop)

### Accessibilité WCAG 2.2 AA

- ✅ `min-height: 44px` sur conteneur
- ✅ Checkmark SVG (pas emoji OS-dépendant)
- ✅ Focus ring visible
- ✅ `aria-invalid` et `aria-describedby` pour erreurs
- ✅ Lexend font sur label
- ✅ Animation accessible: respect `prefers-reduced-motion`

### Styling

- Fichier: `Checkbox.scss`
- Classes principales:
  - `.checkbox-field` : conteneur
  - `.checkbox-field__input` : input checkbox
  - `.checkbox-field__checkmark` : SVG checkmark
  - `.checkbox-field__label` : label texte
  - `.checkbox-field__error` : message d'erreur
  - `.checkbox-field--{size}` : variant size

### Animation rebond

```scss
@keyframes checkbox-bounce {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.checkbox-field__input:checked {
  animation: checkbox-bounce 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## Changements Typographiques Globaux (Nov 2024)

### Font Lexend

Importée depuis Google Fonts pour meilleure accessibilité TSA (distinction I/l/1).

**Implémentation**:

```tsx
// src/app/layout.tsx
<link
  href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

**Appliquée à**:

```scss
// src/styles/base/_typography.scss
label,
button,
input,
select,
textarea {
  font-family: $lexend-font-stack;
}
```

---

## Changements d'Accessibilité Globaux (Nov 2024)

### Anti-Flash de Thème

Script inline dans `<head>` pour éviter flash blanc/noir au chargement (agression sensorielle).

```tsx
// src/app/layout.tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
    (function() {
      const theme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = theme || (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', initialTheme);
    })();
  `,
  }}
/>
```

### Zones Tactiles WCAG 2.2 AA

- ✅ Tous les boutons: `min-height: 44px`
- ✅ Inputs: `min-height: 44px`
- ✅ Toggle password button: `min-width: 44px; min-height: 44px`
- ✅ Checkboxes conteneur: `min-height: 44px`

### Remplacement Emoji par SVG

- ✅ Checkbox checkmark: `✔️` → `<Check>` icon
- ✅ PasswordChecklist: `✅`/`•` → SVG icons
- ✅ ButtonClose: `×` → `<X>` icon
- ✅ Icons: lucide-react pour cohérence

**Raison**: Emoji change selon OS/app (iPad école vs Mac maison) → incohérence visuelle perturbante pour TSA.

---

## Patterns de Validation

### InputWithValidation

**Localisation**: `src/components/shared/input-with-validation/InputWithValidation.tsx`

Wrapper spécialisé pour champs avec règles de validation personnalisées.

```tsx
const validateNotEmpty = makeValidateNotEmpty(t)
const noDoubleSpaces = makeNoDoubleSpaces(t)

<InputWithValidation
  id="task-label"
  value={label}
  onValid={setLabel}
  rules={[validateNotEmpty, noDoubleSpaces]}
  ariaLabel={t('tasks.title')}
/>
```

### PasswordChecklist

**Localisation**: `src/components/ui/password-checklist/PasswordChecklist.tsx`

Affiche critères de validation du mot de passe avec SVG icons.

```tsx
<PasswordChecklist password={password} collapsible={true} defaultOpen={false} />
```

**Critères affichés**:

- ✅ Longueur minimum (8 chars)
- ✅ Minuscule (a-z)
- ✅ Majuscule (A-Z)
- ✅ Chiffre (0-9)
- ✅ Caractère spécial
- ✅ Pas d'espaces

---

## intégration React Hook Form

Tous les composants UI supportent `forwardRef` pour intégration avec React Hook Form:

```tsx
import { useForm, Controller } from 'react-hook-form'
import Button from '@/components/ui/button/Button'
import Input from '@/components/ui/input/Input'
import Checkbox from '@/components/ui/checkbox/Checkbox'

const { register, control, handleSubmit } = useForm()

// Avec register (Input, Select, Checkbox)
<Input {...register('username')} id="username" />

// Avec Controller (composants complexes)
<Controller
  name="agreed"
  control={control}
  render={({ field }) => (
    <Checkbox
      {...field}
      id="agreed"
      label="J'accepte les conditions"
    />
  )}
/>

<Button type="submit" onClick={handleSubmit(onSubmit)}>
  Valider
</Button>
```

---

## Testing

### Composants testés

- ✅ Button (variants, loading state)
- ✅ Input (password toggle, validation)
- ✅ Checkbox (sizes, states)
- ✅ Select (options rendering)

### Commandes

```bash
pnpm test                  # Tous les tests
pnpm test:ui              # UI interactive
pnpm test:coverage        # Coverage report
pnpm test-component Button # Un composant spécifique
```

---

## Checklist d'utilisation

Avant d'utiliser un composant:

- [ ] Vérifier le composant a un `forwardRef` si utilisation avec formulaire
- [ ] Ajouter label explicite (`label` prop ou `<label htmlFor>`)
- [ ] Tester au clavier (Tab, Enter, Escape)
- [ ] Tester avec lecteur d'écran (NVDA/JAWS)
- [ ] Vérifier focus ring visible
- [ ] Tester sur mobile (zone tactile 44x44px)
- [ ] Vérifier `aria-invalid` et `aria-describedby` si erreur possible

---

## Ressources

- **WCAG 2.2 AA**: https://www.w3.org/WAI/WCAG22/quickref/
- **ARIA Authoring Practices**: https://www.w3.org/WAI/ARIA/apg/
- **Lucide Icons**: https://lucide.dev/
- **MDN Form Controls**: https://developer.mozilla.org/en-US/docs/Learn/Forms
- **Lexend Font**: https://fonts.google.com/specimen/Lexend

---

**Dernier auteur**: Claude Code
**Dernière mise à jour**: 28 novembre 2024
**Version**: 2.0 (Accessibilité TSA + SVG + forwardRef)
