# CLAUDE.md

Guide technique Claude Code pour **Appli-Picto** (Next.js 16, pnpm, Supabase).

**Application** : Dashboard motivationnel pour enfants TSA
**Contraintes** : ♿ TSA d'abord | 📱 Mobile-First | 🇫🇷 100% francophone | 🔒 DB-First | 🛡️ RGPD/CNIL

---

## ⚙️ Commandes essentielles

```bash
pnpm dev              # Serveur dev (port 3000, Turbopack)
pnpm build            # Build production
pnpm check            # lint:fix + format (OBLIGATOIRE avant commit)
pnpm test             # Tests unitaires (Vitest)
pnpm test:e2e         # Tests E2E (Playwright)
pnpm context:update   # db:dump + db:types (CRITIQUE après modif Supabase)
pnpm supabase:start   # Démarrer Supabase local (Docker)
pnpm lint:hardcoded   # Vérifier valeurs hardcodées SCSS
```

---

## 🏗️ Stack technique

| Couche              | Technologie         | Version | Notes                             |
| ------------------- | ------------------- | ------- | --------------------------------- |
| **Frontend**        | React               | 19      | Server/Client Components          |
| **Framework**       | Next.js             | 16      | App Router, Turbopack             |
| **Runtime**         | Node.js             | 20.19.4 | Géré par Volta                    |
| **Package Manager** | **pnpm**            | 9.15.0  | JAMAIS yarn/npm                   |
| **Styling**         | SCSS                | -       | BEM-lite, tokens-first            |
| **TypeScript**      | Strict              | 5.x     | noImplicitAny: false (temporaire) |
| **Backend**         | Supabase            | -       | PostgreSQL, Auth, RLS, Storage    |
| **Payment**         | Stripe              | -       | Edge Functions                    |
| **Testing**         | Vitest + Playwright | -       | Unit + E2E                        |

---

## 📁 Structure projet

```
src/
├── app/              # Next.js App Router
│   ├── (public)/     # /tableau, /login, /signup
│   └── (protected)/  # /edition, /profil, /admin
├── components/       # Composants UI (.tsx + .scss)
├── hooks/            # Hooks custom Supabase — voir src/hooks/CLAUDE.md
├── contexts/         # Auth, Toast, Loading
├── styles/           # SCSS tokens — voir src/styles/CLAUDE.md
└── types/supabase.ts # Auto-généré (pnpm db:types) — NE PAS modifier

supabase/
├── migrations/       # SQL (55+)
├── functions/        # Edge Functions Stripe
└── schema.sql        # Auto-généré (pnpm db:dump) — NE PAS modifier
```

---

## 🚨 Règles d'architecture critiques

### 1. 🔒 DB-First (OBLIGATOIRE)

Toujours utiliser hooks custom depuis `@/hooks` — jamais `supabase.from()` directement.
→ Skill `db-first-frontend` | Inventaire hooks : `src/hooks/CLAUDE.md`

### 2. 📱 Next.js App Router

- `useRouter()` from `'next/navigation'` — jamais `next/router` ni `react-router-dom`
- Server Components par défaut, `'use client'` SEULEMENT si interactivité
→ Rule `app-router.md` (active sur `src/app/**/*`)

### 3. 📂 Imports absolus

Toujours `@/` (alias vers `src/`). Jamais de chemins relatifs (`../../`).

### 4. ♿ Accessibilité TSA (WCAG 2.2 AA)

Animations ≤ 0.3s, cibles tactiles ≥ 44×44px, contraste ≥ 4.5:1, focus visible.
→ Skill `tsa-ux-rules`

### 5. 🎨 SCSS tokens-first

Jamais de valeurs hardcodées — toujours les fonctions tokens du design system.
→ Skill `sass-tokens-discipline` | Référence tokens : `src/styles/CLAUDE.md`

### 6. 🧩 Séparation des 3 systèmes

Planning (timelines/slots) ≠ Exécution (sessions) ≠ Séquençage (sequences).
→ Skill `three-systems-separation`

---

## 🔄 Workflows critiques

### Avant tout commit (OBLIGATOIRE)

```bash
pnpm check && pnpm test   # ou /verify-quick
```

### Après modification Supabase (OBLIGATOIRE)

```bash
pnpm context:update   # Migrations, RLS policies, fonctions, enums
```

### Avant déploiement (OBLIGATOIRE)

```bash
pnpm build && pnpm preview   # ou /verify-full
```

---

**Mise à jour** : 2026-04-02
