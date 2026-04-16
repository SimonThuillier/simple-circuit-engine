import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { ComponentType, type Component, type ComponentState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import {
  KuKoGeometry,
} from '../../utils/GeometryUtils';
import type { ConfigFormDefinition, VisualContext } from '../../types';
import { CmpMatCategory, CmpMatType } from '../types';

/**
 * Visual factory for EightBitAdder components.
 *
 * Creates:
 * - An `envelope` frame (KuKoGeometry)
 * - A vertical `separator` dividing carry/sum cells
 * - 7 horizontal separators dividing ith cells
 * - 16 cells carry i / sum i representing state
 *   cells materials are animated blue↔red following the component state
 * - pin groups for vcc, 2*8 inputs, 8*sums, carryIn, carryOut and gnd
 *
 */
export class EightBitAdderVisualFactory extends ComponentVisualFactoryBase {
  private readonly ENVELOPE_GEOM = KuKoGeometry(4.4,4.4,16.8,20,0.4,0.4);
  private readonly VERTICAL_SEPARATOR_GEOM = new THREE.BoxGeometry(0.2, 0.4,16.2);
  private readonly HORIZONTAL_SEPARATOR_GEOM = new THREE.BoxGeometry(4, 0.4,0.2);
  private readonly CELL_FILLER_GEOM = new THREE.BoxGeometry(1.9, 0.4, 1.825);

  protected readonly FILLER_COLOR_HIGH = new THREE.Color(0xff4444);
  protected readonly FILLER_COLOR_LOW = new THREE.Color(0x4444ff);
  protected readonly FILLER_EMISSIVE_HIGH_INTENSITY = 0.5;
  protected readonly FILLER_EMISSIVE_LOW_INTENSITY = 0.2;

  constructor() {
    super();
    this._componentType = ComponentType.EightBitAdder;
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
      9,2.5,17);
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

    // vertical Separator
    const separator = new THREE.Mesh(this.VERTICAL_SEPARATOR_GEOM, this.getMat(CmpMatCategory.WHITE));
    separator.userData = {
      type: 'component',
      componentId: component.id,
      part: 'vertical_separator',
    };
    separator.position.set(2, 0.2, 0);
    group.add(separator);

    let outIdx = 0;
    while(outIdx < 8){
      if(outIdx < 7){
        const hSeparator = new THREE.Mesh(this.HORIZONTAL_SEPARATOR_GEOM, this.getMat(CmpMatCategory.WHITE));
        hSeparator.userData = {
          type: 'component',
          componentId: component.id,
          part: `horizontal_separator-${outIdx}`,
        };
        hSeparator.position.set(2, 0.2, -6.075 + 2.025*outIdx);
        group.add(hSeparator);
      }
      const carryCell = new THREE.Mesh(this.CELL_FILLER_GEOM, this.getMat(CmpMatCategory.DARK_GRAY));
      carryCell.name = `carry_cell-${outIdx}`; // required for AnimationMixer property binding
      carryCell.userData = {
        type: 'component',
        componentId: component.id,
        part: `carry_cell-${outIdx}`,
      };
      carryCell.position.set(0.95, 0.2, -7.0875 + 2.025*outIdx);
      group.add(carryCell);
      const sumCell = new THREE.Mesh(this.CELL_FILLER_GEOM, this.getMat(CmpMatCategory.DARK_GRAY));
      sumCell.name = `sum_cell-${outIdx}`; // required for AnimationMixer property binding
      sumCell.userData = {
        type: 'component',
        componentId: component.id,
        part: `sum_cell-${outIdx}`,
      };
      sumCell.position.set(3.05, 0.2, -7.0875 + 2.025*outIdx);
      group.add(sumCell);

      outIdx +=1;
    }

    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group);
    }

    return group;
  }

  protected createPinsVisual(component: Component, context: VisualContext, group: THREE.Group) {
    const vccNode = context.getENode(component.pins[0]!);
    if (vccNode) {
      const vccGroup = this.createPinGroup(vccNode, 'top');
      vccGroup.position.set(2, 0, -8.4);
      group.add(vccGroup);
    }

    const carryInNode = context.getENode(component.pins[1]!);
    if (carryInNode) {
      const carryInGroup = this.createPinGroup(carryInNode, 'top');
      carryInGroup.position.set(0.8, 0, -8.4);
      group.add(carryInGroup);
    }

    let pinIdx = 2;
    // input A
    while(pinIdx < 10){
      const node = context.getENode(component.pins[pinIdx]!);
      if(!node){
        pinIdx += 1;
        continue;
      }
      const pinGroup = this.createPinGroup(node, 'left', new THREE.Euler(0.51, 0, 0));

      const interfaceIndex = pinIdx - 2;
      pinGroup.position.set(-0.2 - interfaceIndex*0.55, 0, -8 + 1.05 * interfaceIndex);
      group.add(pinGroup);
      pinIdx += 1;
    }

    // input B
    while(pinIdx < 18){
      const node = context.getENode(component.pins[pinIdx]!);
      if(!node){
        pinIdx += 1;
        continue;
      }
      const pinGroup = this.createPinGroup(node, 'left', new THREE.Euler(-0.51, 0, 0));

      const interfaceIndex = pinIdx - 10;
      pinGroup.position.set(-4.05 + interfaceIndex*0.55, 0, 0.65 + 1.05 * interfaceIndex);
      group.add(pinGroup);
      pinIdx += 1;
    }

    // output sum
    while(pinIdx < 26){
      const node = context.getENode(component.pins[pinIdx]!);
      if(!node){
        pinIdx += 1;
        continue;
      }
      const pinGroup = this.createPinGroup(node, 'right');

      const interfaceIndex = pinIdx - 18;
      pinGroup.position.set(4.4, 0, -7 + 2 * interfaceIndex);
      group.add(pinGroup);
      pinIdx += 1;
    }

    const carryOutNode = context.getENode(component.pins[26]!);
    if (carryOutNode) {
      const carryOutGroup = this.createPinGroup(carryOutNode, 'bottom');
      carryOutGroup.position.set(3.4, 0, 8.4);
      group.add(carryOutGroup);
    }

    const gndNode = context.getENode(component.pins[27]!);
    if (gndNode) {
      const gndGroup = this.createPinGroup(gndNode, 'bottom');
      gndGroup.position.set(2, 0, 8.4);
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
    const cells = this._findCellMeshes(object3D);
    if (cells.length === 0) return;

    if (!state || !this._animationContext || state.state === 'indeterminate') {
      this._cleanupMixer(object3D);
      for (const { mesh } of cells) this._restoreSharedMaterial(mesh);
      return;
    }

    const isTransition = state.state.startsWith('to');
    const prevStable: string = isTransition
      ? (state.parameters.get('prevState') ?? '0000')
      : state.state;
    const nextStable: string = isTransition ? (state.nextState ?? prevStable) : state.state;

    const prevValue = parseInt(prevStable, 16);
    const nextValue = parseInt(nextStable, 16);

    // Stable state: snap colors, no animation
    if (!isTransition || !state.hasExpiration) {
      this._cleanupMixer(object3D);
      for (const { mesh, bitPos } of cells) {
        this._setCellColor(mesh, ((nextValue >> bitPos) & 1) !== 0);
      }
      return;
    }

    // Paused + transitional: snap to prev color
    if (this._animationContext.simulationStatus !== 'playing') {
      for (const { mesh, bitPos } of cells) {
        this._setCellColor(mesh, ((prevValue >> bitPos) & 1) !== 0);
      }
      return;
    }

    // Playing + transitional: animate cells whose bit changes
    this._animateCells(object3D, cells, state, prevValue, nextValue);
  }

  // ---------------------------------------------------------------------------
  // Material helpers
  // ---------------------------------------------------------------------------

  private _setCellColor(mesh: THREE.Mesh, high: boolean): void {
    this._ensureClonedMaterial(mesh);
    const mat = mesh.material as THREE.MeshLambertMaterial;
    const color = high ? this.FILLER_COLOR_HIGH : this.FILLER_COLOR_LOW;
    const intensity = high
      ? this.FILLER_EMISSIVE_HIGH_INTENSITY
      : this.FILLER_EMISSIVE_LOW_INTENSITY;
    mat.color.copy(color);
    mat.emissive.copy(color);
    mat.emissiveIntensity = intensity;
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

  // ---------------------------------------------------------------------------
  // Cell discovery
  // ---------------------------------------------------------------------------

  /** Collect all 16 cell meshes with their state bit position. */
  private _findCellMeshes(object3D: THREE.Object3D): { mesh: THREE.Mesh; bitPos: number; name: string }[] {
    const result: { mesh: THREE.Mesh; bitPos: number; name: string }[] = [];
    object3D.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const part = child.userData.part as string | undefined;
      if (!part) return;

      const sumMatch = part.match(/^sum_cell-(\d)$/);
      if (sumMatch) {
        const i = parseInt(sumMatch[1]!);
        result.push({ mesh: child, bitPos: 2 * i, name: child.name });
        return;
      }
      const carryMatch = part.match(/^carry_cell-(\d)$/);
      if (carryMatch) {
        const i = parseInt(carryMatch[1]!);
        result.push({ mesh: child, bitPos: 2 * i + 1, name: child.name });
      }
    });
    return result;
  }

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  /**
   * Animate the 16 cells over the transition span.
   * Builds a single AnimationClip with tracks only for cells whose bit changes.
   */
  private _animateCells(
    object3D: THREE.Object3D,
    cells: { mesh: THREE.Mesh; bitPos: number; name: string }[],
    state: ComponentState,
    prevValue: number,
    nextValue: number
  ): void {
    if (object3D.userData.currentActionStart === state.startTick) return;

    const tps = this._animationContext!.ticksPerSecond;
    const span = state.expirationTick - state.startTick;
    const durationSeconds = span / tps;

    const tracks: THREE.KeyframeTrack[] = [];

    for (const { mesh, bitPos, name } of cells) {
      const prevHigh = ((prevValue >> bitPos) & 1) !== 0;
      const nextHigh = ((nextValue >> bitPos) & 1) !== 0;

      this._ensureClonedMaterial(mesh);

      if (prevHigh === nextHigh) {
        // No change — snap to stable color
        this._setCellColor(mesh, nextHigh);
        continue;
      }
      // Push color transition tracks for this cell
      this._pushCellTracks(tracks, name, mesh, nextHigh, durationSeconds);
    }

    // No tracks → nothing to animate. Record start to dedupe.
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

    const clip = new THREE.AnimationClip('adderCells', durationSeconds, tracks);
    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.play();

    object3D.userData.currentActionStart = state.startTick;
    object3D.userData.currentAction = action;
    object3D.userData.currentClip = clip;
  }

  private _pushCellTracks(
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
}
