import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { type Component, type ComponentState, LightState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { RoundIceBoxGeometry } from '../../utils/GeometryUtils';
import type { ConfigFormDefinition, VisualContext } from '../../types';
import { CmpMatCategory, CmpMatType } from '../types';

/** Common envelope width — same for 1/2/4/8 light variants. */
const ENVELOPE_WIDTH = 1.2;
/** Hole radius (also bulb radius). */
const HOLE_RADIUS = 0.4;
const ENVELOPE_DEPTH = 0.4;
/** Cylindrical base sitting in each hole. */
const BASE_HEIGHT = 0.4;
const BASE_RADIUS = HOLE_RADIUS;
/** Half-sphere bulb on top of the base. */
const BULB_RADIUS = HOLE_RADIUS;

const LIT_COLOR = new THREE.Color(0xffff00);
const UNLIT_COLOR = new THREE.Color(0x000000);
const LIT_INTENSITY = 1.0;
const UNLIT_OPACITY = 0.55;
const LIT_OPACITY = 1.0;

type LightInfo = {
  base: THREE.Mesh;
  bulb: THREE.Mesh;
  index: number;
  baseName: string;
  bulbName: string;
};

/**
 * Shared visual factory for the OneLight, TwoLight, FourLight and EightLight
 * components.
 *
 * Builds a `RoundIceBoxGeometry` envelope with `bitCount` circular holes laid
 * out along the z-axis. Each hole houses a glass cylinder + half-sphere
 * representing a light:
 *
 * - **Stable state**: each light glows (yellow emissive) or is dim (low
 *   opacity, no emissive) according to the corresponding hex bit.
 * - **Moving state**: settled lights snap to the driving (prevState) bit;
 *   pending lights smoothly animate emissive intensity / opacity / color over
 *   their per-light span.
 * - **Indeterminate state**: every light is restored to the neutral glass.
 */
export abstract class LightVisualFactoryBase extends ComponentVisualFactoryBase {
  /** Number of lights / outputs (1, 2, 4 or 8). */
  protected abstract readonly bitCount: number;
  /** Centre (x,y) of each hole in envelope-local 2D space. */
  protected abstract readonly holePositions: Array<{ x: number; y: number }>;
  /** Total z-axis length of the envelope. */
  protected abstract readonly envelopeHeight: number;

  private _envelopeGeom: THREE.BufferGeometry | null = null;
  private _baseGeom: THREE.CylinderGeometry | null = null;
  private _bulbGeom: THREE.SphereGeometry | null = null;

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
      this._envelopeGeom = RoundIceBoxGeometry(
        ENVELOPE_WIDTH,
        this.envelopeHeight,
        HOLE_RADIUS,
        this.holePositions,
        ENVELOPE_DEPTH
      );
    }
    const envelope = new THREE.Mesh(this._envelopeGeom, this.getMat(CmpMatCategory.WHITE));
    envelope.userData = { type: 'component', componentId: component.id, part: 'envelope' };
    envelope.rotateX(-Math.PI / 2);
    envelope.position.set(0, 0, 0);
    group.add(envelope);

    if (!this._baseGeom) {
      this._baseGeom = new THREE.CylinderGeometry(BASE_RADIUS, BASE_RADIUS, BASE_HEIGHT, 24);
    }
    if (!this._bulbGeom) {
      this._bulbGeom = new THREE.SphereGeometry(BULB_RADIUS, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    }

    for (let i = 0; i < this.bitCount; i++) {
      const holePos = this.holePositions[i]!;
      const base = new THREE.Mesh(this._baseGeom, this.getMat(CmpMatCategory.DARK_GRAY));
      base.name = `light_base-${i}`;
      base.userData = {
        type: 'component',
        componentId: component.id,
        part: `light_base-${i}`,
      };
      base.position.set(holePos.x, BASE_HEIGHT / 2, holePos.y);
      group.add(base);

      const bulb = new THREE.Mesh(this._bulbGeom, this.getMat(CmpMatCategory.GLASS));
      bulb.name = `light_bulb-${i}`;
      bulb.userData = {
        type: 'component',
        componentId: component.id,
        part: `light_bulb-${i}`,
      };
      bulb.position.set(holePos.x, BASE_HEIGHT, holePos.y);
      bulb.renderOrder = -1;
      group.add(bulb);
    }

    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group);
    }

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

    // input pins: pins[1 .. 1+bitCount-1] on the LEFT side
    for (let i = 0; i < this.bitCount; i++) {
      const node = context.getENode(component.pins[1 + i]!);
      if (!node) continue;
      const pinGroup = this.createPinGroup(node, 'left');
      const holeY = this.holePositions[i]!.y;
      pinGroup.position.set(-ENVELOPE_WIDTH / 2, 0, holeY);
      group.add(pinGroup);
    }

    // output pins: pins[1+bitCount .. 1+2*bitCount-1] on the RIGHT side
    for (let i = 0; i < this.bitCount; i++) {
      const node = context.getENode(component.pins[1 + this.bitCount + i]!);
      if (!node) continue;
      const pinGroup = this.createPinGroup(node, 'right');
      const holeY = this.holePositions[i]!.y;
      pinGroup.position.set(ENVELOPE_WIDTH / 2, 0, holeY);
      group.add(pinGroup);
    }

    const gndNode = context.getENode(component.pins[1 + 2 * this.bitCount]!);
    if (gndNode) {
      const gndGroup = this.createPinGroup(gndNode, 'bottom');
      gndGroup.position.set(0, 0, halfH);
      group.add(gndGroup);
    }
  }

  override getConfigFormDefinition(): ConfigFormDefinition | null {
    return {
      fields: [
        { key: 'transitionSpan', type: 'number', min: 1, step: 1 },
        { key: 'size', type: 'number', min: 1, max: 16, step: 1 },
      ],
    };
  }

  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    formData.set('transitionSpan', parseFloat(config.get('transitionSpan') || '2'));
    formData.set('size', parseFloat(config.get('size') || '1'));
    return formData;
  }

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

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const lights = this._findLights(object3D);
    if (lights.length === 0) return;

    if (!state || !this._animationContext) {
      this._cleanupMixer(object3D);
      for (const light of lights) {
        this._restoreSharedMaterial(light.base);
        this._restoreSharedMaterial(light.bulb);
      }
      return;
    }

    const lightState = state as LightState;

    if (lightState.state === 'indeterminate') {
      this._cleanupMixer(object3D);
      for (const light of lights) {
        this._restoreSharedMaterial(light.base);
        this._restoreSharedMaterial(light.bulb);
      }
      return;
    }

    const playing = this._animationContext.simulationStatus === 'playing';

    if (!lightState.isInTransition) {
      this._cleanupMixer(object3D);
      const value = parseInt(lightState.state, 16);
      for (const light of lights) {
        const high = ((value >> light.index) & 1) !== 0;
        this._snapLight(light, high);
      }
      return;
    }

    // Moving: settled lights snap to driving bit; pending lights animate.
    const drivingHex = lightState.parameters.get('prevState') ?? lightState.allLowState;
    const drivingValue = parseInt(drivingHex, 16);
    const tps = this._animationContext.ticksPerSecond;

    let mixer: THREE.AnimationMixer | undefined = object3D.userData.mixer;
    const tracks: THREE.KeyframeTrack[] = [];
    const activeNames = new Set<string>();

    for (const light of lights) {
      const pending = lightState.getPendingMove(light.index);
      if (!pending) {
        const high = ((drivingValue >> light.index) & 1) !== 0;
        this._snapLight(light, high);
        continue;
      }
      const startHigh = pending.target === 0;
      const endHigh = pending.target === 1;

      this._ensureClonedMaterial(light.base);
      this._ensureClonedMaterial(light.bulb);
      this._setLightMaterial(light, startHigh);

      if (!playing) continue;

      const span = Math.max(pending.endTick - pending.startTick, 1);
      const durationSeconds = span / tps;
      const fromColor = startHigh ? LIT_COLOR : UNLIT_COLOR;
      const toColor = endHigh ? LIT_COLOR : UNLIT_COLOR;
      const fromIntensity = startHigh ? LIT_INTENSITY : 0;
      const toIntensity = endHigh ? LIT_INTENSITY : 0;
      const fromOpacity = startHigh ? LIT_OPACITY : UNLIT_OPACITY;
      const toOpacity = endHigh ? LIT_OPACITY : UNLIT_OPACITY;

      for (const meshName of [light.baseName, light.bulbName]) {
        tracks.push(
          new THREE.NumberKeyframeTrack(
            `${meshName}.material.emissiveIntensity`,
            [0, durationSeconds],
            [fromIntensity, toIntensity]
          ),
          new THREE.NumberKeyframeTrack(
            `${meshName}.material.opacity`,
            [0, durationSeconds],
            [fromOpacity, toOpacity]
          ),
          new THREE.ColorKeyframeTrack(
            `${meshName}.material.emissive`,
            [0, durationSeconds],
            [fromColor.r, fromColor.g, fromColor.b, toColor.r, toColor.g, toColor.b]
          )
        );
      }
      activeNames.add(light.bulbName);
    }

    if (!playing || tracks.length === 0) return;

    const signature = `${lightState.startTick}-${activeNames.size}-${Array.from(activeNames)
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
    const clip = new THREE.AnimationClip('lightGlow', totalDuration, tracks);
    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.play();

    object3D.userData.currentActionStart = signature;
    object3D.userData.currentAction = action;
    object3D.userData.currentClip = clip;
  }

  private _snapLight(light: LightInfo, high: boolean): void {
    this._ensureClonedMaterial(light.base);
    this._ensureClonedMaterial(light.bulb);
    this._setLightMaterial(light, high);
  }

  private _setLightMaterial(light: LightInfo, high: boolean): void {
    for (const mesh of [light.base, light.bulb]) {
      const mat = mesh.material as THREE.MeshLambertMaterial;
      if (high) {
        mat.emissive.copy(LIT_COLOR);
        mat.emissiveIntensity = LIT_INTENSITY;
        mat.opacity = LIT_OPACITY;
      } else {
        mat.emissive.copy(UNLIT_COLOR);
        mat.emissiveIntensity = 0;
        mat.opacity = UNLIT_OPACITY;
      }
    }
  }

  private _ensureClonedMaterial(mesh: THREE.Mesh): void {
    const mat = mesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType === CmpMatType.ANIMATION_CLONE) return;
    console.log(mesh.userData);
    if(!!mesh.userData.part && mesh.userData.part.startsWith('light_base-')){
      mesh.material = this.getMat(CmpMatCategory.DARK_GRAY).clone();
    }
    else {
      mesh.material = this.getMat(CmpMatCategory.GLASS).clone();
    }
    (mesh.material as THREE.MeshLambertMaterial).userData.matType = CmpMatType.ANIMATION_CLONE;
  }

  private _restoreSharedMaterial(mesh: THREE.Mesh): void {
    const mat = mesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType !== CmpMatType.ANIMATION_CLONE) return;
    mat.dispose();
    if(!!mesh.userData.part && mesh.userData.part.startsWith('light_base-')){
      mesh.material = this.getMat(CmpMatCategory.DARK_GRAY);
    }
    else {
      mesh.material = this.getMat(CmpMatCategory.GLASS);
    }
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

  private _findLights(object3D: THREE.Object3D): LightInfo[] {
    const baseByIndex = new Map<number, THREE.Mesh>();
    const bulbByIndex = new Map<number, THREE.Mesh>();
    object3D.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const part = child.userData.part as string | undefined;
      if (!part) return;
      const baseMatch = part.match(/^light_base-(\d+)$/);
      if (baseMatch) {
        baseByIndex.set(parseInt(baseMatch[1]!, 10), child);
        return;
      }
      const bulbMatch = part.match(/^light_bulb-(\d+)$/);
      if (bulbMatch) {
        bulbByIndex.set(parseInt(bulbMatch[1]!, 10), child);
      }
    });
    const result: LightInfo[] = [];
    for (const [index, base] of baseByIndex) {
      const bulb = bulbByIndex.get(index);
      if (!bulb) continue;
      result.push({
        base,
        bulb,
        index,
        baseName: base.name,
        bulbName: bulb.name,
      });
    }
    result.sort((a, b) => a.index - b.index);
    return result;
  }
}
