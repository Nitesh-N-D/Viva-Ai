import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// VIVA AI — Vite config
// PWA plugin gives us the service worker + offline caching required by
// HARD CONSTRAINT #2 (offline-first) in the project spec.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "icons/*.svg",
        "icons/*.png",
        "audio/*.mp3",
        "models/**/*",
      ],
      manifest: {
        name: "VIVA AI — Tamil Voice Farming & Fabrication Co-pilot",
        short_name: "VIVA AI",
        description:
          "Tamil voice co-pilot for farming and frugal fabrication",
        theme_color: "#5B7553",
        background_color: "#FBF6EC",
        display: "standalone",
        start_url: "/",
        lang: "ta",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Models can be large; cache them explicitly so soil/disease
        // scanning keeps working with zero connectivity after first load.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json,bin,mp3}"],
        runtimeCaching: [
          {
            // All three external calls (OpenWeatherMap, Agmarknet, Gemini)
            // are now made directly from the browser — see src/lib/weather.ts,
            // src/lib/mandi.ts, and extractIntent.ts. NetworkFirst means a
            // fresh result is preferred when online, but a recent cached
            // response is served instantly if the network is slow or down,
            // which is exactly the offline-first behavior those files'
            // own localStorage caches already provide at the app-logic
            // level — this is a second, complementary layer at the
            // network level.
            urlPattern: /^https:\/\/api\.openweathermap\.org\//,
            handler: "NetworkFirst",
            options: { cacheName: "viva-weather-cache", networkTimeoutSeconds: 5 },
          },
          {
            urlPattern: /^https:\/\/api\.data\.gov\.in\//,
            handler: "NetworkFirst",
            options: { cacheName: "viva-mandi-cache", networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // Forward /api-mandi/ → https://api.data.gov.in/
      // This runs inside Node.js (no browser CORS rules), so it works
      // perfectly on localhost without any external CORS proxy service.
      "/api-mandi": {
        target: "https://api.data.gov.in",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-mandi/, ""),
        secure: true,
      },
    },
  },
});
