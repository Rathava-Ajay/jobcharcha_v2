import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/apple-touch-icon.png'],
        manifest: {
          name: 'JobCharcha - Government & Private Jobs',
          short_name: 'JobCharcha',
          description: "India's leading portal for government recruitment notifications, admit cards, results, and mock tests.",
          start_url: '/',
          display: 'standalone',
          background_color: '#0f172a',
          theme_color: '#0f172a',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Precache only the built app shell. Deliberately no runtime-caching rules for the
          // /api/* origin — payment, auth, and application-status data must never be served
          // stale or offline, so those requests are left to pass straight to the network.
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split the big, rarely-changing libs into their own long-cacheable chunks so an app
          // deploy doesn't bust them. lucide-react is deliberately left out — it tree-shakes
          // per-icon into each route chunk, and forcing it into one chunk would ship every icon.
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (/[\\/]react-dom[\\/]|[\\/]react[\\/]|[\\/]react-router|[\\/]scheduler[\\/]/.test(id)) return 'vendor-react';
            if (/i18next|react-i18next/.test(id)) return 'vendor-i18n';
            if (/dompurify|qrcode/.test(id)) return 'vendor-utils';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
