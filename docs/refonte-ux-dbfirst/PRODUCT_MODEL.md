# PRODUCT_MODEL.md (v15)

> **Version** : 15 — Corrections finales cohérence (timezone + Visitor composition)
> **Date** : 2026-01-29
> **Source unique** : `ux.md`
> **Corrections v15** : Timezone référence complète (Ch.1.2), Visitor autorisé composition timelines (Ch.7.1.1)

---

## 0. Préambule

### Objectif du document

Ce document formalise le **contrat produit** de l'application tel que décrit dans **ux.md**, afin de servir de base de référence unique pour la **modélisation DB** et la traduction ultérieure en **migrations SQL DB-first**.

- La refonte vise un système hybride de **Planning Visuel** et **Économie de Jetons**, inspiré des supports physiques utilisés au quotidien (pictogrammes, séquences, jetons). _(ux.md L35-36)_
- Objectifs non négociables :
  - **Séparer strictement** l'organisation de l'activité (planning visuel) de la motivation (économie de jetons). _(ux.md L50-52)_
  - Garantir à l'enfant une expérience **prévisible, rassurante, non frustrante**. _(ux.md L53-56)_
  - Donner à l'adulte un **contrôle total** de la configuration **sans exposer cette complexité côté enfant**. _(ux.md L57-59)_
  - Permettre l'évolution future (plans, quotas, usages) **sans refonte structurelle**. _(ux.md L60-64)_

Ce contrat a vocation à rendre **explicitement testables** :

- les concepts métiers (entités),
- les relations & cardinalités,
- les états & transitions,
- les actions autorisées et leurs effets,
- les règles offline/sync/quotas,
- les principes de sécurité & permissions (RLS au niveau conceptuel).

> **Règle d'or** : si un élément n'est pas explicitement présent dans ux.md, il ne peut pas être présenté ici comme une décision.

### Périmètre

#### Couvert (si présent dans ux.md)

- Principes UX TSA et invariants transversaux _(ux.md L70-164)_
- Glossaire canonique et définitions métier _(ux.md L167-721)_
- Séparation Contexte **Édition** / **Tableau** _(ux.md L565-584, L843-927)_
- Systèmes pédagogiques : **Planning Visuel**, **Économie de Jetons**, **Séquençage** _(ux.md L1819-2472)_
- Multi-enfants, multi-appareils, persistance, synchronisation, offline _(ux.md L2474-3011)_
- Quotas & plans _(ux.md L3013-3246)_
- Règles de confidentialité Admin _(ux.md L1321-1359)_

#### Non couvert (hors contrat)

- Document d'implémentation (aucun SQL, aucun pseudo-code)
- Spéc UI détaillée par écran
- Architecture technique (stockage local, caches)
- Limites de stockage local IndexedDB / cache navigateur _(ux.md L3000)_

### Définitions globales

- **Contrat produit** : règles décrivant ce qui doit être vrai du produit, indépendamment de l'implémentation.
- **Invariant** : règle non négociable ; aucune fonctionnalité ne peut être implémentée si elle viole un invariant. _(ux.md L83)_
- **État** : situation discrète d'un objet métier (ex. session).
- **Action** : opération réalisée par un acteur avec préconditions et effets.
- **Glossaire canonique** : un terme = une définition unique. _(ux.md L169-184)_

#### Terminologie contractuelle

Dans tout le projet, le seul terme utilisé côté produit est **"Réinitialisation de session"** (jamais "reset", jamais "redémarrage de session"). _(ux.md L2578)_

---

### Checklist de complétude (Chapitre 0)

- [x] Objectif du document
- [x] Périmètre (couvert / non couvert)
- [x] Définitions globales
- [x] Terminologie contractuelle
- [x] Références ux.md (lignes identifiées)

### Points ambigus détectés (Chapitre 0)

- **"Évolution future du produit"** : ux.md affirme l'objectif sans spécifier la liste des plans/quotas futurs. _(ux.md L60-64)_

---

# 1. Glossaire canonique (source de vérité)

## 1.1 Principes du glossaire (invariants)

- **Un terme = une définition** : chaque terme métier possède une définition unique.
- **Aucun terme ambigu ou surchargé**.
- **Séparations non négociables** _(ux.md L702-707)_ :
  - Timeline ≠ Séquençage ≠ Session
  - Carte ≠ Slot
  - Structure (Édition) ≠ Exécution (Tableau)
  - Adulte / enfant = contexte UX, pas rôle système

---

## 1.2 Termes liés aux utilisateurs, comptes et statuts

| Terme                                 | Définition                                                                                                                                               | Référence      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **Visitor**                           | Utilisateur non authentifié ; profil enfant local implicite unique ; mono-appareil ; données locales uniquement ; limitations structurelles (pas quota). | ux.md L190-198 |
| **Compte utilisateur (propriétaire)** | Compte authentifié ; unité propriétaire (cartes, catégories, profils enfants) ; peut être Free ou Abonné.                                                | ux.md L202-211 |
| **Statut utilisateur**                | Statut fonctionnel : Visitor, Free, Abonné, Admin ; définit des capacités, pas des rôles pédagogiques.                                                   | ux.md L221-232 |
| **Free**                              | Authentifié sans abonnement ; cloud mono-appareil ; accès banque ; pas de cartes personnelles ni catégories.                                             | ux.md L776-801 |
| **Abonné**                            | Authentifié avec abonnement ; accès complet ; multi-profils et multi-appareils dans les limites du plan.                                                 | ux.md L804-818 |
| **Admin**                             | Statut mainteneur ; Page Administration dédiée ; pas un rôle pédagogique ; non visible dans UX standard.                                                 | ux.md L822-839 |
| **Fuseau horaire (timezone)**         | Stocké au niveau compte utilisateur (account.timezone conceptuel) ; valeur IANA, défaut `Europe/Paris` ; utilisé pour calcul quota mensuel.              | ux.md L213-217 |

---

## 1.3 Termes liés aux enfants

| Terme                             | Définition                                                                                                                 | Référence        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **Profil enfant**                 | Représentation d'un enfant ; timeline propre, sessions propres, progression propre ; aucune donnée partagée entre profils. | ux.md L248-257   |
| **Profil enfant local implicite** | Profil unique Visitor ; créé implicitement ; non supprimable/duplicable ; stocké localement.                               | ux.md L261-268   |
| **État verrouillé (profil)**      | État après downgrade ; profil accessible pour terminer sessions, puis lecture seule.                                       | ux.md L3206-3215 |

---

## 1.4 Termes liés aux contextes UX

| Terme                              | Définition                                                                                                              | Référence      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------- |
| **Contexte Édition**               | Destiné à l'adulte ; création/modification structure ; affiche messages système ; bloqué partiellement hors ligne.      | ux.md L567-573 |
| **Contexte Tableau**               | Destiné à l'enfant ; exécution timeline ; éléments pédagogiques uniquement ; jamais de messages techniques/commerciaux. | ux.md L577-583 |
| **Chargement du Contexte Tableau** | Entrée "fraîche" reconstruisant l'écran ; les modifications Édition ne s'appliquent qu'au prochain chargement.          | ux.md L610-621 |

---

## 1.5 Termes liés aux cartes et catégories

| Terme                 | Définition                                                                                                             | Référence             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **Carte**             | Entité visuelle (image + nom) ; rôle dépend du contexte d'usage ; pas de distinction technique tâche/étape/récompense. | ux.md L274-287        |
| **Carte de banque**   | Prédéfinie Admin ; accessible à tous ; non modifiable ; ne consomme aucun quota.                                       | ux.md L291-298        |
| **Carte personnelle** | Créée par Abonné/Admin ; privée ; consomme quota ; image figée après création.                                         | ux.md L302-308, L1378 |
| **Catégorie**         | Organisation bibliothèque ; toujours personnelle à l'utilisateur.                                                      | ux.md L1131-1143      |
| **"Sans catégorie"**  | Catégorie système non supprimable ; fallback automatique.                                                              | ux.md L1165-1179      |
| **Dépublication**     | Retrait d'une carte de banque ≠ suppression ; reste utilisable là où déjà présente.                                    | ux.md L1273-1281      |
| **Invariant banque**  | Une carte de banque ne doit jamais être supprimée si référencée ; seule dépublication autorisée.                       | ux.md L2979           |

---

## 1.6 Termes liés au planning (timeline et slots)

| Terme                           | Définition                                                                             | Référence        |
| ------------------------------- | -------------------------------------------------------------------------------------- | ---------------- |
| **Timeline**                    | Structure horizontale de slots ; une seule par profil enfant ; configurée en Édition.  | ux.md L343-349   |
| **Slot**                        | Emplacement dans timeline ; identifié par `slot_id` (UUID) indépendant de la position. | ux.md L353-362   |
| **Slot Étape**                  | Peut porter 0-5 jetons ; 0 = planning visuel, ≥1 = économie de jetons.                 | ux.md L371-377   |
| **Slot Récompense**             | Toujours présent structurellement ; contenu optionnel ; non cliquable ; sans jetons.   | ux.md L381-388   |
| **Slot Étape vide (exécution)** | N'est jamais exécutable ; non affiché en Tableau ; ignoré dans calculs.                | ux.md L692-696   |
| **Slot Récompense vide**        | Côté Tableau, n'occupe aucun espace ; aucun placeholder.                               | ux.md L1544      |
| **Vider un slot**               | Retirer la carte ; slot reste visible.                                                 | ux.md L682       |
| **Supprimer un slot**           | Supprimer l'emplacement ; déclenche reflow ; interdit sur dernier slot Étape.          | ux.md L684-690   |
| **Vider la timeline**           | Remet à structure minimale (1 slot Étape vide + 1 slot Récompense vide).               | ux.md L2563-2568 |

---

## 1.7 Termes liés aux sessions et progression

| Terme                           | Définition                                                                           | Référence             |
| ------------------------------- | ------------------------------------------------------------------------------------ | --------------------- |
| **Session**                     | Exécution d'une timeline ; progression rattachée à la session, jamais à la timeline. | ux.md L401-409        |
| **Prévisualisation**            | Sous-état de Active avec 0 validation ; pas un état séparé.                          | ux.md L435, L451      |
| **Session Démarrée**            | Active avec ≥1 validation ; démarrage via première checkbox (pas de bouton Start).   | ux.md L436, L446-448  |
| **Session Terminée**            | Toutes étapes validées ; lecture seule ; jamais de redémarrage automatique.          | ux.md L438, L467-479  |
| **Progression**                 | Étapes validées + jetons collectés ; ne régresse jamais automatiquement sauf reset.  | ux.md L413-421, L489  |
| **Réinitialisation de session** | Action explicite Édition ; nouvelle session avec progression à zéro et epoch++.      | ux.md L471-479, L2574 |
| **Slot validé**                 | État temporaire dans une session ; réinitialisé à chaque nouvelle session.           | ux.md L391-395        |

