/**
 * Main entry point for the CircuitEngine demo (dev mode)
 * Uses ES modules directly with Vite HMR support
 */
import { AxesHelper, WebGLRenderer } from 'three';

import {
  Circuit,
  BehaviorRegistry,
  registerBasicComponentsBehaviors,
  registerGatesComponentsBehaviors
} from 'simple-circuit-engine/core';
import {
  CircuitEngine,
  GroupedFactoryRegistry,
  DefaultVisualFactory,
  registerBasicComponentsFactories,
  registerGatesComponentsFactories,
} from 'simple-circuit-engine/scene';

// Create component factory registry with all visual factories
const componentsFactoryRegistry = new GroupedFactoryRegistry(new DefaultVisualFactory());
registerBasicComponentsFactories(componentsFactoryRegistry);
registerGatesComponentsFactories(componentsFactoryRegistry);

// Create behavior registry with all basic component behaviors
const behaviorRegistry = new BehaviorRegistry();
registerBasicComponentsBehaviors(behaviorRegistry);
registerGatesComponentsBehaviors(behaviorRegistry);

// Create WebGL renderer
const renderer = new WebGLRenderer({ antialias: true, alpha: false });
renderer.setClearColor(0x1a1a2e);

// Create axes helper for reference
const axesHelper = new AxesHelper(5);

// Initialize CircuitEngine
const container = document.getElementById('canvas-container')!;
const engine = new CircuitEngine(componentsFactoryRegistry, behaviorRegistry);

const initialMode = 'edit';
engine.initialize(container, {
  initialMode: initialMode,
  controllerOptions: {
    mapControls: { zoomSpeed: 2 },
    simulationAutoPlay: true,
    simulationSpeed: 3,
  },
});

// Add axes helper
engine.getScene().add(axesHelper);

// Setup WebGL renderer
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  engine.getControls().update();
  renderer.render(engine.getScene(), engine.getCamera());
}
animate();

// Handle window resize
function handleResize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  renderer.setSize(width, height);
  engine.onContainerResize(width, height);
}
window.addEventListener('resize', handleResize);

// UI State
let currentMode: 'edit' | 'simulation' = 'edit';

// UI Helper functions
function showError(message: string) {
  const errorDisplay = document.getElementById('error-display')!;
  const errorMessage = document.getElementById('error-message')!;
  errorMessage.textContent = message;
  errorDisplay.classList.add('visible');
}

function hideError() {
  document.getElementById('error-display')!.classList.remove('visible');
}

function updateModeUI(mode: 'edit' | 'simulation') {
  currentMode = mode;

  // Update mode buttons
  document.getElementById('mode-edit')!.classList.toggle('active', mode === 'edit');
  document.getElementById('mode-simulation')!.classList.toggle('active', mode === 'simulation');

  // Update mode indicator
  const indicator = document.getElementById('mode-indicator')!;
  indicator.className = 'mode-indicator ' + mode;
  indicator.textContent = mode === 'edit' ? 'EDIT MODE' : 'SIMULATION MODE';

  // Update status
  document.getElementById('status-mode')!.textContent = mode === 'edit' ? 'Edit' : 'Simulation';

  // Enable/disable sections
  const editSection = document.getElementById('edit-section')!;
  const simSection = document.getElementById('sim-section')!;

  if (mode === 'edit') {
    editSection.style.opacity = '1';
    editSection.style.pointerEvents = 'auto';
    simSection.style.opacity = '0.5';

    // Disable sim buttons
    (document.getElementById('play-pause-btn') as HTMLButtonElement).disabled = true;
    (document.getElementById('step-btn') as HTMLButtonElement).disabled = true;
    (document.getElementById('stop-btn') as HTMLButtonElement).disabled = true;
  } else {
    editSection.style.opacity = '0.5';
    editSection.style.pointerEvents = 'none';
    simSection.style.opacity = '1';

    // Enable sim buttons if circuit is loaded
    const hasCircuit = engine.getCircuit() !== null;
    (document.getElementById('play-pause-btn') as HTMLButtonElement).disabled = !hasCircuit;
    (document.getElementById('step-btn') as HTMLButtonElement).disabled = !hasCircuit;
    (document.getElementById('stop-btn') as HTMLButtonElement).disabled = !hasCircuit;
  }
}

function updatePlayPauseButton() {
  const btn = document.getElementById('play-pause-btn')!;
  if (engine.isPlaying) {
    btn.textContent = 'Pause';
    btn.classList.add('playing');
  } else {
    btn.textContent = 'Play';
    btn.classList.remove('playing');
  }
}

// Event handlers

// Mode toggle
document.getElementById('mode-edit')!.addEventListener('click', () => {
  if (currentMode !== 'edit') {
    engine.setMode('edit');
  }
});

document.getElementById('mode-simulation')!.addEventListener('click', () => {
  if (currentMode !== 'simulation') {
    try {
      engine.setMode('simulation');
    } catch (error) {
      showError('Cannot switch to simulation: ' + (error as Error).message);
    }
  }
});

// JSON operations
document.getElementById('load-btn')!.addEventListener('click', () => {
  const json = (document.getElementById('circuit-input') as HTMLTextAreaElement).value;
  if (!json.trim()) {
    showError('Please enter circuit JSON');
    return;
  }

  try {
    const circuitData = JSON.parse(json);
    const circuit = Circuit.fromJSON(circuitData);
    engine.setCircuit(circuit);
    hideError();

    // Update status
    document.getElementById('status-circuit')!.textContent = circuitData.metadata?.name || 'Loaded';

    // Enable sim buttons if in simulation mode
    if (currentMode === 'simulation') {
      (document.getElementById('play-pause-btn') as HTMLButtonElement).disabled = false;
      (document.getElementById('step-btn') as HTMLButtonElement).disabled = false;
      (document.getElementById('stop-btn') as HTMLButtonElement).disabled = false;
    }
  } catch (error) {
    showError('Load error: ' + (error as Error).message);
  }
});

