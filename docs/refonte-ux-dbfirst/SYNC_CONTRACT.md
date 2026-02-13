# SYNC_CONTRACT.md — Contrat Synchronisation & Offline

> **Phase** : 10 (documentation only — 0 migrations DB)
> **Date** : 2026-02-06
> **Sources** : `ux.md`, `PRODUCT_MODEL.md` (Ch.8), `DB_BLUEPRINT.md` (§2, §4), migrations Phases 5–9
> **Approche** : DB-first strict — ce document formalise les règles de synchronisation pour le frontend, sans introduire aucune table, colonne ni trigger.

---

## 0. Objectif et portée

Ce contrat définit **exhaustivement** :

- ce qui est DB-authoritative (source de vérité cloud),
- ce qui est local-only (jamais synchronisé),
- les règles de fusion multi-appareils,
- les comportements offline autorisés et interdits,
- les garanties anti-choc TSA,
- les interdictions actives (ce que le frontend NE DOIT PAS faire).

**Principe fondamental** : la DB est la source de vérité. Le frontend est client du modèle DB, jamais l'inverse. Aucun champ, table ou colonne ne doit être ajouté en DB pour résoudre un problème de synchronisation frontend sans décision produit formelle.

_(Référence : PRODUCT_MODEL.md Ch.8.1, ux.md "Persistance / Sync / Offline")_

---

## 1. Définitions

| Terme                              | Définition                                                                                                                                                                                                                                                               | Scope                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Online**                         | L'application a une connexion réseau et peut communiquer avec Supabase.                                                                                                                                                                                                  | État client, non observable par la DB.                            |
| **Offline**                        | L'application n'a pas de connexion réseau.                                                                                                                                                                                                                               | État client, non observable par la DB.                            |
| **DB-authoritative**               | Donnée dont la source de vérité est la base de données cloud (Supabase). Le local est un cache.                                                                                                                                                                          | Sessions, validations, epoch, structure (cards/slots/timelines).  |
| **Local-only**                     | Donnée qui n'existe jamais en DB et n'est jamais synchronisée.                                                                                                                                                                                                           | État réseau, queue offline, indicateurs UI, état "fait" séquence. |
| **Chargement du Contexte Tableau** | Toute entrée fraîche dans la Page Tableau qui reconstruit l'écran à partir de l'état courant (local + cloud). Inclut : navigation vers Tableau, changement profil actif, relaunch app, retour premier plan, refresh explicite. Exclut : rester sur Tableau sans quitter. | _(ux.md glossaire)_                                               |
| **Fusion monotone**                | La progression ne régresse jamais automatiquement.                                                                                                                                                                                                                       | _(ux.md L2679-2694, PRODUCT_MODEL.md Ch.8.5.2)_                   |
| **Epoch**                          | Entier de versioning par session. Création = 1, réinitialisation = MAX(epoch)+1. Toute progression avec epoch inférieur au courant = obsolète.                                                                                                                           | _(ux.md L2696-2702, PRODUCT_MODEL.md Ch.8.5.3)_                   |

---

## 2. Matrice DB-authoritative vs local-only (LISTE FERMÉE)

### 2.1 DB-authoritative (source de vérité cloud)

| Donnée                                        | Table DB                             | Mécanisme sync                                  | Référence                      |
| --------------------------------------------- | ------------------------------------ | ----------------------------------------------- | ------------------------------ |
| Structure timeline (slots, positions, cartes) | `timelines`, `slots`                 | Cloud → local au Chargement Contexte Tableau    | DB_BLUEPRINT §2                |
| État session (state, epoch, timestamps)       | `sessions`                           | Cloud-authoritative ; local = cache             | DB_BLUEPRINT §2, invariant #11 |
| Validations (ensemble slot_id)                | `session_validations`                | Union ensembliste, UNIQUE (session_id, slot_id) | DB_BLUEPRINT §2, invariant #13 |
| Snapshot progression (steps_total_snapshot)   | `sessions.steps_total_snapshot`      | Fixé à 1ère validation, immuable ensuite        | Phase 5 migration #17          |
| Cartes (bank + personal)                      | `cards`                              | Cloud-authoritative                             | DB_BLUEPRINT §2                |
| Catégories + pivot                            | `categories`, `user_card_categories` | Cloud-authoritative                             | DB_BLUEPRINT §2                |
| Profils enfants (name, status)                | `child_profiles`                     | Cloud-authoritative                             | DB_BLUEPRINT §2                |
| Séquences + étapes                            | `sequences`, `sequence_steps`        | Cloud-authoritative                             | DB_BLUEPRINT §2                |
| Quotas mensuels                               | `account_quota_months`               | Cloud-authoritative                             | Phase 9                        |
| Comptes + devices                             | `accounts`, `devices`                | Cloud-authoritative                             | DB_BLUEPRINT §2                |

