/**
 * Unit tests for ENode class
 *
 * Tests electrical node creation, types, position handling, and wire connections.
 */

import { describe, it, expect } from 'vitest';
import {
  Circuit,
  ENode,
  ComponentType,
  COMPONENT_TYPE_METADATA,
  ENodeType,
  Position,
  Rotation,
} from 'simple-circuit-engine/core';
import { CircuitOptions } from '../../src/core/topology/CircuitOptions.js';

describe('ENode', () => {
  describe('Pin ENode creation', () => {
    it('should create pin ENode with component reference', () => {
      const circuit = new Circuit(new CircuitOptions());
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 20),
        new Rotation(0)
      );

      // Get the pin ENode
      const pinId = component.pins[0];
      const enode = circuit.getENode(pinId!);

      expect(enode).toBeDefined();
      expect(enode?.type).toBe(ENodeType.Pin);
      expect(enode?.component).toBe(component.id);
      expect(enode?.pinLabel).toBe('cathode');
    });

    it('should create multiple pin ENodes for component', () => {
      const circuit = new Circuit(new CircuitOptions());
      const component = circuit.addComponent(
        ComponentType.Relay,
        new Position(0, 0),
        new Rotation(0)
      );

      expect(component.pins.length).toBe(4);

      // All pins should have corresponding ENodes
      const pinLabels = Array.from(COMPONENT_TYPE_METADATA[ComponentType.Relay].pins.keys());
      const pinMetas = Array.from(COMPONENT_TYPE_METADATA[ComponentType.Relay].pins.values());

      for (let i = 0; i < 4; i++) {
        const pinId = component.pins[i];
        const enode = circuit.getENode(pinId!);

        expect(enode).toBeDefined();
        expect(enode?.type).toBe(ENodeType.Pin);
        expect(enode?.component).toBe(component.id);
        expect(enode?.pinLabel).toBe(pinLabels[i]);
        expect(enode?.source).toBe(pinMetas[i]?.sourceType);
        expect(enode?.subtype).toBe(pinMetas[i]?.subtype);
      }
    });

    it('should not have position field for pin ENodes', () => {
      const circuit = new Circuit(new CircuitOptions());
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 20),
        new Rotation(0)
      );

      const pinId = component.pins[0];
      const enode = circuit.getENode(pinId!);

      expect(enode?.type).toBe(ENodeType.Pin);
      expect(enode?.position).toBeUndefined();
    });
  });

  describe('Branching Point ENode creation', () => {
    it('should create branching point with position', () => {
      // Branching points are created during wire splitting (Phase 5)
      // For now, we test the ENode class can represent branching points
      const position = new Position(15, 25);
      const enode = new ENode(ENodeType.BranchingPoint, undefined, undefined, position);

      expect(enode.type).toBe(ENodeType.BranchingPoint);
      expect(enode.position).toBeDefined();
      expect(enode.position?.x).toBe(15);
      expect(enode.position?.y).toBe(25);
      expect(enode.component).toBeUndefined();
      expect(enode.pinLabel).toBeUndefined();
      expect(enode.subtype).toBe('free');
    });

    it('should have unique ID', () => {
      const pos = new Position(0, 0);
      const enode1 = new ENode(ENodeType.BranchingPoint, undefined, undefined, pos);
      const enode2 = new ENode(ENodeType.BranchingPoint, undefined, undefined, pos);

      expect(enode1.id).not.toBe(enode2.id);
    });

    it('should create branching point via Circuit.addBranchingPoint', () => {
      const circuit = new Circuit(new CircuitOptions());
      const pos = new Position(5, 6);

      const bp = circuit.addBranchingPoint(pos);

      expect(bp).toBeDefined();
      expect(bp.type).toBe(ENodeType.BranchingPoint);
      expect(bp.position).toBeDefined();
      expect(bp.position?.x).toBe(5);
      expect(bp.position?.y).toBe(6);

      // Doit être accessible via le circuit
      expect(circuit.getENode(bp.id)).toBe(bp);

      // Aucun fil connecté initialement
      expect(bp.wires.size).toBe(0);
    });
  });

  describe('Pin subtypes', () => {
    it('should assign correct subtypes to gate pins', () => {
      const circuit = new Circuit(new CircuitOptions());
      const component = circuit.addComponent(
        ComponentType.NandGate,
        new Position(0, 0),
        new Rotation(0)
      );

      const vcc = circuit.getENode(component.pins[0]!);
      expect(vcc?.subtype).toBe('vcc');

      const input1 = circuit.getENode(component.pins[1]!);
      expect(input1?.subtype).toBe('logicInput');

      const input2 = circuit.getENode(component.pins[2]!);
      expect(input2?.subtype).toBe('logicInput');

      const output = circuit.getENode(component.pins[3]!);
      expect(output?.subtype).toBe('logicOutput');
    });

    it('should assign correct subtype to basic component pins', () => {
      const circuit = new Circuit(new CircuitOptions());
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );

      const cathode = circuit.getENode(component.pins[0]!);
      expect(cathode?.subtype).toBe('mainVcc');

      const anode = circuit.getENode(component.pins[1]!);
      expect(anode?.subtype).toBe('mainGnd');
    });

    it('should assign free subtype to branching points', () => {
      const circuit = new Circuit(new CircuitOptions());
      const bp = circuit.addBranchingPoint(new Position(5, 5));
      expect(bp.subtype).toBe('free');
    });
  });

  describe('ENode types', () => {
    it('should distinguish between pin and branching point types', () => {
      const circuit = new Circuit(new CircuitOptions());
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );

      const pinNode = circuit.getENode(component.pins[0]!);
      const branchNode = new ENode(
        ENodeType.BranchingPoint,
        undefined,
        undefined,
        new Position(10, 10)
      );

      expect(pinNode?.type).toBe(ENodeType.Pin);
      expect(branchNode.type).toBe(ENodeType.BranchingPoint);
    });
  });

  describe('getPosition() method', () => {
    it('should derive position from component for pin ENodes', () => {
      const circuit = new Circuit(new CircuitOptions());
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 20),
        new Rotation(0)
      );

      const pinId = component.pins[0];
      const enode = circuit.getENode(pinId!);

      expect(enode).toBeDefined();

      // For now, getPosition returns component position
      // (pin offset calculation can be added later if needed)
      const position = enode?.getPosition(circuit);
      expect(position).toBeDefined();
      expect(position?.x).toBe(10);
      expect(position?.y).toBe(20);
    });

    it('should return direct position for branching point ENodes', () => {
      const branchPos = new Position(15, 25);
      const enode = new ENode(ENodeType.BranchingPoint, undefined, undefined, branchPos);

      // Create a dummy circuit (branching point doesn't need it)
      const circuit = new Circuit(new CircuitOptions());
      const position = enode.getPosition(circuit);

      expect(position).toBe(branchPos);
      expect(position.x).toBe(15);
      expect(position.y).toBe(25);
    });
  });

  describe('wire connections', () => {
    it('should initialize with empty wires set', () => {
      const enode = new ENode(ENodeType.BranchingPoint, undefined, undefined, new Position(0, 0));

      expect(enode.wires).toBeDefined();
      expect(enode.wires.size).toBe(0);
    });

    it('should maintain wires set (to be populated in Phase 5)', () => {
      const circuit = new Circuit(new CircuitOptions());
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );

      const pinId = component.pins[0];
      const enode = circuit.getENode(pinId!);

      expect(enode?.wires).toBeDefined();
      expect(enode?.wires.size).toBe(0);
    });
  });

  describe('JSON serialization', () => {
    it('should serialize pin ENode', () => {
      const circuit = new Circuit(new CircuitOptions());
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(10, 20),
        new Rotation(0)
      );

      const pinId = component.pins[0];
      const enode = circuit.getENode(pinId!);
      const json = enode?.toJSON();

      expect(json).toBeDefined();
      expect(json?.id).toBe(pinId);
      expect(json?.type).toBe(ENodeType.Pin);
      expect(json?.component).toBe(component.id);
      expect(json?.pinLabel).toBe('cathode');
      expect(json?.position).toBeUndefined();
      expect(json?.subtype).toBe('mainVcc');
    });

    it('should serialize branching point ENode', () => {
      const position = new Position(15, 25);
      const enode = new ENode(ENodeType.BranchingPoint, undefined, undefined, position);

      const json = enode.toJSON();

      expect(json.id).toBe(enode.id);
      expect(json.type).toBe(ENodeType.BranchingPoint);
      expect(json.position).toEqual({ x: 15, y: 25 });
      expect(json.component).toBeUndefined();
      expect(json.pinLabel).toBeUndefined();
      expect(json.subtype).toBe('free');
    });

    it('should deserialize pin ENode', () => {
      const json = {
        id: 'test-pin-id',
        type: ENodeType.Pin,
        component: 'component-id',
        pinLabel: '1',
        subtype: 'logicInput',
      };

      const enode = ENode.fromJSON(json);

      expect(enode.id).toBe('test-pin-id');
      expect(enode.type).toBe(ENodeType.Pin);
      expect(enode.component).toBe('component-id');
      expect(enode.pinLabel).toBe('1');
      expect(enode.position).toBeUndefined();
      expect(enode.subtype).toBe('logicInput');
    });

    it('should deserialize pin ENode without subtype (defaults to free)', () => {
      const json = {
        id: 'test-pin-id',
        type: ENodeType.Pin,
        component: 'component-id',
        pinLabel: '1',
      };

      const enode = ENode.fromJSON(json);
      expect(enode.subtype).toBe('free');
    });

    it('should deserialize branching point ENode', () => {
      const json = {
        id: 'test-branch-id',
        type: ENodeType.BranchingPoint,
        position: { x: 15, y: 25 },
      };

      const enode = ENode.fromJSON(json);

      expect(enode.id).toBe('test-branch-id');
      expect(enode.type).toBe(ENodeType.BranchingPoint);
      expect(enode.position?.x).toBe(15);
      expect(enode.position?.y).toBe(25);
      expect(enode.component).toBeUndefined();
      expect(enode.pinLabel).toBeUndefined();
      expect(enode.subtype).toBe('free');
    });
  });

  describe('enumeration', () => {
    it('should enumerate all ENodes including pins', () => {
      const circuit = new Circuit(new CircuitOptions());

      circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));
      circuit.addComponent(ComponentType.Inverter, new Position(10, 10), new Rotation(0));

      const allENodes = circuit.getAllENodes();

      // Should have 2 + 4 = 6 pin ENodes (Inverter has vcc, input, output, gnd)
      expect(allENodes.length).toBe(6);

      // All should be pin type
      for (const enode of allENodes) {
        expect(enode.type).toBe(ENodeType.Pin);
      }
    });

    it('should get specific ENode by ID', () => {
      const circuit = new Circuit(new CircuitOptions());
      const component = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );

      const pinId = component.pins[1];
      const enode = circuit.getENode(pinId!);

      expect(enode).toBeDefined();
      expect(enode?.id).toBe(pinId);
      expect(enode?.pinLabel).toBe('anode');
    });

    it('should return undefined for non-existent ENode ID', () => {
      const circuit = new Circuit(new CircuitOptions());
      const enode = circuit.getENode('non-existent-id');

      expect(enode).toBeUndefined();
    });
  });
});
