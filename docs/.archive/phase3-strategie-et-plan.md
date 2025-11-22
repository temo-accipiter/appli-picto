# Phase 3 - Stratégie de Tests & Plan d'Action

**Date :** 2025-11-09
**Projet :** Appli-Picto
**Références :**

- Phase 1 - Audit des Tests Existants
- Phase 2 - Cartographie des Parcours Utilisateurs

**Stack :** React 19 + Vite + TypeScript + Supabase + Stripe + Cloudflare

---

## 📋 Résumé Exécutif

Ce document définit la **stratégie complète de tests** pour Appli-Picto, avec recommandations techniques argumentées, matrice de priorités, et plan d'exécution sur 4 phases.

### Gaps Critiques Identifiés

| Catégorie              | Parcours Critiques | Couverture Actuelle | Gap                | Priorité |
| ---------------------- | ------------------ | ------------------- | ------------------ | -------- |
| **Paiements Stripe**   | 5/5                | 0%                  | 🚨 **AUCUN TEST**  | P0       |
| **Authentification**   | 6/6                | 17% (E2E manquants) | 🔴 **CRITIQUE**    | P0       |
| **Suppression Compte** | 1/1                | 0%                  | 🚨 **RGPD**        | P0       |
| **Admin**              | 3/3                | 17%                 | 🔴 **CRITIQUE**    | P0       |
| **Quotas & RBAC**      | 4/4                | 50% (E2E manquants) | 🟠 **IMPORTANT**   | P1       |
| **Drag-and-Drop**      | 1/1                | 0% (E2E)            | 🟠 **IMPORTANT**   | P1       |
| **Accessibilité**      | Tous               | Non testé           | 🟠 **WCAG 2.2 AA** | P1       |

### Objectifs Stratégiques

| Objectif                      | Cible                   | Délai   |
| ----------------------------- | ----------------------- | ------- |
| **Couverture globale**        | 80% → 95%               | Phase 5 |
| **Tests E2E critiques**       | 0% → 100% (37 parcours) | Phase 5 |
| **CI/CD opérationnel**        | 0% → 100%               | Phase 4 |
| **Accessibilité WCAG 2.2 AA** | 0% → 100% tests auto    | Phase 6 |
| **Temps exécution tests**     | N/A → < 10 min (CI)     | Phase 6 |

---

## 🏗️ Architecture de Tests Recommandée

### Vue d'Ensemble : Test Pyramid

```
           /\
          /E2E\          ~40 tests (parcours critiques complets)
         /------\        Playwright + Supabase local + Stripe test
        /  API  \        ~25 tests (edge functions, RPC, webhooks)
       /----------\      Supertest + Stripe CLI
      / MSW/INT   \     ~60 tests (hooks + services intégrés)
     /--------------\    MSW + React Testing Library
    / UNIT/COMPO   \   ~150 tests (logique, composants, utils)
   /------------------\ Vitest + Testing Library
```

**Répartition cible :**

- **Tests unitaires :** 150+ tests (60% du total)
- **Tests intégration (MSW) :** 60 tests (25%)
- **Tests API/Edge Functions :** 25 tests (10%)
- **Tests E2E :** 40 tests (5%)

**Total :** ~275 tests

---

## 🔧 Recommandations Techniques Argumentées

### 1. Framework E2E : Playwright ✅ (Conservé)

**Décision :** Conserver Playwright (déjà installé et configuré).

#### Justification

| Critère            | Playwright                          | Cypress                    | Verdict       |
| ------------------ | ----------------------------------- | -------------------------- | ------------- |
| **Multi-browser**  | ✅ Chromium, Firefox, WebKit        | ⚠️ Chrome + Edge seulement | ✅ Playwright |
| **Mobile testing** | ✅ Device emulation natif           | ❌ Viewport seulement      | ✅ Playwright |
| **Traces & Debug** | ✅ Trace viewer, vidéo, screenshots | ✅ Time travel debugging   | ⚖️ Équivalent |
| **Performance**    | ✅ Plus rapide (parallel)           | ⚠️ Plus lent               | ✅ Playwright |
| **API testing**    | ✅ Built-in (`request`)             | ⚠️ Plugin externe          | ✅ Playwright |
| **Configuration**  | ✅ Déjà configuré                   | ❌ Migration nécessaire    | ✅ Playwright |
| **Communauté**     | ✅ Microsoft, très actif            | ✅ Très actif              | ⚖️ Équivalent |

**Avantages spécifiques Appli-Picto :**

- ✅ Configuration déjà optimale (`playwright.config.ts`)
- ✅ 3 tests E2E existants fonctionnels
- ✅ Multi-browser critique pour accessibilité (Safari ITP, Firefox tracking)
- ✅ Mobile testing important (app TSA sur tablettes)
- ✅ API testing pour webhooks Stripe

**Actions :**

- ✅ **Conserver Playwright**
- ⏩ Optimiser configuration pour Supabase local
- ⏩ Ajouter fixtures pour auth + seed data

---

### 2. Intégration Supabase : Stratégie Hybride

**Décision :** Supabase Local (E2E) + MSW (Unitaires/Intégration).

#### Option 1 : Supabase Local avec Docker ✅ **RECOMMANDÉ (E2E)**

**Avantages :**