### 2.2 Local-only (INTERDIT en DB)

| Donnée                                                       | Raison                                               | Référence                                 |
| ------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------- |
| État réseau (online/offline)                                 | Observable uniquement côté client                    | PRODUCT_MODEL.md Ch.8.1                   |
| Queue de synchronisation offline                             | Logique applicative (retry, ordering)                | —                                         |
| Indicateurs UI anti-choc (bannière "mise à jour disponible") | UX pure, aucun état DB                               | PRODUCT_MODEL.md Ch.8.5.4                 |
| Cache local des timelines/cartes/slots                       | Cache = copie temporaire de données DB-authoritative | ux.md L2857-2860                          |
| État "fait" des étapes de séquence                           | Visuel, local-only, non sync, reset chaque session   | PRODUCT_MODEL.md Ch.3.12, DB_BLUEPRINT §2 |
| Données Visitor (avant signup)                               | Local-only jusqu'à import explicite                  | PRODUCT_MODEL.md Ch.8.2, ux.md L2838-2841 |
| Focus courant (quelle étape est "active" visuellement)       | État UI éphémère                                     | —                                         |
| État d'animation / transition visuelle                       | UX TSA, aucun état persistant                        | —                                         |

### 2.3 Règle de fermeture

**Cette liste est fermée.** Tout nouveau champ ou donnée non présent dans cette matrice nécessite une décision produit explicite documentée dans PRODUCT*MODEL.md **avant** toute implémentation. L'ajout d'une colonne `sync*_`, `offline\__`, `progress\_\*`, `last_synced_at`, ou `synced_from_device_id` dans une table métier est **interdit** sans passage par ce processus.

---

## 3. Règles de fusion multi-appareils

### 3.1 Validations : union ensembliste

**Règle** : la progression finale = union des `slot_id` validés sur tous les appareils.

```
Appareil A valide : {slot_1, slot_2}
Appareil B valide : {slot_2, slot_3}
Résultat DB       : {slot_1, slot_2, slot_3}
```

**Mécanisme DB** : `UNIQUE (session_id, slot_id)` sur `session_validations`. L'INSERT d'un doublon échoue silencieusement (idempotent côté applicatif via `ON CONFLICT DO NOTHING` ou gestion erreur).

**Jetons collectés** : recalculés depuis les validations (pas de source indépendante). `SUM(slots.tokens) WHERE slot_id IN (validated_slot_ids)`.

_(Référence : PRODUCT_MODEL.md Ch.8.5.2, ux.md L2685-2694)_

### 3.2 Epoch et réinitialisation

**Règle** : la réinitialisation crée une nouvelle session avec `epoch = MAX(epoch)+1`. L'ancienne session passe à `completed`. Toute progression associée à un epoch inférieur est obsolète.

**Mécanisme DB** :

