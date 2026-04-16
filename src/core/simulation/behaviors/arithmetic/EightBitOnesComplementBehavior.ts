/**
 * 8-Bit One's Complement component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { INodeElectricalState } from '../../states/types';
import type { IComponentBehavior } from '../types';
import { ComponentType, ENodeSourceType, type IPinMetadata } from '../../../topology/types';
import { EightBitOnesComplementState } from '../../states/arithmetic/EightBitOnesComplementState';
import { ArithmeticBehaviorMixin } from './ArithmeticBehaviorMixin';
import { ArithmeticState } from '../../states/arithmetic/ArithmeticState';

/** Number of data bits (XOR gates) in the one's complement. */
const BIT_COUNT = 8;

/**
 * Behavior for the 8-bit one's complement (8 parallel XOR gates with shared
 * `invert` input).
 *
 * When `invert` is high every output is the bitwise NOT of its input; when low
 * outputs pass through unchanged. All 8 gates fire in parallel — a single
 * `transitionSpan` covers the whole transition (no ripple).
 *
 * State encoding: 9 bits as a 3-hex-char string. Bits 0–7 are outputs,
 * bit 8 is the invert flag. See {@link EightBitOnesComplementState}.
 *
 * The mixin's default `onPinsChange` / `onEventFiring` / `scheduleTransition`
 * handle everything — only `computeTargetStableState` and
 * `allowConductivity` need implementation.
 *
 * @public
 */
export class EightBitOnesComplementBehavior extends ArithmeticBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.EightBitOnesComplement);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for EightBitOnesComplementBehavior: ${component.type}`);
    }
    return new EightBitOnesComplementState(component.id, '000');
  }

  // ── allowConductivity ─────────────────────────────────────────────────

  override allowConductivity(
    component: Component,
    state: ComponentState,
    _conductivityType: ENodeSourceType,
    pinId: string,
    otherPinId: string
  ): boolean {
    if (pinId === otherPinId) return true;
    const effective = (state as ArithmeticState).effectiveState;
    if (effective === 'indeterminate') return false;

    const pinMetadata = component.getPinMetadata(pinId);
    const otherPinMetadata = component.getPinMetadata(otherPinId);
    if (!pinMetadata || !otherPinMetadata) return false;

    // Exactly one pin must be a logicOutput, the other must be vcc or gnd
    let outputMeta: IPinMetadata | undefined;
    let logicOutputCount = 0;
    if (pinMetadata.subtype === 'logicOutput') { logicOutputCount++; outputMeta = pinMetadata; }
    if (otherPinMetadata.subtype === 'logicOutput') { logicOutputCount++; outputMeta = otherPinMetadata; }
    if (logicOutputCount !== 1 || !outputMeta?.logicPinData) return false;

    let vccCount = 0;
    vccCount += pinMetadata.subtype === 'vcc' ? 1 : pinMetadata.subtype === 'gnd' ? -1 : 0;
    vccCount += otherPinMetadata.subtype === 'vcc' ? 1 : otherPinMetadata.subtype === 'gnd' ? -1 : 0;
    if (vccCount !== 1 && vccCount !== -1) return false;

    // output-i → bit position i (direct mapping, no interleaving)
    const stateValue = parseInt(effective, 16);
    const bitPos = outputMeta.logicPinData.index;
    const high = ((stateValue >> bitPos) & 1) === 1;
    return high ? vccCount === 1 : vccCount === -1;
  }

  // ── computeTargetStableState ──────────────────────────────────────────

  protected computeTargetStableState(pinStates: Map<string, INodeElectricalState>): string {
    const invert = pinStates.get('invert')!.hasVoltage;
    let value = 0;

    for (let i = 0; i < BIT_COUNT; i++) {
      const input = pinStates.get(`input-${i}`)!.hasVoltage;
      if (input !== invert) value |= 1 << i;
    }

    // Bit 8: invert flag (for animation)
    if (invert) value |= 1 << BIT_COUNT;

    return value.toString(16).padStart(3, '0');
  }
}
