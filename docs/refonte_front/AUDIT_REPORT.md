# Rapport AUDIT — Slice S0

**Date** : 2026-02-13
**Auditeur** : Claude Code CLI
**Objectif** : Cartographier l'existant frontend AVANT toute modification (Slice S0)
**Règle** : AUCUN fichier modifié dans cette slice.

---

## 0) Garantie "zéro modification"

### git status (début)

```
M CLAUDE.md
 M middleware.ts
 M next-env.d.ts
 M package.json
 M pnpm-lock.yaml
 M src/app/(public)/tableau/page.tsx
 D src/components/CLAUDE.md
 D src/hooks/CLAUDE.md
 M src/types/supabase.ts
 D src/utils/CLAUDE.md
 M src/utils/supabaseClient.ts
 M supabase/config.toml
 D supabase/email-templates/README.md
 D supabase/email-templates/SUBJECTS.md
 D supabase/functions/_shared/deno-types.d.ts
 D supabase/functions/_shared/stripeClient.ts
 D supabase/functions/cleanup-unconfirmed/index.ts
 D supabase/functions/create-checkout-session/.npmrc
 D supabase/functions/create-checkout-session/deno.json
 D supabase/functions/create-checkout-session/index.ts
 D supabase/functions/delete-account/index.ts
 D supabase/functions/log-consent/index.ts
 D supabase/functions/monitoring-alerts/README.md
 D supabase/functions/monitoring-alerts/index.ts
 D supabase/functions/stripe-webhook/deno.json
 D supabase/functions/stripe-webhook/index.ts
 D supabase/functions/weekly-report/index.ts
 D supabase/migrations_archive/[...]
 D supabase/migrations_privileged/20260204102000_phase8_2_storage_rls_policies.sql
?? .claude/skills/
?? docs/refonte_front/
?? src/components/shared/bootstrap-error/
?? supabase/schema.sql
```

### git status (fin)

**Vérification à effectuer après génération du rapport** : `git status --porcelain` doit être **IDENTIQUE** à l'état initial.

---

## 1) Tree annoté (KEEP / MODIFY / DELETE)

### Structure globale

