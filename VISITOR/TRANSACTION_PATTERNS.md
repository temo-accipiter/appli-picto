# Transaction Patterns Appli-Picto

**Document technique** : Patterns transactionnels découverts lors de l'enquête sur l'importation Visitor → Free.

---

## Vue d'ensemble

Appli-Picto utilise **3 niveaux de transactions** atomiques :

1. **IndexedDB local** (Visitor) → Transactions IndexedDB multi-store
2. **PostgreSQL cloud** (Free/Subscriber/Admin) → Transactions SQL + RPC
3. **Application layer** → Try/catch + refresh UI

---

## 1. IndexedDB Transactions (Visitor Local)

### Fichier Source

`src/utils/visitor/sequencesDB.ts`

### Pattern : Transaction Multi-Store

```typescript
function createSequenceWithSteps(
  motherCardId: string,
  stepCardIds: string[]
): Promise<VisitorSequence> {
  const sequence: VisitorSequence = {
    id: generateUUID(),
    mother_card_id: motherCardId,
    created_at: Date.now(),
  }

  const steps: VisitorSequenceStep[] = stepCardIds.map((stepCardId, index) => ({
    id: generateUUID(),
    sequence_id: sequence.id,
    step_card_id: stepCardId,
    position: index,
  }))

  const db = await openDB()
  return new Promise((resolve, reject) => {
    // ✅ TRANSACTION MULTI-STORE
    const tx = db.transaction([STORE_SEQUENCES, STORE_STEPS], 'readwrite')
    const seqStore = tx.objectStore(STORE_SEQUENCES)
    const stepsStore = tx.objectStore(STORE_STEPS)

    // Tous les INSERTs dans une seule transaction
    seqStore.add(sequence)
    steps.forEach(step => stepsStore.add(step))

    // ✅ ATOMICITÉ GARANTIE
    tx.oncomplete = () => resolve(sequence) // Tout réussit
    tx.onerror = () => reject(tx.error) // Tout revient en arrière
  })
}
```

### Atomicité Garantie

- ✅ **Tout ou rien** : Si une insertion échoue, toutes les autres sont annulées
- ✅ **ACID local** : Données cohérentes dans IndexedDB
- ✅ **Isolation** : Autres onglets voient état pré-transaction
- ✅ **Durabilité** : Données persistées sur disque utilisateur

### Exemple Rollback Automatique

```typescript
// Scénario : Créer séquence avec 2 étapes
// Étape 1 ajout : SUCCESS
// Étape 2 ajout : ERREUR (UNIQUE violation)
// → RÉSULTAT : ROLLBACK automatique
//   - Séquence supprimée
//   - Étape 1 supprimée
//   - État initial restauré
```

---

## 2. PostgreSQL RPC Transactions (Cloud)

### Fichier Source

`supabase/migrations/20260315113000_phase7_10_atomic_sequence_rpc.sql`

### Pattern : RPC avec Transaction SQL Implicite

```sql
CREATE OR REPLACE FUNCTION public.create_sequence_with_steps(
  p_mother_card_id UUID,
  p_step_card_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id UUID;
  v_sequence_id UUID;
  v_step_count INTEGER;
  v_distinct_step_count INTEGER;
BEGIN
  -- 1. VALIDATION
  v_account_id := auth.uid();

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_write_sequences() THEN
    RAISE EXCEPTION 'Access denied: sequence creation not allowed'
      USING ERRCODE = '42501';
  END IF;

  -- Validation paramètres
  SELECT COUNT(*), COUNT(DISTINCT step_card_id)
  INTO v_step_count, v_distinct_step_count
  FROM unnest(p_step_card_ids) AS input(step_card_id);

  IF v_step_count < 2 THEN
    RAISE EXCEPTION 'At least 2 steps required'
      USING ERRCODE = '23514';
  END IF;

  IF v_distinct_step_count <> v_step_count THEN
    RAISE EXCEPTION 'Duplicate step_card_id detected'
      USING ERRCODE = '23505';
  END IF;

  -- 2. CRÉER SÉQUENCE (avec RETURNING)
  INSERT INTO public.sequences (account_id, mother_card_id)
  VALUES (v_account_id, p_mother_card_id)
  RETURNING id INTO v_sequence_id;

  -- 3. CRÉER ÉTAPES (ORDER BY pour stabilité)
  INSERT INTO public.sequence_steps (sequence_id, step_card_id, position)
  SELECT
    v_sequence_id,
    input.step_card_id,
    input.ordinality - 1
  FROM unnest(p_step_card_ids) WITH ORDINALITY AS input(step_card_id, ordinality)
  ORDER BY input.ordinality;

  -- 4. RETOURNER ID
  RETURN v_sequence_id;

-- 5. GESTION ERREURS (ROLLBACK AUTOMATIQUE)
EXCEPTION
  WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
    IF v_constraint_name = 'unique_sequence_per_account_mother' THEN
      RAISE EXCEPTION
        'Sequence already exists for mother_card_id %',
        p_mother_card_id
        USING HINT = 'Use replace_sequence_steps(...) to update.';
    END IF;
    RAISE;
  WHEN OTHERS THEN
    RAISE;
END;
$$;
```

