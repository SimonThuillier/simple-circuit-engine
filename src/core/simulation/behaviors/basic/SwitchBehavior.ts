/**
 * switch component behavior implementation
 * @module core/simulation/behaviors
 */

import type { UUID } from '../../../types/Identifier';
import type { Component } from '../../../Component';
import type { ENodeSourceType } from '../../../types/ENodeSourceType';
import type { NodeElectricalState, ComponentState } from '../../states';
import { SwitchState } from '../../states';
import type { ScheduledEvent, UserCommand } from '../../types';
import type { ComponentBehavior, BehaviorResult } from '../ComponentBehavior';
import { ComponentType } from '../../../types/ComponentType';
import { TRANSITION_DEFAULTS } from '../../types';

/**
 * Get the tick count from command parameters.
 * @param parameters - Command parameters map
 * @returns Number of ticks for transition (minimum 1)
 */
function getTickCount(parameters: Map<string, string> | null | undefined): number {
  if (!parameters) {
    return TRANSITION_DEFAULTS.TRANSITION_SPAN_TICKS;
  }
  const value = parseInt(parameters.get('tickCount') || '', 10);
  if (isNaN(value) || value < 1) {
    return TRANSITION_DEFAULTS.TRANSITION_SPAN_TICKS;
  }
  return value;
}

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
   * @param _component
   * @param componentState
   * @param _nodeStates
   * @param _targetTick
   */
  onPinsChange(
    _component: Component,
    componentState: ComponentState,
    _nodeStates: ReadonlyMap<UUID, NodeElectricalState>,
    _targetTick: number
  ): BehaviorResult {
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

      const tickCount = getTickCount(command.parameters);
      scheduledEvents.push({
        targetId: component.id,
        scheduledAtTick: state.startTick,
        readyAtTick: state.startTick + tickCount,
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
