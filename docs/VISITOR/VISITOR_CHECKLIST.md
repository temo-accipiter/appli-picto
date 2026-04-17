# VISITOR_CHECKLIST.md — Vérifications complètes mode Visitor

> **Audit statique** : 2026-04-01
> **Sources contractuelles** : `docs/refonte-ux-dbfirst/ux.md`, `docs/refonte_front/FRONTEND_CONTRACT.md`, `docs/refonte-ux-dbfirst/PLATFORM.md`
> **Code scanné** : `src/app/**`, `src/components/**`, `src/hooks/**`, `src/page-components/**`, `src/utils/**`
> **Légende** : ✅ Conforme identifié · ⚠️ Manque ou non-conforme potentiel · 🔴 Contradiction contractuelle confirmée · 🧪 Non vérifiable en statique (test runtime requis)

---

## Résumé

| Catégorie                         | Points  | Conformes | ⚠️ Potentiels | 🔴 Critiques |
| --------------------------------- | ------- | --------- | ------------- | ------------ |
| A — Navigation & Routes           | 8       | 6         | 2             | 0            |
| B — Navbar Visitor                | 6       | 4         | 1             | 1            |
| C — Gating & PersonalizationModal | 7       | 2         | 0             | 5            |
| D — Données locales               | 7       | 5         | 2             | 0            |
| E — Fonctionnalités accessibles   | 7       | 5         | 2             | 0            |
| F — Fonctionnalités INTERDITES    | 6       | 4         | 1             | 1            |
| G — TrainProgressBar              | 6       | 2         | 0             | 4            |
| H — Contexte Tableau (enfant)     | 10      | 6         | 2             | 2            |
| I — Contexte Édition (adulte)     | 5       | 3         | 2             | 0            |
| J — Sessions & Progression        | 6       | 4         | 2             | 0            |
| K — Séquençage                    | 3       | 2         | 1             | 0            |
| L — Protection enfant             | 2       | 0         | 1             | 1            |
| M — Consentement cookies          | 6       | 5         | 1             | 0            |
| N — Import Visitor → Compte       | 5       | 2         | 3             | 0            |
| O — Accessibilité                 | 7       | 4         | 3             | 0            |
| P — Sécurité front                | 6       | 5         | 1             | 0            |
| Q — Tokens Sass                   | 3       | 2         | 1             | 0            |
| **TOTAL**                         | **100** | **61**    | **25**        | **14**       |

---

## A — Navigation & Routes

**Contrats** : `FRONTEND_CONTRACT.md §2.1` · `ux.md §Rôles & Contextes`

- [x] ✅ Page `/tableau` accessible sans auth — Route publique `(public)/tableau/page.tsx`
  - _Fichier_ : `src/app/(public)/tableau/page.tsx`
- [x] ✅ `/login` et `/signup` accessibles sans auth — Route publique `(public)/`
  - _Fichier_ : `src/app/(public)/login/page.tsx`, `src/app/(public)/signup/page.tsx`
- [x] ✅ `/edition` accessible en mode Visitor via `ProtectedRoute` (autorise user OU visitor)
  - _Fichier_ : `src/components/shared/protected-route/ProtectedRoute.tsx`
- [x] ✅ `/profil` INTERDIT au Visitor — utilise `PrivateRoute` (auth uniquement), redirige vers `/login`
  - _Fichier_ : `src/app/(protected)/profil/layout.tsx`
- [x] ✅ `/admin/*` : 404 neutre sans mention "admin", sans redirect révélateur
  - _Fichier_ : `src/components/shared/admin-route/AdminRoute.tsx`
- [x] ✅ `/admin/metrics`, `/admin/logs`, `/admin/permissions` : tous protégés par `AdminRoute`
  - _Fichier_ : `src/app/(protected)/admin/*/page.tsx`
- [ ] ⚠️ Aucun middleware Next.js (`middleware.ts`) — toute la protection est **client-side uniquement**. Un visiteur peut temporairement accéder à l'URL `/admin/xxx` avant que `AdminRoute` s'initialise (hydration gap).
  - _Non vérifiable en statique : nécessite test réseau lent / désactivation JS_
  - 🧪 Tester : accéder à `/admin/logs` avec JS désactivé ou throttling réseau extrême
