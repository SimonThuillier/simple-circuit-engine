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

// Event and command types
export type { ScheduledEvent } from './types/ScheduledEvent.js';
export type { UserCommand } from './types/UserCommand.js';

// Constants
export { SIMULATION_SPEED, TRANSITION_DEFAULTS } from './types/SimulationConstants.js';
// Utilities
export { EventQueue } from './EventQueue.js';
export { DirtyTracker } from './DirtyTracker.js';
export type { DirtyElements } from './DirtyTracker.js';
