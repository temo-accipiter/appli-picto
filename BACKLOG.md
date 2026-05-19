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

## 🟢 Priorité 3 — À grouper avec un audit plus large

### TICKET-004 — Créer un token `a11y('disabled-opacity')`

**Type** : Design system / Dette technique
**Effort estimé** : 1h (création + migration de 2 fichiers)
**Priorité** : Basse

**Contexte**
Deux composants utilisent des valeurs d'opacité hardcodées pour l'état désactivé : `Toggle.scss` (`opacity: 0.5`) et `TrainThemeSelector.scss` (`opacity: 0.5` et `0.55`). Cette dette a été documentée explicitement pendant la refonte V1 plutôt que de créer un token isolé.

**Tâches**

- [ ] Auditer l'ensemble du codebase à la recherche d'autres usages d'opacité hardcodée pour des états désactivés (`grep -r "opacity:" src/`).
- [ ] Définir le ou les tokens nécessaires : `a11y('disabled-opacity')` + éventuellement `a11y('placeholder-opacity')` ou autres.
- [ ] Ajouter les tokens dans `src/styles/abstracts/_primitives.scss` (ou fichier équivalent).
- [ ] Migrer tous les usages détectés en un seul commit cohérent.
- [ ] Vérifier les contrastes WCAG sur les états disabled après migration.

**Critères d'acceptation**

- Aucune valeur d'opacité hardcodée pour les états désactivés dans le codebase.
- `pnpm lint:hardcoded` ne signale plus ces valeurs.
- Visuellement, aucun changement d'apparence (les valeurs des tokens reproduisent les opacités actuelles).

---

### TICKET-005 — Migrer les hooks Supabase directs vers `withAbortSafe`

**Type** : Architecture / Dette technique
**Effort estimé** : 2-4h selon le nombre de hooks
**Priorité** : Basse

**Contexte**
Le hook `useProgressStations.ts` (créé en Phase 2.a de la refonte) utilise un appel `supabase.from()` direct sans `AbortController`, alignant son pattern sur `useStations` qui était déjà dans cet état. Cette dette préexistante n'a pas été élargie pendant la refonte V1 (scope strict).

D'autres hooks dans le projet utilisent probablement le même pattern direct.

**Tâches**

- [ ] Auditer tous les hooks consommant Supabase directement : `grep -r "supabase.from" src/hooks/`.
- [ ] Identifier le pattern cible (`withAbortSafe` ou `isAbortLike` selon ta convention projet).
- [ ] Migrer chaque hook en commits atomiques (un hook = un commit).
- [ ] Adapter les tests de chaque hook.

**Critères d'acceptation**

- Tous les hooks consommant Supabase utilisent le pattern d'abort sécurisé.
- Aucune fuite mémoire / requête zombie en cas de démontage rapide de composant.
- Tests passent au vert.

---

## ⚪ Priorité 4 — Hygiène de repo

### TICKET-006 — Nettoyer le stash git de la tentative abandonnée du 16 mai

**Type** : Hygiène repo
**Effort estimé** : 5 minutes
**Priorité** : Très basse

**Contexte**
Un stash `stash@{0}: On feature/re-design-edition: backup-feature-transport-au-cas-ou-20260516-1449` subsiste depuis une tentative abandonnée d'approche transport. Conservé volontairement comme filet de sécurité pendant la refonte V1.

**Décision à prendre**

- (A) Suppression : `git stash drop stash@{0}` si plus aucun élément n'est utile.
- (B) Conversion en branche d'archive : `git stash branch archive/transport-experiment-20260516 stash@{0}` puis push sur une branche d'archive distante.

**Tâches**

- [ ] Inspecter le contenu du stash une dernière fois : `git stash show -p stash@{0}`.
- [ ] Appliquer la décision (A) ou (B).
- [ ] Si (B), documenter l'existence de la branche d'archive dans une note ADR ou un fichier de dette.

---

## Notes transverses

- Tous ces tickets sont issus de la mission de refonte TrainProgressBar V1 (mai 2026).
- Aucun n'est bloquant pour la mise en production V1.
- Les tickets P1 (TICKET-001, TICKET-002) devraient être traités avant l'activation de la CI ou avant l'arrivée d'un nouveau dev sur le projet.
- Les tickets P3 (TICKET-004, TICKET-005) gagneraient à être groupés avec d'autres audits transverses du codebase pour amortir le coût de contexte.
