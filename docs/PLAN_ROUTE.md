# Plan de route — Suite du projet Appli-Picto

**Date** : <date du jour>
**Contexte** : Post-doctrine motion v1.0
**Statut** : Phase finalisation visuelle + préparation commercialisation

---

## État actuel du projet

### ✅ Terminé récemment

- DB schema complète (41 migrations, 130 smoke tests passing)
- UX migration majeure
- Cleanup codebase (dead code, duplicate types, legacy components)
- UI primitive harmonization
- T1 correction phase (shadow rename, CSS vars alignment)
- Button.scss refactoré v1.1
- Audit "3 systèmes" terminé (architecture saine, dette typée corrigée)
- Doctrine motion v1.0 documentée et appliquée (Toggle, Checkbox, Loader, Button)
- 4 tokens easing supprimés + 1 timing supprimé

### 🔄 En cours

- Redesign frontend v1.1 (composants à refactorer un par un)
- T1-C realignment de `$semantic-tokens` (361 appels `semantic()` à valider)

### ⏳ À venir

- Sprint migration motion (50+ call sites `smooth` / `ease-in-out` / `smooth-pop`)
- Suite du redesign visuel composant par composant
- Audits de préparation commercialisation
- Tickets de dette tooling

---

## Chantiers à traiter — Priorité décroissante

### P1 — Reprise du redesign visuel v1.1 (chantier principal)

**Statut** : Button.scss est le premier composant refactoré. Les composants suivants attendent leur passe sous règles v1.1.

**Action** : Continuer composant par composant selon ta discipline habituelle.

**Discipline à respecter** :

- Un composant par session (atomic commits)
- Audit read-only avant fix
- Show before writing
- Vérifications post-fix : `pnpm check`, `pnpm test`, `pnpm build`
- Visual review sur les contextes pertinents (Login, Profil, Édition, Tableau enfant)

**Ordre suggéré** (à adapter selon ton plan v1.1) :

1. Input / Textarea
2. Card (composant socle)
3. Modal (refactor visuel, motion déjà OK)
4. Dropdown / Select
5. Toast
6. Composants Édition (SlotsEditor, SlotItem visuel, CardPicker)
7. Composants Tableau enfant (SlotCard, TokensGrid)
8. Composants Séquences

**Référence** : `docs/refonte_front/direction-visuelle.md` v1.1

### P2 — Sprint migration motion (fermer la dette motion)

**Statut** : Doctrine v1.0 publiée. Dette documentée dans `motion-doctrine.md` section "Dette de migration en cours".

**Action** : Migrer ~58 call sites :

- `easing('smooth')` (~50) → `linear` (feedback) ou `ease-out` (apparition) selon contexte
- `easing('ease-in-out')` (~6) → `linear`
- `easing('smooth-pop')` (~2 dans TachesDnd) → arbitrer Cat. 3 décoratif justifié OU `linear`

**Méthode recommandée** :

- Audit phase 1 exhaustif (read-only, classification par catégorie 1/2/3)
- Pause arbitrage humain sur cas incertains
- Phase 2 exécution par lots cohérents (1 lot = 1 commit)
- Suppression finale des tokens dans `_tokens.scss` quand 0 usage

**Anti-pattern** : ne pas lancer en autonome — les cas incertains (notamment TachesDnd drag-and-drop) doivent être arbitrés.

### P3 — DETTE-002 — Test Tableau flaky

**Statut** : Ticket ouvert dans BACKLOG.md.

**Action** : Diagnostic via 4 hypothèses (timing, pollution, animation, charge), reproduction, fix.

**Pourquoi P3 et pas plus haut** : tant que le test ne casse pas systématiquement, ça reste gérable. Mais à traiter avant la commercialisation pour éviter les sueurs froides en QA.

### P4 — DETTE-001 — Hook pre-commit (déplacer `pnpm vitest run` vers pre-push)

**Statut** : Ticket ouvert dans BACKLOG.md.

**Action** : Refacto `.claude/scripts/pre-commit.sh` + création `.husky/pre-push`.

**Dépendance** : Vérifier d'abord que la CI Vercel exécute `pnpm test` sur push (filet de sécurité externe).

### P5 — Audits de préparation commercialisation

**À planifier** dans cet ordre selon importance/risque commercial :

#### P5.1 — Audit DB-first côté front

Vérifier qu'aucune règle métier critique n'est dupliquée côté front. Quotas, transitions d'état, validations qui devraient remonter `permission denied` de la DB et non préemptées par le front.

#### P5.2 — Audit sécurité Supabase client

`service_role` jamais importé, sessions correctement scopées, gestion `permission denied` propre, URLs Storage non bypassées.

#### P5.3 — Audit accessibilité Tableau enfant (WCAG 2.2 AA)

Contraste calculé, focus visible en contexte, touch targets, navigation clavier, aria attributes. **Contexte le plus sensible** pour ton public TSA.

#### P5.4 — Audit responsive mobile-first

Vérifier que tous les breakpoints sont `min-width`, jamais `max-width`. Discipline déjà documentée mais à valider sur l'ensemble du code.

### P6 — Phase 8.2 graceful degradation fix (open item du storage)

**Statut** : Ouvert depuis le travail storage. À traiter avant commercialisation.

### P7 — Post-launch — Subscription_logs audit debt

**Statut** : Différé post-commercialisation explicitement.

---

## Workflow conseillé pour Claude Code CLI

Pour chaque chantier ouvert :

1. **Phase audit (read-only)** : Claude Code lit le code, produit un constat factuel, n'écrit AUCUN fichier sauf un rapport markdown dans `docs/audits/`.
2. **Pause arbitrage humain** : Temo lit le rapport, valide ou nuance.
3. **Phase fix** : Claude Code applique les modifications, par lots atomiques.
4. **Vérifications** : `pnpm check`, `pnpm test`, `pnpm build`.
5. **Commits** : Claude Code propose les commits, Temo valide ou ajuste.
6. **Récap final** : un fichier `docs/audits/<chantier>_DONE.md` avec ce qui a été fait.

---

## Disciplines non négociables (rappel)

- **DB-first** : aucune logique métier critique côté front
- **Atomic commits** : un commit = un changement logique
- **Audit before modifying** : toujours read-only avant fix
- **Show before writing** : proposer le contenu avant d'écrire un fichier
- **Tokens Sass discipline** : aucune valeur en dur, semantic() / spacing() / radius() / timing() / easing() obligatoires
- **3 systèmes séparés** : planning / jetons / séquençage jamais fusionnés
- **TSA UX rules** : transitions ≤ 300ms feedback, `prefers-reduced-motion` couvert, doctrine motion respectée
- **Pre-commit hook** : à respecter (pas de `--no-verify` ni `HUSKY=0` sauf reword pur)
- **Local-only commits** : pas de push avant validation complète

---

## Anti-patterns à éviter (leçons des sessions passées)

1. **Faire confiance aux comptages d'usage sans preuve** : un grep peut sous-estimer massivement (ex: `smooth` annoncé à 0, en réalité ~50)
2. **Accepter "test flaky" comme excuse** sans diagnostic (peut masquer un vrai bug)
3. **`git add .` ou `git add -A`** pendant une session multi-commits — toujours `git add` fichier par fichier
4. **Bypass hook (`--no-verify`, `HUSKY=0`)** sur des commits qui modifient du code
5. **Refactor "bonus" en passant** — un commit logique = un changement logique
6. **Lancer plusieurs prompts simultanés** dans la même session — discipline séquentielle
7. **Classer "à la louche" pour aller vite** — quand un cas est ambigu, l'arbitrage humain est obligatoire
