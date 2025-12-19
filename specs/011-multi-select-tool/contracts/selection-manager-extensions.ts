/**
 * SelectionManager Extensions Contract
 * @module contracts/selection-manager-extensions
 *
 * Defines new methods to be added to the existing SelectionManager class
 * to support multi-selection operations.
 */

import type { UUID } from '../../../src/core/types/Identifier';
import type { HoverableType, MultiSelectionData } from '../../../src/scene/shared/types';

/**
 * Extension methods to add to the existing SelectionManager
 *
 * These methods extend the existing SelectionManager to support
 * multi-selection workflows required by MultiSelectTool.
 */
export interface SelectionManagerExtensions {
  /**
   * Select multiple elements at once, replacing any existing selection.
   *
   * Creates a MultiSelectionData with the provided element maps.
   * Empty maps are allowed; passing all empty maps clears the selection.
   *
   * @param components - Map of component IDs to optional metadata
   * @param enodes - Map of enode IDs to optional metadata
   * @param wires - Map of wire IDs to optional metadata
   *
   * @example
   * ```typescript
   * // Select 2 components and 1 wire
   * selectionManager.selectMultiple(
   *   new Map([['comp-1', null], ['comp-2', null]]),
   *   new Map(),
   *   new Map([['wire-1', null]])
   * );
   * ```
   */
  selectMultiple(
    components?: Map<UUID, string | null>,
    enodes?: Map<UUID, string | null>,
    wires?: Map<UUID, string | null>
  ): void;

  /**
   * Add a single element to the current selection.
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
   *
   * @example
   * ```typescript
   * // Start with a component selected
   * selectionManager.selectOne('component', 'comp-1');
   *
   * // Add another component (converts to multi)
   * selectionManager.addToSelection('component', 'comp-2');
   *
   * // Add a wire
   * selectionManager.addToSelection('wire', 'wire-1');
   * ```
   */
  addToSelection(type: HoverableType, objectId: UUID, userData?: object): void;

  /**
   * Remove a single element from the current selection.
   *
   * If element is in a mono selection, clears the selection.
   * If element is in a multi selection, removes from appropriate map.
   * If multi selection becomes single element, converts to mono.
   *
   * No-op if element is not selected.
   *
   * @param type - Type of element to remove
   * @param objectId - UUID of element to remove
   *
   * @example
   * ```typescript
   * // With multi-selection active
   * selectionManager.removeFromSelection('component', 'comp-2');
   * ```
   */
  removeFromSelection(type: HoverableType, objectId: UUID): void;

  /**
   * Get the total count of selected elements across all types.
   *
   * @returns Number of selected elements (0 if no selection)
   *
   * @example
   * ```typescript
   * const count = selectionManager.getSelectionCount();
   * if (count > 1) {
   *   console.log('Multi-selection active');
   * }
   * ```
   */
  getSelectionCount(): number;

  /**
   * Get all selected element IDs grouped by type.
   *
   * Returns empty arrays if no selection or mono selection.
   * For mono selection, returns single-element array in appropriate category.
   *
   * @returns Object with arrays of selected IDs by type
   *
   * @example
   * ```typescript
   * const { components, enodes, wires } = selectionManager.getSelectedIds();
   * for (const componentId of components) {
   *   // process component
   * }
   * ```
   */
  getSelectedIds(): {
    components: UUID[];
    enodes: UUID[];
    wires: UUID[];
  };
}
