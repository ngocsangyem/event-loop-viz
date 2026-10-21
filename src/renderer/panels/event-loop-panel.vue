<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReplayState } from '../../player/replay-state'
import { formatVirtualMs } from '../scene/timer-shelf-model'
import { cn } from '@/lib/utils'
import { LOOP_PHASE_KEY, loopPhaseOf } from './event-loop-phase'
import type { LoopPhase } from './event-loop-phase'
import PanelCard from './panel-card.vue'

const props = defineProps<{ state: ReplayState }>()
const { t } = useI18n()

const phase = computed(() => loopPhaseOf(props.state))
const clock = computed(() => formatVirtualMs(props.state.clockUs))

/** The ring: one Task, then every microtask, then around again. Arcs are half circles. */
const R = 52

/** Where the pointer rests for each phase, in degrees clockwise from the top. */
const PHASE_ANGLE: Record<LoopPhase, number> = { idle: 0, task: 90, microtasks: 270, halted: 0 }

/**
 * The pointer only ever turns clockwise, like the loop itself: going from microtasks back to
 * the next Task completes the circle instead of turning back.
 */
const pointerAngle = shallowRef(PHASE_ANGLE[phase.value])
watch(phase, (next) => {
  const current = ((pointerAngle.value % 360) + 360) % 360
  pointerAngle.value += (PHASE_ANGLE[next] - current + 360) % 360
})
/** Each half is drawn in its concept hue while the loop is in it: Task blue, Job magenta. */
const ARCS = [
  { id: 'task', label: 'panels.eventLoop.task', d: `M 60 ${60 - R} A ${R} ${R} 0 0 1 60 ${60 + R}`, on: 'stroke-task', dot: 'bg-task' },
  { id: 'microtasks', label: 'panels.eventLoop.microtasks', d: `M 60 ${60 + R} A ${R} ${R} 0 0 1 60 ${60 - R}`, on: 'stroke-job', dot: 'bg-job' },
] as const
</script>

<template>
  <PanelCard
    concept="loop"
    :title="t('panels.eventLoop.title')"
    :info="t('panels.eventLoop.info')"
  >
    <div class="flex items-center gap-4" data-testid="panel-event-loop" :data-phase="phase">
      <svg viewBox="0 0 120 120" class="size-28 shrink-0" aria-hidden="true">
        <path
          v-for="arc in ARCS"
          :key="arc.id"
          :d="arc.d"
          fill="none"
          stroke-width="8"
          :class="cn('transition-colors duration-(--motion-fast)', phase === arc.id ? arc.on : 'stroke-border')"
        />
        <!-- The pointer is the playhead of the loop, so it carries the accent: orange means now. -->
        <g class="loop-pointer" :style="{ transform: `rotate(${pointerAngle}deg)` }">
          <rect x="54" :y="60 - R - 6" width="12" height="12" class="fill-background stroke-brand" stroke-width="3" />
        </g>
        <rect x="56" y="56" width="8" height="8" :class="phase === 'idle' ? 'fill-brand' : 'fill-muted-foreground/40'" />
      </svg>
      <dl class="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-sm">
        <dt class="label-mono text-muted-foreground text-[11px]">{{ t('panels.eventLoop.phase') }}</dt>
        <dd class="text-foreground font-medium" data-testid="loop-phase">{{ t(LOOP_PHASE_KEY[phase]) }}</dd>
        <dt class="label-mono text-muted-foreground text-[11px]">{{ t('panels.eventLoop.clock') }}</dt>
        <dd class="font-mono tabular-nums" data-testid="loop-clock">{{ clock }}</dd>
        <dt class="label-mono text-muted-foreground text-[11px]">{{ t('panels.eventLoop.tick') }}</dt>
        <dd class="font-mono tabular-nums">{{ state.tick ?? '—' }}</dd>
      </dl>
    </div>
    <div class="label-mono text-muted-foreground mt-2 flex gap-3 text-[11px]" aria-hidden="true">
      <span v-for="arc in ARCS" :key="arc.id" class="flex items-center gap-1.5">
        <span :class="cn('size-2', phase === arc.id ? arc.dot : 'bg-border')" />
        {{ t(arc.label) }}
      </span>
    </div>
  </PanelCard>
</template>
