import ResetPassword from '@/page-components/reset-password/ResetPassword'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Réinitialiser le mot de passe - Appli-Picto',
  description: 'Définissez un nouveau mot de passe',
}

export default function ResetPasswordPage() {
  return <ResetPassword />
}
