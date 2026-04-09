# Audit State Management — Appli-Picto

Date : 2026-04-08

---

## Résumé exécutif

L'application ne possède **aucun store Zustand**. Toute la gestion d'état repose sur React Contexts, des hooks locaux (`useState`/`useRef`), IndexedDB (Visitor) et Supabase (Auth). Cette architecture est cohérente pour un projet DB-first, mais elle génère plusieurs bugs structurels : l'absence de canal de communication entre les pages `/edition` et `/tableau` fait que les mutations structurelles (ajout/suppression de slot) ne se propagent pas en temps réel à la session en cours. Le mécanisme de synchronisation par `epoch` (DB auth) est solide côté utilisateur connecté, mais il est **absent en mode Visitor** (IndexedDB), ce qui est la cause racine des bugs #4a et #4b. Le Bug #1 (modale fantôme) a une cause distincte liée à la condition de déclenchement de la vérification IndexedDB.

---

## 1. Architecture state management actuelle

### 1.1 Inventaire Context providers

| Context                    | Fichier                                     | État géré                                                         | Scope                |
| -------------------------- | ------------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `AuthContext`              | `src/contexts/AuthContext.tsx`              | `user`, `authReady`, `loading`, `error`, `signOut`                | Global (root layout) |
| `ChildProfileContext`      | `src/contexts/ChildProfileContext.tsx`      | `activeChildId` (localStorage), `childProfiles` (DB), `isVisitor` | Global (root layout) |
| `DisplayContext`           | `src/contexts/DisplayContext.tsx`           | `showTrain`, `showAutre`, `showTimeTimer` (localStorage)          | Global (root layout) |
| `LoadingContext`           | `src/contexts/LoadingContext.tsx`           | Indicateur de chargement global                                   | Global (root layout) |
| `ToastContext`             | `src/contexts/ToastContext.tsx`             | File de notifications toast                                       | Global (root layout) |
| `OfflineContext`           | `src/contexts/OfflineContext.tsx`           | `isOnline`, queue de validations offline (localStorage)           | Global (root layout) |
| `RealtimeBankCardsContext` | `src/contexts/RealtimeBankCardsContext.tsx` | Canal Realtime Supabase pour les cartes banque                    | Global (root layout) |

**Note architecturale** : Les Contexts sont tous montés dans `src/app/providers.tsx` au niveau de la racine de l'application et **survivent aux navigations de page** (Next.js App Router conserve les layouts). Cependant, les hooks locaux dans les page-components (`useSessions`, `useSlots`, etc.) sont **réinstanciés à chaque montage de page**, ce qui est la source du problème de désynchronisation Édition ↔ Tableau.

### 1.2 Inventaire localStorage/sessionStorage

| Clé                                    | Fichier                        | Usage                                                   | Problème éventuel                          |
| -------------------------------------- | ------------------------------ | ------------------------------------------------------- | ------------------------------------------ |
| `applipicto:visitor:activeChildId`     | `ChildProfileContext.tsx`      | ID du profil enfant Visitor (`'visitor-local'`)         | Aucun — toujours forcé à `'visitor-local'` |
| `applipicto:activeChild:{userId}`      | `ChildProfileContext.tsx`      | ID du profil enfant actif (Auth, namespaced par userId) | Aucun                                      |
| `showTrain`                            | `DisplayContext.tsx`           | Préférence affichage train                              | Non namespaced — partagé entre comptes     |
| `showAutre`                            | `DisplayContext.tsx`           | Préférence affichage "autre"                            | Non namespaced — partagé entre comptes     |
| `showTimeTimer`                        | `DisplayContext.tsx`           | Préférence affichage timer                              | Non namespaced — partagé entre comptes     |
| `appli-picto:offline-validation-queue` | `OfflineContext.tsx`           | Queue de validations en attente (offline)               | Non namespaced — risque multi-compte       |
| `appli-picto-device-id`                | `useDeviceRegistration.ts`     | UUID device (empreinte appareil)                        | Aucun                                      |
| `lang`                                 | `i18n.ts` + `LangSelector.tsx` | Langue UI                                               | Non namespaced                             |
| `theme`                                | `ThemeToggle.tsx`              | Thème clair/sombre                                      | Non namespaced                             |
| `applipicto:consent`                   | `consent.ts`                   | Consentement cookies                                    | Non namespaced                             |
| `timeTimer_position`                   | `FloatingTimeTimer.tsx`        | Position du timer flottant                              | Non namespaced                             |
| `timer:*`                              | `useTimerPreferences.ts`       | Préférences timer (durée, couleur, vibration)           | Non namespaced                             |

