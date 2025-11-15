import { redirect } from 'next/navigation'

/**
 * Page de redirection intelligente qui décide automatiquement où envoyer l'utilisateur
 * - Visiteurs → /tableau (avec cartes prédéfinies)
 * - Utilisateurs connectés → /tableau (avec cartes personnelles)
 */
export default function HomePage() {
  redirect('/tableau')
}
