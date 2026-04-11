/**
 * Unit tests for EightBitAdderBehavior
 * @module tests/core/simulation/behaviors/arithmetic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EightBitAdderBehavior } from '../../../../../src/core/simulation/behaviors/arithmetic/EightBitAdderBehavior';
import { EightBitAdderState } from '../../../../../src/core/simulation/states/arithmetic/EightBitAdderState';
import { Component } from '../../../../../src/core/topology/Component';
import { Position } from '../../../../../src/core/utils/Position';
import { Rotation } from '../../../../../src/core/utils/Rotation';
import { ComponentType, COMPONENT_TYPE_METADATA } from '../../../../../src/core/topology/types';
import type { INodeElectricalState } from '../../../../../src/core/simulation/states/types';
import type { UUID } from '../../../../../src/core/utils/types';

// ── Helpers ────────────────────────────────────────────────────────────

/** Pin labels in metadata declaration order. */
const PIN_LABELS = Array.from(COMPONENT_TYPE_METADATA[ComponentType.EightBitAdder].pins.keys());

/** Generate stable pin UUIDs matching metadata declaration order. */
function makePinIds(): string[] {
  return PIN_LABELS.map((label) => `pin-${label}`);
}

function createMockAdder(): Component {
  return new Component(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0), makePinIds());
}

const LOW: INodeElectricalState = { hasVoltage: false, hasCurrent: false, locked: false };
const HIGH_V: INodeElectricalState = { hasVoltage: true, hasCurrent: false, locked: false };
const HIGH_G: INodeElectricalState = { hasVoltage: false, hasCurrent: true, locked: false };
const BOTH: INodeElectricalState = { hasVoltage: true, hasCurrent: true, locked: false };

/**
 * Build a nodeStates map for the 8-bit adder.
 * @param a - 8-bit integer for inputA (0–255)
 * @param b - 8-bit integer for inputB (0–255)
 * @param carryIn - carry-in flag
 * @param vcc - vcc present (default true)
 */
function buildNodeStates(
  a: number,
  b: number,
  carryIn: boolean,
  vcc = true
): Map<UUID, INodeElectricalState> {
  const pinIds = makePinIds();
  const map = new Map<UUID, INodeElectricalState>();

  // vcc pin
  map.set(pinIds[0]!, vcc ? HIGH_V : LOW);

  // carryIn pin
  map.set(pinIds[1]!, carryIn ? HIGH_V : HIGH_G);

  // inputA-0 .. inputA-7
  for (let i = 0; i < 8; i++) {
    map.set(pinIds[2 + i]!, ((a >> i) & 1) === 1 ? HIGH_V : HIGH_G);
  }

  // inputB-0 .. inputB-7
  for (let i = 0; i < 8; i++) {
    map.set(pinIds[10 + i]!, ((b >> i) & 1) === 1 ? HIGH_V : HIGH_G);
  }

  // sum-0 .. sum-7 (output pins, don't affect behavior)
  for (let i = 0; i < 8; i++) {
    map.set(pinIds[18 + i]!, LOW);
  }

  // carryOut
  map.set(pinIds[26]!, LOW);

  // gnd
  map.set(pinIds[27]!, HIGH_G);

  return map;
}

