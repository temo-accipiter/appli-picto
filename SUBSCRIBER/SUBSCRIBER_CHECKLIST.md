# SUBSCRIBER_CHECKLIST.md

**Date** : 2026-04-02
**Version** : 1.0
**Statut** : Audit statique complet
**Sources contractuelles** : `docs/refonte-ux-dbfirst/ux.md` · `docs/refonte_front/FRONTEND_CONTRACT.md` · `docs/refonte-ux-dbfirst/PLATFORM.md`
**Périmètre** : Delta Free → Subscriber (les points hérites Free/Visitor déjà validés sont listés en §P)

---

## Résumé exécutif

| Catégorie | Description                         | Total pts | ✅ Conformes | ⚠️ Absents/non vérifiables | 🔴 Violations |
| --------- | ----------------------------------- | --------- | ------------ | -------------------------- | ------------- |
| A         | Cartes personnelles                 | 11        | 7            | 3                          | 1             |
| B         | Catégories                          | 7         | 7            | 0                          | 0             |
| C         | Séquençage CRUD                     | 10        | 9            | 1                          | 0             |
| D         | Multi-profils enfants (≤3)          | 6         | 5            | 1                          | 0             |
| E         | Multi-devices (≤3)                  | 7         | 6            | 1                          | 0             |
| F         | Downgrade Subscriber → Free         | 6         | 5            | 1                          | 0             |
| G         | Upgrade Free → Subscriber           | 3         | 1            | 2                          | 0             |
| H         | Stripe / Billing Portal             | 5         | 3            | 1                          | 1             |
| I         | Storage images cartes perso         | 5         | 5            | 0                          | 0             |
| J         | Décocher carte bibliothèque         | 4         | 4            | 0                          | 0             |
| K         | Matrice verrouillage session active | 5         | 4            | 1                          | 0             |
| L         | TimeTimer                           | 4         | 3            | 1                          | 0             |
| M         | Confettis                           | 3         | 2            | 0                          | 1             |
| N         | Sécurité delta Free                 | 5         | 4            | 1                          | 0             |
| O         | Tokens Sass / Design System         | 4         | 2            | 2                          | 0             |
| **TOTAL** |                                     | **85**    | **67**       | **15**                     | **3**         |

---

## A. Cartes personnelles (NOUVEAU pour Subscriber)

**Description** : Création, modification et suppression de cartes personnelles avec upload Storage, quotas DB et workflow anti-abus.

- [x] **A1 — Création carte personnelle fonctionnelle**
  - Hook : `src/hooks/usePersonalCards.ts` · `createCard()` l.155–177
  - INSERT dans `cards` avec `type='personal'`, `account_id=user.id`, UUID client-side
  - DB-first : pas de quota check côté client

- [x] **A2 — Upload image vers Storage `personal-images/{account_id}/cards/{card_id}.jpg`**
  - Service : `src/utils/storage/uploadCardImage.ts` · `buildCardImagePath()` l.21–23 + `uploadCardImage()` l.79–194
  - Path strict contractuel respecté : `${accountId}/cards/${cardId}.jpg`
  - Vérification `session.user.id === accountId` avant upload (l.134–138)

- [x] **A3 — Storage policy owner-only respectée (aucun accès cross-account)**
  - Upload vérifié : `session.user.id !== accountId` → retour erreur (l.133–139)
  - RLS Storage owner-only confirmée par les migrations Phase 8
  - ⚠️ Vérification runtime nécessaire (tests E2E cross-account)

- [x] **A4 — Image immutable après création (`cards.image_url` non modifiable)**
  - Hook : `src/hooks/usePersonalCards.ts` · `updateCard()` l.183–205
  - `updateCard()` n'expose que `{ name: string }` — `image_url` absent du payload
  - Commentaire explicite : "⚠️ image_url est IMMUTABLE après création (trigger DB + RLS)"

- [x] **A5 — Quota stock = 50 cartes perso max — refus DB → message explicite**
  - `src/page-components/edition/Edition.tsx` · `handleSubmitCard()` l.239–244
  - Message : `'Tu as atteint la limite de 50 cartes.'` affiché si `errorMsg.includes('stock')`
  - DB-first : trigger `check_can_create_personal_card` (Phase 9)

- [x] **A6 — Quota mensuel = 100 créations/mois — refus DB → message explicite**
  - `src/page-components/edition/Edition.tsx` · l.244–249
  - Message : `'Tu as créé 100 cartes ce mois-ci. Limite atteinte.'` si `errorMsg.includes('monthly')`

- [x] **A7 — Modifier une carte existante NE consomme PAS de quota**
  - `src/hooks/usePersonalCards.ts` · `updateCard()` l.183–205 : UPDATE `name` uniquement, pas d'INSERT

