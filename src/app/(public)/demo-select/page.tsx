'use client'

import { useState } from 'react'
import { SelectWithImage } from '@/components/ui/select-with-image'
import type { SelectWithImageOption } from '@/components/ui/select-with-image'
import './demo-select.scss'

export default function DemoSelectPage() {
  const [category, setCategory] = useState<number | string>('')
  const [fruit, setFruit] = useState<string>('')
  const [error, setError] = useState<string>('')

  // Exemple 1: Options avec emojis (simule des images)
  const categoryOptions: SelectWithImageOption[] = [
    {
      value: 1,
      label: 'Matin',
      // Pour cette démo, on utilise des data URIs d'emojis
      image:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">🌅</text></svg>',
      imageAlt: 'Soleil levant',
    },
    {
      value: 2,
      label: 'Midi',
      image:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">☀️</text></svg>',
      imageAlt: 'Soleil haut',
    },
    {
      value: 3,
      label: 'Après-midi',
      image:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">🌤️</text></svg>',
      imageAlt: 'Soleil nuages',
    },
    {
      value: 4,
      label: 'Soir',
      image:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">🌙</text></svg>',
      imageAlt: 'Lune',
    },
    {
      value: 5,
      label: 'École',
      image:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">🎒</text></svg>',
      imageAlt: 'Cartable',
    },
  ]

  // Exemple 2: Options texte seulement
  const fruitOptions: SelectWithImageOption[] = [
    { value: 'apple', label: 'Pomme 🍎' },
    { value: 'banana', label: 'Banane 🍌' },
    { value: 'orange', label: 'Orange 🍊' },
    { value: 'grape', label: 'Raisin 🍇' },
    { value: 'strawberry', label: 'Fraise 🍓' },
  ]

  const handleValidate = () => {
    if (!category) {
      setError('Veuillez sélectionner une catégorie')
      return
    }
    setError('')
    alert(`Catégorie: ${category}, Fruit: ${fruit || 'aucun'}`)
  }

  return (
    <div className="demo-select-page">
      <div className="demo-select-page__container">
        <h1 className="demo-select-page__title">
          Démo SelectWithImage (Radix UI)
        </h1>

        <p className="demo-select-page__description">
          Composant de sélection avec support des images, basé sur Radix UI pour
          une accessibilité WCAG 2.2 AA complète.
        </p>

        <div className="demo-select-page__features">
          <h2>✨ Fonctionnalités</h2>
          <ul>
            <li>✅ Images + texte dans les options</li>
            <li>✅ Navigation clavier complète (↑↓ Enter Escape Home End)</li>
            <li>✅ Type-ahead search (tape pour filtrer)</li>
            <li>✅ ARIA complet pour screen readers</li>
            <li>✅ Animations douces (respect prefers-reduced-motion)</li>
            <li>✅ Design TSA-friendly (pastel, doux)</li>
          </ul>
        </div>

        <div className="demo-select-page__examples">
          <div className="demo-select-page__example">
            <h3>Exemple 1 : Avec images (pictogrammes)</h3>
            <SelectWithImage
              id="category-select"
              label="Catégorie de tâche"
              value={category}
              onChange={value => {
                setCategory(value)
                setError('')
              }}
              options={categoryOptions}
              placeholder="Choisissez une catégorie..."
              error={error}
              required
            />
            {category && (
              <p className="demo-select-page__result">
                ✓ Catégorie sélectionnée : <strong>{category}</strong>
              </p>
            )}
          </div>

          <div className="demo-select-page__example">
            <h3>Exemple 2 : Texte seulement</h3>
            <SelectWithImage
              id="fruit-select"
              label="Fruit préféré"
              value={fruit}
              onChange={value => setFruit(String(value))}
              options={fruitOptions}
              placeholder="Sélectionnez un fruit..."
            />
            {fruit && (
              <p className="demo-select-page__result">
                ✓ Fruit sélectionné : <strong>{fruit}</strong>
              </p>
            )}
          </div>

          <div className="demo-select-page__example">
            <h3>Exemple 3 : Désactivé</h3>
            <SelectWithImage
              id="disabled-select"
              label="Select désactivé"
              value=""
              onChange={() => {}}
              options={fruitOptions}
              placeholder="Ce select est désactivé"
              disabled
            />
          </div>
        </div>

        <div className="demo-select-page__actions">
          <button onClick={handleValidate} className="demo-select-page__button">
            Valider la sélection
          </button>
          <button
            onClick={() => {
              setCategory('')
              setFruit('')
              setError('')
            }}
            className="demo-select-page__button demo-select-page__button--secondary"
          >
            Réinitialiser
          </button>
        </div>

        <div className="demo-select-page__keyboard">
          <h2>⌨️ Raccourcis clavier</h2>
          <ul>
            <li>
              <kbd>↑</kbd> <kbd>↓</kbd> : Naviguer entre les options
            </li>
            <li>
              <kbd>Enter</kbd> / <kbd>Space</kbd> : Ouvrir/fermer le dropdown
            </li>
            <li>
              <kbd>Escape</kbd> : Fermer le dropdown
            </li>
            <li>
              <kbd>Home</kbd> / <kbd>End</kbd> : Première/dernière option
            </li>
            <li>
              <kbd>A-Z</kbd> : Type-ahead search (tape "M" → "Matin")
            </li>
          </ul>
        </div>

        <div className="demo-select-page__docs">
          <h2>📚 Documentation</h2>
          <p>
            Consultez le guide complet dans{' '}
            <code>docs/SELECT_WITH_IMAGE_EXAMPLE.md</code>
          </p>
        </div>
      </div>
    </div>
  )
}
