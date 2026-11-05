import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const basePath = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'og-card.png'],
      manifest: {
        id: basePath,
        name: 'Preço na Régua',
        short_name: 'Na Régua',
        description: 'Compare pelo que rende, não apenas pelo que custa.',
        lang: 'pt-BR',
        start_url: basePath,
        scope: basePath,
        display: 'standalone',
        background_color: '#F6F2E9',
        theme_color: '#1B2420',
        icons: [
          { src: `${basePath}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${basePath}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${basePath}icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,ico}'],
        navigateFallback: `${basePath}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false
      }
    })
  ]
});
