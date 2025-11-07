# Guide de migration mobile-first - Appli Picto

Ce guide vous accompagne dans la transformation de l'application en architecture mobile-first, en suivant le plan détaillé dans `PLAN-MIGRATION-MOBILE-FIRST-V2.md`.

## 🎯 Objectifs

- **Mobile-first**: Base mobile (320px+), progressive enhancement pour desktop
- **TSA-optimized**: Animations ≤150ms, touch targets 48×48px minimum
- **Pas de modification visuelle**: Même apparence, meilleure architecture
- **Testable à chaque étape**: Aucune régression permise

## 📋 Prérequis

- Node 20.19.4 (via Volta)
- Yarn PnP configuré
- Git avec branche propre
- Temps estimé: **80 heures** (10 semaines à 8h/semaine)

## 🚀 Démarrage rapide

### 1. Lancer l'audit automatique

```bash
# Exécuter le script d'audit
./scripts/audit-scss.sh

# Consulter le rapport
cat audit-scss-report.csv
```

Le rapport CSV identifie :

- ❌ **CRITICAL**: Bloquants (respond-to(xs), animations >150ms)
- ⚠️ **URGENT**: Importantes (max-width, touch targets <48px)
- ℹ️ **IMPORTANT**: À traiter (lazy loading, focus states)

### 2. Analyser les résultats

Ouvrir `audit-scss-report.csv` dans un tableur :

| Priorité | Catégorie       | Fichier            | Ligne | Problème              | Contexte                  |
| -------- | --------------- | ------------------ | ----- | --------------------- | ------------------------- |
| CRITICAL | respond-to(xs)  | src/components/... | 42    | Breakpoint xs utilisé | @include respond-to('xs') |
| CRITICAL | Animation lente | src/styles/...     | 18    | Animation >150ms      | transition: all 0.3s      |

**Questions à se poser** :

- Combien de `respond-to(xs)` ? (indique ampleur du travail)
- Combien d'animations lentes ? (risque TSA)
- Y a-t-il des touch targets <48px sur éléments critiques ? (utilisabilité)

### 3. Créer la branche de travail

```bash
# Créer branche audit
git checkout -b audit/mobile-first

# Confirmer le statut
git status
```

### 4. Corriger les problèmes critiques (ÉTAPE 1)

#### Option A : Correction automatique de respond-to(xs)

```bash
# Lancer le script de correction
./scripts/fix-respond-to-xs.sh

# Vérifier les changements
git diff

# Tester l'application
yarn dev
# → Ouvrir http://localhost:5173
# → Tester sur mobile (DevTools > Toggle device toolbar)
# → Vérifier que rien n'a cassé visuellement
```

**⚠️ Si quelque chose casse** :

```bash
# Restaurer depuis le backup
cp -r backup-xs-YYYYMMDD-HHMMSS/src/* src/

# Ou annuler les commits
git reset --hard HEAD~1
```

#### Option B : Correction manuelle

Pour chaque fichier identifié dans le rapport :

**AVANT** (incorrect) :

```scss
.navbar {
  display: flex;
  height: 64px;

  @include respond-to('xs') {
    flex-direction: column;
    height: auto;
  }
}
```

**APRÈS** (mobile-first) :

```scss
.navbar {
  // Base = mobile (320px+)
  display: flex;
  flex-direction: column;
  height: auto;

  // Desktop = enhancement
  @include respond-to('sm') {
    flex-direction: row;
    height: 64px;
  }
}
```

#### Corriger les animations lentes

**AVANT** :

```scss
.button {
  transition: all 0.3s ease; // ❌ 300ms = trop lent pour TSA
}
```

**APRÈS** :

```scss
.button {
  transition: all 0.15s ease; // ✅ 150ms = TSA-safe

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.01ms !important;
  }
}
```

### 5. Mettre à jour les variables SCSS

Éditer `src/styles/abstracts/_variables.scss` :

