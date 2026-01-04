import { ComponentVisualFactoryBase } from './ComponentVisualFactory';
import type { Component } from '@/core/Component';
import type { ComponentState } from '@/core/simulation/states/ComponentState';
import type { TransistorState } from '@/core/simulation/states/TransistorState';
import type { ConfigFormDefinition } from '../types/ConfigTypes';
import * as THREE from 'three';
import {RingGeometry} from "../GeometryUtils";

/**
 * Visual factory for Transistor components
 *
 * Creates:
 * - Transistor Ring mesh
 * - Transistor filler cylinder mesh
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
  /** Shared Transistor envelope geometry */
  private readonly envelopeGeometry = RingGeometry(0.4, 0.5, 0.4, 16);
  /** Shared Transistor filler geometry */
  private readonly fillerGeometry = new THREE.CylinderGeometry(
      0.42,
      0.42,
      0.44,
      12,
      1,
      false, 0, Math.PI * 2);

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
    const envelope = new THREE.Mesh(this.envelopeGeometry, envelopeMaterial);
    envelope.userData = {
      type: 'component',
      componentId: component.id,
      part: 'envelope',
    };
    envelope.rotateX(-Math.PI / 2);
    envelope.position.set(0, -0.05, 0);
    group.add(envelope);

    const fillerMaterial = new THREE.MeshStandardMaterial({
      color: TransistorVisualFactory.TRANSISTOR_CLOSED_COLOR,
      transparent: true,
      opacity: 0,
      visible: false
    });
    const filler = new THREE.Mesh(this.fillerGeometry, fillerMaterial);
    filler.userData = {
      type: 'component',
      componentId: component.id,
      part: 'filler',
      initialState: 'open'
    };
    filler.position.set(0, 0.12, 0);
    group.add(filler);

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
    emitterGroup.rotateX(Math.PI / 2)
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
          key: 'initializationPriority',
          label: 'Init Priority',
          type: 'number',
        }
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
    formData.set('initializationPriority', parseFloat(config.get('initializationPriority') || '0'));
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
    config.set('initializationPriority', formData.get('initializationPriority').toString() || null);
    return config;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>){
    const fillerMesh = this.findFillerMesh(object3D);
    if(!fillerMesh) return;

    if(config.get('activationLogic') === 'negative'){
      fillerMesh.userData.initialState = 'closed';
    }
    else {
      fillerMesh.userData.initialState = 'open';
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
    const fillerMesh = this.findFillerMesh(object3D);
    if (!fillerMesh) return;
    if(!state){
      if(fillerMesh.userData.initialState === 'closed'){
        fillerMesh.position.set(0, 0.18, 0);
        fillerMesh.material.visible=true;
        fillerMesh.material.opacity = 1;
        fillerMesh.material.emissive.setHex(TransistorVisualFactory.TRANSISTOR_CLOSED_COLOR);
        fillerMesh.material.emissiveIntensity = TransistorVisualFactory.TRANSISTOR_CLOSED_INTENSITY;
      }
      else {
        fillerMesh.position.set(0, 0.12, 0);
        fillerMesh.material.visible=false;
        fillerMesh.material.opacity = 0;
        fillerMesh.material.emissive.setHex(0x000000);
        fillerMesh.material.emissiveIntensity = 0;
      }
      return;
    }

    const transistorState = state as TransistorState;
    if (transistorState.isClosed) {
      fillerMesh.userData.materialLocked = true;
      fillerMesh.position.set(0, 0.18, 0);
      fillerMesh.material.visible=true;
      fillerMesh.material.opacity = 1;
      fillerMesh.material.emissive.setHex(TransistorVisualFactory.TRANSISTOR_CLOSED_COLOR);
      fillerMesh.material.emissiveIntensity = TransistorVisualFactory.TRANSISTOR_CLOSED_INTENSITY;
    }
    else if (transistorState.isInTransition) {
      fillerMesh.userData.materialLocked = true;
      fillerMesh.position.set(0, 0.15, 0);
      fillerMesh.material.visible=true;
      fillerMesh.material.opacity = 0.6;
      fillerMesh.material.emissive.setHex(TransistorVisualFactory.TRANSISTOR_CLOSED_COLOR);
      fillerMesh.material.emissiveIntensity = TransistorVisualFactory.TRANSISTOR_CLOSED_INTENSITY/1.8;
    }
    else {
      fillerMesh.userData.materialLocked = false;
      fillerMesh.position.set(0, 0.12, 0);
      fillerMesh.material.visible=false;
      fillerMesh.material.opacity = 0;
      fillerMesh.material.emissive.setHex(0x000000);
      fillerMesh.material.emissiveIntensity = 0;
    }
  }

  /**
   * Find the filler mesh within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The filler mesh if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'filler'
   */
  private findFillerMesh(
      object3D: THREE.Object3D
  ): (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null {
    let fillerMesh: (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'filler') {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          fillerMesh = child as THREE.Mesh & { material: THREE.MeshStandardMaterial };
        }
      }
    });

    return fillerMesh;
  }
}
