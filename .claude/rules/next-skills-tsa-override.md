---
paths:
  - 'src/**/*.{ts,tsx}'
  - 'src/**/*.scss'
  - 'next.config.*'
---

# Surcharges TSA — Appli-Picto

Ces règles **surchargent** les recommandations génériques de `next-best-practices`.
En cas de conflit, ce fichier a la priorité absolue.

---

## 1. Deux contextes UX — règles strictement différentes

### Contexte Tableau (`src/app/**/tableau/**`, `src/components/**/tableau/**`)

Écran enfant TSA. Règles non négociables :

- **Zéro message technique** : aucun texte d'erreur DB, réseau, quota, abonnement, code HTTP, stack trace.
- **`error.tsx` dans /tableau/** : doit afficher uniquement une image neutre + un bouton "Réessayer" — jamais de `error.message`, jamais de `error.digest`.
- **`not-found.tsx` dans /tableau/** : même contrainte — page neutre, pas de "404" ni de texte technique.
- **Transitions ≤ 0.3s, easing `linear`** uniquement. Aucune animation `spring`, `bounce`, `elastic`.
- **`prefers-reduced-motion`** : toutes les animations non essentielles désactivées. La grille de jetons est statique si `reduced_motion = true`.
- **Parallel routes interdites** : pas de `@slot` ni d'intercepting routes dans /tableau/\*\*. Le pattern `router.back()` pour fermer un modal est imprévisible pour un enfant TSA.
- **Intercepting routes interdites** dans /tableau/\*\*.
- **Suspense fallback** : uniquement un spinner ou un écran vide — jamais de texte de chargement visible pour l'enfant.
- **Zéro toast côté Tableau** : les erreurs sont silencieuses ou gérées par un écran neutre.

### Contexte Édition (`src/app/**/edition/**`, `src/components/**/edition/**`)

Écran adulte. Les règles génériques `next-best-practices` s'appliquent, avec ces précisions :

- `error.tsx` peut afficher un message explicite orientant l'adulte.
- Toasts autorisés pour les erreurs non critiques.
- Parallel routes et intercepting routes autorisées pour les modaux d'édition.
- Bandeau offline : discret, non bloquant, accessible (pas un modal).

---

## 2. DB-first — interdictions absolues côté frontend

Ces interdictions s'appliquent à TOUS les fichiers sans exception :

- **Interdit** : `service_role` dans le bundle client (clé anon + session uniquement).
- **Interdit** : logique métier critique en frontend — quotas, transitions d'état de session, vérification RLS.
- **Interdit** : patterns `user.role`, `hasPermission`, `checkAccess`, `if (user.role === 'subscriber')` comme source de vérité d'autorisation.
- **Interdit** : accès direct aux tables `subscriptions`, `consent_events`, `admin_audit_log`.
- **Interdit** : `SELECT *` cross-tenant.
- **Interdit** : contournement RLS via filtrage UI ("on cache le bouton donc c'est autorisé"). La DB bloque — le front gère le refus.
- `accounts.status` est uniquement cosmétique (afficher/masquer un bouton). La source de vérité reste toujours la DB.

---

## 3. Séparation des 3 systèmes cœur — fusion conceptuelle interdite

Ces 3 systèmes ne doivent JAMAIS être fusionnés dans aucun nom de composant, écran, état ou persistance :

| Système                | Tables DB                     | Ne pas confondre avec  |
| ---------------------- | ----------------------------- | ---------------------- |
| **Planning visuel**    | `timelines`, `slots`          | séquençage ou jetons   |
| **Économie de jetons** | `slots.tokens` (kind=step)    | planning ou séquençage |
| **Séquençage**         | `sequences`, `sequence_steps` | planning ou jetons     |

---

## 4. Design system SCSS — discipline tokens absolue

- **Interdit** : toute valeur CSS/SCSS hardcodée (couleur, espacement, radius, z-index, durée).
- **Obligatoire** : `@use '@styles/abstracts' as *;` dans chaque fichier SCSS.
- **Obligatoire** : utiliser uniquement les wrappers `color()`, `spacing()`, `radius()`, `shadow()`, `duration()` — jamais les primitives directement.
- **Nouveau token requis** → NE PAS inventer de valeur. Signaler le besoin avec : type du token, usage précis, impact UX TSA.
- **Interdit** : Tailwind, CSS Modules, styles inline via `style={{}}` sauf cas exceptionnel documenté.

---

## 5. Patterns Next.js — ajustements spécifiques au projet

### Async params/searchParams (Next.js 15+)

- `params` et `searchParams` sont async dans les `page.tsx` — toujours `await params` avant usage.
- `useSearchParams()` requiert un `<Suspense>` boundary — vérifier la présence du wrapper.

### RSC boundaries

- Le fetch Supabase se fait côté **Server Component** (lecture) ou **Server Action** (écriture/mutation).
- **Interdit** : `async` Client Component (invalide en React).
- Props passées d'un Server vers un Client Component : uniquement des types sérialisables JSON. Pas de `Date`, `Map`, `Set`, classes custom.

### Images pictos

- **Obligatoire** : `next/image` pour tous les pictogrammes — jamais `<img>`.
- `sizes` responsive requis pour le mobile-first.
- `placeholder="blur"` recommandé pour les pictos chargés depuis Supabase Storage.
- `priority` sur le picto LCP du Contexte Tableau.

### Fonts

- `next/font` uniquement — pas de `<link>` Google Fonts dans le HTML.
- Si changement de police pour accessibilité TSA (ex. Atkinson Hyperlegible) : passer par `next/font/google`.

### Route Handlers (`route.ts`)

- Uniquement si un vrai endpoint HTTP est nécessaire (webhook Stripe, Edge Function callback).
- Pour toute mutation Supabase déclenchée par l'utilisateur : **Server Action** de préférence.
- Un fichier `route.ts` et un `page.tsx` ne peuvent pas coexister dans le même segment.

### Erreurs — structure de fichiers

- `error.tsx` obligatoire dans chaque segment de route exposé à l'utilisateur.
- `global-error.tsx` à la racine pour les erreurs de layout racine.
- `not-found.tsx` dans les segments où `notFound()` peut être appelé.
- **Rappel Tableau** : ces fichiers doivent afficher du contenu émotionnellement neutre — voir §1.

### `'use cache'` et PPR (Next.js 16 expérimental)

- **Ne pas utiliser** dans ce projet. La stack est stable sur Next.js 16 sans PPR activé.
- Ignorer toute recommandation `next-cache-components` ou `'use cache'` directive pour l'instant.

---

## 6. Hydration errors — causes fréquentes à surveiller

- `typeof window !== 'undefined'` dans les composants qui lisent l'état réseau (online/offline).
- Dates formatées côté serveur vs client — toujours formater côté client dans un `useEffect` ou `suppressHydrationWarning` si inévitable.
- Extensions navigateur qui injectent des attributs — non actionnable, ignorer dans les rapports.

---

## 7. Accessibilité (WCAG 2.2 AA — non négociable)

- Navigation une main : zones tactiles ≥ 44px (`touch-preferred` token = 56px).
- Focus visible sur tous les éléments interactifs — pas de `outline: none` sans alternative.
- Live regions pour les toasts (Contexte Édition uniquement).
- `aria-label` sur tous les boutons icône.
- Pas de contenu animé sans `prefers-reduced-motion` guard.

---

## 8. Skill `frontend-design` (Anthropic) — restrictions TSA

La skill `frontend-design` est installée et autorisée **uniquement pour le Contexte Édition**.
Elle est **neutralisée pour le Contexte Tableau** via les interdictions ci-dessous.

### Interdit dans `src/app/**/tableau/**` et `src/components/**/tableau/**`

- **Aucune direction esthétique "audacieuse"** : pas de brutalist, maximalist,
  retro-futuristic, editorial, industrial. Le Contexte Tableau est émotionnellement
  neutre par définition — prévisible et rassurant prime sur mémorable.
- **Aucune animation décorative** : scroll-triggered effects, staggered reveals,
  parallax, hover surprises — tous interdits. Seules les transitions fonctionnelles
  ≤ 0.3s easing linear sont autorisées (voir §1).
- **Aucun fond texturé ou effet visuel** : pas de gradient mesh, noise texture,
  grain overlay, geometric patterns. Fond uni via token `surface('bg')` uniquement.
- **Aucune typographie "distinctive"** : la police est Lexend (déjà chargée via
  `next/font`). Ne pas introduire de display font, de font pairing, ni changer
  la hiérarchie typographique existante.
- **Aucune asymétrie ou layout "inattendu"** : grille stricte, pas d'overlap,
  pas de diagonal flow, pas de grid-breaking elements. La prévisibilité spatiale
  est une exigence TSA non négociable.
- **Aucun curseur custom** : le curseur système par défaut uniquement.

### Autorisé dans `src/app/**/edition/**` et `src/components/**/edition/**`

La skill `frontend-design` s'applique librement pour le Contexte Édition adulte,
sous réserve de respecter :

- La discipline tokens SCSS (§4) — jamais de valeurs hardcodées même pour un effet visuel.
- Les zones tactiles ≥ 44px (§7).
- Le `prefers-reduced-motion` guard sur toute animation (§7).
