import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { CmpMatCategory, CmpMatType } from '../types';
import type { Component, ComponentState, SmallLEDState } from 'simple-circuit-engine/core';
import { presetOrHexToHex, hexToPresetOrHex } from '../../utils/ColorUtils';
import * as THREE from 'three';
import type { ConfigFormDefinition, VisualContext } from '../../types';

/**
 * Visual factory for RectangleLED components
 *
 * Creates:
 * - LED box mesh
 * - Input pin group
 * - Output pin group
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Smooth emissive glow transition when LED lights up or turns off
 * - Uses AnimationMixer with material property tracks (emissive, emissiveIntensity)
 * - Clones PRIVATE material per-instance during simulation for independent animation
 */
export class RectangleLEDVisualFactory extends ComponentVisualFactoryBase {
  /** LED lit color (yellow glow) */
  private readonly LED_LIT_COLOR = 0xffff00;

  /** LED lit emissive intensity */
  private readonly LED_LIT_INTENSITY = 1.0;

  /** Black in normalized RGB for ColorKeyframeTrack */
  private readonly UNLIT_RGB = [0, 0, 0];

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 1, 3, 1);
    group.add(hitbox);

    // Visual LED
    const ledGeometry = new THREE.BoxGeometry(1, 1, 1);
    const ledMat = this.getMat(CmpMatCategory.WHITE).clone();
    ledMat.userData.matType = CmpMatType.PRIVATE;
    const led = new THREE.Mesh(ledGeometry, ledMat);
    led.name = 'led'; // required for AnimationMixer property binding
    led.userData = {
      type: 'component',
      componentId: component.id,
      part: 'led',
      idleColorHex: 0xffffff,
      activeColorHex: this.LED_LIT_COLOR,
    };
    led.position.set(0, 0.25, 0);
    group.add(led);

    // pins (not called if preview - no pins)
    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group);
    }

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  private createPinsVisual(component: Component, context: VisualContext, group: THREE.Group) {
    const inputNode = context.getENode(component.pins[0]!);
    if (inputNode) {
      const pin1Group = this.createPinGroup(inputNode, 'left');
      pin1Group.position.set(-0.5, 0, 0);
      group.add(pin1Group);
    }

    const outputNode = context.getENode(component.pins[1]!);
    if (outputNode) {
      const outputPinGroup = this.createPinGroup(outputNode, 'right');
      outputPinGroup.position.set(0.5, 0, 0);
      group.add(outputPinGroup);
    }
  }

  /**
   * Get config form definition for RectangleLED (T027)
   *
   * @returns Form definition with activeColor and idleColor color fields
   */
  override getConfigFormDefinition(): ConfigFormDefinition | null {
    return {
      fields: [
        {
          key: 'transitionSpan',
          label: 'Lit delay (ticks)',
          type: 'number',
          min: 1,
          step: 1,
        },
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
    formData.set('transitionSpan', parseFloat(config.get('transitionSpan') || '1'));
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
    config.set('transitionSpan', formData.get('transitionSpan').toString());
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
   * Updates LED color and geometry based on config
   */
  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>): void {
    const ledMesh = this.findLedMesh(object3D);
    const pin1 = this.findPinGroup(object3D, 'pin1');
    const pin2 = this.findPinGroup(object3D, 'pin2');
    const hitbox = this.findHitbox(object3D);

    if (!ledMesh || !pin1 || !pin2 || !hitbox) return;

    const ledMat = ledMesh.material as THREE.MeshLambertMaterial;

    // changing colors
    const idleColor = config.get('idleColor');
    if (idleColor) {
      // Convert preset to hex if needed, then parse
      const idleColorHex = parseInt(presetOrHexToHex(idleColor).replace('#', ''), 16);
      ledMat.color.setHex(idleColorHex);
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
    pin1.scale.set(pinScale, pinScale, pinScale);
    pin2.scale.set(pinScale, pinScale, pinScale);

    // scaling
    const scale = parseFloat(config.get('size') || '1');
    object3D.scale.set(scale, scale, scale);

    this.updateAnimation(object3D, null);
  }

  /**
   * Update LED animation based on simulation state.
   *
   * - null state / no context: restore private material, cleanup mixer
   * - paused/initial: snap to target state
   * - playing + transitional (goingOn/goingOff): smooth material animation
   * - playing + stable (on/off): snap to final state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const ledMesh = this.findLedMesh(object3D);
    if (!ledMesh) return;

    // Leaving simulation: restore private material
    if (!state || !this._animationContext) {
      this._cleanupMixer(object3D);
      this._restorePrivateMaterial(ledMesh);
      return;
    }

    const ledState = state as SmallLEDState;

    // Paused/initial: snap to current state (mixer won't advance)
    if (this._animationContext.simulationStatus !== 'playing') {
      this._cleanupMixer(object3D);
      this._snapToState(ledMesh, ledState.isLit);
      return;
    }

    // Playing + transitional state: animate
    if (state.hasExpiration) {
      this._animateLed(object3D, ledMesh, state);
      return;
    }

    // Playing + stable state: snap, cleanup mixer
    this._cleanupMixer(object3D);
    this._snapToState(ledMesh, ledState.isLit);
  }

  // ---------------------------------------------------------------------------
  // Material clone / restore (PRIVATE → ANIMATION_CLONE → PRIVATE)
  // ---------------------------------------------------------------------------

  /**
   * Clone the PRIVATE material for independent per-instance animation.
   * Stashes the original PRIVATE material in mesh.userData.privateMat.
   * No-op if already cloned.
   */
  private _ensureClonedMaterial(ledMesh: THREE.Mesh): void {
    const mat = ledMesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType === CmpMatType.ANIMATION_CLONE) return;
    ledMesh.userData.privateMat = mat;
    ledMesh.material = mat.clone();
    (ledMesh.material as THREE.MeshLambertMaterial).userData.matType = CmpMatType.ANIMATION_CLONE;
  }

  /**
   * Dispose the animation clone and restore the stashed PRIVATE material.
   * No-op if not cloned.
   */
  private _restorePrivateMaterial(ledMesh: THREE.Mesh): void {
    const mat = ledMesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType !== CmpMatType.ANIMATION_CLONE) return;
    mat.dispose();
    if (ledMesh.userData.privateMat) {
      ledMesh.material = ledMesh.userData.privateMat;
      delete ledMesh.userData.privateMat;
    }
  }

  // ---------------------------------------------------------------------------
  // Snap (immediate state application)
  // ---------------------------------------------------------------------------

  private _snapToState(ledMesh: THREE.Mesh, isLit: boolean): void {
    this._ensureClonedMaterial(ledMesh);
    const mat = ledMesh.material as THREE.MeshLambertMaterial;

    if (isLit) {
      mat.emissive.setHex(ledMesh.userData.activeColorHex);
      mat.emissiveIntensity = this.LED_LIT_INTENSITY;
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // AnimationMixer management
  // ---------------------------------------------------------------------------

  /**
   * Create a smooth material animation for goingOn / goingOff transitions.
   */
  private _animateLed(object3D: THREE.Object3D, ledMesh: THREE.Mesh, state: ComponentState): void {
    // Prevent duplicate animation for same transition
    if (object3D.userData.currentActionStart === state.startTick) return;

    this._ensureClonedMaterial(ledMesh);

    const tps = this._animationContext!.ticksPerSecond;
    const span = state.expirationTick - state.startTick;
    const durationSeconds = span / tps;

    // Get or create mixer
    let mixer: THREE.AnimationMixer = object3D.userData.mixer;
    if (!mixer) {
      mixer = new THREE.AnimationMixer(object3D);
      object3D.userData.mixer = mixer;
    }

    // Read current material values BEFORE stopping previous action,
    // so mid-transition interrupts animate from actual visual state
    const mat = ledMesh.material as THREE.MeshLambertMaterial;
    const currentIntensity = mat.emissiveIntensity;
    const currentRGB = [mat.emissive.r, mat.emissive.g, mat.emissive.b];

    // Stop previous animation
    if (object3D.userData.currentAction) {
      (object3D.userData.currentAction as THREE.AnimationAction).stop();
    }
    if (object3D.userData.currentClip) {
      mixer.uncacheClip(object3D.userData.currentClip as THREE.AnimationClip);
    }

    // Determine end values based on transition direction
    const isGoingOn = state.state === 'goingOn';
    const endIntensity = isGoingOn ? this.LED_LIT_INTENSITY : 0;
    const activeHex = ledMesh.userData.activeColorHex as number;
    const activeColor = new THREE.Color(activeHex);
    const endRGB = isGoingOn ? [activeColor.r, activeColor.g, activeColor.b] : this.UNLIT_RGB;

    const tracks = [
      new THREE.NumberKeyframeTrack(
        'led.material.emissiveIntensity',
        [0, durationSeconds],
        [currentIntensity, endIntensity]
      ),
      new THREE.ColorKeyframeTrack(
        'led.material.emissive',
        [0, durationSeconds],
        [...currentRGB, ...endRGB]
      ),
    ];

    const clip = new THREE.AnimationClip('ledGlow', durationSeconds, tracks);
    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.play();

    // Store references for cleanup/interruption
    object3D.userData.currentActionStart = state.startTick;
    object3D.userData.currentAction = action;
    object3D.userData.currentClip = clip;
  }

  /**
   * Stop all animations, clean up mixer.
   */
  private _cleanupMixer(object3D: THREE.Object3D): void {
    const mixer = object3D.userData.mixer as THREE.AnimationMixer | undefined;
    if (mixer) {
      mixer.stopAllAction();
      mixer.uncacheRoot(object3D);
      delete object3D.userData.mixer;
    }
    delete object3D.userData.currentAction;
    delete object3D.userData.currentClip;
    delete object3D.userData.currentActionStart;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private findLedMesh(object3D: THREE.Object3D): THREE.Mesh | null {
    let ledMesh: THREE.Mesh | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'led') {
        ledMesh = child as THREE.Mesh;
      }
    });

    return ledMesh;
  }

  // Uses default hover implementation
}
