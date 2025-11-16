import type { Metadata, Viewport } from 'next'
import { ClientWrapper } from './client-wrapper'
import '@/styles/main.scss'

export const metadata: Metadata = {
  title: 'Appli-Picto',
  description: 'Dashboard motivationnel pour enfants TSA',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Appli-Picto',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#5A9FB8',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="preconnect"
          href="https://tklcztqoqvnialaqfcjm.supabase.co"
        />
      </head>
      <body>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  )
}
