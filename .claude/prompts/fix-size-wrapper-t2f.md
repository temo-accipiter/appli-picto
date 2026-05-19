# Fix T2-F — Wrapper `size()` lit `$size-semantic` + relocation tokens logo

## Posture obligatoire

Audit-first respecté, deux phases STRICTEMENT séquentielles :

- Phase 1 : READ-ONLY. Rapport.
- Phase 2 : Implémentation après "GO Phase 2" exact de Temo.

Aucun commit, push, stash.

---

## Contexte

T1-C et REPLACE_LOGO Phase 2 viennent d'être clôturés.

Pendant REPLACE_LOGO Phase 2, une découverte technique a été faite :
le wrapper `size()` dans `src/styles/abstracts/_size.scss` ne lit PAS la
map `$size-semantic` (présente dans `_semantics.scss`). Il lit uniquement
`$size-tokens` (legacy).

C'est exactement la même classe de bug que T2-E (documentée dans
`CSS_ARCHITECTURE.md §11`) qui touche `font-size()`, `timing()`, `easing()`.

Conséquence directe : les 2 nouveaux tokens `'logo-auth-sm'` et
`'logo-auth-lg'` ont été placés dans `$size-tokens` faute de mieux —
emplacement sémantiquement incorrect selon la couche 2 v1.1.

Objectif T2-F :

1. Brancher `$size-semantic` dans le wrapper `size()` (priorité Semantics
   → Tokens → Primitives, conformément à `CSS_ARCHITECTURE.md §2`).
2. Déplacer les 2 tokens logo vers `$size-semantic`.
3. Vérifier qu'aucune régression n'apparaît sur les autres usages de
   `size()` dans le projet.

---

## Phase 1 — Audit lecture seule

### 1.1 Cartographie actuelle du wrapper `size()`

- Lire `src/styles/abstracts/_size.scss` intégralement.
- Documenter :
  - Chaîne actuelle de résolution (map(s) lue(s), ordre, fallback, @error)
  - Pourquoi `$size-semantic` n'est pas lu (oubli historique ? volontaire ?
    présence d'un commentaire TODO ?)
  - Liste exhaustive des dépendances `@use` du fichier

### 1.2 Inventaire `$size-semantic`

- Lire `src/styles/abstracts/_semantics.scss`, section `$size-semantic`.
- Lister TOUTES les clés actuellement présentes (qui sont donc orphelines
  du wrapper) :
  - clé / valeur primitive / valeur résolue
