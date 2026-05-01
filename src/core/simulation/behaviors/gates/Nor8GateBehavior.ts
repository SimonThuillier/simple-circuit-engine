/**
 * NOR8 Gate component behavior implementation (8 inputs)
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import { Nor8GateState } from '../../states/gates/Nor8GateState';
import { LogicGateBehaviorMixin } from './index';
import type { IBehaviorResult, IComponentBehavior } from '../types';
import type { INodeElectricalState } from '../../states';
import type { UUID } from '../../../utils/types';
import { ComponentType } from '../../../topology/types';

/**
 * Behavior implementation for NOR8 Gate components (8 inputs).
 * With negative (default) activationLogic: NOR gate (output high when ALL 8 inputs are low).
 * With positive activationLogic: OR gate (output high when ANY of 8 inputs is high).
 *
 * @public
 */
export class Nor8GateBehavior extends LogicGateBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.Nor8Gate);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for Nor8GateBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new Nor8GateState(component.id, state);
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

    const anyInputHigh =
      newPinStates.get('input-0')!.hasVoltage ||
      newPinStates.get('input-1')!.hasVoltage ||
      newPinStates.get('input-2')!.hasVoltage ||
      newPinStates.get('input-3')!.hasVoltage ||
      newPinStates.get('input-4')!.hasVoltage ||
      newPinStates.get('input-5')!.hasVoltage ||
      newPinStates.get('input-6')!.hasVoltage ||
      newPinStates.get('input-7')!.hasVoltage;

    const activationCondition =
      component.config.get('activationLogic') === 'negative' ? !anyInputHigh : anyInputHigh;

    return this.getBehavior(component, state, activationCondition, targetTick);
  }
}
