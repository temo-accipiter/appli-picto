# Audit final — Conformité `direction-visuelle-v1.1.md`

**Date** : 2026-04-25
**Auditeur** : Claude Code (deep-code-analysis)
**Périmètre** : 113 fichiers `.scss` dans `src/`
**Statut** : ❌ DETTE TECHNIQUE RÉSIDUELLE DÉTECTÉE

---

## Verdict global

La codebase **N'EST PAS** 100% conforme au contrat v1.1. Des résidus de dette technique ont été identifiés dans **4 catégories**, principalement dans les `page-components/` et l'infrastructure `abstracts/`.

| Catégorie                         | Fichiers touchés     | Occurrences | Sévérité     |
| --------------------------------- | -------------------- | ----------- | ------------ |
| Radius primitifs (`sm/md/lg/xl`)  | 13 pages + 4 infra   | ~55         | 🔴 CRITIQUE  |
| Ombres sur états statiques        | 7 fichiers           | ~8          | 🟠 IMPORTANT |
| Anciens mixins de focus           | 2 composants + infra | ~15         | 🟡 DETTE     |
| Spacing numériques (`'1'`–`'20'`) | 18 fichiers          | ~60         | 🔴 CRITIQUE  |

---

## Catégorie 1 — Radius primitifs interdits

**Règle violée** : §D.5 — _"Jamais utiliser les clés primitives (`md`, `lg`, `xl`) ni les clés legacy"_

**Tokens autorisés** : `radius('button')`, `radius('card')`, `radius('modal')`, `radius('input')`, `radius('badge')`, `radius('avatar')`, `radius('subtle')`, `radius('small')`, `radius('medium')`, `radius('large')`, `radius('xlarge')`, `radius('full')`

### Page-components

| Fichier                                                     | Ligne              | Violation                                            |
| ----------------------------------------------------------- | ------------------ | ---------------------------------------------------- |
| `src/page-components/edition/Edition.scss`                  | 44                 | `radius('sm')`                                       |
| `src/page-components/edition/Edition.scss`                  | 138                | `radius('md')`                                       |
| `src/page-components/login/Login.scss`                      | 50, 60, 136, 203   | `radius('md')`                                       |
| `src/page-components/login/Login.scss`                      | 104                | `radius('lg')`                                       |
| `src/page-components/legal/rgpd/PortailRGPD.scss`           | 55                 | `radius('lg')`                                       |
| `src/page-components/legal/rgpd/PortailRGPD.scss`           | 75                 | `radius('md')`                                       |
| `src/page-components/admin/logs/Logs.scss`                  | 49, 89             | `radius('lg')`                                       |
| `src/page-components/admin/logs/Logs.scss`                  | 116, 237           | `radius('md')`                                       |
| `src/page-components/admin/logs/Logs.scss`                  | 153, 170           | `radius('sm')`                                       |
| `src/page-components/abonnement/Abonnement.scss`            | 48, 111, 158, 202  | `radius('lg')`                                       |
| `src/page-components/abonnement/Abonnement.scss`            | 147, 250, 261      | `radius('sm')`                                       |
| `src/page-components/abonnement/Abonnement.scss`            | 228                | `radius('md')`                                       |
| `src/page-components/admin/permissions/Permissions.scss`    | 31                 | `radius('lg')`                                       |
| `src/page-components/admin/permissions/Permissions.scss`    | 163                | `radius('md')`                                       |
| `src/page-components/edition-timeline/EditionTimeline.scss` | 13, 139            | `radius('lg')` ⚠️ commenté ✅ mais toujours primitif |
| `src/page-components/edition-timeline/EditionTimeline.scss` | 72                 | `radius('md')`                                       |
| `src/page-components/edition-timeline/EditionTimeline.scss` | 193                | `radius('sm')`                                       |
| `src/page-components/admin/metrics/Metrics.scss`            | 24, 86             | `radius('lg')`                                       |
| `src/page-components/admin/metrics/Metrics.scss`            | 53, 109            | `radius('md')`                                       |
| `src/page-components/admin/metrics/Metrics.scss`            | 200, 214           | `radius('sm')`                                       |
| `src/page-components/reset-password/ResetPassword.scss`     | 28                 | `radius('lg')`                                       |
| `src/page-components/reset-password/ResetPassword.scss`     | 56, 67             | `radius('md')`                                       |
| `src/page-components/tableau/Tableau.scss`                  | 31                 | `radius('md')`                                       |
| `src/page-components/tableau/Tableau.scss`                  | 218                | `radius('lg')`                                       |
| `src/page-components/profil/Profil.scss`                    | 269, 348, 387, 594 | `radius('md')`                                       |
| `src/page-components/profil/Profil.scss`                    | 493                | `radius('lg')`                                       |
| `src/page-components/profil/Profil.scss`                    | 521, 534           | `radius('sm')`                                       |

