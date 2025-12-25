# 📋 PHASE 6 - PLAN DE MIGRATION COMPOSANTS

**Date** : 2025-01-XX
**Statut** : 📋 **PLANIFIÉE** (prête à démarrer)
**Prérequis** : ✅ Phase 5 complète (fondations tokens-first)

---

## 🎯 OBJECTIF

Éliminer **70%+ des 219 hardcodes** détectés dans `components/` et `page-components/`

**Impact** : Migration vers design system tokens-first pour tous les composants UI

---

## 📊 ÉTAT ACTUEL

### **Hardcodes détectés** : **219**

**Répartition** :

- 🎨 **RGB/Hex colors** : ~80 (36%)
- 📏 **PX spacing** : ~130 (59%)
- 📐 **Autres** : ~9 (5%)

### **Composants affectés** : **43 fichiers**

**Localisation** :

- `src/components/shared/` : 12 fichiers
- `src/components/features/` : 18 fichiers
- `src/components/layout/` : 7 fichiers
- `src/page-components/` : 6 fichiers

---

## 📋 PRIORITÉS DE MIGRATION

### 🔴 **PRIORITÉ 1 - CRITICAL UI** (5 composants, ~2h)

**Composants utilisés partout** :

1. **Modal** (`shared/modal/Modal.scss`)
   - Hardcodes : 5+ (max-width, spacing)
   - Impact : ✅ **Très fort** (utilisé sur toutes pages)

2. **Dropdown** (`shared/dropdown/Dropdown.scss`)
   - Hardcodes : 4 (min-width, max-width)
   - Impact : ✅ **Fort** (menus, sélecteurs)

3. **Avatar Profil** (`shared/avatar-profil/AvatarProfil.scss`)
   - Hardcodes : 15+ (spacing, width, rgba)
   - Impact : ✅ **Fort** (profil utilisateur)

4. **Forms / ItemForm** (`shared/forms/ItemForm.scss`)
   - Hardcodes : Plusieurs (spacing, sizing)
   - Impact : ✅ **Fort** (création tâches/récompenses)

5. **Account Status Badge** (`shared/account-status-badge/AccountStatusBadge.scss`)
   - Hardcodes : 6 (padding, gap, left)
   - Impact : ✅ **Fort** (visible partout)

---

### 🟡 **PRIORITÉ 2 - FEATURES** (10 composants, ~3h)

**Composants features principales** :

6. **Tâches DnD** (`features/taches/taches-dnd/TachesDnd.scss`)
   - Hardcodes : 6 (rgba colors)
   - Impact : ⚠️ **Moyen** (drag & drop tâches)

7. **Récompenses Edition** (`features/recompenses/recompenses-edition/RecompensesEdition.scss`)
   - Hardcodes : 2 (min-height)
   - Impact : ⚠️ **Moyen** (édition récompenses)

8. **Demo Signed Image** (`shared/demo-signed-image/DemoSignedImage.scss`)
   - Hardcodes : 2 (bottom spacing)
   - Impact : ⚠️ **Moyen** (images tâches/récompenses)

9. **Image Quota Indicator** (`shared/image-quota-indicator/ImageQuotaIndicator.scss`)
   - Hardcodes : 3 (gap, height)
   - Impact : ⚠️ **Moyen** (quotas images)

10. **Global Loader** (`shared/global-loader/GlobalLoader.scss`)
    - Hardcodes : 2 (width, height)
    - Impact : ⚠️ **Moyen** (loading states)

11-15. **Autres features** (Cookie Banner, Delete Account Guard, etc.)

---

### 🟢 **PRIORITÉ 3 - LAYOUT** (7 composants, ~2h)

**Layout components** :

16. **Footer** (`layout/footer/Footer.scss`)
    - Hardcodes : 3 (top, padding, gap)
    - Impact : 🔵 **Faible** (layout fixe)

17. **Navbar** (`layout/navbar/Navbar.scss`)
    - Hardcodes : Plusieurs
    - Impact : 🔵 **Faible** (layout fixe)

18. **Settings Menu** (`layout/settings-menu/SettingsMenu.scss`)
    - Hardcodes : 5 (width, height, max-height)
    - Impact : 🔵 **Faible** (menu settings)

19. **User Menu** (`layout/user-menu/UserMenu.scss`)
    - Hardcodes : 2 (width)
    - Impact : 🔵 **Faible** (menu utilisateur)

20-22. **Autres layout components**

---

### 🔵 **PRIORITÉ 4 - ADMIN & LEGAL** (optionnel, ~2h)

**Admin & legal pages** :

23. **Metrics Dashboard** (`features/admin/MetricsDashboard.scss`)
    - Hardcodes : 3 (max-width, bottom)
    - Impact : ⚪ **Minimal** (admin uniquement)

24. **Image Analytics** (`features/admin/ImageAnalytics.scss`)
    - Hardcodes : 1 (max-width)
    - Impact : ⚪ **Minimal** (admin uniquement)

25. **Cookie Banner** (`features/consent/CookieBanner.scss`)
    - Hardcodes : 2 (max-width, padding)
    - Impact : ⚪ **Minimal** (affiché une fois)

26. **Legal Markdown** (`features/legal/legal-markdown/LegalMarkdown.scss`)
    - Hardcodes : 1 (max-width)
    - Impact : ⚪ **Minimal** (pages légales)

27-30. **Autres admin/legal**

---

## 🛠️ MÉTHODE DE MIGRATION

### **Outil disponible** : `/refactor-scss`

**Commande** :

```bash
/refactor-scss <chemin-fichier.scss>
```

**Exemple** :

```bash
/refactor-scss src/components/shared/modal/Modal.scss
```

**L'agent fera** :

