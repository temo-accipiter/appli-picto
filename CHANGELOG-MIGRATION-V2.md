# Changelog - Migration Mobile-First V2

Ce document récapitule les améliorations apportées au plan de migration suite aux retours de **ChatGPT, Claude, DeepSeek et Grok**.

## 📋 Résumé des changements

| Aspect                     | V1 (Initial)                          | V2 (Corrigé)                   | Impact                          |
| -------------------------- | ------------------------------------- | ------------------------------ | ------------------------------- |
| **Audit préalable**        | ❌ Aucun                              | ✅ Script automatique          | Détection bugs avant migration  |
| **respond-to(xs)**         | ⚠️ Autorisé (sortie sans media query) | ❌ Interdit (@error)           | Élimine confusion mobile = base |
| **Animations TSA**         | 300ms max                             | **150ms max**                  | UX TSA ++ (sensibilité motion)  |
| **Touch targets**          | 44px min (WCAG)                       | **48px recommandé**            | Accessibilité TSA ++            |
| **Tests automatisés**      | ❌ Aucun                              | ✅ Playwright + axe-core       | Détection régressions visuelles |
| **CI/CD**                  | ❌ Aucun                              | ✅ GitHub Actions + Lighthouse | Quality gates automatiques      |
| **prefers-reduced-motion** | ⚠️ Mentionné                          | ✅ Mixin dédié obligatoire     | Conformité WCAG 2.2             |
| **Scripts**                | ❌ Aucun                              | ✅ Audit + correction auto     | Gain temps + fiabilité          |
| **Durée totale**           | 60h                                   | **80h**                        | +20h pour qualité               |
| **Nombre d'étapes**        | 8                                     | **10**                         | +2 étapes (audit + CI/CD)       |

## 🔴 Problèmes critiques identifiés dans V1

### 1. Pattern respond-to('xs') dangereux

**Problème** :

```scss
@mixin respond-to($breakpoint) {
  @if $breakpoint == 'xs' {
    @content; // ❌ Pas de media query !
  }
}
```

**Impact** :

- Les développeurs pensent cibler mobile avec `@include respond-to('xs')`
- Mais le code s'exécute **en base** (sans media query)
- Confusion entre "styles de base" et "styles mobile"
- Erreurs difficiles à débugger

**Solution V2** :

```scss
@mixin respond-to($breakpoint) {
  @if $breakpoint == 'xs' {
    @error "❌ 'xs' breakpoint interdit ! " +
           "Mobile = base (hors media query). " +
           "Supprimez @include respond-to('xs') et mettez les styles en base.";
  }
  // ... reste du code
}
```

**Gain** :

- Erreur de compilation claire
- Force les développeurs à écrire mobile-first correctement
- Élimine le bug à la source

---

### 2. Animations trop lentes pour TSA

**Problème V1** :

```scss
$anim-fast: 0.3s; // 300ms = lent pour TSA
```

**Impact TSA** :

- Les utilisateurs autistes sont **sensibles aux mouvements**
- Animations >150ms = distraction, inconfort
- Non-conformité avec recommandations accessibilité TSA

**Solution V2** :

```scss
$anim-instant: 0.05s; // Feedback immédiat
$anim-fast: 0.15s; // Par défaut (TSA-safe)
$anim-normal: 0.25s; // Cas exceptionnels
$anim-slow: 0.4s; // Transitions majeures uniquement

@mixin tsa-animation($property, $duration: $anim-fast) {
  transition: $property $duration ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.01ms !important;
  }
}
```

**Gain** :

- UX TSA optimisée (150ms max par défaut)
- Respect automatique de `prefers-reduced-motion`
- Conformité WCAG 2.2 Level AA

---

### 3. Touch targets trop petits

**Problème V1** :

```scss
$touch-target-min: 44px; // Minimum WCAG
```

**Impact TSA** :

- 44px = minimum légal WCAG 2.2
- Mais utilisateurs TSA ont souvent **motricité réduite**
- 44px = difficile à toucher précisément au doigt

**Solution V2** :

