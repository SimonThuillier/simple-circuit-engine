/**
 * Component behavior interface for registry-based extensibility
 * @module core/simulation/behaviors
 */

import type { Circuit } from '@/core/Circuit.js';
import type { Component } from '@/core/Component.js';
import type { ComponentState } from '../states/ComponentState.js';
import type { SimulationState } from '../SimulationState.js';
import type { ScheduledEvent } from '../types/ScheduledEvent.js';

/**
 * Context object passed to component behaviors during simulation.
 * Provides access to circuit topology and current simulation state.
 *
 * @public
 */
export interface BehaviorContext {
  /**
   * The complete circuit topology (immutable during simulation).
   */
  readonly circuit: Circuit;

  /**
   * Current simulation state (tick, electrical states, component states).
   */
  readonly state: SimulationState;

  /**
   * Current simulation tick number.
   */
  readonly currentTick: number;
}

/**
 * Result returned by component behavior evaluation.
 * Describes state changes and future events to schedule.
 *
 * @public
 */
export interface BehaviorResult {
  /**
   * Updated component state (null if no change).
   */
  readonly componentState: ComponentState | null;

  /**
   * Electrical states for output pins (key: pin UUID).
   * Only include pins that changed state.
   */
  readonly outputPinStates: ReadonlyMap<string, { hasVoltage: boolean; hasCurrent: boolean }>;

  /**
   * Events to schedule for future ticks (e.g., delayed transitions).
   */
  readonly scheduledEvents: ReadonlyArray<ScheduledEvent>;
}

/**
 * Component behavior interface for registry-based extensibility.
 * Each component type (Battery, LED, Switch, etc.) implements this interface.
 *
 * Behaviors are stateless - all state is stored in ComponentState and SimulationState.
 * The behavior's job is to compute new states based on current inputs and component state.
 *
 * @public
 */
export interface ComponentBehavior {
  /**
   * Component type this behavior handles (e.g., "battery", "led", "switch").
   * Used as the key in BehaviorRegistry.
   */
  readonly componentType: string;

  /**
   * Evaluate component behavior for current tick.
   * Called when:
   * - Component's input pins changed state (dirty tracking)
   * - Scheduled event for this component fired
   * - User command targeted this component
   *
   * @param component - The component being evaluated
   * @param context - Simulation context (circuit, state, tick)
   * @returns Result containing new states and scheduled events
   */
  evaluate(component: Component, context: BehaviorContext): BehaviorResult;

  /**
   * Create initial state for a new component instance.
   * Called when simulation is initialized.
   *
   * @param component - The component to initialize
   * @returns Initial ComponentState for this component
   */
  createInitialState(component: Component): ComponentState;
}
