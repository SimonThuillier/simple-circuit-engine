/**
 * Simulation Speed Control & Component Transition Timing - TypeScript Contracts
 * Feature: 017-simulation-speed
 *
 * These interfaces define the API contracts for the simulation speed feature.
 * They extend existing interfaces where applicable.
 */

// =============================================================================
// CONFIGURATION CONTRACTS
// =============================================================================

/**
 * Configuration parameters for relay and transistor components.
 * Added to Component.config Map with string values.
 */
export interface TransitionSpanConfig {
  /**
   * Number of simulation ticks required for state transition.
   * Stored as string in config Map, parsed to integer in behaviors.
   * @default "1" (instant transition)
   * @minimum 1
   */
  transitionSpan: string;
}

/**
 * Configuration parameters for switch components.
 * Added to Component.config Map with string values.
 */
export interface TransitionUserSpanConfig {
  /**
   * Duration in milliseconds for user-perceived transition time.
   * Actual tick count computed at toggle time based on simulation speed.
   * Stored as string in config Map, parsed to integer in behaviors.
   * @default "200"
   * @minimum 0
   */
  transitionUserSpan: string;
}

// =============================================================================
// COMMAND CONTRACTS
// =============================================================================

/**
 * Parameters passed with toggle_switch UserCommand.
 * Values stored as strings in the parameters Map.
 */
export interface ToggleSwitchCommandParams {
  /**
   * Number of ticks for this specific toggle transition.
   * Computed at toggle submission time: ceil(transitionUserSpan × simulationSpeed / 1000)
   * @minimum 1
   */
  tickCount: string;
}

// =============================================================================
// CONTROLLER CONTRACTS
// =============================================================================

/**
 * Extended interface for CircuitRunnerController simulation speed control.
 * These methods/properties are added to the existing controller.
 */
export interface SimulationSpeedControl {
  /**
   * Current simulation speed in ticks per second.
   * @range 1-20
   */
  simulationSpeed: number;

  /**
   * Minimum allowed simulation speed (ticks per second).
   */
  readonly minSimulationSpeed: number;

  /**
   * Maximum allowed simulation speed (ticks per second).
   */
  readonly maxSimulationSpeed: number;
}

/**
 * Constants for simulation speed bounds.
 */
export const SIMULATION_SPEED_BOUNDS = {
  MIN_TPS: 1,
  MAX_TPS: 20,
  DEFAULT_TPS: 5,
  MIN_INTERVAL_MS: 50, // 20 TPS
  MAX_INTERVAL_MS: 1000, // 1 TPS
  DEFAULT_INTERVAL_MS: 200, // 5 TPS
} as const;

// =============================================================================
// ENGINE FACADE CONTRACTS
// =============================================================================

/**
 * Extended interface for CircuitEngine facade.
 * These methods/properties are added to the existing engine.
 */
export interface CircuitEngineSpeedControl {
  /**
   * Get or set simulation speed in ticks per second.
   * Delegates to CircuitRunnerController.
   * @range 1-20
   */
  simulationSpeed: number;
}

// =============================================================================
// EVENT CONTRACTS
// =============================================================================

/**
 * Event emitted when simulation speed changes.
 */
export interface SimulationSpeedChangedEvent {
  /**
   * Event type identifier.
   */
  type: 'simulationSpeedChanged';

  /**
   * Previous speed in ticks per second.
   */
  previousSpeed: number;

  /**
   * New speed in ticks per second.
   */
  newSpeed: number;
}

// =============================================================================
// BEHAVIOR CONTRACTS
// =============================================================================

/**
 * Contract for transition-aware behaviors (Relay, Transistor).
 * These behaviors read transitionSpan from component config.
 */
export interface TransitionAwareBehavior {
  /**
   * Get the transition span for a component in ticks.
   * @param component - The component to get transition span for
   * @returns Number of ticks for transition (minimum 1)
   */
  getTransitionSpan(component: { config: Map<string, string> }): number;
}

/**
 * Contract for speed-adaptive behaviors (Switch).
 * These behaviors compute tick count from transitionUserSpan and current speed.
 */
export interface SpeedAdaptiveBehavior {
  /**
   * Compute tick count for a switch toggle based on config and current speed.
   * @param transitionUserSpanMs - Configured transition duration in milliseconds
   * @param simulationSpeedTps - Current simulation speed in ticks per second
   * @returns Number of ticks for transition (minimum 1)
   */
  computeTickCount(transitionUserSpanMs: number, simulationSpeedTps: number): number;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

/**
 * Default configuration values for this feature.
 */
export const TRANSITION_DEFAULTS = {
  /**
   * Default transitionSpan for relays and transistors (instant).
   */
  TRANSITION_SPAN_TICKS: 1,

  /**
   * Default transitionUserSpan for switches in milliseconds.
   */
  TRANSITION_USER_SPAN_MS: 200,
} as const;
