# Plan de réorganisation — Appli-Picto

**Date** : 2026-04-09
**Branch** : feature/refonte-zustand
**Statut** : Lecture seule — ZÉRO modification de fichiers existants
**Basé sur** : DIAGNOSTIC.md + DIAGNOSTIC-COMPLEMENT.md (2026-04-09)

---

## Verdict global

> La codebase est **saine et bien structurée**. Il n'existe pas de réorganisation majeure justifiée. Seules 3 anomalies mineures méritent correction, dont une est déjà résolue. Le plan ci-dessous documente l'état réel et propose uniquement des changements à valeur ajoutée réelle.

---

## 1. Structure actuelle — tree complet de `src/`

```
src/
├── app/                                      ← Next.js App Router (routes)
│   ├── (protected)/                          ← Route group — requiert auth
│   │   ├── abonnement/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   ├── logs/page.tsx
│   │   │   ├── metrics/page.tsx
│   │   │   └── permissions/page.tsx
│   │   ├── edition/
│   │   │   └── page.tsx
│   │   ├── profil/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (public)/                             ← Route group — accès libre
│   │   ├── forgot-password/page.tsx
│   │   ├── legal/
│   │   │   ├── accessibilite/page.tsx
│   │   │   ├── cgu/page.tsx
│   │   │   ├── cgv/page.tsx
│   │   │   ├── mentions-legales/page.tsx
│   │   │   ├── politique-confidentialite/page.tsx
│   │   │   ├── politique-cookies/page.tsx
│   │   │   └── rgpd/page.tsx
│   │   ├── login/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── tableau/page.tsx
│   │   └── layout.tsx
│   ├── client-wrapper.tsx
│   ├── global-error.tsx
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── page.tsx
│   └── providers.tsx
│
├── assets/                                   ← Images statiques + contenus légaux
│   ├── images/
│   │   ├── google-icon.png
│   │   ├── ligne/ (ligne1.png, ligne6.png, ligne12.png)
│   │   └── train.png
│   ├── legal/ (*.md — 10 fichiers Markdown légaux)
│   ├── index.ts
│   └── legal-content.ts
│
├── components/                               ← Composants UI — 4 couches
│   ├── features/                             ← Composants fonctionnels (domaine métier)
│   │   ├── admin/
│   │   │   └── AdminMenuItem.tsx
│   │   ├── cards/
│   │   │   └── cards-edition/ (CardsEdition.tsx + .scss)
│   │   ├── child-profile/
│   │   │   ├── ChildProfileSelector.tsx + .scss
│   │   │   ├── child-profile-manager/ (ChildProfileManager.tsx + .scss)
│   │   │   └── index.ts
│   │   ├── consent/
│   │   │   ├── CookieBanner.tsx + .scss
│   │   │   └── CookiePreferences.tsx + .scss
│   │   ├── legal/
│   │   │   └── legal-markdown/ (LegalMarkdown.tsx + .scss)
│   │   ├── profil/
│   │   │   ├── DeleteProfileModal.tsx + .scss
│   │   │   └── device-list/ (DeviceList.tsx + .scss)
│   │   ├── recompenses/
│   │   │   └── selected-reward-floating/ (SelectedRewardFloating.tsx + .scss)
│   │   ├── sequences/
│   │   │   ├── sequence-editor/ (SequenceEditor.tsx + .scss)
│   │   │   ├── sequence-mini-timeline/ (SequenceMiniTimeline.tsx + .scss)
│   │   │   └── index.ts
│   │   ├── settings/
│   │   │   ├── DeleteAccountGuard.tsx + .scss
│   │   │   └── DeleteAccountModal.tsx
│   │   ├── subscription/
│   │   │   └── subscribe-button/ (SubscribeButton.tsx)
│   │   ├── tableau/
│   │   │   ├── session-complete/ (SessionComplete.tsx + .scss)
│   │   │   ├── slot-card/ (SlotCard.tsx + .scss)
│   │   │   ├── tokens-grid/ (TokensGrid.tsx + .scss)
│   │   │   └── index.ts
│   │   ├── taches/
│   │   │   ├── taches-dnd/ (TachesDnd.tsx + .scss)
│   │   │   └── train-progress-bar/ (TrainProgressBar.tsx + .scss)
│   │   ├── time-timer/
│   │   │   ├── FloatingTimeTimer.tsx + .scss
│   │   │   └── TimeTimer.tsx + .scss
│   │   └── timeline/
│   │       ├── card-picker/ (CardPicker.tsx + .scss)
│   │       ├── slot-item/ (SlotItem.tsx + .scss)
│   │       ├── slots-editor/ (SlotsEditor.tsx + .scss)
│   │       └── index.ts
│   │
│   ├── layout/                               ← Composants de structure de page
│   │   ├── bottom-nav/ (BottomNav.tsx + .scss + index.ts)
│   │   ├── footer/ (Footer.tsx + .scss)
│   │   ├── navbar/ (Navbar.tsx + .scss)
│   │   ├── settings-menu/ (SettingsMenu.tsx + .scss)
│   │   └── user-menu/ (UserMenu.tsx + .scss)
│   │
│   ├── shared/                               ← Composants partagés inter-features
│   │   ├── account-status-badge/ (AccountStatusBadge.tsx + .scss)
│   │   ├── admin-route/ (AdminRoute.tsx + .scss)
│   │   ├── avatar-profil/ (AvatarProfil.tsx + .scss)
│   │   ├── card/
│   │   │   ├── base-card/ (BaseCard.tsx + .scss)
│   │   │   ├── edition-card/ (EditionCard.tsx + .scss)
│   │   │   └── tableau-card/ (TableauCard.tsx + .scss)
│   │   ├── demo-signed-image/ (DemoSignedImage.tsx + .scss)
│   │   ├── dnd/
│   │   │   ├── DndCard/ (DndCard.tsx + .scss + test + index.ts)
│   │   │   ├── DndGrid/ (DndGrid.tsx + .scss + test + index.ts)
│   │   │   ├── DndSlot/ (DndSlot.tsx + .scss + test + index.ts)
│   │   │   ├── useDndGrid.ts       ← ⚠️ Hook dans components/ (voir §4.4 DIAG)
│   │   │   ├── useDndGrid.test.ts
│   │   │   └── index.ts
│   │   ├── dropdown/ (Dropdown.tsx + .scss)
│   │   ├── error-boundary/ (ErrorBoundary.tsx + .scss)
│   │   ├── execution-only-banner/ (ExecutionOnlyBanner.tsx + .scss)
│   │   ├── forms/ (ItemForm.tsx + .scss)
│   │   ├── global-loader/ (GlobalLoader.tsx + .scss)
│   │   ├── initialization-loader/ (InitializationLoader.tsx + .scss)
│   │   ├── input-with-validation/ (InputWithValidation.tsx)
│   │   ├── lang-selector/ (LangSelector.tsx + .scss)
│   │   ├── layout/
│   │   │   └── Layout.tsx + .scss    ← ⚠️ ANOMALIE — exporté mais zéro import
│   │   ├── long-press-link/ (LongPressLink.tsx + .scss)
│   │   ├── modal/
│   │   │   ├── Modal.tsx + .scss + test
│   │   │   ├── create-bank-card-modal/ (CreateBankCardModal.tsx + .scss)
│   │   │   ├── modal-ajout/ (ModalAjout.tsx)
│   │   │   ├── modal-category/ (ModalCategory.tsx + .scss)
│   │   │   ├── modal-confirm/ (ModalConfirm.tsx)
│   │   │   ├── modal-personalization/ (PersonalizationModal.tsx + .scss)
│   │   │   ├── modal-quota/ (ModalQuota.tsx + .scss)
│   │   │   └── modal-recompense/ (ModalRecompense.tsx + .scss)
│   │   │   ← NOTE: modal-visitor-import/ signalé dans DIAG déjà supprimé ✅
│   │   ├── offline-banner/ (OfflineBanner.tsx + .scss)
│   │   ├── page-transition/ (PageTransition.tsx)
│   │   ├── private-route/ (PrivateRoute.tsx)     ← user connecté uniquement
│   │   ├── protected-route/ (ProtectedRoute.tsx) ← user OU visiteur
│   │   ├── search-input/ (SearchInput.tsx + .scss)
│   │   ├── separator/ (Separator.tsx + .scss)
│   │   ├── signed-image/ (SignedImage.tsx + .scss)
│   │   ├── theme-toggle/ (ThemeToggle.tsx + .scss)
│   │   └── web-vitals/ (WebVitals.tsx)
│   │
│   ├── ui/                                   ← Primitives UI atomiques
│   │   ├── button/
│   │   │   ├── Button.tsx + .scss + test
│   │   │   ├── button-close/ (ButtonClose.tsx + .scss)
│   │   │   └── button-delete/ (ButtonDelete.tsx + .scss)
│   │   ├── checkbox/ (Checkbox.tsx + .scss + test)
│   │   ├── floating-pencil/ (FloatingPencil.tsx + .scss)
│   │   ├── image-preview/ (ImagePreview.tsx + .scss)
│   │   ├── input/ (Input.tsx + .scss + test)
│   │   ├── loader/ (Loader.tsx + .scss)
│   │   ├── password-checklist/ (PasswordChecklist.tsx + .scss)
│   │   ├── select/ (Select.tsx + .scss + test)
│   │   ├── toast/ (Toast.tsx + .scss + test)
│   │   ├── toggle/ (Toggle.tsx + .scss)
│   │   └── upload-progress/ (UploadProgress.tsx + .scss)
│   │
│   └── index.ts                              ← Barrel export (50+ composants)
│
├── config/                                   ← Configuration applicative
│   ├── constants/ (colors.ts, legalConfig.ts)
│   ├── i18n/ (i18n.ts)
│   └── sentry/ (index.ts)
│
├── contexts/                                 ← React Contexts (8 contextes)
│   ├── AuthContext.tsx + test
│   ├── ChildProfileContext.tsx
│   ├── DisplayContext.tsx
│   ├── LoadingContext.tsx
│   ├── OfflineContext.tsx
│   ├── RealtimeBankCardsContext.tsx
│   ├── ToastContext.tsx + test
│   └── index.ts
│
├── hooks/                                    ← Custom hooks (56 hooks)
│   ├── CLAUDE.md                             ← Inventaire complet des hooks
│   ├── _net.ts                               ← Utilitaire réseau partagé
│   ├── index.ts                              ← Barrel export (65 exports)
│   └── use*.ts / use*.test.ts               ← 56 hooks + 11 fichiers de tests
│
├── lib/                                      ← Wrappers bibliothèques externes
│   └── stripe/
│       ├── browser.ts
│       ├── index.ts
│       └── types.ts
│
├── page-components/                          ← Composants de page (logique page-level)
│   ├── abonnement/ (Abonnement.tsx + .scss)
│   ├── admin/
│   │   ├── logs/ (Logs.tsx + .scss)
│   │   ├── metrics/ (Metrics.tsx + .scss)
│   │   ├── permissions/ (Permissions.tsx + .scss)
│   │   └── index.ts
│   ├── edition/ (Edition.tsx + .scss + test)
│   ├── edition-timeline/ (EditionTimeline.tsx + .scss)
│   ├── forgot-password/ (ForgotPassword.tsx + .scss)
│   ├── legal/
│   │   ├── CGU.tsx, CGV.tsx, Accessibilite.tsx
│   │   ├── MentionsLegales.tsx, PolitiqueConfidentialite.tsx
│   │   ├── PolitiqueCookies.tsx
│   │   └── rgpd/ (PortailRGPD.tsx + .scss)
│   ├── login/ (Login.tsx + .scss)
│   ├── profil/ (Profil.tsx + .scss + test)
│   ├── reset-password/ (ResetPassword.tsx + .scss)
│   ├── signup/ (Signup.tsx)
│   └── tableau/ (Tableau.tsx + .scss + 2 tests)
│
├── styles/                                   ← Design system SCSS
│   ├── abstracts/ (18 fichiers tokens)
│   ├── base/ (7 fichiers base)
│   ├── themes/ (_dark.scss, _light.scss, _index.scss)
│   ├── vendors/ (_normalize.scss, _index.scss)
│   ├── CLAUDE.md
│   ├── main.scss
│   └── main.css
│
├── test/                                     ← Infrastructure de tests
│   ├── mocks/ (data.ts, handlers.ts, server.ts)
│   ├── setup.ts
│   ├── setupAxe.ts
│   └── test-utils.tsx
│
├── types/                                    ← Types TypeScript
│   ├── cards.ts
│   ├── global.d.ts
│   ├── supabase.ts    ← AUTO-GÉNÉRÉ (pnpm db:types) — NE PAS modifier
│   └── utils.d.ts
│
└── utils/                                    ← Utilitaires fonctionnels
    ├── auth/ (ensureValidSession.ts)
    ├── categories/ (getCategoryDisplayLabel.ts)
    ├── images/
    │   ├── config.ts
    │   ├── convertToJpeg.ts
    │   ├── heicConverter.ts
    │   ├── imageValidator.ts
    │   ├── webpConverter.ts + test
    ├── logs/ (formatErr.ts)
    ├── serviceWorker/ (register.ts)
    ├── storage/
    │   ├── deleteImageIfAny.ts
    │   ├── getSignedUrl.ts
    │   ├── modernUploadImage.ts
    │   ├── pathBuilders.ts
    │   ├── resolveStorageImageUrl.ts
    │   ├── uploadBankCardImage.ts
    │   ├── uploadCardImage.ts
    │   └── uploadImage.ts
    ├── upload/ (uploadWithRetry.ts)
    ├── visitor/
    │   ├── sequencesDB.ts
    │   ├── sessionsDB.ts
    │   └── slotsDB.ts
    ├── consent.ts
    ├── getDisplayPseudo.ts
    ├── index.ts
    ├── rgpdExport.ts
    ├── supabaseClient.ts
    ├── supabaseVisibilityHandler.ts
    └── validationRules.ts
```

