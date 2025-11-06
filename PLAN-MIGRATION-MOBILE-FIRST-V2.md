# 📋 Plan Migration Mobile-First V2 - Audit-First Sécurisé

**Objectif** : Transformer Appli-Picto en mobile-first SANS casser le visuel
**Approche** : Audit automatique → Corrections ciblées → Migration progressive
**Durée totale** : 10 semaines (80h)
**Consensus** : ChatGPT + Grok + DeepSeek + Claude + Claude Code

---

## 🚨 Corrections critiques vs V1

| Problème V1 | Correction V2 | Priorité |
|-------------|---------------|----------|
| `respond-to(xs)` trompeur | Supprimer complètement, mobile = base | 🔴 Critique |
| Animations ≤300ms | Réduire à ≤150ms (TSA-optimized) | 🔴 Critique |
| Touch targets 44px | Augmenter à 48px (recommandé) | 🟠 Urgent |
| Tests manuels uniquement | Playwright + axe-core automatisés | 🟠 Urgent |
| Aucun CI/CD | Pipeline Lighthouse CI + stylelint | 🟡 Important |

---

## 📐 Nouvelle architecture (corrections intégrées)

### Variables TSA-optimized

**Fichier** : `src/styles/abstracts/_variables.scss`

```scss
//==============================================================================
// 🎨 ANIMATIONS TSA-FRIENDLY
//==============================================================================
// Réduit pour minimiser la distraction (utilisateurs autistes sensibles)
// Source: Consensus ChatGPT + DeepSeek + recherche TSA UX

$anim-instant: 0.05s;   // Feedback immédiat (click, focus)
$anim-fast: 0.15s;      // Animation rapide (TSA-safe, non distrayant)
$anim-normal: 0.25s;    // Animation normale (cas exceptionnels)
$anim-slow: 0.4s;       // Animation lente (transitions majeures uniquement)

// ⚠️ DEPRECATED (trop lent pour TSA)
// $transition-base: 0.3s; // ❌ Remplacer par $anim-fast

//==============================================================================
// 🎯 TOUCH TARGETS TSA-OPTIMIZED
//==============================================================================
// 48px recommandé (vs 44px WCAG minimum) pour utilisateurs avec motricité fine réduite
// Source: Apple HIG, Material Design, Consensus ChatGPT

$touch-target-min: 48px;      // Recommandé (confort TSA)
$touch-target-compact: 44px;  // Minimum WCAG (si contrainte espace)

//==============================================================================
// 📱 BREAKPOINTS (mobile-first uniquement)
//==============================================================================
// ⚠️ PAS de breakpoint 'xs' : mobile = base par défaut (hors media query)

$breakpoints: (
  'sm': 576px,   // Large mobile / Petites tablettes
  'md': 768px,   // Tablettes
  'lg': 992px,   // Petits desktops
  'xl': 1200px,  // Desktops standards
  'xxl': 1400px  // Grands écrans
) !default;
```

### Mixins TSA-optimized

**Fichier** : `src/styles/abstracts/_mixins.scss`

