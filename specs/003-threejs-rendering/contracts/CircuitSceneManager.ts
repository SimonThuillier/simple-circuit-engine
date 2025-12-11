/**
 * Static Circuit SceneManager Contract
 * @module scene/contracts/CircuitSceneManager
 *
 * Updated 2025-12-04: Circuit provided via setCircuit() after initialization, not in constructor.
 * SceneManager can be reused for multiple circuits without re-initialization.
 */

import type { Circuit } from '@/core/Circuit';
import type { IFactoryRegistry } from './ComponentVisualFactory';
import type {
  SceneManagerEvent,
  SceneManagerCallback,
  ChangedData,
  SceneManagerOptions,
  ToolType,
} from './types';
import type * as THREE from 'three';

/**
 * SceneManager for circuit topology visualization and editing
 *
 * Manages a THREE.js Scene to visualize circuit topology in a non-simulated state, supporting view manipulation
 * and editing interactions via integrated tool system. Operates on Circuit instances provided via setCircuit().
 *
 * **Lifecycle**:
 * 1. Construct with FactoryRegistry only: `new CircuitSceneManager(factoryRegistry)`
 * 2. Call initialize(container) to setup Three.js scene and camera
 * 3. Set circuit: `setCircuit(circuit)` - can be called multiple times to switch circuits
 * 4. Call update() when circuit topology changes
 * 5. Call clearVisuals() to clear current circuit (optional, before switching)
 * 6. Call dispose() to cleanup WebGL resources when done
 *
 * **Event System**:
 * Register callbacks via on() for interaction events:
 * - 'hover'/'unhover': User hovers over circuit elements
 * - 'position'/'deselect': User selects circuit elements
 * - 'error': scene management errors occurred
 * - 'ready': SceneManager initialization complete
 * - Tool system events: 'toolActivated', 'toolDeactivated', 'toolOperationCompleted', etc.
 *
 * **Tool System** (FR-025 to FR-037):
 * Enable edit mode via setEditMode(true), then activate tools programmatically.
 * Five built-in tools: Select, PlaceComponent, Wire, BranchingPoint, Delete.
 * Consumer implements DOM event listeners and translates to tool API calls.
 *
 * **Camera Control**:
 * Access camera via getCamera() method for direct manipulation.
 * Consumer implements mouse/keyboard controls and updates camera (e.g., OrbitControls).
 *
 * **Rendering Orchestration**:
 * Consumer owns the WebGLRenderer instance and animation loop.
 * SceneManager only manages Scene and Camera. Consumer calls:
 * `webGLRenderer.render(sceneManager.getScene(), sceneManager.getCamera())`
 *
 * @example
 * ```typescript
 * const registry = new FactoryRegistry(defaultFactory);
 * const sceneManager = new CircuitSceneManager(registry);
 *
 * sceneManager.on('ready', () => console.log('SceneManager ready'));
 * sceneManager.on('position', ({ objectId, objectType }) => {
 *   console.log(`Selected ${objectType}: ${objectId}`);
 * });
 *
 * sceneManager.initialize(containerElement);
 * sceneManager.setCircuit(circuit);  // Set circuit AFTER initialization
 *
 * // Consumer creates and owns WebGLRenderer
 * const webglRenderer = new THREE.WebGLRenderer();
 * document.body.appendChild(webglRenderer.domElement);
 *
 * // Enable editing
 * sceneManager.setEditMode(true);
 * sceneManager.setActiveTool('addComponent');
 *
 * // Consumer handles DOM events
 * canvas.addEventListener('click', (e) => {
 *   const worldPos = screenToWorld(e.clientX, e.clientY);
 *   sceneManager.handleToolClick(worldPos);
 * });
 *
 * // Consumer's animation loop
 * function animate() {
 *   sceneManager.render();  // Updates scene state
 *   webglRenderer.render(sceneManager.getScene(), sceneManager.getCamera());
 *   requestAnimationFrame(animate);
 * }
 * animate();
 * ```
 */
