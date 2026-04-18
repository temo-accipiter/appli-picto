# Direction visuelle — Appli-Picto

**Version** : 1.1 (remplace v1.0 entièrement — v1.0 obsolète)
**Date** : 2026-04-18
**Statut** : Contrat de design — ces décisions sont figées et servent de référence pour toutes les phases de refactor visuel à venir.

---

## Changelog v1.1 vs v1.0

Cette version corrige **4 erreurs structurelles** de la v1.0 détectées par `audit-styles-structure.md` et `audit-aliases-phase6.md`. Les erreurs résidaient dans le vocabulaire et non dans les décisions de direction elles-mêmes (couleurs, typo, densité).

| #   | Correction                                                                                                                                                             | Raison                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Rondeurs : utilisation des aliases sémantiques composants (`button`, `card`, `modal`, `input`) au lieu de clés primitives (`md`, `lg`, `xl`)                           | v1 utilisait des clés primitives dont les valeurs diffèrent entre Phase 6 et legacy. Les aliases composants retournent les bonnes valeurs quelle que soit la couche. |
| 2   | Espacements : utilisation des aliases existants (`card-padding`, `button-padding-*`, `section-gap`, etc.) au lieu d'aliases inventés (`inset-sm`, `stack-tight`, etc.) | v1 proposait de créer des tokens qui existaient déjà sous d'autres noms. Réutiliser l'existant évite la dette.                                                       |
| 3   | Typography : clarification que l'on utilise le système legacy actuel, migration semantics reportée à T2-E                                                              | v1 supposait que les aliases typographiques sémantiques étaient fonctionnels. Ils sont définis mais orphelins (wrapper `font-size()` ne les lit pas).                |
| 4   | Shadows : blocage explicite de `shadow()` sur composants atomiques jusqu'à T1-B résolu                                                                                 | v1 recommandait `shadow()` sans savoir qu'il existait un conflit de nommage critique. Deux fonctions `shadow()` coexistent avec sémantiques incompatibles.           |

---

## Préambule

Ce document n'est pas un moodboard, pas un guide de style exhaustif. C'est un **contrat de design** : chaque décision a été prise consciemment après challenge et argumentaire. Toute déviation future doit être documentée et justifiée, pas improvisée.

**Positionnement produit retenu** :

- App psycho-éducative pour enfants TSA + parents
- Ton visuel cible : doux / chaleureux / réconfortant, mais tenu
- Mobile-first, utilisable sur tablette et desktop
- WCAG 2.2 AA non-négociable
- Usage 50/50 adulte (Édition, Admin, Profil, public) / enfant (Tableau)

**Principe directeur** : deux atmosphères distinctes pour les deux contextes (adulte / enfant), un système commun de tokens et règles pour les porter sans fragmentation.

**Architecture système sous-jacente** :

- Système à 3 couches : primitives (valeurs brutes) → semantics (aliases composants) → legacy tokens
- Radius et Spacing : les 3 couches sont connectées (wrappers lisent semantics → primitives → legacy)
- Typography et Motion : semantics orphelins (wrappers lisent uniquement legacy) — migration T2-E prévue
- Shadows : conflit de nommage `shadow()` à résoudre en T1-B

---

## Partie A — Fondations fonctionnelles du Tableau enfant

Ces règles conditionnent toute l'UX enfant. Elles sont structurantes pour la suite.

### A.1 — Composants gardés

| Composant             | Rôle                                                 | Décision                                                       |
| --------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| TrainProgressBar      | Feedback visuel gamifié (locomotive + rail de métro) | Gardé, optionnel via paramètres adulte                         |
| Progression textuelle | Feedback factuel "X sur N tâches"                    | Gardé mais traitement revu (taille, placement, couleur neutre) |

### A.2 — Composants supprimés ou déplacés

| Élément                                                           | Décision                                       |
| ----------------------------------------------------------------- | ---------------------------------------------- |
| Dropdown "Ligne 1" (sélection ligne métro)                        | Déplacé dans Édition (réglage adulte)          |
| Avatar enfant en haut à droite                                    | Supprimé du Tableau                            |
| Menu système côté enfant (langue, thème, déconnexion, navigation) | Supprimé — ces options sont strictement adulte |

### A.3 — Sortie du contexte enfant

Un **bouton discret "Retour adulte"** permet de basculer du Tableau vers les contextes adulte. La confirmation est obligatoire (PIN ou équivalent). C'est la seule porte de sortie du contexte enfant.

