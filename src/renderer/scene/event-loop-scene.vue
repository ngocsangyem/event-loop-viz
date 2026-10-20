<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import './scene.css'
import IsoRaw from './iso-raw.vue'
import { baseArtSvg } from './scene-base-art'
import { SCENE_PARTS } from './scene-parts'
import { HEIGHT, WIDTH } from './scene-world'

/**
 * The isometric event-loop machine. Its only input is the ReplayState (Glossary: Scene is a
 * pure function of position). `previous` is the state one step earlier, reserved for
 * transitions: parts may compare it with `state`, but what they draw must settle to a
 * function of `state` alone.
 */
const props = defineProps<{ state: ReplayState; previous?: ReplayState | null }>()

const readout = computed(() =>
  SCENE_PARTS.map((part) => part.readout(props.state))
    .filter((text) => text !== null)
    .join(' · '),
)
const label = computed(() => {
  const frames = props.state.stack.map((frame) => frame.label)
  const stack = frames.length === 0 ? 'empty' : `${frames.join(', ')} (top last)`
  return `Event loop machine. Call stack: ${stack}. Console lines: ${props.state.console.length}.`
})
</script>

<template>
  <figure class="iso-figure" data-testid="scene">
    <div class="iso-plate">
      <div class="iso-plate-corners" aria-hidden="true">
        <span class="iso-plate-corner" data-corner="fig">Fig 1</span>
        <span class="iso-plate-corner" data-corner="title">Event loop</span>
        <span class="iso-plate-corner" data-corner="hint">Step through the Trace</span>
        <span class="iso-plate-corner" data-corner="readout" data-testid="scene-readout">
          {{ readout }}
        </span>
      </div>
      <svg
        class="iso-svg"
        :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        role="img"
        :aria-label="label"
        focusable="false"
      >
        <IsoRaw :svg="baseArtSvg" />
        <component
          :is="part.component"
          v-for="part in SCENE_PARTS"
          :key="part.id"
          :state="state"
          :previous="previous ?? null"
        />
      </svg>
    </div>
  </figure>
</template>