```scss
$touch-target-min: 48px; // Recommandé (Apple HIG / Material)
$touch-target-compact: 44px; // Fallback WCAG

@mixin touch-target($size: $touch-target-min) {
  min-width: $size;
  min-height: $size;
  padding: max(12px, calc(($size - 1em) / 2));

  // Zone cliquable garantie
  position: relative;
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: $size;
    min-height: $size;
  }
}
```

**Gain** :

- 48×48px = recommandation Apple HIG & Material Design
- Meilleure accessibilité motrice pour TSA
- Zone cliquable garantie par pseudo-élément

---

### 4. Absence de tests automatisés

**Problème V1** :

- Tests manuels uniquement
- Risque de régression visuelle non détectée
- Pas de validation accessibilité automatique

**Solution V2** :

#### Tests visuels (Playwright)

```typescript
// tests/e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test'

test('Tableau - Mobile 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/tableau')
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveScreenshot('Tableau-mobile.png', {
    fullPage: true,
    maxDiffPixels: 100,
  })
})

test('Tableau - Desktop 1920px', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/tableau')

  await expect(page).toHaveScreenshot('Tableau-desktop.png', {
    fullPage: true,
    maxDiffPixels: 100,
  })
})
```

#### Tests accessibilité (axe-core)

```typescript
// tests/e2e/accessibility.spec.ts
import { test } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test('Tableau - Conformité WCAG 2.2 AA', async ({ page }) => {
  await page.goto('/tableau')
  await injectAxe(page)

  await checkA11y(page, null, {
    detailedReport: true,
    rules: {
      'color-contrast': { enabled: true },
      'focus-order': { enabled: true },
      'target-size': { enabled: true },
    },
  })
})
```

**Gain** :

- Détection automatique des régressions visuelles
- Validation WCAG 2.2 AA automatisée
- Snapshots comme source de vérité

---

### 5. Absence de CI/CD

**Problème V1** :

- Aucune validation automatique avant merge
- Qualité dépend du développeur (humain = erreurs)
- Risque de déployer du code cassé

**Solution V2** :

#### GitHub Actions

```yaml
# .github/workflows/quality.yml
name: Quality Checks

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.19.4'

      - run: yarn install --immutable
      - run: yarn playwright install --with-deps

      # Tests visuels
      - run: yarn playwright test visual-regression.spec.ts
        continue-on-error: false

      # Tests accessibilité
      - run: yarn playwright test accessibility.spec.ts
        continue-on-error: false

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:5173/tableau
            http://localhost:5173/edition
          uploadArtifacts: true
          budgetPath: .lighthouserc.json

  stylelint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: yarn install --immutable
      - run: yarn lint:scss
```

