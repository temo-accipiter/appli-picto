/**
 * slotsDB.ts — Couche IndexedDB pour les slots Visitor local-only.
 *
 * ⚠️ SCOPE STRICT : Visitor uniquement
 * - Utilisateurs authentifiés (Free/Subscriber/Admin) utilisent Supabase
 * - Cette couche ne doit JAMAIS être appelée pour des utilisateurs connectés
 *
 * ⚠️ RÈGLES LOCALES VISITOR (pas de DB cloud)
 * - Timeline fixe : 'visitor-timeline-local'
 * - Position unique par timeline (enforcement local)
 * - Tokens : 0-5 pour kind='step', null pour kind='reward'
 *
 * ⚠️ PERSISTANCE
 * - DB IndexedDB : `appli-picto-visitor`
 * - Version 2 (ajout table visitor_slots)
 * - Table : `visitor_slots`
 *
 * ⚠️ INITIALISATION
 * - Au premier chargement, crée 3 slots par défaut (vides)
 * - 2 étapes (tokens=0) + 1 récompense (tokens=null)
 */

const DB_NAME = 'appli-picto-visitor'
const DB_VERSION = 3 // Version 3 : ajout tables sessions + validations (partagée avec sessionsDB.ts)
const STORE_SEQUENCES = 'sequences'
const STORE_STEPS = 'sequence_steps'
const STORE_SLOTS = 'visitor_slots'
const VISITOR_TIMELINE_ID = 'visitor-timeline-local'

/** Slot local Visitor (structure identique à Supabase) */
export interface VisitorSlot {
  id: string // UUID généré localement
  timeline_id: string // Toujours 'visitor-timeline-local'
  kind: 'step' | 'reward'
  position: number // 0, 1, 2...
  card_id: string | null // FK vers carte (banque uniquement pour visitor)
  tokens: number | null // 0-5 pour step, null pour reward
  created_at: number // timestamp
  updated_at: number // timestamp
}

/**
 * Ouvre ou crée la DB IndexedDB Visitor (avec fallback robuste).
 *
 * ⚠️ GESTION ERREURS ROBUSTE
 * - Si VersionError : supprime l'ancienne DB et recrée une neuve
 * - Pour un visitor, mieux vaut perdre les données locales que bloquer l'app
 */
async function openDB(): Promise<IDBDatabase> {
  try {
    return await openDBInternal()
  } catch (error) {
    // Si VersionError ou erreur d'ouverture, supprimer et recréer la DB
    if (
      error instanceof Error &&
      (error.name === 'VersionError' ||
        error.message.includes('version') ||
        error.message.includes('existing version'))
    ) {
      console.warn(
        '[slotsDB] VersionError détectée, suppression et recréation de la DB...'
      )

      // Supprimer l'ancienne DB
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME)
        deleteRequest.onsuccess = () => resolve()
        deleteRequest.onerror = () => reject(deleteRequest.error)
        deleteRequest.onblocked = () => {
          console.warn('[slotsDB] Suppression DB bloquée, retry...')
          // Attendre un peu et résoudre quand même
          setTimeout(() => resolve(), 500)
        }
      })

      // Recréer la DB
      return await openDBInternal()
    }

    // Autre erreur : propager
    throw error
  }
}

/** Fonction interne d'ouverture DB (sans fallback) */
function openDBInternal(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result
      const oldVersion = event.oldVersion

      // Version 1 : Tables sequences + sequence_steps (partagées avec sequencesDB.ts)
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_SEQUENCES)) {
          const seqStore = db.createObjectStore(STORE_SEQUENCES, {
            keyPath: 'id',
          })
          seqStore.createIndex('mother_card_id', 'mother_card_id', {
            unique: true,
          })
        }

        if (!db.objectStoreNames.contains(STORE_STEPS)) {
          const stepsStore = db.createObjectStore(STORE_STEPS, {
            keyPath: 'id',
          })
          stepsStore.createIndex('sequence_id', 'sequence_id', {
            unique: false,
          })
          stepsStore.createIndex(
            'sequence_step_card',
            ['sequence_id', 'step_card_id'],
            { unique: true }
          )
          stepsStore.createIndex(
            'sequence_position',
            ['sequence_id', 'position'],
            {
              unique: true,
            }
          )
        }
      }

      // Version 2 : Ajout table visitor_slots
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_SLOTS)) {
          const slotsStore = db.createObjectStore(STORE_SLOTS, {
            keyPath: 'id',
          })
          // Index pour récupérer tous les slots d'une timeline
          slotsStore.createIndex('timeline_id', 'timeline_id', {
            unique: false,
          })
          // Index composite pour UNIQUE(timeline_id, position)
          slotsStore.createIndex(
            'timeline_position',
            ['timeline_id', 'position'],
            {
              unique: true,
            }
          )
        }
      }

      // Version 3 : Ajout tables visitor_sessions + visitor_session_validations (partagée avec sessionsDB.ts)
      if (oldVersion < 3) {
        // Table sessions
        if (!db.objectStoreNames.contains('visitor_sessions')) {
          const sessionsStore = db.createObjectStore('visitor_sessions', {
            keyPath: 'id',
          })
          sessionsStore.createIndex(
            'child_timeline',
            ['child_profile_id', 'timeline_id'],
            { unique: false }
          )
          sessionsStore.createIndex('state', 'state', { unique: false })
        }

        // Table validations
        if (!db.objectStoreNames.contains('visitor_session_validations')) {
          const validationsStore = db.createObjectStore('visitor_session_validations', {
            keyPath: 'id',
          })
          validationsStore.createIndex('session_id', 'session_id', {
            unique: false,
          })
          validationsStore.createIndex(
            'session_slot',
            ['session_id', 'slot_id'],
            { unique: true }
          )
        }
      }
    }
  })
}

