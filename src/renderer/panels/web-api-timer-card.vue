<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CallbackChip from './callback-chip.vue'
import type { ChipModel } from './callback-chip-model'
import type { WebApiCardModel } from './web-api-card-model'
import './web-api-card.css'

const props = defineProps<{ card: WebApiCardModel; chip?: ChipModel }>()
const { t } = useI18n()

const left = computed(() => t('panels.webApis.left', { left: props.card.left }))
const percent = computed(() => Math.round(props.card.progress * 100))
</script>

<template>
  <li
    :data-id="card.key"
    :title="t('panels.due', { due: card.due })"
    class="web-api-card queue-row px-2.5 py-2 text-xs"
  >
    <div class="flex items-center justify-between gap-2 font-mono">
      <span class="truncate font-medium">
        <span class="queue-row-tag">{{ card.api }}</span><span class="text-muted-foreground"> #{{ card.tid }}</span>
      </span>
      <span v-if="card.repeat" class="queue-row-tag label-mono shrink-0 text-[11px]">{{ t('panels.webApis.repeats') }}</span>
    </div>
    <div class="web-api-slots">
      <div class="web-api-slot">
        <span class="label-mono text-muted-foreground text-[11px]">{{ t('panels.webApis.callback') }}</span>
        <CallbackChip v-if="chip" :chip="chip" />
        <span v-else class="text-muted-foreground font-mono">{{ t('panels.webApis.callback') }}</span>
      </div>
      <div class="web-api-slot">
        <span class="label-mono text-muted-foreground text-[11px]">{{ t('panels.webApis.delay') }}</span>
        <span class="font-mono">{{ card.delay }}</span>
        <span v-if="card.clamped" class="text-muted-foreground">
          {{ t('panels.webApis.clamped', { requested: card.requestedMs }) }}
        </span>
      </div>
    </div>
    <div class="web-api-arrow">
      <span class="web-api-arrow-line" aria-hidden="true" />
      <span class="label-mono text-foreground text-[11px]">{{ t('panels.webApis.browser') }}</span>
      <span class="font-mono">· {{ left }}</span>
    </div>
    <div
      class="web-api-progress"
      role="progressbar"
      :aria-label="left"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="percent"
    >
      <span :style="{ width: `${percent}%` }" />
    </div>
  </li>
</template>