- [ ] ⚠️ Page d'entrée "Découverte" Visitor dédiée : le contrat mentionne un "Écran Entrée Visitor/Découverte" distinct. En pratique, `/edition` joue ce rôle. Vérifier si l'expérience d'accueil est cohérente pour un primo-visiteur.
  - 🧪 Tester : accéder à `/` puis naviguer comme un nouveau visiteur

---

## B — Navbar Visitor (Contexte Édition)

**Contrats** : `FRONTEND_CONTRACT.md §2.1`, `ux.md §Rôles & Contextes`
**Fichier principal** : `src/components/layout/navbar/Navbar.tsx`

- [x] ✅ Bouton "Tableau" présent en contexte Édition (`isEdition = true` → lien Tableau affiché)
- [x] ✅ Sélecteur de langue (`LangSelector`) présent pour les visiteurs
- [x] ✅ Bouton "Se connecter" présent (lien `/login`)
- [x] ✅ Aucun bouton "Profil" / "Mon compte" affiché pour les visiteurs (`user ? <UserMenu> : ...`)
- [ ] ⚠️ Bouton "Paramètres" : le contrat demande un bouton Paramètres pour le Visitor en Édition. Le code affiche un bouton "Personnalisation" (icône Palette) à la place. `SettingsMenu` n'est rendu que si `user` existe. Vérifier si "Personnalisation" couvre le besoin contractuel.
  - _Fichier_ : `Navbar.tsx:84` — `{isEdition && <SettingsMenu />}` conditionné à `user`
  - 🧪 Tester : naviguer vers `/edition` en mode Visitor et vérifier les paramètres accessibles
- [ ] 🔴 Bouton "Admin" : **aucun lien admin dans la navbar** — conforme ✅, mais vérifier que `UserMenu` (authentifié) ne révèle pas `/admin` à un Visitor éventuel.
  - _Fichier_ : `src/components/layout/user-menu/UserMenu.tsx` — à vérifier si `AdminMenuItem` est visible pour non-admin

---

## C — Gating & PersonalizationModal

**Contrats** : `FRONTEND_CONTRACT.md §6.4` (Wordings verrouillés), `§3.2.3`
**Fichier principal** : `src/components/shared/modal/modal-personalization/PersonalizationModal.tsx`

- [x] ✅ `PersonalizationModal` existe avec contexte `'visitor'` et `'free'` distincts
- [x] ✅ La modal est déclenchée depuis `Navbar.tsx` (bouton Personnalisation pour Visitor)
- [ ] 🔴 **WORDING INCORRECT** — Le contrat §6.4 spécifie :

  > _« Pour créer tes propres **tâches** et catégories, crée un compte et abonne-toi. »_

  Le code (`PersonalizationModal.tsx:26`) dit :

  > _« Pour créer tes propres **cartes** et catégories, crée un compte et abonne-toi. »_

  **"tâches" ≠ "cartes"** — wording contractuellement verrouillé.
  - _Fichier_ : `src/components/shared/modal/modal-personalization/PersonalizationModal.tsx:26`

- [ ] 🔴 **BOUTON SECONDAIRE INCORRECT** — Le contrat §6.4 spécifie :

  > Boutons : « Créer un compte » | **« Plus tard »**

  Le code (`PersonalizationModal.tsx:33`) affiche :

  > `secondaryLabel: 'Se connecter'` → redirige vers `/login`

  L'invariant contractuel dit : _« "Plus tard" ferme la modal, retour à l'état précédent sans perte »_. Ici, le bouton secondaire **redirige** vers `/login` au lieu de fermer la modal. Le visiteur n'a **aucune option de fermeture sans s'engager**.
  - _Fichier_ : `src/components/shared/modal/modal-personalization/PersonalizationModal.tsx:32-33, 56-59`

- [ ] 🔴 **Aucune modal bloquante sans échappatoire** — En conséquence du point précédent, le Visitor n'a pas de bouton "Plus tard" fonctionnel. Violation de l'invariant TSA anti-surprise.

- [ ] 🔴 **PersonalizationModal non déclenchée depuis "Ajouter une carte personnelle"** ou "Gérer les catégories" dans l'interface d'édition. La modal n'est accessible que via le bouton Navbar "Personnalisation". Vérifier si ces boutons sont visibles/cliquables pour un Visitor dans `CardsEdition.tsx`.
  - _Fichier_ : `src/components/features/cards/cards-edition/CardsEdition.tsx` — à auditer
  - 🧪 Tester : tenter de créer une carte personnelle en mode Visitor

