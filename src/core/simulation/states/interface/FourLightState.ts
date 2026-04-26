/**
 * FourLight component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { LightState } from './LightState';

/** Four-light input mirror. Stable states `'0'`–`'f'`. */
export class FourLightState extends LightState {
  constructor(componentId: UUID, initialState: string = '0') {
    super(componentId, 4, initialState);
  }
}
