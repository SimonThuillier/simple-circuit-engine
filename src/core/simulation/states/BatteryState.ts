/**
 * Battery component simulation state
 * @module core/simulation/states
 */

import { ComponentState } from './ComponentState.js';
import type { UUID } from '@/core/types/Identifier.js';

/**
 * Simulation state for Battery components.
 * Batteries are always-on voltage sources.
 *
 * @public
 */
export class BatteryState extends ComponentState {
  /**
   * Voltage level in volts (for display/metadata).
   * Not used in boolean simulation logic.
   * @readonly
   */
  readonly voltage: number;

  /**
   * Create a new battery state.
   *
   * @param componentId - UUID of the battery component
   * @param voltage - Voltage level (default: 9V)
   */
  constructor(componentId: UUID, voltage: number = 9) {
    super(componentId, 'on');
    this.voltage = voltage;
  }
}
