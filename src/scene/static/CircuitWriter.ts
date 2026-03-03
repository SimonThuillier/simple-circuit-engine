/**
 * CircuitWriter that centralizes all write operations on core circuit objects
 * @module scene/static/CircuitWriter
 */
import { Euler, Object3D, Vector3 } from 'three';
import type { ENodeSourceType, UUID, ENode, Wire, Component } from 'simple-circuit-engine/core';
import { Position, ComponentType, CameraOptions, Position3D } from 'simple-circuit-engine/core';

import type { CircuitController } from './CircuitController';
import type { ControllerEventMap } from '../shared/types';
import {
  computeDivisionsForSize,
  worldToGridPosition,
  worldToGridRotation,
} from '../shared/utils/GeometryUtils';

/**
 * Manages editing operations of 3D models from the circuit scene into the core circuit model.
 */
export class CircuitWriter {
  private _controller: CircuitController;

  constructor(controller: CircuitController) {
    this._controller = controller;
  }

  /**
   * add branching point to the core circuit model and emits the appropriate event.
   * @param position - the world position to add the branching point at
   * @param sourceType - optional source type for the branching point
   * @throws Error
   * @return The circuit enode
   */
  saveAddBranchingPoint(position: Vector3, sourceType?: ENodeSourceType | undefined) {
    const circuit = this._controller.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene controller.');
      }

