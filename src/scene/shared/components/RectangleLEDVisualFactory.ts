import { ComponentVisualFactoryBase } from './ComponentVisualFactory';
import type { Component } from '@/core/Component';
import type { ComponentState } from '@/core/simulation/states/ComponentState';
import type { SmallLEDState } from '@/core/simulation/states/SmallLEDState';
import type { ConfigFormDefinition } from '../types/ConfigTypes';
import { presetOrHexToHex, hexToPresetOrHex } from '../utils/ColorPresets';
import * as THREE from 'three';

/**
 * Visual factory for SmallLED components
 *
 * Creates:
 * - LED box mesh
 * - Input pin group
 * - Output pin group
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Emissive glow when LED is lit (based on simulation state)
 */
export class RectangleLEDVisualFactory extends ComponentVisualFactoryBase {
  /** LED lit color (yellow glow) */
  private static readonly LED_LIT_COLOR = 0xffff00;

  /** LED lit emissive intensity */
  private static readonly LED_LIT_INTENSITY = 1.0;

  createVisual(component: Component): THREE.Object3D {
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 1, 1.5, 1);
    group.add(hitbox);

    // Visual LED
    const ledMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const ledGeometry = new THREE.BoxGeometry(1, 1, 1);
    const led = new THREE.Mesh(ledGeometry, ledMaterial);
    led.userData = {
      type: 'component',
      componentId: component.id,
      part: 'led',
      idleColorHex: 0xffffff,
      activeColorHex: RectangleLEDVisualFactory.LED_LIT_COLOR,
    };
    led.position.set(0, 0.25, 0);
    group.add(led);

    // Input pin group
    const inputPinGroup = this.createPinGroup(component.id, component.pins[0]!, 'input');
    inputPinGroup.position.set(-0.5, 0, 0);
    inputPinGroup.rotateZ(Math.PI / 2);
    inputPinGroup.rotateY(Math.PI);
    group.add(inputPinGroup);

    // Output pin group
    const outputPinGroup = this.createPinGroup(component.id, component.pins[1]!, 'output');
    outputPinGroup.position.set(0.5, 0, 0);
    outputPinGroup.rotateZ(-Math.PI / 2);
    outputPinGroup.rotateY(Math.PI);
    group.add(outputPinGroup);

    this.updateFromConfiguration(group, component.config);
    return group;
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
        { key: 'hwRatio', label: 'Ratio H/W', type: 'number' },
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
    const idleColor = config.get('idleColor') || '#ffffff';
    const activeColor = config.get('activeColor') || '#ffff00';

    // Convert preset names to hex if needed
    formData.set('idleColor', presetOrHexToHex(idleColor));
    formData.set('activeColor', presetOrHexToHex(activeColor));
    formData.set('size', parseFloat(config.get('size') || '1'));
    formData.set('hwRatio', parseFloat(config.get('hwRatio') || '1'));
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
    config.set('hwRatio', formData.get('hwRatio').toString());
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
    const inputPin = this.findPinGroup(object3D, 'input');
    const outputPin = this.findPinGroup(object3D, 'output');
    const hitbox = this.findHitbox(object3D);
    if (!ledMesh || !inputPin || !outputPin || !hitbox) return;

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
    const hwRatio = parseFloat(config.get('hwRatio') || '1');
    const ywRatio = parseFloat(config.get('ywRatio') || '1');
    ledMesh.geometry.dispose();
    ledMesh.geometry = new THREE.BoxGeometry(1, ywRatio, hwRatio);
    ledMesh.position.set(0, 0.25 * ywRatio, 0);
    hitbox.geometry.dispose();
    hitbox.geometry = new THREE.BoxGeometry(1, 1.5 * ywRatio, hwRatio);
    // scaling the pins (1 if hwRatio>=0.5, else scaled down to fit better)
    const pinScale = hwRatio >= 0.5 ? 1 : hwRatio * 2;
    inputPin.scale.set(pinScale, pinScale, pinScale);
    outputPin.scale.set(pinScale, pinScale, pinScale);

    // scaling
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
      ledMesh.material.emissiveIntensity = RectangleLEDVisualFactory.LED_LIT_INTENSITY;
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
