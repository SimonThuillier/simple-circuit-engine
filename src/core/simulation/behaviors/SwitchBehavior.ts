/**
 * switch component behavior implementation
 * @module core/simulation/behaviors
 */

import type { UUID } from '@/core/types/Identifier.js';
import type { ComponentBehavior, BehaviorResult } from './ComponentBehavior.js';
import type { Component } from '@/core/Component.js';
import type { ComponentState } from '../states/ComponentState.js';
import { ComponentType } from '@/core/types/ComponentType';
import { SwitchState } from '@/core/simulation/states/SwitchState';
import type { ENodeSourceType } from '@/core/types/ENodeSourceType';
import type { NodeElectricalState, ScheduledEvent, UserCommand } from '@/core/simulation';

/**
 * Behavior implementation for switches components.
 *
 * @public
 */
export class SwitchBehavior implements ComponentBehavior {
  readonly componentType = ComponentType.Switch;

  /**
   * Create initial state for a switch.
   *
   * @param component - The Switch component
   * @returns Switch Initial state (open by default)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== ComponentType.Switch) {
      throw new Error(`Invalid component type for SwitchBehavior: ${component.type}`);
    }
    const state = component.config.get('initialState') || 'open';
    return new SwitchState(component.id, state);
  }

  allowConductivity(
    _component: Component,
    _state: ComponentState,
    _conductivityType: ENodeSourceType,
    _pinId: string,
    _otherPinId: string
  ): boolean {
    return _state.state === 'closed' || _state.state === 'opening';
  }

  /**
   * Switches states depend on user interaction, not their pins so this is more of a decorative function
   * @param component
   * @param componentState
   * @param nodeStates
   * @param _targetTick
   */
  onPinsChange(
    component: Component,
    componentState: ComponentState,
    nodeStates: ReadonlyMap<UUID, NodeElectricalState>,
    _targetTick: number
  ): BehaviorResult {
    const pinStates: Map<string, NodeElectricalState> = new Map();

    for (const pinId in component.pins) {
      pinStates.set(component.getPinLabel(pinId)!, nodeStates.get(pinId as UUID)!);
    }

    return {
      componentState: componentState,
      hasChanged: false,
      scheduledEvents: [],
    };
  }

  onUserCommand(component: Component, state: ComponentState, command: UserCommand): BehaviorResult {
    let hasChanged = false;
    const scheduledEvents: ScheduledEvent[] = [];

    if (command.type === 'toggle_switch' && ['open', 'closed'].includes(state.state)) {
      state.state = state.state === 'open' ? 'closing' : 'opening';
      state.startTick = command.scheduledAtTick + 1;
      hasChanged = true;

      scheduledEvents.push({
        targetId: component.id,
        scheduledAtTick: state.startTick,
        readyAtTick: state.startTick + 1, // TODO handle component config later
        type: state.state === 'closing' ? 'ClosingEnd' : 'OpeningEnd',
        parameters: undefined,
      });
    }

    return {
      componentState: state,
      hasChanged: hasChanged,
      scheduledEvents: scheduledEvents,
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
