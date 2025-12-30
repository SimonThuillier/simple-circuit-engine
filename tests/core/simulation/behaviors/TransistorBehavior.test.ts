/**
 * Unit tests for TransistorBehavior transitionSpan feature
 * Feature: 017-simulation-speed
 * @module tests/core/simulation/behaviors/TransistorBehavior.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TransistorBehavior } from '../../../../src/core/simulation/behaviors/TransistorBehavior';
import { Component } from '../../../../src/core/Component';
import { ComponentType } from '../../../../src/core/types/ComponentType';
import { Position } from '../../../../src/core/types/Position';
import { Rotation } from '../../../../src/core/types/Rotation';
import { TransistorState } from '../../../../src/core/simulation/states/TransistorState';
import type { NodeElectricalState } from '../../../../src/core/simulation';
import type { UUID } from '../../../../src/core/types/Identifier';

/**
 * Create a mock transistor component with config
 * Transistor has 3 pins: base (0), collector (1), emitter (2)
 */
function createMockTransistor(transitionSpan?: number): Component {
  const pins = ['pin-base', 'pin-collector', 'pin-emitter'];
  const transistor = new Component(
    ComponentType.Transistor,
    new Position(0, 0),
    new Rotation(0),
    pins
  );

  if (transitionSpan !== undefined) {
    transistor.config.set('transitionSpan', String(transitionSpan));
  }

  return transistor;
}

/**
 * Create node states for transistor pins
 */
function createNodeStates(
  transistor: Component,
  baseVoltage: boolean
): Map<UUID, NodeElectricalState> {
  const states = new Map<UUID, NodeElectricalState>();

  for (const pinId of transistor.pins) {
    const label = transistor.getPinLabel(pinId);
    if (label === 'base') {
      states.set(pinId as UUID, {
        hasVoltage: baseVoltage,
        hasCurrent: false,
      });
    } else {
      states.set(pinId as UUID, {
        hasVoltage: false,
        hasCurrent: false,
      });
    }
  }

  return states;
}

