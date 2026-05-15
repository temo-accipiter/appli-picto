# DETTE-005 — Handlers MSW résiduels : fix appliqué

**Date** : 2026-05-15
**Commit** : voir ci-dessous

---

## Handlers / fixes appliqués

### Fix 1 — `vitest.config.ts` : variable d'environnement NEXT_PUBLIC_SUPABASE_URL

**Problème** : `supabaseClient.ts` lit `process.env.NEXT_PUBLIC_SUPABASE_URL`, absent de
la config Vitest. Le fallback hardcodé (`https://tklcztqoqvnialaqfcjm.supabase.co`) s'activait,
rendant tous les handlers MSW sur `localhost:54321` inopérants en tests d'intégration.

**Fix** :

```typescript
// vitest.config.ts
env: {
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
},
```

Cela corrige d'un coup le warning `GET /rest/v1/cards` (3 occurrences) et active
rétroactivement tous les handlers DETTE-004 (timelines, slots, sessions, sequences…).

---

### Fix 2 — `src/test/mocks/handlers.ts` : handler WebSocket MSW v2

**Problème** : MSW v2 possède son propre intercepteur WebSocket indépendant de
`globalThis.WebSocket`. Le mock `MockWebSocket` de `setup.ts` ne l'affecte pas.
Sans `ws.link()`, MSW émettait 2 warnings par run pour
`ws://localhost:54321/realtime/v1/websocket`.

**Fix appliqué** :

```typescript
import { http, HttpResponse, ws } from 'msw'

const supabaseRealtime = ws.link('ws://localhost:54321/realtime/v1/websocket')

// Dans handlers[] :
supabaseRealtime.addEventListener('connection', () => {}),
```

**Forme minimale retenue** : `addEventListener('connection', () => {})` avec callback vide.
Le `ws.link()` seul (sans `addEventListener`) ne produit pas de handler — la forme avec
callback vide est nécessaire et suffisante.

---

## Validation

| Critère                            | Résultat                                       |
| ---------------------------------- | ---------------------------------------------- |
| Warnings MSW avant                 | 5 (3× cards HTTP + 2× WebSocket)               |
| Warnings MSW après                 | **0**                                          |
| Test Tableau 10/10 runs            | ✅ 3/3 tests, 0 warning, 0 échec               |
| `pnpm check`                       | ✅ OK                                          |
| `pnpm tsc --noEmit`                | ✅ 0 erreur                                    |
| `pnpm vitest run` (suite complète) | ✅ 28/28 fichiers, 216 tests passés, 4 skipped |
| `pnpm build`                       | ✅ Build production réussi                     |

---

## Anomalie observée (hors scope DETTE-005)

`[useSequencesLocal] Erreur lecture séquences: ReferenceError: indexedDB is not defined`
apparaît dans les logs de `Tableau.test.tsx`. Ce n'est pas un warning MSW — c'est
`useSequencesLocal` qui tente d'ouvrir IndexedDB (non disponible en jsdom). Le hook gère
l'erreur gracieusement. **Non traité, hors scope.**

---

## Commit

`test(msw): aligner URL Supabase tests + handler WebSocket Realtime (DETTE-005)`
