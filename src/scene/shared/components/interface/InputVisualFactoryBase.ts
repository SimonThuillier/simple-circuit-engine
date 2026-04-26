import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { type Component, type ComponentState, InputState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { IceBoxGeometry } from '../../utils/GeometryUtils';
import type { ConfigFormDefinition, VisualContext } from '../../types';
import { CmpMatCategory, CmpMatType } from '../types';

/** Common envelope width — same for 1/2/4/8 input variants. */
const ENVELOPE_WIDTH = 2.4;
/** Hole/cell width inside the envelope (x-axis). */
const HOLE_WIDTH = 1.6;
/** Hole/cell depth (z-axis). */
const HOLE_DEPTH = 0.8;
/** Vertical centre of the envelope frame (extruded). */
const ENVELOPE_THICKNESS = 0.2;
const ENVELOPE_DEPTH = 0.4;
/** Switch button geometry — sits inside its hole. */
const SWITCH_W = 1.6;
const SWITCH_H = 0.5;
const SWITCH_D = 0.8;
/** Y-position of the switch button at logic-low (off) and logic-high (on). */
const SWITCH_Y_OFF = 0.6;
const SWITCH_Y_ON = 0.25;

const FILLER_COLOR_HIGH = new THREE.Color(0xff4444);
const FILLER_COLOR_LOW = new THREE.Color(0x4444ff);
const FILLER_EMISSIVE_HIGH_INTENSITY = 0.5;
const FILLER_EMISSIVE_LOW_INTENSITY = 0.2;

type SwitchInfo = { mesh: THREE.Mesh; group: THREE.Group; index: number; name: string };

/**
 * Shared visual factory for the OneInput, TwoInput, FourInput and EightInput
 * components.
 *
 * Builds an `IceBoxGeometry` envelope with `bitCount` rectangular holes laid
 * out along the z-axis. Each hole houses a switch button mesh that animates:
 *
 * - **Position (y)**: snaps/slides between `SWITCH_Y_OFF` (logic 0) and
 *   `SWITCH_Y_ON` (logic 1) when the switch is moving.
 * - **Color**: dark-gray when no simulation context, blue (low) ↔ red (high)
 *   during simulation.
 *
 * Animations follow the per-switch parameters in {@link InputState}: while a
 * switch is mid-transition, only its mesh is animated; settled switches stay
 * snapped to the colour/position dictated by the current driving state.
 */
export abstract class InputVisualFactoryBase extends ComponentVisualFactoryBase {
  /** Number of switches/outputs (1, 2, 4 or 8). */
  protected abstract readonly bitCount: number;
  /** Number of switches/outputs (1, 2, 4 or 8). */
  protected abstract readonly holePositions: Array<{ x: number; y: number }>;
  /** Total z-axis length of the envelope. */
  protected abstract readonly envelopeHeight: number;

  private _envelopeGeom: THREE.BufferGeometry | null = null;
  private _switchGeom: THREE.BoxGeometry | null = null;

  protected createVisualBase(component: Component, context: VisualContext): THREE.Object3D {
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
      ENVELOPE_WIDTH + 0.4,
      2,
      this.envelopeHeight + 0.4
    );
    group.add(hitbox);


    if (!this._envelopeGeom) {
      this._envelopeGeom = IceBoxGeometry(
        ENVELOPE_WIDTH,
        this.envelopeHeight,
        HOLE_WIDTH,
        HOLE_DEPTH,
        this.holePositions,
        ENVELOPE_DEPTH
      );
    }
    const envelope = new THREE.Mesh(this._envelopeGeom, this.getMat(CmpMatCategory.WHITE));
    envelope.userData = { type: 'component', componentId: component.id, part: 'envelope' };
    envelope.rotateX(-Math.PI / 2);
    envelope.position.set(0, 0, 0);
    group.add(envelope);
    void ENVELOPE_THICKNESS; // documentation reference; envelope wall comes from IceBoxGeometry

    if (!this._switchGeom) {
      this._switchGeom = new THREE.BoxGeometry(SWITCH_W, SWITCH_H, SWITCH_D);
    }
    for (let i = 0; i < this.bitCount; i++) {
      const switchGroup = new THREE.Group();
      switchGroup.name = `input_switch_group-${i}`;
      switchGroup.userData = {
        type: 'component',
        componentId: component.id,
        part: `input_switch_group-${i}`,
      };
      // @ts-ignore
      switchGroup.position.set(0, SWITCH_Y_OFF, this.holePositions[i].y);

      const switchMesh = new THREE.Mesh(this._switchGeom, this.getMat(CmpMatCategory.DARK_GRAY));
      switchMesh.name = `input_switch-${i}`;
      switchMesh.userData = {
        type: 'component',
        componentId: component.id,
        part: `input_switch-${i}`,
      };
      switchGroup.add(switchMesh);
      group.add(switchGroup);
    }

    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group);
    }

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  protected createPinsVisual(component: Component, context: VisualContext, group: THREE.Group) {
    const halfH = this.envelopeHeight / 2;

    const vccNode = context.getENode(component.pins[0]!);
    if (vccNode) {
      const vccGroup = this.createPinGroup(vccNode, 'top');
      vccGroup.position.set(0, 0, -halfH);
      group.add(vccGroup);
    }

    for (let i = 0; i < this.bitCount; i++) {
      const node = context.getENode(component.pins[1 + i]!);
      if (!node) continue;
      const pinGroup = this.createPinGroup(node, 'right');
      // @ts-ignore
      pinGroup.position.set(ENVELOPE_WIDTH / 2, 0, this.holePositions[i].y);
      group.add(pinGroup);
    }

    const gndNode = context.getENode(component.pins[1 + this.bitCount]!);
    if (gndNode) {
      const gndGroup = this.createPinGroup(gndNode, 'bottom');
      gndGroup.position.set(0, 0, halfH);
      group.add(gndGroup);
    }
  }

  protected getDefaultInitialState(): string  {
    return '0'.repeat(Math.ceil(this.bitCount/4));
  }

  protected getInitialStateOptions(): { [key: string]: string } {

    const maxBinLength = (2**this.bitCount -1).toString(2).length ;
    const maxHexLength = (2**this.bitCount -1).toString(16).length ;
    const options = {};
    for(let i = 0; i < 2**this.bitCount; i++) {
      const hex = i.toString(16).padStart(maxHexLength, '0');
      let bin = i.toString(2).padStart(maxBinLength, '0').replace(/(.{4})/g,"$1 ");
      // @ts-ignore
      options[`${hex.toUpperCase()} (${bin})`] = hex;
    }
    return options;
  }

  override getConfigFormDefinition(): ConfigFormDefinition | null {
    return {
      fields: [
        { key: 'initialState',
          type: 'dropdown',
          options : this.getInitialStateOptions()
        },
        { key: 'transitionSpan', type: 'number', min: 1, step: 1 },
        { key: 'size', type: 'number', min: 1, max: 16, step: 1 },
      ],
    };
  }

  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    formData.set('initialState', config.get('initialState') ?? this.getDefaultInitialState());
    formData.set('transitionSpan', parseFloat(config.get('transitionSpan') || '1'));
    formData.set('size', parseFloat(config.get('size') || '1'));
    return formData;
  }

  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    config.set('initialState', formData.get('initialState') ?? this.getDefaultInitialState());
    config.set('transitionSpan', formData.get('transitionSpan').toString());
    config.set('size', formData.get('size').toString());
    return config;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>) {
    const scale = parseFloat(config.get('size') || '1');
    object3D.scale.set(scale, scale, scale);

    const switches = this._findSwitches(object3D);
    if (switches.length === 0) return;

    const initialValue = parseInt(config.get('initialState') ?? this.getDefaultInitialState(), 16);
    object3D.userData.initialStateValue = initialValue;
    for (const sw of switches) {
      const high = ((initialValue >> sw.index) & 1) !== 0;
      sw.group.position.y = high ? SWITCH_Y_ON : SWITCH_Y_OFF;
    }
  }

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const switches = this._findSwitches(object3D);
    if (switches.length === 0) return;

    if (!state || !this._animationContext) {
      this._cleanupMixer(object3D);
      const initialValue = (object3D.userData.initialStateValue as number | undefined) ?? 0;
      for (const sw of switches) {
        this._restoreSharedMaterial(sw.mesh);
        const high = ((initialValue >> sw.index) & 1) !== 0;
        sw.group.position.y = high ? SWITCH_Y_ON : SWITCH_Y_OFF;
      }
      return;
    }

    const inputState = state as InputState;
    const playing = this._animationContext.simulationStatus === 'playing';

    if (!inputState.isInTransition) {
      this._cleanupMixer(object3D);
      const value = parseInt(inputState.state, 16);
      for (const sw of switches) {
        const high = ((value >> sw.index) & 1) !== 0;
        this._snapSwitch(sw, high);
      }
      return;
    }

    // Moving: each switch is either pending (animating or paused mid-flight) or
    // already settled to its driving (prevState) bit.
    const drivingHex = inputState.parameters.get('prevState') ?? inputState.allLowState;
    const drivingValue = parseInt(drivingHex, 16);
    const tps = this._animationContext.ticksPerSecond;

    let mixer: THREE.AnimationMixer | undefined = object3D.userData.mixer;
    const tracks: THREE.KeyframeTrack[] = [];
    const activeNames = new Set<string>();

    for (const sw of switches) {
      const pending = inputState.getPendingMove(sw.index);
      if (!pending) {
        const high = ((drivingValue >> sw.index) & 1) !== 0;
        this._snapSwitch(sw, high);
        continue;
      }

      const startHigh = pending.target === 0; // before flip → high if target is to go low
      const endHigh = pending.target === 1;

      this._ensureClonedMaterial(sw.mesh);
      this._setSwitchColor(sw.mesh, startHigh);
      sw.group.position.y = startHigh ? SWITCH_Y_ON : SWITCH_Y_OFF;

      if (!playing) continue;

      const span = Math.max(pending.endTick - pending.startTick, 1);
      const durationSeconds = span / tps;
      const fromY = startHigh ? SWITCH_Y_ON : SWITCH_Y_OFF;
      const toY = endHigh ? SWITCH_Y_ON : SWITCH_Y_OFF;
      const fromColor = startHigh ? FILLER_COLOR_HIGH : FILLER_COLOR_LOW;
      const toColor = endHigh ? FILLER_COLOR_HIGH : FILLER_COLOR_LOW;
      const fromIntensity = startHigh
        ? FILLER_EMISSIVE_HIGH_INTENSITY
        : FILLER_EMISSIVE_LOW_INTENSITY;
      const toIntensity = endHigh
        ? FILLER_EMISSIVE_HIGH_INTENSITY
        : FILLER_EMISSIVE_LOW_INTENSITY;

      tracks.push(
        new THREE.NumberKeyframeTrack(
          `${sw.group.name}.position[y]`,
          [0, durationSeconds],
          [fromY, toY]
        ),
        new THREE.ColorKeyframeTrack(
          `${sw.mesh.name}.material.color`,
          [0, durationSeconds],
          [fromColor.r, fromColor.g, fromColor.b, toColor.r, toColor.g, toColor.b]
        ),
        new THREE.ColorKeyframeTrack(
          `${sw.mesh.name}.material.emissive`,
          [0, durationSeconds],
          [fromColor.r, fromColor.g, fromColor.b, toColor.r, toColor.g, toColor.b]
        ),
        new THREE.NumberKeyframeTrack(
          `${sw.mesh.name}.material.emissiveIntensity`,
          [0, durationSeconds],
          [fromIntensity, toIntensity]
        )
      );
      activeNames.add(sw.name);
    }

    if (!playing || tracks.length === 0) {
      // Paused or no fresh tracks — nothing to (re)play, the snap above is enough.
      return;
    }

    const signature = `${inputState.startTick}-${activeNames.size}-${Array.from(activeNames)
      .sort()
      .join(',')}`;
    if (object3D.userData.currentActionStart === signature) return;

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

    const totalDuration = tracks.reduce((max, t) => Math.max(max, t.times[t.times.length - 1]!), 0);
    const clip = new THREE.AnimationClip('inputSwitches', totalDuration, tracks);
    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.play();

    object3D.userData.currentActionStart = signature;
    object3D.userData.currentAction = action;
    object3D.userData.currentClip = clip;
  }

  private _snapSwitch(sw: SwitchInfo, high: boolean): void {
    sw.group.position.y = high ? SWITCH_Y_ON : SWITCH_Y_OFF;
    this._setSwitchColor(sw.mesh, high);
  }

  private _setSwitchColor(mesh: THREE.Mesh, high: boolean): void {
    this._ensureClonedMaterial(mesh);
    const mat = mesh.material as THREE.MeshLambertMaterial;
    const color = high ? FILLER_COLOR_HIGH : FILLER_COLOR_LOW;
    mat.color.copy(color);
    mat.emissive.copy(color);
    mat.emissiveIntensity = high ? FILLER_EMISSIVE_HIGH_INTENSITY : FILLER_EMISSIVE_LOW_INTENSITY;
  }

  private _ensureClonedMaterial(mesh: THREE.Mesh): void {
    const mat = mesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType === CmpMatType.ANIMATION_CLONE) return;
    mesh.material = this.getMat(CmpMatCategory.DARK_GRAY).clone();
    (mesh.material as THREE.MeshLambertMaterial).userData.matType = CmpMatType.ANIMATION_CLONE;
  }

  private _restoreSharedMaterial(mesh: THREE.Mesh): void {
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

  private _findSwitches(object3D: THREE.Object3D): SwitchInfo[] {
    const groupByIndex = new Map<number, THREE.Group>();
    const meshByIndex = new Map<number, THREE.Mesh>();
    object3D.traverse((child) => {
      const part = child.userData.part as string | undefined;
      if (!part) return;
      const groupMatch = part.match(/^input_switch_group-(\d+)$/);
      if (groupMatch && child instanceof THREE.Group) {
        groupByIndex.set(parseInt(groupMatch[1]!, 10), child);
        return;
      }
      const meshMatch = part.match(/^input_switch-(\d+)$/);
      if (meshMatch && child instanceof THREE.Mesh) {
        meshByIndex.set(parseInt(meshMatch[1]!, 10), child);
      }
    });
    const result: SwitchInfo[] = [];
    for (const [index, group] of groupByIndex) {
      const mesh = meshByIndex.get(index);
      if (!mesh) continue;
      result.push({ mesh, group, index, name: mesh.name });
    }
    result.sort((a, b) => a.index - b.index);
    return result;
  }
}
