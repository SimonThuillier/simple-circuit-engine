/**
 * Unit tests for EightBitOnesComplementBehavior
 * @module tests/core/simulation/behaviors/arithmetic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EightBitOnesComplementBehavior } from '../../../../../src/core/simulation/behaviors/arithmetic/EightBitOnesComplementBehavior';
import { EightBitOnesComplementState } from '../../../../../src/core/simulation/states/arithmetic/EightBitOnesComplementState';
import { Component } from '../../../../../src/core/topology/Component';
import { Position } from '../../../../../src/core/utils/Position';
import { Rotation } from '../../../../../src/core/utils/Rotation';
import { ComponentType, COMPONENT_TYPE_METADATA } from '../../../../../src/core/topology/types';
import type { INodeElectricalState } from '../../../../../src/core/simulation/states/types';
import type { UUID } from '../../../../../src/core/utils/types';

// ── Helpers ────────────────────────────────────────────────────────────

const PIN_LABELS = Array.from(COMPONENT_TYPE_METADATA[ComponentType.EightBitOnesComplement].pins.keys());

function makePinIds(): string[] {
  return PIN_LABELS.map((label) => `pin-${label}`);
}

function createMockComponent(): Component {
  return new Component(ComponentType.EightBitOnesComplement, new Position(0, 0), new Rotation(0), makePinIds());
}

const LOW: INodeElectricalState = { hasVoltage: false, hasCurrent: false, locked: false };
const HIGH_V: INodeElectricalState = { hasVoltage: true, hasCurrent: false, locked: false };
const HIGH_G: INodeElectricalState = { hasVoltage: false, hasCurrent: true, locked: false };
const BOTH: INodeElectricalState = { hasVoltage: true, hasCurrent: true, locked: false };

/**
 * Build a nodeStates map for the 8-bit one's complement.
 * Pin order: vcc, invert, input-0..input-7, output-0..output-7, gnd
 */
function buildNodeStates(
  inputs: number,
  invert: boolean,
  vcc = true
): Map<UUID, INodeElectricalState> {
  const pinIds = makePinIds();
  const map = new Map<UUID, INodeElectricalState>();

  // vcc
  map.set(pinIds[0]!, vcc ? HIGH_V : LOW);

  // invert
  map.set(pinIds[1]!, invert ? HIGH_V : HIGH_G);

  // input-0 .. input-7
  for (let i = 0; i < 8; i++) {
    map.set(pinIds[2 + i]!, ((inputs >> i) & 1) === 1 ? HIGH_V : HIGH_G);
  }

  // output-0 .. output-7 (output pins, don't affect behavior)
  for (let i = 0; i < 8; i++) {
    map.set(pinIds[10 + i]!, LOW);
  }

  // gnd
  map.set(pinIds[18]!, HIGH_G);

  return map;
}

