<script setup lang="ts">
import { computed } from 'vue'
import { formatConsoleLines } from './console-lines'
import type { TraceEvent } from '../trace/trace-event'

const props = defineProps<{ events: readonly TraceEvent[] }>()
const lines = computed(() => formatConsoleLines(props.events))
</script>

<template>
  <ul data-testid="console-panel">
    <li v-for="(line, i) in lines" :key="i" :class="{ 'console-error': line.kind === 'error' }">
      {{ line.text }}
    </li>
  </ul>
</template>

<style scoped>
.console-error {
  color: #c62828;
}
</style>