---

## 1.8 Termes liés à la synchronisation multi-appareils

| Terme                                   | Définition                                                                                                     | Référence        |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------- |
| **Epoch de session**                    | Entier de versioning ; création = 1, réinitialisation = epoch+1 ; progression avec epoch inférieur = obsolète. | ux.md L2696-2702 |
| **Fusion monotone**                     | La progression ne régresse jamais automatiquement.                                                             | ux.md L2679-2694 |
| **Règle de fusion (union ensembliste)** | Progression finale = union des slot_id validés (set) ; A valide {1,2} + B valide {2,3} = {1,2,3}.              | ux.md L2685-2694 |
| **device_id**                           | UUID généré au premier usage ; persisté localement ; utilisé pour quota appareils.                             | ux.md L2641-2647 |

---

## 1.9 Termes liés aux 3 systèmes pédagogiques

| Terme                      | Définition                                                                    | Référence        |
| -------------------------- | ----------------------------------------------------------------------------- | ---------------- |
| **Planning visuel**        | Timeline sans économie de jetons ; ordre + états Maintenant/À venir/Fini.     | ux.md L515-522   |
| **Économie de jetons**     | Système optionnel superposé ; activé si ≥1 slot a >0 jeton.                   | ux.md L538-542   |
| **Jeton**                  | Unité de motivation sur slot Étape ; temporaire ; reset chaque session.       | ux.md L546-554   |
| **Grille de jetons**       | Cases = somme jetons des slots Étapes.                                        | ux.md L558-561   |
| **Séquençage**             | Aide visuelle optionnelle ; décompose carte mère en étapes ; purement visuel. | ux.md L526-534   |
| **Carte mère**             | Carte porteuse d'une séquence (0 ou 1 par utilisateur).                       | ux.md L312-317   |
| **État "fait" (séquence)** | Visuel, local-only, non sync ; par slot_id ; reset à chaque session.          | ux.md L2369-2399 |

---

## 1.10 Termes liés aux quotas

| Terme                       | Définition                                                                  | Référence        |
| --------------------------- | --------------------------------------------------------------------------- | ---------------- |
| **Quota**                   | Limite explicite par plan ; appliqué en Contexte Édition uniquement.        | ux.md L625-630   |
| **Quota de stock**          | Nombre max total de cartes personnelles.                                    | ux.md L3062-3068 |
| **Quota mensuel**           | Nombre max de nouvelles cartes par mois ; calculé selon timezone du compte. | ux.md L3070-3076 |
| **Limitation structurelle** | Contrainte inhérente au statut (ex: Visitor), indépendante du plan.         | ux.md L3036-3043 |

---

### Effet contractuel

Toute implémentation doit utiliser ces termes dans ce sens exact, sans redéfinir ni introduire de synonymes. _(ux.md L711-719)_

### Checklist de complétude (Chapitre 1)

- [x] Principes du glossaire
- [x] Termes utilisateurs/comptes/statuts avec timezone
- [x] Termes enfants avec état verrouillé
- [x] Termes contextes UX
- [x] Termes cartes/catégories avec invariant banque
- [x] Termes timeline/slots avec slot vide ignoré
- [x] Termes sessions avec epoch
- [x] Termes synchronisation avec fusion ensembliste
- [x] Termes systèmes pédagogiques
- [x] Termes quotas

### Points ambigus détectés (Chapitre 1)

Aucun — tous les termes sont explicitement définis dans ux.md.

---

# 2. Acteurs, rôles, profils et responsabilités

## 2.1 Cadre général (principes structurants)

- **Un seul type de compte technique** _(ux.md L727)_
- Visitor / Free / Abonné / Admin sont des **statuts fonctionnels**, pas des rôles pédagogiques _(ux.md L728)_
- **Aucun rôle "enfant" ni "adulte" en base de données** _(ux.md L729)_
- Distinction adulte/enfant est **exclusivement UX** via contextes Édition/Tableau _(ux.md L730)_

---

## 2.2 Statuts utilisateur

### 2.2.1 Visitor

| Aspect               | Description                                                                                   | Référence      |
| -------------------- | --------------------------------------------------------------------------------------------- | -------------- |
| **Caractéristiques** | Profil enfant local unique ; mono-appareil ; données locales                                  | ux.md L736-745 |
| **Autorisé**         | Banque de cartes ; composer/exécuter timelines ; planning visuel, séquençage, économie jetons | ux.md L747-754 |
| **Interdit**         | Cartes personnelles ; catégories ; page Profil                                                | ux.md L756-760 |
| **UX**               | PersonalizationModal sur tentative création                                                   | ux.md L762-772 |

### 2.2.2 Free

| Aspect               | Description                                    | Référence      |
| -------------------- | ---------------------------------------------- | -------------- |
| **Caractéristiques** | Cloud mono-appareil ; page Profil accessible   | ux.md L778-785 |
| **Autorisé**         | Banque de cartes ; composer/exécuter timelines | ux.md L787-791 |
| **Interdit**         | Cartes personnelles ; catégories               | ux.md L793-796 |
| **UX**               | PersonalizationModal incitation Abonné         | ux.md L798-800 |

### 2.2.3 Abonné

| Aspect      | Description                                            | Référence      |
| ----------- | ------------------------------------------------------ | -------------- |
| **Accès**   | Complet : cartes personnelles, catégories, tous outils | ux.md L808-814 |
| **Limites** | Multi-profils et multi-appareils selon plan ; quotas   | ux.md L814-818 |

### 2.2.4 Admin

| Aspect              | Description                                                       | Référence        |
| ------------------- | ----------------------------------------------------------------- | ---------------- |
| **Nature**          | Mainteneur ; pas rôle pédagogique ; non visible UX standard       | ux.md L824-829   |
| **Accès**           | Complet + Page Administration (banque, modération)                | ux.md L831-837   |
| **Confidentialité** | Accès données textuelles ; **ne voit JAMAIS images personnelles** | ux.md L1028-1041 |

---

## 2.3 Contextes UX : Édition vs Tableau

### 2.3.1 Contexte Édition (adulte)

**Actions autorisées** _(ux.md L872-880)_ :

- Création profils enfants
- CRUD timelines, cartes, catégories
- Réinitialisation de session
- Paramètres compte
- Messages système

**Offline** : exécution possible, modification structurelle bloquée _(ux.md L573)_

### 2.3.2 Contexte Tableau (enfant)

**Actions autorisées** _(ux.md L882-887)_ :

- Exécution timeline composée
- Interaction session active
- Progression visuelle
- Gestion jetons (exécution)

**Actions interdites** _(ux.md L889-894)_ :

- Toute création
- Toute modification structurelle
- Toute suppression
- Accès paramètres

---

## 2.4 Règles de visibilité (protection enfant)

### Principe fondamental _(ux.md L900-916)_

Les messages techniques/système ne doivent **JAMAIS** être affichés dans le Contexte Tableau :

- États réseau (offline, sync)
- Messages quotas/abonnement
- Erreurs techniques

Le Contexte Tableau reste **émotionnellement neutre**.

### Invariant plans/quotas _(ux.md L3329-3356)_

L'enfant ne voit **jamais** :

- Quotas/limitations
- Messages abonnement
- Incitations commerciales

---

## 2.5 Profils enfants

- Chaque profil possède : timeline propre, sessions propres, progression propre _(ux.md L2511-2521)_
- **Aucune donnée partagée entre profils enfants** _(ux.md L2522)_
- Cartes et catégories sont partagées au niveau **compte** (pas profil) _(ux.md L2526-2530)_

---

## 2.6 Gestion des profils enfants — règles contractuelles

### Création automatique du premier profil enfant

À la création d’un compte utilisateur authentifié (Free ou Abonné) :

- Un profil enfant est créé automatiquement.
- Ce profil reçoit un nom générique par défaut : « Mon enfant » (modifiable ultérieurement).
- Une timeline est créée automatiquement pour ce profil enfant.
- Cette timeline est initialisée avec une structure minimale obligatoire : 1 slot Étape (vide, jetons = 0) et 1 slot Récompense (vide)

👉 Effet produit : l’utilisateur arrive immédiatement dans une application fonctionnelle, jamais vide.

### Création de profils enfants supplémentaires

Le nombre de profils enfants simultanément actifs dépend du statut du compte :

Statut Profils enfants actifs autorisés

- Free 1
- Abonné 3
- Admin Illimité

Le quota concerne le nombre de profils enfants existants simultanément, pas le nombre de créations cumulées.

En Contexte Édition :

- Free :
  Le bouton « Ajouter un profil » est visible.
  Toute tentative déclenche une incitation à l’abonnement.

- Abonné :
  Le bouton « Ajouter un profil » permet de créer jusqu’à 2 profils supplémentaires (maximum 3 au total).

Chaque profil enfant créé manuellement déclenche automatiquement :

- la création de sa timeline,
- l’initialisation de la structure minimale (1 Étape + 1 Récompense, jetons = 0).

### Suppression, archivage et verrouillage des profils enfants

Il n’existe pas de suppression standard de profil enfant dans l’usage normal.
Un profil enfant ne peut pas être supprimé librement par l’utilisateur afin de :

- préserver l’historique,
- éviter des suppressions accidentelles,
- garantir la stabilité émotionnelle côté enfant.

Lorsqu’un utilisateur n’est plus autorisé à utiliser tous ses profils (ex. downgrade Abonné → Free) :

- les profils excédentaires passent à l’état verrouillé,
- ils deviennent en lecture seule,
- aucune nouvelle session ou recomposition n’est autorisée,
- les sessions en cours peuvent être terminées avant verrouillage effectif.

La suppression physique d’un profil enfant est autorisée uniquement dans les cas suivants :

- suppression complète du compte utilisateur (cascade),
- demande explicite RGPD (droit à l’effacement),
- opérations techniques exceptionnelles (maintenance, reset, environnement de test).

👉 En dehors de ces cas, les profils enfants sont conservés, jamais supprimés.

### Invariant structurel (critique DB)

