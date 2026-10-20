<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import IsoRaw from './iso-raw.vue'
import StackPlate from './stack-plate.vue'
import { callStackBackSvg, callStackCapSvg, pitchFor, postAboveSvg } from './call-stack-geometry'
import { callStackOf } from './call-stack-model'
import { arrivals, dropIn, useEnterMotion } from './scene-motion'

// `previous` (the state one step back) only decides how a frame arrives; the stack drawn once
// the motion ends is a function of `state` alone.
const props = defineProps<{ state: ReplayState; previous?: ReplayState | null }>()

const model = computed(() => callStackOf(props.state))
const pitch = computed(() => pitchFor(model.value.frames.length))
const arrived = computed(() =>
  arrivals(
    props.previous ? callStackOf(props.previous).frames.map((frame) => frame.frameId) : null,
    model.value.frames.map((frame) => frame.frameId),
  ),
)
// A new frame is lowered onto the spindle from above.
const { onEnter, onEnterCancelled } = useEnterMotion((el) =>
  arrived.value.has(el.getAttribute('data-frame-id') ?? '') ? dropIn(22) : null,
)
const postAbove = computed(() => postAboveSvg(model.value.frames.length))
</script>

<template>
  <g data-part="call-stack" :data-depth="model.frames.length">
    <IsoRaw :svg="callStackBackSvg" />
    <TransitionGroup :css="false" @enter="onEnter" @enter-cancelled="onEnterCancelled">
      <StackPlate
        v-for="(frame, level) in model.frames"
        :key="frame.frameId"
        :frame="frame"
        :level="level"
        :pitch="pitch"
      />
    </TransitionGroup>
    <IsoRaw :svg="postAbove" />
    <IsoRaw :svg="callStackCapSvg" />
  </g>
</template>
