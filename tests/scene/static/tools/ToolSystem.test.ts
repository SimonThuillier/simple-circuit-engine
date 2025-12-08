/**
 * Unit tests for Tool System Architecture
 * Tests: T060-T063
 * @module tests/scene/static/tools/ToolSystem.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitSceneManager } from '../../../../src/scene/static/CircuitSceneManager';
import { FactoryRegistry } from '../../../../src/scene/shared/FactoryRegistry';
import { createDefaultFactory } from '../../../../src/scene/shared/ComponentVisualFactory';
import type { ToolType } from '../../../../src/scene/shared/types';

// Mock Three.js
vi.mock('three', () => {
  const mockGeometry = {
    dispose: vi.fn(),
  };

  const mockMaterial = {
    dispose: vi.fn(),
  };

  class MockScene {
    children: any[] = [];
    background = null;
    name = '';
    add = vi.fn((obj) => this.children.push(obj));
    remove = vi.fn((obj) => {
      const index = this.children.indexOf(obj);
      if (index > -1) this.children.splice(index, 1);
    });
    traverse = vi.fn((callback) => {
      const traverseRecursive = (obj: any) => {
        callback(obj);
        if (obj.children) {
          obj.children.forEach(traverseRecursive);
        }
      };
      this.children.forEach(traverseRecursive);
    });
  }

  class MockPerspectiveCamera {
    position = { set: vi.fn(), x: 0, y: 0, z: 0 };
    lookAt = vi.fn();
    aspect = 1;
    updateProjectionMatrix = vi.fn();
  }

  class MockVector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    copy(v: MockVector3) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }
  }

  class MockColor {
    constructor(public value: number) {}
  }

  class MockMesh {
    geometry = mockGeometry;
    material = mockMaterial;
    position = new MockVector3();
    userData: any = {};
  }

  class MockLine {
    geometry = mockGeometry;
    material = mockMaterial;
    userData: any = {};
  }

  class MockGridHelper {
    geometry = mockGeometry;
  }

  class MockAmbientLight {
    constructor(
      public color: number,
      public intensity: number
    ) {}
  }

  class MockDirectionalLight {
    position = new MockVector3();
    constructor(
      public color: number,
      public intensity: number
    ) {}
  }

  return {
    Scene: MockScene,
    PerspectiveCamera: MockPerspectiveCamera,
    Vector3: MockVector3,
    Color: MockColor,
    Mesh: MockMesh,
    Line: MockLine,
    GridHelper: MockGridHelper,
    Object3D: class MockObject3D {},
    AmbientLight: MockAmbientLight,
    DirectionalLight: MockDirectionalLight,
  };
});

describe('Tool System Architecture (T060-T063)', () => {
  let sceneManager: CircuitSceneManager;
  let factoryRegistry: FactoryRegistry;
  let containerElement: HTMLElement;

  beforeEach(() => {
    factoryRegistry = new FactoryRegistry(createDefaultFactory());
    sceneManager = new CircuitSceneManager(factoryRegistry);

    // Create mock container
    containerElement = document.createElement('div');
    containerElement.style.width = '800px';
    containerElement.style.height = '600px';
    document.body.appendChild(containerElement);

    sceneManager.initialize(containerElement);
  });

  afterEach(() => {
    if (containerElement.parentNode) {
      containerElement.parentNode.removeChild(containerElement);
    }
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
      expect(() => sceneManager.setActiveTool('select')).not.toThrow();
    });

    it('should disable edit mode when setEditMode(false) is called', () => {
      sceneManager.setEditMode(true);
      sceneManager.setEditMode(false);
      // Edit mode disabled, setting tool should throw
      expect(() => sceneManager.setActiveTool('select')).toThrow('Edit mode must be enabled');
    });
  });

  describe('T061: Single active tool constraint', () => {
    beforeEach(() => {
      sceneManager.setEditMode(true);
    });

    it('should allow activating a tool when no tool is active', () => {
      expect(sceneManager.getActiveTool()).toBeNull();
      sceneManager.setActiveTool('select');
      expect(sceneManager.getActiveTool()).toBe('select');
    });

    it('should only have one tool active at a time', () => {
      sceneManager.setActiveTool('select');
      expect(sceneManager.getActiveTool()).toBe('select');

      sceneManager.setActiveTool('placeComponent');
      expect(sceneManager.getActiveTool()).toBe('placeComponent');
      expect(sceneManager.getActiveTool()).not.toBe('select');
    });

    it('should deactivate previous tool when switching to a new tool', () => {
      const toolDeactivatedSpy = vi.fn();
      sceneManager.on('toolDeactivated', toolDeactivatedSpy);

      sceneManager.setActiveTool('select');
      sceneManager.setActiveTool('wire');

      expect(toolDeactivatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ toolType: 'select' })
      );
    });

    it('should support all five tool types', () => {
      const tools: ToolType[] = ['select', 'placeComponent', 'wire', 'branchingPoint', 'delete'];

      tools.forEach((toolType) => {
        sceneManager.setActiveTool(toolType);
        expect(sceneManager.getActiveTool()).toBe(toolType);
      });
    });
  });

  describe('T062: Tool state management', () => {
    it('should reset tool state when edit mode is disabled', () => {
      sceneManager.setEditMode(true);
      sceneManager.setActiveTool('select');
      expect(sceneManager.getActiveTool()).toBe('select');

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
      sceneManager.setActiveTool('placeComponent');

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

      sceneManager.setActiveTool('select');

      expect(toolActivatedSpy).toHaveBeenCalledWith({
        toolType: 'select',
      });
    });

    it('should emit toolDeactivated event when a tool is deactivated', () => {
      const toolDeactivatedSpy = vi.fn();
      sceneManager.on('toolDeactivated', toolDeactivatedSpy);

      sceneManager.setActiveTool('select');
      sceneManager.setActiveTool('wire');

      expect(toolDeactivatedSpy).toHaveBeenCalledWith({
        toolType: 'select',
      });
    });

    it('should emit cursorChangeRequested event when tool is activated', () => {
      const cursorChangeSpy = vi.fn();
      sceneManager.on('cursorChangeRequested', cursorChangeSpy);

      sceneManager.setActiveTool('select');

      expect(cursorChangeSpy).toHaveBeenCalled();
    });

    it('should emit events in correct order: deactivate old, activate new', () => {
      const events: string[] = [];

      sceneManager.on('toolDeactivated', () => events.push('deactivated'));
      sceneManager.on('toolActivated', () => events.push('activated'));

      sceneManager.setActiveTool('select');
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
      expect(() => sceneManager.setActiveTool('select')).toThrow('Edit mode must be enabled');
    });

    it('should throw error when trying to use tool methods before initialization', () => {
      const uninitializedManager = new CircuitSceneManager(factoryRegistry);

      expect(() => uninitializedManager.setEditMode(true)).toThrow('not initialized');
    });
  });
});