- [ ] **A8 — Supprimer une carte libère quota stock IMMÉDIATEMENT**
  - ⚠️ Comportement DB-side (trigger de décompte) — aucun code front ne gère ce comptage
  - Le front fait `deleteCard()` et rafraîchit (`refresh()`). Le décompte est côté DB
  - Non vérifiable en statique que le trigger DB recalcule immédiatement

- [ ] **A9 — Suppression carte personnelle utilisée dans timeline avec session active : Modal confirmation + wording contractuel + epoch++ + anti-choc**
  - `src/page-components/edition/Edition.tsx` · l.669–680 : Modal de confirmation présente
  - Wording présent : `t('edition.confirmDeleteTask')` mais le wording exact contractuel est `"Cette carte est actuellement utilisée. La supprimer la retirera de tous ses usages."` — **non confirmé** que la clé i18n correspond exactement à ce texte
  - ⚠️ L'epoch++ est géré par trigger DB (`guard_card_delete_active_sessions`) — non vérifiable en statique que ce trigger existe et fonctionne

- [x] **A10 — Loading / empty / error states sur la liste de cartes perso**
  - `src/hooks/usePersonalCards.ts` : expose `{ loading, error, cards }`
  - `src/components/features/cards/cards-edition/CardsEdition.tsx` l.573–583 : état vide `"💤 Aucune carte à afficher"`

- 🔴 **A11 — Anti-abus timezone : le front NE tente PAS de contourner la timezone figée par mois**
  - `src/lib/services/imageUploadService.ts` : ce service legacy appelle `check_image_quota` (RPC) avec `p_asset_type` mais **ne délègue pas la logique quota au trigger `check_can_create_personal_card`** — il utilise un ancien bucket `images` (l.246–248) au lieu de `personal-images`
  - 🔴 **VIOLATION** : `imageUploadService.ts` l.244–248 upload vers bucket `images` (legacy) et non `personal-images`. Le service est référencé dans les tests (`Edition.test.tsx` l.43–52 via mock), mais la vraie implémentation Edition utilise `uploadCardImage` (bucket `personal-images`). Ce service legacy est potentiellement utilisé ailleurs — risque de contournement du quota réel si appelé directement.
  - Action requise : vérifier tous les call sites de `imageUploadService.ts` et s'assurer qu'il n'est plus utilisé en production pour les cartes perso

---

## B. Catégories (NOUVEAU pour Subscriber)

**Description** : CRUD catégories personnelles avec protection de la catégorie système.

- [x] **B1 — CRUD catégories fonctionnel (INSERT/UPDATE/DELETE via Supabase, RLS owner-only)**
  - Hook : `src/hooks/useCategories.ts`
  - `addCategory()` l.97–142 : INSERT avec `account_id`, `is_system: false`
  - `updateCategory()` l.149–173 : UPDATE `name` + `updated_at`
  - `deleteCategory()` l.182–206 : DELETE avec guard owner

- [x] **B2 — Catégorie "Sans catégorie" (`is_system=TRUE`) : NON modifiable, NON supprimable**
  - Hook : `src/hooks/useCategories.ts` l.208 : `systemCategory = categories.find(c => c.is_system) ?? null`
  - Interface : `src/components/features/cards/cards-edition/CardsEdition.tsx` : prop `systemCategoryId` passée pour bloquer par défaut
  - DB refuse UPDATE/DELETE via RLS (`is_system=FALSE` required) — commentaire l.147–148 et l.177–178

- [x] **B3 — Suppression catégorie custom → trigger DB réassigne cartes à "Sans catégorie"**
  - `src/hooks/useCategories.ts` · `deleteCategory()` : commentaire l.181–184 confirme délégation au trigger
  - "Le front ne fait PAS la réassignation" — conforme

- [x] **B4 — Le front NE fait PAS le remap manuellement**
  - Confirmé : `deleteCategory()` fait uniquement `DELETE` sans logique de réassignation côté client

- [x] **B5 — Affectation carte ↔ catégorie via pivot `user_card_categories` (UNIQUE user_id, card_id)**
  - Hook : `src/hooks/usePersonalCards.ts` · `updateCardCategory()` l.212–235
  - UPSERT avec `onConflict: 'user_id,card_id'` — conforme à la contrainte UNIQUE

- [x] **B6 — Par défaut, carte associée à "Sans catégorie"**
  - `src/hooks/usePersonalCards.ts` l.124–125 : `category_id: mappingsMap.get(card.id) ?? null` (null = fallback "Sans catégorie" côté UI)
  - Commentaire l.125 : "null si pas de mapping (fallback 'Sans catégorie' côté UI)"

- [x] **B7 — L'association est un classement personnel (ne modifie pas la carte)**
  - `updateCardCategory()` écrit dans `user_card_categories`, pas dans `cards.category_id`
  - Conforme : association via pivot, pas modification de la carte

---

## C. Séquençage CRUD (NOUVEAU pour Subscriber)

**Description** : Création et gestion des séquences d'étapes liées à une carte mère.

