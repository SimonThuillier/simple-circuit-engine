import { ComponentVisualFactoryBase } from './ComponentVisualFactory';
import type { Component } from '@/core/Component';
import type { ComponentState } from '@/core/simulation/states/ComponentState';
import type { SmallLEDState } from '@/core/simulation/states/SmallLEDState';
import * as THREE from 'three';

/**
 * Visual factory for SmallLED components
 *
 * Creates:
 * - LED cylinder mesh
 * - Input pin group
 * - Output pin group
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Emissive glow when LED is lit (based on simulation state)
 */
export class SmallLEDVisualFactory extends ComponentVisualFactoryBase {
  /** LED lit color (yellow glow) */
  private static readonly LED_LIT_COLOR = 0xffff00;

  /** LED lit emissive intensity */
  private static readonly LED_LIT_INTENSITY = 1.0;

  createVisual(component: Component): THREE.Object3D {
    console.log('Creating small LED visual for component', component.id);
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 1, 1, 1);
    group.add(hitbox);

    // Visual LED
    const ledMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const ledGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 16, 4, false, 0, Math.PI * 2);
    const led = new THREE.Mesh(ledGeometry, ledMaterial);
    led.userData = {
      type: 'component',
      componentId: component.id,
      part: 'led',
    };
    led.position.set(0, 0.2, 0);
    group.add(led);

    // Input pin group
    const inputPinGroup = this.createPinGroup(component.id, component.pins[0]!, 'input');
    inputPinGroup.position.set(-0.25, 0, 0);
    inputPinGroup.rotateZ(Math.PI / 2);
    inputPinGroup.rotateY(Math.PI);
    group.add(inputPinGroup);

    // Output pin group
    const outputPinGroup = this.createPinGroup(component.id, component.pins[1]!, 'output');
    outputPinGroup.position.set(0.25, 0, 0);
    outputPinGroup.rotateZ(-Math.PI / 2);
    outputPinGroup.rotateY(Math.PI);
    group.add(outputPinGroup);

    return group;
  }

  /**
   * Update LED animation based on simulation state
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The SmallLED's current simulation state
   *
   * @remarks
   * Applies yellow emissive glow when LED is lit (state.isLit === true)
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState): void {
    const ledState = state as SmallLEDState;
    const ledMesh = this.findLedMesh(object3D);

    if (!ledMesh) {
      return;
    }

    if (ledState.isLit) {
      // Apply LED glow
      ledMesh.userData.materialLocked = true;
      ledMesh.material.emissive.setHex(SmallLEDVisualFactory.LED_LIT_COLOR);
      ledMesh.material.emissiveIntensity = SmallLEDVisualFactory.LED_LIT_INTENSITY;
    } else {
      // Remove glow
      ledMesh.userData.materialLocked = false;
      ledMesh.material.emissive.setHex(0x000000);
      ledMesh.material.emissiveIntensity = 0;
    }
  }

  /**
   * Find the LED mesh within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The LED mesh if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'led'
   */
  private findLedMesh(
    object3D: THREE.Object3D
  ): (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null {
    let ledMesh: (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'led') {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          ledMesh = child as THREE.Mesh & { material: THREE.MeshStandardMaterial };
        }
      }
    });

    return ledMesh;
  }

  // Uses default hover implementation
}
