<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import IsoLine from './iso-line.vue'
import IsoRaw from './iso-raw.vue'
import IsoSolid from './iso-solid.vue'
import { fitFont } from './queue-tray-geometry'
import {
  GENERATOR_COUNT,
  PENDING_H,
  ROW_COUNT,
  SETTLED_H,
  bracketShape,
  cellRim,
  cellShape,
  cellTextMatrix,
  drumCap,
  drumLabelMatrix,
  drumShape,
  moreMatrix,
  promiseRackBackSvg,
  tagShape,
  tagTextMatrix,
} from './promise-rack-geometry'
import { promiseRackOf } from './promise-rack-model'

// `previous` is accepted by every part so transitions can compare states without touching
// the scene root; this part draws only `state`.
const props = defineProps<{ state: ReplayState; previous?: ReplayState | null }>()

const model = computed(() =>
  promiseRackOf(props.state, { rows: ROW_COUNT, generators: GENERATOR_COUNT }),
)

const WORD = { pending: 'pending', fulfilled: 'fulfilled', rejected: 'rejected' } as const
const RIM = { pending: 'faint', fulfilled: 'green', rejected: 'red' } as const
const GEN_WORD = { yielded: 'yielded', running: 'running', 'awaiting-return': 'returning' } as const

const rows = computed(() =>
  model.value.rows.map((row, index) => {
    const height = row.view === 'pending' ? PENDING_H : SETTLED_H
    const tag = row.waiter ? `await ${row.waiter.label}` : ''
    const extra = row.extraWaiters > 0 ? ` +${row.extraWaiters}` : ''
    return { ...row, index, height, tagText: tag + extra }
  }),
)
const generators = computed(() =>
  model.value.generators.map((gen, slot) => ({
    ...gen,
    slot,
    raised: gen.view === 'running',
  })),
)
</script>

<template>
  <g data-part="promises" :data-promises="model.rows.length">
    <IsoRaw :svg="promiseRackBackSvg" />
    <g
      v-for="gen in generators"
      :key="gen.gid"
      data-testid="scene-async-generator"
      :data-gid="gen.gid"
      :data-state="gen.view"
    >
      <IsoSolid
        :paths="drumShape(gen.slot, gen.raised)"
        :tone="gen.raised ? 'hi' : 'mid'"
        :lit="gen.raised"
      >
        <IsoLine :d="drumCap(gen.slot, gen.raised)" tone="lo" />
      </IsoSolid>
      <text
        class="iso-face-text"
        data-tone="hi"
        text-anchor="middle"
        font-size="3.4"
        :transform="drumLabelMatrix(gen.slot)"
      >
        {{ gen.gid }} {{ GEN_WORD[gen.view] }}
      </text>
    </g>
    <g v-for="row in rows" :key="row.pid" data-testid="scene-promise-row">
      <g
        data-testid="scene-promise"
        :data-pid="row.pid"
        :data-state="row.view"
        :data-waiting="row.waiter ? '' : undefined"
      >
        <IsoSolid
          :paths="cellShape(row.index, row.height)"
          :tone="row.view === 'pending' ? 'lo' : 'hi'"
        >
          <IsoLine :d="cellRim(row.index, row.height)" :tone="RIM[row.view]" />
          <text
            class="iso-face-text"
            data-tone="hi"
            font-size="3.4"
            :transform="cellTextMatrix(row.index, row.height, 'start')"
          >
            {{ row.pid }}
          </text>
          <text
            class="iso-face-text"
            data-tone="hi"
            text-anchor="end"
            font-size="3.4"
            :transform="cellTextMatrix(row.index, row.height, 'end')"
          >
            {{ WORD[row.view] }}
          </text>
        </IsoSolid>
      </g>
      <g
        v-if="row.waiter"
        data-testid="scene-suspended-await"
        :data-fid="row.waiter.fid"
        :data-pid="row.pid"
        :data-label="row.waiter.label"
      >
        <IsoSolid :paths="bracketShape(row.index)" tone="mid" crease="none" />
        <IsoSolid :paths="tagShape(row.index)" tone="hi" lit>
          <text
            class="iso-face-text"
            data-tone="hi"
            text-anchor="middle"
            :font-size="fitFont(row.tagText, 22, 3.6)"
            :transform="tagTextMatrix(row.index)"
          >
            {{ row.tagText }}
          </text>
        </IsoSolid>
      </g>
    </g>
    <text
      v-if="model.hiddenPromises > 0"
      class="iso-face-text"
      data-tone="hi"
      text-anchor="end"
      font-size="3.8"
      :transform="moreMatrix"
    >
      +{{ model.hiddenPromises }} more
    </text>
  </g>
</template>