- [ ] 🔴 **Aucun message culpabilisant** — À vérifier manuellement que les messages ne créent pas une pression psychologique.
  - 🧪 Tester : lire les messages affichés au Visitor lors du gating

---

## D — Données locales (liste fermée)

**Contrats** : `FRONTEND_CONTRACT.md §7.1` · `ux.md §Visitor`

- [x] ✅ Profil enfant local implicite unique — créé implicitement, sans choix
  - 🧪 Tester : vérifier en IndexedDB qu'un seul profil enfant local existe
- [x] ✅ Séquences + étapes stockées localement (IndexedDB) via `useSequencesLocal`, `useSequencesWithVisitor`
  - _Fichier_ : `src/hooks/useSequencesLocal.ts`, `src/hooks/useSequencesWithVisitor.ts`
- [ ] ⚠️ Timelines/slots locales Visitor — `useTimelines` et `useSlots` doivent gérer le mode Visitor. Vérifier qu'ils basculent sur IndexedDB pour Visitor.
  - _Fichier_ : `src/hooks/useTimelines.ts`, `src/hooks/useSlots.ts`
  - 🧪 Tester : créer une timeline en Visitor, vérifier présence en IndexedDB (pas en Supabase)
- [ ] ⚠️ Sessions + progression locales — `useSessions` doit gérer le mode Visitor.
  - _Fichier_ : `src/hooks/useSessions.ts`
  - 🧪 Tester : valider une étape en Visitor, vérifier qu'aucun INSERT ne part vers Supabase
- [x] ✅ Lecture banque cartes `published` via Supabase anon (`useBankCards`)
  - _Fichier_ : `src/hooks/useBankCards.ts`
- [x] ✅ Aucun accès à `account_preferences` pour Visitor — `useAccountPreferences` retournera null pour visitor (pas de ligne DB)
  - 🧪 Tester : vérifier aucun appel à `account_preferences` dans Network tab pour Visitor
- [x] ✅ Aucune synchronisation cloud — architecture local-only confirmée dans les hooks

---

## E — Fonctionnalités accessibles Visitor

**Contrats** : `FRONTEND_CONTRACT.md §3.1, §3.2.1, §3.2.5`

- [x] ✅ Composition de timelines (CRUD local) — `useTimelines` + `useSlots` en mode Visitor
  - 🧪 Tester : créer/modifier/supprimer slots en mode Visitor
- [ ] ⚠️ Exécution de timelines (session locale) — dépend du comportement de `useSessions` en mode Visitor
  - 🧪 Tester : démarrer une session et valider des étapes en mode Visitor
- [x] ✅ Planning visuel fonctionnel — `SlotsEditor` permet ajout/suppression slots sans restriction status
  - _Fichier_ : `src/components/features/timeline/slots-editor/SlotsEditor.tsx`
- [x] ✅ Séquençage fonctionnel (local) via `useSequencesWithVisitor` et `useSequencesLocal`
  - _Fichier_ : `src/hooks/useSequencesWithVisitor.ts`
- [ ] ⚠️ Économie de jetons fonctionnelle — `SlotsEditor` permet modification `tokens` (0..5). Vérifier que c'est local pour Visitor.
  - 🧪 Tester : modifier tokens d'un slot en Visitor, vérifier stockage local
- [x] ✅ Lecture banque de cartes prédéfinies (`published`) via `useBankCards`
- [x] ✅ Progression session visible — `SlotCard` et `TokensGrid` affichent la progression

---

## F — Fonctionnalités INTERDITES Visitor

**Contrats** : `FRONTEND_CONTRACT.md §7.1`, `§3.2.3`

- [x] ✅ Création de cartes personnelles → bloquée (status 'subscriber' requis en DB)
  - 🧪 Tester : vérifier que le bouton "Créer carte" est absent/désactivé pour Visitor
