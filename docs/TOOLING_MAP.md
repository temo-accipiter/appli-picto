# TOOLING_MAP.md

**Cartographie complète du tooling de qualité, sécurité et accessibilité — Appli-Picto**

| Méta             | Valeur                                              |
| ---------------- | --------------------------------------------------- |
| Version          | 1.0                                                 |
| Date             | 2026-04-25                                          |
| Auteur           | Temo (synthèse établie avec Claude)                 |
| Branche          | `refactor/db-first-init`                            |
| Source de vérité | Ce document remplace toute autre carte mentale      |
| Statut           | Photographie figée avant Phase 0 du redesign visuel |

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Inventaire détaillé](#2-inventaire-détaillé)
3. [Tableau de cartographie complet](#3-tableau-de-cartographie-complet)
4. [Trous identifiés](#4-trous-identifiés)
5. [Anti-recommandations](#5-anti-recommandations)
6. [Décisions actées](#6-décisions-actées)
7. [Roadmap Phase 0](#7-roadmap-phase-0)
8. [Annexes](#8-annexes)

---

## 1. Vue d'ensemble

### 1.1 Philosophie

Le projet **Appli-Picto** sert un public sensible (enfants TSA et leurs accompagnants adultes). La discipline de qualité repose sur **deux barrières indépendantes** qui doivent garantir qu'aucune dette technique, faille de sécurité, ou régression d'accessibilité ne passe en production.

### 1.2 Les deux barrières

```
┌─────────────────────────────────────────────────────────────────┐
│                        BARRIÈRE 1                               │
│           Hooks Claude Code CLI (.claude/settings.json)         │
│                                                                 │
│  Déclenche pendant les sessions Claude Code, avant ou après     │
│  chaque action de l'IA (Write/Edit/Bash/MCP).                   │
│                                                                 │
│  Empêche Claude d'écrire ou de commit du code violant les       │
│  règles du projet pendant qu'il code.                           │
└─────────────────────────────────────────────────────────────────┘

                              ▼

┌─────────────────────────────────────────────────────────────────┐
│                        BARRIÈRE 2                               │
│              Hook Git pre-commit (.git/hooks/pre-commit)        │
│                                                                 │
│  Déclenche au moment du `git commit`, peu importe qui écrit     │
│  (Claude, toi en édition manuelle, autre IA, copier-coller).    │
│                                                                 │
│  Dernier rempart avant que le code n'entre dans l'historique    │
│  Git.                                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 État actuel — Anomalie majeure à connaître

⚠️ **Les deux barrières ne couvrent PAS les mêmes vérifications aujourd'hui.** Cela constitue un trou de gruyère : selon que tu commit via Claude Code CLI ou via terminal manuel, tu n'as pas la même protection.

Cf. section [4. Trous identifiés](#4-trous-identifiés) — c'est le **trou n°1**, à corriger en première étape de la Phase 0.

---

## 2. Inventaire détaillé

### 2.1 Outils standard

| Outil          | Version | Rôle                              | Trigger                             |
| -------------- | ------- | --------------------------------- | ----------------------------------- |
| **Prettier**   | 3.6.2   | Formatage JS/TS/SCSS/MD           | `pnpm format` (manuel)              |
| **ESLint**     | 9.24.0  | Lint JS/TS uniquement             | `pnpm lint` (manuel)                |
| **TypeScript** | 5.9.3   | Type-check                        | `pnpm type-check` (manuel)          |
| **Vitest**     | 3.2.4   | Tests unitaires                   | `pnpm test` (manuel)                |
| **Playwright** | 1.56.0  | Tests E2E (5 browsers configurés) | `pnpm test:e2e` (manuel)            |
| **Sass**       | 1.86.3  | Compilation SCSS                  | Auto via Next.js + `pnpm build:css` |

**Configuration ESLint** : couvre `**/*.{js,jsx,ts,tsx}`, exclut `node_modules`, `.next`, `coverage`, `playwright-report`, `scripts/`, PWA workers générés. Plugins : `react`, `react-hooks`, `prettier`, `@typescript-eslint`. **Pas de plugin SCSS** — délibéré.

**Configuration Playwright** : 5 projets (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari), retries CI=2 / local=0, screenshot on failure, video on failure. **VRT non configuré** (cf. section 4).

**Configuration Prettier** : `singleQuote: true`, `semi: false`, `printWidth: 80`, `tabWidth: 2`, `trailingComma: 'es5'`.

### 2.2 Scripts maison Node.js

Trois scripts dans `scripts/` exposés via `package.json` :

#### `scripts/check-hardcoded.js`

Détecte les valeurs hardcodées dans les fichiers SCSS via parsing regex AST-light.

**Détecte** :

- Hex colors (`#fff`, `#ffffff`, `#AABBCC`)
- RGB/RGBA (`rgb(255,0,0)`, `rgba(...)`)
- PX dans propriétés spacing (`padding`, `margin`, `gap`, `width`, `height`, etc.)

**Exclusions légitimes** :

- `src/styles/abstracts/` (lieu canonique des tokens)
- `src/styles/base/` (resets, helpers)
- `src/styles/themes/` (peut hardcoder)
- `src/styles/vendors/` (deps tierces)
- `.test.`, `.spec.`

**Faux positifs filtrés** : lignes contenant `spacing(`, `a11y(`, ou `var(--`.

**Mode** : bloquant (`exit 1` si violations).

**Trigger** : `pnpm lint:hardcoded`.

#### `scripts/check-touch-targets.js`

Détecte les fichiers SCSS contenant des sélecteurs interactifs (`button`, `a[role=button]`, `.btn`, `[onclick]`, etc.) sans token de touch-target.

**Patterns valides détectés** :

- `@include touch-target` ou `@include interactive-target`
- Commentaire `/* touch-target */`
- `min-height: 44px / 48px / 56px`
- `min-height: spacing('44|48|56')`
- `min-height: a11y(...)`

**Mode** : ⚠️ **warning only** (`exit 0` toujours). Mode informatif assumé pendant la migration.

**État actuel (2026-04-25)** : 10 fichiers suspects sur 82 scannés. Volume gérable.

**Liste des 10 fichiers suspects** (à auditer en Phase 0 étape 2) :

- `src/components/features/legal/legal-markdown/LegalMarkdown.scss`
- `src/components/features/settings/DeleteAccountGuard.scss`
- `src/components/layout/navbar/Navbar.scss` ⚠️ critique
- `src/components/shared/lang-selector/LangSelector.scss`
- `src/components/shared/modal/modal-personalization/PersonalizationModal.scss`
- `src/page-components/abonnement/Abonnement.scss`
- `src/page-components/admin/logs/Logs.scss`
- `src/page-components/login/Login.scss`
- `src/page-components/profil/Profil.scss`
- `src/page-components/reset-password/ResetPassword.scss`

**Trigger** : `pnpm validate:touch-targets`.

#### `scripts/check-bundle-size.js`

Vérifie la taille du bundle après build.

**Trigger** : `pnpm check-bundle` (manuel uniquement, **non branché** dans pre-commit).

### 2.3 Hooks Claude Code (`.claude/scripts/`)

11 scripts présents dans `.claude/scripts/`, dont **9 sont branchés** dans `.claude/settings.json`.

#### Hooks branchés (actifs)

| #   | Script                       | Trigger                                        | Type        | Bloquant ?     |
| --- | ---------------------------- | ---------------------------------------------- | ----------- | -------------- |
| 1   | `session-context.sh`         | `SessionStart` (matcher `startup`)             | Init        | non            |
| 2   | `pre-commit.sh`              | `PreToolUse` Bash(git commit\|push)            | Validation  | ✅ oui         |
| 3   | `protect-generated-files.sh` | `PreToolUse` Write\|Edit                       | Protection  | ✅ oui         |
| 4   | `check-supabase-hooks.sh`    | `PreToolUse` Write(`src/hooks/*.ts`)           | DB-first    | ✅ oui         |
| 5   | `block-yarn-npm.sh`          | `PreToolUse` Bash(yarn\|npm)                   | Force pnpm  | ✅ oui         |
| 6   | `suggest-compact.sh`         | `PreToolUse` Write\|Edit                       | UX session  | non            |
| 7   | `doc-file-warning.sh`        | `PreToolUse` Write(`*.md`)                     | Warning doc | non            |
| 8   | `check-hardcoded-scss.sh`    | `PostToolUse` Edit(`*.scss`)                   | Advisory    | non (advisory) |
| 9   | `post-migration.sh`          | `PostToolUse` `mcp__supabase__apply_migration` | Post-DB     | non            |

**Note importante** : `pre-commit.sh` est **différent** de `pre-commit-css.sh` (cf. section 2.5).

#### Hooks orphelins (existent mais non branchés)

| Script                    | État                                                 | Recommandation                   |
| ------------------------- | ---------------------------------------------------- | -------------------------------- |
| `pre-commit-css.sh`       | Copie utilisée par `.git/hooks/pre-commit` (legacy)  | À fusionner avec `pre-commit.sh` |
| `check-mobile-first.sh`   | Appelé **uniquement** par `pre-commit.sh`            | OK (transitoirement)             |
| `check-hardcoded-scss.sh` | Appelé **uniquement** par `pre-commit-css.sh` legacy | OK si on unifie le pre-commit    |

### 2.4 Hook Git (`.git/hooks/pre-commit`)

**Statut** : actif (4407 octets).

**Contenu** : copie **identique** de `.claude/scripts/pre-commit-css.sh`.

**Vérifications effectuées** :

1. ✅ `pnpm lint:hardcoded` → bloquant
2. ⚠️ `pnpm validate:touch-targets` → warning
3. ℹ️ Compilation SCSS → message informatif uniquement (pas de vraie validation)

**Limitation critique** : ce hook **n'est pas versionné dans Git** (`.git/hooks/` est exclu par construction). Si tu changes de machine ou clone à neuf, il disparaît.

**Solution** : migration vers Husky en Phase 0 étape 5 (cf. section 7).

### 2.5 Anomalie : deux pre-commit divergents

C'est l'observation la plus critique de cet inventaire. Il existe **deux scripts pre-commit** dans le projet, qui ne couvrent **pas** les mêmes vérifications.

| Vérification                             | `pre-commit.sh` ⭐ | `pre-commit-css.sh` |
| ---------------------------------------- | :----------------: | :-----------------: |
| Branchement                              |  Hook Claude (#2)  | Hook Git pre-commit |
| `pnpm check` (lint + format)             |         ✅         |         ❌          |
| `pnpm test` (tests unitaires)            |         ✅         |         ❌          |
| `check-mobile-first.sh`                  |         ✅         |         ❌          |
| `check-supabase-hooks.sh` (architecture) |         ✅         |         ❌          |
| `pnpm lint:hardcoded`                    |         ❌         |         ✅          |
| `pnpm validate:touch-targets` (warning)  |         ❌         |         ✅          |
| Compilation SCSS                         |         ❌         |   ❌ (informatif)   |

**Conséquence** : protection **partielle et différente** selon le chemin de commit (Claude Code CLI vs terminal manuel).

### 2.6 Outils dormants ou installés non utilisés

| Outil                     | État                                   | Action recommandée               |
| ------------------------- | -------------------------------------- | -------------------------------- |
| **`axe-core`** 4.11.0     | Installé en deps, **jamais appelé**    | Câbler dans Playwright (Phase 0) |
| **VRT Playwright**        | Capability native, **jamais utilisée** | Setup baseline (Phase 0)         |
| **`tests/axe-core.d.ts`** | Type declaration vide d'usage          | À supprimer ou activer           |
| `pre-commit-css.sh`       | Copie redondante avec hook Git         | À supprimer après unification    |

---

## 3. Tableau de cartographie complet

### 3.1 Vue synthétique : qui couvre quoi, à quel moment

| Outil / Hook                 | Vérifie                      | Trigger                         | Bloque ? | Versionné ? |
| ---------------------------- | ---------------------------- | ------------------------------- | :------: | :---------: |
| Prettier                     | Format JS/TS/SCSS/MD         | Manuel + `pnpm check`           |   non    |     oui     |
| ESLint                       | JS/TS                        | Manuel + `pnpm check`           |   non    |     oui     |
| TypeScript                   | Types                        | Manuel uniquement               |   non    |     oui     |
| Vitest                       | Tests unitaires              | Manuel + `pre-commit.sh` Claude |   oui    |     oui     |
| Playwright E2E               | Fonctionnel 5 browsers       | Manuel uniquement               |   non    |     oui     |
| Playwright VRT               | Régressions visuelles        | **À configurer**                |    -     |      -      |
| `axe-core`                   | A11y runtime (WCAG)          | **À câbler**                    |    -     |      -      |
| `check-hardcoded.js`         | Hex/RGB/px hardcodés         | Hook Git + advisory Claude      |   oui    |     oui     |
| `check-touch-targets.js`     | Touch targets WCAG (warning) | Hook Git + Claude session       | warning  |     oui     |
| `check-bundle-size.js`       | Taille bundle                | Manuel uniquement               |   non    |     oui     |
| `check-mobile-first.sh`      | `@media max-width` interdit  | Claude session uniquement       |   oui    |     oui     |
| `check-supabase-hooks.sh`    | DB-first frontend            | Claude session uniquement       |   oui    |     oui     |
| `block-yarn-npm.sh`          | Force pnpm                   | Claude session uniquement       |   oui    |     oui     |
| `protect-generated-files.sh` | Fichiers générés             | Claude session uniquement       |   oui    |     oui     |
| Hook Git `pre-commit`        | Orchestration commit Git     | À chaque `git commit`           |   oui    |   ❌ non    |
| `pre-commit.sh` (Claude)     | Orchestration commit session | Bash(git commit) en session     |   oui    |     oui     |

### 3.2 Vue par chemin de commit

#### Chemin A : commit pendant une session Claude Code CLI

```
Claude tape: git commit -m "..."
       ↓
[Hook Claude PreToolUse Bash(git commit)]
       ↓
   pre-commit.sh (Claude version)
       ↓
   ┌─────────────────────────────────┐
   │ ✅ pnpm check (lint+format)     │
   │ ✅ pnpm test (unit tests)       │
   │ ✅ check-mobile-first.sh        │
   │ ✅ check-supabase-hooks.sh      │
   │ ❌ pnpm lint:hardcoded MANQUE   │
   │ ❌ pnpm validate:touch-targets  │
   └─────────────────────────────────┘
       ↓
[Hook Git pre-commit (.git/hooks/pre-commit)]
       ↓
   pre-commit-css.sh (legacy)
       ↓
   ┌─────────────────────────────────┐
   │ ✅ pnpm lint:hardcoded          │
   │ ⚠️ pnpm validate:touch-targets  │
   │ ℹ️ SCSS compile (informatif)    │
   └─────────────────────────────────┘
```

→ **En session Claude, les DEUX barrières s'appliquent en cascade**. Couverture quasi-totale, mais :

- TypeScript type-check absent partout.
- Mobile-first ET hardcoded sont validés mais via 2 scripts différents — dette de cohérence.

#### Chemin B : commit manuel en terminal (toi, hors session Claude)

```
Toi: git commit -m "..."
       ↓
[Hook Git pre-commit (.git/hooks/pre-commit)]
       ↓
   pre-commit-css.sh (legacy)
       ↓
   ┌─────────────────────────────────┐
   │ ✅ pnpm lint:hardcoded          │
   │ ⚠️ pnpm validate:touch-targets  │
   │ ℹ️ SCSS compile (informatif)    │
   │ ❌ pnpm check (lint+format)     │
   │ ❌ pnpm test (unit tests)       │
   │ ❌ check-mobile-first.sh        │
   │ ❌ check-supabase-hooks.sh      │
   └─────────────────────────────────┘
```

→ **En commit manuel, tu n'as QUE la barrière 2** = protection partielle (CSS uniquement, pas de tests, pas de lint, pas de mobile-first, pas de DB-first).

**C'est le risque principal du tooling actuel.** Cf. section [4](#4-trous-identifiés).

---

## 4. Trous identifiés

Quatre trous, classés par criticité.

### 4.1 🔴 CRITIQUE — Pre-commit non uniformisé entre Claude et Git

**Description** : `pre-commit.sh` (utilisé par Claude) et `pre-commit-css.sh` (utilisé par Git) ne couvrent pas les mêmes vérifications. Selon qu'on commit via Claude ou via terminal manuel, la protection est différente.

**Impact** : un commit manuel peut introduire des hooks Supabase directs, du desktop-first (`@media max-width`), des tests cassés, ou des erreurs de lint sans déclencher d'alerte.

**Solution** : un **seul script unifié** branché aux deux endroits. Voir Phase 0 étape 1.

**Effort** : 1 heure.

### 4.2 🟠 IMPORTANT — Aucun VRT (Visual Regression Testing)

**Description** : Playwright est configuré pour E2E fonctionnel mais aucun test `toHaveScreenshot` n'existe.

**Impact** : pendant le redesign à venir, toute régression visuelle non intentionnelle (mauvais token, contraste cassé, layout shift) passera silencieusement. Détection humaine = trop tard.

**Solution** : setup VRT ciblé (5-7 écrans + 3-4 composants critiques), avec `prefers-reduced-motion: reduce` forcé pour stabiliser les screenshots. Voir Phase 0 étape 3.

**Effort** : 2 heures (setup) + 30 min génération baseline.

### 4.3 🟠 IMPORTANT — `axe-core` installé mais jamais utilisé

**Description** : `axe-core@4.11.0` est dans `devDependencies`. `tests/axe-core.d.ts` existe (déclaration de types). Aucun test ne l'invoque.

**Impact** : aucune validation runtime des contrastes WCAG AA, des labels ARIA, des hiérarchies de titres, des `alt` manquants. Critique pour public TSA.

**Solution** : test Playwright dédié appelant `axe-core` sur 5-7 écrans clés, avec assertion zero violation `serious` ou `critical`. Voir Phase 0 étape 4.

**Effort** : 30 minutes.

### 4.4 🟡 MOYEN — Hooks Git non versionnés

**Description** : `.git/hooks/pre-commit` n'est pas dans le suivi Git.

**Impact** : si tu changes de machine, clone à neuf, ou collabores un jour, les hooks disparaissent. Aucune trace dans l'historique.

**Solution** : migration vers Husky qui versionne les hooks dans `.husky/`. Voir Phase 0 étape 5.

**Effort** : 15 minutes.

### 4.5 🟡 MOYEN — TypeScript type-check absent du pre-commit

**Description** : `pnpm type-check` existe mais n'est branché ni dans `pre-commit.sh` ni dans `pre-commit-css.sh`.

**Impact** : un commit peut introduire une erreur de type qui ne sera détectée qu'au build (`pnpm build`) ou en CI.

**Solution** : ajouter `pnpm type-check` au pre-commit unifié de l'étape 1.

**Effort** : 5 minutes (à grouper avec étape 1).

---

## 5. Anti-recommandations

Ce que **NE PAS faire**, malgré les recommandations courantes (notamment celles de l'audit Gemini).

### 5.1 ❌ Ne PAS installer Stylelint

**Tentation** : Stylelint + `stylelint-declaration-strict-value` est l'outil canonique pour enforcer un design system tokens-first.

**Pourquoi pas chez toi** :

- `scripts/check-hardcoded.js` couvre **déjà** : hex (`color-no-hex`), RGB, et px sur propriétés spacing.
- Il connaît tes exclusions (`src/styles/abstracts/`, `src/styles/base/`, etc.).
- Il connaît tes faux positifs légitimes (`spacing()`, `a11y()`, `var(--)`).
- Ajouter Stylelint = doublon avec maintenance et risques de désaccord entre les deux outils.

**Amélioration optionnelle** : ajouter détection des couleurs nommées (`red`, `blue`) à `check-hardcoded.js` (5 lignes). Cosmétique.

### 5.2 ❌ Ne PAS migrer vers `src/features/`

**Tentation** : Feature-Sliced Design (`src/features/planning/`, `src/features/token-economy/`, etc.) impose architecturalement la séparation des trois systèmes cœurs.

**Pourquoi pas chez toi** :

- L'architecture actuelle (`src/components/` + `src/page-components/`) **respecte déjà** la séparation via la mémoire projet et les skills (`three-systems-separation`).
- Migrer maintenant = refonte structurelle massive juste avant le redesign visuel.
- Sur 41 migrations DB stables et 216 tests passants, c'est un risque inutile.

### 5.3 ❌ Ne PAS migrer vers CSS Modules

**Tentation** : `.module.scss` isole strictement les styles par composant et facilite le `check-unused-css`.

**Pourquoi pas chez toi** :

- Tu n'utilises pas CSS Modules (vérifié : 0 fichier `.module.scss`).
- Ton architecture SCSS classique global avec BEM-light + tokens wrappers fonctionne et est documentée.
- Migration = casser tous les imports `import './X.scss'` de tes composants.

### 5.4 ❌ Ne PAS utiliser `additionalData` dans `next.config.ts`

**Tentation** : injecter `@use '@/styles/abstracts/_tokens.scss' as *;` globalement pour éviter les imports répétitifs.

**Pourquoi pas chez toi** :

- Casse la frontière explicite entre "fichiers qui ont accès aux tokens" et les autres.
- Complique le debug et augmente le couplage implicite.
- L'import explicite `@use '@styles/abstracts' as *;` est plus verbeux mais traçable.

### 5.5 ❌ Ne PAS appliquer l'audit Gemini en bloc

**Tentation** : suivre intégralement le document `Audit_SCSS_pour_Redesign_Visuel.md`.

**Pourquoi pas** :

- 60% pertinent, 40% inadapté ou dangereux pour ton stack.
- Pertinent : VRT, Stylelint conceptuel (couvert chez toi), audit a11y.
- Inadapté : `src/features/`, CSS Modules, `additionalData`, `check-unused-css` (CSS Modules only), migration `@use`/`@forward` (déjà faite).
- Trier au scalpel ; ne pas exécuter en mode "tout ou rien".

---

## 6. Décisions actées

Décisions prises lors de la conversation du 2026-04-25, à graver dans le marbre.

| #   | Décision                                                       | Justification                                        |
| --- | -------------------------------------------------------------- | ---------------------------------------------------- |
| D1  | Pas de Stylelint                                               | `check-hardcoded.js` couvre l'équivalent fonctionnel |
| D2  | Pas de migration `src/features/`                               | Séparation déjà assurée par skills + memory          |
| D3  | Pas de CSS Modules                                             | Architecture SCSS globale fonctionne et est stable   |
| D4  | Pas de `additionalData` Sass                                   | Garder les imports explicites traçables              |
| D5  | Audit Gemini : tri sélectif, pas application en bloc           | Voir section 5.5                                     |
| D6  | VRT Playwright : OUI, ciblé (5-7 écrans + 3-4 composants)      | Indispensable avant redesign massif                  |
| D7  | `axe-core` : OUI, à câbler immédiatement                       | Déjà installé, contraste WCAG critique pour TSA      |
| D8  | Husky : OUI, en Phase 0 étape 5                                | Versionner les hooks Git pour portabilité            |
| D9  | Touch-targets : warning pour l'instant, audit ciblé en Phase 0 | 10 fichiers suspects = volume gérable                |
| D10 | Unifier `pre-commit.sh` + `pre-commit-css.sh` en un script     | Trou critique de protection (cf. 4.1)                |
| D11 | TypeScript type-check : ajouter au pre-commit unifié           | Trou détecté en cartographie                         |
| D12 | `index.html` Claude Design = référence visuelle, pas du code   | À reconstruire en SCSS tokens-first écran par écran  |

---

## 7. Roadmap Phase 0

Ordre recommandé pour combler les trous **avant** d'entamer le redesign visuel.

### Étape 1 — Unification du pre-commit ⏱️ 1h

**Objectif** : un seul script pre-commit couvrant les 7 vérifications, branché aux deux endroits (Claude + Git).

**Livrable** : `.claude/scripts/pre-commit.sh` enrichi.

**Vérifications cibles** :

1. `pnpm check` (lint + format)
2. `pnpm type-check` (nouveau)
3. `pnpm test` (unit tests)
4. `pnpm lint:hardcoded` (depuis `pre-commit-css.sh`)
5. `pnpm validate:touch-targets` (warning, depuis `pre-commit-css.sh`)
6. `check-mobile-first.sh`
7. `check-supabase-hooks.sh`

**Actions** :

1. Sauvegarder l'ancien `.git/hooks/pre-commit` quelque part : `cp .git/hooks/pre-commit .git/hooks/pre-commit.backup`
2. Étendre `.claude/scripts/pre-commit.sh` pour inclure les vérifications #4 et #5.
3. Ajouter `pnpm type-check` (vérification #2).
4. Remplacer le contenu de `.git/hooks/pre-commit` par : `#!/bin/bash\nexec "$(git rev-parse --show-toplevel)/.claude/scripts/pre-commit.sh"`
5. Tester un commit avec violation volontaire (px hardcodé) → doit bloquer.
6. Supprimer `.claude/scripts/pre-commit-css.sh` (devient orphelin).

**Validation** : commit-test à chaque chemin (Claude session + terminal manuel) → mêmes résultats.

### Étape 2 — Audit ciblé des touch-targets ⏱️ 1-2h

**Objectif** : passer de 10 fichiers suspects à 0, puis durcir le script en mode bloquant.

**Actions** :

1. Pour chacun des 10 fichiers listés en section 2.2 :
   - Faux positif (interactif vient d'une primitive Button/Input/Checkbox déjà conforme) → ajouter en tête de fichier `/* touch-target */`.
   - Vrai positif (interactif custom dans le fichier) → ajouter `@include touch-target('min')` ou `('preferred')`.
2. Re-lancer `pnpm validate:touch-targets` → 0 fichier suspect attendu.
3. Modifier `scripts/check-touch-targets.js` : `process.exit(0)` → `process.exit(suspiciousFiles > 0 ? 1 : 0)`.
4. Commit unique : `chore(a11y): audit touch-targets + enable strict mode`.

**Validation** : test commit avec un nouveau composant interactif sans touch-target → bloque.

### Étape 3 — Setup VRT Playwright ⏱️ 2h + 30min

**Objectif** : capturer une baseline visuelle des écrans critiques avant tout redesign.

**Cibles VRT (5-7 écrans + 3-4 composants)** :

- Écrans : Login, Tableau (enfant), Édition (adulte), Profil, Admin, ResetPassword.
- Composants : Button, Card, Modal, Input, TrainProgressBar.

**Actions** :

1. Créer `tests/visual/screens.spec.ts` avec :
   - Configuration `page.emulateMedia({ reducedMotion: 'reduce' })` pour stabilité.
   - `expect(page).toHaveScreenshot(...)` sur chaque écran.
   - Option `maxDiffPixelRatio: 0.01` pour tolérer l'anti-aliasing fonts.
2. Créer `tests/visual/components.spec.tsx` (ou équivalent) pour les composants isolés.
3. Ajouter scripts npm : `test:visual`, `test:visual:update`.
4. Générer la baseline : `pnpm test:visual --update-snapshots`.
5. Commit : `chore(visual): VRT baseline before redesign`.

**Validation** : modifier volontairement un padding sur Button.scss → `pnpm test:visual` doit échouer avec diff visible.

### Étape 4 — Câblage `axe-core` ⏱️ 30min

**Objectif** : utiliser l'outil déjà installé pour valider WCAG AA runtime.

**Actions** :

1. Installer `@axe-core/playwright` : `pnpm add -D @axe-core/playwright`.
2. Créer `tests/a11y/axe-scan.spec.ts` qui :
   - Parcourt 5-7 écrans clés.
   - Lance `new AxeBuilder({ page }).analyze()`.
   - Assert zero violation `serious` ou `critical`.
3. Ajouter script npm : `test:a11y`.
4. Commit : `chore(a11y): wire axe-core to Playwright`.

**Validation** : introduire volontairement un contraste cassé → `pnpm test:a11y` doit échouer avec violation listée.

### Étape 5 — Migration Husky ⏱️ 15min

**Objectif** : versionner le hook pre-commit pour portabilité.

**Actions** :

1. `pnpm add -D husky`
2. `pnpm exec husky init` → crée `.husky/`.
3. Modifier `.husky/pre-commit` pour qu'il appelle `.claude/scripts/pre-commit.sh` (le script unifié de l'étape 1).
4. Supprimer `.git/hooks/pre-commit` (Husky le remplace).
5. Ajouter `"prepare": "husky"` dans `package.json` scripts.
6. Commit : `chore(tooling): migrate pre-commit to Husky for versioning`.

**Validation** : `git clone` à neuf dans un autre dossier → hooks toujours actifs après `pnpm install`.

### Étape 6 — Documentation & nettoyage ⏱️ 30min

**Objectif** : laisser le repo propre et ce document à jour.

**Actions** :

1. Mettre à jour ce `TOOLING_MAP.md` (changelog v1.1, supprimer trous résolus).
2. Supprimer définitivement `.claude/scripts/pre-commit-css.sh` et `tests/axe-core.d.ts` si plus utiles.
3. Ajouter `verify:pre-commit` dans `package.json` qui mime exactement le contenu du pre-commit (utile en debug).
4. Commit : `docs(tooling): update TOOLING_MAP after Phase 0`.

### Total Phase 0

**Effort estimé** : 5-6 heures réparties sur 1-2 sessions.

**Bénéfice** : protection uniforme, baseline visuelle, validation a11y automatique, hooks portables. **Prêt pour le redesign visuel.**

---

## 8. Annexes

### 8.1 Comment ajouter un nouveau hook Claude

1. Créer le script dans `.claude/scripts/mon-hook.sh`.
2. Le rendre exécutable : `chmod +x .claude/scripts/mon-hook.sh`.
3. Éditer `.claude/settings.json` et ajouter une entrée dans `hooks.PreToolUse` ou `hooks.PostToolUse` :
   ```json
   {
     "matcher": "Write|Edit",
     "hooks": [
       {
         "type": "command",
         "command": "$CLAUDE_PROJECT_DIR/.claude/scripts/mon-hook.sh"
       }
     ]
   }
   ```
4. Tester : faire une action correspondant au matcher → le hook doit se déclencher.

**Matchers utiles** :

- `Write|Edit` : tout write/edit.
- `Write(*.scss)` : uniquement écriture SCSS.
- `Bash(git commit:*|git push:*)` : commits et push.
- `Bash(yarn *|npm *)` : commandes interdites.
- `mcp__supabase__apply_migration` : migrations DB.

### 8.2 Comment ajouter un check au pre-commit unifié

Une fois la Phase 0 étape 1 effectuée, le pre-commit unifié est dans `.claude/scripts/pre-commit.sh`. Pour ajouter un check :

```bash
# Section N. NOUVEAU CHECK
echo "🔍 [N/X] Vérification XYZ..."
if ./scripts/mon-nouveau-check.sh; then
  echo "✅ XYZ : OK"
else
  echo "❌ ERREUR: XYZ a échoué"
  total_errors=$((total_errors + 1))
fi
echo ""
```

### 8.3 Glossaire

| Terme            | Définition                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **VRT**          | Visual Regression Testing — tests automatisés qui comparent des screenshots avant/après pour détecter les régressions visuelles |
| **AST**          | Abstract Syntax Tree — représentation arborescente du code source utilisée pour analyse sémantique                              |
| **WCAG 2.2 AA**  | Web Content Accessibility Guidelines, niveau AA — standard d'accessibilité que doit respecter Appli-Picto                       |
| **TSA**          | Trouble du Spectre de l'Autisme — public utilisateur principal                                                                  |
| **DB-first**     | Architecture où la DB Supabase est la source de vérité unique pour la sécurité et la logique métier (RLS)                       |
| **RLS**          | Row Level Security — système d'autorisation natif PostgreSQL/Supabase                                                           |
| **Touch target** | Zone tactile minimale interactive — WCAG AA exige ≥ 44×44 px                                                                    |
| **Phase 0**      | Phase préparatoire au redesign visuel : combler les trous tooling avant de toucher au design                                    |
| **Phase 6**      | Architecture SCSS hybride avec wrappers + fallback, déjà partiellement appliquée au projet                                      |

### 8.4 Liens internes

- `package.json` — scripts npm de référence.
- `.claude/settings.json` — configuration des hooks Claude.
- `.claude/skills/` — skills DB-first, sass-tokens-discipline, three-systems-separation, tsa-ux-rules.
- `.claude/agent-memory/explore-codebase/` — documentation SCSS détaillée (architecture, patterns, errors, file registry).
- `playwright.config.ts` — configuration tests E2E.
- `eslint.config.js` — configuration lint.
- `docs/refonte_front/FRONTEND_CONTRACT.md` — contrat frontend de référence.

### 8.5 Changelog

| Version | Date       | Changements                                                |
| ------- | ---------- | ---------------------------------------------------------- |
| 1.0     | 2026-04-25 | Création initiale après audit complet du tooling existant. |

---

**Fin du document**
