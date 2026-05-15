# Audit migration motion — Phase A

**Date** : 2026-05-15
**Doctrine de référence** : `docs/refonte_front/motion-doctrine.md` v1.0
**Statut** : Phase A audit terminée — en attente arbitrage Temo

---

## Méthode

### Patterns grep utilisés

```bash
# Token smooth
grep -rn "easing('smooth')" src/
grep -rn 'easing("smooth")' src/

# Token ease-in-out
grep -rn "easing('ease-in-out')" src/
grep -rn 'easing("ease-in-out")' src/

# Token smooth-pop
grep -rn "easing('smooth-pop')" src/
grep -rn 'easing("smooth-pop")' src/

# Valeurs par défaut dans mixins (usages indirects)
grep -n "easing\|smooth\|ease-in-out" src/styles/abstracts/_motion.scss
grep -n "easing\|smooth" src/styles/abstracts/_mixins.scss
grep -n "safe-transition\|safe-animation" src/styles/abstracts/_mixins.scss
grep -rn "@include transition\b" src/         # vieux mixin _motion.scss
grep -rn "transition-smooth" src/             # mixin hardcodé _mixins.scss

# Usages indirects via CSS var
# --easing-smooth défini dans _motion.scss:160, non utilisé directement dans les composants

# Pour chaque occurrence : grep -B4 -A5 pour avoir le contexte
```

Variante `easing("token")` (guillemets doubles) : **0 résultat** dans tous les cas.

**Fichiers SCSS scannés** : 117 fichiers dans `src/`

**Définitions exclues du décompte** (non call sites) :

- `_motion.scss:160` — CSS var `--easing-smooth: #{easing('smooth')}` (export CSS)
- `_motion.scss:23,63,198` — commentaires JSDoc
- `_tokens.scss:24,1063` — commentaires
- Lignes `//    - easing('smooth') → Primitives Phase 6 ✅` dans 9 fichiers — commentaires de conformité

---

## Récap chiffré

| Token                   | Total call sites | Cat. 1                  | Cat. 2                 | Cat. 3 | Incertain |
| ----------------------- | ---------------- | ----------------------- | ---------------------- | ------ | --------- |
| `easing('smooth')`      | **67**           | 55 (47 high + 8 medium) | 11 (8 high + 3 medium) | 0      | 1         |
| `easing('ease-in-out')` | **6**            | 0                       | 1                      | 4      | 1         |
| `easing('smooth-pop')`  | **2**            | 0                       | 0                      | 0      | 2         |
| **Total**               | **75**           | **55**                  | **12**                 | **4**  | **4**     |

---

## Cas d'usage en mixin par défaut

### `@mixin transition()` dans `_motion.scss:114`

```scss
@mixin transition($property: all, $timing-key: 'base', $easing-key: 'smooth') {
  transition-property: $property;
  transition-duration: timing($timing-key);
  transition-timing-function: easing($easing-key);
}
```

**Statut** : aucun appel `@include transition(` sans la variante `safe-transition` n'a été trouvé dans le code (`grep -rn "include transition\b"` → 0 résultat hors `transition-smooth`). Ce mixin est donc déclaré mais non utilisé directement. **Pas de propagation active.** À nettoyer lors de la Phase B.

### `@mixin safe-transition()` dans `_mixins.scss:223`

```scss
@mixin safe-transition($property: all, $duration: motion.timing('fast'), $easing: ease) {
```

**Défaut hardcodé `ease`** (pas via token). Chaque appel à `@include safe-transition(props)` sans easing explicite utilise `ease` implicitement. Quatre occurrences dans `_mixins.scss` lui-même (L.276, L.360, L.439, L.483). Ce n'est pas un token non-conforme à migrer ici — c'est une anomalie de la valeur par défaut du mixin. Signalé en « Anomalies en passant ».

### `@mixin safe-animation()` dans `_mixins.scss:238`

```scss
@mixin safe-animation($name, $duration: motion.timing('base'), $timing: ease-in-out) {
```

**Défaut hardcodé `ease-in-out`** (pas via token). Seul `ImagePreview.scss:79` passe `ease-in` explicitement. Les appels Checkbox et Button passent `easing('linear')` explicitement. **Pas de propagation active par défaut.** Anomalie de définition — signalé en « Anomalies en passant ».

---

