# Vue Integration Example

This example shows how to integrate Simple Circuit Engine into a Vue application.

## Installation

```bash
npm install simple-circuit-engine
```

## Usage (Composition API)

```vue
<template>
  <div class="circuit-viewer">
    <div ref="containerRef" class="canvas-container" />
    <div class="controls">
      <div>Tick: {{ currentTick }}</div>
      <div class="button-group">
        <button @click="play" :disabled="isPlaying">Play</button>
        <button @click="pause" :disabled="!isPlaying">Pause</button>
        <button @click="step">Step</button>
        <button @click="reset">Reset</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { CircuitEngine } from 'simple-circuit-engine';

interface Props {
  circuit?: object;
  scenario?: object;
}

const props = defineProps<Props>();

const containerRef = ref<HTMLElement | null>(null);
const isPlaying = ref(false);
const currentTick = ref(0);

let engine: CircuitEngine | null = null;

onMounted(() => {
  if (!containerRef.value) return;

  engine = new CircuitEngine(containerRef.value);

  // Set up event listeners
  engine.on('tick', (state) => {
    currentTick.value = state.tick;
  });

  engine.on('play', () => {
    isPlaying.value = true;
  });

  engine.on('pause', () => {
    isPlaying.value = false;
  });

  engine.on('reset', () => {
    currentTick.value = 0;
  });

  // Load initial data
  if (props.circuit) {
    engine.loadCircuit(props.circuit);
  }
  if (props.scenario) {
    engine.loadScenario(props.scenario);
  }
});

onUnmounted(() => {
  engine?.dispose();
  engine = null;
});

// Watch for prop changes
watch(() => props.circuit, (newCircuit) => {
  if (newCircuit && engine) {
    engine.loadCircuit(newCircuit);
  }
});

watch(() => props.scenario, (newScenario) => {
  if (newScenario && engine) {
    engine.loadScenario(newScenario);
  }
});

// Control functions
function play() {
  engine?.play();
}

function pause() {
  engine?.pause();
}

function step() {
  engine?.step();
}

function reset() {
  engine?.reset();
}
</script>

<style scoped>
.circuit-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.canvas-container {
  flex: 1;
  background: #0a0a0a;
}

.controls {
  padding: 1rem;
  background: #2a2a2a;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>
```

## Composable

For more reusable code, create a composable:

```ts
// useCircuitEngine.ts
import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { CircuitEngine } from 'simple-circuit-engine';

export function useCircuitEngine(containerRef: Ref<HTMLElement | null>) {
  const isPlaying = ref(false);
  const currentTick = ref(0);
  let engine: CircuitEngine | null = null;

  onMounted(() => {
    if (!containerRef.value) return;

    engine = new CircuitEngine(containerRef.value);

    engine.on('tick', (state) => {
      currentTick.value = state.tick;
    });

    engine.on('play', () => {
      isPlaying.value = true;
    });

    engine.on('pause', () => {
      isPlaying.value = false;
    });

    engine.on('reset', () => {
      currentTick.value = 0;
    });
  });

  onUnmounted(() => {
    engine?.dispose();
    engine = null;
  });

  return {
    engine: () => engine,
    isPlaying,
    currentTick,
  };
}
```

## Notes

- Use `ref` for the container element
- Always dispose the engine in `onUnmounted`
- Watch props for dynamic circuit/scenario loading
- The engine is framework-agnostic - Vue just provides the container and reactivity
