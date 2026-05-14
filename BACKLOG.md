# Backlog Appli-Picto

> Tickets tracés mais non traités, par ordre de priorité.
> Mis à jour le 13 mai 2026 après la session migration palette brand.

---

## 🔴 Haute priorité (pré-commercialisation, bugs fonctionnels)

### T-pwa-sw — Réactiver Service Worker pour support offline

**Type** : Fonctionnalité critique (offline)
**Estimation** : 1-2h
**Bloquant commercialisation** : Oui (contrat FRONTEND_CONTRACT §4.4)

**Contexte** :

- `@ducanh2912/next-pwa` retiré de `next.config.js` car incompatible avec Turbopack
- Mais le contrat front prévoit fonctionnement offline (queue validations, timeline existante)
- Sans Service Worker : page blanche en cas de coupure réseau côté Tableau enfant
- Critique pour invariant TSA de prévisibilité

**Solution Étape 1 (court terme, ~1h)** :

- Restaurer `withPWA` dans `next.config.js`
- Modifier `package.json` : `"build": "next build --webpack"` (dev reste Turbopack)
- Configuration conservative : `cacheOnFrontEndNav: false`, `aggressiveFrontEndNavCaching: false`
- Vérifier que manifest.ts reste source de vérité (pas regénéré par next-pwa)
- Ajouter `public/sw.js` et `public/workbox-*.js` au gitignore

**Solution Étape 2 (moyen terme, plus tard)** :

- Migrer vers Serwist (successeur officiel de next-pwa, compatible Turbopack en dev)
- Nécessite spec préalable des stratégies de cache par route
- `@serwist/next` + `@serwist/precaching` + `@serwist/sw`

**Checklist Étape 1** :

- [x] Audit Phase 1 : état actuel next.config.js + package.json + manifest.ts
- [x] Vérification non-régression manifest.ts (source de vérité unique)
- [x] Configuration conservative
- [x] Build vert avec --webpack
- [ ] Test offline réel : charger l'app, mode avion, recharger → shell cached
- [ ] Test installation PWA Android (icône brand visible)
- [ ] Commit conventional

**Résolu le 14 mai 2026** — `withPWA` restauré dans `next.config.js` avec `disable: process.env.NODE_ENV === 'development'` (dev Turbopack non affecté). Build webpack via `next build --webpack`. `sw.js` + `workbox-*.js` générés dans `public/`. `manifest.ts` reste source de vérité (pas de `public/manifest.json` généré).

---

## 🟠 Moyenne priorité (qualité, à faire avant launch)

### T-tokens-motion — `timing()` et `easing()` non résolus par Turbopack

**Type** : Bug systémique design system / compilateur SCSS
**Estimation** : 2-3h (audit + migration)
**Bloquant commercialisation** : Non (contournements en place), mais affecte toutes les transitions

**Contexte** :

Découvert lors du débogage du loader (mai 2026). Le compilateur SCSS de Turbopack (dev) et Next.js (build) ne résout **pas** les fonctions `timing()` et `easing()` lorsqu'elles sont utilisées dans des propriétés CSS shorthand (`animation:`, `transition:`).

Le CSS compilé contient littéralement `timing("base")` et `easing("ease-out")` au lieu des valeurs résolues `0.3s` et `ease-out`. Le navigateur reçoit des valeurs invalides et utilise les défauts CSS :

- `transition-duration: 0s` → transitions instantanées (visuellement OK, mais pas les durées prévues)
- `animation-duration: 0s` → animations jouées en 0 seconde → dots figés (bug visible)

Les fonctions fonctionnent correctement dans les propriétés sub-longhand (`transition-duration: timing('base')`) mais pas dans les shorthands.

**Preuve** : inspecter `.next/static/chunks/*.css` → `transition:color timing("fast")easing("ease-out")` partout.

**Contournement actuel** : `Loader.scss` utilise `0.3s` hardcodé pour l'animation des dots.

**Solution proposée** :