export interface ICircuitSceneManager {
  /**
   * The circuit topology being visualized (readonly)
   */
  circuit?: Circuit | null;

  /**
   * The component visual factory registry (readonly)
   */
  readonly factoryRegistry: IFactoryRegistry;

  /**
   * Initialize the scene manager with a DOM container
   *
   * Creates Three.js Scene, Camera, and lights. Does NOT create circuit visuals yet.
   * Call setCircuit() after initialization to load and visualize a circuit.
   * Emits 'ready' event when complete.
   *
   * @param container - HTMLElement for container reference
   * @param options - Optional scene manager configuration (camera settings, etc.)
   * @throws {Error} If already initialized
   * @throws {TypeError} If container is not a valid HTMLElement
   * @throws {Error} If initialization fails (emits 'error' event with details)
   *
   * @remarks
   * The container is stored for reference but rendering is performed by consumer's WebGLRenderer.
   * Use getScene() and getCamera() to access scene/camera for rendering.
   * SceneManager can be initialized once and reused for multiple circuits via setCircuit().
   */
  initialize(container: HTMLElement, options?: SceneManagerOptions): void;

  /**
   * Set or change the circuit to visualize
   *
   * Clears existing visuals if a circuit was previously set, then creates new visuals
   * for the provided circuit. Pass null to clear all circuit visuals without loading new circuit.
   *
   * @param circuit - Circuit instance to visualize, or null to clear
   * @throws {Error} If not initialized
   *
   * @remarks
   * Enables scene manager reusability - can switch between circuits without re-initialization.
   * Automatically calls internal update() to create all visual elements.
   *
   * @example
   * ```typescript
   * sceneManager.setCircuit(circuit1);  // Load first circuit
   * // ... work with circuit1 ...
   * sceneManager.setCircuit(circuit2);  // Switch to different circuit
   * sceneManager.setCircuit(null);      // Clear all visuals
   * ```
   */
  setCircuit(circuit: Circuit | null): void;

  /**
   * Clear all circuit visuals from the scene
   *
   * Removes all visual objects but does not dispose the scene manager.
   * SceneManager can be reused by calling setCircuit() with a new circuit.
   *
   * @throws {Error} If not initialized
   *
   * @remarks
   * This is equivalent to setCircuit(null) but more explicit in intent.
   * Useful when you want to temporarily show empty scene before loading new circuit.
   */
  clearVisuals(): void;

  /**
   * Update the visualization based on circuit changes
   *
   * Performs incremental update if changedData provided, otherwise full update.
   * Creates/removes/updates visual meshes to match circuit topology.
   *
   * @param changedData - Optional delta specifying what changed
   * @throws {Error} If not initialized
   * @throws {Error} If update fails (emits 'error' event with details)
   *
   * @remarks
   * Incremental updates are more efficient for large circuits.
   * Call this when:
   * - Components added/removed from circuit
   * - Component positions/rotations changed
   * - Wires added/removed
   * - ENodes (branching points) added/removed
   *
   * @example
   * ```typescript
   * // Full update
   * renderer.update();
   *
   * // Incremental update
   * renderer.update({
   *   addedComponents: [newComponentId],
   *   removedWires: [oldWireId]
   * });
   * ```
   */
  update(changedData?: ChangedData): void;

  /**
   * Render one frame (called by external animation loop)
   *
   * Updates visual state, camera, and prepares scene for rendering.
   * Does NOT perform actual WebGL rendering (consumer calls webGLSceneManager.render()).
   *
   * @throws {Error} If not initialized
   * @throws {Error} If render fails (emits 'error' event with details)
   *
   * @remarks
   * This method should be called every frame from the consumer's animation loop.
   * The actual rendering to canvas is performed by consumer's WebGLSceneManager.
   */
  render(): void;

