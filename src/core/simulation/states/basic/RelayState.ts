/**
 * Relay component simulation state
 * @module core/simulation/states
 */

import { ComponentState } from '../ComponentState';

import type {UUID} from "../../../utils/types";

/**
 * Simulation state for mechanical Relay components.
 * Relays can be "open", "closing", "closed", or "opening".
 *
 * @public
 */
export class RelayState extends ComponentState {
  /**
   * Create a new Relay state.
   *
   * @param componentId - UUID of the Relay component
   * @param initialState - Initial operational state (default: "open")
   */
  constructor(componentId: UUID, initialState: string = 'open') {
    super(componentId, initialState);
  }

  /**
   * Check if relay is in opening or closing state
   */
  get isInTransition(): boolean {
    return this.state === 'closing' || this.state === 'opening';
  }

  /**
   * Check if relay is in closed or closing state
   */
  get isClosed(): boolean {
    return this.state === 'closed' || this.state === 'closing';
  }
}
