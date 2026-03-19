/**
 * Clock component behavior implementation
 * @module core/simulation/behaviors
 */

import type {UUID} from "../../../utils/types";

import { Component } from '../../../topology/Component';
import {ComponentBehaviorMixin} from '../ComponentBehavior';
import type { ComponentState } from '../../states/ComponentState';
import type {IComponentBehavior, IBehaviorResult} from "../types";
import {ComponentType, ENodeSourceType} from "../../../topology/types";
import {ClockState} from "../../states/basic/ClockState";

import {type IScheduledEvent} from '../../types';

import type {INodeElectricalState} from "../../states";


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
    const startHigh = component.config.get('halfPeriod') == 'true';
    state.setState(startHigh ? 'high' : 'low', 0);

    return new ClockState(component.id);
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
      return state.state === 'low';
    }

    if (pinLabels.includes('vcc') && pinLabels.includes('output')) {
      return state.state === 'high';
    }
    return false;
  }

  /**
   * This method will only be called at initial state calculation for a Clock
   * If forces it to emit an event for changing its output after the first half-period and recursively on and on...
   * @param component
   * @param state
   * @param _nodeStates
   * @param targetTick
   */
  override onPinsChange(
      component: Component,
      state: ComponentState,
      _nodeStates: ReadonlyMap<UUID, INodeElectricalState>,
      targetTick: number
  ): IBehaviorResult {
    const halfPeriod = Number(component.config.get('halfPeriod'));

    state.setState(state.state, targetTick);
    state.setNextState(
        state.state === 'high' ? 'low': 'high',
        targetTick + halfPeriod
    );

    return {
      componentState: state,
      hasChanged: true,
      shouldCancelPending: false,
      scheduledEvents: [{
        targetId: component.id,
        scheduledAtTick: state.startTick,
        readyAtTick: state.expirationTick,
        type: 'tick',
        parameters: undefined,
      }],
    };
  }

  override onEventFiring(
      component: Component,
      state: ComponentState,
      event: IScheduledEvent
  ): IBehaviorResult {

    if(event.type !== 'tick'){
      return {
        componentState: state,
        hasChanged: false,
        shouldCancelPending: false,
        scheduledEvents: [],
      };
    }

    const halfPeriod = Number(component.config.get('halfPeriod'));
    state.setState(
        state.state === 'high' ? 'low': 'high',
        event.readyAtTick
    );
    state.setNextState(
        state.state === 'high' ? 'low': 'high',
        event.readyAtTick + halfPeriod
    );

    console.log(`Clock ticking to ${state.state}`);

    return {
      componentState: state,
      hasChanged: true,
      shouldCancelPending: true,
      scheduledEvents: [{
        targetId: component.id,
        scheduledAtTick: state.startTick,
        readyAtTick: state.expirationTick,
        type: 'tick',
        parameters: undefined,
      }],
    };
  }
}
