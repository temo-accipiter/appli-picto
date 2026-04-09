# Audit Edition.tsx — Analyse découpage

**Date** : 2026-04-09
**Fichier** : `src/page-components/edition/Edition.tsx`
**Taille** : 819 lignes de code (820 avec le retour final)
**Statut** : Lecture seule — ZÉRO modification

---

## Résumé exécutif

> Les 841 lignes ne viennent **pas** d'un JSX trop long — le `return()` est étonnamment court (205 lignes). Le poids vient de la **logique admin cartes de banque** (~350 lignes de handlers + states) qui coexiste avec la logique cartes personnelles. Le découpage le plus rentable est un **hook `useAdminBankCardActions`**, pas une factorisation de JSX.

---

## Section 1 — Hooks appelés

### Contextes (4)

| Ligne | Hook                | Extrait | Produit                       |
| ----- | ------------------- | ------- | ----------------------------- |
| 83    | `useI18n()`         | —       | `t` — fonction de traduction  |
| 84    | `useToast()`        | —       | `show` — afficher toasts      |
| 85    | `useAuth()`         | —       | `user` — utilisateur connecté |
| 118   | `useChildProfile()` | —       | `activeChildId`, `isVisitor`  |
| 175   | `useOffline()`      | —       | `isOnline`                    |

### Hooks custom (6)

| Ligne | Hook                    | Extrait                | Produit                                                                 |
| ----- | ----------------------- | ---------------------- | ----------------------------------------------------------------------- |
| 135   | `useCategories(reload)` | —                      | `categories`, `addCategory`, `deleteCategory`                           |
| 136   | `usePersonalCards()`    | —                      | `cards`, `createCard`, `updateCard`, `updateCardCategory`, `deleteCard` |
| 140   | `useAccountStatus()`    | —                      | `isAdmin`, `isFree`                                                     |
| 144   | `useAdminBankCards()`   | Conditionnel `isAdmin` | `updateBankCardName`, `deleteBankCard`, `updateBankCardPublished`       |
| 176   | `useExecutionOnly()`    | —                      | `isExecutionOnly`                                                       |

### useState (11 états)

| Ligne   | State                     | Valeur initiale | Rôle                                                          |
| ------- | ------------------------- | --------------- | ------------------------------------------------------------- |
| 90      | `manageCatOpen`           | `false`         | Ouverture ModalCategory                                       |
| 91      | `catASupprimer`           | `null`          | Catégorie ciblée pour suppression                             |
| 92      | `newCatLabel`             | `''`            | Texte saisie nouvelle catégorie                               |
| 93      | `cardASupprimer`          | `null`          | Carte personnelle ciblée pour suppression                     |
| 94      | `reload`                  | `0`             | Trigger rechargement catégories/cartes                        |
| 95      | `filterCategory`          | `'all'`         | Filtre catégorie actif                                        |
| 96      | `isSubmittingCategory`    | `false`         | Guard double-submit ajout catégorie                           |
| 98      | `showCreateBankCardModal` | `false`         | Ouverture modal création carte banque                         |
| 100     | `showCardQuotaModal`      | `false`         | Ouverture modal quota stock                                   |
| 102–106 | `bankCardToRename`        | `null`          | Données carte banque à renommer `{id, oldName, newName}`      |
| 107–110 | `bankCardToDelete`        | `null`          | Données carte banque à supprimer `{id, name}`                 |
| 111–115 | `bankCardToTogglePublish` | `null`          | Données carte banque à (dé)publier `{id, name, newPublished}` |

### useEffect (1)

| Lignes  | Dépendances       | Comportement                                                                                                                                          |
| ------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 120–129 | `[activeChildId]` | Compare `prevChildIdRef.current` à `activeChildId` — incrémente `reload` si changement d'enfant actif. Ignore le montage initial (guard `undefined`). |

### useMemo (4)

| Ligne | Variable              | Dépendances               | Produit                                                                     |
| ----- | --------------------- | ------------------------- | --------------------------------------------------------------------------- |
| 159   | `bankCardsForDisplay` | `[rawBankCards]`          | Mapping `rawBankCards → {id, name, image_url, published}`                   |
| 183   | `uniqueCategories`    | `[categories]`            | Déduplique et formate `{value, label}`                                      |
| 196   | `systemCategoryId`    | `[categories]`            | `id` de la catégorie système                                                |
| 322   | `lockedCardIds`       | `[session?.state, slots]` | `Set<string>` des cartes dans des slots étape actifs (verrouillage session) |

