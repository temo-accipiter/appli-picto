'use client'

import { useCallback, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { withAbortSafe, isAbortLike } from '@/hooks'

/**
 * Interface pour la réponse de checkout Stripe
 */
interface CheckoutResponse {
  url?: string
}

/**
 * Options pour créer une session de checkout
 */
interface CheckoutOptions {
  priceId?: string
  successUrl?: string
  cancelUrl?: string
}

/**
 * Hook pour gérer le processus de checkout Stripe
 * Centralise la logique de redirection vers Stripe avec fallback
 *
 * @returns Fonction handleCheckout pour initier le processus
 */
export function useCheckout() {
  const checkingOutRef = useRef<boolean>(false)

  /**
   * Initier le processus de checkout Stripe
   * @param options - Options de checkout (priceId, success/cancel URLs)
   */
  const handleCheckout = useCallback(async (options?: CheckoutOptions) => {
    // Éviter les double-clics
    if (checkingOutRef.current) return
    checkingOutRef.current = true

    // Récupérer priceId depuis env ou options
    const priceId = options?.priceId || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID

    // Validation priceId
    if (!priceId || !/^price_[a-zA-Z0-9]+$/.test(priceId)) {
      alert(
        '⚠️ NEXT_PUBLIC_STRIPE_PRICE_ID est vide ou invalide (attendu: price_...)'
      )
      checkingOutRef.current = false
      return
    }

    // URLs par défaut
    const successUrl = options?.successUrl || `${window.location.origin}/profil`
    const cancelUrl = options?.cancelUrl || `${window.location.origin}/profil`

    try {
      // 1) Appel direct via Supabase Functions (JWT auto)
      const { data, error, aborted } = await withAbortSafe(
        supabase.functions.invoke<CheckoutResponse>('create-checkout-session', {
          body: {
            price_id: priceId,
            success_url: successUrl,
            cancel_url: cancelUrl,
          },
        })
      )

      // Si succès, rediriger vers Stripe
      if (!(aborted || (error && isAbortLike(error)))) {
        if (!error && data?.url) {
          window.location.href = data.url
          return
        }
      }

      // 2) Fallback via fetch brut (utile si invoke renvoie erreur générique)
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            price_id: priceId,
            success_url: successUrl,
            cancel_url: cancelUrl,
          }),
        }
      )

      const payload = await res.json().catch(() => ({}))
      if (payload?.url) {
        window.location.href = payload.url
        return
      }

      // Si aucun fallback ne fonctionne
      alert('❌ Réponse Stripe inattendue')
    } catch (e) {
      console.error('Erreur checkout:', String((e as Error)?.message ?? e))
      alert('❌ Erreur lors de la redirection vers Stripe')
    } finally {
      checkingOutRef.current = false
    }
  }, [])

  return { handleCheckout }
}
