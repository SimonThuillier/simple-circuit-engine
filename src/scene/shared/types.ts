/**
 * Shared types for 3D Circuit Renderers
 * @module rendering/shared/types
 */

import type { UUID } from '../../core/types/Identifier';
import type * as THREE from 'three';
import type { ComponentType } from '@/core/types/ComponentType';
import type { Line2 } from 'three/examples/jsm/lines/Line2.js';
import type { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

// Re-export Line2 types for convenience
export type { Line2, LineGeometry, LineMaterial };

/**
 * Object types that can be interacted within the scene manager to render
 */
export type CircuitSceneObjectType =
  | 'componentGroup'
  | 'component'
  | 'componentHitbox'
  | 'enodeGroup'
  | 'enode'
  | 'enodeHitbox'
  | 'wire';

/**
 * Types of circuit elements that can be hovered / selected
 */
export type HoverableType = 'component' | 'enode' | 'wire';

export type ModelEditAction = 'edit' | 'add' | 'delete';

/**
 * Supported scene manager event types (includes tool system events)
 */
export type SceneManagerEvent =
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
  | 'cursorChangeRequested'
  | 'circuitElementAction'
  | 'branchingPointCreated'
  | 'wireSplit'
  | 'wireIntermediatePositionsChanged'
  | 'enodeSourceTypeChanged'
  | 'gridPositionMove'
  | 'dragStart'
  | 'dragMove'
  | 'dragEnd'
  | 'dragCancel'
  | 'componentRotated'
  | 'selectionChange';

/**
 * Event payload map for type-safe event emission
 */
export interface SceneManagerEventMap {
  gridPositionMove: THREE.Vector3;
  hover: {
    objectId: UUID;
    objectType: CircuitSceneObjectType;
    userData?: HitboxUserData | undefined;
  };
  unhover: {
    objectId: UUID;
    objectType: CircuitSceneObjectType;
    userData?: HitboxUserData | undefined;
  };
  select: SelectionData;
  deselect: SelectionData;
  selectionChange: { newSelection: SelectionData | null; previousSelection: SelectionData | null };
  dragStart: { selection: SelectionData; startPosition: THREE.Vector3 };
  dragMove: { selection: SelectionData; currentPosition: THREE.Vector3; delta: THREE.Vector3 };
  dragEnd: { selection: SelectionData; finalPosition: THREE.Vector3 };
  dragCancel: { selection: SelectionData };
  componentRotated: { componentId: UUID; newRotation: number };
  error: { message: string; error?: Error };
  ready: { manager: 'static' | 'simulation' };
  // Tool system events
  toolActivated: { toolType: ToolType };
  toolDeactivated: { toolType: ToolType };
  toolOperationStarted: { toolType: ToolType; operationData: unknown };
  toolOperationCompleted: { toolType: ToolType; operationData: unknown; changedData: ChangedData };
  toolOperationCancelled: { toolType: ToolType };
  toolValidationError: { toolType: ToolType; errorMessage: string };
  cursorChangeRequested: { cursorType: CursorType };
  // Model circuit events (add, edit, delete)
  circuitElementAction: {
    type: HoverableType;
    action: ModelEditAction;
    id?: UUID | undefined;
    error?: Error | null;
    data?: object | null;
  };
  // Branching point events (T024)
  branchingPointCreated: {
    enodeId: UUID;
    position: { x: number; y: number };
  };
  wireSplit: {
    originalWireId: UUID;
    branchingPointId: UUID;
    wire1Id: UUID;
    wire2Id: UUID;
  };
  wireIntermediatePositionsChanged: {
    wireId: UUID;
    positions: { x: number; y: number }[];
  };
  enodeSourceTypeChanged: {
    enodeId: UUID;
    sourceType: string | null;
  };
}

/**
 * Callback function type for scene manager events
 */
export type SceneManagerCallback<T = any> = (payload: T) => void;

/**
 * Optional parameter for incremental scene manager updates
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
  /** Flag indicating simulation state has changed (for SimulationCircuitRenderer) */
  stateChanged?: boolean;
}

/**
 * Optional configuration for scene manager initialization
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
  /** MapControls configuration (optional) */
  mapControls?: MapControlsOptions;
}