### useCallback (1)

| Ligne | Fonction                     | Dépendances                                          |
| ----- | ---------------------------- | ---------------------------------------------------- |
| 390   | `handleToggleCardInTimeline` | `[timeline, slots, updateSlot, show, lockedCardIds]` |

### useRef (1)

| Ligne | Ref              | Rôle                                                                |
| ----- | ---------------- | ------------------------------------------------------------------- |
| 119   | `prevChildIdRef` | Mémorise le `activeChildId` précédent pour détecter les changements |

---

## Section 2 — Blocs JSX du return()

Le `return()` s'étend de la **ligne 614 à 819**. Il contient **9 blocs distincts**.

---

### Bloc A — CardsEdition (lignes 619–666)

**Rôle** : Composant principal — bibliothèque de cartes (perso + banque).

**States consommés** :

- `visibleCards` (computed de `cards` + `filterCategory`)
- `categories`
- `filterCategory` / `setFilterCategory`
- `isSubmittingCategory`
- `systemCategoryId`
- `checkboxDisabled` (computed de `isOnline` + `isExecutionOnly`)
- `lockedCardIds`
- `bankCardsForDisplay`
- `isAdmin`, `isVisitor`, `isFree`

**Handlers consommés** :

- `handleSubmitCard`
- `handleShowCardQuotaModal`
- `handleAddCategoryWithQuota`
- `handleDeleteCategory`
- `handleUpdateLabel`
- `handleUpdateCategorie`
- `setCardASupprimer` (inline `c => setCardASupprimer(c)`)
- `handleToggleCardInTimeline`
- `handleCreateBankCard` (admin uniquement)
- `handleUpdateBankCardName` (admin uniquement)
- `handleDeleteBankCard` (admin uniquement)
- `handleUpdateBankCardPublished` (admin uniquement)

**Dépendances inter-blocs** : Déclenche l'ouverture de TOUS les autres blocs (modales) via les handlers ci-dessus.

---

### Bloc B — ModalConfirm suppression carte personnelle (lignes 669–692)

**Rôle** : Demande de confirmation avant `deleteCard`.

| Element                  | Valeur                                          |
| ------------------------ | ----------------------------------------------- |
| Condition d'ouverture    | `!!cardASupprimer`                              |
| State lu                 | `cardASupprimer`                                |
| States modifiés          | `setCardASupprimer(null)`                       |
| Callbacks                | `deleteCard`, `refreshSlots`, `show`, `t`       |
| Dépendances autres blocs | Déclenché via `setCardASupprimer` depuis Bloc A |

---

### Bloc C — ModalCategory + ModalConfirm suppression catégorie (lignes 694–723)

**Rôle** : Gestion des catégories (ajout + suppression confirmation).

Contient **deux modales** dans un seul `<Suspense>` :

**ModalCategory** :

| Element               | Valeur                                                   |
| --------------------- | -------------------------------------------------------- |
| Condition d'ouverture | `manageCatOpen`                                          |
| States lus            | `uniqueCategories`, `newCatLabel`                        |
| States modifiés       | `setManageCatOpen`, `setCatASupprimer`, `setNewCatLabel` |
| Callbacks             | `handleAddCategoryWithQuota`                             |

**ModalConfirm catégorie** :

| Element               | Valeur                              |
| --------------------- | ----------------------------------- |
| Condition d'ouverture | `!!catASupprimer`                   |
| States lus            | `catASupprimer`, `uniqueCategories` |
| States modifiés       | `setCatASupprimer(null)`            |
| Callbacks             | `handleRemoveCategory`, `t`         |

⚠️ Note : `manageCatOpen` est défini mais **jamais mis à `true`** dans le fichier — `ModalCategory` reste toujours fermée. C'est une **anomalie** (bouton déclencheur manquant ou supprimé).

---

### Bloc D — CreateBankCardModal (lignes 725–734)

**Rôle** : Modal création carte de banque (admin uniquement).

| Element               | Valeur                              |
| --------------------- | ----------------------------------- |
| Condition d'ouverture | `showCreateBankCardModal`           |
| States modifiés       | `setShowCreateBankCardModal(false)` |
| Callbacks             | `handleBankCardCreated`             |
| Admin-only            | oui                                 |

---

### Bloc E — ModalConfirm renommage carte banque (lignes 736–753)

**Rôle** : Confirmation avant modification du nom d'une carte de banque.

