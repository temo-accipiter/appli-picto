# Audit next-best-practices — Appli-Picto

**Date** : 2026-05-07  
**Branche** : `feature/re-design-edition`  
**Phase** : Read-only (aucune modification effectuée)  
**Auditeur** : Claude Code — skill `next-best-practices` + surcharges `next-skills-tsa-override.md`

---

## Résumé exécutif

| Catégorie                 | Nombre |
| ------------------------- | ------ |
| Domaines audités          | 18     |
| Violations critiques 🔴   | 11     |
| Violations importantes 🟡 | 2      |
| Violations mineures 🟢    | 2      |
| À vérifier ⚠️             | 1      |
| Domaines conformes ✅     | 9      |
| Non applicables ⬜        | 3      |

**Niveau de risque global** : 🔴 ÉLEVÉ — plusieurs violations critiques affectent directement la sécurité UX TSA et les performances.

---

## Violations par domaine

---

### 🔴 4. Error Handling — CRITIQUE TSA

#### 4.1 — `global-error.tsx` expose `error.message`

**Fichier** : `src/app/global-error.tsx` (ligne 18)

**Violation** : Le composant `GlobalError` affiche directement le message d'erreur technique de l'objet `Error` :

```tsx
<p className="global-error__message">
  {error.message || 'Erreur inconnue'} {/* ← message technique visible */}
</p>
```

Ce composant couvre toutes les erreurs de layout racine, y compris depuis le Contexte Tableau. Un enfant TSA peut donc voir des messages comme `"supabase: JWT expired"`, `"TypeError: Cannot read properties of undefined"`, ou `"Network Error"`.

**Règle source** : Surcharge TSA §1 — Zéro message technique dans le Contexte Tableau  
**Impact** : UX TSA — exposition de messages techniques à l'enfant, rupture émotionnelle  
**Correction attendue** : Supprimer `{error.message}`. Afficher uniquement une icône neutre ou une illustration + le bouton "Réessayer". Ne jamais exposer `error.message` ni `error.digest`.

---

#### 4.2 — Aucun `error.tsx` dans les segments de route exposés

**Fichiers** : segments de route suivants — AUCUN n'a de `error.tsx` :

| Segment                             | Criticité TSA             |
| ----------------------------------- | ------------------------- |
| `src/app/(public)/tableau/`         | 🔴 MAXIMUM — écran enfant |
| `src/app/(protected)/edition/`      | 🟡 Adulte                 |
| `src/app/(protected)/profil/`       | 🟡 Adulte                 |
| `src/app/(protected)/admin/`        | 🟡 Adulte                 |
| `src/app/(protected)/abonnement/`   | 🟡 Adulte                 |
| `src/app/(public)/login/`           | 🟡 Adulte                 |
| `src/app/(public)/signup/`          | 🟡 Adulte                 |
| `src/app/(public)/forgot-password/` | 🟢 Mineur                 |
| `src/app/(public)/reset-password/`  | 🟢 Mineur                 |

Sans `error.tsx` dans un segment, les erreurs remontent jusqu'à `global-error.tsx` (violation 4.1), ou pire — crashent silencieusement la page.

**Règle source** : Surcharge TSA §5.5 — `error.tsx` obligatoire dans chaque segment exposé à l'utilisateur  
**Impact** : UX TSA (critique pour `/tableau/`), expérience utilisateur adulte dégradée  
**Correction attendue** :

- Créer `/tableau/error.tsx` en priorité absolue — contenu neutre uniquement (image + bouton)
- Créer `error.tsx` dans les segments adultes avec message orientant l'utilisateur

---

#### 4.3 — `not-found.tsx` global affiche du contenu technique

**Fichier** : `src/app/not-found.tsx` (lignes 12–15)

**Violation** : Le seul `not-found.tsx` existant (à la racine) affiche `"404"` et `"Page non trouvée"`. Ce composant est atteignable depuis le Contexte Tableau si `notFound()` est appelé dans un Server Component de la route `/tableau/`.

```tsx
<h1 className="not-found__code">404</h1>           {/* ← code technique */}
<h2 className="not-found__title">Page non trouvée</h2>
<p className="not-found__subtitle">
  La page que vous recherchez n&apos;existe pas.
</p>
```

**Règle source** : Surcharge TSA §1 — Pas de "404" ni de texte technique dans le Contexte Tableau  
**Impact** : UX TSA — texte anxiogène et incompréhensible pour un enfant  
**Correction attendue** : Créer `src/app/(public)/tableau/not-found.tsx` avec une page visuellement neutre — sans texte d'erreur, sans code HTTP, avec un bouton de retour ou un spinner.

