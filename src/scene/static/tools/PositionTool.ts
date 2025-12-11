/**
 * Position Tool Implementation
 * @module scene/static/tools/PositionTool
 *
 * Tool for moving and rotating components in the circuit.
 * - Click to position component
 * - Drag to move selected component
 * - Double-click to rotate selected component 90 degrees
 */

import * as THREE from 'three';
import type {
  IEditingTool,
  ToolType,
  CursorType,
  SelectionData,
  HoverableType,
} from '../../shared/types';
import type { CircuitSceneManager } from '../CircuitSceneManager';
import type { UUID } from '../../../core/types/Identifier';
import { nearestGridMagnetPosition } from '../../shared/GeometryUtils';

/**
 * Drag state for component movement (T030)
 */
interface DragState {
  selection: SelectionData;
  positionsAtStart: Map<UUID, { type: HoverableType; position: THREE.Vector3 }>;
  startPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
}

/**
 * Tool for moving components, enodes and wires
 * Implements FR-029: Click, drag, double-click interactions
 */
export class PositionTool implements IEditingTool {
  readonly type: ToolType = 'position';

  private _sceneManager: CircuitSceneManager;
  private dragState: DragState | null = null;

  constructor(sceneManager: CircuitSceneManager) {
    this._sceneManager = sceneManager;
  }