- Un profil enfant existant possède toujours exactement une timeline.
- Une timeline existante respecte en permanence la structure minimale : ≥ 1 slot Étape
  exactement 1 slot Récompense
- Ces invariants s’appliquent y compris lors des cascades techniques autorisées (suppression compte, RGPD).

---

### Checklist de complétude (Chapitre 2)

- [x] Principes structurants (un compte technique, pas de rôles DB)
- [x] Statuts : Visitor / Free / Abonné / Admin
- [x] Contextes UX : Édition vs Tableau
- [x] Règles visibilité (aucun message technique côté enfant)
- [x] Confidentialité Admin (ne voit jamais images privées)
- [x] Profils enfants (séparation données)

### Points ambigus détectés (Chapitre 2)

1. **Protection accès Page Édition** : ux.md ne spécifie pas le mécanisme empêchant l'enfant d'atteindre la Page Édition (verrou, code, etc.). À trancher.

---

# 3. Entités métier (conceptuelles)

> Cette section décrit les **entités de domaine** sans présumer des tables SQL.

## 3.1 Compte utilisateur

| Attribut conceptuel | Description                        | Référence      |
| ------------------- | ---------------------------------- | -------------- |
| Identité            | Identifiant unique                 | —              |
| Statut              | Visitor / Free / Abonné / Admin    | ux.md L221-232 |
| Timezone            | Valeur IANA, défaut `Europe/Paris` | ux.md L215     |

**Ownership** : détient cartes, catégories, profils enfants, appareils, timelines.
**CONTRAT DB (invariant)** : `timezone` doit être une timezone IANA valide (ex: `Europe/Paris`). Toute valeur inconnue est rejetée par la DB (CHECK `accounts_timezone_valid_chk` via `public.is_valid_timezone(text)`).

---

## 3.2 Appareil autorisé (Device)

| Attribut conceptuel | Description                                                                                           | Référence                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `device_id`         | UUID généré au premier usage, persisté localement                                                     | ux.md L2643                                |
| Rattachement        | Peut être rattaché à plusieurs comptes (tablette partagée) ; unicité DB = (`account_id`, `device_id`) | ux.md L2645 + Décision produit (Phase 5.5) |
| **Révocation**      | Manuelle via Page Profil ; non destructive (revoked_at)                                               | Décision produit v14                       |

> Note : En cas de suppression du compte (RGPD/maintenance), les devices peuvent être supprimés via cascade ; “non destructive” s’entend hors suppression du compte.

**Lifecycle révocation** _(Décision produit v14)_ :

- **Procédure** : Révocation manuelle côté Page Profil (Contexte Édition)
- **Effet** : Révocation immédiate (appareil révoqué ne peut plus se connecter)
- **Modèle** : Non destructive — privilégier colonne `revoked_at` (timestamp) ou statut `active | revoked` pour audit et traçabilité
- **Aucune perte historique** : device_id conservé en base pour référence

**CONTRAT DB (Phase 5.5)** :

- Unicité : `UNIQUE (account_id, device_id)` (pas d’unicité globale sur `device_id`)
- Cohérence temporelle : `CHECK (revoked_at IS NULL OR revoked_at >= created_at)`

---

## 3.3 Profil enfant

| Attribut conceptuel     | Description                                 | Référence        |
| ----------------------- | ------------------------------------------- | ---------------- |
| Identité                | Identifiant unique                          | —                |
| Ancienneté              | Pour déterminer profil actif lors downgrade | ux.md L3213      |
| **Statut verrouillage** | `actif` ou `verrouillé` (lecture seule)     | ux.md L3209-3214 |

**Transitions état verrouillage** _(ux.md L3206-3215)_ :

| État actuel     | Événement                  | Nouvel état                    |
| --------------- | -------------------------- | ------------------------------ |
| Actif           | Downgrade + au-delà limite | Actif (peut terminer sessions) |
| Actif (au-delà) | Toutes sessions terminées  | Verrouillé                     |
| Verrouillé      | Upgrade Abonné             | Actif                          |

---

## 3.4 Carte

| Attribut conceptuel | Description                                          | Référence         |
| ------------------- | ---------------------------------------------------- | ----------------- |
| `nom`               | Obligatoire                                          | ux.md L278-279    |
| `image`             | Obligatoire ; **figée après création** (personnelle) | ux.md L278, L1378 |

**Types** :

- **Carte de banque** : Admin, accessible à tous, non modifiable, quota = 0
- **Carte personnelle** : Abonné/Admin, privée, consomme quota

**Invariant banque** : jamais supprimée si référencée ; seule dépublication autorisée _(ux.md L2979)_

---

## 3.5 Catégorie

| Attribut conceptuel      | Description               | Référence        |
| ------------------------ | ------------------------- | ---------------- |
| Identité                 | Par utilisateur           | ux.md L1143      |
| Nom                      | —                         | —                |
| Système "Sans catégorie" | Non supprimable, fallback | ux.md L1165-1179 |

---

## 3.6 Table pivot catégories (CONTRAT DB)

> **Encadré contractuel** _(ux.md L1151-1162)_

```
Table : user_card_categories
┌─────────────┬─────────────┬──────────────┐
│ user_id     │ card_id     │ category_id  │
├─────────────┴─────────────┴──────────────┤
│ UNIQUE (user_id, card_id)                │
└──────────────────────────────────────────┘
```

- **Fallback applicatif** : si aucune ligne pour (user_id, card_id), carte = "Sans catégorie"
- Le fallback est **applicatif**, pas un NULL en DB

---

## 3.7 Timeline

| Attribut conceptuel | Description                                | Référence  |
| ------------------- | ------------------------------------------ | ---------- |
| Identité            | Par profil enfant                          | —          |
| Profil enfant       | 1:1 (une seule timeline active par profil) | ux.md L349 |
| Slots               | Collection ordonnée (Étapes + Récompense)  | ux.md L347 |

**Invariants structurels** :

- Toujours 1 slot Récompense (peut être vide)
- Minimum 1 slot Étape (dernier non supprimable)

---

## 3.8 Slot

| Attribut conceptuel | Description                                 | Référence      |
| ------------------- | ------------------------------------------- | -------------- |
| `slot_id`           | UUID persistant, indépendant de la position | ux.md L358     |
| Type                | Étape ou Récompense                         | ux.md L364-367 |
| Position/ordre      | Modifiable par drag & drop                  | ux.md L360     |
| Carte associée      | 0..1 (peut être vide)                       | ux.md L355-356 |
| Jetons              | 0..5 (slot Étape uniquement)                | ux.md L375     |

**Règle exécution** : slot Étape vide ignoré en Tableau _(ux.md L692-696)_

---

## 3.9 Session

| Attribut conceptuel      | Description                                                 | Référence        |
| ------------------------ | ----------------------------------------------------------- | ---------------- |
| Identité                 | —                                                           | —                |
| Profil enfant + Timeline | Référence                                                   | —                |
| État                     | Inexistante / Active (Prévisualisation/Démarrée) / Terminée | ux.md L429-438   |
| **Epoch**                | Entier de versioning (création=1, reset=epoch+1)            | ux.md L2696-2702 |
| Progression              | Slots validés + jetons collectés                            | ux.md L413-419   |

**Unicité** : 1 session active max par (profil enfant, timeline) _(ux.md L487, L2666)_

---

## 3.10 Progression

| Attribut conceptuel | Description                              | Référence        |
| ------------------- | ---------------------------------------- | ---------------- |
| Slots validés       | **Ensemble de slot_id** (set, pas index) | ux.md L2689      |
| Jetons collectés    | Recalculé depuis slots validés           | ux.md L2065-2069 |

**Fusion multi-appareils** : union ensembliste _(ux.md L2685-2694)_

---

## 3.11 Séquence

| Attribut conceptuel | Description                                            | Référence        |
| ------------------- | ------------------------------------------------------ | ---------------- |
| Propriétaire        | Utilisateur (toujours personnelle)                     | ux.md L2154-2164 |
| Carte mère          | 0..1 séquence par carte par utilisateur                | ux.md L2147      |
| Étapes              | Liste ordonnée, **sans doublons**, min 2, max illimité | ux.md L2221-2245 |

**Cascade suppression** _(ux.md L2419-2446)_ :

- Suppression étape : retrait des séquences ; si <2 étapes, séquence supprimée
- Suppression carte mère : séquence supprimée

---

## 3.12 État "fait" (séquence)

| Attribut conceptuel | Description                               | Référence        |
| ------------------- | ----------------------------------------- | ---------------- |
| Portée              | Par occurrence (slot_id)                  | ux.md L2392-2394 |
| Persistance         | Local-only, non sync cloud                | ux.md L2391      |
| Durée               | Session active ; reset à nouvelle session | ux.md L2396-2398 |

---

### Checklist de complétude (Chapitre 3)

- [x] Compte utilisateur avec timezone
- [x] Appareil avec device_id
- [x] Profil enfant avec **état verrouillé**
- [x] Carte (banque vs personnelle) avec invariant banque
- [x] Catégorie avec "Sans catégorie"
- [x] **Table pivot contractuelle** avec UNIQUE et fallback
- [x] Timeline avec invariants structurels
- [x] Slot avec slot_id et règle slot vide
- [x] Session avec **epoch**
- [x] Progression avec **union ensembliste**
- [x] Séquence avec cascades
- [x] État "fait" local-only

### Points ambigus détectés (Chapitre 3)

1. ~~**Révocation device_id**~~ : ✅ **Tranché v14** — Page Profil avec révocation manuelle (voir Ch.3.2)

---

# 4. Relations & cardinalités (contrat)

## 4.1 Hiérarchie d'ownership

### 4.1.1 Compte → Profils enfants

- **1 compte** possède **0..n profils enfants** _(ux.md L2536-2539)_
- **1 profil enfant** appartient à **1 compte** _(ux.md L2528)_

### 4.1.2 Compte → Cartes & Catégories

- **1 compte** possède **0..n cartes personnelles** et **0..n catégories** _(ux.md L1135-1143)_
- **1 catégorie** appartient à **1 utilisateur** (pas de catégories globales) _(ux.md L1143)_
- **Cartes de banque** : créées par Admin, **visibles à tous** _(ux.md L1213-1232)_

### 4.1.3 Compte → Appareils

- **1 compte** peut être utilisé sur **plusieurs appareils** (selon plan) _(ux.md L2631-2647)_
- **1 appareil** (device_id) rattaché à **0..n comptes** (tablette partagée / multi-login), via unicité DB `UNIQUE (account_id, device_id)`

