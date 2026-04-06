/**
 * Logic gates components simulation state
 * @module core/simulation/states
 */

import { ComponentState } from '../ComponentState';
import type { UUID } from '../../../utils/types';

/**
 * Simulation state for Logic gates components
 * Gates can be "low", "rising", "high", "falling" or "indeterminate" (if their input is not well-defined)
 *
 * @public
 */
export abstract class LogicGateState extends ComponentState {
  /**
   * Create a new Inverter state.
   *
   * @param componentId - UUID of the Inverter component
   * @param initialState - Initial operational state (default: "low")
   */
  protected constructor(componentId: UUID, initialState: string = 'low') {
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
