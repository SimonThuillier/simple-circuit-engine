/**
 * CircuitEngine Type Contracts
 * @module specs/014-circuit-engine/contracts
 *
 * These are the TypeScript interface contracts for the CircuitEngine feature.
 * Implementation MUST conform to these interfaces.
 */

import type * as THREE from 'three';
import type { MapControls } from 'three/addons/controls/MapControls.js';
import type { Line2 } from 'three/examples/jsm/lines/Line2.js';
import type { UUID } from '../../../src/core/types/Identifier';
import type { Circuit } from '../../../src/core/Circuit';
import type { IFactoryRegistry } from '../../../src/scene/shared/components/ComponentVisualFactory';
import type { BranchingPointVisualFactory } from '../../../src/scene/shared/components/BranchingPointVisualFactory';
import type { WireVisualManager } from '../../../src/scene/shared/WireVisualManager';
import type { HoverManager } from '../../../src/scene/shared/HoverManager';
import type { ControllerEventMap, ControllerOptions, ToolType } from '../../../src/scene/shared/types';
import type { BehaviorRegistry } from '../../../src/core/simulation/behaviors/BehaviorRegistry';
import type { RunnerOptions } from '../../../src/core/simulation/types/RunnerOptions';
import type { CircuitController } from '../../../src/scene/static/CircuitController';
import type { CircuitRunnerController } from '../../../src/scene/simulation/CircuitRunnerController';

// ============================================================================
// Engine Mode
// ============================================================================

/**
 * Operating mode of the CircuitEngine
 * - 'edit': Static circuit editing mode (tools, selection, manipulation)
 * - 'simulation': Live simulation mode (playback, animation, user commands)
 */
export type EngineMode = 'edit' | 'simulation';

// ============================================================================
// Shared Resources
// ============================================================================

/**
 * Resources shared between edit and simulation controllers.
 * Created by CircuitEngine and injected into both controllers.
 */
export interface SharedResources {
  /** Three.js scene containing all circuit visuals */
  scene: THREE.Scene;

  /** Perspective camera for rendering */
  camera: THREE.PerspectiveCamera;

  /** MapControls for pan/zoom/rotate interaction */
  mapControls: MapControls;

  /** Grid helper (may be null before circuit loaded) */
  grid: THREE.GridHelper | null;

  /** Registry of component visual factories */
  factoryRegistry: IFactoryRegistry;

  /** Factory for branching point visuals */
  branchingPointVisualFactory: BranchingPointVisualFactory;

  /** Manager for wire Line2 visuals */
  wireVisualManager: WireVisualManager;

  /** Manager for hover detection */
  hoverManager: HoverManager;

  /** Map of component UUIDs to their Object3D groups */
  componentObject3Ds: Map<UUID, THREE.Object3D>;

  /** Map of enode UUIDs to their Object3D groups */
  enodeObject3Ds: Map<UUID, THREE.Object3D>;

  /** Map of wire UUIDs to their Line2 objects */
  wireObject3Ds: Map<UUID, Line2>;
}

// ============================================================================
// Engine Events
// ============================================================================

/**
 * Event emitted when engine mode changes
 */
export interface ModeChangedEvent {
  /** New active mode */
  mode: EngineMode;
  /** Previous mode before transition */
  previousMode: EngineMode;
}

/**
 * Combined event map for CircuitEngine.
 * Includes all controller events plus engine-specific events.
 */
export interface CircuitEngineEventMap extends ControllerEventMap {
  /** Emitted after mode transition completes */
  modeChanged: ModeChangedEvent;
}

// ============================================================================
// Engine Options
// ============================================================================

/**
 * Configuration options for CircuitEngine initialization
 */
export interface CircuitEngineOptions extends ControllerOptions {
  /**
   * Initial operating mode
   * @default 'edit'
   */
  initialMode?: EngineMode;

  /**
   * Options passed to CircuitRunner when created
   * @default { enableHistory: false }
   */
  runnerOptions?: RunnerOptions;
}

// ============================================================================
// CircuitEngine Interface
// ============================================================================

/**
 * Public interface for CircuitEngine facade.
 * Implementations must conform to this contract.
 */
export interface ICircuitEngine {
  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Initialize the engine with a DOM container.
   * Creates Three.js scene, camera, controls, and both controllers.
   *
   * @param container - HTMLElement to mount the scene
   * @param options - Configuration options
   * @throws {TypeError} If container is not a valid HTMLElement
   * @throws {Error} If already initialized
   * @emits ready When initialization completes
   */
  initialize(container: HTMLElement, options?: CircuitEngineOptions): void;

  /**
   * Dispose all resources and clean up.
   * Stops simulation if running, disposes both controllers, releases WebGL resources.
   *
   * @throws {Error} If not initialized or already disposed
   */
  dispose(): void;

