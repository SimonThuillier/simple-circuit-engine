import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'scripts/visualizer/src/main.ts'),
      formats: ['iife'],
      name: 'VisualizerBundle',
      fileName: () => 'circuit-topology-visualizer.js',
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
      '@visualizer': resolve(__dirname, './scripts/visualizer/src'),
    },
  },
});
