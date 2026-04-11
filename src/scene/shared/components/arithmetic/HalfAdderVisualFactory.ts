import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { ComponentType, type Component, type ComponentState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import {
  EmptyRectangleGeometry,
  RectangleWithNailGeometry,
} from '../../utils/GeometryUtils';
import type { ConfigFormDefinition, VisualContext } from '../../types';
import { CmpMatCategory, CmpMatType } from '../types';

/**
 * Visual factory for Half Adder components.
 *
 * Creates:
 * - An `envelope` rectangular frame (EmptyRectangleGeometry)
 * - A horizontal `separator` box dividing upper/lower chambers
 * - A `sumFiller` (RectangleWithNailGeometry) in the upper chamber;
 *   its material is animated blue↔red following the sum output state
 * - A `halfPlus` small box inside the sumFiller (visual cue)
 * - A `carryFiller` box in the lower chamber; its material is animated
 *   blue↔red following the carry output state
 * - pin groups for vcc, inputA, inputB, sum, carry, gnd
 *
 * Animation:
 * - sumFiller ↔ blue/red based on sum output (current/next state)
 * - carryFiller ↔ blue/red based on carry output (current/next state)
 */
export class HalfAdderVisualFactory extends ComponentVisualFactoryBase {
  private readonly ENVELOPE_GEOM = EmptyRectangleGeometry(2.2,2.2,0.1,0.4);
  /** Horizontal separator splitting upper/lower chambers at Z=0 */
  private readonly SEPARATOR_GEOM = new THREE.BoxGeometry(1.6, 0.4,0.2);
  private readonly SEPARATOR_SIDE_GEOM = new THREE.BoxGeometry(0.2, 0.4,0.2);

  private readonly SUM_FILLER_GEOM = RectangleWithNailGeometry(
    2,
    0.9,
    0.2,
    0.7,
    1,
    false,
    0.4
  );

  /** Small box inside sumFiller (visual cue for the XOR "+") */
  private readonly HALF_PLUS_GEOM = new THREE.BoxGeometry(0.2, 0.4, 0.7);
  private readonly CARRY_FILLER_GEOM = new THREE.BoxGeometry(2, 0.4, 0.9);

  protected readonly FILLER_COLOR_HIGH = new THREE.Color(0xff4444);
  protected readonly FILLER_COLOR_LOW = new THREE.Color(0x4444ff);
  protected readonly FILLER_EMISSIVE_HIGH_INTENSITY = 0.5;
  protected readonly FILLER_EMISSIVE_LOW_INTENSITY = 0.2;

  constructor() {
    super();
    this._componentType = ComponentType.HalfAdder;
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

    const hitbox = this.createComponentHitbox(
      component.id,
      group.id,
      2.5,2,2.5);
    group.add(hitbox);

    // Envelope frame
    const envelope = new THREE.Mesh(this.ENVELOPE_GEOM, this.getMat(CmpMatCategory.WHITE));
    envelope.userData = {
      type: 'component',
      componentId: component.id,
      part: 'envelope',
    };
    envelope.rotateX(-Math.PI / 2);
    envelope.position.set(0, 0, 0);
    group.add(envelope);

    // Separator (horizontal bar, Y-centered between envelope extrude extents)
    const separator = new THREE.Mesh(this.SEPARATOR_GEOM, this.getMat(CmpMatCategory.WHITE));
    separator.userData = {
      type: 'component',
      componentId: component.id,
      part: 'separator',
    };
    separator.position.set(0, 0.2, 0);
    group.add(separator);
    const separatorSideLeft = new THREE.Mesh(this.SEPARATOR_SIDE_GEOM, this.getMat(CmpMatCategory.DARK_GRAY));
    separatorSideLeft.userData = {...separator.userData, part: 'separatorSideLeft'};
    separatorSideLeft.position.set(-0.9, 0.2, 0);
    group.add(separatorSideLeft);
    const separatorSideRight = new THREE.Mesh(this.SEPARATOR_SIDE_GEOM, this.getMat(CmpMatCategory.DARK_GRAY));
    separatorSideRight.userData = {...separator.userData, part: 'separatorSideRight'};
    separatorSideRight.position.set(0.9, 0.2, 0);
    group.add(separatorSideRight);

    // Sum filler (upper chamber: world Z < 0). Nail points toward +Z into the separator.
    const sumFiller = new THREE.Mesh(
      this.SUM_FILLER_GEOM,
      this.getMat(CmpMatCategory.DARK_GRAY)
    );
    sumFiller.name = 'sumFiller'; // required for AnimationMixer property binding
    sumFiller.userData = {
      type: 'component',
      componentId: component.id,
      part: 'sumFiller',
      initialState: 'low',
    };
    sumFiller.rotateX(-Math.PI / 2);
    // Body centered in upper chamber; nail crosses separator
    sumFiller.position.set(0, 0, -0.55);
    group.add(sumFiller);

    // Half plus box inside sum filler body
    const halfPlus = new THREE.Mesh(this.HALF_PLUS_GEOM, this.getMat(CmpMatCategory.WHITE));
    halfPlus.userData = {
      type: 'component',
      componentId: component.id,
      part: 'halfPlus',
    };
    halfPlus.position.set(0, 0.2, -0.45);
    group.add(halfPlus);

    // Carry filler (lower chamber: world Z > 0)
    const carryFiller = new THREE.Mesh(
      this.CARRY_FILLER_GEOM,
      this.getMat(CmpMatCategory.DARK_GRAY)
    );
    carryFiller.name = 'carryFiller'; // required for AnimationMixer property binding
    carryFiller.userData = {
      type: 'component',
      componentId: component.id,
      part: 'carryFiller',
      initialState: 'low',
    };
    carryFiller.position.set(0, 0.2, 0.55);
    group.add(carryFiller);

    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group);
    }

    return group;
  }

  protected createPinsVisual(component: Component, context: VisualContext, group: THREE.Group) {
    const vccNode = context.getENode(component.pins[0]!);
    if (vccNode) {
      const vccGroup = this.createPinGroup(vccNode, 'top');
      vccGroup.position.set(0, 0, -1.1);
      group.add(vccGroup);
    }

    const inputANode = context.getENode(component.pins[1]!);
    if (inputANode) {
      const inputAGroup = this.createPinGroup(inputANode, 'left');
      inputAGroup.position.set(-1.1, 0, -0.5);
      group.add(inputAGroup);
    }

    const inputBNode = context.getENode(component.pins[2]!);
    if (inputBNode) {
      const inputBGroup = this.createPinGroup(inputBNode, 'left');
      inputBGroup.position.set(-1.1, 0, 0.5);
      group.add(inputBGroup);
    }

    const sumNode = context.getENode(component.pins[3]!);
    if (sumNode) {
      const sumGroup = this.createPinGroup(sumNode, 'right');
      sumGroup.position.set(1.1, 0, -0.5);
      group.add(sumGroup);
    }

    const carryNode = context.getENode(component.pins[4]!);
    if (carryNode) {
      const carryGroup = this.createPinGroup(carryNode, 'right');
      carryGroup.position.set(1.1, 0, 0.5);
      group.add(carryGroup);
    }

    const gndNode = context.getENode(component.pins[5]!);
    if (gndNode) {
      const gndGroup = this.createPinGroup(gndNode, 'bottom');
      gndGroup.position.set(0, 0, 1.1);
      group.add(gndGroup);
    }
  }

  override getConfigFormDefinition(config?: Map<string, string>): ConfigFormDefinition | null {
    const logicFamily = config?.get('defaultLogicFamily') ?? 'CMOS1';
    return {
      fields: [
        {
          key: 'defaultLogicFamily',
          type: 'dropdown',
          options: { CMOS: 'CMOS1', TTL: 'TTL1', Sandbox: 'Sandbox' },
        },
        { key: 'transitionSpan', type: 'number', min: 1, disabled: logicFamily !== 'Sandbox' },
        { key: 'initializationOrder', type: 'number' },
      ],
    };
  }

  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    formData.set('defaultLogicFamily', config.get('defaultLogicFamily') ?? 'CMOS1');
    formData.set('transitionSpan', parseFloat(config.get('transitionSpan') || '2'));
    formData.set('initializationOrder', parseFloat(config.get('initializationOrder') || '0'));
    return formData;
  }

  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    config.set('defaultLogicFamily', formData.get('defaultLogicFamily') ?? 'CMOS1');
    config.set('transitionSpan', formData.get('transitionSpan').toString());
    config.set('initializationOrder', formData.get('initializationOrder').toString() || null);
    return config;
  }


  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const sumFiller = this.findPartMesh(object3D, 'sumFiller');
    const carryFiller = this.findPartMesh(object3D, 'carryFiller');
    if (!sumFiller || !carryFiller) return;

    if (!state || !this._animationContext || state.state === 'indeterminate') {
      this._cleanupMixer(object3D);
      this._restoreSharedFillerMaterial(sumFiller);
      this._restoreSharedFillerMaterial(carryFiller);
      return;
    }

    const isTransition = state.state.startsWith('to');
    const prevStable: string = isTransition
      ? (state.parameters.get('prevState') ?? '0')
      : state.state;
    const nextStable: string = isTransition ? (state.nextState ?? prevStable) : state.state;

    const prevValue = parseInt(prevStable, 16);
    const nextValue = parseInt(nextStable, 16);
    const prevSumHigh = (prevValue & 1) !== 0;
    const nextSumHigh = (nextValue & 1) !== 0;
    const prevCarryHigh = (prevValue & 2) !== 0;
    const nextCarryHigh = (nextValue & 2) !== 0;

    // Stable state: snap colors, no animation
    if (!isTransition || !state.hasExpiration) {
      this._cleanupMixer(object3D);
      this._setFillerColor(sumFiller, nextSumHigh);
      this._setFillerColor(carryFiller, nextCarryHigh);
      return;
    }

    // Paused + transitional: snap to start color
    if (this._animationContext.simulationStatus !== 'playing') {
      this._setFillerColor(sumFiller, prevSumHigh);
      this._setFillerColor(carryFiller, prevCarryHigh);
      return;
    }

    // Playing + transitional: animate each filler whose value actually changes
    this._animateFillers(
      object3D,
      sumFiller,
      carryFiller,
      state,
      prevSumHigh,
      nextSumHigh,
      prevCarryHigh,
      nextCarryHigh
    );
  }

  // ---------------------------------------------------------------------------
  // Material helpers
  // ---------------------------------------------------------------------------

  private _setFillerColor(mesh: THREE.Mesh, high: boolean): void {
    this._ensureClonedFillerMaterial(mesh);
    const mat = mesh.material as THREE.MeshLambertMaterial;
    const color = high ? this.FILLER_COLOR_HIGH : this.FILLER_COLOR_LOW;
    const intensity = high
      ? this.FILLER_EMISSIVE_HIGH_INTENSITY
      : this.FILLER_EMISSIVE_LOW_INTENSITY;
    mat.color.copy(color);
    mat.emissive.copy(color);
    mat.emissiveIntensity = intensity;
  }

  private _ensureClonedFillerMaterial(mesh: THREE.Mesh): void {
    const mat = mesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType === CmpMatType.ANIMATION_CLONE) return;
    mesh.material = this.getMat(CmpMatCategory.DARK_GRAY).clone();
    (mesh.material as THREE.MeshLambertMaterial).userData.matType = CmpMatType.ANIMATION_CLONE;
  }

  private _restoreSharedFillerMaterial(mesh: THREE.Mesh): void {
    const mat = mesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType !== CmpMatType.ANIMATION_CLONE) return;
    mat.dispose();
    mesh.material = this.getMat(CmpMatCategory.DARK_GRAY);
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
   * Animate sumFiller and carryFiller fill colors over the transition span.
   * Builds a single AnimationClip with up to two target tracks per filler
   * (color, emissive, emissiveIntensity) — only for fillers whose value changes.
   */
  private _animateFillers(
    object3D: THREE.Object3D,
    sumFiller: THREE.Mesh,
    carryFiller: THREE.Mesh,
    state: ComponentState,
    prevSumHigh: boolean,
    nextSumHigh: boolean,
    prevCarryHigh: boolean,
    nextCarryHigh: boolean
  ): void {
    if (object3D.userData.currentActionStart === state.startTick) return;

    const tps = this._animationContext!.ticksPerSecond;
    const span = state.expirationTick - state.startTick;
    const durationSeconds = span / tps;

    this._ensureClonedFillerMaterial(sumFiller);
    this._ensureClonedFillerMaterial(carryFiller);

    // Snap fillers whose value does not change to the (unchanged) color.
    if (prevSumHigh === nextSumHigh) {
      this._setFillerColor(sumFiller, nextSumHigh);
    }
    if (prevCarryHigh === nextCarryHigh) {
      this._setFillerColor(carryFiller, nextCarryHigh);
    }

    const tracks: THREE.KeyframeTrack[] = [];
    if (prevSumHigh !== nextSumHigh) {
      this._pushFillerTracks(tracks, 'sumFiller', sumFiller, nextSumHigh, durationSeconds);
    }
    if (prevCarryHigh !== nextCarryHigh) {
      this._pushFillerTracks(tracks, 'carryFiller', carryFiller, nextCarryHigh, durationSeconds);
    }

    // No tracks: nothing to animate (both outputs unchanged). Still record start to dedupe.
    if (tracks.length === 0) {
      object3D.userData.currentActionStart = state.startTick;
      return;
    }

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

    const clip = new THREE.AnimationClip('halfAdderFillers', durationSeconds, tracks);
    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.play();

    object3D.userData.currentActionStart = state.startTick;
    object3D.userData.currentAction = action;
    object3D.userData.currentClip = clip;
  }

  private _pushFillerTracks(
    tracks: THREE.KeyframeTrack[],
    meshName: string,
    mesh: THREE.Mesh,
    toHigh: boolean,
    durationSeconds: number
  ): void {
    const mat = mesh.material as THREE.MeshLambertMaterial;
    const fromRGB = [mat.color.r, mat.color.g, mat.color.b];
    const toColor = toHigh ? this.FILLER_COLOR_HIGH : this.FILLER_COLOR_LOW;
    const toRGB = [toColor.r, toColor.g, toColor.b];
    const fromIntensity = mat.emissiveIntensity;
    const toIntensity = toHigh
      ? this.FILLER_EMISSIVE_HIGH_INTENSITY
      : this.FILLER_EMISSIVE_LOW_INTENSITY;

    tracks.push(
      new THREE.ColorKeyframeTrack(
        `${meshName}.material.color`,
        [0, durationSeconds],
        [...fromRGB, ...toRGB]
      ),
      new THREE.ColorKeyframeTrack(
        `${meshName}.material.emissive`,
        [0, durationSeconds],
        [...fromRGB, ...toRGB]
      ),
      new THREE.NumberKeyframeTrack(
        `${meshName}.material.emissiveIntensity`,
        [0, durationSeconds],
        [fromIntensity, toIntensity]
      )
    );
  }

  /** Find a child mesh by its userData.part name */
  protected findPartMesh(object3D: THREE.Object3D, part: string): THREE.Mesh | null {
    let found: THREE.Mesh | null = null;
    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === part) {
        found = child as THREE.Mesh;
      }
    });
    return found;
  }
}