document.getElementById('serialize-btn')!.addEventListener('click', () => {
  const circuit = engine.getCircuit();
  if (!circuit) {
    showError('No circuit loaded');
    return;
  }

  try {
    engine.beforeExport();
    const circuitJSON = circuit.toJSON();
    const formatted = JSON.stringify(circuitJSON, null, 2);
    (document.getElementById('circuit-input') as HTMLTextAreaElement).value = formatted;
    hideError();
  } catch (error) {
    showError('Export error: ' + (error as Error).message);
  }
});

document.getElementById('clear-btn')!.addEventListener('click', () => {
  engine.setCircuit(new Circuit());
  (document.getElementById('circuit-input') as HTMLTextAreaElement).value = '';
  document.getElementById('status-circuit')!.textContent = 'Not loaded';
  document.getElementById('tick-count')!.textContent = '0';
  hideError();
});

document.getElementById('close-error')!.addEventListener('click', hideError);

// Edit tools
function deactivateAllTools() {
  document.querySelectorAll('.tool-btn').forEach((btn) => btn.classList.remove('active'));
}

document.getElementById('tool-build')!.addEventListener('click', () => {
  if (currentMode !== 'edit') return;

  const isActive = document.getElementById('tool-build')!.classList.contains('active');
  deactivateAllTools();

  if (!isActive) {
    engine.setEditModeEnabled(true);
    engine.setActiveTool('build');
    document.getElementById('tool-build')!.classList.add('active');
    document.getElementById('status-tool')!.textContent = 'Build';
  } else {
    document.getElementById('status-tool')!.textContent = 'None';
  }
});

document.getElementById('tool-multi-select')!.addEventListener('click', () => {
  if (currentMode !== 'edit') return;

  const isActive = document.getElementById('tool-multi-select')!.classList.contains('active');
  deactivateAllTools();

  if (!isActive) {
    engine.setEditModeEnabled(true);
    engine.setActiveTool('multiSelect');
    document.getElementById('tool-multi-select')!.classList.add('active');
    document.getElementById('status-tool')!.textContent = 'Multi-Select';
  } else {
    document.getElementById('status-tool')!.textContent = 'None';
  }
});

// Add Component Tool is now integrated into BuildTool via double-click on empty space

// Simulation controls
document.getElementById('play-pause-btn')!.addEventListener('click', () => {
  if (currentMode !== 'simulation') return;

  if (engine.isPlaying) {
    engine.pause();
  } else {
    engine.play();
  }
  updatePlayPauseButton();
});

document.getElementById('step-btn')!.addEventListener('click', () => {
  if (currentMode !== 'simulation') return;
  engine.step();
});

document.getElementById('stop-btn')!.addEventListener('click', () => {
  if (currentMode !== 'simulation') return;
  engine.stop();
  document.getElementById('tick-count')!.textContent = '0';
  updatePlayPauseButton();
});

// Section collapse toggles
document.querySelectorAll('.section-header').forEach((header) => {
  header.addEventListener('click', () => {
    header.parentElement!.classList.toggle('collapsed');
  });
});

// Engine event listeners
engine.on('ready', () => {
  console.log('CircuitEngine ready');
});

engine.on('modeChanged', ({ mode }) => {
  console.log(`Mode changed to: ${mode}`);
  updateModeUI(mode);
});

engine.on('circuitLoaded', ({ name }) => {
  console.log('Circuit loaded:', name);
  document.getElementById('status-circuit')!.textContent = name || 'Loaded';
});

engine.on('toolActivated', ({ toolType }) => {
  console.log('Tool activated:', toolType);
  document.getElementById('status-tool')!.textContent = toolType || 'None';
});

engine.on('toolValidationError', ({ toolType, errorMessage }) => {
  console.error('Tool error:', toolType, errorMessage);
  document.getElementById('status-tool')!.textContent = toolType || 'None';
});

engine.on('toolDeactivated', () => {
  console.log('Tool deactivated');
  deactivateAllTools();
  document.getElementById('status-tool')!.textContent = 'None';
});

engine.on('simulationPlayed', () => {
  console.log('Simulation played');
  updatePlayPauseButton();
});

engine.on('simulationPaused', () => {
  console.log('Simulation paused');
  updatePlayPauseButton();
});

engine.on('simulationTick', ({ tick }) => {
  document.getElementById('tick-count')!.textContent = String(tick);
});

engine.on('simulationStepped', ({ tick }) => {
  document.getElementById('tick-count')!.textContent = String(tick);
});

engine.on('simulationStopped', ({ tick }) => {
  document.getElementById('tick-count')!.textContent = String(tick);
  updatePlayPauseButton();
});

const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedDisplay = document.getElementById('speed-display')!;

speedSlider.value = String(engine.simulationSpeed);
speedDisplay.textContent = String(engine.simulationSpeed);

// Update engine speed when slider changes
speedSlider.addEventListener('input', () => {
  const speed = parseInt(speedSlider.value, 10);
  engine.simulationSpeed = speed;
  speedDisplay.textContent = String(speed);
});

// Also listen for simulationSpeedChanged events to keep slider in sync
engine.on('simulationSpeedChanged', ({ newSpeed }) => {
  console.log('Simulation speed changed to:', newSpeed);
  speedSlider.value = String(newSpeed);
  speedDisplay.textContent = String(newSpeed);
});

// Initial UI state
updateModeUI(initialMode);

// Load the default circuit
document.getElementById('load-btn')!.click();

console.log('CircuitEngine Demo loaded (dev mode)');
