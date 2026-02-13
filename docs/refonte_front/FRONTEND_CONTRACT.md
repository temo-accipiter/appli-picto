# FRONTEND_CONTRACT.md — Contrat Frontend (Next.js client) pour backend Supabase DB‑first strict

> **Version** : 3.0 — Corrigée, complétée, auditée (16 lacunes comblées)
> **Date** : 2026-02-12
> **Destinataire** : Claude Code CLI (accès complet repo front + back via terminal VS Code)
> **Sources fermées (unique vérité serveur)** : `ux.md`, `PRODUCT_MODEL.md`, `DB_BLUEPRINT.md`, `MIGRATION_PLAN.md`, `SYNC_CONTRACT.md`, `PLATFORM.md`, `PRODUCT_MODEL_PLATFORM.md`, `DB_BLUEPRINT_PLATFORM.md`, `MIGRATION_PLAN_PLATFORM.md`
> **Migrations SQL** : `supabase/migrations/` (le backend complet est constitué exclusivement de ces fichiers)
> **Règle** : toute information non présente dans ces sources est marquée **NON SPÉCIFIÉ PAR LES SOURCES** (sans supposition).

---

## 0) Contexte d'utilisation (Claude Code CLI)

### 0.1 Environnement

Claude Code CLI a accès via terminal VS Code à :

- Le **frontend existant** (Next.js + TypeScript strict + Sass/SCSS)
- Le **backend complet** dans `supabase/migrations/` (fichiers SQL ordonnés, 41 migrations, 130 smoke tests PASS)
- Ce document comme **unique source contractuelle** pour l'adaptation

### 0.2 Mission

Adapter le frontend existant au nouveau backend Supabase DB-first. Le frontend devient un **client strict** de la DB : il lit ce que la DB autorise, exécute des écritures best-effort, et gère proprement les refus.

### 0.3 Modèle de contrôle d'accès — DB-first (PAS de RBAC)

Le système N'UTILISE PAS de RBAC (Role-Based Access Control) classique. Le contrôle d'accès est **DB-first** basé sur :

- **RLS (Row Level Security)** : policies PostgreSQL sur chaque table, principalement **owner-scoped** (`account_id = auth.uid()` ou via FK)
- **Storage Policies** : policies Supabase Storage owner-only sur le bucket `personal-images`
- **`accounts.status`** (`free` | `subscriber` | `admin`) : utilisé par certaines policies RLS pour le feature gating et le mode `execution-only`
- **Triggers/constraints DB** : quotas, transitions d'état, invariants métier

Le frontend NE DOIT JAMAIS :

- implémenter un système de "rôles" ou de "permissions" côté client
- utiliser `if (user.role === 'subscriber')` comme source de vérité d'autorisation
- considérer `accounts.status` comme un "rôle" — c'est un **statut** qui influence dynamiquement les policies RLS côté serveur

Le frontend DOIT :

- lire `accounts.status` uniquement pour adapter l'**affichage** (ex : masquer bouton "créer carte perso" si `status !== 'subscriber'`)
- déléguer **toute** décision d'autorisation à la DB (tenter l'opération → gérer le refus)
- traiter les refus RLS/contraintes comme le mécanisme normal de contrôle d'accès

### 0.4 Référence migrations

Les migrations dans `supabase/migrations/` suivent un ordre strict. Les phases clés :

| Phase | Contenu                                            | Migrations          |
| ----- | -------------------------------------------------- | ------------------- |
| 1     | Enums + accounts + devices                         | 1-2                 |
| 2     | Child profiles + auto "Mon enfant"                 | 3-5                 |
| 3     | Cards + categories + pivot                         | 6-8                 |
| 4     | Timelines + slots                                  | 9                   |
| 5     | Sessions + validations + snapshot + epoch          | 10-13.5             |
| 6     | Sequences + steps                                  | 14-15               |
| 7     | RLS (20 policies) + execution-only + admin support | 16-22               |
| 8     | Storage policies (7 policies)                      | 23-24               |
| 9     | Quotas + downgrade lock                            | 25-30               |
| 10    | Final hardening                                    | 31+                 |
| P1-P4 | Platform (billing, RGPD, preferences, audit)       | Platform migrations |

---

## 1) Portée & définitions

### 1.1 Statuts fonctionnels

Le frontend DOIT distinguer ces statuts **sans inventer d'états** :

- **Visitor** : état applicatif **local-only**, **n'existe PAS en DB** (pas de `accounts.status='visitor'`). Données persistées en IndexedDB navigateur. Aucune sync cloud.
- **Free** : `accounts.status = 'free'`. Authentifié sans abonnement. Statut par défaut à la création de compte.
- **Subscriber** : `accounts.status = 'subscriber'`. Authentifié avec abonnement Stripe actif (inclut `past_due` côté Stripe = toujours `subscriber` en DB, grace period UX TSA).
- **Admin** : `accounts.status = 'admin'`. Mainteneur. Attribué manuellement (SQL direct), jamais affecté par Stripe. Quotas illimités.

> **Important** : la distinction "adulte/enfant" n'existe pas en DB ; elle est **exclusivement UX** via contextes (ci‑dessous).

### 1.2 Contextes UX (non négociables)

- **Contexte Édition (adulte)** : création/édition/paramètres ; messages système autorisés.
- **Contexte Tableau (enfant)** : exécution ; **aucun** message technique, réseau, quotas, abonnement, erreurs DB.
- **Contexte Administration (Owner/Admin)** : réservé au statut Admin (owner). Non visible dans l'UX standard.

### 1.3 Chargement du Contexte Tableau

**Chargement du Contexte Tableau** = toute entrée "fraîche" dans la Page Tableau qui reconstruit l'écran à partir de l'état courant (local + cloud).

Inclut : navigation vers Tableau, changement de profil actif, relaunch app, retour premier plan, refresh explicite.
Exclut : rester sur Tableau sans quitter.

### 1.4 DB-authoritative vs local-only (liste FERMÉE)

Le frontend DOIT respecter la matrice **fermée** de `SYNC_CONTRACT.md` :

**DB-authoritative (source de vérité cloud)** :

| Donnée                                        | Table(s) DB                          | Mécanisme sync                                   |
| --------------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| Structure timeline (slots, positions, cartes) | `timelines`, `slots`                 | Cloud → local au Chargement Contexte Tableau     |
| État session (state, epoch, timestamps)       | `sessions`                           | Cloud-authoritative ; local = cache              |
| Validations (ensemble slot_id)                | `session_validations`                | Union ensembliste, UNIQUE (session_id, slot_id)  |
| Snapshot progression                          | `sessions.steps_total_snapshot`      | Fixé à 1ère validation, immuable ensuite         |
| Cartes (bank + personal)                      | `cards`                              | Cloud-authoritative                              |
| Catégories + pivot                            | `categories`, `user_card_categories` | Cloud-authoritative                              |
| Profils enfants (name, status)                | `child_profiles`                     | Cloud-authoritative                              |
| Séquences + étapes                            | `sequences`, `sequence_steps`        | Cloud-authoritative                              |
| Quotas mensuels                               | `account_quota_months`               | Cloud-authoritative                              |
| Comptes + devices                             | `accounts`, `devices`                | Cloud-authoritative                              |
| Préférences utilisateur                       | `account_preferences`                | Cloud-authoritative (DB-first, pas localStorage) |

**Local-only (INTERDIT en DB)** :

| Donnée                                                       | Raison                                               |
| ------------------------------------------------------------ | ---------------------------------------------------- |
| État réseau (online/offline)                                 | Observable uniquement côté client                    |
| Queue de synchronisation offline                             | Logique applicative (retry, ordering)                |
| Indicateurs UI anti-choc (bannière "mise à jour disponible") | UX pure, aucun état DB                               |
| Cache local des timelines/cartes/slots                       | Cache = copie temporaire de données DB-authoritative |
| État "fait" des étapes de séquence                           | Visuel, local-only, non sync, reset chaque session   |
| Données Visitor (avant signup)                               | Local-only jusqu'à import explicite                  |
| Focus courant (quelle étape est "active" visuellement)       | État UI éphémère                                     |
| État d'animation / transition visuelle                       | UX TSA, aucun état persistant                        |
| Préférences TimeTimer                                        | Device-only (localStorage), non synchronisées        |
| Profil enfant actif sélectionné                              | État UI local (pas de colonne DB "active_child")     |

**Règle de fermeture** : tout nouveau besoin de persistance/sync NON listé = **INTERDIT** tant qu'il n'est pas formalisé dans les sources.

### 1.5 Terminologie obligatoire

- Le seul terme produit est **« Réinitialisation de session »** (jamais "reset", jamais "redémarrage").

### 1.6 Interdictions DB-first (absolues)

Le frontend NE DOIT JAMAIS :

- utiliser `service_role` côté client ;
- contourner la RLS (ex : "je filtre côté UI") ;
- re‑implémenter des règles critiques (quotas, statuts, droits, transitions, anti-abus timezone, epoch) ;
- implémenter un système de "rôles/permissions" côté client (pas de RBAC) ;
- inventer des champs/tables/états/flows non présents dans les sources ;
- écrire dans des tables "plateforme" non exposées au client (ex : `subscriptions`, `consent_events`, `admin_audit_log`) sauf via Edge Function explicitement prévue ;
- utiliser `session_validations.validated_at` pour quelque logique que ce soit (cette colonne est **audit-only** — interdit : trier par `validated_at`, calculer des durées de session, filtrer des validations "récentes") ;
- ajouter en DB des colonnes de type `last_synced_at`, `synced_from_device_id`, `sync_status`, `offline_queue`, `is_dirty`, `needs_sync`.

Le frontend DOIT :

- lire l'état autorisé par la DB ;
- exécuter des écritures "best effort" ;
- afficher des états UX adaptés et gérer les erreurs DB sans technique côté enfant ;
- considérer les refus RLS comme le mécanisme **normal** de contrôle d'accès, pas comme des erreurs exceptionnelles.

