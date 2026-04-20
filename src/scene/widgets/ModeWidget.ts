/**
 * Mode Widget
 * @module scene/widgets/ModeWidget
 *
 * Pill-shaped button overlayed at the top-left corner of the scene area.
 * Toggles the engine between edit and simulation modes.
 */

import { sceT } from '../../i18n';
import type { EngineMode } from '../shared/types';
import { applyWidgetRoot, LAYOUT, WIDGET_Z_INDEX } from './styles';

export class ModeWidget {
  private readonly _button: HTMLButtonElement;
  private readonly _onToggle: () => void;
  private _mode: EngineMode;

  constructor(initialMode: EngineMode, onToggle: () => void) {
    this._mode = initialMode;
    this._onToggle = onToggle;

    this._button = document.createElement('button');
    this._button.type = 'button';
    Object.assign(this._button.style, {
      padding: '6px 14px',
      borderRadius: '4px',
      border: 'none',
      fontSize: '12px',
      fontWeight: '600',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      transition: 'transform 0.1s, box-shadow 0.1s, background 0.1s',
      color: '#ffffff',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.35)',
    } satisfies Partial<CSSStyleDeclaration>);
    applyWidgetRoot(this._button, LAYOUT.MODE_TOP, LAYOUT.LEFT);
    this._button.style.zIndex = String(WIDGET_Z_INDEX + 1);

    this._button.addEventListener('mouseenter', () => {
      this._button.style.transform = 'scale(1.05)';
      this._button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
    });
    this._button.addEventListener('mouseleave', () => {
      this._button.style.transform = '';
      this._button.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.35)';
    });
    this._button.addEventListener('mousedown', () => {
      this._button.style.transform = 'scale(0.97)';
    });
    this._button.addEventListener('mouseup', () => {
      this._button.style.transform = 'scale(1.05)';
    });

    this._button.addEventListener('pointerup', () => {
      //alert("pointerup");
    });

    this._button.addEventListener('click', () => this._onToggle());

    this._render();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._button);
  }

  setMode(mode: EngineMode): void {
    if (this._mode === mode) return;
    this._mode = mode;
    this._render();
  }

  setLanguage(_lng: string): void {
    this._render();
  }

  /** Always visible — kept for symmetry with other widgets. */
  setVisible(visible: boolean): void {
    this._button.style.display = visible ? 'inline-block' : 'none';
  }

  dispose(): void {
    this._button.remove();
  }

  /** Test/debug accessor. */
  get element(): HTMLButtonElement {
    return this._button;
  }

  private _render(): void {
    if (this._mode === 'edit') {
      this._button.style.background = 'rgba(76, 175, 80, 0.92)';
      this._button.textContent = sceT('widgets.mode.edit', { defaultValue: 'Edition' });
    } else {
      this._button.style.background = 'rgba(33, 150, 243, 0.92)';
      this._button.textContent = sceT('widgets.mode.simulation', { defaultValue: 'Simulation' });
    }
  }
}
