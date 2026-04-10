# Audit Primitives UI — Appli-Picto

> Audit read-only — aucune modification de code
> Date : 2026-04-10 | Branche : feature/refonte-zustand

---

## Périmètre d'analyse

- `src/components/` (ui, shared, features, layout)
- `src/page-components/` (toutes les pages)

---

## 1. Boutons

### Primitives trouvées

| Composant      | Chemin                                                    | Props clés                                                                                                                            | Call sites                                                    |
| -------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `Button`       | `src/components/ui/button/Button.tsx`                     | `variant` (primary/secondary/default/danger), `disabled`, `isLoading`, `type`, `className`, `aria-expanded`, `aria-label`, `children` | ~25 fichiers                                                  |
| `ButtonClose`  | `src/components/ui/button/button-close/ButtonClose.tsx`   | `onClick`, `ariaLabel`, `size` (small/large/modal)                                                                                    | 1 (Modal.tsx)                                                 |
| `ButtonDelete` | `src/components/ui/button/button-delete/ButtonDelete.tsx` | `onClick`, `title`, `disabled`, `aria-label`                                                                                          | 4 (ModalCategory, EditionCard, SlotItem, ChildProfileManager) |

La primitive `Button` est bien établie : `forwardRef`, spinner interne, `aria-busy`, classes BEM cohérentes (`btn--${variant}`).

### Usages inline `<button>` sans primitive

#### 🔴 CookieBanner.tsx — 3 boutons

**Fichier** : `src/components/features/consent/CookieBanner.tsx`

```html
<button className="btn btn-secondary">
  ← refuser
  <button className="btn btn-outline">
    ← personnaliser <button className="btn">← accepter</button>
  </button>
</button>
```

**Problème critique** : ces composants utilisent **exactement les mêmes classes CSS** (`btn`, `btn-secondary`) que le composant `Button`, mais sans le passer par la primitive. Si les classes de Button évoluent, CookieBanner ne suivra pas.

#### 🔴 CookiePreferences.tsx — 4 boutons

**Fichier** : `src/components/features/consent/CookiePreferences.tsx`

```html
<button className="icon">
  ← bouton fermer (l. 149) — devrait utiliser ButtonClose
  <button className="btn btn-secondary">
    ← refuser tout (l. 262)
    <button className="btn btn-outline">
      ← sauvegarder choix (l. 269)
      <button className="btn">← accepter tout (l. 276)</button>
    </button>
  </button>
</button>
```

Même problème que CookieBanner. De plus, le bouton fermer devrait utiliser `ButtonClose` (qui existe précisément pour ça).

#### 🟡 PortailRGPD.tsx — 4 boutons

**Fichier** : `src/page-components/legal/rgpd/PortailRGPD.tsx`

Crée 4 `<button>` bruts pour les actions RGPD (export, rectification, suppression de compte, gestion consentements). L'agent n'a pas trouvé de classes `btn` identiques ici, mais ces boutons d'action pourraient utiliser Button.

#### 🟡 AdminMenuItem.tsx — 4 boutons

**Fichier** : `src/components/features/admin/AdminMenuItem.tsx`

```html
<button className="user-menu-item admin" aria-expanded="{adminOpen}">
  ← accordion
  <button className="user-menu-item submenu-item">
    ← /admin/logs
    <button className="user-menu-item submenu-item">
      ← /admin/metrics
      <button className="user-menu-item submenu-item">
        ← /admin/permissions
      </button>
    </button>
  </button>
</button>
```

**Cas borderline** : ces boutons sont des items de navigation dans un menu dropdown avec icône + texte + chevron. Button supporte `className` et `children`, donc la migration est techniquement faisable, mais le pattern icon+accordion est spécialisé. Usage correct de `aria-expanded`.

#### 🟡 ChildProfileSelector.tsx — boutons multiples

**Fichier** : `src/components/features/child-profile/ChildProfileSelector.tsx`

Contient deux sous-composants distincts :

