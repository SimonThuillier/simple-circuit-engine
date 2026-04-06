import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import { CmpMatCategory, CmpMatType } from '../types';
import type { Component, ComponentState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type { ConfigFormDefinition, VisualContext } from '../../types';
import { RingGeometry, LGeometry } from '../../utils/GeometryUtils';

/**
 * Lightweight struct returned by _findParts for convenient access
 * to the relay's animated sub-objects.
 */
interface RelayParts {
  contactorGroup: THREE.Group;
  contactor: THREE.Mesh;
  coilBar: THREE.Mesh;
  firstCoil: THREE.Mesh;
  allCoils: THREE.Mesh[];
  powerInBar: THREE.Mesh;
}

/**
 * Visual factory for Relay components.
 *
 * Animation (3 independent clip groups on a single AnimationMixer):
 *
 * 1. **Mechanical clip** — contactor rotation + coil bar position + bar emissive glow
 *    Triggered on state transition (closing/opening). Duration = transitionSpan.
 *
 * 2. **Coil color clip** — all coil rings share one cloned material, single color track
 *    Triggered on cmd param change. Deduped by target color hex.
 *
 * 3. **Power color clip** — contactor + powerInBar share one cloned material, single color track
 *    Triggered on power param change. Deduped by target color hex.
 */
export class RelayVisualFactory extends ComponentVisualFactoryBase {

  // ---------------------------------------------------------------------------
  // Geometries
  // ---------------------------------------------------------------------------

  private readonly COIL_GEOM = RingGeometry(0.35, 0.4, 0.1, 16);
  private readonly COIL_BAR_GEOM = new THREE.BoxGeometry(0.1, 0.4, 1.4, 2);
  private readonly PWIN_BAR_GEOM = new THREE.BoxGeometry(0.1, 0.4, 0.85, 2);
  private readonly CONTACTOR_GEOM = LGeometry(0.68, 1.48, 0.1, 140, false, 0.1, 0.4, 16);
  private readonly NEGATIVE_CONTACTOR_GEOM = LGeometry(0.68, 1.58, 0.1, 120, false, 0.1, 0.4, 16);

  // ---------------------------------------------------------------------------
  // Coil bar Z positions
  // ---------------------------------------------------------------------------

  private readonly COIL_BAR_Z_IDLE = 0;
  private readonly COIL_BAR_Z_ACTIVE = -0.2;

  // ---------------------------------------------------------------------------
  // Contactor rotations
  // ---------------------------------------------------------------------------

  private readonly IDLE_ROTATION = new THREE.Euler(-Math.PI / 2, 0, -Math.PI);
  private readonly ACTIVE_ROTATION = new THREE.Euler(-Math.PI / 2, 0, -Math.PI - 0.34);

  // ---------------------------------------------------------------------------
  // Colors
  // ---------------------------------------------------------------------------

  /** Coil ring colors (from cmd.voltage / cmd.current) */
  private readonly COIL_COLOR_BOTH = new THREE.Color(0xff00ff);
  private readonly COIL_COLOR_VOLTAGE = new THREE.Color(0xff4444);
  private readonly COIL_COLOR_CURRENT = new THREE.Color(0x4444ff);
  private readonly COIL_COLOR_NONE = new THREE.Color(0xffffff);

  /** Magnetic bar glow */
  private readonly BAR_GLOW_COLOR = new THREE.Color(0xffcc00);
  private readonly BAR_GLOW_INTENSITY = 0.9;

  /** Power element colors (from power_in / power_out) */
  private readonly POWER_COLOR_BOTH = new THREE.Color(0xff00ff);
  private readonly POWER_COLOR_VOLTAGE = new THREE.Color(0xff4444);
  private readonly POWER_COLOR_CURRENT = new THREE.Color(0x4444ff);
  private readonly POWER_COLOR_NONE = new THREE.Color(0xffffff);

  // ===================================================================
  // Visual Construction
  // ===================================================================

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 1, 2);
    group.add(hitbox);

    const coilGroup = this._createCoilGroup(component);
    group.add(coilGroup);
    coilGroup.position.set(-0.5, 0, 0);

    const contactorGroup = this._createContactorGroup(component.id, component.config);
    group.add(contactorGroup);
    contactorGroup.position.set(0, 0, -0.7);
    contactorGroup.rotation.copy(this.IDLE_ROTATION);

    const powerInBar = new THREE.Mesh(this.PWIN_BAR_GEOM, this.getMat(CmpMatCategory.WHITE));
    powerInBar.name = 'powerInBar';
    powerInBar.userData = { part: 'powerInBar' };
    powerInBar.rotateY(-Math.PI / 2);
    powerInBar.position.set(0.48, 0, -0.7);
    group.add(powerInBar);

    if (component.pins.length > 0) {
      this._createPinsVisual(component, context, group);
    }

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  private _createPinsVisual(
      component: Component,
      context: VisualContext,
      group: THREE.Group): void {
    const cmdOutNode = context.getENode(component.pins[1]!);
    if (cmdOutNode) {
      const cmdOutGroup = this.createPinGroup(cmdOutNode, 'left');
      cmdOutGroup.position.set(-0.9, 0, 0.7);
      group.add(cmdOutGroup);
      const counterpart = this.createPinCounterpart(cmdOutGroup, this.getMat(CmpMatCategory.WHITE));
      if (counterpart) group.add(counterpart);
    }

    const powerInNode = context.getENode(component.pins[2]!);
    if (powerInNode) {
      const powerInGroup = this.createPinGroup(powerInNode, 'right');
      powerInGroup.position.set(0.9, 0, -0.7);
      powerInGroup.renderOrder = 1;
      powerInGroup.children.forEach((child) => { child.renderOrder = 1; });
      group.add(powerInGroup);
      const counterpart = this.createPinCounterpart(powerInGroup, this.getMat(CmpMatCategory.WHITE));
      if (counterpart) group.add(counterpart);
    }

    const cmdInNode = context.getENode(component.pins[0]!);
    if (cmdInNode) {
      const cmdInGroup = this.createPinGroup(cmdInNode, 'left');
      cmdInGroup.position.set(-0.9, 0, -0.7);
      group.add(cmdInGroup);
      const counterpart = this.createPinCounterpart(cmdInGroup, this.getMat(CmpMatCategory.WHITE));
      if (counterpart) group.add(counterpart);
    }

    const powerOutNode = context.getENode(component.pins[3]!);
    if (powerOutNode) {
      const powerOutGroup = this.createPinGroup(powerOutNode, 'right');
      powerOutGroup.position.set(0.9, 0, 0.7);
      group.add(powerOutGroup);
      const counterpart = this.createPinCounterpart(powerOutGroup, this.getMat(CmpMatCategory.WHITE));
      if (counterpart) group.add(counterpart);
    }
  }

  private _createCoilGroup(component: Component): THREE.Group {
    const coilGroup = new THREE.Group();
    coilGroup.userData = {
      type: 'component',
      componentId: component.id,
      part: 'coilGroup',
    };

    const partData = {
      type: 'component',
      componentId: component.id,
      part: 'coil',
    };

    let coilIndex = 0;
    const addCoil = (z: number, xr: number) => {
      const coil = new THREE.Mesh(this.COIL_GEOM, this.getMat(CmpMatCategory.WHITE));
      coil.name = `coil${coilIndex}`;
      coil.userData = { ...partData };
      coil.position.set(0, 0, z);
      coil.rotateX(xr);
      coilGroup.add(coil);
      coilIndex++;
    };

    addCoil(0.6, -0.03);
    addCoil(0.4, 0.03);
    addCoil(0.2, -0.03);
    addCoil(0, 0.03);
    addCoil(-0.2, -0.03);
    addCoil(-0.4, 0.03);
    addCoil(-0.6, -0.03);

    const bar = new THREE.Mesh(this.COIL_BAR_GEOM, this.getMat(CmpMatCategory.SHINY_SILVER));
    bar.name = 'coilBar';
    bar.userData = { ...partData, part: 'coilBar' };
    coilGroup.add(bar);

    return coilGroup;
  }

  private _createContactorGroup(
      componentId: String,
      config: Map<string, string>): THREE.Group {
    const contactorGroup = new THREE.Group();
    contactorGroup.name = 'contactorGroup';
    contactorGroup.userData = {
      type: 'component',
      componentId: componentId,
      part: 'contactorGroup',
      variant: config.get('activationLogic'),
    };

    const activationLogic = config.get('activationLogic');
    const geom = activationLogic === 'negative'
        ? this.NEGATIVE_CONTACTOR_GEOM
        : this.CONTACTOR_GEOM;

    const contactor = new THREE.Mesh(geom, this.getMat(CmpMatCategory.WHITE));
    contactor.name = 'contactor';
    contactor.userData = {
      type: 'component',
      componentId: componentId,
      part: 'contactor',
      variant: activationLogic,
    };
    contactor.translateZ(-0.2);
    contactorGroup.add(contactor);

    return contactorGroup;
  }

  private _disposeContactorGroup(object3D: THREE.Object3D): void {
    const contactorGroup = this._findContactorGroup(object3D);
    if (!contactorGroup) return;
    object3D.remove(contactorGroup);
  }

  // ===================================================================
  // Configuration Form
  // ===================================================================

  override getConfigFormDefinition(): ConfigFormDefinition | null {
    return {
      fields: [
        { key: 'activationLogic', label: 'Activation Logic', type: 'boolean' },
        { key: 'transitionSpan', label: 'Transition Span (ticks)', type: 'number' },
        { key: 'size', label: 'Size', type: 'number', min: 1, max: 16, step: 1 },
        { key: 'initializationOrder', label: 'Init Order', type: 'number' },
      ],
    };
  }

  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    formData.set('activationLogic', config.get('activationLogic') === 'positive');
    formData.set('transitionSpan', parseFloat(config.get('transitionSpan') || '1'));
    formData.set('size', parseFloat(config.get('size') || '1'));
    formData.set('initializationOrder', parseFloat(config.get('initializationOrder') || '0'));
    return formData;
  }

  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    config.set('activationLogic', formData.get('activationLogic') ? 'positive' : 'negative');
    config.set('transitionSpan', formData.get('transitionSpan').toString());
    config.set('size', formData.get('size').toString());
    config.set('initializationOrder', formData.get('initializationOrder').toString() || '0');
    return config;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>): void {
    const contactorGroup = this._findContactorGroup(object3D);
    if (contactorGroup) {
      const currentVariant = contactorGroup.userData.variant;
      const newVariant = config.get('activationLogic');
      if (currentVariant !== newVariant) {
        this._disposeContactorGroup(object3D);
        const newGroup = this._createContactorGroup(
            object3D.userData.componentId, config);
        object3D.add(newGroup);
        newGroup.position.set(0, 0, -0.7);
        newGroup.rotation.copy(this.IDLE_ROTATION);
      }
    }

    object3D.userData.transitionSpanTicks =
        Math.max(1, parseInt(config.get('transitionSpan') || '1', 10) || 1);

    const scale = parseFloat(config.get('size') || '1');
    object3D.scale.set(scale, scale, scale);
    this.updateAnimation(object3D, null);
  }

  // ===================================================================
  // Animation Entry Point
  // ===================================================================

  /**
   * Update relay animation based on simulation state.
   *
   * - null / no context → cleanup, restore materials, reset to idle
   * - paused → snap all parts to current state values
   * - playing + transitional → animate mechanical + bar effect; update color clips
   * - playing + stable → snap mechanical + bar; update color clips
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const parts = this._findParts(object3D);
    if (!parts) return;

    const variant = parts.contactorGroup.userData.variant as string | undefined;

    // Leaving simulation
    if (!state || !this._animationContext) {
      this._cleanupMixer(object3D);
      this._restoreAllMaterials(parts);
      this._resetToDefault(parts);
      delete object3D.userData.coilColorKey;
      delete object3D.userData.powerColorKey;
      return;
    }

    // Paused / initial: snap everything
    if (this._animationContext.simulationStatus !== 'playing') {
      this._cleanupMixer(object3D);
      this._snapMechanical(parts, state.state, variant);
      this._snapCoilColor(parts, state);
      this._snapBarEffect(parts, state.state, variant);
      this._snapPowerColor(parts, state);
      object3D.userData.coilColorKey = this._computeCoilColor(state).getHexString();
      object3D.userData.powerColorKey = this._computePowerColor(state).getHexString();
      return;
    }

    // Playing: always update independent color animations
    this._updateCoilColorAnim(object3D, parts, state);
    this._updatePowerColorAnim(object3D, parts, state);

    // Playing + transitional: animate mechanical (rotation + bar position + bar glow)
    if (state.hasExpiration) {
      this._animateMechanical(object3D, parts, state, variant);
      return;
    }

    // Playing + stable: snap mechanical + bar effect, keep color clips running
    this._cleanupMechanicalClip(object3D);
    this._snapMechanical(parts, state.state, variant);
    this._snapBarEffect(parts, state.state, variant);
  }

  // ===================================================================
  // idle / active helpers
  // ===================================================================

  /** Is the coil magnetically active in the given state? */
  private _isCmdActive(stateName: string, variant: string | undefined): boolean {
    if (variant === 'negative') {
      return stateName === 'open' || stateName === 'opening';
    }
    return stateName === 'closed' || stateName === 'closing';
  }

  /** Is the transition moving TOWARD the active position? */
  private _isGoingActive(stateName: string, variant: string | undefined): boolean {
    if (variant === 'negative') return stateName === 'opening';
    return stateName === 'closing';
  }

  // ===================================================================
  // Color computation
  // ===================================================================

  private _computeCoilColor(state: ComponentState): THREE.Color {
    const cmdUnion = state.pinStates.get('cmd_in*cmd_out');
    if (!cmdUnion) return this.COIL_COLOR_NONE;
    if (cmdUnion.hasVoltage && cmdUnion.hasCurrent) return this.COIL_COLOR_BOTH;
    if (cmdUnion.hasVoltage) return this.COIL_COLOR_VOLTAGE;
    if (cmdUnion.hasCurrent) return this.COIL_COLOR_CURRENT;
    return this.COIL_COLOR_NONE;
  }

  private _computePowerColor(state: ComponentState): THREE.Color {
    const powerIn = state.pinStates.get('power_in');
    const powerOut = state.pinStates.get('power_out');
    const powerUnion = state.pinStates.get('power_in*power_out');
    if (!powerIn || !powerOut || !powerUnion) return this.POWER_COLOR_NONE;

    // for closed or opening states we use the union / output as reference
    if (state.state === 'closed' || state.state === 'opening') {
      if (powerUnion.hasVoltage && powerUnion.hasCurrent) return this.POWER_COLOR_BOTH;
      if (powerOut.hasVoltage) return this.POWER_COLOR_VOLTAGE;
      if (powerOut.hasCurrent) return this.POWER_COLOR_CURRENT;
      return this.POWER_COLOR_NONE;
    }
    // else it's more the input
    if (powerIn.hasVoltage && powerIn.hasCurrent) return this.POWER_COLOR_BOTH;
    if (powerIn.hasVoltage) return this.POWER_COLOR_VOLTAGE;
    if (powerIn.hasCurrent) return this.POWER_COLOR_CURRENT;
    return this.POWER_COLOR_NONE;
  }

  private _getColorAnimDurationSecs(object3D: THREE.Object3D): number {
    const tps = this._animationContext!.ticksPerSecond;
    const spanTicks = (object3D.userData.transitionSpanTicks as number) || 1;
    return Math.max(spanTicks / tps, 0.01);
  }

  // ===================================================================
  // Snap helpers (immediate state application)
  // ===================================================================

  private _snapMechanical(
      parts: RelayParts, stateName: string, variant: string | undefined): void {
    const isTransitional = stateName === 'closing' || stateName === 'opening';
    if (isTransitional) {
      // Snap to start of transition
      const goingActive = this._isGoingActive(stateName, variant);
      parts.contactorGroup.rotation.copy(goingActive ? this.IDLE_ROTATION : this.ACTIVE_ROTATION);
      parts.coilBar.position.z = goingActive ? this.COIL_BAR_Z_IDLE : this.COIL_BAR_Z_ACTIVE;
      return;
    }
    const active = this._isCmdActive(stateName, variant);
    parts.contactorGroup.rotation.copy(active ? this.ACTIVE_ROTATION : this.IDLE_ROTATION);
    parts.coilBar.position.z = active ? this.COIL_BAR_Z_ACTIVE : this.COIL_BAR_Z_IDLE;
  }

  private _snapCoilColor(parts: RelayParts, state: ComponentState): void {
    this._ensureCoilClonedMaterial(parts);
    const mat = parts.firstCoil.material as THREE.MeshLambertMaterial;
    mat.color.copy(this._computeCoilColor(state));
  }

  private _snapBarEffect(
      parts: RelayParts, stateName: string, variant: string | undefined): void {
    this._ensureBarClonedMaterial(parts);
    const mat = parts.coilBar.material as THREE.MeshLambertMaterial;

    // During transition snap, match mechanical start position
    const isTransitional = stateName === 'closing' || stateName === 'opening';
    const active = isTransitional
        ? !this._isGoingActive(stateName, variant)
        : this._isCmdActive(stateName, variant);

    const barDefaultMat = this.getMat(CmpMatCategory.SHINY_SILVER);

    mat.emissive.copy(active ? this.BAR_GLOW_COLOR : barDefaultMat.emissive);
    mat.emissiveIntensity = active ? this.BAR_GLOW_INTENSITY : barDefaultMat.emissiveIntensity;
  }

  private _snapPowerColor(parts: RelayParts, state: ComponentState): void {
    this._ensurePowerClonedMaterial(parts);
    const mat = parts.contactor.material as THREE.MeshLambertMaterial;
    mat.color.copy(this._computePowerColor(state));
  }

  // ===================================================================
  // Material management (SHARED → ANIMATION_CLONE → SHARED)
  // ===================================================================

  /** Clone WHITE once and assign the same clone to all 7 coil rings. */
  private _ensureCoilClonedMaterial(parts: RelayParts): void {
    const mat = parts.firstCoil.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType === CmpMatType.ANIMATION_CLONE) return;

    const clone = this.getMat(CmpMatCategory.WHITE).clone();
    clone.userData.matType = CmpMatType.ANIMATION_CLONE;
    for (const coil of parts.allCoils) {
      coil.material = clone;
    }
  }

  /** Clone SHINY_SILVER for the coil bar (emissive animation). */
  private _ensureBarClonedMaterial(parts: RelayParts): void {
    const mat = parts.coilBar.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType === CmpMatType.ANIMATION_CLONE) return;

    parts.coilBar.material = this.getMat(CmpMatCategory.SHINY_SILVER).clone();
    (parts.coilBar.material as THREE.MeshLambertMaterial).userData.matType =
        CmpMatType.ANIMATION_CLONE;
  }

  /** Clone WHITE once and assign to both contactor and powerInBar. */
  private _ensurePowerClonedMaterial(parts: RelayParts): void {
    const mat = parts.contactor.material as THREE.MeshLambertMaterial;
    if (mat.userData.matType === CmpMatType.ANIMATION_CLONE) return;

    const clone = this.getMat(CmpMatCategory.WHITE).clone();
    clone.userData.matType = CmpMatType.ANIMATION_CLONE;
    parts.contactor.material = clone;
    parts.powerInBar.material = clone;
  }

  /** Restore all animated materials to their SHARED originals. */
  private _restoreAllMaterials(parts: RelayParts): void {
    // Coil rings
    const coilMat = parts.firstCoil.material as THREE.MeshLambertMaterial;
    if (coilMat.userData.matType === CmpMatType.ANIMATION_CLONE) {
      coilMat.dispose();
      const shared = this.getMat(CmpMatCategory.WHITE);
      for (const coil of parts.allCoils) {
        coil.material = shared;
      }
    }

    // Coil bar
    const barMat = parts.coilBar.material as THREE.MeshLambertMaterial;
    if (barMat.userData.matType === CmpMatType.ANIMATION_CLONE) {
      barMat.dispose();
      parts.coilBar.material = this.getMat(CmpMatCategory.SHINY_SILVER);
    }

    // Contactor + powerInBar (share same clone — dispose once)
    const powerMat = parts.contactor.material as THREE.MeshLambertMaterial;
    if (powerMat.userData.matType === CmpMatType.ANIMATION_CLONE) {
      powerMat.dispose();
      const shared = this.getMat(CmpMatCategory.WHITE);
      parts.contactor.material = shared;
      parts.powerInBar.material = shared;
    }
  }

  // ===================================================================
  // Animation clip: Mechanical + bar effect
  // ===================================================================

  private _animateMechanical(
      object3D: THREE.Object3D,
      parts: RelayParts,
      state: ComponentState,
      variant: string | undefined): void {
    if (object3D.userData.mechStart === state.startTick) return;

    this._ensureBarClonedMaterial(parts);

    const tps = this._animationContext!.ticksPerSecond;
    const durationSecs = (state.expirationTick - state.startTick) / tps;

    let mixer = object3D.userData.mixer as THREE.AnimationMixer;
    if (!mixer) {
      mixer = new THREE.AnimationMixer(object3D);
      object3D.userData.mixer = mixer;
    }

    // Read current values BEFORE stopping (mid-transition support)
    const currentZ = parts.contactorGroup.rotation.z;
    const currentBarZ = parts.coilBar.position.z;
    const barMat = parts.coilBar.material as THREE.MeshLambertMaterial;
    const curEmRGB = [barMat.emissive.r, barMat.emissive.g, barMat.emissive.b];
    const curEmInt = barMat.emissiveIntensity;

    // Stop previous mechanical clip
    if (object3D.userData.mechAction) {
      (object3D.userData.mechAction as THREE.AnimationAction).stop();
    }
    if (object3D.userData.mechClip) {
      mixer.uncacheClip(object3D.userData.mechClip as THREE.AnimationClip);
    }

    // Targets
    const goingActive = this._isGoingActive(state.state, variant);
    const targetRotZ = goingActive ? this.ACTIVE_ROTATION.z : this.IDLE_ROTATION.z;
    const targetBarZ = goingActive ? this.COIL_BAR_Z_ACTIVE : this.COIL_BAR_Z_IDLE;

    const barDefaultMat = this.getMat(CmpMatCategory.SHINY_SILVER);
    const targetGlow = goingActive ? this.BAR_GLOW_COLOR : barDefaultMat.emissive;
    const targetGlowInt = goingActive ? this.BAR_GLOW_INTENSITY : barDefaultMat.emissiveIntensity;

    const tracks = [
      new THREE.NumberKeyframeTrack(
          'contactorGroup.rotation[z]',
          [0, durationSecs],
          [currentZ, targetRotZ]),
      new THREE.NumberKeyframeTrack(
          'coilBar.position[z]',
          [0, durationSecs],
          [currentBarZ, targetBarZ]),
      new THREE.ColorKeyframeTrack(
          'coilBar.material.emissive',
          [0, durationSecs],
          [...curEmRGB, targetGlow.r, targetGlow.g, targetGlow.b]),
      new THREE.NumberKeyframeTrack(
          'coilBar.material.emissiveIntensity',
          [0, durationSecs],
          [curEmInt, targetGlowInt]),
    ];

    const clip = new THREE.AnimationClip('relayMechanical', durationSecs, tracks);
    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.play();

    object3D.userData.mechStart = state.startTick;
    object3D.userData.mechAction = action;
    object3D.userData.mechClip = clip;
  }

  // ===================================================================
  // Animation clip: Coil ring color
  // ===================================================================

  private _updateCoilColorAnim(
      object3D: THREE.Object3D,
      parts: RelayParts,
      state: ComponentState): void {
    const target = this._computeCoilColor(state);
    const key = target.getHexString();
    if (object3D.userData.coilColorKey === key) return;

    this._ensureCoilClonedMaterial(parts);
    const durationSecs = this._getColorAnimDurationSecs(object3D);

    let mixer = object3D.userData.mixer as THREE.AnimationMixer;
    if (!mixer) {
      mixer = new THREE.AnimationMixer(object3D);
      object3D.userData.mixer = mixer;
    }

    const mat = parts.firstCoil.material as THREE.MeshLambertMaterial;
    const curRGB = [mat.color.r, mat.color.g, mat.color.b];

    // Stop previous
    if (object3D.userData.coilColorAction) {
      (object3D.userData.coilColorAction as THREE.AnimationAction).stop();
    }
    if (object3D.userData.coilColorClip) {
      mixer.uncacheClip(object3D.userData.coilColorClip as THREE.AnimationClip);
    }

    const clip = new THREE.AnimationClip('relayCoilColor', durationSecs, [
      new THREE.ColorKeyframeTrack(
          'coil0.material.color',
          [0, durationSecs],
          [...curRGB, target.r, target.g, target.b]),
    ]);
    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.play();

    object3D.userData.coilColorKey = key;
    object3D.userData.coilColorAction = action;
    object3D.userData.coilColorClip = clip;
  }

  // ===================================================================
  // Animation clip: Power color (contactor + powerInBar)
  // ===================================================================

  private _updatePowerColorAnim(
      object3D: THREE.Object3D,
      parts: RelayParts,
      state: ComponentState): void {
    const target = this._computePowerColor(state);
    const key = target.getHexString();
    if (object3D.userData.powerColorKey === key) return;

    this._ensurePowerClonedMaterial(parts);
    const durationSecs = this._getColorAnimDurationSecs(object3D);

    let mixer = object3D.userData.mixer as THREE.AnimationMixer;
    if (!mixer) {
      mixer = new THREE.AnimationMixer(object3D);
      object3D.userData.mixer = mixer;
    }

    const mat = parts.contactor.material as THREE.MeshLambertMaterial;
    const curRGB = [mat.color.r, mat.color.g, mat.color.b];

    // Stop previous
    if (object3D.userData.powerColorAction) {
      (object3D.userData.powerColorAction as THREE.AnimationAction).stop();
    }
    if (object3D.userData.powerColorClip) {
      mixer.uncacheClip(object3D.userData.powerColorClip as THREE.AnimationClip);
    }

    const clip = new THREE.AnimationClip('relayPowerColor', durationSecs, [
      new THREE.ColorKeyframeTrack(
          'contactor.material.color',
          [0, durationSecs],
          [...curRGB, target.r, target.g, target.b]),
    ]);
    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.play();

    object3D.userData.powerColorKey = key;
    object3D.userData.powerColorAction = action;
    object3D.userData.powerColorClip = clip;
  }

  // ===================================================================
  // Cleanup
  // ===================================================================

  /** Stop only the mechanical clip (rotation + bar position + bar glow). */
  private _cleanupMechanicalClip(object3D: THREE.Object3D): void {
    const mixer = object3D.userData.mixer as THREE.AnimationMixer | undefined;
    if (object3D.userData.mechAction) {
      (object3D.userData.mechAction as THREE.AnimationAction).stop();
      if (mixer && object3D.userData.mechClip) {
        mixer.uncacheClip(object3D.userData.mechClip as THREE.AnimationClip);
      }
    }
    delete object3D.userData.mechAction;
    delete object3D.userData.mechClip;
    delete object3D.userData.mechStart;
  }

  /** Stop all animations, dispose mixer, clear all animation userData. */
  private _cleanupMixer(object3D: THREE.Object3D): void {
    const mixer = object3D.userData.mixer as THREE.AnimationMixer | undefined;
    if (mixer) {
      mixer.stopAllAction();
      mixer.uncacheRoot(object3D);
      delete object3D.userData.mixer;
    }
    delete object3D.userData.mechAction;
    delete object3D.userData.mechClip;
    delete object3D.userData.mechStart;
    delete object3D.userData.coilColorAction;
    delete object3D.userData.coilColorClip;
    delete object3D.userData.powerColorAction;
    delete object3D.userData.powerColorClip;
  }

  /** Reset positions/rotations to idle (no coil energized). */
  private _resetToDefault(parts: RelayParts): void {
    parts.contactorGroup.rotation.copy(this.IDLE_ROTATION);
    parts.coilBar.position.z = this.COIL_BAR_Z_IDLE;
  }

  // ===================================================================
  // Part finders
  // ===================================================================

  /** Find all animated sub-objects in a single traverse. */
  private _findParts(object3D: THREE.Object3D): RelayParts | null {
    let contactorGroup: THREE.Group | null = null;
    let contactor: THREE.Mesh | null = null;
    let coilBar: THREE.Mesh | null = null;
    let firstCoil: THREE.Mesh | null = null;
    const allCoils: THREE.Mesh[] = [];
    let powerInBar: THREE.Mesh | null = null;

    object3D.traverse((child) => {
      const part = child.userData.part;
      if (part === 'contactorGroup' && child instanceof THREE.Group) {
        contactorGroup = child;
      } else if (part === 'contactor' && child instanceof THREE.Mesh) {
        contactor = child;
      } else if (part === 'coilBar' && child instanceof THREE.Mesh) {
        coilBar = child;
      } else if (part === 'coil' && child instanceof THREE.Mesh) {
        allCoils.push(child);
        if (!firstCoil) firstCoil = child;
      } else if (part === 'powerInBar' && child instanceof THREE.Mesh) {
        powerInBar = child;
      }
    });

    if (!contactorGroup || !contactor || !coilBar || !firstCoil || !powerInBar) return null;
    return { contactorGroup, contactor, coilBar, firstCoil, allCoils, powerInBar };
  }

  private _findContactorGroup(object3D: THREE.Object3D): THREE.Object3D | null {
    let found: THREE.Object3D | null = null;
    object3D.traverse((child) => {
      if (child instanceof THREE.Group && child.userData.part === 'contactorGroup') {
        found = child;
      }
    });
    return found;
  }
}
