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
import { ENodeSourceType } from '../../../core/types/ENodeSourceType';
import { Position } from '../../../core/types/Position';

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
  /** Index in intermediatePositions array, or -1 for branching point drag */
  pointIndex: number;
  initialPosition: THREE.Vector3;
  /** Original intermediate positions before drag (for cancel) */
  originalPositions: { x: number; y: number }[];
  /** Target type: 'intermediate' | 'branching_point' | 'new_intermediate' */
  targetType: 'intermediate' | 'branching_point' | 'new_intermediate';
  /** Branching point ID if dragging a branching point */
  branchingPointId?: UUID;
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
    } else if (this.mode === 'dragging') {
      this.cancelDrag();
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
    if (hoveredElement && hoveredElement.type === 'wire' && this.mode === 'idle') {
      const wireId = hoveredElement.id;
      const screenPos = new THREE.Vector2(event.clientX, event.clientY);
      const worldPosition = this._sceneManager.cursorGroundPlanePosition();

      // T061: Drag target resolution: branching point > existing intermediate > new intermediate

      // Priority 1: Check if clicking near a branching point on this wire
      const wire = circuit.getWire(wireId);
      if (wire) {
        const node1 = circuit.getENode(wire.node1);
        const node2 = circuit.getENode(wire.node2);

        // Check if either endpoint is a branching point and close to click
        if (node1 && node1.type === 'BranchingPoint') {
          const pos1 = node1.getPosition(circuit);
          const worldPos1 = new THREE.Vector3(pos1.x, 0, -pos1.y);
          const screenPos1 = this.worldToScreen(worldPos1);
          if (this.screenDistance(screenPos, screenPos1) < 10) {
            // Start dragging branching point
            this.startDrag(wireId, 'branching_point', -1, worldPos1, node1.id);
            this._sceneManager.getControls()!.enablePan = false;
            this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
            return;
          }
        }

        if (node2 && node2.type === 'BranchingPoint') {
          const pos2 = node2.getPosition(circuit);
          const worldPos2 = new THREE.Vector3(pos2.x, 0, -pos2.y);
          const screenPos2 = this.worldToScreen(worldPos2);
          if (this.screenDistance(screenPos, screenPos2) < 10) {
            // Start dragging branching point
            this.startDrag(wireId, 'branching_point', -1, worldPos2, node2.id);
            this._sceneManager.getControls()!.enablePan = false;
            this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
            return;
          }
        }
      }

      // Priority 2: Check for existing intermediate point
      const nearestPoint = this.findNearestIntermediatePoint(wireId, screenPos);
      if (nearestPoint && wire) {
        // Start dragging existing intermediate point
        const pos = wire.intermediatePositions[nearestPoint.pointIndex];
        if (pos) {
          const worldPos = new THREE.Vector3(pos.x, 0, -pos.y);
          this.startDrag(wireId, 'intermediate', nearestPoint.pointIndex, worldPos);
          this._sceneManager.getControls()!.enablePan = false;
          this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
          return;
        }
      }

      // Priority 3: Create new intermediate point at click position
      const insertIndex = this.getInsertIndexForPosition(wireId, worldPosition);
      this.startDrag(wireId, 'new_intermediate', insertIndex, worldPosition);
      this._sceneManager.getControls()!.enablePan = false;
      this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
      return;
    }

    // Check if we're hovering an enode (pin or branching point)
    if (hoveredElement && hoveredElement.type === 'enode') {
      const enodeId = hoveredElement.id;
      const enode = circuit.getENode(enodeId);

      if (this.mode === 'idle') {
        // Check if it's a branching point with wires - allow drag
        if (enode && enode.type === 'BranchingPoint' && enode.wires.size > 0) {
          // T068: Start dragging branching point
          const pos = enode.getPosition(circuit);
          const worldPos = new THREE.Vector3(pos.x, 0, -pos.y);
          // Use first connected wire for drag state (needed for interface)
          const firstWireId = Array.from(enode.wires)[0];
          if (firstWireId) {
            this.startDrag(firstWireId, 'branching_point', -1, worldPos, enodeId);
            this._sceneManager.getControls()!.enablePan = false;
            this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
          }
        } else {
          // First click - start wire creation
          console.log('Starting wire creation from enode:', enodeId);
          this.startWireCreation(enodeId);
          this._sceneManager.getControls()!.enablePan = false;
          this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);
        }
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
    } else if (this.mode === 'dragging') {
      // T062: Update drag target position
      this.updateDrag(position);
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
        // TODO handle that case (create branching point instead of cancelling)
        this.cancelWireCreation();
      }
      if (hoveredElement && hoveredElement.type === 'enode') {
        const enodeId = hoveredElement.id;
        this.completeWireCreation(enodeId);
      }
    } else if (this.mode === 'dragging') {
      // T066: Commit drag operation
      this.commitDrag();
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
   * Handle key down events (T033, T065)
   * @param event - Keyboard event
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.mode === 'wire_creating') {
        this.cancelWireCreation();
      } else if (this.mode === 'dragging') {
        // T065: Cancel drag on Escape
        this.cancelDrag();
      }
    }
  }

  handleClick(_worldPosition: THREE.Vector3): void {
    // Handled by handlePointerDown
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

    // T053: Priority 1 - Check if we're hovering a branching point enode
    if (hoveredElement && hoveredElement.type === 'enode') {
      const circuit = this._sceneManager.getCircuit();
      if (!circuit) return;

      const enode = circuit.getENode(hoveredElement.id);
      if (enode && enode.type === 'BranchingPoint') {
        // Cycle sourceType on branching point
        this.cycleBranchingPointSourceType(hoveredElement.id);
        return;
      }
    }

    // Priority 2 - Check if we're hovering a wire
    if (hoveredElement && hoveredElement.type === 'wire') {
      const wireId = hoveredElement.id;
      const gridPosition = this._sceneManager.cursorGroundPlanePosition();

      // Create branching point on the wire at the clicked position
      this.createBranchingPointOnWire(wireId, gridPosition);
    } else if (!hoveredElement) {
      // Priority 3 - Double-click on empty space - create standalone branching point
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

  /**
   * Cycle branching point sourceType: null → Voltage → Current → null (T052)
   * @param enodeId - Branching point ENode ID
   */
  private cycleBranchingPointSourceType(enodeId: UUID): void {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    const enode = circuit.getENode(enodeId);
    if (!enode || enode.type !== 'BranchingPoint') return;

    // Cycle through: null → Voltage → Current → null
    let newSourceType: ENodeSourceType | null;
    if (!enode.source) {
      newSourceType = ENodeSourceType.Voltage;
    } else if (enode.source === ENodeSourceType.Voltage) {
      newSourceType = ENodeSourceType.Current;
    } else {
      newSourceType = null;
    }

    try {
      // T054: Update circuit model via CircuitEditionManager
      this._sceneManager.getCircuitEditionManager()
        .saveENodeSourceTypeAction(enodeId, newSourceType);

      // T055: Update visual color
      const enodeGroup = this._sceneManager.getEnodeObject3Ds().get(enodeId);
      if (enodeGroup) {
        this._sceneManager.getBranchingPointVisualFactory()
          .updateSourceType(enodeGroup, newSourceType);
      }

      // Emit success event
      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        operationData: {
          enodeId,
          sourceType: newSourceType,
        },
        changedData: {},
      });
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        errorMessage: `Failed to update source type: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Convert 3D world position to 2D screen position (T056)
   * @param worldPosition - World position as Vector3
   * @returns Screen position as Vector2
   */
  private worldToScreen(worldPosition: THREE.Vector3): THREE.Vector2 {
    const camera = this._sceneManager.getCamera();
    const container = this._sceneManager.getContainer();

    const vector = worldPosition.clone();
    vector.project(camera);

    const widthHalf = container.clientWidth / 2;
    const heightHalf = container.clientHeight / 2;

    return new THREE.Vector2(
      (vector.x * widthHalf) + widthHalf,
      -(vector.y * heightHalf) + heightHalf
    );
  }

  /**
   * Calculate distance between two 2D screen positions (T056)
   * @param screenPos1 - First screen position
   * @param screenPos2 - Second screen position
   * @returns Distance in pixels
   */
  private screenDistance(screenPos1: THREE.Vector2, screenPos2: THREE.Vector2): number {
    return screenPos1.distanceTo(screenPos2);
  }

  /**
   * Find nearest intermediate point on a wire within proximity threshold (T057)
   * @param wireId - Wire ID to search
   * @param screenPos - Screen position to test
   * @param thresholdPx - Proximity threshold in pixels (default: 10)
   * @returns Object with pointIndex and distance, or null if none found
   */
  private findNearestIntermediatePoint(
    wireId: UUID,
    screenPos: THREE.Vector2,
    thresholdPx: number = 10
  ): { pointIndex: number; distance: number } | null {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return null;

    const wire = circuit.getWire(wireId);
    if (!wire) return null;

    let nearestIndex = -1;
    let nearestDistance = Infinity;

    // Check each intermediate position
    for (let i = 0; i < wire.intermediatePositions.length; i++) {
      const pos = wire.intermediatePositions[i];
      if (!pos) continue;

      const worldPos = new THREE.Vector3(pos.x, 0, -pos.y);
      const pointScreenPos = this.worldToScreen(worldPos);
      const distance = this.screenDistance(screenPos, pointScreenPos);

      if (distance < thresholdPx && distance < nearestDistance) {
        nearestIndex = i;
        nearestDistance = distance;
      }
    }

    if (nearestIndex >= 0) {
      return { pointIndex: nearestIndex, distance: nearestDistance };
    }

    return null;
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
   * Start dragging operation (T059)
   * @param wireId - Wire being dragged
   * @param targetType - Type of drag target
   * @param pointIndex - Index of intermediate point, or -1 for new/branching
   * @param worldPosition - Initial position
   * @param branchingPointId - Optional branching point ID if dragging one
   */
  private startDrag(
    wireId: UUID,
    targetType: 'intermediate' | 'branching_point' | 'new_intermediate',
    pointIndex: number,
    worldPosition: THREE.Vector3,
    branchingPointId?: UUID
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

    this.mode = 'dragging';
    const dragState: DragState = {
      wireId,
      pointIndex,
      initialPosition: worldPosition.clone(),
      originalPositions,
      targetType
    };
    if (branchingPointId) {
      dragState.branchingPointId = branchingPointId;
    }
    this.dragState = dragState;

    this._sceneManager.emit('toolOperationStarted', {
      toolType: this.type,
      operationData: { wireId, pointIndex, targetType }
    });
  }

  /**
   * Update drag target position during drag (T062)
   * @param worldPosition - Current cursor position in world space
   */
  private updateDrag(worldPosition: THREE.Vector3): void {
    if (!this.dragState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    // Apply grid snapping
    const gridPos = {
      x: Math.round(worldPosition.x),
      y: Math.round(-worldPosition.z)
    };

    if (this.dragState.targetType === 'branching_point' && this.dragState.branchingPointId) {
      // T068: Dragging branching point - move all connected wires
      const branchingPoint = circuit.getENode(this.dragState.branchingPointId);
      if (!branchingPoint) return;

      // Update branching point position via setPosition method
      const position = new Position(gridPos.x, gridPos.y);
      branchingPoint.setPosition(position);

      // Update branching point visual
      const enodeGroup = this._sceneManager.getEnodeObject3Ds().get(this.dragState.branchingPointId);
      if (enodeGroup) {
        enodeGroup.position.set(gridPos.x, 0, -gridPos.y);
      }

      // Update all wires connected to this branching point
      for (const connectedWireId of branchingPoint.wires) {
        this._sceneManager.getWireVisualManager().updateWire(connectedWireId);
      }
    } else {
      // Dragging intermediate point
      const wire = circuit.getWire(this.dragState.wireId);
      if (!wire) return;

      // Update intermediate positions array
      const newPositions = [...this.dragState.originalPositions];
      newPositions[this.dragState.pointIndex] = gridPos;

      // T063: Real-time geometry update with temporary positions
      // Use circuit's update method to set intermediate positions
      const positionObjects = newPositions.map(p => new Position(p.x, p.y));
      circuit.updateWireIntermediatePositions(this.dragState.wireId, positionObjects);
      this._sceneManager.getWireVisualManager().updateWire(this.dragState.wireId);
    }
  }

  /**
   * Commit drag operation and persist changes (T064)
   */
  private commitDrag(): void {
    if (!this.dragState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    try {
      if (this.dragState.targetType === 'branching_point' && this.dragState.branchingPointId) {
        // Branching point drag - position already updated, just emit events
        const branchingPoint = circuit.getENode(this.dragState.branchingPointId);
        if (branchingPoint) {
          this._sceneManager.emit('toolOperationCompleted', {
            toolType: this.type,
            operationData: {
              branchingPointId: this.dragState.branchingPointId,
              newPosition: branchingPoint.position
            },
            changedData: {}
          });
        }
      } else {
        // Intermediate point drag
        const wire = circuit.getWire(this.dragState.wireId);
        if (!wire) return;

        // T067: Check for merge/delete conditions
        const finalPositions = this.checkMergeDelete(wire);

        // Convert to Position objects
        const positionObjects = finalPositions.map(p => new Position(p.x, p.y));

        // Persist to model via CircuitEditionManager
        this._sceneManager.getCircuitEditionManager()
          .saveWireIntermediatePositions(this.dragState.wireId, positionObjects);

        // Update visual
        this._sceneManager.getWireVisualManager().refreshWireGeometry(this.dragState.wireId);

        this._sceneManager.emit('toolOperationCompleted', {
          toolType: this.type,
          operationData: {
            wireId: this.dragState.wireId,
            intermediatePositions: positionObjects
          },
          changedData: {
            updatedWires: [this.dragState.wireId]
          }
        });
      }
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        errorMessage: `Failed to commit drag: ${(error as Error).message}`
      });
    }

    // Reset state
    this.mode = 'idle';
    this.dragState = null;
  }

  /**
   * Cancel drag operation and revert to original positions (T065)
   */
  private cancelDrag(): void {
    if (!this.dragState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    if (this.dragState.targetType === 'branching_point' && this.dragState.branchingPointId) {
      // Revert branching point to original position
      const branchingPoint = circuit.getENode(this.dragState.branchingPointId);
      if (branchingPoint) {
        const gridPos = {
          x: Math.round(this.dragState.initialPosition.x),
          y: Math.round(-this.dragState.initialPosition.z)
        };
        const position = new Position(gridPos.x, gridPos.y);
        branchingPoint.setPosition(position);

        // Update visual
        const enodeGroup = this._sceneManager.getEnodeObject3Ds().get(this.dragState.branchingPointId);
        if (enodeGroup) {
          enodeGroup.position.set(gridPos.x, 0, -gridPos.y);
        }

        // Update all connected wires
        for (const connectedWireId of branchingPoint.wires) {
          this._sceneManager.getWireVisualManager().updateWire(connectedWireId);
        }
      }
    } else {
      // Revert intermediate positions
      const positionObjects = this.dragState.originalPositions.map(p => new Position(p.x, p.y));
      circuit.updateWireIntermediatePositions(this.dragState.wireId, positionObjects);
      this._sceneManager.getWireVisualManager().updateWire(this.dragState.wireId);
    }

    this._sceneManager.emit('toolOperationCancelled', {
      toolType: this.type
    });

    // Reset state
    this.mode = 'idle';
    this.dragState = null;
  }

  /**
   * Check if dragged point should be merged or deleted (T067)
   * @param wire - Wire being modified
   * @returns Final intermediate positions array
   */
  private checkMergeDelete(wire: any): { x: number; y: number }[] {
    if (!this.dragState) return wire.intermediatePositions;

    const positions = [...wire.intermediatePositions];
    const draggedIndex = this.dragState.pointIndex;
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
    } else if (this.mode === 'dragging') {
      this.cancelDrag();
    }
  }
}
