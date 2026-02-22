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
export { BuildTool } from './static/tools/BuildTool';
export { MultiSelectTool } from './static/tools/MultiSelectTool';
export {
  ComponentPickerWidget,
  BRANCHING_POINT_SENTINEL,
} from './static/tools/ComponentPickerWidget';
export type { PickerSelection, ComponentPickerState } from './static/tools/ComponentPickerWidget';
export type { MultiSelectToolMode } from './static/tools/MultiSelectTool';

// Circuit Writer
export { CircuitWriter } from './static/CircuitWriter';

// Components
export * from './shared/components';

// Shared managers
export { HoverManager } from './shared/HoverManager';
export type { HoverCallback } from './shared/HoverManager';
export { SelectionManager } from './shared/SelectionManager';
export type { SelectionCallback } from './shared/SelectionManager';
export { WireVisualManager } from './shared/WireVisualManager';
export type { WirePath } from './shared/WireVisualManager';
export { BranchingPointVisualFactory } from './shared/BranchingPointVisualFactory';

// Types
export type * from './shared/types';
export * from './shared/types';

export { HitboxLayers } from './shared/utils/LayerConstants';
export type { HitboxLayerValue } from './shared/utils/LayerConstants';
export * from './shared/utils/Options';

// setup helpers
export {
  oldRegisterBasicComponentsFactories,
  registerBasicComponentsFactories,
  registerGatesComponentsFactories,
} from './setup';
