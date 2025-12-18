---
description: Refactor composant SCSS vers design system tokens-first Appli-Picto
allowed-tools: Task, Read, View, Glob, Grep, Bash
argument-hint: <chemin-fichier-scss>
model: sonnet
---

Refactor un composant SCSS vers le design system tokens-first d'Appli-Picto.

## 🎯 Mission

Migration isométrique stricte (AUCUN changement visuel) d'un fichier SCSS vers le système de tokens centralisés.

## 📋 Workflow Automatisé

### ÉTAPE 1 : Activer Expert Design System

**CRITIQUE** : Utiliser `Task` pour charger l'agent scss-refactor qui connaît toutes les règles.

```
Task: Activer l'agent scss-refactor pour expertise design system tokens-first
```

L'agent scss-refactor consulte automatiquement :

- `/mnt/project/refactor-philosophy.md` - Règles absolues
- `/mnt/project/scss-architecture.md` - Tokens disponibles
- `/mnt/project/refactor-contract.md` - Méthodologie

### ÉTAPE 2 : Charger Documentation Référence

**OBLIGATOIRE** : Consulter les 3 fichiers MD avant toute intervention.

```bash
view /mnt/project/refactor-philosophy.md
view /mnt/project/scss-architecture.md
view /mnt/project/refactor-contract.md
```

**NE JAMAIS refactorer sans avoir lu ces 3 fichiers.**

### ÉTAPE 3 : Analyser Fichier SCSS Cible

Utiliser `view` pour lire le fichier SCSS à refactorer :

```bash
view <chemin-fichier-scss>
```

**Identifier via l'agent scss-refactor** :

**❌ Anti-patterns (violations strictes)** :

- Valeurs hardcodées : `px`, `rem`, `#hex`, `rgb()`, `hsl()`
- Accès directs : `var(--custom-prop)`
- Manipulations couleurs : `lighten()`, `darken()`, `color.adjust()`
- Media queries locales : `@media (prefers-color-scheme)`
- Calculs Sass : `$size * 2`, `16px + 8px`

**⚠️ Structure à améliorer** :

- Nesting > 3 niveaux (BEM sur-imbriqué)
- Classes non-BEM
- Duplication de styles
- Ordre incohérent des propriétés

### ÉTAPE 4 : Mapper Tokens (via agent)

**L'agent scss-refactor mappe chaque valeur hardcodée vers le token approprié.**

**Guide rapide** :

**Couleurs** :

- `#4a90e2`, `#667eea` → `color('base')`
- `#fff`, `#ffffff` → `text('invert')` ou `surface('bg')`
- `#4caf50` → `semantic('success', 'base')`
- Fond pastel → `tsa-pastel('blue-light')`

**Spacing (margin/padding/gap UNIQUEMENT)** :

- `8px` → `spacing('sm')`
- `16px` → `spacing('md')`
- `24px` → `spacing('lg')`
- `44px` → `spacing('44')` ou `@include touch-target('min')`

**Typographie** :

- `14px` → `font-size('sm')`
- `16px` → `font-size('base')`
- `font-weight: 600` → `font-weight('semibold')`

**Border Radius** :

- `4px` → `radius('sm')`
- `8px` → `radius('md')`
- `50%` → `radius('full')`

**Transitions** :

- `0.15s` → `timing('fast')`
- `0.3s` → `timing('base')`
- `ease` → `easing('smooth')`

**Si token manquant** → **SIGNALER** (ne pas inventer)

### ÉTAPE 5 : Refactorer (via agent)

**L'agent scss-refactor applique les transformations selon les règles strictes.**

**Pattern de base** :

```scss
// ❌ AVANT
.button {
  background: #4a90e2;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  transition: all 0.15s ease;
}

// ✅ APRÈS
@use '@styles/abstracts' as *;

.button {
  background: color('base');
  color: text('invert');
  padding: spacing('sm') spacing('lg');
  border-radius: radius('md');
  @include safe-transition(background color, timing('fast'), easing('smooth'));
}
```

**Réorganisation BEM si nécessaire** :

```scss
// ❌ AVANT (nesting excessif)
.card {
  .content {
    .section {
      .item {
        .link {
          color: blue;
        }
      }
    }
  }
}

// ✅ APRÈS (BEM aplati)
.card {
  &__content {
  }
  &__section {
  }
  &__item-link {
    color: color('base');
  }
}
```

### ÉTAPE 6 : Valider Conformité (via agent)

**L'agent scss-refactor vérifie la checklist stricte** :

- [ ] Aucun `px`, `rem`, `#`, `rgb()`, `hsl()`
- [ ] Aucun `var(--*)`
- [ ] Aucune manipulation couleur (`lighten()`, `darken()`, `color.adjust()`)
- [ ] Import unique : `@use '@styles/abstracts' as *;`
- [ ] Wrappers uniquement : `color()`, `spacing()`, `font-size()`, etc.
- [ ] BEM propre (≤ 3 niveaux)
- [ ] Mobile-first : `@include respond-to()`, jamais `max-width`
- [ ] TSA-compliant : animations ≤ `timing('base')` (0.3s)
- [ ] WCAG AA : `@include focus-ring()`, `@include touch-target()`
- [ ] **Isométrie** : valeur visuelle exacte préservée (pixel-perfect)

