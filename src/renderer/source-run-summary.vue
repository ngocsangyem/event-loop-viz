<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Trace } from '../trace/trace-event'
import { summarizeTrace } from './trace-run-summary'

/** Under the Source card: the legend for the gutter squares, then how the Run ended and its size. */
const props = defineProps<{ trace: Trace; runNumber: number | null }>()
const { t, locale } = useI18n()

const summary = computed(() => summarizeTrace(props.trace))
const halted = computed(() => summary.value.outcome !== 'natural')
const number = (n: number) => n.toLocaleString(locale.value, { maximumFractionDigits: 1 })
const stats = computed(() =>
  t('source.stats', {
    events: t('source.events', { n: number(summary.value.events) }, summary.value.events),
    ticks: t('source.ticks', { n: number(summary.value.ticks) }, summary.value.ticks),
    from: number(summary.value.startMs),
    to: number(summary.value.endMs),
  }),
)
</script>

<template>
  <div class="source-summary mx-4 mt-2.5 flex items-center gap-2 font-mono text-[11px] leading-[14px] uppercase" data-testid="source-legend">
    <span class="bg-job size-1.5" aria-hidden="true" />
    <span class="bg-task size-1.5" aria-hidden="true" />
    <span class="bg-webapi size-1.5" aria-hidden="true" />
    <span class="text-muted-foreground">{{ t('source.legend') }}</span>
  </div>
  <!-- Pinned to the bottom of the pane so it reads as the Run's footer, not part of the code. -->
  <footer class="source-summary border-border mt-auto flex flex-col gap-1 border-t px-4 py-3.5" data-testid="source-run-summary">
    <p class="flex gap-2 font-mono text-[11.5px] leading-[17px] font-medium tracking-[0.02em] uppercase">
      <span class="text-foreground">{{ runNumber === null ? t('source.run') : t('source.runNumber', { n: runNumber }) }}</span>
      <span :class="halted ? 'text-brand-text' : 'text-console'">
        {{ halted ? t('source.halted') : t('source.endedNaturally') }}
      </span>
    </p>
    <p class="text-muted-foreground font-mono text-[11.5px] leading-[17px] uppercase">{{ stats }}</p>
  </footer>
</template>
