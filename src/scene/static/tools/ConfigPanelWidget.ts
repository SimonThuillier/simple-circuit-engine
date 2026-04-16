/**
 * Config Panel Manager
 * @module scene/static/ConfigPanelManager
 *
 * Manages the lifecycle of the lil-gui configuration panel for component editing.
 */

import GUI from 'lil-gui';
import type { UUID, Component } from 'simple-circuit-engine/core';
import type { IFactoryRegistry } from '../../shared/components/ComponentVisualFactory';
import type { IComponentVisualFactory } from '../../shared/components/ComponentVisualFactory';
import type { ConfigFormDefinition, ConfigFieldDefinition } from '../../shared/types';
import { sceT } from '../../../i18n';

/**
 * Manages lil-gui configuration panel for component config editing
 *
 * Responsibilities:
 * - Panel lifecycle (open, close, dispose)
 * - DOM container creation and positioning
 * - lil-gui initialization and form building
 * - Click-outside and Escape key handling
 * - onChange event wiring to update component config
 * - Event emission for config changes
 */
export class ConfigPanelWidget {
  private factoryRegistry: IFactoryRegistry;
  private readonly editComponentConfig: (componentId: UUID, newConfig: Map<string, string>) => void;

  // Panel state
  private _isOpen: boolean = false;
  private _currentComponentId: UUID | null = null;
  private _currentComponent: Component | null = null;
  private _currentFactory: IComponentVisualFactory | null = null;
  private gui: GUI | null = null;
  private container: HTMLDivElement | null = null;
  private formDataObject: Record<string, any> = {};

  // Event handlers (stored for removal)
  private clickOutsideHandler: ((event: MouseEvent) => void) | null = null;
  private escapeHandler: ((event: KeyboardEvent) => void) | null = null;

  /**
   * Create a new ConfigPanelManager
   *
   * @param factoryRegistry - Factory registry for getting component factories
   * @param editComponentConfig - Function to edit component config
   * @param _camera - Three.js camera (reserved for future use)
   * @param _domElement - Container DOM element (reserved for future use)
   */
  constructor(
    factoryRegistry: IFactoryRegistry,
    editComponentConfig: (componentId: UUID, newConfig: Map<string, string>) => void,
    _camera: unknown,
    _domElement: unknown
  ) {
    this.factoryRegistry = factoryRegistry;
    this.editComponentConfig = editComponentConfig;
  }

  /**
   * Check if panel is currently open
   */
  get isOpen(): boolean {
    return this._isOpen;
  }

  /**
   * Get the ID of the component currently being edited
   */
  get currentComponentId(): UUID | null {
    return this._currentComponentId;
  }

  /**
   * Open the config panel for a component
   *
   * @param component - component to edit
   * @param screenPosition - Screen coordinates for panel positioning
   * @returns true if panel opened, false if component has no config
   */
  open(component: Component, screenPosition: { x: number; y: number }): boolean {
    // Close existing panel if open
    if (this._isOpen) {
      this.close();
    }

    const factory = this.factoryRegistry.get(component.type);
    const formDef = factory.getConfigFormDefinition(component.config);

    if (!formDef || formDef.fields.length === 0) {
      return false; // No configurable options
    }

    // Create container
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.zIndex = '1000';
    document.body.appendChild(this.container);

    // Position container (will be implemented in T007)
    this.positionContainer(screenPosition);

    this._currentComponent = component;
    this._currentFactory = factory;

    // Create lil-gui (will be implemented in T008)
    this.buildGui(formDef, component, factory);

    // Setup event listeners (will be implemented in T009, T010)
    this.setupEventListeners();

    this._isOpen = true;
    this._currentComponentId = component.id;

    return true;
  }

  /**
   * Close the config panel if open
   */
  close(): void {
    if (!this._isOpen) {
      return;
    }

    // Destroy lil-gui
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }

