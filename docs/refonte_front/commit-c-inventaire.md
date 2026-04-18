# Inventaire Commit C — Migration spacing numérique → sémantique

**Date** : 2026-04-18
**Périmètre** : Read-only — grep exhaustif sur `src/`
**Objectif** : Classifier chaque match avant migration

Légende :

- `[TO MIGRATE]` — usage SCSS actif (padding, margin, gap, etc.)
- `[SKIP - DOC]` — commentaire de doc (`//` ou `///`)
- `[SKIP - COMPAT]` — CSS var JavaScript (`--spacing-N: #{spacing('N')}`)
- `[SKIP - ABSTRACTS]` — usage interne fichier abstracts

---

## spacing('4') → spacing('xs') (0.25rem = 0.25rem ✓)

| Fichier:ligne                                                                             | Classification  | Contexte                                                  |
| ----------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------- |
| `src/styles/abstracts/_spacing.scss:103`                                                  | [SKIP - COMPAT] | `--spacing-4: #{spacing('4')};` — CSS var pour JavaScript |
| `src/styles/base/_accessibility.scss:24`                                                  | [TO MIGRATE]    | `box-shadow: 0 0 0 spacing('4') var(--focus-ring-color);` |
| `src/styles/base/_accessibility.scss:43`                                                  | [TO MIGRATE]    | `box-shadow: 0 0 0 spacing('4') var(--focus-ring-color);` |
| `src/styles/base/_accessibility.scss:151`                                                 | [TO MIGRATE]    | `text-underline-offset: spacing('4');`                    |
| `src/styles/base/_accessibility.scss:272`                                                 | [TO MIGRATE]    | `margin-bottom: spacing('4');`                            |
| `src/styles/base/_accessibility.scss:290`                                                 | [TO MIGRATE]    | `margin-top: spacing('4');`                               |
| `src/styles/base/_helpers.scss:12`                                                        | [TO MIGRATE]    | `padding-inline: spacing('4');`                           |
| `src/styles/base/_helpers.scss:52`                                                        | [TO MIGRATE]    | `box-shadow: 0 0 0 spacing('4')`                          |
| `src/styles/base/_helpers.scss:77`                                                        | [TO MIGRATE]    | `gap: spacing('4');`                                      |
| `src/components/ui/upload-progress/UploadProgress.scss:81`                                | [TO MIGRATE]    | `margin: 0 0 spacing('4') 0;`                             |
| `src/components/features/settings/DeleteAccountGuard.scss:47`                             | [TO MIGRATE]    | `margin: 0 0 spacing('4');`                               |
| `src/components/features/settings/DeleteAccountGuard.scss:54`                             | [TO MIGRATE]    | `margin: spacing('4') 0 0;`                               |
| `src/components/features/settings/DeleteAccountGuard.scss:71`                             | [TO MIGRATE]    | `margin-top: spacing('4');`                               |
| `src/components/features/profil/device-list/DeviceList.scss:25`                           | [TO MIGRATE]    | `padding: spacing('4');`                                  |
| `src/components/features/time-timer/FloatingTimeTimer.scss:90`                            | [TO MIGRATE]    | `gap: spacing('4');`                                      |
| `src/components/features/consent/CookiePreferences.scss:96`                               | [TO MIGRATE]    | `margin: 0 0 spacing('4') 0;`                             |
| `src/components/features/child-profile/child-profile-manager/ChildProfileManager.scss:9`  | [TO MIGRATE]    | `padding: spacing('4');`                                  |
| `src/components/features/child-profile/child-profile-manager/ChildProfileManager.scss:33` | [TO MIGRATE]    | `padding: spacing('3') spacing('4');`                     |
| `src/components/features/child-profile/ChildProfileSelector.scss:215`                     | [TO MIGRATE]    | `padding: spacing('2') spacing('4');`                     |
| `src/components/features/child-profile/ChildProfileSelector.scss:268`                     | [TO MIGRATE]    | `padding: spacing('3') spacing('4');`                     |
| `src/components/features/legal/legal-markdown/LegalMarkdown.scss:31`                      | [TO MIGRATE]    | `gap: spacing('4');`                                      |
| `src/components/shared/offline-banner/OfflineBanner.scss:21`                              | [TO MIGRATE]    | `padding: spacing('2') spacing('4');`                     |
| `src/components/shared/offline-banner/OfflineBanner.scss:42`                              | [TO MIGRATE]    | `padding: spacing('2') spacing('4');`                     |
| `src/components/shared/execution-only-banner/ExecutionOnlyBanner.scss:22`                 | [TO MIGRATE]    | `padding: spacing('2') spacing('4');`                     |
| `src/components/shared/execution-only-banner/ExecutionOnlyBanner.scss:43`                 | [TO MIGRATE]    | `padding: spacing('2') spacing('4');`                     |