```
appli-picto/
├── src/
│   ├── app/                           — MODIFY — Routes Next.js App Router
│   │   ├── (public)/                 — MODIFY — Routes publiques (mapping écrans)
│   │   │   ├── tableau/              — MODIFY — Contexte Tableau (TSA-critical)
│   │   │   ├── login/                — MODIFY — Auth (nouveau schéma accounts)
│   │   │   ├── signup/               — MODIFY — Auth (triggers DB auto)
│   │   │   ├── legal/                — KEEP   — Pages légales (peu modif)
│   │   │   ├── forgot-password/      — KEEP   — Password reset
│   │   │   └── reset-password/       — KEEP   — Password reset
│   │   ├── (protected)/              — MODIFY — Routes protégées
│   │   │   ├── edition/              — MODIFY — Contexte Édition (timelines/slots)
│   │   │   ├── profil/               — MODIFY — Account + child_profiles + devices
│   │   │   ├── abonnement/           — MODIFY — Stripe + accounts.status
│   │   │   └── admin/                — MODIFY — Admin routes (status=admin)
│   │   ├── layout.tsx                — MODIFY — Root layout
│   │   └── providers.tsx             — MODIFY — Contexts (supprimer RBAC)
│   ├── components/
│   │   ├── features/                 — MODIFY/DELETE — Features spécifiques
│   │   │   ├── taches/               — DELETE — Remplacer par cards/timelines/slots
│   │   │   ├── recompenses/          — DELETE — Remplacer par cards (reward)
│   │   │   ├── admin/                — MODIFY — Adapter à nouveau schéma
│   │   │   ├── consent/              — MODIFY — RGPD (log-consent EF)
│   │   │   ├── subscription/         — MODIFY — Stripe (create-checkout-session EF)
│   │   │   ├── time-timer/           — KEEP   — TimeTimer (local-only)
│   │   │   └── settings/             — MODIFY — account_preferences (DB, pas localStorage)
│   │   ├── layout/                   — MODIFY — Navigation (statut-based)
│   │   │   ├── navbar/               — MODIFY — Contexte-aware (Tableau/Édition)
│   │   │   ├── bottom-nav/           — MODIFY — Mobile-first navigation
│   │   │   ├── user-menu/            — MODIFY — Suppression RBAC, lecture status
│   │   │   └── settings-menu/        — MODIFY — account_preferences
│   │   ├── shared/                   — MODIFY — Composants génériques
│   │   │   ├── dnd/                  — MODIFY — Drag&drop timelines/slots
│   │   │   ├── modal/                — KEEP   — Modals (PersonalizationModal à adapter)
│   │   │   ├── forms/                — MODIFY — Forms (nouveau schéma)
│   │   │   ├── quota-indicator/      — DELETE — Suppression logique quota côté front
│   │   │   ├── feature-gate/         — DELETE — Suppression RBAC
│   │   │   └── bootstrap-error/      — MODIFY — Nouveau bootstrap (child_profiles auto)
│   │   └── ui/                       — KEEP   — Composants UI de base (peu modif)
│   ├── page-components/              — MODIFY — Composants pages
│   │   ├── edition/                  — DELETE/REWRITE — Remplacer par timelines/slots
│   │   ├── tableau/                  — DELETE/REWRITE — Remplacer par sessions/validations
│   │   ├── profil/                   — MODIFY — child_profiles + devices + account_preferences
│   │   ├── abonnement/               — MODIFY — accounts.status + create-checkout-session
│   │   ├── admin/                    — MODIFY — Nouveau schéma (admin RLS)
│   │   ├── login/                    — MODIFY — Auth (nouveau schéma)
│   │   └── signup/                   — MODIFY — Auth (triggers DB auto)
│   ├── contexts/                     — MODIFY/DELETE — React Contexts
│   │   ├── AuthContext.tsx           — MODIFY — Lecture accounts.status uniquement
│   │   ├── PermissionsContext.tsx    — DELETE — RBAC interdit (DB-first)
│   │   ├── ToastContext.tsx          — MODIFY — account_preferences.toasts_enabled (DB)
│   │   ├── DisplayContext.tsx        — KEEP   — UI state (probablement)
│   │   └── LoadingContext.tsx        — KEEP   — UI state (probablement)
│   ├── hooks/                        — MODIFY/DELETE — Hooks custom
│   │   ├── useRBAC.ts                — DELETE — RBAC interdit (DB-first)
│   │   ├── useRBAC.test.tsx          — DELETE — Tests RBAC
│   │   ├── RBAC_GUIDE.md             — DELETE — Doc RBAC
│   │   ├── useTachesEdition.ts       — DELETE — Remplacer par useTimelines/useSlots
│   │   ├── useTachesDnd.ts           — DELETE — Remplacer par timelines/slots
│   │   ├── useRecompenses.ts         — DELETE — Remplacer par useCards
│   │   ├── useParametres.ts          — DELETE — Remplacer par useAccountPreferences
│   │   ├── useSubscriptionStatus.ts  — MODIFY — Lecture accounts.status (pas subscriptions)
│   │   ├── usePermissions.ts         — DELETE — RBAC interdit
│   │   ├── useSimpleRole.ts          — DELETE — RBAC interdit
│   │   ├── useAccountStatus.ts       — MODIFY — Lecture accounts.status (cosmétique)
│   │   └── useMetrics.ts             — MODIFY — Admin metrics (nouveau schéma)
│   ├── utils/                        — MODIFY — Utilitaires
│   │   ├── supabaseClient.ts         — KEEP   — ✅ Déjà anon key only
│   │   ├── permissions-api.ts        — DELETE — RBAC interdit
│   │   ├── rgpdExport.ts             — MODIFY — Nouveau schéma (child_profiles, cards, etc.)
│   │   └── storage/                  — MODIFY — Nouveau buckets (personal-images, bank-images)
│   ├── styles/                       — KEEP   — ✅ Design system tokens-first complet
│   │   ├── abstracts/                — KEEP   — Tokens Sass (colors, spacing, typography, etc.)
│   │   ├── base/                     — KEEP   — Reset, animations, accessibility
│   │   ├── themes/                   — KEEP   — Light/Dark themes
│   │   └── main.scss                 — KEEP   — Point d'entrée
│   ├── types/                        — MODIFY — Types TypeScript
│   │   ├── supabase.ts               — KEEP   — ✅ Types auto-générés (ne jamais éditer)
│   │   ├── global.d.ts               — MODIFY — Types globaux (Tache/Recompense → Card/Slot)
│   │   └── contexts.d.ts             — MODIFY — Supprimer types RBAC
│   ├── config/                       — KEEP   — Configuration app (peu modif)
│   ├── lib/                          — KEEP   — Bibliothèques (peu modif)
│   ├── assets/                       — KEEP   — Fichiers statiques
│   ├── docs/                         — KEEP   — Documentation
│   └── test/                         — MODIFY — Utilitaires test (nouveau schéma)
│       └── mocks/                    — DELETE/REWRITE — Mocks MSW (taches/recompenses → nouveau schéma)
├── supabase/
│   ├── migrations/                   — READ-ONLY — ✅ Source de vérité backend
│   ├── schema.sql                    — READ-ONLY — ✅ Schéma DB dumpé
│   └── config.toml                   — READ-ONLY — Config Supabase
├── next.config.js                    — KEEP   — Configuration Next.js (OK)
├── package.json                      — KEEP   — ✅ Next.js 16.0.3, pnpm, Sass, etc.
└── tsconfig.json                     — KEEP   — ✅ TypeScript strict (partiel)
```

### Décision par dossier principal

| Dossier                                | Décision       | Raison                                       | Priorité |
| -------------------------------------- | -------------- | -------------------------------------------- | -------- |
| `src/app/`                             | MODIFY         | Routes à adapter au nouveau schéma           | HAUTE    |
| `src/components/features/taches/`      | DELETE         | Remplacer par timelines/slots                | CRITIQUE |
| `src/components/features/recompenses/` | DELETE         | Remplacer par cards (reward)                 | CRITIQUE |
| `src/page-components/edition/`         | DELETE/REWRITE | Logique legacy taches/recompenses            | CRITIQUE |
| `src/page-components/tableau/`         | DELETE/REWRITE | Logique legacy taches/recompenses            | CRITIQUE |
| `src/contexts/PermissionsContext.tsx`  | DELETE         | RBAC interdit (DB-first)                     | CRITIQUE |
| `src/hooks/useRBAC.ts`                 | DELETE         | RBAC interdit (DB-first)                     | CRITIQUE |
| `src/hooks/useTaches*.ts`              | DELETE         | Legacy tables                                | CRITIQUE |
| `src/hooks/useRecompenses.ts`          | DELETE         | Legacy tables                                | CRITIQUE |
| `src/hooks/useParametres.ts`           | DELETE         | Legacy tables                                | CRITIQUE |
| `src/utils/permissions-api.ts`         | DELETE         | RBAC interdit                                | CRITIQUE |
| `src/test/mocks/handlers.ts`           | DELETE/REWRITE | Mocks legacy (taches/recompenses/parametres) | HAUTE    |
| `src/styles/`                          | KEEP           | ✅ Design system complet et conforme         | AUCUNE   |
| `src/utils/supabaseClient.ts`          | KEEP           | ✅ Anon key uniquement                       | AUCUNE   |
| `supabase/migrations/`                 | READ-ONLY      | ✅ Source de vérité backend                  | AUCUNE   |

