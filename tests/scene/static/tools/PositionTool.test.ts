/**
 * Unit tests for PositionTool
 * Test: T040-T041, T052
 * @module tests/scene/static/tools/PositionTool.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PositionTool } from '@/scene/static/tools/PositionTool';
import * as THREE from 'three';

// Mock CircuitSceneManager
const createMockSceneManager = () => {
  const selectionManager = {
    getSelection: vi.fn(),
    selectOne: vi.fn(),
    deselect: vi.fn(),
  };

  const circuitEditionManager = {
    saveComponentAction: vi.fn(),
  };

  const wireVisualManager = {
    updateWiresForComponent: vi.fn(),
  };

  const mockGroup = new THREE.Group();
  mockGroup.position.set(5, 0, -5);

  // Create a single container element that persists across calls
  const mockContainer = document.createElement('div');

  return {
    getSelectionManager: vi.fn(() => selectionManager),
    getCircuitEditionManager: vi.fn(() => circuitEditionManager),
    getWireVisualManager: vi.fn(() => wireVisualManager),
    getContainer: vi.fn(() => mockContainer),
    getControls: vi.fn(() => ({ enablePan: true })),
    cursorGroundPlanePosition: vi.fn(() => new THREE.Vector3(10, 0, -10)),
    getSelectionPositions: vi.fn(
      () =>
        new Map([
          ['component-id', { type: 'component' as const, position: new THREE.Vector3(5, 0, -5) }],
        ])
    ),
    getObject3D: vi.fn(() => mockGroup),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
};

describe('PositionTool (T040-T041, T052)', () => {
  let sceneManager: ReturnType<typeof createMockSceneManager>;
  let tool: PositionTool;
  let componentId: string;

  beforeEach(() => {
    sceneManager = createMockSceneManager();
    tool = new PositionTool(sceneManager as any);

    // Use the same component ID as in the mock
    componentId = 'component-id';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool activation (T040)', () => {
    it('should have type "position"', () => {
      expect(tool.type).toBe('position');
    });

    it('should return "default" cursor', () => {
      expect(tool.getCursorType()).toBe('default');
    });

    it('should not have drag state initially', () => {
      expect((tool as any).dragState).toBeNull();
    });

    it('should setup event listeners on activate', () => {
      const container = sceneManager.getContainer();
      const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
      const windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener');

      tool.onActivate();

      expect(addEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('dblclick', expect.any(Function));
      expect(windowAddEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
      windowAddEventListenerSpy.mockRestore();
    });

    it('should remove event listeners on deactivate', () => {
      const container = sceneManager.getContainer();
      const removeEventListenerSpy = vi.spyOn(container, 'removeEventListener');
      const windowRemoveEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      tool.onActivate();
      tool.onDeactivate();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dblclick', expect.any(Function));
      expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
      windowRemoveEventListenerSpy.mockRestore();
    });
  });

  describe('Drag operations (T041)', () => {
    beforeEach(() => {
      // Setup selection
      sceneManager.getSelectionManager().getSelection.mockReturnValue({
        kind: 'mono',
        type: 'component',
        id: componentId,
        data: null,
      });
    });

    it('should start drag on pointerdown with selected component', () => {
      const event = new MouseEvent('pointerdown', { button: 0 });

      (tool as any).handlePointerDown(event);

      expect((tool as any).dragState).not.toBeNull();
      expect((tool as any).dragState.selection.id).toBe(componentId);
      expect(sceneManager.emit).toHaveBeenCalledWith(
        'dragStart',
        expect.objectContaining({
          selection: expect.any(Object),
          startPosition: expect.any(THREE.Vector3),
        })
      );
    });

    it('should not start drag on right click', () => {
      const event = new MouseEvent('pointerdown', { button: 2 });

      (tool as any).handlePointerDown(event);

      expect((tool as any).dragState).toBeNull();
    });

    it('should update position during drag', () => {
      // Start drag
      const downEvent = new MouseEvent('pointerdown', { button: 0 });
      (tool as any).handlePointerDown(downEvent);

      // Move
      const newPosition = new THREE.Vector3(15, 0, -15);
      (tool as any).handleGridPositionMove(newPosition);

      expect(sceneManager.emit).toHaveBeenCalledWith(
        'dragMove',
        expect.objectContaining({
          selection: expect.any(Object),
          currentPosition: newPosition,
          delta: expect.any(THREE.Vector3),
        })
      );
    });

    it('should update wires during drag', () => {
      // Start drag
      const downEvent = new MouseEvent('pointerdown', { button: 0 });
      (tool as any).handlePointerDown(downEvent);

      // Move
      const newPosition = new THREE.Vector3(15, 0, -15);
      (tool as any).handleGridPositionMove(newPosition);

      // WireVisualManager.updateWiresForComponent should be called during drag
      expect(sceneManager.getWireVisualManager().updateWiresForComponent).toHaveBeenCalledWith(
        componentId
      );
    });

    it('should emit dragEnd on pointerup', () => {
      // Start drag
      const downEvent = new MouseEvent('pointerdown', { button: 0 });
      (tool as any).handlePointerDown(downEvent);

      // End drag
      const upEvent = new MouseEvent('pointerup', { button: 0 });
      (tool as any).handlePointerUp(upEvent);

      expect(sceneManager.emit).toHaveBeenCalledWith(
        'dragEnd',
        expect.objectContaining({
          selection: expect.any(Object),
          finalPosition: expect.any(THREE.Vector3),
        })
      );
      expect((tool as any).dragState).toBeNull();
    });

    it('should update wires on drag end', () => {
      // Start drag
      const downEvent = new MouseEvent('pointerdown', { button: 0 });
      (tool as any).handlePointerDown(downEvent);

      // Clear previous mock calls
      vi.clearAllMocks();

      // End drag
      const upEvent = new MouseEvent('pointerup', { button: 0 });
      (tool as any).handlePointerUp(upEvent);

      // WireVisualManager.updateWiresForComponent should be called when drag ends
      expect(sceneManager.getWireVisualManager().updateWiresForComponent).toHaveBeenCalledWith(
        componentId
      );
    });

    it('should cancel drag on Escape key', () => {
      // Start drag
      const downEvent = new MouseEvent('pointerdown', { button: 0 });
      (tool as any).handlePointerDown(downEvent);

      // Press Escape
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      (tool as any).handleKeyDown(escapeEvent);

      expect(sceneManager.emit).toHaveBeenCalledWith(
        'dragCancel',
        expect.objectContaining({
          selection: expect.any(Object),
        })
      );
      expect((tool as any).dragState).toBeNull();
    });

    it('should update wires on drag cancel', () => {
      // Start drag
      const downEvent = new MouseEvent('pointerdown', { button: 0 });
      (tool as any).handlePointerDown(downEvent);

      // Move to a different position
      const newPosition = new THREE.Vector3(15, 0, -15);
      (tool as any).handleGridPositionMove(newPosition);

      // Clear previous mock calls
      vi.clearAllMocks();

      // Press Escape to cancel
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      (tool as any).handleKeyDown(escapeEvent);

      // WireVisualManager.updateWiresForComponent should be called to restore wire positions
      expect(sceneManager.getWireVisualManager().updateWiresForComponent).toHaveBeenCalledWith(
        componentId
      );
    });
  });

  describe('Rotation operations (T052)', () => {
    beforeEach(() => {
      // Setup selection
      sceneManager.getSelectionManager().getSelection.mockReturnValue({
        kind: 'mono',
        type: 'component',
        id: componentId,
        data: null,
      });
    });

    it('should rotate component 90° clockwise on double-click', () => {
      const componentGroup = sceneManager.getObject3D('component', componentId);
      const initialRotation = componentGroup!.rotation.y;

      const dblClickEvent = new MouseEvent('dblclick');
      (tool as any).handleDblClick(dblClickEvent);

      // Visual rotation should have changed (90 degrees clockwise = -PI/2 radians)
      expect(componentGroup!.rotation.y).not.toBe(initialRotation);

      // Should emit componentRotated event
      expect(sceneManager.emit).toHaveBeenCalledWith(
        'componentRotated',
        expect.objectContaining({
          componentId: componentId,
        })
      );

      // Should save to model via CircuitEditionManager
      expect(sceneManager.getCircuitEditionManager().saveComponentAction).toHaveBeenCalledWith(
        componentId,
        'edit',
        componentGroup
      );
    });

    it('should update wires when rotating component on double-click', () => {
      const dblClickEvent = new MouseEvent('dblclick');
      (tool as any).handleDblClick(dblClickEvent);

      // WireVisualManager.updateWiresForComponent should be called after rotation
      expect(sceneManager.getWireVisualManager().updateWiresForComponent).toHaveBeenCalledWith(
        componentId
      );
    });

    it('should rotate component 90° clockwise on R key', () => {
      const componentGroup = sceneManager.getObject3D('component', componentId);
      const initialRotation = componentGroup!.rotation.y;

      const rKeyEvent = new KeyboardEvent('keydown', { key: 'r' });
      (tool as any).handleKeyDown(rKeyEvent);

      // Visual rotation should have changed
      expect(componentGroup!.rotation.y).not.toBe(initialRotation);

      // Should emit componentRotated event
      expect(sceneManager.emit).toHaveBeenCalledWith(
        'componentRotated',
        expect.objectContaining({
          componentId: componentId,
        })
      );

      // Should save to model via CircuitEditionManager
      expect(sceneManager.getCircuitEditionManager().saveComponentAction).toHaveBeenCalledWith(
        componentId,
        'edit',
        componentGroup
      );
    });

    it('should update wires when rotating component with R key', () => {
      const rKeyEvent = new KeyboardEvent('keydown', { key: 'r' });
      (tool as any).handleKeyDown(rKeyEvent);

      // WireVisualManager.updateWiresForComponent should be called after rotation
      expect(sceneManager.getWireVisualManager().updateWiresForComponent).toHaveBeenCalledWith(
        componentId
      );
    });

    it('should handle multiple rotations correctly', () => {
      const componentGroup = sceneManager.getObject3D('component', componentId);
      const startRotation = componentGroup!.rotation.y;

      // Rotate 4 times (full circle - should return to approximately the same angle)
      (tool as any).rotateSelectedComponent();
      (tool as any).rotateSelectedComponent();
      (tool as any).rotateSelectedComponent();
      (tool as any).rotateSelectedComponent();

      // After 4 rotations of 90 degrees each, should be back to start (within floating point precision)
      expect(Math.abs(componentGroup!.rotation.y - startRotation)).toBeLessThan(0.01);

      // Should have called saveComponentAction 4 times
      expect(sceneManager.getCircuitEditionManager().saveComponentAction).toHaveBeenCalledTimes(4);
    });

    it('should not rotate when nothing is selected', () => {
      sceneManager.getSelectionManager().getSelection.mockReturnValue(null);

      const rKeyEvent = new KeyboardEvent('keydown', { key: 'r' });
      (tool as any).handleKeyDown(rKeyEvent);

      // Should not have emitted rotation event
      expect(sceneManager.emit).not.toHaveBeenCalledWith('componentRotated', expect.any(Object));
    });

    it('should not rotate during drag', () => {
      // Start drag
      const downEvent = new MouseEvent('pointerdown', { button: 0 });
      (tool as any).handlePointerDown(downEvent);

      const componentGroup = sceneManager.getObject3D('component', componentId);
      const initialRotation = componentGroup!.rotation.y;

      // Try to rotate with R key during drag
      const rKeyEvent = new KeyboardEvent('keydown', { key: 'r' });
      (tool as any).handleKeyDown(rKeyEvent);

      // Rotation should not have changed (R key should not work during drag)
      expect(componentGroup!.rotation.y).toBe(initialRotation);

      // Should not have emitted componentRotated event
      expect(sceneManager.emit).not.toHaveBeenCalledWith('componentRotated', expect.any(Object));
    });
  });

  describe('Preview objects', () => {
    it('should return empty array for preview objects', () => {
      expect(tool.getPreviewObjects()).toEqual([]);
    });
  });
});
