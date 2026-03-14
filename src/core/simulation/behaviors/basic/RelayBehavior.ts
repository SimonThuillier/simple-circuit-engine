/**
 * relay component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import {type IScheduledEvent, TRANSITION_DEFAULTS} from '../../types';
import {ComponentBehaviorMixin} from '../ComponentBehavior';
import { RelayState } from '../../states/basic/RelayState';

import type {IBehaviorResult, IComponentBehavior} from "../types";
import type {INodeElectricalState} from "../../states";
import type {UUID} from "../../../utils/types";
import {ComponentType, ENodeSourceType} from "../../../topology/types";

/**
 * Get the transition span from component config.
 * @param config - Component config map
 * @returns Number of ticks for transition (minimum 1)
 */
function getTransitionSpan(config: Map<string, string>): number {
  const value = parseInt(config.get('transitionSpan') || '', 10);
  if (isNaN(value) || value < 1) {
    return TRANSITION_DEFAULTS.TRANSITION_SPAN_TICKS;
  }
  return value;
}

/**
 * Behavior implementation for relays components.
 *
 * @public
 */
export class RelayBehavior extends ComponentBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.Relay);
  }

  /**
   * Create initial state for a relay.
   *
   * @param component - The Relay component
   * @returns Relay Initial state (open by default)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for RelayBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'closed' : 'open';
    return new RelayState(component.id, state);
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

    if (pinLabels.includes('cmd_in') && pinLabels.includes('cmd_out')) {
      return true;
    }
    if (pinLabels.includes('power_in') && pinLabels.includes('power_out')) {
      return state.state === 'closed' || state.state === 'opening';
    }
    return false;
  }

  /**
   * Relay cmd pins need to have voltage and current so that relay contactor stays closed
   * @param component
   * @param state
   * @param nodeStates
   * @param targetTick
   */
  override onPinsChange(
    component: Component,
    state: ComponentState,
    nodeStates: ReadonlyMap<UUID, INodeElectricalState>,
    targetTick: number
  ): IBehaviorResult {
    const pinStates = this.getPinStates(component, nodeStates);

    const isCommanded =
      (pinStates.get('cmd_in')!.hasVoltage && pinStates.get('cmd_in')!.hasCurrent) ||
      (pinStates.get('cmd_out')!.hasVoltage && pinStates.get('cmd_out')!.hasCurrent) ||
      (pinStates.get('cmd_in')!.hasVoltage && pinStates.get('cmd_out')!.hasCurrent) ||
      (pinStates.get('cmd_out')!.hasVoltage && pinStates.get('cmd_in')!.hasCurrent);

    const shouldBeClosed =
      component.config.get('activationLogic') === 'negative' ? !isCommanded : isCommanded;

    let hasChanged = false;
    const scheduledEvents: IScheduledEvent[] = [];
    const transitionSpan = getTransitionSpan(component.config);

    if (shouldBeClosed) {
      if (state.state === 'open' || state.state === 'opening') {
        hasChanged = true;
        state.state = 'closing';
        state.startTick = targetTick;
        scheduledEvents.push({
          targetId: component.id,
          scheduledAtTick: targetTick,
          readyAtTick: targetTick + transitionSpan,
          type: 'ClosingEnd',
          parameters: undefined,
        });
      }
    } else {
      if (state.state === 'closed' || state.state === 'closing') {
        hasChanged = true;
        state.state = 'opening';
        state.startTick = targetTick;
        scheduledEvents.push({
          targetId: component.id,
          scheduledAtTick: targetTick,
          readyAtTick: targetTick + transitionSpan,
          type: 'OpeningEnd',
          parameters: undefined,
        });
      }
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
