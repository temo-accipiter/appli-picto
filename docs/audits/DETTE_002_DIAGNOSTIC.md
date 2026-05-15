# Diagnostic test Tableau flaky — DETTE-002 Phase A

**Date** : 2026-05-15
**Auditeur** : Claude Code (analyse statique + reproduction)
**Statut** : Diagnostic terminé, en attente arbitrage Temo

---

## Reproduction du flakyness

### Série 1 — 30 exécutions (background, `--reporter=basic`, `tail -1`)

> ⚠️ Limite de collecte : `tail -1` ne capture que la dernière ligne de sortie Vitest
> (`Duration ...`). Les lignes `Tests X failed` sont émises AVANT la ligne Duration et sont
> donc perdues. On ne peut pas conclure "0 échec" depuis cette série.

- **Exécutions** : 30
- **Échecs confirmés** : non mesurable (limite de `tail -1`)
- **Durée `tests` (3 tests combinés)** :
  | Métrique | Valeur |
  |----------|--------|
  | Minimum | 280ms (run 19) |
  | Médiane | ~450ms |
  | Maximum | **2090ms (run 12)** |
  | Run 27 | **981ms** ← 19ms de marge avant timeout `waitFor` |
  | Run 26 | **1320ms** ← dépasse 1000ms |
  | Run 11 | **1690ms** ← dépasse largement 1000ms |

**Observation critique** : les runs 11, 12, 26, 27 montrent une durée `tests` supérieure
ou proche de 1000ms. Or le test flaky a un `waitFor` de 1000ms par défaut.
Sur une machine plus chargée (CI), ces 4 runs seraient très probablement des échecs.

### Série 2 — 10 exécutions (foreground, sortie complète)

- **Exécutions** : 10
- **Échecs** : 0
- **Durée test "affiche le conteneur principal du tableau"** : 318ms → 486ms
  - Observée sur 5 runs (lignes affichées quand > 100ms)
- **Taux d'échec mesuré** : 0/10

### Constat

**Flakyness non reproduite aujourd'hui** sur cette machine.

Analyse statique réalisée sur la base du symptôme documenté dans BACKLOG.md :

> _"Lors de l'échec, le DOM montre encore `loader-bounce` visible — le composant est encore
> en état de chargement"_

Ce symptôme est suffisamment précis pour identifier la cause sans reproduction directe.

---

## Lecture du test

### Fichier

`src/page-components/tableau/Tableau.test.tsx`

### Pattern d'attente DOM

| Test                              | Ligne | Pattern                              | Timeout explicite |
| --------------------------------- | ----- | ------------------------------------ | ----------------- |
| "affiche les tâches"              | 54–61 | `waitFor` + `queryAllByTestId`       | **5000ms**        |
| "affiche le conteneur principal"  | 66–69 | `waitFor` + `document.querySelector` | **aucun** ←       |
| "affiche le tableau en mode démo" | 77–81 | `waitFor` + `body.textContent`       | **3000ms**        |

**Incohérence critique** : le test à la ligne 66 utilise `waitFor` **sans option `timeout`**.
Le timeout par défaut de `@testing-library/react` est de **1000ms**.
Les deux autres tests dans le même fichier définissent explicitement 5000ms et 3000ms.

```tsx
// Ligne 66–69 — timeout implicite 1000ms (valeur Testing Library par défaut)
await waitFor(() => {
  const tableau = document.querySelector('.tableau-magique')
  expect(tableau).toBeTruthy()
})
```

### Mocks utilisés dans le fichier de test

```tsx
vi.mock('react-confetti') // → null
vi.mock('react-use') // → useWindowSize: { width: 1024, height: 768 }
vi.mock('next/navigation') // → useRouter, usePathname (local, même chose que global)
```

### Cycle des mocks

```tsx
beforeEach(() => {
  vi.clearAllMocks() // reset l'historique des appels, PAS les implémentations
})
```

Pas de `afterEach(cleanup)` explicite — Testing Library l'ajoute automatiquement.

---

## Lecture du setup global

### Fichiers concernés

| Fichier             | Rôle                                                                                |
| ------------------- | ----------------------------------------------------------------------------------- |
| `src/test/setup.ts` | Setup principal : MSW, i18n, ResizeObserver, WebSocket mock, next/navigation global |
| `tests/setup.ts`    | Setup secondaire : Worker mock, URL.createObjectURL, matchMedia                     |
| `vitest.config.ts`  | Config Vitest : environment jsdom, testTimeout 15000ms, setupFiles                  |

### Configuration motion dans le setup

- **`prefers-reduced-motion` forcé ?** Partiellement — `matchMedia` est mocké avec `matches: false`
  pour toutes les requêtes. Donc `prefers-reduced-motion: reduce` retourne **false** (mouvement
  autorisé). Cela affecte uniquement la durée du délai de `SessionComplete` (1200ms vs 400ms),
  pas l'état de chargement.
