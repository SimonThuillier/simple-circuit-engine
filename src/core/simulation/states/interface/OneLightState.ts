/**
 * OneLight component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { LightState } from './LightState';

/** Single-light input mirror. Stable states `'0'` and `'1'`. */
export class OneLightState extends LightState {
  constructor(componentId: UUID, initialState: string = '0') {
    super(componentId, 1, initialState);
  }
}
