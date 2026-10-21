<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChipModel } from './callback-chip-model'

const props = defineProps<{ chip: ChipModel }>()
const { t } = useI18n()

// The kind is not drawn in the row, so the tooltip and the accessible name carry it.
const label = computed(() =>
  props.chip.kind
    ? t('panels.chip.label', { kind: props.chip.kind, code: props.chip.full })
    : props.chip.full,
)
</script>

<template>
  <span
    :data-chip-id="chip.id"
    :title="label"
    role="note"
    :aria-label="label"
    class="callback-chip bg-background text-foreground border-border-soft block min-w-0 truncate border px-1.5 py-0.5 font-mono text-[12.5px] leading-[18px]"
  >{{ chip.text }}</span>
</template>