  /**
   * Called when tool is activated
   */
  onActivate(): void {
    // Setup tool state
    this._sceneManager.getSelectionManager().getSelection();
    this.dragState = null;

    const container = this._sceneManager.getContainer();

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleGridPositionMove = this.handleGridPositionMove.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleDblClick = this.handleDblClick.bind(this);

    container.addEventListener('pointerdown', this.handlePointerDown);
    container.addEventListener('pointerup', this.handlePointerUp);
    container.addEventListener('dblclick', this.handleDblClick);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Called when tool is deactivated
   */
  onDeactivate(): void {
    const container = this._sceneManager.getContainer();
    // Remove event listeners
    this._sceneManager.off('gridPositionMove', this.handleGridPositionMove);
    container.removeEventListener('pointerdown', this.handlePointerDown);
    container.removeEventListener('pointerup', this.handlePointerUp);
    container.removeEventListener('dblclick', this.handleDblClick);
    window.removeEventListener('keydown', this.handleKeyDown);

    // Cleanup tool state
    this.dragState = null;
  }

  /**
   * Get current cursor type based on tool state
   */
  getCursorType(): CursorType {
    // if (this.dragState) {
    //   return 'grabbing';
    // }
    // if (this.selectedComponentId && this.isHoveringComponent) {
    //   return 'grab';
    // }
    // if (this.isHoveringComponent) {
    //   return 'pointer';
    // }
    return 'default';
  }

  /**
   * Get preview objects (selection highlight)
   */
  getPreviewObjects(): THREE.Object3D[] {
    // TODO: Implement selection highlight
    return [];
  }

  /**
   * Handle pointerdown - start drag on selected component (T031)
   *
   * Initiates a drag operation if a component is currently selected and hovered.
   * Locks camera controls and begins tracking the drag state.
   *
   * @param event - Mouse event from pointerdown
   */
  handlePointerDown(event: MouseEvent): void {
    // discard if right click or middle click
    if (event.button !== 0) {
      return;
    }

    const selection = this._sceneManager.getSelectionManager().getSelection();
    // TODO: check that at least one selected object is hovered to prevent accidental drags
    if (!selection) {
      return; // TODO: later it could be multi-selection
    }
    if (selection.kind === 'multi') {
      return; // TODO: implement dragging multiple components later
    }
    // discriminate invalid selections for this tool
    if (selection.kind === 'mono' && selection.type === 'enode') {
      const object = this._sceneManager.getGroup('enode', selection.id);
      if (!object) {
        return;
      }
      if (object.userData.componentId) {
        return; // enodes of components cannot be moved independently
      }
    }
    // lock MapControl change of camera during drag
    this._sceneManager.getControls()!.enablePan = false;

    // Start drag state
    const startPosition = this._sceneManager.cursorGroundPlanePosition().clone();
    this.dragState = {
      selection: selection,
      positionsAtStart: this._sceneManager.getSelectionPositions(selection),
      startPosition: startPosition,
      currentPosition: startPosition,
    };

    // Emit dragStart event (T039)
    this._sceneManager.emit('dragStart', {
      selection: selection,
      startPosition: startPosition,
    });

    // start listening to gridPositionMove events
    this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
  }

  /**
   * Handle mousemove - update component position during drag with grid snapping (T032)
   *
   * Updates the visual position of dragged objects in real-time with grid snapping.
   * Emits dragMove events to notify listeners of position changes.
   *
   * @param cursorGridPosition - Current cursor position on the ground plane, grid-snapped
   */
  handleGridPositionMove(cursorGridPosition: THREE.Vector3): void {
    if (!this.dragState) {
      return;
    }

    const dragDelta = new THREE.Vector3().subVectors(
      cursorGridPosition,
      this.dragState.startPosition
    );
    for (const [id, data] of this.dragState.positionsAtStart.entries()) {
      const object = this._sceneManager.getGroup(data.type, id);
      if (!object) {
        continue;
      }
      const objectDraggedPosition = nearestGridMagnetPosition(
        new THREE.Vector3().addVectors(data.position, dragDelta)
      );
      object.position.set(objectDraggedPosition.x, 0, objectDraggedPosition.z);
    }

    // Update current position and emit dragMove event (T039)
    this.dragState.currentPosition = cursorGridPosition;
    this._sceneManager.emit('dragMove', {
      selection: this.dragState.selection,
      currentPosition: cursorGridPosition,
      delta: dragDelta,
    });

    // TODO Update wires connected to components (T035-T036)
  }

  /**
   * Handle pointerup - commit position to Circuit model (T034)
   *
   * Ends the drag operation, commits final positions to the circuit model,
   * and re-enables camera controls.
   *
   * @param event - Mouse event from pointerup
   */
  handlePointerUp(event: MouseEvent): void {
    // discard if right click or middle click
    if (event.button !== 0) {
      return;
    }
    // stop listening to gridPositionMove events
    this._sceneManager.off('gridPositionMove', this.handleGridPositionMove);

    if (!this.dragState) {
      return;
    }

    // Emit dragEnd event (T039)
    this._sceneManager.emit('dragEnd', {
      selection: this.dragState.selection,
      finalPosition: this.dragState.currentPosition,
    });

    // Commit position to circuit model (T034)
    // Save new state into the circuit model
    for (const [id, data] of this.dragState.positionsAtStart.entries()) {
      const object = this._sceneManager.getGroup(data.type, id);
      if (!object) {
        continue;
      }
      if (data.type === 'component') {
        this._sceneManager.getCircuitEditionManager().saveComponentAction(id, 'edit', object);
      }
      // TODO: handle enodes and wires later
    }

    // Clear drag state
    this.dragState = null;
    // re-enable MapControl change of camera after drag
    this._sceneManager.getControls()!.enablePan = true;
  }

  /**
   * Handle keyboard input - Escape key to cancel drag, R key to rotate (T046)
   *
   * Handles two keyboard shortcuts:
   * - Escape: Cancels active drag operation and restores original positions
   * - R/r: Rotates the selected component 90° clockwise
   *
   * @param event - Keyboard event
   */
  handleKeyDown(event: KeyboardEvent): void {
    // Handle Escape key to cancel drag (T042)
    if (event.key === 'Escape' && this.dragState) {
      // stop listening to gridPositionMove events
      this._sceneManager.off('gridPositionMove', this.handleGridPositionMove);

      // Emit dragCancel event (T044)
      this._sceneManager.emit('dragCancel', {
        selection: this.dragState.selection,
      });

      // restore all elements to their original positions
      for (const [id, data] of this.dragState.positionsAtStart.entries()) {
        const object = this._sceneManager.getGroup(data.type, id);
        if (!object) {
          continue;
        }
        const originalPosition = nearestGridMagnetPosition(data.position);
        object.position.set(originalPosition.x, 0, originalPosition.z);
      }

      // Clear drag state
      this.dragState = null;
      // re-enable MapControl change of camera after drag cancel
      this._sceneManager.getControls()!.enablePan = true;
    }

    // Handle R key to rotate selected component (T046)
    if ((event.key === 'r' || event.key === 'R') && !this.dragState) {
      this.rotateSelectedComponent();
    }
  }

  /**
   * Handle double-click event - Rotate selected component 90° clockwise (T045)
   */
  handleDblClick(_event: MouseEvent): void {
    this.rotateSelectedComponent();
  }

  /**
   * Rotate the selected component 90° clockwise (T047-T048)
   *
   * Updates both the circuit model and visual representation.
   * Emits componentRotated event to notify listeners.
   * Only works on selected components (not wires or enodes).
   */
  private rotateSelectedComponent(): void {
    const selection = this._sceneManager.getSelectionManager().getSelection();
    // Only rotate components, not wires or enodes
    if (!selection || selection.kind !== 'mono' || selection.type !== 'component') {
      return;
    }
    const componentId = selection.id;
    const component = this._sceneManager.getGroup('component', componentId);
    if (!component) {
      return;
    }
    const currentAngle = component.rotation.y;
    const newAngle = (currentAngle - Math.PI / 2) % (Math.PI * 2);
    component.rotation.set(0, newAngle, 0);
    const modelRotation = -Math.round((component.rotation.y * 180) / Math.PI);

    // Emit componentRotated event
    this._sceneManager.emit('componentRotated', {
      componentId: componentId,
      newRotation: newAngle,
      modelRotation: modelRotation,
    });
    // Save new component state into the circuit model
    this._sceneManager
      .getCircuitEditionManager()
      .saveComponentAction(componentId, 'edit', component);

    // TODO: Update wires connected to this component (T049 - reported for future spec)
  }
}
