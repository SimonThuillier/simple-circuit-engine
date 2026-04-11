/**
 * Component Picker Widget
 * @module scene/static/tools/ComponentPickerWidget
 *
 * DOM-based overlay widget for selecting component types organized by groups.
 * Used by BuildTool in add_component mode.
 * Follows the DOM overlay pattern established by ConfigPanelManager.
 */

import type { ComponentType } from 'simple-circuit-engine/core';
import type { IGroupedFactoryRegistry } from '../../shared/components/GroupedFactoryRegistry';
import { sceT } from '../../../i18n';

/**
 * Sentinel value representing the "Branching Point" pseudo-component entry.
 * When selected, BuildTool creates a branching point instead of a component.
 */
export const BRANCHING_POINT_SENTINEL = '__branching_point__' as const;

/**
 * Union of actual component types and the branching point sentinel.
 */
export type PickerSelection = ComponentType | typeof BRANCHING_POINT_SENTINEL;

/**
 * Persisted widget state (survives open/close cycles within a session).
 */
export interface ComponentPickerState {
  selectedGroupId: string;
  selectedItem: PickerSelection | null;
  widgetWidth: number;
  widgetHeight: number;
}

/** Group id where the Branching Point entry is prepended */
const BRANCHING_POINT_GROUP = 'basic';

/** Default widget dimensions */
const DEFAULT_WIDTH = 180;
const DEFAULT_HEIGHT = 300;

/** Viewport positioning constants (matching ConfigPanelManager) */
const OFFSET_X = -240;
const OFFSET_Y = -150;
const VIEWPORT_PADDING = 10;

/**
 * DOM overlay widget for selecting components from grouped registry.
 *
 * Features:
 * - Group dropdown for filtering component types
 * - Scrollable item list with selection highlight
 * - Draggable header bar
 * - Resizable via CSS resize
 * - State persistence across open/close (group, selection, size)
 */
export class ComponentPickerWidget {
  // DOM elements
  private container: HTMLDivElement | null = null;
  private titleEl: HTMLSpanElement | null = null;
  private groupDropdown: HTMLSelectElement | null = null;
  private itemList: HTMLDivElement | null = null;

  // Persisted state
  private state: ComponentPickerState;

  // Callbacks
  private readonly onSelectionChange: (selection: PickerSelection | null) => void;
  private readonly onClose: () => void;

  // Event handler references for cleanup
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  // Drag state
  private dragOffset: { x: number; y: number } | null = null;
  private dragMoveHandler: ((e: MouseEvent) => void) | null = null;
  private dragEndHandler: ((e: MouseEvent) => void) | null = null;

  /**
   * @param registry - Grouped factory registry providing groups and component types
   * @param onSelectionChange - Called when user selects or deselects an item
   * @param onClose - Called when user closes the widget (close button or Escape)
   */
  constructor(
    private readonly registry: IGroupedFactoryRegistry,
    onSelectionChange: (selection: PickerSelection | null) => void,
    onClose: () => void
  ) {
    this.onSelectionChange = onSelectionChange;
    this.onClose = onClose;

    // Initialize state with first available group
    const groups = registry.getGroups();
    const firstGroup = groups[0];
    this.state = {
      selectedGroupId: firstGroup ? firstGroup.id : '',
      selectedItem: null,
      widgetWidth: DEFAULT_WIDTH,
      widgetHeight: DEFAULT_HEIGHT,
    };
  }

  /** Whether the widget is currently open and visible */
  get isOpen(): boolean {
    return this.container !== null;
  }

  /** The currently selected item (persists across open/close) */
  get currentSelection(): PickerSelection | null {
    return this.state.selectedItem;
  }

  /**
   * Open the widget at the given screen position.
   * If already open, repositions to the new location.
   *
   * @param screenPosition - Screen coordinates (typically from mouse event)
   */
  open(screenPosition: { x: number; y: number }): void {
    if (this.container) {
      this.positionContainer(screenPosition);
      return;
    }

    this.createDOM();
    this.positionContainer(screenPosition);
    this.renderItemList();
    this.registerEventListeners();
  }

  /**
   * Close the widget and remove DOM.
   * Preserves state (group, selection, size) for next open.
   */
  close(): void {
    if (!this.container) return;

    // Save current size before removing
    this.state.widgetWidth = this.container.offsetWidth;
    this.state.widgetHeight = this.container.offsetHeight;

    this.removeEventListeners();
    document.body.removeChild(this.container);
    this.container = null;
    this.titleEl = null;
    this.groupDropdown = null;
    this.itemList = null;
  }

