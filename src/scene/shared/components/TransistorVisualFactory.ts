import { ComponentVisualFactoryBase } from './ComponentVisualFactory';
import type { Component, ComponentState, TransistorState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { RingGeometry } from '../utils/GeometryUtils';
import type { ConfigFormDefinition } from '../types';

/**
 * Visual factory for Transistor components
 *
 * Creates:
 * - Transistor Ring mesh
 * - Collector, Base and Emitter pin group
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Emissive glow when Transistor is lit (based on simulation state)
 */
export class TransistorVisualFactory extends ComponentVisualFactoryBase {
  /** Transistor lit color (yellow glow) */
  private static readonly TRANSISTOR_CLOSED_COLOR = 0xffffff;
  /** Transistor lit emissive intensity */
  private static readonly TRANSISTOR_CLOSED_INTENSITY = 0.3;
  /** Shared open Transistor envelope geometry */
  private readonly openGeometry = RingGeometry(0.4, 0.5, 0.4, 16);
  /** Shared transient Transistor envelope geometry */
  private readonly transientGeometry = RingGeometry(0.2, 0.5, 0.4, 16);
  /** Shared transient Transistor envelope geometry */
  private readonly closedGeometry = RingGeometry(0.01, 0.5, 0.4, 16);

  createVisual(component: Component): THREE.Object3D {
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 1.3, 2, 1.3);
    group.add(hitbox);

    // Visual Transistor
    const envelopeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    envelopeMaterial.emissive.setHex(TransistorVisualFactory.TRANSISTOR_CLOSED_COLOR);
    envelopeMaterial.emissiveIntensity = 0;
    const envelope = new THREE.Mesh(this.openGeometry, envelopeMaterial);
    envelope.userData = {
      type: 'component',
      componentId: component.id,
      part: 'envelope',
      initialState: 'open',
    };
    envelope.rotateX(-Math.PI / 2);
    envelope.position.set(0, -0.05, 0);
    group.add(envelope);

    // Collector pin group
    const collectorGroup = this.createPinGroup(component.id, component.pins[0]!, 'collector');
    collectorGroup.position.set(0.05, 0, -0.4);
    collectorGroup.rotateX(-Math.PI / 2);
    group.add(collectorGroup);

    // Base pin group
    const baseGroup = this.createPinGroup(component.id, component.pins[1]!, 'base');
    baseGroup.position.set(-0.45, 0, 0);
    baseGroup.rotateZ(Math.PI / 2);
    baseGroup.rotateY(Math.PI);
    group.add(baseGroup);

    // Emitter pin group
    const emitterGroup = this.createPinGroup(component.id, component.pins[2]!, 'emitter');
    emitterGroup.position.set(0.05, 0, 0.4);
    emitterGroup.rotateX(Math.PI / 2);
    group.add(emitterGroup);

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
    // const fillerMesh = this.findFillerMesh(object3D);
    // if(!fillerMesh) return;
    const envelopeMesh = this.findEnvelopeMesh(object3D);
    if (!envelopeMesh) return;

    if (config.get('activationLogic') === 'negative') {
      envelopeMesh.userData.initialState = 'closed';
    } else {
      envelopeMesh.userData.initialState = 'open';
    }
    this.updateAnimation(object3D, null);
  }

  /**
   * Update Transistor animation based on simulation state
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The Transistor's current simulation state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const envelopeMesh = this.findEnvelopeMesh(object3D);
    if (!envelopeMesh) return;
    if (!state) {
      if (envelopeMesh.userData.initialState === 'closed') {
        envelopeMesh.geometry = this.closedGeometry;
        envelopeMesh.material.emissiveIntensity =
          TransistorVisualFactory.TRANSISTOR_CLOSED_INTENSITY;
      } else {
        envelopeMesh.geometry = this.openGeometry;
        envelopeMesh.material.emissiveIntensity = 0;
      }
      return;
    }

    const transistorState = state as TransistorState;
    if (transistorState.isClosed) {
      envelopeMesh.geometry = this.closedGeometry;
      envelopeMesh.material.emissiveIntensity = TransistorVisualFactory.TRANSISTOR_CLOSED_INTENSITY;
    } else if (transistorState.isInTransition) {
      envelopeMesh.geometry = this.transientGeometry;
      envelopeMesh.material.emissiveIntensity =
        0.5 * TransistorVisualFactory.TRANSISTOR_CLOSED_INTENSITY;
    } else {
      envelopeMesh.geometry = this.openGeometry;
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
}
