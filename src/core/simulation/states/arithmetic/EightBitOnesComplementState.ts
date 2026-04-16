/**
 * 8-Bit One's Complement component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { ArithmeticState } from './ArithmeticState';

/**
 * Simulation state for the 8-bit one's complement (8 parallel XOR gates).
 *
 * Uses a 9-bit encoding stored as a 3-digit hex string (`'000'`..`'1ff'`):
 * - Bits 0–7: output values (`output-i = input-i XOR invert`)
 * - Bit 8: current invert input value (stored for animation)
 *
 * @public
 */
export class EightBitOnesComplementState extends ArithmeticState {
  constructor(componentId: UUID, initialState: string = '000') {
    super(componentId, 9, initialState);
  }

  /** Whether output bit `index` (0–7) is high in the current effective state. */
  isOutputBitHigh(index: number): boolean {
    return this.isOutputHigh(index);
  }

  /** Whether the invert flag (bit 8) is high in the current effective state. */
  isInvertHigh(): boolean {
    return this.isOutputHigh(8);
  }
}
