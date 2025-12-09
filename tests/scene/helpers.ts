/**
 * Test Helpers for Rendering Module
 * @module tests/unit/rendering/helpers
 *
 * Utility functions for creating mock objects in rendering tests
 */

import * as THREE from 'three';
import { Circuit } from '../../src/core/Circuit';
import { CircuitRunner } from '../../src/core/simulation/CircuitRunner';
import { BehaviorRegistry } from '../../src/core/simulation/behaviors/BehaviorRegistry';
import { ComponentType } from '../../src/core/types/ComponentType';
import type { Component } from '../../../src/core/components/Component';
import type { ComponentVisualFactory } from '../../src/scene/shared/components/ComponentVisualFactory';

/**
 * Create a simple mock circuit for testing
 *
 * @param options - Options for circuit creation
 * @returns Circuit with test data
 */
export function createMockCircuit(
  options: {
    name?: string;
    componentCount?: number;
    wireCount?: number;
  } = {}
): Circuit {
  const circuit = new Circuit(options.name ?? 'Test Circuit');

  // Add components if requested
  const componentCount = options.componentCount ?? 0;
  for (let i = 0; i < componentCount; i++) {
    circuit.addComponent(ComponentType.Battery, { x: i * 2, y: 0 }, 0);
  }

  // Add wires if requested and there are components with pins
  const wireCount = options.wireCount ?? 0;
  const allEnodes = circuit.getAllENodes();
  if (wireCount > 0 && allEnodes.length >= 2) {
    for (let i = 0; i < Math.min(wireCount, Math.floor(allEnodes.length / 2)); i++) {
      const from = allEnodes[i * 2];
      const to = allEnodes[i * 2 + 1];
      if (from && to) {
        circuit.addWire(from.id, to.id);
      }
    }
  }

  return circuit;
}

/**
 * Create a mock CircuitRunner for testing
 *
 * @param circuit - Circuit to run (creates empty circuit if not provided)
 * @param options - Runner options
 * @returns CircuitRunner instance
 */
export function createMockCircuitRunner(
  circuit?: Circuit,
  options: {
    enableHistory?: boolean;
    historyLimit?: number;
  } = {}
): CircuitRunner {
  const testCircuit = circuit ?? createMockCircuit();
  const behaviorRegistry = new BehaviorRegistry();

  return new CircuitRunner(testCircuit, behaviorRegistry, {
    enableHistory: options.enableHistory ?? false,
    historyLimit: options.historyLimit ?? 100,
  });
}

/**
 * Create a mock ComponentVisualFactory for testing
 *
 * @param type - Component type this factory handles (not used in factory, only for reference)
 * @param options - Factory options
 * @returns ComponentVisualFactory function
 */
export function createMockFactory(
  type?: ComponentType,
  options: {
    color?: number;
    geometry?: 'box' | 'sphere' | 'cylinder';
    size?: number;
  } = {}
): ComponentVisualFactory {
  return (component: Component): THREE.Object3D => {
    const size = options.size ?? 1;
    let geometry: THREE.BufferGeometry;

    switch (options.geometry ?? 'box') {
      case 'sphere':
        geometry = new THREE.SphereGeometry(size / 2, 16, 16);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(size / 2, size / 2, size, 16);
        break;
      case 'box':
      default:
        geometry = new THREE.BoxGeometry(size, size, size);
        break;
    }

    const material = new THREE.MeshStandardMaterial({
      color: options.color ?? 0x00ff00,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.componentId = component.id;
    mesh.userData.componentType = component.type;

    return mesh;
  };
}

/**
 * Create a simple test factory that creates colored cubes
 *
 * @param color - Cube color (hex)
 * @returns ComponentVisualFactory function
 */
export function createSimpleTestFactory(color: number = 0xff0000): ComponentVisualFactory {
  return (component: Component): THREE.Object3D => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.componentId = component.id;
    mesh.userData.componentType = component.type;
    return mesh;
  };
}

/**
 * Count Three.js objects in a scene by type
 *
 * @param scene - Scene to analyze
 * @param type - Object constructor to count (e.g., THREE.Mesh, THREE.Line)
 * @returns Count of matching objects
 */
export function countObjectsInScene(
  scene: THREE.Scene,
  type: new (...args: any[]) => THREE.Object3D
): number {
  let count = 0;
  scene.traverse((obj) => {
    if (obj instanceof type) {
      count++;
    }
  });
  return count;
}

/**
 * Find all objects in scene with specific userData key
 *
 * @param scene - Scene to search
 * @param key - userData key to search for
 * @returns Array of matching objects
 */
export function findObjectsByUserData(scene: THREE.Scene, key: string): THREE.Object3D[] {
  const results: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj.userData[key] !== undefined) {
      results.push(obj);
    }
  });
  return results;
}

/**
 * Dispose all geometries and materials in a scene
 *
 * Useful for cleanup in tests
 *
 * @param scene - Scene to clean up
 */
export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((mat) => mat.dispose());
      } else {
        obj.material.dispose();
      }
    } else if (obj instanceof THREE.Line) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((mat) => mat.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
}
