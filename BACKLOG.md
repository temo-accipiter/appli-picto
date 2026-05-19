# Tickets — Dette résiduelle Refonte TrainProgressBar V1

> Issus de la mission de refonte TrainProgressBar (11 commits, désengagement copyright RATP).
> Aucun ticket n'est bloquant pour la mise en production V1.

---

## 🔴 Priorité 1 — À traiter avant activation CI / prochain onboarding dev

### ~~TICKET-001 — Stabiliser le test flaky `useAccountPreferences.test.ts`~~ ✅ RÉSOLU

**Type** : Bug / Dette technique
**Résolu le** : 2026-05-19

**Cause racine identifiée**
`vi.mock('@/hooks', async () => { const actual = await vi.importActual('@/hooks') ... })`
déclenchait l'import du barrel complet, incluant `useSequencesLocal` et `useSequenceStepsLocal`
qui initialisent IndexedDB. Sous charge de suite complète (workers Vitest en parallèle),
ces initialisations async entraient en compétition et causaient des timeouts intermittents.

Problème secondaire : `vi.clearAllMocks()` ne remettait pas à zéro les `mockReturnValue`,
causant une contamination d'état inter-tests (ex : test "user non connecté" polluant les suivants).

**Correction appliquée** (`src/hooks/useAccountPreferences.test.ts`)

1. Suppression de `vi.importActual` → mock minimal synchrone (3 symboles seulement)
2. `vi.clearAllMocks()` → `vi.resetAllMocks()` + re-setup explicite dans `beforeEach`
3. Export de `stableUser` depuis `vi.hoisted()` pour le réutiliser après le reset

**Vérification** : 10 runs consécutifs sans échec (isolation + suite complète).

---

### ~~TICKET-002 — Pinner la version du CLI Supabase~~ ✅ RÉSOLU

**Type** : Outillage / Dette technique
**Résolu le** : 2026-05-19

**Solution appliquée**

Stratégie choisie : `devDependencies` (asdf absent sur la machine de développement).

1. Ajout de `"supabase": "2.98.2"` dans `devDependencies` de `package.json` (version exacte, sans `^`).
2. `pnpm install` → CLI téléchargé dans `node_modules/.bin/supabase` via le postinstall du paquet.
3. Procédure de mise à jour documentée dans `docs/PLATFORM.md`.

**Vérification** : `./node_modules/.bin/supabase --version` retourne `2.98.2`.

---

## 🟡 Priorité 2 — À traiter dans le mois suivant la mise en prod V1

### TICKET-003 — Phase 6 : Suppression de la colonne `train_line`

**Type** : Migration DB / Nettoyage
**Effort estimé** : 30 minutes
**Priorité** : Moyenne (déprécation planifiée, pas bloquante)

**Contexte**
La colonne `account_preferences.train_line` est conservée pour rollback depuis la Phase 1.a de la refonte (passage à `progress_style`). Une fois validé que la V1 fonctionne correctement en production pendant quelques semaines, la colonne peut être supprimée définitivement.

**Pré-requis**

- V1 en production depuis au moins 2 semaines sans rollback nécessaire.
- Confirmation qu'aucun code applicatif ne lit ou n'écrit plus `train_line` (audit final).

**Tâches**

- [ ] Audit final : `grep -r "train_line"` dans le repo applicatif doit être vide.
- [ ] Créer une migration SQL : `ALTER TABLE public.account_preferences DROP COLUMN train_line;`.
- [ ] Régénérer `schema.sql` et `supabase.ts`.
- [ ] Sanity check + chaîne qualité au vert.
- [ ] Commit unique : `chore(db): drop deprecated train_line column`.

**Critères d'acceptation**

- Colonne supprimée en DB.
- `schema.sql` et `supabase.ts` ne contiennent plus de référence.
- Tous les tests passent.

---

## ~~🟢 Priorité 3~~ ✅ RÉSOLU (2026-05-19)

### ~~TICKET-004 — Créer un token `a11y('disabled-opacity')`~~ ✅ RÉSOLU

**Type** : Design system / Dette technique
**Résolu le** : 2026-05-19

**Correction appliquée**

Audit complet : 7 usages `opacity: 0.5` pour états désactivés trouvés (Toggle, Checkbox ×2, DeviceList, TrainThemeSelector ×2, \_mixins).

1. Token `'disabled-opacity': 0.5` ajouté à `$a11y-tokens` dans `_tokens.scss`.
2. CSS custom property `--a11y-disabled-opacity` ajoutée dans `_a11y-tokens.scss`.
3. Migration en un seul commit cohérent de tous les usages.
4. `TrainThemeSelector.scss` normalisé : `0.55` ramené à `0.5` (cohérence TSA).

**Critères d'acceptation** ✅

- Aucune valeur `opacity: 0.5` hardcodée pour états désactivés dans le codebase.
- Token source de vérité unique dans `$a11y-tokens`.

---

### ~~TICKET-005 — Migrer les hooks Supabase directs vers AbortController~~ ✅ RÉSOLU

**Type** : Architecture / Dette technique
**Résolu le** : 2026-05-19

**Résultat de l'audit**

`grep -r "supabase.from" src/hooks/` retourne 4 hits :

- `useDeviceRegistration.ts:79` → déjà dans le scope `AbortController` (ligne 73). ✅
- `useSlots.ts:240` → mutation `useCallback` (addSlot), appelée impérativement. Pas de useEffect. ✅
- `useSessions.ts:282` → mutation `useCallback` (createSession), appelée impérativement. Pas de useEffect. ✅
- `useProgressStations.ts` → seul hook avec `useEffect` sans `AbortController`. ❌ → migré.

**Correction appliquée** (`src/hooks/useProgressStations.ts`)

Pattern identique à `useDevices.ts` :

1. `AbortController` créé en début de `useEffect`.
2. `.abortSignal(controller.signal)` passé à la requête Supabase.
3. Guard `controller.signal.aborted` avant chaque `setState`.
4. `isAbortLike(err)` dans le catch pour absorber les erreurs d'abort.
5. Cleanup function `() => controller.abort()` retournée.

---

## ~~⚪ Priorité 4~~ ✅ RÉSOLU (2026-05-19)

### ~~TICKET-006 — Nettoyer le stash git de la tentative abandonnée du 16 mai~~ ✅ RÉSOLU

**Type** : Hygiène repo
**Résolu le** : 2026-05-19

**Décision appliquée** : (A) Suppression

Le stash `backup-feature-transport-au-cas-ou-20260516-1449` contenait l'approche RATP abandonnée (TrainProgressBar avec sélecteur de mode transport). La refonte V1 étant complète et stable, ce backup n'avait plus de valeur. Supprimé avec `git stash drop`.

---

## Notes transverses

- Tous ces tickets sont issus de la mission de refonte TrainProgressBar V1 (mai 2026).
- Aucun n'est bloquant pour la mise en production V1.
- Les tickets P1 (TICKET-001, TICKET-002) devraient être traités avant l'activation de la CI ou avant l'arrivée d'un nouveau dev sur le projet.
- Les tickets P3 (TICKET-004, TICKET-005) gagneraient à être groupés avec d'autres audits transverses du codebase pour amortir le coût de contexte.
