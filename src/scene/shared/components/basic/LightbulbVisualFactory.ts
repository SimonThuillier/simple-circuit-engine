import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import type { Component, ComponentState, LightbulbState } from 'simple-circuit-engine/core';
import * as THREE from 'three';

import type { ConfigFormDefinition, VisualContext } from '../../types';

/**
 * Visual factory for Lightbulb components
 *
 * Creates:
 * - LED cylinder mesh
 * - Input pin group
 * - Output pin group
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Emissive glow when Lightbulb is lit (based on simulation state)
 */
export class LightbulbVisualFactory extends ComponentVisualFactoryBase {
  /** Lightbulb lit color (yellow glow) */
  private static readonly BULB_LIT_COLOR = 0xffff00;

  /** Lightbulb lit emissive intensity */
  private static readonly BULB_LIT_INTENSITY = 1.0;

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 1, 4, 1);
    group.add(hitbox);

    // Visuals
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const baseGeometry = new THREE.CylinderGeometry(0.23, 0.2, 0.5, 16, 4, false, 0, Math.PI * 2);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.userData = {
      type: 'component',
      componentId: component.id,
      part: 'base',
    };
    base.position.set(0, 0.2, 0);
    group.add(base);

    const bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    bulbMaterial.opacity = 0.55;
    const bulbGeometry = new THREE.SphereGeometry(0.5, 12, 8);
    const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulb.userData = {
      type: 'component',
      componentId: component.id,
      part: 'bulb',
    };
    bulb.position.set(0, 0.8, 0);
    group.add(bulb);

    // pins (not called if preview - no pins)
    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group, baseMaterial);
    }

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  private createPinsVisual(
      component: Component,
      context: VisualContext,
      group: THREE.Group,
      material: THREE.MeshStandardMaterial) {
    const pin1Node = context.getENode(component.pins[0]!);
    if (pin1Node) {
      const pin1Group = this.createPinGroup(pin1Node, 'left');
      pin1Group.position.set(-0.25, 0, 0);
      group.add(pin1Group);

      const pin1Counterpart =
          this.createPinCounterpart(pin1Group, material);
      if(!!pin1Counterpart){
        group.add(pin1Counterpart);
      }
    }

    const pin2Node = context.getENode(component.pins[1]!);
    if (pin2Node) {
      const pin2Group = this.createPinGroup(pin2Node,'right');
      pin2Group.position.set(0.25, 0, 0);
      group.add(pin2Group);

      const pin2Counterpart =
          this.createPinCounterpart(pin2Group, material);
      if(!!pin2Counterpart){
        group.add(pin2Counterpart);
      }
    }
  }

  /**
   * Get config form definition for Lightbulb
   *
   * @returns Form definition with size
   */
  override getConfigFormDefinition(): ConfigFormDefinition | null {
    return {
      fields: [{ key: 'size', label: 'Size', type: 'number', min: 1, max: 16, step: 1 }],
    };
  }

  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
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
    config.set('size', formData.get('size').toString());
    return config;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>) {
    const scale = parseFloat(config.get('size') || '1');
    object3D.scale.set(scale, scale, scale);
    this.updateAnimation(object3D, null);
  }

  /**
   * Update Lightbulb animation based on simulation state
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The SmallLED's current simulation state
   *
   * @remarks
   * Applies yellow emissive glow when Lightbulb is lit (state.isLit === true)
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const bulbMesh = this.findBulbMesh(object3D);
    if (!bulbMesh) return;
    if (!state) {
      bulbMesh.userData.materialLocked = false;
      bulbMesh.material.opacity = 0.55;
      bulbMesh.material.emissive.setHex(0x000000);
      bulbMesh.material.emissiveIntensity = 0;
      return;
    }

    const lightbulbState = state as LightbulbState;
    if (lightbulbState.isLit) {
      // Apply LED glow
      bulbMesh.userData.materialLocked = true;
      bulbMesh.material.opacity = 1;
      bulbMesh.material.emissive.setHex(LightbulbVisualFactory.BULB_LIT_COLOR);
      bulbMesh.material.emissiveIntensity = LightbulbVisualFactory.BULB_LIT_INTENSITY;
    } else {
      // Remove glow
      bulbMesh.userData.materialLocked = false;
      bulbMesh.material.opacity = 0.55;
      bulbMesh.material.emissive.setHex(0x000000);
      bulbMesh.material.emissiveIntensity = 0;
    }
  }

  /**
   * Find the bulb mesh within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The LED mesh if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'bulb'
   */
  private findBulbMesh(
    object3D: THREE.Object3D
  ): (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null {
    let bulbMesh: (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'bulb') {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          bulbMesh = child as THREE.Mesh & { material: THREE.MeshStandardMaterial };
        }
      }
    });

    return bulbMesh;
  }

  // Uses default hover implementation
}
