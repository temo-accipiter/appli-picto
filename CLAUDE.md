# CLAUDE.md

Ce fichier guide Claude Code lors du travail sur **Appli-Picto**, une application Next.js 16 pour enfants autistes (TSA).

## 🎯 À propos d'Appli-Picto

**Application** : Dashboard motivationnel pour enfants avec troubles du spectre autistique (TSA)

**Contraintes prioritaires** :

- ♿ **Accessibilité TSA d'abord** : Interface calme, prévisible, non agressive (WCAG 2.2 AA)
- 📱 **Mobile-First** : Pensé pour tablettes (768px+) et smartphones (320px+)
- 🇫🇷 **100% francophone** : Tout le code, les commentaires et la documentation en français
- 🔒 **DB-First Architecture** : Supabase RLS + hooks custom obligatoires
- 🛡️ **RGPD/CNIL compliant** : Quotas utilisateurs, consentement, portabilité données

---

## ⚙️ Commandes de développement

### ⚠️ CRITIQUE : Ce projet utilise **pnpm** (JAMAIS yarn, JAMAIS npm)

```bash
# ===== DÉVELOPPEMENT =====
pnpm dev              # Serveur dev Next.js (port 3000, Turbopack)
pnpm build            # Build production Next.js
pnpm build:analyze    # Build avec analyse bundle (ANALYZE=true)
pnpm start            # Démarrer serveur production
pnpm preview          # Alias pour pnpm start
```

### ✅ Qualité de code (OBLIGATOIRE avant commit)

```bash
pnpm check            # lint:fix + format (OBLIGATOIRE avant commit)
pnpm lint             # ESLint
pnpm lint:fix         # ESLint avec auto-fix
pnpm format           # Prettier (écriture)
pnpm format:check     # Prettier (vérification)
pnpm type-check       # Vérifier erreurs TypeScript (329 erreurs non-bloquantes)
```

**CRITIQUE** : **AVANT tout commit**, exécuter :

```bash
pnpm check && pnpm test
```

**Si échec** : Corriger les erreurs avant commit.

### 🧪 Tests

```bash
pnpm test             # Vitest unit tests (interactif)
pnpm test:run         # Vitest unit tests (non-interactif, CI)
pnpm test:ui          # Vitest avec UI
pnpm test:coverage    # Tests avec rapport de couverture
pnpm test:e2e         # Playwright E2E tests
pnpm test:e2e:ui      # Playwright avec UI
pnpm test:e2e:headed  # Playwright avec navigateur visible
pnpm test:e2e:debug   # Playwright en mode debug
```

### 🗄️ Base de données & Types (CRITIQUE après modification DB)

```bash
# ⚠️ OBLIGATOIRE après toute modification Supabase
pnpm context:update   # db:dump + db:types (génère schema.sql + types TypeScript)

# Commandes séparées
pnpm db:dump          # Dump schema Supabase vers supabase/schema.sql
pnpm db:types         # Générer types TypeScript depuis Supabase local

# Remote (production)
pnpm db:dump:remote   # Dump schema production
pnpm db:types:remote  # Générer types depuis production
pnpm context:update:remote  # db:dump:remote + db:types:remote
```

**CRITIQUE** : **APRÈS toute modification Supabase** (migrations, RLS, fonctions), exécuter :

```bash
pnpm context:update
```

**Génère** :

- `supabase/schema.sql` : Schema PostgreSQL complet
- `src/types/supabase.ts` : Types TypeScript générés automatiquement

### 🔧 Supabase local

```bash
pnpm supabase:start   # Démarrer Supabase local (Docker)
pnpm supabase:stop    # Arrêter Supabase local
pnpm supabase:status  # Statut services Supabase
pnpm db:reset         # Reset DB + appliquer migrations + policies storage
```

### ⚡ Supabase Edge Functions

```bash
pnpm supabase:serve   # Servir edge functions localement
pnpm deploy:checkout  # Déployer create-checkout-session (Stripe)
pnpm deploy:webhook   # Déployer stripe-webhook
pnpm logs:checkout    # Suivre logs checkout function (production)
pnpm logs:webhook     # Suivre logs webhook function (production)
```

### 🚀 Vérification complète

```bash
# Slash commands disponibles (raccourcis projet)
/verify-quick         # type-check + lint + build + test (rapide)
/verify-full          # verify-quick + test:e2e + test:coverage (avant deploy)
/commit               # Commit rapide avec message conventionnel et push
```

**CRITIQUE** : **AVANT déploiement production**, exécuter :

```bash
pnpm build          # DOIT réussir
pnpm preview        # DOIT tester build production
pnpm test:coverage  # DOIT maintenir couverture
```

### 🎨 CSS/SCSS

```bash
pnpm build:css        # Compiler SCSS vers CSS
pnpm build:css:watch  # Compiler SCSS en mode watch
pnpm lint:hardcoded   # Vérifier valeurs hardcodées (couleurs, spacing)
pnpm validate:touch-targets  # Vérifier tailles cibles tactiles (min 44×44px)
pnpm verify:css       # lint:hardcoded + validate:touch-targets + build:css
```

