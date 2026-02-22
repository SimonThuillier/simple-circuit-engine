import type { Component } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { AndGateGeometry } from '../../utils/GeometryUtils';
import type { ConfigFormDefinition } from '../../types';
import { AndGateVisualFactory } from './AndGateVisualFactory';

/**
 * Visual factory for AND gates components
 *
 * Creates:
 * - Gate mesh
 * - vcc, inputs and output pin groups
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Emissive glow when Gate is high (based on simulation state)
 */
export class And8GateVisualFactory extends AndGateVisualFactory {
  /** Shared open envelope geometry */
  protected override readonly lowGeometry = AndGateGeometry(2.6, 7.5, 0.16, 0.4, 16);
  /** Shared transient envelope geometry */
  protected override readonly transientGeometry = AndGateGeometry(2.6, 7.5, 0.76, 0.4, 16);
  /** Shared transient envelope geometry */
  protected override readonly highGeometry = AndGateGeometry(2.6, 7.5, 1.3, 0.4, 16);
  /** Shared geometry for negative marker **/
  protected static override readonly negativeMarkerGeometry = new THREE.CylinderGeometry(
    0.35,
    0.35,
    0.4,
    16,
    4,
    false,
    0,
    Math.PI * 2
  );

  override createVisual(component: Component): THREE.Object3D {
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 3, 2, 7.9);
    //hitbox.rotateY(Math.PI / 2);
    group.add(hitbox);

    // Visual Gate
    const envelopeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    envelopeMaterial.emissive.setHex(And8GateVisualFactory.HIGH_COLOR);
    envelopeMaterial.emissiveIntensity = 0;
    const envelope = new THREE.Mesh(this.lowGeometry, envelopeMaterial);
    envelope.userData = {
      type: 'component',
      componentId: component.id,
      part: 'envelope',
      initialState: 'low',
    };
    envelope.rotateX(-Math.PI / 2);
    envelope.rotateY(Math.PI);
    envelope.position.set(-0.1, 0.35, -0.1);
    group.add(envelope);

    // VCC pin group
    const vccGroup = this.createPinGroup(
      component.id,
      component.pins[0]!,
      'vcc',
      null,
      new THREE.Euler(0, 0, 0.5)
    );
    vccGroup.position.set(0.7, 0, 3.4);
    vccGroup.rotateX(Math.PI / 2);
    group.add(vccGroup);

    // inputs group
    const input1Group = this.createPinGroup(component.id, component.pins[1]!, 'input1');
    input1Group.position.set(1.2, 0, 3.2);
    input1Group.rotateZ(Math.PI / 2);
    input1Group.rotateX(Math.PI);
    group.add(input1Group);

    const input2Group = this.createPinGroup(component.id, component.pins[2]!, 'input2');
    input2Group.position.set(1.2, 0, 2.25);
    input2Group.rotateZ(Math.PI / 2);
    input2Group.rotateX(Math.PI);
    group.add(input2Group);

    const input3Group = this.createPinGroup(component.id, component.pins[3]!, 'input3');
    input3Group.position.set(1.2, 0, 1.29);
    input3Group.rotateZ(Math.PI / 2);
    input3Group.rotateX(Math.PI);
    group.add(input3Group);

    const input4Group = this.createPinGroup(component.id, component.pins[4]!, 'input4');
    input4Group.position.set(1.2, 0, 0.33);
    input4Group.rotateZ(Math.PI / 2);
    input4Group.rotateX(Math.PI);
    group.add(input4Group);

    const input5Group = this.createPinGroup(component.id, component.pins[5]!, 'input5');
    input5Group.position.set(1.2, 0, -0.63);
    input5Group.rotateZ(Math.PI / 2);
    input5Group.rotateX(Math.PI);
    group.add(input5Group);

    const input6Group = this.createPinGroup(component.id, component.pins[6]!, 'input6');
    input6Group.position.set(1.2, 0, -1.59);
    input6Group.rotateZ(Math.PI / 2);
    input6Group.rotateX(Math.PI);
    group.add(input6Group);

    const input7Group = this.createPinGroup(component.id, component.pins[7]!, 'input7');
    input7Group.position.set(1.2, 0, -2.55);
    input7Group.rotateZ(Math.PI / 2);
    input7Group.rotateX(Math.PI);
    group.add(input7Group);

    const input8Group = this.createPinGroup(component.id, component.pins[8]!, 'input8');
    input8Group.position.set(1.2, 0, -3.5);
    input8Group.rotateZ(Math.PI / 2);
    input8Group.rotateX(Math.PI);
    group.add(input8Group);

    // Emitter pin group
    const outputGroup = this.createPinGroup(component.id, component.pins[9]!, 'output');
    outputGroup.position.set(-1.39, 0, -0.05);
    outputGroup.rotateZ(Math.PI / 2);
    group.add(outputGroup);

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  /**
   * Get config form definition for Transistor (T026)
   *
   * @returns Form definition with activationLogic boolean field
   */
  override getConfigFormDefinition(): ConfigFormDefinition | null {
    return {
      fields: [
        {
          key: 'activationLogic',
          label: 'Activation Logic',
          type: 'boolean',
        },
        {
          key: 'transitionSpan',
          label: 'Transition Span (ticks)',
          type: 'number',
        },
        {
          key: 'initializationOrder',
          label: 'Init Order',
          type: 'number',
        },
      ],
    };
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>) {
    const envelopeMesh = this.findEnvelopeMesh(object3D);
    if (!envelopeMesh) return;

    let negativeMarkerMesh = this.findNegativeMarkerMesh(object3D);

    if (config.get('activationLogic') === 'negative') {
      envelopeMesh.userData.initialState = 'high';
      if (!negativeMarkerMesh) {
        negativeMarkerMesh = new THREE.Mesh(
          And8GateVisualFactory.negativeMarkerGeometry,
          And8GateVisualFactory.negativeMarkerMaterial
        );
        negativeMarkerMesh.userData = {
          type: 'component',
          componentId: envelopeMesh.userData.componentId,
          part: 'negativeMarker',
        };

        negativeMarkerMesh.position.set(-0.8, 0.15, -2.8);
        object3D.add(negativeMarkerMesh);
      }
    } else {
      envelopeMesh.userData.initialState = 'low';
      if (negativeMarkerMesh) {
        object3D.remove(negativeMarkerMesh);
      }
    }
    this.updateAnimation(object3D, null);
  }
}