### Atomicité Garantie

- ✅ **Transaction SQL implicite** : Tout appel RPC = 1 transaction
- ✅ **All-or-nothing** : Si INSERT étape échoue, INSERT séquence annulé
- ✅ **ACID complet** : Données cohérentes dans PostgreSQL
- ✅ **Rollback automatique** : Exception → ROLLBACK transaction
- ✅ **Constraints appliquées** : UNIQUE, NOT NULL, RLS, triggers

### Points Critiques

1. **RETURNING clause** :

   ```sql
   INSERT INTO public.sequences (...)
   VALUES (...)
   RETURNING id INTO v_sequence_id;
   ```

   - Récupère l'ID généré pour l'utiliser dans étapes suivantes
   - Atomique : l'ID ne peut pas être utilisé par autre transaction en parallèle

2. **ORDER BY dans INSERT** :

   ```sql
   FROM unnest(p_step_card_ids) WITH ORDINALITY AS input(...)
   ORDER BY input.ordinality;
   ```

   - Garantit positions stables (0, 1, 2...)
   - Même ordre quel que soit le réseau / timing

3. **Exception Handling** :

   ```sql
   EXCEPTION WHEN unique_violation THEN ... RAISE;
   ```

   - Capture constraint violations
   - Rollback automatique avant RAISE
   - Message d'erreur au client

---

## 3. Application Layer (Hook React)

### Fichier Source

`src/hooks/useSequences.ts` (cloud)
`src/hooks/useSequencesLocal.ts` (local)

### Pattern : Async/Await + Try/Catch

```typescript
// CLOUD VERSION
const createSequence = useCallback(
  async (
    motherCardId: string,
    stepCardIds: string[]
  ): Promise<ActionResult & { id: string | null }> => {
    // Appeler RPC atomique
    const { data, error: createError } = await supabase.rpc(
      'create_sequence_with_steps',
      {
        p_mother_card_id: motherCardId,
        p_step_card_ids: stepCardIds,
      }
    )

    // Gestion résultat
    if (!createError) {
      refresh() // Rafraîchir données locales
    }

    return {
      id: data ?? null,
      error: createError as Error | null,
    }
  },
  [refresh]
)

// LOCAL VERSION
const createSequence = useCallback(
  async (
    motherCardId: string,
    stepCardIds: string[]
  ): Promise<ActionResult & { id: string | null }> => {
    try {
      const newSequence = await sequencesDB.createSequenceWithSteps(
        motherCardId,
        stepCardIds
      )

      refresh() // Rafraîchir état React

      return {
        id: newSequence.id,
        error: null,
      }
    } catch (err) {
      console.error('[useSequencesLocal] Erreur création séquence:', err)
      return {
        id: null,
        error: err as Error,
      }
    }
  },
  [refresh]
)
```

### Pattern Erreur

```typescript
// Dans un composant utilisant le hook
const { sequences, createSequence } = useSequences()

const handleCreate = async data => {
  const { id, error } = await createSequence(
    data.motherCardId,
    data.stepCardIds
  )

  if (error) {
    // Gestion erreur : afficher toast, modal, etc.
    if (error.message.includes('Access denied')) {
      showModal('ModalReserveBadge') // Afficher "Réservé Subscriber"
    } else if (error.message.includes('duplicate')) {
      showToast('Cette séquence existe déjà', 'error')
    } else {
      showToast(error.message, 'error')
    }
    return
  }

  // Succès : rafraîchir UI
  showToast('Séquence créée!', 'success')
}
```

---

## 4. Patterns Spécialisés : Replace Sequences

### Fichier Source

`supabase/migrations/20260315113000_phase7_10_atomic_sequence_rpc.sql` (lignes 158-290)

### Pattern : DELETE + INSERT dans Transaction

