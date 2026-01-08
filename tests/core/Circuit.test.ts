/**
 * Unit tests for Circuit class
 *
 * Tests circuit container operations: adding/removing components,
 * querying, and basic lifecycle management.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Circuit, ComponentType, Position, Rotation, ENodeType } from 'simple-circuit-engine/core';

describe('Circuit', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit();
  });

  describe('constructor', () => {
    it('should create an empty circuit', () => {
      const circuit = new Circuit();
      expect(circuit).toBeDefined();
      expect(circuit.getAllComponents()).toEqual([]);
    });
  });

  describe('addComponent()', () => {
    it('should add a component to the circuit', () => {
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 20),
        new Rotation(90)
      );

      expect(component).toBeDefined();
      expect(component.id).toBeDefined();
      expect(component.position.x).toBe(10);
      expect(component.position.y).toBe(20);
      expect(component.rotation.angle).toBe(90);
      expect(component.pins.length).toBe(2);
    });

    it('should add multiple components', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Switch,
        new Position(10, 10),
        new Rotation(90)
      );

      expect(circuit.getAllComponents().length).toBe(2);
      expect(circuit.getAllComponents()).toContain(comp1);
      expect(circuit.getAllComponents()).toContain(comp2);
    });

    it('should assign unique IDs to components', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );

      expect(comp1.id).not.toBe(comp2.id);
    });

    it('should create component pins according to its type', () => {
      const battery = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      expect(battery.pins.length).toBe(2); // Battery has 2 pins
      // All pins should have unique IDs
      expect(new Set(battery.pins).size).toBe(2);

      const relay = circuit.addComponent(ComponentType.Relay, new Position(0, 0), new Rotation(0));
      expect(relay.pins.length).toBe(4); // Relay has 4 pins
      // All pins should have unique IDs
      expect(new Set(relay.pins).size).toBe(4);
    });

    it('should handle component with no pins', () => {
      const cube = circuit.addComponent(ComponentType.Cube, new Position(5, 5), new Rotation(0));
      expect(cube.pins.length).toBe(0);
    });

    it('should throw for non-integer position coordinates', () => {
      expect(() => {
        circuit.addComponent(ComponentType.Battery, new Position(10.5, 20), new Rotation(0));
      }).toThrow(TypeError);
    });

    it('should throw for non-integer rotation angle', () => {
      expect(() => {
        circuit.addComponent(ComponentType.Battery, new Position(10, 20), new Rotation(45.5));
      }).toThrow(TypeError);
    });
  });

  describe('getComponent()', () => {
    it('should retrieve component by ID', () => {
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 20),
        new Rotation(90)
      );

      const retrieved = circuit.getComponent(component.id);
      expect(retrieved).toBe(component);
    });

    it('should return undefined for non-existent ID', () => {
      const result = circuit.getComponent('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should retrieve correct component among multiple', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Switch,
        new Position(10, 10),
        new Rotation(90)
      );
      const comp3 = circuit.addComponent(
        ComponentType.Lightbulb,
        new Position(20, 20),
        new Rotation(180)
      );

      expect(circuit.getComponent(comp1.id)).toBe(comp1);
      expect(circuit.getComponent(comp2.id)).toBe(comp2);
      expect(circuit.getComponent(comp3.id)).toBe(comp3);
    });
  });

  describe('getAllComponents()', () => {
    it('should return empty array for empty circuit', () => {
      const components = circuit.getAllComponents();
      expect(components).toEqual([]);
    });

    it('should return all components', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(90)
      );

      const components = circuit.getAllComponents();
      expect(components.length).toBe(2);
      expect(components).toContain(comp1);
      expect(components).toContain(comp2);
    });

    it('should return new array each time (defensive copy)', () => {
      circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));

      const arr1 = circuit.getAllComponents();
      const arr2 = circuit.getAllComponents();

      expect(arr1).not.toBe(arr2);
      expect(arr1).toEqual(arr2);
    });
  });

  describe('removeComponent()', () => {
    it('should remove component from circuit', () => {
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 20),
        new Rotation(0)
      );

      circuit.removeComponent(component.id);

      expect(circuit.getComponent(component.id)).toBeUndefined();
      expect(circuit.getAllComponents().length).toBe(0);
    });

    it('should remove correct component among multiple', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(90)
      );
      const comp3 = circuit.addComponent(
        ComponentType.Battery,
        new Position(20, 20),
        new Rotation(180)
      );

      circuit.removeComponent(comp2.id);

      expect(circuit.getAllComponents().length).toBe(2);
      expect(circuit.getComponent(comp1.id)).toBe(comp1);
      expect(circuit.getComponent(comp2.id)).toBeUndefined();
      expect(circuit.getComponent(comp3.id)).toBe(comp3);
    });

    it('should throw when removing non-existent component', () => {
      expect(() => {
        circuit.removeComponent('non-existent-id');
      }).toThrow(/does not exist/);
    });

    it('should handle removing all components', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(90)
      );

      circuit.removeComponent(comp1.id);
      circuit.removeComponent(comp2.id);

      expect(circuit.getAllComponents().length).toBe(0);
    });
  });

  describe('JSON serialization', () => {
    it('should serialize empty circuit', () => {
      const json = circuit.toJSON();

      expect(json).toHaveProperty('metadata');
      expect(json).toHaveProperty('components');
      expect(json.components).toEqual([]);
    });

    it('should serialize circuit with components', () => {
      circuit.addComponent(ComponentType.Battery, new Position(10, 20), new Rotation(90));
      circuit.addComponent(ComponentType.Battery, new Position(30, 40), new Rotation(180));

      const json = circuit.toJSON();

      expect(json.components.length).toBe(2);
      expect(json.components[0]).toHaveProperty('id');
      expect(json.components[0]).toHaveProperty('position');
      expect(json.components[0]).toHaveProperty('rotation');
      expect(json.components[0]).toHaveProperty('pins');
    });

    it('should deserialize circuit from JSON', () => {
      const original = new Circuit('Test Circuit');
      original.addComponent(ComponentType.Battery, new Position(10, 20), new Rotation(90));

      const json = original.toJSON();
      const restored = Circuit.fromJSON(json);

      expect(restored.name).toBe('Test Circuit');

      expect(restored.getAllComponents().length).toBe(1);
      const comp = restored.getAllComponents()[0];
      expect(comp?.position.x).toBe(10);
      expect(comp?.position.y).toBe(20);
      expect(comp?.rotation.angle).toBe(90);
      expect(comp?.pins.length).toBe(2);
    });
  });

  describe('large circuit performance', () => {
    it('should handle 100+ components efficiently', () => {
      const startTime = Date.now();

      // Add 100 components
      for (let i = 0; i < 100; i++) {
        circuit.addComponent(ComponentType.Battery, new Position(i * 10, i * 10), new Rotation(0));
      }

      const addTime = Date.now() - startTime;
      expect(circuit.getAllComponents().length).toBe(100);
      expect(addTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should query components efficiently in large circuit', () => {
      // Add 100 components
      const components = [];
      for (let i = 0; i < 100; i++) {
        components.push(
          circuit.addComponent(ComponentType.Battery, new Position(i * 10, i * 10), new Rotation(0))
        );
      }

      // Query each component
      const startTime = Date.now();
      for (const comp of components) {
        const retrieved = circuit.getComponent(comp.id);
        expect(retrieved).toBe(comp);
      }
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(100); // Should query in < 100ms
    });
  });

  // nouveaux tests pour addBranchingPoint et splitWire
  describe('branching points and splitWire()', () => {
    it('should add a branching point ENode at specified position', () => {
      const bp = circuit.addBranchingPoint(new Position(5, 5));
      expect(bp).toBeDefined();
      expect(bp.id).toBeDefined();
      expect(bp.position?.x).toBe(5);
      expect(bp.position?.y).toBe(5);
      expect(bp.type).toBe(ENodeType.BranchingPoint);
      expect(circuit.getENode(bp.id)).toBe(bp);
    });
  });
});
