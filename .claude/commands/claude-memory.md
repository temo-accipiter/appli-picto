---
description: Créer et mettre à jour les fichiers CLAUDE.md avec les meilleures pratiques pour Appli-Picto
allowed-tools: Read, Write, Edit, MultiEdit, Glob, Grep, Bash
argument-hint: <action> <chemin> - ex. "create global", "update src/components/CLAUDE.md"
model: sonnet
---

Tu es un spécialiste CLAUDE.md pour **Appli-Picto**, une application Next.js 16 pour enfants autistes. Crée et maintiens des fichiers de contexte projet qui guident Claude Code efficacement.

**Tu dois ULTRA RÉFLÉCHIR sur la spécificité, la clarté et les conseils actionnables.**

## Contexte Appli-Picto (CRITIQUE)

**TOUJOURS inclure ces spécificités dans TOUS les CLAUDE.md** :

### Stack technique obligatoire

- **Framework** : Next.js 16 (App Router, Turbopack)
- **Runtime** : Node.js 20.19.4 (géré par Volta)
- **Package Manager** : **pnpm 9.15.0** (JAMAIS yarn, JAMAIS npm)
- **Styling** : SCSS avec BEM-lite, palette pastel TSA-friendly
- **TypeScript** : Strict mode (temporairement relaxé pour migration)
- **Backend** : 100% Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Payment** : Stripe (Checkout, webhooks)
- **Dev Server** : Port 3000 (Next.js avec Turbopack)

### Règles d'architecture CRITIQUES

- ✅ **TOUJOURS utiliser hooks custom** : `useTaches`, `useRecompenses`, `useAccountStatus`, etc.
- ❌ **JAMAIS query Supabase directe** : Interdit de faire `supabase.from('taches').select()`
- ✅ **Next.js App Router** : `useRouter` de `next/navigation`
- ❌ **JAMAIS react-router-dom** : Projet migré vers Next.js App Router
- ✅ **Server Components par défaut** : Ajouter `'use client'` SEULEMENT si interactivité
- ✅ **Accessibilité TSA d'abord** : WCAG 2.2 AA, animations douces (max 0.3s ease), couleurs pastel

### Workflows obligatoires

- **AVANT commit** : `pnpm check` (lint + format) + `pnpm test` (OBLIGATOIRE)
- **APRÈS modification DB** : `pnpm context:update` (dump schema + generate types)
- **AVANT deploy** : `pnpm build` + `pnpm preview` + `pnpm test:coverage`

### Quotas utilisateurs (RGPD/CNIL)

- **Free** : 5 tâches, 2 récompenses, 2 catégories
- **Abonné** : 40 tâches, 10 récompenses, 50 catégories
- **Vérification obligatoire** : Utiliser `useAccountStatus()` AVANT toute création

## Workflow de la commande

1. **PARSER ARGUMENTS** : Déterminer action et scope
   - `create global` : Nouveau CLAUDE.md à la racine du projet
   - `create <dossier>` : Nouveau CLAUDE.md spécifique au dossier
   - `update <chemin>` : Mettre à jour CLAUDE.md existant
   - **CRITIQUE** : Valider le chemin et déterminer si global ou spécifique

2. **ANALYSER CONTEXTE** : Rechercher patterns existants
   - `Glob` pour trouver CLAUDE.md existants (patterns de référence)
   - `Read` package.json, CLAUDE.md racine, fichiers clés pour comprendre structure
   - `Grep` pour patterns d'import, frameworks, commandes
   - **CRITIQUE** : Focus sur spécificité - "Utiliser indentation 2 espaces" pas "Formater proprement"
   - **ULTRA RÉFLÉCHIR** : Quel contexte actionable Claude a-t-il besoin ?

3. **COLLECTER INFOS** : Rassembler informations spécifiques au projet
   - **Pour Global** : Architecture, stack tech, deployment, commandes clés
   - **Pour Dossier** : Patterns spécifiques, conventions, fichiers importants dans ce dossier
   - Utiliser `find` et exploration fichiers pour comprendre structure
   - **CRITIQUE** : Focus sur conseils actionnables, pas juste documentation

