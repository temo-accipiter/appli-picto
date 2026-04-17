# Audit Qualitatif — `_tokens.scss` (Phase 0)

**Date** : 2026-04-17
**Fichier audité** : `src/styles/abstracts/_tokens.scss`
**Périmètre** : Read-only — constat chiffré uniquement, zéro refactor à ce stade

---

## 1. Doublons de valeur dans les maps SCSS

### 1.1 `$spacing-tokens` — Alias sémantiques vs numériques

Cinq paires de tokens coexistent avec la même valeur rem.
Les alias numériques (`'4'`, `'8'`, `'16'`, `'24'`, `'32'`) sont marqués "legacy" dans les commentaires du fichier, mais restent activement utilisés.

| Alias sémantique | Alias numérique | Valeur        | Fichiers sémantique | Fichiers numérique | Rapport |
| ---------------- | --------------- | ------------- | ------------------- | ------------------ | ------- |
| `'xs'`           | `'4'`           | 0.25rem (4px) | 50                  | 13                 | 3,8 : 1 |
| `'sm'`           | `'8'`           | 0.5rem (8px)  | 62                  | 9                  | 6,9 : 1 |
| `'md'`           | `'16'`          | 1rem (16px)   | 52                  | 8                  | 6,5 : 1 |
| `'lg'`           | `'24'`          | 1.5rem (24px) | 33                  | 9                  | 3,7 : 1 |
| `'xl'`           | `'32'`          | 2rem (32px)   | 24                  | 4                  | 6 : 1   |

**Lecture** : Les alias sémantiques dominent largement. Les variantes numériques représentent une minorité d'usages résiduels. La migration Phase 6 vers les noms sémantiques est déjà très avancée dans le codebase.

---

### 1.2 `$radius-tokens` — Alias sémantiques vs valeurs explicites

| Groupe de valeur | Tokens concernés                                            | Valeur |
| ---------------- | ----------------------------------------------------------- | ------ |
| 8px              | `'default'`, `'md'`, `'button'`, `'input'`, `'rounded-8px'` | 8px    |
| 16px             | `'card'`, `'lg'`, `'modal'`, `'drawer'`, `'rounded-16px'`   | 16px   |
| 50%              | `'avatar'`, `'badge'`, `'full'`                             | 50%    |
| 4px              | `'sm'`, `'tooltip'`, `'rounded-4px'`                        | 4px    |

Les tokens `'rounded-Npx'` sont des doublons explicites des aliases sémantiques, dans le même map. Leur présence crée de l'ambiguïté sur lequel choisir dans les composants.

---

## 2. Tokens Deprecated

### 2.1 `$font-size-tokens` — Clés de rétrocompatibilité

Six clés sont marquées `// DEPRECATED` aux lignes 1007–1019 :

| Clé deprecated | Valeur   | Équivalent recommandé | Usages dans `src/` |
| -------------- | -------- | --------------------- | ------------------ |
| `'0-75'`       | 0.75rem  | `'xs'`                | **0**              |
| `'0-875'`      | 0.875rem | `'sm'`                | **0**              |
| `'0-9'`        | 0.9rem   | _(hors Option B)_     | **0**              |
| `'0-95'`       | 0.95rem  | _(hors Option B)_     | **0**              |
| `'1-125'`      | 1.125rem | `'lg'`                | **0**              |
| `'1-5'`        | 1.5rem   | `'2xl'`               | **0**              |

**Verdict : ✅ SAFE** — Zéro usage résiduel. Ces clés sont du dead code de rétrocompatibilité, supprimables sans risque.

---

## 3. Conflits "Primary" — Trois définitions de couleur principale

Trois sources définissent une couleur "principale" dans `_tokens.scss`, avec des valeurs différentes et des usages divergents.

### 3.1 Inventaire

| Source                           | Clé/Chemin        | Valeur hex                                            | Accès standard             |
| -------------------------------- | ----------------- | ----------------------------------------------------- | -------------------------- |
| `$primary-color-tokens.base`     | ligne ~399        | `#0077c2` (bleu foncé)                                | via `color('primary')`     |
| `$admin-ui-color-tokens.primary` | ligne ~459        | `#007bff` (Bootstrap blue)                            | via `admin-ui('primary')`  |
| Thèmes light/dark                | `--color-primary` | `blue(600)` = `#2563eb` en light, `blue(400)` en dark | via `var(--color-primary)` |