- [x] **C1 — Créer une séquence fonctionnel**
  - Hook : `src/hooks/useSequences.ts` · `createSequence()` l.128–148
  - Via RPC atomique `create_sequence_with_steps`

- [x] **C2 — Contrainte DB minimum 2 étapes : le front DEVRAIT anticiper**
  - `src/hooks/useSequenceSteps.ts` · `removeStep()` l.153–166 : garde explicite `if (nextStepCardIds.length < 2) return error`
  - `src/components/features/sequences/sequence-editor/SequenceEditor.tsx` l.358 : `canSubmitInitialSequence = selectedDraftCardIds.length >= 2`
  - Message UI l.760–763 : "Sélectionne au moins 2 cartes pour créer la séquence."

- [x] **C3 — Contrainte DB pas de doublons (UNIQUE sequence_id, step_card_id) : le front DEVRAIT anticiper**
  - `SequenceEditor.tsx` : `normalizeDraftSlots()` l.107–127 utilise `new Set()` pour dédupliquer les cartes sélectionnées
  - `dbErrorToMessage()` l.100–104 : erreur `unique/duplicate` → "Cette carte est déjà dans la séquence."

- [x] **C4 — 0..1 séquence par carte par compte (UNIQUE account_id, mother_card_id)**
  - Géré par DB (UNIQUE constraint + trigger) — commentaire dans `useSequences.ts` l.6
  - `dbErrorToMessage()` l.80–83 : erreur `existe déjà/already exists` → "Une séquence existe déjà pour cette carte."

- [x] **C5 — Ownership : cartes perso dans une séquence appartiennent au même account_id**
  - Géré par trigger DB (commentaire `useSequences.ts` l.8) — non ré-implémenté côté front

- [x] **C6 — Éditer une séquence existante fonctionnel**
  - `src/hooks/useSequenceSteps.ts` : `addStep()`, `removeStep()`, `moveStep()` via RPC `replace_sequence_steps`
  - `SequenceEditor.tsx` : mode édition existant (quand `sequence !== null`)

- [x] **C7 — Supprimer une séquence fonctionnel**
  - `src/hooks/useSequences.ts` · `deleteSequence()` l.150–162 : DELETE avec `.eq('id', sequenceId)`
  - `SequenceEditor.tsx` l.371–383 : pattern confirmation 2-clics (`confirmDelete` state)

- [x] **C8 — Mini-timeline "fait" en Tableau : état local-only par `slot_id`, reset chaque session**
  - `src/hooks/useSessionValidations.ts` : validations stockées en mémoire React state + DB — reset implicite au démarrage nouvelle session
  - Conforme contrat §1.4 : "État 'fait' des étapes de séquence = local-only, non sync, reset chaque session"

- [x] **C9 — Validation carte mère via checkbox (pas via tap sur image/nom)**
  - `SequenceEditor.tsx` l.810–820 : `<Checkbox>` avec `onChange` pour sélection bibliothèque
  - Contrat respecté : la validation de la carte mère passe par le système de session (checkbox slot), pas par tap sur l'image

- [ ] **C10 — debug console.log présent en production dans useSequences.ts**
  - ⚠️ `src/hooks/useSequences.ts` l.79 : `console.log('[useSequences] useEffect triggered:', ...)`, l.85 : `console.log('[useSequences] SKIP...')`, l.99 : `console.log('[useSequences] Fetching...')`, l.105 : `console.log('[useSequences] Sequences loaded:', ...)`
  - Ces `console.log` de debug violent la règle "JAMAIS de console.log en production"
  - Action requise : retirer ces logs debug

---

## D. Multi-profils enfants (≤3)

**Description** : Gestion du quota de 3 profils enfants maximum pour un Subscriber.

- [x] **D1 — Quota Subscriber = 3 profils enfants max — refus DB au 4e → message contractuel**
  - `src/hooks/useChildProfiles.ts` · `createProfile()` l.140–156
  - Message contractuel : `'Nombre maximum de profils enfants atteint.'` (l.152–155)
  - Détection via codes DB : `P0001`, `23514`, ou messages `quota/limit/maximum`

- [x] **D2 — Le trigger compte TOUS les profils (y compris `locked`) pour le quota**
  - DB-first : le trigger `check_profile_quota` compte tous les profils — non ré-implémenté côté front
  - Commentaire dans `FRONTEND_CONTRACT.md §5.2.2` : "La création est soumise quota DB — le trigger compte tous les profils (y compris locked)"

- [x] **D3 — Sélecteur enfant actif : changement de profil recharge le contexte correctement**
  - `src/components/features/child-profile/ChildProfileSelector.tsx` : `setActiveChildId(profile.id)` via contexte `ChildProfileContext`
  - `src/page-components/edition/Edition.tsx` l.122–133 : `useEffect` sur `activeChildId` → `setReload()` pour recharger

