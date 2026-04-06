/**
 * XOR4 Gate component simulation state
 * @module core/simulation/states
 */

import { LogicGateState } from './index';
import type { UUID } from '../../../utils/types';

/**
 * Simulation state for XOR4 Gate components (4 inputs).
 *
 * @public
 */
export class Xor4GateState extends LogicGateState {
  constructor(componentId: UUID, initialState: string = 'low') {
    super(componentId, initialState);
  }
}
