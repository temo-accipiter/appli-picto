# Backlog Appli-Picto

> Tickets tracés mais non traités, par ordre de priorité.
> Mis à jour le 13 mai 2026 après la session migration palette brand.

---

## 🔴 Haute priorité (pré-commercialisation, bugs fonctionnels)

### T-pwa-sw — Réactiver Service Worker pour support offline

**Type** : Fonctionnalité critique (offline)
**Estimation** : 1-2h
**Bloquant commercialisation** : Oui (contrat FRONTEND_CONTRACT §4.4)

**Contexte** :

- `@ducanh2912/next-pwa` retiré de `next.config.js` car incompatible avec Turbopack
- Mais le contrat front prévoit fonctionnement offline (queue validations, timeline existante)
- Sans Service Worker : page blanche en cas de coupure réseau côté Tableau enfant
- Critique pour invariant TSA de prévisibilité

**Solution Étape 1 (court terme, ~1h)** :

- Restaurer `withPWA` dans `next.config.js`
- Modifier `package.json` : `"build": "next build --webpack"` (dev reste Turbopack)
- Configuration conservative : `cacheOnFrontEndNav: false`, `aggressiveFrontEndNavCaching: false`
- Vérifier que manifest.ts reste source de vérité (pas regénéré par next-pwa)
- Ajouter `public/sw.js` et `public/workbox-*.js` au gitignore

**Solution Étape 2 (moyen terme, plus tard)** :

- Migrer vers Serwist (successeur officiel de next-pwa, compatible Turbopack en dev)
- Nécessite spec préalable des stratégies de cache par route
- `@serwist/next` + `@serwist/precaching` + `@serwist/sw`

**Checklist Étape 1** :

- [x] Audit Phase 1 : état actuel next.config.js + package.json + manifest.ts
- [x] Vérification non-régression manifest.ts (source de vérité unique)
- [x] Configuration conservative
- [x] Build vert avec --webpack
- [ ] Test offline réel : charger l'app, mode avion, recharger → shell cached
- [ ] Test installation PWA Android (icône brand visible)
- [ ] Commit conventional

**Résolu le 14 mai 2026** — `withPWA` restauré dans `next.config.js` avec `disable: process.env.NODE_ENV === 'development'` (dev Turbopack non affecté). Build webpack via `next build --webpack`. `sw.js` + `workbox-*.js` générés dans `public/`. `manifest.ts` reste source de vérité (pas de `public/manifest.json` généré).

---

## 🟠 Moyenne priorité (qualité, à faire avant launch)

### T-tokens-motion — `timing()` et `easing()` non résolus par Turbopack

**Type** : Bug systémique design system / compilateur SCSS
**Estimation** : 2-3h (audit + migration)
**Bloquant commercialisation** : Non (contournements en place), mais affecte toutes les transitions

**Contexte** :

Découvert lors du débogage du loader (mai 2026). Le compilateur SCSS de Turbopack (dev) et Next.js (build) ne résout **pas** les fonctions `timing()` et `easing()` lorsqu'elles sont utilisées dans des propriétés CSS shorthand (`animation:`, `transition:`).

Le CSS compilé contient littéralement `timing("base")` et `easing("ease-out")` au lieu des valeurs résolues `0.3s` et `ease-out`. Le navigateur reçoit des valeurs invalides et utilise les défauts CSS :

- `transition-duration: 0s` → transitions instantanées (visuellement OK, mais pas les durées prévues)
- `animation-duration: 0s` → animations jouées en 0 seconde → dots figés (bug visible)

Les fonctions fonctionnent correctement dans les propriétés sub-longhand (`transition-duration: timing('base')`) mais pas dans les shorthands.

**Preuve** : inspecter `.next/static/chunks/*.css` → `transition:color timing("fast")easing("ease-out")` partout.

**Contournement actuel** : `Loader.scss` utilise `0.3s` hardcodé pour l'animation des dots.

**Solution proposée** :

