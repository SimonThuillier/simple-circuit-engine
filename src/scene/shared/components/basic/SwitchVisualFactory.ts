import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { CmpMatCategory, CmpMatType } from '../types';
import { ComponentType, type Component, type ComponentState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type { ConfigFormDefinition, VisualContext } from '../../types';

/**
 * Visual factory for Switch components
 *
 * Creates:
 * - Contactor (box, rotatable for animation)
 * - Input pin group
 * - Output pin group
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Smooth rotation of contactor between open/closed via AnimationMixer
 * - Supports mid-transition interruption (re-toggle during closing/opening)
 */
export class SwitchVisualFactory extends ComponentVisualFactoryBase {
  /** Rotation for closed switch (contactor aligned) */
  private readonly CLOSED_ROTATION = new THREE.Euler(-Math.PI / 2, 0, 0);
  /** Rotation for open switch (contactor misaligned) */
  private readonly OPEN_ROTATION = new THREE.Euler(-Math.PI / 2, -Math.PI / 4, 0);

  private readonly CONTACTOR_GEOMETRY = new THREE.BoxGeometry(1.3, 0.6, 0.1);

  /** Contactor color when output has both voltage and current */
  private readonly COLOR_VOLTAGE_CURRENT = new THREE.Color(0xff00ff);
  /** Contactor color when output has current only */
  private readonly COLOR_CURRENT = new THREE.Color(0x4444ff);
  /** Contactor color when output has voltage only */
  private readonly COLOR_VOLTAGE = new THREE.Color(0xff4444);
  /** Contactor color when output has neither */
  private readonly COLOR_NONE = new THREE.Color(0xffffff);

  constructor() {
    super();
    this._componentType = ComponentType.Switch;
  }

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    if (component.type !== this._componentType) {
      throw new Error(`Factory mismatch: expected "${this._componentType}", got "${component.type}"`);
    }
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 2.4, 3, 0.8);
    group.add(hitbox);
    hitbox.position.set(-0.2, 0, 0);

    // Contactor
    const contactorGroup = new THREE.Group();
    contactorGroup.name = 'contactorGroup'; // required for AnimationMixer property binding
    contactorGroup.userData = {
      type: 'component',
      componentId: component.id,
      part: 'contactorGroup',
      initialState: 'open',
    };
    contactorGroup.position.set(0.6, 0, 0);
    contactorGroup.rotation.copy(this.OPEN_ROTATION);
    group.add(contactorGroup);

    const contactor = new THREE.Mesh(this.CONTACTOR_GEOMETRY, this.getMat(CmpMatCategory.WHITE));
    contactor.name = 'contactor'; // required for findContactorMesh lookup
    contactor.userData = { part: 'contactor' };
    contactor.position.set(-0.65, 0, 0);

    contactorGroup.add(contactor);

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
      const inputPinGroup = this.createPinGroup(inputNode, 'left');
      inputPinGroup.position.set(-1, 0, 0);
      group.add(inputPinGroup);

      const inputPinCounterpart = this.createPinCounterpart(
        inputPinGroup,
        this.getMat(CmpMatCategory.WHITE)
      );
      if (!!inputPinCounterpart) {
        group.add(inputPinCounterpart);
      }
    }

    const outputNode = context.getENode(component.pins[1]!);
    if (outputNode) {
      const outputPinGroup = this.createPinGroup(outputNode, 'right');
      outputPinGroup.position.set(0.6, 0, 0);
      group.add(outputPinGroup);

      const outputPinCounterpart = this.createPinCounterpart(
        outputPinGroup,
        this.getMat(CmpMatCategory.WHITE)
      );
      if (!!outputPinCounterpart) {
        group.add(outputPinCounterpart);
      }
    }
  }

  /**
   * Get config form definition for Switch
   *
   * @returns Form definition with initialState, transitionSpan and size
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
          key: 'transitionSpan',
          label: 'Delay (ticks)',
          type: 'number',
          min: 1,
          step: 1,
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
   * Map core config to form data
   * Converts "open"/"closed" strings to boolean
   */
  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    const initialState = config.get('initialState');
    formData.set('initialState', initialState === 'open');
    formData.set('transitionSpan', parseFloat(config.get('transitionSpan') || '1'));
    formData.set('size', parseFloat(config.get('size') || '1'));
    return formData;
  }

  /**
   * Map form data to core config
   * Converts boolean to "open"/"closed" strings
   */
  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    const initialState = formData.get('initialState');
    config.set('initialState', initialState ? 'open' : 'closed');
    formData.set('transitionSpan', parseFloat(config.get('transitionSpan') || '1'));
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
   * Update switch animation based on simulation state.
   *
   * - null state / no context: cleanup mixer, reset to config default
   * - paused/initial + transitional: snap to start rotation
   * - paused/initial + stable: snap to state rotation
   * - playing + transitional: smooth rotation animation
   * - playing + stable: snap to final rotation, cleanup mixer
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const contactorGroup = this.findContactorGroup(object3D);
    if (!contactorGroup) return;

    const contactorMesh = this._findContactorMesh(object3D);

    // Leaving simulation: cleanup and reset to config default
    if (!state || !this._animationContext) {
      this._cleanupMixer(object3D, contactorGroup);
      if (contactorMesh) this._restoreSharedMaterial(contactorMesh);
      return;
    }

    // Stop color fade animation so _updateContactorColor can take over
    this._stopColorAnimation(object3D);

    // Update contactor color from output pin state
    if (contactorMesh) this._updateContactorColor(contactorMesh, state);

    // Paused/initial: snap to appropriate rotation
    if (this._animationContext.simulationStatus !== 'playing') {
      if (state.hasExpiration) {
        // Mid-transition while paused/stepping: snap to start rotation
        contactorGroup.rotation.copy(this._getStartRotation(state.state));
      } else {
        contactorGroup.rotation.copy(this._getStateRotation(state.state));
      }
      return;
    }

    // Playing + transitional: animate
    if (state.hasExpiration) {
      this._animateContactor(object3D, contactorGroup, state);
      return;
    }

    // Playing + stable: snap, cleanup mixer
    this._cleanupMixer(object3D, contactorGroup);
    contactorGroup.rotation.copy(this._getStateRotation(state.state));
  }

  // ---------------------------------------------------------------------------
  // Rotation helpers
  // ---------------------------------------------------------------------------

  /** Maps stable state → target rotation */
  private _getStateRotation(state: string): THREE.Euler {
    if (state === 'closed') return this.CLOSED_ROTATION;
    return this.OPEN_ROTATION;
  }

  /** Maps transitional state → the rotation it came FROM */
  private _getStartRotation(state: string): THREE.Euler {
    if (state === 'closing') return this.OPEN_ROTATION;
    if (state === 'opening') return this.CLOSED_ROTATION;
    return this._getStateRotation(state);
  }

  // ---------------------------------------------------------------------------
  // AnimationMixer management
  // ---------------------------------------------------------------------------

  /**
   * Create smooth rotation + color animations for closing/opening transitions.
   * Rotation clip: current → target state rotation (persists across updateAnimation calls)
   * Color clip: current contactor color → white (stopped on next updateAnimation so pin state takes over)
   */
  private _animateContactor(
    object3D: THREE.Object3D,
    contactorGroup: THREE.Object3D,
    state: ComponentState
  ): void {
    // Prevent duplicate animation for same transition
    if (object3D.userData.currentActionStart === state.startTick) return;

    const contactorMesh = this._findContactorMesh(object3D);

    const tps = this._animationContext!.ticksPerSecond;
    const span = state.expirationTick - state.startTick;
    const durationSeconds = span / tps;

    // Get or create mixer
    let mixer: THREE.AnimationMixer = object3D.userData.mixer;
    if (!mixer) {
      mixer = new THREE.AnimationMixer(object3D);
      object3D.userData.mixer = mixer;
    }

    // Read current values BEFORE stopping previous action (mid-transition support)
    const currentY = contactorGroup.rotation.y;
    let currentRGB = [1, 1, 1];
    if (contactorMesh) {
      this._ensureClonedMaterial(contactorMesh);
      const mat = contactorMesh.material as THREE.MeshLambertMaterial;
      currentRGB = [mat.color.r, mat.color.g, mat.color.b];
    }

    // Stop previous rotation animation
    if (object3D.userData.currentAction) {
      (object3D.userData.currentAction as THREE.AnimationAction).stop();
    }
    if (object3D.userData.currentClip) {
      mixer.uncacheClip(object3D.userData.currentClip as THREE.AnimationClip);
    }

    // Rotation clip (persists for the entire transition)
    const targetY = this._getStateRotation(state.nextState!).y;
    const rotationClip = new THREE.AnimationClip('switchRotation', durationSeconds, [
      new THREE.NumberKeyframeTrack(
        'contactorGroup.rotation[y]',
        [0, durationSeconds],
        [currentY, targetY]
      ),
    ]);
    const rotationAction = mixer.clipAction(rotationClip);
    rotationAction.loop = THREE.LoopOnce;
    rotationAction.clampWhenFinished = true;
    rotationAction.play();

    object3D.userData.currentActionStart = state.startTick;
    object3D.userData.currentAction = rotationAction;
    object3D.userData.currentClip = rotationClip;

    // Color clip (fade to white, stopped on next updateAnimation call)
    if (contactorMesh) {
      this._stopColorAnimation(object3D);
      const colorClip = new THREE.AnimationClip('switchColor', durationSeconds, [
        new THREE.ColorKeyframeTrack(
          'contactor.material.color',
          [0, durationSeconds],
          [...currentRGB, 1, 1, 1]
        ),
      ]);
      const colorAction = mixer.clipAction(colorClip);
      colorAction.loop = THREE.LoopOnce;
      colorAction.clampWhenFinished = true;
      colorAction.play();

      object3D.userData.colorAction = colorAction;
      object3D.userData.colorClip = colorClip;
    }
  }

  /**
   * Stop the color fade animation so _updateContactorColor can set color from pin state.
   */
  private _stopColorAnimation(object3D: THREE.Object3D): void {
    if (!object3D.userData.colorAction) return;
    const mixer = object3D.userData.mixer as THREE.AnimationMixer | undefined;
    (object3D.userData.colorAction as THREE.AnimationAction).stop();
    if (mixer && object3D.userData.colorClip) {
      mixer.uncacheClip(object3D.userData.colorClip as THREE.AnimationClip);
    }
    delete object3D.userData.colorAction;
    delete object3D.userData.colorClip;
  }

  /**
   * Stop all animations, clean up mixer, reset to config default rotation.
   */
  private _cleanupMixer(object3D: THREE.Object3D, contactorGroup: THREE.Object3D): void {
    const mixer = object3D.userData.mixer as THREE.AnimationMixer | undefined;
    if (mixer) {
      mixer.stopAllAction();
      mixer.uncacheRoot(object3D);
      delete object3D.userData.mixer;
    }
    delete object3D.userData.currentAction;
    delete object3D.userData.currentClip;
    delete object3D.userData.currentActionStart;
    delete object3D.userData.colorAction;
    delete object3D.userData.colorClip;

    // Reset to config-based default rotation
    if (contactorGroup.userData.initialState === 'closed') {
      contactorGroup.rotation.copy(this.CLOSED_ROTATION);
    } else {
      contactorGroup.rotation.copy(this.OPEN_ROTATION);
    }
  }

  // ---------------------------------------------------------------------------
  // Contactor material (color from output pin state)
  // ---------------------------------------------------------------------------

  private _ensureClonedMaterial(contactorMesh: THREE.Mesh): void {
    const mat = contactorMesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType === CmpMatType.ANIMATION_CLONE) return;
    contactorMesh.material = this.getMat(CmpMatCategory.WHITE).clone();
    (contactorMesh.material as THREE.MeshLambertMaterial).userData.matType =
      CmpMatType.ANIMATION_CLONE;
  }

  private _restoreSharedMaterial(contactorMesh: THREE.Mesh): void {
    const mat = contactorMesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType !== CmpMatType.ANIMATION_CLONE) return;
    mat.dispose();
    contactorMesh.material = this.getMat(CmpMatCategory.WHITE);
  }

  private _updateContactorColor(contactorMesh: THREE.Mesh, state: ComponentState): void {
    if (!state.pinStates || !state.pinStates.has('output')) return;

    this._ensureClonedMaterial(contactorMesh);
    const mat = contactorMesh.material as THREE.MeshLambertMaterial;

    const outputState = state.pinStates.get('output')!;

    if (outputState.hasVoltage && outputState.hasCurrent) {
      mat.color.copy(this.COLOR_VOLTAGE_CURRENT);
    } else if (outputState.hasCurrent) {
      mat.color.copy(this.COLOR_CURRENT);
    } else if (outputState.hasVoltage) {
      mat.color.copy(this.COLOR_VOLTAGE);
    } else {
      mat.color.copy(this.COLOR_NONE);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private findContactorGroup(object3D: THREE.Object3D): THREE.Object3D | null {
    let contactorGroup: THREE.Object3D | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Group && child.userData.part === 'contactorGroup') {
        contactorGroup = child;
      }
    });

    return contactorGroup;
  }

  private _findContactorMesh(object3D: THREE.Object3D): THREE.Mesh | null {
    let mesh: THREE.Mesh | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'contactor') {
        mesh = child;
      }
    });

    return mesh;
  }

  // Uses default hover implementation
}
