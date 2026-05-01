/**
 * Unit tests for ModeWidget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModeWidget } from '../../../src/scene/widgets/ModeWidget';

vi.mock('i18next', () => ({
  default: {
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  },
}));

describe('ModeWidget', () => {
  let parent: HTMLDivElement;
  let onToggle: ReturnType<typeof vi.fn>;
  let widget: ModeWidget;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
    onToggle = vi.fn();
    widget = new ModeWidget('edit', onToggle);
    widget.mount(parent);
  });

  afterEach(() => {
    widget.dispose();
    parent.remove();
  });

  it('mounts a button into the parent', () => {
    expect(parent.querySelector('button')).toBe(widget.element);
  });

  it('renders edit label and green background by default', () => {
    expect(widget.element.textContent).toBe('Edition');
    expect(widget.element.style.background).toContain('76, 175, 80');
  });

  it('switches to simulation label and blue background after setMode', () => {
    widget.setMode('simulation');
    expect(widget.element.textContent).toBe('Simulation');
    expect(widget.element.style.background).toContain('33, 150, 243');
  });

  it('invokes the toggle callback on click', () => {
    widget.element.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('removes the button on dispose', () => {
    widget.dispose();
    expect(parent.querySelector('button')).toBeNull();
  });
});
