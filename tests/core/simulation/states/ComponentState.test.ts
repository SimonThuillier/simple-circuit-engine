/**
 * Unit tests for ComponentState pinStates and unionElectricalStates
 */

import { describe, expect, it } from 'vitest';
import { ComponentState, unionElectricalStates } from 'simple-circuit-engine/core';
import type { INodeElectricalState } from 'simple-circuit-engine/core';

class DummyState extends ComponentState {
  constructor(id: string) {
    super(id, 'idle');
  }
}

describe('unionElectricalStates', () => {
  const OFF: INodeElectricalState = { hasVoltage: false, hasCurrent: false, locked: false };
  const VOLTAGE: INodeElectricalState = { hasVoltage: true, hasCurrent: false, locked: false };
  const CURRENT: INodeElectricalState = { hasVoltage: false, hasCurrent: true, locked: false };
  const BOTH: INodeElectricalState = { hasVoltage: true, hasCurrent: true, locked: false };
  const LOCKED: INodeElectricalState = { hasVoltage: true, hasCurrent: false, locked: true };

  it('should OR hasVoltage and hasCurrent across two states', () => {
    const result = unionElectricalStates(VOLTAGE, CURRENT);
    expect(result.hasVoltage).toBe(true);
    expect(result.hasCurrent).toBe(true);
  });

  it('should return all false when both inputs are off', () => {
    const result = unionElectricalStates(OFF, OFF);
    expect(result.hasVoltage).toBe(false);
    expect(result.hasCurrent).toBe(false);
  });

  it('should propagate true from either input', () => {
    expect(unionElectricalStates(BOTH, OFF)).toEqual({
      hasVoltage: true,
      hasCurrent: true,
      locked: false,
    });
    expect(unionElectricalStates(OFF, BOTH)).toEqual({
      hasVoltage: true,
      hasCurrent: true,
      locked: false,
    });
  });

  it('should always return locked: false', () => {
    const result = unionElectricalStates(LOCKED, LOCKED);
    expect(result.locked).toBe(false);
  });

  it('should work with more than two states', () => {
    const result = unionElectricalStates(OFF, VOLTAGE, OFF, CURRENT);
    expect(result.hasVoltage).toBe(true);
    expect(result.hasCurrent).toBe(true);
  });

  it('should handle a single state', () => {
    const result = unionElectricalStates(VOLTAGE);
    expect(result.hasVoltage).toBe(true);
    expect(result.hasCurrent).toBe(false);
    expect(result.locked).toBe(false);
  });
});

describe('ComponentState.pinStates', () => {
  it('should be an empty map by default', () => {
    const state = new DummyState('comp-1');
    expect(state.pinStates).toBeInstanceOf(Map);
    expect(state.pinStates.size).toBe(0);
  });

  it('should store individual pin states', () => {
    const state = new DummyState('comp-1');
    state.pinStates.set('cmd_in', { hasVoltage: true, hasCurrent: false, locked: false });
    state.pinStates.set('cmd_out', { hasVoltage: false, hasCurrent: true, locked: false });

    expect(state.pinStates.get('cmd_in')!.hasVoltage).toBe(true);
    expect(state.pinStates.get('cmd_out')!.hasCurrent).toBe(true);
  });

  it('should store composite union keys with * separator', () => {
    const state = new DummyState('comp-1');
    const pin1: INodeElectricalState = { hasVoltage: true, hasCurrent: false, locked: false };
    const pin2: INodeElectricalState = { hasVoltage: false, hasCurrent: true, locked: false };

    state.pinStates.set('cmd_in', pin1);
    state.pinStates.set('cmd_out', pin2);
    state.pinStates.set('cmd_in*cmd_out', unionElectricalStates(pin1, pin2));

    const union = state.pinStates.get('cmd_in*cmd_out')!;
    expect(union.hasVoltage).toBe(true);
    expect(union.hasCurrent).toBe(true);
    expect(union.locked).toBe(false);
  });
});