- `ProfileCard` : utilise `<button aria-pressed={isActive} disabled={isLocked}>` — sémantique **toggle**, Button ne gère pas `aria-pressed`. **Justifié**.
- `CreateProfileForm` : utilise `<button type="submit">` et `<button type="button">` pour Créer/Annuler. Pourrait utiliser `<Button type="submit">` et `<Button variant="secondary">`. Aussi `<input type="text">` brut à la place de `<Input>`.

### Verdict

🔴 **Consolidation nécessaire** pour CookieBanner + CookiePreferences (classes CSS identiques à Button, divergence garantie à terme)
🟡 **Borderline justifié** pour AdminMenuItem (navigation spécialisée) et ChildProfileSelector/ProfileCard (aria-pressed)
🟡 **Migration recommandée** pour PortailRGPD et CreateProfileForm

---

## 2. Inputs / Formulaires

### Primitives trouvées

| Composant             | Chemin                                                                | Props clés                                                                             | Call sites                                          |
| --------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `Input`               | `src/components/ui/input/Input.tsx`                                   | extend `HTMLInputAttributes`, `id`, `label`, `value`, `onChange`, `error`, `className` | 8+ (directs)                                        |
| `InputWithValidation` | `src/components/shared/input-with-validation/InputWithValidation.tsx` | `id`, `value`, `onValid`, `rules` (ValidationRule[]), `ariaLabel`, `label`, `type`     | 6+ (DeleteProfile, ModalCategory, DeleteAccount...) |
| `Select`              | `src/components/ui/select/Select.tsx`                                 | `id`, `label`, `value`, `onChange`, `options`, `error`, `placeholder`, `disabled`      | 3+                                                  |

`InputWithValidation` enroule correctement `Input` — composition propre.

### Usages inline sans primitive

#### 🟡 Metrics.tsx — 1 input brut (admin)

**Fichier** : `src/page-components/admin/metrics/Metrics.tsx`

Crée un `<input type="text">` brut pour la recherche par UUID. Page admin uniquement, impact faible.

#### 🟡 ChildProfileSelector.tsx — input brut dans micro-formulaire

**Fichier** : `src/components/features/child-profile/ChildProfileSelector.tsx` (sous-composant `CreateProfileForm`, l. 129)

Utilise `<input type="text">` avec `autoFocus`, `maxLength`, classes custom. Cas borderline — c'est un micro-formulaire inline avec UX très spécifique.

#### 🟡 CookiePreferences.tsx — checkbox brut

**Fichier** : `src/components/features/consent/CookiePreferences.tsx` (l. 179)

```html
<input type="checkbox" id="necessary-cookies" checked="{true}" disabled />
```

Cas particulier : case à cocher **toujours cochée et désactivée** (cookies nécessaires). Pourrait utiliser `<Checkbox checked disabled>` mais l'impact est cosmétique.

### Verdict

✅ Architecture Input/InputWithValidation/Select correctement utilisée dans l'ensemble
🟡 3 usages inline mineurs (Metrics admin, CreateProfileForm, nécessary checkbox) — impact faible

---

## 3. Modals / Dialogs

### Primitives trouvées

| Composant | Chemin                                  | Props clés                                                                                                                        | Call sites |
| --------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `Modal`   | `src/components/shared/modal/Modal.tsx` | `isOpen`, `onClose`, `title`, `children`, `actions` (ModalAction[]), `size`, `closeOnOverlay`, `closeOnEscape`, `showCloseButton` | 9+         |

### Variantes spécialisées (composées sur Modal)

| Composant              | Usage                          | Justification                                 |
| ---------------------- | ------------------------------ | --------------------------------------------- |
| `ModalConfirm`         | Confirmations génériques       | Pattern confirm/cancel commun                 |
| `ModalCategory`        | Gestion catégories             | Métier spécifique avec CRUD inline            |
| `PersonalizationModal` | Invite abonnement visitor/free | Message contextuel selon type user            |
| `ModalRecompense`      | Affichage récompense + son     | Animation + audio spécifiques                 |
| `ModalQuota`           | Dépassement quota              | Contenu quota + lien upgrade                  |
| `ModalAjout`           | Ajout tâche/récompense         | Formulaire + catégories + upload              |
| `DeleteProfileModal`   | Suppression profil enfant      | Mot-clé "SUPPRIMER" + purge avatar Storage    |
| `DeleteAccountModal`   | Suppression compte utilisateur | 2 phases : réauth + Edge Function + Turnstile |
| `CreateBankCardModal`  | Création carte banque (admin)  | Upload image + validation admin               |

