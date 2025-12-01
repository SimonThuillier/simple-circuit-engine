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
   * extra parameters associated with this event.
   */
  readonly parameters?: Map<string, string> | null;
}
