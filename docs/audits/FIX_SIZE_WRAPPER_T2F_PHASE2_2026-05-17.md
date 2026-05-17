# FIX T2-F — Audit Phase 2 : Implémentation + Validation

**Date** : 2026-05-17 | **Branche** : `feature/re-design-edition`
**Statut** : ✅ CLÔTURÉ — Zéro erreur, zéro régression, 216 tests passants

---

## 1. Résumé exécutif

La Phase 2 de T2-F est complète. Le wrapper `size()` lit maintenant `$size-semantic` en priorité (Semantics → Primitives → Legacy Tokens), calqué sur le pattern existant de `_spacing.scss`. Les 2 tokens logo ont été relocalisés de `$size-tokens` vers `$size-semantic`. La divergence `modal-width-lg` (45rem vs 48rem) a été corrigée dans `$size-primitives` avant toute bascule de priorité, évitant 6 régressions potentielles.

**Périmètre final** : 4 fichiers abstracts modifiés, aucun composant touché.

---

## 2. Décisions Temo appliquées

| Bloqueur Phase 1                                          | Décision Temo                       | Application                                    |
| --------------------------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| `modal-width-lg` : 45rem (primitive) vs 48rem (tokens)    | **Option A** : corriger le primitif | `_primitives.scss` : 45rem → 48rem             |
| Tokens logo dans `$size-tokens` (temporaire REPLACE_LOGO) | Relocaliser vers `$size-semantic`   | `_semantics.scss` + suppression `_tokens.scss` |

---

## 3. Étapes exécutées

### Étape 0 — Correction préliminaire `$size-primitives`

**Fichier** : `src/styles/abstracts/_primitives.scss`

**Modification** :

```scss
// AVANT
'modal-width-lg':45rem, // 720px

// APRÈS
'modal-width-lg': 48rem; // 768px — corrigé 45rem→48rem pour aligner sur $size-tokens
```

**Vérification post-Étape 0** : 15/15 collisions entre `$size-semantic` et `$size-tokens` confirmées identiques.

---

### Étape 1 — Refactorisation `_size.scss`

**Fichier** : `src/styles/abstracts/_size.scss`

**Avant** :

```scss
@use 'sass:map';
@use 'tokens' as *;

@function size($key) {
  @if map.has-key($size-tokens, $key) {
    @return map.get($size-tokens, $key);
  } @else {
    @error "Size token '#{$key}' not found.";
  }
}
```

**Après** :

```scss
@use 'sass:map';
@use 'tokens' as *;
@use 'semantics' as sem;
@use 'primitives' as prim;

$ENABLE_LEGACY_SUPPORT: true !default;

@function size($key) {
  @if map.has-key(sem.$size-semantic, $key) {
    @return map.get(
      sem.$size-semantic,
      $key
    ); // 1. Semantics (priorité Phase 6)
  } @else if map.has-key(prim.$size-primitives, $key) {
    @return map.get(prim.$size-primitives, $key); // 2. Primitives Phase 6
  } @else if $ENABLE_LEGACY_SUPPORT and map.has-key($size-tokens, $key) {
    @return map.get($size-tokens, $key); // 3. Legacy tokens (fallback)
  } @else {
    @if $ENABLE_LEGACY_SUPPORT {
      @error "Size '#{$key}' not found in semantics, primitives, nor legacy tokens.";
    } @else {
      @error "Size '#{$key}' not found in semantics or primitives.";
    }
  }
}
```

**Patron** : calqué identiquement sur `_spacing.scss` (pattern déjà validé en production).

---

### Étape 2 — Ajout tokens logo dans `$size-semantic`

**Fichier** : `src/styles/abstracts/_semantics.scss`

Ajout en fin de map `$size-semantic` :

```scss
// === Branding (Component-specific semantic aliases — sans primitive correspondante) ===
'logo-auth-sm':7.5rem, // 120px — Largeur du logo Appli-Picto sur les pages d'authentification (mobile).
'logo-auth-lg': 10rem;
// 160px — Largeur du logo Appli-Picto sur les pages auth (desktop).
```

---

### Étape 3 — Suppression tokens logo dans `$size-tokens`

**Fichier** : `src/styles/abstracts/_tokens.scss`

Suppression de la section "Branding" ajoutée temporairement lors de REPLACE_LOGO Phase 2 :

