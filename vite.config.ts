import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'prompt', // Important for "Update available" flow
      injectRegister: false, // We will register manually in App
      devOptions: {
        enabled: true,
      },
      includeAssets: ["favicon.ico", "robots.txt", "logo-192x192.png", "logo-512x512.png"],
      manifest: {
        name: "PedeGrau - Delivery de Açaí no Grau",
        short_name: "PedeGrau",
        description: "Peça seu Açaí no Grau com delivery rápido e fácil. Encontre a loja mais próxima e aproveite nossas promoções exclusivas!",
        theme_color: "#6854AB",
        background_color: "#6854AB",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/logo-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/logo-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        importScripts: ['/sw-custom.js'], // Import custom logic
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true, // FORCE immediate activation - critical for updates
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/admin/, /^\/api/], // Don't cache admin or api routes
        runtimeCaching: [
          // HTML / Navigation - NetworkFirst
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache-v4', // v4 to force cache invalidation
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Assets (JS, CSS, Images) - CacheFirst
          {
            urlPattern: /\.(?:js|css|png|jpg|jpeg|svg|gif|ico|woff2?|ttf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache-v4', // v4 to force cache invalidation
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Version check - NetworkOnly
          {
            urlPattern: /\/version\.json$/,
            handler: 'NetworkOnly',
          },
        ],
      }
    })
  ].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 1600,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
    '__BUILD_DATE__': JSON.stringify(new Date().toISOString()),
  }
}));
