# Doctrine motion — Appli-Picto

**Version** : 1.0
**Date** : 2026-05-14
**Statut** : Adoptée
**Portée** : Toute animation et transition CSS du projet

---

## Pourquoi cette doctrine

Appli-Picto est utilisée par des enfants présentant des troubles du spectre autistique (TSA). Pour ce public, le mouvement à l'écran n'est pas neutre : une animation imprévisible, un rebond inattendu ou une accélération non linéaire peuvent générer une surcharge sensorielle ou de l'anxiété. WCAG 2.2 AA impose un respect de `prefers-reduced-motion`, mais ce projet va plus loin en définissant des règles de mouvement proactives, même sans que la préférence système soit activée.

La doctrine distingue trois catégories d'animations selon leur relation avec l'action utilisateur. Cette distinction est fondamentale : le feedback interactif doit être maximallement prévisible (vitesse constante, `linear`), tandis que les apparitions peuvent utiliser `ease-out` (ralentissement à l'arrivée, effet de "pose"), et les animations décoratives suivent les mêmes contraintes sans nécessiter la même rigueur.

---

## Les 3 catégories d'animation

### Catégorie 1 — Feedback interactif

**Définition** : animation qui réagit directement à une action utilisateur (clic, focus, hover, drag, validation, changement d'état).

**Règles** :

- Easing : `easing('linear')` **obligatoire**
- Durée : ≤ 300 ms (`timing('base')` maximum)
- Pas de rebond, pas d'overshoot, pas de courbe d'accélération

**Justification TSA** : un retour utilisateur doit être direct et prévisible. Toute courbe non linéaire introduit une micro-imprévisibilité qui, répétée des dizaines de fois par session, crée de la fatigue sensorielle.

**Exemples dans le projet** :

- Transition hover/focus d'un bouton
- Changement de couleur de fond d'un toggle (coché/décoché)
- Déplacement du thumb d'un slider
- Scale au tap d'une checkbox (`checkbox-tap-feedback`)

**Commentaire SCSS attendu** :

```scss
// Cat. 1 — feedback interactif. linear obligatoire (anti-TSA).
```

---

### Catégorie 2 — Apparitions / disparitions (reveal/dismiss)

**Définition** : animation d'un élément qui entre ou sort de l'écran.

**Règles** :

- Easing : `easing('linear')` ou `easing('ease-out')` autorisés
- Durée : ≤ 300 ms standard (`timing('base')`), ≤ 500 ms exceptionnellement pour un reveal complexe (`timing('lg')`)
- `ease-in` et `ease-in-out` interdits (accélération à l'entrée ou symétrie inutile)

**Justification TSA** : `ease-out` (ralentissement à l'arrivée) est plus prévisible qu'un mouvement à vitesse constante pour des apparitions — l'élément "se pose" plutôt que de s'arrêter net. L'utilisateur peut anticiper la position finale.

**Exemples dans le projet** :

- Apparition d'un modal (fadeIn, scaleIn) → `easing('ease-out')`, `timing('fast')`
- Ouverture d'un dropdown (slideDown) → `easing('ease-out')`, `timing('fast')`
- Apparition d'un toast
- Entrée d'un jeton dans la grille (TokensGrid token-pop) → `easing('ease-out')`

**Commentaire SCSS attendu** :

```scss
// Cat. 2 — apparition. ease-out justifié (ralentissement à l'arrivée, effet de pose).
```

---

### Catégorie 3 — Décoratif / ambiant

**Définition** : animation continue ou ponctuelle sans rapport direct avec une action utilisateur immédiate.

**Règles** :

- Easing : `easing('linear')` recommandé, `easing('ease-out')` toléré
- Easings rebondissants (`cubic-bezier` avec overshoot) interdits **sauf** célébration de récompense explicite
- Durée : illimitée (animations infinies autorisées)

**Justification TSA** : ces animations ne sont pas du feedback, l'utilisateur n'attend pas un retour. Elles ne doivent pas être "ludiques" ou surprenantes sur des actions de validation. Un spinner qui tourne de façon constante est rassurant — un spinner qui rebondit ne l'est pas.

**Exemples dans le projet** :

- Spinner de chargement (`loader-dot-bounce`) → `easing('linear')`
- Spinner du bouton en état loading (`spinner-fade`) → `easing('linear')`
- Train qui avance sur la barre de progression → `linear`, durée continue
- Dash SVG animé (rail du train) → `linear`, 2s en boucle
- Station pop sur la barre de progression → `easing('ease-out')`

**Commentaire SCSS attendu** :

```scss
// Cat. 3 — décoratif ambiant. linear pour cohérence boucle.
```

---

## Règles transversales (toutes catégories)

### `prefers-reduced-motion` — couverture globale obligatoire

Le fichier `src/styles/base/_reduced-motion.scss` applique une règle universelle :

```scss
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0s !important;
  }
}
```

**Ne pas modifier ce fichier.** Il couvre l'intégralité du projet.

### `safe-transition()` et `safe-animation()` — obligatoires

Toute transition ou animation doit passer par ces mixins. Ils intègrent automatiquement la couverture `prefers-reduced-motion`.

```scss
// ✅ Correct
@include safe-transition(background-color, timing('xs'), easing('linear'));
@include safe-animation(
  checkbox-tap-feedback,
  timing('fast'),
  easing('linear')
);

// ❌ Interdit
transition: background-color 0.15s linear;
animation: spinner 0.3s ease-in-out infinite;
```

### Pas de cascade sur contenu fonctionnel

Les `transition-delay` ou `animation-delay` croissants sur plusieurs éléments successifs (stagger) sont **interdits** sur du contenu fonctionnel (slots, jetons, étapes de séquence). Tolérés uniquement pour des récompenses ponctuelles et individuelles.

### Pas d'easing rebondissant sur du feedback fonctionnel

Une checkbox de validation, un bouton, un toggle, un slot ne rebondissent jamais. Les `cubic-bezier` avec overshoot sont réservés aux animations décoratives de célébration.

---

## Comment classer une animation

```
L'animation réagit-elle à une action utilisateur immédiate ?
  → OUI → Catégorie 1 (linear, ≤ 300ms)

L'élément apparaît-il ou disparaît-il à l'écran ?
  → OUI → Catégorie 2 (linear ou ease-out, ≤ 300ms standard)

Sinon (continu, ambiant, ponctuel sans rapport avec une action) ?
  → Catégorie 3 (linear recommandé, ease-out toléré, durée libre)
```

---

## Tokens autorisés / interdits

### Easings — à utiliser

| Token                | Valeur CSS | Catégories autorisées                |
| -------------------- | ---------- | ------------------------------------ |
| `easing('linear')`   | `linear`   | Cat. 1 (obligatoire), Cat. 2, Cat. 3 |
| `easing('ease-out')` | `ease-out` | Cat. 2 (recommandé), Cat. 3 (toléré) |

### Easings — retirés du système

Ces tokens ont été supprimés de `$motion-tokens` car ils n'ont pas de cas d'usage défendable dans le contexte TSA :

| Token supprimé | Valeur                                   | Raison                                                        |
| -------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `ease-in`      | `ease-in`                                | Accélération à la sortie = imprévisible                       |
| `ease-in-out`  | `ease-in-out`                            | Symétrie inutile, `linear` ou `ease-out` couvrent les besoins |
| `smooth`       | `ease`                                   | Alias de `ease-in-out` étendu, même problème                  |
| `smooth-in`    | `cubic-bezier(0.55, 0.055, 0.675, 0.19)` | Courbe d'accélération forte, contre-indiquée                  |
| `smooth-out`   | `cubic-bezier(0.25, 0.46, 0.45, 0.94)`   | Redondant avec `ease-out`                                     |
| `bounce-easy`  | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Rebond fort, contre-indiqué en feedback fonctionnel           |
| `smooth-pop`   | `cubic-bezier(0.34, 1.56, 0.64, 1)`      | Overshoot, contre-indiqué en feedback fonctionnel             |

### Durées — limites par catégorie

| Catégorie          | Durée max standard | Durée max exceptionnelle | Token recommandé                     |
| ------------------ | ------------------ | ------------------------ | ------------------------------------ |
| Cat. 1 — Feedback  | 300 ms             | —                        | `timing('xs')` ou `timing('sm')`     |
| Cat. 2 — Reveal    | 300 ms             | 500 ms                   | `timing('base')` ou `timing('fast')` |
| Cat. 3 — Décoratif | illimitée          | —                        | selon animation                      |

### Timing `bounce` (0.6s) — supprimé

Token supprimé : durée > 300 ms sans cas d'usage identifié.

---

## Exemples de cas réels du projet

| Animation                 | Fichier                 | Catégorie | Durée                      | Easing               | Conforme |
| ------------------------- | ----------------------- | --------- | -------------------------- | -------------------- | -------- |
| Tap feedback checkbox     | `Checkbox.scss`         | Cat. 1    | `timing('fast')` = 150ms   | `easing('linear')`   | ✅       |
| Toggle track/thumb        | `Toggle.scss`           | Cat. 1    | `timing('xs')` = 150ms     | `easing('linear')`   | ✅       |
| Apparition modal (fadeIn) | `Modal.scss`            | Cat. 2    | `timing('fast')` = 150ms   | `easing('ease-out')` | ✅       |
| Dropdown slideDown        | `Dropdown.scss`         | Cat. 2    | `timing('fast')` = 150ms   | `easing('ease-out')` | ✅       |
| Token pop (jetons grille) | `TokensGrid.scss`       | Cat. 2    | 0.25s                      | `ease-out`           | ✅       |
| Spinner rotation          | `Button.scss`           | Cat. 3    | `timing('slower')` = 500ms | `easing('linear')`   | ✅       |
| Dots fade spinner         | `Button.scss`           | Cat. 3    | `timing('base')` = 300ms   | `easing('linear')`   | ✅       |
| Loader bounce dots        | `Loader.scss`           | Cat. 3    | `timing('base')` = 300ms   | `easing('linear')`   | ✅       |
| Train animation           | `TrainProgressBar.scss` | Cat. 3    | 2s en boucle               | `linear`             | ✅       |
| Dash SVG rail             | `TrainProgressBar.scss` | Cat. 3    | `timing('slowest')` = 1.2s | `linear`             | ✅       |

---

## Maintenance

### Ajouter une nouvelle animation

1. Identifier la catégorie (Cat. 1 / 2 / 3) avec l'arbre de décision
2. Choisir le timing et l'easing autorisés pour cette catégorie
3. Utiliser `safe-transition()` ou `safe-animation()`
4. Ajouter un commentaire SCSS référençant la catégorie

### Ajouter un nouveau token d'easing

Doit être justifié par un cas d'usage Cat. 2 ou Cat. 3 explicite. Valider contre la règle : "est-ce que cet easing est prévisible pour un enfant TSA dans ce contexte ?". Soumettre à revue de doctrine avant merge.

### Modifier une animation existante

Vérifier la catégorie de l'animation existante. Si la durée ou l'easing change de catégorie, re-classifier et commenter.
