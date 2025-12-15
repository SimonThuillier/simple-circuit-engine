/**
 * Wire Tool Implementation
 * @module scene/static/tools/WireTool
 *
 * Tool for creating wires between endpoints.
 * - First click selects source endpoint (pin or branching point)
 * - Shows path preview from source to hover position
 * - Second click selects target endpoint and creates wire
 * - Escape cancels operation
 */

import * as THREE from 'three';
import type { IEditingTool, ToolType, CursorType } from '../../shared/types';
import type { CircuitSceneManager } from '../CircuitSceneManager';
import type { UUID } from '../../../core/types/Identifier';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';

/**
 * Wire tool operating modes (T025)
 */
type WireToolMode = 'idle' | 'wire_creating' | 'dragging';

/**
 * State during wire creation (T026)
 */
interface WireCreatingState {
  sourceEnodeId: UUID;
  sourcePosition: THREE.Vector3;
  previewWire: Line2 | null;
}

/**
 * State during intermediate position dragging (T026)
 */
interface DragState {
  wireId: UUID;
  pointIndex: number;
  initialPosition: THREE.Vector3;
}

/**
 * Tool for creating wires
 * Implements FR-029, FR-030, FR-031 (multi-step, preview, cancellation)
 */
export class WireTool implements IEditingTool {
  readonly type: ToolType = 'wire';

  private _sceneManager: CircuitSceneManager;

  // Tool state (T025-T026)
  private mode: WireToolMode = 'idle';
  private wireCreatingState: WireCreatingState | null = null;
  private dragState: DragState | null = null;

  // Hover state for cursor management
  private isValidTarget: boolean = true;

  constructor(sceneManager: CircuitSceneManager) {
    this._sceneManager = sceneManager;

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleGridPositionMove = this.handleGridPositionMove.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleDblClick = this.handleDblClick.bind(this);
  }