```scss
// Animations TSA-optimized
$anim-instant: 0.05s; // Feedback immédiat
$anim-fast: 0.15s; // Par défaut (TSA-safe)
$anim-normal: 0.25s; // Cas exceptionnels
$anim-slow: 0.4s; // Transitions majeures uniquement

// Touch targets TSA-optimized
$touch-target-min: 48px; // Recommandé (Apple HIG / Material)
$touch-target-compact: 44px; // WCAG minimum (fallback)
```

### 6. Ajouter les mixins TSA

Créer `src/styles/abstracts/_mixins-tsa.scss` :

```scss
@use 'sass:map';
@use 'variables' as vars;

/// Touch target TSA-optimized
@mixin touch-target($size: vars.$touch-target-min) {
  min-width: $size;
  min-height: $size;
  padding: max(12px, calc(($size - 1em) / 2));

  // Assurer zone cliquable même si contenu plus petit
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: $size;
    min-height: $size;
  }
}

/// Animation TSA-friendly
@mixin tsa-animation(
  $property: all,
  $duration: vars.$anim-fast,
  $easing: ease-out
) {
  transition: $property $duration $easing;

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.01ms !important;
  }
}

/// Focus visible (WCAG 2.2)
@mixin focus-visible($color: var(--color-primary), $width: 3px, $offset: 2px) {
  &:focus {
    outline: none; // Retirer outline par défaut
  }

  &:focus-visible {
    outline: $width solid $color;
    outline-offset: $offset;
    @include tsa-animation(outline-color, vars.$anim-instant);
  }
}
```

### 7. Interdire respond-to('xs')

Modifier `src/styles/abstracts/_mixins.scss` :

```scss
@mixin respond-to($breakpoint) {
  // ❌ Interdire 'xs' - mobile = base (pas de media query)
  @if $breakpoint == 'xs' {
    @error "❌ 'xs' breakpoint interdit ! " +
           "Mobile = base (hors media query). " +
           "Supprimez @include respond-to('xs') et mettez les styles en base.";
  } @else if map.has-key(vars.$breakpoints, $breakpoint) {
    @media (min-width: map.get(vars.$breakpoints, $breakpoint)) {
      @content;
    }
  } @else {
    @error "Breakpoint '#{$breakpoint}' inconnu. " +
           "Breakpoints disponibles: #{map.keys(vars.$breakpoints)}";
  }
}
```

### 8. Tester les corrections

```bash
# Linter (doit passer)
yarn lint

# Tests unitaires (doivent passer)
yarn test

# Build (doit réussir)
yarn build

# Vérification manuelle
yarn dev
```

**Checklist de test** :

- [ ] Navbar s'affiche correctement sur mobile (DevTools 375px)
- [ ] Navbar s'affiche correctement sur desktop (1920px)
- [ ] Aucune animation ne dépasse 150ms
- [ ] Tous les boutons sont cliquables facilement au doigt (48×48px min)
- [ ] Aucun élément ne déborde horizontalement sur mobile
- [ ] Les focus states sont visibles (Tab navigation)

### 9. Commit des corrections

```bash
# Si tout est OK
git add .
git commit -m "fix(mobile-first): correct respond-to(xs) usage and TSA animations

- Remove all respond-to('xs') mixins (mobile = base)
- Reduce animations to ≤150ms (TSA-safe)
- Add prefers-reduced-motion support
- Update touch targets to 48px minimum
- Add TSA-optimized mixins

BREAKING CHANGE: respond-to('xs') now throws error
"

# Push la branche
git push -u origin audit/mobile-first
```

## 📊 Suivi de progression

Utiliser ce tableau pour suivre l'avancement :

