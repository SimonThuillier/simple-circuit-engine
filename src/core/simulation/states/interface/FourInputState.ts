/**
 * FourInput component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { InputState } from './InputState';

/** Four-switch user input. Stable states `'0'`..`'f'`. */
export class FourInputState extends InputState {
  constructor(componentId: UUID, initialState: string = '0') {
    super(componentId, 4, initialState);
  }
}
