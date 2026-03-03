import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import type { Component, ComponentState, SwitchState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type { ConfigFormDefinition, VisualContext } from '../../types';

/**
 * Visual factory for Switch components
 *
 * Creates:
 * - Input pole (sphere)
 * - Output pole (box)
 * - Contactor (cylinder, rotatable for animation)
 * - Input pin group
 * - Output pin group
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Rotates contactor based on open/closed state
 */
export class SwitchVisualFactory extends ComponentVisualFactoryBase {
  /** Rotation for closed switch (contactor aligned) */
  private readonly CLOSED_ROTATION = new THREE.Euler(0, 0, 0);
  /** Rotation for opening/closing switch */
  private readonly INTERMEDIATE_ROTATION = new THREE.Euler(0, 0.3, 0);
  /** Rotation for open switch (contactor misaligned) */
  private readonly OPEN_ROTATION = new THREE.Euler(0, 0.6, 0);

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 1.6, 3, 1);
    group.add(hitbox);
    hitbox.position.set(-0.2,0,0.3);

    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    // Contactor
    const contactorGroup = new THREE.Group();
    contactorGroup.userData = {
      type: 'component',
      componentId: component.id,
      part: 'contactor',
      initialState: 'open',
    };
    contactorGroup.position.set(0.6, 0, 0);
    contactorGroup.rotation.copy(this.OPEN_ROTATION);
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
    const inputNode = context.getENode(component.pins[0]!);
    if (inputNode) {
      const inputPinGroup = this.createPinGroup(inputNode,'left');
      inputPinGroup.position.set(-1, 0, 0);
      group.add(inputPinGroup);

      const inputPinCounterpart =
          this.createPinCounterpart(inputPinGroup, material);
      if(!!inputPinCounterpart){
        group.add(inputPinCounterpart);
      }
    }

    const outputNode = context.getENode(component.pins[1]!);
    if (outputNode) {
      const outputPinGroup = this.createPinGroup(outputNode, 'right');
      outputPinGroup.position.set(0.6, 0, 0);
      group.add(outputPinGroup);

      const outputPinCounterpart =
          this.createPinCounterpart(outputPinGroup, material);
      if(!!outputPinCounterpart){
        group.add(outputPinCounterpart);
      }
    }
  }

  /**
   * Get config form definition for Switch (T024)
   *
   * @returns Form definition with initialState boolean field
   */
  override getConfigFormDefinition(): ConfigFormDefinition | null {
    return {
      fields: [
        {
          key: 'initialState',
          label: 'Open at start',
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
   * Converts "open"/"closed" strings to boolean
   *
   * @param config - Core component config
   * @returns Form data with boolean initialState
   */
  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    const initialState = config.get('initialState');
    formData.set('initialState', initialState === 'open');
    formData.set('size', parseFloat(config.get('size') || '1'));
    return formData;
  }

  /**
   * Map form data to core config (T024)
   * Converts boolean to "open"/"closed" strings
   *
   * @param formData - Form data with boolean initialState
   * @returns Core config with string initialState
   */
  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    const initialState = formData.get('initialState');
    config.set('initialState', initialState ? 'open' : 'closed');
    config.set('size', formData.get('size').toString());
    return config;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>) {
    const contactorGroup = this.findContactorGroup(object3D);
    if (!contactorGroup) return;

    if (config.get('initialState') === 'closed') {
      contactorGroup.userData.initialState = 'closed';
    } else {
      contactorGroup.userData.initialState = 'open';
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
   * Rotates the contactor group to visually represent open/closed state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const contactorGroup = this.findContactorGroup(object3D);
    if (!contactorGroup) return;
    if (!state) {
      if (contactorGroup.userData.initialState === 'closed') {
        contactorGroup.rotation.copy(this.CLOSED_ROTATION);
      } else {
        contactorGroup.rotation.copy(this.OPEN_ROTATION);
      }
      return;
    }

    const switchState = state as SwitchState;
    if (switchState.isInTransition) {
      contactorGroup.rotation.copy(this.INTERMEDIATE_ROTATION);
    } else if (switchState.isClosed) {
      // Closed position - contactor aligned
      contactorGroup.rotation.copy(this.CLOSED_ROTATION);
    } else {
      // Open position - contactor misaligned
      contactorGroup.rotation.copy(this.OPEN_ROTATION);
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

  // Uses default hover implementation
}
