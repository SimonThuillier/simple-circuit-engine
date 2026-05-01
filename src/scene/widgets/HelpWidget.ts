/**
 * Help Widget
 * @module scene/widgets/HelpWidget
 *
 * Single icon button that triggers a `helpRequested` engine event. Repositions
 * itself based on the current engine mode: right of the mode pill in edit mode,
 * right of the player strip in simulation mode. Always visible; only its
 * placement changes.
 */

import { sceT } from '../../i18n';
import { iconElement, questionMarkIcon } from './assets/icons';
import type { EngineMode } from '../shared/types';
import { applyIconButtonBase, applyWidgetRoot, LAYOUT } from './styles';

export class HelpWidget {
  private readonly _button: HTMLButtonElement;
  private readonly _onClick: () => void;

  constructor(initialMode: EngineMode, onClick: () => void) {
    this._onClick = onClick;

    this._button = document.createElement('button');
    this._button.type = 'button';
    applyIconButtonBase(this._button);
    Object.assign(this._button.style, {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
    } satisfies Partial<CSSStyleDeclaration>);
    this._button.title = sceT('widgets.help.title', { defaultValue: 'Help' });
    this._button.appendChild(iconElement(questionMarkIcon, 18));
    this._button.addEventListener('click', (e) => {
      e.stopPropagation();
      this._onClick();
    });

    this.setMode(initialMode);
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._button);
  }

  setMode(mode: EngineMode): void {
    if (mode === 'edit') {
      applyWidgetRoot(this._button, LAYOUT.HELP_TOP_EDIT, LAYOUT.HELP_LEFT_EDIT);
      return;
    }
    applyWidgetRoot(this._button, LAYOUT.HELP_TOP_SIM, LAYOUT.HELP_LEFT_SIM);
  }

  setVisible(visible: boolean): void {
    this._button.style.display = visible ? 'inline-flex' : 'none';
  }

  setLanguage(_lng: string): void {
    this._button.title = sceT('widgets.help.title', { defaultValue: 'Help' });
  }

  dispose(): void {
    this._button.remove();
  }

  /** Test/debug accessor. */
  get element(): HTMLButtonElement {
    return this._button;
  }
}
