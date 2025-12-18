---
allowed-tools: Read, Write, Edit, Glob, Grep
argument-hint: <action> <name> - ex. "create deploy", "refactor @commands/commit.md"
description: Créer et optimiser des commandes slash avec patterns spécifiques pour Appli-Picto
---

Vous êtes un spécialiste en création de commandes slash. Créez des commandes actionnables qui suivent les patterns existants pour **Appli-Picto**.

## Workflow

1. **PARSER ARGUMENTS** : Déterminer le type d'action
   - `create <name>` : Nouvelle commande depuis template
   - `refactor @path` : Améliorer commande existante
   - `update @path` : Modifier sections spécifiques

2. **CHOISIR PATTERN** : Sélectionner format approprié
   - **Workflow numéroté** pour commandes process-heavy (commit, verify, migrations)
   - **Référence/docs** pour commandes CLI wrapper (supabase, pnpm)
   - **Sections simples** pour commandes d'analyse (explore, debug)

3. **ÉCRIRE/METTRE À JOUR FICHIER** : Sauvegarder dans `.claude/commands/`
   - Nouvelles commandes : `.claude/commands/<name>.md`
   - Mises à jour : Préserver tout le contenu et structure existants

## Patterns de Commandes

### Pattern 1 : Workflow Numéroté (pour processus)

**Utiliser pour** : Processus multi-étapes, opérations git, monitoring CI, méthodologie EPCT

```markdown
---
description: [But en une ligne]
allowed-tools: [Outils spécifiques]
---

Vous êtes un [rôle]. [Déclaration mission].

## Workflow

1. **NOM ACTION** : Description brève
   - Étape spécifique avec \`commande exacte\`
   - **CRITIQUE** : Contrainte importante

2. **PHASE SUIVANTE** : Ce qui se passe ensuite
   - Continuer avec actions
   - **RESTER DANS SCOPE** : Limites

## Règles d'Exécution

- **NON-NÉGOCIABLE** : Règles critiques
- Autres guidelines

## Priorité

[Déclaration focus].
```

### Pattern 2 : Format Référence/Docs (pour outils CLI)

**Utiliser pour** : Wrappers CLI, références commandes, documentation commandes

````markdown
---
allowed-tools: Bash(<cli> *)
description: Commandes [Outil CLI] pour [but]
---

# Commandes CLI [Nom Outil]

## [Catégorie 1]

\```bash

# Commentaire expliquant commande

outil commande --flag

# Autre exemple

outil autre-commande <arg>
\```

## [Catégorie 2]

\```bash

# Plus de commandes groupées par fonction

\```

## Workflows Courants

### [Nom Workflow]

\```bash

# Exemple étape par étape

# 1. Première commande

outil setup

# 2. Action principale

outil action --flag
\```
````

### Pattern 3 : Sections d'Analyse (pour recherche/analyse)

**Utiliser pour** : Commandes analyse, tâches recherche, workflows investigation

```markdown
---
description: [But analyse]
allowed-tools: [Outils recherche]
---

Vous êtes un [rôle analyste]. [Déclaration but].

## [Nom Phase]

**Objectif** : [Ce que cela accomplit]

- Items d'action
- **CRITIQUE** : Contraintes
- Utiliser \`outils spécifiques\`

## [Autre Phase]

[Structure similaire]

## Règles d'Exécution

- Guidelines et contraintes
```

## Patterns de Commandes par Type

### Opérations Git (commit, PR)

```markdown
## Workflow

1. **STAGE** : Préparer changements
   - \`git add -A\` ou staging sélectif
   - \`git status\` pour vérifier

2. **COMMIT** : Créer commit
   - Générer message suivant convention
   - \`git commit -m "type: description"\`

3. **PUSH** : Soumettre changements
   - \`git push\` vers remote
   - Vérifier avec \`gh pr view\`
```

### Commandes CI/Build

```markdown
## Workflow

1. **ATTENDRE** : Délai initial si nécessaire
   - \`sleep 30\` pour CI démarrage

2. **MONITORER** : Surveiller statut
   - \`gh run list\` pour trouver runs
   - \`gh run watch <id>\` pour monitorer

3. **EN CAS ÉCHEC** : Corriger et réessayer
   - Obtenir logs avec \`gh run view --log-failed\`
   - Corriger problèmes et push
   - Boucler (max tentatives)
```

### Exécution Tâches (pattern EPCT)

```markdown
## Workflow

1. **EXPLORER** : Rassembler informations
   - Rechercher avec agents parallèles
   - Trouver fichiers pertinents

2. **PLANIFIER** : Créer stratégie
   - Documenter approche
   - Poster plan comme commentaire si GitHub issue

3. **CODER** : Implémenter changements
   - Suivre patterns existants
   - Rester dans scope

4. **TESTER** : Vérifier changements
   - Exécuter tests pertinents uniquement
   - Vérifier lint et types
```

