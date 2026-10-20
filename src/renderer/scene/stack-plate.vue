<script setup lang="ts">
import { computed } from 'vue'
import * as k from './iso-kit'
import IsoSolid from './iso-solid.vue'
import { PLATE_PLAN, SPINDLE, plateShape, plateThickness, plateZ } from './call-stack-geometry'
import type { StackPlateModel } from './call-stack-model'
import { P, frontFace } from './scene-world'

const props = defineProps<{ frame: StackPlateModel; level: number; pitch: number }>()

const MAX_LABEL = 15
/** Below this a label would be smaller than a legible dot, so thin plates go unlabelled. */
const MIN_LABEL_SIZE = 2.8

const paths = computed(() => plateShape(props.level, props.pitch))
const z = computed(() => plateZ(props.level, props.pitch))
const thickness = computed(() => plateThickness(props.pitch))
const shortLabel = computed(() =>
  props.frame.label.length > MAX_LABEL
    ? `${props.frame.label.slice(0, MAX_LABEL - 1)}…`
    : props.frame.label,
)

const faceY = PLATE_PLAN.y + PLATE_PLAN.d
const labelSize = computed(() => Math.min(5.6, thickness.value * 0.66))
const sideLabelY = computed(() => -(z.value + thickness.value / 2) + labelSize.value * 0.34)
const topLabelTransform = computed(() =>
  k.topMatrix([PLATE_PLAN.x + 6, SPINDLE[1] + 8.5], z.value + thickness.value, P, 'x'),
)
const grooves = computed(() => {
  const top = z.value + thickness.value
  return k.planOutline(k.insetPlan(PLATE_PLAN, 3.2), top, P, 5)
})
</script>

<template>
  <g
    data-testid="scene-frame"
    :data-frame-id="frame.frameId"
    :data-label="frame.label"
    :data-builtin="frame.builtin ? '' : undefined"
    :data-top="frame.isTop ? '' : undefined"
  >
    <IsoSolid :paths="paths" :tone="frame.builtin ? 'mid' : 'hi'" :lit="frame.isTop" crease="faint">
      <template v-if="frame.isTop" #inner>
        <path class="iso-line" data-tone="lo" :d="grooves" />
      </template>
      <text
        v-if="labelSize >= MIN_LABEL_SIZE"
        class="iso-face-text"
        data-tone="hi"
        :transform="frontFace(faceY)"
        :x="PLATE_PLAN.x + 6"
        :y="sideLabelY"
        :font-size="labelSize"
      >
        {{ shortLabel }}
      </text>
      <text
        v-if="frame.isTop"
        class="iso-face-text"
        data-tone="hi"
        :transform="topLabelTransform"
        font-size="5.6"
      >
        {{ shortLabel }}
      </text>
    </IsoSolid>
  </g>
</template>
