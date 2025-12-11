/**
 * Selection Manager
 * @module scene/shared/SelectionManager
 *
 * Manages component selection state in the circuit scene.
 * However SceneManager handles applying or not visuals for selection, based on current toolState.
 * Follows a similar pattern as HoverManager for consistency.
 */

import type { UUID } from '../../core/types/Identifier';
import type { HoverableType, SelectionData } from './types';

/**
 * Callback invoked when selection changes
 *
 * @param newSelection - The new selection, or null if deselected
 * @param previousSelection - The previous selection, or null if none was selected
 */
export type SelectionCallback = (
  newSelection: SelectionData | null,
  previousSelection: SelectionData | null
) => void;

/**
 * Manages selected components, enodes or wires for the circuit scene.
 * Multi-selection is planned (notably with the use of a flexible SelectionData) but still to implement.
 *
 * Key current responsibilities:
 * - Track -currently single object- selection state
 * - Notify listeners of selection changes (observer pattern)
 *
 * @example
 * ```typescript
 * const selectionManager = new SelectionManager();
 *
 *
 * // Select a single object
 * selectionManager.selectOne('component', 'component-uuid-1234');
 * selectionManager.selectOne('enode', 'enode-uuid-1234');
 * selectionManager.selectOne('wire', 'wire-uuid-1234');
 *
 * // Deselect
 * selectionManager.deselect();
 * ```
 */
export class SelectionManager {
  /** Current selection */
  private selection: SelectionData | null = null;

  /** Timestamp when selection occurred (for double-click detection) */
  private selectedAt: number | null = null;

  /** Registered selection change callbacks */
  private callbacks: Set<SelectionCallback> = new Set();

  /**
   * Create a new SelectionManager
   */
  constructor() {}

  /**
   * Get the current selection
   *
   * @returns The SelectionData, or null if nothing is selected
   */
  getSelection(): SelectionData | null {
    return this.selection;
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
   * Check if a specific object is selected
   *
   * @param type - The type of hoverable object
   * @param objectId - The object ID to check
   * @returns true if the object is currently selected
   */
  isSelected(type: HoverableType, objectId: UUID): boolean {
    if (!this.selection) {
      return false;
    }
    if (this.selection.kind === 'mono') {
      return this.selection.type === type && this.selection.id === objectId;
    }
    if (this.selection.kind === 'multi') {
      if (type === 'component') {
        return this.selection.components?.has(objectId) ?? false;
      }
      if (type === 'enode') {
        return this.selection.enodes?.has(objectId) ?? false;
      }
      if (type === 'wire') {
        return this.selection.wires?.has(objectId) ?? false;
      }
    }
    return false;
  }

  /**
   * Check if anything is selected
   *
   * @returns true if one object is currently selected or several objects are currently selected
   */
  hasSelection(): boolean {
    return this.selection !== null;
  }

  private _selectionsEqual(a: SelectionData | null, b: SelectionData | null): boolean {
    if (a === b) {
      return true;
    }
    if (a === null || b === null) {
      return false;
    }
    if (a.kind !== b.kind) {
      return false;
    }
    if (a.kind === 'mono' && b.kind === 'mono') {
      return a.id === b.id;
    }
    if (a.kind === 'multi' && b.kind === 'multi') {
      const aComponents = a.components ?? new Map<UUID, string | null>();
      const bComponents = b.components ?? new Map<UUID, string | null>();
      const aEnodes = a.enodes ?? new Map<UUID, string | null>();
      const bEnodes = b.enodes ?? new Map<UUID, string | null>();
      const aWires = a.wires ?? new Map<UUID, string | null>();
      const bWires = b.wires ?? new Map<UUID, string | null>();

      if (
        aComponents.size !== bComponents.size ||
        aEnodes.size !== bEnodes.size ||
        aWires.size !== bWires.size
      ) {
        return false;
      }

      for (const id of aComponents.keys()) {
        if (!bComponents.has(id)) {
          return false;
        }
      }
      for (const id of aEnodes.keys()) {
        if (!bEnodes.has(id)) {
          return false;
        }
      }
      for (const id of aWires.keys()) {
        if (!bWires.has(id)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Select one object
   *
   * If another object was previously selected or a multi selection existed, they will be deselected first.
   *
   * @param type - The type of hoverable object to select
   * @param objectId - The object ID to select
   * @param data - Optional extra data
   */
  selectOne(type: HoverableType, objectId: UUID, data: string | null = null): void {
    const previousSelection = this.selection;
    const newSelection: SelectionData = { kind: 'mono', type: type, id: objectId, data: data };

    // No change if selections are equal
    if (this._selectionsEqual(newSelection, previousSelection)) {
      return;
    }

    // Update state
    this.selection = newSelection;
    this.selectedAt = Date.now();

    // Notify callbacks
    this.notifyCallbacks(newSelection, previousSelection);
  }

  /**
   * Deselect the current selection
   */
  deselect(): void {
    const previousSelection = this.selection;
    // Nothing to deselect
    if (!previousSelection) {
      return;
    }
    // Clear state
    this.selection = null;
    this.selectedAt = null;

    // Notify callbacks
    this.notifyCallbacks(null, previousSelection);
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
   * @param newSelection - New selection
   * @param previousSelection - Previous selection
   */
  private notifyCallbacks(
    newSelection: SelectionData | null,
    previousSelection: SelectionData | null
  ): void {
    for (const callback of this.callbacks) {
      try {
        callback(newSelection, previousSelection);
      } catch (error) {
        console.error('Selection callback error:', error);
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.selection = null;
    this.selectedAt = null;
    this.callbacks.clear();
  }
}
