import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Appli-Picto',
    short_name: 'Picto',
    description:
      'Tableau de motivation visuel pour enfants TSA avec pictogrammes et système de récompenses',
    start_url: '/',
    display: 'standalone',
    background_color: '#E8F4F8',
    theme_color: '#5A9FB8',
    orientation: 'portrait-primary',
    lang: 'fr',
    dir: 'ltr',
    scope: '/',
    prefer_related_applications: false,
    categories: ['education', 'kids', 'health'],
    icons: [
      {
        src: '/icon.png',
        sizes: '16x16',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