4. **CRÉER/MAJ CONTENU** : Construire guidance complète
   - **Utiliser bullet points markdown** pour organisation claire
   - **Grouper infos liées** sous titres markdown descriptifs
   - **Être extrêmement spécifique** : Commandes exactes, chemins fichiers, patterns
   - **Inclure syntaxe @** pour imports (ex: @/components/shared/Modal)
   - **Maximum 5 sauts d'import** pour includes récursifs
   - **ULTRA RÉFLÉCHIR** : Quels patterns spécifiques Claude rencontrera répétitivement ?

5. **VALIDER ET SAUVEGARDER** : Assurer qualité et sauvegarder
   - Vérifier toutes les commandes sont exactes avec structure projet
   - Vérifier chemins fichiers existent et sont corrects
   - `Write` vers localisation cible
   - **CRITIQUE** : Tester commandes mentionnées si possible

## Template CLAUDE.md Global (Appli-Picto)

````markdown
# CLAUDE.md

Ce fichier guide Claude Code lors du travail sur Appli-Picto.

## Commandes de développement

### Commandes essentielles

**CRITIQUE** : Ce projet utilise **pnpm** (PAS yarn, PAS npm)

```bash
pnpm dev              # Serveur dev Next.js (port 3000, Turbopack)
pnpm build            # Build production Next.js
pnpm build:analyze    # Build avec analyse bundle
pnpm start            # Démarrer serveur production
```
````

### Qualité de code (OBLIGATOIRE avant commit)

```bash
pnpm check            # lint:fix + format (OBLIGATOIRE avant commit)
pnpm lint             # ESLint
pnpm lint:fix         # ESLint avec auto-fix
pnpm format           # Prettier
pnpm type-check       # Vérifier erreurs TypeScript (329 non-bloquantes)
```

### Tests

```bash
pnpm test             # Vitest unit tests
pnpm test:ui          # Vitest avec UI
pnpm test:coverage    # Tests avec couverture
pnpm test:e2e         # Playwright E2E tests
```

### Base de données & Types (CRITIQUE après modification DB)

```bash
pnpm context:update   # db:dump + db:types (OBLIGATOIRE après modif Supabase)
pnpm db:dump          # Dump schema Supabase vers supabase/schema.sql
pnpm db:types         # Générer types TypeScript depuis Supabase
```

### Supabase Edge Functions

```bash
pnpm supabase:serve   # Servir edge functions localement
pnpm deploy:checkout  # Déployer create-checkout-session
pnpm deploy:webhook   # Déployer stripe-webhook
pnpm logs:checkout    # Suivre logs checkout function
pnpm logs:webhook     # Suivre logs webhook function
```

### Vérification complète

```bash
/verify-quick         # type-check + lint + build + test (rapide)
/verify-full          # verify-quick + test:e2e + test:coverage (avant deploy)
```

## Aperçu Architecture

**Application** : Dashboard motivationnel pour enfants autistes (TSA)

### Stack technique

- **Frontend** : React 19, **Next.js 16** (App Router, Turbopack)
- **Styling** : SCSS avec BEM-lite, palette pastel apaisante
- **Backend** : 100% Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)
- **Payment** : Stripe (Checkout, subscriptions, webhooks)
- **Security** : Cloudflare Turnstile (CAPTCHA), RGPD/CNIL compliant
- **Testing** : Vitest (unit), Playwright (E2E)
- **PWA** : @ducanh2912/next-pwa
- **Node** : 20.19.4 (géré par Volta)
- **Package Manager** : **pnpm 9.15.0**

### Structure clé

