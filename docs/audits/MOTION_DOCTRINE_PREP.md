# Préparation application doctrine motion

**Date** : 2026-05-14
**Statut** : Phase 1 — Read-only audit

---

## 1.1 Bug Toggle

**Fichier** : `src/components/ui/toggle/Toggle.scss`

**Bloc extrait** :

```scss
// Ligne 54-56
transition:
  background-color var(--motion-duration-quick) var(--motion-easing-default),
  border-color var(--motion-duration-quick) var(--motion-easing-default);

// Ligne 82-83
transition: transform var(--motion-duration-quick) var(--motion-easing-default);
```

**Grep résultat** :

- `--motion-duration-quick` : **INTROUVABLE** dans src/styles/
- `--motion-easing-default` : **INTROUVABLE** dans src/styles/

**Constat** : Les CSS vars `--motion-duration-quick` et `--motion-easing-default` ne sont **pas définies** dans le système tokens (\_motion.scss, \_tokens.scss, ni aucun autre fichier du design system).

**Comportement runtime probable** :

- Le navigateur applique la valeur `undefined` → transition instantanée (durée 0, easing invalide)
- L'utilisateur observera un changement UI sans animation

**Action requise** : Remplacer par `timing('xs')` et `easing('linear')` pour respect de la doctrine motion.

---

## 1.2 Checkbox smooth-pop

**Fichier** : `src/components/ui/checkbox/Checkbox.scss`

**Bloc extrait** :

```scss
// Ligne 75-79
@include safe-animation(
  checkbox-bounce,
  timing('fast'),
  easing('smooth-pop') // ✅ Token TSA-friendly bounce
);

// Ligne 206-218 — @keyframes checkbox-bounce
@keyframes checkbox-bounce {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(
      1.1
    ); // Bounce adouci TSA (v1.1 §A.6 — animations non-agressives)
  }
  100% {
    transform: scale(1);
  }
}
```

**Animé** :

- **Propriété** : `transform: scale()`
- **Séquence** : 1 → 1.1 (50%) → 1
- **Durée** : `timing('fast')` = 0.15s (150ms)
- **Easing** : `easing('smooth-pop')` = `cubic-bezier(0.34, 1.56, 0.64, 1)`
  - ✅ Overshoot effect (playful bounce)
  - ✅ TSA-compliant (< 0.3s, non-jarring, prévisible)

**Statut** : ✅ **CONFORME DOCTRINE** — Pattern à conserver mais easing doit rester `smooth-pop` (ne pas changer en `linear`)

---

## 1.3 Loader ease-in-out

**Fichier** : `src/components/ui/loader/Loader.scss`

**Bloc extrait** :

```scss
// Ligne 61
animation: loader-dot-bounce 0.3s ease-in-out infinite;

// Ligne 92-104 — @keyframes loader-dot-bounce
@keyframes loader-dot-bounce {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: opacity('md');
  }

  40% {
    transform: scale(1.2);
    opacity: opacity('opaque');
  }
}
```

**Constat** :

- **Hardcodé** : `0.3s ease-in-out` (pas via token)
- **Durée** : 0.3s (= `timing('base')`)
- **Easing** : `ease-in-out` (hardcodé, accessible via `easing('ease-in-out')`)

**Action requise** : Remplacer par `animation: loader-dot-bounce timing('base') easing('ease-in-out') infinite;` ou discuter si `ease-in-out` est approprié (doctrine préfère `linear` pour feedback continu).

---

## 1.4 Button spinner

**Fichier** : `src/components/ui/button/Button.scss`

**Bloc extrait spinner principal** :

```scss
// Ligne 142-148
.btn__spinner {
  display: inline-flex;
  align-items: center;
  gap: spacing('xs');
  margin-inline-end: spacing('xs');

  @include safe-animation(
    spinner-rotate,
    timing('slower'),
    // 1s → 0.5s (TSA-compliant)
    easing('linear')
  );
}
```

**Bloc spinner dots** :

```scss
// Ligne 150-180
.btn__spinner-dot {
  // ...
  &:nth-child(2) {
    @include safe-animation(
      spinner-fade,
      timing('base'),
      // 0.6s → 0.3s (TSA max)
      easing('ease-in-out') // ← HARDCODÉ (ligne 165)
    );
    animation-delay: 0.1s;
    animation-iteration-count: infinite;
  }

  &:nth-child(3) {
    @include safe-animation(
      spinner-fade,
      timing('base'),
      easing('ease-in-out') // ← HARDCODÉ (ligne 175)
    );
    animation-delay: 0.2s;
    animation-iteration-count: infinite;
  }
}

// Ligne 195-205 — @keyframes spinner-fade
@keyframes spinner-fade {
  0% {
    opacity: opacity('lg'); // 0.6
  }
  50% {
    opacity: opacity('opaque'); // 1
  }
  100% {
    opacity: opacity('lg'); // 0.6
  }
}
```

