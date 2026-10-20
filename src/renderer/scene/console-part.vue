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

// `previous` is accepted by every part so transitions can compare states without touching
// the scene root; this part draws only `state`.
const props = defineProps<{ state: ReplayState; previous?: ReplayState | null }>()

const clipId = `scene-screen-clip-${useId()}`
const screen = computed(() =>
  consoleScreenOf(props.state, { rows: SCREEN_ROWS, columns: SCREEN_COLUMNS }),
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
        <text
          v-for="(row, index) in screen.rows"
          :key="index"
          class="scene-screen-text"
          data-testid="scene-console-line"
          :data-tone="row.tone"
          :x="TEXT_X"
          :y="rowBaseline(index)"
          :font-size="FONT_SIZE"
        >
          {{ row.text }}
        </text>
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
