# CHANGELOG — Session de refactoring UI Kit & Architecture

**Branche** : `chore/cleanup-legacy-ux`
**Date** : 05/04/2026
**Scope** : Audit, nettoyage, unification, DRY

> Impact net : **−4 271 lignes supprimées / +522 lignes ajoutées** sur 46 fichiers.

---

## 🔴 SUPPRIMÉS — Code mort & composants obsolètes

### Composants UI

| Fichier(s)                                                              | Raison                                               |
| ----------------------------------------------------------------------- | ---------------------------------------------------- |
| `src/components/ui/select-with-image/SelectWithImage.tsx`               | Remplacé par le composant `Select` unifié (Radix UI) |
| `src/components/ui/select-with-image/SelectWithImage.scss`              | Styles migrés vers `Select.scss`                     |
| `src/components/ui/select-with-image/index.ts`                          | Barrel local supprimé avec le dossier                |
| `src/components/shared/migration-placeholder/MigrationPlaceholder.tsx`  | Composant jamais utilisé dans le code actif          |
| `src/components/shared/migration-placeholder/MigrationPlaceholder.scss` | Styles associés                                      |

### Hooks legacy (tables supprimées en S4)

| Fichier(s)                                   | Raison                                               |
| -------------------------------------------- | ---------------------------------------------------- |
| `src/hooks/useTaches.ts` + `.test.ts`        | Table `taches` supprimée en S4 — hook et tests morts |
| `src/hooks/useTachesDnd.ts` + `.test.ts`     | Dépend de `useTaches` — mort par cascade             |
| `src/hooks/useTachesEdition.ts` + `.test.ts` | Aucun import actif dans `src/`                       |
| `src/hooks/useMetrics.ts`                    | Destiné à S12 (admin dashboard), jamais implémenté   |
| `src/hooks/useFallbackData.ts`               | Hook de migration S4, jamais importé                 |

### Hooks orphelins (remplacés)

| Fichier(s)                                        | Raison                                                                                                                                                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks/useParametres.ts` + `.test.ts`         | Remplacé par `useAccountPreferences` en S11. Seul un mock orphelin dans `ToastContext.test.tsx` le référençait encore.                                                                                                      |
| `src/hooks/useSubscriptionStatus.ts` + `.test.ts` | Façade inutile sur `useAccountStatus` — tous les champs qu'il ajoutait (`isTrial`, `daysUntilExpiry`, `isExpiringSoon`, `subscription`, `currentPeriodEnd`) étaient des stubs hardcodés (`null` / `false`) jamais hydratés. |

### Références et stubs nettoyés

- Bloc commentaire `// ⛔ LEGACY — STABILIZATION PATCH avant S4` retiré de `hooks/index.ts`
- Champs stubs supprimés du JSX de `Abonnement.tsx` : bloc "Détails de l'abonnement" (toujours null), `daysUntilExpiry`, interface `SubscriptionData`, fonction `formatDate`
- Champs stubs supprimés du JSX de `Profil.tsx` : deux occurrences `daysUntilExpiry`
- Mock `useParametres` retiré de `ToastContext.test.tsx`
- Mock `useSubscriptionStatus` remplacé par `useAccountStatus` dans `Profil.test.tsx`

---

## 🟡 MODIFIÉS / UNIFIÉS — Consolidations

### `<Select>` — Unification Radix UI

**Avant** : deux composants parallèles (`Select` natif HTML + `SelectWithImage` custom).
**Après** : un seul composant `Select` (Radix UI `@radix-ui/react-select`).

- `Select.tsx` : réécrit intégralement — API `onChange: (value: string | number) => void` (plus de `ChangeEvent`)
- `Select.scss` : styles Radix-aware (`[data-highlighted]`, `[data-state='checked']`, `[data-disabled]`), 100% tokens
- `Select.test.tsx` : tests adaptés à l'API Radix (suppression `fireEvent.change` incompatible portal)
- 5 call sites migrés :
  - `TachesEdition.tsx`
  - `CardsEdition.tsx`
  - `ItemForm.tsx`
  - `EditionCard.tsx` (prop `includePlaceholder` retirée)
  - `TrainProgressBar.tsx` (import direct `select-with-image` → barrel `@/components`)
- `components/index.ts` : export `SelectOption`, `SelectProps` ajoutés

### `<Dropdown>` — Accessibilité aria-expanded

- `Dropdown.tsx` : injection de `aria-expanded` via `React.cloneElement` sur le trigger arbitraire
- `Dropdown.scss` : TODO Phase 7 documenté sur la valeur de keyframe non-tokenisable

### SCSS — Purge des valeurs hardcodées

| Fichier            | Avant                     | Après                             |
| ------------------ | ------------------------- | --------------------------------- |
| `Toggle.scss`      | `background: white`       | `background: white()`             |
| `SearchInput.scss` | `border-color: gray(300)` | `border-color: surface('border')` |
| `SearchInput.scss` | `background: gray(300)`   | `background: surface('overlay')`  |

### `hooks/index.ts` — Nettoyage complet

- Suppression de tous les exports commentés (9 lignes de commentaires LEGACY)
- Suppression de l'export `useParametres` (ligne avec commentaire `⚠️ LEGACY`)
- Suppression de l'export `useSubscriptionStatus`

### `components/index.ts` — Réparation du barrel

