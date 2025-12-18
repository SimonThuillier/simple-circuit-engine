/**
 * Static Circuit Renderer
 * @module rendering/static/StaticCircuitRenderer
 *
 * Renders static circuit topology in 3D space with support for editing tools.
 */

import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import type { Circuit } from '../../core/Circuit';
import type { Component } from '../../core/Component';
import type { Wire } from '../../core/Wire';
import type { ENode } from '../../core/ENode';
import type { UUID } from '../../core/types/Identifier';
import { ENodeType } from '../../core/types/ENodeType';
import { EventEmitter } from '../shared/EventEmitter';
import type { IFactoryRegistry } from '../shared/components/ComponentVisualFactory';
import type {
  SceneManagerEventMap,
  ChangedData,
  SceneManagerOptions,
  MapControlsOptions,
  ToolType,
  HitboxUserData,
  HoveredElement,
  CircuitSceneObjectType,
  EnodeHitboxUserData,
  ComponentHitboxUserData,
  SelectionData,
  HoverableType,
  MultiSelectionData,
  WireHitboxUserData,
} from '../shared/types';
import { createPerspectiveCamera } from '../shared/CameraUtils';
import { setupSceneLights } from '../shared/LightingUtils';
import {
  createGridHelper,
  gridToWorldPosition,
  gridToWorldRotation,
} from '../shared/GeometryUtils';
import { BuildTool } from './tools/BuildTool';
import { AddComponentTool } from './tools/AddComponentTool';
import type { IEditingTool } from '../shared/types';
import { HoverManager } from '../shared/HoverManager';
import { applyENodeHover, removeENodeHover } from '../shared/ENodesUtils';
import { SelectionManager } from '../shared/SelectionManager';
import { WireVisualManager } from '../shared/WireVisualManager';
import type { ComponentType } from '@/core/types/ComponentType';
import { CircuitEditionManager } from './CircuitEditionManager';
import { BranchingPointVisualFactory } from '../shared/components/BranchingPointVisualFactory';
import type { Euler } from 'three';

/**
 * Static Circuit Scene Manager Implementation
 *
 * Manager providing a bidirectional interface between a Circuit and a Three.js scene/camera ready to be rendered.
 * Supports view manipulation and editing via integrated tool system.
 * Provides event hooks for error handling and state changes.
 */
export class CircuitSceneManager extends EventEmitter<SceneManagerEventMap> {
  public readonly factoryRegistry: IFactoryRegistry;

  private circuit?: Circuit | null = null;
  private scene: THREE.Scene | null = null;
  // private readonly groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private camera: THREE.PerspectiveCamera | null = null;
  private container: HTMLElement | null = null;
  private initialized: boolean = false;
  private disposed: boolean = false;

  // Visual object tracking
  private grid: THREE.GridHelper | null = null;
  private componentObject3Ds: Map<UUID, THREE.Object3D> = new Map();
  private enodeObject3Ds: Map<UUID, THREE.Object3D> = new Map();
  private wireObject3Ds: Map<UUID, Line2> = new Map();

  // Edit mode and tool system (Phase 5)
  private editMode: boolean = false;
  private activeTool: ToolType | null = null;
  private tools: Map<ToolType, IEditingTool> = new Map();
  private toolState: any = null;

  // MapControls (Phase 2)
  private mapControls: MapControls | null = null;
  private mapControlsOptions: MapControlsOptions = {};

  // HoverManager (Phase 3)
  private hoverManager: HoverManager | null = null;
  private mouseMoveHandler: ((event: MouseEvent) => void) | null = null;
  private mouseLeaveHandler: ((event: MouseEvent) => void) | null = null;
  private mapControlsChangeHandler: (() => void) | null = null;

  // SelectionManager (Phase 6)
  private selectionManager: SelectionManager | null = null;

  // WireVisualManager (Phase 3 - User Story 3)
  private wireVisualManager: WireVisualManager = new WireVisualManager(this);

  // CircuitEditionManager handles saving edits to the core model
  private circuitEditionManager: CircuitEditionManager = new CircuitEditionManager(this);

  // BranchingPointVisualFactory for creating branching point visuals (T022)
  private branchingPointVisualFactory: BranchingPointVisualFactory =
    new BranchingPointVisualFactory();

  /**
   * Create a new Static Circuit Renderer
   *
   * @param factoryRegistry - Component visual factory registry
   * @throws {TypeError} If circuit or factoryRegistry is null/undefined
   */
  constructor(factoryRegistry: IFactoryRegistry) {
    super();

    if (!factoryRegistry) {
      throw new TypeError('FactoryRegistry is required');
    }

    this.factoryRegistry = factoryRegistry;
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.onContainerResize = this.onContainerResize.bind(this);
  }

