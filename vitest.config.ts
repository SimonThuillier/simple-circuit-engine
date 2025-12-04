import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'dist-demo/',
        'demo/',
        'examples/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/index.ts', // Re-exports only, no logic
      ],
      thresholds: {
        // Core module must meet 80% coverage as per constitution
        './src/core/**/*.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@/core': resolve(__dirname, './src/core'),
      '@/scene': resolve(__dirname, './src/scene'),
      '@/playback': resolve(__dirname, './src/playback'),
    },
  },
});