**Contexte confirmé** : ✅ Spinner du bouton en loading state (`&--loading` classe lignes 127-129)

**Constat** :

- **Spinner rotation** (`spinner-rotate`) : ✅ Utilise `easing('linear')` correctement
- **Spinner fade dots** : ❌ Utilise `easing('ease-in-out')` hardcodé aux lignes 165 et 175

**Action requise** : Remplacer `easing('ease-in-out')` par `easing('linear')` pour cohérence doctrine motion (feedback continu, pas de softening).

---

## 1.5 Cas justifiés

### TokensGrid token pop

**Fichier** : `src/components/features/tableau/tokens-grid/TokensGrid.scss`

**Bloc extrait** :

```scss
// Ligne 39-41
&--animated {
  animation: token-pop 0.25s ease-out both;
}

// Ligne 45-59 — @keyframes token-pop
@keyframes token-pop {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }

  70% {
    transform: scale(1.15);
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}
```

**Constat** :

- **Hardcodé** : `0.25s ease-out` (pas via token)
- **Durée** : 0.25s (250ms, entre `timing('xs')` 150ms et `timing('sm')` 200ms)
- **Easing** : `ease-out` (standard reveal, acceptable)
- **Contexte** : Contexte Tableau (enfant TSA), animation d'apparition jeton ✅ OK

**Verdict** : ✅ **ACCEPTABLE** — Animation reveal (non-feedback), durée appropriée, easing `ease-out` justifié pour reveal doux. **Recommandation** : Considérer `timing('fast')` (0.15s) ou `timing('sm')` (0.2s) pour cohérence, mais 0.25s acceptable.

---

### Modal fadeIn

**Fichier** : `src/components/shared/modal/Modal.scss`

**Bloc extrait** :

```scss
// Ligne 37-39
animation-name: fadeIn;
animation-duration: timing('fast');
animation-timing-function: easing('ease-out');
```

**Keyframes** : Référence `fadeIn` (défini centralement, pas dans ce fichier)

**Constat** : ✅ Utilise tokens correctement (`timing('fast')` = 0.15s, `easing('ease-out')`)

**Verdict** : ✅ **CONFORME DOCTRINE**

---

### Modal scaleIn

**Fichier** : `src/components/shared/modal/Modal.scss`

**Bloc extrait** :

```scss
// Ligne 68-70
animation-name: scaleIn;
animation-duration: timing('fast');
animation-timing-function: easing('ease-out');
```

**Keyframes** : Référence `scaleIn` (défini centralement, pas dans ce fichier)

**Constat** : ✅ Utilise tokens correctement (`timing('fast')` = 0.15s, `easing('ease-out')`)

**Verdict** : ✅ **CONFORME DOCTRINE**

---

### Dropdown slideDown

**Fichier** : `src/components/shared/dropdown/Dropdown.scss`

**Bloc extrait** :

