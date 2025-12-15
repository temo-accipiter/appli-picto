# Partie 1 - Description du Projet - Appli-Picto

## Présentation du projet :

Je développe une application web dédiée aux personnes autistes ainsi qu’aux professionnels les accompagnant. Cette plateforme propose un planning visuel fondé sur le renforcement positif, permettant de décomposer une tâche en étapes simples pour motiver l’enfant à les réaliser. Traditionnellement, cette méthode utilise des pictogrammes imprimés, plastifiés, puis placés sur un support à l’aide de scratch ; mon objectif est d’en proposer une version numérique interactive. L’utilisateur peut créer des cartes “tâche” et “récompense” personnalisées avec images et intitulés, sélectionner celles à afficher pour une activité précise puis, au fur et à mesure de l’accomplissement, cocher les étapes franchies. Une fois toutes les tâches réalisées, une récompense apparaît pour valoriser l’effort fourni.

## Contexte technique :

Stack : Next.js 16 + Pnpm + SASS + Typescript strict mode + macOS + VS Code + Supabase + Stripe + Cloudflare.

## Arborescence:

Chaque composant vit dans son propre dossier, avec deux fichiers : MonComposant.tsx + MonComposant.scss.

## Contraintes:

SCSS maintenable | BEM‑lite, variables globales, mixins, imports clairs. |Design apaisant & moderne | Palette douce à contraste élevé ; animations ≤ 150 ms. Accessibilité | WCAG 2.2 AA : focus visible, ARIA correct, aucun clignotement > 3 Hz. |

## Travail effectué :

- Le RGPD est mis en place.
- RBAC, permissions, quotas.
- Stripe est connecté.
- Les cards de tâches et de récompense sont fonctionnelles.
- Un composant de train qui avance sur une barre de progression au fur et à mesure que les tâches sont cochées.
- Page Profil avec les boutons et inputs pour créer/modifier/supprimer avatars, pseudo, mail, adresse etc.
- Composant TimeTimer
- Page Admin

## Plan complet et détaillé — Comptes & Abonnements (sans code)

1. Cadrage produit
   Rôles initiaux (RBAC minimal) :

- visitor : non connecté.
- free : compte gratuit.
- abonne : abonné payant (pas encore de Basic/Pro).
- admin : accès complet.
- staff (unique) : rôle mixte support/modérateur, à séparer plus tard si besoin.

États orthogonaux aux rôles (Les états ne remplacent pas les rôles; ils s’y superposent) :

- active : normal.
- suspended : verrouillage (fraude, abus, impayé).
- deletion_scheduled : suppression programmée RGPD.
- pending_verification : pour nouveaux comptes en attente de confirmation email.

Modèle (freemium simplifié) :

- free limité (quotas stricts).
- abonné = toutes les features, sans restriction.
- Pas d’essai gratuit.
- Objectif : abaisser la friction (inscription simple), puis orienter vers l’upgrade.
- Focus UX autiste : interfaces visuelles intuitives avec pictogrammes, transitions douces, pas de surcharges.

2. Parcours Visitor (non connecté)
   Accès : uniquement la page “tableau” avec 3 cartes de tâches prédéfinies, seulement cochables.
   Cartes prédéfinies : stockées dans une table publique distincte (Supabase).
   SessionStorage : pour mémoriser temporairement la progression → effacé à la fermeture d’onglet (nouvelle expérience à chaque visite).
   Fonctionnalités : cocher les 3 cartes débloque une récompense prédéfinie.
   Interdits : pas de création/suppression/modification, pas d’upload, pas de personnalisation.
   CTA : messages simples et rassurants → “Créer un compte (Free) pour débloquer plus de fonctionnalités”.
   Accessibilité :
   Contrastes AA, focus visibles, libellés clairs, feedback doux.
   Animations ≤150ms, douces et fluides.
   Icônes larges pour touch-friendly.
   Pas de sons agressifs ou clignotements.

3. Parcours Free (compte gratuit)
   Droits - Créer/éditer ses propres cartes dans des quotas stricts :
   maximum de nombre de card tâche dans la base de données = 5
   maximum de nombre de card récompense dans la base de données = 2
   maximum de nombre de card tâche créée par mois = 5
   maximum de nombre de card récompense créée par mois = 2
   Donc, si limite atteint, pour en créer une nouvelle, il faut en supprimer une ancienne.
   Pas de pubs pour l’instant : l’option pub pour monétiser les comptes Free sera envisagée plus tard, uniquement si besoin.
   Objectif produit : démontrer la valeur et inciter au passage à Abonné.
   CTA positifs : “Débloquez plus de cartes avec un abonnement Premium” au lieu de messages restrictifs.

