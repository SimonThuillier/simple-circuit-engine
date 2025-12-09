/**
 * Simulation Circuit Scene Manager
 * @module scene/simulation/CircuitRunnerSceneManager
 *
 * Renders live circuit simulation with real-time state updates and animated current flow.
 * Provides smooth interpolation between discrete simulation ticks for fluid animation.
 */

import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import type { CircuitRunner } from '../../core/simulation/CircuitRunner';
import type { Component } from '../../core/components/Component';
import type { Wire } from '../../core/Wire';
import type { ENode } from '../../core/ENode';
import type { UUID } from '../../core/types/Identifier';
import { ENodeType } from '../../core/types/ENodeType';
import { EventEmitter } from '../shared/EventEmitter';
import type { IFactoryRegistry } from '../shared/components/ComponentVisualFactory';
import type {
  RenderEvent,
  RenderEventMap,
  RenderCallback,
  ChangedData,
  RendererOptions,
  MapControlsOptions,
} from '../shared/types';
import { createPerspectiveCamera, setupCameraFromMetadata } from '../shared/CameraUtils';
import { setupSceneLights } from '../shared/LightingUtils';
import { createWireGeometry } from '../shared/GeometryUtils';
import { createLineMaterial } from '../shared/MaterialUtils';
import { createEnodeGeometry } from '../shared/GeometryUtils';
import { createStandardMaterial } from '../shared/MaterialUtils';
import { InterpolationController } from '../shared/InterpolationController';
import { HoverManager } from '../shared/HoverManager';

/**
 * Simulation Circuit Scene Manager Implementation
 *
 * Manages Three.js scene for live circuit simulation visualization.
 * Provides smooth interpolation between simulation ticks for 60fps rendering.
 * Animates current flow through wires and component state changes.
 */
export class CircuitRunnerSceneManager extends EventEmitter<RenderEventMap> {
  public readonly factoryRegistry: IFactoryRegistry;

  private circuitRunner: CircuitRunner | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private container: HTMLElement | null = null;
  private initialized: boolean = false;
  private disposed: boolean = false;

  // Visual object tracking
  private componentMeshes: Map<string, THREE.Object3D> = new Map();
  private wireMeshes: Map<string, THREE.Line> = new Map();
  private enodeMeshes: Map<string, THREE.Mesh> = new Map();

  // Simulation-specific fields
  private interpolationController: InterpolationController | null = null;
  private lastSimulationTick: number = 0;
  private lastRenderTime: number = 0;

  // MapControls (Phase 2)
  private mapControls: MapControls | null = null;
  private mapControlsOptions: MapControlsOptions = {};

  // HoverManager (Phase 3)
  private hoverManager: HoverManager | null = null;
  private mouseMoveHandler: ((event: MouseEvent) => void) | null = null;
  private mouseLeaveHandler: ((event: MouseEvent) => void) | null = null;
  private mapControlsChangeHandler: (() => void) | null = null;

  /**
   * Create a new Simulation Circuit Scene Manager
   *
   * @param factoryRegistry - Component visual factory registry
   * @throws {TypeError} If factoryRegistry is null/undefined
   */
  constructor(factoryRegistry: IFactoryRegistry) {
    super();

    if (!factoryRegistry) {
      throw new TypeError('FactoryRegistry is required');
    }

    this.factoryRegistry = factoryRegistry;
  }

