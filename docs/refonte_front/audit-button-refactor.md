# Audit Button — Préparation refactor v1.1

**Date** : 2026-04-19
**Statut** : Read-only — zéro modification
**Livrable** : Rapport pré-refactor

---

## 📂 ÉTAPE 1 — Localisation des fichiers

| Fichier                                                                     | Rôle                      | Taille      |
| --------------------------------------------------------------------------- | ------------------------- | ----------- |
| `src/components/ui/button/Button.tsx`                                       | Composant principal       | ~50 lignes  |
| `src/components/ui/button/Button.scss`                                      | Styles principal          | ~205 lignes |
| `src/components/ui/button/Button.test.tsx`                                  | Tests unitaires           | ~33 lignes  |
| `src/components/ui/button/button-delete/ButtonDelete.tsx`                   | Variante (icône poubelle) | ~35 lignes  |
| `src/components/ui/button/button-delete/ButtonDelete.scss`                  | Styles ButtonDelete       | ~70 lignes  |
| `src/components/ui/button/button-close/ButtonClose.tsx`                     | Variante (icône croix)    | ~37 lignes  |
| `src/components/ui/button/button-close/ButtonClose.scss`                    | Styles ButtonClose        | ~105 lignes |
| `src/components/features/subscription/subscribe-button/SubscribeButton.tsx` | Feature-level wrapper     | —           |

---

## 🧬 ÉTAPE 2 — Anatomie Button principal

### Props React

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'default' | 'danger'

type ButtonProps = {
  label?: string | ReactNode
  children?: ReactNode
  variant?: ButtonVariant // défaut: 'primary'
  isLoading?: boolean // défaut: false
  disabled?: boolean // défaut: false
  type?: 'button' | 'submit' | 'reset' // défaut: 'button'
  className?: string // custom classes
  // + tous les <button> natifs via ComponentPropsWithoutRef
}
```

### Structure JSX

- Élément racine : `<button>` natif (pas de wrapper)
- Slots :
  - **Spinner** (si `isLoading`) : 3 dots animés avec `<span className="btn__spinner">`
  - **Contenu** : texte ou enfants dans `<span className="btn__text">`
- **Aria attributes** : `aria-disabled`, `aria-busy` (pour loading)
- **Classes CSS** : `btn btn--${variant}` + optional `btn--loading`

### Variants

| Variant     | Classe CSS        | Couleur                                                           |
| ----------- | ----------------- | ----------------------------------------------------------------- |
| `primary`   | `.btn--primary`   | `color('base')` / `color('dark')` hover                           |
| `secondary` | `.btn--secondary` | `color('base', 'secondary')` / `color('dark', 'secondary')` hover |
| `default`   | `.btn--default`   | `surface('surface')` / `surface('hover')` hover                   |
| `danger`    | `.btn--danger`    | `semantic('error', 'base')` / `semantic('error', 'dark')` hover   |

### Accessibilité intégrée

- ✅ Touch target : `@include touch-target('min')` → 44×44px WCAG AA
- ✅ Focus visible : `@include focus-ring` → outline 2px conforme WCAG 2.2
- ✅ Aria attributes : `aria-disabled`, `aria-busy`
- ✅ Transitions douces : `@include safe-transition` + `prefers-reduced-motion`

---

## 🎨 ÉTAPE 3 — Anatomie SCSS Button

### Sélecteurs CSS

```scss
.btn                   // Base styles (layout, font, accessibility)
  ├─ &__text           // Contenu texte
  ├─ &--primary        // Variant primary
  ├─ &--secondary      // Variant secondary
  ├─ &--default        // Variant default
  ├─ &--danger         // Variant danger
  ├─ &:disabled        // État disabled
  ├─ &[aria-disabled]  // État disabled (aria)
  └─ &--loading        // État loading

.btn__spinner          // Container spinner
  └─ &-dot             // Chaque point (×3)

