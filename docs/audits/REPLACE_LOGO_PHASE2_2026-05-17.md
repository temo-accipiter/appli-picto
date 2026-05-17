# REPLACE_LOGO — Rapport Phase 2

**Date** : 2026-05-17 | **Branche** : `feature/re-design-edition`
**Statut** : ✅ Terminé — toutes validations passées

---

## 1. Résumé des sous-phases

| Sous-phase              | Statut      | Note                                                           |
| ----------------------- | ----------- | -------------------------------------------------------------- |
| A — Vérification asset  | ✅ Conforme | `logo-vertical-dark.svg` présent, ratio identique, texte clair |
| B — Tokens `size()`     | ✅ Ajouté   | Dans `$size-tokens` (`_tokens.scss`), pas `$size-semantic`     |
| C — Création `AuthLogo` | ✅ Créé     | 2 fichiers : `.tsx` + `.scss`                                  |
| D — Intégration 4 pages | ✅ Fait     | SVG legacy supprimé, SCSS nettoyé                              |
| E — Validation finale   | ⏳ En cours | `pnpm check`, `pnpm test`, `pnpm build`                        |

---

## 2. Vérification `logo-vertical-dark.svg`

| Propriété         | Valeur                                     | Conformité                                               |
| ----------------- | ------------------------------------------ | -------------------------------------------------------- |
| Fichier           | `public/brand/logo-vertical-dark.svg`      | ✅ Présent                                               |
| Taille            | 6 376 octets                               | ✅ Identique à `logo-vertical.svg`                       |
| viewBox           | `0 0 228 122`                              | ✅ Ratio identique (1.87) — aucune rupture TSA           |
| Symbole (4 rects) | `#BCD8F1`, `#A9CDE9`, `#97C1E4`, `#2871A8` | ✅ Bleu brand, lisible sur fond sombre                   |
| Texte "picto"     | `fill="#F3F4F6"`                           | ✅ Quasi-blanc, contraste ~16:1 sur `#0f172a` (WCAG AAA) |
| Texte "logo.flow" | `fill="#2871A8"`                           | ✅ Bleu brand, lisible                                   |
| SVG valide        | Aucune référence cassée                    | ✅ Conforme                                              |

---

## 3. Divergence documentée — Destination tokens

**Instruction Temo** : ajouter dans `$size-semantic` (fichier `_semantics.scss`).

**Réalité technique** : `size()` lit exclusivement `$size-tokens` dans `_tokens.scss`. `$size-semantic` n'est pas mergé dans `$size-tokens` — les tokens sémantiques de `$size-semantic` ne sont pas accessibles via `size()`.

**Décision** : tokens ajoutés dans `$size-tokens` (`_tokens.scss`), section "Branding (Semantic component aliases)". Les noms et valeurs sont ceux validés par Temo. L'intention sémantique est préservée via le nom et le commentaire.

```scss
// Dans $size-tokens (_tokens.scss) — section Branding
'logo-auth-sm':7.5rem, // 120px - Largeur du logo Appli-Picto sur les pages d'authentification (mobile).
'logo-auth-lg': 10rem;
// 160px - Largeur du logo Appli-Picto sur les pages d'authentification (desktop).
```

---

## 4. Diff résumé par sous-phase

### Sous-phase B — `_tokens.scss`

```diff
+  // === Branding (Semantic component aliases) ===
+  'logo-auth-sm': 7.5rem,
+  // 120px - Largeur du logo Appli-Picto sur les pages d'authentification (mobile).
+  'logo-auth-lg': 10rem
+  // 160px - Largeur du logo Appli-Picto sur les pages d'authentification (desktop).
```

### Sous-phase C — Fichiers créés

**`AuthLogo.tsx`** (+40 lignes)

- Server Component, pas de `'use client'`
- `<Link href="/edition" aria-label="Appli-Picto — aller à l'édition">`
- 2 `<Image>` : `logo-vertical.svg` (light) + `logo-vertical-dark.svg` (dark)
- `width={228} height={122}` — dimensions intrinsèques SVG
- Classes BEM : `auth-logo__image--light` / `auth-logo__image--dark`
- `priority` sur les deux images

**`AuthLogo.scss`** (+65 lignes)

- `@use '@styles/abstracts' as *`
- `size('logo-auth-sm')` mobile, `size('logo-auth-lg')` desktop via `@include respond-to(md)`
- `height: auto` — préserve le ratio natif 228/122
- `@include safe-transition(opacity, timing('fast'), linear)` — 0.15s linear
- `opacity: 0.8` au hover
- `@include focus-ring()` au focus-visible
- `radius('sm')` = 6px TSA-friendly
- Dark mode : double sélecteur `@media (prefers-color-scheme: dark)` + `[data-theme='dark'] &` — pattern exact de `NavbarLogoIcon.scss`

### Sous-phase D — 4 pages auth

Pour chacun des 4 fichiers `.tsx` :

