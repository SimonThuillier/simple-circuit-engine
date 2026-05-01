/**
 * Unit tests for HelpWidget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HelpWidget } from '../../../src/scene/widgets/HelpWidget';

vi.mock('i18next', () => ({
  default: {
    t: (_key: string, options?: any) => options?.defaultValue ?? _key,
  },
}));

describe('HelpWidget', () => {
  let parent: HTMLDivElement;
  let onClick: ReturnType<typeof vi.fn>;
  let widget: HelpWidget;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
    onClick = vi.fn();
    widget = new HelpWidget('edit', onClick);
    widget.mount(parent);
  });

  afterEach(() => {
    widget.dispose();
    parent.remove();
  });

  it('mounts a single button with the help title', () => {
    expect(widget.element.tagName).toBe('BUTTON');
    expect(widget.element.title).toBe('Help');
    expect(parent.contains(widget.element)).toBe(true);
  });

  it('positions just right of the mode pill while in edit mode', () => {
    expect(widget.element.style.left).toBe('100px');
    expect(widget.element.style.top).toBe('10px');
  });

  it('repositions when switching to simulation', () => {
    widget.setMode('simulation');
    expect(widget.element.style.left).toBe('130px');
    expect(widget.element.style.top).toBe('10px');
  });

  it('invokes the callback on click', () => {
    widget.element.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('hides itself when setVisible(false)', () => {
    widget.setVisible(false);
    expect(widget.element.style.display).toBe('none');
    widget.setVisible(true);
    expect(widget.element.style.display).toBe('inline-flex');
  });

  it('removes its DOM on dispose', () => {
    widget.dispose();
    expect(parent.contains(widget.element)).toBe(false);
  });
});