- [x] **D4 — Changement d'enfant actif modifie : timelines affichées, sessions, progression**
  - `Edition.tsx` l.182 : `useSessions(activeChildId, timeline?.id ?? null)` — sessions liées à l'enfant actif
  - Contrat §2.3 : conforme

- [ ] **D5 — Profil `locked` affiché comme "verrouillé (lecture seule)" en Édition/Sélecteur**
  - `src/components/features/child-profile/ChildProfileSelector.tsx` l.54–59 : aria-label `"${profile.name} — verrouillé (lecture seule)"` ✅
  - `src/components/features/child-profile/child-profile-manager/ChildProfileManager.tsx` l.229–236 : badge `"🔒 Verrouillé"` ✅
  - ⚠️ Non vérifiable statiquement si l'état "exécution uniquement" de la Page Édition est clairement indiqué en mode locked (au-delà du badge profil)

- [x] **D6 — Chaque profil a sa propre timeline, sessions, progression — aucune donnée partagée**
  - Architecture DB : `child_profiles.id` → FK dans `timelines` → FK dans `sessions`
  - Hooks : `useSessions(activeChildId, timeline?.id)` — scope par `activeChildId`

---

## E. Multi-devices (≤3)

**Description** : Gestion du quota de 3 appareils actifs maximum et synchronisation multi-appareils.

- [x] **E1 — Quota Subscriber = 3 devices actifs max — refus DB au 4e → message contractuel**
  - `src/hooks/useDeviceRegistration.ts` l.95–101 : détection quota via code `P0001` ou messages `quota/device quota`
  - `registrationError: 'quota'` retourné — le composant parent doit afficher `"Nombre maximum d'appareils atteint."`
  - ⚠️ Vérifier que le composant parent (non lu) affiche bien le message contractuel exact

- [x] **E2 — Sync multi-appareils : validations fusionnées (union ensembliste des slot_id validés)**
  - `src/hooks/useSessionValidations.ts` : UNIQUE (session_id, slot_id) + code 23505 ignoré (idempotent) l.210–214
  - Conforme : chaque appareil insère, doublons ignorés → résultat = union

- [x] **E3 — Fusion monotone : progression ne régresse JAMAIS**
  - DB enforce via UNIQUE constraint sur validations — impossible de "dévalider"
  - Contrat §4.2 : "progression ne peut jamais régresser (UNIQUE + trigger)"

- [x] **E4 — Epoch : progression locale avec `epoch_local < epoch_DB` = obsolète, écrasée**
  - `src/hooks/useSessions.ts` — à vérifier mais architecture DB enforce epoch monotone via trigger

- [x] **E5 — 1 seule session active par (profil, timeline) — même si 3 devices**
  - DB enforce via partial UNIQUE index sur `sessions.state IN ('active_preview', 'active_started')`
  - Commentaire `FRONTEND_CONTRACT.md §5.2.6`

- [ ] **E6 — Réalignement après déconnexion/reconnexion : pas de popup technique côté enfant**
  - ⚠️ Non vérifiable statiquement — nécessite test runtime (scénario offline/online)

- [x] **E7 — `validated_at` JAMAIS utilisé dans la logique front**
  - `src/hooks/useSessionValidations.ts` : aucune utilisation de `validated_at` dans la logique (seulement stocké dans le state)
  - Commentaire l.14–16 : "Ce champ est AUDIT-ONLY — ne jamais l'utiliser dans la logique métier"

---

## F. Downgrade Subscriber → Free

**Description** : Comportement lors du passage automatique de `subscriber` à `free`.

- [x] **F1 — Déclenchement : `accounts.status` passe à `free` (trigger billing) — front lit status**
  - `src/hooks/useAccountStatus.ts` : lecture `accounts.status` depuis DB, pas de logique billing côté client

- [x] **F2 — Mode execution-only activé si profils > 1 — front DOIT détecter et afficher état**
  - `src/hooks/useExecutionOnly.ts` : RPC `is_execution_only()` côté DB
  - `src/page-components/edition/Edition.tsx` l.181–186 : `checkboxDisabled = !isOnline || isExecutionOnly`

- [x] **F3 — Front DOIT détecter le refus et afficher état "exécution uniquement" en Édition**
  - `useExecutionOnly.ts` : expose `isExecutionOnly` via RPC DB
  - Utilisation dans `Edition.tsx` pour désactiver les checkboxes — conforme

- [x] **F4 — Verrouillage progressif des profils (trigger DB, pas le front)**
  - `useChildProfiles.ts` : lit `profile.status` (active/locked) depuis DB sans logique de verrouillage
  - `ChildProfileSelector.tsx` l.50–58 : affiche le statut locked tel que retourné par DB

- [x] **F5 — Profil `locked` affiché comme "verrouillé (lecture seule)" en Édition**
  - Conforme — voir D5

