import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { ComponentType, type Component, type ComponentState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import {
  EmptyRectangleGeometry,
  RectangleWithNailGeometry
} from '../../utils/GeometryUtils';
import type { ConfigFormDefinition, VisualContext } from '../../types';
import { CmpMatCategory, CmpMatType } from '../types';

/**
 * Visual factory for EightBitOnesComplement components.
 *
 * Creates:
 * - An `envelope` frame (EmptyRectangleGeometry)
 * - A vertical `separator` dividing flag area / outputs cells
 * - 7 horizontal separators dividing ith cells
 * - 2 rectangles with nail filler, 3 animated box geometry and 2 filler boxes for flag area
 * - 8 cells outputs i representing output state
 *   cells materials are animated blue↔red following the component state
 * - pin groups for vcc, 8 inputs, 8*outputs and gnd
 *
 */
export class EightBitOnesComplementVisualFactory extends ComponentVisualFactoryBase {
  private readonly ENVELOPE_GEOM = EmptyRectangleGeometry(2.4,8.4,0.2,0.4);
  private readonly VERTICAL_SEPARATOR_GEOM = new THREE.BoxGeometry(0.1, 0.4,8.1);
  private readonly HORIZONTAL_SEPARATOR_GEOM = new THREE.BoxGeometry(1.05, 0.4,0.1);
  private readonly CELL_FILLER_GEOM = new THREE.BoxGeometry(0.95, 0.4, 0.9125);

  private readonly INDICATOR_MINUS_GEOM = new THREE.BoxGeometry(0.25, 0.4, 1);
  private readonly INDICATOR_PLUS_GEOM = new THREE.BoxGeometry(0.35, 0.4, 0.25);

  private readonly INDICATOR_FILLER_GEOM = RectangleWithNailGeometry(
      0.95,
      3.875,
      0.25,
      0.375,
      0.475,
      false,
      0.4
  );

  protected readonly FILLER_COLOR_HIGH = new THREE.Color(0xff4444);
  protected readonly FILLER_COLOR_LOW = new THREE.Color(0x4444ff);
  protected readonly FILLER_COLOR_NEUTRAL = new THREE.Color(0xffffff);
  protected readonly FILLER_EMISSIVE_BLACK = new THREE.Color(0x000000);
  protected readonly FILLER_EMISSIVE_HIGH_INTENSITY = 0.5;
  protected readonly FILLER_EMISSIVE_LOW_INTENSITY = 0.2;
  protected readonly FILLER_EMISSIVE_NEUTRAL_INTENSITY = 0;

  constructor() {
    super();
    this._componentType = ComponentType.EightBitOnesComplement;
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
      3,2.5,8.5);
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
    separator.position.set(0, 0.2, 0);
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
        hSeparator.position.set(0.525, 0.2, -3.0375 + 1.0125*outIdx);
        group.add(hSeparator);
      }
      const outputCell = new THREE.Mesh(this.CELL_FILLER_GEOM, this.getMat(CmpMatCategory.DARK_GRAY));
      outputCell.name = `output_cell-${outIdx}`; // required for AnimationMixer property binding
      outputCell.userData = {
        type: 'component',
        componentId: component.id,
        part: `output_cell-${outIdx}`,
      };
      outputCell.position.set(0.525, 0.2, -3.54375 + 1.0125*outIdx);
      group.add(outputCell);

      outIdx +=1;
    }

    // inverter indicator part
    // big fillers
    const upperFiller = new THREE.Mesh(this.INDICATOR_FILLER_GEOM, this.getMat(CmpMatCategory.WHITE));
    upperFiller.userData = {
      type: 'component',
      componentId: component.id,
      part: 'indicator_upper_filler',
    };
    upperFiller.rotateX(-Math.PI / 2);
    upperFiller.rotateY(-Math.PI);
    upperFiller.position.set(-0.525, 0.4, -2.0625);
    group.add(upperFiller);

    const lowerFiller = new THREE.Mesh(this.INDICATOR_FILLER_GEOM, this.getMat(CmpMatCategory.WHITE));
    lowerFiller.userData = {
      type: 'component',
      componentId: component.id,
      part: 'indicator_lower_filler',
    };
    lowerFiller.rotateX(Math.PI / 2);
    lowerFiller.rotateY(-Math.PI);
    lowerFiller.position.set(-0.525, 0, 2.0625);
    group.add(lowerFiller);

    const minusCell = new THREE.Mesh(this.INDICATOR_MINUS_GEOM, this.getMat(CmpMatCategory.DARK_GRAY));
    minusCell.name = `indicator_minus_cell`; // required for AnimationMixer property binding
    minusCell.userData = {
      type: 'component',
      componentId: component.id,
      part: `indicator_minus_cell`,
    };
    minusCell.position.set(-0.525, 0.2,0);
    group.add(minusCell);

    const plusLeftCell = new THREE.Mesh(this.INDICATOR_PLUS_GEOM, this.getMat(CmpMatCategory.WHITE));
    plusLeftCell.name = `indicator_plus_left_cell`; // required for AnimationMixer property binding
    plusLeftCell.userData = {
      type: 'component',
      componentId: component.id,
      part: `plus_left_cell`,
    };
    plusLeftCell.position.set(-0.825, 0.2,0);
    group.add(plusLeftCell);

    const plusRightCell = new THREE.Mesh(this.INDICATOR_PLUS_GEOM, this.getMat(CmpMatCategory.WHITE));
    plusRightCell.name = `indicator_plus_right_cell`; // required for AnimationMixer property binding
    plusRightCell.userData = {
      type: 'component',
      componentId: component.id,
      part: `plus_right_cell`,
    };
    plusRightCell.position.set(-0.225, 0.2,0);
    group.add(plusRightCell);




    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group);
    }

    return group;
  }

  protected createPinsVisual(component: Component, context: VisualContext, group: THREE.Group) {
    const vccNode = context.getENode(component.pins[0]!);
    if (vccNode) {
      const vccGroup = this.createPinGroup(vccNode, 'top');
      vccGroup.position.set(0, 0, -4.2);
      group.add(vccGroup);
    }

    const invertNode = context.getENode(component.pins[1]!);
    if (invertNode) {
      const invertGroup = this.createPinGroup(invertNode, 'top');
      invertGroup.position.set(-0.8, 0, -4.2);
      group.add(invertGroup);
    }

    let pinIdx = 2;
    // input
    while(pinIdx < 10){
      const node = context.getENode(component.pins[pinIdx]!);
      if(!node){
        pinIdx += 1;
        continue;
      }
      const pinGroup = this.createPinGroup(node, 'left');

      const interfaceIndex = pinIdx - 2;
      pinGroup.position.set(-1.2, 0, -3.85 + 1.1 * interfaceIndex);
      group.add(pinGroup);
      pinIdx += 1;
    }

    // output
    while(pinIdx < 18){
      const node = context.getENode(component.pins[pinIdx]!);
      if(!node){
        pinIdx += 1;
        continue;
      }
      const pinGroup = this.createPinGroup(node, 'right');

      const interfaceIndex = pinIdx - 10;
      pinGroup.position.set(1.2, 0, -3.85 + 1.1 * interfaceIndex);
      group.add(pinGroup);
      pinIdx += 1;
    }

    const gndNode = context.getENode(component.pins[18]!);
    if (gndNode) {
      const gndGroup = this.createPinGroup(gndNode, 'bottom');
      gndGroup.position.set(0, 0, 4.2);
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
      for (const cell of cells) this._restoreSharedMaterial(cell);
      return;
    }

    const isTransition = state.state.startsWith('to');
    const prevStable: string = isTransition
      ? (state.parameters.get('prevState') ?? '000')
      : state.state;
    const nextStable: string = isTransition ? (state.nextState ?? prevStable) : state.state;

    const prevValue = parseInt(prevStable, 16);
    const nextValue = parseInt(nextStable, 16);

    // Stable state: snap colors, no animation
    if (!isTransition || !state.hasExpiration) {
      this._cleanupMixer(object3D);
      for (const cell of cells) {
        this._setCellColor(cell, ((nextValue >> cell.bitPos) & 1) !== 0);
      }
      return;
    }

    // Paused + transitional: snap to prev color
    if (this._animationContext.simulationStatus !== 'playing') {
      for (const cell of cells) {
        this._setCellColor(cell, ((prevValue >> cell.bitPos) & 1) !== 0);
      }
      return;
    }

    // Playing + transitional: animate cells whose bit changes
    this._animateCells(object3D, cells, state, prevValue, nextValue);
  }

  // ---------------------------------------------------------------------------
  // Cell kind → target color mapping
  // ---------------------------------------------------------------------------

  /**
   * Resolve the target color state for a cell given its kind and the bit value:
   * - `output`: high→red, low→blue
   * - `minus`:  high→blue, low→red (inverted vs output — blue minus = complement active)
   * - `plus`:   high→white (blends with envelope, hiding the +), low→red
   */
  private _cellTarget(kind: CellKind, high: boolean): CellTarget {
    if (kind === 'plus') {
      return high
        ? { color: this.FILLER_COLOR_NEUTRAL, emissive: this.FILLER_EMISSIVE_BLACK, intensity: this.FILLER_EMISSIVE_NEUTRAL_INTENSITY }
        : { color: this.FILLER_COLOR_HIGH, emissive: this.FILLER_COLOR_HIGH, intensity: this.FILLER_EMISSIVE_HIGH_INTENSITY };
    }
    const showHigh = kind === 'minus' ? !high : high;
    return showHigh
      ? { color: this.FILLER_COLOR_HIGH, emissive: this.FILLER_COLOR_HIGH, intensity: this.FILLER_EMISSIVE_HIGH_INTENSITY }
      : { color: this.FILLER_COLOR_LOW, emissive: this.FILLER_COLOR_LOW, intensity: this.FILLER_EMISSIVE_LOW_INTENSITY };
  }

  // ---------------------------------------------------------------------------
  // Material helpers
  // ---------------------------------------------------------------------------

  private _setCellColor(cell: CellInfo, high: boolean): void {
    this._ensureClonedMaterial(cell.mesh);
    const mat = cell.mesh.material as THREE.MeshLambertMaterial;
    const target = this._cellTarget(cell.kind, high);
    mat.color.copy(target.color);
    mat.emissive.copy(target.emissive);
    mat.emissiveIntensity = target.intensity;
  }

  private _ensureClonedMaterial(mesh: THREE.Mesh): void {
    const mat = mesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType === CmpMatType.ANIMATION_CLONE) return;
    mesh.material = this.getMat(CmpMatCategory.DARK_GRAY).clone();
    (mesh.material as THREE.MeshLambertMaterial).userData.matType = CmpMatType.ANIMATION_CLONE;
  }

  private _restoreSharedMaterial(cell: CellInfo): void {
    const mat = cell.mesh.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType !== CmpMatType.ANIMATION_CLONE) return;
    mat.dispose();
    cell.mesh.material = this.getMat(cell.originalCategory);
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

  /**
   * Collect all animated cells (8 outputs + minus + 2 plus parts).
   * Output cells read bits 0–7; the three indicator cells all read bit 8
   * (the invert flag) but render it with different color rules.
   */
  private _findCellMeshes(object3D: THREE.Object3D): CellInfo[] {
    const result: CellInfo[] = [];
    object3D.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const part = child.userData.part as string | undefined;
      if (!part) return;

      const outputMatch = part.match(/^output_cell-(\d)$/);
      if (outputMatch) {
        const i = parseInt(outputMatch[1]!);
        result.push({ mesh: child, bitPos: i, name: child.name, kind: 'output', originalCategory: CmpMatCategory.DARK_GRAY });
        return;
      }
      if (part === 'indicator_minus_cell') {
        result.push({ mesh: child, bitPos: 8, name: child.name, kind: 'minus', originalCategory: CmpMatCategory.DARK_GRAY });
        return;
      }
      if (part === 'plus_left_cell' || part === 'plus_right_cell') {
        result.push({ mesh: child, bitPos: 8, name: child.name, kind: 'plus', originalCategory: CmpMatCategory.WHITE });
      }
    });
    return result;
  }

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  /**
   * Animate all cells over the transition span.
   * Builds a single AnimationClip with tracks only for cells whose bit changes.
   */
  private _animateCells(
    object3D: THREE.Object3D,
    cells: CellInfo[],
    state: ComponentState,
    prevValue: number,
    nextValue: number
  ): void {
    if (object3D.userData.currentActionStart === state.startTick) return;

    const tps = this._animationContext!.ticksPerSecond;
    const span = state.expirationTick - state.startTick;
    const durationSeconds = span / tps;

    const tracks: THREE.KeyframeTrack[] = [];

    for (const cell of cells) {
      const prevHigh = ((prevValue >> cell.bitPos) & 1) !== 0;
      const nextHigh = ((nextValue >> cell.bitPos) & 1) !== 0;

      this._ensureClonedMaterial(cell.mesh);

      if (prevHigh === nextHigh) {
        this._setCellColor(cell, nextHigh);
        continue;
      }
      this._pushCellTracks(tracks, cell, nextHigh, durationSeconds);
    }

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

    const clip = new THREE.AnimationClip('onesComplementCells', durationSeconds, tracks);
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
    cell: CellInfo,
    toHigh: boolean,
    durationSeconds: number
  ): void {
    const mat = cell.mesh.material as THREE.MeshLambertMaterial;
    const target = this._cellTarget(cell.kind, toHigh);
    const fromColor = [mat.color.r, mat.color.g, mat.color.b];
    const fromEmissive = [mat.emissive.r, mat.emissive.g, mat.emissive.b];
    const toColor = [target.color.r, target.color.g, target.color.b];
    const toEmissive = [target.emissive.r, target.emissive.g, target.emissive.b];

    tracks.push(
      new THREE.ColorKeyframeTrack(
        `${cell.name}.material.color`,
        [0, durationSeconds],
        [...fromColor, ...toColor]
      ),
      new THREE.ColorKeyframeTrack(
        `${cell.name}.material.emissive`,
        [0, durationSeconds],
        [...fromEmissive, ...toEmissive]
      ),
      new THREE.NumberKeyframeTrack(
        `${cell.name}.material.emissiveIntensity`,
        [0, durationSeconds],
        [mat.emissiveIntensity, target.intensity]
      )
    );
  }
}

// ---------------------------------------------------------------------------
// Cell typing
// ---------------------------------------------------------------------------

type CellKind = 'output' | 'minus' | 'plus';

type CellInfo = {
  mesh: THREE.Mesh;
  bitPos: number;
  name: string;
  kind: CellKind;
  originalCategory: CmpMatCategory;
};

type CellTarget = {
  color: THREE.Color;
  emissive: THREE.Color;
  intensity: number;
};
