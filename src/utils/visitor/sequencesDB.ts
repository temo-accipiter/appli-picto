/**
 * sequencesDB.ts — Couche IndexedDB pour les séquences Visitor local-only.
 *
 * ⚠️ SCOPE STRICT : Visitor uniquement
 * - Utilisateurs authentifiés (Free/Subscriber/Admin) utilisent Supabase
 * - Cette couche ne doit JAMAIS être appelée pour des utilisateurs connectés
 *
 * ⚠️ RÈGLES LOCALES VISITOR (pas de DB cloud)
 * - Min 2 étapes par séquence (enforcement local)
 * - Pas de doublons step_card_id dans une séquence (enforcement local)
 * - Position unique par séquence (enforcement local)
 * - Ownership : une séquence par mother_card_id (enforcement local)
 *
 * ⚠️ PERSISTANCE
 * - DB IndexedDB : `appli-picto-visitor`
 * - Version 1 (migrations futures via onupgradeneeded)
 * - Tables : `sequences`, `sequence_steps`
 *
 * ⚠️ IMPORT VISITOR → COMPTE
 * - Hors scope Ticket 3 (futur Ticket 4)
 * - Cette couche prépare les données pour un import ultérieur
 */

const DB_NAME = 'appli-picto-visitor'
const DB_VERSION = 3 // Version 3 : ajout tables sessions + validations (partagée avec sessionsDB.ts)
const STORE_SEQUENCES = 'sequences'
const STORE_STEPS = 'sequence_steps'
const STORE_SLOTS = 'visitor_slots' // Table slots (créée par slotsDB.ts)

/** Séquence locale Visitor */
export interface VisitorSequence {
  id: string // UUID généré localement
  mother_card_id: string // FK vers carte (banque ou perso future)
  created_at: number // timestamp
}

