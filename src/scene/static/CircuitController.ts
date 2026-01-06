/**
 * Static Circuit Renderer
 * @module rendering/static/StaticCircuitRenderer
 *
 * Manages static circuit THREE.js scene with support for editing tools.
 */

import * as THREE from 'three';
import type { Component } from '../../core/Component';
import type { Wire } from '../../core/Wire';
import type { ENode } from '../../core/ENode';
import type { UUID } from '../../core/types/Identifier';
import { ENodeType } from '../../core/types/ENodeType';
import type { IFactoryRegistry } from '../shared/components/ComponentVisualFactory';
import type { ToolType, SelectionData, SharedResources } from '../shared/types';
import {
  createGridHelper,
  gridToWorldPosition,
  gridToWorldRotation,
} from '../shared/utils/GeometryUtils';
import { BuildTool } from './tools/BuildTool';
import { AddComponentTool } from './tools/AddComponentTool';
import { MultiSelectTool } from './tools/MultiSelectTool';
import type { IEditingTool } from '../shared/types';
import { SelectionManager } from '../shared/SelectionManager';
import type { ComponentType } from '@/core/types/ComponentType';
import { CircuitWriter } from './CircuitWriter';
import type { Euler } from 'three';
import type { ENodeSourceType } from '@/core/types/ENodeSourceType';
import { AbstractCircuitController } from '../shared/AbstractCircuitController';
import type { Circuit } from '@/core/Circuit';
import { ConfigPanelManager } from './ConfigPanelManager';

/**
 * Static Circuit Controller Implementation
 *
 * Manager providing a bidirectional interface between a Circuit and a Three.js scene/camera ready to be rendered.
 * Supports view manipulation and editing via integrated tool system.
 * Provides event hooks for error handling and state changes.
 */
export class CircuitController extends AbstractCircuitController {
  // flags
  private _editMode: boolean = false;
  // Circuit writer
  public readonly circuitWriter: CircuitWriter;
  // Selection manager
  private _selectionManager: SelectionManager | null = null;
  // Config panel manager
  private _configPanelManager: ConfigPanelManager | null = null;
  // Circuit RepositoryTool system
  private _tools: Map<ToolType, IEditingTool> = new Map();
  private _activeTool: ToolType | null = null;

  /**
   * Constructor and initialization
   */

  /**
   * Create a new Static Circuit Controller
   *
   * @param factoryRegistry - Component visual factory registry
   * @param sharedResources - Optional shared resources for facade pattern (CircuitEngine)
   * @throws {TypeError} factoryRegistry is null/undefined
   */
  constructor(factoryRegistry: IFactoryRegistry, sharedResources?: SharedResources) {
    super(factoryRegistry, sharedResources);

    this.circuitWriter = new CircuitWriter(this);

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.onContainerResize = this.onContainerResize.bind(this);
  }

  /**
   * Specific Initialization logic, performed after AbstractCircuitController initialization
   * @private
   */
  protected onInitialize() {
    // Initialize tools
    this._initializeTools();
    // Initialize Selection Manager
    this._initializeSelectionManager();
    // Initialize Config Panel Manager
    this._initializeConfigPanelManager();
  }

  protected emitReady() {
    this.emit('ready', { controllerType: 'static' });
  }

  /**
   * Enable or disable edit mode (FR-006, FR-027)
   * When disabled, deactivates any active tool and resets tool state
   *
   * @param enabled - True to enable edit mode, false to disable
   */
  setEditMode(enabled: boolean): void {
    this._checkInitialized();

    if (this._editMode === enabled) return; // No changge
    this._editMode = enabled;

    if (!enabled) {
      // Disable edit mode - deactivate active tool if any
      if (this._activeTool !== null) {
        const previousTool = this._activeTool;
        const tool = this._tools.get(previousTool);

        if (tool) {
          tool.onDeactivate();
        }
        this._activeTool = null;
        // Emit toolDeactivated event
        this.emit('toolDeactivated', { toolType: previousTool });
      }
    }
  }

  /**
   * specific disposal prepended at the beginning of dispose process
   */
  protected onDispose(): void {
    this.setEditMode(false); // Ensure edit mode and all tools are disabled

    // dispose ConfigPanelManager
    if (this._configPanelManager) {
      this._configPanelManager.dispose();
      this._configPanelManager = null;
    }
    // dispose SelectionManager
    if (this._selectionManager) {
      this._selectionManager.dispose();
      this._selectionManager = null;
    }
    // dispose own wireVisualManager
    this.wireVisualManager.dispose();
  }

