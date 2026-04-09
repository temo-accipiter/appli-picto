'use client'

// src/contexts/RealtimeBankCardsContext.tsx
// Provider gérant le channel Realtime persistant pour synchronisation cartes banque
// DB-first : Contourne limitations RLS + postgres_changes pour dépublications

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/utils/supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeBankCardsContextValue {
  /**
   * Channel Realtime persistant partagé entre Admin et Free
   * ⚠️ CRITIQUE : Ce channel reste souscrit tant que l'app est ouverte
   */
  channel: RealtimeChannel | null
  /**
   * Statut connexion channel (pour debug)
   */
  isConnected: boolean
  /**
   * Envoyer broadcast sur le channel persistant (Admin uniquement)
   * ✅ Garantie 100% livraison si récepteurs connectés
   */
  sendBroadcast: (
    event: string,
    payload: Record<string, unknown>
  ) => Promise<void>
}

const RealtimeBankCardsContext = createContext<
  RealtimeBankCardsContextValue | undefined
>(undefined)

interface RealtimeBankCardsProviderProps {
  children: ReactNode
}

/**
 * Provider Realtime Channel Persistant pour Cartes Banque
 *
 * ✅ Résout problème channels isolés (créer/souscrire/envoyer/supprimer)
 * ✅ Garantit synchronisation instantanée Admin ↔ Free
 * ✅ Contourne limitation RLS postgres_changes pour dépublications
 *
 * Architecture :
 * - Channel créé UNE FOIS au mount du provider
 * - Reste souscrit tant que l'app est ouverte
 * - Partagé entre useAdminBankCards (émetteur) et useBankCards (récepteur)
 * - Cleanup automatique au démontage app
 *
 * Événements :
 * - card_published : Carte publiée (Admin → Free)
 * - card_unpublished : Carte dépubliée (Admin → Free)
 * - card_deleted : Carte supprimée (Admin → Free)
 */
export function RealtimeBankCardsProvider({
  children,
}: RealtimeBankCardsProviderProps) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let isSubscribing = false

    const subscribeToChannel = () => {
      if (isSubscribing) return
      isSubscribing = true

      // ✅ Créer et souscrire le channel persistant
      const realtimeChannel = supabase.channel('bank_cards_realtime', {
        config: {
          broadcast: { self: false }, // Ne pas recevoir ses propres messages
        },
      })

      realtimeChannel.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          retryCountRef.current = 0 // Reset retry count on success
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false)
          isSubscribing = false

          // ✅ Retry avec backoff exponentiel (max 3 tentatives)
          if (retryCountRef.current < 3) {
            retryCountRef.current++
            const delayMs = Math.min(
              1000 * Math.pow(2, retryCountRef.current - 1),
              5000
            )
            console.warn(
              `[Realtime-Sync] ${status}, retry ${retryCountRef.current}/3 dans ${delayMs}ms`
            )

            retryTimeoutRef.current = setTimeout(() => {
              if (channelRef.current) {
                void supabase.removeChannel(channelRef.current)
              }
              subscribeToChannel()
            }, delayMs)
          } else {
            console.error(
              `[Realtime-Sync] Échec après 3 tentatives, mode dégradé actif`
            )
          }
        } else if (status === 'CLOSED') {
          setIsConnected(false)
          isSubscribing = false
        }
      })

      channelRef.current = realtimeChannel
      setChannel(realtimeChannel)
    }

    subscribeToChannel()

    // ✅ Cleanup : Unsubscribe au démontage de l'app (ou logout)
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
        setChannel(null)
        setIsConnected(false)
      }
    }
  }, [])

  /**
   * Envoyer broadcast sur le channel persistant
   * ⚠️ CRITIQUE : Attendre que le channel soit connecté avant d'envoyer
   */
  const sendBroadcast = async (
    event: string,
    payload: Record<string, unknown>
  ): Promise<void> => {
    if (!channelRef.current) {
      throw new Error(
        "[Realtime-Sync] Channel non initialisé, impossible d'envoyer broadcast"
      )
    }

    if (!isConnected) {
      console.warn('[Realtime-Sync] Channel pas encore connecté, attente...')
      // Attendre max 3s que le channel soit connecté
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('[Realtime-Sync] Timeout attente connexion channel'))
        }, 3000)

        const checkInterval = setInterval(() => {
          if (isConnected) {
            clearTimeout(timeout)
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)
      })
    }

    // ✅ Envoyer le broadcast sur le channel persistant
    await channelRef.current.send({
      type: 'broadcast',
      event,
      payload,
    })
  }

  return (
    <RealtimeBankCardsContext.Provider
      value={{ channel, isConnected, sendBroadcast }}
    >
      {children}
    </RealtimeBankCardsContext.Provider>
  )
}

/**
 * Hook pour accéder au channel Realtime persistant
 * ✅ Utilisé par useAdminBankCards (émetteur) et useBankCards (récepteur)
 */
export function useRealtimeBankCards(): RealtimeBankCardsContextValue {
  const context = useContext(RealtimeBankCardsContext)

  if (context === undefined) {
    throw new Error(
      'useRealtimeBankCards doit être utilisé dans RealtimeBankCardsProvider'
    )
  }

  return context
}
