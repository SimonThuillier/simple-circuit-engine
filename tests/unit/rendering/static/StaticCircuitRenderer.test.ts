/**
 * Unit tests for StaticCircuitRenderer
 * @module tests/unit/rendering/static/StaticCircuitRenderer.test
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { StaticCircuitRenderer } from '../../../../src/rendering/static/StaticCircuitRenderer';
import { FactoryRegistry } from '../../../../src/rendering/shared/FactoryRegistry';
import { createDefaultFactory } from '../../../../src/rendering/shared/ComponentVisualFactory';
import { ComponentType } from '../../../../src/core/types/ComponentType';
import { ENodeType } from '../../../../src/core/types/ENodeType';
import { createMockCircuit } from '../../../rendering/helpers';

describe('StaticCircuitRenderer', () => {
  let circuit: ReturnType<typeof createMockCircuit>;
  let registry: FactoryRegistry;
  let renderer: StaticCircuitRenderer;
  let container: HTMLElement;

  beforeEach(() => {
    circuit = createMockCircuit({ componentCount: 2, wireCount: 1 });
    registry = new FactoryRegistry(createDefaultFactory());
    renderer = new StaticCircuitRenderer(circuit, registry);

    // Mock DOM container
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
  });

  describe('Constructor (T020)', () => {
    it('should assign circuit property', () => {
      expect(renderer.circuit).toBe(circuit);
    });

    it('should assign factoryRegistry property', () => {
      expect(renderer.factoryRegistry).toBe(registry);
    });

    it('should not be initialized yet', () => {
      expect(() => renderer.getScene()).toThrow();
    });

    it('should throw TypeError for null circuit', () => {
      expect(() => {
        new StaticCircuitRenderer(null as any, registry);
      }).toThrow(TypeError);
    });

    it('should throw TypeError for null factoryRegistry', () => {
      expect(() => {
        new StaticCircuitRenderer(circuit, null as any);
      }).toThrow(TypeError);
    });
  });

  describe('initialize() (T021)', () => {
    it('should create a Three.js scene', () => {
      renderer.initialize(container);
      const scene = renderer.getScene();

      expect(scene).toBeInstanceOf(THREE.Scene);
    });

    it('should setup camera with proper configuration', () => {
      renderer.initialize(container);
      const scene = renderer.getScene();

      expect(scene.camera).toBeDefined();
      expect(scene.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    });

    it('should add lights to scene', () => {
      renderer.initialize(container);
      const scene = renderer.getScene();

      const lights = scene.children.filter((obj) => obj instanceof THREE.Light);
      expect(lights.length).toBeGreaterThan(0);
    });

    it('should add grid helper to scene', () => {
      renderer.initialize(container);
      const scene = renderer.getScene();

      const gridHelpers = scene.children.filter((obj) => obj instanceof THREE.GridHelper);
      expect(gridHelpers.length).toBe(1);
    });

    it('should emit ready event when initialization complete', (done) => {
      renderer.on('ready', () => {
        done();
      });

      renderer.initialize(container);
    });

    it('should throw error if already initialized', () => {
      renderer.initialize(container);

      expect(() => {
        renderer.initialize(container);
      }).toThrow(Error);
    });

    it('should throw TypeError for invalid container', () => {
      expect(() => {
        renderer.initialize(null as any);
      }).toThrow(TypeError);

      expect(() => {
        renderer.initialize({} as any);
      }).toThrow(TypeError);
    });

    it('should accept optional renderer options', () => {
      expect(() => {
        renderer.initialize(container, {
          cameraFov: 60,
          cameraNear: 0.5,
          cameraFar: 500,
        });
      }).not.toThrow();
    });
  });

  describe('update() (T022)', () => {
    beforeEach(() => {
      renderer.initialize(container);
    });

    it('should create meshes for all components', () => {
      renderer.update();
      const scene = renderer.getScene();

      const components = circuit.getAllComponents();
      const componentMeshes = scene.children.filter(
        (obj) => obj.userData.componentId !== undefined
      );

      expect(componentMeshes.length).toBe(components.length);
    });

    it('should create lines for all wires', () => {
      renderer.update();
      const scene = renderer.getScene();

      const wires = circuit.getAllWires();
      const wireLines = scene.children.filter(
        (obj) => obj instanceof THREE.Line && obj.userData.wireId !== undefined
      );

      expect(wireLines.length).toBe(wires.length);
    });

    it('should create meshes for all enodes', () => {
      renderer.update();
      const scene = renderer.getScene();

      // Only branching point enodes are visualized (not pin enodes)
      const enodes = circuit.getAllENodes();
      const branchingPointEnodes = enodes.filter((e) => e.type !== ENodeType.Pin);
      const enodeMeshes = scene.children.filter(
        (obj) => obj.userData.enodeId !== undefined
      );

      expect(enodeMeshes.length).toBe(branchingPointEnodes.length);
    });

    it('should position component meshes at circuit locations', () => {
      renderer.update();
      const scene = renderer.getScene();

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
      renderer.update();

      expect(customFactory).toHaveBeenCalled();
    });

    it('should perform full update when no changedData provided', () => {
      renderer.update();
      const scene = renderer.getScene();

      const initialChildCount = scene.children.length;
      renderer.update(); // Update again

      // Should still have same number of objects (full rebuild)
      expect(scene.children.length).toBeGreaterThanOrEqual(initialChildCount);
    });

    it('should throw error if not initialized', () => {
      const uninitializedRenderer = new StaticCircuitRenderer(circuit, registry);

      expect(() => {
        uninitializedRenderer.update();
      }).toThrow(Error);
    });

    it('should handle incremental updates with changedData', () => {
      renderer.update();

      const initialChildCount = renderer.getScene().children.length;

      // Add a component to circuit
      const newComponent = circuit.addComponent(ComponentType.Switch, { x: 10, y: 10 }, 0);

      renderer.update({
        addedComponents: [newComponent.id],
      });

      // Should have one more mesh (the component)
      expect(renderer.getScene().children.length).toBeGreaterThan(initialChildCount);
    });
  });

  describe('getScene() (T023)', () => {
    it('should return Three.js scene after initialization', () => {
      renderer.initialize(container);
      const scene = renderer.getScene();

      expect(scene).toBeInstanceOf(THREE.Scene);
    });

    it('should expose camera via scene.camera property', () => {
      renderer.initialize(container);
      const scene = renderer.getScene();

      expect(scene.camera).toBeDefined();
      expect(scene.camera).toBeInstanceOf(THREE.Camera);
    });

    it('should throw error if not initialized', () => {
      expect(() => {
        renderer.getScene();
      }).toThrow(Error);
    });

    it('should return same scene instance on multiple calls', () => {
      renderer.initialize(container);

      const scene1 = renderer.getScene();
      const scene2 = renderer.getScene();

      expect(scene1).toBe(scene2);
    });
  });

  describe('dispose() (T024)', () => {
    beforeEach(() => {
      renderer.initialize(container);
      renderer.update();
    });

    it('should dispose all geometries', () => {
      const scene = renderer.getScene();
      const disposeSpy = vi.fn();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose = disposeSpy;
        }
      });

      renderer.dispose();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should dispose all materials', () => {
      const scene = renderer.getScene();
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

      renderer.dispose();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should remove all objects from scene', () => {
      const scene = renderer.getScene();
      const initialChildren = scene.children.length;

      expect(initialChildren).toBeGreaterThan(0);

      renderer.dispose();

      // After disposal, scene should be cleared
      // Note: Can't call getScene() after dispose, so we check the scene reference we got before
      expect(scene.children.length).toBe(0);
    });

    it('should clear all event listeners', () => {
      const callback = vi.fn();
      renderer.on('hover', callback);

      renderer.dispose();

      expect(renderer.listenerCount('hover')).toBe(0);
    });

    it('should throw error if already disposed', () => {
      renderer.dispose();

      expect(() => {
        renderer.dispose();
      }).toThrow(Error);
    });

    it('should prevent subsequent operations after disposal', () => {
      renderer.dispose();

      expect(() => renderer.update()).toThrow(Error);
      expect(() => renderer.render()).toThrow(Error);
      expect(() => renderer.getScene()).toThrow(Error);
    });
  });

  describe('Event system', () => {
    beforeEach(() => {
      renderer.initialize(container);
    });

    it('should register and call event listeners', () => {
      const callback = vi.fn();
      renderer.on('ready', callback);

      renderer['emit']('ready', {});

      expect(callback).toHaveBeenCalled();
    });

    it('should unregister event listeners', () => {
      const callback = vi.fn();
      renderer.on('hover', callback);
      renderer.off('hover', callback);

      renderer['emit']('hover', {
        objectId: 'test',
        objectType: 'component',
        position: new THREE.Vector3(),
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      renderer.on('select', callback1);
      renderer.on('select', callback2);

      renderer['emit']('select', {
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
      renderer.initialize(container);
      renderer.update();
    });

    it('should not throw when called', () => {
      expect(() => {
        renderer.render();
      }).not.toThrow();
    });

    it('should throw if not initialized', () => {
      const uninitializedRenderer = new StaticCircuitRenderer(circuit, registry);

      expect(() => {
        uninitializedRenderer.render();
      }).toThrow(Error);
    });
  });

  describe('Error handling', () => {
    it('should emit error event for initialization failures', (done) => {
      const badRenderer = new StaticCircuitRenderer(circuit, registry);

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
      renderer.initialize(container);

      // Should emit error but not crash
      const errorCallback = vi.fn();
      renderer.on('error', errorCallback);

      try {
        renderer.update();
      } catch (err) {
        // May throw, but should have emitted error event
      }

      expect(errorCallback).toHaveBeenCalled();
    });
  });
});
