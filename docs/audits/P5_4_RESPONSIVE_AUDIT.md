# Audit P5.4 — Responsive mobile-first

**Date** : 2026-05-15
**Statut** : ✅ Audit terminé — Aucune violation détectée

---

## Méthode

Patterns grep utilisés :
- `grep -rn "@media.*max-width" src/ --include="*.scss"` — violations directes
- `grep -rn "max-width" src/ --include="*.scss"` — séparation propriété vs media query
- `grep -rn "@media (min-width:" src/ --include="*.scss"` — breakpoints hardcodés
- `grep -rn "respond-to" src/ --include="*.scss"` — utilisation mixin
- `grep -rn "breakpoint-max" src/ --include="*.scss"` — helper max-width (utilisé ?)
- `grep -rn "@media" src/ --include="*.scss"` — toutes les directives @media

Fichiers SCSS scannés : **116 fichiers** (hors `_breakpoints.scss`)
Périmètre : `src/components/**`, `src/page-components/**`, `src/styles/**`, `src/app/**`

Exclusions légitimes appliquées :
- `@media (prefers-reduced-motion: ...)` — non-breakpoint
- `@media (prefers-color-scheme: ...)` — non-breakpoint
- `@media (forced-colors: active)` — non-breakpoint
- `@media (prefers-contrast: high)` — non-breakpoint
- `@media print` — non-breakpoint
- `@media (hover: hover)` — non-breakpoint
- `src/styles/abstracts/_breakpoints.scss` — source de vérité, commentaires de doc

---

## Violations détectées

### Violations directes (`@media (max-width: ...)`)

**Aucune.** Zéro occurrence de `@media (max-width: <breakpoint>)` dans l'ensemble du codebase.

La seule occurrence de `max-width` dans un contexte `@media` est une ligne de documentation
dans `_breakpoints.scss` (ligne 49) — un exemple dans un commentaire JSDoc, pas du code actif.

### Violations indirectes (patterns desktop-first)

**Aucune.** Pas de `@media (min-width: ...)` avec valeurs hardcodées en pixels. Tous les
breakpoints responsive passent par le mixin `@include respond-to()`.

### Fonction `breakpoint-max()` — usage

La fonction `breakpoint-max()` est définie dans `_breakpoints.scss` pour générer des valeurs
`max-width` (breakpoint - 1px). Elle n'est **jamais utilisée** en dehors de son fichier de
définition. Elle reste disponible mais n'a pas encore de consommateur.

---

## Cas particuliers analysés

### `@include respond-to('mobile')` — LÉGITIME

Utilisé dans `TimeTimer.scss` (lignes 339, 404) et `FloatingTimeTimer.scss` (ligne 213).

Le token `'mobile'` est défini à `0px` dans `$breakpoint-tokens`. Le mixin `respond-to()`
détecte `$breakpoint-value == 0` et génère le contenu **sans enveloppe `@media`** — c'est
équivalent à des styles de base non conditionnels. Usage intentionnel et conforme.

### `max-width` comme propriété CSS — LÉGITIME

Nombreuses occurrences dans tout le codebase (`max-width: size('container-md')`, etc.).
Ce sont des **contraintes dimensionnelles de conteneurs**, pas des breakpoints de viewport.
Toutes passent par les fonctions tokens (`size()`, `spacing()`) conformément aux règles
tokens-first.

---

## Récap par fichier

| Fichier | Nb violations |
|---|---|
| Tous les 116 fichiers scannés | **0** |

---

## Estimation effort fix

- Refactors mécaniques : **0** (néant)
- Refactors complexes : **0** (néant)
- Effort estimé : **0h — aucun fix nécessaire**

---

## Note — TODOs historiques dans `_breakpoints.scss`

Le commentaire "TODO MIGRATION COMPOSANTS" (lignes 124-127) mentionne trois points :

1. **"Remplacer @media (min-width: 1024px) par @include respond-to('lg')"** — Cette migration
   est **déjà faite**. Aucun breakpoint hardcodé en pixels n'existe dans le codebase.

2. **"Supprimer max-width anti-patterns (AdminPermissions)"** — Aucune `@media (max-width: ...)`
   trouvée dans `Permissions.scss`. Les `max-width` présents sont des propriétés CSS légitimes
   (`max-width: size('1200')`), pas des breakpoints. Ce TODO est **obsolète**.

3. **"Uniformiser breakpoints isolés (480px, 520px, 640px)"** — Aucune valeur isolée trouvée
   dans le codebase. Ce TODO est **obsolète**.

Ces TODOs peuvent être nettoyés lors d'une session SCSS future, mais ne constituent pas des
violations actives.

---

## Conclusion

**P5.4 est conforme à 100%.**

Le codebase applique rigoureusement la discipline mobile-first :
- Tous les breakpoints responsive passent par `@include respond-to()`
- Zéro `@media (max-width: ...)` utilisé comme breakpoint de viewport
- Zéro breakpoint hardcodé en pixels
- La propriété `breakpoint-max()` existe mais n'est jamais appelée

**Aucune action corrective nécessaire.**