1. ✅ Lecture fichier SCSS
2. ✅ Détection hardcodes
3. ✅ Remplacement par tokens (`color()`, `spacing()`, etc.)
4. ✅ Validation syntaxe Sass
5. ✅ Suggestions améliorations

---

### **Workflow par composant** :

```bash
# 1. Migrer le composant
/refactor-scss src/components/shared/modal/Modal.scss

# 2. Vérifier compilation
pnpm dev  # Hot reload SCSS automatique

# 3. Tester visuellement
# Ouvrir navigateur → Tester le composant Modal

# 4. Commit si OK
git add src/components/shared/modal/Modal.scss
git commit -m "refactor(modal): migration tokens-first

- Hardcodes éliminés : 5
- max-width: 500px → size('modal-md')
- padding: 20px → spacing('md')
- etc."

# 5. Passer au suivant
```

---

## 📈 MÉTRIQUES CIBLES PHASE 6

| Métrique                 | Avant Phase 6 | Cible      | Réduction |
| ------------------------ | ------------- | ---------- | --------- |
| **Total hardcodes**      | 219           | **< 70**   | **-68%**  |
| **Composants conformes** | 0/43 (0%)     | **30+/43** | **70%+**  |
| **RGB/Hex colors**       | ~80           | **< 20**   | **-75%**  |
| **PX spacing**           | ~130          | **< 40**   | **-69%**  |

**Objectif minimal** : ✅ **70% hardcodes éliminés**
**Objectif optimal** : ✅ **80%+ hardcodes éliminés**

---

## ⏱️ ESTIMATION TEMPS

### **Par composant** :

- Simple (1-3 hardcodes) : **5-10 min**
- Moyen (4-8 hardcodes) : **10-15 min**
- Complexe (9+ hardcodes) : **15-20 min**

### **Total estimé** :

| Session       | Composants        | Temps     |
| ------------- | ----------------- | --------- |
| **Session 1** | 5 critiques       | **2h**    |
| **Session 2** | 10 features       | **3h**    |
| **Session 3** | 15 layout/admin   | **3h**    |
| **TOTAL**     | **30 composants** | **6-10h** |

**Approche** : Migrer par sessions de 2-3h max (éviter fatigue)

---

## ✅ VALIDATION

### **Après chaque migration** :

```bash
✅ pnpm dev              # Hot reload fonctionne
✅ Test visuel composant # Aucune régression UI
✅ Commit individuel     # Traçabilité
```

### **Après Phase 6 complète** :

```bash
✅ pnpm lint:hardcoded   # < 70 hardcodes restants
✅ pnpm build            # Build production OK
✅ pnpm test:e2e         # Tests E2E passent
✅ Visual regression     # Aucune casse UI
```

---

## 🎯 CRITÈRES DE SUCCÈS PHASE 6

### **Critères obligatoires** ✅

1. ✅ **70%+ hardcodes éliminés** (219 → < 70)
2. ✅ **30+ composants migrés** (70% des 43 fichiers)
3. ✅ **Aucune régression visuelle** (tests E2E passent)
4. ✅ **Build production OK** (`pnpm build` réussit)
5. ✅ **Hot reload fonctionne** (workflow développeur préservé)

### **Critères optionnels** 🎁

6. 🎁 **80%+ hardcodes éliminés** (219 → < 45)
7. 🎁 **40+ composants migrés** (93% des fichiers)
8. 🎁 **Documentation composants** (exemples tokens)

---

## 📚 RESSOURCES

### **Documentation** :

- `refactor-css/refactor-philosophy.md` - Règles tokens-first
- `refactor-css/refactor-contract.md` - Plan global refactoring
- `refactor-css/scss-architecture.md` - Architecture tokens
- `src/styles/abstracts/_tokens.scss` - Source de vérité tokens

### **Commandes** :

- `/refactor-scss <fichier>` - Migrer un composant
- `pnpm lint:hardcoded` - Vérifier hardcodes
- `pnpm dev` - Hot reload SCSS

### **Agents** :

- `.claude/agents/scss-refactor.md` - Expert design system

---

## 🚀 DÉMARRAGE PHASE 6

### **Prêt à commencer ?**

**Première étape suggérée** :

```bash
/refactor-scss src/components/shared/modal/Modal.scss
```

**Pourquoi Modal en premier ?**

- ✅ Utilisé partout (fort impact)
- ✅ 5+ hardcodes (résultats visibles)
- ✅ Composant critique (priorité haute)

**Après Modal** : Continuer avec Dropdown, Avatar, Forms (priorité 1)

---

## 📊 TRACKING PROGRÈS

**Créer un tableau de suivi** :

| Composant | Hardcodes avant | Hardcodes après | Statut | Commit  |
| --------- | --------------- | --------------- | ------ | ------- |
| Modal     | 5+              | 0               | ✅     | abc1234 |
| Dropdown  | 4               | 0               | ✅     | def5678 |
| Avatar    | 15+             | 0               | ✅     | ghi9012 |
| ...       | ...             | ...             | ...    | ...     |

**Total** : 0/30 complétés (0%)

---

## ✅ CONCLUSION

**Phase 6 prête à démarrer** 🚀

- ✅ Plan établi (43 composants identifiés)
- ✅ Priorités définies (critique → optionnel)
- ✅ Outils disponibles (`/refactor-scss`)
- ✅ Workflow validé (migrer → tester → commit)
- ✅ Métriques claires (70%+ hardcodes éliminés)

**Temps estimé** : 6-10h sur 3 sessions

**Prochaine action** : Lancer `/refactor-scss` sur premier composant prioritaire

---

**Plan généré le** : 2025-01-XX
**Auteur** : Claude Code
**Contexte** : Refactoring Design System - Phase 6 Composants
**Statut** : 📋 **PRÊT À DÉMARRER**
