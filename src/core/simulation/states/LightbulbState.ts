/**
 * Lightbulb component simulation state
 * @module core/simulation/states
 */

import { ComponentState } from './ComponentState.js';
import type { UUID } from '@/core/types/Identifier.js';

/**
 * Simulation state for Lightbulb components.
 * Lightbulbs can be "on" (emitting light) or "off".
 *
 * @public
 */
export class LightbulbState extends ComponentState {
  /**
   * Create a new Lightbulb state.
   *
   * @param componentId - UUID of the Lightbulb component
   * @param initialState - Initial operational state (default: "off")
   */
  constructor(componentId: UUID, initialState: string = 'off') {
    super(componentId, initialState);
  }

  /**
   * Check if Lightbulb is in lit state (on or going_on)
   */
  get isLit(): boolean {
    return this.state === 'on' || this.state === 'goingOn';
  }
}
