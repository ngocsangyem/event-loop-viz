<script setup lang="ts">
import { computed } from 'vue'
import { explainEvent } from '../player/explain-event'
import type { TraceEvent } from '../trace/trace-event'

const props = defineProps<{ events: readonly TraceEvent[]; position: number }>()

const text = computed(() => {
  const event = props.events[props.position]
  return event ? explainEvent(event, props.events).text : ''
})
</script>

<template>
  <!-- Always mounted so assistive tech registers the region before the first step changes it. -->
  <div
    class="visually-hidden"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    data-testid="step-announcer"
  >
    {{ text }}
  </div>
</template>