```
src/
├── app/                  # Next.js App Router
│   ├── (public)/        # Routes publiques (tableau, login, signup)
│   └── (protected)/     # Routes protégées (edition, profil, abonnement)
├── components/          # Composants UI modulaires (chaque avec .tsx + .scss)
│   ├── shared/         # Composants réutilisables (Modal, Layout, Button)
│   ├── taches/         # Composants tâches (TacheCard, TachesDnd)
│   └── recompenses/    # Composants récompenses
├── contexts/           # State global (AuthContext, PermissionsContext, ToastContext)
├── hooks/              # Hooks custom Supabase (useTaches, useRecompenses, useAccountStatus)
├── page-components/    # Composants pages (Tableau, Edition, Profil)
├── utils/              # Utilitaires (supabaseClient, compressImage)
└── styles/             # SCSS global (main.scss, animations.scss)

supabase/
├── functions/          # Edge Functions (create-checkout-session, stripe-webhook)
├── migrations/         # Migrations SQL
└── schema.sql          # Schema PostgreSQL (généré par db:dump)
```

## Règles d'architecture CRITIQUES

### 1. Hooks Supabase (OBLIGATOIRE)

**CRITIQUE** : TOUJOURS utiliser hooks custom, JAMAIS query directe

```typescript
// ❌ INTERDIT - Query directe Supabase
const { data } = await supabase.from('taches').select()

// ✅ CORRECT - Utiliser hooks custom
import { useTaches } from '@/hooks'
const { taches, loading } = useTaches()
```

**Hooks disponibles** :

- `useTaches()` : CRUD tâches
- `useRecompenses()` : CRUD récompenses
- `useAccountStatus()` : Gestion quotas (Free: 5 tâches, Abonné: 40)
- `useAuth()` : Authentification
- `useRBAC()` : Contrôle accès features

### 2. Next.js App Router (OBLIGATOIRE)

```typescript
// ❌ INTERDIT - Ancien React Router
import { useNavigate } from 'react-router-dom'

// ✅ CORRECT - Next.js App Router
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/edition')
```

### 3. Server vs Client Components

```typescript
// ❌ INTERDIT - 'use client' non nécessaire
'use client'
export default function StaticCard({ title }) {
  return <div>{title}</div>
}

// ✅ CORRECT - Server Component par défaut
export default function StaticCard({ title }) {
  return <div>{title}</div>
}

// ✅ CORRECT - 'use client' SEULEMENT si hooks/events
'use client'
import { useState } from 'react'
export default function InteractiveCard() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### 4. Imports absolus (OBLIGATOIRE)

```typescript
// ❌ INTERDIT - Imports relatifs
import Modal from '../../components/shared/Modal'

// ✅ CORRECT - Alias @ (pointe vers src/)
import Modal from '@/components/shared/Modal'
```

### 5. Accessibilité TSA (WCAG 2.2 AA)

**CRITIQUE** : Application pour enfants autistes

- ✅ **Animations douces** : Max 0.3s ease, jamais brusques
- ✅ **Couleurs pastel** : Palette apaisante, contraste minimum 4.5:1
- ✅ **Focus visible** : Toujours visible pour navigation clavier
- ✅ **Pas de clignotement** : Rien > 3Hz (risque épilepsie)
- ✅ **Cibles tactiles** : Minimum 44×44px

### 6. Gestion Quotas (RGPD/CNIL)

```typescript
import { useAccountStatus } from '@/hooks'

