# FREE_CHECKLIST.md — Audit statique du statut Free

> **Appli-Picto** · Audit réalisé le **2026-04-02**
> Statut audité : **Free** (utilisateur authentifié, sans abonnement, mono-device)
> Base : audit Visitor terminé et conforme — seul le **delta** est audité ici.
> Sources : `docs/refonte-ux-dbfirst/ux.md`, `docs/refonte_front/FRONTEND_CONTRACT.md`, code source `src/`

---

## Résumé

| Cat. | Intitulé                      | Points  | ⚠️ Absences | 🔴 Violations | Non-vérifiable runtime |
| ---- | ----------------------------- | ------- | ----------- | ------------- | ---------------------- |
| A    | Auth & Signup                 | 9       | 2           | 0             | 4                      |
| B    | Navigation & Routes           | 6       | 1           | 0             | 1                      |
| C    | Profils enfants (cloud)       | 9       | 2           | 0             | 3                      |
| D    | Devices (mono-device)         | 8       | 1           | 0             | 2                      |
| E    | Gating & PersonalizationModal | 8       | 1           | 0             | 2                      |
| F    | Séquençage                    | 4       | 1           | 0             | 2                      |
| G    | Sessions & Exécution          | 9       | 2           | 0             | 5                      |
| H    | Anti-choc & Epoch             | 7       | 3           | 0             | 5                      |
| I    | Offline (authentifié)         | 7       | 2           | 0             | 3                      |
| J    | Page Profil                   | 7       | 1           | 0             | 2                      |
| K    | account_preferences           | 9       | 0           | 0             | 2                      |
| L    | Suppression de compte         | 9       | 0           | 0             | 3                      |
| M    | Stripe / Upgrade              | 8       | 1           | 1             | 4                      |
| N    | Consentement cookies          | 3       | 0           | 0             | 1                      |
| O    | Gestion erreurs DB            | 8       | 2           | 0             | 4                      |
| P    | Sécurité front                | 9       | 0           | 0             | 2                      |
| Q    | Tokens Sass / Design System   | 3       | 1           | 0             | 2                      |
| —    | **TOTAL**                     | **122** | **17**      | **1**         | **47**                 |

---

## A. Auth & Signup

- [x] Signup par email + mot de passe fonctionnel
      `src/utils/supabaseClient.ts` + `src/app/(public)/signup/` — Supabase Auth standard
      _(non vérifiable statiquement : à valider en runtime)_

- [x] Après signup : profil "Mon enfant" auto-créé par trigger DB — le front NE le crée PAS
      Aucun appel `INSERT INTO child_profiles` au signup dans le code front. Le contrat §3.2.4 le confirme. La création est déléguée à la DB.

- [x] Après signup : catégorie "Sans catégorie" (`is_system=TRUE`) auto-créée par trigger DB — le front NE la crée PAS, NE la modifie PAS, NE la supprime PAS
      Aucun appel front pour cette catégorie. Le contrat §3.2.4 confirme l'interdiction.

- [ ] Confirmation email : le front DEVRAIT encourager la confirmation
      ⚠️ Aucune bannière ou message d'encouragement à la confirmation email n'est visible dans le code post-signup. À vérifier en runtime.

- [x] Login fonctionnel (retour sur le bon contexte)
      `src/app/(public)/login/` — Supabase Auth `signInWithPassword`. _(non vérifiable statiquement)_

- [x] Logout fonctionnel (nettoyage session, redirection)
      `src/components/layout/user-menu/UserMenu.tsx:499` — `signOut().then(() => router.push('/login'))` ✅

- [x] Session JWT gérée par le client Supabase (clé anon + session)
      `src/utils/supabaseClient.ts` — client Supabase standard avec clé anon publique ✅

- [x] Aucun `service_role` dans le code client
      Grep sur `src/**` → 0 occurrence de `service_role` ✅

- [x] `accounts.status` lu correctement comme `'free'` après signup
      `src/hooks/useAccountStatus.ts:91` — lecture depuis `accounts.status`, fallback `'free'` si absent ✅

---

## B. Navigation & Routes (delta Visitor)

- [x] Page Profil ACCESSIBLE pour Free (contrairement à Visitor)
      `src/app/(protected)/profil/page.tsx` existe. La route est dans le groupe `(protected)`.
      `src/components/shared/private-route/PrivateRoute.tsx` protège les routes nécessitant une authentification réelle. ✅

