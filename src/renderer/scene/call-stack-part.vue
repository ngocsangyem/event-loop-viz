<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import IsoRaw from './iso-raw.vue'
import StackPlate from './stack-plate.vue'
import { callStackBackSvg, callStackCapSvg, pitchFor, postAboveSvg } from './call-stack-geometry'
import { callStackOf } from './call-stack-model'

// `previous` is accepted by every part so transitions can compare states without touching
// the scene root; this part draws only `state`.
const props = defineProps<{ state: ReplayState; previous?: ReplayState | null }>()

const model = computed(() => callStackOf(props.state))
const pitch = computed(() => pitchFor(model.value.frames.length))
const postAbove = computed(() => postAboveSvg(model.value.frames.length))
</script>

<template>
  <g data-part="call-stack" :data-depth="model.frames.length">
    <IsoRaw :svg="callStackBackSvg" />
    <StackPlate
      v-for="(frame, level) in model.frames"
      :key="frame.frameId"
      :frame="frame"
      :level="level"
      :pitch="pitch"
    />
    <IsoRaw :svg="postAbove" />
    <IsoRaw :svg="callStackCapSvg" />
  </g>
</template>
