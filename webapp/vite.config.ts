import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // App instalable: manifest y service worker. Se actualiza sola: cuando hay una versión
    // nueva, la página se recarga con ella apenas termina de bajarla.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,  // se registra en main.tsx, que recarga la página con la versión nueva
      includeAssets: ['icon.svg'],
      manifest: {
        id: '/',
        name: 'AquaControl',
        short_name: 'AquaControl',
        description: 'El acuario de casa: sondas, peces, plantas y abonos.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#0b1d20',
        theme_color: '#0b1d20',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // webp: las fotos de los peces y las plantas, para que se vean también sin internet
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: 'index.html',
        // /events y los botones son de la central: nunca desde la caché
        navigateFallbackDenylist: [/^\/events/, /\/press$/],
        cleanupOutdatedCaches: true,
        // La versión nueva toma el control enseguida, sin esperar a que se cierren todas las
        // ventanas de la app (si no, una app instalada podía quedarse días con la vieja)
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
})