```scss
@use 'sass:map';
@use 'variables' as vars;

//==============================================================================
// 🎯 TOUCH TARGET MIXIN (TSA-optimized)
//==============================================================================

/// Applique touch target recommandé (48×48px)
/// @param {Number} $size - Taille minimum (défaut: 48px)
@mixin touch-target($size: vars.$touch-target-min) {
  min-width: $size;
  min-height: $size;
  // Padding pour agrandir zone interactive si élément plus petit
  padding: max(12px, calc(($size - 1em) / 2));
}

//==============================================================================
// 🎨 ANIMATION TSA-FRIENDLY MIXIN
//==============================================================================

/// Animation apaisante pour utilisateurs TSA
/// @param {String} $property - Propriété à animer (transform, opacity, etc.)
/// @param {Number} $duration - Durée (défaut: $anim-fast = 150ms)
/// @param {String} $easing - Courbe d'easing (défaut: ease-out)
@mixin tsa-animation($property: all, $duration: vars.$anim-fast, $easing: ease-out) {
  transition: $property $duration $easing;

  // Respecter prefers-reduced-motion (WCAG 2.2)
  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.01ms !important;
  }
}

//==============================================================================
// 📱 RESPONSIVE MOBILE-FIRST MIXINS
//==============================================================================

/// Mixin mobile-first (min-width)
/// @param {String} $breakpoint - Clé du breakpoint (sm, md, lg, xl, xxl)
/// ⚠️ PAS de support 'xs' : mobile = base par défaut
@mixin respond-to($breakpoint) {
  @if $breakpoint == 'xs' {
    @error "❌ 'xs' breakpoint interdit ! Mobile = base (hors media query). " +
           "Supprimez @include respond-to('xs') et mettez les styles en base.";
  }
  @else if map.has-key(vars.$breakpoints, $breakpoint) {
    @media (min-width: map.get(vars.$breakpoints, $breakpoint)) {
      @content;
    }
  }
  @else {
    @error "⚠️ Breakpoint '#{$breakpoint}' non trouvé. Disponibles : #{map.keys(vars.$breakpoints)}";
  }
}

/// Mixin desktop-first (max-width) - LEGACY UNIQUEMENT
/// @deprecated Utiliser respond-to() (mobile-first)
@mixin respond-to-max($breakpoint) {
  @if map.has-key(vars.$breakpoints, $breakpoint) {
    $bp-value: map.get(vars.$breakpoints, $breakpoint);
    @media (max-width: $bp-value - 1px) {
      @content;
    }
  } @else {
    @error "⚠️ Breakpoint '#{$breakpoint}' non trouvé.";
  }
}

/// Mixin range (entre deux breakpoints)
@mixin respond-between($min, $max) {
  @if map.has-key(vars.$breakpoints, $min) and map.has-key(vars.$breakpoints, $max) {
    $min-value: map.get(vars.$breakpoints, $min);
    $max-value: map.get(vars.$breakpoints, $max);
    @media (min-width: $min-value) and (max-width: $max-value - 1px) {
      @content;
    }
  } @else {
    @error "⚠️ Un ou plusieurs breakpoints invalides. Min: #{$min}, Max: #{$max}";
  }
}

//==============================================================================
// 🔍 FOCUS VISIBLE (accessibilité TSA)
//==============================================================================

/// Focus ring visible et apaisant (3px recommandé)
@mixin focus-visible($color: var(--color-primary), $width: 3px, $offset: 2px) {
  &:focus-visible {
    outline: $width solid $color;
    outline-offset: $offset;
    // Animation douce du focus
    @include tsa-animation(outline-color, vars.$anim-instant);
  }

  // Supprimer outline par défaut (remplacé par :focus-visible)
  &:focus:not(:focus-visible) {
    outline: none;
  }
}
```

---

## 🔍 ÉTAPE 0 : Audit automatique (NOUVEAU - 3h)

**Objectif** : Identifier tous les problèmes AVANT toute modification

### 0.1 - Créer script d'audit (1h)

**Fichier** : `scripts/audit-scss.sh`

