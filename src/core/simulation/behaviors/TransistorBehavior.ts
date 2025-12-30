/**
 * transistor component behavior implementation
 * @module core/simulation/behaviors
 */

import type { UUID } from '@/core/types/Identifier.js';
import type { ComponentBehavior, BehaviorResult } from './ComponentBehavior.js';
import type { Component } from '@/core/Component.js';
import type { ComponentState } from '../states/ComponentState.js';
import { ComponentType } from '@/core/types/ComponentType';
import { TransistorState } from '@/core/simulation/states/TransistorState';
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
 * Behavior implementation for transistors components.
 *
 * @public
 */
export class TransistorBehavior implements ComponentBehavior {
  readonly componentType = ComponentType.Transistor;

  /**
   * Create initial state for a transistor.
   *
   * @param component - The Transistor component
   * @returns Transistor Initial state (open by default)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== ComponentType.Transistor) {
      throw new Error(`Invalid component type for TransistorBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative'? 'closed': 'open';
    return new TransistorState(component.id, state);
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

    if(pinLabels.includes('collector') &&
        pinLabels.includes('emitter')){
      return state.state === 'closed' || state.state === 'opening';
    }
    return false;
  }

  /**
   * Transistor Base need to have only voltage so that transistor contactor stays closed
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

    const isCommanded = pinStates.get('base')!.hasVoltage;

    const shouldConduct = component.config.get('activationLogic') === 'negative'
        ? !isCommanded: isCommanded;

    let hasChanged = false;
    const scheduledEvents: ScheduledEvent[] = [];
    const transitionSpan = getTransitionSpan(component.config);

    if (shouldConduct) {
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

  onUserCommand(_component: Component, state: ComponentState, _command: UserCommand): BehaviorResult {
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
