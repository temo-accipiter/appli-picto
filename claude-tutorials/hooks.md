> ## Documentation Index
>
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Référence des hooks

> Référence pour les événements de hook Claude Code, le schéma de configuration, les formats d'entrée/sortie JSON, les codes de sortie, les hooks asynchrones, les hooks HTTP, les hooks de prompt et les hooks d'outils MCP.

<Tip>
  Pour un guide de démarrage rapide avec des exemples, consultez [Automatiser les flux de travail avec les hooks](/fr/hooks-guide).
</Tip>

Les hooks sont des commandes shell définies par l'utilisateur, des points de terminaison HTTP ou des prompts LLM qui s'exécutent automatiquement à des points spécifiques du cycle de vie de Claude Code. Utilisez cette référence pour consulter les schémas d'événements, les options de configuration, les formats d'entrée/sortie JSON et les fonctionnalités avancées comme les hooks asynchrones, les hooks HTTP et les hooks d'outils MCP. Si vous configurez des hooks pour la première fois, commencez plutôt par le [guide](/fr/hooks-guide).

## Cycle de vie des hooks

Les hooks se déclenchent à des points spécifiques pendant une session Claude Code. Lorsqu'un événement se déclenche et qu'un matcher correspond, Claude Code transmet le contexte JSON de l'événement à votre gestionnaire de hook. Pour les hooks de commande, l'entrée arrive sur stdin. Pour les hooks HTTP, elle arrive dans le corps de la requête POST. Votre gestionnaire peut alors inspecter l'entrée, prendre une action et éventuellement retourner une décision. Certains événements se déclenchent une fois par session, tandis que d'autres se déclenchent à plusieurs reprises dans la boucle agentique :

<div style={{maxWidth: "500px", margin: "0 auto"}}>
  <Frame>
    <img src="https://mintcdn.com/claude-code/1wr0LPds6lVWZkQB/images/hooks-lifecycle.svg?fit=max&auto=format&n=1wr0LPds6lVWZkQB&q=85&s=53a826e7bb64c6bff5f867506c0530ad" alt="Diagramme du cycle de vie des hooks montrant la séquence des hooks de SessionStart à travers la boucle agentique (PreToolUse, PermissionRequest, PostToolUse, SubagentStart/Stop, TaskCompleted) jusqu'à Stop ou StopFailure, TeammateIdle, PreCompact, PostCompact et SessionEnd, avec Elicitation et ElicitationResult imbriqués dans l'exécution de l'outil MCP et WorktreeCreate, WorktreeRemove, Notification, ConfigChange, InstructionsLoaded, CwdChanged et FileChanged comme événements asynchrones autonomes" width="520" height="1155" data-path="images/hooks-lifecycle.svg" />
  </Frame>
</div>