### 🎨 Refactoring SCSS

```bash
/refactor-scss <chemin-fichier-scss>  # Refactor vers design system tokens
```

---

## 🏗️ Architecture du projet

### Stack technique

- **Frontend** : React 19, **Next.js 16** (App Router, Turbopack, Route Groups)
- **Runtime** : Node.js 20.19.4 (géré par Volta)
- **Package Manager** : **pnpm 9.15.0** (JAMAIS yarn, JAMAIS npm)
- **Styling** : SCSS avec BEM-lite, design system tokens, palette pastel TSA-friendly
- **TypeScript** : Strict mode (temporairement relaxé : `noImplicitAny: false`)
- **Backend** : 100% Supabase (PostgreSQL, Auth, RLS, Storage, Edge Functions)
- **Payment** : Stripe (Checkout, subscriptions, webhooks via Edge Functions)
- **Security** : Cloudflare Turnstile (CAPTCHA), RGPD/CNIL compliance
- **Testing** : Vitest (unit), Playwright (E2E), MSW (mocks)
- **PWA** : @ducanh2912/next-pwa
- **Monitoring** : Sentry (@sentry/nextjs), Google Analytics 4

### Structure des dossiers

```
appli-picto/
├── .claude/                    # Configuration Claude Code
│   ├── commands/              # Slash commands custom (/verify-quick, /commit, etc.)
│   └── agents/                # Agents spécialisés
├── src/
│   ├── app/                   # Next.js App Router (Route Groups)
│   │   ├── (public)/         # Routes publiques : /tableau, /login, /signup, /legal/*
│   │   │   ├── tableau/      # Page Tableau (enfant)
│   │   │   ├── login/        # Connexion
│   │   │   ├── signup/       # Inscription
│   │   │   ├── legal/        # Pages légales (CGU, RGPD, accessibilité, etc.)
│   │   │   └── layout.tsx    # Layout public (pas de navbar, footer simple)
│   │   ├── (protected)/      # Routes protégées : /edition, /profil, /abonnement, /admin/*
│   │   │   ├── edition/      # Édition tâches/récompenses/séquences/timeline
│   │   │   ├── profil/       # Gestion profil utilisateur
│   │   │   ├── abonnement/   # Page abonnement Stripe
│   │   │   ├── admin/        # Routes admin (logs, metrics)
│   │   │   └── layout.tsx    # Layout protégé (ProtectedRoute, navbar desktop, footer)
│   │   ├── layout.tsx        # Root layout (providers, fonts, metadata)
│   │   ├── page.tsx          # Page d'accueil (redirect selon auth)
│   │   ├── providers.tsx     # Contexts providers (Auth, Toast, Loading, etc.)
│   │   ├── global-error.tsx  # Error boundary global
│   │   └── not-found.tsx     # Page 404
│   ├── components/            # Composants UI modulaires (chaque composant : dossier + .tsx + .scss)
│   │   ├── shared/           # Composants réutilisables
│   │   │   ├── modal/        # Modals (Modal.tsx, ModalAjout, ModalRecompense, ModalQuota, etc.)
│   │   │   ├── card/         # Cartes (BaseCard, TableauCard, EditionCard)
│   │   │   ├── dnd/          # Drag & Drop (@dnd-kit : DndCard, DndGrid, DndSlot)
│   │   │   ├── layout/       # Layout (Layout.tsx)
│   │   │   ├── protected-route/  # ProtectedRoute (vérification auth)
│   │   │   ├── admin-route/  # AdminRoute (vérification admin)
│   │   │   ├── error-boundary/   # ErrorBoundary
│   │   │   └── ...           # Autres composants partagés
│   │   ├── features/         # Composants features
│   │   │   ├── taches/       # TachesEdition, TachesDnd, TrainProgressBar
│   │   │   ├── recompenses/  # RecompensesEdition, SelectedRecompense
│   │   │   ├── cards/        # CardsEdition (gestion cartes personnelles)
│   │   │   ├── timeline/     # SlotsEditor, SlotItem, CardPicker
│   │   │   ├── tableau/      # TokensGrid, SlotCard, SessionComplete
│   │   │   ├── sequences/    # SequenceEditor, SequenceMiniTimeline
│   │   │   ├── profil/       # DeleteProfileModal, DeviceList
│   │   │   ├── settings/     # DeleteAccountModal, DeleteAccountGuard
│   │   │   ├── subscription/ # SubscribeButton
│   │   │   ├── consent/      # CookieBanner, CookiePreferences
│   │   │   ├── legal/        # LegalMarkdown
│   │   │   └── ...
│   │   ├── layout/           # Composants layout (Navbar, Footer, BottomNav, UserMenu)
│   │   └── ui/               # Composants UI de base (Button, Input, Checkbox, Select, etc.)
│   ├── page-components/      # Composants pages (Tableau, Edition, Profil, Login, Signup, etc.)
│   ├── contexts/             # State global (AuthContext, ToastContext, LoadingContext, etc.)
│   ├── hooks/                # Hooks custom Supabase (⚠️ DB-first : TOUJOURS utiliser hooks)
│   │   ├── useAccountStatus.ts      # Statut compte (free/subscriber/admin)
│   │   ├── useAuth.ts               # Authentification
│   │   ├── useBankCards.ts          # Cartes banque (pictos officiels)
│   │   ├── usePersonalCards.ts      # Cartes personnelles utilisateur
│   │   ├── useCategories.ts         # Catégories utilisateur
│   │   ├── useTimelines.ts          # Timelines (planning)
│   │   ├── useSlots.ts              # Slots (créneaux timeline)
│   │   ├── useSessions.ts           # Sessions (exécution)
│   │   ├── useSequences.ts          # Séquences (séquençage)
│   │   ├── useSequenceSteps.ts      # Étapes séquences
│   │   ├── useSubscriptionStatus.ts # Statut abonnement Stripe
│   │   ├── useAccountPreferences.ts # Préférences compte
│   │   ├── useCheckout.ts           # Checkout Stripe
│   │   ├── useDevices.ts            # Gestion devices
│   │   ├── useChildProfiles.ts      # Profils enfants
│   │   └── index.ts                 # Exports centralisés
│   ├── utils/                # Utilitaires
│   │   ├── supabaseClient.ts        # Client Supabase
│   │   ├── compressImage.ts         # Compression images (max 100KB)
│   │   └── ...
│   ├── styles/               # SCSS global (design system tokens-first)
│   │   ├── main.scss         # Point d'entrée SCSS
│   │   ├── abstracts/        # Tokens, mixins, functions, breakpoints
│   │   ├── base/             # Reset, helpers, typographie globale
│   │   └── themes/           # Thèmes (light, dark)
│   └── types/                # Types TypeScript
│       └── supabase.ts       # Types générés automatiquement (pnpm db:types)
├── supabase/
│   ├── functions/            # Edge Functions (create-checkout-session, stripe-webhook)
│   ├── migrations/           # Migrations SQL (55+ migrations)
│   └── schema.sql            # Schema PostgreSQL (généré par pnpm db:dump)
├── public/                   # Assets statiques (images, fonts, icons)
├── scripts/                  # Scripts utilitaires (check-bundle, check-hardcoded, etc.)
├── tests/                    # Tests E2E Playwright
└── package.json              # Dépendances et scripts
```

