/**
 * Unit tests for Tool System Architecture
 * Tests: T060-T063
 * @module tests/scene/static/tools/ToolSystem.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitController } from '../../../../src/scene/static/CircuitController';
import type { ToolType } from '../../../../src/scene/shared/types';
import { FactoryRegistry, DefaultVisualFactory } from '../../../../src/scene/shared/components';

// Mock Three.js - use importOriginal to get real THREE classes
// This avoids having to mock everything, we just use the real THREE.js
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return actual; // Use real THREE.js - no mocking needed
});

describe('Tool System Architecture (T060-T063)', () => {
  let controller: CircuitController;
  let factoryRegistry: FactoryRegistry;
  let containerElement: HTMLElement;

  beforeEach(() => {
    factoryRegistry = new FactoryRegistry(new DefaultVisualFactory());
    controller = new CircuitController(factoryRegistry);

    // Create mock container
    containerElement = document.createElement('div');
    containerElement.style.width = '800px';
    containerElement.style.height = '600px';
    document.body.appendChild(containerElement);

    controller.initialize(containerElement);
  });

  describe('T060: Basic tool system methods', () => {
    it('should have setEditMode() method', () => {
      expect(typeof controller.setEditMode).toBe('function');
    });

    it('should have setActiveTool() method', () => {
      expect(typeof controller.setActiveTool).toBe('function');
    });

    it('should have getActiveTool() method', () => {
      expect(typeof controller.getActiveTool).toBe('function');
    });

    it('should enable edit mode when setEditMode(true) is called', () => {
      controller.setEditMode(true);
      // Edit mode is enabled, should be able to set a tool
      expect(() => controller.setActiveTool('position')).not.toThrow();
    });

    it('should disable edit mode when setEditMode(false) is called', () => {
      controller.setEditMode(true);
      controller.setEditMode(false);
      // Edit mode disabled, setting tool should throw
      expect(() => controller.setActiveTool('position')).toThrow('Edit mode must be enabled');
    });
  });

  describe('T061: Single active tool constraint', () => {
    beforeEach(() => {
      controller.setEditMode(true);
    });

    it('should allow activating a tool when no tool is active', () => {
      expect(controller.getActiveTool()).toBeNull();
      controller.setActiveTool('position');
      expect(controller.getActiveTool()).toBe('position');
    });

    it('should only have one tool active at a time', () => {
      controller.setActiveTool('position');
      expect(controller.getActiveTool()).toBe('position');

      controller.setActiveTool('addComponent');
      expect(controller.getActiveTool()).toBe('addComponent');
      expect(controller.getActiveTool()).not.toBe('position');
    });

    it('should deactivate previous tool when switching to a new tool', () => {
      const toolDeactivatedSpy = vi.fn();
      controller.on('toolDeactivated', toolDeactivatedSpy);

      controller.setActiveTool('position');
      controller.setActiveTool('wire');

      expect(toolDeactivatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ toolType: 'position' })
      );
    });

    it('should support all five tool types', () => {
      const tools: ToolType[] = ['position', 'addComponent', 'wire', 'branchingPoint', 'delete'];

      tools.forEach((toolType) => {
        controller.setActiveTool(toolType);
        expect(controller.getActiveTool()).toBe(toolType);
      });
    });
  });

  describe('T062: Tool state management', () => {
    it('should reset tool state when edit mode is disabled', () => {
      controller.setEditMode(true);
      controller.setActiveTool('position');
      expect(controller.getActiveTool()).toBe('position');

      controller.setEditMode(false);
      expect(controller.getActiveTool()).toBeNull();
    });

    it('should deactivate active tool when edit mode is disabled', () => {
      const toolDeactivatedSpy = vi.fn();
      controller.on('toolDeactivated', toolDeactivatedSpy);

      controller.setEditMode(true);
      controller.setActiveTool('wire');
      controller.setEditMode(false);

      expect(toolDeactivatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ toolType: 'wire' })
      );
    });

    it('should clear tool state when switching tools', () => {
      controller.setEditMode(true);

      // Activate first tool
      controller.setActiveTool('addComponent');

      // Switch to second tool - should clear first tool's state
      controller.setActiveTool('delete');

      // Tool state should be reset (tested implicitly by successful switch)
      expect(controller.getActiveTool()).toBe('delete');
    });
  });

  describe('T063: Tool event emission', () => {
    beforeEach(() => {
      controller.setEditMode(true);
    });

    it('should emit toolActivated event when a tool is activated', () => {
      const toolActivatedSpy = vi.fn();
      controller.on('toolActivated', toolActivatedSpy);

      controller.setActiveTool('build');

      expect(toolActivatedSpy).toHaveBeenCalledWith({
        toolType: 'build',
      });
    });

    it('should emit toolDeactivated event when a tool is deactivated', () => {
      const toolDeactivatedSpy = vi.fn();
      controller.on('toolDeactivated', toolDeactivatedSpy);

      controller.setActiveTool('build');
      controller.setActiveTool('addComponent');

      expect(toolDeactivatedSpy).toHaveBeenCalledWith({
        toolType: 'build',
      });
    });

    it('should emit cursorChangeRequested event when tool is activated', () => {
      const cursorChangeSpy = vi.fn();
      controller.on('cursorChangeRequested', cursorChangeSpy);

      controller.setActiveTool('build');

      expect(cursorChangeSpy).toHaveBeenCalled();
    });

    it('should emit events in correct order: deactivate old, activate new', () => {
      const events: string[] = [];

      controller.on('toolDeactivated', () => events.push('deactivated'));
      controller.on('toolActivated', () => events.push('activated'));

      controller.setActiveTool('build');
      events.length = 0; // Clear initial activation

      controller.setActiveTool('addComponent');

      expect(events).toEqual(['deactivated', 'activated']);
    });

    it('should handle multiple event listeners for tool events', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      controller.on('toolActivated', listener1);
      controller.on('toolActivated', listener2);

      controller.setActiveTool('build');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should throw error when trying to activate tool without edit mode', () => {
      expect(() => controller.setActiveTool('position')).toThrow('Edit mode must be enabled');
    });

    it('should throw error when trying to use tool methods before initialization', () => {
      const uninitializedManager = new CircuitController(factoryRegistry);

      expect(() => uninitializedManager.setEditMode(true)).toThrow('not initialized');
    });
  });
});
