'use client'

import { Loader } from '@/components'
import { usePermissions } from '@/contexts'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Page de redirection intelligente qui décide automatiquement où envoyer l'utilisateur
 * - Visiteurs → /tableau (avec cartes prédéfinies)
 * - Utilisateurs connectés → /tableau (avec cartes personnelles)
 */
export default function HomeRedirect() {
  const { role: _role, loading } = usePermissions()
  const router = useRouter()

  // Redirection selon le rôle - tous vers /tableau
  useEffect(() => {
    if (!loading) {
      router.replace('/tableau')
    }
  }, [loading, router])

  // Afficher un loader pendant la détermination du rôle
  return (
    <div className="home-redirect-loading">
      <Loader />
      <p>Chargement...</p>
    </div>
  )
}
