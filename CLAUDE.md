# CLAUDE.md

Guide technique Claude Code pour **Appli-Picto** (Next.js 16, pnpm, Supabase).

## 🎯 À propos

**Application** : Dashboard motivationnel pour enfants TSA
**Contraintes** : ♿ Accessibilité TSA d'abord | 📱 Mobile-First | 🇫🇷 100% francophone | 🔒 DB-First (Supabase RLS) | 🛡️ RGPD/CNIL

---

## ⚙️ Commandes essentielles

### Développement
```bash
pnpm dev              # Serveur dev (port 3000, Turbopack)
pnpm build            # Build production
pnpm check            # lint:fix + format (OBLIGATOIRE avant commit)
pnpm test             # Tests unitaires (Vitest)
pnpm test:e2e         # Tests E2E (Playwright)
```

### Base de données (CRITIQUE après modif Supabase)
```bash
pnpm context:update   # db:dump + db:types (génère schema.sql + types)
pnpm db:types         # Générer types TypeScript depuis Supabase
pnpm supabase:start   # Démarrer Supabase local (Docker)
```

### Vérification (avant commit/deploy)
```bash
/verify-quick         # Vérification rapide (lint + build + test)
/verify-full          # Vérification exhaustive (+ E2E + coverage)
```

### Autres commandes utiles
```bash
pnpm lint:hardcoded            # Vérifier valeurs hardcodées SCSS
pnpm validate:touch-targets    # Vérifier cibles tactiles (44×44px min)
/supabase-migrate <desc>       # Migration Supabase + types
/debug <bug>                   # Analyse ultra-profonde bug
/deep-code-analysis <question> # Analyse code complexe avec recherche
```

---

## 🏗️ Stack technique

| Couche | Technologie | Version | Notes |
|--------|-------------|---------|-------|
| **Frontend** | React | 19 | Server/Client Components |
| **Framework** | Next.js | 16 | App Router, Turbopack, Route Groups |
| **Runtime** | Node.js | 20.19.4 | Géré par Volta |
| **Package Manager** | **pnpm** | 9.15.0 | ⚠️ JAMAIS yarn/npm |
| **Styling** | SCSS | - | BEM-lite, design system tokens |
| **TypeScript** | Strict | 5.x | noImplicitAny: false (temporaire) |
| **Backend** | Supabase | - | PostgreSQL, Auth, RLS, Storage |
| **Payment** | Stripe | - | Checkout, webhooks via Edge Functions |
| **Testing** | Vitest + Playwright | - | Unit + E2E |

---

## 📁 Structure projet (compacte)

```
appli-picto/
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (public)/         # Routes publiques (/tableau, /login, /signup)
│   │   └── (protected)/      # Routes protégées (/edition, /profil, /admin)
│   ├── components/            # Composants UI (.tsx + .scss par composant)
│   │   ├── shared/           # Réutilisables (Modal, Card, DnD)
│   │   ├── features/         # Features (taches, timeline, sequences)
│   │   └── layout/           # Navbar, Footer, BottomNav
│   ├── hooks/                 # ⚠️ CRITIQUE : Hooks custom Supabase (DB-first)
│   ├── contexts/              # State global (Auth, Toast, Loading)
│   ├── utils/                 # Utilitaires (supabaseClient, compressImage)
│   ├── styles/                # SCSS (design system tokens-first)
│   └── types/
│       └── supabase.ts       # Types générés (pnpm db:types)
├── supabase/
│   ├── migrations/            # Migrations SQL (55+)
│   ├── functions/             # Edge Functions (Stripe checkout/webhook)
│   └── schema.sql             # Schema PostgreSQL (généré)
└── .claude/
    ├── skills/                # 4 skills (règles métier critiques)
    ├── agents/                # 5 agents (tâches complexes)
    ├── commands/              # 8 slash commands
    └── rules/                 # 4 règles contextuelles (components, app-router, etc.)
```

---

## 🚨 Règles d'architecture critiques

### 1. 🔒 DB-First Architecture (OBLIGATOIRE)
**TOUJOURS utiliser hooks custom, JAMAIS query Supabase directe.**

**→ Voir skill `db-first-frontend` pour règles détaillées**

### 2. 📱 Next.js App Router (OBLIGATOIRE)
- ✅ `useRouter()` from `'next/navigation'`
- ❌ Plus de `react-router-dom` (supprimé)
- ✅ Route Groups : `(public)/` et `(protected)/`
- ✅ Server Components par défaut, `'use client'` SEULEMENT si interactivité

### 3. 📂 Imports absolus (OBLIGATOIRE)
**TOUJOURS utiliser alias `@/` (pointe vers `src/`)**

```typescript
// ✅ CORRECT
import { useBankCards } from '@/hooks'
import Modal from '@/components/shared/modal/Modal'
```

### 4. ♿ Accessibilité TSA (WCAG 2.2 AA)
- Animations douces (max 0.3s ease), respect `prefers-reduced-motion`
- Cibles tactiles min 44×44px
- Couleurs pastel (contraste ≥ 4.5:1)
- Focus toujours visible

**→ Voir skill `tsa-ux-rules` pour règles détaillées**

