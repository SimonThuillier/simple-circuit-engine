/**
 * Simulation Engine Module
 *
 * Provides discrete-time boolean circuit simulation with state propagation,
 * event scheduling, and component behavior management.
 *
 * @module core/simulation
 * @public
 */

export { TRANSITION_DEFAULTS, SIMULATION_SPEED } from './types.js';
export type { IUserCommand, IRunnerOptions, IScheduledEvent, IDirtyElements } from './types.js';

// states and behaviors
export * from './states';
export * from './behaviors';

// Utilities
export { EventQueue } from './EventQueue.js';
export { DirtyTracker } from './DirtyTracker.js';
// State management
export { StateManager } from './StateManager.js';
// Core orchestrator
export { CircuitRunner } from './CircuitRunner.js';
export { getTransitionSpan } from './behaviors/ComponentBehavior';
