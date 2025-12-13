# 📊 Rapport Migration SCSS Tokens-First - Appli-Picto

**Date** : 2025-12-13
**Branche** : `refactor/styles/tokens-first`
**Phase** : 1 (Tokens & Architecture) ✅ COMPLÉTÉE

---

## ✅ Phase 1 - Architecture Tokens (TERMINÉE)

### Fichiers Créés
- ✅ `src/styles/abstracts/_a11y-tokens.scss` (138 lignes)
- ✅ `src/styles/abstracts/_container-queries.scss` (256 lignes)
- ✅ `scripts/check-hardcoded.js` (273 lignes)
- ✅ `scripts/check-touch-targets.js` (243 lignes)

### Modifications
- ✅ Mixins A11Y : `touch-target()`, `non-invasive-focus()`
- ✅ Marqueurs DEPRECATED sur `_variables.scss` et `_theme-vars.scss`
- ✅ Scripts npm : `lint:hardcoded`, `validate:touch-targets`

### Validation
- ✅ Build Next.js : **SUCCÈS** (76s)
- ✅ Lint + Format : **SUCCÈS** (0 errors)
- ✅ Architecture : **100% conforme** plan tokens-first

---

## 📊 État Actuel - Hardcodes Détectés

### Statistiques Globales

```
📊 Résumé scan (pnpm lint:hardcoded) :
   - Fichiers SCSS scannés : 99
   - Fichiers avec hardcodes : 56 (56.5%)
   - Total hardcodes détectés : 535
```

### Répartition par Type

| Type | Nombre | % |
|------|--------|---|
| **PX Spacing** | ~520 | 97% |
| **RGB Colors** | ~10 | 2% |
| **Hex Colors** | ~5 | 1% |

### Top 10 Fichiers (plus de hardcodes)

1. **src/page-components/tableau/Tableau.scss** : 38 occurrences
2. **src/components/layout/navbar/Navbar.scss** : 35 occurrences
3. **src/components/layout/bottom-nav/BottomNav.scss** : 28 occurrences
4. **src/components/layout/user-menu/UserMenu.scss** : 27 occurrences
5. **src/components/features/consent/CookiePreferences.scss** : 22 occurrences
6. **src/page-components/edition/Edition.scss** : 20 occurrences
7. **src/components/features/admin/AccountManagement.scss** : 17 occurrences
8. **src/components/features/admin/QuotaManagement.scss** : 12 occurrences
9. **src/components/shared/modal/Modal.scss** : 11 occurrences
10. **src/components/ui/button/Button.scss** : 10 occurrences

---

## 🎯 Phase 2 - Migration Composants (PLANIFIÉE)

### Objectif
Migrer les **535 hardcodes** vers le système tokens-first.

### Stratégie de Migration (Priorités)

#### **Priorité 1 : Layout & Navigation** (High Impact)
Fichiers critiques utilisés partout :
- [ ] `layout/navbar/Navbar.scss` (35 hardcodes)
- [ ] `layout/bottom-nav/BottomNav.scss` (28 hardcodes)
- [ ] `layout/user-menu/UserMenu.scss` (27 hardcodes)
- [ ] `shared/layout/Layout.scss` (2 hardcodes)

**Impact** : ~90 hardcodes | **Bénéfice** : Cohérence navigation

---

#### **Priorité 2 : Pages Principales** (User-Facing)
Pages à forte visibilité :
- [ ] `page-components/tableau/Tableau.scss` (38 hardcodes)
- [ ] `page-components/edition/Edition.scss` (20 hardcodes)
- [ ] `page-components/profil/Profil.scss` (12 hardcodes)
- [ ] `page-components/abonnement/Abonnement.scss` (8 hardcodes)

**Impact** : ~78 hardcodes | **Bénéfice** : UX cohérente

---

#### **Priorité 3 : Composants UI Réutilisables** (Design System)
Composants utilisés partout :
- [ ] `ui/button/Button.scss` (10 hardcodes)
- [ ] `ui/input/Input.scss` (8 hardcodes)
- [ ] `ui/select/Select.scss` (6 hardcodes)
- [ ] `shared/modal/Modal.scss` (11 hardcodes)
- [ ] `shared/card/base-card/BaseCard.scss` (5 hardcodes)

**Impact** : ~40 hardcodes | **Bénéfice** : Design system unifié

---

#### **Priorité 4 : Features Métier** (Business Logic)
- [ ] `features/taches/taches-dnd/TachesDnd.scss` (15 hardcodes)
- [ ] `features/recompenses/recompenses-edition/RecompensesEdition.scss` (10 hardcodes)
- [ ] `features/admin/AccountManagement.scss` (17 hardcodes)
- [ ] `features/admin/QuotaManagement.scss` (12 hardcodes)

**Impact** : ~54 hardcodes | **Bénéfice** : Maintenance facilitée

---

#### **Priorité 5 : Features Accessoires** (Low Priority)
- [ ] `features/consent/CookiePreferences.scss` (22 hardcodes)
- [ ] `features/consent/CookieBanner.scss` (11 hardcodes)
- [ ] `features/legal/legal-markdown/LegalMarkdown.scss` (8 hardcodes)

