# Audit T1-C — Variables CSS --color-\* (pré-correction)

**Date** : 2026-04-18
**Branche** : `refactor/db-first-init`
**Objectif** : Cartographier l'écart entre `_light.scss` / `_dark.scss` actuels et la palette prescrite dans `direction-visuelle-v1.1.md §B`, estimer le risque par famille, et définir un ordre de traitement sûr pour T1-C.

---

## Méthode

- Lecture directe des fichiers `_light.scss`, `_dark.scss`, `_tokens.scss`
- Référence : `direction-visuelle-v1.1.md §B.2 et §B.3`
- Grep `var(--color-*)` sur `src/**/*.scss` et `src/**/*.tsx`
- Aucune modification de code

---

## Partie 1 — État actuel : variables définies dans \_light.scss

### 1.1 — Tableau complet des valeurs résolues

Les fonctions de palette (`blue()`, `green()`, etc.) sont résolues via `_tokens.scss`.

| Variable CSS          | Token SCSS              | Hex résolu         |
| --------------------- | ----------------------- | ------------------ |
| `--color-primary`     | `blue(600)`             | `#2563eb`          |
| `--color-secondary`   | `red(500)`              | `#ef4444`          |
| `--color-accent`      | `orange(500)`           | `#f97316`          |
| `--color-text`        | `gray(900)`             | `#3b3b3b`          |
| `--color-text-rgb`    | `51, 51, 51` (hardcodé) | `rgb(51,51,51)` ⚠️ |
| `--color-text-invert` | `white()`               | `#ffffff`          |
| `--color-text-muted`  | `gray(600)`             | `#7e7e7e`          |
| `--color-bg`          | `white()`               | `#ffffff`          |
| `--color-surface`     | `gray(100)`             | `#f7f7f7`          |
| `--color-border`      | `gray(300)`             | `#cfcfcf`          |
| `--color-bg-soft`     | `gray(50)`              | `#fafafa`          |
| `--color-bg-hover`    | `gray(200)`             | `#e1e1e1`          |
| `--color-success`     | `green(500)`            | `#22c55e`          |
| `--color-warning`     | `orange(500)`           | `#f97316`          |
| `--color-error`       | `red(500)`              | `#ef4444`          |
| `--color-info`        | `blue(500)`             | `#3b82f6`          |
| `--c-scroll-thumb`    | `gray(400)`             | `#b1b1b1`          |
| `--c-scroll-track`    | `gray(100)`             | `#f7f7f7`          |
| `--focus-ring-color`  | `blue(600)`             | `#2563eb`          |