---

## 🚨 RÈGLES D'ARCHITECTURE CRITIQUES

### 1. 🔒 DB-First Architecture : Hooks Supabase (OBLIGATOIRE)

**CRITIQUE** : **TOUJOURS** utiliser hooks custom, **JAMAIS** query Supabase directe.

```typescript
// ❌ INTERDIT - Query Supabase directe
import { supabase } from '@/utils/supabaseClient'
const { data } = await supabase.from('cards').select()

// ✅ CORRECT - Utiliser hooks custom
import { useBankCards } from '@/hooks'
const { bankCards, loading, error } = useBankCards()
```

**Hooks disponibles** (voir `src/hooks/index.ts`) :

**Identité & Auth** :

- `useAuth()` : Authentification (user, authReady, signOut, etc.)
- `useAccountStatus()` : Statut compte (free/subscriber/admin) - **COSMÉTIQUE UNIQUEMENT**
- `useAccountPreferences()` : Préférences utilisateur (train_enabled, reduced_motion)
- `useSubscriptionStatus()` : Statut abonnement Stripe

**Cartes & Catégories** :

- `useBankCards()` : Cartes banque (pictos officiels) - **READ-ONLY**
- `usePersonalCards()` : Cartes personnelles utilisateur (CRUD)
- `useCategories()` : Catégories utilisateur (CRUD)
- `useChildProfiles()` : Profils enfants (CRUD)

**Planning (Timelines)** :

- `useTimelines()` : Timelines (CRUD)
- `useSlots()` : Slots (créneaux timeline) (CRUD)

**Exécution (Sessions)** :

- `useSessions()` : Sessions (exécution) (CRUD)
- `useSessionValidations()` : Validations sessions (CRUD)

**Séquençage** :

- `useSequences()` : Séquences (CRUD)
- `useSequenceSteps()` : Étapes séquences (CRUD)
- `useSequencesWithVisitor()` : Séquences unifiées (DB + local visitor)
- `useSequenceStepsWithVisitor()` : Étapes unifiées (DB + local visitor)

**Devices** :

- `useDevices()` : Liste devices utilisateur
- `useDeviceRegistration()` : Enregistrement device

**Checkout** :

- `useCheckout()` : Checkout Stripe (createCheckoutSession)

**UI Helpers** :

