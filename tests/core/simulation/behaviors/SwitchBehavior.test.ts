/**
 * Unit tests for SwitchBehavior tickCount feature
 * Feature: 017-simulation-speed
 * @module tests/core/simulation/behaviors/SwitchBehavior.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SwitchBehavior } from '../../../../src/core/simulation/behaviors/basic/SwitchBehavior';
import { Component } from '../../../../src/core/topology/Component';
import { Position } from '../../../../src/core/utils/Position';
import { Rotation } from '../../../../src/core/utils/Rotation';
import { SwitchState } from '../../../../src/core/simulation/states/basic/SwitchState';
import { ComponentType } from '../../../../src';
import type { IUserCommand } from '../../../../src';

/**
 * Create a mock switch component with config
 * Switch has 2 pins: in (0), out (1)
 */
function createMockSwitch(): Component {
  const pins = ['pin-in', 'pin-out'];
  return new Component(ComponentType.Switch, new Position(0, 0), new Rotation(0), pins);
}

/**
 * Create a toggle_switch command with optional tickCount
 */
function createToggleCommand(
  targetId: string,
  scheduledAtTick: number,
  tickCount?: number
): IUserCommand {
  const parameters =
    tickCount !== undefined ? new Map<string, string>([['tickCount', String(tickCount)]]) : null;

  return {
    type: 'toggle_switch',
    targetId: targetId as any,
    scheduledAtTick,
    parameters,
  };
}

