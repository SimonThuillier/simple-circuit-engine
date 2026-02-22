/**
 * OR Gate component behavior implementation
 * @module core/simulation/behaviors
 */

import type { UUID } from '../../../types/Identifier';
import type { Component } from '../../../Component';
import type { ENodeSourceType } from '../../../types/ENodeSourceType';
import type { NodeElectricalState } from '../../states/basic/NodeElectricalState';
import type { ComponentState } from '../../states/ComponentState';
import type { ScheduledEvent, UserCommand } from '../../types';
import type { ComponentBehavior, BehaviorResult } from '../ComponentBehavior';
import { OrGateState } from '../../states/gates/OrGateState';
import { ComponentType } from '../../../types/ComponentType';
import { TRANSITION_DEFAULTS } from '../../types/SimulationConstants';

/**
 * Behavior implementation for OR Gate components.
 * With positive activationLogic: OR gate (output high when ANY input is high).
 * With negative activationLogic: NOR gate (output high when ALL inputs are low).
 *
 * @public
 */
export class OrGateBehavior implements ComponentBehavior {
  readonly componentType: ComponentType = ComponentType.OrGate;

  createInitialState(component: Component): ComponentState {
    if (component.type !== ComponentType.OrGate) {
      throw new Error(`Invalid component type for OrGateBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new OrGateState(component.id, state);
  }

  allowConductivity(
    component: Component,
    state: ComponentState,
    _conductivityType: ENodeSourceType,
    pinId: string,
    otherPinId: string
  ): boolean {
    if (pinId === otherPinId) return true;
    const pinLabel = component.getPinLabel(pinId);
    const otherPinLabel = component.getPinLabel(otherPinId);
    if (!pinLabel || !otherPinLabel) return false;
    const pinLabels = [pinLabel, otherPinLabel];

    if (pinLabels.includes('vcc') && pinLabels.includes('output')) {
      return state.state === 'high' || state.state === 'falling';
    }
    return false;
  }

  protected getTransitionSpan(config: Map<string, string>): number {
    const value = parseInt(config.get('transitionSpan') || '', 10);
    if (isNaN(value) || value < 1) {
      return TRANSITION_DEFAULTS.TRANSITION_SPAN_TICKS;
    }
    return value;
  }

  /**
   * OR gate output goes high when ANY input has voltage.
   * With negative activationLogic (NOR), output goes high when ALL inputs lack voltage.
   */
  onPinsChange(
    component: Component,
    state: ComponentState,
    nodeStates: ReadonlyMap<UUID, NodeElectricalState>,
    targetTick: number
  ): BehaviorResult {
    const pinStates: Map<string, NodeElectricalState> = new Map();

    for (const pinId of component.pins) {
      pinStates.set(component.getPinLabel(pinId)!, nodeStates.get(pinId as UUID)!);
    }

    const anyInputHigh = pinStates.get('input1')!.hasVoltage || pinStates.get('input2')!.hasVoltage;

    const shouldConduct =
      component.config.get('activationLogic') === 'negative' ? !anyInputHigh : anyInputHigh;

    let hasChanged = false;
    const scheduledEvents: ScheduledEvent[] = [];
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

  onUserCommand(
    _component: Component,
    state: ComponentState,
    _command: UserCommand
  ): BehaviorResult {
    return {
      componentState: state,
      hasChanged: false,
      scheduledEvents: [],
    };
  }

  onEventFiring(
    _component: Component,
    state: ComponentState,
    event: ScheduledEvent
  ): BehaviorResult {
    let hasChanged = false;

    if (event.type === 'RisingComplete') {
      if (state.state !== 'high') {
        hasChanged = true;
        state.startTick = event.readyAtTick;
        state.state = 'high';
      }
    } else if (event.type === 'FallingComplete') {
      if (state.state !== 'low') {
        hasChanged = true;
        state.startTick = event.readyAtTick;
        state.state = 'low';
      }
    }

    return {
      componentState: state,
      hasChanged: hasChanged,
      scheduledEvents: [],
    };
  }
}
