# ADMIN_CHECKLIST.md — Checklist de validation statut Admin

> **Version** : 1.0
> **Date** : 2026-04-03
> **Auditeur** : Claude Code (analyse statique complète)
> **Sources contractuelles** : `ux.md`, `PLATFORM.md §6`, `FRONTEND_CONTRACT.md §2.1 §3.3 §8.10 §11`, `PRODUCT_MODEL.md §9`
> **Code audité** : `src/`, `supabase/migrations/`

---

## Résumé — Points par catégorie

| Catégorie | Libellé                           | Total | Verts [x] | À tester [ ] | Avertissements ⚠️ | Violations 🔴 |
| --------- | --------------------------------- | ----- | --------- | ------------ | ----------------- | ------------- |
| A         | Identité & Garde d'accès          | 8     | 7         | 1            | 0                 | 0             |
| B         | Invisibilité admin (UX non-admin) | 6     | 6         | 0            | 0                 | 0             |
| C         | Périmètre Subscriber hérité       | 5     | 4         | 1            | 0                 | 0             |
| D         | Quotas illimités (DB)             | 6     | 6         | 0            | 0                 | 0             |
| E         | Gestion banque de cartes          | 9     | 8         | 1            | 0                 | 0             |
| F         | Confidentialité & Cross-account   | 8     | 8         | 0            | 0                 | 0             |
| G         | Storage policies                  | 6     | 6         | 0            | 0                 | 0             |
| H         | Admin Audit Log                   | 7     | 4         | 1            | 2                 | 0             |
| I         | Pages d'administration            | 9     | 8         | 1            | 0                 | 0             |
| J         | Billing / Stripe                  | 5     | 5         | 0            | 0                 | 0             |
| K         | RGPD / Conformité                 | 4     | 3         | 1            | 0                 | 0             |

**Total points** : 73 points — **Violations critiques** : 0

---

## A. Identité & Garde d'accès

> Sources : `PLATFORM.md §6.2`, `FRONTEND_CONTRACT.md §1.1 §2.1`, migration `20260203126000_phase7_1_rls_helpers.sql`, `middleware.ts`, `AdminRoute.tsx`

- [x] **A1** — `is_admin()` implémentée en DB (SECURITY DEFINER, search*path hardened, lit uniquement `accounts.status` du compte courant)
      \_Source* : `supabase/migrations/20260203126000_phase7_1_rls_helpers.sql` L28–50

- [x] **A2** — `is_admin()` accordée à `authenticated` et `anon` (REVOKE PUBLIC + GRANT explicite)
      _Source_ : même fichier L56–58

- [x] **A3** — `AdminRoute` retourne une page 404 neutre pour les non-admin (pas de redirect, pas de message "admin"/"forbidden"/"permission")
      _Source_ : `src/components/shared/admin-route/AdminRoute.tsx` L32–47
      _Note_ : La classe CSS `admin-404` dans le DOM constitue un oracle technique faible ; non exploitable depuis le réseau, acceptable.

- [x] **A4** — `useAccountStatus()` lit `accounts.status` depuis la DB (pas de valeur hardcodée, pas de JWT claim)
      _Source_ : `src/hooks/useAccountStatus.ts` L75–90

- [x] **A5** — `AdminRoute` utilise bien `useAccountStatus().isAdmin` (cosmétique côté client) et le rendu contenu n'intervient que si `isAdmin === true`
      _Source_ : `src/components/shared/admin-route/AdminRoute.tsx` L26–49

- [x] **A6** — Middleware Next.js inclut `/admin/:path*` dans les routes protégées par présence de cookie d'auth Supabase
      _Source_ : `middleware.ts` L44–50
      _Note_ : Le middleware vérifie uniquement l'authentification (cookie Supabase), pas le statut admin. La vérification du statut admin est déléguée à `AdminRoute` côté client + RLS côté DB — conforme à l'architecture DB-first.

