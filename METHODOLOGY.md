# Méthodologie de refonte d'un composant — Référence projet

> Document destiné à être partagé avec tout LLM (Claude, GPT, Gemini, etc.) ou collaborateur humain au démarrage d'une mission de refonte significative d'un composant existant.
>
> Cette méthodologie a été éprouvée sur la refonte TrainProgressBar V1 (11 commits atomiques, zéro régression, sortie en pré-launch propre).

---

## 1. Principes fondateurs (non-négociables)

### 1.1 — Audit avant toute modification

**Aucune écriture de code avant un audit read-only complet** de la zone concernée. L'audit doit produire un rapport structuré qui répond a minima à :

- Périmètre exact des fichiers concernés (chemins absolus).
- Dépendances entrantes (qui consomme ce code ?) et sortantes (que consomme-t-il ?).
- État des tests existants couvrant la zone.
- Tokens / clés i18n / assets éventuellement orphelins ou impactés.
- Effets de bord prévisibles.

**Règle d'or** : si l'agent (LLM ou humain) propose une modification sans avoir d'abord audité, on l'arrête.

### 1.2 — Show before writing

Aucune écriture de fichier sans **avoir d'abord proposé le diff complet** et obtenu une validation explicite. Cette discipline élimine les surprises et permet de challenger chaque décision avant qu'elle ne soit gravée.

**Format attendu** d'une proposition de diff :

- Liste exhaustive des fichiers (créés / modifiés / supprimés).
- Contenu complet de chaque fichier créé.
- Diff exact pour chaque fichier modifié.
- Justification des choix techniques non triviaux.
- Signalement explicite des arbitrages produit à valider.

### 1.3 — Commits atomiques avec responsabilité unique

**Un commit = une responsabilité claire**, indépendamment revertable. Le repo doit rester fonctionnel après chaque commit.

**Exceptions explicites et documentées** (par exemple : un commit qui regroupe migration DB + adaptation front parce que les séparer créerait un état intermédiaire incohérent) doivent être justifiées dans le message de commit lui-même.

### 1.4 — Sanity check exhaustif après chaque écriture

Avant tout `git commit`, une vérification ventilée par catégorie :