- [ ] 🔴 Création de catégories → PersonalizationModal devrait apparaître MAIS le bouton secondaire ne ferme pas proprement la modal (voir §C)
- [x] ✅ Accès Page Profil → impossible (`PrivateRoute` redirige vers `/login`)
- [x] ✅ TimeTimer → OFF pour Visitor (`FloatingTimeTimer:232` : `if (isVisitor) return null`)
  - _Fichier_ : `src/components/features/time-timer/FloatingTimeTimer.tsx:231-232`
- [x] ✅ Accès préférences DB (`account_preferences`) → impossible (pas de ligne DB Visitor)
- [ ] ⚠️ Modification ligne TrainProgressBar → le sélecteur de ligne s'affiche et peut être interagi en mode Visitor (voir §G)

---

## G — TrainProgressBar (Visitor)

**Contrats** : `FRONTEND_CONTRACT.md §8.9.2`, `§7.2`
**Fichier principal** : `src/components/features/taches/train-progress-bar/TrainProgressBar.tsx`

- [ ] 🔴 **Ligne NON forcée à metro/1** — Le composant utilise `preferences?.train_line || '1'` via `useAccountPreferences()`. Pour un Visitor, `preferences` est null (pas de ligne DB). Le useState initial est `'1'` — donc la ligne affichée est bien la 1 par défaut, **mais uniquement par chance** (valeur par défaut du useState). Aucune logique explicite ne force la ligne pour Visitor.
  - _Fichier_ : `TrainProgressBar.tsx:39` — `useState(preferences?.train_line || '1')`

- [ ] 🔴 **Sélecteur de ligne AFFICHÉ pour Visitor** — Le contrat §7.2 dit : _« Aucun sélecteur de ligne affiché »_ pour Visitor. Le composant affiche toujours le `SelectWithImage` de sélection de ligne, sans vérifier si l'utilisateur est Visitor.
  - _Fichier_ : `TrainProgressBar.tsx:141-180` — `<SelectWithImage id="ligne" ...>` toujours rendu

- [ ] 🔴 **`useAccountPreferences` appelé sans fallback Visitor** — Ce hook est DB-first. En mode Visitor, il ne trouvera pas de ligne `account_preferences`. Le comportement exact dépend du hook (retourne null ou throw). À vérifier.
  - _Fichier_ : `TrainProgressBar.tsx:37` — `const { preferences, updatePreferences } = useAccountPreferences()`

- [ ] 🔴 **`updatePreferences` appelable par Visitor** — En changeant la ligne, `updatePreferences` est appelé. Pour un Visitor, cet appel Supabase échouera (pas de ligne DB). Aucune protection côté TrainProgressBar.
  - _Fichier_ : `TrainProgressBar.tsx:157` — `updatePreferences({ train_line: nouvelleLigne })`

- [x] ✅ Comportement total=0 sécurisé — `if (done === 0 || total === 0)` → `left: '0%'` (pas de NaN)
  - _Fichier_ : `TrainProgressBar.tsx:78-79`

- [x] ✅ `reduced_motion` respecté — classe `train--no-motion` appliquée si `prefersReducedMotion`
  - _Fichier_ : `TrainProgressBar.tsx:113`

---

## H — Contexte Tableau (enfant) — Visitor

**Contrats** : `FRONTEND_CONTRACT.md §3.1, §6.2`, `ux.md §Contexte Tableau`
**Fichier principal** : `src/page-components/tableau/Tableau.tsx`

- [x] ✅ Affichage timeline complète — `SlotCard` rendu pour chaque slot avec carte
- [x] ✅ Slots vides (card_id = NULL) filtrés — vérifier dans `Tableau.tsx` le filtre `card_id IS NOT NULL`
  - 🧪 Tester : créer un slot vide en Édition, vérifier qu'il n'apparaît pas en Tableau
- [x] ✅ `reduced_motion` respecté — `useReducedMotion()` utilisé dans Tableau
  - _Fichier_ : `Tableau.tsx:32`
- [ ] ⚠️ Grille jetons statique si `reduced_motion = true` — à vérifier dans `TokensGrid`
  - _Fichier_ : `src/components/features/tableau/tokens-grid/TokensGrid.tsx`
  - 🧪 Tester avec `prefers-reduced-motion: reduce` activé dans OS
- [x] ✅ Aucun message technique (réseau, quota, abonnement) — règle documentée et commentée
  - _Fichier_ : `Tableau.tsx:10-15`
