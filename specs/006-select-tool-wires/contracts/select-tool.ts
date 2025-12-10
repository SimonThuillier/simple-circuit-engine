/**
 * SelectTool Contract
 *
 * Extends IEditingTool with drag and keyboard support for
 * selecting, moving, and rotating components.
 */

import type { IEditingTool, ToolType } from '../../../src/scene/shared/types';
import type * as THREE from 'three';

/**
 * Extended tool interface with drag support
 *
 * Adds drag lifecycle methods to the base IEditingTool interface.
 * These methods enable smooth component movement with grid snapping.
 */
export interface ISelectTool extends IEditingTool {
  readonly type: ToolType.Select;

  /**
   * Handle mouse down on a component to initiate drag
   * @param worldPosition - World position of mouse
   * @param componentId - ID of component under mouse (if any)
   */
  handleMouseDown?(worldPosition: THREE.Vector3, componentId?: string): void;

  /**
   * Handle mouse move during drag operation
   * @param worldPosition - Current world position of mouse
   */
  handleMouseMove?(worldPosition: THREE.Vector3): void;

  /**
   * Handle mouse up to complete drag operation
   * @param worldPosition - Final world position of mouse
   */
  handleMouseUp?(worldPosition: THREE.Vector3): void;

  /**
   * Handle keyboard events for rotation and deselection
   * @param event - Keyboard event
   * @returns true if the event was handled
   */
  handleKeyDown?(event: KeyboardEvent): boolean;

  /**
   * Handle double-click for rotation
   * @param worldPosition - World position of double-click
   */
  handleDoubleClick?(worldPosition: THREE.Vector3): void;

  /**
   * Check if a drag operation is in progress
   * @returns true if currently dragging
   */
  isDragging(): boolean;

  /**
   * Cancel any in-progress drag operation
   * Reverts component to original position
   */
  cancelDrag?(): void;
}

/**
 * Drag state exposed by SelectTool for scene manager coordination
 */
export interface DragState {
  /** Whether drag is active */
  isDragging: boolean;

  /** Component being dragged */
  componentId: string | null;

  /** Original position before drag started */
  originalPosition: { x: number; y: number } | null;

  /** Current snapped grid position */
  currentPosition: { x: number; y: number } | null;
}
