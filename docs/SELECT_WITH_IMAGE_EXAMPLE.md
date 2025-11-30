# SelectWithImage - Guide d'utilisation

## Vue d'ensemble

`SelectWithImage` est un composant de sélection basé sur **Radix UI** qui supporte les **images + texte** dans les options. Parfait pour les pictogrammes dans l'application TSA.

## Fonctionnalités

✅ **Images dans les options** (pictogrammes, icônes)
✅ **Accessibilité WCAG 2.2 AA complète**
✅ **Navigation clavier** (↑↓ Enter Escape Home End)
✅ **Type-ahead search** (tape pour filtrer)
✅ **Screen reader optimisé**
✅ **Animations douces** (respect `prefers-reduced-motion`)

## Import

```tsx
import { SelectWithImage } from '@/components/ui/select-with-image'
import type { SelectWithImageOption } from '@/components/ui/select-with-image'
```

## Exemple basique (texte seulement)

```tsx
'use client'

import { useState } from 'react'
import { SelectWithImage } from '@/components/ui/select-with-image'

export default function BasicExample() {
  const [fruit, setFruit] = useState('')

  const options = [
    { value: 'apple', label: 'Pomme' },
    { value: 'banana', label: 'Banane' },
    { value: 'orange', label: 'Orange' },
  ]

  return (
    <SelectWithImage
      id="fruit-select"
      label="Choisissez un fruit"
      value={fruit}
      onChange={value => setFruit(String(value))}
      options={options}
      placeholder="Sélectionnez..."
    />
  )
}
```

## Exemple avec images (pictogrammes)

```tsx
'use client'

import { useState } from 'react'
import { SelectWithImage } from '@/components/ui/select-with-image'
import type { SelectWithImageOption } from '@/components/ui/select-with-image'

export default function CategorySelectExample() {
  const [category, setCategory] = useState<number | string>('')

  // Options avec images (URLs ou chemins locaux)
  const categoryOptions: SelectWithImageOption[] = [
    {
      value: 1,
      label: 'Matin',
      image: '/images/categories/matin.png',
      imageAlt: 'Icône soleil levant',
    },
    {
      value: 2,
      label: 'Midi',
      image: '/images/categories/midi.png',
      imageAlt: 'Icône soleil haut',
    },
    {
      value: 3,
      label: 'Soir',
      image: '/images/categories/soir.png',
      imageAlt: 'Icône lune',
    },
    {
      value: 4,
      label: 'École',
      image: '/images/categories/ecole.png',
      imageAlt: 'Icône cartable',
    },
  ]

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <SelectWithImage
        id="category-select"
        label="Catégorie de tâche"
        value={category}
        onChange={value => setCategory(value)}
        options={categoryOptions}
        placeholder="Choisissez une catégorie"
        required
      />

      {category && (
        <p style={{ marginTop: '1rem' }}>
          Catégorie sélectionnée : <strong>{category}</strong>
        </p>
      )}
    </div>
  )
}
```

## Exemple avec Signed URLs (Supabase Storage)

```tsx
'use client'

import { useState, useEffect } from 'react'
import { SelectWithImage } from '@/components/ui/select-with-image'
import type { SelectWithImageOption } from '@/components/ui/select-with-image'
import { supabase } from '@/utils/supabaseClient'

export default function TaskSelectWithImages() {
  const [taskId, setTaskId] = useState<number | string>('')
  const [taskOptions, setTaskOptions] = useState<SelectWithImageOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTasks() {
      try {
        // 1. Récupérer les tâches depuis Supabase
        const { data: tasks, error } = await supabase
          .from('taches')
          .select('id, label, imagePath')
          .order('position', { ascending: true })

        if (error) throw error

        // 2. Générer signed URLs pour chaque image
        const options: SelectWithImageOption[] = await Promise.all(
          (tasks || []).map(async task => {
            let imageUrl = undefined

            if (task.imagePath) {
              const { data } = await supabase.storage
                .from('images')
                .createSignedUrl(task.imagePath, 3600) // 1h validity

              imageUrl = data?.signedUrl
            }

            return {
              value: task.id,
              label: task.label,
              image: imageUrl,
              imageAlt: `Pictogramme ${task.label}`,
            }
          })
        )

        setTaskOptions(options)
      } catch (error) {
        console.error('Erreur chargement tâches:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [])

  if (loading) {
    return <p>Chargement des tâches...</p>
  }

  return (
    <SelectWithImage
      id="task-select"
      label="Sélectionner une tâche"
      value={taskId}
      onChange={value => setTaskId(value)}
      options={taskOptions}
      placeholder="Choisissez une tâche avec pictogramme"
    />
  )
}
```

## Exemple avec gestion d'erreur

