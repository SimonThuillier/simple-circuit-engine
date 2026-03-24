import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { CmpMatCategory, CmpMatType } from '../types';
import type { Component, ComponentState, LightbulbState } from 'simple-circuit-engine/core';
import * as THREE from 'three';

import type { ConfigFormDefinition, VisualContext } from '../../types';

/**
 * Visual factory for Lightbulb components
 * Animation:
 * - Smooth emissive glow transition when Lightbulb lights up or turns off
 * - Uses AnimationMixer with material property tracks (emissive, opacity)
 * - Clones shared GLASS material per-instance during simulation for independent animation
 */
export class LightbulbVisualFactory extends ComponentVisualFactoryBase {
  /** Lightbulb lit color (yellow glow) */
  private readonly BULB_LIT_COLOR = 0xffff00;
  /** Lightbulb lit emissive intensity */
  private readonly BULB_LIT_INTENSITY = 1.0;
  /** Lightbulb unlit opacity */
  private readonly BULB_UNLIT_OPACITY = 0.55;

  private readonly BASE_GEOMETRY = new THREE.CylinderGeometry(
      0.3, 0.15, 0.4,
      12, 6, false, 0, Math.PI * 2);
  private readonly BULB_GEOMETRY = new THREE.SphereGeometry(
      0.5, 16, 16);

  /** Yellow in normalized RGB for ColorKeyframeTrack */
  private readonly LIT_RGB = [1, 1, 0];
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

    // Visuals
    const base = new THREE.Mesh(this.BASE_GEOMETRY, this.getMat(CmpMatCategory.WHITE));
    base.userData = {
      type: 'component',
      componentId: component.id,
      part: 'base'
    };
    base.position.set(0, 0.2, 0);
    group.add(base);

    const bulb = new THREE.Mesh(this.BULB_GEOMETRY, this.getMat(CmpMatCategory.GLASS));
    bulb.name = 'bulb'; // required for AnimationMixer property binding
    bulb.userData = {
      type: 'component',
      componentId: component.id,
      part: 'bulb',
    };
    bulb.position.set(0, 0.8, 0);
    group.add(bulb);

