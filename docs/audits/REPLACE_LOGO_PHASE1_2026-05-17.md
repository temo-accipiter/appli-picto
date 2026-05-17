# REPLACE_LOGO — Audit Phase 1

**Date** : 2026-05-17 | **Branche** : `feature/re-design-edition`
**Statut** : 🔴 NO-GO — 2 décisions Temo requises avant Phase 2

---

## ⚡ Addendum post-review Temo — Audits préliminaires (2026-05-17)

### Changements de décision intégrés

- ✅ Destination corrigée : `/edition` pour les 4 pages auth
- ✅ `aria-label` corrigé : `"Appli-Picto — aller à l'édition"`
- ✅ `NavbarVisiteur` sortie du périmètre (déjà conforme)
- ✅ Périmètre réduit à 4 fichiers

### 🔴 BLOQUEUR 1 — Dark mode : `logo-vertical-dark.svg` manquant

**Scénario détecté : (c) — dark mode complet avec toggle utilisateur**

- `ThemeToggle.tsx` existe dans `src/components/shared/theme-toggle/`
- `data-theme='dark'` posé sur `<html>` via `layout.tsx` (anti-flash au chargement)
- `_dark.scss` s'active via `@media (prefers-color-scheme: dark)` ET `[data-theme='dark']`
- Pattern `NavbarLogoIcon.scss` utilise les deux sélecteurs (calquer obligatoire)

**Analyse `logo-vertical.svg` en dark mode :**

Le SVG contient des couleurs hardcodées (pas de `currentColor`) :

- Symbole (4 rectangles) : `#BCD8F1`, `#A9CDE9`, `#97C1E4`, `#2871A8` — bleu brand ✅ lisible sur fond sombre
- Texte "picto" (part basse gauche) : `fill="#1A222C"` — quasi-noir ❌ **ILLISIBLE sur `slate(900)`** (`--color-bg` dark = `#0f172a`)
- Texte "logo.flow" (part basse droite) : `fill="#2871A8"` — bleu brand ✅ lisible

**Conclusion** : `logo-vertical.svg` est illisible en dark mode. `logo-vertical-dark.svg` n'existe pas dans `public/brand/`. Utiliser `logo-dark.svg` (horizontal 239×25) en dark mode crée une rupture de ratio majeure (1.87→9.56) — inacceptable TSA.

**→ Décision Temo nécessaire :**

- **(A)** Créer `logo-vertical-dark.svg` (version dark du logo vertical, textes `fill` adaptés) — **recommandé**
- **(B)** Désactiver le swap dark dans AuthLogo (logo-vertical uniquement, accepter que le texte sombre soit peu lisible en dark — compromis)
- **(C)** Autre solution proposée par Temo

---

### 🔴 BLOQUEUR 2 — Token `size()` : aucune valeur existante pour largeur logo auth

**Tokens `size()` numériques disponibles dans `$size-primitives`** (Legacy numeric) :
`2, 4, 8, 24, 32, 60, 64, 100, 200, 260, 300, 600, 800`

Valeurs nommées disponibles : `touch-min (44px)`, `touch-optimal (48px)`, `touch-preferred (56px)`, `icon-xs/sm/md/lg/xl`, `button-height`, `input-height`, `card-max-width (400px)`...

**Largeur souhaitée pour logo auth centré** : ~120px mobile, ~160px desktop (ratio viewBox `228×122` = 1.87)

Aucun token `size()` ne correspond. `size('100')` (100px) est trop petit. `size('200')` (200px) est acceptable sur desktop mais trop large sur mobile. `size('120')` et `size('160')` existent dans `$spacing-primitives` mais **pas dans `$size-primitives`** — ils ne sont pas accessibles via `size()`.

**Nouveau token requis :**

```
'logo-auth-sm': 7.5rem   // 120px — largeur mobile
'logo-auth-lg': 10rem    // 160px — largeur desktop
```

**Justification UX TSA** : logo centré dans un header auth, contexte "vitrine", plus grand que dans la navbar. 120px mobile = lisible sans être écrasant. 160px desktop = proportionné sur carte 400px max-width (40% de la carte).

**→ Décision Temo nécessaire :** valider ces deux tokens ou proposer une alternative avec des tokens existants.

---

## 1. Résumé exécutif (initial)

Les 4 pages d'authentification (login, signup, forgot-password, reset-password) affichent un **SVG inline "logo legacy"** : une grille de 4 carrés blancs sur fond coloré (56×56px). Ce n'est pas le logo officiel. Il n'est **pas cliquable** et n'a **aucun lien**.

