/**
 * SelectionManager Contract
 *
 * Manages component selection state in the circuit scene.
 * Follows the same pattern as HoverManager for consistency.
 */

import type { UUID } from '../../../src/core/types/UUID';
import type * as THREE from 'three';

/**
 * Callback invoked when selection changes
 * @param componentId - The newly selected component ID, or null if deselected
 * @param previousId - The previously selected component ID, or null if none was selected
 */
export type SelectionCallback = (
  componentId: UUID | null,
  previousId: UUID | null
) => void;

/**
 * SelectionManager interface
 *
 * Centralizes selection state management, enabling:
 * - Single source of truth for selection
 * - Event-driven updates to visual states
 * - Decoupling of selection logic from tools
 */
export interface ISelectionManager {
  /**
   * Get the currently selected component ID
   * @returns The selected component ID, or null if nothing is selected
   */
  getSelectedComponentId(): UUID | null;

  /**
   * Check if a specific component is selected
   * @param componentId - The component ID to check
   * @returns true if the component is currently selected
   */
  isSelected(componentId: UUID): boolean;

  /**
   * Select a component
   * @param componentId - The component ID to select
   * @param object3D - The Three.js object to apply selection visual to
   * @emits SelectionCallback with new and previous selection
   */
  select(componentId: UUID, object3D: THREE.Object3D): void;

  /**
   * Deselect the current selection
   * @emits SelectionCallback with null and previous selection
   */
  deselect(): void;

  /**
   * Register a callback for selection changes
   * @param callback - Function to call when selection changes
   * @returns Unsubscribe function
   */
  onSelectionChange(callback: SelectionCallback): () => void;

  /**
   * Clean up resources
   */
  dispose(): void;
}
