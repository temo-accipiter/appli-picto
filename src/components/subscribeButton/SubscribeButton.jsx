import { supabase } from '@/utils'
import { useToast } from '@/contexts'
import { Button } from '@/components'

export default function SubscribeButton() {
  const { show } = useToast()

  const handleSubscribe = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data?.session?.access_token

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: import.meta.env.VITE_STRIPE_PRICE_ID,
          success_url: `${window.location.origin}/profil`,
          cancel_url: `${window.location.origin}/profil`,
        }),
      }
    )

    const data = await res.json()

    if (data?.url) {
      window.location.href = data.url
    } else {
      console.error('Erreur réponse Stripe :', data)
      show('Erreur lors de la redirection vers Stripe.', 'error')
    }
  }

  return (
    <Button
      label="S'abonner (5 € / mois)"
      variant="primary"
      onClick={handleSubscribe}
    />
  )
}
