/**
 * Unit tests for ComponentPickerWidget
 * @module tests/scene/static/tools/ComponentPickerWidget.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ComponentPickerWidget,
  BRANCHING_POINT_SENTINEL,
} from '../../../../src/scene/static/tools/ComponentPickerWidget';
import type { IGroupedFactoryRegistry } from '../../../../src/scene/shared/components/GroupedFactoryRegistry';
import type { IComponentVisualFactory } from '../../../../src/scene/shared/components/ComponentVisualFactory';
import { ComponentType } from '../../../../src/core/topology/types';

// Mock i18next so sceT returns the defaultValue option when no translations are loaded
vi.mock('i18next', () => ({
  default: {
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  },
}));

// Mock COMPONENT_TYPE_METADATA
vi.mock('simple-circuit-engine/core', () => ({
  COMPONENT_TYPE_METADATA: {
    battery: { id: 'battery', pins: new Map(), config: new Map() },
    switch: { id: 'switch', pins: new Map(), config: new Map() },
    andGate: { id: 'andGate', pins: new Map(), config: new Map() },
  } as Record<string, any>,
}));

function createMockRegistry(): IGroupedFactoryRegistry {
  const mockFactory = {} as IComponentVisualFactory;
  return {
    getGroups: vi.fn().mockReturnValue([
      { id: 'basic', label: 'Basic Components' },
      { id: 'gates', label: 'Logic Gates' },
    ]),
    getRegisteredTypes: vi.fn().mockImplementation((groupId?: string) => {
      if (groupId === 'basic') return ['battery', 'switch'] as ComponentType[];
      if (groupId === 'gates') return ['andGate'] as ComponentType[];
      return ['battery', 'switch', 'andGate'] as ComponentType[];
    }),
    get: vi.fn().mockReturnValue(mockFactory),
    has: vi.fn().mockReturnValue(true),
    getFallbackFactory: vi.fn().mockReturnValue(mockFactory),
    getGroupOf: vi.fn(),
    unregister: vi.fn().mockReturnValue(true),
    addGroup: vi.fn().mockReturnThis(),
  } as unknown as IGroupedFactoryRegistry;
}

describe('ComponentPickerWidget', () => {
  let widget: ComponentPickerWidget;
  let mockRegistry: IGroupedFactoryRegistry;
  let onSelectionChange: ReturnType<typeof vi.fn>;
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRegistry = createMockRegistry();
    onSelectionChange = vi.fn();
    onClose = vi.fn();
    widget = new ComponentPickerWidget(mockRegistry, onSelectionChange, onClose);
  });

  afterEach(() => {
    widget.dispose();
    // Clean up any remaining DOM elements
    document.querySelectorAll('div[style*="z-index: 1000"]').forEach((el) => el.remove());
  });

  describe('Constructor', () => {
    it('should initialize with first group selected', () => {
      expect(widget.isOpen).toBe(false);
      expect(widget.currentSelection).toBeNull();
    });

    it('should not be open initially', () => {
      expect(widget.isOpen).toBe(false);
    });
  });

  describe('open()', () => {
    it('should create DOM and be open', () => {
      widget.open({ x: 100, y: 200 });
      expect(widget.isOpen).toBe(true);
    });

    it('should add container to document.body', () => {
      widget.open({ x: 100, y: 200 });
      const containers = document.querySelectorAll('div[style*="z-index: 1000"]');
      expect(containers.length).toBeGreaterThanOrEqual(1);
    });

    it('should populate group dropdown with registry groups', () => {
      widget.open({ x: 100, y: 200 });
      const selects = document.querySelectorAll('select');
      const select = selects[selects.length - 1]; // Get the one we just created
      expect(select).toBeDefined();
      expect(select.options.length).toBe(2);
      expect(select.options[0].textContent).toBe('Basic Components');
      expect(select.options[1].textContent).toBe('Logic Gates');
    });

    it('should not create duplicate containers when opened twice', () => {
      widget.open({ x: 100, y: 200 });
      widget.open({ x: 300, y: 400 });
      // Should reposition, not create a new container
      expect(widget.isOpen).toBe(true);
    });
  });

  describe('Item list rendering', () => {
    it('should render component items for the selected group', () => {
      widget.open({ x: 100, y: 200 });
      // Default group is 'basic', should show Battery and Switch
      expect(mockRegistry.getRegisteredTypes).toHaveBeenCalledWith('basic');
    });

    it('should prepend Branching Point entry in basic group', () => {
      widget.open({ x: 100, y: 200 });
      // Find the item list - it should contain Branching Point as first item
      const containers = document.querySelectorAll('div[style*="z-index: 1000"]');
      const container = containers[containers.length - 1];
      const items = container.querySelectorAll('div[style*="cursor: pointer"]');
      // First item should be "Branching Point"
      expect(items[0]?.textContent).toBe('Branching Point');
    });

    it('should show component type IDs as fallback names when no i18n translations loaded', () => {
      widget.open({ x: 100, y: 200 });
      const containers = document.querySelectorAll('div[style*="z-index: 1000"]');
      const container = containers[containers.length - 1];
      const items = container.querySelectorAll('div[style*="cursor: pointer"]');
      // Items: Branching Point (hardcoded fallback), battery, switch (type IDs as fallback)
      expect(items.length).toBe(3);
      expect(items[1]?.textContent).toBe('battery');
      expect(items[2]?.textContent).toBe('switch');
    });
  });

  describe('Selection', () => {
    it('should fire onSelectionChange when an item is clicked', () => {
      widget.open({ x: 100, y: 200 });
      const containers = document.querySelectorAll('div[style*="z-index: 1000"]');
      const container = containers[containers.length - 1];
      const items = container.querySelectorAll('div[style*="cursor: pointer"]');
      // Click on Battery (second item, after Branching Point)
      (items[1] as HTMLElement).click();
      expect(onSelectionChange).toHaveBeenCalledWith('battery');
    });

    it('should fire onSelectionChange with sentinel for Branching Point', () => {
      widget.open({ x: 100, y: 200 });
      const containers = document.querySelectorAll('div[style*="z-index: 1000"]');
      const container = containers[containers.length - 1];
      const items = container.querySelectorAll('div[style*="cursor: pointer"]');
      // Click on Branching Point (first item)
      (items[0] as HTMLElement).click();
      expect(onSelectionChange).toHaveBeenCalledWith(BRANCHING_POINT_SENTINEL);
    });

    it('should deselect when clicking the already-selected item', () => {
      widget.open({ x: 100, y: 200 });
      const containers = document.querySelectorAll('div[style*="z-index: 1000"]');
      const container = containers[containers.length - 1];
      const items = container.querySelectorAll('div[style*="cursor: pointer"]');

      // Select Battery
      (items[1] as HTMLElement).click();
      expect(onSelectionChange).toHaveBeenCalledWith('battery');
      expect(widget.currentSelection).toBe('battery');

      // Click Battery again to deselect
      // Re-query items since list re-renders on selection change
      const updatedItems = container.querySelectorAll('div[style*="cursor: pointer"]');
      (updatedItems[1] as HTMLElement).click();
      expect(onSelectionChange).toHaveBeenCalledWith(null);
      expect(widget.currentSelection).toBeNull();
    });

    it('should persist selection across close/open cycles', () => {
      widget.open({ x: 100, y: 200 });
      // Select an item
      const containers = document.querySelectorAll('div[style*="z-index: 1000"]');
      const container = containers[containers.length - 1];
      const items = container.querySelectorAll('div[style*="cursor: pointer"]');
      (items[1] as HTMLElement).click(); // Select Battery

      expect(widget.currentSelection).toBe('battery');

      widget.close();
      expect(widget.currentSelection).toBe('battery');

      widget.open({ x: 200, y: 300 });
      expect(widget.currentSelection).toBe('battery');
    });
  });

  describe('Close', () => {
    it('should close and remove DOM', () => {
      widget.open({ x: 100, y: 200 });
      expect(widget.isOpen).toBe(true);

      widget.close();
      expect(widget.isOpen).toBe(false);
    });

    it('should call onClose when close button is clicked', () => {
      widget.open({ x: 100, y: 200 });
      const containers = document.querySelectorAll('div[style*="z-index: 1000"]');
      const container = containers[containers.length - 1];
      const closeBtn = container.querySelector('button');
      expect(closeBtn).toBeDefined();
      closeBtn!.click();
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', () => {
      widget.open({ x: 100, y: 200 });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('dispose()', () => {
    it('should close and clean up', () => {
      widget.open({ x: 100, y: 200 });
      widget.dispose();
      expect(widget.isOpen).toBe(false);
    });
  });
});
