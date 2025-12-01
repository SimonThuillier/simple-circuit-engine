/**
 * Simulation Engine Module
 *
 * Provides discrete-time boolean circuit simulation with state propagation,
 * event scheduling, and component behavior management.
 *
 * @module core/simulation
 * @public
 */

// Core orchestrator
export { CircuitRunner } from './CircuitRunner.js';

// Configuration and state
export type { RunnerOptions } from './types/RunnerOptions.js';
export type { RunnerResult } from './types/RunnerResult.js';
export { SimulationState } from './SimulationState.js';
export { StateManager } from './StateManager.js';

// State types
export type { NodeElectricalState } from './states/NodeElectricalState.js';
export { ComponentState } from './states/ComponentState.js';
export { BatteryState } from './states/BatteryState.js';
export { SmallLEDState } from './states/SmallLEDState';

// Component behaviors
export type {
  ComponentBehavior,
  BehaviorResult,
} from './behaviors/ComponentBehavior.js';
export { BehaviorRegistry } from './behaviors/BehaviorRegistry.js';
export { BatteryBehavior } from './behaviors/BatteryBehavior.js';
export { SmallLEDBehavior } from './behaviors/SmallLEDBehavior';

// Event and command types
export type { ScheduledEvent } from './types/ScheduledEvent.js';
export type { UserCommand } from './types/UserCommand.js';

// Utilities
export { EventQueue } from './EventQueue.js';
export { DirtyTracker } from './DirtyTracker.js';
