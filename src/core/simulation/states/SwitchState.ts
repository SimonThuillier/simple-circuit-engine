/**
 * Switch component simulation state
 * @module core/simulation/states
 */

import { ComponentState } from './ComponentState.js';
import type { UUID } from '@/core/types/Identifier.js';

/**
 * Simulation state for LED components.
 * Switches can be "open", "closing", "closed", or "opening".
 *
 * @public
 */
export class SwitchState extends ComponentState {
  /**
   * Create a new Switch state.
   *
   * @param componentId - UUID of the LED component
   * @param initialState - Initial operational state (default: "open")
   */
  constructor(componentId: UUID, initialState: string = 'open') {
    super(componentId, initialState);
  }

  /**
   * Check if switch is in opening or closing state
   */
  get isInTransition(): boolean {
    return this.state === 'closing' || this.state === 'opening';
  }

  /**
   * Check if switch is in closed or closing state
   */
  get isClosed(): boolean {
    return this.state === 'closed' || this.state === 'closing';
  }
}
