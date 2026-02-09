# PRODUCT_MODEL_PLATFORM.md

> **Version** : 1 (dérivé de PLATFORM.md v5)  
> **Date** : 2026-02-08  
> **Périmètre** : fonctionnalités **plateforme** (hors core métier TSA : planning visuel / économie de jetons / séquençage)  
> **Principe DB-first** : toute règle marquée “invariant” ici doit être **enforcée côté DB** (contraintes / triggers / fonctions / RLS), jamais supposée côté UI.

---

## 0. Relation avec les documents “core”

Ce document **complète** le contrat produit “core” existant (`PRODUCT_MODEL.md`) et ne redéfinit aucun concept métier déjà couvert par `ux.md` / `PRODUCT_MODEL.md` (planning / jetons / séquençage).  
Il formalise le **contrat produit plateforme** nécessaire pour dériver ensuite :

- `DB_BLUEPRINT_PLATFORM.md` (design DB)
- `MIGRATION_PLAN_PLATFORM.md` (ordre des migrations)
- puis les migrations SQL DB-first.

**Non-objectifs explicites**

- Ne pas créer de nouveaux concepts pédagogiques TSA.
- Ne pas déplacer un invariant serveur vers le client.
- Ne pas introduire de dépendance fragile à l’UI (ex : “si le front fait X alors…”).

---

## 1. Billing Stripe & statut d’accès

### 1.1 Objectif

Fournir un modèle déterministe et auditable qui :

- reflète l’état d’abonnement Stripe en DB,
- historise les événements (append-only),
- pilote le statut d’accès `accounts.status` **depuis la DB** (jamais depuis l’UI).

### 1.2 Acteurs

- **Account (utilisateur)** : initie un checkout, bénéficie (ou non) de l’accès.
- **Stripe** : source de vérité de paiement/abonnement.
- **Edge Functions** (service_role) : réception webhooks, création de session checkout.
- **DB** : applique la projection d’état et les invariants (status, réactivation, logs).

### 1.3 Concepts & entités

- **Subscription** : projection “courante” d’un abonnement Stripe pour un compte.
- **Subscription log** : journal append-only des changements/événements utiles.
- **Projection d’accès** : mapping DB “subscription → accounts.status”.

> Note : les détails exacts Stripe (plans, prix) sont un **catalogue de configuration**, pas un concept métier TSA.

### 1.4 États & transitions (projection)

- **Source** : événements Stripe (webhook) + opérations serveur (create checkout session).
- **Projection** : mise à jour de `subscriptions` et insertion dans `subscription_logs`.
- **Effet** : un trigger (ou fonction transactionnelle) met à jour `accounts.status`.

#### 1.4.1 Mapping (principe)

- `subscriptions.status` est la projection du statut Stripe (ex : active / canceled / past_due…), mais **la décision d’accès** passe par `accounts.status`.
- **Règle critique** : `accounts.status` est déterminé côté DB, et doit rester **cohérent** même en cas de retry webhook.

### 1.5 Invariants DB (testables)

1. **Append-only log** : `subscription_logs` n’est jamais modifié/supprimé (sauf purge RGPD explicitement définie, sinon interdit).
2. **Idempotence webhook** : un même événement Stripe (id) ne peut pas être appliqué deux fois.
3. **Projection déterministe** : pour un compte donné, le couple (`subscriptions`, `accounts.status`) est toujours cohérent selon les règles de mapping définies.
4. **Pas de privilège UI** : l’UI ne peut pas écrire dans `subscriptions` / `subscription_logs`.
5. **Réactivation contrôlée** : lors d’un upgrade/réactivation, les profils précédemment verrouillés doivent pouvoir être réactivés selon la règle plateforme (serveur).

### 1.6 Sécurité & accès (conceptuel)

- Écritures : **service_role uniquement** (Edge Functions).
- Lectures :
  - `subscriptions` / `subscription_logs` : **owner/admin uniquement** (`is_admin()`).
  - Comptes standards : aucune lecture billing directe ; l’état d’accès est porté par `accounts.status` (`free` / `subscriber` / `admin`).
- Aucun lien avec Storage privé (images enfant), même pour l’admin.

---

## 2. RGPD & consentement (preuves)