/** Génère un UUID v4 simple (local-only) */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ============================================================
// CRUD SLOTS
// ============================================================

/**
 * Récupère tous les slots Visitor (triés par position ASC).
 */
export async function getAllSlots(): Promise<VisitorSlot[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SLOTS, 'readonly')
    const store = tx.objectStore(STORE_SLOTS)
    const index = store.index('timeline_id')
    const request = index.getAll(VISITOR_TIMELINE_ID)

    request.onsuccess = () => {
      const slots = (request.result ?? []) as VisitorSlot[]
      // Trier par position ASC
      slots.sort((a, b) => a.position - b.position)
      resolve(slots)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Crée un slot en dernière position.
 * @param kind - 'step' ou 'reward'
 * @returns Le slot créé
 */
export async function createSlot(
  kind: 'step' | 'reward'
): Promise<VisitorSlot> {
  const slots = await getAllSlots()
  const maxPosition = slots.reduce(
    (max, slot) => (slot.position > max ? slot.position : max),
    -1
  )
  const nextPosition = maxPosition + 1

  const slot: VisitorSlot = {
    id: generateUUID(),
    timeline_id: VISITOR_TIMELINE_ID,
    kind,
    position: nextPosition,
    card_id: null,
    tokens: kind === 'step' ? 0 : null,
    created_at: Date.now(),
    updated_at: Date.now(),
  }

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SLOTS, 'readwrite')
    const store = tx.objectStore(STORE_SLOTS)
    const request = store.add(slot)

    request.onsuccess = () => resolve(slot)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Met à jour un slot (carte assignée et/ou tokens).
 * @param id - ID du slot
 * @param updates - Champs à modifier
 */
export async function updateSlot(
  id: string,
  updates: { card_id?: string | null; tokens?: number | null }
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SLOTS, 'readwrite')
    const store = tx.objectStore(STORE_SLOTS)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const slot = getRequest.result as VisitorSlot | undefined
      if (!slot) {
        reject(new Error('Slot non trouvé'))
        return
      }

      // Appliquer les mises à jour
      const updatedSlot: VisitorSlot = {
        ...slot,
        ...updates,
        updated_at: Date.now(),
      }

      const putRequest = store.put(updatedSlot)
      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => reject(putRequest.error)
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

/**
 * Supprime un slot.
 * @param id - ID du slot à supprimer
 */
export async function deleteSlot(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SLOTS, 'readwrite')
    const store = tx.objectStore(STORE_SLOTS)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Retire toutes les cartes assignées (card_id → NULL).
 */
export async function clearAllCards(): Promise<void> {
  const slots = await getAllSlots()
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SLOTS, 'readwrite')
    const store = tx.objectStore(STORE_SLOTS)

    let processed = 0
    let hasError = false

    for (const slot of slots) {
      const updatedSlot: VisitorSlot = {
        ...slot,
        card_id: null,
        // Réinitialiser tokens à 0 pour les steps
        tokens: slot.kind === 'step' ? 0 : null,
        updated_at: Date.now(),
      }

      const request = store.put(updatedSlot)

      request.onsuccess = () => {
        processed++
        if (processed === slots.length && !hasError) {
          resolve()
        }
      }

      request.onerror = () => {
        hasError = true
        reject(request.error)
      }
    }

    // Si aucun slot, resolve immédiatement
    if (slots.length === 0) {
      resolve()
    }
  })
}

/**
 * Initialise 3 slots par défaut si la table est vide.
 * Appelé au premier chargement.
 * @returns true si des slots ont été créés, false sinon
 */
export async function initializeDefaultSlots(): Promise<boolean> {
  const slots = await getAllSlots()

  // Si des slots existent déjà, ne rien faire
  if (slots.length > 0) {
    return false
  }

  // Créer 2 étapes + 1 récompense (vides)
  await createSlot('step') // Position 0
  await createSlot('step') // Position 1
  await createSlot('reward') // Position 2

  return true
}