| Element               | Valeur                      |
| --------------------- | --------------------------- |
| Condition d'ouverture | `!!bankCardToRename`        |
| States lus            | `bankCardToRename`          |
| States modifiés       | `setBankCardToRename(null)` |
| Callbacks             | `confirmUpdateBankCardName` |
| Admin-only            | oui                         |

---

### Bloc F — ModalConfirm suppression carte banque (lignes 756–775)

**Rôle** : Confirmation avant suppression d'une carte de banque.

| Element               | Valeur                      |
| --------------------- | --------------------------- |
| Condition d'ouverture | `!!bankCardToDelete`        |
| States lus            | `bankCardToDelete`          |
| States modifiés       | `setBankCardToDelete(null)` |
| Callbacks             | `confirmDeleteBankCard`     |
| Admin-only            | oui                         |

---

### Bloc G — ModalConfirm publication carte banque (lignes 778–803)

**Rôle** : Confirmation avant (dé)publication d'une carte de banque.

| Element               | Valeur                             |
| --------------------- | ---------------------------------- |
| Condition d'ouverture | `!!bankCardToTogglePublish`        |
| States lus            | `bankCardToTogglePublish`          |
| States modifiés       | `setBankCardToTogglePublish(null)` |
| Callbacks             | `confirmUpdateBankCardPublished`   |
| Admin-only            | oui                                |

---

### Bloc H — ModalQuota (lignes 806–815)

**Rôle** : Affiche la limite de stock de cartes personnelles.

| Element               | Valeur                             |
| --------------------- | ---------------------------------- |
| Condition d'ouverture | `showCardQuotaModal`               |
| States lus            | `cards.length`, `CARD_STOCK_LIMIT` |
| States modifiés       | `setShowCardQuotaModal(false)`     |
| Admin-only            | non                                |

---

## Section 3 — Fonctions et handlers

### Utilitaire interne

| Ligne | Nom               | States lus | States modifiés | Blocs consommateurs   |
| ----- | ----------------- | ---------- | --------------- | --------------------- |
| 131   | `triggerReload()` | —          | `reload` (+1)   | appelé par 4 handlers |

---

### Domaine : cartes personnelles

| Ligne | Nom                                            | States lus                           | States modifiés             | Blocs consommateurs                    |
| ----- | ---------------------------------------------- | ------------------------------------ | --------------------------- | -------------------------------------- |
| 201   | `handleCardAjoutee()`                          | —                                    | — (appelle `triggerReload`) | appelé par `handleSubmitCard`          |
| 205   | `handleShowCardQuotaModal(_type)`              | `cards.length`                       | `showCardQuotaModal`        | Bloc A (prop `onShowQuotaModal`)       |
| 213   | `handleSubmitCard({label, imagePath, cardId})` | `user`                               | —                           | Bloc A (prop `onSubmitCard`)           |
| 340   | `handleDeleteCategory(value)`                  | —                                    | — (wrapper cast)            | Bloc A (prop `onDeleteCategory`)       |
| 346   | `handleUpdateCategorie(id, categoryId)`        | `systemCategoryId`                   | —                           | Bloc A (prop `onUpdateCategorie`)      |
| 370   | `handleUpdateLabel(id, label)`                 | —                                    | —                           | Bloc A (prop `onUpdateLabel`)          |
| 390   | `handleToggleCardInTimeline(cardId, checked)`  | `timeline`, `slots`, `lockedCardIds` | —                           | Bloc A (prop `onToggleCardInTimeline`) |

---

### Domaine : catégories

| Ligne | Nom                                     | States lus                            | States modifiés                               | Blocs consommateurs |
| ----- | --------------------------------------- | ------------------------------------- | --------------------------------------------- | ------------------- |
| 271   | `handleAddCategoryWithQuota(e, label?)` | `newCatLabel`, `isSubmittingCategory` | `isSubmittingCategory`, `newCatLabel`         | Blocs A et C        |
| 312   | `handleRemoveCategory(value)`           | —                                     | — (appelle `deleteCategory`, `triggerReload`) | Bloc C              |

---

### Domaine : cartes de banque (admin)

