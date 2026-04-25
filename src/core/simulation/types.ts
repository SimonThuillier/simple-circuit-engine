/**
 * Simulation type definitions
 * @module core/simulation
 */
import type { UUID } from '../utils';

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
  MAX_TPS: 100,
  /**
   * Default simulation speed in ticks per second
   */
  DEFAULT_TPS: 3,
  /**
   * Default tick interval in milliseconds (1000 / DEFAULT_TPS)
   */
  DEFAULT_INTERVAL_MS: 500,
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

/**
 * User command to be executed during simulation.
 * Commands can be queued for future ticks or executed immediately.
 *
 * @public
 */
export interface IUserCommand {
  /**
   * Type of command.
   *
   * - `toggle_switch`: flip a (double-throw) switch component.
   * - `toggle_input`: flip one switch of a multi-switch input component
   *   (OneInput, TwoInput, FourInput, EightInput); `parameters` MUST carry
   *   `index` identifying which switch was toggled.
   */
  readonly type: 'toggle_switch' | 'toggle_input';
  /**
   * UUID of target component.
   */
  readonly targetId: UUID;
  /**
   * tick when this command was scheduled.
   */
  scheduledAtTick: number;
  /**
   * Extra parameters associated with this command.
   *
   * For `toggle_switch` commands:
   * - `tickCount`: Number of ticks for the switch transition. Computed at toggle time
   *   using the formula: `ceil(transitionUserSpan × simulationSpeed / 1000)` with minimum of 1.
   *   If not provided, behavior uses default transition timing.
   *
   * For `toggle_input` commands:
   * - `index`: index of the toggled switch within the multi-switch component.
   */
  readonly parameters?: Map<string, string> | null;
}

/**
 * all reachable nodes and wires from a seed
 */
export type IReachabilityResult = {
  nodes: Set<UUID>;
  wires: Set<UUID>;
};

/**
 * Configuration options for CircuitRunner
 */
export interface IRunnerOptions {
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

/**
 * Result statistics of one simulation tick run
 */
export interface IRunnerResult {
  startTick: number;

  endTick: number;

  componentUpdateCount: number;

  nodeUpdateCount: number;

  wireUpdateCount: number;

  processedCommandCount: number;

  scheduledEventCount: number;

  firedEventCount: number;
}

/**
 * Scheduled event for delayed component transitions.
 * Events are ordered by readyAtTick in a min-heap priority queue.
 * Events with same readyAtTick are processed in FIFO order (by scheduledAtTick).
 *
 * @public
 */
export interface IScheduledEvent {
  /**
   * UUID of target component.
   */
  readonly targetId: UUID;
  /**
   * Tick when this event was scheduled (for FIFO ordering).
   * @readonly
   */
  readonly scheduledAtTick: number;
  /**
   * Tick when this event should be processed.
   * @readonly
   */
  readonly readyAtTick: number;
  /**
   * Indicates the type of this event, eg 'ClosingEnd', 'OpeningEnd', etc.
   */
  readonly type: string;
  /**
   * extra parameters associated with this event.
   */
  readonly parameters?: Map<string, string> | undefined;
}

/**
 * Dirty elements collected during a tick, returned by getDirtyElements().
 *
 * @public
 */
export interface IDirtyElements {
  /**
   * Components that changed state.
   */
  readonly components: ReadonlySet<UUID>;

  /**
   * Wires that changed electrical state.
   */
  readonly wires: ReadonlySet<UUID>;

  /**
   * ENodes that changed electrical state.
   */
  readonly enodes: ReadonlySet<UUID>;
}
