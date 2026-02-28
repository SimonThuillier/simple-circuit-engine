/**
 * AND4 Gate component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../types/Identifier';
import { AndGateState } from './AndGateState';

/**
 * Simulation state for AND4 Gate components (4 inputs).
 *
 * @public
 */
export class And4GateState extends AndGateState {
  constructor(componentId: UUID, initialState: string = 'low') {
    super(componentId, initialState);
  }
}
