/**
 * Transistor component simulation state
 * @module core/simulation/states
 */

import { ComponentState } from './ComponentState.js';
import type { UUID } from '@/core/types/Identifier.js';

/**
 * Simulation state for Transistor components (NPN open if no base voltage).
 * Transistors can be "open", "closing", "closed", or "opening".
 *
 * @public
 */
export class TransistorState extends ComponentState {
  /**
   * Create a new Transistor state.
   *
   * @param componentId - UUID of the Transistor component
   * @param initialState - Initial operational state (default: "open")
   */
  constructor(componentId: UUID, initialState: string = 'open') {
    super(componentId, initialState);
  }

  /**
   * Check if transistor is in opening or closing state
   */
  get isInTransition(): boolean {
    return this.state === 'closing' || this.state === 'opening';
  }

  /**
   * Check if transistor is in closed or closing state
   */
  get isClosed(): boolean {
    return this.state === 'closed' || this.state === 'closing';
  }
}