- Option A (rapide) : remplacer `timing()` et `easing()` par leurs valeurs résolues dans tous les shorthands animation/transition (grep + sed ciblé)
- Option B (propre) : utiliser les propriétés sub-longhand séparées plutôt que les shorthands : `transition-property`, `transition-duration`, `transition-timing-function` — les fonctions SCSS s'y résolvent correctement
- Option C (investigation) : comprendre pourquoi Turbopack ne résout pas ces fonctions (bug Turbopack ? problème `@use`/`@forward` dans l'abstracts index ?) et corriger à la source

**Checklist** :

- [x] Audit Phase 1 : grep exhaustif de tous les `timing()` et `easing()` dans les shorthands SCSS
- [x] Compter l'impact : combien de fichiers, combien de propriétés affectées
- [x] Choisir Option A, B ou C selon ampleur
- [x] Migration + build vert
- [x] Vérifier visuellement que les durées de transition sont correctes après fix

**Résolu le 14 mai 2026** — Cause racine : `_motion.scss` n'était pas forwardé dans `_index.scss`, SCSS traitait `timing()` / `easing()` comme des fonctions CSS inconnues. Fix : `@forward './motion' show timing, easing, motion-preset` + migration 34 shorthands → sub-longhands + correction 3 clés easing invalides (`'bounce'`, `'in-out'`, `'spring'`).

---

### T-logo-usage — Audit + standardisation usage du logo

**Type** : UX + dette technique
**Estimation** : 1h30 (audit 20 min + décisions 15 min + impl 45 min)
**Bloquant commercialisation** : Non, mais important pour cohérence brand

**Contexte** :

- 5 variants SVG existent : `logo-principal`, `logo-dark`, `logo-vertical`, `logo-monochrome`, `logo-app-icon`
- Composant `BrandLogo.tsx` existe avec 4 variantes via `next/image`
- Mais usage actuel non audité : tous les variants sont-ils vraiment chargés ?
- Navbar et NavbarVisiteur dupliquent `logo-app-icon.svg` inline (dette)
- Aucun logo cliquable redirigeant vers homepage actuellement

**Proposition UX validée** :

- Logo cliquable dans la Navbar redirigeant vers homepage sur toutes les pages
- **EXCLUSION** : Contexte Tableau enfant (anti-shock UX TSA, mode kiosque)
- Pattern conventionnel, réduit charge cognitive, filet de sécurité utilisateur perdu

**Questions à trancher avant implémentation** :

1. Quel variant pour la Navbar ? `logo-app-icon.svg` (compact 4 carrés actuel) ou `logo-principal.svg` (avec texte) ?
2. Redirection conditionnelle selon auth ? `/` si visiteur, `/edition` si connecté ?
3. Comportement Tableau enfant : logo absent / présent non-cliquable / cliquable adulte uniquement (long-press) ?
4. Auto-swap selon contexte : light/dark mode, mobile narrow / desktop wide ?

**Plan en 3 phases** :

PHASE 1 — Audit (Claude Code, READ-ONLY, 20 min) :

- Recherche exhaustive imports/refs aux 5 SVG logos
- Recherche appels au composant `<BrandLogo>`
- Inventaire par page : Login, Profil, Édition, Admin, Tableau, Public, Légal
- Rapport : où le logo EST, où il DEVRAIT être, ce qui est dupliqué

PHASE 2 — Décisions design (toi + Claude conversational, 15 min) :

- Trancher les 4 questions ci-dessus
- Documenter dans `direction-visuelle` v1.2 ou v1.3

PHASE 3 — Implémentation (Claude Code CLI, 45 min) :

- Standardiser usage via `<BrandLogo>` partout où pertinent
- Rendre cliquable avec redirection appropriée
- Auto-swap variant selon contexte
- Exclure du Tableau enfant
- Dédupliquer SVG inline Navbar (intersection avec T-navbar-dedup)

**Note** : ce ticket englobe T-navbar-dedup ci-dessous (déduplication).

---

### T-naming — Lever la collision sémantique "primary"

**Type** : Dette technique sémantique
**Estimation** : 1h
**Bloquant commercialisation** : Non

**Checklist** :

- [x] Audit Phase 1 : tous les appels à `semantic('primary')` dans le code (aucun)
- [x] Identifier ceux qui veulent vraiment le violet admin vs le bleu UI
- [x] Renommer dans `_semantics.scss`
- [x] Propager les appels (aucune propagation nécessaire — `semantic()` n'expose pas `$color-semantic-brand`)
- [x] Build + lint verts

**Résolu le 14 mai 2026** — Clés `$color-semantic-brand` renommées : `'primary'` → `'admin'`, `'primary-hover'` → `'admin-hover'`, `'primary-active'` → `'admin-active'`, `'primary-light'` → `'admin-light'`. Commentaire du bloc mis à jour pour documenter la distinction `admin` (violet #667eea) vs `color('base')` (bleu brand #2871A8).

---

### T-dark — Audit + migration palette mode dark

**Type** : Cohérence brand mode dark
**Estimation** : 1h
**Bloquant commercialisation** : Non si mode dark non offert au launch

**Checklist** :

- [x] Audit Phase 1 : `blue(400)` = `#60a5fa`, contraste ~6.6:1 sur `slate(900)` = `#0f172a` ✅ WCAG AA mais non brand-aligné
- [x] Refactor : `brand-blue(100)` = `#a9cde9`, contraste ~10:1 ✅ WCAG AAA, brand-aligné
- [x] Build + lint verts

**Résolu le 14 mai 2026** — `--color-primary` dark mode migré de `blue(400)` (`#60a5fa`, Tailwind) vers `brand-blue(100)` (`#a9cde9`, palette brand). Contraste amélioré : ~6.6:1 → ~10:1 WCAG AAA sur fond `slate(900)`. `brand-blue(600)` = `#2871A8` rejeté (contraste ~3.4:1, trop sombre pour dark mode).

---

## 🟡 Basse priorité (post-launch acceptable)

### T-clutter — Mise à jour 6 commentaires obsolètes

**Type** : Hygiène code
**Estimation** : 15 min
**Bloquant commercialisation** : Non

**Résolu le 14 mai 2026** — 6 commentaires SCSS mis à jour : `#0077c2` → `#2871A8` dans `_forms.scss` (×2) et `CookieBanner.scss` (ratio corrigé 4.75:1 → 5.20:1) ; `#5A9FB8` → `#2871A8` dans `not-found.scss` (×2) et `global-error.scss` (×1). Commentaire `_semantics.scss:144` supprimé lors du renommage T-naming.

---

### T-navbar-dedup — Extraction composant Logo partagé

**Type** : Dette technique (déduplication)
**Estimation** : 30 min
**Note** : Englobé dans T-logo-usage si traité ensemble

**Contexte** :

- SVG `logo-app-icon` dupliqué inline dans :
  - `src/components/.../Navbar.tsx`
  - `src/components/.../NavbarVisiteur.tsx`
- Même code SVG répété → si modif logo, 2 endroits à toucher

**Solution** : extraire un composant `<NavbarLogoIcon>` partagé.

**À traiter** : conjointement avec T-logo-usage ou séparément si T-logo-usage est reporté.

---

### T-pwa-screenshots — Enrichir manifest avec screenshots

**Type** : Amélioration UX installation PWA
**Estimation** : 15 min
**Bloquant commercialisation** : Non

**Contexte** :
Warnings DevTools Application → Manifest :

```
Richer PWA Install UI won't be available on desktop. Please add at least one
screenshot with the form_factor set to wide.
Richer PWA Install UI won't be available on mobile. Please add at least one
screenshot for which form_factor is not set or set to a value other than wide.
```

**Solution** : ajouter le champ `screenshots` dans `src/app/manifest.ts` :

```typescript
screenshots: [
  {
    src: '/screenshots/desktop.png',
    sizes: '1280x720',
    type: 'image/png',
    form_factor: 'wide',
    label: 'Tableau de motivation visuel',
  },
  {
    src: '/screenshots/mobile.png',
    sizes: '375x667',
    type: 'image/png',
    label: 'Vue mobile',
  },
]
```

**⚠️ À faire APRÈS le redesign complet** — sinon les screenshots seront à refaire.

---

### T-manifest-id — Ajouter `id` au manifest

**Type** : Cosmétique (App ID stable)
**Estimation** : 5 min
**Bloquant commercialisation** : Non

**Contexte** :
Note vue dans DevTools : "id is not specified in the manifest, start_url is used instead".

**Solution** : ajouter `id: '/'` dans `src/app/manifest.ts` pour garantir un App ID stable même si `start_url` change.

---
