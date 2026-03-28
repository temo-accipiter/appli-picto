Dans le tableau ci-dessous, `<arg>` indique un argument obligatoire et `[arg]` indique un argument facultatif.

| `/add-dir <path>` | Ajouter un nouveau répertoire de travail à la session actuelle |

| `/agents` | Gérer les configurations des [agents](/fr/sub-agents) |

| `/btw <question>` | Poser une [question rapide](/fr/interactive-mode#side-questions-with-btw) sans l'ajouter à la conversation |

| `/chrome` | Configurer les paramètres de [Claude dans Chrome](/fr/chrome) |

| `/clear` | Effacer l'historique de la conversation et libérer du contexte. Alias : `/reset`, `/new` |

| `/color [color\|default]` | Définir la couleur de la barre d'invite pour la session actuelle. Couleurs disponibles : `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`. Utilisez `default` pour réinitialiser |

| `/compact [instructions]` | Compacter la conversation avec des instructions de focus optionnelles |

| `/config` | Ouvrir l'interface des [Paramètres](/fr/settings) pour ajuster le thème, le modèle, le [style de sortie](/fr/output-styles) et d'autres préférences. Alias : `/settings` |

| `/context` | Visualiser l'utilisation actuelle du contexte sous forme de grille colorée. Affiche les suggestions d'optimisation pour les outils gourmands en contexte, le surpoids de la mémoire et les avertissements de capacité |

| `/copy [N]` | Copier la dernière réponse de l'assistant dans le presse-papiers. Passez un nombre `N` pour copier la Nième réponse la plus récente : `/copy 2` copie l'avant-dernière. Lorsque des blocs de code sont présents, affiche un sélecteur interactif pour sélectionner des blocs individuels ou la réponse complète. Appuyez sur `w` dans le sélecteur pour écrire la sélection dans un fichier au lieu du presse-papiers, ce qui est utile via SSH |

| `/cost` | Afficher les statistiques d'utilisation des tokens. Consultez le [guide de suivi des coûts](/fr/costs#using-the-cost-command) pour les détails spécifiques à l'abonnement |

| `/desktop` | Continuer la session actuelle dans l'application Claude Code Desktop. macOS et Windows uniquement. Alias : `/app` |

| `/diff` | Ouvrir un visualiseur de diff interactif montrant les modifications non validées et les diffs par tour. Utilisez les flèches gauche/droite pour basculer entre le diff git actuel et les tours Claude individuels, et haut/bas pour parcourir les fichiers |

| `/doctor` | Diagnostiquer et vérifier votre installation et vos paramètres Claude Code |

| `/effort [low\|medium\|high\|max\|auto]` | Définir le [niveau d'effort](/fr/model-config#adjust-effort-level) du modèle. `low`, `medium` et `high` persistent entre les sessions. `max` s'applique à la session actuelle uniquement et nécessite Opus 4.6. `auto` réinitialise à la valeur par défaut du modèle. Sans argument, affiche le niveau actuel. Prend effet immédiatement sans attendre la fin de la réponse actuelle |

| `/exit` | Quitter le CLI. Alias : `/quit` |

| `/export [filename]` | Exporter la conversation actuelle en texte brut. Avec un nom de fichier, écrit directement dans ce fichier. Sans, ouvre une boîte de dialogue pour copier dans le presse-papiers ou enregistrer dans un fichier |

| `/extra-usage` | Configurer l'utilisation supplémentaire pour continuer à travailler lorsque les limites de débit sont atteintes |

| `/fast [on\|off]` | Activer ou désactiver le [mode rapide](/fr/fast-mode) |

| `/feedback [report]` | Soumettre des commentaires sur Claude Code. Alias : `/bug` |

| `/branch [name]` | Créer une branche de la conversation actuelle à ce stade. Alias : `/fork` |

| `/help` | Afficher l'aide et les commandes disponibles |

| `/hooks` | Afficher les configurations des [hooks](/fr/hooks) pour les événements d'outils |

| `/ide` | Gérer les intégrations IDE et afficher l'état |

| `/init` | Initialiser le projet avec un guide `CLAUDE.md`. Définissez `CLAUDE_CODE_NEW_INIT=true` pour un flux interactif qui vous guide également à travers les skills, les hooks et les fichiers de mémoire personnelle |

| `/insights` | Générer un rapport analysant vos sessions Claude Code, y compris les domaines de projet, les modèles d'interaction et les points de friction |

| `/install-github-app` | Configurer l'application [Claude GitHub Actions](/fr/github-actions) pour un référentiel. Vous guide dans la sélection d'un référentiel et la configuration de l'intégration |

| `/install-slack-app` | Installer l'application Claude Slack. Ouvre un navigateur pour terminer le flux OAuth |
| `/keybindings` | Ouvrir ou créer votre fichier de configuration des raccourcis clavier |

| `/login` | Se connecter à votre compte Anthropic |

| `/logout` | Se déconnecter de votre compte Anthropic |

| `/mcp` | Gérer les connexions aux serveurs MCP et l'authentification OAuth |

| `/memory` | Modifier les fichiers de mémoire `CLAUDE.md`, activer ou désactiver la [mémoire automatique](/fr/memory#auto-memory) et afficher les entrées de mémoire automatique |

| `/mobile` | Afficher le code QR pour télécharger l'application mobile Claude. Alias : `/ios`, `/android` |

| `/model [model]` | Sélectionner ou modifier le modèle IA. Pour les modèles qui le supportent, utilisez les flèches gauche/droite pour [ajuster le niveau d'effort](/fr/model-config#adjust-effort-level). Le changement prend effet immédiatement sans attendre la fin de la réponse actuelle |

| `/passes` | Partager une semaine gratuite de Claude Code avec des amis. Visible uniquement si votre compte est éligible |

| `/permissions` | Afficher ou mettre à jour les [permissions](/fr/permissions#manage-permissions). Alias : `/allowed-tools` |

| `/plan [description]` | Entrer directement en mode plan à partir de l'invite. Passez une description optionnelle pour entrer en mode plan et commencer immédiatement avec cette tâche, par exemple `/plan fix the auth bug` |

| `/plugin` | Gérer les [plugins](/fr/plugins) de Claude Code |

| `/pr-comments [PR]` | Récupérer et afficher les commentaires d'une demande de tirage GitHub. Détecte automatiquement la PR pour la branche actuelle, ou passez une URL ou un numéro de PR. Nécessite le CLI `gh` |

| `/privacy-settings` | Afficher et mettre à jour vos paramètres de confidentialité. Disponible uniquement pour les abonnés aux plans Pro et Max |

| `/release-notes` | Afficher le journal des modifications complet, avec la version la plus récente la plus proche de votre invite |

| `/reload-plugins` | Recharger tous les [plugins](/fr/plugins) actifs pour appliquer les modifications en attente sans redémarrer. Signale les comptages pour chaque composant rechargé et signale les erreurs de chargement |

| `/remote-control` | Rendre cette session disponible pour le [contrôle à distance](/fr/remote-control) depuis claude.ai. Alias : `/rc` |

| `/remote-env` | Configurer l'environnement distant par défaut pour les [sessions web démarrées avec `--remote`](/fr/claude-code-on-the-web#environment-configuration) |

| `/rename [name]` | Renommer la session actuelle et afficher le nom sur la barre d'invite. Sans nom, génère automatiquement un à partir de l'historique de la conversation |

| `/resume [session]` | Reprendre une conversation par ID ou nom, ou ouvrir le sélecteur de session. Alias : `/continue` |

| `/review` | Obsolète. Installez plutôt le [plugin `code-review`](https://github.com/anthropics/claude-code-marketplace/blob/main/code-review/README.md) : `claude plugin install code-review@claude-code-marketplace` |

| `/rewind` | Rembobiner la conversation et/ou le code à un point antérieur, ou résumer à partir d'un message sélectionné. Consultez [checkpointing](/fr/checkpointing). Alias : `/checkpoint` |

| `/sandbox` | Activer/désactiver le [mode sandbox](/fr/sandboxing). Disponible sur les plateformes supportées uniquement |

| `/schedule [description]` | Créer, mettre à jour, lister ou exécuter des [tâches planifiées Cloud](/fr/web-scheduled-tasks). Claude vous guide à travers la configuration de manière conversationnelle |

| `/security-review` | Analyser les modifications en attente sur la branche actuelle pour les vulnérabilités de sécurité. Examine le diff git et identifie les risques comme l'injection, les problèmes d'authentification et l'exposition de données |

| `/skills` | Lister les [skills](/fr/skills) disponibles |

| `/stats` | Visualiser l'utilisation quotidienne, l'historique des sessions, les séries et les préférences de modèle |

| `/status` | Ouvrir l'interface des Paramètres (onglet Statut) affichant la version, le modèle, le compte et la connectivité. Fonctionne pendant que Claude répond, sans attendre la fin de la réponse actuelle |

| `/statusline` | Configurer la [ligne de statut](/fr/statusline) de Claude Code. Décrivez ce que vous voulez, ou exécutez sans arguments pour auto-configurer à partir de votre invite shell |

| `/stickers` | Commander des autocollants Claude Code |

| `/tasks` | Lister et gérer les tâches en arrière-plan |

| `/terminal-setup` | Configurer les raccourcis clavier du terminal pour Shift+Entrée et d'autres raccourcis. Visible uniquement dans les terminaux qui en ont besoin, comme VS Code, Alacritty ou Warp |

| `/theme` | Modifier le thème de couleur. Inclut les variantes claires et sombres, les thèmes accessibles aux daltoniens (daltonisés) et les thèmes ANSI qui utilisent la palette de couleurs de votre terminal |

| `/upgrade` | Ouvrir la page de mise à niveau pour passer à un niveau de plan supérieur |

| `/usage` | Afficher les limites d'utilisation du plan et l'état de la limite de débit |

| `/vim` | Basculer entre les modes d'édition Vim et Normal |

| `/voice` | Activer/désactiver la [dictée vocale](/fr/voice-dictation) push-to-talk. Nécessite un compte Claude.ai |