  /**
   * Activate wire tool and set up event listeners (T027)
   */
  onActivate(): void {
    // Reset state
    this.mode = 'idle';
    this.wireCreatingState = null;
    this.dragState = null;
    this.isValidTarget = true;

    // Set up event listeners
    const container = this._sceneManager.getContainer();

    container.addEventListener('pointerdown', this.handlePointerDown);
    container.addEventListener('pointerup', this.handlePointerUp);
    container.addEventListener('dblclick', this.handleDblClick);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Deactivate wire tool and clean up event listeners (T028)
   */
  onDeactivate(): void {
    // Clean up any active operation
    if (this.mode === 'wire_creating') {
      this.cancelWireCreation();
    }

    const container = this._sceneManager.getContainer();
    // Remove event listeners
    this._sceneManager.off('gridPositionMove', this.handleGridPositionMove);
    container.removeEventListener('pointerdown', this.handlePointerDown);
    container.removeEventListener('pointerup', this.handlePointerUp);
    container.removeEventListener('dblclick', this.handleDblClick);
    window.removeEventListener('keydown', this.handleKeyDown);


    // Reset state
    this.mode = 'idle';
    this.wireCreatingState = null;
    this.dragState = null;
    this.isValidTarget = true;
  }

  getCursorType(): CursorType {
    // T041: Return appropriate cursor based on hover state
    const hoveredElement = this._sceneManager.getHoveredElement();

    // During wire creation, show not-allowed for invalid targets
    if (this.mode === 'wire_creating' && !this.isValidTarget) {
      return 'not-allowed';
    }

    // Show pointer when hovering an enode (pin or branching point)
    if (hoveredElement && hoveredElement.type === 'enode') {
      return 'pointer';
    }

    // Show crosshair during wire creation
    if (this.mode === 'wire_creating') {
      return 'crosshair';
    }

    return 'crosshair';
  }

  getPreviewObjects(): THREE.Object3D[] {
    // TODO: Implement wire path preview
    return [];
  }

  /**
   * Handle pointer down event for wire creation (T029)
   * @param event - Mouse event
   */
  private handlePointerDown(event: MouseEvent): void {
    // Only handle left click
    if (event.button !== 0) return;

    const hoveredElement = this._sceneManager.getHoveredElement();

    // Check if we're hovering an enode (pin or branching point)
    if (hoveredElement && hoveredElement.type === 'enode') {
      const enodeId = hoveredElement.id;

      if (this.mode === 'idle') {
        // First click - start wire creation
        console.log('Starting wire creation from enode:', enodeId);
        this.startWireCreation(enodeId);
      }
    } else if (this.mode === 'wire_creating') {
      // Clicked on empty space during wire creation - cancel
      this.cancelWireCreation();
    }

    // lock MapControl change of camera during drag
    this._sceneManager.getControls()!.enablePan = false;
    // start listening to gridPositionMove events
    this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
  }

  /**
   * Handle grid position move event during wire creation (T031)
   * @param position - Current grid position
   */
  private handleGridPositionMove(position: THREE.Vector3): void {
    if (this.mode === 'wire_creating' && this.wireCreatingState) {
      // Update preview wire endpoint
      this._sceneManager.getWireVisualManager().updatePreviewWire(position);
    }
  }

  /**
   * Handle pointerup
   *
   * Ends current operation, commits final positions to the circuit model,
   * and re-enables camera controls.
   *
   * @param event - Mouse event from pointerup
   */
  handlePointerUp(event: MouseEvent): void {
    // discard if right click or middle click
    if (event.button !== 0) {
      return;
    }
    const hoveredElement = this._sceneManager.getHoveredElement();

    if (this.mode === 'wire_creating') {
      if (!hoveredElement) {
        // TODO handle that case (create branching point instead of cancelling)
        this.cancelWireCreation();
      }
      if (hoveredElement && hoveredElement.type === 'enode') {
        const enodeId = hoveredElement.id;
        this.completeWireCreation(enodeId);
      }

    }

    // stop listening to gridPositionMove events
    this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
    // unlock MapControl change of camera
    this._sceneManager.getControls()!.enablePan = true;
  }

  /**
   * Start wire creation from source enode (T030)
   * @param sourceEnodeId - Source enode ID
   */
  private startWireCreation(sourceEnodeId: UUID): void {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    const sourceEnode = circuit.getENode(sourceEnodeId);
    if (!sourceEnode) return;

    // Get source position
    const enodeGroup = this._sceneManager.getEnodeObject3Ds().get(sourceEnodeId);
    if (!enodeGroup) return;
    const sourcePosition = enodeGroup.position.clone();
    if (enodeGroup.userData.componentId){
      // since pins (enodes of components) are children of the component object3D,
      // we need to get the world position
      enodeGroup.getWorldPosition(sourcePosition);
    }
    console.log(enodeGroup.userData);
    console.log(sourcePosition);

    // Create preview wire
    const previewWire = this._sceneManager.getWireVisualManager().createPreviewWire(sourcePosition);

    // Enter wire creating state
    this.mode = 'wire_creating';
    this.wireCreatingState = {
      sourceEnodeId,
      sourcePosition: sourcePosition.clone(),
      previewWire,
    };
    console.log('Wire creating state initialized:', this.wireCreatingState);

    this._sceneManager.emit('toolOperationStarted', {
      toolType: this.type,
      operationData: { sourceEnodeId },
    });
  }

  /**
   * Cancel wire creation and reset state (T034)
   */
  private cancelWireCreation(): void {
    if (this.wireCreatingState) {
      // Remove preview wire
      this._sceneManager.getWireVisualManager().removePreviewWire();

      this._sceneManager.emit('toolOperationCancelled', {
        toolType: this.type,
      });
    }
    // Reset state
    this.mode = 'idle';
    this.wireCreatingState = null;
  }

  /**
   * Complete wire creation between source and target enodes (T032)
   * @param targetEnodeId - Target enode ID
   */
  private completeWireCreation(targetEnodeId: UUID): void {
    if (!this.wireCreatingState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    const sourceEnodeId = this.wireCreatingState.sourceEnodeId;

    // Saving to model, Validation checks are done in the process (T036, T037)
    try {
      const wire = this._sceneManager.getCircuitEditionManager().
      saveAddWire(sourceEnodeId, targetEnodeId);
      // Create definitive wire visual (T038)
      this._sceneManager.getWireVisualManager().createOrUpdateWire(wire);
      // Emit success event
      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        operationData: { wireId: wire.id, sourceEnodeId, targetEnodeId },
        changedData: { addedWires: [wire.id] },
      });
      // Reset state (end preview)
      this.cancelWireCreation();
    }
    catch(error){
      this.cancelWireCreation();
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        errorMessage: `Duplicate wire creation between enodes ${sourceEnodeId} and ${targetEnodeId}`,
      });
      return;
    }
  }

  /**
   * Validate wire creation between two enodes (T036, T037)
   * @param sourceEnodeId - Source enode ID
   * @param targetEnodeId - Target enode ID
   * @returns true if wire creation is valid
   */
  private validateWireCreation(sourceEnodeId: UUID, targetEnodeId: UUID): boolean {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return false;

    // FR-010: Prevent self-connection (T037)
    if (sourceEnodeId === targetEnodeId) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        errorMessage: 'Cannot connect an endpoint to itself',
      });
      return false;
    }

    // FR-011: Prevent duplicate wires (T036)
    const existingWire = circuit.getWireBetweenNodes(sourceEnodeId, targetEnodeId);
    if (existingWire) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        errorMessage: 'A wire already exists between these endpoints',
      });
      return false;
    }

    return true;
  }

  /**
   * Handle key down events (T033)
   * @param event - Keyboard event
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.mode === 'wire_creating') {
      this.cancelWireCreation();
    }
  }

  /**
   * Handle hover events to update cursor and validation state
   * @param event - Hover event
   */
  private handleHover(event: any): void {
    const hoveredElement = event;

    if (hoveredElement.objectType === 'enodeHitbox') {
      this.isHoveringEndpoint = true;

      // During wire creation, validate target
      if (this.mode === 'wire_creating' && this.wireCreatingState) {
        const targetEnodeId = hoveredElement.objectId;
        this.isValidTarget = this.validateWireCreation(
            this.wireCreatingState.sourceEnodeId,
            targetEnodeId
        );
      } else {
        this.isValidTarget = true;
      }

      // Request cursor update
      this._sceneManager.emit('cursorChangeRequested', {
        cursorType: this.getCursorType(),
      });
    } else {
      this.isHoveringEndpoint = false;
      this.isValidTarget = true;
    }
  }

  /**
   * Handle unhover events
   */
  private handleUnhover(): void {
    this.isHoveringEndpoint = false;
    this.isValidTarget = true;

    this._sceneManager.emit('cursorChangeRequested', {
      cursorType: this.getCursorType(),
    });
  }

  handleClick(_worldPosition: THREE.Vector3): void {
    // Handled by handlePointerDown
  }

  /**
   * Handle double-click to create branching point (T042, T043, T049)
   *
   * T042: Double-click vs single-click disambiguation is handled by the browser's
   * native dblclick event, which only fires after two clicks within ~300ms.
   * Single clicks on enodes create wires (handlePointerDown/Up), while double
   * clicks on wires create branching points (this method). The target type
   * (enode vs wire) naturally separates the two actions.
   *
   * T049: Double-click on empty space creates standalone branching point
   *
   * @param event - Mouse event
   */
  handleDblClick(event: MouseEvent): void {
    if (event.button !== 0) return;

    const hoveredElement = this._sceneManager.getHoveredElement();

    // Check if we're hovering a wire
    if (hoveredElement && hoveredElement.type === 'wire') {
      const wireId = hoveredElement.id;
      const gridPosition = this._sceneManager.cursorGroundPlanePosition();

      // Create branching point on the wire at the clicked position
      this.createBranchingPointOnWire(wireId, gridPosition);
    } else if (!hoveredElement) {
      // T049: Double-click on empty space - create standalone branching point
      const gridPosition = this._sceneManager.cursorGroundPlanePosition();
      this.createStandaloneBranchingPoint(gridPosition);
    }
  }

  /**
   * Create a branching point on an existing wire, splitting it (T044)
   * @param wireId - Wire to split
   * @param worldPosition - 3D position in world space
   */
  private createBranchingPointOnWire(wireId: UUID, worldPosition: THREE.Vector3): void {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;



    try {
      // T045: Call CircuitEditionManager to split the wire and create branching point
      const result = this._sceneManager.getCircuitEditionManager()
        .saveSplitWire(wireId, worldPosition);

      // T046: Remove old wire visual from scene
      this._sceneManager.getWireVisualManager().removeWire(wireId);

      // T046: Add new wire visuals to scene
      this._sceneManager.getWireVisualManager().createOrUpdateWire(result.wire1);
      this._sceneManager.getWireVisualManager().createOrUpdateWire(result.wire2);

      // T047: Add branching point visual to scene
      const branchingPointGroup = this._sceneManager.getBranchingPointVisualFactory()
        .createVisual(result.branchingPoint);

      const pos = result.branchingPoint.getPosition(circuit);
      branchingPointGroup.position.set(pos.x, 0, -pos.y);

      this._sceneManager.getScene().add(branchingPointGroup);
      this._sceneManager.getEnodeObject3Ds().set(result.branchingPoint.id, branchingPointGroup);

      // Emit success event
      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        operationData: {
          wireId,
          branchingPointId: result.branchingPoint.id,
          wire1Id: result.wire1.id,
          wire2Id: result.wire2.id,
        },
        changedData: {
          removedWires: [wireId],
          addedWires: [result.wire1.id, result.wire2.id],
          addedENodes: [result.branchingPoint.id],
        },
      });
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        errorMessage: `Failed to create branching point: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Create a standalone branching point at empty grid position (T048)
   * @param worldPosition - 3D position in world space
   */
  private createStandaloneBranchingPoint(worldPosition: THREE.Vector3): void {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    try {
      // Create branching point in circuit model (no sourceType initially)
      const branchingPoint = this._sceneManager.getCircuitEditionManager()
        .saveAddBranchingPoint(worldPosition);

      // T051: Create and add visual to scene
      const group = this._sceneManager.getBranchingPointVisualFactory()
        .createVisual(branchingPoint);

      const pos = branchingPoint.getPosition(circuit);
      group.position.set(pos.x, 0, -pos.y);
      this._sceneManager.getScene().add(group);
      this._sceneManager.getEnodeObject3Ds().set(branchingPoint.id, group);
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        errorMessage: `Failed to create branching point: ${(error as Error).message}`,
      });
    }
  }

  cancelOperation(): void {
    this.cancelWireCreation();
  }
}
