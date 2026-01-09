/**
 * Unit tests for DirtyTracker class
 *
 * Tests dirty tracking functionality:
 * - Marking components, wires, and enodes as dirty
 * - Retrieving and clearing dirty elements
 * - Bulk operations
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { DirtyTracker } from 'simple-circuit-engine/core';

describe('DirtyTracker', () => {
  let tracker: DirtyTracker;

  beforeEach(() => {
    tracker = new DirtyTracker();
  });

  describe('constructor', () => {
    it('should create an empty dirty tracker', () => {
      const tracker = new DirtyTracker();
      expect(tracker).toBeDefined();
      expect(tracker.hasDirtyElements()).toBe(false);
      expect(tracker.getDirtyComponentCount()).toBe(0);
      expect(tracker.getDirtyWireCount()).toBe(0);
      expect(tracker.getDirtyEnodeCount()).toBe(0);
    });
  });

  describe('markComponentDirty()', () => {
    it('should mark a component as dirty', () => {
      tracker.markComponentDirty('comp-1');

      expect(tracker.hasDirtyElements()).toBe(true);
      expect(tracker.getDirtyComponentCount()).toBe(1);
    });

    it('should mark multiple components as dirty', () => {
      tracker.markComponentDirty('comp-1');
      tracker.markComponentDirty('comp-2');
      tracker.markComponentDirty('comp-3');

      expect(tracker.getDirtyComponentCount()).toBe(3);
    });

    it('should not duplicate same component ID', () => {
      tracker.markComponentDirty('comp-1');
      tracker.markComponentDirty('comp-1');
      tracker.markComponentDirty('comp-1');

      expect(tracker.getDirtyComponentCount()).toBe(1);
    });
  });

  describe('markWireDirty()', () => {
    it('should mark a wire as dirty', () => {
      tracker.markWireDirty('wire-1');

      expect(tracker.hasDirtyElements()).toBe(true);
      expect(tracker.getDirtyWireCount()).toBe(1);
    });

    it('should mark multiple wires as dirty', () => {
      tracker.markWireDirty('wire-1');
      tracker.markWireDirty('wire-2');
      tracker.markWireDirty('wire-3');

      expect(tracker.getDirtyWireCount()).toBe(3);
    });

    it('should not duplicate same wire ID', () => {
      tracker.markWireDirty('wire-1');
      tracker.markWireDirty('wire-1');

      expect(tracker.getDirtyWireCount()).toBe(1);
    });
  });

  describe('markEnodeDirty()', () => {
    it('should mark an enode as dirty', () => {
      tracker.markEnodeDirty('enode-1');

      expect(tracker.hasDirtyElements()).toBe(true);
      expect(tracker.getDirtyEnodeCount()).toBe(1);
    });

    it('should mark multiple enodes as dirty', () => {
      tracker.markEnodeDirty('enode-1');
      tracker.markEnodeDirty('enode-2');
      tracker.markEnodeDirty('enode-3');

      expect(tracker.getDirtyEnodeCount()).toBe(3);
    });

    it('should not duplicate same enode ID', () => {
      tracker.markEnodeDirty('enode-1');
      tracker.markEnodeDirty('enode-1');

      expect(tracker.getDirtyEnodeCount()).toBe(1);
    });
  });

  describe('setDirtyComponents()', () => {
    it('should set the entire set of dirty components', () => {
      const components = new Set(['comp-1', 'comp-2', 'comp-3']);
      tracker.setDirtyComponents(components);

      expect(tracker.getDirtyComponentCount()).toBe(3);
    });

    it('should replace existing dirty components', () => {
      tracker.markComponentDirty('comp-1');
      tracker.markComponentDirty('comp-2');

      const components = new Set(['comp-3', 'comp-4']);
      tracker.setDirtyComponents(components);

      expect(tracker.getDirtyComponentCount()).toBe(2);
      const dirty = tracker.getDirtyElements();
      expect(dirty.components.has('comp-1')).toBe(false);
      expect(dirty.components.has('comp-3')).toBe(true);
      expect(dirty.components.has('comp-4')).toBe(true);
    });

    it('should handle empty set', () => {
      tracker.markComponentDirty('comp-1');
      tracker.setDirtyComponents(new Set());

      expect(tracker.getDirtyComponentCount()).toBe(0);
    });
  });

  describe('setDirtyWires()', () => {
    it('should set the entire set of dirty wires', () => {
      const wires = new Set(['wire-1', 'wire-2', 'wire-3']);
      tracker.setDirtyWires(wires);

      expect(tracker.getDirtyWireCount()).toBe(3);
    });

    it('should replace existing dirty wires', () => {
      tracker.markWireDirty('wire-1');
      tracker.markWireDirty('wire-2');

      const wires = new Set(['wire-3', 'wire-4']);
      tracker.setDirtyWires(wires);

      expect(tracker.getDirtyWireCount()).toBe(2);
    });
  });

  describe('setDirtyEnodes()', () => {
    it('should set the entire set of dirty enodes', () => {
      const enodes = new Set(['enode-1', 'enode-2', 'enode-3']);
      tracker.setDirtyEnodes(enodes);

      expect(tracker.getDirtyEnodeCount()).toBe(3);
    });

    it('should replace existing dirty enodes', () => {
      tracker.markEnodeDirty('enode-1');
      tracker.markEnodeDirty('enode-2');

      const enodes = new Set(['enode-3', 'enode-4']);
      tracker.setDirtyEnodes(enodes);

      expect(tracker.getDirtyEnodeCount()).toBe(2);
    });
  });

  describe('hasDirtyElements()', () => {
    it('should return false when no elements are dirty', () => {
      expect(tracker.hasDirtyElements()).toBe(false);
    });

    it('should return true when a component is dirty', () => {
      tracker.markComponentDirty('comp-1');
      expect(tracker.hasDirtyElements()).toBe(true);
    });

    it('should return true when a wire is dirty', () => {
      tracker.markWireDirty('wire-1');
      expect(tracker.hasDirtyElements()).toBe(true);
    });

    it('should return true when an enode is dirty', () => {
      tracker.markEnodeDirty('enode-1');
      expect(tracker.hasDirtyElements()).toBe(true);
    });

    it('should return true when multiple element types are dirty', () => {
      tracker.markComponentDirty('comp-1');
      tracker.markWireDirty('wire-1');
      tracker.markEnodeDirty('enode-1');
      expect(tracker.hasDirtyElements()).toBe(true);
    });

    it('should return false after clearing', () => {
      tracker.markComponentDirty('comp-1');
      tracker.clear();
      expect(tracker.hasDirtyElements()).toBe(false);
    });
  });

  describe('getDirtyElements()', () => {
    it('should return empty sets when no elements are dirty', () => {
      const dirty = tracker.getDirtyElements();

      expect(dirty.components.size).toBe(0);
      expect(dirty.wires.size).toBe(0);
      expect(dirty.enodes.size).toBe(0);
    });

    it('should return all dirty components', () => {
      tracker.markComponentDirty('comp-1');
      tracker.markComponentDirty('comp-2');
      tracker.markComponentDirty('comp-3');

      const dirty = tracker.getDirtyElements();

      expect(dirty.components.size).toBe(3);
      expect(dirty.components.has('comp-1')).toBe(true);
      expect(dirty.components.has('comp-2')).toBe(true);
      expect(dirty.components.has('comp-3')).toBe(true);
    });

    it('should return all dirty wires', () => {
      tracker.markWireDirty('wire-1');
      tracker.markWireDirty('wire-2');

      const dirty = tracker.getDirtyElements();

      expect(dirty.wires.size).toBe(2);
      expect(dirty.wires.has('wire-1')).toBe(true);
      expect(dirty.wires.has('wire-2')).toBe(true);
    });

    it('should return all dirty enodes', () => {
      tracker.markEnodeDirty('enode-1');
      tracker.markEnodeDirty('enode-2');

      const dirty = tracker.getDirtyElements();

      expect(dirty.enodes.size).toBe(2);
      expect(dirty.enodes.has('enode-1')).toBe(true);
      expect(dirty.enodes.has('enode-2')).toBe(true);
    });

    it('should return all dirty elements when mixed types', () => {
      tracker.markComponentDirty('comp-1');
      tracker.markWireDirty('wire-1');
      tracker.markEnodeDirty('enode-1');

      const dirty = tracker.getDirtyElements();

      expect(dirty.components.size).toBe(1);
      expect(dirty.wires.size).toBe(1);
      expect(dirty.enodes.size).toBe(1);
      expect(dirty.components.has('comp-1')).toBe(true);
      expect(dirty.wires.has('wire-1')).toBe(true);
      expect(dirty.enodes.has('enode-1')).toBe(true);
    });

    it('should clear tracker after getting dirty elements', () => {
      tracker.markComponentDirty('comp-1');
      tracker.markWireDirty('wire-1');
      tracker.markEnodeDirty('enode-1');

      tracker.getDirtyElements();

      expect(tracker.hasDirtyElements()).toBe(false);
      expect(tracker.getDirtyComponentCount()).toBe(0);
      expect(tracker.getDirtyWireCount()).toBe(0);
      expect(tracker.getDirtyEnodeCount()).toBe(0);
    });

    it('should return immutable sets (readonly)', () => {
      tracker.markComponentDirty('comp-1');
      const dirty = tracker.getDirtyElements();

      // TypeScript should enforce readonly, but verify sets are returned
      expect(dirty.components).toBeInstanceOf(Set);
      expect(dirty.wires).toBeInstanceOf(Set);
      expect(dirty.enodes).toBeInstanceOf(Set);
    });

    it('should return independent copies on successive calls', () => {
      tracker.markComponentDirty('comp-1');
      const dirty1 = tracker.getDirtyElements();

      tracker.markComponentDirty('comp-2');
      const dirty2 = tracker.getDirtyElements();

      expect(dirty1.components.has('comp-1')).toBe(true);
      expect(dirty1.components.has('comp-2')).toBe(false);
      expect(dirty2.components.has('comp-1')).toBe(false);
      expect(dirty2.components.has('comp-2')).toBe(true);
    });
  });

  describe('clear()', () => {
    it('should clear all dirty elements', () => {
      tracker.markComponentDirty('comp-1');
      tracker.markWireDirty('wire-1');
      tracker.markEnodeDirty('enode-1');

      tracker.clear();

      expect(tracker.hasDirtyElements()).toBe(false);
      expect(tracker.getDirtyComponentCount()).toBe(0);
      expect(tracker.getDirtyWireCount()).toBe(0);
      expect(tracker.getDirtyEnodeCount()).toBe(0);
    });

    it('should allow marking elements after clear', () => {
      tracker.markComponentDirty('comp-1');
      tracker.clear();
      tracker.markComponentDirty('comp-2');

      expect(tracker.getDirtyComponentCount()).toBe(1);
      expect(tracker.getDirtyElements().components.has('comp-2')).toBe(true);
    });
  });

  describe('count methods', () => {
    it('should return accurate component count', () => {
      expect(tracker.getDirtyComponentCount()).toBe(0);

      tracker.markComponentDirty('comp-1');
      expect(tracker.getDirtyComponentCount()).toBe(1);

      tracker.markComponentDirty('comp-2');
      tracker.markComponentDirty('comp-3');
      expect(tracker.getDirtyComponentCount()).toBe(3);
    });

    it('should return accurate wire count', () => {
      expect(tracker.getDirtyWireCount()).toBe(0);

      tracker.markWireDirty('wire-1');
      expect(tracker.getDirtyWireCount()).toBe(1);

      tracker.markWireDirty('wire-2');
      expect(tracker.getDirtyWireCount()).toBe(2);
    });

    it('should return accurate enode count', () => {
      expect(tracker.getDirtyEnodeCount()).toBe(0);

      tracker.markEnodeDirty('enode-1');
      expect(tracker.getDirtyEnodeCount()).toBe(1);

      tracker.markEnodeDirty('enode-2');
      expect(tracker.getDirtyEnodeCount()).toBe(2);
    });

    it('should not affect other counters', () => {
      tracker.markComponentDirty('comp-1');
      tracker.markWireDirty('wire-1');

      expect(tracker.getDirtyComponentCount()).toBe(1);
      expect(tracker.getDirtyWireCount()).toBe(1);
      expect(tracker.getDirtyEnodeCount()).toBe(0);
    });
  });

  describe('performance', () => {
    it('should handle large number of dirty elements efficiently', () => {
      const startTime = Date.now();

      // Mark 1000 components, wires, and enodes
      for (let i = 0; i < 1000; i++) {
        tracker.markComponentDirty(`comp-${i}`);
        tracker.markWireDirty(`wire-${i}`);
        tracker.markEnodeDirty(`enode-${i}`);
      }

      const markTime = Date.now() - startTime;
      expect(markTime).toBeLessThan(1000); // Should mark in < 1 second

      expect(tracker.getDirtyComponentCount()).toBe(1000);
      expect(tracker.getDirtyWireCount()).toBe(1000);
      expect(tracker.getDirtyEnodeCount()).toBe(1000);

      // Get dirty elements should be fast
      const getStartTime = Date.now();
      const dirty = tracker.getDirtyElements();
      const getTime = Date.now() - getStartTime;

      expect(getTime).toBeLessThan(100); // Should retrieve in < 100ms
      expect(dirty.components.size).toBe(1000);
      expect(dirty.wires.size).toBe(1000);
      expect(dirty.enodes.size).toBe(1000);
    });
  });
});
