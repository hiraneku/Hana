import { defineConfig } from 'vite';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'Hana';

export default defineConfig(({ command }) => ({
  // Dev preview stays at `/`; production files target the GitHub Pages project path.
  base: command === 'build' ? `/${repository}/` : '/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
}));