### Analyse DeleteProfileModal vs DeleteAccountModal

**Ces deux composants ne sont PAS des doublons**, contrairement à une analyse rapide. Différences structurelles :

| Critère      | DeleteProfileModal              | DeleteAccountModal                                     |
| ------------ | ------------------------------- | ------------------------------------------------------ |
| Complexité   | Simple                          | Complexe (2 phases)                                    |
| Confirmation | Mot-clé "SUPPRIMER"             | Mot-clé + mot de passe + Turnstile CAPTCHA             |
| Action       | `onConfirm(profileId)` callback | Edge Function `delete-account` + signOut + router.push |
| Avatar       | Purge Storage (non-bloquante)   | Rien                                                   |
| I18n         | Partiel                         | Complet (langue dynamique)                             |
| État interne | 2 états                         | 7 états (phases, tokens, widgetKey...)                 |

**Verdict** : séparation correcte et justifiée.

### Verdict global Modals

✅ **Architecture excellente** — Modal est une primitive solide, toutes les variantes la réutilisent correctement. Aucun doublon fonctionnel.

---

## 4. Loaders / Skeletons

### Primitives trouvées

| Composant              | Chemin                                                                 | Props               | Call sites                             |
| ---------------------- | ---------------------------------------------------------------------- | ------------------- | -------------------------------------- |
| `Loader`               | `src/components/ui/loader/Loader.tsx`                                  | Aucune              | 2 (GlobalLoader, InitializationLoader) |
| `GlobalLoader`         | `src/components/shared/global-loader/GlobalLoader.tsx`                 | `message?` (string) | 1 (LoadingContext)                     |
| `InitializationLoader` | `src/components/shared/initialization-loader/InitializationLoader.tsx` | `children`          | 1 (providers.tsx)                      |

Composition correcte : GlobalLoader enroule Loader + texte de message.

### Usage inline sans primitive

#### 🟡 ChildProfileSelector.tsx — loader custom 3 dots

**Fichier** : `src/components/features/child-profile/ChildProfileSelector.tsx` (l. 190-203)

```tsx
<div className="child-profile-selector__loading">
  <span className="child-profile-selector__dot" aria-hidden="true" />
  <span className="child-profile-selector__dot" aria-hidden="true" />
  <span className="child-profile-selector__dot" aria-hidden="true" />
  <span className="sr-only">Chargement en cours</span>
</div>
```

Reproduit une animation 3 dots à la place d'importer `Loader`. L'accessibilité est gérée (aria-hidden + sr-only), mais la cohérence visuelle n'est pas garantie si Loader évolue.

### Verdict

🟡 **Un seul cas** de loader custom. ChildProfileSelector pourrait importer `Loader` mais le wrapper avec `child-profile-selector__loading` pour le contexte est discutable (le Loader est placé dans un conteneur avec le contexte aria correct).

---

## 5. Toasts / Banners

### Primitives trouvées

| Composant             | Chemin                                                                | Props                        | Pattern                                      |
| --------------------- | --------------------------------------------------------------------- | ---------------------------- | -------------------------------------------- |
| `Toast`               | `src/components/ui/toast/Toast.tsx`                                   | `message`, `type`, `visible` | Géré via ToastContext — 0 call sites directs |
| `OfflineBanner`       | `src/components/shared/offline-banner/OfflineBanner.tsx`              | `pendingCount?`              | Bandeau persistant offline (§S8)             |
| `ExecutionOnlyBanner` | `src/components/shared/execution-only-banner/ExecutionOnlyBanner.tsx` | Aucune                       | Bandeau persistant downgrade (§S9)           |

### Analyse OfflineBanner vs ExecutionOnlyBanner

Structure similaire (`role="status"`, `aria-live="polite"`, icône + message), mais sémantique et contenu distincts :

