import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './demo',
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
  },
  resolve: {
    alias: {
      '@/core': resolve(__dirname, './src/core'),
      '@/scene': resolve(__dirname, './src/scene'),
      '@/playback': resolve(__dirname, './src/playback'),
      'simple-circuit-engine': resolve(__dirname, './src/index.ts'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