  /**
   * Initialize the scene manager with a DOM container
   *
   * Creates Scene, Camera, lights, and InterpolationController.
   * Does NOT create circuit visuals yet - call setCircuit() after initialization.
   *
   * @param container - HTMLElement for container reference
   * @param options - Optional scene manager configuration
   * @throws {Error} If already initialized
   * @throws {TypeError} If container is not valid HTMLElement
   */
  initialize(container: HTMLElement, options?: RendererOptions): void {
    if (this.initialized) {
      throw new Error('SceneManager already initialized');
    }

    if (!container || !(container instanceof HTMLElement)) {
      const error = new TypeError('Container must be a valid HTMLElement');
      this.emit('error', { message: error.message, error });
      throw error;
    }

    try {
      this.container = container;

      // Create scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x1a1a24);
      this.scene.name = 'Simulation Scene';

      // Create camera
      const aspect = container.clientWidth / container.clientHeight || 1;
      this.camera = createPerspectiveCamera(options, aspect);

      // Configure camera layers to only render layer 0 (visual layer) (Phase 5 - T034)
      // This prevents hitbox meshes (layers 1, 2, 3) from being rendered
      if (this.camera && this.camera.layers) {
        this.camera.layers.set(0);
      }

      // Add lights
      setupSceneLights(this.scene);

      // Create interpolation controller for smooth state transitions
      this.interpolationController = new InterpolationController();
      this.lastRenderTime = performance.now();

      // Initialize MapControls (Phase 2)
      this._initializeMapControls(options?.mapControls);

      // Initialize HoverManager (Phase 3)
      this._initializeHoverManager();

      this.initialized = true;

      // Emit ready event
      this.emit('ready', {});
    } catch (error) {
      const err = error as Error;
      this.emit('error', { message: err.message, error: err });
      throw error;
    }
  }

  /**
   * Set or change the circuit runner to visualize
   *
   * Clears existing visuals if present, then creates new visuals from CircuitRunner's state.
   * Pass null to clear all circuit visuals without loading new circuit.
   *
   * @param circuitRunner - CircuitRunner instance to visualize, or null to clear
   * @throws {Error} If not initialized
   */
  setCircuit(circuitRunner: CircuitRunner | null): void {
    this._checkInitialized();

    try {
      // Clear existing visuals if we had a previous circuit
      if (this.circuitRunner !== null) {
        this._removeAllVisuals();
      }

      this.circuitRunner = circuitRunner;

      if (circuitRunner !== null) {
        // Set scene name from circuit metadata
        this.scene!.name = circuitRunner.circuit.metadata.name || 'Simulation Scene';

        // Perform full update to create all visuals
        this._fullUpdate();

        // Initialize lastSimulationTick
        this.lastSimulationTick = circuitRunner.currentTick;
      }
    } catch (error) {
      const err = error as Error;
      this.emit('error', { message: err.message, error: err });
      throw error;
    }
  }

  /**
   * Clear all circuit visuals from the scene
   *
   * Removes all visual objects but does not dispose the scene manager.
   * SceneManager can be reused by calling setCircuit() with a new circuit.
   *
   * @throws {Error} If not initialized
   */
  clearVisuals(): void {
    this._checkInitialized();
    this._removeAllVisuals();
  }

  /**
   * Update visualization based on circuit topology changes
   *
   * This is rarely needed for simulation (simulation doesn't typically change topology).
   * Use for incremental updates if circuit topology changes during simulation.
   *
   * @param changedData - Optional incremental update specification
   * @throws {Error} If not initialized
   */
  update(changedData?: ChangedData): void {
    this._checkInitialized();

    try {
      if (!changedData) {
        // Full update - rebuild all visuals
        this._fullUpdate();
      } else {
        // Incremental update (rare for simulation)
        this._incrementalUpdate(changedData);
      }
    } catch (error) {
      const err = error as Error;
      this.emit('error', { message: err.message, error: err });
      throw error;
    }
  }

