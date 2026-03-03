import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import type { Component } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type {VisualContext} from "../../types";

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

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
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

    // pins (not called if preview - no pins)
    if (component.pins.length > 0){
      this.createPinsVisual(component, context, group);
    }

    return group;
  }

  private createPinsVisual(component: Component, context: VisualContext, group: THREE.Group){

    const cathodeNode = context.getENode(component.pins[0]!);
    if(cathodeNode){
      const cathodeGroup = this.createPinGroup(cathodeNode, 'top');
      cathodeGroup.position.set(0, 0, -1);
      group.add(cathodeGroup);
    }

    const anodeNode = context.getENode(component.pins[1]!);
    if(anodeNode){
      const anodeGroup = this.createPinGroup(anodeNode, 'bottom');
      anodeGroup.position.set(0, 0, 1);
      group.add(anodeGroup);
    }
  }

  // Uses default hover implementation
  // No animation (battery is static)
}