### Infrastructure (dette systémique — traitement T2)

| Fichier                             | Ligne                        | Note                                                                                             |
| ----------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/styles/base/_helpers.scss`     | 51                           | `radius('sm')` dans classe utilitaire                                                            |
| `src/styles/abstracts/_forms.scss`  | 121, 123                     | `radius('sm')` et `radius('lg')` dans une `$map` du système de forms                             |
| `src/styles/abstracts/_mixins.scss` | 199, 267, 349, 367, 411, 469 | `radius('md')` / `radius('lg')` / `radius('sm')` dans corps de mixins                            |
| `src/styles/abstracts/_radius.scss` | 139–142                      | `radius('sm/md/lg/xl')` dans définitions CSS vars — pont architectural, acceptable mais dette T2 |

> ⚠️ Note importante : les commentaires JSDoc dans certains fichiers (ex. `ModalCategory.scss:8`, `Checkbox.scss:15`) référencent `radius('sm')` comme "✅ Primitives Phase 6". Ce label est erroné — ces clés sont des **primitives interdites** par le contrat v1.1 §D.5. Il conviendrait de corriger ces annotations.

---

## Catégorie 2 — Ombres sur états statiques

**Règle violée** : §F.3 — _"Pour les composants atomiques Button, Input, Select, Textarea, Checkbox, Radio, Card statique, Badge, Tag, Avatar : **ne pas utiliser de `box-shadow`**"_

**Rappel** : §F.1 — "Bordure OU ombre, jamais les deux."

| Fichier                                                     | Ligne   | Violation                             | Contexte                                                                      |
| ----------------------------------------------------------- | ------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| `src/page-components/login/Login.scss`                      | 31      | `shadow('elevation-sm')`              | `.signup-page` — conteneur statique                                           |
| `src/page-components/legal/rgpd/PortailRGPD.scss`           | 56      | `shadow('elevation-sm')`              | `.rgpd-card` statique **+ bordure active** → double violation §F.1            |
| `src/page-components/edition-timeline/EditionTimeline.scss` | 14      | `shadow('elevation-lg')`              | `.edition-timeline` — conteneur de page statique (commenté ✅ à tort)         |
| `src/page-components/profil/Profil.scss`                    | 200     | `shadow('elevation-md')`              | `.subscription-badge--active` — badge atomique, état statique                 |
| `src/page-components/profil/Profil.scss`                    | 211     | `shadow('elevation-sm')`              | `.subscription-badge--inactive` — badge atomique, état statique               |
| `src/page-components/profil/Profil.scss`                    | 226     | `shadow('elevation-sm')`              | `.subscription-badge--loading` — badge atomique, état statique                |
| `src/page-components/profil/Profil.scss`                    | 494     | `shadow('elevation-md')`              | `.profil__container` legacy — statique (section `// LEGACY SUPPORT`)          |
| `src/page-components/tableau/Tableau.scss`                  | 219     | `shadow('elevation-sm')`              | `.recompense-final` — carte de récompense statique                            |
| `src/components/features/time-timer/TimeTimer.scss`         | 83      | `drop-shadow(shadow('elevation-xs'))` | `__circle` SVG — état statique                                                |
| `src/components/features/time-timer/TimeTimer.scss`         | 151–153 | `shadow('elevation-sm')`              | `__btn` — bouton atomique à l'état de repos (§F.3 interdit shadow sur Button) |

**Exceptions confirmées conformes** (hover/flottant documenté) :

- `UserMenu.scss:75`, `Toast.scss:36`, `FloatingPencil.scss:41` → flottants avec commentaire §F.3 ✅
- `AvatarProfil.scss:70,116,132,154` → tous en `:hover` ✅
- `ErrorBoundary.scss:106` → hover interactif documenté ✅
- `ChildProfileSelector.scss:87` → `:hover` ✅
- `TachesDnd.scss:101,168` → `:hover` et `.dragging` ✅
- `EditionTimeline.scss:73` → popover flottant ✅

---

## Catégorie 3 — Anciens mixins et tokens de focus

**Règle violée** : §F.5 — _"Focus clavier visible : `outline: 2px solid var(--color-primary)` / `outline-offset: 2px`"_ et _"Jamais `:focus { outline: none }`"_

### `@include focus-ring` (utilise `border-width('focus')` en interne)

