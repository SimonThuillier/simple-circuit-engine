/**
 * Tools Widget
 * @module scene/widgets/ToolsWidget
 *
 * Two stacked icon buttons (build / multi-select) shown only in edit mode.
 * Active state mirrors the engine's currently active tool.
 */

import { sceT } from '../../i18n';
import type { ToolType } from '../shared/types';
import {
  cubeTransparentIcon,
  iconElement,
  wrenchScrewdriverIcon,
} from './assets/icons';
import {
  applyIconButtonBase,
  applyWidgetRoot,
  LAYOUT,
  setIconButtonActive,
} from './styles';

export class ToolsWidget {
  private readonly _root: HTMLDivElement;
  private readonly _buildBtn: HTMLButtonElement;
  private readonly _multiSelectBtn: HTMLButtonElement;
  private readonly _onSelect: (tool: ToolType) => void;
  private _activeTool: ToolType | null;

  constructor(initialTool: ToolType | null, onSelect: (tool: ToolType) => void) {
    this._activeTool = initialTool;
    this._onSelect = onSelect;

    this._root = document.createElement('div');
    Object.assign(this._root.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    } satisfies Partial<CSSStyleDeclaration>);
    applyWidgetRoot(this._root, LAYOUT.TOOLS_TOP, LAYOUT.LEFT);

    this._buildBtn = this._makeButton('build', wrenchScrewdriverIcon);
    this._multiSelectBtn = this._makeButton('multiSelect', cubeTransparentIcon);

    this._root.appendChild(this._buildBtn);
    this._root.appendChild(this._multiSelectBtn);

    this._render();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
  }

  setVisible(visible: boolean): void {
    this._root.style.display = visible ? 'flex' : 'none';
  }

  setActiveTool(tool: ToolType | null): void {
    if (this._activeTool === tool) return;
    this._activeTool = tool;
    this._render();
  }

  setLanguage(_lng: string): void {
    this._render();
  }

  dispose(): void {
    this._root.remove();
  }

  /** Test/debug accessor. */
  get element(): HTMLDivElement {
    return this._root;
  }

  private _makeButton(tool: ToolType, svg: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.tool = tool;
    applyIconButtonBase(button);
    button.appendChild(iconElement(svg, 20));
    button.addEventListener('click', () => this._onSelect(tool));
    return button;
  }

  private _render(): void {
    setIconButtonActive(this._buildBtn, this._activeTool === 'build');
    setIconButtonActive(this._multiSelectBtn, this._activeTool === 'multiSelect');
    this._buildBtn.title = sceT('widgets.tools.build', { defaultValue: 'Build' });
    this._multiSelectBtn.title = sceT('widgets.tools.multiSelect', {
      defaultValue: 'Multi-select',
    });
  }
}
