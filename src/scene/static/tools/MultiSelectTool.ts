/**
 * MultiSelectTool - Enables multi-element selection and bulk operations
 * @module scene/static/tools/MultiSelectTool
 */

import * as THREE from 'three';
import type { UUID, ComponentType, ENodeSourceType } from 'simple-circuit-engine/core';
import { Position, Rotation } from 'simple-circuit-engine/core';

import type { IEditingTool, CursorType } from '../../shared/types';
import type { CircuitController } from '../CircuitController';

import {
  gridToWorldPosition,
  gridToWorldRotation,
  isPointInScreenRect,
  nearestWorldSnapPosition,
  worldToGridPosition,
} from '../../shared/utils/GeometryUtils';

/**
 * Operating modes for the MultiSelectTool
 */
export type MultiSelectToolMode = 'idle' | 'selecting' | 'dragging';

/**
 * State during rectangle selection operation (T010)
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
 * State during bulk move operation (T023)
 */
export interface BulkDragState {
  /** Starting cursor position in world coordinates */
  dragStartWorld: THREE.Vector3;
  /** Snapshot of initial positions for all selected elements */
  initialPositions: Map<UUID, THREE.Vector3>;
  /** Wire IDs that need geometry updates during drag */
  affectedWireIds: Set<UUID>;
  /** Initial intermediate positions for selected wires (wireId -> array of positions) */
  initialWireIntermediatePositions: Map<UUID, THREE.Vector3[]>;
}

/** Minimum selection rectangle size in pixels to distinguish from click */
const MIN_SELECTION_RECT_SIZE = 5;

// =============================================================================
// Clipboard Interfaces (T038)
// =============================================================================

/**
 * Complete clipboard data structure for copy/paste
 * TODO : copy and paste edited enodes sourceType and components config
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
  type: string;
  /** Position relative to clipboard anchor */
  relativePosition: { x: number; y: number };
  /** Rotation angle in degrees */
  rotation: number;
  /** Original element ID for wire remapping during paste */
  originalId: UUID;
  /** Original configuration data for the component */
  config: Map<string, string>;
  /** Original pins sourceTypes */
  pinSources: Array<ENodeSourceType | undefined | null>;
}

/**
 * Branching point data within clipboard
 */
export interface ClipboardBranchingPoint {
  /** Position relative to clipboard anchor */
  relativePosition: { x: number; y: number };
  /** Original element ID for wire remapping during paste */
  originalId: UUID;
  /** Source type of the branching point */
  source?: ENodeSourceType | undefined;
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

/**
 * MultiSelectTool implementation
 *
 * Provides functionality for:
 * - Rectangle selection of multiple elements
 * - Bulk move operations
 * - Bulk delete operations
 * - Copy/paste and cut/paste operations
 */
export class MultiSelectTool implements IEditingTool {
  readonly type = 'multiSelect' as const;

  private mode: MultiSelectToolMode = 'idle';
  private readonly controller: CircuitController;

  // Selection rectangle state
  private selectionRectState: SelectionRectState | null = null;

  // Bulk drag state (Phase 4)
  private bulkDragState: BulkDragState | null = null;

  // Clipboard state (Phase 6)
  private clipboardData: ClipboardData | null = null;
  // Maps pin IDs to their parent component IDs for wire reconstruction during paste
  private clipboardPinToComponent: Map<UUID, UUID> = new Map();
  // Maps pin IDs to their index within their parent component
  private clipboardPinIndices: Map<UUID, number> = new Map();

  // Bound event handlers for stable references
  private handlePointerDown: (event: PointerEvent) => void;
  private handlePointerMove: (event: PointerEvent) => void;
  private handlePointerUp: (event: PointerEvent) => void;
  private handleKeyDown: (event: KeyboardEvent) => void;
  private handleGridPositionMove: (position: THREE.Vector3) => void;

  constructor(controller: CircuitController) {
    this.controller = controller;

    // Bind event handlers
    this.handlePointerDown = this._handlePointerDown.bind(this);
    this.handlePointerMove = this._handlePointerMove.bind(this);
    this.handlePointerUp = this._handlePointerUp.bind(this);
    this.handleKeyDown = this._handleKeyDown.bind(this);
    this.handleGridPositionMove = this._handleGridPositionMove.bind(this);
  }

  /**
   * Get the current operating mode
   */
  getMode(): MultiSelectToolMode {
    return this.mode;
  }

