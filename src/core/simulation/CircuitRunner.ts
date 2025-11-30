/**
 * Main simulation engine for discrete-time circuit simulation
 * @module core/simulation
 */

import type { Circuit } from '@/core/Circuit.js';
import type { Component } from '@/core/Component.js';
import type { RunnerOptions } from './types/RunnerOptions.js';
import type { UserCommand } from './types/UserCommand.js';
import type { ScheduledEvent } from './types/ScheduledEvent.js';
import type { NodeElectricalState } from './states/NodeElectricalState.js';
import type { ComponentState } from './states/ComponentState.js';
import { SimulationState } from './SimulationState.js';
import { StateManager } from './StateManager.js';
import { EventQueue } from './EventQueue.js';
import { DirtyTracker } from './DirtyTracker.js';
import { BehaviorRegistry } from './behaviors/BehaviorRegistry.js';
import type { UUID } from '@/core/types/Identifier.js';

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
  private readonly circuit: Circuit;
  private readonly stateManager: StateManager;
  private readonly eventQueue: EventQueue;
  private readonly dirtyTracker: DirtyTracker;
  private readonly behaviorRegistry: BehaviorRegistry;

  /**
   * Create a new circuit simulation runner.
   *
   * @param circuit - The circuit topology to simulate
   * @param behaviorRegistry - Registry of component behaviors
   * @param options - Simulation options (history settings)
   */
  constructor(
    circuit: Circuit,
    behaviorRegistry: BehaviorRegistry,
    options: RunnerOptions = {}
  ) {
    this.circuit = circuit;
    this.behaviorRegistry = behaviorRegistry;

    const enableHistory = options.enableHistory ?? false;
    const historyLimit = options.historyLimit ?? 1000;

    this.stateManager = new StateManager(enableHistory, historyLimit);
    this.eventQueue = new EventQueue();
    this.dirtyTracker = new DirtyTracker();

    // Initialize simulation state
    this.initializeState();
  }

  /**
   * Execute one simulation tick.
   * Processes scheduled events, evaluates dirty components, and propagates state.
   *
   * @returns Current tick number after execution
   */
  tick(): number {
    const currentTick = this.stateManager.getCurrentTick();
    const currentState = this.stateManager.getCurrentState();

    // 1. Process scheduled events ready at this tick
    const readyEvents = this.eventQueue.getReadyEvents(currentTick);
    this.applyScheduledEvents(readyEvents, currentState);

    // 2. Evaluate all dirty components (or all components on first tick)
    this.evaluateComponents(currentState, currentTick);

    // 3. Advance to next tick
    this.stateManager.advanceToNextTick();

    return this.stateManager.getCurrentTick();
  }

  /**
   * Execute multiple simulation ticks.
   *
   * @param count - Number of ticks to execute
   * @returns Final tick number
   */
  tickN(count: number): number {
    if (count < 1) {
      throw new RangeError(`Tick count must be at least 1 (got ${count})`);
    }

    for (let i = 0; i < count; i++) {
      this.tick();
    }

    return this.stateManager.getCurrentTick();
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
   * Schedule a user command to execute at a future tick.
   *
   * @param command - User command to schedule
   */
  scheduleCommand(_command: UserCommand): void {
    // TODO: Implement user command handling
    // For MVP, we'll skip this and implement in later phase
    throw new Error('User commands not yet implemented');
  }

  /**
   * Initialize simulation state for all components.
   * Called on construction and reset.
   */
  private initializeState(): void {
    const currentState = this.stateManager.getCurrentState();

    // Initialize component states using behaviors
    for (const component of this.circuit.components) {
      const behavior = this.behaviorRegistry.get(component.type);

      if (!behavior) {
        console.warn(
          `No behavior registered for component type '${component.type}' (${component.id})`
        );
        continue;
      }

      const initialState = behavior.createInitialState(component);
      (currentState.componentStates as Map<UUID, ComponentState>).set(
        component.id,
        initialState
      );

      // Mark component as dirty for initial evaluation
      this.dirtyTracker.markComponentDirty(component.id);
    }

    // Initialize all ENode and Wire states to off
    for (const enode of this.circuit.enodes) {
      (currentState.nodeStates as Map<UUID, NodeElectricalState>).set(enode.id, {
        hasVoltage: false,
        hasCurrent: false
      });
    }

    for (const wire of this.circuit.wires) {
      (currentState.wireStates as Map<UUID, NodeElectricalState>).set(wire.id, {
        hasVoltage: false,
        hasCurrent: false
      });
    }
  }

  /**
   * Apply scheduled events to current state.
   *
   * @param events - Events to apply
   * @param state - Current simulation state
   */
  private applyScheduledEvents(events: ScheduledEvent[], state: SimulationState): void {
    for (const event of events) {
      if (event.targetType === 'component') {
        const currentCompState = state.componentStates.get(event.targetId);
        if (currentCompState) {
          // Merge newState into current state
          Object.assign(currentCompState, event.newState);
          this.dirtyTracker.markComponentDirty(event.targetId);
        }
      } else if (event.targetType === 'enode') {
        const currentNodeState = state.nodeStates.get(event.targetId);
        if (currentNodeState) {
          Object.assign(currentNodeState, event.newState);
          this.dirtyTracker.markEnodeDirty(event.targetId);
        }
      } else if (event.targetType === 'wire') {
        const currentWireState = state.wireStates.get(event.targetId);
        if (currentWireState) {
          Object.assign(currentWireState, event.newState);
          this.dirtyTracker.markWireDirty(event.targetId);
        }
      }
    }
  }

  /**
   * Evaluate component behaviors and update state.
   *
   * @param state - Current simulation state
   * @param currentTick - Current tick number
   */
  private evaluateComponents(state: SimulationState, currentTick: number): void {
    // For MVP: Evaluate all components every tick
    // TODO: Optimize with dirty tracking and topological ordering
    for (const component of this.circuit.components) {
      const behavior = this.behaviorRegistry.get(component.type);

      if (!behavior) {
        continue;
      }

      const result = behavior.evaluate(component, {
        circuit: this.circuit,
        state,
        currentTick
      });

      // Apply component state changes
      if (result.componentState) {
        (state.componentStates as Map<UUID, ComponentState>).set(
          component.id,
          result.componentState
        );
      }

      // Apply output pin state changes
      for (const [pinId, pinState] of result.outputPinStates) {
        (state.nodeStates as Map<UUID, NodeElectricalState>).set(pinId, pinState);
      }

      // Schedule future events
      for (const event of result.scheduledEvents) {
        this.eventQueue.schedule(event);
      }
    }

    // Clear dirty tracker for next tick
    this.dirtyTracker.clear();
  }
}
