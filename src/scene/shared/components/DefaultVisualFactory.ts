import { type ComponentVisualFactory, ComponentVisualFactoryBase } from './ComponentVisualFactory';
import type { Component } from '@/core/Component';
import * as THREE from 'three';

/**
 * Default Visual factory for not yet defined components
 *
 * Creates:
 * - Box squared mesh (white)
 * - Component hitbox for raycasting
 *
 * This default visual is pinless no matter the component definition.
 */
export class DefaultVisualFactory extends ComponentVisualFactoryBase {
  createVisual(component: Component): THREE.Object3D {
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
      isPlaceholder: true,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 2, 2);
    group.add(hitbox);

    // Visual box
    const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5, 4, 4, 4);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.userData = {
      type: 'component',
      componentId: component.id,
    };
    group.add(box);

    return group;
  }
}
