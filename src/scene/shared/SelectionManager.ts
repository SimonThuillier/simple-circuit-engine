/**
 * Selection Manager
 * @module scene/shared/SelectionManager
 *
 * Manages component selection state in the circuit scene.
 * Follows the same pattern as HoverManager for consistency.
 */

import type { UUID } from '../../core/types/Identifier';
import type * as THREE from 'three';
import type { IComponentVisualFactory } from './components/ComponentVisualFactory';

/**
 * Callback invoked when selection changes
 *
 * @param componentId - The newly selected component ID, or null if deselected
 * @param previousId - The previously selected component ID, or null if none was selected
 */
export type SelectionCallback = (componentId: UUID | null, previousId: UUID | null) => void;

/**
 * Manages component selection state for the circuit scene.
 *
 * Key responsibilities:
 * - Track single-component selection state
 * - Notify listeners of selection changes
 * - Apply/remove selection visuals via factory callbacks
 *
 * @example
 * ```typescript
 * const selectionManager = new SelectionManager();
 *
 * // Listen for selection changes
 * selectionManager.onSelectionChange((componentId, previousId) => {
 *   if (previousId) {
 *     factory.removeSelection(previousObject);
 *   }
 *   if (componentId) {
 *     factory.applySelection(newObject);
 *   }
 * });
 *
 * // Select a component
 * selectionManager.select(componentId, componentObject);
 *
 * // Deselect
 * selectionManager.deselect();
 * ```
 */
export class SelectionManager {
  /** Currently selected component ID */
  private selectedComponentId: UUID | null = null;

  /** Currently selected component's Three.js object */
  private selectedObject: THREE.Object3D | null = null;

  /** Timestamp when selection occurred (for double-click detection) */
  private selectedAt: number | null = null;

  /** Registered selection change callbacks */
  private callbacks: Set<SelectionCallback> = new Set();

  /** Factory for applying/removing selection visuals */
  private factory: IComponentVisualFactory | null = null;

  /**
   * Create a new SelectionManager
   *
   * @param factory - Optional factory for applying selection visuals
   */
  constructor(factory?: IComponentVisualFactory) {
    this.factory = factory ?? null;
  }

  /**
   * Set the factory used for selection visuals
   *
   * @param factory - Factory implementing applySelection/removeSelection
   */
  setFactory(factory: IComponentVisualFactory): void {
    this.factory = factory;
  }

  /**
   * Get the currently selected component ID
   *
   * @returns The selected component ID, or null if nothing is selected
   */
  getSelectedComponentId(): UUID | null {
    return this.selectedComponentId;
  }

  /**
   * Get the currently selected component's Three.js object
   *
   * @returns The selected Object3D, or null if nothing is selected
   */
  getSelectedObject(): THREE.Object3D | null {
    return this.selectedObject;
  }

  /**
   * Get the timestamp when selection occurred
   *
   * @returns Timestamp in milliseconds, or null if nothing is selected
   */
  getSelectedAt(): number | null {
    return this.selectedAt;
  }

  /**
   * Check if a specific component is selected
   *
   * @param componentId - The component ID to check
   * @returns true if the component is currently selected
   */
  isSelected(componentId: UUID): boolean {
    return this.selectedComponentId === componentId;
  }

  /**
   * Check if anything is selected
   *
   * @returns true if a component is currently selected
   */
  hasSelection(): boolean {
    return this.selectedComponentId !== null;
  }

  /**
   * Select a component
   *
   * If another component was previously selected, it will be deselected first.
   *
   * @param componentId - The component ID to select
   * @param object3D - The Three.js object to apply selection visual to
   */
  select(componentId: UUID, object3D: THREE.Object3D): void {
    const previousId = this.selectedComponentId;

    // No change if already selected
    if (previousId === componentId) {
      return;
    }

    // Remove selection visual from previous component
    if (this.selectedObject && this.factory) {
      this.factory.removeSelection(this.selectedObject);
    }

    // Update state
    this.selectedComponentId = componentId;
    this.selectedObject = object3D;
    this.selectedAt = Date.now();

    // Apply selection visual to new component
    if (this.factory) {
      this.factory.applySelection(object3D);
    }

    // Notify callbacks
    this.notifyCallbacks(componentId, previousId);
  }

  /**
   * Deselect the current selection
   */
  deselect(): void {
    const previousId = this.selectedComponentId;

    // Nothing to deselect
    if (!previousId) {
      return;
    }

    // Remove selection visual
    if (this.selectedObject && this.factory) {
      this.factory.removeSelection(this.selectedObject);
    }

    // Clear state
    this.selectedComponentId = null;
    this.selectedObject = null;
    this.selectedAt = null;

    // Notify callbacks
    this.notifyCallbacks(null, previousId);
  }

  /**
   * Register a callback for selection changes
   *
   * @param callback - Function to call when selection changes
   * @returns Unsubscribe function
   */
  onSelectionChange(callback: SelectionCallback): () => void {
    this.callbacks.add(callback);

    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Notify all registered callbacks of selection change
   *
   * @param componentId - New selection
   * @param previousId - Previous selection
   */
  private notifyCallbacks(componentId: UUID | null, previousId: UUID | null): void {
    for (const callback of this.callbacks) {
      try {
        callback(componentId, previousId);
      } catch (error) {
        console.error('Selection callback error:', error);
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Remove selection visual if present
    if (this.selectedObject && this.factory) {
      this.factory.removeSelection(this.selectedObject);
    }

    // Clear all state
    this.selectedComponentId = null;
    this.selectedObject = null;
    this.selectedAt = null;
    this.callbacks.clear();
    this.factory = null;
  }
}
