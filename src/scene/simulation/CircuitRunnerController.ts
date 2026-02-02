/**
 * Simulation Circuit Controller
 * @module scene/simulation/CircuitRunnercontroller
 *
 * Controls live circuit simulation with real-time state updates and animated current flow.
 * Provides smooth interpolation between discrete simulation ticks for fluid animation.
 */

import * as THREE from 'three';
import type { Component, Wire, ENode, UserCommand, Circuit } from 'simple-circuit-engine/core';
import {
  ENodeType,
  ComponentType,
  CircuitRunner,
  BehaviorRegistry,
  SIMULATION_SPEED,
  TRANSITION_DEFAULTS,
} from 'simple-circuit-engine/core';
import type { IFactoryRegistry } from '../shared/components/ComponentVisualFactory';
import type { SharedResources, HoveredElement, ControllerOptions } from '../shared/types';
import { AbstractCircuitController } from '../shared/AbstractCircuitController';
import { gridToWorldPosition, gridToWorldRotation } from '../shared/utils/GeometryUtils';

/**
 * Simulation Circuit Runner Controller Implementation
 *
 * Manages Three.js scene for live circuit simulation visualization.
 * Provides smooth interpolation between simulation ticks for 60fps rendering.
 * Animates current flow through wires and component state changes.
 */
export class CircuitRunnerController extends AbstractCircuitController {
  private _runner: CircuitRunner | null = null;
  private _behaviorRegistry: BehaviorRegistry;

  // Playback control state
  private _autoPlay = false;
  private _isPlaying: boolean = false;
  private _tickIntervalMs: number = SIMULATION_SPEED.DEFAULT_INTERVAL_MS;
  private _simulationLoopId: number | null = null;
  private _clickHandler: ((event: MouseEvent) => void) | null = null;