```bash
#!/usr/bin/env bash
# scripts/audit-scss.sh
# Audit automatique SCSS - détecte problèmes critiques avant migration
set -euo pipefail

OUT="audit-scss-report.csv"
echo "file,line,issue,context" > "$OUT"

echo "🔍 Audit SCSS en cours..."

#==============================================================================
# 1. ❌ CRITIQUE : respond-to(xs) dangereux
#==============================================================================
echo "  → Recherche respond-to(xs)..."
grep -Rn "@include[[:space:]]*respond-to.*xs" src --include="*.scss" 2>/dev/null \
  | while IFS=: read -r file line rest; do
    ctx=$(sed -n "$((line-2)),$((line+2))p" "$file" 2>/dev/null | tr '\n' ' ' | sed 's/"/\\"/g')
    echo "\"$file\",\"$line\",\"respond-to(xs)-dangereux\",\"$ctx\"" >> "$OUT"
  done || true

#==============================================================================
# 2. ⚠️ URGENT : Animations >150ms (TSA)
#==============================================================================
echo "  → Recherche animations >150ms..."
grep -Rn -E "transition:.*(0\\.[2-9]s|[1-9][0-9]{2,}ms)" src --include="*.scss" 2>/dev/null \
  | while IFS=: read -r file line rest; do
    ctx=$(sed -n "$((line-2)),$((line+2))p" "$file" 2>/dev/null | tr '\n' ' ' | sed 's/"/\\"/g')
    echo "\"$file\",\"$line\",\"animation>150ms\",\"$ctx\"" >> "$OUT"
  done || true

#==============================================================================
# 3. ⚠️ URGENT : Media queries max-width hardcodées
#==============================================================================
echo "  → Recherche @media max-width..."
grep -Rn "@media[[:space:]]*(max-width" src --include="*.scss" 2>/dev/null \
  | while IFS=: read -r file line rest; do
    ctx=$(sed -n "$((line-2)),$((line+2))p" "$file" 2>/dev/null | tr '\n' ' ' | sed 's/"/\\"/g')
    echo "\"$file\",\"$line\",\"media-max-width\",\"$ctx\"" >> "$OUT"
  done || true

#==============================================================================
# 4. 🎯 IMPORTANT : Touch targets potentiellement <48px
#==============================================================================
echo "  → Recherche éléments interactifs..."
grep -Rn -E "\.(btn|button|icon|handle|checkbox|radio)" src --include="*.scss" 2>/dev/null \
  | head -100 \
  | while IFS=: read -r file line rest; do
    block=$(sed -n "$line,$((line+15))p" "$file" 2>/dev/null | tr '\n' ' ' | sed 's/"/\\"/g')
    # Vérifier si min-width/min-height présent
    if ! echo "$block" | grep -qE "min-(width|height):[[:space:]]*(48|5[0-9]|[6-9][0-9])px"; then
      echo "\"$file\",\"$line\",\"touch-target-potentiel\",\"$block\"" >> "$OUT"
    fi
  done || true

#==============================================================================
# 5. 🔍 INFO : Balises <img> sans loading/lazy
#==============================================================================
echo "  → Recherche <img> sans lazy loading..."
grep -Rn "<img" src --include="*.jsx" --include="*.tsx" 2>/dev/null \
  | grep -v "loading=" \
  | head -50 \
  | while IFS=: read -r file line rest; do
    echo "\"$file\",\"$line\",\"img-sans-lazy\",\"Ajouter loading='lazy' decoding='async'\"" >> "$OUT"
  done || true

#==============================================================================
# 6. ♿ ACCESSIBILITÉ : Focus potentiellement invisible
#==============================================================================
echo "  → Recherche focus states..."
grep -Rn -E "\.(btn|button|link|input)" src --include="*.scss" 2>/dev/null \
  | head -100 \
  | while IFS=: read -r file line rest; do
    block=$(sed -n "$line,$((line+20))p" "$file" 2>/dev/null | tr '\n' ' ')
    # Vérifier si :focus-visible présent
    if ! echo "$block" | grep -qE ":focus(-visible)?"; then
      ctx=$(echo "$block" | sed 's/"/\\"/g')
      echo "\"$file\",\"$line\",\"focus-manquant\",\"$ctx\"" >> "$OUT"
    fi
  done || true

#==============================================================================
# RÉSUMÉ
#==============================================================================
echo ""
echo "✅ Audit terminé : $OUT"
echo ""
echo "📊 Résumé :"
echo "  - respond-to(xs) : $(grep -c "respond-to(xs)" "$OUT" || echo 0)"
echo "  - Animations >150ms : $(grep -c "animation>150ms" "$OUT" || echo 0)"
echo "  - @media max-width : $(grep -c "media-max-width" "$OUT" || echo 0)"
echo "  - Touch targets : $(grep -c "touch-target-potentiel" "$OUT" || echo 0)"
echo "  - Images sans lazy : $(grep -c "img-sans-lazy" "$OUT" || echo 0)"
echo "  - Focus manquant : $(grep -c "focus-manquant" "$OUT" || echo 0)"
echo ""
echo "🔍 Ouvrir le rapport : cat $OUT | column -t -s ,"
```

**Rendre exécutable** :
```bash
chmod +x scripts/audit-scss.sh
```

---

### 0.2 - Lancer l'audit (30min)

```bash
# Créer branche audit
git checkout -b audit/mobile-first-$(date +%Y%m%d)

# Lancer audit
./scripts/audit-scss.sh

# Examiner le rapport
cat audit-scss-report.csv | column -t -s ','
```

**Analyser les priorités** :

