/**
 * EightInput component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { InputState } from './InputState';

/** Eight-switch user input. Stable states `'00'`..`'ff'`. */
export class EightInputState extends InputState {
  constructor(componentId: UUID, initialState: string = '00') {
    super(componentId, 8, initialState);
  }
}
