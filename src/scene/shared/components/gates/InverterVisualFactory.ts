import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import {type Component, type ComponentState, InverterState} from 'simple-circuit-engine/core';
import * as THREE from 'three';
import {CyclicTrapezoidGeometry, CyclicTrapezoidHoleGeometry} from '../../utils/GeometryUtils';
import type {ConfigFormDefinition, VisualContext} from '../../types';
import {CmpMatCategory} from "../types";

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
  /** Shared Inverter envelope geometry */
  private readonly INVERTER_GEOM = CyclicTrapezoidGeometry(0.8, 1.6, 0, 0.08, 0.4, 16);
  /** Shared Inverter inner hole geometry */
  private readonly INVERTER_HOLE_GEOM = CyclicTrapezoidHoleGeometry(0.8, 1.6, 0, 0.08, 0.4, 16)!;
  
  /** Shared Buffer envelope geometry */
  private readonly BUFFER_GEOM = CyclicTrapezoidGeometry(1, 1.6, 0.61, 0.08, 0.4, 16);
  /** Shared Buffer inner hole geometry */
  private readonly BUFFER_HOLE_GEOM = CyclicTrapezoidHoleGeometry(1, 1.6, 0.61, 0.08, 0.4, 16)!;

  private readonly HOLE_COLOR_HIGH = new THREE.Color(0xff4444);
  private readonly HOLE_COLOR_LOW = new THREE.Color(0x4444ff);
  private readonly HOLE_COLOR_INDETERMINATE = new THREE.Color(0x1a1a1a);


  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
      variant: 'inverter'
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 1.6, 2, 1.6);
    group.add(hitbox);
    // create an inverter by default
    this.replaceEnvelope(group, false);
    this.replaceHole(group, false);

    // pins (not called if preview - no pins)
    if (component.pins.length > 0){
      this.createPinsVisual(component, context, group);
    }

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  private createPinsVisual(
      component: Component,
      context: VisualContext,
      group: THREE.Group){

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
          this.createPinCounterpart(outputGroup, this.getMat(CmpMatCategory.WHITE));
      if(!!outputPinCounterpart){
        outputPinCounterpart.userData.part = 'negativeMarker';
        group.add(outputPinCounterpart);
      }
    }
  }

  private replaceEnvelope(group: THREE.Object3D, activationLogic: boolean): THREE.Mesh {
    const oldEnvelope = this.findEnvelopeMesh(group);
    if (oldEnvelope) {
      // case where envelope of the good type (buffer or inverter) already exists
      if (activationLogic === oldEnvelope.userData.activationLogic) {
        return oldEnvelope;
      }
      // else we remove the old envelope before recreating it
      group.remove(oldEnvelope);
    }

    const envelope = activationLogic
        ? new THREE.Mesh(this.BUFFER_GEOM, this.getMat(CmpMatCategory.WHITE))
        : new THREE.Mesh(this.INVERTER_GEOM, this.getMat(CmpMatCategory.WHITE));
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

  private replaceHole(group: THREE.Object3D, activationLogic: boolean): THREE.Mesh {
    const oldHole = this.findHoleMesh(group);
    if (oldHole) {
      // case where hole of the good type (buffer or inverter) already exists
      if (activationLogic === oldHole.userData.activationLogic) {
        return oldHole;
      }
      // else we remove the old hole before recreating it
      group.remove(oldHole);
    }

    const hole = activationLogic
        ? new THREE.Mesh(this.BUFFER_HOLE_GEOM, this.getMat(CmpMatCategory.DARK_GRAY))
        : new THREE.Mesh(this.INVERTER_HOLE_GEOM, this.getMat(CmpMatCategory.DARK_GRAY));
    hole.userData = {
      type: 'component',
      componentId: group.userData.componentId,
      part: 'hole',
      activationLogic: activationLogic,
      initialState: activationLogic ? 'low' : 'high',
    };
    hole.rotateX(-Math.PI / 2);
    const envX = activationLogic ? -0.05 : -0.1;
    hole.position.set(envX, -0.05, 0);
    group.add(hole);
    return hole;
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
      this.replaceHole(object3D, false);
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
        this.replaceHole(object3D, true);
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
    if (!state) return;

    const holeMesh = this.findHoleMesh(object3D);
    if (!holeMesh) return;

    const isBuffer = holeMesh.userData.activationLogic === true;
    // TODO ...
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
  ): THREE.Mesh | null {
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
  private findHoleMesh(
      object3D: THREE.Object3D
  ): THREE.Mesh | null {
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
  protected findNegativeMarkerMesh(
      object3D: THREE.Object3D
  ): THREE.Mesh | null {
    let negativeMarkerMesh: THREE.Mesh | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'negativeMarker') {
        negativeMarkerMesh = child as THREE.Mesh;
      }
    });
    return negativeMarkerMesh;
  }
}
