---
name: turbopack-shorthand-bug
description: Turbopack ne résout pas timing()/easing() dans les shorthands animation:/transition: — toujours utiliser les sub-longhands
metadata:
  type: feedback
---

Les fonctions SCSS `timing()` et `easing()` ne sont PAS résolues par Turbopack (compilateur Next.js 16) quand elles apparaissent dans les propriétés shorthand `animation:` ou `transition:`. Le CSS compilé contient le texte littéral `timing("fast")` au lieu de la valeur résolue (`0.15s`).

**Pourquoi :** Turbopack évalue les fonctions SCSS différemment du compilateur standalone `sass`. Les sub-longhands CSS (`animation-duration:`, `transition-duration:`, etc.) fonctionnent correctement dans les deux contextes.

**How to apply :** Toujours décomposer en sub-longhands dès qu'une fonction token apparaît dans une propriété shorthand animation/transition :

```scss
// Interdit dans ce projet
animation: fadeIn timing('fast') easing('ease-out');
transition: all timing('xs') easing('smooth');

// Obligatoire
animation-name: fadeIn;
animation-duration: timing('fast');
animation-timing-function: easing('ease-out');

transition-property: all;
transition-duration: timing('xs');
transition-timing-function: easing('smooth');
```

Exception : les lignes utilisant l'interpolation `#{timing()}` (CSS custom properties) fonctionnent et ne doivent pas être touchées. Les sub-longhands `animation-delay: timing('fast')` fonctionnent déjà et ne doivent pas être modifiés.

Migration complète effectuée le 2026-05-14 : 4 fichiers abstracts + 30 composants.
