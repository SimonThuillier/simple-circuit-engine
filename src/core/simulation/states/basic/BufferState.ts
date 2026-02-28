/**
 * Buffer component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../types/Identifier';
import { ComponentState } from '../ComponentState';

/**
 * Simulation state for Buffer components
 * Buffers can be "low", "rising", "high", or "falling".
 *
 * @public
 */
export class BufferState extends ComponentState {
  /**
   * Create a new Buffer state.
   *
   * @param componentId - UUID of the Buffer component
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
