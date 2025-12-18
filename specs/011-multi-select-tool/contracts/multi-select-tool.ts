/**
 * MultiSelectTool Contract
 * @module contracts/multi-select-tool
 *
 * Internal API contract for the MultiSelectTool implementation.
 * This file defines the interface, not the implementation.
 */

import type { IEditingTool, CursorType, HoverableType } from '../../../src/scene/shared/types';
import type { UUID } from '../../../src/core/types/Identifier';
import type { ComponentType } from '../../../src/core/types/ComponentType';
import type { ENodeSourceType } from '../../../src/core/types/ENodeSourceType';
import type * as THREE from 'three';

// =============================================================================
// Tool Mode
// =============================================================================

/**
 * Operating modes for the MultiSelectTool
 */
export type MultiSelectToolMode = 'idle' | 'selecting' | 'dragging';

// =============================================================================
// State Interfaces
// =============================================================================

/**
 * State during rectangle selection operation
 */
export interface SelectionRectState {
  /** Starting mouse position in screen coordinates */
  startScreen: { x: number; y: number };
  /** Current mouse position in screen coordinates */
  currentScreen: { x: number; y: number };
  /** DOM element for visual rectangle overlay */
  overlayElement: HTMLDivElement;
  /** Whether Shift key is held (additive selection mode) */
  shiftHeld: boolean;
  /** Elements currently previewed as "will be selected" */
  previewedElements: Set<UUID>;
}

/**
 * State during bulk move operation
 */
export interface BulkDragState {
  /** Starting cursor position in world coordinates */
  dragStartWorld: THREE.Vector3;
  /** Snapshot of initial positions for all selected elements */
  initialPositions: Map<UUID, THREE.Vector3>;
  /** Wire IDs that need geometry updates during drag */
  affectedWireIds: Set<UUID>;
}

// =============================================================================
// Clipboard Interfaces
// =============================================================================

/**
 * Complete clipboard data structure for copy/paste
 */
export interface ClipboardData {
  /** Center of selection bounding box in grid coordinates */
  anchor: { x: number; y: number };
  /** Copied component definitions */
  components: ClipboardComponent[];
  /** Copied branching point definitions */
  branchingPoints: ClipboardBranchingPoint[];
  /** Copied wire definitions (only wires with both endpoints in selection) */
  wires: ClipboardWire[];
}

/**
 * Component data within clipboard
 */
export interface ClipboardComponent {
  /** Component type identifier */
  type: ComponentType;
  /** Position relative to clipboard anchor */
  relativePosition: { x: number; y: number };
  /** Rotation angle in degrees */
  rotation: number;
  /** Original element ID for wire remapping during paste */
  originalId: UUID;
}

/**
 * Branching point data within clipboard
 */
export interface ClipboardBranchingPoint {
  /** Position relative to clipboard anchor */
  relativePosition: { x: number; y: number };
  /** Source type if configured */
  sourceType: ENodeSourceType | null;
  /** Original element ID for wire remapping during paste */
  originalId: UUID;
}

/**
 * Wire data within clipboard
 */
export interface ClipboardWire {
  /** Original ID of first endpoint (component pin or branching point) */
  node1OriginalId: UUID;
  /** Original ID of second endpoint */
  node2OriginalId: UUID;
  /** Intermediate positions relative to clipboard anchor */
  relativeIntermediatePositions: Array<{ x: number; y: number }>;
}

// =============================================================================
// Tool Interface
// =============================================================================

/**
 * MultiSelectTool interface contract
 *
 * Extends IEditingTool with multi-selection specific operations.
 */
export interface IMultiSelectTool extends IEditingTool {
  /** Tool type identifier */
  readonly type: 'multiSelect';

  /**
   * Get the current operating mode
   */
  getMode(): MultiSelectToolMode;

  /**
   * Check if clipboard has content
   */
  hasClipboardContent(): boolean;

  /**
   * Copy current selection to clipboard
   * @returns true if copy succeeded (non-empty selection)
   */
  copySelection(): boolean;

  /**
   * Cut current selection (copy + delete)
   * @returns true if cut succeeded
   */
  cutSelection(): boolean;

  /**
   * Paste clipboard content at cursor position
   * @returns true if paste succeeded (non-empty clipboard)
   */
  pasteAtCursor(): boolean;

  /**
   * Delete all selected elements
   * @returns true if delete succeeded (non-empty selection)
   */
  deleteSelection(): boolean;

  /**
   * Cancel any in-progress operation (selection rect or drag)
   */
  cancelOperation(): void;
}

// =============================================================================
// Event Payloads
// =============================================================================

/**
 * Payload for multiselect-specific tool events
 */
export interface MultiSelectToolEventPayloads {
  /** Emitted when selection rectangle operation starts */
  selectionRectStarted: {
    startScreen: { x: number; y: number };
  };

  /** Emitted when selection rectangle operation completes */
  selectionRectCompleted: {
    selectedCount: number;
    additive: boolean;
  };

  /** Emitted when bulk drag operation starts */
  bulkDragStarted: {
    elementCount: number;
  };

  /** Emitted when bulk drag operation completes */
  bulkDragCompleted: {
    elementCount: number;
    delta: { x: number; y: number };
  };

  /** Emitted when copy operation completes */
  copyCompleted: {
    componentCount: number;
    branchingPointCount: number;
    wireCount: number;
  };

  /** Emitted when paste operation completes */
  pasteCompleted: {
    componentCount: number;
    branchingPointCount: number;
    wireCount: number;
    position: { x: number; y: number };
  };

  /** Emitted when bulk delete operation completes */
  bulkDeleteCompleted: {
    componentCount: number;
    branchingPointCount: number;
    wireCount: number;
  };
}