| Ligne | Nom                                               | States lus                | States modifiés                    | Blocs consommateurs |
| ----- | ------------------------------------------------- | ------------------------- | ---------------------------------- | ------------------- |
| 456   | `handleCreateBankCard()`                          | `isAdmin`                 | `showCreateBankCardModal`          | Bloc A (admin)      |
| 464   | `handleBankCardCreated()`                         | —                         | `showCreateBankCardModal`          | Bloc D              |
| 472   | `handleUpdateBankCardName(id, newName)`           | `isAdmin`, `rawBankCards` | `bankCardToRename`                 | Bloc A (admin)      |
| 495   | `confirmUpdateBankCardName()`                     | `bankCardToRename`        | `bankCardToRename` → `null`        | Bloc E              |
| 518   | `handleDeleteBankCard(id, name)`                  | `isAdmin`                 | `bankCardToDelete`                 | Bloc A (admin)      |
| 529   | `confirmDeleteBankCard()`                         | `bankCardToDelete`        | `bankCardToDelete` → `null`        | Bloc F              |
| 566   | `handleUpdateBankCardPublished(id, newPublished)` | `isAdmin`, `rawBankCards` | `bankCardToTogglePublish`          | Bloc A (admin)      |
| 588   | `confirmUpdateBankCardPublished()`                | `bankCardToTogglePublish` | `bankCardToTogglePublish` → `null` | Bloc G              |

---

## Section 4 — Faisabilité du découpage

### 4.1 Carte des couplages

```
Edition.tsx
├── DOMAINE CARTES PERSO (states + handlers)
│   ├── cardASupprimer ←→ Bloc B
│   ├── showCardQuotaModal ←→ Bloc H
│   ├── filterCategory ←→ Bloc A
│   ├── reload ←→ useCategories
│   ├── newCatLabel, manageCatOpen, catASupprimer ←→ Bloc C
│   └── handlers: handleSubmitCard, handleToggleCardInTimeline, ...
│
└── DOMAINE CARTES BANQUE ADMIN (states + handlers)
    ├── showCreateBankCardModal ←→ Bloc D
    ├── bankCardToRename ←→ Bloc E
    ├── bankCardToDelete ←→ Bloc F
    ├── bankCardToTogglePublish ←→ Bloc G
    └── handlers: handleCreate/Update/Delete BankCard, confirm*
```

Les deux domaines partagent **uniquement** : `show`, `refreshBankCards`, `rawBankCards`, `isAdmin`.

---

### 4.2 Blocs autonomes (faibles dépendances)

| Bloc                          | Autonomie | Raison                                                                           |
| ----------------------------- | --------- | -------------------------------------------------------------------------------- |
| D, E, F, G (modales admin)    | ✅ Haute  | Chacun dépend de 1 state + 1 handler. Regroupables dans `<AdminBankCardModals>`. |
| B (confirm suppression carte) | ✅ Haute  | 2 states, 2 callbacks. Facile à isoler.                                          |
| H (ModalQuota)                | ✅ Haute  | 1 state + 2 valeurs.                                                             |

---

### 4.3 Blocs fortement couplés

| Bloc              | Couplage     | Raison                                                                                     |
| ----------------- | ------------ | ------------------------------------------------------------------------------------------ |
| A (CardsEdition)  | 🔴 Très fort | 20+ props. Reçoit et déclenche tout. Impossible à extraire sans extraire aussi sa logique. |
| C (ModalCategory) | 🟡 Moyen     | 5 states/handlers. Extractible avec 5 props.                                               |

---

### 4.4 Risque de prop drilling

Le Bloc A (`<CardsEdition>`) reçoit déjà **22 props**. Tout découpage qui ajoute un niveau de composant intermédiaire (ex. `<EditionCardsSection>`) ne fait que déplacer le problème — les 22 props doivent quand même transiter.

Conclusion : **Le JSX n'est pas le problème**. La factorisation JSX apporterait de la complexité sans gain de maintenabilité.

---

### 4.5 Découpage recommandé — Hook `useAdminBankCardActions`

**Périmètre** : Toute la logique des cartes de banque admin.

**Ce que le hook encapsule** :

```typescript
// Signature suggérée
function useAdminBankCardActions({
  isAdmin,
  rawBankCards,
  refreshBankCards,
  show,
}: AdminBankCardActionsOptions) {
  // States (4 useState admin)
  const [showCreateBankCardModal, setShowCreateBankCardModal] = useState(false)
  const [bankCardToRename, setBankCardToRename] = useState(null)
  const [bankCardToDelete, setBankCardToDelete] = useState(null)
  const [bankCardToTogglePublish, setBankCardToTogglePublish] = useState(null)

  // Handlers (8 fonctions)
  // handleCreateBankCard, handleBankCardCreated
  // handleUpdateBankCardName, confirmUpdateBankCardName
  // handleDeleteBankCard, confirmDeleteBankCard
  // handleUpdateBankCardPublished, confirmUpdateBankCardPublished

  return { states..., handlers... }
}
```

