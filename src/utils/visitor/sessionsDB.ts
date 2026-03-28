/**
 * sessionsDB.ts — Couche IndexedDB pour les sessions et validations Visitor local-only.
 *
 * ⚠️ SCOPE STRICT : Visitor uniquement
 * - Utilisateurs authentifiés (Free/Subscriber/Admin) utilisent Supabase
 * - Cette couche ne doit JAMAIS être appelée pour des utilisateurs connectés
 *
 * ⚠️ RÈGLES LOCALES VISITOR (pas de DB cloud)
 * - child_profile_id fixe : 'visitor-local'
 * - timeline_id fixe : 'visitor-timeline-local'
 * - 1 seule session active max (state = 'active_started')
 * - Validations : UNIQUE(session_id, slot_id)
 *
 * ⚠️ PERSISTANCE
 * - DB IndexedDB : `appli-picto-visitor`
 * - Version 3 (ajout tables visitor_sessions + visitor_session_validations)
 * - Tables : `visitor_sessions`, `visitor_session_validations`
 *
 * ⚠️ ÉTATS SESSION
 * - active_preview : session créée mais pas encore démarrée
 * - active_started : session en cours (au moins 1 validation)
 * - completed : session terminée (toutes les étapes validées)
 */

const DB_NAME = 'appli-picto-visitor'
const DB_VERSION = 3 // Version 3 : ajout tables sessions + validations
const STORE_SEQUENCES = 'sequences'
const STORE_STEPS = 'sequence_steps'
const STORE_SLOTS = 'visitor_slots'
const STORE_SESSIONS = 'visitor_sessions'
const STORE_VALIDATIONS = 'visitor_session_validations'

const VISITOR_CHILD_PROFILE_ID = 'visitor-local'
const VISITOR_TIMELINE_ID = 'visitor-timeline-local'

/** Session locale Visitor (structure identique à Supabase) */
export interface VisitorSession {
  id: string // UUID généré localement
  child_profile_id: string // Toujours 'visitor-local'
  timeline_id: string // Toujours 'visitor-timeline-local'
  state: 'active_preview' | 'active_started' | 'completed'
  epoch: number // Monotone (pas utilisé en visitor mono-device)
  steps_total_snapshot: number | null // Nombre total d'étapes au moment du démarrage
  created_at: number // timestamp
  updated_at: number // timestamp
}

