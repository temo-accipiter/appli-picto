import ForgotPassword from '@/page-components/forgot-password/ForgotPassword'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'


export const metadata = {
  title: 'Mot de passe oublié - Appli-Picto',
  description: 'Réinitialisez votre mot de passe',
}

export default function ForgotPasswordPage() {
  return <ForgotPassword />
}
