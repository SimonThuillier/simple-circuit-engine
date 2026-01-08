import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // Changed to jsdom to support DOM APIs for scene tests
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
      'simple-circuit-engine/core': resolve(__dirname, './src/core/index.ts'),
      'simple-circuit-engine/scene': resolve(__dirname, './src/scene/index.ts'),
    },
  },
});
