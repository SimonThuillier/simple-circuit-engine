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

// Editing Tools
export { SelectTool } from './static/tools/SelectTool';
export { PlaceComponentTool } from './static/tools/PlaceComponentTool';
export { WireTool } from './static/tools/WireTool';
export { BranchingPointTool } from './static/tools/BranchingPointTool';
export { DeleteTool } from './static/tools/DeleteTool';

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
  RenderEvent,
  RenderEventMap,
  RenderCallback,
  RenderObjectType,
  ChangedData,
  RendererOptions,
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
  ComponentVisualFactory,
  IComponentVisualFactory,
  IFactoryRegistry,
} from './shared/components/ComponentVisualFactory';

export { HitboxLayers } from './shared/LayerConstants';
export type { HitboxLayerValue } from './shared/LayerConstants';
export { BatteryVisualFactory } from './shared/components/BatteryVisualFactory';
export { SwitchVisualFactory } from './shared/components/SwitchVisualFactory';
export { SmallLEDVisualFactory } from './shared/components/SmallLEDVisualFactory';