```diff
+ import AuthLogo from '@/components/layout/auth-logo/AuthLogo'

- <div className="{page}__logo" aria-hidden="true">
-   <svg width="56" height="56" ...>…</svg>
- </div>
+ <AuthLogo />
```

Pour chacun des 4 fichiers `.scss` :

```diff
- .{page}__logo {
-   color: color('base');
-   display: flex;
-   align-items: center;
-   justify-content: center;
-   margin-bottom: spacing('xs');
- }
```

---

## 5. Liste des fichiers modifiés/créés

| Fichier                                                   | Opération | Diff estimé   |
| --------------------------------------------------------- | --------- | ------------- |
| `src/styles/abstracts/_tokens.scss`                       | Modifié   | +5 lignes     |
| `src/components/layout/auth-logo/AuthLogo.tsx`            | Créé      | +40 lignes    |
| `src/components/layout/auth-logo/AuthLogo.scss`           | Créé      | +65 lignes    |
| `src/page-components/login/Login.tsx`                     | Modifié   | -15 +2 lignes |
| `src/page-components/login/Login.scss`                    | Modifié   | -8 lignes     |
| `src/page-components/signup/Signup.tsx`                   | Modifié   | -15 +2 lignes |
| `src/page-components/signup/Signup.scss`                  | Modifié   | -8 lignes     |
| `src/page-components/forgot-password/ForgotPassword.tsx`  | Modifié   | -15 +2 lignes |
| `src/page-components/forgot-password/ForgotPassword.scss` | Modifié   | -8 lignes     |
| `src/page-components/reset-password/ResetPassword.tsx`    | Modifié   | -15 +2 lignes |
| `src/page-components/reset-password/ResetPassword.scss`   | Modifié   | -8 lignes     |

---

## 6. Pattern dark mode appliqué

Pattern **calqué exactement** sur `NavbarLogoIcon.scss` (double sélecteur, source order identique) :

```scss
// Light mode (défaut)
&__image--light {
  display: block;
}
&__image--dark {
  display: none;
}

// Dark via OS
@media (prefers-color-scheme: dark) {
  &__image--light {
    display: none;
  }
  &__image--dark {
    display: block;
  }
}

// Dark via toggle utilisateur
[data-theme='dark'] & {
  &__image--light {
    display: none;
  }
  &__image--dark {
    display: block;
  }
}
```

Aucune divergence par rapport au pattern `NavbarLogoIcon.scss`. Cohérence garantie.

---

## 7. Résultats des validations

| Commande                           | Statut   | Détail                                                |
| ---------------------------------- | -------- | ----------------------------------------------------- |
| `pnpm check` (pré-implémentation)  | ✅ Passé | —                                                     |
| `pnpm check` (post-implémentation) | ✅ Passé | lint + format OK                                      |
| `pnpm test`                        | ✅ Passé | **216 tests passés, 0 échoué** (4 skipped attendus)   |
| `pnpm build`                       | ✅ Passé | Toutes routes générées, aucune erreur TypeScript/SCSS |
| `pnpm lint:hardcoded`              | ✅ Passé | "Aucun hardcode détecté"                              |

---

## 8. Suggestions de commits atomiques

```bash
# Commit 1 — Tokens SCSS
git commit -m "feat(scss): add size('logo-auth-sm') and size('logo-auth-lg') in \$size-tokens"

# Commit 2 — Composant AuthLogo
git commit -m "feat(layout): add AuthLogo server component for auth pages"

# Commit 3 — Intégration dans les 4 pages
git commit -m "refactor(auth-pages): replace inline legacy logo with AuthLogo (×4 pages)"
```

---

## 9. Checklist visuelle pour Temo

### Vérifications à faire dans le navigateur

- [ ] **Login** — logo officiel visible, taille adaptée (120px mobile, 160px desktop)
- [ ] **Signup** — idem
- [ ] **Forgot-password** — idem
- [ ] **Reset-password** — idem
- [ ] Clic sur le logo → navigation vers `/edition` (vérifier dans le navigateur)
- [ ] Focus clavier (Tab sur le logo) → focus ring visible WCAG conforme
- [ ] Dark mode (toggle ou OS) → `logo-vertical-dark.svg` affiché, texte clair lisible
- [ ] Light mode → `logo-vertical.svg` affiché, texte sombre lisible
- [ ] Hover → légère réduction d'opacité (0.8), transition 0.15s linear
- [ ] `prefers-reduced-motion` activé → aucune transition visible
- [ ] Mobile (<768px) → logo 120px de large, centré
- [ ] Desktop (≥768px) → logo 160px de large, centré
- [ ] Les `<h1>` "Appli-Picto" et taglines sont conservés sous le logo

---

## 10. Hors périmètre détecté en Phase 2

Aucun nouveau point hors périmètre détecté pendant l'implémentation. Les signalements de Phase 1 restent valides :

- `logo-monochrome.svg` orphelin (ménage assets séparé)
- Favicon/og:image (autre tâche)

---

_Rapport généré le 2026-05-17 — À mettre à jour dès que les validations sont terminées._