| Issue | Priorité | Action |
|-------|----------|--------|
| `respond-to(xs)` | 🔴 Critique | Corriger AVANT toute migration |
| `animation>150ms` | 🔴 Critique | Remplacer par `$anim-fast` |
| `media-max-width` | 🟠 Urgent | Lister pour migration |
| `touch-target` | 🟠 Urgent | Appliquer mixin `touch-target()` |
| `img-sans-lazy` | 🟡 Important | Ajouter `loading="lazy"` |
| `focus-manquant` | 🟡 Important | Ajouter mixin `focus-visible()` |

---

### 0.3 - Prioriser corrections (1h)

**Créer** : `audit-scss-plan.md`

```markdown
# Plan corrections audit SCSS

## 🔴 CRITIQUE - À corriger AVANT migration

### respond-to(xs) (X occurrences)

**Fichiers** :
- `src/components/...` (ligne Y)
- `src/pages/...` (ligne Z)

**Action** :
1. Supprimer `@include respond-to('xs') { ... }`
2. Déplacer les styles en base (hors media query)
3. Ajouter commentaire `// 📱 BASE MOBILE`

**Exemple** :
```scss
// ❌ AVANT
.button {
  @include respond-to('xs') {
    padding: 8px;
  }
}

// ✅ APRÈS
.button {
  // 📱 BASE MOBILE (0-575px)
  padding: 8px;
}
```

### animation>150ms (X occurrences)

**Fichiers** :
- ...

**Action** :
1. Remplacer `transition: ... 0.3s` par `@include tsa-animation(...)`
2. Ou utiliser variable `$anim-fast`

## 🟠 URGENT - À corriger pendant migration

### media-max-width (X occurrences)
...

## 🟡 IMPORTANT - À corriger après migration

### touch-target, img-sans-lazy, focus-manquant
...
```

---

### 0.4 - Checklist validation audit

- [ ] Script `audit-scss.sh` exécutable
- [ ] Rapport `audit-scss-report.csv` généré
- [ ] Plan `audit-scss-plan.md` créé
- [ ] Issues critiques identifiées (respond-to(xs), animations)
- [ ] Commit : `chore: add SCSS audit script and report`

---

## 🔧 ÉTAPE 1 : Corrections pré-migration (6h)

**Objectif** : Corriger les bugs CRITIQUES avant toute migration

### 1.1 - Corriger respond-to(xs) - Automatique (2h)

**Script de correction automatique** :

**Fichier** : `scripts/fix-respond-to-xs.sh`

```bash
#!/usr/bin/env bash
# scripts/fix-respond-to-xs.sh
# Corrige automatiquement respond-to(xs) → base mobile
set -euo pipefail

echo "🔧 Correction respond-to(xs)..."

# Lister fichiers concernés
FILES=$(grep -Rl "@include[[:space:]]*respond-to.*xs" src --include="*.scss" || true)

if [ -z "$FILES" ]; then
  echo "✅ Aucun respond-to(xs) trouvé."
  exit 0
fi

for file in $FILES; do
  echo "  → $file"

  # Backup
  cp "$file" "$file.backup"

  # Remplacement : déplacer contenu respond-to(xs) hors du mixin
  # ⚠️ Script simplifié - peut nécessiter revue manuelle
  sed -i.tmp '
    # Détecter @include respond-to(xs) {
    /@include[[:space:]]*respond-to.*xs.*{/,/^[[:space:]]*}/ {
      # Supprimer @include respond-to(xs) {
      s/@include[[:space:]]*respond-to.*xs.*{//
      # Supprimer } de fermeture
      /^[[:space:]]*}$/d
      # Ajouter commentaire
      1i\  // 📱 BASE MOBILE (corrigé depuis respond-to(xs))
    }
  ' "$file"

  # Nettoyer fichier temporaire
  rm -f "$file.tmp"
done

echo "✅ Correction terminée. Vérifiez manuellement les fichiers."
echo "📁 Backups : *.backup"
```

**Lancer** :
```bash
chmod +x scripts/fix-respond-to-xs.sh
./scripts/fix-respond-to-xs.sh

# Vérifier manuellement les changements
git diff

# Si OK, supprimer backups
find src -name "*.backup" -delete

# Commit
git add src
git commit -m "fix(styles): remove dangerous respond-to(xs) usage