- **Timeout `waitFor` global configuré ?** Non — aucun appel à `configure({ asyncUtilTimeout: N })`
  dans les deux fichiers setup. Le timeout par défaut de Testing Library (1000ms) s'applique.
- **`testTimeout` Vitest** : 15000ms — cela concerne la durée maximale d'un test, pas le timeout
  interne de `waitFor`.

---

## Évaluation des hypothèses

### Hypothèse A — Timing / race condition

**Verdict : CONFIRMÉ**

**Justification ligne par ligne :**

1. **Le composant Tableau.tsx** renvoie `<Loader />` tant que `isLoading` est vrai (lignes 402–404) :

   ```tsx
   // Tableau.tsx, lignes 394–404
   const isLoading =
     timelineLoading ||
     sessionLoading ||
     slotsLoading ||
     bankLoading ||
     personalLoading

   if (isLoading) {
     return <Loader />
   }
   ```

   `.tableau-magique` n'apparaît **jamais** pendant la phase de chargement — ni dans la branche
   "vide" (ligne 410), ni dans le rendu principal (ligne 429).

2. **Le composant Loader** (qui contient `loader-bounce`) est exactement ce que le ticket décrit
   comme encore visible au moment de l'échec :

   ```tsx
   // Loader.tsx, ligne 20
   <div className="loader-bounce" aria-hidden="true">
   ```

3. **Le test ligne 66** attend `.tableau-magique` avec `waitFor` sans timeout → 1000ms par défaut.
   Si les 5 hooks ne sont pas tous résolus (`loading: false`) dans ce délai, le test échoue.

4. **La durée mesurée** du test "affiche le conteneur principal" : 318–486ms aujourd'hui sur cette
   machine. Marge par rapport au timeout : ~514ms minimum. Sur une machine CI chargée, cette marge
   disparaît.

5. **Preuve de variabilité** : la série 30 runs montre une durée totale `tests` allant de 280ms
   à 2090ms (run 12). Lors des runs lents, la résolution des hooks approche ou dépasse 1000ms.

6. **Incohérence dans le fichier de test lui-même** : les tests 1 et 3 ont `{ timeout: 5000 }` et
   `{ timeout: 3000 }`, seul le test 2 (le flaky) n'en a pas. Cela ressemble à un oubli.

---

### Hypothèse B — Pollution entre tests

**Verdict : IMPROBABLE**

**Justification :**

- `beforeEach(() => vi.clearAllMocks())` reset l'historique des mocks entre chaque test (ligne 47).
- MSW : `afterEach(() => server.resetHandlers())` dans `src/test/setup.ts` (ligne 55) — les handlers
  custom ajoutés pendant un test sont supprimés.
- Testing Library ajoute `afterEach(cleanup)` automatiquement → DOM nettoyé entre les tests.
- Les `tachesDb`, `recompensesDb` (état mutable MSW) ne sont pas resettés entre les tests, mais ces
  tables ne sont pas utilisées par Tableau.tsx — pas d'impact.
- `vi.mock(...)` au niveau module : les implémentations restent actives entre les tests, mais elles
  sont identiques (mêmes fns) → pas de pollution.

Aucune source de pollution entre les 3 tests identifiée.

---

### Hypothèse C — Dépendance à l'animation du loader

**Verdict : IMPROBABLE**

**Justification :**

Le `loader-bounce` (classe CSS sur un `<div>`) est une animation purement décorative.
L'apparition ou disparition de `.tableau-magique` dans le DOM est contrôlée par React (`isLoading`),
pas par une animation CSS.

Le seul endroit où `prefersReducedMotion` influence un timer JS est la révélation de `SessionComplete`
(Tableau.tsx, lignes 356–363) :

```tsx
const delay = prefersReducedMotion
  ? COMPLETION_REVEAL_DELAY_REDUCED_MOTION_MS // 400ms
  : COMPLETION_REVEAL_DELAY_MS // 1200ms
```

Mais ce timer ne concerne pas l'état de chargement initial — il intervient bien plus tard,
uniquement quand `session.state === 'completed'`. Les tests ne valident pas `completion-overlay`.

`matchMedia` est mocké avec `matches: false` → `prefersReducedMotion = false` → délai de 1200ms
mais cela n'affecte pas le chemin d'exécution testé.

---

### Hypothèse D — Charge machine

**Verdict : FACTEUR CONTRIBUTEUR, pas cause racine**

**Justification :**

- `testTimeout: 15000ms` (vitest.config.ts, ligne 14) — le test ne dépasse jamais ce plafond.
- La cause racine est le timeout de **`waitFor` = 1000ms** (Testing Library), pas le timeout Vitest.
- Sous charge, les hooks asynchrones prennent plus de temps → dépasse les 1000ms → échec.
- La charge machine aggrave le problème mais n'en est pas l'origine : c'est l'absence de timeout
  explicite qui crée la fragilité.

---

### Hypothèse additionnelle identifiée — Handlers MSW absents pour les tables Tableau

**Verdict : FACTEUR CONTRIBUTEUR à la variabilité**