Implication DB : session lock côté enfant, à verrouiller par trigger (cohérent avec l'architecture DB-first existante).

### A.4 — Modèle d'interaction des cartes

**Carte mère (tâche principale)** validable par deux chemins :

1. **Clic direct sur le rond de validation** sous la card
2. **Cascade** : toutes les sous-cartes cochées → carte mère validée automatiquement

**Sous-cartes (étapes)** :

- Cochables **indépendamment**, décochables **librement**
- Le décochage d'une sous-carte ne dé-valide **jamais** la carte mère (asymétrie intentionnelle)
- Cachées par défaut, révélées via bouton "Voir les étapes" (décision produit assumée)

**Validation carte mère** :

- Irréversible pour l'enfant
- Le parent peut tout réinitialiser via "Réinitialiser la session" côté Édition, avec confirmation

### A.5 — État visuel d'une carte validée

- Opacité **85%** (succès calme, pas disabled)
- Coche verte bien visible
- Fond vert pastel doux (type `--color-success-subtle`)
- `pointer-events: none` (non-cliquable mais toujours visible comme récompense)

**Principe fondamental** : une carte validée est une **célébration**, pas une extinction.

### A.6 — Règles TSA transverses

| Contrainte                                 | Valeur                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Transitions                                | ≤ 200ms pour les interactions, ≤ 300ms pour les changements d'état |
| Animations agressives (bounce, pulse fort) | Interdites                                                         |
| Messages techniques côté enfant            | Interdits                                                          |
| Cibles tactiles Tableau                    | Minimum 56px, préféré 64px                                         |
| Focus clavier                              | Toujours visible, 2px `--color-primary`                            |
| Contrastes texte                           | ≥ 4.5:1 (WCAG AA), viser 7:1 pour le texte principal               |

---

## Partie B — Palette sémantique

### B.1 — Principe

**7 rôles sémantiques**, plus un système parallèle de couleurs de rôles utilisateurs (non-fusionnable).

Chaque rôle sémantique expose 3 variantes :

- `base` : couleur principale (actions, emphase)
- `hover` : variante sombrée (10-15% plus foncée)
- `subtle` : variante très pâle (fonds, banners)

### B.2 — Les 7 rôles

| Rôle                | Light `base` | Dark `base` | Usage                                                     |
| ------------------- | ------------ | ----------- | --------------------------------------------------------- |
| **Primary**         | `#0077C2`    | `#4DABF7`   | Actions principales, liens, brand                         |
| **Success**         | `#16A34A`    | `#4ADE80`   | Validation, carte validée, confirmation                   |
| **Warning**         | `#F59E0B`    | `#FBBF24`   | Alerte non-bloquante                                      |
| **Danger**          | `#DC2626`    | `#F87171`   | Destruction irréversible **uniquement**                   |
| **Info**            | `#3B82F6`    | `#60A5FA`   | Message informatif neutre                                 |
| **Neutral** (texte) | `#334155`    | `#E2E8F0`   | Texte, bordures, surfaces                                 |
| **Accent**          | `#FFB400`    | `#FCD34D`   | Récompense, train, célébration — **décoratif uniquement** |

### B.3 — Variables CSS cibles

```scss
:root {
  --color-primary: #0077c2;
  --color-primary-hover: #005a94;
  --color-primary-subtle: #e6f2fa;

  --color-success: #16a34a;
  --color-success-hover: #14803d;
  --color-success-subtle: #dcfce7;

  --color-warning: #f59e0b;
  --color-warning-hover: #d97706;
  --color-warning-subtle: #fef3c7;

  --color-danger: #dc2626;
  --color-danger-hover: #b91c1c;
  --color-danger-subtle: #fee2e2;

  --color-info: #3b82f6;
  --color-info-hover: #2563eb;
  --color-info-subtle: #dbeafe;

  --color-accent: #ffb400;
  --color-accent-hover: #d97706;
  --color-accent-subtle: #fef3c7;

  --color-text: #334155;
  --color-text-muted: #64748b;
  --color-bg: #ffffff;
  --color-surface: #f8fafc;
  --color-border: #e2e8f0;
}
```

### B.4 — Règles d'usage non-négociables

1. **Jamais** de hex direct dans un composant → toujours `var(--color-*)`
2. **Jamais** deux rôles pour la même couleur (rouge = danger uniquement)
3. **Pas de disabled coloré** → opacité + cursor uniquement
4. **Primary ≤ 30% de la surface d'un écran** — c'est une action, pas un décor
5. **Danger = irréversible uniquement**. "Réinitialiser mot de passe" = `warning`
6. **Accent est décoratif**. Version assombrie `#D97706` si besoin texte/bouton

### B.5 — Couleurs de rôles utilisateurs (système séparé)

Non-fusionnable avec la palette sémantique d'action. Identification dans UI adulte uniquement.

| Rôle    | Couleur                        |
| ------- | ------------------------------ |
| Admin   | `#667EEA` (violet, immuable)   |
| Abonné  | `#22C55E` (vert)               |
| Free    | `#64748B` (slate)              |
| Visitor | `#EA580C` (orange)             |
| Staff   | `#8B5CF6` (violet plus saturé) |

### B.6 — État actuel CSS vars vs palette prescrite

**T1-C à résoudre** : les `--color-*` actuellement définis dans `_light.scss` / `_dark.scss` divergent des valeurs prescrites ici (notamment `--color-primary` actuel = `blue(600)` = `#2563EB` vs prescrit `#0077C2`).

Cette correction sera faite en T1-C, avant refactor Button. Pour l'instant les composants utilisent les valeurs `_light.scss` actuelles.

---

## Partie C — Typographie

### C.1 — Fonte principale

**Atkinson Hyperlegible** (Google Fonts, self-hosted recommandé).

Choix motivé :

- Conçue pour lisibilité renforcée (TSA, dyslexie, basse vision)
- Chaque lettre différenciable (pas de confusion I/l/1 ni O/0)
- ~30KB pour 2 poids
- Sérieuse mais humaine

Fallback : `font-family: 'Atkinson Hyperlegible', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`

### C.2 — Système actuel et cible future

**État actuel (v1.1)** :

- Wrapper `font-size()` lit uniquement `$font-size-tokens` (legacy)
- Échelle legacy disponible : `xs` (12px), `sm` (14px), `base` (16px), `lg` (18px), `xl` (20px), `2xl` (24px), `3xl` (30px), `4xl` (36px), `5xl` (48px)
- Aliases sémantiques `$typography-semantic` définis mais **orphelins** (non lus par le wrapper)

**Pour le refactor composants (maintenant)** : utiliser le système legacy tel quel avec les clés de l'échelle.

**Cible T2-E (plus tard)** : brancher `font-size()` sur semantics pour pouvoir écrire `font-size('body')`, `font-size('heading-md')`, `font-size('button')`. L'échelle legacy deviendra un fallback.

### C.3 — Échelle active pour refactor composants

| Palier | Valeur legacy | Usage                                   |
| ------ | ------------- | --------------------------------------- |
| `sm`   | 14px          | Labels secondaires, métadonnées         |
| `base` | 16px          | Texte courant (par défaut)              |
| `lg`   | 18px          | Texte courant contexte enfant (Tableau) |
| `xl`   | 20px          | Sous-titres, boutons importants         |
| `2xl`  | 24px          | Titres de sections                      |
| `3xl`  | 30px          | Titres de page (rare)                   |

Pour l'instant, **utiliser ces clés legacy via `font-size('base')`, `font-size('lg')`, etc.**

Tokens restants (`xs` 12px, `4xl` 36px, `5xl` 48px) : usage exceptionnel.

### C.4 — Poids actifs

| Poids      | Valeur | Usage                                  |
| ---------- | ------ | -------------------------------------- |
| `regular`  | 400    | Texte par défaut                       |
| `semibold` | 600    | Labels importants, boutons, emphase UI |
| `bold`     | 700    | Titres principaux, emphase forte       |

Autres poids (`thin`, `light`, `medium`, `extrabold`, `black`) : **hors usage**.

### C.5 — Règles transverses

- `line-height: 1.5` (`normal`) par défaut
- `line-height: 1.25` (`tight`) pour les titres uniquement
- `letter-spacing: 0` partout sauf cas spécifique documenté
- Pas de `text-transform: uppercase` sur plus de 3 mots

---

## Partie D — Rondeur système (corrigée v1.1)

### D.1 — Philosophie

**Axe C — Différentiel adulte / enfant**. Deux sets de règles, un système Phase 6 de tokens commun.

### D.2 — Vocabulaire sémantique composant (Phase 6)

Le système Phase 6 fournit des aliases sémantiques **directement lisibles** par les composants via `radius('<alias>')`. Ces aliases résolvent vers des valeurs Phase 6 qui peuvent **différer des clés primitives**.

**Aliases composants existants** (source : `audit-aliases-phase6.md`) :

| Alias              | Valeur résolue | Usage canonique                                    |
| ------------------ | -------------- | -------------------------------------------------- |
| `radius('button')` | 6px            | Boutons (tous contextes adulte et enfant standard) |
| `radius('input')`  | 6px            | Inputs, selects, textareas                         |
| `radius('card')`   | 12px           | Cards statiques                                    |
| `radius('modal')`  | 20px           | Modales                                            |
| `radius('badge')`  | 50%            | Badges, pills                                      |
| `radius('avatar')` | 50%            | Avatars circulaires                                |

**Aliases génériques disponibles** si besoin d'une valeur hors alias composant :

| Alias              | Valeur résolue |
| ------------------ | -------------- |
| `radius('subtle')` | 4px            |
| `radius('small')`  | 6px            |
| `radius('medium')` | 12px           |
| `radius('large')`  | 20px           |
| `radius('xlarge')` | 24px           |
| `radius('full')`   | 50%            |

### D.3 — Rondeurs UI adulte / neutre

Applique aux contextes : Login, Profil, Édition, Admin, RGPD, CGU, Abonnement.

| Composant               | Token              | Valeur |
| ----------------------- | ------------------ | ------ |
| Button                  | `radius('button')` | 6px    |
| Input, Select, Textarea | `radius('input')`  | 6px    |
| Checkbox, Radio         | `radius('subtle')` | 4px    |
| Card                    | `radius('card')`   | 12px   |
| Modal                   | `radius('modal')`  | 20px   |
| Tooltip                 | `radius('subtle')` | 4px    |
| Badge, Tag              | `radius('badge')`  | 50%    |
| Avatar                  | `radius('avatar')` | 50%    |

### D.4 — Rondeurs UI enfant (Tableau)

Le contexte enfant demande des rondeurs plus généreuses. On utilise les aliases génériques car il n'existe pas d'aliases sémantiques "enfant-spécifiques".

| Composant                  | Token              | Valeur |
| -------------------------- | ------------------ | ------ |
| Button (action enfant)     | `radius('medium')` | 12px   |
| Rond de validation         | `radius('full')`   | 50%    |
| Card mère (tâche)          | `radius('large')`  | 20px   |
| Card sous-tâche            | `radius('medium')` | 12px   |
| TrainProgressBar container | `radius('medium')` | 12px   |

### D.5 — Règles transverses

- Jamais de rondeur > 24px (`xlarge`) sauf `full` pour cercles parfaits
- Pas de micro-variation (±2px) — toujours sur l'échelle
- Utiliser les aliases composants en priorité, aliases génériques sinon
- **Jamais** utiliser les clés primitives (`md`, `lg`, `xl`) ni les clés legacy (`rounded-Npx`)

### D.6 — Statut post-Phase 1.5

Commit Phase 1.5 (c4eeb51) a nettoyé `$radius-tokens`. Mais `$radius-primitives` contient encore `rounded-6px`, `rounded-10px`, `rounded-12px` (dette T2 identifiée dans `audit-styles-structure.md`).

**Ne pas toucher pour l'instant** — ces clés ne sont pas exposées aux composants via les aliases sémantiques, donc sans impact immédiat sur le refactor. Traitement dans une phase ultérieure.

---

## Partie E — Rythme & densité (corrigée v1.1)

### E.1 — Densité par contexte

| Contexte           | Stack vertical                  | Padding card                             |
| ------------------ | ------------------------------- | ---------------------------------------- |
| Tableau enfant     | `spacing('section-gap')` (48px) | `spacing('card-padding')` (24px) ou plus |
| Édition adulte     | `spacing('grid-gap')` (16px)    | `spacing('card-padding')` (24px)         |
| Admin / dashboards | `spacing('nav-gap')` (8px)      | `spacing('nav-padding')` (16px)          |
| Pages publiques    | `spacing('grid-gap')` (16px)    | `spacing('card-padding')` (24px)         |

### E.2 — Aliases sémantiques composants (Phase 6)

**Source** : `audit-aliases-phase6.md`. 12 aliases disponibles, grille 4px stricte respectée.

| Alias                          | Valeur | Usage canonique               |
| ------------------------------ | ------ | ----------------------------- |
| `spacing('card-padding')`      | 24px   | Padding interne cards         |
| `spacing('input-padding')`     | 8px    | Padding interne inputs        |
| `spacing('button-padding-x')`  | 24px   | Padding horizontal boutons    |
| `spacing('button-padding-y')`  | 8px    | Padding vertical boutons      |
| `spacing('modal-padding')`     | 32px   | Padding interne modales       |
| `spacing('nav-padding')`       | 16px   | Padding éléments navigation   |
| `spacing('nav-gap')`           | 8px    | Gap entre éléments navigation |
| `spacing('container-padding')` | 24px   | Padding containers layout     |
| `spacing('section-gap')`       | 48px   | Gap entre sections majeures   |
| `spacing('grid-gap')`          | 16px   | Gap grilles et listes         |
| `spacing('heading-gap')`       | 24px   | Gap entre titre et contenu    |

### E.3 — Rythme vertical (3 niveaux conceptuels)

Les 3 rythmes verticaux conceptuels mappent sur les aliases Phase 6 existants :

| Rythme conceptuel | Token Phase 6            | Valeur | Usage                                           |
| ----------------- | ------------------------ | ------ | ----------------------------------------------- |
| Tight             | `spacing('nav-gap')`     | 8px    | Éléments liés (label + input, icône + texte)    |
| Base              | `spacing('grid-gap')`    | 16px   | Éléments d'un groupe (inputs d'un formulaire)   |
| Loose             | `spacing('heading-gap')` | 24px   | Entre titre et contenu, entre items d'une liste |
| Very loose        | `spacing('section-gap')` | 48px   | Sections distinctes                             |

