'use client'

import type { ReactNode } from 'react'
import { Suspense, useEffect } from 'react'
import ErrorBoundary from '@/components/shared/error-boundary/ErrorBoundary'
import WebVitals from '@/components/shared/web-vitals/WebVitals'
import { BottomNav } from '@/components/layout/bottom-nav'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChildProfileProvider } from '@/contexts/ChildProfileContext'
import { DisplayProvider } from '@/contexts/DisplayContext'
import { LoadingProvider } from '@/contexts/LoadingContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import InitializationLoader from '@/components/shared/initialization-loader/InitializationLoader'
import Loader from '@/components/ui/loader/Loader'

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialiser i18n en arrière-plan (non-bloquant)
    import('@/config/i18n/i18n')
  }, [])

  // Afficher l'app immédiatement, i18n se chargera en fond
  // Les traductions manquantes afficheront les clés temporairement
  return (
    <ErrorBoundary>
      <WebVitals />
      {/* S8 : OfflineProvider doit envelopper tout pour détecter l'état réseau globalement */}
      {/* Il se place à l'extérieur de AuthProvider car la queue offline est indépendante */}
      <OfflineProvider>
        <AuthProvider>
          <ChildProfileProvider>
            <DisplayProvider>
              <LoadingProvider>
                <ToastProvider>
                  <InitializationLoader>
                    <Suspense fallback={<Loader />}>
                      {children}
                      {/* Bottom Navigation Bar - Mobile only (< 768px) */}
                      <BottomNav />
                    </Suspense>
                  </InitializationLoader>
                </ToastProvider>
              </LoadingProvider>
            </DisplayProvider>
          </ChildProfileProvider>
        </AuthProvider>
      </OfflineProvider>
    </ErrorBoundary>
  )
}
