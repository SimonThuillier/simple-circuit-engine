/**
 * Unit tests for ToolsWidget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolsWidget } from '../../../src/scene/widgets/ToolsWidget';

vi.mock('i18next', () => ({
  default: {
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  },
}));

describe('ToolsWidget', () => {
  let parent: HTMLDivElement;
  let onSelect: ReturnType<typeof vi.fn>;
  let widget: ToolsWidget;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
    onSelect = vi.fn();
    widget = new ToolsWidget(null, onSelect);
    widget.mount(parent);
  });

  afterEach(() => {
    widget.dispose();
    parent.remove();
  });

  it('renders two buttons (build + multiSelect)', () => {
    const buttons = widget.element.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].dataset.tool).toBe('build');
    expect(buttons[1].dataset.tool).toBe('multiSelect');
  });

  it('marks the active tool with aria-pressed=true', () => {
    widget.setActiveTool('build');
    const buttons = widget.element.querySelectorAll('button');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');

    widget.setActiveTool('multiSelect');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('invokes onSelect with the clicked tool', () => {
    const buttons = widget.element.querySelectorAll('button');
    (buttons[0] as HTMLButtonElement).click();
    expect(onSelect).toHaveBeenLastCalledWith('build');
    (buttons[1] as HTMLButtonElement).click();
    expect(onSelect).toHaveBeenLastCalledWith('multiSelect');
  });

  it('hides itself with setVisible(false)', () => {
    widget.setVisible(false);
    expect(widget.element.style.display).toBe('none');
    widget.setVisible(true);
    expect(widget.element.style.display).toBe('flex');
  });

  it('uses i18n default values for titles', () => {
    const buttons = widget.element.querySelectorAll('button');
    expect(buttons[0].title).toBe('Build');
    expect(buttons[1].title).toBe('Multi-select');
  });
});
