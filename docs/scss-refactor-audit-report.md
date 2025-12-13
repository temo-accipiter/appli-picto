# 📊 RAPPORT AUDIT COMPLET - Refactoring SCSS Tokens-First

**Date** : 2025-12-13
**Branche** : refactor/styles/tokens-first
**Scope** : 99 fichiers SCSS analysés

---

## 🎯 Résumé Exécutif

| Métrique                     | Valeur   |
| ---------------------------- | -------- |
| **Fichiers scannés**         | 99       |
| **Fichiers avec hardcodes**  | 54 (55%) |
| **Fichiers propres**         | 45 (45%) |
| **Total hardcodes détectés** | 512      |
| **Estimation temps total**   | 22-29h   |

---

## ✅ Fichiers Déjà Propres (45 fichiers)

Ces fichiers sont **déjà conformes** ou nécessitent seulement des ajustements mineurs :

### UI Components (Partiellement Migrés)

- ✅ Button.scss - Bon usage tokens (quelques hardcodes spinner)
- ✅ TachesEdition.scss - Majorité OK (transitions à migrer)

### Layout Components (Migration Sprint 1 Complète)

- ✅ BottomNav.scss
- ✅ UserMenu.scss
- ✅ Layout.scss

---

## 🔴 Fichiers À Migrer (54 fichiers) - Catégorisation

### **PRIORITÉ 1 - Composants UI Critiques** (12 fichiers, ~6-8h)

Composants de base utilisés partout - IMPACT MAJEUR

| Fichier              | Hardcodes | Complexité | Temps Estimé |
| -------------------- | --------- | ---------- | ------------ |
| Input.scss           | ~15       | Moyenne    | 30 min       |
| Select.scss          | ~12       | Moyenne    | 30 min       |
| SelectWithImage.scss | ~10       | Moyenne    | 30 min       |
| Checkbox.scss        | ~8        | Faible     | 20 min       |
| Toast.scss           | ~18       | Moyenne    | 45 min       |
| Loader.scss          | ~6        | Faible     | 15 min       |
| Modal.scss           | ~25       | Élevée     | 1h           |
| Button (polish)      | ~5        | Faible     | 15 min       |
| ButtonDelete.scss    | ~8        | Faible     | 20 min       |
| ButtonClose.scss     | ~6        | Faible     | 15 min       |
| ImagePreview.scss    | ~10       | Moyenne    | 30 min       |
| UploadProgress.scss  | ~12       | Moyenne    | 30 min       |

**Sous-total : 6-8h**

---

### **PRIORITÉ 2 - Features Business Logic** (15 fichiers, ~8-10h)

Composants métier spécifiques à l'app

| Catégorie                     | Fichiers   | Hardcodes Tot. | Temps Estimé |
| ----------------------------- | ---------- | -------------- | ------------ |
| **Admin Features**            | 4 fichiers | ~80            | 2-3h         |
| - AccountManagement.scss      | ~20        | Élevée         | 1h           |
| - QuotaManagement.scss        | ~18        | Élevée         | 1h           |
| - MetricsDashboard.scss       | ~22        | Élevée         | 1h           |
| - ImageAnalytics.scss         | ~20        | Moyenne        | 30 min       |
| **Taches/Recompenses**        | 5 fichiers | ~45            | 2-3h         |
| - TachesDnd.scss              | ~15        | Moyenne        | 45 min       |
| - RecompensesEdition.scss     | ~12        | Moyenne        | 45 min       |
| - SelectedRecompense.scss     | ~8         | Faible         | 30 min       |
| - SelectedRewardFloating.scss | ~6         | Faible         | 30 min       |
| - TrainProgressBar.scss       | ~4         | Faible         | 15 min       |
| **Legal/Consent**             | 3 fichiers | ~50            | 2h           |
| - CookieBanner.scss           | ~15        | Moyenne        | 45 min       |
| - CookiePreferences.scss      | ~25        | Élevée         | 1h           |
| - LegalMarkdown.scss          | ~10        | Faible         | 30 min       |
| **Settings/Subscription**     | 3 fichiers | ~20            | 1-2h         |
| - DeleteAccountGuard.scss     | ~8         | Faible         | 30 min       |
| - SubscribeButton.scss        | ~6         | Faible         | 30 min       |
| - TimeTimer.scss              | ~6         | Faible         | 30 min       |

