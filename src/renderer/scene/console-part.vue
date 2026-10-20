<script setup lang="ts">
import { computed, useId } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import IsoRaw from './iso-raw.vue'
import {
  FACE_MATRIX,
  FONT_SIZE,
  SCREEN_COLUMNS,
  SCREEN_PATH,
  SCREEN_ROWS,
  TEXT_X,
  consoleBackSvg,
  rowBaseline,
} from './console-geometry'
import { consoleScreenOf } from './console-screen-model'
import { arrivals, fadeIn, useEnterMotion } from './scene-motion'

// `previous` (the state one step back) only decides which line fades in; the screen drawn once
// the motion ends is a function of `state` alone.
const props = defineProps<{ state: ReplayState; previous?: ReplayState | null }>()

const clipId = `scene-screen-clip-${useId()}`
const screen = computed(() =>
  consoleScreenOf(props.state, { rows: SCREEN_ROWS, columns: SCREEN_COLUMNS }),
)
const arrived = computed(() => {
  if (!props.previous) return new Set<string>()
  const rowsOf = (state: ReplayState) =>
    consoleScreenOf(state, { rows: SCREEN_ROWS, columns: SCREEN_COLUMNS }).rows.map(
      (_, i) => `${i}`,
    )
  return arrivals(rowsOf(props.previous), rowsOf(props.state))
})
const { onEnter, onEnterCancelled } = useEnterMotion((el) =>
  arrived.value.has(el.getAttribute('data-row') ?? '') ? fadeIn : null,
)
/** Width of one monospace cell, so the caret sits right after the last character. */
const CELL = FONT_SIZE * 0.64
</script>

<template>
  <g data-part="console" :data-printed="screen.printed">
    <IsoRaw :svg="consoleBackSvg" />
    <g :transform="FACE_MATRIX">
      <clipPath :id="clipId"><path :d="SCREEN_PATH" /></clipPath>
      <path class="scene-screen" :d="SCREEN_PATH" />
      <g :clip-path="`url(#${clipId})`">
        <TransitionGroup :css="false" @enter="onEnter" @enter-cancelled="onEnterCancelled">
          <text
            v-for="(row, index) in screen.rows"
            :key="index"
            class="scene-screen-text"
            data-testid="scene-console-line"
            :data-tone="row.tone"
            :data-row="index"
            :x="TEXT_X"
            :y="rowBaseline(index)"
            :font-size="FONT_SIZE"
          >
            {{ row.text }}
          </text>
        </TransitionGroup>
        <rect
          class="scene-caret"
          :x="TEXT_X"
          :y="rowBaseline(screen.rows.length) - FONT_SIZE * 0.8"
          :width="CELL"
          :height="FONT_SIZE"
        />
      </g>
      <path class="iso-line" data-tone="lo" :d="SCREEN_PATH" />
    </g>
  </g>
</template>
