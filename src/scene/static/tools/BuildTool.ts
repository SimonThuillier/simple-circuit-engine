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
 * - Component placement & addition (add_component mode with picker widget)
 *
 * Replaces old: PositionTool, WireTool, DeleteTool, BranchingPointTool, AddComponentTool
 */

import * as THREE from 'three';
import { Euler } from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import {
  type UUID,
  type ComponentType,
  ENodeSourceType,
  ENodeType,
  ENode,
  Position,
  Rotation,
  Component,
  findPinsReachableFromBp,
  findBpsAtLogicDistance,
  findPinsReachableFromBpWithPath,
  findBpsAtLogicDistanceWithPath,
} from 'simple-circuit-engine/core';

import type {
  IEditingTool,
  ToolType,
  CursorType,
  HoverableType,
  MonoSelectionData,
  HoveredElement,
} from '../../shared/types';
import type { IGroupedFactoryRegistry } from '../../shared/components/GroupedFactoryRegistry';
import type { CircuitController } from '../CircuitController';
import {
  gridToWorldPosition,
  gridToWorldRotation,
  nearestWorldSnapPosition,
  worldToGridPosition,
} from '../../shared/utils/GeometryUtils';
import {
  ComponentPickerWidget,
  BRANCHING_POINT_SENTINEL,
  type PickerSelection,
} from './ComponentPickerWidget';
import { computeRule2BpPositions, nudgeIfSameGridCell } from './MultiWiringPlacement';

/**
 * Build tool operating modes
 *
 * State transitions:
 *   idle → wire_creation (click enode)
 *   idle → component_drag (pointerdown on selected element)
 *   idle → wire_drag (click wire or intermediate point)
 *   idle → bp_drag (double-click+hold branching point)
 *   idle → add_component (double-click empty space)
 *   add_component → idle (Escape, close widget)
 *   {any active mode} → idle (pointerup, Escape, or operation complete)
 */
type BuildToolMode =
  | 'idle'
  | 'wire_creation'
  | 'wire_drag'
  | 'component_drag'
  | 'bp_drag'
  | 'add_component';

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
  /** Original configuration data for the component */
  config: Map<string, string>;
  /** Original pins sourceTypes */
  pinSources: Array<ENodeSourceType | undefined | null>;
}

/**
 * Returns the next sourceType in the cycle: null → Voltage → Current → null
 * @param current - Current source type
 * @returns Next source type in the cycle
 */