  /**
   * Render one frame with interpolated simulation state
   *
   * Polls current simulation tick, interpolates visual state, updates animations.
   * Should be called every frame from consumer's animation loop.
   *
   * @throws {Error} If not initialized
   */
  render(): void {
    this._checkInitialized();

    // Handle case where no circuit is set
    if (!this.circuitRunner) {
      console.warn('CircuitRunnerSceneManager.render() called without circuit set');
      return;
    }

    try {
      const now = performance.now();
      const deltaTime = now - this.lastRenderTime;
      this.lastRenderTime = now;

      // Get current simulation tick
      const currentTick = this.circuitRunner.currentTick;

      // Check if simulation has advanced
      if (currentTick !== this.lastSimulationTick) {
        // Update interpolation controller with new state
        const newState = this._captureSimulationState();
        this.interpolationController!.updateState(newState, now);
        this.lastSimulationTick = currentTick;
      }

      // Get interpolated state for smooth animation
      const interpolatedState = this.interpolationController!.getInterpolatedState(now);

      // Update component visuals based on interpolated state
      this._updateComponentStates(interpolatedState);

      // Update wire animations
      this._updateWireAnimations(now);

      // Update MapControls (Phase 2)
      if (this.mapControls) {
        this.mapControls.update();
      }
    } catch (error) {
      const err = error as Error;
      this.emit('error', { message: err.message, error: err });
      throw error;
    }
  }

  /**
   * Set interpolation duration for state transitions
   *
   * Controls how long it takes to transition between simulation ticks.
   * Lower values = more responsive but choppier, higher values = smoother but laggier.
   *
   * @param durationMs - Duration in milliseconds
   * @throws {Error} If duration is not positive
   */
  setInterpolationDuration(durationMs: number): void {
    if (durationMs <= 0) {
      throw new Error('Interpolation duration must be positive');
    }

    if (this.interpolationController) {
      this.interpolationController.setTransitionDuration(durationMs);
    }
  }

  /**
   * Get the Three.js scene for rendering
   *
   * Consumer uses this to render: webglRenderer.render(scene, camera)
   *
   * @returns THREE.Scene containing all visual elements
   * @throws {Error} If not initialized
   */
  getScene(): THREE.Scene {
    this._checkInitialized();
    return this.scene!;
  }

  /**
   * Get the Three.js camera for rendering and manipulation
   *
   * @returns THREE.PerspectiveCamera for the scene
   * @throws {Error} If not initialized
   */
  getCamera(): THREE.PerspectiveCamera {
    this._checkInitialized();
    return this.camera!;
  }