### 2.1 Objectif

- Enregistrer une preuve de consentement (cookies / tracking éventuel) sous forme **append-only**.
- Permettre l’exercice des droits (export, suppression) sans casser les invariants du core.

### 2.2 Acteurs

- **Account** : exprime (ou refuse) le consentement.
- **Edge Function** (service_role) : enregistre l’événement de consentement.
- **DB** : garantit la traçabilité, l’intégrité et la lecture sécurisée.

### 2.3 Concepts & entités

- **Consent event** : événement append-only lié à un compte (ou à un device si prévu), horodaté, typé.

### 2.4 États & transitions

- Consentement = suite d’événements, pas un “flag unique” modifiable.
- Le dernier événement (par type) peut être utilisé comme état courant, mais la DB conserve l’historique.

### 2.5 Invariants DB (testables)

1. **Append-only** : `consent_events` n’est pas modifié, pas supprimé (hors politique de rétention explicitement définie).
2. **Schéma fermé** : valeurs de `mode`/`action` doivent être normalisées et validées (éviter l’ambiguïté “mode vs action”).
3. **Écritures server-only** : l’UI ne peut pas insérer directement dans `consent_events` (Edge Function uniquement).
4. **Lecture minimale** : un compte ne lit que ses propres événements ; l’admin n’accède qu’au strict nécessaire (voir chap. 6).

---

## 3. Suppression de compte & purge (séquence irréversible)

### 3.1 Objectif

Définir un flux de suppression robuste et irréversible qui :

- annule l’abonnement Stripe si présent,
- purge le Storage privé,
- supprime l’identité Auth,
- s’appuie sur les cascades DB existantes,
- conserve les **preuves légales** nécessaires (si applicable) sans garder d’images privées.

### 3.2 Acteurs

- **Account** : déclenche la suppression.
- **Edge Function delete-account** (service_role) : orchestre la séquence.
- **Stripe** : annulation/fin de période.
- **Storage** : purge des objets privés.
- **DB** : cascades, invariants, traces non sensibles.

### 3.3 Séquence (contrat)

1. Vérifier le droit (compte authentifié) et verrouiller l’opération (idempotence).
2. Annuler Stripe (best-effort + retries contrôlés).
3. Purger Storage (best-effort + retries contrôlés).
4. Supprimer Auth user (source d’auth).
5. Déclencher la suppression DB (cascade depuis `accounts`).

### 3.4 Invariants DB (testables)

1. **Idempotence** : relancer delete-account ne crée pas d’état incohérent (au pire, no-op).
2. **Purge Storage** : après suppression, aucun objet privé du compte ne doit rester accessible.
3. **Cascades DB** : la suppression de `accounts` supprime les données dépendantes selon les règles core.
4. **Preuves** : si des événements “preuves” existent (consent, logs), leur traitement (conservation/anon) doit être explicitement défini et enforcé.
5. **Compte jamais “vide”** : si la suppression cible un **profil enfant individuel**, la DB doit empêcher de descendre sous 1 profil enfant par compte (contrat déjà établi côté plateforme).

---

## 4. Edge Functions (registre & patterns)

### 4.1 Objectif

Garantir un contrat uniforme pour les Edge Functions :

- rôle (service_role),
- idempotence,
- validation stricte d’input,
- observabilité non sensible,
- séparation claire des responsabilités DB vs orchestration.

### 4.2 Registre (V1)

Les fonctions plateforme V1 incluent :

- `stripe-webhook`
- `create-checkout-session`
- `log-consent`
- `delete-account`
  (la liste exacte est maintenue dans PLATFORM.md et doit rester **fermée** en V1).

### 4.3 Invariants (testables)

1. **Service-only writes** : toute écriture dans les tables plateforme sensibles provient d’une Edge Function (ou d’un rôle serveur équivalent).
2. **Idempotence** : chaque endpoint doit gérer retries (Stripe, réseau, double clic).
3. **No secret in DB** : aucun secret Stripe n’est stocké en clair dans des tables accessibles.
4. **Logs non sensibles** : observabilité sans fuite de données personnelles / images.

---

## 5. Paramètres utilisateur (préférences)

### 5.1 Objectif