  onSetActive(active: boolean): void {
    if (!active) {
      // Deactivate edit mode (which deactivates active tool and emits toolDeactivated)
      this.setEditMode(false);
      this._selectionManager?.deselect();
    } else {
      // no specific logic on activate
    }
  }

  setCircuit(circuit: Circuit | null): void {
    this._setCircuit(circuit);
  }

  /**
   * specific logic when to render a new set circuit
   * @protected
   */
  protected onSetCircuit() {
    this._fullUpdate();
  }

  /**
   * Get the SelectionManager instance for direct manipulation
   * @returns SelectionManager
   */
  getSelectionManager(): SelectionManager {
    this._checkInitialized();
    if (!this._selectionManager) {
      throw new Error('SelectionManager not initialized');
    }
    return this._selectionManager!;
  }

  private handlePointerDown(event: MouseEvent): void {
    // discard if right click or middle click
    if (event.button !== 0) {
      return;
    }

    // common behavior regardless of the tool: select on pointer down
    if (this._hoverManager?.getHoveredElement()) {
      // always: emit position event when hovered element
      const element = this._hoverManager.getHoveredElement()!;
      const alreadySelected = this._selectionManager!.isSelected(element.type, element.id);
      if (!alreadySelected) {
        this._selectionManager?.selectOne(element.type, element.id, element.object3D.userData);
        this.emit('select', this._selectionManager!.getSelection()!);
      }
    } else {
      // always: emit deselect event when not hovered element
      const hasSelection = this._selectionManager?.hasSelection();
      if (hasSelection) {
        const selection = this._selectionManager!.getSelection()!;
        this._selectionManager?.deselect();
        this.emit('deselect', selection);
      }
    }
  }

  private _applySelectionVisual(selection: SelectionData, selected: boolean): void {
    let components: Map<UUID, string | null> | null = null;
    let enodes: Map<UUID, string | null> | null = null;
    let wires: Map<UUID, string | null> | null = null;
    if (selection.kind === 'mono') {
      switch (selection.type) {
        case 'component':
          components = new Map<UUID, string | null>();
          components.set(selection.id, selection.data ?? null);
          break;
        case 'enode':
          enodes = new Map<UUID, string | null>();
          enodes.set(selection.id, selection.data ?? null);
          break;
        case 'wire':
          wires = new Map<UUID, string | null>();
          wires.set(selection.id, selection.data ?? null);
          break;
        default:
          break;
      }
    } else {
      components = selection.components || null;
      enodes = selection.enodes || null;
      wires = selection.wires || null;
    }

    if (components) {
      for (const [id, _data] of components) {
        const object3D = this._componentObject3Ds.get(id);
        if (!object3D) {
          continue;
        }
        try {
          const componentType = object3D.userData.componentType as ComponentType;
          const factory = this.factoryRegistry.get(componentType);
          if (selected) {
            factory.applySelection(object3D);
          } else {
            factory.removeSelection(object3D);
          }
        } catch (error) {
          console.warn(
            `Failed to ${selected ? 'apply' : 'remove'} component selection visual:`,
            error
          );
        }
      }
    }
    if (enodes) {
      for (const [id, _data] of enodes) {
        const object3D = this._enodeObject3Ds.get(id);
        if (!object3D) {
          continue;
        }
        if (!!object3D.userData.componentId) continue; // pins cannot be selected individually
        if (selected) {
          this.branchingPointVisualFactory.applySelection(object3D);
        } else {
          this.branchingPointVisualFactory.removeSelection(object3D);
        }
      }
    }
    if (wires) {
      for (const [id, _data] of wires) {
        if (selected) {
          this.wireVisualManager.applySelectedVisual(id);
        } else {
          this.wireVisualManager.removeSelectedVisual(id);
        }
      }
    }
  }

  private _initializeSelectionManager(): void {
    if (!this._scene || !this._camera || !this._container) {
      throw new Error('Scene, camera, and container must be initialized before SelectionManager');
    }

    // Create SelectionManager instance
    this._selectionManager = new SelectionManager();

    // Register callback to handle selection visual changes (T025)
    this._selectionManager.onSelectionChange((newSelection, previousSelection) => {
      // Remove selection visual from previous selection
      if (previousSelection) {
        this._applySelectionVisual(previousSelection, false);
      }
      // Apply selection visual to new selection
      if (newSelection) {
        this._applySelectionVisual(newSelection, true);
      }

      // Emit selectionChange event (T026)
      this.emit('selectionChange', {
        newSelection: previousSelection,
        previousSelection: newSelection,
      });
    });

    this._container.addEventListener('pointerdown', this.handlePointerDown);
  }

