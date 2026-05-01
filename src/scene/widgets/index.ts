/**
 * Integrated overlay widgets shipped with the scene module.
 *
 * Public surface kept minimal: only `WidgetsManager` is exported so consumers
 * who opt out of the bundled wiring can still mount it manually. Individual
 * widgets are implementation detail.
 */

export { WidgetsManager } from './WidgetsManager';
export type { IEngineForWidgets } from './WidgetsManager';