    // pins (not called if preview - no pins)
    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group);
    }

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  private createPinsVisual(
      component: Component,
      context: VisualContext,
      group: THREE.Group) {
    const pin1Node = context.getENode(component.pins[0]!);
    if (pin1Node) {
      const pin1Group = this.createPinGroup(pin1Node, 'left');
      pin1Group.position.set(-0.25, 0, 0);
      group.add(pin1Group);

      const pin1Counterpart =
          this.createPinCounterpart(pin1Group, this.getMat(CmpMatCategory.WHITE));
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
          this.createPinCounterpart(pin2Group, this.getMat(CmpMatCategory.WHITE));
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
      fields: [
        {
          key: 'transitionSpan',
          label: 'Lit delay (ticks)',
          type: 'number',
          min: 1,
          step: 1
        },
          { key: 'size', label: 'Size', type: 'number', min: 1, max: 16, step: 1 }],
    };
  }

  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    formData.set('transitionSpan', parseFloat(config.get('transitionSpan') || '1'));
    formData.set('size', parseFloat(config.get('size') || '1'));
    return formData;
  }

  /**
   * Map form data to core config
   *
   * @param formData - Form data with size
   * @returns Core config with string size
   */
  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    config.set('transitionSpan', formData.get('transitionSpan').toString());
    config.set('size', formData.get('size').toString());
    return config;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>) {
    const scale = parseFloat(config.get('size') || '1');
    object3D.scale.set(scale, scale, scale);
    this.updateAnimation(object3D, null);
  }

  /**
   * Update Lightbulb animation based on simulation state.
   *
   * - null state / no context: restore shared material, cleanup mixer
   * - paused/initial: snap to target state
   * - playing + transitional (goingOn/goingOff): smooth material animation
   * - playing + stable (on/off): snap to final state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const bulbMesh = this.findBulbMesh(object3D);
    if (!bulbMesh) return;

    // Leaving simulation: restore shared material
    if (!state || !this._animationContext) {
      this._cleanupMixer(object3D);
      this._restoreSharedMaterial(bulbMesh);
      return;
    }

    const lightbulbState = state as LightbulbState;

    // Paused/initial: snap to current state (mixer won't advance)
    if (this._animationContext.simulationStatus !== 'playing') {
      this._cleanupMixer(object3D);
      this._snapToState(bulbMesh, lightbulbState.isLit);
      return;
    }

    // Playing + transitional state: animate
    if (state.hasExpiration) {
      this._animateBulb(object3D, bulbMesh, state);
      return;
    }

    // Playing + stable state: snap, cleanup mixer
    this._cleanupMixer(object3D);
    this._snapToState(bulbMesh, lightbulbState.isLit);
  }

  // ---------------------------------------------------------------------------
  // Material clone / restore
  // ---------------------------------------------------------------------------

  /**
   * Clone the shared GLASS material for independent per-instance animation.
   * No-op if already cloned.
   */
  private _ensureClonedMaterial(bulbMesh: THREE.Mesh): void {
    const mat = bulbMesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType === CmpMatType.ANIMATION_CLONE) return;
    bulbMesh.material = mat.clone();
    (bulbMesh.material as THREE.MeshLambertMaterial).userData.matType = CmpMatType.ANIMATION_CLONE;
  }

  /**
   * Dispose the per-instance clone and restore the shared GLASS.NORMAL material.
   * No-op if not cloned.
   */
  private _restoreSharedMaterial(bulbMesh: THREE.Mesh): void {
    const mat = bulbMesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType !== CmpMatType.ANIMATION_CLONE) return;
    mat.dispose();
    bulbMesh.material = this.getMat(CmpMatCategory.GLASS);
  }

  // ---------------------------------------------------------------------------
  // Snap (immediate state application)
  // ---------------------------------------------------------------------------

  private _snapToState(bulbMesh: THREE.Mesh, isLit: boolean): void {
    this._ensureClonedMaterial(bulbMesh);
    const mat = bulbMesh.material as THREE.MeshLambertMaterial;

    if (isLit) {
      mat.emissive.setHex(this.BULB_LIT_COLOR);
      mat.emissiveIntensity = this.BULB_LIT_INTENSITY;
      mat.opacity = 1;
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
      mat.opacity = this.BULB_UNLIT_OPACITY;
    }
  }

  // ---------------------------------------------------------------------------
  // AnimationMixer management
  // ---------------------------------------------------------------------------

  /**
   * Create a smooth material animation for goingOn / goingOff transitions.
   */
  private _animateBulb(
    object3D: THREE.Object3D,
    bulbMesh: THREE.Mesh,
    state: ComponentState
  ): void {
    // Prevent duplicate animation for same transition
    if (object3D.userData.currentActionStart === state.startTick) return;

    this._ensureClonedMaterial(bulbMesh);

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
    // so mid-transition interrupts (goingOff→goingOn) animate from actual visual state
    const mat = bulbMesh.material as THREE.MeshLambertMaterial;
    const currentIntensity = mat.emissiveIntensity;
    const currentOpacity = mat.opacity;
    const currentRGB = [mat.emissive.r, mat.emissive.g, mat.emissive.b];

    // Stop previous animation
    if (object3D.userData.currentAction) {
      (object3D.userData.currentAction as THREE.AnimationAction).stop();
    }
    if (object3D.userData.currentClip) {
      mixer.uncacheClip(object3D.userData.currentClip as THREE.AnimationClip);
    }

    // Determine end values based on transition direction; start from current visual state
    const isGoingOn = state.state === 'goingOn';
    const endIntensity = isGoingOn ? this.BULB_LIT_INTENSITY : 0;
    const endOpacity = isGoingOn ? 1 : this.BULB_UNLIT_OPACITY;
    const endRGB = isGoingOn ? this.LIT_RGB : this.UNLIT_RGB;

    const tracks = [
      new THREE.NumberKeyframeTrack(
        'bulb.material.emissiveIntensity',
        [0, durationSeconds],
        [currentIntensity, endIntensity]
      ),
      new THREE.NumberKeyframeTrack(
        'bulb.material.opacity',
        [0, durationSeconds],
        [currentOpacity, endOpacity]
      ),
      new THREE.ColorKeyframeTrack(
        'bulb.material.emissive',
        [0, durationSeconds],
        [...currentRGB, ...endRGB]
      ),
    ];

    const clip = new THREE.AnimationClip('bulbGlow', durationSeconds, tracks);
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

  private findBulbMesh(
    object3D: THREE.Object3D
  ): (THREE.Mesh) | null {
    let bulbMesh: (THREE.Mesh) | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'bulb') {
          bulbMesh = child as THREE.Mesh;
      }
    });

    return bulbMesh;
  }

  // Uses default hover implementation
}