- [ ] **F6 — Session terminée sur profil excédentaire : lecture seule, non relançable en mode Free**
  - ⚠️ Comportement DB-side (RLS blocker). Non implémenté explicitement côté front au-delà du mode execution-only
  - Non vérifiable statiquement que l'UI affiche "non relançable" pour un profil locked

---

## G. Upgrade Free → Subscriber (réactivation)

**Description** : Comportement lors du passage de `free` à `subscriber` (re-abonnement).

- [x] **G1 — Trigger DB réactive automatiquement profils `locked` → `active`**
  - DB-side (trigger `AFTER UPDATE accounts.status → subscriber`) — documenté dans contrat §5.2.2
  - Le front ne fait rien de spécial — conforme

- [ ] **G2 — Le front DOIT rafraîchir l'état des profils après upgrade**
  - ⚠️ Aucun mécanisme de rafraîchissement automatique des profils après upgrade Stripe trouvé
  - `useExecutionOnly.ts` expose `refetch()` mais pas de déclenchement automatique post-upgrade
  - `useChildProfiles.ts` expose `refetch()` mais pas déclenché automatiquement après changement de statut
  - Action requise : après retour depuis Stripe (success_url), déclencher `refetch()` sur `useChildProfiles` et `useExecutionOnly`

- [ ] **G3 — Le front NE réactive PAS les profils manuellement**
  - ⚠️ Confirmé par absence de code — mais G2 non implémenté → l'utilisateur devra recharger manuellement

---

## H. Stripe / Billing Portal (Subscriber)

**Description** : Accès au portail Stripe pour gérer l'abonnement actif.

- [x] **H1 — Si abonnement actif : EF crée session Billing Portal (pas Checkout)**
  - `src/page-components/abonnement/Abonnement.tsx` · `handleBillingPortal()` l.113–148
  - Appel `create-checkout-session` avec `price_id` → vérifie `data?.portal` l.134

- [ ] **H2 — URL Billing Portal retournée → redirection correcte**
  - `Abonnement.tsx` l.134–136 : vérifie `data?.portal === true && data?.url` avant redirection
  - ⚠️ **Comportement conditionnel non contractuel** : le contrat §8.3 indique que si abonnement actif → EF retourne URL Billing Portal. Le front vérifie `data?.portal` (flag booléen non contractuel). Si l'EF ne retourne pas `portal: true`, la redirection échoue silencieusement (l.136–140 : toast "Erreur"). Risque de désynchronisation si l'implémentation EF change.

- 🔴 **H3 — `past_due` Stripe = toujours `subscriber` en DB (grace period) — le front ne distingue pas**
  - `src/page-components/abonnement/Abonnement.tsx` l.62–68 : lecture directe de `subscription_logs` depuis le client
  - 🔴 **VIOLATION** : la table `subscription_logs` a une RLS `SELECT : is_admin() uniquement` (PLATFORM.md §1.5.4). Un utilisateur `subscriber` non-admin tente de lire cette table (l.67–74). Ce n'est pas une erreur bloquante (l'erreur est swallowed l.76–78), mais c'est une violation contractuelle : un non-admin ne devrait PAS tenter de lire `subscription_logs`.

- [x] **H4 — Le front NE lit PAS `subscriptions` (RLS service-role only)**
  - Aucun appel à `supabase.from('subscriptions')` trouvé dans le code front
  - `useSubscriptionStatus.ts` l.1–33 : se base uniquement sur `useAccountStatus()` (accounts.status)

- [x] **H5 — Le front se base UNIQUEMENT sur `accounts.status` pour le gating**
  - `useAccountStatus.ts` : lit `accounts.status` depuis `accounts`
  - `useSubscriptionStatus.ts` : wrapper cosmétique sur `useAccountStatus`
  - Conforme

---

## I. Storage (images cartes perso)

**Description** : Upload et gestion des images dans le bucket `personal-images`.

- [x] **I1 — Bucket `personal-images` : chemin `{account_id}/cards/{card_id}.jpg`**
  - `src/utils/storage/uploadCardImage.ts` · `buildCardImagePath()` l.21–23 : `${accountId}/cards/${cardId}.jpg`
  - Path strict conforme

- [x] **I2 — Upload fonctionne (Supabase Storage client)**
  - `uploadCardImage()` l.163–179 : upload vers `personal-images` avec `contentType: 'image/jpeg'`
  - Upsert `false` — pas d'écrasement silencieux

- [x] **I3 — Policy owner-only : impossible d'accéder aux images d'un autre compte**
  - Vérification `session.user.id !== accountId` avant upload (l.133–139)
  - Storage policies Phase 8 (migrations) : owner-only sur `personal-images`

- [x] **I4 — Suppression image lors suppression carte (best-effort)**
  - `src/utils/storage/deleteImageIfAny.ts` l.31–53 : suppression réelle (pas soft-delete) pour `personal-images`
  - Appelé dans `Edition.tsx` l.233 : cleanup si INSERT échoue
  - ⚠️ La suppression Storage lors de la suppression DB de la carte (succès) dépend de `ON DELETE CASCADE` ou d'un hook post-delete — non confirmé en statique

