/**
 * EightLight component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { LightState } from './LightState';

/** Eight-light input mirror. Stable states `'00'`–`'ff'`. */
export class EightLightState extends LightState {
  constructor(componentId: UUID, initialState: string = '00') {
    super(componentId, 8, initialState);
  }
}