  /**
   * Create a new Simulation Circuit Controller
   *
   * @param factoryRegistry - Component visual factory registry
   * @param behaviorRegistry - Component behavior registry
   * @param sharedResources - Optional shared resources for facade pattern (CircuitEngine)
   * @throws {TypeError} If factoryRegistry is null/undefined
   */
  constructor(
    factoryRegistry: IFactoryRegistry,
    behaviorRegistry: BehaviorRegistry,
    sharedResources?: SharedResources
  ) {
    super(factoryRegistry, sharedResources);
    if (!behaviorRegistry) {
      throw new TypeError('BehaviorRegistry is required');
    }
    this._behaviorRegistry = behaviorRegistry;
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
   * Get current simulation speed in ticks per second.
   * Range: 1-20 TPS
   */
  get simulationSpeed(): number {
    return Math.round(1000 / this._tickIntervalMs);
  }

  /**
   * Set simulation speed in ticks per second.
   * Value is clamped to range 1-20 TPS.
   * If simulation is playing, restarts the interval with new value.
   * Emits 'simulationSpeedChanged' event when speed changes.
   *
   * @param tps - Ticks per second (1-20)
   */
  set simulationSpeed(tps: number) {
    const previousSpeed = this.simulationSpeed;
    const clampedTps = Math.max(SIMULATION_SPEED.MIN_TPS, Math.min(SIMULATION_SPEED.MAX_TPS, tps));

    // Skip if no change
    if (clampedTps === previousSpeed) {
      return;
    }

    // Convert TPS to interval and apply
    this._tickIntervalMs = Math.round(1000 / clampedTps);

    // If playing, restart interval with new value
    if (this._isPlaying) {
      this.pause();
      this.play();
    }

    // Emit speed changed event
    this.emit('simulationSpeedChanged', {
      previousSpeed,
      newSpeed: clampedTps,
    });
  }

  /**
   * Minimum allowed simulation speed in ticks per second.
   */
  get minSimulationSpeed(): number {
    return SIMULATION_SPEED.MIN_TPS;
  }

  /**
   * Maximum allowed simulation speed in ticks per second.
   */
  get maxSimulationSpeed(): number {
    return SIMULATION_SPEED.MAX_TPS;
  }

  /**
   * Compute the number of ticks required for a transition given its duration in milliseconds.
   * Formula: ceil(transitionUserSpanMs × simulationSpeed / 1000), minimum 1.
   *
   * @param transitionUserSpanMs - Transition duration in milliseconds
   * @returns Number of ticks for the transition (minimum 1)
   */
  computeTickCount(transitionUserSpanMs: number): number {
    const tickCount = Math.ceil((transitionUserSpanMs * this.simulationSpeed) / 1000);
    return Math.max(1, tickCount);
  }

  /**
   * Get the transition duration from component config for user-driven transitions.
   * @param config - Component config map
   * @returns Transition duration in milliseconds (defaults to TRANSITION_USER_SPAN_MS)
   */
  private _getTransitionUserSpan(config: Map<string, string>): number {
    const value = parseInt(config.get('transitionUserSpan') || '', 10);
    if (isNaN(value) || value < 0) {
      return TRANSITION_DEFAULTS.TRANSITION_USER_SPAN_MS;
    }
    return value;
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
   *
   * @param options - Controller options passed to initialize()
   */
  protected onInitialize(options?: ControllerOptions) {
    if (options) {
      if (options.simulationSpeed) this.simulationSpeed = options.simulationSpeed;
      if (typeof options.simulationAutoPlay == 'boolean')
        this._autoPlay = options.simulationAutoPlay;
    }
    // Register click handler for component (switches) interaction
    this._clickHandler = this._handleClick.bind(this);
    this._container!.addEventListener('click', this._clickHandler);

    // standalone mode -> Controller active
    if(!this._sharedResources){
      this.setActive(true);
    }
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

    // Clear runner reference
    this._runner = null;
  }

  onSetActive(active: boolean): void {
    if (!active) {
      this.stop();
      this._runner = null;
      this._removeSimulationStateVisuals();
    } else {
      if (!this._circuit) return;
      // recreate runner for the current circuit (which can have been modified in edit mode while this controller was inactive)
      this._runner = new CircuitRunner(this._circuit, this._behaviorRegistry);
      // update graphics
      this._fullUpdate();
      // if autoplay launch !
      if (this._autoPlay) this.play();
    }
  }

  setCircuit(circuit: Circuit | null): void {
    this._checkInitialized();
    if (circuit === this._circuit) return;

    // Stop current simulation if playing
    if (this._isPlaying) {
      this.stop();
    }
    this._runner = null;

    // When using shared resources, skip visual management (edit controller handles it)
    // Just update circuit reference and create runner
    if (this._useSharedResources) {
      this._circuit = circuit;
      this.wireVisualManager.setCircuit(circuit);
      if (circuit) {
        this._gridHalfSize = Math.ceil(circuit.metadata.size / 2);
        if (!this._active) return; // nothing more to do if not active
        // if active launch the thing
        this._runner = new CircuitRunner(circuit, this._behaviorRegistry);
        // update graphics
        this._fullUpdate();
        // if autoplay launch !
        if (this._autoPlay) this.play();
      }
      return;
    }

    // Standalone mode: full visual management
    this._setCircuit(circuit);
  }

  /**
   * specific logic when to render a new set circuit
   * @protected
   */
  protected onSetCircuit() {
    if (!this._circuit) return;
    this._runner = new CircuitRunner(this._circuit, this._behaviorRegistry);
    if (!this._useSharedResources) {
      // if standalone mode, activate immediately
      this.setActive(true);
    }
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
    this._visualUpdateFromSimulationState();
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
      const object3D = this._componentObject3Ds.get(componentId);
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
      const enodeObject = this._enodeObject3Ds.get(enodeId);
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
   * rollback wires/enodes/components visuals to edition state (no simulation state)
   */
  _removeSimulationStateVisuals(): void {
    for (const wireId of this._wireObject3Ds.keys()) {
      this.wireVisualManager.applyElectricalState(wireId, 'idle');
    }
    for (const enodeId of this._enodeObject3Ds.keys()) {
      const enodeObject = this._enodeObject3Ds.get(enodeId);
      if (!enodeObject) continue;
      enodeObject.userData.electricalState = 'idle';
      enodeObject.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          const material = obj.material as THREE.MeshStandardMaterial;
          if (material.emissive) {
            material.emissive.setHex(0x000000);
            material.emissiveIntensity = 0;
          }
        }
      });
    }
    for (const componentId of this._componentObject3Ds.keys()) {
      const componentObject = this._componentObject3Ds.get(componentId);
      if (!componentObject) continue;
      // Get component and its current state
      const component = this._circuit?.getComponent(componentId);
      if (!component) continue;
      const factory = this.factoryRegistry.get(component.type);
      factory.updateAnimation(componentObject, null);
    }
  }

