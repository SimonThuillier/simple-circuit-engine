/**
 * Unit tests for BehaviorRegistry
 * @module tests/core/simulation/behaviors
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BehaviorRegistry } from '@/core/simulation/behaviors/BehaviorRegistry.js';
import type { ComponentBehavior, BehaviorContext, BehaviorResult } from '@/core/simulation/behaviors/ComponentBehavior.js';
import type { Component } from '@/core/model/Component.js';
import type { ComponentState } from '@/core/simulation/states/ComponentState.js';

// Mock behavior implementations for testing
class MockBehavior implements ComponentBehavior {
  constructor(public readonly componentType: string) {}

  evaluate(_component: Component, _context: BehaviorContext): BehaviorResult {
    return {
      componentState: null,
      outputPinStates: new Map(),
      scheduledEvents: []
    };
  }

  createInitialState(_component: Component): ComponentState {
    // Return a mock state (we'll need a concrete ComponentState subclass)
    return {
      componentId: _component.id,
      state: 'initial',
      transitionStartTick: null,
      delayCounter: 0
    } as ComponentState;
  }
}

describe('BehaviorRegistry', () => {
  let registry: BehaviorRegistry;

  beforeEach(() => {
    registry = new BehaviorRegistry();
  });

  describe('constructor', () => {
    it('should create empty registry', () => {
      expect(registry.size()).toBe(0);
      expect(registry.getRegisteredTypes()).toEqual([]);
    });
  });

  describe('register', () => {
    it('should register a behavior', () => {
      const behavior = new MockBehavior('battery');

      registry.register(behavior);

      expect(registry.size()).toBe(1);
      expect(registry.has('battery')).toBe(true);
    });

    it('should register multiple different behaviors', () => {
      const batteryBehavior = new MockBehavior('battery');
      const ledBehavior = new MockBehavior('led');

      registry.register(batteryBehavior);
      registry.register(ledBehavior);

      expect(registry.size()).toBe(2);
      expect(registry.has('battery')).toBe(true);
      expect(registry.has('led')).toBe(true);
    });

    it('should overwrite existing behavior for same type', () => {
      const behavior1 = new MockBehavior('battery');
      const behavior2 = new MockBehavior('battery');

      registry.register(behavior1);
      registry.register(behavior2);

      expect(registry.size()).toBe(1);
      expect(registry.get('battery')).toBe(behavior2);
    });

    it('should throw error for null behavior', () => {
      expect(() => registry.register(null as any)).toThrow(TypeError);
      expect(() => registry.register(null as any)).toThrow('Behavior cannot be null or undefined');
    });

    it('should throw error for undefined behavior', () => {
      expect(() => registry.register(undefined as any)).toThrow(TypeError);
    });

    it('should throw error for empty componentType', () => {
      const behavior = new MockBehavior('');

      expect(() => registry.register(behavior)).toThrow(TypeError);
      expect(() => registry.register(behavior)).toThrow('componentType cannot be empty');
    });

    it('should throw error for whitespace-only componentType', () => {
      const behavior = new MockBehavior('   ');

      expect(() => registry.register(behavior)).toThrow(TypeError);
    });
  });

  describe('registerAll', () => {
    it('should register multiple behaviors at once', () => {
      const behaviors = [
        new MockBehavior('battery'),
        new MockBehavior('led'),
        new MockBehavior('switch')
      ];

      registry.registerAll(behaviors);

      expect(registry.size()).toBe(3);
      expect(registry.has('battery')).toBe(true);
      expect(registry.has('led')).toBe(true);
      expect(registry.has('switch')).toBe(true);
    });

    it('should work with empty array', () => {
      registry.registerAll([]);

      expect(registry.size()).toBe(0);
    });

    it('should handle duplicates (last one wins)', () => {
      const behavior1 = new MockBehavior('battery');
      const behavior2 = new MockBehavior('battery');

      registry.registerAll([behavior1, behavior2]);

      expect(registry.size()).toBe(1);
      expect(registry.get('battery')).toBe(behavior2);
    });
  });

  describe('get', () => {
    it('should return registered behavior', () => {
      const behavior = new MockBehavior('battery');

      registry.register(behavior);

      expect(registry.get('battery')).toBe(behavior);
    });

    it('should return undefined for unregistered type', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });

    it('should return correct behavior for each type', () => {
      const batteryBehavior = new MockBehavior('battery');
      const ledBehavior = new MockBehavior('led');

      registry.register(batteryBehavior);
      registry.register(ledBehavior);

      expect(registry.get('battery')).toBe(batteryBehavior);
      expect(registry.get('led')).toBe(ledBehavior);
    });
  });

  describe('has', () => {
    it('should return true for registered type', () => {
      const behavior = new MockBehavior('battery');

      registry.register(behavior);

      expect(registry.has('battery')).toBe(true);
    });

    it('should return false for unregistered type', () => {
      expect(registry.has('unknown')).toBe(false);
    });

    it('should return false after unregister', () => {
      const behavior = new MockBehavior('battery');

      registry.register(behavior);
      registry.unregister('battery');

      expect(registry.has('battery')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should remove registered behavior', () => {
      const behavior = new MockBehavior('battery');

      registry.register(behavior);
      expect(registry.has('battery')).toBe(true);

      const result = registry.unregister('battery');

      expect(result).toBe(true);
      expect(registry.has('battery')).toBe(false);
      expect(registry.size()).toBe(0);
    });

    it('should return false for unregistered type', () => {
      const result = registry.unregister('unknown');

      expect(result).toBe(false);
    });

    it('should only remove specified type', () => {
      const batteryBehavior = new MockBehavior('battery');
      const ledBehavior = new MockBehavior('led');

      registry.register(batteryBehavior);
      registry.register(ledBehavior);

      registry.unregister('battery');

      expect(registry.has('battery')).toBe(false);
      expect(registry.has('led')).toBe(true);
      expect(registry.size()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all behaviors', () => {
      const behaviors = [
        new MockBehavior('battery'),
        new MockBehavior('led'),
        new MockBehavior('switch')
      ];

      registry.registerAll(behaviors);
      expect(registry.size()).toBe(3);

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.has('battery')).toBe(false);
      expect(registry.has('led')).toBe(false);
      expect(registry.has('switch')).toBe(false);
    });

    it('should work on empty registry', () => {
      expect(() => registry.clear()).not.toThrow();
      expect(registry.size()).toBe(0);
    });

    it('should allow registration after clear', () => {
      registry.register(new MockBehavior('battery'));
      registry.clear();

      const newBehavior = new MockBehavior('led');
      registry.register(newBehavior);

      expect(registry.size()).toBe(1);
      expect(registry.has('led')).toBe(true);
    });
  });

  describe('getRegisteredTypes', () => {
    it('should return empty array for empty registry', () => {
      expect(registry.getRegisteredTypes()).toEqual([]);
    });

    it('should return all registered types', () => {
      registry.register(new MockBehavior('battery'));
      registry.register(new MockBehavior('led'));
      registry.register(new MockBehavior('switch'));

      const types = registry.getRegisteredTypes();

      expect(types).toHaveLength(3);
      expect(types).toContain('battery');
      expect(types).toContain('led');
      expect(types).toContain('switch');
    });

    it('should update after registration changes', () => {
      registry.register(new MockBehavior('battery'));
      expect(registry.getRegisteredTypes()).toEqual(['battery']);

      registry.register(new MockBehavior('led'));
      expect(registry.getRegisteredTypes()).toHaveLength(2);

      registry.unregister('battery');
      expect(registry.getRegisteredTypes()).toEqual(['led']);
    });
  });

  describe('size', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.size()).toBe(0);
    });

    it('should return correct count after registrations', () => {
      registry.register(new MockBehavior('battery'));
      expect(registry.size()).toBe(1);

      registry.register(new MockBehavior('led'));
      expect(registry.size()).toBe(2);

      registry.register(new MockBehavior('switch'));
      expect(registry.size()).toBe(3);
    });

    it('should not increase when overwriting', () => {
      registry.register(new MockBehavior('battery'));
      expect(registry.size()).toBe(1);

      registry.register(new MockBehavior('battery'));
      expect(registry.size()).toBe(1);
    });

    it('should decrease after unregister', () => {
      registry.register(new MockBehavior('battery'));
      registry.register(new MockBehavior('led'));
      expect(registry.size()).toBe(2);

      registry.unregister('battery');
      expect(registry.size()).toBe(1);
    });
  });

  describe('integration', () => {
    it('should support complete workflow', () => {
      // Register multiple behaviors
      const batteryBehavior = new MockBehavior('battery');
      const ledBehavior = new MockBehavior('led');
      const switchBehavior = new MockBehavior('switch');

      registry.registerAll([batteryBehavior, ledBehavior, switchBehavior]);

      // Verify all registered
      expect(registry.size()).toBe(3);
      expect(registry.getRegisteredTypes()).toHaveLength(3);

      // Get specific behavior
      const retrievedBattery = registry.get('battery');
      expect(retrievedBattery).toBe(batteryBehavior);

      // Remove one
      registry.unregister('switch');
      expect(registry.size()).toBe(2);

      // Clear all
      registry.clear();
      expect(registry.size()).toBe(0);
      expect(registry.has('battery')).toBe(false);
    });
  });
});