| Étape                              | Durée   | Statut | Date |
| ---------------------------------- | ------- | ------ | ---- |
| ÉTAPE 0: Audit                     | 3h      | ⏳     |      |
| ÉTAPE 1: Corrections pré-migration | 6h      | ⏳     |      |
| ÉTAPE 2: Tests automatisés         | 8h      | ⏳     |      |
| ÉTAPE 3: Variables & mixins        | 4h      | ⏳     |      |
| ÉTAPE 4: Composants UI             | 10h     | ⏳     |      |
| ÉTAPE 5: Cards                     | 8h      | ⏳     |      |
| ÉTAPE 6: Layout & navigation       | 6h      | ⏳     |      |
| ÉTAPE 7: Pages                     | 12h     | ⏳     |      |
| ÉTAPE 8: Optimisations             | 8h      | ⏳     |      |
| ÉTAPE 9: CI/CD                     | 4h      | ⏳     |      |
| **TOTAL**                          | **80h** |        |      |

Statuts :

- ⏳ En attente
- 🔄 En cours
- ✅ Terminé
- ❌ Bloqué

## 🆘 En cas de problème

### Le script d'audit plante

```bash
# Vérifier les permissions
ls -la scripts/audit-scss.sh

# Rendre exécutable si nécessaire
chmod +x scripts/audit-scss.sh

# Lancer avec bash explicitement
bash scripts/audit-scss.sh
```

### Les styles sont cassés après correction

```bash
# Restaurer depuis backup
cp -r backup-xs-YYYYMMDD-HHMMSS/src/* src/

# OU annuler le commit
git reset --hard HEAD~1

# Puis corriger manuellement fichier par fichier
```

### L'app ne compile plus

```bash
# Vérifier les erreurs SCSS
yarn dev
# → Lire l'erreur dans le terminal

# Erreur commune : mixin respond-to non trouvé
# → Vérifier l'import dans le fichier .scss concerné
@use '@styles/abstracts/mixins' as *;
```

### Des tests échouent

```bash
# Lancer les tests en mode watch
yarn test:ui

# Identifier le test qui échoue
# → Vérifier si c'est lié à vos changements CSS
# → Mettre à jour les snapshots si nécessaire
yarn test -u
```

## 📚 Ressources

- **Plan détaillé** : `PLAN-MIGRATION-MOBILE-FIRST-V2.md`
- **Analyse initiale** : `mobile-first-analysis.md`
- **Scripts** :
  - `scripts/audit-scss.sh` - Audit automatique
  - `scripts/fix-respond-to-xs.sh` - Correction automatique
- **Documentation Claude** : `CLAUDE.md`

## 🎓 Références externes

- [WCAG 2.2 - Touch Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Apple HIG - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/layout#Best-practices)
- [Material Design - Touch Targets](https://m3.material.io/foundations/accessible-design/accessibility-basics#28032e45-c598-450c-b355-f9fe737b1cd8)
- [Sass @error directive](https://sass-lang.com/documentation/at-rules/error)
- [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

## ❓ Questions fréquentes

**Q: Combien de temps va prendre la migration ?**
A: 80 heures réparties sur 10 semaines (8h/semaine). C'est progressif et testable.

**Q: Vais-je casser l'application ?**
A: Non, si vous suivez le plan étape par étape et testez à chaque commit.

**Q: Puis-je annuler la migration ?**
A: Oui, chaque étape est un commit Git distinct. Utilisez `git revert` ou `git reset`.

**Q: Que faire si je trouve plus de 50 respond-to(xs) ?**
A: Utiliser le script de correction automatique `fix-respond-to-xs.sh`, puis tester manuellement.

**Q: Dois-je vraiment faire 48px pour les touch targets ?**
A: Oui, pour TSA. 44px (WCAG minimum) peut être difficile pour utilisateurs avec motricité réduite.

**Q: Puis-je garder certaines animations à 300ms ?**
A: Uniquement pour transitions majeures (changement de page), et avec `prefers-reduced-motion`.

---

**Dernière mise à jour** : 2025-11-05
**Contact** : Voir CLAUDE.md pour instructions de développement
