/**
 * Half Adder component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { INodeElectricalState } from '../../states/types';
import type { IComponentBehavior } from '../types';
import { ComponentType } from '../../../topology/types';
import { HalfAdderState } from '../../states/arithmetic/HalfAdderState';
import { ArithmeticBehaviorMixin } from './ArithmeticBehaviorMixin';

/**
 * Behavior for the Half Adder component (XOR + AND in one block).
 *
 * - `sum = A XOR B`
 * - `carry = A AND B`
 *
 * State encoding follows `${sumBit}${carryBit}` — see {@link HalfAdderState}.
 * Because `sum` and `carry` can never both be high, only three stable states
 * are reachable: `'00' | '10' | '01'`.
 *
 * @public
 */
export class HalfAdderBehavior extends ArithmeticBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.HalfAdder);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for HalfAdderBehavior: ${component.type}`);
    }
    return new HalfAdderState(component.id, '0');
  }

  protected computeTargetStableState(pinStates: Map<string, INodeElectricalState>): string {
    const aHigh = pinStates.get('inputA')!.hasVoltage;
    const bHigh = pinStates.get('inputB')!.hasVoltage;
    const value = (aHigh !== bHigh ? 1 : 0) | (aHigh && bHigh ? 2 : 0);
    return value.toString(16);
  }
}