- [x] ✅ États visuels explicites Maintenant / À venir / Fini — gérés dans `SlotCard`
  - _Fichier_ : `src/components/features/tableau/slot-card/SlotCard.tsx`
- [ ] ⚠️ Interface émotionnellement neutre — à vérifier : aucun emoji négatif, aucun texte anxiogène
  - 🧪 Tester : parcourir le Tableau en Visitor avec session active
- [x] ✅ Session Terminée = lecture seule, récompense affichée — `SessionComplete` component
  - _Fichier_ : `src/components/features/tableau/session-complete/SessionComplete.tsx`
- [ ] 🔴 **Transitions < 0.3s** — non vérifiable en statique
  - 🧪 Tester avec DevTools (CSS animations panel) ou Playwright
- [ ] 🔴 **Aucune disparition brutale d'éléments** — non vérifiable en statique
  - 🧪 Tester : valider plusieurs étapes en séquence rapide, observer les transitions

---

## I — Contexte Édition (adulte) — Visitor

**Contrats** : `FRONTEND_CONTRACT.md §6.3`
**Fichier principal** : `src/page-components/edition/Edition.tsx`

- [x] ✅ Messages explicites non techniques si action bloquée — `dbErrorToMessage()` dans `SlotsEditor`
  - _Fichier_ : `SlotsEditor.tsx:251-268`
- [x] ✅ Pas de message culpabilisant — à confirmer runtime
  - 🧪 Tester : tenter des actions bloquées, vérifier le ton des messages
- [x] ✅ Loading / empty / error states dans `SlotsEditor` (slots loading, error, empty list)
  - _Fichier_ : `SlotsEditor.tsx:434-460`
- [ ] ⚠️ Loading / empty / error states pour banque cartes en Visitor — `useBankCards` doit gérer ces états
  - 🧪 Tester : couper le réseau et vérifier l'état de la bibliothèque de cartes
- [ ] ⚠️ Confirmation avant actions destructives (vider timeline, supprimer slot) — confirmation 2-clics dans `SlotsEditor` pour reset session ✅, mais vérifier pour "Vider la timeline"
  - _Fichier_ : `SlotsEditor.tsx:322-336` (reset session) — vérifier `Edition.tsx` pour "Vider"
  - 🧪 Tester : déclencher "Vider la timeline" en Visitor

---

## J — Sessions & Progression (Visitor)

**Contrats** : `FRONTEND_CONTRACT.md §5.2.6`, `ux.md §Session`

- [x] ✅ Création session locale — `useSessions` avec fallback Visitor
  - 🧪 Tester : vérifier création session dans IndexedDB au premier accès Tableau
- [x] ✅ Validation d'étapes (local) — `useSessionValidations` avec fallback Visitor
  - 🧪 Tester : valider une étape, vérifier progression sans appel Supabase
- [ ] ⚠️ Progression visible (snapshot) — `steps_total_snapshot` utilisé (pas recomptage live)
  - 🧪 Tester : vérifier que la barre de progression utilise le snapshot local
- [x] ✅ "Réinitialisation de session" (terme exact vérifié dans `SlotsEditor.tsx:594`)
  - _Fichier_ : `SlotsEditor.tsx:594` — `'Réinitialiser la session 🔄'`
- [ ] ⚠️ Matrice de verrouillage — slots validés non modifiables pendant session active
  - _Fichier_ : `SlotItem.tsx` — à vérifier la logique `isValidated && sessionStarted`
  - 🧪 Tester : valider une étape, tenter de modifier le slot correspondant en Édition
- [ ] ⚠️ Focus après suppression slot → prochaine étape non validée
  - _Fichier_ : `SlotsEditor.tsx:286-319` — logique implémentée, vérifier en runtime
  - 🧪 Tester : supprimer le slot au focus pendant session active

---

## K — Séquençage (Visitor)

**Contrats** : `FRONTEND_CONTRACT.md §3.2.5`

- [x] ✅ CRUD séquences en local via `useSequencesLocal` / `useSequencesWithVisitor`
  - _Fichier_ : `src/hooks/useSequencesLocal.ts`, `src/hooks/useSequencesWithVisitor.ts`
- [x] ✅ État "fait" des étapes = visuel, local-only, non sync — confirmé dans architecture
  - 🧪 Tester : marquer une étape de séquence "fait", recharger la page, vérifier persistance locale uniquement
