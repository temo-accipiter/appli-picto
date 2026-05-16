# Clôture T1-C — Phase 1 : Audit Lecture Seule

**Date** : 2026-05-16 | **Branch** : feature/re-design-edition | **Auditeur** : Claude Code

---

## 1. Résumé exécutif (10 lignes)

**Verdict : GO Phase 2** — avec 4 corrections identifiées dans `src/styles/abstracts/` et 1 bug critique hors périmètre à signaler.

T1-C est **clôturable en une seule session**. Les 4 maps dans périmètre sont globalement alignées Tailwind, mais 3 lacunes bloquent la clôture formelle :

1. **`semantic('info-primary')`** retourne `#66c3f7` hardcodé dans `_colors.scss:88` — résolution Option C confirmée.
2. **`text('default')`** (49 usages) tombe dans le legacy `#333333` au lieu de Phase 6 — clé `'default'` absente de `$color-semantic-text`.
3. **`surface('surface')`** (9 usages) tombe dans le legacy `#f7f7f7` au lieu de Phase 6 — clé `'surface'` absente de `$color-semantic-surface`. Les composants ont en plus des commentaires **erronés** affirmant `→ Semantics Phase 6 ✅`.
4. **`radius('badge')` sans primitive** — `_semantics.scss:279` retourne `3.125rem` hardcodé, pas via `$radius-primitives`.