---

## 2) Modèle de navigation & routes

> **Note** : les chemins URL exacts sont **NON SPÉCIFIÉ PAR LES SOURCES**. La matrice décrit des **écrans/flows** (noms fonctionnels).

### 2.1 Matrice des écrans (public vs protégé)

| Écran / route fonctionnelle                        | Public / Protégé | Statuts autorisés                                     | Contexte         | Si non autorisé                                           |
| -------------------------------------------------- | ---------------- | ----------------------------------------------------- | ---------------- | --------------------------------------------------------- |
| Entrée "Visitor / Découverte"                      | Public           | Visitor                                               | Édition (adulte) | —                                                         |
| Auth (signup / login)                              | Public           | Visitor                                               | Édition          | —                                                         |
| **Page Tableau**                                   | Protégé "enfant" | Visitor / Free / Subscriber / Admin                   | Tableau          | Rediriger vers Édition (écran neutre)                     |
| **Page Édition** (composer timelines)              | Protégé "adulte" | Visitor / Free / Subscriber / Admin                   | Édition          | Rediriger vers Tableau ou écran neutre                    |
| Bibliothèque cartes (banque + perso si Subscriber) | Protégé "adulte" | Visitor / Free / Subscriber / Admin\*                 | Édition          | Désactiver actions non permises (voir §3)                 |
| Mode Séquençage (édition d'une séquence)           | Protégé "adulte" | Visitor (local) / Free (lecture) / Subscriber / Admin | Édition          | PersonalizationModal pour Free sans séquences             |
| **Page Profil / Paramètres compte**                | Protégé "adulte" | Free / Subscriber / Admin                             | Édition          | Visitor : interdit (rediriger / proposer création compte) |
| **Page Administration**                            | Protégé "owner"  | Admin                                                 | Administration   | 404/écran neutre (pas d'indice d'existence)               |

\* Visitor/Free peuvent consulter la banque ; la création perso/catégories est interdite (voir §3).

### 2.2 Garde "Protection enfant" (Page Édition)

Les sources explicitent que la protection d'accès à la Page Édition relève du frontend : **aucun** champ DB de type `parental_lock_code` n'existe.
Le mécanisme exact de verrouillage UI est **NON SPÉCIFIÉ PAR LES SOURCES**.

Exigences contractuelles :

- Le frontend DOIT empêcher un enfant d'accéder au Contexte Édition depuis Tableau par inadvertance.
- Le frontend NE DOIT JAMAIS s'appuyer sur `execution-only` comme verrou parental : `execution-only` est un mécanisme serveur de blocage des écritures structurelles (free + profils > limite), pas une protection enfant.

### 2.3 Sélecteur d'enfant actif

Quand il existe plusieurs profils enfants pour un compte, un **profil enfant actif** est toujours défini côté UI.

**Toutes les vues fonctionnent dans le contexte de l'enfant actif** : timelines, sessions, progression.

**Changement d'enfant actif** :

| Ce qui change       | Ce qui NE change PAS                         |
| ------------------- | -------------------------------------------- |
| Timelines affichées | Cartes visibles (partagées au niveau compte) |
| Sessions actives    | Catégories (partagées au niveau compte)      |
| Progression         | Préférences compte                           |

- Le sélecteur est un **filtre de contexte**, pas un changement d'univers ou de données.
- Le profil enfant actif est un **état UI local** (pas de colonne DB `active_child`).
- Changer d'enfant actif puis ouvrir Tableau = **Chargement du Contexte Tableau** (recharge l'état de cet enfant).

---

## 3) Matrice des capacités (actions × statut × contexte)

Conventions :

- ✅ = autorisé
- ❌ = interdit
- **Enforcement** (source de vérité) :
  - **RLS/contraintes/triggers** : bloqué côté DB
  - **Guard offline UX** : bloqué côté frontend (la DB ne sait pas si le client est offline)
  - **Local-only** : uniquement Visitor / état UI local, jamais DB

### 3.1 Contexte Tableau (enfant) — actions

| Action                                               | Visitor    | Free | Subscriber | Admin | Enforcement                                    | Règle UX                         |
| ---------------------------------------------------- | ---------- | ---- | ---------- | ----- | ---------------------------------------------- | -------------------------------- |
| Exécuter une timeline existante                      | ✅         | ✅   | ✅         | ✅    | DB-authoritative (auth) / Local-only (Visitor) | Tableau neutre, stable           |
| Créer session (si aucune active) à l'entrée Tableau  | ✅ (local) | ✅   | ✅         | ✅    | DB (unicité session active) / Local-only       | Invisible enfant                 |
| Valider une étape (checkbox)                         | ✅         | ✅   | ✅         | ✅    | DB (RLS + UNIQUE validations) / Local-only     | Aucun message technique          |
| Progression multi‑appareils (union)                  | N/A        | ✅   | ✅         | ✅    | DB + SYNC_CONTRACT                             | Jamais de régression "en direct" |
| Collecte jetons (si activé)                          | ✅         | ✅   | ✅         | ✅    | Dérivé des validations + slots                 | Respect reduced_motion           |
| Récompense conditionnelle (si jetons + reward)       | ✅         | ✅   | ✅         | ✅    | Dérivé état session                            | Aucun échec / aucun négatif      |
| Voir mini‑timeline de séquence (si présente)         | ✅         | ✅   | ✅         | ✅    | DB (séquence) + local "fait"                   | "fait" = visuel local-only       |
| Modifier structure (slots, cartes, jetons, séquence) | ❌         | ❌   | ❌         | ❌    | UX (interdit en contexte Tableau)              | NE DOIT JAMAIS exister           |

#### 3.1.1 Slots vides — Invisibilité Tableau (INVARIANT TSA)

Un **slot Étape vide** (`card_id = NULL`) est un emplacement valide en Édition, mais en Contexte Tableau :

- Il **n'est JAMAIS affiché** (aucun placeholder, aucun trou visuel)
- Il est **ignoré** lors du calcul de progression et des jetons
- Le Tableau se base **uniquement** sur les slots Étapes contenant une carte (`card_id IS NOT NULL`)
- C'est cohérent avec `steps_total_snapshot` = nombre de slots Étape **non vides** au moment de la première validation

#### 3.1.2 Grille de jetons (Tableau)

La **grille de jetons** est une zone d'affichage Tableau regroupant l'ensemble des jetons à collecter pendant la session :

- Nombre de cases = somme des jetons définis sur les slots Étapes **non vides** de la timeline active
- Si aucun slot n'a de jetons (planning visuel simple) : grille non affichée
- Respecte `reduced_motion` (affichage statique si activé)
- Les jetons sont temporaires, réinitialisés à chaque session, sans valeur cumulative

#### 3.1.3 Session Terminée — consultation Tableau

Quand une session passe à **Terminée** (toutes étapes validées = `steps_total_snapshot` atteint) :

- L'enfant **peut consulter** le Tableau (timeline terminée)
- La **récompense** est débloquée visuellement (si carte récompense présente) ou un feedback de fin est affiché
- L'enfant **ne peut plus valider** d'étapes — lecture seule
- Cet état persiste tant que l'adulte n'a pas déclenché une Réinitialisation de session
- **Aucun négatif** n'est affiché : si pas de carte récompense, feedback neutre/positif de fin (pas "pas de récompense")

#### 3.1.4 Mini-timeline de séquence (Tableau)

- Affichée **sous la carte mère**, sous forme de mini-timeline horizontale
- Accessible via bouton **« Voir étapes »**, visible uniquement quand la carte mère est au focus (étape en cours)
- Scrollable horizontalement, utilisable à une main, sans geste complexe
- Chaque étape est cliquable : cliquer = griser pour indiquer "fait" (état visuel local-only, par `slot_id`)
- **Tap/clic sur l'image ou le nom de la carte mère** = aucune action (ne valide jamais)
- Quand l'enfant valide la carte mère (checkbox), la mini-timeline se **referme automatiquement** via transition douce (< 0.3s)
- L'état "fait" des étapes n'impose aucun ordre, n'a aucune incidence fonctionnelle, et ne valide pas automatiquement la carte mère

### 3.2 Contexte Édition (adulte) — actions core

#### 3.2.1 Planning visuel (timelines / slots)

| Action                                 | Visitor        | Free | Subscriber | Admin | Enforcement                             | Offline (auth)                  |
| -------------------------------------- | -------------- | ---- | ---------- | ----- | --------------------------------------- | ------------------------------- |
| Créer / éditer timeline                | ✅ (local)     | ✅   | ✅         | ✅    | DB (auth) / Local-only                  | **Interdit offline** (guard UX) |
| Ajouter/supprimer/réordonner slots     | ✅ (local)     | ✅   | ✅         | ✅    | DB / Local-only                         | **Interdit offline** (guard UX) |
| Assigner/retirer une carte à un slot   | ✅ (local)     | ✅   | ✅         | ✅    | DB / Local-only                         | **Interdit offline** (guard UX) |
| Modifier jetons d'un slot Étape (0..5) | ✅ (local)     | ✅   | ✅         | ✅    | DB (CHECK 0..5, kind=step) / Local-only | **Interdit offline** (guard UX) |
| Vider la timeline                      | ✅ (local)     | ✅   | ✅         | ✅    | DB / Local-only                         | **Interdit offline** (guard UX) |
| Nombre de timelines                    | ∞ tous statuts | ∞    | ∞          | ∞     | Intentionnel (pas de limite)            | —                               |

**Vider la timeline** (action distincte de « Réinitialisation de session ») :

- Retire toutes les cartes des slots Étapes + carte Récompense
- Remet la structure à l'état de base : **1 slot Étape vide + 1 slot Récompense vide**
- Si session active → **Réinitialisation de session automatique** (epoch++)
- « Vider » = modifie la **structure** ≠ « Réinitialiser » = remet à zéro la **progression** sans toucher la structure

