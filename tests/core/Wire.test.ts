/**
 * Unit tests for Wire class
 *
 * Tests wire creation, validation, intermediate positions, and serialization.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { ComponentType } from '@/core/types/ComponentType';
import { Circuit } from '@/core/Circuit';
import { Position } from '@/core/types/Position';
import { Rotation } from '@/core/types/Rotation';
import { ENodeType } from '@/core/types/ENodeType';

describe('Wire', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit();
  });

  describe('wire creation', () => {
    it('should create wire between two ENodes', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(0)
      );

      const wire = circuit.addWire(comp1.pins[0]!, comp2.pins[0]!);

      expect(wire).not.toBeInstanceOf(Error);
      if (!(wire instanceof Error)) {
        expect(wire.id).toBeDefined();
        expect(typeof wire.id).toBe('string');
      }
    });

    it('should store both node IDs', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(0)
      );

      const wire = circuit.addWire(comp1.pins[0]!, comp2.pins[0]!);

      if (!(wire instanceof Error)) {
        const nodes = circuit.getNodesByWire(wire.id);
        expect(nodes).toBeDefined();
        expect(nodes?.length).toBe(2);
      }
    });

    it('should reject self-connection', () => {
      const comp = circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));
      const pinId = comp.pins[0]!;

      const result = circuit.addWire(pinId, pinId);

      expect(result).toBeInstanceOf(Error);
      if (result instanceof Error) {
        expect(result.message).toMatch(/connecting node to itself/i);
      }
    });

    it('should reject wire to non-existent node', () => {
      const comp = circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));

      const result = circuit.addWire(comp.pins[0]!, 'fake-uuid');

      expect(result).toBeInstanceOf(Error);
      if (result instanceof Error) {
        expect(result.message).toMatch(/existing ENode/i);
      }
    });

    it('should reject duplicate wire', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(0)
      );

      circuit.addWire(comp1.pins[0]!, comp2.pins[0]!);
      const duplicate = circuit.addWire(comp1.pins[0]!, comp2.pins[0]!);

      expect(duplicate).toBeInstanceOf(Error);
      if (duplicate instanceof Error) {
        expect(duplicate.message).toMatch(/duplicate/i);
      }
    });
  });

  describe('intermediate positions', () => {
    it('should create straight wire with no intermediate positions', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(0)
      );

      const wire = circuit.addWire(comp1.pins[0]!, comp2.pins[0]!);

      if (!(wire instanceof Error)) {
        expect(wire.isStraightLine()).toBe(true);
      }
    });

    it('should create wire with intermediate positions', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(20, 20),
        new Rotation(0)
      );

      const positions = [new Position(5, 10), new Position(15, 10)];
      const wire = circuit.addWire(comp1.pins[0]!, comp2.pins[0]!, positions);

      if (!(wire instanceof Error)) {
        expect(wire.isStraightLine()).toBe(false);
        expect(wire.intermediatePositions.length).toBe(2);
      }
    });

    it('should validate intermediate position coordinates', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(0)
      );

      // Should throw during Position construction
      expect(() => {
        const positions = [new Position(5.5, 10)];
        circuit.addWire(comp1.pins[0]!, comp2.pins[0]!, positions);
      }).toThrow(TypeError);
    });
  });

  describe('bidirectional references', () => {
    it('should update ENode wires set when wire added', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(0)
      );

      const wire = circuit.addWire(comp1.pins[0]!, comp2.pins[0]!);

      if (!(wire instanceof Error)) {
        const node1 = circuit.getENode(comp1.pins[0]!);
        const node2 = circuit.getENode(comp2.pins[0]!);

        expect(node1?.wires.has(wire.id)).toBe(true);
        expect(node2?.wires.has(wire.id)).toBe(true);
      }
    });

    it('should query wires by node', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(0)
      );

      circuit.addWire(comp1.pins[0]!, comp2.pins[0]!);
      circuit.addWire(comp1.pins[1]!, comp2.pins[1]!);

      const wiresAtNode = circuit.getWiresByNode(comp2.pins[0]!);

      expect(wiresAtNode.length).toBe(1);
    });
  });

  describe('wire enumeration', () => {
    it('should enumerate all wires', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(0)
      );

      circuit.addWire(comp1.pins[0]!, comp2.pins[0]!);
      circuit.addWire(comp1.pins[1]!, comp2.pins[1]!);

      const allWires = circuit.getAllWires();
      expect(allWires.length).toBe(2);
    });

    it('should get wire by ID', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(0)
      );

      const wire = circuit.addWire(comp1.pins[0]!, comp2.pins[0]!);

      if (!(wire instanceof Error)) {
        const retrieved = circuit.getWire(wire.id);
        expect(retrieved).toBe(wire);
      }
    });

    it('should check if wire exists between nodes', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(0)
      );

      expect(circuit.hasWireBetween(comp1.pins[0]!, comp2.pins[0]!)).toBe(false);

      circuit.addWire(comp1.pins[0]!, comp2.pins[0]!);

      expect(circuit.hasWireBetween(comp1.pins[0]!, comp2.pins[0]!)).toBe(true);
      expect(circuit.hasWireBetween(comp2.pins[0]!, comp1.pins[0]!)).toBe(true); // Order independent
    });
  });

  describe('JSON serialization', () => {
    it('should serialize wire', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 10),
        new Rotation(0)
      );

      const wire = circuit.addWire(comp1.pins[0]!, comp2.pins[0]!);

      if (!(wire instanceof Error)) {
        const json = wire.toJSON();

        expect(json.id).toBe(wire.id);
        expect(json).toHaveProperty('node1');
        expect(json).toHaveProperty('node2');
        expect(json.intermediatePositions).toEqual([]);
      }
    });

    it('should serialize wire with intermediate positions', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(20, 20),
        new Rotation(0)
      );

      const positions = [new Position(5, 10), new Position(15, 10)];
      const wire = circuit.addWire(comp1.pins[0]!, comp2.pins[0]!, positions);

      if (!(wire instanceof Error)) {
        const json = wire.toJSON();

        expect(json.intermediatePositions.length).toBe(2);
        expect(json.intermediatePositions[0]).toEqual({ x: 5, y: 10 });
      }
    });
  });

  describe('splitWire', () => {
    it('should split a wire into two wires with a branching point at the given position', () => {
      const comp1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      const comp2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 0),
        new Rotation(0)
      );

      const pin1 = comp1.pins[0]!;
      const pin2 = comp2.pins[0]!;

      const wire = circuit.addWire(pin1, pin2);
      expect(wire).not.toBeInstanceOf(Error);
      if (wire instanceof Error) return;

      const originalId = wire.id;

      const newWires = circuit.splitWire(originalId, new Position(5, 0));
      expect(newWires.length).toBe(2);
      if (!Array.isArray(newWires) || newWires.length < 2) {
        throw new Error("splitWire n'a pas retourné deux fils");
      }

      // L'ancien fil doit avoir été supprimé
      expect(circuit.getWire(originalId)).toBeUndefined();

      // Les nouveaux fils doivent exister dans le circuit
      const nw1 = circuit.getWire(newWires[0]!.id);
      const nw2 = circuit.getWire(newWires[1]!.id);
      expect(nw1).toBeDefined();
      expect(nw2).toBeDefined();
      if (!nw1 || !nw2) return; // narrowing sûre avant d'accéder

      // Un branching point doit exister à la position donnée
      const branching = circuit.getAllENodes().filter((e) => e.type === ENodeType.BranchingPoint);
      expect(branching).toBeDefined();
      expect(branching.length).toBeGreaterThanOrEqual(1);
      const bp = branching[0];
      expect(bp!.position).toBeDefined();
      expect(bp!.position?.x).toBe(5);
      expect(bp!.position?.y).toBe(0);

      // Le branching point doit être connecté aux deux nouveaux fils
      expect(bp!.wires.size).toBe(2);
      const bwIds = Array.from(bp!.wires);
      expect(bwIds).toContain(newWires[0]!.id);
      expect(bwIds).toContain(newWires[1]!.id);

      // Les pins originales doivent toujours être présentes et connectées via les nouveaux fils
      const nodePin1 = circuit.getENode(pin1)!;
      const nodePin2 = circuit.getENode(pin2)!;

      // Chaque pin doit avoir exactement un fil maintenant (le nouveau fil qui la relie au branching)
      expect(nodePin1.wires.size).toBeGreaterThanOrEqual(1);
      expect(nodePin2.wires.size).toBeGreaterThanOrEqual(1);

      // Vérifier que pour chaque nouveau fil, l'un des noeuds est bien le branching point
      const nodesA = circuit.getNodesByWire(newWires[0]!.id)!;
      const nodesB = circuit.getNodesByWire(newWires[1]!.id)!;
      const idsA = [nodesA[0].id, nodesA[1].id];
      const idsB = [nodesB[0].id, nodesB[1].id];
      expect(idsA).toContain(bp!.id);
      expect(idsB).toContain(bp!.id);
    });
  });
});