#### Lighthouse CI

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "startServerCommand": "yarn preview",
      "url": ["http://localhost:5173/tableau", "http://localhost:5173/edition"]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["warn", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

**Gain** :

- Validation automatique avant merge
- Performance monitoring (Lighthouse)
- Accessibilité garantie (axe-core)
- Blocage des PR si qualité insuffisante

---

## 🆕 Nouvelles étapes dans V2

### ÉTAPE 0 : Audit automatique (3h) - NOUVEAU

**Objectif** : Identifier tous les problèmes **avant** de commencer la migration.

**Livrables** :

- `scripts/audit-scss.sh` - Script d'audit
- `audit-scss-report.csv` - Rapport des problèmes
- Compréhension de l'ampleur du travail

**Pourquoi c'est critique** :

- Évite les surprises pendant la migration
- Permet de prioriser les corrections
- Donne une estimation réaliste du temps nécessaire

---

### ÉTAPE 1 : Corrections pré-migration (6h) - NOUVEAU

**Objectif** : Corriger les bugs **avant** de refactorer.

**Corrections** :

1. ❌ Supprimer tous les `respond-to('xs')`
2. ⏱️ Réduire animations à ≤150ms
3. 👆 Augmenter touch targets à 48px
4. 🔍 Ajouter focus states manquants

**Pourquoi c'est critique** :

- Sépare "correction de bugs" de "refactorisation"
- Évite de migrer du code buggé
- Facilite le debug si quelque chose casse

---

### ÉTAPE 2 : Tests automatisés (8h) - NOUVEAU

**Objectif** : Capturer l'état visuel **avant** la migration.

**Tests** :

1. Playwright visual regression (baselines)
2. axe-core accessibility audit
3. Scripts de vérification automatique

**Pourquoi c'est critique** :

- Source de vérité pour "aucune régression visuelle"
- Détection automatique si quelque chose casse
- Confiance pour refactorer

---

### ÉTAPE 9 : CI/CD Pipeline (4h) - NOUVEAU

**Objectif** : Automatiser la validation qualité.

**Pipeline** :

1. GitHub Actions (PR checks)
2. Lighthouse CI (performance)
3. Stylelint (SCSS quality)

**Pourquoi c'est critique** :

- Empêche la régression après migration
- Maintient la qualité dans le temps
- Feedback immédiat sur les PR

---

## 📊 Comparaison étapes V1 vs V2

| Étape       | V1           | V2                 | Changement        |
| ----------- | ------------ | ------------------ | ----------------- |
| **ÉTAPE 0** | ❌ N/A       | ✅ Audit (3h)      | **+3h** (nouveau) |
| **ÉTAPE 1** | Infra (2h)   | Corrections (6h)   | **+4h** (étendu)  |
| **ÉTAPE 2** | Pilot (3h)   | Tests auto (8h)    | **+5h** (nouveau) |
| **ÉTAPE 3** | UI (10h)     | Variables (4h)     | -6h (simplifié)   |
| **ÉTAPE 4** | Cards (8h)   | UI (10h)           | +2h (exhaustif)   |
| **ÉTAPE 5** | Layout (6h)  | Cards (8h)         | +2h (exhaustif)   |
| **ÉTAPE 6** | Pages (12h)  | Layout (6h)        | -6h (optimisé)    |
| **ÉTAPE 7** | Cleanup (4h) | Pages (12h)        | +8h (exhaustif)   |
| **ÉTAPE 8** | Doc (2h)     | Optimisations (8h) | +6h (nouveau)     |
| **ÉTAPE 9** | ❌ N/A       | CI/CD (4h)         | **+4h** (nouveau) |
| **TOTAL**   | **60h**      | **80h**            | **+20h (+33%)**   |

---

## ✅ Bénéfices de V2

### Sécurité

- ✅ Audit avant migration (pas de surprise)
- ✅ Tests automatisés (détection régression)
- ✅ CI/CD (blocage si qualité insuffisante)
- ✅ Backups automatiques (rollback possible)

### Qualité

- ✅ TSA-optimized (150ms animations, 48px touch targets)
- ✅ WCAG 2.2 AA garanti (axe-core validation)
- ✅ Performance monitoring (Lighthouse CI)
- ✅ Code quality (Stylelint)

### Maintenabilité

- ✅ Scripts réutilisables (audit + fix)
- ✅ Tests comme documentation (snapshots)
- ✅ CI/CD empêche régression future
- ✅ Plan détaillé avec checkpoints

---

## 🎯 Prochaines étapes

1. **Exécuter l'audit** :

   ```bash
   ./scripts/audit-scss.sh
   cat audit-scss-report.csv
   ```

2. **Analyser les résultats** :
   - Combien de `respond-to(xs)` ?
   - Combien d'animations lentes ?
   - Combien de touch targets <48px ?

3. **Décider** :
   - Continuer avec V2 ? (recommandé)
   - Ajuster le planning selon l'ampleur

4. **Commencer ÉTAPE 1** :
   ```bash
   git checkout -b audit/mobile-first
   ./scripts/fix-respond-to-xs.sh
   yarn dev  # Tester visuellement
   ```

---

**Date de création** : 2025-11-05
**Version** : V2 (corrigé suite retours ChatGPT, Claude, DeepSeek, Grok)
**Auteur** : Claude Code (Anthropic)
**Statut** : ✅ Prêt pour exécution
