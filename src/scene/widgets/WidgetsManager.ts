/**
 * Widgets Manager
 * @module scene/widgets/WidgetsManager
 *
 * Owns the integrated overlay widgets (mode, tools, multi-wiring, simulation
 * player), subscribes to CircuitEngine events to keep them in sync, and
 * forwards user actions back to the engine.
 *
 * Widgets are mounted inside the engine container so they sit visually inside
 * the scene viewport. Container's `position` is normalised to `relative` only
 * if it is currently `static`, preserving any caller-provided positioning.
 */

import type { EngineMode, ToolType } from '../shared/types';
import { HelpWidget } from './HelpWidget';
import { ModeWidget } from './ModeWidget';
import { MultiWiringWidget } from './MultiWiringWidget';
import { SimulationPlayerWidget } from './SimulationPlayerWidget';
import { LAYOUT } from './styles';
import { ToolsWidget } from './ToolsWidget';

/**
 * Container width below which the simulation player widget cannot fit on the
 * same row as the mode pill (player is ~350px wide and starts at PLAYER_LEFT).
 * Below this threshold the player drops to a second row.
 */
const PLAYER_RESPONSIVE_BREAKPOINT_PX = 520;

/**
 * Minimal slice of CircuitEngine the manager depends on. Defined as an
 * interface (rather than importing `CircuitEngine` directly) to keep widgets
 * unit-testable with a small mock.
 */
export interface IEngineForWidgets {
  readonly mode: EngineMode;
  readonly multiWiring: boolean;
  readonly simulationSpeed: number;
  readonly minSimulationSpeed: number;
  readonly maxSimulationSpeed: number;
  readonly isPlaying: boolean;

  setMode(mode: EngineMode): void;
  setActiveTool(toolType: ToolType): void;
  getActiveTool(): ToolType | null;
  setEditModeEnabled(enabled: boolean): void;
  setMultiWiring(value: boolean): void;
  play(): void;
  pause(): void;
  step(): void;
  stop(): void;
  requestHelp(): void;

  on(event: any, callback: (payload: any) => void): void;
  off(event: any, callback: (payload: any) => void): void;
}

export class WidgetsManager {
  private readonly _engine: IEngineForWidgets;
  private readonly _container: HTMLElement;
  private readonly _root: HTMLDivElement;

  private readonly _modeWidget: ModeWidget;
  private readonly _toolsWidget: ToolsWidget;
  private readonly _multiWiringWidget: MultiWiringWidget;
  private readonly _playerWidget: SimulationPlayerWidget;
  private readonly _helpWidget: HelpWidget;

  private readonly _subscriptions: Array<() => void> = [];
  private _disposed = false;
  private _resizeObserver: ResizeObserver | null = null;

  constructor(engine: IEngineForWidgets, container: HTMLElement) {
    this._engine = engine;
    this._container = container;

    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    this._root = document.createElement('div');
    this._root.dataset.sceWidgets = 'true';
    Object.assign(this._root.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none'
    } satisfies Partial<CSSStyleDeclaration>);
    container.appendChild(this._root);

    this._modeWidget = new ModeWidget(engine.mode, () => this._handleModeToggle());
    this._toolsWidget = new ToolsWidget(
      engine.mode === 'edit' ? engine.getActiveTool() : null,
      (tool) => this._handleToolSelect(tool),
    );
    this._multiWiringWidget = new MultiWiringWidget(engine.multiWiring, () =>
      this._handleMultiWiringToggle(),
    );
    this._playerWidget = new SimulationPlayerWidget(
      engine.minSimulationSpeed,
      engine.maxSimulationSpeed,
      engine.simulationSpeed,
      engine.mode === 'simulation' ? engine.isPlaying : false,
      {
        onStopReset: () => this._safeCall(() => this._engine.stop()),
        onSpeedChange: (tps) => {
          (this._engine as { simulationSpeed: number }).simulationSpeed = tps;
        },
        onTogglePlay: () =>
          this._safeCall(() => {
            if (this._engine.isPlaying) this._engine.pause();
            else this._engine.play();
          }),
        onStep: () => this._safeCall(() => this._engine.step()),
      },
    );

    this._helpWidget = new HelpWidget(engine.mode, () => this._handleHelpRequested());

    this._modeWidget.mount(this._root);
    this._toolsWidget.mount(this._root);
    this._multiWiringWidget.mount(this._root);
    this._playerWidget.mount(this._root);
    this._helpWidget.mount(this._root);

