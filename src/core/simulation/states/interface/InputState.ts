/**
 * Abstract base state for interface input components
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { ComponentState } from '../ComponentState';

/**
 * Base simulation state for user-controlled input components (OneInput,
 * TwoInput, FourInput, EightInput).
 *
 * Stable states are encoded as a zero-padded hexadecimal string where each
 * bit position maps to one logic output (bit `i` ↔ `output-i`).
 *
 * While at least one switch is moving, the state value is the literal
 * `'moving'` and the `parameters` map carries:
 * - `prevState`: the stable hex value the outputs are still energizing
 * - one entry per pending switch keyed by its index, encoded as
 *   `${target}-${startTick}-${endTick}` (target ∈ {0,1}).
 *
 * @public
 */
export abstract class InputState extends ComponentState {
  /** Number of logic outputs (1, 2, 4 or 8). */
  public readonly outputCount: number;

  /** Number of hex digits needed to encode all outputs. */
  public readonly hexDigitCount: number;

  /** All-outputs-low state string (e.g. `'0'` for 1–4 outputs, `'00'` for 8). */
  public readonly allLowState: string;

  protected constructor(componentId: UUID, outputCount: number, initialState: string) {
    super(componentId, initialState);
    this.outputCount = outputCount;
    this.hexDigitCount = Math.ceil(outputCount / 4);
    this.allLowState = '0'.repeat(this.hexDigitCount);
  }

  /** True while at least one switch is mid-transition. */
  get isInTransition(): boolean {
    return this.state === 'moving';
  }

  /**
   * Stable state that effectively drives the outputs right now:
   * - stable state → returns that state
   * - `'moving'` → returns the previous stable kept in `parameters.prevState`
   */
  get effectiveState(): string {
    if (!this.isInTransition) return this.state;
    return this.parameters.get('prevState') ?? this.allLowState;
  }

  /** Whether output `index` is high in the current effective state. */
  isOutputHigh(index: number): boolean {
    const effective = this.effectiveState;
    return ((parseInt(effective, 16) >> index) & 1) === 1;
  }

  /**
   * Pending move descriptor for switch `index`, parsed from the parameter map,
   * or `null` when no transition is in flight for that switch.
   */
  getPendingMove(index: number): { target: 0 | 1; startTick: number; endTick: number } | null {
    const raw = this.parameters.get(String(index));
    if (!raw) return null;
    const parts = raw.split('-');
    if (parts.length !== 3) return null;
    const target = parseInt(parts[0]!, 10);
    const startTick = parseInt(parts[1]!, 10);
    const endTick = parseInt(parts[2]!, 10);
    if (isNaN(target) || isNaN(startTick) || isNaN(endTick)) return null;
    return { target: (target === 1 ? 1 : 0), startTick, endTick };
  }
}
