/**
 * 8-Bit Ripple Carry Adder component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { INodeElectricalState } from '../../states/types';
import type { IComponentBehavior, IBehaviorResult } from '../types';
import type { IScheduledEvent } from '../../types';
import type { UUID } from '../../../utils/types';
import { ComponentType } from '../../../topology/types';
import { EightBitAdderState } from '../../states/arithmetic/EightBitAdderState';
import { ArithmeticBehaviorMixin } from './ArithmeticBehaviorMixin';
import { getTransitionSpan } from '../ComponentBehavior';

/** Number of full-adder stages in the 8-bit ripple carry adder. */
const STAGE_COUNT = 8;

/**
 * Behavior for the 8-bit ripple carry adder (8 full adders in series).
 *
 * Unlike the single full adder whose output settles in one transition, the
 * 8-bit adder models **carry propagation**: when inputs change, only stage 0
 * recomputes immediately (with its own propagation delay); the carry then
 * ripples through stages 1–7, one `transitionSpan` per stage.
 *
 * ### State encoding
 *
 * 16 interleaved bits `C7S7 C6S6 … C1S1 C0S0` stored as a 4-digit hex
 * string. Sum at bit `2*i`, carry at bit `2*i+1`.
 * See {@link EightBitAdderState}.
 *
 * ### Ripple algorithm
 *
 * - **`onPinsChange`**: computes ALL 8 stages with new inputs but **old
 *   carries** from the current effective state, producing an intermediate
 *   state. Schedules one event for carry propagation starting at stage 1.
 *   Uses `shouldCancelPending: true` to restart the ripple cleanly when
 *   inputs change mid-propagation.
 *
 * - **`onEventFiring`**: lands on the intermediate, then checks whether the
 *   next stage's carry-in changed. If so, recomputes that stage, builds the
 *   next intermediate, and schedules the following stage. If not, the carry
 *   has stopped and the state is stable. Uses `shouldCancelPending: false`.
 *
 * - **Initialization shortcut**: at `targetTick === 0` the full stable state
 *   is computed directly via {@link computeTargetStableState} to avoid the
 *   init-loop limitation where chained events are dropped.
 *
 * @public
 */
