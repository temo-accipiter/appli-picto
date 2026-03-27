> ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Étendre Claude avec des skills

> Créez, gérez et partagez des skills pour étendre les capacités de Claude dans Claude Code. Inclut les commandes personnalisées et les skills groupées.

Les skills étendent ce que Claude peut faire. Créez un fichier `SKILL.md` avec des instructions, et Claude l'ajoute à sa boîte à outils. Claude utilise les skills quand c'est pertinent, ou vous pouvez en invoquer une directement avec `/skill-name`.

<Note>
  Pour les commandes intégrées comme `/help` et `/compact`, consultez la [référence des commandes intégrées](/fr/commands).

  **Les commandes personnalisées ont été fusionnées dans les skills.** Un fichier à `.claude/commands/deploy.md` et une skill à `.claude/skills/deploy/SKILL.md` créent tous les deux `/deploy` et fonctionnent de la même manière. Vos fichiers `.claude/commands/` existants continuent de fonctionner. Les skills ajoutent des fonctionnalités optionnelles : un répertoire pour les fichiers de support, un frontmatter pour [contrôler si vous ou Claude invoquez la skill](#control-who-invokes-a-skill), et la capacité pour Claude de les charger automatiquement quand c'est pertinent.
</Note>

Les skills Claude Code suivent la norme ouverte [Agent Skills](https://agentskills.io), qui fonctionne sur plusieurs outils d'IA. Claude Code étend la norme avec des fonctionnalités supplémentaires comme le [contrôle d'invocation](#control-who-invokes-a-skill), l'[exécution de subagent](#run-skills-in-a-subagent), et l'[injection de contexte dynamique](#inject-dynamic-context).

## Skills groupées

Les skills groupées sont livrées avec Claude Code et sont disponibles dans chaque session. Contrairement aux [commandes intégrées](/fr/commands), qui exécutent une logique fixe directement, les skills groupées sont basées sur des prompts : elles donnent à Claude un playbook détaillé et le laissent orchestrer le travail en utilisant ses outils. Cela signifie que les skills groupées peuvent générer des agents parallèles, lire des fichiers et s'adapter à votre base de code.

Vous invoquez les skills groupées de la même manière que n'importe quelle autre skill : tapez `/` suivi du nom de la skill. Dans le tableau ci-dessous, `<arg>` indique un argument obligatoire et `[arg]` indique un argument optionnel.

| Skill                       | Objectif                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/batch <instruction>`      | Orchestrer des changements à grande échelle dans une base de code en parallèle. Recherche la base de code, décompose le travail en 5 à 30 unités indépendantes, et présente un plan. Une fois approuvé, génère un agent d'arrière-plan par unité dans un [git worktree](/fr/common-workflows#run-parallel-claude-code-sessions-with-git-worktrees) isolé. Chaque agent implémente son unité, exécute les tests et ouvre une pull request. Nécessite un référentiel git. Exemple : `/batch migrate src/ from Solid to React` |
| `/claude-api`               | Charger le matériel de référence de l'API Claude pour le langage de votre projet (Python, TypeScript, Java, Go, Ruby, C#, PHP, ou cURL) et la référence du SDK Agent pour Python et TypeScript. Couvre l'utilisation d'outils, le streaming, les lots, les sorties structurées et les pièges courants. S'active également automatiquement quand votre code importe `anthropic`, `@anthropic-ai/sdk`, ou `claude_agent_sdk`                                                                                                  |
| `/debug [description]`      | Activer la journalisation de débogage pour la session actuelle et dépanner les problèmes en lisant le journal de débogage de la session. La journalisation de débogage est désactivée par défaut sauf si vous avez démarré avec `claude --debug`, donc exécuter `/debug` en milieu de session commence à capturer les journaux à partir de ce moment. Décrivez optionnellement le problème pour concentrer l'analyse                                                                                                        |
| `/loop [interval] <prompt>` | Exécuter un prompt à plusieurs reprises selon un intervalle tant que la session reste ouverte. Utile pour interroger un déploiement, surveiller une PR, ou réexécuter périodiquement une autre skill. Exemple : `/loop 5m check if the deploy finished`. Voir [Exécuter des prompts selon un calendrier](/fr/scheduled-tasks)                                                                                                                                                                                               |
| `/simplify [focus]`         | Examiner vos fichiers récemment modifiés pour les problèmes de réutilisation de code, de qualité et d'efficacité, puis les corriger. Génère trois agents d'examen en parallèle, agrège leurs conclusions et applique les corrections. Passez du texte pour vous concentrer sur des préoccupations spécifiques : `/simplify focus on memory efficiency`                                                                                                                                                                      |

## Démarrage

### Créer votre première skill

Cet exemple crée une skill qui enseigne à Claude comment expliquer le code en utilisant des diagrammes visuels et des analogies. Puisqu'elle utilise le frontmatter par défaut, Claude peut la charger automatiquement quand vous demandez comment quelque chose fonctionne, ou vous pouvez l'invoquer directement avec `/explain-code`.

<Steps>
  <Step title="Créer le répertoire de la skill">
    Créez un répertoire pour la skill dans votre dossier de skills personnelles. Les skills personnelles sont disponibles dans tous vos projets.

    ```bash  theme={null}
    mkdir -p ~/.claude/skills/explain-code
    ```
  </Step>

  <Step title="Écrire SKILL.md">
    Chaque skill a besoin d'un fichier `SKILL.md` avec deux parties : un frontmatter YAML (entre les marqueurs `---`) qui dit à Claude quand utiliser la skill, et du contenu markdown avec les instructions que Claude suit quand la skill est invoquée. Le champ `name` devient la `/slash-command`, et la `description` aide Claude à décider quand la charger automatiquement.

    Créez `~/.claude/skills/explain-code/SKILL.md` :

    ```yaml  theme={null}
    ---
    name: explain-code
    description: Explains code with visual diagrams and analogies. Use when explaining how code works, teaching about a codebase, or when the user asks "how does this work?"
    ---

    When explaining code, always include:

    1. **Start with an analogy**: Compare the code to something from everyday life
    2. **Draw a diagram**: Use ASCII art to show the flow, structure, or relationships
    3. **Walk through the code**: Explain step-by-step what happens
    4. **Highlight a gotcha**: What's a common mistake or misconception?

    Keep explanations conversational. For complex concepts, use multiple analogies.
    ```
  </Step>

  <Step title="Tester la skill">
    Vous pouvez la tester de deux façons :

    **Laisser Claude l'invoquer automatiquement** en posant une question qui correspond à la description :

    ```text  theme={null}
    How does this code work?
    ```

    **Ou l'invoquer directement** avec le nom de la skill :

    ```text  theme={null}
    /explain-code src/auth/login.ts
    ```

    De l'une ou l'autre façon, Claude devrait inclure une analogie et un diagramme ASCII dans son explication.
  </Step>
</Steps>

### Où vivent les skills

L'endroit où vous stockez une skill détermine qui peut l'utiliser :

| Localisation | Chemin                                               | S'applique à                                |
| :----------- | :--------------------------------------------------- | :------------------------------------------ |
| Entreprise   | Voir [paramètres gérés](/fr/settings#settings-files) | Tous les utilisateurs de votre organisation |
| Personnel    | `~/.claude/skills/<skill-name>/SKILL.md`             | Tous vos projets                            |
| Projet       | `.claude/skills/<skill-name>/SKILL.md`               | Ce projet uniquement                        |
| Plugin       | `<plugin>/skills/<skill-name>/SKILL.md`              | Où le plugin est activé                     |

Quand les skills partagent le même nom à différents niveaux, les localisations de priorité plus élevée gagnent : entreprise > personnel > projet. Les skills de plugin utilisent un espace de noms `plugin-name:skill-name`, donc elles ne peuvent pas entrer en conflit avec d'autres niveaux. Si vous avez des fichiers dans `.claude/commands/`, ils fonctionnent de la même manière, mais si une skill et une commande partagent le même nom, la skill a la priorité.

#### Découverte automatique à partir de répertoires imbriqués

Quand vous travaillez avec des fichiers dans des sous-répertoires, Claude Code découvre automatiquement les skills à partir des répertoires `.claude/skills/` imbriqués. Par exemple, si vous modifiez un fichier dans `packages/frontend/`, Claude Code recherche également les skills dans `packages/frontend/.claude/skills/`. Cela supporte les configurations monorepo où les packages ont leurs propres skills.

Chaque skill est un répertoire avec `SKILL.md` comme point d'entrée :

```text  theme={null}
my-skill/
├── SKILL.md           # Instructions principales (obligatoire)
├── template.md        # Modèle pour que Claude remplisse
├── examples/
│   └── sample.md      # Exemple de sortie montrant le format attendu
└── scripts/
    └── validate.sh    # Script que Claude peut exécuter
```

Le `SKILL.md` contient les instructions principales et est obligatoire. Les autres fichiers sont optionnels et vous permettent de créer des skills plus puissantes : des modèles pour que Claude remplisse, des exemples de sortie montrant le format attendu, des scripts que Claude peut exécuter, ou une documentation de référence détaillée. Référencez ces fichiers à partir de votre `SKILL.md` pour que Claude sache ce qu'ils contiennent et quand les charger. Voir [Ajouter des fichiers de support](#add-supporting-files) pour plus de détails.

<Note>
  Les fichiers dans `.claude/commands/` fonctionnent toujours et supportent le même [frontmatter](#frontmatter-reference). Les skills sont recommandées puisqu'elles supportent des fonctionnalités supplémentaires comme les fichiers de support.
</Note>

#### Skills à partir de répertoires supplémentaires

Les skills définies dans `.claude/skills/` dans les répertoires ajoutés via `--add-dir` sont chargées automatiquement et détectées par la détection de changement en direct, donc vous pouvez les modifier pendant une session sans redémarrer.

<Note>
  Les fichiers CLAUDE.md des répertoires `--add-dir` ne sont pas chargés par défaut. Pour les charger, définissez `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`. Voir [Charger à partir de répertoires supplémentaires](/fr/memory#load-from-additional-directories).
</Note>

## Configurer les skills

Les skills sont configurées via le frontmatter YAML en haut de `SKILL.md` et le contenu markdown qui suit.

### Types de contenu de skill

Les fichiers de skill peuvent contenir n'importe quelles instructions, mais réfléchir à la façon dont vous voulez les invoquer aide à guider ce qu'il faut inclure :

**Le contenu de référence** ajoute des connaissances que Claude applique à votre travail actuel. Conventions, modèles, guides de style, connaissances du domaine. Ce contenu s'exécute en ligne pour que Claude puisse l'utiliser aux côtés du contexte de votre conversation.

```yaml  theme={null}
---
name: api-conventions
description: API design patterns for this codebase
---

When writing API endpoints:
- Use RESTful naming conventions
- Return consistent error formats
- Include request validation
```

**Le contenu de tâche** donne à Claude des instructions étape par étape pour une action spécifique, comme les déploiements, les commits ou la génération de code. Ce sont souvent des actions que vous voulez invoquer directement avec `/skill-name` plutôt que de laisser Claude décider quand les exécuter. Ajoutez `disable-model-invocation: true` pour empêcher Claude de la déclencher automatiquement.

```yaml  theme={null}
---
name: deploy
description: Deploy the application to production
context: fork
disable-model-invocation: true
---

Deploy the application:
1. Run the test suite
2. Build the application
3. Push to the deployment target
```

Votre `SKILL.md` peut contenir n'importe quoi, mais réfléchir à la façon dont vous voulez que la skill soit invoquée (par vous, par Claude, ou les deux) et où vous voulez qu'elle s'exécute (en ligne ou dans un subagent) aide à guider ce qu'il faut inclure. Pour les skills complexes, vous pouvez également [ajouter des fichiers de support](#add-supporting-files) pour garder la skill principale concentrée.

### Référence du frontmatter

Au-delà du contenu markdown, vous pouvez configurer le comportement de la skill en utilisant les champs du frontmatter YAML entre les marqueurs `---` en haut de votre fichier `SKILL.md` :

```yaml  theme={null}
---
name: my-skill
description: What this skill does
disable-model-invocation: true
allowed-tools: Read, Grep
---

Your skill instructions here...
```

Tous les champs sont optionnels. Seul `description` est recommandé pour que Claude sache quand utiliser la skill.

| Champ                      | Obligatoire | Description                                                                                                                                                                                                                         |
| :------------------------- | :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                     | Non         | Nom d'affichage pour la skill. S'il est omis, utilise le nom du répertoire. Lettres minuscules, chiffres et tirets uniquement (max 64 caractères).                                                                                  |
| `description`              | Recommandé  | Ce que fait la skill et quand l'utiliser. Claude utilise ceci pour décider quand appliquer la skill. S'il est omis, utilise le premier paragraphe du contenu markdown.                                                              |
| `argument-hint`            | Non         | Indice affiché lors de l'autocomplétion pour indiquer les arguments attendus. Exemple : `[issue-number]` ou `[filename] [format]`.                                                                                                  |
| `disable-model-invocation` | Non         | Définissez à `true` pour empêcher Claude de charger automatiquement cette skill. Utilisez pour les workflows que vous voulez déclencher manuellement avec `/name`. Par défaut : `false`.                                            |
| `user-invocable`           | Non         | Définissez à `false` pour masquer du menu `/`. Utilisez pour les connaissances de base que les utilisateurs ne devraient pas invoquer directement. Par défaut : `true`.                                                             |
| `allowed-tools`            | Non         | Outils que Claude peut utiliser sans demander la permission quand cette skill est active.                                                                                                                                           |
| `model`                    | Non         | Modèle à utiliser quand cette skill est active.                                                                                                                                                                                     |
| `effort`                   | Non         | [Niveau d'effort](/fr/model-config#adjust-effort-level) quand cette skill est active. Remplace le niveau d'effort de la session. Par défaut : hérite de la session. Options : `low`, `medium`, `high`, `max` (Opus 4.6 uniquement). |
| `context`                  | Non         | Définissez à `fork` pour exécuter dans un contexte de subagent forké.                                                                                                                                                               |
| `agent`                    | Non         | Quel type de subagent utiliser quand `context: fork` est défini.                                                                                                                                                                    |
| `hooks`                    | Non         | Hooks limités au cycle de vie de cette skill. Voir [Hooks dans les skills et les agents](/fr/hooks#hooks-in-skills-and-agents) pour le format de configuration.                                                                     |

#### Substitutions de chaîne disponibles

Les skills supportent la substitution de chaîne pour les valeurs dynamiques dans le contenu de la skill :

| Variable               | Description                                                                                                                                                                                                                                                                                                                              |
| :--------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$ARGUMENTS`           | Tous les arguments passés lors de l'invocation de la skill. Si `$ARGUMENTS` n'est pas présent dans le contenu, les arguments sont ajoutés comme `ARGUMENTS: <value>`.                                                                                                                                                                    |
| `$ARGUMENTS[N]`        | Accédez à un argument spécifique par index basé sur 0, comme `$ARGUMENTS[0]` pour le premier argument.                                                                                                                                                                                                                                   |
| `$N`                   | Raccourci pour `$ARGUMENTS[N]`, comme `$0` pour le premier argument ou `$1` pour le deuxième.                                                                                                                                                                                                                                            |
| `${CLAUDE_SESSION_ID}` | L'ID de session actuel. Utile pour la journalisation, la création de fichiers spécifiques à la session, ou la corrélation de la sortie de la skill avec les sessions.                                                                                                                                                                    |
| `${CLAUDE_SKILL_DIR}`  | Le répertoire contenant le fichier `SKILL.md` de la skill. Pour les skills de plugin, c'est le sous-répertoire de la skill dans le plugin, pas la racine du plugin. Utilisez ceci dans les commandes d'injection bash pour référencer les scripts ou les fichiers groupés avec la skill, indépendamment du répertoire de travail actuel. |

**Exemple utilisant les substitutions :**

```yaml  theme={null}
---
name: session-logger
description: Log activity for this session
---

Log the following to logs/${CLAUDE_SESSION_ID}.log:

$ARGUMENTS
```

### Ajouter des fichiers de support

Les skills peuvent inclure plusieurs fichiers dans leur répertoire. Cela garde `SKILL.md` concentré sur l'essentiel tout en permettant à Claude d'accéder au matériel de référence détaillé uniquement quand c'est nécessaire. Les grandes docs de référence, les spécifications d'API, ou les collections d'exemples n'ont pas besoin de se charger dans le contexte à chaque fois que la skill s'exécute.

```text  theme={null}
my-skill/
├── SKILL.md (obligatoire - aperçu et navigation)
├── reference.md (docs API détaillées - chargées quand nécessaire)
├── examples.md (exemples d'utilisation - chargés quand nécessaire)
└── scripts/
    └── helper.py (script utilitaire - exécuté, pas chargé)
```

Référencez les fichiers de support à partir de `SKILL.md` pour que Claude sache ce que chaque fichier contient et quand le charger :

```markdown  theme={null}
## Additional resources

- For complete API details, see [reference.md](reference.md)
- For usage examples, see [examples.md](examples.md)
```

<Tip>Gardez `SKILL.md` sous 500 lignes. Déplacez le matériel de référence détaillé vers des fichiers séparés.</Tip>

### Contrôler qui invoque une skill

Par défaut, vous et Claude pouvez tous les deux invoquer n'importe quelle skill. Vous pouvez taper `/skill-name` pour l'invoquer directement, et Claude peut la charger automatiquement quand c'est pertinent pour votre conversation. Deux champs du frontmatter vous permettent de restreindre ceci :

* **`disable-model-invocation: true`** : Seul vous pouvez invoquer la skill. Utilisez ceci pour les workflows avec des effets secondaires ou que vous voulez contrôler le timing, comme `/commit`, `/deploy`, ou `/send-slack-message`. Vous ne voulez pas que Claude décide de déployer parce que votre code semble prêt.

* **`user-invocable: false`** : Seul Claude peut invoquer la skill. Utilisez ceci pour les connaissances de base qui ne sont pas actionnables comme une commande. Une skill `legacy-system-context` explique comment fonctionne un ancien système. Claude devrait le savoir quand c'est pertinent, mais `/legacy-system-context` n'est pas une action significative pour les utilisateurs.

Cet exemple crée une skill de déploiement que seul vous pouvez déclencher. Le champ `disable-model-invocation: true` empêche Claude de l'exécuter automatiquement :

```yaml  theme={null}
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
---

Deploy $ARGUMENTS to production:

1. Run the test suite
2. Build the application
3. Push to the deployment target
4. Verify the deployment succeeded
```

Voici comment les deux champs affectent l'invocation et le chargement du contexte :

| Frontmatter                      | Vous pouvez invoquer | Claude peut invoquer | Quand chargé dans le contexte                                                       |
| :------------------------------- | :------------------- | :------------------- | :---------------------------------------------------------------------------------- |
| (par défaut)                     | Oui                  | Oui                  | Description toujours dans le contexte, la skill complète se charge quand invoquée   |
| `disable-model-invocation: true` | Oui                  | Non                  | Description pas dans le contexte, la skill complète se charge quand vous l'invoquez |
| `user-invocable: false`          | Non                  | Oui                  | Description toujours dans le contexte, la skill complète se charge quand invoquée   |

<Note>
  Dans une session régulière, les descriptions de skills sont chargées dans le contexte pour que Claude sache ce qui est disponible, mais le contenu complet de la skill ne se charge que quand elle est invoquée. [Les subagents avec des skills préchargées](/fr/sub-agents#preload-skills-into-subagents) fonctionnent différemment : le contenu complet de la skill est injecté au démarrage.
</Note>

### Restreindre l'accès aux outils

Utilisez le champ `allowed-tools` pour limiter les outils que Claude peut utiliser quand une skill est active. Cette skill crée un mode lecture seule où Claude peut explorer les fichiers mais pas les modifier :

```yaml  theme={null}
---
name: safe-reader
description: Read files without making changes
allowed-tools: Read, Grep, Glob
---
```

### Passer des arguments aux skills

Vous et Claude pouvez tous les deux passer des arguments lors de l'invocation d'une skill. Les arguments sont disponibles via l'espace réservé `$ARGUMENTS`.

Cette skill corrige un problème GitHub par numéro. L'espace réservé `$ARGUMENTS` est remplacé par tout ce qui suit le nom de la skill :

```yaml  theme={null}
---
name: fix-issue
description: Fix a GitHub issue
disable-model-invocation: true
---

Fix GitHub issue $ARGUMENTS following our coding standards.

1. Read the issue description
2. Understand the requirements
3. Implement the fix
4. Write tests
5. Create a commit
```

Quand vous exécutez `/fix-issue 123`, Claude reçoit ' Fix GitHub issue 123 following our coding standards... '

Si vous invoquez une skill avec des arguments mais que la skill n'inclut pas `$ARGUMENTS`, Claude Code ajoute `ARGUMENTS: <your input>` à la fin du contenu de la skill pour que Claude voie toujours ce que vous avez tapé.

Pour accéder aux arguments individuels par position, utilisez `$ARGUMENTS[N]` ou le raccourci plus court `$N` :

```yaml  theme={null}
---
name: migrate-component
description: Migrate a component from one framework to another
---

Migrate the $ARGUMENTS[0] component from $ARGUMENTS[1] to $ARGUMENTS[2].
Preserve all existing behavior and tests.
```

Exécuter `/migrate-component SearchBar React Vue` remplace `$ARGUMENTS[0]` par `SearchBar`, `$ARGUMENTS[1]` par `React`, et `$ARGUMENTS[2]` par `Vue`. La même skill utilisant le raccourci `$N` :

```yaml  theme={null}
---
name: migrate-component
description: Migrate a component from one framework to another
---

Migrate the $0 component from $1 to $2.
Preserve all existing behavior and tests.
```

## Modèles avancés

### Injecter du contexte dynamique

La syntaxe `` !`<command>` `` exécute les commandes shell avant que le contenu de la skill soit envoyé à Claude. La sortie de la commande remplace l'espace réservé, donc Claude reçoit les données réelles, pas la commande elle-même.

Cette skill résume une pull request en récupérant les données de PR en direct avec le CLI GitHub. Les commandes `` !`gh pr diff` `` et autres s'exécutent d'abord, et leur sortie est insérée dans le prompt :

```yaml  theme={null}
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

Quand cette skill s'exécute :

1. Chaque `` !`<command>` `` s'exécute immédiatement (avant que Claude ne voie quoi que ce soit)
2. La sortie remplace l'espace réservé dans le contenu de la skill
3. Claude reçoit le prompt complètement rendu avec les données réelles de PR

C'est du prétraitement, pas quelque chose que Claude exécute. Claude ne voit que le résultat final.

<Tip>
  Pour activer la [réflexion étendue](/fr/common-workflows#use-extended-thinking-thinking-mode) dans une skill, incluez le mot ' ultrathink ' n'importe où dans le contenu de votre skill.
</Tip>

### Exécuter les skills dans un subagent

Ajoutez `context: fork` à votre frontmatter quand vous voulez qu'une skill s'exécute en isolation. Le contenu de la skill devient le prompt qui pilote le subagent. Il n'aura pas accès à votre historique de conversation.

<Warning>
  `context: fork` n'a de sens que pour les skills avec des instructions explicites. Si votre skill contient des directives comme ' utiliser ces conventions d'API ' sans une tâche, le subagent reçoit les directives mais pas de prompt actionnable, et retourne sans sortie significative.
</Warning>

Les skills et les [subagents](/fr/sub-agents) fonctionnent ensemble dans deux directions :

| Approche                     | Prompt système                            | Tâche                           | Charge également               |
| :--------------------------- | :---------------------------------------- | :------------------------------ | :----------------------------- |
| Skill avec `context: fork`   | Du type d'agent (`Explore`, `Plan`, etc.) | Contenu de SKILL.md             | CLAUDE.md                      |
| Subagent avec champ `skills` | Corps markdown du subagent                | Message de délégation de Claude | Skills préchargées + CLAUDE.md |

Avec `context: fork`, vous écrivez la tâche dans votre skill et choisissez un type d'agent pour l'exécuter. Pour l'inverse (définir un subagent personnalisé qui utilise les skills comme matériel de référence), voir [Subagents](/fr/sub-agents#preload-skills-into-subagents).

#### Exemple : Skill de recherche utilisant l'agent Explore

Cette skill exécute la recherche dans un agent Explore forké. Le contenu de la skill devient la tâche, et l'agent fournit des outils en lecture seule optimisés pour l'exploration de la base de code :

```yaml  theme={null}
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:

1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

Quand cette skill s'exécute :

1. Un nouveau contexte isolé est créé
2. Le subagent reçoit le contenu de la skill comme son prompt (' Research \$ARGUMENTS thoroughly... ')
3. Le champ `agent` détermine l'environnement d'exécution (modèle, outils et permissions)
4. Les résultats sont résumés et retournés à votre conversation principale

Le champ `agent` spécifie quelle configuration de subagent utiliser. Les options incluent les agents intégrés (`Explore`, `Plan`, `general-purpose`) ou n'importe quel subagent personnalisé de `.claude/agents/`. S'il est omis, utilise `general-purpose`.

### Restreindre l'accès aux skills de Claude

Par défaut, Claude peut invoquer n'importe quelle skill qui n'a pas `disable-model-invocation: true` défini. Les skills qui définissent `allowed-tools` accordent à Claude l'accès à ces outils sans approbation par utilisation quand la skill est active. Vos [paramètres de permission](/fr/permissions) gouvernent toujours le comportement d'approbation de base pour tous les autres outils. Les commandes intégrées comme `/compact` et `/init` ne sont pas disponibles via l'outil Skill.

Trois façons de contrôler quelles skills Claude peut invoquer :

**Désactiver toutes les skills** en refusant l'outil Skill dans `/permissions` :

```text  theme={null}
# Add to deny rules:
Skill
```

**Autoriser ou refuser des skills spécifiques** en utilisant les [règles de permission](/fr/permissions) :

```text  theme={null}
# Allow only specific skills
Skill(commit)
Skill(review-pr *)

# Deny specific skills
Skill(deploy *)
```

Syntaxe de permission : `Skill(name)` pour une correspondance exacte, `Skill(name *)` pour une correspondance de préfixe avec n'importe quels arguments.

**Masquer les skills individuelles** en ajoutant `disable-model-invocation: true` à leur frontmatter. Cela supprime la skill du contexte de Claude entièrement.

<Note>
  Le champ `user-invocable` contrôle uniquement la visibilité du menu, pas l'accès à l'outil Skill. Utilisez `disable-model-invocation: true` pour bloquer l'invocation programmatique.
</Note>

## Partager les skills

Les skills peuvent être distribuées à différentes portées selon votre audience :

* **Skills de projet** : Validez `.claude/skills/` dans le contrôle de version
* **Plugins** : Créez un répertoire `skills/` dans votre [plugin](/fr/plugins)
* **Gérées** : Déployez à l'échelle de l'organisation via les [paramètres gérés](/fr/settings#settings-files)

### Générer une sortie visuelle

Les skills peuvent grouper et exécuter des scripts dans n'importe quel langage, donnant à Claude des capacités au-delà de ce qui est possible dans un seul prompt. Un modèle puissant est la génération de sortie visuelle : des fichiers HTML interactifs qui s'ouvrent dans votre navigateur pour explorer les données, déboguer ou créer des rapports.

Cet exemple crée un explorateur de base de code : une vue d'arbre interactive où vous pouvez développer et réduire les répertoires, voir les tailles de fichiers en un coup d'œil, et identifier les types de fichiers par couleur.

Créez le répertoire Skill :

```bash  theme={null}
mkdir -p ~/.claude/skills/codebase-visualizer/scripts
```

Créez `~/.claude/skills/codebase-visualizer/SKILL.md`. La description dit à Claude quand activer cette Skill, et les instructions disent à Claude d'exécuter le script groupé :

````yaml  theme={null}
---
name: codebase-visualizer
description: Generate an interactive collapsible tree visualization of your codebase. Use when exploring a new repo, understanding project structure, or identifying large files.
allowed-tools: Bash(python *)
---

# Codebase Visualizer

Generate an interactive HTML tree view that shows your project's file structure with collapsible directories.

## Usage

Run the visualization script from your project root:

```bash
python ~/.claude/skills/codebase-visualizer/scripts/visualize.py .
```

This creates `codebase-map.html` in the current directory and opens it in your default browser.

## What the visualization shows

- **Collapsible directories**: Click folders to expand/collapse
- **File sizes**: Displayed next to each file
- **Colors**: Different colors for different file types
- **Directory totals**: Shows aggregate size of each folder
````

Créez `~/.claude/skills/codebase-visualizer/scripts/visualize.py`. Ce script analyse une arborescence de répertoires et génère un fichier HTML autonome avec :

* Une **barre latérale de résumé** montrant le nombre de fichiers, le nombre de répertoires, la taille totale et le nombre de types de fichiers
* Un **graphique en barres** décomposant la base de code par type de fichier (top 8 par taille)
* Un **arbre réductible** où vous pouvez développer et réduire les répertoires, avec des indicateurs de type de fichier codés par couleur

Le script nécessite Python mais utilise uniquement les bibliothèques intégrées, donc il n'y a pas de packages à installer :

```python expandable theme={null}
#!/usr/bin/env python3
"""Generate an interactive collapsible tree visualization of a codebase."""

import json
import sys
import webbrowser
from pathlib import Path
from collections import Counter

IGNORE = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build'}

def scan(path: Path, stats: dict) -> dict:
    result = {"name": path.name, "children": [], "size": 0}
    try:
        for item in sorted(path.iterdir()):
            if item.name in IGNORE or item.name.startswith('.'):
                continue
            if item.is_file():
                size = item.stat().st_size
                ext = item.suffix.lower() or '(no ext)'
                result["children"].append({"name": item.name, "size": size, "ext": ext})
                result["size"] += size
                stats["files"] += 1
                stats["extensions"][ext] += 1
                stats["ext_sizes"][ext] += size
            elif item.is_dir():
                stats["dirs"] += 1
                child = scan(item, stats)
                if child["children"]:
                    result["children"].append(child)
                    result["size"] += child["size"]
    except PermissionError:
        pass
    return result

def generate_html(data: dict, stats: dict, output: Path) -> None:
    ext_sizes = stats["ext_sizes"]
    total_size = sum(ext_sizes.values()) or 1
    sorted_exts = sorted(ext_sizes.items(), key=lambda x: -x[1])[:8]
    colors = {
        '.js': '#f7df1e', '.ts': '#3178c6', '.py': '#3776ab', '.go': '#00add8',
        '.rs': '#dea584', '.rb': '#cc342d', '.css': '#264de4', '.html': '#e34c26',
        '.json': '#6b7280', '.md': '#083fa1', '.yaml': '#cb171e', '.yml': '#cb171e',
        '.mdx': '#083fa1', '.tsx': '#3178c6', '.jsx': '#61dafb', '.sh': '#4eaa25',
    }
    lang_bars = "".join(
        f'<div class="bar-row"><span class="bar-label">{ext}</span>'
        f'<div class="bar" style="width:{(size/total_size)*100}%;background:{colors.get(ext,"#6b7280")}"></div>'
        f'<span class="bar-pct">{(size/total_size)*100:.1f}%</span></div>'
        for ext, size in sorted_exts
    )
    def fmt(b):
        if b < 1024: return f"{b} B"
        if b < 1048576: return f"{b/1024:.1f} KB"
        return f"{b/1048576:.1f} MB"

    html = f'''<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"><title>Codebase Explorer</title>
  <style>
    body {{ font: 14px/1.5 system-ui, sans-serif; margin: 0; background: #1a1a2e; color: #eee; }}
    .container {{ display: flex; height: 100vh; }}
    .sidebar {{ width: 280px; background: #252542; padding: 20px; border-right: 1px solid #3d3d5c; overflow-y: auto; flex-shrink: 0; }}
    .main {{ flex: 1; padding: 20px; overflow-y: auto; }}
    h1 {{ margin: 0 0 10px 0; font-size: 18px; }}
    h2 {{ margin: 20px 0 10px 0; font-size: 14px; color: #888; text-transform: uppercase; }}
    .stat {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #3d3d5c; }}
    .stat-value {{ font-weight: bold; }}
    .bar-row {{ display: flex; align-items: center; margin: 6px 0; }}
    .bar-label {{ width: 55px; font-size: 12px; color: #aaa; }}
    .bar {{ height: 18px; border-radius: 3px; }}
    .bar-pct {{ margin-left: 8px; font-size: 12px; color: #666; }}
    .tree {{ list-style: none; padding-left: 20px; }}
    details {{ cursor: pointer; }}
    summary {{ padding: 4px 8px; border-radius: 4px; }}
    summary:hover {{ background: #2d2d44; }}
    .folder {{ color: #ffd700; }}
    .file {{ display: flex; align-items: center; padding: 4px 8px; border-radius: 4px; }}
    .file:hover {{ background: #2d2d44; }}
    .size {{ color: #888; margin-left: auto; font-size: 12px; }}
    .dot {{ width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }}
  </style>
</head><body>
  <div class="container">
    <div class="sidebar">
      <h1>📊 Summary</h1>
      <div class="stat"><span>Files</span><span class="stat-value">{stats["files"]:,}</span></div>
      <div class="stat"><span>Directories</span><span class="stat-value">{stats["dirs"]:,}</span></div>
      <div class="stat"><span>Total size</span><span class="stat-value">{fmt(data["size"])}</span></div>
      <div class="stat"><span>File types</span><span class="stat-value">{len(stats["extensions"])}</span></div>
      <h2>By file type</h2>
      {lang_bars}
    </div>
    <div class="main">
      <h1>📁 {data["name"]}</h1>
      <ul class="tree" id="root"></ul>
    </div>
  </div>
  <script>
    const data = {json.dumps(data)};
    const colors = {json.dumps(colors)};
    function fmt(b) {{ if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1) + ' KB'; return (b/1048576).toFixed(1) + ' MB'; }}
    function render(node, parent) {{
      if (node.children) {{
        const det = document.createElement('details');
        det.open = parent === document.getElementById('root');
        det.innerHTML = `<summary><span class="folder">📁 ${{node.name}}</span><span class="size">${{fmt(node.size)}}</span></summary>`;
        const ul = document.createElement('ul'); ul.className = 'tree';
        node.children.sort((a,b) => (b.children?1:0)-(a.children?1:0) || a.name.localeCompare(b.name));
        node.children.forEach(c => render(c, ul));
        det.appendChild(ul);
        const li = document.createElement('li'); li.appendChild(det); parent.appendChild(li);
      }} else {{
        const li = document.createElement('li'); li.className = 'file';
        li.innerHTML = `<span class="dot" style="background:${{colors[node.ext]||'#6b7280'}}"></span>${{node.name}}<span class="size">${{fmt(node.size)}}</span>`;
        parent.appendChild(li);
      }}
    }}
    data.children.forEach(c => render(c, document.getElementById('root')));
  </script>
</body></html>'''
    output.write_text(html)

if __name__ == '__main__':
    target = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
    stats = {"files": 0, "dirs": 0, "extensions": Counter(), "ext_sizes": Counter()}
    data = scan(target, stats)
    out = Path('codebase-map.html')
    generate_html(data, stats, out)
    print(f'Generated {out.absolute()}')
    webbrowser.open(f'file://{out.absolute()}')
```

Pour tester, ouvrez Claude Code dans n'importe quel projet et demandez « Visualize this codebase. » Claude exécute le script, génère `codebase-map.html`, et l'ouvre dans votre navigateur.

Ce modèle fonctionne pour n'importe quelle sortie visuelle : graphiques de dépendances, rapports de couverture de test, documentation d'API, ou visualisations de schéma de base de données. Le script groupé fait le gros du travail tandis que Claude gère l'orchestration.

## Dépannage

### Skill ne se déclenche pas

Si Claude n'utilise pas votre skill quand attendu :

1. Vérifiez que la description inclut les mots-clés que les utilisateurs diraient naturellement
2. Vérifiez que la skill apparaît dans « What skills are available? »
3. Essayez de reformuler votre demande pour correspondre plus étroitement à la description
4. Invoquez-la directement avec `/skill-name` si la skill est invocable par l'utilisateur

### Skill se déclenche trop souvent

Si Claude utilise votre skill quand vous ne le voulez pas :

1. Rendez la description plus spécifique
2. Ajoutez `disable-model-invocation: true` si vous voulez uniquement l'invocation manuelle

### Claude ne voit pas toutes mes skills

Les descriptions de skills sont chargées dans le contexte pour que Claude sache ce qui est disponible. Si vous avez beaucoup de skills, elles peuvent dépasser le budget de caractères. Le budget s'adapte dynamiquement à 2 % de la fenêtre de contexte, avec un repli de 16 000 caractères. Exécutez `/context` pour vérifier un avertissement concernant les skills exclues.

Pour remplacer la limite, définissez la variable d'environnement `SLASH_COMMAND_TOOL_CHAR_BUDGET`.

## Ressources connexes

* **[Subagents](/fr/sub-agents)** : déléguer les tâches à des agents spécialisés
* **[Plugins](/fr/plugins)** : empaqueter et distribuer les skills avec d'autres extensions
* **[Hooks](/fr/hooks)** : automatiser les workflows autour des événements d'outils
* **[Memory](/fr/memory)** : gérer les fichiers CLAUDE.md pour le contexte persistant
* **[Built-in commands](/fr/commands)** : référence pour les commandes `/` intégrées
* **[Permissions](/fr/permissions)** : contrôler l'accès aux outils et aux skills
