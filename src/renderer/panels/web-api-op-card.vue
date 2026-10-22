<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CallbackChip from './callback-chip.vue'
import type { ChipModel } from './callback-chip-model'
import type { WebOpCardModel } from './web-api-card-model'
import './web-api-card.css'

/** A Web API operation in progress (fetch, body read, import(), rAF callback, waitAsync). */
const props = defineProps<{ card: WebOpCardModel; chip?: ChipModel }>()
const { t } = useI18n()

const status = computed(() =>
  props.card.left !== undefined ? t('panels.webApis.left', { left: props.card.left }) : t(`panels.webApis.opWaiting.${props.card.api}`),
)
const percent = computed(() => Math.round((props.card.progress ?? 0) * 100))
</script>

<template>
  <li :data-id="card.key" :data-api="card.api" class="web-api-card queue-row px-2.5 py-[7px] text-xs">
    <div class="flex items-center justify-between gap-2 font-mono text-[11.5px] leading-[15px] font-medium">
      <span class="truncate">
        <span class="queue-row-tag">{{ t(`panels.webApis.op.${card.api}`) }}</span>
        <span v-if="card.detail" class="text-muted-foreground" :title="card.detail"> {{ card.detail }}</span>
      </span>
    </div>
    <div v-if="chip" class="web-api-slot">
      <span class="text-muted-foreground font-mono text-[11px] leading-[14px] tracking-(--tracking-label) uppercase">{{ t('panels.webApis.callback') }}</span>
      <CallbackChip :chip="chip" />
    </div>
    <div class="web-api-arrow">
      <span class="web-api-arrow-line" aria-hidden="true" />
      <span class="text-foreground font-mono text-[11px] leading-[14px] tracking-(--tracking-label) uppercase">{{ t('panels.webApis.browser') }}</span>
      <span class="font-mono">· {{ status }}</span>
    </div>
    <div
      v-if="card.progress !== undefined"
      class="web-api-progress"
      role="progressbar"
      :aria-label="status"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="percent"
    >
      <span :style="{ width: `${percent}%` }" />
    </div>
  </li>
</template>
