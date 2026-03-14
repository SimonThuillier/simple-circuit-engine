/**
 * Double switch component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import {type ComponentState, DoubleThrowSwitchState} from '../../states';
import type { IScheduledEvent, IUserCommand } from '../../types';
import {ComponentBehaviorMixin} from '../ComponentBehavior';
import {getTickCount} from "./index";
import type {IBehaviorResult, IComponentBehavior} from "../types";
import {ComponentType, ENodeSourceType} from "../../../topology/types";



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

  override onUserCommand(component: Component, state: ComponentState, command: IUserCommand): IBehaviorResult {
    let hasChanged = false;
    const scheduledEvents: IScheduledEvent[] = [];

    if (command.type === 'toggle_switch' && ['input1', 'input2'].includes(state.state)) {
      state.state = state.state === 'input1' ? '1to2' : '2to1';
      state.startTick = command.scheduledAtTick + 1;
      hasChanged = true;

      const tickCount = getTickCount(command.parameters);
      scheduledEvents.push({
        targetId: component.id,
        scheduledAtTick: state.startTick,
        readyAtTick: state.startTick + tickCount,
        type: state.state === '1to2' ? 'ContactedInput2' : 'ContactedInput1',
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

    if (event.type === 'ContactedInput2') {
      if (state.state !== 'input2') {
        hasChanged = true;
        state.startTick = event.readyAtTick;
        state.state = 'input2';
      }
    } else if (event.type === 'ContactedInput1') {
      if (state.state !== 'input1') {
        hasChanged = true;
        state.startTick = event.readyAtTick;
        state.state = 'input1';
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
