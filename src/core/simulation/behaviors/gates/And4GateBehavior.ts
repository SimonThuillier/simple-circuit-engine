/**
 * AND4 Gate component behavior implementation (4 inputs)
 * @module core/simulation/behaviors
 */

import type { UUID } from '../../../types/Identifier';
import type { Component } from '../../../Component';
import type { NodeElectricalState } from '../../states/basic/NodeElectricalState';
import type { ComponentState } from '../../states/ComponentState';
import type { BehaviorResult } from '../ComponentBehavior';
import { And4GateState } from '../../states/gates/And4GateState';
import { ComponentType } from '../../../types/ComponentType';
import { AndGateBehavior } from './AndGateBehavior';

/**
 * Behavior implementation for AND4 Gate components (4 inputs).
 * With positive activationLogic: AND gate (output high when ALL 4 inputs are high).
 * With negative activationLogic: NAND gate (output high when ANY input is low).
 *
 * @public
 */
export class And4GateBehavior extends AndGateBehavior {
  override readonly componentType = ComponentType.And4Gate;

  override createInitialState(component: Component): ComponentState {
    if (component.type !== ComponentType.And4Gate) {
      throw new Error(`Invalid component type for And4GateBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new And4GateState(component.id, state);
  }

  override onPinsChange(
    component: Component,
    state: ComponentState,
    nodeStates: ReadonlyMap<UUID, NodeElectricalState>,
    targetTick: number
  ): BehaviorResult {
    const pinStates: Map<string, NodeElectricalState> = new Map();

    for (const pinId of component.pins) {
      pinStates.set(component.getPinLabel(pinId)!, nodeStates.get(pinId as UUID)!);
    }

    const allInputsHigh =
      pinStates.get('input1')!.hasVoltage &&
      pinStates.get('input2')!.hasVoltage &&
      pinStates.get('input3')!.hasVoltage &&
      pinStates.get('input4')!.hasVoltage;

    const shouldConduct =
      component.config.get('activationLogic') === 'negative' ? !allInputsHigh : allInputsHigh;

    let hasChanged = false;
    const scheduledEvents = [];
    const transitionSpan = this.getTransitionSpan(component.config);

    if (shouldConduct) {
      if (state.state === 'low' || state.state === 'falling') {
        hasChanged = true;
        state.state = 'rising';
        state.startTick = targetTick;
        scheduledEvents.push({
          targetId: component.id,
          scheduledAtTick: targetTick,
          readyAtTick: targetTick + transitionSpan,
          type: 'RisingComplete',
          parameters: undefined,
        });
      }
    } else {
      if (state.state === 'high' || state.state === 'rising') {
        hasChanged = true;
        state.state = 'falling';
        state.startTick = targetTick;
        scheduledEvents.push({
          targetId: component.id,
          scheduledAtTick: targetTick,
          readyAtTick: targetTick + transitionSpan,
          type: 'FallingComplete',
          parameters: undefined,
        });
      }
    }

    return {
      componentState: state,
      hasChanged: hasChanged,
      scheduledEvents: scheduledEvents,
    };
  }
}
