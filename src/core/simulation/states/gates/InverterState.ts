/**
 * Inverter component simulation state
 * @module core/simulation/states
 */

import { LogicGateState } from './index';
import type { UUID } from '../../../utils/types';

/**
 * Simulation state for Inverter components
 * Inverters can be "low", "rising", "high", or "falling".
 *
 * @public
 */
export class InverterState extends LogicGateState {
  /**
   * Create a new Inverter state.
   *
   * @param componentId - UUID of the Inverter component
   * @param initialState - Initial operational state (default: "low")
   */
  constructor(componentId: UUID, initialState: string = 'low') {
    super(componentId, initialState);
  }
}