### E.4 — Philosophie responsive

**Hybride par contexte** :

- **Scale-up** (mobile agrandi) : Tableau enfant, pages publiques, Profil
- **Adaptive** (structure différenciée) : Édition, Admin

### E.5 — Max-widths desktop

| Contexte                                | Max-width desktop |
| --------------------------------------- | ----------------- |
| Publique formulaire (Login, Abonnement) | 480px             |
| Publique lecture (RGPD, CGU, Mentions)  | 720px             |
| Profil                                  | 720px             |
| Édition                                 | 1200px            |
| Admin (Logs, Metrics, Permissions)      | 1400px            |
| Tableau enfant                          | 1400px            |

Mobile et tablette : 100% avec padding adapté.

### E.6 — Paddings latéraux par device

| Device                | Padding horizontal                |
| --------------------- | --------------------------------- |
| Mobile (< 768px)      | `spacing('nav-padding')` (16px)   |
| Tablette (768-1024px) | `spacing('card-padding')` (24px)  |
| Desktop (> 1024px)    | `spacing('modal-padding')` (32px) |

### E.7 — Règle de fer

**Jamais** de valeurs spacing hardcodées ni de clés primitives (`xs`, `sm`, `md`, `lg`, `xl`) dans les composants. **Toujours** utiliser les aliases sémantiques composants (`card-padding`, `button-padding-*`, `section-gap`, etc.).

