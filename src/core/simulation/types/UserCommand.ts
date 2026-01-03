/**
 * Represents user interaction that modifies circuit behavior during simulation
 * @module core/simulation/types
 */

import type { UUID } from '@/core/types/Identifier.js';

/**
 * User command to be executed during simulation.
 * Commands can be queued for future ticks or executed immediately.
 *
 * @public
 */
export interface UserCommand {
  /**
   * Type of command.
   */
  readonly type: 'toggle_switch';

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
   */
  readonly parameters?: Map<string, string> | null;
}
