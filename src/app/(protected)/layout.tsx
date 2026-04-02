'use client'

import type { ReactNode } from 'react'
import { useEffect, useState, useCallback } from 'react'
import ProtectedRoute from '@/components/shared/protected-route/ProtectedRoute'
import { CookieBanner, CookiePreferences, Footer, Navbar } from '@/components'
import ModalVisitorImport from '@/components/shared/modal/modal-visitor-import/ModalVisitorImport'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks'
import { hasLocalData } from '@/utils/visitor/importVisitorSequences'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // ✅ TICKET 4 : Import séquences Visitor → Free
  const { authReady, user } = useAuth()
  const [showImportModal, setShowImportModal] = useState(false)
  const [hasCheckedLocalSequences, setHasCheckedLocalSequences] =
    useState(false)

  // Détection mobile au montage
  useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      const isMobileNow = window.innerWidth < 768
      setIsMobile(isMobileNow)
      if (process.env.NODE_ENV === 'development') {
        console.log(
          '[Layout] isMobile:',
          isMobileNow,
          'width:',
          window.innerWidth
        )
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // ✅ TICKET 4 : Vérifier IndexedDB au mount (une seule fois)
  // Évite re-renders inutiles en utilisant hasCheckedLocalSequences
  useEffect(() => {
    // Conditions strictes : authReady && user && pas encore checké
    if (!authReady || !user || hasCheckedLocalSequences) {
      return
    }

    // Vérification asynchrone IndexedDB
    const checkLocalData = async () => {
      try {
        const hasData = await hasLocalData()

        if (hasData) {
          // Afficher modal si données locales détectées (slots ou séquences)
          setShowImportModal(true)
        }
      } catch (error) {
        console.warn(
          'Erreur vérification séquences locales (skip import modal):',
          error
        )
        // En cas d'erreur, ne pas afficher modal (fail silent)
      } finally {
        // Marquer comme checké pour éviter re-vérification
        setHasCheckedLocalSequences(true)
      }
    }

    checkLocalData()
  }, [authReady, user, hasCheckedLocalSequences])

  // ✅ TICKET 4 : Callbacks modal (useCallback pour éviter re-renders)
  const handleCloseImportModal = useCallback(() => {
    setShowImportModal(false)
  }, [])

  const handleImportSuccess = useCallback(() => {
    // Optionnel : rafraîchir UI si nécessaire
    // Pour l'instant, la modal se ferme automatiquement après succès
  }, [])

  // Routes où la navbar desktop est affichée (uniquement desktop)
  const navbarRoutes = ['/profil', '/edition', '/abonnement']
  const isNavbarRoute = navbarRoutes.some(route => pathname.startsWith(route))

  // Footer caché sur mobile pour les routes d'édition et de profil
  // Sur desktop, footer toujours visible
  const footerMobileHiddenRoutes = ['/edition', '/profil']
  const footerMobileHidden = footerMobileHiddenRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Navbar affichée UNIQUEMENT sur desktop (≥768px) pour certaines routes
  const shouldShowNavbar = mounted && isNavbarRoute && !isMobile

  return (
    <ProtectedRoute>
      <div className="layout">
        <div className="layout-main">
          {/* Navbar visible UNIQUEMENT sur desktop (≥768px) */}
          {shouldShowNavbar && (
            <div className="navbar-desktop-only">
              <Navbar />
            </div>
          )}
          <main id="main-content">{children}</main>
          <div className={footerMobileHidden ? 'footer-desktop-only' : ''}>
            <Footer />
          </div>
          <CookieBanner />
          <CookiePreferences />

          {/* ✅ TICKET 4 : Modal import séquences Visitor → Free */}
          <ModalVisitorImport
            isOpen={showImportModal}
            onClose={handleCloseImportModal}
            onImportSuccess={handleImportSuccess}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}
