/**
 * Unit tests for AbstractCircuitController shared resources injection
 * Tasks: T006, T007, T008, T010
 * @module tests/scene/shared/AbstractCircuitController.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { CircuitController } from '../../../src/scene/static/CircuitController';
import { CircuitRunnerController } from '../../../src/scene/simulation/CircuitRunnerController';
import { FactoryRegistry, DefaultVisualFactory } from '../../../src/scene/shared/components';
import { HoverManager } from '../../../src/scene/shared/HoverManager';
import { BranchingPointVisualFactory } from '../../../src/scene/shared/BranchingPointVisualFactory';
import { WireVisualManager } from '../../../src/scene/shared/WireVisualManager';
import { BehaviorRegistry } from '../../../src/core/simulation/behaviors/BehaviorRegistry';
import type { SharedResources } from '../../../src/scene/shared/types';
import type { IFactoryRegistry } from '../../../src/scene/shared/components/ComponentVisualFactory';
import type { UUID } from '../../../src/core/types/Identifier';
import type { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { disposeScene } from '../helpers';

/**
 * Create mock shared resources for testing
 */
function createMockSharedResources(factoryRegistry: IFactoryRegistry): SharedResources {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  camera.layers.set(0);
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  const mapControls = new MapControls(camera, container);
  const hoverManager = new HoverManager(scene, camera);
  const branchingPointVisualFactory = new BranchingPointVisualFactory();

  // Create shared visual maps
  const componentObject3Ds = new Map<UUID, THREE.Object3D>();
  const enodeObject3Ds = new Map<UUID, THREE.Object3D>();
  const wireObject3Ds = new Map<UUID, Line2>();

  // Create WireVisualManager with the new constructor interface
  const wireVisualManager = new WireVisualManager(componentObject3Ds, wireObject3Ds);
  wireVisualManager.setSceneAndCamera(scene, camera);
  wireVisualManager.setContainer(container);
  wireVisualManager.setResolution(800, 600);

  return {
    scene,
    camera,
    mapControls,
    grid: null,
    factoryRegistry,
    branchingPointVisualFactory,
    wireVisualManager,
    hoverManager,
    componentObject3Ds,
    enodeObject3Ds,
    wireObject3Ds,
  };
}