    // Remove container from DOM
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }

    // Remove event listeners
    this.removeEventListeners();

    this._isOpen = false;
    this._currentComponentId = null;
    this._currentComponent = null;
    this._currentFactory = null;
    this.formDataObject = {};
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.close();
  }

  /**
   * Position the container adjacent to component (right side preferred)
   */
  private positionContainer(screenPosition: { x: number; y: number }): void {
    if (!this.container) return;

    const PANEL_WIDTH = 300; // Approximate lil-gui width
    const OFFSET_X = 20; // Spacing from component
    const VIEWPORT_PADDING = 10; // Min distance from viewport edge

    // Calculate preferred position (right side)
    let left = screenPosition.x + OFFSET_X;
    let top = screenPosition.y;

    // Check viewport overflow and adjust
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // If panel would overflow right edge, position to left of component
    if (left + PANEL_WIDTH > viewportWidth - VIEWPORT_PADDING) {
      left = screenPosition.x - PANEL_WIDTH - OFFSET_X;
    }

    // If still overflows left edge, clamp to viewport
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING;
    }

    // Clamp top to viewport bounds
    if (top < VIEWPORT_PADDING) {
      top = VIEWPORT_PADDING;
    } else if (top > viewportHeight - VIEWPORT_PADDING) {
      top = viewportHeight - VIEWPORT_PADDING - 100; // Approximate panel height
    }

    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }

  /**
   * Build lil-gui from form definition
   */
  private buildGui(formDef: ConfigFormDefinition, component: any, factory: any): void {
    if (!this.container) return;

    // Create lil-gui instance
    this.gui = new GUI({ container: this.container, width: 280 });
    const typeName = sceT(`components.${component.type}.name`, { defaultValue: component.type });
    this.gui.title(sceT('config.title', { name: typeName, defaultValue: `Config: ${typeName}` }));

    // Map core config to form data
    const formData = factory.mapCoreConfigToForm(component.config);

    // Convert Map to plain object for lil-gui
    this.formDataObject = {};
    for (const [key, value] of formData.entries()) {
      this.formDataObject[key] = value;
    }

    // Build controls for each field
    for (const field of formDef.fields) {
      let controller: ReturnType<GUI['add']> | null = null;

      switch (field.type) {
        case 'boolean':
          controller = this.gui
            .add(this.formDataObject, field.key)
            .name(this._resolveFieldLabel(component.type, field))
            .onChange((value: any) => this.onValueChange(field.key, value, component, factory));
          break;

        case 'dropdown':
          if (field.options) {
            controller = this.gui
              .add(this.formDataObject, field.key, field.options)
              .name(this._resolveFieldLabel(component.type, field))
              .onChange((value: any) => this.onValueChange(field.key, value, component, factory));
          }
          break;

        case 'number':
          controller = this.gui
            .add(this.formDataObject, field.key)
            .name(this._resolveFieldLabel(component.type, field))
            .onChange((value: any) => this.onValueChange(field.key, value, component, factory));
          if (field.min !== undefined) controller.min(field.min);
          if (field.max !== undefined) controller.max(field.max);
          if (field.step !== undefined) controller.step(field.step);
          break;

        case 'text':
          controller = this.gui
            .add(this.formDataObject, field.key)
            .name(this._resolveFieldLabel(component.type, field))
            .onChange((value: any) => this.onValueChange(field.key, value, component, factory));
          break;

        case 'color':
          controller = this.gui
            .addColor(this.formDataObject, field.key)
            .name(this._resolveFieldLabel(component.type, field))
            .onChange((value: any) => this.onValueChange(field.key, value, component, factory));
          break;
      }

      if (controller && field.disabled) {
        controller.disable(true);
      }
    }
  }

  /**
   * Handle value change in the config form
   * Maps form data back to core config and updates the component.
   * When defaultLogicFamily or activationLogic changes, rebuilds the GUI to reflect
   * updated disabled states and computed transitionSpan values.
   *
   * @param changedKey - The key of the field that changed
   * @param _value - The new value
   * @param component - Component being edited
   * @param factory - Visual factory for the component
   */
  private onValueChange(changedKey: string, _value: any, component: any, factory: any): void {
    // Convert formDataObject back to Map for mapping
    const formDataMap = new Map<string, any>();
    for (const [key, value] of Object.entries(this.formDataObject)) {
      formDataMap.set(key, value);
    }
    // Map form data back to core config format
    const coreConfig = factory.mapFormToCoreConfig(formDataMap) as Map<string, string>;
    // call editComponentConfig to update the component
    if (this._currentComponentId) {
      this.editComponentConfig(this._currentComponentId, coreConfig);
    }

    // Rebuild GUI when defaultLogicFamily or activationLogic changes to update disabled states
    if (changedKey === 'defaultLogicFamily' || changedKey === 'activationLogic') {
      this.rebuildGui(component, factory);
    }
  }

  /**
   * Resolve a form field label via i18n, falling back to a humanised form
   * of the field key when no translation is available (e.g. "transitionSpan" →
   * "Transition Span"). The fallback covers two cases: (a) the consumer never
   * called registerSceTranslations, (b) the key is not yet in the locale file.
   */
  private _resolveFieldLabel(componentType: string, field: ConfigFieldDefinition): string {
    const fallback = field.key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
    return sceT(`components.${componentType}.config.fields.${field.key}.name`, {
      defaultValue: fallback,
    });
  }

  /**
   * Refresh the panel to display strings in the current language.
   * No-op if the panel is not open.
   */
  setLanguage(_lng: string): void {
    if (!this._isOpen || !this._currentComponent || !this._currentFactory) return;
    this.rebuildGui(this._currentComponent, this._currentFactory);
  }

  /**
   * Rebuild the GUI in place, re-reading the updated component config.
   * Used after interdependent field changes (defaultLogicFamily, activationLogic).
   */
  private rebuildGui(component: any, factory: any): void {
    if (!this.gui || !this.container) return;

    // Destroy existing GUI
    this.gui.destroy();
    this.gui = null;

    // Re-read updated config from the component (already updated by editComponentConfig)
    const formDef = factory.getConfigFormDefinition(component.config);
    if (!formDef) return;

    this.buildGui(formDef, component, factory);
  }

  /**
   * Setup event listeners for dismissing the panel
   */
  private setupEventListeners(): void {
    // Click-outside detection
    this.clickOutsideHandler = (event: MouseEvent) => {
      if (!this.container) return;

      const target = event.target as Node;
      // Check if click is outside the panel container
      if (!this.container.contains(target)) {
        this.close();
      }
    };

    // Add with a small delay to avoid immediate closure from the click that opened it
    setTimeout(() => {
      if (this.clickOutsideHandler) {
        document.addEventListener('pointerdown', this.clickOutsideHandler);
      }
    }, 100);

    // Escape key handling
    this.escapeHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (this.clickOutsideHandler) {
      document.removeEventListener('pointerdown', this.clickOutsideHandler);
      this.clickOutsideHandler = null;
    }
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
  }
}
