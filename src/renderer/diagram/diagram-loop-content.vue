<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { LOOP_PHASE_KEY } from '../panels/event-loop-phase'
import type { LoopPhase } from '../panels/event-loop-phase'
import type { Rect } from './diagram-geometry'
import { HEADER_HEIGHT } from './diagram-layout'
import type { DiagramModel } from './diagram-model'

const props = defineProps<{ rect: Rect; loop: DiagramModel['loop'] }>()
const { t } = useI18n()

const R = 26
const cx = computed(() => props.rect.x + 54)
const cy = computed(() => props.rect.y + HEADER_HEIGHT + (props.rect.h - HEADER_HEIGHT) / 2)
const textX = computed(() => cx.value + R + 24)

/** Where the pointer rests for each phase, in degrees clockwise from the top. */
const PHASE_ANGLE: Record<LoopPhase, number> = { idle: 0, task: 90, microtasks: 270, halted: 0 }

/** The pointer only turns clockwise, like the loop: microtasks to the next Task completes the circle. */
const angle = shallowRef(PHASE_ANGLE[props.loop.phase])
watch(
  () => props.loop.phase,
  (next) => {
    const current = ((angle.value % 360) + 360) % 360
    angle.value += (PHASE_ANGLE[next] - current + 360) % 360
  },
)

const arcs = computed(() => [
  { id: 'task', d: `M${cx.value} ${cy.value - R}A${R} ${R} 0 0 1 ${cx.value} ${cy.value + R}` },
  { id: 'microtasks', d: `M${cx.value} ${cy.value + R}A${R} ${R} 0 0 1 ${cx.value} ${cy.value - R}` },
])
const pointerStyle = computed(() => ({
  transform: `rotate(${angle.value}deg)`,
  transformOrigin: `${cx.value}px ${cy.value}px`,
}))
</script>

<template>
  <g :data-phase="loop.phase" data-testid="diagram-loop-content">
    <path
      v-for="arc in arcs"
      :key="arc.id"
      :d="arc.d"
      :data-on="loop.phase === arc.id ? 'true' : 'false'"
      :data-arc="arc.id"
      class="diagram-ring-arc"
    />
    <g class="diagram-pointer" :style="pointerStyle">
      <circle :cx="cx" :cy="cy - R" r="6" class="diagram-ring-dot" />
    </g>
    <circle :cx="cx" :cy="cy" r="3.5" :data-on="loop.phase === 'idle' ? 'true' : 'false'" class="diagram-ring-hub" />
    <text :x="textX" :y="cy - 18" font-size="11.5" class="diagram-strong" data-testid="diagram-loop-phase">
      {{ t(LOOP_PHASE_KEY[loop.phase]) }}
    </text>
    <!-- Each value follows its label in one text run, so a longer translated label cannot overlap it. -->
    <text :x="textX" :y="cy + 2" font-size="11">
      <tspan class="diagram-muted">{{ t('panels.eventLoop.clock') }}</tspan>
      <tspan dx="6" class="diagram-mono diagram-strong" data-testid="diagram-loop-clock">{{ loop.clock }}</tspan>
    </text>
    <text :x="textX" :y="cy + 20" font-size="11">
      <tspan class="diagram-muted">{{ t('panels.eventLoop.tick') }}</tspan>
      <tspan dx="6" class="diagram-mono diagram-strong">{{ loop.tick ?? '—' }}</tspan>
    </text>
  </g>
</template>
