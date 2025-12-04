/**
 * 3D Circuit Scene Managers Module
 * @module scene
 *
 * Provides Three.js-based scene managers for circuit visualization:
 * - CircuitSceneManager: Static circuit visualization with editing capabilities
 * - CircuitRunnerSceneManager: Live simulation visualization with animation
 *
 * @example
 * ```typescript
 * import { CircuitSceneManager, FactoryRegistry } from 'simple-circuit-engine/scene';
 *
 * const registry = new FactoryRegistry(defaultFactory);
 * const sceneManager = new CircuitSceneManager(registry);
 * sceneManager.initialize(container);
 * sceneManager.setCircuit(circuit);
 * ```
 */

// Scene Manager classes
export { CircuitSceneManager } from './static/CircuitSceneManager';
export { CircuitRunnerSceneManager } from './simulation/CircuitRunnerSceneManager';

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