---

## 2) Stack technique

### Framework & Runtime

- **Next.js** : `16.0.3` (App Router, Turbopack activé par défaut)
- **React** : `19.0.0`
- **Node** : `20.19.4` (Volta)
- **Package Manager** : `pnpm 9.15.0`

### TypeScript

- **Version** : `5.9.3`
- **Mode strict** : **PARTIEL** (relaxé temporairement pour migration)
  - `strict: true`
  - `noImplicitAny: false` (temporaire — réduit ~350 erreurs)
  - `strictNullChecks: true`
  - `noImplicitReturns: false` (temporaire — réduit ~28 erreurs)
  - `noUnusedLocals: false` (temporaire — réduit ~20 erreurs)
  - `noUnusedParameters: false` (temporaire — réduit ~15 erreurs)
- **Path aliases** : `@/*` → `./src/*`, `@styles/*` → `./src/styles/*`
- **TypeScript build errors** : **IGNORÉS** en production (`ignoreBuildErrors: true`) — à corriger progressivement

### Styling

- **Sass** : `1.86.3`
- **Architecture** : Design system tokens-first complet
- **Dossier** : `src/styles/`
  - `abstracts/` : tokens (colors, spacing, typography, shadows, radius, motion, breakpoints, etc.)
  - `base/` : reset, animations, typography, accessibility, helpers
  - `themes/` : light, dark
  - `vendors/` : normalize
- **✅ CONFORME** : système de tokens structuré et complet

### Backend & Auth

- **Supabase** : `@supabase/supabase-js` `2.81.1` + `@supabase/ssr` `0.8.0`
- **Stripe** : `stripe` `19.3.1` + `@stripe/stripe-js` `8.4.0`
- **Turnstile** : `react-turnstile` `1.1.4` (anti-bot)

### Tests

- **Unitaires** : Vitest `3.2.4` + @testing-library/react `16.3.0`
- **E2E** : Playwright `1.56.0`
- **Coverage** : @vitest/coverage-v8 `3.2.4`
- **Mocking** : MSW `2.12.2` (Mock Service Worker)

### PWA & Performance

- **PWA** : `@ducanh2912/next-pwa` `10.2.9` (désactivé en dev, activé en prod)
- **Monitoring** : Sentry `@sentry/nextjs` `10.25.0`
- **Analytics** : Google Analytics 4 (GA4, conditionnel consentement)

### UI & Interactions

- **Drag & Drop** : `@dnd-kit/core` `6.3.1`, `@dnd-kit/sortable` `10.0.0`
- **Animations** : `framer-motion` `12.10.1`
- **Icons** : `lucide-react` `0.553.0`
- **Confettis** : `react-confetti` `6.4.0`
- **i18n** : `i18next` `25.0.0` + `react-i18next` `16.3.3`

---

## 3) Supabase (client-side)

### Fichiers d'initialisation

- **Client principal** : `src/utils/supabaseClient.ts` (ligne 95)
- **Server client** : `src/utils/supabaseClient.ts` (ligne 258, fonction `createServerSupabaseClient`)

### Clés utilisées

✅ **Anon key uniquement** (ligne 30-31) :

```typescript
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGN6dHFvcXZuaWFsYXFmY2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTM0NDEsImV4cCI6MjA2ODgyOTQ0MX0.O2H1eyrlUaq1K6d92j5uAGn3xzOaS0xroa4MagPna68'
```

### Occurrences service_role

✅ **0 occurrence** — CONFORME

**Recherche effectuée** : `rg "service_role" src/` → **No matches found**

### Configuration

- **Persistance session** : `localStorage` (client-side uniquement)
- **Auto-refresh token** : activé (client-side)
- **Detect session in URL** : activé (client-side)
- **Storage key** : `sb-{projectRef}-auth-token`
- **Timeout fetch** : 15s (dev), 5s (prod)
- **SSR support** : `@supabase/ssr` via `createServerSupabaseClient`

### Points d'attention

- **Fallback anon key** : hardcodée dans le code (ligne 31) — acceptable pour développement, mais devrait être en `.env` uniquement en production
- **Console.log** : logs de debug activés (ligne 34-35) — à retirer en production

---

## 4) Routes/pages → écrans contractuels

### Matrice complète