```sql
CREATE OR REPLACE FUNCTION public.replace_sequence_steps(
  p_sequence_id UUID,
  p_step_card_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- ... VALIDATION ...

  -- 1. LOCK la séquence (FOR UPDATE)
  SELECT s.id INTO v_locked_sequence_id
  FROM public.sequences s
  WHERE s.id = p_sequence_id AND s.account_id = v_account_id
  FOR UPDATE;  -- ✅ Empêche race conditions

  IF v_locked_sequence_id IS NULL THEN
    RAISE EXCEPTION 'Sequence not found or inaccessible'
      USING ERRCODE = '42501';
  END IF;

  -- 2. SUPPRIMER TOUTES ÉTAPES
  DELETE FROM public.sequence_steps
  WHERE sequence_id = p_sequence_id;

  -- 3. INSÉRER NOUVELLES ÉTAPES
  INSERT INTO public.sequence_steps (sequence_id, step_card_id, position)
  SELECT
    p_sequence_id,
    input.step_card_id,
    input.ordinality - 1
  FROM unnest(p_step_card_ids) WITH ORDINALITY AS input(...)
  ORDER BY input.ordinality;

  -- 4. UPDATE timestamp
  UPDATE public.sequences
  SET updated_at = NOW()
  WHERE id = p_sequence_id;

EXCEPTION
  WHEN unique_violation THEN ... RAISE;
END;
$$;
```

### Techniques de Robustesse

1. **FOR UPDATE** (ligne 244-246) :

   ```sql
   SELECT s.id INTO v_locked_sequence_id
   FROM public.sequences s
   WHERE s.id = p_sequence_id AND s.account_id = v_account_id
   FOR UPDATE;  -- LOCK la ligne
   ```

   - Empêche concurrent DELETE/UPDATE d'autres transactions
   - Garantit cohérence entre validation et modifications

2. **DELETE puis INSERT** (lignes 256-265) :

   ```sql
   DELETE FROM public.sequence_steps WHERE sequence_id = p_sequence_id;
   INSERT INTO public.sequence_steps (...) SELECT ... FROM unnest(...);
   ```

   - Atomique : tout ou rien
   - Si INSERT échoue, DELETE reste en vigueur mais transaction rollback

3. **Trigger Check** :
   - Trigger `sequences_enforce_min_two_steps` vérifie min 2 étapes après INSERT
   - Si violation → Exception → Rollback automatique

---

## 5. Offline Queue Pattern

### Fichier Source

`src/contexts/OfflineContext.tsx`

### Pattern : Queue Durable + Sync

```typescript
// 1. DÉFINITION
interface PendingValidation {
  id: string // Unique local
  sessionId: string // FK session
  slotId: string // FK slot
  enqueuedAt: number // Timestamp
}

// 2. PERSISTANCE (localStorage)
function loadQueue(): PendingValidation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(queue: PendingValidation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch {
    // Silencieux (mode privé)
  }
}

// 3. SYNCHRONISATION (au retour réseau)
const flushQueue = useCallback(async () => {
  const queue = loadQueue()

  const failed: PendingValidation[] = []

  for (const entry of queue) {
    try {
      const { error } = await supabase.from('session_validations').insert({
        session_id: entry.sessionId,
        slot_id: entry.slotId,
      })

      // Code 23505 = UNIQUE violation → OK (fusion monotone)
      if (error && error.code !== '23505') {
        failed.push(entry)
      }
    } catch {
      failed.push(entry)
    }
  }

  // 4. NETTOYAGE (si tout OK)
  if (failed.length === 0) {
    clearQueue()
  } else {
    saveQueue(failed)
  }
}, [])
```

### Atomicité garantie

- ✅ **Queue locale** : Données non perdues même si offline
- ✅ **Idempotence DB** : UNIQUE constraint
- ✅ **Fusion monotone** : Progression ne régresse jamais
- ✅ **Retry automatique** : Failed items restent en queue

---

## 6. Patterns Anti-Corruption

### Pattern : Validation AVANT Transaction

```typescript
// ❌ ANTI-PATTERN : Valider APRÈS
try {
  const { data, error } = await supabase.rpc('create_sequence_with_steps', {...})
  if (error) { /* gérer */ }
} catch (err) { /* réseau */ }

// ✅ BON : Valider AVANT
const validationErrors = []
if (!motherCardId) validationErrors.push('mother_card_id required')
if (!stepCardIds || stepCardIds.length < 2) validationErrors.push('>=2 steps required')
if (new Set(stepCardIds).size !== stepCardIds.length) validationErrors.push('no duplicates')

if (validationErrors.length > 0) {
  throw new Error(validationErrors.join(', '))  // Fast-fail
}

// Maintenant appeler RPC
const { data, error } = await supabase.rpc(...)
```