| Critère     | OfflineBanner                            | ExecutionOnlyBanner                       |
| ----------- | ---------------------------------------- | ----------------------------------------- |
| Déclencheur | `isOnline === false`                     | `isExecutionOnly === true`                |
| Contenu     | Message hors connexion + sync en attente | Message + Link vers `/profil#abonnement`  |
| Cause       | Réseau                                   | Plan utilisateur                          |
| Section     | Édition uniquement                       | Édition uniquement (même contrainte §6.2) |

Une unification en composant `Banner` générique est envisageable (et serait utile si d'autres banners apparaissent), mais ce n'est pas une urgence — les deux composants sont petits et bien documentés.

### Verdict

✅ **Aucun doublon critique.** La séparation est justifiée par la sémantique différente.
🟡 **Opportunité future** : `Banner` générique si d'autres banners persistants apparaissent.

---

## 6. Cards / Conteneurs

### Primitives trouvées

| Composant     | Chemin                                                    | Rôle                                                     | Call sites               |
| ------------- | --------------------------------------------------------- | -------------------------------------------------------- | ------------------------ |
| `BaseCard`    | `src/components/shared/card/base-card/BaseCard.tsx`       | Primitive slot-based (imageSlot/contentSlot/actionsSlot) | 1-3 (pattern)            |
| `EditionCard` | `src/components/shared/card/edition-card/EditionCard.tsx` | Carte métier (édition)                                   | CardsEdition, ModalAjout |
| `TableauCard` | `src/components/shared/card/tableau-card/TableauCard.tsx` | Carte métier (tableau exécution)                         | Tableau, TachesDnd       |

Architecture en couches correcte : `BaseCard` → `EditionCard`/`TableauCard`.

### Verdict

✅ **Architecture solide**. Aucun doublon. La séparation BaseCard (primitive) / cartes métier (composition) est bien respectée.

---

## 7. Toggles / Switches / Checkboxes

### Primitives trouvées

| Composant     | Chemin                                               | Props                                                                              | Call sites                       |
| ------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| `Checkbox`    | `src/components/ui/checkbox/Checkbox.tsx`            | extend `HTMLInputAttributes`, `id`, `label`, `checked`, `onChange`, `size` (sm/md) | 5+                               |
| `Toggle`      | `src/components/ui/toggle/Toggle.tsx`                | `checked`, `onChange`, `aria-label`, `disabled`, `id`, `className`                 | 1 (EditionCard toggle "publier") |
| `ThemeToggle` | `src/components/shared/theme-toggle/ThemeToggle.tsx` | Aucune (état interne)                                                              | Navbar, UserMenu                 |

### Verdict

✅ **Aucun doublon**. Checkbox et Toggle sont sémantiquement distincts. ThemeToggle est un composant métier autonome.
🟡 Toggle peu utilisé (1 call site) — sa pertinence à long terme dépend des futurs besoins.

---

## Synthèse globale

### Tableau récapitulatif

| Catégorie      | Primitives                                 | Doublons                                                                            | Action                |
| -------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------- |
| Boutons        | Button, ButtonClose, ButtonDelete          | 🔴 CookieBanner + CookiePreferences : classes CSS identiques à Button créées en raw | **Migrer**            |
| Inputs         | Input, InputWithValidation, Select         | 🟡 Metrics (admin), ChildProfileSelector (micro-form)                               | Migration recommandée |
| Modals         | Modal + 8 variantes                        | ✅ Aucun (DeleteProfile ≠ DeleteAccount, logiques très différentes)                 | —                     |
| Loaders        | Loader, GlobalLoader, InitializationLoader | 🟡 ChildProfileSelector : loader custom 3 dots                                      | Migration recommandée |
| Toasts/Banners | Toast, OfflineBanner, ExecutionOnlyBanner  | ✅ Distincts et justifiés                                                           | —                     |
| Cards          | BaseCard + 2 variantes métier              | ✅ Architecture correcte                                                            | —                     |
| Toggles        | Checkbox, Toggle                           | ✅ Aucun doublon                                                                    | —                     |

---

## Liste ordonnée des consolidations recommandées

### P1 — CookieBanner.tsx + CookiePreferences.tsx → Button

**Priorité** : Haute
**Effort** : S (Small)
**Risque** : Faible
**Fichiers impactés** : 2
**Raison** : Ces fichiers utilisent exactement les classes CSS du composant Button (`btn`, `btn-secondary`, `btn-outline`) mais sans passer par la primitive. Toute évolution de Button (nouvelles props aria, état isLoading) ne sera pas propagée.

Pour CookiePreferences, le bouton fermer devrait aussi utiliser `ButtonClose` (props `onClick` + `ariaLabel`).

---

### P2 — PortailRGPD.tsx → Button

**Priorité** : Moyenne
**Effort** : S
**Risque** : Faible
**Fichiers impactés** : 1
**Raison** : 4 `<button>` bruts pour des actions importantes (export RGPD, rectification, suppression, consentements). L'utilisation de Button avec `variant="danger"` pour la suppression améliorerait la cohérence visuelle et l'accessibilité.

---

### P3 — ChildProfileSelector.tsx > CreateProfileForm → Button + Input

**Priorité** : Moyenne
**Effort** : S
**Risque** : Faible
**Fichiers impactés** : 1 (sous-composant interne)
**Raison** : Le bouton submit et le bouton annuler de `CreateProfileForm` correspondent exactement aux variantes `Button` primary/secondary. L'`<input>` brut pourrait utiliser `Input` primitive.

Note : `ProfileCard` (avec `aria-pressed`) reste justifié en `<button>` brut — Button ne gère pas `aria-pressed`.

---

### P4 — Metrics.tsx → Input

**Priorité** : Faible (page admin)
**Effort** : XS
**Risque** : Très faible
**Fichiers impactés** : 1
**Raison** : Page admin, un seul `<input>` de recherche. Migration simple et sans impact utilisateur.

---

### P5 — ChildProfileSelector.tsx loader custom → Loader

**Priorité** : Faible
**Effort** : S
**Risque** : Faible
**Fichiers impactés** : 1
**Raison** : Le loader 3 dots inline duplique la logique de `Loader.tsx`. Risque de désynchro visuelle si l'animation Loader évolue. Cependant, le contexte aria (`aria-busy` sur le conteneur parent) est déjà correctement géré.

---

### P6 — OfflineBanner + ExecutionOnlyBanner → Banner générique (optionnel)

**Priorité** : Très faible (refactoring préventif)
**Effort** : M
**Risque** : Moyen (structure SCSS et sémantique à préserver)
**Fichiers impactés** : 2 + imports
**Raison** : Les deux banners ont la même structure (`role="status"`, `aria-live`, icône + message). Une primitive `Banner` avec `type` + `icon` + `children` + `action?` serait utile si d'autres banners apparaissent. Pas urgent — les deux composants sont petits (~60 lignes chacun) et bien documentés.

**Ne pas faire sans besoin réel** — éviter la sur-abstraction.

---

## Composants avec appels limités (surveillance)

| Composant     | Call sites               | Commentaire                                 |
| ------------- | ------------------------ | ------------------------------------------- |
| `ButtonClose` | 1 (Modal.tsx uniquement) | Normal — spécialisé pour fermer les modales |
| `Toggle`      | 1 (EditionCard)          | Peu utilisé mais distinct de Checkbox       |
| `ThemeToggle` | 2 (Navbar, UserMenu)     | Composant métier autonome — pas de problème |

---

## Ce qui fonctionne bien

- ✅ **Modal** : architecture exemplaire avec primitive solide + variantes composées
- ✅ **Button** : bien utilisé dans l'ensemble du projet, variants clairs
- ✅ **Input + InputWithValidation** : composition correcte, pas de duplication
- ✅ **BaseCard → EditionCard / TableauCard** : séparation primitive/métier respectée
- ✅ **Toasts via Context** : pattern centralisé propre

## Ce qui nécessite attention

- 🔴 **CookieBanner + CookiePreferences** : synchronisation CSS avec Button rompue
- 🟡 **PortailRGPD, ChildProfileSelector** : usages inline sans raison technique impérieuse
