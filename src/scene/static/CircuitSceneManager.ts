/**
 * Static Circuit Renderer
 * @module rendering/static/StaticCircuitRenderer
 *
 * Renders static circuit topology in 3D space with support for editing tools.
 */

import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import type { Circuit } from '../../core/Circuit';
import type { Component } from '../../core/components/Component';
import type { Wire } from '../../core/Wire';
import type { ENode } from '../../core/ENode';
import type { UUID } from '../../core/types/Identifier';
import { ENodeType } from '../../core/types/ENodeType';
import { EventEmitter } from '../shared/EventEmitter';
import type { IFactoryRegistry } from '../shared/ComponentVisualFactory';
import type {
  RenderEvent,
  RenderEventMap,
  RenderCallback,
  ChangedData,
  RendererOptions,
  MapControlsOptions,
  ToolType,
  HitboxUserData,
} from '../shared/types';
import { createPerspectiveCamera, setupCameraFromMetadata } from '../shared/CameraUtils';
import { setupSceneLights } from '../shared/LightingUtils';
import { createGridHelper } from '../shared/GeometryUtils';
import { createWireGeometry } from '../shared/GeometryUtils';
import { createLineMaterial } from '../shared/MaterialUtils';
import { createEnodeGeometry } from '../shared/GeometryUtils';
import { createStandardMaterial } from '../shared/MaterialUtils';
import { SelectTool } from './tools/SelectTool';
import { PlaceComponentTool } from './tools/PlaceComponentTool';
import { WireTool } from './tools/WireTool';
import { BranchingPointTool } from './tools/BranchingPointTool';
import { DeleteTool } from './tools/DeleteTool';
import type { IEditingTool } from '../shared/types';
import { HoverManager } from '../shared/HoverManager';

/**
 * Static Circuit Scene Manager Implementation
 *
 * Manager providing a bidirectional interface between a Circuit and a Three.js scene/camera ready to be rendered.
 * Supports view manipulation and editing via integrated tool system.
 * Provides event hooks for error handling and state changes.
 */
export class CircuitSceneManager extends EventEmitter<RenderEventMap> {
  public readonly factoryRegistry: IFactoryRegistry;

  private circuit?: Circuit | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private container: HTMLElement | null = null;
  private initialized: boolean = false;
  private disposed: boolean = false;

