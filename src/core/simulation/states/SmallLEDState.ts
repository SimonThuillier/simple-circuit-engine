/**
 * LED component simulation state
 * @module core/simulation/states
 */

import { ComponentState } from './ComponentState.js';
import type { UUID } from '@/core/types/Identifier.js';

/**
 * Simulation state for SmallLED components.
 * LEDs can be "on" (emitting light) or "off".
 *
 * @public
 */
export class SmallLEDState extends ComponentState {
  /**
   * Create a new SmallLED state.
   *
   * @param componentId - UUID of the LED component
   * @param initialState - Initial operational state (default: "off")
   */
  constructor(componentId: UUID, initialState: string = 'off') {
    super(componentId, initialState);
  }

  /**
   * Check if LED is in lit state (on or going_on)
   */
  get isLit(): boolean {
    return this.state === 'on' || this.state === 'going_on';
  }
}