describe('AbstractCircuitController - Shared Resources Injection', () => {
  let factoryRegistry: IFactoryRegistry;
  let behaviorRegistry: BehaviorRegistry;
  let container: HTMLDivElement;
  let sharedResources: SharedResources;

  beforeEach(() => {
    factoryRegistry = new FactoryRegistry(new DefaultVisualFactory());
    behaviorRegistry = new BehaviorRegistry();
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    document.body.appendChild(container);
    sharedResources = createMockSharedResources(factoryRegistry);
  });

  afterEach(() => {
    if (sharedResources.scene) {
      disposeScene(sharedResources.scene);
    }
    sharedResources.mapControls.dispose();
    sharedResources.hoverManager.dispose();
    sharedResources.wireVisualManager.dispose();
    document.body.removeChild(container);
  });

  describe('CircuitController with shared resources', () => {
    it('should accept sharedResources in constructor', () => {
      const controller = new CircuitController(factoryRegistry, sharedResources);
      expect(controller).toBeDefined();
    });

    it('should use shared scene when initialized with sharedResources', () => {
      const controller = new CircuitController(factoryRegistry, sharedResources);
      controller.initialize(container);

      expect(controller.getScene()).toBe(sharedResources.scene);
    });

    it('should use shared camera when initialized with sharedResources', () => {
      const controller = new CircuitController(factoryRegistry, sharedResources);
      controller.initialize(container);

      expect(controller.getCamera()).toBe(sharedResources.camera);
    });

    it('should use shared MapControls when initialized with sharedResources', () => {
      const controller = new CircuitController(factoryRegistry, sharedResources);
      controller.initialize(container);

      expect(controller.getControls()).toBe(sharedResources.mapControls);
    });

    it('should not create new scene/camera/controls when using shared resources', () => {
      const originalScene = sharedResources.scene;
      const originalCamera = sharedResources.camera;
      const originalControls = sharedResources.mapControls;

      const controller = new CircuitController(factoryRegistry, sharedResources);
      controller.initialize(container);

      // Verify no new objects were created
      expect(controller.getScene()).toBe(originalScene);
      expect(controller.getCamera()).toBe(originalCamera);
      expect(controller.getControls()).toBe(originalControls);
    });

    it('should emit ready event when initialized with shared resources', () => {
      const controller = new CircuitController(factoryRegistry, sharedResources);
      const readyHandler = vi.fn();
      controller.on('ready', readyHandler);

      controller.initialize(container);

      expect(readyHandler).toHaveBeenCalledWith({ controllerType: 'static' });
    });

    it('should not dispose shared resources when controller is disposed', () => {
      const controller = new CircuitController(factoryRegistry, sharedResources);
      controller.initialize(container);

      // Store references before dispose
      const scene = sharedResources.scene;
      const camera = sharedResources.camera;
      const controls = sharedResources.mapControls;

      controller.dispose();

      // Shared resources should still be valid
      expect(scene.children).toBeDefined();
      expect(camera.aspect).toBeDefined();
      expect(controls.enabled).toBeDefined();
    });
  });

  describe('CircuitRunnerController with shared resources', () => {
    it('should accept sharedResources in constructor', () => {
      const controller = new CircuitRunnerController(
        factoryRegistry,
        behaviorRegistry,
        sharedResources
      );
      expect(controller).toBeDefined();
    });

    it('should use shared scene when initialized with sharedResources', () => {
      const controller = new CircuitRunnerController(
        factoryRegistry,
        behaviorRegistry,
        sharedResources
      );
      controller.initialize(container);

      expect(controller.getScene()).toBe(sharedResources.scene);
    });

    it('should use shared camera when initialized with sharedResources', () => {
      const controller = new CircuitRunnerController(
        factoryRegistry,
        behaviorRegistry,
        sharedResources
      );
      controller.initialize(container);

      expect(controller.getCamera()).toBe(sharedResources.camera);
    });

    it('should emit ready event when initialized with shared resources', () => {
      const controller = new CircuitRunnerController(
        factoryRegistry,
        behaviorRegistry,
        sharedResources
      );
      const readyHandler = vi.fn();
      controller.on('ready', readyHandler);

      controller.initialize(container);

      expect(readyHandler).toHaveBeenCalledWith({ controllerType: 'simulation' });
    });

    it('should not dispose shared resources when controller is disposed', () => {
      const controller = new CircuitRunnerController(
        factoryRegistry,
        behaviorRegistry,
        sharedResources
      );
      controller.initialize(container);

      // Store references before dispose
      const scene = sharedResources.scene;

      controller.dispose();

      // Shared resources should still be valid
      expect(scene.children).toBeDefined();
    });
  });

  describe('Standalone mode (no shared resources)', () => {
    it('should create own scene when no sharedResources provided', () => {
      const controller = new CircuitController(factoryRegistry);
      controller.initialize(container);

      const scene = controller.getScene();
      expect(scene).toBeInstanceOf(THREE.Scene);
      expect(scene).not.toBe(sharedResources.scene);

      controller.dispose();
    });

    it('should create own camera when no sharedResources provided', () => {
      const controller = new CircuitController(factoryRegistry);
      controller.initialize(container);

      const camera = controller.getCamera();
      expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
      expect(camera).not.toBe(sharedResources.camera);

      controller.dispose();
    });

    it('should create own MapControls when no sharedResources provided', () => {
      const controller = new CircuitController(factoryRegistry);
      controller.initialize(container);

      const controls = controller.getControls();
      expect(controls).toBeInstanceOf(MapControls);
      expect(controls).not.toBe(sharedResources.mapControls);

      controller.dispose();
    });

    it('should dispose own resources when controller is disposed in standalone mode', () => {
      const controller = new CircuitController(factoryRegistry);
      controller.initialize(container);

      controller.dispose();

      // Controller should be marked as disposed
      expect(controller.isDisposed).toBe(true);
      expect(controller.isInitialized).toBe(false);
    });
  });
});

describe('EventEmitter.onAny()', () => {
  it('should forward all events to the callback', () => {
    const controller = new CircuitController(new FactoryRegistry(new DefaultVisualFactory()));
    const testContainer = document.createElement('div');
    Object.defineProperty(testContainer, 'clientWidth', { value: 800 });
    Object.defineProperty(testContainer, 'clientHeight', { value: 600 });
    document.body.appendChild(testContainer);

    const forwardedEvents: Array<{ event: string; payload: unknown }> = [];
    const cleanup = controller.onAny((event, payload) => {
      forwardedEvents.push({ event: event as string, payload });
    });

    controller.initialize(testContainer);

    // Should have captured the 'ready' event
    expect(forwardedEvents.some((e) => e.event === 'ready')).toBe(true);

    cleanup();
    controller.dispose();
    document.body.removeChild(testContainer);
  });

  it('should return cleanup function that stops forwarding', () => {
    const controller = new CircuitController(new FactoryRegistry(new DefaultVisualFactory()));
    const testContainer = document.createElement('div');
    Object.defineProperty(testContainer, 'clientWidth', { value: 800 });
    Object.defineProperty(testContainer, 'clientHeight', { value: 600 });
    document.body.appendChild(testContainer);

    const forwardedEvents: Array<{ event: string; payload: unknown }> = [];
    const cleanup = controller.onAny((event, payload) => {
      forwardedEvents.push({ event: event as string, payload });
    });

    // Call cleanup before initialize
    cleanup();

    controller.initialize(testContainer);

    // Should NOT have captured the 'ready' event after cleanup
    expect(forwardedEvents.some((e) => e.event === 'ready')).toBe(false);

    controller.dispose();
    document.body.removeChild(testContainer);
  });
});
