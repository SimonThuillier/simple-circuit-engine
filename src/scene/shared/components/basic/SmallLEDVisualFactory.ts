import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import type { Component, ComponentState, SmallLEDState } from 'simple-circuit-engine/core';
import { presetOrHexToHex, hexToPresetOrHex } from '../../utils/ColorUtils';
import * as THREE from 'three';
import type { ConfigFormDefinition, VisualContext } from '../../types';

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

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
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
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const ledGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 16, 4, false, 0, Math.PI * 2);
    const led = new THREE.Mesh(ledGeometry, material);
    led.userData = {
      type: 'component',
      componentId: component.id,
      part: 'led',
      idleColorHex: 0xffffff,
      activeColorHex: SmallLEDVisualFactory.LED_LIT_COLOR,
    };
    led.position.set(0, 0.25, 0);
    group.add(led);

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
      const pin1Group = this.createPinGroup(inputNode,'left');
      pin1Group.position.set(-0.25, 0, 0);
      group.add(pin1Group);

      const pin1Counterpart =
          this.createPinCounterpart(pin1Group, material);
      if(!!pin1Counterpart){
        group.add(pin1Counterpart);
      }
    }

    const outputNode = context.getENode(component.pins[1]!);
    if (outputNode) {
      const pin2Group = this.createPinGroup(outputNode,'right');
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
   * Get config form definition for SmallLED (T027)
   *
   * @returns Form definition with activeColor and idleColor color fields
   */
  override getConfigFormDefinition(): ConfigFormDefinition | null {
    return {
      fields: [
        { key: 'idleColor', label: 'Idle Color', type: 'color' },
        { key: 'activeColor', label: 'Active Color', type: 'color' },
        { key: 'size', label: 'Size', type: 'number', min: 1, max: 16, step: 1 },
        { key: 'ywRatio', label: 'Ratio Y/W', type: 'number' },
      ],
    };
  }

  /**
   * Map core config to form data (T027)
   * Converts hex/preset strings to hex values for color picker
   *
   * @param config - Core component config
   * @returns Form data with hex color strings
   */
  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    const activeColor = config.get('activeColor') || '#ffff00';
    const idleColor = config.get('idleColor') || '#ffffff';

    // Convert preset names to hex if needed
    formData.set('idleColor', presetOrHexToHex(idleColor));
    formData.set('activeColor', presetOrHexToHex(activeColor));
    formData.set('size', parseFloat(config.get('size') || '1'));
    formData.set('ywRatio', parseFloat(config.get('ywRatio') || '1'));

    return formData;
  }

  /**
   * Map form data to core config (T027)
   * Converts hex colors to preset names if they match, otherwise keeps hex
   *
   * @param formData - Form data with hex color strings
   * @returns Core config with hex or preset name strings
   */
  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    const activeColor = formData.get('activeColor');
    const idleColor = formData.get('idleColor');

    // Convert hex to preset name if it matches a preset
    if (activeColor) {
      config.set('activeColor', hexToPresetOrHex(activeColor));
    }
    if (idleColor) {
      config.set('idleColor', hexToPresetOrHex(idleColor));
    }

    config.set('size', formData.get('size').toString());
    config.set('ywRatio', formData.get('ywRatio').toString());
    return config;
  }

  /**
   * Update visual from configuration (T022)
   * Updates LED color based on activeColor config
   *
   * @param object3D - The Object3D created by createVisual()
   * @param config - Component configuration map
   *
   * @remarks
   * Updates the LED mesh color based on activeColor config value
   * Supports both hex colors and color presets
   */
  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>): void {
    const ledMesh = this.findLedMesh(object3D);
    const hitbox = this.findHitbox(object3D);
    if (!ledMesh || !hitbox) return;

    // changing colors
    const idleColor = config.get('idleColor');
    if (idleColor) {
      // Convert preset to hex if needed, then parse
      const idleColorHex = parseInt(presetOrHexToHex(idleColor).replace('#', ''), 16);
      ledMesh.material.color.setHex(idleColorHex);
      ledMesh.userData.idleColorHex = idleColorHex;
    }
    const activeColor = config.get('activeColor');
    if (activeColor) {
      // Convert preset to hex if needed, then parse
      ledMesh.userData.activeColorHex = parseInt(
        presetOrHexToHex(activeColor).replace('#', ''),
        16
      );
    }
    // changing geometry
    const ywRatio = parseFloat(config.get('ywRatio') || '1');
    ledMesh.geometry.dispose();
    ledMesh.geometry = new THREE.CylinderGeometry(
      0.25,
      0.25,
      ywRatio,
      16,
      4,
      false,
      0,
      Math.PI * 2
    );
    ledMesh.position.set(0, 0.25 * ywRatio, 0);
    hitbox.geometry.dispose();
    hitbox.geometry = new THREE.BoxGeometry(1, 1.5 * ywRatio, 1);

    const scale = parseFloat(config.get('size') || '1');
    object3D.scale.set(scale, scale, scale);
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
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const ledMesh = this.findLedMesh(object3D);
    if (!ledMesh) return;
    if (!state) {
      ledMesh.userData.materialLocked = false;
      ledMesh.material.emissive.setHex(0x000000);
      ledMesh.material.emissiveIntensity = 0;
      return;
    }

    const ledState = state as SmallLEDState;
    if (ledState.isLit) {
      // Apply LED glow
      ledMesh.userData.materialLocked = true;
      ledMesh.material.emissive.setHex(ledMesh.userData.activeColorHex);
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