Le tableau ci-dessous résume le moment où chaque événement se déclenche. La section [Événements de hook](#hook-events) documente le schéma d'entrée complet et les options de contrôle de décision pour chacun.

| Event                | When it fires                                                                                                                                          |
| :------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SessionStart`       | When a session begins or resumes                                                                                                                       |
| `UserPromptSubmit`   | When you submit a prompt, before Claude processes it                                                                                                   |
| `PreToolUse`         | Before a tool call executes. Can block it                                                                                                              |
| `PermissionRequest`  | When a permission dialog appears                                                                                                                       |
| `PostToolUse`        | After a tool call succeeds                                                                                                                             |
| `PostToolUseFailure` | After a tool call fails                                                                                                                                |
| `Notification`       | When Claude Code sends a notification                                                                                                                  |
| `SubagentStart`      | When a subagent is spawned                                                                                                                             |
| `SubagentStop`       | When a subagent finishes                                                                                                                               |
| `TaskCreated`        | When a task is being created via `TaskCreate`                                                                                                          |
| `TaskCompleted`      | When a task is being marked as completed                                                                                                               |
| `Stop`               | When Claude finishes responding                                                                                                                        |
| `StopFailure`        | When the turn ends due to an API error. Output and exit code are ignored                                                                               |
| `TeammateIdle`       | When an [agent team](/en/agent-teams) teammate is about to go idle                                                                                     |
| `InstructionsLoaded` | When a CLAUDE.md or `.claude/rules/*.md` file is loaded into context. Fires at session start and when files are lazily loaded during a session         |
| `ConfigChange`       | When a configuration file changes during a session                                                                                                     |
| `CwdChanged`         | When the working directory changes, for example when Claude executes a `cd` command. Useful for reactive environment management with tools like direnv |
| `FileChanged`        | When a watched file changes on disk. The `matcher` field specifies which filenames to watch                                                            |
| `WorktreeCreate`     | When a worktree is being created via `--worktree` or `isolation: "worktree"`. Replaces default git behavior                                            |
| `WorktreeRemove`     | When a worktree is being removed, either at session exit or when a subagent finishes                                                                   |
| `PreCompact`         | Before context compaction                                                                                                                              |
| `PostCompact`        | After context compaction completes                                                                                                                     |
| `Elicitation`        | When an MCP server requests user input during a tool call                                                                                              |
| `ElicitationResult`  | After a user responds to an MCP elicitation, before the response is sent back to the server                                                            |
| `SessionEnd`         | When a session terminates                                                                                                                              |

### Comment un hook se résout

Pour voir comment ces éléments s'assemblent, considérez ce hook `PreToolUse` qui bloque les commandes shell destructrices. Le hook exécute `block-rm.sh` avant chaque appel d'outil Bash :

```json theme={null}
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/block-rm.sh"
          }
        ]
      }
    ]
  }
}
```

Le script lit l'entrée JSON depuis stdin, extrait la commande et retourne une `permissionDecision` de `"deny"` si elle contient `rm -rf` :

```bash theme={null}
#!/bin/bash
# .claude/hooks/block-rm.sh
COMMAND=$(jq -r '.tool_input.command')

if echo "$COMMAND" | grep -q 'rm -rf'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Destructive command blocked by hook"
    }
  }'
else
  exit 0  # allow the command
fi
```

Supposons maintenant que Claude Code décide d'exécuter `Bash "rm -rf /tmp/build"`. Voici ce qui se passe :

<Frame>
  <img src="https://mintcdn.com/claude-code/c5r9_6tjPMzFdDDT/images/hook-resolution.svg?fit=max&auto=format&n=c5r9_6tjPMzFdDDT&q=85&s=ad667ee6d86ab2276aa48a4e73e220df" alt="Flux de résolution du hook : l'événement PreToolUse se déclenche, le matcher vérifie la correspondance Bash, le gestionnaire de hook s'exécute, le résultat revient à Claude Code" width="780" height="290" data-path="images/hook-resolution.svg" />
</Frame>

<Steps>
  <Step title="L'événement se déclenche">
    L'événement `PreToolUse` se déclenche. Claude Code envoie l'entrée de l'outil en JSON sur stdin au hook :

    ```json  theme={null}
    { "tool_name": "Bash", "tool_input": { "command": "rm -rf /tmp/build" }, ... }
    ```

  </Step>

  <Step title="Le matcher vérifie">
    Le matcher `"Bash"` correspond au nom de l'outil, donc `block-rm.sh` s'exécute. Si vous omettez le matcher ou utilisez `"*"`, le hook s'exécute à chaque occurrence de l'événement. Les hooks ne s'ignorent que lorsqu'un matcher est défini et ne correspond pas.
  </Step>

  <Step title="Le gestionnaire de hook s'exécute">
    Le script extrait `"rm -rf /tmp/build"` de l'entrée et trouve `rm -rf`, donc il imprime une décision sur stdout :

    ```json  theme={null}
    {
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": "Destructive command blocked by hook"
      }
    }
    ```

    Si la commande avait été sûre (comme `npm test`), le script aurait atteint `exit 0` à la place, ce qui indique à Claude Code d'autoriser l'appel d'outil sans action supplémentaire.

  </Step>

  <Step title="Claude Code agit sur le résultat">
    Claude Code lit la décision JSON, bloque l'appel d'outil et montre la raison à Claude.
  </Step>
</Steps>

La section [Configuration](#configuration) ci-dessous documente le schéma complet, et chaque section [événement de hook](#hook-events) documente l'entrée que votre commande reçoit et la sortie qu'elle peut retourner.

## Configuration

Les hooks sont définis dans les fichiers de paramètres JSON. La configuration a trois niveaux d'imbrication :

1. Choisissez un [événement de hook](#hook-events) auquel répondre, comme `PreToolUse` ou `Stop`
2. Ajoutez un [groupe de matcher](#matcher-patterns) pour filtrer quand il se déclenche, comme ' uniquement pour l'outil Bash '
3. Définissez un ou plusieurs [gestionnaires de hook](#hook-handler-fields) à exécuter lorsqu'il y a correspondance

Consultez [Comment un hook se résout](#how-a-hook-resolves) ci-dessus pour une procédure pas à pas complète avec un exemple annoté.

<Note>
  Cette page utilise des termes spécifiques pour chaque niveau : **événement de hook** pour le point du cycle de vie, **groupe de matcher** pour le filtre et **gestionnaire de hook** pour la commande shell, le point de terminaison HTTP, le prompt ou l'agent qui s'exécute. ' Hook ' seul fait référence à la fonctionnalité générale.
</Note>

### Emplacements des hooks

L'endroit où vous définissez un hook détermine sa portée :

| Emplacement                                                | Portée                             | Partageable                              |
| :--------------------------------------------------------- | :--------------------------------- | :--------------------------------------- |
| `~/.claude/settings.json`                                  | Tous vos projets                   | Non, local à votre machine               |
| `.claude/settings.json`                                    | Projet unique                      | Oui, peut être commité dans le repo      |
| `.claude/settings.local.json`                              | Projet unique                      | Non, ignoré par git                      |
| Paramètres de politique gérée                              | À l'échelle de l'organisation      | Oui, contrôlé par l'administrateur       |
| [Plugin](/fr/plugins) `hooks/hooks.json`                   | Lorsque le plugin est activé       | Oui, fourni avec le plugin               |
| Frontmatter [Skill](/fr/skills) ou [agent](/fr/sub-agents) | Pendant que le composant est actif | Oui, défini dans le fichier du composant |

Pour plus de détails sur la résolution des fichiers de paramètres, consultez [paramètres](/fr/settings). Les administrateurs d'entreprise peuvent utiliser `allowManagedHooksOnly` pour bloquer les hooks utilisateur, projet et plugin. Consultez [Configuration des hooks](/fr/settings#hook-configuration).

### Modèles de matcher

Le champ `matcher` est une chaîne regex qui filtre quand les hooks se déclenchent. Utilisez `"*"`, `""` ou omettez entièrement `matcher` pour correspondre à toutes les occurrences. Chaque type d'événement correspond sur un champ différent :

| Événement                                                                                       | Ce que le matcher filtre                     | Exemples de valeurs de matcher                                                                                            |
| :---------------------------------------------------------------------------------------------- | :------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`                          | nom de l'outil                               | `Bash`, `Edit\|Write`, `mcp__.*`                                                                                          |
| `SessionStart`                                                                                  | comment la session a démarré                 | `startup`, `resume`, `clear`, `compact`                                                                                   |
| `SessionEnd`                                                                                    | pourquoi la session s'est terminée           | `clear`, `resume`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other`                                  |
| `Notification`                                                                                  | type de notification                         | `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`                                                  |
| `SubagentStart`                                                                                 | type d'agent                                 | `Bash`, `Explore`, `Plan` ou noms d'agents personnalisés                                                                  |
| `PreCompact`, `PostCompact`                                                                     | ce qui a déclenché la compaction             | `manual`, `auto`                                                                                                          |
| `SubagentStop`                                                                                  | type d'agent                                 | mêmes valeurs que `SubagentStart`                                                                                         |
| `ConfigChange`                                                                                  | source de configuration                      | `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills`                                        |
| `CwdChanged`                                                                                    | pas de support de matcher                    | se déclenche toujours à chaque changement de répertoire                                                                   |
| `FileChanged`                                                                                   | nom de fichier (basename du fichier modifié) | `.envrc`, `.env`, tout nom de fichier que vous voulez surveiller                                                          |
| `StopFailure`                                                                                   | type d'erreur                                | `rate_limit`, `authentication_failed`, `billing_error`, `invalid_request`, `server_error`, `max_output_tokens`, `unknown` |
| `InstructionsLoaded`                                                                            | raison du chargement                         | `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`                                              |
| `Elicitation`                                                                                   | nom du serveur MCP                           | vos noms de serveur MCP configurés                                                                                        |
| `ElicitationResult`                                                                             | nom du serveur MCP                           | mêmes valeurs que `Elicitation`                                                                                           |
| `UserPromptSubmit`, `Stop`, `TeammateIdle`, `TaskCompleted`, `WorktreeCreate`, `WorktreeRemove` | pas de support de matcher                    | se déclenche toujours à chaque occurrence                                                                                 |

Le matcher est une regex, donc `Edit|Write` correspond à l'un ou l'autre outil et `Notebook.*` correspond à tout outil commençant par Notebook. Le matcher s'exécute sur un champ de l'[entrée JSON](#hook-input-and-output) que Claude Code envoie à votre hook sur stdin. Pour les événements d'outil, ce champ est `tool_name`. Chaque section [événement de hook](#hook-events) liste l'ensemble complet des valeurs de matcher et le schéma d'entrée pour cet événement.

Cet exemple exécute un script de linting uniquement lorsque Claude écrit ou édite un fichier :

```json theme={null}
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/lint-check.sh"
          }
        ]
      }
    ]
  }
}
```

`UserPromptSubmit`, `Stop`, `TeammateIdle`, `TaskCompleted`, `WorktreeCreate`, `WorktreeRemove` et `CwdChanged` ne supportent pas les matchers et se déclenchent toujours à chaque occurrence. Si vous ajoutez un champ `matcher` à ces événements, il est silencieusement ignoré.

#### Correspondre aux outils MCP

Les outils du serveur [MCP](/fr/mcp) apparaissent comme des outils réguliers dans les événements d'outil (`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`), vous pouvez donc les faire correspondre de la même manière que tout autre nom d'outil.

Les outils MCP suivent le modèle de nommage `mcp__<server>__<tool>`, par exemple :

- `mcp__memory__create_entities` : outil de création d'entités du serveur Memory
- `mcp__filesystem__read_file` : outil de lecture de fichier du serveur Filesystem
- `mcp__github__search_repositories` : outil de recherche du serveur GitHub

Utilisez des modèles regex pour cibler des outils MCP spécifiques ou des groupes d'outils :

- `mcp__memory__.*` correspond à tous les outils du serveur `memory`
- `mcp__.*__write.*` correspond à tout outil contenant « write » de n'importe quel serveur

Cet exemple enregistre toutes les opérations du serveur memory et valide les opérations d'écriture de n'importe quel serveur MCP :

```json theme={null}
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__memory__.*",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Memory operation initiated' >> ~/mcp-operations.log"
          }
        ]
      },
      {
        "matcher": "mcp__.*__write.*",
        "hooks": [
          {
            "type": "command",
            "command": "/home/user/scripts/validate-mcp-write.py"
          }
        ]
      }
    ]
  }
}
```

### Champs du gestionnaire de hook

Chaque objet du tableau `hooks` interne est un gestionnaire de hook : la commande shell, le point de terminaison HTTP, le prompt LLM ou l'agent qui s'exécute lorsque le matcher correspond. Il y a quatre types :

- **[Hooks de commande](#command-hook-fields)** (`type: "command"`) : exécutent une commande shell. Votre script reçoit l'[entrée JSON](#hook-input-and-output) de l'événement sur stdin et communique les résultats via les codes de sortie et stdout.
- **[Hooks HTTP](#http-hook-fields)** (`type: "http"`) : envoient l'entrée JSON de l'événement en tant que requête HTTP POST à une URL. Le point de terminaison communique les résultats via le corps de la réponse en utilisant le même [format de sortie JSON](#json-output) que les hooks de commande.
- **[Hooks de prompt](#prompt-and-agent-hook-fields)** (`type: "prompt"`) : envoient un prompt à un modèle Claude pour une évaluation en un seul tour. Le modèle retourne une décision oui/non en JSON. Consultez [Hooks basés sur des prompts](#prompt-based-hooks).
- **[Hooks d'agent](#prompt-and-agent-hook-fields)** (`type: "agent"`) : lancent un subagent qui peut utiliser des outils comme Read, Grep et Glob pour vérifier les conditions avant de retourner une décision. Consultez [Hooks basés sur des agents](#agent-based-hooks).

#### Champs communs

Ces champs s'appliquent à tous les types de hooks :

| Champ           | Requis | Description                                                                                                                                                                |
| :-------------- | :----- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`          | oui    | `"command"`, `"http"`, `"prompt"` ou `"agent"`                                                                                                                             |
| `timeout`       | non    | Secondes avant annulation. Valeurs par défaut : 600 pour command, 30 pour prompt, 60 pour agent                                                                            |
| `statusMessage` | non    | Message de spinner personnalisé affiché pendant l'exécution du hook                                                                                                        |
| `once`          | non    | Si `true`, s'exécute une seule fois par session puis est supprimé. Skills uniquement, pas agents. Consultez [Hooks dans les skills et agents](#hooks-in-skills-and-agents) |

#### Champs des hooks de commande

En plus des [champs communs](#common-fields), les hooks de commande acceptent ces champs :

| Champ     | Requis | Description                                                                                                                     |
| :-------- | :----- | :------------------------------------------------------------------------------------------------------------------------------ |
| `command` | oui    | Commande shell à exécuter                                                                                                       |
| `async`   | non    | Si `true`, s'exécute en arrière-plan sans bloquer. Consultez [Exécuter les hooks en arrière-plan](#run-hooks-in-the-background) |

#### Champs des hooks HTTP

En plus des [champs communs](#common-fields), les hooks HTTP acceptent ces champs :

| Champ            | Requis | Description                                                                                                                                                                                                                                                 |
| :--------------- | :----- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`            | oui    | URL vers laquelle envoyer la requête POST                                                                                                                                                                                                                   |
| `headers`        | non    | En-têtes HTTP supplémentaires sous forme de paires clé-valeur. Les valeurs supportent l'interpolation de variables d'environnement en utilisant la syntaxe `$VAR_NAME` ou `${VAR_NAME}`. Seules les variables listées dans `allowedEnvVars` sont résolues   |
| `allowedEnvVars` | non    | Liste des noms de variables d'environnement qui peuvent être interpolés dans les valeurs d'en-tête. Les références aux variables non listées sont remplacées par des chaînes vides. Requis pour que l'interpolation de variables d'environnement fonctionne |

Claude Code envoie l'[entrée JSON](#hook-input-and-output) du hook en tant que corps de la requête POST avec `Content-Type: application/json`. Le corps de la réponse utilise le même [format de sortie JSON](#json-output) que les hooks de commande.

La gestion des erreurs diffère des hooks de commande : les réponses non-2xx, les défaillances de connexion et les délais d'expiration produisent tous des erreurs non-bloquantes qui permettent à l'exécution de continuer. Pour bloquer un appel d'outil ou refuser une permission, retournez une réponse 2xx avec un corps JSON contenant `decision: "block"` ou un `hookSpecificOutput` avec `permissionDecision: "deny"`.

Cet exemple envoie les événements `PreToolUse` à un service de validation local, en s'authentifiant avec un token de la variable d'environnement `MY_TOKEN` :

```json theme={null}
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:8080/hooks/pre-tool-use",
            "timeout": 30,
            "headers": {
              "Authorization": "Bearer $MY_TOKEN"
            },
            "allowedEnvVars": ["MY_TOKEN"]
          }
        ]
      }
    ]
  }
}
```

#### Champs des hooks de prompt et d'agent

En plus des [champs communs](#common-fields), les hooks de prompt et d'agent acceptent ces champs :

| Champ    | Requis | Description                                                                                             |
| :------- | :----- | :------------------------------------------------------------------------------------------------------ |
| `prompt` | oui    | Texte du prompt à envoyer au modèle. Utilisez `$ARGUMENTS` comme placeholder pour l'entrée JSON du hook |
| `model`  | non    | Modèle à utiliser pour l'évaluation. Par défaut un modèle rapide                                        |

Tous les hooks correspondants s'exécutent en parallèle, et les gestionnaires identiques sont automatiquement dédupliqués. Les hooks de commande sont dédupliqués par chaîne de commande, et les hooks HTTP sont dédupliqués par URL. Les gestionnaires s'exécutent dans le répertoire courant avec l'environnement de Claude Code. La variable d'environnement `$CLAUDE_CODE_REMOTE` est définie à `"true"` dans les environnements web distants et n'est pas définie dans le CLI local.

### Référencer les scripts par chemin

Utilisez les variables d'environnement pour référencer les scripts de hook par rapport à la racine du projet ou du plugin, indépendamment du répertoire de travail lorsque le hook s'exécute :

- `$CLAUDE_PROJECT_DIR` : la racine du projet. Enveloppez entre guillemets pour gérer les chemins avec des espaces.
- `${CLAUDE_PLUGIN_ROOT}` : le répertoire racine du plugin, pour les scripts fournis avec un [plugin](/fr/plugins). Change à chaque mise à jour du plugin.
- `${CLAUDE_PLUGIN_DATA}` : le [répertoire de données persistantes](/fr/plugins-reference#persistent-data-directory) du plugin, pour les dépendances et l'état qui doivent survivre aux mises à jour du plugin.

<Tabs>
  <Tab title="Scripts de projet">
    Cet exemple utilise `$CLAUDE_PROJECT_DIR` pour exécuter un vérificateur de style à partir du répertoire `.claude/hooks/` du projet après tout appel d'outil `Write` ou `Edit` :

    ```json  theme={null}
    {
      "hooks": {
        "PostToolUse": [
          {
            "matcher": "Write|Edit",
            "hooks": [
              {
                "type": "command",
                "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-style.sh"
              }
            ]
          }
        ]
      }
    }
    ```

  </Tab>

  <Tab title="Scripts de plugin">
    Définissez les hooks de plugin dans `hooks/hooks.json` avec un champ `description` optionnel au niveau supérieur. Lorsqu'un plugin est activé, ses hooks fusionnent avec vos hooks utilisateur et projet.

    Cet exemple exécute un script de formatage fourni avec le plugin :

    ```json  theme={null}
    {
      "description": "Automatic code formatting",
      "hooks": {
        "PostToolUse": [
          {
            "matcher": "Write|Edit",
            "hooks": [
              {
                "type": "command",
                "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format.sh",
                "timeout": 30
              }
            ]
          }
        ]
      }
    }
    ```

    Consultez la [référence des composants de plugin](/fr/plugins-reference#hooks) pour plus de détails sur la création de hooks de plugin.

  </Tab>
</Tabs>

### Hooks dans les skills et agents

En plus des fichiers de paramètres et des plugins, les hooks peuvent être définis directement dans les [skills](/fr/skills) et les [subagents](/fr/sub-agents) en utilisant le frontmatter. Ces hooks sont limités au cycle de vie du composant et ne s'exécutent que lorsque ce composant est actif.

Tous les événements de hook sont supportés. Pour les subagents, les hooks `Stop` sont automatiquement convertis en `SubagentStop` puisque c'est l'événement qui se déclenche lorsqu'un subagent se termine.

Les hooks utilisent le même format de configuration que les hooks basés sur les paramètres mais sont limités à la durée de vie du composant et nettoyés lorsqu'il se termine.

Ce skill définit un hook `PreToolUse` qui exécute un script de validation de sécurité avant chaque commande `Bash` :

```yaml theme={null}
---
name: secure-operations
description: Perform operations with security checks
hooks:
  PreToolUse:
    - matcher: 'Bash'
      hooks:
        - type: command
          command: './scripts/security-check.sh'
---
```

Les agents utilisent le même format dans leur frontmatter YAML.

### Le menu `/hooks`

Tapez `/hooks` dans Claude Code pour ouvrir un navigateur en lecture seule pour vos hooks configurés. Le menu affiche chaque événement de hook avec un nombre de hooks configurés, vous permet d'explorer les matchers et affiche les détails complets de chaque gestionnaire de hook. Utilisez-le pour vérifier la configuration, vérifier à partir de quel fichier de paramètres un hook provient ou inspecter la commande, le prompt ou l'URL d'un hook.

Le menu affiche les quatre types de hooks : `command`, `prompt`, `agent` et `http`. Chaque hook est étiqueté avec un préfixe `[type]` et une source indiquant où il a été défini :

- `User` : de `~/.claude/settings.json`
- `Project` : de `.claude/settings.json`
- `Local` : de `.claude/settings.local.json`
- `Plugin` : du `hooks/hooks.json` d'un plugin
- `Session` : enregistré en mémoire pour la session actuelle
- `Built-in` : enregistré en interne par Claude Code

Sélectionner un hook ouvre une vue détaillée affichant son événement, son matcher, son type, son fichier source et la commande, le prompt ou l'URL complet. Le menu est en lecture seule : pour ajouter, modifier ou supprimer des hooks, éditez directement le JSON des paramètres ou demandez à Claude de faire la modification.

### Désactiver ou supprimer les hooks

Pour supprimer un hook, supprimez son entrée du fichier de paramètres JSON.

Pour désactiver temporairement tous les hooks sans les supprimer, définissez `"disableAllHooks": true` dans votre fichier de paramètres. Il n'y a aucun moyen de désactiver un hook individuel tout en le gardant dans la configuration.

Le paramètre `disableAllHooks` respecte la hiérarchie des paramètres gérés. Si un administrateur a configuré des hooks via les paramètres de politique gérée, `disableAllHooks` défini dans les paramètres utilisateur, projet ou local ne peut pas désactiver ces hooks gérés. Seul `disableAllHooks` défini au niveau des paramètres gérés peut désactiver les hooks gérés.

Les éditions directes des hooks dans les fichiers de paramètres sont normalement détectées automatiquement par le moniteur de fichiers.

## Entrée et sortie des hooks

Les hooks de commande reçoivent les données JSON via stdin et communiquent les résultats via les codes de sortie, stdout et stderr. Les hooks HTTP reçoivent le même JSON que le corps de la requête POST et communiquent les résultats via le corps de la réponse HTTP. Cette section couvre les champs et le comportement communs à tous les événements. Chaque section d'événement sous [Événements de hook](#hook-events) inclut son schéma d'entrée spécifique et les options de contrôle de décision.

### Champs d'entrée communs

Tous les événements de hook reçoivent ces champs en JSON, en plus des champs spécifiques à l'événement documentés dans chaque section [événement de hook](#hook-events). Pour les hooks de commande, ce JSON arrive via stdin. Pour les hooks HTTP, il arrive dans le corps de la requête POST.

| Champ             | Description                                                                                                                                                                                                                                                                   |
| :---------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session_id`      | Identifiant de session actuel                                                                                                                                                                                                                                                 |
| `transcript_path` | Chemin vers le JSON de conversation                                                                                                                                                                                                                                           |
| `cwd`             | Répertoire de travail courant lorsque le hook est invoqué                                                                                                                                                                                                                     |
| `permission_mode` | [Mode de permission](/fr/permissions#permission-modes) actuel : `"default"`, `"plan"`, `"acceptEdits"`, `"auto"`, `"dontAsk"` ou `"bypassPermissions"`. Tous les événements ne reçoivent pas ce champ : consultez l'exemple JSON de chaque événement ci-dessous pour vérifier |
| `hook_event_name` | Nom de l'événement qui s'est déclenché                                                                                                                                                                                                                                        |

Lors de l'exécution avec `--agent` ou à l'intérieur d'un subagent, deux champs supplémentaires sont inclus :

| Champ        | Description                                                                                                                                                                                                                                                               |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `agent_id`   | Identifiant unique pour le subagent. Présent uniquement lorsque le hook se déclenche à l'intérieur d'un appel de subagent. Utilisez ceci pour distinguer les appels de hook de subagent des appels du thread principal.                                                   |
| `agent_type` | Nom de l'agent (par exemple, `"Explore"` ou `"security-reviewer"`). Présent lorsque la session utilise `--agent` ou que le hook se déclenche à l'intérieur d'un subagent. Pour les subagents, le type du subagent prend précédence sur la valeur `--agent` de la session. |

Par exemple, un hook `PreToolUse` pour une commande Bash reçoit ceci sur stdin :

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/home/user/.claude/projects/.../transcript.jsonl",
  "cwd": "/home/user/my-project",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test"
  }
}
```

Les champs `tool_name` et `tool_input` sont spécifiques à l'événement. Chaque section [événement de hook](#hook-events) documente les champs supplémentaires pour cet événement.

### Sortie du code de sortie

Le code de sortie de votre commande de hook indique à Claude Code si l'action doit procéder, être bloquée ou être ignorée.

**Exit 0** signifie succès. Claude Code analyse stdout pour les [champs de sortie JSON](#json-output). La sortie JSON n'est traitée que sur exit 0. Pour la plupart des événements, stdout n'est affiché que en mode verbeux (`Ctrl+O`). Les exceptions sont `UserPromptSubmit` et `SessionStart`, où stdout est ajouté comme contexte que Claude peut voir et sur lequel agir.

**Exit 2** signifie une erreur bloquante. Claude Code ignore stdout et tout JSON qu'il contient. À la place, le texte stderr est renvoyé à Claude comme message d'erreur. L'effet dépend de l'événement : `PreToolUse` bloque l'appel d'outil, `UserPromptSubmit` rejette le prompt, etc. Consultez [comportement du code de sortie 2](#exit-code-2-behavior-per-event) pour la liste complète.

**Tout autre code de sortie** est une erreur non-bloquante. stderr est affiché en mode verbeux (`Ctrl+O`) et l'exécution continue.

Par exemple, un script de commande de hook qui bloque les commandes Bash dangereuses :

```bash theme={null}
#!/bin/bash
# Lit l'entrée JSON depuis stdin, vérifie la commande
command=$(jq -r '.tool_input.command' < /dev/stdin)

if [[ "$command" == rm* ]]; then
  echo "Blocked: rm commands are not allowed" >&2
  exit 2  # Erreur bloquante : l'appel d'outil est empêché
fi

exit 0  # Succès : l'appel d'outil procède
```

#### Comportement du code de sortie 2 par événement

Le code de sortie 2 est la façon dont un hook signale « arrêtez, ne faites pas cela ». L'effet dépend de l'événement, car certains événements représentent des actions qui peuvent être bloquées (comme un appel d'outil qui ne s'est pas encore produit) et d'autres représentent des choses qui se sont déjà produites ou ne peuvent pas être empêchées.

| Événement de hook    | Peut bloquer ? | Ce qui se passe sur exit 2                                                        |
| :------------------- | :------------- | :-------------------------------------------------------------------------------- |
| `PreToolUse`         | Oui            | Bloque l'appel d'outil                                                            |
| `PermissionRequest`  | Oui            | Refuse la permission                                                              |
| `UserPromptSubmit`   | Oui            | Bloque le traitement du prompt et efface le prompt                                |
| `Stop`               | Oui            | Empêche Claude de s'arrêter, continue la conversation                             |
| `SubagentStop`       | Oui            | Empêche le subagent de s'arrêter                                                  |
| `TeammateIdle`       | Oui            | Empêche le coéquipier de devenir inactif (le coéquipier continue de travailler)   |
| `TaskCompleted`      | Oui            | Empêche la tâche d'être marquée comme complétée                                   |
| `ConfigChange`       | Oui            | Bloque la modification de configuration de prendre effet (sauf `policy_settings`) |
| `StopFailure`        | Non            | La sortie et le code de sortie sont ignorés                                       |
| `PostToolUse`        | Non            | Affiche stderr à Claude (l'outil a déjà s'exécuté)                                |
| `PostToolUseFailure` | Non            | Affiche stderr à Claude (l'outil a déjà échoué)                                   |
| `Notification`       | Non            | Affiche stderr à l'utilisateur uniquement                                         |
| `SubagentStart`      | Non            | Affiche stderr à l'utilisateur uniquement                                         |
| `SessionStart`       | Non            | Affiche stderr à l'utilisateur uniquement                                         |
| `SessionEnd`         | Non            | Affiche stderr à l'utilisateur uniquement                                         |
| `CwdChanged`         | Non            | Affiche stderr à l'utilisateur uniquement                                         |
| `FileChanged`        | Non            | Affiche stderr à l'utilisateur uniquement                                         |
| `PreCompact`         | Non            | Affiche stderr à l'utilisateur uniquement                                         |
| `PostCompact`        | Non            | Affiche stderr à l'utilisateur uniquement                                         |
| `Elicitation`        | Oui            | Refuse l'élicitation                                                              |
| `ElicitationResult`  | Oui            | Bloque la réponse (l'action devient decline)                                      |
| `WorktreeCreate`     | Oui            | Tout code de sortie non-zéro provoque l'échec de la création du worktree          |
| `WorktreeRemove`     | Non            | Les défaillances sont enregistrées en mode debug uniquement                       |
| `InstructionsLoaded` | Non            | Le code de sortie est ignoré                                                      |

### Gestion des réponses HTTP

Les hooks HTTP utilisent les codes de statut HTTP et les corps de réponse au lieu des codes de sortie et stdout :

- **2xx avec un corps vide** : succès, équivalent à exit code 0 sans sortie
- **2xx avec un corps en texte brut** : succès, le texte est ajouté comme contexte
- **2xx avec un corps JSON** : succès, analysé en utilisant le même schéma [sortie JSON](#json-output) que les hooks de commande
- **Statut non-2xx** : erreur non-bloquante, l'exécution continue
- **Défaillance de connexion ou délai d'expiration** : erreur non-bloquante, l'exécution continue

Contrairement aux hooks de commande, les hooks HTTP ne peuvent pas signaler une erreur bloquante uniquement via les codes de statut. Pour bloquer un appel d'outil ou refuser une permission, retournez une réponse 2xx avec un corps JSON contenant les champs de décision appropriés.

### Sortie JSON

Les codes de sortie vous permettent d'autoriser ou de bloquer, mais la sortie JSON vous donne un contrôle plus granulaire. Au lieu de quitter avec le code 2 pour bloquer, quittez 0 et imprimez un objet JSON sur stdout. Claude Code lit les champs spécifiques de ce JSON pour contrôler le comportement, y compris [contrôle de décision](#decision-control) pour bloquer, autoriser ou escalader à l'utilisateur.

<Note>
  Vous devez choisir une approche par hook, pas les deux : soit utiliser les codes de sortie seuls pour signaler, soit quitter 0 et imprimer JSON pour un contrôle structuré. Claude Code ne traite JSON que sur exit 0. Si vous quittez 2, tout JSON est ignoré.
</Note>

La sortie stdout de votre hook doit contenir uniquement l'objet JSON. Si votre profil shell imprime du texte au démarrage, cela peut interférer avec l'analyse JSON. Consultez [Validation JSON échouée](/fr/hooks-guide#json-validation-failed) dans le guide de dépannage.

L'objet JSON supporte trois types de champs :

- **Champs universels** comme `continue` fonctionnent sur tous les événements. Ceux-ci sont listés dans le tableau ci-dessous.
- **`decision` et `reason` au niveau supérieur** sont utilisés par certains événements pour bloquer ou fournir des commentaires.
- **`hookSpecificOutput`** est un objet imbriqué pour les événements qui ont besoin d'un contrôle plus riche. Il nécessite un champ `hookEventName` défini au nom de l'événement.

| Champ            | Par défaut | Description                                                                                                                                                |
| :--------------- | :--------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `continue`       | `true`     | Si `false`, Claude arrête complètement le traitement après l'exécution du hook. Prend précédence sur tous les champs de décision spécifiques à l'événement |
| `stopReason`     | aucun      | Message affiché à l'utilisateur lorsque `continue` est `false`. Non affiché à Claude                                                                       |
| `suppressOutput` | `false`    | Si `true`, masque stdout de la sortie du mode verbeux                                                                                                      |
| `systemMessage`  | aucun      | Message d'avertissement affiché à l'utilisateur                                                                                                            |

Pour arrêter Claude entièrement indépendamment du type d'événement :

```json theme={null}
{
  "continue": false,
  "stopReason": "Build failed, fix errors before continuing"
}
```

#### Contrôle de décision

Tous les événements ne supportent pas le blocage ou le contrôle du comportement via JSON. Les événements qui le font utilisent chacun un ensemble différent de champs pour exprimer cette décision. Utilisez ce tableau comme référence rapide avant d'écrire un hook :

| Événements                                                                                                                  | Modèle de décision                  | Champs clés                                                                                                                                                                                             |
| :-------------------------------------------------------------------------------------------------------------------------- | :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UserPromptSubmit, PostToolUse, PostToolUseFailure, Stop, SubagentStop, ConfigChange                                         | `decision` au niveau supérieur      | `decision: "block"`, `reason`                                                                                                                                                                           |
| TeammateIdle, TaskCompleted                                                                                                 | Code de sortie ou `continue: false` | Le code de sortie 2 bloque l'action avec commentaires stderr. JSON `{"continue": false, "stopReason": "..."}` arrête également complètement le coéquipier, correspondant au comportement du hook `Stop` |
| PreToolUse                                                                                                                  | `hookSpecificOutput`                | `permissionDecision` (allow/deny/ask), `permissionDecisionReason`                                                                                                                                       |
| PermissionRequest                                                                                                           | `hookSpecificOutput`                | `decision.behavior` (allow/deny)                                                                                                                                                                        |
| WorktreeCreate                                                                                                              | chemin stdout                       | Le hook imprime le chemin absolu du worktree créé. La sortie non-zéro échoue la création                                                                                                                |
| Elicitation                                                                                                                 | `hookSpecificOutput`                | `action` (accept/decline/cancel), `content` (valeurs des champs de formulaire pour accept)                                                                                                              |
| ElicitationResult                                                                                                           | `hookSpecificOutput`                | `action` (accept/decline/cancel), `content` (valeurs des champs de formulaire override)                                                                                                                 |
| WorktreeRemove, Notification, SessionEnd, PreCompact, PostCompact, InstructionsLoaded, StopFailure, CwdChanged, FileChanged | Aucun                               | Pas de contrôle de décision. Utilisé pour les effets secondaires comme la journalisation ou le nettoyage                                                                                                |

Voici des exemples de chaque modèle en action :

<Tabs>
  <Tab title="Décision au niveau supérieur">
    Utilisé par `UserPromptSubmit`, `PostToolUse`, `PostToolUseFailure`, `Stop`, `SubagentStop` et `ConfigChange`. La seule valeur est `"block"`. Pour autoriser l'action à procéder, omettez `decision` de votre JSON ou quittez 0 sans aucun JSON :

    ```json  theme={null}
    {
      "decision": "block",
      "reason": "Test suite must pass before proceeding"
    }
    ```

  </Tab>

  <Tab title="PreToolUse">
    Utilise `hookSpecificOutput` pour un contrôle plus riche : autoriser, refuser ou escalader à l'utilisateur. Vous pouvez également modifier l'entrée de l'outil avant son exécution ou injecter du contexte supplémentaire pour Claude. Consultez [Contrôle de décision PreToolUse](#pretooluse-decision-control) pour l'ensemble complet des options.

    ```json  theme={null}
    {
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": "Database writes are not allowed"
      }
    }
    ```

  </Tab>

  <Tab title="PermissionRequest">
    Utilise `hookSpecificOutput` pour autoriser ou refuser une demande de permission au nom de l'utilisateur. Lors de l'autorisation, vous pouvez également modifier l'entrée de l'outil ou appliquer des règles de permission afin que l'utilisateur ne soit pas invité à nouveau. Consultez [Contrôle de décision PermissionRequest](#permissionrequest-decision-control) pour l'ensemble complet des options.

    ```json  theme={null}
    {
      "hookSpecificOutput": {
        "hookEventName": "PermissionRequest",
        "decision": {
          "behavior": "allow",
          "updatedInput": {
            "command": "npm run lint"
          }
        }
      }
    }
    ```

  </Tab>
</Tabs>

Pour des exemples étendus incluant la validation de commandes Bash, le filtrage de prompts et les scripts d'approbation automatique, consultez [Ce que vous pouvez automatiser](/fr/hooks-guide#what-you-can-automate) dans le guide et la [implémentation de référence du validateur de commandes Bash](https://github.com/anthropics/claude-code/blob/main/examples/hooks/bash_command_validator_example.py).

## Événements de hook

Chaque événement correspond à un point du cycle de vie de Claude Code où les hooks peuvent s'exécuter. Les sections ci-dessous sont ordonnées pour correspondre au cycle de vie : de la configuration de session à travers la boucle agentique jusqu'à la fin de session. Chaque section décrit quand l'événement se déclenche, quels matchers il supporte, l'entrée JSON qu'il reçoit et comment contrôler le comportement via la sortie.

### SessionStart

S'exécute lorsque Claude Code démarre une nouvelle session ou reprend une session existante. Utile pour charger le contexte de développement comme les problèmes existants ou les modifications récentes de votre codebase, ou pour configurer les variables d'environnement. Pour le contexte statique qui ne nécessite pas de script, utilisez [CLAUDE.md](/fr/memory) à la place.

SessionStart s'exécute à chaque session, donc gardez ces hooks rapides. Seuls les hooks `type: "command"` sont supportés.

La valeur du matcher correspond à la façon dont la session a été initiée :

| Matcher   | Quand il se déclenche                 |
| :-------- | :------------------------------------ |
| `startup` | Nouvelle session                      |
| `resume`  | `--resume`, `--continue` ou `/resume` |
| `clear`   | `/clear`                              |
| `compact` | Compaction automatique ou manuelle    |

#### Entrée SessionStart

En plus des [champs d'entrée communs](#common-input-fields), les hooks SessionStart reçoivent `source`, `model` et optionnellement `agent_type`. Le champ `source` indique comment la session a démarré : `"startup"` pour les nouvelles sessions, `"resume"` pour les sessions reprises, `"clear"` après `/clear` ou `"compact"` après compaction. Le champ `model` contient l'identifiant du modèle. Si vous démarrez Claude Code avec `claude --agent <name>`, un champ `agent_type` contient le nom de l'agent.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "SessionStart",
  "source": "startup",
  "model": "claude-sonnet-4-6"
}
```

#### Contrôle de décision SessionStart

Tout texte que votre script de hook imprime sur stdout est ajouté comme contexte pour Claude. En plus des [champs de sortie JSON](#json-output) disponibles pour tous les hooks, vous pouvez retourner ces champs spécifiques à l'événement :

| Champ               | Description                                                                           |
| :------------------ | :------------------------------------------------------------------------------------ |
| `additionalContext` | Chaîne ajoutée au contexte de Claude. Les valeurs de plusieurs hooks sont concaténées |

```json theme={null}
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "My additional context here"
  }
}
```

#### Persister les variables d'environnement

Les hooks SessionStart ont accès à la variable d'environnement `CLAUDE_ENV_FILE`, qui fournit un chemin de fichier où vous pouvez persister les variables d'environnement pour les commandes Bash suivantes.

Pour définir des variables d'environnement individuelles, écrivez des déclarations `export` dans `CLAUDE_ENV_FILE`. Utilisez l'ajout (`>>`) pour préserver les variables définies par d'autres hooks :

```bash theme={null}
#!/bin/bash

if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
  echo 'export DEBUG_LOG=true' >> "$CLAUDE_ENV_FILE"
  echo 'export PATH="$PATH:./node_modules/.bin"' >> "$CLAUDE_ENV_FILE"
fi

exit 0
```

Pour capturer tous les changements d'environnement à partir des commandes de configuration, comparez les variables exportées avant et après :

```bash theme={null}
#!/bin/bash

ENV_BEFORE=$(export -p | sort)

# Exécutez vos commandes de configuration qui modifient l'environnement
source ~/.nvm/nvm.sh
nvm use 20

if [ -n "$CLAUDE_ENV_FILE" ]; then
  ENV_AFTER=$(export -p | sort)
  comm -13 <(echo "$ENV_BEFORE") <(echo "$ENV_AFTER") >> "$CLAUDE_ENV_FILE"
fi

exit 0
```

Toutes les variables écrites dans ce fichier seront disponibles dans toutes les commandes Bash suivantes que Claude Code exécute pendant la session.

<Note>
  `CLAUDE_ENV_FILE` est disponible pour les hooks SessionStart, [CwdChanged](#cwdchanged) et [FileChanged](#filechanged). Les autres types de hooks n'ont pas accès à cette variable.
</Note>

### InstructionsLoaded

Se déclenche lorsqu'un fichier `CLAUDE.md` ou `.claude/rules/*.md` est chargé dans le contexte. Cet événement se déclenche au démarrage de la session pour les fichiers chargés avec impatience et à nouveau plus tard lorsque les fichiers sont chargés avec paresse, par exemple lorsque Claude accède à un sous-répertoire qui contient un `CLAUDE.md` imbriqué ou lorsque les règles conditionnelles avec le frontmatter `paths:` correspondent. Le hook ne supporte pas le blocage ou le contrôle de décision. Il s'exécute de manière asynchrone à des fins d'observabilité.

Le matcher s'exécute sur `load_reason`. Par exemple, utilisez `"matcher": "session_start"` pour se déclencher uniquement pour les fichiers chargés au démarrage de la session, ou `"matcher": "path_glob_match|nested_traversal"` pour se déclencher uniquement pour les chargements paresseux.

#### Entrée InstructionsLoaded

En plus des [champs d'entrée communs](#common-input-fields), les hooks InstructionsLoaded reçoivent ces champs :

| Champ               | Description                                                                                                                                                                                                                                         |
| :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file_path`         | Chemin absolu vers le fichier d'instructions qui a été chargé                                                                                                                                                                                       |
| `memory_type`       | Portée du fichier : `"User"`, `"Project"`, `"Local"` ou `"Managed"`                                                                                                                                                                                 |
| `load_reason`       | Pourquoi le fichier a été chargé : `"session_start"`, `"nested_traversal"`, `"path_glob_match"`, `"include"` ou `"compact"`. La valeur `"compact"` se déclenche lorsque les fichiers d'instructions sont rechargés après un événement de compaction |
| `globs`             | Modèles de glob de chemin du frontmatter `paths:` du fichier, le cas échéant. Présent uniquement pour les chargements `path_glob_match`                                                                                                             |
| `trigger_file_path` | Chemin vers le fichier dont l'accès a déclenché ce chargement, pour les chargements paresseux                                                                                                                                                       |
| `parent_file_path`  | Chemin vers le fichier d'instructions parent qui a inclus celui-ci, pour les chargements `include`                                                                                                                                                  |

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../transcript.jsonl",
  "cwd": "/Users/my-project",
  "hook_event_name": "InstructionsLoaded",
  "file_path": "/Users/my-project/CLAUDE.md",
  "memory_type": "Project",
  "load_reason": "session_start"
}
```

#### Contrôle de décision InstructionsLoaded

Les hooks InstructionsLoaded n'ont pas de contrôle de décision. Ils ne peuvent pas bloquer ou modifier le chargement des instructions. Utilisez cet événement pour la journalisation d'audit, le suivi de conformité ou l'observabilité.

### UserPromptSubmit

S'exécute lorsque l'utilisateur soumet un prompt, avant que Claude ne le traite. Cela vous permet d'ajouter du contexte supplémentaire basé sur le prompt/conversation, de valider les prompts ou de bloquer certains types de prompts.

#### Entrée UserPromptSubmit

En plus des [champs d'entrée communs](#common-input-fields), les hooks UserPromptSubmit reçoivent le champ `prompt` contenant le texte que l'utilisateur a soumis.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "Write a function to calculate the factorial of a number"
}
```

#### Contrôle de décision UserPromptSubmit

Les hooks `UserPromptSubmit` peuvent contrôler si un prompt utilisateur est traité et ajouter du contexte. Tous les [champs de sortie JSON](#json-output) sont disponibles.

Il y a deux façons d'ajouter du contexte à la conversation sur exit code 0 :

- **Stdout en texte brut** : tout texte non-JSON écrit sur stdout est ajouté comme contexte
- **JSON avec `additionalContext`** : utilisez le format JSON ci-dessous pour plus de contrôle. Le champ `additionalContext` est ajouté comme contexte

Le stdout brut est affiché comme sortie de hook dans la transcription. Le champ `additionalContext` est ajouté plus discrètement.

Pour bloquer un prompt, retournez un objet JSON avec `decision` défini à `"block"` :

| Champ               | Description                                                                                                    |
| :------------------ | :------------------------------------------------------------------------------------------------------------- |
| `decision`          | `"block"` empêche le prompt d'être traité et l'efface du contexte. Omettez pour autoriser le prompt à procéder |
| `reason`            | Affiché à l'utilisateur lorsque `decision` est `"block"`. Non ajouté au contexte                               |
| `additionalContext` | Chaîne ajoutée au contexte de Claude                                                                           |

```json theme={null}
{
  "decision": "block",
  "reason": "Explanation for decision",
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "My additional context here"
  }
}
```

<Note>
  Le format JSON n'est pas requis pour les cas simples. Pour ajouter du contexte, vous pouvez imprimer du texte brut sur stdout avec exit code 0. Utilisez JSON lorsque vous avez besoin de bloquer des prompts ou que vous voulez un contrôle plus structuré.
</Note>

### PreToolUse

S'exécute après que Claude crée les paramètres de l'outil et avant le traitement de l'appel d'outil. Correspond au nom de l'outil : `Bash`, `Edit`, `Write`, `Read`, `Glob`, `Grep`, `Agent`, `WebFetch`, `WebSearch` et tout [nom d'outil MCP](#match-mcp-tools).

Utilisez [Contrôle de décision PreToolUse](#pretooluse-decision-control) pour autoriser, refuser ou demander la permission d'utiliser l'outil.

#### Entrée PreToolUse

En plus des [champs d'entrée communs](#common-input-fields), les hooks PreToolUse reçoivent `tool_name`, `tool_input` et `tool_use_id`. Les champs `tool_input` dépendent de l'outil :

##### Bash

Exécute les commandes shell.

| Champ               | Type    | Exemple            | Description                                        |
| :------------------ | :------ | :----------------- | :------------------------------------------------- |
| `command`           | string  | `"npm test"`       | La commande shell à exécuter                       |
| `description`       | string  | `"Run test suite"` | Description optionnelle de ce que fait la commande |
| `timeout`           | number  | `120000`           | Délai d'expiration optionnel en millisecondes      |
| `run_in_background` | boolean | `false`            | Si la commande doit s'exécuter en arrière-plan     |

##### Write

Crée ou écrase un fichier.

| Champ       | Type   | Exemple               | Description                            |
| :---------- | :----- | :-------------------- | :------------------------------------- |
| `file_path` | string | `"/path/to/file.txt"` | Chemin absolu vers le fichier à écrire |
| `content`   | string | `"file content"`      | Contenu à écrire dans le fichier       |

##### Edit

Remplace une chaîne dans un fichier existant.

| Champ         | Type    | Exemple               | Description                                       |
| :------------ | :------ | :-------------------- | :------------------------------------------------ |
| `file_path`   | string  | `"/path/to/file.txt"` | Chemin absolu vers le fichier à éditer            |
| `old_string`  | string  | `"original text"`     | Texte à trouver et remplacer                      |
| `new_string`  | string  | `"replacement text"`  | Texte de remplacement                             |
| `replace_all` | boolean | `false`               | Si toutes les occurrences doivent être remplacées |

##### Read

Lit le contenu des fichiers.

| Champ       | Type   | Exemple               | Description                                                    |
| :---------- | :----- | :-------------------- | :------------------------------------------------------------- |
| `file_path` | string | `"/path/to/file.txt"` | Chemin absolu vers le fichier à lire                           |
| `offset`    | number | `10`                  | Numéro de ligne optionnel à partir duquel commencer la lecture |
| `limit`     | number | `50`                  | Nombre optionnel de lignes à lire                              |

##### Glob

Trouve les fichiers correspondant à un modèle glob.

| Champ     | Type   | Exemple          | Description                                                                    |
| :-------- | :----- | :--------------- | :----------------------------------------------------------------------------- |
| `pattern` | string | `"**/*.ts"`      | Modèle glob pour correspondre aux fichiers                                     |
| `path`    | string | `"/path/to/dir"` | Répertoire optionnel à rechercher. Par défaut le répertoire de travail courant |

##### Grep

Recherche le contenu des fichiers avec des expressions régulières.

| Champ         | Type    | Exemple          | Description                                                                         |
| :------------ | :------ | :--------------- | :---------------------------------------------------------------------------------- |
| `pattern`     | string  | `"TODO.*fix"`    | Modèle d'expression régulière à rechercher                                          |
| `path`        | string  | `"/path/to/dir"` | Fichier ou répertoire optionnel à rechercher                                        |
| `glob`        | string  | `"*.ts"`         | Modèle glob optionnel pour filtrer les fichiers                                     |
| `output_mode` | string  | `"content"`      | `"content"`, `"files_with_matches"` ou `"count"`. Par défaut `"files_with_matches"` |
| `-i`          | boolean | `true`           | Recherche insensible à la casse                                                     |
| `multiline`   | boolean | `false`          | Activer la correspondance multiligne                                                |

##### WebFetch

Récupère et traite le contenu web.

| Champ    | Type   | Exemple                       | Description                                   |
| :------- | :----- | :---------------------------- | :-------------------------------------------- |
| `url`    | string | `"https://example.com/api"`   | URL à partir de laquelle récupérer le contenu |
| `prompt` | string | `"Extract the API endpoints"` | Prompt à exécuter sur le contenu récupéré     |

##### WebSearch

Recherche sur le web.

| Champ             | Type   | Exemple                        | Description                                                  |
| :---------------- | :----- | :----------------------------- | :----------------------------------------------------------- |
| `query`           | string | `"react hooks best practices"` | Requête de recherche                                         |
| `allowed_domains` | array  | `["docs.example.com"]`         | Optionnel : inclure uniquement les résultats de ces domaines |
| `blocked_domains` | array  | `["spam.example.com"]`         | Optionnel : exclure les résultats de ces domaines            |

##### Agent

Lance un [subagent](/fr/sub-agents).

| Champ           | Type   | Exemple                    | Description                                                   |
| :-------------- | :----- | :------------------------- | :------------------------------------------------------------ |
| `prompt`        | string | `"Find all API endpoints"` | La tâche pour l'agent à effectuer                             |
| `description`   | string | `"Find API endpoints"`     | Description courte de la tâche                                |
| `subagent_type` | string | `"Explore"`                | Type d'agent spécialisé à utiliser                            |
| `model`         | string | `"sonnet"`                 | Alias de modèle optionnel pour remplacer la valeur par défaut |

#### Contrôle de décision PreToolUse

Les hooks `PreToolUse` peuvent contrôler si un appel d'outil procède. Contrairement aux autres hooks qui utilisent un champ `decision` au niveau supérieur, PreToolUse retourne sa décision à l'intérieur d'un objet `hookSpecificOutput`. Cela lui donne un contrôle plus riche : trois résultats (autoriser, refuser ou demander) plus la capacité de modifier l'entrée de l'outil avant l'exécution.

| Champ                      | Description                                                                                                                                                                                                                                         |
| :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `permissionDecision`       | `"allow"` contourne le système de permission, `"deny"` empêche l'appel d'outil, `"ask"` demande à l'utilisateur de confirmer. Les règles [Deny and ask](/fr/permissions#manage-permissions) s'appliquent toujours lorsqu'un hook retourne `"allow"` |
| `permissionDecisionReason` | Pour `"allow"` et `"ask"`, affiché à l'utilisateur mais pas à Claude. Pour `"deny"`, affiché à Claude                                                                                                                                               |
| `updatedInput`             | Modifie les paramètres d'entrée de l'outil avant l'exécution. Combinez avec `"allow"` pour approuver automatiquement ou `"ask"` pour montrer l'entrée modifiée à l'utilisateur                                                                      |
| `additionalContext`        | Chaîne ajoutée au contexte de Claude avant l'exécution de l'outil                                                                                                                                                                                   |

Lorsqu'un hook retourne `"ask"`, le dialogue de permission affiché à l'utilisateur inclut un libellé identifiant d'où provient le hook : par exemple, `[User]`, `[Project]`, `[Plugin]` ou `[Local]`. Cela aide les utilisateurs à comprendre quelle source de configuration demande une confirmation.

```json theme={null}
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "My reason here",
    "updatedInput": {
      "field_to_modify": "new value"
    },
    "additionalContext": "Current environment: production. Proceed with caution."
  }
}
```

<Note>
  PreToolUse utilisait auparavant les champs `decision` et `reason` au niveau supérieur, mais ceux-ci sont dépréciés pour cet événement. Utilisez `hookSpecificOutput.permissionDecision` et `hookSpecificOutput.permissionDecisionReason` à la place. Les valeurs dépréciées `"approve"` et `"block"` correspondent à `"allow"` et `"deny"` respectivement. Les autres événements comme PostToolUse et Stop continuent d'utiliser `decision` et `reason` au niveau supérieur comme format actuel.
</Note>

### PermissionRequest

S'exécute lorsque l'utilisateur est montré un dialogue de permission.
Utilisez [Contrôle de décision PermissionRequest](#permissionrequest-decision-control) pour autoriser ou refuser au nom de l'utilisateur.

Correspond au nom de l'outil, mêmes valeurs que PreToolUse.

#### Entrée PermissionRequest

Les hooks PermissionRequest reçoivent les champs `tool_name` et `tool_input` comme les hooks PreToolUse, mais sans `tool_use_id`. Un tableau optionnel `permission_suggestions` contient les options « toujours autoriser » que l'utilisateur verrait normalement dans le dialogue de permission. La différence est quand le hook se déclenche : les hooks PermissionRequest s'exécutent lorsqu'un dialogue de permission est sur le point d'être montré à l'utilisateur, tandis que les hooks PreToolUse s'exécutent avant l'exécution de l'outil indépendamment du statut de permission.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "PermissionRequest",
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf node_modules",
    "description": "Remove node_modules directory"
  },
  "permission_suggestions": [
    {
      "type": "addRules",
      "rules": [{ "toolName": "Bash", "ruleContent": "rm -rf node_modules" }],
      "behavior": "allow",
      "destination": "localSettings"
    }
  ]
}
```

#### Contrôle de décision PermissionRequest

Les hooks `PermissionRequest` peuvent autoriser ou refuser les demandes de permission. En plus des [champs de sortie JSON](#json-output) disponibles pour tous les hooks, votre script de hook peut retourner un objet `decision` avec ces champs spécifiques à l'événement :

| Champ                | Description                                                                                                                                                                                                        |
| :------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `behavior`           | `"allow"` accorde la permission, `"deny"` la refuse                                                                                                                                                                |
| `updatedInput`       | Pour `"allow"` uniquement : modifie les paramètres d'entrée de l'outil avant l'exécution                                                                                                                           |
| `updatedPermissions` | Pour `"allow"` uniquement : tableau d'[entrées de mise à jour de permission](#permission-update-entries) à appliquer, comme l'ajout d'une règle d'autorisation ou la modification du mode de permission de session |
| `message`            | Pour `"deny"` uniquement : indique à Claude pourquoi la permission a été refusée                                                                                                                                   |
| `interrupt`          | Pour `"deny"` uniquement : si `true`, arrête Claude                                                                                                                                                                |

```json theme={null}
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow",
      "updatedInput": {
        "command": "npm run lint"
      }
    }
  }
}
```

#### Entrées de mise à jour de permission

Le champ de sortie `updatedPermissions` et le champ d'[entrée `permission_suggestions`](#permissionrequest-input) utilisent tous deux le même tableau d'objets d'entrée. Chaque entrée a un `type` qui détermine ses autres champs, et une `destination` qui contrôle où la modification est écrite.

| `type`              | Champs                             | Effet                                                                                                                                                                                                |
| :------------------ | :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addRules`          | `rules`, `behavior`, `destination` | Ajoute des règles de permission. `rules` est un tableau d'objets `{toolName, ruleContent?}`. Omettez `ruleContent` pour correspondre à l'outil entier. `behavior` est `"allow"`, `"deny"` ou `"ask"` |
| `replaceRules`      | `rules`, `behavior`, `destination` | Remplace toutes les règles du `behavior` donné à la `destination` par les `rules` fournies                                                                                                           |
| `removeRules`       | `rules`, `behavior`, `destination` | Supprime les règles correspondantes du `behavior` donné                                                                                                                                              |
| `setMode`           | `mode`, `destination`              | Change le mode de permission. Les modes valides sont `default`, `acceptEdits`, `dontAsk`, `bypassPermissions` et `plan`                                                                              |
| `addDirectories`    | `directories`, `destination`       | Ajoute des répertoires de travail. `directories` est un tableau de chaînes de chemin                                                                                                                 |
| `removeDirectories` | `directories`, `destination`       | Supprime les répertoires de travail                                                                                                                                                                  |

