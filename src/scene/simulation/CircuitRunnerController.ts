/**
 * Simulation Circuit Controller
 * @module scene/simulation/CircuitRunnercontroller
 *
 * Renders live circuit simulation with real-time state updates and animated current flow.
 * Provides smooth interpolation between discrete simulation ticks for fluid animation.
 */

import * as THREE from 'three';
import type { CircuitRunner } from '../../core/simulation/CircuitRunner';
import type { Component } from '../../core/components/Component';
import type { Wire } from '../../core/Wire';
import type { ENode } from '../../core/ENode';
import type { UUID } from '../../core/types/Identifier';
import { ENodeType } from '../../core/types/ENodeType';
import type { IFactoryRegistry } from '../shared/components/ComponentVisualFactory';
import { InterpolationController } from '../shared/InterpolationController';
import { AbstractCircuitController } from '../shared/AbstractCircuitController';
import {
  createGridHelper,
  gridToWorldPosition,
  gridToWorldRotation,
} from '../shared/GeometryUtils';

/**
 * Simulation Circuit Runner Controller Implementation
 *
 * Manages Three.js scene for live circuit simulation visualization.
 * Provides smooth interpolation between simulation ticks for 60fps rendering.
 * Animates current flow through wires and component state changes.
 */
export class CircuitRunnerController extends AbstractCircuitController {
  private _runner: CircuitRunner | null = null;

  // Simulation-specific fields
  private interpolationController: InterpolationController | null = null;
  private lastSimulationTick: number = 0;
  private lastRenderTime: number = 0;

  /**
   * Create a new Simulation Circuit Controller
   *
   * @param factoryRegistry - Component visual factory registry
   * @throws {TypeError} If factoryRegistry is null/undefined
   */
  constructor(factoryRegistry: IFactoryRegistry) {
    super(factoryRegistry);
    if (!factoryRegistry) {
      throw new TypeError('FactoryRegistry is required');
    }

    // TODO instanciate simulation-specific fields here if needed
  }

  /**
   * Specific Initialization logic, performed after AbstractCircuitController initialization
   * @private
   */
  protected onInitialize() {
    // TODO add simulation-specific initialization logic here
  }

  protected emitReady() {
    this.emit('ready', { controllerType: 'simulation' });
  }

  /**
   * specific disposal prepended at the beginning of dispose process
   */
  protected onDispose(): void {
    // TODO implement simulation-specific disposal logic here
  }

  setCircuitRunner(runner: CircuitRunner | null): void {
    this._checkInitialized();
    if (runner === this._runner) return; // TODO : implement hash and equals methods in circuit to perform value equality check
    if (!!this._runner) {
      // TODO : implement everything that needs to be done (stopping runner/animations ....)

      // then proceed on removing the circuit itself (will trigger automatically _removeAllVisuals)
      this._setCircuit(null);
    }

    if (runner) {
      this._setCircuit(runner.circuit);
      this._runner = runner;
    }
  }

  /**
   * specific logic when to render a new set circuit
   * @protected
   */
  protected onSetCircuit() {
    this._fullUpdate();
  }

  /**
   * recreate all visuals based on circuit data
   * Should be called on an already cleared scene
   * @private
   */
  private _fullUpdate(): void {
    this._checkInitialized();

    if (!this._circuit) return;

    // 1. Add circuit sized grid
    this._grid = createGridHelper(this._circuit.metadata.size, this._circuit.metadata.divisions);
    this._scene!.add(this._grid);

    // Create visuals for all circuit elements
    const components = this._circuit.getAllComponents();
    const wires = this._circuit.getAllWires();
    const enodes = this._circuit.getAllENodes();

    for (const component of components) {
      this._createComponentObject3D(component);
    }
    for (const enode of enodes) {
      this._createEnodeObject3D(enode);
      // For edited pin enodes, update source type visual (component creates them only in their default mode)
      if (enode.type === ENodeType.Pin && enode.source) {
        const pinGroup = this.enodeObject3Ds.get(enode.id);
        if (!pinGroup) continue;
        this.factoryRegistry.getFallbackFactory().updatePinSourceType(pinGroup, enode.source);
      }
    }
    for (const wire of wires) {
      this._createWireObject3D(wire);
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

      this._scene!.add(mesh);
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
    group.position.copy(gridToWorldPosition(enode.getPosition(this._circuit!)));

    this._scene!.add(group);
    this.enodeObject3Ds.set(enode.id, group);
  }

  private _createWireObject3D(wire: Wire): void {
    if (!this._scene || !this._circuit) {
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

  private _removeComponentObject3D(id: string): void {
    const group = this.componentObject3Ds.get(id);
    if (!group) {
      return;
    }

    // TODO : see if there are specific disposals to do (animations ?)

    this._scene!.remove(group);
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

  private _removeEnodeObject3D(id: string): void {
    const group = this.enodeObject3Ds.get(id);
    if (!group) return;

    // TODO : see if there are specific disposals to do (animations ?)

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
    this._scene!.remove(group);
    this.enodeObject3Ds.delete(id);
  }

  private _removeWireObject3D(id: string): void {
    if (this.wireObject3Ds.has(id)) {
      // TODO : see if there are specific disposals to do (animations ?)
      // Use WireVisualManager to remove wire (handles all disposal and delete from map)
      this.wireVisualManager.removeWire(id);
    }
  }

  protected _removeAllVisuals(): void {
    // TODO : see if there are specific disposals to do (animations ?)
    // Remove all wire meshes
    for (const id of Array.from(this.wireObject3Ds.keys())) {
      this._removeWireObject3D(id);
    }
    // Remove all enode meshes
    for (const id of Array.from(this.enodeObject3Ds.keys())) {
      this._removeEnodeObject3D(id);
    }
    // Remove all component meshes
    for (const id of Array.from(this.componentObject3Ds.keys())) {
      this._removeComponentObject3D(id);
    }
    // remove grid
    if (this._grid) {
      this._scene!.remove(this._grid);
      this._grid.geometry.dispose();
    }
  }
}
