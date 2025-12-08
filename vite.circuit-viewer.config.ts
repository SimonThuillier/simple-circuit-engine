import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'scripts/viewer/src/main.ts'),
      formats: ['iife'],
      name: 'ViewerBundle',
      fileName: () => 'circuit-viewer.js',
    },
    outDir: 'output',
    emptyOutDir: false,
    sourcemap: true,
    target: 'es2022',
    minify: false, // Disable minification for debugging
    rollupOptions: {
      output: {
        // Ensure the bundle is readable
        compact: false,
      },
    },
  },
  resolve: {
    alias: {
      '@viewer': resolve(__dirname, './scripts/viewer/src'),
      '@/core': resolve(__dirname, './src/core'),
      '@/scene': resolve(__dirname, './src/scene')
    },
  },
});