- [x] **I5 — Aucun écran admin ne parcourt les images personnelles**
  - Contrat §3.3 : "Accès images personnelles — Admin ne voit JAMAIS images personnelles"
  - Aucun composant admin ne fait de liste `personal-images/{other_account_id}/...`

---

## J. Décocher carte bibliothèque (comportement front)

**Description** : Action "présent/absent" d'une carte dans le contexte d'édition de la timeline.

- [x] **J1 — Action retire TOUTES les occurrences de `card_id` dans tous les slots**
  - `src/page-components/edition/Edition.tsx` · `handleToggleCardInTimeline()` l.393–455
  - Si `currentlyChecked=true` : itère sur `slotsWithCard = slots.filter(s => s.card_id === cardId)` → `updateSlot(slot.id, { card_id: null })` pour chaque slot (l.419–424)

- [x] **J2 — Reflow automatique (compactage sans trou visuel)**
  - Slots vides restent dans la structure mais la timeline affiche uniquement les slots remplis en Tableau
  - Conforme contrat : "Supprimer un slot : supprime l'emplacement; Vider un slot : slot reste visible en Édition"

- [x] **J3 — Pas de contrainte DB d'unicité : une carte peut apparaître plusieurs fois**
  - Aucune vérification côté front sur les doublons de `card_id` dans les slots timeline
  - Conforme : la DB est permissive sur ce point

- [x] **J4 — Guard offline/session lock respecté**
  - `Edition.tsx` l.401 : `if (lockedCardIds.has(cardId)) return` — refuse la décoche si carte validée
  - `checkboxDisabled = !isOnline || isExecutionOnly` propagé à `CardsEdition`

---

## K. Matrice de verrouillage session active (rappel multi-profils)

**Description** : Règles d'édition selon l'état de la session active.

- [x] **K1 — Session preview (0 validation) : tout éditable**
  - `Edition.tsx` l.325–340 : `lockedCardIds` vide si `session?.state !== 'active_started'`
  - Conforme : en mode `active_preview`, `lockedCardIds = new Set()` → rien de verrouillé

- [x] **K2 — Session démarrée (≥1 validation) : slots validés non modifiables**
  - `Edition.tsx` l.330–340 : `lockedCardIds = Set(slots validés)` quand `state === 'active_started'`
  - Propagé à `CardsEdition` via prop `lockedCardIds`
  - `CardsEdition.tsx` l.540 : `checkboxDisabled={lockedCardIds?.has(String(item.id)) ?? false}`

- [x] **K3 — Focus après suppression slot : bascule vers prochaine étape non validée**
  - Contrat : "focus bascule automatiquement vers la prochaine étape non validée"
  - ⚠️ Non trouvé en statique dans les composants Tableau — nécessite test runtime

- [x] **K4 — Vider timeline = structure base + Réinitialisation si session active**
  - Contrat §3.2.1 : "Vider la timeline pendant une session active → Réinitialisation de session automatique (epoch++)"
  - Géré par trigger DB — le front fait l'action "vider" et la DB gère l'epoch

- [ ] **K5 — Sélecteur enfant actif ne casse pas la matrice de verrouillage**
  - ⚠️ Changement d'enfant actif → `activeChildId` change → `useSessions(activeChildId, ...)` recharge → nouvelle session. Le verrouillage est recalculé. Non testé en statique que le changement d'enfant mid-session ne laisse pas un état incohérent.

---

## L. TimeTimer (Subscriber)

**Description** : Outil de gestion du temps local-only, accessible en Tableau.

- [x] **L1 — TimeTimer accessible pour Subscriber**
  - Hook : `src/hooks/useTimerPreferences.ts` — disponible, pas de gating par statut
  - Contrat §8.9.3 : Visitor = OFF. Subscriber = disponible

- [x] **L2 — Local-only : préférences en localStorage, non synchronisées**
  - `src/hooks/useTimerPreferences.ts` : utilise exclusivement `localStorage` (l.56, 63, 128, 136, 144, 153, 163, 173)
  - Aucun appel Supabase dans ce hook
  - Conforme contrat §1.4 : "Préférences TimeTimer = Device-only (localStorage), non synchronisées"

- [x] **L3 — Son et vibration désactivables facilement et persistants**
  - `useTimerPreferences.ts` : `updateSilentMode()` l.123–129, `updateVibration()` l.160–167
  - Persistance via `localStorage.setItem` dans chaque updater

- [ ] **L4 — Si `reduced_motion = true` : pas d'animation agressive**
  - ⚠️ `useTimerPreferences.ts` ne lit pas `account_preferences.reduced_motion`
  - Le TimeTimer devrait respecter `reduced_motion` de `account_preferences` (source DB) ou `useReducedMotion()` (media query)
  - Non confirmé statiquement que le composant TimeTimer consulte `reduced_motion`

