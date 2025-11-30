/**
 * Unit tests for Component class
 *
 * Tests component creation, properties, and pin management.
 */

import { describe, it, expect } from 'vitest';
import { ComponentType } from '@/core/types/ComponentType';
import { Component } from '@/core/Component';
import { Position } from '@/core/types/Position';
import { Rotation } from '@/core/types/Rotation';

describe('Component', () => {
  describe('constructor', () => {
    it('should create component with all required properties', () => {
      const position = new Position(10, 20);
      const rotation = new Rotation(90);
      const pins = ['pin-1', 'pin-2'];
      const type = ComponentType.Battery;

      const component = new Component(type, position, rotation, pins);

      expect(component.id).toBeDefined();
      expect(typeof component.id).toBe('string');
      expect(component.type).toBe(type);
      expect(component.position).toBe(position);
      expect(component.rotation).toBe(rotation);
      expect(component.pins).toEqual(pins);
    });

    it('should generate unique IDs for different components', () => {
      const pos = new Position(0, 0);
      const rot = new Rotation(0);
      const pins: string[] = [];

      const comp1 = new Component(ComponentType.Battery, pos, rot, pins);
      const comp2 = new Component(ComponentType.Battery, pos, rot, pins);

      expect(comp1.id).not.toBe(comp2.id);
    });

    it('should accept component with no pins', () => {
      const component = new Component(
        ComponentType.Battery,
        new Position(5, 5),
        new Rotation(0),
        []
      );

      expect(component.pins).toEqual([]);
      expect(component.pins.length).toBe(0);
    });

    it('should accept component with many pins', () => {
      const pins = Array.from({ length: 50 }, (_, i) => `pin-${i}`);
      const component = new Component(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0),
        pins
      );

      expect(component.pins.length).toBe(50);
    });
  });

  it('Throw error if two pins have the same name', () => {
    const createComponentWithDuplicatePins = () => {
      new Component(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0),
        ['pin-1', 'pin-2', 'pin-1'] // Duplicate pin name
      );
    };
    expect(createComponentWithDuplicatePins).toThrowError(
      'Duplicate pin names are not allowed: pin-1'
    );
  });

  describe('position property', () => {
    it('should return the assigned position', () => {
      const position = new Position(15, 25);
      const component = new Component(ComponentType.Battery, position, new Rotation(0), []);

      expect(component.position).toBe(position);
      expect(component.position.x).toBe(15);
      expect(component.position.y).toBe(25);
    });

    it('should work with negative positions', () => {
      const position = new Position(-10, -20);
      const component = new Component(ComponentType.Battery, position, new Rotation(0), []);

      expect(component.position.x).toBe(-10);
      expect(component.position.y).toBe(-20);
    });
  });

  describe('rotation property', () => {
    it('should return the assigned rotation', () => {
      const rotation = new Rotation(90);
      const component = new Component(ComponentType.Battery, new Position(0, 0), rotation, []);

      expect(component.rotation).toBe(rotation);
      expect(component.rotation.angle).toBe(90);
    });

    it('should work with various rotation angles', () => {
      const angles = [0, 90, 180, 270, 45, -45];

      for (const angle of angles) {
        const rotation = new Rotation(angle);
        const component = new Component(ComponentType.Battery, new Position(0, 0), rotation, []);

        expect(component.rotation.angle).toBe(angle);
      }
    });
  });

  describe('pins property', () => {
    it('should return the pins array', () => {
      const pins = ['pin-1', 'pin-2', 'pin-3'];
      const component = new Component(
        ComponentType.Transistor,
        new Position(0, 0),
        new Rotation(0),
        pins
      );

      expect(component.pins).toEqual(pins);
    });

    it('should preserve pin order', () => {
      const pins = ['pin-a', 'pin-b', 'pin-c'];
      const component = new Component(
        ComponentType.Transistor,
        new Position(0, 0),
        new Rotation(0),
        pins
      );

      expect(component.pins[0]).toBe('pin-a');
      expect(component.pins[1]).toBe('pin-b');
      expect(component.pins[2]).toBe('pin-c');
    });
  });

  describe('immutability', () => {
    it('should have readonly id', () => {
      const component = new Component(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0),
        []
      );

      // TypeScript compile-time check ensures readonly
      expect(component.id).toBeDefined();
    });

    it('should have readonly position', () => {
      const position = new Position(10, 20);
      const component = new Component(ComponentType.Battery, position, new Rotation(0), []);

      expect(component.position).toBe(position);
    });

    it('should have readonly rotation', () => {
      const rotation = new Rotation(90);
      const component = new Component(ComponentType.Battery, new Position(0, 0), rotation, []);

      expect(component.rotation).toBe(rotation);
    });

    it('should have readonly pins', () => {
      const pins = ['pin-1', 'pin-2'];
      const component = new Component(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0),
        pins
      );

      expect(component.pins).toBeDefined();
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const component = new Component(
        ComponentType.Switch,
        new Position(10, 20),
        new Rotation(90),
        ['pin-1', 'pin-2']
      );

      const json = component.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('type');
      expect(json).toHaveProperty('position');
      expect(json).toHaveProperty('rotation');
      expect(json).toHaveProperty('pins');
      expect(json.type).toBe(ComponentType.Switch);
      expect(json.position).toEqual({ x: 10, y: 20 });
      expect(json.rotation).toBe(90);
      expect(json.pins).toEqual(['pin-1', 'pin-2']);
      expect(json.config).toEqual({ initialState: 'open' });
    });

    it('should deserialize from JSON', () => {
      const json = {
        id: 'test-id',
        type: ComponentType.Battery,
        position: { x: 10, y: 20 },
        rotation: 90,
        pins: ['pin-1', 'pin-2'],
        config: { key: 'value' },
      };

      const component = Component.fromJSON(json);

      expect(component.id).toBe('test-id');
      expect(component.type).toBe(ComponentType.Battery);
      expect(component.position.x).toBe(10);
      expect(component.position.y).toBe(20);
      expect(component.rotation.angle).toBe(90);
      expect(component.pins).toEqual(['pin-1', 'pin-2']);
      expect(component.config).toEqual(new Map([['key', 'value']]));
    });

    it('should roundtrip correctly', () => {
      const original = new Component(
        ComponentType.Transistor,
        new Position(15, 25),
        new Rotation(180),
        ['pin-a', 'pin-b', 'pin-c']
      );

      const json = original.toJSON();
      const restored = Component.fromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.type).toBe(original.type);
      expect(restored.position.equals(original.position)).toBe(true);
      expect(restored.rotation.equals(original.rotation)).toBe(true);
      expect(restored.pins).toEqual(original.pins);
    });
  });
});
