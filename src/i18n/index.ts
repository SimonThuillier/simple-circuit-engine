/**
 * Internationalization entrypoint for simple-circuit-engine.
 *
 * The library does not own an i18next instance — it relies on the consumer's
 * singleton (declared as a peer dependency, same pattern as `three`). Consumers
 * initialize i18next in their app, then call {@link registerSceTranslations} to
 * merge this library's resource bundles into it under the {@link SCE_NS}
 * namespace.
 *
 * Internally, library code should reference keys as `${SCE_NS}:path.to.key` so
 * they cannot collide with consumer strings.
 *
 * @packageDocumentation
 */
import i18next from 'i18next';
import type { i18n, TOptions } from 'i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';

/** Namespace used for all simple-circuit-engine translations. */
export const SCE_NS = 'sce' as const;

const bundles = { en, fr } as const;

/** Locales shipped with simple-circuit-engine. */
export type SceLocale = keyof typeof bundles;

/**
 * Register simple-circuit-engine translations into the consumer's i18next
 * instance under the `sce` namespace.
 *
 * Must be called after the consumer has initialized i18next. Safe to call
 * multiple times; existing bundles in the `sce` namespace are NOT overwritten
 * so consumers can register their own overrides first.
 *
 * @param instance - The consumer's i18next singleton
 */
export function registerSceTranslations(instance: i18n): void {
  for (const [lng, resources] of Object.entries(bundles)) {
    instance.addResourceBundle(
      lng,
      SCE_NS,
      resources,
      /* deep */ true,
      /* overwrite */ false,
    );
  }
}

/**
 * Translate a key inside the sce namespace using the shared i18next singleton.
 *
 * Uses a direct import of the i18next singleton rather than an injected
 * instance — this avoids module-state duplication when Vite pre-bundles the
 * library's subpath exports separately. i18next is declared as a
 * peerDependency so the consumer and library always share the same module.
 *
 * Internal helper — not re-exported from src/index.ts.
 */
export function sceT(key: string, options?: { defaultValue?: string } & Record<string, unknown>): string {
  return i18next.t(`${SCE_NS}:${key}`, options as TOptions) as string;
}
