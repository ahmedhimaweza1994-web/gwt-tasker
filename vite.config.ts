import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// إضافة polyfill لـ __dirname في ESM
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),  // غيرنا import.meta.dirname إلى __dirname
      "@shared": path.resolve(__dirname, "shared"),  // غيرنا import.meta.dirname إلى __dirname
      "@assets": path.resolve(__dirname, "attached_assets"),  // غيرنا import.meta.dirname إلى __dirname
    },
  },
  root: path.resolve(__dirname, "client"),  // غيرنا import.meta.dirname إلى __dirname
  build: {
    outDir: path.resolve(__dirname, "dist/public"),  // غيرنا import.meta.dirname إلى __dirname
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});