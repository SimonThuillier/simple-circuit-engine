/**
 * Unit tests for CircuitWriter
 * @module tests/unit/scene/static/CircuitWriter.test
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import * as THREE from 'three';
import { CircuitWriter } from '../../../src/scene/static/CircuitWriter';
import { Circuit } from '../../../src/core/Circuit';
import { ComponentType } from '../../../src/core/types/ComponentType';
import { ENodeType } from '../../../src/core/types/ENodeType';
import { Position } from '../../../src/core/types/Position';
import type { CircuitController } from '../../../src/scene/static/CircuitController';

/**
 * Create a mock CircuitController with spied emit method
 */
function createMockController(circuit: Circuit | null = null): {
  controller: CircuitController;
  emitSpy: Mock;
} {
  const emitSpy = vi.fn();
  const controller = {
    getCircuit: vi.fn().mockReturnValue(circuit),
    emit: emitSpy,
  } as unknown as CircuitController;
  return { controller, emitSpy };
}

/**
 * Create a test circuit with components and wires for testing
 */
function createTestCircuit(name: string = 'Test Circuit'): Circuit {
  const circuit = new Circuit(name);
  return circuit;
}

describe('CircuitWriter', () => {
  let circuit: Circuit;
  let controller: CircuitController;
  let emitSpy: Mock;
  let manager: CircuitWriter;

  beforeEach(() => {
    circuit = createTestCircuit();
    const mock = createMockController(circuit);
    controller = mock.controller;
    emitSpy = mock.emitSpy;
    manager = new CircuitWriter(controller);
  });

  describe('Constructor', () => {
    it('should create an instance with a controller', () => {
      expect(manager).toBeInstanceOf(CircuitWriter);
    });
  });

  describe('saveAddBranchingPoint', () => {
    it('should add a branching point and emit circuitElementAction event', () => {
      const worldPosition = new THREE.Vector3(5, 0, -3);

      const result = manager.saveAddBranchingPoint(worldPosition);

      expect(result).toBeDefined();
      expect(result.type).toBe(ENodeType.BranchingPoint);
      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'enode',
          action: 'add',
          id: result.id,
          error: null,
        })
      );
    });

    it('should convert world position to grid position', () => {
      const worldPosition = new THREE.Vector3(5.4, 0, -3.6);

      const result = manager.saveAddBranchingPoint(worldPosition);

      // worldToGridPosition: x = round(x), y = round(-z)
      expect(result.getPosition(circuit).x).toBe(5);
      expect(result.getPosition(circuit).y).toBe(4); // round(-(-3.6)) = round(3.6) = 4
    });

    it('should throw error when no circuit is available', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);
      const worldPosition = new THREE.Vector3(5, 0, -3);

      expect(() => managerNoCircuit.saveAddBranchingPoint(worldPosition)).toThrow(
        'No circuit available in the scene controllerType.'
      );
    });

    it('should emit error event when adding branching point fails', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);
      const worldPosition = new THREE.Vector3(5, 0, -3);

      try {
        managerNoCircuit.saveAddBranchingPoint(worldPosition);
      } catch {
        // Expected to throw
      }

      expect(noCircuitManager.emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'enode',
          action: 'add',
          id: undefined,
          error: expect.any(Error),
        })
      );
    });
  });

  describe('saveEditBranchingPoint', () => {
    let branchingPointObject3D: THREE.Object3D;
    let enodeId: string;

    beforeEach(() => {
      // Create a branching point first
      const bp = circuit.addBranchingPoint(new Position(5, 5));
      enodeId = bp.id;

      // Create a mock Object3D representing the branching point visual
      branchingPointObject3D = new THREE.Object3D();
      branchingPointObject3D.position.set(7, 0, -8);
      branchingPointObject3D.userData = {
        enodeId: enodeId,
        sourceType: 'power',
      };
    });

    it('should update branching point position and return enode', () => {
      const result = manager.saveEditBranchingPoint(branchingPointObject3D, false);

      expect(result).toBeDefined();
      expect(result.id).toBe(enodeId);
      // Position should be updated: worldToGridPosition(7, 0, -8) => (7, 8)
      expect(result.getPosition(circuit).x).toBe(7);
      expect(result.getPosition(circuit).y).toBe(8);
    });

    it('should emit event when emit parameter is true', () => {
      manager.saveEditBranchingPoint(branchingPointObject3D, true);

      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'enode',
          action: 'edit',
          id: enodeId,
          error: null,
        })
      );
    });

    it('should not emit event when emit parameter is false', () => {
      manager.saveEditBranchingPoint(branchingPointObject3D, false);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should throw error when enode is not found', () => {
      branchingPointObject3D.userData.enodeId = 'non-existent-id';

      expect(() => manager.saveEditBranchingPoint(branchingPointObject3D, false)).toThrow(
        'No enode with id non-existent-id found in the circuit.'
      );
    });

    it('should throw error when no circuit is available', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);

      expect(() => managerNoCircuit.saveEditBranchingPoint(branchingPointObject3D, false)).toThrow(
        'No circuit available in the scene controllerType.'
      );
    });
  });

  describe('saveDeleteBranchingPoint', () => {
    let enodeId: string;

    beforeEach(() => {
      const bp = circuit.addBranchingPoint(new Position(5, 5));
      enodeId = bp.id;
    });

    it('should delete branching point and emit event', () => {
      const result = manager.saveDeleteBranchingPoint(enodeId);

      expect(result).toBeDefined();
      expect(circuit.getENode(enodeId)).toBeUndefined();
      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'enode',
          action: 'delete',
          id: enodeId,
          error: null,
        })
      );
    });

    it('should throw error when no circuit is available', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);

      expect(() => managerNoCircuit.saveDeleteBranchingPoint(enodeId)).toThrow(
        'No circuit available in the scene controllerType.'
      );
    });
  });

  describe('saveAddWire', () => {
    let sourceEnodeId: string;
    let targetEnodeId: string;

    beforeEach(() => {
      // Add a component with pins to use as wire endpoints
      const component = circuit.addComponent(ComponentType.Battery, new Position(0, 0), 0);
      const pins = component.pins;
      sourceEnodeId = pins[0];
      targetEnodeId = pins[1];
    });

    it('should add a wire between two enodes', () => {
      const result = manager.saveAddWire(sourceEnodeId, targetEnodeId);

      expect(result).toBeDefined();
      expect(result.node1).toBe(sourceEnodeId);
      expect(result.node2).toBe(targetEnodeId);
      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'wire',
          action: 'add',
          id: result.id,
          error: null,
        })
      );
    });

    it('should throw error when no circuit is available', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);

      expect(() => managerNoCircuit.saveAddWire(sourceEnodeId, targetEnodeId)).toThrow(
        'No circuit available in the scene controllerType.'
      );
    });

    it('should emit error event when wire creation fails', () => {
      // Try to create a wire between invalid enodes
      expect(() => manager.saveAddWire('invalid-id-1', 'invalid-id-2')).toThrow();

      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'wire',
          action: 'add',
          id: undefined,
          error: expect.any(Error),
        })
      );
    });
  });

  describe('saveSplitWire', () => {
    let wireId: string;

    beforeEach(() => {
      // Create two branching points and a wire between them
      const bp1 = circuit.addBranchingPoint(new Position(0, 0));
      const bp2 = circuit.addBranchingPoint(new Position(10, 0));
      const wireResult = circuit.addWire(bp1.id, bp2.id);
      wireId = (wireResult as any).id;
    });

    it('should split wire and return new branching point and wires', () => {
      const worldPosition = new THREE.Vector3(5, 0, 0);

      const result = manager.saveSplitWire(wireId, worldPosition);

      expect(result.branchingPoint).toBeDefined();
      expect(result.wires).toBeDefined();
      expect(result.wires.length).toBe(2);
      expect(result.branchingPoint.type).toBe(ENodeType.BranchingPoint);
    });

    it('should emit multiple events for split operation', () => {
      const worldPosition = new THREE.Vector3(5, 0, 0);

      manager.saveSplitWire(wireId, worldPosition);

      // Should emit delete for original wire, add for BP, add for two new wires
      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'wire',
          action: 'delete',
          id: wireId,
        })
      );
      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'enode',
          action: 'add',
        })
      );
    });

    it('should throw error when no circuit is available', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);
      const worldPosition = new THREE.Vector3(5, 0, 0);

      expect(() => managerNoCircuit.saveSplitWire(wireId, worldPosition)).toThrow(
        'No circuit available in the scene controllerType.'
      );
    });
  });

  describe('saveDeleteWire', () => {
    let wireId: string;

    beforeEach(() => {
      const bp1 = circuit.addBranchingPoint(new Position(0, 0));
      const bp2 = circuit.addBranchingPoint(new Position(10, 0));
      const wireResult = circuit.addWire(bp1.id, bp2.id);
      wireId = (wireResult as any).id;
    });

    it('should delete wire and emit event', () => {
      manager.saveDeleteWire(wireId);

      expect(circuit.getWire(wireId)).toBeUndefined();
      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'wire',
          action: 'delete',
          id: wireId,
          error: null,
        })
      );
    });

    it('should not throw for non-existent wire but emit error event', () => {
      expect(() => manager.saveDeleteWire('non-existent-wire')).not.toThrow();
    });
  });

  describe('saveEditWirePositions', () => {
    let wireId: string;

    beforeEach(() => {
      const bp1 = circuit.addBranchingPoint(new Position(0, 0));
      const bp2 = circuit.addBranchingPoint(new Position(10, 0));
      const wireResult = circuit.addWire(bp1.id, bp2.id);
      wireId = (wireResult as any).id;
    });

    it('should update wire intermediate positions', () => {
      const positions = [
        { x: 2, y: 3 },
        { x: 5, y: 5 },
        { x: 8, y: 3 },
      ];

      const result = manager.saveEditWirePositions(wireId, positions, false);

      expect(result).toBeDefined();
      expect(result!.intermediatePositions.length).toBe(3);
    });

    it('should emit event when emit parameter is true', () => {
      const positions = [
        { x: 2, y: 3 },
        { x: 5, y: 5 },
        { x: 8, y: 3 },
      ];

      manager.saveEditWirePositions(wireId, positions, true);

      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'wire',
          action: 'edit',
          id: wireId,
          error: null,
        })
      );
    });

    it('should not emit event when emit parameter is false', () => {
      const positions = [{ x: 2, y: 3 }];

      manager.saveEditWirePositions(wireId, positions, false);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should return undefined when no circuit is available', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);
      const positions = [{ x: 2, y: 3 }];

      const result = managerNoCircuit.saveEditWirePositions(wireId, positions, false);

      expect(result).toBeUndefined();
    });

    it('should return undefined when wire is not found', () => {
      const positions = [{ x: 2, y: 3 }];

      const result = manager.saveEditWirePositions('non-existent-wire', positions, false);

      expect(result).toBeUndefined();
    });
  });

  describe('saveSimplifyWirePositions', () => {
    let wireId: string;

    beforeEach(() => {
      const bp1 = circuit.addBranchingPoint(new Position(0, 0));
      const bp2 = circuit.addBranchingPoint(new Position(10, 0));
      const wireResult = circuit.addWire(bp1.id, bp2.id);
      wireId = (wireResult as any).id;
      // Add some intermediate positions
      circuit.updateWireIntermediatePositions(wireId, [
        new Position(2, 0),
        new Position(4, 0),
        new Position(6, 0),
      ]);
    });

    it('should simplify wire positions and emit event', () => {
      const result = manager.saveSimplifyWirePositions(wireId);

      expect(result).toBeDefined();
      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'wire',
          action: 'edit',
          id: wireId,
          error: null,
        })
      );
    });

    it('should return undefined when no circuit is available', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);

      const result = managerNoCircuit.saveSimplifyWirePositions(wireId);

      expect(result).toBeUndefined();
    });

    it('should return undefined when wire is not found', () => {
      const result = manager.saveSimplifyWirePositions('non-existent-wire');

      expect(result).toBeUndefined();
    });
  });

  describe('saveEditENodeSourceType', () => {
    let enodeId: string;

    beforeEach(() => {
      const bp = circuit.addBranchingPoint(new Position(5, 5));
      enodeId = bp.id;
    });

    it('should update enode sourceType and emit event', () => {
      manager.saveEditENodeSourceType(enodeId, 'Voltage');

      expect(emitSpy).toHaveBeenCalledWith('circuitElementAction', {
        type: 'enode',
        action: 'edit',
        id: enodeId,
        error: null,
        data: {
          sourceType: 'Voltage',
        },
      });
    });

    it('should allow setting sourceType to null', () => {
      manager.saveEditENodeSourceType(enodeId, null);

      expect(emitSpy).toHaveBeenCalledWith('circuitElementAction', {
        type: 'enode',
        action: 'edit',
        id: enodeId,
        error: null,
        data: {
          sourceType: null,
        },
      });
    });

    it('should throw error when no circuit is available', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);

      expect(() => managerNoCircuit.saveEditENodeSourceType(enodeId, 'power')).toThrow(
        'No circuit available in the scene controllerType.'
      );
    });
  });

  describe('saveAddComponent', () => {
    it('should add a component and emit event', () => {
      const position = new THREE.Vector3(5, 0, -3);
      const rotation = new THREE.Euler(0, Math.PI / 2, 0);

      const result = manager.saveAddComponent(ComponentType.Battery, position, rotation);

      expect(result).toBeDefined();
      expect(result.type).toBe(ComponentType.Battery);
      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'component',
          action: 'add',
          id: result.id,
          error: null,
        })
      );
    });

    it('should convert world position and rotation to grid values', () => {
      const position = new THREE.Vector3(5.4, 0, -3.6);
      const rotation = new THREE.Euler(0, -Math.PI / 2, 0); // -90 degrees in Y

      const result = manager.saveAddComponent(ComponentType.Switch, position, rotation);

      // worldToGridPosition: x = round(5.4) = 5, y = round(-(-3.6)) = round(3.6) = 4
      expect(result.position.x).toBe(5);
      expect(result.position.y).toBe(4);
      // worldToGridRotation: round(radToDeg(-rotation.y)) = round(radToDeg(PI/2)) = 90
      expect(result.rotation.angle).toBe(90);
    });

    it('should throw error when no circuit is available', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);
      const position = new THREE.Vector3(5, 0, -3);
      const rotation = new THREE.Euler(0, 0, 0);

      expect(() =>
        managerNoCircuit.saveAddComponent(ComponentType.Battery, position, rotation)
      ).toThrow('No circuit available in the scene controllerType.');
    });

    it('should emit error event when component creation fails', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);
      const position = new THREE.Vector3(5, 0, -3);
      const rotation = new THREE.Euler(0, 0, 0);

      try {
        managerNoCircuit.saveAddComponent(ComponentType.Battery, position, rotation);
      } catch {
        // Expected to throw
      }

      expect(noCircuitManager.emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'component',
          action: 'add',
          id: undefined,
          error: expect.any(Error),
        })
      );
    });
  });

  describe('saveEditComponent', () => {
    let componentId: string;
    let componentVisual: THREE.Object3D;

    beforeEach(() => {
      const component = circuit.addComponent(ComponentType.Battery, new Position(0, 0), 0);
      componentId = component.id;

      componentVisual = new THREE.Object3D();
      componentVisual.position.set(10, 0, -5);
      componentVisual.rotation.set(0, -Math.PI / 2, 0);
      componentVisual.userData = { componentId };
    });

    it('should update component position and rotation', () => {
      const result = manager.saveEditComponent(componentId, componentVisual, false);

      expect(result).toBeDefined();
      expect(result.id).toBe(componentId);
      // worldToGridPosition(10, 0, -5) => (10, 5)
      expect(result.position.x).toBe(10);
      expect(result.position.y).toBe(5);
      // worldToGridRotation with y=-PI/2 => round(radToDeg(PI/2)) = 90
      expect(result.rotation.angle).toBe(90);
    });

    it('should emit event when emit parameter is true', () => {
      manager.saveEditComponent(componentId, componentVisual, true);

      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'component',
          action: 'edit',
          id: componentId,
          error: null,
        })
      );
    });

    it('should not emit event when emit parameter is false', () => {
      manager.saveEditComponent(componentId, componentVisual, false);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should throw error when no circuit is available', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);

      expect(() => managerNoCircuit.saveEditComponent(componentId, componentVisual, false)).toThrow(
        'No circuit available in the scene controllerType.'
      );
    });

    it('should throw error when component is not found', () => {
      componentVisual.userData.componentId = 'non-existent-id';

      expect(() => manager.saveEditComponent('non-existent-id', componentVisual, false)).toThrow(
        'Component with ID non-existent-id not found in the circuit.'
      );
    });
  });

  describe('saveDeleteComponent', () => {
    let componentId: string;

    beforeEach(() => {
      const component = circuit.addComponent(ComponentType.Battery, new Position(0, 0), 0);
      componentId = component.id;
    });

    it('should delete component and emit event', () => {
      const result = manager.saveDeleteComponent(componentId);

      expect(result).toBeDefined();
      expect(result.deletedWires).toBeDefined();
      expect(result.deletedENodes).toBeDefined();
      expect(circuit.getComponent(componentId)).toBeUndefined();
      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'component',
          action: 'delete',
          id: componentId,
          error: null,
        })
      );
    });

    it('should return deleted wires when component has connected wires', () => {
      // Create another component and wire them together
      const component2 = circuit.addComponent(ComponentType.Lightbulb, new Position(5, 0), 0);
      const wire = circuit.addWire(circuit.getComponent(componentId)!.pins[0], component2.pins[0]);
      const wireId = (wire as any).id;

      const result = manager.saveDeleteComponent(componentId);

      expect(result.deletedWires).toContain(wireId);
    });

    it('should throw error when no circuit is available', () => {
      const noCircuitManager = createMockController(null);
      const managerNoCircuit = new CircuitWriter(noCircuitManager.controller);

      expect(() => managerNoCircuit.saveDeleteComponent(componentId)).toThrow(
        'No circuit available in the scene controllerType.'
      );
    });

    it('should throw error when component is not found', () => {
      expect(() => manager.saveDeleteComponent('non-existent-id')).toThrow(
        'Component with ID non-existent-id not found in the circuit.'
      );
    });

    it('should emit error event when deletion fails', () => {
      try {
        manager.saveDeleteComponent('non-existent-id');
      } catch {
        // Expected to throw
      }

      expect(emitSpy).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'component',
          action: 'delete',
          id: 'non-existent-id',
          error: expect.any(Error),
        })
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle creating and deleting branching point with wires', () => {
      // Create two branching points
      const bp1 = manager.saveAddBranchingPoint(new THREE.Vector3(0, 0, 0));
      const bp2 = manager.saveAddBranchingPoint(new THREE.Vector3(5, 0, -5));

      // Connect them with a wire
      const wire = manager.saveAddWire(bp1.id, bp2.id);

      expect(circuit.getAllWires().length).toBe(1);
      expect(circuit.getAllENodes().length).toBe(2);

      // Delete the branching point - should also delete the wire
      manager.saveDeleteBranchingPoint(bp1.id);

      expect(circuit.getENode(bp1.id)).toBeUndefined();
    });

    it('should handle component workflow: add, edit, delete', () => {
      // Add component
      const position = new THREE.Vector3(0, 0, 0);
      const rotation = new THREE.Euler(0, 0, 0);
      const component = manager.saveAddComponent(ComponentType.Switch, position, rotation);

      // Edit component
      const visual = new THREE.Object3D();
      visual.position.set(5, 0, -5);
      visual.rotation.set(0, -Math.PI, 0);
      const edited = manager.saveEditComponent(component.id, visual, true);

      expect(edited.position.x).toBe(5);
      expect(edited.position.y).toBe(5);

      // Delete component
      manager.saveDeleteComponent(component.id);

      expect(circuit.getComponent(component.id)).toBeUndefined();
    });

    it('should handle wire split and reconnection', () => {
      // Create branching points and wire
      const bp1 = manager.saveAddBranchingPoint(new THREE.Vector3(0, 0, 0));
      const bp2 = manager.saveAddBranchingPoint(new THREE.Vector3(10, 0, 0));
      const wire = manager.saveAddWire(bp1.id, bp2.id);

      // Split the wire
      const splitResult = manager.saveSplitWire(wire.id, new THREE.Vector3(5, 0, 0));

      expect(splitResult.branchingPoint).toBeDefined();
      expect(splitResult.wires).toBeDefined();
      expect(splitResult.wires.length).toBe(2);
      expect(circuit.getWire(wire.id)).toBeUndefined(); // Original wire deleted
      expect(circuit.getAllWires().length).toBe(2); // Two new wires
      expect(circuit.getAllENodes().length).toBe(3); // Original 2 + new BP
    });
  });
});
