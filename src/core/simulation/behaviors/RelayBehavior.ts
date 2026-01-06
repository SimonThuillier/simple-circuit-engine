/**
 * relay component behavior implementation
 * @module core/simulation/behaviors
 */

import type { UUID } from '@/core/types/Identifier.js';
import type { ComponentBehavior, BehaviorResult } from './ComponentBehavior.js';
import type { Component } from '@/core/Component.js';
import type { ComponentState } from '../states/ComponentState.js';
import { ComponentType } from '@/core/types/ComponentType';
import { RelayState } from '@/core/simulation/states/RelayState';
import type { ENodeSourceType } from '@/core/types/ENodeSourceType';
import type { NodeElectricalState, ScheduledEvent, UserCommand } from '@/core/simulation';
import { TRANSITION_DEFAULTS } from '../types/SimulationConstants';

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
export class RelayBehavior implements ComponentBehavior {
  readonly componentType = ComponentType.Relay;

  /**
   * Create initial state for a relay.
   *
   * @param component - The Relay component
   * @returns Relay Initial state (open by default)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== ComponentType.Relay) {
      throw new Error(`Invalid component type for RelayBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'closed' : 'open';
    return new RelayState(component.id, state);
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

    const isCommanded =
      (pinStates.get('cmd_in')!.hasVoltage && pinStates.get('cmd_in')!.hasCurrent) ||
      (pinStates.get('cmd_out')!.hasVoltage && pinStates.get('cmd_out')!.hasCurrent) ||
      (pinStates.get('cmd_in')!.hasVoltage && pinStates.get('cmd_out')!.hasCurrent) ||
      (pinStates.get('cmd_out')!.hasVoltage && pinStates.get('cmd_in')!.hasCurrent);

    const shouldBeClosed =
      component.config.get('activationLogic') === 'negative' ? !isCommanded : isCommanded;

    let hasChanged = false;
    const scheduledEvents: ScheduledEvent[] = [];
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
      scheduledEvents: [],
    };
  }
}