describe('TransistorBehavior - transitionSpan (017-simulation-speed)', () => {
  let behavior: TransistorBehavior;

  beforeEach(() => {
    behavior = new TransistorBehavior();
  });

  // T012: Test transitionSpan with default value
  describe('T012: transitionSpan default behavior', () => {
    it('should use transitionSpan=1 (instant) when not configured', () => {
      const transistor = createMockTransistor(); // No transitionSpan set
      const state = behavior.createInitialState(transistor) as TransistorState;
      const nodeStates = createNodeStates(transistor, true); // Apply gate voltage

      expect(state.state).toBe('open');

      const result = behavior.onPinsChange(transistor, state, nodeStates, 10);

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closing');
      expect(result.scheduledEvents).toHaveLength(1);
      // Default transitionSpan=1: readyAtTick = 10 + 1 = 11
      expect(result.scheduledEvents[0].readyAtTick).toBe(11);
    });

    it('should complete transition in 1 tick with default config', () => {
      const transistor = createMockTransistor();
      const state = behavior.createInitialState(transistor) as TransistorState;
      const nodeStates = createNodeStates(transistor, true);

      // Start transition
      behavior.onPinsChange(transistor, state, nodeStates, 10);
      expect(state.state).toBe('closing');

      // Fire the event at tick 11
      const result = behavior.onEventFiring(transistor, state, {
        targetId: transistor.id,
        scheduledAtTick: 10,
        readyAtTick: 11,
        type: 'ClosingEnd',
        parameters: undefined,
      });

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closed');
    });
  });

  // T012: Test transitionSpan with custom value
  describe('T012: transitionSpan custom value', () => {
    it('should schedule event at targetTick + transitionSpan', () => {
      const transistor = createMockTransistor(3);
      const state = behavior.createInitialState(transistor) as TransistorState;
      const nodeStates = createNodeStates(transistor, true);

      const result = behavior.onPinsChange(transistor, state, nodeStates, 10);

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closing');
      expect(result.scheduledEvents).toHaveLength(1);
      // transitionSpan=3: readyAtTick = 10 + 3 = 13
      expect(result.scheduledEvents[0].readyAtTick).toBe(13);
    });

    it('should complete transition after transitionSpan ticks', () => {
      const transistor = createMockTransistor(5);
      const state = behavior.createInitialState(transistor) as TransistorState;
      const nodeStates = createNodeStates(transistor, true);

      // Start transition at tick 10
      behavior.onPinsChange(transistor, state, nodeStates, 10);
      expect(state.state).toBe('closing');

      // Fire the event at tick 15 (10 + 5)
      const result = behavior.onEventFiring(transistor, state, {
        targetId: transistor.id,
        scheduledAtTick: 10,
        readyAtTick: 15,
        type: 'ClosingEnd',
        parameters: undefined,
      });

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closed');
    });

    it('should handle opening transition with transitionSpan', () => {
      const transistor = createMockTransistor(4);
      const state = new TransistorState(transistor.id, 'closed');

      // Remove gate voltage to start opening
      const nodeStates = createNodeStates(transistor, false);
      const result = behavior.onPinsChange(transistor, state, nodeStates, 20);

      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('opening');
      expect(result.scheduledEvents).toHaveLength(1);
      // transitionSpan=4: readyAtTick = 20 + 4 = 24
      expect(result.scheduledEvents[0].readyAtTick).toBe(24);
      expect(result.scheduledEvents[0].type).toBe('OpeningEnd');
    });
  });

  // T012: Test transition cancellation
  describe('T012: transition cancellation', () => {
    it('should cancel closing transition when gate signal removed', () => {
      const transistor = createMockTransistor(5);
      const state = behavior.createInitialState(transistor) as TransistorState;

      // Start closing
      let nodeStates = createNodeStates(transistor, true);
      behavior.onPinsChange(transistor, state, nodeStates, 10);
      expect(state.state).toBe('closing');

      // Remove gate before transition completes
      nodeStates = createNodeStates(transistor, false);
      const result = behavior.onPinsChange(transistor, state, nodeStates, 12);

      // Transition should change direction - now opening
      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('opening');
    });

    it('should cancel opening transition when gate signal restored', () => {
      const transistor = createMockTransistor(5);
      const state = new TransistorState(transistor.id, 'closed');

      // Start opening
      let nodeStates = createNodeStates(transistor, false);
      behavior.onPinsChange(transistor, state, nodeStates, 10);
      expect(state.state).toBe('opening');

      // Restore gate before transition completes
      nodeStates = createNodeStates(transistor, true);
      const result = behavior.onPinsChange(transistor, state, nodeStates, 12);

      // Transition should change direction - now closing
      expect(result.hasChanged).toBe(true);
      expect(state.state).toBe('closing');
    });
  });

  // Edge cases
  describe('transitionSpan edge cases', () => {
    it('should enforce minimum transitionSpan of 1', () => {
      const transistor = createMockTransistor(0); // Invalid: 0
      const state = behavior.createInitialState(transistor) as TransistorState;
      const nodeStates = createNodeStates(transistor, true);

      const result = behavior.onPinsChange(transistor, state, nodeStates, 10);

      // Should use minimum of 1
      expect(result.scheduledEvents[0].readyAtTick).toBe(11);
    });

    it('should handle invalid transitionSpan config gracefully', () => {
      const transistor = createMockTransistor();
      transistor.config.set('transitionSpan', 'invalid');
      const state = behavior.createInitialState(transistor) as TransistorState;
      const nodeStates = createNodeStates(transistor, true);

      const result = behavior.onPinsChange(transistor, state, nodeStates, 10);

      // Should fall back to default of 1
      expect(result.scheduledEvents[0].readyAtTick).toBe(11);
    });

    it('should handle large transitionSpan values', () => {
      const transistor = createMockTransistor(100);
      const state = behavior.createInitialState(transistor) as TransistorState;
      const nodeStates = createNodeStates(transistor, true);

      const result = behavior.onPinsChange(transistor, state, nodeStates, 10);

      expect(result.scheduledEvents[0].readyAtTick).toBe(110);
    });
  });
});
