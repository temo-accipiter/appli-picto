import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Lexend } from 'next/font/google'
import { ClientWrapper } from './client-wrapper'
import '@/styles/main.scss'

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-lexend',
})

export const metadata: Metadata = {
  title: 'Appli-Picto',
  description: 'Dashboard motivationnel pour enfants TSA',
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
  themeColor: '#2871A8',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={lexend.variable}>
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
      </head>
      <body>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  )
}