### 5. 🎨 SCSS Design System (tokens-first)
**JAMAIS de valeurs hardcodées (px, rem, #hex, rgb) — TOUJOURS utiliser tokens design system.**

**→ Voir skill `sass-tokens-discipline` pour règles détaillées**

### 6. 🧩 3 Systèmes conceptuels (ne pas fusionner)
1. **Planning** (Timelines/Slots) : `useTimelines()`, `useSlots()`
2. **Exécution** (Sessions) : `useSessions()`, `useSessionValidations()`
3. **Séquençage** (Sequences) : `useSequences()`, `useSequenceSteps()`

**→ Voir skill `three-systems-separation` pour règles détaillées**

---

## 🔄 Workflows critiques

### AVANT tout commit (OBLIGATOIRE)
```bash
pnpm check   # lint:fix + format
pnpm test    # Tests unitaires
# OU utiliser :
/verify-quick
```

### APRÈS modification Supabase (OBLIGATOIRE)
```bash
pnpm context:update  # Dump schema + generate types
```
**Déclenche** : Migrations, RLS policies, fonctions PostgreSQL, enums, Edge Functions

### AVANT déploiement (OBLIGATOIRE)
```bash
pnpm build          # DOIT réussir
pnpm preview        # DOIT tester build production
# OU utiliser :
/verify-full
```

---

## 🤖 Skills & Agents

### 🛡️ Skills (règles métier, activés automatiquement)
| Skill | Trigger | Usage |
|-------|---------|-------|
| **db-first-frontend** | Mention Supabase, RLS, hooks, queries | Enforce DB-first (hooks uniquement) |
| **sass-tokens-discipline** | Édition SCSS/CSS, styling | Enforce tokens design system (pas hardcode) |
| **three-systems-separation** | Timelines, slots, sessions, sequences | Prevent fusion 3 systèmes |
| **tsa-ux-rules** | UI components, Tableau, animations | Enforce UX TSA (calme, prévisible) |

### 🔧 Agents (tâches complexes, lancés via @mention ou Task)
| Agent | Quand utiliser | Modèle |
|-------|----------------|--------|
| **explore-codebase** | "Où est géré X ?", "Comment fonctionne Y ?" | Haiku |
| **explore-docs** | "Comment utiliser librairie Z ?" | Haiku |
| **scss-refactor** | Refactor SCSS vers tokens (`@scss-refactor <file>`) | Sonnet |
| **websearch** | Recherche web info récente | Haiku |
| **action** | Exécution conditionnelle | Haiku |

---

## ❌ JAMAIS faire

- ❌ Query Supabase directe (TOUJOURS utiliser hooks)
- ❌ Commit sans `pnpm check && pnpm test`
- ❌ Deploy sans `pnpm build && pnpm preview`
- ❌ Modifier DB sans `pnpm context:update`
- ❌ Valeurs hardcodées SCSS (utiliser tokens)
- ❌ Animations > 0.3s ou agressives
- ❌ Cibles tactiles < 44×44px
- ❌ Imports relatifs (utiliser `@/`)
- ❌ `'use client'` par défaut (Server Components prioritaires)
- ❌ Utiliser `yarn` ou `npm` (TOUJOURS pnpm)
- ❌ Importer `react-router-dom` (Next.js App Router uniquement)

---

## ✅ TOUJOURS faire

- ✅ Répondre en français (projet 100% francophone)
- ✅ Vérifier accessibilité TSA (WCAG 2.2 AA)
- ✅ Utiliser hooks custom Supabase (DB-first)
- ✅ Ajouter `'use client'` SEULEMENT si interactivité
- ✅ Tester avec `pnpm check && pnpm test`
- ✅ Utiliser tokens design system (pas hardcode)
- ✅ Imports absolus (`@/`)
- ✅ Animations douces (max 0.3s ease)
- ✅ Respect `prefers-reduced-motion`
- ✅ Cibles tactiles ≥ 44×44px
- ✅ Focus visible
- ✅ Contraste ≥ 4.5:1
- ✅ `pnpm context:update` après modif Supabase
- ✅ Penser Mobile-First (tablette/smartphone d'abord)

---

## 🎯 Slash Commands disponibles (8)

**Vérification** : `/verify-quick`, `/verify-full`
**Base de données** : `/supabase-migrate <desc>`
**Debug** : `/debug <bug>`, `/deep-code-analysis <question> <zone>`
**Méta** : `/claude-memory <action> <path>`, `/prompt-agent <action> <n>`, `/prompt-command <action> <name>`

Taper `/` dans Claude Code pour la liste complète avec descriptions.

---

## 🔗 Références rapides

- **Skills** : `.claude/skills/` (4 skills auto-déclenchés)
- **Agents** : `.claude/agents/` (5 agents spécialisés)
- **Rules** : `.claude/rules/` (4 règles contextuelles)
- **Commands** : `.claude/commands/` (8 slash commands)
- **Hooks Supabase** : `src/hooks/CLAUDE.md` (liste complète)
- **Design tokens** : `src/styles/CLAUDE.md` (tokens design system)
- **Types générés** : `src/types/supabase.ts` (auto-généré, ne pas modifier)

---

**Version** : 2.1.0 (Post-optimisation écosystème Claude Code)
**Dernière mise à jour** : 2026-03-27
