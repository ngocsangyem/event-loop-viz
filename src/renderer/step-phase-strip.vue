<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReplayState } from '../player/replay-state'
import { cn } from '@/lib/utils'
import { loopPhaseOf } from './panels/event-loop-phase'

/**
 * The phase strip of this turn of the loop: the Task, the Checkpoint after it, what comes next.
 * The current phase takes its concept hue on the -soft fill with a 1px rule; a Halt takes the
 * accent. Every item carries the same padding so the strip does not shift as the phase moves.
 */
const props = defineProps<{ state: ReplayState }>()
const { t } = useI18n()

interface PhaseSegment {
  id: string
  text: string
  /** Concept classes when this segment is the phase the loop is in now. */
  on: string
  current: boolean
  done?: boolean
}

/** `task-2` reads as `#2` after the word Task. */
const taskNumber = (id: string) => `#${id.replace(/^task-/, '')}`

const phases = computed((): PhaseSegment[] => {
  const s = props.state
  const phase = loopPhaseOf(s)
  if (phase === 'halted' && s.halted) {
    return [{
      id: 'halt',
      text: t('caption.halt', { reason: s.halted.reason }),
      on: 'text-brand-text shadow-[inset_0_-1px_0_var(--brand)]',
      current: true,
    }]
  }
  const head = s.tasks[0]
  return [
    {
      id: 'task',
      text: s.currentTask ? t('caption.taskId', { id: taskNumber(s.currentTask) }) : t('caption.task'),
      on: 'bg-task-soft text-task shadow-[inset_0_-1px_0_var(--task)]',
      current: phase === 'task',
      done: phase === 'microtasks',
    },
    {
      id: 'microtasks',
      text: s.jobs.length > 0
        ? `${t('caption.checkpoint')} · ${t('caption.jobsQueued', { count: s.jobs.length })}`
        : t('caption.checkpoint'),
      on: 'bg-job-soft text-job shadow-[inset_0_-1px_0_var(--job)]',
      current: phase === 'microtasks',
    },
    {
      id: 'next',
      text: head ? t('caption.next', { what: t('caption.taskId', { id: taskNumber(head.taskId) }) }) : t('caption.nothingNext'),
      on: 'bg-task-soft text-task shadow-[inset_0_-1px_0_var(--task)]',
      current: phase === 'idle',
    },
  ]
})
</script>

<template>
  <ol :aria-label="t('caption.phases')" class="label-mono flex flex-wrap items-center gap-x-2.5 gap-y-1">
    <template v-for="(segment, i) in phases" :key="segment.id">
      <li v-if="i > 0" aria-hidden="true" class="text-(--color-ink-4)">→</li>
      <li
        :aria-current="segment.current ? 'step' : undefined"
        :class="cn('px-[7px] py-[5px]', segment.current ? segment.on : 'text-muted-foreground')"
      >
        {{ segment.text }}<span v-if="segment.done" aria-hidden="true"> ✓</span>
      </li>
    </template>
  </ol>
</template>
