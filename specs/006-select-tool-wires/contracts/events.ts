/**
 * Event Contracts for Select Tool & Wire Improvements
 *
 * Extends the existing RenderEventMap with selection and drag events.
 */

import type { UUID } from '../../../src/core/types/UUID';
import type { Position } from '../../../src/core/types/Position';

/**
 * Selection change event payload
 */
export interface SelectionChangeEvent {
  /** Newly selected component ID, or null if deselected */
  componentId: UUID | null;

  /** Previously selected component ID, or null if none was selected */
  previousComponentId: UUID | null;
}

/**
 * Drag start event payload
 */
export interface DragStartEvent {
  /** Component being dragged */
  componentId: UUID;

  /** Starting grid position */
  startPosition: Position;
}

/**
 * Drag move event payload
 */
export interface DragMoveEvent {
  /** Component being dragged */
  componentId: UUID;

  /** Current snapped grid position */
  currentPosition: Position;

  /** Raw world position (not snapped) */
  worldPosition: { x: number; z: number };
}

/**
 * Drag end event payload
 */
export interface DragEndEvent {
  /** Component that was dragged */
  componentId: UUID;

  /** Original position before drag */
  startPosition: Position;

  /** Final position after drag */
  endPosition: Position;

  /** Whether the position actually changed */
  positionChanged: boolean;
}

/**
 * Drag cancel event payload
 */
export interface DragCancelEvent {
  /** Component whose drag was cancelled */
  componentId: UUID;

  /** Position restored to */
  restoredPosition: Position;
}

/**
 * Rotation event payload
 */
export interface RotationEvent {
  /** Component that was rotated */
  componentId: UUID;

  /** Previous rotation in degrees */
  previousRotation: number;

  /** New rotation in degrees */
  newRotation: number;
}

/**
 * Extended event map for CircuitSceneManager
 *
 * These events should be added to the existing RenderEventMap.
 */
export interface SelectToolEventMap {
  /** Emitted when selection changes */
  selectionChange: SelectionChangeEvent;

  /** Emitted when drag operation starts */
  dragStart: DragStartEvent;

  /** Emitted during drag operation (throttled) */
  dragMove: DragMoveEvent;

  /** Emitted when drag operation completes successfully */
  dragEnd: DragEndEvent;

  /** Emitted when drag operation is cancelled */
  dragCancel: DragCancelEvent;

  /** Emitted when a component is rotated */
  componentRotated: RotationEvent;
}
