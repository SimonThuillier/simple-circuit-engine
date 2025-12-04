/**
 * Component Visual Factory Contract
 * @module scene/contracts/ComponentVisualFactory
 */

import type { Component } from '@/core/Component';
import type { ComponentType } from '@/core/types/ComponentType';
import type * as THREE from 'three';

/**
 * Factory function type for creating Three.js visuals from Circuit components
 *
 * @param component - The circuit component to visualize
 * @returns THREE.Object3D containing the visual representation
 *
 * @remarks
 * Factories should:
 * - Set object.userData.componentId = component.id for identification
 * - Set object.userData.componentType = component.type for filtering
 * - Return objects positioned at origin (renderer handles placement)
 * - Use appropriate materials that respond to lighting
 *
 * @example
 * ```typescript
 * const batteryFactory: ComponentVisualFactory = (component) => {
 *   const geometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 16);
 *   const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
 *   const mesh = new THREE.Mesh(geometry, material);
 *   mesh.userData.componentId = component.id;
 *   mesh.userData.componentType = component.type;
 *   return mesh;
 * };
 * ```
 */
export type ComponentVisualFactory = (component: Component) => THREE.Object3D;

/**
 * Registry interface for managing component visual factories
 *
 * Provides type-safe registration and retrieval of component factories.
 * Falls back to a default factory for unregistered component types.
 *
 * @example
 * ```typescript
 * const registry = new FactoryRegistry(defaultFactory);
 * registry.register(ComponentType.Battery, batteryFactory);
 * registry.register(ComponentType.LED, ledFactory);
 *
 * const factory = registry.get(ComponentType.Battery);
 * const mesh = factory(batteryComponent);
 * ```
 */
export interface IFactoryRegistry {
  /**
   * Register a visual factory for a specific component type
   *
   * @param type - Component type identifier
   * @param factory - Factory function to create visuals for this type
   * @throws {TypeError} If factory is null or undefined
   */
  register(type: ComponentType, factory: ComponentVisualFactory): void;

  /**
   * Retrieve the factory for a component type
   *
   * @param type - Component type identifier
   * @returns Factory function (fallback factory if type not registered)
   *
   * @remarks
   * This method NEVER returns null/undefined. If the type is not registered,
   * the fallback factory provided in the constructor is returned.
   */
  get(type: ComponentType): ComponentVisualFactory;

  /**
   * Check if a factory is registered for a component type
   *
   * @param type - Component type identifier
   * @returns true if explicitly registered, false if would use fallback
   */
  has(type: ComponentType): boolean;

  /**
   * Unregister a factory for a component type
   *
   * @param type - Component type identifier
   * @returns true if factory was registered and removed, false otherwise
   *
   * @remarks
   * After unregistering, get() will return the fallback factory for this type.
   */
  unregister(type: ComponentType): boolean;

  /**
   * Get all registered component types
   *
   * @returns Array of ComponentType values that have registered factories
   */
  getRegisteredTypes(): ComponentType[];
}

/**
 * Default fallback factory that creates a simple placeholder cube
 *
 * Used when a component type has no registered factory.
 * Creates a 1x1x1 magenta cube to clearly indicate missing visuals.
 *
 * @param component - The circuit component
 * @returns THREE.Mesh with cube geometry and magenta material
 *
 * @example
 * ```typescript
 * const registry = new FactoryRegistry(createDefaultFactory());
 * // Any unregistered component type will render as a magenta cube
 * ```
 */
export function createDefaultFactory(): ComponentVisualFactory {
  return (component: Component): THREE.Object3D => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff00ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.componentId = component.id;
    mesh.userData.componentType = component.type;
    mesh.userData.isPlaceholder = true;
    return mesh;
  };
}