  /**
   * Handle click events for component interaction
   * @param event
   * @private
   */
  private _handleClick(event: MouseEvent): void {
    if (!this._active) return;
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
    if (clickedElement.type === 'wire') return;
    let componentGroup = null;
    if (clickedElement.type === 'component') {
      componentGroup = clickedElement.object3D.parent;
    } else if (clickedElement.type === 'enode') {
      // for pin enodes, get parent component
      const enode = this._circuit?.getENode(clickedElement.id);
      if (!enode) return;
      if (!enode.component) return;
      componentGroup = this._componentObject3Ds.get(enode.component);
    }
    if (!componentGroup) return;
    const componentType = componentGroup.userData.componentType;
    const componentId = componentGroup.userData.componentId;
    switch (componentType) {
      case ComponentType.Switch: {
        // Get component to read its config
        const component = this._circuit?.getComponent(componentId);
        if (!component) return;

        // Compute tickCount from transitionUserSpan and simulationSpeed
        const transitionUserSpan = this._getTransitionUserSpan(component.config);
        const tickCount = this.computeTickCount(transitionUserSpan);

        const command: UserCommand = {
          type: 'toggle_switch',
          targetId: componentId,
          scheduledAtTick: this._runner.getCurrentTick(),
          parameters: new Map<string, string>([['tickCount', String(tickCount)]]),
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

  private _handleCtrlClick(_clickedElement: HoveredElement) {
    // TODO: implement ctrl+click handling
    console.warn('TODO: implement ctrl+click handling');
  }

  /**
   * recreate all visuals based on circuit data
   * Should be called on an already cleared scene
   *
   * When using shared resources (CircuitEngine facade), skips visual creation
   * if visuals already exist in the shared maps (created by edit controller).
   * @private
   */
  private _fullUpdate(): void {
    this._checkInitialized();

    if (!this._circuit) return;

    // When using shared resources and visuals already exist, skip creation
    // The edit controller has already created all visuals

    if (!this._useSharedResources) {
      // Create visuals for all circuit elements
      const components = this._circuit.getAllComponents();
      const wires = this._circuit.getAllWires();
      const enodes = this._circuit.getAllENodes();

      for (const component of components) {
        this._createComponentObject3D(component);
      }
      for (const enode of enodes) {
        this._createEnodeObject3D(enode);
      }
      for (const wire of wires) {
        this._createWireObject3D(wire);
      }
    }

    // Always update simulation visual state (colors, animations) from simulation state
    this._visualUpdateFromSimulationState();
  }

  /**
   * Consider all elements as dirty to update all visual state according to simulation state
   * @private
   */
  private _visualUpdateFromSimulationState(): void {
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

      // For edited pin enodes, update source type visual (component visual factory creates them only in their default mode)
      for (const pinId of component.pins) {
        const enode = this._circuit!.getENode(pinId);
        if (!enode || !enode.source) continue;
        const pinGroup = this._enodeObject3Ds.get(enode.id);
        if (!pinGroup) continue;
        this.factoryRegistry.getFallbackFactory().updatePinSourceType(pinGroup, enode.source);
      }
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
    this._componentObject3Ds.set(componentId, object3D);
    object3D.traverse((obj) => {
      if (obj.userData && obj.userData.type === 'enodeGroup') {
        const enodeId = obj.userData.enodeId;
        if (enodeId) {
          this._enodeObject3Ds.set(enodeId, obj as THREE.Group);
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
    this._enodeObject3Ds.set(enode.id, group);
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
    const group = this._componentObject3Ds.get(id);
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
    this._componentObject3Ds.delete(id);
  }

  private _removeEnodeObject3D(id: string): void {
    const group = this._enodeObject3Ds.get(id);
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
    this._enodeObject3Ds.delete(id);
  }

  private _removeWireObject3D(id: string): void {
    if (this._wireObject3Ds.has(id)) {
      // TODO : see if there are specific disposals to do (animations ?)
      // Use WireVisualManager to remove wire (handles all disposal and delete from map)
      this.wireVisualManager.removeWire(id);
    }
  }

  protected _removeAllVisuals(): void {
    // TODO : see if there are specific disposals to do (animations ?)
    // Remove all wire meshes
    for (const id of Array.from(this._wireObject3Ds.keys())) {
      this._removeWireObject3D(id);
    }
    // Remove all enode meshes
    for (const id of Array.from(this._enodeObject3Ds.keys())) {
      this._removeEnodeObject3D(id);
    }
    // Remove all component meshes
    for (const id of Array.from(this._componentObject3Ds.keys())) {
      this._removeComponentObject3D(id);
    }
  }
}
