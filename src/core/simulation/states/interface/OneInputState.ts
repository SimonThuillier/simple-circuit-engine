/**
 * OneInput component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { InputState } from './InputState';

/** Single-switch user input. Stable states `'0'` and `'1'`. */
export class OneInputState extends InputState {
  constructor(componentId: UUID, initialState: string = '0') {
    super(componentId, 1, initialState);
  }
}