> ⚠️ `--color-text-rgb` est hardcodé à `51, 51, 51` (#333333) alors que `gray(900)` = `#3b3b3b` (59,59,59). Incohérence interne légère.

### 1.2 — Variables hors-spec détectées dans Toggle.scss

`Toggle.scss` utilise `var(--color-surface-secondary)` et `var(--color-border-primary)` — ces variables ne sont **définies nulle part** dans le projet (ni \_light.scss, ni \_dark.scss, ni aucun autre fichier). Elles sont silencieusement vides. **Bug préexistant, hors scope T1-C, à documenter.**

---

## Partie 2 — Comparaison prescrit vs actuel

### 2.1 — Famille PRIMARY

| Variable                 | Light actuel | Light prescrit | Statut      | Dark actuel             | Dark prescrit    | Statut dark |
| ------------------------ | ------------ | -------------- | ----------- | ----------------------- | ---------------- | ----------- |
| `--color-primary`        | `#2563eb`    | `#0077c2`      | ❌ DIVERGE  | `blue(400)` = `#60a5fa` | `#4DABF7`        | ❌ DIVERGE  |
| `--color-primary-hover`  | _(absent)_   | `#005a94`      | ❌ MANQUANT | _(absent)_              | _(non spécifié)_ | —           |
| `--color-primary-subtle` | _(absent)_   | `#e6f2fa`      | ❌ MANQUANT | _(absent)_              | _(non spécifié)_ | —           |

> ⚠️ `#4DABF7` (dark prescrit) **n'existe pas dans notre palette de tokens**. Valeur intermédiaire entre `blue(300)`=`#93c5fd` et `blue(400)`=`#60a5fa`. Nécessitera soit une valeur hardcodée (déroge à tokens-first), soit l'ajout d'un token, soit une valeur approchée.

### 2.2 — Famille SUCCESS

| Variable                 | Light actuel             | Light prescrit | Statut      | Dark actuel              | Dark prescrit    | Statut dark |
| ------------------------ | ------------------------ | -------------- | ----------- | ------------------------ | ---------------- | ----------- |
| `--color-success`        | `green(500)` = `#22c55e` | `#16a34a`      | ❌ DIVERGE  | `green(400)` = `#4ade80` | `#4ADE80`        | ✅ ALIGNÉ   |
| `--color-success-hover`  | _(absent)_               | `#14803d`      | ❌ MANQUANT | _(absent)_               | _(non spécifié)_ | —           |
| `--color-success-subtle` | _(absent)_               | `#dcfce7`      | ❌ MANQUANT | _(absent)_               | _(non spécifié)_ | —           |

> 💡 `#16a34a` = `green(600)` dans notre palette — token existant disponible !
> 💡 `#14803d` ≈ `green(700)` = `#15803d` dans notre palette — quasi-exact (1 digit).
> 💡 `#dcfce7` = `green(100)` dans notre palette — token existant disponible !

### 2.3 — Famille WARNING

| Variable                 | Light actuel              | Light prescrit | Statut      | Dark actuel               | Dark prescrit    | Statut dark |
| ------------------------ | ------------------------- | -------------- | ----------- | ------------------------- | ---------------- | ----------- |
| `--color-warning`        | `orange(500)` = `#f97316` | `#f59e0b`      | ❌ DIVERGE  | `orange(400)` = `#fb923c` | `#FBBF24`        | ❌ DIVERGE  |
| `--color-warning-hover`  | _(absent)_                | `#d97706`      | ❌ MANQUANT | _(absent)_                | _(non spécifié)_ | —           |
| `--color-warning-subtle` | _(absent)_                | `#fef3c7`      | ❌ MANQUANT | _(absent)_                | _(non spécifié)_ | —           |

> 💡 `#f59e0b` = `yellow(500)` = `#eab308` — NON, vérification : yellow(500)=`#eab308`, yellow(400)=`#facc15`. La valeur prescrite `#f59e0b` est entre yellow(400) et yellow(500). **Aucun token exact dans notre palette.** Valeur hardcodée ou alias personnalisé.
> 💡 `#d97706` = `yellow(600)` = `#ca8a04` — DIFFÉRENT. Aucun token exact.
> 💡 `#fef3c7` = `yellow(100)` = `#fef9c3` — PROCHE mais différent (1 niveaux).
> ⚠️ Dark prescrit `#FBBF24` = `yellow(400)` = `#facc15` — DIFFÉRENT (jaune vs orange actuel).

### 2.4 — Famille DANGER (renommage de `--color-error`)

| Variable                | Light actuel           | Light prescrit                | Statut      | Dark actuel            | Dark prescrit                 | Statut dark |
| ----------------------- | ---------------------- | ----------------------------- | ----------- | ---------------------- | ----------------------------- | ----------- |
| `--color-error`         | `red(500)` = `#ef4444` | _(supprimé — renommé danger)_ | ❌ RENOMMER | `red(400)` = `#f87171` | _(supprimé — renommé danger)_ | ❌ RENOMMER |
| `--color-danger`        | _(absent)_             | `#dc2626`                     | ❌ MANQUANT | _(absent)_             | `#F87171`                     | ❌ MANQUANT |
| `--color-danger-hover`  | _(absent)_             | `#b91c1c`                     | ❌ MANQUANT | _(absent)_             | _(non spécifié)_              | —           |
| `--color-danger-subtle` | _(absent)_             | `#fee2e2`                     | ❌ MANQUANT | _(absent)_             | _(non spécifié)_              | —           |

> 💡 `#dc2626` = `red(600)` dans notre palette — token existant disponible !
> 💡 `#b91c1c` = `red(700)` dans notre palette — token existant disponible !
> 💡 `#fee2e2` = `red(100)` dans notre palette — token existant disponible !
> 💡 Dark `#F87171` = `red(400)` = notre `--color-error` actuel dark — valeur identique, seul le nom change.
> ⚠️ **Impact critique** : `--color-error` est actuellement utilisé dans `_accessibility.scss` (2 endroits). Ce renommage doit être coordonné avec la mise à jour des usages.

### 2.5 — Famille INFO

| Variable              | Light actuel            | Light prescrit | Statut      | Dark actuel             | Dark prescrit    | Statut dark |
| --------------------- | ----------------------- | -------------- | ----------- | ----------------------- | ---------------- | ----------- |
| `--color-info`        | `blue(500)` = `#3b82f6` | `#3b82f6`      | ✅ ALIGNÉ   | `blue(400)` = `#60a5fa` | `#60A5FA`        | ✅ ALIGNÉ   |
| `--color-info-hover`  | _(absent)_              | `#2563eb`      | ❌ MANQUANT | _(absent)_              | _(non spécifié)_ | —           |
| `--color-info-subtle` | _(absent)_              | `#dbeafe`      | ❌ MANQUANT | _(absent)_              | _(non spécifié)_ | —           |

> 💡 `#2563eb` = `blue(600)` dans notre palette — token existant disponible !
> 💡 `#dbeafe` = `blue(100)` dans notre palette — token existant disponible !
> ✅ Info est la famille la **plus simple** à traiter : seuls les variants hover/subtle sont à ajouter.

### 2.6 — Famille ACCENT

| Variable                | Light actuel              | Light prescrit | Statut      | Dark actuel               | Dark prescrit    | Statut dark |
| ----------------------- | ------------------------- | -------------- | ----------- | ------------------------- | ---------------- | ----------- |
| `--color-accent`        | `orange(500)` = `#f97316` | `#ffb400`      | ❌ DIVERGE  | `yellow(400)` = `#facc15` | `#FCD34D`        | ❌ DIVERGE  |
| `--color-accent-hover`  | _(absent)_                | `#d97706`      | ❌ MANQUANT | _(absent)_                | _(non spécifié)_ | —           |
| `--color-accent-subtle` | _(absent)_                | `#fef3c7`      | ❌ MANQUANT | _(absent)_                | _(non spécifié)_ | —           |

> ⚠️ `#ffb400` **n'est pas dans notre palette de tokens** (entre yellow(400)=`#facc15` et orange(400)=`#fb923c`). Valeur hardcodée requise.
> ⚠️ `#FCD34D` (dark) — entre yellow(300)=`#fde047` et yellow(400)=`#facc15`. **Aucun token exact.**
> ⚠️ `#d97706` = `yellow(600)` = `#ca8a04` dans notre palette — DIFFÉRENT. Aucun token exact.
> 💡 `#fef3c7` = `yellow(100)` = `#fef9c3` — PROCHE mais légèrement différent.

### 2.7 — Famille NEUTRAL (texte, surfaces, bordures)

| Variable             | Light actuel            | Light prescrit             | Statut                | Dark actuel              | Dark prescrit    | Statut dark |
| -------------------- | ----------------------- | -------------------------- | --------------------- | ------------------------ | ---------------- | ----------- |
| `--color-text`       | `gray(900)` = `#3b3b3b` | `#334155` (= `slate(700)`) | ❌ DIVERGE            | `slate(200)` = `#e2e8f0` | `#E2E8F0`        | ✅ ALIGNÉ   |
| `--color-text-muted` | `gray(600)` = `#7e7e7e` | `#64748b` (= `slate(500)`) | ❌ DIVERGE            | `slate(400)` = `#94a3b8` | _(non spécifié)_ | —           |
| `--color-bg`         | `white()` = `#ffffff`   | `#ffffff`                  | ✅ ALIGNÉ             | `slate(900)` = `#0f172a` | _(non spécifié)_ | —           |
| `--color-surface`    | `gray(100)` = `#f7f7f7` | `#f8fafc` (= `slate(50)`)  | ❌ DIVERGE (5px diff) | `slate(800)` = `#1e293b` | _(non spécifié)_ | —           |
| `--color-border`     | `gray(300)` = `#cfcfcf` | `#e2e8f0` (= `slate(200)`) | ❌ DIVERGE            | `slate(600)` = `#475569` | _(non spécifié)_ | —           |

> 💡 Toutes les valeurs prescrites `--color-text`, `--color-surface`, `--color-border` existent dans notre palette via `slate()` — tokens disponibles !
> ⚠️ Ce changement implique de **migrer gray → slate** pour les neutres. Changement visible sur toutes les surfaces.
> ⚠️ `--color-bg-soft` et `--color-bg-hover` ne sont pas spécifiés dans B.3 — à maintenir en-état ou à recalculer sur `slate`.
> ⚠️ `--color-secondary` n'existe pas dans B.3 — non prescrit. Décision : maintenir en l'état ou supprimer ?

---

## Partie 3 — Usages dans les composants

### 3.1 — Comptage par famille dans src/\*_/_.scss

| Famille                    | Fichiers concernés                                                           | Nb fichiers réels | Type                 |
| -------------------------- | ---------------------------------------------------------------------------- | ----------------- | -------------------- |
| `var(--color-primary)`     | Toggle.scss, \_accessibility.scss, \_mixins.scss (défaut param), \_dark.scss | 4                 | Composant + système  |
| `var(--color-error)`       | \_accessibility.scss                                                         | 1                 | Système a11y         |
| `var(--color-success)`     | _(aucun)_                                                                    | 0                 | —                    |
| `var(--color-warning)`     | _(aucun)_                                                                    | 0                 | —                    |
| `var(--color-danger)`      | _(aucun)_                                                                    | 0                 | —                    |
| `var(--color-info)`        | _(aucun)_                                                                    | 0                 | —                    |
| `var(--color-accent)`      | _(aucun)_                                                                    | 0                 | —                    |
| `var(--color-text)`        | \_accessibility.scss, \_mixins.scss, \_forms.scss, \_dark.scss               | 4                 | Système + composants |
| `var(--color-bg)`          | \_accessibility.scss, \_mixins.scss, \_dark.scss, \_light.scss               | 4                 | Système              |
| `var(--color-surface)`     | \_accessibility.scss, \_mixins.scss, Toggle.scss, \_dark.scss                | 4                 | Composant + système  |
| `var(--color-border)`      | \_accessibility.scss, \_mixins.scss, \_forms.scss, \_dark.scss               | 4                 | Système + composants |
| `var(--color-text-invert)` | \_accessibility.scss                                                         | 1                 | Système a11y         |
| `var(--color-bg-soft)`     | \_mixins.scss                                                                | 1                 | Système              |
| `var(--color-bg-hover)`    | \_mixins.scss                                                                | 1                 | Système              |

### 3.2 — Patterns exotiques

| Pattern                           | Résultat       | Note                      |
| --------------------------------- | -------------- | ------------------------- |
| `rgba(var(--color-*`              | **0 fichiers** | Pas de calcul RGB runtime |
| `var(--color-*` dans `.tsx`/`.ts` | **0 fichiers** | CSS vars JS-side absentes |

> ✅ Aucune complication de type "canaux RGB séparés" (pattern `--color-*-rgb`).

### 3.3 — Top fichiers impactés (toutes familles confondues)

| Fichier                                | Variables utilisées                                            | Impact T1-C                      |
| -------------------------------------- | -------------------------------------------------------------- | -------------------------------- |
| `src/styles/base/_accessibility.scss`  | primary, error, text, text-invert, bg, surface, border         | ⚠️ Renommage error→danger requis |
| `src/styles/abstracts/_mixins.scss`    | primary (défaut), text, bg, surface, bg-soft, bg-hover, border | Indirect (défauts)               |
| `src/styles/abstracts/_forms.scss`     | text, border                                                   | Surfaces de formulaires          |
| `src/components/ui/toggle/Toggle.scss` | primary, surface (+ 2 vars inconnues)                          | Focus ring visible               |
| `src/styles/themes/_dark.scss`         | primary, text, bg, surface, border (contextuels)               | Redéfinitions                    |

---

## Partie 4 — Estimation de risque par famille

| Famille                             | Usages composants   | Visibilité                     | Risque    | Raison                                                              |
| ----------------------------------- | ------------------- | ------------------------------ | --------- | ------------------------------------------------------------------- |
| **INFO** (ajout hover/subtle)       | 0                   | —                              | 🟢 FAIBLE | Pure addition, 0 régression                                         |
| **SUCCESS** (valeur + hover/subtle) | 0                   | Cartes validées Tableau        | 🟢 FAIBLE | Aucun usage dans composants actuels                                 |
| **WARNING** (valeur + hover/subtle) | 0                   | Alertes                        | 🟢 FAIBLE | Aucun usage, mais valeur prescrite absente palette                  |
| **ACCENT** (valeur + hover/subtle)  | 0                   | Train, célébrations            | 🟢 FAIBLE | Aucun usage direct, mais valeur prescrite absente palette           |
| **DANGER** (renommer error)         | 2 (error dans a11y) | Messages erreur                | 🟡 MODÉRÉ | Renommage coordonné requis                                          |
| **PRIMARY** (valeur)                | 4 fichiers          | CTA, focus ring, Toggle, liens | 🔴 ÉLEVÉ  | Changement visible : bleu vif (#2563eb → #0077c2 plus sombre)       |
| **NEUTRAL** (text, surface, border) | 8+ fichiers         | Texte, fonds, séparateurs      | 🔴 ÉLEVÉ  | Migration gray→slate : changement de teinte sur toutes les surfaces |

---

## Partie 5 — Ordre de traitement recommandé

Principe : **du moins risqué au plus risqué**, pour que chaque étape soit validable visuellement avant d'attaquer la suivante.

```
T1-C.1 — INFO (ajout hover/subtle uniquement)
  → Risque : 0. Pure addition de vars manquantes. Pas de changement de valeur existante.

T1-C.2 — SUCCESS (valeur base + hover/subtle)
  → Risque : faible. 0 composant utilise --color-success. Tokens disponibles dans palette.

T1-C.3 — DANGER (renommage error + valeur + hover/subtle)
  → Risque : modéré. Coordonner : (a) créer --color-danger, (b) migrer _accessibility.scss,
    (c) supprimer --color-error. Toutes les valeurs disponibles dans palette.

T1-C.4 — WARNING (valeur base + hover/subtle)
  → Risque : faible côté usages (0 composant), modéré côté tokens (valeur prescrite absente
    de notre palette — hardcode ou ajout token).

T1-C.5 — ACCENT (valeur base + hover/subtle)
  → Risque : faible côté usages (0 composant), modéré côté tokens (idem warning).

T1-C.6 — NEUTRAL : text + text-muted + surface + border
  → Risque : élevé. Migration gray→slate visible sur toutes les surfaces (teinte).
    Valider visuellement sur mobile (Login, Profil) avant de committer.

T1-C.7 — PRIMARY (valeur base)
  → Risque : élevé. Changement le plus visible : #2563eb → #0077c2 (bleu cerclé plus sombre).
    Impact sur focus ring, Toggle, liens dark mode. Valider en dernier.
```

---

## Partie 6 — Points d'attention

### 6.1 — Valeurs prescrites absentes de notre palette tokens

Trois valeurs du doc v1.1 **ne correspondent à aucun token existant** dans `_tokens.scss` :

| Variable                  | Valeur prescrite | Tokens les plus proches                      | Action requise                           |
| ------------------------- | ---------------- | -------------------------------------------- | ---------------------------------------- |
| `--color-primary` (light) | `#0077c2`        | blue(600)=`#2563eb`, blue(700)=`#1d4ed8`     | Hardcode OU ajout token `blue(800)`-like |
| `--color-primary` (dark)  | `#4DABF7`        | blue(300)=`#93c5fd`, blue(400)=`#60a5fa`     | Hardcode OU ajout token                  |
| `--color-accent` (light)  | `#ffb400`        | yellow(400)=`#facc15`, orange(400)=`#fb923c` | Hardcode OU ajout token                  |
| `--color-accent` (dark)   | `#FCD34D`        | yellow(300)=`#fde047`, yellow(400)=`#facc15` | Hardcode OU ajout token                  |
| `--color-warning` (light) | `#f59e0b`        | yellow(400)=`#facc15`, yellow(500)=`#eab308` | Hardcode OU ajout token                  |
| `--color-warning-hover`   | `#d97706`        | yellow(600)=`#ca8a04`                        | Hardcode OU ajout token                  |

> **Décision à prendre avant T1-C.4, T1-C.5, T1-C.7** : tokens-first strict (ajout tokens) vs valeurs hardcodées documentées dans les vars CSS ?

### 6.2 — `--color-secondary` : variable orpheline

`--color-secondary` (`red(500)`) est définie dans `_light.scss` mais **ne figure pas dans B.3** et n'a **aucun usage** dans les composants. Elle est hors-spec. Décision possible : la supprimer en T1-C ou la laisser comme résidu.

### 6.3 — `--color-text-rgb` : incohérence interne

Valeur hardcodée `51, 51, 51` ≠ `gray(900)` = `#3b3b3b` = `59, 59, 59`. Si T1-C.6 migre `--color-text` vers `slate(700)` = `#334155` = `51, 65, 85`, la valeur RGB devra être mise à jour vers `51, 65, 85`.

### 6.4 — `--focus-ring-color` : dépendance sur primary

`--focus-ring-color` est actuellement `blue(600)` = `#2563eb`, identique à l'actuel `--color-primary`. Si T1-C.7 change `--color-primary` vers `#0077c2`, il faudra décider : aligner `--focus-ring-color` sur `--color-primary` (ou `var(--color-primary)` directement).

### 6.5 — Variables `--color-bg-soft` et `--color-bg-hover` : non prescrites

Ces deux variables ne figurent pas dans B.3 mais sont utilisées dans `_mixins.scss`. Elles doivent être maintenues et mises à jour en cohérence avec la migration gray→slate (T1-C.6).

---

## Partie 7 — Synthèse exécutive

| #      | Commit T1-C                           | Familles              | Fichiers modifiés                               | Risque | Prérequis                             |
| ------ | ------------------------------------- | --------------------- | ----------------------------------------------- | ------ | ------------------------------------- |
| T1-C.1 | Ajout hover/subtle INFO               | info                  | \_light.scss, \_dark.scss                       | 🟢     | Aucun                                 |
| T1-C.2 | Correction + hover/subtle SUCCESS     | success               | \_light.scss, \_dark.scss                       | 🟢     | Aucun                                 |
| T1-C.3 | Renommage error→danger + hover/subtle | danger                | \_light.scss, \_dark.scss, \_accessibility.scss | 🟡     | Grep usages error                     |
| T1-C.4 | Correction + hover/subtle WARNING     | warning               | \_light.scss, \_dark.scss                       | 🟡     | Décision tokens/hardcode              |
| T1-C.5 | Correction + hover/subtle ACCENT      | accent                | \_light.scss, \_dark.scss                       | 🟡     | Décision tokens/hardcode              |
| T1-C.6 | Migration NEUTRAL (gray→slate)        | text, surface, border | \_light.scss, \_dark.scss                       | 🔴     | Test visuel mobile                    |
| T1-C.7 | Correction PRIMARY                    | primary               | \_light.scss, \_dark.scss                       | 🔴     | Décision tokens/hardcode, T1-C.6 fait |

**Total : 7 commits atomiques** (ou regroupables selon décision).

**Bloqueur transverse** : la décision `tokens-first strict vs hardcode documenté` pour les 5 valeurs absentes de la palette. Cette décision conditionne T1-C.4, T1-C.5, T1-C.7.

**Fichiers hors-scope T1-C** : le bug `--color-surface-secondary` / `--color-border-primary` dans `Toggle.scss` (vars non définies) est préexistant et hors périmètre T1-C.

---

_Rapport généré le 2026-04-18 — lecture seule — aucune modification de code._
