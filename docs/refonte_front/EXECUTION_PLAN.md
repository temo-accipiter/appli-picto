# EXECUTION_PLAN.md — Plan d'exécution séquencé pour Claude Code CLI

> **Version** : 1.0
> **Date** : 2026-02-13
> **Destinataire** : Claude Code CLI
> **Document de référence unique** : `FRONTEND_CONTRACT.md` v3.0
> **Backend** : `supabase/migrations/` (41 migrations SQL, 130 smoke tests PASS)
> **Règle absolue** : ce plan dit **dans quel ordre procéder**. Le contrat dit **quelles règles respecter**. En cas de doute, le contrat prévaut.

---

## Principes de pilotage

### Modèle d'exécution

Chaque Slice suit un cycle strict en 3 phases :

```
AUDIT → ADAPT → VALIDATE
```

- **AUDIT** : lire le code existant, identifier legacy/conforme/manquant, produire un rapport court.
- **ADAPT** : modifier/supprimer/créer le code nécessaire, en respectant strictement le contrat.
- **VALIDATE** : vérifier les critères d'acceptation listés. Tout critère non satisfait = slice non terminée.

### Règles de progression

1. **Une slice à la fois.** Ne jamais commencer une slice avant que la précédente soit validée.
2. **Pas de dette.** Si une slice révèle un problème dans une slice précédente, corriger d'abord.
3. **Pas de look-ahead.** Ne pas implémenter des fonctionnalités d'une slice future "parce que c'est facile".
4. **Rapport obligatoire.** Chaque phase AUDIT produit un rapport structuré (fichiers touchés, décisions keep/modify/delete).
5. **Migrations = lecture seule.** Claude Code CLI lit les migrations SQL pour comprendre le schéma mais NE MODIFIE JAMAIS les fichiers dans `supabase/migrations/`.
6. **Tokens Sass = intouchables.** Ne jamais créer de valeurs CSS/Sass hors du système de tokens existant (voir contrat, posture Design System).

### Conventions de rapport AUDIT

Pour chaque slice, le rapport AUDIT suit ce format :

```markdown
## Rapport AUDIT — Slice SX

### Fichiers analysés

- `path/to/file.tsx` — [KEEP | MODIFY | DELETE] — raison courte

### Legacy identifié

- Description du pattern legacy trouvé

### Manquant

- Ce qui doit être créé ex nihilo

### Risques

- Points d'attention spécifiques à cette slice

### Décision

- Prêt pour ADAPT : OUI / NON (si NON, expliquer le bloquant)
```

---

## S0 — Audit global du frontend existant

> **Objectif** : cartographier l'existant AVANT toute modification. Aucun code modifié dans cette slice.

### Référence contrat

