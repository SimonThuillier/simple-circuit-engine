/**
 * NAND8 Gate component behavior implementation (8 inputs)
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import { Nand8GateState } from '../../states/gates/Nand8GateState';
import { LogicGateBehaviorMixin } from './index';
import type { IBehaviorResult, IComponentBehavior } from '../types';
import type { INodeElectricalState } from '../../states/types';
import type { UUID } from '../../../utils/types';
import { ComponentType } from '../../../topology/types';

/**
 * Behavior implementation for NAND8 Gate components (8 inputs).
 * With negative (default) activationLogic: NAND gate (output high when ANY input is low).
 * With positive activationLogic: AND gate (output high when ALL 8 inputs are high).
 *
 * @public
 */
export class Nand8GateBehavior extends LogicGateBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.Nand8Gate);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for Nand8GateBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new Nand8GateState(component.id, state);
  }

  override onPinsChange(
    component: Component,
    state: ComponentState,
    nodeStates: ReadonlyMap<UUID, INodeElectricalState>,
    targetTick: number
  ): IBehaviorResult {
    const newPinStates = this.getPinStates(component, nodeStates);
    state.pinStates = newPinStates;

    const vccGuardBehavior = this.vccGuardBehavior(state, newPinStates, targetTick);
    if (vccGuardBehavior) {
      return vccGuardBehavior;
    }
    const nonLogicInputGuardBehavior = this.nonLogicInputGuardBehavior(
      state,
      newPinStates,
      targetTick
    );
    if (nonLogicInputGuardBehavior) {
      return nonLogicInputGuardBehavior;
    }

    const allInputsHigh =
      newPinStates.get('input1')!.hasVoltage &&
      newPinStates.get('input2')!.hasVoltage &&
      newPinStates.get('input3')!.hasVoltage &&
      newPinStates.get('input4')!.hasVoltage &&
      newPinStates.get('input5')!.hasVoltage &&
      newPinStates.get('input6')!.hasVoltage &&
      newPinStates.get('input7')!.hasVoltage &&
      newPinStates.get('input8')!.hasVoltage;

    const activationCondition =
      component.config.get('activationLogic') === 'negative' ? !allInputsHigh : allInputsHigh;

    return this.getBehavior(component, state, activationCondition, targetTick);
  }
}
