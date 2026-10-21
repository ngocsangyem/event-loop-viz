<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Player } from '../player/player'
import type { TraceEvent } from '../trace/trace-event'
import { buildScrubberMarkers } from './scrubber-markers'
import { Slider } from '@/components/ui/slider'

const props = defineProps<{ player: Player | null; events: readonly TraceEvent[] }>()
const { t } = useI18n()
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

/** Concept hues, the same as the panes: Task blue, Job magenta, timer cyan, console green, error red. */
const MARKER_COLOR: Record<string, string> = {
  task: 'bg-task',
  job: 'bg-job',
  timer: 'bg-webapi',
  console: 'bg-console',
  error: 'bg-error',
}

function onSlide(value: number[] | undefined) {
  if (value?.[0] !== undefined) seekIndex(value[0])
}
</script>

<template>
  <div class="scrubber w-full" data-testid="scrubber">
    <Slider
      class="py-2"
      thumb-alignment="overflow"
      :min="0"
      :max="lastIndex"
      :step="1"
      :model-value="[index]"
      :thumb-label="t('scrubber.timeline')"
      :thumb-value-text="t('scrubber.step', { step: index + 1, total: lastIndex + 1 })"
      :disabled="!player"
      @update:model-value="onSlide"
    />
    <!-- Full track width, like the thumb: with "overflow" alignment its centre travels end to end. -->
    <div class="relative h-3">
      <button
        v-for="m in markers"
        :key="m.seq"
        type="button"
        class="absolute top-0.5 h-2.5 w-0.5 -translate-x-1/2 cursor-pointer p-0 transition-transform duration-(--motion-fast) hover:scale-y-125"
        :class="MARKER_COLOR[m.family]"
        :data-seq="m.seq"
        :data-family="m.family"
        :aria-label="t('scrubber.marker', { family: m.family, seq: m.seq })"
        :style="{ left: `${percent(m.index)}%` }"
        @click="seekIndex(m.index)"
      />
    </div>
  </div>
</template>
