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
import type { IEditingTool, ToolType, CursorType, SelectionData, HoverableType } from '../../shared/types';
import type { CircuitSceneManager } from '../CircuitSceneManager';
import type { UUID } from '../../../core/types/Identifier';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';

/**
 * Build tool operating modes
 *
 * State transitions:
 *   idle → wire_creating (click enode)
 *   idle → element_dragging (pointerdown on selected element)
 *   idle → wire_point_dragging (click wire or intermediate point)
 *   idle → bp_dragging (double-click+hold branching point)
 *   {any active mode} → idle (pointerup, Escape, or operation complete)
 */
type BuildToolMode = 'idle' | 'wire_creating' | 'element_dragging' | 'wire_point_dragging' | 'bp_dragging';

/**
 * State during wire creation operation
 */
interface WireCreatingState {
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
 * State during component or branching point drag
 */
interface ElementDragState {
  /**
   * Current selection being dragged
   */
  selection: SelectionData;

  /**
   * Original positions of all dragged objects (for cancel)
   * Maps UUID → {type, position}
   */
  positionsAtStart: Map<UUID, { type: HoverableType; position: THREE.Vector3 }>;

  /**
   * World position where drag started (for delta calculation)
   */
  startPosition: THREE.Vector3;

  /**
   * Current cursor position (updated during drag)
   */
  currentPosition: THREE.Vector3;
}

/**
 * State during wire intermediate point drag
 */
interface WirePointDragState {
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

/**
 * Unified tool for building circuits
 * Implements all circuit editing functionality in a single tool
 */
export class BuildTool implements IEditingTool {
  readonly type: ToolType = 'build';

  private _sceneManager: CircuitSceneManager;

  // Tool state
  private mode: BuildToolMode = 'idle';
  private lastCancelledOpTs: number = 0;

  // Mode-specific state
  private wireCreatingState: WireCreatingState | null = null;
  private elementDragState: ElementDragState | null = null;
  private wirePointDragState: WirePointDragState | null = null;
  private bpDragState: BPDragState | null = null;

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
    this.wireCreatingState = null;
    this.elementDragState = null;
    this.wirePointDragState = null;
    this.bpDragState = null;
    this.lastCancelledOpTs = 0;

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
    // Cancel any active operations
    if (this.mode === 'wire_creating') {
      // TODO: Implement cancelWireCreation()
      // this.cancelWireCreation();
    } else if (this.mode === 'element_dragging') {
      // TODO: Implement cancelElementDrag()
      // this.cancelElementDrag();
    } else if (this.mode === 'wire_point_dragging') {
      // TODO: Implement cancelWirePointDrag()
      // this.cancelWirePointDrag();
    } else if (this.mode === 'bp_dragging') {
      // TODO: Implement cancelBPDrag()
      // this.cancelBPDrag();
    }

    const container = this._sceneManager.getContainer();
    // Remove event listeners
    this._sceneManager.off('gridPositionMove', this.handleGridPositionMove);
    container.removeEventListener('pointerdown', this.handlePointerDown);
    container.removeEventListener('pointerup', this.handlePointerUp);
    container.removeEventListener('dblclick', this.handleDblClick);
    window.removeEventListener('keydown', this.handleKeyDown);

    // Reset all state
    this.mode = 'idle';
    this.wireCreatingState = null;
    this.elementDragState = null;
    this.wirePointDragState = null;
    this.bpDragState = null;

    // Safety: re-enable camera controls
    const controls = this._sceneManager.getControls();
    if (controls) {
      controls.enablePan = true;
    }
  }

  /**
   * Get the current cursor type for this tool
   * Returns cursor based on current mode and hover state
   */
  getCursorType(): CursorType {
    const hoveredElement = this._sceneManager.getHoveredElement();

    // During wire creation
    if (this.mode === 'wire_creating') {
      if (!this.isValidWireTarget(hoveredElement)) {
        return 'not-allowed';
      }
      return 'crosshair';
    }

    // During drag operations
    if (
      this.mode === 'element_dragging' ||
      this.mode === 'wire_point_dragging' ||
      this.mode === 'bp_dragging'
    ) {
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
    if (this.mode === 'wire_creating' && this.wireCreatingState?.previewWire) {
      previews.push(this.wireCreatingState.previewWire);
    }

    return previews;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Check if hoveredElement is a valid wire target during wire creation
   * @param hoveredElement - Current hovered element or null
   * @returns True if target is valid for wire endpoint
   */
  private isValidWireTarget(hoveredElement: { type: HoverableType; id: UUID } | null): boolean {
    if (!hoveredElement) return true; // Empty space is valid (creates BP)
    if (!this.wireCreatingState) return false;

    // Enode is valid unless it's the source
    if (hoveredElement.type === 'enode') {
      return hoveredElement.id !== this.wireCreatingState.sourceEnodeId;
    }

    // Wire is valid (creates BP on wire)
    if (hoveredElement.type === 'wire') {
      return true;
    }

    // Component is not a valid target
    return false;
  }

  /**
   * Disambiguate click target based on priority
   * Priority: enode > selected element > wire > empty
   * @param hoveredElement - Current hovered element
   * @returns Operation type to perform
   */
  private disambiguateClick(
    hoveredElement: { type: HoverableType; id: UUID; object3D: any } | null
  ): 'wire_creation' | 'element_drag' | 'wire_drag' | 'none' {
    if (!hoveredElement) return 'none';

    const selection = this._sceneManager.getSelectionManager().getSelection();

    // Priority 1: Enode (start wire creation)
    if (hoveredElement.type === 'enode') {
      return 'wire_creation';
    }

    // Priority 2: Selected element (start drag)
    if (selection && selection.kind === 'mono' && hoveredElement.id === selection.id) {
      return 'element_drag';
    }

    // Priority 3: Wire (drag intermediate point)
    if (hoveredElement.type === 'wire') {
      return 'wire_drag';
    }

    return 'none';
  }

  /**
   * Check if wire intermediate point should be merged or deleted
   * Returns updated positions array after merge/delete check
   * @param wire - Wire object with current intermediate positions
   * @returns Updated positions array (may be shorter if points merged)
   */
  private checkMergeDelete(wire: {
    intermediatePositions: { x: number; y: number }[];
  }): { x: number; y: number }[] {
    // TODO: Implement merge/delete logic
    // For now, return positions unchanged
    return wire.intermediatePositions;
  }

  // ========================================================================
  // Event Handlers
  // ========================================================================

  /**
   * Handle pointer down event
   * Routes to appropriate operation based on hover target and state
   */
  private handlePointerDown(event: MouseEvent): void {
    // Only handle left click
    if (event.button !== 0) return;

    // TODO: Implement pointer down logic
  }

  /**
   * Handle pointer up event
   * Completes current operation based on mode
   */
  private handlePointerUp(event: MouseEvent): void {
    // Only handle left click
    if (event.button !== 0) return;

    // TODO: Implement pointer up logic
  }

  /**
   * Handle grid position move event
   * Updates preview or drag position during active operations
   */
  private handleGridPositionMove(position: THREE.Vector3): void {
    // TODO: Implement position move logic
  }

  /**
   * Handle keyboard events
   * Supports Escape (cancel), Delete/Backspace (delete), R (rotate)
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // TODO: Implement keyboard handling
  }

  /**
   * Handle double-click events
   * Routes to rotation (component) or branching point creation (wire/empty)
   */
  private handleDblClick(event: MouseEvent): void {
    // TODO: Implement double-click logic
  }
}