/** Compute expected stable state. */
function expectedState(inputs: number, invert: boolean): string {
  let value = 0;
  for (let i = 0; i < 8; i++) {
    const inp = ((inputs >> i) & 1) === 1;
    if (inp !== invert) value |= 1 << i;
  }
  if (invert) value |= 1 << 8;
  return value.toString(16).padStart(3, '0');
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('EightBitOnesComplementBehavior', () => {
  let behavior: EightBitOnesComplementBehavior;
  let component: Component;

  beforeEach(() => {
    behavior = new EightBitOnesComplementBehavior();
    component = createMockComponent();
  });

  // ── createInitialState ──────────────────────────────────────────────

  describe('createInitialState', () => {
    it('should return EightBitOnesComplementState with all-low state', () => {
      const state = behavior.createInitialState(component);
      expect(state).toBeInstanceOf(EightBitOnesComplementState);
      expect(state.state).toBe('000');
    });
  });

  // ── computeTargetStableState (via init shortcut at targetTick 0) ────

  describe('computeTargetStableState (init shortcut)', () => {
    it.each([
      { inputs: 0x00, invert: false, label: 'invert=0, inputs=0x00' },
      { inputs: 0x00, invert: true, label: 'invert=1, inputs=0x00' },
      { inputs: 0xff, invert: false, label: 'invert=0, inputs=0xff' },
      { inputs: 0xff, invert: true, label: 'invert=1, inputs=0xff' },
      { inputs: 0x55, invert: true, label: 'invert=1, inputs=0x55' },
      { inputs: 0xaa, invert: false, label: 'invert=0, inputs=0xaa' },
      { inputs: 0x01, invert: true, label: 'invert=1, inputs=0x01' },
    ])('should compute correct state for $label', ({ inputs, invert }) => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      const nodeStates = buildNodeStates(inputs, invert);

      const result = behavior.onPinsChange(component, state, nodeStates, 0);
      const expected = expectedState(inputs, invert);

      if (expected === '000') {
        // Already at all-low, no change
        expect(result.hasChanged).toBe(false);
      } else {
        expect(result.scheduledEvents).toHaveLength(1);
        expect(result.scheduledEvents[0]!.type).toBe(`to${expected}`);
      }
    });

    it('should return noChange when inputs produce the same state', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      const nodeStates = buildNodeStates(0x00, false);

      const result = behavior.onPinsChange(component, state, nodeStates, 0);
      expect(result.hasChanged).toBe(false);
      expect(result.scheduledEvents).toHaveLength(0);
    });
  });

  // ── Transition timing ──────────────────────────────────────────────

  describe('transition timing', () => {
    it('should use transitionSpan for first transition', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('000', 5);
      const nodeStates = buildNodeStates(0xff, false);

      const result = behavior.onPinsChange(component, state, nodeStates, 10);
      expect(result.hasChanged).toBe(true);
      expect(result.scheduledEvents).toHaveLength(1);
      expect(result.scheduledEvents[0]!.readyAtTick).toBe(13); // 10 + span(3)
    });

    it('should use symmetrical shortening for mid-transition change', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      // First transition starts at tick 10, expires at tick 13
      state.setState('to0ff', 10);
      state.setNextState('0ff', 13);
      state.parameters.set('prevState', '000');

      // Mid-transition at tick 11 (1 tick into the transition)
      const nodeStates = buildNodeStates(0x00, true);
      const result = behavior.onPinsChange(component, state, nodeStates, 11);

      expect(result.hasChanged).toBe(true);
      expect(result.scheduledEvents).toHaveLength(1);
      // Shortened span = max(11 - 10, 1) = 1
      expect(result.scheduledEvents[0]!.readyAtTick).toBe(12); // 11 + 1
    });
  });

  // ── onEventFiring ──────────────────────────────────────────────────

  describe('onEventFiring', () => {
    it('should land on target stable state', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('to1ff', 10);
      state.parameters.set('prevState', '000');

      const event = {
        targetId: component.id,
        scheduledAtTick: 10,
        readyAtTick: 13,
        type: 'to1ff',
        parameters: undefined,
      };

      const result = behavior.onEventFiring(component, state, event);
      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('1ff');
      expect(state.parameters.has('prevState')).toBe(false);
    });
  });

  // ── Guards ──────────────────────────────────────────────────────────

  describe('guards', () => {
    it('should go to all-low on vcc loss', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('1ff', 5);

      const nodeStates = buildNodeStates(0x00, true, false); // vcc=false
      const result = behavior.onPinsChange(component, state, nodeStates, 10);

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('000');
    });

    it('should return noChange when already at all-low on vcc loss', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('000', 5);

      const nodeStates = buildNodeStates(0x00, false, false);
      const result = behavior.onPinsChange(component, state, nodeStates, 10);
      expect(result.hasChanged).toBe(false);
    });

    it('should go to indeterminate on ill-defined input', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('000', 5);

      const nodeStates = buildNodeStates(0x00, false);
      const pinIds = makePinIds();
      nodeStates.set(pinIds[1]!, BOTH); // invert = both voltage and current

      const result = behavior.onPinsChange(component, state, nodeStates, 10);
      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('indeterminate');
    });

    it('should go to indeterminate on floating input', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('000', 5);

      const nodeStates = buildNodeStates(0x00, false);
      const pinIds = makePinIds();
      nodeStates.set(pinIds[4]!, LOW); // input-2 floating

      const result = behavior.onPinsChange(component, state, nodeStates, 10);
      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('indeterminate');
    });
  });

  // ── allowConductivity ───────────────────────────────────────────────

  describe('allowConductivity', () => {
    const pinIds = makePinIds();
    // pin indices: 0=vcc, 1=invert, 2..9=input-0..input-7, 10..17=output-0..output-7, 18=gnd

    it('should allow output-0 → vcc when output-0 is high', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('001', 5); // bit 0 high

      expect(behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[10]!, // output-0
        pinIds[0]!   // vcc
      )).toBe(true);
    });

    it('should deny output-0 → vcc when output-0 is low', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('000', 5);

      expect(behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[10]!, // output-0
        pinIds[0]!   // vcc
      )).toBe(false);
    });

    it('should allow output-0 → gnd when output-0 is low', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('000', 5);

      expect(behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[10]!, // output-0
        pinIds[18]!  // gnd
      )).toBe(true);
    });

    it('should map output-5 to bit 5', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      // bit 5 = 0x020
      state.setState('020', 5);

      expect(behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[15]!, // output-5
        pinIds[0]!   // vcc
      )).toBe(true);
    });

    it('should deny output-7 → vcc when output-7 is low', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('07f', 5); // bits 0-6 high, bit 7 low

      expect(behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[17]!, // output-7
        pinIds[0]!   // vcc
      )).toBe(false);
    });

    it('should allow output-7 → vcc when output-7 is high', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('080', 5); // bit 7 high

      expect(behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[17]!, // output-7
        pinIds[0]!   // vcc
      )).toBe(true);
    });

    it('should deny conductivity when state is indeterminate', () => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('indeterminate', 5);

      expect(behavior.allowConductivity(
        component, state, 0 as any,
        pinIds[10]!, // output-0
        pinIds[0]!   // vcc
      )).toBe(false);
    });
  });

  // ── Truth table ─────────────────────────────────────────────────────

  describe('truth table', () => {
    it.each([
      { inputs: 0x00, invert: false, label: 'pass-through all low' },
      { inputs: 0xff, invert: false, label: 'pass-through all high' },
      { inputs: 0x00, invert: true, label: 'invert all low → all high' },
      { inputs: 0xff, invert: true, label: 'invert all high → all low' },
      { inputs: 0x55, invert: true, label: 'invert 0x55 → 0xAA' },
      { inputs: 0xaa, invert: true, label: 'invert 0xAA → 0x55' },
      { inputs: 0x0f, invert: true, label: 'invert 0x0F → 0xF0' },
      { inputs: 0x01, invert: false, label: 'pass-through single bit' },
    ])('$label', ({ inputs, invert }) => {
      const state = behavior.createInitialState(component) as EightBitOnesComplementState;
      state.setState('000', 0);

      const nodeStates = buildNodeStates(inputs, invert);
      const result = behavior.onPinsChange(component, state, nodeStates, 0);

      // Fire event to land on final state
      if (result.scheduledEvents.length > 0) {
        behavior.onEventFiring(component, state, result.scheduledEvents[0]!);
      }

      const expected = expectedState(inputs, invert);
      expect(state.state).toBe(expected);
    });
  });
});
