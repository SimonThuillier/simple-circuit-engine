/**
 * LED component simulation state
 * @module core/simulation/states
 */

import { ComponentState } from './ComponentState.js';
import type { UUID } from '@/core/types/Identifier.js';

/**
 * Simulation state for LED components.
 * LEDs can be "on" (emitting light) or "off".
 *
 * @public
 */
export class LEDState extends ComponentState {
  /**
   * LED color (for display purposes).
   * @readonly
   */
  readonly color: string;

  /**
   * Create a new LED state.
   *
   * @param componentId - UUID of the LED component
   * @param color - LED color (default: "red")
   * @param initialState - Initial operational state (default: "off")
   */
  constructor(componentId: UUID, color: string = 'red', initialState: string = 'off') {
    super(componentId, initialState);
    this.color = color;
  }
}
