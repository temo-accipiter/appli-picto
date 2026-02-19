'use client'

// src/contexts/OfflineContext.tsx — S8 Offline + Sync
//
// Contexte global qui gère :
// 1. L'état réseau (online/offline) via navigator.onLine + events
// 2. La queue locale de validations offline (localStorage)
// 3. La synchronisation automatique au retour réseau (fusion monotone)
//
// ⚠️ RÈGLES CONTRAT §4.4 + §4.2
// - Queue = local-only (jamais persistée en DB, §1.4)
// - Fusion monotone : progression ne régresse jamais (UNIQUE DB = idempotence)
// - Epoch check : si epoch_local < epoch_DB → réalignement silencieux au prochain Chargement
//
// ⚠️ RÈGLE §6.2 (Tableau)
// Ce contexte est disponible globalement, mais aucun indicateur offline ne doit être
// affiché en Contexte Tableau. Seul le Contexte Édition utilise isOnline / pendingCount.
//
// ⚠️ VISITOR (§7.2)
// Le Visitor est structurellement local-only → non concerné par ces contraintes réseau.
// La queue ne s'utilise que pour les utilisateurs authentifiés.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { supabase } from '@/utils/supabaseClient'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Un élément de la queue de validations offline */
interface PendingValidation {
  /** ID unique de l'élément dans la queue */
  id: string
  /** ID de la session (sera null si session expirée entre-temps) */
  sessionId: string
  /** ID du slot à valider */
  slotId: string
  /** Timestamp d'enregistrement (informatif, non authoritative) */
  enqueuedAt: number
}

interface OfflineContextValue {
  /** true si le navigateur est connecté */
  isOnline: boolean
  /** Nombre de validations en attente de synchronisation */
  pendingCount: number
  /**
   * Ajoute une validation à la queue offline (si pas de connexion).
   * Idempotent : la DB gère UNIQUE(session_id, slot_id).
   */
  enqueueValidation: (sessionId: string, slotId: string) => void
  /**
   * Déclenche manuellement la synchronisation de la queue.
   * Appelée automatiquement au retour réseau.
   */
  flushQueue: () => Promise<void>
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'appli-picto:offline-validation-queue'

// ─── Contexte ─────────────────────────────────────────────────────────────────

const OfflineContext = createContext<OfflineContextValue | null>(null)

// ─── Helpers localStorage ─────────────────────────────────────────────────────

function loadQueue(): PendingValidation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PendingValidation[]) : []
  } catch {
    return []
  }
}

function saveQueue(queue: PendingValidation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch {
    // localStorage indisponible (mode privé strict) → silencieux
  }
}

function clearQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // silencieux
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState<number>(
    () => loadQueue().length
  )

  // Ref pour éviter les doublons de flush simultanés
  const isFlushing = useRef(false)

  // ── Synchronisation de la queue au retour réseau ────────────────────────────
  const flushQueue = useCallback(async () => {
    if (isFlushing.current) return
    const queue = loadQueue()
    if (queue.length === 0) return

    isFlushing.current = true

    const failed: PendingValidation[] = []

    for (const entry of queue) {
      try {
        const { error } = await supabase.from('session_validations').insert({
          session_id: entry.sessionId,
          slot_id: entry.slotId,
        })

        // Code 23505 = UNIQUE violation → déjà validé, c'est OK (fusion monotone)
        // Code 42501 = RLS violation → session expirée ou invalide, on abandonne
        if (error && error.code !== '23505') {
          if (error.code === '42501') {
            // Session invalide (réinitialisée) → on abandonne silencieusement
            // L'epoch check dans Tableau.tsx gérera le réalignement au prochain Chargement
            console.warn(
              '[OfflineContext] Validation ignorée (session invalide ou réinitialisée):',
              entry.slotId
            )
          } else {
            // Autre erreur → remettre dans la queue pour retry
            failed.push(entry)
          }
        }
      } catch {
        // Erreur réseau transitoire → remettre dans la queue
        failed.push(entry)
      }
    }

    if (failed.length === 0) {
      clearQueue()
    } else {
      saveQueue(failed)
    }

    setPendingCount(failed.length)
    isFlushing.current = false
  }, [])

  // ── Détection online/offline ────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Flush automatique au retour réseau
      void flushQueue()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Synchroniser l'état réel au montage
    setIsOnline(navigator.onLine)

    // Si on est online au montage et qu'il y a des éléments en queue → flush
    if (navigator.onLine && loadQueue().length > 0) {
      void flushQueue()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [flushQueue])

  // ── Ajout d'une validation dans la queue ───────────────────────────────────
  const enqueueValidation = useCallback((sessionId: string, slotId: string) => {
    const queue = loadQueue()

    // Dédoublonnage local : si déjà en queue, inutile de rajouter
    const alreadyQueued = queue.some(
      e => e.sessionId === sessionId && e.slotId === slotId
    )
    if (alreadyQueued) return

    const entry: PendingValidation = {
      id: `${sessionId}-${slotId}-${Date.now()}`,
      sessionId,
      slotId,
      enqueuedAt: Date.now(),
    }

    const newQueue = [...queue, entry]
    saveQueue(newQueue)
    setPendingCount(newQueue.length)
  }, [])

  return (
    <OfflineContext.Provider
      value={{ isOnline, pendingCount, enqueueValidation, flushQueue }}
    >
      {children}
    </OfflineContext.Provider>
  )
}

// ─── Hook d'accès ─────────────────────────────────────────────────────────────

/**
 * Accès au contexte offline.
 *
 * ⚠️ Utiliser UNIQUEMENT en Contexte Édition pour les guards et le bandeau.
 * Ne jamais afficher isOnline / pendingCount en Contexte Tableau.
 *
 * @example
 * ```tsx
 * const { isOnline, enqueueValidation } = useOffline()
 * ```
 */
export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext)
  if (!ctx) {
    throw new Error('useOffline() doit être utilisé dans un <OfflineProvider>')
  }
  return ctx
}

export { OfflineContext }