Trois composants utilisés en production mais absents du barrel exports, corrigés :

| Composant            | Chemin direct (avant)                                               | Via barrel (après)                                                                               |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `AdminRoute`         | `@/components/shared/admin-route/AdminRoute`                        | `@/components`                                                                                   |
| `LongPressLink`      | `@/components/shared/long-press-link/LongPressLink`                 | `@/components` (déclaré, Navbar conserve son import direct pour éviter la dépendance circulaire) |
| `ModalVisitorImport` | `@/components/shared/modal/modal-visitor-import/ModalVisitorImport` | `@/components`                                                                                   |

Fichiers mis à jour : `admin/logs/page.tsx`, `admin/metrics/page.tsx`, `admin/permissions/page.tsx`, `(protected)/layout.tsx`.

### `useAccountStatus` — Source de vérité unifiée pour le statut

- Ajout de `statusDisplay: { label, icon, color }` calculé via `useMemo` selon `accounts.status`
- Tous les consommateurs de `useSubscriptionStatus` migrés :
  - `Abonnement.tsx` : `isSubscriber as isActive` + `statusDisplay`
  - `Profil.tsx` : `isSubscriber as isActive`
  - `UserMenu.tsx` : fusion en un seul appel `useAccountStatus` (deux hooks → un)
- `hooks/CLAUDE.md` mis à jour

### `DeviceList.tsx` et `SlotsEditor.tsx` — Pattern confirmation inline

- Remplacement des `useState(null)` / `useState(false)` locaux pour la confirmation
- Intégration du hook `useInlineConfirm` (voir section AJOUTÉS)
- Correction de collision de nommage dans `DeviceList` : `isConfirming` local → `isCurrentlyConfirming`
- `SlotsEditor` : deps `useEffect` complétées avec `cancelResetConfirm` (stable via `useCallback`)

---

## 🟢 AJOUTÉS — Nouvelles briques architecturales

### `useInlineConfirm` — Hook de confirmation anti-surprise

**Fichier** : `src/hooks/useInlineConfirm.ts`
**Exporté** : `src/hooks/index.ts`

```typescript
export function useInlineConfirm() {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const requireConfirm = useCallback((id: string) => setConfirmId(id), [])
  const cancelConfirm = useCallback(() => setConfirmId(null), [])
  const isConfirming = useCallback(
    (id: string) => confirmId === id,
    [confirmId]
  )
  return { requireConfirm, cancelConfirm, isConfirming }
}
```

**Principe** : 1er clic → demande confirmation (état `confirmId`). 2e clic → exécute l'action. Toujours un bouton "Annuler" accessible. Les références sont stables (`useCallback`) pour ne pas perturber les `useEffect`.

**Utilisé par** : `DeviceList` (révocation appareil), `SlotsEditor` (réinitialisation session).

---

## 🛡️ IMPACT ARCHITECTURE & TSA

### Accessibilité (WCAG 2.2 AA)

Le remplacement de `SelectWithImage` par un composant Radix UI apporte **nativement** :
la navigation clavier complète (↑ ↓ Entrée Échap), l'attribut `aria-expanded` sur le trigger, le `role="combobox"` conforme, et le piège de focus automatique. Les enfants TSA qui utilisent des technologies d'assistance (lecteurs d'écran, navigation clavier) bénéficient d'une expérience homogène sur tous les sélecteurs de l'application.

### Prévisibilité (UX TSA)

Le pattern `useInlineConfirm` impose systématiquement une **confirmation à deux gestes** avant toute action destructrice ou irréversible (révoquer un appareil, réinitialiser une session). Cela élimine les "surprises" — principe fondamental pour les enfants TSA dont l'expérience de l'interface doit rester calme et prévisible. L'utilisateur ne peut jamais déclencher une action critique par un tap accidentel.

### Source de vérité unique

La fusion `useSubscriptionStatus → useAccountStatus` réduit la surface de bugs : un seul hook lit `accounts.status` en base. Avant, un composant pouvait utiliser l'un ou l'autre et obtenir des états légèrement différents (les stubs du hook façade retournaient toujours `null` pour `daysUntilExpiry`, ce qui masquait silencieusement l'absence de données réelles). La base de code reflète maintenant exactement ce que la DB contient.

### Dette technique

Ce refactoring supprime **4 271 lignes de code mort** qui représentaient une charge cognitive pour tout développeur lisant le projet. Les règles d'architecture (DB-first, barrel exports, tokens-first) sont désormais appliquées sans exception dans le périmètre audité.

---

## 📋 Doublons restants identifiés — Backlog

Ces doublons ont été **identifiés mais non traités** dans cette session (hors périmètre CSS-freeze) :

| Doublon                                          | Localisation                                            | Type                       | Priorité |
| ------------------------------------------------ | ------------------------------------------------------- | -------------------------- | -------- |
| Logique validation/drafts/errors                 | `TachesEdition`, `RecompensesEdition`, `CardsEdition`   | Fonctionnel                | Haute    |
| Pattern `useState + useEffect + AbortController` | `useBankCards`, `usePersonalCards`, `useAdminBankCards` | Structure hooks            | Moyenne  |
| `EditionList`                                    | `src/components/shared/edition-list/`                   | Code mort (jamais utilisé) | Basse    |

Ces points constituent les candidats naturels pour la prochaine session de refactoring.
