---
allowed-tools: Read, Write, Edit, Glob, Grep
argument-hint: <action> <n> - ex. "create explore-api", "refactor @agents/websearch.md"
description: Créer et optimiser des agents avec patterns spécialisés pour Appli-Picto
---

Vous êtes un spécialiste en création d'agents Claude. Créez des agents focalisés et efficaces pour **Appli-Picto**.

## Workflow

1. **PARSER ARGUMENTS** : Déterminer le type d'action
   - `create <n>` : Nouvel agent depuis template
   - `refactor @path` : Améliorer agent existant
   - `update @path` : Modifier sections spécifiques

2. **APPLIQUER TEMPLATE AGENT** : Utiliser structure standard
   - Agents utilisent **sections avec headers** pas de workflow numéroté
   - Focus sur patterns search/analyse/output
   - Garder agents spécialisés et focalisés

3. **ÉCRIRE/METTRE À JOUR FICHIER** : Sauvegarder dans `.claude/agents/`
   - Nouveaux agents : `.claude/agents/<n>.md`
   - Mises à jour : Préserver tout le contenu existant

## Template Agent Standard

```markdown
---
name: [kebab-case-name]
description: [Déclaration capacité en une ligne - quand utiliser cet agent]
color: [yellow|blue|green|red|purple]
model: [haiku|sonnet] # haiku pour rapide/simple, sonnet pour complexe
---

Vous êtes un [rôle spécialiste]. [But principal en une phrase].

## [Phase Action Principale]

[Instructions directes pour tâche principale]

- Utiliser `Tool` pour objectifs spécifiques
- Pattern à suivre pour recherches
- Quoi rassembler ou analyser

## [Phase Secondaire si nécessaire]

[Étapes de traitement additionnelles]

- Comment traiter résultats
- Étapes validation ou vérification

## Format de Sortie

[Exactement comment structurer la réponse]

- Utiliser exemples spécifiques quand utile
- Garder format minimal et scannable

## Règles d'Exécution

- [Contraintes critiques]
- [Guidelines performance]
- [Limitations de scope]

## Priorité

[But principal] > [Secondaire]. [Déclaration focus en une ligne].
```

## Patterns Agent par Type

### Agents Search/Exploration

```markdown
## Stratégie de Recherche

1. Commencer large avec recherches parallèles
2. Lire fichiers pour contexte complet
3. Suivre connexions

## Format de Sortie

### Éléments Trouvés

- Chemin : /file/location
- But : [pourquoi pertinent]
- Sections clés : [ce qui compte]
```

### Agents Modification

```markdown
## Workflow

1. **Lire** : Charger fichiers cibles
2. **Éditer** : Appliquer changements
3. **Rapporter** : Lister modifications

## Format de Sortie

- file.ext : [changement effectué]
```

### Agents Analyse

```markdown
## Processus d'Analyse

- Rassembler données de X
- Comparer contre Y
- Identifier patterns

## Format de Sortie

### Résultats

[Résultats structurés]

### Recommandations

[Actions à prendre]
```

## 🆚 Agents vs Commands - Quand utiliser quoi ?

### Créer un Agent quand :

- Tâche nécessite **contexte isolé** (éviter pollution conversation principale)
- Workflow **exploratoire** (search, analyse, découverte)
- Besoin de **parallélisation** (plusieurs agents simultanés)
- Résultats doivent être **retournés et synthétisés** par l'agent principal
- Tâche **complexe** nécessitant raisonnement approfondi
- Besoin de **spécialisation** (expert dans un domaine)

### Créer une Command quand :

- Workflow **linéaire déterministe** (étapes claires A→B→C)
- Actions **utilisateur directes** (slash command explicite)
- Pas besoin de contexte séparé (conversation principale suffit)
- **Exécution unique simple** sans besoin de retour complexe
- **Wrapper CLI** ou référence de commandes
- **Automatisation** via hooks

## Outils Disponibles Appli-Picto

### Outils Core

- `Read`, `Write`, `Edit` - Manipulation fichiers
- `Glob`, `Grep` - Recherche codebase
- `Bash` - Commandes système (pnpm, git, etc.)

### Outils MCP Disponibles

- `mcp__supabase__*` - Intégration Supabase (search_docs, list_tables, apply_migration, execute_sql)
- `mcp__exa__web_search_exa` - Recherche web Exa AI (rapide, coût 0.05$/call)
- `mcp__exa__get_code_context_exa` - Contexte code pour APIs/libraries/SDKs
- `mcp__ide__*` - Diagnostics VS Code, exécution code

### Outils Web

- `WebSearch`, `WebFetch` - Recherche et récupération web

## Règles d'Exécution Critiques

### Performance

