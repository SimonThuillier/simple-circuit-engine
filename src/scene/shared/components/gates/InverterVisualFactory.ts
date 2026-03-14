import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import {type Component, type ComponentState, InverterState} from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { CyclicTrapezoidGeometry } from '../../utils/GeometryUtils';
import type {ConfigFormDefinition, VisualContext} from '../../types';

/**
 * Visual factory for Inverter/Buffer components
 *
 * Creates:
 * - Inverter triangle or Buffer trapezoid extrude geom mesh
 * - Vcc, input and output pin group
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Emissive glow when component is high (based on simulation state)
 */
export class InverterVisualFactory extends ComponentVisualFactoryBase {
  /** Inverter high color (white glow) */
  private static readonly HIGH_COLOR = 0xffffff;
  /** Inverter high emissive intensity */
  private static readonly HIGH_INTENSITY = 0.3;

  /** Shared low Inverter envelope geometry */
  private readonly inverterLowGeometry = CyclicTrapezoidGeometry(0.8, 1.6, 0, 0.08, 0.4, 16);
  /** Shared transient Inverter envelope geometry */
  private readonly inverterTransientGeometry = CyclicTrapezoidGeometry(0.8, 1.6, 0, 0.17, 0.4, 16);
  /** Shared high Inverter envelope geometry */
  private readonly inverterHighGeometry = CyclicTrapezoidGeometry(0.8, 1.6, 0, 0.4, 0.4, 16);

  /** Shared low Buffer envelope geometry */
  private readonly bufferLowGeometry = CyclicTrapezoidGeometry(1, 1.6, 0.61, 0.08, 0.4, 16);
  /** Shared transient Buffer envelope geometry */
  private readonly bufferTransientGeometry = CyclicTrapezoidGeometry(1, 1.6, 0.61, 0.23, 0.4, 16);
  /** Shared high Buffer envelope geometry */
  private readonly bufferHighGeometry = CyclicTrapezoidGeometry(1, 1.6, 0.61, 0.5, 0.4, 16);


  createVisual(component: Component, context: VisualContext): THREE.Object3D {

    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    material.emissive.setHex(InverterVisualFactory.HIGH_COLOR);
    material.emissiveIntensity = 0;

    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
      material: material,
      variant: 'inverter'
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 1.6, 2, 1.6);
    group.add(hitbox);
    // create an inverter by default
    this.replaceEnvelope(group, false);

    // pins (not called if preview - no pins)
    if (component.pins.length > 0){
      this.createPinsVisual(component, context, group, group.userData.material);
    }

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  private createPinsVisual(
      component: Component,
      context: VisualContext,
      group: THREE.Group,
      material: THREE.MeshStandardMaterial){

    const vccNode = context.getENode(component.pins[0]!);
    if (vccNode){
      const vccGroup = this.createPinGroup(vccNode, 'top', new THREE.Euler(0, 0, -0.8));
      vccGroup.position.set(-0.27, 0, -0.56);
      group.add(vccGroup);
    }

    const gndNode = context.getENode(component.pins[3]!);
    if (gndNode){
      const gndGroup = this.createPinGroup(gndNode, 'bottom', new THREE.Euler(0, 0, -0.8));
      gndGroup.position.set(-0.27, 0, 0.56);
      group.add(gndGroup);
    }

    const inputNode = context.getENode(component.pins[1]!);
    if (inputNode){
      const inputGroup = this.createPinGroup(inputNode, 'left');
      inputGroup.position.set(-0.5, 0, 0);
      group.add(inputGroup);
    }

    const outputNode = context.getENode(component.pins[2]!);
    if(outputNode){
      const outputGroup = this.createPinGroup(outputNode, 'right');
      outputGroup.position.set(0.45, 0, 0);
      group.add(outputGroup);

      // this counterpart act as negativeMarker when component is in its inverter config
      const outputPinCounterpart =
          this.createPinCounterpart(outputGroup, material);
      if(!!outputPinCounterpart){
        outputPinCounterpart.userData.part = 'negativeMarker';
        group.add(outputPinCounterpart);
      }
    }
  }

  private replaceEnvelope(group: THREE.Object3D, activationLogic: boolean): THREE.Mesh {
    let material: THREE.MeshStandardMaterial | null = null;
    const oldEnvelope = this.findEnvelopeMesh(group);
    if (oldEnvelope) {
      // case where envelope of the good type (buffer or inverter) already exists
      if (activationLogic === oldEnvelope.userData.activationLogic) {
        return oldEnvelope;
      }
      // else we remove the old envelope before recreating it
      material = oldEnvelope.material;
      group.remove(oldEnvelope);
    }

    if(!material){
      material = group.userData.material!!;
    }

    const envelope = activationLogic
        ? new THREE.Mesh(this.bufferLowGeometry, material!!)
        : new THREE.Mesh(this.inverterHighGeometry, material!!);
    envelope.userData = {
      type: 'component',
      componentId: group.userData.componentId,
      part: 'envelope',
      activationLogic: activationLogic,
      initialState: activationLogic ? 'low' : 'high',
    };
    envelope.rotateX(-Math.PI / 2);
    const envX = activationLogic ? -0.05 : -0.1;
    envelope.position.set(envX, -0.05, 0);
    group.add(envelope);
    return envelope;
  }