| Route (Next.js)      | Écran fonctionnel (contrat §2.1)      | Contexte               | Statut(s) visés                     | État actuel | Legacy ?                              |
| -------------------- | ------------------------------------- | ---------------------- | ----------------------------------- | ----------- | ------------------------------------- |
| `/`                  | Entrée "Visitor / Découverte"         | Édition (adulte)       | Visitor                             | **ABSENT**  | N/A                                   |
| `/signup`            | Auth (signup)                         | Édition                | Visitor                             | **EXISTE**  | Partiel (ancien schéma)               |
| `/login`             | Auth (login)                          | Édition                | Visitor / All                       | **EXISTE**  | Partiel (ancien schéma)               |
| `/tableau`           | **Page Tableau**                      | Tableau (enfant)       | Visitor / Free / Subscriber / Admin | **EXISTE**  | **OUI** (taches/recompenses)          |
| `/edition`           | **Page Édition**                      | Édition (adulte)       | Visitor / Free / Subscriber / Admin | **EXISTE**  | **OUI** (taches/recompenses)          |
| `/profil`            | **Page Profil / Paramètres compte**   | Édition (adulte)       | Free / Subscriber / Admin           | **EXISTE**  | **OUI** (profiles/parametres)         |
| `/abonnement`        | Abonnement / Billing                  | Édition (adulte)       | Free / Subscriber / Admin           | **EXISTE**  | Partiel (ancien schéma)               |
| `/admin/metrics`     | **Page Administration** — Métriques   | Administration (owner) | Admin                               | **EXISTE**  | **OUI** (profiles/taches/abonnements) |
| `/admin/logs`        | **Page Administration** — Logs        | Administration (owner) | Admin                               | **EXISTE**  | Partiel                               |
| `/admin/permissions` | **Page Administration** — Permissions | Administration (owner) | Admin                               | **EXISTE**  | **OUI** (RBAC legacy)                 |
| `/forgot-password`   | Password reset (demande)              | Public                 | All                                 | **EXISTE**  | OK                                    |
| `/reset-password`    | Password reset (formulaire)           | Public                 | All                                 | **EXISTE**  | OK                                    |
| `/legal/*`           | Pages légales (CGU, CGV, RGPD, etc.)  | Public                 | All                                 | **EXISTE**  | OK                                    |

### Écrans manquants (par rapport au contrat)

1. **Entrée "Visitor / Découverte"** (`/`) : Page d'accueil visiteur avant signup — **ABSENT**
2. **Bibliothèque cartes** : Écran dédié banque + cartes perso (actuellement intégré dans `/edition`) — **PARTIEL**
3. **Mode Séquençage** : Écran dédié édition séquences (actuellement absent) — **ABSENT**
4. **Sélecteur enfant actif** : UI de sélection profil enfant actif (actuellement absent ou partiel) — **PARTIEL**

### Routes legacy (à adapter)

- **`/tableau`** : utilise `taches`, `recompenses` (doit utiliser `timelines`, `slots`, `sessions`, `session_validations`)
- **`/edition`** : utilise `taches`, `recompenses` (doit utiliser `timelines`, `slots`, `cards`)
- **`/profil`** : utilise `profiles`, `parametres` (doit utiliser `child_profiles`, `account_preferences`, `devices`)
- **`/admin/*`** : utilise `profiles`, `taches`, `abonnements` (doit utiliser `child_profiles`, `cards`, `subscriptions` lecture admin)

---

## 5) Inventaire des accès Supabase

### Tables/Vues/RPC/Storage appelés

#### ❌ LEGACY (ancien schéma — à remplacer)

| Table legacy        | Fichiers utilisant                                                                                                                                                                                                   | Opérations                               | Nouveau schéma équivalent                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| **`taches`**        | `src/page-components/edition/Edition.tsx:208`<br>`src/hooks/useTachesEdition.ts`<br>`src/hooks/useTachesDnd.ts`<br>`src/test/mocks/handlers.ts:60-119`<br>`src/hooks/useMetrics.ts:90`<br>`src/hooks/useRBAC.ts:270` | SELECT, INSERT, UPDATE, DELETE, realtime | `cards` (kind=task) + `timelines` + `slots`                           |
| **`recompenses`**   | `src/page-components/edition/Edition.tsx:258`<br>`src/hooks/useRecompenses.ts`<br>`src/test/mocks/handlers.ts:136-189`<br>`src/hooks/useRBAC.ts:275`                                                                 | SELECT, INSERT, UPDATE, DELETE, realtime | `cards` (kind=reward)                                                 |
| **`profiles`**      | `src/page-components/profil/Profil.tsx:66,79,150`<br>`src/utils/permissions-api.ts:168`<br>`src/hooks/useMetrics.ts:80,84`<br>`src/test/mocks/handlers.ts:299`                                                       | SELECT, INSERT, UPDATE                   | `child_profiles`                                                      |
| **`parametres`**    | `src/hooks/useParametres.ts`<br>`src/contexts/ToastContext.tsx:55`<br>`src/components/layout/settings-menu/SettingsMenu.tsx:18`<br>`src/test/mocks/handlers.ts:239-274`                                              | SELECT, INSERT, UPDATE, PATCH            | `account_preferences`                                                 |
| **`abonnements`**   | `src/hooks/useSubscriptionStatus.ts:36`<br>`src/hooks/useMetrics.ts:96`                                                                                                                                              | SELECT                                   | `subscriptions` (NON exposée client — lecture via `accounts.status`)  |
| **`consentements`** | **NON trouvé** dans le code actuel                                                                                                                                                                                   | —                                        | `consent_events` (NON exposée client — écriture via EF `log-consent`) |

#### ✅ NOUVEAU SCHÉMA (déjà présents partiellement)