Le logo officiel existe sous 5 variantes dans `public/brand/`. Un composant réutilisable `NavbarLogoIcon.tsx` l'utilise déjà pour la navbar — avec un auto-swap CSS mobile/desktop/dark parfaitement fonctionnel.

**Verdict initial révisé : 🔴 NO-GO** — 2 décisions Temo nécessaires (dark mode asset + token size) avant de pouvoir coder `AuthLogo.tsx`.

---

## 2. Section 1.1 — Logo officiel localisé

### Fichiers SVG trouvés dans `public/brand/`

| Fichier               | Taille  | viewBox       | Usage actuel                                | Usage potentiel                                   |
| --------------------- | ------- | ------------- | ------------------------------------------- | ------------------------------------------------- |
| `logo-app-icon.svg`   | 336 o   | `0 0 46 10`   | Navbar mobile (light) via `NavbarLogoIcon`  | —                                                 |
| `logo-principal.svg`  | 6 087 o | `0 0 239 25`  | Navbar desktop (light) via `NavbarLogoIcon` | Pages auth desktop                                |
| `logo-dark.svg`       | 6 087 o | `0 0 239 25`  | Navbar (dark mode) via `NavbarLogoIcon`     | Pages auth dark mode                              |
| `logo-monochrome.svg` | 6 071 o | `0 0 239 25`  | Non utilisé                                 | Email, fond clair neutre                          |
| `logo-vertical.svg`   | 6 376 o | `0 0 228 122` | Non utilisé                                 | ⭐ **Idéal pages auth** (symbole + texte empilés) |

### Recommandation logo pour pages auth

Le contexte auth est **centré verticalement** avec un symbole + texte empilés. `logo-vertical.svg` (228×122) est la variante la plus adaptée — symbole en haut, texte en bas, exactement comme le header actuel (icône + titre + tagline).

Pour le swap dark mode, il faudra aussi utiliser `logo-dark.svg` qui est horizontal mais reste lisible. Alternative : signaler le besoin d'un `logo-vertical-dark.svg` comme hors périmètre.

> ⚠️ **Note** : `logo-vertical.svg` n'est utilisé nulle part. C'est un asset orphelin que Phase 2 va valoriser.

---

## 3. Section 1.2 — Tableau des 5 emplacements legacy

### Fichiers réels (les `page.tsx` App Router sont de simples wrappers)

| #   | Fichier réel (logo dans ce fichier)                        | Lignes JSX logo | Type legacy                             | Texte associé                                         | Lien actuel                 | Vers                              |
| --- | ---------------------------------------------------------- | --------------- | --------------------------------------- | ----------------------------------------------------- | --------------------------- | --------------------------------- |
| 1   | `src/page-components/login/Login.tsx`                      | L125–L143       | SVG inline 56×56                        | "Appli-Picto" (h1) + "La journée en pictogrammes" (p) | ❌ Aucun                    | —                                 |
| 2   | `src/page-components/signup/Signup.tsx`                    | L110–L128       | SVG inline 56×56                        | "Appli-Picto" (h1) + tagline i18n (p)                 | ❌ Aucun                    | —                                 |
| 3   | `src/page-components/forgot-password/ForgotPassword.tsx`   | L69–L87         | SVG inline 56×56                        | "Appli-Picto" (h1) + "La journée en pictogrammes" (p) | ❌ Aucun                    | —                                 |
| 4   | `src/page-components/reset-password/ResetPassword.tsx`     | L104–L122       | SVG inline 56×56                        | "Appli-Picto" (h1) + "La journée en pictogrammes" (p) | ❌ Aucun                    | —                                 |
| 5   | `src/components/layout/navbar-visiteur/NavbarVisiteur.tsx` | L87–L93         | `<NavbarLogoIcon />` (déjà officiel ✅) | ❌ Aucun texte associé                                | ✅ `<Link href="/edition">` | `/edition` (≠ `/tableau` demandé) |

### SVG legacy identique dans les 4 pages auth

```jsx
<div className="[page]__logo" aria-hidden="true">
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
    <rect width="56" height="56" rx="12" fill="currentColor" />
    <rect x="11" y="11" width="14" height="14" rx="2" fill="white" />
    <rect x="31" y="11" width="14" height="14" rx="2" fill="white" />
    <rect x="11" y="31" width="14" height="14" rx="2" fill="white" />
    <rect x="31" y="31" width="14" height="14" rx="2" fill="white" />
  </svg>
</div>
```

