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
import type {IEditingTool, ToolType, CursorType, MonoSelectionData} from '../../shared/types';
import type { CircuitSceneManager } from '../CircuitSceneManager';
import type { UUID } from '../../../core/types/Identifier';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { Position } from '../../../core/types/Position';

/**
 * Wire tool operating modes (T025)
 */
type WireToolMode = 'idle' | 'wire_creating' | 'wire_dragging' | 'bp_dragging';

/**
 * State during wire creation (T026)
 */
interface WireCreatingState {
  sourceEnodeId: UUID;
  sourcePosition: THREE.Vector3;
  previewWire: Line2 | null;
  ts: number;
}

/**
 * State during wire intermediate position dragging (T026)
 */
interface WireDragState {
  wireId: UUID;
  /** Index in intermediatePositions array, or -1 for branching point drag */
  pointIndex: number;
  initialPosition: THREE.Vector3;
  /** Original intermediate positions before drag (for cancel) */
  originalPositions: { x: number; y: number }[];
  /** Target type: 'intermediate' | 'branching_point' | 'new_intermediate' */
  targetType: 'intermediate' | 'branching_point' | 'new_intermediate';
}

/**
 * State during Branching Point intermediate position dragging (SPEC CHANGE
 */
interface BPDragState {
  enodeId: UUID;
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
  private lastCancelledOpTs: number = 0;
  private wireCreatingState: WireCreatingState | null = null;
  private wireDragState: WireDragState | null = null;
  private bpDragState: BPDragState | null = null;

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
    this.wireDragState = null;
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
    } else if (this.mode === 'wire_dragging') {
      this.cancelWireDrag();
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
    this.wireDragState = null;
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
   * Handle pointer down event for wire creation and dragging (T029, T060)
   * @param event - Mouse event
   */
  private handlePointerDown(event: MouseEvent): void {
    // Only handle left click
    if (event.button !== 0) return;

    const hoveredElement = this._sceneManager.getHoveredElement();
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    // T060: Single-click on wire - check for drag target
    if (this.mode === 'idle' && hoveredElement && hoveredElement.type === 'wire') {
      const wireId = hoveredElement.id;
      const screenPos = new THREE.Vector2(event.clientX, event.clientY);
      const worldPosition = this._sceneManager.cursorGroundPlanePosition();

      // T061: Drag target resolution: branching point > existing intermediate > new intermediate
      const wire = circuit.getWire(wireId);
      if (!wire) return;

      // Priority 1: Check for existing intermediate point
      const nearestPoint = this._sceneManager.getWireVisualManager()
          .findNearestIntermediatePoint(wireId, screenPos);
      if (nearestPoint) {
        // Start dragging existing intermediate point
        const pos = wire.intermediatePositions[nearestPoint.pointIndex];
        if (pos) {
          const worldPos = new THREE.Vector3(pos.x, 0, -pos.y);
          this.startWireDrag(wireId, 'intermediate', nearestPoint.pointIndex, worldPos);
          this._sceneManager.getControls()!.enablePan = false;
          this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
          return;
        }
      }

      // Priority 2: Create new intermediate point at click position
      const insertIndex = this.getInsertIndexForPosition(wireId, worldPosition);
      this.startWireDrag(wireId, 'new_intermediate', insertIndex, worldPosition);
      this._sceneManager.getControls()!.enablePan = false;
      this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
      return;
    }

    // Check if we're hovering an enode (pin or branching point)
    if (hoveredElement && hoveredElement.type === 'enode') {
      const enodeId = hoveredElement.id;
      const isBranchingPoint = !hoveredElement.object3D.userData.componentId;

      if (this.mode === 'idle') {
        // this is considered a double click/hold on branching point which starts drag
        if(isBranchingPoint && Date.now() - this.lastCancelledOpTs < 500) {
          this.startBPDrag(enodeId, this._sceneManager.cursorGroundPlanePosition());
          this._sceneManager.getControls()!.enablePan = false;
          this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
          return;
        }
        // normal case start wire creation
        this.startWireCreation(enodeId);
        this._sceneManager.getControls()!.enablePan = false;
        this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
      }
    } else if (this.mode === 'wire_creating') {
      // Clicked on empty space during wire creation - cancel
      this.cancelWireCreation();
    }
  }

  /**
   * Handle grid position move event during wire creation and dragging (T031, T062)
   * @param position - Current grid position
   */
  private handleGridPositionMove(position: THREE.Vector3): void {
    if (this.mode === 'wire_creating' && this.wireCreatingState) {
      // Update preview wire endpoint
      this._sceneManager.getWireVisualManager().updatePreviewWire(position);
    } else if (this.mode === 'wire_dragging') {
      // T062: Update wire drag target position
      this.updateWireDrag(position);
    } else if (this.mode === 'bp_dragging') {
      // T062: Update branching point drag position
      this.updateBPDrag(position);
    }
  }

  /**
   * Handle pointerup (T066)
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
        // finishing on empty space : create end branching point
        const worldPosition = this._sceneManager.cursorGroundPlanePosition();
        const newBpId = this.createStandaloneBranchingPoint(worldPosition);
        if (!newBpId) {
          this.cancelWireCreation();
          return;
        }
        this.completeWireCreation(newBpId);
        this._sceneManager.getSelectionManager()
            .selectOne('enode', newBpId, this._sceneManager
                .getObject3D('enode', newBpId)!);
        return;
      }
      if (hoveredElement && hoveredElement.type === 'enode') {
        const enodeId = hoveredElement.id;
        if(enodeId === this.wireCreatingState?.sourceEnodeId) {
          // clicking on the same enode : cancel the wire creation
          const now = Date.now();
          if (now - this.wireCreatingState?.ts < 500) {
            this.lastCancelledOpTs = now; // flag used to activate drag of branching point on next pointerdown
          }
          this.cancelWireCreation();
        }
        const wireId = this.completeWireCreation(enodeId);
        if(wireId){
          this._sceneManager.getSelectionManager()
              .selectOne('wire', wireId, this._sceneManager
                  .getObject3D('wire', wireId)!);
        }
      }
      if (hoveredElement && hoveredElement.type === 'wire') {
        // this interesting case create a new branching point on the wire and connect to it
        const targetWireId = hoveredElement.id;
        const gridPosition = this._sceneManager.cursorGroundPlanePosition();
        const newBpId= this.createBranchingPointOnWire(targetWireId, gridPosition);
        if (!newBpId) {
            this.cancelWireCreation();
            return;
        }
        const wireId = this.completeWireCreation(newBpId);
        if(wireId){
          this._sceneManager.getSelectionManager()
              .selectOne('wire', wireId, this._sceneManager
                  .getObject3D('wire', wireId)!);
        }
      }


    } else if (this.mode === 'wire_dragging') {
      // T066: Commit drag operation
      this.commitWireDrag();
    } else if (this.mode === 'bp_dragging') {
      // Commit branching point drag operation
      this.commitBPDrag();
    }

    // stop listening to gridPositionMove events
    this._sceneManager.off('gridPositionMove', this.handleGridPositionMove);
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

    // Create preview wire
    const previewWire = this._sceneManager.getWireVisualManager().createPreviewWire(sourcePosition);

    // Enter wire creating state
    this.mode = 'wire_creating';
    this.wireCreatingState = {
      sourceEnodeId,
      sourcePosition: sourcePosition.clone(),
      previewWire,
      ts: Date.now()
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
  private completeWireCreation(targetEnodeId: UUID): UUID | undefined {
    if (!this.wireCreatingState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    const sourceEnodeId = this.wireCreatingState.sourceEnodeId;

    // Saving to model, Validation checks are done in the process (T036, T037)
    try {
      // Create definitive wire visual (T038)
      const wire = this._sceneManager.addWire(sourceEnodeId, targetEnodeId)
      // Emit success event
      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        operationData: { wireId: wire.id, sourceEnodeId, targetEnodeId },
        changedData: { addedWires: [wire.id] },
      });
      // Reset state (end preview)
      this.cancelWireCreation();
      return wire.id;
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
   * Handle key down events (T033, T065)
   * @param event - Keyboard event
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.mode === 'wire_creating') {
        this.cancelWireCreation();
      } else if (this.mode === 'wire_dragging') {
        // T065: Cancel drag on Escape
        this.cancelWireDrag();
      } else if (this.mode === 'bp_dragging') {
        // T065: Cancel drag on Escape
        this.cancelBPDrag();
      }
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      // Handle deletion of wires or branching points
      const selection = this._sceneManager.getSelectionManager().getSelection();
      if (!selection) return;
      if (selection.kind === 'multi'){
        // TODO handle multi selection later
        return;
      }
      const monoSelection = selection as MonoSelectionData;

      if(monoSelection.type === 'wire'){
        const wireId = monoSelection.id;
        this._sceneManager.removeWire(wireId);
      }
      else if (monoSelection.type === 'enode' && monoSelection.data === 'BranchingPoint') {
        const enodeId = monoSelection.id;
        this._sceneManager.removeBranchingPoint(enodeId);
      }
    }
  }

  /**
   * Handle double-click to create/modify branching points (T042, T043, T049, T053)
   *
   * T042: Double-click vs single-click disambiguation is handled by the browser's
   * native dblclick event, which only fires after two clicks within ~300ms.
   * Single clicks on enodes create wires (handlePointerDown/Up), while double
   * clicks on wires create branching points (this method). The target type
   * (enode vs wire) naturally separates the two actions.
   *
   * T049: Double-click on empty space creates standalone branching point
   * T053: Double-click on branching point cycles its sourceType (priority over wire/empty)
   *
   * @param event - Mouse event
   */
  handleDblClick(event: MouseEvent): void {
    if (event.button !== 0) return;
    const hoveredElement = this._sceneManager.getHoveredElement();

    // Priority 1 - Check if we're hovering a wire => split it with new branchingPoint
    if (hoveredElement && hoveredElement.type === 'wire') {
      const wireId = hoveredElement.id;
      const gridPosition = this._sceneManager.cursorGroundPlanePosition();
      this.createBranchingPointOnWire(wireId, gridPosition);
    } else if (!hoveredElement) {
      // Priority 2 - Double-click on empty space - create standalone branching point
      const gridPosition = this._sceneManager.cursorGroundPlanePosition();
      this.createStandaloneBranchingPoint(gridPosition);
    }
  }

  /**
   * Create a branching point on an existing wire, splitting it (T044)
   * @param wireId - Wire to split
   * @param worldPosition - 3D position in world space
   */
  private createBranchingPointOnWire(wireId: UUID, worldPosition: THREE.Vector3): UUID | undefined {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    try {
      const result = this._sceneManager.splitWire(wireId, worldPosition);
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
      return result.branchingPoint.id;
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
  private createStandaloneBranchingPoint(worldPosition: THREE.Vector3): UUID | undefined {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;
    try {
      // Create branching point in circuit model (no sourceType initially)
      const branchingPoint = this._sceneManager.addBranchingPoint(worldPosition);
      return branchingPoint.id;
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        errorMessage: `Failed to create branching point: ${(error as Error).message}`,
      });
    }
    return;
  }

  /**
   * Get insertion index for a new intermediate point on a wire (T058)
   * @param wireId - Wire ID
   * @param worldPosition - Position where user clicked
   * @returns Index where new point should be inserted
   */
  private getInsertIndexForPosition(wireId: UUID, worldPosition: THREE.Vector3): number {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return 0;

    const wire = circuit.getWire(wireId);
    if (!wire) return 0;

    // Get wire path
    const wirePath = this._sceneManager.getWireVisualManager().computeWirePath(wire);
    const points = wirePath.points;

    // Find the segment closest to the click position
    let minDistance = Infinity;
    let insertIndex = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const segmentStart = points[i];
      const segmentEnd = points[i + 1];

      if (!segmentStart || !segmentEnd) continue;

      // Project click position onto segment
      const segmentDir = new THREE.Vector3().subVectors(segmentEnd, segmentStart);
      const segmentLength = segmentDir.length();

      if (segmentLength === 0) continue;

      segmentDir.normalize();
      const toClick = new THREE.Vector3().subVectors(worldPosition, segmentStart);
      const projection = toClick.dot(segmentDir);
      const clampedProjection = Math.max(0, Math.min(segmentLength, projection));

      const closestPoint = segmentStart.clone().addScaledVector(segmentDir, clampedProjection);
      const distance = worldPosition.distanceTo(closestPoint);

      if (distance < minDistance) {
        minDistance = distance;
        insertIndex = i;
      }
    }

    return insertIndex;
  }

  /**
   * Start wire dragging operation (T059)
   * @param wireId - Wire being dragged
   * @param targetType - Type of drag target
   * @param pointIndex - Index of intermediate point, or -1 for new/branching
   * @param worldPosition - Initial position
   */
  private startWireDrag(
      wireId: UUID,
      targetType: 'intermediate' | 'new_intermediate',
      pointIndex: number,
      worldPosition: THREE.Vector3
  ): void {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    const wire = circuit.getWire(wireId);
    if (!wire) return;

    // Store original positions for cancellation
    const originalPositions = wire.intermediatePositions.map(p => ({ ...p }));

    // If creating new intermediate point, insert it now
    if (targetType === 'new_intermediate') {
      const insertIndex = pointIndex;
      const gridPos = {
        x: Math.round(worldPosition.x),
        y: Math.round(-worldPosition.z)
      };
      originalPositions.splice(insertIndex, 0, gridPos);
      pointIndex = insertIndex;
    }

    this.mode = 'wire_dragging';
    this.wireDragState = {
      wireId,
      pointIndex,
      initialPosition: worldPosition.clone(),
      originalPositions,
      targetType
    };

    this._sceneManager.emit('toolOperationStarted', {
      toolType: this.type,
      operationData: { wireId, pointIndex, targetType }
    });
  }

  /**
   * Update drag target position during drag (T062)
   * @param worldPosition - Current cursor position in world space
   */
  private updateWireDrag(worldPosition: THREE.Vector3): void {
    if (!this.wireDragState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    // Apply grid snapping
    const gridPos = {
      x: Math.round(worldPosition.x),
      y: Math.round(-worldPosition.z)
    };

    // Dragging intermediate point
    const wire = circuit.getWire(this.wireDragState.wireId);
    if (!wire) return;

    // Update intermediate positions array
    const newPositions = [...this.wireDragState.originalPositions];
    newPositions[this.wireDragState.pointIndex] = gridPos;

    // T063: Real-time geometry update with temporary positions
    // Use circuit's update method to set intermediate positions
    const positionObjects = newPositions.map(p => new Position(p.x, p.y));
    circuit.updateWireIntermediatePositions(this.wireDragState.wireId, positionObjects);
    this._sceneManager.getWireVisualManager().updateWire(this.wireDragState.wireId);
  }

  /**
   * Commit drag operation and persist changes (T064)
   */
  private commitWireDrag(): void {
    if (!this.wireDragState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    try {
      // Intermediate point drag
      const wire = circuit.getWire(this.wireDragState.wireId);
      if (!wire) return;
      // T067: Check for merge/delete conditions
      const finalPositions = this.checkMergeDelete(wire);
      // Convert to Position objects
      const positionObjects = finalPositions.map(p => new Position(p.x, p.y));
      // Persist to model via CircuitEditionManager
      circuit.updateWireIntermediatePositions(this.wireDragState.wireId, positionObjects, true);
      // Update visual
      this._sceneManager.getWireVisualManager().refreshWireGeometry(this.wireDragState.wireId);
      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        operationData: {
          wireId: this.wireDragState.wireId,
          intermediatePositions: positionObjects
        },
        changedData: {
          updatedWires: [this.wireDragState.wireId]
        }
      });
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        errorMessage: `Failed to commit wire drag: ${(error as Error).message}`
      });
    }

    // Reset state
    this.mode = 'idle';
    this.wireDragState = null;
  }

  /**
   * Cancel wire drag operation and revert to original positions (T065)
   */
  private cancelWireDrag(): void {
    if (!this.wireDragState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    // Revert intermediate positions
    const positionObjects = this.wireDragState.originalPositions.map(p => new Position(p.x, p.y));
    circuit.updateWireIntermediatePositions(this.wireDragState.wireId, positionObjects, true);
    this._sceneManager.getWireVisualManager().updateWire(this.wireDragState.wireId);

    this._sceneManager.emit('toolOperationCancelled', {
      toolType: this.type
    });

    // Reset state
    this.mode = 'idle';
    this.wireDragState = null;
  }

  /**
   * Start branching point dragging operation (T059)
   * @param enodeId - UUID of the branching point being dragged
   * @param worldPosition - Initial position
   */
  private startBPDrag(
      enodeId: UUID,
      worldPosition: THREE.Vector3
  ): void {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    const branchingPoint = circuit.getENode(enodeId);
    if (!branchingPoint) return;

    this.mode = 'bp_dragging';
    const dragState: BPDragState = {
      enodeId,
      initialPosition: worldPosition.clone(),
    };
    this.bpDragState = dragState;

    this._sceneManager.emit('toolOperationStarted', {
      toolType: this.type,
      operationData: { enodeId }
    });
  }

  /**
   * Update branching point position during drag (T062)
   * @param worldPosition - Current cursor position in world space
   */
  private updateBPDrag(worldPosition: THREE.Vector3): void {
    if (!this.bpDragState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    // Apply grid snapping
    const gridPos = {
      x: Math.round(worldPosition.x),
      y: Math.round(-worldPosition.z)
    };

    // T068: Dragging branching point - move all connected wires
    const branchingPoint = circuit.getENode(this.bpDragState.enodeId);
    if (!branchingPoint) return;

    // Update branching point position via setPosition method
    const position = new Position(gridPos.x, gridPos.y);
    branchingPoint.setPosition(position);

    // Update branching point visual
    const enodeGroup = this._sceneManager.getEnodeObject3Ds().get(this.bpDragState.enodeId);
    if (enodeGroup) {
      enodeGroup.position.set(gridPos.x, 0, -gridPos.y);
    }
    // Update all wires connected to this branching point
    for (const connectedWireId of branchingPoint.wires) {
      this._sceneManager.getWireVisualManager().updateWire(connectedWireId);
    }
  }

  /**
   * Commit branching point drag operation and persist changes (SPEC CHANGE)
   */
  private commitBPDrag(): void {
    if (!this.bpDragState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    // Branching point drag position is already updated, but it's a good place to simplify wire path if necessary
    const branchingPoint = circuit.getENode(this.bpDragState.enodeId);
    if (branchingPoint) {
      // Update all wires connected to this branching point
      for (const connectedWireId of branchingPoint.wires) {
        circuit.simplifyWireIntermediatePositions(connectedWireId);
        this._sceneManager.getWireVisualManager().updateWire(connectedWireId);
      }

      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        operationData: {
          branchingPointId: this.bpDragState.enodeId,
          newPosition: branchingPoint.position
        },
        changedData: {}
      });
    }

    // Reset state
    this.mode = 'idle';
    this.bpDragState = null;
  }

  /**
   * Cancel branching point drag operation and revert to original positions (SPEC CHANGE)
   */
  private cancelBPDrag(): void {
    if (!this.bpDragState) return;

    const initialPosition = this.bpDragState.initialPosition;
    // Update bp visual
    const enodeGroup = this._sceneManager.getEnodeObject3Ds().get(this.bpDragState.enodeId);
    if (!enodeGroup) {
      return;
    }
    enodeGroup.position.set(initialPosition.x, 0, initialPosition.z);

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;
    const branchingPoint = circuit.getENode(this.bpDragState.enodeId);
    if (!branchingPoint) return;
    const gridPos = {
      x: Math.round(initialPosition.x),
      y: Math.round(-initialPosition.z)
    };
    branchingPoint.setPosition(gridPos as Position);

    // Update all connected wires
    for (const connectedWireId of branchingPoint.wires) {
      circuit.simplifyWireIntermediatePositions(connectedWireId);
      this._sceneManager.getWireVisualManager().updateWire(connectedWireId);
    }

    this._sceneManager.emit('toolOperationCancelled', {
      toolType: this.type
    });

    // Reset state
    this.mode = 'idle';
    this.bpDragState = null;
  }

  /**
   * Check if dragged point should be merged or deleted (T067)
   * @param wire - Wire being modified
   * @returns Final intermediate positions array
   */
  private checkMergeDelete(wire: any): { x: number; y: number }[] {
    if (!this.wireDragState) return wire.intermediatePositions;

    const positions = [...wire.intermediatePositions];
    // handle no intermediate positions
    if (positions.length === 0) return positions;
    const draggedIndex = this.wireDragState.pointIndex;
    const draggedPos = positions[draggedIndex];

    // Check if dragged point is very close to wire endpoints or other intermediate points
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return positions;

    const node1 = circuit.getENode(wire.node1);
    const node2 = circuit.getENode(wire.node2);
    if (!node1 || !node2) return positions;

    const endpoint1 = node1.getPosition(circuit);
    const endpoint2 = node2.getPosition(circuit);

    const threshold = 0.5; // Grid units

    // Check if close to endpoint1
    const distToEndpoint1 = Math.sqrt(
        Math.pow(draggedPos.x - endpoint1.x, 2) +
        Math.pow(draggedPos.y - endpoint1.y, 2)
    );
    if (distToEndpoint1 < threshold) {
      // Remove this point
      positions.splice(draggedIndex, 1);
      return positions;
    }

    // Check if close to endpoint2
    const distToEndpoint2 = Math.sqrt(
        Math.pow(draggedPos.x - endpoint2.x, 2) +
        Math.pow(draggedPos.y - endpoint2.y, 2)
    );
    if (distToEndpoint2 < threshold) {
      // Remove this point
      positions.splice(draggedIndex, 1);
      return positions;
    }

    // Check if close to other intermediate points
    for (let i = 0; i < positions.length; i++) {
      if (i === draggedIndex) continue;

      const otherPos = positions[i];
      const dist = Math.sqrt(
          Math.pow(draggedPos.x - otherPos.x, 2) +
          Math.pow(draggedPos.y - otherPos.y, 2)
      );

      if (dist < threshold) {
        // Merge: remove the dragged point
        positions.splice(draggedIndex, 1);
        return positions;
      }
    }

    return positions;
  }

  cancelOperation(): void {
    if (this.mode === 'wire_creating') {
      this.cancelWireCreation();
    } else if (this.mode === 'wire_dragging') {
      this.cancelWireDrag();
    } else if (this.mode === 'bp_dragging') {
      this.cancelBPDrag();
    }
  }
}
