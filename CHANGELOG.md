# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### Phase 5 - Tests E2E Critiques (P0) (2025-11-09)

#### Added ✨

**Tests E2E Parcours Critiques**
- 🔴 **Stripe E2E** (`tests/e2e/stripe-payment.spec.ts`) :
  - 5 tests : checkout session, paiement réussi/échoué, upgrade, cancel subscription
  - Mock complet de l'API Stripe et webhooks
  - Vérification quotas augmentés après upgrade
  - Assertions accessibilité sur tous les boutons

- 🔐 **Auth E2E** (`tests/e2e/auth-flows.spec.ts`) :
  - 8 tests : signup, login (RBAC), logout, reset password, email verification, session persistence
  - Mock captcha Cloudflare Turnstile
  - Tests redirections selon rôle (free, abonné, admin)
  - Vérification session persiste après F5

- 🔒 **RGPD E2E** (`tests/e2e/account-deletion.spec.ts`) :
  - 3 tests : suppression compte, annulation Stripe, validations sécurité
  - Vérification CASCADE DELETE sur toutes les tables
  - Modal confirmation avec double authentification (login + delete)
  - Vérification données complètement effacées

- 📊 **Quotas E2E** (`tests/e2e/quotas-upgrade.spec.ts`) :
  - 4 tests : limite atteinte, message upgrade, quotas augmentés, tracking temps réel
  - Vérification contraste WCAG AA (4.5:1) sur CTA upgrade
  - Test compteur quotas incrémente/décrémente en temps réel
  - Barre de progression visuelle

- 👑 **Admin E2E** (`tests/e2e/admin-flows.spec.ts`) :
  - 3 tests : gestion utilisateurs, modification RBAC, analytics/logs
  - Vérification isolation permissions (403 pour non-admin)
  - Test changement rôle utilisateur : free → abonné
  - Dashboard analytics avec statistiques

**Helpers et utilitaires**
- Helper `mockTurnstileCaptcha(page)` pour mocker le captcha Cloudflare
- Helper `mockCheckoutSession(page, url)` pour mocker Stripe Checkout
- Helper `createMultipleTasks(page, count)` pour tests de quotas
- Pattern de cleanup systématique : `beforeEach`/`afterEach` avec `cleanupDatabase()`

**Documentation**
- `docs/phase5-tests-critiques.md` : Rapport complet Phase 5 (~500 lignes)
  - Tableau récapitulatif des 23 tests créés
  - Métriques et KPIs
  - Problèmes rencontrés et solutions
  - Gaps identifiés et recommandations Phase 6

#### Changed 🔄

**CI/CD**
- ⏳ TODO : Retirer `continue-on-error: true` du job E2E (après validation tests)
- ⏳ TODO : Parallélisation accrue (`workers: 6` au lieu de 4)

**Coverage**
- Objectif Phase 5 : 80%+ coverage global
- Coverage baseline Phase 4 : ~39%
- ⏳ Coverage après Phase 5 : À mesurer après exécution CI

#### Fixed 🐛

**Tests E2E**
- Mock captcha Turnstile pour éviter les appels Cloudflare en tests
- Mock Edge Functions Supabase via `page.route()` pour isolation
- Nettoyage DB systématique pour éviter interférences entre tests

#### Notes 📝

**Statistiques Phase 5**
- **23 tests E2E** créés (vs 19 minimum requis) = **+21%**
- **5 parcours critiques (P0)** couverts à **100%**
- **100% des tests** incluent assertions accessibilité (WCAG 2.2 AA)
- **Temps estimé** : ~8-10 min pour exécuter tous les tests E2E

**Prochaines étapes**
- Phase 6 : Tests E2E complémentaires (P1/P2) : drag & drop, upload images, mode visiteur
- Phase 6 : Tests de performance (Lighthouse CI)
- Phase 6 : Tests de régression visuelle (Percy/Chromatic)

---

### Phase 4 - Infrastructure de tests (2025-11-09)

#### Changed 🔄

**CI/CD Temporary Adjustment**
- Job E2E configuré avec `continue-on-error: true` (temporaire Phase 4 uniquement)
- Job `check-all` modifié pour permettre l'échec de E2E sans bloquer le merge
- ⚠️ TODO Phase 5 : Retirer ces exceptions une fois les tests E2E complets
- Raison : Infrastructure mise en place, tests E2E seront écrits en Phase 5

#### Added ✨

