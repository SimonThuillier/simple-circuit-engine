import { type Component } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { OrGateGeometry, OrGateHoleGeometry, XorGateTailGeometry } from '../../utils/GeometryUtils';
import { XorGateVisualFactory } from './XorGateVisualFactory';
import type { VisualContext } from '../../types';
import { CmpMatCategory } from '../types';

/**
 * Visual factory for XOR gates components
 *
 * Creates:
 * - Gate mesh
 * - vcc, gnd, inputs and output pin groups
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Emissive glow when Gate is high (based on simulation state)
 */
export class Xor8GateVisualFactory extends XorGateVisualFactory {
  /** XOR tail geometry */
  protected override readonly TAIL_GEOM = XorGateTailGeometry(2.6, 7.5, 2.4, 0.16, 3.5, 0.4, 16);
  /** Shared open envelope geometry */
  protected override readonly ENVELOPE_GEOM = OrGateGeometry(2.6, 7.5, 0.16, 0.4, 16);
  /** Shared inner hole geometry */
  protected override readonly HOLE_GEOM = OrGateHoleGeometry(2.6, 7.5, 0.16, 0.4, 16)!;
  /** Shared geometry for negative marker **/
  protected override readonly NEG_MARKER_GEOM = new THREE.CylinderGeometry(
    0.35,
    0.35,
    0.4,
    16,
    4,
    false,
    0,
    Math.PI * 2
  );

  override createVisual(component: Component, context: VisualContext): THREE.Object3D {
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 4, 2, 7.6);
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
    envelope.position.set(-0.45, 0.35, 0);
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
    hole.position.set(-0.45, 0.35, 0);
    group.add(hole);

    const tail = new THREE.Mesh(this.TAIL_GEOM, this.getMat(CmpMatCategory.WHITE));
    tail.userData = {
      type: 'component',
      componentId: component.id,
      part: 'tail',
    };
    tail.rotateX(-Math.PI / 2);
    tail.rotateY(Math.PI);
    tail.position.set(-1.7, 0.35, 0);
    group.add(tail);

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
      const vccGroup = this.createPinGroup(vccNode, 'bottom', new THREE.Euler(0, 0, 0.5));
      vccGroup.position.set(0.3, 0, 3.5);
      group.add(vccGroup);
    }

    const gndNode = context.getENode(component.pins[10]!);
    if (gndNode) {
      const gndGroup = this.createPinGroup(gndNode, 'top', new THREE.Euler(0, 0, 0.5));
      gndGroup.position.set(0.3, 0, -3.5);
      group.add(gndGroup);
    }

    const input1Node = context.getENode(component.pins[1]!);
    if (input1Node) {
      const input1Group = this.createPinGroup(input1Node, 'right', new THREE.Euler(0.7, 0, 0));
      input1Group.position.set(1.65, 0, 3.45);
      group.add(input1Group);
    }

    const input2Node = context.getENode(component.pins[2]!);
    if (input2Node) {
      const input2Group = this.createPinGroup(input2Node, 'right', new THREE.Euler(0.53, 0, 0));
      input2Group.position.set(1.09, 0, 2.5);
      group.add(input2Group);
    }

    const input3Node = context.getENode(component.pins[3]!);
    if (input3Node) {
      const input3Group = this.createPinGroup(input3Node, 'right', new THREE.Euler(0.3, 0, 0));
      input3Group.position.set(0.72, 0, 1.5);
      group.add(input3Group);
    }

    const input4Node = context.getENode(component.pins[4]!);
    if (input4Node) {
      const input4Group = this.createPinGroup(input4Node, 'right', new THREE.Euler(0.11, 0, 0));
      input4Group.position.set(0.54, 0, 0.5);
      group.add(input4Group);
    }

    const input5Node = context.getENode(component.pins[5]!);
    if (input5Node) {
      const input5Group = this.createPinGroup(input5Node, 'right', new THREE.Euler(-0.11, 0, 0));
      input5Group.position.set(0.54, 0, -0.5);
      group.add(input5Group);
    }

    const input6Node = context.getENode(component.pins[6]!);
    if (input6Node) {
      const input6Group = this.createPinGroup(input6Node, 'right', new THREE.Euler(-0.3, 0, 0));
      input6Group.position.set(0.72, 0, -1.5);
      group.add(input6Group);
    }

    const input7Node = context.getENode(component.pins[7]!);
    if (input7Node) {
      const input7Group = this.createPinGroup(input7Node, 'right', new THREE.Euler(-0.53, 0, 0));
      input7Group.position.set(1.1, 0, -2.5);
      group.add(input7Group);
    }

    const input8Node = context.getENode(component.pins[8]!);
    if (input8Node) {
      const input8Group = this.createPinGroup(input8Node, 'right', new THREE.Euler(-0.7, 0, 0));
      input8Group.position.set(1.7, 0, -3.45);
      group.add(input8Group);
    }

    const outputNode = context.getENode(component.pins[9]!);
    if (outputNode) {
      const outputGroup = this.createPinGroup(outputNode, 'left');
      outputGroup.position.set(-1.69, 0, 0);
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

        negativeMarkerMesh.position.set(-1.02, 0.15, -2.86);
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
