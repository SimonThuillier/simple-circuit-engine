/**
 * Unit tests for CircuitSceneManager
 * @module tests/unit/rendering/static/CircuitSceneManager.test
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { CircuitSceneManager } from '../../../src/scene/static/CircuitSceneManager';
import { FactoryRegistry } from '../../../src/scene/shared/FactoryRegistry';
import { createDefaultFactory } from '../../../src/scene/shared/ComponentVisualFactory';
import { ComponentType } from '../../../src/core/types/ComponentType';
import { ENodeType } from '../../../src/core/types/ENodeType';
import { createMockCircuit } from '../helpers';

describe('CircuitSceneManager', () => {
  let circuit: ReturnType<typeof createMockCircuit>;
  let registry: FactoryRegistry;
  let manager: CircuitSceneManager;
  let container: HTMLElement;

  beforeEach(() => {
    circuit = createMockCircuit({ componentCount: 2, wireCount: 1 });
    registry = new FactoryRegistry(createDefaultFactory());
    manager = new CircuitSceneManager(registry);
    manager.setCircuit(circuit);

    // Mock DOM container
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
  });

  describe('Constructor (T020)', () => {
    it('should assign circuit property', () => {
      expect(manager.circuit).toBe(circuit);
    });

    it('should assign factoryRegistry property', () => {
      expect(manager.factoryRegistry).toBe(registry);
    });

    it('should not be initialized yet', () => {
      expect(() => manager.getScene()).toThrow();
    });

    it('should throw TypeError for null factoryRegistry', () => {
      expect(() => {
        new CircuitSceneManager(null as any);
      }).toThrow(TypeError);
    });
  });

  describe('initialize() (T021)', () => {
    it('should create a Three.js scene', () => {
      manager.initialize(container);
      const scene = manager.getScene();

      expect(scene).toBeInstanceOf(THREE.Scene);
    });

    it('should setup camera with proper configuration', () => {
      manager.initialize(container);
      const scene = manager.getScene();

      expect(manager.getCamera()).toBeDefined();
      expect(manager.getCamera()).toBeInstanceOf(THREE.PerspectiveCamera);
    });

    it('should add lights to scene', () => {
      manager.initialize(container);
      const scene = manager.getScene();

      const lights = scene.children.filter((obj) => obj instanceof THREE.Light);
      expect(lights.length).toBeGreaterThan(0);
    });

    it('should add grid helper to scene', () => {
      manager.initialize(container);
      const scene = manager.getScene();

      const gridHelpers = scene.children.filter((obj) => obj instanceof THREE.GridHelper);
      expect(gridHelpers.length).toBe(1);
    });

    it('should emit ready event when initialization complete', (done) => {
      manager.on('ready', () => {
        done();
      });

      manager.initialize(container);
    });

    it('should throw error if already initialized', () => {
      manager.initialize(container);

      expect(() => {
        manager.initialize(container);
      }).toThrow(Error);
    });

    it('should throw TypeError for invalid container', () => {
      expect(() => {
        manager.initialize(null as any);
      }).toThrow(TypeError);

      expect(() => {
        manager.initialize({} as any);
      }).toThrow(TypeError);
    });

    it('should accept optional manager options', () => {
      expect(() => {
        manager.initialize(container, {
          cameraFov: 60,
          cameraNear: 0.5,
          cameraFar: 500,
        });
      }).not.toThrow();
    });
  });

  describe('update() (T022)', () => {
    beforeEach(() => {
      manager.initialize(container);
    });

    it('should create meshes for all components', () => {
      manager.update();
      const scene = manager.getScene();

      const components = circuit.getAllComponents();
      const componentMeshes = scene.children.filter(
        (obj) => obj.userData.componentId !== undefined
      );

      expect(componentMeshes.length).toBe(components.length);
    });

    it('should create lines for all wires', () => {
      manager.update();
      const scene = manager.getScene();

      const wires = circuit.getAllWires();
      const wireLines = scene.children.filter(
        (obj) => obj instanceof THREE.Line && obj.userData.wireId !== undefined
      );

      expect(wireLines.length).toBe(wires.length);
    });

    it('should create meshes for all enodes', () => {
      manager.update();
      const scene = manager.getScene();

      // Only branching point enodes are visualized (not pin enodes)
      const enodes = circuit.getAllENodes();
      const branchingPointEnodes = enodes.filter((e) => e.type !== ENodeType.Pin);
      const enodeMeshes = scene.children.filter(
        (obj) => obj.userData.enodeId !== undefined
      );

      expect(enodeMeshes.length).toBe(branchingPointEnodes.length);
    });

    it('should position component meshes at circuit locations', () => {
      manager.update();
      const scene = manager.getScene();

      const component = circuit.getAllComponents()[0];
      const mesh = scene.children.find(
        (obj) => obj.userData.componentId === component.id
      ) as THREE.Mesh;

      expect(mesh).toBeDefined();
      expect(mesh.position.x).toBe(component.position.x);
      expect(mesh.position.z).toBe(component.position.y); // y -> z for 3D
    });

    it('should use factoryRegistry to create component visuals', () => {
      const customFactory = vi.fn((component) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        mesh.userData.componentId = component.id;
        return mesh;
      });

      registry.register(ComponentType.Battery, customFactory);
      manager.update();

      expect(customFactory).toHaveBeenCalled();
    });

    it('should perform full update when no changedData provided', () => {
      manager.update();
      const scene = manager.getScene();

      const initialChildCount = scene.children.length;
      manager.update(); // Update again

      // Should still have same number of objects (full rebuild)
      expect(scene.children.length).toBeGreaterThanOrEqual(initialChildCount);
    });

    it('should throw error if not initialized', () => {
      const uninitializedRenderer = new CircuitSceneManager(circuit, registry);

      expect(() => {
        uninitializedRenderer.update();
      }).toThrow(Error);
    });

    it('should handle incremental updates with changedData', () => {
      manager.update();

      const initialChildCount = manager.getScene().children.length;

      // Add a component to circuit
      const newComponent = circuit.addComponent(ComponentType.Switch, { x: 10, y: 10 }, 0);

      manager.update({
        addedComponents: [newComponent.id],
      });

      // Should have one more mesh (the component)
      expect(manager.getScene().children.length).toBeGreaterThan(initialChildCount);
    });
  });

  describe('getScene() (T023)', () => {
    it('should return Three.js scene after initialization', () => {
      manager.initialize(container);
      const scene = manager.getScene();

      expect(scene).toBeInstanceOf(THREE.Scene);
    });

    it('should expose camera via getCamera()', () => {
      manager.initialize(container);
      const scene = manager.getScene();

      expect(manager.getCamera()).toBeDefined();
      expect(manager.getCamera()).toBeInstanceOf(THREE.Camera);
    });

    it('should throw error if not initialized', () => {
      expect(() => {
        manager.getScene();
      }).toThrow(Error);
    });

    it('should return same scene instance on multiple calls', () => {
      manager.initialize(container);

      const scene1 = manager.getScene();
      const scene2 = manager.getScene();

      expect(scene1).toBe(scene2);
    });
  });

  describe('dispose() (T024)', () => {
    beforeEach(() => {
      manager.initialize(container);
      manager.update();
    });

    it('should dispose all geometries', () => {
      const scene = manager.getScene();
      const disposeSpy = vi.fn();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose = disposeSpy;
        }
      });

      manager.dispose();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should dispose all materials', () => {
      const scene = manager.getScene();
      const disposeSpy = vi.fn();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => (mat.dispose = disposeSpy));
          } else {
            obj.material.dispose = disposeSpy;
          }
        }
      });

      manager.dispose();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should remove all objects from scene', () => {
      const scene = manager.getScene();
      const initialChildren = scene.children.length;

      expect(initialChildren).toBeGreaterThan(0);

      manager.dispose();

      // After disposal, scene should be cleared
      // Note: Can't call getScene() after dispose, so we check the scene reference we got before
      expect(scene.children.length).toBe(0);
    });

    it('should clear all event listeners', () => {
      const callback = vi.fn();
      manager.on('hover', callback);

      manager.dispose();

      expect(manager.listenerCount('hover')).toBe(0);
    });

    it('should throw error if already disposed', () => {
      manager.dispose();

      expect(() => {
        manager.dispose();
      }).toThrow(Error);
    });

    it('should prevent subsequent operations after disposal', () => {
      manager.dispose();

      expect(() => manager.update()).toThrow(Error);
      expect(() => manager.render()).toThrow(Error);
      expect(() => manager.getScene()).toThrow(Error);
    });
  });

  describe('Event system', () => {
    beforeEach(() => {
      manager.initialize(container);
    });

    it('should register and call event listeners', () => {
      const callback = vi.fn();
      manager.on('ready', callback);

      manager['emit']('ready', {});

      expect(callback).toHaveBeenCalled();
    });

    it('should unregister event listeners', () => {
      const callback = vi.fn();
      manager.on('hover', callback);
      manager.off('hover', callback);

      manager['emit']('hover', {
        objectId: 'test',
        objectType: 'component',
        position: new THREE.Vector3(),
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.on('select', callback1);
      manager.on('select', callback2);

      manager['emit']('select', {
        objectId: 'test',
        objectType: 'component',
        position: new THREE.Vector3(),
      });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('render()', () => {
    beforeEach(() => {
      manager.initialize(container);
      manager.update();
    });

    it('should not throw when called', () => {
      expect(() => {
        manager.render();
      }).not.toThrow();
    });

    it('should throw if not initialized', () => {
      const uninitializedRenderer = new CircuitSceneManager(circuit, registry);

      expect(() => {
        uninitializedRenderer.render();
      }).toThrow(Error);
    });
  });

  describe('Error handling', () => {
    it('should emit error event for initialization failures', (done) => {
      const badRenderer = new CircuitSceneManager(circuit, registry);

      badRenderer.on('error', ({ message }) => {
        expect(message).toBeDefined();
        done();
      });

      try {
        badRenderer.initialize(null as any);
      } catch (err) {
        // Expected to throw, but should also emit error event
      }
    });

    it('should handle factory errors gracefully', () => {
      const errorFactory = () => {
        throw new Error('Factory error');
      };

      registry.register(ComponentType.Battery, errorFactory);
      manager.initialize(container);

      // Should emit error but not crash
      const errorCallback = vi.fn();
      manager.on('error', errorCallback);

      try {
        manager.update();
      } catch (err) {
        // May throw, but should have emitted error event
      }

      expect(errorCallback).toHaveBeenCalled();
    });
  });
});
