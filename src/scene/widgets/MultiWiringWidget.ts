/**
 * Multi-Wiring Widget
 * @module scene/widgets/MultiWiringWidget
 *
 * Single toggle button (verr-maj style) that flips the engine's multi-wiring
 * flag. Visible only in edit mode.
 */

import { sceT } from '../../i18n';
import { barsArrowDownIcon, iconElement } from './assets/icons';
import {
  applyIconButtonBase,
  applyWidgetRoot,
  LAYOUT,
  setIconButtonActive,
} from './styles';

export class MultiWiringWidget {
  private readonly _button: HTMLButtonElement;
  private readonly _onToggle: () => void;
  private _active: boolean;

  constructor(initialActive: boolean, onToggle: () => void) {
    this._active = initialActive;
    this._onToggle = onToggle;

    this._button = document.createElement('button');
    this._button.type = 'button';
    applyIconButtonBase(this._button);
    applyWidgetRoot(this._button, LAYOUT.MULTI_WIRING_TOP, LAYOUT.LEFT);
    this._button.appendChild(iconElement(barsArrowDownIcon, 20));
    this._button.addEventListener('click', () => this._onToggle());

    this._render();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._button);
  }

  setVisible(visible: boolean): void {
    this._button.style.display = visible ? 'inline-flex' : 'none';
  }

  setActive(active: boolean): void {
    if (this._active === active) return;
    this._active = active;
    this._render();
  }

  setLanguage(_lng: string): void {
    this._render();
  }

  dispose(): void {
    this._button.remove();
  }

  /** Test/debug accessor. */
  get element(): HTMLButtonElement {
    return this._button;
  }

  private _render(): void {
    setIconButtonActive(this._button, this._active);
    this._button.title = sceT('widgets.multiWiring', { defaultValue: 'Multi-wiring' });
  }
}
