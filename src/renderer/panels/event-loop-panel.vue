<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import { formatVirtualMs } from '../scene/timer-shelf-model'
import { cn } from '@/lib/utils'
import { LOOP_PHASE_TEXT, loopPhaseOf } from './event-loop-phase'
import type { LoopPhase } from './event-loop-phase'
import PanelCard from './panel-card.vue'

const props = defineProps<{ state: ReplayState }>()

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
const pointerAngle = ref(PHASE_ANGLE[phase.value])
watch(phase, (next) => {
  const current = ((pointerAngle.value % 360) + 360) % 360
  pointerAngle.value += (PHASE_ANGLE[next] - current + 360) % 360
})
const ARCS = [
  { id: 'task', label: 'Task', d: `M 60 ${60 - R} A ${R} ${R} 0 0 1 60 ${60 + R}` },
  { id: 'microtasks', label: 'Microtasks', d: `M 60 ${60 + R} A ${R} ${R} 0 0 1 60 ${60 - R}` },
] as const
</script>

<template>
  <PanelCard
    title="Event Loop"
    info="Each turn runs the oldest Task to completion, then drains the microtask queue, then waits for the next Task."
  >
    <div class="flex items-center gap-4" data-testid="panel-event-loop" :data-phase="phase">
      <svg viewBox="0 0 120 120" class="size-28 shrink-0" aria-hidden="true">
        <path
          v-for="arc in ARCS"
          :key="arc.id"
          :d="arc.d"
          fill="none"
          stroke-width="10"
          stroke-linecap="round"
          :class="cn('transition-colors', phase === arc.id ? 'stroke-primary' : 'stroke-muted')"
        />
        <g class="loop-pointer" :style="{ transform: `rotate(${pointerAngle}deg)` }">
          <circle cx="60" :cy="60 - R" r="7" class="fill-background stroke-primary" stroke-width="3" />
        </g>
        <circle cx="60" cy="60" r="4" :class="phase === 'idle' ? 'fill-primary' : 'fill-muted-foreground/40'" />
      </svg>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt class="text-muted-foreground">Phase</dt>
        <dd class="text-foreground font-medium" data-testid="loop-phase">{{ LOOP_PHASE_TEXT[phase] }}</dd>
        <dt class="text-muted-foreground">Clock</dt>
        <dd class="font-mono tabular-nums" data-testid="loop-clock">{{ clock }}</dd>
        <dt class="text-muted-foreground">Tick</dt>
        <dd class="font-mono tabular-nums">{{ state.tick ?? '—' }}</dd>
      </dl>
    </div>
    <div class="text-muted-foreground mt-2 flex gap-3 text-[11px]" aria-hidden="true">
      <span v-for="arc in ARCS" :key="arc.id" class="flex items-center gap-1">
        <span :class="cn('size-2 rounded-full', phase === arc.id ? 'bg-primary' : 'bg-muted')" />
        {{ arc.label }}
      </span>
    </div>
  </PanelCard>
</template>
