/**
 * Shared behavior scaffolding for multi-switch user input components
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { INodeElectricalState } from '../../states/types';
import type { UUID } from '../../../utils/types';
import { ENodeSourceType, type IPinMetadata } from '../../../topology/types';
import type { IScheduledEvent, IUserCommand } from '../../types';
import type { IBehaviorResult } from '../types';
import { ComponentBehaviorMixin, getTransitionSpan } from '../ComponentBehavior';
import { InputState } from '../../states/interface/InputState';

/**
 * Factorises the plumbing shared by `OneInput`, `TwoInput`, `FourInput` and
 * `EightInput` behaviors.
 *
 * These components only react to user actions (`toggle_input` commands) — they
 * have no logic inputs. The state encodes the current outputs as a hex value
 * (e.g. `'5'` = `0101` for FourInput); while at least one switch is moving the
 * state literal is `'moving'` and a parameter map tracks each pending switch
 * (`${index}` → `${target}-${startTick}-${endTick}`) plus the actual driving
 * value in `prevState`.
 *
 * Concurrency model:
 * - Toggling a different switch while another is still moving simply adds a
 *   new pending entry — both transitions resolve independently. No
 *   `shouldCancelPending`.
 * - Toggling the *same* switch a second time is debounced (the second command
 *   is silently ignored).
 * - Vcc loss collapses the state to `allLowState` and clears all pending
 *   transitions.
 *
 * @public
 */
export abstract class InputBehaviorMixin extends ComponentBehaviorMixin {
  override onPinsChange(
    component: Component,
    state: ComponentState,
    nodeStates: ReadonlyMap<UUID, INodeElectricalState>,
    targetTick: number
  ): IBehaviorResult {
    const newPinStates = this.getPinStates(component, nodeStates);
    state.pinStates = newPinStates;
    const inputState = state as InputState;

    if (newPinStates.get('vcc')!.hasVoltage) {
      return this.noChange(state);
    }

    if (inputState.state === inputState.allLowState && inputState.parameters.size === 0) {
      return this.noChange(state);
    }

    inputState.parameters.clear();
    inputState.setState(inputState.allLowState, targetTick);
    return {
      componentState: inputState,
      hasChanged: true,
      shouldCancelPending: true,
      scheduledEvents: [],
    };
  }

  override onUserCommand(
    component: Component,
    state: ComponentState,
    command: IUserCommand
  ): IBehaviorResult {
    if (command.type !== 'toggle_switch') return this.noChange(state);
    const inputState = state as InputState;

    const indexStr = command.parameters?.get('index');
    if (indexStr === undefined) return this.noChange(state);
    const index = parseInt(indexStr, 10);
    if (isNaN(index) || index < 0 || index >= inputState.outputCount) return this.noChange(state);

    // Vcc loss collapses the component — ignore user actions until vcc is back.
    const vccPin = inputState.pinStates.get('vcc');
    if (vccPin && !vccPin.hasVoltage) return this.noChange(state);

    // Debounce: ignore a second toggle of the same switch while it is moving.
    if (inputState.parameters.has(String(index))) return this.noChange(state);

    const startTick = command.scheduledAtTick;
    const span = getTransitionSpan(component.config);
    const endTick = startTick + span;

    const effective = inputState.effectiveState;
    const effValue = parseInt(effective, 16);
    const currentBit = (effValue >> index) & 1;
    const target: 0 | 1 = currentBit === 0 ? 1 : 0;

    if (!inputState.isInTransition) {
      inputState.parameters.set('prevState', effective);
      inputState.setState('moving', startTick);
    }
    inputState.parameters.set(String(index), `${target}-${startTick}-${endTick}`);

    const event: IScheduledEvent = {
      targetId: component.id,
      scheduledAtTick: startTick,
      readyAtTick: endTick,
      type: 'switchChanged',
      parameters: new Map([
        ['index', String(index)],
        ['target', String(target)],
      ]),
    };

    return {
      componentState: inputState,
      hasChanged: true,
      shouldCancelPending: false,
      scheduledEvents: [event],
    };
  }

  override onEventFiring(
    _component: Component,
    state: ComponentState,
    event: IScheduledEvent
  ): IBehaviorResult {
    if (event.type !== 'switchChanged') return this.noChange(state);

    const inputState = state as InputState;
    const indexStr = event.parameters?.get('index');
    const targetStr = event.parameters?.get('target');
    if (indexStr === undefined || targetStr === undefined) return this.noChange(state);

    const index = parseInt(indexStr, 10);
    if (isNaN(index) || !inputState.parameters.has(String(index))) {
      return this.noChange(state);
    }
    const target = parseInt(targetStr, 10) === 1 ? 1 : 0;

    const prevHex = inputState.parameters.get('prevState') ?? inputState.allLowState;
    let prevValue = parseInt(prevHex, 16);
    prevValue = (prevValue & ~(1 << index)) | (target << index);
    const newDriving = prevValue.toString(16).padStart(inputState.hexDigitCount, '0');

    inputState.parameters.delete(String(index));

    const stillMoving = Array.from(inputState.parameters.keys()).some((k) => k !== 'prevState');
    if (stillMoving) {
      inputState.parameters.set('prevState', newDriving);
      return {
        componentState: inputState,
        hasChanged: true,
        shouldCancelPending: false,
        scheduledEvents: [],
      };
    }

    inputState.parameters.delete('prevState');
    inputState.setState(newDriving, event.readyAtTick);
    return {
      componentState: inputState,
      hasChanged: true,
      shouldCancelPending: false,
      scheduledEvents: [],
    };
  }

  override allowConductivity(
    component: Component,
    state: ComponentState,
    _conductivityType: ENodeSourceType,
    pinId: string,
    otherPinId: string
  ): boolean {
    if (pinId === otherPinId) return true;
    const inputState = state as InputState;

    const pinMetadata = component.getPinMetadata(pinId);
    const otherPinMetadata = component.getPinMetadata(otherPinId);
    if (!pinMetadata || !otherPinMetadata) return false;

    let outputMeta: IPinMetadata | undefined;
    let outputCount = 0;
    if (pinMetadata.subtype === 'logicOutput') {
      outputCount++;
      outputMeta = pinMetadata;
    }
    if (otherPinMetadata.subtype === 'logicOutput') {
      outputCount++;
      outputMeta = otherPinMetadata;
    }
    if (outputCount !== 1 || !outputMeta?.logicPinData) return false;

    let vccCount = 0;
    vccCount += pinMetadata.subtype === 'vcc' ? 1 : pinMetadata.subtype === 'gnd' ? -1 : 0;
    vccCount += otherPinMetadata.subtype === 'vcc' ? 1 : otherPinMetadata.subtype === 'gnd' ? -1 : 0;
    if (vccCount !== 1 && vccCount !== -1) return false;

    const high = inputState.isOutputHigh(outputMeta.logicPinData.index);
    return high ? vccCount === 1 : vccCount === -1;
  }

  protected noChange(state: ComponentState): IBehaviorResult {
    return {
      componentState: state,
      hasChanged: false,
      shouldCancelPending: false,
      scheduledEvents: [],
    };
  }
}
