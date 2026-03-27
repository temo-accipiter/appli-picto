# Design System Tokens — Appli-Picto

## 🎨 Règle Tokens-First (OBLIGATOIRE)

**JAMAIS de valeurs hardcodées (px, rem, #hex, rgb) — TOUJOURS utiliser tokens.**
→ Voir skill `sass-tokens-discipline` pour détails complets

---

## 📋 Tokens disponibles (fichiers abstracts/)

### Couleurs (`_colors.scss`)
- `color($key)` — Couleurs primaires/secondaires/accent
- `text($key)` — Couleurs texte (primary, secondary, invert)
- `surface($key)` — Couleurs surfaces (bg, primary, secondary)
- `semantic($type, $level)` — Couleurs sémantiques (success, error, warning, info)
- `tsa-pastel($key)` — Palette pastel TSA-friendly
- Palettes : `gray()`, `blue()`, `green()`, `red()`, `yellow()`, `purple()`

### Spacing (`_spacing.scss`)
- `spacing($key)` — Espacement (xs, sm, md, lg, xl, xxl, etc.)
- Valeurs spéciales : `spacing('44')` (44px min tactile)

### Typographie (`_typography.scss`)
- `font-size($key)` — Tailles police (xs, sm, base, md, lg, xl, xxl)
- `font-weight($key)` — Poids police (light, regular, medium, semibold, bold)
- `line-height($key)` — Hauteur ligne (tight, normal, relaxed)

### Border Radius (`_radius.scss`)
- `radius($key)` — Rayons bordure (none, sm, md, lg, xl, full)

### Shadows (`_shadows.scss`)
- `shadow($key)` — Ombres (none, sm, md, lg, xl)

### Motion (`_motion.scss`)
- `timing($key)` — Durées transitions (instant, fast, base, slow)
- `easing($key)` — Courbes transition (smooth, sharp, emphasized)

### Mixins utiles (`_mixins.scss`)
- `@include safe-transition()` — Transitions avec prefers-reduced-motion
- `@include focus-ring()` — Focus visible WCAG
- `@include touch-target()` — Cibles tactiles min 44×44px

---

Import obligatoire : `@use '@styles/abstracts' as *;`
