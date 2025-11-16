'use client'

// src/components/SubscribeButton.tsx
import { Button } from '@/components'
import { useToast } from '@/contexts'
import { supabase } from '@/utils/supabaseClient'
import { useState } from 'react'

export default function SubscribeButton() {
  const { show } = useToast()
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    if (loading) return
    setLoading(true)

    try {
      // Appel direct à l'Edge Function (auth auto + bons headers)
      const { data, error } = await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: {
            price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
            success_url: `${window.location.origin}/profil`,
            cancel_url: `${window.location.origin}/profil`,
          },
        }
      )

      if (error) throw error

      if (data?.url) {
        window.location.href = data.url
      } else {
        show('Réponse Stripe inattendue.', 'error')
      }
    } catch (e) {
      console.error(e)
      show('Erreur lors de la redirection vers Stripe.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      label={loading ? 'Redirection…' : "S'abonner (5 € / mois)"}
      variant="primary"
      onClick={handleSubscribe}
      disabled={loading}
    />
  )
}
