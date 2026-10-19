import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// GitHub Pages serves the site from https://<user>.github.io/<repo>/ so every
// asset has to be requested relative to that sub-path.
const BASE = process.env.GH_PAGES_BASE || '/Hana/';

// Stamped into the build so a bug report can say which build it was.
let BUILD = 'dev';
try {
  BUILD = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch {
  /* not a git checkout */
}

export default defineConfig({
  base: BASE,
  define: {
    // Read via globalThis so the plain Node tests (no Vite) get undefined
    // instead of a ReferenceError.
    'globalThis.__HANA_BUILD__': JSON.stringify(BUILD),
  },
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
    // GitHub Pages is configured to serve this repository from the `/docs`
    // folder of the working branch, so the production build lands there and
    // is committed. Rename this to `dist` if you switch Pages over to the
    // GitHub Actions source (see tools/pages-deploy.yml.example).
    outDir: 'docs',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