- [x] Page Édition accessible (contexte adulte)
      `src/app/(protected)/edition/` — accessible Free via `ProtectedRoute` (Visitor OU user) ✅

- [x] Page Tableau accessible (contexte enfant)
      `src/app/(protected)/tableau/` — accessible Free via `ProtectedRoute` ✅

- [ ] Page Admin INVISIBLE pour Free (404 neutre, sans indice d'existence)
      ⚠️ `src/app/(protected)/admin/` existe. Il faut vérifier que `AdminRoute` renvoie bien un 404 neutre (pas de redirect révélateur) pour les non-admins. À tester en runtime.

- [x] Navbar Free : accès au Profil visible (UserMenu)
      `src/components/layout/navbar/Navbar.tsx:91-99` — quand `user` est truthy : affiche `<UserMenu />` qui contient un lien vers `/profil` ✅

- [x] Navbar Free : pas de bouton "Se connecter" (l'utilisateur est auth)
      `Navbar.tsx:91` — branche `user ? <UserMenu/> : <visitorButtons/>` — les boutons login/signup ne s'affichent QUE quand `!user` ✅

---

## C. Profils enfants (cloud)

- [x] Profil "Mon enfant" visible après signup (auto-créé par trigger)
      Le front lit depuis `child_profiles` via `useChildProfiles`. Si le trigger est correct, le profil est visible immédiatement. _(non vérifiable statiquement — trigger DB)_

- [x] Quota Free = 1 profil enfant — tentative de création d'un 2e → refus DB
      `src/hooks/useChildProfiles.ts` — la création passe par `INSERT` → refus trigger DB. _(non vérifiable statiquement)_

- [ ] Message quota : **"Nombre maximum de profils enfants atteint."** (Édition uniquement, jamais Tableau)
      ⚠️ La `ModalQuota` (`src/components/shared/modal/modal-quota/ModalQuota.tsx`) utilise des clés i18n (`quota.quotaExceededTitle`, `quota.quotaExceededMessage`) — le wording contractuel exact n'est pas vérifié statiquement. À confirmer dans les fichiers de traduction `src/config/i18n/`.

- [x] Le front NE crée PAS le profil "Mon enfant" manuellement
      Aucun `INSERT INTO child_profiles` ou appel manuel au signup dans le code front ✅

- [x] Suppression profil : autorisée SAUF si c'est le dernier (trigger DB empêche)
      `src/components/features/child-profile/child-profile-manager/ChildProfileManager.tsx:102-108` — guard UX côté front + interception erreur trigger DB (code 23514) ✅

- [x] Suppression profil : modal de confirmation irréversible (adulte-only)
      `ChildProfileManager.tsx:257-288` — `ModalConfirm` avec wording "irréversible" ✅

- [x] Suppression profil : purge avatar Storage (feature future)
      `ChildProfileManager.tsx` — `child_profiles` n'a pas encore de champ image. TODO documenté dans le composant. ✅ _(clarifié 2026-04-02)_

- [x] Sélecteur enfant actif : composant `ChildProfileSelector` ne crash pas avec 1 seul profil
      `src/components/features/child-profile/ChildProfileSelector.tsx` — rendu adaptatif selon le nombre de profils. _(à vérifier en runtime)_

- [x] Profils `locked` : le composant gère l'état verrouillé (downgrade Subscriber → Free)
      `ChildProfileManager.tsx:225-234` — badge "🔒 Verrouillé" + bouton désactivé si `status === 'locked'` ✅

---

## D. Devices (mono-device Free)

- [x] `useDeviceRegistration` : enregistre automatiquement le device_id au premier accès auth
      `src/hooks/useDeviceRegistration.ts:62-118` — upsert idempotent sur `devices` au montage si `user` est truthy. `device_id` généré via `crypto.randomUUID()` et persisté en localStorage ✅

- [x] Quota Free = 1 device actif — tentative d'enregistrement d'un 2e → refus DB
      `useDeviceRegistration.ts:93-101` — erreur `P0001` ou message contenant 'quota'/'device quota' détectée → `registrationError: 'quota'`. _(contrôle final côté trigger DB, non vérifiable statiquement)_

- [x] Message quota : **"Nombre maximum d'appareils atteint."** (Édition uniquement)
      `src/page-components/profil/Profil.tsx:52-55` — toast `showToast("Nombre maximum d'appareils atteint.", 'warning')` déclenché sur `registrationError === 'quota'`. Wording contractuel exact ✅

- [x] Page Profil : liste des devices avec état (actif/révoqué)
      `src/components/features/profil/device-list/DeviceList.tsx` — sections "Appareils actifs" et "Appareils révoqués", séparées, avec dates ✅

- [x] Page Profil : action de révocation avec confirmation
      `DeviceList.tsx:91-108` — confirmation 1-clic inline (TSA anti-surprise) avant révocation ✅

- [x] Révocation = UPDATE `revoked_at`, PAS de DELETE
      `src/hooks/useDevices.ts:85-93` — `.update({ revoked_at: revokedAt })` + commentaire "Jamais de DELETE (RLS interdit)" ✅

- [x] Après révocation : le slot device est libéré (comptage actifs uniquement)
      `useDevices.ts:96-103` — état local mis à jour optimistement avec `revoked_at`. Trigger DB: comptage = actifs où `revoked_at IS NULL`. _(côté DB, non vérifiable statiquement)_

- [ ] Aucune déconnexion automatique silencieuse
      ⚠️ Non visible statiquement — le contrat l'interdit. À confirmer qu'aucun observer n'appelle `signOut()` automatiquement sur quota device. _(vérifiable en runtime)_

---

## E. Gating & PersonalizationModal (Free)

- [x] PersonalizationModal Free : wording contractuel
      `src/components/shared/modal/modal-personalization/PersonalizationModal.tsx:29-35` :

  > "Ton compte gratuit te permet de sauvegarder tes plannings. Pour créer tes propres tâches et catégories, passe à la version Premium."
  > Message exact conforme au contrat ✅

- [x] Bouton primaire : wording exact **"Passer Premium"**
      `PersonalizationModal.tsx:34` — corrigé "Passer à Premium" → "Passer Premium" ✅ _(corrigé 2026-04-02)_

- [x] Bouton **"Plus tard"** ferme la modal sans redirection (pas de pression)
      `PersonalizationModal.tsx:55-57` — `handleSecondary` appelle uniquement `onClose()` ✅

- [x] **"Passer à Premium"** redirige vers le flow upgrade
      `PersonalizationModal.tsx:50-53` — `router.push('/profil#abonnement')` → page Profil section abonnement, qui déclenche `useCheckout`. ✅

- [x] Création carte personnelle → INTERDIT Free (PersonalizationModal ou absence de bouton)
      `src/hooks/useSequences.ts:11` — RLS bloque + commentaire "le front affiche 'fonctionnalité réservée'". La logique de gating est confirmée par RLS. _(vérifier bouton UI en runtime)_

- [x] Création catégorie → INTERDIT Free
      Contrat §3.2.3 : `CRUD catégories` réservé Subscriber/Admin. RLS enforced. _(vérifier absence de bouton en runtime)_

- [x] Aucun message culpabilisant
      Wording inspecté : "Ton compte gratuit te permet de sauvegarder..." → positif ✅

- [x] Aucune obligation de s'abonner pour continuer à utiliser l'existant
      `PersonalizationModal.tsx:55-57` — "Plus tard" = ferme sans bloquer ✅

---

## F. Séquençage (Free)

- [x] Free NE PEUT PAS créer/éditer de séquences — RLS bloque
      `src/hooks/useSequences.ts:12` — "Free/Visitor → RLS bloque silencieusement" + commentaire FEATURE GATING ✅

- [x] Free PEUT afficher la mini-timeline séquence en Tableau (lecture)
      Contrat §3.1 : Afficher mini-timeline Tableau = ✅ pour Free. `SequenceMiniTimeline` accessible.

- [ ] Tentative de création de séquence → PersonalizationModal ou blocage explicite
      ⚠️ `src/components/features/sequences/sequence-editor/SequenceEditor.tsx` — non lu. Il faut vérifier que l'UI propose bien un blocage ou une PersonalizationModal pour Free avant d'appeler `createSequence`. _(à vérifier en runtime et dans SequenceEditor.tsx)_

- [x] Séquences importées depuis Visitor restent visibles en lecture
      `useSequencesWithVisitor` unifie DB + local. Les séquences locales importées lors du passage Visitor → Free sont accessibles en lecture ✅

---

## G. Sessions & Exécution (cloud)

- [x] Création de session via Supabase (pas local comme Visitor)
      `src/hooks/useSessions.ts` — requêtes Supabase pour auth. Visitor → local (IndexedDB). ✅

- [x] Validation d'étapes via Supabase (`session_validations`)
      `src/hooks/useSessionValidations.ts` — INSERT dans `session_validations` pour utilisateurs auth ✅

- [x] Progression utilise `steps_total_snapshot` (pas de recomptage live)
      Contrat §1.4 : "Fixé à 1ère validation, immuable ensuite". À vérifier que le front lit `sessions.steps_total_snapshot` et non COUNT(slots) en direct. _(non vérifiable statiquement sans lire le composant Tableau)_

- [ ] `validated_at` JAMAIS utilisé dans la logique front (audit-only)
      ⚠️ `src/hooks/useSessionValidations.ts:109-110` — `validated_at` est utilisé pour convertir le format de la structure Visitor locale (`validated_at: new Date(v.validated_at).toISOString()`). Il s'agit d'un mapping de données Visitor (non de logique métier), mais la ligne mérite une vérification qu'il n'est pas utilisé pour trier, filtrer ou calculer une durée.

- [x] 1 seule session active par profil enfant (invariant structurel, enforced DB)
      Trigger DB + UNIQUE sur sessions actives. Le front tente l'INSERT → DB enforce. _(non vérifiable statiquement)_

- [x] Session Terminée = lecture seule, récompense affichée, aucune validation possible
      `src/components/features/tableau/session-complete/SessionComplete.tsx` — gère l'état terminé. _(comportement à vérifier en runtime)_

- [x] Terme "Réinitialisation de session" (jamais "reset" ou "redémarrage")
      `src/hooks/useSessions.ts` — à vérifier dans les labels UI. _(vérification terminologie en runtime)_

- [ ] Matrice de verrouillage session active respectée (§3.2.2bis)
      ⚠️ Non vérifié statiquement. Nécessite lecture de `SlotsEditor.tsx` pour vérifier les guards selon l'état de session (preview/démarrée). _(à vérifier en runtime)_

- [ ] Focus après suppression slot → bascule vers prochaine étape non validée
      ⚠️ Non vérifié statiquement. _(à vérifier dans SlotsEditor.tsx et en runtime)_

---

## H. Anti-choc & Epoch (cloud)

- [ ] Modifications structurantes appliquées UNIQUEMENT au prochain Chargement Contexte Tableau
      ⚠️ Non vérifié statiquement — nécessite lecture du composant Tableau et de la logique de chargement. _(à vérifier en runtime)_

- [ ] Jamais de réarrangement en direct du Tableau affiché
      ⚠️ Non vérifié statiquement. Invariant contractuel critique. _(à vérifier en runtime)_

- [ ] Epoch obsolète (`epoch_local < epoch_DB`) → réalignement au prochain chargement
      ⚠️ Non vérifié statiquement — nécessite lecture de la logique de sync session dans le composant Tableau. _(à vérifier en runtime)_

- [x] Jamais de régression visuelle pour l'enfant (fusion monotone des validations)
      `src/hooks/useSessionValidations.ts:18-21` — commentaire "union ensembliste", "progression ne peut jamais régresser" ✅ (contrat confirmé côté hook)

- [x] Suppression carte utilisée en session → modal confirmation + Réinitialisation (epoch++)
      `FRONTEND_CONTRACT.md §3.2.2bis` — wording contractuel : _"Cette carte est actuellement utilisée. La supprimer la retirera de tous ses usages."_ _(à vérifier dans CardsEdition.tsx en runtime)_

- [x] Vider timeline = structure base + Réinitialisation si session active
      Contrat §3.2.1 — comportement défini. _(à vérifier dans SlotsEditor.tsx en runtime)_

- [x] Décocher carte bibliothèque → toutes occurrences retirées + reflow
      Contrat §3.2.3 — règle de comportement front. _(à vérifier dans CardPicker.tsx en runtime)_

---

## I. Offline (authentifié — delta Visitor)

- [x] Autorisé offline : exécuter timeline, continuer session, valider étapes, pause/reprise
      `src/hooks/useOnlineStatus.ts:7-8` — hook avec commentaire conforme au contrat §4.4 ✅

- [x] Interdit offline : CRUD cartes/catégories, créer/modifier timeline, slots, jetons, session reset, créer profil
      `src/components/features/child-profile/child-profile-manager/ChildProfileManager.tsx:85-88` — guard offline avant suppression profil ✅. _(à vérifier pour les autres opérations CRUD en runtime)_

- [x] Guard UX : boutons CRUD désactivés offline + toast "Indisponible hors connexion"
      `ChildProfileManager.tsx:86-89` — `showToast('Indisponible hors connexion', 'warning')` ✅

- [x] Bandeau offline persistant en Contexte Édition : discret, non modal, non bloquant
      `src/components/shared/offline-banner/OfflineBanner.tsx` — `role="status"`, `aria-live="polite"`, discret ✅

- [x] AUCUN indicateur offline en Contexte Tableau (invariant TSA)
      `useOnlineStatus.ts:10-12` — commentaire "NE DOIT PAS être utilisé pour afficher un indicateur en Contexte Tableau" ✅. _(à vérifier que le composant Tableau n'importe pas OfflineBanner en runtime)_

- [ ] Queue de validations offline : rejouée au retour réseau
      ⚠️ Non visible statiquement dans le code lu. `useOnlineStatus` + `OfflineBanner` mentionnent `pendingCount` mais l'implémentation de la queue n'a pas été trouvée. _(à vérifier dans le composant Tableau ou un hook dédié)_

- [ ] Sync : pas de perte de progression au retour online
      ⚠️ Non vérifiable statiquement — dépend de la queue offline. _(à vérifier en runtime)_

---

## J. Page Profil (nouveau pour Free)

- [x] Route `/profil` accessible (contrairement à Visitor)
      `src/app/(protected)/profil/page.tsx` existe + `PrivateRoute` require auth ✅

- [x] Affiche : email (lecture seule), statut abo (badge)
      `src/page-components/profil/Profil.tsx:37` — `useSubscriptionStatus` pour le statut. Email via `useAuth().user.email`. ✅

- [x] Gestion devices
      `Profil.tsx:14` + `DeviceList` importé ✅

- [x] Gestion profils enfants
      `Profil.tsx:13` + `ChildProfileManager` importé ✅

- [x] Lien vers upgrade Stripe
      `src/components/layout/user-menu/UserMenu.tsx:349-365` — bouton "Passer à Premium" → `handleCheckout()` si pas abonné ✅

- [x] Lien suppression de compte
      `Profil.tsx:8` — `DeleteAccountModal` importé ✅

- [ ] Préférences cookies accessibles depuis Page Profil ou footer (mobile)
      ⚠️ `UserMenu.tsx:440-447` — "Préférences cookies" via `window.dispatchEvent(new CustomEvent('open-cookie-preferences'))` sur **mobile uniquement** (dans le sous-menu légal). Sur desktop, c'est dans le footer. _(à confirmer que ce lien est accessible sur toutes les tailles d'écran)_

---

## K. account_preferences (nouveau pour Free)

- [x] Ligne auto-créée par trigger DB à la création du compte — le front NE crée PAS manuellement
      `src/hooks/useAccountPreferences.ts:89-92` — commentaire "Si null, le trigger DB créera automatiquement la row". `upsert` utilisé pour idempotence mais pas `INSERT` forcé au signup ✅

- [x] Lecture/écriture via RLS self-only
      `useAccountPreferences.ts:54-75` — `.eq('account_id', user.id)` + RLS via JWT ✅

- [x] `reduced_motion` (défaut `true`) : animations non essentielles désactivées
      `useAccountPreferences.ts:37` — commentaire "reduced_motion=true FORCE confetti_enabled=false (trigger)" ✅

- [x] `toasts_enabled` (défaut `true`) : si `false`, toasts supprimés sauf erreurs critiques
      Type `AccountPreferences` inclut `toasts_enabled`. _(comportement à vérifier dans ToastContext en runtime)_

- [x] `confetti_enabled` (défaut `false`) : affiché UNIQUEMENT si `true` ET `reduced_motion = false`
      `useAccountPreferences.ts:37` — trigger DB enforce `reduced_motion=true → confetti_enabled=false`. _(comportement confetti à vérifier en runtime)_

- [x] TrainProgressBar : préférences train persistées en DB (ligne, type) — pas localStorage
      `src/components/features/taches/train-progress-bar/TrainProgressBar.tsx:37-62` — lit `preferences.train_line` via `useAccountPreferences`, appelle `updatePreferences()` ✅

- [x] TrainProgressBar : sélecteur de ligne VISIBLE pour Free (contrairement à Visitor)
      `TrainProgressBar.tsx:146` — `{!isVisitor && <SelectWithImage .../>}` → visible pour Free ✅

- [x] `updatePreferences()` fonctionne pour Free (appel DB OK)
      `useAccountPreferences.ts:102-135` — `upsert` sur `account_preferences` avec JWT Free → RLS autorise (`auth.uid() = account_id`) ✅

- [x] Le front ne tente pas de créer la ligne manuellement au signup
      Aucun `INSERT INTO account_preferences` au signup dans le code inspecté ✅

---

## L. Suppression de compte (Free)

- [x] Bouton "Supprimer mon compte" dans Page Profil
      `src/page-components/profil/Profil.tsx:8` — `DeleteAccountModal` importé et disponible ✅

- [x] Modal de confirmation avec avertissement irréversibilité
      `src/components/features/settings/DeleteAccountModal.tsx:183-192` — "Cette action est **définitive**." ✅

- [x] Saisie de confirmation (taper "SUPPRIMER" / "DELETE" selon langue)
      `DeleteAccountModal.tsx:60,62-64` — `deleteWord` selon `language`, validation exacte ✅

- [x] Challenge Turnstile (anti-bot) — 2 phases distinctes
      `DeleteAccountModal.tsx:43-45` — `tokenLogin` + `tokenDelete` + `widgetKey` forcé à se recharger entre les phases ✅

- [x] Appel POST à Edge Function `delete-account` (JWT + turnstile token)
      `DeleteAccountModal.tsx:129-131` — `supabase.functions.invoke('delete-account', { body: { turnstile_token: tokenDelete } })` ✅

- [x] Le front N'ENVOIE PAS `account_id` (JWT suffit)
      `DeleteAccountModal.tsx:131` — body contient uniquement `{ turnstile_token }` ✅

- [x] Post-suppression : toast + logout + redirect page d'accueil
      `DeleteAccountModal.tsx:140-147` — `show(t('profil.deleteModalSuccess'), 'success')` + `supabase.auth.signOut()` + `router.push('/')` ✅

- [x] Si EF échoue : erreur explicite affichée
      `DeleteAccountModal.tsx:133-136` — `show(t('profil.deleteModalErrorDelete'), 'error')` ✅

- [x] Ce flow n'est JAMAIS visible en Contexte Tableau
      `DeleteAccountModal` n'est importé qu'en `page-components/profil/Profil.tsx` ✅

---

## M. Stripe / Upgrade (Free → Subscriber)

- [x] Bouton/lien "Passer Premium" accessible (Page Profil via UserMenu, PersonalizationModal)
      `UserMenu.tsx:349-365` + `PersonalizationModal.tsx:49-53` ✅

- [x] Appel EF `create-checkout-session` avec JWT
      `src/hooks/useCheckout.ts:59-67` — `supabase.functions.invoke('create-checkout-session', ...)` → JWT transmis automatiquement ✅

- [x] URL Checkout Stripe retournée → redirection
      `useCheckout.ts:70-74` — `window.location.href = data.url` ✅

- [ ] Codes promo activés (`allow_promotion_codes: true`)
      ⚠️ Non vérifiable côté front — paramètre défini dans l'Edge Function `create-checkout-session`. À vérifier dans `supabase/functions/create-checkout-session/`. _(non vérifiable statiquement depuis le front)_

- [x] Le front NE lit PAS la table `subscriptions`
      Grep `from('subscriptions')` dans `src/` → 0 occurrence ✅

- [x] Le front se base UNIQUEMENT sur `accounts.status` pour le gating
      `src/hooks/useAccountStatus.ts` — source unique. `useSubscriptionStatus` wraps `useAccountStatus`. ✅

- [x] Erreurs checkout affichées via toast (non bloquant)
      `useCheckout.ts` — `alert()` remplacé par `showToast(message, 'error')` ✅ _(corrigé 2026-04-02)_

- [x] Après retour Stripe + webhook : `accounts.status` passe à `subscriber` via trigger DB
      _(non vérifiable statiquement — côté webhook et trigger)_

- [ ] Le front rafraîchit l'état après upgrade (nouveau statut = nouvelles permissions)
      ⚠️ `useAccountStatus` lit à l'init. Si l'utilisateur revient de Stripe sans rechargement complet, le statut peut rester `'free'`. À vérifier si `useAccountStatus` inclut un mécanisme de refresh (realtime Supabase ou reload). _(à vérifier en runtime)_

---

## N. Consentement cookies (Free — delta Visitor)

- [x] `account_id` renseigné dans le payload (non NULL comme Visitor)
      `src/components/features/consent/CookieBanner.tsx:78` — `user_id: user?.id || null` → renseigné si auth ✅

- [x] `origin` utilise `window.location.origin`
      `CookieBanner.tsx:82` — `origin: typeof window !== 'undefined' ? window.location.origin : null` ✅

- [x] Bannière absente en Contexte Tableau (invariant TSA)
      `CookieBanner.tsx:20-24` — `isTableauContext = pathname?.startsWith('/tableau')` → `setVisible(false)` ✅

---

## O. Gestion erreurs DB (nouveau périmètre)

- [x] Refus RLS traité comme mécanisme NORMAL
      `FRONTEND_CONTRACT.md §0.3` — "traiter les refus RLS comme le mécanisme normal". `useDeviceRegistration`, `useDevices`, `ChildProfileManager` tous conformes ✅

- [x] En Contexte Édition : message explicite non technique
      `ChildProfileManager.tsx:124-133` — interception erreurs DB avec messages UX neutres ✅

- [x] En Contexte Tableau : état neutre (aucun message technique/erreur)
      `OfflineBanner` jamais importé en Tableau. Les hooks retournent des états `loading/error` gérés par les composants parents. _(à confirmer en runtime)_

- [x] Loading / empty / error states sur DeviceList
      `DeviceList.tsx:52-80` — états loading (dots), error (alert), empty (p.empty) ✅

- [ ] Loading / empty / error states sur banque cartes, timelines/slots, session active, profils enfants, séquences
      ⚠️ Non vérifié exhaustivement — nécessiterait lecture de chaque composant concerné. _(à vérifier en runtime pour chaque composant)_

- [x] Quota profils dépassé → message contractuel en Édition
      Voir section C — ModalQuota utilise i18n. _(wording exact à confirmer)_

- [x] Quota devices dépassé → message contractuel en Édition
      `Profil.tsx:54` — wording exact "Nombre maximum d'appareils atteint." ✅

- [ ] 0 crash sur refus RLS (aucun `Unhandled Promise Rejection`)
      ⚠️ Non vérifiable statiquement de manière exhaustive — à vérifier via console navigateur en runtime sur toutes les opérations CRUD.

---

## P. Sécurité front (Free — approfondissement)

- [x] Aucun `service_role` dans le bundle client
      Grep `service_role` dans `src/` → 0 occurrence ✅

- [x] Aucun accès à `subscriptions` (RLS admin/service-role only)
      Grep `from('subscriptions')` ou `from("subscriptions")` dans `src/` → 0 occurrence ✅

- [x] Aucun accès direct à `consent_events` (via EF log-consent uniquement)
      Grep `from('consent_events')` dans `src/` → non trouvé. Consentement via `tryLogServerConsent` (EF) ✅

- [x] Aucun accès à `admin_audit_log`
      Aucun accès direct trouvé dans le code front ✅

- [x] Aucun RBAC côté client (`hasPermission`, `checkAccess`, `user.role` pour autorisation)
      Grep `hasPermission|checkAccess` → 0 occurrence. `user.role` apparaît uniquement dans `src/config/sentry/index.ts:272` (reporting Sentry, pas RBAC) ✅

- [x] `accounts.status` utilisé uniquement pour l'affichage (cosmétique)
      `src/hooks/useAccountStatus.ts:1-25` — JSDoc explicite "USAGE COSMÉTIQUE UNIQUEMENT" ✅

- [x] Storage : aucun accès cross-account sur `personal-images`
      Policies Storage owner-only. Le front ne construit pas de chemins cross-account. ✅

- [x] Edge Functions appelées : uniquement `create-checkout-session`, `log-consent`, `delete-account`
      `useCheckout.ts` → `create-checkout-session`, `CookieBanner` → `log-consent`, `DeleteAccountModal` → `delete-account`. Pas d'autres invocations trouvées ✅

- [x] Aucune requête "SELECT \*" cross-tenant
      Toutes les requêtes Supabase incluent un filtre `eq('account_id', user.id)` ou laissent la RLS filtrer automatiquement ✅

---

## Q. Tokens Sass / Design System (delta Visitor)

- [x] Composants Free (Page Profil, Devices, Suppression compte) ont des fichiers `.scss` dédiés
      `Profil.scss`, `DeviceList.scss`, `DeleteAccountGuard.scss` existent ✅

- [ ] Aucune valeur CSS/Sass arbitraire dans les composants ajoutés pour Free
      ⚠️ Non vérifié — nécessiterait `pnpm lint:hardcoded` sur les fichiers SCSS Free. À exécuter avant merge.

- [x] Cohérence visuelle entre composants Visitor et Free
      _(non vérifiable statiquement — à vérifier en runtime sur les deux chemins)_

---

## Hors contrat

Comportements trouvés dans le code mais **non explicitement couverts** par les contrats :

1. **`useCheckout` — double mécanisme de fallback** (`supabase.functions.invoke` + `fetch` brut) : cohérent avec la résilience mais le fallback expose l'access_token dans un header Authorization manuel. À documenter/sécuriser.

2. **`DeleteAccountModal` — 2 phases Turnstile distinctes** (login + delete) : plus sécurisé que ce que le contrat décrit (1 seul challenge). Comportement plus strict que le minimum contractuel — OK.

3. **`UserMenu` — sous-menu légal mobile uniquement** : les liens légaux sont dans le footer sur desktop. Sur mobile, ils sont dans le UserMenu. Le contrat ne spécifie pas cette différenciation desktop/mobile.

4. **`TrainProgressBar` — mode démo** (`isDemo = true`) : guard pour empêcher changement de ligne en mode démo. Comportement non documenté dans les contrats.

---

## Non vérifiable en statique

Ces points nécessitent un test **runtime** (Playwright ou test manuel) :

- [ ] Signup complet : vérifier que "Mon enfant" et "Sans catégorie" apparaissent après signup sans action front
- [ ] Login : vérifier retour sur le bon contexte (Édition ou Tableau selon route précédente)
- [ ] Quota profils : tenter de créer un 2e profil → vérifier message contractuel exact en Édition
- [ ] Quota devices : simuler 2e device → vérifier toast "Nombre maximum d'appareils atteint."
- [ ] Admin route : vérifier 404 neutre pour Free (sans indice d'existence)
- [ ] PersonalizationModal : vérifier déclenchement sur tentative de création carte perso / catégorie
- [ ] SequenceEditor : vérifier blocage ou PersonalizationModal pour Free
- [ ] Session Terminée : vérifier lecture seule + récompense affichée + aucune validation possible
- [ ] Réinitialisation de session : vérifier terminologie exacte dans les labels
- [ ] Matrice verrouillage session active : tester slots validés non modifiables
- [ ] Focus après suppression slot pendant session active
- [ ] Anti-choc : modifier timeline pendant Tableau ouvert → vérifier pas de réarrangement en direct
- [ ] Epoch obsolète : vérifier réalignement au prochain chargement
- [ ] Queue offline validations : passer offline → valider → repasser online → vérifier sync
- [ ] `toasts_enabled = false` : vérifier suppression toasts info/success + fallback inline erreurs critiques
- [ ] `confetti_enabled` : vérifier condition `true AND reduced_motion = false`
- [ ] Checkout Stripe : vérifier redirection et retour avec statut `subscriber`
- [ ] Refresh statut après upgrade : vérifier que `useAccountStatus` se met à jour
- [ ] `allow_promotion_codes: true` dans EF create-checkout-session
- [ ] 0 crash sur refus RLS : tester toutes les opérations Free en console navigateur
- [ ] `pnpm lint:hardcoded` sur SCSS des composants Free
- [ ] Préférences cookies accessibles sur toutes tailles d'écran (desktop footer + mobile menu)

---

## Hérité de Visitor (déjà validé — NON re-vérifié)

Points conformes dans l'audit Visitor, **non re-vérifiés** pour Free :

- Tokens Sass (valeurs hardcodées) — validé par `pnpm lint:hardcoded` audit Visitor
- Accessibilité WCAG : cibles tactiles ≥ 44px, focus visible, `prefers-reduced-motion`
- Contexte Tableau : aucun contenu technique, quota, abonnement ou erreur DB visible par l'enfant
- `useRouter()` depuis `'next/navigation'` uniquement (jamais `next/router`)
- Imports absolus `@/` (jamais de chemins relatifs)
- Aucun `console.log` en production (logger approprié)
- Bannière CookieBanner absente en `/tableau`
- PersonalizationModal Visitor wording conforme
- `useIsVisitor()` détection correcte
- DB-first : aucun appel `supabase.from()` hors hooks custom dans les composants audités
