# 📜 RÈGLES DE MIGRATION — DESIGN SYSTEM SCSS

*(Phase : refactor isométrique, sans changement visuel)*

---

## 🎯 Objectif de la migration

- **AUCUN changement visuel** (pixel‑perfect)
- Centraliser les valeurs existantes
- Éliminer progressivement les hardcodes
- Forcer l’utilisation d’une **API de design system**
- Préparer le terrain pour un design system strict

> Cette phase est une **migration**, pas une harmonisation visuelle.

---

## 🔑 Hiérarchie des sources (NON NÉGOCIABLE)

1. **Tokens** (`_tokens.scss`)
   - Source de vérité des valeurs UI
   - Données uniquement (maps, constantes)

2. **Wrappers / Abstracts** (`abstracts/*`)
   - Fonctions & mixins publiques
   - Validation des clés
   - Aucune valeur hardcodée

3. **Composants**
   - Consommation uniquement via wrappers
   - Aucune logique de thème
   - Aucune valeur canonique

---

## 🧱 RÈGLES GÉNÉRALES (CRITIQUES)

### ❌ Interdictions absolues dans les composants

- Aucune valeur en :
  - `px`, `rem`, `em`, `%`
- Aucune couleur hardcodée :
  - `#fff`, `#000`, `rgb()`, `hsl()`
- Aucune manipulation de couleur :
  - `color.adjust`, `color.change`, `lighten()`, `darken()`
- Aucun accès direct aux CSS variables :
  - `var(--*)`
- Aucun `@media (prefers-color-scheme)`
- Aucun calcul Sass sur des valeurs visuelles
- Aucun accès direct aux maps de tokens

---

## 🎨 Couleurs — RÈGLES STRICTES

### ✅ Autorisé

Utilisation **exclusive** des wrappers :

```scss
color(...)
text(...)
surface(...)
semantic(...)
role-color(...)
```

### ❌ Interdit

```scss
color: var(--foreground);
background: #fafafa;
background: color.change(...);
```

### Règle clé

> Les composants **ne connaissent jamais les couleurs réelles**.
> Ils manipulent uniquement des rôles sémantiques.

---

## 📏 Spacing — RYTHME / RESPIRATION UNIQUEMENT

### `spacing()` est réservé à :

- `margin`
- `padding`
- `gap`
- `row-gap`, `column-gap`
- `inset`, `scroll-margin`

### ❌ Interdit pour :

- `width`, `height`
- `min-height`, `max-width`
- `border-width`

### Exemple correct

```scss
padding: spacing('md');
gap: spacing('sm');
```

### Exemple interdit

```scss
min-height: spacing('200');
border: spacing('1') solid;
```

> Ces cas doivent utiliser des tokens dédiés (`size()`, `border-width()`).

---

## 📐 Dimensions structurelles

- Les tailles structurelles doivent passer par :
  - `size()`
  - `control-size()`
  - tokens sémantiques (`modal-width`, `touch-target`)

### Migration

- Toléré temporairement **si legacy**
- Doit correspondre à une valeur existante
- Ne devient **pas** un standard

---

## ✍️ Typographie

### ✅ Autorisé

```scss
font-size: font-size('sm');
font-weight: font-weight('medium');
line-height: line-height('base');
```

### ❌ Interdit

```scss
font-size: 14px;
font-size: 0.875rem;
```

---

## 🧠 Motion & transitions

### ✅ Autorisé

```scss
transition: all timing('fast') easing('standard');
@include safe-transition(opacity);
```

### ❌ Interdit

```scss
transition: all 0.15s ease;
animation: spin 1s linear;
```

---

## 🌓 Thèmes & dark mode

### ❌ Interdit dans les composants

- `@media (prefers-color-scheme)`
- overrides dark / light locaux

### ✅ Autorisé

- Thèmes centralisés (`themes/`)
- CSS vars runtime globales
- Consommation via wrappers uniquement

---

## 🧩 BEM & structure

### BEM-lite recommandé

- Bloc : `.quota-management`
- Élément : `.quota-item`
- Modificateur : `.quota-management.loading`

### ❌ Interdit

- Sélecteurs dépendants du DOM
- BEM décoratif ou verbeux
- Classes utilitaires locales déguisées

---

## 🌳 Nesting

- Profondeur maximale : **3 niveaux**
- Pas de cascade implicite
- Chaque niveau doit rester lisible isolément

---

## 📱 Mobile-first

- Base = mobile
- Desktop = amélioration progressive
- Uniquement via `respond-to()`
- Jamais de `max-width`

---

## ⚠️ RÈGLES SPÉCIALES — MIGRATION

### ✅ Autorisé temporairement

- `spacing('48')`, `spacing('200')` si déjà existant
- clés numériques legacy
- mapping direct vers tokens

### ❌ Interdit même en migration

- Création de nouvelles valeurs non tokenisées
- Ajout de nouvelles couleurs hors tokens
- Ajout de nouveaux hardcodes

---

## 🧪 Validation obligatoire

Avant de considérer un fichier comme migré :

- ❌ aucun `px`, `rem`, `#`
- ❌ aucun `color.change`
- ❌ aucun `var(--*)`
- ❌ aucun dark mode local
- ✅ wrappers uniquement
- ✅ aucun changement visuel

---

## 🏁 RÈGLE FINALE (ABSOLUE)

> **Si une valeur n’est pas accessible via une fonction publique du design system, elle ne doit pas être utilisée.**

