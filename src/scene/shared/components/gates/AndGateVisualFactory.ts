import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import type { Component, ComponentState, AndGateState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { AndGateGeometry } from '../../utils/GeometryUtils';
import type { ConfigFormDefinition } from '../../types';

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
export class AndGateVisualFactory extends ComponentVisualFactoryBase {
  /** Gate high color */
  protected static readonly HIGH_COLOR = 0xffffff;
  /** Gate high emissive intensity */
  protected static readonly HIGH_INTENSITY = 0.3;
  /** Shared open envelope geometry */
  protected readonly lowGeometry = AndGateGeometry(1.5, 1.6, 0.1, 0.4, 16);
  /** Shared transient envelope geometry */
  protected readonly transientGeometry = AndGateGeometry(1.5, 1.6, 0.45, 0.4, 16);
  /** Shared transient envelope geometry */
  protected readonly highGeometry = AndGateGeometry(1.5, 1.6, 0.799, 0.4, 16);
  /** Shared material for negative marker **/
  protected static readonly negativeMarkerMaterial = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
  });
  /** Shared geometry for negative marker **/
  protected static readonly negativeMarkerGeometry = new THREE.CylinderGeometry(
    0.2,
    0.2,
    0.4,
    16,
    4,
    false,
    0,
    Math.PI * 2
  );

  override defaultRotation() {
    return Math.PI;
  }

  createVisual(component: Component): THREE.Object3D {
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 2, 1.9);
    group.add(hitbox);

    // Visual Gate
    const envelopeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    envelopeMaterial.emissive.setHex(AndGateVisualFactory.HIGH_COLOR);
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
    envelope.position.set(0, 0.35, -0.1);
    group.add(envelope);

    // VCC pin group
    const vccGroup = this.createPinGroup(component.id, component.pins[0]!, 'vcc');
    vccGroup.position.set(0.15, 0, 0.69);
    vccGroup.rotateX(Math.PI / 2);
    group.add(vccGroup);

    // inputs group
    const input1Group = this.createPinGroup(component.id, component.pins[1]!, 'input1');
    input1Group.position.set(0.75, 0, 0.4);
    input1Group.rotateZ(Math.PI / 2);
    input1Group.rotateX(Math.PI);
    group.add(input1Group);

    const input2Group = this.createPinGroup(component.id, component.pins[2]!, 'input2');
    input2Group.position.set(0.75, 0, -0.6);
    input2Group.rotateZ(Math.PI / 2);
    input2Group.rotateX(Math.PI);
    group.add(input2Group);

    // Emitter pin group
    const outputGroup = this.createPinGroup(component.id, component.pins[3]!, 'output');
    outputGroup.position.set(-0.7, 0, -0.05);
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

  /**
   * Map core config to form data
   * Converts "positive"/"negative" strings to boolean
   *
   * @param config - Core component config
   * @returns Form data with boolean activationLogic
   */
  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    const activationLogic = config.get('activationLogic');
    formData.set('activationLogic', activationLogic === 'positive');
    formData.set('transitionSpan', parseFloat(config.get('transitionSpan') || '1'));
    formData.set('initializationOrder', parseFloat(config.get('initializationOrder') || '0'));
    return formData;
  }

  /**
   * Map form data to core config
   * Converts boolean to "positive"/"negative" strings
   *
   * @param formData - Form data with boolean activationLogic
   * @returns Core config with string activationLogic
   */
  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    const activationLogic = formData.get('activationLogic');
    config.set('activationLogic', activationLogic ? 'positive' : 'negative');
    config.set('transitionSpan', formData.get('transitionSpan').toString());
    config.set('initializationOrder', formData.get('initializationOrder').toString() || null);
    return config;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>) {
    const envelopeMesh = this.findEnvelopeMesh(object3D);
    if (!envelopeMesh) return;

    let negativeMarkerMesh = this.findNegativeMarkerMesh(object3D);

    if (config.get('activationLogic') === 'negative') {
      envelopeMesh.userData.initialState = 'high';
      if (!negativeMarkerMesh) {
        negativeMarkerMesh = new THREE.Mesh(
          AndGateVisualFactory.negativeMarkerGeometry,
          AndGateVisualFactory.negativeMarkerMaterial
        );
        negativeMarkerMesh.userData = {
          type: 'component',
          componentId: envelopeMesh.userData.componentId,
          part: 'negativeMarker',
        };

        negativeMarkerMesh.position.set(-0.7, 0.15, -0.7);
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

  /**
   * Update animation based on simulation state
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The component current simulation state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const envelopeMesh = this.findEnvelopeMesh(object3D);
    if (!envelopeMesh) return;
    if (!state) {
      if (envelopeMesh.userData.initialState === 'high') {
        envelopeMesh.geometry = this.highGeometry;
        envelopeMesh.material.emissiveIntensity = AndGateVisualFactory.HIGH_INTENSITY;
      } else {
        envelopeMesh.geometry = this.lowGeometry;
        envelopeMesh.material.emissiveIntensity = 0;
      }
      return;
    }

    const gateState = state as AndGateState;
    if (gateState.isHigh) {
      envelopeMesh.geometry = this.highGeometry;
      envelopeMesh.material.emissiveIntensity = AndGateVisualFactory.HIGH_INTENSITY;
    } else if (gateState.isInTransition) {
      envelopeMesh.geometry = this.transientGeometry;
      envelopeMesh.material.emissiveIntensity = 0.5 * AndGateVisualFactory.HIGH_INTENSITY;
    } else {
      envelopeMesh.geometry = this.lowGeometry;
      envelopeMesh.material.emissiveIntensity = 0;
    }
  }

  /**
   * Find the envelope mesh within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The envelope mesh if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'envelope'
   */
  protected findEnvelopeMesh(
    object3D: THREE.Object3D
  ): (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null {
    let envelopeMesh: (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'envelope') {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          envelopeMesh = child as THREE.Mesh & { material: THREE.MeshStandardMaterial };
        }
      }
    });
    return envelopeMesh;
  }

  /**
   * Find the negative marker mesh within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The negative marker mesh if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'negativeMarker'
   */
  protected findNegativeMarkerMesh(
    object3D: THREE.Object3D
  ): (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null {
    let negativeMarkerMesh: (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'negativeMarker') {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          negativeMarkerMesh = child as THREE.Mesh & { material: THREE.MeshStandardMaterial };
        }
      }
    });
    return negativeMarkerMesh;
  }
}
