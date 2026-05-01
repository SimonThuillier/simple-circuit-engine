/**
 * Abstract base state for interface light components
 * @module core/simulation/states
 */

import type { UUID } from '../../../utils/types';
import { ComponentState } from '../ComponentState';

/**
 * Base simulation state for input-driven multi-light components (OneLight,
 * TwoLight, FourLight, EightLight).
 *
 * Stable states are encoded as a zero-padded hexadecimal string where each
 * bit position maps to one logic output (bit `i` ↔ `output-i`). Outputs
 * mirror their corresponding `input-i` after `transitionSpan` ticks so the
 * component can be cascaded.
 *
 * While at least one light is moving, the state value is the literal
 * `'moving'` and the `parameters` map carries:
 * - `prevState`: the stable hex value the outputs are still energizing
 * - one entry per pending light keyed by its index, encoded as
 *   `${target}-${startTick}-${endTick}` (target ∈ {0,1}).
 *
 * A special `'indeterminate'` state is used when any logic input is
 * ill-defined (set immediately by the non-logic-input guard).
 *
 * @public
 */
export abstract class LightState extends ComponentState {
  /** Number of lights / logic outputs (1, 2, 4 or 8). */
  public readonly lightCount: number;

  /** Number of hex digits needed to encode all outputs. */
  public readonly hexDigitCount: number;

  /** All-outputs-low state string (e.g. `'0'` for 1–4 lights, `'00'` for 8). */
  public readonly allLowState: string;

  protected constructor(componentId: UUID, lightCount: number, initialState: string) {
    super(componentId, initialState);
    this.lightCount = lightCount;
    this.hexDigitCount = Math.ceil(lightCount / 4);
    this.allLowState = '0'.repeat(this.hexDigitCount);
  }

  /** True while at least one light is mid-transition. */
  get isInTransition(): boolean {
    return this.state === 'moving';
  }

  /**
   * Stable state that effectively drives the outputs right now:
   * - stable hex state → returns that state
   * - `'moving'` → returns the previous stable kept in `parameters.prevState`
   * - `'indeterminate'` → returns `'indeterminate'`
   */
  get effectiveState(): string {
    if (!this.isInTransition) return this.state;
    return this.parameters.get('prevState') ?? this.allLowState;
  }

  /**
   * Whether output `index` is high in the current effective state.
   * Returns `false` when effective state is `'indeterminate'`.
   */
  isOutputHigh(index: number): boolean {
    const effective = this.effectiveState;
    if (effective === 'indeterminate') return false;
    return ((parseInt(effective, 16) >> index) & 1) === 1;
  }

  /**
   * Pending move descriptor for light `index`, parsed from the parameter map,
   * or `null` when no transition is in flight for that light.
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
    return { target: target === 1 ? 1 : 0, startTick, endTick };
  }
}