  /**
   * Called when tool becomes active
   */
  onActivate(): void {
    this.mode = 'idle';
    this.selectionRectState = null;
    this.bulkDragState = null;

    // Register event listeners
    const container = this.controller.getContainer();
    container.addEventListener('pointerdown', this.handlePointerDown);
    container.addEventListener('pointermove', this.handlePointerMove);
    container.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Called when tool is deactivated
   */
  onDeactivate(): void {
    // Cancel any ongoing operation
    this.cancelOperation();

    // Unregister event listeners
    const container = this.controller.getContainer();
    container.removeEventListener('pointerdown', this.handlePointerDown);
    container.removeEventListener('pointermove', this.handlePointerMove);
    container.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.controller.off('gridPositionMove', this.handleGridPositionMove);

    this.mode = 'idle';
    this.selectionRectState = null;
    this.bulkDragState = null;
  }

  /**
   * Cancel any in-progress operation
   */
  cancelOperation(): void {
    if (this.mode === 'selecting') {
      this._cancelSelectionRect();
    } else if (this.mode === 'dragging') {
      this._cancelBulkDrag();
    }
  }

  /**
   * Get the current cursor type for this tool (T031)
   */
  getCursorType(): CursorType {
    const hoveredElement = this.controller.getHoveredElement();
    const selectionManager = this.controller.getSelectionManager();

    switch (this.mode) {
      case 'selecting':
        return 'crosshair';
      case 'dragging':
        return 'grabbing';
      case 'idle':
      default:
        // T031: Check if hovering over a selected element (for drag cursor)
        if (hoveredElement) {
          const isSelected = selectionManager.isSelected(hoveredElement.type, hoveredElement.id);
          if (isSelected) {
            return 'grab';
          }
          // Hovering over an element that could be selected
          return 'pointer';
        }
        return 'default';
    }
  }

  /**
   * Get preview objects to render in the scene
   */
  getPreviewObjects(): THREE.Object3D[] {
    // Selection rectangle is rendered via CSS overlay, not THREE.js
    return [];
  }

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Handle pointer down event (T011, T019, T020, T021, T024)
   * - Empty space: start rectangle selection
   * - Element click: select that element (clear others unless Shift held)
   * - Selected element: prepare for bulk drag (Phase 4)
   */
  private _handlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) return; // Only left click

    const hoveredElement = this.controller.getHoveredElement();
    const selectionManager = this.controller.getSelectionManager();
    const shiftHeld = event.shiftKey;

    if (this.mode === 'idle') {
      // Case 1: Clicking on an element
      if (hoveredElement) {
        const isSelected = selectionManager.isSelected(hoveredElement.type, hoveredElement.id);

        // T020: Shift-click adds to selection
        if (shiftHeld) {
          if (hoveredElement.type === 'wire') return; // Wires cannot be individually added/removed from selection
          if (!isSelected) {
            selectionManager.addToSelection(hoveredElement.type, hoveredElement.id);
            // TODO: also add wires connected to this element (need some refactoring on SelectionManager)
          } else {
            // If already selected toggle => remove from the selection with deselecting cascade
            selectionManager.removeFromSelection(hoveredElement.type, hoveredElement.id);
            if (hoveredElement.type === 'component') {
              const circuitComponent = this.controller
                .getCircuit()!
                .getComponent(hoveredElement.id);
              if (circuitComponent) {
                // Also remove its pins and connected wires from selection
                for (const pinId of circuitComponent.pins) {
                  selectionManager.removeFromSelection('enode', pinId);
                  const enode = this.controller.getCircuit()!.getENode(pinId);
                  if (enode) {
                    for (const wireId of enode.wires) {
                      selectionManager.removeFromSelection('wire', wireId);
                    }
                  }
                }
              }
            }
            // enode without componentId means branching point
            else if (
              hoveredElement.type === 'enode' &&
              !hoveredElement.object3D.userData.componentId
            ) {
              const enode = this.controller.getCircuit()!.getENode(hoveredElement.id);
              if (enode) {
                for (const wireId of enode.wires) {
                  selectionManager.removeFromSelection('wire', wireId);
                }
              }
            }
          }
          return;
        }

        // T019: Single click selects element (clears previous)
        if (
          !isSelected &&
          !(hoveredElement.type === 'enode' && !!hoveredElement.object3D.userData.componentId)
        ) {
          selectionManager.selectOne(hoveredElement.type, hoveredElement.id);
          return;
        }

        // T024: Clicking on already selected element - start bulk drag
        const worldPosition = this.controller.cursorGroundPlanePosition();
        this._startBulkDrag(worldPosition);
        return;
      }

      // Case 2: T021 - Click on empty space clears selection (if no drag started)
      // Case 3: T011 - Start rectangle selection on empty space
      const containerRect = this.controller.getContainer().getBoundingClientRect();
      const screenX = event.clientX - containerRect.left;
      const screenY = event.clientY - containerRect.top;

      this._startSelectionRect(screenX, screenY, shiftHeld);
    }
  }

  /**
   * Handle pointer move event (T013)
   * Updates rectangle dimensions during selection
   */
  private _handlePointerMove(event: PointerEvent): void {
    if (this.mode !== 'selecting' || !this.selectionRectState) return;

    const containerRect = this.controller.getContainer().getBoundingClientRect();
    const screenX = event.clientX - containerRect.left;
    const screenY = event.clientY - containerRect.top;

    // Update current screen position
    this.selectionRectState.currentScreen = { x: screenX, y: screenY };

    // Update CSS overlay position and size (T013)
    this._updateSelectionRectOverlay();

    // Update preview highlighting (T015)
    this._updatePreviewHighlighting();
  }

