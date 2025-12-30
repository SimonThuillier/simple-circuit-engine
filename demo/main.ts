import { CircuitEngine } from 'simple-circuit-engine';

/**
 * Demo application for Simple Circuit Engine
 */

// Get DOM elements
const container = document.getElementById('canvas-container');
const status = document.getElementById('status');
const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const btnStep = document.getElementById('btn-step');
const btnReset = document.getElementById('btn-reset');
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement | null;
const speedDisplay = document.getElementById('speed-display');

if (!container || !status || !btnPlay || !btnPause || !btnStep || !btnReset) {
  throw new Error('Required DOM elements not found');
}

// Create engine instance
const engine = new CircuitEngine(container);

// TODO: Load a sample circuit
// const circuit = await fetch('/samples/simple-and-gate.json').then(r => r.json());
// engine.loadCircuit(circuit);

// Set up event listeners
btnPlay.addEventListener('click', () => {
  engine.play();
  updateStatus('Playing...');
});

btnPause.addEventListener('click', () => {
  engine.pause();
  updateStatus('Paused');
});

btnStep.addEventListener('click', () => {
  engine.step();
  updateStatus('Stepped');
});

btnReset.addEventListener('click', () => {
  engine.reset();
  updateStatus('Reset');
});

// Speed slider control
if (speedSlider && speedDisplay) {
  // Initialize slider with engine's current speed
  speedSlider.value = String(engine.simulationSpeed);
  speedDisplay.textContent = String(engine.simulationSpeed);

  // Update engine speed when slider changes
  speedSlider.addEventListener('input', () => {
    const speed = parseInt(speedSlider.value, 10);
    engine.simulationSpeed = speed;
    speedDisplay.textContent = String(speed);
  });

  // Also listen for simulationSpeedChanged events to keep slider in sync
  engine.on('simulationSpeedChanged', (event: { newSpeed: number }) => {
    speedSlider.value = String(event.newSpeed);
    speedDisplay.textContent = String(event.newSpeed);
  });
}

// Listen to engine events
engine.on('tick', () => {
  // TODO: Update status with current tick
});

engine.on('error', (error) => {
  console.error('Engine error:', error);
  updateStatus(`Error: ${error}`);
});

function updateStatus(message: string): void {
  status.textContent = message;
}

// Initialize
updateStatus('Engine initialized. Load a circuit to begin.');

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  engine.dispose();
});