- `useReducedMotion()` : Détection prefers-reduced-motion
- `useScrollLock()` : Verrouillage scroll (modals)
- `useEscapeKey()` : Détection touche Escape
- `useFocusTrap()` : Piège focus (accessibilité modals)
- `useDebounce()` : Debounce input
- `useOnlineStatus()` : Détection hors ligne

**CRITIQUE** : L'autorisation est gérée par **Supabase RLS** (DB-first), **PAS côté frontend**.

**Exemple complet** :

```typescript
'use client'

import { useBankCards, usePersonalCards, useCategories } from '@/hooks'

export default function CardsEdition() {
  const { bankCards, loading: loadingBank } = useBankCards()
  const { personalCards, createCard, loading: loadingPersonal } = usePersonalCards()
  const { categories } = useCategories()

  // ✅ CORRECT - Tentative création → gestion refus DB
  const handleCreate = async (data) => {
    try {
      await createCard(data)
      // ✅ Si quotas dépassés → erreur DB catchée ici
    } catch (err) {
      // Afficher erreur utilisateur
    }
  }

  return (
    <div>
      {/* Affichage cartes */}
    </div>
  )
}
```

### 2. 📱 Next.js App Router (OBLIGATOIRE)

**CRITIQUE** : Projet migré vers **Next.js 16 App Router** (Nov 2024).

```typescript
// ❌ INTERDIT - Ancien React Router (supprimé)
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()

// ✅ CORRECT - Next.js App Router
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/edition')
```

**Router Next.js** :

- `useRouter()` : Navigation programmatique
- `usePathname()` : URL actuelle
- `useSearchParams()` : Query params
- `redirect()` : Redirection server-side

**Route Groups** :

