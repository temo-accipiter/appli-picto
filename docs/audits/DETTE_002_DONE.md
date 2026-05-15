# DETTE-002 — Test Tableau flaky : fix appliqué

**Date** : 2026-05-15
**Diagnostic source** : DETTE_002_DIAGNOSTIC.md

## Fix appliqué

Ligne 66 de `src/page-components/tableau/Tableau.test.tsx` : ajout `{ timeout: 5000 }` à `waitFor`.

```tsx
// AVANT
await waitFor(() => {
  const tableau = document.querySelector('.tableau-magique')
  expect(tableau).toBeTruthy()
})

// APRÈS
await waitFor(
  () => {
    const tableau = document.querySelector('.tableau-magique')
    expect(tableau).toBeTruthy()
  },
  { timeout: 5000 }
)
```

## Validation

- **Méthode** : 50 runs consécutifs sous charge CPU artificielle (`yes > /dev/null &`)
- **Succès** : 50 / 50
- **Échecs** : 0 / 50
- **Verdict** : fix validé

## Commit

`dad8b45` — fix(test/tableau): ajouter timeout explicite à waitFor (5000ms)

## Dettes annexes identifiées (non traitées dans ce ticket)

- **Configuration globale `asyncUtilTimeout`** — ajouter `configure({ asyncUtilTimeout: 5000 })` dans
  `src/test/setup.ts` pour éviter que d'autres tests héritent silencieusement du défaut 1000ms.
  À arbitrer dans un ticket dédié.
- **Handlers MSW manquants** pour `timelines`, `slots`, `sessions`, `bank_cards`, `personal_cards`,
  `sequences`, `sequence_steps` — les hooks Tableau reçoivent des erreurs réseau au lieu de données
  mockées, ce qui crée une dépendance au délai de rejet jsdom. DETTE-003 potentielle.
- **Anomalies cosmétiques de Tableau.test.tsx** (non bloquantes) :
  - Double mock `next/navigation` (global setup.ts + local test file)
  - `'use client'` en ligne 1 d'un fichier de test (sans effet en Vitest mais trompeur)