Le champ `destination` sur chaque entrée détermine si la modification reste en mémoire ou persiste dans un fichier de paramètres.

| `destination`     | Écrit dans                                             |
| :---------------- | :----------------------------------------------------- |
| `session`         | en mémoire uniquement, supprimé à la fin de la session |
| `localSettings`   | `.claude/settings.local.json`                          |
| `projectSettings` | `.claude/settings.json`                                |
| `userSettings`    | `~/.claude/settings.json`                              |

Un hook peut renvoyer l'une des `permission_suggestions` qu'il a reçues comme sa propre sortie `updatedPermissions`, ce qui équivaut à l'utilisateur sélectionnant cette option « toujours autoriser » dans le dialogue.

### PostToolUse

S'exécute immédiatement après qu'un outil se termine avec succès.

Correspond au nom de l'outil, mêmes valeurs que PreToolUse.

#### Entrée PostToolUse

Les hooks `PostToolUse` se déclenchent après qu'un outil s'est déjà exécuté avec succès. L'entrée inclut à la fois `tool_input`, les arguments envoyés à l'outil, et `tool_response`, le résultat qu'il a retourné. Le schéma exact pour les deux dépend de l'outil.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "content": "file content"
  },
  "tool_response": {
    "filePath": "/path/to/file.txt",
    "success": true
  },
  "tool_use_id": "toolu_01ABC123..."
}
```

#### Contrôle de décision PostToolUse

Les hooks `PostToolUse` peuvent fournir des commentaires à Claude après l'exécution de l'outil. En plus des [champs de sortie JSON](#json-output) disponibles pour tous les hooks, votre script de hook peut retourner ces champs spécifiques à l'événement :

| Champ                  | Description                                                                                              |
| :--------------------- | :------------------------------------------------------------------------------------------------------- |
| `decision`             | `"block"` demande à Claude avec la `reason`. Omettez pour autoriser l'action à procéder                  |
| `reason`               | Explication affichée à Claude lorsque `decision` est `"block"`                                           |
| `additionalContext`    | Contexte supplémentaire pour Claude à considérer                                                         |
| `updatedMCPToolOutput` | Pour les [outils MCP](#match-mcp-tools) uniquement : remplace la sortie de l'outil par la valeur fournie |

```json theme={null}
{
  "decision": "block",
  "reason": "Explanation for decision",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Additional information for Claude"
  }
}
```

### PostToolUseFailure

S'exécute lorsqu'une exécution d'outil échoue. Cet événement se déclenche pour les appels d'outil qui lèvent des erreurs ou retournent des résultats d'échec. Utilisez ceci pour enregistrer les défaillances, envoyer des alertes ou fournir des commentaires correctifs à Claude.

Correspond au nom de l'outil, mêmes valeurs que PreToolUse.

#### Entrée PostToolUseFailure

Les hooks PostToolUseFailure reçoivent les mêmes champs `tool_name` et `tool_input` que PostToolUse, ainsi que les informations d'erreur comme champs au niveau supérieur :

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "PostToolUseFailure",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test",
    "description": "Run test suite"
  },
  "tool_use_id": "toolu_01ABC123...",
  "error": "Command exited with non-zero status code 1",
  "is_interrupt": false
}
```