- Option A (rapide) : remplacer `timing()` et `easing()` par leurs valeurs résolues dans tous les shorthands animation/transition (grep + sed ciblé)
- Option B (propre) : utiliser les propriétés sub-longhand séparées plutôt que les shorthands : `transition-property`, `transition-duration`, `transition-timing-function` — les fonctions SCSS s'y résolvent correctement
- Option C (investigation) : comprendre pourquoi Turbopack ne résout pas ces fonctions (bug Turbopack ? problème `@use`/`@forward` dans l'abstracts index ?) et corriger à la source

**Checklist** :

- [x] Audit Phase 1 : grep exhaustif de tous les `timing()` et `easing()` dans les shorthands SCSS
- [x] Compter l'impact : combien de fichiers, combien de propriétés affectées
- [x] Choisir Option A, B ou C selon ampleur
- [x] Migration + build vert
- [x] Vérifier visuellement que les durées de transition sont correctes après fix

**Résolu le 14 mai 2026** — Cause racine : `_motion.scss` n'était pas forwardé dans `_index.scss`, SCSS traitait `timing()` / `easing()` comme des fonctions CSS inconnues. Fix : `@forward './motion' show timing, easing, motion-preset` + migration 34 shorthands → sub-longhands + correction 3 clés easing invalides (`'bounce'`, `'in-out'`, `'spring'`).

---

### T-logo-usage — Audit + standardisation usage du logo

**Type** : UX + dette technique
**Estimation** : 1h30 (audit 20 min + décisions 15 min + impl 45 min)
**Bloquant commercialisation** : Non, mais important pour cohérence brand

**Résolu le 14 mai 2026** — SVG custom inline remplacé par les assets officiels `/public/brand/` via composant partagé `NavbarLogoIcon`. Auto-swap CSS sans JS : mobile+light → `logo-app-icon.svg`, desktop+light → `logo-principal.svg`, dark (tous écrans) → `logo-dark.svg`. Double mécanisme dark mode : `@media (prefers-color-scheme: dark)` + `[data-theme='dark']` (anti-flash TSA). `BrandLogo.tsx` orphelin supprimé. Redirection `/edition` pour Navbar et NavbarVisiteur. Tableau enfant exclu (aucune Navbar). Build webpack vert, pnpm check vert.

---

### T-naming — Lever la collision sémantique "primary"

**Type** : Dette technique sémantique
**Estimation** : 1h
**Bloquant commercialisation** : Non

**Checklist** :

- [x] Audit Phase 1 : tous les appels à `semantic('primary')` dans le code (aucun)
- [x] Identifier ceux qui veulent vraiment le violet admin vs le bleu UI
- [x] Renommer dans `_semantics.scss`
- [x] Propager les appels (aucune propagation nécessaire — `semantic()` n'expose pas `$color-semantic-brand`)
- [x] Build + lint verts

**Résolu le 14 mai 2026** — Clés `$color-semantic-brand` renommées : `'primary'` → `'admin'`, `'primary-hover'` → `'admin-hover'`, `'primary-active'` → `'admin-active'`, `'primary-light'` → `'admin-light'`. Commentaire du bloc mis à jour pour documenter la distinction `admin` (violet #667eea) vs `color('base')` (bleu brand #2871A8).

---

### T-dark — Audit + migration palette mode dark

**Type** : Cohérence brand mode dark
**Estimation** : 1h
**Bloquant commercialisation** : Non si mode dark non offert au launch

**Checklist** :

- [x] Audit Phase 1 : `blue(400)` = `#60a5fa`, contraste ~6.6:1 sur `slate(900)` = `#0f172a` ✅ WCAG AA mais non brand-aligné
- [x] Refactor : `brand-blue(100)` = `#a9cde9`, contraste ~10:1 ✅ WCAG AAA, brand-aligné
- [x] Build + lint verts

**Résolu le 14 mai 2026** — `--color-primary` dark mode migré de `blue(400)` (`#60a5fa`, Tailwind) vers `brand-blue(100)` (`#a9cde9`, palette brand). Contraste amélioré : ~6.6:1 → ~10:1 WCAG AAA sur fond `slate(900)`. `brand-blue(600)` = `#2871A8` rejeté (contraste ~3.4:1, trop sombre pour dark mode).

---

## 🟡 Basse priorité (post-launch acceptable)

### T-clutter — Mise à jour 6 commentaires obsolètes

**Type** : Hygiène code
**Estimation** : 15 min
**Bloquant commercialisation** : Non

**Résolu le 14 mai 2026** — 6 commentaires SCSS mis à jour : `#0077c2` → `#2871A8` dans `_forms.scss` (×2) et `CookieBanner.scss` (ratio corrigé 4.75:1 → 5.20:1) ; `#5A9FB8` → `#2871A8` dans `not-found.scss` (×2) et `global-error.scss` (×1). Commentaire `_semantics.scss:144` supprimé lors du renommage T-naming.

---

### T-navbar-dedup — Extraction composant Logo partagé

**Type** : Dette technique (déduplication)
**Estimation** : 30 min
**Note** : Traité conjointement avec T-logo-usage.

**Résolu le 14 mai 2026** — Composant `NavbarLogoIcon` créé dans `src/components/layout/navbar-logo/`. SVG inline supprimé de `Navbar.tsx` et `NavbarVisiteur.tsx`, remplacé par `<NavbarLogoIcon />`. Classes SCSS orphelines `.navbar-logo__icon`, `.navbar-logo__text`, `.navbar-visiteur__logo-icon`, `.navbar-visiteur__logo-text` supprimées.

---

### T-pwa-screenshots — Enrichir manifest avec screenshots

**Type** : Amélioration UX installation PWA
**Estimation** : 15 min
**Bloquant commercialisation** : Non

**Contexte** :
Warnings DevTools Application → Manifest :

```
Richer PWA Install UI won't be available on desktop. Please add at least one
screenshot with the form_factor set to wide.
Richer PWA Install UI won't be available on mobile. Please add at least one
screenshot for which form_factor is not set or set to a value other than wide.
```

**Solution** : ajouter le champ `screenshots` dans `src/app/manifest.ts` :

```typescript
screenshots: [
  {
    src: '/screenshots/desktop.png',
    sizes: '1280x720',
    type: 'image/png',
    form_factor: 'wide',
    label: 'Tableau de motivation visuel',
  },
  {
    src: '/screenshots/mobile.png',
    sizes: '375x667',
    type: 'image/png',
    label: 'Vue mobile',
  },
]
```

**⚠️ À faire APRÈS le redesign complet** — sinon les screenshots seront à refaire.

---

### T-manifest-id — Ajouter `id` au manifest

**Type** : Cosmétique (App ID stable)
**Estimation** : 5 min
**Bloquant commercialisation** : Non

**Contexte** :
Note vue dans DevTools : "id is not specified in the manifest, start_url is used instead".

**Solution** : ajouter `id: '/'` dans `src/app/manifest.ts` pour garantir un App ID stable même si `start_url` change.

---

# DETTE-001 — Réviser le hook pre-commit : déplacer `pnpm vitest run` vers pre-push

**Type** : Dette tooling
**Priorité** : Moyenne (post-commercialisation acceptable, mais bénéfice immédiat sur la productivité)
**Effort estimé** : 1-2h (audit + modification + tests)
**Statut** : À traiter

---

## Contexte

Le hook pre-commit du projet (`.claude/scripts/pre-commit.sh`, appelé via `.husky/pre-commit`) exécute **7 vérifications bloquantes** à chaque commit :

1. `pnpm check` (lint + format)
2. `pnpm type-check`
3. `pnpm vitest run` ← **cible de ce ticket**
4. `pnpm lint:hardcoded`
5. `pnpm validate:touch-targets` (non bloquant)
6. `check-mobile-first.sh`
7. `check-supabase-hooks.sh`

L'étape 3 (`pnpm vitest run`) lance la suite de tests Vitest complète sur chaque commit.

## Problème

### Symptôme observé

Lors de la session "doctrine motion v1.0" (mai 2026), plusieurs commits ont été bloqués par le hook pre-commit qui a échoué sur un test Tableau (`Tableau.test.tsx`). Le test échouait de manière intermittente, indépendamment des modifications motion.

Conséquences :

- Claude Code CLI a proposé `git commit --no-verify` comme contournement (refusé)
- L'atomicité des commits a été cassée pendant la session (3 commits "denses" au lieu de 8 commits atomiques)
- Un rebase reword ultérieur a nécessité `HUSKY=0` car le hook se redéclenchait sur chaque amend, même sans modification de contenu

### Analyse de fond

Exécuter la suite de tests complète sur chaque commit présente plusieurs problèmes :

1. **Friction sur le développement** : la suite prend plusieurs dizaines de secondes, ralentissant le rythme des commits atomiques (qui est un principe explicite du projet).
2. **Sensibilité aux tests flaky** : un test instable bloque tout commit, y compris ceux qui ne touchent pas au code testé (docs, SCSS, refactor sans impact fonctionnel).
3. **Incitation au bypass** : face à un test flaky bloquant et une urgence, la tentation `--no-verify` devient forte. Le hook produit alors l'effet inverse de sa mission (protéger la qualité).
4. **Redondance** : si la CI exécute déjà les tests sur push/PR, les exécuter aussi en pre-commit local fait doublon.

### Principe violé

Le projet documente : _"false safety signals exist"_. Un hook qui bloque sur des tests flaky est un faux signal de sécurité — il oblige soit à attendre passivement, soit à bypasser. Aucun des deux comportements ne renforce la qualité réelle du code.

## Solutions envisagées

### Option A — Déplacer `pnpm vitest run` du pre-commit vers le pre-push

**Description** : retirer l'étape 3 du `pre-commit.sh`, créer un `.husky/pre-push` qui exécute `pnpm vitest run`.

**Avantages** :

- Convention industrielle répandue (Husky, lefthook, pre-commit framework)
- Friction réduite sur les commits locaux
- Sécurité préservée : impossible de pousser du code dont les tests cassent
- Cohérent avec la discipline "local-only commits, no push until validated"

**Inconvénients** :

- Un commit local peut contenir du code dont les tests cassent (acceptable car non poussé)
- Risque d'accumuler des commits cassés en local avant de découvrir au push (mitigé par les exécutions manuelles de `pnpm test` pendant le développement)

### Option B — Rendre `pnpm vitest run` conditionnel selon les fichiers modifiés

**Description** : ne lancer les tests que si des fichiers `.ts`, `.tsx`, ou les fichiers de tests ont changé. Skip si seuls des `.md`, `.scss`, ou fichiers de config sont touchés.

**Avantages** :

- Garde les tests en pre-commit pour les modifications de code
- Évite la friction inutile sur les commits docs/SCSS

**Inconvénients** :

- Logique conditionnelle dans le script (plus complexe à maintenir)
- Couverture imparfaite : un changement SCSS peut casser un test visuel (rare mais possible)
- Ne résout pas le problème des tests flaky sur les commits de code

### Option C — Garder tel quel + traiter les tests flaky

**Description** : conserver `pnpm vitest run` en pre-commit, mais auditer et stabiliser les tests flaky (à commencer par `Tableau.test.tsx`).

**Avantages** :

- Sécurité maximale préservée
- Force à traiter la vraie dette (tests instables)

**Inconvénients** :

- Effort plus important (debugging de tests)
- Ne résout pas la friction inhérente à une suite complète sur chaque commit
- Les nouveaux tests flaky reviendront tôt ou tard

## Recommandation

**Option A privilégiée**, éventuellement combinée à un effort ponctuel sur les tests flaky identifiés.

Raisons :

1. C'est la convention la plus utilisée dans l'écosystème pnpm/Husky
2. La discipline projet "local-only commits, no push until validated" est cohérente avec un check au push, pas au commit
3. Sur ce projet, la phase QA pré-commercialisation et la CI Vercel jouent déjà le rôle de filet final
4. Réduit la tentation de bypass dans 95% des cas

Option B est trop subtile pour le bénéfice. Option C ne traite que le symptôme actuel sans résoudre le problème structurel.

## Plan d'action proposé

### Phase 1 — Audit préalable (read-only)

1. Vérifier que la CI Vercel (ou autre) exécute bien `pnpm vitest run` sur push/PR — si non, ajouter avant tout autre changement
2. Identifier les tests flaky historiques via les logs (`Tableau.test.tsx` confirmé, d'autres ?)
3. Mesurer le temps moyen d'exécution actuel de `pnpm vitest run` en local

### Phase 2 — Modification du hook

1. Retirer l'étape 3 (`pnpm vitest run`) de `.claude/scripts/pre-commit.sh`
2. Mettre à jour le compteur (7/7 → 6/6) et les messages
3. Créer `.husky/pre-push` qui exécute :
   - `pnpm vitest run`
   - Toute autre vérification jugée bloquante au push uniquement
4. Documenter le changement dans le commit message et dans `MEMORY.md` ou `CLAUDE.md`

### Phase 3 — Documentation

1. Mettre à jour `MEMORY.md` : règle "pre-commit léger, pre-push test complet"
2. Ajouter dans `CLAUDE.md` une note : `pnpm test` est exécuté en pre-push, pas en pre-commit. Pour valider localement pendant le développement, lancer manuellement `pnpm test --watch` ou `pnpm vitest run` ponctuellement
3. Tester la nouvelle configuration avec un cycle commit + push complet

### Phase 4 — Suivi tests flaky (séparé)

Ouvrir un ticket dédié pour `Tableau.test.tsx` : identifier la cause de l'instabilité, stabiliser ou marquer `.skip` avec TODO documenté.

## Critères de succès

- [ ] Pre-commit ne lance plus `pnpm vitest run`
- [ ] Pre-push lance `pnpm vitest run` (et bloque si échec)
- [ ] Documentation mise à jour (`MEMORY.md`, `CLAUDE.md`)
- [ ] CI confirme l'exécution des tests sur push (filet de sécurité externe)
- [ ] Un commit docs/SCSS pur prend moins de 10 secondes au pre-commit (mesure avant/après)
- [ ] Un push avec test cassé est bien bloqué (test manuel du nouveau pre-push)

## Risques

| Risque                                                          | Probabilité | Mitigation                                                                                           |
| --------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| Commits locaux avec code cassé non détectés avant push          | Moyenne     | Acceptable car non poussé. Habitude de lancer `pnpm test` manuellement pendant les sessions de code. |
| Régression masquée jusqu'au push                                | Faible      | CI Vercel + sanity check manuel en fin de session                                                    |
| Mauvaise configuration du pre-push qui ne bloque pas réellement | Faible      | Test manuel obligatoire (point dans critères de succès)                                              |

## Hors périmètre

- Audit complet de la suite de tests
- Refactor de tests existants
- Ajout de nouveaux tests
- Configuration CI/CD (sauf vérification minimale qu'elle existe)

## Références

- Session bloquante : doctrine motion v1.0, mai 2026 (commits `656dce4`, `27046e7`, `77a63f1`)
- Fichier concerné principal : `.claude/scripts/pre-commit.sh`
- Discipline projet impactée : "atomic commits, one per logical sub-phase" (MEMORY.md)
- Principe transversal : "false safety signals exist"

---

# DETTE-002 — Test flaky `Tableau.test.tsx` : diagnostiquer et stabiliser

**Type** : Dette tooling / qualité tests
**Priorité** : Moyenne-Haute (bloque potentiellement chaque commit, incite au bypass)
**Effort estimé** : 1-3h (selon cause racine)
**Statut** : À traiter
**Lien** : Apparenté à DETTE-001 (refacto pre-commit hook)

---

## Contexte

Le test `src/page-components/tableau/Tableau.test.tsx` est **instable** (flaky) : il échoue parfois, passe parfois, sans modification de code intermédiaire.

Comportement constaté lors de la session "doctrine motion v1.0" (mai 2026) :

- Pendant la session : échec sur l'assertion ligne 68 (`expect(tableau).toBeTruthy()`), l'élément `.tableau-magique` n'était pas trouvé dans le DOM
- Quelques heures plus tard, même branche, même code : les 3 tests Tableau passent en 448ms
- Aucune modification de code entre les deux exécutions

```
✓ Tableau - Test intégration > Mode authentifié > ✅ affiche les tâches de l'utilisateur 113ms
✓ Tableau - Test intégration > Mode authentifié > ✅ affiche le conteneur principal du tableau 281ms
✓ Tableau - Test intégration > Mode démo (visiteur) > ✅ affiche le tableau en mode démo 21ms
```

## Problème

Un test flaky pose trois problèmes cumulatifs sur ce projet :

### 1. Blocage aléatoire des commits

Le hook pre-commit exécute `pnpm vitest run`. Quand le test échoue de manière aléatoire, **tout commit local est bloqué**, indépendamment de la qualité du code commit é. Lors de la session motion, ça a cassé l'atomicité des commits (3 commits "denses" au lieu de 8 prévus).

### 2. Incitation au bypass

Face à un test qui échoue "sans raison apparente", la pression pousse vers `--no-verify` ou `HUSKY=0`. Claude Code CLI a proposé `--no-verify` deux fois pendant la session motion. Refusé à chaque fois, mais le piège existe.

### 3. Faux signal masquant les vrais bugs

Si un test est connu pour être flaky, la première réaction à un échec sera "encore le flaky" plutôt que "vrai bug détecté". Risque : laisser passer une régression réelle.

### 4. Erosion de la confiance dans la suite de tests

Un seul test flaky discrédite l'ensemble de la suite. À terme, la suite n'est plus prise au sérieux.

## Hypothèses sur la cause racine

À investiguer en phase 1. Pistes par ordre de probabilité :

### Hypothèse A — Race condition / timing

Le test attend que `.tableau-magique` apparaisse dans le DOM. Si l'apparition dépend d'un état asynchrone (chargement initial, hydration React, fetch Supabase mock), le timing peut varier selon la charge machine.

Signaux à chercher :

- `await waitFor(...)` avec timeout court ou absent
- `findBy*` vs `getBy*` (getBy\* synchrone, peut échouer si élément pas encore monté)
- Dépendance à un `useEffect` non attendu

### Hypothèse B — Pollution entre tests

L'ordre d'exécution affecte le résultat. Un test précédent laisse un side-effect (mock non reset, DOM non nettoyé, store global modifié).

Signaux à chercher :

- Mocks non reset (`vi.clearAllMocks` absent)
- DOM testing-library : `cleanup` automatique mais parfois insuffisant si stores externes
- État Zustand/Context partagé entre tests

### Hypothèse C — Dépendance à l'animation (loader)

L'erreur originale mentionnait `loader-bounce visible` au moment du fail — le composant Tableau était encore en état de chargement. Si le test ne wait pas correctement la fin du loading state, et si le loader a une durée d'animation, le résultat dépend du timing CSS/JS.

Signaux à chercher :

- `prefers-reduced-motion` non forcé dans le setup de test
- Animation CSS avec durée > 0 attendue par le test sans `waitFor`
- Loader qui dépend d'un timer (`setTimeout`)

### Hypothèse D — Charge machine

Le test prend 281ms quand il passe. Sur une machine sous charge (CI partagée, IDE actif, Docker), ce délai peut suffire à faire timeout un `waitFor` mal configuré.

## Plan d'action proposé

### Phase 1 — Audit ciblé (read-only, 30 min)

1. Lire `src/page-components/tableau/Tableau.test.tsx` intégralement
2. Identifier le pattern d'attente du DOM (waitFor / findBy / getBy)
3. Identifier les mocks utilisés et leur cycle de vie
4. Lire le setup global Vitest (`vitest.config.ts`, `setupTests.ts` ou équivalent)
5. Vérifier si `prefers-reduced-motion` est forcé dans le setup
6. Reproduire l'instabilité : lancer le test 10-20 fois d'affilée, mesurer le taux d'échec

```bash
# Reproduction
for i in {1..20}; do pnpm vitest run src/page-components/tableau/Tableau.test.tsx --reporter=basic 2>&1 | tail -2; done
```

### Phase 2 — Diagnostic ciblé

Selon l'hypothèse confirmée :

- **A (timing)** : remplacer `getBy*` par `findBy*`, ajouter `await waitFor(..., { timeout: 3000 })` explicite
- **B (pollution)** : ajouter `beforeEach(() => vi.clearAllMocks())`, vérifier cleanup
- **C (animation)** : forcer `prefers-reduced-motion: reduce` dans le setup global de test, ou stub les animations CSS
- **D (charge)** : augmenter le timeout global Vitest, ou marquer le test `slow`

### Phase 3 — Validation

- Relancer le test 50 fois d'affilée
- Critère de succès : 50/50 passages
- Si encore instable, retour phase 2 avec hypothèse suivante

### Phase 4 — Documentation

- Ajouter un commentaire au-dessus du test expliquant la cause racine et le fix appliqué
- Mettre à jour `MEMORY.md` si un pattern récurrent est identifié (ex: "toujours forcer prefers-reduced-motion dans les tests d'intégration")

## Solution d'attente (si pas le temps maintenant)

Si tu ne peux pas traiter ce ticket dans les prochaines heures et que tu rencontres à nouveau le blocage :

**Ne PAS** utiliser `--no-verify` ou `HUSKY=0` sur des commits qui modifient du code.

**Plutôt** :

- Relancer le test seul : `pnpm vitest run src/page-components/tableau/Tableau.test.tsx`
- S'il passe, lancer immédiatement le commit (fenêtre verte)
- S'il échoue 3 fois d'affilée, c'est peut-être une vraie régression — investiguer

## Critères de succès

- [ ] Cause racine identifiée et documentée
- [ ] Fix appliqué
- [ ] Test passe 50/50 en exécution répétée
- [ ] Setup de test mis à jour si un pattern transverse est identifié
- [ ] Commentaire explicatif dans le fichier de test
- [ ] Ticket fermé

## Hors périmètre

- Audit complet de la suite de tests (DETTE-001 si pertinent)
- Refacto du composant Tableau lui-même
- Ajout de nouveaux tests Tableau

## Références

- Session de découverte : doctrine motion v1.0, mai 2026
- Hook pre-commit concerné : `.claude/scripts/pre-commit.sh` étape 3
- Ticket apparenté : DETTE-001 (déplacer `pnpm vitest run` vers pre-push)
- Fichier : `src/page-components/tableau/Tableau.test.tsx`

---
