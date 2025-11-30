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
  readonly commandType: 'toggle_switch' | 'set_component_state' | 'modify_config';

  /**
   * UUID of target component.
   */
  readonly targetComponentId: UUID;

  /**
   * Command-specific parameters.
   * - For toggle_switch: undefined (no params)
   * - For set_component_state: { state: string }
   * - For modify_config: { key: string, value: string }
   */
  readonly params?: Record<string, unknown>;

  /**
   * Optional tick when command should be applied.
   * If null, applies at next tick (most common case).
   */
  readonly tick: number | null;
}