Le `<h1>` "Appli-Picto" et le `<p>` tagline sont des éléments **séparés du logo**, dans le même `<header>`. Ils devront être **conservés** (c'est le titre de page et le sous-titre — pas un wordmark intégré au SVG).

---

## 4. Section 1.3 — Dimensions et styles par contexte

### Pages auth (4 fichiers — structure identique)

| Propriété                        | Valeur actuelle                                              | Token utilisé  | Suggestion Phase 2                                                 |
| -------------------------------- | ------------------------------------------------------------ | -------------- | ------------------------------------------------------------------ |
| Taille logo inline               | 56×56px (hardcodé SVG)                                       | ❌ Aucun token | `logo-vertical.svg` avec largeur via `size()`                      |
| Couleur conteneur                | `color: color('base')`                                       | ✅ token OK    | Conserver (le fill="currentColor" n'est plus utile avec `<Image>`) |
| Alignement header                | `display: flex; flex-direction: column; align-items: center` | ✅ OK          | Conserver                                                          |
| Espacement bas logo              | `margin-bottom: spacing('xs')`                               | ✅ OK          | À vérifier si encore pertinent avec `<Link>`                       |
| Espacement entre éléments header | `gap: spacing('xs')`                                         | ✅ OK          | Conserver                                                          |

**Dimensions suggérées pour `logo-vertical.svg` en contexte auth :**

Le viewBox est `0 0 228 122`. Rapport = 228/122 ≈ 1.87.

- Mobile : largeur `size('120')` → hauteur ≈ 64px — **besoin de vérifier `size('120')` dans les tokens**
- Si `size('120')` absent → utiliser `size('128')` ou signaler besoin token

> ⚠️ Je ne crée pas de token. À valider avec Temo si la largeur souhaitée correspond à un token existant. Alternative : utiliser la prop `width` directement avec une valeur sémantique (ex. `size('auth-logo-width')` — nouveau token à créer) ou se limiter aux tokens numériques existants.

**Tokens numériques `size()` confirmés dans la mémoire projet** : `2, 4, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48…` + `touch-target-min` (44px).
Les valeurs > 48 sont à vérifier dans `_primitives.scss` avant Phase 2.

### Navbar Visiteur (1 fichier)

| Propriété             | Valeur actuelle                        | Token utilisé | Action Phase 2        |
| --------------------- | -------------------------------------- | ------------- | --------------------- |
| Hauteur min logo-link | `min-height: size('touch-target-min')` | ✅ 44px WCAG  | Conserver             |
| Focus ring            | `@include focus-ring()`                | ✅ mixin OK   | Conserver             |
| Destination lien      | `/edition`                             | —             | Changer en `/tableau` |
| Composant logo        | `<NavbarLogoIcon />`                   | ✅ officiel   | Aucun changement logo |

---

## 5. Section 1.4 — Options d'architecture composant

### Option A — Réutiliser `NavbarLogoIcon` directement (extension légère)

Envelopper `<NavbarLogoIcon />` dans un `<Link href="/tableau">` dans les 4 pages auth, sans créer de nouveau composant.

**Avantages :**

- Zéro nouveau fichier (sauf SCSS minimal)
- Le swap mobile/desktop/dark est déjà géré et testé
- Cohérence visuelle automatique avec la navbar
- Server Component : pas de `'use client'`

**Inconvénients :**

- `NavbarLogoIcon` est conçu pour la navbar (icône horizontale, pas de mode "centré/vertical")
- Les dimensions de `logo-app-icon.svg` (46×10) et `logo-principal.svg` (239×25) sont petites pour un header auth centré
- Le contexte visual auth (grand, centré) et le contexte navbar (compact, à gauche) sont différents

### Option B ⭐ — Créer un composant `AuthLogo.tsx` dédié (recommandée)

Créer `src/components/layout/auth-logo/AuthLogo.tsx` + `AuthLogo.scss`.

Ce composant :

- Affiche `logo-vertical.svg` en mode light (toutes tailles)
- Affiche `logo-dark.svg` en mode dark (horizontal, acceptable)
- Est enveloppé dans un `<Link href="/tableau">` avec `aria-label`
- Props : aucune (simple, prévisible)
- Server Component (pas de `'use client'`)

**Avantages :**

- Logo vertical adapté au contexte centré des pages auth
- Taille adaptée (plus grand que dans la navbar)
- Séparation des responsabilités claire (navbar ≠ auth)
- Les 4 pages auth partagent le même composant → 1 seule modification si besoin futur

**Inconvénients :**

- 2 fichiers nouveaux à créer (`.tsx` + `.scss`)
- Duplication de la logique dark-mode (déjà dans `NavbarLogoIcon`)

### 🏆 Recommandation

**Option B — `AuthLogo.tsx`** pour les 4 pages auth.

Raison : le contexte visuel est fondamentalement différent. Un header d'auth est grand, centré, avec un logo "vitrine". La navbar est compacte, alignée à gauche. Utiliser le même composant créerait un compromis visuel pour les deux contextes.

Pour la `NavbarVisiteur` (emplacement 5) : **aucun changement de composant** — seul `href="/tableau"` à corriger.

### Signature proposée pour `AuthLogo`

```tsx
// Pas de props — le composant est fixe (destination /tableau, aria-label figé)
export default function AuthLogo() { ... }
```

Pas de props `size`, `variant`, `href` car :

- La taille est fixe pour le contexte auth
- La destination est fixe (décision Temo verrouillée)
- Pas de variantes auth prévues

---

## 6. Section 1.5 — Accessibilité + transitions TSA

### `aria-label` / `alt`

| Contexte                            | Stratégie                               | Valeur proposée                                                     |
| ----------------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| Pages auth — `<Link>`               | `aria-label` sur le lien                | `"Appli-Picto — retour au tableau"`                                 |
| Pages auth — `<Image>`              | `alt=""` (décoratif, label sur le Link) | `""`                                                                |
| NavbarVisiteur — `<Link>`           | `aria-label` existant à corriger        | `"Appli-Picto — retour au tableau"` (était "Appli-Picto — Accueil") |
| NavbarVisiteur — `<NavbarLogoIcon>` | `alt=""` sur chaque `<Image>`           | déjà `""` ✅                                                        |

### Focus ring

- `@include focus-ring()` existe dans `src/styles/abstracts/_mixins.scss` ✅
- La `NavbarVisiteur` l'utilise déjà sur `.navbar-visiteur__logo:focus-visible` ✅
- `AuthLogo.scss` devra l'inclure sur `&:focus-visible`

### Transition hover

- **Recommandation** : `@include safe-transition(opacity, 0.15s, linear)` via `safe-transition()` (mixin existant)
- Changement : légère variation d'opacité (`opacity: 0.8` au hover) — prévisible, non agressive
- ❌ Pas de `scale`, pas de `transform`, pas de `bounce`
- `safe-transition()` gère automatiquement `prefers-reduced-motion: reduce` → aucune animation si activé ✅

### `prefers-reduced-motion`

- Le mixin `safe-transition()` intègre déjà `@media (prefers-reduced-motion: reduce) { transition: none }` ✅
- Aucun ajout manuel nécessaire si le mixin est utilisé

---

## 7. Section 1.6 — Hors périmètre (signalements)

### 7.1 Navbar authentifiée (`Navbar.tsx`) — même `NavbarLogoIcon`, lien vers `/edition`

`src/components/layout/navbar/Navbar.tsx:157-161` utilise `<NavbarLogoIcon />` dans un `<Link href="/edition">`.
La décision Temo demande `/tableau` pour 5 emplacements dont la NavbarVisiteur. La Navbar authentifiée (`Navbar.tsx`) n'est **pas dans le périmètre** mais a la même incohérence potentielle.

→ **Décision Temo nécessaire** : faut-il aligner la Navbar authentifiée sur `/tableau` également, ou `/edition` est-il intentionnel pour les utilisateurs connectés ?

### 7.2 `logo-vertical.svg` — asset jamais utilisé

`public/brand/logo-vertical.svg` n'est référencé nulle part dans le code source. Il n'est pas orphelin (il sera utilisé en Phase 2 pour les pages auth), mais il est bon de le noter.

### 7.3 `logo-monochrome.svg` — asset orphelin

`public/brand/logo-monochrome.svg` n'est référencé nulle part. Candidat à la suppression, mais hors périmètre de cette tâche.

→ **Décision Temo nécessaire** : conserver ou supprimer `logo-monochrome.svg` ?

### 7.4 Favicon et métadonnées Open Graph

`src/app/layout.tsx` ne définit pas de favicon ni d'og:image explicite. Le logo n'apparaît pas dans le `<head>` via `metadata`. Hors périmètre mais à surveiller.

### 7.5 Logo dans `TrainProgressBar.tsx`

`src/components/features/taches/train-progress-bar/TrainProgressBar.tsx:134` contient une `div.dot-logo.fixed-logo`. Ce n'est pas le logo SVG officiel (c'est un élément de la barre de progression "train"). Pas de confusion, hors périmètre.

---

## 8. Plan détaillé Phase 2

### Pré-flight

```bash
git status   # doit être clean
# branche attendue : feature/re-design-edition
```

### Étape 1 — Vérifier les tokens `size()` disponibles > 48

Lire `src/styles/abstracts/_primitives.scss` pour confirmer quelles clés `size()` numériques existent au-delà de `size('48')`.

### Étape 2 — Créer `AuthLogo.tsx` + `AuthLogo.scss`

**Fichier** : `src/components/layout/auth-logo/AuthLogo.tsx`

```tsx
import Image from 'next/image'
import Link from 'next/link'
import './AuthLogo.scss'

export default function AuthLogo() {
  return (
    <Link
      href="/tableau"
      className="auth-logo"
      aria-label="Appli-Picto — retour au tableau"
    >
      {/* Light mode — logo vertical (symbole + texte empilés) */}
      <Image
        src="/brand/logo-vertical.svg"
        alt=""
        width={120}
        height={64}
        className="auth-logo__vertical"
        priority
      />
      {/* Dark mode — logo horizontal (seule variante dark disponible) */}
      <Image
        src="/brand/logo-dark.svg"
        alt=""
        width={160}
        height={17}
        className="auth-logo__dark"
        priority
      />
    </Link>
  )
}
```

> ⚠️ Les dimensions `width`/`height` ci-dessus sont provisoires — à caler sur les tokens `size()` disponibles après vérification en Phase 2.

**Fichier** : `src/components/layout/auth-logo/AuthLogo.scss`

```scss
@use '@styles/abstracts' as *;

.auth-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  border-radius: radius('sm');

  @include safe-transition(opacity, 0.15s, linear);

  &:hover {
    opacity: 0.8;
  }

  &:focus-visible {
    @include focus-ring();
  }

  // Light mode : logo vertical visible, dark masqué
  &__vertical {
    display: block;
  }
  &__dark {
    display: none;
  }

  // Dark mode : logo dark visible, vertical masqué
  @media (prefers-color-scheme: dark) {
    &__vertical {
      display: none;
    }
    &__dark {
      display: block;
    }
  }
  [data-theme='dark'] & {
    &__vertical {
      display: none;
    }
    &__dark {
      display: block;
    }
  }
}
```

### Étape 3 — Modifier `Login.tsx` (L122–L143)

- Ajouter `import AuthLogo from '@/components/layout/auth-logo/AuthLogo'`
- Remplacer `<div className="login-page__logo" aria-hidden="true">…</div>` par `<AuthLogo />`
- Conserver `<h1>` et `<p>` tagline tels quels
- Mettre à jour `Login.scss` : supprimer les styles `.login-page__logo` si devenus inutiles (le style de positionnement reste sur `.login-page__header`)
- `pnpm check` après modification

### Étape 4 — Modifier `Signup.tsx` (L108–L128)

- Même pattern que Login
- `pnpm check`

### Étape 5 — Modifier `ForgotPassword.tsx` (L66–L87)

- Même pattern
- `pnpm check`

### Étape 6 — Modifier `ResetPassword.tsx` (L102–L122)

- Même pattern
- `pnpm check`

### Étape 7 — Modifier `NavbarVisiteur.tsx` (L87–L93)

- Changer uniquement `href="/edition"` → `href="/tableau"` sur le `<Link>` logo
- Changer `aria-label="Appli-Picto — Accueil"` → `aria-label="Appli-Picto — retour au tableau"`
- **Ne pas toucher** `<NavbarLogoIcon />`
- `pnpm check`

### Étape 8 — Validation finale

```bash
pnpm test
pnpm build
pnpm lint:hardcoded
```

---

## 9. Checklist "Prêt pour GO Phase 2"

- [x] Logo officiel localisé (`public/brand/` — 5 variantes documentées)
- [x] Logo recommandé pour auth identifié (`logo-vertical.svg` + `logo-dark.svg`)
- [x] 5 emplacements exactement documentés (lignes précises)
- [x] Type legacy confirmé (SVG inline identique dans 4 pages auth)
- [x] Composant `NavbarLogoIcon` analysé (déjà officiel, à conserver tel quel)
- [x] Architecture recommandée : Option B — `AuthLogo.tsx` dédié
- [x] Accessibilité documentée (aria-label, alt, focus-ring, safe-transition)
- [x] Hors périmètre identifiés et listés
- [x] Plan Phase 2 détaillé fichier par fichier
- [ ] ⏳ **Validation Temo — en attente du message "GO Phase 2"**

---

_Rapport généré le 2026-05-17 — Audit read-only, aucune modification effectuée._
