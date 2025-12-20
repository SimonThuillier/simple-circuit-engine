/**
 * CircuitRunner Controller Contract
 * @module scene/contracts/CircuitRunnerController
 */

import type { CircuitRunner } from '@/core/simulation/CircuitRunner';
import type { IFactoryRegistry } from './ComponentVisualFactory';
import type { ControllerEvent, ControllerCallback, ChangedData, ControllerOptions } from './types';
import type * as THREE from 'three';

/**
 * Controller for live circuit simulation visualization
 *
 * Visualizes circuit state during active simulation, displaying real-time updates,
 * animations, and state changes. Operates on CircuitRunner instances.
 *
 * **Key Features**:
 * - Interpolates between discrete simulation ticks for smooth animation
 * - Animates current flow through wires
 * - Updates component states with visual feedback
 * - Synchronizes with simulation timing
 *
 * **Lifecycle**:
 * 1. Construct with FactoryRegistry
 * 2. Call initialize(container) to setup Three.js scene
 * 3. Call render() each frame from external animation loop (handles interpolation automatically)
 * 4. Optionally call update() when simulation topology changes (rare)
 * 5. Call dispose() to cleanup WebGL resources
 *
 * **Time Synchronization**:
 * Controller automatically interpolates visual state between simulation ticks based on
 * elapsed real-time, providing smooth 30-60 FPS animation even when simulation
 * runs at different tick rates.
 *
 * @example
 * ```typescript
 * const registry = new FactoryRegistry(defaultFactory);
 * const renderer = new SimulationCircuitController(circuitRunner, registry);
 *
 * renderer.on('ready', () => console.log('Ready to simulate'));
 * renderer.on('error', ({ message }) => console.error(message));
 *
 * renderer.initialize(containerElement);
 *
 * // In animation loop - renderer handles interpolation internally
 * function animate() {
 *   circuitRunner.tick(); // Advance simulation
 *   renderer.render();     // Interpolate and update visuals
 *   webGLController.render(renderer.getScene(), camera);
 *   requestAnimationFrame(animate);
 * }
 * ```
 */
export interface ICircuitRunnerController {
  /**
   * The circuit simulation runner being visualized (readonly)
   */
  circuitRunner?: CircuitRunner | null;

  /**
   * The component visual factory registry (readonly)
   */
  readonly factoryRegistry: IFactoryRegistry;

  /**
   * Initialize the renderer with a DOM container
   *
   * Creates Three.js Scene, Camera, lights, and visualizes initial simulation state.
   * Emits 'ready' event when complete.
   *
   * @param container - HTMLElement to attach the scene to
   * @param options - Optional renderer configuration
   * @throws {Error} If already initialized
   * @throws {TypeError} If container is not a valid HTMLElement
   * @throws {Error} If initialization fails (emits 'error' event with details)
   *
   * @remarks
   * Unlike CircuitController, this renderer sets up additional systems for:
   * - State interpolation tracking
   * - Animation controllers for wires
   * - Material state management for components
   */
  initialize(container: HTMLElement, options?: ControllerOptions): void;

  /**
   * Update the visualization based on simulation state changes
   *
   * Manage a THREE.js Scene to visualize a live circuit in a simulated state
   *
   * Typically NOT needed during normal simulation (state changes handled automatically).
   * Only call when simulation topology changes (e.g., circuit modified mid-simulation).
   *
   * @param changedData - Optional delta specifying what changed
   * @throws {Error} If not initialized
   * @throws {Error} If update fails (emits 'error' event with details)
   *
   * @remarks
   * The renderer automatically polls simulation state during render().
   * Explicit update() is only needed for structural changes:
   * - Components added/removed during simulation
   * - Wires added/removed during simulation
   * - Topology changes (rare in typical usage)
   */
  update(changedData?: ChangedData): void;

  /**
   * Render one frame with state interpolation (called by external animation loop)
   *
   * Performs:
   * 1. Polls current simulation state from CircuitRunner
   * 2. Interpolates visual state between last tick and current tick
   * 3. Updates material colors, wire animations, component states
   * 4. Prepares scene for rendering
   *
   * @throws {Error} If not initialized
   * @throws {Error} If render fails (emits 'error' event with details)
   *
   * @remarks
   * This method MUST be called every frame for smooth animation.
   * Interpolation is frame-rate independent (works at 30-120 FPS).
   * Does NOT perform actual WebGL rendering (consumer calls webGLController.render()).
   *
   * **Performance**: Uses dirty tracking to only update changed elements.
   *
   * @example
   * ```typescript
   * // Slow simulation (10 TPS), smooth rendering (60 FPS)
   * let lastTickTime = Date.now();
   * function animate() {
   *   if (Date.now() - lastTickTime > 100) {
   *     circuitRunner.tick();
   *     lastTickTime = Date.now();
   *   }
   *   renderer.render(); // Interpolates smoothly between ticks
   *   webGLController.render(renderer.getScene(), camera);
   *   requestAnimationFrame(animate);
   * }
   * ```
   */
  render(): void;

  /**
   * Clean up all WebGL resources, interpolation state, and event listeners
   *
   * Disposes Three.js geometries, materials, textures, and removes all visual objects.
   * Clears interpolation state and animation controllers.
   * Removes all event listeners.
   *
   * @throws {Error} If already disposed
   *
   * @remarks
   * After dispose(), the renderer cannot be reused. Create a new instance if needed.
   * Always call dispose() before removing renderer to prevent WebGL/memory leaks.
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
   * renderer.on('error', ({ message, error }) => {
   *   console.error('Rendering error:', message);
   *   if (error) console.error(error.stack);
   * });
   * ```
   */
  on<E extends ControllerEvent>(event: E, callback: ControllerCallback): void;

  /**
   * Unregister an event callback
   *
   * @param event - Event name
   * @param callback - Function to remove (must be same reference used in on())
   *
   * @remarks
   * If callback was registered multiple times, only removes one registration.
   */
  off<E extends ControllerEvent>(event: E, callback: ControllerCallback): void;

  /**
   * Get the Three.js scene for rendering
   *
   * @returns THREE.Scene containing all visual elements
   * @throws {Error} If not initialized
   *
   * @remarks
   * Use this to access the scene for rendering:
   * ```typescript
   * webGLController.render(renderer.getScene(), camera);
   * ```
   *
   * Also provides access to scene.camera for direct camera manipulation:
   * ```typescript
   * const camera = renderer.getScene().camera;
   * camera.position.z = 50;
   * ```
   */
  getScene(): THREE.Scene;

  /**
   * Set interpolation duration for state transitions
   *
   * Controls how long visual transitions take when simulation state changes.
   * Default: 100ms for smooth but responsive animation.
   *
   * @param durationMs - Transition duration in milliseconds
   * @throws {TypeError} If duration is negative or not a number
   *
   * @remarks
   * Shorter durations (50-100ms): More responsive, slight jitter
   * Longer durations (200-300ms): Smoother, more lag between state and visual
   *
   * @example
   * ```typescript
   * renderer.setInterpolationDuration(150); // 150ms transitions
   * ```
   */
  setInterpolationDuration(durationMs: number): void;
}