  /**
   * Initialize ConfigPanelManager (T013)
   * @private
   */
  private _initializeConfigPanelManager(): void {
    if (!this._scene || !this._camera || !this._container) {
      throw new Error('Scene, camera and container must be initialized before ConfigPanelManager');
    }

    // Create ConfigPanelManager instance
    this._configPanelManager = new ConfigPanelManager(
      this.factoryRegistry,
      this.editComponentConfig.bind(this),
      this._camera,
      this._container
    );
  }

  /**
   * Open the config panel for a component (T014)
   *
   * @param componentId - UUID of the component to edit
   * @param screenPosition - Screen coordinates for panel positioning
   * @returns true if panel opened, false if component has no config
   */
  openConfigPanel(componentId: UUID, screenPosition: { x: number; y: number }): boolean {
    this._checkInitialized();
    if (!this._configPanelManager) {
      throw new Error('ConfigPanelManager not initialized');
    }
    if (!this._circuit) {
      return false;
    }
    const component = this._circuit.getComponent(componentId);
    if (!component) {
      console.warn(`ConfigPanelManager.open: Component ${componentId} not found`);
      return false;
    }
    return this._configPanelManager.open(component, screenPosition);
  }

  /**
   * Tool System Methods
   */

  /**
   * Convenience method that toggle a tool on if it is off (possibly deactivating previous tool), or off if it is on
   * @param toolType
   */
  toggleTool(toolType: ToolType): void {
    const previousTool = this._activeTool;

    if (previousTool !== null) {
      this.deactivateTool(toolType);
    }
    if (previousTool === toolType) {
      return;
    }
    this.setActiveTool(toolType);
  }

  deactivateTool(toolType: ToolType): void {
    if (this._activeTool === null) {
      return;
    }
    if (this._activeTool !== toolType) {
      return; // only deactivate if the specified tool is active
    }

    const previousTool = this._activeTool;
    const tool = this._tools.get(previousTool);

    if (tool) {
      tool.onDeactivate();
    }

    this._activeTool = null;
    // Emit toolDeactivated event
    this.emit('toolDeactivated', { toolType: previousTool });
  }

  /**
   * Get the list of available component types for the AddComponent tool
   */
  getAvailableComponentTypes(): ComponentType[] {
    return this.factoryRegistry.getRegisteredTypes();
  }

  /**
   * Set the component type for the AddComponent tool
   * @param componentType
   */
  setAddComponentType(componentType: ComponentType | null): void {
    if (!this._editMode || this._activeTool !== 'addComponent') {
      throw new Error(
        'Edit mode must be enabled and AddComponent tool must be active to set component type'
      );
    }
    const tool = this._tools.get('addComponent') as AddComponentTool;
    if (!tool) {
      throw new Error('AddComponent tool not found');
    }
    tool.setComponentType(componentType);
  }

  /**
   * Get the currently active tool (FR-028)
   *
   * @returns Current tool type or null if no tool is active
   */
  getActiveTool(): ToolType | null {
    return this._activeTool;
  }

  /**
   * Set the active editing tool (FR-026, FR-028, FR-034)
   * Only one tool can be active at a time
   * Switching tools will deactivate the previous tool
   *
   * @param toolType - Type of tool to activate
   * @throws {Error} If edit mode is not enabled
   */
  setActiveTool(toolType: ToolType): void {
    this._checkInitialized();

    if (!this._editMode) {
      throw new Error('Edit mode must be enabled to activate tools');
    }
    // Check if tool is already active
    if (this._activeTool === toolType) {
      return;
    } else if (this._activeTool !== null) {
      // Deactivate previous tool
      this.deactivateTool(this._activeTool);
    }

    // Activate new tool
    this._activeTool = toolType;
    const tool = this._tools.get(toolType);

    if (tool) {
      tool.onActivate();

      // Emit toolActivated event
      this.emit('toolActivated', { toolType });

      // Emit cursorChangeRequested event
      const cursorType = tool.getCursorType();
      this.emit('cursorChangeRequested', { cursorType });
    }
  }

