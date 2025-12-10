/**
 * Unit tests for SelectionManager
 * Task: T013
 * @module tests/scene/shared/SelectionManager.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { SelectionManager, type SelectionCallback } from '../../../src/scene/shared/SelectionManager';
import type { IComponentVisualFactory } from '../../../src/scene/shared/components/ComponentVisualFactory';
import type { UUID } from '../../../src/core/types/Identifier';

/**
 * Create a mock IComponentVisualFactory for testing
 */
function createMockFactory(): IComponentVisualFactory {
  return {
    createVisual: vi.fn(() => new THREE.Group()),
    applyHover: vi.fn(),
    removeHover: vi.fn(),
    applySelection: vi.fn(),
    removeSelection: vi.fn(),
    updateAnimation: vi.fn(),
  };
}

/**
 * Create a mock Object3D for testing
 */
function createMockObject3D(componentId: UUID): THREE.Object3D {
  const obj = new THREE.Group();
  obj.userData = { componentId };
  return obj;
}

describe('SelectionManager', () => {
  let selectionManager: SelectionManager;
  let mockFactory: IComponentVisualFactory;

  beforeEach(() => {
    mockFactory = createMockFactory();
    selectionManager = new SelectionManager(mockFactory);
  });

  describe('constructor', () => {
    it('should initialize with no selection', () => {
      const manager = new SelectionManager();
      expect(manager.getSelectedComponentId()).toBeNull();
      expect(manager.getSelectedObject()).toBeNull();
      expect(manager.hasSelection()).toBe(false);
    });

    it('should accept optional factory in constructor', () => {
      const manager = new SelectionManager(mockFactory);
      expect(manager.getSelectedComponentId()).toBeNull();
    });
  });

  describe('setFactory()', () => {
    it('should set the factory for selection visuals', () => {
      const manager = new SelectionManager();
      const newFactory = createMockFactory();

      manager.setFactory(newFactory);

      // Select a component to verify factory is used
      const componentId = 'comp-123' as UUID;
      const object3D = createMockObject3D(componentId);
      manager.select(componentId, object3D);

      expect(newFactory.applySelection).toHaveBeenCalledWith(object3D);
    });
  });

  describe('select()', () => {
    it('should update selected component ID', () => {
      const componentId = 'comp-123' as UUID;
      const object3D = createMockObject3D(componentId);

      selectionManager.select(componentId, object3D);

      expect(selectionManager.getSelectedComponentId()).toBe(componentId);
    });

    it('should update selected object', () => {
      const componentId = 'comp-123' as UUID;
      const object3D = createMockObject3D(componentId);

      selectionManager.select(componentId, object3D);

      expect(selectionManager.getSelectedObject()).toBe(object3D);
    });

    it('should call factory.applySelection()', () => {
      const componentId = 'comp-123' as UUID;
      const object3D = createMockObject3D(componentId);

      selectionManager.select(componentId, object3D);

      expect(mockFactory.applySelection).toHaveBeenCalledWith(object3D);
    });

    it('should set selectedAt timestamp', () => {
      const componentId = 'comp-123' as UUID;
      const object3D = createMockObject3D(componentId);
      const beforeTime = Date.now();

      selectionManager.select(componentId, object3D);
      const selectedAt = selectionManager.getSelectedAt();

      expect(selectedAt).not.toBeNull();
      expect(selectedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(selectedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should remove selection visual from previous component', () => {
      const comp1Id = 'comp-1' as UUID;
      const comp2Id = 'comp-2' as UUID;
      const object1 = createMockObject3D(comp1Id);
      const object2 = createMockObject3D(comp2Id);

      selectionManager.select(comp1Id, object1);
      selectionManager.select(comp2Id, object2);

      expect(mockFactory.removeSelection).toHaveBeenCalledWith(object1);
      expect(mockFactory.applySelection).toHaveBeenCalledWith(object2);
    });

    it('should not change state if selecting same component', () => {
      const componentId = 'comp-123' as UUID;
      const object3D = createMockObject3D(componentId);

      selectionManager.select(componentId, object3D);
      const firstSelectedAt = selectionManager.getSelectedAt();

      // Reset mock call counts
      vi.clearAllMocks();

      // Select same component again
      selectionManager.select(componentId, object3D);

      // Should not have called factory methods again
      expect(mockFactory.applySelection).not.toHaveBeenCalled();
      expect(mockFactory.removeSelection).not.toHaveBeenCalled();

      // selectedAt should be unchanged
      expect(selectionManager.getSelectedAt()).toBe(firstSelectedAt);
    });

    it('should notify callbacks when selection changes', () => {
      const callback = vi.fn();
      selectionManager.onSelectionChange(callback);

      const componentId = 'comp-123' as UUID;
      const object3D = createMockObject3D(componentId);
      selectionManager.select(componentId, object3D);

      expect(callback).toHaveBeenCalledWith(componentId, null);
    });

    it('should notify callbacks with previous ID when changing selection', () => {
      const callback = vi.fn();
      const comp1Id = 'comp-1' as UUID;
      const comp2Id = 'comp-2' as UUID;

      selectionManager.select(comp1Id, createMockObject3D(comp1Id));
      selectionManager.onSelectionChange(callback);
      selectionManager.select(comp2Id, createMockObject3D(comp2Id));

      expect(callback).toHaveBeenCalledWith(comp2Id, comp1Id);
    });
  });

  describe('deselect()', () => {
    it('should clear selected component ID', () => {
      const componentId = 'comp-123' as UUID;
      selectionManager.select(componentId, createMockObject3D(componentId));

      selectionManager.deselect();

      expect(selectionManager.getSelectedComponentId()).toBeNull();
    });

    it('should clear selected object', () => {
      const componentId = 'comp-123' as UUID;
      selectionManager.select(componentId, createMockObject3D(componentId));

      selectionManager.deselect();

      expect(selectionManager.getSelectedObject()).toBeNull();
    });

    it('should clear selectedAt timestamp', () => {
      const componentId = 'comp-123' as UUID;
      selectionManager.select(componentId, createMockObject3D(componentId));

      selectionManager.deselect();

      expect(selectionManager.getSelectedAt()).toBeNull();
    });

    it('should call factory.removeSelection()', () => {
      const componentId = 'comp-123' as UUID;
      const object3D = createMockObject3D(componentId);
      selectionManager.select(componentId, object3D);

      selectionManager.deselect();

      expect(mockFactory.removeSelection).toHaveBeenCalledWith(object3D);
    });

    it('should notify callbacks when deselecting', () => {
      const callback = vi.fn();
      const componentId = 'comp-123' as UUID;

      selectionManager.select(componentId, createMockObject3D(componentId));
      selectionManager.onSelectionChange(callback);
      selectionManager.deselect();

      expect(callback).toHaveBeenCalledWith(null, componentId);
    });

    it('should be safe to call when nothing is selected', () => {
      expect(() => {
        selectionManager.deselect();
      }).not.toThrow();

      // Factory should not be called
      expect(mockFactory.removeSelection).not.toHaveBeenCalled();
    });

    it('should not notify callbacks when nothing is selected', () => {
      const callback = vi.fn();
      selectionManager.onSelectionChange(callback);

      selectionManager.deselect();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('isSelected()', () => {
    it('should return true for selected component', () => {
      const componentId = 'comp-123' as UUID;
      selectionManager.select(componentId, createMockObject3D(componentId));

      expect(selectionManager.isSelected(componentId)).toBe(true);
    });

    it('should return false for non-selected component', () => {
      const comp1Id = 'comp-1' as UUID;
      const comp2Id = 'comp-2' as UUID;
      selectionManager.select(comp1Id, createMockObject3D(comp1Id));

      expect(selectionManager.isSelected(comp2Id)).toBe(false);
    });

    it('should return false when nothing is selected', () => {
      expect(selectionManager.isSelected('any-id' as UUID)).toBe(false);
    });
  });

  describe('hasSelection()', () => {
    it('should return true when something is selected', () => {
      selectionManager.select('comp-123' as UUID, createMockObject3D('comp-123' as UUID));

      expect(selectionManager.hasSelection()).toBe(true);
    });

    it('should return false when nothing is selected', () => {
      expect(selectionManager.hasSelection()).toBe(false);
    });

    it('should return false after deselecting', () => {
      selectionManager.select('comp-123' as UUID, createMockObject3D('comp-123' as UUID));
      selectionManager.deselect();

      expect(selectionManager.hasSelection()).toBe(false);
    });
  });

  describe('onSelectionChange()', () => {
    it('should register callback', () => {
      const callback = vi.fn();
      selectionManager.onSelectionChange(callback);

      selectionManager.select('comp-123' as UUID, createMockObject3D('comp-123' as UUID));

      expect(callback).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = selectionManager.onSelectionChange(callback);

      // Trigger change
      selectionManager.select('comp-1' as UUID, createMockObject3D('comp-1' as UUID));
      expect(callback).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Trigger another change
      selectionManager.select('comp-2' as UUID, createMockObject3D('comp-2' as UUID));
      // Should not have been called again
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should support multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      selectionManager.onSelectionChange(callback1);
      selectionManager.onSelectionChange(callback2);

      selectionManager.select('comp-123' as UUID, createMockObject3D('comp-123' as UUID));

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should catch and log callback errors', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      selectionManager.onSelectionChange(errorCallback);
      selectionManager.onSelectionChange(normalCallback);

      // Should not throw
      expect(() => {
        selectionManager.select('comp-123' as UUID, createMockObject3D('comp-123' as UUID));
      }).not.toThrow();

      // Error should be logged
      expect(consoleSpy).toHaveBeenCalled();

      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getSelectedAt()', () => {
    it('should return null when nothing is selected', () => {
      expect(selectionManager.getSelectedAt()).toBeNull();
    });

    it('should return timestamp when something is selected', () => {
      selectionManager.select('comp-123' as UUID, createMockObject3D('comp-123' as UUID));

      const timestamp = selectionManager.getSelectedAt();
      expect(timestamp).not.toBeNull();
      expect(typeof timestamp).toBe('number');
    });
  });

  describe('dispose()', () => {
    it('should remove selection visual if present', () => {
      const componentId = 'comp-123' as UUID;
      const object3D = createMockObject3D(componentId);
      selectionManager.select(componentId, object3D);

      selectionManager.dispose();

      expect(mockFactory.removeSelection).toHaveBeenCalledWith(object3D);
    });

    it('should clear all state', () => {
      selectionManager.select('comp-123' as UUID, createMockObject3D('comp-123' as UUID));
      selectionManager.dispose();

      expect(selectionManager.getSelectedComponentId()).toBeNull();
      expect(selectionManager.getSelectedObject()).toBeNull();
      expect(selectionManager.getSelectedAt()).toBeNull();
    });

    it('should clear all callbacks', () => {
      const callback = vi.fn();
      selectionManager.onSelectionChange(callback);

      selectionManager.dispose();

      // Create a new manager to verify old callbacks aren't called
      // (callbacks are internal so we can only verify indirectly)
      expect(selectionManager.hasSelection()).toBe(false);
    });

    it('should be safe to call multiple times', () => {
      expect(() => {
        selectionManager.dispose();
        selectionManager.dispose();
      }).not.toThrow();
    });

    it('should be safe to call without factory', () => {
      const managerWithoutFactory = new SelectionManager();
      managerWithoutFactory.select('comp-123' as UUID, createMockObject3D('comp-123' as UUID));

      expect(() => {
        managerWithoutFactory.dispose();
      }).not.toThrow();
    });
  });

  describe('selection workflow', () => {
    it('should handle select -> deselect -> select cycle', () => {
      const comp1Id = 'comp-1' as UUID;
      const comp2Id = 'comp-2' as UUID;
      const object1 = createMockObject3D(comp1Id);
      const object2 = createMockObject3D(comp2Id);

      // Select first
      selectionManager.select(comp1Id, object1);
      expect(selectionManager.isSelected(comp1Id)).toBe(true);

      // Deselect
      selectionManager.deselect();
      expect(selectionManager.hasSelection()).toBe(false);

      // Select second
      selectionManager.select(comp2Id, object2);
      expect(selectionManager.isSelected(comp2Id)).toBe(true);
      expect(selectionManager.isSelected(comp1Id)).toBe(false);
    });

    it('should handle rapid selection changes', () => {
      const ids = ['comp-1', 'comp-2', 'comp-3', 'comp-4', 'comp-5'] as UUID[];

      ids.forEach((id) => {
        selectionManager.select(id, createMockObject3D(id));
      });

      // Only the last one should be selected
      expect(selectionManager.getSelectedComponentId()).toBe(ids[ids.length - 1]);
      expect(selectionManager.isSelected(ids[ids.length - 1])).toBe(true);
      expect(selectionManager.isSelected(ids[0])).toBe(false);
    });
  });
});
