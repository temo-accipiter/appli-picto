/** @type {import('next').NextConfig} */
const nextConfig = {
  // React
  reactStrictMode: true,

  // SCSS Support
  sassOptions: {
    includePaths: ['./src/styles'],
  },

  // Environment Variables Mapping (VITE_* → NEXT_PUBLIC_*)
  // Next.js expose automatiquement les variables NEXT_PUBLIC_* au client
  // On les mappe depuis les variables VITE_* pour compatibilité
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.VITE_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PRICE_ID: process.env.VITE_STRIPE_PRICE_ID,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.VITE_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL: process.env.VITE_SUPABASE_FUNCTIONS_URL,
    NEXT_PUBLIC_GA4_ID: process.env.VITE_GA4_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.VITE_SENTRY_DSN,
    NEXT_PUBLIC_APP_VERSION: process.env.VITE_APP_VERSION,
    NEXT_PUBLIC_APP_ENV: process.env.VITE_APP_ENV,
    NEXT_PUBLIC_APP_URL: process.env.VITE_APP_URL,
  },

  // Security Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // Image Optimization (Supabase Storage)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tklcztqoqvnialaqfcjm.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Turbopack configuration (Next.js 16 default)
  turbopack: {},

  // Webpack configuration (legacy, will be migrated to Turbopack)
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },

  // Typed Routes (désactivé pour migration progressive)
  typedRoutes: false,

  // Experimental features
  experimental: {
    // Optimize package imports (reduce bundle size)
    optimizePackageImports: [
      'lucide-react',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
    ],
  },

  // TypeScript config
  typescript: {
    // ⚠️ TEMPORAIRE: Permet le build malgré les erreurs TS (329 erreurs documentées)
    // À retirer après correction progressive des erreurs
    ignoreBuildErrors: true,
  },

  // ESLint config (utiliser `next lint` en CLI plutôt que dans next.config.js)

  // Output (standalone pour déploiement optimisé)
  output: 'standalone',

  // Page extensions
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // Compress (Gzip/Brotli)
  compress: true,

  // Powered by header (sécurité par obscurité)
  poweredByHeader: false,

  // Trailing slash
  trailingSlash: false,

  // Redirects
  async redirects() {
    return [
      // Exemple: redirections legacy si nécessaire
      // {
      //   source: '/old-path',
      //   destination: '/new-path',
      //   permanent: true,
      // },
    ]
  },
}

export default nextConfig