  /**
   * Initialize editing tools
   * @private
   */
  private _initializeTools(): void {
    // Create tool instances
    this._tools.set('build', new BuildTool(this));
    this._tools.set('addComponent', new AddComponentTool(this));
    this._tools.set('multiSelect', new MultiSelectTool(this));
  }

  /**
   * recreate all visuals based on circuit data
   * Should be called on an already cleared scene
   * @private
   */
  private _fullUpdate(): void {
    this._checkInitialized();

    if (!this._circuit) return;

    // 1. Add circuit sized grid
    this._grid = createGridHelper(this._circuit.metadata.size, this._circuit.metadata.divisions);
    this._scene!.add(this._grid);

    // Create visuals for all circuit elements
    const components = this._circuit.getAllComponents();
    const wires = this._circuit.getAllWires();
    const enodes = this._circuit.getAllENodes();

    console.log('full update');

    for (const component of components) {
      this._createComponentObject3D(component);
    }
    for (const enode of enodes) {
      this._createEnodeObject3D(enode);
    }
    for (const wire of wires) {
      this._createWireObject3D(wire);
    }
  }

  private _createComponentObject3D(component: Component): void {
    try {
      const factory = this.factoryRegistry.get(component.type);
      // Support both function-based (legacy) and class-based (new) factories
      const mesh = factory.createVisual(component);

      // Position mesh at component location (2D circuit -> 3D world)
      mesh.position.copy(gridToWorldPosition(component.position));
      mesh.rotation.copy(gridToWorldRotation(component.rotation));

      // Store component metadata
      mesh.userData.componentId = component.id;
      mesh.userData.componentType = component.type;

      this._scene!.add(mesh);
      this._indexComponentObject3D(component.id, mesh);

      // For edited pin enodes, update source type visual (component visual factory creates them only in their default mode)
      for (const pinId of component.pins) {
        const enode = this._circuit!.getENode(pinId);
        if (!enode || !enode.source) continue;
        const pinGroup = this._enodeObject3Ds.get(enode.id);
        if (!pinGroup) continue;
        this.factoryRegistry.getFallbackFactory().updatePinSourceType(pinGroup, enode.source);
      }
    } catch (error) {
      const err = error as Error;
      console.warn(`Failed to create mesh for component ${component.id}:`, err.message);
      this.emit('error', { message: `Component rendering failed: ${err.message}`, error: err });
    }
  }

  /**
   * Index component mesh and its pins meshes for interaction (hover, selection)
   * @param componentId
   * @param object3D
   * @private
   */
  private _indexComponentObject3D(componentId: string, object3D: THREE.Object3D): void {
    this._componentObject3Ds.set(componentId, object3D);
    object3D.traverse((obj) => {
      if (obj.userData && obj.userData.type === 'enodeGroup') {
        const enodeId = obj.userData.enodeId;
        if (enodeId) {
          this._enodeObject3Ds.set(enodeId, obj as THREE.Group);
        }
      }
    });
  }

