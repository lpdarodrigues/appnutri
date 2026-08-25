import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // base é ajustado no deploy do GitHub Pages (ver README)
  base: process.env.APPNUTRI_BASE || "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: "Nutri — acompanhamento nutricional",
        short_name: "Nutri",
        description: "Diário nutricional pessoal com base TACO offline",
        theme_color: "#F1F4F7",
        background_color: "#F1F4F7",
        display: "standalone",
        orientation: "portrait",
        lang: "pt-BR",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "node",
  },
} as any);