Les clés primitives (`spacing('xs')`, `spacing('sm')`) restent autorisées uniquement pour cas exotiques non-couverts par un alias sémantique composant. Dans ce cas, documenter dans le commit pourquoi aucun alias ne convient.

---

## Partie F — Ombres & profondeur (corrigée v1.1)

### F.1 — Politique générale

**Minimaliste stricte** : bordure OU ombre, jamais les deux. Ombre réservée aux éléments **réellement** flottants (modal, dropdown, tooltip, toast, popover).

Exception explicite : hover sur cards interactives du Tableau enfant (voir F.4).

### F.2 — Statut actuel de `shadow()` — T1-B à résoudre

**Conflit de nommage critique** (source : `audit-aliases-phase6.md`) :

- `shadow()` de `_colors.scss` : retourne des couleurs RGBA (ex : `rgba(0,0,0,0.1)`)
- `shadow()` de `_shadows.scss` : retourne des élévations complètes (ex : `0 1px 3px rgba(...)`)

La fonction `shadow()` actuellement exposée via `_index.scss` est celle de `_colors.scss`. Les aliases sémantiques composants `shadow('card')`, `shadow('button')`, `shadow('modal')` définis dans `$shadow-semantic` sont **orphelins** (non lus par le wrapper actif).

**Conséquence immédiate** : aucun composant ne peut utiliser `shadow('card')` ou équivalent tant que T1-B n'est pas résolu.