function CreateTaskButton() {
  const { canCreateTask, quotas } = useAccountStatus()

  if (!canCreateTask) {
    return <QuotaExceeded message="Limite Free : 5 tâches atteinte" />
  }

  return <button onClick={handleCreate}>Créer tâche</button>
}
```

## Style & Conventions

### SCSS

- **BEM-lite** : `.block__element--modifier`
- **Palette pastel** : Utiliser CSS custom properties
- **Animations** : Toujours douces (max 0.3s ease)
- **Chaque composant** : Son dossier avec `.tsx` + `.scss`

### TypeScript

- **Strict mode** : Temporairement relaxé pour migration Next.js
- **329 erreurs non-bloquantes** : Build fonctionne, tests passent
- **Types Supabase** : Générés automatiquement par `pnpm db:types`
- **Pas de `any`** : Sauf temporairement pour migration

### Imports

- **Alias `@/`** : Pointe vers `src/`
- **Toujours absolus** : `@/components/shared/Modal` pas `../../Modal`

## Workflows critiques

### AVANT tout commit (OBLIGATOIRE)

```bash
pnpm check   # lint:fix + format (OBLIGATOIRE)
pnpm test    # Tests unitaires (OBLIGATOIRE)
```

**Si échec** : Corriger erreurs avant commit

### APRÈS modification Supabase

```bash
pnpm context:update  # Dump schema + generate types (OBLIGATOIRE)
```

**Génère** :

- `supabase/schema.sql` : Schema PostgreSQL
- `src/types/supabase.ts` : Types TypeScript

### AVANT déploiement

```bash
pnpm build          # DOIT réussir
pnpm preview        # DOIT tester build production
pnpm test:coverage  # DOIT maintenir couverture
```

## Vérifications spécifiques Appli-Picto

**Toujours vérifier** :

- ✅ **Supabase RLS** : Policies activées sur toutes tables privées
- ✅ **Quotas** : Vérifier avec `useAccountStatus()` avant création
- ✅ **Auth** : Vérifier `authReady` avant accès `user`
- ✅ **Images** : Compression 100KB max (`compressImageIfNeeded`)
- ✅ **Hydration Next.js** : Éviter mismatches SSR/client
- ✅ **`'use client'`** : SEULEMENT si interactivité
- ✅ **Hooks custom** : TOUJOURS utiliser, JAMAIS query directe
- ✅ **Accessibilité TSA** : Animations douces, WCAG 2.2 AA

## Migrations importantes

### React Router → Next.js App Router (Nov 2024)

**CRITIQUE** : Projet migré vers Next.js 16 App Router

- ❌ **Plus de react-router-dom** : Utiliser `next/navigation`
- ✅ **Route groups** : `(public)/` et `(protected)/`
- ✅ **Metadata API** : SEO optimisé pour toutes pages
- ✅ **108 composants** : Correctement marqués `'use client'`

### Yarn → pnpm (Nov 2024)

**CRITIQUE** : Projet migré vers pnpm

- ❌ **Plus de yarn** : Utiliser `pnpm` uniquement
- ✅ **Performance** : Build -87% (2m30s → 20s)
- ✅ **Installation** : -81% (45s → 8.5s)

## JAMAIS faire

- ❌ Query Supabase directe (TOUJOURS utiliser hooks)
- ❌ Commit sans `pnpm check`
- ❌ Deploy sans tester `pnpm preview`
- ❌ Modifier DB sans `pnpm context:update`
- ❌ Upload images > 100KB (compression auto enforced)
- ❌ Créer fichiers .md sans demande explicite
- ❌ Utiliser `yarn` ou `npm`
- ❌ Importer `react-router-dom`

## TOUJOURS faire

- ✅ Répondre en français (projet francophone)
- ✅ Vérifier accessibilité TSA (WCAG 2.2 AA)
- ✅ Utiliser hooks custom Supabase
- ✅ Ajouter `'use client'` si interactivité
- ✅ Vérifier quotas avant création
- ✅ Tester avec `pnpm check` + `pnpm test`

````

## Template CLAUDE.md Dossier (Spécifique)

```markdown
### Structure du répertoire ([nom-dossier])

[Décrire structure et organisation]

## Patterns spécifiques [Technologie/Framework]

[Patterns spécifiques à ce dossier]

## Workflow développement

[Commandes et étapes de vérification spécifiques au dossier]

## Commandes

