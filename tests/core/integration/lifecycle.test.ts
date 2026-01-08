/**
 * Integration tests for component lifecycle
 *
 * Tests the complete lifecycle of components within a circuit, including
 * automatic pin ENode creation and cascade deletion scenarios.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Circuit, ComponentType, Position, Rotation, ENodeType } from 'simple-circuit-engine/core';

describe('Component Lifecycle Integration', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit();
  });

  describe('component creation and pin ENodes', () => {
    it('should automatically create pin ENodes when component added', () => {
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 20),
        new Rotation(0)
      );

      // Component should have 3 pin IDs
      expect(component.pins.length).toBe(2);

      // Each pin should be a valid UUID string
      for (const pinId of component.pins) {
        expect(typeof pinId).toBe('string');
        expect(pinId.length).toBeGreaterThan(0);
      }

      // All pin IDs should be unique
      const uniquePins = new Set(component.pins);
      expect(uniquePins.size).toBe(2);
    });

    it('should handle component with no pins', () => {
      const component = circuit.addComponent(
        ComponentType.Cube,
        new Position(0, 0),
        new Rotation(0)
      );

      expect(component.pins.length).toBe(0);
    });

    it('should create independent pin sets for different components', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Transistor,
        new Position(10, 10),
        new Rotation(0)
      );

      // Each component has its own pins
      expect(comp1.pins.length).toBe(2);
      expect(comp2.pins.length).toBe(3);

      // Pin IDs should not overlap
      const allPins = [...comp1.pins, ...comp2.pins];
      const uniquePins = new Set(allPins);
      expect(uniquePins.size).toBe(5);
    });
  });

  describe('component removal', () => {
    it('should remove component from circuit', () => {
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 20),
        new Rotation(0)
      );

      circuit.removeComponent(component.id);

      expect(circuit.getComponent(component.id)).toBeUndefined();
    });

    it('should not affect other components when removing one', () => {
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

      expect(circuit.getComponent(comp1.id)).toBe(comp1);
      expect(circuit.getComponent(comp2.id)).toBeUndefined();
      expect(circuit.getComponent(comp3.id)).toBe(comp3);
      expect(circuit.getAllComponents().length).toBe(2);
    });
  });

  describe('position and rotation tracking', () => {
    it('should maintain position for multiple components', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(100, 200),
        new Rotation(90)
      );
      const comp3 = circuit.addComponent(
        ComponentType.Battery,
        new Position(-50, -75),
        new Rotation(180)
      );

      expect(comp1.position.x).toBe(0);
      expect(comp1.position.y).toBe(0);
      expect(comp2.position.x).toBe(100);
      expect(comp2.position.y).toBe(200);
      expect(comp3.position.x).toBe(-50);
      expect(comp3.position.y).toBe(-75);
    });

    it('should maintain rotation for multiple components', () => {
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
        new Rotation(270)
      );

      expect(comp1.rotation.angle).toBe(0);
      expect(comp2.rotation.angle).toBe(90);
      expect(comp3.rotation.angle).toBe(270);
    });
  });

  describe('complex scenarios', () => {
    it('should handle adding and removing components in sequence', () => {
      // Add 3 components
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

      expect(circuit.getAllComponents().length).toBe(3);

      // Remove middle component
      circuit.removeComponent(comp2.id);
      expect(circuit.getAllComponents().length).toBe(2);

      // Add new component
      const comp4 = circuit.addComponent(
        ComponentType.Battery,
        new Position(30, 30),
        new Rotation(270)
      );
      expect(circuit.getAllComponents().length).toBe(3);

      // Remove all
      circuit.removeComponent(comp1.id);
      circuit.removeComponent(comp3.id);
      circuit.removeComponent(comp4.id);
      expect(circuit.getAllComponents().length).toBe(0);
    });

    it('should maintain circuit integrity with many components', () => {
      const components = [];

      // Add 20 components
      for (let i = 0; i < 20; i++) {
        components.push(
          circuit.addComponent(
            ComponentType.Battery,
            new Position(i * 5, i * 5),
            new Rotation(i * 15)
          )
        );
      }

      expect(circuit.getAllComponents().length).toBe(20);

      // Remove every other component
      for (let i = 0; i < 20; i += 2) {
        circuit.removeComponent(components[i]!.id);
      }

      expect(circuit.getAllComponents().length).toBe(10);

      // Verify remaining components are still accessible
      for (let i = 1; i < 20; i += 2) {
        const comp = circuit.getComponent(components[i]!.id);
        expect(comp).toBeDefined();
        expect(comp?.position.x).toBe(i * 5);
        expect(comp?.position.y).toBe(i * 5);
      }
    });
  });

  describe('serialization and deserialization', () => {
    it('should preserve component lifecycle through serialization', () => {
      // Create circuit with components
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 20),
        new Rotation(90)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Transistor,
        new Position(30, 40),
        new Rotation(180)
      );

      // Serialize
      const json = circuit.toJSON();

      // Deserialize to new circuit
      const restored = Circuit.fromJSON(json);

      // Verify components restored
      expect(restored.getAllComponents().length).toBe(2);

      const restoredComp1 = restored.getComponent(comp1.id);
      const restoredComp2 = restored.getComponent(comp2.id);

      expect(restoredComp1).toBeDefined();
      expect(restoredComp2).toBeDefined();

      expect(restoredComp1?.position.x).toBe(10);
      expect(restoredComp1?.position.y).toBe(20);
      expect(restoredComp1?.rotation.angle).toBe(90);
      expect(restoredComp1?.pins.length).toBe(2);

      expect(restoredComp2?.position.x).toBe(30);
      expect(restoredComp2?.position.y).toBe(40);
      expect(restoredComp2?.rotation.angle).toBe(180);
      expect(restoredComp2?.pins.length).toBe(3);
    });

    it('should handle empty circuit serialization', () => {
      const json = circuit.toJSON();
      const restored = Circuit.fromJSON(json);

      expect(restored.getAllComponents().length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle components at extreme positions', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(-10000, -10000),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10000, 10000),
        new Rotation(0)
      );

      expect(comp1.position.x).toBe(-10000);
      expect(comp2.position.x).toBe(10000);
    });

    it('should handle components with large rotation angles', () => {
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(720)
      );

      expect(component.rotation.angle).toBe(720);
    });
  });

  // T024: Integration test for automatic pin ENode creation
  describe('automatic pin ENode creation (US2)', () => {
    it('should automatically create ENodes for component pins', () => {
      const component = circuit.addComponent(
        ComponentType.Transistor,
        new Position(10, 20),
        new Rotation(0)
      );

      // Component should have 3 pin IDs
      expect(component.pins.length).toBe(3);

      // Each pin should have a corresponding ENode
      for (let i = 0; i < 3; i++) {
        const pinId = component.pins[i];
        const enode = circuit.getENode(pinId!);

        expect(enode).toBeDefined();
        expect(enode?.id).toBe(pinId);
        expect(enode?.type).toBe(ENodeType.Pin);
        expect(enode?.component).toBe(component.id);
      }
    });

    it('should create independent ENode sets for different components', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Transistor,
        new Position(10, 10),
        new Rotation(0)
      );

      // Total ENodes should be 2 + 3 = 5
      const allENodes = circuit.getAllENodes();
      expect(allENodes.length).toBe(5);

      // Verify comp1 pins
      for (let i = 0; i < 2; i++) {
        const enode = circuit.getENode(comp1.pins[i]!);
        expect(enode?.component).toBe(comp1.id);
      }

      // Verify comp2 pins
      for (let i = 0; i < 3; i++) {
        const enode = circuit.getENode(comp2.pins[i]!);
        expect(enode?.component).toBe(comp2.id);
      }
    });

    it('should remove pin ENodes when component is removed', () => {
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 20),
        new Rotation(0)
      );

      const pinIds = [...component.pins];

      // Verify ENodes exist
      for (const pinId of pinIds) {
        expect(circuit.getENode(pinId)).toBeDefined();
      }

      // Remove component
      circuit.removeComponent(component.id);

      // Pin ENodes should be removed
      for (const pinId of pinIds) {
        expect(circuit.getENode(pinId)).toBeUndefined();
      }

      // Circuit should have no ENodes
      expect(circuit.getAllENodes().length).toBe(0);
    });

    it('should only remove ENodes for the deleted component', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Relay,
        new Position(10, 10),
        new Rotation(0)
      );

      // Remove comp1
      circuit.removeComponent(comp1.id);

      // Comp1 ENodes should be gone
      for (const pinId of comp1.pins) {
        expect(circuit.getENode(pinId)).toBeUndefined();
      }

      // Comp2 ENodes should still exist
      for (const pinId of comp2.pins) {
        expect(circuit.getENode(pinId)).toBeDefined();
      }

      expect(circuit.getAllENodes().length).toBe(4);
    });
  });

  // T025: Integration test for ENode position handling
  describe('ENode position handling (US2)', () => {
    it('should derive pin ENode position from component position', () => {
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 20),
        new Rotation(0)
      );

      const pinId = component.pins[0];
      const enode = circuit.getENode(pinId!);

      const position = enode?.getPosition(circuit);
      expect(position).toBeDefined();
      expect(position?.x).toBe(10);
      expect(position?.y).toBe(20);
    });

    it('should update derived position when component exists', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(5, 10),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(50, 100),
        new Rotation(90)
      );

      const enode1 = circuit.getENode(comp1.pins[0]!);
      const enode2 = circuit.getENode(comp2.pins[0]!);

      const pos1 = enode1?.getPosition(circuit);
      const pos2 = enode2?.getPosition(circuit);

      expect(pos1?.x).toBe(5);
      expect(pos1?.y).toBe(10);
      expect(pos2?.x).toBe(50);
      expect(pos2?.y).toBe(100);
    });

    it('should handle pin ENodes for components at various positions', () => {
      const positions = [
        new Position(0, 0),
        new Position(100, 200),
        new Position(-50, -75),
        new Position(1000, 2000),
      ];

      for (const pos of positions) {
        const component = circuit.addComponent(ComponentType.Battery, pos, new Rotation(0));
        const enode = circuit.getENode(component.pins[0]!);
        const enodePos = enode?.getPosition(circuit);

        expect(enodePos?.x).toBe(pos.x);
        expect(enodePos?.y).toBe(pos.y);
      }
    });
  });
});