**Timelines multiples par profil enfant** : la DB autorise 0..n timelines par profil (`child_profiles` → `timelines`). L'UX originale (ux.md) présente une seule timeline active par enfant. Le comportement exact (sélection d'une timeline parmi plusieurs, templates, brouillons) est **NON SPÉCIFIÉ PAR LES SOURCES** au-delà de l'autorisation structurelle.

**Compactage / Reflow** (règles de réorganisation visuelle) :

- **Vider un slot** (retirer la carte) : le slot devient vide, **reste visible** en Édition, reste un emplacement valide
- **Supprimer un slot** (action structurelle) : supprime l'emplacement lui-même (il disparaît) et déclenche reflow
- Le compactage ne supprime **jamais** un slot implicitement — un slot n'est supprimé que par action explicite
- Après suppression/compactage : les éléments restants se repositionnent naturellement, aucun trou visuel, aucun placeholder
- **Invariant** : une timeline conserve **au minimum 1 slot Étape** (le dernier slot Étape ne peut pas être supprimé)
- Ce comportement est identique : dans la bibliothèque de cartes, dans les timelines, dans les séquences

#### 3.2.2 Sessions (réinitialisation) & anti‑choc

| Action                                                     | Visitor    | Free | Subscriber | Admin | Enforcement                      | Contrainte TSA                                |
| ---------------------------------------------------------- | ---------- | ---- | ---------- | ----- | -------------------------------- | --------------------------------------------- |
| Réinitialisation de session (epoch++)                      | ✅ (local) | ✅\* | ✅         | ✅    | DB (epoch monotone) / Local-only | S'applique au **prochain Chargement Tableau** |
| Appliquer changements structurants "en direct" sur Tableau | ❌         | ❌   | ❌         | ❌    | Interdit (anti‑choc)             | NE DOIT JAMAIS arriver                        |

\* **Free en mode execution-only** : la DB refuse les écritures structurelles. Le frontend DOIT traiter ce refus et afficher l'état "lecture seule / exécution uniquement" en Édition. Condition : `accounts.status = 'free'` ET le compte possède plus de profils enfants que la limite free (détecté par `is_execution_only()` côté DB).

#### 3.2.2bis Matrice de verrouillage pendant session active (ÉDITION)

Le frontend DOIT activer/désactiver les actions d'édition de timeline **en fonction de l'état de la session active** pour ce profil enfant :

**a) Aucune session active ou session Terminée** :

Timeline entièrement éditable (toutes actions autorisées).

**b) Session Active (Prévisualisation — 0 validation)** :

| Élément                    | Autorisé ?             |
| -------------------------- | ---------------------- |
| Modifier cartes dans slots | ✅                     |
| Modifier ordre slots       | ✅                     |
| Ajouter/supprimer slots    | ✅ (sauf dernier Step) |
| Modifier jetons            | ✅                     |

**c) Session Active (Démarrée — ≥1 validation)** :

| Élément               | Slot validé | Slot non validé        |
| --------------------- | ----------- | ---------------------- |
| Déplacer              | ❌          | ✅                     |
| Supprimer             | ❌          | ✅ (sauf dernier Step) |
| Modifier jetons       | ❌          | ❌\*                   |
| Vider (retirer carte) | ❌          | ✅                     |

\* Exception : peut ajouter un **nouveau** slot avec jetons au moment de l'ajout.

**Règle de focus après suppression de slot** : si le slot supprimé est **au focus** (non validé) pendant une session active, le focus bascule automatiquement vers la **prochaine étape non validée** disponible. Aucun état corrompu ou écran vide côté enfant (protection TSA).

**Suppression de carte depuis la bibliothèque** : si la carte est utilisée dans la timeline d'un profil ayant une session active :

- La suppression est une **action structurante**
- Elle déclenche automatiquement une **Réinitialisation de session** (epoch++)
- Le changement s'applique au **prochain Chargement du Contexte Tableau** (anti-choc)
- Modal de confirmation requis — wording contractuel : _« Cette carte est actuellement utilisée. La supprimer la retirera de tous ses usages. »_

#### 3.2.3 Cartes personnelles & catégories (gating + quotas)

| Action                                                | Visitor    | Free | Subscriber | Admin | Enforcement                       | UX (Édition uniquement)                                                      |
| ----------------------------------------------------- | ---------- | ---- | ---------- | ----- | --------------------------------- | ---------------------------------------------------------------------------- |
| Lire banque de cartes (published)                     | ✅         | ✅   | ✅         | ✅    | RLS (read)                        | Images via bucket `bank-images` (public/auth)                                |
| Créer carte personnelle                               | ❌         | ❌   | ✅         | ✅    | DB (feature gating + quotas)      | Messages explicites (pas Tableau)                                            |
| Supprimer carte personnelle                           | ❌         | ❌   | ✅         | ✅    | DB + cascades                     | Confirmation si utilisée — voir §3.2.2bis. Libère quota stock immédiatement. |
| CRUD catégories                                       | ❌         | ❌   | ✅         | ✅    | DB (feature gating)               | Édition only                                                                 |
| Supprimer catégorie custom                            | ❌         | ❌   | ✅         | ✅    | DB (trigger remap)                | Cartes réassignées à "Sans catégorie" automatiquement par DB                 |
| Supprimer catégorie "Sans catégorie" (is_system)      | ❌         | ❌   | ❌         | ❌    | DB (RLS + is_system check)        | Bouton invisible ou désactivé                                                |
| Assigner catégorie via pivot                          | ❌         | ❌   | ✅         | ✅    | DB (pivot)                        | Édition only                                                                 |
| Utiliser carte banque dépubliée dans usages existants | ✅         | ✅   | ✅         | ✅    | DB autorise références existantes | Dépublication bloque "nouveaux usages" uniquement                            |
| Décocher carte dans bibliothèque (édition timeline)   | ✅ (local) | ✅   | ✅         | ✅    | Front (pas contrainte DB)         | Voir règle ci-dessous                                                        |

**Décocher une carte dans la bibliothèque** :

- Action "présent/absent" simple dans le contexte d'édition d'une timeline
- **Retire TOUTES les occurrences** de `card_id` dans tous les slots de la timeline active
- Reflow automatique (compactage sans trou visuel)
- Pas de contrainte DB d'unicité : le schéma reste permissif (une carte peut apparaître plusieurs fois). C'est une **règle de comportement front**.

**Quotas cartes personnelles (Subscriber)** :

| Quota                        | Valeur                   | Mécanisme DB                                                    |
| ---------------------------- | ------------------------ | --------------------------------------------------------------- |
| Stock max total              | 50                       | Trigger BEFORE INSERT `check_can_create_personal_card`          |
| Mensuel max (créations/mois) | 100                      | Même trigger + `account_quota_months` (timezone figée par mois) |
| Modifier carte existante     | Ne consomme PAS de quota | —                                                               |
| Supprimer puis recréer       | Consomme quota mensuel   | —                                                               |

**Anti-abus timezone** : la DB verrouille une "timezone de référence" par mois de quota (`account_quota_months.tz_ref`). Un changement de timezone en cours de mois n'affecte jamais le quota du mois courant. Le front NE DOIT PAS tenter de contourner cette règle.

#### 3.2.4 Profils enfants & appareils

| Action                  | Visitor                | Free              | Subscriber        | Admin             | Enforcement                                    | UX                                                       |
| ----------------------- | ---------------------- | ----------------- | ----------------- | ----------------- | ---------------------------------------------- | -------------------------------------------------------- |
| Créer profil enfant     | ❌ (1 local implicite) | ✅ (≤1)           | ✅ (≤3)           | ✅ (∞)            | DB (trigger quota)                             | Message : « Nombre maximum de profils enfants atteint. » |
| Supprimer profil enfant | N/A                    | ✅ (si >1 profil) | ✅ (si >1 profil) | ✅ (si >1 profil) | DB (trigger min 1 profil)                      | Voir §8.6 — modal confirmation irréversible, adulte-only |
| Enregistrer un device   | N/A (mono‑appareil)    | ✅ (≤1)           | ✅ (≤3)           | ✅ (∞)            | DB (trigger quota actifs `revoked_at IS NULL`) | Message : « Nombre maximum d'appareils atteint. »        |
| Révoquer un device      | N/A                    | ✅                | ✅                | ✅                | DB (UPDATE `revoked_at`, pas de DELETE)        | Non-destructif — données conservées                      |

**Profil auto "Mon enfant"** : à la création de compte, un trigger DB crée automatiquement un profil enfant nommé "Mon enfant". Le front NE DOIT PAS créer ce profil manuellement — il apparaît automatiquement après signup.

**Catégorie auto "Sans catégorie"** : à la création de compte, un trigger DB crée automatiquement une catégorie `is_system=TRUE` nommée "Sans catégorie". Le front NE DOIT PAS la créer, la modifier, ni la supprimer.

#### 3.2.5 Séquençage

| Action                                               | Visitor    | Free | Subscriber | Admin | Enforcement                             | Points critiques                                |
| ---------------------------------------------------- | ---------- | ---- | ---------- | ----- | --------------------------------------- | ----------------------------------------------- |
| Créer/éditer une séquence (≥2 étapes, sans doublons) | ✅ (local) | ❌   | ✅         | ✅    | DB (contraintes) / Local-only (Visitor) | UI DEVRAIT anticiper (minimum 2, no duplicates) |
| Afficher mini‑timeline Tableau                       | ✅         | ✅   | ✅         | ✅    | DB (séquence)                           | État "fait" = local-only par `slot_id`          |
| Validation carte mère via checkbox                   | ✅         | ✅   | ✅         | ✅    | DB (validation slot)                    | Tap sur image/nom = aucune action               |

