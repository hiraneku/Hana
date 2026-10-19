import { defineConfig } from 'vite';

// GitHub Pages serves the site from https://<user>.github.io/<repo>/ so every
// asset has to be requested relative to that sub-path.
const BASE = process.env.GH_PAGES_BASE || '/Hana/';

export default defineConfig({
  base: BASE,
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Allow the Arena preview host (and any tunnel) to embed the dev server.
    allowedHosts: true,
    cors: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
