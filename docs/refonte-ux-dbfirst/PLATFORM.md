# PLATFORM.md (v5)

> **Version** : 5 — Chapitres 1-4
> **Date** : 2026-02-07
> **Source** : Analyse gap ancien Supabase → nouveau projet DB-first
> **Périmètre** : Fonctionnalités plateforme hors core métier (planning/jetons/séquençage)
> **Règle d'or** : Ce document complète ux.md pour les aspects plateforme. Il ne redéfinit aucun concept déjà spécifié dans ux.md ou PRODUCT_MODEL.md.

---

## Sommaire

1. [Abonnements & Stripe](#ch1)
2. [RGPD & Consentements](#ch2)
3. [Suppression de compte](#ch3)
4. [Edge Functions — Inventaire & Adaptations](#ch4)
5. Paramètres utilisateur
6. Administration (Owner) + Monitoring & Audit
7. Micro-features UX (hors core)

---

# 1. Abonnements & Stripe {#ch1}

les actions de resync Stripe sont Owner-only et auditées → voir 6.4 / 6.3

## 1.1 Contexte et objectif

L'application propose trois statuts de compte : `free`, `subscriber`, `admin` _(PRODUCT_MODEL.md Ch.1.2)_.

Le statut `subscriber` est obtenu via un abonnement Stripe payant. Le statut `admin` est attribué manuellement (SQL direct) et n'a aucun lien avec Stripe. Le statut `free` est le statut par défaut à la création de compte.

Le champ `accounts.status` est la **source de vérité unique** qui pilote l'ensemble du système :

- Quotas profils, devices, cartes _(Phase 9)_
- Feature gating cartes personnelles _(Phase 9)_
- RLS et mode execution-only _(Phase 7)_
- Downgrade lock des profils enfants _(Phase 9)_

**Objectif de ce chapitre** : spécifier le mécanisme qui maintient `accounts.status` synchronisé avec l'état réel de l'abonnement Stripe, via une table intermédiaire et un trigger DB.

---

## 1.2 Structure de l'offre Stripe

### 1.2.1 Plans

L'application propose un seul niveau d'abonnement (`subscriber`) avec deux cadences de facturation :

| Identifiant produit | Cadence | Remarque                                            |
| ------------------- | ------- | --------------------------------------------------- |
| Abonnement mensuel  | Mensuel | `price_id` Stripe dédié, récurrent                  |
| Abonnement annuel   | Annuel  | `price_id` Stripe dédié, récurrent, remise possible |

**Invariant** : les deux cadences produisent le même statut `subscriber`. La DB ne distingue pas mensuel/annuel — c'est une information Stripe uniquement.

### 1.2.2 Période d'essai

Pas de période d'essai gratuit (trial).

**Justification** : le plan `free` permet déjà d'utiliser l'application (1 profil, 1 device, cartes banque). La différence principale avec `subscriber` est la création de cartes personnelles. L'utilisateur peut évaluer l'application sans payer.

### 1.2.3 Codes promotionnels

Les codes promotionnels Stripe sont activés (`allow_promotion_codes: true` lors du checkout). Aucune logique DB spécifique — la réduction est gérée entièrement côté Stripe.

---

## 1.3 Cycle de vie d'un abonnement

### 1.3.1 Diagramme d'états (Stripe → accounts.status)

```
[Pas d'abonnement]
    │
    │ checkout.session.completed
    │ (subscription.status = 'active')
    ▼
[Abonnement actif]  ──────────────────────────────┐
    │                                               │
    │ Échec paiement                                │ Annulation volontaire
    │ (invoice.payment_failed)                      │ (cancel_at_period_end = true)
    ▼                                               ▼
[past_due]                                    [Actif jusqu'à fin période]
    │                                               │
    │ Grace period Stripe                           │ Fin de période atteinte
    │ (~3 tentatives sur ~3 semaines)               │ subscription.deleted
    │                                               │
    ├── Paiement réussi → retour [Actif]            │
    │                                               │
    │ Toutes tentatives échouées                    │
    │ subscription.deleted                          │
    ▼                                               ▼
[canceled / unpaid]  ◄─────────────────────────────┘
    │
    │ (pas d'abonnement actif)
    ▼
[Pas d'abonnement]
```

### 1.3.2 Mapping Stripe → accounts.status

Le mapping est la **règle métier centrale** de ce chapitre. Il détermine quand `accounts.status` change.

| Statut Stripe subscription   | accounts.status résultant | Justification                                      |
| ---------------------------- | ------------------------- | -------------------------------------------------- |
| `active`                     | `subscriber`              | Abonnement en cours, tout fonctionne               |
| `past_due`                   | `subscriber`              | Grace period — éviter rupture UX TSA (voir §1.3.3) |
| `trialing`                   | `subscriber`              | Non utilisé actuellement, mais safe forward        |
| `paused`                     | `subscriber`              | Stripe Pause Collection — conserver accès          |
| `canceled`                   | `free`                    | Abonnement terminé                                 |
| `unpaid`                     | `free`                    | Toutes tentatives de paiement échouées             |
| `incomplete`                 | `free`                    | Checkout non finalisé                              |
| `incomplete_expired`         | `free`                    | Checkout abandonné après expiration                |
| Pas de ligne `subscriptions` | `free`                    | Jamais abonné                                      |

**Invariant** : le mapping est déterministe, unidirectionnel (Stripe → DB), et sans exception. Le statut `admin` n'est **jamais** affecté par Stripe.

### 1.3.3 Grace period — justification UX TSA

La grace period (maintien `subscriber` pendant `past_due`) est une **décision UX TSA critique**, pas un choix technique.

**Scénario problématique sans grace period** : un parent a un échec de carte bancaire un dimanche. L'app passe immédiatement en `free`. Le lundi matin, l'enfant autiste ouvre l'app : ses profils excédentaires sont verrouillés, ses cartes personnelles inaccessibles. La routine quotidienne est rompue sans raison compréhensible pour l'enfant.

**Avec grace period** : Stripe retente le paiement automatiquement (~3 tentatives sur ~3 semaines, configurable dans le dashboard Stripe). Pendant ce temps, l'app fonctionne normalement. Le parent reçoit les emails Stripe de relance et corrige sa carte sans impact sur l'enfant.

**Risque accepté** : un utilisateur en `past_due` bénéficie de `subscriber` sans payer temporairement. Ce risque est négligeable face au coût UX d'un downgrade involontaire sur un enfant autiste.

---

## 1.4 Table `subscriptions`

### 1.4.1 Rôle

La table `subscriptions` stocke les données Stripe nécessaires au fonctionnement de l'application. Elle sert de **pont** entre les événements Stripe (reçus par webhook) et `accounts.status` (source de vérité pour les quotas/RLS).

Elle ne stocke **pas** :

- `raw_data` (JSON Stripe brut) — le dashboard Stripe est utilisé pour le debug
- Des données bancaires — jamais exposées côté serveur
- Un historique complet — seul l'abonnement courant/dernier est pertinent

### 1.4.2 Cardinalité

- 1 compte (`accounts`) → 0..1 abonnement actif (`subscriptions`)
- Un user peut avoir eu plusieurs abonnements successifs (resubscribe après cancel), donc la table contient 0..n lignes par user, mais **au plus 1 active** à tout moment.

### 1.4.3 Colonnes

| Colonne                  | Type        | Nullable | Défaut              | Description                                              |
| ------------------------ | ----------- | -------- | ------------------- | -------------------------------------------------------- |
| `id`                     | UUID        | NOT NULL | `gen_random_uuid()` | PK                                                       |
| `account_id`             | UUID        | NOT NULL | —                   | FK → accounts(id) ON DELETE CASCADE                      |
| `stripe_customer_id`     | TEXT        | NULL     | —                   | ID client Stripe (`cus_xxx`)                             |
| `stripe_subscription_id` | TEXT        | NULL     | —                   | ID abonnement Stripe (`sub_xxx`), UNIQUE                 |
| `status`                 | TEXT        | NOT NULL | —                   | Statut Stripe brut (voir enum §1.4.4)                    |
| `price_id`               | TEXT        | NULL     | —                   | ID prix Stripe (`price_xxx`) — identifie mensuel/annuel  |
| `current_period_start`   | TIMESTAMPTZ | NULL     | —                   | Début période facturation courante                       |
| `current_period_end`     | TIMESTAMPTZ | NULL     | —                   | Fin période facturation courante                         |
| `cancel_at_period_end`   | BOOLEAN     | NOT NULL | `false`             | L'utilisateur a demandé l'annulation en fin de période   |
| `cancel_at`              | TIMESTAMPTZ | NULL     | —                   | Date d'annulation programmée (si `cancel_at_period_end`) |
| `last_event_id`          | TEXT        | NULL     | —                   | Dernier `event.id` Stripe traité (idempotence)           |
| `created_at`             | TIMESTAMPTZ | NOT NULL | `NOW()`             | Date de création de la ligne                             |
| `updated_at`             | TIMESTAMPTZ | NOT NULL | `NOW()`             | Dernière modification                                    |

### 1.4.4 Contraintes

**CHECK `status`** — valeurs autorisées (statuts Stripe subscription) :
`active`, `past_due`, `canceled`, `unpaid`, `incomplete`, `incomplete_expired`, `trialing`, `paused`

**UNIQUE `stripe_subscription_id`** — un même abonnement Stripe ne peut exister qu'une fois.

**UNIQUE partiel (1 actif par user)** :

```
CREATE UNIQUE INDEX subscriptions_unique_active_per_account
ON subscriptions (account_id)
WHERE status IN ('active', 'trialing', 'past_due', 'paused');
```

Cet index garantit qu'un compte ne peut avoir qu'**un seul abonnement actif** à tout moment. Il reprend le pattern déjà utilisé pour les sessions _(Phase 5 : 1 session active max)_.

**CHECK période cohérente** :
`current_period_end >= current_period_start` (si les deux sont non NULL)

**FK `account_id`** → `accounts(id)` ON DELETE CASCADE

### 1.4.5 Index

| Index                                      | Colonnes / Condition                                                   | Justification                          |
| ------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------- |
| PK                                         | `id`                                                                   | —                                      |
| `subscriptions_unique_active_per_account`  | `account_id` WHERE status IN ('active','trialing','past_due','paused') | 1 actif max par compte                 |
| `subscriptions_stripe_subscription_id_key` | `stripe_subscription_id` (UNIQUE)                                      | Lookup webhook par subscription ID     |
| `idx_subscriptions_account_id`             | `account_id`                                                           | Lookup par compte                      |
| `idx_subscriptions_stripe_customer_id`     | `stripe_customer_id`                                                   | Recherche customer pour billing portal |

### 1.4.6 RLS

| Opération | Policy                                                       |
| --------- | ------------------------------------------------------------ |
| SELECT    | `is_admin()` uniquement                                      |
| INSERT    | Interdit côté client — uniquement via webhook (service_role) |
| UPDATE    | Interdit côté client — uniquement via webhook (service_role) |
| DELETE    | Interdit côté client — CASCADE via accounts uniquement       |

**Justification** : minimiser l’exposition des données de facturation côté client. L’UI ne lit pas `subscriptions` ; elle se base uniquement sur `accounts.status` (`free` / `subscriber` / `admin`) pour afficher l’état d’accès.

L’admin peut lire les abonnements pour le support technique (diagnostic quota, problème facturation).

---

## 1.5 Table `subscription_logs`

### 1.5.1 Rôle

Journal d'audit des événements Stripe et des transitions d'abonnement. Usage : debug, support, audit.

Cette table est en **INSERT-only** (append-only log). Aucune modification, aucune suppression (sauf purge programmée).

### 1.5.2 Colonnes

| Colonne      | Type        | Nullable | Défaut              | Description                                               |
| ------------ | ----------- | -------- | ------------------- | --------------------------------------------------------- |
| `id`         | UUID        | NOT NULL | `gen_random_uuid()` | PK                                                        |
| `account_id` | UUID        | NULL     | —                   | FK → accounts(id) ON DELETE SET NULL (conserver log)      |
| `event_type` | TEXT        | NOT NULL | —                   | Type événement (ex: `webhook.checkout.session.completed`) |
| `details`    | JSONB       | NULL     | —                   | Détails structurés (event_id, subscription_id, etc.)      |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()`             | Timestamp insertion                                       |

### 1.5.3 Contraintes

- FK `account_id` → `accounts(id)` ON DELETE SET NULL (pas CASCADE — les logs survivent à la suppression du compte pour audit)
- `event_type` NOT NULL

### 1.5.4 RLS

| Opération | Policy                                        |
| --------- | --------------------------------------------- |
| SELECT    | `is_admin()` uniquement                       |
| INSERT    | Interdit côté client — webhook (service_role) |
| UPDATE    | Interdit                                      |
| DELETE    | Interdit côté client                          |

Les logs ne sont visibles que par l'admin pour le support. L'utilisateur ne voit pas ses logs d'abonnement.

### 1.5.5 Rétention

Les logs de plus de **12 mois** peuvent être purgés. La purge est réalisée par un CRON ou manuellement (pas de mécanisme automatique en Phase 11 — à réévaluer si le volume le justifie).

---

## 1.6 Trigger : subscriptions → accounts.status

### 1.6.1 Rôle

C'est le **mécanisme central** qui maintient la cohérence entre Stripe et l'application. Il remplace l'ancienne fonction `handle_subscription_role_change` de l'ancien projet.

### 1.6.2 Événement déclencheur

Trigger `AFTER INSERT OR UPDATE` sur la table `subscriptions`.

### 1.6.3 Logique

```
À chaque INSERT ou UPDATE sur subscriptions :

1. Récupérer le account_id de la ligne modifiée (NEW.account_id)

2. Vérifier : le compte est-il admin ?
   → SI OUI : ne rien faire (admin immunisé, jamais modifié par Stripe)

3. Chercher s'il existe un abonnement actif pour ce compte :
   SELECT status FROM subscriptions
   WHERE account_id = NEW.account_id
     AND status IN ('active', 'trialing', 'past_due', 'paused')
   LIMIT 1

4. SI trouvé → UPDATE accounts SET status = 'subscriber' WHERE id = NEW.account_id
   SI non trouvé → UPDATE accounts SET status = 'free' WHERE id = NEW.account_id

5. Le UPDATE sur accounts.status déclenche les mécanismes existants :
   → Phase 9 : quotas recalculés dynamiquement (fonctions IMMUTABLE)
   → Phase 9 : downgrade lock au prochain session.completed
   → Phase 7 : RLS recalculé dynamiquement (is_execution_only)
```

### 1.6.4 Invariants du trigger

| Invariant                       | Justification                                                  |
| ------------------------------- | -------------------------------------------------------------- |
| Admin jamais modifié par Stripe | Admin = statut manuel, indépendant de tout abonnement          |
| Mapping déterministe (§1.3.2)   | Pas de logique conditionnelle — même entrée = même sortie      |
| SECURITY DEFINER                | Le trigger modifie `accounts.status` qui est immutable par RLS |
| `pg_trigger_depth() > 0` guard  | Pattern existant Phase 9 — empêche appel direct                |
| Idempotent                      | Rejouer le même événement Stripe produit le même résultat      |

### 1.6.5 Interaction avec les mécanismes existants

Le changement de `accounts.status` par ce trigger est transparent pour le reste du système :

- **Upgrade** (`free → subscriber`) : les quotas Phase 9 s'ouvrent immédiatement. L'utilisateur peut créer des profils, devices, cartes personnelles additionnels. Les profils `locked` repassent `active` (voir §1.7).
- **Downgrade** (`subscriber → free`) : les quotas Phase 9 se resserrent. L'utilisateur ne peut plus créer au-delà des limites `free`. Les profils excédentaires seront verrouillés au prochain `session.completed` _(Phase 9 : `enforce_child_profile_limit_after_session_completion`)_.

---

## 1.7 Upgrade : réactivation des profils verrouillés

### 1.7.1 Scénario

Un utilisateur `subscriber` avec 3 profils enfants est downgrade en `free`. Les 2 profils les plus récents sont verrouillés (`locked`) par le mécanisme Phase 9. Plus tard, l'utilisateur se réabonne (`free → subscriber`).

### 1.7.2 Comportement attendu

Lorsque `accounts.status` passe de `free` à `subscriber` (via le trigger §1.6), les profils `locked` de ce compte doivent être **automatiquement réactivés** (`locked → active`).

### 1.7.3 Justification UX TSA

L'utilisateur qui se réabonne s'attend à retrouver ses profils. Un profil `locked` mais visible crée de la confusion. L'utilisateur ne devrait pas avoir à effectuer une action manuelle pour déverrouiller chaque profil — c'est une source d'anxiété ("est-ce que j'ai perdu les données de mon enfant ?").

### 1.7.4 Mécanisme

Le trigger §1.6 est étendu : après avoir mis à jour `accounts.status = 'subscriber'`, il vérifie s'il existe des profils `locked` pour ce compte et les passe en `active`.

```
SI nouveau statut = 'subscriber' :
  UPDATE child_profiles
  SET status = 'active', updated_at = NOW()
  WHERE account_id = NEW.account_id
    AND status = 'locked';
```

### 1.7.5 Invariants

- La réactivation est **automatique et immédiate** lors de l'upgrade.
- Elle ne concerne que les profils `locked` (pas de création de nouveaux profils).
- Admin n'est pas concerné (admin n'a jamais de profils locked).
- La réactivation est idempotente (re-exécuter ne change rien si déjà `active`).

---

## 1.8 Webhook Stripe — Edge Function

### 1.8.1 Rôle

L'Edge Function `stripe-webhook` reçoit les événements Stripe, vérifie la signature, et écrit dans la table `subscriptions` via `service_role` (bypass RLS).

### 1.8.2 Événements traités

| Événement Stripe                | Action                                                     |
| ------------------------------- | ---------------------------------------------------------- |
| `checkout.session.completed`    | Récupérer subscription ID → upsert `subscriptions`         |
| `customer.subscription.created` | Upsert `subscriptions` avec données complètes              |
| `customer.subscription.updated` | Upsert `subscriptions` (changement statut, renouvellement) |
| `customer.subscription.deleted` | Upsert `subscriptions` avec `status = 'canceled'`          |

### 1.8.3 Flux webhook

```
1. Vérifier signature Stripe (STRIPE_WEBHOOK_SECRET)
2. Parser l'événement
3. Extraire account_id depuis subscription.metadata.supabase_user_id
4. Upsert dans subscriptions (ON CONFLICT stripe_subscription_id)
5. → Le trigger DB §1.6 se déclenche automatiquement
6. → accounts.status est mis à jour
7. Logger dans subscription_logs (fire-and-forget)
8. Répondre 200 à Stripe
```

### 1.8.4 Idempotence

Le champ `last_event_id` permet de détecter les événements déjà traités. Si un événement est rejoué (retry Stripe), l'upsert produit le même résultat — le trigger est idempotent.

### 1.8.5 Sécurité

- Le webhook utilise `SUPABASE_SERVICE_ROLE_KEY` pour bypasser RLS (les policies interdisent INSERT/UPDATE côté client).
- La signature Stripe est vérifiée **avant** tout traitement.
- `account_id` est extrait des metadata Stripe, pas d'un paramètre client.

---

## 1.9 Edge Function : create-checkout-session

### 1.9.1 Rôle

Crée une session Checkout Stripe pour un utilisateur authentifié, ou redirige vers le Billing Portal s'il a déjà un abonnement actif.

### 1.9.2 Flux

```
1. Vérifier authentification JWT
2. Lire subscriptions WHERE account_id = user.id AND status IN ('active', 'trialing', 'past_due', 'paused')
3. SI abonnement actif trouvé :
   a. Récupérer stripe_customer_id
   b. Créer session Billing Portal Stripe
   c. Retourner URL portal
4. SINON :
   a. Récupérer stripe_customer_id existant (si resubscribe après cancel) ou utiliser email
   b. Créer session Checkout Stripe (mode subscription, price_id, promotion_codes)
   c. Retourner URL checkout
5. Logger dans subscription_logs
```

### 1.9.3 Adaptations par rapport à l'ancien projet

| Ancien projet                     | Nouveau projet                           |
| --------------------------------- | ---------------------------------------- |
| Lit `abonnements.status`          | Lit `subscriptions.status`               |
| Lit `abonnements.stripe_customer` | Lit `subscriptions.stripe_customer_id`   |
| Upsert `abonnements`              | Pas d'écriture directe — le webhook gère |

---

## 1.10 Décisions non prises (à trancher ultérieurement)

| Sujet                                              | Statut      | Impact                             |
| -------------------------------------------------- | ----------- | ---------------------------------- |
| Prix exacts (mensuel / annuel)                     | Stripe-only | Aucun impact DB                    |
| Remise annuelle (%)                                | Stripe-only | Aucun impact DB                    |
| Configuration Stripe retry schedule (grace period) | Dashboard   | Aucun impact DB (past_due géré)    |
| Purge automatique `subscription_logs` (CRON)       | Futur       | Migration optionnelle              |
| Rôle `staff` (si besoin futur)                     | Futur       | Ajout valeur enum `account_status` |

---

## 1.11 Résumé des invariants (testables)

| #   | Invariant                                                                   | Mécanisme                     |
| --- | --------------------------------------------------------------------------- | ----------------------------- |
| 1   | `accounts.status` immutable par l'utilisateur via RLS                       | Phase 7 WITH CHECK            |
| 2   | `accounts.status` modifié uniquement par trigger subscriptions ou SQL admin | Trigger §1.6                  |
| 3   | Admin jamais affecté par Stripe                                             | Guard dans trigger §1.6       |
| 4   | 1 seul abonnement actif par compte à tout moment                            | UNIQUE partiel §1.4.4         |
| 5   | `past_due` = `subscriber` (grace period UX TSA)                             | Mapping §1.3.2                |
| 6   | Downgrade `subscriber → free` immédiat quand subscription canceled/unpaid   | Trigger §1.6                  |
| 7   | Upgrade `free → subscriber` réactive profils locked automatiquement         | Trigger §1.7                  |
| 8   | subscription_logs INSERT-only, visible admin uniquement                     | RLS §1.5.4                    |
| 9   | Webhook seule source d'écriture dans subscriptions + lectures admin-only    | RLS §1.4.6                    |
| 10  | Idempotence : rejouer un événement Stripe produit le même résultat          | Upsert + trigger déterministe |

---

# 2. RGPD & Consentements {#ch2}

** l’owner peut consulter les preuves, pas le contenu privé → voir 6.6” **

## 2.1 Objectif et périmètre

Ce chapitre spécifie :

- Le **registre des données personnelles** collectées par l'application.
- Le mécanisme de **preuve de consentement cookies** (table DB + Edge Function).
- Les règles d'affichage de la **bannière cookies** en contexte UX TSA.
- Les **principes d'exercice des droits** (accès, rectification, effacement).

Ce chapitre ne couvre **pas** :

- Le contenu des documents juridiques (politique de confidentialité, politique cookies) — ce sont des documents autonomes.
- L'implémentation UI de la bannière cookies — c'est du front.
- La suppression de compte — traitée au chapitre 3.

---

## 2.2 Cadre légal applicable

L'application vise un marché mondial avec ancrage France/UE. Les obligations suivantes s'appliquent :

| Cadre           | Portée                                                      |
| --------------- | ----------------------------------------------------------- |
| RGPD (UE)       | Toute collecte de données personnelles d'utilisateurs UE    |
| ePrivacy / CNIL | Cookies et traceurs non essentiels (consentement préalable) |
| Article 8 RGPD  | Données de mineurs — consentement parental requis           |

**Décision** : l'application applique le standard le plus strict (RGPD + CNIL) pour tous les utilisateurs, quel que soit leur pays. Pas de géo-segmentation.

---

## 2.3 Registre des données personnelles

### 2.3.1 Données collectées

| Donnée                   | Localisation                     | Finalité                         | Base légale           |
| ------------------------ | -------------------------------- | -------------------------------- | --------------------- |
| Email                    | `auth.users` (Supabase Auth)     | Authentification, communication  | Exécution du contrat  |
| Prénom enfant            | `child_profiles.name`            | Identification du profil enfant  | Consentement parental |
| Avatar enfant _(futur)_  | `child_profiles` + Storage       | Personnalisation visuelle profil | Consentement parental |
| Couleur profil _(futur)_ | `child_profiles`                 | Personnalisation visuelle profil | Consentement parental |
| Images personnelles      | Storage bucket `personal-images` | Cartes personnalisées            | Consentement parental |
| Timezone                 | `accounts.timezone`              | Calcul quota mensuel             | Intérêt légitime      |
| Données Stripe           | `subscriptions`                  | Gestion abonnement               | Exécution du contrat  |
| IP hashée                | `consent_events.ip_hash`         | Preuve anti-abus consentement    | Intérêt légitime      |
| User-Agent               | `consent_events.ua`              | Preuve consentement (contexte)   | Intérêt légitime      |
| Données analytics (GA4)  | Google Analytics (tiers)         | Mesure d'audience                | Consentement          |

### 2.3.2 Données explicitement non collectées

Les données suivantes étaient présentes dans l'ancien projet et sont **retirées** du nouveau modèle (minimisation) :

- Adresse postale
- Ville
- Date de naissance
- Pseudo adulte (l'email suffit comme identifiant)

### 2.3.3 Données de mineurs — article 8 RGPD

L'application traite des données de mineurs (prénom, avatar, images personnelles). Le RGPD (article 8) exige le consentement du titulaire de la responsabilité parentale.

**Décision produit** : le consentement parental est implicitement couvert par le fait que :

- Seul l'adulte crée le compte (signup avec email + mot de passe).
- Seul l'adulte configure les profils enfants (contexte Édition, inaccessible à l'enfant).
- L'enfant n'a accès qu'au mode Tableau (exécution), sans saisie de données.
- Les CGU/politique de confidentialité acceptées au signup incluent le consentement pour les données des enfants sous responsabilité du titulaire.

---

## 2.4 Consentement cookies — architecture

### 2.4.1 Catégories de traceurs

La politique cookies _(politique-cookies.md §5)_ définit 4 catégories de finalités. La colonne "Implémentation" indique comment chaque catégorie est gérée dans le code et la DB :

| Catégorie               | Exemples                              | Consentement requis | Clé `choices`                 | Statut actuel             |
| ----------------------- | ------------------------------------- | ------------------- | ----------------------------- | ------------------------- |
| Strictement nécessaires | Auth tokens, anti-bots, sécurité      | Non (exempté)       | `necessary` (toujours `true`) | Actif                     |
| Mesure d'audience       | Google Analytics 4 (GA4)              | Oui                 | `analytics`                   | Actif                     |
| Personnalisation        | Préférences interface (thème, langue) | Voir §2.4.2         | —                             | Reclassifié (voir §2.4.2) |
| Marketing               | —                                     | Oui                 | `marketing`                   | Non prévu, clé réservée   |

**Invariant CNIL** : aucun traceur non essentiel n'est activé avant consentement explicite. GA4 ne doit charger son SDK que si `choices.analytics === true` en local.

### 2.4.2 Décision : catégorie "personnalisation"

La politique cookies _(§5, §6c)_ classe `user_preferences` (localStorage thème/langue) dans "personnalisation soumise à consentement". Cependant :

- Ce traceur est un localStorage local sans transfert à des tiers.
- Il stocke uniquement des préférences d'interface (thème, langue).
- L'utilisateur les configure explicitement.
- Il n'y a aucun profilage ni collecte de données comportementales.

**Décision** : `user_preferences` est reclassifié comme **strictement nécessaire au fonctionnement de l'interface**. La catégorie "personnalisation" n'a pas de clé dédiée dans `ConsentChoices`.

**Action requise sur document juridique** : la politique cookies doit être mise à jour pour déplacer `user_preferences` de la section §6c (personnalisation) vers la section §6a (strictement nécessaires), ou supprimer la section §6c si aucun autre traceur de personnalisation n'est prévu.

### 2.4.3 Bannière cookies — règles UX TSA

**Invariant critique (non négociable)** : la bannière de consentement ne doit **jamais** apparaître en mode enfant / contexte Tableau / contexte exécution.

**Justification UX TSA** : toute popup ou bannière introduit une rupture de routine, une charge cognitive inutile, et un risque d'escalade émotionnelle. L'enfant autiste utilise l'app comme un outil de support quotidien — la bannière est un anti-pattern en contexte enfant.

**Règles d'affichage** :

| Règle                                                              | Justification                                |
| ------------------------------------------------------------------ | -------------------------------------------- |
| Affichage uniquement en contexte adulte (Édition, Profil, Accueil) | Séparation enfant/adulte                     |
| Jamais en contexte Tableau / exécution                             | Prévisibilité UX TSA                         |
| "Refuser" aussi simple que "Accepter" (même niveau, même clic)     | Conformité CNIL symétrie _(pol. cookies §3)_ |
| Retrait possible à tout moment via lien "Préférences cookies"      | Conformité CNIL retrait _(pol. cookies §4)_  |
| Ne bloque pas l'accès à l'application                              | L'app fonctionne sans analytics              |

---

## 2.5 Table `consent_events`

### 2.5.1 Rôle

Journal append-only des événements de consentement cookies. Chaque interaction avec la bannière (acceptation, refus, modification, retrait) produit une ligne.

La preuve **locale** (localStorage `cookie_consent_v2`) ne suffit pas — elle est modifiable par l'utilisateur. La preuve **serveur** est la référence pour l'audit.

**Renommage** : l'ancienne table `consentements` est renommée `consent_events` pour clarifier qu'il s'agit d'un log d'événements, pas d'un état courant.

### 2.5.2 Colonnes

| Colonne        | Type        | Nullable | Défaut              | Description                                          |
| -------------- | ----------- | -------- | ------------------- | ---------------------------------------------------- |
| `id`           | UUID        | NOT NULL | `gen_random_uuid()` | PK                                                   |
| `account_id`   | UUID        | NULL     | —                   | FK → accounts(id) ON DELETE SET NULL (preuve survit) |
| `consent_type` | TEXT        | NOT NULL | —                   | Type de consentement (ex: `cookie_banner`)           |
| `mode`         | TEXT        | NOT NULL | `'refuse_all'`      | Mode choisi : `accept_all`, `refuse_all`, `custom`   |
| `choices`      | JSONB       | NOT NULL | `'{}'`              | Détail des choix (ex: `{"analytics": true}`)         |
| `action`       | TEXT        | NULL     | —                   | Action déclencheur (voir §2.5.3)                     |
| `ip_hash`      | TEXT        | NULL     | —                   | SHA-256(IP + salt), minimisation RGPD                |
| `ua`           | TEXT        | NULL     | —                   | User-Agent (contexte preuve)                         |
| `locale`       | TEXT        | NULL     | —                   | Locale navigateur                                    |
| `app_version`  | TEXT        | NULL     | —                   | Version application                                  |
| `origin`       | TEXT        | NULL     | —                   | Origine de la requête (URL)                          |
| `ts_client`    | TIMESTAMPTZ | NULL     | —                   | Timestamp côté client (informatif, non fiable)       |
| `version`      | TEXT        | NOT NULL | `'1.0.0'`           | Version du format de consentement                    |
| `created_at`   | TIMESTAMPTZ | NOT NULL | `NOW()`             | Timestamp serveur (preuve fiable)                    |

### 2.5.3 Contraintes

**CHECK `mode`** — valeurs autorisées :
`accept_all`, `refuse_all`, `custom`

**CHECK `action`** — valeurs autorisées (si non NULL) :
`first_load`, `update`, `withdraw`, `restore`, `revoke`

**Clarification `mode` vs `action`** : ces deux champs ont des rôles distincts et ne doivent pas être confondus.

- **`mode`** = le **résultat** du choix de l'utilisateur. Répond à "qu'est-ce qui a été choisi ?". Valeurs : `accept_all` (tout accepter), `refuse_all` (tout refuser), `custom` (choix granulaire).
- **`action`** = le **contexte** qui a déclenché l'événement. Répond à "quand/pourquoi ce choix a-t-il été enregistré ?". Valeurs : `first_load` (premier affichage bannière), `update` (modification de choix existant), `withdraw` (retrait de consentement), `restore` (restauration après expiration), `revoke` (révocation complète via préférences).

**Important pour l'implémentation Edge Function / front** : le code `CookieBanner.tsx` envoie actuellement `action: 'accept_all'` et `action: 'refuse_all'` — ce sont des valeurs de `mode`, pas de `action`. L'adaptation front devra envoyer `action: 'first_load'` (premier choix) ou `action: 'update'` (modification) et `mode: 'accept_all'` ou `mode: 'refuse_all'` séparément.

**CHECK `choices`** — doit être un objet JSON (`jsonb_typeof(choices) = 'object'`).

**CHECK `ip_hash`** — si non NULL, longueur entre 32 et 128 caractères (hash valide).

**FK `account_id`** → `accounts(id)` ON DELETE SET NULL
La preuve de consentement **survit** à la suppression du compte. C'est une obligation légale : la preuve que le consentement a été donné/retiré doit être conservée même après effacement des données personnelles.

### 2.5.4 Différences avec l'ancienne table `consentements`

| Ancien modèle                          | Nouveau modèle                               |
| -------------------------------------- | -------------------------------------------- |
| `user_id` FK → `auth.users(id)`        | `account_id` FK → `accounts(id)` (cohérence) |
| `type_consentement` (TEXT libre)       | `consent_type` (même rôle, nom normalisé)    |
| `donnees` (TEXT, doublon de `choices`) | Supprimé — `choices` JSONB suffit            |
| `ts` (timestamp insertion, doublon)    | Supprimé — `created_at` suffit               |
| Table nommée `consentements`           | Renommée `consent_events` (log, pas état)    |

### 2.5.5 RLS

| Opération | Policy                                                             |
| --------- | ------------------------------------------------------------------ |
| SELECT    | `account_id = auth.uid()` OR `is_admin()`                          |
| INSERT    | Interdit côté client — uniquement via Edge Function (service_role) |
| UPDATE    | Interdit (append-only)                                             |
| DELETE    | Interdit (preuve légale)                                           |

**Justification** : la preuve de consentement est écrite **uniquement** par la Edge Function `log-consent` (qui utilise `service_role`). L'utilisateur peut consulter ses propres preuves. L'admin peut consulter pour le support/audit. Personne ne peut modifier ou supprimer.

### 2.5.6 Index

| Index                                | Colonnes / Condition            | Justification                  |
| ------------------------------------ | ------------------------------- | ------------------------------ |
| PK                                   | `id`                            | —                              |
| `idx_consent_events_account_created` | `(account_id, created_at DESC)` | Lookup par utilisateur, récent |
| `idx_consent_events_origin_created`  | `(origin, created_at DESC)`     | Diagnostic par origine         |

---

## 2.6 Edge Function : log-consent

### 2.6.1 Rôle

Reçoit les événements de consentement depuis le front, valide les données, et insère dans `consent_events` via `service_role`.

### 2.6.2 Adaptations par rapport à l'ancien projet

| Ancien projet               | Nouveau projet               |
| --------------------------- | ---------------------------- |
| Insère dans `consentements` | Insère dans `consent_events` |
| FK `user_id` → `auth.users` | FK `account_id` → `accounts` |
| Champ `donnees` (TEXT)      | Supprimé                     |
| Champ `ts` (doublon)        | Supprimé                     |
| Champ `type_consentement`   | Renommé `consent_type`       |

### 2.6.3 Flux

```
1. Recevoir POST avec body JSON
2. Valider champs obligatoires (consent_type, mode, choices, version)
3. Valider mode ∈ {accept_all, refuse_all, custom}
4. Valider action ∈ {first_load, update, withdraw, restore, revoke} (si fourni)
5. Hasher IP (SHA-256 avec salt serveur CONSENT_IP_SALT)
6. Résoudre account_id depuis le JWT si authentifié (sinon NULL = visiteur anonyme)
7. INSERT dans consent_events (service_role, bypass RLS)
8. Répondre 200
```

### 2.6.4 Visiteurs non authentifiés

La bannière cookies peut apparaître **avant** le login (page d'accueil marketing, page de signup). Dans ce cas, `account_id = NULL`. La preuve est quand même enregistrée — le `ip_hash` + `ua` + `ts_client` permettent la corrélation si nécessaire.

---

## 2.7 Exercice des droits RGPD

### 2.7.1 Droits applicables

| Droit                   | Mécanisme                                                    | Contexte    |
| ----------------------- | ------------------------------------------------------------ | ----------- |
| Accès (art. 15)         | Export des données du compte (futur, pas Phase 11)           | Flux adulte |
| Rectification (art. 16) | Modification profil/prénom via l'app (déjà possible)         | Flux adulte |
| Effacement (art. 17)    | Suppression compte (chapitre 3) ou suppression profil enfant | Flux adulte |
| Portabilité (art. 20)   | Export JSON/CSV (futur, pas Phase 11)                        | Flux adulte |

### 2.7.2 Suppression d'un profil enfant individuel

**Décision** : l'utilisateur peut supprimer un profil enfant individuellement, sans supprimer son compte.

**Justification** : droit à l'effacement (RGPD art. 17) — si un parent ne souhaite plus que les données de l'un de ses enfants soient stockées, il doit pouvoir les supprimer.

**Conséquences (CASCADE existant)** :

- Suppression `child_profiles` → CASCADE sur `timelines` → CASCADE sur `slots` → CASCADE sur `sessions` + `session_validations`
- Les images personnelles dans Storage associées à ce profil (si avatar) doivent être purgées séparément (Storage n'est pas couvert par CASCADE SQL).

**Contraintes** :

- Un compte doit conserver **au moins 1 profil enfant** (invariant PRODUCT_MODEL.md Ch.2.6 — "application jamais vide"). La suppression du dernier profil est interdite. L'utilisateur doit supprimer son compte entier s'il veut tout effacer.
- La suppression est une action **adulte uniquement** (contexte Édition), jamais accessible en mode Tableau.
- La suppression est irréversible — un modal de confirmation est requis côté front.

**Impact Phase 9** : après suppression d'un profil, les quotas sont recalculés dynamiquement. Si un subscriber avec 3 profils en supprime 1, il a 2/3 slots utilisés.

### 2.7.3 Export RGPD — adaptation requise

Le composant `PortailRGPD.tsx` et la fonction `rgpdExport.ts` existants lisent les **anciennes tables** (`profiles`, `taches`, `recompenses`) et les anciens buckets (`avatars`, `images`). Ils devront être réécrits pour le nouveau modèle :

| Ancien export                   | Nouveau export (à implémenter)                          |
| ------------------------------- | ------------------------------------------------------- |
| `profiles` (pseudo, avatar_url) | `accounts` (timezone) + `child_profiles` (name, avatar) |
| `taches` (label, imagepath)     | `cards` WHERE type='personal' (name, image_url)         |
| `recompenses` (label, image)    | `slots` WHERE kind='reward' + card associée             |
| Bucket `avatars`                | Bucket `personal-images` (avatars enfants)              |
| Bucket `images`                 | Bucket `personal-images` (cartes)                       |

Cet export n'est pas bloquant pour Phase 11 (les droits peuvent être exercés par email en attendant), mais doit être planifié.

### 2.7.4 Invariant : actions RGPD = flux adulte uniquement

Aucune action RGPD (suppression, export, modification de consentement) ne peut être initiée depuis le mode enfant / contexte Tableau. C'est une extension de l'invariant UX TSA "aucun message technique côté enfant".

---

## 2.8 Rétention des données

| Donnée                     | Durée de conservation                   | Mécanisme de purge             |
| -------------------------- | --------------------------------------- | ------------------------------ |
| Compte + données associées | Jusqu'à suppression par l'utilisateur   | Edge Function `delete-account` |
| `consent_events`           | 6 mois après `created_at`               | CRON futur (pas Phase 11)      |
| `subscription_logs`        | 12 mois après `created_at` (§1.5.5)     | CRON futur (pas Phase 11)      |
| Images Storage             | Jusqu'à suppression carte/profil/compte | Edge Function ou CASCADE       |
| Données Stripe             | Gérées par Stripe (hors périmètre DB)   | Dashboard Stripe               |

**Invariant** : `consent_events` avec `account_id = NULL` (visiteur anonyme) sont purgés au même rythme que les autres (6 mois). Rétention alignée avec politique cookies _(§7 : "Preuve de consentement : 6 mois")_.

---

## 2.9 Écarts détectés avec les documents juridiques

L'audit croisé entre ce chapitre et les documents juridiques existants (`politique-confidentialite.md`, `politique-cookies.md`) a révélé les écarts suivants. Ces écarts nécessitent une mise à jour des documents juridiques (hors périmètre PLATFORM.md) :

| #   | Document                       | Écart                                                    | Correction requise                                                   |
| --- | ------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | politique-confidentialite §2.1 | Mentionne "pseudo (obligatoire)"                         | Retirer — pas de pseudo adulte dans le nouveau modèle                |
| 2   | politique-confidentialite §5.1 | "Compte inactif : suppression après 2 ans"               | Retirer ou ajouter un CRON de purge au backlog                       |
| 3   | politique-confidentialite §5.1 | "Compte supprimé : suppression définitive sous 30 jours" | Préciser "suppression immédiate" (pas de soft-delete)                |
| 4   | politique-cookies §5, §6c      | Catégorie "personnalisation" soumise à consentement      | Reclassifier `user_preferences` en "strictement nécessaire" (§2.4.2) |

**Recommandation** : ces mises à jour doivent être faites **avant le lancement** pour éviter des engagements juridiques non tenus.

---

## 2.10 Résumé des invariants (testables)

| #   | Invariant                                                              | Mécanisme                        |
| --- | ---------------------------------------------------------------------- | -------------------------------- |
| 1   | Aucune bannière/popup consentement en mode enfant / contexte Tableau   | Règle front (pas DB)             |
| 2   | `consent_events` INSERT-only (pas d'UPDATE, pas de DELETE côté client) | RLS §2.5.5                       |
| 3   | Écriture `consent_events` uniquement via Edge Function (service_role)  | RLS §2.5.5 (no client write)     |
| 4   | `choices` toujours un objet JSON                                       | CHECK §2.5.3                     |
| 5   | Preuve consentement survit à suppression compte (`ON DELETE SET NULL`) | FK §2.5.3                        |
| 6   | GA4 non chargé sans consentement `choices.analytics === true`          | Règle front (pas DB)             |
| 7   | "Refuser" aussi simple que "Accepter"                                  | Règle front (CNIL symétrie)      |
| 8   | Actions RGPD (suppression, export) = flux adulte uniquement            | Règle front + RLS                |
| 9   | 1 profil enfant minimum par compte (dernier non supprimable)           | Trigger DB (existant Phase 4)    |
| 10  | Données minimisées : pas d'adresse, ville, date de naissance, pseudo   | Décision produit §2.3.2          |
| 11  | `mode` ≠ `action` : le mode porte le choix, l'action porte le contexte | CHECK §2.5.3 + doc Edge Function |

---

# 3. Suppression de compte {#ch3}

** déclenchée via action admin auditées → 6.4 **

## 3.1 Objectif et périmètre

Ce chapitre spécifie le mécanisme de **suppression définitive du compte adulte** (le titulaire). C'est l'action la plus destructive de l'application — elle efface toutes les données personnelles de l'adulte et de tous les profils enfants associés.

Ce chapitre couvre :

- Le flux complet de suppression (front → Edge Function → Stripe → Storage → DB → Auth).
- Les données préservées après suppression (preuves légales).
- Les garde-fous UX (confirmation, Turnstile, suggestion d'export).

Ce chapitre ne couvre **pas** :

- La suppression d'un profil enfant individuel — traitée au §2.7.2.
- L'annulation d'abonnement sans suppression de compte — traitée au §1.8 (Billing Portal Stripe).

---

## 3.2 Décisions structurantes

| Décision                                  | Choix                                | Justification                                                   |
| ----------------------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| Suppression immédiate ou différée ?       | **Immédiate**                        | Simplicité, RGPD art.17 "meilleurs délais", pas d'état zombie   |
| Soft-delete avec délai de grâce ?         | **Non**                              | Pas de CRON, pas d'état `deletion_scheduled`, pas de complexité |
| Restauration possible après suppression ? | **Non — nouveau compte obligatoire** | Données physiquement supprimées, rien à restaurer               |
| Annulation Stripe                         | **Immédiate** (`cancel_immediately`) | Éviter webhooks orphelins vers un compte inexistant             |
| Export avant suppression ?                | **Proposé** (pas obligatoire)        | Droit à la portabilité (art. 20) exercé avant effacement        |

### 3.2.1 Ancien code à ne pas reproduire

L'ancien projet contenait des mécanismes incompatibles avec le nouveau modèle :

| Ancien code                                                                             | Nouveau modèle                                                    |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `useAccountStatus.ts` : états `suspended`, `deletion_scheduled`, `pending_verification` | Code mort — `accounts.status` reste `free / subscriber / admin`   |
| `delete-account` : purge DB table par table (`taches`, `categories`, etc.)              | Inutile — CASCADE depuis `auth.users` suffit                      |
| `delete-account` : purge Storage `images/{userId}/taches`, `avatars/{userId}`           | Buckets et chemins obsolètes — nouveau bucket `personal-images`   |
| `Profil.tsx` : champs pseudo, date_naissance, ville (table `profiles`)                  | Table `profiles` supprimée — nouveau profil adulte minimal (§3.8) |

---

## 3.3 Flux de suppression — séquence complète

```
CONTEXTE : Page Profil adulte, bouton "Supprimer mon compte"

1. FRONT — Modal de confirmation
   a. Afficher avertissement irréversibilité
   b. Proposer "Télécharger mes données avant" (lien export RGPD)
   c. Demander saisie de confirmation (ex: taper "SUPPRIMER")
   d. Résoudre challenge Turnstile (anti-bot)
   e. Envoyer POST à Edge Function delete-account (JWT + turnstile token)

2. EDGE FUNCTION — delete-account (service_role)
   a. Vérifier Turnstile côté serveur
   b. Vérifier JWT — extraire account_id
   c. Vérifier que le compte existe dans accounts
   d. Annuler abonnement Stripe (si existant) → §3.4
   e. Purger images Storage → §3.5
   f. Supprimer auth.users → §3.6 (déclenche CASCADE DB)
   g. Logger dans subscription_logs (fire-and-forget)
   h. Répondre 200 { success: true }

3. FRONT — Post-suppression
   a. Afficher toast "Compte supprimé"
   b. Logout (signOut)
   c. Rediriger vers page d'accueil / signup
```

---

## 3.4 Annulation Stripe

### 3.4.1 Logique

L'Edge Function vérifie si le compte a un abonnement actif dans `subscriptions`. Si oui, elle annule l'abonnement Stripe **immédiatement** (pas `cancel_at_period_end`).

```
1. SELECT stripe_subscription_id FROM subscriptions
   WHERE account_id = :userId
     AND status IN ('active', 'trialing', 'past_due', 'paused')
   LIMIT 1

2. SI trouvé :
   POST https://api.stripe.com/v1/subscriptions/:id
   Body: { cancel_at_period_end: false }  ← annulation immédiate
   OU: DELETE https://api.stripe.com/v1/subscriptions/:id  ← suppression directe

3. SI pas trouvé : ne rien faire (pas d'abonnement actif)
```

### 3.4.2 Pourquoi annulation immédiate (pas fin de période)

Si on garde `cancel_at_period_end: true`, l'abonnement Stripe reste actif après suppression du compte. Stripe continuera à envoyer des webhooks (`invoice.payment_failed`, `customer.subscription.updated`) pour un `account_id` qui n'existe plus en DB. Le webhook échouera en boucle — c'est un anti-pattern.

**Remboursement** : Stripe peut rembourser au prorata automatiquement si configuré dans le dashboard. Ce n'est pas une logique DB — c'est un paramètre Stripe.

### 3.4.3 Tolérance aux erreurs

L'annulation Stripe est **best-effort**. Si l'API Stripe échoue (timeout, erreur réseau), la suppression du compte continue quand même. Raisons :

- L'utilisateur a demandé la suppression, on ne bloque pas sur un problème Stripe.
- Un abonnement Stripe orphelin (sans compte) finira par être annulé automatiquement par Stripe (échec de paiement → canceled).
- Le log dans `subscription_logs` trace l'erreur pour intervention manuelle si nécessaire.

---

## 3.5 Purge Storage

### 3.5.1 Bucket `personal-images`

Le bucket `personal-images` stocke les images personnelles avec un chemin structuré par `account_id` :

```
personal-images/
  {account_id}/
    cards/
      {card_id}.jpg
    avatars/
      {child_profile_id}.jpg
```

L'Edge Function doit lister et supprimer **tous les fichiers** sous le préfixe `{account_id}/`.

```
1. Lister: storage.from('personal-images').list('{account_id}/', { limit: 1000 })
2. Pour chaque sous-dossier (cards/, avatars/): lister et collecter les chemins
3. Supprimer en batch: storage.from('personal-images').remove([...chemins])
```

### 3.5.2 Bucket `bank-images`

Le bucket `bank-images` contient les images de la banque de cartes (admin). Aucune purge nécessaire — les cartes bank n'appartiennent pas à un utilisateur.

### 3.5.3 Tolérance aux erreurs

Comme pour Stripe, la purge Storage est **best-effort**. Si elle échoue partiellement, la suppression du compte continue. Des fichiers orphelins en Storage ne sont pas un problème de sécurité (les policies Storage vérifient `account_id = auth.uid()` — sans auth.users, personne ne peut y accéder). Ils peuvent être purgés par un CRON de nettoyage futur.

---

## 3.6 CASCADE DB — chaîne de suppression

La suppression du compte est déclenchée par `auth.admin.deleteUser(userId)`. Grâce aux FK avec `ON DELETE CASCADE`, la suppression se propage automatiquement :

```
auth.users DELETE
  └→ accounts (id = auth.users.id) CASCADE
       ├→ child_profiles CASCADE
       │    ├→ timelines CASCADE
       │    │    ├→ slots CASCADE
       │    │    │    └→ (card_id SET NULL sur les cards référencées)
       │    │    └→ sessions CASCADE
       │    │         └→ session_validations CASCADE
       │    └→ sequences CASCADE
       │         └→ sequence_steps CASCADE
       ├→ cards (WHERE account_id = :id) CASCADE
       ├→ categories CASCADE (trigger remap désactivé en contexte cascade)
       ├→ user_card_categories CASCADE
       ├→ devices CASCADE
       └→ subscriptions CASCADE
```

### 3.6.1 Tables avec ON DELETE SET NULL (préservées)

| Table               | Colonne      | Comportement post-suppression           |
| ------------------- | ------------ | --------------------------------------- |
| `consent_events`    | `account_id` | `NULL` — preuve conservée 6 mois (§2.8) |
| `subscription_logs` | `account_id` | `NULL` — log conservé 12 mois (§1.5.5)  |

Ces lignes survivent à la suppression. Le `account_id` devient NULL, rendant la preuve non rattachable à une personne identifiable (pseudo-anonymisation RGPD).

### 3.6.2 Trigger `categories_before_delete_remap` — cas spécial

Le trigger de remap catégories (Phase 3, migration 108000) tente de réassigner les cartes vers "Sans catégorie" avant suppression d'une catégorie. En contexte CASCADE (suppression compte), ce trigger pose problème car la catégorie système est elle-même en cours de suppression.

**Mécanisme existant** : les smoke tests Phase 2/3 montrent que le pattern utilisé est `ALTER TABLE categories DISABLE TRIGGER trigger_categories_before_delete_remap` avant la suppression en cascade, puis réactivation. En production, la CASCADE depuis `accounts` fonctionne car les cartes et catégories du même compte sont supprimées ensemble — le remap n'a pas de cible.

**Vérification requise** : s'assurer que la CASCADE fonctionne sans `DISABLE TRIGGER` en production (les smoke tests utilisent ce pattern pour les tests manuels, mais la vraie CASCADE via FK ne déclenche pas le BEFORE DELETE dans le même ordre). Ce point doit être validé par un test d'intégration dédié.

---

## 3.7 Edge Function : delete-account — adaptations

### 3.7.1 Différences avec l'ancien projet

| Ancien projet                                         | Nouveau projet                            |
| ----------------------------------------------------- | ----------------------------------------- |
| Purge DB table par table (taches, categories, etc.)   | Inutile — CASCADE depuis auth.users       |
| `admin.from('abonnements')` pour Stripe               | `admin.from('subscriptions')` pour Stripe |
| Storage: `images/{userId}/taches`, `avatars/{userId}` | Storage: `personal-images/{account_id}/`  |
| Pas de log subscription_logs                          | Logger l'événement dans subscription_logs |

### 3.7.2 Flux simplifié (nouveau modèle)

```
1. Vérifier Turnstile (token + IP)
2. Vérifier JWT → userId
3. Vérifier EXISTS accounts WHERE id = userId
4. Lire subscriptions.stripe_subscription_id (si actif)
5. [best-effort] Annuler abonnement Stripe
6. [best-effort] Purger Storage personal-images/{userId}/**
7. [best-effort] Logger dans subscription_logs (event_type: 'account.deleted')
8. auth.admin.deleteUser(userId)  ← point de non-retour, déclenche CASCADE
9. Répondre 200
```

L'étape 8 est le **seul point critique**. Les étapes 5, 6, 7 sont best-effort. Si l'étape 8 échoue, on renvoie une erreur et le compte reste intact.

### 3.7.3 Sécurité

| Mesure                                 | Justification                                                     |
| -------------------------------------- | ----------------------------------------------------------------- |
| Turnstile (Cloudflare)                 | Anti-bot, empêche suppression automatisée                         |
| JWT obligatoire                        | Seul le propriétaire du compte peut supprimer                     |
| `service_role` pour les opérations     | Bypass RLS nécessaire pour purger Storage et supprimer auth.users |
| Pas de paramètre `userId` dans le body | L'ID est extrait du JWT — impossible de supprimer un autre compte |

---

## 3.8 Page Profil adulte — nouveau modèle

### 3.8.1 Données affichées

La page Profil adulte dans le nouveau modèle affiche :

| Donnée     | Source                         | Modifiable | Notes                                           |
| ---------- | ------------------------------ | ---------- | ----------------------------------------------- |
| Pseudo     | `accounts` (colonne à ajouter) | Oui        | Nom affiché, pas d'unicité requise              |
| Avatar     | Storage `personal-images`      | Oui        | Image profil adulte                             |
| Email      | `auth.users.email`             | Non (ici)  | Affiché en lecture seule, modification via Auth |
| Timezone   | `accounts.timezone`            | Oui        | Utilisé pour calcul quotas mensuels             |
| Statut abo | `subscriptions.status`         | Non        | Badge affiché, lien vers gestion abonnement     |

### 3.8.2 Impact sur la table `accounts`

La table `accounts` actuelle contient : `id`, `status`, `timezone`, `created_at`, `updated_at`.

Pour le pseudo et l'avatar adulte, deux nouvelles colonnes sont nécessaires :

| Colonne        | Type | Nullable | Description                       |
| -------------- | ---- | -------- | --------------------------------- |
| `display_name` | TEXT | NULL     | Pseudo / nom affiché de l'adulte  |
| `avatar_url`   | TEXT | NULL     | Chemin Storage de l'avatar adulte |

**Note** : cet ajout est une migration Phase 11+ et sera spécifié dans une mise à jour de PRODUCT_MODEL.md. Il n'est pas bloquant pour la suppression de compte.

### 3.8.3 Champs retirés (ancien Profil.tsx)

| Ancien champ     | Décision                            | Justification                     |
| ---------------- | ----------------------------------- | --------------------------------- |
| `pseudo`         | **Gardé** → `accounts.display_name` | Identifiant visuel pour l'adulte  |
| `avatar`         | **Gardé** → `accounts.avatar_url`   | Personnalisation profil adulte    |
| `date_naissance` | **Retiré**                          | Non nécessaire, minimisation RGPD |
| `ville`          | **Retiré**                          | Non nécessaire, minimisation RGPD |

---

## 3.9 Nettoyage des comptes non confirmés

### 3.9.1 Rôle

L'Edge Function `cleanup-unconfirmed` existante supprime les comptes `auth.users` dont l'email n'a pas été confirmé après 7 jours. Ce mécanisme reste pertinent dans le nouveau modèle.

### 3.9.2 Adaptations

| Ancien projet                   | Nouveau projet                                                            |
| ------------------------------- | ------------------------------------------------------------------------- |
| `auth.admin.deleteUser(userId)` | Identique (CASCADE supprime accounts + tout)                              |
| Pas de purge Storage            | Ajouter purge `personal-images/{userId}/` si fichiers existent            |
| Pas de log                      | Optionnel (les comptes non confirmés n'ont pas de données significatives) |

### 3.9.3 Déclenchement

CRON Supabase (ou invocation manuelle) — fréquence quotidienne recommandée.

---

## 3.10 Résumé des invariants (testables)

| #   | Invariant                                                                 | Mécanisme            |
| --- | ------------------------------------------------------------------------- | -------------------- |
| 1   | Suppression immédiate et irréversible (pas de soft-delete)                | Edge Function §3.7   |
| 2   | Seul le propriétaire peut supprimer son compte (JWT, pas de paramètre ID) | Edge Function §3.7.3 |
| 3   | Turnstile obligatoire (anti-bot)                                          | Edge Function §3.7.3 |
| 4   | CASCADE DB : auth.users DELETE → tout le graphe (§3.6)                    | FK ON DELETE CASCADE |
| 5   | `consent_events` survit (ON DELETE SET NULL)                              | FK §2.5.3            |
| 6   | `subscription_logs` survit (ON DELETE SET NULL)                           | FK §1.5.3            |
| 7   | Stripe annulé immédiatement (pas fin de période)                          | Edge Function §3.4   |
| 8   | Storage purgé best-effort (pas bloquant si échec)                         | Edge Function §3.5   |
| 9   | Suppression = flux adulte uniquement (jamais contexte enfant/Tableau)     | Règle front + §2.7.4 |
| 10  | Export proposé avant suppression (droit à la portabilité art. 20)         | Modal front §3.3     |
| 11  | `accounts.status` inchangé (pas de `deletion_scheduled`)                  | Décision §3.2        |

---

# 4. Edge Functions — Inventaire & Adaptations {#ch4}

référence explicite aux Edge Functions “admin” (resync / deletion request), mais la politique d’accès reste décrite en 6.

## 4.1 Objectif et périmètre

Ce chapitre est un **registre consolidé** des Edge Functions existantes dans l'ancien projet. Pour chacune, il identifie les écarts concrets avec le nouveau modèle DB-first et fournit une checklist d'adaptation.

Ce chapitre ne re-détaille **pas** les flux et la logique métier — ceux-ci sont spécifiés dans les chapitres dédiés (références fournies). Il sert de **pont entre la spécification et l'implémentation**.

---

## 4.2 Registre des Edge Functions

| #   | Fonction                  | Rôle                                 | Auth                      | Spécification détaillée | Priorité adaptation |
| --- | ------------------------- | ------------------------------------ | ------------------------- | ----------------------- | ------------------- |
| 1   | `stripe-webhook`          | Réception événements Stripe → upsert | Signature Stripe (no JWT) | §1.8                    | Haute               |
| 2   | `create-checkout-session` | Checkout ou Billing Portal Stripe    | JWT utilisateur           | §1.9                    | Haute               |
| 3   | `log-consent`             | Journaliser consentement cookies     | Anon key (optionnel JWT)  | §2.6                    | Haute               |
| 4   | `delete-account`          | Suppression compte complète          | JWT + Turnstile           | §3.7                    | Haute               |
| 5   | `cleanup-unconfirmed`     | Purge comptes non confirmés (CRON)   | Service role (interne)    | §3.9                    | Basse               |

---

## 4.3 Écarts détaillés par fonction

### 4.3.1 `stripe-webhook`

**Référence** : §1.8

| Écart                    | Ancien code                                     | Nouveau modèle                                       |
| ------------------------ | ----------------------------------------------- | ---------------------------------------------------- |
| Table cible              | `abonnements`                                   | `subscriptions`                                      |
| Colonne user             | `user_id`                                       | `account_id`                                         |
| Colonne customer         | `stripe_customer`                               | `stripe_customer_id`                                 |
| Upsert conflict          | `onConflict: 'stripe_subscription_id'`          | Identique                                            |
| Colonne `plan`           | Présente (TEXT)                                 | Supprimée (info Stripe-only, pas en DB)              |
| Colonne `start_date`     | Présente                                        | Supprimée (redondant avec `current_period_start`)    |
| Colonne `end_date`       | Présente                                        | Supprimée                                            |
| Colonne `latest_invoice` | Présente                                        | Supprimée                                            |
| Colonne `raw_data`       | Présente (JSONB Stripe brut)                    | Supprimée (dashboard Stripe suffit)                  |
| Logs table               | `subscription_logs` avec `user_id`, `timestamp` | `subscription_logs` avec `account_id`, `created_at`  |
| Trigger post-upsert      | Aucun (rôle géré dans la fonction)              | Trigger DB §1.6 (automatique, ne rien faire côté EF) |

**Checklist adaptation** :

- [ ] Renommer table `abonnements` → `subscriptions` dans toutes les requêtes
- [ ] Renommer `user_id` → `account_id` dans upsert et logs
- [ ] Renommer `stripe_customer` → `stripe_customer_id`
- [ ] Supprimer colonnes `plan`, `start_date`, `end_date`, `latest_invoice`, `raw_data` du payload upsert
- [ ] Renommer `timestamp` → `created_at` dans subscription_logs (ou laisser `created_at` DEFAULT)
- [ ] Supprimer la fonction `extractFieldsFromSub()` et la remplacer par un mapping simplifié vers les colonnes §1.4.3
- [ ] Vérifier que le trigger §1.6 se déclenche correctement après upsert (pas de logique de rôle dans la EF)

### 4.3.2 `create-checkout-session`

**Référence** : §1.9

| Écart                  | Ancien code                                                     | Nouveau modèle                                                |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| Table lecture          | `abonnements`                                                   | `subscriptions`                                               |
| Colonne user           | `user_id`                                                       | `account_id`                                                  |
| Colonne customer       | `stripe_customer`                                               | `stripe_customer_id`                                          |
| Filtre statut actif    | `.in('status', ['active', 'trialing'])`                         | `.in('status', ['active', 'trialing', 'past_due', 'paused'])` |
| Upsert après recherche | `admin.from('abonnements').upsert(...)` pour sauver customer_id | Supprimé — le webhook gère toutes les écritures               |
| Logs                   | `subscription_logs` avec `user_id`, `timestamp`                 | `subscription_logs` avec `account_id`, `created_at`           |
| CORS                   | `'*'`                                                           | Utiliser `ALLOWED_RETURN_HOSTS` (pattern delete-account)      |

**Checklist adaptation** :

- [ ] Renommer table `abonnements` → `subscriptions`
- [ ] Renommer `user_id` → `account_id`, `stripe_customer` → `stripe_customer_id`
- [ ] Ajouter `past_due` et `paused` au filtre d'abonnement actif (§1.3.2)
- [ ] Supprimer l'upsert `abonnements` après recherche customer (le webhook est la seule source d'écriture §1.11 inv.9)
- [ ] Renommer `timestamp` → `created_at` dans logs
- [ ] Remplacer CORS `'*'` par le pattern `getAllowedOrigin()` de delete-account

### 4.3.3 `log-consent`

**Référence** : §2.6

| Écart                     | Ancien code                                                        | Nouveau modèle                                                   |
| ------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Table cible               | `consentements`                                                    | `consent_events`                                                 |
| Colonne user              | `user_id`                                                          | `account_id`                                                     |
| Colonne type              | `type_consentement`                                                | `consent_type`                                                   |
| Colonne `donnees`         | Présente (TEXT, `JSON.stringify(choices)`)                         | Supprimée (doublon de `choices` JSONB)                           |
| Colonne `ts`              | Présente (timestamp insertion)                                     | Supprimée (doublon de `created_at`)                              |
| Résolution user           | `user_id` reçu dans le body                                        | `account_id` résolu depuis JWT (si authentifié)                  |
| Validation `action`       | CHECK DB mais code envoie `accept_all`, `refuse_all` dans `action` | `action` = contexte seulement (§2.5.3), `mode` = choix           |
| Champ `action` côté front | `CookieBanner.tsx` envoie `action: 'accept_all'`                   | Front doit envoyer `action: 'first_load'` + `mode: 'accept_all'` |

**Checklist adaptation** :

- [ ] Renommer table `consentements` → `consent_events`
- [ ] Renommer `type_consentement` → `consent_type`
- [ ] Renommer `user_id` → `account_id`
- [ ] Supprimer colonnes `donnees` et `ts` du payload d'insertion
- [ ] Résoudre `account_id` depuis le JWT (header Authorization) au lieu du body
- [ ] Corriger la séparation `mode` / `action` (§2.5.3) : le front envoie `mode` pour le choix, `action` pour le contexte
- [ ] Mettre à jour `CookieBanner.tsx` : remplacer `action: 'accept_all'` par `action: 'first_load', mode: 'accept_all'`
- [ ] Mettre à jour `consent.ts` : `revokeConsent()` envoie `action: 'revoke', mode: 'refuse_all'`

### 4.3.4 `delete-account`

**Référence** : §3.7

| Écart                   | Ancien code                                                                 | Nouveau modèle                                                  |
| ----------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Purge DB                | DELETE table par table (taches, categories, etc.)                           | Supprimé — CASCADE depuis auth.users suffit                     |
| Table Stripe            | `abonnements`                                                               | `subscriptions`                                                 |
| Colonne user Stripe     | `user_id`                                                                   | `account_id`                                                    |
| Colonne customer Stripe | `stripe_customer_id`                                                        | `stripe_customer_id` (identique)                                |
| Annulation Stripe       | `cancel_at_period_end: 'true'`                                              | Annulation immédiate (§3.4)                                     |
| Storage buckets         | `images/{userId}/taches`, `images/{userId}/recompenses`, `avatars/{userId}` | `personal-images/{account_id}/` (unique bucket)                 |
| Log suppression         | Aucun                                                                       | Logger dans `subscription_logs` (event_type: `account.deleted`) |

**Checklist adaptation** :

- [ ] Supprimer toute la purge DB manuelle (taches, categories, parametres, recompenses, profiles)
- [ ] Renommer table `abonnements` → `subscriptions`, `user_id` → `account_id`
- [ ] Changer Stripe cancel : `cancel_at_period_end: 'true'` → annulation immédiate (`DELETE /v1/subscriptions/:id` ou `cancel_at_period_end: false`)
- [ ] Remplacer purge Storage : 3 anciens préfixes/buckets → unique `personal-images/{account_id}/`
- [ ] Ajouter log dans `subscription_logs` avant suppression auth.users
- [ ] Simplifier le flux : Turnstile → JWT → Stripe cancel → Storage purge → auth.admin.deleteUser → 200

### 4.3.5 `cleanup-unconfirmed`

**Référence** : §3.9

| Écart       | Ancien code                          | Nouveau modèle                                                   |
| ----------- | ------------------------------------ | ---------------------------------------------------------------- |
| Suppression | `auth.admin.deleteUser(userId)` seul | Identique (CASCADE suffit)                                       |
| Storage     | Pas de purge                         | Ajouter purge `personal-images/{userId}/` (si fichiers existent) |
| Seuil       | 7 jours sans confirmation            | Identique (à valider)                                            |

**Checklist adaptation** :

- [ ] Ajouter purge Storage `personal-images/{userId}/` avant `deleteUser()` (un compte non confirmé peut avoir uploadé des images pendant la période)
- [ ] Valider le seuil de 7 jours (décision produit, pas de contrainte technique)

---

## 4.4 Patterns transversaux à harmoniser

L'audit du code révèle des **patterns incohérents entre les fonctions** qui doivent être normalisés lors de la réécriture :

### 4.4.1 CORS

| Fonction                  | Pattern actuel       | Pattern cible                          |
| ------------------------- | -------------------- | -------------------------------------- |
| `stripe-webhook`          | `'*'`                | Pas de CORS (serveur-à-serveur Stripe) |
| `create-checkout-session` | `'*'`                | `getAllowedOrigin()` (whitelist)       |
| `log-consent`             | `getAllowedOrigin()` | Identique (déjà correct)               |
| `delete-account`          | `getAllowedOrigin()` | Identique (déjà correct)               |
| `cleanup-unconfirmed`     | Aucun (CRON interne) | Aucun (pas d'appel externe)            |

### 4.4.2 Logging dans `subscription_logs`

| Fonction                  | Pattern actuel               | Pattern cible                              |
| ------------------------- | ---------------------------- | ------------------------------------------ |
| `stripe-webhook`          | `user_id`, `timestamp`       | `account_id`, `created_at` (DEFAULT NOW()) |
| `create-checkout-session` | `user_id`, `timestamp`       | `account_id`, `created_at` (DEFAULT NOW()) |
| `log-consent`             | Pas de log subscription_logs | Inchangé (logs dans `consent_events`)      |
| `delete-account`          | Aucun log                    | Ajouter log `account.deleted`              |
| `cleanup-unconfirmed`     | Aucun log                    | Optionnel (log `account.cleanup`)          |

**Attention** : l'ancien code envoie `timestamp: new Date().toISOString()` manuellement. Le nouveau modèle utilise `created_at DEFAULT NOW()` — il suffit de ne **pas** envoyer le champ et laisser le défaut DB.

### 4.4.3 Dépendances Deno

| Fonction                  | `supabase-js` version | `stripe` version | `deno/std` version |
| ------------------------- | --------------------- | ---------------- | ------------------ |
| `stripe-webhook`          | `2.45.2`              | `14.25.0`        | `0.224.0`          |
| `create-checkout-session` | `2.45.2`              | `14.25.0`        | `0.224.0`          |
| `log-consent`             | `2.45.3`              | —                | `0.224.0`          |
| `delete-account`          | `2.45.1`              | —                | —                  |
| `cleanup-unconfirmed`     | Non versionné         | —                | `0.177.0`          |

**Recommandation** : harmoniser toutes les dépendances sur les mêmes versions lors de la réécriture.

---

## 4.5 Edge Functions manquantes (à créer)

Le nouveau modèle nécessite des Edge Functions qui n'existent pas encore :

| Fonction           | Rôle                                                 | Référence | Priorité             |
| ------------------ | ---------------------------------------------------- | --------- | -------------------- |
| `export-user-data` | Export RGPD (art. 15/20) — ZIP des données du compte | §2.7.3    | Basse (pas Phase 11) |

**Note** : le trigger `subscriptions → accounts.status` (§1.6) est un trigger DB, pas une Edge Function. Le mapping Stripe est entièrement DB-side.

---

## 4.6 Résumé des invariants (testables)

| #   | Invariant                                                                                   | Mécanisme                     |
| --- | ------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Toute écriture dans `subscriptions` passe par le webhook (service_role)                     | RLS §1.4.6 + EF §4.3.1        |
| 2   | Toute écriture dans `consent_events` passe par log-consent (service_role)                   | RLS §2.5.5 + EF §4.3.3        |
| 3   | `delete-account` ne fait aucun DELETE SQL manuel (CASCADE seul)                             | Architecture §3.6 + EF §4.3.4 |
| 4   | `stripe-webhook` ne modifie pas `accounts.status` (le trigger DB le fait)                   | Séparation §1.6 + EF §4.3.1   |
| 5   | Aucune EF n'écrit dans des tables de l'ancien modèle (`abonnements`, `consentements`, etc.) | Checklist §4.3                |
| 6   | CORS whitelist sur toutes les EF appelées depuis le front                                   | §4.4.1                        |
| 7   | Versions de dépendances harmonisées entre toutes les EF                                     | §4.4.3                        |

---

# 5. Paramètres utilisateur {#ch5}

> **Périmètre** : préférences d’interface et d’accessibilité **hors core** (planning/jetons/séquençage).  
> **Règle d’or (DB-first)** : toute préférence “persistante” est **DB-authoritative** (pas un simple `localStorage` supposé), avec RLS self-only.

---

## 5.1 Objectif

Ce chapitre définit :

- quelles préférences utilisateur sont **persistées en DB** (source de vérité),
- lesquelles restent **locales au device** (non synchronisées, non critiques),
- et les **invariants** associés (TSA + robustesse DB + RLS).

Ce chapitre **ne** définit **aucune** règle métier (quota, statuts, accès features, transitions core).  
Les paramètres ne doivent jamais conditionner ni modifier :

- le planning visuel
- l’économie de jetons
- le séquençage

---

## 5.2 Principes (TSA + terrain + DB-first)

### 5.2.1 Prévisibilité et non-surprise (TSA)

- Les paramètres ne doivent pas introduire de changements “globaux” inattendus.
- Les préférences liées aux stimuli (animations, confettis) doivent être **désactivables** et **persistantes** (pour éviter un “ça revient tout seul”).

### 5.2.2 Portée : par compte (multi-tenant)

- **Interdit** : un singleton global type `parametres(id=1)` lisible/modifiable par tous (anti-modèle multi-tenant + risques RLS).
- **Autorisé** : une ligne de préférences **par compte** (adulte responsable).

### 5.2.3 Source de vérité

- **DB = source de vérité** pour les préférences qui impactent l’expérience (ex : toasts, réduction animations).
- Le front peut mettre en cache, mais ne doit jamais “inventer” une valeur par défaut si la ligne n’existe pas.

---

## 5.3 Stockage des préférences (modèle DB conceptuel)

### 5.3.1 Table `account_preferences` (1 ligne par compte)

- **Cardinalité** : `accounts (1) → account_preferences (0..1)` pendant la transition, puis **cible** `1..1`.
- **Invariant** : à terme, la ligne doit exister pour tout compte (création DB-first à la création du compte).

Colonnes minimales (V1) :

- `account_id` (PK, FK → `accounts(id)`, ON DELETE CASCADE)
- `toasts_enabled` (boolean, NOT NULL)
- `reduced_motion` (boolean, NOT NULL)
- _(optionnel V1, si maintenu comme préférence persistante)_ `confetti_enabled` (boolean, NOT NULL)

> Remarque : `timezone` reste dans `accounts.timezone` (déjà utilisé pour calcul quota mensuel). Ce n’est pas une préférence d’UI “pure”.

### 5.3.2 Création DB-first de la ligne de préférences

- À la création de compte, la DB doit créer la ligne `account_preferences` automatiquement.
- **Interdit** : “si absent, le front assume true/false”.
- Tolérance : pendant Phase 11, on peut accepter `0..1`, mais il faut planifier le passage à `1..1`.

---

## 5.4 Préférences V1 (liste fermée)

### 5.4.1 `reduced_motion` (accessibilité / TSA)

- **Objectif** : réduire la charge sensorielle (animations, effets visuels).
- **Invariant prioritaire** : si `reduced_motion = true`, alors toutes les animations non essentielles doivent être désactivées (incluant confettis si présents).

**Décision recommandée (safe TSA)** :

- `reduced_motion` par défaut = `true` (prudence sensorielle).
- Si tu veux `false` par défaut, il faut une justification TSA explicite + garde-fous.

### 5.4.2 `toasts_enabled` (feedback adulte non bloquant)

- Les toasts sont des messages éphémères (non stockés en DB). Seule la préférence l’est.
- **Règle** : si `toasts_enabled = false`, alors les toasts `info/success/warning` sont supprimés.  
  Les erreurs critiques doivent avoir un fallback (inline/error state), et ne doivent pas dépendre d’un toast.

**Décision recommandée** :

- `toasts_enabled` par défaut = `true`.

### 5.4.3 `confetti_enabled` (si conservé)

- Confettis = **animation UI** (jamais un état DB, jamais un état core).
- **Interdit** : déclencher “confettis” sur une agrégation métier ambiguë (“tout terminé”) si cela force une règle côté UI.
- **Contrat** : l’affichage dépend strictement de la préférence et du `reduced_motion`.

**Décision recommandée** :

- `confetti_enabled` par défaut = `false` (safe TSA).

---

## 5.5 Préférences locales (device-only) — explicitement hors DB

Certaines préférences peuvent rester **locales au device** (localStorage), si :

- elles ne modifient aucun état core,
- elles n’ont pas d’impact sécurité,
- et leur non-synchronisation est acceptable (usage terrain).

Exemples typiques (non contractuels côté DB) :

- position d’un widget flottant,
- derniers presets de durée (TimeTimer),
- préférences ergonomiques non critiques.

**Invariant** : aucune préférence locale ne doit être requise pour comprendre l’état du core (pas de “si localStorage manque, l’app casse”).

---

## 5.6 RLS & sécurité (obligatoire)

### 5.6.1 `account_preferences`

- SELECT : uniquement le propriétaire (`account_id = auth.uid()`).
- INSERT/UPDATE : uniquement le propriétaire (ou automatisé DB/trigger à la création de compte).
- DELETE : inutile en pratique (préférer UPDATE). Si autorisé, owner-only.

### 5.6.2 Interdits explicites

- pas de table globale de paramètres partagés,
- pas de policy “SELECT ALL authenticated” sur des préférences,
- pas de préférence qui “unlock” une règle métier (quota, accès, status, RLS).

---

## 5.7 Invariants (testables)

1. Un compte A ne peut ni lire ni modifier `account_preferences` du compte B.
2. Une ligne `account_preferences` est créée DB-first à la création du compte (pas de fallback UI).
3. `reduced_motion = true` force la désactivation des animations non essentielles (dont confettis si présents).
4. Les préférences n’impactent jamais le core (planning/jetons/séquençage) : aucune contrainte core ne dépend d’un paramètre UI.

---

# 6 Administration (Owner) + Monitoring & Audit

## 6.1 Périmètre Administration (Owner-only)

- **Admin = Owner (créateur/mainteneur)** : rôle technique d’exploitation/support, **pas un rôle pédagogique**, **non visible** dans l’UX standard.
- **Confidentialité (invariant)** : l’admin **ne doit jamais accéder aux contenus privés** (ex : preview d’images, contenu de cartes personnelles, textes libres, données enfant sensibles). L’admin n’accède qu’à des **métadonnées** et des **états** strictement nécessaires au support et à la conformité.
- **Séparation nette des périmètres** :
  - **Admin produit** (ex : gestion de la banque de cartes, modération de contenu “bank”) → défini dans `PRODUCT_MODEL.md` (et éventuellement `ux.md` si UX dédiée).
  - **Admin plateforme** (billing / support / RGPD / audit / sécurité) → défini ici dans `PLATFORM.md`.

---

## 6.2 Modèle d’autorisation (Owner-only)

- **Owner-only** : l’accès admin est réservé à **une seule identité** (le mainteneur).
- **Une seule source de vérité** pour l’Owner (pas de RBAC V1) :
  - soit via une règle DB `is_owner()` (allowlist email/uid),
  - soit via un flag unique `accounts.is_owner = true` (avec contrainte “au plus 1 owner”).
- **Owner ≠ superuser DB (invariant)** :
  - l’Owner **n’a pas de “god mode”** sur les tables produit,
  - aucune édition directe des données produit via l’UI admin,
  - toute modification permise se fait via des **actions atomiques** (fonctions DB / Edge Functions) qui **enforcent les invariants** et **écrivent un audit** dans la même transaction.
- **Aucune règle métier critique côté UI** : l’UI admin est un client. Les règles (autorisations, invariants, validations) sont **en DB**.

---

## 6.3 Admin Audit Log (append-only)

### 6.3.1 Objectif

Garantir la traçabilité de toute opération “owner/admin” (sécurité, billing, conformité, support) sans introduire d’exposition de données privées.

### 6.3.2 Invariants

- **Append-only** : aucune UPDATE/DELETE (audit immuable).
- **Reason obligatoire** : toute action admin doit inclure une justification courte (ex : “support incident”, “webhook Stripe manqué”).
- **Action enum (liste fermée)** : pas de “string libre” non contrôlé.
- **Audit atomique** : toute action admin doit écrire **exactement une** entrée d’audit **dans la même transaction** que l’action (ou échouer).
- **Metadata bornée et non sensible** :
  - la metadata doit être bornée (taille/structure) et limitée au diagnostic,
  - **interdit** d’y stocker du contenu privé (images, texte libre, données enfant sensibles, payloads complets).
- **Rétention** : définir une politique de conservation (ex : 12 mois) + mécanisme de purge automatisée (owner/service).

### 6.3.3 Contenu minimal (conceptuel)

- `actor_account_id` (Owner)
- `target_account_id` (nullable)
- `action` (enum)
- `reason` (obligatoire)
- `metadata` (json borné, non sensible)
- `created_at`

---

## 6.4 Catalogue d’actions admin V1 (liste fermée)

> Toutes les actions ci-dessous sont **owner-only**, passent par des fonctions dédiées (DB/Edge), et **auditent** (cf. 6.3).

### 6.4.1 Sécurité

- **Revoke sessions** : forcer la déconnexion (incident sécurité, appareil perdu, etc.).
- **Disable device** (si applicable) : bloquer un device compromis.

**Interdits V1**

- modifications directes de données produit “pour dépanner” (ex : éditer une carte, changer un planning, modifier une séquence).

### 6.4.2 Billing (Stripe)

- **Resync subscription from Stripe** : réconcilier l’état local quand un webhook a été manqué/retardé.
- **Append subscription log** : ajouter une annotation d’incident/événement support (append-only).

**Interdits V1**

- **Pas de “set account status manual”** : l’état de compte est déterminé par le contrat billing + règles DB, jamais à la main.

### 6.4.3 Compte / Conformité

- **Request account deletion** : déclencher le flux standard de suppression (conforme RGPD), jamais un DELETE manuel.
- **Export proof / evidence** (lecture) : accès aux traces nécessaires (ex : consent events) sans contenu privé.

---

## 6.5 Monitoring (tech) — Observabilité non sensible

### 6.5.1 Périmètre

- Erreurs Edge Functions / webhooks (Stripe, consent log, opérations support).
- Contrôles de quotas (barrières serveur), latences, taux d’échec.
- États techniques (ex : backlog de jobs/purge) si applicables.

### 6.5.2 Invariants

- **Aucun contenu privé** dans les métriques (pas d’images, pas de texte libre, pas de payloads complets).
- Les métriques doivent être **agrégées** ou **pseudonymisées** (account_id seulement si indispensable support).
- Le monitoring ne doit jamais devenir une “porte dérobée” pour reconstituer le contenu utilisateur.

---

## 6.6 Scopes d’accès (tables & données accessibles)

### 6.6.1 Lecture autorisée (Owner-only)

Lecture strictement limitée à des **métadonnées** et **états** :

- **Comptes** : `accounts` (identité minimale + statut + timestamps).
- **Appareils** : `devices` (métadonnées techniques).
- **Billing** : `subscriptions`, `subscription_logs`.
- **Conformité** : `consent_events` (preuves de consentement, append-only).
- **Quotas / usage** : compteurs et limites (métadonnées, agrégats), sans contenu.

### 6.6.2 Écriture autorisée

- **Audit** : insertion dans `admin_audit_log` (append-only).
- **Logs billing** : insertion dans `subscription_logs` (append-only) si nécessaire.
- **Actions** : uniquement via fonctions/Edge dédiées (cf. 6.4), qui modifient ce qui doit l’être tout en respectant les invariants.

### 6.6.3 Interdits explicites

- Preview / lecture des **images privées** et des contenus personnels.
- Lecture/édition des données produit enfant (cards perso, séquences perso, etc.) via console “support”.
- Écriture directe sur tables produit depuis l’UI admin.
- Feature flags globaux “fun” (ex : confettis) qui changent le comportement pour tous (risque TSA + surprise).

---

# 7 Micro-features UX (hors core)

## 7.1 Confettis

### 7.1.1 Statut : “plateforme”, pas core

Les “confettis” sont un renforcement visuel optionnel déclenché par un événement de complétion côté UX (ex: “toutes les tâches terminées”).
Interdiction absolue : les confettis ne doivent jamais modifier ni conditionner :

- le planning visuel
- l’économie de jetons
- le séquençage

Ils sont purement une sortie UI (affichage/animation), donc classés “plateforme”.

---

### 7.1.2 Objectif produit (TSA)

- Donner un feedback positif sans surprise.
- Permettre une désactivation persistante (certains enfants sont hypersensibles aux stimuli).
- Garantir une option “réduction des animations” (ou équivalent) qui force la désactivation.

---

### 7.1.3 Contrat (invariants)

Invariant A — DB-authoritative
L’activation/désactivation est une préférence persistée en DB (source de vérité), jamais un simple flag UI local.

Invariant B — portée
Préférence par compte (adulte responsable), pas globale, pas partagée entre comptes.

Invariant C — safe default TSA
Par défaut, confettis = OFF (recommandé pour réduire surcharge/surprise).
(Si tu veux garder “ON par défaut”, il faudra une justification TSA claire + garde-fous reduced-motion.)

Invariant D — priorité accessibilité
Si une préférence “reduced_motion” (ou équivalent) est activée, alors confettis sont forcés OFF (priorité absolue).

---

### 7.1.4 Modèle de données (conceptuel)

Créer un espace de préférences “plateforme” distinct des systèmes cœur.

Recommandation : une table 1 ligne par compte (ex : account_preferences), avec au minimum :

- account_id (PK, FK)
- confetti_enabled boolean not null default false
- (voir §7.2) toasts_enabled boolean not null default true
- (fortement recommandé) reduced_motion boolean not null default true

Note : on évite un “singleton global” (type id=1) qui casse le multi-tenant et ouvre des failles RLS.

---

### 7.1.5 RLS (obligatoire, simple, auditable)

Politiques owner-only :

- SELECT : seulement le propriétaire du compte
- INSERT/UPDATE : seulement le propriétaire du compte
- DELETE : généralement inutile (préférer UPDATE), sinon owner-only également
- Aucune policy du type “select all users”.

---

### 7.1.6 Flux d’exécution (runtime)

- Le trigger (événement “tout est terminé”) peut rester côté UI.
- La décision d’afficher doit dépendre strictement de la préférence DB :
- afficher si confetti_enabled = true ET reduced_motion = false
- Aucun impact sur les données core (aucune écriture core liée au confetti).

---

### 7.1.7 Tests DB (smoke tests à prévoir)

- Un compte A ne peut ni lire ni modifier les préférences du compte B.
- L’upsert des préférences crée/maintient exactement 1 ligne par compte.
- Si reduced_motion=true, alors l’état effectif “confetti autorisé” est false (selon contrainte/trigger choisi).

---

## 7.2 TrainProgressBar (barre “train / stations”)

### 7.2.1 Statut : plateforme, pas core

La TrainProgressBar est un affichage motivant de progression (métaphore “véhicule + stations”) basé sur done/total.
Interdiction absolue : elle ne doit jamais conditionner ni modifier les états des 3 systèmes cœur.
Le calcul de progression est purement dérivé (lecture only).

---

### 7.2.2 Objectifs UX (TSA)

Rendre la progression visible et prévisible (réduction anxiété, feedback clair).
Limiter la charge cognitive : une seule représentation (éviter concurrence avec d’autres indicateurs).
Contrôle adulte : pouvoir masquer la barre si elle distrait ou sur-stimule.
Éviter les surprises : comportement stable, et options persistantes.

---

### 7.2.3 Contrat (invariants)

Invariant A — Purement dérivé
La barre est dérivée de (done, total) ; aucune donnée métier ne dépend d’elle.

Invariant B — Safe sur total=0
Si total = 0, l’affichage doit rester défini (pas de NaN / pas de position invalide).

Invariant C — Accessibilité / motion
Si reduced_motion=true (préférence accessibilité), la barre doit être désactivée ou rendue statique (pas d’animation).
Si la barre est activable, le défaut recommandé TSA est OFF, sauf décision produit explicitement justifiée.

Invariant D — Cohérence “gating”
Si une règle “visitor/demo/entitlement” existe, elle doit être impossible à contourner par un autre chemin UI (pas seulement “masquée”).

Invariant E — Ordre canonique (pas de sens)
Pour chaque (type, ligne), les stations sont stockées dans un ordre canonique unique ordre.
L’application n’expose pas de notion de direction (aller/retour).
L’ordre doit être stable dans le temps : modifier massivement des ordre en prod est une opération “breaking” (à éviter ; préférer ajout/archivage si besoin).

---

### 7.2.4 Préférences (DB-authoritative)

La visibilité (show/hide) est une préférence de compte persistée en DB, pas seulement localStorage.

Recommandation : dans la même table de préférences “plateforme” que confettis (ex: account_preferences) :

train_progress_enabled boolean not null default false

(optionnel) train_line text null : la ligne choisie par l’adulte (persistante cross-device)

(optionnel) train_type transport_type not null default 'metro'

Règle visitor (contrat) :

Le visitor voit la TrainProgressBar.

Le visitor ne peut pas changer la ligne.

La ligne effective du visitor est forcée à : type='metro' et ligne='1'.

Toute tentative de changement doit être impossible (entitlement) ou ignorée côté serveur (pas uniquement “select désactivé”).

---

### 7.2.5 Données stations (catalogue DB — décision retenue)

Décision
Nous conservons une table stations en DB pour permettre l’ajout de nombreuses lignes et stations (métro, tram, bus) sans release applicative.
La table stations est un catalogue non sensible (référentiel plateforme).

RLS:

- stations est read-only depuis le client (auth/anon) :
- SELECT autorisé (anon + authenticated)
- INSERT/UPDATE/DELETE interdits (aucune policy d’écriture)

(C’est cohérent avec ton export stations : RLS enabled/forced + policies SELECT pour anon et authenticated, et aucune policy d’écriture.)

- Colonnes (noms réels)
- type (enum transport_type) : ex metro, tram, bus (à étendre si besoin)
- ligne (text) : identifiant de ligne affichée dans le select (ex 1, 2, T3a, 26)
- ordre (int) : ordre canonique des stations (>= 1)
- label (text) : nom de station (non vide, longueur bornée)
- Invariants d’intégrité (déjà présents, à conserver)
- Unicité (type, ligne, ordre) : ordre stable par ligne
- Unicité (type, ligne, label) : éviter doublons visibles
- label non vide, longueur max
- ordre > 0

⚠️ Contrats à corriger pour ton nouveau besoin (obligatoire)

Format ligne : la contrainte actuelle impose “numérique (bis/ter)” → incompatible avec T3a/T3b et d’autres codes alphanum.
👉 Il faut assouplir le format (accepter alphanum + suffixes), sinon tu bloques ton roadmap.

Borne ordre <= 50 : plafond actuel potentiellement trop bas (lignes longues, bus avec beaucoup d’arrêts).
👉 Il faut relever (ou retirer) ce plafond.

- Requêtes applicatives
- Filtrer au minimum par type + ligne
- Trier strictement par ordre (ordre canonique)

Seed / évolutivité

Données seedées via migrations SQL (DB-first), pas via dashboard.

Ajout de lignes/stations = nouvelles migrations de seed (append-only idéalement).

Éviter la suppression brutale en prod : si besoin futur, préférer un mécanisme d’archivage (à introduire explicitement si nécessaire).

Couleur de ligne + pictogramme véhicule (obligatoire si tu étends “beaucoup”)
La table stations ne doit pas porter la couleur ou le pictogramme (sinon duplication).
👉 Recommandation DB-first : ajouter un catalogue de lignes (ex: transport_lines) portant :

(type, ligne) unique

color (couleur de ligne)

vehicle_kind (train/tram/bus) pour choisir l’asset

is_active, sort_order, label_display

stations reste la séquence ordonnée; transport_lines porte les métadonnées UI.

---

### 7.2.6 Tests (smoke tests DB à prévoir)

Un compte A ne peut pas lire/écrire les préférences train du compte B (owner-only sur account_preferences).

1 ligne max par compte dans la table préférences (PK = account_id).

Aucun client (anon/auth) ne peut écrire dans stations (RLS : aucune policy d’écriture).

Unicité des stations :

doublon (type, ligne, ordre) rejeté

doublon (type, ligne, label) rejeté

---

### 7.2.7 Gating (décision)

Pas de composant “FeatureGate” générique.
Deux mécanismes seulement :

Preferences (owner-only, DB-authoritative) : on/off + reduced_motion

Entitlements (DB-authoritative) : visitor/demo vs compte normal (et éventuellement plan Stripe)

Règle d’intégrité : si une feature est “non autorisée” par entitlement, elle doit être inaccessible par tous les chemins UI (pas juste “masquée”).

---

## 7.3 TimeTimer (outil local de gestion du temps)

### 7.3.1 Statut : plateforme, pas core

Le TimeTimer est un outil local d’auto-régulation (gestion du temps / transitions) affiché sur /tableau et piloté par l’adulte.
Interdiction absolue : il ne doit jamais modifier ni conditionner :

- le planning visuel
- l’économie de jetons
- le séquençage

Aucune écriture en DB ne doit dépendre du TimeTimer.

---

### 7.3.2 Portée : local device uniquement (pas de DB)

Décision : le TimeTimer ne nécessite pas de persistance serveur.
Les préférences et l’état sont locaux au device (localStorage), non synchronisés entre appareils.

Justification :

- évite la dette DB et les conflits de synchronisation
- réduit la charge cognitive (“ce que je règle ici reste ici”)
- le timer n’est pas une donnée clinique/métier, mais un support contextuel

---

### 7.3.3 Préférences locales (localStorage)

Les préférences TimeTimer sont persistées localement (ex: clés timeTimer\_\*), notamment :

- showTimeTimer (affichage global)
- timeTimer_lastDuration (dernière durée)
- timeTimer_silentMode (mode silencieux)
- timeTimer_vibrate (vibration)
- timeTimer_diskColor (couleur)
- timeTimer_showNumbers (affichage chiffres)
- timeTimer_customDurations (presets personnalisés)
- timeTimer_position (position du flottant)

---

### 7.3.4 Accessibilité & TSA (invariants)

Invariant A — Pas de surprise sensorielle
Le son et la vibration doivent être désactivables facilement et rester persistants.

Invariant B — Reduced stimulation prioritaire
Si une préférence globale “reduced_motion / reduced_stimulation” existe au niveau plateforme, elle doit forcer :

- pas de vibration
- pas d’animation agressive
- et préférentiellement un mode silencieux (ou confirmation explicite)

Invariant C — Contrôle adulte
L’enfant ne doit pas pouvoir “réactiver facilement” des stimuli si l’adulte les a coupés (éviter escalade/frustration).

---

### 7.3.5 Visitor (règle explicite)

Décision : en mode visitor, le TimeTimer est OFF :

- aucune option d’activation affichée
- aucun rendu du timer sur /tableau
- aucune persistance locale créée/évoluée par le visitor

---

### 7.3.6 Upgrade path (si besoin multi-device, plus tard)

Si, plus tard, il devient nécessaire que certaines préférences soient cohérentes cross-device (ex : silentMode, vibrate, defaultDuration, showTimeTimer), alors :

- migrer un sous-ensemble minimal vers account_preferences (DB-authoritative)
- conserver les préférences purement ergonomiques (ex: position) en local

---

## 7.4 Toast (messages de notification non bloquants)

### 7.4.1 Statut / périmètre

Les toasts sont des messages courts et temporaires destinés à fournir un feedback immédiat sur une action (succès, information, avertissement, erreur).

Hors systèmes cœur : planning visuel / économie de jetons / séquençage
→ Les toasts ne doivent jamais devenir un mécanisme métier (pas de “toast = validation d’état produit”).

Ciblage d’usage : principalement l’adulte (parent/éducateur) en contexte de paramétrage, édition, administration, maintenance, synchronisation.

---

### 7.4.2 Objectifs UX (TSA)

- Réduire l’incertitude : confirmer clairement qu’une action a été prise en compte.
- Éviter la surcharge : pas d’empilement, pas de spam, pas de messages ambigus.
- Prévisibilité : messages courts, vocabulaire stable, comportement identique à chaque occurrence.
- Tolérance au stress terrain : l’adulte doit comprendre immédiatement “quoi faire ensuite”.

---

### 7.4.3 Contrat fonctionnel (règles métier)

Types / variants

- info
- success
- warning
- error

Politique d’affichage (invariant produit)

Une préférence toasts_enabled contrôle l’affichage des toasts non critiques.

Si toasts_enabled = false :

les toasts info/success/warning sont supprimés (pas affichés),

les toasts error restent autorisés (les erreurs critiques ne doivent jamais être silencieuses).

Invariant : aucune erreur critique ne doit dépendre d’un toast pour être comprise.
(un toast peut compléter, mais un fallback persistant doit exister : message inline, état d’erreur, bannière, etc.)

Concurrence / rafales

Politique minimale acceptable : 1 toast visible à la fois, un nouveau toast remplace l’ancien.

Limitation assumée : risque de perte d’information en cas de rafale → réserver les toasts aux messages à fort signal.

Durée

Durée par défaut courte (ex. ~2s), avec plancher (ex. 1s) pour garantir la lisibilité.

Les erreurs peuvent avoir une durée supérieure si nécessaire, mais sans bloquer l’UX.

---

### 7.4.4 Modèle de données (DB-authoritative)

Les toasts ne sont pas stockés en base (événements éphémères).
Seule la préférence utilisateur est persistée.

Table recommandée : account_preferences (1 ligne par compte)

account_id (PK, FK)

toasts_enabled boolean not null default true

Invariants DB requis

1 et une seule ligne account_preferences par compte.

La ligne doit exister de manière DB-first (création automatique à la création d’un compte), afin d’éviter un fallback fragile côté client (ex: ?? true).

---

### 7.4.5 Sécurité / RLS

Owner-only strict :

SELECT/INSERT/UPDATE autorisés uniquement sur account_preferences appartenant au compte authentifié.

Interdit : modèle “singleton global partagé” (ex: id=1 lu par tout utilisateur).

---

### 7.4.6 Accessibilité (WCAG / usage réel)

Les toasts doivent être compatibles lecteur d’écran (zone d’annonce / live region côté UI).

Le contenu doit rester compréhensible sans animation (respect reduced_motion).

Les toasts ne doivent pas être le seul vecteur d’information (fallback persistant obligatoire pour les erreurs).

---

### 7.4.7 Non-objectifs (pour éviter la dette)

Pas de “toast history” en DB.

Pas de logique métier déclenchée par la présence/absence d’un toast.

Pas de fusion avec Confettis / Animations : ce sont des préférences distinctes.

---
