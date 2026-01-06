/**
 * Unit tests for RelayBehavior transitionSpan feature
 * Feature: 017-simulation-speed
 * @module tests/core/simulation/behaviors/RelayBehavior.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RelayBehavior } from '../../../../src/core/simulation/behaviors/RelayBehavior';
import { Component } from '../../../../src/core/Component';
import { ComponentType } from '../../../../src/core/types/ComponentType';
import { Position } from '../../../../src/core/types/Position';
import { Rotation } from '../../../../src/core/types/Rotation';
import { RelayState } from '../../../../src/core/simulation/states/RelayState';
import type { NodeElectricalState } from '../../../../src/core/simulation';
import type { UUID } from '../../../../src/core/types/Identifier';

/**
 * Create a mock relay component with config
 * Relay has 4 pins: cmd_in (0), cmd_out (1), power_in (2), power_out (3)
 */
function createMockRelay(transitionSpan?: number): Component {
  const pins = ['pin-cmd-in', 'pin-cmd-out', 'pin-power-in', 'pin-power-out'];
  const relay = new Component(ComponentType.Relay, new Position(0, 0), new Rotation(0), pins);

  if (transitionSpan !== undefined) {
    relay.config.set('transitionSpan', String(transitionSpan));
  }

  return relay;
}

/**
 * Create node states for relay pins
 */
function createNodeStates(relay: Component, cmdPowered: boolean): Map<UUID, NodeElectricalState> {
  const states = new Map<UUID, NodeElectricalState>();

  // cmd_in and cmd_out both need voltage AND current for relay to be "commanded"
  const cmdState: NodeElectricalState = {
    hasVoltage: cmdPowered,
    hasCurrent: cmdPowered,
  };

  const powerState: NodeElectricalState = {
    hasVoltage: false,
    hasCurrent: false,
  };

  // Set states for all pins
  for (const pinId of relay.pins) {
    const label = relay.getPinLabel(pinId);
    if (label?.startsWith('cmd')) {
      states.set(pinId as UUID, cmdState);
    } else {
      states.set(pinId as UUID, powerState);
    }
  }

  return states;
}