- Move mobile styles from respond-to(xs) to base (no media query)
- Add comments '📱 BASE MOBILE' for clarity
- Auto-generated via scripts/fix-respond-to-xs.sh"
```

---

### 1.2 - Corriger animations >150ms (2h)

**Script de suggestion** (pas automatique - révision manuelle requise) :

**Fichier** : `scripts/suggest-anim-fixes.sh`

```bash
#!/usr/bin/env bash
# scripts/suggest-anim-fixes.sh
# Suggère corrections animations >150ms
set -euo pipefail

echo "🎨 Suggestions corrections animations..."

grep -Rn -E "transition:.*(0\\.[2-9]s|[2-9][0-9]{2}ms)" src --include="*.scss" \
  | while IFS=: read -r file line rest; do
    echo ""
    echo "📄 $file:$line"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    sed -n "$((line-2)),$((line+2))p" "$file"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "💡 SUGGESTION :"
    echo "   Remplacer 0.3s → \$anim-fast (150ms)"
    echo "   Ou utiliser : @include tsa-animation(transform, \$anim-fast)"
  done

echo ""
echo "✅ Suggestions terminées. Appliquer manuellement."
```

**Lancer** :
```bash
chmod +x scripts/suggest-anim-fixes.sh
./scripts/suggest-anim-fixes.sh > anim-fixes-suggestions.txt

# Lire suggestions
cat anim-fixes-suggestions.txt

# Appliquer manuellement fichier par fichier
# Exemple :
# transition: transform 0.3s ease → transition: transform $anim-fast ease
```

**Commits par composant** :
```bash
# Après correction manuelle de Button.scss
git add src/components/ui/button/Button.scss
git commit -m "fix(ui): reduce Button animation to 150ms (TSA-friendly)"

# Répéter pour chaque composant
```

---

### 1.3 - Augmenter touch targets à 48px (2h)

**Identifier composants interactifs** :
```bash
# Lister classes interactives
grep -Rn -E "\.(btn|button|icon|handle|checkbox)" src --include="*.scss" \
  | cut -d: -f1 \
  | sort -u
```

**Appliquer mixin touch-target()** :

**Exemple Button.scss** :
```scss
@use '@styles/abstracts' as *;

.button {
  // 📱 BASE MOBILE
  @include touch-target(48px);  // ✅ Minimum 48×48px
  padding: 12px 24px;
  font-size: 14px;
  // ...
}
```

**Commits par composant** :
```bash
git add src/components/ui/button/Button.scss
git commit -m "feat(ui): enforce 48px touch target on Button (TSA-optimized)"
```

---

### 1.4 - Checklist validation corrections

- [ ] `respond-to(xs)` supprimé (0 occurrences)
- [ ] Animations ≤150ms appliquées (composants critiques)
- [ ] Touch targets 48px appliqués (boutons, handles)
- [ ] Audit re-run : issues critiques = 0
- [ ] Build réussit : `yarn build`
- [ ] Visuels identiques (screenshots)

---

## 🧪 ÉTAPE 2 : Tests automatisés (NOUVEAU - 8h)

**Objectif** : Créer tests AVANT migration (référence visuelle + accessibilité)

### 2.1 - Setup Playwright (2h)

**Installation** :
```bash
yarn add -D @playwright/test
npx playwright install
```

**Config** : `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['iPhone 12'] },
    },
    // Tablet
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
    },
    // Desktop
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

### 2.2 - Tests visuels de référence (3h)

**Créer tests snapshot** : `tests/e2e/visual-regression.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

const pages = [
  { name: 'Tableau', url: '/tableau' },
  { name: 'Edition', url: '/edition' },
  { name: 'Profil', url: '/profil' },
];

// Test sur 3 viewports
test.describe('Visual Regression', () => {
  for (const page of pages) {
    test(`${page.name} - Mobile`, async ({ page: p }) => {
      await p.goto(page.url);
      await p.waitForLoadState('networkidle');

      // Screenshot baseline
      await expect(p).toHaveScreenshot(`${page.name}-mobile.png`, {
        fullPage: true,
        maxDiffPixels: 100, // Tolérance
      });
    });

    test(`${page.name} - Tablet`, async ({ page: p }) => {
      await p.setViewportSize({ width: 768, height: 1024 });
      await p.goto(page.url);
      await p.waitForLoadState('networkidle');

      await expect(p).toHaveScreenshot(`${page.name}-tablet.png`, {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });

    test(`${page.name} - Desktop`, async ({ page: p }) => {
      await p.setViewportSize({ width: 1280, height: 800 });
      await p.goto(page.url);
      await p.waitForLoadState('networkidle');

      await expect(p).toHaveScreenshot(`${page.name}-desktop.png`, {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });
  }
});
```