### 3.2 Usage réel

| Variable/Fonction      | Usages dans `src/**/*.scss`                                            | Verdict    |
| ---------------------- | ---------------------------------------------------------------------- | ---------- |
| `color('primary')`     | **0 fichiers**                                                         | Orpheline  |
| `admin-ui('primary')`  | **0 fichiers**                                                         | Orpheline  |
| `var(--color-primary)` | Définie dans thèmes, utilisée dans `_dark.scss`, `_borders.scss`, etc. | **Active** |

**Verdict : ⚠️ CONFUSION** — `$primary-color-tokens` et la clé `primary` de `$admin-ui-color-tokens` sont toutes deux orphelines. La vraie couleur primaire de l'application est `--color-primary` défini dans les thèmes light/dark, qui pointe vers `blue(600)`/`blue(400)` de `$blue-palette-tokens`. Les deux autres maps définissent des "primary" différentes qui ne sont jamais appelées.

---

## 4. Dark-Mode Readiness

### 4.1 Variables CSS dans `:root` de `_tokens.scss` (lignes 1736–1759)

Le bloc `:root` de `_tokens.scss` expose uniquement :

- Opacity (`--opacity-xs` à `--opacity-xl`)
- Z-index (`--z-dropdown` à `--z-notification`)
- Couleurs de rôles (`--color-admin`, `--color-abonne`, `--color-free`, `--color-visitor`)

Les tokens `$text-color-tokens` et `$surface-color-tokens` ne sont **PAS** exposés dans ce `:root`.

### 4.2 Variables text/surface exposées dans les thèmes

Les fichiers `src/styles/themes/_light.scss` et `_dark.scss` définissent les CSS variables sémantiques complètes :

| Variable CSS          | Light        | Dark            |
| --------------------- | ------------ | --------------- |
| `--color-primary`     | `blue(600)`  | `blue(400)`     |
| `--color-text`        | `gray(900)`  | `slate(200)`    |
| `--color-text-rgb`    | `51, 51, 51` | `226, 232, 240` |
| `--color-text-invert` | `white()`    | `slate(900)`    |
| `--color-text-muted`  | `gray(600)`  | `slate(400)`    |
| `--color-bg`          | `white()`    | `slate(900)`    |
| `--color-surface`     | `gray(100)`  | `slate(800)`    |
| `--color-border`      | `gray(300)`  | `slate(600)`    |
| `--color-bg-soft`     | `gray(50)`   | `slate(800)`    |
| `--color-bg-hover`    | `gray(200)`  | `slate(700)`    |

Les thèmes couvrent `prefers-color-scheme: dark` (OS), `[data-theme='light']` et `[data-theme='dark']` (override manuel).

**Verdict : ✅ ARCHITECTURE DARK-MODE OPÉRATIONNELLE**

L'ensemble des variables nécessaires à un `data-theme` switch sont exposées et correctement duales. Il n'y a pas de variable "manquante" bloquante.

**Note architecturale** : `$text-color-tokens` et `$surface-color-tokens` dans `_tokens.scss` sont des SCSS maps statiques utilisées pour générer les thèmes. Les CSS vars runtime (`--color-text`, etc.) vivent dans les thèmes. Cette séparation est correcte.

---

## 5. Double Définition `$size-tokens`

### 5.1 Constat

Le fichier contient **deux blocs complets** `$size-tokens: (...)` :

|                  | Première définition  | Deuxième définition          |
| ---------------- | -------------------- | ---------------------------- |
| **Ligne début**  | ~737                 | ~1368                        |
| **Ligne fin**    | ~959                 | ~1474                        |
| **Modificateur** | _(aucun)_            | `!default`                   |
| **Unités**       | rem (0.25rem, 3rem…) | px (44px, 64px…) + rem mixte |
| **Statut SASS**  | **Active — gagne**   | **Ignorée silencieusement**  |

**Pourquoi la première gagne** : En SASS, `!default` signifie "assigner seulement si la variable n'est pas encore définie". La première définition (sans `!default`) est évaluée en premier et verrouille `$size-tokens`. La seconde est donc un no-op complet.

### 5.2 Clés uniques à chaque définition

**Clés de la 1ère définition (active), absentes de la 2ème :**

