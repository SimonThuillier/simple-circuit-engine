/**
 * CircuitEngine - Unified Facade for Circuit Editing and Simulation
 * @module scene/CircuitEngine
 *
 * Provides a unified API for both static circuit editing and live simulation,
 * managing mode transitions and resource sharing between controllers.
 */

import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import type { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { EventEmitter } from './shared/EventEmitter';

import type { Circuit, BehaviorRegistry, UUID } from 'simple-circuit-engine/core';

import { CircuitController } from './static/CircuitController';
import { CircuitRunnerController } from './simulation/CircuitRunnerController';
import { HoverManager } from './shared/HoverManager';
import { WireVisualManager } from './shared/WireVisualManager';
import { BranchingPointVisualFactory } from './shared/BranchingPointVisualFactory';
import { createPerspectiveCamera, updateCamera } from './shared/utils/CameraUtils';
import { setupSceneLights } from './shared/utils/LightingUtils';
import type { IFactoryRegistry } from './shared/components/ComponentVisualFactory';
import type {
  EngineMode,
  SharedResources,
  CircuitEngineEventMap,
  EngineOptions,
  ToolType,
} from './shared/types';
import { createGridHelper } from './shared/utils/GeometryUtils';
import { engineOptions } from './shared/utils/Options';
import { createMapControls } from './shared/utils/ControlsUtils';
import { WidgetsManager } from './widgets';

/**
 * CircuitEngine - Unified Facade for Circuit Editing and Simulation
 *
 * Manages two internal controllers:
 * - CircuitController: Static editing with tools, selection, and manipulation
 * - CircuitRunnerController: Live simulation with playback and animation
 *
 * Both controllers share the same Three.js scene, camera, and visual objects,
 * enabling seamless transitions between edit and simulation modes.
 *
 * @example
 * ```typescript
 * const engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
 * engine.initialize(container);
 * engine.setCircuit(circuit);
 *
 * // Edit mode (default)
 * engine.setEditModeEnabled(true);
 * engine.setActiveTool('build');
 *
 * // Switch to simulation
 * engine.setMode('simulation');
 * engine.play();
 *
 * // Switch back to edit
 * engine.setMode('edit');
 * ```
 */
export class CircuitEngine extends EventEmitter<CircuitEngineEventMap> {
  // Dependencies
  private readonly _factoryRegistry: IFactoryRegistry;
  private readonly _behaviorRegistry: BehaviorRegistry;

  // Shared resources
  private _sharedResources: SharedResources | null = null;
  private _container: HTMLElement | null = null;

  // Controllers
  private _editController: CircuitController | null = null;
  private _simulationController: CircuitRunnerController | null = null;

  // State
  private _mode: EngineMode = 'edit';
  private _multiWiring: boolean = false;
  private _initialized: boolean = false;
  private _options: EngineOptions | null = null;
  private _disposed: boolean = false;

  // Event forwarding cleanup functions
  private _editControllerCleanup: (() => void) | null = null;
  private _simulationControllerCleanup: (() => void) | null = null;

  // Integrated overlay widgets
  private _widgetsManager: WidgetsManager | null = null;

  /**
   * Create a new CircuitEngine instance.
   *
   * @param factoryRegistry - Registry of component visual factories
   * @param behaviorRegistry - Registry of component simulation behaviors
   * @throws {TypeError} If factoryRegistry or behaviorRegistry is null/undefined
   */
  constructor(factoryRegistry: IFactoryRegistry, behaviorRegistry: BehaviorRegistry) {
    super();

    if (!factoryRegistry) {
      throw new TypeError('FactoryRegistry is required');
    }
    if (!behaviorRegistry) {
      throw new TypeError('BehaviorRegistry is required');
    }

    this._factoryRegistry = factoryRegistry;
    this._behaviorRegistry = behaviorRegistry;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Check if engine is initialized
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Check if engine is disposed
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Initialize the engine with a DOM container.
   * Creates shared Three.js resources and both controllers.
   *
   * @param container - HTMLElement to mount the scene
   * @param options - Configuration options
   * @throws {TypeError} If container is not a valid HTMLElement
   * @throws {Error} If already initialized
   */
  initialize(container: HTMLElement, options?: EngineOptions): void {
    if (this._initialized) {
      throw new Error('CircuitEngine is already initialized');
    }
    if (this._disposed) {
      throw new Error('CircuitEngine has been disposed');
    }
    if (!container || !(container instanceof HTMLElement)) {
      throw new TypeError('Container must be a valid HTMLElement');
    }

    options = engineOptions(options);
    this._options = options;

    this._container = container;

    // Create shared resources
    this._sharedResources = this._createSharedResources(container, options);

    // Create controllers with shared resources
    this._editController = new CircuitController(this._factoryRegistry, this._sharedResources);
    this._simulationController = new CircuitRunnerController(
      this._factoryRegistry,
      this._behaviorRegistry,
      this._sharedResources
    );
    // Initialize both controllers
    this._editController.initialize(container, options.controllerOptions);
    this._simulationController.initialize(container, options.controllerOptions);

    // Setup event forwarding from both controllers
    this._setupEventForwarding();

    // Set initial mode
    this._mode = options?.initialMode ?? 'edit';
    if (this._mode === 'edit') {
      this._editController.setActive(true);
    } else {
      this._simulationController.setActive(true);
    }

    // Sync initial multi-wiring flag from options
    this._multiWiring = options.controllerOptions?.multiWiring ?? false;
    this._editController.setMultiWiring(this._multiWiring);

    this._initialized = true;

    // Mount integrated widgets unless explicitly disabled
    if (options.widgets?.enabled !== false) {
      this._widgetsManager = new WidgetsManager(this, container);
    }

    // Emit ready event
    this.emit('ready', { controllerType: 'engine' });
    const startupMode = this._mode as EngineMode;
    this.emit('modeChanged', { mode: startupMode });
  }

  /**
   * Create shared resources for both controllers.
   */
  private _createSharedResources(container: HTMLElement, options: EngineOptions): SharedResources {
    const controllerOptions = options.controllerOptions!;
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(controllerOptions.backgroundColor);
    // Add default sized grid
    const grid = createGridHelper(
      10,
      10,
      controllerOptions.colorCenterLine!,
      controllerOptions.colorGrid!
    );
    scene.add(grid);
    setupSceneLights(scene);

    // Create camera
    const aspect = container.clientWidth / container.clientHeight || 1;
    const camera = createPerspectiveCamera(aspect);
    camera.layers.set(0); // main visual layer
    camera.layers.enable(1); // enode hover layer
    camera.layers.enable(2); // component hover layer

    // Create MapControls
    const mapControls = createMapControls(camera, container, controllerOptions.mapControls!);

    // Create managers
    const hoverManager = new HoverManager(scene, camera);
    const branchingPointVisualFactory = new BranchingPointVisualFactory();

    // Create shared visual maps
    const componentObject3Ds = new Map<UUID, THREE.Object3D>();
    const enodeObject3Ds = new Map<UUID, THREE.Object3D>();
    const wireObject3Ds = new Map<UUID, Line2>();

    const wireVisualManager = new WireVisualManager(componentObject3Ds, wireObject3Ds);
    wireVisualManager.setContainer(container);
    wireVisualManager.setResolution(container.clientWidth, container.clientHeight);
    wireVisualManager.setSceneAndCamera(scene, camera);

    return {
      scene,
      camera,
      mapControls,
      grid: grid,
      factoryRegistry: this._factoryRegistry,
      branchingPointVisualFactory,
      wireVisualManager,
      hoverManager,
      componentObject3Ds,
      enodeObject3Ds,
      wireObject3Ds,
    };
  }

  /**
   * Setup event forwarding from both controllers to engine.
   */
  private _setupEventForwarding(): void {
    if (this._editController) {
      this._editControllerCleanup = this._editController.onAny((event, payload) => {
        // Forward all events from edit controller
        this.emit(event as keyof CircuitEngineEventMap, payload as any);
      });
    }

    if (this._simulationController) {
      this._simulationControllerCleanup = this._simulationController.onAny((event, payload) => {
        // Forward all events from simulation controller
        this.emit(event as keyof CircuitEngineEventMap, payload as any);
      });
    }
  }

  /**
   * Teardown event forwarding cleanup.
   */
  private _teardownEventForwarding(): void {
    if (this._editControllerCleanup) {
      this._editControllerCleanup();
      this._editControllerCleanup = null;
    }
    if (this._simulationControllerCleanup) {
      this._simulationControllerCleanup();
      this._simulationControllerCleanup = null;
    }
  }

  /**
   * Dispose all resources and clean up.
   *
   * @throws {Error} If not initialized or already disposed
   */
  dispose(): void {
    this._checkInitialized();

    // Stop simulation if running
    if (this._mode === 'simulation' && this._simulationController?.isPlaying) {
      this._simulationController.pause();
    }

    // Dispose widgets first so any pending callbacks are silenced
    if (this._widgetsManager) {
      this._widgetsManager.dispose();
      this._widgetsManager = null;
    }

    // Teardown event forwarding
    this._teardownEventForwarding();

    // Dispose controllers (they won't dispose shared resources)
    if (this._editController) {
      this._editController.dispose();
      this._editController = null;
    }
    if (this._simulationController) {
      this._simulationController.dispose();
      this._simulationController = null;
    }

    // Dispose shared resources (we own them)
    if (this._sharedResources) {
      this._sharedResources.hoverManager.dispose();
      this._sharedResources.wireVisualManager.dispose();
      this._sharedResources.mapControls.dispose();

      // Clear visual maps
      this._sharedResources.componentObject3Ds.clear();
      this._sharedResources.enodeObject3Ds.clear();
      this._sharedResources.wireObject3Ds.clear();

      this._sharedResources = null;
    }

    // Clear runner
    //this._runner = null;

    // Clear event listeners
    this.removeAllListeners();

    this._disposed = true;
    this._initialized = false;
  }

  // ============================================================================
  // Mode Management
  // ============================================================================

  /**
   * Current operating mode
   */
  get mode(): EngineMode {
    return this._mode;
  }

  /**
   * Refresh all scene widgets to display strings in the given language.
   *
   * Does NOT change the consumer's i18next instance — the caller must have
   * already called `i18next.changeLanguage(lng)` before invoking this. This
   * method only signals the scene to re-read translations for currently-open
   * widgets (pin tooltip, component picker, config panel).
   *
   * Safe to call at any point in the engine lifecycle after `initialize()`.
   *
   * @param lng - Target language code (e.g., 'en', 'fr')
   */
  setLanguage(lng: string): void {
    this._checkInitialized();
    this._editController?.setLanguage(lng);
    this._simulationController?.setLanguage(lng);
    this._widgetsManager?.setLanguage(lng);
  }

  /**
   * Switch between edit and simulation modes.
   *
   * @param mode - Target mode to switch to
   * @throws {Error} If not initialized
   * @throws {Error} If switching to simulation without a circuit loaded
   */
  setMode(mode: EngineMode): void {
    this._checkInitialized();

    // Early return if same mode
    if (this._mode === mode) {
      return;
    }

    const previousMode = this._mode;

    if (mode === 'simulation') {
      this._transitionToSimulation();
    } else {
      this._transitionToEdit();
    }

    this._mode = mode;

    // Emit modeChanged event
    this.emit('modeChanged', { mode, previousMode });
  }

  /**
   * Transition from edit mode to simulation mode.
   */
  private _transitionToSimulation(): void {
    // Validate circuit is loaded
    const circuit = this._editController?.getCircuit();
    if (!circuit) {
      throw new Error('Cannot switch to simulation mode: no circuit loaded');
    }

    // Set edit controller inactive
    if (this._editController) {
      this._editController.setActive(false);
    }

    // Set simulation controller active
    if (this._simulationController) {
      this._simulationController.setActive(true);
    }
  }

  /**
   * Transition from simulation mode to edit mode.
   */
  private _transitionToEdit(): void {
    // Set simulation controller inactive
    if (this._simulationController) {
      this._simulationController.setActive(false);
    }

    // Set edit controller active
    // Note: The edit controller maintains its circuit and visuals
    if (this._editController) {
      this._editController.setActive(true);
    }
  }

  // ============================================================================
  // Circuit Management
  // ============================================================================

  /**
   * Load a circuit for editing/simulation.
   *
   * @param circuit - Circuit to load, or null to clear
   * @throws {Error} If not initialized
   */
  setCircuit(circuit: Circuit | null): void {
    this._checkInitialized();
    const options = this._options || engineOptions();

    if (this._sharedResources?.grid) {
      this._sharedResources?.grid?.dispose();
      this._sharedResources?.scene.remove(this._sharedResources?.grid);
    }

    // Load circuit via edit controller
    if (this._editController) {
      this._editController.setCircuit(circuit);
      this._simulationController?.setCircuit(circuit);
    }

    const gridSize = circuit ? circuit.metadata.size : 10;
    const gridDivisions = circuit ? circuit.metadata.divisions : 10;
    this._sharedResources!.grid = createGridHelper(
      gridSize,
      gridDivisions,
      options.controllerOptions!.colorCenterLine!,
      options.controllerOptions!.colorGrid!
    );
    this._sharedResources?.scene.add(this._sharedResources!.grid);

    if (circuit && this._sharedResources?.camera) {
      updateCamera(this._sharedResources?.camera, circuit.metadata.cameraOptions);
    }
    if (circuit && this._sharedResources?.mapControls) {
      const controls = this._sharedResources?.mapControls;
      const target = circuit.metadata.cameraOptions.lookAtPosition;
      controls.target.set(target.x, target.y, target.z);
    }
  }

  /**
   * Get the currently loaded circuit
   */
  getCircuit(): Circuit | null {
    this._checkInitialized();
    return this._editController?.getCircuit() ?? null;
  }

  // ============================================================================
  // Controllers Access
  // ============================================================================

  /**
   * Get the edit controller for advanced operations.
   *
   * @throws {Error} If not initialized
   */
  getEditController(): CircuitController {
    this._checkInitialized();
    return this._editController!;
  }

  /**
   * Get the simulation controller for advanced operations.
   *
   * @throws {Error} If not initialized
   */
  getSimulationController(): CircuitRunnerController {
    this._checkInitialized();
    return this._simulationController!;
  }

  // ============================================================================
  // Edit Mode Operations
  // ============================================================================

  /**
   * Activate an editing tool.
   *
   * @param toolType - Tool to activate
   * @throws {Error} If not in edit mode
   */
  setActiveTool(toolType: ToolType): void {
    this._checkEditMode();
    this._editController!.setActiveTool(toolType);
  }

  /**
   * Get the currently active tool
   *
   * @throws {Error} If not in edit mode
   */
  getActiveTool(): ToolType | null {
    this._checkEditMode();
    return this._editController!.getActiveTool();
  }

  /**
   * Enable or disable edit mode (tool system).
   *
   * @param enabled - True to enable, false to disable
   * @throws {Error} If not in edit mode
   */
  setEditModeEnabled(enabled: boolean): void {
    this._checkEditMode();
    this._editController!.setEditMode(enabled);
  }

  /**
   * Whether the multi-wiring flag is currently enabled.
   * Wiring tools may use it to create several wires per pull (semantics handled
   * by the tools; the engine only owns the flag and forwards changes).
   */
  get multiWiring(): boolean {
    return this._multiWiring;
  }

  /**
   * Toggle the multi-wiring flag and forward to the edit controller.
   * Emits `multiWiringChanged` once on transition.
   */
  setMultiWiring(value: boolean): void {
    this._checkInitialized();
    if (this._multiWiring === value) return;
    this._multiWiring = value;
    this._editController!.setMultiWiring(value);
    // Note: edit controller emits the event, which is forwarded by _setupEventForwarding.
  }

  // ============================================================================
  // Simulation Mode Operations
  // ============================================================================

  /**
   * Start automatic simulation playback.
   *
   * @throws {Error} If not in simulation mode
   */
  play(): void {
    this._checkSimulationMode();
    this._simulationController!.play();
  }

  /**
   * Pause automatic simulation playback.
   *
   * @throws {Error} If not in simulation mode
   */
  pause(): void {
    this._checkSimulationMode();
    this._simulationController!.pause();
  }

  /**
   * Execute a single simulation tick.
   *
   * @throws {Error} If not in simulation mode
   */
  step(): void {
    this._checkSimulationMode();
    this._simulationController!.step();
  }

  /**
   * Stop simulation and reset to initial state.
   *
   * @throws {Error} If not in simulation mode
   */
  stop(): void {
    this._checkSimulationMode();
    this._simulationController!.stop();
  }

  /**
   * Check if simulation is currently playing
   */
  get isPlaying(): boolean {
    if (this._mode !== 'simulation') {
      return false;
    }
    return this._simulationController?.isPlaying ?? false;
  }

  /**
   * Get current simulation tick
   */
  get currentTick(): number {
    if (this._mode !== 'simulation') {
      return 0;
    }
    return this._simulationController?.currentTick ?? 0;
  }

  /**
   * Tick interval in milliseconds
   */
  get tickInterval(): number {
    return this._simulationController?.tickInterval ?? 500;
  }

  set tickInterval(value: number) {
    if (this._simulationController) {
      this._simulationController.tickInterval = value;
    }
  }

  /**
   * Simulation speed in ticks per second.
   * Range: 1-20 TPS. Works in both edit and simulation modes.
   */
  get simulationSpeed(): number {
    return this._simulationController?.simulationSpeed ?? 2;
  }

  set simulationSpeed(tps: number) {
    if (this._simulationController) {
      this._simulationController.simulationSpeed = tps;
    }
  }

  /**
   * Minimum allowed simulation speed in ticks per second.
   */
  get minSimulationSpeed(): number {
    return this._simulationController?.minSimulationSpeed ?? 1;
  }

  /**
   * Maximum allowed simulation speed in ticks per second.
   */
  get maxSimulationSpeed(): number {
    return this._simulationController?.maxSimulationSpeed ?? 20;
  }

  // ============================================================================
  // Per-frame Update
  // ============================================================================

  /**
   * Update active animations. Call once per frame from the render loop.
   * No-op if not initialized, disposed, or not in simulation mode.
   *
   * @param delta - Time in seconds since last frame (from THREE.Clock.getDelta())
   */
  update(delta: number): void {
    if (!this._initialized || this._disposed || this._mode !== 'simulation') return;
    this._simulationController!.updateAnimations(delta);
  }

  // ============================================================================
  // Three.js Access
  // ============================================================================

  /**
   * Get the Three.js scene for external rendering.
   *
   * @throws {Error} If not initialized
   */
  getScene(): THREE.Scene {
    this._checkInitialized();
    return this._sharedResources!.scene;
  }

  /**
   * Get the camera for external rendering.
   *
   * @throws {Error} If not initialized
   */
  getCamera(): THREE.PerspectiveCamera {
    this._checkInitialized();
    return this._sharedResources!.camera;
  }

  /**
   * Get the MapControls for external manipulation.
   *
   * @throws {Error} If not initialized
   */
  getControls(): MapControls {
    this._checkInitialized();
    return this._sharedResources!.mapControls;
  }

  /**
   * Hook called before exporting the circuit visualization.
   * Saves world informations such as camera position, in the circuit metadata.
   */
  public beforeExport(): void {
    if (!this._editController) return;
    this._editController.beforeExport();
  }

  /**
   * Handle container resize.
   *
   * @param width - New width (optional, uses container if omitted)
   * @param height - New height (optional, uses container if omitted)
   */
  onContainerResize(width?: number, height?: number): void {
    this._checkInitialized();

    const w = width ?? this._container!.clientWidth;
    const h = height ?? this._container!.clientHeight;

    // Update camera
    const camera = this._sharedResources!.camera;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // Update wire visual manager resolution
    this._sharedResources!.wireVisualManager.setResolution(w, h);

    // Delegate to active controller for any additional resize handling
    if (this._mode === 'edit' && this._editController) {
      this._editController.onContainerResize(w, h);
    } else if (this._mode === 'simulation' && this._simulationController) {
      this._simulationController.onContainerResize(w, h);
    }
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  /**
   * Check that controller is initialized and not disposed.
   *
   * @throws {Error} If not initialized or disposed
   */
  private _checkInitialized(): void {
    if (this._disposed) {
      throw new Error('CircuitEngine has been disposed');
    }
    if (!this._initialized) {
      throw new Error('CircuitEngine is not initialized');
    }
  }

  /**
   * Check that controller is in edit mode.
   *
   * @throws {Error} If not in edit mode
   */
  private _checkEditMode(): void {
    this._checkInitialized();
    if (this._mode !== 'edit') {
      throw new Error('Operation not available: not in edit mode');
    }
  }

  /**
   * Check that engine is in simulation mode.
   *
   * @throws {Error} If not in simulation mode
   */
  private _checkSimulationMode(): void {
    this._checkInitialized();
    if (this._mode !== 'simulation') {
      throw new Error('Operation not available: not in simulation mode');
    }
  }
}