### 1.3 IndexedDB (mode Visitor)

Base : `appli-picto-visitor` — Version 3

| Table IndexedDB               | Fichier de couche | Usage                               |
| ----------------------------- | ----------------- | ----------------------------------- |
| `sequences`                   | `sequencesDB.ts`  | Séquences Visitor local-only        |
| `sequence_steps`              | `sequencesDB.ts`  | Étapes des séquences Visitor        |
| `visitor_slots`               | `slotsDB.ts`      | Slots de la timeline Visitor        |
| `visitor_sessions`            | `sessionsDB.ts`   | Sessions Visitor (état d'exécution) |
| `visitor_session_validations` | `sessionsDB.ts`   | Validations des étapes Visitor      |

### 1.4 Store Zustand

**Absent.** La branche actuelle s'appelle `feature/refonte-zustand` mais aucun store Zustand n'a encore été créé dans le codebase.

---

## 2. Flow Visitor — Analyse

### 2.1 Persistance état Visitor

**Fichiers concernés :**

- `src/contexts/ChildProfileContext.tsx` — profil et activeChildId Visitor
- `src/hooks/useTimelines.ts` — timeline locale (`VISITOR_TIMELINE` constant en mémoire)
- `src/utils/visitor/slotsDB.ts` — slots dans IndexedDB
- `src/utils/visitor/sessionsDB.ts` — sessions et validations dans IndexedDB

**Mécanisme actuel :**

Le Visitor est identifié par `activeChildId === 'visitor-local'`. Son état est distribué sur trois couches :

1. **localStorage** : `applipicto:visitor:activeChildId` = `'visitor-local'` (toujours)
2. **Mémoire React** : `VISITOR_TIMELINE` (objet constant en mémoire, recréé à chaque montage)
3. **IndexedDB** : `appli-picto-visitor` — contient les slots, séquences, sessions et validations

La timeline Visitor est un objet constant défini directement dans `useTimelines.ts` (lignes 26-31) :

```typescript
const VISITOR_TIMELINE: Timeline = {
  id: 'visitor-timeline-local',
  child_profile_id: 'visitor-local',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
```

**Bug identifié :** Non pour la persistance de base — elle fonctionne. La `VISITOR_TIMELINE` est recréée à chaque montage du hook (les dates changent), mais ses IDs fixes (`id`, `child_profile_id`) permettent aux hooks dérivés de fonctionner correctement.

**Complexité fix :** Faible — pas de bug critique ici.

### 2.2 Déclenchement modale d'import (Bug #1)

**Fichiers concernés :**

- `src/app/(protected)/layout.tsx` — logique de déclenchement
- `src/utils/visitor/importVisitorSequences.ts` — fonction `hasLocalData()`
- `src/utils/visitor/slotsDB.ts` — `initializeDefaultSlots()`

**Mécanisme actuel :**

La modale est déclenchée dans `src/app/(protected)/layout.tsx` (lignes 50-78) :

```typescript
const checkLocalData = async () => {
  try {
    const hasData = await hasLocalData()
    if (hasData) {
      setShowImportModal(true)
    }
  } catch (error) {
    /* fail silent */
  } finally {
    setHasCheckedLocalSequences(true)
  }
}
```

La fonction `hasLocalData()` (lignes 273-285 de `importVisitorSequences.ts`) retourne `true` si **au moins un slot OU une séquence existe** en IndexedDB.

**Cause racine du Bug #1 :**

La fonction `initializeDefaultSlots()` (dans `slotsDB.ts`, ligne 363) est appelée **automatiquement** dans `useSlots()` à chaque chargement du Tableau Visitor (ligne 109 de `useSlots.ts`). Elle crée 1 slot `step` + 1 slot `reward` si la table est vide. Donc :

1. L'utilisateur est Visitor → `initializeDefaultSlots()` crée 2 slots vides (vides = `card_id: null`)
2. L'utilisateur s'inscrit → devient Auth, arrive sur `/edition` ou `/profil` (routes protégées)
3. Le layout protégé monte et appelle `hasLocalData()`
4. `hasLocalData()` trouve les 2 slots par défaut (même vides) → retourne `true`
5. La modale s'affiche avec "Nous avons détecté des données créées avant votre inscription"

**Deuxième cause :** Le flag `hasCheckedLocalSequences` est un état React local au layout. Il est remis à `false` si le layout se re-monte (navigation inter-route qui sort et re-entre dans `(protected)`). Cela provoque les affichages répétés après "Plus tard".

**Troisième cause :** Après import, `importAllVisitorData()` ne nettoie IndexedDB que si `imported_count > 0` (lignes 228-241). Si rien n'a été importé (slots vides), IndexedDB n'est pas vidée → la modale réapparaîtra.

**Complexité fix :** Moyenne.

- Fix 1 : `hasLocalData()` doit ignorer les slots vides (`card_id = null`), ne retourner `true` que si au moins un slot a une carte assignée.
- Fix 2 : Persister `hasCheckedLocalSequences` en localStorage plutôt qu'en état React local (clé : `applipicto:import-dismissed`).
- Fix 3 : Toujours vider IndexedDB après import, même si `imported_count === 0` (les slots vides n'ont pas de valeur à préserver).

### 2.3 Synchronisation slots/timelines Visitor

**Fichiers concernés :**

- `src/utils/visitor/slotsDB.ts` — opérations IndexedDB
- `src/hooks/useSlots.ts` — hook React (ré-fetch via `refreshKey`)

**Mécanisme actuel :** Les mutations de slots (`addStep`, `removeSlot`, `updateSlot`) écrivent dans IndexedDB puis appellent `refresh()` (incrémente `refreshKey`). Les composants qui utilisent `useSlots()` sur la même instance (même page) voient les mises à jour. Ceux sur une autre page (Tableau vs Édition) ont leur propre instance de `useSlots()` et **ne reçoivent aucune notification** des changements.

**Bug identifié :** Voir section 4 (désynchronisation Édition ↔ Tableau).

**Complexité fix :** Haute — nécessite un mécanisme cross-page (Zustand, BroadcastChannel, ou événement custom).

---

## 3. Tableau.tsx — Analyse session

### 3.1 Stockage validated_slots

**Fichiers concernés :**

- `src/hooks/useSessionValidations.ts` — état des validations
- `src/page-components/tableau/Tableau.tsx` — consommateur

**Mécanisme actuel :**

En mode Auth, les validations sont lues depuis Supabase (`session_validations` table). En mode Visitor, depuis IndexedDB (`visitor_session_validations`). Dans les deux cas, le state React local `validations` (tableau) est la source de vérité en mémoire.

Le `Set<string>` `validatedSlotIds` est recalculé à chaque render depuis `validations` :

```typescript
// useSessionValidations.ts, ligne 223
const validatedSlotIds = new Set(validations.map(v => v.slot_id))
```

**Problème détecté :** Ce `Set` est recréé à chaque render du hook (pas de `useMemo`). Cela entraîne une nouvelle référence à chaque render, ce qui peut provoquer des re-renders inutiles en cascade sur les composants consommateurs.

**Complexité fix :** Faible — ajouter `useMemo` autour du calcul de `validatedSlotIds`.

### 3.2 Calcul total_steps

**Fichiers concernés :**

- `src/page-components/tableau/Tableau.tsx` — lignes 348-351
- `src/utils/visitor/sessionsDB.ts` — `validateSlot()` ligne 416

**Mécanisme actuel (Auth) :** `steps_total_snapshot` est un entier fixé par la DB au moment de la **première validation** (trigger SQL). Il ne change jamais ensuite (contrainte DB). Le front lit cette valeur depuis `session.steps_total_snapshot`.

**Mécanisme actuel (Visitor) :** `steps_total_snapshot` est calculé **dynamiquement** lors de la première validation dans `sessionsDB.ts/validateSlot()` :

```typescript
// sessionsDB.ts, lignes 416-418
const stepsTotal = slots.filter(
  s => s.kind === 'step' && s.card_id !== null
).length
```

Cette valeur est ensuite stockée dans `visitor_sessions.steps_total_snapshot`.

**Formule finale dans Tableau.tsx (lignes 348-351) :**

```typescript
const totalForProgress = Math.max(
  session?.steps_total_snapshot ?? 0,
  visibleStepSlots.length
)
```

Le `Math.max` a été ajouté comme correctif pour gérer les race conditions entre le snapshot DB et la liste de slots actuellement affichés. Voir Bug #4a pour ses limites.

**Complexité fix :** Varie selon les bugs — voir sections 4.1 et 4.2.

### 3.3 Re-renders et déclencheurs

Le composant `Tableau` se re-rend dans les cas suivants :

1. Changement de `session` (via `useSessions` → Realtime Supabase ou `refresh()`)
2. Changement de `validatedSlotIds` (via `useSessionValidations` → `refreshKey++`)
3. Changement de `slots` (via `useSlots` → `refreshKey++` ou navigation)
4. Changement de `isOnline` (via `OfflineContext`)
5. Changement de `localOptimisticSlotIds` (validations offline)
6. Changement de `isSessionCompleted` ou `isCompletionRewardRevealed` (timers)
7. Détection de changement d'epoch → `refreshValidations()`, `refreshSlots()`, `refreshSequences()`

Le cycle epoch (lignes 212-246 de Tableau.tsx) est le mécanisme principal de synchronisation pour le mode Auth. Il détecte un `epoch_DB > epoch_local` et force un refetch de toutes les données. Ce mécanisme **n'existe pas en mode Visitor**.

---

## 4. Synchronisation Édition ↔ Tableau

### Contexte architectural

La page `/edition` monte sa propre instance de `useSlots()` et `useSessions()`. La page `/tableau` monte les siennes. Ces instances sont **totalement indépendantes** — elles ne partagent aucun état.

En mode **Auth**, la synchronisation repose sur le mécanisme `epoch` :

- L'adulte modifie la timeline en Édition → trigger DB incrémente `sessions.epoch`
- Le channel Supabase Realtime (dans `useSessions.ts` lignes 228-260) propage l'UPDATE à Tableau
- Tableau détecte `epoch_DB > epoch_local` → refetch de tout

En mode **Visitor**, ce mécanisme est absent. IndexedDB ne supporte pas les notifications inter-instances/pages. La seule façon pour Tableau de voir les changements d'Édition est de re-monter la page (navigation vers Tableau → remontage des hooks → refetch IndexedDB).

### 4.1 Suppression slot — Bug #4a (Ghost Step)

**Scénario :** Session avec 3 étapes, 1ère validée, on supprime la 3ème depuis Édition, on revient au Tableau.

**En mode Visitor :**

1. Session Visitor créée avec `steps_total_snapshot = null` (état `active_preview`)
2. L'enfant valide la 1ère carte → `validateSlot()` fixe `steps_total_snapshot = 3` et passe en `active_started`
3. L'adulte va en Édition → `removeSlot()` supprime le slot en IndexedDB → `useSlots` dans Édition se rafraîchit
4. L'adulte revient au Tableau → `useSlots` dans Tableau re-monte → refetch IndexedDB → `visibleStepSlots.length = 2`
5. La session Visitor dans IndexedDB a toujours `steps_total_snapshot = 3` (fixé à l'étape 2)
6. **Calcul :** `totalForProgress = Math.max(3, 2) = 3` ← **CORRECT en soi**

**Problème identifié :** Le `Math.max` protège contre la complétion prématurée, mais il empêche aussi le Ghost Step de se résoudre. `totalForProgress = 3` alors que seuls 2 slots existent → le train ne peut jamais atteindre la 3ème station → la récompense ne se déclenche jamais.

**Cause racine :**

```typescript
// Tableau.tsx, lignes 348-351 — le Math.max est le correctif qui crée le deadlock Ghost Step
const totalForProgress = Math.max(
  session?.steps_total_snapshot ?? 0, // ← 3 (ancien snapshot)
  visibleStepSlots.length // ← 2 (état actuel)
)
// Résultat : 3 → deadlock
```

En mode Visitor, `steps_total_snapshot` dans IndexedDB n'est jamais mis à jour après une suppression. La session Visitor n'a pas d'équivalent au mécanisme Auth `hard_reset_timeline_session` (qui remet le snapshot à null) déclenché automatiquement par l'epoch.

**En mode Auth :**

La suppression d'un slot déclenche le trigger DB `validate_session_state_transition` et incrémente l'epoch. Le channel Realtime propage l'epoch++. Tableau détecte le changement et refetch tout (slots + session + validations). La session en DB a son snapshot géré par la fonction `hard_reset_timeline_session` si nécessaire. Ce flux est globalement correct, mais la synchronisation en temps réel depuis Édition → Tableau dépend du Realtime et peut avoir des latences.

**Complexité fix :** Haute (Visitor) / Moyenne (Auth).

### 4.2 Ajout slot — Bug #4b (Meltdown TSA)

**Scénario :** Session avec 2 étapes, 1ère validée, on ajoute une 3ème étape depuis Édition, on revient au Tableau, on valide la 2ème.

**En mode Visitor :**

1. Session créée avec `steps_total_snapshot = null` (preview)
2. L'enfant valide la 1ère carte → `validateSlot()` compte les slots actuels = 2, fixe `steps_total_snapshot = 2`, passe en `active_started`
3. L'adulte va en Édition → `addStep()` crée un 3ème slot → IndexedDB = 3 slots
4. L'adulte revient au Tableau → refetch → `visibleStepSlots.length = 3`
5. `totalForProgress = Math.max(2, 3) = 3` ← **correct** pour la progression
6. L'enfant valide la 2ème carte → `validateSlot()` est appelé

**Cause racine du Meltdown :**

Dans `sessionsDB.ts/validateSlot()`, la logique de complétion est :

```typescript
// sessionsDB.ts, lignes 474-479
const validationsCount = existingValidations.length + 1
if (
  session.steps_total_snapshot !== null &&
  validationsCount >= session.steps_total_snapshot  // ← 2 >= 2 = TRUE
) {
  session.state = 'completed'  // ← Session marquée comme terminée !
```

Le snapshot vaut `2` (fixé à la 1ère validation), il y a maintenant `2` validations → la condition `2 >= 2` est vraie → la session passe à `completed`. Tableau reçoit cet état `completed` et affiche l'overlay de fin de session. **Toutes les cartes semblent se "décrocher"** car l'overlay masque le tableau et la session est terminée.

En réalité, les validations ne sont pas perdues — c'est la session qui est complétée prématurément avec un snapshot obsolète. L'enfant a l'impression d'un reset car l'overlay de session terminée s'affiche sur 2/3 étapes.

**En mode Auth :**

Le trigger DB `hard_reset_timeline_session` et les epoch guarantissent que le snapshot est recalculé lors de l'ajout d'un slot. Le Realtime propage l'epoch++. Tableau détecte et refetch. Le snapshot en DB est remis à `null` si nécessaire. Ce mécanisme n'existe pas côté Visitor IndexedDB.

**Complexité fix :** Haute (Visitor).

Pour corriger ce bug côté Visitor, il faudrait :

- Soit invalider `steps_total_snapshot` (le remettre à `null`) lors de tout `addStep()` ou `removeSlot()` qui modifie le nombre de slots visibles
- Soit recalculer le snapshot à chaque validation (renoncer à son caractère immuable côté Visitor)
- Soit implémenter un mécanisme de notification cross-page (BroadcastChannel ou Zustand store persistant)

### 4.3 Fin de session depuis Édition (Bug #5)

**Scénario :** Session Auth avec 2 cartes, 1 validée. L'adulte supprime la 2ème carte non validée depuis Édition.

**Mécanisme actuel :**

Dans `EditionTimeline.tsx`, après `removeSlot()`, on appelle `refreshSession()` (ligne 259-263). L'effet `prevSessionStateRef` (lignes 177-203) détecte la transition `active_started → completed` et :

1. Appelle `refreshValidations()` pour enlever les cadenas
2. Affiche un toast "Session terminée automatiquement" **sur la page Édition**

**Cause racine :**

```typescript
// EditionTimeline.tsx, lignes 188-200
if (prevState === 'active_started' && currentState === 'completed') {
  refreshValidations()
  showToast(
    'Session terminée automatiquement — toutes les cartes restantes étaient validées',
    'info'
  )
  // ← Aucune navigation vers /tableau
  // ← Aucun mécanisme pour "retenir" l'état completed jusqu'au retour de l'enfant
}
```

L'enfant n'est pas sur la page Tableau au moment de la completion. Quand il y revient, `useSessions()` dans Tableau re-charge la session depuis DB → `state = 'completed'` → `isSessionCompleted = true`. Jusqu'ici c'est correct.

**Le vrai problème** est dans Tableau.tsx, lignes 338-377 : l'overlay `SessionComplete` est conditionné à `shouldShowSessionComplete = isSessionCompleted && isCompletionRewardRevealed`. `isCompletionRewardRevealed` passe à `true` avec un délai de 1200ms après détection de la transition `!wasCompleted → completed`. Si la session est déjà `completed` lors du **montage initial** (l'enfant revient après que l'adulte ait terminé depuis Édition), `wasCompleted` est initialisé à `true` (ligne 340) et `previousSessionCompletedRef.current` est aussi `true` → la condition `!wasCompleted` est fausse → `isCompletionRewardRevealed` reste à `false` (ligne 339, initialisé depuis `isSessionCompleted = true` donc en fait... `true`).

En réalisant une analyse complète : `isCompletionRewardRevealed` est initialisé à `useState(isSessionCompleted)` — donc si la session est déjà `completed` au montage, cet état vaut `true` dès le départ. L'overlay devrait donc s'afficher. Le bug réel est probablement dans le timing ou dans le fait que la page Édition ne force pas un retour vers Tableau pour que l'enfant voie la récompense.

**Complexité fix :** Moyenne — ajouter une redirection vers `/tableau` après détection de completion en Édition, et potentiellement un état persisté (localStorage flag) pour indiquer "une session vient de se terminer, afficher la récompense au prochain chargement du Tableau".

---

## 5. Verdict final

### 5.1 Cause principale des bugs

**La cause n'est pas une absence de Zustand.** C'est une **lacune d'architecture spécifique au mode Visitor** : IndexedDB ne fournit pas de mécanisme de notification cross-instance/cross-page. Quand l'adulte modifie la structure en Édition et que l'enfant revient au Tableau, l'état de session (`steps_total_snapshot`) dans IndexedDB est obsolète et ne tient pas compte des modifications structurelles.

En mode Auth, ce problème est résolu par le mécanisme `epoch` (DB + Supabase Realtime), qui force un refetch et recalcul du snapshot côté DB. Ce mécanisme est absent en Visitor.

Les bugs peuvent être classés :

| Bug                               | Concerne       | Cause technique                                                                                            | Sévérité |
| --------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------- | -------- |
| **#1** Modale fantôme             | Visitor + Auth | `hasLocalData()` retourne `true` pour les slots vides par défaut + flag non persisté                       | Haute    |
| **#4a** Ghost Step                | Visitor        | `steps_total_snapshot` figé à 3, ne se met pas à jour après suppression + `Math.max` garde la valeur haute | Critique |
| **#4b** Meltdown TSA              | Visitor        | `steps_total_snapshot = 2` invalide après ajout d'un slot, completion prématurée sur `2 >= 2`              | Critique |
| **#5** Fin session depuis Édition | Auth           | Pas de redirection/signal vers Tableau après completion détectée en Édition                                | Haute    |

### 5.2 Zustand justifié ?

**Cas précis justifiant Zustand ou équivalent :**

1. **Session active Visitor** — Partager l'état de session (`steps_total_snapshot`, `validatedSlotIds`) entre les pages `/tableau` et `/edition` sans re-charger depuis IndexedDB. Un store Zustand avec persistance localStorage/IndexedDB résoudrait les bugs #4a et #4b.
2. **Notification de mutation structurelle** — Quand l'adulte modifie la timeline en Édition, notifier Tableau sans Realtime (ni pour Visitor, ni pour éviter la latence Auth). Un store partagé permettrait une invalidation immédiate.
3. **Flag import Visitor** — `hasCheckedLocalSequences` devrait survivre aux navigations. Un store persisté ou localStorage direct serait plus fiable qu'un état React local de layout.

**Alternative sans Zustand :** Un `BroadcastChannel` HTML5 (natif, support universel) permettrait à la page Édition d'envoyer un message `{ type: 'SLOTS_CHANGED', slotCount: N }` à la page Tableau pour déclencher un refetch et invalider le snapshot. Cette solution est plus légère que Zustand mais moins générale.

### 5.3 Plan de correction recommandé

**Priorité 1 — Bug #1 (Modale fantôme) :** Faible complexité, impact UX immédiat.

- Fichier : `src/utils/visitor/importVisitorSequences.ts` (`hasLocalData()`)
- Fix : Ne compter que les slots avec `card_id !== null` (slots réellement modifiés)
- Fichier : `src/app/(protected)/layout.tsx`
- Fix : Persister le flag `hasCheckedLocalSequences` via `localStorage.setItem('applipicto:import-dismissed', 'true')` au lieu d'un état React local
- Fichier : `src/utils/visitor/importVisitorSequences.ts` (`importAllVisitorData()`)
- Fix : Vider IndexedDB même si `imported_count === 0` (slots vides sans valeur)

**Priorité 2 — Bugs #4a et #4b (Ghost Step + Meltdown TSA) :** Critique côté Visitor.

- Approche recommandée : Implémenter une **invalidation du snapshot** côté Visitor lors de toute mutation structurelle.
- Fichier : `src/utils/visitor/sessionsDB.ts`
- Fix #4a : Ajouter une fonction `invalidateSessionSnapshot(sessionId)` qui remet `steps_total_snapshot = null` et repasse en `active_preview` si `active_started`
- Fichier : `src/utils/visitor/slotsDB.ts`
- Fix : Appeler `invalidateSessionSnapshot()` dans `deleteSlot()` et `createSlot()`
- Ce fix garantit que `validateSlot()` recalcule le snapshot au prochain clic de validation

**Priorité 3 — Bug #5 (Fin de session depuis Édition) :** Impact TSA sévère côté Auth.

- Fichier : `src/page-components/edition-timeline/EditionTimeline.tsx`
- Fix : Lors de la détection `active_started → completed`, au lieu d'un simple toast, persister un flag `localStorage.setItem('applipicto:session-just-completed', 'true')` et naviguer vers `/tableau` avec `router.push('/tableau')`
- Fichier : `src/page-components/tableau/Tableau.tsx`
- Fix complémentaire : Au montage, si ce flag est présent, forcer `isCompletionRewardRevealed = true` immédiatement (sans délai) et vider le flag

**Priorité 4 — `validatedSlotIds` sans useMemo :** Dette technique légère.

- Fichier : `src/hooks/useSessionValidations.ts`, ligne 223
- Fix : Entourer le calcul du Set avec `useMemo([validations])`

**Priorité 5 (optionnel) — Store Zustand pour session Visitor :**

- Si les bugs #4a/#4b persistent ou si d'autres désynchronisations apparaissent, créer un store Zustand minimal (`useVisitorSessionStore`) gérant `steps_total_snapshot`, `validatedSlotIds`, et un `slotsVersion` (incrémenté à chaque mutation structurelle)
- Ce store remplacerait la couche IndexedDB pour les données de session en mémoire, en gardant IndexedDB pour la persistance entre rechargements de page

---

_Rapport produit par audit statique — aucun fichier existant modifié._
