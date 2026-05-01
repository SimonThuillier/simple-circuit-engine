/**
 * TwoLight component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { LightState } from './LightState';

/** Two-light input mirror. Stable states `'0'`–`'3'`. */
export class TwoLightState extends LightState {
  constructor(componentId: UUID, initialState: string = '0') {
    super(componentId, 2, initialState);
  }
}