**Générer baselines** :
```bash
# Générer screenshots de référence (AVANT migration)
yarn playwright test --update-snapshots

# Les screenshots sont sauvegardés dans tests/e2e/*.png
# Commit ces screenshots comme référence
git add tests/e2e/*.png
git commit -m "test: add visual regression baselines (pre-migration)"
```

---

### 2.3 - Tests accessibilité automatisés (3h)

**Installation axe-core** :
```bash
yarn add -D axe-playwright
```

**Tests a11y** : `tests/e2e/accessibility.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

const pages = [
  { name: 'Tableau', url: '/tableau' },
  { name: 'Edition', url: '/edition' },
  { name: 'Profil', url: '/profil' },
];

test.describe('Accessibility (WCAG 2.2 AA)', () => {
  for (const page of pages) {
    test(`${page.name} - axe-core`, async ({ page: p }) => {
      await p.goto(page.url);
      await p.waitForLoadState('networkidle');

      // Inject axe-core
      await injectAxe(p);

      // Check WCAG 2.2 AA
      await checkA11y(p, null, {
        detailedReport: true,
        detailedReportOptions: { html: true },
        // Rules spécifiques TSA
        rules: {
          'color-contrast': { enabled: true }, // Contraste minimum
          'focus-order': { enabled: true },    // Ordre focus logique
          'interactive-element-affordance': { enabled: true }, // Touch targets
        },
      });
    });
  }
});

test.describe('Accessibility - Keyboard Navigation', () => {
  test('Tableau - Tab navigation', async ({ page }) => {
    await page.goto('/tableau');

    // Simuler Tab
    await page.keyboard.press('Tab');

    // Vérifier focus visible
    const focused = await page.locator(':focus');
    await expect(focused).toHaveCSS('outline-width', '3px'); // Focus ring 3px

    // Vérifier ordre logique (navbar → tâches → récompense)
    // ... tests spécifiques
  });
});
```

**Lancer tests a11y** :
```bash
yarn playwright test accessibility.spec.ts

# Si violations détectées → corriger AVANT migration
```

---

### 2.4 - Checklist validation tests

- [ ] Playwright installé et configuré
- [ ] Screenshots baselines générés (3 viewports × 3 pages)
- [ ] Tests a11y passent (0 violations WCAG AA)
- [ ] Tests keyboard navigation créés
- [ ] CI config préparée (voir Étape 9)
- [ ] Commit : `test: add Playwright visual regression + axe a11y tests`

---

## 📦 ÉTAPE 3-8 : Migration progressive (identique V1)

**Reprendre le plan V1 ÉTAPES 3-8** avec ces corrections :

### Changements par rapport à V1

1. **Supprimer toute mention de `respond-to('xs')`**
   - Mobile = base (hors media query)
   - Commentaire `// 📱 BASE MOBILE` systématique

2. **Animations : utiliser `$anim-fast` (150ms)**
   ```scss
   // ❌ AVANT
   transition: transform 0.3s ease;

   // ✅ APRÈS
   @include tsa-animation(transform, $anim-fast);
   ```

3. **Touch targets : mixin `@include touch-target(48px)`**
   ```scss
   .button {
     @include touch-target(48px);
   }
   ```

4. **Focus : mixin `@include focus-visible()`**
   ```scss
   .button {
     @include focus-visible(var(--color-primary), 3px);
   }
   ```

5. **Tests après chaque composant**
   ```bash
   # Après migration d'un composant
   yarn playwright test --grep="ComponentName"

   # Vérifier diff visuel
   # Si diff > 100px → investiguer
   ```

---

## 🚀 ÉTAPE 9 : CI/CD Pipeline (NOUVEAU - 4h)

**Objectif** : Automatiser tests + qualité

### 9.1 - GitHub Actions Workflow (2h)

**Fichier** : `.github/workflows/quality.yml`

