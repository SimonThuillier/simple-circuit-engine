/**
 * Shared inline-style helpers for the integrated widgets.
 *
 * Library convention is to avoid bundling a stylesheet — every widget styles
 * its DOM via `Object.assign(el.style, ...)`. These helpers centralise the
 * shared tokens (button base, active state, container) so the four widgets
 * stay visually consistent without an external CSS file.
 */

export const WIDGET_Z_INDEX = 1500;

/** Base background and border for square icon buttons (inactive state). */
export function applyIconButtonBase(button: HTMLButtonElement): void {
  Object.assign(button.style, {
    width: '36px',
    height: '36px',
    padding: '0',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '6px',
    background: 'rgba(40, 40, 50, 0.85)',
    color: '#e8e8ec',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.35)',
    transition: 'background 0.1s, transform 0.1s, box-shadow 0.1s',
    userSelect: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
}

/** Toggle the active visual variant on an icon button. */
export function setIconButtonActive(button: HTMLButtonElement, active: boolean): void {
  if (active) {
    button.style.background = 'rgba(33, 150, 243, 0.95)';
    button.style.borderColor = 'rgba(33, 150, 243, 1)';
    button.style.color = '#ffffff';
    button.setAttribute('aria-pressed', 'true');
  } else {
    button.style.background = 'rgba(40, 40, 50, 0.85)';
    button.style.borderColor = 'rgba(255, 255, 255, 0.18)';
    button.style.color = '#e8e8ec';
    button.setAttribute('aria-pressed', 'false');
  }
}

/** Position a widget root absolutely inside the engine container. */
export function applyWidgetRoot(el: HTMLElement, top: number, left: number): void {
  Object.assign(el.style, {
    position: 'absolute',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: String(WIDGET_Z_INDEX),
    pointerEvents: 'auto',
    fontFamily: 'sans-serif',
  } satisfies Partial<CSSStyleDeclaration>);
}

/** Vertical layout offsets (px) for the left-edge widget stack. */
export const LAYOUT = {
  GUTTER: 12,
  BUTTON: 36,
  MODE_TOP: 12,
  TOOLS_TOP: 60,
  MULTI_WIRING_TOP: 60,
  MULTI_WIRING_LEFT: 53,
  PLAYER_TOP: 8,
  PLAYER_LEFT: 170,
  PLAYER_RESPONSIVE_TOP: 60,
  PLAYER_RESPONSIVE_LEFT: 12,
  HELP_TOP_EDIT: 10,
  HELP_LEFT_EDIT: 100,
  HELP_TOP_SIM: 10,
  HELP_LEFT_SIM: 130,
  LEFT: 12,
} as const;
