/**
 * Simulation Circuit Controller
 * @module scene/simulation/CircuitRunnercontroller
 *
 * Renders live circuit simulation with real-time state updates and animated current flow.
 * Provides smooth interpolation between discrete simulation ticks for fluid animation.
 */

import * as THREE from 'three';
import type { CircuitRunner } from '../../core/simulation/CircuitRunner';
import type { Component } from '../../core/Component';
import type { Wire } from '../../core/Wire';
import type { ENode } from '../../core/ENode';
import { ENodeType } from '../../core/types/ENodeType';
import { ComponentType } from '../../core/types/ComponentType';
import type { IFactoryRegistry } from '../shared/components/ComponentVisualFactory';
import type { UserCommand } from '../../core/simulation/types/UserCommand';
import { AbstractCircuitController } from '../shared/AbstractCircuitController';
import {
  createGridHelper,
  gridToWorldPosition,
  gridToWorldRotation,
} from '../shared/GeometryUtils';
import type { HoveredElement } from '../shared/types';

/**
 * Simulation Circuit Runner Controller Implementation
 *
 * Manages Three.js scene for live circuit simulation visualization.
 * Provides smooth interpolation between simulation ticks for 60fps rendering.
 * Animates current flow through wires and component state changes.
 */
export class CircuitRunnerController extends AbstractCircuitController {
  private _runner: CircuitRunner | null = null;

  // Playback control state
  private _isPlaying: boolean = false;
  private _tickIntervalMs: number = 500;
  private _simulationLoopId: number | null = null;
  private _clickHandler: ((event: MouseEvent) => void) | null = null;

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
   * Check if simulation is currently playing (auto-advancing ticks)
   * Returns false if paused or no circuit loaded
   */
  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * Get current tick interval in milliseconds
   * Default is 500ms (2 ticks per second)
   */
  get tickInterval(): number {
    return this._tickIntervalMs;
  }

  /**
   * Set tick interval in milliseconds (50-2000ms)
   * If simulation is playing, restarts the interval with new value
   *
   * @param value - Interval in milliseconds, must be between 50-2000ms
   * @throws {RangeError} If value is outside valid range
   */
  set tickInterval(value: number) {
    if (value < 50 || value > 2000) {
      throw new RangeError('Tick interval must be between 50 and 2000ms');
    }
    this._tickIntervalMs = value;

    // If playing, restart interval with new value
    if (this._isPlaying) {
      this.pause();
      this.play();
    }
  }

  /**
   * Get current simulation tick number
   * Returns 0 if no circuit runner is loaded
   */
  get currentTick(): number {
    return this._runner?.getCurrentTick() ?? 0;
  }

  /**
   * Specific Initialization logic, performed after AbstractCircuitController initialization
   * @private
   */
  protected onInitialize() {
    // Register click handler for component interaction
    //this._pointerDownHandler = this._handlePointerDown.bind(this);
    //this._container!.addEventListener('pointerdown', this._pointerDownHandler);

    this._clickHandler = this._handleClick.bind(this);
    this._container!.addEventListener('click', this._clickHandler);
  }

  protected emitReady() {
    this.emit('ready', { controllerType: 'simulation' });
  }