**Sous-total : 8-10h**

---

### **PRIORITÉ 3 - Shared Components** (17 fichiers, ~6-8h)

Composants partagés entre features

| Catégorie                   | Fichiers   | Hardcodes Tot. | Temps Estimé |
| --------------------------- | ---------- | -------------- | ------------ |
| **Cards**                   | 3 fichiers | ~30            | 1-2h         |
| - BaseCard.scss             | ~12        | Moyenne        | 30 min       |
| - EditionCard.scss          | ~10        | Moyenne        | 30 min       |
| - TableauCard.scss          | ~8         | Faible         | 30 min       |
| **DnD System**              | 3 fichiers | ~25            | 1-2h         |
| - DndCard.scss              | ~10        | Moyenne        | 45 min       |
| - DndGrid.scss              | ~10        | Moyenne        | 45 min       |
| - DndSlot.scss              | ~5         | Faible         | 15 min       |
| **Modals**                  | 3 fichiers | ~35            | 2h           |
| - ModalCategory.scss        | ~12        | Moyenne        | 45 min       |
| - PersonalizationModal.scss | ~15        | Moyenne        | 1h           |
| - ModalRecompense.scss      | ~8         | Faible         | 30 min       |
| **Autres Shared**           | 8 fichiers | ~60            | 3-4h         |
| - AccountStatusBadge.scss   | ~10        | Moyenne        | 30 min       |
| - AvatarProfil.scss         | ~6         | Faible         | 20 min       |
| - Dropdown.scss             | ~8         | Faible         | 30 min       |
| - EditionList.scss          | ~8         | Faible         | 30 min       |
| - ImageQuotaIndicator.scss  | ~8         | Faible         | 30 min       |
| - QuotaIndicator.scss       | ~8         | Faible         | 30 min       |
| - SearchInput.scss          | ~6         | Faible         | 20 min       |
| - ThemeToggle.scss          | ~6         | Faible         | 20 min       |

**Sous-total : 6-8h**

---

### **PRIORITÉ 4 - Page Components** (10 fichiers, ~4-6h)

Pages principales (page-components/)

| Fichier             | Hardcodes | Complexité  | Temps Estimé |
| ------------------- | --------- | ----------- | ------------ |
| Profil.scss         | ~60       | Très Élevée | 2h           |
| Tableau.scss        | ~15       | Moyenne     | 45 min       |
| Login.scss          | ~12       | Moyenne     | 30 min       |
| ResetPassword.scss  | ~8        | Faible      | 30 min       |
| ForgotPassword.scss | ~4        | Faible      | 15 min       |
| PortailRGPD.scss    | ~18       | Moyenne     | 45 min       |
| TimeTimerPage.scss  | ~6        | Faible      | 30 min       |
| Signup/CGU          | ~20       | Moyenne     | 1h           |

**Sous-total : 4-6h**

---

## 📈 Patterns Hardcodes Détectés

### Distribution par Type

| Type Hardcode       | Occurrences | %            |
| ------------------- | ----------- | ------------ |
| **PX Spacing**      | ~380 (74%)  | Majorité     |
| **Hex Colors**      | ~80 (16%)   | Significatif |
| **RGB/RGBA Colors** | ~52 (10%)   | Modéré       |

### Top Violations

1. **max-width/min-width en px** (~120 occurrences)
2. **margin/padding px** (~100 occurrences)
3. **gap px** (~50 occurrences)
4. **Hex colors hardcodés** (~80 occurrences)
5. **rgba() avec alpha hardcodé** (~52 occurrences)

---

## 🎯 Plan Migration par Sprints

### **SPRINT 2 - UI Critiques** (6-8h)

**Objectif** : Migrer les 12 composants UI prioritaires

**Actions** :

1. Button/Input/Select (trio critique)
2. Modal/Toast (feedback utilisateur)
3. Checkbox/Loader (petits composants)

**Validation** :

- [ ] pnpm build:css réussit
- [ ] Tests visuels pages critiques
- [ ] Touch targets 56px validés

