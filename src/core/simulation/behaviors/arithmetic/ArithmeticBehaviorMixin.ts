/**
 * Shared behavior scaffolding for arithmetic components
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import { ComponentState } from '../../states/ComponentState';
import type { INodeElectricalState } from '../../states/types';
import type { UUID } from '../../../utils/types';
import { ENodeSourceType, type IPinMetadata } from '../../../topology/types';
import type { IBehaviorResult } from '../types';
import type { IScheduledEvent } from '../../types';
import { ComponentBehaviorMixin, getTransitionSpan } from '../ComponentBehavior';
import { ArithmeticState } from '../../states/arithmetic/ArithmeticState';

/**
 * Factorises the common plumbing of arithmetic component behaviors:
 *
 * - `vccGuardBehavior` — on vcc loss, drop all outputs low immediately.
 * - `nonLogicInputGuardBehavior` — on any ill-defined logic input, go to
 *   `'indeterminate'` immediately.
 * - `onPinsChange` is a **template method** that runs the guards then calls
 *   `computeTargetStableState` (subclass-provided) and schedules the
 *   transition via `scheduleTransition`.
 * - `scheduleTransition` — encode the `to${target}` transient state, schedule
 *   the completion event and preserve the previous stable state in
 *   `parameters.prevState` so `allowConductivity` keeps the old outputs
 *   energized until the transition fires.
 * - `onEventFiring` — land on the target stable state when the scheduled
 *   transition completes.
 * - `allowConductivity` — generic per-output lookup driven by
 *
 * Subclasses must declare `outputPinLabels` in the **same order** as the
 * state encoding used by their {@link ArithmeticState} subclass and
 * implement `computeTargetStableState` to turn the current input pins into
 * that encoding.
 */
export abstract class ArithmeticBehaviorMixin extends ComponentBehaviorMixin {
  /**
   * Compute the target stable-state encoding from the current pin states.
   * Called only after vcc / non-logic guards have passed.
   */
  protected abstract computeTargetStableState(
    pinStates: Map<string, INodeElectricalState>
  ): string;

  override onPinsChange(
    component: Component,
    state: ComponentState,
    nodeStates: ReadonlyMap<UUID, INodeElectricalState>,
    targetTick: number
  ): IBehaviorResult {
    const newPinStates = this.getPinStates(component, nodeStates);
    state.pinStates = newPinStates;
    const arithState = state as ArithmeticState;

    const vccGuard = this.vccGuardBehavior(arithState, newPinStates, targetTick);
    if (vccGuard) return vccGuard;

    const nonLogicGuard = this.nonLogicInputGuardBehavior(arithState, newPinStates, targetTick);
    if (nonLogicGuard) return nonLogicGuard;

    const targetState = this.computeTargetStableState(newPinStates);
    return this.scheduleTransition(component, arithState, targetState, targetTick);
  }

