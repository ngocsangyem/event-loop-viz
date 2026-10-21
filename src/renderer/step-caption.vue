<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReplayState } from '../player/replay-state'
import type { TraceEvent } from '../trace/trace-event'
import { splitConceptIds } from './caption-sentence-parts'
import { formatVirtualMs } from './scene/timer-shelf-model'
import { stepProgressOf } from './step-progress'
import StepPhaseStrip from './step-phase-strip.vue'
import { useStepSentence } from './use-step-sentence'

/**
 * The first thing a step says (DESIGN.md · Focal hierarchy): a mono meta row (step, Tick,
 * line, Virtual Clock), one sentence naming the change, and the phase strip. The screen-reader
 * announcement lives in StepAnnouncer, so this block is not a live region of its own.
 */
const props = defineProps<{
  events: readonly TraceEvent[]
  position: number
  state: ReplayState
  running: boolean
}>()
const { t } = useI18n()

const event = computed(() => props.events[props.position])
const sentence = useStepSentence(() => props.events, () => props.position)
const parts = computed(() => splitConceptIds(sentence.value))
const HUE_CLASS = { task: 'text-task', job: 'text-job', webapi: 'text-webapi' } as const

/** `Step 15 / 31 · Tick 2`: the position, plus the Tick when a Job is running. */
const position = computed(() => {
  const { step, total } = stepProgressOf(props.events, props.position)
  const tick = props.state.tick
  const base = t('caption.step', { step, total })
  return tick === null ? base : `${base} · ${t('caption.tick', { tick })}`
})
const line = computed(() => (props.state.sourceRange ? t('caption.line', { line: props.state.sourceRange.line }) : null))
</script>

<template>
  <section :aria-label="t('caption.region')" class="border-border flex min-w-0 flex-col gap-3 border-b px-5 py-4" data-testid="step-caption">
    <template v-if="event">
      <p class="label-mono text-muted-foreground flex flex-wrap gap-x-4">
        <span class="text-muted-foreground">{{ position }}</span>
        <span v-if="line" class="text-brand-text">{{ line }}</span>
        <span class="ml-auto">
          {{ t('dock.clock') }} <span class="text-foreground normal-case">{{ formatVirtualMs(state.clockUs) }}</span>
        </span>
      </p>
      <p class="text-foreground min-h-14 text-xl leading-7 font-medium tracking-[-0.01em] text-pretty">
        <template v-for="(part, i) in parts" :key="i">
          <span v-if="part.hue" :class="[HUE_CLASS[part.hue], 'font-mono text-[0.92em] font-normal']">{{ part.text }}</span>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
      <StepPhaseStrip :state="state" />
    </template>
    <template v-else>
      <p class="label-mono text-muted-foreground">{{ running ? t('caption.running') : t('caption.ready') }}</p>
      <p class="text-foreground min-h-14 text-xl leading-7 font-medium tracking-[-0.01em] lowercase">{{ t('caption.readyText') }}</p>
    </template>
  </section>
</template>
