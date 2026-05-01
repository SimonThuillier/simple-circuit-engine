# Consumer Notes

Practical guidance for integrating simple-circuit-engine into a consumer
application. Covers the i18n setup, runtime language switching, and bundler
pitfalls discovered during integration.

## Quick Start: Internationalization

### 1. Install peer dependencies

```bash
npm install three i18next simple-circuit-engine
```

`three` and `i18next` are peer dependencies. The library does not bundle its
own copy — it shares yours.

### 2. Initialize i18next, then register library translations

```ts
import i18next from 'i18next';
import { registerSceTranslations } from 'simple-circuit-engine';

// Initialize i18next however your app needs — the library doesn't care
// about your plugins, backends, or language detection strategy.
await i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  // ... your app's config
});

// Merge the library's bundled translations into your i18next instance.
// This adds keys under the "sce" namespace. Safe to call multiple times.
registerSceTranslations(i18next);
```

Order matters: `i18next.init()` first, `registerSceTranslations()` second.

### 3. Switch language at runtime

```ts
// Step 1: tell i18next (your app owns this call)
await i18next.changeLanguage('fr');

// Step 2: tell the engine to re-render its widgets
engine.setLanguage('fr');
```

`engine.setLanguage(lng)` is a **pure refresh signal**. It does not call
`i18next.changeLanguage` for you. The library never mutates your i18next
singleton — same pattern as with `three`: you own the instance, the library
borrows it.

### 4. Override library strings

Because `registerSceTranslations` uses `overwrite: false`, you can register
your own overrides *before* the library call:

```ts
i18next.addResourceBundle('en', 'sce', {
  components: { battery: { name: 'Power Cell' } },
}, true, false);

// Library call preserves your override — "Power Cell" wins
registerSceTranslations(i18next);
```

## Bundler Configuration (Vite)

The library exposes three subpath exports:

```
simple-circuit-engine       → dist/index.ts     (re-exports core + scene + i18n)
simple-circuit-engine/core  → dist/core/index.ts
simple-circuit-engine/scene → dist/scene/index.ts
```

When Vite pre-bundles these subpaths, it can create independent copies of
shared internal modules. If any library module holds mutable state, each copy
gets its own variable — and cross-copy communication breaks silently.

### Required: deduplicate peer dependencies

```ts
// vite.config.ts
export default defineConfig({
  resolve: {
    dedupe: ['three', 'i18next'],
  },
});
```

This ensures Vite resolves all imports of `three` and `i18next` to a single
canonical module, even if node_modules nesting or symlinks would otherwise
produce multiple physical paths.

### If aliasing subpaths to source (monorepo / dev mode)

When aliasing the library's subpath exports to source files for live
development, use the **array form** with specific-to-general ordering:

```ts
// vite.config.ts
export default defineConfig({
  resolve: {
    dedupe: ['three', 'i18next'],
    alias: [
      // Subpaths first (literal match, most specific)
      { find: 'simple-circuit-engine/core',  replacement: resolve(__dirname, './src/core/index.ts') },
      { find: 'simple-circuit-engine/scene', replacement: resolve(__dirname, './src/scene/index.ts') },
      // Root last (exact match via regex, so it doesn't shadow subpaths)
      { find: /^simple-circuit-engine$/,     replacement: resolve(__dirname, './src/index.ts') },
    ],
  },
});
```

The object-key form (`{ 'simple-circuit-engine': '...' }`) acts as a **prefix
match** — `simple-circuit-engine/core` matches the root alias and breaks.
The array form with an anchored regex (`/^simple-circuit-engine$/`) avoids this.

## Architecture: Why the Library Imports i18next Directly

The library's internal translation helper (`sceT`) imports the `i18next`
default export directly rather than reading from an injected instance variable:

```ts
// What the library does (simplified)
import i18next from 'i18next';

export function sceT(key: string): string {
  return i18next.t(`sce:${key}`);
}
```

This is deliberate. Since `i18next` is externalized in the library build
(`external: ['i18next']`), the compiled dist contains a bare
`import i18next from 'i18next'` that the consumer's bundler resolves to the
consumer's single copy. No module-scoped mutable state means bundler-level
module duplication is harmless — every copy calls the same singleton.

The previous approach (storing the consumer's instance in a module-level
`_sceI18n` variable set by `registerSceTranslations`) broke when Vite
pre-bundled the library's subpath exports separately, creating independent
copies of the variable. `registerSceTranslations` wrote to copy A;
`sceT` read from copy B — always `null`.

### Takeaway for library authors

Never use mutable module-level state as a communication channel between
your own modules when your library ships multiple entry points. Bundlers
may inline shared chunks into each entry independently. Either:

- Import the shared singleton directly (peer dependency, externalized), or
- Pass the dependency explicitly at each call site (pure functions, no state).

## Shipped Locales

The library ships `en` and `fr` translations. English is the canonical key set;
French mirrors it. Missing keys in any locale silently fall back to English
(i18next default behavior).

All library keys live under the `sce` namespace. Consumer keys in other
namespaces will never collide.