  /** Check if engine is initialized */
  readonly isInitialized: boolean;

  /** Check if engine is disposed */
  readonly isDisposed: boolean;

  // ── Mode Management ───────────────────────────────────────────────────────

  /**
   * Current operating mode
   */
  readonly mode: EngineMode;

  /**
   * Switch between edit and simulation modes.
   *
   * Edit → Simulation:
   * - Cancels active tool operations
   * - Creates CircuitRunner from current circuit
   * - Loads runner into simulation controller
   *
   * Simulation → Edit:
   * - Stops simulation (resets to tick 0)
   * - Clears runner from simulation controller
   * - Re-enables edit mode
   *
   * @param mode - Target mode to switch to
   * @throws {Error} If not initialized
   * @emits modeChanged When transition completes
   */
  setMode(mode: EngineMode): void;

  // ── Circuit Management ────────────────────────────────────────────────────

  /**
   * Load a circuit for editing/simulation.
   * Creates visuals in the scene via the edit controller.
   *
   * @param circuit - Circuit to load, or null to clear
   * @throws {Error} If not initialized
   * @emits circuitLoaded When circuit is loaded
   * @emits circuitCleared When circuit is cleared
   */
  setCircuit(circuit: Circuit | null): void;

  /**
   * Get the currently loaded circuit
   */
  getCircuit(): Circuit | null;

  // ── Controller Access ─────────────────────────────────────────────────────

  /**
   * Get the edit controller for advanced operations.
   * Use with caution; prefer facade methods for most operations.
   *
   * @throws {Error} If not initialized
   */
  getEditController(): CircuitController;

  /**
   * Get the simulation controller for advanced operations.
   * Use with caution; prefer facade methods for most operations.
   *
   * @throws {Error} If not initialized
   */
  getSimulationController(): CircuitRunnerController;

  // ── Edit Mode Operations ──────────────────────────────────────────────────

  /**
   * Activate an editing tool.
   *
   * @param toolType - Tool to activate
   * @throws {Error} If not in edit mode
   * @emits toolActivated
   */
  setActiveTool(toolType: ToolType): void;

  /**
   * Get the currently active tool
   *
   * @throws {Error} If not in edit mode
   */
  getActiveTool(): ToolType | null;

  /**
   * Enable or disable edit mode (tool system).
   *
   * @param enabled - True to enable, false to disable
   * @throws {Error} If not in edit mode
   */
  setEditModeEnabled(enabled: boolean): void;

  // ── Simulation Mode Operations ────────────────────────────────────────────

  /**
   * Start automatic simulation playback.
   *
   * @throws {Error} If not in simulation mode
   * @emits simulationPlayed
   */
  play(): void;

  /**
   * Pause automatic simulation playback.
   *
   * @throws {Error} If not in simulation mode
   * @emits simulationPaused
   */
  pause(): void;

  /**
   * Execute a single simulation tick.
   * Pauses if currently playing.
   *
   * @throws {Error} If not in simulation mode
   * @emits simulationStepped
   */
  step(): void;

  /**
   * Stop simulation and reset to initial state.
   *
   * @throws {Error} If not in simulation mode
   * @emits simulationStopped
   */
  stop(): void;

  /**
   * Check if simulation is currently playing
   */
  readonly isPlaying: boolean;

  /**
   * Get current simulation tick
   */
  readonly currentTick: number;

  /**
   * Tick interval in milliseconds
   */
  tickInterval: number;

  // ── Three.js Access ───────────────────────────────────────────────────────

  /**
   * Get the Three.js scene for external rendering.
   *
   * @throws {Error} If not initialized
   */
  getScene(): THREE.Scene;

  /**
   * Get the camera for external rendering.
   *
   * @throws {Error} If not initialized
   */
  getCamera(): THREE.PerspectiveCamera;

  /**
   * Get the MapControls for external manipulation.
   *
   * @throws {Error} If not initialized
   */
  getControls(): MapControls;

  /**
   * Handle container resize.
   * Updates camera aspect ratio and Line2 resolution.
   *
   * @param width - New width (optional, uses container if omitted)
   * @param height - New height (optional, uses container if omitted)
   */
  onContainerResize(width?: number, height?: number): void;

  // ── Event System ──────────────────────────────────────────────────────────

  /**
   * Subscribe to an engine event.
   *
   * @param event - Event name
   * @param callback - Handler function
   */
  on<K extends keyof CircuitEngineEventMap>(
    event: K,
    callback: (payload: CircuitEngineEventMap[K]) => void
  ): void;

  /**
   * Unsubscribe from an engine event.
   *
   * @param event - Event name
   * @param callback - Handler function (must be same reference)
   */
  off<K extends keyof CircuitEngineEventMap>(
    event: K,
    callback: (payload: CircuitEngineEventMap[K]) => void
  ): void;
}
