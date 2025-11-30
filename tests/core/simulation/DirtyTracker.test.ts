/**
 * Unit tests for DirtyTracker
 * @module tests/core/simulation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DirtyTracker } from '@/core/simulation/DirtyTracker.js';
import { generateUUID } from '@/core/types/Identifier.js';

describe('DirtyTracker', () => {
  let tracker: DirtyTracker;

  beforeEach(() => {
    tracker = new DirtyTracker();
  });

  describe('constructor', () => {
    it('should create empty tracker', () => {
      expect(tracker.hasDirtyElements()).toBe(false);
      expect(tracker.getDirtyComponentCount()).toBe(0);
      expect(tracker.getDirtyWireCount()).toBe(0);
      expect(tracker.getDirtyEnodeCount()).toBe(0);
    });
  });

  describe('markComponentDirty', () => {
    it('should mark a component as dirty', () => {
      const compId = generateUUID();

      tracker.markComponentDirty(compId);

      expect(tracker.hasDirtyElements()).toBe(true);
      expect(tracker.getDirtyComponentCount()).toBe(1);
    });

    it('should handle multiple different components', () => {
      const compId1 = generateUUID();
      const compId2 = generateUUID();

      tracker.markComponentDirty(compId1);
      tracker.markComponentDirty(compId2);

      expect(tracker.getDirtyComponentCount()).toBe(2);
    });

    it('should not duplicate same component', () => {
      const compId = generateUUID();

      tracker.markComponentDirty(compId);
      tracker.markComponentDirty(compId);
      tracker.markComponentDirty(compId);

      expect(tracker.getDirtyComponentCount()).toBe(1);
    });
  });

  describe('markWireDirty', () => {
    it('should mark a wire as dirty', () => {
      const wireId = generateUUID();

      tracker.markWireDirty(wireId);

      expect(tracker.hasDirtyElements()).toBe(true);
      expect(tracker.getDirtyWireCount()).toBe(1);
    });

    it('should handle multiple different wires', () => {
      const wireId1 = generateUUID();
      const wireId2 = generateUUID();

      tracker.markWireDirty(wireId1);
      tracker.markWireDirty(wireId2);

      expect(tracker.getDirtyWireCount()).toBe(2);
    });

    it('should not duplicate same wire', () => {
      const wireId = generateUUID();

      tracker.markWireDirty(wireId);
      tracker.markWireDirty(wireId);

      expect(tracker.getDirtyWireCount()).toBe(1);
    });
  });

  describe('markEnodeDirty', () => {
    it('should mark an enode as dirty', () => {
      const enodeId = generateUUID();

      tracker.markEnodeDirty(enodeId);

      expect(tracker.hasDirtyElements()).toBe(true);
      expect(tracker.getDirtyEnodeCount()).toBe(1);
    });

    it('should handle multiple different enodes', () => {
      const enodeId1 = generateUUID();
      const enodeId2 = generateUUID();

      tracker.markEnodeDirty(enodeId1);
      tracker.markEnodeDirty(enodeId2);

      expect(tracker.getDirtyEnodeCount()).toBe(2);
    });

    it('should not duplicate same enode', () => {
      const enodeId = generateUUID();

      tracker.markEnodeDirty(enodeId);
      tracker.markEnodeDirty(enodeId);

      expect(tracker.getDirtyEnodeCount()).toBe(1);
    });
  });

  describe('hasDirtyElements', () => {
    it('should return false when no elements are dirty', () => {
      expect(tracker.hasDirtyElements()).toBe(false);
    });

    it('should return true when component is dirty', () => {
      tracker.markComponentDirty(generateUUID());
      expect(tracker.hasDirtyElements()).toBe(true);
    });

    it('should return true when wire is dirty', () => {
      tracker.markWireDirty(generateUUID());
      expect(tracker.hasDirtyElements()).toBe(true);
    });

    it('should return true when enode is dirty', () => {
      tracker.markEnodeDirty(generateUUID());
      expect(tracker.hasDirtyElements()).toBe(true);
    });

    it('should return true when multiple types are dirty', () => {
      tracker.markComponentDirty(generateUUID());
      tracker.markWireDirty(generateUUID());
      tracker.markEnodeDirty(generateUUID());

      expect(tracker.hasDirtyElements()).toBe(true);
    });
  });

  describe('getDirtyElements', () => {
    it('should return empty sets when nothing is dirty', () => {
      const dirty = tracker.getDirtyElements();

      expect(dirty.components.size).toBe(0);
      expect(dirty.wires.size).toBe(0);
      expect(dirty.enodes.size).toBe(0);
    });

    it('should return dirty components', () => {
      const compId1 = generateUUID();
      const compId2 = generateUUID();

      tracker.markComponentDirty(compId1);
      tracker.markComponentDirty(compId2);

      const dirty = tracker.getDirtyElements();

      expect(dirty.components.size).toBe(2);
      expect(dirty.components.has(compId1)).toBe(true);
      expect(dirty.components.has(compId2)).toBe(true);
      expect(dirty.wires.size).toBe(0);
      expect(dirty.enodes.size).toBe(0);
    });

    it('should return dirty wires', () => {
      const wireId1 = generateUUID();
      const wireId2 = generateUUID();

      tracker.markWireDirty(wireId1);
      tracker.markWireDirty(wireId2);

      const dirty = tracker.getDirtyElements();

      expect(dirty.wires.size).toBe(2);
      expect(dirty.wires.has(wireId1)).toBe(true);
      expect(dirty.wires.has(wireId2)).toBe(true);
      expect(dirty.components.size).toBe(0);
      expect(dirty.enodes.size).toBe(0);
    });

    it('should return dirty enodes', () => {
      const enodeId1 = generateUUID();
      const enodeId2 = generateUUID();

      tracker.markEnodeDirty(enodeId1);
      tracker.markEnodeDirty(enodeId2);

      const dirty = tracker.getDirtyElements();

      expect(dirty.enodes.size).toBe(2);
      expect(dirty.enodes.has(enodeId1)).toBe(true);
      expect(dirty.enodes.has(enodeId2)).toBe(true);
      expect(dirty.components.size).toBe(0);
      expect(dirty.wires.size).toBe(0);
    });

    it('should return all dirty element types together', () => {
      const compId = generateUUID();
      const wireId = generateUUID();
      const enodeId = generateUUID();

      tracker.markComponentDirty(compId);
      tracker.markWireDirty(wireId);
      tracker.markEnodeDirty(enodeId);

      const dirty = tracker.getDirtyElements();

      expect(dirty.components.size).toBe(1);
      expect(dirty.components.has(compId)).toBe(true);
      expect(dirty.wires.size).toBe(1);
      expect(dirty.wires.has(wireId)).toBe(true);
      expect(dirty.enodes.size).toBe(1);
      expect(dirty.enodes.has(enodeId)).toBe(true);
    });

    it('should clear tracker after returning dirty elements', () => {
      tracker.markComponentDirty(generateUUID());
      tracker.markWireDirty(generateUUID());
      tracker.markEnodeDirty(generateUUID());

      expect(tracker.hasDirtyElements()).toBe(true);

      tracker.getDirtyElements();

      expect(tracker.hasDirtyElements()).toBe(false);
      expect(tracker.getDirtyComponentCount()).toBe(0);
      expect(tracker.getDirtyWireCount()).toBe(0);
      expect(tracker.getDirtyEnodeCount()).toBe(0);
    });

    it('should return new sets (not references to internal state)', () => {
      const compId = generateUUID();
      tracker.markComponentDirty(compId);

      const dirty1 = tracker.getDirtyElements();
      tracker.markComponentDirty(generateUUID());
      const dirty2 = tracker.getDirtyElements();

      // First result should not be affected by subsequent marks
      expect(dirty1.components.size).toBe(1);
      expect(dirty2.components.size).toBe(1);
      expect(dirty1.components).not.toBe(dirty2.components);
    });

    it('should be callable multiple times', () => {
      const compId = generateUUID();

      tracker.markComponentDirty(compId);
      const dirty1 = tracker.getDirtyElements();

      expect(dirty1.components.size).toBe(1);

      // Second call should return empty sets
      const dirty2 = tracker.getDirtyElements();

      expect(dirty2.components.size).toBe(0);
      expect(dirty2.wires.size).toBe(0);
      expect(dirty2.enodes.size).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all dirty markers', () => {
      tracker.markComponentDirty(generateUUID());
      tracker.markWireDirty(generateUUID());
      tracker.markEnodeDirty(generateUUID());

      expect(tracker.hasDirtyElements()).toBe(true);

      tracker.clear();

      expect(tracker.hasDirtyElements()).toBe(false);
      expect(tracker.getDirtyComponentCount()).toBe(0);
      expect(tracker.getDirtyWireCount()).toBe(0);
      expect(tracker.getDirtyEnodeCount()).toBe(0);
    });

    it('should work on empty tracker', () => {
      expect(() => tracker.clear()).not.toThrow();
      expect(tracker.hasDirtyElements()).toBe(false);
    });

    it('should allow marking after clear', () => {
      tracker.markComponentDirty(generateUUID());
      tracker.clear();

      const newCompId = generateUUID();
      tracker.markComponentDirty(newCompId);

      expect(tracker.getDirtyComponentCount()).toBe(1);
    });
  });

  describe('count methods', () => {
    it('should return accurate counts', () => {
      const compId1 = generateUUID();
      const compId2 = generateUUID();
      const wireId = generateUUID();
      const enodeId1 = generateUUID();
      const enodeId2 = generateUUID();
      const enodeId3 = generateUUID();

      tracker.markComponentDirty(compId1);
      tracker.markComponentDirty(compId2);
      tracker.markWireDirty(wireId);
      tracker.markEnodeDirty(enodeId1);
      tracker.markEnodeDirty(enodeId2);
      tracker.markEnodeDirty(enodeId3);

      expect(tracker.getDirtyComponentCount()).toBe(2);
      expect(tracker.getDirtyWireCount()).toBe(1);
      expect(tracker.getDirtyEnodeCount()).toBe(3);
    });

    it('should update after clear', () => {
      tracker.markComponentDirty(generateUUID());
      expect(tracker.getDirtyComponentCount()).toBe(1);

      tracker.clear();
      expect(tracker.getDirtyComponentCount()).toBe(0);
    });
  });

  describe('readonly sets', () => {
    it('should return readonly sets from getDirtyElements', () => {
      const compId = generateUUID();
      tracker.markComponentDirty(compId);

      const dirty = tracker.getDirtyElements();

      // Sets are typed as ReadonlySet (compile-time check)
      expect(dirty.components).toBeInstanceOf(Set);
      expect(dirty.wires).toBeInstanceOf(Set);
      expect(dirty.enodes).toBeInstanceOf(Set);
    });
  });

  describe('stress test', () => {
    it('should handle many dirty elements efficiently', () => {
      const componentIds = Array.from({ length: 1000 }, () => generateUUID());
      const wireIds = Array.from({ length: 500 }, () => generateUUID());
      const enodeIds = Array.from({ length: 750 }, () => generateUUID());

      componentIds.forEach(id => tracker.markComponentDirty(id));
      wireIds.forEach(id => tracker.markWireDirty(id));
      enodeIds.forEach(id => tracker.markEnodeDirty(id));

      expect(tracker.getDirtyComponentCount()).toBe(1000);
      expect(tracker.getDirtyWireCount()).toBe(500);
      expect(tracker.getDirtyEnodeCount()).toBe(750);

      const dirty = tracker.getDirtyElements();

      expect(dirty.components.size).toBe(1000);
      expect(dirty.wires.size).toBe(500);
      expect(dirty.enodes.size).toBe(750);

      // Verify all IDs are present
      componentIds.forEach(id => expect(dirty.components.has(id)).toBe(true));
      wireIds.forEach(id => expect(dirty.wires.has(id)).toBe(true));
      enodeIds.forEach(id => expect(dirty.enodes.has(id)).toBe(true));

      // Tracker should be cleared
      expect(tracker.hasDirtyElements()).toBe(false);
    });
  });
});
