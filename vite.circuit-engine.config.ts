import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'scripts/engine/src/main.ts'),
      formats: ['iife'],
      name: 'EngineBundle',
      fileName: () => 'circuit-engine.js',
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
      'simple-circuit-engine/core': resolve(__dirname, './src/core/index.ts'),
      'simple-circuit-engine/scene': resolve(__dirname, './src/scene/index.ts'),
    },
  },
});
