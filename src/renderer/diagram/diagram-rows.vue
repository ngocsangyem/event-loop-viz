<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Rect } from './diagram-geometry'
import { HEADER_HEIGHT, ROW_HEIGHT } from './diagram-layout'
import type { ListModel } from './diagram-model'
import { charsThatFit, truncate } from './diagram-text'

const props = defineProps<{ rect: Rect; list: ListModel; empty: string }>()
const { t } = useI18n()

const PAD = 12
const ROW_BODY = 24
const rowWidth = computed(() => props.rect.w - PAD * 2)

/** Row texts, cut to fit the card: the detail keeps its room, the label gets the rest. */
const rows = computed(() =>
  props.list.rows.map((row, i) => {
    const label = row.labelKey ? t(row.labelKey) : row.label
    const detail = row.detailKey === 'running' ? t('panels.running') : row.detailKey === 'due' ? t('panels.due', { due: row.detail ?? '' }) : (row.detail ?? '')
    const labelRoom = charsThatFit(rowWidth.value - 16) - (detail ? detail.length + 1 : 0)
    return {
      ...row,
      y: props.rect.y + HEADER_HEIGHT + 8 + i * ROW_HEIGHT,
      text: truncate(label, labelRoom),
      detailText: detail,
    }
  }),
)
const moreY = computed(() => props.rect.y + HEADER_HEIGHT + 8 + props.list.rows.length * ROW_HEIGHT + 14)
</script>

<template>
  <text
    v-if="list.rows.length === 0"
    :x="rect.x + rect.w / 2"
    :y="rect.y + HEADER_HEIGHT + 30"
    text-anchor="middle"
    class="diagram-muted"
    font-size="12"
  >
    {{ empty }}
  </text>
  <TransitionGroup tag="g" name="diagram-item">
    <g
      v-for="row in rows"
      :key="row.id"
      :data-row="row.id"
      :data-active="row.active ? 'true' : undefined"
      :data-tone="row.tone"
      class="diagram-row"
    >
      <rect :x="rect.x + PAD" :y="row.y" :width="rowWidth" :height="ROW_BODY" class="diagram-row-box" />
      <text :x="rect.x + PAD + 8" :y="row.y + 16" class="diagram-mono diagram-row-text" font-size="12">
        {{ row.text }}
      </text>
      <text
        v-if="row.detailText"
        :x="rect.x + PAD + rowWidth - 8"
        :y="row.y + 16"
        text-anchor="end"
        class="diagram-mono diagram-muted"
        font-size="11"
      >
        {{ row.detailText }}
      </text>
    </g>
  </TransitionGroup>
  <text
    v-if="list.more > 0"
    :x="rect.x + PAD + rowWidth - 4"
    :y="moreY"
    text-anchor="end"
    class="diagram-mono diagram-muted"
    :font-size="11"
  >
    +{{ list.more }}
  </text>
</template>
