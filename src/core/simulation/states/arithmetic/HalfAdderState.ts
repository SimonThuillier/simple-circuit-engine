/**
 * Half Adder component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { ArithmeticState } from './ArithmeticState';

/**
 * Simulation state for Half Adder components.
 *
 * Hex-encoded stable states: `'0'` (both low), `'1'` (sum high),
 * `'2'` (carry high). `'3'` is unreachable because `sum = A XOR B`
 * and `carry = A AND B` can never both be true.
 *
 * @public
 */
export class HalfAdderState extends ArithmeticState {
  constructor(componentId: UUID, initialState: string = '0') {
    super(componentId, 2, initialState);
  }

  get sumHigh(): boolean {
    return this.isOutputHigh(0);
  }

  get carryHigh(): boolean {
    return this.isOutputHigh(1);
  }
}
