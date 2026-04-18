import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Vite config used by:
//   - dev:  Express loads vite.createServer({...this config...}) as middleware
//   - build: `vite build` emits static assets to dist/
//
// Must export plain config (no server.port) — Express owns the HTTP listener.
export default defineConfig({
  root: resolve(__dirname, 'src/web'),
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
