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
import {unionElectricalStates, type INodeElectricalState} from "../../states";
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
    const newPinStates = this.getPinStates(component, nodeStates);
    newPinStates.set('cmd_in*cmd_out', unionElectricalStates(
        newPinStates.get('cmd_in')!, newPinStates.get('cmd_out')!));
    newPinStates.set('power_in*power_out', unionElectricalStates(
        newPinStates.get('power_in')!, newPinStates.get('power_out')!));
    const prevPinStates = state.pinStates;
    state.pinStates = newPinStates;
    const changedPins = this.getChangedPins(newPinStates, prevPinStates);

    const cmdUnion = newPinStates.get('cmd_in*cmd_out')!;
    const isCommanded = cmdUnion.hasVoltage && cmdUnion.hasCurrent;
    const shouldBeClosed =
        component.config.get('activationLogic') === 'negative' ? !isCommanded : isCommanded;

    let hasChanged = changedPins.size > 0;
    const scheduledEvents: IScheduledEvent[] = [];
    const transitionSpan = getTransitionSpan(component.config);

    if (shouldBeClosed) {
      if (state.state === 'open' || state.state === 'opening') {
        // test to handle input transitions faster than component's own transitionSpan
        let span = state.state === 'open' ? transitionSpan : Math.max(targetTick - state.startTick, 1);
        hasChanged = true;
        state.setState('closing', targetTick);
        state.setNextState('closed', targetTick + span);
        scheduledEvents.push({
          targetId: component.id,
          scheduledAtTick: state.startTick,
          readyAtTick: state.expirationTick,
          type: 'ClosingEnd',
          parameters: new Map([['exclusive', 'true']]),
        });
      }
    } else {
      if (state.state === 'closed' || state.state === 'closing') {
        // test to handle input transitions faster than component's own transitionSpan
        let span = state.state === 'closed' ? transitionSpan : Math.max(targetTick - state.startTick, 1);
        hasChanged = true;
        state.setState('opening', targetTick);
        state.setNextState('open', targetTick + span);
        scheduledEvents.push({
          targetId: component.id,
          scheduledAtTick: state.startTick,
          readyAtTick: state.expirationTick,
          type: 'OpeningEnd',
          parameters: new Map([['exclusive', 'true']]),
        });
      }
    }

    return {
      componentState: state,
      hasChanged: hasChanged,
      shouldCancelPending: hasChanged,
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