---

## 2. Évaluation dossier par dossier

### `src/app/` ✅ CONFORME App Router

Utilisation correcte :

- Route groups `(protected)` et `(public)` — pattern officiel Next.js
- Chaque route n'a que `page.tsx` + `layout.tsx` (layouts imbriqués)
- `providers.tsx`, `client-wrapper.tsx`, `global-error.tsx`, `not-found.tsx` = fichiers spéciaux App Router corrects
- Les `page.tsx` sont minimalistes — ils délèguent la logique aux `page-components/`

**Aucun changement requis.**

---

### `src/page-components/` ⚠️ NOM NON-STANDARD — PATTERN VALIDE

Ce dossier n'est pas une convention officielle de Next.js App Router, mais il met en œuvre un **pattern répandu** : garder les `page.tsx` de `app/` vides (simples imports) et concentrer la logique dans des composants dédiés.

Pourquoi ce pattern est acceptable ici :

- Projet solo-dev — pas besoin de conventions d'équipe strictes
- Alternative officielle (colocalisation dans `app/`) rendrait le dossier `app/` difficile à naviguer
- 24 fichiers importent depuis `page-components/` — renommage coûteux pour zéro bénéfice fonctionnel

**Décision : ne pas renommer.** La clarté est meilleure que la conformité nominale.

