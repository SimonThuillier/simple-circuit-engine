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
      if (options && typeof options.tick === 'number') {
        return `Step ${options.tick}`;
      }
      return options?.defaultValue ?? _key;
    },
  },
}));

describe('SimulationPlayerWidget', () => {
  let parent: HTMLDivElement;
  let callbacks: {
    onStopReset: ReturnType<typeof vi.fn>;
    onSpeedChange: ReturnType<typeof vi.fn>;
    onTogglePlay: ReturnType<typeof vi.fn>;
    onStep: ReturnType<typeof vi.fn>;
  };
  let widget: SimulationPlayerWidget;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
    callbacks = {
      onStopReset: vi.fn(),
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
  });

  it('initialises slider with the given speed', () => {
    expect(widget.sliderElement.value).toBe('5');
    expect(widget.sliderElement.min).toBe('1');
    expect(widget.sliderElement.max).toBe('20');
  });

  it('renders the current tick in the label while paused', () => {
    expect(widget.element.textContent).toContain('Step 0');
  });

  it('renders the speed in the label while playing', () => {
    widget.setPlaying(true);
    expect(widget.element.textContent).toContain('5 TPS');
  });

  it('updates the tick label as steps occur while paused', () => {
    widget.setTick(7);
    expect(widget.element.textContent).toContain('Step 7');
  });

  it('does not show the tick label while playing', () => {
    widget.setPlaying(true);
    widget.setTick(7);
    expect(widget.element.textContent).not.toContain('Step 7');
    expect(widget.element.textContent).toContain('5 TPS');
  });

  it('reverts to the tick label when paused', () => {
    widget.setPlaying(true);
    widget.setTick(3);
    widget.setPlaying(false);
    expect(widget.element.textContent).toContain('Step 3');
  });

  it('lays out stop, play/pause and step buttons in order', () => {
    const buttons = Array.from(widget.element.querySelectorAll('button'));
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toBe(widget.stopButton);
    expect(buttons[1]).toBe(widget.playPauseButton);
    expect(buttons[2]).toBe(widget.stepButton);
  });

  it('fires onStopReset when the stop button is clicked', () => {
    widget.stopButton.click();
    expect(callbacks.onStopReset).toHaveBeenCalledTimes(1);
  });

  it('fires onTogglePlay when the play/pause button is clicked', () => {
    widget.playPauseButton.click();
    expect(callbacks.onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('fires onStep when the step button is clicked', () => {
    widget.stepButton.click();
    expect(callbacks.onStep).toHaveBeenCalledTimes(1);
  });

  it('fires onSpeedChange on slider input and reflects new speed in playing label', () => {
    widget.setPlaying(true);
    widget.sliderElement.value = '10';
    widget.sliderElement.dispatchEvent(new Event('input'));
    expect(callbacks.onSpeedChange).toHaveBeenCalledWith(10);
    expect(widget.element.textContent).toContain('10 TPS');
  });

  it('does not step when the slider is clicked', () => {
    widget.sliderElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(callbacks.onStep).not.toHaveBeenCalled();
    expect(callbacks.onTogglePlay).not.toHaveBeenCalled();
  });

  it('shows the play icon while paused and the pause icon while playing', () => {
    const paused = widget.playPauseButton.innerHTML;
    expect(paused).toContain('<svg');
    widget.setPlaying(true);
    const playing = widget.playPauseButton.innerHTML;
    expect(playing).toContain('<svg');
    expect(playing).not.toBe(paused);
  });

  it('updates slider from setSpeed', () => {
    widget.setPlaying(true);
    widget.setSpeed(12);
    expect(widget.sliderElement.value).toBe('12');
    expect(widget.element.textContent).toContain('12 TPS');
  });
});