Les handlers MSW couvrent uniquement les tables legacy :
`taches`, `recompenses`, `categories`, `parametres`, `profiles`, `abonnements`, `stations`.

Les tables utilisées par Tableau.tsx n'ont **aucun handler** :
`timelines`, `slots`, `bank_cards`, `personal_cards`, `sessions`, `session_validations`,
`sequences`, `sequence_steps`.

Config MSW : `server.listen({ onUnhandledRequest: 'warn' })` — les requêtes non interceptées
passent au réseau réel (jsdom → connection refused sur localhost:54321).

**Conséquence** : la vitesse à laquelle les hooks échouent (network error) et passent à
`loading: false` dépend du délai de rejet de connexion jsdom — imprévisible selon la charge.
Quand le rejet est rapide, `isLoading` passe à `false` en < 1000ms → test passe.
Quand le rejet est lent, `isLoading` reste à `true` pendant > 1000ms → test échoue.

(Alternative : si `AuthProvider` résout "pas d'utilisateur" avant que les hooks fassent une requête,
les hooks avec `activeChildId = null` se terminent immédiatement → `loading: false` instantané.
Cette variabilité dans l'ordre d'exécution async explique aussi l'intermittence.)

---

## Synthèse

### Hypothèse retenue (la plus probable)

**A — Timing / race condition**

### Confiance

**High**

### Justification finale

Le test ligne 66 utilise `waitFor` sans `{ timeout: N }`. Testing Library applique un timeout par
défaut de 1000ms. Le composant Tableau.tsx affiche `<Loader />` tant que l'un des 5 hooks est en
cours de chargement, et `.tableau-magique` est absent du DOM pendant ce temps. Sur cette machine,
la résolution prend 318–486ms (marge de ~520ms). Sur une machine CI plus lente ou sous charge,
cette marge s'efface et le timeout de 1000ms expire avant l'apparition de `.tableau-magique`.

Le symptôme documenté ("DOM montre encore `loader-bounce` visible") est exactement cohérent :
`loader-bounce` est rendu par `<Loader />`, qui est affiché quand `isLoading = true`. L'élément
`.tableau-magique` n'existe pas encore dans le DOM à ce moment.

La source de variabilité secondaire (MSW handlers absents) amplifie l'imprévisibilité du timing.

---

### Fix proposé (Phase B — à valider par Temo)

**Ligne 66 : ajouter `{ timeout: 5000 }` à `waitFor`** (alignement avec les 2 autres tests) :

```tsx
// AVANT (timeout implicite 1000ms)
await waitFor(() => {
  const tableau = document.querySelector('.tableau-magique')
  expect(tableau).toBeTruthy()
})

// APRÈS (timeout explicite 5000ms, cohérent avec le test ligne 54)
await waitFor(
  () => {
    const tableau = document.querySelector('.tableau-magique')
    expect(tableau).toBeTruthy()
  },
  { timeout: 5000 }
)
```

### Mode de validation

1. Lancer 50 runs en série sur la machine de dev : `for i in {1..50}; do pnpm vitest run ...; done`
2. Reproduire artificiellement la charge : lancer les 50 runs avec un processus CPU-intensif en
   parallèle (`yes > /dev/null &`)
3. Si 0 échec sur 50 runs chargés → fix validé
4. Vérifier que le hook pre-commit ne bloque plus sur cette suite

---

## Hypothèses secondaires (à vérifier si fix principal insuffisant)

1. **MSW handlers manquants** : Ajouter des handlers pour `timelines`, `slots`, `sessions`, etc.
   qui retournent des tableaux vides `[]`. Cela rend la résolution des hooks déterministe et
   immédiate plutôt que dépendante du délai de connexion refusée.
   Avantage collatéral : couvrir les appels réels du composant pour de futurs tests plus précis.

2. **Configuration globale `waitFor`** : Ajouter dans `src/test/setup.ts` :
   ```ts
   import { configure } from '@testing-library/react'
   configure({ asyncUtilTimeout: 5000 })
   ```
   Cela change le défaut pour TOUS les `waitFor` du projet → moins chirurgical mais plus sûr.

---

## Anomalies en passant (non traitées en Phase A)

- **Double mock `next/navigation`** : défini à la fois dans `src/test/setup.ts` (global, ligne 172)
  et dans `Tableau.test.tsx` (local, ligne 36). Le local écrase le global pour ce fichier.
  Pas de bug, mais redondance inutile.

- **`'use client'` au sommet de `Tableau.test.tsx`** (ligne 1) : directif Next.js dans un fichier
  de test qui tourne dans jsdom. Sans effet en Vitest, mais potentiellement trompeur.

- **MSW state mutable non resetté** : `tachesDb`, `recompensesDb` etc. sont modifiés par les
  handlers POST/PATCH/DELETE mais `resetMockDb()` n'est jamais appelé entre les tests.
  Pas un problème pour Tableau (ces tables ne sont pas utilisées), mais un risque pour d'autres
  suites de tests.
