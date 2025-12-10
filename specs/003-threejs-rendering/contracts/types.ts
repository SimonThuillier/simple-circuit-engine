/**
 * Shared types for 3D Circuit SceneManagers
 * @module rendering/contracts/types
 */

import type { UUID } from '@/core/types/Identifier';
import type * as THREE from 'three';

/**
 * Supported renderer event types (includes tool system events)
 */
export type RenderEvent =
  | 'hover'
  | 'unhover'
  | 'select'
  | 'deselect'
  | 'error'
  | 'ready'
  | 'toolActivated'
  | 'toolDeactivated'
  | 'toolOperationStarted'
  | 'toolOperationCompleted'
  | 'toolOperationCancelled'
  | 'toolValidationError'
  | 'cursorChangeRequested';

/**
 * Object types that can be interacted with in the renderer
 */
export type RenderObjectType = 'component' | 'wire' | 'enode';

/**
 * Event payload map for type-safe event emission
 */
export interface RenderEventMap {
  hover: { objectId: UUID; objectType: RenderObjectType };
  unhover: { objectId: UUID; objectType: RenderObjectType };
  select: { objectId: UUID; objectType: RenderObjectType };
  deselect: { objectId: UUID; objectType: RenderObjectType };
  error: { message: string; error?: Error };
  ready: { renderer: 'static' | 'simulation' };
  // Tool system events
  toolActivated: { toolType: ToolType };
  toolDeactivated: { toolType: ToolType };
  toolOperationStarted: { toolType: ToolType; operationData: unknown };
  toolOperationCompleted: { toolType: ToolType; operationData: unknown; changedData: ChangedData };
  toolOperationCancelled: { toolType: ToolType };
  toolValidationError: { toolType: ToolType; errorMessage: string };
  cursorChangeRequested: { cursorType: CursorType };
}

/**
 * Callback function type for renderer events
 */
export type RenderCallback<T = any> = (payload: T) => void;

/**
 * Optional parameter for incremental renderer updates
 * If provided, only specified elements are updated
 * If omitted or empty, full update is performed
 */
export interface ChangedData {
  /** Component IDs that were added to the circuit */
  addedComponents?: UUID[];
  /** Component IDs that were removed from the circuit */
  removedComponents?: UUID[];
  /** Component IDs that were modified (position, rotation, config) */
  updatedComponents?: UUID[];
  /** Wire IDs that were added to the circuit */
  addedWires?: UUID[];
  /** Wire IDs that were removed from the circuit */
  removedWires?: UUID[];
  /** Wire IDs that were modified (path changed) */
  updatedWires?: UUID[];
  /** ENode IDs that were added to the circuit */
  addedENodes?: UUID[];
  /** ENode IDs that were removed from the circuit */
  removedENodes?: UUID[];
  /** Flag indicating simulation state has changed (for CircuitRunnerSceneManager) */
  stateChanged?: boolean;
}

/**
 * Optional configuration for renderer initialization
 */
export interface SceneManagerOptions {
  /** Background color for the scene (default: 0x000000) */
  backgroundColor?: number;
  /** Enable anti-aliasing (default: true) */
  antialias?: boolean;
  /** Camera field of view in degrees (default: 75) */
  cameraFov?: number;
  /** Camera near clipping plane (default: 0.1) */
  cameraNear?: number;
  /** Camera far clipping plane (default: 1000) */
  cameraFar?: number;
  /** Enable grid helper visualization (default: true) */
  showGrid?: boolean;
  /** Enable axes helper visualization (default: false) */
  showAxes?: boolean;
}

/**
 * Tool System Types
 */

/**
 * Available editing tool types
 */
export type ToolType = 'select' | 'placeComponent' | 'wire' | 'branchingPoint' | 'delete';

/**
 * Cursor types for tool operations
 */
export type CursorType =
  | 'default'
  | 'pointer'
  | 'crosshair'
  | 'move'
  | 'not-allowed'
  | 'grab'
  | 'grabbing';

/**
 * Interface defining contract for editing tool implementations
 *
 * All editing tools must implement this interface to integrate with
 * CircuitSceneManager's tool system.
 *
 * @example
 * ```typescript
 * class PositionTool implements IEditingTool {
 *   readonly type = 'position';
 *
 *   onActivate() {
 *     // Setup selection mode
 *   }
 *
 *   onDeactivate() {
 *     // Cleanup selection state
 *   }
 *
 *   getCursorType() {
 *     return this.isOverComponent ? 'pointer' : 'default';
 *   }
 *
 *   getPreviewObjects() {
 *     return []; // Select tool doesn't have preview objects
 *   }
 * }
 * ```
 */
export interface IEditingTool {
  /**
   * Unique identifier for this tool type
   */
  readonly type: ToolType;

  /**
   * Called when tool becomes active
   * Use this to setup tool state and initialize preview objects
   */
  onActivate(): void;

  /**
   * Called when tool is deactivated
   * Use this to cleanup tool state and dispose preview objects
   */
  onDeactivate(): void;

  /**
   * Get the current cursor type for this tool
   * Can change dynamically based on tool state (e.g., hovering over valid target)
   *
   * @returns Current cursor style
   */
  getCursorType(): CursorType;

  /**
   * Get preview objects to render in the scene
   * These objects are rendered semi-transparently to indicate in-progress operations
   *
   * @returns Array of Three.js objects to render as previews
   */
  getPreviewObjects(): THREE.Object3D[];
}
