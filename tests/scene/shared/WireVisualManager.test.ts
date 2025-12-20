/**
 * Unit tests for WireVisualManager
 * Task: T009
 * @module tests/scene/shared/WireVisualManager.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { WireVisualManager } from '../../../src/scene/shared/WireVisualManager';
import { Circuit } from '../../../src/core/Circuit';
import { ComponentType } from '../../../src/core/types/ComponentType';
import { Position } from '../../../src/core/types/Position';
import type { UUID } from '../../../src/core/types/Identifier';
import { disposeScene } from '../helpers';

/**
 * Create a mock component group with pin visuals
 *
 * @param componentId - Component UUID
 * @param pinIds - Array of pin UUIDs
 * @param position - Component position
 * @returns THREE.Group with pin children
 */
function createMockComponentGroup(
  componentId: UUID,
  pinIds: UUID[],
  position: { x: number; y: number }
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(position.x, 0, -position.y);
  group.userData = {
    componentId,
    componentType: ComponentType.Battery,
  };

  // Create pin groups at positions relative to component
  pinIds.forEach((pinId, index) => {
    const pinGroup = new THREE.Group();
    pinGroup.userData = {
      type: 'enodeGroup',
      componentId,
      enodeId: pinId,
      label: `pin${index}`,
    };
    // Position pins at offset from component center
    pinGroup.position.set(index === 0 ? -0.5 : 0.5, 0, 0);
    group.add(pinGroup);
  });

  return group;
}

/**
 * Create a mock CircuitController for testing
 */
function createMockController(
  circuit: Circuit,
  scene: THREE.Scene,
  componentGroups: Map<UUID, THREE.Object3D>,
  wireLines: Map<UUID, Line2>
) {
  return {
    getCircuit: () => circuit,
    getScene: () => scene,
    getCamera: () => new THREE.PerspectiveCamera(),
    getContainer: () => document.createElement('div'),
    componentObject3Ds: componentGroups,
    wireObject3Ds: wireLines,
  };
}

