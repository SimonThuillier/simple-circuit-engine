import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'core/index': resolve(__dirname, 'src/core/index.ts'),
        'scene/index': resolve(__dirname, 'src/scene/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rolldownOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: ['three', /^three\/addons\/.*/, /^three\/examples\/.*/, 'lil-gui'],
      output: {
        // Provide global variables for externalized deps in UMD build
        globals: {
          three: 'THREE',
          lilgui: 'LIL-GUI',
        },
        preserveModules: false,
      },
    },
    sourcemap: true,
    target: 'es2022',
    minify: 'esbuild',
  },
  plugins: [
    dts({
      include: ['src'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    }),
  ],
  resolve: {
    alias: {
      'simple-circuit-engine/core': resolve(__dirname, './src/core/index.ts'),
      'simple-circuit-engine/scene': resolve(__dirname, './src/scene/index.ts'),
    },
  },
});
