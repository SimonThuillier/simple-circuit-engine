/**
 * XOR Gate component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import { XorGateState } from '../../states/gates/XorGateState';
import { LogicGateBehaviorMixin } from './index';
import type { IBehaviorResult, IComponentBehavior } from '../types';
import type { INodeElectricalState } from '../../states';
import type { UUID } from '../../../utils/types';
import { ComponentType } from '../../../topology/types';

/**
 * Behavior implementation for XOR Gate components.
 * With positive activationLogic: XOR gate (output high when inputs differ / odd parity).
 * With negative activationLogic: XNOR gate (output high when inputs are equal / even parity).
 *
 * @public
 */
export class XorGateBehavior extends LogicGateBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.XorGate);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for XorGateBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new XorGateState(component.id, state);
  }

  /**
   * XOR gate output goes high when inputs differ (odd parity).
   * With negative activationLogic (XNOR), output goes high when inputs are equal (even parity).
   */
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

    const input1High = newPinStates.get('input-0')!.hasVoltage;
    const input2High = newPinStates.get('input-1')!.hasVoltage;
    const oddParity = input1High !== input2High;

    const activationCondition =
      component.config.get('activationLogic') === 'negative' ? !oddParity : oddParity;

    return this.getBehavior(component, state, activationCondition, targetTick);
  }
}
