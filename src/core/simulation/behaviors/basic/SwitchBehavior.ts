/**
 * switch component behavior implementation
 * @module core/simulation/behaviors
 */

import type {Component} from '../../../topology/Component';
import type {ComponentState} from '../../states';
import {SwitchState} from '../../states';
import type {IScheduledEvent, IUserCommand} from '../../types';
import {ComponentBehaviorMixin} from '../ComponentBehavior';
import {getTickCount} from "./index";
import type {IBehaviorResult, IComponentBehavior} from "../types";
import {ComponentType, ENodeSourceType} from "../../../topology/types";

/**
 * Behavior implementation for switches components.
 *
 * @public
 */
export class SwitchBehavior extends ComponentBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.Switch);
  }

  /**
   * Create initial state for a switch.
   *
   * @param component - The Switch component
   * @returns Switch Initial state (open by default)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for SwitchBehavior: ${component.type}`);
    }
    const state = component.config.get('initialState') || 'open';
    return new SwitchState(component.id, state);
  }

  override allowConductivity(
    _component: Component,
    _state: ComponentState,
    _conductivityType: ENodeSourceType,
    _pinId: string,
    _otherPinId: string
  ): boolean {
    return _state.state === 'closed' || _state.state === 'opening';
  }

  override onUserCommand(component: Component, state: ComponentState, command: IUserCommand): IBehaviorResult {
    let hasChanged = false;
    const scheduledEvents: IScheduledEvent[] = [];

    if (command.type === 'toggle_switch' && ['open', 'closed'].includes(state.state)) {
      state.state = state.state === 'open' ? 'closing' : 'opening';
      state.startTick = command.scheduledAtTick + 1;
      hasChanged = true;

      const tickCount = getTickCount(command.parameters);
      scheduledEvents.push({
        targetId: component.id,
        scheduledAtTick: state.startTick,
        readyAtTick: state.startTick + tickCount,
        type: state.state === 'closing' ? 'ClosingEnd' : 'OpeningEnd',
        parameters: undefined,
      });
    }

    return {
      componentState: state,
      hasChanged: hasChanged,
      shouldCancelPending: false,
      scheduledEvents: scheduledEvents,
    };
  }

  override onEventFiring(
    _component: Component,
    state: ComponentState,
    event: IScheduledEvent
  ): IBehaviorResult {
    let hasChanged = false;

    if (event.type === 'ClosingEnd') {
      if (state.state !== 'closed') {
        hasChanged = true;
        state.startTick = event.readyAtTick;
        state.state = 'closed';
      }
    } else if (event.type === 'OpeningEnd') {
      if (state.state !== 'open') {
        hasChanged = true;
        state.startTick = event.readyAtTick;
        state.state = 'open';
      }
    }

    return {
      componentState: state,
      hasChanged: hasChanged,
      shouldCancelPending: false,
      scheduledEvents: [],
    };
  }
}
