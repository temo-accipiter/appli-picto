# Phase 6 - Plan Refactoring Composants UI (Atomic Design)

**Objectif** : Refactoring isométrique tokens-first de 10 composants UI atomiques

**Contrat** : Respecter strictement `refactor-css/refactor-contract.md`

**Date création** : 2025-01-XX

---

## 🎯 STRATÉGIE - Architecture en Couches

**Principe** : Refactorer les **atomes** avant les **molécules** (dépendances bottom-up)

```
Atomes (Input, Button, Checkbox)
    ↓ utilisés par
Molécules (Select, PasswordChecklist, Toast)
    ↓ utilisés par
Organismes (Forms, Modals, Cards)
```

---

## 📋 LISTE DES 10 COMPOSANTS UI PRIORITAIRES

### ✅ NIVEAU 0 - ATOMES DE BASE (Déjà fait)

#### 1. **Button** (`ui/button/Button.scss`) - ✅ TERMINÉ

- **Taille** : 189 lignes
- **Statut** : Refactoré (Phase 6.0)
- **Changements** :
  - 8 variables Sass → fonctions tokens
  - 5 hardcodes → tokens
  - `map.get($radius-tokens, 'sm')` (fonction `radius()` non forwardée)
  - `map.get($shadow-tokens, 'elevation-sm')`
  - Mixins : `touch-target()`, `safe-animation()`, `safe-transition()`
- **Temporaire** : 2× `color.adjust()` (variants manquants)

---

### 🔴 NIVEAU 1 - ATOMES CRITIQUES (À faire en priorité)

#### 2. **Input** (`ui/input/Input.scss`) - 🔴 PRIORITÉ 1

- **Taille** : 128 lignes
- **Dépendances** : Aucune (atome pur)
- **Utilisé par** : Forms, Select, PasswordChecklist, TOUS les formulaires
- **Hardcodes détectés** : OUI (lint:hardcoded)
- **Estimation** : 20-25 min
- **Raison priorité** : Base de TOUS les inputs (forms, search, filters)

#### 3. **Checkbox** (`ui/checkbox/Checkbox.scss`) - 🔴 PRIORITÉ 1

- **Taille** : 128 lignes
- **Dépendances** : Aucune (atome pur)
- **Utilisé par** : Forms, Settings, Admin
- **Hardcodes détectés** : À vérifier
- **Estimation** : 15-20 min
- **Raison priorité** : Composant interactif critique (accessibilité)

#### 4. **ButtonClose** (`ui/button/button-close/ButtonClose.scss`) - 🔴 PRIORITÉ 1

- **Taille** : 97 lignes
- **Dépendances** : Button (parent)
- **Utilisé par** : Modal, Toast, Dropdowns
- **Hardcodes détectés** : OUI (lint:hardcoded)
- **Estimation** : 10-15 min
- **Raison priorité** : Variant de Button, utilisé partout

---

### 🟠 NIVEAU 2 - COMPOSANTS INTERMÉDIAIRES

#### 5. **Select** (`ui/select/Select.scss`) - 🟠 PRIORITÉ 2

- **Taille** : 45 lignes (petit mais critique)
- **Dépendances** : Input (base)
- **Utilisé par** : Forms, Filters, Settings
- **Hardcodes détectés** : OUI (lint:hardcoded)
- **Estimation** : 8-12 min
- **Raison priorité** : Composant formulaire essentiel

#### 6. **PasswordChecklist** (`ui/password-checklist/PasswordChecklist.scss`) - 🟠 PRIORITÉ 2

- **Taille** : 186 lignes (GROS)
- **Dépendances** : Input
- **Utilisé par** : Signup, ResetPassword, Profil
- **Hardcodes détectés** : OUI (lint:hardcoded)
- **Estimation** : 30-35 min
- **Raison priorité** : Sécurité + UX critique (validation mdp)

#### 7. **Toast** (`ui/toast/Toast.scss`) - 🟠 PRIORITÉ 2

- **Taille** : 32 lignes (petit)
- **Dépendances** : Aucune
- **Utilisé par** : ToastContext (global)
- **Hardcodes détectés** : À vérifier
- **Estimation** : 8-10 min
- **Raison priorité** : Feedback utilisateur omniprésent

---

### 🟡 NIVEAU 3 - COMPOSANTS SPÉCIALISÉS

#### 8. **Loader** (`ui/loader/Loader.scss`) - 🟡 PRIORITÉ 3

- **Taille** : 35 lignes
- **Dépendances** : Aucune
- **Utilisé par** : LoadingContext, pages async
- **Hardcodes détectés** : À vérifier
- **Estimation** : 8-10 min
- **Raison priorité** : Animations TSA-critical (prefers-reduced-motion)

#### 9. **SelectWithImage** (`ui/select-with-image/SelectWithImage.scss`) - 🟡 PRIORITÉ 3

- **Taille** : 268 lignes (LE PLUS GROS)
- **Dépendances** : Select (parent), Input
- **Utilisé par** : Tâches (sélection pictogramme)
- **Hardcodes détectés** : À vérifier (probablement BEAUCOUP)
- **Estimation** : 40-50 min
- **Raison priorité** : Feature cœur app (pictogrammes) mais spécialisé

#### 10. **ImagePreview** (`ui/image-preview/ImagePreview.scss`) - 🟡 PRIORITÉ 3

- **Taille** : 50 lignes
- **Dépendances** : Aucune
- **Utilisé par** : Upload images, Edition tâches
- **Hardcodes détectés** : À vérifier
- **Estimation** : 10-12 min
- **Raison priorité** : UX images (prévisualisation)

---

## 📊 RÉCAPITULATIF

