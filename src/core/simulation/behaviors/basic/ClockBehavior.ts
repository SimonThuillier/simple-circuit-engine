/**
 * Clock component behavior implementation
 * @module core/simulation/behaviors
 */
import { Component } from '../../../topology/Component';
import { ComponentBehaviorMixin } from '../ComponentBehavior';
import { type ComponentState } from '../../states/ComponentState';
import type { IComponentBehavior, IBehaviorResult } from '../types';
import { ComponentType, ENodeSourceType } from '../../../topology/types';
import { ClockState } from '../../states/basic/ClockState';

import { type IScheduledEvent } from '../../types';

export class ClockBehavior extends ComponentBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.Clock);
  }

  /**
   * Create initial state for a Clock.
   *
   * @param component - The Clock component
   * @returns Clock Initial state (needle rotation)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for ClockBehavior: ${component.type}`);
    }
    const state = new ClockState(component.id);
    const startHigh = component.config.get('startHigh') == 'true';
    state.setState(startHigh ? 'high' : 'low', 0);
    const halfPeriod = Number(component.config.get('halfPeriod'));
    state.setNextState(startHigh ? 'low' : 'high', halfPeriod);

    return state;
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

    if (pinLabels.includes('gnd') && pinLabels.includes('vcc')) {
      return false;
    }

    if (pinLabels.includes('gnd') && pinLabels.includes('output')) {
      const result = state.state === 'low';
      //console.log('clock conductivity gnd-output', state.state, result);
      return result;
    }

    if (pinLabels.includes('vcc') && pinLabels.includes('output')) {
      const result = state.state === 'high';
      //console.warn('clock conductivity vcc-output', state.state, result);
      return result;
    }
    return false;
  }

  /**
   * Clock onStart allows to bootstrap cycling
   * @param component
   * @param state
   */
  override onStart(component: Component, state: ComponentState): IBehaviorResult | null {
    const targetTick = 0;
    const halfPeriod = Number(component.config.get('halfPeriod'));
    //console.log('onStart', targetTick);
    state.setNextState(state.state === 'high' ? 'low' : 'high', targetTick + halfPeriod);

    return {
      componentState: state,
      hasChanged: true,
      shouldCancelPending: true,
      scheduledEvents: [
        {
          targetId: component.id,
          scheduledAtTick: state.startTick,
          readyAtTick: state.expirationTick,
          type: 'tick',
          parameters: new Map([['exclusive', 'true']]),
        },
      ],
    };
  }

  override onEventFiring(
    component: Component,
    state: ComponentState,
    event: IScheduledEvent
  ): IBehaviorResult {
    if (event.type !== 'tick') {
      return {
        componentState: state,
        hasChanged: false,
        shouldCancelPending: false,
        scheduledEvents: [],
      };
    }

    const halfPeriod = Number(component.config.get('halfPeriod'));
    state.setState(state.state === 'high' ? 'low' : 'high', event.readyAtTick);
    state.setNextState(state.state === 'high' ? 'low' : 'high', event.readyAtTick + halfPeriod);

    //console.warn(`Clock ticking at ${event.readyAtTick} to ${state.state}`);

    return {
      componentState: state,
      hasChanged: true,
      shouldCancelPending: true,
      scheduledEvents: [
        {
          targetId: component.id,
          scheduledAtTick: state.startTick,
          readyAtTick: state.expirationTick,
          type: 'tick',
          parameters: new Map([['exclusive', 'true']]),
        },
      ],
    };
  }
}