export class EightBitAdderBehavior extends ArithmeticBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.EightBitAdder);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for EightBitAdderBehavior: ${component.type}`);
    }
    return new EightBitAdderState(component.id, '0000');
  }

  // ── onPinsChange ──────────────────────────────────────────────────────

  override onPinsChange(
    component: Component,
    state: ComponentState,
    nodeStates: ReadonlyMap<UUID, INodeElectricalState>,
    targetTick: number
  ): IBehaviorResult {
    const newPinStates = this.getPinStates(component, nodeStates);
    state.pinStates = newPinStates;
    const arithState = state as EightBitAdderState;

    const vccGuard = this.vccGuardBehavior(arithState, newPinStates, targetTick);
    if (vccGuard) return vccGuard;

    const nonLogicGuard = this.nonLogicInputGuardBehavior(arithState, newPinStates, targetTick);
    if (nonLogicGuard) return nonLogicGuard;

    // At initialization the CircuitRunner init loop drops chained events,
    // so compute the full stable state directly to avoid stuck transitions.
    if (targetTick === 0) {
      const finalState = this.computeTargetStableState(newPinStates);
      return this.scheduleTransition(component, arithState, finalState, targetTick);
    }

    // ── Normal ripple logic ──
    const effective = arithState.effectiveState;
    const effectiveValue = effective === 'indeterminate' ? 0 : parseInt(effective, 16);

    const carryIn = newPinStates.get('carryIn')!.hasVoltage;
    let stateValue = 0;

    for (let i = 0; i < STAGE_COUNT; i++) {
      const a = newPinStates.get(`inputA-${i}`)!.hasVoltage;
      const b = newPinStates.get(`inputB-${i}`)!.hasVoltage;
      const cin = i === 0 ? carryIn : ((effectiveValue >> (2 * (i - 1) + 1)) & 1) === 1;
      const { sum, carry } = computeStage(a, b, cin);
      stateValue = buildStateWithStageUpdate(stateValue, i, sum, carry);
    }

    const intermediate = stateToHex(stateValue);
    if (intermediate === effective) return this.noChange(state);

    const span = getTransitionSpan(component.config);
    const prevStable = effective === 'indeterminate' ? arithState.allLowState : effective;

    arithState.setState(`to${intermediate}`, targetTick);
    arithState.setNextState(intermediate, targetTick + span);
    arithState.parameters.set('prevState', prevStable);

    return {
      componentState: arithState,
      hasChanged: true,
      shouldCancelPending: true,
      scheduledEvents: [{
        targetId: component.id,
        scheduledAtTick: targetTick,
        readyAtTick: targetTick + span,
        type: `to${intermediate}`,
        parameters: new Map([['nextStage', '1']]),
      }],
    };
  }

  // ── onEventFiring ─────────────────────────────────────────────────────

  override onEventFiring(
    component: Component,
    state: ComponentState,
    event: IScheduledEvent
  ): IBehaviorResult {
    if (!event.type.startsWith('to')) return this.noChange(state);

    const targetState = event.type.slice(2);
    const nextStage = parseInt(event.parameters?.get('nextStage') ?? `${STAGE_COUNT}`);
    const arithState = state as EightBitAdderState;

    if (arithState.state === targetState) return this.noChange(arithState);

    // Land on the intermediate state
    arithState.setState(targetState, event.readyAtTick);
    arithState.parameters.delete('prevState');

    // No more stages to propagate → stable
    if (nextStage >= STAGE_COUNT) {
      return { componentState: arithState, hasChanged: true, shouldCancelPending: false, scheduledEvents: [] };
    }

    // Check whether carry needs to propagate into nextStage
    const stateValue = parseInt(targetState, 16);
    const carryFromPrev = ((stateValue >> (2 * (nextStage - 1) + 1)) & 1) === 1;

    const aHigh = arithState.pinStates.get(`inputA-${nextStage}`)!.hasVoltage;
    const bHigh = arithState.pinStates.get(`inputB-${nextStage}`)!.hasVoltage;
    const { sum: newSum, carry: newCarry } = computeStage(aHigh, bHigh, carryFromPrev);

    const currentSum = ((stateValue >> (2 * nextStage)) & 1) === 1;
    const currentCarry = ((stateValue >> (2 * nextStage + 1)) & 1) === 1;

    // Carry stopped — no change at this stage
    if (newSum === currentSum && newCarry === currentCarry) {
      return { componentState: arithState, hasChanged: true, shouldCancelPending: false, scheduledEvents: [] };
    }

    // Update this stage and schedule the next ripple step
    const newStateValue = buildStateWithStageUpdate(stateValue, nextStage, newSum, newCarry);
    const nextIntermediate = stateToHex(newStateValue);

    const span = getTransitionSpan(component.config);
    arithState.setState(`to${nextIntermediate}`, event.readyAtTick);
    arithState.setNextState(nextIntermediate, event.readyAtTick + span);
    arithState.parameters.set('prevState', targetState);

    return {
      componentState: arithState,
      hasChanged: true,
      shouldCancelPending: false,
      scheduledEvents: [{
        targetId: component.id,
        scheduledAtTick: event.readyAtTick,
        readyAtTick: event.readyAtTick + span,
        type: `to${nextIntermediate}`,
        parameters: new Map([['nextStage', `${nextStage + 1}`]]),
      }],
    };
  }

  // ── allowConductivity ─────────────────────────────────────────────────
  // Inherited from ArithmeticBehaviorMixin — the `index * 2` convention
  // maps sum-i to bit 2*i and carryOut to bit 15 (outputCount - 1).

  // ── computeTargetStableState ──────────────────────────────────────────

  /**
   * Compute the fully-settled stable state by propagating the carry chain
   * through all 8 stages. Used at initialization and for test verification.
   */
  protected computeTargetStableState(pinStates: Map<string, INodeElectricalState>): string {
    let carry = pinStates.get('carryIn')!.hasVoltage;
    let stateValue = 0;

    for (let i = 0; i < STAGE_COUNT; i++) {
      const a = pinStates.get(`inputA-${i}`)!.hasVoltage;
      const b = pinStates.get(`inputB-${i}`)!.hasVoltage;
      const result = computeStage(a, b, carry);
      stateValue = buildStateWithStageUpdate(stateValue, i, result.sum, result.carry);
      carry = result.carry;
    }

    return stateToHex(stateValue);
  }
}

// ── Pure helpers ───────────────────────────────────────────────────────

/** Full-adder logic for one stage. */
function computeStage(a: boolean, b: boolean, carryIn: boolean): { sum: boolean; carry: boolean } {
  return {
    sum: (a !== b) !== carryIn,
    carry: (a && b) || (a && carryIn) || (b && carryIn),
  };
}

/** Set the sum and carry bits for `stage` in a 16-bit state value. */
function buildStateWithStageUpdate(
  stateValue: number,
  stage: number,
  sum: boolean,
  carry: boolean
): number {
  const sumBit = 2 * stage;
  const carryBit = sumBit + 1;
  let v = stateValue;
  v = (v & ~(1 << sumBit)) | ((sum ? 1 : 0) << sumBit);
  v = (v & ~(1 << carryBit)) | ((carry ? 1 : 0) << carryBit);
  return v;
}

/** Convert a 16-bit integer to a zero-padded 4-digit hex string. */
function stateToHex(value: number): string {
  return value.toString(16).padStart(4, '0');
}
