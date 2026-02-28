/**
 * AND Gate component behavior implementation
 * @module core/simulation/behaviors
 */

import type { UUID } from '../../../types/Identifier';
import type { Component } from '../../../Component';
import type { ENodeSourceType } from '../../../types/ENodeSourceType';
import type { NodeElectricalState } from '../../states/basic/NodeElectricalState';
import type { ComponentState } from '../../states/ComponentState';
import type { ScheduledEvent, UserCommand } from '../../types';
import type { ComponentBehavior, BehaviorResult } from '../ComponentBehavior';
import { AndGateState } from '../../states/gates/AndGateState';
import { ComponentType } from '../../../types/ComponentType';
import { TRANSITION_DEFAULTS } from '../../types/SimulationConstants';

/**
 * Behavior implementation for AND Gate components.
 * With positive activationLogic: AND gate (output high when ALL inputs are high).
 * With negative activationLogic: NAND gate (output high when ANY input is low).
 *
 * @public
 */
export class AndGateBehavior implements ComponentBehavior {
  readonly componentType: ComponentType = ComponentType.AndGate;

  /**
   * Create initial state for an AND Gate.
   *
   * @param component - The AND Gate component
   * @returns Initial state (low by default, high for negative activation logic)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== ComponentType.AndGate) {
      throw new Error(`Invalid component type for AndGateBehavior: ${component.type}`);
    }
    const state = component.config.get('activationLogic') === 'negative' ? 'high' : 'low';
    return new AndGateState(component.id, state);
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

    if (pinLabels.includes('vcc') && pinLabels.includes('output')) {
      return state.state === 'high' || state.state === 'falling';
    }
    return false;
  }

  /**
   * Get the transition span from component config.
   * @param config - Component config map
   * @returns Number of ticks for transition (minimum 1)
   */
  protected getTransitionSpan(config: Map<string, string>): number {
    const value = parseInt(config.get('transitionSpan') || '', 10);
    if (isNaN(value) || value < 1) {
      return TRANSITION_DEFAULTS.TRANSITION_SPAN_TICKS;
    }
    return value;
  }

  /**
   * AND gate output goes high when ALL inputs have voltage.
   * With negative activationLogic (NAND), output goes high when ANY input lacks voltage.
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

    const allInputsHigh =
      pinStates.get('input1')!.hasVoltage && pinStates.get('input2')!.hasVoltage;

    const shouldConduct =
      component.config.get('activationLogic') === 'negative' ? !allInputsHigh : allInputsHigh;

    let hasChanged = false;
    const scheduledEvents: ScheduledEvent[] = [];
    const transitionSpan = this.getTransitionSpan(component.config);

    if (shouldConduct) {
      if (state.state === 'low' || state.state === 'falling') {
        hasChanged = true;
        state.state = 'rising';
        state.startTick = targetTick;
        scheduledEvents.push({
          targetId: component.id,
          scheduledAtTick: targetTick,
          readyAtTick: targetTick + transitionSpan,
          type: 'RisingComplete',
          parameters: undefined,
        });
      }
    } else {
      if (state.state === 'high' || state.state === 'rising') {
        hasChanged = true;
        state.state = 'falling';
        state.startTick = targetTick;
        scheduledEvents.push({
          targetId: component.id,
          scheduledAtTick: targetTick,
          readyAtTick: targetTick + transitionSpan,
          type: 'FallingComplete',
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

    if (event.type === 'RisingComplete') {
      if (state.state !== 'high') {
        hasChanged = true;
        state.startTick = event.readyAtTick;
        state.state = 'high';
      }
    } else if (event.type === 'FallingComplete') {
      if (state.state !== 'low') {
        hasChanged = true;
        state.startTick = event.readyAtTick;
        state.state = 'low';
      }
    }

    return {
      componentState: state,
      hasChanged: hasChanged,
      scheduledEvents: [],
    };
  }
}
