<script setup lang="ts">
import { computed } from 'vue'
import type { EdgeId } from './diagram-flow'
import { arrowheadPath, longestSegmentMidpoint, roundedPath } from './diagram-geometry'
import type { EdgeLayout } from './diagram-layout'

/**
 * A connector: a quiet orthogonal line with rounded bends and an arrowhead. While a step runs
 * along it, a signal-coloured copy of the line, the arrowhead and a numbered pill (or a red
 * cross for a refusal) fade in above it.
 */
const props = defineProps<{
  id: EdgeId
  layout: EdgeLayout
  label: string
  /** The signal runs along this edge in the current step. */
  active: boolean
  refused: boolean
  /** 1-based place of this edge among the step's hops. */
  order: number
}>()

const d = computed(() => roundedPath(props.layout.points))
const head = computed(() => arrowheadPath(props.layout.points))
const pill = computed(() => longestSegmentMidpoint(props.layout.points))
const labelTransform = computed(() => {
  const { x, y, vertical } = props.layout.label
  return vertical ? `rotate(-90 ${x} ${y})` : undefined
})
</script>

<template>
  <g
    :data-testid="`diagram-edge-${id}`"
    :data-edge="id"
    :data-active="active ? 'true' : 'false'"
    :data-refused="refused ? 'true' : 'false'"
    class="diagram-edge"
  >
    <path :d="d" class="diagram-line" />
    <path :d="head" class="diagram-head" />
    <text
      :x="layout.label.x"
      :y="layout.label.y"
      :text-anchor="layout.label.anchor"
      :transform="labelTransform"
      class="diagram-edge-label"
      font-size="11"
    >
      {{ label }}
    </text>
    <g aria-hidden="true">
      <path :d="d" data-part="line-hot" class="diagram-line-hot" />
      <path :d="head" data-part="head-hot" class="diagram-head-hot" />
      <g :transform="`translate(${pill.x} ${pill.y})`" data-part="pill" class="diagram-pill">
        <circle r="9.5" class="diagram-pill-disc" />
        <text v-if="!refused" y="3.7" text-anchor="middle" font-size="11" class="diagram-pill-text">{{ order }}</text>
        <path v-else d="M-3.6 -3.6 3.6 3.6M3.6 -3.6 -3.6 3.6" class="diagram-pill-cross" />
      </g>
    </g>
  </g>
</template>
