import type { CircuitSceneManager } from './CircuitSceneManager';
import { Euler, Object3D, Vector3 } from 'three';
import { Position } from '@/core/types/Position';
import type { SceneManagerEventMap } from '../shared/types';
import type { ENodeSourceType } from '@/core/types/ENodeSourceType';
import type { UUID } from '@/core/types/Identifier';
import type { ENode } from '@/core/ENode';
import type { Wire } from '@/core/Wire';
import type { ComponentType } from '@/core/types/ComponentType';
import type { Component } from '@/core/Component';
import { worldToGridPosition, worldToGridRotation } from '../shared/GeometryUtils';

/**
 * Manages editing operations of 3D models from the circuit scene into the core circuit model.
 */
export class CircuitEditionManager {
  private _sceneManager: CircuitSceneManager;

  constructor(sceneManager: CircuitSceneManager) {
    this._sceneManager = sceneManager;
  }

  /**
   * add branching point to the core circuit model and emits the appropriate event.
   * @param position - the world position to add the branching point at
   * @throws Error
   * @return The circuit enode
   */
  saveAddBranchingPoint(position: Vector3) {
    const circuit = this._sceneManager.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene manager.');
      }

      const modelPosition = worldToGridPosition(position);
      const circuitEnode = circuit.addBranchingPoint(modelPosition);

      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'add',
        id: circuitEnode.id,
        error: null,
        data: {
          position: modelPosition,
        },
      };
      this._sceneManager.emit('circuitElementAction', event);
      return circuitEnode;
    } catch (error) {
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'add',
        id: undefined,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
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
    const circuit = this._sceneManager.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene manager.');
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
        this._sceneManager.emit('circuitElementAction', {
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
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'edit',
        id: branchingPoint.userData.id,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
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
    const circuit = this._sceneManager.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene manager.');
      }
      const result = circuit.removeBranchingPoint(enodeId);

      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'delete',
        id: enodeId,
        error: null,
        data: {
          ...result,
        },
      };
      this._sceneManager.emit('circuitElementAction', event);
      return result;
    } catch (error) {
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'delete',
        id: enodeId,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
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
    const circuit = this._sceneManager.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene manager.');
      }
      const addResult = circuit.addWire(sourceEnodeId, targetEnodeId);
      if (addResult instanceof Error) {
        throw new Error(addResult.message);
      }
      const wire = addResult as Wire;
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'wire',
        action: 'add',
        id: wire.id,
        error: null,
        data: {
          node1: wire.node1,
          node2: wire.node2,
        },
      };
      this._sceneManager.emit('circuitElementAction', event);
      return wire;
    } catch (error) {
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'wire',
        action: 'add',
        id: undefined,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
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
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene manager.');
    }
    // Convert world position to grid position
    const gridPosition = worldToGridPosition(worldPosition);
    const result = circuit.splitWire(wireId, gridPosition, targetEnodeId);
    console.log(result);

    this._sceneManager.emit('circuitElementAction', {
      type: 'wire',
      action: 'delete',
      id: wireId,
    });
    if (!targetEnodeId) {
      this._sceneManager.emit('circuitElementAction', {
        type: 'enode',
        action: 'add',
        id: result.branchingPoint.id,
      });
    }
    for (const wire of result.wires) {
      this._sceneManager.emit('circuitElementAction', {
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
    const circuit = this._sceneManager.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene manager.');
      }
      circuit.removeWire(wireId);
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'wire',
        action: 'delete',
        id: wireId,
        error: null,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
      return;
    } catch (error) {
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'wire',
        action: 'delete',
        id: wireId,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
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
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;
    const wire = circuit.getWire(wireId);
    if (!wire) return;

    const positionObjects = positions.map((p) => new Position(p.x, p.y));
    circuit.updateWireIntermediatePositions(wireId, positionObjects);

    if (emit) {
      circuit.simplifyWireIntermediatePositions(wireId);
      this._sceneManager.emit('circuitElementAction', {
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
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return;
    const wire = circuit.getWire(wireId);
    if (!wire) return;

    circuit.simplifyWireIntermediatePositions(wireId);
    this._sceneManager.emit('circuitElementAction', {
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
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene manager.');
    }

    circuit.updateENodeSourceType(enodeId, sourceType);

    this._sceneManager.emit('circuitElementAction', {
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
   * @returns The created Component
   * @throws Error if circuit is not available or component creation fails
   */
  saveAddComponent(type: ComponentType, position: Vector3, rotation: Euler): Component {
    const circuit = this._sceneManager.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene manager.');
      }
      // convert 3D world position to 2D grid position with Grid snapping
      const modelPosition = worldToGridPosition(position);
      const modelRotation = worldToGridRotation(rotation);
      const component = circuit.addComponent(type, modelPosition, modelRotation);

      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'component',
        action: 'add',
        id: component.id,
        error: null,
        data: {
          componentId: component.id,
          componentType: type,
          position: modelPosition,
          rotation: modelRotation,
        },
      };
      this._sceneManager.emit('circuitElementAction', event);
      return component;
    } catch (error) {
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'component',
        action: 'add',
        id: undefined,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
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
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene manager.');
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
      this._sceneManager.emit('circuitElementAction', {
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
   * Delete a component from the circuit model and emit the appropriate event
   * @param componentId - UUID of the component to delete
   * @returns Information about removed wires and enodes
   * @throws Error if circuit is not available or component not found
   */
  saveDeleteComponent(componentId: UUID): {
    deletedWires: UUID[];
    deletedENodes: UUID[];
  } {
    const circuit = this._sceneManager.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene manager.');
      }

      const component = circuit.getComponent(componentId);
      if (!component) {
        throw new Error(`Component with ID ${componentId} not found in the circuit.`);
      }

      // Remove component from circuit (this will also remove connected wires)
      const result: { deletedWires: UUID[]; deletedENodes: UUID[] } =
        circuit.removeComponent(componentId);

      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'component',
        action: 'delete',
        id: componentId,
        error: null,
        data: { ...result },
      };
      this._sceneManager.emit('circuitElementAction', event);

      return result;
    } catch (error) {
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'component',
        action: 'delete',
        id: componentId,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
      throw new Error((error as Error).message);
    }
  }
}
