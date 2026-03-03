import { ComponentVisualFactoryBase } from '../ComponentVisualFactory';
import type { Component, ComponentState, RelayState } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type { ConfigFormDefinition, VisualContext } from '../../types';
import { RingGeometry, LGeometry } from '../../utils/GeometryUtils';

/**
 * Visual factory for Relay components
 *
 * Animation:
 * - Rotates contactor based on open/closed state
 */
export class RelayVisualFactory extends ComponentVisualFactoryBase {
  /** Coil ring geometry */
  private readonly COIL_GEOM = RingGeometry(0.35, 0.4, 0.1, 16);
  /** Coil bar geometry */
  private readonly COIL_BAR_GEOM = new THREE.BoxGeometry(0.1, 0.4, 1.4, 2);

  private readonly COIL_BAR_Z_OPEN = 0;
  private readonly COIL_BAR_Z_INTERMEDIATE = -0.1;
  private readonly COIL_BAR_Z_CLOSED = -0.2;
  private readonly COIL_BAR_Z_INV_INTERMEDIATE = -0.4;
  private readonly COIL_BAR_Z_INV_OPEN = -0.5;

  /** Power In bar geometry */
  private readonly PWIN_BAR_GEOM = new THREE.BoxGeometry(0.1, 0.4, 0.85, 2);

  /** normal contactor geom */
  private CONTACTOR_GEOM = LGeometry(0.68, 1.48, 0.1, 140, false, 0.1, 0.4, 16);

  /** Rotation for open relay (contactor misaligned) */
  private readonly OPEN_ROTATION =
      new THREE.Euler(-Math.PI / 2,0,-Math.PI);
  /** Rotation for opening/closing relay */
  private readonly INTERMEDIATE_ROTATION =
      new THREE.Euler(-Math.PI / 2,0,-Math.PI - 0.15);
  /** Rotation for closed relay (contactor aligned) */
  private readonly CLOSED_ROTATION =
      new THREE.Euler(-Math.PI / 2,0,-Math.PI - 0.34);
  /** Rotation for opening/closing negative activation logic relay */
  private readonly INVERTED_INTERMEDIATE_ROTATION =
      new THREE.Euler(-Math.PI / 2,0,-Math.PI - 0.54);
  /** Rotation for open negative activation logic relay (contactor misaligned toward the coil) */
  private readonly INVERTED_OPEN_ROTATION =
      new THREE.Euler(-Math.PI / 2,0,-Math.PI - 0.7);


      createVisual(component: Component, context: VisualContext): THREE.Object3D {
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 1, 2);
    group.add(hitbox);

    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const coilGroup = this.createCoilGroup(component, material);
    group.add(coilGroup);
    coilGroup.position.set(-0.5,0,0);

    const contactorGroup = this.createContactorGroup(component, material);
    group.add(contactorGroup);
    contactorGroup.position.set(0,0,-0.7);
    contactorGroup.rotation.copy(this.OPEN_ROTATION)

    // pins (not called if preview - no pins)
    if (component.pins.length > 0) {
      this.createPinsVisual(component, context, group, material);
    }

    const powerInBar = new THREE.Mesh(this.PWIN_BAR_GEOM, material);
    group.add(powerInBar);
    powerInBar.rotateY(-Math.PI / 2);
    powerInBar.position.set(0.48,0,-0.7);

