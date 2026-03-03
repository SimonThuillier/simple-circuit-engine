/**
 * Abstract Circuit Controller
 * @module scene/shared/AbstractCircuitController
 *
 * Base class for circuit visualization controllers.
 * Provides common Three.js scene management, camera controls, and hover detection.
 */

import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import {type UUID, type Circuit } from 'simple-circuit-engine/core';
import { EventEmitter } from './EventEmitter';
import type { IFactoryRegistry } from './components/ComponentVisualFactory';
import type {
  ControllerEventMap,
  ControllerOptions,
  HoveredElement,
  HoverableType,
  HitboxUserData,
  WireHitboxUserData,
  ComponentHitboxUserData,
  EnodeHitboxUserData,
  SharedResources, VisualContext,
} from './types';
import { createPerspectiveCamera, updateCamera } from './utils/CameraUtils';
import { setupSceneLights } from './utils/LightingUtils';
import { HoverManager } from './HoverManager';
import type { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { BranchingPointVisualFactory } from './BranchingPointVisualFactory';
import { WireVisualManager } from './WireVisualManager';
import { createGridHelper } from './utils/GeometryUtils';
import { controllerOptions } from './utils/Options';
import { createMapControls } from './utils/ControlsUtils';

/**
 * Abstract base class for circuit controllers.
 *
 * Provides common functionality for both static editing (CircuitController)
 * and live simulation (CircuitRunnerController) modes:
 * - Three.js scene, camera, and MapControls management
 * - Container lifecycle (initialize/dispose)
 * - Hover detection via HoverManager
 * - Visual object tracking maps
 *
 * Subclasses must implement:
 * - Circuit/CircuitRunner specific logic
 * - Visual creation and update methods
 * - Mode-specific features (editing tools or simulation interpolation)
 */
export abstract class AbstractCircuitController extends EventEmitter<ControllerEventMap> {
  // Container and Three.js core objects
  protected _container: HTMLElement | null = null;
  protected _scene: THREE.Scene | null = null;
  protected _grid: THREE.GridHelper | null = null;
  protected _camera: THREE.PerspectiveCamera | null = null;
  protected _mapControls: MapControls | null = null;

  // circuit being visualized
  protected _circuit: Circuit | null = null;

  // Wire visuals
  public readonly wireVisualManager: WireVisualManager;

  // State flags
  protected _initialized: boolean = false;
  protected _options: ControllerOptions | null;

  protected _active: boolean = false;
  protected _disposed: boolean = false;
  protected _gridHalfSize: number = 20;

  // Scene visual object factories - Wire visuals managed separately
  public readonly factoryRegistry: IFactoryRegistry;
  public readonly branchingPointVisualFactory: BranchingPointVisualFactory;

  // Scene objects tracking
  protected _componentObject3Ds: Map<UUID, THREE.Object3D> = new Map();
  protected _enodeObject3Ds: Map<UUID, THREE.Object3D> = new Map();
  protected _wireObject3Ds: Map<UUID, Line2> = new Map();

  // Hover system
  protected _hoverManager: HoverManager | null = null;
  protected _mouseMoveHandler: ((event: MouseEvent) => void) | null = null;
  protected _mouseLeaveHandler: ((event: MouseEvent) => void) | null = null;
  protected _mapControlsChangeHandler: (() => void) | null = null;

  // Shared resources injection
  protected _sharedResources: SharedResources | null = null;
  protected _useSharedResources: boolean = false;

  /**
   * Create a new circuit controller
   *
   * @param factoryRegistry - Component visual factory registry
   * @param sharedResources - Optional shared resources for facade pattern (CircuitEngine)
   * @throws {TypeError} If factoryRegistry is null/undefined
   */
  constructor(factoryRegistry: IFactoryRegistry, sharedResources?: SharedResources) {
    super();
    if (!factoryRegistry) {
      throw new TypeError('FactoryRegistry is required');
    }
    this._options = controllerOptions();

    // If shared resources provided, store them for use in initialize()
    if (sharedResources) {
      this._sharedResources = sharedResources;
      this._useSharedResources = true;
      this.factoryRegistry = sharedResources.factoryRegistry;
      this.branchingPointVisualFactory = sharedResources.branchingPointVisualFactory;
      this.wireVisualManager = sharedResources.wireVisualManager;
    } else {
      this._useSharedResources = false;
      this.factoryRegistry = factoryRegistry;
      this.branchingPointVisualFactory = new BranchingPointVisualFactory();
      this.wireVisualManager = new WireVisualManager(this._componentObject3Ds, this._wireObject3Ds);
    }
  }

  get componentObject3Ds(): Map<UUID, THREE.Object3D> {
    return this._componentObject3Ds;
  }

  get enodeObject3Ds(): Map<UUID, THREE.Object3D> {
    return this._enodeObject3Ds;
  }

  get wireObject3Ds(): Map<UUID, Line2> {
    return this._wireObject3Ds;
  }

  // @Memoize(...{
  //   expiring: undefined,
  //   hashFunction: (this._circuit) => this._circuit,
  //   tags: undefined
  // })
  get visualContext(): VisualContext {
    return {
      getENode: (id: UUID) => this._circuit?.getENode(id)
    }
  }

  protected get grid(): THREE.GridHelper | null {
    if (this._useSharedResources) return this._sharedResources?.grid || null;
    return this._grid;
  }

  protected set grid(grid: THREE.GridHelper) {
    if (this._useSharedResources) {
      if (this._sharedResources) {
        this._sharedResources.grid = grid;
      }
    } else {
      this._grid = grid;
    }
  }

  // ==========================================
  // Initialization and Lifecycle
  // ==========================================

  /**
   * Initialize the controller with a DOM container.
   * Creates scene, camera, lights, MapControls, and HoverManager.
   *
   * When sharedResources were provided in constructor, uses those instead
   * of creating new resources. This enables the CircuitEngine facade pattern.
   *
   * @param container - HTMLElement to attach scene to
   * @param options - Optional configuration
   * @throws {TypeError} If container is not a valid HTMLElement
   * @throws {Error} If already initialized
   */
  initialize(container: HTMLElement, options?: ControllerOptions): void {
    if (this._initialized) {
      return; // Already initialized
    }
    options = controllerOptions(options);
    this._options = options;

    if (!container || !(container instanceof HTMLElement)) {
      const error = new TypeError('Container must be a valid HTMLElement');
      this.emitError(error);
      throw error;
    }

    try {
      this._container = container;

      if (this._useSharedResources && this._sharedResources) {
        // Use injected shared resources
        this._componentObject3Ds = this._sharedResources.componentObject3Ds;
        this._enodeObject3Ds = this._sharedResources.enodeObject3Ds;
        this._wireObject3Ds = this._sharedResources.wireObject3Ds;

        this._scene = this._sharedResources.scene;
        this._camera = this._sharedResources.camera;
        this._mapControls = this._sharedResources.mapControls;
        this._hoverManager = this._sharedResources.hoverManager;
        // Note: factoryRegistry, branchingPointVisualFactory and WireVisualManager are already set from constructor

        // Initialize WireVisualManager resolution (Line2 rendering)
        this.wireVisualManager.setResolution(
          this._container!.clientWidth,
          this._container!.clientHeight
        );

        // Setup hover change callback for this controller
        if (!this._hoverManager.isInitialized()) {
          this._initializeHoverManager();
        }
        // Setup mouse event callbacks
        this._setupMouseCallbacks();
      } else {
        // Create own resources (standalone mode)
        // Create scene
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(options.backgroundColor);
        // Add default sized grid
        this._grid = createGridHelper(10, 10, options.colorCenterLine!, options.colorGrid!);
        this._scene.add(this._grid);

        setupSceneLights(this._scene);

        // Create camera
        const aspect = container.clientWidth / container.clientHeight || 1;
        this._camera = createPerspectiveCamera(aspect);
        this._camera.layers.set(0); // main visual layer
        this._camera.layers.enable(1); // enode hover layer
        this._camera.layers.enable(2); // component hover layer
        // Initialize MapControls
        this._mapControls = createMapControls(this._camera, this._container, options.mapControls!);

        // Initialize WireVisualManager
        this.wireVisualManager.setContainer(this._container!);
        this.wireVisualManager.setResolution(
          this._container!.clientWidth,
          this._container!.clientHeight
        );
        this.wireVisualManager.setSceneAndCamera(this._scene, this._camera);

        // Create HoverManager instance
        this._hoverManager = new HoverManager(this._scene, this._camera);
        // Initialize HoverManager
        this._initializeHoverManager();
        // Setup mouse event callbacks
        this._setupMouseCallbacks();
        // in standalone mode set active
        this._active = true;
      }

      // Allow subclasses to perform additional initialization
      this.onInitialize(options);

      this._initialized = true;

      // Emit ready event
      this.emitReady();
    } catch (error) {
      const err = error as Error;
      this.emitError(err);
      throw error;
    }
  }

  /**
   * Hook for subclasses to perform additional initialization.
   * Called after base initialization but before emitting 'ready'.
   *
   * @param options - Controller options passed to initialize()
   */
  protected abstract onInitialize(options?: ControllerOptions): void;

  /**
   * Emit the ready event with controller-specific data.
   */
  protected abstract emitReady(): void;

  /**
   * Emit an error event.
   */
  protected emitError(error: Error): void {
    (this as EventEmitter<ControllerEventMap>).emit('error', {
      message: error.message,
      error,
    });
  }

  /**
   * Check that controller is initialized and not disposed.
   * @throws {Error} If not initialized or already disposed
   */
  protected _checkInitialized(): void {
    if (!this._initialized) {
      throw new Error('Controller not initialized. Call initialize() first.');
    }
    if (this._disposed) {
      throw new Error('Controller has been disposed');
    }
  }

  /**
   * Clean up all WebGL resources.
   * Disposes geometries, materials, controls, and clears event listeners.
   *
   * When using shared resources, does not dispose scene, camera, controls, or hover manager
   * as those are owned by the CircuitEngine facade.
   */
  dispose(): void {
    this._checkInitialized();

    try {
      // Allow subclasses to clean up first
      this.onDispose();

      // Remove DOM event listeners (always owned by this controller)
      if (this._container) {
        if (this._mouseMoveHandler) {
          this._container.removeEventListener('mousemove', this._mouseMoveHandler);
          this._mouseMoveHandler = null;
        }
        if (this._mouseLeaveHandler) {
          this._container.removeEventListener('mouseleave', this._mouseLeaveHandler);
          this._mouseLeaveHandler = null;
        }
      }

      // Only dispose resources we own (not shared ones)
      if (!this._useSharedResources) {
        // Dispose HoverManager
        if (this._hoverManager) {
          this._hoverManager.dispose();
          this._hoverManager = null;
        }

        // Remove all visuals
        this._removeAllVisuals();
        // clear grid
        if (this.grid) {
          this._scene!.remove(this.grid);
          this.grid.geometry.dispose();
          this.grid.dispose();
          this._grid = null;
        }

        // Clear tracking maps
        this._componentObject3Ds.clear();
        this._enodeObject3Ds.clear();
        this._wireObject3Ds.clear();

        // dispose own wireVisualManager
        this.wireVisualManager.dispose();

        // Dispose MapControls
        if (this._mapControls) {
          if (this._mapControlsChangeHandler) {
            this._mapControls.removeEventListener('change', this._mapControlsChangeHandler);
            this._mapControlsChangeHandler = null;
          }
          this._mapControls.dispose();
          this._mapControls = null;
        }
      } else {
        // When using shared resources, just clear our references
        // The CircuitEngine will handle actual disposal
        this._hoverManager = null;
        this._scene = null;
        this._camera = null;
        this._mapControls = null;
        this._grid = null;
        // Note: visual maps are shared, so we don't clear them
      }

      // Clear event listeners
      this.removeAllListeners();

      this._disposed = true;
      this._initialized = false;
    } catch (error) {
      const err = error as Error;
      this.emitError(err);
      throw error;
    }
  }

  /**
   * Hook for subclasses to perform cleanup before base dispose.
   */
  protected abstract onDispose(): void;

  /**
   * Remove all visual objects from scene.
   * Subclasses must implement to handle their specific wire types.
   */
  protected abstract _removeAllVisuals(): void;

  public setActive(active: boolean): void {
    this._active = active;
    this.onSetActive(active);
  }

  protected abstract onSetActive(active: boolean): void;

  /**
   * Set the current circuit to visualize or null to clear the scene
   * @param circuit
   */
  abstract setCircuit(circuit: Circuit | null): void;

  /**
   * Get the current circuit being visualized
   */
  getCircuit(): Circuit | null {
    return this._circuit;
  }

  protected abstract onSetCircuit(): void;

  /**
   * Loads a new circuit to visualize or null for clearing the scene
   * @param circuit
   */
  protected _setCircuit(circuit: Circuit | null): void {
    this._checkInitialized();
    if (circuit === this._circuit) return; // TODO : implement hash and equals methods in circuit to perform value equality check

    if (!!this._circuit) {
      // Clear all existing visuals
      this._removeAllVisuals();
      const oldCircuitName = (this._circuit.metadata && this._circuit.metadata.options)?
          this._circuit.metadata.options.name: 'Unnamed Circuit';
      this._circuit = null;
      this.wireVisualManager.setCircuit(null);
      this.emit('circuitCleared', { name: oldCircuitName });
    }
    // clear grid in standalone mode
    if (!this._useSharedResources && this._grid) {
      this._grid.geometry.dispose();
      this._grid.dispose();
      this._scene!.remove(this._grid);
      this._grid = null;
    }

    if (circuit !== null) {
      const nameOrDefault = (circuit.metadata && circuit.metadata.options)?
          circuit.metadata.options.name: 'Unnamed Circuit';
      const options = this._options || controllerOptions();
      // Perform full update with new circuit
      this._circuit = circuit;
      this._scene!.name = nameOrDefault;
      this.wireVisualManager.setCircuit(circuit);
      this._gridHalfSize = Math.ceil(circuit.metadata.size / 2);
      // in standalone mode update grid, camera and controls according to circuit metadata
      if (!this._useSharedResources) {
        this._grid = createGridHelper(
          circuit.metadata.size,
          circuit.metadata.divisions,
          options.colorCenterLine!,
          options.colorGrid!
        );
        this._scene!.add(this._grid);

        if (this._camera) {
          updateCamera(this._camera, circuit.metadata.cameraOptions);
        }

        if (this._mapControls) {
          const controls = this._mapControls;
          const target = circuit.metadata.cameraOptions.lookAtPosition;
          controls.target.set(target.x, target.y, target.z);
        }
      }
      this.onSetCircuit();
      this.emit('circuitLoaded', {name: nameOrDefault});
    }
  }

  /**
   * get the object3D (Group for components and enodes, Line2 for wires) by hoverable type and id
   * @param type
   * @param id
   */
  getObject3D(type: HoverableType, id: UUID): THREE.Object3D | undefined {
    switch (type) {
      case 'component':
        return this._componentObject3Ds.get(id);
      case 'enode':
        return this._enodeObject3Ds.get(id);
      case 'wire':
        return this._wireObject3Ds.get(id);
      default:
        return undefined;
    }
  }

  /**
   * Get the MapControls instance for direct manipulation.
   */
  getControls(): MapControls | null {
    return this._mapControls;
  }

  // ==========================================
  // Hover System
  // ==========================================

  /**
   * Get the current cursor position on the ground plane (y=0) in world coordinates
   * The position is clamped within the circuit grid boundaries but not snapped to grid
   * @param bound - Whether to constrain position within grid boundaries, default false
   */
  cursorGroundPlanePosition(bound: boolean = false): THREE.Vector3 {
    const vector = this._hoverManager!.getGroundPlanePosition().clone();
    if (bound) {
      vector.set(
        Math.min(Math.max(vector.x, -this._gridHalfSize), this._gridHalfSize),
        0,
        Math.min(Math.max(vector.z, -this._gridHalfSize), this._gridHalfSize)
      );
    }
    return vector;
  }

  /**
   * Initialize HoverManager for hover detection
   *
   * @private
   */
  private _initializeHoverManager(): void {
    if (!this._hoverManager) {
      throw new Error('HoverManager must be constructed before initialization');
    }
    if (!this._container) {
      throw new Error('Container must be defined to initialize HoverManager');
    }

    // Track previous hover state for unhover events
    // let previousElement: {
    //   objectId: UUID;
    //   objectType: any;
    //   userData: HitboxUserData;
    // } | null = null;

    const unhoverPreviousElement = (element: HoveredElement) => {
      if (element.objectType === 'enodeHitbox') {
        const userData = element.object3D.userData as EnodeHitboxUserData;
        const enodeId = userData.enodeId;
        if (!enodeId) {
          console.warn('Failed to apply unhover effect (missing enodeId)');
          return;
        }
        const enodeGroup = this._enodeObject3Ds.get(enodeId);
        if (!enodeGroup) {
          console.warn('Failed to apply unhover effect (enodeGroup not found)');
          return;
        }
        try {
          // Use BranchingPointVisualFactory for branching points (T024)
          if (!userData.componentId) {
            this.branchingPointVisualFactory.removeHover(enodeGroup);
          } else {
            this.factoryRegistry.getFallbackFactory().removePinHover(enodeGroup);
          }
        } catch (error) {
          console.warn('Failed to apply unhover effect:', error);
        }
        return;
      } else if (element.objectType === 'componentHitbox') {
        const userData = element.object3D.userData as ComponentHitboxUserData;
        const componentId = userData.componentId;
        if (!componentId) {
          console.warn('Failed to apply unhover effect (missing componentId)');
          return;
        }
        const componentGroup = this._componentObject3Ds.get(componentId);
        if (!componentGroup) {
          console.warn('Failed to apply unhover effect (componentGroup not found)');
          return;
        }
        try {
          const factory = this.factoryRegistry.get(userData.componentType);
          factory.removeHover(componentGroup);
        } catch (error) {
          console.warn('Failed to remove hover effect:', error);
        }
        return;
      } else if (element.objectType === 'wire') {
        const userData = element.object3D.userData as WireHitboxUserData;
        const wireId = userData.wireId;
        if (!wireId) {
          console.warn('Failed to apply unhover effect (missing wireId)');
          return;
        }
        const wire = this._wireObject3Ds.get(wireId);
        if (!wire) {
          console.warn('Failed to apply unhover effect (wire not found)');
          return;
        }
        this.wireVisualManager.removeHoveredVisual(wireId);
      }
    };

    const hoverElement = (element: HoveredElement) => {
      if (element.objectType === 'enodeHitbox') {
        const userData = element.object3D.userData as EnodeHitboxUserData;
        const enodeId = userData.enodeId;
        if (!enodeId) {
          console.warn('Failed to apply hover effect (missing enodeId)');
          return;
        }
        const enodeGroup = this._enodeObject3Ds.get(enodeId);
        if (!enodeGroup) {
          console.warn('Failed to apply hover effect (enodeGroup not found)');
          return;
        }
        try {
          // Use BranchingPointVisualFactory for branching points (T024)
          if (!userData.componentId) {
            this.branchingPointVisualFactory.applyHover(enodeGroup);
          } else {
            this.factoryRegistry.getFallbackFactory().applyPinHover(enodeGroup);
          }
        } catch (error) {
          console.warn('Failed to apply hover effect:', error);
        }
        return;
      } else if (element.objectType === 'componentHitbox') {
        const userData = element.object3D.userData as ComponentHitboxUserData;
        const componentId = userData.componentId;
        if (!componentId) {
          console.warn('Failed to apply hover effect (missing componentId)');
          return;
        }
        const componentGroup = this._componentObject3Ds.get(componentId);
        if (!componentGroup) {
          console.warn('Failed to apply hover effect (componentGroup not found)');
          return;
        }
        try {
          const factory = this.factoryRegistry.get(userData.componentType);
          factory.applyHover(componentGroup);
        } catch (error) {
          console.warn('Failed to apply hover effect:', error);
        }
        return;
      } else if (element.objectType === 'wire') {
        const userData = element.object3D.userData as WireHitboxUserData;
        const wireId = userData.wireId;
        if (!wireId) {
          console.warn('Failed to apply hover effect (missing wireId)');
          return;
        }
        const wire = this._wireObject3Ds.get(wireId);
        if (!wire) {
          console.warn('Failed to apply hover effect (wire not found)');
          return;
        }
        this.wireVisualManager.applyHoveredVisual(wireId);
      }
    };

    // Register callback to emit hover/unhover events
    this._hoverManager.onHoverChange((element, previousElement) => {
      // Emit unhover for previous element if it exists
      if (previousElement && (!element || element.id !== previousElement.id)) {
        unhoverPreviousElement(previousElement);
        this.emit('unhover', {
          objectId: previousElement.id,
          objectType: previousElement.objectType,
          userData: previousElement.object3D.userData as HitboxUserData,
        });
        previousElement = null;
      }

      // Emit hover for new element
      if (element) {
        hoverElement(element);
        this.emit('hover', {
          objectId: element.id,
          objectType: element.objectType,
          userData: element.object3D.userData as HitboxUserData,
        });
      }
    });

    // Setup MapControls 'change' listener to refresh hover on camera movement
    if (this._mapControls) {
      this._mapControlsChangeHandler = () => {
        if (this._hoverManager) {
          this._hoverManager.refresh();
        }
      };
      this._mapControls.addEventListener('change', this._mapControlsChangeHandler);
    }
    this._hoverManager.setInitialized(true);
  }

  protected _setupMouseCallbacks(): void {
    if (!this._hoverManager) {
      throw new Error('HoverManager must be constructed before setting up mouse callbacks');
    }
    if (!this._container) {
      throw new Error('Container must be defined to setup mouse callbacks');
    }

    // Setup mousemove event listener : must always be active so that current world position can be queried
    this._mouseMoveHandler = (event: MouseEvent) => {
      if (!this._active || !this._container || !this._hoverManager) return;
      const rect = this._container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const oldPosition = this.cursorGroundPlanePosition();
      this._hoverManager.updateFromMouse(x, y);
      const newPosition = this.cursorGroundPlanePosition();
      if (!newPosition.equals(oldPosition)) {
        // this important event will be used by tools such as BuildTool to update preview positions
        this.emit('gridPositionMove', newPosition);
      }
    };
    this._container.addEventListener('mousemove', this._mouseMoveHandler);

    // Setup mouseleave event listener
    this._mouseLeaveHandler = (_event: MouseEvent) => {
      if (this._hoverManager) {
        this._hoverManager.clear();
      }
    };
    this._container.addEventListener('mouseleave', this._mouseLeaveHandler);
  }

  /**
   * Get the currently hovered element.
   */
  getHoveredElement(): HoveredElement | null {
    return this._hoverManager?.getHoveredElement() ?? null;
  }

  /**
   * Enable or disable hover detection.
   */
  setHoverEnabled(enabled: boolean): void {
    this._hoverManager?.setEnabled(enabled);
  }

  /**
   * Check if hover detection is enabled.
   */
  isHoverEnabled(): boolean {
    return this._hoverManager?.isEnabled() ?? false;
  }

  // ==========================================
  // Getters
  // ==========================================

  /**
   * Get the Three.js scene for rendering.
   * @throws {Error} If not initialized
   */
  getScene(): THREE.Scene {
    this._checkInitialized();
    return this._scene!;
  }

  /**
   * Get the Three.js camera for rendering.
   * @throws {Error} If not initialized
   */
  getCamera(): THREE.PerspectiveCamera {
    this._checkInitialized();
    return this._camera!;
  }

  /**
   * Get the HTML container element.
   * @throws {Error} If not initialized
   */
  getContainer(): HTMLElement {
    this._checkInitialized();
    if (!this._container) {
      throw new Error('Container not initialized');
    }
    return this._container;
  }

  /**
   * Check if controller is initialized.
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Check if controller is disposed.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  // ==========================================
  // Container Resize
  // ==========================================

  /**
   * event handler when the container size changes
   * Can override the container boundingClientRect size by providing width and height
   * - Update camera projection matrix
   * - Update viewport size for Line2 material resolution
   * Should be called when the container size changes (e.g., window resize)
   *
   * @param width - New width (optional, uses container size if not provided)
   * @param height - New height (optional, uses container size if not provided)
   */
  onContainerResize(width?: number, height?: number): void {
    if (!this._container) return;

    if (width === undefined || height === undefined) {
      const rect = this._container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    }

    if (this._camera) {
      this._camera.aspect = width / height;
      this._camera.updateProjectionMatrix();
    }
    this.wireVisualManager.setResolution(width, height);

    // Allow subclasses to handle resize
    this.onResize(width, height);
  }

  /**
   * Hook for subclasses to handle container resize.
   */
  protected onResize(_width: number, _height: number): void {
    // Default: no-op, subclasses can override
  }
}