  /**
   * Full cleanup including state reset.
   */
  dispose(): void {
    this.close();
  }

  /**
   * Refresh all user-visible text in place after a language change.
   * No-op if the widget is not currently open.
   * Preserves drag position, scroll, resize dimensions, and current selection.
   */
  setLanguage(_lng: string): void {
    if (!this.isOpen) return;

    if (this.titleEl) {
      this.titleEl.textContent = sceT('picker.title', { defaultValue: 'Components' });
    }

    if (this.groupDropdown) {
      const selectedValue = this.groupDropdown.value;
      for (const option of Array.from(this.groupDropdown.options)) {
        option.textContent = sceT(`components.groups.${option.value}.name`, {
          defaultValue: option.textContent ?? option.value,
        });
      }
      this.groupDropdown.value = selectedValue;
    }

    this.renderItemList();
  }

  // ========================================================================
  // DOM Creation
  // ========================================================================

  private createDOM(): void {
    // Container
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      zIndex: '1000',
      width: `${this.state.widgetWidth}px`,
      height: `${this.state.widgetHeight}px`,
      minWidth: '140px',
      minHeight: '120px',
      maxHeight: '500px',
      background: '#2a2a2a',
      color: '#eee',
      borderRadius: '6px',
      fontFamily: 'sans-serif',
      fontSize: '13px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      resize: 'both',
    });

    // Header bar (draggable)
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 8px',
      background: '#333',
      cursor: 'grab',
      userSelect: 'none',
      borderRadius: '6px 6px 0 0',
      flexShrink: '0',
    });

    const title = document.createElement('span');
    title.textContent = sceT('picker.title', { defaultValue: 'Components' });
    Object.assign(title.style, {
      fontWeight: 'bold',
      fontSize: '13px',
    });
    this.titleEl = title;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u00D7'; // multiplication sign (x)
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      color: '#aaa',
      fontSize: '18px',
      cursor: 'pointer',
      padding: '0 4px',
      lineHeight: '1',
    });
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#fff';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = '#aaa';
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onClose();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Make header draggable
    header.addEventListener('mousedown', (e) => {
      if (e.target === closeBtn) return;
      this.startDrag(e);
    });

    // Group dropdown
    this.groupDropdown = document.createElement('select');
    Object.assign(this.groupDropdown.style, {
      margin: '6px 8px',
      padding: '4px 6px',
      background: '#444',
      color: '#eee',
      border: '1px solid #555',
      borderRadius: '4px',
      fontSize: '12px',
      flexShrink: '0',
      cursor: 'pointer',
    });

    let groups = this.registry.getGroups();
    // Exception rule : if groups doesn't include a basic group
    // an empty one is created to get access to branching points
    if (groups.filter((g) => g.id === BRANCHING_POINT_GROUP).length < 1) {
      groups = [
        {
          id: BRANCHING_POINT_GROUP,
          label: sceT(`components.groups.${BRANCHING_POINT_GROUP}.name`, {
            defaultValue: BRANCHING_POINT_GROUP,
          }),
        },
        ...groups,
      ];
    }

    for (const group of groups) {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = sceT(`components.groups.${group.id}.name`, {
        defaultValue: group.label,
      });
      this.groupDropdown.appendChild(option);
    }
    this.groupDropdown.value = this.state.selectedGroupId;
    this.groupDropdown.addEventListener('change', () => {
      this.state.selectedGroupId = this.groupDropdown!.value;
      // Clear selection when switching groups
      if (this.state.selectedItem !== null) {
        this.state.selectedItem = null;
        this.onSelectionChange(null);
      }
      this.renderItemList();
    });

    // Item list container (scrollable)
    this.itemList = document.createElement('div');
    Object.assign(this.itemList.style, {
      flex: '1',
      overflowY: 'auto',
      padding: '0 4px 4px 4px',
    });

    // Assemble
    this.container.appendChild(header);
    this.container.appendChild(this.groupDropdown);
    this.container.appendChild(this.itemList);
    document.body.appendChild(this.container);
  }

  // ========================================================================
  // Item List Rendering
  // ========================================================================

  private renderItemList(): void {
    if (!this.itemList) return;
    this.itemList.innerHTML = '';

    const groupId = this.state.selectedGroupId;
    const types = this.registry.getRegisteredTypes(groupId);

    // Prepend Branching Point entry in the basic group
    if (groupId === BRANCHING_POINT_GROUP) {
      this.itemList.appendChild(
        this.createItemElement(
          sceT('picker.branchingPoint', { defaultValue: 'Branching Point' }),
          BRANCHING_POINT_SENTINEL
        )
      );
    }

    for (const type of types) {
      const label = sceT(`components.${type}.name`, { defaultValue: type });
      this.itemList.appendChild(this.createItemElement(label, type));
    }
  }

  private createItemElement(label: string, value: PickerSelection): HTMLDivElement {
    const item = document.createElement('div');
    item.textContent = label;
    const isSelected = this.state.selectedItem === value;

    Object.assign(item.style, {
      padding: '6px 8px',
      margin: '2px 0',
      borderRadius: '4px',
      cursor: 'pointer',
      background: isSelected ? '#4a6fa5' : 'transparent',
      transition: 'background 0.15s',
    });

    item.addEventListener('mouseenter', () => {
      if (this.state.selectedItem !== value) {
        item.style.background = '#3a3a3a';
      }
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = this.state.selectedItem === value ? '#4a6fa5' : 'transparent';
    });
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectItem(value);
    });

    return item;
  }

  private selectItem(value: PickerSelection): void {
    // Toggle: clicking the already-selected item deselects it
    const newValue = this.state.selectedItem === value ? null : value;
    this.state.selectedItem = newValue;
    this.renderItemList(); // Re-render to update highlight
    this.onSelectionChange(newValue);
  }

  // ========================================================================
  // Positioning (ConfigPanelManager pattern)
  // ========================================================================

  private positionContainer(screenPosition: { x: number; y: number }): void {
    if (!this.container) return;

    const panelWidth = this.state.widgetWidth;
    const panelHeight = this.state.widgetHeight;

    let left = screenPosition.x + OFFSET_X;
    let top = screenPosition.y + OFFSET_Y;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // If would overflow, shift
    if (left + panelWidth > viewportWidth - VIEWPORT_PADDING) {
      left = screenPosition.x - panelWidth - OFFSET_X;
    } else if (left < viewportWidth + VIEWPORT_PADDING) {
      left = screenPosition.x + OFFSET_X;
    }

    // Clamp left
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING;
    }
    // Clamp top
    if (top < VIEWPORT_PADDING) {
      top = VIEWPORT_PADDING;
    } else if (top + panelHeight > viewportHeight - VIEWPORT_PADDING) {
      top = viewportHeight - panelHeight - VIEWPORT_PADDING;
    }

    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }

  // ========================================================================
  // Dragging
  // ========================================================================

  private startDrag(e: MouseEvent): void {
    if (!this.container) return;
    e.preventDefault();

    this.dragOffset = {
      x: e.clientX - this.container.offsetLeft,
      y: e.clientY - this.container.offsetTop,
    };

    this.container.style.cursor = 'grabbing';

    this.dragMoveHandler = (ev: MouseEvent) => this.onDragMove(ev);
    this.dragEndHandler = () => this.endDrag();
    document.addEventListener('mousemove', this.dragMoveHandler);
    document.addEventListener('mouseup', this.dragEndHandler);
  }

  private onDragMove(e: MouseEvent): void {
    if (!this.container || !this.dragOffset) return;

    let left = e.clientX - this.dragOffset.x;
    let top = e.clientY - this.dragOffset.y;

    // Clamp to viewport
    const maxLeft = window.innerWidth - this.container.offsetWidth - VIEWPORT_PADDING;
    const maxTop = window.innerHeight - this.container.offsetHeight - VIEWPORT_PADDING;
    left = Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft));
    top = Math.max(VIEWPORT_PADDING, Math.min(top, maxTop));

    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }

  private endDrag(): void {
    if (this.container) {
      this.container.style.cursor = '';
    }
    this.dragOffset = null;

    if (this.dragMoveHandler) {
      document.removeEventListener('mousemove', this.dragMoveHandler);
      this.dragMoveHandler = null;
    }
    if (this.dragEndHandler) {
      document.removeEventListener('mouseup', this.dragEndHandler);
      this.dragEndHandler = null;
    }
  }

  // ========================================================================
  // Event Listeners
  // ========================================================================

  private registerEventListeners(): void {
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onClose();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  private removeEventListeners(): void {
    this.endDrag();

    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
  }
}
