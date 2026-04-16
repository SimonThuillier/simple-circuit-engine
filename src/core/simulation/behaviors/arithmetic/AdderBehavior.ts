/**
 * Full Adder component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { INodeElectricalState } from '../../states/types';
import type { IComponentBehavior } from '../types';
import { ComponentType } from '../../../topology/types';
import { AdderState } from '../../states/arithmetic/AdderState';
import { ArithmeticBehaviorMixin } from './ArithmeticBehaviorMixin';

/**
 * Behavior for the Full Adder component (two half adders + OR on carries).
 *
 * Three logic inputs (`inputA`, `inputB`, `carryIn`) and two logic outputs
 * (`sum`, `carryOut`):
 *
 * - `sum = A XOR B XOR carryIn` (parity of the three inputs)
 * - `carryOut = majority(A, B, carryIn)` (two or more inputs high)
 *
 * State encoding follows `${sumBit}${carryBit}` — see {@link AdderState}. All
 * four stable states are reachable; `A = B = carryIn = 1` yields `'11'`.
 *
 * A single medium `transitionSpan` from config is used for every transition,
 * since modeling the cumulative XOR/AND/OR delays per input-output pair would
 * be more complexity than this library's teaching scope warrants.
 *
 * @public
 */
export class AdderBehavior extends ArithmeticBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.Adder);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for AdderBehavior: ${component.type}`);
    }
    return new AdderState(component.id, '0');
  }

  protected computeTargetStableState(pinStates: Map<string, INodeElectricalState>): string {
    const aHigh = pinStates.get('inputA')!.hasVoltage;
    const bHigh = pinStates.get('inputB')!.hasVoltage;
    const cInHigh = pinStates.get('carryIn')!.hasVoltage;
    const highCount = (aHigh ? 1 : 0) + (bHigh ? 1 : 0) + (cInHigh ? 1 : 0);
    const value = (highCount % 2 === 1 ? 1 : 0) | (highCount >= 2 ? 2 : 0);
    return value.toString(16);
  }
}
