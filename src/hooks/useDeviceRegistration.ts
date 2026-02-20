/**
 * useDeviceRegistration — Enregistrement de l'appareil au premier usage.
 *
 * ⚠️ RÈGLES DB-FIRST (S10)
 * - Le device_id est un UUID généré côté client, persisté en localStorage.
 * - INSERT IGNORE (upsert idempotent) : re-visite d'un appareil déjà enregistré = no-op.
 * - Refus quota → toast informatif, l'app continue sans bloquer.
 * - Visitor = non concerné (pas de gestion device, contrat §3.2.4).
 *
 * ⚠️ RÈGLES TSA
 * - Si quota atteint : toast adulte discret, jamais en Tableau.
 * - L'erreur est cosmétique — l'app reste pleinement utilisable.
 *
 * Clé localStorage : 'appli-picto-device-id'
 * Stocke un UUID v4 unique par navigateur/appareil.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { isAbortLike } from '@/hooks/_net'
import useAuth from './useAuth'

const DEVICE_ID_KEY = 'appli-picto-device-id'

/**
 * Retourne le device_id depuis localStorage, ou en génère un nouveau.
 * Retourne null si window n'est pas disponible (SSR).
 */
function getOrCreateDeviceId(): string | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem(DEVICE_ID_KEY)
  if (stored) return stored

  // UUID v4 natif (disponible dans tous les navigateurs modernes)
  const newId = crypto.randomUUID()
  localStorage.setItem(DEVICE_ID_KEY, newId)
  return newId
}

interface UseDeviceRegistrationReturn {
  /** UUID de l'appareil actuel (depuis localStorage). null avant hydratation. */
  deviceId: string | null
  /** true si l'enregistrement DB a réussi ou si le device est déjà connu. */
  registered: boolean
  /**
   * Type d'erreur éventuelle :
   * - 'quota' : quota appareils atteint (§6.4 : message non technique fourni par le parent)
   * - null : pas d'erreur
   */
  registrationError: 'quota' | null
}

export default function useDeviceRegistration(): UseDeviceRegistrationReturn {
  const { user, authReady } = useAuth()
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [registered, setRegistered] = useState(false)
  const [registrationError, setRegistrationError] = useState<'quota' | null>(
    null
  )

  useEffect(() => {
    if (!authReady || !user) {
      // Visitor ou non authentifié — pas de gestion device (contrat §3.2.4)
      return
    }

    const id = getOrCreateDeviceId()
    if (!id) return

    setDeviceId(id)

    const controller = new AbortController()

    const register = async () => {
      try {
        // Upsert idempotent : si (account_id, device_id) existe déjà → no-op
        // La contrainte UNIQUE(account_id, device_id) garantit l'idempotence
        const { error: err } = await supabase.from('devices').upsert(
          {
            device_id: id,
            account_id: user.id,
          },
          {
            onConflict: 'account_id,device_id',
            ignoreDuplicates: true,
          }
        )

        if (controller.signal.aborted) return

        if (err) {
          // Quota atteint : le trigger DB lève une exception P0001
          const isQuota =
            err.code === 'P0001' ||
            err.message?.toLowerCase().includes('quota') ||
            err.message?.toLowerCase().includes('device quota')

          if (isQuota) {
            setRegistrationError('quota')
            // Ne pas bloquer l'app — usage normal autorisé, juste signalement
          } else {
            // Erreur inattendue — log sans bloquer
            console.error('[useDeviceRegistration] Erreur enregistrement:', err)
          }
        } else {
          setRegistered(true)
        }
      } catch (err) {
        if (controller.signal.aborted || isAbortLike(err)) return
        console.error('[useDeviceRegistration] Erreur inattendue:', err)
      }
    }

    void register()
    return () => {
      controller.abort()
    }
  }, [user, authReady])

  return { deviceId, registered, registrationError }
}