  /**
   * Get config form definition for Inverter
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
    const envelopeMesh = this.findEnvelopeMesh(object3D);
    if (!envelopeMesh) return;

    const negativeMarkerMesh = this.findNegativeMarkerMesh(object3D);
    const vccVisual = this.findPinVisual(object3D, 'vcc');
    const gndVisual = this.findPinVisual(object3D, 'gnd');

    const inverterVariant = (config && config.has('activationLogic'))? config.get('activationLogic') !== 'positive': true;

    if (inverterVariant) {
      this.replaceEnvelope(object3D, false);
      if (object3D.userData.variant !== 'inverter') {
        object3D.userData.variant = 'inverter';
        // @ts-ignore
        negativeMarkerMesh?.geometry.scale(10,10,10);

        if (!!vccVisual) {
          vccVisual.setRotationFromEuler(new THREE.Euler(0, 0, -0.8));
          vccVisual.parent!.position.set(-0.27, 0, -0.55);
        }
        if (!!gndVisual) {
          gndVisual.setRotationFromEuler(new THREE.Euler(0, 0, -0.8));
          gndVisual.parent!.position.set(-0.27, 0, 0.56);
        }
      }
    } else {
      if(object3D.userData.variant !== 'buffer'){
        object3D.userData.variant = 'buffer';
        this.replaceEnvelope(object3D, true);
        // @ts-ignore
        negativeMarkerMesh?.geometry.scale(0.1,0.1,0.1);

        if (!!vccVisual) {
          vccVisual.setRotationFromEuler(new THREE.Euler(0, 0, -0.5));
          vccVisual.parent!.position.set(-0.27, 0, -0.65);
        }
        if (!!gndVisual) {
          gndVisual.setRotationFromEuler(new THREE.Euler(0, 0, -0.5));
          gndVisual.parent!.position.set(-0.27, 0, 0.65);
        }
      }
    }
    this.updateAnimation(object3D, null);
  }

  /**
   * Update Inverter animation based on simulation state
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The Inverter's current simulation state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const envelopeMesh = this.findEnvelopeMesh(object3D);
    if (!envelopeMesh) return;

    const isBuffer = envelopeMesh.userData.activationLogic === true;
    const lowGeometry = isBuffer ? this.bufferLowGeometry : this.inverterLowGeometry;
    const transientGeometry = isBuffer
        ? this.bufferTransientGeometry
        : this.inverterTransientGeometry;
    const highGeometry = isBuffer ? this.bufferHighGeometry : this.inverterHighGeometry;

    if (!state) {
      if (envelopeMesh.userData.initialState === 'high') {
        envelopeMesh.geometry = highGeometry;
        envelopeMesh.material.emissiveIntensity = InverterVisualFactory.HIGH_INTENSITY;
      } else {
        envelopeMesh.geometry = lowGeometry;
        envelopeMesh.material.emissiveIntensity = 0;
      }
      return;
    }

    const bufferState = state as InverterState;
    if (bufferState.isHigh) {
      envelopeMesh.geometry = highGeometry;
      envelopeMesh.material.emissiveIntensity = InverterVisualFactory.HIGH_INTENSITY;
    } else if (bufferState.isInTransition) {
      envelopeMesh.geometry = transientGeometry;
      envelopeMesh.material.emissiveIntensity = 0.5 * InverterVisualFactory.HIGH_INTENSITY;
    } else {
      envelopeMesh.geometry = lowGeometry;
      envelopeMesh.material.emissiveIntensity = 0;
    }
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
  private findEnvelopeMesh(
      object3D: THREE.Object3D
  ): (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null {
    let envelopeMesh: (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'envelope') {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          envelopeMesh = child as THREE.Mesh & { material: THREE.MeshStandardMaterial };
        }
      }
    });
    return envelopeMesh;
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
  protected findNegativeMarkerMesh(
      object3D: THREE.Object3D
  ): (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null {
    let negativeMarkerMesh: (THREE.Mesh & { material: THREE.MeshStandardMaterial }) | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'negativeMarker') {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          negativeMarkerMesh = child as THREE.Mesh & { material: THREE.MeshStandardMaterial };
        }
      }
    });
    return negativeMarkerMesh;
  }
}
