/**
 * Shared behavior scaffolding for input-driven multi-light components
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { INodeElectricalState } from '../../states/types';
import type { UUID } from '../../../utils/types';
import { ENodeSourceType, type IPinMetadata } from '../../../topology/types';
import type { IScheduledEvent } from '../../types';
import type { IBehaviorResult } from '../types';
import { ComponentBehaviorMixin, getTransitionSpan } from '../ComponentBehavior';
import { LightState } from '../../states/interface/LightState';

/**
 * Factorises the plumbing shared by `OneLight`, `TwoLight`, `FourLight` and
 * `EightLight` behaviors.
 *
 * These components mirror their `input-i` pins onto matching `output-i` pins
 * with a per-light `transitionSpan` delay. The state encodes the current
 * outputs as a hex value (e.g. `'5'` = `0101` for FourLight); while at least
 * one light is moving the state literal is `'moving'` and a parameter map
 * tracks each pending light (`${index}` → `${target}-${startTick}-${endTick}`)
 * plus the actual driving value in `prevState`.
 *
 * Guards (run first in `onPinsChange`):
 * - Vcc loss collapses the state to `allLowState` and clears all pending.
 * - Any ill-defined logic input switches the state to `'indeterminate'`.
 *
 * Concurrency model (per-light, independent transitions):
 * - When an input changes, the target output bit is recomputed; if it differs
 *   from the currently-driving (or already-pending) target a `lightChanged`
 *   event is scheduled with a per-light span.
 * - If the same input toggles while its light is still moving, the symmetric
 *   transition pattern shortens the new span to `Math.max(prevEnd - prevStart, 1)`
 *   and the in-flight event becomes a no-op (its readyAtTick no longer matches
 *   the pending entry).
 * - `shouldCancelPending: false` outside guards — other lights' transitions
 *   keep their schedule.
 *
 * @public
 */
export abstract class LightBehaviorMixin extends ComponentBehaviorMixin {
  override onPinsChange(
    component: Component,
    state: ComponentState,
    nodeStates: ReadonlyMap<UUID, INodeElectricalState>,
    targetTick: number
  ): IBehaviorResult {
    const newPinStates = this.getPinStates(component, nodeStates);
    state.pinStates = newPinStates;
    const lightState = state as LightState;

    const vccGuard = this.vccGuardBehavior(lightState, newPinStates, targetTick);
    if (vccGuard) return vccGuard;

    const nonLogicGuard = this.nonLogicInputGuardBehavior(lightState, newPinStates, targetTick);
    if (nonLogicGuard) return nonLogicGuard;

    return this.scheduleInputTransitions(component, lightState, newPinStates, targetTick);
  }

