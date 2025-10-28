// src/main.jsx
import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import {
  ErrorBoundary,
  Layout,
  Loader,
  ProtectedRoute,
  InitializationLoader,
} from '@/components'
import {
  AuthProvider,
  PermissionsProvider,
  DisplayProvider,
  ToastProvider,
  LoadingProvider,
} from '@/contexts'

import { supabase } from '@/utils/supabaseClient'

// i18n + styles
import '@/config/i18n/i18n'
import '@/styles/main.scss'

// Consentement / analytics (chargé seulement si nécessaire)
import { setupConsentBridges } from '@/config/analytics'
import '@/config/analytics/routePageViews'
import '@/config/analytics/userProps'

// 🆕 Service Worker (production uniquement)
import { registerServiceWorker } from '@/utils/serviceWorker/register'

if (import.meta.env.PROD) {
  registerServiceWorker().then(registration => {
    if (registration) {
      console.log('✅ Service Worker prêt pour cache images')
    }
  })
}

// Expose quelques helpers de test en DEV
if (typeof window !== 'undefined') {
  setupConsentBridges()

  window.testLegalCompliance = {
    testConfig: async () => {
      const { testLegalConfiguration } = await import('@/utils/testLegalConfig')
      return testLegalConfiguration()
    },
    testRGPD: async () => {
      const { testRGPDCompliance } = await import('@/utils/testLegalConfig')
      return testRGPDCompliance()
    },
    checkGA4: async () => {
      const { getGA4ComplianceStatus } = await import('@/config/analytics')
      return getGA4ComplianceStatus()
    },
    testDocuments: async () => {
      const { testDocumentPlaceholders } = await import(
        '@/utils/testLegalConfig'
      )
      const {
        MENTIONS_LEGALES_MD,
        CGU_MD,
        CGV_MD,
        POLITIQUE_CONFIDENTIALITE_MD,
        POLITIQUE_COOKIES_MD,
      } = await import('@/assets')
      const docs = [
        { name: 'Mentions légales', content: MENTIONS_LEGALES_MD },
        { name: 'CGU', content: CGU_MD },
        { name: 'CGV', content: CGV_MD },
        {
          name: 'Politique de confidentialité',
          content: POLITIQUE_CONFIDENTIALITE_MD,
        },
        { name: 'Politique de cookies', content: POLITIQUE_COOKIES_MD },
      ]
      return docs.map(d => ({
        name: d.name,
        result: testDocumentPlaceholders(d.content, d.name),
      }))
    },
    help: () => {
      console.log(
        '🧪 testLegalCompliance.testConfig() / testRGPD() / checkGA4() / testDocuments()'
      )
    },
  }

  window.env = {
    GA4_ID: import.meta.env.VITE_GA4_ID,
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    APP_ENV: import.meta.env.VITE_APP_ENV,
    APP_URL: import.meta.env.VITE_APP_URL,
  }
}

// Nettoyage des URLs de callback auth (Supabase)
if (
  typeof window !== 'undefined' &&
  window.location.hash.includes('type=recovery')
) {
  const hash = window.location.hash
  const redirectTo = '/reset-password' + hash
  window.history.replaceState({}, '', redirectTo)
}
if (
  typeof window !== 'undefined' &&
  window.location.pathname === '/login' &&
  window.location.hash.includes('access_token')
) {
  console.warn('🔐 Suppression session automatique après confirmation email')
  supabase.auth.signOut().then(() => {
    const cleanUrl = `${window.location.origin}/login`
    window.location.replace(cleanUrl)
  })
}

// Pages (lazy load côté pages/index)
import {
  Abonnement,
  Accessibilite,
  AdminPermissions,
  CGU,
  CGV,
  Edition,
  ForgotPassword,
  HomeRedirect,
  Login,
  Logs,
  MentionsLegales,
  NotFound,
  PolitiqueConfidentialite,
  PolitiqueCookies,
  PortailRGPD,
  Profil,
  ResetPassword,
  Signup,
  Tableau,
} from '@/pages'

// Routes : login/signup sous Layout pour afficher bannière cookies & footer
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'tableau', element: <Tableau /> },
      {
        path: 'edition',
        element: (
          <ProtectedRoute>
            <Edition />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profil',
        element: (
          <ProtectedRoute>
            <Profil />
          </ProtectedRoute>
        ),
      },
      {
        path: 'abonnement',
        element: (
          <ProtectedRoute>
            <Abonnement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/logs',
        element: (
          <ProtectedRoute>
            <Logs />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/permissions',
        element: (
          <ProtectedRoute>
            <AdminPermissions />
          </ProtectedRoute>
        ),
      },

      // Auth
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password', element: <ResetPassword /> },

      // Légal
      { path: 'mentions-legales', element: <MentionsLegales /> },
      { path: 'cgu', element: <CGU /> },
      { path: 'cgv', element: <CGV /> },
      {
        path: 'politique-confidentialite',
        element: <PolitiqueConfidentialite />,
      },
      { path: 'politique-cookies', element: <PolitiqueCookies /> },
      { path: 'accessibilite', element: <Accessibilite /> },
      { path: 'rgpd', element: <PortailRGPD /> },

      { path: '*', element: <NotFound /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <PermissionsProvider>
          <DisplayProvider>
            <LoadingProvider>
              <ToastProvider>
                <InitializationLoader>
                  <Suspense fallback={<Loader />}>
                    <RouterProvider router={router} />
                  </Suspense>
                </InitializationLoader>
              </ToastProvider>
            </LoadingProvider>
          </DisplayProvider>
        </PermissionsProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
