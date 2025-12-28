import { ComponentVisualFactoryBase } from './ComponentVisualFactory';
import type { Component } from '@/core/Component';
import * as THREE from 'three';
import { ENodeSourceType } from '@/core/types/ENodeSourceType';

/**
 * Visual factory for Battery components
 *
 * Creates:
 * - Cylinder mesh (white) for battery body
 * - Cathode pin group at z=-1
 * - Anode pin group at z=+1
 * - Component hitbox for raycasting
 */
export class BatteryVisualFactory extends ComponentVisualFactoryBase {
  createVisual(component: Component): THREE.Object3D {
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 2, 3);
    group.add(hitbox);

    // Visual: battery cylinder
    const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 24);
    const cylinderMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.userData = {
      type: 'component',
      componentId: component.id,
    };
    cylinder.rotateX(Math.PI / 2);
    group.add(cylinder);

    // Cathode (positive pin) group
    const cathodeGroup = this.createPinGroup(
      component.id,
      component.pins[0]!,
      'cathode',
      ENodeSourceType.Voltage
    );
    cathodeGroup.position.set(0, 0, -1);
    cathodeGroup.rotateX(-Math.PI / 2);
    group.add(cathodeGroup);

    // Anode (negative pin) group
    const anodeGroup = this.createPinGroup(
      component.id,
      component.pins[1]!,
      'anode',
      ENodeSourceType.Current
    );
    anodeGroup.position.set(0, 0, 1);
    anodeGroup.rotateX(Math.PI / 2);
    group.add(anodeGroup);

    return group;
  }

  // Uses default hover implementation
  // No animation (battery is static)
}
