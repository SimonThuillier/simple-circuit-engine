import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { ComponentType, type Component } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type { VisualContext } from '../../types';
import { CmpMatCategory } from '../types';

/**
 * Visual factory for Battery components
 */
export class BatteryVisualFactory extends ComponentVisualFactoryBase {
  private readonly BATTERY_GEOMETRY = new THREE.CylinderGeometry(0.5, 0.5, 2, 24);

  constructor() {
    super();
    this._componentType = ComponentType.Battery;
  }

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    if (component.type !== this._componentType) {
      throw new Error(`Factory mismatch: expected "${this._componentType}", got "${component.type}"`);
    }
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
    const cylinder = new THREE.Mesh(this.BATTERY_GEOMETRY, this.getMat(CmpMatCategory.WHITE));
    cylinder.userData = {
      type: 'component',
      componentId: component.id,
    };
    cylinder.rotateX(Math.PI / 2);
    group.add(cylinder);

    // pins (not called if preview - no pins)
    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group);
    }

    return group;
  }

  private createPinsVisual(component: Component, context: VisualContext, group: THREE.Group) {
    const cathodeNode = context.getENode(component.pins[0]!);
    if (cathodeNode) {
      const cathodeGroup = this.createPinGroup(cathodeNode, 'top');
      cathodeGroup.position.set(0, 0, -1);
      group.add(cathodeGroup);
    }

    const anodeNode = context.getENode(component.pins[1]!);
    if (anodeNode) {
      const anodeGroup = this.createPinGroup(anodeNode, 'bottom');
      anodeGroup.position.set(0, 0, 1);
      group.add(anodeGroup);
    }
  }

  // Uses default hover implementation
  // No animation (battery is static)
}
