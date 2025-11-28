# React Integration Example

This example shows how to integrate Simple Circuit Engine into a React application.

## Installation

```bash
npm install simple-circuit-engine
```

## Usage

```tsx
import { useEffect, useRef, useState } from 'react';
import { CircuitEngine } from 'simple-circuit-engine';

function CircuitViewer({ circuit, scenario }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CircuitEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTick, setCurrentTick] = useState(0);

  // Initialize engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new CircuitEngine(containerRef.current);
    engineRef.current = engine;

    // Set up event listeners
    engine.on('tick', (state) => {
      setCurrentTick(state.tick);
    });

    engine.on('play', () => setIsPlaying(true));
    engine.on('pause', () => setIsPlaying(false));

    // Cleanup on unmount
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Load circuit when it changes
  useEffect(() => {
    if (!engineRef.current || !circuit) return;
    engineRef.current.loadCircuit(circuit);
  }, [circuit]);

  // Load scenario when it changes
  useEffect(() => {
    if (!engineRef.current || !scenario) return;
    engineRef.current.loadScenario(scenario);
  }, [scenario]);

  // Control functions
  const handlePlay = () => engineRef.current?.play();
  const handlePause = () => engineRef.current?.pause();
  const handleStep = () => engineRef.current?.step();
  const handleReset = () => {
    engineRef.current?.reset();
    setCurrentTick(0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        ref={containerRef}
        style={{ flex: 1, background: '#0a0a0a' }}
      />
      <div style={{ padding: '1rem', background: '#2a2a2a' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          Tick: {currentTick}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handlePlay} disabled={isPlaying}>
            Play
          </button>
          <button onClick={handlePause} disabled={!isPlaying}>
            Pause
          </button>
          <button onClick={handleStep}>Step</button>
          <button onClick={handleReset}>Reset</button>
        </div>
      </div>
    </div>
  );
}

export default CircuitViewer;
```

## Custom Hook

For more reusable code, create a custom hook:

```tsx
import { useEffect, useRef, useState } from 'react';
import { CircuitEngine } from 'simple-circuit-engine';

export function useCircuitEngine(containerRef: React.RefObject<HTMLElement>) {
  const engineRef = useRef<CircuitEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTick, setCurrentTick] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new CircuitEngine(containerRef.current);
    engineRef.current = engine;

    engine.on('tick', (state) => setCurrentTick(state.tick));
    engine.on('play', () => setIsPlaying(true));
    engine.on('pause', () => setIsPlaying(false));
    engine.on('reset', () => setCurrentTick(0));

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [containerRef]);

  return {
    engine: engineRef.current,
    isPlaying,
    currentTick,
  };
}
```

## Notes

- The engine manages its own rendering lifecycle - React just provides the container
- Always call `dispose()` when the component unmounts to prevent memory leaks
- The engine instance should be stable across renders (use `useRef`)
- Circuit and scenario data can be loaded dynamically via props
