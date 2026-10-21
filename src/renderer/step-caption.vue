<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { explainEvent, phrasesFor } from '../player/explain-event'
import type { ExplainLocale } from '../player/explain-event'
import type { ReplayState } from '../player/replay-state'
import type { TraceEvent } from '../trace/trace-event'
import { cn } from '@/lib/utils'
import { loopPhaseOf } from './panels/event-loop-phase'
import { formatVirtualMs } from './scene/timer-shelf-model'
import { stepProgressOf } from './step-progress'

/**
 * The first thing a step says (DESIGN.md · Focal hierarchy): a mono meta row (step, Tick,
 * line, Virtual Clock), one sentence naming the change, and the phase strip of this turn of
 * the loop with the current phase in its concept hue. The screen-reader announcement lives in
 * StepAnnouncer, so this block is not a live region of its own.
 */
const props = defineProps<{
  events: readonly TraceEvent[]
  position: number
  state: ReplayState
  running: boolean
}>()
const { t, locale } = useI18n()

const event = computed(() => props.events[props.position])
/** `task-2` reads as `#2` after the word Task. */
const taskNumber = (id: string) => `#${id.replace(/^task-/, '')}`
const sentence = computed(() =>
  event.value ? explainEvent(event.value, props.events, phrasesFor(locale.value as ExplainLocale)).text : '',
)

const meta = computed(() => {
  const { step, total } = stepProgressOf(props.events, props.position)
  const s = props.state
  return [
    t('caption.step', { step, total }),
    s.tick !== null ? t('caption.tick', { tick: s.tick }) : null,
    s.sourceRange ? t('caption.line', { line: s.sourceRange.line }) : null,
    t('caption.clock', { clock: formatVirtualMs(s.clockUs) }),
  ].filter((part): part is string => part !== null)
})

interface PhaseSegment {
  id: string
  text: string
  /** Concept classes when this segment is the phase the loop is in now. */
  on: string
  current: boolean
  done?: boolean
}

/** One turn of the loop: the Task, the Checkpoint after it, then what comes next. */
const phases = computed((): PhaseSegment[] => {
  const s = props.state
  const phase = loopPhaseOf(s)
  if (phase === 'halted' && s.halted) {
    return [{ id: 'halt', text: t('caption.halt', { reason: s.halted.reason }), on: 'text-brand-text', current: true }]
  }
  const head = s.tasks[0]
  return [
    {
      id: 'task',
      text: s.currentTask ? t('caption.taskId', { id: taskNumber(s.currentTask) }) : t('caption.task'),
      on: 'bg-task-soft text-task',
      current: phase === 'task',
      done: phase === 'microtasks',
    },
    {
      id: 'microtasks',
      text: s.jobs.length > 0
        ? `${t('caption.checkpoint')} · ${t('caption.jobsQueued', { count: s.jobs.length })}`
        : t('caption.checkpoint'),
      on: 'bg-job-soft text-job',
      current: phase === 'microtasks',
    },
    {
      id: 'next',
      text: head ? t('caption.next', { what: t('caption.taskId', { id: taskNumber(head.taskId) }) }) : t('caption.nothingNext'),
      on: 'bg-task-soft text-task',
      current: phase === 'idle',
    },
  ]
})
</script>

<template>
  <section :aria-label="t('caption.region')" class="flex min-w-0 flex-col gap-2 px-4 py-3" data-testid="step-caption">
    <template v-if="event">
      <p class="meta-mono flex flex-wrap gap-x-2 uppercase">
        <template v-for="(part, i) in meta" :key="i">
          <span v-if="i > 0" aria-hidden="true">·</span>
          <span>{{ part }}</span>
        </template>
      </p>
      <p class="text-foreground text-xl leading-7 font-medium">{{ sentence }}</p>
      <ol :aria-label="t('caption.phases')" class="label-mono flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px]">
        <template v-for="(segment, i) in phases" :key="segment.id">
          <li v-if="i > 0" aria-hidden="true" class="text-muted-foreground">→</li>
          <li
            :aria-current="segment.current ? 'step' : undefined"
            :class="cn('px-1.5 py-0.5', segment.current ? segment.on : 'text-muted-foreground')"
          >
            {{ segment.text }}<span v-if="segment.done" aria-hidden="true"> ✓</span>
          </li>
        </template>
      </ol>
    </template>
    <template v-else>
      <p class="label-mono text-muted-foreground">{{ running ? t('caption.running') : t('caption.ready') }}</p>
      <p class="text-foreground text-xl leading-7 font-medium lowercase">{{ t('caption.readyText') }}</p>
    </template>
  </section>
</template>
