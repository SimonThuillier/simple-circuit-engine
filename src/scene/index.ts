/**
 * 3D Circuit Renderers Module
 * @module rendering
 *
 * Provides Three.js-based renderers for circuit visualization:
 * - CircuitSceneManager: Static circuit visualization with editing capabilities
 * - SimulationCircuitRenderer: Live simulation visualization with animation
 *
 * @example
 * ```typescript
 * import { CircuitSceneManager, FactoryRegistry } from 'simple-circuit-engine/rendering';
 *
 * const registry = new FactoryRegistry(defaultFactory);
 * const renderer = new CircuitSceneManager(circuit, registry);
 * renderer.initialize(container);
 * ```
 */

// Renderer classes
export { CircuitSceneManager } from './static/CircuitSceneManager';
export { SimulationCircuitRenderer } from './simulation/SimulationCircuitRenderer';

// Shared utilities
export { FactoryRegistry } from './shared/FactoryRegistry';
export { createDefaultFactory } from './shared/ComponentVisualFactory';
export { EventEmitter } from './shared/EventEmitter';
export { InterpolationController } from './shared/InterpolationController';

// Types
export type {
  RenderEvent,
  RenderEventMap,
  RenderCallback,
  RenderObjectType,
  ChangedData,
  RendererOptions,
  ToolType,
  CursorType,
  IEditingTool,
} from './shared/types';

export type {
  ComponentVisualFactory,
  IFactoryRegistry,
} from './shared/ComponentVisualFactory';
