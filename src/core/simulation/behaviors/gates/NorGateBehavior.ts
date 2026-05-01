/**
 * NOR Gate component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import { NorGateState } from '../../states/gates/NorGateState';
import { LogicGateBehaviorMixin } from './index';
import type { IBehaviorResult, IComponentBehavior } from '../types';
import type { INodeElectricalState } from '../../states/types';
import type { UUID } from '../../../utils/types';
import { ComponentType } from '../../../topology/types';

/**
 * Behavior implementation for NOR Gate components.
 * With negative (default) activationLogic: NOR gate (output high when ALL inputs are low).
 * With positive activationLogic: OR gate (output high when ANY input is high).
 *
 * @public
 */
export class NorGateBehavior extends LogicGateBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.NorGate);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for NorGateBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new NorGateState(component.id, state);
  }

  /**
   * NOR gate output goes high when ALL inputs LACK voltage.
   * With positive activationLogic (OR), output goes high when ANY inputs HAS voltage.
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

    const anyInputHigh =
      newPinStates.get('input-0')!.hasVoltage || newPinStates.get('input-1')!.hasVoltage;

    const activationCondition =
      component.config.get('activationLogic') === 'negative' ? !anyInputHigh : anyInputHigh;

    return this.getBehavior(component, state, activationCondition, targetTick);
  }
}
