# Creusement des 3 infractions — preuves de code

**Date** : 2026-05-14
**Source** : AUDIT_3_SYSTEMES.md

---

## Zone 1 — SlotsEditor ↔ SequenceEditor

### 1.1 Import

**Ligne 50**

```typescript
import { SequenceEditor } from '@/components/features/sequences'
```

### 1.2 Rendu JSX de SequenceEditor

**Lignes 549–564**

```tsx
{
  resolvedActiveSequenceSlot?.card_id && (
    <Modal isOpen onClose={closeSequenceEditor} size="large">
      <SequenceEditor
        motherCardId={resolvedActiveSequenceSlot.card_id}
        motherCardLabel={activeMotherCard?.name ?? 'Carte'}
        sequence={activeSequence as Sequence | null}
        bankCards={bankCards as BankCard[]}
        personalCards={personalCards as PersonalCard[]}
        onCreateSequence={createSequence}
        onDeleteSequence={deleteSequence}
        canCreateSequence={canCreateSequence}
        creationAvailabilityLoading={sequenceCreationAvailabilityLoading}
        isReadOnly={isSequenceReadOnly}
      />
    </Modal>
  )
}
```

### 1.3 États séquence dans SlotsEditor

**Lignes 133–135**

```typescript
const [activeSequenceSlot, setActiveSequenceSlot] = useState<Slot | null>(null)
```

### 1.4 Handlers séquence dans SlotsEditor

**Lignes 389–392**

```typescript
const openSequenceEditor = useCallback((slot: Slot) => {
  if (slot.kind !== 'step' || !slot.card_id) return
  setActiveSequenceSlot(slot)
}, [])
```

**Lignes 394–396**

```typescript
const closeSequenceEditor = useCallback(() => {
  setActiveSequenceSlot(null)
}, [])
```

### 1.5 Hooks/Supabase séquence dans SlotsEditor

**Lignes 170–171**

```typescript
const { sequences, createSequence, deleteSequence, isVisitorSource } =
  useSequencesWithVisitor()
```

**Lignes 173–177** (dérivations depuis le hook)

```typescript
const canWriteCloudSequences = !isExecutionOnly
const canCreateSequence = isVisitorSource || canWriteCloudSequences
const isSequenceReadOnly = !isVisitorSource && !canWriteCloudSequences
const sequenceCreationAvailabilityLoading =
  !isVisitorSource && accountStatusLoading
```

**Lignes 434–439** (résolution activeSequence)

```typescript
const activeSequence = resolvedActiveSequenceSlot?.card_id
  ? (sequences.find(
      sequence => sequence.mother_card_id === resolvedActiveSequenceSlot.card_id
    ) ?? null)
  : null
```

### 1.6 Constat factuel

SlotsEditor possède 1 état React dédié aux séquences (`activeSequenceSlot`), 2 handlers (`openSequenceEditor`, `closeSequenceEditor`), et 1 appel au hook `useSequencesWithVisitor` qui retourne `sequences`, `createSequence`, `deleteSequence` et `isVisitorSource`. Il effectue une recherche linéaire dans `sequences` au rendu pour résoudre `activeSequence`. `SequenceEditor` reçoit 10 props au rendu.

---

## Zone 2 — SlotCard ↔ SequenceMiniTimeline

### 2.1 Import

**Ligne 29**

```typescript
import { SequenceMiniTimeline } from '@/components/features/sequences'
```

### 2.2 Rendu JSX de SequenceMiniTimeline

**Lignes 157–169**

```tsx
{
  hasSequence && (
    <SequenceMiniTimeline
      isOpen={miniTimelineOpen}
      loading={sequenceStepsLoading}
      steps={sequenceSteps}
      doneStepIds={doneStepIds}
      onToggleDone={handleToggleDone}
      bankCards={bankCards}
      personalCards={personalCards}
      onClose={() => setMiniTimelineOpen(false)}
      motherCard={card}
    />
  )
}
```

### 2.3 États séquence dans SlotCard

**Ligne 71**

