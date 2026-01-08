import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'demo',
  resolve: {
    alias: {
      'simple-circuit-engine/core': resolve(__dirname, './src/core/index.ts'),
      'simple-circuit-engine/scene': resolve(__dirname, './src/scene/index.ts'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