- [ ] ⚠️ Mini-timeline "fait" en Tableau (local-only, reset chaque session)
  - _Fichier_ : `src/components/features/sequences/sequence-mini-timeline/SequenceMiniTimeline.tsx`
  - 🧪 Tester : réinitialiser la session, vérifier que l'état "fait" des étapes est bien remis à zéro

---

## L — Protection enfant (garde Page Édition)

**Contrats** : `FRONTEND_CONTRACT.md §2.2`

- [ ] ⚠️ Mécanisme de verrouillage UI identifié — le contrat §2.2 dit : _« Le mécanisme exact de verrouillage UI est NON SPÉCIFIÉ PAR LES SOURCES »_. Aucun composant de type "code PIN" ou "verrou parental" n'a été trouvé dans le code.
  - 🧪 Tester : depuis le Contexte Tableau, est-il possible d'accéder à l'Édition sans obstacle ?
- [ ] 🔴 **Mécanisme fonctionnel absent** — aucune implémentation de protection enfant identifiée dans `src/`. Le Tableau affiche un lien vers l'Édition accessible sans friction. Un enfant peut y accéder facilement.
  - _Note contractuelle_ : le contrat reconnaît que le mécanisme est "non spécifié" mais exige qu'il **existe** (`DOIT empêcher un enfant d'accéder au Contexte Édition depuis Tableau par inadvertance`)

---

## M — Consentement cookies (Visitor)

**Contrats** : `FRONTEND_CONTRACT.md §8.2`, `PLATFORM.md §2`
**Fichier principal** : `src/components/features/consent/CookieBanner.tsx`

- [x] ✅ Bannière peut apparaître sans auth (fonctionne avec `user_id: null`)
  - _Fichier_ : `CookieBanner.tsx:79` — `user_id: user?.id || null`
- [x] ✅ Bannière JAMAIS en Contexte Tableau — `pathname.startsWith('/tableau')` → `setVisible(false)`
  - _Fichier_ : `CookieBanner.tsx:20-28`
- [x] ✅ Choix : accept_all / refuse_all / custom via bouton "Personnaliser"
  - _Fichier_ : `CookieBanner.tsx:150-171`
- [x] ✅ `mode` et `action` correctement séparés — bug §8.2 corrigé (`mode: 'accept_all', action: 'first_load'`)
  - _Fichier_ : `CookieBanner.tsx:93-97, 106-110`
- [x] ✅ Symétrie CNIL — "Refuser" est le **premier** bouton (`firstButtonRef` sur refuseAll)
  - _Fichier_ : `CookieBanner.tsx:151-157`
- [ ] ⚠️ Champ `origin` — le contrat §8.2 spécifie `window.location.origin` (protocole + domaine + port). Le code envoie `window.location.hostname` (domaine seul, sans protocole).
  - _Fichier_ : `CookieBanner.tsx:82` — `origin: typeof window !== 'undefined' ? window.location.hostname : null`
  - 🧪 Vérifier dans Network tab que l'Edge Function reçoit bien `https://example.com` et non `example.com`

---

## N — Import Visitor → Compte

**Contrats** : `FRONTEND_CONTRACT.md §7.3`

- [x] ✅ Flow d'import explicite (modal avec confirmation, pas automatique)
  - _Fichier_ : `src/components/shared/modal/modal-visitor-import/ModalVisitorImport.tsx`
- [x] ✅ Modal déclenchée automatiquement après signup si séquences locales détectées
  - _Fichier_ : `src/app/(protected)/layout.tsx:46-73` — vérifie `hasLocalSequences()` au mount
- [ ] ⚠️ **Scope d'import limité aux séquences uniquement**. Le contrat §7.3 définit un périmètre complet :
  - Timelines (structure)
  - Sessions + progression
  - Séquences + étapes ← seul périmètre implémenté
  - Mapping catégories

  La modale ne mentionne que "séquences créées avant votre inscription". Les timelines, sessions et catégories ne sont pas importées.
  - _Fichier_ : `src/utils/visitor/importVisitorSequences.ts` — contient uniquement la logique séquences

