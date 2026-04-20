/**
 * Unit tests for WidgetsManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetsManager, type IEngineForWidgets } from '../../../src/scene/widgets/WidgetsManager';
import type { EngineMode, ToolType } from '../../../src/scene/shared/types';

vi.mock('i18next', () => ({
  default: {
    t: (_key: string, options?: any) => {
      if (options && typeof options.tps === 'number') return `${options.tps} TPS`;
      return options?.defaultValue ?? _key;
    },
  },
}));

class FakeEngine implements IEngineForWidgets {
  mode: EngineMode = 'edit';
  multiWiring = false;
  simulationSpeed = 3;
  minSimulationSpeed = 1;
  maxSimulationSpeed = 20;
  isPlaying = false;
  activeTool: ToolType | null = null;

  setMode = vi.fn((mode: EngineMode) => {
    this.mode = mode;
    this._fire('modeChanged', { mode });
  });
  setActiveTool = vi.fn((tool: ToolType) => {
    this.activeTool = tool;
    this._fire('toolActivated', { toolType: tool });
  });
  getActiveTool = vi.fn(() => this.activeTool);
  setEditModeEnabled = vi.fn();
  setMultiWiring = vi.fn((value: boolean) => {
    if (this.multiWiring === value) return;
    this.multiWiring = value;
    this._fire('multiWiringChanged', { multiWiring: value });
  });
  play = vi.fn(() => {
    this.isPlaying = true;
    this._fire('simulationPlayed', { tick: 0 });
  });
  pause = vi.fn(() => {
    this.isPlaying = false;
    this._fire('simulationPaused', { tick: 0 });
  });
  step = vi.fn();
  stop = vi.fn(() => {
    this.isPlaying = false;
    this._fire('simulationStopped', { tick: 0 });
  });

  private _listeners = new Map<string, Set<(p: any) => void>>();
  on(event: string, cb: (p: any) => void): void {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event)!.add(cb);
  }
  off(event: string, cb: (p: any) => void): void {
    this._listeners.get(event)?.delete(cb);
  }
  _fire(event: string, payload: any): void {
    this._listeners.get(event)?.forEach((cb) => cb(payload));
  }
}

describe('WidgetsManager', () => {
  let container: HTMLElement;
  let engine: FakeEngine;
  let manager: WidgetsManager;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    engine = new FakeEngine();
    manager = new WidgetsManager(engine, container);
  });

  afterEach(() => {
    manager.dispose();
    container.remove();
  });

  it('mounts a widgets root inside the container', () => {
    const root = container.querySelector('[data-sce-widgets="true"]');
    expect(root).not.toBeNull();
    expect(root?.querySelectorAll('button').length).toBeGreaterThanOrEqual(3);
  });

  it('normalises a static-positioned container to relative', () => {
    expect(container.style.position).toBe('relative');
  });

  it('shows tools + multi-wiring in edit mode and hides player', () => {
    const buttons = container.querySelectorAll('button');
    const labels = Array.from(buttons).map((b) => b.textContent);
    expect(labels).toContain('Edition');
    // Player root has display: none
    const player = container.querySelector('div > div[style*="display: none"]');
    expect(player).not.toBeNull();
  });

  it('toggles mode via the mode pill click', () => {
    const modeBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Edition',
    )!;
    modeBtn.click();
    expect(engine.setMode).toHaveBeenCalledWith('simulation');
  });

  it('reacts to modeChanged by swapping visibility', () => {
    engine.mode = 'simulation';
    engine._fire('modeChanged', { mode: 'simulation' });
    const modeBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Simulation',
    );
    expect(modeBtn).toBeDefined();
  });

  it('forwards tool selection through setEditModeEnabled + setActiveTool', () => {
    const buildBtn = container.querySelector('button[data-tool="build"]') as HTMLButtonElement;
    buildBtn.click();
    expect(engine.setEditModeEnabled).toHaveBeenCalledWith(true);
    expect(engine.setActiveTool).toHaveBeenCalledWith('build');
  });

  it('reflects multiWiringChanged on the multi-wiring button', () => {
    const mwBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.title === 'Multi-wiring',
    )!;
    expect(mwBtn.getAttribute('aria-pressed')).toBe('false');
    engine._fire('multiWiringChanged', { multiWiring: true });
    expect(mwBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('toggles multi-wiring via click', () => {
    const mwBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.title === 'Multi-wiring',
    )!;
    mwBtn.click();
    expect(engine.setMultiWiring).toHaveBeenCalledWith(true);
  });

  it('removes its DOM on dispose and unsubscribes', () => {
    manager.dispose();
    expect(container.querySelector('[data-sce-widgets="true"]')).toBeNull();
    // Firing further events must not throw or recreate state
    expect(() => engine._fire('modeChanged', { mode: 'simulation' })).not.toThrow();
  });
});
