/**
 * Event Contracts for Select Tool & Wire Improvements
 *
 * Extends the existing ControllerEventMap with selection and drag events.
 */

import type { UUID } from '../../../src/core/types/UUID';
import type { Position } from '../../../src/core/types/Position';
import type {SelectionData} from "../../../src/scene/shared/types";
import type * as THREE from "three";

/**
 * Selection change event payload
 */
export interface SelectionChangeEvent {
  /** New selection, or null if deselected */
  newSelection: SelectionData | null;

  /** Previous selection, or null if nothing was selected */
  previousSelection: SelectionData | null;
}

/**
 * Drag start event payload
 */
export interface DragStartEvent {
  /** Selection being dragged */
  selection: SelectionData;

  /** Starting grid position */
  startPosition: THREE.Vector3;
}

/**
 * Drag move event payload
 */
export interface DragMoveEvent {
  /** Selection being dragged */
  selection: SelectionData;

  /** Current cursor grid position */
  currentPosition: THREE.Vector3;

  /** delta between current Position and start position */
  delta: THREE.Vector3;
}

/**
 * Drag end event payload
 */
export interface DragEndEvent {
  /** Selection which was dragged */
  selection: SelectionData;

  /** finishing grid position */
  finalPosition: THREE.Vector3;
}

/**
 * Drag cancel event payload
 */
export interface DragCancelEvent {
  /** Selection which was dragged */
  selection: SelectionData;
}

/**
 * Rotation event payload
 */
export interface RotationEvent {
  /** Component that was rotated */
  componentId: UUID;

  /** New rotation in radian */
  newRotation: number;
}
