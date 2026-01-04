/**
 * Main simulation engine for discrete-time circuit simulation
 * @module core/simulation
 */

import type { Circuit } from '@/core/Circuit.js';
import type { RunnerOptions } from './types/RunnerOptions.js';
import type { UserCommand } from './types/UserCommand.js';
import type { NodeElectricalState } from './states/NodeElectricalState.js';
import type { ComponentState } from './states/ComponentState.js';
import { SimulationState } from './SimulationState.js';
import { StateManager } from './StateManager.js';
import { EventQueue } from './EventQueue.js';
import { DirtyTracker } from './DirtyTracker.js';
import { BehaviorRegistry } from './behaviors/BehaviorRegistry.js';
import type { UUID } from '@/core/types/Identifier.js';
import { ENodeSourceType } from '@/core/types/ENodeSourceType';
import type { ReachabilityResult } from '@/core/simulation/types/ReachabilityResult';
import type { ENode } from '@/core/ENode';
import { ENodeType } from '@/core/types/ENodeType';
import type { Component } from '@/core/Component';
import type { BehaviorResult } from '@/core/simulation/behaviors/ComponentBehavior';
import type { RunnerResult } from '@/core/simulation/types/RunnerResult';

/**
 * Main circuit simulation engine.
 * Manages discrete-time simulation with event-driven state propagation.
 *
 * Features:
 * - Boolean electrical state (voltage/current present or not)
 * - Event-driven delayed transitions
 * - Dirty tracking for optimization
 * - Configurable history storage
 * - Registry-based component behaviors
 *
 * @public
 */
export class CircuitRunner {
  public readonly circuit: Circuit;
  public readonly stateManager: StateManager;
  public readonly eventQueue: EventQueue;
  public readonly commands: Map<UUID, UserCommand>;
  public readonly dirtyTracker: DirtyTracker;
  public readonly behaviorRegistry: BehaviorRegistry;

  /**
   * Create a new circuit simulation runner.
   *
   * @param circuit - The circuit topology to simulate
   * @param behaviorRegistry - Registry of component behaviors
   * @param options - Simulation options (history settings)
   */
  constructor(circuit: Circuit, behaviorRegistry: BehaviorRegistry, options: RunnerOptions = {}) {
    this.circuit = circuit;
    this.behaviorRegistry = behaviorRegistry;

    const enableHistory = options.enableHistory ?? false;
    const historyLimit = options.historyLimit ?? 1000;

    this.stateManager = new StateManager(enableHistory, historyLimit);
    this.eventQueue = new EventQueue();
    this.commands = new Map<UUID, UserCommand>();
    this.dirtyTracker = new DirtyTracker();

    // Initialize simulation state
    try{
      this.initializeState();
    }
    catch(e){
      console.error("Error during CircuitRunner initialization:", e);
      throw e;
    }

  }

  /**
   * Execute one simulation tick.
   * Process scheduled events, update state (electrical propagation), process user commands and advance tick.
   *
   * @returns the result of the tick execution
   */
  tick(): RunnerResult {
    const eventQueueStartSize = this.eventQueue.size();
    const currentTick = this.stateManager.getCurrentTick();

    // 1. Process scheduled events ready at this tick end
    const eventResults = this.applyReadyEvents(currentTick + 1);

    // 2. Update state
    const result = this.updateState(currentTick + 1);
    result.firedEventCount = eventResults.length;

    // 3. Process user commands scheduled for this tick
    const userCommandResults = this.processCommands();
    result.processedCommandCount = userCommandResults.length;

    result.scheduledEventCount =
      this.eventQueue.size() + result.firedEventCount - eventQueueStartSize;

    // 3H. due to orchestration difficulties this hotfix handles component dirty tracking
    for (const eventResult of eventResults) {
      if (eventResult.hasChanged) {
        this.dirtyTracker.markComponentDirty(eventResult.componentState.componentId);
      }
    }
    result.componentUpdateCount = this.dirtyTracker.getDirtyComponentCount();

    // 4. Advance to next tick
    this.stateManager.advanceToNextTick();
    result.endTick = this.stateManager.getCurrentTick();
    return result;
  }

  /**
   * Execute multiple simulation ticks.
   *
   * @param count - Number of ticks to execute
   * @returns an array of RunnerResult for each tick executed
   */
  tickN(count: number): RunnerResult[] {
    if (count < 1) {
      throw new RangeError(`Tick count must be at least 1 (got ${count})`);
    }

    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(this.tick());
    }