/** Étape de séquence locale Visitor */
export interface VisitorSequenceStep {
  id: string // UUID généré localement
  sequence_id: string // FK locale vers VisitorSequence
  step_card_id: string // FK vers carte
  position: number // 0, 1, 2...
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
        '[sequencesDB] VersionError détectée, suppression et recréation de la DB...'
      )

      // Supprimer l'ancienne DB
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME)
        deleteRequest.onsuccess = () => resolve()
        deleteRequest.onerror = () => reject(deleteRequest.error)
        deleteRequest.onblocked = () => {
          console.warn('[sequencesDB] Suppression DB bloquée, retry...')
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

      // Version 1 : Tables sequences + sequence_steps
      if (oldVersion < 1) {
        // Table sequences
        if (!db.objectStoreNames.contains(STORE_SEQUENCES)) {
          const seqStore = db.createObjectStore(STORE_SEQUENCES, {
            keyPath: 'id',
          })
          seqStore.createIndex('mother_card_id', 'mother_card_id', {
            unique: true,
          })
        }

        // Table sequence_steps
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

      // Version 2 : Ajout table visitor_slots (partagée avec slotsDB.ts)
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_SLOTS)) {
          const slotsStore = db.createObjectStore(STORE_SLOTS, {
            keyPath: 'id',
          })
          slotsStore.createIndex('timeline_id', 'timeline_id', {
            unique: false,
          })
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
// CRUD SEQUENCES
// ============================================================

/**
 * Récupère toutes les séquences Visitor.
 */
export async function getAllSequences(): Promise<VisitorSequence[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SEQUENCES, 'readonly')
    const store = tx.objectStore(STORE_SEQUENCES)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result ?? [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Récupère la séquence pour une carte mère (0 ou 1).
 */
export async function getSequenceByMotherCardId(
  motherCardId: string
): Promise<VisitorSequence | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SEQUENCES, 'readonly')
    const store = tx.objectStore(STORE_SEQUENCES)
    const index = store.index('mother_card_id')
    const request = index.get(motherCardId)

    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Crée une séquence pour une carte mère.
 * @throws Error si une séquence existe déjà pour cette carte
 */
export async function createSequence(
  motherCardId: string
): Promise<VisitorSequence> {
  // Vérifier qu'il n'existe pas déjà une séquence pour cette carte
  const existing = await getSequenceByMotherCardId(motherCardId)
  if (existing) {
    throw new Error('Une séquence existe déjà pour cette carte.')
  }

  const sequence: VisitorSequence = {
    id: generateUUID(),
    mother_card_id: motherCardId,
    created_at: Date.now(),
  }

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SEQUENCES, 'readwrite')
    const store = tx.objectStore(STORE_SEQUENCES)
    const request = store.add(sequence)

    request.onsuccess = () => resolve(sequence)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Crée une séquence Visitor avec ses étapes initiales dans une seule transaction IndexedDB.
 * @throws Error si <2 étapes, doublon, ou séquence déjà existante
 */
export async function createSequenceWithSteps(
  motherCardId: string,
  stepCardIds: string[]
): Promise<VisitorSequence> {
  const distinctIds = new Set(stepCardIds)

  if (stepCardIds.length < 2) {
    throw new Error('La séquence doit avoir au moins 2 étapes.')
  }

  if (distinctIds.size !== stepCardIds.length) {
    throw new Error('Cette carte est déjà dans la séquence.')
  }

  const existing = await getSequenceByMotherCardId(motherCardId)
  if (existing) {
    throw new Error('Une séquence existe déjà pour cette carte.')
  }

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
    const tx = db.transaction([STORE_SEQUENCES, STORE_STEPS], 'readwrite')
    const seqStore = tx.objectStore(STORE_SEQUENCES)
    const stepsStore = tx.objectStore(STORE_STEPS)

    seqStore.add(sequence)
    steps.forEach(step => stepsStore.add(step))

    tx.oncomplete = () => resolve(sequence)
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Supprime une séquence (CASCADE supprime aussi les étapes).
 */
export async function deleteSequence(sequenceId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SEQUENCES, STORE_STEPS], 'readwrite')

    // Supprimer les étapes liées
    const stepsStore = tx.objectStore(STORE_STEPS)
    const stepsIndex = stepsStore.index('sequence_id')
    const stepsRequest = stepsIndex.openCursor(IDBKeyRange.only(sequenceId))

    stepsRequest.onsuccess = () => {
      const cursor = stepsRequest.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    // Supprimer la séquence
    const seqStore = tx.objectStore(STORE_SEQUENCES)
    seqStore.delete(sequenceId)

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ============================================================
// CRUD SEQUENCE_STEPS
// ============================================================

/**
 * Récupère toutes les étapes d'une séquence, triées par position ASC.
 */
export async function getSequenceSteps(
  sequenceId: string
): Promise<VisitorSequenceStep[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STEPS, 'readonly')
    const store = tx.objectStore(STORE_STEPS)
    const index = store.index('sequence_id')
    const request = index.getAll(sequenceId)

    request.onsuccess = () => {
      const steps = (request.result ?? []) as VisitorSequenceStep[]
      // Trier par position ASC
      steps.sort((a, b) => a.position - b.position)
      resolve(steps)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Ajoute une étape à une séquence.
 * Position = max actuel + 1.
 * @throws Error si la carte est déjà dans la séquence (doublon)
 * @throws Error si la séquence aurait < 2 étapes après suppression (guard local)
 */
export async function addSequenceStep(
  sequenceId: string,
  stepCardId: string
): Promise<VisitorSequenceStep> {
  // Récupérer les étapes actuelles
  const existingSteps = await getSequenceSteps(sequenceId)

  // Vérifier pas de doublon
  if (existingSteps.some(s => s.step_card_id === stepCardId)) {
    throw new Error('Cette carte est déjà dans la séquence.')
  }

  // Calculer nouvelle position
  const maxPosition =
    existingSteps.length > 0
      ? Math.max(...existingSteps.map(s => s.position))
      : -1
  const newPosition = maxPosition + 1

  const step: VisitorSequenceStep = {
    id: generateUUID(),
    sequence_id: sequenceId,
    step_card_id: stepCardId,
    position: newPosition,
  }

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STEPS, 'readwrite')
    const store = tx.objectStore(STORE_STEPS)
    const request = store.add(step)

    request.onsuccess = () => resolve(step)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Supprime une étape.
 * @throws Error si la séquence aurait < 2 étapes après suppression
 */
export async function removeSequenceStep(stepId: string): Promise<void> {
  const db = await openDB()

  // Récupérer l'étape à supprimer pour connaître la séquence
  const stepToDelete = await new Promise<VisitorSequenceStep | null>(
    (resolve, reject) => {
      const tx = db.transaction(STORE_STEPS, 'readonly')
      const store = tx.objectStore(STORE_STEPS)
      const request = store.get(stepId)

      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    }
  )

  if (!stepToDelete) {
    throw new Error('Étape introuvable.')
  }

  // Vérifier qu'il resterait au moins 2 étapes
  const allSteps = await getSequenceSteps(stepToDelete.sequence_id)
  if (allSteps.length <= 2) {
    throw new Error('La séquence doit avoir au moins 2 étapes.')
  }

  // Supprimer l'étape
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STEPS, 'readwrite')
    const store = tx.objectStore(STORE_STEPS)
    store.delete(stepId)

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Déplace une étape à une nouvelle position (échange avec l'étape cible).
 * Stratégie : échange des positions A ↔ B.
 */
export async function moveSequenceStep(
  stepId: string,
  newPosition: number
): Promise<void> {
  const db = await openDB()

  // Récupérer l'étape à déplacer
  const stepToMove = await new Promise<VisitorSequenceStep | null>(
    (resolve, reject) => {
      const tx = db.transaction(STORE_STEPS, 'readonly')
      const store = tx.objectStore(STORE_STEPS)
      const request = store.get(stepId)

      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    }
  )

  if (!stepToMove) {
    throw new Error('Étape introuvable.')
  }

  const oldPosition = stepToMove.position

  if (oldPosition === newPosition) return // Pas de changement

  // Récupérer toutes les étapes de la séquence
  const allSteps = await getSequenceSteps(stepToMove.sequence_id)

  // Trouver l'étape à la position cible
  const stepAtTarget = allSteps.find(s => s.position === newPosition)

  if (!stepAtTarget) {
    throw new Error('Position cible invalide.')
  }

  // Échange des positions
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STEPS, 'readwrite')
    const store = tx.objectStore(STORE_STEPS)

    // Update stepToMove.position → newPosition
    store.put({ ...stepToMove, position: newPosition })

    // Update stepAtTarget.position → oldPosition
    store.put({ ...stepAtTarget, position: oldPosition })

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
