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
import type {IEditingTool, ToolType, CursorType, SelectionData, HoverableType} from '../../shared/types';
import type { Circuit } from '../../../core/Circuit';
import type { CircuitSceneManager } from '../CircuitSceneManager';
import { Position } from '../../../core/types/Position';
import type { UUID } from '../../../core/types/Identifier';
import {nearestGridMagnetPosition} from "../../shared/GeometryUtils";

/**
 * Drag state for component movement (T030)
 */
interface DragState {
  selection: SelectionData;
  positionsAtStart: Map<UUID, {type: HoverableType, position: THREE.Vector3}>;
  startPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
}

/**
 * Tool for moving components, enodes and wires
 * Implements FR-029: Click, drag, double-click interactions
 */
export class PositionTool implements IEditingTool {
  readonly type: ToolType = 'position';

  private _circuit: Circuit | null = null;
  private _sceneManager: CircuitSceneManager;
  private dragState: DragState | null = null;

  constructor(circuit: Circuit | null, sceneManager: CircuitSceneManager) {
    this._circuit = circuit;
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

    container.addEventListener('pointerdown', this.handlePointerDown);
    container.addEventListener('pointerup', this.handlePointerUp);
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
   */
  handlePointerDown(event: MouseEvent): void {
    // discard if right click or middle click
    if (event.button !== 0) {
      return;
    }

    console.log('PointerDown');
    const selection = this._sceneManager.getSelectionManager().getSelection();
    // TODO: check that at least one selected object is hovered to prevent accidental drags
    if (!selection){
      return; // TODO: later it could be multi-selection
    }
    if (selection.kind === 'multi'){
      return; // TODO: implement dragging multiple components later
    }
    // discriminate invalid selections for this tool
    if (selection.kind === 'mono' && selection.type === 'enode'){
      const object = this._sceneManager.getGroup('enode', selection.id);
      if (!object) {return;}
      if(object.userData.componentId){
        return; // enodes of components cannot be moved independently
      }
    }

    // lock MapControl change of camera during drag
    this._sceneManager.getControls()!.enablePan = false;


    const startPosition = this._sceneManager.cursorGroundPlanePosition().clone();
    console.log('beginning mono selection drag at: ', startPosition);

    // Start drag state
    this.dragState = {
      selection: selection,
      positionsAtStart: this._sceneManager.getSelectionPositions(selection),
      startPosition: startPosition,
      currentPosition: startPosition
    };
    // start listening to gridPositionMove events
    this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
  }

  /**
   * Handle mousemove - update component position during drag with grid snapping (T032)
   */
  handleGridPositionMove(cursorGridPosition: THREE.Vector3): void {
    if (!this.dragState) {
      return;
    }
    //console.log('GridPositionMove: ', cursorGridPosition);
    const dragDelta = new THREE.Vector3().subVectors(
        cursorGridPosition,
        this.dragState.startPosition
    );
    for (const [id, data] of this.dragState.positionsAtStart.entries()) {
      const object = this._sceneManager.getGroup(data.type, id);
      if (!object) {continue;}
      const objectDraggedPosition = nearestGridMagnetPosition(new THREE.Vector3().addVectors(
          data.position,
          dragDelta
      ));
      object.position.set(objectDraggedPosition.x, 0, objectDraggedPosition.z);
    }
    // TODO Update wires connected to components (T035-T036)
  }

  /**
   * Handle pointerup - commit position to Circuit model (T034)
   */
  handlePointerUp(event: MouseEvent): void {
    // discard if right click or middle click
    if (event.button !== 0) {
      return;
    }
    console.log('PointerUp');
    // stop listening to gridPositionMove events
    this._sceneManager.off('gridPositionMove', this.handleGridPositionMove);

    if (!this.dragState) {
      return;
    }
    console.log('Saving drag results for: ', this.dragState);

    // Commit position to circuit model (T034)

    // Clear drag state
    this.dragState = null;
    // re-enable MapControl change of camera after drag
    this._sceneManager.getControls()!.enablePan = true;
  }

  /**
   * Handle keyboard input - Escape key to cancel drag
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.dragState) {
      // stop listening to gridPositionMove events
      this._sceneManager.off('gridPositionMove', this.handleGridPositionMove);
      // restore all elements to their original positions
      for (const [id, data] of this.dragState.positionsAtStart.entries()) {
        const object = this._sceneManager.getGroup(data.type, id);
        if (!object) {continue;}
        const originalPosition = nearestGridMagnetPosition(data.position);
        object.position.set(originalPosition.x, 0, originalPosition.z);
      }
      // Clear drag state
      this.dragState = null;
    }
  }

  /**
   * Handle double-click event
   */
  handleDoubleClick(_worldPosition: THREE.Vector3): void {
    // TODO: Implement rotation logic (Phase 7)
  }
}