| Table/Vue nouveau schéma   | Fichiers utilisant                                | Opérations      | Conforme ?                    |
| -------------------------- | ------------------------------------------------- | --------------- | ----------------------------- |
| **`accounts`**             | `src/app/(public)/tableau/page.tsx:63` (relation) | SELECT (via FK) | **PARTIEL** (bootstrap check) |
| **`child_profiles`**       | `src/app/(public)/tableau/page.tsx:63,82`         | SELECT (via FK) | **PARTIEL** (bootstrap check) |
| **`cards`**                | **NON trouvé**                                    | —               | **ABSENT**                    |
| **`categories`**           | **NON trouvé**                                    | —               | **ABSENT**                    |
| **`user_card_categories`** | **NON trouvé**                                    | —               | **ABSENT**                    |
| **`timelines`**            | **NON trouvé**                                    | —               | **ABSENT**                    |
| **`slots`**                | **NON trouvé**                                    | —               | **ABSENT**                    |
| **`sessions`**             | **NON trouvé**                                    | —               | **ABSENT**                    |
| **`session_validations`**  | **NON trouvé**                                    | —               | **ABSENT**                    |
| **`sequences`**            | **NON trouvé**                                    | —               | **ABSENT**                    |
| **`sequence_steps`**       | **NON trouvé**                                    | —               | **ABSENT**                    |
| **`devices`**              | **NON trouvé**                                    | —               | **ABSENT**                    |
| **`account_preferences`**  | **NON trouvé**                                    | —               | **ABSENT**                    |
| **`subscriptions`**        | **NON trouvé** (normal — admin-only)              | —               | **CONFORME**                  |
| **`consent_events`**       | **NON trouvé** (normal — service-role via EF)     | —               | **CONFORME**                  |
| **`admin_audit_log`**      | **NON trouvé** (normal — admin-only)              | —               | **CONFORME**                  |

#### Storage

| Bucket                                | Chemins utilisés                                                                | Fichiers                                                                              | Nouveau bucket équivalent                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Legacy** (non spécifiés exactement) | `images/{userId}/taches`<br>`images/{userId}/recompenses`<br>`avatars/{userId}` | `src/utils/storage/uploadImage.ts:47`<br>`src/utils/storage/modernUploadImage.ts:540` | `personal-images/{account_id}/cards/{card_id}.jpg`<br>`personal-images/{account_id}/avatars/{child_profile_id}.jpg` |
| **`bank-images`**                     | **NON trouvé**                                                                  | —                                                                                     | **ABSENT** (doit être utilisé pour cartes banque)                                                                   |

#### RPC (fonctions DB)

| RPC ancien                   | Fichiers | Nouveau RPC équivalent                                   |
| ---------------------------- | -------- | -------------------------------------------------------- |
| **NON utilisé** actuellement | —        | Migrations récentes contiennent plusieurs RPC à explorer |

---

## 6) Legacy hunt (résultats rg)

### 🔴 CRITIQUE : Anciennes tables MASSIVEMENT présentes

#### 6.1 Table `taches`

**Nombre d'occurrences** : **~200+ lignes** dans **~30 fichiers**

**Fichiers critiques** :

```
src/page-components/edition/Edition.tsx:208
  await supabase.from('taches').insert([

src/hooks/useTachesEdition.ts (fichier complet — ~500 lignes)
  Logique complète CRUD taches

src/hooks/useTachesDnd.ts (fichier complet — ~400 lignes)
  Logique drag&drop taches

src/test/mocks/handlers.ts:60
  http.get(`${SUPABASE_URL}/rest/v1/taches`, ({ request }) => {

src/hooks/useMetrics.ts:90
  .from('taches')

src/hooks/useRBAC.ts:270
  { event: '*', schema: 'public', table: 'taches' },

src/components/features/taches/ (dossier complet)
  - taches-dnd/
  - taches-edition/
  - train-progress-bar/ (basé sur taches)

src/page-components/tableau/Tableau.tsx:116
  taches: personalTachesRaw,

src/utils/rgpdExport.ts:46,74
  taches: TacheWithUrl[]
  .from('taches')

src/utils/storage/uploadImage.ts:47
  prefix: 'taches'
```

#### 6.2 Table `recompenses`

**Nombre d'occurrences** : **~150+ lignes** dans **~25 fichiers**

**Fichiers critiques** :

```
src/page-components/edition/Edition.tsx:258
  (insertion recompenses)

src/hooks/useRecompenses.ts (fichier complet)
  Logique complète CRUD recompenses

src/test/mocks/handlers.ts:136
  http.get(`${SUPABASE_URL}/rest/v1/recompenses`, ...

src/components/features/recompenses/ (dossier complet)
  - recompenses-edition/
  - selected-reward-floating/

src/page-components/tableau/Tableau.tsx:125,175
  const { recompenses: personalRecompensesRaw } = useRecompenses()
  const recompenses: RewardWithDemo[] = useMemo(() => {

src/utils/rgpdExport.ts:47,80
  recompenses: RecompenseWithUrl[]
  .from('recompenses')

src/utils/storage/uploadImage.ts:47
  prefix: 'recompenses'
```

#### 6.3 Table `profiles`

**Nombre d'occurrences** : **~40 lignes** dans **~10 fichiers**

**Fichiers critiques** :

```
src/page-components/profil/Profil.tsx:66,79,150
  .from('profiles').select()
  .from('profiles').insert({
  .from('profiles').update()

src/utils/permissions-api.ts:168
  // Utiliser la fonction RPC pour éviter les problèmes de FK entre profiles et user_roles

src/hooks/useMetrics.ts:80,84
  supabase.from('profiles').select('*', { count: 'exact', head: true })
  .from('profiles')

src/test/mocks/handlers.ts:299
  http.get(`${SUPABASE_URL}/rest/v1/profiles`, ...

src/types/global.d.ts:8
  export type Profile = Database['public']['Tables']['profiles']['Row']
```

