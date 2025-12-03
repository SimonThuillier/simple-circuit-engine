/**
 * Static Circuit Renderer
 * @module rendering/static/StaticCircuitRenderer
 *
 * Renders static circuit topology in 3D space with support for editing tools.
 */

import * as THREE from 'three';
import type { Circuit } from '../../core/Circuit';
import type { Component } from '../../core/components/Component';
import type { Wire } from '../../core/Wire';
import type { ENode } from '../../core/ENode';
import { ENodeType } from '../../core/types/ENodeType';
import { EventEmitter } from '../shared/EventEmitter';
import type { IFactoryRegistry } from '../shared/ComponentVisualFactory';
import type {
  RenderEvent,
  RenderEventMap,
  RenderCallback,
  ChangedData,
  RendererOptions,
  ToolType,
} from '../shared/types';
import {
  createPerspectiveCamera,
  setupCameraFromMetadata,
} from '../shared/CameraUtils';
import { setupSceneLights } from '../shared/LightingUtils';
import { createGridHelper } from '../shared/GeometryUtils';
import { createWireGeometry } from '../shared/GeometryUtils';
import { createLineMaterial } from '../shared/MaterialUtils';
import { createEnodeGeometry } from '../shared/GeometryUtils';
import { createStandardMaterial } from '../shared/MaterialUtils';

/**
 * Static Circuit Renderer Implementation
 *
 * Visualizes circuit topology in 3D using Three.js. Supports view manipulation
 * and editing via integrated tool system.
 */
export class StaticCircuitRenderer extends EventEmitter<RenderEventMap> {
  public readonly circuit: Circuit;
  public readonly factoryRegistry: IFactoryRegistry;

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private container: HTMLElement | null = null;
  private initialized: boolean = false;
  private disposed: boolean = false;

  // Visual object tracking
  private componentMeshes: Map<string, THREE.Object3D> = new Map();
  private wireMeshes: Map<string, THREE.Line> = new Map();
  private enodeMeshes: Map<string, THREE.Mesh> = new Map();

  // Edit mode and tool system (Phase 5)
  private editMode: boolean = false;
  private activeTool: ToolType | null = null;
  private tools: Map<ToolType, any> = new Map(); // Will be populated in Phase 5
  private toolState: any = null;
  private previewObjects: THREE.Object3D[] = [];

  /**
   * Create a new Static Circuit Renderer
   *
   * @param circuit - Circuit topology to visualize
   * @param factoryRegistry - Component visual factory registry
   * @throws {TypeError} If circuit or factoryRegistry is null/undefined
   */
  constructor(circuit: Circuit, factoryRegistry: IFactoryRegistry) {
    super();

    if (!circuit) {
      throw new TypeError('Circuit is required');
    }
    if (!factoryRegistry) {
      throw new TypeError('FactoryRegistry is required');
    }

    this.circuit = circuit;
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
      this.scene.background = new THREE.Color(0x1a1a1a);

      // Create camera
      const aspect = container.clientWidth / container.clientHeight || 1;
      this.camera = createPerspectiveCamera(options, aspect);

      // Attach camera to scene for consumer access
      (this.scene as any).camera = this.camera;

      // Add lights
      setupSceneLights(this.scene);

      // Add grid
      const grid = createGridHelper();
      this.scene.add(grid);

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
   * Render one frame (called by external animation loop)
   */
  render(): void {
    this._checkInitialized();

    try {
      // In StaticCircuitRenderer, render() is mostly a no-op
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
   * @returns Scene with camera accessible via scene.camera
   */
  getScene(): THREE.Scene {
    this._checkInitialized();
    return this.scene!;
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
   * Tool System Methods (Phase 5 - Stubs for now)
   */

  setEditMode(enabled: boolean): void {
    this._checkInitialized();
    this.editMode = enabled;
    // Full implementation in Phase 5
  }

  setActiveTool(toolType: ToolType): void {
    this._checkInitialized();
    if (!this.editMode) {
      throw new Error('Edit mode must be enabled to activate tools');
    }
    this.activeTool = toolType;
    // Full implementation in Phase 5
  }

  getActiveTool(): ToolType | null {
    return this.activeTool;
  }

  cancelCurrentToolOperation(): void {
    if (!this.activeTool) {
      throw new Error('No active tool');
    }
    // Full implementation in Phase 5
  }

  handleToolClick(worldPosition: THREE.Vector3): void {
    if (!this.editMode) {
      throw new Error('Edit mode must be enabled');
    }
    if (!this.activeTool) {
      throw new Error('No active tool');
    }
    // Full implementation in Phase 5
  }

  handleToolHover(worldPosition: THREE.Vector3): void {
    // Silently ignored if no tool active
    // Full implementation in Phase 5
  }

  handleToolScroll(delta: number): void {
    // Silently ignored if no tool active
    // Full implementation in Phase 5
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

  private _fullUpdate(): void {
    // Remove all existing visual objects
    this._removeAllVisuals();

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
      mesh.position.set(component.position.x, 0, component.position.y);

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
      mesh.position.set(pos.x, 0, pos.y);

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
  }
}
