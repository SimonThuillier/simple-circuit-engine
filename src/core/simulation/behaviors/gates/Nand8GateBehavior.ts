/**
 * NAND8 Gate component behavior implementation (8 inputs)
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import { Nand8GateState } from '../../states/gates/Nand8GateState';
import {LogicGateBehaviorMixin} from "./index";
import type {IBehaviorResult, IComponentBehavior} from "../types";
import type {INodeElectricalState} from "../../states/types";
import type {UUID} from "../../../utils/types";
import {ComponentType} from "../../../topology/types";

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
    const pinStates = this.getPinStates(component, nodeStates);
    const vccGuardBehavior = this.vccGuardBehavior(state, pinStates, targetTick);
    if(vccGuardBehavior) {
      return vccGuardBehavior;
    }
    const nonLogicInputGuardBehavior = this.nonLogicInputGuardBehavior(state, pinStates, targetTick);
    if(nonLogicInputGuardBehavior) {
      return nonLogicInputGuardBehavior;
    }

    const allInputsHigh =
      pinStates.get('input1')!.hasVoltage &&
      pinStates.get('input2')!.hasVoltage &&
      pinStates.get('input3')!.hasVoltage &&
      pinStates.get('input4')!.hasVoltage &&
      pinStates.get('input5')!.hasVoltage &&
      pinStates.get('input6')!.hasVoltage &&
      pinStates.get('input7')!.hasVoltage &&
      pinStates.get('input8')!.hasVoltage;

    const activationCondition =
      component.config.get('activationLogic') === 'negative' ? !allInputsHigh : allInputsHigh;

    return this.getBehavior(component, state, activationCondition, targetTick);
  }
}