### Pattern : Débounce pour Retry

```typescript
// Dans OfflineContext
const isFlushing = useRef(false)

const flushQueue = useCallback(async () => {
  if (isFlushing.current) return // ✅ Empêche flush concurrents
  isFlushing.current = true

  try {
    // ... flush ...
  } finally {
    isFlushing.current = false
  }
}, [])
```

---

## 7. Patterns à Éviter

### ❌ Anti-pattern 1 : Transaction Multi-Requête

```typescript
// ❌ MAUVAIS
const seqId = await createSequence(motherCardId) // Requête 1
await addStep(seqId, stepCardId1) // Requête 2
await addStep(seqId, stepCardId2) // Requête 3
// → Si requête 2 échoue, on a séquence + 1 étape orpheline

// ✅ BON
const { id: seqId } = await createSequenceWithSteps(
  motherCardId,
  [stepCardId1, stepCardId2] // Tout en UNE requête RPC
)
```

### ❌ Anti-pattern 2 : Effacer localStorage Prématurément

```typescript
// ❌ MAUVAIS
await importVisitorSequences()
localStorage.clear() // Effacer AVANT import complet
// → Si import échoue, données perdues

// ✅ BON
try {
  const results = await Promise.all([...imports])
  if (results.every(r => !r.error)) {
    localStorage.clear() // Effacer APRÈS succès confirmé
  }
} catch (error) {
  // Garder localStorage intact
  throw error
}
```

### ❌ Anti-pattern 3 : Ignorer Autorisation DB

```typescript
// ❌ MAUVAIS
// Vérifier côté frontend uniquement
if (useAccountStatus().isFree) {
  showToast('Réservé Subscriber')
  return
}
// Appeler RPC quand même (peut réussir par contournement)

// ✅ BON
// Laisser la DB faire autorisation
const { error } = await supabase.rpc('create_sequence_with_steps', {...})
if (error && error.code === '42501') {
  // RLS a bloqué → afficher message
  showToast('Accès refusé', 'error')
}
```

---

## 8. Checkpoints Critiques pour Import Futur (Ticket 4)

### 1. Pré-import Validation

```typescript
// Vérifier indexedDB accessible
const visitorSeqs = await getAllSequences()
if (!visitorSeqs || visitorSeqs.length === 0) {
  showToast('Aucune donnée Visitor à importer', 'info')
  return
}

// Vérifier user authentifié
if (!user || !authReady) {
  throw new Error('Auth required')
}

// Vérifier capacité imports
if (isFree && visitorSeqs.length > 5) {
  showModal('QuotaExceeded')
  return
}
```

### 2. Import Atomique par Séquence

```typescript
const importResults = []
for (const visitorSeq of visitorSeqs) {
  try {
    const steps = await getSequenceSteps(visitorSeq.id)
    const stepCardIds = steps.map(s => s.step_card_id)

    const { data: newSeqId, error } = await supabase.rpc(
      'create_sequence_with_steps',
      {
        p_mother_card_id: visitorSeq.mother_card_id,
        p_step_card_ids: stepCardIds,
      }
    )

    if (error) throw error

    importResults.push({ id: visitorSeq.id, success: true, newId: newSeqId })
  } catch (error) {
    importResults.push({ id: visitorSeq.id, success: false, error })
  }
}
```

### 3. Post-import Cleanup

```typescript
// SEULEMENT si tout succès
const allSuccess = importResults.every(r => r.success)

if (allSuccess) {
  // Vider IndexedDB
  for (const seq of visitorSeqs) {
    await deleteSequence(seq.id)
  }
  showToast('Import réussi!', 'success')
} else {
  // Garder IndexedDB intact
  const failedCount = importResults.filter(r => !r.success).length
  showToast(`Import partiel: ${failedCount} erreurs`, 'warning')
}
```

---

## Conclusion

**Appli-Picto dispose de patterns transactionnels solides** :

- ✅ IndexedDB transactions multi-store
- ✅ PostgreSQL RPC avec validation préalable
- ✅ Try/catch au niveau hook
- ✅ Offline queue avec idempotence
- ✅ Lock (FOR UPDATE) contre race conditions

**Pour Ticket 4 (Import Visitor → Free)**, réutiliser ces patterns :

1. Transactions IndexedDB pour charger données locales
2. RPC `create_sequence_with_steps()` pour créer en cloud
3. Try/catch + cleanup conditionnel
4. Feedback utilisateur via toast/modal
