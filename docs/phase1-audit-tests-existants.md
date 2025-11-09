# Phase 1 - Audit des Tests Existants

**Date :** 2025-11-09
**Projet :** Appli-Picto
**Stack :** React 19 + Vite + TypeScript + Supabase + Stripe + Cloudflare

---

## 📋 Résumé Exécutif

| Catégorie | État | Détails |
|-----------|------|---------|
| **Frameworks de test** | ✅ Présent | Vitest + Playwright + Testing Library |
| **Tests unitaires** | ✅ Présent | 24 fichiers de tests Vitest |
| **Tests E2E** | ✅ Présent | 3 fichiers de tests Playwright |
| **Configuration test** | ✅ Présent | vitest.config.ts + playwright.config.ts |
| **CI/CD** | ❌ Absent | Aucune configuration détectée |
| **Couverture actuelle** | ⚠️ Non mesurée | Dépendances non installées |

---

## 1. Frameworks de Test Installés

### 1.1 Vitest (Tests Unitaires)

**Package principal :**
- `vitest` : ^3.2.4

**Extensions et utilitaires :**
- `@vitest/coverage-v8` : ^3.2.4
- `jsdom` : ^26.1.0

**Testing Library :**
- `@testing-library/dom` : ^10.4.1
- `@testing-library/jest-dom` : ^6.7.0
- `@testing-library/react` : ^16.3.0
- `@testing-library/user-event` : ^14.6.1

**Mock Service Worker (MSW) :**
- `msw` : ^2.11.5

### 1.2 Playwright (Tests E2E)

**Package principal :**
- `@playwright/test` : ^1.56.0

### 1.3 Autres Dépendances de Test

- `canvas` : ^3.2.0 (pour jsdom)

---

## 2. Scripts npm/yarn Liés aux Tests

### 2.1 Tests Unitaires (Vitest)

```bash
yarn test              # Lancer Vitest en mode watch
yarn test:ui           # Lancer Vitest avec interface UI
yarn test:coverage     # Générer rapport de couverture
```

### 2.2 Tests E2E (Playwright)

```bash
yarn test:e2e          # Lancer tests Playwright
yarn test:e2e:ui       # Interface UI Playwright
yarn test:e2e:headed   # Mode headed (voir le navigateur)
yarn test:e2e:debug    # Mode debug
yarn test:e2e:report   # Afficher le rapport HTML
```

---

## 3. Fichiers de Configuration de Test

### 3.1 Vitest Configuration

**Fichier :** `vitest.config.ts`

**Configuration clé :**
- **Environment :** jsdom
- **Setup files :** `./src/test/setup.ts`
- **Globals :** true
- **Exclusions :**
  - `**/node_modules/**`
  - `**/dist/**`
  - `**/tests/e2e/**` (tests Playwright exclus)
  - Fichiers de config webpack/vite/vitest/etc.

**Alias de chemins :**
- `@` → `src/`
- `@styles` → `src/styles/`

### 3.2 Playwright Configuration

**Fichier :** `playwright.config.ts`

**Configuration clé :**
- **Test directory :** `./tests/e2e`
- **Timeout :** 30s par test
- **Parallélisme :** Activé (`fullyParallel: true`)
- **Retries :** 2 en CI, 0 en local
- **Workers :** 1 en CI, undefined en local
- **Base URL :** `http://localhost:5173`
- **Trace :** `on-first-retry`
- **Screenshot :** `only-on-failure`
- **Video :** `retain-on-failure`

**Navigateurs testés :**
- Desktop: Chromium, Firefox, WebKit
- Mobile: Pixel 5 (Chrome), iPhone 12 (Safari)

**Web Server :**
- Command: `yarn dev`
- Port: 5173
- Timeout: 120s
- Reuse existing server: true (sauf en CI)

### 3.3 Setup de Test

**Fichier :** `src/test/setup.ts`

