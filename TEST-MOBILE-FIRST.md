# Tests Mobile-First - Branche fix/mobile-first-all-components

## 🎯 Objectif

Tester les 6 composants migrés vers mobile-first pour s'assurer qu'il n'y a pas de régression visuelle.

## ✅ État Actuel

- **Branche** : `fix/mobile-first-all-components`
- **Build** : ✅ Réussi
- **Commit** : `0917255`
- **Fichiers modifiés** : 6
- **Lignes modifiées** : +132 -97

## 📋 Composants Migrés

### 1. Layout (padding global)

**Fichier** : [src/components/shared/layout/Layout.scss](src/components/shared/layout/Layout.scss)
**Changement** : padding mobile (1rem) → desktop (2rem)

### 2. LangSelector (sélecteur de langue)

**Fichier** : [src/components/shared/lang-selector/LangSelector.scss](src/components/shared/lang-selector/LangSelector.scss)
**Changement** : Colonne mobile → Rangée desktop

### 3. ThemeToggle (toggle dark/light)

**Fichier** : [src/components/shared/theme-toggle/ThemeToggle.scss](src/components/shared/theme-toggle/ThemeToggle.scss)
**Changement** : 36px mobile → 40px desktop

### 4. TachesDnd (grille de tâches)

**Fichier** : [src/components/features/taches/taches-dnd/TachesDnd.scss](src/components/features/taches/taches-dnd/TachesDnd.scss)
**Changement** : Grille 100px mobile → 200px desktop

### 5. SelectedRecompense (récompense sélectionnée)

**Fichier** : [src/components/features/recompenses/selected-recompense/SelectedRecompense.scss](src/components/features/recompenses/selected-recompense/SelectedRecompense.scss)
**Changement** : 100px mobile → 300px desktop

### 6. NotFound (page 404)

**Fichier** : [src/pages/not-found/NotFound.scss](src/pages/not-found/NotFound.scss)
**Changement** : Petites polices mobile → Grandes desktop

## 🧪 Scénarios de Test

### Test 1 : Layout Global (toutes pages)

**Viewport** : 320px, 576px, 1200px

1. Naviguer sur `/tableau`
2. Vérifier le padding du contenu principal
   - Mobile (320px) : padding réduit ✅
   - Desktop (1200px) : padding normal ✅

### Test 2 : Sélecteur de Langue

**Viewport** : 320px, 576px, 1200px
**Localisation** : Navbar (en haut à droite)

1. Cliquer sur le sélecteur de langue
2. Vérifier la disposition
   - Mobile (320px) : Boutons empilés verticalement ✅
   - Desktop (1200px) : Boutons côte à côte ✅

### Test 3 : Toggle Thème

**Viewport** : 320px, 576px, 1200px
**Localisation** : Navbar (icône soleil/lune)

1. Mesurer la taille du bouton (DevTools)
   - Mobile (320px) : 36x36px ✅
   - Desktop (1200px) : 40x40px ✅

### Test 4 : Grille de Tâches (CRITIQUE)

**Viewport** : 320px, 576px, 768px, 1200px
**Localisation** : `/tableau`

1. Créer 6 tâches dans `/edition` (cocher "Aujourd'hui")
2. Aller sur `/tableau`
3. Vérifier la grille
   - Mobile (320px) : Cards petites, grille serrée ✅
   - Tablet (768px) : Cards moyennes ✅
   - Desktop (1200px) : Cards grandes ✅
4. Tester le drag & drop
   - Mobile : Fonctionne au touch ✅
   - Desktop : Fonctionne à la souris ✅
5. Cocher/décocher des tâches
   - Checkboxes cliquables ✅

### Test 5 : Récompense Sélectionnée

**Viewport** : 320px, 576px, 1200px
**Localisation** : `/tableau` (si récompense active)

1. Aller sur `/edition` → Récompenses
2. Sélectionner une récompense
3. Retourner sur `/tableau`
4. Vérifier la taille de l'affichage récompense
   - Mobile (320px) : Petite (100px) ✅
   - Desktop (1200px) : Grande (300px) ✅

### Test 6 : Page 404

**Viewport** : 320px, 576px, 1200px
**Localisation** : `/404` ou URL invalide

1. Naviguer vers `/azerty` (page inexistante)
2. Vérifier les tailles de police
   - Mobile (320px) : Petites polices ✅
   - Desktop (1200px) : Grandes polices ✅

## ✅ Checklist Finale

### Responsive (5 breakpoints)

- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone 12)
- [ ] 576px (breakpoint sm)
- [ ] 768px (tablet)
- [ ] 992px (desktop)
- [ ] 1200px (large desktop)

### Fonctionnalités

- [ ] Drag & drop fonctionne (Tableau)
- [ ] Checkboxes cliquables (Tableau)
- [ ] Toggle thème fonctionne
- [ ] Sélecteur langue fonctionne
- [ ] Navigation fluide
- [ ] Pas d'erreurs console

### Visuel

- [ ] Pas de débordement horizontal
- [ ] Textes lisibles sur mobile
- [ ] Images adaptées aux écrans
- [ ] Espacements cohérents
- [ ] Aucun élément coupé

## 🐛 Si Problème Détecté

**Option 1 : Rollback**

```bash
git checkout main
# Tout revient à l'état d'avant
```

**Option 2 : Fix Incrémental**

```bash
# Rester sur fix/mobile-first-all-components
# Identifier le fichier problématique
# Le corriger
git add [fichier]
git commit -m "fix: [description]"
```

**Option 3 : Merge si OK**

```bash
git checkout main
git merge fix/mobile-first-all-components
git push origin main
```

## 🚀 Commandes Utiles

### Lancer les tests

```bash
# Dev server (déjà lancé sur port 5174)
yarn dev

# Build production
yarn build

# Lint + format
yarn check
```

### DevTools Responsive

1. F12 ou Cmd+Option+I
2. Cliquer sur l'icône responsive (Cmd+Shift+M)
3. Sélectionner un appareil ou entrer une largeur custom

### Tester Rapidement Plusieurs Viewports

**Chrome/Edge** : Dimensions Responsive → Ajouter appareils custom

- 320x568 (Mobile XS)
- 375x667 (Mobile S)
- 576x768 (Breakpoint SM)
- 768x1024 (Tablet)
- 992x768 (Desktop S)
- 1200x800 (Desktop M)

## 📊 Résultats Attendus

### Mobile (320-575px)

- ✅ Layout compact
- ✅ Police réduite
- ✅ Touch-friendly (min 44px)
- ✅ Une colonne

### Desktop (576px+)

- ✅ Layout spacieux
- ✅ Police normale/grande
- ✅ Grille multi-colonnes
- ✅ Hover effects

## 🎯 Prochaine Étape (si tests OK)

**Phase 2** : Corriger les 71 animations >150ms

- Script automatique disponible
- ~1h de travail
- Améliore l'accessibilité TSA

Voulez-vous que je :

1. **Merge cette branche** si tests OK
2. **Continue avec Phase 2** (animations)
3. **Autre chose**
