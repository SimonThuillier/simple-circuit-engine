/**
 * Component behavior interface for registry-based extensibility
 * @module core/simulation/behaviors
 */

import type { UUID } from '../../types/Identifier.js';
import type { Component } from '../../Component.js';
import type { ComponentType } from '../../types/ComponentType.js';
import type { ENodeSourceType } from '../../types/ENodeSourceType.js';
import type { NodeElectricalState } from '../states/basic/NodeElectricalState';
import type { ComponentState } from '../states/ComponentState.js';
import type { ScheduledEvent, UserCommand } from '../types';
/**
 * Result returned by component behavior evaluation.
 * Describes state changes and future events to schedule.
 *
 * @public
 */
export interface BehaviorResult {
  /**
   * Updated component state
   */
  readonly componentState: ComponentState;

  /**
   * boolean indicating
   * if the component state has changed (or events scheduled ?)
   */
  hasChanged: boolean;

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
  readonly componentType: ComponentType;

  /**
   * Create initial state for a component instance.
   * Called when simulation is initialized.
   * Initial state may use component satic configuration (e.g., initial switch position).
   *
   * @param component - The component to initialize
   * @returns Initial ComponentState for this component
   */
  createInitialState(component: Component): ComponentState;

  /**
   * Determine if conductivity is allowed between two pins of the component.
   * Called during simulation when evaluating electrical connectivity.
   * @param component
   * @param state current component state
   * @param conductivityType
   * @param pinId
   * @param otherPinId
   */
  allowConductivity(
    component: Component,
    state: ComponentState,
    conductivityType: ENodeSourceType,
    pinId: string,
    otherPinId: string
  ): boolean;

  /**
   * Define component state change in response to its pins state change (after propagateConductivity)
   *
   * @param component - The component being evaluated
   * @param state - component state prior to this evaluation
   * @param nodeStates - Current electrical states of all ENodes in the simulation
   * @param targetTick - target tick
   * @returns Result containing updated state and scheduled events
   */
  onPinsChange(
    component: Component,
    state: ComponentState,
    nodeStates: ReadonlyMap<UUID, NodeElectricalState>,
    targetTick: number
  ): BehaviorResult;

  /**
   * Define component state change in response to a User command being received
   *
   * @param component - The component being evaluated
   * @param state - component state prior to this evaluation
   * @param command - UserCommand to process
   * @returns Result containing updated state and scheduled events
   */
  onUserCommand(component: Component, state: ComponentState, command: UserCommand): BehaviorResult;

  /**
   * Define component state change in response to a ScheduledEvent firing at ready
   *
   * @param component - The component being evaluated
   * @param state - component state prior to this evaluation
   * @param event - firing ScheduledEvent to process
   * @returns Result containing updated state and scheduled events
   */
  onEventFiring(component: Component, state: ComponentState, event: ScheduledEvent): BehaviorResult;
}
