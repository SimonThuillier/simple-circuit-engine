/**
 * Configuration options for CircuitRunner
 * @module core/simulation/types
 */

export interface RunnerOptions {
  /**
   * Enable historical state tracking.
   * When true, past simulation states are preserved up to historyLimit.
   * When false (default), only current state is retained for better performance.
   * @default false
   */
  enableHistory?: boolean;

  /**
   * Maximum number of historical states to retain when enableHistory is true.
   * Uses circular buffer—oldest states are overwritten when limit is reached.
   * Must be a positive integer.
   * @default 1000
   */
  historyLimit?: number;
}
