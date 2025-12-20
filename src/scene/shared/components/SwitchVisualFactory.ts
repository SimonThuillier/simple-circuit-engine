import { ComponentVisualFactoryBase } from './ComponentVisualFactory';
import type { Component } from '@/core/Component';
import type { ComponentState } from '@/core/simulation/states/ComponentState';
import type { SwitchState } from '@/core/simulation/states/SwitchState';
import * as THREE from 'three';

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
  private static readonly CLOSED_ROTATION = new THREE.Euler(0, 0, 0);

  /** Rotation for opening/closing switch */
  private static readonly INTERMEDIATE_ROTATION = new THREE.Euler(0.25, 0.65, 0.25);

  /** Rotation for open switch (contactor misaligned) */
  private static readonly OPEN_ROTATION = new THREE.Euler(0.5, 1.3, 0.5);

  createVisual(component: Component): THREE.Object3D {
    console.log('Creating switch visual for component', component.id);
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 1, 1);
    group.add(hitbox);

    // Visual: poles
    const inputPoleGeometry = new THREE.SphereGeometry(
      0.3,
      16,
      8,
      Math.PI / 2,
      Math.PI,
      0,
      Math.PI
    );
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    const inputPole = new THREE.Mesh(inputPoleGeometry, poleMaterial);
    inputPole.userData = {
      type: 'component',
      componentId: component.id,
    };
    inputPole.position.set(-1, 0, 0);
    group.add(inputPole);

    const outputPoleGeometry = new THREE.BoxGeometry(0.2, 0.3, 1);
    const outputPole = new THREE.Mesh(outputPoleGeometry, poleMaterial);
    outputPole.userData = {
      type: 'component',
      componentId: component.id,
    };
    outputPole.position.set(0.5, 0, 0);
    group.add(outputPole);

    // Contactor
    const contactorGroup = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1, 1),
      new THREE.MeshBasicMaterial({
        transparent: false,
        visible: false,
      })
    );

    const contactorMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const contactorGeometry = new THREE.CylinderGeometry(
      0.2,
      0.12,
      1.5,
      8,
      4,
      false,
      0,
      Math.PI * 2
    );
    const contactor = new THREE.Mesh(contactorGeometry, contactorMaterial);
    contactor.userData = {
      type: 'component',
      componentId: component.id,
      part: 'contactor',
    };
    contactor.rotateZ(Math.PI / 2);
    contactor.position.set(0.65, 0, 0);
    contactorGroup.add(contactor);

    group.add(contactorGroup);
    contactorGroup.position.set(-1, 0, 0);
    contactorGroup.rotation.copy(SwitchVisualFactory.OPEN_ROTATION);

    // Input pin group
    const inputPinGroup = this.createPinGroup(component.id, component.pins[0]!, 'input');
    inputPinGroup.position.set(-1, 0, 0);
    inputPinGroup.rotateZ(Math.PI / 2);
    inputPinGroup.rotateY(Math.PI);
    group.add(inputPinGroup);

    // Output pin group
    const outputPinGroup = this.createPinGroup(component.id, component.pins[1]!, 'output');
    outputPinGroup.position.set(0.6, 0, 0);
    outputPinGroup.rotateZ(-Math.PI / 2);
    outputPinGroup.rotateY(Math.PI);
    group.add(outputPinGroup);

    return group;
  }

  /**
   * Update switch animation based on simulation state
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The Switch's current simulation state
   *
   * @remarks
   * Rotates the contactor group to visually represent open/closed state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState): void {
    const switchState = state as SwitchState;
    const contactorGroup = this.findContactorGroup(object3D);

    if (!contactorGroup) {
      return;
    }

    if (switchState.isInTransition) {
      contactorGroup.rotation.copy(SwitchVisualFactory.INTERMEDIATE_ROTATION);
    } else if (switchState.isClosed) {
      // Closed position - contactor aligned
      contactorGroup.rotation.copy(SwitchVisualFactory.CLOSED_ROTATION);
    } else {
      // Open position - contactor misaligned
      contactorGroup.rotation.copy(SwitchVisualFactory.OPEN_ROTATION);
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
        contactorGroup = child.parent;
      }
    });

    return contactorGroup;
  }

  // Uses default hover implementation
}
