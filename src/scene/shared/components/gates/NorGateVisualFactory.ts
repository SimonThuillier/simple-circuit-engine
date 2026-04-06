import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { ComponentType, type Component, type ComponentState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { OrGateGeometry, OrGateHoleGeometry } from '../../utils/GeometryUtils';
import type { ConfigFormDefinition, VisualContext } from '../../types';
import { CmpMatCategory, CmpMatType } from '../types';

/**
 * Visual factory for NOR gates components
 *
 * Creates:
 * - Gate mesh
 * - vcc, gnd, inputs and output pin groups
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Emissive glow when Gate is high (based on simulation state)
 */
export class NorGateVisualFactory extends ComponentVisualFactoryBase {
  /** Shared envelope geometry */
  protected readonly ENVELOPE_GEOM = OrGateGeometry(1.5, 1.6, 0.1, 0.4, 16);
  /** Shared inner hole geometry */
  protected readonly HOLE_GEOM = OrGateHoleGeometry(1.5, 1.6, 0.1, 0.4, 16)!;
  /** Shared geometry for negative marker **/
  protected readonly NEG_MARKER_GEOM = new THREE.CylinderGeometry(
    0.2,
    0.2,
    0.4,
    16,
    4,
    false,
    0,
    Math.PI * 2
  );

  protected readonly HOLE_COLOR_HIGH = new THREE.Color(0xff4444);
  protected readonly HOLE_COLOR_LOW = new THREE.Color(0x4444ff);
  protected readonly HOLE_EMISSIVE_HIGH_INTENSITY = 0.5;
  protected readonly HOLE_EMISSIVE_LOW_INTENSITY = 0.2;

  constructor() {
    super();
    this._componentType = ComponentType.NorGate;
  }

  override defaultRotation() {
    return Math.PI;
  }

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    if (component.type !== this._componentType) {
      throw new Error(`Factory mismatch: expected "${this._componentType}", got "${component.type}"`);
    }
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 2, 1.8);
    group.add(hitbox);

    // Visual Gate
    const envelope = new THREE.Mesh(this.ENVELOPE_GEOM, this.getMat(CmpMatCategory.WHITE));
    envelope.userData = {
      type: 'component',
      componentId: component.id,
      part: 'envelope',
    };
    envelope.rotateX(-Math.PI / 2);
    envelope.rotateY(Math.PI);
    envelope.position.set(0, 0.35, 0);
    group.add(envelope);

    const hole = new THREE.Mesh(this.HOLE_GEOM, this.getMat(CmpMatCategory.DARK_GRAY));
    hole.name = 'hole'; // required for AnimationMixer property binding
    hole.userData = {
      type: 'component',
      componentId: component.id,
      part: 'hole',
      initialState: 'low',
    };
    hole.rotateX(-Math.PI / 2);
    hole.rotateY(Math.PI);
    hole.position.set(0, 0.35, 0);
    group.add(hole);

    // pins (not called if preview - no pins)
    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group);
    }

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  protected createPinsVisual(component: Component, context: VisualContext, group: THREE.Group) {
    const vccNode = context.getENode(component.pins[0]!);
    if (vccNode) {
      const vccGroup = this.createPinGroup(vccNode, 'bottom');
      vccGroup.position.set(0.15, 0, 0.79);
      group.add(vccGroup);
    }

    const gndNode = context.getENode(component.pins[4]!);
    if (gndNode) {
      const gndGroup = this.createPinGroup(gndNode, 'top');
      gndGroup.position.set(0.15, 0, -0.79);
      group.add(gndGroup);
    }

    const input1Node = context.getENode(component.pins[1]!);
    if (input1Node) {
      const input1Group = this.createPinGroup(input1Node, 'right', new THREE.Euler(0.45, 0, 0));
      input1Group.position.set(0.54, 0, 0.5);
      group.add(input1Group);
    }

    const input2Node = context.getENode(component.pins[2]!);
    if (input2Node) {
      const input2Group = this.createPinGroup(input2Node, 'right', new THREE.Euler(-0.45, 0, 0));
      input2Group.position.set(0.54, 0, -0.5);
      group.add(input2Group);
    }

    const outputNode = context.getENode(component.pins[3]!);
    if (outputNode) {
      const outputGroup = this.createPinGroup(outputNode, 'left');
      outputGroup.position.set(-0.7, 0, 0);
      group.add(outputGroup);
    }
  }

  /**
   * Get config form definition
   *
   * @param config - Optional current config to determine disabled state of transitionSpan
   * @returns Form definition with defaultLogicFamily dropdown, activationLogic boolean, and transitionSpan number
   */
  override getConfigFormDefinition(config?: Map<string, string>): ConfigFormDefinition | null {
    const logicFamily = config?.get('defaultLogicFamily') ?? 'CMOS1';
    return {
      fields: [
        {
          key: 'defaultLogicFamily',
          label: 'Logic Family',
          type: 'dropdown',
          options: { CMOS: 'CMOS1', TTL: 'TTL1', Sandbox: 'Sandbox' },
        },
        {
          key: 'activationLogic',
          label: 'Activation Logic',
          type: 'boolean',
        },
        {
          key: 'transitionSpan',
          label: 'Propagation delay (ticks)',
          type: 'number',
          min: 1,
          disabled: logicFamily !== 'Sandbox',
        },
        {
          key: 'initializationOrder',
          label: 'Init Order',
          type: 'number',
        },
      ],
    };
  }

  /**
   * Map core config to form data
   * Converts "positive"/"negative" strings to boolean
   *
   * @param config - Core component config
   * @returns Form data with boolean activationLogic
   */
  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    formData.set('defaultLogicFamily', config.get('defaultLogicFamily') ?? 'CMOS1');
    const activationLogic = config.get('activationLogic');
    formData.set('activationLogic', activationLogic === 'positive');
    formData.set('transitionSpan', parseFloat(config.get('transitionSpan') || '1'));
    formData.set('initializationOrder', parseFloat(config.get('initializationOrder') || '0'));
    return formData;
  }

  /**
   * Map form data to core config
   * Converts boolean to "positive"/"negative" strings
   *
   * @param formData - Form data with boolean activationLogic
   * @returns Core config with string activationLogic
   */
  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    config.set('defaultLogicFamily', formData.get('defaultLogicFamily') ?? 'CMOS1');
    const activationLogic = formData.get('activationLogic');
    config.set('activationLogic', activationLogic ? 'positive' : 'negative');
    config.set('transitionSpan', formData.get('transitionSpan').toString());
    config.set('initializationOrder', formData.get('initializationOrder').toString() || null);
    return config;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>) {
    const holeMesh = this.findHoleMesh(object3D);
    if (!holeMesh) return;

    let negativeMarkerMesh = this.findNegativeMarkerMesh(object3D);

    if (config.get('activationLogic') === 'negative') {
      holeMesh.userData.initialState = 'high';
      if (!negativeMarkerMesh) {
        negativeMarkerMesh = new THREE.Mesh(
          this.NEG_MARKER_GEOM,
          this.getMat(CmpMatCategory.WHITE)
        );
        negativeMarkerMesh.userData = {
          type: 'component',
          componentId: holeMesh.userData.componentId,
          part: 'negativeMarker',
        };

        negativeMarkerMesh.position.set(-0.7, 0.15, -0.65);
        object3D.add(negativeMarkerMesh);
      }
    } else {
      holeMesh.userData.initialState = 'low';
      if (negativeMarkerMesh) {
        object3D.remove(negativeMarkerMesh);
      }
    }
  }

  /**
   * Update animation based on simulation state
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The component current simulation state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const holeMesh = this.findHoleMesh(object3D);
    if (!holeMesh) return;

    if (!state || !this._animationContext || state.state === 'indeterminate') {
      this._cleanupMixer(object3D);
      this._restoreSharedHoleMaterial(holeMesh);
      return;
    }

    if (state.state === 'high') {
      this._cleanupMixer(object3D);
      this._setHoleColor(holeMesh, this.HOLE_COLOR_HIGH, this.HOLE_EMISSIVE_HIGH_INTENSITY);
      return;
    }

    if (state.state === 'low') {
      this._cleanupMixer(object3D);
      this._setHoleColor(holeMesh, this.HOLE_COLOR_LOW, this.HOLE_EMISSIVE_LOW_INTENSITY);
      return;
    }

    // Paused + transitional: snap to start color (before the transition began)
    if (this._animationContext.simulationStatus !== 'playing') {
      if (state.state === 'rising') {
        this._setHoleColor(holeMesh, this.HOLE_COLOR_LOW, this.HOLE_EMISSIVE_LOW_INTENSITY);
      } else {
        // falling
        this._setHoleColor(holeMesh, this.HOLE_COLOR_HIGH, this.HOLE_EMISSIVE_HIGH_INTENSITY);
      }
      return;
    }

    // Playing + transitional: animate
    if (state.hasExpiration) {
      this._animateHoleColor(object3D, holeMesh, state);
    }
  }

  // ---------------------------------------------------------------------------
  // Hole material helpers
  // ---------------------------------------------------------------------------

  private _setHoleColor(holeMesh: THREE.Mesh, color: THREE.Color, emissiveIntensity: number): void {
    this._ensureClonedHoleMaterial(holeMesh);
    const mat = holeMesh.material as THREE.MeshLambertMaterial;
    mat.color.copy(color);
    mat.emissive.copy(color);
    mat.emissiveIntensity = emissiveIntensity;
  }

  private _ensureClonedHoleMaterial(holeMesh: THREE.Mesh): void {
    const mat = holeMesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType === CmpMatType.ANIMATION_CLONE) return;
    holeMesh.material = this.getMat(CmpMatCategory.DARK_GRAY).clone();
    (holeMesh.material as THREE.MeshLambertMaterial).userData.matType = CmpMatType.ANIMATION_CLONE;
  }

  private _restoreSharedHoleMaterial(holeMesh: THREE.Mesh): void {
    const mat = holeMesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType !== CmpMatType.ANIMATION_CLONE) return;
    mat.dispose();
    holeMesh.material = this.getMat(CmpMatCategory.DARK_GRAY);
  }

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

  /**
   * Animate the hole color between LOW and HIGH over the transition span.
   * Reads current color for mid-transition support.
   */
  private _animateHoleColor(
    object3D: THREE.Object3D,
    holeMesh: THREE.Mesh,
    state: ComponentState
  ): void {
    if (object3D.userData.currentActionStart === state.startTick) return;

    const tps = this._animationContext!.ticksPerSecond;
    const span = state.expirationTick - state.startTick;
    const durationSeconds = span / tps;

    this._ensureClonedHoleMaterial(holeMesh);
    const mat = holeMesh.material as THREE.MeshLambertMaterial;

    const toColor = state.state === 'rising' ? this.HOLE_COLOR_HIGH : this.HOLE_COLOR_LOW;
    const toIntensity =
      state.state === 'rising'
        ? this.HOLE_EMISSIVE_HIGH_INTENSITY
        : this.HOLE_EMISSIVE_LOW_INTENSITY;

    const currentRGB = [mat.color.r, mat.color.g, mat.color.b];
    const endRGB = [toColor.r, toColor.g, toColor.b];
    const currentIntensity = mat.emissiveIntensity;

    let mixer: THREE.AnimationMixer = object3D.userData.mixer;
    if (!mixer) {
      mixer = new THREE.AnimationMixer(object3D);
      object3D.userData.mixer = mixer;
    }

    if (object3D.userData.currentAction) {
      (object3D.userData.currentAction as THREE.AnimationAction).stop();
    }
    if (object3D.userData.currentClip) {
      mixer.uncacheClip(object3D.userData.currentClip as THREE.AnimationClip);
    }

    const clip = new THREE.AnimationClip('holeColor', durationSeconds, [
      new THREE.ColorKeyframeTrack(
        'hole.material.color',
        [0, durationSeconds],
        [...currentRGB, ...endRGB]
      ),
      new THREE.ColorKeyframeTrack(
        'hole.material.emissive',
        [0, durationSeconds],
        [...currentRGB, ...endRGB]
      ),
      new THREE.NumberKeyframeTrack(
        'hole.material.emissiveIntensity',
        [0, durationSeconds],
        [currentIntensity, toIntensity]
      ),
    ]);
    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.play();

    object3D.userData.currentActionStart = state.startTick;
    object3D.userData.currentAction = action;
    object3D.userData.currentClip = clip;
  }

  /**
   * Find the envelope mesh within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The envelope mesh if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'envelope'
   */
  protected findEnvelopeMesh(object3D: THREE.Object3D): THREE.Mesh | null {
    let envelopeMesh: THREE.Mesh | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'envelope') {
        envelopeMesh = child as THREE.Mesh;
      }
    });
    return envelopeMesh;
  }

  /**
   * Find the hole mesh within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The hole mesh if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'hole'
   */
  protected findHoleMesh(object3D: THREE.Object3D): THREE.Mesh | null {
    let holeMesh: THREE.Mesh | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'hole') {
        holeMesh = child as THREE.Mesh;
      }
    });
    return holeMesh;
  }

  /**
   * Find the negative marker mesh within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The negative marker mesh if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'negativeMarker'
   */
  protected findNegativeMarkerMesh(object3D: THREE.Object3D): THREE.Mesh | null {
    let negativeMarkerMesh: THREE.Mesh | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'negativeMarker') {
        negativeMarkerMesh = child as THREE.Mesh;
      }
    });
    return negativeMarkerMesh;
  }
}
