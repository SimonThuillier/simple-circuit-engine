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
export class And4GateVisualFactory extends AndGateVisualFactory {
  /** Shared open envelope geometry */
  protected override readonly lowGeometry = AndGateGeometry(2, 3.6, 0.13, 0.4, 16);
  /** Shared transient envelope geometry */
  protected override readonly transientGeometry = AndGateGeometry(2, 3.6, 0.55, 0.4, 16);
  /** Shared transient envelope geometry */
  protected override readonly highGeometry = AndGateGeometry(2, 3.6, 1, 0.4, 16);
  /** Shared geometry for negative marker **/
  protected static override readonly negativeMarkerGeometry = new THREE.CylinderGeometry(
    0.25,
    0.25,
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
    const hitbox = this.createComponentHitbox(component.id, group.id, 2.5, 2, 3.9);
    //hitbox.rotateY(Math.PI / 2);
    group.add(hitbox);

    // Visual Gate
    const envelopeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    envelopeMaterial.emissive.setHex(And4GateVisualFactory.HIGH_COLOR);
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
    envelope.position.set(-0.25, 0.35, -0.1);
    group.add(envelope);

    // VCC pin group
    const vccGroup = this.createPinGroup(
      component.id,
      component.pins[0]!,
      'vcc',
      null,
      new THREE.Euler(0, 0, 0.23)
    );
    vccGroup.position.set(0.15, 0, 1.63);
    vccGroup.rotateX(Math.PI / 2);
    group.add(vccGroup);

    // inputs group
    const input1Group = this.createPinGroup(component.id, component.pins[1]!, 'input1');
    input1Group.position.set(0.75, 0, 1.4);
    input1Group.rotateZ(Math.PI / 2);
    input1Group.rotateX(Math.PI);
    group.add(input1Group);

    const input2Group = this.createPinGroup(component.id, component.pins[2]!, 'input2');
    input2Group.position.set(0.75, 0, 0.4);
    input2Group.rotateZ(Math.PI / 2);
    input2Group.rotateX(Math.PI);
    group.add(input2Group);

    const input3Group = this.createPinGroup(component.id, component.pins[3]!, 'input3');
    input3Group.position.set(0.75, 0, -0.6);
    input3Group.rotateZ(Math.PI / 2);
    input3Group.rotateX(Math.PI);
    group.add(input3Group);

    const input4Group = this.createPinGroup(component.id, component.pins[4]!, 'input4');
    input4Group.position.set(0.75, 0, -1.6);
    input4Group.rotateZ(Math.PI / 2);
    input4Group.rotateX(Math.PI);
    group.add(input4Group);

    // Emitter pin group
    const outputGroup = this.createPinGroup(component.id, component.pins[5]!, 'output');
    outputGroup.position.set(-1.22, 0, -0.05);
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
          And4GateVisualFactory.negativeMarkerGeometry,
          And4GateVisualFactory.negativeMarkerMaterial
        );
        negativeMarkerMesh.userData = {
          type: 'component',
          componentId: envelopeMesh.userData.componentId,
          part: 'negativeMarker',
        };

        negativeMarkerMesh.position.set(-1, 0.15, -1.4);
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