describe('WireVisualManager', () => {
  let wireManager: WireVisualManager;
  let scene: THREE.Scene;
  let circuit: Circuit;
  let componentGroups: Map<UUID, THREE.Object3D>;
  let wireLines: Map<UUID, Line2>;
  let mockController: any;

  beforeEach(() => {
    scene = new THREE.Scene();
    circuit = new Circuit('Test Circuit');
    componentGroups = new Map();
    wireLines = new Map();
    mockController = createMockController(circuit, scene, componentGroups, wireLines);
    wireManager = new WireVisualManager(mockController);
    // Set resolution for Line2 rendering (required for LineMaterial)
    wireManager.setResolution(800, 600);
  });

  afterEach(() => {
    wireManager.dispose();
    disposeScene(scene);
  });

  describe('createOrUpdateWire()', () => {
    it('should create a new Line2 for a wire', () => {
      // Add two components with positions
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);

      // Create wire between first pins
      const pin1 = comp1.pins[0];
      const pin2 = comp2.pins[0];
      const wire = circuit.addWire(pin1, pin2);

      // Create mock component groups
      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      // Create wire visual
      const line = wireManager.createOrUpdateWire(wire);

      expect(line).toBeInstanceOf(Line2);
      expect(line.geometry).toBeInstanceOf(LineGeometry);
      expect(line.userData.type).toBe('wire');
      expect(line.userData.wireId).toBe(wire.id);
    });

    it('should add the line to the scene', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);
      const wire = circuit.addWire(comp1.pins[0], comp2.pins[0]);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      wireManager.createOrUpdateWire(wire);

      // Find the wire line in scene
      let wireLineFound = false;
      scene.traverse((child) => {
        if (child instanceof Line2 && child.userData.wireId === wire.id) {
          wireLineFound = true;
        }
      });

      expect(wireLineFound).toBe(true);
    });

    it('should update existing line geometry when called again', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);
      const wire = circuit.addWire(comp1.pins[0], comp2.pins[0]);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      // Create initial wire
      const line1 = wireManager.createOrUpdateWire(wire);
      const geometry1 = line1.geometry;

      // Move component group and update
      componentGroups.get(comp2.id)!.position.set(20, 0, 0);
      const line2 = wireManager.createOrUpdateWire(wire);

      // Should return the same line object
      expect(line2).toBe(line1);
      // Geometry should be new (old one disposed)
      expect(line2.geometry).not.toBe(geometry1);
    });

    it('should not add duplicate lines to scene', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);
      const wire = circuit.addWire(comp1.pins[0], comp2.pins[0]);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      // Create wire twice
      wireManager.createOrUpdateWire(wire);
      wireManager.createOrUpdateWire(wire);

      // Count wire lines in scene
      let wireCount = 0;
      scene.traverse((child) => {
        if (child instanceof Line2 && child.userData.wireId === wire.id) {
          wireCount++;
        }
      });

      expect(wireCount).toBe(1);
    });
  });

  describe('computeWirePath()', () => {
    it('should return start and end points for straight wire', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);
      const wire = circuit.addWire(comp1.pins[0], comp2.pins[0]);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      const wirePath = wireManager.computeWirePath(wire);

      expect(wirePath.wireId).toBe(wire.id);
      expect(wirePath.points).toHaveLength(2);
      expect(wirePath.points[0]).toBeInstanceOf(THREE.Vector3);
      expect(wirePath.points[1]).toBeInstanceOf(THREE.Vector3);
    });

    it('should include intermediate positions in path', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);

      // Add wire with intermediate positions
      const wire = circuit.addWire(comp1.pins[0], comp2.pins[0], [
        new Position(3, 5),
        new Position(7, 5),
      ]);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      const wirePath = wireManager.computeWirePath(wire);

      // Should have: start + 2 intermediate + end = 4 points
      expect(wirePath.points).toHaveLength(4);

      // Intermediate positions should be in grid-to-world coordinates
      // Position(x, y) -> Vector3(x, 0, -y)
      expect(wirePath.points[1].x).toBe(3);
      expect(wirePath.points[1].y).toBe(0);
      expect(wirePath.points[1].z).toBe(-5);

      expect(wirePath.points[2].x).toBe(7);
      expect(wirePath.points[2].y).toBe(0);
      expect(wirePath.points[2].z).toBe(-5);
    });

    it('should handle wire with 1 intermediate position', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);

      const wire = circuit.addWire(comp1.pins[0], comp2.pins[0], [new Position(5, 2)]);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      const wirePath = wireManager.computeWirePath(wire);

      // Should have: start + 1 intermediate + end = 3 points
      expect(wirePath.points).toHaveLength(3);
      expect(wirePath.points[1].x).toBe(5);
      expect(wirePath.points[1].z).toBe(-2);
    });

    it('should handle wire with 5 intermediate positions', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);

      const intermediates: Position[] = [];
      for (let i = 1; i <= 5; i++) {
        intermediates.push(new Position(i * 2, i));
      }

      const wire = circuit.addWire(comp1.pins[0], comp2.pins[0], intermediates);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      const wirePath = wireManager.computeWirePath(wire);

      // Should have: start + 5 intermediate + end = 7 points
      expect(wirePath.points).toHaveLength(7);
    });

    it('should handle wire with many intermediate positions', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);

      // Create 10 intermediate positions
      const intermediates: Position[] = [];
      for (let i = 1; i <= 10; i++) {
        intermediates.push(new Position(i, i % 2 === 0 ? 2 : -2));
      }

      const wire = circuit.addWire(comp1.pins[0], comp2.pins[0], intermediates);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      const wirePath = wireManager.computeWirePath(wire);

      // Should have: start + 10 intermediate + end = 12 points
      expect(wirePath.points).toHaveLength(12);
    });
  });

  describe('getPinWorldPositionFromGroup()', () => {
    it('should find pin by enodeId in userData', () => {
      const componentId = 'comp-123' as UUID;
      const pinId = 'pin-456' as UUID;

      const group = new THREE.Group();
      const pinGroup = new THREE.Group();
      pinGroup.userData = {
        type: 'enodeGroup',
        enodeId: pinId,
      };
      pinGroup.position.set(1, 2, 3);
      group.add(pinGroup);

      const position = wireManager.getPinWorldPositionFromGroup(pinId, group);

      expect(position).not.toBeNull();
      expect(position!.x).toBe(1);
      expect(position!.y).toBe(2);
      expect(position!.z).toBe(3);
    });

    it('should return null when pin not found', () => {
      const group = new THREE.Group();
      const position = wireManager.getPinWorldPositionFromGroup('nonexistent' as UUID, group);

      expect(position).toBeNull();
    });

    it('should handle nested pin groups', () => {
      const pinId = 'pin-789' as UUID;

      const group = new THREE.Group();
      const innerGroup = new THREE.Group();
      const pinGroup = new THREE.Group();
      pinGroup.userData = { enodeId: pinId };
      pinGroup.position.set(5, 0, -5);

      innerGroup.add(pinGroup);
      group.add(innerGroup);

      const position = wireManager.getPinWorldPositionFromGroup(pinId, group);

      expect(position).not.toBeNull();
    });
  });

  describe('updateWiresForComponent()', () => {
    it('should update all wires connected to a component', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);
      const comp3 = circuit.addComponent(ComponentType.Battery, { x: 5, y: 10 }, 0);

      // Wire from comp1 to comp2
      const wire1 = circuit.addWire(comp1.pins[0], comp2.pins[0]);
      // Wire from comp1 to comp3
      const wire2 = circuit.addWire(comp1.pins[1], comp3.pins[0]);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );
      componentGroups.set(
        comp3.id,
        createMockComponentGroup(comp3.id, [...comp3.pins], { x: 5, y: 10 })
      );

      // Create initial wires
      wireManager.createOrUpdateWire(wire1);
      wireManager.createOrUpdateWire(wire2);

      // Move comp1 and update wires
      componentGroups.get(comp1.id)!.position.set(2, 0, 0);
      wireManager.updateWiresForComponent(comp1.id);

      // Both wires should still exist
      expect(wireManager.hasWire(wire1.id)).toBe(true);
      expect(wireManager.hasWire(wire2.id)).toBe(true);
    });
  });

  describe('removeWire()', () => {
    it('should remove wire line from scene', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);
      const wire = circuit.addWire(comp1.pins[0], comp2.pins[0]);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      wireManager.createOrUpdateWire(wire);
      wireManager.removeWire(wire.id);

      // Wire should no longer be tracked
      expect(wireManager.hasWire(wire.id)).toBe(false);

      // Wire should be removed from scene
      let wireFound = false;
      scene.traverse((child) => {
        if (child instanceof Line2 && child.userData.wireId === wire.id) {
          wireFound = true;
        }
      });
      expect(wireFound).toBe(false);
    });

    it('should handle removing non-existent wire gracefully', () => {
      expect(() => {
        wireManager.removeWire('nonexistent' as UUID);
      }).not.toThrow();
    });
  });

  describe('getWireLine()', () => {
    it('should return the Line2 for a wire', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);
      const wire = circuit.addWire(comp1.pins[0], comp2.pins[0]);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      const createdLine = wireManager.createOrUpdateWire(wire);
      const retrievedLine = wireManager.getWireLine(wire.id);

      expect(retrievedLine).toBe(createdLine);
    });

    it('should return undefined for unknown wire', () => {
      const line = wireManager.getWireLine('unknown' as UUID);
      expect(line).toBeUndefined();
    });
  });

  describe('hasWire()', () => {
    it('should return true for tracked wire', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);
      const wire = circuit.addWire(comp1.pins[0], comp2.pins[0]);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      wireManager.createOrUpdateWire(wire);

      expect(wireManager.hasWire(wire.id)).toBe(true);
    });

    it('should return false for unknown wire', () => {
      expect(wireManager.hasWire('unknown' as UUID)).toBe(false);
    });
  });

  describe('getWireIds()', () => {
    it('should return all managed wire IDs', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);
      const wire1 = circuit.addWire(comp1.pins[0], comp2.pins[0]);
      const wire2 = circuit.addWire(comp1.pins[1], comp2.pins[1]);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      wireManager.createOrUpdateWire(wire1);
      wireManager.createOrUpdateWire(wire2);

      const wireIds = wireManager.getWireIds();

      expect(wireIds).toHaveLength(2);
      expect(wireIds).toContain(wire1.id);
      expect(wireIds).toContain(wire2.id);
    });

    it('should return empty array when no wires', () => {
      const wireIds = wireManager.getWireIds();
      expect(wireIds).toHaveLength(0);
    });
  });

  describe('dispose()', () => {
    it('should remove all wire visuals from scene', () => {
      const comp1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
      const comp2 = circuit.addComponent(ComponentType.Battery, { x: 10, y: 0 }, 0);
      const wire = circuit.addWire(comp1.pins[0], comp2.pins[0]);

      componentGroups.set(
        comp1.id,
        createMockComponentGroup(comp1.id, [...comp1.pins], { x: 0, y: 0 })
      );
      componentGroups.set(
        comp2.id,
        createMockComponentGroup(comp2.id, [...comp2.pins], { x: 10, y: 0 })
      );

      wireManager.createOrUpdateWire(wire);
      wireManager.dispose();

      // All wires should be cleared
      expect(wireManager.getWireIds()).toHaveLength(0);
    });

    it('should be safe to call multiple times', () => {
      expect(() => {
        wireManager.dispose();
        wireManager.dispose();
      }).not.toThrow();
    });
  });
});