```tsx
'use client'

import { useState } from 'react'
import { SelectWithImage } from '@/components/ui/select-with-image'

export default function WithValidationExample() {
  const [station, setStation] = useState('')
  const [error, setError] = useState('')

  const stationOptions = [
    {
      value: 'chatelet',
      label: 'Châtelet',
      image: '/images/metro/chatelet.png',
    },
    {
      value: 'republique',
      label: 'République',
      image: '/images/metro/republique.png',
    },
    {
      value: 'bastille',
      label: 'Bastille',
      image: '/images/metro/bastille.png',
    },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!station) {
      setError('Veuillez sélectionner une station')
      return
    }

    setError('')
    console.log('Station sélectionnée:', station)
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '400px' }}>
      <SelectWithImage
        id="station-select"
        label="Station de métro"
        value={station}
        onChange={value => {
          setStation(String(value))
          setError('') // Clear error on change
        }}
        options={stationOptions}
        placeholder="Choisissez une station"
        error={error}
        required
      />

      <button
        type="submit"
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
        }}
      >
        Valider
      </button>
    </form>
  )
}
```

## Props disponibles

```typescript
interface SelectWithImageProps {
  id: string // Required - ID unique pour le composant
  label?: string // Label affiché au-dessus du select
  value: string | number // Valeur sélectionnée (contrôlée)
  onChange: (value: string | number) => void // Callback de changement
  options?: SelectWithImageOption[] // Liste des options
  error?: string // Message d'erreur à afficher
  placeholder?: string // Texte affiché si aucune sélection
  disabled?: boolean // Désactive le select
  required?: boolean // Ajoute astérisque rouge au label
  name?: string // Nom pour formulaires HTML
}

interface SelectWithImageOption {
  value: string | number // Valeur de l'option
  label: string // Texte affiché
  image?: string // URL de l'image (optionnel)
  imageAlt?: string // Alt text pour l'image
}
```

## Accessibilité

Le composant est **WCAG 2.2 AA compliant** :

### Navigation clavier

- **↑/↓** : Naviguer entre les options
- **Enter/Space** : Ouvrir/fermer le dropdown
- **Escape** : Fermer le dropdown
- **Home** : Aller à la première option
- **End** : Aller à la dernière option
- **Type-ahead** : Taper pour filtrer (ex: "P" → "Pomme")

### ARIA

- `aria-invalid` : Signale les erreurs
- `aria-describedby` : Lie le message d'erreur
- `aria-required` : Signale les champs obligatoires
- Support complet screen readers

### Motion

- Respect `prefers-reduced-motion`
- Animations désactivées automatiquement si demandé

## Styling personnalisé

Le composant utilise les variables CSS de ton design system :

```scss
// Variables utilisées (définies dans _variables.scss)
$spacing-xxs // Gap entre éléments
$spacing-xs  // Padding interne
$spacing-sm  // Padding viewport
$font-size-sm // Taille texte erreur
$radius-sm   // Border radius images
$radius-md   // Border radius conteneur
$color-error // Couleur erreur
$transition-fast // Durée animations

// Variables CSS dynamiques
var(--color-text)        // Couleur texte
var(--color-bg)          // Background trigger
var(--color-surface)     // Background dropdown
var(--color-border)      // Bordure
var(--color-hover-bg)    // Hover state
var(--color-focus)       // Focus state
var(--color-primary)     // Couleur primaire
var(--color-primary-light) // Selection
```

## Différences avec l'ancien Select

| Fonctionnalité      | Ancien (custom) | Nouveau (Radix UI) |
| ------------------- | --------------- | ------------------ |
| Images dans options | ❌              | ✅                 |
| Type-ahead search   | ❌              | ✅                 |
| Navigation Home/End | ❌              | ✅                 |
| ARIA complet        | ⚠️ Partiel      | ✅ Complet         |
| Focus management    | ⚠️ Basique      | ✅ Robuste         |
| Portal (z-index)    | ❌              | ✅                 |
| API identique       | -               | ✅ Rétrocompatible |

## Exemples d'utilisation dans le projet

### 1. Sélection de catégorie (Edition)

```tsx
// src/page-components/edition/Edition.tsx
<SelectWithImage
  id="category-select"
  label="Catégorie"
  value={selectedCategory}
  onChange={setSelectedCategory}
  options={categoryOptions}
/>
```

### 2. Sélection de station métro (Profil)

```tsx
// src/page-components/profil/Profil.tsx
<SelectWithImage
  id="metro-station"
  label="Station de métro préférée"
  value={stationId}
  onChange={handleStationChange}
  options={metroStations}
  placeholder="Choisissez une station"
/>
```

### 3. Sélection de pictogramme (Admin)

```tsx
// src/page-components/admin/Admin.tsx
<SelectWithImage
  id="icon-select"
  label="Icône par défaut"
  value={defaultIcon}
  onChange={setDefaultIcon}
  options={iconOptions}
  required
/>
```

## Notes importantes

1. **Images** : Utilise toujours des Signed URLs pour les images privées (Supabase Storage)
2. **Performance** : Limite le nombre d'options à ~50 pour éviter les ralentissements
3. **Mobile** : Testé sur tactile, taille minimale 44px (WCAG)
4. **Thème** : S'adapte automatiquement au thème clair/sombre

## Support

Pour tout bug ou suggestion d'amélioration, ouvre une issue ou contacte l'équipe dev.

---

**Auteur** : Claude Code
**Date** : 28 novembre 2024
**Version** : 1.0.0 (Radix UI)
