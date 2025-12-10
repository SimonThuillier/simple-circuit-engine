/**
 * Unit tests for Tool System Architecture
 * Tests: T060-T063
 * @module tests/scene/static/tools/ToolSystem.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitSceneManager } from '../../../../src/scene/static/CircuitSceneManager';
import { FactoryRegistry } from '../../../../src/scene/shared/FactoryRegistry';
import type { ToolType } from '../../../../src/scene/shared/types';
import { DefaultVisualFactory } from '../../../../src/scene';

// Mock Three.js - use importOriginal to get real THREE classes
// This avoids having to mock everything, we just use the real THREE.js
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return actual; // Use real THREE.js - no mocking needed
});

describe('Tool System Architecture (T060-T063)', () => {
  let sceneManager: CircuitSceneManager;
  let factoryRegistry: FactoryRegistry;
  let containerElement: HTMLElement;

  beforeEach(() => {
    factoryRegistry = new FactoryRegistry(new DefaultVisualFactory());
    sceneManager = new CircuitSceneManager(factoryRegistry);

    // Create mock container
    containerElement = document.createElement('div');
    containerElement.style.width = '800px';
    containerElement.style.height = '600px';
    document.body.appendChild(containerElement);

    sceneManager.initialize(containerElement);
  });

  describe('T060: Basic tool system methods', () => {
    it('should have setEditMode() method', () => {
      expect(typeof sceneManager.setEditMode).toBe('function');
    });

    it('should have setActiveTool() method', () => {
      expect(typeof sceneManager.setActiveTool).toBe('function');
    });

    it('should have getActiveTool() method', () => {
      expect(typeof sceneManager.getActiveTool).toBe('function');
    });

    it('should enable edit mode when setEditMode(true) is called', () => {
      sceneManager.setEditMode(true);
      // Edit mode is enabled, should be able to set a tool
      expect(() => sceneManager.setActiveTool('position')).not.toThrow();
    });

    it('should disable edit mode when setEditMode(false) is called', () => {
      sceneManager.setEditMode(true);
      sceneManager.setEditMode(false);
      // Edit mode disabled, setting tool should throw
      expect(() => sceneManager.setActiveTool('position')).toThrow('Edit mode must be enabled');
    });
  });

  describe('T061: Single active tool constraint', () => {
    beforeEach(() => {
      sceneManager.setEditMode(true);
    });

    it('should allow activating a tool when no tool is active', () => {
      expect(sceneManager.getActiveTool()).toBeNull();
      sceneManager.setActiveTool('position');
      expect(sceneManager.getActiveTool()).toBe('position');
    });

    it('should only have one tool active at a time', () => {
      sceneManager.setActiveTool('position');
      expect(sceneManager.getActiveTool()).toBe('position');

      sceneManager.setActiveTool('addComponent');
      expect(sceneManager.getActiveTool()).toBe('addComponent');
      expect(sceneManager.getActiveTool()).not.toBe('position');
    });

    it('should deactivate previous tool when switching to a new tool', () => {
      const toolDeactivatedSpy = vi.fn();
      sceneManager.on('toolDeactivated', toolDeactivatedSpy);

      sceneManager.setActiveTool('position');
      sceneManager.setActiveTool('wire');

      expect(toolDeactivatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ toolType: 'position' })
      );
    });

    it('should support all five tool types', () => {
      const tools: ToolType[] = ['position', 'addComponent', 'wire', 'branchingPoint', 'delete'];

      tools.forEach((toolType) => {
        sceneManager.setActiveTool(toolType);
        expect(sceneManager.getActiveTool()).toBe(toolType);
      });
    });
  });

  describe('T062: Tool state management', () => {
    it('should reset tool state when edit mode is disabled', () => {
      sceneManager.setEditMode(true);
      sceneManager.setActiveTool('position');
      expect(sceneManager.getActiveTool()).toBe('position');

      sceneManager.setEditMode(false);
      expect(sceneManager.getActiveTool()).toBeNull();
    });

    it('should deactivate active tool when edit mode is disabled', () => {
      const toolDeactivatedSpy = vi.fn();
      sceneManager.on('toolDeactivated', toolDeactivatedSpy);

      sceneManager.setEditMode(true);
      sceneManager.setActiveTool('wire');
      sceneManager.setEditMode(false);

      expect(toolDeactivatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ toolType: 'wire' })
      );
    });

    it('should clear tool state when switching tools', () => {
      sceneManager.setEditMode(true);

      // Activate first tool
      sceneManager.setActiveTool('addComponent');

      // Switch to second tool - should clear first tool's state
      sceneManager.setActiveTool('delete');

      // Tool state should be reset (tested implicitly by successful switch)
      expect(sceneManager.getActiveTool()).toBe('delete');
    });
  });

  describe('T063: Tool event emission', () => {
    beforeEach(() => {
      sceneManager.setEditMode(true);
    });

    it('should emit toolActivated event when a tool is activated', () => {
      const toolActivatedSpy = vi.fn();
      sceneManager.on('toolActivated', toolActivatedSpy);

      sceneManager.setActiveTool('position');

      expect(toolActivatedSpy).toHaveBeenCalledWith({
        toolType: 'position',
      });
    });

    it('should emit toolDeactivated event when a tool is deactivated', () => {
      const toolDeactivatedSpy = vi.fn();
      sceneManager.on('toolDeactivated', toolDeactivatedSpy);

      sceneManager.setActiveTool('position');
      sceneManager.setActiveTool('wire');

      expect(toolDeactivatedSpy).toHaveBeenCalledWith({
        toolType: 'position',
      });
    });

    it('should emit cursorChangeRequested event when tool is activated', () => {
      const cursorChangeSpy = vi.fn();
      sceneManager.on('cursorChangeRequested', cursorChangeSpy);

      sceneManager.setActiveTool('position');

      expect(cursorChangeSpy).toHaveBeenCalled();
    });

    it('should emit events in correct order: deactivate old, activate new', () => {
      const events: string[] = [];

      sceneManager.on('toolDeactivated', () => events.push('deactivated'));
      sceneManager.on('toolActivated', () => events.push('activated'));

      sceneManager.setActiveTool('position');
      events.length = 0; // Clear initial activation

      sceneManager.setActiveTool('wire');

      expect(events).toEqual(['deactivated', 'activated']);
    });

    it('should handle multiple event listeners for tool events', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      sceneManager.on('toolActivated', listener1);
      sceneManager.on('toolActivated', listener2);

      sceneManager.setActiveTool('delete');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should throw error when trying to activate tool without edit mode', () => {
      expect(() => sceneManager.setActiveTool('position')).toThrow('Edit mode must be enabled');
    });

    it('should throw error when trying to use tool methods before initialization', () => {
      const uninitializedManager = new CircuitSceneManager(factoryRegistry);

      expect(() => uninitializedManager.setEditMode(true)).toThrow('not initialized');
    });
  });
});