    this._applyModeVisibility(engine.mode);
    this._applyResponsivePlayerLayout();
    this._observeContainerResize();
    this._subscribeToEngine();
  }

  /**
   * Re-render translated labels after the consumer changed i18next language.
   */
  setLanguage(lng: string): void {
    this._modeWidget.setLanguage(lng);
    this._toolsWidget.setLanguage(lng);
    this._multiWiringWidget.setLanguage(lng);
    this._playerWidget.setLanguage(lng);
    this._helpWidget.setLanguage(lng);
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    for (const off of this._subscriptions) off();
    this._subscriptions.length = 0;

    this._modeWidget.dispose();
    this._toolsWidget.dispose();
    this._multiWiringWidget.dispose();
    this._playerWidget.dispose();
    this._helpWidget.dispose();

    this._root.remove();
  }

  /** Test/debug accessor. */
  get root(): HTMLDivElement {
    return this._root;
  }

  /** Test/debug accessor. */
  get container(): HTMLElement {
    return this._container;
  }

  /** Test/debug accessor. */
  get helpWidget(): HelpWidget {
    return this._helpWidget;
  }

  /** Test/debug accessor. */
  get playerWidget(): SimulationPlayerWidget {
    return this._playerWidget;
  }

  private _subscribeToEngine(): void {
    this._listen('modeChanged', (payload: { mode: EngineMode }) => {
      this._modeWidget.setMode(payload.mode);
      this._applyModeVisibility(payload.mode);
      if (payload.mode === 'edit') {
        this._toolsWidget.setActiveTool(this._engine.getActiveTool());
        this._multiWiringWidget.setActive(this._engine.multiWiring);
      } else {
        this._playerWidget.setSpeed(this._engine.simulationSpeed);
        this._playerWidget.setPlaying(this._engine.isPlaying);
      }
    });

    this._listen('toolActivated', (payload: { toolType: ToolType }) => {
      this._toolsWidget.setActiveTool(payload.toolType);
    });

    this._listen('toolDeactivated', (payload: { toolType: ToolType }) => {
      if (this._engine.getActiveTool() === payload.toolType || this._engine.getActiveTool() === null) {
        this._toolsWidget.setActiveTool(null);
      }
    });

    this._listen('multiWiringChanged', (payload: { multiWiring: boolean }) => {
      this._multiWiringWidget.setActive(payload.multiWiring);
    });

    this._listen('simulationPlayed', () => this._playerWidget.setPlaying(true));
    this._listen('simulationPaused', (payload: { tick: number }) => {
      this._playerWidget.setPlaying(false);
      this._playerWidget.setTick(payload.tick);
    });
    this._listen('simulationStopped', () => {
      this._playerWidget.setPlaying(false);
      this._playerWidget.setTick(0);
    });
    this._listen('simulationStepped', (payload: { tick: number }) => {
      this._playerWidget.setTick(payload.tick);
    });

    this._listen('simulationSpeedChanged', (payload: { newSpeed: number }) => {
      this._playerWidget.setSpeed(payload.newSpeed);
    });
  }

  private _listen<P>(event: string, cb: (payload: P) => void): void {
    this._engine.on(event, cb as (p: any) => void);
    this._subscriptions.push(() => this._engine.off(event, cb as (p: any) => void));
  }

  private _applyModeVisibility(mode: EngineMode): void {
    const editing = mode === 'edit';
    this._toolsWidget.setVisible(editing);
    this._multiWiringWidget.setVisible(editing);
    this._playerWidget.setVisible(!editing);
    this._helpWidget.setMode(mode);
  }

  private _handleModeToggle(): void {
    this._safeCall(() => {
      this._engine.setMode(this._engine.mode === 'edit' ? 'simulation' : 'edit');
    });
  }

  private _handleToolSelect(tool: ToolType): void {
    if (this._engine.mode !== 'edit') return;
    this._safeCall(() => {
      this._engine.setEditModeEnabled(true);
      this._engine.setActiveTool(tool);
    });
  }

  private _handleMultiWiringToggle(): void {
    this._safeCall(() => {
      this._engine.setMultiWiring(!this._engine.multiWiring);
    });
  }

  private _handleHelpRequested(): void {
    this._safeCall(() => this._engine.requestHelp());
  }

  private _applyResponsivePlayerLayout(): void {
    const width = this._container.clientWidth;
    if (width > 0 && width < PLAYER_RESPONSIVE_BREAKPOINT_PX) {
      this._playerWidget.setPosition(LAYOUT.PLAYER_RESPONSIVE_TOP, LAYOUT.PLAYER_RESPONSIVE_LEFT);
      return;
    }
    this._playerWidget.setPosition(LAYOUT.PLAYER_TOP, LAYOUT.PLAYER_LEFT);
  }

  private _observeContainerResize(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this._resizeObserver = new ResizeObserver(() => this._applyResponsivePlayerLayout());
    this._resizeObserver.observe(this._container);
  }

  private _safeCall(fn: () => void): void {
    try {
      fn();
    } catch (error) {
      console.warn('[WidgetsManager] action failed:', error);
    }
  }
}