  private _removeComponentObject3D(id: string): void {
    const group = this._componentObject3Ds.get(id);
    if (!group) {
      return;
    }

    this._scene!.remove(group);
    // Parcours complet pour disposer toutes les géométries / matériaux des enfants
    group.traverse((obj) => {
      if (obj.userData && obj.userData.type === 'enodeGroup') {
        this._removeEnodeObject3D(obj.userData.enodeId);
      } else if (obj instanceof THREE.Mesh) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
    this._componentObject3Ds.delete(id);
  }

  /**
   * Create enode (branching point ONLY) visual object and add to scene
   * pin enodes are created and attache to their components by createComponentObject3D()
   *
   * @param enode
   * @private
   */
  private _createEnodeObject3D(enode: ENode): void {
    // Skip pin enodes - they're visualized as part of their components
    if (enode.type === ENodeType.Pin) return;

    // Use BranchingPointVisualFactory to create the visual
    const group = this.branchingPointVisualFactory.createVisual(enode);

    // Use getPosition() to properly handle position retrieval
    group.position.copy(gridToWorldPosition(enode.getPosition(this._circuit!)));

    this._scene!.add(group);
    this._enodeObject3Ds.set(enode.id, group);
  }

  private _removeEnodeObject3D(id: string): void {
    const group = this._enodeObject3Ds.get(id);
    if (!group) return;
    group?.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
    this._scene!.remove(group);
    this._enodeObject3Ds.delete(id);
  }

  addBranchingPoint(worldPosition: THREE.Vector3, sourceType?: ENodeSourceType | undefined): ENode {
    const branchingPoint = this.circuitWriter.saveAddBranchingPoint(worldPosition, sourceType);
    // Create and add bp visual to scene
    this._createEnodeObject3D(branchingPoint);
    return branchingPoint;
  }

  /**
   * Split wire either :
   * - at a position, inserting a new branching point and two new wires replacing the deleted ones
   * - at an existing target enode, replacing the wire by two new wires connected to this enode
   * @param wireId
   * @param worldPosition - world Position for the new branching point : no effect if targetEnodeId provided
   * @param targetEnodeId - if provided, the existing enode to split the wire at
   */
  splitWire(
    wireId: UUID,
    worldPosition: THREE.Vector3,
    targetEnodeId: UUID | null = null
  ): { branchingPoint: ENode; wires: Wire[] } {
    // 1: Call CircuitWriter to split the wire and create branching point
    const result = this.circuitWriter.saveSplitWire(wireId, worldPosition, targetEnodeId);
    // 2: Remove old wire visual from scene
    this.wireVisualManager.removeWire(wireId);
    // 3: add new Branching point visual to the scene (only if not targetEnodeId)
    if (!targetEnodeId) {
      this._createEnodeObject3D(result.branchingPoint);
    }

    // 4: Add new wire visuals to scene
    for (const wire of result.wires) {
      this.wireVisualManager.createOrUpdateWire(wire);
    }

    return result;
  }

  /**
   * Remove branching point enode visual and update the circuit and visuals
   * @param enodeId
   */
  removeBranchingPoint(enodeId: UUID) {
    const result = this.circuitWriter.saveDeleteBranchingPoint(enodeId);
    if (!result) return;
    this._removeEnodeObject3D(enodeId);
    this._enodeObject3Ds.delete(enodeId);
    if (result.deletedWires) {
      for (const wireId of result.deletedWires) {
        this._removeWireObject3D(wireId);
      }
    }
    if (result.mergedWires) {
      for (const wireId of result.mergedWires) {
        this._removeWireObject3D(wireId);
      }
    }
    if (result.newWire) {
      this._createWireObject3D(result.newWire);
    }
  }

  private _createWireObject3D(wire: Wire): void {
    if (!this._scene || !this._circuit) {
      console.warn(`Cannot create wire ${wire.id}: scene or circuit not initialized`);
      return;
    }
    try {
      // Use WireVisualManager to create wire with pin-accurate endpoints
      this.wireVisualManager.createOrUpdateWire(wire);
    } catch (error) {
      const err = error as Error;
      console.warn(`Failed to create Line2 for wire ${wire.id}:`, err.message);
    }
  }

  /**
   * add a wire between two enodes : update the circuit and add visuals
   * @param sourceEnodeId
   * @param targetEnodeId
   */
  addWire(sourceEnodeId: UUID, targetEnodeId: UUID): Wire {
    const wire = this.circuitWriter.saveAddWire(sourceEnodeId, targetEnodeId);
    this.wireVisualManager.createOrUpdateWire(wire);
    return wire;
  }

  /**
   * Add a component to the circuit and scene
   *
   * @param type - Component type to add
   * @param worldPosition - Position in 3D world coordinates (x, z)
   * @param rotation - 3D world rotation
   * @param config - Optional configuration map for the component
   * @param pinSources - Optional array of source types for the component pins
   * @returns The created Component
   */
  addComponent(
    type: ComponentType,
    worldPosition: THREE.Vector3,
    rotation: Euler,
    config?: Map<string, string> | undefined,
    pinSources?: Array<ENodeSourceType | undefined | null> | undefined
  ): Component {
    // Create component in circuit model
    const component = this.circuitWriter.saveAddComponent(
      type,
      worldPosition,
      rotation,
      config,
      pinSources
    );
    // Create and add visual to scene
    this._createComponentObject3D(component);
    return component;
  }

  /**
   * edit component config and update visuals if necessary
   *
   * @param componentId
   * @param newConfig - map of parameters to be merged into the current config
   */
  editComponentConfig(componentId: UUID, newConfig: Map<string, string>) {
    const component = this.circuitWriter.saveEditComponentConfig(componentId, newConfig);
    if (!component) return;

    const object3D = this._componentObject3Ds.get(componentId);
    if (!object3D) return;
    // Update visuals if component hasChanged
    const factory = this.factoryRegistry.get(component.type);
    factory.updateFromConfiguration(object3D, component.config);
    // if config change, update wires connected to component
    // TODO optimize to do it only if necessary (size, ...)
    this.wireVisualManager.updateWiresForComponent(component.id);
    return;
  }

  /**
   * cycle component config and update visuals if necessary
   * have effect only on components that supports fast config cycle (used to invert logic or initial state of switches)
   * else use editComponentConfig
   *
   * @returns if the component has changed config
   * @param componentId
   */
  cycleComponentConfig(componentId: UUID): boolean {
    const result = this.circuitWriter.cycleComponentConfig(componentId);
    if (!result.hasChanged) {
      return false;
    }
    const object3D = this._componentObject3Ds.get(componentId);
    if (!object3D) return false;
    // Update visuals if component hasChanged
    const factory = this.factoryRegistry.get(result.component.type);
    factory.updateFromConfiguration(object3D, result.component.config);
    return true;
  }

  /**
   * Remove a component from the circuit and scene
   *
   * @param componentId - UUID of the component to remove
   */
  removeComponent(componentId: UUID): void {
    // Remove from circuit model (also removes connected wires)
    const result = this.circuitWriter.saveDeleteComponent(componentId);
    // Remove visuals for wires that were connected to the component
    for (const wireId of result.deletedWires) {
      this._removeWireObject3D(wireId);
    }
    // Remove component visual
    this._removeComponentObject3D(componentId);
  }

  /**
   * Update an enode based to a new source type.
   * @param enodeId - UUID of the enode
   * @param enodeType - Type of the enode (BranchingPoint or Pin)
   * @param sourceType - New source type (null for no source)
   */
  updateEnodeSourceType(enodeId: UUID, sourceType: ENodeSourceType | null): void {
    const object3D = this._enodeObject3Ds.get(enodeId);
    if (!object3D) return;
    if (object3D.userData.lockedSourceType) return; // do not update locked source types

    this.circuitWriter.saveEditENodeSourceType(enodeId, sourceType);

    if (object3D.userData.componentId) {
      this.factoryRegistry.getFallbackFactory().updatePinSourceType(object3D, sourceType ?? null);
    } else {
      this.branchingPointVisualFactory.updateSourceType(object3D, sourceType ?? null);
    }
  }

  /**
   * Remove wire visual and update the circuit
   * @param wireId
   */
  removeWire(wireId: UUID) {
    this.circuitWriter.saveDeleteWire(wireId);
    this._removeWireObject3D(wireId);
  }

  /**
   * Automatically adjust the circuit grid size and divisions based on positions of all core circuit elements.
   */
  autoAdjustCircuitGridSize() {
    this._checkInitialized();
    if (!this._circuit) return;
    if (this.circuitWriter.saveAutoAdjustCircuitSize()) {
      // Update halfSize
      this._gridHalfSize = Math.ceil(this._circuit.metadata.size / 2);
      // Update grid helper
      if (this._grid) {
        this._scene!.remove(this._grid);
        this._grid.geometry.dispose();
      }
      this._grid = createGridHelper(this._circuit.metadata.size, this._circuit.metadata.divisions);
      this._scene!.add(this._grid);
    }
  }

  /**
   * Hook called before exporting the circuit visualization.
   * Saves world informations such as camera position, in the circuit metadata.
   */
  public beforeExport(): void {
    if (!this._circuit || !this._camera || !this._mapControls) return;
    try {
      this.circuitWriter.saveCameraOptions();
    }
    catch (error) {
      console.warn(error);
    }
  }

  private _removeWireObject3D(id: string): void {
    if (this._wireObject3Ds.has(id)) {
      // Use WireVisualManager to remove wire (handles all disposal and delete from map)
      this.wireVisualManager.removeWire(id);
    }
  }

  protected _removeAllVisuals(): void {
    // Remove all wire meshes
    for (const id of Array.from(this._wireObject3Ds.keys())) {
      this._removeWireObject3D(id);
    }
    // Remove all enode meshes
    for (const id of Array.from(this._enodeObject3Ds.keys())) {
      this._removeEnodeObject3D(id);
    }
    // Remove all component meshes
    for (const id of Array.from(this._componentObject3Ds.keys())) {
      this._removeComponentObject3D(id);
    }
    // remove grid
    if (this._grid) {
      this._scene!.remove(this._grid);
      this._grid.geometry.dispose();
    }
  }
}
