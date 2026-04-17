# Configuration Claude Code — Appli-Picto

Documentation humaine de la structure `.claude/` du projet. Claude Code n'a pas besoin de lire ce fichier — il est destiné aux développeurs qui veulent comprendre ou modifier la config.

## Structure

```
CLAUDE.md                     # Racine projet (règles transverses critiques)
.claude/
├── agent-memory/             # Notes d'exploration des sub-agents (éphémère)
├── agents/                   # Sub-agents personnalisés (invoqués par @nom)
├── commands/                 # Commandes custom (/nom)
├── output-styles/            # Styles de réponse (ton, format, persona)
├── rules/                    # Règles auto-chargées par glob de fichiers
├── scripts/                  # Scripts shell référencés par les hooks
├── skills/                   # Expertise de domaine chargée à la demande
├── settings.json             # Config projet (versionné)
└── settings.local.json       # Config perso (gitignored)
```

## Différences conceptuelles

| Mécanisme            | Chargement                     | Cas d'usage                                                     |
| -------------------- | ------------------------------ | --------------------------------------------------------------- |
| **CLAUDE.md racine** | À chaque session               | Règles transverses critiques (stack, workflow, architecture)    |
| **rules/**           | Auto selon `paths:` glob       | Règles techniques par type de fichier (SCSS, migrations, hooks) |
| **skills/**          | Quand Claude juge pertinent    | Expertise de domaine (DB-first, TSA, tokens SCSS)               |
| **agents/**          | Invoqué explicitement (`@nom`) | Review spécialisée (sécurité, TypeScript, SCSS refactor)        |
| **commands/**        | Invoqué explicitement (`/nom`) | Workflows packagés (verify-quick, debug, supabase-migrate)      |
| **output-styles/**   | Configuré dans `settings.json` | Persona / ton / structure de réponse (transverse)               |
| **agent-memory/**    | Lu/écrit par les sub-agents    | Notes éphémères, NON-AUTHORITATIVES                             |

## Différence rules vs skills vs output-styles

- Un **output-style** contrôle **comment** Claude répond (ton, format, langue). Il est transverse.
- Un **skill** contrôle **quelle expertise** Claude applique. Il est contextuel.
- Une **rule** contrôle **quelles conventions techniques** s'appliquent sur certains fichiers. Elle est glob-dépendante.

## Ajouter une nouvelle règle

1. Déterminer le type :
   - Ton/format/persona → `output-styles/`
   - Règle technique par type de fichier → `rules/<nom>.md` avec `paths:` frontmatter
   - Expertise métier → `skills/<nom>/SKILL.md`
   - Workflow à invoquer → `commands/<nom>.md`
   - Review spécialisée → `agents/<nom>.md`
2. Respecter le format Anthropic (kebab-case pour skills, frontmatter YAML, **pas de README.md** dans un dossier skill).
3. Tester avec `/memory` dans Claude Code pour vérifier le chargement.

## Gouvernance agent-memory

Voir section dédiée dans `CLAUDE.md` racine.

## Hooks configurés (`settings.json`)

| Déclencheur                                   | Script                       | Description                                       |
| --------------------------------------------- | ---------------------------- | ------------------------------------------------- |
| `SessionStart`                                | `session-context.sh`         | Affiche le contexte projet au démarrage           |
| `PreToolUse: Bash(git commit/push)`           | `pre-commit.sh`              | Validation CSS avant commit                       |
| `PreToolUse: Write\|Edit`                     | `protect-generated-files.sh` | Bloque modification fichiers générés              |
| `PreToolUse: Write(src/hooks/*.ts)`           | `check-supabase-hooks.sh`    | Vérifie conformité DB-first                       |
| `PreToolUse: Bash(yarn/npm)`                  | `block-yarn-npm.sh`          | Bloque yarn/npm (pnpm obligatoire)                |
| `PreToolUse: Write\|Edit`                     | `suggest-compact.sh`         | Suggère /compact tous les 15 éditions             |
| `PreToolUse: Write(*.md)`                     | `doc-file-warning.sh`        | Avertit si fichier .md hors répertoires standards |
| `PostToolUse: Edit(*.scss)`                   | `check-hardcoded-scss.sh`    | Vérifie valeurs hardcodées SCSS                   |
| `PostToolUse: mcp__supabase__apply_migration` | `post-migration.sh`          | Actions post-migration Supabase                   |
