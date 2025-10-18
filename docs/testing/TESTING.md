# 🧪 Guide de test - Appli-Picto

## 📋 Stack de tests

### **Technologies utilisées**

| Outil                           | Version | Usage                                |
| ------------------------------- | ------- | ------------------------------------ |
| **Vitest**                      | 3.2.4   | Test runner (remplace Jest)          |
| **React Testing Library**       | 16.3.0  | Tests composants React               |
| **MSW**                         | 2.11.5  | Mock HTTP requests                   |
| **Playwright**                  | 1.56.0  | Tests E2E                            |
| **@testing-library/jest-dom**   | 6.7.0   | Matchers DOM                         |
| **@testing-library/user-event** | 14.6.1  | Simulations interactions utilisateur |

### **Architecture de test**

```
tests/
├── e2e/                          # Tests E2E Playwright
│   ├── demo-visitor.spec.js      # Parcours visiteur démo
│   └── task-completion.spec.js   # Parcours utilisateur authentifié

src/
├── test/
│   ├── mocks/
│   │   ├── data.js               # 📦 Données mock centralisées
│   │   ├── handlers.js           # 🎭 Handlers MSW Supabase
│   │   └── server.js             # ⚙️ Configuration serveur MSW
│   ├── setup.js                  # Configuration globale Vitest
│   └── test-utils.jsx            # Helpers de test (renderWithProviders)
│
├── hooks/**/*.test.js            # Tests unitaires hooks
├── contexts/**/*.test.jsx        # Tests unitaires contexts
├── components/**/*.test.jsx      # Tests unitaires composants
└── pages/**/*.test.jsx           # Tests d'intégration pages
```

---

## 🎯 Types de tests

### **1. Tests unitaires (Vitest + RTL)**

**Localisation** : `src/**/*.test.{js,jsx}`

**Couvrent** :

- ✅ Hooks customs (`useAuth`, `useTaches`, `useRecompenses`, etc.)
- ✅ Contexts (`AuthContext`, `ToastContext`, `PermissionsContext`)
- ✅ Composants UI (`Button`, `Input`, `Checkbox`, etc.)

**Exemple** :

```javascript
// src/components/ui/button/Button.test.jsx
import { render, screen } from '@testing-library/react'
import Button from './Button'

it('renders with correct label', () => {
  render(<Button label="Test" onClick={() => {}} />)
  expect(screen.getByText('Test')).toBeInTheDocument()
})
```

---

### **2. Tests avec MSW (Mock Service Worker)**

**Localisation** : `src/**/*.msw.test.{js,jsx}`

**Couvrent** :

- ✅ Hooks qui appellent Supabase
- ✅ Requêtes HTTP réelles mockées

**Pourquoi MSW ?**

- 🎯 **Mocks HTTP réels** (pas de mock manuel Supabase)
- ✅ **Plus maintenable** (si Supabase change, seuls les handlers changent)
- ✅ **Plus réaliste** (teste vraiment les appels HTTP)

**Exemple** :

```javascript
// src/hooks/useTaches.msw.test.js
import { renderHook, waitFor } from '@testing-library/react'
import useTaches from './useTaches'

// MSW intercepte automatiquement les appels HTTP
it('charge les tâches via MSW', async () => {
  const { result } = renderHook(() => useTaches())

  await waitFor(() => {
    expect(result.current.taches).toHaveLength(3)
  })
})
```

**Configuration MSW** :

- `src/test/mocks/handlers.js` : Handlers Supabase REST API
- `src/test/mocks/data.js` : Données mock
- `src/test/mocks/server.js` : Serveur MSW
- `src/test/setup.js` : Setup automatique

---

### **3. Tests d'intégration (Pages)**

**Localisation** : `src/pages/**/*.test.jsx`

**Couvrent** :

- ✅ Pages complètes avec tous leurs composants
- ✅ Interactions entre composants
- ✅ Flux utilisateur complets au niveau page

**Pourquoi des tests d'intégration ?**

- 🎯 **Testent les interactions réelles** entre composants
- ✅ **Plus proches du comportement utilisateur** que les tests unitaires
- ✅ **Détectent les bugs d'intégration** (props mal passées, états partagés, etc.)

**Exemple** :

```javascript
// src/pages/edition/Edition.test.jsx
import { renderWithProviders } from '@/test/test-utils'
import Edition from './Edition'

it('affiche et masque la section Tâches au clic', async () => {
  const user = userEvent.setup()
  renderWithProviders(<Edition />)

  // Attendre le chargement
  await waitFor(() => {
    expect(screen.getByText('Tâches')).toBeInTheDocument()
  })

  // Cliquer sur le bouton
  const tachesButton = screen.getByText('Tâches').closest('button')
  await user.click(tachesButton)

  // Vérifier que la section apparaît
  await waitFor(() => {
    expect(screen.getByText(/Ajouter une tâche/i)).toBeInTheDocument()
  })
})
```