**Bilan** : 24 matches — 23 [TO MIGRATE] + 1 [SKIP - COMPAT]

---

## spacing('8') → spacing('sm') (0.5rem = 0.5rem ✓)

| Fichier:ligne                                                                 | Classification  | Contexte                                                  |
| ----------------------------------------------------------------------------- | --------------- | --------------------------------------------------------- |
| `src/styles/abstracts/_spacing.scss:104`                                      | [SKIP - COMPAT] | `--spacing-8: #{spacing('8')};` — CSS var pour JavaScript |
| `src/components/ui/input/Input.scss:41`                                       | [TO MIGRATE]    | `padding: spacing('8');`                                  |
| `src/components/ui/select/Select.scss:57`                                     | [TO MIGRATE]    | `padding: spacing('8') spacing('sm');`                    |
| `src/components/features/taches/train-progress-bar/TrainProgressBar.scss:71`  | [TO MIGRATE]    | `stroke-width: spacing('8');`                             |
| `src/components/features/taches/train-progress-bar/TrainProgressBar.scss:130` | [TO MIGRATE]    | `transform: translateX(-50%) translateY(spacing('8'));`   |
| `src/components/features/cards/cards-edition/CardsEdition.scss:42`            | [TO MIGRATE]    | `gap: spacing('8');`                                      |
| `src/components/features/cards/cards-edition/CardsEdition.scss:177`           | [TO MIGRATE]    | `gap: spacing('8');`                                      |
| `src/components/features/consent/CookieBanner.scss:76`                        | [TO MIGRATE]    | `margin: 0 0 spacing('8') 0;`                             |
| `src/components/features/consent/CookiePreferences.scss:134`                  | [TO MIGRATE]    | `margin: 0 0 spacing('8') 0;`                             |
| `src/page-components/edition/Edition.scss:136`                                | [TO MIGRATE]    | `padding: spacing('8');`                                  |
| `src/page-components/edition/Edition.scss:145`                                | [TO MIGRATE]    | `gap: spacing('8');`                                      |
| `src/page-components/legal/rgpd/PortailRGPD.scss:61`                          | [TO MIGRATE]    | `margin: 0 0 spacing('8');`                               |
| `src/page-components/legal/rgpd/PortailRGPD.scss:74`                          | [TO MIGRATE]    | `padding: spacing('8') spacing('12');`                    |

**Bilan** : 13 matches — 12 [TO MIGRATE] + 1 [SKIP - COMPAT]

---

## spacing('16') → spacing('md') (1rem = 1rem ✓)

