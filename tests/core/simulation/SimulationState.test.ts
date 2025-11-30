/**
 * Unit tests for SimulationState
 * @module tests/core/simulation
 */

import { describe, it, expect } from 'vitest';
import { SimulationState } from '@/core/simulation/SimulationState.js';
import type { NodeElectricalState } from '@/core/simulation/states/NodeElectricalState.js';
import { ComponentState } from '@/core/simulation/states/ComponentState.js';
import { generateUUID } from '@/core/types/Identifier.js';

// Mock ComponentState implementation for testing
class MockComponentState extends ComponentState {
  constructor(componentId: string, initialState: string) {
    super(componentId, initialState);
  }
}

describe('SimulationState', () => {
  describe('constructor', () => {
    it('should create state with valid tick', () => {
      const state = new SimulationState(0);
      expect(state.tick).toBe(0);
      expect(state.nodeStates).toBeInstanceOf(Map);
      expect(state.wireStates).toBeInstanceOf(Map);
      expect(state.componentStates).toBeInstanceOf(Map);
    });

    it('should create state with positive tick', () => {
      const state = new SimulationState(42);
      expect(state.tick).toBe(42);
    });

    it('should throw error for negative tick', () => {
      expect(() => new SimulationState(-1)).toThrow(RangeError);
      expect(() => new SimulationState(-1)).toThrow('Tick must be a non-negative integer');
    });

    it('should throw error for non-integer tick', () => {
      expect(() => new SimulationState(3.14)).toThrow(RangeError);
      expect(() => new SimulationState(3.14)).toThrow('Tick must be a non-negative integer');
    });

    it('should initialize empty maps', () => {
      const state = new SimulationState(0);
      expect(state.nodeStates.size).toBe(0);
      expect(state.wireStates.size).toBe(0);
      expect(state.componentStates.size).toBe(0);
    });
  });

  describe('clone', () => {
    it('should create a shallow clone with same tick', () => {
      const state = new SimulationState(5);
      const cloned = state.clone();

      expect(cloned).not.toBe(state);
      expect(cloned.tick).toBe(5);
    });

    it('should clone nodeStates map', () => {
      const state = new SimulationState(0);
      const nodeId = generateUUID();
      const nodeState: NodeElectricalState = { hasVoltage: true, hasCurrent: false };

      // Add to original (need to cast to mutable for testing)
      (state.nodeStates as Map<string, NodeElectricalState>).set(nodeId, nodeState);

      const cloned = state.clone();

      expect(cloned.nodeStates).not.toBe(state.nodeStates);
      expect(cloned.nodeStates.size).toBe(1);
      expect(cloned.nodeStates.get(nodeId)).toBe(nodeState); // Same object (structural sharing)
    });

    it('should clone wireStates map', () => {
      const state = new SimulationState(0);
      const wireId = generateUUID();
      const wireState: NodeElectricalState = { hasVoltage: false, hasCurrent: true };

      (state.wireStates as Map<string, NodeElectricalState>).set(wireId, wireState);

      const cloned = state.clone();

      expect(cloned.wireStates).not.toBe(state.wireStates);
      expect(cloned.wireStates.size).toBe(1);
      expect(cloned.wireStates.get(wireId)).toBe(wireState);
    });

    it('should clone componentStates map', () => {
      const state = new SimulationState(0);
      const compId = generateUUID();
      const compState = new MockComponentState(compId, 'on');

      (state.componentStates as Map<string, ComponentState>).set(compId, compState);

      const cloned = state.clone();

      expect(cloned.componentStates).not.toBe(state.componentStates);
      expect(cloned.componentStates.size).toBe(1);
      expect(cloned.componentStates.get(compId)).toBe(compState);
    });

    it('should perform structural sharing (not deep clone)', () => {
      const state = new SimulationState(0);
      const nodeId = generateUUID();
      const nodeState: NodeElectricalState = { hasVoltage: true, hasCurrent: true };

      (state.nodeStates as Map<string, NodeElectricalState>).set(nodeId, nodeState);

      const cloned = state.clone();

      // Maps are different objects
      expect(cloned.nodeStates).not.toBe(state.nodeStates);

      // But contained objects are shared
      expect(cloned.nodeStates.get(nodeId)).toBe(state.nodeStates.get(nodeId));
    });

    it('should clone all three map types together', () => {
      const state = new SimulationState(10);

      const nodeId = generateUUID();
      const wireId = generateUUID();
      const compId = generateUUID();

      (state.nodeStates as Map<string, NodeElectricalState>).set(nodeId, {
        hasVoltage: true,
        hasCurrent: false
      });
      (state.wireStates as Map<string, NodeElectricalState>).set(wireId, {
        hasVoltage: false,
        hasCurrent: true
      });
      (state.componentStates as Map<string, ComponentState>).set(
        compId,
        new MockComponentState(compId, 'active')
      );

      const cloned = state.clone();

      expect(cloned.tick).toBe(10);
      expect(cloned.nodeStates.size).toBe(1);
      expect(cloned.wireStates.size).toBe(1);
      expect(cloned.componentStates.size).toBe(1);
      expect(cloned.nodeStates.get(nodeId)).toEqual({ hasVoltage: true, hasCurrent: false });
      expect(cloned.wireStates.get(wireId)).toEqual({ hasVoltage: false, hasCurrent: true });
      expect(cloned.componentStates.get(compId)?.state).toBe('active');
    });
  });

  describe('readonly properties', () => {
    it('should have readonly tick', () => {
      const state = new SimulationState(0);
      // TypeScript enforces readonly at compile time
      expect(state.tick).toBe(0);
    });

    it('should have readonly maps', () => {
      const state = new SimulationState(0);
      // Maps are typed as ReadonlyMap
      expect(state.nodeStates).toBeInstanceOf(Map);
      expect(state.wireStates).toBeInstanceOf(Map);
      expect(state.componentStates).toBeInstanceOf(Map);
    });
  });
});