  /**
   * specific disposal prepended at the beginning of dispose process
   */
  protected onDispose(): void {
    // Stop simulation loop if running
    if (this._isPlaying) {
      this.pause();
    }

    // Remove click event listener if registered
    if (this._clickHandler && this._container) {
      this._container.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    // if (this._pointerDownHandler && this._container) {
    //   this._container.removeEventListener('pointerdown', this._pointerDownHandler);
    //   this._pointerDownHandler = null;
    // }

    // Clear runner reference
    this._runner = null;
  }

  /**
   * Load a circuit runner for simulation and visualization
   * Replaces any existing circuit and stops ongoing simulation
   *
   * @param runner - CircuitRunner instance to visualize, or null to clear
   */
  setCircuitRunner(runner: CircuitRunner | null): void {
    this._checkInitialized();
    if (runner === this._runner) return;

    // Stop current simulation if playing
    if (this._isPlaying) {
      this.pause();
    }

    if (this._runner) {
      // Clear previous circuit and visuals
      this._setCircuit(null);
      this._runner = null;
      this.emit('simulationStopped', { tick: 0 });
    }

    if (runner) {
      this._runner = runner;
      // Load new circuit and create visuals
      this._setCircuit(runner.circuit);
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
   * Play automatic simulation playback
   * Simulation will advance at the configured tick interval until paused
   *
   * Requires a circuit runner to be loaded via setCircuitRunner()
   * Emits 'simulationPlayed' event on play
   * Emits 'simulationTick' event on each tick
   */
  play(): void {
    if (!this._runner) {
      console.warn('Cannot play: no circuit runner loaded');
      return;
    }

    if (this._isPlaying) {
      return; // Already playing
    }
    this._isPlaying = true;
    this.emit('simulationPlayed', { tick: this._runner.getCurrentTick() });

    // Start interval loop
    this._simulationLoopId = window.setInterval(() => {
      this._executeTick();
    }, this._tickIntervalMs);
  }

  /**
   * Pause automatic simulation playback
   * Safe to call even if already paused or no circuit loaded
   *
   * Emits 'simulationPaused' event
   */
  pause(): void {
    if (!this._isPlaying) {
      return; // Already paused
    }

    this._isPlaying = false;

    // Clear interval
    if (this._simulationLoopId !== null) {
      window.clearInterval(this._simulationLoopId);
      this._simulationLoopId = null;
    }

    this.emit('simulationPaused', { tick: this._runner?.getCurrentTick() ?? 0 });
  }

  /**
   * Execute a single simulation tick
   * Simulation remains paused after step, useful for debugging
   *
   * If currently playing, pauses first then steps
   * Requires a circuit runner to be loaded via setCircuitRunner()
   * Emits 'simulationStepped' event with tick result
   */
  step(): void {
    if (!this._runner) {
      console.warn('Cannot step: no circuit runner loaded');
      return;
    }

    // If playing, pause first
    if (this._isPlaying) {
      this.pause();
    }

    // Execute one tick
    const result = this._executeTick();

    this.emit('simulationStepped', { tick: this._runner.getCurrentTick(), result });
  }

  /**
   * Stop the simulation, reset visual to initial state
   * Simulation remains paused after step, useful for debugging
   *
   * If currently playing, pauses first then steps
   * Requires a circuit runner to be loaded via setCircuitRunner()
   * Emits 'simulationStopped' event with tick result (0)
   */
  stop(): void {
    if (!this._runner) {
      console.warn('Cannot step: no circuit runner loaded');
      return;
    }
    // If playing, pause first
    if (this._isPlaying) {
      this.pause();
    }
    this._runner.reset();
    // Update visuals to initial state
    this._fullVisualUpdateFromSimulationState();
    const result = this._runner.getCurrentTick();

    this.emit('simulationStopped', { tick: result });
  }

  /**
   * Execute one simulation tick and update visuals
   * @private
   */
  private _executeTick(): unknown {
    if (!this._runner) {
      return null;
    }

    // Execute simulation tick
    const result = this._runner.tick();

    // Get dirty elements for optimized updates
    const dirty = this._runner.dirtyTracker.getDirtyElements();

    // Emit tick event
    this.emit('simulationTick', { tick: this._runner.getCurrentTick(), dirty });

    // Update visuals for changed elements
    this._updateDirtyComponents(dirty);
    this._updateDirtyWires(dirty);
    this._updateDirtyEnodes(dirty);

    return result;
  }

  /**
   * Update component animations for dirty components
   * @private
   */
  private _updateDirtyComponents(dirty: { components: ReadonlySet<string> }): void {
    if (!this._runner) return;

    // Update each dirty component's visual animation
    for (const componentId of dirty.components) {
      const object3D = this.componentObject3Ds.get(componentId);
      if (!object3D) continue;

      // Get component and its current state
      const component = this._circuit?.getComponent(componentId);
      if (!component) continue;

      const state = this._runner.getComponentState(componentId);
      if (!state) continue;

      // Get factory and update animation
      const factory = this.factoryRegistry.get(component.type);
      factory.updateAnimation(object3D, state);
    }
  }

  /**
   * Update wire visual state based on electrical state
   * @private
   */
  private _updateDirtyWires(dirty: { wires: ReadonlySet<string> }): void {
    if (!this._runner) return;

    // Update each dirty wire's material state
    for (const wireId of dirty.wires) {
      // Get wire electrical state from runner
      const wireState = this._runner.getWireState(wireId);
      if (!wireState) continue;

      // Determine material state based on electrical state
      // either idle, voltage, current or vc (voltage and current)
      let materialState: 'current' | 'voltage' | 'vc' | 'idle';
      if (wireState.hasCurrent && wireState.hasVoltage) {
        materialState = 'vc';
      } else if (wireState.hasVoltage) {
        materialState = 'voltage';
      } else if (wireState.hasCurrent) {
        materialState = 'current';
      } else {
        materialState = 'idle';
      }

      // Apply material state via WireVisualManager
      this.wireVisualManager.applyElectricalState(wireId, materialState);
    }
  }

  /**
   * Update enode visual state based on electrical state
   * Applies emissive glow to pins and branching points
   * @private
   */
  private _updateDirtyEnodes(dirty: { enodes: ReadonlySet<string> }): void {
    if (!this._runner) return;

    // Update each dirty enode's emissive state
    for (const enodeId of dirty.enodes) {
      // Get enode electrical state from runner
      const enodeState = this._runner.getEnodeState(enodeId);
      if (!enodeState) continue;

      // Get enode visual object (could be pin group or branching point)
      const enodeObject = this.enodeObject3Ds.get(enodeId);
      if (!enodeObject) continue;

      enodeObject.userData;

      // Determine emissive color based on electrical state
      // Priority: current (blue) > voltage (red) > none
      let emissiveColor: number;
      if (enodeState.hasCurrent && enodeState.hasVoltage) {
        enodeObject.userData.electricalState = 'vc';
        emissiveColor = 0xcc00cc; // Magenta for voltage and current (current circulating)
      } else if (enodeState.hasCurrent) {
        enodeObject.userData.electricalState = 'current';
        emissiveColor = 0x0000ff; // Blue for current
      } else if (enodeState.hasVoltage) {
        enodeObject.userData.electricalState = 'voltage';
        emissiveColor = 0xff0000; // Red for voltage only
      } else {
        enodeObject.userData.electricalState = 'idle';
      }

      // Apply emissive color to all meshes in the enode group
      enodeObject.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          const material = obj.material as THREE.MeshStandardMaterial;
          if (material.emissive) {
            material.emissive.setHex(emissiveColor);
            material.emissiveIntensity = emissiveColor === 0x000000 ? 0 : 1;
          }
        }
      });
    }
  }