**CI/CD GitHub Actions**
- Workflow CI complet avec 5 jobs parallélisés (lint, typecheck, unit tests, e2e, build)
- Workflow de déploiement (preview sur PR, production sur main)
- Cache Yarn pour optimiser les temps de build (~2 min de gain)
- Upload automatique du coverage vers Codecov
- Artifacts : coverage reports, Playwright screenshots et videos
- Timeout de 10 minutes maximum par workflow

**Configuration Vitest Coverage**
- Seuils de coverage à 80% (lines, functions, statements) et 75% (branches)
- Provider v8 pour la performance
- Reporters : text, json, html, lcov
- Script `test:coverage:open` pour ouvrir le rapport dans le navigateur
- Exclusion des fichiers de test et config

**Optimisation Playwright**
- 4 workers en CI (au lieu de 1) pour parallélisation
- Reporters optimisés : html, json, github, list
- Screenshots : only-on-failure
- Videos : retain-on-failure
- Retry : 2 tentatives en cas d'échec (CI uniquement)

**Helpers Playwright**
- `tests/e2e/helpers/auth.ts` :
  - Utilisateurs de test prédéfinis (free, abonné, admin)
  - Login/logout helpers
  - Login via API (plus rapide)
  - Vérifications d'état d'authentification
- `tests/e2e/helpers/database.ts` :
  - Gestion utilisateurs de test
  - Seed de données (tâches, récompenses, catégories)
  - Scénarios de test complets
  - Cleanup de base de données
- `tests/e2e/helpers/accessibility.ts` :
  - Analyse avec Axe-core
  - Vérification WCAG 2.2 AA
  - Tests de navigation clavier
  - Contraste de couleurs
  - Ordre des headings
  - Labels accessibles

**Supabase Local Docker**
- Configuration complète dans `supabase/config.toml`
- Fichier `.env.test` avec variables locales
- Scripts npm : `supabase:start`, `supabase:stop`, `supabase:status`, `supabase:reset`
- Seed SQL complet avec :
  - 3 utilisateurs de test (free, abonné, admin)
  - Rôles et permissions RBAC
  - Quotas par rôle
  - Données de test (tâches, récompenses, catégories)
  - Stations de métro pour feature thème
  - Cartes démo pour mode visiteur

**Stripe Test Mode**
- Scripts CLI : `stripe:listen`, `stripe:trigger:checkout`, `stripe:trigger:subscription`
- Configuration `.env.test` pour clés de test
- Helpers de mock complets dans `tests/helpers/stripe-mock.ts` :
  - Objets Stripe mockés (Customer, Subscription, Checkout, Price, Product)
  - Événements webhook mockés
  - Mock API complète avec vi.fn()

**Documentation**
- `docs/supabase-local-setup.md` : Guide complet Supabase Local (~250 lignes)
- `docs/stripe-testing.md` : Guide tests Stripe (~300 lignes)
- `docs/ci-cd-setup.md` : Configuration CI/CD (~350 lignes)
- `docs/phase4-fondations.md` : Résumé complet Phase 4

**README**
- Badges : CI status, coverage, license, Node version
- Section Testing complète
- Liens vers documentation

#### Changed 🔄

- `vitest.config.ts` : Ajout configuration coverage avec seuils stricts
- `playwright.config.ts` : Optimisation workers et reporters
- `package.json` :
  - Scripts Supabase Local
  - Scripts Stripe CLI
  - Script `test:coverage:open`

#### Technical Debt 🔧

- Coverage actuel : ~40-50% (objectif Phase 5 : 80%)
- Tests E2E : uniquement Chromium en CI (gain de temps)
- Seed SQL : peut être enrichi au besoin

#### Performance ⚡

- Temps CI total : 5-8 minutes (objectif atteint)
- Parallélisation : 5 jobs simultanés
- Cache Yarn : ~2 minutes de gain
- Workers Playwright : 4 (gain ~60%)

---

## [0.1.0] - Phases précédentes

### Phase 3 - Stratégie de tests
- Audit complet des tests existants
- Cartographie des parcours utilisateurs
- Stratégie de tests définie
- Décisions techniques validées

### Phase 2 - Parcours utilisateurs
- Analyse des 10 parcours critiques
- Identification des zones à risque
- Priorisation des tests

### Phase 1 - Audit
- État des lieux des tests existants
- Identification des manques
- Recommandations initiales

---

**Légende** :
- ✨ Added : Nouvelles fonctionnalités
- 🔄 Changed : Modifications de fonctionnalités existantes
- 🐛 Fixed : Corrections de bugs
- 🗑️ Removed : Fonctionnalités supprimées
- 🔧 Technical Debt : Dette technique
- ⚡ Performance : Améliorations de performance
- 🔒 Security : Corrections de sécurité