## Inventaire `easing('smooth')`

### Cat. 1 — feedback-interactif (confiance high) — 47 usages

| Fichier                                                       | Ligne | Propriété animée                                          | Easing cible |
| ------------------------------------------------------------- | ----- | --------------------------------------------------------- | ------------ |
| `styles/abstracts/_shadows.scss`                              | 278   | `box-shadow` (hover/focus-within card)                    | `linear`     |
| `styles/abstracts/_forms.scss`                                | 221   | `all` (hover/focus input)                                 | `linear`     |
| `components/ui/input/Input.scss`                              | 59    | `border outline` (hover/focus)                            | `linear`     |
| `components/ui/input/Input.scss`                              | 163   | `opacity background-color` (hover)                        | `linear`     |
| `components/ui/floating-pencil/FloatingPencil.scss`           | 51    | `background-color transform` (hover)                      | `linear`     |
| `components/ui/button/button-close/ButtonClose.scss`          | 53    | `background-color color transform` (hover)                | `linear`     |
| `components/ui/button/Button.scss`                            | 51    | `background color` (hover)                                | `linear`     |
| `components/ui/button/button-delete/ButtonDelete.scss`        | 44    | `background-color transform` (hover)                      | `linear`     |
| `components/ui/select/Select.scss`                            | 78    | `border-color background-color` (hover)                   | `linear`     |
| `components/ui/select/Select.scss`                            | 163   | `transform` (chevron rotate ouverture)                    | `linear`     |
| `components/ui/select/Select.scss`                            | 242   | `background-color color` (item hover)                     | `linear`     |
| `components/ui/password-checklist/PasswordChecklist.scss`     | 56    | `background-color` (item hover)                           | `linear`     |
| `components/ui/password-checklist/PasswordChecklist.scss`     | 82    | `transform` (icône validation)                            | `linear`     |
| `components/ui/password-checklist/PasswordChecklist.scss`     | 174   | `background-color border-color transform` (focus/hover)   | `linear`     |
| `components/layout/footer/Footer.scss`                        | 44    | `color` (lien hover)                                      | `linear`     |
| `components/layout/navbar-visiteur/NavbarVisiteur.scss`       | 247   | `background-color` (hover)                                | `linear`     |
| `components/features/cards/cards-edition/CardsEdition.scss`   | 44    | `transform` (chevron rotation)                            | `linear`     |
| `components/features/cards/cards-edition/CardsEdition.scss`   | 117   | `border-color background-color` (slot droppable hover)    | `linear`     |
| `components/features/taches/taches-dnd/TachesDnd.scss`        | 59    | `border-color background-color` (slot hover pendant drag) | `linear`     |
| `components/features/taches/taches-dnd/TachesDnd.scss`        | 138   | `background` (item DnD hover)                             | `linear`     |
| `components/features/time-timer/TimeTimer.scss`               | 167   | `all` (bouton contrôle hover)                             | `linear`     |
| `components/features/time-timer/TimeTimer.scss`               | 295   | `all` (mode preset hover)                                 | `linear`     |
| `components/features/time-timer/TimeTimer.scss`               | 355   | `all` (bouton couleur hover)                              | `linear`     |
| `components/features/time-timer/TimeTimer.scss`               | 418   | `all` (bouton couleur hover)                              | `linear`     |
| `components/features/time-timer/TimeTimer.scss`               | 471   | `border-color` (input focus)                              | `linear`     |
| `components/features/time-timer/TimeTimer.scss`               | 501   | `all` (bouton validation hover)                           | `linear`     |
| `components/features/time-timer/TimeTimer.scss`               | 553   | `all` (bouton fermeture hover)                            | `linear`     |
| `components/features/consent/CookieBanner.scss`               | 142   | `transform background-color border-color` (active)        | `linear`     |
| `components/features/time-timer/FloatingTimeTimer.scss`       | 132   | `transform opacity` (icônes hover)                        | `linear`     |
| `components/features/time-timer/FloatingTimeTimer.scss`       | 142   | `opacity` (icône hover)                                   | `linear`     |
| `components/features/legal/legal-markdown/LegalMarkdown.scss` | 36    | `opacity` (lien hover)                                    | `linear`     |
| `page-components/profil/Profil.scss`                          | 177   | `background box-shadow transform` (item hover)            | `linear`     |
| `page-components/profil/Profil.scss`                          | 291   | `background border-color` (bouton suppression hover)      | `linear`     |
| `page-components/profil/Profil.scss`                          | 335   | `background` (bouton hover)                               | `linear`     |
| `page-components/profil/Profil.scss`                          | 482   | `background` (item liste hover)                           | `linear`     |
| `page-components/edition/Edition.scss`                        | 88    | `transform color` (icône hover)                           | `linear`     |
| `page-components/edition/Edition.scss`                        | 168   | `transform` (chevron accordéon)                           | `linear`     |
| `page-components/forgot-password/ForgotPassword.scss`         | 163   | `color` (lien retour hover)                               | `linear`     |
| `page-components/reset-password/ResetPassword.scss`           | 172   | `color` (toggle password)                                 | `linear`     |
| `page-components/reset-password/ResetPassword.scss`           | 256   | `color` (lien retour hover)                               | `linear`     |
| `page-components/legal/rgpd/PortailRGPD.scss`                 | 82    | `background` (bouton hover)                               | `linear`     |
| `page-components/login/Login.scss`                            | 134   | `color` (lien mot de passe oublié hover)                  | `linear`     |
| `page-components/login/Login.scss`                            | 189   | `color` (toggle password visibility)                      | `linear`     |
| `page-components/login/Login.scss`                            | 270   | `color` (lien signup hover)                               | `linear`     |
| `page-components/signup/Signup.scss`                          | 246   | `color` (lien CGU hover)                                  | `linear`     |
| `page-components/signup/Signup.scss`                          | 309   | `color` (lien retour hover)                               | `linear`     |
| `page-components/signup/Signup.scss`                          | 357   | `color` (lien login hover)                                | `linear`     |

