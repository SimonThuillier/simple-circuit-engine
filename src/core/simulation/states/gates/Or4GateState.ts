/**
 * OR4 Gate component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../types/Identifier';
import { OrGateState } from './OrGateState';

/**
 * Simulation state for OR4 Gate components (4 inputs).
 *
 * @public
 */
export class Or4GateState extends OrGateState {
  constructor(componentId: UUID, initialState: string = 'low') {
    super(componentId, initialState);
  }
}
