/**
 * XOR Gate component behavior implementation
 * @module core/simulation/behaviors
 */

import type { UUID } from '../../../types/Identifier';
import type { Component } from '../../../Component';
import type { ENodeSourceType } from '../../../types/ENodeSourceType';
import type { NodeElectricalState } from '../../states/basic/NodeElectricalState';
import type { ComponentState } from '../../states/ComponentState';
import type { ScheduledEvent, UserCommand } from '../../types';
import type { ComponentBehavior, BehaviorResult } from '../ComponentBehavior';
import { XorGateState } from '../../states/gates/XorGateState';
import { ComponentType } from '../../../types/ComponentType';
import { TRANSITION_DEFAULTS } from '../../types/SimulationConstants';

/**
 * Behavior implementation for XOR Gate components.
 * With positive activationLogic: XOR gate (output high when inputs differ).
 * With negative activationLogic: XNOR gate (output high when inputs are equal).
 *
 * @public
 */
export class XorGateBehavior implements ComponentBehavior {
  readonly componentType: ComponentType = ComponentType.XorGate;

  createInitialState(component: Component): ComponentState {
    if (component.type !== ComponentType.XorGate) {
      throw new Error(`Invalid component type for XorGateBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new XorGateState(component.id, state);
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
   * XOR gate output goes high when inputs differ (one high, one low).
   * With negative activationLogic (XNOR), output goes high when inputs are equal.
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

    const input1High = pinStates.get('input1')!.hasVoltage;
    const input2High = pinStates.get('input2')!.hasVoltage;
    const inputsDiffer = input1High !== input2High;

    const shouldConduct =
      component.config.get('activationLogic') === 'negative' ? !inputsDiffer : inputsDiffer;

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