      const modelPosition = worldToGridPosition(position);
      const circuitEnode = circuit.addBranchingPoint(modelPosition, sourceType);

      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'add',
        id: circuitEnode.id,
        error: null,
        data: {
          position: modelPosition,
          sourceType: sourceType,
        },
      };
      this._controller.emit('circuitElementAction', event);
      return circuitEnode;
    } catch (error) {
      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'add',
        id: undefined,
        error: error as Error,
        data: null,
      };
      this._controller.emit('circuitElementAction', event);
      throw new Error((error as Error).message);
    }
  }

  /**
   * edit branching point to the core circuit model and emits the appropriate event.
   * @param branchingPoint - the branching point Object3D
   * @param emit - should the event be emitted if commit OK (error event will always be)
   * @throws Error
   * @return The circuit enode
   */
  saveEditBranchingPoint(branchingPoint: Object3D, emit: boolean = false) {
    const circuit = this._controller.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene controller.');
      }
      const circuitEnode = circuit.getENode(branchingPoint.userData.enodeId);
      if (!circuitEnode) {
        throw new Error(
          `No enode with id ${branchingPoint.userData.enodeId} found in the circuit.`
        );
      }

      const modelPosition = worldToGridPosition(branchingPoint.position);
      const sourceType = branchingPoint.userData.sourceType as ENodeSourceType | undefined;
      circuitEnode.setPosition(modelPosition);
      circuitEnode.setSourceType(sourceType);

      if (emit) {
        this._controller.emit('circuitElementAction', {
          type: 'enode',
          action: 'edit',
          id: circuitEnode.id,
          error: null,
          data: {
            position: modelPosition,
            sourceType: sourceType,
          },
        });
      }
      return circuitEnode;
    } catch (error) {
      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'edit',
        id: branchingPoint.userData.id,
        error: error as Error,
        data: null,
      };
      this._controller.emit('circuitElementAction', event);
      throw new Error((error as Error).message);
    }
  }

  /**
   * delete branching point in the core circuit model and emits the appropriate event.
   * @param enodeId - the branching point id
   * @throws Error
   * @return The circuit enode
   */
  saveDeleteBranchingPoint(enodeId: UUID): {
    deletedWires?: UUID[] | undefined;
    mergedWires?: UUID[] | undefined;
    newWire?: Wire | undefined;
  } {
    const circuit = this._controller.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene controller.');
      }
      const result = circuit.removeBranchingPoint(enodeId);

      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'delete',
        id: enodeId,
        error: null,
        data: {
          ...result,
        },
      };
      this._controller.emit('circuitElementAction', event);
      return result;
    } catch (error) {
      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'delete',
        id: enodeId,
        error: error as Error,
        data: null,
      };
      this._controller.emit('circuitElementAction', event);
      throw new Error((error as Error).message);
    }
  }

  /**
   * add wire to the core circuit model and emits the appropriate event.
   * @param sourceEnodeId - the source enode ID
   * @param targetEnodeId - the target enode ID
   * @throws Error
   * @return The circuit wire
   */
  saveAddWire(sourceEnodeId: UUID, targetEnodeId: UUID) {
    const circuit = this._controller.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene controller.');
      }
      const addResult = circuit.addWire(sourceEnodeId, targetEnodeId);
      if (addResult instanceof Error) {
        throw new Error(addResult.message);
      }
      const wire = addResult as Wire;
      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'wire',
        action: 'add',
        id: wire.id,
        error: null,
        data: {
          node1: wire.node1,
          node2: wire.node2,
        },
      };
      this._controller.emit('circuitElementAction', event);
      return wire;
    } catch (error) {
      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'wire',
        action: 'add',
        id: undefined,
        error: error as Error,
        data: null,
      };
      this._controller.emit('circuitElementAction', event);
      throw new Error((error as Error).message);
    }
  }

  /**
   * Save wire split operation to circuit model. Either :
   * - at a position, inserting a new branching point and two new wires replacing the deleted ones
   * - at an existing target enode, replacing the wire by two new wires connected to this enode
   * @param wireId - Wire to split
   * @param worldPosition - world Position for the new branching point : no effect if targetEnodeId provided
   * @param targetEnodeId - if provided, the existing enode to split the wire at
   * @returns Object containing the new branching point and two wires
   */
  saveSplitWire(
    wireId: UUID,
    worldPosition: Vector3,
    targetEnodeId: UUID | null = null
  ): { branchingPoint: ENode; wires: Wire[] } {
    const circuit = this._controller.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene controller.');
    }
    // Convert world position to grid position
    const gridPosition = worldToGridPosition(worldPosition);
    const result = circuit.splitWire(wireId, gridPosition, targetEnodeId);

    this._controller.emit('circuitElementAction', {
      type: 'wire',
      action: 'delete',
      id: wireId,
    });
    if (!targetEnodeId) {
      this._controller.emit('circuitElementAction', {
        type: 'enode',
        action: 'add',
        id: result.branchingPoint.id,
      });
    }
    for (const wire of result.wires) {
      this._controller.emit('circuitElementAction', {
        type: 'wire',
        action: 'add',
        id: wire.id,
      });
    }
    return result;
  }

  /**
   * delete wire to the core circuit model and emits the appropriate event.
   * @param wireId - the wire ID
   * @throws Error
   * @return The circuit wire
   */
  saveDeleteWire(wireId: UUID): void {
    const circuit = this._controller.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene controller.');
      }
      circuit.removeWire(wireId);
      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'wire',
        action: 'delete',
        id: wireId,
        error: null,
        data: null,
      };
      this._controller.emit('circuitElementAction', event);
      return;
    } catch (error) {
      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'wire',
        action: 'delete',
        id: wireId,
        error: error as Error,
        data: null,
      };
      this._controller.emit('circuitElementAction', event);
    }
  }

  /**
   * Used to commit wire edits (intermediate positions) to the core circuit model and emits the appropriate event.
   * If emit positions are also simplified before committing.
   * @param wireId - the wire ID
   * @param positions
   * @param emit
   * @return The circuit wire
   */
  saveEditWirePositions(
    wireId: UUID,
    positions: Array<{ x: number; y: number }>,
    emit: boolean = false
  ): Wire | undefined {
    const circuit = this._controller.getCircuit();
    if (!circuit) return;
    const wire = circuit.getWire(wireId);
    if (!wire) return;

    const positionObjects = positions.map((p) => new Position(p.x, p.y));
    circuit.updateWireIntermediatePositions(wireId, positionObjects);

    if (emit) {
      circuit.simplifyWireIntermediatePositions(wireId);
      this._controller.emit('circuitElementAction', {
        type: 'wire',
        action: 'edit',
        id: wireId,
        error: null,
        data: {
          intermediatePositions: [...wire.intermediatePositions],
        },
      });
    }
    return wire;
  }

  /**
   * Used to simplify wire path in the core circuit model and emits the appropriate event.
   * Notably used when end enodes move is committed.
   * @param wireId - the wire ID
   * @return The circuit wire
   */
  saveSimplifyWirePositions(wireId: UUID): Wire | undefined {
    const circuit = this._controller.getCircuit();
    if (!circuit) return;
    const wire = circuit.getWire(wireId);
    if (!wire) return;

    circuit.simplifyWireIntermediatePositions(wireId);
    this._controller.emit('circuitElementAction', {
      type: 'wire',
      action: 'edit',
      id: wireId,
      error: null,
      data: {
        intermediatePositions: [...wire.intermediatePositions],
      },
    });
    return wire;
  }

  /**
   * Save ENode sourceType update (T011)
   * @param enodeId - ENode to update
   * @param sourceType - New sourceType value
   */
  saveEditENodeSourceType(enodeId: UUID, sourceType: ENodeSourceType | null): void {
    const circuit = this._controller.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene controller.');
    }

    circuit.updateENodeSourceType(enodeId, sourceType);

    this._controller.emit('circuitElementAction', {
      type: 'enode',
      action: 'edit',
      id: enodeId,
      error: null,
      data: {
        sourceType: sourceType,
      },
    });
  }

  /**
   * Add a component to the circuit model and emit the appropriate event
   * handles conversion of world position and rotation to circuit model values
   * @param type - Component type to add
   * @param position - world Position
   * @param rotation - world Rotation
   * @param config - optional initial component configuration
   * @param pinSources - optional array of ENode source types for each component pin
   * @returns The created Component
   * @throws Error if circuit is not available or component creation fails
   */
  saveAddComponent(
    type: ComponentType,
    position: Vector3,
    rotation: Euler,
    config?: Map<string, string> | undefined,
    pinSources?: Array<ENodeSourceType | undefined | null> | undefined
  ): Component {
    const circuit = this._controller.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene controller.');
      }
      // convert 3D world position to 2D grid position with Grid snapping
      const modelPosition = worldToGridPosition(position);
      const modelRotation = worldToGridRotation(rotation);
      const component = circuit.addComponent(type, modelPosition, modelRotation, config);

      if (pinSources) {
        for (const pinIdx in component.pins) {
          if (!pinSources[pinIdx]) continue;
          const customSource = pinSources[pinIdx];

          const cmpPinId = component.pins[pinIdx];
          if (!cmpPinId) continue;
          const pin = circuit.getENode(cmpPinId);
          if (!pin) continue;
          pin.setSourceType(customSource);
        }
      }

      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'component',
        action: 'add',
        id: component.id,
        error: null,
        data: {
          componentId: component.id,
          componentType: type,
          position: modelPosition,
          rotation: modelRotation,
          config: config,
          pinSources: pinSources,
        },
      };
      this._controller.emit('circuitElementAction', event);
      return component;
    } catch (error) {
      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'component',
        action: 'add',
        id: undefined,
        error: error as Error,
        data: null,
      };
      this._controller.emit('circuitElementAction', event);
      throw new Error((error as Error).message);
    }
  }

  /**
   * Save edits made to a component in the circuit model and emit the appropriate event
   * @param componentId
   * @param visual
   * @param emit - should the event be emitted if commit OK (error event will always be)
   */
  saveEditComponent(componentId: UUID, visual: Object3D, emit: boolean = false): Component {
    // Logic to save the current state of the scene component into the core model
    const circuit = this._controller.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene controller.');
    }
    const component = circuit.getComponent(componentId);
    if (!component) {
      throw new Error(`Component with ID ${componentId} not found in the circuit.`);
    }

    const modelPosition = worldToGridPosition(visual.position);
    const modelRotation = worldToGridRotation(visual.rotation);
    component.setRotation(modelRotation);
    component.setPosition(modelPosition);

    if (emit) {
      this._controller.emit('circuitElementAction', {
        type: 'component',
        action: 'edit',
        id: componentId,
        error: null,
        data: {
          position: modelPosition,
          rotation: modelRotation,
        },
      });
    }

    return component;
  }

  /**
   * Save edits made to a component configuration in the circuit model and emit the appropriate event
   * @param componentId
   * @param parameters - updated configuration parameters
   */
  saveEditComponentConfig(componentId: UUID, parameters: Map<string, string>): Component {
    // Logic to save the current state of the scene component into the core model
    const circuit = this._controller.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene controller.');
    }
    const component = circuit.getComponent(componentId);
    if (!component) {
      throw new Error(`Component with ID ${componentId} not found in the circuit.`);
    }

    component.config = new Map([...component.config, ...parameters]);
    circuit.resolveTransitionSpan(component);
    this._controller.emit('circuitElementAction', {
      type: 'component',
      action: 'edit',
      id: componentId,
      error: null,
      data: {
        config: component.config,
      },
    });
    return component;
  }

  /**
   * cycle component config and update visuals if necessary
   * have effect only on components that supports fast config cycle (used to invert logic or initial state of switches)
   * if component supports it, update the supported config item to the next value in the cycle
   * @param componentId
   * @returns object with hasChanged boolean and updated component
   * @throws Error if circuit is not available or component not found
   */
  cycleComponentConfig(componentId: UUID): { hasChanged: boolean; component: Component } {
    // Logic to save the current state of the scene component into the core model
    const circuit = this._controller.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene controller.');
    }
    const component = circuit.getComponent(componentId);
    if (!component) {
      throw new Error(`Component with ID ${componentId} not found in the circuit.`);
    }
    const config = component.config;
    switch (component.type) {
      case ComponentType.Switch:
        config.set('initialState', config.get('initialState') === 'open' ? 'closed' : 'open');
        this.saveEditComponentConfig(component.id, config);
        return { hasChanged: true, component: component };
      case ComponentType.DoubleThrowSwitch:
        config.set('initialState', config.get('initialState') === 'input1' ? 'input2' : 'input1');
        this.saveEditComponentConfig(component.id, config);
        return { hasChanged: true, component: component };
      default:
        if (!config.has('activationLogic')) {
          return { hasChanged: false, component: component };
        }
        config.set(
          'activationLogic',
          config.get('activationLogic') === 'positive' ? 'negative' : 'positive'
        );
        circuit.resolveTransitionSpan(component);
        this.saveEditComponentConfig(component.id, config);
        return { hasChanged: true, component: component };
    }
  }

  /**
   * Delete a component from the circuit model and emit the appropriate event
   * @param componentId - UUID of the component to delete
   * @returns Information about removed wires and enodes
   * @throws Error if circuit is not available or component not found
   */
  saveDeleteComponent(componentId: UUID): {
    deletedWires: UUID[];
    deletedENodes: UUID[];
  } {
    const circuit = this._controller.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene controller.');
      }

      const component = circuit.getComponent(componentId);
      if (!component) {
        throw new Error(`Component with ID ${componentId} not found in the circuit.`);
      }

      // Remove component from circuit (this will also remove connected wires)
      const result: { deletedWires: UUID[]; deletedENodes: UUID[] } =
        circuit.removeComponent(componentId);

      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'component',
        action: 'delete',
        id: componentId,
        error: null,
        data: { ...result },
      };
      this._controller.emit('circuitElementAction', event);

      return result;
    } catch (error) {
      const event: ControllerEventMap['circuitElementAction'] = {
        type: 'component',
        action: 'delete',
        id: componentId,
        error: error as Error,
        data: null,
      };
      this._controller.emit('circuitElementAction', event);
      throw new Error((error as Error).message);
    }
  }

  /**
   * Automatically adjust the circuit size and divisions based on positions of all core circuit elements.
   * @return if the size/division has been updated or not
   */
  saveAutoAdjustCircuitSize(): boolean {
    const circuit = this._controller.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene controller.');
    }

    const newSize = Math.max(10, circuit.getEnclosingSize(1));
    if (circuit.metadata.size === newSize) {
      return false; // no change
    }

    const divisions = computeDivisionsForSize(newSize);

    circuit.metadata.size = newSize;
    circuit.metadata.divisions = divisions;

    this._controller.emit('circuitMetadataEdition', {
      circuitName: circuit.name,
      data: {
        size: newSize,
        divisions: divisions,
      },
    });
    return true;
  }

  /**
   * Save current camera parameters, position and target into circuit metadata
   */
  saveCameraOptions(): void {
    const circuit = this._controller.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene controller.');
    }
    const camera = this._controller.getCamera();
    if (!camera) {
      throw new Error('No camera available in the scene controller.');
    }
    const controls = this._controller.getControls();
    if (!controls) {
      throw new Error('No controls available in the scene controller.');
    }

    const options = new CameraOptions(
      new Position3D(camera.position.x, camera.position.y, camera.position.z),
      new Position3D(controls.target.x, controls.target.y, controls.target.z),
      camera.fov,
      camera.near,
      camera.far
    );
    circuit.metadata.cameraOptions = options;

    this._controller.emit('circuitMetadataEdition', {
      circuitName: circuit.name,
      data: {
        cameraOptions: options,
      },
    });
    return;
  }
}