| Fichier                                  | Ligne | Violation                                                                                |
| ---------------------------------------- | ----- | ---------------------------------------------------------------------------------------- |
| `src/components/ui/button/Button.scss`   | 54    | `@include focus-ring;`                                                                   |
| `src/page-components/profil/Profil.scss` | 425   | `@include focus-ring(semantic('error'), border-width('medium'), border-width('medium'))` |

### `border-width('focus')` dans l'infrastructure

| Fichier                               | Lignes                        | Note                                                  |
| ------------------------------------- | ----------------------------- | ----------------------------------------------------- |
| `src/styles/base/_accessibility.scss` | 23, 42, 49, 50, 260, 261, 312 | Usage actif dans le fichier de base a11y              |
| `src/styles/abstracts/_mixins.scss`   | 266, 288, 417, 513, 514       | Utilisé dans les corps de mixins (`focus-ring`, etc.) |

> `@include non-invasive-focus` n'apparaît que dans des **commentaires** (documentation) — pas de violation active.

### Bonus — `outline: none` sans `:focus-visible` correctement défini

Le motif le plus problématique est `SearchInput.scss:55-57` :

```scss
// VIOLATION DOUBLE — §F.5
&:focus {
  outline: none; // ← interdit
  box-shadow: shadow('elevation-sm'); // ← focus via box-shadow non conforme
}
// Aucun bloc :focus-visible compensatoire
```

Autres fichiers avec `outline: none` à auditer manuellement pour vérifier la présence d'un `:focus-visible` compensatoire : `Login.scss:138`, `Edition.scss:95`, `Metrics.scss:59`, `Modal.scss:95`, `Select.scss:90,238`, `Input.scss:66`, `ButtonDelete.scss:49`, `FloatingPencil.scss:56`.

---

## Catégorie 4 — Spacing numériques interdits

**Règle violée** : §E.7 — _"Jamais de valeurs spacing hardcodées ni de clés primitives (`'1'` à `'20'`) dans les composants. Toujours utiliser les aliases sémantiques."_

**Tokens autorisés** : `spacing('card-padding')`, `spacing('button-padding-x')`, `spacing('button-padding-y')`, `spacing('modal-padding')`, `spacing('nav-padding')`, `spacing('nav-gap')`, `spacing('container-padding')`, `spacing('section-gap')`, `spacing('grid-gap')`, `spacing('heading-gap')`, `spacing('input-padding')` — et les primitives sémantiques `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'` pour cas non-couverts (avec justification).

### Page-components

| Fichier                                                  | Lignes                  | Tokens utilisés                                                                    |
| -------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| `src/page-components/admin/logs/Logs.scss`               | 329                     | `spacing('20')`                                                                    |
| `src/page-components/admin/permissions/Permissions.scss` | 91, 109                 | `spacing('2')`                                                                     |
| `src/page-components/admin/metrics/Metrics.scss`         | 165, 212                | `spacing('2')`                                                                     |
| `src/page-components/edition/Edition.scss`               | 135, 148                | `spacing('12')`, `spacing('3')`                                                    |
| `src/page-components/profil/Profil.scss`                 | 189, 417                | `spacing('2')` (dans `transform: translateY`)                                      |
| `src/page-components/login/Login.scss`                   | 148, 149, 153, 193, 236 | `spacing('20')`, `spacing('2')`                                                    |
| `src/page-components/abonnement/Abonnement.scss`         | 392                     | `spacing('20')`                                                                    |
| `src/page-components/legal/rgpd/PortailRGPD.scss`        | 27, 30, 34, 47, 65, 74  | `spacing('20')`, `spacing('10')`, `spacing('6')`, `spacing('14')`, `spacing('12')` |

### Composants

| Fichier                                                                       | Lignes             | Tokens utilisés                                  |
| ----------------------------------------------------------------------------- | ------------------ | ------------------------------------------------ |
| `src/components/shared/modal/modal-personalization/PersonalizationModal.scss` | 138, 141           | `spacing('10')`, `spacing('6')`                  |
| `src/components/shared/modal/create-bank-card-modal/CreateBankCardModal.scss` | 150                | `spacing('2')`                                   |
| `src/components/shared/error-boundary/ErrorBoundary.scss`                     | 120                | `spacing('2')`                                   |
| `src/components/features/settings/DeleteAccountGuard.scss`                    | 38, 64, 83         | `spacing('2')`                                   |
| `src/components/features/legal/legal-markdown/LegalMarkdown.scss`             | 19, 47, 55, 79, 85 | `spacing('20')`, `spacing('12')`, `spacing('6')` |
| `src/components/layout/user-menu/UserMenu.scss`                               | 244, 245, 247      | `spacing('1')`                                   |
| `src/components/features/taches/train-progress-bar/TrainProgressBar.scss`     | 76, 108, 109       | `spacing('14')`, `spacing('20')`                 |
| `src/components/features/consent/CookiePreferences.scss`                      | 90, 96, 113, 114   | `spacing('12')`, `spacing('20')`                 |
| `src/components/features/consent/CookieBanner.scss`                           | 39, 71             | `spacing('20')`, `spacing('12')`                 |
| `src/components/ui/password-checklist/PasswordChecklist.scss`                 | 203                | `spacing('2')`                                   |
| `src/components/ui/input/Input.scss`                                          | 140                | `spacing('12')`                                  |
| `src/components/ui/toggle/Toggle.scss`                                        | 73, 74, 85         | `spacing('2')`, `spacing('20')`                  |
| `src/components/ui/button/Button.scss`                                        | 152                | `spacing('6')`                                   |