| Champ          | Description                                                                         |
| :------------- | :---------------------------------------------------------------------------------- |
| `error`        | Chaîne décrivant ce qui s'est mal passé                                             |
| `is_interrupt` | Booléen optionnel indiquant si l'échec a été causé par une interruption utilisateur |

#### Contrôle de décision PostToolUseFailure

Les hooks `PostToolUseFailure` peuvent fournir du contexte à Claude après l'échec d'un outil. En plus des [champs de sortie JSON](#json-output) disponibles pour tous les hooks, votre script de hook peut retourner ces champs spécifiques à l'événement :

| Champ               | Description                                                            |
| :------------------ | :--------------------------------------------------------------------- |
| `additionalContext` | Contexte supplémentaire pour Claude à considérer aux côtés de l'erreur |

```json theme={null}
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUseFailure",
    "additionalContext": "Additional information about the failure for Claude"
  }
}
```

### Notification

S'exécute lorsque Claude Code envoie des notifications. Correspond au type de notification : `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`. Omettez le matcher pour exécuter les hooks pour tous les types de notification.

Utilisez des matchers séparés pour exécuter différents gestionnaires selon le type de notification. Cette configuration déclenche un script d'alerte spécifique à la permission lorsque Claude a besoin d'approbation de permission et une notification différente lorsque Claude a été inactif :

```json theme={null}
{
  "hooks": {
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/permission-alert.sh"
          }
        ]
      },
      {
        "matcher": "idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/idle-notification.sh"
          }
        ]
      }
    ]
  }
}
```

#### Entrée Notification

En plus des [champs d'entrée communs](#common-input-fields), les hooks Notification reçoivent `message` avec le texte de notification, un `title` optionnel et `notification_type` indiquant quel type s'est déclenché.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "Notification",
  "message": "Claude needs your permission to use Bash",
  "title": "Permission needed",
  "notification_type": "permission_prompt"
}
```

Les hooks Notification ne peuvent pas bloquer ou modifier les notifications. En plus des [champs de sortie JSON](#json-output) disponibles pour tous les hooks, vous pouvez retourner `additionalContext` pour ajouter du contexte à la conversation :

| Champ               | Description                          |
| :------------------ | :----------------------------------- |
| `additionalContext` | Chaîne ajoutée au contexte de Claude |

### SubagentStart

S'exécute lorsqu'un subagent Claude Code est lancé via l'outil Agent. Supporte les matchers pour filtrer par nom de type d'agent (agents intégrés comme `Bash`, `Explore`, `Plan` ou noms d'agents personnalisés de `.claude/agents/`).

#### Entrée SubagentStart

En plus des [champs d'entrée communs](#common-input-fields), les hooks SubagentStart reçoivent `agent_id` avec l'identifiant unique du subagent et `agent_type` avec le nom de l'agent (agents intégrés comme `"Bash"`, `"Explore"`, `"Plan"` ou noms d'agents personnalisés).

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "SubagentStart",
  "agent_id": "agent-abc123",
  "agent_type": "Explore"
}
```

Les hooks SubagentStart ne peuvent pas bloquer la création de subagent, mais ils peuvent injecter du contexte dans le subagent. En plus des [champs de sortie JSON](#json-output) disponibles pour tous les hooks, vous pouvez retourner :

| Champ               | Description                            |
| :------------------ | :------------------------------------- |
| `additionalContext` | Chaîne ajoutée au contexte du subagent |

```json theme={null}
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStart",
    "additionalContext": "Follow security guidelines for this task"
  }
}
```

### SubagentStop

S'exécute lorsqu'un subagent Claude Code a terminé sa réponse. Correspond au type d'agent, mêmes valeurs que SubagentStart.

#### Entrée SubagentStop

En plus des [champs d'entrée communs](#common-input-fields), les hooks SubagentStop reçoivent `stop_hook_active`, `agent_id`, `agent_type`, `agent_transcript_path` et `last_assistant_message`. Le champ `agent_type` est la valeur utilisée pour le filtrage du matcher. Le `transcript_path` est la transcription de la session principale, tandis que `agent_transcript_path` est la propre transcription du subagent stockée dans un dossier `subagents/` imbriqué. Le champ `last_assistant_message` contient le contenu textuel de la réponse finale du subagent, donc les hooks peuvent y accéder sans analyser le fichier de transcription.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../abc123.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "SubagentStop",
  "stop_hook_active": false,
  "agent_id": "def456",
  "agent_type": "Explore",
  "agent_transcript_path": "~/.claude/projects/.../abc123/subagents/agent-def456.jsonl",
  "last_assistant_message": "Analysis complete. Found 3 potential issues..."
}
```

Les hooks SubagentStop utilisent le même format de contrôle de décision que les [hooks Stop](#stop-decision-control).

### Stop

S'exécute lorsque l'agent Claude Code principal a terminé sa réponse. Ne s'exécute pas si l'arrêt s'est produit en raison d'une interruption utilisateur. Les erreurs API déclenchent [StopFailure](#stopfailure) à la place.

#### Entrée Stop

En plus des [champs d'entrée communs](#common-input-fields), les hooks Stop reçoivent `stop_hook_active` et `last_assistant_message`. Le champ `stop_hook_active` est `true` lorsque Claude Code continue déjà en raison d'un hook stop. Vérifiez cette valeur ou traitez la transcription pour empêcher Claude Code de s'exécuter indéfiniment. Le champ `last_assistant_message` contient le contenu textuel de la réponse finale de Claude, donc les hooks peuvent y accéder sans analyser le fichier de transcription.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "Stop",
  "stop_hook_active": true,
  "last_assistant_message": "I've completed the refactoring. Here's a summary..."
}
```

#### Contrôle de décision Stop

Les hooks `Stop` et `SubagentStop` peuvent contrôler si Claude continue. En plus des [champs de sortie JSON](#json-output) disponibles pour tous les hooks, votre script de hook peut retourner ces champs spécifiques à l'événement :

| Champ      | Description                                                                          |
| :--------- | :----------------------------------------------------------------------------------- |
| `decision` | `"block"` empêche Claude de s'arrêter. Omettez pour autoriser Claude à s'arrêter     |
| `reason`   | Requis lorsque `decision` est `"block"`. Indique à Claude pourquoi il doit continuer |

```json theme={null}
{
  "decision": "block",
  "reason": "Must be provided when Claude is blocked from stopping"
}
```

### StopFailure

S'exécute à la place de [Stop](#stop) lorsque le tour se termine en raison d'une erreur API. La sortie et le code de sortie sont ignorés. Utilisez ceci pour enregistrer les défaillances, envoyer des alertes ou prendre des mesures de récupération lorsque Claude ne peut pas terminer une réponse en raison de limites de débit, de problèmes d'authentification ou d'autres erreurs API.

#### Entrée StopFailure

En plus des [champs d'entrée communs](#common-input-fields), les hooks StopFailure reçoivent `error`, optionnellement `error_details` et optionnellement `last_assistant_message`. Le champ `error` identifie le type d'erreur et est utilisé pour le filtrage du matcher.

| Champ                    | Description                                                                                                                                                                                                                                                          |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `error`                  | Type d'erreur : `rate_limit`, `authentication_failed`, `billing_error`, `invalid_request`, `server_error`, `max_output_tokens` ou `unknown`                                                                                                                          |
| `error_details`          | Détails supplémentaires sur l'erreur, le cas échéant                                                                                                                                                                                                                 |
| `last_assistant_message` | Le texte d'erreur rendu affiché dans la conversation. Contrairement à `Stop` et `SubagentStop`, où ce champ contient la sortie conversationnelle de Claude, pour `StopFailure` il contient la chaîne d'erreur API elle-même, comme `"API Error: Rate limit reached"` |

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "StopFailure",
  "error": "rate_limit",
  "error_details": "429 Too Many Requests",
  "last_assistant_message": "API Error: Rate limit reached"
}
```

Les hooks StopFailure n'ont pas de contrôle de décision. Ils s'exécutent à des fins de notification et de journalisation uniquement.

### TeammateIdle

S'exécute lorsqu'un coéquipier d'une [équipe d'agents](/fr/agent-teams) est sur le point de devenir inactif après avoir terminé son tour. Utilisez ceci pour appliquer des portes de qualité avant qu'un coéquipier ne cesse de travailler, comme exiger des vérifications de lint réussies ou vérifier que les fichiers de sortie existent.

Lorsqu'un hook `TeammateIdle` quitte avec le code 2, le coéquipier reçoit le message stderr comme commentaire et continue de travailler au lieu de devenir inactif. Pour arrêter complètement le coéquipier au lieu de le relancer, retournez JSON avec `{"continue": false, "stopReason": "..."}`. Les hooks TeammateIdle ne supportent pas les matchers et se déclenchent à chaque occurrence.

#### Entrée TeammateIdle

En plus des [champs d'entrée communs](#common-input-fields), les hooks TeammateIdle reçoivent `teammate_name` et `team_name`.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "TeammateIdle",
  "teammate_name": "researcher",
  "team_name": "my-project"
}
```

| Champ           | Description                                               |
| :-------------- | :-------------------------------------------------------- |
| `teammate_name` | Nom du coéquipier qui est sur le point de devenir inactif |
| `team_name`     | Nom de l'équipe                                           |

#### Contrôle de décision TeammateIdle

Les hooks TeammateIdle supportent deux façons de contrôler le comportement du coéquipier :

- **Code de sortie 2** : le coéquipier reçoit le message stderr comme commentaire et continue de travailler au lieu de devenir inactif.
- **JSON `{"continue": false, "stopReason": "..."}`** : arrête complètement le coéquipier, correspondant au comportement du hook `Stop`. Le `stopReason` est affiché à l'utilisateur.

Cet exemple vérifie qu'un artefact de construction existe avant d'autoriser un coéquipier à devenir inactif :

```bash theme={null}
#!/bin/bash

if [ ! -f "./dist/output.js" ]; then
  echo "Build artifact missing. Run the build before stopping." >&2
  exit 2
fi

exit 0
```

### TaskCompleted

S'exécute lorsqu'une tâche est marquée comme complétée. Cela se déclenche dans deux situations : lorsqu'un agent marque explicitement une tâche comme complétée via l'outil TaskUpdate, ou lorsqu'un coéquipier d'une [équipe d'agents](/fr/agent-teams) termine son tour avec des tâches en cours. Utilisez ceci pour appliquer les critères d'achèvement comme passer les tests ou les vérifications de lint avant qu'une tâche ne puisse se fermer.

Lorsqu'un hook `TaskCompleted` quitte avec le code 2, la tâche n'est pas marquée comme complétée et le message stderr est renvoyé au modèle comme commentaire. Pour arrêter complètement le coéquipier au lieu de le relancer, retournez JSON avec `{"continue": false, "stopReason": "..."}`. Les hooks TaskCompleted ne supportent pas les matchers et se déclenchent à chaque occurrence.

#### Entrée TaskCompleted

En plus des [champs d'entrée communs](#common-input-fields), les hooks TaskCompleted reçoivent `task_id`, `task_subject` et optionnellement `task_description`, `teammate_name` et `team_name`.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "TaskCompleted",
  "task_id": "task-001",
  "task_subject": "Implement user authentication",
  "task_description": "Add login and signup endpoints",
  "teammate_name": "implementer",
  "team_name": "my-project"
}
```

| Champ              | Description                                             |
| :----------------- | :------------------------------------------------------ |
| `task_id`          | Identifiant de la tâche en cours de réalisation         |
| `task_subject`     | Titre de la tâche                                       |
| `task_description` | Description détaillée de la tâche. Peut être absent     |
| `teammate_name`    | Nom du coéquipier complétant la tâche. Peut être absent |
| `team_name`        | Nom de l'équipe. Peut être absent                       |

#### Contrôle de décision TaskCompleted

Les hooks TaskCompleted supportent deux façons de contrôler l'achèvement de la tâche :

- **Code de sortie 2** : la tâche n'est pas marquée comme complétée et le message stderr est renvoyé au modèle comme commentaire.
- **JSON `{"continue": false, "stopReason": "..."}`** : arrête complètement le coéquipier, correspondant au comportement du hook `Stop`. Le `stopReason` est affiché à l'utilisateur.

Cet exemple exécute les tests et bloque l'achèvement de la tâche s'ils échouent :

```bash theme={null}
#!/bin/bash
INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject')

# Exécutez la suite de tests
if ! npm test 2>&1; then
  echo "Tests not passing. Fix failing tests before completing: $TASK_SUBJECT" >&2
  exit 2
fi

exit 0
```

### ConfigChange

S'exécute lorsqu'un fichier de configuration change pendant une session. Utilisez ceci pour auditer les modifications de paramètres, appliquer les politiques de sécurité ou bloquer les modifications non autorisées aux fichiers de configuration.

Les hooks ConfigChange se déclenchent pour les modifications des fichiers de paramètres, les paramètres de politique gérée et les fichiers de skill. Le champ `source` dans l'entrée vous indique quel type de configuration a changé, et le champ optionnel `file_path` fournit le chemin vers le fichier modifié.

Le matcher filtre sur la source de configuration :

| Matcher            | Quand il se déclenche                             |
| :----------------- | :------------------------------------------------ |
| `user_settings`    | `~/.claude/settings.json` change                  |
| `project_settings` | `.claude/settings.json` change                    |
| `local_settings`   | `.claude/settings.local.json` change              |
| `policy_settings`  | Les paramètres de politique gérée changent        |
| `skills`           | Un fichier de skill dans `.claude/skills/` change |

Cet exemple enregistre toutes les modifications de configuration pour l'audit de sécurité :

```json theme={null}
{
  "hooks": {
    "ConfigChange": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/audit-config-change.sh"
          }
        ]
      }
    ]
  }
}
```

#### Entrée ConfigChange

En plus des [champs d'entrée communs](#common-input-fields), les hooks ConfigChange reçoivent `source` et optionnellement `file_path`. Le champ `source` indique quel type de configuration a changé, et `file_path` fournit le chemin vers le fichier spécifique qui a été modifié.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "ConfigChange",
  "source": "project_settings",
  "file_path": "/Users/.../my-project/.claude/settings.json"
}
```