**Impact** : ~41 hardcodes | **Bénéfice** : Complétude

---

### Plan de Migration (Recommandé)

#### **Sprint 1 : Layout (2-3h)**
Migrer navigation + layout → Impact immédiat sur cohérence

```scss
// AVANT (hardcodé)
padding: 10px 16px;
gap: 8px;

// APRÈS (tokens)
padding: spacing('10') spacing('16');
gap: spacing('8');
```

#### **Sprint 2 : Pages (3-4h)**
Migrer Tableau + Edition → UX uniforme

```scss
// AVANT
max-width: 1200px;
margin-bottom: 24px;

// APRÈS
max-width: spacing('1200');
margin-bottom: spacing('24');
```

#### **Sprint 3 : Components UI (2-3h)**
Migrer Button, Input, Modal → Design system clean

```scss
// AVANT
padding: 12px 20px;
border-radius: 8px;

// APRÈS
padding: spacing('12') spacing('20');
border-radius: radius('md');
```

#### **Sprint 4 : Features (3-4h)**
Migrer features métier → Maintenance long-terme

#### **Sprint 5 : Cleanup (1-2h)**
- Derniers hardcodes accessoires
- Suppression `_variables.scss` DEPRECATED
- Validation finale

---

## 🔧 Commandes Utiles

### Détecter Hardcodes
```bash
pnpm lint:hardcoded              # Liste tous les hardcodes
pnpm lint:hardcoded > report.txt # Export vers fichier
```

### Vérifier Touch Targets
```bash
pnpm validate:touch-targets      # Vérifie WCAG AA
```

### Build & Test
```bash
pnpm build                       # Compilation
pnpm check                       # Lint + Format
pnpm verify:quick                # Validation rapide
```

---

## 📝 Patterns de Migration

### Spacing (PX → Tokens)

```scss
// ❌ AVANT (hardcodé)
padding: 16px 24px;
margin-bottom: 12px;
gap: 8px;

// ✅ APRÈS (tokens)
padding: spacing('16') spacing('24');
margin-bottom: spacing('12');
gap: spacing('8');
```

### Colors (RGB/Hex → Tokens)

```scss
// ❌ AVANT
background: rgba($color-primary, 0.5);
border: 1px solid #e0e0e0;

// ✅ APRÈS
background: color.change(color('primary'), $alpha: 0.5);
border: 1px solid gray(300);
```

### Touch Targets (Hardcoded → Mixin)

```scss
// ❌ AVANT
min-height: 44px;
min-width: 44px;

// ✅ APRÈS
@include touch-target('min');  // 44px WCAG AA
// OU
@include touch-target();       // 56px TSA preferred
```

---

## ⚠️ Points d'Attention

### Compatibilité
- ✅ Ne pas casser l'apparence actuelle (pixel-perfect)
- ✅ Tester sur mobile ET desktop après chaque migration
- ✅ Vérifier animations TSA (<0.3s)

### Progressivité
- ✅ Migrer fichier par fichier (pas tout d'un coup)
- ✅ Commit après chaque groupe de fichiers
- ✅ Valider `pnpm build` après chaque commit

### Performance
- ✅ Les tokens n'impactent PAS les perfs runtime
- ✅ Tokens = variables SCSS compilées → CSS final identique

---

## 📅 Timeline Estimée

| Phase | Durée | Description |
|-------|-------|-------------|
| **Sprint 1** | 2-3h | Layout + Navigation (90 hardcodes) |
| **Sprint 2** | 3-4h | Pages principales (78 hardcodes) |
| **Sprint 3** | 2-3h | Components UI (40 hardcodes) |
| **Sprint 4** | 3-4h | Features métier (54 hardcodes) |
| **Sprint 5** | 1-2h | Cleanup + validation (reste ~270) |
| **TOTAL** | **12-16h** | Migration complète 535 hardcodes |

---

## 🎯 Success Metrics

### Objectifs Phase 2
- [ ] **0 hardcodes** détectés par `pnpm lint:hardcoded`
- [ ] **100% composants** utilisent tokens/wrappers
- [ ] **Aucun changement visuel** (pixel-perfect)
- [ ] **Build + tests** passent (0 errors)
- [ ] **Suppression** `_variables.scss` DEPRECATED

### Bénéfices Attendus
- ✅ **Maintenance** : 1 changement = partout
- ✅ **Cohérence** : Design system unifié
- ✅ **Accessibilité** : WCAG 2.2 AA garanti
- ✅ **Performance** : Aucun impact runtime
- ✅ **DX** : Auto-completion tokens IDE

---

## 📚 Références

- Plan complet : `styles_refactor_instructions_for_claude.md`
- Tokens source : `src/styles/abstracts/_tokens.scss`
- A11Y tokens : `src/styles/abstracts/_a11y-tokens.scss`
- Scripts : `scripts/check-hardcoded.js`, `scripts/check-touch-targets.js`

---

**Status** : ✅ Phase 1 COMPLÉTÉE | ⏳ Phase 2 PRÊTE À DÉMARRER

**Prochaine Action** : Démarrer Sprint 1 (Layout + Navigation) ou attendre validation
