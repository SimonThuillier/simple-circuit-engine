/**
 * Unit tests for FactoryRegistry
 * @module tests/unit/rendering/FactoryRegistry.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { FactoryRegistry } from '../../../src/scene/shared/FactoryRegistry';
import { createDefaultFactory } from '../../../src/scene/shared/components/ComponentVisualFactory';
import type { ComponentVisualFactory } from '../../../src/scene/shared/components/ComponentVisualFactory';
import { ComponentType } from '../../../src/core/types/ComponentType';
import { createMockCircuit, createSimpleTestFactory } from '../helpers';

describe('FactoryRegistry', () => {
  let registry: FactoryRegistry;

  beforeEach(() => {
    registry = new FactoryRegistry(createDefaultFactory());
  });

  describe('Constructor', () => {
    it('should initialize with default fallback factory', () => {
      expect(registry).toBeDefined();
      expect(registry.getRegisteredTypes()).toHaveLength(0);
    });

    it('should accept custom fallback factory', () => {
      const customFallback = createSimpleTestFactory(0xff0000);
      const customRegistry = new FactoryRegistry(customFallback);

      const circuit = createMockCircuit({ componentCount: 1 });
      const component = circuit.getAllComponents()[0];

      // Get factory for unregistered type - should use custom fallback
      const factory = customRegistry.get(ComponentType.Battery);
      const object = factory(component);

      expect(object).toBeInstanceOf(THREE.Mesh);
      expect((object as THREE.Mesh).material).toBeInstanceOf(THREE.MeshStandardMaterial);
      const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial;
      expect(material.color.getHex()).toBe(0xff0000);
    });
  });

  describe('register()', () => {
    it('should register a factory for a component type', () => {
      const factory = createSimpleTestFactory(0x00ff00);
      registry.register(ComponentType.Battery, factory);

      expect(registry.has(ComponentType.Battery)).toBe(true);
      expect(registry.getRegisteredTypes()).toContain(ComponentType.Battery);
    });

    it('should register multiple factories for different types', () => {
      const batteryFactory = createSimpleTestFactory(0xff0000);
      const ledFactory = createSimpleTestFactory(0x00ff00);
      const switchFactory = createSimpleTestFactory(0x0000ff);

      registry.register(ComponentType.Battery, batteryFactory);
      registry.register(ComponentType.SmallLED, ledFactory);
      registry.register(ComponentType.Switch, switchFactory);

      expect(registry.getRegisteredTypes()).toHaveLength(3);
      expect(registry.has(ComponentType.Battery)).toBe(true);
      expect(registry.has(ComponentType.SmallLED)).toBe(true);
      expect(registry.has(ComponentType.Switch)).toBe(true);
    });

    it('should overwrite existing factory when registering same type', () => {
      const factory1 = createSimpleTestFactory(0xff0000);
      const factory2 = createSimpleTestFactory(0x00ff00);

      registry.register(ComponentType.Battery, factory1);
      const firstFactory = registry.get(ComponentType.Battery);

      registry.register(ComponentType.Battery, factory2);
      const secondFactory = registry.get(ComponentType.Battery);

      expect(firstFactory).not.toBe(secondFactory);
      expect(registry.getRegisteredTypes()).toHaveLength(1);
    });

    it('should throw TypeError for invalid component type', () => {
      const factory = createSimpleTestFactory(0x00ff00);

      expect(() => {
        registry.register('' as ComponentType, factory);
      }).toThrow(TypeError);

      expect(() => {
        registry.register('  ' as ComponentType, factory);
      }).toThrow(TypeError);
    });

    it('should throw TypeError for invalid factory function', () => {
      expect(() => {
        registry.register(ComponentType.Battery, null as any);
      }).toThrow(TypeError);

      expect(() => {
        registry.register(ComponentType.Battery, undefined as any);
      }).toThrow(TypeError);

      expect(() => {
        registry.register(ComponentType.Battery, 'not a function' as any);
      }).toThrow(TypeError);
    });
  });

  describe('get()', () => {
    it('should return registered factory for component type', () => {
      const factory = createSimpleTestFactory(0x00ff00);
      registry.register(ComponentType.Battery, factory);

      const retrieved = registry.get(ComponentType.Battery);
      expect(retrieved).toBe(factory);
    });

    it('should return fallback factory for unregistered type', () => {
      const factory = registry.get('UnregisteredType' as ComponentType);

      expect(factory).toBeDefined();
      expect(typeof factory).toBe('function');

      // Verify fallback creates placeholder object
      const circuit = createMockCircuit({ componentCount: 1 });
      const component = circuit.getAllComponents()[0];
      const object = factory(component);

      expect(object).toBeInstanceOf(THREE.Object3D);
      expect(object.userData.isPlaceholder).toBe(true);
    });

    it('should always return a valid factory function', () => {
      const registeredFactory = registry.get(ComponentType.Battery);
      const fallbackFactory = registry.get('UnknownType' as ComponentType);

      expect(typeof registeredFactory).toBe('function');
      expect(typeof fallbackFactory).toBe('function');

      // Both factories should be callable
      const circuit = createMockCircuit({ componentCount: 1 });
      const component = circuit.getAllComponents()[0];

      expect(() => registeredFactory(component)).not.toThrow();
      expect(() => fallbackFactory(component)).not.toThrow();
    });
  });

  describe('has()', () => {
    it('should return true for registered type', () => {
      const factory = createSimpleTestFactory(0x00ff00);
      registry.register(ComponentType.Battery, factory);

      expect(registry.has(ComponentType.Battery)).toBe(true);
    });

    it('should return false for unregistered type', () => {
      expect(registry.has(ComponentType.Battery)).toBe(false);
      expect(registry.has('UnknownType' as ComponentType)).toBe(false);
    });

    it('should return true after registration and false after unregistration', () => {
      const factory = createSimpleTestFactory(0x00ff00);

      registry.register(ComponentType.Battery, factory);
      expect(registry.has(ComponentType.Battery)).toBe(true);

      registry.unregister(ComponentType.Battery);
      expect(registry.has(ComponentType.Battery)).toBe(false);
    });
  });

  describe('unregister()', () => {
    it('should remove a registered factory', () => {
      const factory = createSimpleTestFactory(0x00ff00);
      registry.register(ComponentType.Battery, factory);

      expect(registry.has(ComponentType.Battery)).toBe(true);

      registry.unregister(ComponentType.Battery);

      expect(registry.has(ComponentType.Battery)).toBe(false);
      expect(registry.getRegisteredTypes()).not.toContain(ComponentType.Battery);
    });

    it('should not throw when unregistering non-existent type', () => {
      expect(() => {
        registry.unregister('NonExistent' as ComponentType);
      }).not.toThrow();
    });

    it('should only remove specified type, leaving others intact', () => {
      registry.register(ComponentType.Battery, createSimpleTestFactory(0xff0000));
      registry.register(ComponentType.SmallLED, createSimpleTestFactory(0x00ff00));
      registry.register(ComponentType.Switch, createSimpleTestFactory(0x0000ff));

      registry.unregister(ComponentType.SmallLED);

      expect(registry.has(ComponentType.Battery)).toBe(true);
      expect(registry.has(ComponentType.SmallLED)).toBe(false);
      expect(registry.has(ComponentType.Switch)).toBe(true);
      expect(registry.getRegisteredTypes()).toHaveLength(2);
    });
  });

  describe('getRegisteredTypes()', () => {
    it('should return empty array for new registry', () => {
      expect(registry.getRegisteredTypes()).toEqual([]);
    });

    it('should return array of all registered types', () => {
      registry.register(ComponentType.Battery, createSimpleTestFactory(0xff0000));
      registry.register(ComponentType.SmallLED, createSimpleTestFactory(0x00ff00));
      registry.register(ComponentType.Switch, createSimpleTestFactory(0x0000ff));

      const types = registry.getRegisteredTypes();

      expect(types).toHaveLength(3);
      expect(types).toContain(ComponentType.Battery);
      expect(types).toContain(ComponentType.SmallLED);
      expect(types).toContain(ComponentType.Switch);
    });

    it('should return new array on each call (not reference to internal state)', () => {
      registry.register(ComponentType.Battery, createSimpleTestFactory(0xff0000));

      const types1 = registry.getRegisteredTypes();
      const types2 = registry.getRegisteredTypes();

      expect(types1).toEqual(types2);
      expect(types1).not.toBe(types2); // Different array instances

      // Modifying returned array should not affect registry
      types1.push(ComponentType.SmallLED as ComponentType);
      expect(registry.getRegisteredTypes()).toHaveLength(1);
    });

    it('should reflect changes after registration/unregistration', () => {
      registry.register(ComponentType.Battery, createSimpleTestFactory(0xff0000));
      expect(registry.getRegisteredTypes()).toHaveLength(1);

      registry.register(ComponentType.SmallLED, createSimpleTestFactory(0x00ff00));
      expect(registry.getRegisteredTypes()).toHaveLength(2);

      registry.unregister(ComponentType.Battery);
      expect(registry.getRegisteredTypes()).toHaveLength(1);
      expect(registry.getRegisteredTypes()).toContain(ComponentType.SmallLED);
    });
  });

  describe('Fallback behavior', () => {
    it('should use fallback factory for unregistered types', () => {
      const circuit = createMockCircuit({ componentCount: 1 });
      const component = circuit.getAllComponents()[0];

      const factory = registry.get('UnknownType' as ComponentType);
      const object = factory(component);

      // Default fallback creates magenta cube
      expect(object).toBeInstanceOf(THREE.Mesh);
      const mesh = object as THREE.Mesh;
      expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.color.getHex()).toBe(0xff00ff); // Magenta
      expect(object.userData.isPlaceholder).toBe(true);
      expect(object.userData.componentId).toBe(component.id);
      expect(object.userData.componentType).toBe(component.type);
    });

    it('should preserve component metadata in fallback objects', () => {
      const circuit = createMockCircuit({ componentCount: 1 });
      const component = circuit.getAllComponents()[0];

      const factory = registry.get('CustomType' as ComponentType);
      const object = factory(component);

      expect(object.userData.componentId).toBe(component.id);
      expect(object.userData.componentType).toBe(component.type);
    });

    it('should use custom fallback if provided to constructor', () => {
      const customFallback: ComponentVisualFactory = (component) => {
        const geometry = new THREE.SphereGeometry(2);
        const material = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.customFallback = true;
        mesh.userData.componentId = component.id;
        return mesh;
      };

      const customRegistry = new FactoryRegistry(customFallback);

      const circuit = createMockCircuit({ componentCount: 1 });
      const component = circuit.getAllComponents()[0];

      const factory = customRegistry.get('UnknownType' as ComponentType);
      const object = factory(component);

      expect(object.userData.customFallback).toBe(true);
      expect(object).toBeInstanceOf(THREE.Mesh);
      const mesh = object as THREE.Mesh;
      expect(mesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.color.getHex()).toBe(0xffaa00);
    });
  });

  describe('Integration with createDefaultFactory()', () => {
    it('should work with default factory from ComponentVisualFactory module', () => {
      const defaultFactory = createDefaultFactory();
      const testRegistry = new FactoryRegistry(defaultFactory);

      const circuit = createMockCircuit({ componentCount: 1 });
      const component = circuit.getAllComponents()[0];

      const factory = testRegistry.get('UnknownType' as ComponentType);
      const object = factory(component);

      // Default factory creates magenta cube placeholder
      expect(object).toBeInstanceOf(THREE.Mesh);
      expect(object.userData.isPlaceholder).toBe(true);
      expect(object.userData.componentId).toBe(component.id);
    });
  });
});
