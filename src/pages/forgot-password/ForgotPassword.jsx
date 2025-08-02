import { useState } from 'react'
import { supabase } from '@/utils'
import { useToast } from '@/contexts'
import { Input, Button } from '@/components'
import './ForgotPassword.scss'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { show } = useToast()
  const [success, setSuccess] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)

    // Envoie la demande de reset (Supabase ne révèle pas si l'email existe)
    const { error } = await supabase.auth.resetPasswordForEmail(email)

    if (error) {
      console.error('Erreur envoi reset :', error.message)
      show('Une erreur est survenue lors de l’envoi du lien.', 'error')
    } else {
      show(
        'Si un compte existe avec cette adresse, un e-mail a été envoyé ✅',
        'success'
      )
      setSuccess(true)
    }

    setLoading(false)
  }

  return (
    <div className="forgot-password-page">
      <h1>Mot de passe oublié</h1>

      <p>Entre ton adresse e-mail pour recevoir un lien de réinitialisation.</p>

      <form onSubmit={handleSubmit}>
        <Input
          id="forgot-email"
          type="email"
          label="Adresse e-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <Button
          type="submit"
          label={loading ? 'Envoi en cours...' : 'Envoyer le lien'}
          disabled={loading || success}
          variant="primary"
        />
      </form>
    </div>
  )
}
