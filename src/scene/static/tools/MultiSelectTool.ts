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
import { isPointInScreenRect } from '../../shared/GeometryUtils';

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

  // Bound event handlers for stable references
  private handlePointerDown: (event: PointerEvent) => void;
  private handlePointerMove: (event: PointerEvent) => void;
  private handlePointerUp: (event: PointerEvent) => void;
  private handleKeyDown: (event: KeyboardEvent) => void;

  constructor(sceneManager: CircuitSceneManager) {
    this.sceneManager = sceneManager;

    // Bind event handlers
    this.handlePointerDown = this._handlePointerDown.bind(this);
    this.handlePointerMove = this._handlePointerMove.bind(this);
    this.handlePointerUp = this._handlePointerUp.bind(this);
    this.handleKeyDown = this._handleKeyDown.bind(this);
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

    this.mode = 'idle';
    this.selectionRectState = null;
  }

  /**
   * Cancel any in-progress operation
   */
  cancelOperation(): void {
    if (this.mode === 'selecting') {
      this._cancelSelectionRect();
    }
    // Future: handle 'dragging' mode cancellation in Phase 4
  }

  /**
   * Get the current cursor type for this tool
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
        // Check if hovering over a selected element (for drag cursor)
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
  // Event Handlers (T011, T013, T016, T017, T019-T022)
  // ==========================================================================

  /**
   * Handle pointer down event (T011, T019, T020, T021)
   * - Empty space: start rectangle selection
   * - Element click: select that element (clear others unless Shift held)
   * - Selected element: prepare for drag (Phase 4)
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
            else if (hoveredElement.type === 'enode') {
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
        if (!isSelected) {
          selectionManager.selectOne(hoveredElement.type, hoveredElement.id);
          return;
        }

        // Clicking on already selected element - prepare for drag (Phase 4)
        // For now, just do nothing
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
   * Handle pointer up event (T016, T21)
   * Commits selection or clears if it was just a click
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
    }
  }

  /**
   * Handle keyboard events (T017)
   * - Escape: cancel current operation
   */
  private _handleKeyDown(event: KeyboardEvent): void {
    // T017: Escape cancels rectangle selection
    if (event.key === 'Escape') {
      if (this.mode === 'selecting') {
        this._cancelSelectionRect();
        return;
      }
    }
  }

  // ==========================================================================
  // Selection Rectangle Operations (T012, T014, T015, T016, T018, T22)
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
}
