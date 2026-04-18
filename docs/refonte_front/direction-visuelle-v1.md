# Direction visuelle — Appli-Picto

**Version** : 1.0
**Date** : 2026-04-18
**Statut** : Contrat de design — ces décisions sont figées et servent de référence pour toutes les phases de refactor visuel à venir.

---

## Préambule

Ce document n'est pas un moodboard, pas un guide de style exhaustif. C'est un **contrat de design** : chaque décision a été prise consciemment après challenge et argumentaire. Toute déviation future doit être documentée et justifiée, pas improvisée.

**Positionnement produit retenu** :

- App psycho-éducative pour enfants TSA + parents
- Ton visuel cible : doux / chaleureux / réconfortant, mais tenu (pas pastel à outrance)
- Mobile-first, utilisable sur tablette et desktop
- WCAG 2.2 AA non-négociable
- Usage 50/50 adulte (Édition, Admin, Profil, public) / enfant (Tableau)

**Principe directeur** : deux atmosphères distinctes pour les deux contextes (adulte / enfant), un système commun de tokens et règles pour les porter sans fragmentation.

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

Implication DB : session lock côté enfant, à verrouiller par trigger (déjà cohérent avec l'architecture DB-first existante).

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

- Opacité **85%** (pas 50% — c'est du succès calme, pas du disabled)
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

**7 rôles sémantiques**, plus un système parallèle de couleurs de rôles utilisateurs (non-fusionnable avec les rôles sémantiques d'action).

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

  // Neutres (déjà partiellement chez toi)
  --color-text: #334155;
  --color-text-muted: #64748b;
  --color-bg: #ffffff;
  --color-surface: #f8fafc;
  --color-border: #e2e8f0;
}
```

Les variantes dark sont définies dans `_dark.scss` avec les valeurs équivalentes.

### B.4 — Règles d'usage non-négociables

1. **Jamais** de hex direct dans un composant → toujours `var(--color-*)`
2. **Jamais** deux rôles pour la même couleur (rouge = danger uniquement, point)
3. **Pas de disabled coloré** → opacité + cursor uniquement
4. **Primary ≤ 30% de la surface d'un écran** — c'est une action, pas un décor
5. **Danger = irréversible uniquement**. "Réinitialiser mot de passe" passe en **warning** (`#F59E0B`)
6. **Accent est décoratif**. Pas de texte critique en accent, pas de bouton action en accent. Si besoin, version assombrie `#D97706` avec contraste vérifié.

### B.5 — Couleurs de rôles utilisateurs (système séparé)

Ces couleurs ne sont **pas** dans la palette sémantique d'action. Elles servent uniquement à identifier les rôles dans l'UI adulte (badges, bordures).

| Rôle    | Couleur                        |
| ------- | ------------------------------ |
| Admin   | `#667EEA` (violet, immuable)   |
| Abonné  | `#22C55E` (vert)               |
| Free    | `#64748B` (slate)              |
| Visitor | `#EA580C` (orange)             |
| Staff   | `#8B5CF6` (violet plus saturé) |

Ne jamais réutiliser ces couleurs pour des actions sémantiques (ex : ne pas utiliser le vert abonné pour un message de succès — c'est `--color-success` qui sert à ça).

### B.6 — Migration (phases ultérieures)

Les systèmes suivants doivent migrer vers les vars sémantiques :

- `$primary-color-tokens` → `--color-primary / --color-primary-hover / --color-primary-subtle`
- `$secondary-color-tokens` (rouge) → `--color-danger`
- `$accent-color-tokens` → `--color-accent`
- `$tsa-pastel-color-tokens` → `--color-*-subtle`
- `$warning-state-color-tokens` + `$semantic-tokens` → consolidation dans les vars sémantiques

Non-bloquant pour les phases de refactor composants. À traiter en parallèle ou après.

---

## Partie C — Typographie

### C.1 — Fonte principale

**Atkinson Hyperlegible** (Google Fonts, self-hosted recommandé pour perf).

Choix motivé :

- Conçue pour lisibilité renforcée (TSA, dyslexie, basse vision) — public cible exact
- Chaque lettre est différenciable (pas de confusion I/l/1 ni O/0)
- Chargement ~30KB pour 2 poids
- Sérieuse mais humaine (vs Inter plus froide, Nunito plus enfantine)

Fallback : `font-family: 'Atkinson Hyperlegible', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`

### C.2 — Échelle active

| Palier | Valeur | Usage                                   |
| ------ | ------ | --------------------------------------- |
| `sm`   | 14px   | Labels secondaires, métadonnées         |
| `base` | 16px   | Texte courant (par défaut)              |
| `lg`   | 18px   | Texte courant contexte enfant (Tableau) |
| `xl`   | 20px   | Sous-titres, boutons importants         |
| `2xl`  | 24px   | Titres de sections                      |
| `3xl`  | 30px   | Titres de page (rare)                   |

**Tokens restants** (`xs` 12px, `4xl` 36px, `5xl` 48px) : gardés dans le système pour flexibilité mais **usage exceptionnel uniquement** (mentions légales pour `xs`, hero marketing pour `4xl`/`5xl`).

### C.3 — Poids actifs

| Poids      | Valeur | Usage                                  |
| ---------- | ------ | -------------------------------------- |
| `regular`  | 400    | Texte par défaut                       |
| `semibold` | 600    | Labels importants, boutons, emphase UI |
| `bold`     | 700    | Titres principaux, emphase forte       |

Les autres poids (`thin`, `light`, `medium`, `extrabold`, `black`) sont **hors usage** courant. Gardés en token pour flexibilité future mais interdits dans les composants standards.

### C.4 — Règles transverses

- `line-height: 1.5` (`normal`) par défaut partout
- `line-height: 1.25` (`tight`) pour les titres uniquement
- `letter-spacing: 0` partout sauf cas spécifique documenté
- Pas de `text-transform: uppercase` sur plus de 3 mots (lisibilité TSA)

---

## Partie D — Rondeur système

### D.1 — Philosophie

**Axe C — Différentiel adulte / enfant**. Deux sets de règles, un token system commun.

### D.2 — Rondeurs UI adulte / neutre

Applique aux contextes : Login, Profil, Édition, Admin, RGPD, CGU, Abonnement.

| Composant               | Token  | Valeur |
| ----------------------- | ------ | ------ |
| Button                  | `md`   | 8px    |
| Input, Select, Textarea | `md`   | 8px    |
| Checkbox, Radio         | `sm`   | 4px    |
| Card                    | `lg`   | 16px   |
| Modal                   | `lg`   | 16px   |
| Tooltip                 | `sm`   | 4px    |
| Badge, Tag              | `full` | 50%    |
| Avatar                  | `full` | 50%    |

### D.3 — Rondeurs UI enfant (Tableau)

| Composant                  | Token  | Valeur |
| -------------------------- | ------ | ------ |
| Button (action enfant)     | `lg`   | 16px   |
| Rond de validation         | `full` | 50%    |
| Card mère (tâche)          | `xl`   | 20px   |
| Card sous-tâche            | `lg`   | 16px   |
| TrainProgressBar container | `lg`   | 16px   |

### D.4 — Règles transverses

- Jamais de rondeur > `xl` (20px) sauf `full` pour cercles parfaits
- `2xl` (24px) reste disponible mais usage rare (hero visuels)
- Pas de micro-variation (±2px) — toujours sur l'échelle

### D.5 — Action Phase 1.5 à planifier

Migration des 14 usages de `radius('rounded-12px')` → `radius('lg')` (16px). Suppression définitive de `'rounded-12px'` dans `$radius-tokens`. Fichiers concernés : Login.scss, Abonnement.scss (×4), PortailRGPD.scss, Logs.scss (×2), Metrics.scss (×2), Permissions.scss, CookiePreferences.scss (×3).

Test visuel obligatoire sur chaque parcours public.

---

## Partie E — Rythme & densité

### E.1 — Densité par contexte

| Contexte           | Stack vertical | Padding card |
| ------------------ | -------------- | ------------ |
| Tableau enfant     | `lg` (24px)    | `xl` (32px)  |
| Édition adulte     | `md` (16px)    | `lg` (24px)  |
| Admin / dashboards | `sm` (8px)     | `md` (16px)  |
| Pages publiques    | `md` (16px)    | `lg` (24px)  |

### E.2 — Rythme vertical (3 niveaux)

| Rythme | Token       | Usage                                         |
| ------ | ----------- | --------------------------------------------- |
| Tight  | `sm` (8px)  | Éléments liés (label + input, icône + texte)  |
| Base   | `md` (16px) | Éléments d'un groupe (inputs d'un formulaire) |
| Loose  | `xl` (32px) | Sections distinctes                           |

**Règle** : pas d'autre espacement vertical. Tout écran respecte ce battement à 3 temps.

### E.3 — Philosophie responsive

**Hybride par contexte** :

- **Scale-up** (mobile agrandi) : Tableau enfant, pages publiques, Profil
- **Adaptive** (structure différenciée mobile / desktop) : Édition, Admin

### E.4 — Max-widths desktop

| Contexte                                | Max-width desktop |
| --------------------------------------- | ----------------- |
| Publique formulaire (Login, Abonnement) | 480px             |
| Publique lecture (RGPD, CGU, Mentions)  | 720px             |
| Profil                                  | 720px             |
| Édition                                 | 1200px            |
| Admin (Logs, Metrics, Permissions)      | 1400px            |
| Tableau enfant                          | 1400px            |

Mobile et tablette : 100% avec padding adapté.

### E.5 — Paddings latéraux par device

| Device                | Padding horizontal |
| --------------------- | ------------------ |
| Mobile (< 768px)      | `md` (16px)        |
| Tablette (768-1024px) | `lg` (24px)        |
| Desktop (> 1024px)    | `xl` (32px)        |

---

## Partie F — Ombres & profondeur

### F.1 — Politique générale

**Minimaliste stricte** : bordure OU ombre, jamais les deux. Ombre réservée aux éléments **réellement** flottants (modal, dropdown, tooltip, toast, popover).

Exception explicite : hover sur cards interactives du Tableau enfant (voir F.4).

### F.2 — 3 niveaux d'élévation

| Niveau       | Traitement                   | Token                               | Usage                                              |
| ------------ | ---------------------------- | ----------------------------------- | -------------------------------------------------- |
| 0 — Posé     | Bordure 1px + zéro ombre     | `--color-border` + `elevation-none` | Cards statiques, inputs, panels                    |
| 1 — Léger    | Zéro bordure + ombre subtile | `elevation-xs`                      | Hover cards interactives Tableau enfant uniquement |
| 2 — Flottant | Zéro bordure + ombre marquée | `elevation-lg`                      | Modal, dropdown, tooltip, toast, popover           |

### F.3 — Usage par composant

| Composant               | Niveau                                          |
| ----------------------- | ----------------------------------------------- |
| Card statique           | 0 (bordure)                                     |
| Input, Select, Textarea | 0 (bordure)                                     |
| Bouton                  | 0 (zéro bordure zéro ombre, fond coloré suffit) |
| Modal                   | 2                                               |
| Dropdown                | 2                                               |
| Tooltip                 | 2                                               |
| Toast                   | 2                                               |
| Badge, Tag              | 0                                               |
| Card validée (Tableau)  | 0                                               |

### F.4 — Hover cards — règle par contexte

| Contexte                             | Hover traitement                                                        |
| ------------------------------------ | ----------------------------------------------------------------------- |
| Tableau enfant (cards de tâches)     | Changement bg (`--color-surface` → `--color-bg-hover`) + `elevation-xs` |
| Adulte (cards Profil, Édition, etc.) | Changement bg seul, pas d'ombre                                         |

Justification : le Tableau enfant est le contexte où le feedback tactile/visuel compte le plus pour TSA. Réserver l'effet fort à ce contexte spécifique protège le reste de l'app d'une dérive "ombres partout".

### F.5 — Focus clavier (non-négociable)

Indépendamment du hover, tout élément interactif doit avoir un focus clavier visible :

- `outline: 2px solid var(--color-primary)`
- `outline-offset: 2px`
- Applicable sur tous les devices (pas de `:focus { outline: none }` jamais)

---

## Partie G — Implications pour les phases suivantes

### G.1 — Travail de migration de tokens

Les décisions ci-dessus impliquent une série de migrations progressives dans `tokens.scss`. Ces migrations sont **non-bloquantes** pour les phases de refactor composants mais devront être faites à un moment pour éviter la dette.

Liste des migrations prévues :

1. **Phase 1.5** : migration `rounded-12px` → `lg` (14 usages)
2. **Phase 2+** : consolidation des maps de couleurs vers variables sémantiques
3. **Phase 2+** : suppression progressive des alias numériques résiduels dans `$spacing-tokens` (`'1'`, `'2'`, `'3'`, `'6'`, etc.)
4. **Phase 2+** : nettoyage des doublons dans `$opacity-tokens`

### G.2 — Travail de refactor composants

L'ordre recommandé pour attaquer les composants une fois la direction validée :

1. **Button** (atome le plus utilisé, porte la palette primary/success/warning/danger)
2. **Input + Select + Textarea** (groupe forms, patterns communs)
3. **Checkbox + Radio** (groupe selection, pattern commun)
4. **Card** (deux variantes : adulte et enfant)
5. **Badge + Tag**
6. **Modal + Tooltip + Toast** (groupe flottants, pattern commun)
7. **Avatar**
8. **Écrans publics** (Login, Abonnement) avec les atomes refactorés
9. **Profil** avec les atomes refactorés
10. **Édition** (plus complexe, à faire après avoir validé le système sur écrans simples)
11. **Admin** (dernier, peut bénéficier des apprentissages)
12. **Tableau enfant** (le plus important UX, à faire en dernier quand tous les atomes sont prêts et testés)

Cet ordre permet de **valider progressivement** les règles de ce document. Si une règle ne tient pas sur Button, on la révise avant d'attaquer Input. Si elle tient sur 3-4 composants, elle est solide.

### G.3 — Garde-fous process

- Chaque refactor composant = commit atomique local (pas de push) avec test visuel avant validation
- Toute déviation à ce document doit être documentée dans un commit dédié qui amende cette direction visuelle (`direction-visuelle-v1.1.md`, `v1.2.md`, etc.)
- Les décisions fonctionnelles du Tableau enfant (Partie A) sont les plus fragiles à tenir — elles imposent des choix produit qui dépassent le design. Relire avant chaque refactor touchant au contexte enfant.

---

## Partie H — Anti-patterns à éliminer

Issu des 4 captures analysées (Login, Profil, Édition Tableau, Tableau enfant), voici les anti-patterns spécifiques à corriger lors des refactors.

### H.1 — Multi-rouges sans sémantique

Constaté sur écran Profil : "Réinitialiser mot de passe" et "Supprimer mon compte" utilisent le même rouge, alors que l'un est réversible et l'autre irréversible.

**À corriger** : réinitialisation = `warning` (orange). Suppression = `danger` (rouge).

### H.2 — Cards à traitements incohérents

Constaté sur Profil : sections avec bord gauche coloré (bleu, rouge) qui cohabitent avec sections sans bord. Système visuel incohérent.

**À corriger** : une card = un seul traitement (bordure complète 1px OU rien, jamais partiel). Si emphase nécessaire, utiliser `--color-*-subtle` en fond, pas un bord partiel.

### H.3 — Boutons sans hiérarchie sémantique

Constaté sur Édition Tableau : 3 boutons côte à côte ("Créer une carte" bleu, "Créer carte de banque" rouge, "Gérer catégories" gris) sans logique sémantique apparente.

**À corriger** : une seule action primary visible simultanément par écran. Les autres actions en secondary (outline ou ghost). Pas de rouge sur une création (le rouge = destruction).

### H.4 — Densité incohérente

Constaté partout : certains formulaires très serrés, d'autres très aérés, sans logique par contexte.

**À corriger** : appliquer les règles de densité par contexte (Partie E.1) strictement.

### H.5 — Footer lourd sur écran enfant/édition

Constaté sur Édition : 9 liens légaux affichés en ligne en bas de page (Mentions légales, CGU, CGV, Politique cookies, Personnaliser, Refuser, Accessibilité, Portail RGPD).

**À corriger** : footer compact avec regroupement. Par exemple "Mentions" (lien vers une page avec toutes les sections) + "Cookies" + "RGPD".

### H.6 — Dropdown de personnalisation sur écran enfant

Constaté sur Tableau enfant : dropdown "Ligne 1" (sélection ligne métro) affiché en permanence.

**À corriger** : déplacé en Édition (voir A.2).

### H.7 — Badges flottants sur avatar

Constaté sur Profil : badges X rouge et + bleu flottant sur l'avatar. Visuellement désordonné.

**À corriger** : actions sur avatar groupées dans un menu contextuel ou des boutons dédiés, pas en overlay.

---

## Annexe — Checklist d'acceptation pour chaque refactor

Chaque composant refactoré doit passer cette checklist avant commit :

- [ ] Utilise uniquement des `var(--color-*)` (pas de hex direct)
- [ ] Respecte la rondeur définie pour son contexte (Partie D)
- [ ] Respecte la densité définie pour son contexte (Partie E)
- [ ] Utilise l'une des 3 règles de rythme vertical (Partie E.2)
- [ ] Utilise l'une des 3 polices actives (regular / semibold / bold)
- [ ] Utilise un palier typographique de l'échelle active
- [ ] Applique le traitement d'ombre correct pour son rôle (Partie F)
- [ ] A un focus clavier visible (Partie F.5)
- [ ] A ses transitions ≤ 200-300ms selon le type
- [ ] Testé visuellement sur mobile, tablette, desktop
- [ ] Testé en dark mode
- [ ] Contraste vérifié (≥ 4.5:1, viser 7:1 pour texte principal)
- [ ] Targets tactiles ≥ 44px (adulte) ou ≥ 56px (enfant)

---

_Document validé à l'issue de la session de conversation du 18 avril 2026. Prochaine révision attendue après refactor des 3 premiers composants atomiques (Button, Input, Checkbox) pour consolider ou amender les règles selon les apprentissages terrain._
