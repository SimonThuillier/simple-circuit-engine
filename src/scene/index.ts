/**
 * 3D Circuit Controllers Module
 * @module scene
 *
 * Provides Three.js-based Controllers for circuit visualization:
 * - CircuitController: Static circuit visualization with editing capabilities
 * - CircuitRunnerController: Live simulation visualization with animation
 * And Engine that combines both controllers.
 *
 * @example
 * ```typescript
 * import { CircuitController, FactoryRegistry } from 'simple-circuit-controller/scene';
 *
 * const registry = new FactoryRegistry(defaultFactory);
 * const controller = new CircuitController(registry);
 * controller.initialize(container);
 * controller.setCircuit(circuit);
 * ```
 */

// main engine
export { CircuitEngine } from './CircuitEngine';
// Controller classes
export { CircuitController } from './static/CircuitController';
export { CircuitRunnerController } from './simulation/CircuitRunnerController';
export type { AbstractCircuitController } from './shared/AbstractCircuitController';

// Editing Tools
export { AddComponentTool } from './static/tools/AddComponentTool';
export { BuildTool } from './static/tools/BuildTool';
export { MultiSelectTool } from './static/tools/MultiSelectTool';

// Components
export * from './shared/components';

// Types
export type * from './shared/types';
export * from './shared/types';

export { HitboxLayers } from './shared/utils/LayerConstants';
export type { HitboxLayerValue } from './shared/utils/LayerConstants';

// setup helpers
export { registerBasicComponentsFactories } from './setup';
