/**
 * NOR4 Gate component behavior implementation (4 inputs)
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import { Nor4GateState } from '../../states/gates/Nor4GateState';
import {LogicGateBehaviorMixin} from "./index";
import type {IBehaviorResult, IComponentBehavior} from "../types";
import type {INodeElectricalState} from "../../states";
import type {UUID} from "../../../utils/types";
import {ComponentType} from "../../../topology/types";

/**
 * Behavior implementation for NOR4 Gate components (4 inputs).
 * With negative (default) activationLogic: NOR gate (output high when ALL 4 inputs are low).
 * With positive activationLogic: OR gate (output high when ANY of 4 inputs is high).
 *
 * @public
 */
export class Nor4GateBehavior extends LogicGateBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.Nor4Gate);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for Nor4GateBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new Nor4GateState(component.id, state);
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

    const anyInputHigh =
      pinStates.get('input1')!.hasVoltage ||
      pinStates.get('input2')!.hasVoltage ||
      pinStates.get('input3')!.hasVoltage ||
      pinStates.get('input4')!.hasVoltage;

    const activationCondition =
      component.config.get('activationLogic') === 'negative' ? !anyInputHigh : anyInputHigh;

    return this.getBehavior(component, state, activationCondition, targetTick);
  }
}