Réduire la charge cognitive et maximiser la prévisibilité (TSA) via des préférences simples, stables, **liste fermée**.

### 5.2 Principes (TSA + terrain + DB-first)

- Préférences = options explicitement activées/désactivées, jamais “magiques”.
- Le front ne doit jamais “assumer” une valeur si la DB ne l’a pas.
- Différencier clairement :
  - **Préférences persistantes** (DB, cross-device)
  - **Préférences locales** (device-only, hors DB)

### 5.3 Entité : `account_preferences`

- Cardinalité cible : `accounts (1) → account_preferences (1)`
- Pendant transition : autoriser `0..1` **uniquement si planifié**.

**Préférences persistantes V1 (liste fermée)**

- `toasts_enabled` (bool)
- `reduced_motion` (bool)
- optionnel V1 : `confetti_enabled` (bool) si maintenu comme préférence persistante.

> La timezone n’est pas une préférence UI pure : elle reste dans `accounts.timezone` (core).

### 5.4 Invariants DB (testables)

1. **Création DB-first** : création automatique de la ligne `account_preferences` à la création du compte.
2. **Pas de fallback UI** : l’absence de ligne ne doit jamais être “compensée” côté front.
3. **RLS stricte** : un compte ne peut lire/écrire que ses préférences.
4. **Liste fermée** : aucune préférence “libre” (JSON bag) en V1.

---

## 6. Administration (Owner-only) + monitoring & audit

### 6.1 Objectif

Permettre la maintenance, le support et l’audit **sans** introduire de backdoor sur les données sensibles (notamment images privées), avec traçabilité forte.

### 6.2 Acteur

- **Owner** : unique opérateur admin (pas un rôle pédagogique, non visible UX standard).

### 6.3 Entité : Admin Audit Log (append-only)

- Journal append-only des actions admin.
- Catalogue d’actions **liste fermée**.

### 6.4 Scopes d’accès (contrat)

- L’owner peut accéder à :
  - données billing (subscriptions/logs) nécessaires au support,
  - données RGPD nécessaires au traitement légal,
  - métriques non sensibles (observabilité),
- L’owner **ne peut pas** :
  - accéder aux images privées enfant,
  - contourner les protections du core via une UI admin.

### 6.5 Invariants DB (testables)

1. **Owner-only** : aucune élévation de privilège via tables modifiables par UI.
2. **Audit obligatoire** : toute action admin V1 génère un événement d’audit append-only.
3. **Confidentialité contractuelle** : aucune route / policy / fonction admin ne doit permettre l’accès aux contenus privés (images).

---

## 7. Micro-features non-core (UX “support”)

> Ces fonctionnalités ne doivent **jamais** devenir des règles métier core. Elles sont optionnelles, non bloquantes, et doivent respecter “prévisibilité / réduction de surprise” (TSA).

### 7.1 Confettis

- Renforcement visuel ponctuel, optionnel.
- Peut être contrôlé par préférence persistante (`confetti_enabled`) ou locale selon décision produit.

### 7.2 TrainProgressBar (barre “train / stations”)

- Affichage de progression simple et stable (support transitions).
- Aucun état critique ne doit dépendre de cet affichage.

### 7.3 TimeTimer (outil local de gestion du temps)

- Outil local, non critique, idéalement **device-only** (hors DB) sauf décision explicitement justifiée.

### 7.4 Toast (messages non bloquants)

- Notifications non bloquantes, contrôlées par `toasts_enabled`.
- Jamais de toast “obligatoire” pour réaliser une action critique.

### 7.5 Invariants (testables)

1. **Non-bloquant** : aucune micro-feature ne doit conditionner un flux critique.
2. **Respect reduced motion** : `reduced_motion` doit désactiver/adapter animations.
3. **Préférences stables** : si une micro-feature est persistante, elle passe par `account_preferences` (liste fermée).

---

## Annexe A — Checklist “DB protège le produit”

- Tout invariant listé dans ce document doit être :
  - soit une contrainte (CHECK/UNIQUE/FK),
  - soit une policy RLS,
  - soit un trigger/fonction transactionnelle,
  - soit un smoke test SQL démontrant l’échec attendu en cas de violation.
- Aucune règle critique ne doit être “documentée” sans mécanisme DB associé.