---

## 4.2 Cartes ↔ Catégories (classement personnel)

### 4.2.1 Table pivot contractuelle

> **Encadré DB** _(ux.md L1151-1162)_

| Colonne       | Description           |
| ------------- | --------------------- |
| `user_id`     | Référence utilisateur |
| `card_id`     | Référence carte       |
| `category_id` | Référence catégorie   |

**Contrainte** : `UNIQUE (user_id, card_id)`

**Fallback** : si aucune ligne, carte = "Sans catégorie" (applicatif, pas NULL DB)

### 4.2.2 Cardinalités

- **1 carte** → **1 catégorie** par utilisateur (pas de multi-catégories) _(ux.md L1207)_
- **1 catégorie** → **0..n cartes**

### 4.2.3 Suppression catégorie

- Cartes réassignées à "Sans catégorie" ; aucune carte supprimée _(ux.md L1186-1197)_

---

## 4.3 Profil enfant ↔ Timeline ↔ Slots ↔ Cartes

### 4.3.1 Profil enfant ↔ Timeline

- **1 profil enfant** possède **1 timeline active** _(ux.md L349)_
- Timeline **spécifique** au profil (pas de partage) _(ux.md L2530)_

### 4.3.2 Timeline ↔ Slots

- **1 timeline** contient **1..n slots Étapes** + **1 slot Récompense** _(ux.md L347, L381-388)_
- Slots **ordonnés**, réorganisables par drag & drop _(ux.md L360)_

### 4.3.3 Slot ↔ Carte

- **1 slot** référence **0..1 carte** (slot vide possible) _(ux.md L355-356)_
- **1 carte** peut être utilisée dans **0..n usages** _(ux.md L962-974)_

### 4.3.4 Identité slots

- `slot_id` (UUID) indépendant de la position _(ux.md L358)_
- Règles verrouillage s'appliquent au `slot_id`, pas à l'index _(ux.md L362)_

---

## 4.4 Sessions ↔ Progression

### 4.4.1 Profil enfant ↔ Sessions

- **0..n sessions** dans le temps pour une timeline _(ux.md L409)_
- **Invariant** : **1 session active max** par (profil, timeline) _(ux.md L487, L2666)_

### 4.4.2 Session ↔ Progression

- Progression rattachée à la session, **jamais à la timeline** _(ux.md L421)_

### 4.4.3 Session ↔ Slots validés

- **1 session** a **0..n slots validés** (ensemble de slot*id) *(ux.md L391-395)\_
- État réinitialisé à chaque nouvelle session _(ux.md L395)_

### 4.4.4 Session ↔ Epoch

- **1 session** possède **1 epoch** (entier versioning) _(ux.md L2696-2702)_

---

## 4.5 Jetons

### 4.5.1 Définition

- Jetons sur **slots Étapes**, jamais sur cartes _(ux.md L1975-1976)_
- **1 slot Étape** porte **0..5 jetons** _(ux.md L375)_

### 4.5.2 Collecte

- Jetons collectés = partie de la progression _(ux.md L418)_
- Total **recalculé** depuis slots validés (pas source indépendante) _(ux.md L2065-2069)_

---

## 4.6 Séquençage

### 4.6.1 Carte ↔ Séquence

- **1 carte** peut avoir **0..1 séquence** par utilisateur _(ux.md L2147)_
- Séquence toujours **personnelle** (pas de globale) _(ux.md L2154-2164)_

### 4.6.2 Séquence ↔ Étapes

- **1 séquence** contient **2..n étapes** (min 2) _(ux.md L2244)_
- Chaque étape = carte existante, **sans doublon** _(ux.md L2221-2223)_

### 4.6.3 Cascades suppression

- Suppression étape : retrait ; si <2 étapes, séquence supprimée _(ux.md L2427-2434)_
- Suppression carte mère : séquence supprimée _(ux.md L2436-2446)_

---

### Checklist de complétude (Chapitre 4)

- [x] Compte → profils, cartes, catégories, appareils
- [x] **Table pivot** avec UNIQUE et fallback
- [x] Profil ↔ timeline (1:1)
- [x] Timeline ↔ slots avec slot_id persistant
- [x] Sessions + **epoch** + invariant 1 active max
- [x] Progression jamais sur timeline
- [x] Jetons sur slots (pas cartes), recalculés
- [x] Séquençage : unicité, min 2, cascades

### Points ambigus détectés (Chapitre 4)

1. **Carte utilisée plusieurs fois dans même timeline** : non spécifié si limité. À clarifier si nécessaire.

---

# 5. États & cycles de vie

## 5.1 Timeline (structure)

### 5.1.1 Invariants structurels

- **1 slot Récompense** toujours présent (peut être vide) _(ux.md L1482-1486)_
- **Minimum 1 slot Étape** (dernier non supprimable) _(ux.md L688, L1485)_

### 5.1.2 Événements

- **Ouverture** : 1 slot Récompense + 1 slot Étape _(ux.md L1476-1480)_
- **Ajout slot** : bouton ➕ _(ux.md L1492)_
- **Suppression slot** : sauf dernier Étape _(ux.md L1485)_
- **Vider timeline** : retour structure minimale _(ux.md L2566-2568)_

### 5.1.3 Reflow/compactage

- Réorganisation "sans trou visuel" après suppression _(ux.md L671-678)_
- Ne supprime jamais un slot Étape implicitement _(ux.md L678)_

---

## 5.2 Slot (structure)

- `slot_id` (UUID) indépendant de la position _(ux.md L358)_
- **Slot Étape** : jetons 0..5 _(ux.md L375-377)_
- **Slot Récompense** : sans jetons, non cliquable _(ux.md L381-388)_
- **Slot validé** : état temporaire dans session active _(ux.md L391-395)_
- **Slot Étape vide** : ignoré en Tableau _(ux.md L692-696)_

---

## 5.3 Session — machine à états

### 5.3.1 États

| État                          | Description                               |
| ----------------------------- | ----------------------------------------- |
| **Inexistante**               | Aucune session active                     |
| **Active (Prévisualisation)** | 0 validation (sous-état, pas état séparé) |
| **Active (Démarrée)**         | ≥1 validation                             |
| **Terminée**                  | Toutes étapes validées ; lecture seule    |

_(ux.md L429-451)_

### 5.3.2 Transitions

```
Inexistante ──[Entrée Tableau]──► Active (Prévisualisation, epoch=1)
                                        │
                                [1ère validation]
                                        │
                                        ▼
                                Active (Démarrée)
                                        │
                                [Dernière validation]
                                        │
                                        ▼
                                    Terminée
                                        │
                            [Réinitialisation (epoch++)]
                                        │
                                        ▼
                        Active (Prévisualisation, epoch=N+1)
```

### 5.3.3 Règles transitions

| Événement                       | Effet                                    | Référence             |
| ------------------------------- | ---------------------------------------- | --------------------- |
| Entrée Tableau (si pas session) | Création session, epoch=1                | ux.md L442-443, L2699 |
| Première validation             | Démarrage effectif (pas de bouton Start) | ux.md L446-448        |
| Dernière validation             | Terminée, lecture seule                  | ux.md L467-469        |
| Quitter Tableau                 | Pause (pas changement état)              | ux.md L453-454        |
| Réinitialisation                | Nouvelle session, epoch++, progression=0 | ux.md L475-479, L2701 |

Une session **Terminée** est **strictement en lecture seule** : aucune validation supplémentaire n’est acceptée ; le seul retour à une progression à zéro passe par **Réinitialisation de session** (nouvelle session).

### 5.3.4 Epoch de session (CONTRAT CRITIQUE)

> **Définition** _(ux.md L2696-2716)_

| Événement                   | Effet                                                                        |
| --------------------------- | ---------------------------------------------------------------------------- |
| Création session            | `epoch = 1`                                                                  |
| Réinitialisation de session | `epoch = MAX(epoch historique) + 1` pour ce couple (profil enfant, timeline) |

> **Précision DB-first** : l’epoch est une **version globale** de session pour une timeline donnée (par profil enfant).
> Il est calculé en se basant sur l’historique (MAX), afin d’éviter tout conflit ou duplication d’epoch en cas de resets multiples.

**Règle sync** : progression avec epoch < epoch_courant = **obsolète** (ignorée/écrasée)

**Exemple edge case** _(ux.md L2713-2715)_ :

- Appareil A valide {1,2,3} offline
- Appareil B réinitialise (epoch 1→2)
- A revient online : état A **écrasé**, A se réaligne sur epoch=2, progression=0

---

### 5.3.5 Définition contractuelle de “dernière étape” (snapshot TSA)

**Objectif TSA** : éviter toute “surprise” en cours d’exécution (une session qui devient soudainement plus longue / plus courte après démarrage).

**Règle** : à la **première validation** (passage Prévisualisation → Démarrée), le système fige un **snapshot** :

- `steps_total_snapshot` = **nombre de slots Étape non vides** (card_id non NULL) présents dans la timeline à cet instant.
- Les slots Étape vides sont ignorés (non affichés / non exécutables en Tableau).

**Complétion** : la session devient **Terminée** quand le nombre de validations distinctes (slot_id) atteint `steps_total_snapshot`.

**Conséquence contractuelle** :

- Toute modification structurelle pouvant changer le nombre d’étapes “comptées” après démarrage effectif (ajout d’étape non vide, suppression d’une étape non validée, etc.) doit passer par une **Réinitialisation de session** si l’on veut que ces changements s’appliquent à l’exécution.

---

## 5.4 Règles de verrouillage (CONSOLIDÉ)

### 5.4.1 Principe

- Toute action Édition pouvant créer incohérence est contrôlée _(ux.md L491-493)_

### 5.4.2 Avant première validation (Prévisualisation)

| Élément                 | Autorisé ?        |
| ----------------------- | ----------------- |
| Modifier cartes         | ✅                |
| Modifier ordre          | ✅                |
| Ajouter/supprimer slots | ✅ (sauf dernier) |
| Modifier jetons         | ✅                |

_(ux.md L1783)_

### 5.4.3 Après première validation (Démarrée)

| Élément         | Slot validé | Slot non validé   |
| --------------- | ----------- | ----------------- |
| Déplacer        | ❌          | ✅                |
| Supprimer       | ❌          | ✅ (sauf dernier) |
| Modifier jetons | ❌          | ❌\*              |
| Vider           | ❌          | ✅                |