| Fichier:ligne                                                       | Classification     | Contexte                                                                  |
| ------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------- |
| `src/styles/abstracts/_forms.scss:72`                               | [SKIP - ABSTRACTS] | `'md': spacing('16'),` — map interne `$paddings` dans `form-padding()`    |
| `src/styles/abstracts/_spacing.scss:106`                            | [SKIP - COMPAT]    | `--spacing-16: #{spacing('16')};` — CSS var pour JavaScript               |
| `src/styles/abstracts/_spacing.scss:145`                            | [SKIP - DOC]       | `///   - 'grid-gap' (16px) → spacing('16')` — commentaire migration guide |
| `src/components/ui/toggle/Toggle.scss:75`                           | [TO MIGRATE]       | `width: spacing('16');`                                                   |
| `src/components/ui/toggle/Toggle.scss:76`                           | [TO MIGRATE]       | `height: spacing('16');`                                                  |
| `src/components/ui/select/Select.scss:288`                          | [TO MIGRATE]       | `min-height: spacing('16');`                                              |
| `src/components/features/cards/cards-edition/CardsEdition.scss:168` | [TO MIGRATE]       | `padding: spacing('32') spacing('16');`                                   |
| `src/components/features/consent/CookieBanner.scss:37`              | [TO MIGRATE]       | `padding: spacing('20') spacing('16');`                                   |
| `src/components/features/consent/CookiePreferences.scss:45`         | [TO MIGRATE]       | `margin: 0 0 spacing('16') 0;`                                            |
| `src/components/features/consent/CookiePreferences.scss:81`         | [TO MIGRATE]       | `margin: 0 0 spacing('16') 0;`                                            |
| `src/page-components/legal/rgpd/PortailRGPD.scss:48`                | [TO MIGRATE]       | `margin-top: spacing('16');`                                              |
| `src/page-components/legal/rgpd/PortailRGPD.scss:57`                | [TO MIGRATE]       | `padding: spacing('16');`                                                 |

**Bilan** : 11 matches — 9 [TO MIGRATE] + 2 [SKIP] + 1 [SKIP - ABSTRACTS]

---

## spacing('24') → spacing('lg') (1.5rem = 1.5rem ✓)

| Fichier:ligne                                                                     | Classification  | Contexte                                                                  |
| --------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------- |
| `src/styles/abstracts/_functions.scss:4`                                          | [SKIP - DOC]    | `/// Exemple : spacing('24') -> 1.5rem si base = 16px` — commentaire      |
| `src/styles/abstracts/_spacing.scss:108`                                          | [SKIP - COMPAT] | `--spacing-24: #{spacing('24')};` — CSS var pour JavaScript               |
| `src/styles/abstracts/_spacing.scss:132`                                          | [SKIP - DOC]    | `///   margin-bottom: spacing('24');        // 1.5rem` — commentaire      |
| `src/styles/abstracts/_spacing.scss:144`                                          | [SKIP - DOC]    | `///   - 'card-gap' (24px) → spacing('24')` — commentaire migration guide |
| `src/components/ui/toast/Toast.scss:25`                                           | [TO MIGRATE]    | `bottom: spacing('24');`                                                  |
| `src/components/ui/checkbox/Checkbox.scss:140`                                    | [TO MIGRATE]    | `margin-inline-start: calc(spacing('24') + spacing('sm'));`               |
| `src/components/ui/toggle/Toggle.scss:50`                                         | [TO MIGRATE]    | `height: spacing('24');`                                                  |
| `src/components/features/legal/legal-markdown/LegalMarkdown.scss:19`              | [TO MIGRATE]    | `padding: spacing('24') spacing('20');`                                   |
| `src/components/shared/modal/create-bank-card-modal/CreateBankCardModal.scss:147` | [TO MIGRATE]    | `min-width: spacing('24');`                                               |
| `src/components/shared/modal/create-bank-card-modal/CreateBankCardModal.scss:148` | [TO MIGRATE]    | `min-height: spacing('24');`                                              |
| `src/page-components/tableau/Tableau.scss:235`                                    | [TO MIGRATE]    | `padding: spacing('24');`                                                 |
| `src/page-components/legal/rgpd/PortailRGPD.scss:27`                              | [TO MIGRATE]    | `padding: spacing('24') spacing('20');`                                   |

**Bilan** : 12 matches — 8 [TO MIGRATE] + 4 [SKIP]

---

## spacing('32') → spacing('xl') (2rem = 2rem ✓)