- §0 (Contexte d'utilisation)
- §10.1 (Audit initial)
- §10.2 (Keep / Modify / Delete)

### Migrations à lire

- Aucune en détail — vue d'ensemble seulement (liste des fichiers dans `supabase/migrations/`)

### Phase AUDIT (= la totalité de cette slice)

1. **Tree complet** : lister l'arborescence du projet front (`src/`, `app/`, `pages/`, `components/`, `hooks/`, `services/`, `lib/`, `styles/`, `utils/`, `types/`)
2. **Stack technique** : confirmer Next.js version, TypeScript strict activé, Sass/SCSS, pnpm
3. **Client Supabase** : localiser le(s) fichier(s) d'initialisation Supabase, vérifier la clé utilisée (anon vs service_role)
4. **Routes/pages** : lister toutes les routes existantes et leur correspondance avec les écrans du contrat §2.1
5. **Intégration DB existante** : lister toutes les tables/vues/fonctions Supabase appelées depuis le front
6. **Legacy hunt** : chercher les anciennes tables (`taches`, `recompenses`, `profiles`, `abonnements`, `consentements`, `parametres`) — lister chaque occurrence
7. **RBAC hunt** : chercher tout pattern `user.role`, `hasPermission`, `checkAccess`, `isAdmin`, `canCreate`, ou tout système de permissions/rôles côté client
8. **service_role hunt** : chercher toute occurrence de `service_role` dans le code client (CRITIQUE)
9. **Inventaire hooks/services** : lister tous les hooks personnalisés et services liés à Supabase
10. **Design system** : confirmer l'emplacement des tokens Sass (`styles/`), lister les fichiers de tokens
11. **État des flows** : pour chaque écran listé en §2.1, noter s'il existe, est fonctionnel, ou est un stub

### Livrable

Un fichier `AUDIT_REPORT.md` dans le repo avec :

- Tree annoté
- Inventaire legacy (par fichier)
- Inventaire des tables DB appelées (anciennes vs nouvelles)
- Inventaire `service_role` (doit être vide)
- Inventaire RBAC (doit être vide)
- Décision keep/modify/delete par dossier principal
- Liste des fichiers à créer ex nihilo

### Critères d'acceptation

- [ ] `AUDIT_REPORT.md` produit et lisible
- [ ] Aucun fichier du projet n'a été modifié
- [ ] Tous les patterns legacy sont identifiés
- [ ] `service_role` : 0 occurrence confirmée (ou listée comme CRITIQUE si trouvée)

---

## S1 — Auth + Accounts + Statut + Visitor

> **Objectif** : le client Supabase fonctionne avec le nouveau schéma. Login/signup/logout opérationnels. `accounts.status` est lu. Visitor = local-only (pas de DB).

### Référence contrat

- §0.3 (Modèle contrôle d'accès DB-first)
- §1.1 (Statuts fonctionnels)
- §1.2 (Contextes UX)
- §1.4 (DB-authoritative vs local-only — matrice complète)
- §1.6 (Interdictions DB-first)
- §5.1 (Auth & clé Supabase)
- §5.2.1 (Accounts — lecture statut/timezone, PAS device dans cette slice)
- §7.1, §7.2 (Visitor = local-only, limitations)
- Annexe B (Rappel contrôle d'accès DB-first)

### Migrations à lire

- Phase 1 : migrations 1-2 (enums, accounts, devices)
- Phase 7 : migrations 16+ (RLS policies sur accounts)
- Platform : migration P3 (account_preferences — juste constater l'existence)

### Phase AUDIT

1. Localiser l'initialisation du client Supabase — vérifier `anon` key
2. Identifier le flow signup/login/logout existant
3. Identifier tout code qui lit un "statut" ou "rôle" utilisateur
4. Identifier toute gestion Visitor existante (localStorage, IndexedDB, état "non connecté")
5. Identifier tout pattern RBAC ou système de permissions à supprimer

### Phase ADAPT

1. **Client Supabase** : s'assurer qu'il utilise uniquement `anon` key + session
2. **Auth flows** : adapter signup/login/logout au nouveau schéma `accounts` (le trigger DB crée automatiquement le compte + profil "Mon enfant" + catégorie "Sans catégorie" + preferences)
3. **Lecture statut** : créer un hook/service pour lire `accounts.status` du user connecté. Usage COSMÉTIQUE uniquement (masquer/afficher des éléments UI)
4. **Supprimer RBAC** : retirer tout système de rôles/permissions côté client. Remplacer par lecture simple de `accounts.status`
5. **Visitor** : implémenter comme état purement local (IndexedDB). Aucun appel DB sauf lecture banque cartes (published). Pas d'accès Page Profil
6. **Supprimer legacy** : retirer tout accès aux anciennes tables identifiées en S0
7. **Supprimer service_role** : si trouvé en S0, retirer immédiatement (CRITIQUE)

### Critères d'acceptation

- [ ] Client Supabase = anon key uniquement, 0 `service_role` dans le bundle
- [ ] Signup → compte créé en DB → profil "Mon enfant" existe (auto trigger) → catégorie "Sans catégorie" existe (auto trigger)
- [ ] Login → `accounts.status` accessible et correct (free / subscriber / admin)
- [ ] Logout → session nettoyée
- [ ] Visitor navigue sans erreur réseau (aucun appel DB sauf banque cartes lecture)
- [ ] Visitor ne peut pas accéder à la Page Profil
- [ ] Aucun pattern `user.role`, `hasPermission`, `checkAccess` dans le code
- [ ] Aucun accès aux anciennes tables (`taches`, `recompenses`, etc.)
- [ ] `accounts.status` utilisé pour affichage uniquement (pas comme source d'autorisation)

---

## S2 — Profils enfants + Sélecteur enfant actif

> **Objectif** : CRUD profils enfants fonctionne avec la DB. Le sélecteur d'enfant actif est opérationnel. Contextes Édition/Tableau séparés.

### Référence contrat

- §1.2 (Contextes UX)
- §1.3 (Chargement du Contexte Tableau)
- §2.1 (Matrice des écrans)
- §2.2 (Garde "Protection enfant")
- §2.3 (Sélecteur d'enfant actif)
- §3.2.4 (Profils enfants & appareils — uniquement profils dans cette slice)
- §5.2.2 (Profils enfants — requêtes)
- §6.2 (Règle d'or Contexte Tableau)

### Migrations à lire

- Phase 2 : migrations 3-5 (child_profiles, auto "Mon enfant")
- Phase 7 : RLS policies sur child_profiles
- Phase 9 : quotas profils (trigger)

### Phase AUDIT

1. Identifier les composants existants de gestion de profils enfants
2. Identifier tout code de "sélection d'enfant actif" (ou équivalent)
3. Identifier la séparation Édition/Tableau existante (routes, layouts, guards)
4. Identifier toute logique de quota profils côté front (à supprimer)

### Phase ADAPT

1. **Lecture profils** : lister les profils enfants du compte (`child_profiles` WHERE `account_id = auth.uid()`)
2. **Sélecteur enfant actif** : état UI local (pas de colonne DB). Changement d'enfant actif = Chargement du Contexte Tableau
3. **Création profil** : soumise quota DB. Gérer proprement le refus (Free ≤1, Subscriber ≤3, Admin ∞). Message : « Nombre maximum de profils enfants atteint. »
4. **Profil auto "Mon enfant"** : le front NE crée PAS ce profil — il le lit après signup
5. **Contextes séparés** : s'assurer que Édition et Tableau sont des contextes distincts avec garde d'accès
6. **Profils `locked`** : afficher comme "verrouillé (lecture seule)" — pas d'actions d'édition. Pas de suppression possible (RLS empêche)
7. **Suppression profil** : stub simple (sera complété en S11). Bloquer si dernier profil (confiance DB mais UX anticipée)

### Critères d'acceptation

- [ ] Profils enfants listés correctement après login
- [ ] Profil "Mon enfant" visible sans création manuelle
- [ ] Sélecteur enfant actif fonctionne — changement recharge le contexte
- [ ] Changement d'enfant actif ne modifie pas : cartes, catégories, préférences
- [ ] Changement d'enfant actif modifie : timelines, sessions, progression (sera visible en S5)
- [ ] Création profil : refus quota géré proprement avec message non technique
- [ ] Profil `locked` : lecture seule, aucune action d'édition
- [ ] Aucune logique de quota profils côté front (la DB refuse)
- [ ] Contexte Tableau : aucun message technique, réseau, quota visible

---

## S3 — Cartes + Catégories + Storage

> **Objectif** : lecture banque cartes, CRUD cartes perso (subscriber), CRUD catégories, images fonctionnelles.

### Référence contrat

- §3.2.3 (Cartes personnelles & catégories — gating + quotas)
- §5.2.3 (Cartes — requêtes)
- §5.2.4 (Catégories & pivot)
- §5.3 (Storage — buckets, chemins, policies)
- §6.1 catégories #2 et #3 (violations contraintes, quota/feature gating)
- §6.3 (Contexte Édition)
- §6.4 (PersonalizationModal — Visitor et Free)

### Migrations à lire

- Phase 3 : migrations 6-8 (cards, categories, user_card_categories)
- Phase 7 : RLS policies sur cards, categories, pivot
- Phase 8 : migrations 23-24 (Storage policies)
- Phase 9 : quotas cartes (trigger `check_can_create_personal_card`)

### Phase AUDIT

1. Identifier l'affichage existant de la banque de cartes
2. Identifier les flows de création/édition de cartes perso
3. Identifier la gestion de catégories (y compris "Sans catégorie")
4. Identifier l'upload/affichage d'images (anciens vs nouveaux buckets)
5. Identifier toute logique de quota cartes côté front (à supprimer)

### Phase ADAPT

1. **Banque cartes (lecture)** : toutes statuts (y compris Visitor) lisent les cartes `published = TRUE`. Images dans bucket `bank-images`
2. **Cartes perso (CRUD)** : Subscriber/Admin uniquement. Images dans `personal-images/{account_id}/cards/{card_id}.jpg`
3. **Image immutable** : `cards.image_url` non modifiable après création (RLS). UX : supprimer + recréer pour changer l'image
4. **Catégories** : CRUD Subscriber/Admin. "Sans catégorie" (`is_system=TRUE`) : jamais modifiable/supprimable par le front
5. **Pivot** : assignation via `user_card_categories`, UNIQUE `(user_id, card_id)`
6. **Quotas** : NE PAS implémenter côté front. La DB refuse. Gérer le refus avec message non technique en Édition
7. **PersonalizationModal** : Visitor → « Pour créer tes propres tâches... crée un compte et abonne-toi. » / Free → « Ton compte gratuit te permet de sauvegarder... passe à la version Premium. »
8. **Anciens buckets** : supprimer tout accès à `images/{userId}/taches`, `images/{userId}/recompenses`, `avatars/{userId}`
9. **Carte dépubliée** : reste visible dans les usages existants — ne pas filtrer `published=FALSE` dans les slots/timelines

### Critères d'acceptation

- [ ] Banque cartes affichée (tous statuts) avec images `bank-images`
- [ ] Cartes perso : création (subscriber) → image uploadée → visible
- [ ] Cartes perso : quota dépassé → message non technique (pas technique, pas Tableau)
- [ ] Catégorie "Sans catégorie" : visible, non modifiable, non supprimable
- [ ] Suppression catégorie custom → cartes réassignées automatiquement (vérifier visuellement)
- [ ] PersonalizationModal affichée pour Visitor et Free avec bon wording
- [ ] Aucun accès aux anciens buckets Storage
- [ ] Carte dépubliée visible dans les usages existants

---

## S4 — Timelines + Slots (structure Édition)

> **Objectif** : CRUD timelines/slots en Édition. Compactage/reflow. Vider timeline. Pas encore de sessions.

### Référence contrat

- §3.2.1 (Planning visuel — timelines/slots, compactage/reflow, vider timeline, timelines multiples)
- §3.2.3 (Décocher carte bibliothèque — retirer toutes occurrences)
- §5.2.5 (Timelines/slots — requêtes)
- §4.3 (Règle anti-choc — LIRE mais implémentation sessions = S5)
- Annexe C (Séparation 3 systèmes cœur)

### Migrations à lire

- Phase 4 : migration 9 (timelines, slots)
- Phase 7 : RLS policies sur timelines, slots

### Phase AUDIT

1. Identifier les composants d'édition de timeline existants
2. Identifier la gestion de slots (ajout, suppression, réordonnement)
3. Identifier toute action "vider timeline" existante
4. Identifier le pattern d'assignation de cartes aux slots

### Phase ADAPT

1. **CRUD timeline** : créer, éditer (nom), supprimer. Nombre illimité (tous statuts)
2. **CRUD slots** : ajouter, supprimer, réordonner. Types : `step` et `reward`
3. **Invariant min 1 step** : le dernier slot Étape ne peut pas être supprimé (anticiper en UI, DB l'empêche aussi)
4. **Assigner/retirer carte** : `slots.card_id` = NULL (vide) ou FK vers card
5. **Vider un slot** (retirer carte) : slot reste visible en Édition, `card_id` → NULL
6. **Supprimer un slot** : l'emplacement disparaît, reflow des positions restantes
7. **Vider la timeline** : retire toutes les cartes + remet 1 step vide + 1 reward vide. (Réinitialisation session si active = sera géré en S6)
8. **Décocher carte bibliothèque** : retire TOUTES occurrences de `card_id` dans la timeline active + reflow
9. **Compactage** : jamais de suppression implicite de slot, jamais de trou visuel
10. **Jetons** : modifier `slots.tokens` (0..5, kind=step uniquement). CHECK DB empêche valeurs hors range
11. **Offline** : toutes les actions structurelles = **interdit offline** (guard UX). Stub du toast « Indisponible hors connexion » (implémentation complète en S8)

### Critères d'acceptation

- [ ] Timeline créée/éditée/supprimée en DB
- [ ] Slots ajoutés/supprimés/réordonnés — positions cohérentes
- [ ] Dernier slot Étape non supprimable (UI anticipée + DB refuse)
- [ ] Vider slot = `card_id` NULL, slot reste visible
- [ ] Supprimer slot = emplacement disparaît, reflow propre
- [ ] Vider timeline = 1 step vide + 1 reward vide
- [ ] Décocher carte bibliothèque = toutes occurrences retirées + reflow
- [ ] Jetons : 0..5 sur slots step uniquement, DB refuse hors range
- [ ] Aucune fusion conceptuelle planning/jetons/séquençage

---

## S5 — Sessions + Validations + Progression (Tableau)

> **Objectif** : le Contexte Tableau fonctionne. Création session, validation étapes, progression via snapshot, slots vides invisibles, grille jetons, session terminée.

### Référence contrat

- §3.1 (Contexte Tableau — toutes sous-sections)
- §3.1.1 (Slots vides = invisibles Tableau)
- §3.1.2 (Grille de jetons)
- §3.1.3 (Session Terminée — consultation lecture seule, récompense, aucun négatif)
- §4.2 (Fusion multi-appareils)
- §4.5 (Progression via snapshot)
- §5.2.6 (Sessions/validations/epoch — toutes contraintes DB)
- §6.2 (Règle d'or Contexte Tableau)

### Migrations à lire

- Phase 5 : migrations 10-13.5 (sessions, session_validations, snapshot, epoch, transitions)
- Phase 7 : RLS policies sur sessions, session_validations

### Phase AUDIT

1. Identifier l'écran Tableau existant et ses composants
2. Identifier la gestion de sessions (création, état, progression)
3. Identifier tout calcul de progression côté front (recomptage live = à remplacer par snapshot)
4. Identifier toute utilisation de `validated_at` (audit-only, interdit en logique)

### Phase ADAPT

1. **Création session** : automatique à l'entrée Tableau si aucune session active pour (profil, timeline). État initial = `active_preview`
2. **Validation étape** : INSERT `session_validations` (session_id, slot_id). Idempotent (UNIQUE). DB gère la transition `active_preview` → `active_started` (1ère validation)
3. **Progression** : `done` = COUNT validations de la session / `total` = `sessions.steps_total_snapshot`. **Jamais de recomptage live des slots**
4. **Slots vides invisibles** : en Tableau, filtrer `card_id IS NOT NULL` pour affichage. Les slots vides n'apparaissent pas et ne comptent pas dans la progression
5. **Grille de jetons** : somme des `tokens` des slots Étapes non vides. Si 0 jetons total → grille non affichée. Respecter `reduced_motion`
6. **Session Terminée** : `state = 'completed'` quand validations = snapshot. Lecture seule. Récompense débloquée si carte récompense présente. Sinon feedback neutre/positif. **Aucun négatif**
7. **Epoch** : lire `sessions.epoch`. Si `epoch_local < epoch_DB` → état local obsolète → Réinitialisation au prochain Chargement Contexte Tableau
8. **Fusion monotone** : validations = union ensembliste. Progression ne régresse jamais visuellement
9. **validated_at** : NE JAMAIS utiliser en logique (audit-only)
10. **Contexte Tableau strict** : aucun message technique, réseau, quota, erreur DB

### Critères d'acceptation

- [ ] Session créée automatiquement à l'entrée Tableau (si aucune active)
- [ ] Validation étape → case cochée → progression avance
- [ ] Progression = validations / `steps_total_snapshot` (pas de recomptage live)
- [ ] Slots vides (`card_id = NULL`) : invisibles en Tableau, ignorés dans progression et jetons
- [ ] Grille jetons : affichée si jetons > 0, statique si `reduced_motion = true`
- [ ] Session Terminée : lecture seule, récompense débloquée, aucun négatif
- [ ] Epoch obsolète → réalignement au prochain Chargement (pas en direct)
- [ ] `validated_at` : 0 occurrence dans la logique front
- [ ] Aucun message technique/réseau/quota en Contexte Tableau

---

## S6 — Verrouillage session active + Anti-choc

> **Objectif** : en Édition, les boutons sont activés/désactivés selon l'état session. Anti-choc garanti. Suppression carte avec session active = modal + reset.

### Référence contrat

- §3.2.2 (Sessions — réinitialisation, anti-choc)
- §3.2.2bis (Matrice de verrouillage complète — preview/started × validé/non validé)
- §4.3 (Règle anti-choc — implémentation complète)
- §6.4 (Message « Cette carte est actuellement utilisée... »)

### Migrations à lire

- Relire Phase 5 (sessions, epoch) pour comprendre les transitions d'état
- Vérifier les triggers de réinitialisation

### Phase AUDIT

1. Identifier toute logique existante de verrouillage d'édition pendant session
2. Identifier les modals de confirmation existants (suppression carte)
3. Identifier tout code "anti-choc" ou "defer changes"

### Phase ADAPT

1. **Matrice verrouillage** :
   - **Aucune session / Terminée** : tout éditable
   - **Preview (0 validation)** : tout éditable (modifier cartes, ordre, slots, jetons)
   - **Started (≥1 validation)** : slots validés = verrouillés (pas de déplacement, suppression, modification jetons, vidage). Slots non validés = éditables (déplacement, suppression sauf dernier, vidage). Jetons non validés = non modifiables\* (exception : nouveau slot)
2. **Réinitialisation de session** (epoch++) : action explicite adulte. S'applique au prochain Chargement Contexte Tableau
3. **Focus après suppression slot** : si le slot supprimé était au focus (non validé, session started), focus → prochaine étape non validée. Jamais d'écran vide
4. **Suppression carte depuis bibliothèque** : si utilisée en session active → modal confirmation avec wording contractuel → Réinitialisation session → changement au prochain Chargement
5. **Vider timeline avec session active** : déclenche Réinitialisation session (epoch++) automatiquement
6. **Anti-choc complet** : aucune modification structurante ne "réarrange" un Tableau déjà affiché. Tout passe par le prochain Chargement

### Critères d'acceptation

- [ ] Session preview : tous boutons d'édition actifs
- [ ] Session started : slots validés = boutons désactivés (déplacer, supprimer, modifier jetons, vider)
- [ ] Session started : slots non validés = boutons actifs (déplacer, supprimer sauf dernier, vider)
- [ ] Suppression carte utilisée en session → modal « Cette carte est actuellement utilisée... » → epoch++
- [ ] Vider timeline avec session active → Réinitialisation automatique
- [ ] Focus après suppression slot → prochaine étape non validée (pas d'écran vide)
- [ ] Aucune modification structurante ne s'applique "en direct" sur un Tableau affiché
- [ ] Réinitialisation = prochain Chargement Contexte Tableau uniquement

---

## S7 — Séquençage

> **Objectif** : CRUD séquences en Édition (subscriber/admin). Mini-timeline en Tableau. État "fait" local-only.

### Référence contrat

- §3.1.4 (Mini-timeline de séquence — Tableau)
- §3.2.5 (Séquençage — Édition)
- §5.2.7 (Séquences — requêtes)
- Annexe C (Séparation 3 systèmes cœur)

### Migrations à lire

- Phase 6 : migrations 14-15 (sequences, sequence_steps)
- Phase 7 : RLS policies sur sequences, sequence_steps

### Phase AUDIT

1. Identifier les composants de séquençage existants (édition + tableau)
2. Identifier la mini-timeline existante
3. Identifier toute fusion conceptuelle séquençage/planning/jetons (interdit)

### Phase ADAPT

1. **CRUD séquences** : Subscriber/Admin. Minimum 2 étapes, pas de doublons (`UNIQUE (sequence_id, step_card_id)`). 0..1 séquence par carte par compte
2. **Visitor** : peut composer localement. Import au passage Visitor → Compte
3. **Free** : pas de création/édition de séquences (feature gating DB)
4. **Mini-timeline Tableau** :
   - Sous la carte mère, visible via bouton « Voir étapes » quand carte mère au focus
   - Scrollable horizontalement, utilisable à une main
   - Cliquer étape = griser "fait" (état visuel local-only par `slot_id`)
   - Tap sur image/nom carte mère = aucune action
   - Validation carte mère (checkbox) → mini-timeline se referme (transition douce < 0.3s)
   - État "fait" : pas d'ordre imposé, aucune incidence fonctionnelle, ne valide pas carte mère
5. **Ownership** : cartes perso dans séquence = même `account_id` (trigger DB vérifie)

### Critères d'acceptation

- [ ] Séquence créée avec minimum 2 étapes — DB refuse sinon
- [ ] Pas de doublons dans les étapes — DB refuse sinon
- [ ] Mini-timeline visible en Tableau sous carte mère au focus
- [ ] État "fait" = local-only, reset chaque session, aucun impact fonctionnel
- [ ] Tap image/nom carte mère = aucune action
- [ ] Validation carte mère → mini-timeline se referme (< 0.3s)
- [ ] Free : CRUD séquences bloqué (DB refuse, UX gère proprement)
- [ ] Aucune fusion conceptuelle séquençage/planning/jetons

---

## S8 — Offline + Sync

> **Objectif** : queue de validations offline, guards UX en Édition, bandeau offline persistant, fusion monotone, anti-choc multi-appareils.

### Référence contrat

- §4 entier (Contrat Sync / Offline / Cache)
- §4.4 (Offline — autorisé vs interdit)
- §4.4.1 (Indicateur offline persistant — Édition)
- §4.2 (Fusion multi-appareils)
- §4.3 (Règle anti-choc)
- §6.1 catégorie #4 (Offline)
- §6.1 catégorie #5 (Conflit epoch)

### Migrations à lire

- Relire Phase 5 (sessions, epoch) pour comprendre la fusion

### Phase AUDIT

1. Identifier toute gestion offline existante (service worker, queue, détection réseau)
2. Identifier les indicateurs réseau existants (toasts, banners)
3. Identifier tout code de sync/merge existant

### Phase ADAPT

1. **Détection offline** : `navigator.onLine` + événements `online`/`offline`
2. **Autorisé offline** : exécuter timeline, valider étapes (queue locale), pause/reprise
3. **Interdit offline** : CRUD cartes, catégories, timelines, slots, jetons, réinitialisation session, profils. Désactiver les boutons correspondants en Édition
4. **Toast** : « Indisponible hors connexion » sur tentative d'action interdite (Édition uniquement)
5. **Bandeau persistant** : indicateur discret en Édition tant que offline. Non modal, non bloquant. Disparaît au retour réseau
6. **Contexte Tableau** : AUCUN indicateur offline/réseau — jamais
7. **Queue de validations** : les validations effectuées offline sont mises en queue et envoyées au retour réseau. Idempotentes (UNIQUE côté DB)
8. **Fusion monotone** : au retour online, union des validations. Progression ne régresse jamais
9. **Epoch check** : si `epoch_local < epoch_DB` après sync → état local obsolète → réalignement au prochain Chargement Contexte Tableau (pas en direct)
10. **Visitor** : non concerné par les constraints réseau (local-only)

### Critères d'acceptation

- [ ] Offline : validations étapes fonctionnent → queue → sync au retour réseau
- [ ] Offline : CRUD structure → boutons désactivés + toast Édition
- [ ] Bandeau offline : visible en Édition, absent en Tableau, disparaît auto retour réseau
- [ ] Fusion monotone : progression ne régresse jamais
- [ ] Epoch obsolète : réalignement silencieux au prochain Chargement (pas de popup enfant)
- [ ] Aucun indicateur réseau/sync en Contexte Tableau
- [ ] Visitor : pas affecté par les guards offline

---

## S9 — Quotas + Feature Gating + Downgrade

> **Objectif** : gestion des refus de quota/feature gating. PersonalizationModal. Mode execution-only. Verrouillage progressif profils. Upgrade.

### Référence contrat

- §3.2.3 (Quotas cartes)
- §3.2.4 (Quotas profils/devices — profils seulement ici)
- §6.1 catégories #3 et #8 (Quota/feature gating, Execution-only)
- §6.4 (Messages UX verrouillés)
- §9 entier (Downgrade Subscriber → Free)

### Migrations à lire

- Phase 9 : migrations 25-30 (quotas, execution-only, downgrade lock)
- Relire Phase 7 (RLS policies execution-only)

### Phase AUDIT

1. Identifier toute logique de quota implémentée côté front (à supprimer)
2. Identifier la gestion de downgrade existante
3. Identifier les messages de limite existants

### Phase ADAPT

1. **Quotas** : AUCUNE logique de comptage côté front. La DB refuse. Le front gère le refus
2. **PersonalizationModal** : affichée quand Visitor ou Free tente une action subscriber-only. Wordings contractuels exacts (§6.4)
3. **Execution-only** : détecté par refus RLS sur écritures structurelles. Le front affiche l'état « exécution uniquement » en Édition. L'exécution (sessions, validations) reste autorisée
4. **Verrouillage progressif** : profils excédentaires (après downgrade) deviennent `locked` progressivement (quand session → completed). Afficher comme "verrouillé (lecture seule)"
5. **Upgrade** : après `free` → `subscriber`, rafraîchir la liste des profils (profils `locked` → `active` automatiquement par trigger DB)
6. **Anti-abus timezone** : NE PAS tenter de contourner. Aucune logique timezone côté front pour les quotas

### Critères d'acceptation

- [ ] Aucun compteur de quota côté front (vérifier : pas de `count` sur cards/profiles côté client)
- [ ] PersonalizationModal : Visitor = bon wording, Free = bon wording
- [ ] Execution-only : écritures structurelles refusées → message « exécution uniquement » en Édition
- [ ] Execution-only : sessions/validations toujours autorisées
- [ ] Profil locked : lecture seule, non relançable
- [ ] Upgrade : profils locked repassent active (vérifier après changement statut)
- [ ] Aucune logique de quota timezone côté front

---

## S10 — Devices

> **Objectif** : gestion complète du lifecycle des devices en Page Profil. Enregistrement, liste, révocation, quota.

### Référence contrat

- §3.2.4 (Profils enfants & appareils — partie devices)
- §5.2.1 (Accounts — lifecycle device complet)
- §6.1 catégorie #3 (Quota — devices)
- §6.4 (Message « Nombre maximum d'appareils atteint. »)

### Migrations à lire

- Phase 1 : migration 2 (devices)
- Phase 7 : RLS policies sur devices
- Phase 9 : quota devices (trigger)

### Phase AUDIT

1. Identifier toute gestion de devices existante
2. Identifier l'enregistrement device au login/signup
3. Identifier toute logique de révocation

### Phase ADAPT

1. **Enregistrement device** : INSERT `devices` au premier usage sur un appareil. Le front génère un `device_id` unique (UUID) persisté en localStorage
2. **Liste devices** : afficher tous les devices du compte (actifs + révoqués) en Page Profil
3. **Révocation** : `UPDATE devices SET revoked_at = NOW()`. Confirmation avant action. Non-destructif (device conservé)
4. **DELETE interdit** : le front ne tente JAMAIS `DELETE` sur devices (RLS refuse)
5. **Quota** : seuls devices actifs (`revoked_at IS NULL`) comptent. Refus → « Nombre maximum d'appareils atteint. »
6. **Réactivation** : NON SPÉCIFIÉ — ne pas implémenter
7. **Visitor** : pas de gestion device (mono-appareil structurel)

### Critères d'acceptation

- [ ] Device enregistré au premier usage (INSERT)
- [ ] Liste devices visible en Page Profil (actifs + révoqués avec états distincts)
- [ ] Révocation fonctionnelle avec confirmation
- [ ] Quota dépassé → message non technique
- [ ] Aucun DELETE sur devices
- [ ] Réactivation : non implémentée

---

## S11 — Plateforme (Préférences, Consentement, Stripe, Suppression)

> **Objectif** : fonctionnalités plateforme complètes. Préférences. Bannière consentement (bug corrigé). Abonnement Stripe. Suppression compte. Suppression profil enfant.

### Référence contrat

- §8.1 (Préférences — account_preferences)
- §8.2 (RGPD / consentement — bannière, payload complet, correction bug legacy)
- §8.3 (Abonnement / Stripe — create-checkout-session)
- §8.4 (Suppression de compte — flux complet + Turnstile)
- §8.5 (Comptes non confirmés)
- §8.6 (Suppression profil enfant — modal, cascade, purge avatar)
- §8.7 (Rétention données)
- §8.8 (Edge Functions — contrat d'appel)
- §8.9 (Micro-features — confettis, TrainProgressBar, TimeTimer, toasts)

### Migrations à lire

- Platform : migrations P1 (subscriptions, subscription_logs), P2 (consent_events), P3 (account_preferences), P4 (admin_audit_log)
- Phase 8 : Storage policies (pour purge avatar)

### Phase AUDIT

1. Identifier la bannière cookies existante (`CookieBanner.tsx`)
2. Identifier le bug legacy `action` vs `mode` (contrat §8.2)
3. Identifier le flow Stripe existant
4. Identifier le flow de suppression de compte existant
5. Identifier les micro-features existantes (confettis, TrainProgressBar, TimeTimer, toasts)

### Phase ADAPT

1. **Préférences** : lire/écrire `account_preferences` via RLS. Valeurs par défaut en DB. Pas de localStorage pour `reduced_motion`, `toasts_enabled`, `confetti_enabled`
2. **Bannière consentement** :
   - Adulte-only, JAMAIS Tableau
   - Corriger bug legacy : `action: 'accept_all'` → `mode: 'accept_all', action: 'first_load'`
   - Payload complet : `{ mode, action, choices, ua, locale, app_version, origin, ts_client }`
   - Symétrie CNIL (Refuser aussi simple qu'Accepter)
   - GA4 NON chargé tant que `choices.analytics !== true`
   - Lien « Préférences cookies » pour modification ultérieure (`action: 'update'` ou `action: 'revoke'`)
3. **Stripe** : appel EF `create-checkout-session` (JWT, POST, `{}`). Redirection vers URL retournée. Pas de lecture `subscriptions`
4. **Suppression compte** : modal confirmation + saisie "SUPPRIMER" + Turnstile + POST EF `delete-account` (JWT + turnstile_token). Post-suppression : toast + logout + redirect
5. **Suppression profil enfant** : modal confirmation irréversible. Cascade DB. **Purge avatar Storage** séparément (pas couverte par CASCADE SQL). Dernier profil → refus DB
6. **Comptes non confirmés** : encourager confirmation email après signup
7. **Confettis** : affichés si `confetti_enabled = true` ET `reduced_motion = false`
8. **TrainProgressBar** : basée sur `done/total`, safe `total=0`, `reduced_motion` respecté
9. **TimeTimer** : local-only (localStorage). Visitor = OFF (aucune option). `reduced_motion` respecté
10. **Toasts** : contrôlés par `toasts_enabled`. Erreurs critiques = fallback inline. 1 toast à la fois. Compatibles lecteur d'écran

### Critères d'acceptation

- [ ] Préférences : lues/écrites depuis `account_preferences`, pas localStorage
- [ ] Bannière consentement : bug legacy corrigé (mode vs action séparés)
- [ ] Bannière : payload complet (mode, action, choices, ua, locale, app_version, origin, ts_client)
- [ ] Bannière : jamais en Tableau, symétrie CNIL, GA4 conditionnel
- [ ] Lien « Préférences cookies » : modification ultérieure fonctionnelle
- [ ] Stripe : redirection vers checkout/portal selon statut
- [ ] Suppression compte : modal + saisie + Turnstile + EF + logout + redirect
- [ ] Suppression profil : modal + cascade + purge avatar Storage + dernier profil interdit
- [ ] Confettis : respects `confetti_enabled` ET `reduced_motion`
- [ ] TimeTimer : Visitor = OFF, local-only, `reduced_motion` respecté
- [ ] Toasts : `toasts_enabled` respecté, fallback inline erreurs critiques

---

## S12 — Administration

> **Objectif** : routes admin pour statut Admin. Non visible pour les autres statuts.

### Référence contrat

- §3.3 (Contexte Administration)
- §8.10 (Administration)

### Migrations à lire

- Phase 7 : migrations 20-22 (admin RLS, admin_support_channel)
- Platform : migration P4 (admin_audit_log)

### Phase AUDIT

1. Identifier les routes admin existantes
2. Identifier tout code admin qui accède à des données interdites (images perso, données produit enfant)

### Phase ADAPT

1. **Guard** : routes admin accessibles uniquement si `accounts.status = 'admin'`. Non-admin → 404 (pas de "403 Forbidden" qui révèlerait l'existence)
2. **Scopes lecture** : comptes (identité min + statut), appareils, billing (`subscriptions`, `subscription_logs`), conformité (`consent_events`), quotas (agrégats)
3. **Scopes écriture** : `admin_audit_log` (append-only, reason obligatoire), `subscription_logs` (append-only), actions via EF dédiées
4. **Interdits** : accès images personnelles (Storage policies), lecture/édition données produit enfant, écriture directe sur tables produit, "set account status manual"
5. **Audit log** : toute action admin → INSERT `admin_audit_log`

### Critères d'acceptation

- [ ] Routes admin : uniquement statut Admin, 404 pour tous les autres
- [ ] Aucun accès images personnelles depuis admin
- [ ] Aucun accès données produit enfant depuis admin
- [ ] Toute action admin → entrée audit log
- [ ] Pas de "set account status manual"

---

## Récapitulatif des dépendances

```
S0 (Audit)
 └→ S1 (Auth)
     ├→ S2 (Profils + Sélecteur)
     │   └→ S4 (Timelines + Slots)
     │       └→ S5 (Sessions + Tableau)
     │           ├→ S6 (Verrouillage + Anti-choc)
     │           ├→ S7 (Séquençage)
     │           └→ S8 (Offline + Sync)
     ├→ S3 (Cartes + Catégories + Storage)
     │   ├→ S4 (utilise cartes dans slots)
     │   └→ S7 (utilise cartes dans séquences)
     ├→ S9 (Quotas + Downgrade) — dépend S1-S5
     ├→ S10 (Devices)
     ├→ S11 (Plateforme) — dépend S1
     └→ S12 (Admin) — dépend S11
```

**Chemin critique** : S0 → S1 → S2 → S4 → S5 → S6

**Parallélisables** (après S1) : S3 et S10 peuvent avancer en parallèle si nécessaire, mais le séquentiel est plus sûr.

---

## Rappels critiques pour chaque slice

Ces règles s'appliquent à TOUTES les slices sans exception :

1. **DB-first** : aucune règle métier critique côté front. La DB refuse/autorise.
2. **Pas de RBAC** : `accounts.status` = affichage uniquement.
3. **Tokens Sass** : aucune valeur CSS/Sass inventée. Réutiliser l'existant.
4. **3 systèmes distincts** : planning / jetons / séquençage. Jamais de fusion.
5. **Contexte Tableau** : RIEN de technique, réseau, quota, erreur.
6. **Anti-choc** : changements structurants = prochain Chargement Contexte Tableau.
7. **validated_at** : JAMAIS utilisé en logique (audit-only).
8. **Migrations** : lecture seule. Ne jamais modifier `supabase/migrations/`.
9. **NON SPÉCIFIÉ** : si le contrat marque quelque chose "NON SPÉCIFIÉ PAR LES SOURCES", ne pas inventer.