### Infrastructure (dette systémique — traitement T2)

| Fichier                               | Lignes           | Note                                                    |
| ------------------------------------- | ---------------- | ------------------------------------------------------- |
| `src/styles/base/_helpers.scss`       | 43, 62, 83       | `spacing('3')`, `spacing('2')` dans classes utilitaires |
| `src/styles/base/_accessibility.scss` | 310, 316         | `spacing('12')` — base a11y                             |
| `src/styles/abstracts/_mixins.scss`   | 90, 91, 532, 533 | `spacing('2')`, `spacing('6')` — corps de mixins        |
| `src/styles/abstracts/_spacing.scss`  | 103–107          | CSS vars `--spacing-4/8/12/16/20` — pont architectural  |
| `src/styles/abstracts/_forms.scss`    | 74               | `spacing('20')` dans map de hauteurs de forms           |

> ⚠️ Cas ambigus `spacing('2')` : ce token (2px) n'a pas d'équivalent sémantique dans les aliases Phase 6. Il est souvent utilisé pour des `transform: translateY` micro-animations ou des `outline-offset`. Selon §E.7, il pourrait être justifié comme "cas exotique non couvert" — mais chaque occurrence doit être documentée.

---

## Synthèse par fichier le plus critique

| Rang | Fichier                                                     | Nb violations | Catégories                        |
| ---- | ----------------------------------------------------------- | ------------- | --------------------------------- |
| 1    | `src/page-components/profil/Profil.scss`                    | ~15           | Radius + Shadow + Focus + Spacing |
| 2    | `src/page-components/abonnement/Abonnement.scss`            | ~10           | Radius + Spacing                  |
| 3    | `src/page-components/admin/logs/Logs.scss`                  | ~8            | Radius + Spacing                  |
| 4    | `src/page-components/admin/metrics/Metrics.scss`            | ~10           | Radius + Spacing                  |
| 5    | `src/page-components/legal/rgpd/PortailRGPD.scss`           | ~10           | Radius + Shadow (F.1!) + Spacing  |
| 6    | `src/page-components/login/Login.scss`                      | ~10           | Radius + Shadow + Spacing         |
| 7    | `src/components/features/time-timer/TimeTimer.scss`         | ~8            | Shadow statique + Focus           |
| 8    | `src/page-components/edition-timeline/EditionTimeline.scss` | ~6            | Radius + Shadow                   |

---

## Plan de remédiation suggéré

### Phase immédiate (avant refactor composants atomiques)

1. **Radius** : Systématiser le remplacement dans les page-components selon la table §D.3/D.4 :
   - `radius('sm')` → `radius('subtle')` (4px) pour tooltips, badges
   - `radius('md')` → `radius('card')` (12px) pour cards / `radius('input')` (6px) pour inputs
   - `radius('lg')` → `radius('card')` (12px) ou `radius('large')` (20px) selon composant

2. **Shadows statiques** : Supprimer les `box-shadow` sur états statiques dans `Login.scss`, `PortailRGPD.scss`, `Profil.scss` (badges), `Tableau.scss` (recompense-final). Remplacer par `border: border-width('thin') solid surface('border')` si délimitation nécessaire.

3. **Spacing numériques** : Cas par cas selon table §E.2. `spacing('20')` (20px) n'a pas d'alias direct — à vérifier si `spacing('nav-padding')` (16px) ou une valeur intermédiaire justifiée convient.

### Phase T2 (dette infrastructure)

- Migrer `_mixins.scss` pour utiliser les aliases sémantiques radius et spacing
- Migrer `_forms.scss` et `_helpers.scss`
- Résoudre `border-width('focus')` dans `_accessibility.scss` → `outline: 2px solid var(--color-primary)`

---

_Audit effectué le 2026-04-25. Référence : `direction-visuelle-v1.1.md` (contrat figé 2026-04-18)._
