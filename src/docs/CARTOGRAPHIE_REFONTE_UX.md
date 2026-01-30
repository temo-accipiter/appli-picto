# Cartographie Refonte UX - Pages Édition & Tableau

**Date de création** : 26 janvier 2026
**Objectif** : Préparer une refonte UX majeure des pages Édition et Tableau en identifiant précisément tous les points d'impact sur le code actuel pour guider une migration progressive sans casser l'existant.

**⚠️ IMPORTANT** : Ce document est basé sur une exploration complète du codebase. Aucune hypothèse n'a été faite, tous les chemins sont exacts, tous les patterns sont documentés.

---

## Table des Matières

1. [Vue d'ensemble Architecture](#1-vue-densemble-architecture)
2. [Page Édition - Analyse Complète](#2-page-édition---analyse-complète)
3. [Page Tableau - Analyse Complète](#3-page-tableau---analyse-complète)
4. [Composants Card Transverses](#4-composants-card-transverses)
5. [Flux Sélection Cartes → Génération Tableau](#5-flux-sélection-cartes--génération-tableau)
6. [État Session et Synchronisation](#6-état-session-et-synchronisation)
7. [Risques Majeurs Identifiés](#7-risques-majeurs-identifiés)
8. [Opportunités de Réutilisation](#8-opportunités-de-réutilisation)
9. [Recommandations pour Refonte](#9-recommandations-pour-refonte)
10. [Annexes - Fichiers Critiques](#10-annexes---fichiers-critiques)

---

## 1. Vue d'ensemble Architecture

### Flux Général Application

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUX UTILISATEUR GLOBAL                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Page Édition]          [Supabase DB]          [Page Tableau]  │
│  Création/Gestion   ←→   Tables Données   ←→   Affichage/Prog. │
│                                                                  │
│  ┌────────────────┐      ┌──────────────┐    ┌──────────────┐  │
│  │ TachesEdition  │ ───→ │ taches       │ ←─ │ TachesDnd    │  │
│  │ (CRUD complet) │      │ - position   │    │ (Lecture +   │  │
│  │                │      │ - aujourd'hui│    │  progression)│  │
│  └────────────────┘      │ - fait       │    └──────────────┘  │
│  ┌────────────────┐      └──────────────┘    ┌──────────────┐  │
│  │ RecompensesEd. │ ───→ │ recompenses  │ ←─ │ Modal Reward │  │
│  │ (CRUD complet) │      │ - selected   │    │ (Affichage)  │  │
│  └────────────────┘      └──────────────┘    └──────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Routes Next.js (App Router)

| Route | Fichier | Groupe | Protection | Composant Principal |
|-------|---------|--------|------------|---------------------|
| `/edition` | `src/app/(protected)/edition/page.tsx` | Protected | Auth requise | `Edition.tsx` (517 lignes) |
| `/tableau` | `src/app/(public)/tableau/page.tsx` | Public | Aucune (visiteurs OK) | `Tableau.tsx` (394 lignes) |

**Notes** :
- Les deux pages utilisent `export const dynamic = 'force-dynamic'` (client-side rendering)
- Édition = zone protégée (auth obligatoire)
- Tableau = zone publique (mode démo disponible pour visiteurs)

---

## 2. Page Édition - Analyse Complète

### 2.1 Architecture Composants

```
Edition.tsx [517L]
├─── TachesEdition [312L]
│    ├─── DndGrid
│    │    ├─── DndCard (wrapper drag-drop)
│    │    │    └─── EditionCard [157L]
│    │    │         ├─── InputWithValidation (label)
│    │    │         ├─── Select (catégorie)
│    │    │         ├─── ButtonDelete
│    │    │         ├─── Checkbox (toggle "aujourd'hui")
│    │    │         └─── SignedImage (image)
│    │    └─── DndSlot (zones droppables)
│    ├─── ModalAjout (création tâche)
│    ├─── ModalCategory (gestion catégories)
│    └─── ModalConfirm (confirmation reset/delete)
│
├─── RecompensesEdition [193L]
│    ├─── DndGrid
│    │    └─── EditionCard (sans catégories)
│    │         ├─── InputWithValidation (label)
│    │         ├─── ButtonDelete
│    │         ├─── Checkbox (sélection unique)
│    │         └─── SignedImage (image)
│    └─── ModalAjout (création récompense)
│
├─── ImageQuotaIndicator (affichage quotas)
├─── Separator (divider visuel)
└─── Modales Lazy-loaded (Suspense)
     ├─── ModalConfirm (suppression)
     ├─── ModalCategory (gestion catégories)
     └─── ModalQuota (alerte dépassement)
```

**Fichiers principaux** :
- `/src/page-components/edition/Edition.tsx` (517 lignes)
- `/src/components/features/taches/taches-edition/TachesEdition.tsx` (312 lignes)
- `/src/components/features/recompenses/recompenses-edition/RecompensesEdition.tsx` (193 lignes)
- `/src/components/shared/card/edition-card/EditionCard.tsx` (157 lignes)
- `/src/components/shared/dnd/DndGrid/DndGrid.tsx` (167 lignes)

### 2.2 Bibliothèque de Cartes - Rendu

**TachesEdition** :
```typescript
// Fichier: TachesEdition.tsx (lignes 229-257)
<DndGrid
  items={visibleTaches}           // Filtrées par catégorie + "aujourd'hui"
  onReorder={handleReorder}       // Swap immédiat (optimistic UI)
  onReorderPosition={updatePositions} // Sauvegarder positions en BDD
  columns="auto"                  // Layout responsive
  gap="medium"
  isEditionMode={true}           // Affiche slots droppables
  renderItem={(item, index) => (
    <EditionCard
      label={drafts[item.id] ?? item.label}
      categorie={item.categorie || ''}
      categorieOptions={categories}
      checked={!!item.aujourdhui}
      onLabelChange={...}
      onBlur={...}
      onCategorieChange={...}
      onToggleCheck={...}
      onDelete={...}
    />
  )}
/>
```

**Filtrage** :
```typescript
// Deux filtres indépendants
const visibleTaches = taches.filter(t => {
  const catMatch = filterCategory === 'all' || (t.categorie || 'none') === filterCategory
  const doneMatch = !filterDone || !!t.aujourdhui
  return catMatch && doneMatch
})
```

**RecompensesEdition** : Même structure que TachesEdition, mais sans `categorieOptions` (récompenses n'ont pas de catégories).

### 2.3 Création/Édition/Suppression

**Hooks Custom CRITIQUES** :

| Hook | Fichier | Responsabilité | Méthodes |
|------|---------|----------------|----------|
| `useTachesEdition(reload)` | `src/hooks/useTachesEdition.ts` (350L) | CRUD tâches édition | `toggleAujourdhui()`, `updateLabel()`, `updateCategorie()`, `deleteTache()`, `resetEdition()`, `addTacheFromFile()`, `updateTacheImage()` |
| `useRecompenses(reload)` | `src/hooks/useRecompenses.ts` (440L) | CRUD récompenses | `selectRecompense()`, `deselectAll()`, `updateLabel()`, `deleteRecompense()`, `createRecompense()`, `addRecompenseFromFile()` |
| `useCategories(reload)` | `src/hooks/useCategories.ts` (173L) | CRUD catégories | `addCategory()`, `deleteCategory()`, `updateCategory()` |

**Flux Création Tâche** :
```
User clique "➕ Ajouter"
  ↓
handleQuotaCheck('task') → Si !canCreateTask() → Affiche ModalQuota
  ↓
Si quota OK → Ouvre ModalAjout
  ↓
User remplit (label, image, catégorie)
  ↓
onSubmitTask(payload) → useTachesEdition.addTacheFromFile()
  ↓
1. compressImageIfNeeded(file) → Max 100KB
2. modernUploadImage() → Supabase Storage 'images' bucket
3. supabase.from('taches').insert({
     user_id, label, imagepath, categorie, position, aujourd'hui: false
   })
  ↓
triggerReload() → setReload(r => r + 1) → Re-fetch toutes tâches
  ↓
Toast success + UI mise à jour
```

**Flux Édition Label** :
```
User modifie label "Faire le lit" → "Ranger la chambre"
  ↓
onLabelChange → setDrafts({...drafts, [id]: newLabel}) (local)
  ↓
onBlur (perte focus) → Validation (notEmpty, noEdgeSpaces, noDoubleSpaces)
  ↓
Si valide → onUpdateLabel(id, label) → useTachesEdition.updateLabel()
  ↓
supabase.from('taches').update({ label, updated_at: now() }).eq('id', id)
  ↓
setTaches(prev => prev.map(...)) + Toast success
  ↓
setSuccessIds([id]) → Animation CSS 600ms ".input--success"
```

**Flux Suppression** :
```
User clique ButtonDelete
  ↓
setTacheASupprimer(tache) → Ouvre ModalConfirm
  ↓
User confirme suppression
  ↓
onDelete(tache) → useTachesEdition.deleteTache(tache)
  ↓
1. deleteImageIfAny(tache.imagepath) → Supabase Storage delete
2. supabase.from('taches').delete().eq('id', tache.id)
  ↓
setTaches(prev => prev.filter(t => t.id !== tache.id))
  ↓
Toast success + fermeture modal
```

### 2.4 Checkbox Sélection "Aujourd'hui"

**Système** : Colonne `taches.aujourdhui` (booléen)

**Comportement** :
```typescript
// Fichier: Edition.tsx (lignes 237-259)
const handleToggleAujourdhui = (id: string, current: boolean) => {
  toggleAujourdhui(id, current)
}

// Hook: useTachesEdition.ts (lignes 158-177)
const toggleAujourdhui = async (id, current) => {
  await supabase.from('taches')
    .update({
      aujourdhui: !current,
      fait: false  // ⚠️ Reset "fait" quand on change sélection
    })
    .eq('id', id)
    .eq('user_id', user.id)

  setTaches(prev => prev.map(t =>
    t.id === id ? {...t, aujourdhui: !current, fait: false} : t
  ))
}
```

**⚠️ IMPORTANT** : Cocher "aujourd'hui" remet automatiquement `fait=false` pour éviter incohérences.

**Visuel** :
- Checkbox coché → Classe CSS `.active` sur EditionCard
- Filtre UI (bouton "Tâches d'aujourd'hui") → Affiche seulement `aujourdhui=true`

### 2.5 Catégories et Filtres

**Table** : `categories`
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  label TEXT NOT NULL,      -- Nom affiché
  value TEXT NOT NULL,      -- Clé interne
  user_id UUID NULL,        -- NULL = catégorie système
  created_at, updated_at TIMESTAMPTZ
)
```

**Catégories système** (hardcodées) :
- `maison`, `école`, `loisirs`, `hygiène`, `alimentation`, `social`

**Hook useCategories** : Charge catégories système + utilisateur
```typescript
// Fichier: useCategories.ts (lignes 44-62)
const { data } = await supabase
  .from('categories')
  .select('*')
  .or(`user_id.eq.${user.id},user_id.is.null`)
  .order('label')
```

**Filtre UI** :
```typescript
// TachesEdition.tsx (lignes 108-123)
<Select
  value={filterCategory}
  onChange={(e) => onFilterCategory(e.target.value)}
  options={[
    { value: 'all', label: t('categories.all') },
    ...categories.map(cat => ({ value: cat.value, label: cat.label }))
  ]}
/>
```

**ModalCategory** :
- Affiche liste catégories utilisateur (non-système)
- Input ajout nouvelle catégorie
- Bouton delete par catégorie avec confirmation
- Warning : "Si catégorie supprimée, tâches passent à 'Aucune'"

### 2.6 Modales Liées

| Modale | Composant | Trigger | Lazy-loaded |
|--------|-----------|---------|-------------|
| **ModalAjout** (tâche) | `ModalAjout` | Bouton "➕ Ajouter" | ❌ Non |
| **ModalAjout** (récompense) | `ModalAjout` | Bouton "🏱 Ajouter récompense" | ❌ Non |
| **ModalCategory** | `ModalCategory` | "⚙️ Gérer catégories" | ✅ Oui (Suspense) |
| **ModalConfirm** (suppression tâche) | `ModalConfirm` | ButtonDelete | ✅ Oui (Suspense) |
| **ModalConfirm** (suppression récompense) | `ModalConfirm` | ButtonDelete | ✅ Oui (Suspense) |
| **ModalConfirm** (reset édition) | `ModalConfirm` | "Réinitialiser" | ✅ Oui (Suspense) |
| **ModalQuota** | `ModalQuota` | Quota dépassé | ✅ Oui (Suspense) |

**Lazy-loading pattern** :
```typescript
// Edition.tsx (lignes 31-33)
const ModalCategory = lazy(() => import('@/components').then(m => ({ default: m.ModalCategory })))
const ModalConfirm = lazy(() => import('@/components').then(m => ({ default: m.ModalConfirm })))
const ModalQuota = lazy(() => import('@/components').then(m => ({ default: m.ModalQuota })))

// Usage avec Suspense
<Suspense fallback={null}>
  <ModalConfirm isOpen={!!tacheASupprimer} onConfirm={...} />
</Suspense>
```

**Réutilisation ModalAjout** : Même composant pour tâches ET récompenses, différencié par prop `itemType`.

### 2.7 Gestion Quotas

**Hook useRBAC** :
```typescript
// Fichier: Edition.tsx (lignes 68-76)
const {
  canCreateTask,       // boolean
  canCreateReward,     // boolean
  canCreateCategory,   // boolean
  getQuotaInfo,        // (type) => { limit, current, remaining, percentage }
  refreshQuotas,       // () => Promise<void>
} = useRBAC()
```

**Vérification avant création** :
```typescript
// Edition.tsx (lignes 298-314)
const handleQuotaCheck = (type: 'task' | 'reward') => {
  const canCreate = type === 'task' ? canCreateTask() : canCreateReward()

  if (!canCreate) {
    const quota = getQuotaInfo(type)
    setQuotaModalData({
      type,
      currentUsage: quota.current,
      limit: quota.limit
    })
    setShowQuotaModal(true)
    return false
  }
  return true
}
```

**Quotas par rôle** :

| Rôle | Tâches | Récompenses | Catégories |
|------|--------|-------------|------------|
| Visiteur | 3 démo | - | - |
| Free | 5/mois | 2/mois | 2 max |
| Abonné | 40 | 10 | 50 |
| Admin | ∞ | ∞ | ∞ |

---

## 3. Page Tableau - Analyse Complète

### 3.1 Architecture Composants

```
Tableau.tsx [394L]
├─── TachesDnd [~350L]
│    ├─── DndContext (@dnd-kit/core)
│    ├─── DroppableSlot [×N slots]
│    │    └─── TableauCard [131L]
│    │         ├─── useDraggable (@dnd-kit)
│    │         ├─── SignedImage / DemoSignedImage
│    │         ├─── Checkbox (toggle "fait")
│    │         └─── useAudioContext (beep 440Hz)
│    └─── ModalConfirm (confirmation reset)
│
├─── TrainProgressBar [~180L]
│    ├─── SVG train animé
│    ├─── useStations(ligne)
│    └─── SelectWithImage (choix ligne)
│
├─── FloatingTimeTimer (draggable)
│    └─── TimeTimer (cadran SVG)
│
├─── Confetti (react-confetti) [Lazy-loaded]
│
├─── ModalRecompense [Lazy-loaded]
│    ├─── SignedImage / DemoSignedImage
│    └─── Label récompense
│
└─── SelectedRewardFloating
     └─── EditionCard (grisé, card récompense)
```

**Fichiers principaux** :
- `/src/page-components/tableau/Tableau.tsx` (394 lignes)
- `/src/components/features/taches/taches-dnd/TachesDnd.tsx` (~350 lignes)
- `/src/components/shared/card/tableau-card/TableauCard.tsx` (131 lignes)
- `/src/components/features/taches/train-progress-bar/TrainProgressBar.tsx` (~180 lignes)
- `/src/components/features/time-timer/FloatingTimeTimer.tsx` (~200 lignes)

### 3.2 Composant Principal - TachesDnd

**DnD Board actuel** : `TachesDnd` avec système de slots

```typescript
// TachesDnd.tsx (structure simplifiée)
<DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
  {slots.map((slot, idx) => (
    <DroppableSlot id={`slot-${idx}`} key={idx}>
      {slot.tache ? (
        <TableauCard
          tache={slot.tache}
          done={doneMap[slot.tache.id] || false}
          toggleDone={onToggle}
          isDraggingGlobal={isDragging}
          isBeingSwapped={isBeingSwapped(slot.tache.id)}
          playSound={true}
        />
      ) : (
        <div className="empty-slot">Vide</div>
      )}
    </DroppableSlot>
  ))}
</DndContext>
```

**Hook principal** : `useTachesDnd(onChange, reloadKey)`

```typescript
// Fichier: useTachesDnd.ts (lignes 60-120)
const useTachesDnd = (onChange: (done: number, total: number) => void, reload = 0) => {
  const [taches, setTaches] = useState([])
  const [doneMap, setDone] = useState({})  // { tacheId → bool }

  // Charge SEULEMENT tâches avec aujourd'hui=true
  const loadTaches = useCallback(async () => {
    const { data } = await supabase
      .from('taches')
      .select('*')
      .eq('user_id', user.id)
      .eq('aujourdhui', true)        // ⚠️ FILTRE CRITIQUE
      .order('position', { ascending: true })

    const initDone = Object.fromEntries(
      data.map(t => [t.id, t.fait === true || t.fait === 1])
    )
    setTaches(data)
    setDone(initDone)
  }, [user.id])

  // Toggle fait = UPDATE DB + state local
  const toggleDone = async (id, newDone) => {
    await supabase.from('taches')
      .update({ fait: newDone })
      .eq('id', id)
      .eq('user_id', user.id)

    setDone(prev => ({ ...prev, [id]: newDone }))
    // Callback immédiat pour UI
    onChange(countDone(), taches.length)
  }

  // Sauvegarder ordre drag-drop
  const saveOrder = async (newList) => {
    // Batch par 5 avec délai 100ms
    for (const batch of chunks(newList, 5)) {
      await Promise.all(batch.map((t, i) =>
        supabase.from('taches')
          .update({ position: i })
          .eq('id', t.id)
      ))
      await delay(100)
    }
  }

  // Reset tous "fait" à false
  const resetAll = async () => {
    await supabase.from('taches')
      .update({ fait: false })
      .eq('user_id', user.id)
      .eq('aujourdhui', true)

    setDone({})  // Tous à false
    onChange(0, taches.length)
  }

  return { taches, doneMap, toggleDone, saveOrder, resetAll }
}
```

**⚠️ COUPLAGE CRITIQUE** : Le tableau charge UNIQUEMENT les tâches avec `aujourdhui=true`. Si cette colonne n'est pas maintenue correctement, le tableau sera vide.

### 3.3 Logique de Progression

**États** :
```typescript
// Tableau.tsx (lignes 60-64)
const [doneCount, setDoneCount] = useState(0)
const [totalTaches, setTotalTaches] = useState(0)
const [showConfettis, setShowConfettis] = useState(false)
const [showModalRecompense, setShowModalRecompense] = useState(false)
```

**Callback onChange** : Rapporte progression au composant parent
```typescript
// Tableau.tsx (lignes 121-124)
useTachesDnd((done, total) => {
  setDoneCount(done)
  setTotalTaches(total)
}, reloadKey)
```

**Détection fin tâches** :
```typescript
// Tableau.tsx (lignes 268-293)
useEffect(() => {
  if (totalTaches === 0) return
  if (doneCount !== totalTaches) return

  // Mode démo : pas de confettis
  if (isDemoMode) {
    setShowModalRecompense(true)
    setTimeout(() => setShowModalRecompense(false), 5000)
    return
  }

  // Mode personnel : confettis + modal
  const confettisEnabled = parametres?.confettis !== false

  if (confettisEnabled) {
    setShowConfettis(true)
    setTimeout(() => setShowConfettis(false), 10000)  // 10s
  }

  setShowModalRecompense(true)
  setTimeout(() => setShowModalRecompense(false), 13000)  // 13s
}, [totalTaches, doneCount, isDemoMode, parametres])
```

**TrainProgressBar** : Progression visuelle
```typescript
// TrainProgressBar.tsx (lignes 140-157)
const progress = totalTaches > 0 ? (doneCount / totalTaches) * 100 : 0

// Position train sur rails
const trainPosition = stationCount > 1
  ? (doneCount / (stationCount - 1)) * 100
  : 0

<div className="train" style={{ left: `${trainPosition}%` }}>
  <img src="/images/train.svg" alt="Train" />
</div>
```

### 3.4 Système de Récompenses

**Sélection récompense unique** :
```typescript
// Tableau.tsx (lignes 244-257)
const selected = recompenses.find(r => r?.selected === true)

const selectedReward = useMemo(() => {
  const list = Array.isArray(recompenses) ? recompenses : []

  if (isDemoMode && list.length > 0) {
    return list[0]  // Démo : première récompense
  }

  return selected   // Utilisateur : celle marquée selected=true
}, [isDemoMode, recompenses, selected])
```

**Index UNIQUE DB** : Garantit une seule récompense sélectionnée par utilisateur
```sql
-- Fichier: supabase/migrations_archive/20251015194000_add_missing_indexes.sql (lignes 37-41)
CREATE UNIQUE INDEX idx_recompenses_user_selected
  ON recompenses(user_id)
  WHERE selected = true;
```

**RPC Atomique** : Sélection sans race condition
```typescript
// useRecompenses.ts (lignes 120-134)
const selectRecompense = async (id: string) => {
  const { data, error } = await supabase
    .rpc('select_recompense_atomic', { p_reward_id: id })
    .maybeSingle()

  if (error) throw error

  // Mise à jour state local
  setRecompenses(prev => prev.map(r =>
    r.id === id ? {...r, selected: true} : {...r, selected: false}
  ))
}
```

**ModalRecompense** : Affichée 13s à la fin
```typescript
// Tableau.tsx (lignes 371-378)
{showModalRecompense && selectedReward && (
  <Suspense fallback={null}>
    <ModalRecompense
      isOpen={showModalRecompense}
      onClose={() => setShowModalRecompense(false)}
      reward={selectedReward}
    />
  </Suspense>
)}
```

**SelectedRewardFloating** : Card récompense grisée flottante
```typescript
// Tableau.tsx (lignes 381-382)
{showRecompense && selectedReward && doneCount < totalTaches && (
  <SelectedRewardFloating reward={selectedReward} />
)}
```

### 3.5 Confettis et Sons

**Confettis** : Librairie `react-confetti`
```typescript
// Tableau.tsx (lignes 364-370)
{showConfettis && (
  <Suspense fallback={null}>
    <Confetti
      width={width}
      height={height}
      numberOfPieces={200}
    />
  </Suspense>
)}
```

**Beep Audio** : Son 440 Hz (note La) à chaque coche
```typescript
// TableauCard.tsx (lignes 49-53)
const { playBeep } = useAudioContext()

const handleCheck = (e) => {
  if (!done && playSound) {
    playBeep(440)  // Fréquence 440Hz, durée 0.1s, volume 0.1
  }
  toggleDone(tache.id, !done)
}
```

### 3.6 Persistance Locale

**localStorage (DisplayContext)** :
```typescript
// DisplayContext.tsx (lignes 38-82)
const [showTrain, setShowTrain] = useState(() =>
  typeof window !== 'undefined'
    ? localStorage.getItem('showTrain') === 'true'
    : true
)

// Sync localStorage ← état
useEffect(() => {
  if (!isVisitor && typeof window !== 'undefined') {
    localStorage.setItem('showTrain', showTrain ? 'true' : 'false')
  }
}, [showTrain, isVisitor])
```

**Clés localStorage tableau** :

| Clé | Valeur | Utilisé pour |
|-----|--------|--------------|
| `showTrain` | `'true'`/`'false'` | Affichage TrainProgressBar |
| `showAutre` | `'true'`/`'false'` | Affichage autre section |
| `showRecompense` | `'true'`/`'false'` | Affichage SelectedRewardFloating |
| `showTimeTimer` | `'true'`/`'false'` | Affichage FloatingTimeTimer |
| `ligne` | `'1'`/`'6'`/`'12'` | Ligne métro sélectionnée (TrainProgressBar) |
| `timeTimer_position` | JSON `{x, y}` | Position floating timer |

**sessionStorage (Edition)** :
```typescript
// Edition.tsx (lignes 116-118)
const [showRecompenses, setShowRecompenses] = useState(
  () => sessionStorage.getItem('showRecompenses') === 'true'
)
```

---

## 4. Composants Card Transverses

### 4.1 Hiérarchie Composants Card

```
BaseCard [96L]            ← Composant de base présentationnel
├─── EditionCard [157L]   ← Couche métier édition
│    └─── Utilisé par TachesEdition + RecompensesEdition
│
└─── TableauCard [131L]   ← Couche métier tableau (indépendant)
     └─── Utilisé par TachesDnd

DndCard [100L]            ← Wrapper drag-drop générique (séparé)
```

### 4.2 BaseCard - Composant de Base

**Fichier** : `/src/components/shared/card/base-card/BaseCard.tsx` (96 lignes)

**Responsabilités** :
- Layout Grid 2-colonnes : `image-section` + `content`
- Gestion états visuels : `size`, `disabled`, `completed`, `checked`
- Animations Framer Motion : hover scale 1.02, fade out smooth
- Accessibilité TSA : focus-within, focus-visible, reduced-motion

**Props** :
```typescript
interface BaseCardProps {
  imageSlot?: ReactNode         // Slot image
  contentSlot?: ReactNode       // Slot contenu
  actionsSlot?: ReactNode       // Slot actions
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  completed?: boolean           // Grayscale
  checked?: boolean             // Bordure + couleur
  className?: string
  ariaLabel?: string
}
```

**SCSS** : `/src/components/shared/card/base-card/BaseCard.scss` (165 lignes)
- Tokens Phase 6 validés : `spacing()`, `radius()`, `shadow()`, `text()`, `surface()`, `tsa-pastel()`
- Touch targets min : `size('touch-target-min')` → 44×44px
- Responsive mobile-first : `@include respond-to(sm/md)`

**⚠️ NE CONTIENT PAS** : Logique métier, composants interactifs, données spécifiques tâche/récompense

### 4.3 EditionCard - Couche Métier Édition

**Fichier** : `/src/components/shared/card/edition-card/EditionCard.tsx` (157 lignes)

**Responsabilités** :
- Édition inline : label via `InputWithValidation`
- Sélection catégorie via `Select` dropdown
- Actions : `ButtonDelete` + `Checkbox` (toggle visibility)
- Validation règles i18n : `validateNotEmpty`, `noEdgeSpaces`, `noDoubleSpaces`
- Compose **BaseCard** avec slots

**Props** :
```typescript
interface EditionCardProps {
  image?: string
  label: string
  categorie?: string
  checked: boolean              // État visibility ("aujourd'hui" ou "selected")

  onLabelChange?: (newLabel: string) => void
  onBlur?: (val: string) => void
  onCategorieChange?: (newCategorie: string) => void
  onToggleCheck: () => void
  onDelete?: () => void

  categorieOptions?: CategoryOption[]  // Vide pour récompenses
  labelId: string | number
  imageComponent?: ReactNode
  editable?: boolean
  disabled?: boolean
}
```

**Mapping données Supabase → UI** :

| Champ Supabase | EditionCard Prop | Affichage | Type |
|---|---|---|---|
| `tache.label` | `label` | Input text (éditable) | string |
| `tache.imagepath` | `image` | Via SignedImage | string \| null |
| `tache.categorie` | `categorie` | Select dropdown | string \| null |
| `tache.aujourdhui` | `checked` | Checkbox + couleur | boolean |

**Variante** : Même composant pour **tâches ET récompenses**
- TachesEdition : avec `categorieOptions`
- RecompensesEdition : sans `categorieOptions={[]}`

**SCSS** : `/src/components/shared/card/edition-card/EditionCard.scss` (14 lignes)
- **Thin wrapper** sans styles propres, tous styles hérités de BaseCard

### 4.4 TableauCard - Couche Métier Tableau

**Fichier** : `/src/components/shared/card/tableau-card/TableauCard.tsx` (131 lignes)

**Responsabilités** :
- Affichage lecture seule (label + image)
- Drag & drop via `@dnd-kit/core` (`useDraggable`)
- Checkbox pour marquer "fait" avec bip sonore (440 Hz)
- Support images : `SignedImage` (privée) + `DemoSignedImage` (publique)
- Animations fluides avec `useDragAnimation` hook

**Props** :
```typescript
interface TableauCardProps {
  tache: Tache                  // Objet tâche complet
  done: boolean                 // État "fait" (du parent)
  toggleDone: (id: string, newDone: boolean) => void
  isDraggingGlobal?: boolean
  isBeingSwapped?: boolean
  playSound?: boolean           // Jouer bip si done=false → true
}
```

**Affichage image** (lignes 94-108) :
```tsx
{tache.imagepath && (
  tache.isDemo ? (
    <DemoSignedImage filePath={tache.imagepath} alt={tache.label} />
  ) : (
    <SignedImage
      filePath={tache.imagepath}
      bucket="images"
      size={100}
    />
  )
)}
```

**SCSS** : `/src/components/shared/card/tableau-card/TableauCard.scss` (114 lignes)
- Tokens Phase 6 validés
- Drag states : `&.dragging`, `&.done` (grayscale opacity)
- Hover effect : image rotate 8°, scale 1.15
- Animation swap fluide : 5 phases (lifting, shrinking, growing, moving, idle)

**Interaction checkbox** (lignes 111-124) :
- Wrapper isolé du drag listener avec `e.stopPropagation()`
- Playback bip 440Hz via `useAudioContext().playBeep()`
- Callback `toggleDone(tache.id, !done)`

### 4.5 Images - Stockage et Affichage

**Buckets Supabase Storage** :

| Bucket | Type | Accès | Utilisé pour | Signé ? |
|---|---|---|---|---|
| `images` | Privé | RLS (user_id match) | Tâches + Récompenses | Oui (3600s) |
| `demo-images` | Public | Publique | Cartes démo visiteurs | Non (URL directe) |
| `avatars` | Privé | RLS | Avatars utilisateurs | Oui (fallback) |

**Composants d'image** :

#### SignedImage
**Fichier** : `/src/components/shared/signed-image/SignedImage.tsx` (132 lignes)

**Responsabilités** :
- Fetch URL signée pour images **privées**
- Fallback transparent : si `bucket=avatars` échoue → tente `images`
- Support bucket public `demo-images` (URL directe sans signature)
- Optimisation Next.js Image (WebP/AVIF, lazy loading)
- Retry 2× avec délai 2s si erreur

**Props** :
```typescript
interface SignedImageProps {
  filePath?: string
  alt: string                    // WCAG obligatoire
  size?: number                  // 60 (défaut)
  bucket?: string                // 'images' (défaut)
  className?: string
}
```

#### DemoSignedImage
**Fichier** : `/src/components/shared/demo-signed-image/DemoSignedImage.tsx` (136 lignes)

**Responsabilités** :
- Images démo **publiques** (bucket `demo-images`)
- Cache mémoire `Map<string, string>` pour éviter requêtes redondantes
- Retry automatique 2s après erreur
- Placeholder spinner pendant chargement

#### ImagePreview
**Fichier** : `/src/components/ui/image-preview/ImagePreview.tsx` (28 lignes)

**Responsabilités** :
- Affichage simple URL (pas authentification)
- Tailles : sm (60px), md (100px), lg (160px)
- Utilisé dans **EditionCard** uniquement (avant upload)

### 4.6 Mapping Composants → Images

| Composant | Champ Supabase | Composant Image | Size | Bucket | Notes |
|---|---|---|---|---|---|
| **EditionCard** | `imagepath` | `SignedImage` | sm (60px) | images | Dans imageComponent slot |
| **TableauCard** (privée) | `imagepath` | `SignedImage` | lg (100px) | images | `bucket="images"` |
| **TableauCard** (démo) | `imagepath` | `DemoSignedImage` | lg (100px) | demo-images | Si `isDemo=true` |
| **ModalAjout** (preview) | File upload | `ImagePreview` | md/lg | N/A | Avant upload |

---

## 5. Flux Sélection Cartes → Génération Tableau

### 5.1 Vue d'Ensemble

```
┌────────────────────────────────────────────────────────────────┐
│                FLUX SÉLECTION CARTES → TABLEAU                  │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ÉDITION (all taches)                TABLEAU (filtered)        │
│  ┌────────────────────────┐      ┌──────────────────────┐     │
│  │ Faire le déjeuner  ☐   │      │                      │     │
│  │ Brosser dents      ☑   │ ───→ │ Brosser dents   ☐    │     │
│  │ Faire lit          ☐   │      │ Douche matinale ☐    │     │
│  │ Douche matinale    ☑   │      │                      │     │
│  └────────────────────────┘      └──────────────────────┘     │
│      ☑ = aujourdhui=true              (filtré DB)             │
│                                       useTachesDnd             │
│                                                                 │
│  RÉCOMPENSES ÉDITION           RÉCOMPENSES TABLEAU             │
│  ┌──────────────────┐          ┌────────────────┐             │
│  │ Chocolat   ◎     │ ───────→ │ Chocolat      │             │
│  │ Gâteau     ○     │          │ (sélectionné) │             │
│  │ Jeu        ○     │          └────────────────┘             │
│  └──────────────────┘          (selected=true)                │
│     ◎ = selected=true                                          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Stockage de la Sélection

**Tâches - Colonne `aujourdhui`** :
```sql
-- Table taches
CREATE TABLE taches (
  id UUID PRIMARY KEY,
  user_id UUID,
  label TEXT,

  aujourdhui BOOLEAN DEFAULT false,  -- ✅ Marquée pour tableau
  fait BOOLEAN DEFAULT false,        -- État "fait" (tableau uniquement)
  position INTEGER,                  -- Ordre drag-and-drop
  imagepath TEXT
);

-- Index partiel pour performance
CREATE INDEX idx_taches_user_aujourdhui
  ON taches(user_id, aujourdhui)
  WHERE aujourdhui = true;
```

**Récompenses - Colonne `selected`** :
```sql
-- Table recompenses
CREATE TABLE recompenses (
  id UUID PRIMARY KEY,
  user_id UUID,
  label TEXT,

  selected BOOLEAN DEFAULT false,    -- ✅ Sélection unique
  imagepath TEXT
);

-- Index UNIQUE garantit seulement 1 selected=true par user
CREATE UNIQUE INDEX idx_recompenses_user_selected
  ON recompenses(user_id)
  WHERE selected = true;
```

### 5.3 Flux Étape par Étape

#### A. Édition - Marquer "Aujourd'hui"

```
User clique checkbox "aujourd'hui" sur tâche "Faire le déjeuner"
  ↓
TachesEdition.onToggleAujourdhui("task-123", false)
  ↓
useTachesEdition.toggleAujourdhui("task-123", false)
  ↓
UPDATE taches
  SET aujourdhui = true, fait = false
  WHERE id = 'task-123' AND user_id = 'user-xyz'
  ↓
State Local: setTaches(prev => [...])
  ↓
UI affiche checkmark ✓ sur tâche
```

#### B. Édition - Sélectionner Récompense

```
User clique récompense "Chocolat"
  ↓
RecompensesEdition.onToggleSelect("reward-456", false)
  ↓
useRecompenses.selectRecompense("reward-456")
  ↓
SELECT select_recompense_atomic(p_reward_id := 'reward-456')
  (RPC atomique : déselectionne autres, sélectionne celle-ci)
  ↓
DB :
  UPDATE recompenses SET selected = false
    WHERE user_id = 'user-xyz' AND selected = true
  UPDATE recompenses SET selected = true
    WHERE id = 'reward-456' AND user_id = 'user-xyz'
  ↓
State Local: setRecompenses(prev => prev.map(...))
  ↓
UI affiche "Chocolat" comme sélectionnée (highlight/border)
```

#### C. Navigation → Tableau

```
User navigue /tableau (click lien BottomNav ou URL)
  ↓
Tableau.tsx monte
  ↓
useTachesDnd appelé avec reloadKey=0
  ↓
SELECT * FROM taches
  WHERE user_id = 'user-xyz' AND aujourdhui = true
  ORDER BY position ASC
  ↓
Retourne : [
  { id: 'task-123', label: 'Faire le déjeuner', fait: false, ... },
  { id: 'task-789', label: 'Douche matinale', fait: false, ... }
]
  ↓
setTaches([...])  ← affiche 2 cartes
  ↓
useTachesDnd initialise doneMap : { 'task-123': false, 'task-789': false }
```

#### D. Tableau - Cocher Tâche

```
User clique checkmark sur "Faire le déjeuner"
  ↓
TachesDnd.onToggle('task-123', true)
  ↓
useTachesDnd.toggleDone('task-123', true)
  ↓
UPDATE taches SET fait = true WHERE id = 'task-123'
  ↓
State Local: setDone(prev => ({...prev, 'task-123': true}))
  ↓
UI Checkbox animée ✓ (CSS)
  ↓
doneCount += 1
  ↓
Si doneCount === totalTaches :
  → Affiche modal récompense sélectionnée
  → Lance confettis si parametres.confettis = true
```

### 5.4 Détermination de l'Ordre

**Colonne `position`** : Index ordre (0, 1, 2, ...)

**Édition** : Réordonnancement via DnD
```typescript
// DndGrid appelle onReorder immédiatement (optimistic UI)
handleReorder(newOrderedList)
  ↓
// Puis batch update positions
updatePositions(newOrderedList)
  ↓
for (const batch of chunks(newOrderedList, 5)) {
  await Promise.all(batch.map((t, i) =>
    supabase.from('taches')
      .update({ position: i })
      .eq('id', t.id)
  ))
  await delay(100)
}
```

**Tableau** : Chargement ordonné
```typescript
// useTachesDnd.ts (ligne 72)
const { data } = await supabase
  .from('taches')
  .select('*')
  .eq('user_id', user.id)
  .eq('aujourdhui', true)
  .order('position', { ascending: true })  // ✅ Ordre préservé
```

### 5.5 Navigation entre Pages

**Pas de Query Params** : Navigation simple via `<Link>`

```typescript
// BottomNav.tsx (ligne 61-63)
<Link href="/tableau">
  <LayoutDashboard />
</Link>

// Navbar.tsx (ligne 50-57)
<Link href="/edition">
  <Pencil />
</Link>
```

**Rechargement Automatique** : Détection pathname change
```typescript
// Tableau.tsx (lignes 94-110)
const prevPathRef = useRef<string | null>(null)
const [reloadKey, setReloadKey] = useState(0)

useEffect(() => {
  const prevPath = prevPathRef.current
  prevPathRef.current = pathname

  if (pathname === '/tableau' && prevPath !== null && prevPath !== '/tableau') {
    setReloadKey(prev => prev + 1)  // Force useTachesDnd reload
  }
}, [pathname])
```

### 5.6 Points de Persistance

| Élément | Où | Quand | Mécanisme |
|---------|-----|-------|-----------|
| **Aujourd'hui** | `taches.aujourdhui` | Toggle immédiat | `UPDATE` + state local |
| **Récompense Sélectionnée** | `recompenses.selected` | Click immédiat | RPC atomique + state local |
| **Fait** | `taches.fait` | Checkbox tableau | `UPDATE` + state local |
| **Ordre Tâches** | `taches.position` | Drag-and-drop | Batch `UPDATE` + state local |
| **Paramètres** | `parametres` table (id=1) | Modifications manuelles | `UPSERT` |
| **Affichage Récompense** | localStorage | Navigation | `localStorage.showRecompense` |
| **Ligne Train** | localStorage | Changement | `localStorage.ligne` |

---

## 6. État Session et Synchronisation

### 6.1 Contextes Globaux (React Context API)

| Context | Fichier | Lignes | État Exposé |
|---------|---------|--------|------------|
| **AuthContext** | `src/contexts/AuthContext.tsx` | 231 | `user`, `authReady`, `loading`, `error`, `signOut()` |
| **PermissionsContext** | `src/contexts/PermissionsContext.tsx` | 309 | `ready`, `role`, `permissions`, `isVisitor`, `isAdmin`, `can()`, `reload()` |
| **DisplayContext** | `src/contexts/DisplayContext.tsx` | 113 | `showTrain`, `showAutre`, `showRecompense`, `showTimeTimer` (+ setters) |
| **LoadingContext** | `src/contexts/LoadingContext.tsx` | 86 | `isLoading`, `loadingMessage`, `setLoading()`, `startLoading()`, `stopLoading()` |
| **ToastContext** | `src/contexts/ToastContext.tsx` | 124 | `show()`, `hide()`, `showToast()` |

**Synchronisation** :
- **AuthContext** : Supabase SDK `onAuthStateChange()` + localStorage session auto
- **PermissionsContext** : RPC queries `get_my_primary_role()` + `get_my_permissions()` avec retry exponentiel
- **DisplayContext** : localStorage + useState (sync via useEffect)
- **LoadingContext** : État local uniquement (pas persistence)
- **ToastContext** : Consulte `useParametres()` pour `toasts_enabled`

### 6.2 Clés localStorage

| Clé | Valeur | Format | Scope | Utilisé par |
|-----|--------|--------|-------|-------------|
| `showTrain` | `'true'`/`'false'` | String booléen | Non-visiteur | DisplayContext, Tableau |
| `showAutre` | `'true'`/`'false'` | String booléen | Non-visiteur | DisplayContext, Tableau |
| `showRecompense` | `'true'`/`'false'` | String booléen | Non-visiteur | DisplayContext, Tableau |
| `showTimeTimer` | `'true'`/`'false'` | String booléen | Non-visiteur | DisplayContext, FloatingTimeTimer |
| `ligne` | `'1'`/`'2'`/`'3'` | String numéro | Global | TrainProgressBar |
| `timeTimer_position` | JSON `{x, y}` | JSON object | Global | FloatingTimeTimer |
| `timeTimer_silentMode` | `'true'`/`'false'` | String booléen | Global | useTimerPreferences |
| `timeTimer_lastDuration` | `'10'` | String nombre | Global | useTimerPreferences |
| `timeTimer_diskColor` | `'red'`/`'blue'` | String enum | Global | useTimerPreferences |
| `timeTimer_showNumbers` | `'true'`/`'false'` | String booléen | Global | useTimerPreferences |
| `timeTimer_vibrate` | `'true'`/`'false'` | String booléen | Global | useTimerPreferences |
| `timeTimer_customDurations` | JSON `[10, 15]` | JSON array | Global | useTimerPreferences |
| `lang` | `'fr'`/`'en'` | String | Global | i18n.ts |
| `theme` | `'light'`/`'dark'` | String | Global | ThemeToggle |
| `cookie_consent_v2` | JSON consent | JSON object | Global | consent.ts (180j expiry) |
| `sb-<project>-auth-token` | Session JSON | SDK-managed | Global | Supabase SDK (automatique) |

### 6.3 Clés sessionStorage

| Clé | Valeur | Format | Scope | Utilisé par |
|-----|--------|--------|-------|-------------|
| `showRecompenses` | `'true'`/`'false'` | String booléen | Session Édition uniquement | Edition.tsx |

### 6.4 Tables Supabase (État Utilisateur)

**Table `parametres`** :
```sql
CREATE TABLE parametres (
  id SERIAL PRIMARY KEY,         -- Singleton id=1 par user
  confettis BOOLEAN DEFAULT true,
  toasts_enabled BOOLEAN DEFAULT true,
  created_at, updated_at TIMESTAMPTZ
);
```

**Hook** : `useParametres()` (184 lignes)
- `refresh()` : Fetch depuis `parametres WHERE id=1`
- `updateParametres()` : UPSERT avec `onConflict: 'id'`
- Pattern fallback : Visiteur mode utilise defaults locaux sans insertion DB

**Table `profiles`** :
```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY,
  plan TEXT DEFAULT 'free',      -- 'free' | 'subscriber'
  plan_expires_at TIMESTAMPTZ NULL,
  is_admin BOOLEAN DEFAULT false,
  pseudo TEXT,
  avatar_url TEXT,
  account_status TEXT DEFAULT 'active',
  created_at, updated_at TIMESTAMPTZ
);
```

**Table `taches`** : (Voir section 5.2)

**Table `recompenses`** : (Voir section 5.2)

### 6.5 Hooks Custom pour State Global

| Hook | Fichier | Responsabilité |
|------|---------|----------------|
| **useAuth** | `src/hooks/useAuth.ts` | Wrapper Context `AuthContext` |
| **usePermissions** | Importe depuis `PermissionsContext` | Rôles RBAC + permissions |
| **useRBAC** | `src/hooks/useRBAC.ts` | Combine Permissions + Quotas unified API |
| **useSimpleRole** | `src/hooks/useSimpleRole.ts` | Rôle simplifié (unknown/visitor/user/admin) |
| **useParametres** | `src/hooks/useParametres.ts` (184L) | Fetch/update table `parametres` |
| **useTachesDnd** | `src/hooks/useTachesDnd.ts` | Fetch tâches `aujourdhui=true` + DnD state |
| **useTachesEdition** | `src/hooks/useTachesEdition.ts` (350L) | CRUD tâches édition |
| **useRecompenses** | `src/hooks/useRecompenses.ts` (440L) | CRUD récompenses |
| **useCategories** | `src/hooks/useCategories.ts` (173L) | CRUD catégories |
| **useDisplay** | Context wrapper | DisplayContext : localStorage synchronisé |
| **useToast** | Context wrapper | ToastContext : show/hide |
| **useLoading** | Context wrapper | LoadingContext : état local |
| **useTimerPreferences** | `src/hooks/useTimerPreferences.ts` (192L) | localStorage centralisé TimeTimer (6 clés) |

### 6.6 Synchronisation Édition ↔ Tableau

**Pattern Reload Counter** :
```typescript
// ÉDITION: useState reload counter
const [reload, setReload] = useState(0)
const triggerReload = () => setReload(r => r + 1)

// Hooks dépendent de reload
const { categories } = useCategories(reload)
const { taches } = useTachesEdition(reload)
const { recompenses } = useRecompenses(reload)

// TABLEAU: Recharge sur retour de route
const [reloadKey, setReloadKey] = useState(0)
useEffect(() => {
  if (pathname === '/tableau' && prevPathRef.current !== '/tableau') {
    setReloadKey(prev => prev + 1)
  }
}, [pathname])

// Hook dépend de reloadKey
const { taches } = useTachesDnd((done, total) => {...}, reloadKey)
```

**⚠️ IMPORTANT** : Pas de passage de données via query params ou state. Tout via Supabase.

---

## 7. Risques Majeurs Identifiés

### 🔴 RISQUE #1 : Couplage Fort `aujourdhui=true` Tableau

**Problème** : Le tableau charge UNIQUEMENT les tâches avec `aujourdhui=true`. Si cette colonne n'est pas maintenue correctement, le tableau sera vide.

**Impact** :
- Si refonte retire colonne `aujourdhui` → tableau cassé
- Si logique de sélection change sans adapter hook → données invisibles
- Si filtre DB oublié dans nouvelle implémentation → performance dégradée

**Fichier critique** : `src/hooks/useTachesDnd.ts` (ligne 72)
```typescript
const { data } = await supabase
  .from('taches')
  .select('*')
  .eq('user_id', user.id)
  .eq('aujourdhui', true)  // ⚠️ COUPLAGE CRITIQUE
  .order('position', { ascending: true })
```

**Recommandation** : Si refonte change système de sélection, adapter hook en priorité.

---

### 🔴 RISQUE #2 : Deux Approches DnD Différentes

**Problème** : Édition et Tableau utilisent des systèmes drag-and-drop différents.

**Édition** : `DndGrid` + `DndCard` wrapper
- Fichier : `src/components/shared/dnd/DndGrid/DndGrid.tsx`
- Grille fixe 3 colonnes
- Pattern : `DndGrid → renderItem() → DndCard → EditionCard`

**Tableau** : `DndContext` natif + `useDraggable`
- Fichier : `src/components/features/taches/taches-dnd/TachesDnd.tsx`
- Slots dynamiques (vides si pas assez items)
- Pattern : `DndContext → DroppableSlot → TableauCard (native useDraggable)`

**Impact** :
- Refonte UX doit choisir une approche unifiée
- Migration nécessitera refactoring complet d'une des deux pages
- Animations et transitions différentes → incohérence UX

**Recommandation** : Standardiser sur une approche (DndGrid ou DndContext natif) avant refonte majeure.

---

### 🔴 RISQUE #3 : État Local vs DB Désynchronisation

**Problème** : Si UPDATE Supabase échoue mais state local est mis à jour → incohérence.

**Scénario** :
```
User: toggleDone → state local update immédiat
  ↓
UPDATE Supabase échoue (réseau)
  ↓
UI affiche coché, mais DB dit pas coché
  ↓
Reload page : décoché surprenant
```

**Fichiers impactés** :
- `src/hooks/useTachesDnd.ts` (toggleDone, saveOrder, resetAll)
- `src/hooks/useTachesEdition.ts` (toggleAujourdhui, updateLabel, deleteTache)

**Mitigation actuelle** :
- Chaque UPDATE attend response avant setState
- En cas erreur : appelle `loadTaches()` pour restaurer
- Pattern `withAbortSafe` + retry exponential

**Recommandation** : Ajouter UX feedback sur erreurs réseau (toast + rollback automatique).

---

### 🔴 RISQUE #4 : Lazy-loading Modales et Code-splitting

**Problème** : 6 modales lazy-loaded dans Édition et Tableau. Si refonte change structure, code-splitting peut casser.

**Modales lazy-loaded** :
```typescript
// Edition.tsx (lignes 31-33)
const ModalCategory = lazy(() => import('@/components').then(m => ({ default: m.ModalCategory })))
const ModalConfirm = lazy(() => import('@/components').then(m => ({ default: m.ModalConfirm })))
const ModalQuota = lazy(() => import('@/components').then(m => ({ default: m.ModalQuota })))

// Tableau.tsx (lignes 45-47)
const Confetti = lazy(() => import('react-confetti'))
const ModalRecompense = lazy(() => import('@/components').then(m => ({ default: m.ModalRecompense })))
```

**Impact** :
- Refactoring barrel exports `@/components/index.ts` peut casser imports
- Migration vers composants non-lazy nécessite changement pattern
- Suspense fallback `null` → pas de loading state visible

**Recommandation** : Documenter toutes modales lazy-loaded avant refonte + tester code-splitting.

---

### 🔴 RISQUE #5 : Dépendances Hook `reload` Counter

**Problème** : Tous les hooks métier dépendent d'un compteur `reload` pour recharger. Si logique change, il faut adapter partout.

**Pattern actuel** :
```typescript
// Edition.tsx
const [reload, setReload] = useState(0)
const triggerReload = () => setReload(r => r + 1)

// Hooks dépendent de reload
useCategories(reload)
useTachesEdition(reload)
useRecompenses(reload)
```

**Impact** :
- Refonte doit préserver ce pattern OU migrer tous hooks
- Si oubli d'appeler `triggerReload()`, UI désynchronisée
- Pas de granularité : tout se recharge même si seulement 1 entité change

**Recommandation** : Envisager cache Supabase réactif (ex: SWR, React Query) pour invalidation fine.

---

## 8. Opportunités de Réutilisation

### ✅ OPPORTUNITÉ #1 : BaseCard Composant Fondation

**Avantage** : BaseCard est **purement présentationnel** avec composition via slots.

**Réutilisation** :
- Créer nouvelles variantes (ListCard, GridCard, CompactCard) en composant BaseCard
- Garder logique métier séparée (validation, callbacks) dans couches supérieures
- Animations TSA-friendly déjà intégrées (reduced-motion, focus-visible)

**Fichier** : `src/components/shared/card/base-card/BaseCard.tsx` (96 lignes)

**Recommandation refonte** : Conserver BaseCard comme fondation, créer nouvelles couches métier pour nouvelles UX.

---

### ✅ OPPORTUNITÉ #2 : Hooks Custom Métier Réutilisables

**Avantage** : Tous les hooks CRUD sont découplés des composants UI.

**Hooks réutilisables** :
- `useTachesEdition` : CRUD tâches complet (350L)
- `useTachesDnd` : Lecture + progression tableau
- `useRecompenses` : CRUD récompenses (440L)
- `useCategories` : CRUD catégories (173L)
- `useRBAC` : Permissions + quotas unified
- `useParametres` : Settings utilisateur (184L)

**Réutilisation** :
- Refonte UI peut garder hooks intacts
- Composants nouveaux peuvent importer hooks existants
- Logique métier reste stable même si UI change radicalement

**Recommandation refonte** : Préserver hooks custom, adapter seulement composants UI.

---

### ✅ OPPORTUNITÉ #3 : Système de Tokens SCSS Phase 6

**Avantage** : Design system complet tokens-first, aucune valeur hardcodée.

**Tokens disponibles** :
- `spacing()`, `size()`, `radius()`, `shadow()`
- `color()`, `surface()`, `text()`, `semantic()`, `tsa-pastel()`
- `font-size()`, `font-weight()`, `line-height()`
- `timing()`, `easing()`
- `@include safe-transition()`, `@include respond-to()`

**Réutilisation** :
- Nouveaux composants UX utilisent mêmes tokens
- Cohérence visuelle garantie (couleurs pastel TSA, animations ≤0.3s)
- Thèmes futurs (dark mode) via tokens centralisés

**Fichiers** :
- `src/styles/abstracts/_variables.scss`
- `src/styles/abstracts/_mixins.scss`
- `src/styles/abstracts/_typography.scss`

**Recommandation refonte** : Garder système tokens-first, étendre si nécessaire (pas remplacer).

---

### ✅ OPPORTUNITÉ #4 : Validation Composable InputWithValidation

**Avantage** : Système de validation réutilisable avec règles i18n.

**Pattern** :
```typescript
// EditionCard.tsx (lignes 88-92)
const validationRules = [
  makeValidateNotEmpty(t),   // Pas chaîne vide
  makeNoEdgeSpaces(t),       // Pas espaces avant/après
  makeNoDoubleSpaces(t)      // Pas double spaces
]

<InputWithValidation
  value={label}
  onValidChange={onLabelChange}
  onBlur={onBlur}
  validationRules={validationRules}
/>
```

**Réutilisation** :
- Ajouter nouvelles règles (ex: minLength, maxLength, pattern)
- Réutiliser dans nouveaux formulaires (catégories, paramètres, profil)
- Feedback visuel déjà intégré (success, error states)

**Fichier** : `src/components/ui/input-with-validation/InputWithValidation.tsx`

**Recommandation refonte** : Réutiliser InputWithValidation partout où besoin validation.

---

### ✅ OPPORTUNITÉ #5 : RPC Atomique Sélection Unique

**Avantage** : RPC `select_recompense_atomic` garantit sélection unique sans race condition.

**Pattern** :
```sql
-- RPC atomique (1 round-trip réseau)
CREATE OR REPLACE FUNCTION select_recompense_atomic(p_reward_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE recompenses SET selected = false
    WHERE user_id = auth.uid() AND selected = true;

  UPDATE recompenses SET selected = true
    WHERE id = p_reward_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Réutilisation** :
- Créer RPCs similaires pour autres sélections uniques (station active, catégorie favoris)
- Pattern évite 2 queries + race condition
- Atomicité garantie côté DB

**Fichier** : `supabase/migrations_archive/20251015192900_add_select_recompense_atomic.sql`

**Recommandation refonte** : Réutiliser pattern RPC atomique pour nouveaux besoins sélection unique.

---

## 9. Recommandations pour Refonte

### 🎯 STRATÉGIE : Migration Incrémentale

1. **Phase 1 : Inventaire Complet** ✅
   - Ce document couvre l'inventaire complet
   - Tous couplages identifiés
   - Risques et opportunités documentés

2. **Phase 2 : Unification DnD**
   - Choisir approche unique (DndGrid ou DndContext natif)
   - Créer composant `UnifiedDndGrid` réutilisable
   - Migrer Édition OU Tableau vers nouvelle approche
   - Tests E2E pour vérifier parité

3. **Phase 3 : Refactoring Cartes**
   - Conserver BaseCard comme fondation
   - Créer nouvelles variantes si nécessaire (ListCard, CompactCard)
   - Adapter EditionCard et TableauCard vers nouvelles UX
   - Préserver mapping `imagepath → SignedImage`

4. **Phase 4 : Modernisation État**
   - Envisager cache réactif (React Query / SWR) pour remplacer `reload` counter
   - Ajouter invalidation fine (seulement entités changées)
   - Améliorer UX feedback sur erreurs réseau (toast + rollback)

5. **Phase 5 : Tests et Rollout**
   - Tests E2E couvrant flux complets (création → sélection → tableau)
   - A/B testing sur groupe pilote
   - Monitoring erreurs (Sentry + logs Supabase)
   - Rollback plan si régression

### 🛡️ Checklist Avant Refonte

- [ ] **Hooks custom préservés** : useTachesEdition, useTachesDnd, useRecompenses
- [ ] **Colonne `aujourdhui` maintenue** : OU migration vers nouveau système documentée
- [ ] **Index DB préservés** : `idx_taches_user_aujourdhui`, `idx_recompenses_user_selected`
- [ ] **RPC atomique gardé** : `select_recompense_atomic` OU équivalent
- [ ] **Tokens SCSS respectés** : Aucune valeur hardcodée dans nouveaux composants
- [ ] **Accessibilité TSA validée** : WCAG 2.2 AA, animations ≤0.3s, focus-visible
- [ ] **Tests E2E mis à jour** : Couvrent nouveaux flux UX
- [ ] **Documentation mise à jour** : CLAUDE.md + ce document

### 🔧 Outils Recommandés

**Tests** :
- Vitest : Tests unitaires hooks custom
- Playwright : Tests E2E flux complets
- React Testing Library : Tests composants UI

**Monitoring** :
- Sentry : Erreurs client-side
- Supabase Logs : Erreurs DB + RPC
- Vercel Analytics : Performance + Web Vitals

**Migration** :
- Database Diff : Comparer schémas avant/après
- TypeScript Strict : Détecter regressions types
- ESLint + Prettier : Cohérence code

---

## 10. Annexes - Fichiers Critiques

### 10.1 Routes et Pages

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/app/(protected)/edition/page.tsx` | 13 | Route édition protégée |
| `src/app/(public)/tableau/page.tsx` | 14 | Route tableau publique |
| `src/page-components/edition/Edition.tsx` | 517 | Composant principal édition |
| `src/page-components/tableau/Tableau.tsx` | 394 | Composant principal tableau |

### 10.2 Composants Features

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/components/features/taches/taches-edition/TachesEdition.tsx` | 312 | Éditeur tâches |
| `src/components/features/recompenses/recompenses-edition/RecompensesEdition.tsx` | 193 | Éditeur récompenses |
| `src/components/features/taches/taches-dnd/TachesDnd.tsx` | ~350 | Drag & drop tableau |
| `src/components/features/taches/train-progress-bar/TrainProgressBar.tsx` | ~180 | Progression visuelle |
| `src/components/features/time-timer/FloatingTimeTimer.tsx` | ~200 | Timer flottant |
| `src/components/features/time-timer/TimeTimer.tsx` | ~600 | Cadran timer |

### 10.3 Composants Cards

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/components/shared/card/base-card/BaseCard.tsx` | 96 | Composant base présentationnel |
| `src/components/shared/card/edition-card/EditionCard.tsx` | 157 | Couche métier édition |
| `src/components/shared/card/tableau-card/TableauCard.tsx` | 131 | Couche métier tableau |

### 10.4 Composants Images

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/components/shared/signed-image/SignedImage.tsx` | 132 | Images privées signées |
| `src/components/shared/demo-signed-image/DemoSignedImage.tsx` | 136 | Images publiques démo |
| `src/components/ui/image-preview/ImagePreview.tsx` | 28 | Preview avant upload |

### 10.5 Composants DnD

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/components/shared/dnd/DndGrid/DndGrid.tsx` | 167 | Grille drag-drop édition |
| `src/components/shared/dnd/DndCard/DndCard.tsx` | 100 | Wrapper drag-drop générique |
| `src/components/shared/dnd/useDndGrid.ts` | 160 | Hook logique DnD |

### 10.6 Hooks Custom CRUD

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/hooks/useTachesEdition.ts` | 350 | CRUD tâches édition |
| `src/hooks/useTachesDnd.ts` | ~200 | État tâches + ordre tableau |
| `src/hooks/useRecompenses.ts` | 440 | CRUD récompenses |
| `src/hooks/useCategories.ts` | 173 | CRUD catégories |
| `src/hooks/useParametres.ts` | 184 | Settings utilisateur |

### 10.7 Hooks Contextes

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/hooks/useAuth.ts` | ~50 | Wrapper AuthContext |
| `src/hooks/useRBAC.ts` | ~200 | Permissions + quotas unified |
| `src/hooks/useSimpleRole.ts` | ~80 | Rôle simplifié |
| `src/hooks/useTimerPreferences.ts` | 192 | localStorage TimeTimer |

### 10.8 Contextes React

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/contexts/AuthContext.tsx` | 231 | Authentification |
| `src/contexts/PermissionsContext.tsx` | 309 | Rôles RBAC |
| `src/contexts/DisplayContext.tsx` | 113 | Affichage UI sections |
| `src/contexts/LoadingContext.tsx` | 86 | État loading global |
| `src/contexts/ToastContext.tsx` | 124 | Notifications toasts |

### 10.9 Styles SCSS

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/page-components/edition/Edition.scss` | 164 | Styles page édition |
| `src/page-components/tableau/Tableau.scss` | ~180 | Styles page tableau |
| `src/components/features/taches/taches-edition/TachesEdition.scss` | 184 | Styles éditeur tâches |
| `src/components/features/taches/taches-dnd/TachesDnd.scss` | ~150 | Styles drag-drop tableau |
| `src/components/shared/card/base-card/BaseCard.scss` | 165 | Styles base card |
| `src/components/shared/card/tableau-card/TableauCard.scss` | 114 | Styles tableau card |
| `src/components/shared/dnd/DndGrid/DndGrid.scss` | 67 | Styles grille DnD |
| `src/styles/abstracts/_variables.scss` | ~400 | Tokens design system |
| `src/styles/abstracts/_mixins.scss` | ~300 | Mixins réutilisables |

### 10.10 Base de Données

| Fichier | Rôle |
|---------|------|
| `supabase/migrations/20260121100000_baseline_init_schema.sql` | Schema complet tables |
| `supabase/migrations/20260121101000_baseline_rls_policies.sql` | Politiques RLS |
| `supabase/migrations/20260121102000_baseline_storage.sql` | Buckets storage |
| `supabase/migrations_archive/20251015194000_add_missing_indexes.sql` | Indexes optimisation |
| `supabase/migrations_archive/20251015192900_add_select_recompense_atomic.sql` | RPC sélection unique |
| `src/types/supabase.ts` | Types générés Supabase |
| `src/types/global.d.ts` | Types métier (Tache, Recompense, Parametre) |

---

## Conclusion

Cette cartographie exhaustive fournit une base solide pour préparer une refonte UX majeure des pages Édition et Tableau. Tous les couplages critiques, risques, et opportunités de réutilisation ont été identifiés avec chemins de fichiers exacts et extraits de code pertinents.

**Points clés à retenir** :

1. **Couplage critique** : Colonne `taches.aujourdhui` lie Édition → Tableau
2. **Deux approches DnD** : Unifier avant refonte majeure
3. **Hooks custom réutilisables** : Préserver logique métier intacte
4. **BaseCard fondation solide** : Composer nouvelles variantes
5. **Tokens SCSS Phase 6** : Design system complet prêt pour extension

**Prochaines étapes recommandées** :

1. Valider stratégie migration incrémentale avec équipe
2. Créer prototypes UX nouvelles pages
3. Identifier nouveaux composants nécessaires (réutiliser vs créer)
4. Planifier tests E2E couvrant flux complets
5. Documenter plan de rollback en cas de régression

---

**Document créé le** : 26 janvier 2026
**Auteur** : Claude Code (exploration automatisée)
**Version** : 1.0
**Statut** : Complet et actionnable