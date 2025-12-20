/**
 * PositionTool Contract
 *
 * Tool for moving and rotating selected elements in the circuit scene.
 *
 * Architecture:
 * - Selection behavior (click to select/deselect) is handled by CircuitController
 * - PositionTool handles drag/move operations on already-selected elements
 * - PositionTool handles rotation via double-click or keyboard
 */

import type { IEditingTool, ToolType, HoverableType, SelectionData } from '../../../src/scene/shared/types';
import type * as THREE from 'three';
import type { UUID } from '../../../src/core/types/Identifier';

/**
 * Drag state for component movement
 *
 * Tracks the state of an in-progress drag operation.
 */
export interface DragState {
  /** The current selection being dragged */
  selection: SelectionData;

  /** Map of object IDs to their type and starting position */
  positionsAtStart: Map<UUID, { type: HoverableType; position: THREE.Vector3 }>;

  /** Cursor position when drag started (grid-snapped) */
  startPosition: THREE.Vector3;

  /** Current cursor position during drag (grid-snapped) */
  currentPosition: THREE.Vector3;
}

/**
 * PositionTool interface
 *
 * Extends IEditingTool with drag and keyboard support for
 * moving and rotating selected elements.
 *
 * Note: Selection is handled by CircuitController, not by this tool.
 */
export interface IPositionTool extends IEditingTool {
  readonly type: ToolType;

  /**
   * Handle pointer down to initiate drag on selected element
   * Called by internal event listener, not CircuitController
   *
   * @param event - The pointer event
   */
  handlePointerDown(event: MouseEvent): void;

  /**
   * Handle grid position move during drag operation
   * Called via gridPositionMove event subscription
   *
   * @param cursorGridPosition - Current grid-snapped cursor position
   */
  handleGridPositionMove(cursorGridPosition: THREE.Vector3): void;

  /**
   * Handle pointer up to complete drag operation
   * Called by internal event listener
   *
   * @param event - The pointer event
   */
  handlePointerUp(event: MouseEvent): void;

  /**
   * Handle keyboard events for drag cancellation and rotation
   *
   * @param event - Keyboard event
   */
  handleKeyDown(event: KeyboardEvent): void;

  /**
   * Handle double-click for rotation
   *
   * @param worldPosition - World position of double-click
   */
  handleDoubleClick(worldPosition: THREE.Vector3): void;
}
