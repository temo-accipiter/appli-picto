// vite.config.js
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import { imagetools } from 'vite-imagetools'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    imagetools({
      defaultDirectives: new URLSearchParams({
        format: 'webp',
        quality: '80',
        w: '800',
        as: 'picture',
      }),
    }),
    visualizer({
      filename: './dist/stats.html',
      template: 'treemap',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@styles': path.resolve(__dirname, 'src/styles'),
    },
  },
  optimizeDeps: {
    // ⬇️ on pré-bundle aussi 'marked' (utile avec Yarn PnP)
    include: ['i18next-http-backend', 'marked'],
  },
  // 🚫 Désactiver les source maps en développement pour éviter les warnings
  esbuild: {
    sourcemap: false,
  },
  // 🚫 Désactiver les source maps Vite en développement
  css: {
    devSourcemap: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': [
            'react',
            'react-dom',
            'react-router-dom',
            'react-i18next',
          ],
          'dnd-kit': [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/utilities',
          ],
          'ui-components': [
            'framer-motion',
            'lucide-react',
            'react-confetti',
            'react-turnstile',
          ],
          utils: ['marked', 'file-saver', 'jszip', 'react-use'],
          stripe: ['@stripe/stripe-js', 'stripe'],
        },
      },
    },
    // Augmenter la limite d'avertissement pour éviter les faux positifs
    chunkSizeWarningLimit: 1000,
  },
  // (Optionnel, seulement si tu fais du SSR plus tard)
  // ssr: { noExternal: ['marked'] },
})