  /**
   * Clean up all WebGL resources
   *
   * Disposes geometries, materials, textures, and clears event listeners.
   *
   * @throws {Error} If already disposed
   * @throws {Error} If not initialized
   */
  dispose(): void {
    if (this.disposed) {
      throw new Error('SceneManager already disposed');
    }

    if (!this.initialized) {
      throw new Error('Cannot dispose uninitialized scene manager');
    }

    try {
      // Dispose all geometries and materials
      this.scene!.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        } else if (obj instanceof THREE.Line) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      // Remove all objects from scene
      while (this.scene!.children.length > 0) {
        this.scene!.remove(this.scene!.children[0]);
      }

      // Clear maps
      this.componentMeshes.clear();
      this.wireMeshes.clear();
      this.enodeMeshes.clear();

      // Dispose MapControls (Phase 2)
      if (this.mapControls) {
        // Remove 'change' event listener (Phase 4)
        if (this.mapControlsChangeHandler) {
          this.mapControls.removeEventListener('change', this.mapControlsChangeHandler);
          this.mapControlsChangeHandler = null;
        }
        this.mapControls.dispose();
        this.mapControls = null;
      }

      // Dispose HoverManager (Phase 3)
      if (this.hoverManager) {
        this.hoverManager.dispose();
        this.hoverManager = null;
      }

      // Remove DOM event listeners (Phase 3)
      if (this.container) {
        if (this.mouseMoveHandler) {
          this.container.removeEventListener('mousemove', this.mouseMoveHandler);
          this.mouseMoveHandler = null;
        }
        if (this.mouseLeaveHandler) {
          this.container.removeEventListener('mouseleave', this.mouseLeaveHandler);
          this.mouseLeaveHandler = null;
        }
      }

      // Clear event listeners
      this.removeAllListeners();

      this.disposed = true;
    } catch (error) {
      const err = error as Error;
      this.emit('error', { message: err.message, error: err });
      throw error;
    }
  }

  // ==========================================
  // MapControls API (Phase 2)
  // ==========================================

  /**
   * Get MapControls instance for direct manipulation
   *
   * @returns MapControls instance or null if not initialized
   */
  getMapControls(): MapControls | null {
    return this.mapControls;
  }

  /**
   * Update MapControls options at runtime
   *
   * @param options - Partial MapControls configuration to apply
   * @throws {Error} If MapControls not initialized
   */
  updateMapControlsOptions(options: Partial<MapControlsOptions>): void {
    if (!this.mapControls) {
      throw new Error('MapControls not initialized');
    }

    // Merge with existing options
    this.mapControlsOptions = { ...this.mapControlsOptions, ...options };

    // Apply updates to MapControls
    if (options.enablePan !== undefined) {
      this.mapControls.enablePan = options.enablePan;
    }
    if (options.enableZoom !== undefined) {
      this.mapControls.enableZoom = options.enableZoom;
    }
    if (options.enableRotate !== undefined) {
      this.mapControls.enableRotate = options.enableRotate;
    }
    if (options.enableDamping !== undefined) {
      this.mapControls.enableDamping = options.enableDamping;
    }
    if (options.dampingFactor !== undefined) {
      this.mapControls.dampingFactor = options.dampingFactor;
    }
    if (options.minDistance !== undefined) {
      this.mapControls.minDistance = options.minDistance;
    }
    if (options.maxDistance !== undefined) {
      this.mapControls.maxDistance = options.maxDistance;
    }
    if (options.panSpeed !== undefined) {
      this.mapControls.panSpeed = options.panSpeed;
    }
    if (options.zoomSpeed !== undefined) {
      this.mapControls.zoomSpeed = options.zoomSpeed;
    }
    if (options.rotateSpeed !== undefined) {
      this.mapControls.rotateSpeed = options.rotateSpeed;
    }
  }

  /**
   * Reset camera to default position and target
   *
   * @param animate - Whether to animate the transition (not yet implemented)
   */
  resetCamera(animate: boolean = true): void {
    if (!this.camera || !this.mapControls) {
      return;
    }

    // Reset camera position
    this.camera.position.set(0, 0, 50);
    this.mapControls.target.set(0, 0, 0);
    this.mapControls.update();

    // TODO: Implement animation when animate=true
    if (animate) {
      console.warn('Camera reset animation not yet implemented');
    }
  }

  /**
   * Focus camera on a specific circuit element
   *
   * @param elementId - UUID of component, wire, or enode to focus on
   * @param animate - Whether to animate the transition (not yet implemented)
   */
  focusOnElement(elementId: UUID, animate: boolean = true): void {
    if (!this.camera || !this.mapControls || !this.circuitRunner) {
      return;
    }

    const circuit = this.circuitRunner.circuit;

    // Try to find the element in components, wires, or enodes
    let targetPosition: { x: number; y: number } | null = null;

    const component = circuit.getComponent(elementId);
    if (component) {
      targetPosition = component.position;
    } else {
      const wire = circuit.getWire(elementId);
      if (wire) {
        const fromEnode = circuit.getENode(wire.fromEnodeId);
        const toEnode = circuit.getENode(wire.toEnodeId);
        if (fromEnode && toEnode) {
          // Focus on wire midpoint
          targetPosition = {
            x: (fromEnode.position.x + toEnode.position.x) / 2,
            y: (fromEnode.position.y + toEnode.position.y) / 2,
          };
        }
      } else {
        const enode = circuit.getENode(elementId);
        if (enode) {
          targetPosition = enode.position;
        }
      }
    }

    if (targetPosition) {
      this.mapControls.target.set(targetPosition.x, targetPosition.y, 0);
      this.mapControls.update();
    }

    // TODO: Implement animation when animate=true
    if (animate) {
      console.warn('Camera focus animation not yet implemented');
    }
  }

  // ==========================================
  // HoverManager API (Phase 3)
  // ==========================================

  /**
   * Get the currently hovered element
   *
   * @returns HoveredElement if something is hovered, null otherwise
   */
  getHoveredElement() {
    return this.hoverManager?.getHoveredElement() ?? null;
  }

  /**
   * Enable or disable hover detection
   *
   * @param enabled - Whether to enable hover detection
   */
  setHoverEnabled(enabled: boolean): void {
    if (this.hoverManager) {
      this.hoverManager.setEnabled(enabled);
    }
  }

  /**
   * Check if hover detection is enabled
   *
   * @returns true if hover detection is enabled
   */
  isHoverEnabled(): boolean {
    return this.hoverManager?.isEnabled() ?? false;
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  /**
   * Check if scene manager is initialized
   * @throws {Error} If not initialized
   */
  private _checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('SceneManager not initialized');
    }

    if (this.disposed) {
      throw new Error('SceneManager has been disposed');
    }
  }

  /**
   * Initialize MapControls with configuration options (Phase 2)
   *
   * @param options - Optional MapControls configuration
   */
  private _initializeMapControls(options?: MapControlsOptions): void {
    if (!this.camera || !this.container) {
      return;
    }

    // Store options
    this.mapControlsOptions = options || {};

    // Create MapControls instance
    this.mapControls = new MapControls(this.camera, this.container);

    // Apply default options
    this.mapControls.enableDamping = this.mapControlsOptions.enableDamping ?? true;
    this.mapControls.dampingFactor = this.mapControlsOptions.dampingFactor ?? 0.05;
    this.mapControls.screenSpacePanning = true;

    // Apply user-provided options
    if (this.mapControlsOptions.enablePan !== undefined) {
      this.mapControls.enablePan = this.mapControlsOptions.enablePan;
    }
    if (this.mapControlsOptions.enableZoom !== undefined) {
      this.mapControls.enableZoom = this.mapControlsOptions.enableZoom;
    }
    if (this.mapControlsOptions.enableRotate !== undefined) {
      this.mapControls.enableRotate = this.mapControlsOptions.enableRotate;
    }
    if (this.mapControlsOptions.minDistance !== undefined) {
      this.mapControls.minDistance = this.mapControlsOptions.minDistance;
    }
    if (this.mapControlsOptions.maxDistance !== undefined) {
      this.mapControls.maxDistance = this.mapControlsOptions.maxDistance;
    }
    if (this.mapControlsOptions.panSpeed !== undefined) {
      this.mapControls.panSpeed = this.mapControlsOptions.panSpeed;
    }
    if (this.mapControlsOptions.zoomSpeed !== undefined) {
      this.mapControls.zoomSpeed = this.mapControlsOptions.zoomSpeed;
    }
    if (this.mapControlsOptions.rotateSpeed !== undefined) {
      this.mapControls.rotateSpeed = this.mapControlsOptions.rotateSpeed;
    }
  }

  /**
   * Initialize HoverManager for hover detection (Phase 3)
   *
   * @private
   */
  private _initializeHoverManager(): void {
    if (!this.scene || !this.camera || !this.container) {
      throw new Error('Scene, camera, and container must be initialized before HoverManager');
    }

    // Create HoverManager instance
    this.hoverManager = new HoverManager(this.scene, this.camera);

    // Track previous hover state for unhover events
    let previousElement: { id: UUID; objectType: any; userData?: any } | null = null;

    // Register callback to emit hover/unhover events
    this.hoverManager.onHoverChange((element) => {
      // Emit unhover for previous element if it exists
      if (previousElement && (!element || element.id !== previousElement.id)) {
        this.emit('unhover', {
          objectId: previousElement.id,
          objectType: previousElement.objectType,
        });

        // Handle unhover for component hitboxes (US2)
        if (previousElement.objectType === 'componentHitbox') {
          const componentId = previousElement.userData?.componentId;
          if (componentId) {
            const componentMesh = this.componentMeshes.get(componentId);
            if (componentMesh && componentMesh.userData.factory) {
              try {
                componentMesh.userData.factory.removeHover(componentMesh);
              } catch (error) {
                console.warn('Failed to remove hover effect:', error);
              }
            }
          }
        }
      }

      // Emit hover for new element
      if (element) {
        this.emit('hover', {
          objectId: element.id,
          objectType: element.objectType,
        });
        previousElement = {
          id: element.id,
          objectType: element.objectType,
          userData: element.object3D.userData,
        };

        // Handle hover for component hitboxes (US2)
        if (previousElement.objectType === 'componentHitbox') {
          const componentId = previousElement.userData?.componentId;
          if (componentId) {
            const componentMesh = this.componentMeshes.get(componentId);
            if (componentMesh && componentMesh.userData.factory) {
              try {
                componentMesh.userData.factory.applyHover(componentMesh);
              } catch (error) {
                console.warn('Failed to apply hover effect:', error);
              }
            }
          }
        }
      } else {
        // Clear hover state (US2)
        if (!!previousElement && previousElement.objectType === 'componentHitbox') {
          const componentId = previousElement.userData?.componentId;
          if (componentId) {
            const componentMesh = this.componentMeshes.get(componentId);
            if (componentMesh && componentMesh.userData.factory) {
              try {
                componentMesh.userData.factory.removeHover(componentMesh);
              } catch (error) {
                console.warn('Failed to remove hover effect:', error);
              }
            }
          }
        }
        previousElement = null;
      }
    });

    // Setup mousemove event listener
    this.mouseMoveHandler = (event: MouseEvent) => {
      if (!this.container || !this.hoverManager) return;

      const rect = this.container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.hoverManager.updateFromMouse(x, y);
    };

    this.container.addEventListener('mousemove', this.mouseMoveHandler);

    // Setup mouseleave event listener
    this.mouseLeaveHandler = (event: MouseEvent) => {
      if (this.hoverManager) {
        this.hoverManager.clear();
      }
    };

    this.container.addEventListener('mouseleave', this.mouseLeaveHandler);

    // Setup MapControls 'change' listener to refresh hover on camera movement (Phase 4)
    if (this.mapControls) {
      this.mapControlsChangeHandler = () => {
        if (this.hoverManager) {
          this.hoverManager.refresh();
        }
      };
      this.mapControls.addEventListener('change', this.mapControlsChangeHandler);
    }
  }

  /**
   * Perform full update - rebuild all visuals from circuit
   */
  private _fullUpdate(): void {
    if (!this.circuitRunner) {
      console.warn('_fullUpdate called without circuit set');
      return;
    }

    // Clear existing visuals first
    this._removeAllVisuals();

    const circuit = this.circuitRunner.circuit;

    // Create component meshes
    for (const component of circuit.getAllComponents()) {
      this._createComponentMesh(component);
    }

    // Create wire lines
    for (const wire of circuit.getAllWires()) {
      this._createWireMesh(wire);
    }

    // Create enode markers (only for branching points, not pins)
    for (const enode of circuit.getAllENodes()) {
      if (enode.type !== ENodeType.Pin) {
        this._createEnodeMesh(enode);
      }
    }
  }

  /**
   * Perform incremental update based on changed data
   *
   * @param changedData - Specification of what changed
   */
  private _incrementalUpdate(changedData: ChangedData): void {
    if (!this.circuitRunner) {
      return;
    }

    const circuit = this.circuitRunner.circuit;

    // Handle added components
    if (changedData.addedComponents) {
      for (const componentId of changedData.addedComponents) {
        const component = circuit.getComponent(componentId);
        if (component) {
          this._createComponentMesh(component);
        }
      }
    }

    // Handle removed components
    if (changedData.removedComponents) {
      for (const componentId of changedData.removedComponents) {
        this._removeComponentMesh(componentId);
      }
    }

    // Handle added wires
    if (changedData.addedWires) {
      for (const wireId of changedData.addedWires) {
        const wire = circuit.getWire(wireId);
        if (wire) {
          this._createWireMesh(wire);
        }
      }
    }

    // Handle removed wires
    if (changedData.removedWires) {
      for (const wireId of changedData.removedWires) {
        this._removeWireMesh(wireId);
      }
    }

    // Handle added enodes
    if (changedData.addedENodes) {
      for (const enodeId of changedData.addedENodes) {
        const enode = circuit.getENode(enodeId);
        if (enode && enode.type !== ENodeType.Pin) {
          this._createEnodeMesh(enode);
        }
      }
    }

    // Handle removed enodes
    if (changedData.removedENodes) {
      for (const enodeId of changedData.removedENodes) {
        this._removeEnodeMesh(enodeId);
      }
    }
  }

  /**
   * Remove all visual objects from scene
   */
  private _removeAllVisuals(): void {
    // Remove components
    for (const [id, mesh] of this.componentMeshes) {
      this.scene!.remove(mesh);
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
    this.componentMeshes.clear();

    // Remove wires
    for (const [id, line] of this.wireMeshes) {
      this.scene!.remove(line);
      line.geometry.dispose();
      if (Array.isArray(line.material)) {
        line.material.forEach((mat) => mat.dispose());
      } else {
        line.material.dispose();
      }
    }
    this.wireMeshes.clear();

    // Remove enodes
    for (const [id, mesh] of this.enodeMeshes) {
      this.scene!.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    this.enodeMeshes.clear();
  }

  /**
   * Create visual mesh for a component with state-aware materials
   *
   * @param component - Component to visualize
   */
  private _createComponentMesh(component: Component): void {
    const factory = this.factoryRegistry.get(component.type);
    // Support both function-based (legacy) and class-based (new) factories
    const mesh =
      typeof factory === 'function' ? factory(component) : factory.createVisual(component);

    // Position mesh at component location
    mesh.position.set(component.position.x, component.position.y, 0);
    mesh.rotation.z = component.rotation.angle;

    // Store component reference in userData
    mesh.userData.componentId = component.id;
    mesh.userData.componentType = component.type;

    // Store factory reference for hover/selection/animation (US2)
    // Only store if factory is class-based (has applyHover method)
    if (typeof factory !== 'function' && 'applyHover' in factory) {
      mesh.userData.factory = factory;
    }

    // Add to scene and tracking map
    this.scene!.add(mesh);
    this.componentMeshes.set(component.id, mesh);
  }

  /**
   * Create visual line for a wire with animation support
   *
   * @param wire - Wire to visualize
   */
  private _createWireMesh(wire: Wire): void {
    if (!this.circuitRunner) return;

    const circuit = this.circuitRunner.circuit;
    const fromEnode = circuit.getENode(wire.fromEnodeId);
    const toEnode = circuit.getENode(wire.toEnodeId);

    if (!fromEnode || !toEnode) {
      console.warn(`Cannot create wire mesh: missing enodes for wire ${wire.id}`);
      return;
    }

    // Create geometry
    const geometry = createWireGeometry(fromEnode.position, toEnode.position);

    // Create material (default for now, will be updated based on current flow)
    const material = createLineMaterial({ color: 0x00ff00, linewidth: 2 });

    const line = new THREE.Line(geometry, material);

    // Store wire reference and animation state in userData
    line.userData.wireId = wire.id;
    line.userData.animationPhase = 0;
    line.userData.currentFlow = 0;

    // Add to scene and tracking map
    this.scene!.add(line);
    this.wireMeshes.set(wire.id, line);
  }

  /**
   * Create visual sphere for an enode (branching point)
   *
   * @param enode - ENode to visualize
   */
  private _createEnodeMesh(enode: ENode): void {
    const geometry = createEnodeGeometry();
    const material = createStandardMaterial({ color: 0xffaa00 });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(enode.position.x, enode.position.y, 0.1);

    // Store enode reference in userData
    mesh.userData.enodeId = enode.id;
    mesh.userData.enodeType = enode.type;

    // Add to scene and tracking map
    this.scene!.add(mesh);
    this.enodeMeshes.set(enode.id, mesh);
  }

  /**
   * Remove component mesh from scene
   *
   * @param componentId - Component ID
   */
  private _removeComponentMesh(componentId: string): void {
    const mesh = this.componentMeshes.get(componentId);
    if (mesh) {
      this.scene!.remove(mesh);
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
      this.componentMeshes.delete(componentId);
    }
  }

  /**
   * Remove wire mesh from scene
   *
   * @param wireId - Wire ID
   */
  private _removeWireMesh(wireId: string): void {
    const line = this.wireMeshes.get(wireId);
    if (line) {
      this.scene!.remove(line);
      line.geometry.dispose();
      if (Array.isArray(line.material)) {
        line.material.forEach((mat) => mat.dispose());
      } else {
        line.material.dispose();
      }
      this.wireMeshes.delete(wireId);
    }
  }

  /**
   * Remove enode mesh from scene
   *
   * @param enodeId - ENode ID
   */
  private _removeEnodeMesh(enodeId: string): void {
    const mesh = this.enodeMeshes.get(enodeId);
    if (mesh) {
      this.scene!.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      } else {
        mesh.material.dispose();
      }
      this.enodeMeshes.delete(enodeId);
    }
  }

  /**
   * Capture current simulation state for interpolation
   *
   * @returns State snapshot
   */
  private _captureSimulationState(): any {
    if (!this.circuitRunner) {
      return {};
    }

    const state: any = {
      tick: this.circuitRunner.currentTick,
      components: {},
      wires: {},
    };

    // Capture component states
    for (const [componentId, mesh] of this.componentMeshes) {
      const componentState = this.circuitRunner.stateManager.getComponentState(componentId);
      if (componentState) {
        state.components[componentId] = {
          powered: componentState.isPowered,
          // Add more state properties as needed
        };
      }
    }

    // Capture wire states (current flow)
    for (const [wireId, line] of this.wireMeshes) {
      // Get electrical state from circuit runner state manager
      // This is a placeholder - actual implementation depends on state manager API
      state.wires[wireId] = {
        currentFlow: 0, // Would read from state manager
      };
    }

    return state;
  }

  /**
   * Update component visual states based on interpolated state
   *
   * @param interpolatedState - Interpolated state from controller
   */
  private _updateComponentStates(interpolatedState: any): void {
    if (!interpolatedState || !interpolatedState.components) {
      return;
    }

    for (const [componentId, mesh] of this.componentMeshes) {
      const componentState = interpolatedState.components[componentId];
      if (componentState && mesh instanceof THREE.Mesh) {
        // Update material based on powered state
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (componentState.powered) {
          material.emissive = new THREE.Color(0x00ff00);
          material.emissiveIntensity = 0.5;
        } else {
          material.emissive = new THREE.Color(0x000000);
          material.emissiveIntensity = 0;
        }
      }
    }
  }

  /**
   * Update wire animation states to show current flow
   *
   * @param now - Current timestamp
   */
  private _updateWireAnimations(now: number): void {
    for (const [wireId, line] of this.wireMeshes) {
      // Update animation phase for current flow visualization
      const animationSpeed = 0.001; // Adjust for animation speed
      line.userData.animationPhase =
        (line.userData.animationPhase + animationSpeed * (now - this.lastRenderTime)) % 1;

      // Update material based on current flow
      // This is a simple visualization - actual implementation could be more sophisticated
      const material = line.material as THREE.LineBasicMaterial;
      const flowIntensity = Math.abs(line.userData.currentFlow);

      if (flowIntensity > 0) {
        // Pulsing effect based on animation phase
        const pulse = 0.5 + 0.5 * Math.sin(line.userData.animationPhase * Math.PI * 2);
        material.opacity = 0.5 + 0.5 * pulse;
      } else {
        material.opacity = 0.3;
      }
    }
  }
}