#### Contrôle de décision ConfigChange

Les hooks ConfigChange peuvent bloquer les modifications de configuration de prendre effet. Utilisez le code de sortie 2 ou une `decision` JSON pour empêcher la modification. Lorsqu'elle est bloquée, les nouveaux paramètres ne sont pas appliqués à la session en cours d'exécution.

| Champ      | Description                                                                                                 |
| :--------- | :---------------------------------------------------------------------------------------------------------- |
| `decision` | `"block"` empêche la modification de configuration d'être appliquée. Omettez pour autoriser la modification |
| `reason`   | Explication affichée à l'utilisateur lorsque `decision` est `"block"`                                       |

```json theme={null}
{
  "decision": "block",
  "reason": "Configuration changes to project settings require admin approval"
}
```

Les modifications `policy_settings` ne peuvent pas être bloquées. Les hooks se déclenchent toujours pour les sources `policy_settings`, vous pouvez donc les utiliser pour la journalisation d'audit, mais toute décision de blocage est ignorée. Cela garantit que les paramètres gérés par l'entreprise prennent toujours effet.

### CwdChanged

S'exécute lorsque le répertoire de travail change pendant une session, par exemple lorsque Claude exécute une commande `cd`. Utilisez ceci pour réagir aux changements de répertoire : recharger les variables d'environnement, activer les chaînes d'outils spécifiques au projet ou exécuter les scripts de configuration automatiquement. S'associe avec [FileChanged](#filechanged) pour les outils comme [direnv](https://direnv.net/) qui gèrent l'environnement par répertoire.

Les hooks CwdChanged ont accès à `CLAUDE_ENV_FILE`. Les variables écrites dans ce fichier persistent dans les commandes Bash suivantes pour la session, tout comme dans les [hooks SessionStart](#persist-environment-variables). Seuls les hooks `type: "command"` sont supportés.

CwdChanged ne supporte pas les matchers et se déclenche à chaque changement de répertoire.

#### Entrée CwdChanged

En plus des [champs d'entrée communs](#common-input-fields), les hooks CwdChanged reçoivent `old_cwd` et `new_cwd`.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../transcript.jsonl",
  "cwd": "/Users/my-project/src",
  "hook_event_name": "CwdChanged",
  "old_cwd": "/Users/my-project",
  "new_cwd": "/Users/my-project/src"
}
```

#### Sortie CwdChanged

En plus des [champs de sortie JSON](#json-output) disponibles pour tous les hooks, les hooks CwdChanged peuvent retourner `watchPaths` pour définir dynamiquement quels chemins de fichiers [FileChanged](#filechanged) surveille :

| Champ        | Description                                                                                                                                                                                                                                                                   |
| :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `watchPaths` | Tableau de chemins absolus. Remplace la liste de surveillance dynamique actuelle (les chemins de votre configuration `matcher` sont toujours surveillés). Retourner un tableau vide efface la liste dynamique, ce qui est typique lors de l'entrée dans un nouveau répertoire |

Les hooks CwdChanged n'ont pas de contrôle de décision. Ils ne peuvent pas bloquer le changement de répertoire.

### FileChanged

S'exécute lorsqu'un fichier surveillé change sur le disque. Le champ `matcher` dans votre configuration de hook contrôle quels noms de fichiers surveiller : c'est une liste séparée par des pipes de basenames (noms de fichiers sans chemins de répertoire, par exemple `".envrc|.env"`). La même valeur `matcher` est également utilisée pour filtrer quels hooks s'exécutent lorsqu'un fichier change, en correspondant au basename du fichier modifié. Utile pour recharger les variables d'environnement lorsque les fichiers de configuration du projet sont modifiés.

Les hooks FileChanged ont accès à `CLAUDE_ENV_FILE`. Les variables écrites dans ce fichier persistent dans les commandes Bash suivantes pour la session, tout comme dans les [hooks SessionStart](#persist-environment-variables). Seuls les hooks `type: "command"` sont supportés.

#### Entrée FileChanged

En plus des [champs d'entrée communs](#common-input-fields), les hooks FileChanged reçoivent `file_path` et `event`.

| Champ       | Description                                                                                                |
| :---------- | :--------------------------------------------------------------------------------------------------------- |
| `file_path` | Chemin absolu vers le fichier qui a changé                                                                 |
| `event`     | Ce qui s'est passé : `"change"` (fichier modifié), `"add"` (fichier créé) ou `"unlink"` (fichier supprimé) |

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../transcript.jsonl",
  "cwd": "/Users/my-project",
  "hook_event_name": "FileChanged",
  "file_path": "/Users/my-project/.envrc",
  "event": "change"
}
```

#### Sortie FileChanged

En plus des [champs de sortie JSON](#json-output) disponibles pour tous les hooks, les hooks FileChanged peuvent retourner `watchPaths` pour mettre à jour dynamiquement quels chemins de fichiers sont surveillés :

| Champ        | Description                                                                                                                                                                                                                                                                            |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `watchPaths` | Tableau de chemins absolus. Remplace la liste de surveillance dynamique actuelle (les chemins de votre configuration `matcher` sont toujours surveillés). Utilisez ceci lorsque votre script de hook découvre des fichiers supplémentaires à surveiller en fonction du fichier modifié |

Les hooks FileChanged n'ont pas de contrôle de décision. Ils ne peuvent pas bloquer le changement de fichier de se produire.

### WorktreeCreate

Lorsque vous exécutez `claude --worktree` ou qu'un [subagent utilise `isolation: "worktree"`](/fr/sub-agents#choose-the-subagent-scope), Claude Code crée une copie de travail isolée en utilisant `git worktree`. Si vous configurez un hook WorktreeCreate, il remplace le comportement git par défaut, vous permettant d'utiliser un système de contrôle de version différent comme SVN, Perforce ou Mercurial.

Le hook doit imprimer le chemin absolu du répertoire du worktree créé sur stdout. Claude Code utilise ce chemin comme répertoire de travail pour la session isolée.

Cet exemple crée une copie de travail SVN et imprime le chemin pour que Claude Code l'utilise. Remplacez l'URL du référentiel par la vôtre :

```json theme={null}
{
  "hooks": {
    "WorktreeCreate": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'NAME=$(jq -r .name); DIR=\"$HOME/.claude/worktrees/$NAME\"; svn checkout https://svn.example.com/repo/trunk \"$DIR\" >&2 && echo \"$DIR\"'"
          }
        ]
      }
    ]
  }
}
```

Le hook lit le `name` du worktree depuis l'entrée JSON sur stdin, extrait une copie fraîche dans un nouveau répertoire et imprime le chemin du répertoire. Le `echo` sur la dernière ligne est ce que Claude Code lit comme chemin du worktree. Redirigez toute autre sortie vers stderr afin qu'elle n'interfère pas avec le chemin.

#### Entrée WorktreeCreate

En plus des [champs d'entrée communs](#common-input-fields), les hooks WorktreeCreate reçoivent le champ `name`. C'est un identifiant slug pour le nouveau worktree, soit spécifié par l'utilisateur, soit généré automatiquement (par exemple, `bold-oak-a3f2`).

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "WorktreeCreate",
  "name": "feature-auth"
}
```

#### Sortie WorktreeCreate

Le hook doit imprimer le chemin absolu du répertoire du worktree créé sur stdout. Si le hook échoue ou ne produit aucune sortie, la création du worktree échoue avec une erreur.

Les hooks WorktreeCreate n'utilisent pas le modèle de décision autoriser/bloquer standard. Au lieu de cela, le succès ou l'échec du hook détermine le résultat. Seuls les hooks `type: "command"` sont supportés.

### WorktreeRemove

La contrepartie de nettoyage de [WorktreeCreate](#worktreecreate). Ce hook se déclenche lorsqu'un worktree est en cours de suppression, soit lorsque vous quittez une session `--worktree` et choisissez de la supprimer, soit lorsqu'un subagent avec `isolation: "worktree"` se termine. Pour les worktrees basés sur git, Claude gère le nettoyage automatiquement avec `git worktree remove`. Si vous avez configuré un hook WorktreeCreate pour un système de contrôle de version non-git, associez-le à un hook WorktreeRemove pour gérer le nettoyage. Sans lui, le répertoire du worktree est laissé sur le disque.

Claude Code transmet le chemin que WorktreeCreate a imprimé sur stdout comme `worktree_path` dans l'entrée du hook. Cet exemple lit ce chemin et supprime le répertoire :

```json theme={null}
{
  "hooks": {
    "WorktreeRemove": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'jq -r .worktree_path | xargs rm -rf'"
          }
        ]
      }
    ]
  }
}
```

#### Entrée WorktreeRemove

En plus des [champs d'entrée communs](#common-input-fields), les hooks WorktreeRemove reçoivent le champ `worktree_path`, qui est le chemin absolu du worktree en cours de suppression.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "WorktreeRemove",
  "worktree_path": "/Users/.../my-project/.claude/worktrees/feature-auth"
}
```

