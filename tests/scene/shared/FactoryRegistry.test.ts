/**
 * Unit tests for FactoryRegistry
 * @module tests/unit/rendering/FactoryRegistry.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createMockCircuit } from '../helpers';
import {
  type IComponentVisualFactory,
  FactoryRegistry,
  DefaultVisualFactory,
} from '../../../src/scene/shared/components';
import {ComponentType} from "../../../src";

describe('FactoryRegistry', () => {
  let registry: FactoryRegistry;

  beforeEach(() => {
    registry = new FactoryRegistry(new DefaultVisualFactory());
  });

  describe('Constructor', () => {
    it('should initialize with default fallback factory', () => {
      expect(registry).toBeDefined();
      expect(registry.getRegisteredTypes()).toHaveLength(0);
    });

    it('should accept custom fallback factory', () => {
      const customFallback = new DefaultVisualFactory();
      const customRegistry = new FactoryRegistry(customFallback);

      const circuit = createMockCircuit({ componentCount: 1 });
      const component = circuit.getAllComponents()[0];

      // Get factory for unregistered type - should use custom fallback
      const factory = customRegistry.get(ComponentType.Battery);
      const object = factory.createVisual(component!);

      expect(object).toBeInstanceOf(THREE.Group);
    });
  });

  describe('register()', () => {
    it('should register a factory for a component type', () => {
      registry.register(ComponentType.Battery, new DefaultVisualFactory());

      expect(registry.has(ComponentType.Battery)).toBe(true);
      expect(registry.getRegisteredTypes()).toContain(ComponentType.Battery);
    });

    it('should register multiple factories for different types', () => {
      registry.register(ComponentType.Battery, new DefaultVisualFactory());
      registry.register(ComponentType.SmallLED, new DefaultVisualFactory());
      registry.register(ComponentType.Switch, new DefaultVisualFactory());

      expect(registry.getRegisteredTypes()).toHaveLength(3);
      expect(registry.has(ComponentType.Battery)).toBe(true);
      expect(registry.has(ComponentType.SmallLED)).toBe(true);
      expect(registry.has(ComponentType.Switch)).toBe(true);
    });

    it('should overwrite existing factory when registering same type', () => {
      const factory1 = new DefaultVisualFactory();
      const factory2 = new DefaultVisualFactory();

      registry.register(ComponentType.Battery, factory1);
      const firstFactory = registry.get(ComponentType.Battery);

      registry.register(ComponentType.Battery, factory2);
      const secondFactory = registry.get(ComponentType.Battery);

      expect(firstFactory).not.toBe(secondFactory);
      expect(registry.getRegisteredTypes()).toHaveLength(1);
    });

    it('should throw TypeError for invalid component type', () => {
      const factory = new DefaultVisualFactory();

      expect(() => {
        registry.register('' as ComponentType, factory);
      }).toThrow(TypeError);

      expect(() => {
        registry.register('  ' as ComponentType, factory);
      }).toThrow(TypeError);
    });

    it('should throw TypeError for invalid factory', () => {
      expect(() => {
        registry.register(ComponentType.Battery, null as any);
      }).toThrow(TypeError);

      expect(() => {
        registry.register(ComponentType.Battery, undefined as any);
      }).toThrow(TypeError);

      expect(() => {
        registry.register(ComponentType.Battery, 'not a ComponentVisualFactory' as any);
      }).toThrow(TypeError);
    });
  });

  describe('get()', () => {
    it('should return registered factory for component type', () => {
      const factory = new DefaultVisualFactory();
      registry.register(ComponentType.Battery, factory);

      const retrieved = registry.get(ComponentType.Battery);
      expect(retrieved).toBe(factory);
    });

    it('should return fallback factory for unregistered type', () => {
      const factory = registry.get('UnregisteredType' as ComponentType);

      expect(factory).toBeDefined();
      expect(typeof factory).toBe('object');

      // Verify fallback creates placeholder object
      const circuit = createMockCircuit({ componentCount: 1 });
      const component = circuit.getAllComponents()[0];
      const object = factory.createVisual(component!);

      expect(object).toBeInstanceOf(THREE.Object3D);
      expect(object.userData.isPlaceholder).toBe(true);
    });

    it('should always return an object implementing IComponentVisualFactory', () => {
      const registeredFactory = registry.get(ComponentType.Battery);
      const fallbackFactory = registry.get('UnknownType' as ComponentType);

      const checkFactoryInterface = (factory: any) => {
        expect(typeof factory).toBe('object');
        expect(factory['createVisual']).toBeDefined();
        expect(typeof factory['createVisual']).toBe('function');
        expect(factory['applyHover']).toBeDefined();
        expect(typeof factory['applyHover']).toBe('function');
        expect(factory['removeHover']).toBeDefined();
        expect(typeof factory['removeHover']).toBe('function');
        expect(factory['applySelection']).toBeDefined();
        expect(typeof factory['applySelection']).toBe('function');
        expect(factory['removeSelection']).toBeDefined();
        expect(typeof factory['removeSelection']).toBe('function');
        expect(factory['updateAnimation']).toBeDefined();
        expect(typeof factory['updateAnimation']).toBe('function');
      };

      checkFactoryInterface(registeredFactory);
      checkFactoryInterface(fallbackFactory);

      // Both factories should be callable
      const circuit = createMockCircuit({ componentCount: 1 });
      const component = circuit.getAllComponents()[0];

      expect(() => registeredFactory.createVisual(component!)).not.toThrow();
      expect(() => fallbackFactory.createVisual(component!)).not.toThrow();
    });
  });

  describe('has()', () => {
    it('should return true for registered type', () => {
      const factory = new DefaultVisualFactory();
      registry.register(ComponentType.Battery, factory);

      expect(registry.has(ComponentType.Battery)).toBe(true);
    });

    it('should return false for unregistered type', () => {
      expect(registry.has(ComponentType.Battery)).toBe(false);
      expect(registry.has('UnknownType' as ComponentType)).toBe(false);
    });

    it('should return true after registration and false after unregistration', () => {
      const factory = new DefaultVisualFactory();

      registry.register(ComponentType.Battery, factory);
      expect(registry.has(ComponentType.Battery)).toBe(true);

      registry.unregister(ComponentType.Battery);
      expect(registry.has(ComponentType.Battery)).toBe(false);
    });
  });

  describe('unregister()', () => {
    it('should remove a registered factory', () => {
      const factory = new DefaultVisualFactory();
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
      registry.register(ComponentType.Battery, new DefaultVisualFactory());
      registry.register(ComponentType.SmallLED, new DefaultVisualFactory());
      registry.register(ComponentType.Switch, new DefaultVisualFactory());

      registry.unregister(ComponentType.SmallLED);

      expect(registry.has(ComponentType.Battery)).toBe(true);
      expect(registry.has(ComponentType.Switch)).toBe(true);
      expect(registry.has(ComponentType.SmallLED)).toBe(false);
      expect(registry.getRegisteredTypes()).toHaveLength(2);
    });
  });

  describe('getRegisteredTypes()', () => {
    it('should return empty array for new registry', () => {
      expect(registry.getRegisteredTypes()).toEqual([]);
    });

    it('should return array of all registered types', () => {
      registry.register(ComponentType.Battery, new DefaultVisualFactory());
      registry.register(ComponentType.SmallLED, new DefaultVisualFactory());
      registry.register(ComponentType.Switch, new DefaultVisualFactory());

      const types = registry.getRegisteredTypes();

      expect(types).toHaveLength(3);
      expect(types).toContain(ComponentType.Battery);
      expect(types).toContain(ComponentType.SmallLED);
      expect(types).toContain(ComponentType.Switch);
    });

    it('should return new array on each call (not reference to internal state)', () => {
      registry.register(ComponentType.Battery, new DefaultVisualFactory());

      const types1 = registry.getRegisteredTypes();
      const types2 = registry.getRegisteredTypes();

      expect(types1).toEqual(types2);
      expect(types1).not.toBe(types2); // Different array instances

      // Modifying returned array should not affect registry
      types1.push(ComponentType.SmallLED as ComponentType);
      expect(registry.getRegisteredTypes()).toHaveLength(1);
    });

    it('should reflect changes after registration/unregistration', () => {
      registry.register(ComponentType.Battery, new DefaultVisualFactory());
      expect(registry.getRegisteredTypes()).toHaveLength(1);

      registry.register(ComponentType.SmallLED, new DefaultVisualFactory());
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
      const object = factory.createVisual(component!);

      // Default fallback creates group
      expect(object).toBeInstanceOf(THREE.Group);
    });

    it('should preserve component metadata in fallback objects', () => {
      const circuit = createMockCircuit({ componentCount: 1 });
      const component = circuit.getAllComponents()[0];

      const factory = registry.get('CustomType' as ComponentType);
      const object = factory.createVisual(component!);

      expect(object.userData.componentId).toBe(component.id);
      expect(object.userData.componentType).toBe(component.type);
    });

    it('should use custom fallback if provided to constructor', () => {
      const customFallback: IComponentVisualFactory = {
        createVisual: (component) => {
          const geometry = new THREE.SphereGeometry(0.5, 16, 16);
          const material = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData = {
            componentId: component.id,
            componentType: component.type,
            customFallback: true,
          };
          return mesh;
        },
        applyHover: (_component) => {},
        removeHover: (_component) => {},
        applySelection: (_component) => {},
        removeSelection: (_component) => {},
        updateAnimation: (_component) => {},
      };

      const customRegistry = new FactoryRegistry(customFallback);

      const circuit = createMockCircuit({ componentCount: 1 });
      const component = circuit.getAllComponents()[0];

      const factory = customRegistry.get('UnknownType' as ComponentType);
      const object = factory.createVisual(component!);

      expect(object.userData.customFallback).toBe(true);
      expect(object).toBeInstanceOf(THREE.Mesh);
      const mesh = object as THREE.Mesh;
      expect(mesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.color.getHex()).toBe(0xffaa00);
    });
  });
});