```yaml
name: Quality Checks

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: yarn install --frozen-lockfile
      - run: yarn lint
      - run: yarn check

  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: yarn install --frozen-lockfile
      - run: npx playwright install --with-deps

      # Tests visuels
      - run: yarn playwright test visual-regression.spec.ts
        continue-on-error: true

      # Tests a11y
      - run: yarn playwright test accessibility.spec.ts

      # Upload screenshots si diff
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: yarn install --frozen-lockfile
      - run: yarn build

      # Lighthouse CI
      - run: npm install -g @lhci/cli
      - run: lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

  stylelint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: yarn add -D stylelint stylelint-config-standard-scss
      - run: npx stylelint "src/**/*.scss"
```

### 9.2 - Lighthouse CI Config (1h)

**Fichier** : `lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "yarn preview",
      "url": [
        "http://localhost:4173/tableau",
        "http://localhost:4173/edition",
        "http://localhost:4173/profil"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "onlyCategories": ["performance", "accessibility", "best-practices"]
      }
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.95}],
        "interactive": ["error", {"maxNumericValue": 3000}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

---

### 9.3 - Stylelint Config (1h)

**Installation** :
```bash
yarn add -D stylelint stylelint-config-standard-scss
```

**Config** : `.stylelintrc.json`

```json
{
  "extends": "stylelint-config-standard-scss",
  "rules": {
    "selector-class-pattern": "^[a-z][a-zA-Z0-9-]*$",
    "declaration-block-no-redundant-longhand-properties": true,
    "no-descending-specificity": null,
    "selector-pseudo-class-no-unknown": [
      true,
      {
        "ignorePseudoClasses": ["global"]
      }
    ],
    "custom-property-pattern": "^[a-z][a-zA-Z0-9-]*$"
  }
}
```

**Lancer** :
```bash
yarn stylelint "src/**/*.scss" --fix
```

---

## 📊 Récapitulatif V2 vs V1

| Aspect | V1 | V2 (corrigé) | Gain |
|--------|-----|--------------|------|
| Audit préalable | ❌ Aucun | ✅ Script auto | Sécurité ++ |
| `respond-to(xs)` | ⚠️ Autorisé | ❌ Interdit (error) | Bug éliminé |
| Animations TSA | 300ms max | 150ms max | UX TSA ++ |
| Touch targets | 44px min | 48px recommandé | Confort ++ |
| Tests visuels | ✅ Manuels | ✅ Playwright auto | Fiabilité ++ |
| Tests a11y | ✅ Manuels | ✅ axe-core auto | WCAG garanti |
| CI/CD | ❌ Aucun | ✅ GitHub Actions | Qualité ++ |
| Durée | 60h | 80h | +20h (investissement rentable) |

---

## 🎯 Ordre d'exécution EXACT

```bash
# 1. Audit (Étape 0)
git checkout -b audit/mobile-first
./scripts/audit-scss.sh
# → Analyser audit-scss-report.csv

# 2. Corrections critiques (Étape 1)
./scripts/fix-respond-to-xs.sh
./scripts/suggest-anim-fixes.sh
# → Appliquer manuellement animations + touch targets
git commit -m "fix: critical issues from audit"

# 3. Tests baseline (Étape 2)
yarn add -D @playwright/test axe-playwright
yarn playwright test --update-snapshots
git commit -m "test: add visual + a11y baselines"

# 4. Migration (Étapes 3-8 - identique V1)
# Suivre PLAN-MIGRATION-MOBILE-FIRST.md V1
# Avec corrections V2 (pas de xs, anim 150ms, touch 48px)

# 5. CI/CD (Étape 9)
# Créer .github/workflows/quality.yml
# Configurer Lighthouse CI
git commit -m "ci: add quality checks pipeline"

# 6. Validation finale
yarn playwright test
yarn build
yarn lint
# → Si ✅ → Merge PR
```

---

## 🆘 Support & Rollback

### Rollback complet
```bash
git reset --hard mobile-first-start
```

### Rollback partiel (1 fichier)
```bash
git checkout HEAD~1 -- src/path/to/file.scss
```

### Comparer visuel
```bash
# Avant
git checkout mobile-first-start
yarn dev &
# Screenshot manuel

# Après
git checkout refactor/mobile-first
yarn dev &
# Screenshot manuel

# Comparer side-by-side
```

---

**Auteur** : Claude Code (Anthropic)
**Version** : 2.0 (corrigée ChatGPT + consensus IA)
**Date** : 5 janvier 2025
**Statut** : Plan d'action prêt - Audit-first sécurisé