```typescript
const [miniTimelineOpen, setMiniTimelineOpen] = useState(false)
```

**Ligne 72**

```typescript
const [doneStepIds, setDoneStepIds] = useState<Set<string>>(() => new Set())
```

### 2.4 Handlers séquence dans SlotCard

**Lignes 104–114**

```typescript
const handleToggleDone = useCallback((stepId: string) => {
  setDoneStepIds(prev => {
    const next = new Set(prev)
    if (next.has(stepId)) {
      next.delete(stepId)
    } else {
      next.add(stepId)
    }
    return next
  })
}, [])
```

### 2.5 Hooks/Supabase séquence dans SlotCard

Aucun élément détecté dans cette catégorie. Les données séquence (`sequenceSteps`, `hasSequence`, `sequenceStepsLoading`, `bankCards`, `personalCards`) sont reçues en props du composant parent.

### 2.6 Constat factuel

SlotCard possède 2 états React liés à la séquence (`miniTimelineOpen`, `doneStepIds`) et 1 handler (`handleToggleDone`) qui gère la progression locale des étapes. Aucun hook Supabase ni hook personnalisé de séquence n'est appelé directement. `SequenceMiniTimeline` reçoit 10 props au rendu.

---

## Zone 3 — SlotItem (7 props séquence)

### 3.1 Interface complète des props

**Total props : 25**
**Dont props séquence : 7**

**Lignes 41–125**

```typescript
interface SlotItemProps {
  slot: Slot
  /** Indice humain (position + 1) */
  positionLabel: number
  /** Modifier ce slot (card_id et/ou tokens) */
  onUpdate: (
    id: string,
    updates: { card_id?: string | null; tokens?: number | null }
  ) => Promise<{ error: Error | null }>
  /** Supprimer ce slot (peut être refusé par la DB si dernier du genre) */
  onRemove: (id: string) => void
  /** Cartes banque disponibles (transmises par SlotsEditor) */
  bankCards: BankCard[]
  /** Cartes personnelles disponibles (transmises par SlotsEditor) */
  personalCards: PersonalCard[]
  /** Opération de suppression en cours */
  busy?: boolean
  /** Afficher l'action de suppression pour ce slot */
  canRemove?: boolean
  // ── S6 : Verrouillage selon état session ──────────────────────────────────
  sessionState?: SessionState | null
  /** Ce slot a-t-il été validé dans la session en cours ? */
  isValidated?: boolean
  // ── S7 : Séquence ──────────────────────────────────────────────────────────
  sequence?: Sequence | null
  onCreateSequence?: (
    motherCardId: string,
    stepCardIds: string[]
  ) => Promise<{ id: string | null; error: Error | null }>
  onDeleteSequence?: (sequenceId: string) => Promise<{ error: Error | null }>
  canCreateSequence?: boolean
  onOpenSequenceEditor?: (slot: Slot) => void
  isSequenceEditorOpen?: boolean
  // ── S8/S9 ──────────────────────────────────────────────────────────────────
  isOffline?: boolean
  isExecutionOnly?: boolean
  /** Ticket 3 : Séquençage en lecture seule. */
  isSequenceReadOnly?: boolean
  /** Numéro de l'étape parmi les étapes uniquement */
  stepNumber?: number
  dndSlotId?: string
  isDragActive?: boolean
  setSlotRef?: (node: HTMLLIElement | null) => void
}
```

### 3.2 Usage des 7 props