**Bug critique hors T1-C** : `font-size('6xl')` dans `TimeTimer.scss:597` — clé inexistante dans `$font-size-tokens` (va jusqu'à '5xl') → **ERREUR BUILD potentielle** non détectée en dev (Turbopack lazy). À corriger séparément.

---

## 2. Section 1.1 — Vérité sur `color('base')`

### Chaîne de résolution

```
color('base')
  → _colors.scss : @function color($key, $type: 'primary')
  → lit $primary-color-tokens[$type][$key]
  → $primary-color-tokens depuis _tokens.scss:426-432
  → base: #2871a8
```

### Tableau des 3 sources

| Source                                | Valeur `color('base')` | Valeur `color('dark')` | Statut          |
| ------------------------------------- | ---------------------- | ---------------------- | --------------- |
| `_tokens.scss:427` (source de vérité) | **`#2871a8`**          | `#1f5e8e`              | ✅ Autoritatif  |
| `_light.scss:15` (CSS custom props)   | `#2871a8`              | `#1f5e8e`              | ✅ En accord    |
| `CSS_ARCHITECTURE.md §3.1`            | `#0077c2`              | `#1565c0`              | ❌ **OBSOLÈTE** |

### Origine de l'incohérence

`_tokens.scss:606` contient le commentaire : `// Tailwind blue-600 (was #1565c0)` — confirmation d'une mise à jour récente de la palette primaire. La doc `CSS_ARCHITECTURE.md` n'a pas été mise à jour lors de ce changement.

### Sections obsolètes dans CSS_ARCHITECTURE.md

| Section                              | Valeur doc                                    | Valeur réelle | Correction |
| ------------------------------------ | --------------------------------------------- | ------------- | ---------- |
| §3.1 tableau `color('base')` primary | `#0077c2`                                     | `#2871a8`     | Remplacer  |
| §3.1 tableau `color('dark')` primary | `#1565c0`                                     | `#1f5e8e`     | Remplacer  |
| §3.1 exemple de code                 | `background-color: color('base'); // #0077c2` | `// #2871a8`  | Remplacer  |

### Consommateurs de `color('base')` (périmètre T1-C = connaissance seulement, pas d'action)

| Métrique                                     | Valeur                                                                |
| -------------------------------------------- | --------------------------------------------------------------------- |
| Total appels `color('base')` dans composants | **88**                                                                |
| Fichiers concernés (top 5)                   | Checkbox.scss, Toast.scss, Button.scss, ButtonClose.scss, Loader.scss |
| Impact du delta `#0077c2` vs `#2871a8`       | Aucun en runtime — `_tokens.scss` est la source compilée              |

---

## 3. Section 1.2 — Alignement Tailwind des 4 maps

### 3.1 `$color-semantic-feedback`

Source : `_semantics.scss:64-100`

| Clé              | Primitive                 | Valeur hex | Tailwind       |
| ---------------- | ------------------------- | ---------- | -------------- |
| `success-base`   | `palette('success', 500)` | `#10b981`  | ✅ Emerald-500 |
| `success-light`  | `palette('success', 100)` | `#d1fae5`  | ✅ Emerald-100 |
| `success-dark`   | `palette('success', 700)` | `#047857`  | ✅ Emerald-700 |
| `success-border` | `palette('success', 300)` | `#6ee7b7`  | ✅ Emerald-300 |
| `warning-base`   | `palette('warning', 500)` | `#f97316`  | ✅ Orange-500  |
| `warning-light`  | `palette('warning', 100)` | `#ffedd5`  | ✅ Orange-100  |
| `warning-dark`   | `palette('warning', 700)` | `#c2410c`  | ✅ Orange-700  |
| `warning-border` | `palette('warning', 300)` | `#fdba74`  | ✅ Orange-300  |
| `error-base`     | `palette('error', 500)`   | `#ef4444`  | ✅ Red-500     |
| `error-light`    | `palette('error', 100)`   | `#fee2e2`  | ✅ Red-100     |
| `error-dark`     | `palette('error', 700)`   | `#b91c1c`  | ✅ Red-700     |
| `error-border`   | `palette('error', 300)`   | `#fca5a5`  | ✅ Red-300     |
| `info-base`      | `palette('info', 500)`    | `#0ea5e9`  | ✅ Sky-500     |
| `info-light`     | `palette('info', 100)`    | `#e0f2fe`  | ✅ Sky-100     |
| `info-dark`      | `palette('info', 700)`    | `#0369a1`  | ✅ Sky-700     |
| `info-border`    | `palette('info', 300)`    | `#7dd3fc`  | ✅ Sky-300     |

**Verdict : ✅ 16/16 clés alignées Tailwind.**

> `semantic('info-primary')` n'est PAS dans cette map. C'est un cas spécial hardcodé directement dans `_colors.scss:83-88` via `@return #66c3f7`. Le problème est dans le wrapper, pas dans la map.

---

### 3.2 `$color-semantic-text`

Source : `_semantics.scss:30-42`

| Clé             | Primitive                 | Valeur hex                    | Tailwind        |
| --------------- | ------------------------- | ----------------------------- | --------------- |
| `'primary'`     | `palette('neutral', 800)` | `#1e293b`                     | ✅ Slate-800    |
| `'secondary'`   | `palette('neutral', 600)` | `#475569`                     | ✅ Slate-600    |
| `'tertiary'`    | `palette('neutral', 400)` | `#94a3b8`                     | ✅ Slate-400    |
| `'invert'`      | `palette('neutral', 0)`   | `#ffffff`                     | ✅ White        |
| `'muted'`       | `palette('neutral', 500)` | `#64748b`                     | ✅ Slate-500    |
| `'dark'`        | `palette('neutral', 900)` | `#0f172a`                     | ✅ Slate-900    |
| ~~`'default'`~~ | _(absent)_                | _(fallback legacy `#333333`)_ | ❌ Non-Tailwind |

**Verdict : ⚠️ Partiellement alignée — 6/6 clés Phase 6 OK, mais `'default'` absent déclenche fallback non-Tailwind.**

**Impact** : 49 appels `text('default')` dans les composants retournent `#333333` (legacy) au lieu de `#1e293b` (Phase 6, Slate-800). Différence visuelle subtile mais réelle.

**Correction T1-C** : Ajouter `'default': p.palette('neutral', 800)` dans `$color-semantic-text` — même valeur que `'primary'`, alias sémantique pour migration douce sans régression visuelle.

---

### 3.3 `$color-semantic-surface`

Source : `_semantics.scss:45-61`

| Clé             | Primitive                 | Valeur hex                    | Tailwind        |
| --------------- | ------------------------- | ----------------------------- | --------------- |
| `'page'`        | `palette('neutral', 50)`  | `#f8fafc`                     | ✅ Slate-50     |
| `'bg'`          | `palette('neutral', 0)`   | `#ffffff`                     | ✅ White        |
| `'card'`        | `palette('neutral', 0)`   | `#ffffff`                     | ✅ White        |
| `'overlay'`     | `palette('neutral', 100)` | `#f1f5f9`                     | ✅ Slate-100    |
| `'border'`      | `palette('neutral', 200)` | `#e2e8f0`                     | ✅ Slate-200    |
| `'divider'`     | `palette('neutral', 100)` | `#f1f5f9`                     | ✅ Slate-100    |
| `'hover'`       | `palette('neutral', 50)`  | `#f8fafc`                     | ✅ Slate-50     |
| `'soft'`        | `palette('neutral', 50)`  | `#f8fafc`                     | ✅ Slate-50     |
| ~~`'surface'`~~ | _(absent)_                | _(fallback legacy `#f7f7f7`)_ | ❌ Non-Tailwind |

**Verdict : ⚠️ Partiellement alignée — 8/8 clés Phase 6 OK, mais `'surface'` absent déclenche fallback non-Tailwind.**

**Impact** :

- 9 appels `surface('surface')` retournent `#f7f7f7` (legacy) au lieu de `#f8fafc` (Slate-50).
- Différence visuelle : `#f7f7f7` (gris neutre) vs `#f8fafc` (Slate-50 légèrement bleuté). Delta faible mais réel.
- **Commentaires erronés dans 3 composants** : `Button.scss`, `ImagePreview.scss`, `FloatingPencil.scss` indiquent `surface('surface') → Semantics Phase 6 (#f8fafc) ✅` — c'est **faux**, la valeur réelle est `#f7f7f7` via fallback legacy.

**Correction T1-C** : Ajouter `'surface': p.palette('neutral', 50)` dans `$color-semantic-surface` — aligne sur `#f8fafc` (Slate-50), cohérent avec `'soft'`/`'hover'`/`'page'`. Les composants auront une infime variation visuelle (`#f7f7f7` → `#f8fafc`).

---

### 3.4 `$spacing-semantic`

Source : `_semantics.scss:163-199`

| Clé sémantique        | Primitive                    | Valeur          | Tailwind    |
| --------------------- | ---------------------------- | --------------- | ----------- |
| `'page-padding'`      | `$spacing-primitives['xl']`  | `2rem` (32px)   | ✅ space-8  |
| `'section-gap'`       | `$spacing-primitives['2xl']` | `3rem` (48px)   | ✅ space-12 |
| `'grid-gap'`          | `$spacing-primitives['md']`  | `1rem` (16px)   | ✅ space-4  |
| `'container-padding'` | `$spacing-primitives['lg']`  | `1.5rem` (24px) | ✅ space-6  |
| `'card-padding'`      | `$spacing-primitives['lg']`  | `1.5rem` (24px) | ✅ space-6  |
| `'card-gap'`          | `$spacing-primitives['md']`  | `1rem` (16px)   | ✅ space-4  |
| `'input-padding'`     | `$spacing-primitives['sm']`  | `0.5rem` (8px)  | ✅ space-2  |
| `'button-padding-x'`  | `$spacing-primitives['lg']`  | `1.5rem` (24px) | ✅ space-6  |
| `'button-padding-y'`  | `$spacing-primitives['sm']`  | `0.5rem` (8px)  | ✅ space-2  |
| `'modal-padding'`     | `$spacing-primitives['xl']`  | `2rem` (32px)   | ✅ space-8  |
| `'text-gap-tight'`    | `$spacing-primitives['xs']`  | `0.25rem` (4px) | ✅ space-1  |
| `'text-gap-normal'`   | `$spacing-primitives['sm']`  | `0.5rem` (8px)  | ✅ space-2  |
| `'text-gap-loose'`    | `$spacing-primitives['md']`  | `1rem` (16px)   | ✅ space-4  |
| `'heading-gap'`       | `$spacing-primitives['lg']`  | `1.5rem` (24px) | ✅ space-6  |
| `'nav-padding'`       | `$spacing-primitives['md']`  | `1rem` (16px)   | ✅ space-4  |
| `'nav-gap'`           | `$spacing-primitives['sm']`  | `0.5rem` (8px)  | ✅ space-2  |

**Verdict : ✅ 16/16 clés alignées Tailwind.**

---

## 4. Section 1.3 — Inventaire clés legacy résiduelles

> Périmètre : `src/**/*.scss` hors `src/styles/abstracts/`. Shadow hors T1-C (mentionné pour inventaire seulement).

### 4.1 `surface('surface')` — 9 occurrences

| Fichier                   | Ligne | Propriété          | Valeur actuelle | Alias Phase 6 suggéré                                       |
| ------------------------- | ----- | ------------------ | --------------- | ----------------------------------------------------------- |
| `Button.scss`             | 72    | `background-color` | `#f7f7f7`       | `surface('soft')` → `#f8fafc`                               |
| `ButtonClose.scss`        | 88    | `background-color` | `#f7f7f7`       | `surface('soft')`                                           |
| `ImagePreview.scss`       | 37    | `background-color` | `#f7f7f7`       | `surface('soft')`                                           |
| `FloatingPencil.scss`     | 38    | `background-color` | `#f7f7f7`       | `surface('soft')`                                           |
| `PasswordChecklist.scss`  | 59    | `background-color` | `#f7f7f7`       | `surface('soft')`                                           |
| `PasswordChecklist.scss`  | 129   | `background-color` | `#f7f7f7`       | `surface('soft')`                                           |
| `DeleteAccountGuard.scss` | 32    | `background`       | `#f7f7f7`       | `surface('soft')`                                           |
| `Modal.scss`              | 59    | `background`       | `#f7f7f7`       | `surface('soft')`                                           |
| _(8 fichiers)_            | —     | —                  | —               | `surface('surface')` → après correction T1-C = `#f8fafc` ✅ |

> Note : après l'ajout de la clé `'surface'` dans `$color-semantic-surface` (Phase 2), ces 9 appels seront automatiquement résolus sans modification de composants. La correction est dans le design system, pas dans les consommateurs.

### 4.2 `text('default')` — 49 occurrences

| Fichier top 5            | Nb usages | Valeur actuelle      | Phase 6 équivalent            |
| ------------------------ | --------- | -------------------- | ----------------------------- |
| `TimeTimer.scss`         | 8         | `#333333`            | `text('primary')` → `#1e293b` |
| `TrainProgressBar.scss`  | 1         | `#333333`            | `text('primary')`             |
| `FloatingTimeTimer.scss` | 1         | `#333333`            | `text('primary')`             |
| _autres fichiers_        | ~39       | `#333333`            | `text('primary')`             |
| **TOTAL**                | **49**    | **`#333333` legacy** | —                             |

> Note : idem — après ajout de `'default': p.palette('neutral', 800)` dans `$color-semantic-text`, ces 49 appels passeront automatiquement en Phase 6 sans modification de composants.

### 4.3 `spacing()` avec clés numériques

| Fichier                       | Clé                            | Valeur   | Catégorie            | Note                                              |
| ----------------------------- | ------------------------------ | -------- | -------------------- | ------------------------------------------------- |
| `TrainProgressBar.scss:77`    | `spacing('14')`                | 14px     | SVG stroke-dasharray | ⚠️ Exception documentée §E.7                      |
| `TrainProgressBar.scss:63`    | `spacing('140')`               | 140px    | Hauteur piste        | ✅ Dans `$spacing-primitives`                     |
| `TrainProgressBar.scss:95-96` | `spacing('62')`                | 62px     | Icône station        | ⚠️ Hors grille stricte (60 ou 64 ?)               |
| `ImagePreview.scss:45-46`     | `spacing('60')`                | 60px     | Dimension image      | ⚠️ "Tolérance temporaire" doc in-code             |
| `ImagePreview.scss:50-51`     | `spacing('100')`               | 100px    | Dimension image      | ⚠️ "Tolérance temporaire"                         |
| `ImagePreview.scss:55-57`     | `spacing('160')`               | 160px    | Dimension image      | ⚠️ "Tolérance temporaire" — devrait être `size()` |
| `ButtonClose.scss:99-100`     | `spacing('40')`                | 40px     | Dimensions bouton    | ⚠️ Devrait être `size()`                          |
| `Toggle.scss:79`              | `spacing('2')`                 | 2px      | Offset toggle thumb  | ✅ Dans `$spacing-primitives`                     |
| `base/_helpers.scss:62-83`    | `spacing('2')`, `spacing('3')` | 2px, 3px | Classes utilitaires  | ⚠️ `spacing('3')` hors grille (3px)               |
| `base/_accessibility.scss:33` | `spacing('3')`                 | 3px      | Focus ring           | ⚠️ Hors grille (2px → `spacing('2')`)             |

### 4.4 `size()` avec clés numériques

| Clé                          | Valeur    | Nb usages | Fichier(s)                        | Alias sémantique suggéré                     |
| ---------------------------- | --------- | --------- | --------------------------------- | -------------------------------------------- |
| `size('4')`                  | 4px       | 2         | Loader.scss, TimeTimer.scss       | `spacing('4')` si positionnement, sinon ok   |
| `size('16')`, `size('20')`   | 16/20px   | 4         | TachesDnd.scss                    | `size('icon-sm')`, `size('icon-md')`         |
| `size('24')`, `size('32')`   | 24/32px   | 4         | SettingsMenu.scss, Navbar.scss    | `size('icon-md')`, `size('icon-lg')`         |
| `size('60')`, `size('62')`   | 60/62px   | 5         | TrainProgressBar.scss             | Pas de sémantique — garder clé numérique     |
| `size('64')`                 | 64px      | 2         | Navbar.scss, NavbarVisiteur.scss  | `size('touch-target-min')` × 1.45 — garder   |
| `size('100')`, `size('120')` | 100/120px | 3         | SettingsMenu.scss                 | Pas de sémantique — garder                   |
| `size('140')`                | 140px     | 1         | TachesDnd.scss                    | `size('card-min-height')` → 140px ✅         |
| `size('160')`, `size('200')` | 160/200px | 3         | TachesDnd.scss, SettingsMenu.scss | Pas de sémantique — garder                   |
| `size('300')`                | 300px     | 1         | SettingsMenu.scss                 | `size('modal-width-sm')` → 320px (proche)    |
| `size('600')`, `size('900')` | 600/900px | 4         | TrainProgressBar.scss, Navbar     | Pas de sémantique — garder                   |
| `size('800')`                | 800px     | —         | Profil.scss                       | `size('container-lg')` → 1024px (trop grand) |

### 4.5 `shadow('elevation-...')` — Hors périmètre T1-C (inventaire uniquement)

| Clé utilisée             | Nb fichiers | Alias sémantique Phase 6 disponible |
| ------------------------ | ----------- | ----------------------------------- |
| `shadow('elevation-xs')` | 2           | `shadow('subtle')`                  |
| `shadow('elevation-sm')` | 4           | `shadow('small')`                   |
| `shadow('elevation-md')` | 7           | `shadow('medium')`                  |
| `shadow('elevation-lg')` | 3           | `shadow('large')`                   |

> Ces 16 usages sont valides (legacy fallback actif), mais non conformes v1.1 (qui impose les aliases sémantiques). Migration reportée à la queue de refactor composants.

---

## 5. Section 1.4 — Consommateurs `semantic('info-primary')` + verdicts WCAG

Fichier de référence : `_colors.scss:83-88`

```scss
@if $name == 'info-primary' {
  // ⚠️ LEGACY — valeur intentionnellement conservée (#66c3f7, bleu clair décoratif)
  @return #66c3f7;
}
```

Valeur retournée : `#66c3f7` (Sky-300 approximatif — à vérifier)  
Valeur `palette('info', 300)` = `#7dd3fc` (Sky-300 Tailwind réel)  
**Delta** : `#66c3f7` ≠ `#7dd3fc` — deux bleus clairs distincts.

| Fichier                  | Ligne         | Propriété CSS  | Valeur context                                | WCAG                                       |
| ------------------------ | ------------- | -------------- | --------------------------------------------- | ------------------------------------------ |
| `TrainProgressBar.scss`  | 45            | `color`        | Sur fond `semantic('info', 'bg')` = `#e0f2fe` | ⚠️ 2.4:1 (< 4.5, mais composant graphique) |
| `TrainProgressBar.scss`  | 119           | `border`       | Bordure décorative                            | ✅ Non-texte                               |
| `TrainProgressBar.scss`  | 133, 137      | `background`   | Fond pastille                                 | ✅ Non-texte                               |
| `TachesDnd.scss`         | 64, 70        | `border-color` | Bordure état DnD                              | ✅ Non-texte                               |
| `TachesDnd.scss`         | 133           | `border`       | Bordure décorative                            | ✅ Non-texte                               |
| `TachesDnd.scss`         | 146           | `background`   | Fond pastille                                 | ✅ Non-texte                               |
| `TimeTimer.scss`         | 265           | `color`        | Texte label sur fond blanc                    | ❌ **WCAG FAIL** 1.96:1                    |
| `TimeTimer.scss`         | 270           | `border-left`  | Bordure séparateur                            | ✅ Non-texte                               |
| `TimeTimer.scss`         | 317, 442, 498 | `background`   | Fond segment timer                            | ✅ Non-texte                               |
| `TimeTimer.scss`         | 379, 488      | `border-color` | Bordure état actif                            | ✅ Non-texte                               |
| `CardsEdition.scss`      | 88            | `background`   | Fond zone sélection                           | ✅ Non-texte                               |
| `CardsEdition.scss`      | 120, 125      | `border-color` | Bordures décoratifs                           | ✅ Non-texte                               |
| `CookiePreferences.scss` | 46            | `border-color` | Bordure toggle catégorie                      | ✅ Non-texte                               |
| `CookiePreferences.scss` | 115           | `accent-color` | Couleur checkbox native                       | ⚠️ Cosmétique OS-géré                      |
| `CookiePreferences.scss` | 150           | `color`        | Texte lien sur fond blanc                     | ❌ **WCAG FAIL** 1.96:1                    |

**Bilan WCAG** :

- 2 violations textuelles critiques : `TimeTimer.scss:265`, `CookiePreferences.scss:150`
- 19 usages décoratifs (non-texte) : acceptables, zéro régression
- Note : avec Option C, `info-primary` et `info-decorative` retourneront `palette('info', 300)` = `#7dd3fc`. Le ratio sur fond blanc = 2.32:1 — toujours insuffisant pour du texte. Les 2 violations WCAG doivent migrer vers `semantic('info', 'dark')` (`#0369a1`, ratio 5.82:1) lors du refactoring des composants concernés.

---

## 6. Section 1.5 — Anomalie `radius('badge')`

**Localisation** : `_semantics.scss:279`

```scss
'badge':3.125rem,;
// 50px — Badges/pills (coins arrondis fixes, non ovale)
```

Valeur hardcodée `3.125rem` directement dans `$radius-semantic` — aucune primitive correspondante dans `$radius-primitives`. Brise la règle "toutes les semantics pointent sur une primitive".

**Consommateurs** (13 usages, 8 fichiers) :

| Fichier                   | Nb usages       |
| ------------------------- | --------------- |
| `Navbar.scss`             | 4               |
| `CardsEdition.scss`       | 3               |
| `CookiePreferences.scss`  | 1               |
| `AccountStatusBadge.scss` | 1               |
| `Profil.scss`             | 1               |
| `Metrics.scss`            | 1               |
| `Permissions.scss`        | 1               |
| `NavbarVisiteur.scss`     | 1 (à confirmer) |

**Valeur attendue après correction** : inchangée — `3.125rem` = 50px. La correction est structurelle (primitive → semantic), sans impact visuel.

---

## 7. Section 1.6 — Hors périmètre (signalement)

### Bug critique — `font-size('6xl')` inexistant

**Fichier** : `TimeTimer.scss:597`

```scss
font-size: font-size('6xl');
```

**`$font-size-tokens`** ne contient que : `xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl`. La clé `'6xl'` est absente.

La fonction `font-size()` dans `_typography.scss:68` utilise `@error` direct (pas de fallback) :

```scss
@if not map.has-key($font-size-tokens, $key) {
  @error "Font-size key '#{$key}' not found...";
}
```

**Pourquoi ça ne plante pas en dev** : Turbopack compile à la demande — si `TimeTimer.scss` n'est pas rendu au démarrage du dev server, l'erreur n'est pas levée. En revanche, `pnpm build` (compilation Sass complète) plante.

**Action requise** : corriger dans `TimeTimer.scss:597` avant `pnpm build`. Suggestion : `font-size('5xl')` (48px, taille max disponible) ou `font-size('4xl')` (36px). À valider avec le design.

> Ce bug est hors périmètre T1-C (c'est un bug composant, pas un problème de map abstracts). Il est signalé ici pour ne pas bloquer la validation post-Phase 2.

---

## 8. Plan détaillé Phase 2

### Préflight

```bash
git status            # Doit être clean (branche feature/re-design-edition)
pnpm build:css        # Baseline pré-modification
```

---

### Sous-phase A — `_colors.scss` : résolution `semantic('info-primary')` (Option C hybride)

**Fichier cible** : `src/styles/abstracts/_colors.scss`

**Modification** : Remplacer les lignes 83-88 :

```scss
// Avant (lignes 83-88)
@if $name == 'info-primary' {
  // ⚠️ LEGACY — valeur intentionnellement conservée (#66c3f7, bleu clair décoratif)
  // ...
  @return #66c3f7;
}
```

```scss
// Après
@if $name == 'info-decorative' or $name == 'info-primary' {
  // ✅ Phase 6 — bleu décoratif léger, aligné Sky-300 Tailwind
  // 'info-decorative' = nouveau nom canonical
  // 'info-primary'    = alias deprecated (migration en cours, 21 sites)
  @if $name == 'info-primary' {
    @warn "semantic('info-primary') est deprecated. Utiliser semantic('info-decorative'). 21 sites en attente de migration vers la queue composants.";
  }
  @return map.get(sem.$color-semantic-feedback, 'info-border');
  // palette('info', 300) = #7dd3fc — Sky-300 Tailwind
}
```

> Note : `'info-border'` dans `$color-semantic-feedback` = `palette('info', 300)` = `#7dd3fc`. On pointe sur la map existante au lieu de dupliquer l'appel `palette()` — une seule source de vérité.

**Alternative plus directe** (si `info-border` est sémantiquement ambigu) :

```scss
@return map.get(prim.$palettes-primitives, 'info') [300];
// ou via une clé dédiée 'info-decorative' dans $color-semantic-feedback
```

**Vérification** :

- `semantic('info-primary')` → `#7dd3fc` (était `#66c3f7` — delta visuel attendu)
- `semantic('info-decorative')` → `#7dd3fc` ✅
- `@warn` apparaît dans le log de build pour chaque usage `info-primary`

---

### Sous-phase B — `_semantics.scss` : 3 corrections

**Fichier cible** : `src/styles/abstracts/_semantics.scss`

**Correction B1** — Ajouter `'default'` dans `$color-semantic-text` (après la clé `'dark'`, ligne ~41) :

```scss
// Ajouter dans $color-semantic-text
'default': p.palette('neutral', 800),
// #1e293b - Alias de migration depuis legacy $text-color-tokens.default (#333333)
// 49 composants utilisent text() ou text('default') — migration automatique vers Phase 6
```

**Correction B2** — Ajouter `'surface'` dans `$color-semantic-surface` (après la clé `'soft'`, ligne ~60) :

```scss
// Ajouter dans $color-semantic-surface
'surface': p.palette('neutral', 50),
// #f8fafc - Alias de migration depuis legacy $surface-color-tokens.surface (#f7f7f7)
// Delta visuel minimal (gris neutre → Slate-50), 9 composants migrés automatiquement
```

**Correction B3** — Corriger `'badge'` dans `$radius-semantic` (ligne 279) :

```scss
// Avant
'badge':3.125rem, // 50px — Badges/pills (coins arrondis fixes, non ovale)

// Après
'badge': map.get(p.$radius-primitives, 'badge');
// 50px — Badges/pills, via primitive p.$radius-primitives['badge']
```

**Correction B4** (prérequis de B3) — Ajouter dans `$radius-primitives` de `_primitives.scss` :

```scss
// Ajouter dans $radius-primitives (après 'full': 50%)
'badge':3.125rem,;
// 50px - Pills/badges (coins fixes — non ovale sur dimensions variables)
```

---

### Sous-phase C — `_colors.scss` : ajouter `'info-decorative'` dans `$color-semantic-feedback`

Option plus propre que l'approche de la sous-phase A : ajouter une véritable entrée dans la map plutôt que de tout gérer dans le wrapper.

**Décision finale** sur architecture (au choix de Temo) :

**Option C1** (map) : Ajouter `'info-decorative-base': palette('info', 300)` dans `$color-semantic-feedback` dans `_semantics.scss`, puis pointer vers cette clé dans le wrapper.

**Option C2** (wrapper seul) : Gérer `'info-decorative'` ET `'info-primary'` directement dans `_colors.scss` via `@return map.get(sem.$color-semantic-feedback, 'info-border')` (Sky-300 déjà dans la map).

> Recommandation : **Option C2** — `info-border` = `palette('info', 300)` = `#7dd3fc` est déjà dans la map. `info-decorative` est un concept de migration, pas une intention sémantique stable. Évite de polluer `$color-semantic-feedback` avec une clé transitoire.

---

### Validation inter-sous-phases

Après chaque sous-phase :

```bash
pnpm check            # lint:fix + format
pnpm test             # 130 smoke tests
pnpm build            # Compilation Next.js complète (Sass inclus)
pnpm type-check       # TypeScript
pnpm lint:hardcoded   # Vérifier valeurs hardcodées SCSS
```

---

## 9. Checklist "Prêt pour GO Phase 2"

- [x] Map `$color-semantic-feedback` documentée (16/16 clés Tailwind, source `_semantics.scss`)
- [x] `color('base')` tracé : source de vérité = `_tokens.scss:427` = `#2871a8`, `CSS_ARCHITECTURE.md` obsolète documenté
- [x] `text('default')` : 49 usages legacy `#333333` — correction = ajout clé `'default'` dans Phase 6
- [x] `surface('surface')` : 9 usages legacy `#f7f7f7` — correction = ajout clé `'surface'` dans Phase 6
- [x] `semantic('info-primary')` : 21 usages, 2 violations WCAG textuelles, plan Option C validé
- [x] `radius('badge')` sans primitive : 13 usages, 8 fichiers, correction structurelle (valeur inchangée)
- [x] Bug hors périmètre signalé : `font-size('6xl')` dans `TimeTimer.scss:597` = ERREUR BUILD
- [x] Plan Phase 2 : 4 fichiers max, 6 opérations, aucun composant touché
- [x] Décision T1-C → **GO Phase 2** — toutes les corrections dans `src/styles/abstracts/` uniquement
