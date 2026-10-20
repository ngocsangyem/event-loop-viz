<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '../player/player'
import type { TraceEvent } from '../trace/trace-event'
import { buildScrubberMarkers } from './scrubber-markers'

const props = defineProps<{ player: Player | null; events: readonly TraceEvent[] }>()
const position = defineModel<number>({ required: true })
/** Fired when the user moves the scrubber, so autoplay can hand over to them. */
const emit = defineEmits<{ scrub: [] }>()

const steps = computed(() => props.player?.stepPositions() ?? [])
const markers = computed(() => (props.player ? buildScrubberMarkers(props.player, props.events) : []))
const lastIndex = computed(() => Math.max(steps.value.length - 1, 0))
const index = computed(() => {
  const i = steps.value.findIndex((p) => p >= position.value)
  return i === -1 ? lastIndex.value : i
})

/** Marker offset in percent; a single-step Trace puts everything at the start. */
const percent = (i: number) => (lastIndex.value === 0 ? 0 : (i / lastIndex.value) * 100)

function seekIndex(i: number) {
  const target = steps.value[Math.min(Math.max(i, 0), lastIndex.value)]
  if (target === undefined) return
  emit('scrub')
  position.value = target
}

function onInput(event: Event) {
  seekIndex(Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="scrubber" data-testid="scrubber">
    <input
      type="range"
      aria-label="Timeline"
      min="0"
      :max="lastIndex"
      step="1"
      :value="index"
      :disabled="!player"
      @input="onInput"
    />
    <!-- Inset by half a slider thumb so markers line up with the thumb's travel. -->
    <div class="markers">
      <button
        v-for="m in markers"
        :key="m.seq"
        type="button"
        class="marker"
        :class="`marker-${m.family}`"
        :data-seq="m.seq"
        :data-family="m.family"
        :aria-label="`${m.family} at event ${m.seq}`"
        :style="{ left: `${percent(m.index)}%` }"
        @click="seekIndex(m.index)"
      />
    </div>
  </div>
</template>

<style scoped>
.scrubber {
  display: block;
  width: 100%;
}
.scrubber input[type='range'] {
  width: 100%;
  margin: 0;
}
.markers {
  position: relative;
  height: 14px;
  margin: 0 8px; /* half of the default thumb width */
}
.marker {
  position: absolute;
  top: 2px;
  width: 4px;
  height: 10px;
  padding: 0;
  border: 0;
  border-radius: 1px;
  transform: translateX(-50%);
  cursor: pointer;
}
.marker-task {
  background: #3b82f6;
}
.marker-job {
  background: #a855f7;
}
.marker-timer {
  background: #f59e0b;
}
.marker-console {
  background: #10b981;
}
.marker-error {
  background: #ef4444;
}
</style>
