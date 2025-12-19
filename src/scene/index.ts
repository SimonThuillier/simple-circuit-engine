/**
 * 3D Circuit Controllers Module
 * @module scene
 *
 * Provides Three.js-based Controllers for circuit visualization:
 * - CircuitController: Static circuit visualization with editing capabilities
 * - CircuitRunnerController: Live simulation visualization with animation
 *
 * @example
 * ```typescript
 * import { CircuitController, FactoryRegistry } from 'simple-circuit-engine/scene';
 *
 * const registry = new FactoryRegistry(defaultFactory);
 * const controller = new CircuitController(registry);
 * controller.initialize(container);
 * controller.setCircuit(circuit);
 * ```
 */

// Controller classes
export { CircuitController } from './static/CircuitController';

// Editing Tools
export { BuildTool } from './static/tools/BuildTool';
export { AddComponentTool } from './static/tools/AddComponentTool';

// Shared utilities
export { FactoryRegistry } from './shared/FactoryRegistry';
export { ComponentVisualFactoryBase } from './shared/components/ComponentVisualFactory';
export { DefaultVisualFactory } from './shared/components/DefaultVisualFactory';
export { EventEmitter } from './shared/EventEmitter';
export { InterpolationController } from './shared/InterpolationController';
export { HoverManager } from './shared/HoverManager';

// Component Visual Factories

// Types
export type {
  ControllerEvent,
  ControllerEventMap,
  ControllerCallback,
  CircuitSceneObjectType,
  ControllerOptions,
  MapControlsOptions,
  HoverableType,
  HoveredElement,
  EnodeHitboxUserData,
  ComponentHitboxUserData,
  WireHitboxUserData,
  HitboxUserData,
  ToolType,
  CursorType,
  IEditingTool,
} from './shared/types';

export type {
  IComponentVisualFactory,
  IFactoryRegistry,
} from './shared/components/ComponentVisualFactory';

export { HitboxLayers } from './shared/LayerConstants';
export type { HitboxLayerValue } from './shared/LayerConstants';
export { BatteryVisualFactory } from './shared/components/BatteryVisualFactory';
export { SwitchVisualFactory } from './shared/components/SwitchVisualFactory';
export { SmallLEDVisualFactory } from './shared/components/SmallLEDVisualFactory';