> **Clarification Visitor** : Visitor PEUT composer des séquences localement (PRODUCT_MODEL.md Ch.8.2). Ces séquences sont importées lors du passage Visitor → Compte.

### 3.3 Contexte Administration (owner)

| Action admin (plateforme)                                     | Admin | Enforcement                            | Interdictions                                                                                                  |
| ------------------------------------------------------------- | ----- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Accéder à Page Administration                                 | ✅    | RLS/guards                             | NE DOIT PAS divulguer l'existence aux non-admin                                                                |
| Gestion banque de cartes (création/publication/dépublication) | ✅    | DB (RLS admin write)                   | Interdit : suppression banque si référencée                                                                    |
| Audit / logs (plateforme)                                     | ✅    | DB (append-only, `admin_audit_log`)    | Interdit : UPDATE/DELETE sur logs                                                                              |
| Support ciblé                                                 | ✅    | DB (fonction `admin_support_channel`)  | **Interdit** : accès global `accounts` (RLS = `id = auth.uid()` uniquement, admin utilise une fonction dédiée) |
| Resync subscription Stripe                                    | ✅    | Edge Function dédiée + audit           | Pas de "set account status manual"                                                                             |
| Request account deletion                                      | ✅    | Edge Function `delete-account` + audit | Via flux standard, pas de DELETE SQL direct                                                                    |
| Accès images personnelles                                     | ❌    | Storage policies + contrat             | **Admin ne voit JAMAIS images personnelles**                                                                   |
| Lecture données produit enfant (cards perso, séquences)       | ❌    | RLS owner-only                         | **Interdit même pour support**                                                                                 |

---

## 4) Contrat Sync / Offline / Cache

### 4.1 Source de vérité (liste fermée)

Voir §1.4 pour la matrice complète. Le frontend DOIT implémenter strictement cette matrice.

### 4.2 Fusion multi‑appareils (auth uniquement)

Le frontend DOIT :

- appliquer la **fusion monotone** des validations (union ensembliste des `slot_id` validés) ;
- traiter la **réinitialisation** comme exception via **epoch** ;
- considérer **obsolète** toute progression locale dont `epoch_local < epoch_DB` ;
- ne jamais faire régresser visuellement l'enfant ;
- NE JAMAIS utiliser `session_validations.validated_at` pour la logique de fusion (audit-only).

### 4.3 Règle anti‑choc (structurant)

Toute modification structurante (édition timeline, changements jetons, réinitialisation epoch++) DOIT :

- être appliquée **uniquement** au prochain **Chargement du Contexte Tableau** ;
- ne JAMAIS "réarranger" un Tableau déjà affiché.

| Situation                                                    | Comportement correct                                                | CE QUI NE DOIT JAMAIS ARRIVER                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------- |
| Adulte modifie timeline pendant que l'enfant est sur Tableau | Enfant continue sur état actuel, changements au prochain chargement | Timeline qui se "réarrange" en direct               |
| Reset session (epoch++) pendant exécution enfant             | Enfant continue, écrasement au prochain chargement                  | Progression qui disparaît en direct                 |
| Sync multi-appareils apporte nouvelles validations           | Progression peut augmenter (fusion monotone)                        | Étapes qui se "décochent"                           |
| Appareil revient online avec epoch obsolète                  | Réalignement au prochain chargement                                 | Popup "votre progression a été écrasée" côté enfant |

### 4.4 Offline (utilisateurs authentifiés)

**Autorisé offline** : exécuter timeline existante, continuer session entamée, valider étapes (avec queue locale), pause/reprise, basculer profil/activité sans modification structurelle.

**Interdit offline (strict)** : CRUD cartes, CRUD catégories, créer/modifier timeline, réorganiser slots, modifier jetons, réinitialiser session, créer profil enfant.

Enforcement : **guard UX** (désactivation) + toast **« Indisponible hors connexion »** en Contexte Édition uniquement.

**Visitor** : non concerné par ces contraintes réseau (il est structurellement local-only), peut composer/exécuter.

#### 4.4.1 Indicateur offline persistant (Édition)

L'état offline DOIT être **explicitement signalé** à l'adulte en Contexte Édition, au-delà du toast éphémère :

- Un **bandeau discret et persistant** (non modal, non bloquant) DOIT indiquer l'état offline tant que la connexion n'est pas restaurée.
- Le toast « Indisponible hors connexion » (éphémère, ~2s) ne suffit pas seul : l'adulte pourrait ne pas le voir et tenter des actions structurelles.
- Ce bandeau disparaît automatiquement au retour de la connexion (sync automatique).
- **Aucun modal bloquant** ne doit être utilisé pour indiquer l'état offline.
- **Contexte Tableau** : aucun indicateur offline (invariant TSA — l'enfant ne doit jamais voir d'information réseau).

### 4.5 Progression Tableau — utilisation du snapshot

Le frontend DOIT utiliser `sessions.steps_total_snapshot` pour calculer la progression en Contexte Tableau (pas un recomptage live des slots step non-vides). Ce snapshot est figé à la première validation et ne change jamais, même si l'adulte ajoute/retire des slots après le démarrage. C'est un invariant de prévisibilité TSA.

---

## 5) Contrat Supabase côté client (patterns autorisés)

### 5.1 Auth & clé Supabase

Le frontend DOIT :

- utiliser uniquement la clé **anon** + session utilisateur ;
- considérer la RLS comme unique source de vérité des autorisations ;
- traiter `accounts.status` comme l'unique indicateur d'accès plan (pas de lecture billing).

Le frontend NE DOIT JAMAIS :

- lire/écrire avec `service_role` ;
- appeler des fonctions/endpoints nécessitant `service_role` directement depuis le client ;
- accéder à `subscriptions` (non exposée ; RLS admin/service-role only) ;
- accéder à `consent_events` en écriture (service_role only via Edge Function `log-consent`).

### 5.2 Familles de requêtes (lecture/écriture)

#### 5.2.1 Accounts / statut / timezone / devices

- **Lecture** : compte courant (status, timezone) + devices (owner-only via RLS).
- **Écriture** : enregistrement device (soumis quota DB, trigger BEFORE INSERT). Le front DOIT accepter qu'un nouvel appareil soit refusé par la DB (quota devices actifs).
- **Statut immutable par le client** : `accounts.status` est modifié uniquement par triggers DB (billing) ou SQL admin. Le client ne peut PAS UPDATE `accounts.status` (RLS WITH CHECK).
- **Timezone** : modifiable par le propriétaire. Un changement de timezone en cours de mois n'affecte pas le quota du mois courant (anti-abus DB).

**Lifecycle device complet** :

| Étape          | Mécanisme                                                | Détails                                                                                                                                                         |
| -------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Création       | `INSERT devices`                                         | Premier usage sur un appareil. Soumis au quota (Free ≤1, Subscriber ≤3, Admin ∞). Seuls les devices actifs (`revoked_at IS NULL`) comptent pour le quota.       |
| Révocation     | `UPDATE devices SET revoked_at = NOW()`                  | Action manuelle depuis Page Profil adulte. Non-destructif : le device n'est JAMAIS supprimé (`DELETE` interdit par RLS). Les données associées sont conservées. |
| Comptage quota | `COUNT(*) WHERE account_id = :id AND revoked_at IS NULL` | Uniquement les devices actifs.                                                                                                                                  |
| Réactivation   | **NON SPÉCIFIÉ PAR LES SOURCES**                         | Ne pas implémenter sans spécification.                                                                                                                          |
| Suppression    | ❌ **Interdit**                                          | RLS empêche DELETE sur `devices`. Jamais de suppression, même par l'utilisateur.                                                                                |

Le frontend DOIT exposer la gestion des devices dans la **Page Profil adulte** :

- Liste des devices avec état (actif / révoqué)
- Action de révocation (avec confirmation)
- Message de quota si limite atteinte lors d'un nouvel enregistrement

#### 5.2.2 Profils enfants

- **Lecture** : profils du compte (incluant `status` active/locked).
- **Création** : soumise quota DB (Free=1, Subscriber=3, Admin=∞). Le trigger compte **tous** les profils (y compris `locked`).
- **Suppression** : autorisée (RLS owner) SAUF le dernier profil (trigger DB empêche). Voir §8.6.
- **Auto-création** : trigger DB crée "Mon enfant" à la création du compte — le front ne le fait pas.
- **Downgrade** : profils excédentaires deviennent progressivement `locked` (trigger AFTER UPDATE sur `sessions` quand state → `completed`). Profils verrouillés = lecture seule (RLS empêche UPDATE/DELETE).
- **Upgrade** : profils `locked` repassent `active` automatiquement (trigger DB lors de `accounts.status` → `subscriber`).

#### 5.2.3 Cartes (banque + perso)

- **Banque** : lecture publique/auth autorisée ; images dans bucket `bank-images` (lecture autorisée par Storage policies pour auth/anon). Écriture **Admin uniquement**.
- **Perso** : création/édition/suppression **Subscriber/Admin** uniquement. Images dans bucket `personal-images/{account_id}/cards/{card_id}.jpg` (owner-only Storage policy).
- **Carte dépubliée** : reste utilisable dans des usages existants ; la dépublication bloque uniquement les nouveaux usages (`slots.card_id` peut référencer une carte `published=FALSE`).
- **Image immutable (personal)** : la colonne `cards.image_url` ne peut pas être modifiée après création pour les cartes perso (RLS). Pour changer l'image : supprimer + recréer.
- **Suppression carte personnelle avec session active** : voir §3.2.2bis pour les effets cascade (Réinitialisation de session + modal confirmation).

#### 5.2.4 Catégories & pivot

