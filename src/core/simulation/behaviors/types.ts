/**
 * Component behavior types
 * @module core/simulation/behaviors
 */

import type {UUID} from "../../utils";
import {ComponentType, ENodeSourceType, type Component} from "../../topology";
import {ComponentState, type INodeElectricalState} from "../states";
import type {IScheduledEvent, IUserCommand} from "../types";

/**
 * Result returned by component behavior evaluation.
 * Describes state changes and future events to schedule.
 *
 * @public
 */
export interface IBehaviorResult {
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
     * boolean indicating that all pending events on this component should be cancelled
     * (example change of input during the rising/falling state of a gate)
     */
    shouldCancelPending: boolean;
    /**
     * Events to schedule for future ticks (e.g., delayed transitions).
     */
    readonly scheduledEvents: ReadonlyArray<IScheduledEvent>;
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
export interface IComponentBehavior {
    /**
     * Component type this behavior handles (e.g., "battery", "led", "switch").
     * Used as the key in BehaviorRegistry.
     */
    componentType: ComponentType;
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
     * Define custom component behavior at simulation start
     * For most components it's a no-op but some components to bootstrap their cycling
     * Warning: if this methods return non null behavior it preempts normal initialization at tick 0
     * @param component
     * @param componentState
     */
    onStart(
        component: Component,
        componentState: ComponentState,
    ): IBehaviorResult | null
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
        nodeStates: ReadonlyMap<UUID, INodeElectricalState>,
        targetTick: number
    ): IBehaviorResult;
    /**
     * Define component state change in response to a User command being received
     *
     * @param component - The component being evaluated
     * @param state - component state prior to this evaluation
     * @param command - IUserCommand to process
     * @returns Result containing updated state and scheduled events
     */
    onUserCommand(component: Component, state: ComponentState, command: IUserCommand): IBehaviorResult;
    /**
     * Define component state change in response to a IScheduledEvent firing at ready
     *
     * @param component - The component being evaluated
     * @param state - component state prior to this evaluation
     * @param event - firing IScheduledEvent to process
     * @returns Result containing updated state and scheduled events
     */
    onEventFiring(component: Component, state: ComponentState, event: IScheduledEvent): IBehaviorResult;
}