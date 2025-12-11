/**
 * SelectionManager Contract
 *
 * Manages selection state in the circuit scene.
 * Selection behavior (click to select/deselect) is handled by CircuitSceneManager.
 * SelectionManager is the single source of truth for selection state.
 *
 * Supports both mono-selection (single element) and multi-selection (multiple elements).
 * Multi-selection is prepared but not actively used in this feature.
 */

import type { UUID } from '../../../src/core/types/Identifier';

/**
 * Types of circuit elements that can be hovered or selected
 */
export type HoverableType = 'enode' | 'component' | 'wire';

/**
 * Represents the Selection of one Hoverable Element of the scene
 */
export interface MonoSelectionData {
  kind: 'mono';
  type: HoverableType;
  id: UUID;
  data?: string | null;
}

/**
 * Represents the Selection of multiple Hoverable Elements of the scene
 */
export interface MultiSelectionData {
  kind: 'multi';
  components?: Map<UUID, string | null>;
  enodes?: Map<UUID, string | null>;
  wires?: Map<UUID, string | null>;
}

/**
 * Discriminated union for selection data
 */
export type SelectionData = MonoSelectionData | MultiSelectionData;

/**
 * Callback invoked when selection changes
 * @param newSelection - The new selection, or null if deselected
 * @param previousSelection - The previous selection, or null if none was selected
 */
export type SelectionCallback = (
  newSelection: SelectionData | null,
  previousSelection: SelectionData | null
) => void;

/**
 * SelectionManager interface
 *
 * Centralizes selection state management, enabling:
 * - Single source of truth for selection
 * - Decoupling of selection logic from tools
 * - Support for mono and multi-selection patterns
 */
export interface ISelectionManager {
  /**
   * Get the current selection
   * @returns The SelectionData, or null if nothing is selected
   */
  getSelection(): SelectionData | null;

  /**
   * Get the timestamp when selection occurred
   * @returns Timestamp in milliseconds, or null if nothing is selected
   */
  getSelectedAt(): number | null;

  /**
   * Check if a specific object is selected
   * @param type - The type of hoverable object
   * @param objectId - The object ID to check
   * @returns true if the object is currently selected
   */
  isSelected(type: HoverableType, objectId: UUID): boolean;

  /**
   * Check if anything is selected
   * @returns true if one or more objects are currently selected
   */
  hasSelection(): boolean;

  /**
   * Select a single object (mono-selection)
   * If another object was previously selected, it will be deselected first.
   *
   * @param type - The type of hoverable object to select
   * @param objectId - The object ID to select
   * @param data - Optional extra data associated with the selection
   * @emits SelectionCallback with new and previous selection
   */
  selectOne(type: HoverableType, objectId: UUID, data?: string | null): void;

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
