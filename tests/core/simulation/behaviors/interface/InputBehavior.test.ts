/**
 * Unit tests for the input component behaviors (One/Two/Four/EightInputBehavior)
 * @module tests/core/simulation/behaviors/interface
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OneInputBehavior } from '../../../../../src/core/simulation/behaviors/interface/OneInputBehavior';
import { TwoInputBehavior } from '../../../../../src/core/simulation/behaviors/interface/TwoInputBehavior';
import { FourInputBehavior } from '../../../../../src/core/simulation/behaviors/interface/FourInputBehavior';
import { EightInputBehavior } from '../../../../../src/core/simulation/behaviors/interface/EightInputBehavior';
import { OneInputState } from '../../../../../src/core/simulation/states/interface/OneInputState';
import { TwoInputState } from '../../../../../src/core/simulation/states/interface/TwoInputState';
import { FourInputState } from '../../../../../src/core/simulation/states/interface/FourInputState';
import { EightInputState } from '../../../../../src/core/simulation/states/interface/EightInputState';
import { Component } from '../../../../../src/core/topology/Component';
import { Position } from '../../../../../src/core/utils/Position';
import { Rotation } from '../../../../../src/core/utils/Rotation';
import {
  ComponentType,
  COMPONENT_TYPE_METADATA,
  ENodeSourceType,
} from '../../../../../src/core/topology/types';
import type { INodeElectricalState } from '../../../../../src/core/simulation/states/types';
import type { UUID } from '../../../../../src/core/utils/types';
import type { IUserCommand, IScheduledEvent } from '../../../../../src/core/simulation/types';

// ── Helpers ────────────────────────────────────────────────────────────

function pinLabels(type: ComponentType): string[] {
  return Array.from(COMPONENT_TYPE_METADATA[type].pins.keys());
}

function pinIds(type: ComponentType): string[] {
  return pinLabels(type).map((l) => `pin-${l}`);
}

function makeComponent(type: ComponentType): Component {
  return new Component(type, new Position(0, 0), new Rotation(0), pinIds(type));
}

const LOW: INodeElectricalState = { hasVoltage: false, hasCurrent: false, locked: false };
const HIGH_V: INodeElectricalState = { hasVoltage: true, hasCurrent: false, locked: false };
const HIGH_G: INodeElectricalState = { hasVoltage: false, hasCurrent: true, locked: false };

function buildNodeStates(
  type: ComponentType,
  vcc: boolean
): Map<UUID, INodeElectricalState> {
  const ids = pinIds(type);
  const map = new Map<UUID, INodeElectricalState>();
  const labels = pinLabels(type);
  for (let i = 0; i < ids.length; i++) {
    const label = labels[i]!;
    if (label === 'vcc') map.set(ids[i]!, vcc ? HIGH_V : LOW);
    else if (label === 'gnd') map.set(ids[i]!, HIGH_G);
    else map.set(ids[i]!, LOW);
  }
  return map;
}

function toggleCommand(targetId: string, index: number, scheduledAtTick: number): IUserCommand {
  return {
    type: 'toggle_switch',
    targetId: targetId as any,
    scheduledAtTick,
    parameters: new Map([['index', String(index)]]),
  };
}

function switchChangedEvent(
  targetId: string,
  index: number,
  target: 0 | 1,
  startTick: number,
  endTick: number
): IScheduledEvent {
  return {
    targetId: targetId as any,
    scheduledAtTick: startTick,
    readyAtTick: endTick,
    type: 'switchChanged',
    parameters: new Map([
      ['index', String(index)],
      ['target', String(target)],
    ]),
  };
}

// ── createInitialState ────────────────────────────────────────────────

describe('Input behaviors — createInitialState', () => {
  it('OneInputBehavior should yield OneInputState with config initialState', () => {
    const c = makeComponent(ComponentType.OneInput);
    c.config.set('initialState', '1');
    const state = new OneInputBehavior().createInitialState(c);
    expect(state).toBeInstanceOf(OneInputState);
    expect(state.state).toBe('1');
  });

  it('TwoInputBehavior should default to "0"', () => {
    const c = makeComponent(ComponentType.TwoInput);
    const state = new TwoInputBehavior().createInitialState(c) as TwoInputState;
    expect(state.state).toBe('0');
    expect(state.outputCount).toBe(2);
  });

  it('FourInputBehavior should accept hex up to "f"', () => {
    const c = makeComponent(ComponentType.FourInput);
    c.config.set('initialState', 'a');
    const state = new FourInputBehavior().createInitialState(c) as FourInputState;
    expect(state.state).toBe('a');
  });

  it('EightInputBehavior should default to "00"', () => {
    const c = makeComponent(ComponentType.EightInput);
    const state = new EightInputBehavior().createInitialState(c) as EightInputState;
    expect(state.state).toBe('00');
    expect(state.outputCount).toBe(8);
  });

  it('should reject mismatched component type', () => {
    const c = makeComponent(ComponentType.TwoInput);
    expect(() => new OneInputBehavior().createInitialState(c)).toThrow();
  });
});

// ── onUserCommand ─────────────────────────────────────────────────────

describe('FourInputBehavior — onUserCommand toggle_switch', () => {
  let behavior: FourInputBehavior;
  let component: Component;
  let state: FourInputState;

  beforeEach(() => {
    behavior = new FourInputBehavior();
    component = makeComponent(ComponentType.FourInput);
    component.config.set('transitionSpan', '2');
    state = behavior.createInitialState(component) as FourInputState;
    // Prime pinStates so vcc-loss guard does not trigger
    behavior.onPinsChange(component, state, buildNodeStates(ComponentType.FourInput, true), 0);
  });

  it('should switch to "moving" with a single pending entry on first toggle', () => {
    const result = behavior.onUserCommand(component, state, toggleCommand(component.id, 1, 5));
    expect(result.hasChanged).toBe(true);
    expect(state.state).toBe('moving');
    expect(state.parameters.get('prevState')).toBe('0');
    expect(state.parameters.get('1')).toBe('1-5-7');
    expect(result.scheduledEvents).toHaveLength(1);
    expect(result.scheduledEvents[0]!.type).toBe('switchChanged');
    expect(result.scheduledEvents[0]!.readyAtTick).toBe(7);
    expect(result.shouldCancelPending).toBe(false);
  });

  it('should debounce a second toggle of the same switch while moving', () => {
    behavior.onUserCommand(component, state, toggleCommand(component.id, 1, 5));
    const second = behavior.onUserCommand(component, state, toggleCommand(component.id, 1, 6));
    expect(second.hasChanged).toBe(false);
    expect(second.scheduledEvents).toHaveLength(0);
    expect(state.parameters.get('1')).toBe('1-5-7');
  });

  it('should accept a second toggle on a different switch while moving', () => {
    behavior.onUserCommand(component, state, toggleCommand(component.id, 1, 5));
    const second = behavior.onUserCommand(component, state, toggleCommand(component.id, 2, 6));
    expect(second.hasChanged).toBe(true);
    expect(state.state).toBe('moving');
    expect(state.parameters.get('1')).toBe('1-5-7');
    expect(state.parameters.get('2')).toBe('1-6-8');
    expect(second.shouldCancelPending).toBe(false);
  });

  it('should ignore an out-of-range index', () => {
    const result = behavior.onUserCommand(component, state, toggleCommand(component.id, 10, 1));
    expect(result.hasChanged).toBe(false);
    expect(state.state).toBe('0');
  });

  it('should ignore commands when vcc is lost', () => {
    behavior.onPinsChange(component, state, buildNodeStates(ComponentType.FourInput, false), 1);
    expect(state.state).toBe('0');
    const result = behavior.onUserCommand(component, state, toggleCommand(component.id, 0, 2));
    expect(result.hasChanged).toBe(false);
  });

  it('should compute target=0 when toggling a currently-high switch', () => {
    state.setState('5', 0); // bits 0 and 2 high
    behavior.onUserCommand(component, state, toggleCommand(component.id, 0, 3));
    expect(state.parameters.get('0')).toBe('0-3-5');
    expect(state.parameters.get('prevState')).toBe('5');
  });
});

// ── onEventFiring ─────────────────────────────────────────────────────

describe('FourInputBehavior — onEventFiring switchChanged', () => {
  let behavior: FourInputBehavior;
  let component: Component;
  let state: FourInputState;

  beforeEach(() => {
    behavior = new FourInputBehavior();
    component = makeComponent(ComponentType.FourInput);
    component.config.set('transitionSpan', '2');
    state = behavior.createInitialState(component) as FourInputState;
    behavior.onPinsChange(component, state, buildNodeStates(ComponentType.FourInput, true), 0);
  });

  it('should land on the new stable state when only one switch was pending', () => {
    behavior.onUserCommand(component, state, toggleCommand(component.id, 2, 4));
    const result = behavior.onEventFiring(
      component,
      state,
      switchChangedEvent(component.id, 2, 1, 4, 6)
    );
    expect(result.hasChanged).toBe(true);
    expect(state.state).toBe('4'); // bit 2 set
    expect(state.parameters.has('prevState')).toBe(false);
    expect(state.parameters.has('2')).toBe(false);
  });

  it('should keep the state moving while other switches are still pending', () => {
    behavior.onUserCommand(component, state, toggleCommand(component.id, 0, 4));
    behavior.onUserCommand(component, state, toggleCommand(component.id, 3, 5));

    behavior.onEventFiring(component, state, switchChangedEvent(component.id, 0, 1, 4, 6));
    expect(state.state).toBe('moving');
    expect(state.parameters.has('0')).toBe(false);
    expect(state.parameters.get('3')).toBe('1-5-7');
    expect(state.parameters.get('prevState')).toBe('1');

    behavior.onEventFiring(component, state, switchChangedEvent(component.id, 3, 1, 5, 7));
    expect(state.state).toBe('9'); // bits 0 and 3 set
    expect(state.parameters.has('prevState')).toBe(false);
  });

  it('should ignore an event for an unknown index', () => {
    state.setState('2', 0);
    const result = behavior.onEventFiring(
      component,
      state,
      switchChangedEvent(component.id, 0, 1, 1, 2)
    );
    expect(result.hasChanged).toBe(false);
    expect(state.state).toBe('2');
  });
});

// ── vcc guard ─────────────────────────────────────────────────────────

describe('EightInputBehavior — vcc guard', () => {
  it('should drop to allLowState and clear pending when vcc is lost', () => {
    const behavior = new EightInputBehavior();
    const component = makeComponent(ComponentType.EightInput);
    component.config.set('transitionSpan', '2');
    const state = behavior.createInitialState(component) as EightInputState;

    behavior.onPinsChange(component, state, buildNodeStates(ComponentType.EightInput, true), 0);
    behavior.onUserCommand(component, state, toggleCommand(component.id, 3, 1));
    expect(state.state).toBe('moving');
    expect(state.parameters.size).toBeGreaterThan(0);

    const result = behavior.onPinsChange(
      component,
      state,
      buildNodeStates(ComponentType.EightInput, false),
      2
    );
    expect(result.hasChanged).toBe(true);
    expect(result.shouldCancelPending).toBe(true);
    expect(state.state).toBe('00');
    expect(state.parameters.size).toBe(0);
  });
});

// ── allowConductivity ────────────────────────────────────────────────

describe('TwoInputBehavior — allowConductivity', () => {
  let behavior: TwoInputBehavior;
  let component: Component;
  let state: TwoInputState;

  beforeEach(() => {
    behavior = new TwoInputBehavior();
    component = makeComponent(ComponentType.TwoInput);
    state = behavior.createInitialState(component) as TwoInputState;
  });

  function pinIdByLabel(label: string): string {
    const labels = pinLabels(ComponentType.TwoInput);
    return component.pins[labels.indexOf(label)]!;
  }

  it('should allow vcc-output when output bit is high', () => {
    state.setState('1', 0); // bit 0 high
    expect(
      behavior.allowConductivity(
        component,
        state,
        ENodeSourceType.Voltage,
        pinIdByLabel('vcc'),
        pinIdByLabel('output-0')
      )
    ).toBe(true);
    expect(
      behavior.allowConductivity(
        component,
        state,
        ENodeSourceType.Current,
        pinIdByLabel('gnd'),
        pinIdByLabel('output-0')
      )
    ).toBe(false);
  });

  it('should allow gnd-output when output bit is low', () => {
    state.setState('1', 0); // bit 0 high, bit 1 low
    expect(
      behavior.allowConductivity(
        component,
        state,
        ENodeSourceType.Current,
        pinIdByLabel('gnd'),
        pinIdByLabel('output-1')
      )
    ).toBe(true);
    expect(
      behavior.allowConductivity(
        component,
        state,
        ENodeSourceType.Voltage,
        pinIdByLabel('vcc'),
        pinIdByLabel('output-1')
      )
    ).toBe(false);
  });

  it('should not connect vcc and gnd directly', () => {
    state.setState('3', 0);
    expect(
      behavior.allowConductivity(
        component,
        state,
        ENodeSourceType.Voltage,
        pinIdByLabel('vcc'),
        pinIdByLabel('gnd')
      )
    ).toBe(false);
  });

  it('should keep the previous bit driven while moving', () => {
    state.setState('moving', 0);
    state.parameters.set('prevState', '1');
    state.parameters.set('0', '0-0-2');
    // Pre-flip: bit 0 still high → vcc-output-0 conducts
    expect(
      behavior.allowConductivity(
        component,
        state,
        ENodeSourceType.Voltage,
        pinIdByLabel('vcc'),
        pinIdByLabel('output-0')
      )
    ).toBe(true);
  });
});

// ── single-bit (OneInput) end-to-end ─────────────────────────────────

describe('OneInputBehavior — single-bit toggle lifecycle', () => {
  it('should round-trip 0 → moving → 1 → moving → 0', () => {
    const behavior = new OneInputBehavior();
    const component = makeComponent(ComponentType.OneInput);
    component.config.set('transitionSpan', '1');
    const state = behavior.createInitialState(component) as OneInputState;
    behavior.onPinsChange(component, state, buildNodeStates(ComponentType.OneInput, true), 0);

    behavior.onUserCommand(component, state, toggleCommand(component.id, 0, 1));
    expect(state.state).toBe('moving');
    behavior.onEventFiring(component, state, switchChangedEvent(component.id, 0, 1, 1, 2));
    expect(state.state).toBe('1');

    behavior.onUserCommand(component, state, toggleCommand(component.id, 0, 5));
    expect(state.state).toBe('moving');
    behavior.onEventFiring(component, state, switchChangedEvent(component.id, 0, 0, 5, 6));
    expect(state.state).toBe('0');
  });
});
