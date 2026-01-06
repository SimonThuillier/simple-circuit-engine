/**
 * LED component behavior implementation
 * @module core/simulation/behaviors
 */

import type { UUID } from '@/core/types/Identifier.js';
import type { ComponentBehavior, BehaviorResult } from './ComponentBehavior.js';
import type { Component } from '@/core/Component.js';
import { SmallLEDState } from '../states/SmallLEDState';
import type { ComponentState } from '../states/ComponentState.js';
import { ComponentType } from '@/core/types/ComponentType';
import type { ENodeSourceType } from '@/core/types/ENodeSourceType';
import type { NodeElectricalState, ScheduledEvent, UserCommand } from '@/core/simulation';

export class SmallLEDBehavior implements ComponentBehavior {
  componentType = ComponentType.SmallLED;

  /**
   * Create initial state for a smallLED.
   *
   * @param component - The smallLED component
   * @returns LED Initial state (always active and delivering voltage)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== ComponentType.SmallLED) {
      throw new Error(`Invalid component type for SmallLEDBehavior: ${component.type}`);
    }
    return new SmallLEDState(component.id);
  }

  allowConductivity(
    _component: Component,
    _state: ComponentState,
    _conductivityType: ENodeSourceType,
    _pinId: string,
    _otherPinId: string
  ): boolean {
    return true;
    // TODO: implement asymmetric conductivity later
  }

  /**
   * only symmetrical behavior of LEDS is handled for now
   * @param component
   * @param state
   * @param nodeStates
   * @param targetTick
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

    let activationCondition =
      (pinStates.get('anode')!.hasVoltage && pinStates.get('anode')!.hasCurrent) ||
      (pinStates.get('cathode')!.hasVoltage && pinStates.get('cathode')!.hasCurrent) ||
      (pinStates.get('anode')!.hasVoltage && pinStates.get('cathode')!.hasCurrent) ||
      (pinStates.get('cathode')!.hasVoltage && pinStates.get('anode')!.hasCurrent);

    let hasChanged = false;
    const scheduledEvents: ScheduledEvent[] = [];

    if (activationCondition) {
      if (state.state === 'off' || state.state === 'goingOff') {
        hasChanged = true;
        state.state = 'goingOn';
        state.startTick = targetTick;
        scheduledEvents.push({
          targetId: component.id,
          scheduledAtTick: targetTick,
          readyAtTick: targetTick + 1, // TODO handle component config later
          type: 'GoingOnEnd',
          parameters: undefined,
        });
      }
    } else {
      if (state.state === 'on' || state.state === 'goingOn') {
        hasChanged = true;
        state.state = 'goingOff';
        state.startTick = targetTick;
        scheduledEvents.push({
          targetId: component.id,
          scheduledAtTick: targetTick,
          readyAtTick: targetTick + 1, // TODO handle component config later
          type: 'GoingOffEnd',
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

    if (event.type === 'GoingOffEnd') {
      if (state.state !== 'off') {
        hasChanged = true;
        state.startTick = event.readyAtTick;
        state.state = 'off';
      }
    } else if (event.type === 'GoingOnEnd') {
      if (state.state !== 'on') {
        hasChanged = true;
        state.startTick = event.readyAtTick;
        state.state = 'on';
      }
    }

    return {
      componentState: state,
      hasChanged: hasChanged,
      scheduledEvents: [],
    };
  }
}
