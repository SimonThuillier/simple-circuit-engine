/**
 * AND8 Gate component behavior implementation (8 inputs)
 * @module core/simulation/behaviors
 */

import type { UUID } from '../../../types/Identifier';
import type { Component } from '../../../Component';
import type { NodeElectricalState } from '../../states/basic/NodeElectricalState';
import type { ComponentState } from '../../states/ComponentState';
import type { BehaviorResult } from '../ComponentBehavior';
import { And8GateState } from '../../states/gates/And8GateState';
import { ComponentType } from '../../../types/ComponentType';
import { AndGateBehavior } from './AndGateBehavior';

/**
 * Behavior implementation for AND8 Gate components (8 inputs).
 * With positive activationLogic: AND gate (output high when ALL 8 inputs are high).
 * With negative activationLogic: NAND gate (output high when ANY input is low).
 *
 * @public
 */
export class And8GateBehavior extends AndGateBehavior {
  override readonly componentType = ComponentType.And8Gate;

  override createInitialState(component: Component): ComponentState {
    if (component.type !== ComponentType.And8Gate) {
      throw new Error(`Invalid component type for And8GateBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new And8GateState(component.id, state);
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
      pinStates.get('input4')!.hasVoltage &&
      pinStates.get('input5')!.hasVoltage &&
      pinStates.get('input6')!.hasVoltage &&
      pinStates.get('input7')!.hasVoltage &&
      pinStates.get('input8')!.hasVoltage;

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