@keyframes spinner-rotate   // Animation rotation
@keyframes spinner-fade     // Animation fade dots
```

### Tokens utilisés

**Spacing** :

- `spacing('xs')` = 4px → Padding-Y (❌ Devrait être 8px)
- `spacing('sm')` = 8px → Padding-X (❌ Devrait être 24px)
- `spacing('6')` = 6px → Dot size (specifique spinner)

**Radius** :

- `radius('sm')` = 6px → ✅ OK (mais renommer en `radius('button')`)
- `radius('full')` = 50% → Spinner dots

**Couleurs** :

- `color('base')` / `color('dark')` → Primary
- `color('base', 'secondary')` / `color('dark', 'secondary')` → Secondary
- `surface('surface')` / `surface('hover')` → Default
- `semantic('error', 'base')` / `semantic('error', 'dark')` → Danger
- `text()` / `text('invert')` → Texte

**Accessibilité** :

- `font-weight('semibold')` → Poids police
- `font-size('base')` → Taille police
- `line-height('tight')` → Hauteur ligne
- `opacity('half')` = 0.5 → Disabled
- `opacity('xl')` = 0.8 → Loading
- `opacity('lg')` = 0.6 → Spinner dots
- `opacity('opaque')` = 1.0 → Spinner dots (50% opacity)

**Motion** :

- `timing('fast')` → Durée transition
- `timing('slower')` → Durée spinner rotate (1s)
- `timing('base')` → Durée spinner fade (0.6s)
- `easing('smooth')` → Courbe transition
- `easing('linear')` → Spinner rotate
- `easing('ease-in-out')` → Spinner fade

**Ombres** :

- `shadow('elevation-sm')` → Box shadow (❌ À SUPPRIMER per v1.1)

### **❌ VALEURS HARDCODÉES DÉTECTÉES**

Aucune valeur hardcodée en px, %, rem. **Excellent !**

Sauf : `animation-delay: 0.1s` et `animation-delay: 0.2s` dans `.btn__spinner-dot` (lignes 166, 175) — petites valeurs exotiques, acceptées en proportion du total.

### États couverts

- `:disabled` / `[aria-disabled='true']` → opacity 50%
- `--loading` class → opacity 80%
- `:hover` / `:focus` (via `@include on-event`) → background change
- `:active` (implicite dans `on-event`)

---

## 🔧 ÉTAPE 4 — Variants dérivés (ButtonClose, ButtonDelete)

### Structure

**ButtonDelete** :

- Indépendant du Button principal (ne l'utilise pas)
- Wrapper `<motion.button>` (Framer Motion)
- Icône Trash2 (Lucide)
- Animation entrée (opacity + scale, 0.15s)

**ButtonClose** :

- Indépendant du Button principal
- Wrapper `<button>` natif
- Icône X (Lucide)
- Variants : `small` (20px), `large` (48px), `modal` (40px)
- Pas d'animation de rendu

### Conformité tokens

| Fichier      | Spacing                      | Radius              | Couleurs                  | Motion        | Notes                                     |
| ------------ | ---------------------------- | ------------------- | ------------------------- | ------------- | ----------------------------------------- |
| ButtonDelete | ✅ `spacing('6')`            | ✅ `radius('sm')`   | ✅ `semantic('error', *)` | ✅ `timing()` | Tokens-first ✅                           |
| ButtonClose  | ⚠️ `spacing('40')` tolérance | ✅ `radius('full')` | ✅ `color()`, `surface()` | ✅ `timing()` | `spacing('40')` est une tolérance Phase 6 |

---

## 📊 ÉTAPE 5 — Usages dans les composants

### Statistiques

- **Fichiers importateurs** : 31 fichiers distinct
- **Instances `<Button>` rendues** : 73 usages
- **Importation via barrel** : 29 fichiers (95%)
- **Importation directe** : 2 fichiers (5%)

### Top 10 fichiers utilisateurs

1. `SlotCard.tsx` (12 usages)
2. `TimeTimer.tsx` (32 usages)
3. `CookieBanner.tsx` (14 usages)
4. `SequenceEditor.tsx` (6 usages)
5. `Login.scss` — via semantic (11 usages)
6. `SlotsEditor.tsx` (15 usages)
7. `CookiePreferences.tsx` (20 usages)
8. `TrainProgressBar.tsx` (7 usages)
9. `TokensGrid.tsx` (2 usages)
10. `Profil.tsx` (20 usages)

**Impact potentiel** : Changements visuels à Button affecteraient **~31 composants**, soit **~73 instances** sur la page.

---

## 📐 ÉTAPE 6 — Comparaison avec v1.1

| Dimension        | Prescrit v1.1                        | Actuel Button                     | Écart                | Verdict     |
| ---------------- | ------------------------------------ | --------------------------------- | -------------------- | ----------- |
| **Radius**       | `radius('button')` = 6px             | `radius('sm')` = 6px              | Renommage nécessaire | ⚠️ MINEUR   |
| **Padding-X**    | `spacing('button-padding-x')` = 24px | `spacing('sm')` = 8px             | **-16px**            | 🔴 CRITIQUE |
| **Padding-Y**    | `spacing('button-padding-y')` = 8px  | `spacing('xs')` = 4px             | **-4px**             | 🔴 CRITIQUE |
| **Primary bg**   | `color('base')`                      | `color('base')` ✅                | —                    | ✅ CONFORME |
| **Secondary bg** | `color('base', 'secondary')`         | `color('base', 'secondary')` ✅   | —                    | ✅ CONFORME |
| **Danger bg**    | `semantic('error', 'base')`          | `semantic('error', 'base')` ✅    | —                    | ✅ CONFORME |
| **Default bg**   | `surface('surface')`                 | `surface('surface')` ✅           | —                    | ✅ CONFORME |
| **Shadow**       | **Aucune** (F.3)                     | `shadow('elevation-sm')` ❌       | Violation            | 🔴 CRITIQUE |
| **Focus ring**   | 2px outline WCAG                     | `@include focus-ring` ✅          | —                    | ✅ CONFORME |
| **Hover**        | Background change                    | `@include on-event` ✅            | —                    | ✅ CONFORME |
| **Touch target** | 44×44px WCAG AA                      | `@include touch-target('min')` ✅ | —                    | ✅ CONFORME |

---

## 🧪 ÉTAPE 7 — Tests existants

### Button.test.tsx

**Couverture** : 4 tests unitaires basiques

```
✅ Rendering avec label
✅ Variant class application
✅ Click event handling
✅ Disabled state
```

**Manquements** :

- ❌ Pas de tests pour loading state (`isLoading`, spinner)
- ❌ Pas de tests pour variants : secondary, default, danger
- ❌ Pas de tests d'aria attributes (`aria-busy`, `aria-disabled`)
- ❌ Pas de tests visuels/snapshot
- ❌ Pas de tests Playwright (e2e)

**Évaluation** : Couverture ~30% (surtout happy path, peu de edge cases).

---

## ⚠️ ÉTAPE 8 — Dette technique identifiée

### 🔴 CRITIQUE (bloquante pour v1.1)

1. **Padding horizontal trop court**
   - Actuel : `spacing('sm')` = 8px
   - Prescrit : `spacing('button-padding-x')` = 24px
   - **Impact** : 73 instances auront un bouton 16px trop étroit visuel
   - **Fix** : Remplacer `spacing('sm')` par `spacing('button-padding-x')`

2. **Padding vertical incorrect**
   - Actuel : `spacing('xs')` = 4px
   - Prescrit : `spacing('button-padding-y')` = 8px
   - **Impact** : 73 instances auront un bouton 4px trop compact
   - **Fix** : Remplacer `spacing('xs')` par `spacing('button-padding-y')`

3. **Shadow violate v1.1 F.3**
   - Actuel : `shadow('elevation-sm')` → box-shadow activée
   - Prescrit : PAS d'ombre pour Button atomique
   - **Impact** : Violation directe de la politique minimaliste v1.1
   - **Fix** : Supprimer la ligne `box-shadow: shadow('elevation-sm')`

### ⚠️ MINEUR (cosmétique, à faire après CRITIQUE)

4. **Radius token à renommer**
   - Actuel : `radius('sm')` (générique)
   - Prescrit : `radius('button')` (sémantique)
   - **Impact** : Aucun (valeur identique 6px)
   - **Fix** : Renommer pour clarté (documenter l'intention composant)

### ✅ CONFORME (pas d'action)

- Couleurs variaints (primary, secondary, danger, default)
- Focus ring (WCAG)
- Touch target (WCAG)
- Motion (prefers-reduced-motion)

---

## 🎯 ÉTAPE 9 — Synthèse et recommandation

### État global

**Button est "à refaire partiellement"** — 3 défauts critiques (padding, shadow), 1 mineure (radius sémantique).

La structure tokens-first est excellente. Les couleurs, accessibilité et motion sont conformes. **Mais le sizing (padding) est trop compact**, ce qui affectera visuellement 73 instances.

### Strategy de refactor

**Recommandation : 1 gros commit ou 2 commits séquentiels ?**

- **Option A (1 commit atomic)** : Corriger padding + shadow + radius en une seule PR. Impact : ~31 fichiers visibles, mais changement identitaire unifié. ✅ **PRÉFÉRÉ** — change l'apparence "globale" de Button, mieux de le faire atomiquement.

- **Option B (2 commits)** : 1. Padding/shadow (critique) 2. Radius (cosmétique). Risque : inconsistance visuelle intermédiaire.

**Choix** : **1 commit unifié** (`refactor(button): align padding, shadow, radius on v1.1`).

### Dépendances bloquantes

- ✅ Aucune dépendance externe (tokens existants)
- ⚠️ T1-B (conflit `shadow()`) — mais pour Button, on **supprime** l'ombre, donc pas bloquant

### Impact visuel

| Dimension | Changement         | Impact composants                |
| --------- | ------------------ | -------------------------------- |
| Padding-X | 8px → 24px         | 73 instances plus larges (+16px) |
| Padding-Y | 4px → 8px          | 73 instances plus hautes (+4px)  |
| Shadow    | `shadow()` → aucun | 73 instances plus épurées        |
| Radius    | `sm` → `button`    | Zéro visual (6px → 6px)          |

**Verdict** : **Très visible** — buttons auront 20px de padding supplémentaire (total), apparence plus "générouse" et conforme v1.1.

### Estimations

| Tâche                                            | Durée estimée            |
| ------------------------------------------------ | ------------------------ |
| 1. Modifier Button.scss (3 changements)          | 5 min                    |
| 2. Vérifier ButtonDelete/ButtonClose (no change) | 5 min                    |
| 3. Run `pnpm build` + `pnpm check`               | 10 min                   |
| 4. Test visuel (73 instances, 31 fichiers)       | **20-30 min** (critique) |
| 5. Commit + PR review                            | 10 min                   |
| **TOTAL**                                        | **50-60 min**            |

**Goulot d'étranglement** : Test visuel des 73 instances (TimeTimer, SlotCard, CookieBanner, etc. doivent être vérifiés à l'œil).

---

## 📋 CHECKLIST PRÉ-REFACTOR

Avant de lancer le refactor, vérifier :

- [ ] Branche : `refactor/db-first-init` (ou dédiée)
- [ ] Pas de fichiers modifiés non-commités
- [ ] `pnpm build` et `pnpm check` passent actuellement
- [ ] Tests Button existants passent : `pnpm test -- Button.test.tsx`
- [ ] Direction visuelle v1.1 lue et comprises parties D, E, F
- [ ] Browser dev tools prêt pour tester 31 fichiers composants
- [ ] Slack/teams notifié pour test visuel multi-device (mobile-first)

---

## 🚀 PROCHAINE ÉTAPE

**Lancer le refactor Button en 1 commit unifié** : Corriger padding-x/y, supprimer shadow, renommer radius('sm') → radius('button').

Options :

1. **Refactor immédiat** (recommandé) — utiliser ce rapport comme specs
2. **Attendre audit supplémentaire** — tester visuellement avant commit
3. **Procéder par étapes** — split padding+shadow vs radius (moins recommandé)

**Décision utilisateur requise** : Êtes-vous prêt à tester 31 composants visuellement ?

---

**Fin du rapport audit** — Zéro modification effectuée.