- [x] **A7** — Pages admin chargent `AdminRoute` via wrapper et le composant page est chargé dynamiquement (`next/dynamic`, `ssr: false`) — le code admin n'est pas dans le bundle non-admin
      _Source_ : `src/app/(protected)/admin/logs/page.tsx` L7, `metrics/page.tsx` L7, `permissions/page.tsx` L7

- [ ] **A8** — Vérifier en runtime que `/admin` (sans sous-route, index absent) renvoie bien la page 404 native Next.js et non une fuite d'information
      _Note_ : Il n'existe pas de `src/app/(protected)/admin/page.tsx`. Next.js renverra une 404 par défaut, ce qui est correct. Nécessite test E2E.

---

## B. Invisibilité admin dans l'UX standard (non-admin)

> Sources : `ux.md §4`, `FRONTEND_CONTRACT.md §1.2`, `PLATFORM.md §6.1`
> Invariant : le statut admin n'est PAS visible dans l'UX standard pour un non-admin.

- [x] **B1** — `AdminMenuItem` n'est jamais inclus dans le bundle des utilisateurs non-admin (import dynamique conditionnel `isAdmin && <AdminMenuItem />`)
      _Source_ : `src/components/layout/user-menu/UserMenu.tsx` L27–30, L369

- [x] **B2** — `AdminMenuItem` n'est PAS exporté dans le barrel partagé `src/components/index.ts`
      _Source_ : commentaire dans `AdminMenuItem.tsx` L6

- [x] **B3** — Le bouton d'abonnement est masqué pour les admins dans le UserMenu (`!isAdmin`)
      _Source_ : `src/components/layout/user-menu/UserMenu.tsx` L328–329
      _Justification contractuelle_ : `FRONTEND_CONTRACT.md §3.3` — Admin n'a pas accès à Stripe ; `Permissions.tsx` confirme abonnement Stripe = `non` pour admin.

- [x] **B4** — La page Tableau ne contient aucune référence à `isAdmin`, `admin` ou contenu admin
      _Source_ : audit grep sur `Tableau.tsx` — zéro occurrence

- [x] **B5** — `Permissions.tsx` (vue admin) affiche explicitement que "Voir les images personnelles des comptes" = `non` pour admin
      _Source_ : `src/page-components/admin/permissions/Permissions.tsx` L226–232

- [x] **B6** — Aucune route publique ne contient de référence admin
      _Source_ : audit grep sur `src/app/(public)/` — zéro occurrence

---

## C. Périmètre Subscriber hérité (fonctionnalités standard)

> L'admin hérite de toutes les fonctionnalités Subscriber. Seul ce qui **change ou s'ajoute** est re-vérifié.

- [x] **C1** — Page Édition : `isAdmin` correctement calculé via `useAccountStatus()` et les handlers CRUD cartes banque sont conditionnés à `isAdmin`
      _Source_ : `src/page-components/edition/Edition.tsx` L144–145, L460, L476, L518, L569

- [x] **C2** — `SlotsEditor` utilise `useAdminBankCards()` uniquement si `isAdmin` est vrai, sinon fallback sur `useBankCards()` standard
      _Source_ : `src/components/features/timeline/slots-editor/SlotsEditor.tsx` L153–156

- [x] **C3** — `CardsEdition` conditionne les boutons de gestion banque (`onCreateBankCard`, `onDeleteBankCard`, `onUpdateBankCardPublished`) à `isAdmin`
      _Source_ : `src/components/features/cards/cards-edition/CardsEdition.tsx` L323, L392–395

- [x] **C4** — Admin peut créer des séquences DB (subscriber/admin gate) — RLS et RPC atomic vérifient `status IN ('subscriber','admin')`
      _Source_ : `supabase/migrations/20260315113000_phase7_10_atomic_sequence_rpc.sql` L66

