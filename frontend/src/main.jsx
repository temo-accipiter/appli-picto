import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { Layout, Loader } from '@/components'
import { ToastProvider, DisplayProvider } from '@/contexts'
import '@/i18n/i18n'
import '@/styles/main.scss'

// Lazy-loaded pages
const Tableau = lazy(() => import('@/pages/tableau/Tableau'))
const Edition = lazy(() => import('@/pages/edition/Edition'))
const NotFound = lazy(() => import('@/pages/notfound/NotFound'))

// Définition des routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/tableau" replace /> },
      { path: 'tableau', element: <Tableau /> },
      { path: 'edition', element: <Edition /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <Suspense fallback={<Loader />}>
        <DisplayProvider>
          <RouterProvider router={router} />
        </DisplayProvider>
      </Suspense>
    </ToastProvider>
  </React.StrictMode>
)