```scss
// SUPPRIMÉ
// === Branding ===
'logo-auth-sm':7.5rem, // 120px
'logo-auth-lg': 10rem; // 160px
```

`$size-tokens` se termine maintenant à : `'1200': 75rem // 1200px - Logs page, large containers`

---

### Étape 4 — Validation renforcée

#### Suite de commandes

| Commande                         | Résultat                      |
| -------------------------------- | ----------------------------- |
| `pnpm check` (lint:fix + format) | ✅ 0 erreur, 0 warning        |
| `pnpm test` (Vitest)             | ✅ 216 passés, 4 skipped      |
| `pnpm build` (Next.js)           | ✅ Compilation réussie en 42s |
| `pnpm type-check`                | ✅ 0 erreur TypeScript        |
| `pnpm lint:hardcoded`            | ✅ Aucun hardcode détecté     |

#### Vérification des 6 valeurs critiques

Compilation SCSS directe (`npx sass`) sur les 6 tokens :

| Token                      | Valeur attendue | Valeur compilée | Layer résolu            | Statut      |
| -------------------------- | --------------- | --------------- | ----------------------- | ----------- |
| `size('logo-auth-sm')`     | 7.5rem (120px)  | **7.5rem**      | `$size-semantic`        | ✅          |
| `size('logo-auth-lg')`     | 10rem (160px)   | **10rem**       | `$size-semantic`        | ✅          |
| `size('modal-width-lg')`   | 48rem (768px)   | **48rem**       | `$size-semantic`        | ✅ CRITIQUE |
| `size('touch-target-min')` | 2.75rem (44px)  | **2.75rem**     | `$size-semantic`        | ✅          |
| `size('avatar-md')`        | 2.5rem (40px)   | **2.5rem**      | `$size-semantic`        | ✅          |
| `size('120')`              | 7.5rem (legacy) | **7.5rem**      | `$size-tokens` fallback | ✅          |

**Zéro régression** sur les 15 tokens en collision entre `$size-semantic` et `$size-tokens`.

---

## 4. Bilan des fichiers modifiés

| Fichier                                 | Nature             | Changement                                           |
| --------------------------------------- | ------------------ | ---------------------------------------------------- |
| `src/styles/abstracts/_primitives.scss` | Fix alignement     | `modal-width-lg` : 45rem → 48rem                     |
| `src/styles/abstracts/_size.scss`       | Fix architecture   | `size()` : 1 layer → 3 layers (Sem → Prim → Legacy)  |
| `src/styles/abstracts/_semantics.scss`  | Ajout tokens       | `logo-auth-sm`, `logo-auth-lg` dans `$size-semantic` |
| `src/styles/abstracts/_tokens.scss`     | Suppression tokens | Section "Branding" retirée de `$size-tokens`         |

**Aucun composant touché. Aucun hook touché. Aucune valeur hardcodée.**

---

## 5. Proposition de mise à jour `CSS_ARCHITECTURE.md`

> ⚠️ Proposition uniquement — à valider par Temo avant édition.

### §11 — Dette technique : marquer T2-F résolu

```markdown
| T2-F | `size()` ne lit pas `$size-semantic` | ✅ RÉSOLU 2026-05-17 |
```

### §3.5 — Chaîne de résolution `size()`

Mettre à jour le schéma de résolution pour refléter les 3 layers :

```
size($key)
  1. $size-semantic    (priorité — tokens nommés sémantiquement)
  2. $size-primitives  (valeurs brutes Phase 6)
  3. $size-tokens      (legacy — si $ENABLE_LEGACY_SUPPORT: true)
  4. @error            (clé introuvable)
```

### §3.7 — Tokens `size()` disponibles

Ajouter dans la section "Branding" :

```
size('logo-auth-sm')  → 7.5rem (120px) — logo auth mobile
size('logo-auth-lg')  → 10rem  (160px) — logo auth desktop
```

---

## 6. Statut final

```
✅ Étape 0 — Alignement primitif modal-width-lg
✅ Étape 1 — Refactorisation _size.scss (3 layers)
✅ Étape 2 — Tokens logo dans $size-semantic
✅ Étape 3 — Suppression tokens logo de $size-tokens
✅ Étape 4 — Validation renforcée (5 commandes + 6 tokens)
⏳ Étape 5 — Mise à jour CSS_ARCHITECTURE.md (en attente accord Temo)
```

**T2-F est fonctionnellement clôturé.** Le fix est en production locale, validé par les tests et le build.