4. Parcours Abonné
   Accès complet : toutes les fonctionnalités premium disponibles avec zéro pub.
   Pas de distinction Basic/Pro pour l’instant : un seul palier Abonné.
   Paiement Stripe : abonnement mensuel, facturé dès le départ (aucun essai gratuit).

5. États de compte
   pending_verification :accès bloqué tant que l’email n’est pas confirmé.
   active : fonctionnement normal.
   suspended : verrouillage (fraude, impayés, abus).
   Accès uniquement au profil, facturation (Stripe) et RGPD.
   Pas de lecture/écriture des cartes ni accès premium.
   deletion_scheduled : utilisateur a demandé la suppression → données effacées après 30 jours.
   Réversibilité possible pendant ce délai.
   Suppression définitive après délai (sauf traces légales minimales/anonymisées).

6. Résiliation
   Volontaire :
   abonne → free, état active.
   Données conservées.
   Garde accès premium jusqu’à la fin de la période déjà payée.
   Forcée (impayé/fraude) : passage à suspended → blocage jusqu’à régularisation.
   Suppression RGPD : bouton “Supprimer mon compte” → état deletion_scheduled → purge après délai.
   Feedback visuel : icône calendrier doux pour indiquer le délai de suppression.

7. Permissions & Feature Gating
   Pas de features pro_only maintenant : inutile tant qu’il n’y a pas de plan Pro. A l’avenir à envisager, si abonne basic et abonne pro.
   Deux paniers seulement :
   Features free → visibles pour Free et Abonné.
   Features premium → visibles uniquement pour Abonné.
   FeatureGate : contrôle affichage (fallback = message “Upgrade”).
   Accessibilité : modales explicatives, ARIA compatible pour screen readers.
   Sécurité Supabase (RLS) : protège contre les contournements (ex. interdiction de création de cartes pour Visitor).

8. Administration
   Rôle staff unique au lancement (support + modération).
   Séparation possible plus tard :
   support → aide utilisateurs (compte, abonnement).
   moderator → modération contenu public (si introduit plus tard).
   AdminPermissions : gérer rôles, features, droits via interface déjà existante.
   Logs consultables : chaque changement de rôle ou état est traçable (audit trail).

9. Sécurité & Données
   RLS owner-only : chaque utilisateur ne voit que ses propres données.
   Suspended : verrouillage → accès uniquement au profil + facturation + RGPD.
   Logs : chaque changement d’abonnement, rôle ou état est enregistré (audit trail).
   RGPD : export et suppression des données, délais de grâce respectés.

⚠️ Clarifications
Visitor : utilise la même page “tableau” que les autres, mais avec 3 cartes fixes (table publique), progression en sessionStorage, reset à chaque visite.
Essai 7 jours : supprimé totalement, aucune exception.
Free vs Abonné : seule distinction actuelle. Abonné = tout premium.
Role entreprise : à implémenter plus tard si besoin.
Pro_only : à ne pas créer maintenant, introduire seulement le jour où un palier Pro existe.
Pubs : envisagées uniquement pour Free, pas encore activées.
Staff : un seul rôle mixte au lancement ; scindable plus tard si le volume l’exige.

---

# Partie 2 - La structure du styles et les imports

## Arborescence

```scss
src/styles/
├── abstracts/
│   ├── _tokens.scss
│   ├── _a11y-tokens.scss
│   ├── _functions.scss
│   ├── _spacing.scss
│   ├── _colors.scss
│   ├── _typography.scss
│   ├── _motion.scss
│   ├── _radius.scss
│   ├── _shadows.scss
│   ├── _borders.scss
│   ├── _breakpoints.scss
│   ├── _container-queries.scss
│   ├── _forms.scss
│   ├── _mixins.scss
│   ├── _variables.scss   // DEPRECATED — conserver temporairement pour compat jusqu'à validation finale
│   └── _index.scss
├── base/
│   ├── _reset.scss
│   ├── _animations.scss
│   ├── _accessibility.scss
│   ├── _reduced-motion.scss
│   ├── _helpers.scss
│   └── _typography-base.scss
│   └── _index.scss
├── vendors/
│   └── _normalize.scss
│   └── _index.scss
├── themes/
│   ├── _light.scss
│   └── _dark.scss
│   ├── _theme-vars.scss   // DEPRECATED — conserver temporairement pour compat jusqu'à validation finale
│   └── _index.scss
└── main.scss
```