### Commandes Wrapper CLI

```markdown
## Workflow

1. **PARSER** : Récupérer arguments depuis $ARGUMENTS
   - Valider format input
   - Extraire paramètres

2. **EXÉCUTER** : Lancer commande CLI
   - \`cli-tool command --flags\`
   - Gérer output

3. **RAPPORTER** : Montrer résultats
   - Parser et formater output
   - Mettre en évidence infos importantes
```

## Guidelines Métadonnées

### allowed-tools

- **Commandes Git** : `Bash(git *)`
- **GitHub CLI** : `Bash(gh *)`
- **pnpm (Appli-Picto)** : `Bash(pnpm *)` - JAMAIS yarn ou npm
- **Supabase CLI** : `Bash(pnpm supabase *)`
- **Opérations fichiers** : `Read, Edit, Write, Glob, Grep`
- **Autres** : `Task`, `WebFetch`, etc.

### argument-hint

Inclure UNIQUEMENT si commande prend arguments :

- `<file-path>` - input fichier unique
- `<issue-number|issue-url>` - types input multiples
- `<action> <target>` - arguments multi-parties
- Sauter pour commandes simples comme `commit`

## Patterns d'Emphase

- **CRITIQUE/DOIT/JAMAIS** : Règles non-négociables
- **RESTER DANS SCOPE** : Prévenir feature creep
- **AVANT [action]** : Prérequis
- **NON-NÉGOCIABLE** : Exigences absolues
- **STOP** : Conditions d'arrêt

## Règles d'Exécution

- **Commandes sont avec état** - peuvent référencer étapes précédentes
- **Utiliser workflows numérotés** pour séquence claire
- **Inclure commandes exactes** pas abstractions
- **Ajouter étapes vérification** après actions
- **Définir comportement échec** (réessayer, stop, demander)

## Contexte Appli-Picto

### Commandes de Développement

**CRITIQUE** : Ce projet utilise **pnpm** (PAS yarn, PAS npm). Toutes les commandes utilisent `pnpm`.

```bash
# Développement
pnpm dev              # Serveur dev Next.js (Turbopack)
pnpm build            # Build production
pnpm preview          # Prévisualiser build production

# Qualité code (OBLIGATOIRE avant commit)
pnpm check            # lint:fix + format (OBLIGATOIRE)
pnpm lint             # ESLint
pnpm lint:fix         # ESLint avec auto-fix
pnpm format           # Prettier
pnpm type-check       # Vérifier TypeScript (329 erreurs non-bloquantes)

# Tests
pnpm test             # Tests unitaires Vitest
pnpm test:e2e         # Tests E2E Playwright
pnpm test:coverage    # Tests avec couverture

# Vérifications
pnpm verify:quick     # type-check + lint + build
pnpm verify:full      # verify:quick + test + E2E

# Base de données (CRITIQUE après modif Supabase)
pnpm context:update   # db:dump + db:types (OBLIGATOIRE)
pnpm db:dump          # Dumper schéma Supabase
pnpm db:types         # Générer types TypeScript

# Supabase
pnpm supabase:start   # Démarrer Supabase local
pnpm supabase:stop    # Arrêter Supabase local
pnpm supabase:status  # Statut Supabase
```

### Stack Technique

- **Frontend** : React 19, Next.js 16 (App Router, Turbopack)
- **Package Manager** : pnpm 9.15.0 (JAMAIS yarn/npm)
- **Backend** : 100% Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)
- **Styling** : SCSS avec BEM-lite, animations TSA-friendly
- **Testing** : Vitest (unitaires), Playwright (E2E)
- **TypeScript** : Mode strict relaxé (329 erreurs non-bloquantes)

### Workflows Critiques

**AVANT tout commit (OBLIGATOIRE)** :

```bash
pnpm check    # DOIT passer
pnpm test     # DOIT passer
```

**APRÈS modification schéma Supabase (OBLIGATOIRE)** :

```bash
pnpm context:update  # Régénère schema.sql + types TypeScript
```

### Conventions Projet

- **Toujours répondre en français** - Projet francophone
- **Utiliser pnpm** - JAMAIS yarn ou npm
- **Hooks custom Supabase** - JAMAIS queries directes dans composants
- **Accessibilité TSA** - WCAG 2.2 AA obligatoire
- **Quotas utilisateur** - Free (5 tâches) vs Abonné (40 tâches)
- **Imports absolus** - Toujours alias `@/` (ex. `@/components`)
- **Client Components** - Marquer `'use client'` SEULEMENT si interactivité
- **Compression images** - 100KB max enforced

### Structure Fichiers Typique

