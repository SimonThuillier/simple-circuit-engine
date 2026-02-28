/**
 * AND Gate component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../types/Identifier';
import { ComponentState } from '../ComponentState';

/**
 * Simulation state for AND Gate components.
 * Gates can be "low", "rising", "high", or "falling".
 *
 * @public
 */
export class AndGateState extends ComponentState {
  /**
   * Create a new AND Gate state.
   *
   * @param componentId - UUID of the AND Gate component
   * @param initialState - Initial operational state (default: "low")
   */
  constructor(componentId: UUID, initialState: string = 'low') {
    super(componentId, initialState);
  }

  /**
   * Check if output is in a rising or falling transition
   */
  get isInTransition(): boolean {
    return this.state === 'rising' || this.state === 'falling';
  }

  /**
   * Check if output is high
   */
  get isHigh(): boolean {
    return this.state === 'high';
  }
}
