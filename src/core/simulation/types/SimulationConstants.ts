/**
 * Simulation speed and timing constants
 * @module core/simulation/types
 */

/**
 * Simulation speed bounds and defaults for ticks per second (TPS).
 * @public
 */
export const SIMULATION_SPEED = {
  /**
   * Minimum simulation speed in ticks per second
   */
  MIN_TPS: 1,

  /**
   * Maximum simulation speed in ticks per second
   */
  MAX_TPS: 20,

  /**
   * Default simulation speed in ticks per second
   */
  DEFAULT_TPS: 2,

  /**
   * Default tick interval in milliseconds (1000 / DEFAULT_TPS)
   */
  DEFAULT_INTERVAL_MS: 200,
} as const;

/**
 * Default transition timing values for components.
 * @public
 */
export const TRANSITION_DEFAULTS = {
  /**
   * Default transitionSpan for relays and transistors in ticks (instant transition)
   */
  TRANSITION_SPAN_TICKS: 1,

  /**
   * Default transitionUserSpan for switches in milliseconds
   */
  TRANSITION_USER_SPAN_MS: 200,
} as const;