Les hooks WorktreeRemove n'ont pas de contrôle de décision. Ils ne peuvent pas bloquer la suppression du worktree mais peuvent effectuer des tâches de nettoyage comme supprimer l'état du contrôle de version ou archiver les modifications. Les défaillances des hooks sont enregistrées en mode debug uniquement. Seuls les hooks `type: "command"` sont supportés.

### PreCompact

S'exécute avant que Claude Code ne soit sur le point d'exécuter une opération de compaction.

La valeur du matcher indique si la compaction a été déclenchée manuellement ou automatiquement :

| Matcher  | Quand il se déclenche                                            |
| :------- | :--------------------------------------------------------------- |
| `manual` | `/compact`                                                       |
| `auto`   | Compaction automatique lorsque la fenêtre de contexte est pleine |

#### Entrée PreCompact

En plus des [champs d'entrée communs](#common-input-fields), les hooks PreCompact reçoivent `trigger` et `custom_instructions`. Pour `manual`, `custom_instructions` contient ce que l'utilisateur transmet dans `/compact`. Pour `auto`, `custom_instructions` est vide.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "PreCompact",
  "trigger": "manual",
  "custom_instructions": ""
}
```

### PostCompact

S'exécute après que Claude Code complète une opération de compaction. Utilisez cet événement pour réagir au nouvel état compacté, par exemple pour enregistrer le résumé généré ou mettre à jour l'état externe.

Les mêmes valeurs de matcher s'appliquent que pour `PreCompact` :

| Matcher  | Quand il se déclenche                                                  |
| :------- | :--------------------------------------------------------------------- |
| `manual` | Après `/compact`                                                       |
| `auto`   | Après compaction automatique lorsque la fenêtre de contexte est pleine |

#### Entrée PostCompact

En plus des [champs d'entrée communs](#common-input-fields), les hooks PostCompact reçoivent `trigger` et `compact_summary`. Le champ `compact_summary` contient le résumé de conversation généré par l'opération de compaction.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "PostCompact",
  "trigger": "manual",
  "compact_summary": "Summary of the compacted conversation..."
}
```

