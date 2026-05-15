# Audit DETTE-005 — Handlers MSW résiduels

**Date** : 2026-05-15
**Statut** : Audit terminé, en attente arbitrage Temo

---

## Méthode

Commande utilisée :

```bash
pnpm vitest run src/page-components/tableau/Tableau.test.tsx 2>&1 | grep -B2 -A10 "Warning: intercepted"
pnpm vitest run src/page-components/tableau/Tableau.test.tsx 2>&1 | grep "• " | sort | uniq -c
```

Aucune modification de `src/test/setup.ts` — les URLs sont directement visibles dans la sortie MSW v2.12.2.

---

## Requêtes non interceptées identifiées

**5 warnings MSW, 2 types distincts :**

| Occurrences | Méthode         | URL                                                                                           | Hook concerné     |
| ----------- | --------------- | --------------------------------------------------------------------------------------------- | ----------------- |
| 3×          | GET             | `https://tklcztqoqvnialaqfcjm.supabase.co/rest/v1/cards?select=*&type=eq.bank&order=name.asc` | `useBankCards`    |
| 2×          | GET (WebSocket) | `wss://tklcztqoqvnialaqfcjm.supabase.co/realtime/v1/websocket?apikey=...&vsn=1.0.0`           | Supabase Realtime |

---

## Analyse des causes racines

### Warning 1 — `GET /rest/v1/cards` (3 occurrences)

**Ce n'est PAS un handler manquant.**

Un handler `GET /rest/v1/cards` a été ajouté en DETTE-004 dans `src/test/mocks/handlers.ts`.
Le problème est un **mismatch d'URL** entre ce que le handler écoute et ce que le client envoie.

**Chaîne causale :**

1. `supabaseClient.ts` (ligne 25) lit `process.env.NEXT_PUBLIC_SUPABASE_URL`
2. `vitest.config.ts` ne définit **pas** `NEXT_PUBLIC_SUPABASE_URL` dans son champ `env`
3. `src/test/setup.ts` définit `import.meta.env.VITE_SUPABASE_URL = 'http://localhost:54321'`
   — mais `supabaseClient.ts` lit `process.env.NEXT_PUBLIC_SUPABASE_URL`, pas `import.meta.env.VITE_*`
4. `process.env.NEXT_PUBLIC_SUPABASE_URL` est `undefined` en tests
5. Le fallback hardcodé s'active : `'https://tklcztqoqvnialaqfcjm.supabase.co'`
6. Les handlers MSW écoutent sur `http://localhost:54321/rest/v1/cards` → **jamais matchés**

**Conséquence :** toutes les requêtes REST des tests d'intégration (`Tableau.test.tsx`) vont vers
la vraie URL de production, que MSW ne peut pas intercepter avec les handlers actuels.

### Warning 2 — WebSocket Realtime (2 occurrences)

**Ce n'est pas non plus un simple handler manquant.**

`src/test/setup.ts` (ligne 158-161) remplace `globalThis.WebSocket` par un `MockWebSocket` no-op.
Cela neutralise les connexions réelles du SDK Supabase, mais **MSW v2 possède son propre
intercepteur WebSocket** (indépendant de `globalThis.WebSocket`) qui continue d'émettre un
warning quand aucun `ws.link()` handler ne couvre l'URL.

Le client Supabase dérive l'URL WebSocket de l'URL de base :

- `url = 'https://tklcztqoqvnialaqfcjm.supabase.co'` → `wss://tklcztqoqvnialaqfcjm.supabase.co/realtime/v1/websocket`
- Si on corrige le Warning 1 (URL → localhost), le WebSocket devient `ws://localhost:54321/realtime/v1/websocket`

---

## Proposition de fix (2 fichiers, ~30 min)

### Fix 1 — `vitest.config.ts` : définir NEXT_PUBLIC_SUPABASE_URL

Ajouter un champ `env` dans la config test pour que le client Supabase utilise localhost en tests :

```typescript
// vitest.config.ts — dans defineConfig({ test: { ... } })
env: {
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
},
```

**Pourquoi c'est la bonne approche :**

- Fix la cause racine pour TOUTES les tables, pas seulement `cards`
- Les handlers DETTE-004 (timelines, slots, sessions, cards, etc.) étaient corrects mais inutilisés
- Après ce fix, tous les handlers existants sur `localhost:54321` deviennent opérationnels

**Impact sur les tests existants :**

- Tests unitaires (avec `vi.mock('@/utils/supabaseClient')`) → aucun impact (client mocké)
- Tests d'intégration (`Tableau.test.tsx`) → les requêtes vont sur localhost, matchées par MSW ✅
- Aucune régression attendue

### Fix 2 — `src/test/mocks/handlers.ts` : handler WebSocket MSW v2

Ajouter un handler `ws.link()` (MSW v2.12.2 exporte `ws`) pour silencer le warning Realtime.

Après le Fix 1, le WebSocket va sur `ws://localhost:54321/realtime/v1/websocket`.
Le handler couvre cette URL :

```typescript
import { http, HttpResponse, ws } from 'msw'

// En haut de handlers.ts
const supabaseRealtime = ws.link('ws://localhost:54321/realtime/v1/websocket')

// Dans le tableau handlers[], avant les handlers WebSocket existants :
supabaseRealtime.addEventListener('connection', () => {
  // Connexion Supabase Realtime silencée en tests
}),
```

**Alternativement**, un wildcard `ws://*/realtime/v1/*` couvrirait les deux URLs (localhost et
production) si on avait besoin de robustesse future. Mais URL fixe suffit pour DETTE-005.

---

## Évaluation effort

| Fichier                      | Modification                                           | Lignes    |
| ---------------------------- | ------------------------------------------------------ | --------- |
| `vitest.config.ts`           | Ajouter champ `env: { NEXT_PUBLIC_SUPABASE_URL: ... }` | ~3 lignes |
| `src/test/mocks/handlers.ts` | Import `ws`, constante `supabaseRealtime`, 1 handler   | ~8 lignes |

- Handlers manquants au sens strict : **0** (le handler cards existe déjà)
- Nouveaux éléments : 1 handler WebSocket (`ws.link`) + 1 correction config
- Complexité : **simple** (pas de logique de filtrage, juste accept/silencer)
- Effort estimé : **~30 min**

---

## Ce que ce fix ne couvre pas

- L'erreur `[useSequencesLocal] Erreur lecture séquences: ReferenceError: indexedDB is not defined`
  apparaît dans les logs mais n'est **pas un warning MSW** — c'est `useSequencesLocal` qui tente
  d'accéder à IndexedDB (non disponible en jsdom). Ce comportement est attendu et géré gracieusement
  par le hook (pas d'erreur visible côté UX). **Hors scope DETTE-005.**

---

## Vérification post-fix attendue

```bash
pnpm vitest run src/page-components/tableau/Tableau.test.tsx 2>&1 | grep -c "Warning: intercepted"
# Résultat attendu : 0
```