describe('RelayBehavior - transitionSpan (017-simulation-speed)', () => {
  let behavior: RelayBehavior;

  beforeEach(() => {
    behavior = new RelayBehavior();
  });

  // T011: Test transitionSpan with default value
  describe('T011: transitionSpan default behavior', () => {
    it('should use transitionSpan=1 (instant) when not configured', () => {
      const relay = createMockRelay(); // No transitionSpan set
      const state = behavior.createInitialState(relay) as RelayState;
      const nodeStates = createNodeStates(relay, true); // Power coil

      expect(state.state).toBe('open');

      const result = behavior.onPinsChange(relay, state, nodeStates, 10);

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closing');
      expect(result.scheduledEvents).toHaveLength(1);
      // Default transitionSpan=1: readyAtTick = 10 + 1 = 11
      expect(result.scheduledEvents[0].readyAtTick).toBe(11);
    });

    it('should complete transition in 1 tick with default config', () => {
      const relay = createMockRelay();
      const state = behavior.createInitialState(relay) as RelayState;
      const nodeStates = createNodeStates(relay, true);

      // Start transition
      behavior.onPinsChange(relay, state, nodeStates, 10);
      expect(state.state).toBe('closing');

      // Fire the event at tick 11
      const result = behavior.onEventFiring(relay, state, {
        targetId: relay.id,
        scheduledAtTick: 10,
        readyAtTick: 11,
        type: 'ClosingEnd',
        parameters: undefined,
      });

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closed');
    });
  });

  // T011: Test transitionSpan with custom value
  describe('T011: transitionSpan custom value', () => {
    it('should schedule event at targetTick + transitionSpan', () => {
      const relay = createMockRelay(3);
      const state = behavior.createInitialState(relay) as RelayState;
      const nodeStates = createNodeStates(relay, true);

      const result = behavior.onPinsChange(relay, state, nodeStates, 10);

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closing');
      expect(result.scheduledEvents).toHaveLength(1);
      // transitionSpan=3: readyAtTick = 10 + 3 = 13
      expect(result.scheduledEvents[0].readyAtTick).toBe(13);
    });

    it('should complete transition after transitionSpan ticks', () => {
      const relay = createMockRelay(5);
      const state = behavior.createInitialState(relay) as RelayState;
      const nodeStates = createNodeStates(relay, true);

      // Start transition at tick 10
      behavior.onPinsChange(relay, state, nodeStates, 10);
      expect(state.state).toBe('closing');

      // Fire the event at tick 15 (10 + 5)
      const result = behavior.onEventFiring(relay, state, {
        targetId: relay.id,
        scheduledAtTick: 10,
        readyAtTick: 15,
        type: 'ClosingEnd',
        parameters: undefined,
      });

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closed');
    });

    it('should handle opening transition with transitionSpan', () => {
      const relay = createMockRelay(4);
      const state = new RelayState(relay.id, 'closed');

      // Remove power to start opening
      const nodeStates = createNodeStates(relay, false);
      const result = behavior.onPinsChange(relay, state, nodeStates, 20);

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('opening');
      expect(result.scheduledEvents).toHaveLength(1);
      // transitionSpan=4: readyAtTick = 20 + 4 = 24
      expect(result.scheduledEvents[0].readyAtTick).toBe(24);
      expect(result.scheduledEvents[0].type).toBe('OpeningEnd');
    });
  });

  // T011: Test transition cancellation
  describe('T011: transition cancellation', () => {
    it('should cancel closing transition when coil power removed', () => {
      const relay = createMockRelay(5);
      const state = behavior.createInitialState(relay) as RelayState;

      // Start closing
      let nodeStates = createNodeStates(relay, true);
      behavior.onPinsChange(relay, state, nodeStates, 10);
      expect(state.state).toBe('closing');

      // Remove power before transition completes (at tick 12, before readyAtTick 15)
      nodeStates = createNodeStates(relay, false);
      const result = behavior.onPinsChange(relay, state, nodeStates, 12);

      // Transition should be cancelled - state reverts to 'open'
      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('opening'); // Now opening because power was removed
    });

    it('should cancel opening transition when coil power restored', () => {
      const relay = createMockRelay(5);
      const state = new RelayState(relay.id, 'closed');

      // Start opening
      let nodeStates = createNodeStates(relay, false);
      behavior.onPinsChange(relay, state, nodeStates, 10);
      expect(state.state).toBe('opening');

      // Restore power before transition completes
      nodeStates = createNodeStates(relay, true);
      const result = behavior.onPinsChange(relay, state, nodeStates, 12);

      // Transition should be cancelled - state changes to 'closing'
      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closing');
    });
  });

  // Edge cases
  describe('transitionSpan edge cases', () => {
    it('should enforce minimum transitionSpan of 1', () => {
      const relay = createMockRelay(0); // Invalid: 0
      const state = behavior.createInitialState(relay) as RelayState;
      const nodeStates = createNodeStates(relay, true);

      const result = behavior.onPinsChange(relay, state, nodeStates, 10);

      // Should use minimum of 1
      expect(result.scheduledEvents[0].readyAtTick).toBe(11);
    });

    it('should handle invalid transitionSpan config gracefully', () => {
      const relay = createMockRelay();
      relay.config.set('transitionSpan', 'not-a-number');
      const state = behavior.createInitialState(relay) as RelayState;
      const nodeStates = createNodeStates(relay, true);

      const result = behavior.onPinsChange(relay, state, nodeStates, 10);

      // Should fall back to default of 1
      expect(result.scheduledEvents[0].readyAtTick).toBe(11);
    });

    it('should handle large transitionSpan values', () => {
      const relay = createMockRelay(100);
      const state = behavior.createInitialState(relay) as RelayState;
      const nodeStates = createNodeStates(relay, true);

      const result = behavior.onPinsChange(relay, state, nodeStates, 10);

      expect(result.scheduledEvents[0].readyAtTick).toBe(110);
    });
  });
});
