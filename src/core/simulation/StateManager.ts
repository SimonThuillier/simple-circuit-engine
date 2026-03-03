/**
 * Manages simulation state and optional history tracking
 * @module core/simulation
 */

import { SimulationState } from './states/SimulationState';

/**
 * Manages current simulation state and historical state storage.
 * Uses a circular buffer for efficient memory-bounded history.
 *
 * @public
 */
export class StateManager {
  private currentState: SimulationState;
  private history: SimulationState[];
  private readonly historyEnabled: boolean;
  private readonly historyLimit: number;
  private historyWriteIndex: number;

  /**
   * Create a new state controllerType.
   *
   * @param enableHistory - Whether to store state history (default: false)
   * @param historyLimit - Maximum number of historical states to keep (default: 1000)
   */
  constructor(enableHistory: boolean = false, historyLimit: number = 1000) {
    if (historyLimit < 1) {
      throw new RangeError(`historyLimit must be at least 1 (got ${historyLimit})`);
    }

    this.historyEnabled = enableHistory;
    this.historyLimit = historyLimit;
    this.currentState = new SimulationState(0);
    this.history = [];
    this.historyWriteIndex = 0;
  }

  /**
   * Get the current simulation state.
   *
   * @returns Current state (mutable for simulation controller use)
   */
  getCurrentState(): SimulationState {
    return this.currentState;
  }

  /**
   * Get current tick number.
   *
   * @returns Current simulation tick
   */
  getCurrentTick(): number {
    return this.currentState.tick;
  }

  /**
   * Advance to next tick, optionally saving current state to history.
   * Creates a new SimulationState for the next tick.
   *
   * @returns New current state for the next tick
   */
  advanceToNextTick(): SimulationState {
    const nextTick = this.currentState.tick + 1;

    // Save current state to history if enabled
    if (this.historyEnabled) {
      this.saveToHistory(this.currentState.clone());
    }

    // update current state to new tick
    this.currentState.tick = nextTick;

    return this.currentState;
  }

  /**
   * Get a historical state by tick number.
   * Only works if history is enabled.
   *
   * @param tick - Tick number to retrieve
   * @returns State at that tick, or undefined if not available
   */
  getStateAtTick(tick: number): SimulationState | undefined {
    if (!this.historyEnabled) {
      return undefined;
    }

    return this.history.find((state) => state.tick === tick);
  }

  /**
   * Get all available historical states.
   * Returns empty array if history is disabled.
   *
   * @returns Array of historical states, sorted by tick (oldest first)
   */
  getHistory(): ReadonlyArray<SimulationState> {
    if (!this.historyEnabled) {
      return [];
    }

    // Return sorted copy
    return [...this.history].sort((a, b) => a.tick - b.tick);
  }

  /**
   * Get the oldest tick number available in history.
   *
   * @returns Oldest tick number, or undefined if no history
   */
  getOldestTick(): number | undefined {
    if (!this.historyEnabled || this.history.length === 0) {
      return undefined;
    }

    return Math.min(...this.history.map((state) => state.tick));
  }

  /**
   * Get the newest tick number in history (not including current tick).
   *
   * @returns Newest historical tick, or undefined if no history
   */
  getNewestHistoricalTick(): number | undefined {
    if (!this.historyEnabled || this.history.length === 0) {
      return undefined;
    }

    return Math.max(...this.history.map((state) => state.tick));
  }

  /**
   * Clear all history.
   */
  clearHistory(): void {
    this.history = [];
    this.historyWriteIndex = 0;
  }

  /**
   * Reset to tick 0, clearing current state and all history.
   */
  reset(): void {
    this.currentState = new SimulationState(0);
    this.clearHistory();
  }

  /**
   * Check if history tracking is enabled.
   *
   * @returns True if history is enabled
   */
  isHistoryEnabled(): boolean {
    return this.historyEnabled;
  }

  /**
   * Get the configured history limit.
   *
   * @returns Maximum number of historical states
   */
  getHistoryLimit(): number {
    return this.historyLimit;
  }

  /**
   * Get current history size.
   *
   * @returns Number of states in history
   */
  getHistorySize(): number {
    return this.history.length;
  }

  /**
   * Save a state to history using circular buffer.
   * Private helper for advanceToNextTick.
   *
   * @param state - State to save
   */
  private saveToHistory(state: SimulationState): void {
    if (this.history.length < this.historyLimit) {
      // History not yet full, just append
      this.history.push(state);
    } else {
      // Circular buffer: overwrite oldest entry
      this.history[this.historyWriteIndex] = state;
      this.historyWriteIndex = (this.historyWriteIndex + 1) % this.historyLimit;
    }
  }
}
