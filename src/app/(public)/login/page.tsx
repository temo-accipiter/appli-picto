import Login from '@/page-components/login/Login'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Connexion - Appli-Picto',
  description: 'Connectez-vous à votre compte Appli-Picto',
}

export default function LoginPage() {
  return <Login />
}