---

### 🔴 9. Font Optimization

#### 9.1 — Google Fonts chargée via `<link>` HTML natif

**Fichier** : `src/app/layout.tsx` (lignes 56–63)

**Violation** : La police `Lexend` est chargée via des balises `<link>` HTML natives pointant vers `fonts.googleapis.com` et `fonts.gstatic.com`, au lieu de `next/font/google` :

```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link
  href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

**Règle source** : Surcharge TSA §5.3 — `next/font` uniquement / next-best-practices [font]  
**Impact** : Performance — requête réseau externe non optimisée, Layout Shift (CLS) potentiel, pas de self-hosting automatique  
**Correction attendue** :

```tsx
import { Lexend } from 'next/font/google'

const lexend = Lexend({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
})

// Dans le JSX du layout :
<html lang="fr" className={lexend.variable}>
```

---

### 🔴 8. Image Optimization

#### 8.1 — `<img>` natif pour les pictos dans Select

**Fichier** : `src/components/ui/select/Select.tsx` (lignes 87, 128)

**Violation** : Les pictogrammes affichés dans le composant `SelectWithImage` utilisent `<img>` HTML natif au lieu de `next/image` :

```tsx
<img
  src={selectedOption.image}
  alt={selectedOption.imageAlt || selectedOption.label}
  className="select-with-image__selected-image"
/>
```

Ce composant est utilisé en Contexte Édition pour sélectionner des pictos. Les images ne bénéficient pas de l'optimisation Next.js (formats modernes WebP/AVIF, lazy loading, sizing adaptatif).

**Règle source** : Surcharge TSA §5.2 Images pictos — `next/image` obligatoire / next-best-practices [image]  
**Impact** : Performance mobile — chargement non optimisé sur tablette/smartphone  
**Correction attendue** : Remplacer `<img>` par `<Image>` de `next/image` avec `sizes` adapté et `width`/`height` définis.

---

#### 8.2 — `<img>` natif dans DemoSignedImage

**Fichier** : `src/components/shared/demo-signed-image/DemoSignedImage.tsx` (ligne 126)

**Violation** : Utilisation de `<img>` natif pour afficher une image signée depuis Supabase Storage.

**Règle source** : Surcharge TSA §5.2 — `next/image` obligatoire  
**Impact** : Performance — pas d'optimisation format, pas de `placeholder="blur"` possible  
**Correction attendue** : Migrer vers `next/image` avec configuration du domaine Supabase Storage dans `next.config.ts` (via `remotePatterns`).

---

### 🔴 17. Design System SCSS — Discipline tokens

#### 17.1 — `var(--color-primary)` hardcodé dans les focus rings

**Fichiers** :

| Fichier                                    | Ligne(s) | Valeur hardcodée                          |
| ------------------------------------------ | -------- | ----------------------------------------- |
| `src/components/ui/checkbox/Checkbox.scss` | 88       | `outline: 2px solid var(--color-primary)` |
| `src/components/ui/input/Input.scss`       | 67, 172  | `outline: 2px solid var(--color-primary)` |
| `src/page-components/edition/Edition.scss` | 98, 167  | `outline: 2px solid var(--color-primary)` |

**Violation** : `var(--color-primary)` est une variable CSS primitive du design system. La règle impose d'utiliser exclusivement les wrappers SCSS (`color()`, `semantic()`...) pour que le design system reste cohérent et modifiable depuis un seul point.

**Règle source** : Surcharge TSA §4 — Interdit les primitives CSS directes  
**Impact** : Design System — cassure du système de tokens si la primitive change  
**Correction attendue** : Remplacer par le wrapper approprié, ex. `color('primary')` ou `semantic('focus')` si ce token existe.

---

#### 17.2 — `3rem` hardcodé dans Edition.scss

**Fichier** : `src/page-components/edition/Edition.scss` (ligne 36)

**Violation** :

```scss
margin-bottom: 3rem; // Espace pour le footer fixe
```

`3rem` est une valeur hardcodée (48px). Elle devrait utiliser le wrapper `spacing()` du design system.

**Règle source** : Surcharge TSA §4 — Interdit toute valeur CSS hardcodée  
**Impact** : Design System — valeur orpheline, non tracée par `pnpm lint:hardcoded`  
**Correction attendue** : Utiliser `spacing('xl')` (32px) ou `spacing('section-gap')` selon le token disponible. Si aucun token ne correspond à 48px, signaler le besoin au design system plutôt qu'inventer une valeur.

---

#### 17.3 — `z-index` hardcodés dans Checkbox.scss

**Fichier** : `src/components/ui/checkbox/Checkbox.scss` (lignes 50, 125)

**Violation** :

```scss
z-index: 1; // ligne 50
z-index: 2; // ligne 125
```

Les valeurs `z-index` doivent passer par le wrapper `z-index()` ou le token approprié du design system pour éviter les conflits de stacking context.

**Règle source** : Surcharge TSA §4 — Interdit toute valeur CSS hardcodée  
**Impact** : Design System — risque de conflit de superposition avec d'autres composants  
**Correction attendue** : Utiliser les tokens z-index du design system (ex. `z('overlay')`, `z('above')` ou équivalent selon ce qui existe dans `_tokens.scss`).

---

### 🟡 1. RSC Boundaries

#### 1.1 — EditionPage concentre trop de fetch dans un Client Component

**Fichier** : `src/app/(protected)/edition/page.tsx`

**Violation** : Le composant de page est marqué `'use client'` et appelle directement de nombreux hooks de fetch Supabase (`useTimelines`, `useSessions`, `useSlots`, `useBankCards`, etc.). Techniquement valide en React 19, mais ce pattern augmente le bundle client et empêche le streaming Server Component.

**Règle source** : Surcharge TSA §5.2 RSC boundaries — fetch Supabase côté Server Component de préférence  
**Impact** : Performance — bundle client plus lourd, pas de streaming, hydration plus lente sur mobile  
**Correction attendue** : Créer un Server Component wrapper qui précharge les données statiques, puis passe uniquement les props sérialisables au Client Component `<Edition />`. Conserver `'use client'` uniquement sur le composant interactif.

---

### 🟡 8. Image Optimization (suite)

#### 8.3 — `<img>` natif dans ImagePreview

**Fichier** : `src/components/ui/image-preview/ImagePreview.tsx` (ligne 24)

**Violation** : `<img src={url} ...>` utilisé pour les previews d'images.

**Note** : Si `url` est un Blob URL local (`blob:...`) ou un Data URI, `next/image` ne peut pas les optimiser. Ce cas est une exception acceptable mais devrait être documentée avec un commentaire explicite.

**Règle source** : next-best-practices [image]  
**Impact** : Performance — mineur si usage limité aux previews locaux  
**Correction attendue** : Soit documenter l'exception avec un commentaire (`// Blob URL — next/image ne supporte pas les blob: URLs`), soit conditionner selon l'origine de l'URL.

