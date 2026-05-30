import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'Elara',
        short_name: 'Elara',
        description: 'Персональный календарь тела, здоровья и совместной заботы.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'ru',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,avif,json}'],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase
          'supabase': ['@supabase/supabase-js'],
          // Страницы с клиническими тестами (большие)
          'pages-tests': [
            './src/pages/ClinicalTestsPage.jsx',
            './src/pages/ResearchPage.jsx',
          ],
          // Страницы профиля
          'pages-profile': [
            './src/pages/ProfilePage.jsx',
            './src/pages/PersonalizationPage.jsx',
            './src/pages/HealthPage.jsx',
          ],
          // Дополнительные страницы
          'pages-extra': [
            './src/pages/SportPage.jsx',
            './src/pages/HowItWorksPage.jsx',
            './src/pages/AboutPage.jsx',
          ],
        },
      },
    },
    // Предупреждение при chunk > 500kb (было 714kb)
    chunkSizeWarningLimit: 500,
  },
  // Оптимизация dev-сервера
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
  },
})
