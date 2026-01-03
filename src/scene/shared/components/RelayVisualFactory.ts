import { ComponentVisualFactoryBase } from './ComponentVisualFactory';
import type { Component } from '@/core/Component';
import type { ComponentState } from '@/core/simulation/states/ComponentState';
import type { RelayState } from '@/core/simulation/states/RelayState';
import type { ConfigFormDefinition } from '../types/ConfigTypes';
import * as THREE from 'three';

/**
 * Visual factory for Relay components
 *
 * Creates:
 * - Component hitbox for raycasting
 * - Cylinder representing the coil with two poles
 * - Output commanded switch with contactor
 * - Contactor (cylinder, rotatable for animation)
 * Animation:
 * - Rotates contactor based on open/closed state
 */
export class RelayVisualFactory extends ComponentVisualFactoryBase {
  /** Rotation for open relay (contactor misaligned) */
  private static readonly OPEN_ROTATION = new THREE.Euler(0.2, -0.6*Math.PI/2, 0.2);
  /** Rotation for opening/closing relay */
  private static readonly INTERMEDIATE_ROTATION = new THREE.Euler(0.1, -0.8*Math.PI/2, 0.1);
  /** Rotation for closed relay (contactor aligned) */
  private static readonly CLOSED_ROTATION = new THREE.Euler(0, -Math.PI/2, 0);
  /** Rotation for opening/closing negative activation logic relay */
  private static readonly INVERTED_INTERMEDIATE_ROTATION = new THREE.Euler(-0.1, -1.2*Math.PI/2, -0.1);
  /** Rotation for open negative activation logic relay (contactor misaligned toward the coil) */
  private static readonly INVERTED_OPEN_ROTATION = new THREE.Euler(-0.2, -1.4*Math.PI/2, -0.2);

  createVisual(component: Component): THREE.Object3D {
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 1, 2);
    group.add(hitbox);


