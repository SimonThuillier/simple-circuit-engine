import { ComponentType, type Component } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { OrGateGeometry, OrGateHoleGeometry } from '../../utils/GeometryUtils';
import { NorGateVisualFactory } from './NorGateVisualFactory';
import type { VisualContext } from '../../types';
import { CmpMatCategory } from '../types';

/**
 * Visual factory for NOR gates components
 *
 * Creates:
 * - Gate mesh
 * - vcc, gnd, inputs and output pin groups
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Emissive glow when Gate is high (based on simulation state)
 */
export class Nor4GateVisualFactory extends NorGateVisualFactory {
  /** Shared open envelope geometry */
  protected override readonly ENVELOPE_GEOM = OrGateGeometry(2, 3.6, 0.13, 0.4, 16);
  /** Shared inner hole geometry */
  protected override readonly HOLE_GEOM = OrGateHoleGeometry(2, 3.6, 0.13, 0.4, 16)!;
  /** Shared geometry for negative marker **/
  protected override readonly NEG_MARKER_GEOM = new THREE.CylinderGeometry(
    0.25,
    0.25,
    0.4,
    16,
    4,
    false,
    0,
    Math.PI * 2
  );

  constructor() {
    super();
    this._componentType = ComponentType.Nor4Gate;
  }

  override createVisual(component: Component, context: VisualContext): THREE.Object3D {
    if (component.type !== this._componentType) {
      throw new Error(`Factory mismatch: expected "${this._componentType}", got "${component.type}"`);
    }
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 2.5, 2, 3.8);
    group.add(hitbox);

    // Visual Gate
    const envelope = new THREE.Mesh(this.ENVELOPE_GEOM, this.getMat(CmpMatCategory.WHITE));
    envelope.userData = {
      type: 'component',
      componentId: component.id,
      part: 'envelope',
    };
    envelope.rotateX(-Math.PI / 2);
    envelope.rotateY(Math.PI);
    envelope.position.set(-0.25, 0.35, 0);
    group.add(envelope);

    const hole = new THREE.Mesh(this.HOLE_GEOM, this.getMat(CmpMatCategory.DARK_GRAY));
    hole.name = 'hole'; // required for AnimationMixer property binding
    hole.userData = {
      type: 'component',
      componentId: component.id,
      part: 'hole',
      initialState: 'low',
    };
    hole.rotateX(-Math.PI / 2);
    hole.rotateY(Math.PI);
    hole.position.set(-0.25, 0.35, 0);
    group.add(hole);

    // pins (not called if preview - no pins)
    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group);
    }

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  protected override createPinsVisual(
    component: Component,
    context: VisualContext,
    group: THREE.Group
  ) {
    const vccNode = context.getENode(component.pins[0]!);
    if (vccNode) {
      const vccGroup = this.createPinGroup(vccNode, 'bottom', new THREE.Euler(0, 0, 0.23));
      vccGroup.position.set(0.15, 0, 1.73);
      group.add(vccGroup);
    }

    const gndNode = context.getENode(component.pins[6]!);
    if (gndNode) {
      const gndGroup = this.createPinGroup(gndNode, 'top', new THREE.Euler(0, 0, 0.23));
      gndGroup.position.set(0.15, 0, -1.73);
      group.add(gndGroup);
    }

    const input1Node = context.getENode(component.pins[1]!);
    if (input1Node) {
      const input1Group = this.createPinGroup(input1Node, 'right', new THREE.Euler(0.6, 0, 0));
      input1Group.position.set(0.51, 0, 1.5);
      group.add(input1Group);
    }

    const input2Node = context.getENode(component.pins[2]!);
    if (input2Node) {
      const input2Group = this.createPinGroup(input2Node, 'right', new THREE.Euler(0.1, 0, 0));
      input2Group.position.set(0.07, 0, 0.5);
      group.add(input2Group);
    }

    const input3Node = context.getENode(component.pins[3]!);
    if (input3Node) {
      const input3Group = this.createPinGroup(input3Node, 'right', new THREE.Euler(-0.1, 0, 0));
      input3Group.position.set(0.07, 0, -0.5);
      group.add(input3Group);
    }

    const input4Node = context.getENode(component.pins[4]!);
    if (input4Node) {
      const input4Group = this.createPinGroup(input4Node, 'right', new THREE.Euler(-0.6, 0, 0));
      input4Group.position.set(0.51, 0, -1.5);
      group.add(input4Group);
    }

    const outputNode = context.getENode(component.pins[5]!);
    if (outputNode) {
      const outputGroup = this.createPinGroup(outputNode, 'left');
      outputGroup.position.set(-1.22, 0, 0);
      group.add(outputGroup);
    }
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>) {
    const holeMesh = this.findHoleMesh(object3D);
    if (!holeMesh) return;

    let negativeMarkerMesh = this.findNegativeMarkerMesh(object3D);

    if (config.get('activationLogic') === 'negative') {
      holeMesh.userData.initialState = 'high';
      if (!negativeMarkerMesh) {
        negativeMarkerMesh = new THREE.Mesh(
          this.NEG_MARKER_GEOM,
          this.getMat(CmpMatCategory.WHITE)
        );
        negativeMarkerMesh.userData = {
          type: 'component',
          componentId: holeMesh.userData.componentId,
          part: 'negativeMarker',
        };

        negativeMarkerMesh.position.set(-1, 0.15, -1.3);
        object3D.add(negativeMarkerMesh);
      }
    } else {
      holeMesh.userData.initialState = 'low';
      if (negativeMarkerMesh) {
        object3D.remove(negativeMarkerMesh);
      }
    }
  }
}