- ✅ Base de données PostgreSQL réelle (pas de mocks)
- ✅ RLS policies testées (sécurité critique)
- ✅ Realtime Supabase fonctionnel
- ✅ Edge Functions locales (webhooks Stripe)
- ✅ Storage local (tests upload images)
- ✅ Isolation complète (pas d'interférence CI)

**Inconvénients :**

- ⚠️ Setup initial (~1-2 jours)
- ⚠️ Temps démarrage Docker (~10s)
- ⚠️ Seed data nécessaire pour chaque test suite

**Implémentation :**

```yaml
# docker-compose.test.yml
services:
  supabase-db:
    image: supabase/postgres:15.1.0.117
    environment:
      POSTGRES_PASSWORD: postgres
    ports:
      - '54322:5432'

  supabase-studio:
    image: supabase/studio:latest
    ports:
      - '54323:3000'

  supabase-auth:
    image: supabase/gotrue:latest
    # ...
```

**Setup script :**

```bash
# scripts/test-e2e-setup.sh
#!/bin/bash
docker-compose -f docker-compose.test.yml up -d
npx supabase db reset --local
npx supabase db seed --local
yarn test:e2e
docker-compose -f docker-compose.test.yml down
```

**Configuration Playwright :**

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: [
    {
      command: 'docker-compose -f docker-compose.test.yml up',
      port: 54322,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'yarn dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
```

#### Option 2 : MSW (Mock Service Worker) ✅ **DÉJÀ EN PLACE (Unitaires)**

**Avantages :**

- ✅ Déjà configuré (`src/test/mocks/`)
- ✅ Rapide (pas de réseau)
- ✅ Isolation parfaite
- ✅ Tests déterministes

**Inconvénients :**

- ❌ Ne teste pas RLS (sécurité)
- ❌ Ne teste pas Realtime
- ❌ Ne teste pas Edge Functions

**Usage :** Conserver pour tests unitaires/intégration hooks.

#### Option 3 : Shadow DB (Branch Previews) ⚠️ **NON RECOMMANDÉ**

**Problème :** Supabase ne supporte pas nativement les "shadow databases" comme Prisma. Nécessiterait scripting custom (create/destroy project par CI run) → complexité excessive.

**Verdict :**

- ✅ **E2E : Supabase Local (Docker)**
- ✅ **Unitaires/Intégration : MSW (déjà en place)**

---

### 3. Intégration Stripe : Test Mode + Webhooks CLI

**Décision :** Stripe Test Mode + `stripe-cli` (webhooks locaux).

#### Option 1 : Stripe Test Mode + CLI ✅ **RECOMMANDÉ**

**Avantages :**

- ✅ API Stripe réelle en mode test (100% fidèle)
- ✅ Webhooks locaux via `stripe listen --forward-to`
- ✅ Checkout Sessions réelles
- ✅ Billing Portal réel
- ✅ Idempotence testée (retry webhooks)
- ✅ Gratuit (mode test)

**Inconvénients :**

- ⚠️ Nécessite clés API test (env variables)
- ⚠️ `stripe-cli` requis en CI
- ⚠️ Latence réseau (mais acceptables en test)

**Implémentation :**

```bash
# scripts/test-stripe-setup.sh
#!/bin/bash

# Installer Stripe CLI (si pas déjà fait)
if ! command -v stripe &> /dev/null; then
  echo "Installing Stripe CLI..."
  # macOS
  brew install stripe/stripe-cli/stripe
  # Linux
  # wget https://github.com/stripe/stripe-cli/releases/download/v1.19.0/stripe_1.19.0_linux_x86_64.tar.gz
fi

# Login Stripe (interactive, une fois)
# stripe login

# Écouter webhooks locaux (background)
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook \
  --latest &

STRIPE_PID=$!
echo $STRIPE_PID > .stripe-cli.pid

# Attendre webhook ready
sleep 5

# Lancer tests
yarn test:e2e --grep="Stripe"

# Cleanup
kill $STRIPE_PID
rm .stripe-cli.pid
```

**Variables d'environnement test :**

```bash
# .env.test
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx # Généré par stripe listen
```

**Tests Playwright :**

```typescript
// tests/e2e/stripe-checkout.spec.ts
test('should create checkout session and activate subscription', async ({
  page,
}) => {
  // 1. Login
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // 2. Aller sur page abonnement
  await page.goto('/abonnement')
  await page.click('button:has-text("S\'abonner")')

  // 3. Attendre redirect Stripe Checkout
  await page.waitForURL(/checkout\.stripe\.com/)

  // 4. Remplir formulaire Stripe Test (carte test 4242 4242 4242 4242)
  const stripeFrame = page.frameLocator('iframe').first()
  await stripeFrame.locator('[name="cardNumber"]').fill('4242424242424242')
  await stripeFrame.locator('[name="cardExpiry"]').fill('12/34')
  await stripeFrame.locator('[name="cardCvc"]').fill('123')
  await stripeFrame.locator('[name="billingName"]').fill('Test User')

  // 5. Soumettre paiement
  await page.click('button:has-text("Subscribe")')

  // 6. Attendre redirect success_url
  await page.waitForURL('/abonnement?session_id=*')

  // 7. Vérifier webhook reçu (attendre max 10s)
  await page.waitForTimeout(10000)

  // 8. Vérifier DB updated (rôle abonné)
  const { data } = await supabase
    .from('user_roles')
    .select('role_name')
    .eq('user_id', userId)
    .single()

  expect(data?.role_name).toBe('abonne')

  // 9. Vérifier UI (quotas augmentés)
  await expect(page.locator('text=40 tâches')).toBeVisible()
})
```

#### Option 2 : stripe-mock ⚠️ **NON RECOMMANDÉ**

**Problèmes :**

- ❌ Incomplet (ne supporte pas tous endpoints)
- ❌ Checkout Sessions limité
- ❌ Pas de Billing Portal
- ❌ Webhooks simplifiés (pas de retry)

**Verdict :**

- ✅ **Stripe Test Mode + stripe-cli**

---

### 4. Outils Accessibilité : @axe-core/playwright

**Décision :** `@axe-core/playwright` (intégration Playwright).

#### Comparaison

| Outil                    | Intégration         | Règles WCAG        | CI-friendly | Verdict           |
| ------------------------ | ------------------- | ------------------ | ----------- | ----------------- |
| **@axe-core/playwright** | ✅ Playwright       | ✅ WCAG 2.2 AA/AAA | ✅ Oui      | ✅ **RECOMMANDÉ** |
| **jest-axe**             | ⚠️ Vitest seulement | ✅ WCAG 2.2        | ✅ Oui      | ⚖️ Complément     |
| **pa11y**                | ❌ CLI séparé       | ✅ WCAG 2.2        | ⚠️ Complexe | ❌                |

**Implémentation :**

```bash
yarn add -D @axe-core/playwright
```

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility WCAG 2.2 AA', () => {
  test('should not have accessibility violations on homepage', async ({
    page,
  }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should not have violations on drag-and-drop board', async ({
    page,
  }) => {
    await page.goto('/tableau')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .exclude('#non-critical-banner') // Exclure éléments tiers si nécessaire
      .analyze()

    expect(results.violations).toEqual([])
  })
})
```

**Règles testées automatiquement :**

- Contraste couleurs (WCAG 2.2 AA : 4.5:1 texte, 3:1 UI)
- Labels ARIA manquants
- Landmarks HTML5
- Keyboard navigation
- Focus visible
- Alt text images
- Structure headings (h1, h2, h3 logiques)

**Actions :**

- ⏩ Installer `@axe-core/playwright`
- ⏩ Créer test suite accessibilité (1 test par page critique)
- ⏩ Ajouter à CI (fail si violations)

---

### 5. Régression Visuelle : Playwright Screenshots + Percy (optionnel)

**Décision :** Playwright Screenshots (gratuit) + Percy si budget.

#### Option 1 : Playwright Screenshots ✅ **GRATUIT, RECOMMANDÉ**

**Avantages :**

- ✅ Gratuit
- ✅ Intégré Playwright
- ✅ Diff visuel automatique
- ✅ Multi-browser/device
- ✅ CI-friendly

**Inconvénients :**

- ⚠️ Stockage screenshots (Git LFS ou artifacts)
- ⚠️ Baseline manual (première exécution)
- ⚠️ Pas de dashboard web

**Implémentation :**

```typescript
// tests/e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('should match homepage screenshot', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100, // Tolérance 100 pixels différents
    })
  })

  test('should match drag-and-drop board', async ({ page }) => {
    await page.goto('/tableau')
    await page.waitForSelector('[data-testid="train-progression"]')
    await expect(page).toHaveScreenshot('tableau-board.png', {
      fullPage: true,
    })
  })
})
```

**Commandes :**

```bash
# Première exécution → génère baselines
yarn test:e2e --update-snapshots

# Exécutions suivantes → compare avec baselines
yarn test:e2e

# Si différences acceptables → update baselines
yarn test:e2e --update-snapshots
```

#### Option 2 : Percy (Browserstack) ⚠️ **PAYANT (~$400/mois)**

**Avantages :**

- ✅ Dashboard web élégant
- ✅ Review workflow (approve/reject)
- ✅ Intégration GitHub (PR comments)
- ✅ Baseline auto par branche

**Inconvénients :**

- ❌ Payant (gratuit limité à 5,000 screenshots/mois)
- ⚠️ Vendor lock-in

**Verdict :**

- ✅ **Phase 6 : Playwright Screenshots (gratuit)**
- 🟡 **Phase 7 (optionnel) : Migrer vers Percy si budget**

---

## 📊 Matrice de Priorités (Impact × Effort)

### Légende

**Impact :**

- 🔴 **Critique :** Bloquant production, perte données, non-conformité RGPD
- 🟠 **Important :** Dégradation UX majeure, risque financier
- 🟡 **Utile :** Amélioration qualité, confort développeur

**Effort :**

- 🟢 **Faible :** < 1 jour
- 🟡 **Moyen :** 1-3 jours
- 🔴 **Élevé :** > 3 jours

### Matrice Visuelle

```
Impact
  ^
  |
🔴|  P0-1 CI/CD       P0-2 Stripe E2E     P0-3 Auth E2E
  |  (🔴 🟢)          (🔴 🔴)             (🔴 🟡)
  |
🟠|  P1-1 Quotas      P1-2 A11y           P0-4 Delete Account
  |  (🟠 🟡)          (🟠 🟡)             (🔴 🟡)
  |
🟡|  P2-1 Visual      P2-2 Perf           P2-3 Mobile
  |  (🟡 🟡)          (🟡 🔴)             (🟡 🔴)
  |
  +------------------------------------------------> Effort
     🟢 Faible       🟡 Moyen            🔴 Élevé
```

---

## 🎯 Plan d'Action Priorisé

### P0 - Critique (Bloquer Production)

#### P0-1 : CI/CD Setup (🔴 Impact / 🟢 Effort : 1-2 jours)

**Objectif :** Pipeline automatisé lint → test → build → deploy.

**Actions :**

1. **Créer `.github/workflows/ci.yml` :**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.19.4'
          cache: 'yarn'
      - run: yarn install --immutable
      - run: yarn lint

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.19.4'
          cache: 'yarn'
      - run: yarn install --immutable
      - run: yarn test:coverage --run
      - uses: codecov/codecov-action@v4 # Upload coverage

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.19.4'
          cache: 'yarn'
      - run: yarn install --immutable
      - run: yarn build

  test-e2e:
    runs-on: ubuntu-latest
    needs: [lint, test-unit, build]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.19.4'
          cache: 'yarn'
      - run: yarn install --immutable
      - run: npx playwright install --with-deps
      - run: docker-compose -f docker-compose.test.yml up -d
      - run: yarn test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
      - run: docker-compose -f docker-compose.test.yml down
```

2. **Ajouter seuils de couverture (`vitest.config.ts`) :**

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/test/**',
      ],
    },
  },
})
```

3. **Badge coverage README :**

```markdown
[![Coverage](https://codecov.io/gh/temo-accipiter/appli-picto/branch/main/graph/badge.svg)](https://codecov.io/gh/temo-accipiter/appli-picto)
```

**Validation :** Pipeline green sur PR test.

**Estimation :** 1-2 jours

---

#### P0-2 : Tests E2E Stripe Complet (🔴 Impact / 🔴 Effort : 3-4 jours)

**Objectif :** Couvrir 5 parcours Stripe critiques (0% → 100%).

**Tests à créer :**

1. **`stripe-checkout.spec.ts`** (Création session + paiement)
   - Login utilisateur free
   - Clic "S'abonner"
   - Redirect Stripe Checkout
   - Remplissage carte test `4242 4242 4242 4242`
   - Soumission paiement
   - Vérification redirect `success_url`
   - **Attente webhook** `checkout.session.completed` (max 10s)
   - Vérification DB : `abonnements.status = 'active'`
   - Vérification rôle upgrade : `user_roles.role_name = 'abonne'`
   - Vérification UI : quotas augmentés (40 tâches)

2. **`stripe-webhook-idempotence.spec.ts`** (Idempotence webhooks)
   - Créer abonnement
   - Simuler webhook `customer.subscription.updated` (retry Stripe)
   - Envoyer même event 2× avec même `event.id`
   - Vérifier 2ème appel skipped (champ `last_event_id`)
   - Vérifier pas de duplicate DB

3. **`stripe-billing-portal.spec.ts`** (Gestion abonnement)
   - Login utilisateur abonné
   - Aller `/abonnement`
   - Clic "Gérer abonnement"
   - Redirect Billing Portal Stripe
   - Vérification URL `billing.stripe.com`
   - (Optionnel) Clic "Annuler abonnement" → vérifier `cancel_at_period_end = true`

4. **`stripe-subscription-cancel.spec.ts`** (Annulation)
   - Abonnement actif
   - Via Billing Portal : annuler abonnement
   - Webhook `customer.subscription.updated` (`cancel_at_period_end = true`)
   - Vérifier DB : `abonnements.cancel_at_period_end = true`
   - Vérifier UI : bannière "Expire le XX/XX/XXXX"

5. **`stripe-subscription-expired.spec.ts`** (Expiration)
   - Abonnement annulé (end date passée)
   - Webhook `customer.subscription.deleted`
   - Vérifier DB : `abonnements.status = 'canceled'`
   - Vérifier rôle downgrade : `user_roles.role_name = 'free'`
   - Vérifier UI : quotas réduits (5 tâches)
   - Tâches existantes au-delà quota → read-only (pas de suppression)

**Setup requis :**

```bash
# .env.test
VITE_STRIPE_PUBLIC_KEY=pk_test_51xxxxx
STRIPE_SECRET_KEY=sk_test_51xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx # stripe listen
```

```bash
# scripts/test-stripe.sh
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook --latest &
yarn test:e2e --grep="Stripe"
kill $(jobs -p)
```

**Validation :** 5/5 tests Stripe passent en CI.

**Estimation :** 3-4 jours

---

#### P0-3 : Tests E2E Authentification Complet (🔴 Impact / 🟡 Effort : 2-3 jours)

**Objectif :** Couvrir 6 parcours Auth (17% → 100%).

**Tests à créer :**

1. **`auth-signup.spec.ts`** (Inscription + Email)
   - Remplir formulaire signup (email + password)
   - Valider CAPTCHA Turnstile (mode test)
   - Soumettre
   - Vérifier redirect `/login`
   - Vérifier email envoyé (mock SMTP ou Supabase local)
   - Extraire lien confirmation
   - Cliquer lien → vérification email
   - Vérifier account activé (`profiles.email_confirmed_at` NOT NULL)

2. **`auth-login.spec.ts`** (Connexion)
   - Remplir email + password
   - Soumettre
   - Vérifier redirect `/tableau` (ou `/edition` selon rôle)
   - Vérifier session JWT stockée (cookies)
   - Vérifier UI : nom utilisateur affiché

3. **`auth-logout.spec.ts`** (Déconnexion)
   - Login
   - Clic "Déconnexion"
   - Vérifier redirect `/login`
   - Vérifier session supprimée (cookies)
   - Tentative accès `/edition` → redirect `/login`

4. **`auth-forgot-password.spec.ts`** (Mot de passe oublié)
   - Aller `/forgot-password`
   - Saisir email
   - Soumettre
   - Vérifier email envoyé (lien reset)
   - Extraire lien
   - Vérifier redirect `/reset-password#type=recovery`

5. **`auth-reset-password.spec.ts`** (Réinitialisation)
   - Utiliser lien recovery (mock ou réel)
   - Aller `/reset-password#type=recovery`
   - Saisir nouveau password
   - Soumettre
   - Vérifier redirect `/login`
   - Login avec nouveau password → succès

6. **`auth-session-recovery.spec.ts`** (Récupération session)
   - Login
   - Fermer navigateur (simuler)
   - Rouvrir → vérifier session restaurée
   - Utilisateur toujours connecté (pas de redirect `/login`)
   - Timeout 5s respecté (pas de deadlock)

**Fixture Auth :**

```typescript
// tests/e2e/fixtures/auth.ts
import { test as base } from '@playwright/test'

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login automatique avant chaque test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/tableau')
    await use(page)
    // Logout après test
    await page.click('button:has-text("Déconnexion")')
  },
})
```

**Validation :** 6/6 tests Auth passent.

**Estimation :** 2-3 jours

---

#### P0-4 : Test E2E Suppression Compte RGPD (🔴 Impact / 🟡 Effort : 1-2 jours)

**Objectif :** Tester parcours suppression compte (RGPD critique).

**Test :**

```typescript
// tests/e2e/account-deletion.spec.ts
import { test, expect } from './fixtures/auth'

test.describe('Account Deletion (RGPD)', () => {
  test('should delete account and all user data', async ({
    authenticatedPage: page,
  }) => {
    const userId = await getUserId(page) // Helper

    // 1. Créer données test (tâches, récompenses, images)
    await page.goto('/edition')
    await createTestTask(page, 'Test Task', 'task.png')
    await createTestReward(page, 'Test Reward', 'reward.png')

    // 2. Aller page profil
    await page.goto('/profil')

    // 3. Clic "Supprimer mon compte"
    await page.click('button:has-text("Supprimer mon compte")')

    // 4. Confirmation modale
    await expect(page.locator('dialog')).toBeVisible()
    await expect(page.locator('text=irréversible')).toBeVisible()

    // 5. Validation CAPTCHA Turnstile
    await solveTurnstileCaptcha(page) // Helper mode test

    // 6. Confirmation finale
    await page.fill('input[placeholder="Tapez SUPPRIMER"]', 'SUPPRIMER')
    await page.click('button:has-text("Confirmer la suppression")')

    // 7. Attendre suppression (peut prendre 5-10s)
    await page.waitForURL('/login', { timeout: 15000 })

    // 8. Vérifier toast "Compte supprimé"
    await expect(page.locator('text=Compte supprimé avec succès')).toBeVisible()

    // 9. Vérifier DB : toutes données supprimées
    const { data: tasks } = await supabase
      .from('taches')
      .select('*')
      .eq('user_id', userId)
    expect(tasks).toEqual([])

    const { data: rewards } = await supabase
      .from('recompenses')
      .select('*')
      .eq('user_id', userId)
    expect(rewards).toEqual([])

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
    expect(profile).toEqual([])

    // 10. Vérifier Storage : images supprimées
    const { data: images } = await supabase.storage
      .from('images')
      .list(`${userId}/`)
    expect(images).toEqual([])

    // 11. Vérifier Auth : utilisateur supprimé
    const { data: authUser, error } =
      await supabase.auth.admin.getUserById(userId)
    expect(error?.message).toContain('not found')

    // 12. Tentative login → erreur
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    await expect(
      page.locator('text=Email ou mot de passe incorrect')
    ).toBeVisible()
  })

  test('should cancel scheduled deletion', async ({
    authenticatedPage: page,
  }) => {
    // 1. Programmer suppression (30 jours)
    await page.goto('/profil')
    await page.click('button:has-text("Programmer la suppression")')
    await page.click('button:has-text("Confirmer")')

    // 2. Vérifier bannière "Suppression prévue le XX/XX"
    await expect(page.locator('text=/Suppression prévue le/')).toBeVisible()

    // 3. Annuler suppression
    await page.click('button:has-text("Annuler la suppression")')

    // 4. Vérifier DB : account_status = 'active'
    const userId = await getUserId(page)
    const { data } = await supabase
      .from('profiles')
      .select('account_status, deletion_scheduled_at')
      .eq('id', userId)
      .single()

    expect(data.account_status).toBe('active')
    expect(data.deletion_scheduled_at).toBeNull()
  })
})
```

**Validation :** Suppression complète testée (DB + Storage + Auth).

**Estimation :** 1-2 jours

---

#### P0-5 : Mesure Coverage Baseline (🔴 Impact / 🟢 Effort : 0.5 jour)

**Objectif :** Mesurer couverture actuelle et fixer seuils.

**Actions :**

1. **Exécuter coverage :**

```bash
yarn install
yarn test:coverage --run
```

2. **Analyser rapport (`coverage/index.html`) :**
   - Identifier fichiers < 50% coverage
   - Identifier fonctions critiques non testées

3. **Fixer seuils initiaux :**

```typescript
// vitest.config.ts
coverage: {
  statements: 60, // Baseline actuel (augmenter progressivement)
  branches: 55,
  functions: 60,
  lines: 60,
}
```

4. **Commit baseline :**

```bash
git add coverage/.gitkeep
git commit -m "chore: add coverage baseline"
```

**Validation :** Coverage reporté dans CI.

**Estimation :** 0.5 jour

---

### P1 - Important (Avant Production)

#### P1-1 : Tests E2E Quotas & Upgrade Flow (🟠 Impact / 🟡 Effort : 2-3 jours)

**Objectif :** Tester gestion quotas + flow upgrade.

**Tests :**

1. **`quotas-task-limit.spec.ts`** (Blocage création tâche)
   - Login compte free
   - Créer 5 tâches (limite mensuelle)
   - Tentative 6ème tâche → modal "Quota atteint"
   - Vérifier bouton "Passer Premium"
   - Vérifier `canCreateTask() === false`

2. **`quotas-upgrade-flow.spec.ts`** (Upgrade → quotas augmentés)
   - Compte free avec 5 tâches
   - Clic "Passer Premium"
   - Checkout Stripe → paiement
   - Webhook → rôle upgrade
   - Vérifier quotas augmentés : 40 tâches
   - Créer 6ème tâche → succès

3. **`quotas-realtime-sync.spec.ts`** (Mise à jour temps réel)
   - Ouvrir 2 onglets (même utilisateur)
   - Onglet 1 : créer tâche
   - Onglet 2 : vérifier quota mis à jour (Realtime)
   - Indicateur "4/5 tâches" → "5/5 tâches"

**Validation :** Quotas correctement appliqués.

**Estimation :** 2-3 jours

---

#### P1-2 : Tests Accessibilité WCAG 2.2 AA (🟠 Impact / 🟡 Effort : 2-3 jours)

**Objectif :** Tester 100% pages critiques avec axe-core.

**Tests :**

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const pages = [
  { path: '/', name: 'Homepage' },
  { path: '/tableau', name: 'Task Board' },
  { path: '/login', name: 'Login' },
  { path: '/signup', name: 'Signup' },
  { path: '/edition', name: 'Edition (auth)', auth: true },
  { path: '/profil', name: 'Profile (auth)', auth: true },
  { path: '/abonnement', name: 'Subscription (auth)', auth: true },
]

for (const { path, name, auth } of pages) {
  test(`${name} should have no WCAG 2.2 AA violations`, async ({ page }) => {
    if (auth) {
      await loginUser(page)
    }

    await page.goto(path)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze()

    // Log violations si présentes
    if (results.violations.length > 0) {
      console.log(`Violations found on ${name}:`, results.violations)
    }

    expect(results.violations).toEqual([])
  })
}

test('Drag-and-Drop should be keyboard accessible', async ({ page }) => {
  await page.goto('/tableau')

  // Focus première tâche
  await page.keyboard.press('Tab')
  await expect(page.locator('[data-testid="task-1"]')).toBeFocused()

  // Activer drag avec Espace
  await page.keyboard.press('Space')

  // Déplacer avec flèches
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')

  // Déposer avec Espace
  await page.keyboard.press('Space')

  // Vérifier ordre changé
  const firstTask = await page.locator('[data-testid="task-1"]')
  expect(await firstTask.getAttribute('data-position')).toBe('2')
})
```

**Validation :** 0 violations WCAG 2.2 AA.

**Estimation :** 2-3 jours

---

#### P1-3 : Tests E2E Drag-and-Drop (🟠 Impact / 🟢 Effort : 1-2 jours)

**Objectif :** Tester réorganisation tâches.

**Test :**

```typescript
// tests/e2e/drag-and-drop.spec.ts
test('should reorder tasks via drag and drop', async ({ page }) => {
  await page.goto('/tableau')

  // Vérifier ordre initial
  const tasks = await page.locator('[data-testid^="task-"]').all()
  expect(await tasks[0].textContent()).toBe('Tâche 1')
  expect(await tasks[1].textContent()).toBe('Tâche 2')

  // Drag Tâche 1 → position Tâche 3
  await page.dragAndDrop('[data-testid="task-1"]', '[data-testid="task-3"]')

  // Attendre animation (300ms)
  await page.waitForTimeout(500)

  // Vérifier nouvel ordre UI
  const tasksAfter = await page.locator('[data-testid^="task-"]').all()
  expect(await tasksAfter[0].textContent()).toBe('Tâche 2')
  expect(await tasksAfter[1].textContent()).toBe('Tâche 3')
  expect(await tasksAfter[2].textContent()).toBe('Tâche 1')

  // Attendre sauvegarde DB (batch 100ms)
  await page.waitForTimeout(1000)

  // Recharger page → ordre persisté
  await page.reload()
  await page.waitForLoadState('networkidle')

  const tasksPersisted = await page.locator('[data-testid^="task-"]').all()
  expect(await tasksPersisted[2].textContent()).toBe('Tâche 1')
})
```

**Validation :** Drag-and-drop fonctionnel + persisté.

**Estimation :** 1-2 jours

---

#### P1-4 : Tests E2E Admin Permissions (🟠 Impact / 🟢 Effort : 1-2 jours)

**Objectif :** Tester gestion permissions admin.

**Tests :**

1. **`admin-permissions-assign.spec.ts`**
2. **`admin-role-change.spec.ts`**
3. **`admin-logs-view.spec.ts`**

**Validation :** Admin peut gérer utilisateurs.

**Estimation :** 1-2 jours

---

#### P1-5 : Supabase Local Setup (🟠 Impact / 🟡 Effort : 1-2 jours)

**Objectif :** Docker Compose pour tests E2E.

**Fichiers :**

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres:
    image: supabase/postgres:15.1.0.117
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    ports:
      - '54322:5432'
    volumes:
      - ./supabase/migrations:/docker-entrypoint-initdb.d

  gotrue:
    image: supabase/gotrue:v2.99.0
    depends_on:
      - postgres
    environment:
      GOTRUE_DB_DATABASE_URL: postgres://postgres:postgres@postgres:5432/postgres
      GOTRUE_SITE_URL: http://localhost:5173
    ports:
      - '54321:9999'
```

**Script seed :**

```sql
-- supabase/seeds/test-data.sql
INSERT INTO profiles (id, email, created_at) VALUES
  ('test-user-1', 'test@example.com', NOW());

INSERT INTO user_roles (user_id, role_name) VALUES
  ('test-user-1', 'free');
```

**Validation :** Docker up → tests passent.

**Estimation :** 1-2 jours

---

### P2 - Nice to Have (Optimisations)

#### P2-1 : Régression Visuelle (🟡 Impact / 🟡 Effort : 2-3 jours)

**Tests screenshots Playwright.**

**Estimation :** 2-3 jours

---

#### P2-2 : Tests Performance (🟡 Impact / 🔴 Effort : 3-5 jours)

**Lighthouse CI, Web Vitals.**

**Estimation :** 3-5 jours

---

#### P2-3 : Tests Mobile Natifs (🟡 Impact / 🔴 Effort : 5-7 jours)

**Playwright mobile emulation avancé.**

**Estimation :** 5-7 jours

---

## ⏱️ Estimations & Timing

### Récapitulatif par Priorité

| Priorité  | Tâches    | Temps Total     | Ordre               |
| --------- | --------- | --------------- | ------------------- |
| **P0**    | 5 tâches  | 8-12 jours      | Phase 4 + Phase 5   |
| **P1**    | 5 tâches  | 9-13 jours      | Phase 6             |
| **P2**    | 3 tâches  | 10-15 jours     | Phase 7 (optionnel) |
| **TOTAL** | 13 tâches | **27-40 jours** | 4 phases            |

### Planning Détaillé

#### Phase 4 : Fondations (P0) - **Semaines 1-2 (10 jours)**

| Tâche                    | Jours             | Dépendances | Bloquant         |
| ------------------------ | ----------------- | ----------- | ---------------- |
| P0-1 : CI/CD Setup       | 1-2               | -           | P0-2, P0-3, P0-4 |
| P0-5 : Coverage Baseline | 0.5               | -           | CI/CD            |
| P1-5 : Supabase Local    | 1-2               | -           | P0-2, P0-3, P0-4 |
| **TOTAL PHASE 4**        | **2.5-4.5 jours** | -           | -                |

**Validation Phase 4 :**

- ✅ CI/CD pipeline green
- ✅ Coverage reporté (baseline 60%)
- ✅ Docker Compose Supabase up

---

#### Phase 5 : Tests Critiques (P0) - **Semaines 3-5 (15 jours)**

| Tâche                     | Jours         | Dépendances           | Bloquant   |
| ------------------------- | ------------- | --------------------- | ---------- |
| P0-2 : Stripe E2E         | 3-4           | CI/CD, Supabase local | Production |
| P0-3 : Auth E2E           | 2-3           | CI/CD, Supabase local | Production |
| P0-4 : Delete Account E2E | 1-2           | CI/CD, Supabase local | RGPD       |
| **TOTAL PHASE 5**         | **6-9 jours** | Phase 4               | -          |

**Validation Phase 5 :**

- ✅ 100% parcours Stripe testés (5/5)
- ✅ 100% parcours Auth testés (6/6)
- ✅ Suppression compte testée (RGPD)
- ✅ CI green sur main

---

#### Phase 6 : Tests Importants (P1) - **Semaines 6-7 (10 jours)**

| Tâche                    | Jours          | Dépendances | Bloquant        |
| ------------------------ | -------------- | ----------- | --------------- |
| P1-1 : Quotas E2E        | 2-3            | Phase 5     | -               |
| P1-2 : Accessibilité     | 2-3            | Phase 5     | WCAG compliance |
| P1-3 : Drag-and-Drop E2E | 1-2            | Phase 5     | -               |
| P1-4 : Admin E2E         | 1-2            | Phase 5     | -               |
| **TOTAL PHASE 6**        | **6-10 jours** | Phase 5     | -               |

**Validation Phase 6 :**

- ✅ Quotas testés (blocage + upgrade)
- ✅ 0 violations WCAG 2.2 AA
- ✅ Drag-and-drop fonctionnel
- ✅ Admin permissions testées

---

#### Phase 7 : Optimisations (P2) - **Semaines 8-10 (optionnel)**

| Tâche                    | Jours           | Dépendances | Bloquant |
| ------------------------ | --------------- | ----------- | -------- |
| P2-1 : Visual Regression | 2-3             | Phase 6     | -        |
| P2-2 : Performance       | 3-5             | Phase 6     | -        |
| P2-3 : Mobile Natif      | 5-7             | Phase 6     | -        |
| **TOTAL PHASE 7**        | **10-15 jours** | Phase 6     | -        |

**Validation Phase 7 :**

- ✅ Screenshots baseline créés
- ✅ Lighthouse score > 90
- ✅ Mobile iOS/Android testés

---

## 📋 Décisions à Valider par l'Humain

### Décisions Techniques

| #        | Décision            | Recommandation            | Alternatives          | Validation Requise   |
| -------- | ------------------- | ------------------------- | --------------------- | -------------------- |
| **DT-1** | Framework E2E       | ✅ Playwright (conservé)  | Cypress, TestCafe     | ❌ Déjà validé       |
| **DT-2** | Supabase Testing    | ✅ Local Docker + MSW     | Shadow DB, Mocks only | ✅ **OUI**           |
| **DT-3** | Stripe Testing      | ✅ Test Mode + CLI        | stripe-mock, MSW only | ✅ **OUI**           |
| **DT-4** | Accessibilité       | ✅ @axe-core/playwright   | jest-axe, pa11y       | ❌ Technique         |
| **DT-5** | Régression Visuelle | ✅ Playwright Screenshots | Percy (payant)        | ✅ **OUI** (Phase 7) |

### Décisions Budgétaires

| #        | Outil          | Coût       | Bénéfice                | Décision      | Validation |
| -------- | -------------- | ---------- | ----------------------- | ------------- | ---------- |
| **DB-1** | Percy (Visual) | ~$400/mois | Dashboard + PR comments | 🟡 Phase 7    | ✅ **OUI** |
| **DB-2** | Codecov Pro    | ~$10/mois  | Coverage trends         | 🟢 Gratuit OK | ❌         |
| **DB-3** | Stripe Test    | Gratuit    | API réelle              | ✅ Gratuit    | ❌         |

### Décisions Organisationnelles

| #        | Décision                    | Impact              | Validation |
| -------- | --------------------------- | ------------------- | ---------- |
| **DO-1** | Bloquer merge si tests fail | 🔴 Critique         | ✅ **OUI** |
| **DO-2** | Seuils coverage minimum     | 80% statements      | ✅ **OUI** |
| **DO-3** | Exécution Phase 7 (P2)      | Budget + temps      | ✅ **OUI** |
| **DO-4** | Ordre phases (4 → 5 → 6)    | Logique dépendances | ❌ Validé  |

---

## 🚀 Ordre d'Exécution Recommandé

### Timeline Visuelle

```
Semaine 1-2  : Phase 4 (Fondations)
              [CI/CD] [Coverage] [Docker]

Semaine 3-5  : Phase 5 (Tests Critiques P0)
              [Stripe E2E] [Auth E2E] [Delete Account]

Semaine 6-7  : Phase 6 (Tests Importants P1)
              [Quotas] [Accessibilité] [DnD] [Admin]

Semaine 8-10 : Phase 7 (Optimisations P2) - OPTIONNEL
              [Visual] [Performance] [Mobile]
```

### Chemins Critiques (Bloquants)

```mermaid
graph TD
  A[Phase 4: CI/CD] --> B[Phase 4: Docker Supabase]
  B --> C[Phase 5: Stripe E2E]
  B --> D[Phase 5: Auth E2E]
  B --> E[Phase 5: Delete Account E2E]
  C --> F[Phase 6: Quotas E2E]
  D --> F
  E --> F
  F --> G[Phase 6: Accessibilité]
  G --> H[Phase 7: Visual Regression]
  H --> I[Phase 7: Performance]
  I --> J[Phase 7: Mobile]
```

**Bloquants identifiés :**

- Phase 5 dépend de Phase 4 (CI/CD + Docker)
- Phase 6 dépend de Phase 5 (parcours critiques couverts)
- Phase 7 dépend de Phase 6 (stabilité)

**Parallélisation possible :**

- Phase 4 : CI/CD + Docker + Coverage en parallèle
- Phase 5 : Stripe + Auth + Delete en séquentiel (partagent setup)
- Phase 6 : Quotas + Accessibilité + DnD + Admin en parallèle

---

## 📊 Métriques de Succès

### KPIs Cibles

| Métrique                | Baseline  | Phase 4 | Phase 5      | Phase 6  | Phase 7  |
| ----------------------- | --------- | ------- | ------------ | -------- | -------- |
| **Coverage global**     | 39%       | 65%     | 80%          | 85%      | 90%      |
| **Tests E2E critiques** | 5% (2/37) | 5%      | 100% (37/37) | 100%     | 100%     |
| **Tests E2E total**     | 3 tests   | 3       | 20           | 30       | 40       |
| **Violations WCAG**     | ?         | ?       | ?            | 0        | 0        |
| **Temps CI**            | N/A       | < 5 min | < 8 min      | < 10 min | < 12 min |
| **Flaky tests**         | ?         | < 2%    | < 1%         | < 0.5%   | 0%       |

### Gates de Qualité

**Phase 4 :**

- ✅ CI/CD green sur PR test
- ✅ Coverage > 60%
- ✅ Docker up en < 30s

**Phase 5 :**

- ✅ 100% parcours Stripe testés
- ✅ 100% parcours Auth testés
- ✅ Delete Account RGPD testé
- ✅ Coverage > 80%

**Phase 6 :**

- ✅ 0 violations WCAG 2.2 AA
- ✅ Quotas testés (blocage + upgrade)
- ✅ Drag-and-drop fonctionnel
- ✅ Coverage > 85%

**Phase 7 :**

- ✅ Screenshots baseline créés
- ✅ Lighthouse > 90
- ✅ Mobile iOS + Android testés

---

## 🔄 Plan de Révision

**Après Phase 4 :**

- Revue setup CI/CD
- Ajustement seuils coverage si nécessaire

**Après Phase 5 :**

- Revue tests critiques
- Validation métier (parcours Stripe)
- Go/No-Go production

**Après Phase 6 :**

- Audit WCAG complet
- Décision Phase 7 (budget)

**Après Phase 7 :**

- Audit final
- Documentation maintenance

---

## 📚 Ressources & Documentation

### Documentation Technique

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Stripe Testing](https://stripe.com/docs/testing)
- [axe-core WCAG](https://github.com/dequelabs/axe-core)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)

### Templates de Tests

Tous les templates seront créés dans `tests/e2e/templates/` :

- `auth-flow.template.ts`
- `stripe-flow.template.ts`
- `accessibility.template.ts`
- `visual-regression.template.ts`

### Scripts Utiles

```bash
# scripts/test-all.sh
#!/bin/bash
set -e

echo "🧪 Running full test suite..."

# Lint
yarn lint

# Unit tests
yarn test:coverage --run

# E2E tests
docker-compose -f docker-compose.test.yml up -d
yarn test:e2e
docker-compose -f docker-compose.test.yml down

echo "✅ All tests passed!"
```

---

**Fin du document - Phase 3**

**Prochaine étape :** Validation décisions par l'humain → Phase 4 (Implémentation Fondations).