  /**
   * Initialize the renderer with a DOM container
   *
   * @param container - HTMLElement to attach scene to
   * @param options - Optional renderer configuration
   */
  initialize(container: HTMLElement, options?: SceneManagerOptions): void {
    if (this.initialized) {
      throw new Error('Renderer already initialized');
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
      this.scene.background = new THREE.Color(0x222230);

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

      // Initialize tools (Phase 5)
      this._initializeTools();

      // Initialize MapControls (Phase 2)
      this._initializeMapControls(options?.mapControls);

      // Initialize HoverManager (Phase 3)
      this._initializeHoverManager();

      // Initialize SelectionManager (Phase 6)
      this._initializeSelectionManager();

      // Initialize WireVisualManager resolution (Line2 rendering)
      this.wireVisualManager.setResolution(container.clientWidth, container.clientHeight);

      this.initialized = true;

      // Emit ready event
      this.emit('ready', { manager: 'static' });
    } catch (error) {
      const err = error as Error;
      this.emit('error', { message: err.message, error: err });
      throw error;
    }
  }

  /**
   * Initialize MapControls for camera navigation
   *
   * @param options - Optional MapControls configuration
   * @private
   */
  private _initializeMapControls(options?: MapControlsOptions): void {
    if (!this.camera || !this.container) {
      throw new Error('Camera and container must be initialized before MapControls');
    }

    // Store options for later updates
    this.mapControlsOptions = options || {};

    // Create MapControls instance
    this.mapControls = new MapControls(this.camera, this.container);

    // Apply default options
    this.mapControls.enableDamping = this.mapControlsOptions.enableDamping ?? true;
    this.mapControls.dampingFactor = this.mapControlsOptions.dampingFactor ?? 0.05;
    this.mapControls.screenSpacePanning = true; // Always true for map-style panning

    // Apply user options
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
   * Get the current cursor position on the ground plane (y=0) in world coordinates
   * The position is clamped within the circuit grid boundaries but not snapped to grid
   */
  cursorGroundPlanePosition(): THREE.Vector3 {
    const gridHalfSize = this.circuit ? Math.ceil(this.circuit.metadata.size / 2) : 10;
    const vector = this.hoverManager!.getGroundPlanePosition().clone();
    vector.set(
      Math.min(Math.max(vector.x, -gridHalfSize), gridHalfSize),
      0,
      Math.min(Math.max(vector.z, -gridHalfSize), gridHalfSize)
    );
    return vector;
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
    let previousElement: {
      objectId: UUID;
      objectType: any;
      userData: HitboxUserData;
    } | null = null;

    const unhoverPreviousElement = (element: {
      objectId: string;
      objectType: CircuitSceneObjectType;
      userData: HitboxUserData;
    }) => {
      if (element.objectType === 'enodeHitbox') {
        const userData = element.userData as EnodeHitboxUserData;
        const enodeId = userData.enodeId;
        if (!enodeId) {
          console.warn('Failed to apply unhover effect (missing enodeId)');
          return;
        }
        const enodeGroup = this.enodeObject3Ds.get(enodeId);
        if (!enodeGroup) {
          console.warn('Failed to apply unhover effect (enodeGroup not found)');
          return;
        }
        try {
          // Use BranchingPointVisualFactory for branching points (T024)
          if (!userData.componentId) {
            this.branchingPointVisualFactory.removeHover(enodeGroup);
          } else {
            removeENodeHover(enodeGroup);
          }
        } catch (error) {
          console.warn('Failed to apply unhover effect:', error);
        }
        return;
      } else if (element.objectType === 'componentHitbox') {
        const userData = element.userData as ComponentHitboxUserData;
        const componentId = userData.componentId;
        if (!componentId) {
          console.warn('Failed to apply unhover effect (missing componentId)');
          return;
        }
        const componentGroup = this.componentObject3Ds.get(componentId);
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
        const userData = element.userData as WireHitboxUserData;
        const wireId = userData.wireId;
        if (!wireId) {
          console.warn('Failed to apply unhover effect (missing wireId)');
          return;
        }
        const wire = this.wireObject3Ds.get(wireId);
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
        const enodeGroup = this.enodeObject3Ds.get(enodeId);
        if (!enodeGroup) {
          console.warn('Failed to apply hover effect (enodeGroup not found)');
          return;
        }
        try {
          // Use BranchingPointVisualFactory for branching points (T024)
          if (!userData.componentId) {
            this.branchingPointVisualFactory.applyHover(enodeGroup);
          } else {
            applyENodeHover(enodeGroup);
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
        const componentGroup = this.componentObject3Ds.get(componentId);
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
        const wire = this.wireObject3Ds.get(wireId);
        if (!wire) {
          console.warn('Failed to apply hover effect (wire not found)');
          return;
        }
        this.wireVisualManager.applyHoveredVisual(wireId);
      }
    };

    // Register callback to emit hover/unhover events
    this.hoverManager.onHoverChange((element) => {
      // Emit unhover for previous element if it exists
      if (previousElement && (!element || element.id !== previousElement.objectId)) {
        unhoverPreviousElement(previousElement);
        this.emit('unhover', { ...previousElement });
        previousElement = null;
      }

      // Emit hover for new element
      if (element) {
        hoverElement(element);
        previousElement = {
          objectId: element.id,
          objectType: element.objectType,
          userData: element.object3D.userData as HitboxUserData,
        };
        this.emit('hover', { ...previousElement });
      }
    });

    // Setup mousemove event listener : must always be active so that current world position can be queried
    this.mouseMoveHandler = (event: MouseEvent) => {
      if (!this.container || !this.hoverManager) return;
      const rect = this.container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const oldPosition = this.cursorGroundPlanePosition();
      this.hoverManager.updateFromMouse(x, y);
      const newPosition = this.cursorGroundPlanePosition();
      if (!newPosition.equals(oldPosition)) {
        // this important event will be used by tools such as BuildTool to update preview positions
        this.emit('gridPositionMove', newPosition);
      }
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

  private handlePointerDown(event: MouseEvent): void {
    // discard if right click or middle click
    if (event.button !== 0) {
      return;
    }

    // common behavior regardless of the tool: select on pointer down
    if (this.hoverManager?.getHoveredElement()) {
      // always: emit position event when hovered element
      const element = this.hoverManager.getHoveredElement()!;
      const alreadySelected = this.selectionManager!.isSelected(element.type, element.id);
      if (!alreadySelected) {
        this.selectionManager?.selectOne(element.type, element.id, element.object3D.userData);
        this.emit('select', this.selectionManager!.getSelection()!);
      }
    } else {
      // always: emit deselect event when not hovered element
      const hasSelection = this.selectionManager?.hasSelection();
      if (hasSelection) {
        const selection = this.selectionManager!.getSelection()!;
        this.selectionManager?.deselect();
        this.emit('deselect', selection);
      }
    }
  }

  private _applySelectionVisual(selection: SelectionData, selected: boolean): void {
    let components: Map<UUID, string | null> | null = null;
    let enodes: Map<UUID, string | null> | null = null;
    let wires: Map<UUID, string | null> | null = null;
    if (selection.kind === 'mono') {
      switch (selection.type) {
        case 'component':
          components = new Map<UUID, string | null>();
          components.set(selection.id, selection.data ?? null);
          break;
        case 'enode':
          enodes = new Map<UUID, string | null>();
          enodes.set(selection.id, selection.data ?? null);
          break;
        case 'wire':
          wires = new Map<UUID, string | null>();
          wires.set(selection.id, selection.data ?? null);
          break;
        default:
          break;
      }
    } else {
      components = selection.components || null;
      enodes = selection.enodes || null;
      wires = selection.wires || null;
    }

    if (components) {
      for (const [id, _data] of components) {
        const object3D = this.componentObject3Ds.get(id);
        if (!object3D) {
          continue;
        }
        try {
          const componentType = object3D.userData.componentType as ComponentType;
          const factory = this.factoryRegistry.get(componentType);
          if (selected) {
            factory.applySelection(object3D);
          } else {
            factory.removeSelection(object3D);
          }
        } catch (error) {
          console.warn(
            `Failed to ${selected ? 'apply' : 'remove'} component selection visual:`,
            error
          );
        }
      }
    } else if (enodes) {
      for (const [id, _data] of enodes) {
        const object3D = this.enodeObject3Ds.get(id);
        if (!object3D) {
          continue;
        }
        if (!!object3D.userData.componentId) continue; // pins cannot be selected individually
        if (selected) {
          this.branchingPointVisualFactory.applySelection(object3D);
        } else {
          this.branchingPointVisualFactory.removeSelection(object3D);
        }
      }
      // enodes selection visual handling can be added here in the future
    } else if (wires) {
      for (const [id, _data] of wires) {
        if (selected) {
          this.wireVisualManager.applySelectedVisual(id);
        } else {
          this.wireVisualManager.removeSelectedVisual(id);
        }
      }
    }
  }

  private _initializeSelectionManager(): void {
    if (!this.scene || !this.camera || !this.container) {
      throw new Error('Scene, camera, and container must be initialized before SelectionManager');
    }

    // Create SelectionManager instance
    this.selectionManager = new SelectionManager();

    // Register callback to handle selection visual changes (T025)
    this.selectionManager.onSelectionChange((newSelection, previousSelection) => {
      // Remove selection visual from previous selection
      if (previousSelection) {
        this._applySelectionVisual(previousSelection, false);
      }
      // Apply selection visual to new selection
      if (newSelection) {
        this._applySelectionVisual(newSelection, true);
      }

      // Emit selectionChange event (T026)
      this.emit('selectionChange', {
        newSelection: previousSelection,
        previousSelection: newSelection,
      });
    });

    this.container.addEventListener('pointerdown', this.handlePointerDown);
  }

  getCircuit(): Circuit | null | undefined {
    return this.circuit;
  }

  /**
   * event handler when the container size changes
   * Can override the container boundingClientRect size by providing width and height
   * - Update camera projection matrix
   * - Update viewport size for Line2 material resolution
   *
   * Should be called when the container size changes (e.g., window resize)
   */
  onContainerResize(width?: number | undefined, height?: number | undefined): void {
    if (!this.container) return;
    if (width === undefined || height === undefined) {
      const rect = this.container?.getBoundingClientRect()!;
      width = rect.width;
      height = rect.height;
    }
    if (this.camera && typeof this.camera.updateProjectionMatrix === 'function') {
      if (this.camera.aspect !== undefined) this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    this.wireVisualManager.setResolution(width, height);
  }

  /**
   * Update the circuit to visualize or indicate no circuit loaded
   * @param circuit
   */
  setCircuit(circuit: Circuit | null): void {
    if (circuit === this.circuit) return; // No change
    // TODO reset changedData ?
    if (!!this.circuit && this.initialized) {
      // Clear existing visuals
      this._removeAllVisuals();
      return;
    }

    this.circuit = circuit;
    if (circuit !== null && this.initialized) {
      // Perform full update with new circuit
      this.scene!.name = this.circuit!.metadata.name || 'Circuit Scene';
      this._fullUpdate();
    }
  }

  /**
   * Update visualization based on circuit changes
   *
   * @param changedData - Optional incremental update specification
   */
  update(changedData?: ChangedData): void {
    this._checkInitialized();

    try {
      if (!changedData) {
        // Full update - rebuild all visuals
        this._fullUpdate();
      } else {
        // Incremental update
        this._incrementalUpdate(changedData);
      }
    } catch (error) {
      const err = error as Error;
      this.emit('error', { message: err.message, error: err });
      throw error;
    }
  }

  /**
   * Clear visuals but don't dispose completely renderer - may be used for next circuit
   */
  clearVisuals() {
    if (!this.initialized) {
      throw new Error('Cannot clear unitialized renderer');
    }
    this._removeAllVisuals();
  }

  /**
   * Render one frame (called by external animation loop)
   */
  render(): void {
    this._checkInitialized();

    try {
      // Update MapControls if damping is enabled
      if (this.mapControls) {
        this.mapControls.update();
      }

      // In CircuitSceneManager, render() is mostly a no-op
      // Scene updates are done in update()
      // Consumer handles actual WebGL rendering via getScene()
    } catch (error) {
      const err = error as Error;
      this.emit('error', { message: err.message, error: err });
      throw error;
    }
  }

  /**
   * Get the Three.js scene for rendering
   *
   * @returns Scene
   */
  getScene(): THREE.Scene {
    this._checkInitialized();
    return this.scene!;
  }

  /**
   * Get the Three.js camera for rendering
   *
   * @returns camera
   */
  getCamera(): THREE.PerspectiveCamera {
    this._checkInitialized();
    return this.camera!;
  }

  /**
   * Get the HTML Element container, if not throws error
   * @returns HTMLElement
   */
  getContainer(): HTMLElement {
    this._checkInitialized();
    if (!this.container) {
      throw new Error('Container not initialized');
    }
    return this.container!;
  }

  /**
   * Get the SelectionManager instance for direct manipulation
   * @returns SelectionManager
   */
  getSelectionManager(): SelectionManager {
    this._checkInitialized();
    if (!this.selectionManager) {
      throw new Error('SelectionManager not initialized');
    }
    return this.selectionManager!;
  }

  /**
   * Get the WireVisualManager instance for direct manipulation
   * @returns WireVisualManager
   */
  getWireVisualManager(): WireVisualManager {
    return this.wireVisualManager!;
  }

  /**
   * Get the CircuitEditionManager instance for calls by tools
   */
  getCircuitEditionManager(): CircuitEditionManager {
    return this.circuitEditionManager;
  }

  /**
   * Get the BranchingPointVisualFactory for creating/Updating branching point visuals
   */
  getBranchingPointVisualFactory(): BranchingPointVisualFactory {
    return this.branchingPointVisualFactory;
  }

  /**
   * Get the MapControls instance for direct manipulation
   *
   * @returns MapControls instance or null if not initialized
   */
  getControls(): MapControls | null {
    return this.mapControls;
  }

  /**
   * Get the FactoryRegistry for component visual factories
   *
   * @returns IFactoryRegistry instance
   */
  getFactoryRegistry(): IFactoryRegistry {
    return this.factoryRegistry;
  }

  getComponentObject3Ds(): Map<string, THREE.Object3D> {
    return this.componentObject3Ds;
  }

  getEnodeObject3Ds(): Map<string, THREE.Object3D> {
    return this.enodeObject3Ds;
  }

  getWireObject3Ds(): Map<string, Line2> {
    return this.wireObject3Ds;
  }

  /**
   * get the object3D (Group for components and enodes, Line2 for wires) by hoverable type and id
   * @param type
   * @param id
   */
  getObject3D(type: HoverableType, id: UUID): THREE.Object3D | undefined {
    switch (type) {
      case 'component':
        return this.componentObject3Ds.get(id);
      case 'enode':
        return this.enodeObject3Ds.get(id);
      case 'wire':
        return this.wireObject3Ds.get(id);
      default:
        return undefined;
    }
  }

  /**
   * Get current positions of selected objects
   * @param selection
   */
  getSelectionPositions(
    selection: SelectionData
  ): Map<UUID, { type: HoverableType; position: THREE.Vector3 }> {
    const selectionPositions = new Map<UUID, { type: HoverableType; position: THREE.Vector3 }>();
    if (selection.kind === 'mono') {
      const object = this.getObject3D(selection.type, selection.id);
      if (object) {
        selectionPositions.set(selection.id as UUID, {
          type: selection.type,
          position: object.position.clone(),
        });
      }
    } else {
      const multiSelection = selection as MultiSelectionData;
      if (multiSelection.components) {
        for (const id of multiSelection.components.keys()) {
          const object = this.getObject3D('component', id);
          if (object) {
            selectionPositions.set(id, { type: 'component', position: object.position.clone() });
          }
        }
      }
      // TODO: implement for wires and enodes later
    }
    return selectionPositions;
  }

  /**
   * Update MapControls options at runtime
   *
   * @param options - Partial options to update
   */
  updateControlsOptions(options: Partial<MapControlsOptions>): void {
    this._checkInitialized();

    if (!this.mapControls) {
      throw new Error('MapControls not initialized');
    }

    // Merge new options with existing
    this.mapControlsOptions = { ...this.mapControlsOptions, ...options };

    // Apply updated options to MapControls
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
   * Reset camera to default position
   *
   * @param animate - Whether to animate the transition (default: true)
   */
  resetCamera(animate: boolean = true): void {
    this._checkInitialized();

    if (!this.camera || !this.mapControls) {
      throw new Error('Camera and MapControls must be initialized');
    }

    // Reset to default camera position (top-down view of circuit)
    const target = new THREE.Vector3(0, 0, 0);
    const position = new THREE.Vector3(0, 10, 10);

    if (animate && this.mapControls.enableDamping) {
      // Smoothly transition by updating target and position
      this.mapControls.target.copy(target);
      this.camera.position.copy(position);
      this.mapControls.update();
    } else {
      // Instant reset
      this.mapControls.target.copy(target);
      this.camera.position.copy(position);
      this.mapControls.update();
    }
  }

  /**
   * Focus camera on a specific element
   *
   * @param elementId - UUID of the element to focus on
   * @param animate - Whether to animate the transition (default: true)
   * @throws {Error} If element is not found in scene
   */
  focusOnElement(elementId: UUID, animate: boolean = true): void {
    this._checkInitialized();

    if (!this.camera || !this.mapControls) {
      throw new Error('Camera and MapControls must be initialized');
    }

    // Find the element in the scene
    let targetObject: THREE.Object3D | null = null;

    // Check components
    if (this.componentObject3Ds.has(elementId)) {
      targetObject = this.componentObject3Ds.get(elementId)!;
    }
    // Check wires
    else if (this.wireObject3Ds.has(elementId)) {
      targetObject = this.wireObject3Ds.get(elementId)!;
    }
    // Check enodes
    else if (this.enodeObject3Ds.has(elementId)) {
      targetObject = this.enodeObject3Ds.get(elementId)!;
    }

    if (!targetObject) {
      throw new Error(`Element ${elementId} not found in scene`);
    }

    // Get the element's world position
    const position = new THREE.Vector3();
    targetObject.getWorldPosition(position);

    // Update MapControls target
    if (animate && this.mapControls.enableDamping) {
      // Smooth transition via damping
      this.mapControls.target.copy(position);
      this.mapControls.update();
    } else {
      // Instant focus
      this.mapControls.target.copy(position);
      this.mapControls.update();
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

  /**
   * Clean up all WebGL resources
   */
  dispose(): void {
    if (this.disposed) {
      throw new Error('Renderer already disposed');
    }

    if (!this.initialized) {
      throw new Error('Cannot dispose uninitialized renderer');
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

      // Clear tracking maps
      this.componentObject3Ds.clear();
      this.wireObject3Ds.clear();
      this.enodeObject3Ds.clear();

      // Dispose MapControls
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

      // Dispose WireVisualManager (Phase 3 - User Story 3)
      this.wireVisualManager.dispose();

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
      this.initialized = false;
    } catch (error) {
      const err = error as Error;
      this.emit('error', { message: err.message, error: err });
      throw error;
    }
  }

  /**
   * Tool System Methods (Phase 5)
   */

  /**
   * Enable or disable edit mode (FR-006, FR-027)
   * When disabled, deactivates any active tool and resets tool state
   *
   * @param enabled - True to enable edit mode, false to disable
   */
  setEditMode(enabled: boolean): void {
    this._checkInitialized();

    if (this.editMode === enabled) {
      return; // No change
    }

    this.editMode = enabled;

    if (!enabled) {
      // Disable edit mode - deactivate active tool if any
      if (this.activeTool !== null) {
        const previousTool = this.activeTool;
        const tool = this.tools.get(previousTool);

        if (tool) {
          tool.onDeactivate();
        }

        this.activeTool = null;
        this.toolState = null;

        // Emit toolDeactivated event
        this.emit('toolDeactivated', { toolType: previousTool });
      }
    }
  }

  /**
   * Convenience method that toggle a tool on if it is off (possibly deactivating previous tool), or off if it is on
   * @param toolType
   */
  toggleTool(toolType: ToolType): void {
    const previousTool = this.activeTool;

    if (previousTool !== null) {
      this.deactivateTool(toolType);
    }
    if (previousTool === toolType) {
      return;
    }
    this.setActiveTool(toolType);
  }

  deactivateTool(toolType: ToolType): void {
    if (this.activeTool === null) {
      return;
    }
    if (this.activeTool !== toolType) {
      return; // only deactivate if the specified tool is active
    }

    const previousTool = this.activeTool;
    const tool = this.tools.get(previousTool);

    if (tool) {
      tool.onDeactivate();
    }

    this.activeTool = null;
    // Emit toolDeactivated event
    this.emit('toolDeactivated', { toolType: previousTool });
  }

  /**
   * Set the active editing tool (FR-026, FR-028, FR-034)
   * Only one tool can be active at a time
   * Switching tools will deactivate the previous tool
   *
   * @param toolType - Type of tool to activate
   * @throws {Error} If edit mode is not enabled
   */
  setActiveTool(toolType: ToolType): void {
    this._checkInitialized();

    if (!this.editMode) {
      throw new Error('Edit mode must be enabled to activate tools');
    }
    // Check if tool is already active
    if (this.activeTool === toolType) {
      return;
    } else if (this.activeTool !== null) {
      // Deactivate previous tool
      this.deactivateTool(this.activeTool);
    }

    // Activate new tool
    this.activeTool = toolType;
    const tool = this.tools.get(toolType);

    if (tool) {
      tool.onActivate();

      // Emit toolActivated event
      this.emit('toolActivated', { toolType });

      // Emit cursorChangeRequested event
      const cursorType = tool.getCursorType();
      this.emit('cursorChangeRequested', { cursorType });
    }
  }

  /**
   * Get the list of available component types for the AddComponent tool
   */
  getAvailableComponentTypes(): ComponentType[] {
    return this.factoryRegistry.getRegisteredTypes();
  }

  /**
   * Set the component type for the AddComponent tool
   * @param componentType
   */
  setAddComponentType(componentType: ComponentType | null): void {
    if (!this.editMode || this.activeTool !== 'addComponent') {
      throw new Error(
        'Edit mode must be enabled and AddComponent tool must be active to set component type'
      );
    }
    const tool = this.tools.get('addComponent') as AddComponentTool;
    if (!tool) {
      throw new Error('AddComponent tool not found');
    }
    tool.setComponentType(componentType);
  }

  /**
   * Get the currently active tool (FR-028)
   *
   * @returns Current tool type or null if no tool is active
   */
  getActiveTool(): ToolType | null {
    return this.activeTool;
  }

  /**
   * Private helper methods
   */

  private _checkInitialized(): void {
    if (this.disposed) {
      throw new Error('Renderer has been disposed');
    }
    if (!this.initialized) {
      throw new Error('Renderer not initialized. Call initialize() first.');
    }
  }

  /**
   * Initialize editing tools
   * @private
   */
  private _initializeTools(): void {
    // Create tool instances
    this.tools.set('build', new BuildTool(this));
    this.tools.set('addComponent', new AddComponentTool(this));
  }

  /**
   * Perform a full update of all circuit visuals : if no circuit, clear scene
   * @private
   */
  private _fullUpdate(): void {
    // Remove all existing visual objects
    this._removeAllVisuals();

    if (!this.circuit) {
      return;
    }

    // 1. Add circuit sized grid
    this.grid = createGridHelper(this.circuit.metadata.size, this.circuit.metadata.divisions);
    this.scene!.add(this.grid);

    // Create visuals for all circuit elements
    const components = this.circuit.getAllComponents();
    const wires = this.circuit.getAllWires();
    const enodes = this.circuit.getAllENodes();

    for (const component of components) {
      this._createComponentObject3D(component);
    }

    for (const wire of wires) {
      this._createWireObject3D(wire);
    }

    for (const enode of enodes) {
      this._createEnodeObject3D(enode);
    }
  }

  private _incrementalUpdate(changedData: ChangedData): void {
    // Remove deleted objects
    if (changedData.removedComponents) {
      for (const id of changedData.removedComponents) {
        this._removeComponentObject3D(id);
      }
    }

    if (changedData.removedWires) {
      for (const id of changedData.removedWires) {
        this._removeWireObject3D(id);
      }
    }

    if (changedData.removedENodes) {
      for (const id of changedData.removedENodes) {
        this._removeEnodeObject3D(id);
      }
    }

    // Add new objects
    if (changedData.addedComponents) {
      for (const id of changedData.addedComponents) {
        const component = this.circuit.getComponent(id);
        if (component) {
          this._createComponentObject3D(component);
        }
      }
    }

    if (changedData.addedWires) {
      for (const id of changedData.addedWires) {
        const wire = this.circuit.getWire(id);
        if (wire) {
          this._createWireObject3D(wire);
        }
      }
    }

    if (changedData.addedENodes) {
      for (const id of changedData.addedENodes) {
        const enode = this.circuit.getENode(id);
        if (enode) {
          this._createEnodeObject3D(enode);
        }
      }
    }

    // Update modified objects
    if (changedData.modifiedComponents) {
      for (const id of changedData.modifiedComponents) {
        this._removeComponentObject3D(id);
        const component = this.circuit.getComponent(id);
        if (component) {
          this._createComponentObject3D(component);
        }
      }
    }
  }

  private _createComponentObject3D(component: Component): void {
    try {
      const factory = this.factoryRegistry.get(component.type);
      // Support both function-based (legacy) and class-based (new) factories
      const mesh = factory.createVisual(component);

      // Position mesh at component location (2D circuit -> 3D world)
      mesh.position.copy(gridToWorldPosition(component.position));
      mesh.rotation.copy(gridToWorldRotation(component.rotation));

      // Store component metadata
      mesh.userData.componentId = component.id;
      mesh.userData.componentType = component.type;

      this.scene!.add(mesh);
      this._indexComponentObject3D(component.id, mesh);
    } catch (error) {
      const err = error as Error;
      console.warn(`Failed to create mesh for component ${component.id}:`, err.message);
      this.emit('error', { message: `Component rendering failed: ${err.message}`, error: err });
    }
  }

  /**
   * Index component mesh and its pins meshes for interaction (hover, selection)
   * @param componentId
   * @param object3D
   * @private
   */
  private _indexComponentObject3D(componentId: string, object3D: THREE.Object3D): void {
    this.componentObject3Ds.set(componentId, object3D);
    object3D.traverse((obj) => {
      if (obj.userData && obj.userData.type === 'enodeGroup') {
        const enodeId = obj.userData.enodeId;
        if (enodeId) {
          this.enodeObject3Ds.set(enodeId, obj as THREE.Group);
        }
      }
    });
  }

  private _removeComponentObject3D(id: string): void {
    const group = this.componentObject3Ds.get(id);
    if (!group) {
      return;
    }

    this.scene!.remove(group);
    // Parcours complet pour disposer toutes les géométries / matériaux des enfants
    group.traverse((obj) => {
      if (obj.userData && obj.userData.type === 'enodeGroup') {
        this._removeEnodeObject3D(obj.userData.enodeId);
      } else if (obj instanceof THREE.Mesh) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
    this.componentObject3Ds.delete(id);
  }

  /**
   * Create enode (branching point ONLY) visual object and add to scene
   * pin enodes are created and attache to their components by createComponentObject3D()
   *
   * @param enode
   * @private
   */
  private _createEnodeObject3D(enode: ENode): void {
    // Skip pin enodes - they're visualized as part of their components
    if (enode.type === ENodeType.Pin) return;

    // Use BranchingPointVisualFactory to create the visual
    const group = this.branchingPointVisualFactory.createVisual(enode);

    // Use getPosition() to properly handle position retrieval
    group.position.copy(gridToWorldPosition(enode.getPosition(this.circuit!)));

    this.scene!.add(group);
    this.enodeObject3Ds.set(enode.id, group);
  }

  private _removeEnodeObject3D(id: string): void {
    const group = this.enodeObject3Ds.get(id);
    if (!group) return;
    group?.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
    this.scene!.remove(group);
    this.enodeObject3Ds.delete(id);
  }

  addBranchingPoint(worldPosition: THREE.Vector3): ENode {
    const branchingPoint = this.circuitEditionManager.saveAddBranchingPoint(worldPosition);
    // Create and add bp visual to scene
    this._createEnodeObject3D(branchingPoint);
    return branchingPoint;
  }

  /**
   * Split wire either :
   * - at a position, inserting a new branching point and two new wires replacing the deleted ones
   * - at an existing target enode, replacing the wire by two new wires connected to this enode
   * @param wireId
   * @param worldPosition - world Position for the new branching point : no effect if targetEnodeId provided
   * @param targetEnodeId - if provided, the existing enode to split the wire at
   */
  splitWire(
    wireId: UUID,
    worldPosition: THREE.Vector3,
    targetEnodeId: UUID | null = null
  ): { branchingPoint: ENode; wire1: Wire; wire2: Wire } {
    // 1: Call CircuitEditionManager to split the wire and create branching point
    const result = this.circuitEditionManager.saveSplitWire(wireId, worldPosition, targetEnodeId);
    // 2: Remove old wire visual from scene
    this.wireVisualManager.removeWire(wireId);
    // 3: add new Branching point visual to the scene (only if not targetEnodeId)
    if (!targetEnodeId) {
      this._createEnodeObject3D(result.branchingPoint);
    }

    // 4: Add new wire visuals to scene
    this.wireVisualManager.createOrUpdateWire(result.wire1);
    this.wireVisualManager.createOrUpdateWire(result.wire2);

    return result;
  }

  /**
   * Remove branching point enode visual and update the circuit and visuals
   * @param enodeId
   */
  removeBranchingPoint(enodeId: UUID) {
    const result = this.getCircuitEditionManager().saveDeleteBranchingPoint(enodeId);
    if (!result) return;
    this._removeEnodeObject3D(enodeId);
    this.enodeObject3Ds.delete(enodeId);
    if (result.deletedWires) {
      for (const wireId of result.deletedWires) {
        this._removeWireObject3D(wireId);
      }
    }
    if (result.mergedWires) {
      for (const wireId of result.mergedWires) {
        this._removeWireObject3D(wireId);
      }
    }
    if (result.newWire) {
      this._createWireObject3D(result.newWire);
    }
  }

  private _createWireObject3D(wire: Wire): void {
    if (!this.scene || !this.circuit) {
      console.warn(`Cannot create wire ${wire.id}: scene or circuit not initialized`);
      return;
    }
    try {
      // Use WireVisualManager to create wire with pin-accurate endpoints
      this.wireVisualManager.createOrUpdateWire(wire);
    } catch (error) {
      const err = error as Error;
      console.warn(`Failed to create Line2 for wire ${wire.id}:`, err.message);
    }
  }

  /**
   * add a wire between two enodes : update the circuit and add visuals
   * @param sourceEnodeId
   * @param targetEnodeId
   */
  addWire(sourceEnodeId: UUID, targetEnodeId: UUID): Wire {
    const wire = this.circuitEditionManager.saveAddWire(sourceEnodeId, targetEnodeId);
    this.wireVisualManager.createOrUpdateWire(wire);
    return wire;
  }

  /**
   * Add a component to the circuit and scene
   *
   * @param type - Component type to add
   * @param worldPosition - Position in 3D world coordinates (x, z)
   * @param rotation - 3D world rotation
   * @returns The created Component
   */
  addComponent(type: ComponentType, worldPosition: THREE.Vector3, rotation: Euler): Component {
    // Create component in circuit model
    const component = this.circuitEditionManager.saveAddComponent(type, worldPosition, rotation);
    // Create and add visual to scene
    this._createComponentObject3D(component);
    return component;
  }

  /**
   * Remove a component from the circuit and scene
   *
   * @param componentId - UUID of the component to remove
   */
  removeComponent(componentId: UUID): void {
    // Remove from circuit model (also removes connected wires)
    const result = this.circuitEditionManager.saveDeleteComponent(componentId);
    // Remove visuals for wires that were connected to the component
    for (const wireId of result.deletedWires) {
      this._removeWireObject3D(wireId);
    }
    // Remove component visual
    this._removeComponentObject3D(componentId);
  }

  /**
   * Remove wire visual and update the circuit
   * @param wireId
   */
  removeWire(wireId: UUID) {
    this.getCircuitEditionManager().saveDeleteWire(wireId);
    this._removeWireObject3D(wireId);
  }

  private _removeWireObject3D(id: string): void {
    if (this.wireObject3Ds.has(id)) {
      // Use WireVisualManager to remove wire (handles all disposal and delete from map)
      this.wireVisualManager.removeWire(id);
    }
  }

  private _removeAllVisuals(): void {
    // Remove all component meshes
    for (const id of Array.from(this.componentObject3Ds.keys())) {
      this._removeComponentObject3D(id);
    }

    // Remove all wire meshes
    for (const id of Array.from(this.wireObject3Ds.keys())) {
      this._removeWireObject3D(id);
    }

    // Remove all enode meshes
    for (const id of Array.from(this.enodeObject3Ds.keys())) {
      this._removeEnodeObject3D(id);
    }

    // remove grid
    if (this.grid) {
      this.scene!.remove(this.grid);
      this.grid.geometry.dispose();
    }
  }
}
