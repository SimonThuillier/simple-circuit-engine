import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'scripts/editor/src/main.ts'),
      formats: ['iife'],
      name: 'ViewerBundle',
      fileName: () => 'circuit-editor.js',
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
      '@editor': resolve(__dirname, './scripts/editor/src'),
      '@/core': resolve(__dirname, './src/core'),
      '@/scene': resolve(__dirname, './src/scene'),
    },
  },
});