  /**
   * Handle click events for component interaction
   * @param event
   * @private
   */
  private _handleClick(event: MouseEvent): void {
    // Only handle left clicks
    if (event.button !== 0) return;
    const hoveredElement = this.getHoveredElement();
    if (!hoveredElement) return;
    if (event.metaKey && event.ctrlKey) {
      this._handleCtrlClick(hoveredElement);
    } else {
      this._handleRegularClick(hoveredElement);
    }
  }

  /**
   * Handle regular click events : emit user commands to the runner
   * @param clickedElement
   * @private
   */
  private _handleRegularClick(clickedElement: HoveredElement) {
    if (!this._runner) return; // only process if we have a runner
    if (clickedElement.type !== 'component') return;
    const componentGroup = clickedElement.object3D.parent;
    if (!componentGroup) return;
    const componentType = componentGroup.userData.componentType;
    const componentId = componentGroup.userData.componentId;
    switch (componentType) {
      case ComponentType.Switch: {
        const command: UserCommand = {
          type: 'toggle_switch',
          targetId: componentId,
          scheduledAtTick: this._runner.getCurrentTick(),
          parameters: null,
        };
        // Submit command to runner and emit event
        this._runner.submitCommand(command);
        this.emit('simulationUserCommand', command);
        return;
      }
      default:
        return;
    }
  }

  private _handleCtrlClick(clickedElement: HoveredElement) {
    // TODO: implement ctrl+click handling
    console.warn('TODO: implement ctrl+click handling');
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
    // finally consider all elements dirty to set their initial simulation visual state
    this._fullVisualUpdateFromSimulationState();
  }

  /**
   * Consider all elements as dirty to update all visual state according to simulation state
   * @private
   */
  private _fullVisualUpdateFromSimulationState(): void {
    if (!this._circuit || !this._runner) return;

    const components = this._circuit.getAllComponents();
    const wires = this._circuit.getAllWires();
    const enodes = this._circuit.getAllENodes();

    this._updateDirtyComponents({ components: new Set(components.map((c) => c.id)) });
    this._updateDirtyEnodes({ enodes: new Set(enodes.map((e) => e.id)) });
    this._updateDirtyWires({ wires: new Set(wires.map((w) => w.id)) });
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
