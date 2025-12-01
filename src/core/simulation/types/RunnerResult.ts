export interface RunnerResult {
  startTick: number;

  endTick: number;

  componentUpdateCount: number;

  nodeUpdateCount: number;

  wireUpdateCount: number;

  processedCommandCount: number;

  scheduledEventCount: number;

  firedEventCount: number;
}
