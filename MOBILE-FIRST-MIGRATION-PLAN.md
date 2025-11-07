# Plan de Migration Mobile-First - Phase 1

## Audit Terminé ✅

**85 problèmes critiques détectés** :

- 14 occurrences de `respond-to(xs)` dans 6 fichiers
- 71 animations > 150ms (TSA accessibility)

## Phase 1 : Corriger respond-to(xs) → Mobile-First

### Ordre de Migration (du plus simple au plus complexe)

#### 1. Layout.scss (1 occurrence) - 10min

**Fichier** : [src/components/shared/layout/Layout.scss](src/components/shared/layout/Layout.scss)

**Action** : Inverser la logique - styles mobile en base, desktop en @include respond-to(sm)

**Test** : Build + vérification visuelle layout

---

#### 2. LangSelector.scss (2 occurrences) - 15min

**Fichier** : [src/components/shared/lang-selector/LangSelector.scss](src/components/shared/lang-selector/LangSelector.scss)

**Action** : Mobile-first pour le sélecteur de langue

**Test** : Build + test clics sur sélecteur mobile/desktop

---

#### 3. ThemeToggle.scss (2 occurrences) - 15min

**Fichier** : [src/components/shared/theme-toggle/ThemeToggle.scss](src/components/shared/theme-toggle/ThemeToggle.scss)

**Action** : Mobile-first pour le toggle thème

**Test** : Build + test toggle dark/light mode

---

#### 4. TachesDnd.scss (2 occurrences) - 20min

**Fichier** : [src/components/features/taches/taches-dnd/TachesDnd.scss](src/components/features/taches/taches-dnd/TachesDnd.scss)

**Action** : Mobile-first pour la grille de tâches

**Test** : Build + test drag & drop mobile + desktop

---

#### 5. SelectedRecompense.scss (3 occurrences) - 20min

**Fichier** : [src/components/features/recompenses/selected-recompense/SelectedRecompense.scss](src/components/features/recompenses/selected-recompense/SelectedRecompense.scss)

**Action** : Mobile-first pour la récompense sélectionnée

**Test** : Build + test affichage récompense

---

#### 6. NotFound.scss (4 occurrences) - 20min

**Fichier** : [src/pages/not-found/NotFound.scss](src/pages/not-found/NotFound.scss)

**Action** : Mobile-first pour la page 404

**Test** : Build + test page /404

---

**Total Phase 1** : ~2h (avec tests)

## Phase 2 : Corriger Animations TSA (71 occurrences)

### Règle

Toutes les animations doivent être ≤ 150ms pour l'accessibilité TSA (autisme).

### Fichiers à Corriger (par priorité)

#### Haute Priorité (Composants UI de base)

1. **Input.scss** (1 occurrence) - transition: 0.2s → 0.15s
2. **Checkbox.scss** (si concerné)
3. **Button.scss** (si concerné)

#### Priorité Moyenne (Composants Shared)

4. **Modal.scss** et variantes (3 occurrences)
5. **QuotaIndicator.scss** (2 occurrences)
6. **SignedImage.scss** (2 occurrences)
7. **AvatarProfil.scss** (1 occurrence)
8. **Forms/ItemForm.scss** (1 occurrence)

#### Priorité Basse (Admin & Tools)

9. **PermissionsDebug.scss** (5 occurrences)
10. **QuotaManagement.scss** (4 occurrences)
11. **AccountManagement.scss** (4 occurrences)

### Script de Correction Automatique