---

### `src/components/` ✅ CONFORME — 4 couches bien séparées

| Couche      | Rôle                                                  | Statut     |
| ----------- | ----------------------------------------------------- | ---------- |
| `ui/`       | Primitives atomiques (Button, Input, Select...)       | ✅ Correct |
| `shared/`   | Composants transversaux (Modal, DND, Layout shell...) | ✅ Correct |
| `layout/`   | Structure de page (Navbar, Footer, BottomNav...)      | ✅ Correct |
| `features/` | Composants fonctionnels par domaine métier            | ✅ Correct |

**Anomalie 1 — `shared/layout/Layout.tsx` : composant orphelin (DEAD CODE)**

Ce composant est exporté dans le barrel (`components/index.ts:89`) mais **aucun fichier ne l'importe**. Les layouts dans `app/` importent directement Navbar, Footer, etc. Le composant `Layout.tsx` est un vestige probablement antérieur à la migration App Router.

**Anomalie 2 — `shared/dnd/useDndGrid.ts` : hook dans components/**

Identifiée et documentée dans le DIAGNOSTIC (§4.4). Non-violation : ce hook est strictement couplé aux composants DND et n'est pas réutilisable ailleurs. Maintenir en place.

---

### `src/hooks/` ✅ CONFORME

56 hooks, barrel à 65 exports, 100% d'imports via `@/hooks`. Zéro anomalie.

---

### `src/contexts/` ✅ CONFORME

8 contextes, chacun avec un rôle clair. `index.ts` barrel export correct.

---

### `src/utils/` ✅ CONFORME

Organisé par domaine (`auth/`, `images/`, `storage/`, `visitor/`, etc.). Le refactoring `convertToJpeg` et `pathBuilders` recommandé dans le DIAGNOSTIC COMPLÉMENTAIRE est **déjà en place** (`utils/images/convertToJpeg.ts` et `utils/storage/pathBuilders.ts` existent).

---

### `src/config/` ✅ CONFORME

Séparation propre : `constants/`, `i18n/`, `sentry/`. Pas de mélange avec les utils.

---

### `src/lib/` ✅ CONFORME

Pattern standard pour les wrappers de bibliothèques externes. Seul Stripe ici, bien isolé.

---

### `src/styles/` ✅ CONFORME

Design system SCSS complet avec tokens, base, themes, vendors. Voir `src/styles/CLAUDE.md` pour les règles.

---

### `src/types/` ✅ CONFORME

Centralisé. `supabase.ts` est auto-généré (ne pas modifier). `global.d.ts` contient les types partagés.

---

### `src/test/` ✅ CONFORME

Infrastructure de tests centralisée (MSW mocks, setup, utils). Correct.

---

### `src/assets/` ✅ CONFORME

Images et contenus légaux statiques. Séparation claire avec le code.

---

## 3. Structure cible proposée

La structure actuelle est **quasi-optimale**. Seuls 2 changements sont justifiés :

```
src/
└── components/
    └── shared/
        └── layout/
            ├── Layout.tsx    ← SUPPRIMER (dead code — 0 import)
            └── Layout.scss   ← SUPPRIMER avec le tsx
```

Et dans le barrel :

```
src/components/index.ts
    ligne 89: export { default as Layout } from './shared/layout/Layout'
              ← SUPPRIMER cette ligne
```

**Toute autre modification est NON RECOMMANDÉE** pour les raisons détaillées en §5.

---

## 4. Plan d'exécution — commits atomiques ordonnés

### Commit 1 — Supprimer Layout.tsx orphelin

**Priorité** : 🟢 Mineur
**Risque** : Faible (0 import à mettre à jour)

| Opération | Détail                                                           |
| --------- | ---------------------------------------------------------------- |
| Supprimer | `src/components/shared/layout/Layout.tsx`                        |
| Supprimer | `src/components/shared/layout/Layout.scss`                       |
| Modifier  | `src/components/index.ts` ligne 89 — supprimer l'export `Layout` |
| Vérifier  | `pnpm check && pnpm build` — aucune régression attendue          |

**Imports à modifier** : 0 (aucun fichier n'importe ce composant)
**Grep de confirmation avant suppression** :

```bash
grep -rn "from '@/components'" src/ | grep "Layout[^a-zA-Z]"
grep -rn "<Layout" src/ --include="*.tsx"
```

**Message de commit suggéré** :

```
chore: supprimer Layout.tsx orphelin (dead code)
```

---

### Commit 2 — (optionnel) Nettoyer devDependencies inutilisées

**Priorité** : 🟢 Mineur
**Risque** : Faible

| Package                    | Action                               |
| -------------------------- | ------------------------------------ |
| `@types/deno`              | Supprimer (projet Node, pas Deno)    |
| `baseline-browser-mapping` | Supprimer (aucune référence trouvée) |

```bash
pnpm remove --save-dev @types/deno baseline-browser-mapping
pnpm check && pnpm build
```

**Message de commit suggéré** :

```
chore: supprimer devDeps inutilisées (@types/deno, baseline-browser-mapping)
```

---

### Commit 3 — (conditionnel) Examiner axe-core

**Condition** : Si aucun test a11y n'est prévu à court terme
**Risque** : Faible — mais peut être gardé si tests a11y sont prévus

`setupAxe.ts` existe dans `src/test/` → signal d'intention de tests a11y.
**Recommandation : garder `axe-core`** et implémenter les tests dans un sprint dédié.

---

## 5. Ce qui ne bouge PAS — liste explicite

| Dossier / Fichier                                 | Raison                                                                                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/page-components/`                            | Nom non-standard mais pattern bien établi. 24 imports. Renommage = coût élevé, bénéfice nul.                                             |
| `src/hooks/`                                      | Architecture parfaite, barrel optimal. 56 hooks, 0 anomalie.                                                                             |
| `src/contexts/`                                   | 8 contextes clairs, rôles documentés.                                                                                                    |
| `src/utils/visitor/`                              | Séparation Auth/Visitor intentionnelle et architecturalement justifiée (voir DIAGNOSTIC §3).                                             |
| `src/components/shared/dnd/useDndGrid.ts`         | Hook colocalisé avec ses composants DND. Strictement couplé, non réutilisable. Acceptable.                                               |
| `src/components/shared/private-route/`            | Rôle distinct de `ProtectedRoute` : bloque les visiteurs. Séparation documentée en JSDoc. Ne pas fusionner.                              |
| `src/components/shared/protected-route/`          | Rôle distinct de `PrivateRoute` : autorise visiteurs. Séparation documentée en JSDoc. Ne pas fusionner.                                  |
| `src/components/features/admin/AdminMenuItem.tsx` | Utilisé uniquement par `UserMenu.tsx` (layout). Colocalisable dans `layout/user-menu/` mais gain cosmétique seulement. Laisser en place. |
| `src/page-components/edition-timeline/`           | Sibling de `edition/` mais composant distinct (timeline interactive). Pas une duplication.                                               |
| `src/lib/stripe/`                                 | Wrapper Stripe bien isolé dans `lib/`. Conforme aux conventions.                                                                         |
| `src/styles/`                                     | Design system SCSS complet. Aucune réorganisation justifiée.                                                                             |
| `src/types/supabase.ts`                           | Auto-généré par `pnpm db:types`. NE PAS toucher.                                                                                         |
| `src/utils/images/convertToJpeg.ts`               | Déjà extrait et centralisé (refacto DIAG COMPLÉMENTAIRE déjà appliqué).                                                                  |
| `src/utils/storage/pathBuilders.ts`               | Déjà centralisé (refacto DIAG COMPLÉMENTAIRE déjà appliqué).                                                                             |

---

## 6. Synthèse des priorités

| Priorité    | Action                                                | Effort | Risque            |
| ----------- | ----------------------------------------------------- | ------ | ----------------- |
| 🟢 Mineur   | Supprimer `Layout.tsx` orphelin + export barrel       | 5 min  | Faible (0 import) |
| 🟢 Mineur   | Supprimer `@types/deno` et `baseline-browser-mapping` | 2 min  | Faible            |
| ⏸ Reporter | Refactoriser `Edition.tsx` (841 lignes)               | 4-6h   | Moyen             |
| ⏸ Reporter | Nettoyer les `console.log` debug                      | 1h     | Faible            |

**Les 2 premières actions constituent le "vrai" plan de réorganisation.**
Tout le reste relève du refactoring de code ou du nettoyage, pas de la structure de dossiers.

---

## 7. Conclusion

Appli-Picto a une architecture **App Router correcte, une séparation des responsabilités claire, et une cohérence de nommage exemplaire**.

La seule vraie anomalie structurelle est `shared/layout/Layout.tsx` (dead code exporté mais jamais utilisé). Tout le reste est au bon endroit, pour de bonnes raisons.

> ⚠️ Résister à la tentation de "réorganiser pour réorganiser". Chaque déplacement de fichier casse des imports et crée une surface de régression. La valeur doit être mesurée, pas supposée.

---

_Document produit en lecture seule — 2026-04-09 — Zéro modification de fichiers source_