### F.3 — Règles pour le refactor composants (pendant que T1-B n'est pas résolu)

Pour les composants atomiques suivants, **ne pas utiliser de `box-shadow` du tout** :

- Button, Input, Select, Textarea, Checkbox, Radio
- Card statique (utiliser bordure `--color-border`)
- Badge, Tag, Avatar

Pour les composants flottants (Modal, Dropdown, Tooltip, Toast) : **les refactorer après T1-B**. Si absolument nécessaire avant, utiliser une `box-shadow` hardcodée **documentée** avec un commentaire `// TODO: migrer vers shadow('modal') après T1-B`.

### F.4 — Hover cards — règle par contexte

| Contexte                             | Hover traitement                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Tableau enfant (cards de tâches)     | Changement bg (`--color-surface` → `--color-bg-hover`) + subtle shadow (hardcodée jusqu'à T1-B, ensuite `shadow('card-hover')`) |
| Adulte (cards Profil, Édition, etc.) | Changement bg seul, pas d'ombre                                                                                                 |

### F.5 — Focus clavier (non-négociable)

Indépendamment du hover, tout élément interactif doit avoir un focus clavier visible :

- `outline: 2px solid var(--color-primary)`
- `outline-offset: 2px`
- Applicable sur tous les devices
- **Jamais** `:focus { outline: none }`

### F.6 — Cible après T1-B

Une fois le conflit `shadow()` résolu, les 5 aliases sémantiques composants deviendront utilisables :

| Alias                  | Niveau                                         |
| ---------------------- | ---------------------------------------------- |
| `shadow('card')`       | xs (subtle, pour cards interactives au repos)  |
| `shadow('card-hover')` | lg (elevated, pour cards hover Tableau enfant) |
| `shadow('button')`     | xs (subtle)                                    |
| `shadow('modal')`      | 2xl (flottant)                                 |
| `shadow('dropdown')`   | xl (flottant)                                  |

---

## Partie G — Plan d'exécution

### G.1 — Phases T1 (avant refactor composants)

**✅ T1-D** — Suppression `@forward admin-ui` (commit afad8fd) — FAIT

**⏳ T1-A** — Direction visuelle amendée — **CE DOCUMENT v1.1**

**⏳ T1-B** — Résoudre conflit `shadow()`

- Renommer `shadow()` de `_colors.scss` en `shadow-color()` (plus explicite)
- Garder `shadow()` de `_shadows.scss` comme fonction principale
- Valider que les aliases `$shadow-semantic` (card, card-hover, button, modal, dropdown) sont bien lus

**⏳ T1-C** — Aligner CSS vars `--color-*` sur palette prescrite

- Mettre à jour `_light.scss` et `_dark.scss` avec les 7 rôles × 3 variantes du doc v1.1
- Vérifier non-régression visuelle sur écrans existants
- Documenter chaque changement de valeur dans le commit

### G.2 — Phase 2 (refactor composants atomiques)

Ordre recommandé, après T1-A + T1-B + T1-C :

1. **Button** (atome le plus utilisé, porte palette primary/success/warning/danger)
2. **Input + Select + Textarea** (groupe forms, patterns communs)
3. **Checkbox + Radio** (groupe sélection)
4. **Card** (deux variantes : adulte et enfant)
5. **Badge + Tag**
6. **Modal + Tooltip + Toast** (groupe flottants, **requiert T1-B fait**)
7. **Avatar**

Cet ordre permet de valider progressivement les règles de ce document. Si une règle ne tient pas sur Button, on la révise en v1.2 avant d'attaquer Input.

### G.3 — Phase 3 (écrans refactorés)

8. **Écrans publics** (Login, Abonnement)
9. **Profil**
10. **Édition** (plus complexe, après validation système sur écrans simples)
11. **Admin** (dernier, bénéficie des apprentissages)
12. **Tableau enfant** (le plus important UX, en dernier quand tous les atomes sont prêts)

### G.4 — Phases T2 (dette à résoudre en parallèle ou après refactor)

- **T2-E** — Brancher `font-size()`, `timing()`, `easing()` sur semantics/primitives
- **T2** — Migration résiduelle `$spacing-tokens` (alias numériques `'1'`, `'2'`, `'3'`, etc.)
- **T2** — Nettoyage `$radius-primitives` (rounded-6px, rounded-10px, rounded-12px résiduels)
- **T2** — Consolidation des maps de couleurs legacy vers vars sémantiques
- **T2** — Nettoyage de la clé `'admin-ui'` dans `$shadow-tokens` + fonction `admin-shadow()` orpheline

### G.5 — Garde-fous process

- Chaque refactor composant = commit atomique local (pas de push) avec test visuel avant validation
- Toute déviation à ce document = commit qui amende la direction visuelle (v1.2, v1.3, etc.)
- Les décisions fonctionnelles du Tableau enfant (Partie A) sont les plus fragiles — relire avant chaque refactor touchant au contexte enfant

---

## Partie H — Anti-patterns à éliminer

Issu des 4 captures analysées, voici les anti-patterns à corriger lors des refactors.

### H.1 — Multi-rouges sans sémantique

Constaté sur Profil : "Réinitialiser mot de passe" et "Supprimer mon compte" utilisent le même rouge, alors que l'un est réversible et l'autre irréversible.

**À corriger** : réinitialisation = `warning` (orange). Suppression = `danger` (rouge).

### H.2 — Cards à traitements incohérents

Constaté sur Profil : sections avec bord gauche coloré (bleu, rouge) qui cohabitent avec sections sans bord.

**À corriger** : une card = un seul traitement (bordure complète 1px OU rien). Si emphase nécessaire, utiliser `--color-*-subtle` en fond.

### H.3 — Boutons sans hiérarchie sémantique

Constaté sur Édition Tableau : 3 boutons côte à côte ("Créer une carte" bleu, "Créer carte de banque" rouge, "Gérer catégories" gris) sans logique sémantique.

**À corriger** : une seule action primary visible simultanément par écran. Autres actions en secondary (outline ou ghost). Pas de rouge sur une création.

### H.4 — Densité incohérente

**À corriger** : appliquer strictement les aliases Phase 6 (`card-padding`, `button-padding-*`, `section-gap`, `grid-gap`, etc.) par contexte.

### H.5 — Footer lourd sur écran enfant/édition

Constaté sur Édition : 9 liens légaux en ligne.

**À corriger** : footer compact avec regroupement.

### H.6 — Dropdown de personnalisation sur écran enfant

Constaté sur Tableau enfant : dropdown "Ligne 1" affiché en permanence.

**À corriger** : déplacé en Édition (voir A.2).

### H.7 — Badges flottants sur avatar

Constaté sur Profil : badges X rouge et + bleu flottant sur l'avatar.

**À corriger** : actions groupées dans un menu contextuel, pas en overlay.

---

## Annexe — Checklist d'acceptation pour chaque refactor composant

Chaque composant refactoré doit passer cette checklist avant commit :

- [ ] Utilise uniquement des `var(--color-*)` (pas de hex direct)
- [ ] Utilise les aliases sémantiques composants pour radius (`radius('button')`, `radius('card')`, etc.) — **JAMAIS** les clés primitives (`md`, `lg`, `xl`) ni legacy (`rounded-Npx`)
- [ ] Utilise les aliases sémantiques composants pour spacing (`spacing('card-padding')`, `spacing('button-padding-x')`, etc.) — **JAMAIS** de valeurs hardcodées ni de clés primitives
- [ ] Utilise les clés de l'échelle typographique legacy (`font-size('base')`, `font-size('lg')`, etc.) — pas les aliases orphelins `body`/`heading-*` tant que T2-E n'est pas fait
- [ ] Utilise l'un des 3 poids actifs (regular / semibold / bold)
- [ ] **Ne pas utiliser de `box-shadow` via wrapper `shadow()`** tant que T1-B n'est pas résolu, sauf cas explicite documenté
- [ ] A un focus clavier visible (Partie F.5)
- [ ] A ses transitions ≤ 200-300ms selon le type
- [ ] Testé visuellement sur mobile, tablette, desktop
- [ ] Testé en dark mode
- [ ] Contraste vérifié (≥ 4.5:1, viser 7:1 pour texte principal)
- [ ] Targets tactiles ≥ 44px (adulte) ou ≥ 56px (enfant)

---

_Document v1.1 validé à l'issue de l'audit aliases Phase 6 du 18 avril 2026. Remplace v1.0 (obsolète). Prochaine révision prévue après T1-B + T1-C résolus et refactor Button effectué._
