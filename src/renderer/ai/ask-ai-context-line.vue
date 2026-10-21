<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/** `CONTEXT · RUN #3 · STEP 15 OF 31`: what the AI will read. The run number is shown when the app knows it. */
const props = defineProps<{ step: number; total: number; runNumber?: number }>()
const { t } = useI18n()

const text = computed(() => {
  if (props.total === 0) return t('ai.context.none')
  return props.runNumber === undefined
    ? t('ai.context.lineNoRun', { step: props.step, total: props.total })
    : t('ai.context.line', { run: props.runNumber, step: props.step, total: props.total })
})
</script>

<template>
  <p class="text-muted-foreground shrink-0 px-4 pt-4 font-mono text-[11px] leading-[14px] font-normal uppercase" data-testid="ask-ai-context">
    <span class="sr-only">{{ t('ai.context.label') }}: </span>{{ text }}
  </p>
</template>