- Trigger `ensure_epoch_monotone` (Phase 5, migration #16) : force `NEW.epoch = MAX(epoch)+1` si epoch fourni ≤ max existant.
- Partial UNIQUE index : 1 seule session active par `(child_profile_id, timeline_id)`.

**Edge case contractuel** :

1. Appareil A valide slots 1-3 (offline, epoch=1)
2. Appareil B réinitialise la session (epoch 1→2)
3. A revient online
4. État A (epoch=1) est **obsolète** — la session epoch=1 est `completed` en DB
5. A se réaligne sur session epoch=2 (progression=0)

**Responsabilité frontend** : au retour online, le client doit vérifier l'epoch de la session active en DB. Si `epoch_local < epoch_DB`, ignorer toute progression locale et charger l'état DB.

_(Référence : PRODUCT_MODEL.md Ch.8.5.3, ux.md L2704-2716)_

### 3.3 Unicité session active

**Règle** : 1 seule session active maximum par `(child_profile_id, timeline_id)`, indépendamment du nombre d'appareils.

**Mécanisme DB** : partial UNIQUE index `sessions_one_active_per_profile_timeline` (Phase 5, migration #14).

**Conséquence multi-appareils** : si Appareil A et B accèdent au même profil/timeline, ils partagent la même session active. Les validations de chacun fusionnent par union (§3.1).

_(Référence : PRODUCT_MODEL.md Ch.8.5.1, ux.md L2659-2666, DB_BLUEPRINT invariant #11)_

### 3.4 Complétion automatique

**Règle** : quand `COUNT(validations) >= steps_total_snapshot`, la session passe automatiquement à `completed`.

**Mécanisme DB** : trigger `auto_transition_session_on_validation` avec `SELECT ... FOR UPDATE` sur la session (anti-race condition multi-appareils). Phase 5, migration #17.

**Conséquence** : si A et B valident le dernier slot simultanément, un seul INSERT de validation réussit grâce au `FOR UPDATE`, et le trigger déclenche la complétion exactement une fois.

---

## 4. Comportements offline (utilisateurs authentifiés)

> **Périmètre** : Free/Abonné/Admin temporairement déconnectés.
> Visitor est structurellement local-only — non concerné par ces contraintes réseau.

### 4.1 Autorisé offline

| Action                      | Détail                              | Enforcement                             |
| --------------------------- | ----------------------------------- | --------------------------------------- |
| Exécuter timeline existante | Continuer session en cours          | Guard applicatif : utiliser cache local |
| Valider étapes (cocher)     | Stocker localement, sync au retour  | Guard applicatif : queue locale         |
| Pause/reprise session       | Implicite (quitter/revenir Tableau) | Aucun — état session inchangé           |
| Basculer profils/activités  | Sans modification structurelle      | Guard applicatif                        |

_(Référence : PRODUCT_MODEL.md Ch.8.4.1, ux.md L2879-2884)_

### 4.2 Interdit offline (STRICT)

| Action interdite        | Raison                                          | Enforcement                                             |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| CRUD cartes             | Modification structurelle                       | **Guard applicatif** (DB ne sait pas si client offline) |
| CRUD catégories         | Modification structurelle                       | Guard applicatif                                        |
| Créer/modifier timeline | Modification structurelle                       | Guard applicatif                                        |
| Réorganiser slots       | Modification structurelle                       | Guard applicatif                                        |
| Modifier jetons         | Modification structurelle                       | Guard applicatif                                        |
| Réinitialiser session   | Modification structurelle                       | Guard applicatif                                        |
| Créer profil enfant     | Modification structurelle + quota check DB-side | Guard applicatif                                        |

**UX** : actions visibles mais **désactivées** + toast « Indisponible hors ligne » (Contexte Édition uniquement). Aucun message côté enfant.

_(Référence : PRODUCT_MODEL.md Ch.8.4.2, ux.md L2900-2916)_

### 4.3 Pourquoi "guard applicatif" et non "guard DB"

La DB ne peut pas savoir si un client est online ou offline. L'état réseau est observable uniquement côté client. Le rôle de la DB est de garantir l'intégrité des données **quand** elles arrivent (contraintes, triggers, RLS), pas de bloquer en fonction de l'état réseau.

**Conséquence** : le frontend DOIT implémenter ces guards. Si un client bypasse le guard (ex: requête cURL directe), la DB acceptera l'opération si elle respecte les contraintes — ce qui est correct (le client était en fait online pour envoyer la requête).

---

## 5. Anti-choc TSA

### 5.1 Règle fondamentale

**Aucune modification structurante ne doit être poussée "en direct" sur l'écran Contexte Tableau déjà affiché côté enfant.**

Toute modification faite en Édition (reflow, ajout/suppression de slots, reset, changement de carte, epoch++) **s'applique uniquement au prochain Chargement du Contexte Tableau**.

_(Référence : PRODUCT_MODEL.md Ch.8.5.4, ux.md L2717-2722, ux.md glossaire "Chargement du Contexte Tableau")_

### 5.2 Comportement attendu du frontend

| Situation                                                    | Comportement                                                                  | Ce qui ne doit JAMAIS arriver                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Adulte modifie timeline pendant que l'enfant est sur Tableau | Enfant continue sur état actuel, changements appliqués au prochain chargement | Timeline qui se "réarrange" en direct sous les yeux de l'enfant                  |
| Reset session (epoch++) pendant exécution enfant             | Enfant continue sur état actuel, écrasement au prochain chargement            | Progression qui disparaît en direct, message "session réinitialisée" côté enfant |
| Sync multi-appareils apporte nouvelles validations           | Progression peut augmenter (fusion monotone), jamais diminuer en direct       | Étapes qui se "décochent" en direct                                              |
| Appareil revient online avec epoch obsolète                  | Réalignement au prochain chargement, pas en direct                            | Popup "votre progression a été écrasée" côté enfant                              |

### 5.3 Messages techniques interdits côté Tableau

Aucun de ces éléments ne doit être affiché dans le Contexte Tableau (enfant) :

- États réseau (offline, synchronisation en cours, sync terminée)
- Messages de conflit ou de fusion
- Erreurs techniques
- Messages liés aux quotas ou à l'abonnement
- Indicateurs de chargement liés à la synchronisation

Le Contexte Tableau reste **émotionnellement neutre**.

_(Référence : PRODUCT_MODEL.md Ch.2.4, ux.md L900-916)_

---

## 6. Visitor et import

### 6.1 Visitor = local-only

Le Visitor n'a aucune existence en DB avant signup. Toutes ses données (timelines, sessions, progression, séquences) sont persistées localement uniquement. Le stockage local est la source de vérité.

Le Visitor n'est **pas concerné** par les contraintes offline réseau (il est structurellement local-only). Il peut toujours composer et exécuter des timelines.

_(Référence : PRODUCT_MODEL.md Ch.8.2, ux.md L2838-2841)_

### 6.2 Import Visitor → Compte

| Aspect            | Règle                                                                  | Référence        |
| ----------------- | ---------------------------------------------------------------------- | ---------------- |
| Déclencheur       | Visitor crée compte sur même appareil                                  | ux.md L2953-2956 |
| Choix             | Import **explicite** (proposé, pas forcé)                              | ux.md L2956      |
| Périmètre         | Timelines + sessions + progression + séquences + mapping catégories    | ux.md L2964-2970 |
| Cartes dépubliées | Restent utilisables dans usages importés (dépublication ≠ suppression) | ux.md L2973-2984 |
| Mécanisme         | Transaction applicative (pas de table dédiée en DB)                    | DB_BLUEPRINT §7  |
| Perte de données  | Aucune — import sans perte, ne supprime rien sans confirmation         | ux.md L2960-2962 |

---

## 7. Interdictions actives

Les points suivants ne sont pas "non spécifiés" — ce sont des **interdictions formelles**.

### 7.1 `validated_at` = audit-only

La colonne `session_validations.validated_at` existe pour audit uniquement. **Aucune règle métier ne doit dépendre de ce timestamp.** La logique de fusion repose exclusivement sur l'union ensembliste des `slot_id`, pas sur l'ordre ou l'horodatage des validations.

**Interdit** : trier les validations par `validated_at` pour déterminer "qui a validé en premier", calculer des durées de session basées sur les timestamps de validation, utiliser `validated_at` dans un WHERE pour filtrer des validations "récentes".

_(Référence : DB_BLUEPRINT §2, session_validations, migration Phase 5.2)_

### 7.2 Pas de colonne sync/offline en DB

**Interdit** : ajouter dans les tables métier des colonnes de type `last_synced_at`, `synced_from_device_id`, `sync_status`, `offline_queue`, `is_dirty`, `needs_sync`, ou tout champ dont le but est de tracer l'état de synchronisation.

**Raison** : la DB est la source de vérité finale. Quand une donnée arrive en DB, elle est "syncée" par définition. Le tracking de l'état de synchronisation est une responsabilité locale (client).

### 7.3 Pas de table sync dédiée

**Interdit** : créer une table `sync_log`, `sync_events`, `device_sync_state`, ou équivalent.

**Raison** : non mentionné dans ux.md, PRODUCT_MODEL.md, ni DB_BLUEPRINT.md. Créer cette table serait une invention sans source produit.

**Exception** : si un besoin concret de debug/support émerge (ex : tracking dernière sync par device pour diagnostic), il devra être formalisé comme décision produit dans PRODUCT_MODEL.md avant toute implémentation.

### 7.4 Pas d'état "en cours de sync" en DB

**Interdit** : stocker un état intermédiaire de synchronisation (ex : `session_validations` avec flag `synced = false`).

**Raison** : la fusion est monotone (union ensembliste). Un INSERT en DB = donnée synced. Il n'y a pas d'état intermédiaire côté serveur.

---

## 8. Garde-fous anti-dérive (introspection)

Pour garantir que la DB reste fidèle à ce contrat dans le temps, les tests Phase 10 incluent une vérification d'introspection :

**Aucune colonne** des tables métier ne doit contenir un nom correspondant aux patterns suivants :

- `sync_*`, `synced_*`, `*_synced`
- `offline_*`, `is_offline`
- `last_sync*`, `*_sync_at`
- `device_source`, `synced_from_*`
- `is_dirty`, `needs_sync`, `pending_*`
- `progress` (sauf `steps_total_snapshot` qui est un snapshot figé, pas un état mutable)

**Tables concernées** : `accounts`, `devices`, `child_profiles`, `cards`, `categories`, `user_card_categories`, `timelines`, `slots`, `sessions`, `session_validations`, `sequences`, `sequence_steps`, `account_quota_months`.

---

## 9. Résumé des responsabilités

| Responsabilité                                  | Qui          | Mécanisme                                        |
| ----------------------------------------------- | ------------ | ------------------------------------------------ |
| Intégrité des données (contraintes, invariants) | **DB**       | Triggers, CHECK, UNIQUE, RLS                     |
| Unicité session active                          | **DB**       | Partial UNIQUE index                             |
| Epoch monotone                                  | **DB**       | Trigger BEFORE INSERT                            |
| Idempotence validations                         | **DB**       | UNIQUE (session_id, slot_id)                     |
| Anti-race condition complétion                  | **DB**       | SELECT ... FOR UPDATE                            |
| Quotas (cards, profils, devices)                | **DB**       | Triggers BEFORE INSERT                           |
| Downgrade/verrouillage profils                  | **DB**       | Trigger AFTER UPDATE sessions (SECURITY DEFINER) |
| Détection online/offline                        | **Frontend** | État réseau client                               |
| Blocage modifications offline                   | **Frontend** | Guard applicatif + toast                         |
| Cache local + queue sync                        | **Frontend** | Stratégie client (IndexedDB/AsyncStorage)        |
| Anti-choc TSA (pas de push en direct)           | **Frontend** | Chargement Contexte Tableau uniquement           |
| Import Visitor                                  | **Frontend** | Transaction applicative                          |
| Vérification epoch au retour online             | **Frontend** | Comparer epoch_local vs epoch_DB                 |
| Messages techniques invisibles côté enfant      | **Frontend** | Séparation Contexte Édition / Tableau            |

---

## ✅ Effet contractuel

Ce document constitue la référence unique pour l'implémentation de la synchronisation, du mode offline et du comportement multi-appareils.

Toute implémentation frontend doit respecter strictement :

- la matrice DB-authoritative vs local-only (§2),
- les règles de fusion (§3),
- les comportements offline (§4),
- les garanties anti-choc TSA (§5),
- les interdictions actives (§7).

Aucune implémentation ne doit :

- ajouter de colonne ou table sync en DB sans décision produit formelle,
- utiliser `validated_at` pour de la logique métier,
- pousser des modifications en direct sur le Contexte Tableau,
- afficher des messages techniques côté enfant,
- inventer un mécanisme de fusion différent de l'union ensembliste.
