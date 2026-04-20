/**
 * Unit tests for MultiWiringWidget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MultiWiringWidget } from '../../../src/scene/widgets/MultiWiringWidget';

vi.mock('i18next', () => ({
  default: {
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  },
}));

describe('MultiWiringWidget', () => {
  let parent: HTMLDivElement;
  let onToggle: ReturnType<typeof vi.fn>;
  let widget: MultiWiringWidget;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
    onToggle = vi.fn();
    widget = new MultiWiringWidget(false, onToggle);
    widget.mount(parent);
  });

  afterEach(() => {
    widget.dispose();
    parent.remove();
  });

  it('renders an inactive button by default', () => {
    expect(widget.element.getAttribute('aria-pressed')).toBe('false');
  });

  it('reflects active state via setActive', () => {
    widget.setActive(true);
    expect(widget.element.getAttribute('aria-pressed')).toBe('true');
    widget.setActive(false);
    expect(widget.element.getAttribute('aria-pressed')).toBe('false');
  });

  it('invokes the toggle callback on click', () => {
    widget.element.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('uses the i18n default value for the title', () => {
    expect(widget.element.title).toBe('Multi-wiring');
  });
});
