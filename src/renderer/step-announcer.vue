<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { explainEvent, phrasesFor } from '../player/explain-event'
import type { ExplainLocale } from '../player/explain-event'
import type { TraceEvent } from '../trace/trace-event'

const props = defineProps<{ events: readonly TraceEvent[]; position: number }>()

const { locale } = useI18n()

const text = computed(() => {
  const event = props.events[props.position]
  return event
    ? explainEvent(event, props.events, phrasesFor(locale.value as ExplainLocale)).text
    : ''
})
</script>

<template>
  <!-- Always mounted so assistive tech registers the region before the first step changes it. -->
  <div
    class="sr-only"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    data-testid="step-announcer"
  >
    {{ text }}
  </div>
</template>
