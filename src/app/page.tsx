import { redirect } from 'next/navigation'

// Force dynamic rendering due to client-only dependencies
export const dynamic = 'force-dynamic'


/**
 * Page de redirection intelligente qui décide automatiquement où envoyer l'utilisateur
 * - Visiteurs → /tableau (avec cartes prédéfinies)
 * - Utilisateurs connectés → /tableau (avec cartes personnelles)
 */
export default function HomePage() {
  redirect('/tableau')
}