_\* Peut ajouter nouveau slot avec jetons au moment de l'ajout_ _(ux.md L1787)_

### 5.4.4 Hors session active

- Timeline **entièrement éditable** _(ux.md L1791-1795)_

### 5.4.5 Verrouillage profil (downgrade)

| État                   | Actions                                 |
| ---------------------- | --------------------------------------- |
| Actif                  | Toutes selon plan                       |
| Actif (au-delà limite) | Exécution only, pas recomposition/reset |
| Verrouillé             | Lecture seule                           |

_(ux.md L3206-3214)_

---

## 5.5 Cartes — cycle de vie

### 5.5.1 Création (personnelle)

- Nom + image requis ; catégorie = "Sans catégorie" ; privée _(ux.md L1364-1370)_

### 5.5.2 Édition

- Nom modifiable ; catégorie modifiable ; image **figée** _(ux.md L1372-1378)_

### 5.5.3 Usage

- Références (pas copies) ; dans plusieurs timelines/séquences _(ux.md L962-974)_

### 5.5.4 Suppression

- Confirmation ; retrait tous usages ; si session active → réinitialisation _(ux.md L1074-1079)_

### 5.5.5 Banque

- Dépublication ≠ suppression ; reste utilisable où déjà présente _(ux.md L1275-1281)_
- **Invariant** : jamais supprimée si référencée _(ux.md L2979)_

---

### Checklist de complétude (Chapitre 5)

- [x] Timeline : invariants, événements, reflow
- [x] Slot : slot_id, types, slot validé, slot vide ignoré
- [x] Session : machine à états complète
- [x] **Epoch** : définition contractuelle avec règle sync
- [x] **Verrouillages consolidés** : avant/après démarrage, hors session, profils
- [x] Cartes : cycle de vie + invariant banque

### Points ambigus détectés (Chapitre 5)

1. **Message confirmation "Vider la timeline"** : contenu exact non spécifié. À documenter UX.

---

# 6. Règles métier par système (séparés)

> Les 3 systèmes sont **distincts** et ne se substituent jamais.

## 6.1 Planning visuel

### 6.1.1 Définition _(ux.md L1821-1837)_

- Timeline **sans économie de jetons** (tous slots à 0 jeton)
- Repose sur : ordre des cartes + états Maintenant/À venir/Fini

### 6.1.2 Comportement

- Grille de jetons **non affichée** _(ux.md L1628-1630)_
- Récompense **optionnelle** (marque fin de parcours) _(ux.md L1911-1918)_
- Validation via checkbox, une par une _(ux.md L1893-1898)_

### 6.1.3 Fin sans récompense _(ux.md L1920-1922)_

- Feedback léger : "Bravo, c'est terminé !" + transition douce
- Objectif : éviter ambiguïté "c'est fini ?"

### 6.1.4 Invariants _(ux.md L1926-1934)_

- Fonctionne **sans jetons**
- Ordre défini par adulte
- Enfant ne peut jamais modifier structure
- Aucune info abstraite (quota, score) côté enfant

---

## 6.2 Économie de jetons

### 6.2.1 Définition _(ux.md L1958-1968)_

- Système **optionnel superposé** au planning visuel
- Activé si **≥1 slot Étape a >0 jeton**

### 6.2.2 Calcul des jetons _(ux.md L1998-2008)_

- Chaque slot Étape : 0..5 jetons
- Total = somme des jetons de tous slots Étapes
- **Recalculé** tant qu'aucune validation (Prévisualisation)
- **Figé** dès première validation

**Évolution après démarrage** _(ux.md L2010-2020)_ :

- Si adulte **ajoute un nouveau slot Étape avec jetons** pendant session Démarrée :
  - La nouvelle valeur totale **n'apparaît PAS en direct** sur un Tableau déjà affiché
  - Elle apparaît **uniquement au prochain Chargement du Contexte Tableau**
  - Objectif : éviter surprise visuelle côté enfant (protection TSA)

### 6.2.3 Collecte _(ux.md L2036-2047)_

- À validation : jetons du slot collectés
- Animation séquencée, toujours visible
- Respecte `prefers-reduced-motion` _(ux.md L1739-1743)_

### 6.2.4 Source de vérité _(ux.md L2063-2069)_

- Jetons collectés **ne sont PAS** source indépendante
- Total **toujours recalculé** depuis slots validés
- En multi-appareils : seule validation fusionnée, jetons recalculés

### 6.2.5 Réinitialisation _(ux.md L2051-2059)_

- Jetons **reset à chaque session**
- Jamais cumulés entre sessions
- Pas de score permanent

### 6.2.6 Récompense conditionnelle _(ux.md L2073-2080)_

- Si économie jetons active + récompense présente :
  - Récompense verrouillée tant que grille non complète
  - Animation célébration au déblocage

### 6.2.7 Protection émotionnelle _(ux.md L2084-2092)_

- Aucun jeton perdu
- Aucun échec possible
- Aucun message négatif
- Enfant ne voit jamais règles/calculs/conditions

### 6.2.8 Invariants _(ux.md L2096-2101)_

- Jetons liés aux **slots**, jamais aux cartes
- Jetons **temporaires** (session)
- Économie jetons toujours **optionnelle**
- Planning visuel fonctionne sans jetons

---

## 6.3 Séquençage

### 6.3.1 Définition _(ux.md L2120-2138)_

- **Aide visuelle optionnelle** pour décomposer une carte mère
- Purement visuel côté enfant
- **Indépendant** de la validation de la tâche
- Peut être utilisé ou ignoré selon moment

### 6.3.2 Carte mère ↔ Séquence _(ux.md L2143-2164)_

- Toute carte peut devenir carte mère
- **0..1 séquence** par carte par utilisateur
- Séquence **toujours personnelle** (aucune globale)

### 6.3.3 Création/édition _(ux.md L2188-2238)_

- Bouton "Séquence" sur chaque carte (Édition uniquement)
- Mode séquençage réutilise composant Timeline :
  - Slots Étapes uniquement
  - Slot Récompense désactivé
  - Jetons non visibles
  - Drag & drop autorisé

### 6.3.4 Contraintes étapes _(ux.md L2216-2245)_

- Liste ordonnée de cartes existantes
- **Sans doublons** (strictement interdit)
- **Minimum 2 étapes** (vérifié à la sortie)
- Maximum : illimité

### 6.3.5 Mini-timeline (Tableau) _(ux.md L2355-2365)_

- Affichée sous carte mère au focus via bouton "Voir étapes"
- Scrollable horizontalement
- Utilisable à une main
- Ne permet aucune modification

### 6.3.6 État "fait" (purement visuel) _(ux.md L2369-2399)_

| Caractéristique | Valeur                               |
| --------------- | ------------------------------------ |
| Nature          | Visuel uniquement                    |
| Persistance     | Local-only, **non sync cloud**       |
| Portée          | Par **slot_id** (occurrence)         |
| Durée           | Session active                       |
| Reset           | Nouvelle session ou réinitialisation |

- Si même carte mère plusieurs fois dans timeline : chaque occurrence a son propre état "fait"
- Peut être perdu si changement d'appareil

### 6.3.7 Validation carte mère _(ux.md L2403-2415)_

- **Exclusivement** via checkbox
- Tap/clic sur image/nom = **aucune action**
- État "fait" des étapes = **aucun impact** sur validation
- Même si toutes étapes grisées, carte mère **non validée automatiquement**

### 6.3.8 Cascades suppression _(ux.md L2419-2446)_

- Suppression carte utilisée comme étape :
  - Retrait de toutes séquences
  - Si <2 étapes : séquence supprimée
- Suppression carte mère :
  - Séquence supprimée (cascade)
  - Aucune séquence orpheline

### 6.3.9 Quotas

- Séquençage **non soumis à quota** _(ux.md L2451-2454)_

---

### Checklist de complétude (Chapitre 6)

- [x] Planning visuel : définition, comportement, fin sans récompense, invariants
- [x] Économie jetons : activation, calcul, collecte, **source de vérité recalculée**, réinitialisation, invariants
- [x] Séquençage : définition, carte mère, création, contraintes, mini-timeline, **état "fait" local-only par slot_id**, validation, cascades, pas de quota

### Points ambigus détectés (Chapitre 6)

Aucun — les 3 systèmes sont complètement spécifiés dans ux.md.

---

# 7. Contrats d'actions (préconditions, effets, contexte)

> Chaque action est documentée avec : acteur, contexte, préconditions, effets, comportement offline/sync.

## 7.1 Actions Timeline (Contexte Édition)

> **Note globale Visitor** : Visitor a accès à **"Composition et exécution de timelines"** (ux.md L750).
> Sauf mention contraire explicite, Visitor est **autorisé** pour toutes actions de composition timeline (ajouter/supprimer/réorganiser slots, vider timeline).
> Contrainte offline (ux.md L2900-2909) ne s'applique **qu'aux utilisateurs authentifiés** temporairement déconnectés.

### 7.1.1 Ajouter un slot Étape

| Élément           | Valeur                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| **Acteur**        | Adulte (Visitor/Free/Abonné/Admin)                                                                    |
| **Contexte**      | Édition                                                                                               |
| **Préconditions** | Timeline existe ; online requis pour utilisateurs authentifiés (Free/Abonné/Admin) ; Visitor autorisé |
| **Effets**        | Nouveau slot Étape vide ajouté en fin de liste ; jetons = 0                                           |
| **Offline**       | Bloqué pour utilisateurs authentifiés si offline (modification structurelle) ; Visitor toujours OK    |

**Clarification Visitor** _(ux.md L750, L2838-2841)_ :

- Visitor a accès à **"Composition et exécution de timelines"** (ux.md L750)
- Visitor est **structurellement local-only** (aucune synchronisation cloud, ux.md L2838-2841)
- Contrainte "offline" (ux.md L2900-2909) s'applique **uniquement aux utilisateurs authentifiés** temporairement déconnectés
- Visitor **n'est pas concerné** par contrainte offline réseau → peut toujours composer timelines

### 7.1.2 Supprimer un slot Étape

| Élément           | Valeur                                                             |
| ----------------- | ------------------------------------------------------------------ |
| **Acteur**        | Adulte                                                             |
| **Contexte**      | Édition                                                            |
| **Préconditions** | ≥2 slots Étapes ; slot non validé si session active                |
| **Effets**        | Slot supprimé ; reflow ; si session active et slot non validé = OK |
| **Interdit**      | Dernier slot Étape ; slot déjà validé                              |