function getNextSourceType(current: ENodeSourceType | undefined): ENodeSourceType | undefined {
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

  private _controller: CircuitController;

  // Tool state
  private mode: BuildToolMode = 'idle';
  private lastCancelledOp: LastCancelledOp | null = null;
  private lastOperationCompletedTs: number = 0;

  // Mode-specific state
  private wireCreationState: WireCreationState | null = null;
  private wireDragState: WireDragState | null = null;
  private componentDragState: ComponentDragState | null = null;
  private bpDragState: BPDragState | null = null;

  // Clipboard for copy-paste operations
  private clipboard: ClipboardData | null = null;

  // Component picker widget (add_component mode)
  private pickerWidget: ComponentPickerWidget | null = null;

  // Ghost preview for add_component mode
  private ghostPreview: THREE.Group | null = null;
  private hasOverlap: boolean = false;

  // Currently selected item in the picker (persists across mode entries)
  private pickerSelection: PickerSelection | null = null;

  /**
   * Construct a new BuildTool instance
   * @param controller - The circuit scene controllerType instance
   */
  constructor(controller: CircuitController) {
    this._controller = controller;

    // Initialize component picker widget if registry supports groups
    const registry = controller.factoryRegistry;
    if ('getGroups' in registry && typeof (registry as any).getGroups === 'function') {
      this.pickerWidget = new ComponentPickerWidget(
        registry as unknown as IGroupedFactoryRegistry,
        (selection) => this.onPickerSelectionChange(selection),
        () => this.exitAddComponentMode()
      );
    }

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
    const container = this._controller.getContainer();

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

    // Clean up add_component mode resources
    this.disposeGhostPreview();
    this.pickerWidget?.close();

    const container = this._controller.getContainer();
    // Remove event listeners
    this._controller.off('gridPositionMove', this.handleGridPositionMove);
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
    this.hasOverlap = false;

    // Safety: re-enable camera controls
    const controls = this._controller.getControls();
    if (controls) {
      controls.enablePan = true;
    }
  }

  /**
   * Forward a language change to the component picker.
   */
  setLanguage(lng: string): void {
    this.pickerWidget?.setLanguage(lng);
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
    } else if (this.mode === 'add_component') {
      this.exitAddComponentMode();
    }
  }

  /**
   * Get the current cursor type for this tool
   * Returns cursor based on current mode and hover state
   */
  getCursorType(): CursorType {
    const hoveredElement = this._controller.getHoveredElement();

    // During add_component mode
    if (this.mode === 'add_component') {
      if (hoveredElement && hoveredElement.type === 'component') return 'pointer';
      if (this.hasOverlap) return 'not-allowed';
      return this.pickerSelection ? 'crosshair' : 'default';
    }

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
      const selection = this._controller.getSelectionManager().getSelection();
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

    // Add component ghost preview
    if (this.mode === 'add_component' && this.ghostPreview) {
      previews.push(this.ghostPreview);
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
    const circuit = this._controller.getCircuit();
    if (!circuit) return;
    const hoveredElement = this._controller.getHoveredElement();

    if (this.mode === 'idle') {
      // Handle Ctrl+Shift+click for config panel (T011, T012)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && hoveredElement) {
        if (hoveredElement.type === 'component') {
          this.openConfigPanel(hoveredElement.id, event);
        }
        // Early exit - don't start other operations
        return;
      }

      // Handle Ctrl+click for sourceType or fast component config cycling
      if ((event.ctrlKey || event.metaKey) && hoveredElement) {
        if (hoveredElement.type === 'enode') {
          this.cycleEnodeSourceType(hoveredElement.id, hoveredElement.object3D);
        } else if (hoveredElement.type === 'component') {
          this._controller.cycleComponentConfig(hoveredElement.id);
        }
        // TODO: for wire maybe implement a path regularization feature later
        // Early exit - don't start wire creation
        return;
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
          this.startBPDrag(enodeId, this._controller.cursorGroundPlanePosition());
          return;
        }

        // Priority 1 : Check if we're hovering an enode and start wire creation
        this.startWireCreation(enodeId);
        return;
      }
      // Priority 2 : Check if we're hovering a component
      if (hoveredElement && hoveredElement.type === 'component') {
        const componentId = hoveredElement.id;
        this.startComponentDrag(componentId, this._controller.cursorGroundPlanePosition());
        return;
      }
      // Priority 3 : Check if we're hovering a wire
      if (hoveredElement && hoveredElement.type === 'wire') {
        const wireId = hoveredElement.id;
        const screenPos = new THREE.Vector2(event.clientX, event.clientY);
        const worldPosition = this._controller.cursorGroundPlanePosition();

        // Drag target resolution: branching point > existing intermediate > new intermediate
        const wire = circuit.getWire(wireId);
        if (!wire) return;

        // Priority 3-1: Check for existing intermediate point
        const nearestPoint = this._controller.wireVisualManager.findNearestIntermediatePoint(
          wireId,
          screenPos
        );
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
        const insertIndex = this._controller.wireVisualManager.getInsertIndexForPosition(
          wireId,
          worldPosition
        );
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
    } else if (this.mode === 'add_component') {
      // In add_component mode, clicking on empty space places the selected item
      if (!hoveredElement && this.pickerSelection) {
        if (this.hasOverlap) {
          this._controller.emit('toolValidationError', {
            toolType: this.type,
            mode: 'add_component',
            errorMessage: 'Cannot place component: position occupied',
          });
          return;
        }
        this.placeSelectedItem();
      }
      return;
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

    // add_component mode manages its own gridPositionMove listener lifecycle
    if (this.mode === 'add_component') return;

    const circuit = this._controller.getCircuit();
    if (!circuit) return;
    const hoveredElement = this._controller.getHoveredElement();

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
    this._controller.off('gridPositionMove', this.handleGridPositionMove);
    // and unlock MapControl change of camera
    this._controller.getControls()!.enablePan = true;
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
      case 'add_component':
        this.updateAddComponentPreview(position);
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
      if (this.mode === 'add_component') {
        this.exitAddComponentMode();
      } else if (this.mode === 'wire_creation') {
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
      const selection = this._controller.getSelectionManager().getSelection();
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
    const selection = this._controller.getSelectionManager().getSelection();
    if (!selection) return;
    if (selection.kind === 'multi') return; //this tool only handles mono selection for deletion
    const monoSelection = selection as MonoSelectionData;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Handle deletion of components, wires, branching points
      if (monoSelection.type === 'component') {
        const componentId = monoSelection.id;
        this._controller.removeComponent(componentId);
      } else if (monoSelection.type === 'wire') {
        const wireId = monoSelection.id;
        this._controller.removeWire(wireId);
      } else if (monoSelection.type === 'enode' && monoSelection.data === 'BranchingPoint') {
        const enodeId = monoSelection.id;
        this._controller.removeBranchingPoint(enodeId);
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
    if (event.ctrlKey || event.metaKey) return; // prevent rotating while ctrl hold

    const hoveredElement = this._controller.getHoveredElement();

    // Priority 1 - Check if we're hovering a wire => split it with new branchingPoint
    if (hoveredElement && hoveredElement.type === 'wire') {
      const wireId = hoveredElement.id;
      const gridPosition = this._controller.cursorGroundPlanePosition();
      const enodeId = this.createBranchingPointOnWire(wireId, gridPosition);
      if (enodeId) {
        // rule 4: fan-out wire splits along sibling chains of the AA interface
        // reached by the new BP. Only the dbl-click path triggers this; the
        // wire-end-on-wire and wire-drag-onto-wire paths do not.
        let rule4 = { addedWires: [] as UUID[], addedEnodes: [] as UUID[] };
        if (this._controller.multiWiring) {
          rule4 = this.createMultiWiringRule4Followups(enodeId);
        }
        this._controller.getSelectionManager().selectOne('enode', enodeId, { componentId: null });
        if (rule4.addedWires.length > 0 || rule4.addedEnodes.length > 0) {
          this._controller.autoAdjustCircuitGridSize();
          this._controller.emit('toolOperationCompleted', {
            toolType: this.type,
            mode: this.mode,
            operationData: { branchingPointId: enodeId },
            changedData: {
              addedWires: rule4.addedWires,
              addedEnodes: rule4.addedEnodes,
            },
          });
        }
      }
    }
    // Priority 2 - Check if we're hovering a component => rotate it
    else if (hoveredElement && hoveredElement.type === 'component') {
      const componentId = hoveredElement.id;
      this.rotateComponent(componentId);
    } else if (!hoveredElement) {
      // Priority 3 - Double-click on empty space - open component picker widget
      // Suppress if a drag/wire operation just completed (avoids false dblclick after quick drag-release)
      if (Date.now() - this.lastOperationCompletedTs < 400) return;
      if (this.pickerWidget && this.mode === 'idle') {
        this.enterAddComponentMode(event);
      } else if (!this.pickerWidget) {
        // Fallback: create standalone branching point if no grouped registry
        const gridPosition = this._controller.cursorGroundPlanePosition();
        const enodeId = this.createStandaloneBranchingPoint(gridPosition);
        if (enodeId) {
          this._controller.getSelectionManager().selectOne('enode', enodeId, { componentId: null });
        }
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
    const circuit = this._controller.getCircuit();
    if (!circuit) return;

    const sourceEnode = circuit.getENode(sourceEnodeId);
    if (!sourceEnode) return;

    // Get source position
    const enodeGroup = this._controller.enodeObject3Ds.get(sourceEnodeId);
    if (!enodeGroup) return;
    const sourcePosition = enodeGroup.position.clone();
    if (enodeGroup.userData.componentId) {
      // since pins (enodes of components) are children of the component object3D,
      // we need to get the world position
      enodeGroup.getWorldPosition(sourcePosition);
    }

    // Create preview wire
    const previewWire = this._controller.wireVisualManager.createPreviewWire(sourcePosition);

    // Enter wire creating state
    this.mode = 'wire_creation';
    this.wireCreationState = {
      sourceEnodeId,
      sourcePosition: sourcePosition.clone(),
      previewWire,
      ts: Date.now(),
    };

    this._controller.getControls()!.enablePan = false;
    this._controller.on('gridPositionMove', this.handleGridPositionMove);

    this._controller.emit('toolOperationStarted', {
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
    this._controller.wireVisualManager.updatePreviewWire(position);
  }

  /**
   * Cancel wire creation and reset state
   */
  private cancelWireCreation(emit: boolean = true): void {
    if (this.mode !== 'wire_creation') return;
    this._controller.wireVisualManager.removePreviewWire();
    if (emit) {
      this._controller.emit('toolOperationCancelled', {
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

    const circuit = this._controller.getCircuit();
    if (!circuit) return;
    const sourceEnodeId = this.wireCreationState.sourceEnodeId;

    // Saving to model, Validation checks are done in the process
    try {
      let targetEnodeId = null;
      let hasSelected = false;
      let standaloneBpWorldPosition: THREE.Vector3 | null = null;
      if (!hoveredElement) {
        // finishing on empty space : create end branching point
        const worldPosition = this._controller.cursorGroundPlanePosition();
        targetEnodeId = this.createStandaloneBranchingPoint(worldPosition);
        if (targetEnodeId) {
          standaloneBpWorldPosition = worldPosition;
          this._controller
            .getSelectionManager()
            .selectOne('enode', targetEnodeId, { componentId: null });
          hasSelected = true;
        }
      } else if (hoveredElement.type === 'wire') {
        // this interesting case create a new branching point on the wire and connect to it
        const targetWireId = hoveredElement.id;
        const gridPosition = this._controller.cursorGroundPlanePosition();
        targetEnodeId = this.createBranchingPointOnWire(targetWireId, gridPosition);
      } else if (hoveredElement.type === 'enode') {
        targetEnodeId = hoveredElement.id;
      }

      if (!targetEnodeId) {
        throw new Error('Invalid target for wire creation');
      }

      // Create definitive wire visual
      const wire = this._controller.addWire(sourceEnodeId, targetEnodeId);
      // followUps if multi-wiring enabled (each rule body is mutually exclusive
      // through its source/target type discriminator; declarations hoisted so
      // the emit payload below can always read them).
      let followUpIds: UUID[] = [];
      let rule2 = { addedWires: [] as UUID[], addedEnodes: [] as UUID[] };
      let rule3A = { addedWires: [] as UUID[], addedEnodes: [] as UUID[] };
      let rule3B = { addedWires: [] as UUID[], addedEnodes: [] as UUID[] };
      let rule3C = { addedWires: [] as UUID[], addedEnodes: [] as UUID[] };
      if (this._controller.multiWiring) {
        let ruleActivated: string | null = null;
        // rule 1: pin↔pin fan-out
        followUpIds = this.createMultiWiringFollowUpWires(sourceEnodeId, targetEnodeId);
        if (followUpIds.length > 0) ruleActivated = 'rule1';
        // rule 2: pin → fresh standalone BP
        if (!ruleActivated && standaloneBpWorldPosition) {
          rule2 = this.createMultiWiringRule2Followups(sourceEnodeId, standaloneBpWorldPosition);
          if (rule2.addedWires.length > 0) ruleActivated = 'rule2';
        }
        // rule 3A: BP → fresh standalone BP
        if (!ruleActivated && standaloneBpWorldPosition) {
          const sourceBP = this._controller.getObject3D('enode', sourceEnodeId);
          if (sourceBP instanceof THREE.Object3D) {
            rule3A = this.createMultiWiringRule3AFollowups(
              sourceEnodeId,
              standaloneBpWorldPosition,
              sourceBP.position
            );
            if (rule3A.addedWires.length > 0) ruleActivated = 'rule3A';
          }
        }
        // rule 3B: BP → existing logic pin
        if (!ruleActivated && !standaloneBpWorldPosition) {
          const src = circuit.getENode(sourceEnodeId);
          const tgt = circuit.getENode(targetEnodeId);
          if (
            src?.type === ENodeType.BranchingPoint &&
            tgt?.type === ENodeType.Pin &&
            tgt.logicMetadata
          ) {
            rule3B = this.createMultiWiringRule3BFollowups(sourceEnodeId, targetEnodeId);
            if (rule3B.addedWires.length > 0) ruleActivated = 'rule3B';
          }
        }
        // rule 3C: existing logic pin → existing BP (excluding split-on-wire,
        // which produces a brand-new BP not "existing" in the user's gesture).
        if (!ruleActivated && !standaloneBpWorldPosition) {
          const src = circuit.getENode(sourceEnodeId);
          const tgt = circuit.getENode(targetEnodeId);
          if (
            src?.type === ENodeType.Pin &&
            src.logicMetadata &&
            tgt?.type === ENodeType.BranchingPoint &&
            hoveredElement?.type !== 'wire'
          ) {
            rule3C = this.createMultiWiringRule3CFollowups(sourceEnodeId, targetEnodeId);
            if (rule3C.addedWires.length > 0) ruleActivated = 'rule3C';
          }
        }
      }

      // select the new wire if nothing was selected before
      if (!hasSelected) {
        this._controller.getSelectionManager().selectOne('wire', wire.id);
      }
      this._controller.autoAdjustCircuitGridSize();
      // Emit success event
      this._controller.emit('toolOperationCompleted', {
        toolType: this.type,
        mode: this.mode,
        operationData: { wireId: wire.id, sourceEnodeId, targetEnodeId },
        changedData: {
          addedWires: [
            wire.id,
            ...followUpIds,
            ...rule2.addedWires,
            ...rule3A.addedWires,
            ...rule3B.addedWires,
            ...rule3C.addedWires,
          ],
          addedEnodes: [
            ...rule2.addedEnodes,
            ...rule3A.addedEnodes,
            ...rule3B.addedEnodes,
            ...rule3C.addedEnodes,
          ],
        },
      });
      // Reset state (end preview)
      this.lastOperationCompletedTs = Date.now();
      this.cancelWireCreation();
      return wire.id;
    } catch (error) {
      this.cancelWireCreation();
      this._controller.emit('toolValidationError', {
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
   * If multi-wiring is enabled and both endpoints are logic pins on distinct
   * interfaces, fan out follow-up wires at matching offsets. Best-effort: any
   * per-index failure is logged and skipped.
   */
  private createMultiWiringFollowUpWires(sourceEnodeId: UUID, targetEnodeId: UUID): UUID[] {
    if (!this._controller.multiWiring) return [];
    const circuit = this._controller.getCircuit();
    if (!circuit) return [];
    const src = circuit.getENode(sourceEnodeId);
    const tgt = circuit.getENode(targetEnodeId);
    if (!src?.logicMetadata || !tgt?.logicMetadata) return [];
    if (!src.component || !tgt.component) return [];
    const srcMeta = src.logicMetadata;
    const tgtMeta = tgt.logicMetadata;
    if (src.component === tgt.component && srcMeta.interface === tgtMeta.interface) return [];
    const srcComp = circuit.getComponent(src.component);
    const tgtComp = circuit.getComponent(tgt.component);
    if (!srcComp || !tgtComp) return [];
    const count = Math.min(
      srcComp.getInterfaceMaxIndex(srcMeta.interface) - srcMeta.index,
      tgtComp.getInterfaceMaxIndex(tgtMeta.interface) - tgtMeta.index
    );
    if (count <= 0) return [];
    const added: UUID[] = [];
    for (let k = 1; k <= count; k++) {
      const s = srcComp.getPinIdByInterface(srcMeta.interface, srcMeta.index + k);
      const t = tgtComp.getPinIdByInterface(tgtMeta.interface, tgtMeta.index + k);
      if (!s || !t) continue;
      try {
        added.push(this._controller.addWire(s, t).id);
      } catch (err) {
        console.warn(
          'multi-wiring follow-up wire failed:',
          err instanceof Error ? err.message : err
        );
      }
    }
    return added;
  }

  /**
   * If multi-wiring is enabled and the wire ended on empty space (i.e. created
   * a fresh standalone branching point) from a logic pin, fan out follow-up
   * branching points and follow-up wires for the remaining indices of the
   * source interface. Best-effort: any per-step failure is logged and skipped.
   */
  private createMultiWiringRule2Followups(
    sourceEnodeId: UUID,
    bpWorldPosition: THREE.Vector3
  ): { addedWires: UUID[]; addedEnodes: UUID[] } {
    const empty = { addedWires: [], addedEnodes: [] };
    if (!this._controller.multiWiring) return empty;
    const circuit = this._controller.getCircuit();
    if (!circuit) return empty;
    const src = circuit.getENode(sourceEnodeId);
    if (!src?.logicMetadata || !src.component) return empty;
    const srcComp = circuit.getComponent(src.component);
    if (!srcComp) return empty;
    const pinMeta = srcComp.getPinMetadata(sourceEnodeId);
    const sign: 1 | -1 | null =
      pinMeta?.subtype === 'logicInput' ? -1 : pinMeta?.subtype === 'logicOutput' ? 1 : null;
    if (sign === null) return empty;
    const interfaceName = src.logicMetadata.interface;
    const i = src.logicMetadata.index;
    const count = srcComp.getInterfaceMaxIndex(interfaceName) - i;
    if (count <= 0) return empty;
    const componentGroup = this._controller.componentObject3Ds.get(src.component);
    if (!componentGroup) return empty;

    // Collect pin world XZ positions for k = 0..count.
    const pinPositions: { x: number; z: number }[] = [];
    for (let k = 0; k <= count; k++) {
      const pinId = srcComp.getPinIdByInterface(interfaceName, i + k);
      if (!pinId) return empty;
      const pos = this._controller.wireVisualManager.getPinWorldPositionFromGroup(
        pinId,
        componentGroup
      );
      if (!pos) return empty;
      pinPositions.push({ x: pos.x, z: pos.z });
    }

    const bp0 = { x: bpWorldPosition.x, z: bpWorldPosition.z };
    const followUps = computeRule2BpPositions(pinPositions, bp0, sign);
    if (followUps.length === 0) return empty;

    const Wx = bp0.x - pinPositions[0]!.x;
    const Wz = bp0.z - pinPositions[0]!.z;
    const wireLength = Math.hypot(Wx, Wz);
    const u = wireLength > 0 ? { x: Wx / wireLength, z: Wz / wireLength } : { x: 0, z: 0 };

    const addedWires: UUID[] = [];
    const addedEnodes: UUID[] = [];
    for (let j = 1; j <= count; j++) {
      const raw = followUps[j - 1]!;
      const parallelBp = {
        x: pinPositions[j]!.x + Wx,
        z: pinPositions[j]!.z + Wz,
      };
      const nudged = nudgeIfSameGridCell(raw, parallelBp, u);
      try {
        const bpEnode = this._controller.addBranchingPoint(
          new THREE.Vector3(nudged.x, 0, nudged.z)
        );
        addedEnodes.push(bpEnode.id);
        const followUpSrcPinId = srcComp.getPinIdByInterface(interfaceName, i + j);
        if (!followUpSrcPinId) continue;
        addedWires.push(this._controller.addWire(followUpSrcPinId, bpEnode.id).id);
      } catch (err) {
        console.warn(
          'multi-wiring rule 2 follow-up failed:',
          err instanceof Error ? err.message : err
        );
      }
    }
    return { addedWires, addedEnodes };
  }

  /**
   * If multi-wiring is enabled, the source is a branching point logically
   * rooted on a single logic pin at distance Dl > 0, and the target is a
   * fresh standalone branching point, fan out follow-up BPs through the
   * existing BP-network: for each interface index `i + j` find a sibling
   * BP at the same logic distance Dl and place a new target BP near it
   * (rule-2-style growth/shrink). Stops at the first index whose sibling
   * candidate count within the proximity threshold is not exactly 1.
   */
  private createMultiWiringRule3AFollowups(
    sourceEnodeId: UUID,
    bpWorldPosition: THREE.Vector3,
    sourceBpWorldPosition: THREE.Vector3
  ): { addedWires: UUID[]; addedEnodes: UUID[] } {
    const empty = { addedWires: [], addedEnodes: [] };
    if (!this._controller.multiWiring) return empty;
    const circuit = this._controller.getCircuit();
    if (!circuit) return empty;
    const src = circuit.getENode(sourceEnodeId);
    if (!src || src.type !== ENodeType.BranchingPoint) return empty;
    if (!src.position) return empty;

    const deltaVector = bpWorldPosition.sub(sourceBpWorldPosition);

    // 1. Backward exploration: must reach at least one logic pin at Dl > 0.
    const reachedPins = findPinsReachableFromBp(circuit, sourceEnodeId);
    if (reachedPins.size < 1) return empty;
    const anchor = this.findBestAnchor(sourceEnodeId);
    if(!anchor) return empty;
    const pinId = anchor.pinId;
    const Dl = anchor.Dl;

    const pinEnode = circuit.getENode(pinId);
    if (!pinEnode?.logicMetadata || !pinEnode.component) return empty;
    const pinComp = circuit.getComponent(pinEnode.component);
    if (!pinComp) return empty;
    const pinMeta = pinComp.getPinMetadata(pinId);
    if (pinMeta?.subtype !== 'logicInput' && pinMeta?.subtype !== 'logicOutput') return empty;
    const interfaceName = pinEnode.logicMetadata.interface;
    const i = pinEnode.logicMetadata.index;
    const maxIdx = pinComp.getInterfaceMaxIndex(interfaceName);
    const count = maxIdx - i;
    if (count <= 0) return empty;

    // 2. Pin-spacing threshold (uses pin world positions on the source pin's component).
    const threshold = this.computeAaPinSpacingThreshold(pinComp, interfaceName, pinEnode.component, pinId);
    if (threshold === null) return empty;

    // 3. Iterative sibling selection (interleave forward exploration with proximity check).
    const startBpWorld = gridToWorldPosition(src.position);
    const startBpXZ = { x: startBpWorld.x, z: startBpWorld.z };
    const chosenSiblingPositions: { x: number; z: number }[] = [startBpXZ];
    const chosenSiblingIds: UUID[] = [sourceEnodeId];
    let prevSiblingPos = startBpXZ;
    for (let j = 1; j <= count; j++) {
      const followUpPinId = pinComp.getPinIdByInterface(interfaceName, i + j);
      if (!followUpPinId) break;
      const result = this.selectSiblingWithThreshold(followUpPinId, Dl, prevSiblingPos, threshold);
      if (typeof result === 'string') break; // 'break-no-match' or 'break-ambiguous'
      chosenSiblingPositions.push(result.pos);
      chosenSiblingIds.push(result.id);
      prevSiblingPos = result.pos;
    }

    if (chosenSiblingPositions.length <= 1) return empty;

    // 4. Compute follow-up target BP positions (add exactly same vector as initially placed BP, but from the various ancestors)
    const addedWires: UUID[] = [];
    const addedEnodes: UUID[] = [];
    for (let j = 1; j < chosenSiblingPositions.length; j++) {
      const thisOrigin = chosenSiblingPositions[j]!;
      const parallelBp = { x: thisOrigin.x + deltaVector.x, z: thisOrigin.z + deltaVector.z };
      try {
        const bpEnode = this._controller.addBranchingPoint(
          new THREE.Vector3(parallelBp.x, 0, parallelBp.z)
        );
        addedEnodes.push(bpEnode.id);
        addedWires.push(this._controller.addWire(chosenSiblingIds[j]!, bpEnode.id).id);
      } catch (err) {
        console.warn(
          'multi-wiring rule 3A follow-up failed:',
          err instanceof Error ? err.message : err
        );
      }
    }
    return { addedWires, addedEnodes };
  }

  // ==========================================================================
  // Multi-wiring shared helpers (used by rules 3A, 3B, 3C, 4)
  // ==========================================================================

  /**
   * Compute `4 × |pin_(i+1) − pin_i|` in XZ for a logic interface, used as the
   * proximity threshold by rules 3A/3B/3C/4. Returns null if any look-up fails
   * or the spacing is degenerate.
   */
  private computeAaPinSpacingThreshold(
    pinComp: Component,
    interfaceName: string,
    componentId: UUID,
    pinId_i: UUID
  ): number | null {
    const componentGroup = this._controller.componentObject3Ds.get(componentId);
    if (!componentGroup) return null;
    const pinPos_i = this._controller.wireVisualManager.getPinWorldPositionFromGroup(
      pinId_i,
      componentGroup
    );
    if (!pinPos_i) return null;
    const pinId_i1 = pinComp.getPinIdByInterface(interfaceName, this.indexOfPin(pinComp, pinId_i) + 1);
    if (!pinId_i1) return null;
    const pinPos_i1 = this._controller.wireVisualManager.getPinWorldPositionFromGroup(
      pinId_i1,
      componentGroup
    );
    if (!pinPos_i1) return null;
    const pinSpacing = Math.hypot(pinPos_i1.x - pinPos_i.x, pinPos_i1.z - pinPos_i.z);
    if (pinSpacing <= 0) return null;
    return 4 * pinSpacing;
  }

  /** Internal: index of a pin within its logic interface. Throws on missing
   *  metadata (caller must have already checked). */
  private indexOfPin(pinComp: Component, pinId: UUID): number {
    const meta = pinComp.getPinMetadata(pinId);
    if (!meta?.logicPinData) throw new Error(`pin ${pinId} has no logic metadata`);
    return meta.logicPinData.index;
  }

  /**
   * Per-`j` sibling picker shared by rules 3A, 3B, 3C: forward-explore at
   * logic distance `Dl` from `followUpPinId`, filter candidates by XZ
   * proximity to `prevRefXZ` (≤ `threshold`), and require a singleton.
   *
   * @returns the chosen sibling, or a sentinel describing why we stopped.
   */
  private selectSiblingWithThreshold(
    followUpPinId: UUID,
    Dl: number,
    prevRefXZ: { x: number; z: number },
    threshold: number
  ): { id: UUID; pos: { x: number; z: number } } | 'break-no-match' | 'break-ambiguous' {
    const circuit = this._controller.getCircuit();
    if (!circuit) return 'break-no-match';
    const candidates = findBpsAtLogicDistance(circuit, followUpPinId, Dl);
    const withinThreshold: { id: UUID; pos: { x: number; z: number } }[] = [];
    for (const cId of candidates) {
      const c = circuit.getENode(cId);
      if (!c?.position) continue;
      const cWorld = gridToWorldPosition(c.position);
      const cXZ = { x: cWorld.x, z: cWorld.z };
      const dist = Math.hypot(cXZ.x - prevRefXZ.x, cXZ.z - prevRefXZ.z);
      if (dist <= threshold) withinThreshold.push({ id: cId, pos: cXZ });
    }
    if (withinThreshold.length === 0) return 'break-no-match';
    if (withinThreshold.length > 1) return 'break-ambiguous';
    return withinThreshold[0]!;
  }

  /**
   * Backward-explore the BP-network from `bpId` and return the closest pin of biggest interface  (with non-null logicMetadata) by size
   * Optionally if wantedLogicType is specified it filters out interfaces whose subtype differs from `wantedLogicType`
   * Tie on `Dl` → first BFS encounter (Map insertion order).
   */
  private findBestAnchor(
    bpId: UUID,
    wantedLogicType: 'logicInput' | 'logicOutput' | undefined | null = undefined
  ): { pinId: UUID; Dl: number; pinComp: Component; pinEnode: ENode; size: number } | null {
    const circuit = this._controller.getCircuit();
    if (!circuit) return null;
    const reached = findPinsReachableFromBp(circuit, bpId);
    let best: { pinId: UUID; Dl: number; pinComp: Component; pinEnode: ENode; size: number } | null = null;
    for (const [pinId, Dl] of reached) {
      const pinEnode = circuit.getENode(pinId);
      if (!pinEnode?.logicMetadata || !pinEnode.component) continue;
      const pinComp = circuit.getComponent(pinEnode.component);
      if (!pinComp) continue;
      const meta = pinComp.getPinMetadata(pinId);
      if (!meta || !meta.logicPinData) continue;
      if (!!wantedLogicType && meta.subtype !== wantedLogicType) continue;
      if (!best || meta.logicPinData.size < best.size || Dl < best.Dl) {
        best = { pinId, Dl, pinComp, pinEnode, size: meta.logicPinData.size };
      }
      // Map iteration is BFS-order, so on Dl tie the first hit wins.
    }
    return best;
  }

  /**
   * World position of any ENode (Pin or BranchingPoint). Pins resolve via
   * the component group + WireVisualManager; BPs via gridToWorldPosition.
   * Returns null if the lookup chain breaks.
   */
  private getEnodeWorldPosition(enodeId: UUID): THREE.Vector3 | null {
    const circuit = this._controller.getCircuit();
    if (!circuit) return null;
    const enode = circuit.getENode(enodeId);
    if (!enode) return null;
    if (enode.type === ENodeType.BranchingPoint) {
      if (!enode.position) return null;
      return gridToWorldPosition(enode.position);
    }
    // Pin
    if (!enode.component) return null;
    const componentGroup = this._controller.componentObject3Ds.get(enode.component);
    if (!componentGroup) return null;
    return this._controller.wireVisualManager.getPinWorldPositionFromGroup(enodeId, componentGroup);
  }

  // ==========================================================================
  // Multi-wiring rule 3B: existing BP → existing logic pin
  // ==========================================================================

  /**
   * If multi-wiring is enabled, the source is an existing BP and the target
   * is an existing logic pin, search the source-BP network for an
   * opposite-type anchor pin BB-jBB; then for each follow-up index pair, wire
   * a sibling BP on BB's interface side to the corresponding AA follow-up
   * pin. No new BPs are created.
   */
  private createMultiWiringRule3BFollowups(
    sourceEnodeId: UUID,
    targetEnodeId: UUID
  ): { addedWires: UUID[]; addedEnodes: UUID[] } {
    const empty = { addedWires: [], addedEnodes: [] };
    if (!this._controller.multiWiring) return empty;
    const circuit = this._controller.getCircuit();
    if (!circuit) return empty;
    const src = circuit.getENode(sourceEnodeId);
    const tgt = circuit.getENode(targetEnodeId);
    if (!src || src.type !== ENodeType.BranchingPoint || !src.position) return empty;
    if (!tgt || tgt.type !== ENodeType.Pin || !tgt.logicMetadata || !tgt.component) return empty;
    const tgtComp = circuit.getComponent(tgt.component);
    if (!tgtComp) return empty;
    const tgtPinMeta = tgtComp.getPinMetadata(targetEnodeId);
    const tgtSubtype = tgtPinMeta?.subtype;
    if (tgtSubtype !== 'logicInput' && tgtSubtype !== 'logicOutput') return empty;
    const opposite: 'logicInput' | 'logicOutput' =
      tgtSubtype === 'logicInput' ? 'logicOutput' : 'logicInput';

    const AA = tgt.logicMetadata.interface;
    const iAA = tgt.logicMetadata.index;
    const maxAA = tgtComp.getInterfaceMaxIndex(AA);
    const count_AA = maxAA - iAA;
    if (count_AA <= 0) return empty;

    const anchor = this.findBestAnchor(sourceEnodeId, opposite);
    if (!anchor) return empty;
    const { Dl, pinComp: BBComp, pinEnode: BBpin } = anchor;
    if (!BBpin.logicMetadata) return empty;
    const BB = BBpin.logicMetadata.interface;
    const jBB = BBpin.logicMetadata.index;
    const maxBB = BBComp.getInterfaceMaxIndex(BB);
    const count = Math.min(maxBB - jBB, count_AA);
    if (count <= 0) return empty;

    // Threshold based on AA pin spacing (target-side interface).
    const threshold = this.computeAaPinSpacingThreshold(tgtComp, AA, tgt.component, targetEnodeId);
    if (threshold === null) return empty;

    // prev-sibling reference starts at the SOURCE BP world position.
    const srcWorld = gridToWorldPosition(src.position);
    let prevRefXZ = { x: srcWorld.x, z: srcWorld.z };
    const addedWires: UUID[] = [];
    for (let j = 1; j <= count; j++) {
      const BBfollowUp = BBComp.getPinIdByInterface(BB, jBB + j);
      if (!BBfollowUp) break;
      const result = this.selectSiblingWithThreshold(BBfollowUp, Dl, prevRefXZ, threshold);
      if (typeof result === 'string') break;
      const AAfollowUp = tgtComp.getPinIdByInterface(AA, iAA + j);
      if (!AAfollowUp) break;
      try {
        addedWires.push(this._controller.addWire(result.id, AAfollowUp).id);
      } catch (err) {
        console.warn(
          'multi-wiring rule 3B follow-up failed:',
          err instanceof Error ? err.message : err
        );
      }
      prevRefXZ = result.pos;
    }
    return { addedWires, addedEnodes: [] };
  }

  // ==========================================================================
  // Multi-wiring rule 3C: existing logic pin → existing BP (symmetric of 3B)
  // ==========================================================================

  /**
   * Mirror of 3B: source is the logic pin (= AA-i), target is the existing
   * BP whose network is searched for an opposite-type anchor BB-jBB. The
   * just-created src→tgt wire makes `src` reachable at Dl=1 from `tgt`, but
   * the opposite-type filter excludes it (same subtype as itself). No new
   * BPs are created.
   */
  private createMultiWiringRule3CFollowups(
    sourceEnodeId: UUID,
    targetEnodeId: UUID
  ): { addedWires: UUID[]; addedEnodes: UUID[] } {
    const empty = { addedWires: [], addedEnodes: [] };
    if (!this._controller.multiWiring) return empty;
    const circuit = this._controller.getCircuit();
    if (!circuit) return empty;
    const src = circuit.getENode(sourceEnodeId);
    const tgt = circuit.getENode(targetEnodeId);
    if (!src || src.type !== ENodeType.Pin || !src.logicMetadata || !src.component) return empty;
    if (!tgt || tgt.type !== ENodeType.BranchingPoint || !tgt.position) return empty;
    const srcComp = circuit.getComponent(src.component);
    if (!srcComp) return empty;
    const srcPinMeta = srcComp.getPinMetadata(sourceEnodeId);
    const srcSubtype = srcPinMeta?.subtype;
    if (srcSubtype !== 'logicInput' && srcSubtype !== 'logicOutput') return empty;
    const opposite: 'logicInput' | 'logicOutput' =
      srcSubtype === 'logicInput' ? 'logicOutput' : 'logicInput';

    const AA = src.logicMetadata.interface;
    const iAA = src.logicMetadata.index;
    const maxAA = srcComp.getInterfaceMaxIndex(AA);
    const count_AA = maxAA - iAA;
    if (count_AA <= 0) return empty;

    const anchor = this.findBestAnchor(targetEnodeId, opposite);
    if (!anchor) return empty;
    const { Dl, pinComp: BBComp, pinEnode: BBpin } = anchor;
    if (!BBpin.logicMetadata) return empty;
    const BB = BBpin.logicMetadata.interface;
    const jBB = BBpin.logicMetadata.index;
    const maxBB = BBComp.getInterfaceMaxIndex(BB);
    const count = Math.min(maxBB - jBB, count_AA);
    if (count <= 0) return empty;

    // Threshold based on AA pin spacing (source-side interface in 3C).
    const threshold = this.computeAaPinSpacingThreshold(srcComp, AA, src.component, sourceEnodeId);
    if (threshold === null) return empty;

    // prev-sibling reference starts at the TARGET BP world position.
    const tgtWorld = gridToWorldPosition(tgt.position);
    let prevRefXZ = { x: tgtWorld.x, z: tgtWorld.z };
    const addedWires: UUID[] = [];
    for (let j = 1; j <= count; j++) {
      const BBfollowUp = BBComp.getPinIdByInterface(BB, jBB + j);
      if (!BBfollowUp) break;
      const result = this.selectSiblingWithThreshold(BBfollowUp, Dl, prevRefXZ, threshold);
      if (typeof result === 'string') break;
      const AAfollowUp = srcComp.getPinIdByInterface(AA, iAA + j);
      if (!AAfollowUp) break;
      try {
        addedWires.push(this._controller.addWire(result.id, AAfollowUp).id);
      } catch (err) {
        console.warn(
          'multi-wiring rule 3C follow-up failed:',
          err instanceof Error ? err.message : err
        );
      }
      prevRefXZ = result.pos;
    }
    return { addedWires, addedEnodes: [] };
  }

  // ==========================================================================
  // Multi-wiring rule 4: wire-split fan-out
  // ==========================================================================

  /**
   * Triggered after a dbl-click split creates a new BP. Backward-explore the
   * new BP for the closest logic pin AA-i; identify the AA-side and beyond
   * wires; for each follow-up pin AA-(i+j), find a sibling BP at the same
   * Dl, compute candidate position via the `v3Delta` mirror, and split the
   * sibling's wire to its BFS predecessor at that position. Iteration stops
   * on threshold break or empty candidate set.
   */
  private createMultiWiringRule4Followups(
    newBpId: UUID
  ): { addedWires: UUID[]; addedEnodes: UUID[] } {
    const empty = { addedWires: [], addedEnodes: [] };
    if (!this._controller.multiWiring) return empty;
    const circuit = this._controller.getCircuit();
    if (!circuit) return empty;
    const newBp = circuit.getENode(newBpId);
    if (!newBp || newBp.type !== ENodeType.BranchingPoint || !newBp.position) return empty;
    const newBpWires = circuit.getWiresByNode(newBpId);
    if (newBpWires.length !== 2) return empty;

    // 1. Backward exploration with predecessor info
    const reach = findPinsReachableFromBpWithPath(circuit, newBpId);
    if (reach.size === 0) return empty;
    let bestPinId: UUID | null = null;
    let bestReach: { Dl: number; predecessor: UUID } | null = null;
    for (const [pinId, info] of reach) {
      if (!bestReach || info.Dl < bestReach.Dl) {
        bestPinId = pinId;
        bestReach = info;
      }
    }
    if (!bestPinId || !bestReach) return empty;

    const pinEnode = circuit.getENode(bestPinId);
    if (!pinEnode?.logicMetadata || !pinEnode.component) return empty;
    const pinComp = circuit.getComponent(pinEnode.component);
    if (!pinComp) return empty;
    const pinMeta = pinComp.getPinMetadata(bestPinId);
    if (pinMeta?.subtype !== 'logicInput' && pinMeta?.subtype !== 'logicOutput') return empty;
    const AA = pinEnode.logicMetadata.interface;
    const iAA = pinEnode.logicMetadata.index;
    const maxAA = pinComp.getInterfaceMaxIndex(AA);
    const count = maxAA - iAA;
    if (count <= 0) return empty;
    const Dl = bestReach.Dl;

    // 2. Identify AA-side wire vs beyond wire among newBp's two wires.
    const predecessor = bestReach.predecessor;
    let beyondWire = null;
    for (const w of newBpWires) {
      const other = w.node1 === newBpId ? w.node2 : w.node1;
      if (other !== predecessor) beyondWire = w;
    }
    if (!beyondWire) return empty;
    const beyondEnodeId = beyondWire.node1 === newBpId ? beyondWire.node2 : beyondWire.node1;

    // 3. v3Delta = beyondEnode.world - newBp.world
    const newBpWorld = gridToWorldPosition(newBp.position);
    const beyondWorld = this.getEnodeWorldPosition(beyondEnodeId);
    if (!beyondWorld) return empty;
    const v3Delta = { x: beyondWorld.x - newBpWorld.x, z: beyondWorld.z - newBpWorld.z };

    // 4. Threshold using AA pin spacing.
    const threshold = this.computeAaPinSpacingThreshold(pinComp, AA, pinEnode.component, bestPinId);
    if (threshold === null) return empty;

    // 5. Iterate, splitting wires at candidate positions.
    let prevRefXZ = { x: newBpWorld.x, z: newBpWorld.z };
    const addedWires: UUID[] = [];
    const addedEnodes: UUID[] = [];
    for (let j = 1; j <= count; j++) {
      const AAfollowUp = pinComp.getPinIdByInterface(AA, iAA + j);
      if (!AAfollowUp) break;
      const candidates = findBpsAtLogicDistanceWithPath(circuit, AAfollowUp, Dl);
      // Build candidate list with candidate positions and wire-to-split.
      const cand: Array<{
        id: UUID;
        pos: { x: number; z: number };
        wireId: UUID;
      }> = [];
      for (const c of candidates) {
        const sibling = circuit.getENode(c.id);
        if (!sibling?.position) continue;
        const cWorld = gridToWorldPosition(sibling.position);
        const candidatePosXZ = { x: cWorld.x - v3Delta.x, z: cWorld.z - v3Delta.z };
        // Wire to split: between sibling and its BFS predecessor toward AA-(i+j).
        const wireToSplit = circuit
          .getWiresByNode(c.id)
          .find((w) => (w.node1 === c.id ? w.node2 : w.node1) === c.predecessor);
        if (!wireToSplit) continue;
        cand.push({ id: c.id, pos: candidatePosXZ, wireId: wireToSplit.id });
      }
      if (cand.length === 0) break;
      // Pick candidate closest to prevRefXZ; break if best is beyond threshold.
      let best = cand[0]!;
      let bestDist = Math.hypot(best.pos.x - prevRefXZ.x, best.pos.z - prevRefXZ.z);
      for (let k = 1; k < cand.length; k++) {
        const c = cand[k]!;
        const d = Math.hypot(c.pos.x - prevRefXZ.x, c.pos.z - prevRefXZ.z);
        if (d < bestDist) {
          best = c;
          bestDist = d;
        }
      }
      if (bestDist > threshold) break;
      try {
        const splitResult = this._controller.splitWire(
          best.wireId,
          new THREE.Vector3(best.pos.x, 0, best.pos.z)
        );
        addedEnodes.push(splitResult.branchingPoint.id);
        for (const w of splitResult.wires) addedWires.push(w.id);
        prevRefXZ = best.pos;
      } catch (err) {
        console.warn(
          'multi-wiring rule 4 follow-up failed:',
          err instanceof Error ? err.message : err
        );
        break; // chain broken; downstream geometry no longer trustworthy
      }
    }
    return { addedWires, addedEnodes };
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
    const circuit = this._controller.getCircuit();
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
    this._controller.getControls()!.enablePan = false;
    this._controller.on('gridPositionMove', this.handleGridPositionMove);

    this._controller.emit('toolOperationStarted', {
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
    this._controller.circuitWriter.saveEditWirePositions(this.wireDragState.wireId, newPositions);
    this._controller.wireVisualManager.updateWireById(this.wireDragState.wireId);
  }

  /**
   * Cancel wire drag operation and revert to original positions
   */
  private cancelWireDrag(emit: boolean = true): void {
    if (this.mode !== 'wire_drag' || !this.wireDragState) return;

    // Revert intermediate positions
    this._controller.circuitWriter.saveEditWirePositions(
      this.wireDragState.wireId,
      this.wireDragState.originalPositions,
      true
    );
    this._controller.wireVisualManager.updateWireById(this.wireDragState.wireId);

    if (emit) {
      this._controller.emit('toolOperationCancelled', {
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
    this.lastOperationCompletedTs = Date.now();

    const circuit = this._controller.getCircuit();
    if (!circuit) return;
    const wireId = wireDragState.wireId;
    const wire = circuit.getWire(wireId);
    if (!wire) return;

    try {
      //Check for merge/delete conditions
      const finalPositions = this.checkMergeDelete(wire);
      // Persist to model via CircuitWriter
      this._controller.circuitWriter.saveEditWirePositions(
        wireDragState.wireId,
        finalPositions,
        true
      );

      const hoveredElement = this._controller.getHoveredElement();
      // special case 1 : if wire was dragged to enode, we need to split it and connect to it
      if (hoveredElement && hoveredElement.type === 'enode') {
        const targetEnodeId = hoveredElement.id;
        const worldPosition = this._controller.cursorGroundPlanePosition();
        const result = this._controller.splitWire(wireId, worldPosition, targetEnodeId);
        this._controller.emit('toolOperationCompleted', {
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
        this._controller
          .getSelectionManager()
          .selectOne('enode', targetEnodeId, { componentId: null });
        return;
      }
      // special case 2 : if wire was dragged to ANOTHER wire, we split that wire with a branching point,
      // then split our dragged wire to connect to that branching point
      if (hoveredElement && hoveredElement.type === 'wire' && hoveredElement.id !== wireId) {
        const targetWireId = hoveredElement.id;
        const worldPosition = this._controller.cursorGroundPlanePosition();
        const targetEnodeId = this.createBranchingPointOnWire(targetWireId, worldPosition);
        const result = this._controller.splitWire(wireId, worldPosition, targetEnodeId);
        this._controller.emit('toolOperationCompleted', {
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
          this._controller
            .getSelectionManager()
            .selectOne('enode', targetEnodeId, { componentId: null });
        }
        return;
      }

      // Default case : Update visual
      this._controller.wireVisualManager.updateWireById(wireDragState.wireId);
      this._controller.autoAdjustCircuitGridSize();
      this._controller.emit('toolOperationCompleted', {
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
      this._controller.emit('toolValidationError', {
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
    const circuit = this._controller.getCircuit();
    if (!circuit) return;

    const component = circuit.getComponent(componentId);
    if (!component) return;

    this.mode = 'component_drag';
    this.componentDragState = {
      componentId,
      initialPosition: worldPosition.clone(),
    };

    // block MapControls panning and register for gridPositionMove events
    this._controller.getControls()!.enablePan = false;
    this._controller.on('gridPositionMove', this.handleGridPositionMove);

    this._controller.emit('toolOperationStarted', {
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

    const object = this._controller.getObject3D('component', this.componentDragState.componentId);
    if (!object) return;

    const newPosition = nearestWorldSnapPosition(worldPosition);
    object.position.copy(newPosition);

    // moving wires connected to component in real-time during drag
    this._controller.wireVisualManager.updateWiresForComponent(this.componentDragState.componentId);
  }

  /**
   * Cancel component drag operation and revert to original positions
   */
  private cancelComponentDrag(emit: boolean = true): void {
    if (this.mode !== 'component_drag' || !this.componentDragState) return;

    // restore original component visual
    const object = this._controller.getObject3D('component', this.componentDragState.componentId);
    if (!object) return;

    object.position.copy(this.componentDragState.initialPosition);
    // restore wires connected to component
    this._controller.wireVisualManager.updateWiresForComponent(this.componentDragState.componentId);

    if (emit) {
      this._controller.emit('toolOperationCancelled', {
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

    const circuit = this._controller.getCircuit();
    if (!circuit) return;

    const componentId = this.componentDragState.componentId;
    const object = this._controller.getObject3D('component', componentId);
    if (!object) return;

    try {
      const component = this._controller.circuitWriter.saveEditComponent(componentId, object, true);
      for (const connectedWire of circuit.getWiresByComponent(componentId)) {
        this._controller.circuitWriter.saveSimplifyWirePositions(connectedWire.id);
        this._controller.wireVisualManager.updateWireById(connectedWire.id);
      }
      this._controller.autoAdjustCircuitGridSize();
      this._controller.emit('toolOperationCompleted', {
        toolType: this.type,
        mode: 'component_drag',
        operationData: {
          componentId: componentId,
          newPosition: component.position,
        },
        changedData: {},
      });
    } catch (error) {
      this._controller.emit('toolValidationError', {
        toolType: this.type,
        mode: this.mode,
        errorMessage: `Failed to commit component drag: ${(error as Error).message}`,
      });
      this.cancelComponentDrag(false);
    }

    // Reset state
    this.mode = 'idle';
    this.componentDragState = null;
    this.lastOperationCompletedTs = Date.now();
  }

  /**
   * Start branching point dragging operation
   * @param enodeId - UUID of the branching point being dragged
   * @param worldPosition - Initial position
   */
  private startBPDrag(enodeId: UUID, worldPosition: THREE.Vector3): void {
    const circuit = this._controller.getCircuit();
    if (!circuit) return;

    const branchingPoint = circuit.getENode(enodeId);
    if (!branchingPoint) return;

    this.mode = 'bp_drag';
    this.bpDragState = {
      enodeId,
      initialPosition: worldPosition.clone(),
    };
    // block MapControls panning and register for gridPositionMove events
    this._controller.getControls()!.enablePan = false;
    this._controller.on('gridPositionMove', this.handleGridPositionMove);

    this._controller.emit('toolOperationStarted', {
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

    const visual = this._controller.enodeObject3Ds.get(this.bpDragState.enodeId);
    if (!visual) return;

    visual.position.copy(nearestWorldSnapPosition(worldPosition));
    const enode = this._controller.circuitWriter.saveEditBranchingPoint(visual);

    // Update all wires connected to this branching point
    for (const connectedWireId of enode.wires) {
      this._controller.wireVisualManager.updateWireById(connectedWireId);
    }
  }

  /**
   * Cancel branching point drag operation and revert to original positions
   */
  private cancelBPDrag(emit: boolean = true): void {
    if (this.mode !== 'bp_drag' || !this.bpDragState) return;

    const initialPosition = this.bpDragState.initialPosition;
    // Update bp visual
    const visual = this._controller.enodeObject3Ds.get(this.bpDragState.enodeId);
    if (!visual) return;
    visual.position.copy(initialPosition);

    const enode = this._controller.circuitWriter.saveEditBranchingPoint(visual);

    // restore all wires connected to this branching point
    for (const connectedWireId of enode.wires) {
      this._controller.wireVisualManager.updateWireById(connectedWireId);
    }

    if (emit) {
      this._controller.emit('toolOperationCancelled', {
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

    const circuit = this._controller.getCircuit();
    if (!circuit) return;

    try {
      const branchingPoint = circuit.getENode(this.bpDragState.enodeId);
      if (!branchingPoint) {
        throw new Error(`Branching point ${this.bpDragState.enodeId} not found`);
      }
      // Branching point drag position is already updated, but it's a good place to simplify wire path if necessary
      for (const connectedWireId of branchingPoint.wires) {
        this._controller.circuitWriter.saveSimplifyWirePositions(connectedWireId);
        this._controller.wireVisualManager.updateWireById(connectedWireId);
      }
      this._controller.autoAdjustCircuitGridSize();
      this._controller.emit('toolOperationCompleted', {
        toolType: this.type,
        mode: 'bp_drag',
        operationData: {
          branchingPointId: this.bpDragState.enodeId,
          newPosition: branchingPoint.position,
        },
        changedData: {},
      });
    } catch (error) {
      this._controller.emit('toolValidationError', {
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
    this.lastOperationCompletedTs = Date.now();
  }

  /**
   * private helpers
   */

  /**
   * Create a standalone branching point at empty grid position (T048)
   * @param worldPosition - 3D position in world space
   */
  private createStandaloneBranchingPoint(worldPosition: THREE.Vector3): UUID | undefined {
    const circuit = this._controller.getCircuit();
    if (!circuit) return;
    try {
      // Create branching point in circuit model (no sourceType initially)
      const branchingPoint = this._controller.addBranchingPoint(worldPosition);
      this._controller.emit('toolOperationCompleted', {
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
      this._controller.emit('toolValidationError', {
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
    const circuit = this._controller.getCircuit();
    if (!circuit) return;

    try {
      const result = this._controller.splitWire(wireId, worldPosition);
      // Emit success event
      this._controller.emit('toolOperationCompleted', {
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
      this._controller.emit('toolValidationError', {
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
    const object = this._controller.getObject3D('component', componentId);
    if (!object) {
      return;
    }
    const currentAngle = object.rotation.y;
    const newAngle = (currentAngle - Math.PI / 2) % (Math.PI * 2);
    object.rotation.set(0, newAngle, 0);

    try {
      const component = this._controller.circuitWriter.saveEditComponent(componentId, object);
      this._controller.wireVisualManager.updateWiresForComponent(component.id);
      this._controller.emit('toolOperationCompleted', {
        toolType: this.type,
        mode: 'component_rotate',
        operationData: {
          componentId: componentId,
          newPosition: component.position,
        },
        changedData: {},
      });
    } catch (error) {
      this._controller.emit('toolValidationError', {
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
    const circuit = this._controller.getCircuit();
    if (!circuit) return positions;

    const node1 = circuit.getENode(wire.node1);
    const node2 = circuit.getENode(wire.node2);
    if (!node1 || !node2) return positions;

    const endpoint1 = node1.getPosition(circuit);
    const endpoint2 = node2.getPosition(circuit);

    const threshold = 0.4; // Grid units

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
    const circuit = this._controller.getCircuit();
    if (!circuit) return;

    const component = circuit.getComponent(componentId);
    if (!component) return;

    const sources = component.pins.map((pinId) => {
      const enode = circuit.getENode(pinId);
      return enode ? enode.source : null;
    });

    this.clipboard = {
      componentType: component.type,
      rotation: gridToWorldRotation(component.rotation),
      pinSources: sources,
      config: new Map(component.config), // Deep copy of config
    };
  }

  /**
   * Paste component from clipboard at hovered position
   * Creates a new component with the type and rotation from clipboard
   */
  private pasteComponent(): void {
    if (!this.clipboard) return;

    const circuit = this._controller.getCircuit();
    if (!circuit) return;

    // Get cursor position
    const worldPosition = this._controller.cursorGroundPlanePosition();

    this._controller.addComponent(
      this.clipboard.componentType,
      worldPosition,
      this.clipboard.rotation,
      this.clipboard.config,
      this.clipboard.pinSources
    );

    this._controller.autoAdjustCircuitGridSize();
  }

  /**
   * Cycles the sourceType of an enode: null → Voltage → Current → null
   * Updates both model and visual immediately.
   * @param enodeId - UUID of the enode to cycle
   * @param hitbox - hitbox of the enode being clicked
   */
  private cycleEnodeSourceType(enodeId: UUID, hitbox: THREE.Object3D): void {
    if (hitbox.userData.lockedSourceType) return; // do not update locked source types
    if (!hitbox.parent) return;

    const nextSourceType = getNextSourceType(hitbox.parent.userData.sourceType);
    this._controller.updateEnodeSourceType(enodeId, nextSourceType || null);
  }

  /**
   * Open config panel for component (T014)
   * Converts component world position to screen coordinates and opens panel
   * @param componentId - UUID of the component to configure
   * @param event - Mouse event for screen position
   */
  private openConfigPanel(componentId: UUID, event: MouseEvent): void {
    const screenPosition = { x: event.clientX, y: event.clientY };
    this._controller.openConfigPanel(componentId, screenPosition);
  }

  // ========================================================================
  // Add Component Mode
  // ========================================================================

  /**
   * Enter add_component mode: open the picker widget and listen for cursor movement
   * @param event - Mouse event (used for widget positioning)
   */
  private enterAddComponentMode(event: MouseEvent): void {
    if (!this.pickerWidget) return;

    this.mode = 'add_component';
    const screenPos = { x: event.clientX, y: event.clientY };
    this.pickerWidget.open(screenPos);

    // Listen for cursor movement for ghost preview
    this._controller.on('gridPositionMove', this.handleGridPositionMove);

    // If there was a previous selection, recreate the ghost
    if (this.pickerWidget.currentSelection) {
      this.pickerSelection = this.pickerWidget.currentSelection;
      this.createGhostPreview(this.pickerSelection);
    }

    this._controller.emit('toolOperationStarted', {
      toolType: this.type,
      mode: 'add_component',
      operationData: {},
    });
  }

  /**
   * Exit add_component mode: close widget, dispose ghost, return to idle
   */
  private exitAddComponentMode(): void {
    if (this.mode !== 'add_component') return;

    this.disposeGhostPreview();
    this.pickerWidget?.close();
    this._controller.off('gridPositionMove', this.handleGridPositionMove);
    this.hasOverlap = false;

    this._controller.emit('toolOperationCancelled', {
      toolType: this.type,
      mode: 'add_component',
    });

    this.mode = 'idle';
  }

  /**
   * Called when user selects or deselects an item in the picker widget
   */
  private onPickerSelectionChange(selection: PickerSelection | null): void {
    this.pickerSelection = selection;
    this.disposeGhostPreview();
    if (selection) {
      this.createGhostPreview(selection);
    }
  }

  /**
   * Place the currently selected item (component or branching point) at cursor position
   */
  private placeSelectedItem(): void {
    if (!this.pickerSelection) return;

    const worldPosition = this._controller.cursorGroundPlanePosition();

    if (this.pickerSelection === BRANCHING_POINT_SENTINEL) {
      const enodeId = this.createStandaloneBranchingPoint(worldPosition);
      if (enodeId) {
        this._controller.getSelectionManager().selectOne('enode', enodeId, { componentId: null });
      }
      // Recreate ghost for next placement
      this.disposeGhostPreview();
      this.createGhostPreview(this.pickerSelection);
      return;
    }

    try {
      const component = this._controller.addComponent(this.pickerSelection, worldPosition, null);
      this._controller.autoAdjustCircuitGridSize();
      this._controller.emit('toolOperationCompleted', {
        toolType: this.type,
        mode: 'add_component',
        operationData: {
          componentId: component.id,
          componentType: this.pickerSelection,
          position: worldPosition.clone(),
        },
        changedData: { addedComponents: [component.id] },
      });
      // Recreate ghost for next placement
      this.disposeGhostPreview();
      this.createGhostPreview(this.pickerSelection);
    } catch (error) {
      this._controller.emit('toolValidationError', {
        toolType: this.type,
        mode: 'add_component',
        errorMessage: `Failed to place component: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Update ghost preview position and overlap check during add_component mode
   */
  private updateAddComponentPreview(worldPosition: THREE.Vector3): void {
    if (!this.ghostPreview) return;

    const snappedPosition = new THREE.Vector3(
      Math.round(worldPosition.x),
      0,
      Math.round(worldPosition.z)
    );
    this.ghostPreview.position.copy(snappedPosition);

    // Check for overlap
    const previousOverlap = this.hasOverlap;
    this.hasOverlap = this.checkGhostOverlap();

    if (this.hasOverlap && !previousOverlap) {
      this.applyInvalidEffect(this.ghostPreview);
    } else if (!this.hasOverlap && previousOverlap) {
      this.removeInvalidEffect(this.ghostPreview);
    }
  }

  // ========================================================================
  // Ghost Preview
  // ========================================================================

  /**
   * Create ghost preview for the selected item
   * @param selection - Component type or branching point sentinel
   */
  private createGhostPreview(selection: PickerSelection): void {
    this.disposeGhostPreview();

    try {
      let visual: THREE.Object3D;

      if (selection === BRANCHING_POINT_SENTINEL) {
        // Create a branching point preview using the factory
        const tempEnode = new ENode(
          ENodeType.BranchingPoint,
          undefined,
          undefined,
          new Position(0, 0),
            undefined,
            'free',
            undefined
        );
        visual = this._controller.branchingPointVisualFactory.createVisual(tempEnode);
      } else {
        const factory = this._controller.factoryRegistry.get(selection);
        const tempComponent = new Component(
          selection,
          new Position(0, 0),
          new Rotation(0),
          [] // Empty pins array for preview
        );
        visual = factory.createVisual(tempComponent, this._controller.visualContext);
        visual.rotation.set(0, factory.defaultRotation(), 0);
      }

      if (!(visual instanceof THREE.Group)) {
        console.warn(`Factory returned non-Group object for ${selection}`);
        return;
      }

      // Mark as preview
      visual.userData.preview = true;
      visual.traverse((child) => {
        child.userData.preview = true;
      });

      this.ghostPreview = visual;
      this.applyGhostEffect(this.ghostPreview);

      // Position at current cursor
      const cursorPos = this._controller.cursorGroundPlanePosition();
      this.ghostPreview.position.set(Math.round(cursorPos.x), 0, Math.round(cursorPos.z));

      this._controller.getScene().add(this.ghostPreview);
    } catch (error) {
      console.warn(`Failed to create ghost preview for ${selection}:`, error);
      this.ghostPreview = null;
    }
  }

  /**
   * Dispose ghost preview and cleanup resources
   */
  private disposeGhostPreview(): void {
    if (!this.ghostPreview) return;

    this._controller.getScene().remove(this.ghostPreview);
    this.ghostPreview.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
    this.ghostPreview = null;
    this.hasOverlap = false;
  }

  /**
   * Apply semi-transparent ghost effect to preview object
   */
  private applyGhostEffect(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((mat: THREE.Material) => mat.clone());
          child.material.forEach((mat: THREE.Material) => {
            mat.transparent = true;
            mat.opacity = 0.5;
          });
        } else {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.5;
        }
      }
    });
  }

  /**
   * Check if ghost preview overlaps with existing components
   */
  private checkGhostOverlap(): boolean {
    if (!this.ghostPreview) return false;

    // Branching points don't need overlap detection
    if (this.pickerSelection === BRANCHING_POINT_SENTINEL) return false;

    const previewBox = new THREE.Box3().setFromObject(this.ghostPreview);
    const componentObjects = this._controller.componentObject3Ds;

    for (const [_id, otherGroup] of componentObjects) {
      // to make this rule not too strict we signal overlap only if ghost box contains the center of other component box
      if (previewBox.containsPoint(otherGroup.position)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Apply red emissive to indicate invalid placement
   */
  private applyInvalidEffect(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: THREE.Material) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.emissive.setHex(0xff0000);
              mat.emissiveIntensity = 0.5;
            }
          });
        } else if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissive.setHex(0xff0000);
          child.material.emissiveIntensity = 0.5;
        }
      }
    });
  }

  /**
   * Remove red emissive invalid placement effect
   */
  private removeInvalidEffect(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: THREE.Material) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0;
            }
          });
        } else if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissive.setHex(0x000000);
          child.material.emissiveIntensity = 0;
        }
      }
    });
  }
}