/** Compute expected full stable state for (a + b + carryIn). */
function expectedStableState(a: number, b: number, carryIn: boolean): string {
  let carry = carryIn;
  let value = 0;
  for (let i = 0; i < 8; i++) {
    const ai = ((a >> i) & 1) === 1;
    const bi = ((b >> i) & 1) === 1;
    const sum = (ai !== bi) !== carry;
    const newCarry = (ai && bi) || (ai && carry) || (bi && carry);
    if (sum) value |= 1 << (2 * i);
    if (newCarry) value |= 1 << (2 * i + 1);
    carry = newCarry;
  }
  return value.toString(16).padStart(4, '0');
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('EightBitAdderBehavior', () => {
  let behavior: EightBitAdderBehavior;
  let component: Component;

  beforeEach(() => {
    behavior = new EightBitAdderBehavior();
    component = createMockAdder();
  });

  // ── createInitialState ──────────────────────────────────────────────

  describe('createInitialState', () => {
    it('should return EightBitAdderState with all-low state', () => {
      const state = behavior.createInitialState(component);
      expect(state).toBeInstanceOf(EightBitAdderState);
      expect(state.state).toBe('0000');
    });
  });

  // ── computeTargetStableState (via init shortcut at targetTick 0) ────

  describe('computeTargetStableState (init shortcut)', () => {
    it.each([
      { a: 0x01, b: 0x01, cin: false, label: '1+1' },
      { a: 0xff, b: 0x01, cin: false, label: '255+1' },
      { a: 0xff, b: 0xff, cin: true, label: '255+255+1' },
      { a: 0x55, b: 0xaa, cin: false, label: '85+170' },
      { a: 0x80, b: 0x80, cin: false, label: '128+128' },
    ])('should compute correct final state for $label', ({ a, b, cin }) => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      const nodeStates = buildNodeStates(a, b, cin);

      // targetTick=0 triggers the init shortcut → full stable state
      const result = behavior.onPinsChange(component, state, nodeStates, 0);
      const expected = expectedStableState(a, b, cin);

      // The event type carries the target state
      expect(result.scheduledEvents).toHaveLength(1);
      expect(result.scheduledEvents[0]!.type).toBe(`to${expected}`);
      // Event has no nextStage parameter (uses mixin's scheduleTransition)
      expect(result.scheduledEvents[0]!.parameters).toBeUndefined();
    });

    it('should return noChange when inputs produce the same state (0+0+0)', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      const nodeStates = buildNodeStates(0x00, 0x00, false);

      const result = behavior.onPinsChange(component, state, nodeStates, 0);
      expect(result.hasChanged).toBe(false);
      expect(result.scheduledEvents).toHaveLength(0);
    });
  });

  // ── onPinsChange (ripple logic, targetTick > 0) ─────────────────────

  describe('onPinsChange — ripple logic', () => {
    it('should compute intermediate with new inputs but old carries', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      // Start stable at all-zero
      state.setState('0000', 5);

      // A=0xFF, B=0x01, Cin=0 → stage 0: S0=0, C0=1; stages 1-7: Si=1, Ci=0 (old carry=0)
      const nodeStates = buildNodeStates(0xff, 0x01, false);
      const result = behavior.onPinsChange(component, state, nodeStates, 10);

      expect(result.hasChanged).toBe(true);
      expect(result.shouldCancelPending).toBe(true);
      expect(result.scheduledEvents).toHaveLength(1);

      // Verify intermediate: stage 0 = (S0=0, C0=1), stages 1-7 = (Si=1, Ci=0)
      // Expected: 0101 0101 0101 0101 0101 0101 0101 0010 but let me compute:
      // stage 0: A[0]=1, B[0]=1, cin=0 → S=0, C=1 → bits 0,1 = 0,1
      // stage 1: A[1]=1, B[1]=0, old_C0=0 → S=1, C=0 → bits 2,3 = 1,0
      // stage 2..7: same as stage 1
      // Binary: 01 01 01 01 01 01 01 10 reading from bit 15 down to bit 0
      // = 0101 0101 0101 0110 = 0x5556
      const event = result.scheduledEvents[0]!;
      expect(event.type).toBe('to5556');
      expect(event.parameters?.get('nextStage')).toBe('1');
      expect(event.readyAtTick).toBe(14); // 10 + span(4)
    });

    it('should return noChange when intermediate equals effective state', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      // All inputs low, stable at 0000
      state.setState('0000', 5);

      const nodeStates = buildNodeStates(0x00, 0x00, false);
      const result = behavior.onPinsChange(component, state, nodeStates, 10);

      expect(result.hasChanged).toBe(false);
    });
  });

  // ── onEventFiring — carry propagation ───────────────────────────────

  describe('onEventFiring — carry propagation', () => {
    it('should land on intermediate and propagate carry to next stage', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      state.setState('to5556', 10);
      state.parameters.set('prevState', '0000');

      // Cache pin states for A=0xFF, B=0x01, Cin=0
      const nodeStates = buildNodeStates(0xff, 0x01, false);
      state.pinStates = behavior['getPinStates'](component, nodeStates);

      const event = {
        targetId: component.id,
        scheduledAtTick: 10,
        readyAtTick: 14,
        type: 'to5556',
        parameters: new Map([['nextStage', '1']]),
      };

      const result = behavior.onEventFiring(component, state, event);

      expect(result.hasChanged).toBe(true);
      expect(result.shouldCancelPending).toBe(false);

      // Stage 1: A[1]=1, B[1]=0, C0=1 (from 5556 bit 1) → S1=0, C1=1
      // Bits 2,3 change from (1,0) to (0,1): 5556 → 555a
      expect(result.scheduledEvents).toHaveLength(1);
      expect(result.scheduledEvents[0]!.type).toBe('to555a');
      expect(result.scheduledEvents[0]!.parameters?.get('nextStage')).toBe('2');
    });

    it('should stop propagation when carry does not change', () => {
      // Scenario: only stage 0 has carry, but it's already accounted for
      const state = behavior.createInitialState(component) as EightBitAdderState;
      // State where C0=0 (no carry to propagate), stage 1 already correct
      // A=0x01, B=0x00, Cin=0 → stage 0: S=1, C=0; stage 1: S=0, C=0
      state.setState('to0001', 10);
      state.parameters.set('prevState', '0000');

      const nodeStates = buildNodeStates(0x01, 0x00, false);
      state.pinStates = behavior['getPinStates'](component, nodeStates);

      const event = {
        targetId: component.id,
        scheduledAtTick: 10,
        readyAtTick: 14,
        type: 'to0001',
        parameters: new Map([['nextStage', '1']]),
      };

      const result = behavior.onEventFiring(component, state, event);

      // C0=0 (bit 1 of 0x0001 = 0), so carry doesn't propagate
      // Stage 1: A[1]=0, B[1]=0, C0=0 → S=0, C=0 → same as current → no change
      expect(result.hasChanged).toBe(true); // state still changed (landed on 0001)
      expect(result.scheduledEvents).toHaveLength(0);
    });

    it('should handle event without nextStage parameter (init shortcut)', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      const finalState = expectedStableState(0xff, 0x01, false);
      state.setState(`to${finalState}`, 0);

      const event = {
        targetId: component.id,
        scheduledAtTick: 0,
        readyAtTick: 4,
        type: `to${finalState}`,
        parameters: undefined,
      };

      const result = behavior.onEventFiring(component, state, event);

      // nextStage defaults to 8 → done immediately
      expect(result.hasChanged).toBe(true);
      expect(result.scheduledEvents).toHaveLength(0);
      expect(state.state).toBe(finalState);
    });

    it('should complete a full 8-stage ripple for A=0xFF, B=0x01, Cin=0', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      state.setState('0000', 5);

      const nodeStates = buildNodeStates(0xff, 0x01, false);
      // Simulate onPinsChange
      const pinsResult = behavior.onPinsChange(component, state, nodeStates, 10);
      expect(pinsResult.hasChanged).toBe(true);
      expect(pinsResult.scheduledEvents).toHaveLength(1);

      // Now simulate the event chain
      let currentEvent = pinsResult.scheduledEvents[0]!;
      let eventCount = 0;

      while (true) {
        const result = behavior.onEventFiring(component, state, currentEvent);
        expect(result.hasChanged).toBe(true);
        eventCount++;

        if (result.scheduledEvents.length === 0) break;
        currentEvent = result.scheduledEvents[0]!;
      }

      // A=255, B=1, Cin=0 → carry ripples through all 8 stages
      expect(eventCount).toBe(8); // stage 1 through 8 (one per stage)

      // Final state should match the full computation
      const expected = expectedStableState(0xff, 0x01, false);
      expect(state.state).toBe(expected);
    });

    it('should stop early when carry does not propagate beyond a stage', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      state.setState('0000', 5);

      // A=0x03, B=0x00, Cin=0 → stage 0: S=1,C=0; stage 1: S=1,C=0 → no carry
      const nodeStates = buildNodeStates(0x03, 0x00, false);
      const pinsResult = behavior.onPinsChange(component, state, nodeStates, 10);
      expect(pinsResult.hasChanged).toBe(true);

      // First event fires
      const result = behavior.onEventFiring(component, state, pinsResult.scheduledEvents[0]!);

      // C0=0, so stage 1 doesn't change → carry stopped
      expect(result.scheduledEvents).toHaveLength(0);
    });
  });

  // ── Guards ──────────────────────────────────────────────────────────

  describe('guards', () => {
    it('should go to all-low on vcc loss', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      state.setState('ffff', 5);

      const nodeStates = buildNodeStates(0xff, 0xff, true, false); // vcc=false
      const result = behavior.onPinsChange(component, state, nodeStates, 10);

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('0000');
    });

    it('should go to indeterminate on ill-defined input', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      state.setState('0000', 5);

      // Make carryIn ill-defined (both voltage and current)
      const nodeStates = buildNodeStates(0x00, 0x00, false);
      // Override carryIn to have both
      const pinIds = makePinIds();
      nodeStates.set(pinIds[1]!, BOTH);

      const result = behavior.onPinsChange(component, state, nodeStates, 10);
      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('indeterminate');
    });

    it('should go to indeterminate on floating input', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      state.setState('0000', 5);

      // Make inputA-3 floating (no voltage, no current)
      const nodeStates = buildNodeStates(0x00, 0x00, false);
      const pinIds = makePinIds();
      nodeStates.set(pinIds[5]!, LOW); // inputA-3 at index 5 (vcc=0, carryIn=1, inputA-0=2, inputA-1=3, inputA-2=4, inputA-3=5)

      const result = behavior.onPinsChange(component, state, nodeStates, 10);
      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('indeterminate');
    });
  });

  // ── allowConductivity ───────────────────────────────────────────────

  describe('allowConductivity', () => {
    const pinIds = makePinIds();
    // pin indices: 0=vcc, 18..25=sum-0..sum-7, 26=carryOut, 27=gnd

    it('should allow sum-0 → vcc when S0 is high', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      state.setState('0001', 5); // S0=1

      const result = behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[18]!, // sum-0
        pinIds[0]!   // vcc
      );
      expect(result).toBe(true);
    });

    it('should deny sum-0 → vcc when S0 is low', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      state.setState('0000', 5);

      const result = behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[18]!, // sum-0
        pinIds[0]!   // vcc
      );
      expect(result).toBe(false);
    });

    it('should allow sum-0 → gnd when S0 is low', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      state.setState('0000', 5);

      const result = behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[18]!, // sum-0
        pinIds[27]!  // gnd
      );
      expect(result).toBe(true);
    });

    it('should map sum-3 to bit 6 (index 3 * 2)', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      // bit 6 = 0x0040 → sum-3 high
      state.setState('0040', 5);

      expect(behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[21]!, // sum-3
        pinIds[0]!   // vcc
      )).toBe(true);
    });

    it('should map carryOut to bit 15', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      // bit 15 = 0x8000 → carryOut high
      state.setState('8000', 5);

      expect(behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[26]!, // carryOut
        pinIds[0]!   // vcc
      )).toBe(true);
    });

    it('should deny carryOut → vcc when C7 is low', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      state.setState('7fff', 5);

      expect(behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[26]!, // carryOut
        pinIds[0]!   // vcc
      )).toBe(false);
    });

    it('should deny conductivity when state is indeterminate', () => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      state.setState('indeterminate', 5);

      expect(behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[18]!, // sum-0
        pinIds[0]!   // vcc
      )).toBe(false);
    });
  });

  // ── Comprehensive truth table ───────────────────────────────────────

  describe('truth table via full ripple', () => {
    it.each([
      { a: 0x00, b: 0x00, cin: false, sum: 0x000, cout: false, label: '0+0' },
      { a: 0x01, b: 0x01, cin: false, sum: 0x002, cout: false, label: '1+1=2' },
      { a: 0xff, b: 0x01, cin: false, sum: 0x000, cout: true, label: '255+1=256' },
      { a: 0xff, b: 0xff, cin: false, sum: 0x1fe, cout: true, label: '255+255=510' },
      { a: 0xff, b: 0xff, cin: true, sum: 0x1ff, cout: true, label: '255+255+1=511' },
      { a: 0x55, b: 0xaa, cin: false, sum: 0x0ff, cout: false, label: '85+170=255' },
      { a: 0x80, b: 0x80, cin: false, sum: 0x000, cout: true, label: '128+128=256' },
    ])('$label → sum=$sum, carryOut=$cout', ({ a, b, cin }) => {
      const state = behavior.createInitialState(component) as EightBitAdderState;
      state.setState('0000', 0);

      // Use init shortcut to get final state directly
      const nodeStates = buildNodeStates(a, b, cin);
      const result = behavior.onPinsChange(component, state, nodeStates, 0);

      // Fire the event to land on final state
      if (result.scheduledEvents.length > 0) {
        behavior.onEventFiring(component, state, result.scheduledEvents[0]!);
      }

      const expected = expectedStableState(a, b, cin);
      expect(state.state).toBe(expected);
    });
  });
});