/**
 * Configuration options for MapControls integration
 *
 * All properties are optional with sensible defaults.
 *
 * @example
 * ```typescript
 * manager.initialize(container, {
 *   mapControls: {
 *     enableRotate: false,  // Disable rotation for 2D-only view
 *     maxDistance: 50,      // Limit zoom out
 *   }
 * });
 * ```
 */
export interface MapControlsOptions {
  /** Enable click-drag panning (default: true) */
  enablePan?: boolean;
  /** Enable scroll wheel zooming (default: true) */
  enableZoom?: boolean;
  /** Enable right-click rotation (default: true) */
  enableRotate?: boolean;
  /** Enable smooth deceleration when releasing controls (default: true) */
  enableDamping?: boolean;
  /** Damping strength (0 = instant stop, 1 = very slow stop) (default: 0.05) */
  dampingFactor?: number;
  /** Minimum zoom distance from target (default: 1) */
  minDistance?: number;
  /** Maximum zoom distance from target (default: 100) */
  maxDistance?: number;
  /** Pan speed multiplier (default: 1.0) */
  panSpeed?: number;
  /** Zoom speed multiplier (default: 1.0) */
  zoomSpeed?: number;
  /** Rotation speed multiplier (default: 1.0) */
  rotateSpeed?: number;
}

/**
 * Represents the currently hovered circuit element
 *
 * @example
 * ```typescript
 * const hovered = hoverManager.getHoveredElement();
 * if (hovered?.type === 'component') {
 *   highlightComponent(hovered.id);
 * }
 * ```
 */
export interface HoveredElement {
  /** Discriminated type for priority and handling */
  type: HoverableType;
  /** UUID of the hovered circuit element */
  id: UUID;
  /** Three.js object type (matches existing CircuitSceneObjectType) */
  objectType: CircuitSceneObjectType;
  /** Reference to the Three.js hitbox mesh */
  object3D: THREE.Object3D;
}

/**
 * UserData structure for enode hitbox meshes
 */
export interface EnodeHitboxUserData {
  type: 'enodeHitbox';
  enodeId: string;
  componentId: string | null;
  label: string | null;
}

/**
 * UserData structure for component hitbox meshes
 */
export interface ComponentHitboxUserData {
  type: 'componentHitbox';
  componentId: string;
  componentType: ComponentType;
}

/**
 * UserData structure for wire hitbox meshes
 */
export interface WireHitboxUserData {
  type: 'wire';
  wireId: string;
}

/**
 * Union of all hitbox userData types
 */
export type HitboxUserData = EnodeHitboxUserData | ComponentHitboxUserData | WireHitboxUserData;

/**
 * Supported wires material states for visual feedback
 */
export type WireMaterialState = 'idle' | 'hovered' | 'selected';

/** Represents the Selection of one Hoverable Element of the scene **/
export interface MonoSelectionData {
  kind: 'mono';
  type: HoverableType;
  id: UUID;
  data?: string | null; // optional extra data
}

/** Represents the Selection of multiple Hoverable Elements of the scene **/
export interface MultiSelectionData {
  kind: 'multi';
  components?: Map<UUID, string | null>;
  enodes?: Map<UUID, string | null>;
  wires?: Map<UUID, string | null>;
}

export type SelectionData = MonoSelectionData | MultiSelectionData;

/**
 * UserData structure for component visual state management
 *
 * Tracks hover, selection, and animation state for component visuals.
 * Used by visual factories to store original material properties for restoration.
 */
export interface ComponentVisualUserData {
  /** Whether the component is currently hovered */
  isHovered?: boolean;
  /** Whether the component is currently selected (future feature) */
  isSelected?: boolean;
  /** Whether the component is currently being animated (simulation state) */
  isAnimating?: boolean;
  /** Original emissive color (for hover/animation restoration) */
  originalEmissive?: THREE.Color;
  /** Original emissive intensity (for hover/animation restoration) */
  originalEmissiveIntensity?: number;
}

/**
 * Tool System Types
 */

/**
 * Available editing tool types
 */
export type ToolType = 'position' | 'addComponent' | 'wire' | 'branchingPoint' | 'delete';

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
