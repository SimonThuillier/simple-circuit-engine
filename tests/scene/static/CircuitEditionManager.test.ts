/**
 * Unit tests for CircuitEditionManager
 * @module tests/scene/static/CircuitEditionManager.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitEditionManager } from '@/scene/static/CircuitEditionManager';
import { Circuit } from '@/core/Circuit';
import { Position } from '@/core/types/Position';
import { Rotation } from '@/core/types/Rotation';
import { ComponentType } from '@/core/types/ComponentType';
import * as THREE from 'three';

// Mock CircuitSceneManager
const createMockSceneManager = (circuit: Circuit | null) => {
  return {
    getCircuit: vi.fn(() => circuit),
    emit: vi.fn(),
  };
};

describe('CircuitEditionManager', () => {
  let circuit: Circuit;
  let manager: CircuitEditionManager;
  let mockSceneManager: ReturnType<typeof createMockSceneManager>;
  let componentId: string;
  let componentGroup: THREE.Group;

  beforeEach(() => {
    // Create a circuit with a test component
    circuit = new Circuit('test-circuit');
    const component = circuit.addComponent(
      ComponentType.Battery,
      new Position(5, 5),
      new Rotation(0)
    );
    componentId = component.id;

    // Create mock scene manager
    mockSceneManager = createMockSceneManager(circuit);

    // Create CircuitEditionManager
    manager = new CircuitEditionManager(mockSceneManager as any);

    // Create a mock THREE.Group representing the visual component
    componentGroup = new THREE.Group();
    componentGroup.position.set(10, 0, -10); // Visual position (x, 0, -y)
    componentGroup.rotation.set(0, -Math.PI / 2, 0); // 90° clockwise = -π/2
  });

  describe('saveComponentAction', () => {
    it('should update component position in circuit model', () => {
      const component = circuit.getComponent(componentId);
      expect(component!.position.x).toBe(5);
      expect(component!.position.y).toBe(5);

      manager.saveComponentAction(componentId, 'edit', componentGroup);

      expect(component!.position.x).toBe(10);
      expect(component!.position.y).toBe(10); // -z becomes y
    });

    it('should update component rotation in circuit model', () => {
      const component = circuit.getComponent(componentId);
      expect(component!.rotation.angle).toBe(0);

      manager.saveComponentAction(componentId, 'edit', componentGroup);

      expect(component!.rotation.angle).toBe(90); // -π/2 rad = 90°
    });

    it('should emit circuitElementAction event on success', () => {
      manager.saveComponentAction(componentId, 'edit', componentGroup);

      expect(mockSceneManager.emit).toHaveBeenCalledWith('circuitElementAction', {
        type: 'component',
        action: 'edit',
        id: componentId,
        error: null,
        data: {
          position: expect.any(Position),
          rotation: expect.any(Rotation),
        },
      });
    });

    it('should handle rotation wrapping (360° = 0°)', () => {
      const component = circuit.getComponent(componentId);

      // Set rotation to 360° (0 radians after wrapping)
      componentGroup.rotation.set(0, 0, 0);
      manager.saveComponentAction(componentId, 'edit', componentGroup);

      // Use Math.abs to handle -0 vs 0 issue
      expect(Math.abs(component!.rotation.angle)).toBe(0);
    });

    it('should emit error event when circuit is not available', () => {
      const mockWithoutCircuit = createMockSceneManager(null);
      const managerWithoutCircuit = new CircuitEditionManager(mockWithoutCircuit as any);

      managerWithoutCircuit.saveComponentAction(componentId, 'edit', componentGroup);

      expect(mockWithoutCircuit.emit).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'component',
          action: 'edit',
          id: componentId,
          error: expect.any(Error),
          data: null,
        })
      );
    });

    it('should emit error event when component does not exist', () => {
      const invalidId = 'non-existent-id';

      manager.saveComponentAction(invalidId, 'edit', componentGroup);

      expect(mockSceneManager.emit).toHaveBeenCalledWith(
        'circuitElementAction',
        expect.objectContaining({
          type: 'component',
          action: 'edit',
          id: invalidId,
          error: expect.any(Error),
          data: null,
        })
      );
    });

    it('should handle delete action (currently returns early)', () => {
      manager.saveComponentAction(componentId, 'delete', componentGroup);

      // Delete is not yet implemented, should return without emitting
      expect(mockSceneManager.emit).not.toHaveBeenCalled();
    });

    it('should round position to nearest integer', () => {
      const component = circuit.getComponent(componentId);

      // Set position with floating point values
      componentGroup.position.set(10.7, 0, -15.3);
      manager.saveComponentAction(componentId, 'edit', componentGroup);

      expect(component!.position.x).toBe(11); // Rounded from 10.7
      expect(component!.position.y).toBe(15); // Rounded from 15.3
    });

    it('should round rotation to nearest integer degree', () => {
      const component = circuit.getComponent(componentId);

      // Set rotation to approximately 45° (-0.785 rad ≈ -45°)
      componentGroup.rotation.set(0, -0.785, 0);
      manager.saveComponentAction(componentId, 'edit', componentGroup);

      // Should round to nearest integer degree
      expect(component!.rotation.angle).toBe(45);
    });

    it('should handle multiple consecutive edits', () => {
      const component = circuit.getComponent(componentId);

      // First edit
      componentGroup.position.set(10, 0, -10);
      componentGroup.rotation.set(0, -Math.PI / 2, 0);
      manager.saveComponentAction(componentId, 'edit', componentGroup);

      expect(component!.position.x).toBe(10);
      expect(component!.rotation.angle).toBe(90);

      // Second edit
      componentGroup.position.set(20, 0, -20);
      componentGroup.rotation.set(0, -Math.PI, 0);
      manager.saveComponentAction(componentId, 'edit', componentGroup);

      expect(component!.position.x).toBe(20);
      expect(component!.rotation.angle).toBe(180);
    });
  });
});