  override onEventFiring(
    _component: Component,
    state: ComponentState,
    event: IScheduledEvent
  ): IBehaviorResult {
    if (event.type !== 'lightChanged') return this.noChange(state);

    const lightState = state as LightState;
    const indexStr = event.parameters?.get('index');
    const targetStr = event.parameters?.get('target');
    if (indexStr === undefined || targetStr === undefined) return this.noChange(state);

    const index = parseInt(indexStr, 10);
    if (isNaN(index)) return this.noChange(state);

    const pending = lightState.getPendingMove(index);
    if (!pending) return this.noChange(state);
    // Symmetric retoggle: the pending entry has been replaced by a newer one
    // that will land on a later event firing — drop this stale event.
    if (pending.endTick !== event.readyAtTick) return this.noChange(state);

    const target = pending.target;
    const prevHex = lightState.parameters.get('prevState') ?? lightState.allLowState;
    let prevValue = parseInt(prevHex, 16);
    prevValue = (prevValue & ~(1 << index)) | (target << index);
    const newDriving = prevValue.toString(16).padStart(lightState.hexDigitCount, '0');

    lightState.parameters.delete(String(index));

    const stillMoving = Array.from(lightState.parameters.keys()).some((k) => k !== 'prevState');
    if (stillMoving) {
      lightState.parameters.set('prevState', newDriving);
      return {
        componentState: lightState,
        hasChanged: true,
        shouldCancelPending: false,
        scheduledEvents: [],
      };
    }

    lightState.parameters.delete('prevState');
    lightState.setState(newDriving, event.readyAtTick);
    return {
      componentState: lightState,
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
    const lightState = state as LightState;
    if (lightState.effectiveState === 'indeterminate') return false;

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

    const high = lightState.isOutputHigh(outputMeta.logicPinData.index);
    return high ? vccCount === 1 : vccCount === -1;
  }

  /**
   * On vcc loss: drop all outputs low immediately and clear any pending
   * transitions. Returns `null` when vcc is present so callers can proceed.
   */
  protected vccGuardBehavior(
    state: LightState,
    pinStates: Map<string, INodeElectricalState>,
    targetTick: number
  ): IBehaviorResult | null {
    if (pinStates.get('vcc')!.hasVoltage) return null;

    if (state.state === state.allLowState && state.parameters.size === 0) {
      return this.noChange(state);
    }
    state.parameters.clear();
    state.setState(state.allLowState, targetTick);
    return {
      componentState: state,
      hasChanged: true,
      shouldCancelPending: true,
      scheduledEvents: [],
    };
  }

  /**
   * Scan all logic inputs; if any is ill-defined (both voltage and ground, or
   * neither), switch to `'indeterminate'` immediately and clear any pending
   * transitions. Otherwise returns `null` so the caller can proceed.
   */
  protected nonLogicInputGuardBehavior(
    state: LightState,
    pinStates: Map<string, INodeElectricalState>,
    targetTick: number
  ): IBehaviorResult | null {
    const pinsMeta = this.typeMetadata.pins;
    let activateGuard = false;
    for (const [pinLabel, pinState] of pinStates) {
      const pinMeta = pinsMeta.get(pinLabel);
      if (!pinMeta || pinMeta.subtype !== 'logicInput') continue;
      const bothOrNeither =
        (pinState.hasVoltage && pinState.hasCurrent) ||
        (!pinState.hasVoltage && !pinState.hasCurrent);
      if (bothOrNeither) {
        activateGuard = true;
        break;
      }
    }
    if (!activateGuard) return null;

    if (state.state === 'indeterminate' && state.parameters.size === 0) {
      return this.noChange(state);
    }
    state.parameters.clear();
    state.setState('indeterminate', targetTick);
    return {
      componentState: state,
      hasChanged: true,
      shouldCancelPending: true,
      scheduledEvents: [],
    };
  }

  /**
   * For each logic input, compute the desired output bit and schedule a
   * per-light `lightChanged` event whenever that bit differs from the current
   * effective (or already-pending) target.
   */
  protected scheduleInputTransitions(
    component: Component,
    state: LightState,
    pinStates: Map<string, INodeElectricalState>,
    targetTick: number
  ): IBehaviorResult {
    const transitionSpan = getTransitionSpan(component.config);
    const effective =
      state.effectiveState === 'indeterminate' ? state.allLowState : state.effectiveState;
    const effectiveValue = parseInt(effective, 16);

    const scheduledEvents: IScheduledEvent[] = [];
    let hasChanged = false;

    for (let i = 0; i < state.lightCount; i++) {
      const inputPin = pinStates.get(`input-${i}`);
      if (!inputPin) continue;
      const target: 0 | 1 = inputPin.hasVoltage ? 1 : 0;

      const pending = state.getPendingMove(i);
      const currentBit = ((effectiveValue >> i) & 1) as 0 | 1;

      if (pending) {
        if (pending.target === target) continue;
        // Symmetric retoggle — shorten the span to mirror the elapsed motion.
        const span = Math.max(pending.endTick - pending.startTick, 1);
        const startTick = targetTick;
        const endTick = startTick + span;
        state.parameters.set(String(i), `${target}-${startTick}-${endTick}`);
        scheduledEvents.push({
          targetId: component.id,
          scheduledAtTick: startTick,
          readyAtTick: endTick,
          type: 'lightChanged',
          parameters: new Map([
            ['index', String(i)],
            ['target', String(target)],
          ]),
        });
        hasChanged = true;
        continue;
      }

      if (currentBit === target) continue;

      const startTick = targetTick;
      const endTick = startTick + transitionSpan;
      if (!state.isInTransition) {
        state.parameters.set('prevState', effective);
        state.setState('moving', startTick);
      }
      state.parameters.set(String(i), `${target}-${startTick}-${endTick}`);
      scheduledEvents.push({
        targetId: component.id,
        scheduledAtTick: startTick,
        readyAtTick: endTick,
        type: 'lightChanged',
        parameters: new Map([
          ['index', String(i)],
          ['target', String(target)],
        ]),
      });
      hasChanged = true;
    }

    if (!hasChanged) return this.noChange(state);

    return {
      componentState: state,
      hasChanged: true,
      shouldCancelPending: false,
      scheduledEvents,
    };
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