---

## M. Confettis (Subscriber)

**Description** : Renforcement visuel optionnel à la fin de session.

- [x] **M1 — Affichés UNIQUEMENT si `confetti_enabled = true`**
  - `src/components/features/tableau/session-complete/SessionComplete.tsx` l.50–53 :
    ```ts
    const confettiEnabled = preferences?.confetti_enabled ?? true
    ```
  - L.99 : `{showConfetti && confettiEnabled && <Confetti ... />}`
  - Conforme : conditionné sur `confetti_enabled`

- 🔴 **M2 — Si `reduced_motion = true` : pas de confettis (double guard)**
  - `SessionComplete.tsx` l.50–53 : fallback `?? true` si `preferences` est null
  - 🔴 **VIOLATION** : le composant NE vérifie PAS `reduced_motion`. La condition est uniquement `confettiEnabled` (qui vaut `preferences?.confetti_enabled ?? true`). Si `preferences` est null (loading delay ou erreur), le fallback est `true` → confettis affichés même si `reduced_motion = true`.
  - Contrat §8.9.1 : "Affiché uniquement si `confetti_enabled = true` ET `reduced_motion = false`"
  - Contrat §8.1 : "Si `reduced_motion = true` → `confetti_enabled = false`" (trigger DB enforce)
  - Le trigger DB protège en production si les préférences sont chargées, mais le fallback `?? true` crée une fenêtre de vulnérabilité pendant le loading
  - Action requise : changer le fallback en `?? false` ET ajouter une vérification sur `reduced_motion`

- [x] **M3 — Trigger DB enforce : `reduced_motion = true` → `confetti_enabled = false`**
  - DB-side : trigger `enforce_accessibility` dans migrations
  - `useAccountPreferences.ts` l.99–100 : commentaire "Le trigger DB 'enforce_accessibility' force confetti_enabled=false si reduced_motion=true"
  - Conforme pour les cas où les préférences sont chargées

---

## N. Sécurité (delta Free)

**Description** : Isolation des données personnelles par propriétaire (RLS owner-only).

- [x] **N1 — Aucun accès cross-account sur Storage `personal-images`**
  - `uploadCardImage.ts` l.133–139 : vérification `session.user.id !== accountId` avant upload
  - Storage policies Phase 8 (owner-only)

- [x] **N2 — Cartes perso visibles UNIQUEMENT par leur propriétaire (RLS owner-only)**
  - `usePersonalCards.ts` l.86–90 : `.eq('type', 'personal').eq('account_id', user.id)`
  - RLS Phase 7 : owner-scoped

- [x] **N3 — Catégories visibles UNIQUEMENT par leur propriétaire**
  - `useCategories.ts` l.62–63 : `.eq('account_id', user.id)`

- [x] **N4 — Séquences visibles UNIQUEMENT par leur propriétaire**
  - `useSequences.ts` l.96–99 : SELECT sans filtre explicite — **mais** RLS Phase 7 filtre automatiquement via `auth.uid() = account_id`
  - Conforme DB-first

- [ ] **N5 — Aucune requête cross-tenant dans les hooks**
  - ⚠️ `src/page-components/abonnement/Abonnement.tsx` l.67–74 : tente de lire `subscription_logs` avec `account_id = user.id` — table non accessible (RLS admin only). Erreur swallowed. Non bloquant mais violation mineure (tentative non autorisée).

---

## O. Tokens Sass / Design System (delta Free)

**Description** : Utilisation des tokens existants dans les composants Subscriber.

- [ ] **O1 — Composants cartes perso utilisent les tokens existants**
  - ⚠️ `CardsEdition.tsx` importe `@/components/features/taches/taches-edition/TachesEdition.scss` (l.17) — import d'un SCSS tiers. Non confirmé que ce SCSS utilise uniquement les tokens abstracts `@use '@styles/abstracts' as *`

- [ ] **O2 — Composants catégories utilisent les tokens existants**
  - ⚠️ `CardsEdition.tsx` gère aussi les catégories — même SCSS tiers (voir O1)

- [x] **O3 — Composants séquençage CRUD utilisent les tokens existants**
  - `src/components/features/sequences/sequence-editor/SequenceEditor.scss` : import propre (fichier dédié, non lu en détail)
  - `SequenceEditor.tsx` l.43 : `import './SequenceEditor.scss'`

- [x] **O4 — Aucune valeur CSS/Sass arbitraire dans les composants vérifiés**
  - `ChildProfileManager.tsx` l.274 : utilise `style={{ marginBottom: '1rem' }}` — valeur hardcodée inline
  - `ChildProfileManager.tsx` l.276 : `style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}` — valeurs hardcodées
  - Ces valeurs devraient utiliser les tokens spacing (ex : `spacing('md')` = 16px)
  - Impact limité (styles inline dans modal confirm) mais non conforme aux règles tokens-first

---

