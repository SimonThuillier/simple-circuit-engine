/**
 * CircuitWriter Contract
 *
 * Manages editing operations from the 3D scene layer to the core circuit model.
 * Handles coordinate system conversion between Three.js visual space and circuit model space.
 *
 * Key Responsibilities:
 * - Convert visual positions (x, 0, -z) to model positions (x, y)
 * - Convert Three.js rotations (radians, negative for clockwise) to model rotations (degrees, positive)
 * - Update core circuit model when scene elements are edited
 * - Emit events for successful/failed model updates
 * - Round visual coordinates to nearest integer for grid snapping
 */

import type { UUID } from '../../../src/core/types/Identifier';
import type { Object3D } from 'three';

/**
 * Type of editing action being performed
 */
export type ModelEditAction = 'add' | 'edit' | 'delete';

/**
 * Event payload emitted after a circuit element action
 */
export interface CircuitElementActionEvent {
  /** Type of circuit element being modified */
  type: 'component' | 'enode' | 'wire';

  /** The action being performed */
  action: ModelEditAction;

  /** ID of the element being modified */
  id: UUID;

  /** Error if the operation failed, null if successful */
  error: Error | null;

  /** Data returned on success, null on error */
  data: object | null;
}

/**
 * CircuitWriter interface
 *
 * Synchronizes visual scene changes to the core circuit model.
 * Acts as a bridge between the scene layer (Three.js) and the data layer (Circuit).
 */
export interface ICircuitWriter {
  /**
   * Save a component action (add/edit/delete) to the circuit model
   *
   * Converts the component's visual position and rotation to model space:
   * - Visual position (x, 0, z) → Model position (x, -z)
   * - Visual rotation (radians, negative Y) → Model rotation (degrees, positive)
   * - Rounds all values to nearest integer for grid snapping
   *
   * @param componentId - The component's UUID
   * @param action - The type of action ('add', 'edit', or 'delete')
   * @param component - The THREE.Object3D representing the component in the scene
   *
   * @emits circuitElementAction event with result (success or error)
   *
   * @example
   * ```typescript
   * // Component at visual position (10, 0, -15) with rotation -π/2 (90° clockwise)
   * controllerType.saveComponentAction(componentId, 'edit', componentGroup);
   * // Updates model: position (10, 15), rotation 90°
   * ```
   */
  saveComponentAction(componentId: UUID, action: ModelEditAction, component: Object3D): void;

  /**
   * Save an enode action (add/edit/delete) to the circuit model
   *
   * @param enodeId - The enode's UUID
   * @param action - The type of action
   * @param enode - The THREE.Object3D representing the enode in the scene
   *
   * @emits circuitElementAction event with result
   *
   * @remarks Not yet implemented in this feature phase
   */
  saveEnodeAction(enodeId: UUID, action: ModelEditAction, enode: Object3D): void;

  /**
   * Save a wire action (add/edit/delete) to the circuit model
   *
   * @param wireId - The wire's UUID
   * @param action - The type of action
   * @param wire - The THREE.Object3D representing the wire in the scene
   *
   * @emits circuitElementAction event with result
   *
   * @remarks Not yet implemented in this feature phase
   */
  saveWireAction(wireId: UUID, action: ModelEditAction, wire: Object3D): void;
}

/**
 * Coordinate System Conversions
 *
 * Visual Space (Three.js):
 * - X: left (-) to right (+)
 * - Y: always 0 (ground plane)
 * - Z: back (-) to front (+)
 *
 * Model Space (Circuit):
 * - X: left to right (same as visual)
 * - Y: top to bottom (maps to -Z in visual space)
 *
 * Conversion formulas:
 * - Model X = Visual X
 * - Model Y = -Visual Z
 * - Visual X = Model X
 * - Visual Z = -Model Y
 *
 * Rotation Conversions:
 * - Visual: radians, Y-axis, negative for clockwise
 * - Model: degrees, 0/90/180/270, positive for clockwise
 * - Formula: Model degrees = -round(Visual radians × 180 / π)
 */