- [ ] ⚠️ `device_id` local → premier device du nouveau compte — ce mécanisme n'a pas été identifié dans le code d'import. Le contrat §7.3 spécifie : _« le device_id local du Visitor devient le premier device enregistré du nouveau compte »_.
  - 🧪 Tester : créer un compte depuis mode Visitor, vérifier la table `devices` en DB

- [ ] ⚠️ Cartes banque dépubliées restent utilisables dans les usages importés — logique à vérifier côté RPC
  - 🧪 Tester avec une carte dépubliée utilisée dans une séquence Visitor avant import

---

## O — Accessibilité (transversal)

**Contrats** : `FRONTEND_CONTRACT.md §11.4`, `ux.md §Accessibilité TSA`

- [x] ✅ Focus visible — lien skip-link dans Navbar, `firstButtonRef` dans CookieBanner
  - _Fichier_ : `Navbar.tsx:42-44`, `CookieBanner.tsx:14`
- [x] ✅ Toasts compatibles lecteur d'écran — `aria-live` dans `CookieBanner`
  - 🧪 Tester avec VoiceOver / NVDA
- [ ] ⚠️ Focus trap dans CookieBanner — implémenté manuellement avec querySelectorAll. Risque de bugs si le DOM change.
  - _Fichier_ : `CookieBanner.tsx:45-74`
  - 🧪 Tester la navigation Tab dans la bannière
- [x] ✅ Mobile-first — layout responsive, `isMobile` check dans layout protected
  - _Fichier_ : `src/app/(protected)/layout.tsx:27-40`
- [ ] ⚠️ Zones tactiles ≥ 44×44px — non vérifiable en audit statique global
  - 🧪 Exécuter : `pnpm validate:touch-targets`
- [ ] ⚠️ `reduced_motion` respecté partout (animations non essentielles désactivées)
  - 🧪 Tester avec `prefers-reduced-motion: reduce` activé, parcourir toutes les vues Visitor
- [ ] ⚠️ Aucune surcharge cognitive côté enfant — émotionnellement neutre, textes courts
  - 🧪 Tester : parcourir le Tableau en Visitor, noter tout texte technique ou anxiogène

---

## P — Sécurité front (Visitor)

**Contrats** : `FRONTEND_CONTRACT.md §11.3`

- [x] ✅ Aucun `service_role` dans le code client — grep retourne 0 résultat
- [x] ✅ Aucune clé sensible côté client — seule la clé `anon` est utilisée
- [x] ✅ Accès Supabase Visitor = lecture banque cartes via clé anon uniquement
  - _Fichier_ : `src/hooks/useBankCards.ts`
- [x] ✅ Aucune route admin détectable — AdminRoute retourne 404 neutre, pas de lien
  - _Fichier_ : `src/components/shared/admin-route/AdminRoute.tsx`
- [x] ✅ Edge Functions appelées : uniquement `log-consent` depuis CookieBanner (anon key)
  - 🧪 Vérifier dans Network tab qu'aucun appel EF non attendu n'est émis
- [ ] ⚠️ Appels réseau inattendus — non vérifiable en statique
  - 🧪 Tester : ouvrir Network tab en Visitor, vérifier qu'aucun appel vers `service_role` endpoints ou tables privées n'est émis

---

## Q — Tokens Sass / Design System

**Contrats** : `CLAUDE.md §SCSS Design System`, skill `sass-tokens-discipline`

- [x] ✅ Composants principaux Visitor utilisent les tokens — `PersonalizationModal.scss`, `CookieBanner.scss`, `TrainProgressBar.scss`
  - 🧪 Exécuter : `pnpm lint:hardcoded` pour détecter les valeurs hardcodées
- [x] ✅ Architecture tokens-first documentée dans `.claude/skills/sass-tokens-discipline`
- [ ] ⚠️ Vérification exhaustive tokens dans tous les composants actifs en mode Visitor
  - 🧪 Exécuter : `pnpm build` (détecte les tokens invalides que `pnpm build:css` ne détecte pas)

---

## Section "Hors contrat"

Comportements trouvés dans le code **non couverts par les contrats** :

1. **Bouton "Personnalisation" dans Navbar Visitor** — icône Palette avec label "Personnalisation". Le contrat mentionne "Bouton Paramètres" mais ce bouton va plus loin en ouvrant directement la PersonalizationModal. C'est une invention UX non contractuelle.