---

### **SPRINT 3 - Features** (8-10h)

**Objectif** : Migrer business logic (Admin, Taches, Recompenses)

**Actions** :

1. Admin panels (4 fichiers)
2. Taches/Recompenses (5 fichiers)
3. Legal/Consent (3 fichiers)

**Validation** :

- [ ] Couleurs rôles (admin violet) OK
- [ ] Quotas visuels corrects
- [ ] Dark mode fonctionnel

---

### **SPRINT 4 - Shared & Pages** (6-8h)

**Objectif** : Finir composants partagés + pages

**Actions** :

1. Cards/DnD system (6 fichiers)
2. Modals custom (3 fichiers)
3. Pages principales (Profil, Tableau, Login)

**Validation** :

- [ ] DnD animations <300ms
- [ ] Profil.scss refactoré (gros morceau)
- [ ] pnpm lint:hardcoded = 0 violations

---

### **SPRINT 5 - Polish & Cleanup** (2-3h)

**Objectif** : Validation finale et nettoyage

**Actions** :

1. Supprimer \_variables.scss deprecated
2. Supprimer \_theme-vars.scss deprecated
3. Nettoyer legacy maps dans \_colors.scss
4. Documentation design tokens
5. Scripts CI/CD

**Validation** :

- [ ] pnpm lint:hardcoded = 0
- [ ] pnpm validate:touch-targets = OK
- [ ] Build production OK
- [ ] Tests E2E passent
- [ ] Documentation à jour

---

## 🚨 Risques Identifiés

| Risque                     | Impact | Mitigation                           |
| -------------------------- | ------ | ------------------------------------ |
| **Profil.scss complexité** | Élevé  | Découper en sous-tâches (2h dédiées) |
| **Modal variants**         | Moyen  | Tester tous les cas d'usage          |
| **Dark mode regressions**  | Moyen  | Validation systématique light/dark   |
| **Touch targets <56px**    | Élevé  | Script validation automatique        |
| **Animations TSA**         | Moyen  | Vérifier prefers-reduced-motion      |

---

## ✅ Checklist Validation Finale

### Avant Merge

- [ ] 0 hardcodes détectés (pnpm lint:hardcoded)
- [ ] Touch targets validés (pnpm validate:touch-targets)
- [ ] Build CSS réussit (pnpm build:css)
- [ ] Lint/format OK (pnpm check)
- [ ] Tests unitaires passent (pnpm test)

### Tests Manuels

- [ ] Tableau public - apparence identique
- [ ] Édition tâches - DnD fluide <300ms
- [ ] Admin panels - couleurs rôles OK
- [ ] Profil - layout intact
- [ ] Login/Signup - formulaires OK
- [ ] Mode dark - toutes pages

### Accessibilité TSA

- [ ] Animations ≤300ms partout
- [ ] Touch targets ≥56px (enfants)
- [ ] Contraste WCAG 2.2 AA minimum
- [ ] Focus rings visibles
- [ ] Couleurs pastel apaisantes

---

## 📊 Estimation Finale

| Phase                   | Temps      | Confiance |
| ----------------------- | ---------- | --------- |
| Sprint 2 (UI)           | 6-8h       | Élevée    |
| Sprint 3 (Features)     | 8-10h      | Moyenne   |
| Sprint 4 (Shared/Pages) | 6-8h       | Moyenne   |
| Sprint 5 (Polish)       | 2-3h       | Élevée    |
| **TOTAL**               | **22-29h** | **Bonne** |

**Répartition réaliste sur 3 semaines** :

- Semaine 1 : Sprint 2 (UI critiques) - 6-8h
- Semaine 2 : Sprint 3 (Features) - 8-10h
- Semaine 3 : Sprint 4 + 5 (Finish + Polish) - 8-11h

---

## 🎯 Prochaines Actions Immédiates

1. **Valider ce plan** avec l'équipe
2. **Choisir Sprint 2 ou autre priorité**
3. **Démarrer migration** composants UI critiques
4. **Commit après chaque composant** migré avec succès

---

**Généré par** : Claude Code Audit
**Date génération** : 2025-12-13
**Commande** : Option B - Audit complet codebase
