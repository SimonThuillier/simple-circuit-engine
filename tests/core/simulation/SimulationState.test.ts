/**
 * Unit tests for SimulationState class
 *
 * Tests simulation state snapshot functionality:
 * - State initialization
 * - Tick validation
 * - State cloning
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { NodeElectricalState } from 'simple-circuit-engine/core';
import { SimulationState, ComponentState } from 'simple-circuit-engine/core';

class DummyComponentState extends ComponentState {
  constructor(componentId: string) {
    super(componentId, 'dummy');
  }
}

describe('SimulationState', () => {
  describe('constructor', () => {
    it('should create a simulation state with tick 0', () => {
      const state = new SimulationState(0);

      expect(state).toBeDefined();
      expect(state.tick).toBe(0);
      expect(state.nodeStates).toBeInstanceOf(Map);
      expect(state.wireStates).toBeInstanceOf(Map);
      expect(state.componentStates).toBeInstanceOf(Map);
      expect(state.nodeStates.size).toBe(0);
      expect(state.wireStates.size).toBe(0);
      expect(state.componentStates.size).toBe(0);
    });

    it('should create a simulation state with positive tick', () => {
      const state = new SimulationState(42);

      expect(state.tick).toBe(42);
    });

    it('should throw for negative tick', () => {
      expect(() => new SimulationState(-1)).toThrow(RangeError);
      expect(() => new SimulationState(-1)).toThrow(/non-negative integer/);
    });

    it('should throw for non-integer tick', () => {
      expect(() => new SimulationState(3.14)).toThrow(RangeError);
      expect(() => new SimulationState(3.14)).toThrow(/non-negative integer/);
    });

    it('should throw for NaN tick', () => {
      expect(() => new SimulationState(NaN)).toThrow(RangeError);
    });

    it('should throw for Infinity tick', () => {
      expect(() => new SimulationState(Infinity)).toThrow(RangeError);
    });
  });

  describe('setTick()', () => {
    it('should update the tick value', () => {
      const state = new SimulationState(0);
      state.setTick(10);

      expect(state.tick).toBe(10);
    });

    it('should allow setting tick to 0', () => {
      const state = new SimulationState(5);
      state.setTick(0);

      expect(state.tick).toBe(0);
    });

    it('should allow increasing tick', () => {
      const state = new SimulationState(5);
      state.setTick(10);

      expect(state.tick).toBe(10);
    });

    it('should allow decreasing tick', () => {
      const state = new SimulationState(10);
      state.setTick(5);

      expect(state.tick).toBe(5);
    });
  });

  describe('state maps', () => {
    let state: SimulationState;

    beforeEach(() => {
      state = new SimulationState(0);
    });

    it('should allow storing node states', () => {
      const nodeState: NodeElectricalState = {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      };

      (state.nodeStates as Map<string, NodeElectricalState>).set('node-1', nodeState);

      expect(state.nodeStates.size).toBe(1);
      expect(state.nodeStates.get('node-1')).toBe(nodeState);
    });

    it('should allow storing wire states', () => {
      const wireState: NodeElectricalState = {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      };

      (state.wireStates as Map<string, NodeElectricalState>).set('wire-1', wireState);

      expect(state.wireStates.size).toBe(1);
      expect(state.wireStates.get('wire-1')).toBe(wireState);
    });

    it('should allow storing component states', () => {
      const compState = new DummyComponentState('comp-1');

      (state.componentStates as Map<string, ComponentState>).set('comp-1', compState);

      expect(state.componentStates.size).toBe(1);
      expect(state.componentStates.get('comp-1')).toBe(compState);
    });

    it('should allow storing multiple states', () => {
      const nodeState1: NodeElectricalState = {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      };
      const nodeState2: NodeElectricalState = {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      };
      const wireState: NodeElectricalState = {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      };
      const compState = new DummyComponentState('comp-1');

      (state.nodeStates as Map<string, NodeElectricalState>).set('node-1', nodeState1);
      (state.nodeStates as Map<string, NodeElectricalState>).set('node-2', nodeState2);
      (state.wireStates as Map<string, NodeElectricalState>).set('wire-1', wireState);
      (state.componentStates as Map<string, ComponentState>).set('comp-1', compState);

      expect(state.nodeStates.size).toBe(2);
      expect(state.wireStates.size).toBe(1);
      expect(state.componentStates.size).toBe(1);
    });
  });

  describe('clone()', () => {
    it('should create a deep copy of the state', () => {
      const state = new SimulationState(10);
      const clone = state.clone();

      expect(clone).not.toBe(state);
      expect(clone.tick).toBe(state.tick);
    });

    it('should clone state with empty maps', () => {
      const state = new SimulationState(5);
      const clone = state.clone();

      expect(clone.nodeStates.size).toBe(0);
      expect(clone.wireStates.size).toBe(0);
      expect(clone.componentStates.size).toBe(0);
    });

    it('should clone state with node states', () => {
      const state = new SimulationState(5);
      const nodeState: NodeElectricalState = {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      };
      (state.nodeStates as Map<string, NodeElectricalState>).set('node-1', nodeState);

      const clone = state.clone();

      expect(clone.nodeStates.size).toBe(1);
      expect(clone.nodeStates.get('node-1')).toEqual(nodeState);
    });

    it('should clone state with wire states', () => {
      const state = new SimulationState(5);
      const wireState: NodeElectricalState = {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      };
      (state.wireStates as Map<string, NodeElectricalState>).set('wire-1', wireState);

      const clone = state.clone();

      expect(clone.wireStates.size).toBe(1);
      expect(clone.wireStates.get('wire-1')).toEqual(wireState);
    });

    it('should clone state with component states', () => {
      const state = new SimulationState(5);
      const compState = new DummyComponentState('comp-1');
      (state.componentStates as Map<string, ComponentState>).set('comp-1', compState);

      const clone = state.clone();

      expect(clone.componentStates.size).toBe(1);
      expect(clone.componentStates.get('comp-1')).toBeDefined();
    });

    it('should create independent clone (modifying clone does not affect original)', () => {
      const state = new SimulationState(5);
      const nodeState: NodeElectricalState = {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      };
      (state.nodeStates as Map<string, NodeElectricalState>).set('node-1', nodeState);

      const clone = state.clone();
      clone.setTick(10);
      (clone.nodeStates as Map<string, NodeElectricalState>).set('node-2', {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      });

      expect(state.tick).toBe(5);
      expect(state.nodeStates.size).toBe(1);
      expect(clone.tick).toBe(10);
      expect(clone.nodeStates.size).toBe(2);
    });
  });

  describe('readonly properties', () => {
    it('should expose maps as readonly', () => {
      const state = new SimulationState(0);

      // TypeScript should enforce readonly at compile time
      // At runtime, these are still Map objects
      expect(state.nodeStates).toBeInstanceOf(Map);
      expect(state.wireStates).toBeInstanceOf(Map);
      expect(state.componentStates).toBeInstanceOf(Map);
    });
  });

  describe('tick property', () => {
    it('should be mutable via setTick', () => {
      const state = new SimulationState(0);
      state.setTick(5);

      expect(state.tick).toBe(5);
    });

    it('should be directly assignable', () => {
      const state = new SimulationState(0);
      state.tick = 10;

      expect(state.tick).toBe(10);
    });
  });

  describe('state snapshot use case', () => {
    it('should represent a complete circuit state snapshot', () => {
      const state = new SimulationState(100);

      // Simulate a circuit state
      const nodeState1: NodeElectricalState = {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      };
      const nodeState2: NodeElectricalState = {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      };
      const wireState: NodeElectricalState = {
        hasVoltage: false,
        hasCurrent: false,
        locked: false,
      };
      const compState = new DummyComponentState('battery-1');

      (state.nodeStates as Map<string, NodeElectricalState>).set('node-1', nodeState1);
      (state.nodeStates as Map<string, NodeElectricalState>).set('node-2', nodeState2);
      (state.wireStates as Map<string, NodeElectricalState>).set('wire-1', wireState);
      (state.componentStates as Map<string, ComponentState>).set('battery-1', compState);

      // Verify complete state
      expect(state.tick).toBe(100);
      expect(state.nodeStates.size).toBe(2);
      expect(state.wireStates.size).toBe(1);
      expect(state.componentStates.size).toBe(1);

      // Clone for history
      const snapshot = state.clone();
      expect(snapshot.tick).toBe(100);
      expect(snapshot.nodeStates.size).toBe(2);
    });
  });

  describe('large state performance', () => {
    it('should handle large number of states efficiently', () => {
      const state = new SimulationState(0);
      const startTime = Date.now();

      // Add 1000 node states
      for (let i = 0; i < 1000; i++) {
        (state.nodeStates as Map<string, NodeElectricalState>).set(`node-${i}`, {
          hasVoltage: false,
          hasCurrent: false,
          locked: false,
        });
      }

      const addTime = Date.now() - startTime;
      expect(state.nodeStates.size).toBe(1000);
      expect(addTime).toBeLessThan(1000); // Should add in < 1 second
    });

    it('should clone large state efficiently', () => {
      const state = new SimulationState(0);

      // Add many states
      for (let i = 0; i < 100; i++) {
        (state.nodeStates as Map<string, NodeElectricalState>).set(`node-${i}`, {
          hasVoltage: false,
          hasCurrent: false,
          locked: false,
        });
        (state.wireStates as Map<string, NodeElectricalState>).set(`wire-${i}`, {
          hasVoltage: false,
          hasCurrent: false,
          locked: false,
        });
      }

      const startTime = Date.now();
      const clone = state.clone();
      const cloneTime = Date.now() - startTime;

      expect(clone.nodeStates.size).toBe(100);
      expect(clone.wireStates.size).toBe(100);
      expect(cloneTime).toBeLessThan(100); // Should clone in < 100ms
    });
  });
});
