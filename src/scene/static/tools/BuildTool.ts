/**
 * Build Tool Implementation
 * @module scene/static/tools/BuildTool
 *
 * Unified tool for all circuit editing operations:
 * - Wire creation between endpoints
 * - Element positioning (components, branching points, wire points)
 * - Component rotation
 * - Element deletion
 * - Branching point creation
 *
 * Replaces: PositionTool, WireTool, DeleteTool, BranchingPointTool
 */

import * as THREE from 'three';
import type {
  IEditingTool,
  ToolType,
  CursorType,
  HoverableType,
  MonoSelectionData,
  HoveredElement,
} from '../../shared/types';
import type { CircuitSceneManager } from '../CircuitSceneManager';
import type { UUID } from '../../../core/types/Identifier';
import { ENodeSourceType } from '../../../core/types/ENodeSourceType';
import { ENodeType } from '../../../core/types/ENodeType';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import {
  gridToWorldRotation,
  nearestWorldSnapPosition,
  worldToGridPosition,
} from '../../shared/GeometryUtils';
import type { ComponentType } from '../../../core/types/ComponentType';
import type { Euler } from 'three';

/**
 * Build tool operating modes
 *
 * State transitions:
 *   idle → wire_creation (click enode)
 *   idle → component_drag (pointerdown on selected element)
 *   idle → wire_drag (click wire or intermediate point)
 *   idle → bp_drag (double-click+hold branching point)
 *   {any active mode} → idle (pointerup, Escape, or operation complete)
 */
type BuildToolMode = 'idle' | 'wire_creation' | 'wire_drag' | 'component_drag' | 'bp_drag';

/**
 * State during wire creation operation
 */
interface WireCreationState {
  /**
   * UUID of the source enode (pin or branching point)
   */
  sourceEnodeId: UUID;

  /**
   * World position of source enode (for preview line start)
   */
  sourcePosition: THREE.Vector3;

  /**
   * Preview wire object (Line2) rendered during creation
   * Follows cursor position until target selected
   */
  previewWire: Line2 | null;

  /**
   * Timestamp when operation started (for double-click disambiguation)
   */
  ts: number;
}

/**
 * State during wire intermediate point drag
 */
interface WireDragState {
  /**
   * UUID of wire being modified
   */
  wireId: UUID;

  /**
   * Index in intermediatePositions array
   * Or index where new point will be inserted
   */
  pointIndex: number;

  /**
   * Initial world position of drag start
   */
  initialPosition: THREE.Vector3;

  /**
   * Original intermediate positions (for cancel)
   * Snapshot of wire.intermediatePositions before drag
   */
  originalPositions: { x: number; y: number }[];

  /**
   * Target type determines behavior:
   * - 'intermediate': Dragging existing point
   * - 'new_intermediate': Creating and dragging new point
   */
  targetType: 'intermediate' | 'new_intermediate';
}

/**
 * State during component drag
 */
interface ComponentDragState {
  /**
   * UUID of component being dragged
   */
  componentId: UUID;

  /**
   * Initial world position (for cancel)
   */
  initialPosition: THREE.Vector3;
}

/**
 * State during branching point drag
 */
interface BPDragState {
  /**
   * UUID of branching point being dragged
   */
  enodeId: UUID;

  /**
   * Initial world position (for cancel)
   */
  initialPosition: THREE.Vector3;
}

interface LastCancelledOp {
  /**
   * Type of operation that was cancelled
   */
  mode: BuildToolMode;
  /**
   * Timestamp of cancellation
   */
  ts: number;
}

/**
 * Clipboard data for copy-paste operations
 */
interface ClipboardData {
  /**
   * Type of component to paste
   */
  componentType: ComponentType;
  /**
   * Rotation of component to paste
   */
  rotation: Euler;
}

/**
 * Returns the next sourceType in the cycle: null → Voltage → Current → null
 * @param current - Current source type
 * @returns Next source type in the cycle
 */
function getNextSourceType(
  current: ENodeSourceType | undefined
): ENodeSourceType | undefined {
  if (!current) return ENodeSourceType.Voltage;
  if (current === ENodeSourceType.Voltage) return ENodeSourceType.Current;
  return undefined; // Current → null
}

/**
 * Unified tool for building circuits
 * Implements all circuit editing functionality in a single tool
 */
export class BuildTool implements IEditingTool {
  readonly type: ToolType = 'build';

  private _sceneManager: CircuitSceneManager;

  // Tool state
  private mode: BuildToolMode = 'idle';
  private lastCancelledOp: LastCancelledOp | null = null;

  // Mode-specific state
  private wireCreationState: WireCreationState | null = null;
  private wireDragState: WireDragState | null = null;
  private componentDragState: ComponentDragState | null = null;
  private bpDragState: BPDragState | null = null;

  // Clipboard for copy-paste operations
  private clipboard: ClipboardData | null = null;

