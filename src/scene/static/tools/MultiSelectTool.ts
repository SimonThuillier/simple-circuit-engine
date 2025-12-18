/**
 * MultiSelectTool - Enables multi-element selection and bulk operations
 * @module scene/static/tools/MultiSelectTool
 */

import type {
  IEditingTool,
  CursorType,
} from '../../shared/types';
import type { CircuitSceneManager } from '../CircuitSceneManager';
import type { UUID } from '../../../core/types/Identifier';
import * as THREE from 'three';
import {
  gridToWorldPosition,
  isPointInScreenRect,
  nearestWorldSnapPosition,
  worldToGridPosition
} from '../../shared/GeometryUtils';

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
  private readonly sceneManager: CircuitSceneManager;

  // Selection rectangle state
  private selectionRectState: SelectionRectState | null = null;

  // Bulk drag state (Phase 4)
  private bulkDragState: BulkDragState | null = null;

  // Bound event handlers for stable references
  private handlePointerDown: (event: PointerEvent) => void;
  private handlePointerMove: (event: PointerEvent) => void;
  private handlePointerUp: (event: PointerEvent) => void;
  private handleKeyDown: (event: KeyboardEvent) => void;
  private handleGridPositionMove: (position: THREE.Vector3) => void;

  constructor(sceneManager: CircuitSceneManager) {
    this.sceneManager = sceneManager;

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
    const container = this.sceneManager.getContainer();
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
    const container = this.sceneManager.getContainer();
    container.removeEventListener('pointerdown', this.handlePointerDown);
    container.removeEventListener('pointermove', this.handlePointerMove);
    container.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.sceneManager.off('gridPositionMove', this.handleGridPositionMove);

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
    const hoveredElement = this.sceneManager.getHoveredElement();
    const selectionManager = this.sceneManager.getSelectionManager();

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

    const hoveredElement = this.sceneManager.getHoveredElement();
    const selectionManager = this.sceneManager.getSelectionManager();
    const shiftHeld = event.shiftKey;

    if (this.mode === 'idle') {
      // Case 1: Clicking on an element
      if (hoveredElement) {
        const isSelected = selectionManager.isSelected(hoveredElement.type, hoveredElement.id);

        // T020: Shift-click adds to selection
        if (shiftHeld) {
          if(hoveredElement.type === 'wire') return; // Wires cannot be individually added/removed from selection
          if (!isSelected) {
            selectionManager.addToSelection(hoveredElement.type, hoveredElement.id);
            // TODO: also add wires connected to this element (need some refactoring on SelectionManager)
          }
          else {
            // If already selected toggle => remove from the selection with deselecting cascade
            selectionManager.removeFromSelection(hoveredElement.type, hoveredElement.id);
            if(hoveredElement.type === 'component') {
              const circuitComponent = this.sceneManager.getCircuit()!.getComponent(hoveredElement.id);
                if(circuitComponent) {
                  // Also remove its pins and connected wires from selection
                  for (const pinId of circuitComponent.pins) {
                    selectionManager.removeFromSelection('enode', pinId);
                    const enode = this.sceneManager.getCircuit()!.getENode(pinId);
                    if(enode) {
                      for (const wireId of enode.wires) {
                        selectionManager.removeFromSelection('wire', wireId);
                      }
                    }
                  }
                }
            }
            // enode without componentId means branching point
            else if (hoveredElement.type === 'enode' && !hoveredElement.object3D.userData.componentId) {
              const enode = this.sceneManager.getCircuit()!.getENode(hoveredElement.id);
              if(enode) {
                for (const wireId of enode.wires) {
                  selectionManager.removeFromSelection('wire', wireId);
                }
              }
            }
          }
          return;
        }

        // T019: Single click selects element (clears previous)
        if (!isSelected && !(hoveredElement.type === 'enode' && !!hoveredElement.object3D.userData.componentId)) {
          selectionManager.selectOne(hoveredElement.type, hoveredElement.id);
          return;
        }

        // T024: Clicking on already selected element - start bulk drag
        const worldPosition = this.sceneManager.cursorGroundPlanePosition();
        this._startBulkDrag(worldPosition);
        return;
      }

      // Case 2: T021 - Click on empty space clears selection (if no drag started)
      // Case 3: T011 - Start rectangle selection on empty space
      const containerRect = this.sceneManager.getContainer().getBoundingClientRect();
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

    const containerRect = this.sceneManager.getContainer().getBoundingClientRect();
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
          this.sceneManager.getSelectionManager().deselect();
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
   * Handle keyboard events (T017, T030, T034)
   * - Escape: cancel current operation
   * - Delete/Backspace: delete selection
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
    this.sceneManager.getContainer().appendChild(overlayElement);

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
    const controls = this.sceneManager.getControls();
    if (controls) {
      controls.enablePan = false;
    }

    // T022: Emit event
    this.sceneManager.emit('toolOperationStarted', {
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

    const circuit = this.sceneManager.getCircuit();
    if (!circuit) return result;

    const camera = this.sceneManager.getCamera();
    const container = this.sceneManager.getContainer();
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
    const componentObject3Ds = this.sceneManager.getComponentObject3Ds();
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
            if(!enode) continue;
            for (const wireId of enode.wires) {
                const currentCount = wireEnodeSelectionCount.get(wireId) || 0;
                wireEnodeSelectionCount.set(wireId, currentCount + 1);
            }
          }
        }
      }
    }

    // Check enodes (branching points only - pins are covered by components)
    const enodeObject3Ds = this.sceneManager.getEnodeObject3Ds();
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
        if(!enode) continue;
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
    const selectionManager = this.sceneManager.getSelectionManager();

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
    this.sceneManager.emit('toolOperationCompleted', {
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
    const controls = this.sceneManager.getControls();
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
    this.sceneManager.emit('toolOperationCancelled', {
      toolType: this.type,
      mode: 'selecting',
    });

    // Cleanup
    this._cleanupSelectionRect();
    this.mode = 'idle';

    // Unlock camera controls
    const controls = this.sceneManager.getControls();
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
    const circuit = this.sceneManager.getCircuit();
    if (!circuit) return;

    const selectionManager = this.sceneManager.getSelectionManager();
    const selectedIds = selectionManager.getSelectedIds();

    // T025: Capture initial positions for all selected elements
    const initialPositions = new Map<UUID, THREE.Vector3>();

    // Capture component positions
    for (const componentId of selectedIds.components) {
      const object3D = this.sceneManager.getComponentObject3Ds().get(componentId);
      if (object3D) {
        initialPositions.set(componentId, object3D.position.clone());
      }
    }

    // Capture branching point positions
    for (const enodeId of selectedIds.enodes) {
      const object3D = this.sceneManager.getEnodeObject3Ds().get(enodeId);
      if (object3D && !object3D.userData.componentId) { // Only branching points
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
        const positions = wire.intermediatePositions.map(pos =>
          gridToWorldPosition(pos)
        );
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
    const controls = this.sceneManager.getControls();
    if (controls) {
      controls.enablePan = false;
    }

    // Register for grid position move events
    this.sceneManager.on('gridPositionMove', this.handleGridPositionMove);

    // T032: Emit event
    this.sceneManager.emit('toolOperationStarted', {
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

    const { dragStartWorld, initialPositions, affectedWireIds, initialWireIntermediatePositions } = this.bulkDragState;

    // Calculate delta
    const delta = new THREE.Vector3().subVectors(worldPosition, dragStartWorld);

    // T027: Apply delta to all selected elements
    for (const [elementId, initialPos] of initialPositions) {
      const newPosition = new THREE.Vector3().addVectors(initialPos, delta);
      const snappedPosition = nearestWorldSnapPosition(newPosition);

      // Update component visual
      const componentObject3D = this.sceneManager.getComponentObject3Ds().get(elementId);
      if (componentObject3D) {
        componentObject3D.position.copy(snappedPosition);

        // Update component in circuit model
        this.sceneManager.getCircuitEditionManager().saveEditComponent(elementId, componentObject3D);
        continue;
      }

      // Update branching point visual
      const enodeObject3D = this.sceneManager.getEnodeObject3Ds().get(elementId);
      if (enodeObject3D) {
        enodeObject3D.position.copy(snappedPosition);

        // Update branching point in circuit model
        this.sceneManager.getCircuitEditionManager().saveEditBranchingPoint(enodeObject3D);
      }
    }

    // Apply delta to intermediate positions of selected wires
    const editionManager = this.sceneManager.getCircuitEditionManager();
    for (const [wireId, initialIntermediatePositions] of initialWireIntermediatePositions) {
      // Apply delta to each intermediate position
      const updatedPositions = initialIntermediatePositions.map(pos => {
        const newPos = new THREE.Vector3().addVectors(pos, delta);
        return worldToGridPosition(newPos);
      });

      // Update wire intermediate positions in circuit model
      editionManager.saveEditWirePositions(wireId, updatedPositions, false);
    }

    // T028: Update wire geometry for all affected wires
    const wireVisualManager = this.sceneManager.getWireVisualManager();
    for (const wireId of affectedWireIds) {
      wireVisualManager.updateWireById(wireId);
    }
  }

  /**
   * Commit bulk drag operation (T029, T032)
   */
  private _commitBulkDrag(): void {
    if (!this.bulkDragState) return;

    const circuit = this.sceneManager.getCircuit();
    if (!circuit) return;

    const { dragStartWorld, initialPositions } = this.bulkDragState;
    const currentPosition = this.sceneManager.cursorGroundPlanePosition();

    // Calculate final delta
    const delta = new THREE.Vector3().subVectors(currentPosition, dragStartWorld);
    const gridDelta = worldToGridPosition(delta);


    // T032: Emit completion event
    this.sceneManager.emit('toolOperationCompleted', {
      toolType: this.type,
      mode: 'dragging',
      operationData: {
        elementCount: initialPositions.size,
        delta: { x: gridDelta.x, y: gridDelta.y },
      },
      changedData: {},
    });

    // Cleanup
    this.mode = 'idle';
    this.bulkDragState = null;

    // Unregister grid position move listener
    this.sceneManager.off('gridPositionMove', this.handleGridPositionMove);

    // Unlock camera controls
    const controls = this.sceneManager.getControls();
    if (controls) {
      controls.enablePan = true;
    }
  }

  /**
   * Cancel bulk drag operation - revert all elements to initial positions (T030)
   */
  private _cancelBulkDrag(): void {
    if (!this.bulkDragState) return;

    const { initialPositions, affectedWireIds, initialWireIntermediatePositions } = this.bulkDragState;

    // Revert all elements to initial positions
    for (const [elementId, initialPos] of initialPositions) {
      const componentObject3D = this.sceneManager.getComponentObject3Ds().get(elementId);
      if (componentObject3D) {
        componentObject3D.position.copy(initialPos);
        this.sceneManager.getCircuitEditionManager().saveEditComponent(elementId, componentObject3D);
        continue;
      }

      const enodeObject3D = this.sceneManager.getEnodeObject3Ds().get(elementId);
      if (enodeObject3D) {
        enodeObject3D.position.copy(initialPos);
        this.sceneManager.getCircuitEditionManager().saveEditBranchingPoint(enodeObject3D);
      }
    }

    // Revert intermediate positions of selected wires
    const editionManager = this.sceneManager.getCircuitEditionManager();
    for (const [wireId, initialIntermediatePositions] of initialWireIntermediatePositions) {
      const positions = initialIntermediatePositions.map(pos => worldToGridPosition(pos));
      editionManager.saveEditWirePositions(wireId, positions, false);
    }

    // Update all affected wires
    const wireVisualManager = this.sceneManager.getWireVisualManager();
    for (const wireId of affectedWireIds) {
      wireVisualManager.updateWireById(wireId);
    }

    // Emit cancellation event
    this.sceneManager.emit('toolOperationCancelled', {
      toolType: this.type,
      mode: 'dragging',
    });

    // Cleanup
    this.mode = 'idle';
    this.bulkDragState = null;

    // Unregister grid position move listener
    this.sceneManager.off('gridPositionMove', this.handleGridPositionMove);

    // Unlock camera controls
    const controls = this.sceneManager.getControls();
    if (controls) {
      controls.enablePan = true;
    }
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
    const selectionManager = this.sceneManager.getSelectionManager();
    const selectedIds = selectionManager.getSelectedIds();

    const totalCount =
      selectedIds.components.length +
      selectedIds.enodes.length +
      selectedIds.wires.length;

    // No selection to delete
    if (totalCount === 0) {
      return false;
    }

    // T033: Delete in order: wires → components → branching points

    // 1. Delete selected wires
    for (const wireId of selectedIds.wires) {
      this.sceneManager.removeWire(wireId);
    }

    // 2. Delete selected components (T035: cascades to connected wires - orphaned cleanup)
    for (const componentId of selectedIds.components) {
      this.sceneManager.removeComponent(componentId);
    }

    // 3. Delete selected branching points
    for (const enodeId of selectedIds.enodes) {
      this.sceneManager.removeBranchingPoint(enodeId);
    }

    // T037: Emit bulk delete event
    this.sceneManager.emit('toolOperationCompleted', {
      toolType: this.type,
      mode: 'bulk_delete',
      operationData: {
        componentCount: selectedIds.components.length,
        branchingPointCount: selectedIds.enodes.length,
        wireCount: selectedIds.wires.length,
      },
      changedData: {},
    });

    // T036: Clear selection after delete
    selectionManager.deselect();

    return true;
  }
}
