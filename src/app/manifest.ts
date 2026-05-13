import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Appli-Picto',
    short_name: 'Picto',
    description:
      'Tableau de motivation visuel pour enfants TSA avec pictogrammes et système de récompenses',
    start_url: '/',
    display: 'standalone',
    background_color: '#BCD8F1',
    theme_color: '#2871A8',
    orientation: 'portrait-primary',
    lang: 'fr',
    dir: 'ltr',
    scope: '/',
    prefer_related_applications: false,
    categories: ['education', 'kids', 'health'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