**Tests d'intégration existants** :

- `src/pages/edition/Edition.test.jsx` : Page d'édition complète (tâches, récompenses, modals)

---

### **4. Tests E2E (Playwright)**

**Localisation** : `tests/e2e/*.spec.js`

**Couvrent** :

- ✅ Parcours utilisateur complets
- ✅ Navigation entre pages
- ✅ Interactions complexes

**Exemple** :

```javascript
// tests/e2e/demo-visitor.spec.js
import { test, expect } from '@playwright/test'

test("visiteur peut tester l'app en mode démo", async ({ page }) => {
  await page.goto('/tableau')

  // Vérifier tâches visibles
  await expect(page.locator('[data-testid="task-card"]').first()).toBeVisible()

  // Valider une tâche
  await page.locator('[data-testid="task-checkbox"]').first().click()
})
```

---

## 🚀 Commandes

### **Tests unitaires (Vitest)**

```bash
# Lancer tous les tests
yarn test

# Mode watch (re-run auto)
yarn test --watch

# UI interactive
yarn test:ui

# Coverage
yarn test:coverage

# Test spécifique
yarn test useTaches

# Test un fichier spécifique
yarn test src/pages/edition/Edition.test.jsx

# Test avec MSW uniquement
yarn test --grep msw
```

---

### **Tests E2E (Playwright)**

```bash
# Lancer tous les tests E2E
yarn test:e2e

# UI interactive (recommandé)
yarn test:e2e:ui

# Mode headed (voir le navigateur)
yarn test:e2e:headed

# Mode debug
yarn test:e2e:debug

# Voir le rapport
yarn test:e2e:report

# Test spécifique
yarn test:e2e demo-visitor
```

---

## 📐 Structure des tests

### **Hooks**

```javascript
// Pattern AAA (Arrange-Act-Assert)
describe('useTaches', () => {
  it('charge les tâches', async () => {
    // Arrange
    const mockData = [...]

    // Act
    const { result } = renderHook(() => useTaches())

    // Assert
    await waitFor(() => {
      expect(result.current.taches).toHaveLength(2)
    })
  })
})
```

---

### **Composants**

```javascript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('gère les clicks', async () => {
  const user = userEvent.setup()
  const handleClick = vi.fn()

  render(<Button label="Click" onClick={handleClick} />)

  await user.click(screen.getByRole('button'))

  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

---

### **Tests avec providers**

```javascript
import { renderWithProviders } from '@/test/test-utils'

it('affiche le user connecté', async () => {
  renderWithProviders(<MyComponent />)

  await waitFor(() => {
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })
})
```

---

## 🎭 MSW : Handlers Supabase

### **Ajouter un endpoint**

```javascript
// src/test/mocks/handlers.js
export const handlers = [
  http.get(`${SUPABASE_URL}/rest/v1/taches`, ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')?.replace('eq.', '')

    const filtered = mockTaches.filter(t => t.user_id === userId)

    return HttpResponse.json(filtered, { status: 200 })
  }),
]
```

### **Override dans un test**

```javascript
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

it('gère les erreurs', async () => {
  // Override pour ce test uniquement
  server.use(
    http.get('http://localhost:54321/rest/v1/taches', () => {
      return HttpResponse.json({ message: 'Error' }, { status: 500 })
    })
  )

  // ... test
})
```

---

## ♿ Tests accessibilité

### **Sélecteurs recommandés**

```javascript
// ✅ GOOD - Accessible pour utilisateurs
screen.getByRole('button', { name: /enregistrer/i })
screen.getByLabelText(/email/i)
screen.getByText(/bienvenue/i)

// ❌ BAD - Implémentation interne
screen.getByClassName('btn-primary')
screen.getByTestId('submit-btn') // OK pour cas complexes seulement
```

---

## 🐛 Debug

### **Vitest**

```javascript
// Afficher le DOM
screen.debug()

// Afficher un élément
screen.debug(screen.getByRole('button'))

// Pause
await waitFor(() => {
  screen.debug()
  expect(true).toBe(false) // Force pause
})
```

### **Playwright**

```bash
# Mode debug (pause à chaque étape)
yarn test:e2e:debug

# UI mode (explorer visuel)
yarn test:e2e:ui

