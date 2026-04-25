/**
 * Pin Tooltip Widget
 * @module scene/widgets/PinTooltipWidget
 *
 * Shows a clickable HTML tooltip near the cursor when hovering a component pin in edit mode.
 * Content: "{pinLabel} ({componentName})" — clicking triggers a componentHelpRequested callback.
 */

import { ComponentType } from 'simple-circuit-engine/core';
import { sceT } from '../../i18n';
import type {ILogicPinMetadata} from "../../core/topology/types";

/**
 * Manages a transient HTML tooltip displayed when hovering a component pin.
 *
 * Lifecycle: created by CircuitController on init, disposed on deactivation/disposal.
 * Positioning: fixed, follows the raw client mouse coordinates.
 */
export class PinTooltipWidget {
  private _element: HTMLDivElement | null = null;
  private _currentComponentType: ComponentType | null = null;
  private _clickHandler: ((e: MouseEvent) => void) | null = null;
  private readonly _onHelpRequested: (componentType: ComponentType) => void;

  constructor(onHelpRequested: (componentType: ComponentType) => void) {
    this._onHelpRequested = onHelpRequested;
  }

  /**
   * Show tooltip at the given client coordinates for the specified pin.
   * If already showing for the same component type, only repositions.
   */
  show(pinLabel: string, componentType: ComponentType, logicMetadata: ILogicPinMetadata, clientX: number, clientY: number): void {
    if (this._element && this._currentComponentType === componentType) {
      this._position(clientX, clientY);
      return;
    }
    this.hide();
    this._currentComponentType = componentType;

    const componentName = sceT(`components.${componentType}.name`, { defaultValue: componentType });

    this._element = document.createElement('div');

    const interfaceText = !!logicMetadata ? `:${logicMetadata.interface}:${logicMetadata.index}`:'';


    this._element.textContent = `${pinLabel} (${componentName})${interfaceText}`;
    Object.assign(this._element.style, {
      position: 'fixed',
      zIndex: '2000',
      background: 'rgba(30, 30, 30, 0.92)',
      color: '#fff',
      padding: '4px 10px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'sans-serif',
      pointerEvents: 'auto',
      cursor: 'pointer',
      userSelect: 'none',
      boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
      whiteSpace: 'nowrap',
      border: '1px solid rgba(255,255,255,0.15)',
    });

    this._clickHandler = (e: MouseEvent) => {
      e.stopPropagation();
      if (this._currentComponentType !== null) {
        this._onHelpRequested(this._currentComponentType);
      }
    };
    this._element.addEventListener('click', this._clickHandler);

    document.body.appendChild(this._element);
    this._position(clientX, clientY);
  }

  /** Hide and remove the tooltip element */
  hide(): void {
    if (!this._element) return;
    if (this._clickHandler) {
      this._element.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    document.body.removeChild(this._element);
    this._element = null;
    this._currentComponentType = null;
  }

  /** Update cursor position without recreating the tooltip */
  updatePosition(clientX: number, clientY: number): void {
    if (this._element) {
      this._position(clientX, clientY);
    }
  }

  get isVisible(): boolean {
    return this._element !== null;
  }

  /**
   * Signal a language change — hides any open tooltip so the next hover
   * recreates it with updated translations.
   */
  setLanguage(_lng: string): void {
    this.hide();
  }

  dispose(): void {
    this.hide();
  }

  private _position(clientX: number, clientY: number): void {
    if (!this._element) return;
    const OFFSET_X = 12;
    const OFFSET_Y = -28;
    let left = clientX + OFFSET_X;
    let top = clientY + OFFSET_Y;

    const tooltipWidth = this._element.offsetWidth || 150;
    const tooltipHeight = this._element.offsetHeight || 28;
    const vw = window.innerWidth;

    if (left + tooltipWidth > vw - 8) left = vw - tooltipWidth - 8;
    if (left < 8) left = 8;
    if (top < 8) top = clientY + tooltipHeight + 4;

    this._element.style.left = `${left}px`;
    this._element.style.top = `${top}px`;
  }
}