  /**
   * Clean up all WebGL resources and event listeners
   *
   * Disposes Three.js geometries, materials, textures, and removes all visual objects.
   * Clears all event listeners.
   *
   * @throws {Error} If already disposed
   *
   * @remarks
   * After dispose(), the renderer cannot be reused. Create a new instance if needed.
   * Always call dispose() before removing renderer from memory to prevent WebGL leaks.
   */
  dispose(): void;

  /**
   * Register an event callback
   *
   * @param event - Event name to listen for
   * @param callback - Function to call when event occurs
   *
   * @remarks
   * Callbacks are wrapped in try-catch to prevent errors from breaking rendering.
   * Same callback can be registered multiple times (will be called multiple times).
   *
   * @example
   * ```typescript
   * renderer.on('hover', ({ objectId, objectType }) => {
   *   if (objectType === 'component') {
   *     highlightComponent(objectId);
   *   }
   * });
   * ```
   */
  on<E extends SceneManagerEvent>(event: E, callback: SceneManagerCallback): void;

  /**
   * Unregister an event callback
   *
   * @param event - Event name
   * @param callback - Function to remove (must be same reference used in on())
   *
   * @remarks
   * If callback was registered multiple times, only removes one registration.
   */
  off<E extends SceneManagerEvent>(event: E, callback: SceneManagerCallback): void;

  /**
   * Get the Three.js scene for rendering
   *
   * @returns THREE.Scene containing all visual elements
   * @throws {Error} If not initialized
   *
   * @remarks
   * Consumer uses this to access the scene for rendering:
   * ```typescript
   * webglRenderer.render(sceneManager.getScene(), sceneManager.getCamera());
   * ```
   */
  getScene(): THREE.Scene;

  /**
   * Get the Three.js camera for rendering and manipulation
   *
   * @returns THREE.PerspectiveCamera for the scene
   * @throws {Error} If not initialized
   *
   * @remarks
   * Consumer uses this to:
   * - Render the scene: `webglRenderer.render(scene, sceneManager.getCamera())`
   * - Manipulate camera: Set up OrbitControls, change position, etc.
   *
   * @example
   * ```typescript
   * const camera = sceneManager.getCamera();
   * camera.position.set(0, 10, 20);
   * camera.lookAt(0, 0, 0);
   *
   * // Or use with OrbitControls
   * const controls = new OrbitControls(sceneManager.getCamera(), canvas);
   * ```
   */
  getCamera(): THREE.PerspectiveCamera;

  /**
   * Tool System Methods
   */

  /**
   * Enable or disable edit mode
   *
   * When enabled, activates tool system for topology manipulation.
   * When disabled, deactivates all tools and resets tool state.
   *
   * @param enabled - true to enable edit mode, false for read-only view
   * @throws {Error} If not initialized
   *
   * @remarks
   * Disabling edit mode while a tool operation is in progress will
   * cancel the operation and emit 'toolOperationCancelled' event.
   *
   * @example
   * ```typescript
   * renderer.setEditMode(true);
   * renderer.on('ready', () => {
   *   console.log('Edit mode enabled');
   * });
   * ```
   */
  setEditMode(enabled: boolean): void;

  /**
   * Set the active editing tool
   *
   * Only one tool can be active at a time. Activating a new tool
   * deactivates the previously active tool.
   *
   * @param toolType - Type of tool to activate
   * @throws {Error} If edit mode is not enabled
   * @throws {Error} If toolType is not recognized
   * @throws {Error} If current tool has operation in progress (per FR-028)
   *
   * @remarks
   * Emits 'toolDeactivated' for previous tool (if any), then 'toolActivated'
   * for new tool, followed by 'cursorChangeRequested' with new cursor type.
   *
   * Switching tools is only allowed when the active tool is idle (no operation
   * in progress). For multi-step tools like Wire, call cancelCurrentToolOperation()
   * first if an operation is in progress.
   *
   * @example
   * ```typescript
   * renderer.setActiveTool('addComponent');
   * renderer.on('toolActivated', ({ toolType }) => {
   *   console.log(`Tool activated: ${toolType}`);
   * });
   * ```
   */
  setActiveTool(toolType: ToolType): void;