Les hooks PostCompact n'ont pas de contrôle de décision. Ils ne peuvent pas affecter le résultat de la compaction mais peuvent effectuer des tâches de suivi.

### SessionEnd

S'exécute lorsqu'une session Claude Code se termine. Utile pour les tâches de nettoyage, la journalisation des statistiques de session ou l'enregistrement de l'état de session. Supporte les matchers pour filtrer par raison de sortie.

Le champ `reason` dans l'entrée du hook indique pourquoi la session s'est terminée :

| Raison                        | Description                                                         |
| :---------------------------- | :------------------------------------------------------------------ |
| `clear`                       | Session effacée avec la commande `/clear`                           |
| `resume`                      | Session basculée via `/resume` interactif                           |
| `logout`                      | L'utilisateur s'est déconnecté                                      |
| `prompt_input_exit`           | L'utilisateur a quitté pendant que l'entrée du prompt était visible |
| `bypass_permissions_disabled` | Le mode de permissions de contournement a été désactivé             |
| `other`                       | Autres raisons de sortie                                            |

#### Entrée SessionEnd

En plus des [champs d'entrée communs](#common-input-fields), les hooks SessionEnd reçoivent un champ `reason` indiquant pourquoi la session s'est terminée. Consultez le [tableau des raisons](#sessionend) ci-dessus pour toutes les valeurs.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "SessionEnd",
  "reason": "other"
}
```

Les hooks SessionEnd n'ont pas de contrôle de décision. Ils ne peuvent pas bloquer la terminaison de session mais peuvent effectuer des tâches de nettoyage.

Les hooks SessionEnd ont un délai d'expiration par défaut de 1,5 secondes. Cela s'applique à la sortie de session, à `/clear` et au basculement de sessions via `/resume` interactif. Si vos hooks ont besoin de plus de temps, définissez la variable d'environnement `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` à une valeur plus élevée en millisecondes. Tout paramètre `timeout` par hook est également limité par cette valeur.

```bash theme={null}
CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS=5000 claude
```

### Elicitation

S'exécute lorsqu'un serveur MCP demande une entrée utilisateur en milieu de tâche. Par défaut, Claude Code affiche un dialogue interactif pour que l'utilisateur réponde. Les hooks peuvent intercepter cette demande et répondre par programmation, en ignorant complètement le dialogue.

Le champ matcher correspond au nom du serveur MCP.

#### Entrée Elicitation

En plus des [champs d'entrée communs](#common-input-fields), les hooks Elicitation reçoivent `mcp_server_name`, `message` et les champs optionnels `mode`, `url`, `elicitation_id` et `requested_schema`.

Pour l'élicitation en mode formulaire (le cas le plus courant) :

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "Elicitation",
  "mcp_server_name": "my-mcp-server",
  "message": "Please provide your credentials",
  "mode": "form",
  "requested_schema": {
    "type": "object",
    "properties": {
      "username": { "type": "string", "title": "Username" }
    }
  }
}
```

Pour l'élicitation en mode URL (authentification basée sur navigateur) :

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "Elicitation",
  "mcp_server_name": "my-mcp-server",
  "message": "Please authenticate",
  "mode": "url",
  "url": "https://auth.example.com/login"
}
```

#### Sortie Elicitation

Pour répondre par programmation sans afficher le dialogue, retournez un objet JSON avec `hookSpecificOutput` :

```json theme={null}
{
  "hookSpecificOutput": {
    "hookEventName": "Elicitation",
    "action": "accept",
    "content": {
      "username": "alice"
    }
  }
}
```

| Champ     | Valeurs                       | Description                                                                                    |
| :-------- | :---------------------------- | :--------------------------------------------------------------------------------------------- |
| `action`  | `accept`, `decline`, `cancel` | Si accepter, refuser ou annuler la demande                                                     |
| `content` | object                        | Valeurs des champs de formulaire à soumettre. Utilisé uniquement lorsque `action` est `accept` |

Le code de sortie 2 refuse l'élicitation et affiche stderr à l'utilisateur.

### ElicitationResult

S'exécute après qu'un utilisateur répond à une élicitation MCP. Les hooks peuvent observer, modifier ou bloquer la réponse avant qu'elle ne soit renvoyée au serveur MCP.

Le champ matcher correspond au nom du serveur MCP.

#### Entrée ElicitationResult

En plus des [champs d'entrée communs](#common-input-fields), les hooks ElicitationResult reçoivent `mcp_server_name`, `action` et les champs optionnels `mode`, `elicitation_id` et `content`.

```json theme={null}
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "ElicitationResult",
  "mcp_server_name": "my-mcp-server",
  "action": "accept",
  "content": { "username": "alice" },
  "mode": "form",
  "elicitation_id": "elicit-123"
}
```

#### Sortie ElicitationResult

Pour remplacer la réponse de l'utilisateur, retournez un objet JSON avec `hookSpecificOutput` :

```json theme={null}
{
  "hookSpecificOutput": {
    "hookEventName": "ElicitationResult",
    "action": "decline",
    "content": {}
  }
}
```

| Champ     | Valeurs                       | Description                                                                                          |
| :-------- | :---------------------------- | :--------------------------------------------------------------------------------------------------- |
| `action`  | `accept`, `decline`, `cancel` | Remplace l'action de l'utilisateur                                                                   |
| `content` | object                        | Remplace les valeurs des champs de formulaire. Significatif uniquement lorsque `action` est `accept` |

Le code de sortie 2 bloque la réponse, changeant l'action effective en `decline`.

## Hooks basés sur des prompts

En plus des hooks de commande et HTTP, Claude Code supporte les hooks basés sur des prompts (`type: "prompt"`) qui utilisent un LLM pour évaluer s'il faut autoriser ou bloquer une action, et les hooks d'agent (`type: "agent"`) qui lancent un vérificateur agentique avec accès aux outils. Tous les événements ne supportent pas tous les types de hooks.

Les événements qui supportent les quatre types de hooks (`command`, `http`, `prompt` et `agent`) :

- `PermissionRequest`
- `PostToolUse`
- `PostToolUseFailure`
- `PreToolUse`
- `Stop`
- `SubagentStop`
- `TaskCompleted`
- `UserPromptSubmit`

Les événements qui ne supportent que les hooks `type: "command"` :

- `ConfigChange`
- `CwdChanged`
- `Elicitation`
- `ElicitationResult`
- `FileChanged`
- `InstructionsLoaded`
- `Notification`
- `PostCompact`
- `PreCompact`
- `SessionEnd`
- `SessionStart`
- `StopFailure`
- `SubagentStart`
- `TeammateIdle`
- `WorktreeCreate`
- `WorktreeRemove`

### Comment fonctionnent les hooks basés sur des prompts

Au lieu d'exécuter une commande Bash, les hooks basés sur des prompts :

1. Envoient l'entrée du hook et votre prompt à un modèle Claude, Haiku par défaut
2. Le LLM répond avec JSON structuré contenant une décision
3. Claude Code traite automatiquement la décision

### Configuration des hooks de prompt

Définissez `type` à `"prompt"` et fournissez une chaîne `prompt` au lieu d'une `command`. Utilisez le placeholder `$ARGUMENTS` pour injecter les données d'entrée JSON du hook dans votre texte de prompt. Claude Code envoie le prompt combiné et l'entrée à un modèle Claude rapide, qui retourne une décision JSON.

Ce hook `Stop` demande au LLM d'évaluer si Claude doit s'arrêter :

```json theme={null}
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Evaluate if Claude should stop: $ARGUMENTS. Check if all tasks are complete."
          }
        ]
      }
    ]
  }
}
```

| Champ     | Requis | Description                                                                                                                                                                     |
| :-------- | :----- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `type`    | oui    | Doit être `"prompt"`                                                                                                                                                            |
| `prompt`  | oui    | Le texte du prompt à envoyer au LLM. Utilisez `$ARGUMENTS` comme placeholder pour l'entrée JSON du hook. Si `$ARGUMENTS` n'est pas présent, l'entrée JSON est ajoutée au prompt |
| `model`   | non    | Modèle à utiliser pour l'évaluation. Par défaut un modèle rapide                                                                                                                |
| `timeout` | non    | Délai d'expiration en secondes. Par défaut : 30                                                                                                                                 |

### Schéma de réponse

Le LLM doit répondre avec JSON contenant :

```json theme={null}
{
  "ok": true | false,
  "reason": "Explanation for the decision"
}
```

| Champ    | Description                                                    |
| :------- | :------------------------------------------------------------- |
| `ok`     | `true` autorise l'action, `false` l'empêche                    |
| `reason` | Requis lorsque `ok` est `false`. Explication affichée à Claude |

### Exemple : Hook Stop multi-critères

Ce hook `Stop` utilise un prompt détaillé pour vérifier trois conditions avant d'autoriser Claude à s'arrêter. Si `"ok"` est `false`, Claude continue de travailler avec la raison fournie comme sa prochaine instruction. Les hooks `SubagentStop` utilisent le même format pour évaluer si un [subagent](/fr/sub-agents) doit s'arrêter :

```json theme={null}
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "You are evaluating whether Claude should stop working. Context: $ARGUMENTS\n\nAnalyze the conversation and determine if:\n1. All user-requested tasks are complete\n2. Any errors need to be addressed\n3. Follow-up work is needed\n\nRespond with JSON: {\"ok\": true} to allow stopping, or {\"ok\": false, \"reason\": \"your explanation\"} to continue working.",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