  /**
   * Handle pointer up event (T016, T021, T029)
   * Commits selection or bulk drag, or clears if it was just a click
   */
  private _handlePointerUp(event: PointerEvent): void {
    if (event.button !== 0) return; // Only left click

    if (this.mode === 'selecting' && this.selectionRectState) {
      const { startScreen, currentScreen, shiftHeld } = this.selectionRectState;

      // Calculate rectangle size
      const width = Math.abs(currentScreen.x - startScreen.x);
      const height = Math.abs(currentScreen.y - startScreen.y);

      // If rectangle is too small, treat as click (T021 - clear selection)
      if (width < MIN_SELECTION_RECT_SIZE && height < MIN_SELECTION_RECT_SIZE) {
        // T021: Click on empty space clears selection
        if (!shiftHeld) {
          this.controller.getSelectionManager().deselect();
        }
        this._cancelSelectionRect();
        return;
      }

      // T016: Commit selection
      this._commitSelectionRect();
    } else if (this.mode === 'dragging' && this.bulkDragState) {
      // T029: Commit bulk drag
      this._commitBulkDrag();
    }
  }

  /**
   * Handle grid position move event (T027)
   * Updates element positions during bulk drag
   */
  private _handleGridPositionMove(position: THREE.Vector3): void {
    if (this.mode === 'dragging' && this.bulkDragState) {
      this._updateBulkDrag(position);
    }
  }

  /**
   * Handle keyboard events (T017, T030, T034, T043, T048, T053)
   * - Escape: cancel current operation
   * - Delete/Backspace: delete selection
   * - Ctrl+C/Cmd+C: copy selection
   * - Ctrl+V/Cmd+V: paste clipboard
   * - Ctrl+X/Cmd+X: cut selection
   */
  private _handleKeyDown(event: KeyboardEvent): void {
    // T017, T030: Escape cancels rectangle selection or bulk drag
    if (event.key === 'Escape') {
      if (this.mode === 'selecting') {
        this._cancelSelectionRect();
        return;
      } else if (this.mode === 'dragging') {
        this._cancelBulkDrag();
        return;
      }
    }

    // T034: Delete/Backspace triggers bulk delete
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Only delete if we have a selection and we're idle (not during drag)
      if (this.mode === 'idle') {
        this.deleteSelection();
      }
      return;
    }

    // Detect Ctrl (Windows/Linux) or Cmd (Mac)
    const ctrlOrCmd = event.ctrlKey || event.metaKey;

    if (!ctrlOrCmd) return;

    // T043: Ctrl+C / Cmd+C - Copy selection
    if (event.key === 'c' || event.key === 'C') {
      if (this.mode === 'idle') {
        this.copySelection();
      }
      return;
    }

    // T048: Ctrl+V / Cmd+V - Paste clipboard
    if (event.key === 'v' || event.key === 'V') {
      if (this.mode === 'idle') {
        this.pasteAtCursor();
      }
      return;
    }