# Voir traces
yarn test:e2e:report
```

---

## 📊 Coverage cible

| Type                | Cible    | Actuel                    |
| ------------------- | -------- | ------------------------- |
| Hooks               | 90%+     | ✅ 95%                    |
| Contexts            | 80%+     | ✅ 85%                    |
| UI Components       | 70%+     | ⚠️ 40%                    |
| Pages (Integration) | 50%+     | 🔄 En cours (Edition: ✅) |
| Utils               | 60%+     | ⚠️ 20%                    |
| **Global**          | **70%+** | **~65%**                  |

### **Tests existants par catégorie**

#### **✅ Tests unitaires complets**

- `src/hooks/**/*.test.js` : ~100 tests couvrant tous les hooks
- `src/contexts/**/*.test.jsx` : ~24 tests pour AuthContext, ToastContext, etc.
- `src/components/ui/**/*.test.jsx` : ~30 tests pour Button, Input, Checkbox, etc.

#### **✅ Tests avec MSW**

- `src/hooks/useTaches.msw.test.js` : Exemple de migration vers MSW
- Infrastructure MSW complète pour tous les endpoints Supabase

#### **✅ Tests d'intégration**

- `src/pages/edition/Edition.test.jsx` : ~10 tests pour la page Edition complète

#### **✅ Tests E2E**

- `tests/e2e/demo-visitor.spec.js` : Parcours visiteur démo
- `tests/e2e/task-completion.spec.js` : Parcours utilisateur authentifié

#### **⚠️ À compléter**

- Tests UI components : Ajouter tests pour composants métier (TachesEdition, RecompensesEdition)
- Tests pages : Ajouter tests intégration pour Tableau, Profil, Abonnement
- Migration MSW : Migrer tests existants vers MSW pour meilleure maintenabilité

---

## 🎯 Best practices

### **DO ✅**

1. **Tester le comportement utilisateur** (pas l'implémentation)

   ```javascript
   // ✅ Test comportement
   await user.click(screen.getByRole('button', { name: /submit/i }))
   expect(screen.getByText('Success')).toBeInTheDocument()

   // ❌ Test implémentation
   expect(component.state.submitted).toBe(true)
   ```

2. **Utiliser MSW pour mocks HTTP**

   ```javascript
   // ✅ MSW (HTTP réel)
   const { result } = renderHook(() => useTaches())

   // ❌ Mock manuel Supabase
   mockSupabase.from.mockReturnValue(...)
   ```

3. **Sélecteurs accessibles**

   ```javascript
   // ✅ Role-based
   screen.getByRole('button')

   // ❌ Test ID (sauf nécessaire)
   screen.getByTestId('my-button')
   ```

### **DON'T ❌**

1. **Ne pas tester React internals**

   ```javascript
   // ❌ Tester state/props
   expect(wrapper.state('count')).toBe(1)

   // ✅ Tester DOM
   expect(screen.getByText('Count: 1')).toBeInTheDocument()
   ```

2. **Ne pas mocker tout**

   ```javascript
   // ❌ Mock inutile
   vi.mock('./MyComponent')

   // ✅ Render réel
   render(<MyComponent />)
   ```

3. **Ne pas oublier cleanup**
   ```javascript
   // ✅ Auto-cleanup avec setup.js
   afterEach(() => server.resetHandlers())
   ```

---

## 🎨 Patterns spécifiques au projet

### **1. Tests de hooks avec providers**

Utiliser `renderWithProviders` pour les composants/hooks qui dépendent des contexts :

```javascript
import { renderWithProviders } from '@/test/test-utils'

it('utilise le contexte auth', async () => {
  renderWithProviders(<MyComponent />)
  // Le composant a accès à AuthContext, ToastContext, etc.
})
```

### **2. Tests MSW avec override**

Pour tester les erreurs ou cas spécifiques, override les handlers dans le test :

```javascript
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

it('gère les erreurs API', async () => {
  server.use(
    http.get('http://localhost:54321/rest/v1/taches', () => {
      return HttpResponse.json({ message: 'Error' }, { status: 500 })
    })
  )
  // Tester le comportement en cas d'erreur
})
```

### **3. Tests avec images**

Mocker les services d'upload d'images :

```javascript
vi.mock('@/lib/services/imageUploadService', () => ({
  checkImageQuota: vi.fn().mockResolvedValue({ canUpload: true }),
  uploadImageWithQuota: vi.fn().mockResolvedValue({
    filePath: 'test-image.jpg',
    publicUrl: 'http://example.com/test-image.jpg',
  }),
}))
```

### **4. Tests de navigation**

Mocker `useNavigate` de react-router-dom :

```javascript
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})
```

### **5. Tests avec RBAC**

Tester les permissions via le hook `useRBAC` :

```javascript
it('affiche le modal de quota si dépassé', async () => {
  // Le hook useRBAC gère automatiquement les vérifications
  // via MSW qui retourne les bonnes données de quotas
  renderWithProviders(<Edition />)
  // Tester le comportement
})
```

---

## 🔗 Ressources

- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW](https://mswjs.io/)
- [Playwright](https://playwright.dev/)
- [Kent C. Dodds - Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## 📞 Support

Pour toute question sur les tests :

1. Lire ce guide
2. Consulter les exemples dans `src/**/*.test.js`
3. Consulter la doc officielle des outils
