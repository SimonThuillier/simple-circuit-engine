/**
 * Unit tests for BehaviorRegistry class
 *
 * Tests component behavior registration and retrieval:
 * - Registering behaviors
 * - Retrieving behaviors by component type
 * - Bulk operations
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type {
  ComponentBehavior,
  BehaviorResult,
  Component,
  UserCommand,
  ScheduledEvent,
  UUID,
  NodeElectricalState,
  ENodeSourceType,
} from 'simple-circuit-engine/core';
import { BehaviorRegistry, ComponentState, ComponentType } from 'simple-circuit-engine/core';

// Mock behavior for testing
class MockBehavior implements ComponentBehavior {
  readonly componentType: ComponentType;

  constructor(componentType: ComponentType) {
    this.componentType = componentType;
  }

  createInitialState(component: Component): ComponentState {
    return new ComponentState(component.id, this.componentType);
  }

  allowConductivity(
    component: Component,
    state: ComponentState,
    conductivityType: ENodeSourceType,
    pinId: string,
    otherPinId: string
  ): boolean {
    return true;
  }

  onPinsChange(
    component: Component,
    state: ComponentState,
    nodeStates: ReadonlyMap<UUID, NodeElectricalState>,
    targetTick: number
  ): BehaviorResult {
    return {
      componentState: state,
      hasChanged: false,
      scheduledEvents: [],
    };
  }

  onUserCommand(component: Component, state: ComponentState, command: UserCommand): BehaviorResult {
    return {
      componentState: state,
      hasChanged: false,
      scheduledEvents: [],
    };
  }

  onEventFiring(
    component: Component,
    state: ComponentState,
    event: ScheduledEvent
  ): BehaviorResult {
    return {
      componentState: state,
      hasChanged: false,
      scheduledEvents: [],
    };
  }
}

describe('BehaviorRegistry', () => {
  let registry: BehaviorRegistry;

  beforeEach(() => {
    registry = new BehaviorRegistry();
  });

  describe('constructor', () => {
    it('should create an empty behavior registry', () => {
      const registry = new BehaviorRegistry();

      expect(registry).toBeDefined();
      expect(registry.size()).toBe(0);
      expect(registry.getRegisteredTypes()).toEqual([]);
    });
  });

  describe('register()', () => {
    it('should register a behavior', () => {
      const behavior = new MockBehavior(ComponentType.Battery);

      registry.register(behavior);

      expect(registry.size()).toBe(1);
      expect(registry.has(ComponentType.Battery)).toBe(true);
    });

    it('should register multiple different behaviors', () => {
      const behavior1 = new MockBehavior(ComponentType.Battery);
      const behavior2 = new MockBehavior(ComponentType.Switch);
      const behavior3 = new MockBehavior(ComponentType.SmallLED);

      registry.register(behavior1);
      registry.register(behavior2);
      registry.register(behavior3);

      expect(registry.size()).toBe(3);
      expect(registry.has(ComponentType.Battery)).toBe(true);
      expect(registry.has(ComponentType.Switch)).toBe(true);
      expect(registry.has(ComponentType.SmallLED)).toBe(true);
    });

    it('should overwrite existing behavior for same type', () => {
      const behavior1 = new MockBehavior(ComponentType.Battery);
      const behavior2 = new MockBehavior(ComponentType.Battery);

      registry.register(behavior1);
      registry.register(behavior2);

      expect(registry.size()).toBe(1);
      expect(registry.get(ComponentType.Battery)).toBe(behavior2);
    });

    it('should throw when behavior is null', () => {
      expect(() => registry.register(null as unknown as ComponentBehavior)).toThrow(TypeError);
      expect(() => registry.register(null as unknown as ComponentBehavior)).toThrow(
        /cannot be null or undefined/
      );
    });

    it('should throw when behavior is undefined', () => {
      expect(() => registry.register(undefined as unknown as ComponentBehavior)).toThrow(TypeError);
    });

    it('should throw when componentType is empty string', () => {
      const invalidBehavior = new MockBehavior('' as ComponentType);

      expect(() => registry.register(invalidBehavior)).toThrow(TypeError);
      expect(() => registry.register(invalidBehavior)).toThrow(/componentType cannot be empty/);
    });

    it('should throw when componentType is whitespace only', () => {
      const invalidBehavior = new MockBehavior('   ' as ComponentType);

      expect(() => registry.register(invalidBehavior)).toThrow(TypeError);
    });
  });

  describe('registerAll()', () => {
    it('should register multiple behaviors at once', () => {
      const behaviors = [
        new MockBehavior(ComponentType.Battery),
        new MockBehavior(ComponentType.Switch),
        new MockBehavior(ComponentType.SmallLED),
      ];

      registry.registerAll(behaviors);

      expect(registry.size()).toBe(3);
      expect(registry.has(ComponentType.Battery)).toBe(true);
      expect(registry.has(ComponentType.Switch)).toBe(true);
      expect(registry.has(ComponentType.SmallLED)).toBe(true);
    });

    it('should handle empty array', () => {
      registry.registerAll([]);

      expect(registry.size()).toBe(0);
    });

    it('should handle array with one behavior', () => {
      const behaviors = [new MockBehavior(ComponentType.Battery)];

      registry.registerAll(behaviors);

      expect(registry.size()).toBe(1);
    });

    it('should overwrite existing behaviors', () => {
      const behavior1 = new MockBehavior(ComponentType.Battery);
      registry.register(behavior1);

      const behavior2 = new MockBehavior(ComponentType.Battery);
      registry.registerAll([behavior2]);

      expect(registry.size()).toBe(1);
      expect(registry.get(ComponentType.Battery)).toBe(behavior2);
    });
  });

  describe('get()', () => {
    it('should retrieve registered behavior', () => {
      const behavior = new MockBehavior(ComponentType.Battery);
      registry.register(behavior);

      const retrieved = registry.get(ComponentType.Battery);

      expect(retrieved).toBe(behavior);
    });

    it('should return undefined for unregistered type', () => {
      const result = registry.get(ComponentType.Battery);

      expect(result).toBeUndefined();
    });

    it('should retrieve correct behavior among multiple', () => {
      const behavior1 = new MockBehavior(ComponentType.Battery);
      const behavior2 = new MockBehavior(ComponentType.Switch);
      const behavior3 = new MockBehavior(ComponentType.SmallLED);

      registry.register(behavior1);
      registry.register(behavior2);
      registry.register(behavior3);

      expect(registry.get(ComponentType.Battery)).toBe(behavior1);
      expect(registry.get(ComponentType.Switch)).toBe(behavior2);
      expect(registry.get(ComponentType.SmallLED)).toBe(behavior3);
    });
  });

  describe('has()', () => {
    it('should return false for unregistered type', () => {
      expect(registry.has(ComponentType.Battery)).toBe(false);
    });

    it('should return true for registered type', () => {
      const behavior = new MockBehavior(ComponentType.Battery);
      registry.register(behavior);

      expect(registry.has(ComponentType.Battery)).toBe(true);
    });

    it('should return false after unregistering', () => {
      const behavior = new MockBehavior(ComponentType.Battery);
      registry.register(behavior);
      registry.unregister(ComponentType.Battery);

      expect(registry.has(ComponentType.Battery)).toBe(false);
    });
  });

  describe('unregister()', () => {
    it('should unregister a behavior', () => {
      const behavior = new MockBehavior(ComponentType.Battery);
      registry.register(behavior);

      const result = registry.unregister(ComponentType.Battery);

      expect(result).toBe(true);
      expect(registry.has(ComponentType.Battery)).toBe(false);
      expect(registry.size()).toBe(0);
    });

    it('should return false when unregistering non-existent type', () => {
      const result = registry.unregister(ComponentType.Battery);

      expect(result).toBe(false);
    });

    it('should only unregister specified type', () => {
      const behavior1 = new MockBehavior(ComponentType.Battery);
      const behavior2 = new MockBehavior(ComponentType.Switch);

      registry.register(behavior1);
      registry.register(behavior2);

      registry.unregister(ComponentType.Battery);

      expect(registry.has(ComponentType.Battery)).toBe(false);
      expect(registry.has(ComponentType.Switch)).toBe(true);
      expect(registry.size()).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should clear all behaviors', () => {
      const behavior1 = new MockBehavior(ComponentType.Battery);
      const behavior2 = new MockBehavior(ComponentType.Switch);
      const behavior3 = new MockBehavior(ComponentType.SmallLED);

      registry.register(behavior1);
      registry.register(behavior2);
      registry.register(behavior3);

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.has(ComponentType.Battery)).toBe(false);
      expect(registry.has(ComponentType.Switch)).toBe(false);
      expect(registry.has(ComponentType.SmallLED)).toBe(false);
    });

    it('should allow registering after clear', () => {
      const behavior1 = new MockBehavior(ComponentType.Battery);
      const behavior2 = new MockBehavior(ComponentType.Switch);

      registry.register(behavior1);
      registry.clear();
      registry.register(behavior2);

      expect(registry.size()).toBe(1);
      expect(registry.has(ComponentType.Switch)).toBe(true);
    });

    it('should handle clearing empty registry', () => {
      expect(() => registry.clear()).not.toThrow();
      expect(registry.size()).toBe(0);
    });
  });

  describe('getRegisteredTypes()', () => {
    it('should return empty array for empty registry', () => {
      const types = registry.getRegisteredTypes();

      expect(types).toEqual([]);
    });

    it('should return all registered component types', () => {
      const behavior1 = new MockBehavior(ComponentType.Battery);
      const behavior2 = new MockBehavior(ComponentType.Switch);
      const behavior3 = new MockBehavior(ComponentType.SmallLED);

      registry.register(behavior1);
      registry.register(behavior2);
      registry.register(behavior3);

      const types = registry.getRegisteredTypes();

      expect(types.length).toBe(3);
      expect(types).toContain(ComponentType.Battery);
      expect(types).toContain(ComponentType.Switch);
      expect(types).toContain(ComponentType.SmallLED);
    });

    it('should return new array each time (defensive copy)', () => {
      const behavior = new MockBehavior(ComponentType.Battery);
      registry.register(behavior);

      const types1 = registry.getRegisteredTypes();
      const types2 = registry.getRegisteredTypes();

      expect(types1).toEqual(types2);
      expect(types1).not.toBe(types2);
    });
  });

  describe('size()', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.size()).toBe(0);
    });

    it('should return correct size after registering behaviors', () => {
      const behavior1 = new MockBehavior(ComponentType.Battery);
      const behavior2 = new MockBehavior(ComponentType.Switch);

      registry.register(behavior1);
      expect(registry.size()).toBe(1);

      registry.register(behavior2);
      expect(registry.size()).toBe(2);
    });

    it('should not increase when overwriting same type', () => {
      const behavior1 = new MockBehavior(ComponentType.Battery);
      const behavior2 = new MockBehavior(ComponentType.Battery);

      registry.register(behavior1);
      registry.register(behavior2);

      expect(registry.size()).toBe(1);
    });

    it('should decrease after unregistering', () => {
      const behavior1 = new MockBehavior(ComponentType.Battery);
      const behavior2 = new MockBehavior(ComponentType.Switch);

      registry.register(behavior1);
      registry.register(behavior2);
      registry.unregister(ComponentType.Battery);

      expect(registry.size()).toBe(1);
    });

    it('should be 0 after clearing', () => {
      const behavior1 = new MockBehavior(ComponentType.Battery);
      const behavior2 = new MockBehavior(ComponentType.Switch);

      registry.register(behavior1);
      registry.register(behavior2);
      registry.clear();

      expect(registry.size()).toBe(0);
    });
  });

  describe('registry extensibility use case', () => {
    it('should allow extending simulation with custom component types', () => {
      // Register behaviors for various component types
      const batteryBehavior = new MockBehavior(ComponentType.Battery);
      const switchBehavior = new MockBehavior(ComponentType.Switch);
      const ledBehavior = new MockBehavior(ComponentType.SmallLED);

      registry.registerAll([batteryBehavior, switchBehavior, ledBehavior]);

      // Verify all can be retrieved
      expect(registry.get(ComponentType.Battery)).toBeDefined();
      expect(registry.get(ComponentType.Switch)).toBeDefined();
      expect(registry.get(ComponentType.SmallLED)).toBeDefined();

      // Verify unregistered types return undefined
      expect(registry.get(ComponentType.Relay)).toBeUndefined();
    });
  });

  describe('performance', () => {
    it('should handle large number of behaviors efficiently', () => {
      const startTime = Date.now();

      // Register 100 different component types
      for (let i = 0; i < 100; i++) {
        const behavior = new MockBehavior(`component-type-${i}` as ComponentType);
        registry.register(behavior);
      }

      const registerTime = Date.now() - startTime;
      expect(registry.size()).toBe(100);
      expect(registerTime).toBeLessThan(1000); // Should register in < 1 second
    });

    it('should retrieve behaviors efficiently from large registry', () => {
      // Register many behaviors
      for (let i = 0; i < 100; i++) {
        const behavior = new MockBehavior(`component-type-${i}` as ComponentType);
        registry.register(behavior);
      }

      const startTime = Date.now();

      // Retrieve each one
      for (let i = 0; i < 100; i++) {
        registry.get(`component-type-${i}` as ComponentType);
      }

      const retrieveTime = Date.now() - startTime;
      expect(retrieveTime).toBeLessThan(100); // Should retrieve in < 100ms
    });
  });
});