```bash
# Remplacer toutes les animations >150ms
find src -name "*.scss" -type f -exec sed -i '' 's/transition: all 0\.2s/transition: all 0.15s/g' {} \;
find src -name "*.scss" -type f -exec sed -i '' 's/transition: all 0\.3s/transition: all 0.15s/g' {} \;
find src -name "*.scss" -type f -exec sed -i '' 's/transition: opacity 0\.2s/transition: opacity 0.15s/g' {} \;
find src -name "*.scss" -type f -exec sed -i '' 's/transition: width 0\.3s/transition: width 0.15s/g' {} \;
find src -name "*.scss" -type f -exec sed -i '' 's/transition: transform 200ms/transition: transform 150ms/g' {} \;
find src -name "*.scss" -type f -exec sed -i '' 's/transition: background 150ms/transition: background 150ms/g' {} \; # OK
find src -name "*.scss" -type f -exec sed -i '' 's/transition: stroke 0\.3s/transition: stroke 0.15s/g' {} \;
find src -name "*.scss" -type f -exec sed -i '' 's/transition: outline-color 0\.2s/transition: outline-color 0.15s/g' {} \;
find src -name "*.scss" -type f -exec sed -i '' 's/transition: border-color 0\.2s/transition: border-color 0.15s/g' {} \;
find src -name "*.scss" -type f -exec sed -i '' 's/transition: background-color 0\.2s/transition: background-color 0.15s/g' {} \;
```

**Total Phase 2** : ~1h (script automatique + vérification)

---

## Workflow de Migration

### Pour chaque fichier

```bash
# 1. Créer une branche
git checkout -b fix/mobile-first-[composant]

# 2. Modifier le fichier SCSS
# ... changements mobile-first ...

# 3. Build
yarn build

# 4. Test visuel
yarn dev
# Tester le composant sur 320px, 576px, 768px, 992px, 1200px

# 5. Commit
git add [fichier]
git commit -m "fix([composant]): migrate to mobile-first approach"

# 6. Merge dans main
git checkout main
git merge fix/mobile-first-[composant]

# 7. Push
git push origin main
```

### Ou en Mode Rapide (Tous d'un coup)

```bash
# 1. Créer branche unique
git checkout -b fix/mobile-first-all-components

# 2. Corriger tous les fichiers respond-to(xs)
# ... changements ...

# 3. Build + tests
yarn build
yarn dev # Tests manuels

# 4. Commit atomique
git add src/
git commit -m "fix(scss): migrate all components to mobile-first

- Layout, LangSelector, ThemeToggle: mobile-first breakpoints
- TachesDnd: mobile-first grid
- SelectedRecompense: mobile-first sizing
- NotFound: mobile-first 404 page

BREAKING CHANGE: None
TESTED: yarn build ✅ | Manual testing ✅"

# 5. Merge et push
git checkout main
git merge fix/mobile-first-all-components
git push origin main
```

## Commandes de Test

```bash
# Build
yarn build

# Dev server
yarn dev

# Lint + format
yarn check

# Tests unitaires
yarn test

# Tests E2E (si disponibles)
yarn test:e2e
```

## Checklist de Validation

### Pour chaque composant migré

- [ ] Build réussit sans erreurs
- [ ] Aucune régression visuelle sur desktop (≥992px)
- [ ] Apparence correcte sur mobile (320px-575px)
- [ ] Apparence correcte sur tablette (576px-991px)
- [ ] Transitions ≤ 150ms (si animations présentes)
- [ ] Pas d'erreurs console
- [ ] Tests manuels OK

### Tests finaux (après tous les composants)

- [ ] Lighthouse score ≥ 90 (Performance, A11y, Best Practices, SEO)
- [ ] Test complet workflow utilisateur
- [ ] Test responsive complet (5 breakpoints)
- [ ] Test avec screen reader (optionnel)
- [ ] Commit et push sur main

## Estimation Totale

- **Phase 1 (respond-to(xs))** : 2h
- **Phase 2 (animations)** : 1h
- **Tests finaux** : 30min

**Total** : ~3h30

## Prochaines Étapes (Après Phase 1-2)

1. **Tests automatisés Playwright + axe-core** (4h)
2. **Optimisations bundle size** (2h)
3. **Code splitting** (2h)
4. **Documentation finale** (1h)

**Grand Total** : ~12h30
