'use client'

import type { ReactNode } from 'react'
import { Suspense, useEffect } from 'react'
import ErrorBoundary from '@/components/shared/error-boundary/ErrorBoundary'
import WebVitals from '@/components/shared/web-vitals/WebVitals'
import { AuthProvider } from '@/contexts/AuthContext'
import { PermissionsProvider } from '@/contexts/PermissionsContext'
import { DisplayProvider } from '@/contexts/DisplayContext'
import { LoadingProvider } from '@/contexts/LoadingContext'
import { ToastProvider } from '@/contexts/ToastContext'
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
      <AuthProvider>
        <PermissionsProvider>
          <DisplayProvider>
            <LoadingProvider>
              <ToastProvider>
                <InitializationLoader>
                  <Suspense fallback={<Loader />}>{children}</Suspense>
                </InitializationLoader>
              </ToastProvider>
            </LoadingProvider>
          </DisplayProvider>
        </PermissionsProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