    return results;
  }

  /**
   * Reset simulation to tick 0.
   * Clears all state, history, and scheduled events.
   */
  reset(): void {
    this.stateManager.reset();
    this.eventQueue.clear();
    this.dirtyTracker.clear();
    this.initializeState();
  }

  /**
   * Get current simulation tick number.
   *
   * @returns Current tick
   */
  getCurrentTick(): number {
    return this.stateManager.getCurrentTick();
  }

  /**
   * Get current simulation state snapshot.
   *
   * @returns Current state (readonly)
   */
  getCurrentState(): SimulationState {
    return this.stateManager.getCurrentState();
  }

  /**
   * Get electrical state of a specific ENode.
   *
   * @param enodeId - UUID of the ENode
   * @returns Electrical state, or undefined if not found
   */
  getEnodeState(enodeId: UUID): NodeElectricalState | undefined {
    return this.stateManager.getCurrentState().nodeStates.get(enodeId);
  }

  /**
   * Get electrical state of a specific Wire.
   *
   * @param wireId - UUID of the Wire
   * @returns Electrical state, or undefined if not found
   */
  getWireState(wireId: UUID): NodeElectricalState | undefined {
    return this.stateManager.getCurrentState().wireStates.get(wireId);
  }

  /**
   * Get component state for a specific component.
   *
   * @param componentId - UUID of the component
   * @returns Component state, or undefined if not found
   */
  getComponentState(componentId: UUID): ComponentState | undefined {
    return this.stateManager.getCurrentState().componentStates.get(componentId);
  }

  /**
   * Get historical state at a specific tick.
   * Only works if history is enabled.
   *
   * @param tick - Tick number to retrieve
   * @returns Historical state, or undefined if not available
   */
  getStateAtTick(tick: number): SimulationState | undefined {
    return this.stateManager.getStateAtTick(tick);
  }

  /**
   * Check if a component is registered in behavior registry.
   *
   * @param componentType - Component type to check
   * @returns True if behavior is registered
   */
  hasBehavior(componentType: string): boolean {
    return this.behaviorRegistry.has(componentType);
  }

  /**
   * Submit a user command to execute at the next tick.
   * only one command per component per tick is allowed.
   * Subsequent commands for the same component at this tick will be discarded.
   *
   * @param command - User command to submit
   */
  submitCommand(command: UserCommand): boolean {
    if (!this.circuit.hasComponent(command.targetId)) {
      throw Error(`Cannot submit command for unknown component ID '${command.targetId}'`);
    }
    if (this.commands.has(command.targetId)) {
      return false; // currently we only allow one command per component and tick
    }
    command.scheduledAtTick = this.getCurrentTick();
    this.commands.set(command.targetId, command);
    return true;
  }

  /**
   * Process all scheduled user commands.
   * Mark changed components as Dirty and enqueue consequent scheduled events
   * Finally clears command queue after processing.
   *
   * @returns Array of BehaviorResult for each processed command
   */
  private processCommands(): BehaviorResult[] {
    const currentState = this.stateManager.getCurrentState();

    const results: BehaviorResult[] = [];

    for (const command of this.commands.values()) {
      const component = this.circuit.getComponent(command.targetId) as Component;
      const behavior = this.behaviorRegistry.get(component.type)!;

      const result = behavior.onUserCommand(
        component,
        currentState.componentStates.get(component.id)!,
        command
      );
      for (const event of result.scheduledEvents) {
        this.eventQueue.schedule(event);
      }
      results.push(result);
      if (result.hasChanged) {
        this.dirtyTracker.markComponentDirty(component.id);
      }
    }
    this.commands.clear();

    return results;
  }

  /**
   * Helper function to extract initializationPriority from component config.
   * Returns numeric priority value, with empty string or null defaulting to 0.
   *
   * @param config - Component configuration map
   * @returns Priority value (higher = processed first)
   */
  private getInitializationPriority(config: Map<string, string>): number {
    const value = config.get('initializationPriority');
    if (!value || value === '') return 0;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Initialize simulation state for all components.
   * Called on construction and reset.
   *
   * Uses priority-based initialization to resolve feedback loops:
   * 1. Components are grouped by initializationPriority (higher = processed LAST = prevails)
   * 2. Within each group, components are sorted by UUID (ascending) for determinism
   * 3. Conductivity is propagated after each component
   *
   * In feedback circuits, the component processed LAST "wins" because earlier
   * components react to the initial symmetric state and open, while later
   * components see the updated (asymmetric) state and stay closed.
   */
  private initializeState(): RunnerResult {
    const currentState = this.stateManager.getCurrentState();

    // Initialize component states using behaviors
    for (const component of this.circuit.getAllComponents()) {
      if(component.pins.length < 1) continue;

      const behavior = this.behaviorRegistry.get(component.type);
      if (!behavior) {
        console.warn(
          `No behavior registered for component type '${component.type}' (${component.id})`
        );
        continue;
      }

      const initialState = behavior.createInitialState(component);
      (currentState.componentStates as Map<UUID, ComponentState>).set(component.id, initialState);

      // Mark component as dirty for initial evaluation
      this.dirtyTracker.markComponentDirty(component.id);
    }

    // Initialize all ENode initial states based on their topology source type
    for (const enode of this.circuit.getAllENodes()) {
      (currentState.nodeStates as Map<UUID, NodeElectricalState>).set(enode.id, {
        hasVoltage: enode.source === ENodeSourceType.Voltage,
        hasCurrent: enode.source === ENodeSourceType.Current,
        locked: !!enode.source,
      });
    }
    // Initialize all Wire states unlocked without voltage/current
    for (const wire of this.circuit.getAllWires()) {
      (currentState.wireStates as Map<UUID, NodeElectricalState>).set(wire.id, {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      });
    }

    // Priority-based initialization for feedback loop resolution
    // Group components by priority level
    const allComponents = this.circuit.getAllComponents();
    const componentsByPriority = new Map<number, Component[]>();

    for (const component of allComponents) {
      const priority = this.getInitializationPriority(component.config);
      const group = componentsByPriority.get(priority) ?? [];
      group.push(component);
      componentsByPriority.set(priority, group);
    }

    // Sort priority levels (ascending - lower priority first, higher priority last = prevails)
    const sortedPriorities = Array.from(componentsByPriority.keys()).sort((a, b) => a - b);

    // Sort components within each priority group by UUID for determinism
    for (const priority of sortedPriorities) {
      const group = componentsByPriority.get(priority)!;
      group.sort((a, b) => a.id.localeCompare(b.id));
    }

    // Iterate until stable state is reached (for feedback loop resolution)
    // This is necessary because feedback circuits may require multiple passes
    // to reach equilibrium after initial state changes propagate through the loop.
    //
    // KEY: During initialization, we fire events IMMEDIATELY after each component
    // processes (bypassing the normal tick delay). This allows the first component
    // in a feedback loop to complete its transition before the next component sees
    // the state, thereby breaking symmetry in cross-coupled feedback circuits.
    let hasChanges = true;
    let iterations = 0;
    const maxIterations = 100; // Safety limit to prevent infinite loops

    while (hasChanges && iterations < maxIterations) {
      hasChanges = false;
      iterations++;

      // Process each priority group sequentially
      for (const priority of sortedPriorities) {
        const group = componentsByPriority.get(priority)!;

        // Process each component sequentially with immediate event firing
        for (const component of group) {
          const behavior = this.behaviorRegistry.get(component.type);
          if (!behavior) continue;

          const componentState = currentState.componentStates.get(component.id);
          if (!componentState) continue;

          // Propagate before processing this component so it sees current electrical state
          this.propagateConductivity();

          // Let the component react to current pin states
          const result = behavior.onPinsChange(
            component,
            componentState,
            currentState.nodeStates,
            0
          );

          // Update component state if it changed
          if (result.hasChanged) {
            hasChanges = true;
            (currentState.componentStates as Map<UUID, ComponentState>).set(
              component.id,
              result.componentState
            );
          }

          // During initialization, fire any scheduled events IMMEDIATELY
          // This is the key to breaking feedback symmetry: the first component
          // completes its full transition (e.g., opening → open) before the
          // next component in the feedback loop sees the new electrical state.
          for (const event of result.scheduledEvents) {
            const eventResult = behavior.onEventFiring(component, componentState, event);
            if (eventResult.hasChanged) {
              hasChanges = true;
              (currentState.componentStates as Map<UUID, ComponentState>).set(
                component.id,
                eventResult.componentState
              );
            }
          }
        }
      }
    }

    const result = this.updateState(0);

    // at initialization everything is dirty
    this.dirtyTracker.setDirtyComponents(
      new Set([...this.circuit.getAllComponents().map((c) => c.id)])
    );
    this.dirtyTracker.setDirtyEnodes(new Set([...this.circuit.getAllENodes().map((n) => n.id)]));
    this.dirtyTracker.setDirtyWires(new Set([...this.circuit.getAllWires().map((w) => w.id)]));

    return result;
  }

  /**
   * Core method that orchestrates nodes, wires and components state updates
   * enqueue resulting events and update dirty tracker accordingly
   * @param targetTick - Tick at which to perform the update
   */
  private updateState(targetTick: number): RunnerResult {
    const currentState = this.stateManager.getCurrentState();

    const { updatedNodes, updatedWires } = this.propagateConductivity();
    const componentsToAssess = this.circuit.getComponentsOfPins(updatedNodes);
    const results: BehaviorResult[] = [];

    const updatedComponents = new Set<UUID>();
    let eventCount = 0;

    // During initialization (tick 0), sort components by priority to resolve feedback loops
    let sortedComponentIds = Array.from(componentsToAssess);
    if (targetTick === 0) {
      sortedComponentIds = sortedComponentIds.sort((idA, idB) => {
        const compA = this.circuit.getComponent(idA) as Component;
        const compB = this.circuit.getComponent(idB) as Component;
        const priorityA = this.getInitializationPriority(compA.config);
        const priorityB = this.getInitializationPriority(compB.config);

        // Lower priority first, higher priority last (ascending) = higher priority prevails
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Tie-break by UUID (ascending)
        return idA.localeCompare(idB);
      });
    }

    for (const componentId of sortedComponentIds) {
      const component = this.circuit.getComponent(componentId) as Component;
      const behavior = this.behaviorRegistry.get(component.type);
      if (!behavior) {
        console.warn(
          `No behavior registered for component type '${component.type}' (${component.id})`
        );
        continue;
      }
      const res = behavior.onPinsChange(
        component,
        currentState.componentStates.get(componentId)!,
        currentState.nodeStates,
        targetTick
      );
      if (res.hasChanged) {
        updatedComponents.add(componentId);
        results.push(res);
      }
      for (const event of res.scheduledEvents) {
        this.eventQueue.schedule(event);
        eventCount++;
      }
    }

    this.dirtyTracker.setDirtyComponents(updatedComponents);
    this.dirtyTracker.setDirtyEnodes(updatedNodes);
    this.dirtyTracker.setDirtyWires(updatedWires);

    return {
      startTick: this.getCurrentTick(),
      endTick: this.getCurrentTick(),
      componentUpdateCount: updatedComponents.size,
      nodeUpdateCount: updatedNodes.size,
      wireUpdateCount: updatedWires.size,
      processedCommandCount: 0,
      scheduledEventCount: eventCount,
      firedEventCount: 0,
    };
  }

  /**
   * runs BFS (Breadth First Search) on voltage and current conductivity
   * to propagate voltage/current conductivity
   * and update enodes/wires electrical states throughout the circuit
   * update is performed in place and updated nodes and wires returned
   */
  private propagateConductivity(): { updatedNodes: Set<UUID>; updatedWires: Set<UUID> } {
    const currentState = this.stateManager.getCurrentState();

    const updateConductivity = (
      type: ENodeSourceType
    ): {
      updatedNodes: Set<UUID>;
      updatedWires: Set<UUID>;
    } => {
      const updatedNodes = new Set<UUID>();
      const updatedWires = new Set<UUID>();

      const sources = this.circuit
        .getAllENodes()
        .filter((node) => node.source == type)
        .map((node) => node.id);
      const uncheckedNodes = new Set([
        ...this.circuit
          .getAllENodes()
          .filter((node) => !node.source)
          .map((node) => node.id),
      ]); // pool of all other nodes whose state is to assess
      const uncheckedWires = new Set([...this.circuit.getAllWires().map((wire) => wire.id)]); // pool of all other wires whose state is to assess

      const { nodes, wires } = this.computeReachability(
        type,
        sources,
        currentState.componentStates
      );

      const attribute = type == ENodeSourceType.Voltage ? 'hasVoltage' : 'hasCurrent';

      for (const nodeId of nodes) {
        const nodeState = currentState.nodeStates.get(nodeId);
        if (nodeState && !nodeState.locked) {
          if (!nodeState[attribute]) {
            nodeState[attribute] = true;
            updatedNodes.add(nodeId);
          }
          uncheckedNodes.delete(nodeId);
        }
      }
      // at this point all uncheckedNodes can be considered without conductivity : hence they are updated if necessary
      for (const nodeId of uncheckedNodes) {
        const nodeState = currentState.nodeStates.get(nodeId);
        if (nodeState && !nodeState.locked) {
          if (nodeState[attribute]) {
            nodeState[attribute] = false;
            updatedNodes.add(nodeId);
          }
        }
      }

      for (const wireId of wires) {
        const wireState = currentState.wireStates.get(wireId);
        if (!!wireState) {
          if (!wireState[attribute]) {
            wireState[attribute] = true;
            updatedWires.add(wireId);
          }
          uncheckedWires.delete(wireId);
        }
      }
      // at this point all uncheckedWires can be considered without conductivity : hence they are updated if necessary
      for (const wireId of uncheckedWires) {
        const wireState = currentState.wireStates.get(wireId);
        if (!!wireState) {
          if (wireState[attribute]) {
            wireState[attribute] = false;
            updatedWires.add(wireId);
          }
        }
      }

      return { updatedNodes, updatedWires };
    };

    const { updatedNodes: voltageUpdateNodes, updatedWires: voltageUpdatedWires } =
      updateConductivity(ENodeSourceType.Voltage);
    const { updatedNodes: currentUpdateNodes, updatedWires: currentUpdatedWires } =
      updateConductivity(ENodeSourceType.Current);

    return {
      updatedNodes: new Set([...voltageUpdateNodes, ...currentUpdateNodes]) as Set<UUID>,
      updatedWires: new Set([...voltageUpdatedWires, ...currentUpdatedWires]) as Set<UUID>,
    };
  }

  /**
   * given a conductivity conductivityType and a set of seed nodes, compute all reachable nodes and wires
   * depends on componentStates to determine if conductivity is allowed through components
   * this method doesn't mutate any state, it's a pure function
   * @param conductivityType
   * @param seeds
   * @param componentStates
   */
  private computeReachability(
    conductivityType: ENodeSourceType,
    seeds: UUID[],
    componentStates: ReadonlyMap<UUID, ComponentState>
  ): ReachabilityResult {
    const reachableNodes = new Set<UUID>();
    const reachableWires = new Set<UUID>();
    const frontier: UUID[] = [];

    // Seed the frontier
    for (const seed of seeds) {
      frontier.push(seed);
      reachableNodes.add(seed);
    }

    while (frontier.length > 0) {
      const currentId = frontier.shift() as UUID;

      // Traverse via wires
      for (const wire of this.circuit.getWiresByNode(currentId)) {
        const otherNodeId = wire.node1 === currentId ? wire.node2 : wire.node1;

        if (!reachableNodes.has(otherNodeId)) {
          reachableNodes.add(otherNodeId);
          frontier.push(otherNodeId);
        }
        if (!reachableWires.has(wire.id)) {
          reachableWires.add(wire.id);
        }
      }

      // Traverse through components in case of pin
      const node = this.circuit.getENode(currentId) as ENode;
      if (node.type === ENodeType.Pin) {
        const component = this.circuit.getComponent(node.component!) as Component;
        const behavior = this.behaviorRegistry.get(component.type);
        if (!behavior) {
          console.warn(
            `No behavior registered for component type '${component.type}' (${component.id})`
          );
          continue;
        }

        const state = componentStates.get(component.id)!;

        for (const otherPinId of component.pins) {
          if (otherPinId === currentId) continue;
          if (reachableNodes.has(otherPinId)) continue;

          // Check if component allows traversal
          const res = behavior.allowConductivity(
            component,
            state,
            conductivityType,
            currentId,
            otherPinId
          );

          if (res) {
            reachableNodes.add(otherPinId);
            frontier.push(otherPinId);
          }
        }
      }
    }

    return { nodes: reachableNodes, wires: reachableWires };
  }

  /**
   * Fire ready events and update current state accordingly
   * eventual subsequent events are enqueued
   *
   * @param targetTick - Tick at which to process events
   * @param events - Events to apply
   * @param state - Current simulation state
   * @param targetTick - Target tick for event processing
   */
  private applyReadyEvents(targetTick: number): BehaviorResult[] {
    const currentState = this.stateManager.getCurrentState();
    const readyEvents = this.eventQueue.getReadyEvents(targetTick);

    const results: BehaviorResult[] = [];

    for (const event of readyEvents) {
      const component = this.circuit.getComponent(event.targetId) as Component;
      const behavior = this.behaviorRegistry.get(component.type);
      if (!behavior) {
        console.warn(
          `No behavior registered for component type '${component.type}' (${component.id})`
        );
        continue;
      }

      const componentState = currentState.componentStates.get(component.id)!;
      const result = behavior.onEventFiring(component, componentState, event);
      for (const event of result.scheduledEvents) {
        this.eventQueue.schedule(event);
      }
      results.push(result);
    }

    return results;
  }
}
