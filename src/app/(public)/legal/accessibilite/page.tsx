import { redirect } from 'next/navigation'

// Redirection permanente — maintenue 6 mois min pour préserver les bookmarks/indexations
export default function AccessibilitePage() {
  redirect('/legal/politique-confidentialite#accessibilite')
}
