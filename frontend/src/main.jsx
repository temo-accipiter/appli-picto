// src/main.jsx
import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'

import Layout from '@/components/layout/Layout'
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
    <Suspense fallback={<div>Chargement…</div>}>
      <RouterProvider router={router} />
    </Suspense>
  </React.StrictMode>
)