## Hooks basés sur des agents

Les hooks basés sur des agents (`type: "agent"`) sont comme les hooks basés sur des prompts mais avec accès aux outils multi-tours. Au lieu d'un seul appel LLM, un hook d'agent lance un subagent qui peut lire des fichiers, rechercher du code et inspecter la codebase pour vérifier les conditions. Les hooks d'agent supportent les mêmes événements que les hooks basés sur des prompts.

### Comment fonctionnent les hooks d'agent

Lorsqu'un hook d'agent se déclenche :

1. Claude Code lance un subagent avec votre prompt et l'entrée JSON du hook
2. Le subagent peut utiliser des outils comme Read, Grep et Glob pour enquêter
3. Après jusqu'à 50 tours, le subagent retourne une décision structurée `{ "ok": true/false }`
4. Claude Code traite la décision de la même manière qu'un hook de prompt

Les hooks d'agent sont utiles lorsque la vérification nécessite d'inspecter les fichiers réels ou la sortie des tests, pas seulement d'évaluer les données d'entrée du hook seules.

### Configuration des hooks d'agent

Définissez `type` à `"agent"` et fournissez une chaîne `prompt`. Les champs de configuration sont les mêmes que les [hooks de prompt](#prompt-hook-configuration), avec un délai d'expiration par défaut plus long :

| Champ     | Requis | Description                                                                                        |
| :-------- | :----- | :------------------------------------------------------------------------------------------------- |
| `type`    | oui    | Doit être `"agent"`                                                                                |
| `prompt`  | oui    | Prompt décrivant ce à vérifier. Utilisez `$ARGUMENTS` comme placeholder pour l'entrée JSON du hook |
| `model`   | non    | Modèle à utiliser. Par défaut un modèle rapide                                                     |
| `timeout` | non    | Délai d'expiration en secondes. Par défaut : 60                                                    |

Le schéma de réponse est le même que les hooks de prompt : `{ "ok": true }` pour autoriser ou `{ "ok": false, "reason": "..." }` pour bloquer.

Ce hook `Stop` vérifie que tous les tests unitaires réussissent avant d'autoriser Claude à terminer :

```json theme={null}
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "Verify that all unit tests pass. Run the test suite and check the results. $ARGUMENTS",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

## Exécuter les hooks en arrière-plan

Par défaut, les hooks bloquent l'exécution de Claude jusqu'à ce qu'ils se terminent. Pour les tâches longues comme les déploiements, les suites de tests ou les appels API externes, définissez `"async": true` pour exécuter le hook en arrière-plan tandis que Claude continue de travailler. Les hooks asynchrones ne peuvent pas bloquer ou contrôler le comportement de Claude : les champs de réponse comme `decision`, `permissionDecision` et `continue` n'ont aucun effet, car l'action qu'ils auraient contrôlée s'est déjà produite.

### Configurer un hook asynchrone

Ajoutez `"async": true` à la configuration d'un hook de commande pour l'exécuter en arrière-plan sans bloquer Claude. Ce champ n'est disponible que sur les hooks `type: "command"`.

Ce hook exécute un script de test après chaque appel d'outil `Write`. Claude continue de travailler immédiatement tandis que `run-tests.sh` s'exécute pendant jusqu'à 120 secondes. Lorsque le script se termine, sa sortie est livrée au tour de conversation suivant :

```json theme={null}
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/run-tests.sh",
            "async": true,
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

Le champ `timeout` définit le temps maximum en secondes pour le processus en arrière-plan. S'il n'est pas spécifié, les hooks asynchrones utilisent la même valeur par défaut de 10 minutes que les hooks synchrones.

### Comment les hooks asynchrones s'exécutent

Lorsqu'un hook asynchrone se déclenche, Claude Code démarre le processus du hook et continue immédiatement sans attendre qu'il se termine. Le hook reçoit la même entrée JSON via stdin qu'un hook synchrone.

Après la sortie du processus en arrière-plan, si le hook a produit une réponse JSON avec un champ `systemMessage` ou `additionalContext`, ce contenu est livré à Claude comme contexte au tour de conversation suivant.

Les notifications d'achèvement des hooks asynchrones sont supprimées par défaut. Pour les voir, activez le mode verbeux avec `Ctrl+O` ou démarrez Claude Code avec `--verbose`.

### Exemple : exécuter les tests après les modifications de fichiers

Ce hook démarre une suite de tests en arrière-plan chaque fois que Claude écrit un fichier, puis rapporte les résultats à Claude lorsque les tests se terminent. Enregistrez ce script dans `.claude/hooks/run-tests-async.sh` dans votre projet et rendez-le exécutable avec `chmod +x` :

```bash theme={null}
#!/bin/bash
# run-tests-async.sh

# Lisez l'entrée du hook depuis stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Exécutez les tests uniquement pour les fichiers source
if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.js ]]; then
  exit 0
fi

# Exécutez les tests et rapportez les résultats via systemMessage
RESULT=$(npm test 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "{\"systemMessage\": \"Tests passed after editing $FILE_PATH\"}"
else
  echo "{\"systemMessage\": \"Tests failed after editing $FILE_PATH: $RESULT\"}"
fi
```

Ensuite, ajoutez cette configuration à `.claude/settings.json` dans la racine de votre projet. Le drapeau `async: true` permet à Claude de continuer à travailler pendant que les tests s'exécutent :

```json theme={null}
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/run-tests-async.sh",
            "async": true,
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

### Limitations

Les hooks asynchrones ont plusieurs contraintes par rapport aux hooks synchrones :

- Seuls les hooks `type: "command"` supportent `async`. Les hooks basés sur des prompts ne peuvent pas s'exécuter de manière asynchrone.
- Les hooks asynchrones ne peuvent pas bloquer les appels d'outil ou retourner des décisions. Au moment où le hook se termine, l'action qui l'a déclenché a déjà procédé.
- La sortie du hook est livrée au tour de conversation suivant. Si la session est inactive, la réponse attend jusqu'à la prochaine interaction utilisateur.
- Chaque exécution crée un processus en arrière-plan séparé. Il n'y a pas de déduplication sur plusieurs déclenchements du même hook asynchrone.

## Considérations de sécurité

### Avertissement

Les hooks de commande s'exécutent avec les permissions complètes de votre utilisateur système.

<Warning>
  Les hooks de commande exécutent les commandes shell avec vos permissions utilisateur complètes. Ils peuvent modifier, supprimer ou accéder à tous les fichiers auxquels votre compte utilisateur peut accéder. Examinez et testez toutes les commandes de hook avant de les ajouter à votre configuration.
</Warning>

### Meilleures pratiques de sécurité

Gardez ces pratiques à l'esprit lors de l'écriture de hooks :

- **Validez et nettoyez les entrées** : ne faites jamais confiance aux données d'entrée aveuglément
- **Citez toujours les variables shell** : utilisez `"$VAR"` pas `$VAR`
- **Bloquez la traversée de répertoires** : vérifiez les `..` dans les chemins de fichiers
- **Utilisez les chemins absolus** : spécifiez les chemins complets pour les scripts, en utilisant `"$CLAUDE_PROJECT_DIR"` pour la racine du projet
- **Ignorez les fichiers sensibles** : évitez `.env`, `.git/`, les clés, etc.

## Déboguer les hooks

Exécutez `claude --debug` pour voir les détails d'exécution des hooks, y compris les hooks qui ont correspondu, leurs codes de sortie et leur sortie. Basculez le mode verbeux avec `Ctrl+O` pour voir la progression du hook dans la transcription.

```text theme={null}
[DEBUG] Executing hooks for PostToolUse:Write
[DEBUG] Getting matching hook commands for PostToolUse with query: Write
[DEBUG] Found 1 hook matchers in settings
[DEBUG] Matched 1 hooks for query "Write"
[DEBUG] Found 1 hook commands to execute
[DEBUG] Executing hook command: <Your command> with timeout 600000ms
[DEBUG] Hook command completed with status 0: <Your stdout>
```

Pour dépanner les problèmes courants comme les hooks qui ne se déclenchent pas, les boucles infinies de hook Stop ou les erreurs de configuration, consultez [Limitations et dépannage](/fr/hooks-guide#limitations-and-troubleshooting) dans le guide.