### Cat. 1 — feedback-interactif (confiance medium) — 8 usages

| Fichier                                                               | Ligne | Propriété animée                         | Note                                                                     |
| --------------------------------------------------------------------- | ----- | ---------------------------------------- | ------------------------------------------------------------------------ |
| `components/features/cards/cards-edition/CardsEdition.scss`           | 35    | `background-color`                       | Accordéon ouverture/fermeture (état toggle, pas hover direct)            |
| `components/features/taches/train-progress-bar/TrainProgressBar.scss` | 125   | `background-color border-color`          | Dot actif quand tâche complétée — mise à jour d'état indirecte           |
| `components/features/time-timer/TimeTimer.scss`                       | 323   | `animation-timing-function` (anim `pop`) | Animation sur `.selected-time-button.selected` — état sélectionné        |
| `components/features/time-timer/FloatingTimeTimer.scss`               | 29    | `transform`                              | Timer flottant draggable — scale subtil pendant grab                     |
| `components/ui/upload-progress/UploadProgress.scss`                   | 71    | `width`                                  | Progression upload — feedback indirect (pas déclenché par clic immédiat) |
| `page-components/tableau/Tableau.scss`                                | 123   | `all`                                    | Layout `__content` change quand timer ajouté/retiré                      |
| `page-components/signup/Signup.scss`                                  | 159   | `color`                                  | Champ password validation state `.is-ok` (cf. `@media no-preference`)    |
| `page-components/tableau/Tableau.scss`                                | 188   | `fill` (SVG circle)                      | Cercle progression session — se met à jour à chaque tâche validée        |

### Cat. 2 — apparition (confiance high) — 8 usages