| Clé                      | Valeur        | Usage dans `src/`          |
| ------------------------ | ------------- | -------------------------- |
| `'touch-target-optimal'` | 3rem (48px)   | Utilisé (ThemeToggle.scss) |
| `'touch-target-large'`   | 4rem (64px)   | À vérifier                 |
| `'nav-height-mobile'`    | 3.5rem (56px) | À vérifier                 |
| `'nav-height-desktop'`   | 4rem (64px)   | À vérifier                 |
| `'input-height-sm'`      | 2rem (32px)   | À vérifier                 |

**Clés de la 2ème définition (morte), absentes de la 1ère :**

| Clé                      | Valeur | Usage possible              |
| ------------------------ | ------ | --------------------------- |
| `'icon-2xl'`             | 40px   | **0 usages** (inaccessible) |
| `'input-height-base'`    | 44px   | **0 usages** (inaccessible) |
| `'navbar-height'`        | 64px   | **0 usages** (inaccessible) |
| `'navbar-height-mobile'` | 56px   | **0 usages** (inaccessible) |
| `'modal-min-height'`     | 200px  | **0 usages** (inaccessible) |

**Verdict : ⚠️ PROBLÈME STRUCTUREL MAJEUR**

La deuxième définition (~106 lignes) est 100% morte. Elle contient des tokens sémantiques pertinents (`'navbar-height'`, `'icon-2xl'`, `'input-height-base'`) qui ne sont jamais accessibles car écrasés par la première définition. Le risque est qu'un développeur ajoute `size('navbar-height')` en croyant que ça fonctionne, sans erreur SASS (la clé n'existe pas dans la map active → erreur uniquement si la fonction `size()` valide les clés).

---

## 6. `$admin-ui-color-tokens` — Usage

### 6.1 Fichiers référençant ce token

| Fichier                             | Rôle                              |
| ----------------------------------- | --------------------------------- |
| `src/styles/abstracts/_tokens.scss` | Définition (lignes 457–489)       |
| `src/styles/abstracts/_colors.scss` | Fonction wrapper `admin-ui($key)` |

### 6.2 Usage dans les composants

| Fonction                                                | Usages dans `src/components/**` et `src/page-components/**` |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| `admin-ui(...)`                                         | **0 fichiers**                                              |
| Accès direct via `map.get($admin-ui-color-tokens, ...)` | **0 fichiers**                                              |

**Contenu du token (jamais utilisé) :**

```
primary: #007bff      primary-hover: #0056b3
secondary: #6c757d    secondary-hover: #545b62
success: #28a745      success-hover: #1e7e34
danger: #dc3545       danger-hover: #c82333
info: #2563eb
info-light, item-bg, item-alt, success-bg, success-border, danger-bg, danger-border
```

**Verdict : ⚠️ TOKEN ORPHELIN** — Le map et sa fonction wrapper existent mais ne sont appelés nulle part dans l'application. Ces couleurs semblent prévues pour une interface admin style Bootstrap qui n'a pas encore été activée.

---

## Tableau de synthèse

| #   | Élément                                           | Sévérité   | Statut        | Résumé                                                                                                      |
| --- | ------------------------------------------------- | ---------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Doublons `$spacing-tokens` sémantiques/numériques | Basse      | ✅ Sain       | Intentionnel (migration Phase 6). Alias numériques en cours d'extinction.                                   |
| 2   | Doublons `$radius-tokens` alias vs `rounded-Npx`  | Basse      | ⚠️ Ambigu     | Redondance non nécessaire mais sans impact fonctionnel.                                                     |
| 3   | Deprecated `$font-size-tokens`                    | Très basse | ✅ Safe       | 0 usage dans le codebase. Dead code supprimable.                                                            |
| 4   | Conflits couleur "primary" (3 sources)            | Moyenne    | ⚠️ Confusion  | `$primary-color-tokens` et `admin-ui.primary` orphelins. Vraie primary = `--color-primary` dans les thèmes. |
| 5   | Dark-mode readiness                               | N/A        | ✅ Excellent  | Architecture `data-theme` complète dans les thèmes light/dark.                                              |
| 6   | Double définition `$size-tokens`                  | **Haute**  | ⚠️ Structurel | 2ème définition (~106 lignes) 100% morte et inaccessible silencieusement.                                   |
| 7   | `$admin-ui-color-tokens`                          | Moyenne    | ⚠️ Orphelin   | Map + fonction wrapper définis, 0 usage dans les composants.                                                |

---

_Rapport généré en mode read-only. Aucune modification de code effectuée._