  /**
   * Construct a new BuildTool instance
   * @param sceneManager - The circuit scene manager instance
   */
  constructor(sceneManager: CircuitSceneManager) {
    this._sceneManager = sceneManager;

    // Bind event handlers for stable references
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleGridPositionMove = this.handleGridPositionMove.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleDblClick = this.handleDblClick.bind(this);
  }

  /**
   * Activate build tool and set up event listeners
   * Resets all tool state and attaches DOM event handlers
   */
  onActivate(): void {
    // Reset all state
    this.mode = 'idle';
    this.wireCreationState = null;
    this.wireDragState = null;
    this.componentDragState = null;
    this.bpDragState = null;
    this.lastCancelledOp = null;

    // Set up event listeners
    const container = this._sceneManager.getContainer();

    container.addEventListener('pointerdown', this.handlePointerDown);
    container.addEventListener('pointerup', this.handlePointerUp);
    container.addEventListener('dblclick', this.handleDblClick);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Deactivate build tool and clean up event listeners
   * Cancels any active operations and removes all event handlers
   */
  onDeactivate(): void {
    // Security : Cancel any active operations
    this.cancelOperation();

    const container = this._sceneManager.getContainer();
    // Remove event listeners
    this._sceneManager.off('gridPositionMove', this.handleGridPositionMove);
    container.removeEventListener('pointerdown', this.handlePointerDown);
    container.removeEventListener('pointerup', this.handlePointerUp);
    container.removeEventListener('dblclick', this.handleDblClick);
    window.removeEventListener('keydown', this.handleKeyDown);

    // Reset all state
    this.mode = 'idle';
    this.wireCreationState = null;
    this.wireDragState = null;
    this.componentDragState = null;
    this.bpDragState = null;
    this.lastCancelledOp = null;

    // Safety: re-enable camera controls
    const controls = this._sceneManager.getControls();
    if (controls) {
      controls.enablePan = true;
    }
  }

  /**
   * Cancel current ongoing operation : can be called from outside if needed
   */
  cancelOperation(): void {
    if (this.mode === 'wire_creation') {
      this.cancelWireCreation();
    } else if (this.mode === 'wire_drag') {
      this.cancelWireDrag();
    } else if (this.mode === 'bp_drag') {
      this.cancelBPDrag();
    } else if (this.mode === 'component_drag') {
      this.cancelComponentDrag();
    }
  }

  /**
   * Get the current cursor type for this tool
   * Returns cursor based on current mode and hover state
   */
  getCursorType(): CursorType {
    const hoveredElement = this._sceneManager.getHoveredElement();

    // During wire creation
    if (this.mode === 'wire_creation') {
      if (!this.isValidWireTarget(hoveredElement)) {
        return 'not-allowed';
      }
      return 'crosshair';
    }

    // During drag operations
    if (this.mode === 'component_drag' || this.mode === 'wire_drag' || this.mode === 'bp_drag') {
      return 'grabbing';
    }

    // Hover states (idle mode)
    if (hoveredElement) {
      // Can start wire from enode
      if (hoveredElement.type === 'enode') {
        return 'pointer';
      }

      // Can drag selected element
      const selection = this._sceneManager.getSelectionManager().getSelection();
      if (selection && selection.kind === 'mono' && hoveredElement.id === selection.id) {
        return 'grab';
      }

      // Can interact with wire or component
      if (hoveredElement.type === 'wire' || hoveredElement.type === 'component') {
        return 'pointer';
      }
    }

    return 'default';
  }

  /**
   * Get preview objects to render in the scene
   * Returns array of preview objects currently visible
   */
  getPreviewObjects(): THREE.Object3D[] {
    const previews: THREE.Object3D[] = [];

    // Wire creation preview
    if (this.mode === 'wire_creation' && this.wireCreationState?.previewWire) {
      previews.push(this.wireCreationState.previewWire);
    }

    return previews;
  }

  // ========================================================================
  // Event Handlers
  // ========================================================================

  /**
   * Handle pointer down event
   * Routes to appropriate operation based on hover target and state
   */
  private handlePointerDown(event: MouseEvent): void {
    if (event.button !== 0) return; // Only handle left click
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;
    const hoveredElement = this._sceneManager.getHoveredElement();

    if (this.mode === 'idle') {
      // Handle Ctrl+click for sourceType cycling
      if ((event.ctrlKey || event.metaKey) && hoveredElement && hoveredElement.type === 'enode') {
        this.cycleEnodeSourceType(hoveredElement.id, hoveredElement.object3D);
        return; // Early exit - don't start wire creation
      }

      if (hoveredElement && hoveredElement.type === 'enode') {
        const enodeId = hoveredElement.id;
        // special priority 0 : if a wire creation was just cancelled, and we click again on the same enode within 500ms, we start dragging the branching point instead of starting a new wire creation
        const isBranchingPoint = !hoveredElement.object3D.userData.componentId;
        if (
          isBranchingPoint &&
          this.lastCancelledOp &&
          this.lastCancelledOp.mode === 'wire_creation' &&
          Date.now() - this.lastCancelledOp.ts < 500
        ) {
          this.startBPDrag(enodeId, this._sceneManager.cursorGroundPlanePosition());
          return;
        }

        // Priority 1 : Check if we're hovering an enode and start wire creation
        this.startWireCreation(enodeId);
        return;
      }
      // Priority 2 : Check if we're hovering a component
      if (hoveredElement && hoveredElement.type === 'component') {
        const componentId = hoveredElement.id;
        this.startComponentDrag(componentId, this._sceneManager.cursorGroundPlanePosition());
        return;
      }
      // Priority 3 : Check if we're hovering a wire
      if (hoveredElement && hoveredElement.type === 'wire') {
        const wireId = hoveredElement.id;
        const screenPos = new THREE.Vector2(event.clientX, event.clientY);
        const worldPosition = this._sceneManager.cursorGroundPlanePosition();

        // Drag target resolution: branching point > existing intermediate > new intermediate
        const wire = circuit.getWire(wireId);
        if (!wire) return;

        // Priority 3-1: Check for existing intermediate point
        const nearestPoint = this._sceneManager
          .getWireVisualManager()
          .findNearestIntermediatePoint(wireId, screenPos);
        if (nearestPoint) {
          // Start dragging existing intermediate point
          const pos = wire.intermediatePositions[nearestPoint.pointIndex];
          if (pos) {
            const worldPos = new THREE.Vector3(pos.x, 0, -pos.y);
            this.startWireDrag(wireId, 'intermediate', nearestPoint.pointIndex, worldPos);
            return;
          }
        }
        // Priority 3-2: Create new intermediate point at click position
        const insertIndex = this._sceneManager
          .getWireVisualManager()
          .getInsertIndexForPosition(wireId, worldPosition);
        this.startWireDrag(wireId, 'new_intermediate', insertIndex, worldPosition);
        return;
      }
    } else if (this.mode === 'wire_creation') {
      if (!hoveredElement) {
        // Clicked on empty space during wire creation - cancel ?
        // TODO: isn't it the spec to create a branching point here? or handled elsewhere and this branch is unnecessary ?
        this.cancelWireCreation();
        return;
      }
    }
  }

  /**
   * Handle pointer up event
   *
   * Ends current operation, commits final positions to the circuit model,
   * and re-enables camera controls.
   *
   * Completes current operation based on mode
   */
  private handlePointerUp(event: MouseEvent): void {
    if (event.button !== 0) return; // Only handle left click

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;
    const hoveredElement = this._sceneManager.getHoveredElement();

    if (this.mode === 'wire_creation') {
      // specific case : clicking on source enode cancels the wire creation but may lead to dragging branching point
      if (
        hoveredElement &&
        hoveredElement.type === 'enode' &&
        hoveredElement.id === this.wireCreationState?.sourceEnodeId
      ) {
        this.cancelWireCreation();
      } else {
        this.completeWireCreation(hoveredElement);
      }
    } else if (this.mode === 'wire_drag') {
      // Commit wire drag operation
      this.completeWireDrag();
    } else if (this.mode === 'bp_drag') {
      // Commit branching point drag operation
      this.completeBPDrag();
    } else if (this.mode === 'component_drag') {
      // Commit component drag operation
      this.completeComponentDrag();
    }

    // Finally stop listening to gridPositionMove events
    this._sceneManager.off('gridPositionMove', this.handleGridPositionMove);
    // and unlock MapControl change of camera
    this._sceneManager.getControls()!.enablePan = true;
  }

  /**
   * Handle grid position move event according to ongoing mode
   * Updates preview or drag position during active operations
   */
  private handleGridPositionMove(position: THREE.Vector3): void {
    switch (this.mode) {
      case 'wire_creation':
        this.updateWireCreation(position);
        break;
      case 'wire_drag':
        this.updateWireDrag(position);
        break;
      case 'component_drag':
        this.updateComponentDrag(position);
        break;
      case 'bp_drag':
        this.updateBPDrag(position);
        break;
      default:
        break;
    }
  }

  /**
   * Handle keyboard events
   * Supports Escape (cancel), Delete/Backspace (delete), R (rotate), Ctrl+C (copy), Ctrl+V (paste)
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // cancel ongoing action on Escape
    if (event.key === 'Escape') {
      if (this.mode === 'wire_creation') {
        this.cancelWireCreation();
      } else if (this.mode === 'wire_drag') {
        this.cancelWireDrag();
      } else if (this.mode === 'bp_drag') {
        this.cancelBPDrag();
      } else if (this.mode === 'component_drag') {
        this.cancelComponentDrag();
      }
      return;
    }

    // Handle copy (CTRL+C) - copy selected component type and rotation
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      const selection = this._sceneManager.getSelectionManager().getSelection();
      if (selection && selection.kind === 'mono' && selection.type === 'component') {
        this.copyComponent(selection.id);
      }
      return;
    }

    // Handle paste (CTRL+V) - paste component at hovered position
    if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
      if (this.clipboard) {
        this.pasteComponent();
      }
      return;
    }

    // actions on selection
    const selection = this._sceneManager.getSelectionManager().getSelection();
    if (!selection) return;
    if (selection.kind === 'multi') return; //this tool only handles mono selection for deletion
    const monoSelection = selection as MonoSelectionData;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Handle deletion of components, wires, branching points
      if (monoSelection.type === 'component') {
        const componentId = monoSelection.id;
        this._sceneManager.removeComponent(componentId);
      } else if (monoSelection.type === 'wire') {
        const wireId = monoSelection.id;
        this._sceneManager.removeWire(wireId);
      } else if (monoSelection.type === 'enode' && monoSelection.data === 'BranchingPoint') {
        const enodeId = monoSelection.id;
        this._sceneManager.removeBranchingPoint(enodeId);
        // TODO: may fail if the resulting merged wire is a duplicate - see how to handle this case
      }
    } else if (event.key === 'r' || event.key === 'R') {
      // Handle R key to rotate selected component
      if (monoSelection.type === 'component') {
        const componentId = monoSelection.id;
        this.rotateComponent(componentId);
      }
    }
  }

  /**
   * Handle double-click events
   * Routes to rotation (component) or branching point creation (wire/empty)
   */
  private handleDblClick(event: MouseEvent): void {
    if (event.button !== 0) return; // Only handle left click

    const hoveredElement = this._sceneManager.getHoveredElement();

    // Priority 1 - Check if we're hovering a wire => split it with new branchingPoint
    if (hoveredElement && hoveredElement.type === 'wire') {
      const wireId = hoveredElement.id;
      const gridPosition = this._sceneManager.cursorGroundPlanePosition();
      const enodeId = this.createBranchingPointOnWire(wireId, gridPosition);
      if (enodeId) {
        this._sceneManager.getSelectionManager().selectOne('enode', enodeId, { componentId: null });
      }
    }
    // Priority 2 - Check if we're hovering a component => rotate it
    else if (hoveredElement && hoveredElement.type === 'component') {
      const componentId = hoveredElement.id;
      this.rotateComponent(componentId);
    } else if (!hoveredElement) {
      // Priority 3 - Double-click on empty space - create standalone branching point
      const gridPosition = this._sceneManager.cursorGroundPlanePosition();
      const enodeId = this.createStandaloneBranchingPoint(gridPosition);
      if (enodeId) {
        this._sceneManager.getSelectionManager().selectOne('enode', enodeId, { componentId: null });
      }
    }
  }

  /**
   * Operations lifecycle methods
   * (start, update, cancel, complete)
   */

  /**
   * Start wire creation from source enode
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
    if (enodeGroup.userData.componentId) {
      // since pins (enodes of components) are children of the component object3D,
      // we need to get the world position
      enodeGroup.getWorldPosition(sourcePosition);
    }

    // Create preview wire
    const previewWire = this._sceneManager.getWireVisualManager().createPreviewWire(sourcePosition);

    // Enter wire creating state
    this.mode = 'wire_creation';
    this.wireCreationState = {
      sourceEnodeId,
      sourcePosition: sourcePosition.clone(),
      previewWire,
      ts: Date.now(),
    };

    this._sceneManager.getControls()!.enablePan = false;
    this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);

    this._sceneManager.emit('toolOperationStarted', {
      toolType: this.type,
      mode: this.mode,
      operationData: { sourceEnodeId },
    });
  }

  /**
   * Update wire creation preview with new target position
   * @param position
   * @private
   */
  private updateWireCreation(position: THREE.Vector3): void {
    this._sceneManager.getWireVisualManager().updatePreviewWire(position);
  }

  /**
   * Cancel wire creation and reset state
   */
  private cancelWireCreation(emit: boolean = true): void {
    if (this.mode !== 'wire_creation') return;
    this._sceneManager.getWireVisualManager().removePreviewWire();
    if (emit) {
      this._sceneManager.emit('toolOperationCancelled', {
        toolType: this.type,
        mode: this.mode,
      });
    }
    this.lastCancelledOp = {
      mode: this.mode,
      ts: Date.now(),
    };
    // Reset state
    this.mode = 'idle';
    this.wireCreationState = null;
  }

  /**
   * Complete wire creation between source enode and :
   * - existing target enode if it is hovered
   * - new branching point on wire if target is a wire
   * - new branching point if target is null
   * @param hoveredElement - Currently hovered element at wire creation end
   */
  private completeWireCreation(hoveredElement: HoveredElement | null): UUID | undefined {
    if (this.mode !== 'wire_creation' || !this.wireCreationState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;
    const sourceEnodeId = this.wireCreationState.sourceEnodeId;

    // Saving to model, Validation checks are done in the process
    try {
      let targetEnodeId = null;
      let hasSelected = false;
      if (!hoveredElement) {
        // finishing on empty space : create end branching point
        const worldPosition = this._sceneManager.cursorGroundPlanePosition();
        targetEnodeId = this.createStandaloneBranchingPoint(worldPosition);
        if (targetEnodeId) {
          this._sceneManager
            .getSelectionManager()
            .selectOne('enode', targetEnodeId, { componentId: null });
          hasSelected = true;
        }
      } else if (hoveredElement.type === 'wire') {
        // this interesting case create a new branching point on the wire and connect to it
        const targetWireId = hoveredElement.id;
        const gridPosition = this._sceneManager.cursorGroundPlanePosition();
        targetEnodeId = this.createBranchingPointOnWire(targetWireId, gridPosition);
      } else if (hoveredElement.type === 'enode') {
        targetEnodeId = hoveredElement.id;
      }

      if (!targetEnodeId) {
        throw new Error('Invalid target for wire creation');
      }

      // Create definitive wire visual
      const wire = this._sceneManager.addWire(sourceEnodeId, targetEnodeId);
      // select the new wire if nothing was selected before
      if (!hasSelected) {
        this._sceneManager.getSelectionManager().selectOne('wire', wire.id);
      }
      // Emit success event
      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        mode: this.mode,
        operationData: { wireId: wire.id, sourceEnodeId, targetEnodeId },
        changedData: { addedWires: [wire.id] },
      });
      // Reset state (end preview)
      this.cancelWireCreation();
      return wire.id;
    } catch (error) {
      this.cancelWireCreation();
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        mode: this.mode,
        errorMessage: error instanceof Error ? error.message : 'Unknown error during wire creation',
      });
    }
    // Reset state
    this.mode = 'idle';
    this.wireCreationState = null;
    return;
  }

  /**
   * Start wire dragging operation
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
    const originalPositions = wire.intermediatePositions.map((p) => ({ ...p }));

    // If creating new intermediate point, insert it now
    if (targetType === 'new_intermediate') {
      const insertIndex = pointIndex;
      const gridPos = worldToGridPosition(worldPosition);
      originalPositions.splice(insertIndex, 0, gridPos);
      pointIndex = insertIndex;
    }

    this.mode = 'wire_drag';
    this.wireDragState = {
      wireId,
      pointIndex,
      initialPosition: worldPosition.clone(),
      originalPositions,
      targetType,
    };

    // block MapControls panning and register for gridPositionMove events
    this._sceneManager.getControls()!.enablePan = false;
    this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);

    this._sceneManager.emit('toolOperationStarted', {
      toolType: this.type,
      mode: this.mode,
      operationData: { wireId, pointIndex, targetType },
    });
  }

  /**
   * Update drag target position during drag
   * @param worldPosition - Current cursor position in world space
   */
  private updateWireDrag(worldPosition: THREE.Vector3): void {
    if (this.mode !== 'wire_drag' || !this.wireDragState) return;

    // Update intermediate positions array
    const gridPos = worldToGridPosition(worldPosition);
    const newPositions = [...this.wireDragState.originalPositions];
    newPositions[this.wireDragState.pointIndex] = gridPos;

    // T063: Real-time geometry update with temporary positions
    // Use circuit's update method to set intermediate positions
    this._sceneManager
      .getCircuitEditionManager()
      .saveEditWirePositions(this.wireDragState.wireId, newPositions);
    this._sceneManager.getWireVisualManager().updateWireById(this.wireDragState.wireId);
  }

  /**
   * Cancel wire drag operation and revert to original positions
   */
  private cancelWireDrag(emit: boolean = true): void {
    if (this.mode !== 'wire_drag' || !this.wireDragState) return;

    // Revert intermediate positions
    this._sceneManager
      .getCircuitEditionManager()
      .saveEditWirePositions(this.wireDragState.wireId, this.wireDragState.originalPositions, true);
    this._sceneManager.getWireVisualManager().updateWireById(this.wireDragState.wireId);

    if (emit) {
      this._sceneManager.emit('toolOperationCancelled', {
        toolType: this.type,
        mode: this.mode,
      });
    }
    this.lastCancelledOp = {
      mode: this.mode,
      ts: Date.now(),
    };
    // Reset state
    this.mode = 'idle';
    this.wireDragState = null;
  }

  /**
   * Commit drag operation and persist changes
   */
  private completeWireDrag(): void {
    if (this.mode !== 'wire_drag' || !this.wireDragState) return;

    const wireDragState = this.wireDragState;
    // Reset state
    this.mode = 'idle';
    this.wireDragState = null;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;
    const wireId = wireDragState.wireId;
    const wire = circuit.getWire(wireId);
    if (!wire) return;

    try {
      //Check for merge/delete conditions
      const finalPositions = this.checkMergeDelete(wire);
      // Persist to model via CircuitEditionManager
      this._sceneManager
        .getCircuitEditionManager()
        .saveEditWirePositions(wireDragState.wireId, finalPositions, true);

      const hoveredElement = this._sceneManager.getHoveredElement();
      // special case 1 : if wire was dragged to enode, we need to split it and connect to it
      if (hoveredElement && hoveredElement.type === 'enode') {
        const targetEnodeId = hoveredElement.id;
        const worldPosition = this._sceneManager.cursorGroundPlanePosition();
        const result = this._sceneManager.splitWire(wireId, worldPosition, targetEnodeId);
        this._sceneManager.emit('toolOperationCompleted', {
          toolType: this.type,
          mode: this.mode,
          operationData: {
            wireId: wireId,
            intermediatePositions: finalPositions,
            targetEnodeId: targetEnodeId,
          },
          changedData: {
            removedWire: wireId,
            enodeId: result.branchingPoint.id,
            addedWires: result.wires.map((w) => w.id),
          },
        });
        this._sceneManager
          .getSelectionManager()
          .selectOne('enode', targetEnodeId, { componentId: null });
        return;
      }
      // special case 2 : if wire was dragged to ANOTHER wire, we split that wire with a branching point,
      // then split our dragged wire to connect to that branching point
      if (hoveredElement && hoveredElement.type === 'wire' && hoveredElement.id !== wireId) {
        const targetWireId = hoveredElement.id;
        const worldPosition = this._sceneManager.cursorGroundPlanePosition();
        const targetEnodeId = this.createBranchingPointOnWire(targetWireId, worldPosition);
        const result = this._sceneManager.splitWire(wireId, worldPosition, targetEnodeId);
        this._sceneManager.emit('toolOperationCompleted', {
          toolType: this.type,
          mode: this.mode,
          operationData: {
            wireId: wireId,
            intermediatePositions: finalPositions,
            targetWireId: targetWireId,
          },
          changedData: {
            removedWire: wireId,
            enodeId: result.branchingPoint.id,
            addedWires: result.wires.map((w) => w.id),
          },
        });
        if (targetEnodeId) {
          this._sceneManager
            .getSelectionManager()
            .selectOne('enode', targetEnodeId, { componentId: null });
        }
        return;
      }

      // Default case : Update visual
      this._sceneManager.getWireVisualManager().updateWireById(wireDragState.wireId);
      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        mode: this.mode,
        operationData: {
          wireId: wireId,
          intermediatePositions: finalPositions,
        },
        changedData: {
          updatedWires: [wireId],
        },
      });
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        mode: this.mode,
        errorMessage: `Failed to commit wire drag: ${(error as Error).message}`,
      });
      this.cancelWireDrag(false);
    }
  }

  /**
   * Start component dragging operation
   * @param componentId - UUID of the component being dragged
   * @param worldPosition - Initial position
   */
  private startComponentDrag(componentId: UUID, worldPosition: THREE.Vector3): void {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    const component = circuit.getComponent(componentId);
    if (!component) return;

    this.mode = 'component_drag';
    this.componentDragState = {
      componentId,
      initialPosition: worldPosition.clone(),
    };

    // block MapControls panning and register for gridPositionMove events
    this._sceneManager.getControls()!.enablePan = false;
    this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);

    this._sceneManager.emit('toolOperationStarted', {
      toolType: this.type,
      mode: this.mode,
      operationData: { componentId },
    });
  }

  /**
   * Update component visual position during drag
   * @param worldPosition - Current cursor position in world space
   */
  private updateComponentDrag(worldPosition: THREE.Vector3): void {
    if (this.mode !== 'component_drag' || !this.componentDragState) return;

    const object = this._sceneManager.getObject3D('component', this.componentDragState.componentId);
    if (!object) return;

    const newPosition = nearestWorldSnapPosition(worldPosition);
    object.position.copy(newPosition);

    // moving wires connected to component in real-time during drag
    this._sceneManager
      .getWireVisualManager()
      .updateWiresForComponent(this.componentDragState.componentId);
  }

  /**
   * Cancel component drag operation and revert to original positions
   */
  private cancelComponentDrag(emit: boolean = true): void {
    if (this.mode !== 'component_drag' || !this.componentDragState) return;

    // restore original component visual
    const object = this._sceneManager.getObject3D('component', this.componentDragState.componentId);
    if (!object) return;

    object.position.copy(this.componentDragState.initialPosition);
    // restore wires connected to component
    this._sceneManager
      .getWireVisualManager()
      .updateWiresForComponent(this.componentDragState.componentId);

    if (emit) {
      this._sceneManager.emit('toolOperationCancelled', {
        toolType: this.type,
        mode: 'component_drag',
      });
    }
    this.lastCancelledOp = {
      mode: this.mode,
      ts: Date.now(),
    };
    // Reset state
    this.mode = 'idle';
    this.componentDragState = null;
  }

  /**
   * complete component drag operation and persist changes
   */
  private completeComponentDrag(): void {
    if (this.mode !== 'component_drag' || !this.componentDragState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    const componentId = this.componentDragState.componentId;
    const object = this._sceneManager.getObject3D('component', componentId);
    if (!object) return;

    try {
      const component = this._sceneManager
        .getCircuitEditionManager()
        .saveEditComponent(componentId, object, true);
      for (const connectedWire of circuit.getWiresByComponent(componentId)) {
        this._sceneManager.getCircuitEditionManager().saveSimplifyWirePositions(connectedWire.id);
        this._sceneManager.getWireVisualManager().updateWireById(connectedWire.id);
      }
      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        mode: 'component_drag',
        operationData: {
          componentId: componentId,
          newPosition: component.position,
        },
        changedData: {},
      });
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        mode: this.mode,
        errorMessage: `Failed to commit component drag: ${(error as Error).message}`,
      });
      this.cancelComponentDrag(false);
    }

    // Reset state
    this.mode = 'idle';
    this.componentDragState = null;
  }

  /**
   * Start branching point dragging operation
   * @param enodeId - UUID of the branching point being dragged
   * @param worldPosition - Initial position
   */
  private startBPDrag(enodeId: UUID, worldPosition: THREE.Vector3): void {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    const branchingPoint = circuit.getENode(enodeId);
    if (!branchingPoint) return;

    this.mode = 'bp_drag';
    this.bpDragState = {
      enodeId,
      initialPosition: worldPosition.clone(),
    };
    // block MapControls panning and register for gridPositionMove events
    this._sceneManager.getControls()!.enablePan = false;
    this._sceneManager.on('gridPositionMove', this.handleGridPositionMove);

    this._sceneManager.emit('toolOperationStarted', {
      toolType: this.type,
      mode: this.mode,
      operationData: { enodeId },
    });
  }

  /**
   * Update branching point position during drag
   * @param worldPosition - Current cursor position in world space
   */
  private updateBPDrag(worldPosition: THREE.Vector3): void {
    if (this.mode !== 'bp_drag' || !this.bpDragState) return;

    const visual = this._sceneManager.getEnodeObject3Ds().get(this.bpDragState.enodeId);
    if (!visual) return;

    visual.position.copy(nearestWorldSnapPosition(worldPosition));
    const enode = this._sceneManager.getCircuitEditionManager().saveEditBranchingPoint(visual);

    // Update all wires connected to this branching point
    for (const connectedWireId of enode.wires) {
      this._sceneManager.getWireVisualManager().updateWireById(connectedWireId);
    }
  }

  /**
   * Cancel branching point drag operation and revert to original positions
   */
  private cancelBPDrag(emit: boolean = true): void {
    if (this.mode !== 'bp_drag' || !this.bpDragState) return;

    const initialPosition = this.bpDragState.initialPosition;
    // Update bp visual
    const visual = this._sceneManager.getEnodeObject3Ds().get(this.bpDragState.enodeId);
    if (!visual) return;
    visual.position.copy(initialPosition);

    const enode = this._sceneManager.getCircuitEditionManager().saveEditBranchingPoint(visual);

    // restore all wires connected to this branching point
    for (const connectedWireId of enode.wires) {
      this._sceneManager.getWireVisualManager().updateWireById(connectedWireId);
    }

    if (emit) {
      this._sceneManager.emit('toolOperationCancelled', {
        toolType: this.type,
        mode: 'bp_drag',
      });
    }
    this.lastCancelledOp = {
      mode: this.mode,
      ts: Date.now(),
    };
    // Reset state
    this.mode = 'idle';
    this.bpDragState = null;
  }

  /**
   * Commit branching point drag operation and persist changes
   */
  private completeBPDrag(): void {
    if (this.mode !== 'bp_drag' || !this.bpDragState) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    try {
      const branchingPoint = circuit.getENode(this.bpDragState.enodeId);
      if (!branchingPoint) {
        throw new Error(`Branching point ${this.bpDragState.enodeId} not found`);
      }
      // Branching point drag position is already updated, but it's a good place to simplify wire path if necessary
      for (const connectedWireId of branchingPoint.wires) {
        this._sceneManager.getCircuitEditionManager().saveSimplifyWirePositions(connectedWireId);
        this._sceneManager.getWireVisualManager().updateWireById(connectedWireId);
      }
      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        mode: 'bp_drag',
        operationData: {
          branchingPointId: this.bpDragState.enodeId,
          newPosition: branchingPoint.position,
        },
        changedData: {},
      });
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        mode: this.mode,
        errorMessage: `Failed to commit branching point drag: ${(error as Error).message}`,
      });
      this.cancelBPDrag(false);
      return;
    }
    // Reset state
    this.mode = 'idle';
    this.bpDragState = null;
  }

  /**
   * private helpers
   */

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
      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        mode: 'bp_creation',
        operationData: {
          worldPosition,
        },
        changedData: {
          enodeId: branchingPoint.id,
        },
      });
      return branchingPoint.id;
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        mode: 'bp_creation',
        errorMessage: `Failed to create branching point: ${(error as Error).message}`,
      });
    }
    return;
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
        mode: 'bp_creation',
        operationData: {
          wireId,
          worldPosition,
        },
        changedData: {
          removedWire: wireId,
          enodeId: result.branchingPoint.id,
          addedWires: result.wires.map((w) => w.id),
        },
      });
      return result.branchingPoint.id;
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        mode: 'bp_creation',
        errorMessage: `Failed to create branching point: ${(error as Error).message}`,
      });
      return;
    }
  }

  /**
   * Check if hoveredElement is a valid wire target during wire creation
   * @param hoveredElement - Current hovered element or null
   * @returns True if target is valid for wire endpoint
   */
  private isValidWireTarget(hoveredElement: { type: HoverableType; id: UUID } | null): boolean {
    if (!this.wireCreationState) return false;

    if (!hoveredElement) return true; // Empty space is valid (creates BP)

    // Enode is valid unless it's the source
    if (hoveredElement.type === 'enode') {
      return hoveredElement.id !== this.wireCreationState.sourceEnodeId;
    }

    // Wire is valid (creates BP on wire)
    if (hoveredElement.type === 'wire') {
      return true;
    }

    // Component is not a valid target
    return false;
  }

  /**
   * Rotate a component 90° clockwise
   *
   * Updates both the circuit model and visual representation.
   * Emits componentRotated event to notify listeners.
   * Only works on selected components (not wires or enodes).
   */
  private rotateComponent(componentId: UUID): void {
    const object = this._sceneManager.getObject3D('component', componentId);
    if (!object) {
      return;
    }
    const currentAngle = object.rotation.y;
    const newAngle = (currentAngle - Math.PI / 2) % (Math.PI * 2);
    object.rotation.set(0, newAngle, 0);

    try {
      const component = this._sceneManager
        .getCircuitEditionManager()
        .saveEditComponent(componentId, object);
      this._sceneManager.getWireVisualManager().updateWiresForComponent(component.id);
      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        mode: 'component_rotate',
        operationData: {
          componentId: componentId,
          newPosition: component.position,
        },
        changedData: {},
      });
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        mode: this.mode,
        errorMessage: `Failed to commit component rotate: ${(error as Error).message}`,
      });
      this.cancelComponentDrag(false);
    }
  }

  /**
   * Check if wire intermediate point should be merged or deleted
   * Returns updated positions array after merge/delete check
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
      Math.pow(draggedPos.x - endpoint1.x, 2) + Math.pow(draggedPos.y - endpoint1.y, 2)
    );
    if (distToEndpoint1 < threshold) {
      // Remove this point
      positions.splice(draggedIndex, 1);
      return positions;
    }

    // Check if close to endpoint2
    const distToEndpoint2 = Math.sqrt(
      Math.pow(draggedPos.x - endpoint2.x, 2) + Math.pow(draggedPos.y - endpoint2.y, 2)
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
        Math.pow(draggedPos.x - otherPos.x, 2) + Math.pow(draggedPos.y - otherPos.y, 2)
      );

      if (dist < threshold) {
        // Merge: remove the dragged point
        positions.splice(draggedIndex, 1);
        return positions;
      }
    }

    return positions;
  }

  /**
   * Copy component type and rotation to clipboard
   * @param componentId - UUID of the component to copy
   */
  private copyComponent(componentId: UUID): void {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    const component = circuit.getComponent(componentId);
    if (!component) return;

    this.clipboard = {
      componentType: component.type,
      rotation: gridToWorldRotation(component.rotation),
    };
  }

  /**
   * Paste component from clipboard at hovered position
   * Creates a new component with the type and rotation from clipboard
   */
  private pasteComponent(): void {
    if (!this.clipboard) return;

    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;

    // Get cursor position
    const worldPosition = this._sceneManager.cursorGroundPlanePosition();

    this._sceneManager.addComponent(
      this.clipboard.componentType,
      worldPosition,
      this.clipboard.rotation
    );
  }

  /**
   * Cycles the sourceType of an enode: null → Voltage → Current → null
   * Updates both model and visual immediately.
   * @param enodeId - UUID of the enode to cycle
   * @param hitbox - hitbox of the enode being clicked
   */
  private cycleEnodeSourceType(enodeId: UUID, hitbox: THREE.Object3D): void {
    if(hitbox.userData.lockedSourceType) return; // do not update locked source types
    if(!hitbox.parent) return;

    const nextSourceType = getNextSourceType(hitbox.parent.userData.sourceType);
    this._sceneManager.updateEnodeSourceType(enodeId, nextSourceType || null);
  }
}
