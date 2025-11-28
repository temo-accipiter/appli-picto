import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Anti-flash de thème - évite l'éblouissement sensoriel au chargement */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const initialTheme = theme || (prefersDark ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', initialTheme);
                  document.documentElement.setAttribute('data-scroll-behavior', 'smooth');
                } catch (e) {}
              })();
            `,
          }}
        />

        {/* Preconnect optimizations for faster DNS/TLS */}
        <link
          rel="preconnect"
          href="https://tklcztqoqvnialaqfcjm.supabase.co"
        />
        <link
          rel="dns-prefetch"
          href="https://tklcztqoqvnialaqfcjm.supabase.co"
        />

        {/* Lexend font pour accessibilité TSA - meilleure lisibilité des lettres */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  )
}