| Fichier                                                   | Ligne | Propriété animée                                     | Easing cible |
| --------------------------------------------------------- | ----- | ---------------------------------------------------- | ------------ |
| `components/ui/select/Select.scss`                        | 199   | animation `slideDownAndFade` (dropdown s'ouvre)      | `ease-out`   |
| `components/ui/select/Select.scss`                        | 204   | animation `slideUpAndFade` (dropdown se ferme)       | `ease-out`   |
| `components/ui/password-checklist/PasswordChecklist.scss` | 108   | `max-height opacity transform` (section pliante)     | `ease-out`   |
| `page-components/profil/Profil.scss`                      | 369   | `max-height opacity` (accordéon)                     | `ease-out`   |
| `page-components/admin/logs/Logs.scss`                    | 334   | animation `fadeIn` (page apparaît)                   | `ease-out`   |
| `page-components/edition/Edition.scss`                    | 122   | animation `fadeIn` (`.recompenses-edition` apparaît) | `ease-out`   |
| `page-components/abonnement/Abonnement.scss`              | 397   | animation `fadeIn` (page apparaît)                   | `ease-out`   |
| `page-components/tableau/Tableau.scss`                    | 141   | animation `slide-up` (TimeTimer widget apparaît)     | `ease-out`   |

### Cat. 2 — apparition (confiance medium) — 3 usages

| Fichier                                | Ligne | Propriété animée           | Note                                                                              |
| -------------------------------------- | ----- | -------------------------- | --------------------------------------------------------------------------------- |
| `components/ui/input/Input.scss`       | 105   | `opacity`                  | Élément vide (`&:empty { opacity: none }`) — message erreur ou label qui apparaît |
| `components/ui/select/Select.scss`     | 305   | `opacity`                  | Idem — label d'erreur vide/non-vide                                               |
| `page-components/tableau/Tableau.scss` | 203   | `transform filter opacity` | `.recompense-final` apparaît quand session terminée                               |

### Cat. 3 — décoratif

Aucun usage de `easing('smooth')` n'a été classifié Cat. 3.

### Incertain — à arbitrer (1 usage)

| Fichier                                         | Ligne | Contexte code   | Hypothèses                                    |
| ----------------------------------------------- | ----- | --------------- | --------------------------------------------- |
| `components/features/time-timer/TimeTimer.scss` | 91    | Voir ci-dessous | Cat. 1 feedback continu ou Cat. 3 décoratif ? |

**Contexte code (TimeTimer.scss L.87–92) :**

```scss
&__red-disk {
  // Transition sur l'attribut SVG 'd' du disque rouge représentant le temps écoulé
  @include safe-transition(d, timing('base'), easing('smooth'));
}
```

Le disque rouge est l'arc SVG qui se referme progressivement au fil du temps (animation du minuteur).

- **Hypothèse Cat. 1** : le disque répond à l'état du minuteur déclenché par l'utilisateur (play/pause/reset) → feedback de la session active.
- **Hypothèse Cat. 3** : la mise à jour est autonome (pilotée par un interval JS, pas par un geste) → décoratif/informatif.

---

## Inventaire `easing('ease-in-out')`

**6 call sites** (+ 1 dans une définition de mixin, voir « Mixin par défaut »)

| Fichier                                                               | Ligne | Propriété animée                           | Contexte                                                                                     | Cat.              | Easing cible |
| --------------------------------------------------------------------- | ----- | ------------------------------------------ | -------------------------------------------------------------------------------------------- | ----------------- | ------------ |
| `styles/abstracts/_mixins.scss`                                       | 563   | `animation-timing-function` (glow)         | `@mixin glow-session` — animation ambient sur un élément en cours de session (infinite glow) | Cat. 3 décoratif  | `linear`     |
| `components/shared/global-loader/GlobalLoader.scss`                   | 26    | animation `fadeIn` (loader apparaît)       | Loader global plein écran qui fade-in                                                        | Cat. 2 apparition | `ease-out`   |
| `components/shared/global-loader/GlobalLoader.scss`                   | 47    | animation `bounce` (dots loader, infinite) | Trois points qui rebondissent en boucle                                                      | Cat. 3 décoratif  | `linear`     |
| `components/shared/signed-image/SignedImage.scss`                     | 48    | animation `skeleton-loading` (infinite)    | Shimmer skeleton sur image en chargement                                                     | Cat. 3 décoratif  | `linear`     |
| `components/shared/error-boundary/ErrorBoundary.scss`                 | 50    | animation `gentleSwing` (infinite)         | Balancement doux de l'icône d'erreur                                                         | Cat. 3 décoratif  | `linear`     |
| `components/features/taches/train-progress-bar/TrainProgressBar.scss` | 175   | `left transform` (locomotive)              | Position et transform du train qui avance                                                    | **Incertain**     | —            |

**Incertain — TrainProgressBar.scss:175 :**

```scss
// L.170–180
z-index: z-index('dropdown');
@include safe-transition(
  (left, transform),
  timing('slow'),
  // durée lente = effet narratif voulu
  easing('ease-in-out')
);

// Modificateur : désactiver animations si reduced_motion (TSA-friendly)
&--no-motion {
  transition: none;
}
```

La locomotive se déplace horizontalement (`left`) quand une tâche est complétée.

- **Hypothèse Cat. 1** : déplacement = retour visuel direct d'une tâche validée → feedback.
- **Hypothèse Cat. 3** : le train est une métaphore décorative de progression (aucun enfant TSA n'a besoin de l'overshoot pour comprendre l'action). La durée `timing('slow')` suggère un effet narratif voulu, pas une réponse immédiate.
- **Note** : `timing('slow')` + `ease-in-out` = accélération/décélération symétrique = animation narrative. L'overshoot de `ease-in-out` n'a pas de valeur fonctionnelle ici — la question est si l'animation est perçue comme feedback ou comme récompense visuelle.

---

## Inventaire `easing('smooth-pop')`

**2 call sites** (dans `TachesDnd.scss` uniquement — les 2 sont incertains)

### Incertain #1 — TachesDnd.scss:95

```scss
// L.88–103
/* [Mobile-first] Base = mobile (320px+) */
height: auto;
min-height: initial;
padding: spacing('xs');
@include safe-transition(
  (transform, box-shadow),
  timing('slow'),
  // durée lente = effet délibéré
  easing('smooth-pop') // cubic-bezier(0.34, 1.56, 0.64, 1)
);

/* Hover uniquement */
&:hover {
  transform: scale(1.05);
  box-shadow: shadow('elevation-md');
  z-index: z-index('dropdown');
}
```

La carte tâche grossit légèrement au hover avec un rebond (overshoot).

- **Hypothèse Cat. 1** : le scale + shadow signale que la carte est interactive → feedback de hover. L'overshoot ajoute du caractère mais garde la valeur fonctionnelle.
- **Hypothèse Cat. 3** : l'effet rebond est purement décoratif (un `scale(1.05)` sans overshoot suffirait à signaler l'interactivité). Le rebond est un effet "jouet" sans valeur d'information.
- **Note TSA** : les rebonds visuels peuvent surprendre des enfants TSA sensibles aux mouvements inattendus. La doctrine recommande `linear` pour éviter cet effet.

### Incertain #2 — TachesDnd.scss:207

```scss
// L.198–208
.drag-overlay-wrapper {
  cursor: grabbing;

  /* Ombre plus prononcée pour l'effet de levée */
  filter: drop-shadow(shadow('elevation-md'));

  /* Légère rotation pour l'effet de soulèvement */
  transform: rotate(3deg) scale(1.05);
  @include safe-transition(transform, timing('fast'), easing('smooth-pop'));
}
```

L'élément en cours de drag a une rotation + scale avec overshoot.

- **Hypothèse Cat. 1** : le `rotate(3deg) scale(1.05)` signale visuellement "j'ai saisi cet élément" → feedback de saisie. L'overshoot renforce la sensation de soulèvement physique.
- **Hypothèse Cat. 3** : la rotation est décorative (un simple `drop-shadow` suffit à signaler la saisie). L'overshoot + rotation = effet visuel sans valeur fonctionnelle pour un enfant TSA.
- **Note** : `timing('fast')` ici, contrairement au hover ci-dessus (`timing('slow')`). La vitesse rapide suggère que c'est une réponse immédiate au geste.

---

## Récap par fichier

| Fichier                                                               | Nb easings à migrer | Catégories impliquées                           |
| --------------------------------------------------------------------- | ------------------- | ----------------------------------------------- |
| `components/features/time-timer/TimeTimer.scss`                       | 9                   | Cat. 1 (8), Incertain (1)                       |
| `components/ui/select/Select.scss`                                    | 6                   | Cat. 1 (3), Cat. 2 (3)                          |
| `page-components/profil/Profil.scss`                                  | 5                   | Cat. 1 (4), Cat. 2 (1)                          |
| `page-components/tableau/Tableau.scss`                                | 4                   | Cat. 1 (2), Cat. 2 (2)                          |
| `page-components/signup/Signup.scss`                                  | 4                   | Cat. 1 (4)                                      |
| `components/ui/password-checklist/PasswordChecklist.scss`             | 4                   | Cat. 1 (3), Cat. 2 (1)                          |
| `components/features/time-timer/FloatingTimeTimer.scss`               | 3                   | Cat. 1 (3)                                      |
| `components/features/cards/cards-edition/CardsEdition.scss`           | 3                   | Cat. 1 (3)                                      |
| `page-components/edition/Edition.scss`                                | 3                   | Cat. 1 (2), Cat. 2 (1)                          |
| `page-components/login/Login.scss`                                    | 3                   | Cat. 1 (3)                                      |
| `components/ui/input/Input.scss`                                      | 3                   | Cat. 1 (2), Cat. 2 (1)                          |
| `components/features/taches/taches-dnd/TachesDnd.scss`                | 4                   | Cat. 1 (2), Incertain smooth-pop (2)            |
| `styles/abstracts/_shadows.scss`                                      | 1                   | Cat. 1                                          |
| `styles/abstracts/_forms.scss`                                        | 1                   | Cat. 1                                          |
| `styles/abstracts/_mixins.scss`                                       | 1                   | Cat. 3 (ease-in-out glow)                       |
| `components/ui/floating-pencil/FloatingPencil.scss`                   | 1                   | Cat. 1                                          |
| `components/ui/button/Button.scss`                                    | 1                   | Cat. 1                                          |
| `components/ui/button/button-close/ButtonClose.scss`                  | 1                   | Cat. 1                                          |
| `components/ui/button/button-delete/ButtonDelete.scss`                | 1                   | Cat. 1                                          |
| `components/ui/upload-progress/UploadProgress.scss`                   | 1                   | Cat. 1 (medium)                                 |
| `components/layout/footer/Footer.scss`                                | 1                   | Cat. 1                                          |
| `components/layout/navbar-visiteur/NavbarVisiteur.scss`               | 1                   | Cat. 1                                          |
| `components/features/taches/train-progress-bar/TrainProgressBar.scss` | 2                   | Cat. 1 medium (smooth), Incertain (ease-in-out) |
| `components/features/consent/CookieBanner.scss`                       | 1                   | Cat. 1                                          |
| `components/features/legal/legal-markdown/LegalMarkdown.scss`         | 1                   | Cat. 1                                          |
| `components/shared/global-loader/GlobalLoader.scss`                   | 2                   | Cat. 2 (1), Cat. 3 (1)                          |
| `components/shared/signed-image/SignedImage.scss`                     | 1                   | Cat. 3                                          |
| `components/shared/error-boundary/ErrorBoundary.scss`                 | 1                   | Cat. 3                                          |
| `page-components/admin/logs/Logs.scss`                                | 1                   | Cat. 2                                          |
| `page-components/forgot-password/ForgotPassword.scss`                 | 1                   | Cat. 1                                          |
| `page-components/reset-password/ResetPassword.scss`                   | 2                   | Cat. 1 (2)                                      |
| `page-components/abonnement/Abonnement.scss`                          | 1                   | Cat. 2                                          |
| `page-components/legal/rgpd/PortailRGPD.scss`                         | 1                   | Cat. 1                                          |

---

## Top 10 fichiers les plus impactés

| Rang | Fichier                  | Nb migrations | Note                                      |
| ---- | ------------------------ | ------------- | ----------------------------------------- |
| 1    | `TimeTimer.scss`         | 9             | 8 Cat. 1 + 1 incertain                    |
| 2    | `Select.scss`            | 6             | Mix Cat. 1 + Cat. 2                       |
| 3    | `Profil.scss`            | 5             | Mix Cat. 1 + Cat. 2                       |
| 4    | `Tableau.scss`           | 4             | Mix Cat. 1 + Cat. 2, contexte enfant TSA  |
| 5    | `Signup.scss`            | 4             | Tous Cat. 1                               |
| 5    | `PasswordChecklist.scss` | 4             | Mix Cat. 1 + Cat. 2                       |
| 7    | `TachesDnd.scss`         | 4             | 2 smooth Cat. 1 + 2 smooth-pop incertains |
| 8    | `FloatingTimeTimer.scss` | 3             | Tous Cat. 1                               |
| 8    | `CardsEdition.scss`      | 3             | Tous Cat. 1                               |
| 8    | `Edition.scss`           | 3             | Mix Cat. 1 + Cat. 2                       |

---

## Estimation effort exécution (Phase B)

### Lots cohérents proposés

**Lot 1 — Boutons & liens (Cat. 1 high, pattern uniforme)** — ~15 usages

- Button, ButtonClose, ButtonDelete, FloatingPencil
- Footer, NavbarVisiteur, LegalMarkdown
- Login (3), Signup (3), ForgotPassword, ResetPassword (2), PortailRGPD
- Pattern identique : `easing('smooth')` → `easing('linear')` partout

**Lot 2 — Formulaires & inputs (Cat. 1 high)** — ~11 usages

- `_shadows.scss`, `_forms.scss` (mixins réutilisés dans tout le projet — impact large)
- Input (2 sur 3), Select (3 sur 6), PasswordChecklist (3 sur 4), UploadProgress

**Lot 3 — TimeTimer + FloatingTimeTimer (Cat. 1 high)** — 11 usages

- TimeTimer (8 sur 9) + FloatingTimeTimer (3)
- Après arbitrage de `TimeTimer:91` (incertain)

**Lot 4 — Apparitions & animations de page (Cat. 2 high)** — 8 usages

- `easing('smooth')` → `easing('ease-out')` dans : Logs, Edition, Abonnement (fadeIn), Tableau (slide-up), Select (slideDown/Up), PasswordChecklist (max-height), Profil (max-height)

**Lot 5 — Reste + medium** — ~14 usages (après arbitrage cas incertains)

- CardsEdition, TachesDnd (smooth), CookieBanner
- Cat. 1 medium : TrainProgressBar:125, TimeTimer:323, FloatingTimeTimer:29, Tableau:123/188, Signup:159, CardsEdition:35
- Cat. 2 medium : Input:105, Select:305, Tableau:203

**Lot 6 — ease-in-out (Cat. 3 clear)** — 4 usages

- GlobalLoader:47, SignedImage:48, ErrorBoundary:50, \_mixins.scss:563
- Plus GlobalLoader:26 (Cat. 2 → ease-out)

**Lot 7 — Après arbitrage Temo**

- TachesDnd:95 et TachesDnd:207 (smooth-pop)
- TrainProgressBar:175 (ease-in-out locomotive)
- TimeTimer:91 (SVG disk `d`)

### Concentration des usages

- Top 5 fichiers = 28 migrations sur 75 (37%)
- Tout `easing('smooth')` Cat. 1 high = 47 migrations mécaniques sans ambiguïté (63% du total)
- `src/styles/abstracts/` : 3 migrations dans des mixins à impact transversal — à traiter en dernier (après avoir migré les call sites directs)

### Cas incertains nécessitant arbitrage

4 usages ne peuvent pas être migrés sans décision de Temo :

1. `TimeTimer.scss:91` — disque SVG rouge (Cat. 1 feedback ou Cat. 3 décoratif ?)
2. `TrainProgressBar.scss:175` — locomotive (Cat. 1 feedback ou Cat. 3 décoratif ?)
3. `TachesDnd.scss:95` — hover carte tâche smooth-pop (Cat. 1 avec suppression rebond ou Cat. 3 → supprimer ?)
4. `TachesDnd.scss:207` — drag overlay smooth-pop (Cat. 1 retour saisie ou Cat. 3 décoratif ?)

---

## Anomalies en passant

> Ces points ne sont pas dans le périmètre du ticket mais ont été identifiés lors du scan.

### A1 — Valeurs hardcodées dans `_mixins.scss` (défauts non-token)

- **L.194** : `@mixin transition-smooth` utilise `ease-in-out` hardcodé (pas via `easing('ease-in-out')`)
- **L.223** : `@mixin safe-transition` a pour défaut `$easing: ease` hardcodé (pas via token)
- **L.238** : `@mixin safe-animation` a pour défaut `$timing: ease-in-out` hardcodé (pas via token)
- **L.276, 360, 439, 483** : quatre appels `@include safe-transition(..., ease)` internes à `_mixins.scss` passent `ease` hardcodé au lieu de `easing('linear')` ou `easing('ease-out')`

### A2 — Mixin `transition-smooth` non-conforme utilisé

- `page-components/edition/Edition.scss:50` — `@include transition-smooth` (utilise `ease-in-out` hardcodé, `timing('base')` — non-conforme)

### A3 — CSS var `--easing-smooth` exportée vers le CSS

- `_motion.scss:160` exporte `--easing-smooth: #{easing('smooth')}` en CSS custom property
- Cette variable CSS sera fausse après migration de `easing('smooth')` → à supprimer ou renommer lors de la Phase B