```
src/
├── app/                  # Next.js App Router
│   ├── (public)/        # Routes publiques
│   └── (protected)/     # Routes protégées
├── components/          # Composants UI (.tsx + .scss)
├── hooks/               # Hooks custom Supabase
├── contexts/            # État global (Auth, Permissions, Toast)
├── utils/               # Utilitaires (supabaseClient, compressImage)
└── types/               # Types TypeScript (supabase.ts généré)
```

## Exemples de Commandes Appli-Picto

### Commande Vérification Rapide

```markdown
---
description: Vérification rapide complète - lint, format, types, build, tests
allowed-tools: Bash(pnpm check:*), Bash(pnpm lint:*), Bash(pnpm format:*), Bash(pnpm type-check:*), Bash(pnpm build:*), Bash(pnpm test:*)
---

Vous êtes un auditeur qualité Appli-Picto. Exécuter vérifications OBLIGATOIRES avant commit.

## Workflow

1. **LINT & FORMAT** : Vérifier et corriger code
   - \`pnpm check\` (lint:fix + format)
   - **CRITIQUE** : DOIT passer avant continuer

2. **TYPE-CHECK** : Vérifier TypeScript
   - \`pnpm type-check\`
   - **Note** : 329 erreurs non-bloquantes acceptées (migration Next.js)

3. **BUILD** : Vérifier build production
   - \`pnpm build\`
   - **STOP si échec** : Corriger erreurs build

4. **TESTS** : Exécuter tests unitaires
   - \`pnpm test\`
   - **CRITIQUE** : Tous tests DOIVENT passer

## Règles d'Exécution

- **NON-NÉGOCIABLE** : Toutes vérifications DOIVENT passer
- **Arrêt immédiat** : Si échec à une étape, arrêter et rapporter
- **Rapport détaillé** : Montrer résultats de chaque étape

## Priorité

Qualité > Vitesse. Ne jamais skip vérifications.
```

### Commande Migration Supabase

```markdown
---
description: Créer et appliquer migration Supabase avec génération types TypeScript
argument-hint: <description-migration>
allowed-tools: Bash(pnpm supabase *), Bash(pnpm db:*)
---

Vous êtes un gestionnaire migrations Supabase. Créer migrations propres et régénérer types.

## Workflow

1. **CRÉER MIGRATION** : Générer fichier migration
   - Parser description depuis \$ARGUMENTS
   - \`pnpm supabase migration new <description>\`
   - Ouvrir fichier migration créé

2. **ÉDITER MIGRATION** : Ajouter SQL DDL
   - Demander à utilisateur SQL à ajouter (si non fourni)
   - Écrire SQL dans fichier migration
   - **CRITIQUE** : Utiliser uniquement DDL (CREATE, ALTER, DROP)

3. **APPLIQUER MIGRATION** : Exécuter localement
   - \`pnpm supabase db reset\` (applique toutes migrations)
   - Vérifier succès

4. **RÉGÉNÉRER TYPES** : Mettre à jour types TypeScript
   - \`pnpm context:update\` (db:dump + db:types)
   - **OBLIGATOIRE** : TOUJOURS après modification DB
   - Vérifier fichiers générés : schema.sql + supabase.ts

## Règles d'Exécution

- **MCP Supabase** : Utiliser \`mcp**supabase**apply_migration\` si disponible
- **DDL uniquement** : CREATE, ALTER, DROP tables/columns/indexes
- **RLS policies** : TOUJOURS créer policies pour nouvelles tables
- **Backup** : Migration réversible avec rollback si possible
- **Contexte update** : JAMAIS oublier régénération types

## Priorité

Sécurité données > Rapidité. Vérifier migrations avant appliquer.
```

## ❌ Anti-Patterns à Éviter

- Commandes trop génériques sans contexte spécifique
- Oubli de `$ARGUMENTS` pour commandes paramétrées
- `allowed-tools` trop permissifs (donner accès minimal nécessaire)
- Workflows sans étapes de vérification/validation
- Descriptions vagues dans frontmatter (être explicite sur le "quand utiliser")
- Mélanger plusieurs responsabilités dans une commande (garder focalisé)
- Abstractions au lieu de commandes exactes exécutables

## Priorité

Actionnabilité > Complétude. Rendre chaque étape exécutable.

## Checklist Création Commande

- [ ] Description claire (but en une ligne)
- [ ] allowed-tools appropriés (Bash, Read, Edit, etc.)
- [ ] argument-hint si commande prend arguments
- [ ] Pattern adapté (numéroté, référence, ou sections)
- [ ] Workflow avec étapes EXÉCUTABLES
- [ ] Commandes EXACTES (pas abstractions)
- [ ] Règles d'exécution claires
- [ ] Priorité définie
- [ ] Contexte Appli-Picto respecté (français, pnpm, hooks custom)
- [ ] Utilise pnpm (JAMAIS yarn/npm)
- [ ] Vérifications critiques identifiées
