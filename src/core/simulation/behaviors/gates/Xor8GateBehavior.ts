/**
 * XOR8 Gate component behavior implementation (8 inputs)
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import { Xor8GateState } from '../../states/gates/Xor8GateState';
import {LogicGateBehaviorMixin} from "./index";
import type {IBehaviorResult, IComponentBehavior} from "../types";
import type {INodeElectricalState} from "../../states";
import type {UUID} from "../../../utils/types";
import {ComponentType} from "../../../topology/types";

/**
 * Behavior implementation for XOR8 Gate components (8 inputs).
 * With positive activationLogic: XOR gate (output high when odd number of inputs are high).
 * With negative activationLogic: XNOR gate (output high when even number of inputs are high).
 *
 * @public
 */
export class Xor8GateBehavior extends LogicGateBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.Xor8Gate);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for Xor8GateBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new Xor8GateState(component.id, state);
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
    if(vccGuardBehavior) {
      return vccGuardBehavior;
    }
    const nonLogicInputGuardBehavior = this.nonLogicInputGuardBehavior(state, newPinStates, targetTick);
    if(nonLogicInputGuardBehavior) {
      return nonLogicInputGuardBehavior;
    }

    const highCount =
      (newPinStates.get('input1')!.hasVoltage ? 1 : 0) +
      (newPinStates.get('input2')!.hasVoltage ? 1 : 0) +
      (newPinStates.get('input3')!.hasVoltage ? 1 : 0) +
      (newPinStates.get('input4')!.hasVoltage ? 1 : 0) +
      (newPinStates.get('input5')!.hasVoltage ? 1 : 0) +
      (newPinStates.get('input6')!.hasVoltage ? 1 : 0) +
      (newPinStates.get('input7')!.hasVoltage ? 1 : 0) +
      (newPinStates.get('input8')!.hasVoltage ? 1 : 0);

    const oddParity = highCount % 2 === 1;

    const activationCondition =
      component.config.get('activationLogic') === 'negative' ? !oddParity : oddParity;

    return this.getBehavior(component, state, activationCondition, targetTick);
  }
}