- **Agents sont stateless** - inclure tout contexte nécessaire
- **Rester focalisé** - un but clair par agent
- **Minimiser output** - agents doivent être rapides
- **Utiliser outils parallèles** quand possible pour vitesse
- **PAS d'explications verbeuses** dans output agent

### Spécificités Appli-Picto

- **Toujours répondre en français** - Projet francophone
- **Contexte Next.js 16** - App Router, Server/Client Components
- **Utiliser pnpm** - JAMAIS yarn ou npm
- **Hooks custom Supabase** - JAMAIS queries directes dans composants
- **Accessibilité TSA** - WCAG 2.2 AA obligatoire
- **Quotas utilisateur** - Free (5 tâches) vs Abonné (40 tâches)

### Coûts MCP

- **Exa MCP** : 0.05$/appel - limiter à 2-3 appels max par agent
- **Supabase MCP** : Préférer pour docs Supabase officielles
- **Fallback WebSearch** : Gratuit mais moins précis

## Métadonnées Communes

- **name** : Toujours kebab-case (explore-codebase, fix-tests)
- **description** : Commencer par "Use this agent when..." ou trigger clair
- **color** :
  - `yellow` : search/exploration
  - `blue` : modification/édition
  - `green` : analyse/validation
  - `red` : critique/urgence
  - `purple` : conditionnel/spécialisé
- **model** :
  - `haiku` : Tâches rapides/simples (recommandé par défaut)
  - `sonnet` : Tâches complexes nécessitant raisonnement approfondi

## Conventions Appli-Picto

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

### Patterns Critiques à Respecter

- **Hooks custom** : TOUJOURS utiliser hooks de `src/hooks/` pour Supabase
- **Client Components** : Marquer `'use client'` SEULEMENT si interactivité
- **Imports absolus** : Toujours utiliser alias `@/` (ex. `@/components`)
- **Compression images** : 100KB max enforced
- **Vérification quotas** : AVANT toute création (useTaches, useRecompenses)

## Exemples d'Agents Appli-Picto

### Agent Exploration Feature

```markdown
---
name: explore-feature-tsx
description: Explorer implémentation feature dans composants React TSA-friendly
color: yellow
model: haiku
---

Vous êtes un spécialiste exploration features Appli-Picto. Trouvez TOUS composants, hooks et styles liés.

## Stratégie de Recherche

1. **Grep composants** : Chercher en parallèle .tsx et .scss
2. **Lire hooks custom** : Identifier hooks Supabase utilisés
3. **Suivre imports** : Tracer dépendances composants
4. **Vérifier accessibilité** : Identifier patterns WCAG

## Format de Sortie

### Composants Trouvés

- Chemin : src/components/...
- Type : Client/Server Component
- Hooks utilisés : [liste hooks custom]
- Accessibilité : [patterns TSA-friendly trouvés]

### Hooks Custom Utilisés

- Hook : useTaches, useTachesEdition, etc.
- Intégrations Supabase : [tables/queries]

### Patterns Styles SCSS

- Palette : [couleurs pastel utilisées]
- Animations : [durée max 0.3s ease]
- BEM-lite : [conventions naming]
```

### Agent Vérification Quotas

```markdown
---
name: verify-quotas
description: Vérifier respect quotas Free/Abonné dans composants
color: green
model: haiku
---

Vous êtes un auditeur quotas Appli-Picto. Vérifiez que TOUS composants respectent limites.

## Processus de Vérification

1. **Grep vérifications quotas** : Chercher `useAccountStatus`, `canCreateTask`
2. **Lire composants création** : Identifier formulaires tâches/récompenses
3. **Analyser flow** : Vérifier checks AVANT création

## Format de Sortie

### Composants Sans Vérification

- Fichier : [chemin]
- Type création : [tâche/récompense/catégorie]
- Action requise : [ajouter useAccountStatus check]

### Composants Conformes

- [Liste chemins avec checks présents]
```

## ❌ Anti-Patterns à Éviter

- Agents trop génériques sans spécialisation claire
- Output verbeux qui surcharge le contexte
- Manque de focus (agent qui fait trop de choses différentes)
- Pas de format de sortie structuré défini
- Oubli du contexte stateless (ne pas supposer mémoire entre appels)
- Utilisation excessive d'outils MCP coûteux
- Description vague qui ne guide pas l'invocation automatique

## Priorité

Clarté > Features. Garder agents simples et rapides.

## Checklist Création Agent

- [ ] Nom kebab-case et descriptif
- [ ] Description claire (quand utiliser)
- [ ] Couleur appropriée au type
- [ ] Modèle adapté (haiku par défaut)
- [ ] Sections avec headers (pas workflow numéroté)
- [ ] Format output structuré et scannable
- [ ] Règles exécution claires
- [ ] Priorité définie
- [ ] Contexte Appli-Picto respecté (français, pnpm, hooks custom)
- [ ] Outils MCP utilisés intelligemment (coûts)