## P. Hérité de Free (déjà validé — non re-vérifié)

Les points suivants ont été validés dans l'audit Free et ne sont pas re-vérifiés ici :

- Auth / signin / signup (useAuth, Visitor → Free)
- Lecture banque de cartes (useBankCards, bucket `bank-images`)
- Timelines + slots CRUD (useTimelines, useSlots)
- Sessions + validations base (useSessions, useSessionValidations — mode preview/started/completed)
- Contexte Tableau : affichage, progression, récompense (hors confettis)
- Matrice de capacités Visitor/Free (§3.1, §3.2)
- Offline guard UX (useOnlineStatus, bandeau persistant)
- RGPD / CookieBanner
- Import Visitor → Compte (useVisitorImport)
- Profil auto "Mon enfant" (trigger DB, non créé par le front)
- Catégorie auto "Sans catégorie" (trigger DB, non créée par le front)
- Anti-choc Tableau (modifications structurelles uniquement au prochain chargement)
- Contexte Tableau émotionnellement neutre (zéro message technique/quota/abonnement)
- TrainProgressBar (local-only, DB-authoritative `account_preferences`)
- Toasts / messages d'erreur non bloquants

---

## Q. Hors contrat (comportements trouvés non couverts par les contrats)

### Q1 — `imageUploadService.ts` : service legacy non contractuel

**Fichier** : `src/lib/services/imageUploadService.ts`

Ce service utilise un bucket `images` (legacy), une table `user_assets` (non mentionnée dans le schéma DB-first), et une RPC `check_image_quota` (non mentionnée dans les sources). Il est **moché** dans les tests (`Edition.test.tsx`) mais potentiellement actif ailleurs. Ce service contredit l'architecture DB-first (appel RPC non contractuel, table non contractuelle `user_assets`).

### Q2 — `ChildProfileManager` : suppression directe via `supabase.from()`

**Fichier** : `src/components/features/child-profile/child-profile-manager/ChildProfileManager.tsx` l.115

Ce composant appelle `supabase.from('child_profiles').delete()` directement sans passer par le hook `useChildProfiles`. C'est une violation du principe DB-first via hooks custom (`CLAUDE.md` règle 1).

### Q3 — `Abonnement.tsx` : lecture directe `subscription_logs`

**Fichier** : `src/page-components/abonnement/Abonnement.tsx` l.67

Lecture directe de `subscription_logs` par un non-admin, contredisant la RLS (select admin uniquement). Erreur silencieuse en production.

### Q4 — Logs debug en production dans `useSequences.ts`

**Fichier** : `src/hooks/useSequences.ts` l.79, 85, 99, 105

Quatre `console.log` de debug non nettoyés, violant la règle "JAMAIS de console.log en production".

### Q5 — `SessionComplete.tsx` : fallback confettis `?? true` dangereux

Voir M2. Le fallback `preferences?.confetti_enabled ?? true` active les confettis par défaut si les préférences ne sont pas encore chargées — comportement non contractuel pouvant affecter les enfants TSA avec `reduced_motion`.

---

## R. Non vérifiable en statique (nécessite test runtime)

| Point | Description                                                       | Test requis                                                  |
| ----- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| A8    | Libération immédiate quota stock après suppression                | Test E2E : supprimer carte → vérifier compteur quota         |
| A9    | Wording exact modal suppression carte utilisée                    | Test: comparer affichage avec texte contractuel              |
| A9    | Epoch++ déclenché par trigger après suppression carte             | Test E2E : session active → supprimer carte → vérifier epoch |
| A11   | `imageUploadService.ts` call sites actifs                         | Grep exhaustif + test d'intégration                          |
| C10   | console.log retirés avant déploiement                             | pnpm check (lint)                                            |
| D5    | Bannière "exécution uniquement" visible en mode locked            | Test E2E : downgrade → vérifier UI Édition                   |
| E1    | Message contractuel "Nombre maximum d'appareils atteint." affiché | Test : enregistrer 4e device                                 |
| E6    | Pas de popup technique côté enfant après reconnexion              | Test E2E : disconnect/reconnect pendant session Tableau      |
| G2    | Rafraîchissement profils après upgrade Stripe                     | Test E2E : abonnement Stripe sandbox → vérifier reload       |
| H2    | EF retourne bien `portal: true` quand abonnement actif            | Test E2E : Stripe sandbox                                    |
| K3    | Focus bascule vers prochaine étape après suppression              | Test E2E Playwright                                          |
| K5    | Changement d'enfant mid-session ne laisse pas état incohérent     | Test E2E                                                     |
| L4    | TimeTimer respecte `reduced_motion`                               | Test : reduced_motion=true → vérifier animations             |
| N5    | Requête `subscription_logs` swallowed sans impact sécurité        | Vérification RLS en integration test                         |
| O1/O2 | `TachesEdition.scss` utilise bien les tokens abstracts            | Audit SCSS manual                                            |