**Règle focus après suppression** _(ux.md L502-505)_ :

- Si le slot supprimé est **au focus** (non validé) pendant une session active :
  - Le focus bascule automatiquement vers la **prochaine étape non validée** disponible
  - Aucun état corrompu ou blank screen côté enfant (protection TSA)

### 7.1.3 Vider la timeline

| Élément           | Valeur                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Acteur**        | Adulte                                                                                                                 |
| **Contexte**      | Édition                                                                                                                |
| **Préconditions** | Timeline existe                                                                                                        |
| **Effets**        | Structure minimale (1 slot Étape vide + 1 slot Récompense vide) ; si session active → **réinitialisation automatique** |
| **Référence**     | ux.md L2563-2578                                                                                                       |

### 7.1.4 Réorganiser slots (drag & drop)

| Élément           | Valeur                                         |
| ----------------- | ---------------------------------------------- |
| **Acteur**        | Adulte                                         |
| **Contexte**      | Édition                                        |
| **Préconditions** | Si session active : slot non validé uniquement |
| **Effets**        | Ordre modifié ; `slot_id` inchangé             |

---

## 7.2 Actions Session

### 7.2.1 Créer session (automatique)

| Élément           | Valeur                                                                         |
| ----------------- | ------------------------------------------------------------------------------ |
| **Acteur**        | Système                                                                        |
| **Contexte**      | Entrée Tableau                                                                 |
| **Préconditions** | Aucune session active pour ce profil+timeline                                  |
| **Effets**        | Session créée ; état = Active (Prévisualisation) ; epoch = 1 ; progression = 0 |
| **Référence**     | ux.md L442-443, L2699                                                          |

### 7.2.2 Valider une étape

| Élément           | Valeur                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Acteur**        | Enfant                                                                                                                                    |
| **Contexte**      | Tableau                                                                                                                                   |
| **Préconditions** | Session non Terminée ; slot **Étape** non validé ; slot **non vide** (card_id non NULL) ; slot appartient à la **timeline de la session** |
| **Effets**        | Slot marqué validé ; si première validation → session Démarrée ; progression avance ; jetons collectés (si >0)                            |
| **Référence**     | ux.md L446-448, L1700-1714                                                                                                                |

### 7.2.3 Terminer session (automatique)

| Élément           | Valeur                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| **Acteur**        | Système                                                                |
| **Contexte**      | Tableau                                                                |
| **Préconditions** | Dernière étape validée                                                 |
| **Effets**        | Session = Terminée ; récompense débloquée visuellement ; lecture seule |
| **Référence**     | ux.md L467-469                                                         |

### 7.2.4 Réinitialiser session

| Élément           | Valeur                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| **Acteur**        | Adulte                                                                                             |
| **Contexte**      | Édition                                                                                            |
| **Préconditions** | Session existe (Active ou Terminée)                                                                |
| **Effets**        | Nouvelle session ; **epoch = MAX(epoch historique)+1** (pour ce profil+timeline) ; progression = 0 |
| **Sync**          | Toute progression avec epoch inférieur = obsolète                                                  |
| **Référence**     | ux.md L475-479, L2701                                                                              |

---

## 7.3 Actions Cartes

### 7.3.1 Créer carte personnelle

| Élément           | Valeur                                                                         |
| ----------------- | ------------------------------------------------------------------------------ |
| **Acteur**        | Abonné/Admin                                                                   |
| **Contexte**      | Édition                                                                        |
| **Préconditions** | Quota stock non atteint ; quota mensuel non atteint ; online                   |
| **Effets**        | Carte créée ; catégorie = "Sans catégorie" ; quota stock +1 ; quota mensuel +1 |
| **Référence**     | ux.md L1364-1370                                                               |

### 7.3.2 Supprimer carte personnelle

| Élément           | Valeur                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| **Acteur**        | Propriétaire                                                                                               |
| **Contexte**      | Édition                                                                                                    |
| **Préconditions** | Carte existe ; confirmation si utilisée                                                                    |
| **Effets**        | Retrait de tous usages ; si session active référence carte → **réinitialisation session** ; quota stock -1 |
| **Référence**     | ux.md L1074-1079                                                                                           |

### 7.3.3 Modifier catégorie d'une carte

| Élément           | Valeur                                   |
| ----------------- | ---------------------------------------- |
| **Acteur**        | Propriétaire                             |
| **Contexte**      | Édition                                  |
| **Préconditions** | Carte visible pour cet utilisateur       |
| **Effets**        | Mise à jour pivot `user_card_categories` |

### 7.3.4 Décocher carte dans bibliothèque (édition timeline)

| Élément           | Valeur                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- |
| **Acteur**        | Adulte                                                                              |
| **Contexte**      | Édition (bibliothèque de cartes)                                                    |
| **Préconditions** | Carte présente dans timeline active                                                 |
| **Effets**        | **Retire toutes les occurrences** de la carte dans la timeline ; reflow automatique |
| **Référence**     | Décision produit v14                                                                |

**Comportement décision v14** :

- Décocher une carte dans la bibliothèque = action "présent/absent" simple
- **Retire toutes occurrences** de `card_id` dans tous les slots de la timeline
- Reflow automatique (compactage sans trou visuel)
- **Aucune contrainte DB unicité** : le schéma reste permissif (une carte peut apparaître plusieurs fois), c'est une règle de comportement front

---

## 7.4 Actions Admin (Banque)

### 7.4.1 Publier carte en banque

| Élément           | Valeur                              |
| ----------------- | ----------------------------------- |
| **Acteur**        | Admin                               |
| **Contexte**      | Administration                      |
| **Préconditions** | Carte personnelle Admin existe      |
| **Effets**        | Carte visible dans banque pour tous |
| **Référence**     | ux.md L1249-1270                    |

### 7.4.2 Dépublier carte de banque

| Élément           | Valeur                                                             |
| ----------------- | ------------------------------------------------------------------ |
| **Acteur**        | Admin                                                              |
| **Contexte**      | Administration                                                     |
| **Préconditions** | Carte publiée en banque                                            |
| **Effets**        | Carte retirée de banque ; **reste utilisable** là où déjà présente |
| **Interdit**      | Suppression définitive si référencée                               |
| **Référence**     | ux.md L1273-1281, L2979                                            |

---

## 7.5 Actions Séquence

### 7.5.1 Créer séquence

| Élément           | Valeur                                                                  |
| ----------------- | ----------------------------------------------------------------------- |
| **Acteur**        | Abonné/Admin                                                            |
| **Contexte**      | Mode Séquençage (Édition)                                               |
| **Préconditions** | Carte mère sans séquence (pour cet utilisateur) ; ≥2 étapes à la sortie |
| **Effets**        | Séquence créée ; personnelle à l'utilisateur                            |

### 7.5.2 Supprimer séquence

| Élément           | Valeur                                                  |
| ----------------- | ------------------------------------------------------- |
| **Acteur**        | Propriétaire                                            |
| **Contexte**      | Mode Séquençage                                         |
| **Préconditions** | Séquence existe                                         |
| **Effets**        | Séquence supprimée ; carte mère redevient carte normale |

---

### Checklist de complétude (Chapitre 7)

- [x] Actions Timeline : ajouter/supprimer slot (+ focus après suppression), vider, réorganiser
- [x] Actions Session : création auto, validation, terminaison, **réinitialisation avec epoch++**
- [x] Actions Cartes : créer, supprimer avec réinitialisation session, modifier catégorie, **décocher (v14)**
- [x] Actions Admin : publier, dépublier (≠ supprimer)
- [x] Actions Séquence : créer, supprimer

### Points ambigus détectés (Chapitre 7)

1. ~~**Décocher une carte dans bibliothèque**~~ : ✅ **Tranché v14** — Retire toutes occurrences (voir Ch.7.3.4)
2. **Aucun slot vide disponible lors ajout carte** : comportement non spécifié. À trancher (non bloquant DB).

---

# 8. Offline / Sync / Multi-appareils

## 8.1 Principe fondamental

- **Exécution autorisée** hors ligne _(ux.md L2829)_
- **Modification structurelle interdite** hors ligne _(ux.md L2830)_

---

## 8.2 Visitor (local uniquement)

| Aspect           | Description                          | Référence        |
| ---------------- | ------------------------------------ | ---------------- |
| Données          | Persistées **localement uniquement** | ux.md L2836-2841 |
| Source de vérité | Stockage local                       | ux.md L2840      |
| Sync cloud       | **Aucune**                           | ux.md L2841      |

**Persisté localement** _(ux.md L2843-2847)_ :

- Timelines composées
- Sessions d'exécution
- Avancée (étapes cochées, jetons collectés)

---

## 8.3 Utilisateur connecté (Free/Abonné)

| Aspect           | Description                   | Référence        |
| ---------------- | ----------------------------- | ---------------- |
| Données          | Persistées local + sync cloud | ux.md L2851-2860 |
| Source de vérité | **Cloud** à long terme        | ux.md L2856      |
| Local            | Cache + support offline       | ux.md L2857-2860 |

---

## 8.4 Actions hors ligne

> **Périmètre** : Cette section s'applique aux **utilisateurs authentifiés (Free/Abonné/Admin)** temporairement déconnectés.
> Visitor est **structurellement local-only** (Ch.1.2, ux.md L2838-2841) → non concerné par contrainte offline réseau.

### 8.4.1 Autorisées (utilisateurs authentifiés offline) _(ux.md L2879-2884)_

- Exécuter timeline existante
- Continuer session entamée
- Pause/reprise (implicite)
- Basculer entre profils/activités **sans modification structurelle**

### 8.4.2 Interdites (utilisateurs authentifiés offline) _(ux.md L2900-2909)_

- CRUD cartes
- CRUD catégories
- Créer timeline
- Modifier structure timeline
- Réorganiser slots
- Modifier jetons

**UX** : actions visibles mais **désactivées** + toast "Indisponible hors ligne" _(ux.md L2913-2916)_

---

## 8.5 Multi-appareils

### 8.5.1 Règle session active

- **1 seule session active** par (profil, timeline) _(ux.md L2659-2666)_
- Indépendant du nombre d'appareils

### 8.5.2 Fusion monotone (CONTRAT CRITIQUE)

> **Principe** _(ux.md L2679-2694)_

La progression **ne régresse jamais automatiquement**.

**Règle de fusion = UNION ENSEMBLISTE** :

```
Appareil A valide : {slot_1, slot_2}
Appareil B valide : {slot_2, slot_3}
Résultat sync    : {slot_1, slot_2, slot_3}
```

