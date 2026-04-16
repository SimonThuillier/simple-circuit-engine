import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { CmpMatCategory, CmpMatType } from '../types';
import { ComponentType, type Component, type ComponentState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { RingGeometry, CyclicTrapezoidGeometry } from '../../utils/GeometryUtils';
import type { ConfigFormDefinition, VisualContext } from '../../types';

/**
 * Visual factory for Clock
 */
export class ClockVisualFactory extends ComponentVisualFactoryBase {
  /** Shared Clock envelope geometry */
  private readonly ENVELOPE_GEOMETRY = RingGeometry(0.7, 0.8, 0.4, 32);
  /** Shared Clock hand geometry */
  private readonly HAND_GEOMETRY = CyclicTrapezoidGeometry(0.7, 0.16, 0.01, 0.1, 0.3, 16);
  /** Shared Clock area geometry */
  private readonly AREA_GEOMETRY = new THREE.CylinderGeometry(
    0.69,
    0.69,
    0.4,
    16,
    3,
    false,
    Math.PI / 2,
    Math.PI
  );
  private readonly RED_AREA_MAT = new THREE.MeshLambertMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.4,
    emissive: 0xff0000,
    emissiveIntensity: 0.3,
    userData: { matType: CmpMatType.FACTORY },
  });
  private readonly BLUE_AREA_MAT = new THREE.MeshLambertMaterial({
    color: 0x0000ff,
    transparent: true,
    opacity: 0.4,
    emissive: 0x0000ff,
    emissiveIntensity: 0.3,
    userData: { matType: CmpMatType.FACTORY },
  });

  private readonly HIGH_TICK_ROTATION = new THREE.Euler(0, Math.PI, 0);
  private readonly LOW_TICK_ROTATION = new THREE.Euler(0, 0, 0);

  constructor() {
    super();
    this._componentType = ComponentType.Clock;
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
    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 2, 2);
    group.add(hitbox);

    const envelope = new THREE.Mesh(this.ENVELOPE_GEOMETRY, this.getMat(CmpMatCategory.WHITE));
    envelope.userData = {
      type: 'component',
      componentId: group.userData.componentId,
      part: 'envelope',
    };
    envelope.rotateX(-Math.PI / 2);
    envelope.position.set(0, 0, 0);
    group.add(envelope);

    // red and blue areas
    const highArea = new THREE.Mesh(this.AREA_GEOMETRY, this.RED_AREA_MAT);
    highArea.position.set(0, 0.2, 0);
    group.add(highArea);
    const lowArea = new THREE.Mesh(this.AREA_GEOMETRY, this.BLUE_AREA_MAT);
    lowArea.rotateY(Math.PI);
    lowArea.position.set(0, 0.2, 0);
    group.add(lowArea);

    // hand
    const handGroup = this.createHandGroup(component);
    group.add(handGroup);
    handGroup.rotation.copy(this.HIGH_TICK_ROTATION);

    // pins (not called if preview - no pins)
    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group);
    }

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  private createPinsVisual(component: Component, context: VisualContext, group: THREE.Group) {
    const vccNode = context.getENode(component.pins[0]!);
    if (vccNode) {
      const vccGroup = this.createPinGroup(vccNode, 'top');
      vccGroup.position.set(0, 0, -0.77);
      group.add(vccGroup);
    }

    const gndNode = context.getENode(component.pins[2]!);
    if (gndNode) {
      const gndGroup = this.createPinGroup(gndNode, 'bottom');
      gndGroup.position.set(0, 0, 0.77);
      group.add(gndGroup);
    }

    const outputNode = context.getENode(component.pins[1]!);
    if (outputNode) {
      const outputGroup = this.createPinGroup(outputNode, 'right');
      outputGroup.position.set(0.75, 0, 0);
      group.add(outputGroup);
    }
  }

  private createHandGroup(component: Component): THREE.Group {
    const handGroup = new THREE.Group();
    handGroup.name = 'handGroup';
    handGroup.userData = {
      type: 'component',
      componentId: component.id,
      part: 'handGroup',
      initialState: 'open',
    };
    handGroup.updateMatrix();
    handGroup.updateMatrixWorld(true);

    const hand = new THREE.Mesh(this.HAND_GEOMETRY, this.getMat(CmpMatCategory.SHINY_SILVER));
    hand.userData = {
      type: 'component',
      componentId: component.id,
      part: 'hand',
    };
    handGroup.add(hand);
    hand.rotateX(Math.PI / 2);
    hand.translateZ(-0.4);
    hand.translateX(0.25);

    hand.updateMatrix();
    hand.updateMatrixWorld(true);

    return handGroup;
  }

  /**
   * Get config form definition for Clock
   *
   * @param config - config
   * @returns Form definition
   */
  override getConfigFormDefinition(_config?: Map<string, string>): ConfigFormDefinition | null {
    return {
      fields: [
        { key: 'startHigh', type: 'boolean' },
        { key: 'halfPeriod', type: 'number', min: 1 },
      ],
    };
  }

  /**
   * Map core config to form data
   *
   * @param config - Core component config
   * @returns Form data
   */
  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    const startHigh = config.get('startHigh');
    formData.set('startHigh', startHigh == 'true');
    formData.set('halfPeriod', parseFloat(config.get('halfPeriod') || '1'));
    return formData;
  }

  /**
   * Map form data to core config
   *
   * @param formData - Form data
   * @returns Core config
   */
  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    const startHigh = formData.get('startHigh');
    config.set('startHigh', startHigh ? 'true' : 'false');
    config.set('halfPeriod', formData.get('halfPeriod').toString());
    return config;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>) {
    const handGroup = this.findHandGroup(object3D);
    if (!handGroup) return;

    handGroup.userData.startHigh = config.get('startHigh') === 'true';

    if (handGroup.userData.startHigh) {
      handGroup.rotation.copy(this.HIGH_TICK_ROTATION);
    } else {
      handGroup.rotation.copy(this.LOW_TICK_ROTATION);
    }
  }

  /**
   * Update Clock animation based on simulation state.
   *
   * When state is non-null: animates hand rotation toward the current state's target.
   * If the state has a planned transition (hasExpiration), creates a smooth animation
   * from the current visual rotation to the target using Three.js AnimationMixer.
   * Otherwise snaps to the target position.
   *
   * When state is null (leaving simulation): stops all animations, cleans up mixer,
   * and resets hand to config-based default rotation.
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The Clock's current simulation state, or null to reset
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const handGroup = this.findHandGroup(object3D);
    if (!handGroup) return;

    //console.log('update animation called', this._animationContext!!.simulationStatus );

    // No animation context / Leaving simulation: cleanup and reset
    if (!state || !this._animationContext) {
      this._cleanupMixer(object3D, handGroup);
      return;
    }
    // When paused or initial: snap to current state position (mixer won't advance)
    if (this._animationContext.simulationStatus !== 'playing') {
      handGroup.rotation.copy(this.getStateRotation(state.state));
      return;
    }

    // If there's no planned transition, cleanup mixer and snap to nominal position
    if (!state.hasExpiration) {
      this._cleanupMixer(object3D, handGroup);
      handGroup.rotation.copy(this.getStateRotation(state.state));
      return;
    }

    const startRotation = this.getStateRotation(state.state!!).y;
    const targetRotation = this.getStateRotation(state.nextState!!).y;

    this._animateHand(
      object3D,
      handGroup,
      startRotation,
      state.startTick,
      targetRotation,
      state.expirationTick
    );
  }

  /**
   * Create a smooth animation from current hand rotation to targetRotation
   */
  private _animateHand(
    object3D: THREE.Object3D,
    handGroup: THREE.Object3D,
    _startRotation: number,
    startTick: number,
    targetRotation: number,
    targetTick: number
  ): void {
    // prevent duplicate guard
    if (object3D.userData.currentActionStart == startTick) {
      return;
    }

    const ticksPerSecond: number = this._animationContext!.ticksPerSecond;
    const span = targetTick - startTick;
    // Get or create mixer
    let mixer: THREE.AnimationMixer = object3D.userData.mixer;
    if (!mixer) {
      mixer = new THREE.AnimationMixer(object3D);
      object3D.userData.mixer = mixer;
    }

    //reading before stopping
    const currentRotation = handGroup.rotation.y % (2 * Math.PI);
    // Stop and uncache previous animation
    if (object3D.userData.currentAction) {
      (object3D.userData.currentAction as THREE.AnimationAction).stop();
    }
    if (object3D.userData.currentClip) {
      mixer.uncacheClip(object3D.userData.currentClip as THREE.AnimationClip);
    }

    // Compute real duration in seconds: one tick duration = span/ticksPerSecond
    const durationSeconds = span / ticksPerSecond;
    targetRotation = currentRotation - Math.PI;

    // Create keyframe track for handGroup.rotation[y]
    const track = new THREE.NumberKeyframeTrack(
      'handGroup.rotation[y]',
      [0, durationSeconds],
      [currentRotation, targetRotation]
    );

    const clip = new THREE.AnimationClip('clockHandRotation', durationSeconds, [track]);
    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.play();

    // Store references for cleanup/interruption
    object3D.userData.currentActionStart = startTick;
    object3D.userData.currentAction = action;
    object3D.userData.currentClip = clip;
  }

  /**
   * Stop all animations, clean up mixer, and reset hand to config-based default rotation.
   */
  private _cleanupMixer(object3D: THREE.Object3D, handGroup: THREE.Object3D): void {
    const mixer = object3D.userData.mixer as THREE.AnimationMixer | undefined;
    if (mixer) {
      mixer.stopAllAction();
      mixer.uncacheRoot(object3D);
      delete object3D.userData.mixer;
    }
    delete object3D.userData.currentAction;
    delete object3D.userData.currentClip;

    // Reset to config-based default rotation
    if (handGroup.userData.startHigh) {
      handGroup.rotation.copy(this.HIGH_TICK_ROTATION);
    } else {
      handGroup.rotation.copy(this.LOW_TICK_ROTATION);
    }
  }

  private getStateRotation(state: string) {
    if (state === 'high') {
      return this.HIGH_TICK_ROTATION;
    }
    return this.LOW_TICK_ROTATION;
  }

  /**
   * Find the hand group mesh within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The hand mesh if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'hand'
   */
  private findHandGroup(object3D: THREE.Object3D): THREE.Object3D | null {
    let handGroupMesh: THREE.Object3D | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Object3D && child.userData.part === 'handGroup') {
        handGroupMesh = child;
      }
    });
    return handGroupMesh;
  }
}
