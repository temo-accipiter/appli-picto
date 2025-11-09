# ⚙️ CI/CD avec GitHub Actions

Guide complet de configuration et utilisation du pipeline CI/CD.

## 📋 Vue d'ensemble

Le projet utilise **GitHub Actions** pour :
- ✅ Linter et formater le code
- ✅ Vérifier les types TypeScript
- ✅ Exécuter les tests unitaires avec coverage
- ✅ Exécuter les tests E2E Playwright
- ✅ Builder le projet
- ✅ Déployer en preview (PR) et production (main)

## 🔄 Workflows disponibles

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Déclenché sur** :
- Push sur `main`, `develop`, ou branches `claude/**`
- Pull Requests vers `main` ou `develop`

**Jobs** :
1. **Lint** : ESLint + Prettier
2. **TypeCheck** : Vérification TypeScript
3. **Unit Tests** : Tests Vitest + coverage
4. **E2E Tests** : Tests Playwright (Chromium uniquement)
5. **Build** : Build production
6. **Check All** : Job final qui valide que tout est vert

**Durée estimée** : 5-8 minutes

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

**Déclenché sur** :
- Pull Requests vers `main` → Déploiement preview
- Push sur `main` → Déploiement production

**Jobs** :
- **Preview** : Déploie sur Cloudflare Pages (URL unique par PR)
- **Production** : Déploie sur Cloudflare Pages + Supabase Functions

## 🔑 Secrets GitHub requis

### Configuration des secrets

Aller sur **Settings → Secrets and variables → Actions → New repository secret**

#### Pour le CI

| Secret | Description | Exemple |
|--------|-------------|---------|
| `CODECOV_TOKEN` | Token Codecov pour upload coverage | `abc123...` |

#### Pour le déploiement

| Secret | Description | Où le trouver |
|--------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | Token API Cloudflare | Cloudflare Dashboard → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | ID du compte Cloudflare | Cloudflare Dashboard → Account ID |
| `VITE_SUPABASE_URL` | URL Supabase production | Supabase Dashboard → Project Settings |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase | Supabase Dashboard → API Settings |
| `VITE_STRIPE_PUBLIC_KEY` | Clé publique Stripe prod | Stripe Dashboard → API Keys |
| `VITE_STRIPE_PUBLIC_KEY_TEST` | Clé publique Stripe test | Stripe Dashboard → API Keys (test) |
| `VITE_TURNSTILE_SITE_KEY` | Site key Turnstile | Cloudflare Dashboard → Turnstile |
| `VITE_GA4_ID` | ID Google Analytics 4 | Google Analytics → Admin |
| `SUPABASE_ACCESS_TOKEN` | Token Supabase pour déploiement | Supabase CLI → `supabase login` |

### Créer le token Cloudflare API

1. Aller sur https://dash.cloudflare.com/profile/api-tokens
2. Cliquer sur **Create Token**
3. Utiliser le template **Edit Cloudflare Pages**
4. Copier le token généré

### Créer le token Supabase

```bash
supabase login
# Copier le token affiché
```

## 📊 Coverage avec Codecov

### 1. Créer un compte Codecov

1. Aller sur https://codecov.io
2. Se connecter avec GitHub
3. Activer le repository `appli-picto`

### 2. Récupérer le token

1. Sur Codecov, aller dans le repo
2. Settings → Repository Upload Token
3. Copier le token
4. Ajouter comme secret GitHub `CODECOV_TOKEN`

### 3. Utilisation

Le coverage est automatiquement uploadé après chaque run de tests :

```yaml
- name: 📊 Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
```

Codecov ajoutera automatiquement un commentaire sur les PR avec :
- Pourcentage de coverage global
- Delta de coverage (vs main)
- Fichiers non couverts

## 🚀 Déploiement Cloudflare Pages

### Configuration initiale

1. Créer un projet Pages sur Cloudflare
2. Connecter le repository GitHub
3. Configuration du build :
   - **Build command** : `yarn build`
   - **Build output directory** : `dist`
   - **Root directory** : `/`