---

### 🟢 12. Hydration Errors

#### 12.1 — `document.getElementById()` dans les event handlers

**Fichiers** :

- `src/page-components/login/Login.tsx` (lignes 52, 54)
- `src/page-components/signup/Signup.tsx` (pattern similaire présumé)

**Violation** : Le DOM est manipulé via `document.getElementById()` dans des handlers pour gérer le focus programmatique après une erreur de formulaire :

```tsx
document.getElementById('login-email')?.focus()
document.getElementById('login-password')?.focus()
```

Ce pattern fonctionne en runtime (event handler, donc côté client), mais est fragile : si l'ID change, le focus silencieusement échoue sans erreur.

**Règle source** : next-best-practices [hydration-error] — éviter les API DOM directes  
**Impact** : Accessibilité — focus programmatique peut échouer silencieusement  
**Correction attendue** : Utiliser `useRef` sur les champs `<input>` et appeler `ref.current?.focus()` pour un focus fiable et typé.

---

### ⚠️ À vérifier

#### CreateBankCardModal — `<img>` commenté comme intentionnel

**Fichier** : `src/components/shared/modal/create-bank-card-modal/CreateBankCardModal.tsx` (ligne 244)

Un commentaire dans le code indique que le `<img>` natif est conservé intentionnellement :

```tsx
{
  /* <img> natif conservé intentionnellement (pas de <ImagePreview>). */
}
;<img src={imagePreview} alt="Aperçu de la carte" />
```

**Statut** : ⚠️ À vérifier — si `imagePreview` est un Blob URL ou Data URI (preview avant upload), l'exception est justifiée et `next/image` ne peut pas s'appliquer. Confirmer la nature de la valeur `imagePreview` et documenter l'exception dans `FRONTEND_CONTRACT.md` si ce n'est pas déjà fait.

---

## Domaines conformes

