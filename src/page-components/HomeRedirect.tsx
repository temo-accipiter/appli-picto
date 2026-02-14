'use client'

import { Loader } from '@/components'
import { useAuth } from '@/hooks'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Page de redirection intelligente qui décide automatiquement où envoyer l'utilisateur
 * - Visiteurs → /tableau (avec cartes prédéfinies)
 * - Utilisateurs connectés → /tableau (avec cartes personnelles)
 */
export default function HomeRedirect() {
  const { authReady } = useAuth()
  const router = useRouter()

  // Redirection selon le rôle - tous vers /tableau
  useEffect(() => {
    if (authReady) {
      router.replace('/tableau')
    }
  }, [authReady, router])

  // Afficher un loader pendant la détermination du rôle
  return (
    <div className="home-redirect-loading">
      <Loader />
      <p>Chargement...</p>
    </div>
  )
}
