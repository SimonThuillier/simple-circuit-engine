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
import type { Component } from '../../core/components/Component';
import type { Wire } from '../../core/Wire';
import type { ENode } from '../../core/ENode';
import type { UUID } from '../../core/types/Identifier';
import { ENodeType } from '../../core/types/ENodeType';
import { EventEmitter } from '../shared/EventEmitter';
import type { IFactoryRegistry } from '../shared/components/ComponentVisualFactory';
import type {
  SceneManagerEvent,
  SceneManagerEventMap,
  SceneManagerCallback,
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
} from '../shared/types';
import { createPerspectiveCamera, setupCameraFromMetadata } from '../shared/CameraUtils';
import { setupSceneLights } from '../shared/LightingUtils';
import { createGridHelper } from '../shared/GeometryUtils';
import { createEnodeGeometry } from '../shared/GeometryUtils';
import { createStandardMaterial } from '../shared/MaterialUtils';
import { PositionTool } from './tools/PositionTool';
import { AddComponentTool } from './tools/AddComponentTool';
import { WireTool } from './tools/WireTool';
import { BranchingPointTool } from './tools/BranchingPointTool';
import { DeleteTool } from './tools/DeleteTool';
import type { IEditingTool } from '../shared/types';
import { HoverManager } from '../shared/HoverManager';
import { applyENodeHover, removeENodeHover } from '../shared/ENodesUtils';
import { SelectionManager } from '../shared/SelectionManager';
import { WireVisualManager } from '../shared/WireVisualManager';
import type { ComponentType } from '@/core/types/ComponentType';
import { CircuitEditionManager } from './CircuitEditionManager';

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
  private componentGroups: Map<string, THREE.Group> = new Map();
  private wireGroups: Map<string, Line2> = new Map();
  private enodeGroups: Map<string, THREE.Group> = new Map();

  // Edit mode and tool system (Phase 5)
  private editMode: boolean = false;
  private activeTool: ToolType | null = null;
  private tools: Map<ToolType, IEditingTool> = new Map();
  private toolState: any = null;
  private previewObjects: THREE.Object3D[] = [];

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
  private wireVisualManager: WireVisualManager = new WireVisualManager();

  // CircuitEditionManager handles saving edits to the core model
  private circuitEditionManager: CircuitEditionManager = new CircuitEditionManager(this);

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

      console.log(container.clientWidth, container.clientHeight);
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
      this.emit('ready', {});
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
        const enodeGroup = this.enodeGroups.get(enodeId);
        if (!enodeGroup) {
          console.warn('Failed to apply unhover effect (enodeGroup not found)');
          return;
        }
        try {
          removeENodeHover(enodeGroup);
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
        const componentGroup = this.componentGroups.get(componentId);
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
        const enodeGroup = this.enodeGroups.get(enodeId);
        if (!enodeGroup) {
          console.warn('Failed to apply hover effect (enodeGroup not found)');
          return;
        }
        try {
          applyENodeHover(enodeGroup);
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
        const componentGroup = this.componentGroups.get(componentId);
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
        // this important event will be used by tools such as PositionTool to update preview positions
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

    console.log('pointer down handler called', this.hoverManager?.getHoveredElement());
    if (this.hoverManager?.getHoveredElement()) {
      // always: emit position event when hovered element
      const element = this.hoverManager.getHoveredElement()!;
      const alreadySelected = this.selectionManager!.isSelected(element.type, element.id);
      if (!alreadySelected) {
        this.selectionManager?.selectOne(element.type, element.id);
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
        console.log(`Applying selection visual to component ${id}, selected=${selected}`);
        const group = this.componentGroups.get(id);
        console.log(group);
        if (!group) {
          continue;
        }
        try {
          const componentType = group.userData.componentType as ComponentType;
          const factory = this.factoryRegistry.get(componentType);
          if (selected) {
            console.log('apply selection visual');
            factory.applySelection(group);
          } else {
            console.log('remove selection visual');
            factory.removeSelection(group);
          }
        } catch (error) {
          console.warn(
            `Failed to ${selected ? 'apply' : 'remove'} component selection visual:`,
            error
          );
        }
      }
      // TODO Wires and enodes selection visual handling can be added here in the future
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
   * Update viewport size for Line2 material resolution
   *
   * Should be called when the container size changes (e.g., window resize)
   * to ensure Line2 wires render correctly.
   *
   * @param width - New viewport width in pixels
   * @param height - New viewport height in pixels
   */
  updateViewportSize(width: number, height: number): void {
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
   * Get the CircuitEditionManager instance for calls by tools
   */
  getCircuitEditionManager(): CircuitEditionManager {
    this._checkInitialized();
    return this.circuitEditionManager;
  }

  /**
   * Get the MapControls instance for direct manipulation
   *
   * @returns MapControls instance or null if not initialized
   */
  getControls(): MapControls | null {
    return this.mapControls;
  }

  getSelection(id: string): THREE.Group | undefined {
    return this.componentGroups.get(id);
  }

  /**
   * get the group mesh of a component, enode or wire by hoverable type and id
   * @param type
   * @param id
   */
  getGroup(type: HoverableType, id: UUID): THREE.Object3D | undefined {
    switch (type) {
      case 'component':
        return this.componentGroups.get(id);
      case 'enode':
        return this.enodeGroups.get(id);
      case 'wire':
        return this.wireGroups.get(id);
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
      const object = this.getGroup(selection.type, selection.id);
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
          const object = this.getGroup('component', id);
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
    if (this.componentGroups.has(elementId)) {
      targetObject = this.componentGroups.get(elementId)!;
    }
    // Check wires
    else if (this.wireGroups.has(elementId)) {
      targetObject = this.wireGroups.get(elementId)!;
    }
    // Check enodes
    else if (this.enodeGroups.has(elementId)) {
      targetObject = this.enodeGroups.get(elementId)!;
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
      this.componentGroups.clear();
      this.wireGroups.clear();
      this.enodeGroups.clear();

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
        this._clearPreviewObjects();

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

    this._clearPreviewObjects();
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
   * Get the currently active tool (FR-028)
   *
   * @returns Current tool type or null if no tool is active
   */
  getActiveTool(): ToolType | null {
    return this.activeTool;
  }

  /**
   * Cancel the current tool operation (FR-031)
   * Used for multi-step operations like wire creation
   *
   * @throws {Error} If no tool is active
   */
  cancelCurrentToolOperation(): void {
    if (!this.activeTool) {
      throw new Error('No active tool');
    }

    const tool = this.tools.get(this.activeTool);
    if (tool && typeof tool.cancelOperation === 'function') {
      tool.cancelOperation();
      this.emit('toolOperationCancelled', { toolType: this.activeTool });
    }
  }

  /**
   * Handle tool click interaction (FR-029)
   *
   * @param worldPosition - 3D world position of click
   * @throws {Error} If edit mode is not enabled or no tool is active
   */
  handleToolClick(worldPosition: THREE.Vector3): void {
    if (!this.editMode) {
      throw new Error('Edit mode must be enabled');
    }
    if (!this.activeTool) {
      throw new Error('No active tool');
    }

    const tool = this.tools.get(this.activeTool);
    if (tool && typeof tool.handleClick === 'function') {
      tool.handleClick(worldPosition);
    }
  }

  /**
   * Handle tool hover interaction
   * Updates tool preview and cursor
   *
   * @param worldPosition - 3D world position of hover
   */
  handleToolHover(worldPosition: THREE.Vector3): void {
    if (!this.editMode || !this.activeTool) {
      return; // Silently ignore if no tool active
    }

    const tool = this.tools.get(this.activeTool);
    if (tool && typeof tool.handleHover === 'function') {
      tool.handleHover(worldPosition);

      // Update preview objects
      this._updatePreviewObjects();

      // Update cursor
      const cursorType = tool.getCursorType();
      this.emit('cursorChangeRequested', { cursorType });
    }
  }

  /**
   * Handle tool scroll interaction
   * Used for rotating components before placement
   *
   * @param delta - Scroll delta (positive = scroll up, negative = scroll down)
   */
  handleToolScroll(delta: number): void {
    if (!this.editMode || !this.activeTool) {
      return; // Silently ignore if no tool active
    }

    const tool = this.tools.get(this.activeTool);
    if (tool && typeof tool.handleScroll === 'function') {
      tool.handleScroll(delta);

      // Update preview objects
      this._updatePreviewObjects();
    }
  }

  /**
   * Clear all preview objects from the scene
   * @private
   */
  private _clearPreviewObjects(): void {
    for (const obj of this.previewObjects) {
      this.scene!.remove(obj);

      // Dispose geometry and material
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
    }

    this.previewObjects = [];
  }

  /**
   * Update preview objects from active tool
   * @private
   */
  private _updatePreviewObjects(): void {
    if (!this.activeTool) {
      return;
    }

    const tool = this.tools.get(this.activeTool);
    if (!tool) {
      return;
    }

    // Clear existing preview objects
    this._clearPreviewObjects();

    // Get new preview objects from tool
    const newPreviewObjects = tool.getPreviewObjects();
    for (const obj of newPreviewObjects) {
      this.scene!.add(obj);
      this.previewObjects.push(obj);
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Initialize editing tools
   * @private
   */
  private _initializeTools(): void {
    // Create tool instances
    this.tools.set('position', new PositionTool(this));
    this.tools.set('addComponent', new AddComponentTool(this));
    this.tools.set('wire', new WireTool(this));
    this.tools.set('branchingPoint', new BranchingPointTool(this));
    this.tools.set('delete', new DeleteTool(this));
  }

  private _checkInitialized(): void {
    if (this.disposed) {
      throw new Error('Renderer has been disposed');
    }
    if (!this.initialized) {
      throw new Error('Renderer not initialized. Call initialize() first.');
    }
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
      this._createComponentGroup(component);
    }

    for (const wire of wires) {
      this._createWireMesh(wire);
    }

    for (const enode of enodes) {
      this._createEnodeMesh(enode);
    }
  }

  private _incrementalUpdate(changedData: ChangedData): void {
    // Remove deleted objects
    if (changedData.removedComponents) {
      for (const id of changedData.removedComponents) {
        this._removeComponentGroup(id);
      }
    }

    if (changedData.removedWires) {
      for (const id of changedData.removedWires) {
        this._removeWireGroup(id);
      }
    }

    if (changedData.removedENodes) {
      for (const id of changedData.removedENodes) {
        this._removeEnodeGroup(id);
      }
    }

    // Add new objects
    if (changedData.addedComponents) {
      for (const id of changedData.addedComponents) {
        const component = this.circuit.getComponent(id);
        if (component) {
          this._createComponentGroup(component);
        }
      }
    }

    if (changedData.addedWires) {
      for (const id of changedData.addedWires) {
        const wire = this.circuit.getWire(id);
        if (wire) {
          this._createWireMesh(wire);
        }
      }
    }

    if (changedData.addedENodes) {
      for (const id of changedData.addedENodes) {
        const enode = this.circuit.getENode(id);
        if (enode) {
          this._createEnodeMesh(enode);
        }
      }
    }

    // Update modified objects
    if (changedData.modifiedComponents) {
      for (const id of changedData.modifiedComponents) {
        this._removeComponentGroup(id);
        const component = this.circuit.getComponent(id);
        if (component) {
          this._createComponentGroup(component);
        }
      }
    }
  }

  private _createComponentGroup(component: Component): void {
    try {
      const factory = this.factoryRegistry.get(component.type);
      // Support both function-based (legacy) and class-based (new) factories
      const mesh =
        typeof factory === 'function' ? factory(component) : factory.createVisual(component);

      // Position mesh at component location (2D circuit -> 3D world)
      mesh.position.set(component.position.x, 0, -component.position.y);

      // Store component metadata
      mesh.userData.componentId = component.id;
      mesh.userData.componentType = component.type;

      this.scene!.add(mesh);
      this._indexComponentGroup(component.id, mesh);
    } catch (error) {
      const err = error as Error;
      console.warn(`Failed to create mesh for component ${component.id}:`, err.message);
      this.emit('error', { message: `Component rendering failed: ${err.message}`, error: err });
    }
  }

  /**
   * Index component mesh and its pins meshes for interaction (hover, selection)
   * @param componentId
   * @param group
   * @private
   */
  private _indexComponentGroup(componentId: string, group: THREE.Group): void {
    this.componentGroups.set(componentId, group);
    group.traverse((obj) => {
      if (obj.userData && obj.userData.type === 'enodeGroup') {
        const enodeId = obj.userData.enodeId;
        if (enodeId) {
          this.enodeGroups.set(enodeId, obj as THREE.Group);
        }
      }
    });
  }

  private _unindexComponentGroup(componentId: string, group: THREE.Group): void {
    this.componentGroups.delete(componentId);
    group.traverse((obj) => {
      if (obj.userData && obj.userData.type === 'enodeGroup') {
        const enodeId = obj.userData.enodeId;
        if (enodeId) {
          this.enodeGroups.delete(enodeId);
        }
      }
    });
  }

  private _createWireMesh(wire: Wire): void {
    try {
      if (!this.scene || !this.circuit) {
        console.warn(`Cannot create wire ${wire.id}: scene or circuit not initialized`);
        return;
      }

      // Use WireVisualManager to create wire with pin-accurate endpoints
      const line = this.wireVisualManager.createOrUpdateWire(
        wire,
        this.circuit,
        this.scene,
        this.componentGroups
      );

      // Track in wireGroups for backward compatibility
      this.wireGroups.set(wire.id, line);
    } catch (error) {
      const err = error as Error;
      console.warn(`Failed to create mesh for wire ${wire.id}:`, err.message);
    }
  }

  private _createEnodeMesh(enode: ENode): void {
    try {
      // Only visualize branching point enodes, not component pin enodes
      // Pin enodes are connection points on components and don't need separate visualization
      if (enode.type === ENodeType.Pin) {
        // Skip pin enodes - they're visualized as part of their components
        return;
      }

      const geometry = createEnodeGeometry(0.15);
      const material = createStandardMaterial(0x00aaff, {
        metalness: 0.5,
        roughness: 0.3,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Use getPosition() to properly handle position retrieval
      const pos = enode.getPosition(this.circuit);
      mesh.position.set(pos.x, 0, -pos.y);

      mesh.userData.enodeId = enode.id;
      mesh.userData.enodeType = enode.type;

      this.scene!.add(mesh);
      this.enodeGroups.set(enode.id, mesh);
    } catch (error) {
      const err = error as Error;
      console.warn(`Failed to create mesh for enode ${enode.id}:`, err.message);
    }
  }

  private _removeEnodeGroup(id: string): void {
    const group = this.enodeGroups.get(id);
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
    this.enodeGroups.delete(id);
  }

  private _removeComponentGroup(id: string): void {
    const group = this.componentGroups.get(id);
    if (group) {
      this.scene!.remove(group);
      // Parcours complet pour disposer toutes les géométries / matériaux des enfants
      group.traverse((obj) => {
        if (obj.userData && obj.userData.type === 'enode') {
          this._removeEnodeGroup(obj.userData.enodeId);
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
        } else if (obj instanceof THREE.Line) {
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
      this._unindexComponentGroup(id, group as THREE.Group);
    }
  }

  private _removeWireGroup(id: string): void {
    if (this.wireGroups.has(id)) {
      // Use WireVisualManager to remove wire (handles disposal)
      this.wireVisualManager.removeWire(id);
      this.wireGroups.delete(id);
    }
  }

  private _removeAllVisuals(): void {
    // Remove all component meshes
    for (const id of Array.from(this.componentGroups.keys())) {
      this._removeComponentGroup(id);
    }

    // Remove all wire meshes
    for (const id of Array.from(this.wireGroups.keys())) {
      this._removeWireGroup(id);
    }

    // Remove all enode meshes
    for (const id of Array.from(this.enodeGroups.keys())) {
      this._removeEnodeGroup(id);
    }

    // remove grid
    if (this.grid) {
      this.scene!.remove(this.grid);
      this.grid.geometry.dispose();
    }
  }
}
