/**
 * Unit tests for SimulationPlayerWidget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimulationPlayerWidget } from '../../../src/scene/widgets/SimulationPlayerWidget';

vi.mock('i18next', () => ({
  default: {
    t: (_key: string, options?: any) => {
      if (options && typeof options.tps === 'number') {
        return `${options.tps} TPS`;
      }
      return options?.defaultValue ?? _key;
    },
  },
}));

describe('SimulationPlayerWidget', () => {
  let parent: HTMLDivElement;
  let callbacks: {
    onStop: ReturnType<typeof vi.fn>;
    onSpeedChange: ReturnType<typeof vi.fn>;
    onTogglePlay: ReturnType<typeof vi.fn>;
    onStep: ReturnType<typeof vi.fn>;
  };
  let widget: SimulationPlayerWidget;

  beforeEach(() => {
    vi.useFakeTimers();
    parent = document.createElement('div');
    document.body.appendChild(parent);
    callbacks = {
      onStop: vi.fn(),
      onSpeedChange: vi.fn(),
      onTogglePlay: vi.fn(),
      onStep: vi.fn(),
    };
    widget = new SimulationPlayerWidget(1, 20, 5, false, callbacks);
    widget.mount(parent);
  });

  afterEach(() => {
    widget.dispose();
    parent.remove();
    vi.useRealTimers();
  });

  it('initialises slider with the given speed', () => {
    expect(widget.sliderElement.value).toBe('5');
    expect(widget.sliderElement.min).toBe('1');
    expect(widget.sliderElement.max).toBe('20');
  });

  it('renders the current speed in the label', () => {
    expect(widget.element.textContent).toContain('5 TPS');
  });

  it('fires onStop when the stop button is clicked', () => {
    const stopBtn = widget.element.querySelector('button')!;
    stopBtn.click();
    expect(callbacks.onStop).toHaveBeenCalledTimes(1);
  });

  it('fires onSpeedChange and updates label on slider input', () => {
    widget.sliderElement.value = '10';
    widget.sliderElement.dispatchEvent(new Event('input'));
    expect(callbacks.onSpeedChange).toHaveBeenCalledWith(10);
    expect(widget.element.textContent).toContain('10 TPS');
  });

  it('fires onStep on a single click while paused (after debounce)', () => {
    widget.sliderElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(callbacks.onStep).not.toHaveBeenCalled();
    vi.advanceTimersByTime(260);
    expect(callbacks.onStep).toHaveBeenCalledTimes(1);
  });

  it('does NOT step on a single click while playing', () => {
    widget.setPlaying(true);
    widget.sliderElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(260);
    expect(callbacks.onStep).not.toHaveBeenCalled();
  });

  it('fires onTogglePlay on dblclick and cancels pending step', () => {
    widget.sliderElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    widget.sliderElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    vi.advanceTimersByTime(260);
    expect(callbacks.onTogglePlay).toHaveBeenCalledTimes(1);
    expect(callbacks.onStep).not.toHaveBeenCalled();
  });

  it('updates slider from setSpeed', () => {
    widget.setSpeed(12);
    expect(widget.sliderElement.value).toBe('12');
    expect(widget.element.textContent).toContain('12 TPS');
  });
});
