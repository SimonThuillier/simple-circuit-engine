/**
 * TwoInput component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { InputState } from './InputState';

/** Two-switch user input. Stable states `'0'`..`'3'`. */
export class TwoInputState extends InputState {
  constructor(componentId: UUID, initialState: string = '0') {
    super(componentId, 2, initialState);
  }
}
