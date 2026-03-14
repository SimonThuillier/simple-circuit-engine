/**
 * NAND Gate component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import { NandGateState } from '../../states/gates/NandGateState';
import {LogicGateBehaviorMixin} from "./index";
import type {IBehaviorResult, IComponentBehavior} from "../types";
import type {INodeElectricalState} from "../../states";
import type {UUID} from "../../../utils/types";
import {ComponentType} from "../../../topology/types";

/**
 * Behavior implementation for NAND Gate components.
 * With negative (default) activationLogic: NAND gate (output high when ANY input is low).
 * With positive activationLogic: AND gate (output high when ALL inputs are high).
 *
 * @public
 */
export class NandGateBehavior extends LogicGateBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.NandGate);
  }

  /**
   * Create initial state for an NAND Gate.
   *
   * @param component - The NAND Gate component
   * @returns Initial state (low by default, high for negative activation logic)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for NandGateBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new NandGateState(component.id, state);
  }

  /**
   * NAND gate output goes high when ANY inputs LACK voltage.
   * With positive activationLogic (AND), output goes high when ALL inputs HAS voltage.
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

    const allInputsHigh =
      pinStates.get('input1')!.hasVoltage && pinStates.get('input2')!.hasVoltage;

    const activationCondition =
      component.config.get('activationLogic') === 'negative' ? !allInputsHigh : allInputsHigh;

    return this.getBehavior(component, state, activationCondition, targetTick);
  }
}
