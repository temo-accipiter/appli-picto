# Configuration Claude Code - Appli-Picto

Configuration personnalisée et optimisée pour le projet Appli-Picto (Next.js 16, pnpm, TypeScript, Supabase).

## 📁 Structure

```
.claude/
├── README.md                    # Ce fichier
├── settings.json                # Configuration projet (versionné Git)
├── .mcp.json                    # MCP servers (Supabase, Context7, Stripe)
├── commands/                    # 7 slash commands optimisées
│   ├── commit.md               # Commit rapide conventionnel
│   ├── explore.md              # Explorer codebase (Sonnet)
│   ├── debug.md                # Debug profond (Sonnet)
│   ├── supabase-migrate.md     # Migration Supabase + types
│   ├── test-component.md       # Tests unitaires ciblés
│   ├── verify-quick.md         # Vérification rapide complète
│   └── verify-full.md          # Vérification exhaustive (E2E + coverage)
├── agents/                      # 4 agents AI
│   ├── action.md               # Exécuteur conditionnel
│   ├── explore-codebase.md     # Exploration code
│   ├── explore-docs.md         # Exploration docs libraries
│   └── websearch.md            # Recherche web
├── output-styles/               # 2 styles de sortie
│   ├── appli-picto-guide.md    # Pédagogique TSA-friendly (par défaut)
│   └── minimal.md              # Ultra-concis (économie tokens)
└── status-line/
    └── simple.sh               # Affichage tokens/quota
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

Tapez `@` pour activer temporairement un MCP server.

| MCP         | Description                     | État      | Activation                   |
| ----------- | ------------------------------- | --------- | ---------------------------- |
| `@supabase` | Documentation Supabase          | Désactivé | Tapez `@supabase <question>` |
| `@context7` | Docs libraries (React, Next.js) | Désactivé | Tapez `@context7 <question>` |
| `@stripe`   | Documentation Stripe            | Désactivé | Tapez `@stripe <question>`   |

**Note** : MCP désactivés par défaut pour économiser tokens. Activer manuellement avec `@` quand nécessaire.

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

**Version** : 1.0.0 (27 novembre 2024)
**Projet** : Appli-Picto (Next.js 16, pnpm, TypeScript strict)