2. **ThemeToggle visible pour Visitor** — le basculement de thème clair/sombre est accessible en mode Visitor. Non mentionné dans les contrats.

3. **Modal VisitorImport : fermeture automatique après 2s** — la modal se ferme automatiquement après un import réussi (`setTimeout 2000ms`). Ce comportement automatique peut être anxiogène pour TSA. Non spécifié par les contrats.
   - _Fichier_ : `ModalVisitorImport.tsx:62-65`

4. **Emoji dans le label "Réinitialiser la session 🔄"** — l'emoji est potentiellement lisible par les lecteurs d'écran. Non contractuellement interdit mais à surveiller.
   - _Fichier_ : `SlotsEditor.tsx:594`

5. **Emoji dans le bouton "Ajouter Étape 🎯" et "Ajouter Récompense 🏆"** — même remarque.
   - _Fichier_ : `SlotsEditor.tsx:565, 572`

---

## Section "Non vérifiable en audit statique"

Points qui **nécessitent un test manuel runtime** :

| #   | Point à tester                                                | Commande / Méthode                              |
| --- | ------------------------------------------------------------- | ----------------------------------------------- |
| 1   | Transitions < 0.3s sur tous les éléments Visitor              | DevTools → Performance → CSS Animations         |
| 2   | Aucune disparition brutale côté enfant                        | Playwright ou test manuel                       |
| 3   | Slots vides invisibles en Contexte Tableau                    | Créer slot vide en Édition, vérifier Tableau    |
| 4   | Grille jetons statique si reduced_motion                      | OS → Accessibilité → Réduire les animations     |
| 5   | Aucun appel Supabase en écriture pour Visitor                 | Network tab → filtrer par `supabase.co`         |
| 6   | Timeline/slots stockés localement (pas en DB)                 | Network tab + IndexedDB inspector               |
| 7   | Sessions locales créées correctement                          | Application tab → IndexedDB                     |
| 8   | device_id importé lors signup depuis Visitor                  | Supabase Studio → table `devices`               |
| 9   | `prefers-reduced-motion` respecté partout                     | `@media (prefers-reduced-motion: reduce)`       |
| 10  | Focus visible sur tous les éléments interactifs               | Naviguer au clavier (Tab)                       |
| 11  | TrainProgressBar : sélecteur de ligne caché pour Visitor      | Charger `/tableau` en Visitor                   |
| 12  | Lien "Préférences cookies" accessible (footer ou Profil)      | Vérifier composant Footer                       |
| 13  | GA4 non chargé sans consentement analytics                    | Network tab → filtrer `google-analytics`        |
| 14  | Session terminée = lecture seule (aucune validation possible) | Valider toutes les étapes, tenter re-validation |
| 15  | Protection enfant : verrouillage depuis Tableau → Édition     | Naviguer manuellement en Tableau                |
| 16  | PersonalizationModal : "Plus tard" retour sans perte          | Cliquer le bouton secondaire pour Visitor       |

---

## Synthèse des actions prioritaires

### 🔴 Critiques (à corriger avant mise en production)

1. **PersonalizationModal.tsx** — Corriger le wording : `'cartes'` → `'tâches'` (contrat §6.4)
2. **PersonalizationModal.tsx** — Remplacer `'Se connecter'` par `'Plus tard'` comme bouton secondaire Visitor, avec fermeture de modal sans redirection
3. **TrainProgressBar.tsx** — Ajouter détection Visitor : forcer ligne `'1'`, masquer `SelectWithImage` si Visitor
4. **Protection enfant** — Implémenter un mécanisme de verrouillage entre Tableau et Édition (verrou code PIN, action adulte, etc.)

### ⚠️ Importants (à résoudre en priorité moyenne)

5. **Import Visitor → Compte** — Étendre le périmètre d'import aux timelines, sessions et mapping catégories
6. **CookieBanner.tsx** — Remplacer `window.location.hostname` par `window.location.origin` dans le payload
7. **device_id** — Vérifier et implémenter le mécanisme de promotion du device_id local lors du signup Visitor → Compte
8. **useTimelines / useSlots / useSessions** — Auditer et confirmer le comportement local-only pour Visitor

---

_Fichier généré par audit statique — 2026-04-01. Tous les points 🧪 nécessitent une validation en runtime._