| Composant                | Taille | Priorité | Dépendances   | Estimation | Hardcodes |
| ------------------------ | ------ | -------- | ------------- | ---------- | --------- |
| ✅ **Button**            | 189L   | 0        | -             | -          | FAIT      |
| 🔴 **Input**             | 128L   | 1        | -             | 20-25min   | OUI       |
| 🔴 **Checkbox**          | 128L   | 1        | -             | 15-20min   | ?         |
| 🔴 **ButtonClose**       | 97L    | 1        | Button        | 10-15min   | OUI       |
| 🟠 **Select**            | 45L    | 2        | Input         | 8-12min    | OUI       |
| 🟠 **PasswordChecklist** | 186L   | 2        | Input         | 30-35min   | OUI       |
| 🟠 **Toast**             | 32L    | 2        | -             | 8-10min    | ?         |
| 🟡 **Loader**            | 35L    | 3        | -             | 8-10min    | ?         |
| 🟡 **SelectWithImage**   | 268L   | 3        | Select, Input | 40-50min   | ?         |
| 🟡 **ImagePreview**      | 50L    | 3        | -             | 10-12min   | ?         |

**Total estimé** : ~2h30-3h30 (sans Button déjà fait)

---

## 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

### **Sprint 1 - Atomes Critiques** (45-60min)

1. Input (20-25min)
2. Checkbox (15-20min)
3. ButtonClose (10-15min)

### **Sprint 2 - Composants Formulaires** (46-57min)

4. Select (8-12min)
5. PasswordChecklist (30-35min)
6. Toast (8-10min)

### **Sprint 3 - Composants Spécialisés** (58-72min)

7. Loader (8-10min)
8. ImagePreview (10-12min)
9. SelectWithImage (40-50min)

---

## ✅ CHECKLIST PAR COMPOSANT

Pour chaque composant, appliquer **refactor-contract.md** :

### **Phase A - Analyse**

- [ ] Lire fichier SCSS complet
- [ ] Identifier variables Sass obsolètes (`$spacing-*`, `$radius-*`, etc.)
- [ ] Détecter hardcodes (`12px`, `#hex`, `0.5`, etc.)
- [ ] Vérifier BEM & nesting (≤ 2 niveaux)
- [ ] Analyser keyframes (local ou \_motion.scss ?)
- [ ] Repérer code redondant

### **Phase B - Refactoring**

- [ ] Remplacer variables → fonctions tokens
- [ ] Éliminer hardcodes → tokens
- [ ] Utiliser `map.get($*-tokens, 'key')` si fonction non forwardée
- [ ] Appliquer mixins (`touch-target()`, `safe-animation()`, `focus-ring()`)
- [ ] Propriétés logiques (`margin-inline-end` vs `margin-right`)
- [ ] Documenter TODO si variants tokens manquants

### **Phase C - Validation**

- [ ] `pnpm build` passe sans erreurs
- [ ] `pnpm lint:hardcoded` : 0 hardcodes
- [ ] Smoke test visuel (navigateur)
- [ ] Accessibilité : WCAG AA (contraste, touch, focus)
- [ ] Animations : ≤ 0.3s, `prefers-reduced-motion`

---

## 🎯 CRITÈRES DE SUCCÈS PHASE 6

- ✅ 10 composants UI refactorés 100% tokens-first
- ✅ 0 hardcodes détectés (`pnpm lint:hardcoded`)
- ✅ Build Next.js réussit sans warnings SCSS
- ✅ Tests visuels passent (smoke tests)
- ✅ WCAG 2.2 AA respecté (touch, focus, contraste)
- ✅ Animations TSA-compliant (≤ 0.3s)
- ✅ Documentation TODO claire (variants manquants)

---

## 📝 NOTES IMPORTANTES

### **Problèmes connus (depuis Button)**

1. **Fonctions non forwardées** :
   - `radius()` → Utiliser `map.get($radius-tokens, 'key')`
   - `shadow()` → Utiliser `map.get($shadow-tokens, 'elevation-key')`

2. **Variants tokens manquants** :
   - `$primary-color-tokens` : pas de `'light'`, `'dark'`
   - `$secondary-color-tokens` : pas de `'light'`, `'dark'`
   - **Solution temporaire** : `color.adjust()` + TODO

3. **Imports requis** :
   ```scss
   @use '@styles/abstracts' as *;
   @use 'sass:map'; // Pour map.get()
   @use 'sass:color'; // Pour color.adjust() (temporaire)
   ```

### **Patterns à suivre (depuis Button)**

✅ **Bon exemple** :

```scss
padding: spacing('xs') spacing('sm');
border-radius: map.get($radius-tokens, 'sm');
box-shadow: map.get($shadow-tokens, 'elevation-sm');
opacity: opacity('half');
@include touch-target('min');
@include safe-animation(fade, timing('base'), easing('smooth'));
```

❌ **À éviter** :

```scss
padding: 8px 16px; // ❌ Hardcode
border-radius: $radius-sm; // ❌ Variable obsolète
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); // ❌ Hardcode
opacity: 0.5; // ❌ Hardcode
animation-duration: 0.3s; // ❌ Hardcode (utiliser timing())
```

---

## 🔗 RESSOURCES

- **Contrat refactoring** : `refactor-css/refactor-contract.md`
- **Philosophie** : `refactor-css/refactor-philosophy.md`
- **Architecture** : `refactor-css/scss-architecture.md`
- **Tokens source** : `src/styles/abstracts/_tokens.scss`
- **Exemple conforme** : `src/components/ui/button/Button.scss` ✅

---

**Prochaine action** : Démarrer Sprint 1 avec **Input** (Priorité 1)
