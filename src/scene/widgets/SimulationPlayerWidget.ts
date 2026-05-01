/**
 * Simulation Player Widget
 * @module scene/widgets/SimulationPlayerWidget
 *
 * Horizontal control strip: stop | (spacer) | play/pause | speed slider |
 * TPS indicator | step. Visible only in simulation mode.
 *
 * Play/pause button icon reflects current state: `pauseIcon` while playing,
 * `playIcon` while paused. The step button relies on the engine pausing
 * automatically when stepping while playing.
 */

import { sceT } from '../../i18n';
import { iconElement, pauseIcon, playIcon, stepIcon, stopIcon } from './assets/icons';
import { applyIconButtonBase, applyWidgetRoot, LAYOUT } from './styles';

export interface SimulationPlayerCallbacks {
  onTogglePlay: () => void;
  onSpeedChange: (tps: number) => void;
  onStep: () => void;
  onStopReset: () => void;
}

export class SimulationPlayerWidget {
  private readonly _root: HTMLDivElement;
  private readonly _stopBtn: HTMLButtonElement;
  private readonly _playPauseBtn: HTMLButtonElement;
  private readonly _stepBtn: HTMLButtonElement;
  private readonly _slider: HTMLInputElement;
  private readonly _speedLabel: HTMLSpanElement;
  private readonly _callbacks: SimulationPlayerCallbacks;
  private _isPlaying: boolean;
  private _currentTick: number = 0;

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
      gap: '6px',
      padding: '6px 10px',
      borderRadius: '8px',
      background: 'rgba(30, 30, 38, 0.85)',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
    } satisfies Partial<CSSStyleDeclaration>);
    applyWidgetRoot(this._root, LAYOUT.PLAYER_TOP, LAYOUT.PLAYER_LEFT);

    this._stopBtn = this._makeStopButton();
    this._playPauseBtn = this._makePlayPauseButton();
    this._stepBtn = this._makeStepButton();
    this._slider = this._makeSlider(minSpeed, maxSpeed, initialSpeed);
    this._speedLabel = this._makeSpeedLabel();

    const spacer = document.createElement('span');
    Object.assign(spacer.style, {
      display: 'inline-block',
      width: '15px',
    } satisfies Partial<CSSStyleDeclaration>);

    this._root.appendChild(this._stopBtn);
    this._root.appendChild(spacer);
    this._root.appendChild(this._playPauseBtn);
    this._root.appendChild(this._slider);
    this._root.appendChild(this._speedLabel);
    this._root.appendChild(this._stepBtn);

    this._renderLabel();
    this._renderPlayPauseIcon();
    this._renderThumbColor();
    this._injectThumbStyles();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
  }

  setVisible(visible: boolean): void {
    this._root.style.display = visible ? 'flex' : 'none';
  }

  setPosition(top: number, left: number): void {
    applyWidgetRoot(this._root, top, left);
  }

  setSpeed(tps: number): void {
    if (Number(this._slider.value) !== tps) {
      this._slider.value = String(tps);
    }
    this._renderLabel();
  }

  setTick(tick: number): void {
    this._currentTick = tick;
    if (!this._isPlaying) this._renderLabel();
  }

  setPlaying(playing: boolean): void {
    if (this._isPlaying === playing) return;
    this._isPlaying = playing;
    this._renderPlayPauseIcon();
    this._renderThumbColor();
    this._renderLabel();
  }

  setLanguage(_lng: string): void {
    this._stopBtn.title = sceT('widgets.simulation.stop', { defaultValue: 'Stop' });
    this._playPauseBtn.title = this._playPauseTitle();
    this._stepBtn.title = sceT('widgets.simulation.step', { defaultValue: 'Step' });
    this._renderLabel();
  }

  dispose(): void {
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

  /** Test/debug accessor. */
  get stopButton(): HTMLButtonElement {
    return this._stopBtn;
  }

  /** Test/debug accessor. */
  get playPauseButton(): HTMLButtonElement {
    return this._playPauseBtn;
  }

  /** Test/debug accessor. */
  get stepButton(): HTMLButtonElement {
    return this._stepBtn;
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
    button.title = sceT('widgets.simulation.stop');
    button.appendChild(iconElement(stopIcon, 14));
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this._callbacks.onStopReset();
    });
    return button;
  }

  private _makePlayPauseButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    applyIconButtonBase(button);
    Object.assign(button.style, {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      color: '#e8e8ec',
    } satisfies Partial<CSSStyleDeclaration>);
    button.title = this._playPauseTitle();
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this._callbacks.onTogglePlay();
    });
    return button;
  }

  private _makeStepButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    applyIconButtonBase(button);
    Object.assign(button.style, {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      color: '#e8e8ec',
    } satisfies Partial<CSSStyleDeclaration>);
    button.title = sceT('widgets.simulation.step');
    button.appendChild(iconElement(stepIcon, 14));
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this._callbacks.onStep();
    });
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
      width: '120px',
      height: '6px',
      cursor: 'pointer',
      accentColor: '#ff7a3d',
    } satisfies Partial<CSSStyleDeclaration>);

    slider.addEventListener('input', () => {
      const tps = Number(slider.value);
      this._renderLabel();
      this._callbacks.onSpeedChange(tps);
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

  private _renderLabel(): void {
    if (this._isPlaying) {
      this._speedLabel.textContent = sceT('widgets.simulation.speed', {
        defaultValue: '{{tps}} TPS',
        tps: Number(this._slider.value),
      });
      return;
    }
    this._speedLabel.textContent = sceT('widgets.simulation.staticStep', {
      defaultValue: 'Step {{tick}}',
      tick: this._currentTick,
    });
  }

  private _renderPlayPauseIcon(): void {
    this._playPauseBtn.replaceChildren(
      iconElement(this._isPlaying ? pauseIcon : playIcon, 14),
    );
    this._playPauseBtn.title = this._playPauseTitle();
  }

  private _playPauseTitle(): string {
    return this._isPlaying
      ? sceT('widgets.simulation.pause')
      : sceT('widgets.simulation.play');
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
