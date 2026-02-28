/**
 * AND8 Gate component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../types/Identifier';
import { AndGateState } from './AndGateState';

/**
 * Simulation state for AND8 Gate components (8 inputs).
 *
 * @public
 */
export class And8GateState extends AndGateState {
  constructor(componentId: UUID, initialState: string = 'low') {
    super(componentId, initialState);
  }
}
