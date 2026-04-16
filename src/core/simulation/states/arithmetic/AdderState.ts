/**
 * Full Adder component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { ArithmeticState } from './ArithmeticState';

/**
 * Simulation state for Full Adder components.
 *
 * Hex-encoded stable states: `'0'` (both low), `'1'` (sum high),
 * `'2'` (carry high), `'3'` (both high). All four are reachable;
 * in particular `A = B = carryIn = 1` yields `'3'`.
 *
 * @public
 */
export class AdderState extends ArithmeticState {
  constructor(componentId: UUID, initialState: string = '0') {
    super(componentId, 2, initialState);
  }

  get sumHigh(): boolean {
    return this.isOutputHigh(0);
  }

  get carryOutHigh(): boolean {
    return this.isOutputHigh(1);
  }
}