- ✅ **2. Async Patterns** — Aucun `params`/`searchParams` non-awaitées trouvé. Pas de `cookies()` sans `await`.
- ✅ **3. Directives** — Pas de `'use cache'` (interdit). Les `'use client'` sont tous justifiés par des hooks ou event handlers.
- ✅ **5. Suspense Boundaries** — `useSearchParams` non utilisé sans Suspense. `providers.tsx` wrappé correctement. `usePathname` ne nécessite pas Suspense.
- ✅ **6. Data Patterns** — Aucun appel direct `supabase.from()` dans les composants. Tous les accès DB passent par les hooks custom `@/hooks`.
- ✅ **7. Route Handlers** — Aucune coexistence `route.ts` + `page.tsx` dans le même segment.
- ✅ **13. Parallel & Intercepting Routes** — Aucun `@slot` ni dossier `(.)` dans `/tableau/**`. Respect strict de l'interdiction TSA.
- ✅ **14. File Conventions** — Structure des segments cohérente, `layout.tsx` présents dans les route groups.
- ✅ **15. Metadata & SEO** — Exports `metadata` présents sur les pages publiques.
- ✅ **18. Accessibilité TSA** — Le mixin `safe-transition()` est utilisé systématiquement dans les SCSS récents (SlotItem, EditionCard). Guards `prefers-reduced-motion` présents dans `_mixins.scss` et `main.css`.

---

## Non applicables

- ⬜ **10. Bundling** — Pas de packages `server-only` mal placés. Les imports barrel sont utilisés de façon contrôlée. Aucun import ESM/CJS mixé détecté.
- ⬜ **11. Scripts tiers** — Pas de Google Analytics, pas de `<script>` natif. Le script de thème via `dangerouslySetInnerHTML` est inévitable pour éviter le FOUC.
- ⬜ **16. Runtime Selection** — Pas de `export const runtime = 'edge'` en dehors des Edge Functions Stripe (dans `supabase/functions/`, hors périmètre Next.js).

---

## Recommandations de priorisation

### P0 — Bloquer avant la prochaine mise en production

1. **[4.1]** `global-error.tsx` — Supprimer `{error.message}`. Risque direct UX TSA.
2. **[4.2]** Créer `src/app/(public)/tableau/error.tsx` — Contenu neutre uniquement. Priorité absolue car c'est l'écran de l'enfant.
3. **[4.3]** Créer `src/app/(public)/tableau/not-found.tsx` — Page neutre sans "404".

### P1 — Corriger dans la prochaine itération

4. **[9.1]** Migrer Google Fonts vers `next/font/google` — Impact direct sur les CWV (LCP, CLS).
5. **[17.1]** Remplacer tous les `var(--color-primary)` dans les focus rings (Checkbox, Input, Edition) par les wrappers SCSS.
6. **[17.3]** Remplacer `z-index: 1` et `z-index: 2` dans Checkbox.scss par les tokens z-index.
7. **[17.2]** Remplacer `3rem` dans Edition.scss par `spacing()`.
8. **[4.2]** Créer les `error.tsx` dans les segments adultes (edition, profil, admin, login, signup).

### P2 — Améliorer à court terme

9. **[8.1]** `Select.tsx` — Migrer les `<img>` vers `next/image` avec `sizes` responsive.
10. **[8.2]** `DemoSignedImage.tsx` — Migrer vers `next/image` + `placeholder="blur"`.
11. **[1.1]** `EditionPage` — Évaluer une extraction Server Component pour le fetch initial.

### P3 — Qualité de code

12. **[12.1]** Login/Signup — Remplacer `document.getElementById()` par `useRef`.
13. **[8.3]** `ImagePreview.tsx` — Documenter l'exception Blob URL ou conditionner.
14. **[⚠️]** `CreateBankCardModal` — Confirmer et documenter l'exception `<img>` dans `FRONTEND_CONTRACT.md`.

---

## Annexe — Fichiers à créer (résumé)

| Fichier                                    | Priorité | Contenu                                               |
| ------------------------------------------ | -------- | ----------------------------------------------------- |
| `src/app/(public)/tableau/error.tsx`       | 🔴 P0    | Image neutre + bouton Réessayer. Zéro texte d'erreur. |
| `src/app/(public)/tableau/not-found.tsx`   | 🔴 P0    | Page neutre sans "404".                               |
| `src/app/(protected)/edition/error.tsx`    | 🟡 P1    | Message orientant l'adulte + bouton Réessayer.        |
| `src/app/(protected)/profil/error.tsx`     | 🟡 P1    | Même pattern adulte.                                  |
| `src/app/(protected)/admin/error.tsx`      | 🟡 P1    | Même pattern adulte.                                  |
| `src/app/(protected)/abonnement/error.tsx` | 🟡 P1    | Même pattern adulte.                                  |
| `src/app/(public)/login/error.tsx`         | 🟡 P1    | Même pattern adulte.                                  |
| `src/app/(public)/signup/error.tsx`        | 🟡 P1    | Même pattern adulte.                                  |
