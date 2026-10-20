<script setup lang="ts">
import { computed } from 'vue'
import type { Plan } from './iso-kit'
import IsoSolid from './iso-solid.vue'
import { TOKEN_H, TOKEN_Z, fitFont, tokenShape, tokenTextMatrix } from './queue-tray-geometry'

/** Narrower than this a label is smaller than its own stroke, so the token goes unlabelled. */
const MIN_LABELLED_WIDTH = 6.5
const RUN_LIFT = 1.2

const props = defineProps<{
  plan: Plan
  label: string
  /** The running entry: raised on the pad and drawn as the one lit part. */
  running?: boolean
}>()

const z = computed(() => (props.running ? TOKEN_Z + RUN_LIFT : TOKEN_Z))
const height = computed(() => (props.running ? TOKEN_H + 1.5 : TOKEN_H))
const paths = computed(() => tokenShape(props.plan, z.value, height.value))
const fontSize = computed(() => fitFont(props.label, props.plan.d - 5))
const textMatrix = computed(() =>
  tokenTextMatrix(props.plan, fontSize.value, z.value + height.value),
)
</script>

<template>
  <g>
    <IsoSolid :paths="paths" :tone="running ? 'hi' : 'mid'" :lit="running" crease="faint">
      <text
        v-if="plan.w >= MIN_LABELLED_WIDTH"
        class="iso-face-text"
        data-tone="hi"
        text-anchor="middle"
        :transform="textMatrix"
        :font-size="fontSize"
      >
        {{ label }}
      </text>
    </IsoSolid>
  </g>
</template>
