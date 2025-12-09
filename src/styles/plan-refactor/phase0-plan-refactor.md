## 📁 Architecture FINALE

```
src/styles/
  abstracts/
    _tokens.scss           # 📌 Source de vérité (maps SCSS) – compile-time
    _colors.scss           # 🎨 CSS vars couleur (runtime)
    _typography.scss       # 🔤 CSS vars typo (runtime)
    _spacing.scss          # 📐 CSS vars spacing (runtime)
    _motion.scss           # ⏱ CSS vars animation (runtime)
    _radius.scss           # 🟦 CSS vars arrondis (runtime)
    _shadows.scss          # 🌫 CSS vars shadows (runtime)
    _forms.scss            # 📝 Tokens inputs/states
    _variables.scss        # ⚙️ Divers (z-index, layout)
    _functions.scss        # 🧮 Helpers SCSS (ex: token(), rem()…)
    _mixins.scss           # 🧱 Mixins globaux (ex: transition-smooth, focus-visible)
    _breakpoints.scss      # 📱 Système mobile-first (✅ déjà fait)

  base/
    _reset.scss            # 🔧 À corriger (all: unset)
    _reduced-motion.scss   # ♿ Accessibilité motion (✅ déjà fait)
    _helpers.scss          # 🛠 Classes utilitaires (.container, .visually-hidden)
    _accessibility.scss    # ♿ Focus global, touch-target, skip-links
    _typography-base.scss  # 🔤 Application typo au DOM (body, h1-h6, p)

  vendors/
    _normalize.scss        # ✅ Ne pas toucher

  themes/
    _light.scss            # ☀️ Thème clair (défaut)
    _dark.scss             # 🌙 Thème sombre
    _calm.scss             # 🧘 Mode apaisé (autisme)

  main.scss                # 🚀 Point d'entrée

```
