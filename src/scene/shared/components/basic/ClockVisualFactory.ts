import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import {type Component, type ComponentState, ClockState} from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { RingGeometry, CyclicTrapezoidGeometry } from '../../utils/GeometryUtils';
import type {ConfigFormDefinition, VisualContext} from '../../types';

/**
 * Visual factory for Clock
 */
export class ClockVisualFactory extends ComponentVisualFactoryBase {
  /** Shared Clock envelope geometry */
  private readonly envelopeGeometry = RingGeometry(0.7, 0.8, 0.4, 32);
  /** Shared Clock hand geometry */
  private readonly handGeometry = CyclicTrapezoidGeometry(0.7, 0.18, 0.01, 0.1, 0.35, 16);

  private readonly HIGH_TICK_ROTATION =
      new THREE.Euler(0,-Math.PI,0);
  private readonly LOW_TICK_ROTATION =
      new THREE.Euler(0,0,0);


  createVisual(component: Component, context: VisualContext): THREE.Object3D {

    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    material.emissive.setHex(0xffffff);
    material.emissiveIntensity = 0;

    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    //group.add(new THREE.AxesHelper(3));
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
      material: material
    };
    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 2, 2);
    group.add(hitbox);

    const envelope = new THREE.Mesh(this.envelopeGeometry, material);
    envelope.userData = {
      type: 'component',
      componentId: group.userData.componentId,
      part: 'envelope'
    };
    envelope.rotateX(-Math.PI / 2);
    envelope.position.set(0, 0, 0);
    group.add(envelope);

    const handGroup = this.createHandGroup(component, material);
    group.add(handGroup);
    handGroup.add(new THREE.AxesHelper(1));
    handGroup.rotation.copy(this.HIGH_TICK_ROTATION);




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
      _material: THREE.MeshStandardMaterial){

    const vccNode = context.getENode(component.pins[0]!);
    if (vccNode){
      const vccGroup = this.createPinGroup(vccNode, 'top');
      vccGroup.position.set(0, 0, -0.77);
      group.add(vccGroup);
    }

    const gndNode = context.getENode(component.pins[2]!);
    if (gndNode){
      const gndGroup = this.createPinGroup(gndNode, 'bottom');
      gndGroup.position.set(0, 0, 0.77);
      group.add(gndGroup);
    }

    const outputNode = context.getENode(component.pins[1]!);
    if(outputNode){
      const outputGroup = this.createPinGroup(outputNode, 'right');
      outputGroup.position.set(0.75, 0, 0);
      group.add(outputGroup);
    }
  }

  private createHandGroup(
      component: Component,
      material: THREE.MeshStandardMaterial): THREE.Group {
    const handGroup = new THREE.Group();
    handGroup.userData = {
      type: 'component',
      componentId: component.id,
      part: 'handGroup',
      initialState: 'open'
    };
    //handGroup.add(new THREE.AxesHelper(2));
    handGroup.updateMatrix();
    handGroup.updateMatrixWorld(true);


    const hand = new THREE.Mesh(this.handGeometry, material);
    hand.userData = {
      type: 'component',
      componentId: component.id,
      part: 'hand'};
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
        {
          key: 'startHigh',
          label: 'Start High ?',
          type: 'boolean'
        },
        {
          key: 'halfPeriod',
          label: 'Half Period',
          type: 'number',
          min: 1
        }
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

    if (handGroup) {
      if (config.get('startHigh') == 'true') {
        handGroup.rotation.copy(this.HIGH_TICK_ROTATION);
      } else {
        handGroup.rotation.copy(this.LOW_TICK_ROTATION);
      }
    }


    this.updateAnimation(object3D, null);
  }

  /**
   * Update Clock animation based on simulation state
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The Clock's current simulation state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const handGroup = this.findHandGroup(object3D);
    if (!handGroup) return;

    console.log(state);
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
  private findHandGroup(
      object3D: THREE.Object3D
  ): (THREE.Object3D) | null {
    let handGroupMesh: (THREE.Object3D) | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Object3D && child.userData.part === 'handGroup') {
        handGroupMesh = child;
      }
    });
    return handGroupMesh;
  }
}