#### 6.4 Table `parametres`

**Nombre d'occurrences** : **~30 lignes** dans **~10 fichiers**

**Fichiers critiques** :

```
src/hooks/useParametres.ts (fichier complet)
  Logique complète CRUD parametres

src/contexts/ToastContext.tsx:55,86
  const { parametres } = useParametres()
  const toastsEnabled = parametres?.toasts_enabled ?? true

src/components/layout/settings-menu/SettingsMenu.tsx:18,54,58,86,90
  const { parametres, updateParametres } = useParametres()
  {parametres && (
    checked={!!parametres.confettis}
    checked={parametres.toasts_enabled ?? true}

src/page-components/tableau/Tableau.tsx:126,278
  const { parametres } = useParametres()
  const confettisEnabled = parametres?.confettis !== false

src/test/mocks/handlers.ts:239,250,263
  http.get(`${SUPABASE_URL}/rest/v1/parametres`, ...
  http.post(`${SUPABASE_URL}/rest/v1/parametres`, ...
  http.patch(`${SUPABASE_URL}/rest/v1/parametres`, ...

src/types/global.d.ts:12
  export type Parametre = Database['public']['Tables']['parametres']['Row']
```

#### 6.5 Table `abonnements`

**Nombre d'occurrences** : **~10 lignes** dans **~5 fichiers**

**Fichiers critiques** :

```
src/hooks/useSubscriptionStatus.ts:36
  .from('abonnements')

src/hooks/useMetrics.ts:96
  .from('abonnements')

src/test/mocks/handlers.ts:315
  http.get(`${SUPABASE_URL}/rest/v1/abonnements`, ...

src/assets/legal-content.ts:380,397,475,643
  (mentions "abonnements" dans CGV, politique confidentialité)
```

#### 6.6 Table `consentements`

**Nombre d'occurrences** : **0** (pas trouvé dans le code — uniquement dans assets légaux)

---

## 7) RBAC hunt (résultats rg)

### 🔴 CRITIQUE : Système RBAC complet côté client (INTERDIT par contrat)

#### 7.1 Hook principal `useRBAC`

**Fichier** : `src/hooks/useRBAC.ts` (~500 lignes)

**Exposé** :

```typescript
isAdmin: boolean
isFree: boolean
isSubscriber: boolean
isVisitor: boolean
canCreate: (contentType: ContentType) => boolean
canCreateTask: () => boolean
canCreateReward: () => boolean
canCreateCategory: () => boolean
getQuotaInfo: type => {
  ;(current, limit, canCreate)
}
```

**Logique interne** :

- Comptage quotas côté front (INTERDIT)
- Vérification permissions côté front (INTERDIT)
- Gestion transitions statut côté front (INTERDIT)

#### 7.2 `PermissionsContext`

**Fichier** : `src/contexts/PermissionsContext.tsx` (~300 lignes)

**Exposé** :

```typescript
isAdmin: boolean
isVisitor: boolean
role: string
permissions: Permission[]
can: (action, resource) => boolean
ready: boolean
```

#### 7.3 Hooks dérivés RBAC

| Hook               | Fichier                         | Rôle                                |
| ------------------ | ------------------------------- | ----------------------------------- |
| `usePermissions`   | (via PermissionsContext)        | Lecture permissions + `isAdmin`     |
| `useSimpleRole`    | `src/hooks/useSimpleRole.ts`    | Lecture `isAdmin`, `isFree`, etc.   |
| `useAccountStatus` | `src/hooks/useAccountStatus.ts` | Lecture status + `canCreateContent` |

#### 7.4 Fichiers utilisant RBAC

**Nombre** : **~40 fichiers**

**Exemples critiques** :

```
src/page-components/edition/Edition.tsx:66,67,68,72,95,97,99,285,370,416
  canCreateTask, canCreateReward, canCreateCategory, isAdmin

src/page-components/admin/logs/Logs.tsx:22,39,44,49,92,96,99,144
  const { isAdmin } = usePermissions()
  if (!isAdmin) { router.push('/') }

src/page-components/admin/metrics/Metrics.tsx:13,16
  const { isAdmin } = usePermissions()
  if (!isAdmin) { return null }

src/page-components/admin-permissions/AdminPermissions.tsx:98,164,181,186,213,867
  const { isAdmin } = usePermissions()

src/components/layout/user-menu/UserMenu.tsx:32,353,393
  const { isAdmin } = usePermissions()
  {!isAdmin && (<SubscriptionButton />)}
  {isAdmin && (<AdminPanel />)}

src/components/shared/quota-indicator/QuotaIndicator.tsx:35,61,165
  const canCreateContent = canCreate(contentType)
  {!canCreateContent && (<QuotaWarning />)}
```

#### 7.5 Documentation RBAC

**Fichier** : `src/hooks/RBAC_GUIDE.md` (~300 lignes)

Guide complet d'utilisation du système RBAC côté client — **À SUPPRIMER**.

---

## 8) Risques & blocants

### 🔴 CRITIQUES (bloquants majeurs)

#### C1 — Système RBAC complet côté client

**Impact** : **ARCHITECTURAL MAJEUR**

**Description** :

- Système RBAC sophistiqué avec `useRBAC`, `PermissionsContext`, `usePermissions`
- Logique de quotas côté front (comptage `taches`, `recompenses`, etc.)
- Vérification permissions côté front (`canCreateTask()`, `isAdmin`, etc.)
- **Utilisé dans ~40 fichiers**