### ÉTAPE 7 : Livrer Résultats

**L'agent scss-refactor fournit 4 livrables obligatoires.**

## 📦 Format Réponse Attendu

```
🎨 REFACTOR SCSS : {nom-fichier}.scss

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 AUDIT INITIAL

Violations détectées :
❌ {X} valeurs hardcodées (px, rem, #hex, rgb)
❌ {Y} accès directs var(--)
❌ {Z} manipulations couleurs (lighten, darken)
⚠️ {N} problèmes structure (nesting > 3, duplication)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 TRANSFORMATIONS APPLIQUÉES

Couleurs :
- Remplacé `#4a90e2` → `color('base')`
- Remplacé `#ffffff` → `text('invert')`
- Remplacé `rgba(0,0,0,0.5)` → `shadow('black-medium')`

Spacing :
- Remplacé `12px` → `spacing('sm')`
- Remplacé `24px` → `spacing('lg')`
- Remplacé `padding: 8px 16px` → `padding: spacing('xs') spacing('md')`

Typographie :
- Remplacé `font-size: 16px` → `font-size('base')`
- Remplacé `font-weight: 600` → `font-weight('semibold')`

Transitions :
- Remplacé `transition: all 0.15s ease` → `@include safe-transition(all, timing('fast'), easing('smooth'))`

Structure :
- Réorganisé nesting BEM (4 niveaux → 2 niveaux)
- Ajouté `@include touch-target('min')` pour WCAG AA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ CODE SCSS REFACTORÉ

@use '@styles/abstracts' as *;

{code SCSS complet refactoré}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ ALERTES & TOKENS MANQUANTS

{Si tokens manquants ou ambiguïtés, lister ici avec options}

Exemple :
1. Token manquant : `spacing('15')` (15px)
   → Options :
     a) `spacing('md')` (16px) - léger changement
     b) `spacing('14')` (14px) - existe
     c) Créer `spacing('15'): 0.9375rem`
   → Recommandation : (a) si acceptable

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ VALIDATION CONFORMITÉ

[✓] Aucun hardcode restant (px, rem, #, rgb)
[✓] Aucun var(--*) direct
[✓] Aucune manipulation couleur
[✓] Import unique : @use '@styles/abstracts' as *
[✓] Wrappers uniquement
[✓] BEM propre (≤ 3 niveaux)
[✓] Mobile-first respecté
[✓] TSA-compliant (animations ≤ 0.3s)
[✓] WCAG AA (focus, touch targets)
[✓] Isométrie respectée (aucun changement visuel)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STATISTIQUES

Avant :
- {N} lignes
- {X} valeurs hardcodées

Après :
- {N} lignes (± différence)
- 0 valeur hardcodée
- 100% tokens design system

✅ Refactoring terminé - Prêt à commit
```

## 🚨 Règles Non-Négociables

**Migration isométrique** :

- AUCUN changement visuel autorisé
- Valeurs visuelles exactes préservées (pixel-perfect)
- Exception : corrections WCAG critiques uniquement

**Design System strict** :

- Import unique : `@use '@styles/abstracts' as *;`
- Wrappers uniquement (aucun hardcode)
- Validation stricte via checklist

**Contexte TSA** :

- Animations douces ≤ 0.3s (`timing('base')`)
- Palette apaisante (`tsa-pastel()`)
- Accessibilité WCAG 2.2 AA obligatoire

## 🎯 Utilisation de l'Agent

**L'agent scss-refactor est votre expert** :

- Connaît toutes les règles du design system
- A accès à la documentation complète
- Valide strictement la conformité
- Fournit les 4 livrables formatés

**Déléguer à l'agent via Task** :

- Analyse du fichier
- Mapping des tokens
- Transformation du code
- Validation et livrables

## ✅ Commandes Validation Post-Refactor

Après refactoring, suggérer au développeur :

```bash
# Vérifier absence hardcodes
pnpm lint:hardcoded

# Valider touch targets
pnpm validate:touch-targets

# Compiler SCSS
pnpm build:css

# Vérification complète
pnpm verify:css
```

## 💡 Exemples d'Usage

```bash
# Refactor un composant
/refactor-scss src/components/Button/Button.scss

# Refactor un module
/refactor-scss src/components/taches/TacheCard.scss

# Refactor une page
/refactor-scss src/app/(protected)/edition/edition.scss
```

## 🎓 Pour l'Agent scss-refactor

**Vous êtes maintenant activé automatiquement par cette commande.**

**Votre mission** :

1. Consulter les 3 fichiers MD de référence
2. Analyser le fichier SCSS cible en profondeur
3. Mapper toutes les valeurs vers les tokens appropriés
4. Refactorer selon les règles strictes du design system
5. Valider la conformité totale
6. Fournir les 4 livrables formatés

**Règle absolue** :

> Si une valeur n'est pas accessible via une fonction publique du design system, elle ne doit PAS être utilisée.

**Toujours en français** (projet francophone).