---

# main.scss

```scss
@charset "UTF-8";

/* ============================================
  📦 1) VENDORS — normalize en tout premier (vendor immutable)
   ============================================ */
@use '@styles/vendors/normalize' as *;

/* ============================================
  💡 2) ABSTRACTS — OUTILS SCSS (tokens maps, functions, mixins, breakpoints)
  - safe to forward; ne génèrent pas de CSS runtime
   ============================================ */
@use '@styles/abstracts' as *;

/* ============================================
  💡 3) ABSTRACTS — SYSTÈMES RUNTIME (génèrent des CSS vars)
  - IMPORTS EXPLICITES, UNE SEULE FOIS, DANS CET ORDRE
   ============================================ */
@use '@styles/abstracts/colors' as *;
@use '@styles/abstracts/typography' as *;
@use '@styles/abstracts/spacing' as *;
@use '@styles/abstracts/motion' as *;
@use '@styles/abstracts/radius' as *;
@use '@styles/abstracts/shadows' as *;
@use '@styles/abstracts/forms' as *;

/* ============================================
  🧱 4) BASE — styles globaux appliqués au DOM (ordre contrôlé)
  - reset puis policies/accessibilité puis helpers puis application typo
   ============================================ */
@use '@styles/base' as *;

/* ============================================
  🎨 5) THEMES — overrides runtime (CSS vars)
  - importés après base pour que les overrides s'appliquent correctement
   ============================================ */
@use '@styles/themes/light' as *;
@use '@styles/themes/dark' as *;
```

# index.Scss - styles/abstracts

```scss
// abstracts/_index.scss
// Forward uniquement les OUTILS (aucun CSS généré)

// --- Outils SCSS (safe) ---
@forward './tokens'; // maps SCSS + opacity/z-index functions
@forward './a11y-tokens' show a11y; // a11y() function (CSS vars importées dans main.scss)
@forward './borders'; // border-width() function + mixins
@forward './functions'; // helpers
@forward './breakpoints'; // map $breakpoints + function breakpoint()
@forward './container-queries'; // container() + respond-container() mixins
@forward './mixins'; // respond-to() + autres mixins
@forward './variables'; // z-index, constants compile-time ONLY

// --- Fonctions couleurs (sans CSS généré) ---
// Forward uniquement les fonctions de _colors.scss (pas les maps ni CSS vars)
@forward './colors' show color, semantic, blue, red, green, orange, yellow,
  purple, slate, role-color, text, surface, admin-ui, warning, badge-gradient,
  ui-gradient, badge-shadow, tsa-pastel, shadow, brand;

// --- Systèmes qui génèrent du CSS (NE PAS FORWARD) ---
// Les maps et CSS vars de colors sont importés directement dans main.scss
// @forward './typography';
// @forward './spacing';
// @forward './motion';
// @forward './radius';
// @forward './shadows';
// @forward './forms';
```

# index.scss - styles/base

```scss
// =============================================================================
// BASE — styles globaux appliqués au DOM
// Génèrent du CSS runtime
// Ordre IMPORTANT : fondations → politiques → aides → rendu final
// =============================================================================

// 1) Reset — fondation du DOM
@forward './reset';

// 2) Politiques globales
@forward './reduced-motion';
@forward './accessibility';

// 3) Utilitaires globaux
@forward './helpers';

// 4) Animations globales (non conditionnelles)
@forward './animations';

// 5) Typographie appliquée au DOM
@forward './typography-base';
```

# index.scss - styles/themes

```scss
@forward './theme-vars';

// Forward UNIQUEMENT les thèmes (ils génèrent tous du CSS volontairement)
// Aucun risque de duplication car ils ne seront utilisés QU'EN UN SEUL ENDROIT : main.scss

@forward './light';
@forward './dark';
```

# index.scss - styles/vendors

```scss
@forward './normalize';
```