- `(public)/` : Routes publiques (pas d'auth requise)
- `(protected)/` : Routes protégées (auth requise via ProtectedRoute)

### 3. 🔄 Server Components vs Client Components

**CRITIQUE** : **Server Components par défaut** (Next.js 16).

**Ajouter `'use client'` SEULEMENT si** :

- Utilisation de hooks React (useState, useEffect, etc.)
- Utilisation de event handlers (onClick, onChange, etc.)
- Utilisation de hooks custom (@/hooks)
- Utilisation de contexts (@/contexts)

```typescript
// ❌ INTERDIT - 'use client' non nécessaire
'use client'

export default function StaticCard({ title }: { title: string }) {
  return <div>{title}</div>
}

// ✅ CORRECT - Server Component par défaut
export default function StaticCard({ title }: { title: string }) {
  return <div>{title}</div>
}

// ✅ CORRECT - 'use client' SEULEMENT si interactivité
'use client'

import { useState } from 'react'

export default function InteractiveCard() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  )
}
```

**Statistiques projet** : 125 composants marqués `'use client'` (vérifié par Grep).

### 4. 📂 Imports absolus (OBLIGATOIRE)

**CRITIQUE** : **TOUJOURS** utiliser alias `@/` (pointe vers `src/`).

```typescript
// ❌ INTERDIT - Imports relatifs
import Modal from '../../components/shared/modal/Modal'
import { useBankCards } from '../../../hooks/useBankCards'

// ✅ CORRECT - Alias @ (absolus)
import Modal from '@/components/shared/modal/Modal'
import { useBankCards } from '@/hooks'
```

**Alias disponibles** (voir `tsconfig.json`) :

- `@/*` → `./src/*`
- `@styles/*` → `./src/styles/*`

### 5. ♿ Accessibilité TSA (WCAG 2.2 AA)

**CRITIQUE** : Application destinée à des **enfants autistes** (TSA).

**TOUJOURS respecter** :

#### Animations douces

- ✅ **Max 0.3s ease** : Animations courtes et douces
- ✅ **Respect prefers-reduced-motion** : Utiliser `useReducedMotion()`
- ❌ **Jamais brusques** : Pas de transitions rapides ou agressives
- ❌ **Pas de clignotement > 3Hz** : Risque épilepsie

```typescript
import { useReducedMotion } from '@/hooks'

export default function AnimatedComponent() {
  const reducedMotion = useReducedMotion()

  return (
    <div
      style={{
        transition: reducedMotion ? 'none' : 'transform 0.3s ease',
      }}
    >
      {/* Contenu */}
    </div>
  )
}
```

#### Couleurs pastel apaisantes

- ✅ **Palette pastel** : Couleurs douces, non agressives
- ✅ **Contraste minimum 4.5:1** : WCAG AA
- ✅ **Utiliser tokens design system** : Jamais de valeurs hardcodées

```scss
// ❌ INTERDIT - Couleurs hardcodées
.card {
  background: #ff0000; // ❌ Trop agressif
  color: #ccc; // ❌ Contraste insuffisant
}

// ✅ CORRECT - Tokens design system
.card {
  background: var(--color-surface-primary);
  color: var(--color-text-primary);
}
```

#### Cibles tactiles (mobile)

- ✅ **Minimum 44×44px** : Taille minimale cibles tactiles (WCAG)
- ✅ **Espacement 8px minimum** : Entre cibles tactiles adjacentes

```scss
// ✅ CORRECT - Cibles tactiles suffisamment grandes
.button {
  min-width: 44px;
  min-height: 44px;
  padding: var(--spacing-md);
}
```

#### Focus visible

- ✅ **TOUJOURS visible** : Focus clavier toujours visible
- ✅ **Contraste suffisant** : Outline bien visible

```scss
// ✅ CORRECT - Focus visible
.button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

#### Labels et ARIA

- ✅ **TOUJOURS des labels** : Sur tous les inputs
- ✅ **ARIA approprié** : role, aria-label, aria-describedby
- ✅ **Structure sémantique** : <main>, <nav>, <header>, <footer>

```tsx
// ✅ CORRECT - Labels et ARIA
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-describedby="email-help"
  required
/>
<span id="email-help">Votre adresse email</span>
```

### 6. 🛡️ Gestion Quotas (RGPD/CNIL)

**CRITIQUE** : Quotas utilisateurs **appliqués par la DB via RLS**, **PAS côté frontend**.

**Quotas** :

- **Free** : 5 cartes personnelles, 2 catégories personnelles, 2 profils enfants, 1 device
- **Subscriber** : 40 cartes, 50 catégories, 10 profils, 5 devices
- **Admin** : Illimité

**Hook cosmétique** : `useAccountStatus()` (affichage UI uniquement)

```typescript
import { useAccountStatus } from '@/hooks'

function CreateCardButton() {
  const { isFree, isSubscriber } = useAccountStatus()

  // ✅ CORRECT - Affichage cosmétique
  if (isFree) {
    return <Badge>Gratuit - 5 cartes max</Badge>
  }

  // ✅ TOUJOURS tenter l'action → gérer refus DB proprement
  const handleCreate = async () => {
    try {
      await createCard(data)
      // ✅ Si quotas dépassés → erreur DB catchée ici
    } catch (err) {
      // Afficher erreur utilisateur (ex: ModalQuota)
    }
  }

  return <button onClick={handleCreate}>Créer carte</button>
}
```

---

## 🎨 Style & Conventions

### SCSS (Design System Tokens-First)

**CRITIQUE** : Projet utilise **design system tokens** (CSS custom properties).

#### Architecture SCSS

```scss
// src/styles/main.scss
@use './vendors/normalize'; // 1. Normalize (vendor)
@use './abstracts' as *; // 2. Abstracts (tokens, mixins, functions)
@use './abstracts/colors'; // 3. Colors tokens (génère CSS vars)
@use './abstracts/typography'; // 4. Typography tokens
@use './abstracts/spacing'; // 5. Spacing tokens
@use './abstracts/motion'; // 6. Motion tokens
@use './abstracts/radius'; // 7. Radius tokens
@use './abstracts/shadows'; // 8. Shadows tokens
@use './abstracts/forms'; // 9. Forms tokens
@use './base'; // 10. Base (reset, helpers, typo)
@use './themes/light'; // 11. Light theme
@use './themes/dark'; // 12. Dark theme
```

#### BEM-lite

```scss
// ✅ CORRECT - BEM-lite
.block {
  // Styles du block
}

.block__element {
  // Styles de l'élément
}

.block--modifier {
  // Styles du modificateur
}
```

#### Tokens obligatoires

**❌ JAMAIS de valeurs hardcodées** : Toujours utiliser tokens.

```scss
// ❌ INTERDIT - Valeurs hardcodées
.card {
  background: #f0f0f0;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

// ✅ CORRECT - Tokens design system
.card {
  background: var(--color-surface-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: var(--motion-duration-quick) var(--motion-easing-default);
}
```

**Tokens disponibles** :

**Colors** :

- `--color-primary`, `--color-secondary`, `--color-accent`
- `--color-surface-primary`, `--color-surface-secondary`
- `--color-text-primary`, `--color-text-secondary`
- `--color-success`, `--color-error`, `--color-warning`, `--color-info`

**Spacing** :

- `--spacing-xs`, `--spacing-sm`, `--spacing-md`, `--spacing-lg`, `--spacing-xl`

**Radius** :

- `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`

**Shadows** :

- `--shadow-sm`, `--shadow-md`, `--shadow-lg`

**Motion** :

- `--motion-duration-quick` (0.15s)
- `--motion-duration-normal` (0.3s)
- `--motion-duration-slow` (0.5s)
- `--motion-easing-default` (ease)

#### Vérification tokens

```bash
pnpm lint:hardcoded            # Vérifier valeurs hardcodées
pnpm validate:touch-targets    # Vérifier tailles cibles tactiles
```

#### Refactoring SCSS

```bash
/refactor-scss <chemin-fichier-scss>  # Refactor vers tokens design system
```

### TypeScript

**Mode strict** : Temporairement relaxé pour migration Next.js.

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": false, // Relaxé (-350 erreurs)
    "noImplicitReturns": false, // Relaxé (-28 erreurs)
    "noUnusedLocals": false, // Relaxé (-20 erreurs)
    "noUnusedParameters": false // Relaxé (-15 erreurs)
  }
}
```

**État actuel** : 329 erreurs TypeScript non-bloquantes (build fonctionne, tests passent).

**Règles** :

- ✅ **Types Supabase** : Générés automatiquement (`pnpm db:types`)
- ✅ **Imports types** : `import type { ... } from '...'`
- ❌ **Éviter `any`** : Sauf temporairement pour migration

### Imports

**TOUJOURS absolus** (alias `@/`) :

```typescript
// ✅ CORRECT - Imports absolus
import { useBankCards } from '@/hooks'
import Modal from '@/components/shared/modal/Modal'
import { supabase } from '@/utils/supabaseClient'
import '@/styles/main.scss'
```

### Conventions nommage

**Fichiers** :

- Composants : `PascalCase.tsx` (ex: `Modal.tsx`)
- Hooks : `camelCase.ts` (ex: `useAuth.ts`)
- Utils : `camelCase.ts` (ex: `compressImage.ts`)
- Styles : `Component.scss` (ex: `Modal.scss`)

**Variables** :

- camelCase : `const isLoading = true`
- UPPER_SNAKE_CASE : `const MAX_FILE_SIZE = 100 * 1024`

**Types** :

- PascalCase : `type BankCard = { ... }`
- Interface : `interface UseAuthReturn { ... }`

---

## 🔄 Workflows critiques

### AVANT tout commit (OBLIGATOIRE)

```bash
pnpm check   # lint:fix + format (OBLIGATOIRE)
pnpm test    # Tests unitaires (OBLIGATOIRE)
```

**Si échec** : Corriger erreurs avant commit.

**Slash command** :

```bash
/commit  # Commit rapide avec message conventionnel et push
```

### APRÈS modification Supabase (OBLIGATOIRE)

```bash
pnpm context:update  # Dump schema + generate types (OBLIGATOIRE)
```

**Génère** :

- `supabase/schema.sql` : Schema PostgreSQL complet
- `src/types/supabase.ts` : Types TypeScript

**Déclencheurs** :

- ✅ Nouvelle migration SQL
- ✅ Modification RLS policies
- ✅ Modification fonctions PostgreSQL
- ✅ Modification enums
- ✅ Modification Edge Functions

### AVANT déploiement (OBLIGATOIRE)

```bash
pnpm build          # DOIT réussir
pnpm preview        # DOIT tester build production
pnpm test:coverage  # DOIT maintenir couverture
```

**Slash command** :

```bash
/verify-full  # type-check + lint + format + test + coverage + e2e + build
```

### Migrations Supabase

**Créer migration** :

```bash
/supabase-migrate <description-migration>
```

**Appliquer migrations** :

```bash
pnpm db:reset  # Reset DB + appliquer toutes migrations
```

---

## 🔍 Vérifications spécifiques Appli-Picto

**TOUJOURS vérifier** :

### ✅ Supabase RLS

- ✅ **Policies activées** : Sur toutes tables privées
- ✅ **Hooks custom** : TOUJOURS utiliser hooks, JAMAIS query directe
- ✅ **Autorisation DB** : Vérifier RLS gère autorisation, PAS frontend

### ✅ Quotas

- ✅ **DB-first** : Quotas appliqués par DB via RLS
- ✅ **useAccountStatus()** : COSMÉTIQUE uniquement (badges, labels)
- ✅ **Gestion erreurs** : Toujours catcher erreurs DB (quotas dépassés)

### ✅ Auth

- ✅ **authReady** : Vérifier `authReady` avant accès `user`
- ✅ **ProtectedRoute** : Routes protégées dans `(protected)/`
- ✅ **AdminRoute** : Routes admin dans `(protected)/admin/`

### ✅ Images

- ✅ **Compression 100KB max** : `compressImageIfNeeded` (utils)
- ✅ **Storage Supabase** : Bucket `personal-images`
- ✅ **RLS Storage** : Policies activées sur buckets

### ✅ Hydration Next.js

- ✅ **Éviter mismatches SSR/client** : Server/Client components bien séparés
- ✅ **useState initial** : Valeurs initiales cohérentes
- ✅ **useEffect** : Éviter modifications DOM avant hydration

### ✅ `'use client'`

- ✅ **SEULEMENT si interactivité** : Hooks, events, contexts
- ❌ **Pas par défaut** : Server Components par défaut

### ✅ Hooks custom

- ✅ **TOUJOURS utiliser** : useBankCards, usePersonalCards, useCategories, etc.
- ❌ **JAMAIS query directe** : Supabase queries directes interdites

### ✅ Accessibilité TSA

- ✅ **Animations douces** : Max 0.3s ease, respect prefers-reduced-motion
- ✅ **WCAG 2.2 AA** : Contraste, focus visible, labels, ARIA
- ✅ **Cibles tactiles 44×44px** : Minimum pour mobile
- ✅ **Couleurs pastel** : Palette apaisante, pas de couleurs agressives

---

## 📚 Migrations importantes

### React Router → Next.js App Router (Nov 2024)

**CRITIQUE** : Projet migré vers **Next.js 16 App Router** (Nov 2024).

**Changements** :

- ❌ **Plus de react-router-dom** : Utiliser `next/navigation`
- ✅ **Route groups** : `(public)/` et `(protected)/`
- ✅ **Metadata API** : SEO optimisé pour toutes pages
- ✅ **125 composants** : Correctement marqués `'use client'`

**Router Next.js** :

```typescript
// ❌ INTERDIT
import { useNavigate, useLocation } from 'react-router-dom'

// ✅ CORRECT
import { useRouter, usePathname } from 'next/navigation'
```

### Yarn → pnpm (Nov 2024)

**CRITIQUE** : Projet migré vers **pnpm** (Nov 2024).

**Performance** :

- ✅ **Build -87%** : 2m30s → 20s
- ✅ **Installation -81%** : 45s → 8.5s

**Règles** :

- ✅ **TOUJOURS pnpm** : `pnpm install`, `pnpm dev`, etc.
- ❌ **JAMAIS yarn** : Supprimé du projet
- ❌ **JAMAIS npm** : Utiliser pnpm uniquement

### Tables supprimées (LEGACY)

**CRITIQUE** : Tables `taches` et `recompenses` supprimées (S4 - Timelines/Slots).

**Remplacement** :

- ❌ `useTaches()` → ✅ `useSlots()` (slots step/reward)
- ❌ `useRecompenses()` → ✅ `useSlots()` (slots reward)

**Hooks LEGACY conservés mais non exportés** :

- `useTaches.ts` (fichier conservé, non exporté)
- `useTachesDnd.ts` (fichier conservé, non exporté)
- `useFallbackData.ts` (fichier conservé, non exporté)

---

## ❌ JAMAIS faire

- ❌ Query Supabase directe (TOUJOURS utiliser hooks)
- ❌ Commit sans `pnpm check && pnpm test`
- ❌ Deploy sans `pnpm build && pnpm preview`
- ❌ Modifier DB sans `pnpm context:update`
- ❌ Upload images > 100KB (compression auto enforced)
- ❌ Créer fichiers .md sans demande explicite
- ❌ Utiliser `yarn` ou `npm`
- ❌ Importer `react-router-dom`
- ❌ Valeurs hardcodées (couleurs, spacing) - Utiliser tokens
- ❌ Animations > 0.3s ou agressives
- ❌ Ignorer prefers-reduced-motion
- ❌ Cibles tactiles < 44×44px
- ❌ Focus invisible
- ❌ Contraste < 4.5:1
- ❌ Imports relatifs (utiliser `@/`)
- ❌ `'use client'` par défaut (Server Components par défaut)
- ❌ Utiliser `useAccountStatus()` pour autorisation (cosmétique uniquement)

---

## ✅ TOUJOURS faire

- ✅ Répondre en français (projet 100% francophone)
- ✅ Vérifier accessibilité TSA (WCAG 2.2 AA)
- ✅ Utiliser hooks custom Supabase (DB-first)
- ✅ Ajouter `'use client'` SEULEMENT si interactivité
- ✅ Vérifier quotas gérés par DB (pas frontend)
- ✅ Tester avec `pnpm check && pnpm test`
- ✅ Utiliser tokens design system (pas de valeurs hardcodées)
- ✅ Imports absolus (`@/`)
- ✅ Animations douces (max 0.3s ease)
- ✅ Respect prefers-reduced-motion
- ✅ Cibles tactiles ≥ 44×44px
- ✅ Focus visible
- ✅ Contraste ≥ 4.5:1
- ✅ `pnpm context:update` après modif Supabase
- ✅ Penser Mobile-First (tablette/smartphone d'abord)

---

## 🎯 Slash Commands disponibles

```bash
/verify-quick         # Vérification rapide (type-check + lint + build + test)
/verify-full          # Vérification complète (quick + e2e + coverage)
/commit               # Commit rapide avec message conventionnel et push
/supabase-migrate     # Créer et appliquer migration Supabase
/refactor-scss        # Refactor SCSS vers design system tokens
/test-component       # Exécuter tests unitaires pour un composant
/debug                # Analyse ultra-approfondie pour bugs sérieux
/explore              # Exploration approfondie du codebase
/deep-code-analysis   # Analyser code en profondeur (questions complexes)
```

---

## 🔗 Ressources

- **Supabase Dashboard** : Via `pnpm supabase:status`
- **Next.js Docs** : https://nextjs.org/docs
- **Stripe Docs** : https://stripe.com/docs
- **WCAG 2.2** : https://www.w3.org/WAI/WCAG22/quickref/
- **Design System Tokens** : `src/styles/abstracts/`

---

## 📝 Notes importantes

### TypeScript

**329 erreurs TypeScript non-bloquantes** : Build fonctionne, tests passent. Migration progressive vers strict mode complet.

### Node.js

**Runtime** : Node.js 20.19.4 (géré par Volta).

### Environnement

**Fichiers env** :

- `.env.development.local` : Dev local (Docker Supabase)
- `.env.production` : Production (Supabase Cloud)
- `.env.example` : Template

**Variables critiques** :

- `NEXT_PUBLIC_SUPABASE_URL` : URL Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anon Supabase
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` : Cloudflare Turnstile
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` : Stripe public
- `NEXT_PUBLIC_STRIPE_PRICE_ID` : Price ID abonnement

### Ports

- **3000** : Next.js dev server (Turbopack)
- **54321** : Supabase local (Docker)

---

## 🧩 Systèmes conceptuels (CRITIQUE)

**Appli-Picto repose sur 3 systèmes distincts** :

### 1. Planning (Timelines)

- **Entités** : Timelines, Slots (step/reward)
- **Hooks** : `useTimelines()`, `useSlots()`
- **Rôle** : Construction timeline (planning)

### 2. Exécution (Sessions)

- **Entités** : Sessions, SessionValidations
- **Hooks** : `useSessions()`, `useSessionValidations()`
- **Rôle** : Exécution timeline (validation tâches)

### 3. Séquençage (Sequences)

- **Entités** : Sequences, SequenceSteps
- **Hooks** : `useSequences()`, `useSequenceSteps()`
- **Rôle** : Séquences pas-à-pas (guidance enfant)

**CRITIQUE** : Ne pas fusionner ces 3 systèmes (séparation conceptuelle stricte).

---

## 🎨 Composants par catégorie

### Shared (Composants réutilisables)

- **Modals** : Modal, ModalAjout, ModalRecompense, ModalQuota, ModalConfirm, ModalCategory
- **Cards** : BaseCard, TableauCard, EditionCard
- **DnD** : DndCard, DndGrid, DndSlot
- **Layout** : Layout, ProtectedRoute, AdminRoute
- **UI** : ErrorBoundary, PageTransition, GlobalLoader, Separator

### Features (Composants features)

- **Taches** : TachesEdition, TachesDnd, TrainProgressBar
- **Recompenses** : RecompensesEdition, SelectedRecompense
- **Cards** : CardsEdition
- **Timeline** : SlotsEditor, SlotItem, CardPicker
- **Tableau** : TokensGrid, SlotCard, SessionComplete
- **Sequences** : SequenceEditor, SequenceMiniTimeline
- **Profil** : DeleteProfileModal, DeviceList
- **Settings** : DeleteAccountModal, DeleteAccountGuard
- **Subscription** : SubscribeButton
- **Consent** : CookieBanner, CookiePreferences
- **Legal** : LegalMarkdown

### Layout (Composants layout)

- **Navbar** : Navbar (desktop uniquement)
- **Footer** : Footer
- **BottomNav** : BottomNav (mobile uniquement)
- **UserMenu** : UserMenu

### UI (Composants UI de base)

- **Button** : Button, ButtonClose, ButtonDelete
- **Input** : Input, InputWithValidation
- **Checkbox** : Checkbox
- **Select** : Select, SelectWithImage
- **Toast** : Toast
- **Loader** : Loader
- **UploadProgress** : UploadProgress
- **ImagePreview** : ImagePreview
- **PasswordChecklist** : PasswordChecklist
- **FloatingPencil** : FloatingPencil

---

## 🚀 Démarrage rapide

```bash
# 1. Installation dépendances
pnpm install

# 2. Démarrer Supabase local
pnpm supabase:start

# 3. Vérifier statut Supabase
pnpm supabase:status

# 4. Démarrer serveur dev
pnpm dev

# 5. Ouvrir http://localhost:3000
```

**Supabase local** :

- Studio : http://127.0.0.1:54323
- API : http://127.0.0.1:54321
- DB : postgresql://postgres:postgres@127.0.0.1:54322/postgres

---

## 🐛 Debugging

### Logs Supabase Edge Functions

```bash
pnpm logs:checkout  # Logs create-checkout-session
pnpm logs:webhook   # Logs stripe-webhook
```

### Tests E2E debug

```bash
pnpm test:e2e:debug    # Playwright debug mode
pnpm test:e2e:headed   # Playwright avec navigateur visible
pnpm test:e2e:ui       # Playwright UI
```

### Diagnostics

```bash
pnpm type-check        # Vérifier erreurs TypeScript
pnpm lint              # Vérifier erreurs ESLint
pnpm test:coverage     # Couverture tests
pnpm build:analyze     # Analyse bundle
```

---

**Dernière mise à jour** : 2026-03-18