- Fichiers modifiés / créés / supprimés (avec compteurs de lignes).
- Imports retirés / ajoutés (liste exhaustive, pas d'agrégats).
- Props supprimées (liste).
- Tokens / clés i18n ajoutés ou retirés.
- Comportements testés (avec compteurs).
- Effets de bord identifiés.
- Chaîne qualité : format, lint, type-check, tests, build — tous au vert.

**Pas de dénombrement par "famille"** ou par agrégat — toujours la liste exhaustive. C'est précisément cette discipline qui attrape les erreurs subtiles ("10 signatures dans 4 familles" peut cacher 5 fonctions au lieu de 4).

### 1.5 — Never amend, never force-push

Une fois un commit créé, il est immuable. Toute correction (même triviale, même locale, même pré-poussée) passe par un **nouveau commit** explicite (`style:`, `fix:`, `chore:` selon le cas).

La barrière "never amend" est binaire. Y déroger une seule fois ouvre une brèche durable ("c'était local et mineur" → "c'est sur staging mais pas prod" → "c'est en prod mais petit").

### 1.6 — DB-first quand applicable

Si le projet a une discipline DB-first (logique métier en DB via contraintes, triggers, RLS), le front ne réplique JAMAIS cette logique. Il oriente l'utilisateur et gère proprement les erreurs DB ("permission denied", "check violation", etc.).

### 1.7 — Tokens-first pour le styling

Si le projet a un design system tokenisé, aucune valeur CSS hardcodée n'est tolérée. Si un nouveau token est requis, il est **signalé explicitement** pour validation, jamais créé en silence.

---

## 2. Phases standardisées d'une refonte

### Phase 0 — Audit initial complet (read-only obligatoire)

**Objectif** : produire un rapport exhaustif de l'état actuel avant toute proposition de modification.

**Contenu attendu** :

- Cartographie des fichiers du composant et de ses dépendances.
- Recensement des usages externes (qui consomme le composant ?).
- Inventaire des constantes, tokens, assets, clés i18n liés.
- État des tests existants.
- Identification des écarts entre l'intention documentée et la réalité du code (code mort, dépendances obsolètes, etc.).
- Signalement des points d'arbitrage produit non-tranchés.

**Livrable** : un rapport markdown structuré, livré avant toute autre action.

**Critère d'acceptation** : tout point d'audit non trivial est signalé comme arbitrage produit avant que la Phase 1 ne démarre.

### Phase 1 — Migration de données / schéma (si applicable)

**Objectif** : préparer la couche persistance avant tout changement front.

**Découpage typique en sous-phases** :

- 1.a — Modification de schéma (nouvelles colonnes, contraintes).
- 1.b — Création de nouvelles tables si nécessaire.
- 1.c — Seed de données initiales.

**Principes** :

- Toute migration est **idempotente** et **safe-replay** (utilisation de `IF NOT EXISTS`, conditions `WHERE` qui ne ré-écrasent pas les valeurs déjà modifiées).
- Commentaire de tête de migration documentant l'intention business (pas juste le "quoi", aussi le "pourquoi").
- Pas de suppression de colonne dans la phase de migration — déprécation en 2 temps (ajout, puis suppression dans une phase ultérieure après validation production).

### Phase 2 — Refonte du cœur du composant

**Objectif** : retravailler le composant lui-même selon les nouveaux principes.

**Découpage typique** :

- 2.a — Création de nouveaux hooks ou utilitaires nécessaires (isolés, testés).
- 2.b — Refonte du composant principal (TSX + SCSS + tokens + i18n).

**Vigilances spécifiques** :

- **Séparation lecture/écriture** : si le composant mélangeait lecture et écriture, séparer en deux composants distincts (read-only pour les contextes d'affichage, write-capable pour les contextes de configuration).
- **Accessibilité** : ajouter ou renforcer les attributs ARIA (`role`, `aria-valuenow`, `aria-label`, etc.).
- **Performance** : respecter `prefers-reduced-motion`, éviter les animations infinies ambient.
- **Découplage tokens / runtime** : éviter d'injecter des CSS variables depuis le JS quand un attribut HTML + sélecteurs CSS peut faire le travail.

### Phase 3 — Création des composants de configuration adjacents

**Objectif** : si la refonte sépare lecture/écriture, créer le composant de configuration séparé.

**Principes** :

- Composant **isolé et non encore monté** dans un premier temps (compile, testable, mais pas en production).
- Tests unitaires couvrant les comportements clés (rendu, interactions, états spéciaux comme Visitor / mode lecture seule).
- Réutilisation des composants UI existants (Toggle, Card, etc.) plutôt que création de variantes locales.

### Phase 4 — Intégration

**Objectif** : monter les nouveaux composants dans l'arborescence applicative.

**Principes** :

- Découper en commits atomiques :
  - Migration des données persistées (localStorage → DB par exemple).
  - Intégration du nouveau composant.
  - Suppression des anciens points d'entrée (en commit séparé pour permettre une redondance temporaire qui sécurise le revert).

### Phase 5 — Nettoyage

**Objectif** : supprimer tout le code mort rendu orphelin par les phases précédentes.

**Principes** :

- Un seul commit groupant les suppressions cohérentes.
- Audit préalable : confirmer qu'aucun élément n'est encore référencé.
- `grep -r` sur chaque élément supprimé doit être vide après le commit.

### Phase 6 (optionnelle) — Déprécation finale en DB

**Objectif** : supprimer les colonnes ou structures DB conservées pour rollback.

**Principe** : ne se fait QUE après plusieurs semaines de validation en production sans incident.

---

## 3. Posture du LLM / assistant pendant la mission

### 3.1 — Challenger systématiquement, pas valider par défaut

Le rôle du LLM n'est pas d'approuver tout ce que propose l'utilisateur. Il doit :

- Signaler les incohérences logiques ou produit.
- Proposer des alternatives plus simples ou plus robustes.
- Refuser explicitement les raccourcis qui érodent la qualité (amend, force-push, hardcode, etc.).

**Règle de décision** :

- Acceptable mais sous-optimal → le dire avec proposition d'alternative.
- Élégant mais dangereux pour l'utilisateur final / la maintenabilité → refuser et proposer une alternative.
- Alternative plus simple et plus sûre → la proposer même si non-demandée.

### 3.2 — Signalement proactif des arbitrages produit

Tout point qui dépasse la pure exécution technique doit être **remonté comme arbitrage produit**, jamais absorbé silencieusement par une heuristique de l'agent.

Exemple : si l'agent doit choisir entre 2 patterns d'implémentation qui ont des conséquences UX différentes, il pose la question. Il ne tranche pas.

### 3.3 — Honnêteté sur la connaissance partielle

Si l'agent ne sait pas, il le dit. Si une convention projet n'est pas claire dans son contexte, il demande. Si une décision repose sur un précédent qu'il invente, il signale qu'il extrapole.

**Anti-pattern à éviter** : pattern-matcher sur un comportement précédent sans vérifier qu'il s'applique au cas courant.

### 3.4 — Rapport d'effets de bord, jamais silencieux

Toute modification qui affecte au-delà du périmètre demandé est signalée explicitement :

- Imports devenus orphelins.
- Tests qui doivent être adaptés.
- Composants tiers impactés.
- Clés i18n désormais sans usage.

---

## 4. Gestion des erreurs et imprévus

### 4.1 — Tests flaky

Un test qui plante de manière intermittente est un signal, pas un bruit à ignorer. Documenter chaque occurrence pour identifier les patterns (toujours le même test ? sous charge ? après un autre test spécifique ?).

**Règle face à une flakiness identifiée** :

- Maximum 3 tentatives consécutives sur le même commit.
- Au-delà, STOP et investigation séparée.
- **Jamais de bypass** via `--no-verify` ou skip silencieux.

### 4.2 — Outillage divergent

Si un outil (CLI, formateur, type-checker) produit des résultats différents entre développeurs ou environnements, c'est une dette à traiter avant toute autre chose (ou au minimum à isoler dans un commit dédié `chore(tooling):` qui n'est pas mélangé avec un commit de feature).

### 4.3 — Découverte de code mort en cours de mission

Le code mort identifié pendant une mission est **noté** mais pas supprimé dans le commit en cours (sauf s'il bloque la compilation). Il est groupé dans la Phase 5 finale pour cohérence.

### 4.4 — Décisions produit non anticipées

Si une décision produit non-prévue émerge en cours d'exécution (par exemple : "le défaut DB de cette colonne va causer une régression silencieuse pour les utilisateurs existants"), l'agent **arrête tout** et demande arbitrage. Pas de décision unilatérale.

---

## 5. Conventions de commits et de messages

### 5.1 — Conventional commits

Préfixe systématique : `feat`, `refactor`, `fix`, `chore`, `style`, `docs`, `test`, `perf`.

Portée entre parenthèses si pertinente : `feat(settings)`, `refactor(taches)`, `chore(supabase)`.

### 5.2 — Structure du message de commit

<type>(<scope>): <résumé court à l'impératif présent>
<paragraphe décrivant le contexte et le pourquoi>
<liste à puces des changements concrets>
<paragraphe non-régression : ce qui ne change PAS, ce qui reste
fonctionnel, signalement de hors-périmètre>
<note de dette éventuelle ou phase suivante prévue>

### 5.3 — Pas de trailer `Co-Authored-By` automatique avec un agent IA

Si l'utilisateur ne pratique pas déjà ce trailer, ne pas l'introduire au milieu de la mission. L'historique git doit refléter une politique cohérente, pas un choix au cas par cas.

---

## 6. Communication entre l'utilisateur, l'agent stratège (Claude / GPT / Gemini conversationnel) et l'agent d'exécution (Claude Code CLI / Cursor / etc.)

### 6.1 — Rôle des deux agents

- **Agent stratège** (conversationnel) : cadrage, arbitrages produit, validation de diffs, challenge des décisions, gestion de la dette.
- **Agent d'exécution** (CLI) : audit read-only, écriture des fichiers, exécution des migrations, lancement de la chaîne qualité, création des commits.

**L'utilisateur fait le pont** entre les deux. Il copie-colle les rapports de l'agent d'exécution vers l'agent stratège pour validation, et les arbitrages tranchés par l'agent stratège vers l'agent d'exécution pour application.

### 6.2 — Format des prompts à l'agent d'exécution

Toute mission à l'agent d'exécution doit contenir :

- **Le rôle** (ex. expert senior backend / frontend / DB).
- **Le contexte produit** (3-5 lignes sur le projet).
- **Les principes non-négociables** (audit-first, show-before-writing, etc.).
- **Le périmètre exact** de la mission (fichiers, comportements attendus).
- **Les arbitrages déjà tranchés** (pour éviter qu'il les rouvre).
- **Le modèle et l'effort recommandés** (par exemple : `/model sonnet`, effort medium).
- **Les modalités de sortie** (sanity check exhaustif, message de commit pour validation, etc.).
- **Les points de STOP explicites** (quand attendre validation utilisateur).

### 6.3 — Économie de tokens

- **Opus** pour le cadrage initial dense et les décisions produit complexes.
- **Sonnet** pour l'exécution mécanique guidée.
- **Haiku** pour les audits read-only purs.
- Switch explicite entre modèles selon la phase. Ne pas rester en Opus pour des opérations mécaniques.

### 6.4 — Sanity check post-compaction

Si la session de l'agent d'exécution est compactée (perte de contexte), **ne pas reprendre tel quel**. Demander une mise à plat de l'état actuel avant de poursuivre :

- État git (log, status).
- État DB local (si applicable).
- État des fichiers du périmètre.
- Confirmation de la mémoire des arbitrages clés tranchés précédemment.

Si la mémoire de l'agent est lacunaire sur un point, le re-fournir avant de continuer.

---

## 7. Critères de succès d'une mission de refonte

Une refonte est considérée réussie si **tous** les critères suivants sont atteints :

- [ ] Aucune régression fonctionnelle introduite (toutes les fonctionnalités préexistantes marchent).
- [ ] Histoire git lisible : chaque commit est atomique, indépendamment revertable, avec un message clair.
- [ ] Tous les tests passent en CI (en isolation et en plein-suite).
- [ ] Chaîne qualité au vert : format, lint, type-check, tests, build.
- [ ] Aucune valeur hardcodée non-tokenisée (si projet à design system).
- [ ] Aucune dette nouvelle introduite sans avoir été explicitement documentée.
- [ ] La dette préexistante non traitée est listée dans un BACKLOG.md ou équivalent.
- [ ] Les composants nouveaux sont couverts par des tests unitaires.
- [ ] Aucune information sensible (clés API, données utilisateur) en code en clair.
- [ ] Documentation des décisions produit non-triviales (dans les commits, les mémoires projet, ou un ADR).

---

## 8. Anti-patterns à éviter

### 8.1 — Le "raccourci local"

> "C'est juste local, pas poussé, donc je peux amend / force-push / hardcoder."

**Faux**. La discipline se construit dans les moments de moindre coût. Y déroger une fois ouvre une brèche durable.

### 8.2 — Le "scope creep silencieux"

L'agent qui découvre une dette adjacente et la traite "tant qu'il y est" sans demander. Cela mélange les responsabilités du commit et complique le revert.

**Bon comportement** : signaler la dette, demander si elle entre dans le scope, attendre validation. Si non, ajouter au backlog.

### 8.3 — Le pattern-matching sur un précédent obsolète

L'agent qui copie un pattern d'un fichier existant sans vérifier que le pattern est encore la convention du projet. Le code existant peut être de la dette ; ce n'est pas une référence absolue.

### 8.4 — La sur-validation aveugle

L'utilisateur qui valide en bloc sans lire le diff. Une discipline `show before writing` ne marche que si l'utilisateur joue son rôle de lecteur critique.

### 8.5 — Le silence sur les arbitrages

L'agent qui tranche silencieusement des décisions produit ("j'ai choisi cette couleur parce qu'elle me semblait jolie", "j'ai mis cette animation parce que c'était cohérent"). Toute décision esthétique ou UX doit être remontée comme arbitrage.

### 8.6 — La double garde implicite

Au refactoring, retirer une garde parent en supposant que le composant a une garde interne (ou inversement) sans vérifier. Toujours décider explicitement où vit la garde et le documenter.

---

## 9. Adaptation à un nouveau projet

Pour adapter cette méthodologie à un projet spécifique, la première étape est de documenter :

1. **Les principes non-négociables du projet** (DB-first ? tokens-first ? mobile-first ? accessibilité ? etc.).
2. **Le stack technique** (framework, langage, ORM, design system, outils de test).
3. **Les conventions de commits déjà en place** (préfixes, scopes, format des messages).
4. **Les hooks pre-commit existants** (quels checks bloquent un commit).
5. **L'architecture des tests** (où vivent-ils, quel runner, quelles conventions de mocks).
6. **Les contraintes UX spécifiques au domaine** (TSA, accessibilité renforcée, mobile uniquement, etc.).

Ces éléments doivent être communiqués à tout nouvel agent (LLM ou humain) au démarrage d'une mission.

---

## 10. Mise à jour de cette méthodologie

Ce document est vivant. À chaque mission de refonte, capturer les enseignements nouveaux et les intégrer ici. Les patterns qui marchent deviennent règles ; les anti-patterns rencontrés deviennent contre-exemples.

**Version actuelle** : v1.0, issue de la refonte TrainProgressBar V1 (mai 2026).

---

_Document à partager intégralement avec tout LLM ou collaborateur humain au démarrage d'une mission de refonte d'un composant significatif. La méthodologie n'a de valeur que si elle est appliquée intégralement — picorer des principes en isolation produit des résultats médiocres._