**Fonctionnalités :**
- Import de `@testing-library/jest-dom`
- Configuration MSW Server (Mock HTTP requests)
  - `beforeAll()` : démarrage du serveur
  - `afterEach()` : reset des handlers
  - `afterAll()` : fermeture du serveur
- Mocks d'APIs navigateur :
  - `ResizeObserver`
  - `IntersectionObserver`
  - `matchMedia`
  - `scrollTo`
- Variables d'environnement Vite pour tests :
  - `VITE_SUPABASE_URL` : `http://localhost:54321`
  - `VITE_SUPABASE_FUNCTIONS_URL` : `http://localhost:54321/functions/v1`
  - `VITE_APP_URL` : `http://localhost:5173`
  - `VITE_APP_ENV` : `test`

### 3.4 Mocks MSW

**Fichiers :**
- `src/test/mocks/server.ts` - Configuration serveur MSW
- `src/test/mocks/handlers.ts` - Request handlers
- `src/test/mocks/data.ts` - Données de test

---

## 4. Inventaire des Fichiers de Test

### 4.1 Tests Unitaires Vitest (24 fichiers)

#### Composants UI (5 tests)
- `src/components/ui/button/Button.test.tsx`
- `src/components/ui/checkbox/Checkbox.test.tsx`
- `src/components/ui/input/Input.test.tsx`
- `src/components/ui/select/Select.test.tsx`
- `src/components/ui/toast/Toast.test.tsx`

#### Contextes (3 tests)
- `src/contexts/AuthContext.test.tsx`
- `src/contexts/PermissionsContext.test.tsx`
- `src/contexts/ToastContext.test.tsx`

#### Hooks (12 tests)
- `src/hooks/useAccountStatus.test.ts`
- `src/hooks/useAdminPermissions.test.ts`
- `src/hooks/useCategories.test.ts`
- `src/hooks/useCategories.msw.test.ts` ⚠️ (avec MSW)
- `src/hooks/useDemoCards.test.ts`
- `src/hooks/useParametres.test.ts`
- `src/hooks/useRBAC.test.tsx`
- `src/hooks/useRecompenses.test.ts`
- `src/hooks/useRecompenses.msw.test.ts` ⚠️ (avec MSW)
- `src/hooks/useSubscriptionStatus.test.ts`
- `src/hooks/useTaches.test.ts`
- `src/hooks/useTaches.msw.test.ts` ⚠️ (avec MSW)
- `src/hooks/useTachesDnd.test.ts`
- `src/hooks/useTachesEdition.test.ts`

#### Pages (3 tests)
- `src/pages/edition/Edition.test.tsx`
- `src/pages/profil/Profil.test.tsx`
- `src/pages/tableau/Tableau.test.tsx`

#### Utilitaires (1 test)
- `src/utils/images/webpConverter.test.ts`

### 4.2 Tests E2E Playwright (3 fichiers)

- `tests/e2e/demo-visitor.spec.ts`
- `tests/e2e/image-upload.spec.ts`
- `tests/e2e/task-completion.spec.ts`

### 4.3 Dossiers __tests__

❌ **Aucun dossier `__tests__` détecté**

**Note :** Le projet utilise la convention de co-localisation des tests avec les fichiers source (ex: `Button.tsx` + `Button.test.tsx` dans le même dossier).

---

## 5. CI/CD

### 5.1 GitHub Actions

❌ **Aucun fichier dans `.github/workflows/`**

### 5.2 Autres CI/CD

❌ **Aucune configuration détectée pour :**
- GitLab CI (`.gitlab-ci.yml`)
- CircleCI (`.circleci/`)
- Travis CI (`.travis.yml`)

---

## 6. Couverture de Code

### 6.1 Configuration

✅ **Package de couverture installé :**
- `@vitest/coverage-v8` : ^3.2.4

✅ **Script de couverture configuré :**
```bash
yarn test:coverage
```

### 6.2 Rapport de Couverture Actuel

⚠️ **Non disponible**

