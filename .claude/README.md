# Configuration Claude Code - Appli-Picto

Configuration personnalisée et optimisée pour le projet Appli-Picto (Next.js 16, pnpm, TypeScript, Supabase).

## 📁 Structure

```
.claude/
├── README.md
├── settings.json                # Configuration projet (versionné Git)
├── playwright-config.json
├── settings.local.json
├── commands/
│   ├── deep-code-analysis.md
│   ├── claude-memory.md
│   ├── debug.md                # Debug profond (Sonnet)
│   ├── supabase-migrate.md     # Migration Supabase + types
│   ├── prompt-command.md
│   ├── prompt-agent.md
│   ├── verify-quick.md         # Vérification rapide complète
│   └── verify-full.md          # Vérification exhaustive (E2E + coverage)
├── agents/
│   ├── action.md               # Exécuteur conditionnel
│   ├── explore-codebase.md     # Exploration code
│   ├── explore-docs.md         # Exploration docs libraries
│   └── websearch.md            # Recherche web
│   └── database-reviewer.md
│   └── scss-refactor.md
│   └── security-reviewer.md
│   └── typescript-reviewer.md
├── output-styles/
│   ├── appli-picto-guide.md    # Pédagogique TSA-friendly
└── agent-memory/
    └──explore-codebase/
       ├── admin-architecture.md
├── skills/
    └──db-first-frontend/
    └──sass-tokens-discipline/
    └──three-systems-separation/
    └──tsa-ux-rules/
├── rules/
│   ├── action.md
├── scripts/
│   ├── action.md
```

## 🎯 Commandes disponibles

Tapez `/` dans Claude Code pour voir la liste complète.

| Commande                   | Description           | Modèle     | Usage                   |
| -------------------------- | --------------------- | ---------- | ----------------------- |
| `/commit`                  | Commit + push rapide  | Haiku      | Workflow quotidien      |
| `/explore <question>`      | Explorer codebase     | **Sonnet** | Comprendre architecture |
| `/debug <bug>`             | Debug ultra-profond   | **Sonnet** | Bugs complexes          |
| `/supabase-migrate <desc>` | Migration DB          | Haiku      | Changements schéma      |
| `/test-component <nom>`    | Tests ciblés          | Haiku      | Vérifier composant      |
| `/verify-quick`            | Check complet rapide  | Haiku      | Avant chaque commit     |
| `/verify-full`             | Check exhaustif (E2E) | Haiku      | Avant deploy prod       |

## 🔧 MCP Servers

**3 serveurs MCP actifs** - Configuration détaillée dans [MCP_CONFIGURATION.md](MCP_CONFIGURATION.md)

| MCP        | Description                          | Type  | État        | Auto-activé |
| ---------- | ------------------------------------ | ----- | ----------- | ----------- |
| `context7` | Docs libraries (React, Next.js, etc) | HTTP  | ✅ Connecté | Oui         |
| `supabase` | Base de données locale (127.0.0.1)   | HTTP  | ✅ Connecté | Oui         |
| `exa`      | Recherche web avancée + code context | stdio | ✅ Connecté | Oui         |

### Utilisation

Les serveurs MCP sont **automatiquement utilisés** par Claude selon le contexte :

```bash
# Exemple 1 : Recherche web avec Exa
"Trouve les best practices Next.js 16 publiées en 2024"
→ Claude utilise automatiquement mcp__exa__web_search_exa

# Exemple 2 : Documentation React avec Context7
"Comment utiliser les Server Actions dans Next.js ?"
→ Claude utilise automatiquement mcp__context7__get-library-docs

# Exemple 3 : Migration Supabase
/supabase-migrate Ajouter colonne avatar_url à users
→ Claude utilise automatiquement mcp__supabase__apply_migration
```

### Test de configuration

```bash
# Vérifier que tous les serveurs sont connectés
claude mcp list

# Tester la configuration Exa.ai
./.claude/scripts/test-exa-mcp.sh
```

**📘 Documentation complète** : Voir [MCP_CONFIGURATION.md](MCP_CONFIGURATION.md)

## 🎨 Output Styles

Changer le style de sortie :

```json
// .claude/settings.json
{
  "outputStyle": "appli-picto-guide" // ou "minimal"
}
```

- **`appli-picto-guide`** (défaut) : Pédagogique, émojis, étapes détaillées
- **`minimal`** : Ultra-concis, économie tokens (quick fixes uniquement)

## 📊 Optimisation tokens

### Modèle par défaut : Haiku 4.5 (~80% moins cher que Sonnet)

| Action                 | Modèle                      | Disponibilité                      |
| ---------------------- | --------------------------- | ---------------------------------- |
| Questions générales    | Haiku 4.5 (alias `haiku`)   | ✅ Inclus Pro                      |
| `/debug`, `/explore`   | Sonnet 4.5 (alias `sonnet`) | ✅ Inclus Pro                      |
| Tâches ultra-complexes | Opus 4.5 (alias `@opus`)    | ❌ Nécessite Max ou `/extra-usage` |

### MCP : Activer seulement si nécessaire

- Par défaut : tous désactivés (économie ~50% tokens)
- Activation temporaire : `@supabase`, `@context7`, `@stripe`

### Output-style : Utiliser `minimal` pour quick fixes

- Commandes courtes → Réponses concises (économie ~30% tokens)

## 🔄 Revenir à AIBlueprint CLI

Si vous souhaitez revenir à la configuration AIBlueprint :

```bash
cd /Users/accipiter_tell/projets/new_sup/appli-picto
rm -rf .claude
ln -s ~/.claude .claude
```

Pour revenir à cette config personnalisée :

```bash
rm .claude
git checkout .claude
```

## ⚙️ Configuration

### Permissions

```json
{
  "bash": "allow", // Commandes bash autorisées
  "read_files": "allow", // Lecture fichiers autorisée
  "write_files": "ask" // Écriture fichiers demande confirmation
}
```

### Hooks

Désactivés actuellement (Bun non installé). Pour réactiver :

1. Installer Bun : `curl -fsSL https://bun.sh/install | bash`
2. Décommenter section `hooks` dans `settings.json`

## 📝 Spécificités Appli-Picto

### Stack technique

- **Framework** : Next.js 16 (App Router, Turbopack)
- **Package Manager** : pnpm 9.15.0 (JAMAIS yarn/npm)
- **Styling** : SCSS avec BEM-lite, palette pastel
- **Backend** : Supabase (PostgreSQL, Auth, Storage)
- **Payment** : Stripe

### Règles critiques

- ✅ Toujours utiliser hooks custom (useTaches, useRecompenses, etc.)
- ✅ `'use client'` pour composants interactifs
- ✅ WCAG 2.2 AA + TSA-friendly (animations douces)
- ✅ `pnpm check` avant tout commit
- ✅ `pnpm context:update` après modif DB

### Workflow recommandé

```bash
# Développement quotidien
pnpm dev                  # Dev server

# Avant commit
/verify-quick             # Vérification complète

# Commit
/commit                   # Commit + push automatique

# Après modif Supabase
/supabase-migrate [desc]  # Migration + types sync

# Debug bug complexe
/debug [description]      # Analyse ultra-profonde

# Avant deploy production
/verify-full              # Check exhaustif (E2E + coverage)
```

## 🆘 Support

- **Documentation Claude Code** : https://docs.claude.com/en/docs/claude-code
- **Issues projet** : Demander à Claude directement

---

**Version** : 1.1.0 (1er décembre 2024)
**Projet** : Appli-Picto (Next.js 16, pnpm, TypeScript strict)
**MCP** : Context7 + Supabase + Exa.ai (3 serveurs actifs)