**Pourquoi c'est CRITIQUE** :

- **Violation contrat §0.3** : "Le frontend NE DOIT JAMAIS implémenter un système de rôles ou de permissions côté client"
- **Violation contrat §1.6** : "Ne jamais re-implémenter des règles critiques (quotas, statuts, droits)"
- **Violation Annexe B** : "Le frontend ne maintient aucune table de rôles, aucune matrice de permissions"

**Action requise** :

- **SUPPRIMER** complètement le système RBAC
- Remplacer par lecture simple de `accounts.status` (COSMÉTIQUE uniquement)
- Déléguer TOUTE autorisation à la DB (RLS)

---

#### C2 — Legacy DB massivement présent

**Impact** : **FONCTIONNEL MAJEUR**

**Description** :

- Tables anciennes (`taches`, `recompenses`, `profiles`, `parametres`, `abonnements`) utilisées **PARTOUT**
- Dossiers complets legacy : `components/features/taches/`, `components/features/recompenses/`
- Hooks legacy : `useTachesEdition`, `useTachesDnd`, `useRecompenses`, `useParametres`
- Page-components legacy : `edition/`, `tableau/`, `profil/`

**Pourquoi c'est CRITIQUE** :

- Le frontend **ne peut PAS fonctionner** avec le nouveau backend tant que ces tables sont utilisées
- Les tables anciennes **n'existent plus** dans les migrations récentes
- **~50-60% du code frontend** dépend de ces tables

**Action requise** :

- **RÉÉCRIRE** complètement les pages Tableau et Édition
- **SUPPRIMER** les hooks legacy (`useTaches*`, `useRecompenses`, `useParametres`)
- **CRÉER** nouveaux hooks (`useTimelines`, `useSlots`, `useSessions`, `useCards`, etc.)
- **ADAPTER** tous les composants dépendants (~40 fichiers)

---

#### C3 — Contournement RLS potentiel

**Impact** : **SÉCURITÉ**

**Description** :

- Système RBAC côté front peut créer l'illusion d'une autorisation alors que la DB refuserait
- Logique de quotas côté front peut être désynchronisée de la DB
- Risk que certains boutons soient accessibles alors qu'ils ne devraient pas l'être

**Pourquoi c'est CRITIQUE** :

- **Violation contrat §1.6** : "Ne jamais contourner la RLS"
- Si le frontend "filtre" côté UI, l'utilisateur pourrait croire qu'il a accès à quelque chose alors que la DB refuserait

**Action requise** :

- Supprimer tout système RBAC
- Toute action doit être tentée → DB refuse ou autorise → UI gère le refus proprement

---

### 🟡 MAJEURS (bloquants fonctionnels)

#### M1 — Storage buckets legacy

**Impact** : **FONCTIONNEL**

**Description** :

- Chemins Storage utilisent des préfixes legacy : `taches`, `recompenses`
- Nouveau schéma : `personal-images/{account_id}/cards/{card_id}.jpg`

**Action requise** :

- Adapter `src/utils/storage/uploadImage.ts` et `modernUploadImage.ts`
- Migrer images existantes (ou accepter perte si environnement dev)

---

#### M2 — Tests MSW legacy

**Impact** : **QUALITÉ**

**Description** :

- Tous les mocks MSW (`src/test/mocks/handlers.ts`) utilisent les anciennes tables
- Tests unitaires et E2E vont échouer dès le premier changement

**Action requise** :

- **RÉÉCRIRE** complètement les mocks MSW pour le nouveau schéma
- Adapter les tests existants (~30 fichiers de tests)

---

#### M3 — Types TypeScript legacy

**Impact** : **QUALITÉ**

**Description** :

- `src/types/global.d.ts` exporte des types legacy : `Tache`, `Recompense`, `Profile`, `Parametre`
- Ces types sont utilisés partout dans le code

**Action requise** :

- Remplacer par nouveaux types : `Card`, `Slot`, `Timeline`, `Session`, `ChildProfile`, etc.
- Adapter tous les fichiers utilisant ces types (~100+ fichiers)

---

#### M4 — Contextes React legacy

**Impact** : **ARCHITECTURAL**

**Description** :

- `ToastContext` dépend de `parametres` (legacy) pour `toasts_enabled`
- `PermissionsContext` complet à supprimer
- `AuthContext` probablement à adapter

**Action requise** :

- Adapter `ToastContext` pour utiliser `account_preferences.toasts_enabled` (DB)
- Supprimer `PermissionsContext`
- Vérifier `AuthContext` (probablement OK mais à valider)

---

#### M5 — RGPD Export legacy

**Impact** : **CONFORMITÉ LÉGALE**

**Description** :

- `src/utils/rgpdExport.ts` exporte `taches`, `recompenses`, `profiles` (legacy)
- Le frontend doit permettre export RGPD des données personnelles

**Action requise** :

- Adapter export pour nouveau schéma : `child_profiles`, `timelines`, `slots`, `sessions`, `cards`, `sequences`, etc.

---

### 🟢 MINEURS (non bloquants)

#### m1 — TypeScript errors ignorés

**Impact** : **QUALITÉ**

**Description** :

- `ignoreBuildErrors: true` dans `next.config.js`
- ~329 erreurs TypeScript documentées dans le code

**Action requise** :

- Corriger progressivement les erreurs après migration
- Retirer `ignoreBuildErrors` avant déploiement final

---

#### m2 — Console.log de debug