**Raison :** Les dépendances npm ne sont pas installées dans l'environnement d'audit.

**Action requise :** Exécuter `yarn install` puis `yarn test:coverage --run` pour générer le rapport initial.

### 6.3 Dossiers de Couverture

❌ **Aucun dossier `coverage/` détecté**

---

## 7. État des Lieux par Catégorie

### 7.1 Composants UI

| Composant | Test unitaire | Notes |
|-----------|---------------|-------|
| Button | ✅ | `Button.test.tsx` |
| Checkbox | ✅ | `Checkbox.test.tsx` |
| Input | ✅ | `Input.test.tsx` |
| Select | ✅ | `Select.test.tsx` |
| Toast | ✅ | `Toast.test.tsx` |

**Taux de couverture composants UI :** ⚠️ Non mesuré (nécessite `yarn test:coverage`)

### 7.2 Contextes

| Contexte | Test unitaire | Notes |
|----------|---------------|-------|
| AuthContext | ✅ | `AuthContext.test.tsx` |
| PermissionsContext | ✅ | `PermissionsContext.test.tsx` |
| ToastContext | ✅ | `ToastContext.test.tsx` |
| DisplayContext | ❌ | Manquant |

**Contextes testés :** 3/4 (75%)

### 7.3 Hooks

| Hook | Test unitaire | Test avec MSW | Notes |
|------|---------------|---------------|-------|
| useAccountStatus | ✅ | - | Sans appels réseau |
| useAdminPermissions | ✅ | - | Sans appels réseau |
| useCategories | ✅ | ✅ | Avec et sans MSW |
| useDemoCards | ✅ | - | Sans appels réseau |
| useParametres | ✅ | - | Sans appels réseau |
| useRBAC | ✅ | - | Sans appels réseau |
| useRecompenses | ✅ | ✅ | Avec et sans MSW |
| useSubscriptionStatus | ✅ | - | Sans appels réseau |
| useTaches | ✅ | ✅ | Avec et sans MSW |
| useTachesDnd | ✅ | - | Sans appels réseau |
| useTachesEdition | ✅ | - | Sans appels réseau |

**Hooks testés :** 11+ hooks (bonne couverture des hooks critiques)

**Note :** Certains hooks peuvent avoir des tests MSW pour valider les interactions Supabase.

### 7.4 Pages

| Page | Test unitaire | Test E2E | Notes |
|------|---------------|----------|-------|
| Edition | ✅ | ❌ | Test unitaire uniquement |
| Profil | ✅ | ❌ | Test unitaire uniquement |
| Tableau | ✅ | ✅ | Test unitaire + E2E (task-completion.spec.ts) |

**Pages testées (unitaires) :** 3 pages

**Pages testées (E2E) :** 1 page

### 7.5 Tests E2E

| Scénario | Fichier | Notes |
|----------|---------|-------|
| Mode visiteur (démo) | `demo-visitor.spec.ts` | ✅ |
| Upload d'images | `image-upload.spec.ts` | ✅ |
| Complétion de tâches | `task-completion.spec.ts` | ✅ |

**Scénarios E2E couverts :** 3 scénarios critiques

**Navigateurs testés :** Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

### 7.6 Utilitaires

| Utilitaire | Test unitaire | Notes |
|------------|---------------|-------|
| webpConverter | ✅ | `webpConverter.test.ts` |
| Autres utils | ❌ | Non testés |

---

## 8. Observations Générales

### 8.1 Points Forts ✅

1. **Double stratégie de test :** Tests unitaires (Vitest) + Tests E2E (Playwright)
2. **MSW intégré :** Mock Service Worker pour tester les interactions HTTP/Supabase sans backend réel
3. **Testing Library :** Utilisation de React Testing Library pour tests centrés utilisateur
4. **Configuration solide :** Fichiers de config complets et bien structurés
5. **Hooks bien testés :** Les hooks critiques ont des tests (taches, recompenses, categories)
6. **Co-localisation :** Tests à côté des fichiers source (bonne pratique)
7. **Playwright multi-navigateurs :** Tests cross-browser (desktop + mobile)

