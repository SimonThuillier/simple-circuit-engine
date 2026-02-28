import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { type Component, type ComponentState, BufferState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { CyclicTrapezoidGeometry } from '../../utils/GeometryUtils';
import type { ConfigFormDefinition } from '../../types';

/**
 * Visual factory for Buffer/Inverter components
 *
 * Creates:
 * - Buffer trapezoid or Inverter triangle extrude geom mesh
 * - Vcc, input and output pin group
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Emissive glow when component is high (based on simulation state)
 */
export class BufferVisualFactory extends ComponentVisualFactoryBase {
  /** Buffer high color (white glow) */
  private static readonly HIGH_COLOR = 0xffffff;
  /** Buffer high emissive intensity */
  private static readonly HIGH_INTENSITY = 0.3;

  /** Shared low Buffer envelope geometry */
  private readonly bufferLowGeometry = CyclicTrapezoidGeometry(1, 1.6, 0.61, 0.08, 0.4, 16);
  /** Shared transient Buffer envelope geometry */
  private readonly bufferTransientGeometry = CyclicTrapezoidGeometry(1, 1.6, 0.61, 0.23, 0.4, 16);
  /** Shared high Buffer envelope geometry */
  private readonly bufferHighGeometry = CyclicTrapezoidGeometry(1, 1.6, 0.61, 0.5, 0.4, 16);
  /** Shared low Inverter envelope geometry */
  private readonly inverterLowGeometry = CyclicTrapezoidGeometry(0.8, 1.6, 0, 0.08, 0.4, 16);
  /** Shared transient Inverter envelope geometry */
  private readonly inverterTransientGeometry = CyclicTrapezoidGeometry(0.8, 1.6, 0, 0.17, 0.4, 16);
  /** Shared high Inverter envelope geometry */
  private readonly inverterHighGeometry = CyclicTrapezoidGeometry(0.8, 1.6, 0, 0.4, 0.4, 16);
  /** Shared geometry for negative marker **/
  protected readonly negativeMarkerGeometry = new THREE.SphereGeometry(
    0.3,
    16,
    8,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2
  );

  createVisual(component: Component): THREE.Object3D {
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 1.8, 2, 1.8);
    group.add(hitbox);

    // Visual Buffer
    this.replaceEnvelope(group, true);

    // vcc pin group
    const vccGroup = this.createPinGroup(
      component.id,
      component.pins[0]!,
      'vcc',
      null,
      new THREE.Euler(0, 0, -0.5)
    );
    vccGroup.rotateX(-Math.PI / 2);
    group.add(vccGroup);

    // input pin group
    const inputGroup = this.createPinGroup(component.id, component.pins[1]!, 'input');
    inputGroup.position.set(-0.5, 0, 0);
    inputGroup.rotateZ(Math.PI / 2);
    inputGroup.rotateY(Math.PI);
    group.add(inputGroup);

    // output pin group
    const outputGroup = this.createPinGroup(component.id, component.pins[2]!, 'output');
    outputGroup.position.set(0.45, 0, 0);
    outputGroup.rotateX(Math.PI / 2);
    outputGroup.rotateZ(-Math.PI / 2);
    group.add(outputGroup);

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  private replaceEnvelope(group: THREE.Object3D, activationLogic: boolean): THREE.Mesh {
    let envelopeMaterial: THREE.MeshStandardMaterial | null = null;
    const oldEnvelope = this.findEnvelopeMesh(group);
    if (oldEnvelope) {
      // case where envelope of the good type (buffer or inverter) already exists
      if (activationLogic === oldEnvelope.userData.activationLogic) {
        return oldEnvelope;
      }
      // else we remove the old envelope before recreating it
      envelopeMaterial = oldEnvelope.material;
      group.remove(oldEnvelope);
    }
    // if old material doesn't exist create it
    if (!envelopeMaterial) {
      envelopeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
      envelopeMaterial.emissive.setHex(BufferVisualFactory.HIGH_COLOR);
      envelopeMaterial.emissiveIntensity = 0;
    }

    const envelope = activationLogic
      ? new THREE.Mesh(this.bufferLowGeometry, envelopeMaterial)
      : new THREE.Mesh(this.inverterHighGeometry, envelopeMaterial);
    envelope.userData = {
      type: 'component',
      componentId: group.userData.componentId,
      part: 'envelope',
      activationLogic: activationLogic,
      initialState: activationLogic ? 'low' : 'high',
    };
    envelope.rotateX(-Math.PI / 2);
    const envX = activationLogic ? -0.05 : -0.1;
    envelope.position.set(envX, -0.05, 0);
    group.add(envelope);
    return envelope;
  }

  /**
   * Get config form definition for Buffer
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
   * Map core config to form data (T026)
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
   * Map form data to core config (T026)
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
    const vccVisual = this.findPinVisual(object3D, 'vcc');

    if (config.get('activationLogic') === 'negative') {
      const envelope = this.replaceEnvelope(object3D, false);
      if (!negativeMarkerMesh) {
        negativeMarkerMesh = new THREE.Mesh(
          this.negativeMarkerGeometry,
          envelope.material as THREE.MeshStandardMaterial
        );
        negativeMarkerMesh.userData = {
          type: 'component',
          componentId: envelopeMesh.userData.componentId,
          part: 'negativeMarker',
        };
        negativeMarkerMesh.rotateZ(Math.PI / 2);
        negativeMarkerMesh.rotateY(Math.PI);
        negativeMarkerMesh.position.set(0.45, 0, 0);
        object3D.add(negativeMarkerMesh);

        if (!!vccVisual) {
          vccVisual.setRotationFromEuler(new THREE.Euler(0, 0, -0.8));
          vccVisual.parent!.position.set(-0.27, 0, -0.55);
        }
      }
    } else {
      this.replaceEnvelope(object3D, true);
      if (negativeMarkerMesh) {
        object3D.remove(negativeMarkerMesh);
      }

      if (!!vccVisual) {
        vccVisual.setRotationFromEuler(new THREE.Euler(0, 0, -0.5));
        vccVisual.parent!.position.set(-0.27, 0, -0.65);
      }
    }
    this.updateAnimation(object3D, null);
  }

  /**
   * Update Buffer animation based on simulation state
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The Buffer's current simulation state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const envelopeMesh = this.findEnvelopeMesh(object3D);
    if (!envelopeMesh) return;

    const isBuffer = envelopeMesh.userData.activationLogic === true;
    const lowGeometry = isBuffer ? this.bufferLowGeometry : this.inverterLowGeometry;
    const transientGeometry = isBuffer
      ? this.bufferTransientGeometry
      : this.inverterTransientGeometry;
    const highGeometry = isBuffer ? this.bufferHighGeometry : this.inverterHighGeometry;

    if (!state) {
      if (envelopeMesh.userData.initialState === 'high') {
        envelopeMesh.geometry = highGeometry;
        envelopeMesh.material.emissiveIntensity = BufferVisualFactory.HIGH_INTENSITY;
      } else {
        envelopeMesh.geometry = lowGeometry;
        envelopeMesh.material.emissiveIntensity = 0;
      }
      return;
    }

    const bufferState = state as BufferState;
    if (bufferState.isHigh) {
      envelopeMesh.geometry = highGeometry;
      envelopeMesh.material.emissiveIntensity = BufferVisualFactory.HIGH_INTENSITY;
    } else if (bufferState.isInTransition) {
      envelopeMesh.geometry = transientGeometry;
      envelopeMesh.material.emissiveIntensity = 0.5 * BufferVisualFactory.HIGH_INTENSITY;
    } else {
      envelopeMesh.geometry = lowGeometry;
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
  private findEnvelopeMesh(
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
