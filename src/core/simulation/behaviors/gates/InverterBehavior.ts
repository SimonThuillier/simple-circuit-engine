/**
 * Inverter component behavior implementation
 * @module core/simulation/behaviors
 */

import type {Component} from '../../../topology/Component';
import {type ComponentState} from '../../states/ComponentState';
import {InverterState} from '../../states/gates/InverterState';
import { LogicGateBehaviorMixin} from "./index";
import type {IBehaviorResult, IComponentBehavior} from "../types";
import type {INodeElectricalState} from "../../states";
import type {UUID} from "../../../utils/types";
import {ComponentType} from "../../../topology/types";

/**
 * Behavior implementation for Inverters components.
 *
 * @public
 */
export class InverterBehavior extends LogicGateBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.Inverter);
  }

  /**
   * Create initial state for a Inverter.
   *
   * @param component - The Inverter component
   * @returns Inverter Initial state (HIGH if input LOW, LOW if input LOW for positive activation logic)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for InverterBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new InverterState(component.id, state);
  }

  /**
   * Inverter needs LOW on input to drive the output HIGH, and on the contrary Buffer needs HIGH on input to output HIGH
   * @param component
   * @param state
   * @param nodeStates
   * @param targetTick
   */
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

    const isCommanded = pinStates.get('input')!.hasVoltage;
    const activationCondition =
        component.config.get('activationLogic') === 'negative' ? !isCommanded : isCommanded;

    return this.getBehavior(component, state, activationCondition, targetTick);
  }
}