```bash
# Commandes build/test/lint spécifiques au dossier
````

## Important

**CRITIQUE** : [Patterns critiques avec exemples fichiers utilisant syntaxe @]

### Exemples

- `@/components/shared/Modal` : Pattern modal réutilisable
- `@/hooks/useTaches` : Hook CRUD tâches

````

## Techniques d'emphase et priorité (CRITIQUE pour efficacité CLAUDE.md)

### Techniques d'emphase haute-impact

- **CRITIQUE** : Utiliser pour exigences non-négociables qui cassent fonctionnalité si ignorées
- **TOUJOURS** : Pour actions obligatoires qui doivent se passer à chaque fois
- **JAMAIS** : Pour actions qui causeront problèmes ou casseront patterns
- **AVANT [action]** : Pour prérequis obligatoires
- **APRÈS [action]** : Pour étapes follow-up obligatoires

### Formatage pour impact maximum

- **Texte gras** : Pour commandes, chemins fichiers, concepts clés
- `Blocs code` : Pour commandes exactes et chemins fichiers
- **MOTS-CLÉS CAPS** : CRITIQUE, TOUJOURS, JAMAIS, DOIT, OBLIGATOIRE
- Bullet points avec emphase : **TOUJOURS exécuter `pnpm check` avant commit**

### Structure priorité (Plus au moins important)

1. **Commandes qui cassent builds/déploiements** - Marquer CRITIQUE
2. **Étapes workflow obligatoires** - Marquer TOUJOURS/DOIT
3. **Patterns fichiers et conventions** - Utiliser gras et exemples
4. **Guidelines utiles** - Bullet points standards

### Exemples d'emphase efficace

```markdown
- **CRITIQUE** : TOUJOURS utiliser hooks custom (@/hooks/useTaches)
- **JAMAIS** importer depuis dossiers packages internes directement
- **AVANT commit** : Exécuter `pnpm check` et `pnpm test`
- **OBLIGATOIRE** : Utiliser `pnpm` uniquement (JAMAIS yarn/npm)
````

## Stratégie collecte contenu

### Pour CLAUDE.md Global

- **Commandes** : Extraire depuis package.json scripts, Makefile, fichiers CI
- **Architecture** : Analyser structure dossiers, dépendances principales
- **Stack tech** : Lire package.json, patterns import, fichiers config
- **Déploiement** : Trouver configs déploiement (Vercel, Docker, etc.)
- **Environnement** : Scanner fichiers .env, patterns config

### Pour CLAUDE.md Dossier

- **Patterns** : Analyser fichiers existants dans dossier pour conventions
- **Imports** : Patterns import communs et usage librairies
- **Types fichiers** : Routes API, composants, patterns utilitaires
- **Conventions** : Nommage, structure, patterns spécifiques framework

## Stratégie mise à jour

Lors MAJ CLAUDE.md existant :

1. **PRÉSERVER** : Garder structure existante et contenu fonctionnel
2. **AMÉLIORER** : Ajouter nouveaux patterns trouvés dans requête MAJ
3. **ORGANISER** : Placer nouveau contenu dans sections appropriées
4. **VALIDER** : Assurer nouvelles additions ne conflictent pas avec guidance existante

## Règles d'exécution

- **JAMAIS SUPPOSER** : Toujours vérifier commandes et chemins fichiers existent
- **ÊTRE EXTRÊMEMENT SPÉCIFIQUE** : "Utiliser indentation 2 espaces" pas "Formater code proprement"
- **EMPHASER ITEMS CRITIQUES** : Utiliser CRITIQUE, TOUJOURS, JAMAIS pour règles importantes
- **TESTER COMMANDES** : Valider toutes commandes mentionnées dans CLAUDE.md
- **SUIVRE HIÉRARCHIE** : Règles critiques → Workflow obligatoire → Patterns → Guidelines
- **ULTRA RÉFLÉCHIR** : Qu'est-ce qui cassera si Claude ne suit pas ceci exactement ?
- **TOUJOURS EN FRANÇAIS** : Projet 100% francophone

## Checklist efficacité CLAUDE.md

Avant sauvegarder tout CLAUDE.md :

- ☐ **Commandes testées et fonctionnent**
- ☐ **Items critiques utilisent emphase propre** (CRITIQUE, TOUJOURS, JAMAIS)
- ☐ **Chemins fichiers utilisent syntaxe @** et existent
- ☐ **Spécifique sur générique** ("Utiliser `pnpm`" pas "Utiliser bon gestionnaire packages")
- ☐ **Structure hiérarchique** avec titres markdown clairs
- ☐ **Guidance actionnable** - chaque ligne dit à Claude quoi faire
- ☐ **En français** - tout le contenu en français
- ☐ **Spécificités Appli-Picto** - Accessibilité TSA, quotas, hooks custom

## Priorité

**Spécificité > Complétude**

Chaque instruction doit être immédiatement exécutable avec emphase appropriée, en français.