    // Visual: input parts
    const coilGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 24);
    const coilMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const coil = new THREE.Mesh(coilGeometry, coilMaterial);
    coil.userData = {
      type: 'component',
      componentId: component.id,
      part: 'coil'
    };
    coil.rotateX(Math.PI / 2);
    coil.position.set(-0.7, 0, 0);
    group.add(coil);

    // cmd in pin
    const cmdInGroup = this.createPinGroup(
        component.id,
        component.pins[0]!,
        'cmd_in'
    );
    cmdInGroup.position.set(-0.8, 0, -0.6);
    cmdInGroup.rotateX(-Math.PI / 2);
    // addition to group after to avoid z-fighting

    // cmd out pin
    const cmdOutGroup = this.createPinGroup(
        component.id,
        component.pins[1]!,
        'cmd_out'
    );
    cmdOutGroup.position.set(-0.8, 0, 0.6);
    cmdOutGroup.rotateX(Math.PI / 2);
    group.add(cmdOutGroup);



    // Visual: output parts
    const powerInGeometry = new THREE.SphereGeometry(
      0.3,
      16,
      8,
      Math.PI / 2,
      Math.PI,
      0,
      Math.PI
    );
    const powerMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const powerInPole = new THREE.Mesh(powerInGeometry, powerMaterial);
    powerInPole.userData = {
      type: 'component',
      componentId: component.id,
    };
    powerInPole.rotateY(-Math.PI / 2);
    powerInPole.position.set(0.6, 0, -0.5);
    group.add(powerInPole);

    //  power in pin
    const powerInGroup = this.createPinGroup(component.id, component.pins[2]!, 'power_in');
    powerInGroup.position.set(0.6, 0, -0.5);
    powerInGroup.rotateZ(Math.PI/2);
    powerInGroup.rotateX(-Math.PI/2);
    // to avoid z-fighting
    powerInGroup.renderOrder = 1;
    powerInGroup.children.forEach(child => {child.renderOrder=1;})
    group.add(powerInGroup);
    group.add(cmdInGroup);

    const powerOutGeometry = new THREE.BoxGeometry(0.2, 0.3, 1);
    const powerOutPole = new THREE.Mesh(powerOutGeometry, powerMaterial);
    powerOutPole.userData = {
      type: 'component',
      componentId: component.id,
    };
    powerOutPole.rotateY(Math.PI / 2);
    powerOutPole.position.set(0.5, 0, 0.9);
    group.add(powerOutPole);

    // power out pin
    const powerOutGroup = this.createPinGroup(component.id, component.pins[3]!, 'power_out');
    powerOutGroup.position.set(0.6, 0, 1);
    powerOutGroup.rotateZ(-Math.PI / 2);
    powerOutGroup.rotateX(Math.PI/2);
    group.add(powerOutGroup);

    // Contactor
    const contactorGroup = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1, 1),
        //new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2 })
      new THREE.MeshBasicMaterial({
        transparent: false,
        visible: false,
      })
    );
    contactorGroup.userData = {
      type: 'component',
      componentId: component.id,
      part: 'contactor',
      initialState: 'open'
    };

    const contactorMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const contactorGeometry = new THREE.CylinderGeometry(
      0.2,
      0.12,
      1.3,
      8,
      4,
      false,
      0,
      Math.PI * 2
    );
    const contactor = new THREE.Mesh(contactorGeometry, contactorMaterial);
    contactor.rotateX(-Math.PI / 2);
    contactor.rotateZ(Math.PI / 2);
    contactor.position.set(0.75, 0, 0);
    contactorGroup.add(contactor);

    group.add(contactorGroup);
    contactorGroup.position.set(0.6, 0, -0.6);
    contactorGroup.rotation.copy(RelayVisualFactory.OPEN_ROTATION);

    // take config into account
    this.updateFromConfiguration(group, component.config);
    return group;
  }

  /**
   * Get config form definition for Relay (T025)
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
          key: 'size',
          label: 'Size',
          type: 'number',
        }
      ],
    };
  }

  /**
   * Map core config to form data (T025)
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
    formData.set('size', parseFloat(config.get('size') || '1'));
    return formData;
  }

  /**
   * Map form data to core config (T025)
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
    config.set('size', formData.get('size').toString());
    return config;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>){
    const contactorGroup = this.findContactorGroup(object3D);
    if(contactorGroup){
      if(config.get('activationLogic') === 'negative'){
        contactorGroup.userData.initialState = 'closed';
      }
      else {
        contactorGroup.userData.initialState = 'open';
      }
    }
    const scale = parseFloat(config.get('size') || '1');
    object3D.scale.set(scale, scale, scale);
    this.updateAnimation(object3D, null);
  }

  /**
   * Update relay animation based on simulation state
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The Relay's current simulation state
   *
   * @remarks
   * Rotates the contactor group to visually represent open/closed state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const contactorGroup = this.findContactorGroup(object3D);
    const coil = this.findCoil(object3D);

    if(!state){
        // Edition mode - set to initial state
        if (contactorGroup) {
            if (contactorGroup.userData.initialState === 'closed') {
                contactorGroup.rotation.copy(RelayVisualFactory.CLOSED_ROTATION);
            }
            else {
                contactorGroup.rotation.copy(RelayVisualFactory.OPEN_ROTATION);
            }
        }
        if(coil && coil.material instanceof THREE.MeshStandardMaterial){
          coil.material.emissive.setHex(0x000000);
          coil.material.emissiveIntensity = 0;
          coil.userData.materialLocked = false;
        }
        return;
    }

    const relayState = state as RelayState;
    if (contactorGroup) {
      if (relayState.isInTransition) {
        const targetRotation = contactorGroup.userData.initialState === 'closed' ?
            RelayVisualFactory.INVERTED_INTERMEDIATE_ROTATION : RelayVisualFactory.INTERMEDIATE_ROTATION;
        contactorGroup.rotation.copy(targetRotation);
      } else if (relayState.isClosed) {
        // Closed position - contactor aligned
        contactorGroup.rotation.copy(RelayVisualFactory.CLOSED_ROTATION);
      } else {
        // Open position - contactor misaligned
        const targetRotation = contactorGroup.userData.initialState === 'closed' ?
            RelayVisualFactory.INVERTED_OPEN_ROTATION : RelayVisualFactory.OPEN_ROTATION;
        contactorGroup.rotation.copy(targetRotation);
      }
    }

    if (coil && coil.material instanceof THREE.MeshStandardMaterial) {
      if (relayState.isInTransition) {
        coil.material.emissive.setHex(0xff00ff);
        coil.material.emissiveIntensity = 0.6;
        coil.userData.materialLocked = true;
      } else if (relayState.isClosed) {
        coil.material.emissive.setHex(0xff00ff);
        coil.material.emissiveIntensity = 1;
        coil.userData.materialLocked = true;
      } else {
        coil.material.emissive.setHex(0x000000);
        coil.material.emissiveIntensity = 0;
        coil.userData.materialLocked = false;
      }
    }

  }

  /**
   * Find the contactor group within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The contactor's parent group if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'contactor' and returns its parent
   */
  private findContactorGroup(object3D: THREE.Object3D): THREE.Object3D | null {
    let contactorGroup: THREE.Object3D | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'contactor') {
        contactorGroup = child;
      }
    });

    return contactorGroup;
  }

  /**
   * Find the coil within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The contactor's parent group if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'coil' and returns its parent
   */
  private findCoil(object3D: THREE.Object3D): THREE.Mesh | null {
    let coil: THREE.Object3D | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'coil') {
        coil = child;
      }
    });
    return coil;
  }

}