    // T053: Ctrl+X / Cmd+X - Cut selection
    if (event.key === 'x' || event.key === 'X') {
      if (this.mode === 'idle') {
        this.cutSelection();
      }
      return;
    }
  }

  // ==========================================================================
  // Selection Rectangle Operations (T012, T014, T015, T016, T018, T022)
  // ==========================================================================

  /**
   * Start rectangle selection (T012)
   */
  private _startSelectionRect(screenX: number, screenY: number, shiftHeld: boolean): void {
    // Create CSS overlay element
    const overlayElement = document.createElement('div');
    overlayElement.style.cssText = `
      position: absolute;
      border: 2px dashed #4a90d9;
      background: rgba(74, 144, 217, 0.1);
      pointer-events: none;
      z-index: 1000;
    `;
    this.controller.getContainer().appendChild(overlayElement);

    // Initialize state
    this.selectionRectState = {
      startScreen: { x: screenX, y: screenY },
      currentScreen: { x: screenX, y: screenY },
      overlayElement,
      shiftHeld,
      previewedElements: new Set(),
    };

    this.mode = 'selecting';

    // Lock camera controls
    const controls = this.controller.getControls();
    if (controls) {
      controls.enablePan = false;
    }

    // T022: Emit event
    this.controller.emit('toolOperationStarted', {
      toolType: this.type,
      mode: 'selecting',
      operationData: { startScreen: { x: screenX, y: screenY } },
    });
  }

  /**
   * Update CSS overlay dimensions and position (T013)
   */
  private _updateSelectionRectOverlay(): void {
    if (!this.selectionRectState) return;

    const { startScreen, currentScreen, overlayElement } = this.selectionRectState;

    const left = Math.min(startScreen.x, currentScreen.x);
    const top = Math.min(startScreen.y, currentScreen.y);
    const width = Math.abs(currentScreen.x - startScreen.x);
    const height = Math.abs(currentScreen.y - startScreen.y);

    overlayElement.style.left = `${left}px`;
    overlayElement.style.top = `${top}px`;
    overlayElement.style.width = `${width}px`;
    overlayElement.style.height = `${height}px`;
  }

  /**
   * Update preview highlighting for elements inside rectangle (T015)
   */
  private _updatePreviewHighlighting(): void {
    if (!this.selectionRectState) return;

    const elementsInRect = this._getElementsInSelectionRect();
    const newPreviewSet = new Set<UUID>();

    // Collect all element IDs
    for (const id of elementsInRect.components) {
      newPreviewSet.add(id);
    }
    for (const id of elementsInRect.enodes) {
      newPreviewSet.add(id);
    }
    for (const id of elementsInRect.wires) {
      newPreviewSet.add(id);
    }

    // Update preview state
    this.selectionRectState.previewedElements = newPreviewSet;

    // TODO: Visual preview highlighting could be implemented here
    // by applying temporary visual state to elements
  }

  /**
   * Get elements inside the current selection rectangle (T014)
   * Components/BPs: selected if center is inside rectangle
   * Wires: selected only if BOTH endpoints are selected
   */
  private _getElementsInSelectionRect(): {
    components: UUID[];
    enodes: UUID[];
    wires: UUID[];
  } {
    const result = {
      components: [] as UUID[],
      enodes: [] as UUID[],
      wires: [] as UUID[],
    };

    if (!this.selectionRectState) return result;

    const circuit = this.controller.getCircuit();
    if (!circuit) return result;

    const camera = this.controller.getCamera();
    const container = this.controller.getContainer();
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Calculate screen rect bounds
    const { startScreen, currentScreen } = this.selectionRectState;
    const screenRect = {
      minX: Math.min(startScreen.x, currentScreen.x),
      minY: Math.min(startScreen.y, currentScreen.y),
      maxX: Math.max(startScreen.x, currentScreen.x),
      maxY: Math.max(startScreen.y, currentScreen.y),
    };

    // Set of selected enode IDs
    const selectedEnodeIds = new Set<UUID>();
    // Map of wire and number of their enodes selected
    const wireEnodeSelectionCount = new Map<UUID, number>();

    // Check components (T014)
    const componentObject3Ds = this.controller.componentObject3Ds;
    for (const [componentId, object3D] of componentObject3Ds) {
      const worldPos = new THREE.Vector3();
      object3D.getWorldPosition(worldPos);

      if (isPointInScreenRect(worldPos, camera, width, height, screenRect)) {
        result.components.push(componentId);

        // Mark component pins as selected for wire check
        const component = circuit.getComponent(componentId);
        if (component) {
          for (const pinId of component.pins) {
            selectedEnodeIds.add(pinId);
            const enode = circuit.getENode(pinId);
            if (!enode) continue;
            for (const wireId of enode.wires) {
              const currentCount = wireEnodeSelectionCount.get(wireId) || 0;
              wireEnodeSelectionCount.set(wireId, currentCount + 1);
            }
          }
        }
      }
    }

    // Check enodes (branching points only - pins are covered by components)
    const enodeObject3Ds = this.controller.enodeObject3Ds;
    for (const [enodeId, object3D] of enodeObject3Ds) {
      // Only select standalone branching points
      if (object3D.userData.componentId) continue; // Skip pins

      // Skip if already marked (pin of selected component)
      if (selectedEnodeIds.has(enodeId)) continue;

      const worldPos = new THREE.Vector3();
      object3D.getWorldPosition(worldPos);

      if (isPointInScreenRect(worldPos, camera, width, height, screenRect)) {
        result.enodes.push(enodeId);
        selectedEnodeIds.add(enodeId);
        const enode = circuit.getENode(enodeId);
        if (!enode) continue;
        for (const wireId of enode.wires) {
          const currentCount = wireEnodeSelectionCount.get(wireId) || 0;
          wireEnodeSelectionCount.set(wireId, currentCount + 1);
        }
      }
    }

    for (const [wireId, count] of wireEnodeSelectionCount) {
      // If both endpoints are selected, include the wire (T014)
      if (count >= 2) {
        result.wires.push(wireId);
      }
    }

    return result;
  }

  /**
   * Commit the rectangle selection (T016, T018, T022)
   */
  private _commitSelectionRect(): void {
    if (!this.selectionRectState) return;

    const elementsInRect = this._getElementsInSelectionRect();
    const selectionManager = this.controller.getSelectionManager();

    // Build selection maps
    const components = new Map<UUID, string | null>();
    const enodes = new Map<UUID, string | null>();
    const wires = new Map<UUID, string | null>();

    for (const id of elementsInRect.components) {
      components.set(id, null);
    }
    for (const id of elementsInRect.enodes) {
      enodes.set(id, null);
    }
    for (const id of elementsInRect.wires) {
      wires.set(id, null);
    }

    // T018: Additive selection mode
    if (this.selectionRectState.shiftHeld) {
      // Add new elements to existing selection
      const existing = selectionManager.getSelectedIds();
      for (const id of existing.components) {
        components.set(id, null);
      }
      for (const id of existing.enodes) {
        enodes.set(id, null);
      }
      for (const id of existing.wires) {
        wires.set(id, null);
      }
    }

    // Apply selection
    selectionManager.selectMultiple(components, enodes, wires);

    // T022: Emit completion event
    const totalCount = components.size + enodes.size + wires.size;
    this.controller.emit('toolOperationCompleted', {
      toolType: this.type,
      mode: 'selecting',
      operationData: {
        selectedCount: totalCount,
        additive: this.selectionRectState.shiftHeld,
      },
      changedData: {},
    });

    // Cleanup
    this._cleanupSelectionRect();
    this.mode = 'idle';

    // Unlock camera controls
    const controls = this.controller.getControls();
    if (controls) {
      controls.enablePan = true;
    }
  }

  /**
   * Cancel rectangle selection (T017)
   */
  private _cancelSelectionRect(): void {
    if (!this.selectionRectState) return;

    // Emit cancellation event
    this.controller.emit('toolOperationCancelled', {
      toolType: this.type,
      mode: 'selecting',
    });

    // Cleanup
    this._cleanupSelectionRect();
    this.mode = 'idle';

    // Unlock camera controls
    const controls = this.controller.getControls();
    if (controls) {
      controls.enablePan = true;
    }
  }

  /**
   * Clean up selection rectangle overlay
   */
  private _cleanupSelectionRect(): void {
    if (this.selectionRectState?.overlayElement) {
      this.selectionRectState.overlayElement.remove();
    }
    this.selectionRectState = null;
  }

  // ==========================================================================
  // Bulk Drag Operations (T024-T032) - Phase 4
  // ==========================================================================

  /**
   * Start bulk drag operation (T024, T025, T026, T032)
   */
  private _startBulkDrag(worldPosition: THREE.Vector3): void {
    const circuit = this.controller.getCircuit();
    if (!circuit) return;

    const selectionManager = this.controller.getSelectionManager();
    const selectedIds = selectionManager.getSelectedIds();

    // T025: Capture initial positions for all selected elements
    const initialPositions = new Map<UUID, THREE.Vector3>();

    // Capture component positions
    for (const componentId of selectedIds.components) {
      const object3D = this.controller.componentObject3Ds.get(componentId);
      if (object3D) {
        initialPositions.set(componentId, object3D.position.clone());
      }
    }

    // Capture branching point positions
    for (const enodeId of selectedIds.enodes) {
      const object3D = this.controller.enodeObject3Ds.get(enodeId);
      if (object3D && !object3D.userData.componentId) {
        // Only branching points
        initialPositions.set(enodeId, object3D.position.clone());
      }
    }

    // T026: Collect affected wires (selected wires + boundary wires)
    const affectedWireIds = new Set<UUID>();

    // Add selected wires
    for (const wireId of selectedIds.wires) {
      affectedWireIds.add(wireId);
    }

    // Add boundary wires (wires connected to selected components/enodes but not fully selected)
    for (const componentId of selectedIds.components) {
      const component = circuit.getComponent(componentId);
      if (component) {
        for (const pinId of component.pins) {
          const enode = circuit.getENode(pinId);
          if (enode) {
            for (const wireId of enode.wires) {
              affectedWireIds.add(wireId);
            }
          }
        }
      }
    }

    for (const enodeId of selectedIds.enodes) {
      const enode = circuit.getENode(enodeId);
      if (enode) {
        for (const wireId of enode.wires) {
          affectedWireIds.add(wireId);
        }
      }
    }

    // Capture initial intermediate positions for selected wires
    const initialWireIntermediatePositions = new Map<UUID, THREE.Vector3[]>();
    for (const wireId of selectedIds.wires) {
      const wire = circuit.getWire(wireId);
      if (wire && wire.intermediatePositions.length > 0) {
        // Clone all intermediate positions
        const positions = wire.intermediatePositions.map((pos) => gridToWorldPosition(pos));
        initialWireIntermediatePositions.set(wireId, positions);
      }
    }

    // Initialize drag state
    this.bulkDragState = {
      dragStartWorld: worldPosition.clone(),
      initialPositions,
      affectedWireIds,
      initialWireIntermediatePositions,
    };

    this.mode = 'dragging';

    // Lock camera controls
    const controls = this.controller.getControls();
    if (controls) {
      controls.enablePan = false;
    }

    // Register for grid position move events
    this.controller.on('gridPositionMove', this.handleGridPositionMove);

    // T032: Emit event
    this.controller.emit('toolOperationStarted', {
      toolType: this.type,
      mode: 'dragging',
      operationData: { elementCount: initialPositions.size },
    });
  }

  /**
   * Update bulk drag - apply delta to all selected elements (T027, T028)
   */
  private _updateBulkDrag(worldPosition: THREE.Vector3): void {
    if (!this.bulkDragState) return;

    const { dragStartWorld, initialPositions, affectedWireIds, initialWireIntermediatePositions } =
      this.bulkDragState;

    // we retrieve unbound world position to avoid snapping during drag since Multi Select tool allows to expand grid
    worldPosition = this.controller.cursorGroundPlanePosition(false);

    // Calculate delta
    const delta = new THREE.Vector3().subVectors(worldPosition, dragStartWorld);

    // T027: Apply delta to all selected elements
    for (const [elementId, initialPos] of initialPositions) {
      const newPosition = new THREE.Vector3().addVectors(initialPos, delta);
      const snappedPosition = nearestWorldSnapPosition(newPosition);

      // Update component visual
      const componentObject3D = this.controller.componentObject3Ds.get(elementId);
      if (componentObject3D) {
        componentObject3D.position.copy(snappedPosition);

        // Update component in circuit model
        this.controller.circuitWriter.saveEditComponent(elementId, componentObject3D);
        continue;
      }

      // Update branching point visual
      const enodeObject3D = this.controller.enodeObject3Ds.get(elementId);
      if (enodeObject3D) {
        enodeObject3D.position.copy(snappedPosition);

        // Update branching point in circuit model
        this.controller.circuitWriter.saveEditBranchingPoint(enodeObject3D);
      }
    }

    // Apply delta to intermediate positions of selected wires

    for (const [wireId, initialIntermediatePositions] of initialWireIntermediatePositions) {
      // Apply delta to each intermediate position
      const updatedPositions = initialIntermediatePositions.map((pos) => {
        const newPos = new THREE.Vector3().addVectors(pos, delta);
        return worldToGridPosition(newPos);
      });

      // Update wire intermediate positions in circuit model
      this.controller.circuitWriter.saveEditWirePositions(wireId, updatedPositions, false);
    }

    // T028: Update wire geometry for all affected wires
    const wireVisualManager = this.controller.wireVisualManager;
    for (const wireId of affectedWireIds) {
      wireVisualManager.updateWireById(wireId);
    }
  }

  /**
   * Commit bulk drag operation (T029, T032)
   */
  private _commitBulkDrag(): void {
    if (!this.bulkDragState) return;

    const circuit = this.controller.getCircuit();
    if (!circuit) return;

    const { dragStartWorld, initialPositions } = this.bulkDragState;
    const currentPosition = this.controller.cursorGroundPlanePosition(false);

    // Calculate final delta
    const delta = new THREE.Vector3().subVectors(currentPosition, dragStartWorld);
    const gridDelta = worldToGridPosition(delta);

    // T032: Emit completion event
    this.controller.emit('toolOperationCompleted', {
      toolType: this.type,
      mode: 'dragging',
      operationData: {
        elementCount: initialPositions.size,
        delta: { x: gridDelta.x, y: gridDelta.y },
      },
      changedData: {},
    });

    // launch autoAdjust of the grid after bulk move
    this.controller.autoAdjustCircuitGridSize();

    // Cleanup
    this.mode = 'idle';
    this.bulkDragState = null;

    // Unregister grid position move listener
    this.controller.off('gridPositionMove', this.handleGridPositionMove);

    // Unlock camera controls
    const controls = this.controller.getControls();
    if (controls) {
      controls.enablePan = true;
    }
  }

  /**
   * Cancel bulk drag operation - revert all elements to initial positions (T030)
   */
  private _cancelBulkDrag(): void {
    if (!this.bulkDragState) return;

    const { initialPositions, affectedWireIds, initialWireIntermediatePositions } =
      this.bulkDragState;

    // Revert all elements to initial positions
    for (const [elementId, initialPos] of initialPositions) {
      const componentObject3D = this.controller.componentObject3Ds.get(elementId);
      if (componentObject3D) {
        componentObject3D.position.copy(initialPos);
        this.controller.circuitWriter.saveEditComponent(elementId, componentObject3D);
        continue;
      }

      const enodeObject3D = this.controller.enodeObject3Ds.get(elementId);
      if (enodeObject3D) {
        enodeObject3D.position.copy(initialPos);
        this.controller.circuitWriter.saveEditBranchingPoint(enodeObject3D);
      }
    }

    // Revert intermediate positions of selected wires
    for (const [wireId, initialIntermediatePositions] of initialWireIntermediatePositions) {
      const positions = initialIntermediatePositions.map((pos) => worldToGridPosition(pos));
      this.controller.circuitWriter.saveEditWirePositions(wireId, positions, false);
    }

    // Update all affected wires
    const wireVisualManager = this.controller.wireVisualManager;
    for (const wireId of affectedWireIds) {
      wireVisualManager.updateWireById(wireId);
    }

    // Emit cancellation event
    this.controller.emit('toolOperationCancelled', {
      toolType: this.type,
      mode: 'dragging',
    });

    // Cleanup
    this.mode = 'idle';
    this.bulkDragState = null;

    // Unregister grid position move listener
    this.controller.off('gridPositionMove', this.handleGridPositionMove);

    // Unlock camera controls
    const controls = this.controller.getControls();
    if (controls) {
      controls.enablePan = true;
    }
  }

  // ==========================================================================
  // Copy/Paste Operations (T039-T051) - Phase 6
  // ==========================================================================

  /**
   * Check if clipboard has content (T050)
   */
  hasClipboardContent(): boolean {
    return this.clipboardData !== null;
  }

  /**
   * Copy current selection to clipboard (T039, T040, T041, T042, T051)
   * @returns true if copy succeeded (non-empty selection)
   */
  copySelection(): boolean {
    const circuit = this.controller.getCircuit();
    if (!circuit) return false;

    const selectionManager = this.controller.getSelectionManager();
    const selectedIds = selectionManager.getSelectedIds();

    // Empty selection - no-op
    if (
      selectedIds.components.length === 0 &&
      selectedIds.enodes.length === 0 &&
      selectedIds.wires.length === 0
    ) {
      return false;
    }

    // T040: Calculate anchor (center of selection bounding box)
    const bounds = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    };

    // Gather component positions
    for (const componentId of selectedIds.components) {
      const component = circuit.getComponent(componentId);
      if (component) {
        const pos = component.position;
        bounds.minX = Math.min(bounds.minX, pos.x);
        bounds.maxX = Math.max(bounds.maxX, pos.x);
        bounds.minY = Math.min(bounds.minY, pos.y);
        bounds.maxY = Math.max(bounds.maxY, pos.y);
      }
    }

    // Gather branching point positions
    for (const enodeId of selectedIds.enodes) {
      const enode = circuit.getENode(enodeId);
      if (enode && enode.position) {
        const pos = enode.position;
        bounds.minX = Math.min(bounds.minX, pos.x);
        bounds.maxX = Math.max(bounds.maxX, pos.x);
        bounds.minY = Math.min(bounds.minY, pos.y);
        bounds.maxY = Math.max(bounds.maxY, pos.y);
      }
    }

    const anchor = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };

    // T041: Serialize components with relative positions
    const clipboardComponents: ClipboardComponent[] = [];
    for (const componentId of selectedIds.components) {
      const component = circuit.getComponent(componentId);
      if (component) {
        const pos = component.position;
        const sources = component.pins.map((pinId) => {
          const enode = circuit.getENode(pinId);
          return enode ? enode.source : null;
        });
        clipboardComponents.push({
          type: component.type,
          relativePosition: {
            x: pos.x - anchor.x,
            y: pos.y - anchor.y,
          },
          rotation: component.rotation.angle,
          originalId: componentId,
          pinSources: sources,
          config: new Map(component.config), // Deep copy of config
        });
      }
    }

    // T041: Serialize branching points with relative positions
    const clipboardBranchingPoints: ClipboardBranchingPoint[] = [];
    for (const enodeId of selectedIds.enodes) {
      const enode = circuit.getENode(enodeId);
      if (enode && enode.position) {
        const pos = enode.position;
        clipboardBranchingPoints.push({
          relativePosition: {
            x: pos.x - anchor.x,
            y: pos.y - anchor.y,
          },
          originalId: enodeId,
          source: enode.source,
        });
      }
    }

    // T042: Serialize wires (only wires with both endpoints in selection)
    // Create set of all selected endpoint IDs (component pins + branching points)
    const selectedEndpointIds = new Set<UUID>();

    // Also build pin-to-component mapping and pin indices for paste operation
    this.clipboardPinToComponent.clear();
    this.clipboardPinIndices.clear();

    // Add component pins
    for (const componentId of selectedIds.components) {
      const component = circuit.getComponent(componentId);
      if (component) {
        for (let i = 0; i < component.pins.length; i++) {
          const pinId = component.pins[i];
          if (pinId) {
            selectedEndpointIds.add(pinId);
            this.clipboardPinToComponent.set(pinId, componentId);
            this.clipboardPinIndices.set(pinId, i);
          }
        }
      }
    }

    // Add branching points
    for (const enodeId of selectedIds.enodes) {
      selectedEndpointIds.add(enodeId);
    }

    const clipboardWires: ClipboardWire[] = [];
    for (const wireId of selectedIds.wires) {
      const wire = circuit.getWire(wireId);
      if (!wire) continue;

      // Only include wire if both endpoints are in selection
      if (selectedEndpointIds.has(wire.node1) && selectedEndpointIds.has(wire.node2)) {
        // Calculate relative intermediate positions
        const relativeIntermediatePositions = wire.intermediatePositions.map((pos) => ({
          x: pos.x - anchor.x,
          y: pos.y - anchor.y,
        }));

        clipboardWires.push({
          node1OriginalId: wire.node1,
          node2OriginalId: wire.node2,
          relativeIntermediatePositions,
        });
      }
    }

    // Store clipboard data
    this.clipboardData = {
      anchor,
      components: clipboardComponents,
      branchingPoints: clipboardBranchingPoints,
      wires: clipboardWires,
    };

    // T051: Emit copy completed event
    this.controller.emit('toolOperationCompleted', {
      toolType: this.type,
      mode: 'copy',
      operationData: {
        componentCount: clipboardComponents.length,
        branchingPointCount: clipboardBranchingPoints.length,
        wireCount: clipboardWires.length,
      },
      changedData: {},
    });

    return true;
  }

  /**
   * Paste clipboard content at cursor position (T044, T045, T046, T047, T049, T051)
   * @returns true if paste succeeded (non-empty clipboard)
   */
  pasteAtCursor(): boolean {
    if (!this.clipboardData) return false;

    const circuit = this.controller.getCircuit();
    if (!circuit) return false;

    const cursorPosition = this.controller.cursorGroundPlanePosition(false);
    const gridCursor = worldToGridPosition(cursorPosition);

    // Map from original IDs to newly created element IDs for wire remapping (T047)
    const idRemap = new Map<UUID, UUID>();

    // T045: Create components from clipboard
    const createdComponentIds: UUID[] = [];
    for (const clipComponent of this.clipboardData.components) {
      const newGridPos = new Position(
        Math.round(gridCursor.x + clipComponent.relativePosition.x),
        Math.round(gridCursor.y + clipComponent.relativePosition.y)
      );

      const worldPos = gridToWorldPosition(newGridPos);
      const rotation = gridToWorldRotation(new Rotation(clipComponent.rotation));

      try {
        const newComponent = this.controller.addComponent(
          clipComponent.type as ComponentType,
          worldPos,
          rotation,
          clipComponent.config,
          clipComponent.pinSources
        );

        createdComponentIds.push(newComponent.id);

        // Map original component ID → new component ID
        idRemap.set(clipComponent.originalId, newComponent.id);

        // Map original pin IDs → new pin IDs using stored pin indices
        // This works even after cut (when original component no longer exists)
        for (const [originalPinId, originalComponentId] of this.clipboardPinToComponent) {
          if (originalComponentId === clipComponent.originalId) {
            const pinIndex = this.clipboardPinIndices.get(originalPinId);
            if (pinIndex !== undefined && pinIndex < newComponent.pins.length) {
              const newPinId = newComponent.pins[pinIndex];
              if (newPinId) {
                idRemap.set(originalPinId, newPinId);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to paste component:', error);
      }
    }

    // T046: Create branching points from clipboard
    const createdBranchingPointIds: UUID[] = [];
    for (const clipBP of this.clipboardData.branchingPoints) {
      const newGridPos = new Position(
        Math.round(gridCursor.x + clipBP.relativePosition.x),
        Math.round(gridCursor.y + clipBP.relativePosition.y)
      );

      const worldPos = gridToWorldPosition(newGridPos);

      try {
        const newEnode = this.controller.addBranchingPoint(worldPos, clipBP.source);
        createdBranchingPointIds.push(newEnode.id);

        // Map original BP ID → new BP ID
        idRemap.set(clipBP.originalId, newEnode.id);
      } catch (error) {
        console.error('Failed to paste branching point:', error);
      }
    }

    // T047: Create wires with ID remapping
    const createdWireIds: UUID[] = [];
    for (const clipWire of this.clipboardData.wires) {
      const newNode1 = idRemap.get(clipWire.node1OriginalId);
      const newNode2 = idRemap.get(clipWire.node2OriginalId);

      // Only create wire if both endpoints were successfully created
      if (newNode1 && newNode2) {
        try {
          const newWire = this.controller.addWire(newNode1, newNode2);
          createdWireIds.push(newWire.id);

          // Update intermediate positions if any
          if (clipWire.relativeIntermediatePositions.length > 0) {
            const absolutePositions = clipWire.relativeIntermediatePositions.map((relPos) => ({
              x: Math.round(gridCursor.x + relPos.x),
              y: Math.round(gridCursor.y + relPos.y),
            }));

            this.controller.circuitWriter.saveEditWirePositions(
              newWire.id,
              absolutePositions,
              true
            );
            this.controller.wireVisualManager.updateWireById(newWire.id);
          }
        } catch (error) {
          console.error('Failed to paste wire:', error);
        }
      }
    }

    // T049: Select pasted elements
    const selectionManager = this.controller.getSelectionManager();
    const componentsMap = new Map<UUID, string | null>();
    const enodesMap = new Map<UUID, string | null>();
    const wiresMap = new Map<UUID, string | null>();

    for (const id of createdComponentIds) {
      componentsMap.set(id, null);
    }
    for (const id of createdBranchingPointIds) {
      enodesMap.set(id, null);
    }
    for (const id of createdWireIds) {
      wiresMap.set(id, null);
    }

    selectionManager.selectMultiple(componentsMap, enodesMap, wiresMap);

    // T051: Emit paste completed event
    this.controller.emit('toolOperationCompleted', {
      toolType: this.type,
      mode: 'paste',
      operationData: {
        componentCount: createdComponentIds.length,
        branchingPointCount: createdBranchingPointIds.length,
        wireCount: createdWireIds.length,
        position: { x: gridCursor.x, y: gridCursor.y },
      },
      changedData: {},
    });

    // launch autoAdjust of the grid after bulk paste
    this.controller.autoAdjustCircuitGridSize();

    return true;
  }

  // ==========================================================================
  // Cut/Paste Operations (T052-T053) - Phase 7
  // ==========================================================================

  /**
   * Cut current selection (copy + delete) (T052)
   * @returns true if cut succeeded
   */
  cutSelection(): boolean {
    // Copy first
    const copySuccess = this.copySelection();
    if (!copySuccess) return false;

    // Then delete
    this.deleteSelection();
    return true;
  }

  // ==========================================================================
  // Bulk Delete Operations (T033-T037) - Phase 5
  // ==========================================================================

  /**
   * Delete all selected elements (T033, T034, T035, T036, T037)
   *
   * Deletion order per research.md:
   * 1. Selected wires
   * 2. Selected components (cascades to connected wires)
   * 3. Selected branching points
   */
  deleteSelection(): boolean {
    const selectionManager = this.controller.getSelectionManager();
    const selectedIds = selectionManager.getSelectedIds();

    const totalCount =
      selectedIds.components.length + selectedIds.enodes.length + selectedIds.wires.length;

    // No selection to delete
    if (totalCount === 0) {
      return false;
    }

    // T033: Delete in order: wires → components → branching points

    // 1. Delete selected wires
    for (const wireId of selectedIds.wires) {
      this.controller.removeWire(wireId);
    }

    // 2. Delete selected components (T035: cascades to connected wires - orphaned cleanup)
    for (const componentId of selectedIds.components) {
      this.controller.removeComponent(componentId);
    }

    // 3. Delete selected branching points
    for (const enodeId of selectedIds.enodes) {
      this.controller.removeBranchingPoint(enodeId);
    }

    // T037: Emit bulk delete event
    this.controller.emit('toolOperationCompleted', {
      toolType: this.type,
      mode: 'bulk_delete',
      operationData: {
        componentCount: selectedIds.components.length,
        branchingPointCount: selectedIds.enodes.length,
        wireCount: selectedIds.wires.length,
      },
      changedData: {},
    });

    // launch autoAdjust of the grid after bulk delete
    this.controller.autoAdjustCircuitGridSize();

    // T036: Clear selection after delete
    selectionManager.deselect();

    return true;
  }
}