- CRUD catégories : Subscriber/Admin uniquement (RLS owner-only).
- Catégorie "Sans catégorie" (`is_system=TRUE`) : créée automatiquement par trigger DB. Interdiction UPDATE/DELETE via RLS (`is_system=FALSE` required).
- Suppression catégorie custom : trigger DB réassigne les cartes à "Sans catégorie".
- Affectation : via pivot `user_card_categories`, UNIQUE `(user_id, card_id)`.

#### 5.2.5 Timelines / slots (structure planning)

- CRUD timeline/slots : autorisé en Édition (selon statut et offline guard).
- Slots : `card_id` peut être NULL (slot vide) ; l'UX de "plus de slot vide" est **gérée côté front** (DB n'enforce pas).
- Nombre de timelines : **jamais limité** quel que soit le statut (intentionnel : éviter frustration TSA).

#### 5.2.6 Sessions / validations / epoch

La DB impose :

- unicité "1 session active" par (profil, timeline) — partial UNIQUE index sur state IN ('active_preview', 'active_started')
- epoch monotone (UPDATE epoch décroissant → rejeté)
- validations idempotentes (UNIQUE session_id + slot_id)
- `steps_total_snapshot` figé à la première validation
- transitions d'état strictes : `active_preview` → `active_started` (1ère validation) → `completed` (dernière validation = snapshot atteint)
- session `completed` = **lecture seule** (RLS empêche toute écriture)
- validation sur slot `kind=reward` → rejetée
- validation sur slot `card_id=NULL` (step vide) → rejetée
- validation sur slot d'une autre timeline → rejetée

Le front DOIT utiliser le snapshot pour la progression Tableau (pas de recomptage "live").

#### 5.2.7 Séquences

- CRUD séquences : Subscriber/Admin uniquement (RLS owner-only).
- Contraintes DB : minimum 2 étapes, pas de doublons (`UNIQUE (sequence_id, step_card_id)`).
- 0..1 séquence par carte par compte (`UNIQUE (account_id, mother_card_id)`).
- Ownership : les cartes perso dans une séquence doivent appartenir au même `account_id` (trigger vérifie).

### 5.3 Storage (images)

Le frontend DOIT utiliser ces buckets :

| Bucket            | Chemin                                        | Accès                    | Usage                               |
| ----------------- | --------------------------------------------- | ------------------------ | ----------------------------------- |
| `personal-images` | `{account_id}/cards/{card_id}.jpg`            | Owner-only (RLS Storage) | Images cartes personnelles          |
| `personal-images` | `{account_id}/avatars/{child_profile_id}.jpg` | Owner-only (RLS Storage) | Avatars profils enfants             |
| `bank-images`     | NON SPÉCIFIÉ PAR LES SOURCES (chemin exact)   | Lecture auth/anon        | Images cartes banque (admin upload) |

Le frontend NE DOIT JAMAIS :

- exposer un écran admin permettant de parcourir des images personnelles ;
- supposer qu'un upload sans policy est acceptable ;
- tenter d'accéder à `personal-images` d'un autre compte (Storage policy → refusé).

---

## 6) Gestion des erreurs & états UI

### 6.1 Taxonomie (catégories contractuelles)

Le frontend DOIT gérer au minimum ces catégories :

| #   | Catégorie                                | Exemples                                                     | Contexte Édition                                             | Contexte Tableau                       |
| --- | ---------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------- |
| 1   | **Refus RLS / permission denied**        | Écriture ou lecture interdite                                | Message explicite non technique                              | Écran **neutre** (aucune mention)      |
| 2   | **Violation contrainte CHECK/UNIQUE/FK** | Doublon, valeur hors range                                   | Inline error state                                           | Jamais affiché                         |
| 3   | **Quota/feature gating**                 | Création cartes perso, limites profils/devices               | PersonalizationModal ou message explicite                    | Jamais affiché                         |
| 4   | **Offline (auth)**                       | Action structurelle offline                                  | Désactivation + toast + **bandeau persistant** (voir §4.4.1) | Aucun indicateur                       |
| 5   | **Conflit epoch / état obsolète**        | Retour online avec epoch ancien                              | Réalignement silencieux au prochain chargement               | Aucun message, fusion monotone         |
| 6   | **Storage refusé**                       | Policy bucket, quota storage                                 | Message explicite                                            | Jamais affiché                         |
| 7   | **Timeout / erreurs réseau**             | Online instable                                              | Toast ou inline error                                        | Écran neutre, aucune mention technique |
| 8   | **Execution-only refusé**                | Free + profils excédentaires tente une écriture structurelle | Message « exécution uniquement » ou équivalent               | Jamais affiché                         |

### 6.2 Règle d'or Contexte Tableau (enfant)

Le frontend NE DOIT JAMAIS afficher dans le Contexte Tableau :

- erreurs DB, codes SQL, messages techniques
- états réseau (offline, synchronisation en cours/terminée)
- messages de conflit ou de fusion
- quotas, paywall, abonnement
- indicateurs de chargement liés à la synchronisation

En cas d'impossibilité d'afficher l'état (ex : chargement cloud indisponible), le frontend DOIT afficher un écran **neutre** sans mention technique, et permettre un retour vers Édition via adulte.

Le Contexte Tableau reste **émotionnellement neutre**.

### 6.3 Contexte Édition (adulte)

Le frontend DOIT :

- afficher des messages explicites **non techniques** quand une action est bloquée (quota/feature gating) ;
- désactiver les actions interdites offline et afficher le toast « Indisponible hors connexion » + **bandeau persistant** (§4.4.1) ;
- supporter les erreurs DB en "inline state" (pas uniquement de toasts, car `toasts_enabled` peut être false) ;
- ne JAMAIS afficher de message culpabilisant, de modal bloquante sans échappatoire, ni d'obligation de s'abonner pour continuer à utiliser l'existant.

### 6.4 Messages UX verrouillés (contractuels)

Le frontend DOIT utiliser ces messages (Édition uniquement) :

**PersonalizationModal — Visitor** :

> « Pour créer tes propres tâches et catégories, crée un compte et abonne-toi. »
> Boutons : « Créer un compte » | « Plus tard »

**PersonalizationModal — Free** :

> « Ton compte gratuit te permet de sauvegarder tes plannings. Pour créer tes propres tâches et catégories, passe à la version Premium. »
> Boutons : « Passer Premium » | « Plus tard »

**Offline (toast)** : « Indisponible hors connexion »

**Quota profils** : « Nombre maximum de profils enfants atteint. »

**Quota devices** : « Nombre maximum d'appareils atteint. »

**Suppression carte utilisée** : « Cette carte est actuellement utilisée. La supprimer la retirera de tous ses usages. »

---

## 7) Mode Visitor

### 7.1 Données locales (liste fermée)

Le Visitor DOIT être implémenté comme **local-only** :

- profil enfant local implicite unique
- timelines/slots locales
- sessions + progression locales
- séquences + étapes locales
- accès lecture banque de cartes (published) via Supabase

Le Visitor NE DOIT PAS :