```scss
// Ligne 52-54
animation-name: slideDown;
animation-duration: timing('fast');
animation-timing-function: easing('ease-out');

// Ligne 73-84 — @keyframes slideDown
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(
      -0.5rem
    ); // TODO Phase 7 : valeur fixe keyframe (spacing() non applicable ici)
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Constat** :

- ✅ Utilise tokens correctement (`timing('fast')`, `easing('ease-out')`)
- ⚠️ Keyframe utilise valeur hardcodée `-0.5rem` (cf. TODO Phase 7)

**Verdict** : ✅ **ACCEPTABLE** — Motion tokens corrects, hardcode dans keyframe est limitation connue SCSS (spacing() n'est pas applicable en keyframes).

---

## 1.6 Tokens easing — usages réels

### Résultats grep exhaustifs

**Méthodologie** :

- Recherche des appels fonctions `easing('TOKEN')` dans src/
- Recherche des easings hardcodés CSS (ease, ease-in, ease-out, linear, cubic-bezier)
- Résultat : **Aucun appel via fonction `easing()` trouvé**, tous les usages sont hardcodés directement

| Token         | Valeur                                   | Usages dans src/ | Fichiers                                          | À supprimer ?                                  |
| ------------- | ---------------------------------------- | ---------------- | ------------------------------------------------- | ---------------------------------------------- |
| `linear`      | `linear`                                 | 1                | Button.scss:146 (spinner-rotate via mixin)        | NON — Token cœur utilisé                       |
| `smooth`      | `ease`                                   | 0                | —                                                 | À DISCUTER — Token défini mais non utilisé     |
| `ease-out`    | `ease-out`                               | 4+               | Modal.scss:39/70, Dropdown.scss:54, TokensGrid:40 | NON — Utilisé pour reveals                     |
| `ease-in`     | `ease-in`                                | 0                | —                                                 | OUI — Non utilisé, peut supprimer              |
| `ease-in-out` | `ease-in-out`                            | 2                | Loader.scss:61, Button.scss:165/175 (hardcodé)    | À REFACTOR — Utilisation non conforme doctrine |
| `smooth-pop`  | `cubic-bezier(0.34, 1.56, 0.64, 1)`      | 1                | Checkbox.scss:78                                  | NON — Utilisé après refactor checkbox          |
| `smooth-out`  | `cubic-bezier(0.25, 0.46, 0.45, 0.94)`   | 0                | —                                                 | À DISCUTER — Token défini mais non utilisé     |
| `smooth-in`   | `cubic-bezier(0.55, 0.055, 0.675, 0.19)` | 0                | —                                                 | OUI — Non utilisé, peut supprimer              |
| `bounce-easy` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | 0                | —                                                 | OUI — Non utilisé, peut supprimer              |

### Sites à refactorer avant suppression (usages ease-in-out)

1. **`src/components/ui/loader/Loader.scss`** ligne 61
   - `animation: loader-dot-bounce 0.3s ease-in-out infinite;`
   - **Action** : Remplacer `ease-in-out` par `easing('linear')` si doctrine dictate ou conserver si animation spéciale justifiée

2. **`src/components/ui/button/Button.scss`** lignes 165, 175
   - `@include safe-animation(..., timing('base'), easing('ease-in-out'))`
   - **Action** : Remplacer par `easing('linear')` pour cohérence feedback spinner

### Recommandations suppression

**Tokens à supprimer (0 usages)** :

- `ease-in` — Aucun cas d'usage trouvé
- `smooth-in` — Aucun cas d'usage trouvé
- `bounce-easy` — Aucun cas d'usage trouvé
- `smooth-out` — Aucun cas d'usage trouvé (peut garder si vision future)

**Tokens à conserver avec action** :

- `smooth` — Actuellement non utilisé, mais présent dans `@include safe-transition()` default. Vérifier si utilisé via mixin.

---

## 1.7 Token timing bounce (0.6s)

**Définition** : `$motion-tokens['timing']['bounce'] = 0.6s`

**Grep résultat** :

```
Found 0 total occurrences across 0 files
```

**Usages** : **ZÉRO**

**Constat** :

- Token défini dans `_tokens.scss` mais **jamais utilisé** dans le codebase
- Durée 0.6s (600ms) dépasse le max TSA recommandé de 0.3s pour feedback
- Pas de fichiers référençant ce timing

**Type d'animations potentiel** (basé sur nom) :

- Animations de rebond/bounce (non-feedback décoratif)
- Séquences élaborées (exceeds TSA guidelines)

**Verdict** : ✅ **PEUT ÊTRE SUPPRIMÉ** ou conservé si vision future pour animations décoratives hors Contexte Tableau.

---

## Synthèse pour validation Temo

### Confirmations attendues

1. **Toggle CSS vars bug**
   - Problème : `--motion-duration-quick` et `--motion-easing-default` non définis
   - Solution attendue : Utiliser `timing('xs')` + `easing('linear')`
   - Urgence : **HAUTE** (actuellement sans animation)

2. **Checkbox bounce animation**
   - Statut : ✅ Conforme
   - Détail : Animation scale 1→1.1→1 en 0.15s avec smooth-pop easing
   - Décision : Conserver pattern, confirmer que `smooth-pop` reste acceptable pour bounce

3. **Loader ease-in-out**
   - Constat : Hardcodé `0.3s ease-in-out`
   - Question : Passer à `easing('linear')` ou `easing('ease-out')` ?
   - Durée 0.3s est acceptable, easing peut être optimisé

4. **Button spinner**
   - Problème : Dots utilisent `easing('ease-in-out')` hardcodé (lignes 165, 175)
   - Solution : Remplacer par `easing('linear')` pour cohérence
   - Rotation spinner : ✅ Déjà conforme avec `easing('linear')`

5. **Tokens à supprimer**
   - Candidates (0 usages) : `ease-in`, `smooth-in`, `bounce-easy`, éventuellement `smooth-out`
   - Confirmation requise : Pouvons-nous supprimer sans impact futur ?

6. **Tokens à refactorer**
   - `ease-in-out` : 2 usages (Loader, Button) → Refactor vers doctrine
   - `smooth` : 0 usages réels (mais défaut dans mixins)
   - `smooth-pop` : 1 usage (Checkbox) → Conserver

7. **Timing bounce (0.6s)**
   - Statut : Défini mais non utilisé
   - Décision : Supprimer ou archiver pour futures animations décoratives ?

---

## Dépendances pour Phase 2

- Clarification doctrine TSA : ease-in-out acceptable ou forbidden ?
- Validation pattern Checkbox bounce : garder smooth-pop ou fallback linear ?
- Liste tokens à promouvoir/supprimer : à confirmer par Temo
- Plan refactor Loader/Button spinner : timing et ordre des opérations
