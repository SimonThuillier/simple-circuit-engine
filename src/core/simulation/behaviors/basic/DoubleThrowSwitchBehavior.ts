/**
 * Double switch component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import {type ComponentState, DoubleThrowSwitchState, type INodeElectricalState} from '../../states';
import type { IScheduledEvent, IUserCommand } from '../../types';
import {ComponentBehaviorMixin, getTransitionSpan} from '../ComponentBehavior';
import type {IBehaviorResult, IComponentBehavior} from "../types";
import {ComponentType, ENodeSourceType} from "../../../topology/types";
import type {UUID} from "../../../utils";



/**
 * Behavior implementation for switches components.
 *
 * @public
 */
export class DoubleThrowSwitchBehavior extends ComponentBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.DoubleThrowSwitch);
  }

  /**
   * Create initial state for a double throw switch (SPDT).
   *
   * @param component - The double Switch component
   * @returns double Switch Initial state (input1 by default)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for DoubleThrowSwitchBehavior: ${component.type}`);
    }
    const state = component.config.get('initialState') || 'input1';
    return new DoubleThrowSwitchState(component.id, state);
  }

  override allowConductivity(
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

    if (pinLabels.includes('output') && pinLabels.includes('input1')) {
      return state.state === 'input1' || state.state === '1to2';
    }
    if (pinLabels.includes('output') && pinLabels.includes('input2')) {
      return state.state === 'input2' || state.state === '2to1';
    }
    return false;
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

    if (command.type === 'toggle_switch' && ['input1', 'input2'].includes(state.state)) {
      state.setState(
          state.state === 'input1' ? '1to2' : '2to1',
          command.scheduledAtTick
      );
      state.setNextState(
          state.state === '1to2' ? 'input2' : 'input1',
          command.scheduledAtTick + transitionSpan
      );
      hasChanged = true;

      scheduledEvents.push({
        targetId: component.id,
        scheduledAtTick: state.startTick,
        readyAtTick: state.expirationTick,
        type: state.state === '1to2' ? 'ContactedInput2' : 'ContactedInput1',
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

    if (event.type === 'ContactedInput2') {
      if (state.state !== 'input2') {
        state.setState('input2', event.readyAtTick);
        hasChanged = true;
      }
    } else if (event.type === 'ContactedInput1') {
      if (state.state !== 'input1') {
        state.setState('input1', event.readyAtTick);
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