    // take config into account
    this.updateFromConfiguration(group, component.config);
    return group;
  }

  private createPinsVisual(
      component: Component,
      context: VisualContext,
      group: THREE.Group,
      material: THREE.MeshStandardMaterial) {
    const cmdOutNode = context.getENode(component.pins[1]!);
    if (cmdOutNode) {
      const cmdOutGroup = this.createPinGroup(cmdOutNode, 'left');
      cmdOutGroup.position.set(-0.9, 0, 0.7);
      group.add(cmdOutGroup);

      const cmdOutCounterpart =
          this.createPinCounterpart(cmdOutGroup, material);
      if(!!cmdOutCounterpart){
        group.add(cmdOutCounterpart);
      }
    }

    const powerInNode = context.getENode(component.pins[2]!);
    if (powerInNode) {
      const powerInGroup = this.createPinGroup(powerInNode, 'right');
      powerInGroup.position.set(0.9, 0, -0.7);
      // to avoid z-fighting
      powerInGroup.renderOrder = 1;
      powerInGroup.children.forEach((child) => {
        child.renderOrder = 1;
      });
      group.add(powerInGroup);

      const powerInCounterpart =
          this.createPinCounterpart(powerInGroup, material);
      if(!!powerInCounterpart){
        group.add(powerInCounterpart);
      }
    }

    const cmdInNode = context.getENode(component.pins[0]!);
    if (cmdInNode) {
      const cmdInGroup = this.createPinGroup(cmdInNode,'left');
      cmdInGroup.position.set(-0.9, 0, -0.7);
      // addition to group after to avoid z-fighting
      group.add(cmdInGroup);

      const cmdInCounterpart =
          this.createPinCounterpart(cmdInGroup, material);
      if(!!cmdInCounterpart){
        group.add(cmdInCounterpart);
      }
    }

    const powerOutNode = context.getENode(component.pins[3]!);
    if (powerOutNode) {
      const powerOutGroup = this.createPinGroup(powerOutNode,'right');
      powerOutGroup.position.set(0.9, 0, 0.7);
      group.add(powerOutGroup);

      const powerOutCounterpart =
          this.createPinCounterpart(powerOutGroup, material);
      if(!!powerOutCounterpart){
        group.add(powerOutCounterpart);
      }
    }
  }

  private createContactorGroup(
      component: Component,
      material: THREE.MeshStandardMaterial): THREE.Group {
    const contactorGroup = new THREE.Group();
    contactorGroup.userData = {
      type: 'component',
      componentId: component.id,
      part: 'contactorGroup',
      initialState: 'open'
    };
    //contactorGroup.add(new THREE.AxesHelper(2));
    contactorGroup.updateMatrix();
    contactorGroup.updateMatrixWorld(true);


    const contactor = new THREE.Mesh(this.CONTACTOR_GEOM, material);
    contactor.userData = {
      type: 'component',
      componentId: component.id,
      part: 'contactor'};
    contactorGroup.add(contactor);
    contactor.translateZ(-0.2);

    contactor.updateMatrix();
    contactor.updateMatrixWorld(true);

    return contactorGroup;
  }

  private createCoilGroup(
      component: Component,
      material: THREE.MeshStandardMaterial): THREE.Group {

    const coilGroup = new THREE.Group();
    coilGroup.userData = {
      type: 'component',
      componentId: component.id,
      part: 'coilGroup'
    };

    const partsUserData = {
      type: 'component',
      componentId: component.id,
      part: 'coil'
    }

    const addCoil = (z:number, xr:number) =>{
      const coil = new THREE.Mesh(this.COIL_GEOM, material);
      coil.userData = {...partsUserData};
      coil.position.set(0,0, z);
      coil.rotateX(xr);
      coilGroup.add(coil);
    }
    addCoil(0.6, -0.03);
    addCoil(0.4, 0.03);
    addCoil(0.2, -0.03);
    addCoil(0, 0.03);
    addCoil(-0.2, -0.03);
    addCoil(-0.4, 0.03);
    addCoil(-0.6, -0.03);

    const bar = new THREE.Mesh(this.COIL_BAR_GEOM, material);
    bar.userData = {...partsUserData, part: 'coilBar'};
    coilGroup.add(bar);

    return coilGroup;
  }

  /**
   * Get config form definition for Relay (T025)
   *
   * @returns Form definition with activationLogic boolean field
   */
  override getConfigFormDefinition(): ConfigFormDefinition | null {
    return {
      fields: [
        {
          key: 'activationLogic',
          label: 'Activation Logic',
          type: 'boolean',
        },
        {
          key: 'transitionSpan',
          label: 'Transition Span (ticks)',
          type: 'number',
        },
        {
          key: 'size',
          label: 'Size',
          type: 'number',
          min: 1,
          max: 16,
          step: 1,
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
   * Map core config to form data (T025)
   * Converts "positive"/"negative" strings to boolean
   *
   * @param config - Core component config
   * @returns Form data with boolean activationLogic
   */
  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    const activationLogic = config.get('activationLogic');
    formData.set('activationLogic', activationLogic === 'positive');
    formData.set('transitionSpan', parseFloat(config.get('transitionSpan') || '1'));
    formData.set('size', parseFloat(config.get('size') || '1'));
    formData.set('initializationOrder', parseFloat(config.get('initializationOrder') || '0'));
    return formData;
  }

  /**
   * Map form data to core config (T025)
   * Converts boolean to "positive"/"negative" strings
   *
   * @param formData - Form data with boolean activationLogic
   * @returns Core config with string activationLogic
   */
  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    const activationLogic = formData.get('activationLogic');
    config.set('activationLogic', activationLogic ? 'positive' : 'negative');
    config.set('transitionSpan', formData.get('transitionSpan').toString());
    config.set('size', formData.get('size').toString());
    config.set('initializationOrder', formData.get('initializationOrder').toString() || null);
    return config;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>) {
    const contactorGroup = this.findContactorGroup(object3D);
    if (contactorGroup) {
      if (config.get('activationLogic') === 'negative') {
        contactorGroup.userData.initialState = 'closed';
      } else {
        contactorGroup.userData.initialState = 'open';
      }
    }
    const scale = parseFloat(config.get('size') || '1');
    object3D.scale.set(scale, scale, scale);
    this.updateAnimation(object3D, null);
  }

  /**
   * Update relay animation based on simulation state
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The Relay's current simulation state
   *
   * @remarks
   * Rotates the contactor group to visually represent open/closed state
   */
  override updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void {
    const contactorGroup = this.findContactorGroup(object3D);
    const coilBar = this.findCoilBar(object3D);

    const negLog = contactorGroup?
        contactorGroup.userData.initialState === 'closed': false;

    if (!state) {
      // Edition mode - set to initial state
      if (contactorGroup) {
        contactorGroup.rotation.copy(negLog?
            this.CLOSED_ROTATION:this.OPEN_ROTATION);
      }
      if (coilBar) {

        let gf = negLog?
            this.COIL_BAR_Z_CLOSED:this.COIL_BAR_Z_OPEN;
        coilBar.position.set(0,0,gf);
      }
      return;
    }

    const relayState = state as RelayState;
    if (contactorGroup) {
      if (relayState.isInTransition) {
        const targetRotation =
          negLog ? this.INVERTED_INTERMEDIATE_ROTATION
            : this.INTERMEDIATE_ROTATION;
        contactorGroup.rotation.copy(targetRotation);
      } else if (relayState.isClosed) {
        // Closed position - contactor aligned
        contactorGroup.rotation.copy(this.CLOSED_ROTATION);
      } else {
        // Open position - contactor misaligned
        const targetRotation =
          negLog ? this.INVERTED_OPEN_ROTATION
            : this.OPEN_ROTATION;
        contactorGroup.rotation.copy(targetRotation);
      }
    }

    if (coilBar) {
      if (relayState.isInTransition) {
        coilBar.position.set(0,0, negLog?
            this.COIL_BAR_Z_INV_INTERMEDIATE: this.COIL_BAR_Z_INTERMEDIATE);
      } else if (relayState.isClosed) {
        coilBar.position.set(0,0, this.COIL_BAR_Z_CLOSED);
      } else {
        coilBar.position.set(0,0, negLog?
            this.COIL_BAR_Z_INV_OPEN: this.COIL_BAR_Z_OPEN);
      }
    }
  }

  /**
   * Find the contactor group within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The contactor's parent group if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'contactor' and returns its parent
   */
  private findContactorGroup(object3D: THREE.Object3D): THREE.Object3D | null {
    let contactorGroup: THREE.Object3D | null = null;

    object3D.traverse((child) => {
      if (child instanceof THREE.Object3D && child.userData.part === 'contactorGroup') {
        contactorGroup = child;
      }
    });

    return contactorGroup;
  }

  /**
   * Find the coil bar within the component group
   *
   * @param object3D - The Object3D group created by createVisual()
   * @returns The contactor's parent group if found, null otherwise
   *
   * @remarks
   * Searches for a mesh with userData.part === 'coil' and returns its parent
   */
  private findCoilBar(object3D: THREE.Object3D): THREE.Mesh | null {
    let coilBar: THREE.Mesh | null = null;

    object3D.traverse((child) => {
      if (child.userData.part === 'coilBar') {
        // @ts-ignore
        coilBar = child;
      }
    });
    return coilBar;
  }
}