- Confirmer qu'aucune n'est utilisée en production via `size('clé')`
  actuellement (si elle l'était, ce serait une @error build).

### 1.3 Vérification d'effet de bord — collision de clés

CRITIQUE. Avant de brancher `$size-semantic`, vérifier qu'AUCUNE clé de
`$size-semantic` n'entre en collision avec une clé de `$size-tokens`.

Si collision détectée :

- Lister chaque collision : clé / valeur dans `$size-semantic` / valeur
  dans `$size-tokens` / verdict (identique = OK, divergent = ALERTE).
- Si valeurs divergent : signaler à Temo comme bloqueur, ne pas continuer.
  L'introduction de la priorité Semantics pourrait changer la valeur
  retournée par `size('clé')` sur des consommateurs existants.

### 1.4 Inventaire complet des consommateurs `size()`

- Recherche exhaustive `size\('([^']+)'\)` dans `src/**/*.scss` (hors
  abstracts).
- Pour chaque clé utilisée, classer :
  - Clés numériques (`size('4')`, `size('120')`, etc.) → lues dans
    `$size-tokens` actuellement, inchangées après fix.
  - Clés sémantiques (`size('touch-target-min')`, `size('logo-auth-sm')`,
    etc.) → vérifier dans quelle map elles vivent actuellement.
- Lister les clés qui DEVRAIENT logiquement migrer de `$size-tokens` vers
  `$size-semantic` après le fix (en plus des 2 tokens logo). Ne pas les
  migrer dans cette session — juste les inventorier.

### 1.5 Localisation actuelle des 2 tokens logo

Confirmer leur emplacement actuel exact :

- Fichier (probablement `_tokens.scss`)
- Lignes précises
- Format exact (clé, valeur, commentaire)

### 1.6 Plan détaillé Phase 2

Lister les opérations dans l'ordre, fichier par fichier, ligne par ligne :

1. Modification du wrapper `size()` dans `_size.scss`
2. Ajout des 2 tokens dans `$size-semantic` (`_semantics.scss`)
3. Suppression des 2 tokens dans `$size-tokens` (où qu'ils soient)
4. Vérification : `size('logo-auth-sm')` retourne toujours `7.5rem`,
   `size('logo-auth-lg')` retourne toujours `10rem`
5. Mise à jour `CSS_ARCHITECTURE.md` si nécessaire : section §11 T2-F
   à fermer, ou §3.5 à clarifier.

### Format de sortie Phase 1

Un seul fichier : `audits/FIX_SIZE_WRAPPER_T2F_PHASE1_<YYYY-MM-DD>.md`

Structure :

1. Résumé exécutif + verdict GO/NO-GO Phase 2.
2. Section 1.1 — Cartographie wrapper `size()`.
3. Section 1.2 — Inventaire `$size-semantic`.
4. Section 1.3 — Collisions de clés (CRITIQUE).
5. Section 1.4 — Inventaire consommateurs.
6. Section 1.5 — Localisation actuelle tokens logo.
7. Section 1.6 — Plan détaillé Phase 2.
8. Checklist "Prêt pour GO Phase 2".

### Critères d'arrêt Phase 1

Attendre "GO Phase 2" exact. Si collision détectée en 1.3 : STOP, attendre
décision Temo.

---

## Phase 2 — Implémentation (sur "GO Phase 2" uniquement)

### 2.1 Pré-flight

- Re-lire rapport Phase 1.
- `git status` clean. Sinon STOP.

### 2.2 Modifier le wrapper `size()`

Dans `src/styles/abstracts/_size.scss` :

- Ajouter `@use 'semantics' as sem;` si pas déjà importé.
- Modifier la chaîne de résolution pour respecter l'ordre v1.1 :
  Semantics → Tokens → Primitives → @error.
- S'inspirer du pattern existant dans `_spacing.scss` ou `_radius.scss`
  (qui implémentent déjà ce fallback correctement).
- Conserver la signature publique `size($key)` inchangée (zéro breaking
  change pour les consommateurs).

### 2.3 Déplacer les 2 tokens logo

1. Dans `$size-semantic` (`_semantics.scss`), ajouter après les clés
   existantes :

```scss
'logo-auth-sm':7.5rem, // 120px — Largeur du logo Appli-Picto sur les pages auth (mobile)
   'logo-auth-lg': 10rem;
// 160px — Largeur du logo Appli-Picto sur les pages auth (desktop)
```

2. Dans `$size-tokens` (ou son emplacement actuel), supprimer ces 2 clés.

### 2.4 Validations

Après chaque sous-étape :

- `pnpm check`
- `pnpm test`
- `pnpm build`
- `pnpm type-check`
- `pnpm lint:hardcoded`

Vérification spécifique :

- Compiler un fichier SCSS test ou utiliser `pnpm build:css` pour confirmer
  que `size('logo-auth-sm')` retourne `7.5rem` ET `size('logo-auth-lg')`
  retourne `10rem`.
- Confirmer qu'AucUN appel `size()` existant ne plante (les clés numériques
  legacy doivent toujours fonctionner via fallback).

### 2.5 Mise à jour documentation

Proposer (NE PAS éditer) une mise à jour de `CSS_ARCHITECTURE.md` :

- §11 : retirer T2-F de la liste des défauts connus, OU le marquer
  ✅ RÉSOLU.
- §3.5 / §3.7 (selon la doc actuelle de `size()`) : préciser la chaîne
  de résolution Semantics → Tokens → Primitives.

Lister les changements précis pour validation Temo, ne pas éditer la doc.

### 2.6 Format de sortie Phase 2

Fichier : `audits/FIX_SIZE_WRAPPER_T2F_PHASE2_<YYYY-MM-DD>.md`

Structure :

1. Résumé.
2. Diff complet du wrapper `size()` (avant/après).
3. Diff `$size-semantic` (ajout) et `$size-tokens` (suppression).
4. Résultats des 5 validations.
5. Fichiers modifiés (path + lignes diff).
6. Proposition mise à jour `CSS_ARCHITECTURE.md`.
7. Suggestions commits atomiques avec messages conventionnels :
   - "refactor(scss): branch \$size-semantic into size() wrapper (fix T2-F)"
   - "refactor(scss): relocate logo-auth-{sm,lg} tokens to \$size-semantic"
8. Checklist post-implémentation pour Temo.

---

## Contraintes globales

- Aucun commit, push, stash.
- Aucune modification de composant. Le fix est limité aux abstracts.
- Aucune modification de la signature publique de `size()` (zéro breaking
  change attendu pour les 100+ consommateurs).
- Aucune migration d'autres clés sémantiques même si identifiées en 1.4.
  Périmètre strict : wrapper + 2 tokens logo.
- Respect DB-first : aucun appel Supabase, aucun hook touché.

---

## Critères de recette finale

- [ ] `pnpm build` passe
- [ ] `pnpm test` passe (216 tests attendus)
- [ ] `pnpm type-check` passe
- [ ] `pnpm lint:hardcoded` passe
- [ ] `size('logo-auth-sm')` retourne `7.5rem` ✅
- [ ] `size('logo-auth-lg')` retourne `10rem` ✅
- [ ] `size('touch-target-min')` retourne sa valeur attendue (non régressé)
- [ ] Aucun consommateur `size()` existant ne plante au build
- [ ] T2-F retiré ou marqué résolu dans `CSS_ARCHITECTURE.md` §11
- [ ] Les 4 pages auth (Login, Signup, ForgotPassword, ResetPassword)
      affichent toujours correctement le logo aux bonnes tailles