- accéder à la Page Profil
- créer cartes personnelles
- créer catégories
- accéder aux préférences DB (`account_preferences` n'existe pas pour Visitor)
- activer le TimeTimer (OFF pour Visitor, aucune option d'activation affichée)

### 7.2 Limitations structurelles

- Visitor = **mono‑appareil** (structurel, pas quota).
- Visitor n'est pas soumis aux contraintes "offline réseau" (il est déjà local-only).
- Visitor voit la TrainProgressBar mais ligne forcée à metro/1 (pas de changement possible).

### 7.3 Import Visitor → Compte

#### Déclencheur

- Visitor crée un compte sur le **même appareil**.
- Import DOIT être **explicite** (choix utilisateur, pas automatique).

#### Périmètre import (liste fermée)

- Timelines (structure)
- Sessions + progression
- Séquences + étapes
- Mapping catégories

#### Mécanisme device_id

Lors de l'import, le `device_id` local du Visitor devient le premier device enregistré du nouveau compte : `INSERT devices` avec `device_id` existant + nouveau `account_id`.

#### Cartes banque dépubliées

Si une donnée Visitor utilise une carte banque dépubliée : elle reste utilisable dans les usages importés.

#### Échecs import

Le comportement détaillé en cas d'échec est **NON SPÉCIFIÉ PAR LES SOURCES**.
Exigence minimale : l'UI DOIT éviter toute perte silencieuse ; elle DOIT proposer une reprise ou un abandon explicite (sans message technique côté enfant).

---

## 8) Plateforme (fonctionnalités exposées par le front)

### 8.1 Préférences utilisateur (`account_preferences`)

**Table DB** : `account_preferences` (1 ligne par compte, créée automatiquement par trigger AFTER INSERT sur `accounts`).

Le frontend DOIT :

- lire/écrire `account_preferences` via RLS self‑only ;
- ne jamais "inventer" une valeur par défaut si la ligne est absente (la DB la crée automatiquement) ;
- considérer `account_preferences` comme DB-authoritative (pas localStorage).

**Préférences V1 (liste fermée)** :

| Préférence         | Défaut  | Rôle                             | Invariant                                                                                    |
| ------------------ | ------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| `reduced_motion`   | `true`  | Réduire charge sensorielle (TSA) | Si `true`, toutes animations non essentielles désactivées (confettis inclus)                 |
| `toasts_enabled`   | `true`  | Feedback adulte non bloquant     | Si `false`, toasts info/success/warning supprimés. Erreurs critiques ont un fallback inline. |
| `confetti_enabled` | `false` | Renforcement visuel ponctuel     | Affiché uniquement si `confetti_enabled = true` ET `reduced_motion = false`                  |

**Préférences locales (device-only, hors DB)** : TimeTimer (showTimeTimer, lastDuration, silentMode, vibrate, diskColor, showNumbers, customDurations, position).

### 8.2 RGPD / consentement (bannière cookies)

**Règles contractuelles :**

- La bannière de consentement est **adulte-only** et **JAMAIS** en Contexte Tableau.
- Le log de consentement passe par Edge Function `log-consent` (service_role côté serveur). Le client NE DOIT PAS écrire directement dans `consent_events`.
- **Catégories de traceurs** : nécessaire (pas de consentement requis) et analytics (consentement requis).
- **Symétrie CNIL** : "Refuser" DOIT être aussi simple que "Accepter" (pas de dark pattern).
- **GA4** : NE DOIT PAS être chargé tant que `choices.analytics !== true`.
- **Préférences utilisateur** (`account_preferences`) : classifiées "strictement nécessaire" (pas de consentement requis).
- Toute action RGPD (suppression, export, modification consentement) = flux adulte uniquement.

**Modification ultérieure du consentement** : un lien « Préférences cookies » (ex : footer ou Page Profil) DOIT permettre à l'adulte de modifier son consentement à tout moment (conformité CNIL — droit au retrait). Ce flux produit un event avec `action: 'update'` ou `action: 'revoke'`.

**Appel Edge Function `log-consent`** :

- Auth : anon key + optionnel JWT
- Payload complet :

```json
{
  "mode": "accept_all | refuse_all | custom",
  "action": "first_load | update | withdraw | restore | revoke",
  "choices": { "analytics": true | false },
  "ua": "navigator.userAgent",
  "locale": "navigator.language",
  "app_version": "x.y.z",
  "origin": "window.location.origin",
  "ts_client": "ISO 8601 (informatif, non authoritative)"
}
```

- L'IP hash est ajoutée **côté serveur** — le front NE DOIT PAS envoyer d'adresse IP brute.

**⚠️ Correction bug legacy (obligatoire)** :

Le composant `CookieBanner.tsx` existant envoie `action: 'accept_all'` / `action: 'refuse_all'`. Ces valeurs sont en réalité des valeurs de **`mode`**, pas de **`action`**.

Correction requise :

| Ancien code (INCORRECT) | Code corrigé                               |
| ----------------------- | ------------------------------------------ |
| `action: 'accept_all'`  | `mode: 'accept_all', action: 'first_load'` |
| `action: 'refuse_all'`  | `mode: 'refuse_all', action: 'first_load'` |

**Valeurs autorisées de `action`** (liste fermée) : `first_load` (premier choix après chargement), `update` (modification ultérieure), `withdraw` (retrait d'un consentement spécifique), `restore` (restauration d'un consentement), `revoke` (révocation complète).

**Valeurs autorisées de `mode`** (liste fermée) : `accept_all`, `refuse_all`, `custom`.

### 8.3 Abonnement / Stripe

- Le client se base sur `accounts.status` pour l'accès (free/subscriber/admin).
- Le client NE DOIT PAS lire `subscriptions` (non exposée ; RLS service-role/admin only).
- `past_due` Stripe = toujours `subscriber` en DB (grace period, UX TSA).
- Pas de période d'essai (trial) — le plan free suffit pour évaluer l'app.

**Edge Function `create-checkout-session`** :

- Auth : JWT utilisateur
- Comportement :
  - Si abonnement actif → crée une session Billing Portal Stripe → retourne URL portal
  - Si pas d'abonnement → crée une session Checkout Stripe → retourne URL checkout
- Le front redirige l'utilisateur vers l'URL retournée
- Codes promo Stripe activés (`allow_promotion_codes: true`)
- Après retour de Stripe, le webhook met à jour `subscriptions` → trigger DB met à jour `accounts.status`

### 8.4 Suppression de compte (flux complet)

**Contexte** : Page Profil adulte, bouton "Supprimer mon compte". Action la plus destructive — irréversible.

**Séquence front** :

1. **Modal de confirmation** :
   - Afficher avertissement irréversibilité
   - Proposer "Télécharger mes données avant" (lien export RGPD — futur, pas Phase 11)
   - Demander saisie de confirmation (ex : taper "SUPPRIMER")
   - Résoudre challenge **Turnstile** (anti-bot)
   - Envoyer POST à Edge Function `delete-account` (JWT + turnstile token)

2. **Post-suppression** (si 200 OK) :
   - Afficher toast "Compte supprimé"
   - Logout (`signOut`)
   - Rediriger vers page d'accueil / signup

**Edge Function `delete-account`** (côté serveur, pour référence front) :

- Vérifie Turnstile côté serveur
- Vérifie JWT — extrait `account_id` (jamais passé en paramètre — sécurité)
- Annule abonnement Stripe immédiatement (best-effort)
- Purge images Storage (best-effort)
- Supprime `auth.users` → CASCADE DB supprime tout le graphe
- Logger dans `subscription_logs`

**Invariants front** :

- Le front NE DOIT PAS afficher ce flux en Contexte Tableau
- Le front NE DOIT PAS envoyer de `account_id` à l'Edge Function (JWT suffit)
- Si l'Edge Function échoue, le front DOIT afficher une erreur explicite (pas de perte silencieuse)

**Cascade DB** (pour compréhension — géré côté serveur) :

```
auth.users DELETE
  └→ accounts CASCADE
       ├→ child_profiles CASCADE → timelines → slots → sessions → session_validations
       ├→ cards CASCADE
       ├→ categories CASCADE
       ├→ user_card_categories CASCADE
       ├→ devices CASCADE
       ├→ sequences → sequence_steps CASCADE
       └→ account_preferences CASCADE
```

Les tables `consent_events` et `subscription_logs` ont `ON DELETE SET NULL` (preuves légales conservées avec `account_id = NULL`).

### 8.5 Comptes non confirmés (cleanup)

Une Edge Function CRON `cleanup-unconfirmed` purge les comptes non confirmés après 7 jours.

Impact front : après signup, le front DEVRAIT encourager la confirmation email. Un compte non confirmé pendant 7 jours sera supprimé automatiquement (avec CASCADE + purge Storage).

### 8.6 Suppression de profil enfant individuel

**Contexte** : Page Édition adulte. RGPD art.17 — droit à l'effacement.

**Règles contractuelles** :

- Un compte DOIT conserver **au moins 1 profil enfant** (trigger DB empêche la suppression du dernier).
- La suppression est **irréversible** → modal de confirmation requis côté front.
- La suppression est une action **adulte uniquement** (jamais en Contexte Tableau).
- **CASCADE DB** : `child_profiles` → `timelines` → `slots` → `sessions` → `session_validations` + `sequences` → `sequence_steps`.
- **Storage** : les avatars dans `personal-images/{account_id}/avatars/{child_profile_id}.jpg` NE sont PAS couverts par CASCADE SQL. Le front (ou une logique applicative) DOIT déclencher la purge Storage séparément.
- Après suppression, les quotas sont recalculés dynamiquement par la DB.

### 8.7 Rétention des données (politique)

Non bloquant pour l'implémentation immédiate (CRON futurs), mais documenté pour cohérence :

| Donnée                                 | Durée de rétention                                          | Mécanisme de purge          |
| -------------------------------------- | ----------------------------------------------------------- | --------------------------- |
| Compte + données produit               | Jusqu'à suppression par l'utilisateur (EF `delete-account`) | CASCADE DB + purge Storage  |
| `consent_events`                       | 6 mois après `created_at`                                   | CRON futur (non implémenté) |
| `subscription_logs`                    | 12 mois après `created_at`                                  | CRON futur (non implémenté) |
| Images Storage (cartes perso, avatars) | Jusqu'à suppression carte/profil/compte                     | CASCADE + EF purge          |

Le front NE DOIT PAS implémenter de logique de rétention — c'est une responsabilité serveur. Cependant, la Page Profil DEVRAIT mentionner la politique de rétention dans le cadre de la conformité RGPD (informations disponibles à l'utilisateur).

### 8.8 Edge Functions — contrat d'appel front

| Edge Function             | Auth                       | Méthode | Payload front                                                           | Réponse             | Erreurs                        |
| ------------------------- | -------------------------- | ------- | ----------------------------------------------------------------------- | ------------------- | ------------------------------ |
| `create-checkout-session` | JWT                        | POST    | `{}` (l'EF décide checkout vs portal)                                   | `{ url: string }`   | 401, 500                       |
| `log-consent`             | Anon key (+ optionnel JWT) | POST    | `{ mode, action, choices, ua, locale, app_version, origin, ts_client }` | 200 OK              | 400, 500                       |
| `delete-account`          | JWT + Turnstile token      | POST    | `{ turnstile_token: string }`                                           | `{ success: true }` | 401, 403 (Turnstile fail), 500 |

Le front NE DOIT PAS appeler directement :

- `stripe-webhook` (serveur-à-serveur Stripe uniquement, pas de CORS)
- `cleanup-unconfirmed` (CRON interne, pas d'appel externe)

### 8.9 Micro-features plateforme (hors core)

Ces fonctionnalités NE DOIVENT JAMAIS conditionner ni modifier les 3 systèmes cœur (planning/jetons/séquençage).

#### 8.9.1 Confettis

- Renforcement visuel ponctuel, optionnel.
- Affiché **uniquement si** `confetti_enabled = true` ET `reduced_motion = false`.
- Safe default : OFF (`confetti_enabled = false` en DB).
- Aucun impact sur les données core (aucune écriture core liée au confetti).
- Le trigger d'affichage (événement "tout est terminé") est côté UI.

#### 8.9.2 TrainProgressBar (barre "train / stations")

- Affichage motivant de progression basé sur `done/total`. Purement dérivé (lecture only).
- Safe sur `total=0` (pas de NaN/position invalide).
- Si `reduced_motion = true` : barre statique (pas d'animation).
- Préférence persistée en DB (`account_preferences`) : `train_progress_enabled` (default `false`).
- **Visitor** : voit la barre mais ligne forcée metro/1, pas de changement possible.
- **Catalogue stations** : table DB `stations` (lecture seule, aucune policy d'écriture client).

#### 8.9.3 TimeTimer (outil local de gestion du temps)

- Outil local d'auto-régulation, affiché sur Tableau, piloté par l'adulte.
- **Local-only** : toutes les préférences et l'état sont en localStorage, **non synchronisés**.
- **Visitor** : OFF (aucune option d'activation affichée, aucun rendu, aucune persistance locale).
- Aucune écriture DB ne dépend du TimeTimer.
- Son et vibration désactivables facilement et persistants (invariant TSA).
- Si `reduced_motion = true` : pas d'animation agressive, mode silencieux préférentiel.

#### 8.9.4 Toasts (messages de notification non bloquants)

- Messages courts et temporaires, principalement adulte (Édition).
- Contrôlés par `toasts_enabled` :
  - Si `false` : toasts info/success/warning supprimés
  - Toasts error restent autorisés
- **Invariant** : aucune erreur critique ne doit dépendre d'un toast pour être comprise (fallback inline/error state obligatoire).
- Politique rafale : 1 toast visible à la fois, nouveau toast remplace l'ancien.
- Durée courte (~2s), plancher 1s minimum pour lisibilité.
- Compatibles lecteur d'écran (live region).
- Contenu compréhensible sans animation (respect `reduced_motion`).

### 8.10 Administration (owner)

- Routes admin : statut Admin uniquement.
- **Interdiction absolue** : accès aux images personnelles (Storage policies) depuis l'admin.
- **Interdiction V1** : modifications directes de données produit "pour dépanner" (pas d'édition de cartes, plannings, séquences via UI admin).
- **Pas de "set account status manual"** : l'état de compte est déterminé par le contrat billing + règles DB.
- Toute action admin génère un événement dans `admin_audit_log` (append-only, reason obligatoire).

**Scopes d'accès admin (lecture)** :

- Comptes : identité minimale + statut + timestamps
- Appareils : métadonnées techniques
- Billing : `subscriptions`, `subscription_logs`
- Conformité : `consent_events` (preuves de consentement)
- Quotas/usage : compteurs et limites (agrégats, sans contenu)

**Scopes d'accès admin (écriture)** :

- Insertion dans `admin_audit_log` (append-only)
- Insertion dans `subscription_logs` (append-only, si nécessaire)
- Actions via fonctions/Edge dédiées uniquement

**Interdits explicites** :

- Preview/lecture des images privées et contenus personnels
- Lecture/édition des données produit enfant via console "support"
- Écriture directe sur tables produit depuis l'UI admin

---

## 9) Downgrade Subscriber → Free (flux complet)

Ce flux mérite une section dédiée car il combine plusieurs mécanismes DB et impacte fortement l'UX.

### 9.1 Déclenchement

Quand `accounts.status` passe de `subscriber` à `free` (via trigger billing), les quotas Phase 9 se resserrent immédiatement.

### 9.2 Mode "execution-only"

Si le compte free a plus de profils enfants que la limite (>1), la DB active le mode `execution-only` :

- Toutes les écritures structurelles (INSERT/UPDATE/DELETE sur timelines, slots, cards, categories, sequences) sont **bloquées par RLS**.
- L'exécution (sessions, validations) reste autorisée.
- Le front DOIT détecter ce refus et afficher l'état "exécution uniquement" en Édition (pas en Tableau).

### 9.3 Verrouillage progressif des profils

- Les profils enfants existants au-delà de la limite Free restent accessibles pour **terminer les sessions déjà actives**.
- Quand une session devient `completed` sur un profil excédentaire → trigger DB verrouille le profil (`active` → `locked`).
- Règle déterministe : garde les N plus anciens profils en `active`, met les autres en `locked`.
- Session terminée sur profil excédentaire : **lecture seule**, non relançable en mode Free.

### 9.4 UX Édition

- Profil `locked` : afficher comme "verrouillé (lecture seule)". Aucune action d'édition possible.
- Profil `active` (le seul restant en free) : édition normale mais soumise aux quotas free.
- Message downgrade : NON SPÉCIFIÉ PAR LES SOURCES (wording exact à définir).

### 9.5 Upgrade (réactivation)

Passage `free` → `subscriber` : trigger DB réactive automatiquement tous les profils `locked` → `active`. Le front DOIT rafraîchir l'état des profils après upgrade.

---

## 10) Plan minimal d'adaptation du frontend existant

> Ce plan guide Claude Code CLI dans l'adaptation. La structure exacte du frontend existant est à auditer via terminal.

### 10.1 Audit initial (Claude Code CLI)

Avant toute modification, Claude Code CLI DOIT :

1. Lister le tree des dossiers/pages/routes
2. Identifier l'intégration Supabase actuelle (client, hooks, services)
3. Repérer les flows "legacy" : ancien modèle de données (tables `taches`, `recompenses`, `profiles`, `abonnements`, `consentements`, `parametres`)
4. Identifier toute logique métier côté front (quotas, statuts, permissions, transitions)
5. Vérifier l'absence de `service_role` dans le bundle client

### 10.2 Keep / Modify / Delete (gabarit)

#### KEEP (si déjà présent et conforme)

- Composants UI Tableau/Édition (structure générale)
- Gestion session Supabase côté client (anon + session)
- Architecture Next.js (routing, layouts)
- Design system tokens Sass (ne pas modifier sans validation)

#### MODIFY (obligatoire)

- **Toute intégration Supabase** : requêtes vers nouvelles tables core (`accounts`, `child_profiles`, `timelines`, `slots`, `sessions`, `session_validations`, `cards`, `categories`, `user_card_categories`, `devices`, `sequences`, `sequence_steps`) et tables plateforme (`account_preferences`)
- **Toute logique de plan/quota/statut** : retirer les compteurs/conditions métier côté UI ; lire `accounts.status` pour l'affichage uniquement ; déléguer l'autorisation à la DB
- **Flows offline** : implémenter guards offline uniquement en Édition pour utilisateurs authentifiés + **bandeau persistant** (§4.4.1)
- **Storage** : adapter les chemins de bucket (`personal-images`, `bank-images`)
- **Edge Functions** : adapter les appels (`create-checkout-session`, `log-consent`, `delete-account`)
- **Remplacer tout système RBAC** par la lecture simple de `accounts.status` pour l'affichage + délégation totale à la RLS
- **CookieBanner.tsx** : corriger bug `action` vs `mode` (voir §8.2) + enrichir payload

#### DELETE (si présent)

- Tout code client qui simule/bypass la RLS ("filtrage côté front" comme autorisation)
- Tout usage `service_role` côté client
- Tout modèle "Visitor en DB" (status visitor, tables visitor, etc.)
- Tout affichage réseau/quota/paywall côté Tableau
- Tout système RBAC / rôles / permissions côté client
- Tout accès aux anciennes tables (`taches`, `recompenses`, `profiles`, `abonnements`, `consentements`, `parametres`)
- États legacy de compte : `suspended`, `deletion_scheduled`, `pending_verification` (n'existent plus)
- Anciens buckets Storage (`images/{userId}/taches`, `images/{userId}/recompenses`, `avatars/{userId}`)
- Purge DB manuelle dans `delete-account` (CASCADE suffit désormais)

### 10.3 Itérations minimales (petits pas)

1. **Auth + statut** : client Supabase, `accounts.status`, traiter Visitor comme local-only
2. **Contextes** : séparer Édition vs Tableau (garde d'accès + UI states) + **sélecteur enfant actif** (§2.3)
3. **Core lecture** : lecture banque cartes, timelines/slots, profils enfants
4. **Exécution session** : création session, validations, progression (snapshot), epoch + **grille jetons** (§3.1.2) + **slots vides invisibles Tableau** (§3.1.1)
5. **Édition structure** : CRUD timeline/slots/cartes assignées + anti‑choc + **matrice verrouillage** (§3.2.2bis) + **compactage/reflow** (§3.2.1)
6. **Séquençage** : CRUD séquences (Subscriber/Admin) + mini‑timeline Tableau
7. **Quotas & gating** : gérer erreurs quotas et PersonalizationModal (Édition only)
8. **Offline** : queue validations + guards offline (auth) + **bandeau persistant** (§4.4.1), jamais Tableau
9. **Downgrade** : execution-only detection, profils locked, upgrade réactivation
10. **Plateforme** : account_preferences + consent banner (**correction bug legacy §8.2**) + suppression compte + micro-features + **gestion devices** (§5.2.1)
11. **Admin** : routes admin, audit log, support ciblé (si applicable)

### 10.4 Critères d'acceptation (testables)

- Aucune règle critique (quotas/statuts/transitions/epoch) n'est codée en front : la DB refuse/autorise.
- Aucun système RBAC/rôles/permissions n'existe côté client.
- Tableau n'affiche jamais : réseau/offline, quotas, abonnement, erreurs DB.
- Slots vides (`card_id = NULL`) ne sont jamais affichés en Contexte Tableau.
- La grille de jetons reflète uniquement les slots non vides.
- Les changements structurants apparaissent uniquement au prochain Chargement du Contexte Tableau.
- Multi‑appareils : union des validations ; epoch obsolète écrasé ; jamais de régression enfant.
- Visitor : local-only ; import explicite ; aucune page Profil.
- `steps_total_snapshot` utilisé pour la progression (pas de recomptage live).
- `validated_at` jamais utilisé dans la logique front.
- Matrice de verrouillage session active respectée : slots validés non modifiables.
- Suppression carte utilisée en session → modal confirmation + Réinitialisation session.
- Sélecteur enfant actif fonctionne sans perte de contexte.
- Bandeau offline persistant en Édition ; aucun indicateur offline en Tableau.
- Décocher carte bibliothèque retire toutes occurrences dans timeline + reflow.
- Vider timeline = structure à état base + Réinitialisation session si active.
- Session Terminée = consultation lecture seule Tableau (récompense débloquée, aucun négatif).
- Focus après suppression slot : bascule vers prochaine étape non validée.
- Suppression de compte : modal + Turnstile + EF + logout + redirect.
- Suppression profil enfant : minimum 1 profil restant + purge avatar Storage.
- Profil "Mon enfant" et catégorie "Sans catégorie" : jamais créés par le front.
- `reduced_motion` respecté : confettis forcés OFF, animations non essentielles désactivées.
- Bannière consentement : adulte-only, jamais Tableau, symétrie CNIL, payload complet, bug legacy corrigé.
- Gestion devices : liste, révocation, quota — Page Profil adulte.

---

## 11) Checklist tests minimaux

### 11.1 UI (états)

- Loading / empty / error sur : banque cartes, timelines/slots, session active, profils enfants, séquences, **devices**.
- États "lecture seule / verrouillé" pour profils `locked`.
- États "execution-only" (écritures structurelles refusées) : Édition affiche refus non technique.
- PersonalizationModal : Visitor et Free voient le bon message.
- Suppression compte : modal de confirmation + Turnstile + post-suppression (logout + redirect).
- Suppression profil enfant : modal de confirmation + blocage si dernier profil.
- **Suppression carte utilisée** : modal confirmation avec wording contractuel.
- **Matrice verrouillage** : boutons désactivés selon état session (preview/started) et état slot (validé/non validé).
- **Sélecteur enfant actif** : changement de profil recharge le contexte correctement.
- **Bandeau offline persistant** : visible en Édition, absent en Tableau, disparaît au retour réseau.
- **Session Terminée** : état lecture seule visible, récompense affichée, aucune action de validation possible.

### 11.2 E2E critiques (produit)

- **Visitor** : composer timeline + exécuter + progression + séquence (local) ; aucun accès profil/préférences ; TimeTimer OFF.
- **Signup/login** : création compte → profil "Mon enfant" auto-créé → catégorie "Sans catégorie" auto-créée → accès Profil (Free) ; pas de cartes perso.
- **Import Visitor → compte** : import explicite ; continuité timelines/sessions/séquences ; cartes dépubliées conservées ; device_id importé.
- **Subscriber** : créer cartes perso (quota stock 50, quota mensuel 100) ; catégories ; séquences (min 2 étapes, pas doublons).
- **Quotas profils/devices** : refus au-delà limites + messages en Édition uniquement.
- **Downgrade Subscriber → Free** : exécution continue ; execution-only activé si profils > limite ; verrouillage progressif ; édition structure bloquée.
- **Upgrade Free → Subscriber** : profils locked réactivés automatiquement.
- **Suppression profil enfant** : cascade + purge avatar + dernier profil interdit.
- **Suppression compte** : modal + Turnstile + EF + cascade complète + logout.
- **Suppression carte en session active** : modal confirmation → Réinitialisation session → changement au prochain Chargement Tableau.
- **Verrouillage session démarrée** : slots validés non modifiables ; slots non validés éditables ; focus bascule après suppression.
- **Vider timeline** : remet structure base + Réinitialisation si session active.
- **Décocher carte bibliothèque** : toutes occurrences retirées + reflow.
- **Grille jetons Tableau** : reflète uniquement slots non vides, respecte reduced_motion.
- **Gestion devices** : enregistrement, révocation, comptage quota, liste Page Profil.
- **Offline (auth)** :
  - exécution + validations offline puis sync
  - tentative CRUD structure offline → désactivée + toast + **bandeau persistant** (Édition)
  - aucun indicateur offline en Tableau
- **Consentement cookies** : bannière adulte-only, jamais Tableau, GA4 non chargé sans consentement analytics, **payload complet**, **bug legacy corrigé** (mode vs action).

### 11.3 Sécurité front (DB-first)

- **Scan config** : aucune clé `service_role` dans le bundle.
- **Pas de RBAC** : aucun système de rôles/permissions côté client (vérifier absence de patterns `user.role`, `hasPermission`, `checkAccess`).
- **Requêtes interdites** : pas d'accès `subscriptions`, `consent_events` (direct), `admin_audit_log` (direct) ; pas de "SELECT \*" cross-tenant.
- **Gestion refus RLS** : 0 crash, UX Édition propre, Tableau neutre.
- **Storage** : aucun accès cross-account sur `personal-images`.
- **Edge Functions** : seules `create-checkout-session`, `log-consent`, `delete-account` sont appelées depuis le client.
- **validated_at** : pas utilisé dans la logique front (audit-only).
- **Payload consent** : vérifier que `mode` et `action` sont correctement séparés (pas de valeurs inversées).

### 11.4 Accessibilité (WCAG 2.2 AA, TSA)

- Navigation une main (Tableau / mini-timeline séquence).
- Focus visible, zones tactiles stables, pas de surprises visuelles.
- `reduced_motion` respecté : animations non essentielles désactivées ; confettis dépend de préférence + reduced_motion.
- Toasts : compatibles lecteur d'écran (live region), fallback inline pour erreurs critiques.
- Aucune surcharge cognitive côté enfant : textes courts, pas de technique, transitions douces (< 0.3s).
- **Bandeau offline** : discret, non bloquant, accessible (pas un modal).
- **Grille jetons** : statique si `reduced_motion = true`.
- **Focus management** : après suppression de slot, focus automatique vers prochaine étape non validée.

---

## Annexes

### A) Informations explicitement NON SPÉCIFIÉES PAR LES SOURCES (à ne pas inventer)

- Chemins URL exacts / structure Next.js routes
- UX exacte de "protection enfant" (verrou) pour accéder à Édition
- Codes/format exacts des erreurs DB (SQLSTATE, messages bruts)
- Wording exact du message de downgrade
- Wording exact de l'écran neutre Tableau en cas d'erreur
- Format exact du payload Edge Function `create-checkout-session` (simplifié ici)
- Détails de l'export RGPD (futur, pas Phase 11)
- Prix exacts Stripe (mensuel/annuel) — Stripe-only, aucun impact DB
- Réactivation d'un device révoqué (non spécifié)
- Sélection de timeline active parmi plusieurs (au-delà de l'autorisation structurelle DB)
- UX exacte du lien "Préférences cookies" (emplacement dans Page Profil vs footer)

### B) Rappel contrôle d'accès — DB-first (PAS RBAC)

Le frontend ne maintient aucune table de rôles, aucune matrice de permissions, aucun middleware d'autorisation. Le contrôle d'accès fonctionne ainsi :

```
1. Client tente une opération Supabase (SELECT/INSERT/UPDATE/DELETE)
2. RLS PostgreSQL évalue la policy applicable
3. Si autorisé → opération exécutée
4. Si refusé → erreur retournée au client
5. Le front affiche un état UX adapté au contexte (Édition : message explicite / Tableau : neutre)
```

Le seul usage de `accounts.status` côté front est **cosmétique** :

- Masquer/afficher des boutons pour éviter des erreurs inutiles (ex : ne pas afficher "créer carte perso" si free)
- Afficher PersonalizationModal avec le bon message (Visitor vs Free)
- Adapter la navigation (ex : page Profil interdite Visitor)

Mais la **source de vérité** reste toujours la DB. Si un bouton est visible par erreur et que l'utilisateur clique, la DB refusera et le front gère proprement.

### C) Séparation des 3 systèmes cœur (rappel)

Les 3 systèmes DOIVENT rester distincts en termes de noms, écrans, états et persistance :

| Système                | Tables DB                        | Contexte Tableau                       | Contexte Édition             |
| ---------------------- | -------------------------------- | -------------------------------------- | ---------------------------- |
| **Planning visuel**    | `timelines`, `slots`             | Affichage timeline complète            | CRUD timeline/slots          |
| **Économie de jetons** | `slots.tokens` (0..5, kind=step) | Comptage visuel dérivé + grille jetons | Modification tokens par slot |
| **Séquençage**         | `sequences`, `sequence_steps`    | Mini-timeline "fait" (local-only)      | CRUD séquences/étapes        |

❗ Interdiction de fusion conceptuelle (noms, écrans, états, persistance).

### D) Traçabilité des corrections v3.0

Ce document intègre les 16 lacunes identifiées par l'audit exhaustif du 2026-02-12 :

**🔴 Critiques (5)** :

- C1 → §3.2.2bis : Matrice verrouillage pendant session active (preview/started × validé/non validé)
- C2 → §3.1.1 : Slot Étape vide = invisible Contexte Tableau (invariant TSA)
- C3 → §3.2.2bis : Suppression carte personnelle → Réinitialisation session + modal confirmation
- C4 → §5.2.1 : Révocation device — lifecycle complet (création/révocation/comptage/interdiction DELETE)
- C5 → §8.2 : Payload complet EF `log-consent` + correction bug legacy `CookieBanner.tsx` (mode vs action)

**🟡 Importants (6)** :

- I1 → §3.2.3 : Décocher carte bibliothèque retire toutes occurrences + reflow
- I2 → §3.2.2bis : Focus après suppression slot → prochaine étape non validée
- I3 → §3.2.1 : Vider timeline — effets détaillés (structure base + Réinitialisation si session active)
- I4 → §2.3 : Sélecteur enfant actif (filtre contexte, état UI local)
- I5 → §4.4.1 : Indicateur offline persistant Édition (bandeau discret, pas toast seul)
- I6 → §3.1.2 : Grille jetons Tableau (zone affichage, respect reduced_motion)

**🟢 Mineurs (5)** :

- M1 → §3.1.3 : Session Terminée = consultation lecture seule Tableau
- M2 → §8.7 : Rétention données (politique consent_events/subscription_logs/images)
- M3 → §3.1.3 : Récompense conditionnelle — conditions affichage (aucun négatif)
- M4 → §3.2.1 : Timelines multiples par enfant — clarification (DB autorise, UX NON SPÉCIFIÉ au-delà)
- M5 → §3.2.1 : Compactage/Reflow — règles complètes (vider vs supprimer, invariant min 1 step)
