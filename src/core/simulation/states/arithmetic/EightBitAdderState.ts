/**
 * 8-Bit Ripple Carry Adder component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { ArithmeticState } from './ArithmeticState';

/**
 * Simulation state for the 8-bit ripple carry adder.
 *
 * Uses an interleaved 16-bit encoding `C7S7 C6S6 … C1S1 C0S0` where each
 * stage occupies two bits: sum at even position (`2*i`) and carry at odd
 * position (`2*i + 1`). This stores intermediate carries so the ripple
 * animation can show carry propagation stage by stage.
 *
 * Stable states range from `'0000'` (all low) to `'ffff'` (all high).
 * The external outputs are `sum-0`..`sum-7` (bits 0,2,4,…,14) and
 * `carryOut` (bit 15 = C7).
 *
 * @public
 */
export class EightBitAdderState extends ArithmeticState {
  constructor(componentId: UUID, initialState: string = '0000') {
    super(componentId, 16, initialState);
  }

  /** Whether stage `i`'s sum output is high in the current effective state. */
  isSumHigh(stageIndex: number): boolean {
    return this.isOutputHigh(2 * stageIndex);
  }

  /** Whether stage `i`'s internal carry is high in the current effective state. */
  isStageCarryHigh(stageIndex: number): boolean {
    return this.isOutputHigh(2 * stageIndex + 1);
  }

  /** Whether the final carry out (C7) is high — drives the `carryOut` pin. */
  isCarryOutHigh(): boolean {
    return this.isStageCarryHigh(7);
  }
}
