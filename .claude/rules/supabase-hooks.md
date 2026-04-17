---
paths:
  - "src/hooks/**/*.ts"
  - "src/hooks/**/*.tsx"
---

# Règles Utilisation Hooks Supabase — Appli-Picto

## ⚠️ RÈGLE DB-FIRST (OBLIGATOIRE)

**TOUJOURS utiliser hooks custom, JAMAIS query Supabase directe.**

```typescript
// ✅ CORRECT
import { useBankCards } from '@/hooks'

const { cards, loading, error } = useBankCards()

// ❌ INTERDIT
import { supabase } from '@/utils/supabaseClient'

const { data } = await supabase.from('bank_cards').select('*')
```

→ Voir skill `db-first-frontend` pour règles détaillées

## Hooks disponibles

**Liste complète** : `/src/hooks/CLAUDE.md`

**Catégories principales** :

- Identité & Auth : `useAuth()`, `useAccountStatus()`, `useIsVisitor()`
- Cartes : `useBankCards()`, `usePersonalCards()`
- Planning : `useTimelines()`, `useSlots()`
- Exécution : `useSessions()`, `useSessionValidations()`
- Séquençage : `useSequences()`, `useSequenceSteps()`

## Pattern d'utilisation (READ)

```typescript
const {
  data,      // Données (tableau ou objet, selon hook)
  loading,   // Boolean - état chargement
  error,     // Error | null - erreur éventuelle
} = useHookName()

// Gérer les états
if (loading) return <Spinner />
if (error) return <ErrorDisplay error={error} />
if (!data) return <EmptyState />

return <DisplayData data={data} />
```

## Pattern d'utilisation (CRUD)

```typescript
const {
  items, // Données actuelles
  loading, // État chargement
  error, // Erreur éventuelle
  create, // (data) => Promise<Item>
  update, // (id, data) => Promise<Item>
  delete: del, // (id) => Promise<void>
} = useCrudHook()

// Créer
const handleCreate = async () => {
  try {
    const newItem = await create({ name: 'Test' })
    console.log('Created:', newItem)
  } catch (err) {
    console.error('Create failed:', err)
  }
}

// Mettre à jour
const handleUpdate = async (id: string) => {
  try {
    const updated = await update(id, { name: 'Updated' })
  } catch (err) {
    console.error('Update failed:', err)
  }
}

// Supprimer
const handleDelete = async (id: string) => {
  try {
    await del(id)
  } catch (err) {
    console.error('Delete failed:', err)
  }
}
```

## Séparation Visitor vs Authenticated

Pour séquences (visitor peut créer sans compte) :

```typescript
// ✅ CORRECT - Unification DB + IndexedDB
import { useSequencesWithVisitor } from '@/hooks'

const { sequences, loading, error, create } = useSequencesWithVisitor()
// Fonctionne en visitor (local) ET authenticated (DB)

// ❌ ÉVITER sauf besoin spécifique
import { useSequences } from '@/hooks' // DB seulement
import { useSequencesLocal } from '@/hooks' // IndexedDB seulement
```

## Exports centralisés

**Toujours importer depuis `@/hooks`** :

```typescript
// ✅ CORRECT
import { useBankCards, usePersonalCards, useAuth } from '@/hooks'

// ❌ INTERDIT
import { useBankCards } from '@/hooks/useBankCards'
import { useAuth } from '@/hooks/auth/useAuth'
```

Tous les hooks sont exportés dans `src/hooks/index.ts`
