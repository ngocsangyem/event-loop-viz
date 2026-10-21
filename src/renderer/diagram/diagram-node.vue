<script setup lang="ts">
import { computed } from 'vue'
import type { NodeId } from './diagram-flow'
import { CARD_RADIUS, outlineLength, outlinePathFrom } from './diagram-geometry'
import type { Point, Rect } from './diagram-geometry'
import { NODE_ICON } from './diagram-icons'

/**
 * One card: a quiet bordered box with an icon badge and a title. When the signal reaches it the
 * border is drawn in from `entry`, the point where the arrow meets the card, in both directions.
 * The content (rows, ring) comes in through the slot.
 */
const props = defineProps<{
  id: NodeId
  rect: Rect
  title: string
  lit: boolean
  refused: boolean
  /** Where the arriving arrow touches the card; the top middle when nothing arrives. */
  entry: Point | null
}>()

const start = computed(() => props.entry ?? { x: props.rect.x + props.rect.w / 2, y: props.rect.y })
const length = computed(() => outlineLength(props.rect))
const clockwise = computed(() => outlinePathFrom(props.rect, start.value, true))
const counter = computed(() => outlinePathFrom(props.rect, start.value, false))
const drawStyle = computed(() => ({ '--outline': `${length.value}px` }))
</script>

<template>
  <g
    :data-testid="`diagram-node-${id}`"
    :data-node="id"
    :data-lit="lit ? 'true' : 'false'"
    :data-refused="refused ? 'true' : 'false'"
    class="diagram-node"
  >
    <rect :x="rect.x" :y="rect.y" :width="rect.w" :height="rect.h" :rx="CARD_RADIUS" class="diagram-card" />
    <path :d="clockwise" :style="drawStyle" data-part="draw-cw" class="diagram-draw" />
    <path :d="counter" :style="drawStyle" data-part="draw-ccw" class="diagram-draw" />
    <rect :x="rect.x + 12" :y="rect.y + 8" width="22" height="22" rx="6" class="diagram-badge" />
    <path
      :d="NODE_ICON[id]"
      :transform="`translate(${rect.x + 15.5} ${rect.y + 11.5}) scale(0.62)`"
      class="diagram-icon"
    />
    <text :x="rect.x + 42" :y="rect.y + 24" class="diagram-title" font-size="13">{{ title }}</text>
    <slot />
  </g>
</template>
