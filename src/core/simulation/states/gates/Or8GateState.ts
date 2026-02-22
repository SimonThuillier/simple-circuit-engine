/**
 * OR8 Gate component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../types/Identifier';
import { OrGateState } from './OrGateState';

/**
 * Simulation state for OR8 Gate components (8 inputs).
 *
 * @public
 */
export class Or8GateState extends OrGateState {
  constructor(componentId: UUID, initialState: string = 'low') {
    super(componentId, initialState);
  }
}