| Prop                   | Ligne(s)        | Catégorie                     | Extrait                                                                                                                                           |
| ---------------------- | --------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sequence`             | 202–203, 362    | `logique` + `condition-rendu` | `const canManageSequence = isStep && slot.card_id !== null && (onCreateSequence \|\| onDeleteSequence)` — conditionne le rendu du bouton séquence |
| `onCreateSequence`     | 148, 202–203    | `logique`                     | Valeur par défaut `undefined`, présence vérifiée dans `canManageSequence`                                                                         |
| `onDeleteSequence`     | 149, 202–203    | `logique`                     | Valeur par défaut `undefined`, présence vérifiée dans `canManageSequence`                                                                         |
| `canCreateSequence`    | 150, 374        | `condition-rendu`             | `aria-label={canCreateSequence ? 'Créer une séquence' : 'Voir la séquence'}`                                                                      |
| `onOpenSequenceEditor` | 151, 363        | `transmission-pure`           | `onClick={() => onOpenSequenceEditor?.(slot)}` sur le bouton séquence                                                                             |
| `isSequenceEditorOpen` | 152, 365        | `condition-rendu`             | `aria-expanded={isSequenceEditorOpen}` sur le bouton séquence                                                                                     |
| `isSequenceReadOnly`   | 113 (interface) | —                             | Déclarée dans l'interface, non utilisée dans le corps du composant rendu                                                                          |

### 3.3 États et effets séquence dans SlotItem

Pas d'état `useState` ni `useEffect` séquence. Deux variables dérivées calculées à chaque rendu :

**Lignes 202–203**

```typescript
const canManageSequence =
  isStep && slot.card_id !== null && (onCreateSequence || onDeleteSequence)
```

**Ligne 205**

```typescript
const isSequenceActionDisabled = isFullyLocked || !canManageSequence
```

### 3.4 Instances de SlotItem dans le projet

**1 instance trouvée — SlotsEditor.tsx**

Fichier : `src/components/features/timeline/slots-editor/SlotsEditor.tsx`, ligne 485.
Props séquence présentes : **OUI (7/7)**.

```tsx
<SlotItem
  key={slot.id}
  slot={slot}
  positionLabel={idx + 1}
  {...(stepNumber !== undefined ? { stepNumber } : {})}
  onUpdate={onUpdateSlot}
  onRemove={handleRemove}
  bankCards={bankCards as BankCard[]}
  personalCards={personalCards as PersonalCard[]}
  busy={busyId === slot.id || swappingCards}
  canRemove={slot.kind === 'step' && stepSlotsCount > 1}
  sessionState={sessionState}
  isValidated={validatedSlotIds?.has(slot.id) ?? false}
  sequence={sequence as Sequence | null}
  onCreateSequence={createSequence}
  onDeleteSequence={deleteSequence}
  canCreateSequence={canCreateSequence}
  onOpenSequenceEditor={openSequenceEditor}
  isSequenceEditorOpen={activeSequenceSlot?.id === slot.id}
  isOffline={isOffline}
  isExecutionOnly={isExecutionOnly}
  dndSlotId={slot.id}
  isDragActive={activeDragSlotId === slot.id}
  setSlotRef={node => setSlotRef(slot.id, node)}
/>
```

Sur 1 instance trouvée, 1 passe les 7 props séquence.

### 3.5 Constat factuel

SlotItem reçoit 7 props dédiées aux séquences parmi 25 props totales. Ces props sont passées intégralement par SlotsEditor (seule instance d'usage trouvée). Les 7 props séquence sont utilisées à 3 niveaux : calcul de variables dérivées (`canManageSequence`, `isSequenceActionDisabled`), conditions de rendu JSX (`aria-label`, `aria-expanded`, visibilité du bouton), et transmission directe en `onClick`. La prop `isSequenceReadOnly` est déclarée dans l'interface mais absente du corps du composant. Aucun état local ni effet séquence dans SlotItem.

---

## Récapitulatif chiffré

| Zone        | Imports séquence | États séquence                        | Handlers séquence      | Hooks séquence                | Props séquence reçues         |
| ----------- | ---------------- | ------------------------------------- | ---------------------- | ----------------------------- | ----------------------------- |
| SlotsEditor | 1                | 1 (`activeSequenceSlot`)              | 2 (`open`, `close`)    | 1 (`useSequencesWithVisitor`) | N/A (produit les props)       |
| SlotCard    | 1                | 2 (`miniTimelineOpen`, `doneStepIds`) | 1 (`handleToggleDone`) | 0                             | 6 (toutes en props du parent) |
| SlotItem    | 0 (props only)   | 0 (2 variables dérivées)              | 0                      | 0                             | 7 (toutes de SlotsEditor)     |