### 8.2 Points à Améliorer ⚠️

1. **Pas de CI/CD :** Aucune automatisation des tests (GitHub Actions, GitLab CI, etc.)
2. **Couverture non mesurée :** Impossible de connaître le % de code couvert sans installer les dépendances
3. **Contexte DisplayContext non testé :** 1 contexte sur 4 manquant
4. **Tests E2E limités :** Seulement 3 scénarios (peut être étendu)
5. **Utilitaires non testés :** Seul webpConverter a un test, autres utils probablement non testés
6. **Pas de tests de composants métier :** Les composants dans `src/components/taches/`, `src/components/recompenses/`, `src/components/admin/` ne semblent pas avoir de tests

### 8.3 Risques Identifiés 🔴

1. **Pas de validation automatique :** Sans CI/CD, les tests ne sont pas exécutés automatiquement avant merge/déploiement
2. **Couverture inconnue :** Impossible de garantir un niveau minimum de couverture de code
3. **Tests E2E fragiles :** 3 scénarios seulement pour une application complexe (risque de bugs en production)
4. **Composants métier non testés :** Les composants spécifiques au métier (tâches, récompenses, admin) ne semblent pas avoir de tests dédiés

---

## 9. Prochaines Étapes Suggérées

> **Note :** Cette section sera complétée dans les phases suivantes (stratégie de test).

1. Installer les dépendances et générer le rapport de couverture initial
2. Mettre en place un pipeline CI/CD (GitHub Actions recommandé)
3. Définir des seuils de couverture minimum (ex: 80% pour code critique)
4. Étendre les tests E2E aux scénarios utilisateur critiques
5. Ajouter des tests pour les composants métier manquants
6. Tester le contexte DisplayContext

---

## 10. Annexes

### 10.1 Commandes Utiles

```bash
# Tests unitaires
yarn test                   # Mode watch
yarn test:ui               # Interface UI
yarn test:coverage         # Avec couverture

# Tests E2E
yarn test:e2e              # Tous les navigateurs
yarn test:e2e:ui          # Interface UI
yarn test:e2e:headed      # Voir le navigateur
yarn test:e2e:debug       # Mode debug
yarn test:e2e:report      # Rapport HTML

# Linting & Formatting
yarn check                 # Lint + format
yarn lint                  # ESLint
yarn format                # Prettier
```

### 10.2 Structure des Dossiers de Test

```
appli-picto/
├── src/
│   ├── components/
│   │   └── ui/
│   │       ├── button/
│   │       │   ├── Button.tsx
│   │       │   └── Button.test.tsx      ← Tests unitaires co-localisés
│   │       └── ...
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── AuthContext.test.tsx         ← Tests de contextes
│   ├── hooks/
│   │   ├── useTaches.ts
│   │   ├── useTaches.test.ts            ← Tests de hooks
│   │   └── useTaches.msw.test.ts        ← Tests avec MSW
│   ├── pages/
│   │   ├── tableau/
│   │   │   ├── Tableau.tsx
│   │   │   └── Tableau.test.tsx         ← Tests de pages
│   │   └── ...
│   └── test/
│       ├── setup.ts                     ← Setup Vitest
│       └── mocks/
│           ├── server.ts                ← MSW server
│           ├── handlers.ts              ← MSW handlers
│           └── data.ts                  ← Données de test
├── tests/
│   └── e2e/
│       ├── demo-visitor.spec.ts         ← Tests E2E Playwright
│       ├── image-upload.spec.ts
│       └── task-completion.spec.ts
├── vitest.config.ts                     ← Config Vitest
├── playwright.config.ts                 ← Config Playwright
└── package.json                         ← Scripts de test
```

---

**Fin du rapport d'audit - Phase 1**