  // Visual object tracking
  private grid: THREE.GridHelper | null = null;
  private componentMeshes: Map<string, THREE.Object3D> = new Map();
  private wireMeshes: Map<string, THREE.Line> = new Map();
  private enodeMeshes: Map<string, THREE.Mesh> = new Map();

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
  }

  /**
   * Initialize the renderer with a DOM container
   *
   * @param container - HTMLElement to attach scene to
   * @param options - Optional renderer configuration
   */
  initialize(container: HTMLElement, options?: RendererOptions): void {
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
      id: UUID;
      objectType: any;
      userData?: HitboxUserData | undefined;
    } | null = null;

    // Register callback to emit hover/unhover events
    this.hoverManager.onHoverChange((element) => {
      // Emit unhover for previous element if it exists
      if (previousElement && (!element || element.id !== previousElement.id)) {
        this.emit('unhover', {
          objectId: previousElement.id,
          objectType: previousElement.objectType,
          userData: previousElement.userData,
        });
        // TODO : just for a quick test, refactor later
        if (previousElement.objectType == 'enodeHitbox') {
          previousElement.userData?.hoverCallback?.(false);
        }
      }

      // Emit hover for new element
      if (element) {
        this.emit('hover', {
          objectId: element.id,
          objectType: element.objectType,
          userData: element.object3D.userData as HitboxUserData,
        });
        // TODO : just for a quick test, refactor later
        previousElement = {
          id: element.id,
          objectType: element.objectType,
          userData: element.object3D.userData as HitboxUserData,
        };
        if (previousElement.objectType == 'enodeHitbox') {
          previousElement.userData?.hoverCallback?.(true);
        }
      } else {
        // TODO : just for a quick test, refactor later
        if (!!previousElement && previousElement.objectType == 'enodeHitbox') {
          previousElement.userData?.hoverCallback?.(false);
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
   * Get the MapControls instance for direct manipulation
   *
   * @returns MapControls instance or null if not initialized
   */
  getControls(): MapControls | null {
    return this.mapControls;
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
    if (this.componentMeshes.has(elementId)) {
      targetObject = this.componentMeshes.get(elementId)!;
    }
    // Check wires
    else if (this.wireMeshes.has(elementId)) {
      targetObject = this.wireMeshes.get(elementId)!;
    }
    // Check enodes
    else if (this.enodeMeshes.has(elementId)) {
      targetObject = this.enodeMeshes.get(elementId)!;
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
      this.componentMeshes.clear();
      this.wireMeshes.clear();
      this.enodeMeshes.clear();

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
    }

    // Deactivate previous tool if any
    if (this.activeTool !== null) {
      const previousTool = this.activeTool;
      const tool = this.tools.get(previousTool);

      if (tool) {
        tool.onDeactivate();
      }

      this._clearPreviewObjects();

      // Emit toolDeactivated event
      this.emit('toolDeactivated', { toolType: previousTool });
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
    // Create tool instances (circuit will be null initially, updated when setCircuit is called)
    const circuit = this.circuit ?? null;
    this.tools.set('select', new SelectTool(circuit, this));
    this.tools.set('placeComponent', new PlaceComponentTool(circuit, this));
    this.tools.set('wire', new WireTool(circuit, this));
    this.tools.set('branchingPoint', new BranchingPointTool(circuit, this));
    this.tools.set('delete', new DeleteTool(circuit, this));
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
      this._createComponentMesh(component);
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
        this._removeComponentMesh(id);
      }
    }

    if (changedData.removedWires) {
      for (const id of changedData.removedWires) {
        this._removeWireMesh(id);
      }
    }

    if (changedData.removedENodes) {
      for (const id of changedData.removedENodes) {
        this._removeEnodeMesh(id);
      }
    }

    // Add new objects
    if (changedData.addedComponents) {
      for (const id of changedData.addedComponents) {
        const component = this.circuit.getComponent(id);
        if (component) {
          this._createComponentMesh(component);
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
        this._removeComponentMesh(id);
        const component = this.circuit.getComponent(id);
        if (component) {
          this._createComponentMesh(component);
        }
      }
    }
  }

  private _createComponentMesh(component: Component): void {
    try {
      const factory = this.factoryRegistry.get(component.type);
      const mesh = factory(component);

      // Position mesh at component location (2D circuit -> 3D world)
      mesh.position.set(component.position.x, 0, -component.position.y);

      // Store component metadata
      mesh.userData.componentId = component.id;
      mesh.userData.componentType = component.type;

      this.scene!.add(mesh);
      this.componentMeshes.set(component.id, mesh);
    } catch (error) {
      const err = error as Error;
      console.warn(`Failed to create mesh for component ${component.id}:`, err.message);
      this.emit('error', { message: `Component rendering failed: ${err.message}`, error: err });
    }
  }

  private _createWireMesh(wire: Wire): void {
    try {
      const fromENode = this.circuit.getENode(wire.node1);
      const toENode = this.circuit.getENode(wire.node2);

      if (!fromENode || !toENode) {
        console.warn(`Wire ${wire.id} missing endpoint enodes`);
        return;
      }

      // Use getPosition() to handle both pin and branching point enodes
      const fromPos = fromENode.getPosition(this.circuit);
      const toPos = toENode.getPosition(this.circuit);

      const geometry = createWireGeometry(fromPos, toPos);
      const material = createLineMaterial(0xffffff, 2);

      const line = new THREE.Line(geometry, material);
      line.userData.wireId = wire.id;

      this.scene!.add(line);
      this.wireMeshes.set(wire.id, line);
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
      this.enodeMeshes.set(enode.id, mesh);
    } catch (error) {
      const err = error as Error;
      console.warn(`Failed to create mesh for enode ${enode.id}:`, err.message);
    }
  }

  private _removeComponentMesh(id: string): void {
    const mesh = this.componentMeshes.get(id);
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
      this.componentMeshes.delete(id);
    }
  }

  private _removeWireMesh(id: string): void {
    const line = this.wireMeshes.get(id);
    if (line) {
      this.scene!.remove(line);
      line.geometry.dispose();
      if (Array.isArray(line.material)) {
        line.material.forEach((mat) => mat.dispose());
      } else {
        line.material.dispose();
      }
      this.wireMeshes.delete(id);
    }
  }

  private _removeEnodeMesh(id: string): void {
    const mesh = this.enodeMeshes.get(id);
    if (mesh) {
      this.scene!.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      } else {
        mesh.material.dispose();
      }
      this.enodeMeshes.delete(id);
    }
  }

  private _removeAllVisuals(): void {
    // Remove all component meshes
    for (const id of Array.from(this.componentMeshes.keys())) {
      this._removeComponentMesh(id);
    }

    // Remove all wire meshes
    for (const id of Array.from(this.wireMeshes.keys())) {
      this._removeWireMesh(id);
    }

    // Remove all enode meshes
    for (const id of Array.from(this.enodeMeshes.keys())) {
      this._removeEnodeMesh(id);
    }

    // remove grid
    if (this.grid) {
      this.scene!.remove(this.grid);
      this.grid.geometry.dispose();
    }
  }
}