  override onEventFiring(
    _component: Component,
    state: ComponentState,
    event: IScheduledEvent
  ): IBehaviorResult {
    if (!event.type.startsWith('to')) {
      return this.noChange(state);
    }
    const targetState = event.type.slice(2);
    if (state.state === targetState) {
      return this.noChange(state);
    }
    state.setState(targetState, event.readyAtTick);
    state.parameters.delete('prevState');
    return {
      componentState: state,
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
    const effective = (state as ArithmeticState).effectiveState;
    if (effective === 'indeterminate') return false;

    const pinMetadata = component.getPinMetadata(pinId);
    const otherPinMetadata = component.getPinMetadata(otherPinId);
    if (!pinMetadata || !otherPinMetadata) return false;

    // Exactly one pin must be a logicOutput, the other must be vcc or gnd
    let outputMeta: IPinMetadata | undefined;
    let logicOutputCount = 0;
    if (pinMetadata.subtype === 'logicOutput') { logicOutputCount++; outputMeta = pinMetadata; }
    if (otherPinMetadata.subtype === 'logicOutput') { logicOutputCount++; outputMeta = otherPinMetadata; }
    if (logicOutputCount !== 1 || !outputMeta?.logicPinData) return false;

    let vccCount = 0;
    vccCount += pinMetadata.subtype === 'vcc' ? 1 : pinMetadata.subtype === 'gnd' ? -1 : 0;
    vccCount += otherPinMetadata.subtype === 'vcc' ? 1 : otherPinMetadata.subtype === 'gnd' ? -1 : 0;
    if (vccCount !== 1 && vccCount !== -1) return false;

    // Convention: sum at bit 2*index (even), carry/carryOut at outputCount-1
    const arithState = state as ArithmeticState;
    const stateValue = parseInt(effective, 16);
    const isSumPin = outputMeta.logicPinData.interface === 'sum';
    const bitPos = isSumPin ? outputMeta.logicPinData.index * 2 : arithState.outputCount - 1;
    const high = ((stateValue >> bitPos) & 1) === 1;
    return high ? vccCount === 1 : vccCount === -1;
  }

  /**
   * On vcc loss: all outputs go low immediately.
   * Returns `null` when vcc is present so callers can proceed.
   */
  protected vccGuardBehavior(
    state: ArithmeticState,
    pinStates: Map<string, INodeElectricalState>,
    targetTick: number
  ): IBehaviorResult | null {
    if (pinStates.get('vcc')!.hasVoltage) return null;

    const allLow = state.allLowState;
    if (state.state === allLow) {
      return {
        componentState: state,
        hasChanged: false,
        shouldCancelPending: false,
        scheduledEvents: [],
      };
    }
    state.setState(allLow, targetTick);
    state.parameters.delete('prevState');
    return {
      componentState: state,
      hasChanged: true,
      shouldCancelPending: true,
      scheduledEvents: [],
    };
  }

  /**
   * Scan all logic inputs; if any is ill-defined (both voltage and ground,
   * or neither), switch to `'indeterminate'` immediately. Otherwise returns
   * `null` so the caller can proceed.
   */
  protected nonLogicInputGuardBehavior(
    state: ArithmeticState,
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

    if (state.state === 'indeterminate') {
      return {
        componentState: state,
        hasChanged: false,
        shouldCancelPending: false,
        scheduledEvents: [],
      };
    }
    state.setState('indeterminate', targetTick);
    state.parameters.delete('prevState');
    return {
      componentState: state,
      hasChanged: true,
      shouldCancelPending: true,
      scheduledEvents: [],
    };
  }

  /**
   * Schedule a transition toward the given stable target state. If already
   * there (or already heading there) returns a no-change result.
   *
   * Preserves the currently-driving stable state in `parameters.prevState` so
   * `allowConductivity` keeps the old outputs energized until the scheduled
   * event fires. When the previous effective state is `'indeterminate'` the
   * fallback is all-zeros.
   */
  protected scheduleTransition(
    component: Component,
    state: ArithmeticState,
    targetState: string,
    targetTick: number
  ): IBehaviorResult {
    const targetTransition = `to${targetState}`;
    if (state.state === targetState || state.state === targetTransition) {
      return this.noChange(state);
    }

    const transitionSpan = getTransitionSpan(component.config);
    const span =
      state.expirationTick < 1 ? transitionSpan : Math.max(targetTick - state.startTick, 1);

    const currentEffective = state.effectiveState;
    const prevStable =
      currentEffective === 'indeterminate' ? state.allLowState : currentEffective;

    state.setState(targetTransition, targetTick);
    state.setNextState(targetState, targetTick + span);
    state.parameters.set('prevState', prevStable);

    return {
      componentState: state,
      hasChanged: true,
      shouldCancelPending: true,
      scheduledEvents: [
        {
          targetId: component.id,
          scheduledAtTick: state.startTick,
          readyAtTick: state.expirationTick,
          type: targetTransition,
          parameters: undefined,
        },
      ],
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