**Impact** : **PERFORMANCE/SÉCURITÉ**

**Description** :

- Logs de debug actifs dans `supabaseClient.ts` (ligne 34-35)
- Compiler supprime les `console.log` en production (`removeConsole: true`)

**Action requise** :

- Vérifier que les logs sensibles ne fuitent pas en dev
- Accepter l'état actuel (logs supprimés en prod)

---

#### m3 — Fallback anon key hardcodée

**Impact** : **SÉCURITÉ**

**Description** :

- Clé anon hardcodée dans `supabaseClient.ts` (ligne 31)
- Acceptable en dev, mais devrait être uniquement en `.env` en prod

**Action requise** :

- Vérifier que la clé est bien remplacée par variable d'environnement en prod
- Optionnel : retirer le fallback

---

## 9) Conclusion S0

### Prêt pour Slice S1 : ⚠️ **OUI AVEC RÉSERVES**

### Conditions minimales à remplir

Le frontend actuel est **massivement legacy**. Pour passer en Slice S1, il faut :

1. **Accepter la refonte complète** des pages Tableau et Édition (~2000+ lignes à réécrire)
2. **Accepter la suppression** du système RBAC complet (~1000+ lignes à supprimer)
3. **Accepter la réécriture** des tests MSW (~500+ lignes)
4. **Accepter la migration** des types TypeScript (~100+ fichiers à adapter)

### Estimation d'effort

| Slice                         | Effort estimé | Complexité | Risque    |
| ----------------------------- | ------------- | ---------- | --------- |
| S1 (Auth + Accounts)          | MOYEN         | MOYENNE    | FAIBLE    |
| S2 (Profils enfants)          | FAIBLE        | FAIBLE     | FAIBLE    |
| S3 (Cartes + Storage)         | MOYEN         | MOYENNE    | MOYEN     |
| S4 (Timelines + Slots)        | **ÉLEVÉ**     | **ÉLEVÉE** | **ÉLEVÉ** |
| S5 (Sessions + Tableau)       | **ÉLEVÉ**     | **ÉLEVÉE** | **ÉLEVÉ** |
| S6 (Verrouillage + Anti-choc) | MOYEN         | ÉLEVÉE     | MOYEN     |
| S7 (Séquençage)               | MOYEN         | MOYENNE    | FAIBLE    |
| S8 (Offline + Sync)           | MOYEN         | ÉLEVÉE     | MOYEN     |
| S9 (Quotas + Downgrade)       | FAIBLE        | FAIBLE     | FAIBLE    |
| S10 (Devices)                 | FAIBLE        | FAIBLE     | FAIBLE    |
| S11 (Plateforme)              | MOYEN         | MOYENNE    | FAIBLE    |
| S12 (Admin)                   | FAIBLE        | FAIBLE     | FAIBLE    |

**Total estimé** : **~150-200 heures** de développement.

### Points positifs

✅ **Design system Sass** complet et conforme (aucune modification nécessaire)
✅ **Client Supabase** utilise uniquement anon key (pas de service_role)
✅ **Architecture Next.js** moderne (App Router, Turbopack)
✅ **Tests** infrastructure complète (Vitest + Playwright + MSW)
✅ **Stack technique** conforme (Next.js 16, React 19, TypeScript 5.9, Sass 1.86, pnpm)

### Recommandations

1. **Procéder slice par slice** (ne JAMAIS sauter d'étapes)
2. **Commencer par S1** (Auth + Accounts + Visitor) — fondations critiques
3. **S4 et S5 sont les plus critiques** (réécritures complètes Édition et Tableau)
4. **Utiliser des feature flags** si besoin de déployer progressivement
5. **Documenter chaque décision** d'adaptation (pour audit futur)
6. **Tester massivement après chaque slice** (unitaires + E2E)

---

## Annexes

### A) Fichiers critiques à auditer en détail (Slices futures)

| Fichier                                   | Slice  | Raison                              |
| ----------------------------------------- | ------ | ----------------------------------- |
| `src/hooks/useRBAC.ts`                    | S1     | RBAC complet à supprimer            |
| `src/contexts/PermissionsContext.tsx`     | S1     | RBAC complet à supprimer            |
| `src/hooks/useTachesEdition.ts`           | S4     | Logique taches → timelines/slots    |
| `src/hooks/useTachesDnd.ts`               | S4     | Drag&drop taches → timelines/slots  |
| `src/page-components/edition/Edition.tsx` | S4     | Page Édition complète (legacy)      |
| `src/page-components/tableau/Tableau.tsx` | S5     | Page Tableau complète (legacy)      |
| `src/hooks/useParametres.ts`              | S11    | parametres → account_preferences    |
| `src/hooks/useRecompenses.ts`             | S3     | recompenses → cards (reward)        |
| `src/page-components/profil/Profil.tsx`   | S2,S10 | profiles → child_profiles + devices |

---

### B) Commandes de vérification

```bash
# Vérifier service_role (doit être vide)
rg "service_role" src/

# Vérifier RBAC (doit être vide après S1)
rg "(canCreate|isAdmin|hasPermission|checkAccess)" src/

# Vérifier legacy tables (doit être vide après slices)
rg "(taches|recompenses|profiles|parametres|abonnements)" src/

# Vérifier nouveau schéma utilisé
rg "(timelines|slots|sessions|child_profiles|account_preferences)" src/

# Tests
pnpm test
pnpm test:e2e
pnpm type-check
pnpm lint
```

---

**FIN DU RAPPORT AUDIT S0**
