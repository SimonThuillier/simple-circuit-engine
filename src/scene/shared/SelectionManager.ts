/**
 * Selection Manager
 * @module scene/shared/SelectionManager
 *
 * Manages component selection state in the circuit scene.
 * However controller handles applying or not visuals for selection, based on current toolState.
 * Follows a similar pattern as HoverManager for consistency.
 */

import type { UUID } from 'simple-circuit-engine/core';
import { ENodeType } from 'simple-circuit-engine/core';
import type { HoverableType, SelectionData, MultiSelectionData } from './types';

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
   * @param userData - Optional userData of the 3D object being selected
   */
  selectOne(type: HoverableType, objectId: UUID, userData?: object | undefined): void {
    const previousSelection = this.selection;
    const newSelection: SelectionData = { kind: 'mono', type: type, id: objectId, data: null };

    // No change if selections are equal
    if (this._selectionsEqual(newSelection, previousSelection)) {
      return;
    }

    if (type === 'enode' && !!userData) {
      // @ts-ignore
      newSelection.data = !userData['componentId'] ? ENodeType.BranchingPoint : ENodeType.Pin;
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
   * Select multiple elements at once, replacing any existing selection
   *
   * Creates a MultiSelectionData with the provided element maps.
   * Empty maps are allowed; passing all empty maps clears the selection.
   *
   * @param components - Map of component IDs to optional metadata
   * @param enodes - Map of enode IDs to optional metadata
   * @param wires - Map of wire IDs to optional metadata
   */
  selectMultiple(
    components?: Map<UUID, string | null>,
    enodes?: Map<UUID, string | null>,
    wires?: Map<UUID, string | null>
  ): void {
    const previousSelection = this.selection;

    // Check if all maps are empty - treat as deselect
    const totalCount = (components?.size ?? 0) + (enodes?.size ?? 0) + (wires?.size ?? 0);

    if (totalCount === 0) {
      this.deselect();
      return;
    }

    const newSelection: MultiSelectionData = {
      kind: 'multi',
      ...(components && components.size > 0 ? { components } : {}),
      ...(enodes && enodes.size > 0 ? { enodes } : {}),
      ...(wires && wires.size > 0 ? { wires } : {}),
    };

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
   * Add a single element to the current selection
   *
   * If current selection is null, creates a mono selection.
   * If current selection is mono, converts to multi and adds element.
   * If current selection is multi, adds element to appropriate map.
   *
   * No-op if element is already selected.
   *
   * @param type - Type of element to add
   * @param objectId - UUID of element to add
   * @param userData - Optional metadata for the element
   */
  addToSelection(type: HoverableType, objectId: UUID, userData?: object): void {
    // If already selected, no-op
    if (this.isSelected(type, objectId)) {
      return;
    }

    const previousSelection = this.selection;

    // If no selection, create mono selection
    if (!previousSelection) {
      this.selectOne(type, objectId, userData);
      return;
    }

    // If mono selection, convert to multi
    if (previousSelection.kind === 'mono') {
      const components = new Map<UUID, string | null>();
      const enodes = new Map<UUID, string | null>();
      const wires = new Map<UUID, string | null>();

      // Add existing selection
      if (previousSelection.type === 'component') {
        components.set(previousSelection.id, previousSelection.data ?? null);
      } else if (previousSelection.type === 'enode') {
        enodes.set(previousSelection.id, previousSelection.data ?? null);
      } else if (previousSelection.type === 'wire') {
        wires.set(previousSelection.id, previousSelection.data ?? null);
      }

      // Add new element
      if (type === 'component') {
        components.set(objectId, null);
      } else if (type === 'enode') {
        enodes.set(objectId, null);
      } else if (type === 'wire') {
        wires.set(objectId, null);
      }

      this.selectMultiple(components, enodes, wires);
      return;
    }

    // If multi selection, add to appropriate map
    if (previousSelection.kind === 'multi') {
      const components = new Map(previousSelection.components ?? new Map());
      const enodes = new Map(previousSelection.enodes ?? new Map());
      const wires = new Map(previousSelection.wires ?? new Map());

      if (type === 'component') {
        components.set(objectId, null);
      } else if (type === 'enode') {
        enodes.set(objectId, null);
      } else if (type === 'wire') {
        wires.set(objectId, null);
      }

      this.selectMultiple(components, enodes, wires);
    }
  }

  /**
   * Remove a single element from the current selection
   *
   * If element is in a mono selection, clears the selection.
   * If element is in a multi selection, removes from appropriate map.
   * If multi selection becomes single element, converts to mono.
   *
   * No-op if element is not selected.
   *
   * @param type - Type of element to remove
   * @param objectId - UUID of element to remove
   */
  removeFromSelection(type: HoverableType, objectId: UUID): void {
    // If not selected, no-op
    if (!this.isSelected(type, objectId)) {
      return;
    }

    const previousSelection = this.selection;

    if (!previousSelection) {
      return;
    }

    // If mono selection, deselect
    if (previousSelection.kind === 'mono') {
      this.deselect();
      return;
    }

    // If multi selection, remove from appropriate map
    if (previousSelection.kind === 'multi') {
      const components = new Map(previousSelection.components ?? new Map());
      const enodes = new Map(previousSelection.enodes ?? new Map());
      const wires = new Map(previousSelection.wires ?? new Map());

      if (type === 'component') {
        components.delete(objectId);
      } else if (type === 'enode') {
        enodes.delete(objectId);
      } else if (type === 'wire') {
        wires.delete(objectId);
      }

      const totalCount = components.size + enodes.size + wires.size;

      // If only one element left, convert to mono
      if (totalCount === 1) {
        if (components.size === 1) {
          for (const [id, data] of components.entries()) {
            this.selectOne('component', id, data ? { data } : undefined);
            return;
          }
        } else if (enodes.size === 1) {
          for (const [id, data] of enodes.entries()) {
            this.selectOne('enode', id, data ? { data } : undefined);
            return;
          }
        } else if (wires.size === 1) {
          for (const [id, data] of wires.entries()) {
            this.selectOne('wire', id, data ? { data } : undefined);
            return;
          }
        }
        return;
      }

      // Otherwise, update multi selection
      this.selectMultiple(components, enodes, wires);
    }
  }

  /**
   * Get the total count of selected elements across all types
   *
   * @returns Number of selected elements (0 if no selection)
   */
  getSelectionCount(): number {
    if (!this.selection) {
      return 0;
    }

    if (this.selection.kind === 'mono') {
      return 1;
    }

    if (this.selection.kind === 'multi') {
      return (
        (this.selection.components?.size ?? 0) +
        (this.selection.enodes?.size ?? 0) +
        (this.selection.wires?.size ?? 0)
      );
    }

    return 0;
  }

  /**
   * Get all selected element IDs grouped by type
   *
   * Returns empty arrays if no selection.
   * For mono selection, returns single-element array in appropriate category.
   *
   * @returns Object with arrays of selected IDs by type
   */
  getSelectedIds(): {
    components: UUID[];
    enodes: UUID[];
    wires: UUID[];
  } {
    if (!this.selection) {
      return { components: [], enodes: [], wires: [] };
    }

    if (this.selection.kind === 'mono') {
      if (this.selection.type === 'component') {
        return { components: [this.selection.id], enodes: [], wires: [] };
      }
      if (this.selection.type === 'enode') {
        return { components: [], enodes: [this.selection.id], wires: [] };
      }
      if (this.selection.type === 'wire') {
        return { components: [], enodes: [], wires: [this.selection.id] };
      }
    }

    if (this.selection.kind === 'multi') {
      return {
        components: Array.from(this.selection.components?.keys() ?? []),
        enodes: Array.from(this.selection.enodes?.keys() ?? []),
        wires: Array.from(this.selection.wires?.keys() ?? []),
      };
    }

    return { components: [], enodes: [], wires: [] };
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