### Preview Deployments

Chaque PR déclenche automatiquement un déploiement preview :

1. Le workflow build le projet
2. Le workflow déploie sur Cloudflare Pages
3. Un commentaire est ajouté sur la PR avec l'URL preview

**URL preview** : `https://preview-pr-{number}.appli-picto.pages.dev`

### Production Deployment

Lors d'un merge sur `main` :

1. Tests complets (lint, typecheck, unit, e2e, build)
2. Build production avec variables d'environnement prod
3. Déploiement sur Cloudflare Pages
4. Déploiement des Supabase Functions

**URL production** : `https://appli-picto.pages.dev`

## 🔒 Branch Protection Rules

### Configuration recommandée

Settings → Branches → Add branch protection rule

**Branch name pattern** : `main`

Cocher :
- ✅ **Require a pull request before merging**
  - Require approvals: 1
- ✅ **Require status checks to pass before merging**
  - Status checks required :
    - `lint`
    - `typecheck`
    - `test-unit`
    - `test-e2e`
    - `build`
- ✅ **Require conversation resolution before merging**
- ✅ **Do not allow bypassing the above settings**
  - Exception : cocher "Allow administrators to bypass"

### Exception pour hotfix

En cas d'urgence, les administrateurs peuvent bypass les checks :
1. Créer une branche `hotfix/...`
2. Push direct (bypass les checks)
3. Fix immédiat
4. Créer une PR post-hotfix pour validation

## 📈 Monitoring

### Voir l'état du CI

**Badge dans README** :
```markdown
![CI](https://github.com/username/appli-picto/workflows/CI/badge.svg)
```

**Sur GitHub** :
- Actions tab → voir tous les runs
- PR → Checks → détail de chaque job

### Voir le coverage

**Badge Codecov** :
```markdown
![Coverage](https://codecov.io/gh/username/appli-picto/branch/main/graph/badge.svg)
```

### Notifications

GitHub notifie automatiquement :
- ✅ CI passed
- ❌ CI failed
- 💬 Coverage comment sur PR

## ⚡ Optimisations

### Cache des dépendances

Le workflow utilise le cache Yarn :

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20.19.4'
    cache: 'yarn'  # ← Cache automatique
```

**Gain** : ~1-2 minutes par run

### Parallélisation

Tous les jobs indépendants tournent en parallèle :

```
lint ──┐
       │
typecheck ──┤
            ├─→ check-all
test-unit ──┤
            │
test-e2e ──┤
           │
build ─────┘
```

**Gain** : 60% du temps total

### Tests E2E optimisés

- **1 browser seulement** en CI (Chromium)
- **4 workers** pour paralléliser les tests
- **2 retries** en cas d'échec

## 🐛 Dépannage

### Erreur "CODECOV_TOKEN not found"

```bash
# Vérifier que le secret existe
# GitHub → Settings → Secrets → CODECOV_TOKEN
```

### Tests E2E qui échouent en CI mais pas en local

```yaml
# Augmenter le timeout dans playwright.config.ts
timeout: 60000  # au lieu de 30000
```

### Build qui échoue par manque de mémoire

```yaml
# Dans le workflow, augmenter la mémoire Node
env:
  NODE_OPTIONS: '--max_old_space_size=4096'
```

### Secrets non disponibles dans les PR de fork

C'est normal pour des raisons de sécurité. Les secrets ne sont disponibles que pour :
- Push sur des branches du repo principal
- PR depuis des branches du repo principal (pas les forks)

## 📚 Ressources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Codecov Documentation](https://docs.codecov.com/)

## ✅ Checklist post-configuration

- [ ] Tous les secrets GitHub sont configurés
- [ ] Codecov est activé et le token ajouté
- [ ] Cloudflare Pages est connecté au repo
- [ ] Branch protection est activée sur `main`
- [ ] Premier run CI est passé en vert
- [ ] Badges ajoutés au README
- [ ] Coverage baseline établi (≥ 60%)

---

**Dernière mise à jour** : Phase 4 - Fondations de tests