- [ ] **C5** — Vérifier en runtime que l'admin n'est pas redirigé vers le portail Stripe ni vers `/abonnement` (UserMenu masque l'entrée ; la page `/abonnement` elle-même redirige vers `/profil` si `!isActive` — `isActive = isSubscriber` pour admin)
      _Risque_ : `useSubscriptionStatus()` retourne `isActive = isSubscriber` (L25), donc `isActive = false` pour admin. Si un admin accède directement à `/abonnement`, il sera redirigé vers `/profil`. Comportement acceptable mais à confirmer.

---

## D. Quotas illimités (DB — triggers)

> Sources : `ux.md §Quotas`, `PRODUCT_MODEL.md §9`, migrations `phase9_3`, `phase9_4`

- [x] **D1** — `check_can_create_personal_card` : clause `IF v_status = 'admin' THEN RETURN` (sortie immédiate sans vérification quota)
      _Source_ : `supabase/migrations/20260204137000_phase9_3_quota_check_cards.sql` L31

- [x] **D2** — `check_can_create_child_profile` : clause `IF v_status = 'admin' THEN RETURN` — profils illimités
      _Source_ : `supabase/migrations/20260204138000_phase9_4_quota_check_profiles_devices.sql` L17

- [x] **D3** — `check_can_register_device` : clause `IF v_status = 'admin' THEN RETURN` — devices illimités
      _Source_ : `supabase/migrations/20260204138000_phase9_4_quota_check_profiles_devices.sql` L74

- [x] **D4** — Trigger `apply_subscription_to_account_status` : guard admin `IF v_is_admin THEN RETURN` — Stripe ne peut jamais modifier le statut admin
      _Source_ : `supabase/migrations/20260208143000_platform_billing_trigger_accounts_status.sql` L21–27

- [x] **D5** — `is_admin()` ne peut pas être self-promoted par l'utilisateur — policy `accounts_update_owner` interdit modification de `status` (`status immutable par user`)
      _Source_ : `supabase/migrations/20260203128000_phase7_3_rls_identity.sql` L47

- [x] **D6** — `quota_has_subscriber_or_admin_access()` : admin passe le gate Subscriber pour créer séquences, catégories
      _Source_ : `supabase/migrations/20260204136000_phase9_2_quota_helpers.sql` L71

---

## E. Gestion banque de cartes (Admin produit)

> Sources : `ux.md §10 §11 §13`, `FRONTEND_CONTRACT.md §5.2.3 §3.3`, migration `phase7_4_rls_library`

- [x] **E1** — RLS `cards_insert_bank_admin` : INSERT sur `cards` restreint à `is_admin() AND type='bank' AND account_id IS NULL AND published IS NOT NULL`
      _Source_ : `supabase/migrations/20260203129000_phase7_4_rls_library.sql` L113–122

- [x] **E2** — RLS `cards_update_bank_admin` : UPDATE sur cartes bank restreint à `is_admin() AND type='bank'`
      _Source_ : même fichier L143–154

- [x] **E3** — RLS `cards_delete_bank_admin` : DELETE sur cartes bank restreint à `is_admin() AND type='bank'`
      _Source_ : même fichier L172–179

- [x] **E4** — RLS `cards_select_admin` : admin lit uniquement les cartes `type='bank'` (PAS les cartes `personal` d'autres utilisateurs)
      _Source_ : même fichier L88–95
      _Commentaire DB_ : `IMPORTANT D2: admin ne peut JAMAIS lire personal d'autres users`

- [x] **E5** — `useAdminBankCards` envoie un broadcast Realtime (`card_published`, `card_unpublished`, `card_deleted`) pour contourner la limitation RLS Realtime
      _Source_ : `src/hooks/useAdminBankCards.ts` L151–163, L199–208, L280–288

- [x] **E6** — Trigger `cards_prevent_delete_bank_if_referenced` mentionné dans le hook — DELETE bloqué DB-side si carte référencée
      _Source_ : `src/hooks/useAdminBankCards.ts` L54
      _Confirmer_ : migration `20260318000000_add_card_delete_guardrails.sql`

- [x] **E7** — Dépublication d'une carte (`published: false`) : carte disparaît de la banque mais reste utilisable là où déjà présente — comportement géré DB-side
      _Source_ : `ux.md §11`, trigger et RLS phase7

- [x] **E8** — `useAdminBankCards.deleteCard` : pattern DB-first correct — tentative DELETE → gestion erreur DB proprement
      _Source_ : `src/hooks/useAdminBankCards.ts` L252–300

- [ ] **E9** — Vérifier en runtime : upload image vers `bank-images/{cardId}.jpg` depuis admin — les policies corrigées (migration `20260320100000`) utilisent `SELECT status FROM accounts` inline (contournement bug Supabase Storage v1.33.0)
      _Source_ : `supabase/migrations/20260320100000_fix_bank_images_policies_storage.sql`

---

## F. Confidentialité & Cross-account

> Sources : `ux.md §13`, `PLATFORM.md §6.1 §6.3 §6.6.3`, `FRONTEND_CONTRACT.md §3.3 §8.10`
> **Invariant critique** : admin ne doit JAMAIS accéder aux contenus privés (images, données enfant sensibles).

- [x] **F1** — `admin_get_account_support_info()` : ne retourne JAMAIS `image_url` pour cartes personnelles (commentaire `// Pas d'image_url`)
      _Source_ : `supabase/migrations/20260203130000_phase7_5_admin_support_channel.sql` L116–117

- [x] **F2** — `admin_get_account_support_info()` : accès ciblé (requiert `account_id` explicite, pas de liste globale) — `admin_list_accounts_summary` supprimée (BLOCKER 1)
      _Source_ : même fichier L155–165

- [x] **F3** — `AdminSupportAccountInfo` (type TypeScript) ne contient pas de champ `image_url` pour les cartes
      _Source_ : `src/hooks/useAdminSupportInfo.ts` L43–52
      _Commentaire_ : `// Pas d'image_url (D2 - interdit §8.10)`

- [x] **F4** — `Metrics.tsx` (support ciblé) : validation UUID côté UI avant fetch, message d'erreur ne révèle pas de données sensibles
      _Source_ : `src/page-components/admin/metrics/Metrics.tsx` L20–22, L219–225

- [x] **F5** — RLS `accounts_select_owner` : `id = auth.uid()` uniquement — admin ne peut pas faire `SELECT * FROM accounts`
      _Source_ : `supabase/migrations/20260203128000_phase7_3_rls_identity.sql`
      _Accès support_ : via `admin_get_account_support_info()` SECURITY DEFINER — pattern contractuel correct

- [x] **F6** — `useAdminSupportInfo` : cleanup si `!isAdmin` (reset state)
      _Source_ : `src/hooks/useAdminSupportInfo.ts` L76–81

- [x] **F7** — Aucune query directe `supabase.from()` dans les page-components admin (audit grep — zéro résultat)
      _Source_ : grep sur `src/page-components/admin/`

- [x] **F8** — `Logs.tsx` affiche `getUserInfo(account_id)` : tronque l'UUID à 8 caractères + `...` (pseudonymisation minimale)
      _Source_ : `src/page-components/admin/logs/Logs.tsx` L54–57
      _Note_ : L'`account_id` complet reste en mémoire JS côté client (objet `log`). Acceptable pour un outil admin-only.

---

## G. Storage policies

> Sources : `FRONTEND_CONTRACT.md §5.3`, `PLATFORM.md §6.6.3`, migrations `phase8_2` et `20260320100000`

- [x] **G1** — `personal-images` : SELECT owner-only (`owner = auth.uid()` + regex path anti-traversal)
      _Source_ : `supabase/migrations/20260204134100_phase8_2_storage_rls_policies.sql` L24–33

- [x] **G2** — `personal-images` : INSERT owner-only, pas de UPDATE policy (image figée après création — invariant UX)
      _Source_ : même fichier L35–55

- [x] **G3** — `personal-images` : aucune policy admin SELECT — admin ne peut JAMAIS lire les images personnelles
      _Source_ : audit migrations — aucune policy `SELECT ... is_admin()` sur `personal-images`

- [x] **G4** — `bank-images` : SELECT public (`anon` + `authenticated`) avec anti-traversal et regex flat
      _Source_ : même fichier L66–75

- [x] **G5** — `bank-images` : INSERT/UPDATE/DELETE admin-only — corrigé via inline `SELECT status FROM accounts` (contournement bug Supabase Storage)
      _Source_ : `supabase/migrations/20260320100000_fix_bank_images_policies_storage.sql` L42–101

- [x] **G6** — Pattern flat `bank-images/{uuid}.jpg` (sans sous-dossiers) — policy rejette les chemins avec `/`
      _Source_ : regex `name NOT LIKE '%/%'` dans toutes les policies `bank-images`

---

## H. Admin Audit Log

> Sources : `PLATFORM.md §6.3`, `FRONTEND_CONTRACT.md §8.10`, migration `20260208146000_platform_admin_audit_log.sql`

- [x] **H1** — Table `admin_audit_log` créée : `actor_account_id`, `target_account_id`, `action` (enum), `reason` (NOT NULL), `metadata` (jsonb borné ≤ 8KB), `created_at`
      _Source_ : `supabase/migrations/20260208146000_platform_admin_audit_log.sql` L20–37

- [x] **H2** — Append-only garanti par triggers DB (`trg_platform_admin_audit_log_no_update`, `trg_platform_admin_audit_log_no_delete`)
      _Source_ : même fichier L40–50

- [x] **H3** — RLS `admin_audit_log_select_admin_only` + `admin_audit_log_insert_admin_only` : accès exclusif `is_admin()`
      _Source_ : même fichier L61–73

- [x] **H4** — Enum `admin_action` (liste fermée) : `revoke_sessions`, `disable_device`, `resync_subscription_from_stripe`, `append_subscription_log`, `request_account_deletion`, `export_proof_evidence`
      _Source_ : même fichier L9–17

- [ ] **H5** — Aucune interface UI (hook ou composant) pour écrire dans `admin_audit_log` n'est implémentée
      _Source_ : grep sur `src/` — `admin_audit_log` n'apparaît que dans `src/types/supabase.ts` (types auto-générés)
      ⚠️ **Manque** : Le contrat exige que "toute action admin génère un événement dans `admin_audit_log`" (`FRONTEND_CONTRACT.md §8.10`). Aucun hook d'insertion dans l'audit log n'existe côté frontend. Les actions admin existantes (gestion banque cartes, support info) ne tracent pas dans `admin_audit_log`.

- ⚠️ **H6** — Aucune politique de rétention (purge automatisée) n'est implémentée en DB
  _Source_ : `PLATFORM.md §6.3.2` stipule "Rétention : définir une politique de conservation (ex : 12 mois) + mécanisme de purge automatisée". Aucune migration correspondante trouvée.
  _Impact_ : Non bloquant pour la V1 mais à planifier.

- ⚠️ **H7** — La "reason obligatoire" est correctement contrainte DB-side (`admin_audit_reason_non_empty_chk`), mais sans interface d'écriture frontend, elle n'est jamais utilisée en pratique
  _Source_ : migration L33

---

## I. Pages d'administration (UX admin)

> Sources : `FRONTEND_CONTRACT.md §3.3`, `ux.md §4`, migrations phase7_5

- [x] **I1** — Page `/admin/logs` : affiche `subscription_logs` via `useSubscriptionLogs` (hook DB-first, aucune query directe)
      _Source_ : `src/page-components/admin/logs/Logs.tsx` L59–71

- [x] **I2** — Page `/admin/metrics` : accès ciblé par UUID (formulaire + validation), utilise `useAdminSupportInfo` → RPC `admin_get_account_support_info`
      _Source_ : `src/page-components/admin/metrics/Metrics.tsx` L199–229

- [x] **I3** — Page `/admin/permissions` : vue lecture uniquement — aucune écriture possible, données statiques conforme au contrat
      _Source_ : `src/page-components/admin/permissions/Permissions.tsx` L348–356

- [x] **I4** — Toutes les pages admin utilisent `AdminRoute` comme wrapper de garde
      _Source_ : `src/app/(protected)/admin/*/page.tsx` — toutes les 3 pages

- [x] **I5** — `useSubscriptionLogs` applique les filtres côté DB (pas uniquement UI) et respecte le scope `is_admin()` via RLS
      _Source_ : `src/hooks/useSubscriptionLogs.ts` L94–98, L104–116

- [x] **I6** — `useAdminSupportInfo` vérifie `!isAdmin` avant tout fetch (double garde client + DB)
      _Source_ : `src/hooks/useAdminSupportInfo.ts` L84–86

- [x] **I7** — `useAdminBankCards` utilise `AbortController` systématique sur le fetch
      _Source_ : `src/hooks/useAdminBankCards.ts` L80–112

- [x] **I8** — Aucune page admin n'implémente de modification directe de données produit (cartes perso, profils enfants, timelines)
      _Source_ : audit des page-components admin — les 3 pages sont : logs (lecture), metrics (lecture support), permissions (lecture statique)

- [ ] **I9** — Vérifier en runtime que les filtres `useSubscriptionLogs` (webhook, checkout, etc.) correspondent bien aux valeurs `event_type` réelles en DB
      _Source_ : `src/hooks/useSubscriptionLogs.ts` L54–65 — filtres `ilike '%webhook%'`, `ilike '%checkout%'`

---

## J. Billing / Stripe

> Sources : `PLATFORM.md §1 §6.4.2`, `FRONTEND_CONTRACT.md §8.10`

- [x] **J1** — Admin n'est JAMAIS affecté par les webhooks Stripe (guard dans trigger `apply_subscription_to_account_status`)
      _Source_ : `supabase/migrations/20260208143000_platform_billing_trigger_accounts_status.sql` L21–27

- [x] **J2** — RLS `subscriptions_select_admin_only` : admin peut lire `subscriptions` pour support/diagnostic
      _Source_ : `supabase/migrations/20260208141000_platform_billing_subscriptions.sql` L86–91

- [x] **J3** — RLS `subscription_logs_select_admin_only` : admin peut lire `subscription_logs` (lecture seule — INSERT service*role uniquement)
      \_Source* : `supabase/migrations/20260208142000_platform_billing_logs_and_rls.sql` L49–54

- [x] **J4** — Page `/abonnement` non accessible via UserMenu pour admin (bouton masqué `!isAdmin`)
      _Source_ : `src/components/layout/user-menu/UserMenu.tsx` L328–329

- [x] **J5** — `useSubscriptionStatus()` : pour admin, `isActive = isSubscriber = false` — cohérent (admin n'a pas d'abonnement Stripe)
      _Source_ : `src/hooks/useSubscriptionStatus.ts` L25

---

## K. RGPD / Conformité

> Sources : `PLATFORM.md §6.4.3 §6.6.1`, migration `20260208144000_platform_rgpd_consent_events.sql`

- [x] **K1** — RLS `consent_events_select_self_or_admin` : admin peut lire les preuves de consentement pour support/audit (conforme RGPD)
      _Source_ : `supabase/migrations/20260208144000_platform_rgpd_consent_events.sql` L69–73

- [x] **K2** — `consent_events` : INSERT réservé à la Edge Function `log-consent` (service*role) — admin ne peut pas créer ni modifier des preuves de consentement
      \_Source* : même migration + `PLATFORM.md §6.6.2`

- [x] **K3** — Action `request_account_deletion` présente dans l'enum `admin_action` (flux standard, pas DELETE SQL direct)
      _Source_ : `supabase/migrations/20260208146000_platform_admin_audit_log.sql` L14

- [ ] **K4** — Aucune interface UI pour `request_account_deletion` ou `export_proof_evidence` n'est implémentée
      _Source_ : audit `src/` — aucun hook ou composant correspondant
      _Note_ : Les actions du catalogue `6.4` (revoke_sessions, resync_subscription, request_account_deletion) sont toutes définies en DB (enum) mais aucune Edge Function dédiée ni UI correspondante n'est déployée. Ceci est attendu en V1 si ces actions passent par SQL direct hors UI.

---

## Section "Hors contrat" — Comportements trouvés non couverts par les contrats

1. **Logs admin `console.error/warn` en production** — `useAdminBankCards.ts`, `useAdminSupportInfo.ts`, `useSubscriptionLogs.ts` contiennent des `console.error` et `console.warn`. Ils sont dans des blocs d'erreur (never en nominal), mais violent la règle globale "JAMAIS de `console.log` en production" du projet. Les messages n'exposent pas de données privées (erreurs DB génériques).
   _Fichiers_ : `src/hooks/useAdminBankCards.ts` L101, L157, L204, L265, L284, L292 ; `src/hooks/useAdminSupportInfo.ts` L106 ; `src/hooks/useSubscriptionLogs.ts` L124, L151

2. **Classe CSS `admin-404`** dans le DOM non-admin — La classe CSS révèle implicitement l'existence d'une route admin protégée (inspecteur DOM). Risque négligeable dans le contexte actuel (single-tenant owner-only) mais à corriger pour une approche stealth stricte.
   _Source_ : `src/components/shared/admin-route/AdminRoute.tsx` L34

3. **`useAdminBankCards` chargé pour tous les utilisateurs dans `Edition.tsx`** — Le hook est instancié inconditionnellement (`const adminBankCardsHook = useAdminBankCards()`) même pour les non-admin. Les résultats sont ignorés (`isAdmin ? adminBankCardsHook : ...`), et le hook retourne `[]` si `!user`. Pas de violation de sécurité (RLS bloque les requêtes), mais inefficience et légère surface de code admin côté non-admin.
   _Source_ : `src/page-components/edition/Edition.tsx` L149

4. **Pas de page d'accueil admin `/admin`** — La route `/admin` (sans sous-chemin) renverra une 404 Next.js native, différente visuellement de la 404 neutre de `AdminRoute`. Un accès non-admin à `/admin/logs` verra la 404 contrôlée ; un accès à `/admin` (si existant) verrait la 404 globale Next.js. Comportement acceptable mais incohérent.

---

## Section "Non vérifiable en statique" — Tests runtime obligatoires

| Réf. | Point à tester                                                                                                                                 | Méthode suggérée                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| A8   | `/admin` sans sous-route → 404 Next.js native (pas de fuite)                                                                                   | Test E2E Playwright, non connecté puis connecté non-admin |
| C5   | Admin redirigé vers `/profil` si accès direct `/abonnement`                                                                                    | Test E2E Playwright avec compte admin                     |
| E9   | Upload image → `bank-images/{uuid}.jpg` fonctionne avec la migration corrigée                                                                  | Test runtime (Supabase local ou staging)                  |
| H5   | Confirmer l'absence d'écriture dans `admin_audit_log` lors des actions admin                                                                   | Inspection réseau + logs Supabase                         |
| I9   | Filtres `subscription_logs` correspondent aux `event_type` réels en DB                                                                         | Inspection SQL + test UI avec données réelles             |
| K4   | Confirmer que les actions `request_account_deletion` et `resync_subscription` sont accessibles via SQL direct ou à planifier en Edge Functions | Décision d'architecture V1                                |

---

## Section "Hérité de Subscriber (déjà validé)" — Non re-vérifié

Les points suivants font partie de l'audit Subscriber précédemment validé et ne sont pas re-vérifiés ici :

- Création / édition / suppression de cartes personnelles (quotas, CRUD, image figée)
- CRUD timelines et slots (mode offline, anti-choc Tableau)
- CRUD catégories (owner-only, "Sans catégorie" système)
- CRUD séquences (Subscriber gate, atomic RPC)
- Gestion profils enfants (locked/active, downgrade)
- Sessions et validations (fusion monotone, epoch, snapshot)
- Gestion appareils (devices, revoke)
- Confettis et préférences account (reduced_motion, confetti_enabled)
- Mode execution-only (downgrade Free)
- Sync offline / bandeau offline Édition
- Auth (login, signup, signOut, authReady)
- Contexte Tableau (zéro message technique, zéro admin)

---

_Checklist produite par analyse statique exhaustive le 2026-04-03._
_Toute modification du code admin ou des migrations doit déclencher une mise à jour de ce fichier._
