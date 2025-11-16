import Signup from '@/page-components/signup/Signup'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Créer un compte - Appli-Picto',
  description: 'Créez votre compte Appli-Picto gratuitement',
}

export default function SignupPage() {
  return <Signup />
}