- Toute étape validée sur un appareil = **validée**
- Jetons collectés ne peuvent pas diminuer (sauf reset)

### 8.5.3 Exception : Réinitialisation

La fusion monotone s'applique **tant qu'aucune réinitialisation n'a eu lieu** _(ux.md L2704-2716)_

- Réinitialisation = exception volontaire
- Crée nouvelle session avec **epoch++**
- Toute progression avec epoch inférieur = **obsolète, écrasée**

**Edge case contractuel** _(ux.md L2713-2715)_ :

```
1. Appareil A valide slots 1-3 (offline)
2. Appareil B réinitialise la session (epoch 1→2)
3. A revient online
4. État A (epoch=1) est ÉCRASÉ
5. A se réaligne sur nouvelle session (epoch=2, progression=0)
```

### 8.5.4 Règle anti-choc TSA _(ux.md L2717-2722)_

L'écrasement n'est **jamais appliqué "en direct"** pendant exécution enfant.
→ Appliqué uniquement au **prochain Chargement du Contexte Tableau**

**Aucun conflit/message technique** côté enfant.

---

## 8.6 Import Visitor → Compte

### 8.6.1 Déclencheur _(ux.md L2953-2956)_

- Visitor crée compte sur même appareil
- Import **explicite** proposé (choix utilisateur)

### 8.6.2 Périmètre import _(ux.md L2964-2970)_

- Timelines (structure)
- Sessions + progression
- Séquences
- Mapping catégories

### 8.6.3 Cartes de banque dépubliées _(ux.md L2973-2984)_

- Si données Visitor utilisent carte dépubliée : **reste utilisable** dans usages importés
- Dépublication empêche **uniquement** nouveaux usages

---

## 8.7 Indication réseau

- États réseau **jamais visibles côté enfant** _(ux.md L2940-2947)_
- Contexte Édition : bandeau discret possible
- Aucun modal bloquant
- Sync automatique au retour réseau

---

### Checklist de complétude (Chapitre 8)

- [x] Principe : exécution OK, structure bloquée
- [x] Visitor : local uniquement
- [x] Connecté : local + cloud, cloud = source vérité
- [x] Actions offline : autorisées vs interdites
- [x] Multi-appareils : 1 session active max
- [x] **Fusion monotone = union ensembliste**
- [x] **Exception reset avec epoch**
- [x] Règle anti-choc TSA
- [x] Import Visitor avec gestion dépubliées

### Points ambigus détectés (Chapitre 8)

Aucun — les règles sync sont complètement spécifiées.

---

# 9. Quotas & Plans

## 9.1 Principe général _(ux.md L3015-3030)_

Les quotas sont :

- **Bloquants** (action interdite = aucun état partiel)
- Accompagnés d'un **message explicite**
- Visibles **uniquement en Contexte Édition**
- **Jamais visibles côté enfant**

---

## 9.2 Distinction fondamentale _(ux.md L3034-3043)_

| Type                        | Description                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| **Quota de plan**           | Limite commerciale, liée à l'abonnement                            |
| **Limitation structurelle** | Contrainte inhérente au statut (ex: Visitor), indépendante du plan |

---

## 9.3 Quotas cartes _(ux.md L3047-3096)_

### 9.3.1 Quota de stock

- Nombre max total de cartes personnelles
- Supprimer libère immédiatement un slot
- Cartes de banque = quota 0

### 9.3.2 Quota mensuel

- Nombre max de nouvelles cartes par mois
- Modifier carte existante = quota 0
- Supprimer puis recréer = consomme quota
- Calculé selon **timezone du compte** (défaut Europe/Paris)
- Reset au **1er du mois à 00:00 heure locale**

### 9.3.3 Anti-abus timezone _(ux.md L3078-3084)_

- Timestamps création stockés en **UTC**
- Timezone sert uniquement pour bornes mois
- Changement timezone = **effet au prochain mois** (mois en cours conserve timezone initiale)

### 9.3.4 Valeurs par statut

| Statut     | Stock    | Mensuel      |
| ---------- | -------- | ------------ |
| Visitor    | N/A\*    | N/A\*        |
| Free       | N/A\*    | N/A\*        |
| **Abonné** | **50**   | **100/mois** |
| Admin      | Illimité | Illimité     |

_\* "N/A" = fonctionnalité indisponible (pas création cartes), pas illimité_

---

## 9.4 Limites profils enfants _(ux.md L3103-3133)_

| Statut     | Profils                   |
| ---------- | ------------------------- |
| Visitor    | 1 (structurel, pas quota) |
| **Free**   | **1**                     |
| **Abonné** | **3**                     |
| Admin      | Illimité                  |

**Dépassement** : création bloquée + message "Nombre maximum de profils enfants atteint."

---

## 9.5 Limites appareils _(ux.md L3137-3171)_

| Statut     | Appareils                      |
| ---------- | ------------------------------ |
| Visitor    | N/A (structurel mono-appareil) |
| **Free**   | **1**                          |
| **Abonné** | **3**                          |
| Admin      | Illimité                       |

**Dépassement** : accès refusé depuis nouvel appareil + message "Nombre maximum d'appareils atteint."

**Aucune déconnexion automatique** des sessions existantes.

---

## 9.6 Sessions actives (structurel) _(ux.md L3173-3188)_

| Règle                                   | Valeur                                |
| --------------------------------------- | ------------------------------------- |
| Sessions actives par (profil, timeline) | **1 max**                             |
| Type                                    | **Structurel** (pas quota commercial) |
| Applicable à                            | **Tous statuts**                      |

---

## 9.7 Timelines _(ux.md L3192-3203)_

- Nombre de timelines = **jamais limité**
- Quel que soit le statut
- Intentionnel : éviter frustration, favoriser adaptation TSA

---

## 9.8 Downgrade Abonné → Free _(ux.md L3206-3227)_

### 9.8.1 Mode Free activé

- **Exécution uniquement** : aucune modification structurelle
- Profils au-delà limite Free : accessibles pour **terminer sessions actives**
- Session terminée sur profil excédentaire : **lecture seule**, non relançable

### 9.8.2 Verrouillage profils

- Une fois toutes sessions terminées sur profils excédentaires : **verrouillés**
- Utilisateur conserve **1 profil actif** (Free)

### 9.8.3 Sélection profil actif

- Profil **le plus anciennement créé** reste actif par défaut
- Profils excédentaires = état **verrouillé (lecture seule)**

### 9.8.4 Réactivation (upgrade)

- Passage Abonné : profils verrouillés **réactivés automatiquement** dans limite plan

---

## 9.9 Messages UX verrouillés _(ux.md L3444-3476)_

### 9.9.1 PersonalizationModal — Visitor

> "Pour créer tes propres tâches et catégories, crée un compte et abonne-toi."
>
> Boutons : "Créer un compte" | "Plus tard"

### 9.9.2 PersonalizationModal — Free

> "Ton compte gratuit te permet de sauvegarder tes plannings. Pour créer tes propres tâches et catégories, passe à la version Premium."
>
> Boutons : "Passer Premium" | "Plus tard"

### 9.9.3 Interdictions UX (non négociables)

- Message culpabilisant
- Modal bloquante
- Obligation s'abonner pour continuer à utiliser l'existant

### 9.9.4 Offline

> "Indisponible hors connexion"
>
> Type : toast non bloquant, durée courte, Contexte Édition uniquement

---

### Checklist de complétude (Chapitre 9)

- [x] Principe : bloquants, explicites, Édition only, jamais enfant
- [x] Distinction quota plan vs limitation structurelle
- [x] Quotas cartes : stock (50), mensuel (100), **anti-abus timezone**
- [x] Profils : 1 Free, 3 Abonné
- [x] Appareils : 1 Free, 3 Abonné
- [x] Session active : 1 max (structurel)
- [x] Timelines : illimitées
- [x] Downgrade : exécution only, verrouillage progressif, réactivation auto
- [x] Messages UX verrouillés

### Points ambigus détectés (Chapitre 9)

Aucun — les quotas et transitions sont complètement spécifiés.

---

# 10. Sécurité & Permissions (RLS conceptuel)

## 10.1 Principe général

Les règles de sécurité sont conçues pour :

- Garantir la **séparation des données** par compte/profil
- Appliquer les **quotas côté serveur** (pas de contournement client)
- Protéger les **données privées** (images personnelles)

---

## 10.2 Ownership & isolation

### 10.2.1 Données par compte

| Donnée              | Ownership              |
| ------------------- | ---------------------- |
| Cartes personnelles | Compte propriétaire    |
| Catégories          | Compte propriétaire    |
| Profils enfants     | Compte propriétaire    |
| Timelines           | Profil enfant → Compte |
| Sessions            | Profil enfant → Compte |
| Séquences           | Compte propriétaire    |

### 10.2.2 Règle RLS fondamentale

Tout accès aux données doit vérifier : `owner_id = auth.uid()`

---

## 10.3 Accès cartes de banque

| Acteur                     | Lecture | Écriture                                  |
| -------------------------- | ------- | ----------------------------------------- |
| Tous (Visitor/Free/Abonné) | ✅      | ❌                                        |
| Admin                      | ✅      | ✅ (création, publication, dépublication) |

---

## 10.4 Confidentialité Admin

### 10.4.1 Principe de minimisation _(ux.md L1342-1358)_

L'Admin peut accéder aux données **strictement nécessaires** pour :

- Support
- Sécurité
- Intégrité du produit

### 10.4.2 Accès autorisé

- Noms de cartes
- Catégories
- Relations et métadonnées techniques

### 10.4.3 Accès interdit (CONTRACTUEL)

> **L'Admin ne voit JAMAIS les images personnelles** _(ux.md L1038)_

Aucune interface de navigation visuelle des contenus privés.

---

## 10.5 Quotas côté serveur

Les quotas sont des **barrières serveur** :

- Vérification avant toute création
- Pas de contournement possible côté client
- Messages d'erreur explicites retournés

---

## 10.6 Downgrade : permissions réduites

| Action                             | Free après downgrade |
| ---------------------------------- | -------------------- |
| Lecture données existantes         | ✅                   |
| Exécution sessions actives         | ✅                   |
| Création/modification structurelle | ❌                   |
| Réinitialisation session           | ❌                   |

_(ux.md L3206-3212)_

---

### Checklist de complétude (Chapitre 10)

