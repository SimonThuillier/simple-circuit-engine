/**
 * Abstract base state for arithmetic components
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { ComponentState } from '../ComponentState';

/**
 * Base simulation state for arithmetic components (half adder, full adder and
 * future multi-bit adders, multiplexers, ...).
 *
 * Stable states are encoded as a zero-padded hexadecimal string where each
 * bit position maps to one logic output. Simple components use one bit per
 * output in declaration order (bit 0 = first logicOutput). For example a
 * half-adder with sum (bit 0) and carry (bit 1) uses `'0'`..`'3'`.
 *
 * Components with internal carry chains (e.g. 8-bit ripple adder) use an
 * **interleaved** encoding `CiSi` where sum occupies even bits (`2*i`) and
 * carry occupies odd bits (`2*i + 1`). This stores intermediate carries for
 * ripple animation, giving `outputCount = 2 * stageCount` (e.g. 16 bits /
 * 4 hex digits for 8 stages, states `'0000'`..`'ffff'`).
 *
 * Transient (in-flight) states follow the `to${nextState}` convention so
 * animations can be driven generically from `state`/`nextState`. The
 * previously-held stable state is preserved in `parameters.prevState` so the
 * behavior's `allowConductivity` keeps the old outputs energized until the
 * transition fires.
 *
 * A special `'indeterminate'` state is used when any logic input is ill-defined.
 *
 * @public
 */
export abstract class ArithmeticState extends ComponentState {
  /**
   * Number of logic outputs for this state
   * (e.g. 2 for half/full adder, 9 for an 8-bit adder: 8 sum bits + carry out).
   */
  public readonly outputCount: number;

  /** Number of hex digits needed to encode all outputs. */
  public readonly hexDigitCount: number;

  /** All-outputs-low state string (e.g. `'0'` for 2 outputs, `'000'` for 9). */
  public readonly allLowState: string;

  protected constructor(componentId: UUID, outputCount: number, initialState: string) {
    super(componentId, initialState);
    this.outputCount = outputCount;
    this.hexDigitCount = Math.ceil(outputCount / 4);
    this.allLowState = '0'.repeat(this.hexDigitCount);
  }

  /** True when the current state is a transient `to${stable}` transition. */
  get isInTransition(): boolean {
    return this.state.startsWith('to');
  }

  /**
   * Stable state that effectively drives the outputs right now:
   * - stable state → returns that state
   * - transient `to<hex>` → returns the previous stable kept in parameters
   * - `'indeterminate'` → returns `'indeterminate'`
   */
  get effectiveState(): string {
    if (!this.isInTransition) return this.state;
    return this.parameters.get('prevState') ?? this.allLowState;
  }

  /**
   * Whether the `index`-th output is high in the current effective state.
   * Returns `false` when effective state is `'indeterminate'`.
   */
  isOutputHigh(index: number): boolean {
    const effective = this.effectiveState;
    if (effective === 'indeterminate') return false;
    return ((parseInt(effective, 16) >> index) & 1) === 1;
  }
}
