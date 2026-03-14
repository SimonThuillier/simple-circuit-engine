import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import {
  type Component,
  type ComponentState,
  type DoubleThrowSwitchState,
} from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type { ConfigFormDefinition, VisualContext } from '../../types';

/**
 * Visual factory for Double Switch components
 *
 * Creates:
 * - 2 * Input pole (sphere)
 * - Output pole (box)
 * - Contactor (cylinder, rotatable for animation)
 * - Input pin group
 * - Output pin group
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Rotates contactor based on open/closed state
 */
export class DoubleThrowSwitchVisualFactory extends ComponentVisualFactoryBase {
  /** Rotation for switch to input 1 */
  private readonly INPUT1_ROTATION = new THREE.Euler(0, 0.32, 0);
  /** Rotation for switch toggling */
  private readonly INTERMEDIATE_ROTATION = new THREE.Euler(0,0,0);
  /** Rotation for switch to input 2 */
  private readonly INPUT2_ROTATION = new THREE.Euler(0, -0.32, 0);

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 1.6, 3, 1.6);
    group.add(hitbox);
    hitbox.position.set(-0.2,0,0);

    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    // Contactor
    const contactorGroup = new THREE.Group();
    contactorGroup.userData = {
      type: 'component',
      componentId: component.id,
      part: 'contactor',
      initialState: 'input1',
    };
    contactorGroup.position.set(0.6, 0, 0);
    contactorGroup.rotation.copy(this.INPUT1_ROTATION);
    group.add(contactorGroup);

    const contactorGeometry = new THREE.BoxGeometry(1.4, 0.6, 0.1);
    const contactor = new THREE.Mesh(contactorGeometry, material);
    contactor.position.set(-0.7, 0, 0);

    contactorGroup.add(contactor);

    // pins (not called if preview - no pins)
    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group, material);
    }

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  private createPinsVisual(
      component: Component,
      context: VisualContext,
      group: THREE.Group,
      material: THREE.MeshStandardMaterial) {

    const input1Node = context.getENode(component.pins[0]!);
    if (input1Node) {
      const input1PinGroup =
          this.createPinGroup(input1Node, 'left', new THREE.Euler(0.4, 0, 0));
      input1PinGroup.position.set(-1, 0, 0.5);
      group.add(input1PinGroup);

      const input1PinCounterpart =
          this.createPinCounterpart(input1PinGroup, material);
      if(!!input1PinCounterpart){
        group.add(input1PinCounterpart);
      }
    }

    const input2Node = context.getENode(component.pins[1]!);
    if (input2Node) {
      const input2PinGroup =
          this.createPinGroup(input2Node,'left', new THREE.Euler(-0.4, 0, 0));
      input2PinGroup.position.set(-1, 0, -0.5);
      group.add(input2PinGroup);

      const input2PinCounterpart =
          this.createPinCounterpart(input2PinGroup, material);
      if(!!input2PinCounterpart){
        group.add(input2PinCounterpart);
      }
    }

    const input3Node = context.getENode(component.pins[2]!);
    if (input3Node) {
      const input3PinGroup =
          this.createPinGroup(input3Node,'right');
      input3PinGroup.position.set(0.6, 0, 0);
      group.add(input3PinGroup);

      const input3PinCounterpart =
          this.createPinCounterpart(input3PinGroup, material);
      if(!!input3PinCounterpart){
        group.add(input3PinCounterpart);
      }
    }
  }

  /**
   * Get config form definition for Double Switch
   *
   * @returns Form definition with initialState boolean field
   */
  override getConfigFormDefinition(): ConfigFormDefinition | null {
    return {
      fields: [
        {
          key: 'initialState',
          label: 'input1 at start',
          type: 'boolean',
        },
        {
          key: 'size',
          label: 'Size',
          type: 'number',
          min: 1,
          max: 16,
          step: 1,
        },
      ],
    };
  }

  /**
   * Map core config to form data (T024)
   * Converts "input1"/"input2" strings to boolean
   *
   * @param config - Core component config
   * @returns Form data with boolean initialState
   */
  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    const initialState = config.get('initialState');
    formData.set('initialState', initialState === 'input1');
    formData.set('size', parseFloat(config.get('size') || '1'));
    return formData;
  }

  /**
   * Map form data to core config (T024)
   * Converts boolean to "input1"/"input2" strings
   *
   * @param formData - Form data with boolean initialState
   * @returns Core config with string initialState
   */
  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    const initialState = formData.get('initialState');
    config.set('initialState', initialState ? 'input1' : 'input2');
    config.set('size', formData.get('size').toString());
    return config;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>) {
    const contactorGroup = this.findContactorGroup(object3D);
    if (!contactorGroup) return;

    if (config.get('initialState') === 'input2') {
      contactorGroup.userData.initialState = 'input2';
    } else {
      contactorGroup.userData.initialState = 'input1';
    }

    const scale = parseFloat(config.get('size') || '1');
    object3D.scale.set(scale, scale, scale);
    this.updateAnimation(object3D, null);
  }

  /**
   * Update switch animation based on simulation state
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The Switch's current simulation state, or null in edition mode
   *
   * @remarks
   * Rotates the contactor group to visually represent input1/2 state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const contactorGroup = this.findContactorGroup(object3D);

    if (!contactorGroup) return;
    if (!state) {
      if (contactorGroup.userData.initialState === 'input1') {
        contactorGroup.rotation.copy(this.INPUT1_ROTATION);
      } else {
        contactorGroup.rotation.copy(this.INPUT2_ROTATION);
      }
      return;
    }

    const switchState = state as DoubleThrowSwitchState;
    if (switchState.isInTransition) {
      contactorGroup.rotation.copy(this.INTERMEDIATE_ROTATION);
    } else if (switchState.state === 'input1') {
      contactorGroup.rotation.copy(this.INPUT1_ROTATION);
    } else {
      contactorGroup.rotation.copy(this.INPUT2_ROTATION);
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
      if (child instanceof THREE.Group && child.userData.part === 'contactor') {
        contactorGroup = child;
      }
    });

    return contactorGroup;
  }
}
