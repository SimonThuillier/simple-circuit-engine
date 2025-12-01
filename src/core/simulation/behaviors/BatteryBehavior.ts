/**
 * Battery component behavior implementation
 * @module core/simulation/behaviors
 */

import type { UUID } from '@/core/types/Identifier.js';
import type { ComponentBehavior, BehaviorResult } from './ComponentBehavior.js';
import type { Component } from '@/core/Component.js';
import { BatteryState } from '../states/BatteryState.js';
import type { ComponentState } from '../states/ComponentState.js';
import { ComponentType } from '@/core/types/ComponentType';
import type { ENodeSourceType } from '@/core/types/ENodeSourceType';
import type { NodeElectricalState, ScheduledEvent, UserCommand } from '@/core/simulation';

export class BatteryBehavior implements ComponentBehavior {
  readonly componentType = ComponentType.Battery;

  /**
   * Create initial state for a battery.
   *
   * @param component - The Battery component
   * @returns Battery Initial state (always active and delivering voltage)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== ComponentType.Battery) {
      throw new Error(`Invalid component type for BatteryBehavior: ${component.type}`);
    }
    return new BatteryState(component.id);
  }

  allowConductivity(
    _component: Component,
    _state: ComponentState,
    _conductivityType: ENodeSourceType,
    _pinId: string,
    _otherPinId: string
  ): boolean {
    return false;
  }

  /**
   * Batteries are always on, and their pins are locked so this is more of a decorative function
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
    _event: ScheduledEvent
  ): BehaviorResult {
    return {
      componentState: state,
      hasChanged: false,
      scheduledEvents: [],
    };
  }
}
