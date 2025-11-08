# Installation et configuration de jest-axe

Ce document explique comment installer et configurer jest-axe pour les tests d'accessibilité automatisés.

## Installation

```bash
# Avec Yarn (recommandé pour ce projet)
yarn add -D jest-axe axe-core

# Ou avec npm
npm install --save-dev jest-axe axe-core
```

## Configuration

### 1. Ajouter l'import dans le fichier de setup de test

Modifier `/src/test/setup.ts` :

```typescript
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import * as matchers from '@testing-library/jest-dom/matchers'

// ✅ AJOUT : Importer toHaveNoViolations
import { toHaveNoViolations } from 'jest-axe'

expect.extend(matchers)

// ✅ AJOUT : Étendre expect avec toHaveNoViolations
expect.extend(toHaveNoViolations)

afterEach(() => {
  cleanup()
})

// Mock window.matchMedia pour les tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

### 2. Créer un helper pour les tests d'accessibilité

Le fichier `/src/test/setupAxe.ts` a déjà été créé avec une configuration personnalisée pour WCAG 2.2 AA.

## Exemples de tests

### Test basique avec jest-axe

```typescript
import { render } from '@testing-library/react'
import { axe } from 'jest-axe'
import Button from './Button'

describe('Button - Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<Button label="Click me" onClick={() => {}} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

### Test avec configuration personnalisée

```typescript
import { render } from '@testing-library/react'
import { customAxe } from '@/test/setupAxe'

describe('Modal - Accessibility', () => {
  it('should be accessible with focus management', async () => {
    const { container } = render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
      >
        Content
      </Modal>
    )

    const results = await customAxe(container)
    expect(results).toHaveNoViolations()
  })
})
```

### Test avec règles spécifiques désactivées

```typescript
import { render } from '@testing-library/react'
import { axe } from 'jest-axe'

describe('ComplexComponent - Accessibility', () => {
  it('should pass accessibility checks except color-contrast', async () => {
    const { container } = render(<ComplexComponent />)

    const results = await axe(container, {
      rules: {
        // Désactiver temporairement color-contrast si on sait qu'il y a un problème
        'color-contrast': { enabled: false },
      },
    })

    expect(results).toHaveNoViolations()
  })
})
```

## Composants prioritaires à tester

Selon le rapport d'audit WCAG 2.2 AA, voici les composants à tester en priorité :

### 1. Composants critiques (déjà bons, à maintenir)

```typescript
// src/components/shared/modal/__tests__/Modal.a11y.test.tsx
describe('Modal - Accessibility', () => {
  it('should be fully accessible', async () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test">
        Content
      </Modal>
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('should have correct ARIA attributes', () => {
    const { getByRole } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test">
        Content
      </Modal>
    )

    const dialog = getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby')
  })
})
```

### 2. Composants avec problèmes identifiés

```typescript
// src/components/features/taches/taches-dnd/__tests__/TachesDnd.a11y.test.tsx
describe('TachesDnd - Accessibility', () => {
  it('should have keyboard navigation support', async () => {
    const { container } = render(<TachesDnd taches={mockTaches} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper ARIA roles for drag and drop', () => {
    const { getByRole } = render(<TachesDnd taches={mockTaches} />)
    expect(getByRole('list')).toBeInTheDocument()
  })
})
```

### 3. Composants UI de base

```typescript
// src/components/ui/input/__tests__/Input.a11y.test.tsx
describe('Input - Accessibility', () => {
  it('should associate label correctly', async () => {
    const { container } = render(
      <Input
        id="test-input"
        label="Test Label"
        value=""
        onChange={() => {}}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('should announce errors to screen readers', async () => {
    const { container, rerender } = render(
      <Input
        id="test-input"
        label="Email"
        value="invalid"
        onChange={() => {}}
      />
    )

    rerender(
      <Input
        id="test-input"
        label="Email"
        value="invalid"
        onChange={() => {}}
        error="Email invalide"
      />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
```

## Exécution des tests

```bash
# Tous les tests (unitaires + accessibilité)
yarn test

# Uniquement les tests d'accessibilité
yarn test --grep="Accessibility"

# Avec coverage
yarn test:coverage
```

## Intégration CI/CD

Ajouter dans votre pipeline CI (GitHub Actions, GitLab CI, etc.) :

```yaml
- name: Run accessibility tests
  run: yarn test

- name: Check for accessibility violations
  run: |
    if ! yarn test --reporter=json | jq -e '.failures == 0'; then
      echo "❌ Accessibility tests failed"
      exit 1
    fi
```

## Ressources

- [jest-axe documentation](https://github.com/nickcolley/jest-axe)
- [axe-core rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Testing Library Accessibility](https://testing-library.com/docs/queries/about/#priority)

## Conseils

1. **Tester tôt et souvent** : Ajouter les tests d'accessibilité en même temps que les composants
2. **Ne pas désactiver les règles sans raison** : Si une règle échoue, corriger le problème plutôt que de la désactiver
3. **Tester les états** : Tester les états hover, focus, disabled, error, etc.
4. **Tester le contenu dynamique** : Vérifier que les changements sont annoncés (aria-live)
5. **Combiner avec tests manuels** : jest-axe ne remplace pas les tests manuels avec un lecteur d'écran

---

**Note** : Ce guide a été généré dans le cadre de l'audit d'accessibilité WCAG 2.2 AA du projet Appli-Picto.