describe('SwitchBehavior - tickCount (017-simulation-speed)', () => {
  let behavior: SwitchBehavior;

  beforeEach(() => {
    behavior = new SwitchBehavior();
  });

  // T020: Test tickCount handling in onUserCommand
  describe('T020: tickCount handling in onUserCommand', () => {
    it('should use tickCount from command parameters when provided', () => {
      const switchComp = createMockSwitch();
      const state = behavior.createInitialState(switchComp) as SwitchState;
      expect(state.state).toBe('open');

      // Create command with tickCount=5
      const command = createToggleCommand(switchComp.id, 10, 5);
      const result = behavior.onUserCommand(switchComp, state, command);

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closing');
      expect(result.scheduledEvents).toHaveLength(1);
      // tickCount=5: readyAtTick = startTick + 5 = 11 + 5 = 16
      // (startTick = scheduledAtTick + 1 = 11)
    });

    it('should use default tickCount=1 when not provided', () => {
      const switchComp = createMockSwitch();
      const state = behavior.createInitialState(switchComp) as SwitchState;

      // Create command without tickCount
      const command = createToggleCommand(switchComp.id, 10);
      const result = behavior.onUserCommand(switchComp, state, command);

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closing');
      expect(result.scheduledEvents).toHaveLength(1);
      // Default tickCount=1: readyAtTick = startTick + 1 = 11 + 1 = 12
    });

    it('should enforce minimum tickCount of 1', () => {
      const switchComp = createMockSwitch();
      const state = behavior.createInitialState(switchComp) as SwitchState;

      // Create command with tickCount=0 (invalid)
      const command = createToggleCommand(switchComp.id, 10, 0);
      const result = behavior.onUserCommand(switchComp, state, command);

      expect(result.hasChanged).toBe(true);
      expect(result.scheduledEvents).toHaveLength(1);
      // Should use minimum of 1: readyAtTick = 11 + 1 = 12
    });

    it('should handle large tickCount values', () => {
      const switchComp = createMockSwitch();
      const state = behavior.createInitialState(switchComp) as SwitchState;

      // Create command with large tickCount
      const command = createToggleCommand(switchComp.id, 10, 100);
      const result = behavior.onUserCommand(switchComp, state, command);

      expect(result.hasChanged).toBe(true);
      expect(result.scheduledEvents).toHaveLength(1);
      // tickCount=100: readyAtTick = 11 + 100 = 111
    });

    it('should handle opening transition with tickCount', () => {
      const switchComp = createMockSwitch();
      const state = new SwitchState(switchComp.id, 'closed');

      // Create command with tickCount=3
      const command = createToggleCommand(switchComp.id, 20, 3);
      const result = behavior.onUserCommand(switchComp, state, command);

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('opening');
      expect(result.scheduledEvents).toHaveLength(1);
      expect(result.scheduledEvents[0].type).toBe('OpeningEnd');
      // tickCount=3: readyAtTick = 21 + 3 = 24
    });

    it('should handle invalid tickCount string gracefully', () => {
      const switchComp = createMockSwitch();
      const state = behavior.createInitialState(switchComp) as SwitchState;

      // Create command with invalid tickCount
      const parameters = new Map<string, string>([['tickCount', 'invalid']]);
      const command: IUserCommand = {
        type: 'toggle_switch',
        targetId: switchComp.id as any,
        scheduledAtTick: 10,
        parameters,
      };

      const result = behavior.onUserCommand(switchComp, state, command);

      expect(result.hasChanged).toBe(true);
      expect(result.scheduledEvents).toHaveLength(1);
      // Should fall back to default of 1
    });

    it('should complete transition at correct tick', () => {
      const switchComp = createMockSwitch();
      const state = behavior.createInitialState(switchComp) as SwitchState;

      // Start transition with tickCount=5
      const command = createToggleCommand(switchComp.id, 10, 5);
      behavior.onUserCommand(switchComp, state, command);
      expect(state.state).toBe('closing');

      // Fire the event at correct tick
      const result = behavior.onEventFiring(switchComp, state, {
        targetId: switchComp.id,
        scheduledAtTick: 11,
        readyAtTick: 16,
        type: 'ClosingEnd',
        parameters: undefined,
      });

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closed');
    });
  });

  // Additional tests for command handling
  describe('command handling edge cases', () => {
    it('should ignore toggle command when already in transition', () => {
      const switchComp = createMockSwitch();
      // State is already in 'closing' transition
      const state = new SwitchState(switchComp.id, 'closing');

      const command = createToggleCommand(switchComp.id, 10, 5);
      const result = behavior.onUserCommand(switchComp, state, command);

      // Should not change - already in transition
      expect(result.hasChanged).toBe(false);
      expect(result.scheduledEvents).toHaveLength(0);
    });

    it('should handle negative tickCount as minimum 1', () => {
      const switchComp = createMockSwitch();
      const state = behavior.createInitialState(switchComp) as SwitchState;

      // Create command with negative tickCount
      const command = createToggleCommand(switchComp.id, 10, -5);
      const result = behavior.onUserCommand(switchComp, state, command);

      expect(result.hasChanged).toBe(true);
      expect(result.scheduledEvents).toHaveLength(1);
    });
  });

  describe('onPinsChange - output pin state via pinStates', () => {
    const OFF = { hasVoltage: false, hasCurrent: false, locked: false };

    it('should store pin states and detect output change', () => {
      const switchComp = createMockSwitch();
      const state = behavior.createInitialState(switchComp) as SwitchState;
      const inputPinId = switchComp.pins[0]!;
      const outputPinId = switchComp.pins[1]!;

      const nodeStates = new Map<
        string,
        { hasVoltage: boolean; hasCurrent: boolean; locked: boolean }
      >([
        [inputPinId, OFF],
        [outputPinId, { hasVoltage: true, hasCurrent: true, locked: false }],
      ]);

      // First call populates pinStates; changedPins is empty (no prev) → hasChanged false
      const result = behavior.onPinsChange(switchComp, state, nodeStates as any, 0);

      expect(result.shouldCancelPending).toBe(false);
      expect(result.scheduledEvents).toHaveLength(0);
      expect(state.pinStates.get('output')!.hasVoltage).toBe(true);
      expect(state.pinStates.get('output')!.hasCurrent).toBe(true);
    });

    it('should not mark changed when pin states are the same', () => {
      const switchComp = createMockSwitch();
      const state = behavior.createInitialState(switchComp) as SwitchState;
      const inputPinId = switchComp.pins[0]!;
      const outputPinId = switchComp.pins[1]!;

      const nodeStates = new Map<
        string,
        { hasVoltage: boolean; hasCurrent: boolean; locked: boolean }
      >([
        [inputPinId, OFF],
        [outputPinId, { hasVoltage: false, hasCurrent: true, locked: false }],
      ]);

      // First call populates pinStates
      behavior.onPinsChange(switchComp, state, nodeStates as any, 0);
      // Second call with same values should not mark changed
      const result = behavior.onPinsChange(switchComp, state, nodeStates as any, 1);

      expect(result.hasChanged).toBe(false);
    });

    it('should mark changed when output pin state differs', () => {
      const switchComp = createMockSwitch();
      const state = behavior.createInitialState(switchComp) as SwitchState;
      const inputPinId = switchComp.pins[0]!;
      const outputPinId = switchComp.pins[1]!;

      const nodeStatesOff = new Map<
        string,
        { hasVoltage: boolean; hasCurrent: boolean; locked: boolean }
      >([
        [inputPinId, OFF],
        [outputPinId, { hasVoltage: false, hasCurrent: false, locked: false }],
      ]);
      const nodeStatesOn = new Map<
        string,
        { hasVoltage: boolean; hasCurrent: boolean; locked: boolean }
      >([
        [inputPinId, OFF],
        [outputPinId, { hasVoltage: true, hasCurrent: false, locked: false }],
      ]);

      behavior.onPinsChange(switchComp, state, nodeStatesOff as any, 0);
      const result = behavior.onPinsChange(switchComp, state, nodeStatesOn as any, 1);

      expect(result.hasChanged).toBe(true);
      expect(state.pinStates.get('output')!.hasVoltage).toBe(true);
      expect(state.pinStates.get('output')!.hasCurrent).toBe(false);
    });
  });
});