| Fichier:ligne                                                                                 | Classification  | Contexte                                                                    |
| --------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------- |
| `src/styles/abstracts/_spacing.scss:109`                                                      | [SKIP - COMPAT] | `--spacing-32: #{spacing('32')};` — CSS var pour JavaScript                 |
| `src/styles/abstracts/_spacing.scss:142`                                                      | [SKIP - DOC]    | `///   - 'modal-padding' (32px) → spacing('32')` — commentaire              |
| `src/components/features/taches/taches-dnd/TachesDnd.scss:124`                                | [TO MIGRATE]    | `width: spacing('32');`                                                     |
| `src/components/features/taches/taches-dnd/TachesDnd.scss:125`                                | [TO MIGRATE]    | `height: spacing('32');`                                                    |
| `src/components/features/cards/cards-edition/CardsEdition.scss:168`                           | [TO MIGRATE]    | `padding: spacing('32') spacing('16');`                                     |
| `src/components/features/recompenses/selected-reward-floating/SelectedRewardFloating.scss:8`  | [SKIP - DOC]    | `//    - spacing('32') → Primitives Phase 6 (32px) ✅` — commentaire header |
| `src/components/features/recompenses/selected-reward-floating/SelectedRewardFloating.scss:34` | [TO MIGRATE]    | `bottom: spacing('32');`                                                    |
| `src/components/features/recompenses/selected-reward-floating/SelectedRewardFloating.scss:35` | [TO MIGRATE]    | `right: spacing('32');`                                                     |

**Bilan** : 8 matches — 5 [TO MIGRATE] + 2 [SKIP] + 1 [SKIP - DOC]

---

## Tableau de synthèse global

| Clé             | TO MIGRATE | SKIP - DOC | SKIP - COMPAT | SKIP - ABSTRACTS |
| --------------- | ---------- | ---------- | ------------- | ---------------- |
| `spacing('4')`  | **23**     | 0          | 1             | 0                |
| `spacing('8')`  | **12**     | 0          | 1             | 0                |
| `spacing('16')` | **9**      | 1          | 1             | **1**            |
| `spacing('24')` | **8**      | 3          | 1             | 0                |
| `spacing('32')` | **5**      | 2          | 1             | 0                |
| **Total**       | **57**     | 6          | 5             | **1**            |

---

## ⚠️ Cas inattendus à trancher

### 1. [SKIP - COMPAT] — CSS vars JavaScript (5 occurrences, \_spacing.scss)

```scss
// _spacing.scss:102
// Valeurs communes (pour JavaScript/CSS direct si besoin)
--spacing-4: #{spacing('4')};
--spacing-8: #{spacing('8')};
--spacing-16: #{spacing('16')};
--spacing-24: #{spacing('24')};
--spacing-32: #{spacing('32')};
```

Ces CSS vars sont **intentionnellement nommées d'après les tokens numériques** pour que JavaScript puisse lire `getComputedStyle(el).getPropertyValue('--spacing-4')`.

**Options :**

- **A — Garder tel quel** : valeur CSS identique, nom CSS var reste numérique (cohérent avec l'API JavaScript côté)
- **B — Migrer le contenu** : `--spacing-4: #{spacing('xs')};` — valeur identique, alignement interne SCSS

→ Recommandation : **Option A** — nom CSS var et SCSS source sont liés, Commit D supprimera les clés numériques donc la CSS var deviendra invalide de toute façon. À traiter ensemble dans Commit D.

### 2. [SKIP - ABSTRACTS] — Map interne `_forms.scss:72`

```scss
@function form-padding($size: 'md') {
  $paddings: (
    'sm': spacing('sm'),
    'md': spacing('16'),  // ← ligne 72
    'lg': spacing('20'),
  );
  ...
}
```

La clé `'sm'` utilise déjà `spacing('sm')`, mais `'md'` utilise encore `spacing('16')` au lieu de `spacing('md')`.

**Options :**

- **A — Migrer** : `'md': spacing('md')` — cohérence totale dans ce fichier
- **B — Garder** : hors périmètre Commit C (fichier abstracts, traitê avec Commit D)

→ Recommandation : **Option A** (migration triviale, une seule ligne, zéro risque)

---

_Rapport généré en mode read-only. Aucune modification de code effectuée._
