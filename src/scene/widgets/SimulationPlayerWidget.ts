/**
 * Simulation Player Widget
 * @module scene/widgets/SimulationPlayerWidget
 *
 * Horizontal control: stop button + speed slider + TPS indicator.
 * - Single click on slider while paused -> step
 * - Double click on slider -> toggle play / pause
 * - Drag/input on slider -> set simulationSpeed
 * Visible only in simulation mode.
 */

import { sceT } from '../../i18n';
import { iconElement, stopIcon } from './assets/icons';
import { applyIconButtonBase, applyWidgetRoot, LAYOUT } from './styles';

const SINGLE_CLICK_DEBOUNCE_MS = 250;

export interface SimulationPlayerCallbacks {
  onStop: () => void;
  onSpeedChange: (tps: number) => void;
  onTogglePlay: () => void;
  onStep: () => void;
}

export class SimulationPlayerWidget {
  private readonly _root: HTMLDivElement;
  private readonly _stopBtn: HTMLButtonElement;
  private readonly _slider: HTMLInputElement;
  private readonly _speedLabel: HTMLSpanElement;
  private readonly _callbacks: SimulationPlayerCallbacks;
  private _isPlaying: boolean;
  private _clickTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    minSpeed: number,
    maxSpeed: number,
    initialSpeed: number,
    initialPlaying: boolean,
    callbacks: SimulationPlayerCallbacks,
  ) {
    this._callbacks = callbacks;
    this._isPlaying = initialPlaying;

    this._root = document.createElement('div');
    Object.assign(this._root.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 10px',
      borderRadius: '8px',
      background: 'rgba(30, 30, 38, 0.85)',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
    } satisfies Partial<CSSStyleDeclaration>);
    applyWidgetRoot(this._root, LAYOUT.PLAYER_TOP, LAYOUT.LEFT);

    this._stopBtn = this._makeStopButton();
    this._slider = this._makeSlider(minSpeed, maxSpeed, initialSpeed);
    this._speedLabel = this._makeSpeedLabel();

    this._root.appendChild(this._stopBtn);
    this._root.appendChild(this._slider);
    this._root.appendChild(this._speedLabel);

    this._renderSpeedLabel(initialSpeed);
    this._renderThumbColor();
    this._injectThumbStyles();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
  }

  setVisible(visible: boolean): void {
    this._root.style.display = visible ? 'flex' : 'none';
  }

  setSpeed(tps: number): void {
    if (Number(this._slider.value) !== tps) {
      this._slider.value = String(tps);
    }
    this._renderSpeedLabel(tps);
  }

  setPlaying(playing: boolean): void {
    if (this._isPlaying === playing) return;
    this._isPlaying = playing;
    this._renderThumbColor();
  }

  setLanguage(_lng: string): void {
    this._stopBtn.title = sceT('widgets.simulation.stop', { defaultValue: 'Stop' });
    this._renderSpeedLabel(Number(this._slider.value));
  }

  dispose(): void {
    if (this._clickTimer !== null) {
      clearTimeout(this._clickTimer);
      this._clickTimer = null;
    }
    this._root.remove();
  }

  /** Test/debug accessor. */
  get element(): HTMLDivElement {
    return this._root;
  }

  /** Test/debug accessor. */
  get sliderElement(): HTMLInputElement {
    return this._slider;
  }

  private _makeStopButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    applyIconButtonBase(button);
    Object.assign(button.style, {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      color: '#ff6b6b',
    } satisfies Partial<CSSStyleDeclaration>);
    button.title = sceT('widgets.simulation.stop', { defaultValue: 'Stop' });
    button.appendChild(iconElement(stopIcon, 14));
    button.addEventListener('click', () => this._callbacks.onStop());
    return button;
  }

  private _makeSlider(min: number, max: number, value: number): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = '1';
    slider.value = String(value);
    slider.classList.add('sce-player-slider');
    Object.assign(slider.style, {
      width: '140px',
      height: '6px',
      cursor: 'pointer',
      accentColor: '#ff7a3d',
    } satisfies Partial<CSSStyleDeclaration>);

    slider.addEventListener('input', () => {
      const tps = Number(slider.value);
      this._renderSpeedLabel(tps);
      this._callbacks.onSpeedChange(tps);
    });

    slider.addEventListener('click', (e) => {
      // Distinguish click from drag-end: only act if not currently focused-via-drag.
      // We always (re)schedule a single-click handler; dblclick will cancel it.
      e.stopPropagation();
      if (this._clickTimer !== null) {
        clearTimeout(this._clickTimer);
      }
      this._clickTimer = setTimeout(() => {
        this._clickTimer = null;
        if (!this._isPlaying) {
          this._callbacks.onStep();
        }
      }, SINGLE_CLICK_DEBOUNCE_MS);
    });

    slider.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (this._clickTimer !== null) {
        clearTimeout(this._clickTimer);
        this._clickTimer = null;
      }
      this._callbacks.onTogglePlay();
    });

    return slider;
  }

  private _makeSpeedLabel(): HTMLSpanElement {
    const span = document.createElement('span');
    Object.assign(span.style, {
      color: '#e8e8ec',
      fontFamily: 'sans-serif',
      fontSize: '12px',
      minWidth: '54px',
      textAlign: 'right',
      userSelect: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    return span;
  }

  private _renderSpeedLabel(tps: number): void {
    this._speedLabel.textContent = sceT('widgets.simulation.speed', {
      defaultValue: '{{tps}} TPS',
      tps,
    });
  }

  private _renderThumbColor(): void {
    this._slider.style.accentColor = this._isPlaying ? '#ff7a3d' : '#888888';
  }

  /**
   * Inject a one-shot stylesheet for the slider thumb so it visually matches
   * `slider.png` (orange round thumb on a grey track) on browsers that ignore
   * `accent-color`. Idempotent across multiple widget instances.
   */
  private _injectThumbStyles(): void {
    const STYLE_ID = 'sce-player-slider-style';
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .sce-player-slider { -webkit-appearance: none; appearance: none; background: #5a5a64; border-radius: 999px; }
      .sce-player-slider::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 16px; height: 16px; border-radius: 50%;
        background: currentColor; border: 1px solid rgba(0,0,0,0.4);
        cursor: pointer;
      }
      .sce-player-slider::-moz-range-thumb {
        width: 16px; height: 16px; border-radius: 50%;
        background: currentColor; border: 1px solid rgba(0,0,0,0.4);
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }
}