- [x] Ownership & isolation par compte
- [x] Règle RLS : owner_id = auth.uid()
- [x] Accès banque : lecture tous, écriture Admin
- [x] **Confidentialité Admin : jamais images privées** (contractuel, pas conditionnel)
- [x] Quotas côté serveur
- [x] Downgrade : permissions réduites

### Points ambigus détectés (Chapitre 10)

Aucun.

---

# 11. Conséquences techniques (dérivées)

> **Note** : Ce chapitre documente les **conséquences techniques** des règles métier définies dans ux.md.
> Il ne s'agit PAS d'exigences contractuelles d'auditabilité (non spécifiées dans ux.md), mais d'implications logiques.

## 11.1 Données nécessaires pour la synchronisation

### 11.1.1 Sessions

- `session_id`
- `child_profile_id`
- `timeline_id`
- `state` (Active/Prévisualisation/Démarrée/Terminée)
- **`epoch`** (entier, incrémenté à chaque réinitialisation)
- `created_at`, `updated_at`
- `started_at` (renseigné à la première validation)
- `completed_at` (renseigné à la complétion)
- `steps_total_snapshot` (figé au démarrage effectif ; voir 5.3.5)

### 11.1.2 Progression

- Ensemble des `slot_id` validés (pour fusion ensembliste)
- `validated_at` peut exister comme métadonnée **technique/audit** (non nécessaire au contrat UX).
- La règle de fusion reste : **ensemble de slot_id validés** (union ensembliste), sans dépendre de l’ordre ni des timestamps.

---

## 11.2 Données nécessaires pour les quotas

### 11.2.1 Cartes

- `created_at` en **UTC** (pour quota mensuel)
- Compteur de cartes actives par compte (pour quota stock)

### 11.2.2 Profils enfants

- `created_at` (pour déterminer profil le plus ancien lors downgrade)
- `status` : `active` | `locked`

### 11.2.3 Appareils

- Liste des `device_id` actifs par compte

---

## 11.3 Données nécessaires pour les règles métier

### 11.3.1 Slots

- `slot_id` (UUID, persistant)
- `position` (ordre d'affichage)
- `type` (Étape | Récompense)
- `card_id` (nullable si vide)
- `tokens` (0-5, slot Étape uniquement)

### 11.3.2 Séquences

- Propriétaire (`user_id`)
- Carte mère (`card_id`)
- Liste ordonnée des étapes (`card_id[]`)

---

### Checklist de complétude (Chapitre 11)

- [x] Données sync : sessions avec **epoch**, progression avec slot_id
- [x] Données quotas : timestamps UTC, compteurs, statut profil
- [x] Données métier : slots avec slot_id persistant

### Points ambigus détectés (Chapitre 11)

Aucun — ce chapitre est dérivé des règles métier, pas des exigences ux.md.

---

# 12. Annexes

## 12.1 Récapitulatif des états Session

| État                      | Progression   | Epoch | Actions possibles                     |
| ------------------------- | ------------- | ----- | ------------------------------------- |
| Inexistante               | —             | —     | Entrée Tableau → création             |
| Active (Prévisualisation) | 0 validation  | N     | Édition complète timeline             |
| Active (Démarrée)         | ≥1 validation | N     | Édition partielle (slots non validés) |
| Terminée                  | Toutes        | N     | Lecture seule ; reset → epoch N+1     |

> "Prévisualisation" = sous-état de Active, pas état séparé _(ux.md L451)_

---

## 12.2 Récapitulatif des quotas

| Ressource        | Visitor     | Free     | Abonné   | Admin    |
| ---------------- | ----------- | -------- | -------- | -------- |
| Cartes stock     | N/A         | N/A      | 50       | ∞        |
| Cartes/mois      | N/A         | N/A      | 100      | ∞        |
| Profils enfants  | 1 (struct.) | 1        | 3        | ∞        |
| Appareils        | 1 (struct.) | 1        | 3        | ∞        |
| Timelines        | ∞           | ∞        | ∞        | ∞        |
| Sessions actives | 1/profil    | 1/profil | 1/profil | 1/profil |
| Séquences        | ∞           | ∞        | ∞        | ∞        |

---

## 12.3 Récapitulatif verrouillages (session active)

| Phase                      | Cartes | Ordre | Add/Del slots | Jetons |
| -------------------------- | ------ | ----- | ------------- | ------ |
| Prévisualisation           | ✅     | ✅    | ✅            | ✅     |
| Démarrée (slot validé)     | ❌     | ❌    | ❌            | ❌     |
| Démarrée (slot non validé) | ✅     | ✅    | ✅\*          | ❌\*\* |
| Hors session               | ✅     | ✅    | ✅            | ✅     |

_\* Sauf dernier slot Étape_
_\*\* Peut définir jetons sur nouveau slot ajouté_

---

## 12.4 Points à trancher (hors ux.md)

Ces points ne sont pas spécifiés dans ux.md et nécessitent une décision produit :

| #    | Sujet                                                   | Décision v14                                                                            | Options (référence)                                                 |
| ---- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| ✅ 1 | **Révocation device_id**                                | **Option B** : Page Profil avec liste appareils + révocation manuelle (non destructive) | A) Aucune (contact support) ~~B)~~ Page Profil                      |
| ✅ 2 | **Décocher carte bibliothèque**                         | **Option A** : Retire toutes occurrences dans timeline (reflow)                         | ~~A)~~ Retire toutes ~~B)~~ Retire dernière ~~C)~~ Désactivé        |
| ⚠️ 3 | **Aucun slot vide disponible**                          | **À trancher** (non bloquant DB)                                                        | A) Auto-créer slot B) Checkbox grisée C) Toast                      |
| ⚠️ 4 | **Protection Page Édition**                             | **À trancher** (non bloquant DB)                                                        | A) Verrou parental B) Code C) Geste D) Aucun                        |
| ✅ 5 | **Définition “dernière étape”** (snapshot vs dynamique) | **Décision** : Snapshot au démarrage effectif (`steps_total_snapshot`)                  | A) Snapshot (stable TSA) B) Dynamique (complexe, surprise possible) |

---

## 12.5 Références ux.md principales

| Sujet                    | Lignes ux.md |
| ------------------------ | ------------ |
| Contexte & objectifs     | L31-69       |
| Principes UX TSA         | L70-164      |
| Glossaire                | L167-721     |
| Rôles & Contextes        | L723-928     |
| Cartes & Catégories      | L930-1438    |
| Pages Edition/Tableau    | L1440-1818   |
| Planning visuel          | L1819-1955   |
| Économie de jetons       | L1956-2116   |
| Séquençage               | L2118-2472   |
| Multi-enfants/appareils  | L2474-2806   |
| Persistance/Sync/Offline | L2807-3011   |
| Quotas & Plans           | L3013-3246   |
| Évolutivité              | L3248-3432   |
| Annexes messages         | L3434-3478   |

---

### Checklist de complétude (Chapitre 12)

- [x] Récapitulatif états Session avec epoch
- [x] Récapitulatif quotas par statut
- [x] Récapitulatif verrouillages
- [x] Points à trancher identifiés
- [x] Références ux.md

---

# 13. Checklist globale de complétude

## Corrections v13 (vs v12)

| #   | Correction                                                        | Statut                       |
| --- | ----------------------------------------------------------------- | ---------------------------- |
| 1   | **Epoch de session** : définition contractuelle complète          | ✅ Ch.1.8, Ch.3.9, Ch.5.3.3  |
| 2   | **Fusion ensembliste** : union des slot_id validés                | ✅ Ch.1.8, Ch.3.10, Ch.8.5.2 |
| 3   | **Table pivot catégories** : UNIQUE (user_id, card_id) + fallback | ✅ Ch.3.6, Ch.4.2.1          |
| 4   | **État verrouillé profil** : attribut persisté + transitions      | ✅ Ch.1.3, Ch.3.3, Ch.5.4.5  |
| 5   | **Verrouillages consolidés** : section unique Ch.5.4              | ✅ Ch.5.4                    |
| 6   | **Ch.11 reformulé** : "Conséquences techniques" (pas exigences)   | ✅ Ch.11                     |
| 7   | **Références nettoyées** : plus de `fileciteturn*` ni `p.??`      | ✅ Tout le document          |
| 8   | **Anti-abus timezone** : effet au prochain mois                   | ✅ Ch.9.3.3                  |
| 9   | **Slot vide ignoré Tableau**                                      | ✅ Ch.1.6, Ch.3.8, Ch.5.2.4  |
| 10  | **Terminologie "Réinitialisation de session"**                    | ✅ Ch.0                      |
| 11  | **Confidentialité Admin** : contractuel (pas conditionnel)        | ✅ Ch.10.4.3                 |
| 12  | **Invariant banque** : jamais supprimée si référencée             | ✅ Ch.1.5, Ch.3.4, Ch.5.5.5  |

---

## Corrections v14 (suite audit PRODUCT_MODEL_AUDIT.md)

| #   | Correction                                                         | Statut               |
| --- | ------------------------------------------------------------------ | -------------------- |
| 13  | **Focus après suppression slot** : règle anti-crash enfant         | ✅ Ch.7.1.2          |
| 14  | **Évolution jetons après démarrage** : n'apparaît pas en direct    | ✅ Ch.6.2.2          |
| 15  | **Timestamps validation** : marqué "Non spécifié"                  | ✅ Ch.11.1.2         |
| 16  | **Révocation appareil** : Décision Option B (Page Profil manuelle) | ✅ Ch.3.2, Ch.12.4   |
| 17  | **Décocher carte** : Décision Option A (retire toutes occurrences) | ✅ Ch.7.3.4, Ch.12.4 |

---

## Corrections v15 (corrections finales cohérence)

| #   | Correction                                                           | Statut      |
| --- | -------------------------------------------------------------------- | ----------- |
| 18  | **Timezone référence complète** : colonne Référence + définition     | ✅ Ch.1.2   |
| 19  | **Visitor + composition timelines** : acteur autorisé, clarification | ✅ Ch.7.1.1 |

---

## Validation finale

| Critère                          | Statut |
| -------------------------------- | ------ |
| Structure 12 chapitres           | ✅     |
| Checklists par chapitre          | ✅     |
| Points ambigus identifiés        | ✅     |
| Aucun SQL/pseudo-code            | ✅     |
| Références ux.md (lignes)        | ✅     |
| Corrections critiques appliquées | ✅     |

---

**✅ DOCUMENT PRÊT POUR MIGRATIONS DB-FIRST**