  /**
   * Get the currently active tool type
   *
   * @returns Active tool type, or null if edit mode disabled or no tool active
   *
   * @example
   * ```typescript
   * const activeTool = renderer.getActiveTool();
   * if (activeTool === 'wire') {
   *   // Wire tool is active
   * }
   * ```
   */
  getActiveTool(): ToolType | null;

  /**
   * Cancel the current tool operation if one is in progress
   *
   * For multi-step tools (e.g., Wire), this cancels the in-progress
   * operation and resets tool state. Emits 'toolOperationCancelled' event.
   *
   * @throws {Error} If no tool is active
   * @throws {Error} If no tool operation is in progress
   *
   * @remarks
   * Consumer typically calls this in response to Escape key press.
   *
   * @example
   * ```typescript
   * canvas.addEventListener('keydown', (e) => {
   *   if (e.key === 'Escape') {
   *     try {
   *       renderer.cancelCurrentToolOperation();
   *     } catch (err) {
   *       // No operation in progress, ignore
   *     }
   *   }
   * });
   * ```
   */
  cancelCurrentToolOperation(): void;

  /**
   * Handle tool click interaction at world coordinates
   *
   * Delegates to active tool's click handler. Consumer translates
   * screen coordinates to world coordinates before calling.
   *
   * @param worldPosition - Click position in 3D world space
   * @throws {Error} If no tool is active
   * @throws {Error} If edit mode is not enabled
   *
   * @remarks
   * Tool processes the click and may:
   * - Complete an operation (emits 'toolOperationCompleted')
   * - Start a multi-step operation (emits 'toolOperationStarted')
   * - Reject invalid operation (emits 'toolValidationError')
   *
   * @example
   * ```typescript
   * canvas.addEventListener('click', (e) => {
   *   const worldPos = screenToWorld(e.clientX, e.clientY, camera);
   *   renderer.handleToolClick(worldPos);
   * });
   *
   * renderer.on('toolOperationCompleted', ({ toolType, changedData }) => {
   *   console.log(`${toolType} operation completed`);
   *   // Circuit visualization automatically updated
   * });
   * ```
   */
  handleToolClick(worldPosition: THREE.Vector3): void;

  /**
   * Handle tool hover interaction at world coordinates
   *
   * Updates tool preview rendering. Consumer calls this on mouse move.
   *
   * @param worldPosition - Hover position in 3D world space
   *
   * @remarks
   * Tool updates preview objects and may emit 'cursorChangeRequested'
   * if cursor should change (e.g., hovering over invalid placement location).
   * Does not throw if no tool is active (silently ignored).
   *
   * @example
   * ```typescript
   * canvas.addEventListener('mousemove', (e) => {
   *   const worldPos = screenToWorld(e.clientX, e.clientY, camera);
   *   renderer.handleToolHover(worldPos);
   * });
   *
   * renderer.on('cursorChangeRequested', ({ cursorType }) => {
   *   canvas.style.cursor = cursorType;
   * });
   * ```
   */
  handleToolHover(worldPosition: THREE.Vector3): void;

  /**
   * Handle tool scroll interaction for rotation/scaling
   *
   * Used by PlaceComponent tool for preview rotation.
   * Does not throw if no tool is active (silently ignored).
   *
   * @param delta - Scroll wheel delta value (positive = scroll up, negative = scroll down)
   *
   * @example
   * ```typescript
   * canvas.addEventListener('wheel', (e) => {
   *   e.preventDefault();
   *   renderer.handleToolScroll(e.deltaY);
   * });
   * ```
   */
  handleToolScroll(delta: number): void;
}
