/**
 * switch component behavior implementation
 * @module core/simulation/behaviors
 */

import type {Component} from '../../../topology/Component';
import type {ComponentState, INodeElectricalState} from '../../states';
import {SwitchState} from '../../states';
import type {IScheduledEvent, IUserCommand} from '../../types';
import {ComponentBehaviorMixin, getTransitionSpan} from '../ComponentBehavior';
import type {IBehaviorResult, IComponentBehavior} from "../types";
import {ComponentType, ENodeSourceType} from "../../../topology/types";
import type {UUID} from "../../../utils";

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

  /**
   * used for contactor color change
   * @param component
   * @param state
   * @param nodeStates
   * @param _targetTick
   */
  override onPinsChange(
      component: Component,
      state: ComponentState,
      nodeStates: ReadonlyMap<UUID, INodeElectricalState>,
      _targetTick: number
  ): IBehaviorResult {
    const newPinStates = this.getPinStates(component, nodeStates);
    const prevPinStates = state.pinStates;
    state.pinStates = newPinStates;
    const changedPins = this.getChangedPins(newPinStates, prevPinStates);

    if (changedPins.size < 1 || !changedPins.has('output')) {
      return { componentState: state, hasChanged: false, shouldCancelPending: false, scheduledEvents: [] };
    }

    return {
      componentState: state,
      hasChanged: true,
      shouldCancelPending: false,
      scheduledEvents: [],
    };
  }

  override onUserCommand(component: Component, state: ComponentState, command: IUserCommand): IBehaviorResult {
    let hasChanged = false;
    const scheduledEvents: IScheduledEvent[] = [];

    const transitionSpan = getTransitionSpan(component.config);

    if (command.type === 'toggle_switch' && ['open', 'closed'].includes(state.state)) {
      state.setState(
          state.state === 'open' ? 'closing' : 'opening',
          command.scheduledAtTick
      );
      state.setNextState(
          state.state === 'closing' ? 'closed' : 'open',
          command.scheduledAtTick + transitionSpan
      );
      hasChanged = true;

      scheduledEvents.push({
        targetId: component.id,
        scheduledAtTick: state.startTick,
        readyAtTick: state.expirationTick,
        type: state.state === 'closing' ? 'ClosingEnd' : 'OpeningEnd',
        parameters: new Map([['exclusive', 'true']]),
      });
    }

    return {
      componentState: state,
      hasChanged: hasChanged,
      shouldCancelPending: true,
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
        state.setState('closed', event.readyAtTick);
        hasChanged = true;
      }
    } else if (event.type === 'OpeningEnd') {
      if (state.state !== 'open') {
        state.setState('open', event.readyAtTick);
        hasChanged = true;
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
