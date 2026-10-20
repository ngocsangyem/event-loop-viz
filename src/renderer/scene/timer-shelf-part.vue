<script setup lang="ts">
import { computed, useId } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import IsoRaw from './iso-raw.vue'
import IsoSolid from './iso-solid.vue'
import {
  CLOCK_FONT,
  CLOCK_MATRIX,
  CLOCK_TEXT_X,
  CLOCK_TEXT_Y,
  SLOT_COUNT,
  SLOT_PAINT_ORDER,
  blockShape,
  blockTextMatrix,
  clockScreenPath,
  moreMatrix,
  timerShelfBackSvg,
} from './timer-shelf-geometry'
import { timerShelfOf } from './timer-shelf-model'

// `previous` is accepted by every part so transitions can compare states without touching
// the scene root; this part draws only `state`.
const props = defineProps<{ state: ReplayState; previous?: ReplayState | null }>()

const clipId = `scene-clock-clip-${useId()}`
const model = computed(() => timerShelfOf(props.state, SLOT_COUNT))
/** Shown timers in painter's order, each remembering the slot it stands in. */
const blocks = computed(() =>
  SLOT_PAINT_ORDER.flatMap((slot) => {
    const timer = model.value.shown[slot]
    return timer ? [{ slot, timer }] : []
  }),
)
</script>

<template>
  <g data-part="timers" :data-pending="state.timers.length">
    <IsoRaw :svg="timerShelfBackSvg" />
    <g :transform="CLOCK_MATRIX">
      <clipPath :id="clipId"><path :d="clockScreenPath" /></clipPath>
      <path class="scene-screen" :d="clockScreenPath" />
      <text
        class="scene-screen-text"
        data-testid="scene-clock"
        text-anchor="middle"
        :clip-path="`url(#${clipId})`"
        :x="CLOCK_TEXT_X"
        :y="CLOCK_TEXT_Y"
        :font-size="CLOCK_FONT"
      >
        {{ model.clock }}
      </text>
      <path class="iso-line" data-tone="lo" :d="clockScreenPath" />
    </g>
    <g
      v-for="{ slot, timer } in blocks"
      :key="timer.tid"
      data-testid="scene-timer"
      :data-tid="timer.tid"
      :data-due="timer.due"
      :data-repeat="timer.repeat ? '' : undefined"
    >
      <IsoSolid :paths="blockShape(slot)" tone="hi" crease="faint">
        <text
          class="iso-face-text"
          data-tone="mid"
          text-anchor="middle"
          font-size="3.8"
          :transform="blockTextMatrix(slot, 0)"
        >
          {{ timer.repeat ? `t${timer.tid} repeat` : `t${timer.tid}` }}
        </text>
        <text
          class="iso-face-text"
          data-tone="hi"
          text-anchor="middle"
          font-size="5"
          :transform="blockTextMatrix(slot, 1)"
        >
          {{ timer.due }}
        </text>
      </IsoSolid>
    </g>
    <text
      v-if="model.hidden > 0"
      class="iso-face-text"
      data-tone="hi"
      text-anchor="end"
      font-size="3.8"
      :transform="moreMatrix"
    >
      +{{ model.hidden }} more
    </text>
  </g>
</template>
