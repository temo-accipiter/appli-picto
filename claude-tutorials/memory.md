> ## Documentation Index
>
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Comment Claude se souvient de votre projet

> Donnez à Claude des instructions persistantes avec les fichiers CLAUDE.md, et laissez Claude accumuler automatiquement les apprentissages avec la mémoire automatique.

Chaque session Claude Code commence avec une fenêtre de contexte vierge. Deux mécanismes transportent les connaissances d'une session à l'autre :

- **Fichiers CLAUDE.md** : instructions que vous écrivez pour donner à Claude un contexte persistant
- **Mémoire automatique** : notes que Claude écrit lui-même en fonction de vos corrections et préférences

Cette page couvre comment :

- [Écrire et organiser les fichiers CLAUDE.md](#claude-md-files)
- [Limiter les règles à des types de fichiers spécifiques](#organize-rules-with-clauderules) avec `.claude/rules/`
- [Configurer la mémoire automatique](#auto-memory) pour que Claude prenne des notes automatiquement
- [Dépanner](#troubleshoot-memory-issues) quand les instructions ne sont pas suivies

## CLAUDE.md vs mémoire automatique

Claude Code dispose de deux systèmes de mémoire complémentaires. Les deux sont chargés au début de chaque conversation. Claude les traite comme du contexte, pas comme une configuration appliquée. Plus vos instructions sont spécifiques et concises, plus Claude les suit régulièrement.

|                       | Fichiers CLAUDE.md                                        | Mémoire automatique                                                             |
| :-------------------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Qui l'écrit**       | Vous                                                      | Claude                                                                          |
| **Ce qu'il contient** | Instructions et règles                                    | Apprentissages et modèles                                                       |
| **Portée**            | Projet, utilisateur ou organisation                       | Par arborescence de travail                                                     |
| **Chargé dans**       | Chaque session                                            | Chaque session (premières 200 lignes)                                           |
| **À utiliser pour**   | Normes de codage, flux de travail, architecture du projet | Commandes de compilation, insights de débogage, préférences que Claude découvre |

Utilisez les fichiers CLAUDE.md quand vous voulez guider le comportement de Claude. La mémoire automatique permet à Claude d'apprendre de vos corrections sans effort manuel.

Les subagents peuvent également maintenir leur propre mémoire automatique. Consultez la [configuration des subagents](/fr/sub-agents#enable-persistent-memory) pour plus de détails.

## Fichiers CLAUDE.md

Les fichiers CLAUDE.md sont des fichiers markdown qui donnent à Claude des instructions persistantes pour un projet, votre flux de travail personnel ou toute votre organisation. Vous écrivez ces fichiers en texte brut ; Claude les lit au début de chaque session.

### Choisir où placer les fichiers CLAUDE.md

Les fichiers CLAUDE.md peuvent se trouver à plusieurs endroits, chacun avec une portée différente. Les emplacements plus spécifiques ont la priorité sur les plus larges.

| Portée                       | Emplacement                                                                                                                                                               | Objectif                                                                    | Exemples de cas d'usage                                                           | Partagé avec                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------- |
| **Politique gérée**          | • macOS : `/Library/Application Support/ClaudeCode/CLAUDE.md`<br />• Linux et WSL : `/etc/claude-code/CLAUDE.md`<br />• Windows : `C:\Program Files\ClaudeCode\CLAUDE.md` | Instructions à l'échelle de l'organisation gérées par l'informatique/DevOps | Normes de codage de l'entreprise, politiques de sécurité, exigences de conformité | Tous les utilisateurs de l'organisation       |
| **Instructions du projet**   | `./CLAUDE.md` ou `./.claude/CLAUDE.md`                                                                                                                                    | Instructions partagées par l'équipe pour le projet                          | Architecture du projet, normes de codage, flux de travail courants                | Membres de l'équipe via le contrôle de source |
| **Instructions utilisateur** | `~/.claude/CLAUDE.md`                                                                                                                                                     | Préférences personnelles pour tous les projets                              | Préférences de style de code, raccourcis d'outils personnels                      | Juste vous (tous les projets)                 |

Les fichiers CLAUDE.md dans la hiérarchie de répertoires au-dessus du répertoire de travail sont chargés en intégralité au lancement. Les fichiers CLAUDE.md dans les sous-répertoires se chargent à la demande quand Claude lit les fichiers de ces répertoires. Consultez [Comment les fichiers CLAUDE.md se chargent](#how-claude-md-files-load) pour l'ordre de résolution complet.

Pour les grands projets, vous pouvez diviser les instructions en fichiers spécifiques à un sujet en utilisant les [règles du projet](#organize-rules-with-clauderules). Les règles vous permettent de limiter les instructions à des types de fichiers ou des sous-répertoires spécifiques.

### Configurer un CLAUDE.md de projet

Un CLAUDE.md de projet peut être stocké dans `./CLAUDE.md` ou `./.claude/CLAUDE.md`. Créez ce fichier et ajoutez des instructions qui s'appliquent à quiconque travaille sur le projet : commandes de compilation et de test, normes de codage, décisions architecturales, conventions de nommage et flux de travail courants. Ces instructions sont partagées avec votre équipe via le contrôle de version, donc concentrez-vous sur les normes au niveau du projet plutôt que sur les préférences personnelles.

<Tip>
  Exécutez `/init` pour générer automatiquement un CLAUDE.md de démarrage. Claude analyse votre base de code et crée un fichier avec les commandes de compilation, les instructions de test et les conventions de projet qu'il découvre. Si un CLAUDE.md existe déjà, `/init` suggère des améliorations plutôt que de le remplacer. Affinez-le à partir de là avec les instructions que Claude ne découvrirait pas de lui-même.

Définissez `CLAUDE_CODE_NEW_INIT=true` pour activer un flux interactif multi-phases. `/init` demande quels artefacts configurer : fichiers CLAUDE.md, skills et hooks. Il explore ensuite votre base de code avec un subagent, comble les lacunes via des questions de suivi et présente une proposition vérifiable avant d'écrire des fichiers.
</Tip>

### Écrire des instructions efficaces

Les fichiers CLAUDE.md sont chargés dans la fenêtre de contexte au début de chaque session, consommant des tokens aux côtés de votre conversation. Parce qu'ils sont du contexte plutôt qu'une configuration appliquée, la façon dont vous écrivez les instructions affecte la fiabilité avec laquelle Claude les suit. Les instructions spécifiques, concises et bien structurées fonctionnent mieux.

**Taille** : visez moins de 200 lignes par fichier CLAUDE.md. Les fichiers plus longs consomment plus de contexte et réduisent l'adhérence. Si vos instructions deviennent trop grandes, divisez-les en utilisant les [imports](#import-additional-files) ou les fichiers [`.claude/rules/`](#organize-rules-with-clauderules).

**Structure** : utilisez les en-têtes markdown et les puces pour regrouper les instructions connexes. Claude scanne la structure de la même manière que les lecteurs : les sections organisées sont plus faciles à suivre que les paragraphes denses.

**Spécificité** : écrivez des instructions suffisamment concrètes pour être vérifiables. Par exemple :

- « Utiliser l'indentation à 2 espaces » au lieu de « Formater le code correctement »
- « Exécuter `npm test` avant de valider » au lieu de « Testez vos modifications »
- « Les gestionnaires d'API se trouvent dans `src/api/handlers/` » au lieu de « Gardez les fichiers organisés »

**Cohérence** : si deux règles se contredisent, Claude peut en choisir une arbitrairement. Examinez régulièrement vos fichiers CLAUDE.md, les fichiers CLAUDE.md imbriqués dans les sous-répertoires et les fichiers [`.claude/rules/`](#organize-rules-with-clauderules) pour supprimer les instructions obsolètes ou conflictuelles. Dans les monorepos, utilisez [`claudeMdExcludes`](#exclude-specific-claude-md-files) pour ignorer les fichiers CLAUDE.md d'autres équipes qui ne sont pas pertinents pour votre travail.

### Importer des fichiers supplémentaires

Les fichiers CLAUDE.md peuvent importer des fichiers supplémentaires en utilisant la syntaxe `@path/to/import`. Les fichiers importés sont développés et chargés dans le contexte au lancement aux côtés du CLAUDE.md qui les référence.

Les chemins relatifs et absolus sont autorisés. Les chemins relatifs se résolvent par rapport au fichier contenant l'import, pas au répertoire de travail. Les fichiers importés peuvent importer récursivement d'autres fichiers, avec une profondeur maximale de cinq sauts.

Pour inclure un README, package.json et un guide de flux de travail, référencez-les avec la syntaxe `@` n'importe où dans votre CLAUDE.md :

```text theme={null}
Consultez @README pour un aperçu du projet et @package.json pour les commandes npm disponibles pour ce projet.

# Instructions supplémentaires
- flux de travail git @docs/git-instructions.md
```

Pour les préférences personnelles que vous ne voulez pas valider, importez un fichier de votre répertoire personnel. L'import se trouve dans le CLAUDE.md partagé, mais le fichier vers lequel il pointe reste sur votre machine :

```text theme={null}
# Préférences individuelles
- @~/.claude/my-project-instructions.md
```

<Warning>
  La première fois que Claude Code rencontre des imports externes dans un projet, il affiche une boîte de dialogue d'approbation listant les fichiers. Si vous refusez, les imports restent désactivés et la boîte de dialogue n'apparaît plus.
</Warning>

Pour une approche plus structurée de l'organisation des instructions, consultez [`.claude/rules/`](#organize-rules-with-clauderules).

### AGENTS.md

Claude Code lit `CLAUDE.md`, pas `AGENTS.md`. Si votre référentiel utilise déjà `AGENTS.md` pour d'autres agents de codage, créez un `CLAUDE.md` qui l'importe pour que les deux outils lisent les mêmes instructions sans les dupliquer. Vous pouvez également ajouter des instructions spécifiques à Claude Code en dessous de l'import. Claude charge le fichier importé au démarrage de la session, puis ajoute le reste :

```markdown CLAUDE.md theme={null}
@AGENTS.md

## Claude Code

Utilisez le mode plan pour les modifications sous `src/billing/`.
```

### Comment les fichiers CLAUDE.md se chargent

Claude Code lit les fichiers CLAUDE.md en remontant l'arborescence des répertoires à partir de votre répertoire de travail actuel, en vérifiant chaque répertoire en chemin. Cela signifie que si vous exécutez Claude Code dans `foo/bar/`, il charge les instructions de `foo/bar/CLAUDE.md` et `foo/CLAUDE.md`.

Claude découvre également les fichiers CLAUDE.md dans les sous-répertoires sous votre répertoire de travail actuel. Au lieu de les charger au lancement, ils sont inclus quand Claude lit les fichiers de ces sous-répertoires.

Si vous travaillez dans un grand monorepo où les fichiers CLAUDE.md d'autres équipes sont détectés, utilisez [`claudeMdExcludes`](#exclude-specific-claude-md-files) pour les ignorer.

Les commentaires HTML au niveau des blocs (`<!-- maintainer notes -->`) dans les fichiers CLAUDE.md sont supprimés avant que le contenu ne soit injecté dans le contexte de Claude. Utilisez-les pour laisser des notes aux responsables humains sans dépenser de tokens de contexte. Les commentaires à l'intérieur des blocs de code sont conservés. Quand vous ouvrez un fichier CLAUDE.md directement avec l'outil Read, les commentaires restent visibles.

#### Charger à partir de répertoires supplémentaires

Le drapeau `--add-dir` donne à Claude accès à des répertoires supplémentaires en dehors de votre répertoire de travail principal. Par défaut, les fichiers CLAUDE.md de ces répertoires ne sont pas chargés.

Pour charger également les fichiers CLAUDE.md à partir de répertoires supplémentaires, y compris `CLAUDE.md`, `.claude/CLAUDE.md` et `.claude/rules/*.md`, définissez la variable d'environnement `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` :

```bash theme={null}
CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../shared-config
```

### Organiser les règles avec `.claude/rules/`

Pour les projets plus grands, vous pouvez organiser les instructions en plusieurs fichiers en utilisant le répertoire `.claude/rules/`. Cela garde les instructions modulaires et plus faciles à maintenir pour les équipes. Les règles peuvent également être [limitées à des chemins de fichiers spécifiques](#path-specific-rules), donc elles ne se chargent dans le contexte que quand Claude travaille avec des fichiers correspondants, réduisant le bruit et économisant l'espace de contexte.

<Note>
  Les règles se chargent dans le contexte à chaque session ou quand les fichiers correspondants sont ouverts. Pour les instructions spécifiques à une tâche qui n'ont pas besoin d'être dans le contexte tout le temps, utilisez plutôt les [skills](/fr/skills), qui ne se chargent que quand vous les invoquez ou quand Claude détermine qu'elles sont pertinentes pour votre invite.
</Note>

#### Configurer les règles

Placez les fichiers markdown dans le répertoire `.claude/rules/` de votre projet. Chaque fichier doit couvrir un sujet, avec un nom de fichier descriptif comme `testing.md` ou `api-design.md`. Tous les fichiers `.md` sont découverts récursivement, vous pouvez donc organiser les règles en sous-répertoires comme `frontend/` ou `backend/` :

```text theme={null}
your-project/
├── .claude/
│   ├── CLAUDE.md           # Instructions principales du projet
│   └── rules/
│       ├── code-style.md   # Directives de style de code
│       ├── testing.md      # Conventions de test
│       └── security.md     # Exigences de sécurité
```

Les règles sans [frontmatter `paths`](#path-specific-rules) sont chargées au lancement avec la même priorité que `.claude/CLAUDE.md`.

#### Règles spécifiques au chemin

Les règles peuvent être limitées à des fichiers spécifiques en utilisant le frontmatter YAML avec le champ `paths`. Ces règles conditionnelles ne s'appliquent que quand Claude travaille avec des fichiers correspondant aux modèles spécifiés.

```markdown theme={null}
---
paths:
  - 'src/api/**/*.ts'
---

# Règles de développement d'API

- Tous les points de terminaison d'API doivent inclure la validation des entrées
- Utilisez le format de réponse d'erreur standard
- Incluez les commentaires de documentation OpenAPI
```

Les règles sans champ `paths` sont chargées sans condition et s'appliquent à tous les fichiers. Les règles limitées au chemin se déclenchent quand Claude lit les fichiers correspondant au modèle, pas à chaque utilisation d'outil.

Utilisez les modèles glob dans le champ `paths` pour faire correspondre les fichiers par extension, répertoire ou toute combinaison :

| Modèle                 | Correspond à                                                |
| ---------------------- | ----------------------------------------------------------- |
| `**/*.ts`              | Tous les fichiers TypeScript dans n'importe quel répertoire |
| `src/**/*`             | Tous les fichiers sous le répertoire `src/`                 |
| `*.md`                 | Fichiers Markdown à la racine du projet                     |
| `src/components/*.tsx` | Composants React dans un répertoire spécifique              |

Vous pouvez spécifier plusieurs modèles et utiliser l'expansion entre accolades pour faire correspondre plusieurs extensions dans un seul modèle :

```markdown theme={null}
---
paths:
  - 'src/**/*.{ts,tsx}'
  - 'lib/**/*.ts'
  - 'tests/**/*.test.ts'
---
```

#### Partager les règles entre les projets avec des liens symboliques

Le répertoire `.claude/rules/` supporte les liens symboliques, vous pouvez donc maintenir un ensemble partagé de règles et les lier dans plusieurs projets. Les liens symboliques sont résolus et chargés normalement, et les liens symboliques circulaires sont détectés et gérés correctement.

Cet exemple lie à la fois un répertoire partagé et un fichier individuel :

```bash theme={null}
ln -s ~/shared-claude-rules .claude/rules/shared
ln -s ~/company-standards/security.md .claude/rules/security.md
```

#### Règles au niveau utilisateur

Les règles personnelles dans `~/.claude/rules/` s'appliquent à chaque projet sur votre machine. Utilisez-les pour les préférences qui ne sont pas spécifiques au projet :

```text theme={null}
~/.claude/rules/
├── preferences.md    # Vos préférences de codage personnelles
└── workflows.md      # Vos flux de travail préférés
```

Les règles au niveau utilisateur sont chargées avant les règles du projet, donnant aux règles du projet une priorité plus élevée.

### Gérer CLAUDE.md pour les grandes équipes

Pour les organisations déployant Claude Code dans les équipes, vous pouvez centraliser les instructions et contrôler quels fichiers CLAUDE.md sont chargés.

#### Déployer un CLAUDE.md à l'échelle de l'organisation

Les organisations peuvent déployer un CLAUDE.md géré centralement qui s'applique à tous les utilisateurs sur une machine. Ce fichier ne peut pas être exclu par les paramètres individuels.

<Steps>
  <Step title="Créer le fichier à l'emplacement de la politique gérée">
    * macOS : `/Library/Application Support/ClaudeCode/CLAUDE.md`
    * Linux et WSL : `/etc/claude-code/CLAUDE.md`
    * Windows : `C:\Program Files\ClaudeCode\CLAUDE.md`
  </Step>

  <Step title="Déployer avec votre système de gestion de configuration">
    Utilisez MDM, Group Policy, Ansible ou des outils similaires pour distribuer le fichier sur les machines des développeurs. Consultez les [paramètres gérés](/fr/permissions#managed-settings) pour d'autres options de configuration à l'échelle de l'organisation.
  </Step>
</Steps>

Un CLAUDE.md géré et les [paramètres gérés](/fr/settings#settings-files) servent des objectifs différents. Utilisez les paramètres pour l'application technique et CLAUDE.md pour les conseils comportementaux :

| Préoccupation                                                    | Configurer dans                                            |
| :--------------------------------------------------------------- | :--------------------------------------------------------- |
| Bloquer des outils, commandes ou chemins de fichiers spécifiques | Paramètres gérés : `permissions.deny`                      |
| Appliquer l'isolation du sandbox                                 | Paramètres gérés : `sandbox.enabled`                       |
| Variables d'environnement et routage du fournisseur d'API        | Paramètres gérés : `env`                                   |
| Méthode d'authentification et verrouillage de l'organisation     | Paramètres gérés : `forceLoginMethod`, `forceLoginOrgUUID` |
| Directives de style de code et de qualité                        | CLAUDE.md géré                                             |
| Rappels de traitement des données et de conformité               | CLAUDE.md géré                                             |
| Instructions comportementales pour Claude                        | CLAUDE.md géré                                             |

Les règles de paramètres sont appliquées par le client indépendamment de ce que Claude décide de faire. Les instructions CLAUDE.md façonnent le comportement de Claude mais ne constituent pas une couche d'application stricte.

#### Exclure des fichiers CLAUDE.md spécifiques

Dans les grands monorepos, les fichiers CLAUDE.md ancêtres peuvent contenir des instructions qui ne sont pas pertinentes pour votre travail. Le paramètre `claudeMdExcludes` vous permet d'ignorer des fichiers spécifiques par chemin ou modèle glob.

Cet exemple exclut un CLAUDE.md de niveau supérieur et un répertoire de règles d'un dossier parent. Ajoutez-le à `.claude/settings.local.json` pour que l'exclusion reste locale à votre machine :

```json theme={null}
{
  "claudeMdExcludes": [
    "**/monorepo/CLAUDE.md",
    "/home/user/monorepo/other-team/.claude/rules/**"
  ]
}
```

Les modèles sont comparés aux chemins de fichiers absolus en utilisant la syntaxe glob. Vous pouvez configurer `claudeMdExcludes` à n'importe quel [niveau de paramètres](/fr/settings#settings-files) : utilisateur, projet, local ou politique gérée. Les tableaux fusionnent entre les niveaux.

Les fichiers CLAUDE.md de politique gérée ne peuvent pas être exclus. Cela garantit que les instructions à l'échelle de l'organisation s'appliquent toujours indépendamment des paramètres individuels.

## Mémoire automatique

La mémoire automatique permet à Claude d'accumuler des connaissances d'une session à l'autre sans que vous n'écriviez rien. Claude enregistre des notes pour lui-même au fur et à mesure qu'il travaille : commandes de compilation, insights de débogage, notes d'architecture, préférences de style de code et habitudes de flux de travail. Claude ne sauvegarde pas quelque chose à chaque session. Il décide ce qui vaut la peine d'être mémorisé en fonction de si l'information serait utile dans une conversation future.

<Note>
  La mémoire automatique nécessite Claude Code v2.1.59 ou ultérieur. Vérifiez votre version avec `claude --version`.
</Note>

### Activer ou désactiver la mémoire automatique

La mémoire automatique est activée par défaut. Pour la basculer, ouvrez `/memory` dans une session et utilisez le bouton bascule de mémoire automatique, ou définissez `autoMemoryEnabled` dans vos paramètres de projet :

```json theme={null}
{
  "autoMemoryEnabled": false
}
```

Pour désactiver la mémoire automatique via une variable d'environnement, définissez `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`.

### Emplacement de stockage

Chaque projet obtient son propre répertoire de mémoire à `~/.claude/projects/<project>/memory/`. Le chemin `<project>` est dérivé du référentiel git, donc tous les worktrees et sous-répertoires dans le même référentiel partagent un répertoire de mémoire automatique. En dehors d'un référentiel git, la racine du projet est utilisée à la place.

Pour stocker la mémoire automatique dans un emplacement différent, définissez `autoMemoryDirectory` dans vos paramètres utilisateur ou locaux :

```json theme={null}
{
  "autoMemoryDirectory": "~/my-custom-memory-dir"
}
```

Ce paramètre est accepté à partir des paramètres de politique, locaux et utilisateur. Il n'est pas accepté à partir des paramètres de projet (`.claude/settings.json`) pour empêcher un projet partagé de rediriger les écritures de mémoire automatique vers des emplacements sensibles.

Le répertoire contient un point d'entrée `MEMORY.md` et des fichiers de sujet optionnels :

```text theme={null}
~/.claude/projects/<project>/memory/
├── MEMORY.md          # Index concis, chargé dans chaque session
├── debugging.md       # Notes détaillées sur les modèles de débogage
├── api-conventions.md # Décisions de conception d'API
└── ...                # Tout autre fichier de sujet que Claude crée
```

`MEMORY.md` agit comme un index du répertoire de mémoire. Claude lit et écrit des fichiers dans ce répertoire tout au long de votre session, en utilisant `MEMORY.md` pour garder une trace de ce qui est stocké où.

La mémoire automatique est locale à la machine. Tous les worktrees et sous-répertoires dans le même référentiel git partagent un répertoire de mémoire automatique. Les fichiers ne sont pas partagés entre les machines ou les environnements cloud.

### Comment ça marche

Les 200 premières lignes de `MEMORY.md` sont chargées au début de chaque conversation. Le contenu au-delà de la ligne 200 n'est pas chargé au démarrage de la session. Claude garde `MEMORY.md` concis en déplaçant les notes détaillées dans des fichiers de sujet séparés.

Cette limite de 200 lignes s'applique uniquement à `MEMORY.md`. Les fichiers CLAUDE.md sont chargés en intégralité indépendamment de la longueur, bien que les fichiers plus courts produisent une meilleure adhérence.

Les fichiers de sujet comme `debugging.md` ou `patterns.md` ne sont pas chargés au démarrage. Claude les lit à la demande en utilisant ses outils de fichiers standard quand il a besoin de l'information.

Claude lit et écrit les fichiers de mémoire pendant votre session. Quand vous voyez « Writing memory » ou « Recalled memory » dans l'interface Claude Code, Claude met activement à jour ou lit à partir de `~/.claude/projects/<project>/memory/`.

### Auditer et modifier votre mémoire

Les fichiers de mémoire automatique sont du markdown brut que vous pouvez modifier ou supprimer à tout moment. Exécutez [`/memory`](#view-and-edit-with-memory) pour parcourir et ouvrir les fichiers de mémoire à partir d'une session.

## Afficher et modifier avec `/memory`

La commande `/memory` liste tous les fichiers CLAUDE.md et rules chargés dans votre session actuelle, vous permet de basculer la mémoire automatique activée ou désactivée, et fournit un lien pour ouvrir le dossier de mémoire automatique. Sélectionnez n'importe quel fichier pour l'ouvrir dans votre éditeur.

Quand vous demandez à Claude de se souvenir de quelque chose, comme « toujours utiliser pnpm, pas npm » ou « se souvenir que les tests d'API nécessitent une instance Redis locale », Claude l'enregistre dans la mémoire automatique. Pour ajouter des instructions à CLAUDE.md à la place, demandez directement à Claude, comme « ajouter ceci à CLAUDE.md », ou modifiez le fichier vous-même via `/memory`.

## Dépanner les problèmes de mémoire

Ce sont les problèmes les plus courants avec CLAUDE.md et la mémoire automatique, ainsi que les étapes pour les déboguer.

### Claude ne suit pas mon CLAUDE.md

Le contenu CLAUDE.md est livré en tant que message utilisateur après l'invite système, pas en tant que partie de l'invite système elle-même. Claude le lit et essaie de le suivre, mais il n'y a aucune garantie de conformité stricte, surtout pour les instructions vagues ou conflictuelles.

Pour déboguer :

- Exécutez `/memory` pour vérifier que vos fichiers CLAUDE.md sont chargés. Si un fichier n'est pas listé, Claude ne peut pas le voir.
- Vérifiez que le CLAUDE.md pertinent se trouve dans un emplacement qui se charge pour votre session (consultez [Choisir où placer les fichiers CLAUDE.md](#choose-where-to-put-claude-md-files)).
- Rendez les instructions plus spécifiques. « Utiliser l'indentation à 2 espaces » fonctionne mieux que « formater le code correctement ».
- Recherchez les instructions conflictuelles dans les fichiers CLAUDE.md. Si deux fichiers donnent des conseils différents pour le même comportement, Claude peut en choisir un arbitrairement.

Pour les instructions que vous voulez au niveau de l'invite système, utilisez [`--append-system-prompt`](/fr/cli-reference#system-prompt-flags). Cela doit être passé à chaque invocation, donc c'est mieux adapté aux scripts et à l'automatisation qu'à l'utilisation interactive.

<Tip>
  Utilisez le [hook `InstructionsLoaded`](/fr/hooks#instructionsloaded) pour enregistrer exactement quels fichiers d'instructions sont chargés, quand ils se chargent et pourquoi. C'est utile pour déboguer les règles spécifiques au chemin ou les fichiers chargés tardivement dans les sous-répertoires.
</Tip>

### Je ne sais pas ce que la mémoire automatique a enregistré

Exécutez `/memory` et sélectionnez le dossier de mémoire automatique pour parcourir ce que Claude a enregistré. Tout est du markdown brut que vous pouvez lire, modifier ou supprimer.

### Mon CLAUDE.md est trop volumineux

Les fichiers de plus de 200 lignes consomment plus de contexte et peuvent réduire l'adhérence. Déplacez le contenu détaillé dans des fichiers séparés référencés avec les imports `@path` (consultez [Importer des fichiers supplémentaires](#import-additional-files)), ou divisez vos instructions entre les fichiers `.claude/rules/`.

### Les instructions semblent perdues après `/compact`

CLAUDE.md survit complètement à la compaction. Après `/compact`, Claude relit votre CLAUDE.md à partir du disque et le réinjecte à nouveau dans la session. Si une instruction a disparu après la compaction, elle a été donnée uniquement dans la conversation, pas écrite dans CLAUDE.md. Ajoutez-la à CLAUDE.md pour la rendre persistante d'une session à l'autre.

Consultez [Écrire des instructions efficaces](#write-effective-instructions) pour des conseils sur la taille, la structure et la spécificité.

## Ressources connexes

- [Skills](/fr/skills) : empaquetez les flux de travail répétables qui se chargent à la demande
- [Paramètres](/fr/settings) : configurez le comportement de Claude Code avec les fichiers de paramètres
- [Gérer les sessions](/fr/sessions) : gérez le contexte, reprenez les conversations et exécutez les sessions parallèles
- [Mémoire des subagents](/fr/sub-agents#enable-persistent-memory) : laissez les subagents maintenir leur propre mémoire automatique
