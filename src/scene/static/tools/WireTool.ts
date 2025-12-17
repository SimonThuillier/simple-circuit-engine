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
import type { IEditingTool, ToolType, CursorType, MonoSelectionData } from '../../shared/types';
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
}