**Gains** :

| Métrique                | Avant | Après                      |
| ----------------------- | ----- | -------------------------- |
| Lignes Edition.tsx      | 841   | ~490                       |
| `useState` dans Edition | 12    | 8                          |
| Handlers dans Edition   | 19    | 11                         |
| Lignes admin bank card  | ~350  | ~10 (import + destructure) |

**Risques** : Faibles. Le hook dépend uniquement de 4 valeurs externes (`isAdmin`, `rawBankCards`, `refreshBankCards`, `show`) — pas de prop drilling créé.

---

### 4.6 Découpage secondaire — `<AdminBankCardModals>`

Si le hook est extrait, les blocs D/E/F/G peuvent être groupés dans un composant unique :

```tsx
<AdminBankCardModals
  showCreateBankCardModal={showCreateBankCardModal}
  onCloseCreate={() => setShowCreateBankCardModal(false)}
  onBankCardCreated={handleBankCardCreated}
  bankCardToRename={bankCardToRename}
  onCloseRename={() => setBankCardToRename(null)}
  onConfirmRename={confirmUpdateBankCardName}
  bankCardToDelete={bankCardToDelete}
  onCloseDelete={() => setBankCardToDelete(null)}
  onConfirmDelete={confirmDeleteBankCard}
  bankCardToTogglePublish={bankCardToTogglePublish}
  onCloseToggle={() => setBankCardToTogglePublish(null)}
  onConfirmToggle={confirmUpdateBankCardPublished}
/>
```

Ce composant serait **conditionnel** (`isAdmin && <AdminBankCardModals ...>`). Les 12 props sont acceptables car il remplace 4 blocs JSX séparés.

---

### 4.7 Ce qui ne doit PAS être découpé

| Découpage            | Raison du refus                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `EditionHeader.tsx`  | Il n'y a pas de header dans Edition.tsx (pas de JSX titre/infos timeline). Le DIAGNOSTIC était basé sur une hypothèse incorrecte. |
| `EditionCards.tsx`   | `<CardsEdition>` EST déjà un composant séparé. Ajouter un wrapper `<EditionCards>` n'apporterait qu'une indirection inutile.      |
| `EditionActions.tsx` | Il n'y a pas de boutons d'actions (reset/save) dans Edition.tsx. Idem — hypothèse du DIAGNOSTIC non vérifiée.                     |

> ⚠️ Le découpage en `EditionHeader/Cards/Actions` suggéré dans le DIAGNOSTIC ne correspond pas à la structure réelle du fichier. Le return() contient un seul composant métier (`<CardsEdition>`) + des modales, pas 3 sections distinctes.

---

### 4.8 Anomalie détectée : `manageCatOpen` jamais mis à `true`

`useState(false)` défini ligne 90, passé à `<ModalCategory isOpen={manageCatOpen}>`, mais **aucun appel à `setManageCatOpen(true)`** dans le fichier. La `ModalCategory` ne peut pas s'ouvrir. Le bouton déclencheur a probablement été supprimé lors d'une refonte UI. **À investiguer** avant tout découpage.

---

## Synthèse

| Question                               | Réponse                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| Blocs JSX autonomes ?                  | D, E, F, G (modales admin) + B + H — regroupables si hook admin extrait               |
| Blocs fortement couplés ?              | A (CardsEdition) — inextricable sans restructuration majeure                          |
| Risque prop drilling ?                 | Faible si hook custom (pas de composant wrapper intermédiaire)                        |
| Découpage apporte gain réel ?          | **OUI** — uniquement via `useAdminBankCardActions` (−350 lignes, séparation domaines) |
| Découpage JSX (Header/Cards/Actions) ? | **NON** — structure JSX ne correspond pas à ces découpes hypothétiques                |

---

## Plan de découpage recommandé (si décidé)

1. **Créer** `src/hooks/useAdminBankCardActions.ts` — encapsule les 4 states + 8 handlers admin
2. **Créer** (optionnel) `src/components/shared/modal/AdminBankCardModals.tsx` — regroupe les 4 modales admin (blocs D/E/F/G)
3. **Modifier** `Edition.tsx` — importer et utiliser le hook + le composant modal
4. **Investiguer** l'anomalie `manageCatOpen` jamais ouvert

**Effort estimé** : 2–3h | **Risque** : Faible

---

_Audit statique effectué 2026-04-09 — Zéro modification de fichiers source_