/** Validation de session locale Visitor (structure identique à Supabase) */
export interface VisitorSessionValidation {
  id: string // UUID généré localement
  session_id: string // FK vers VisitorSession
  slot_id: string // FK vers slot validé
  validated_at: number // timestamp
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
        '[sessionsDB] VersionError détectée, suppression et recréation de la DB...'
      )

      // Supprimer l'ancienne DB
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME)
        deleteRequest.onsuccess = () => resolve()
        deleteRequest.onerror = () => reject(deleteRequest.error)
        deleteRequest.onblocked = () => {
          console.warn('[sessionsDB] Suppression DB bloquée, retry...')
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

      // Version 3 : Ajout tables visitor_sessions + visitor_session_validations
      if (oldVersion < 3) {
        // Table sessions
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          const sessionsStore = db.createObjectStore(STORE_SESSIONS, {
            keyPath: 'id',
          })
          // Index pour récupérer la session par (child_profile_id, timeline_id)
          sessionsStore.createIndex(
            'child_timeline',
            ['child_profile_id', 'timeline_id'],
            { unique: false }
          )
          // Index pour récupérer les sessions actives
          sessionsStore.createIndex('state', 'state', { unique: false })
        }

        // Table validations
        if (!db.objectStoreNames.contains(STORE_VALIDATIONS)) {
          const validationsStore = db.createObjectStore(STORE_VALIDATIONS, {
            keyPath: 'id',
          })
          // Index pour récupérer toutes les validations d'une session
          validationsStore.createIndex('session_id', 'session_id', {
            unique: false,
          })
          // Index composite pour UNIQUE(session_id, slot_id)
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

/** Génère un UUID v4 avec préfixe visitor (pour identification facile) */
function generateUUID(): string {
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
  return `visitor-${uuid}`
}

// ============================================================
// CRUD SESSIONS
// ============================================================

/**
 * Récupère la session active pour visitor (1 seule possible).
 * @returns La session active (active_preview ou active_started) ou null
 */
export async function getActiveSession(): Promise<VisitorSession | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, 'readonly')
    const store = tx.objectStore(STORE_SESSIONS)
    const index = store.index('child_timeline')
    const request = index.getAll([
      VISITOR_CHILD_PROFILE_ID,
      VISITOR_TIMELINE_ID,
    ])

    request.onsuccess = () => {
      const sessions = (request.result ?? []) as VisitorSession[]
      // Chercher une session active (preview ou started)
      const activeSession = sessions.find(
        s => s.state === 'active_preview' || s.state === 'active_started'
      )
      resolve(activeSession ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Récupère la dernière session terminée pour visitor.
 * Utilisé comme fallback quand aucune session active n'existe —
 * permet d'afficher l'overlay SessionComplete après completion.
 * @returns La session completed la plus récente, ou null
 */
export async function getLastCompletedSession(): Promise<VisitorSession | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, 'readonly')
    const store = tx.objectStore(STORE_SESSIONS)
    const index = store.index('child_timeline')
    const request = index.getAll([
      VISITOR_CHILD_PROFILE_ID,
      VISITOR_TIMELINE_ID,
    ])

    request.onsuccess = () => {
      const sessions = (request.result ?? []) as VisitorSession[]
      // Trier les sessions completed par updated_at décroissant → la plus récente en premier
      const lastCompleted = sessions
        .filter(s => s.state === 'completed')
        .sort((a, b) => b.updated_at - a.updated_at)[0]
      resolve(lastCompleted ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Crée une nouvelle session (state = active_preview, epoch = 1).
 * @returns La session créée
 */
export async function createSession(): Promise<VisitorSession> {
  const session: VisitorSession = {
    id: generateUUID(),
    child_profile_id: VISITOR_CHILD_PROFILE_ID,
    timeline_id: VISITOR_TIMELINE_ID,
    state: 'active_preview',
    epoch: 1,
    steps_total_snapshot: null,
    created_at: Date.now(),
    updated_at: Date.now(),
  }

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, 'readwrite')
    const store = tx.objectStore(STORE_SESSIONS)
    const request = store.add(session)

    request.onsuccess = () => resolve(session)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Met à jour une session (state, snapshot, epoch).
 */
export async function updateSession(
  id: string,
  updates: {
    state?: 'active_preview' | 'active_started' | 'completed'
    steps_total_snapshot?: number | null
    epoch?: number
  }
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, 'readwrite')
    const store = tx.objectStore(STORE_SESSIONS)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const session = getRequest.result as VisitorSession | undefined
      if (!session) {
        reject(new Error('Session non trouvée'))
        return
      }

      const updatedSession: VisitorSession = {
        ...session,
        ...updates,
        updated_at: Date.now(),
      }

      const putRequest = store.put(updatedSession)
      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => reject(putRequest.error)
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

/**
 * Supprime TOUTES les validations d'une session (Hard Reset).
 * La session reste active mais avec 0 validations.
 */
export async function resetSessionValidations(
  sessionId: string
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VALIDATIONS, 'readwrite')
    const store = tx.objectStore(STORE_VALIDATIONS)
    const index = store.index('session_id')
    const request = index.getAllKeys(sessionId)

    request.onsuccess = () => {
      const keys = request.result ?? []
      let deleted = 0

      if (keys.length === 0) {
        resolve()
        return
      }

      for (const key of keys) {
        const deleteRequest = store.delete(key)
        deleteRequest.onsuccess = () => {
          deleted++
          if (deleted === keys.length) {
            resolve()
          }
        }
        deleteRequest.onerror = () => reject(deleteRequest.error)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

// ============================================================
// CRUD VALIDATIONS
// ============================================================

/**
 * Récupère toutes les validations d'une session.
 */
export async function getSessionValidations(
  sessionId: string
): Promise<VisitorSessionValidation[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VALIDATIONS, 'readonly')
    const store = tx.objectStore(STORE_VALIDATIONS)
    const index = store.index('session_id')
    const request = index.getAll(sessionId)

    request.onsuccess = () => {
      const validations = (request.result ?? []) as VisitorSessionValidation[]
      resolve(validations)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Valide un slot (idempotent : valider deux fois = OK).
 * Gère automatiquement la transition preview → started.
 * Calcule automatiquement le nombre total d'étapes depuis les slots.
 * @param sessionId - ID de la session
 * @param slotId - ID du slot à valider
 */
export async function validateSlot(
  sessionId: string,
  slotId: string
): Promise<void> {
  // Charger les slots pour compter le nombre d'étapes
  const { getAllSlots } = await import('./slotsDB')
  const slots = await getAllSlots()
  // ⚠️ CRITIQUE : Ne compter que les slots step avec carte assignée (§3.1.1 Tableau)
  // Les slots vides (card_id = null) sont invisibles et ne comptent pas dans la progression
  const stepsTotal = slots.filter(
    s => s.kind === 'step' && s.card_id !== null
  ).length
  const db = await openDB()

  // Vérifier si déjà validé (idempotence)
  const existingValidations = await getSessionValidations(sessionId)
  const alreadyValidated = existingValidations.some(v => v.slot_id === slotId)
  if (alreadyValidated) {
    // Déjà validé, ne rien faire (idempotent)
    return
  }

  // Récupérer la session
  const tx = db.transaction([STORE_SESSIONS, STORE_VALIDATIONS], 'readwrite')
  const sessionsStore = tx.objectStore(STORE_SESSIONS)
  const validationsStore = tx.objectStore(STORE_VALIDATIONS)

  return new Promise((resolve, reject) => {
    const getSessionRequest = sessionsStore.get(sessionId)

    getSessionRequest.onsuccess = () => {
      const session = getSessionRequest.result as VisitorSession | undefined
      if (!session) {
        reject(new Error('Session non trouvée'))
        return
      }

      // Créer la validation
      const validation: VisitorSessionValidation = {
        id: generateUUID(),
        session_id: sessionId,
        slot_id: slotId,
        validated_at: Date.now(),
      }

      const addValidationRequest = validationsStore.add(validation)

      addValidationRequest.onsuccess = async () => {
        // Si c'était la 1ère validation (preview → started), fixer le snapshot
        if (session.state === 'active_preview') {
          session.steps_total_snapshot = stepsTotal
          session.updated_at = Date.now()

          // Cas limite : 1 seule étape → la session passe directement à completed
          // sans passer par active_started (le bloc else ne serait jamais atteint)
          const validationsCount = existingValidations.length + 1
          if (stepsTotal > 0 && validationsCount >= stepsTotal) {
            session.state = 'completed'
          } else {
            session.state = 'active_started'
          }

          const updateSessionRequest = sessionsStore.put(session)
          updateSessionRequest.onsuccess = () => resolve()
          updateSessionRequest.onerror = () =>
            reject(updateSessionRequest.error)
        } else {
          // Vérifier si toutes les étapes sont validées → completed
          const validationsCount = existingValidations.length + 1 // +1 pour la validation qu'on vient d'ajouter
          if (
            session.steps_total_snapshot !== null &&
            validationsCount >= session.steps_total_snapshot
          ) {
            session.state = 'completed'
            session.updated_at = Date.now()

            const updateSessionRequest = sessionsStore.put(session)
            updateSessionRequest.onsuccess = () => resolve()
            updateSessionRequest.onerror = () =>
              reject(updateSessionRequest.error)
          } else {
            resolve()
          }
        }
      }

      addValidationRequest.onerror = () => reject(addValidationRequest.error)
    }

    getSessionRequest.onerror = () => reject(getSessionRequest.error)
  })
}
